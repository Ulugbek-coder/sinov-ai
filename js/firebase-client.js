// =============================================================
// Firebase Client Helpers (student-side)
// - fetchScheduleForGroup(group)   -> { startAt, endAt, status }
// - formatScheduleWindow(schedule) -> human-readable string
// - ensureAnonymousAuth()          -> Promise<uid>
// - uploadSubmission(data, pdfBlob, onProgress) -> Promise<result>
//     result = { method: "firebase"|"google_form_fallback", url?, docId? }
// =============================================================

// ---------- Schedule ----------
// Fetch the schedule window for one group. When `examId` is provided
// (the new flow, after the student has picked an exam on the welcome
// page), we look up the composite-key doc in /exam_schedules first.
// If that doc doesn't exist we fall back to legacy /schedules/{group}
// — which keeps any in-progress student exams from before this change
// working as expected.
async function fetchScheduleForGroup(group, examId) {
  try {
    // Prefer the per-exam schedule when an examId is available.
    if (examId) {
      const compositeId = examId + "__" + group;
      const newSnap = await window.fbDb
        .collection("exam_schedules")
        .doc(compositeId)
        .get();
      if (newSnap.exists) {
        const d = newSnap.data();
        const startAt = d.startAt ? d.startAt.toDate() : null;
        const endAt = d.endAt ? d.endAt.toDate() : null;
        const now = new Date();
        let status = "unknown";
        if (!startAt || !endAt) status = "not_set";
        else if (now < startAt) status = "not_started";
        else if (now >= startAt && now <= endAt) status = "open";
        else if (now > endAt) status = "ended";
        return {
          startAt,
          endAt,
          status,
          active: d.active !== false,
          // Round 5 (July 2026): optional allow-list of student IDs.
          // Empty/absent means the whole group may sit the exam.
          // Enforcement lives in app.js (snEffectiveScheduleStatus).
          allowedStudents: Array.isArray(d.allowedStudents)
            ? d.allowedStudents
            : [],
        };
      }
      // No per-exam doc — fall through to the legacy collection.
    }
    const snap = await window.fbDb.collection("schedules").doc(group).get();
    if (!snap.exists) return null;
    const d = snap.data();
    const startAt = d.startAt ? d.startAt.toDate() : null;
    const endAt = d.endAt ? d.endAt.toDate() : null;
    const now = new Date();
    let status = "unknown";
    if (!startAt || !endAt) status = "not_set";
    else if (now < startAt) status = "not_started";
    else if (now >= startAt && now <= endAt) status = "open";
    else if (now > endAt) status = "ended";
    // Legacy /schedules documents never carry an allow-list.
    return {
      startAt,
      endAt,
      status,
      active: d.active !== false,
      allowedStudents: [],
    };
  } catch (err) {
    console.error("fetchScheduleForGroup failed:", err);
    return null;
  }
}

function formatScheduleWindow(schedule) {
  if (!schedule || !schedule.startAt || !schedule.endAt) {
    return "Schedule not set yet by instructor.";
  }
  const opts = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const s = schedule.startAt.toLocaleString(undefined, opts);
  const e = schedule.endAt.toLocaleString(undefined, opts);
  return s + "  →  " + e;
}

// ---------- Anonymous auth for students ----------
function ensureAnonymousAuth() {
  return new Promise((resolve, reject) => {
    const auth = window.fbAuth;
    if (auth.currentUser) return resolve(auth.currentUser.uid);
    auth
      .signInAnonymously()
      .then((cred) => resolve(cred.user.uid))
      .catch((err) => {
        console.error("Anonymous sign-in failed:", err);
        reject(err);
      });
  });
}

// ---------- PDF upload with retry + Google Form fallback ----------
// Submission classification:
//   firebase_manual — student clicked Submit, Firebase upload succeeded
//   firebase_auto   — 90-min timer ran out and auto-submitted, Firebase OK
//   google_form     — ALL Firebase attempts failed, student downloaded PDF
//                     and must upload via Google Form
//
// The Storage upload and Firestore write are now done in separate retry
// loops so that a Firestore failure after a successful Storage upload
// doesn't lose the PDF. If Storage succeeds but Firestore fails, we
// still create a Firestore record in a final best-effort pass with the
// pdfPath + pdfUrl attached.
async function uploadSubmission(submissionData, pdfBlob, onProgress) {
  const group = submissionData.group;
  const id = submissionData.studentId;
  const first = submissionData.firstName || "";
  const last = submissionData.lastName || "student";
  const trigger = submissionData.submitTrigger === "auto" ? "auto" : "manual";
  const firebaseMethod =
    trigger === "auto" ? "firebase_auto" : "firebase_manual";

  const safe = (s) => (s || "").replace(/[^a-zA-Z0-9]/g, "");
  const filename =
    safe(group) +
    "_" +
    safe(id) +
    "_" +
    safe(first) +
    "_" +
    safe(last) +
    ".pdf";
  const storagePath = "submissions/" + group + "/" + filename;

  const report = (phase, attempt, extra) => {
    if (typeof onProgress === "function")
      onProgress({ phase, attempt, extra: extra || null });
  };

  // Ensure we're authenticated (anonymous) before talking to Storage / Firestore
  try {
    report("auth", 0);
    await ensureAnonymousAuth();
  } catch (err) {
    report("auth_failed", 0, err && err.message);
    return activateGoogleFormFallback("auth_failed");
  }

  const storageRef = window.fbStorage.ref().child(storagePath);

  // -----------------------------------------------------------------
  // Phase 1: Upload PDF to Storage (up to 3 attempts).
  //
  // IMPORTANT: put() and getDownloadURL() are TWO separate operations
  // with different permission requirements:
  //   - put()           → requires CREATE permission (anonymous OK per rules)
  //   - getDownloadURL()→ requires READ permission (may NOT be granted to
  //                        anonymous auth depending on Storage rules)
  //
  // If we failed both in one try block (like the pre-fix code did), a
  // getDownloadURL() permission error would cause us to re-upload the
  // PDF pointlessly, then fall through to "Google Form fallback" even
  // though the PDF IS safely in Storage. The admin dashboard would then
  // show NO PDF link AND no way to find the file.
  //
  // Fix: track upload success separately. If put() succeeds, we record
  // pdfPath on the Firestore doc even if getDownloadURL() fails — admin
  // can fetch the URL on demand (admin has password auth = read permission).
  // -----------------------------------------------------------------
  let pdfUploaded = false;
  let downloadURL = null;
  let storageAttempts = 0;
  let lastStorageError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    storageAttempts = attempt;
    report("uploading", attempt);
    try {
      await storageRef.put(pdfBlob, { contentType: "application/pdf" });
      pdfUploaded = true;
      // PDF is safely in Storage now. Try to also get a download URL for
      // convenience — but this is best-effort and non-fatal.
      try {
        downloadURL = await storageRef.getDownloadURL();
      } catch (urlErr) {
        console.warn(
          "PDF uploaded to Storage, but getDownloadURL() failed (" +
            ((urlErr && urlErr.message) || urlErr) +
            "). The admin dashboard will fetch the URL on demand.",
        );
        // downloadURL stays null — admin.js handles this case with a
        // "Load PDF" button that calls getDownloadURL() with password auth.
      }
      break; // exit retry loop — upload succeeded
    } catch (err) {
      console.error("Storage upload attempt " + attempt + " failed:", err);
      lastStorageError = (err && err.message) || String(err);
      report("attempt_failed", attempt, lastStorageError);
      if (attempt < 3) {
        const backoff = attempt === 1 ? 2000 : 4000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  if (!pdfUploaded) {
    // PDF is NOT in Storage. Student must use the Google Form to upload.
    return activateGoogleFormFallback(
      "storage_upload_failed:" + lastStorageError,
    );
  }

  // -----------------------------------------------------------------
  // Phase 2: Write Firestore record (up to 3 attempts).
  // If this fails after Storage succeeded, we still classify as Firebase
  // submission because the PDF IS saved — the admin can match it up by
  // Storage path even without the Firestore record. We write a minimal
  // "orphan" record in the fallback path so it still appears in the
  // admin list.
  // -----------------------------------------------------------------
  const doc = {
    group: submissionData.group,
    studentId: submissionData.studentId,
    firstName: submissionData.firstName,
    lastName: submissionData.lastName,
    version: submissionData.version,
    mcScore: submissionData.mcScore,
    correctCount: submissionData.correct,
    // Round 2: detailed MC scoring breakdown so the admin and PDF
    // can show exactly how the score was derived. Legacy submissions
    // lack these fields and downstream code defaults to 40 / no penalty.
    mcMaxPoints:
      submissionData.mcMaxPoints != null ? submissionData.mcMaxPoints : null,
    mcWrongCount: submissionData.wrong != null ? submissionData.wrong : null,
    mcUnansweredCount:
      submissionData.unanswered != null ? submissionData.unanswered : null,
    mcBreakdown: submissionData.mcBreakdown || null,
    // Round 2: total of all coding-problem max points for this exam
    codingMaxTotal:
      submissionData.codingMaxTotal != null
        ? submissionData.codingMaxTotal
        : null,
    timeUsed: submissionData.timeStr,
    tabSwitches: submissionData.tabSwitches,
    pdfPath: storagePath,
    pdfUrl: downloadURL,
    uploadMethod: firebaseMethod, // firebase_manual or firebase_auto
    submitTrigger: trigger,
    storageAttempts,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  // examId tag — links this submission back to the specific exam
  // configuration the student picked on the welcome page. Required for
  // the admin dashboard's per-exam Submissions filter. Older submissions
  // lack this field and are invisible to the new admin view.
  if (submissionData.examId) {
    doc.examId = submissionData.examId;
  }

  // Webcam feature turned OFF by the admin for this exam. The admin
  // dashboard's proctoring column reads this flag to render a
  // "WEBCAM OFF" badge and an informative evidence modal instead of
  // risk scores / frames. Absent on legacy submissions and on normal
  // proctored submissions.
  if (submissionData.webcamDisabled === true) {
    doc.webcamDisabled = true;
  }

  // -------------------------------------------------------------
  // Feature 1 — Webcam Proctoring fields
  // -------------------------------------------------------------
  // Attach if a proctoring summary was provided. We store the score,
  // session id (so admin can fetch events + frames), event counts,
  // and frame count. Old submissions (pre-Feature-1) simply lack these
  // fields and the admin UI renders "—".
  if (submissionData.proctorSummary) {
    const ps = submissionData.proctorSummary;
    doc.proctorSessionId = ps.sessionId || null;
    doc.proctorRiskScore =
      typeof ps.riskScore === "number" ? ps.riskScore : null;
    doc.proctorRiskBand = ps.riskBand || null;
    doc.proctorEventCounts = ps.eventCounts || {};
    doc.proctorTotalEvents =
      typeof ps.totalEvents === "number" ? ps.totalEvents : 0;
    doc.proctorScheduledFrames =
      typeof ps.scheduledFrameCount === "number" ? ps.scheduledFrameCount : 0;
    doc.proctorDetectorUnavailable = !!ps.detectorUnavailable;
  }

  // -----------------------------------------------------------------
  // Feature 2: AI Personalized Student Feedback
  // -----------------------------------------------------------------
  // Store the trilingual feedback object so admins can re-view it
  // (or re-generate the PDF) later. Stored as a nested object
  // {en, uz, ru, fallback}. Old submissions lack this field.
  if (
    submissionData.aiFeedback &&
    typeof submissionData.aiFeedback === "object"
  ) {
    doc.aiFeedback = submissionData.aiFeedback;
  }

  // -----------------------------------------------------------------
  // Feature 6: AI Code Auto-Grader inputs
  // -----------------------------------------------------------------
  // Save the student's coding answers + problem metadata so the admin
  // dashboard can grade them later (synchronously, on the instructor's
  // demand). Without this, the admin would have to OCR the PDF to get
  // the code back — gross. We store ~10-30 KB per submission here,
  // well under the 1 MB Firestore doc limit.
  //
  // Older submissions (before Feature 6) lack these fields; the admin
  // UI shows "Cannot grade — code data missing" for them.
  const codingProblems = submissionData.codingProblems || [];
  // FIX (July 2026): derive the answers from the Round 2 dynamic array
  // when it is available, so the stored length matches the number of
  // coding problems the exam actually had. The old code always wrote
  // four entries, which meant a zero-coding exam (every General English
  // exam, and any pure-MC C++ exam) arrived in the admin dashboard
  // looking like it had four gradable answers. Falls back to the legacy
  // code1..code4 fields for any caller that still sets only those.
  const codingAnswers = Array.isArray(submissionData.codingAnswers)
    ? submissionData.codingAnswers.slice(0, codingProblems.length || undefined)
    : [
        submissionData.code1 || "",
        submissionData.code2 || "",
        submissionData.code3 || "",
        submissionData.code4 || "",
      ];
  doc.codingAnswers = codingAnswers;
  doc.codingProblemMeta = codingProblems.map(function (p, idx) {
    const defaults = [10, 15, 15, 20];
    // Problem descriptions are stored as arrays of bullet-point strings
    // in en/uz/ru. We keep them as arrays here; the admin UI joins with \n.
    return {
      title_en: (p && p.title_en) || "",
      title_uz: (p && p.title_uz) || "",
      title_ru: (p && p.title_ru) || "",
      en: p && Array.isArray(p.en) ? p.en : [],
      uz: p && Array.isArray(p.uz) ? p.uz : [],
      ru: p && Array.isArray(p.ru) ? p.ru : [],
      starter: (p && p.starter) || "",
      maxPoints: (p && p.maxPoints) || defaults[idx] || 10,
    };
  });

  let firestoreAttempts = 0;
  let lastFirestoreError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    firestoreAttempts = attempt;
    try {
      const docRef = await window.fbDb.collection("submissions").add({
        ...doc,
        firestoreAttempts: attempt,
      });
      // Increment the public-facing session counter shown on the
      // homepage. Best-effort: a failure here must NEVER fail the
      // submission, so we await with a swallow. set({merge:true}) +
      // FieldValue.increment lets this work on first ever submission
      // (doc gets created) and every subsequent one (doc gets updated).
      try {
        await window.fbDb
          .collection("public_stats")
          .doc("sessions_total")
          .set(
            {
              count: firebase.firestore.FieldValue.increment(1),
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      } catch (counterErr) {
        // Don't surface to the student — counter is cosmetic.
        console.warn(
          "[firebase-client] session counter increment failed:",
          counterErr && counterErr.code,
        );
      }
      report("success", attempt, { url: downloadURL });
      return {
        method: firebaseMethod,
        url: downloadURL,
        docId: docRef.id,
        trigger,
      };
    } catch (err) {
      console.error("Firestore write attempt " + attempt + " failed:", err);
      lastFirestoreError = (err && err.message) || String(err);
      report("firestore_attempt_failed", attempt, lastFirestoreError);
      if (attempt < 3) {
        const backoff = attempt === 1 ? 2000 : 4000;
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  // All Firestore attempts failed but PDF IS in Storage. This is still
  // a successful Firebase submission from the student's perspective:
  // their work is safely stored. The Firestore record is metadata the
  // admin relies on — without it, the admin won't see this submission
  // in the dashboard. Treat it as Firebase success but log the issue.
  console.error(
    "Firestore write failed for all attempts, but Storage succeeded. " +
      "PDF is at " +
      storagePath +
      ". Manually check Storage for this file.",
  );
  report("firestore_failed_storage_ok", 3, lastFirestoreError);
  return {
    method: firebaseMethod,
    url: downloadURL,
    docId: null,
    trigger,
    warning: "firestore_write_failed",
    warningDetail: lastFirestoreError,
  };

  // ----- Google Form fallback -----
  function activateGoogleFormFallback(reason) {
    report("fallback", 3, reason);
    try {
      const fallbackDoc = {
        group: submissionData.group,
        studentId: submissionData.studentId,
        firstName: submissionData.firstName,
        lastName: submissionData.lastName,
        version: submissionData.version,
        mcScore: submissionData.mcScore,
        correctCount: submissionData.correct,
        timeUsed: submissionData.timeStr,
        tabSwitches: submissionData.tabSwitches,
        uploadMethod: "google_form",
        submitTrigger: trigger,
        fallbackReason: reason,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      // examId — same field as the normal write path. Matches the admin
      // submissions filter so this fallback record shows under the right exam.
      if (submissionData.examId) {
        fallbackDoc.examId = submissionData.examId;
      }
      // Webcam feature turned off by the admin — same flag as the
      // normal write path so the admin dashboard renders the fallback
      // record's proctoring column correctly too.
      if (submissionData.webcamDisabled === true) {
        fallbackDoc.webcamDisabled = true;
      }
      // Feature 1 — proctoring fields on fallback too
      if (submissionData.proctorSummary) {
        const ps = submissionData.proctorSummary;
        fallbackDoc.proctorSessionId = ps.sessionId || null;
        fallbackDoc.proctorRiskScore =
          typeof ps.riskScore === "number" ? ps.riskScore : null;
        fallbackDoc.proctorRiskBand = ps.riskBand || null;
        fallbackDoc.proctorEventCounts = ps.eventCounts || {};
        fallbackDoc.proctorTotalEvents =
          typeof ps.totalEvents === "number" ? ps.totalEvents : 0;
        fallbackDoc.proctorScheduledFrames =
          typeof ps.scheduledFrameCount === "number"
            ? ps.scheduledFrameCount
            : 0;
        fallbackDoc.proctorDetectorUnavailable = !!ps.detectorUnavailable;
      }
      // Feature 2 — AI feedback on fallback too
      if (
        submissionData.aiFeedback &&
        typeof submissionData.aiFeedback === "object"
      ) {
        fallbackDoc.aiFeedback = submissionData.aiFeedback;
      }
      window.fbDb.collection("submissions").add(fallbackDoc);
    } catch (_) {
      /* ignore — student already sees the fallback UI */
    }
    return { method: "google_form", reason, trigger };
  }
}

// Expose globals for app.js
window.FBClient = {
  fetchScheduleForGroup,
  formatScheduleWindow,
  ensureAnonymousAuth,
  uploadSubmission,
  fetchExamSeeds,
  saveExamSeeds,
};

// ---------- Exam seeds (question-refresh feature) ----------
// Firestore docs (Feature: per-exam refresh, May 2026):
//   /exams/{examId}/seeds/current          ← per-exam seed (new model)
//   /config/exam_seeds                     ← legacy global doc
//                                            (kept for backward compat;
//                                             read as fallback only)
//
// Each doc shape:
//   {
//     A: { mcSeed: string, coding: { p1: number, p2: number, ... } },
//     B: { ... }, C: { ... }, D: { ... },
//     refreshedAt: Timestamp,
//     refreshedBy: string
//   }
//
// Why move per-exam: different courses (and the same course in different
// semesters) should be able to refresh independently. A global doc forced
// every refresh to overwrite everyone's seeds. Per-exam scopes the change.
//
// Why keep the global doc: existing exams created before this change have
// no per-exam seed doc. We fall back to /config/exam_seeds so legacy
// behaviour still works.
async function fetchExamSeeds(examId) {
  // Try the per-exam doc first if examId provided
  if (examId) {
    try {
      const snap = await window.fbDb
        .collection("exams")
        .doc(examId)
        .collection("seeds")
        .doc("current")
        .get();
      if (snap.exists) return snap.data();
    } catch (err) {
      console.warn("fetchExamSeeds (per-exam):", err);
      // fall through to legacy lookup
    }
  }
  // Legacy fallback: global doc
  try {
    const snap = await window.fbDb.collection("config").doc("exam_seeds").get();
    if (!snap.exists) return null;
    return snap.data();
  } catch (err) {
    console.warn("fetchExamSeeds (legacy):", err);
    return null;
  }
}

async function saveExamSeeds(examId, seedsDoc) {
  // seedsDoc must include keys A and B plus a refreshedBy string; the server
  // timestamp is added here. examId is required for the per-exam model;
  // if it's missing we fall back to writing the global doc so refresh
  // still works in legacy code paths.
  seedsDoc.refreshedAt = firebase.firestore.FieldValue.serverTimestamp();
  if (examId) {
    await window.fbDb
      .collection("exams")
      .doc(examId)
      .collection("seeds")
      .doc("current")
      .set(seedsDoc);
  } else {
    await window.fbDb.collection("config").doc("exam_seeds").set(seedsDoc);
  }
}
