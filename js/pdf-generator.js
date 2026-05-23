// =============================================================
// PDF Report Generator
// - Header with course / university info
// - Student info block (Group, First + Last Name, ID, Version)
// - Part 1: MC score summary + 5x6 grid with Correct / Wrong / Not Answered labels
// - Part 2: reference solution vs STUDENT SOLUTION side by side
// - Filename: Group_ID_First_Last.pdf  (e.g. FAR1_250255_Azizbek_Mansurov.pdf)
//
// May 2026: PDF now contains Russian text in addition to English + Uzbek.
// jsPDF's built-in Helvetica does not include Cyrillic glyphs, so we lazily
// fetch a Cyrillic-capable TTF (DejaVu Sans, Roboto fallback) and register
// it with jsPDF before drawing. Latin/Uzbek text continues to use the
// built-in Helvetica for size/efficiency. Russian text uses the embedded
// font through doc.setFont("Cyr", ...).
// =============================================================

// ---------------- Cyrillic font loader ----------------
// Cached promise so we only fetch the font once per page load
let _cyrFontLoadingPromise = null;
function loadCyrillicFont() {
  if (_cyrFontLoadingPromise) return _cyrFontLoadingPromise;
  _cyrFontLoadingPromise = (async function () {
    // Try multiple CDN sources. Roboto from Google Fonts unpkg mirror is small
    // (~169KB regular) and includes Cyrillic.
    const FONT_URLS = [
      // Roboto Regular TTF (Cyrillic-capable, Apache 2.0)
      "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.13/files/roboto-cyrillic-400-normal.woff",
      "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.13/files/roboto-latin-400-normal.woff",
    ];
    // Primary: NotoSans Regular TTF from jsdelivr (Cyrillic-capable, OFL)
    const TTF_URL =
      "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";
    const TTF_BOLD_URL =
      "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf";

    async function fetchAsBase64(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Font fetch failed: " + res.status);
      const buf = await res.arrayBuffer();
      // Convert ArrayBuffer to base64 efficiently in chunks
      const bytes = new Uint8Array(buf);
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(
          null,
          bytes.subarray(i, Math.min(i + chunk, bytes.length)),
        );
      }
      return btoa(bin);
    }

    try {
      const [b64Regular, b64Bold] = await Promise.all([
        fetchAsBase64(TTF_URL),
        fetchAsBase64(TTF_BOLD_URL),
      ]);
      return { b64Regular, b64Bold };
    } catch (err) {
      console.warn(
        "Cyrillic font load failed; Russian text will fall back to Helvetica:",
        err,
      );
      return null;
    }
  })();
  return _cyrFontLoadingPromise;
}

// Register the loaded font into a fresh jsPDF instance.
function attachCyrillicFontToDoc(doc, fontPair) {
  if (!fontPair) return false;
  try {
    doc.addFileToVFS("NotoSans-Regular.ttf", fontPair.b64Regular);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.addFileToVFS("NotoSans-Bold.ttf", fontPair.b64Bold);
    doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
    return true;
  } catch (err) {
    console.warn("Cyrillic font registration failed:", err);
    return false;
  }
}

// Draw a "No verification photo" placeholder in the right column of
// the student info block when no photo was captured (camera denied or
// legacy submission). Keeps the layout consistent across PDFs.
function _drawPhotoPlaceholder(doc, x, y, w, h) {
  doc.setFillColor(244, 240, 228);
  doc.rect(x, y, w, h, "F");
  doc.setDrawColor(180, 170, 150);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([3, 2], 0);
  doc.rect(x, y, w, h);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 130, 110);
  doc.text("No verification", x + w / 2, y + h / 2 - 4, { align: "center" });
  doc.text("photo captured", x + w / 2, y + h / 2 + 6, { align: "center" });
}

async function generatePDFReport() {
  const data = window._submissionData;
  if (!data) return null;

  // Load Cyrillic font (cached); if it fails we proceed with Helvetica only
  const fontPair = await loadCyrillicFont();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const hasCyrFont = attachCyrillicFontToDoc(doc, fontPair);

  // Helper: switch to Cyrillic font for a Russian text block, then back.
  // If the Cyrillic font failed to load, we fall back to Helvetica which
  // will print question marks for Cyrillic glyphs — visible but degraded.
  function withCyr(weight, fn) {
    if (hasCyrFont) {
      doc.setFont(
        "NotoSans",
        weight === "italic" ? "normal" : weight || "normal",
      );
    } else {
      doc.setFont("helvetica", weight || "normal");
    }
    fn();
  }

  // Expose for use elsewhere
  doc._hasCyrFont = hasCyrFont;
  doc._withCyr = withCyr;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentW = pageW - 2 * margin;
  let y = margin;

  // ============================================================
  // Helpers
  // ============================================================
  function checkPage(space) {
    if (y + space > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // Correctly positions text using a baseline offset so text does NOT
  // draw above the current y (which was causing overlap with filled boxes)
  function addText(text, opts) {
    opts = opts || {};
    const size = opts.size || 10;
    doc.setFont(
      opts.font || "helvetica",
      opts.bold ? "bold" : opts.italic ? "italic" : "normal",
    );
    doc.setFontSize(size);
    doc.setTextColor.apply(doc, opts.color || [0, 0, 0]);
    const lines = doc.splitTextToSize(text, opts.width || contentW);
    const lineH = size * 1.3;
    lines.forEach(function (ln) {
      checkPage(lineH + 2);
      // baseline offset so text starts AT y, not above
      doc.text(ln, opts.x || margin, y + size * 0.85);
      y += lineH;
    });
  }

  function headerBar(text, color) {
    const barH = 24;
    checkPage(barH + 10);
    doc.setFillColor.apply(doc, color);
    doc.rect(margin, y, contentW, barH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(text, margin + 10, y + 16);
    y += barH + 12; // generous gap after bar (was 4 — caused overlap)
    doc.setTextColor(0, 0, 0);
  }

  function spacer(h) {
    y += h;
  }

  // FEATURE 2 helper: strip HTML from question text + decode entities
  // The MC question bank stores questions with <pre><code>, <br>, &lt;,
  // etc. The PDF needs flat text. Code snippets stay as plain monospace-
  // ish lines (jsPDF doesn't render <pre> tags). For code-heavy questions
  // the visual quality is slightly degraded but the content is preserved.
  function stripQuestionHtml(html) {
    if (typeof html !== "string") return "";
    let s = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(pre|code|p|div)>/gi, "\n")
      .replace(/<(pre|code|p|div)[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "");
    s = s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
    // Trim trailing/leading whitespace per line + drop empty lines from
    // collapsed <pre> blocks.
    s = s
      .split("\n")
      .map(function (ln) {
        return ln.replace(/[ \t]+$/, "").replace(/^[ \t]+/, "");
      })
      .filter(function (ln, i, arr) {
        // Keep non-empty lines AND single blank separators
        if (ln) return true;
        return i > 0 && arr[i - 1] !== "";
      })
      .join("\n")
      .trim();
    return s;
  }

  // ============================================================
  // 1) TITLE HEADER — dynamic from exam config
  // ============================================================
  // Pull values from the active exam config that the student picked
  // on the welcome page. Falls back to legacy hardcoded strings for
  // any submission that was started before the admin dashboard was wired.
  const cfg = data.examConfig || {};
  const headerCourse = (
    cfg.courseLabel || "Programming 1 with C++"
  ).toUpperCase();
  const examTypeLabels = {
    midterm: "Midterm Exam",
    final: "Final Exam",
    resit: "Resit Exam",
    retake1: "Retake Exam 1",
    retake2: "Retake Exam 2",
  };
  const headerExamType = examTypeLabels[cfg.examType] || "Final Exam";
  const semesterPretty = cfg.semester
    ? cfg.semester.charAt(0).toUpperCase() + cfg.semester.slice(1)
    : "Spring";
  // Derive the academic-year display year. Year strings are stored as
  // "2025-2026" — pick the latter half for "Spring 2026", former for "Fall".
  let calendarYear = "2026";
  if (cfg.academicYear && /^\d{4}-\d{4}$/.test(cfg.academicYear)) {
    const parts = cfg.academicYear.split("-");
    calendarYear = cfg.semester === "fall" ? parts[0] : parts[1];
  }
  const headerSubLine =
    headerExamType +
    " (" +
    semesterPretty +
    " Semester, " +
    calendarYear +
    ")  .  Submission Report";

  const headerUniversity =
    cfg.universityLabel ||
    "National Pedagogical University of Uzbekistan (NPUU)";
  const headerFaculty = cfg.facultyLabel || "School of Exact Sciences";
  const headerYearLine =
    headerUniversity +
    "  .  " +
    headerFaculty +
    "  .  " +
    semesterPretty +
    " " +
    calendarYear;

  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 84, "F");
  doc.setFillColor(198, 93, 30);
  doc.rect(0, 79, pageW, 5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(headerCourse, pageW / 2, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(headerSubLine, pageW / 2, 48, {
    align: "center",
  });

  doc.setFontSize(8.5);
  doc.text(headerYearLine, pageW / 2, 64, { align: "center" });

  doc.setTextColor(0, 0, 0);
  y = 104;

  // ============================================================
  // 2) STUDENT INFORMATION BLOCK — 2-column with verification photo
  // ============================================================
  // Right column is reserved for the verification photo captured at
  // exam start (Feature 5). Left column holds the text fields. If no
  // photo was captured (camera denied, legacy submission), a "No photo"
  // placeholder is drawn instead so the layout stays consistent.
  //
  // The captured photo is exactly 3:4 portrait (see verification-photo.js
  // _captureFrame). The box below MUST match that ratio or addImage
  // will stretch the photo. Box = 90w x 120h = 3:4 exactly.
  //
  // infoBoxH must accommodate: photo (120pt) + top margin (6pt) +
  // bottom margin (6pt) + label (~12pt with padding) = 144pt minimum.
  // We use 150pt for a clean visual gap around the caption.
  const infoBoxH = 150;
  const photoBoxW = 90;
  const photoBoxH = 120;
  const photoMargin = 14;
  const photoX = margin + contentW - photoBoxW - photoMargin;
  // Top-align the photo a bit so the caption has room below
  const photoY = y + 12;

  doc.setFillColor(251, 247, 238);
  doc.setDrawColor(139, 58, 47);
  doc.setLineWidth(1.5);
  doc.rect(margin, y, contentW, infoBoxH, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(139, 58, 47);
  doc.text("STUDENT INFORMATION  /  TALABA MA'LUMOTI", margin + 12, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const labelX = margin + 12;
  const valueX = margin + 150;

  doc.text("Student Full Name / To'liq Ism:", labelX, y + 38);
  doc.text("Student Group / Guruh:", labelX, y + 54);
  doc.text("Student ID / Talaba ID:", labelX, y + 70);
  doc.text("Exam Version / Versiya:", labelX, y + 86);
  doc.text("Submitted / Yuborildi:", labelX, y + 102);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(data.info.firstName + " " + data.info.lastName, valueX, y + 38);
  doc.text(data.info.group, valueX, y + 54);
  doc.text(data.info.id, valueX, y + 70);
  doc.text("Version " + data.version, valueX, y + 86);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(new Date().toLocaleString(), valueX, y + 102);

  // Verification photo (right side)
  if (data.verificationPhotoDataUrl) {
    try {
      // Light shadow behind photo for visual weight
      doc.setFillColor(220, 220, 220);
      doc.rect(photoX + 1.5, photoY + 1.5, photoBoxW, photoBoxH, "F");
      doc.addImage(
        data.verificationPhotoDataUrl,
        "JPEG",
        photoX,
        photoY,
        photoBoxW,
        photoBoxH,
      );
      // Thin frame around the photo
      doc.setDrawColor(139, 58, 47);
      doc.setLineWidth(0.8);
      doc.rect(photoX, photoY, photoBoxW, photoBoxH);
      // Caption below the photo (inside the brown info box now)
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Verification photo",
        photoX + photoBoxW / 2,
        photoY + photoBoxH + 11,
        { align: "center" },
      );
    } catch (e) {
      // If the data URL is malformed, fall through to the placeholder.
      console.warn("[pdf] embed photo failed", e);
      _drawPhotoPlaceholder(doc, photoX, photoY, photoBoxW, photoBoxH);
    }
  } else {
    _drawPhotoPlaceholder(doc, photoX, photoY, photoBoxW, photoBoxH);
  }

  y += infoBoxH + 16;
  doc.setTextColor(0, 0, 0);

  // ============================================================
  // 3) PART 1: MC SCORE SUMMARY
  // ============================================================
  headerBar("PART 1: MULTIPLE CHOICE RESULTS  /  TEST NATIJASI", [30, 58, 95]);

  // Round 2 (May 2026): all numbers below are dynamic, read from the
  // submission data. Legacy submissions without these fields default
  // to the historical 20-question / 40-point / 4-coding / 60-point layout.
  const mcCountForPdf = (data.mcQuestions && data.mcQuestions.length) || 20;
  const codingArrForPdf = data.codingProblems || [];
  const codingCountForPdf = codingArrForPdf.length || 4;
  const mcMaxForPdf = data.mcMaxPoints != null ? data.mcMaxPoints : 40;
  const codingMaxTotalForPdf =
    data.codingMaxTotal != null
      ? data.codingMaxTotal
      : codingArrForPdf.reduce(function (s, c) {
          return s + (c.maxPoints || 0);
        }, 0) || 60;
  const totalMaxForPdf = mcMaxForPdf + codingMaxTotalForPdf;
  // mcBreakdown is present on Round-2 submissions; reconstruct a sane
  // default for legacy submissions so the PDF still renders.
  const mcBd = data.mcBreakdown || {
    correct: data.correct || 0,
    wrong: 0,
    unanswered: Math.max(0, mcCountForPdf - (data.correct || 0)),
    pointsPerCorrect: 2,
    penaltyPerWrong: 0,
    pointsPerUnanswered: 0,
    rawScore: data.mcScore || 0,
    finalScore: data.mcScore || 0,
    maxPoints: mcMaxForPdf,
  };
  const codingBreakdownStr =
    codingArrForPdf
      .map(function (c) {
        return String(c.maxPoints || 0);
      })
      .join("+") || "10+15+15+20";

  // ---------- Exam structure info box ----------
  const infoH = 94;
  // Light blue background with navy left accent
  doc.setFillColor(232, 241, 248);
  doc.rect(margin, y, contentW, infoH, "F");
  doc.setFillColor(30, 58, 95);
  doc.rect(margin, y, 5, infoH, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text("EXAM STRUCTURE  /  IMTIHON TUZILMASI", margin + 14, y + 16);

  // Intro line — dynamic
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(
    "This exam contains " +
      mcCountForPdf +
      " test questions and " +
      codingCountForPdf +
      " coding problems.",
    margin + 14,
    y + 30,
  );
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text(
    "Bu imtihon " +
      mcCountForPdf +
      " ta test savoli va " +
      codingCountForPdf +
      " ta kodlash masalasidan iborat.",
    margin + 14,
    y + 42,
  );

  // Three little inline columns showing the points breakdown (dynamic)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 95);
  doc.text(
    mcCountForPdf + " tests  x  " + mcBd.pointsPerCorrect + " pts",
    margin + 14,
    y + 62,
  );
  doc.text("=", margin + 130, y + 62);
  doc.setTextColor(45, 122, 58);
  doc.text(mcMaxForPdf + " points", margin + 144, y + 62);

  doc.setTextColor(30, 58, 95);
  doc.text(
    codingCountForPdf + " coding (" + codingBreakdownStr + ")",
    margin + 220,
    y + 62,
  );
  doc.text("=", margin + 350, y + 62);
  doc.setTextColor(45, 122, 58);
  doc.text(codingMaxTotalForPdf + " points", margin + 364, y + 62);

  // Total line — dynamic
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.8);
  doc.line(margin + 14, y + 72, margin + contentW - 14, y + 72);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(139, 58, 47);
  doc.text("MAXIMUM TOTAL  /  JAMI MAKSIMUM", margin + 14, y + 86);
  doc.setTextColor(45, 122, 58);
  doc.text(totalMaxForPdf + " points", margin + contentW - 14, y + 86, {
    align: "right",
  });

  doc.setTextColor(0, 0, 0);
  y += infoH + 14;

  // ============================================================
  // ---------- MC SCORING BREAKDOWN (Round 2) ----------
  // Detailed table showing how the MC score was derived. Critical when
  // penalty-per-wrong > 0 — students need to see the math, not just the
  // final number. Always shown so students learn how grading works.
  // ============================================================
  const bdH = 102;
  doc.setFillColor(245, 248, 254);
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.6);
  doc.rect(margin, y, contentW, bdH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text(
    "MC SCORING BREAKDOWN  /  TEST BAHOLASH TAFSILOTLARI",
    margin + 14,
    y + 16,
  );

  // Three columns: label / count / formula+pts
  const colLabelX = margin + 14;
  const colCountX = margin + 200;
  const colMathX = margin + 280;
  const colPtsX = margin + contentW - 16; // right-aligned

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  // Correct
  doc.setTextColor(45, 122, 58);
  doc.text("Correct answers", colLabelX, y + 36);
  doc.setTextColor(40, 40, 40);
  doc.text(String(mcBd.correct), colCountX, y + 36);
  doc.text(
    mcBd.correct + " x " + mcBd.pointsPerCorrect + " =",
    colMathX,
    y + 36,
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(45, 122, 58);
  doc.text(
    "+" + mcBd.correct * mcBd.pointsPerCorrect + " pts",
    colPtsX,
    y + 36,
    { align: "right" },
  );

  // Wrong (only show penalty math if penalty > 0)
  doc.setFont("helvetica", "normal");
  doc.setTextColor(179, 38, 30);
  doc.text("Wrong answers", colLabelX, y + 52);
  doc.setTextColor(40, 40, 40);
  doc.text(String(mcBd.wrong), colCountX, y + 52);
  if (mcBd.penaltyPerWrong > 0) {
    doc.text(
      mcBd.wrong + " x -" + mcBd.penaltyPerWrong + " =",
      colMathX,
      y + 52,
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(179, 38, 30);
    doc.text(
      "-" + mcBd.wrong * mcBd.penaltyPerWrong + " pts",
      colPtsX,
      y + 52,
      { align: "right" },
    );
  } else {
    doc.text("no penalty configured", colMathX, y + 52);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(140, 140, 140);
    doc.text("0 pts", colPtsX, y + 52, { align: "right" });
  }

  // Unanswered (always 0)
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Unanswered", colLabelX, y + 68);
  doc.setTextColor(40, 40, 40);
  doc.text(String(mcBd.unanswered), colCountX, y + 68);
  doc.text(mcBd.unanswered + " x 0 =", colMathX, y + 68);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(140, 140, 140);
  doc.text("0 pts", colPtsX, y + 68, { align: "right" });

  // Total row
  doc.setDrawColor(30, 58, 95);
  doc.setLineWidth(0.4);
  doc.line(margin + 14, y + 78, margin + contentW - 14, y + 78);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text("TOTAL MC SCORE", colLabelX, y + 92);
  // If penalty applied and brought score below 0, note that it was floored to 0
  if (mcBd.rawScore < 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(
      "(raw = " + mcBd.rawScore + ", floored to 0)",
      colLabelX + 105,
      y + 92,
    );
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(45, 122, 58);
  doc.text(mcBd.finalScore + " / " + mcBd.maxPoints + " pts", colPtsX, y + 92, {
    align: "right",
  });

  doc.setTextColor(0, 0, 0);
  y += bdH + 14;

  // ============================================================
  // Score summary box (two stacked summary blocks instead of side-by-side
  // so the numbers don't get cut/overlapped)
  // ============================================================
  const scoreBoxH = 64;
  doc.setFillColor(251, 247, 238);
  doc.setDrawColor(139, 58, 47);
  doc.setLineWidth(1.2);
  doc.rect(margin, y, contentW, scoreBoxH, "FD");

  const halfW = contentW / 2;

  // Left half: score / mcMax
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(139, 58, 47);
  doc.text("SCORE  /  BALL", margin + 16, y + 20);

  doc.setFontSize(26);
  doc.text(String(data.mcScore), margin + 16, y + 48);
  const scoreStrW = doc.getTextWidth(String(data.mcScore));
  doc.setFontSize(12);
  doc.setTextColor(120, 120, 120);
  doc.text(
    " / " + mcMaxForPdf + " points",
    margin + 16 + scoreStrW + 4,
    y + 48,
  );

  // Divider
  doc.setDrawColor(220, 210, 190);
  doc.setLineWidth(0.5);
  doc.line(margin + halfW, y + 10, margin + halfW, y + scoreBoxH - 10);

  // Right half: correct count / mcCount
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(45, 122, 58);
  doc.text("CORRECT ANSWERS  /  TO'G'RI JAVOBLAR", margin + halfW + 16, y + 20);

  doc.setFontSize(26);
  doc.text(String(data.correct), margin + halfW + 16, y + 48);
  const corrStrW = doc.getTextWidth(String(data.correct));
  doc.setFontSize(12);
  doc.setTextColor(120, 120, 120);
  doc.text(
    " / " + mcCountForPdf + " questions",
    margin + halfW + 16 + corrStrW + 4,
    y + 48,
  );

  doc.setTextColor(0, 0, 0);
  y += scoreBoxH + 14;

  // Tab switch flag (no Unicode symbols — plain text only)
  if (data.tabSwitches > 0) {
    const flagH = 26;
    doc.setFillColor(251, 233, 231);
    doc.setDrawColor(179, 38, 30);
    doc.setLineWidth(1.2);
    doc.rect(margin, y, contentW, flagH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(179, 38, 30);
    const msg =
      "EXAM VIOLATED: Tab was switched " +
      data.tabSwitches +
      " time" +
      (data.tabSwitches > 1 ? "s" : "") +
      " during the exam.";
    doc.text(msg, margin + 12, y + 17);
    doc.setTextColor(0, 0, 0);
    y += flagH + 14;
  } else {
    y += 4;
  }

  // ============================================================
  // 3b) Webcam proctoring summary (Feature 1)
  // ============================================================
  // A visually rich panel: large colored banner with risk score on the
  // left, plus a grid of stat cards on the right showing the count of
  // each anomaly type. Designed to read at-a-glance and look polished
  // in printed reports.
  if (
    data.proctorSummary &&
    typeof data.proctorSummary.riskScore === "number"
  ) {
    const ps = data.proctorSummary;
    const detectorOff = !!ps.detectorUnavailable;
    const band = detectorOff ? "detector_off" : ps.riskBand || "clean";

    // Color tokens for each risk band
    const bandColors = {
      clean: {
        fill: [220, 248, 230],
        stroke: [22, 101, 52],
        text: [22, 101, 52],
        badge: [22, 101, 52],
      },
      minor: {
        fill: [254, 243, 199],
        stroke: [146, 64, 14],
        text: [146, 64, 14],
        badge: [180, 83, 9],
      },
      significant: {
        fill: [255, 237, 213],
        stroke: [154, 52, 18],
        text: [154, 52, 18],
        badge: [194, 65, 12],
      },
      critical: {
        fill: [254, 226, 226],
        stroke: [153, 27, 27],
        text: [153, 27, 27],
        badge: [185, 28, 28],
      },
      detector_off: {
        fill: [243, 244, 246],
        stroke: [75, 85, 99],
        text: [55, 65, 81],
        badge: [75, 85, 99],
      },
    };
    const bc = bandColors[band] || bandColors.clean;

    const labels = {
      clean: "CLEAN",
      minor: "MINOR FLAGS",
      significant: "SIGNIFICANT FLAGS",
      critical: "CRITICAL",
      detector_off: "DETECTOR OFF",
    };

    // Issue #4 fix: new section title with matching font style and color
    // between English and Uzbek (both bold, same dark navy, same size).
    // Previously the Uzbek subtitle was italic+gray which looked
    // subordinate; user wants them equal in weight.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text("Webcam Proctoring Statistics", margin, y + 10);
    const titleW = doc.getTextWidth("Webcam Proctoring Statistics");

    // Uzbek subtitle — same font weight, same color, same size as English
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text(
      "/  Veb Kamera Video Kuzatuv Statistik Hisoboti",
      margin + titleW + 8,
      y + 10,
    );
    y += 16;

    // Outer panel — taller, more breathing room
    const panelH = 92;
    const cornerR = 4;
    doc.setFillColor(bc.fill[0], bc.fill[1], bc.fill[2]);
    doc.setDrawColor(bc.stroke[0], bc.stroke[1], bc.stroke[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, contentW, panelH, cornerR, cornerR, "FD");

    // --- LEFT BLOCK: risk score "scorecard" ---
    const leftW = 130; // px of the left scorecard sub-panel
    // White card-on-card on the left for the score (more visual hierarchy)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(bc.stroke[0], bc.stroke[1], bc.stroke[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin + 10, y + 10, leftW, panelH - 20, 3, 3, "FD");

    // Band badge (small colored pill) inside the white card
    doc.setFillColor(bc.badge[0], bc.badge[1], bc.badge[2]);
    doc.setDrawColor(bc.badge[0], bc.badge[1], bc.badge[2]);
    const badgeW = leftW - 20;
    doc.roundedRect(margin + 20, y + 18, badgeW, 13, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const lblText = labels[band];
    const lblW = doc.getTextWidth(lblText);
    doc.text(lblText, margin + 20 + (badgeW - lblW) / 2, y + 27);

    // Huge risk score number — measure both pieces, center the combined width
    if (!detectorOff) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(34);
      doc.setTextColor(bc.text[0], bc.text[1], bc.text[2]);
      const scoreStr = String(ps.riskScore);
      const scoreW = doc.getTextWidth(scoreStr);
      doc.setFontSize(10);
      const denoStr = " / 100";
      doc.setTextColor(110, 110, 110);
      const denoW = doc.getTextWidth(denoStr);
      // Center the combined "78 / 100" group within the card width
      const combinedW = scoreW + denoW + 2;
      const startX = margin + 20 + (badgeW - combinedW) / 2;
      // Draw score first (big)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(34);
      doc.setTextColor(bc.text[0], bc.text[1], bc.text[2]);
      doc.text(scoreStr, startX, y + 57);
      // Then "/ 100" (small, muted)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(110, 110, 110);
      doc.text(denoStr, startX + scoreW + 2, y + 57);
      // Caption below
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      const captionW = doc.getTextWidth("RISK SCORE");
      doc.text("RISK SCORE", margin + 20 + (badgeW - captionW) / 2, y + 72);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      const lines = doc.splitTextToSize(
        "In-browser detector did not initialize. Anomaly detection was off during this exam. Use evidence frames in the admin dashboard for manual review.",
        leftW - 20,
      );
      doc.text(lines, margin + 20, y + 45);
    }

    // --- RIGHT BLOCK: grid of detection counters ---
    const counts = ps.eventCounts || {};
    // 4 cells per row, 2 rows (8 cells total — 7 detection types + 1 frame count)
    // Detection type, label (short), label (full), count
    const stats = [
      {
        key: "no_face",
        short: "NO FACE",
        full: "No Face Detection",
        count: counts.no_face || 0,
      },
      {
        key: "multiple_faces",
        short: "MULTI FACE",
        full: "Multiple Faces Detection",
        count: counts.multiple_faces || 0,
      },
      {
        key: "face_turned_away",
        short: "TURNED-FACE AWAY",
        full: "Face Turned Away Detection",
        count: counts.face_turned_away || 0,
      },
      {
        key: "phone_visible",
        short: "PHONE",
        full: "Phone Detection",
        count: counts.phone_visible || 0,
      },
      {
        key: "second_person",
        short: "2ND PERSON",
        full: "Second Person Detection",
        count: counts.second_person || 0,
      },
      {
        key: "notes_visible",
        short: "NOTES",
        full: "Paper Notes Detection",
        count: counts.notes_visible || 0,
      },
      {
        key: "second_screen",
        short: "2ND SCREEN",
        full: "Second Screen Detection",
        count: counts.second_screen || 0,
      },
      {
        key: "scheduled",
        short: "SCHEDULED FRAME IMAGES",
        full: "Scheduled Frames Captured",
        count: ps.scheduledFrameCount || 0,
      },
    ];

    const rightX = margin + 10 + leftW + 10;
    const rightW = contentW - leftW - 30;
    const cols = 4,
      rows = 2;
    const cellW = (rightW - (cols - 1) * 4) / cols;
    const cellH = (panelH - 20 - (rows - 1) * 5) / rows;

    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];
      const col = i % cols,
        row = Math.floor(i / cols);
      const cx = rightX + col * (cellW + 4);
      const cy = y + 10 + row * (cellH + 5);

      // Cell background — accent color when count > 0, else neutral
      const hasHits = s.count > 0 && s.key !== "scheduled";
      const isInfo = s.key === "scheduled";
      let cellFill = [255, 255, 255];
      let cellStroke = [bc.stroke[0], bc.stroke[1], bc.stroke[2]];
      let valColor = [bc.text[0], bc.text[1], bc.text[2]];
      let labelColor = [120, 120, 120];

      if (isInfo) {
        cellFill = [240, 244, 252]; // pale blue tint
        cellStroke = [29, 78, 216]; // accent blue
        valColor = [29, 78, 216];
        labelColor = [29, 78, 216];
      } else if (hasHits) {
        // Lean into the band color when there's a hit
        cellFill = [bc.fill[0], bc.fill[1], bc.fill[2]];
        cellStroke = [bc.badge[0], bc.badge[1], bc.badge[2]];
        valColor = [bc.badge[0], bc.badge[1], bc.badge[2]];
        labelColor = [bc.text[0], bc.text[1], bc.text[2]];
      } else {
        // No hits — soft gray
        cellFill = [255, 255, 255];
        cellStroke = [210, 215, 220];
        valColor = [180, 180, 180];
        labelColor = [140, 140, 140];
      }

      doc.setFillColor(cellFill[0], cellFill[1], cellFill[2]);
      doc.setDrawColor(cellStroke[0], cellStroke[1], cellStroke[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(cx, cy, cellW, cellH, 2, 2, "FD");

      // Big count
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(valColor[0], valColor[1], valColor[2]);
      const countStr = String(s.count);
      const countW = doc.getTextWidth(countStr);
      // Position count slightly above center so multi-line labels (e.g.
      // "SCHEDULED FRAME IMAGES", "TURNED-FACE AWAY") have room below.
      doc.text(countStr, cx + (cellW - countW) / 2, cy + cellH / 2 - 1);

      // Short label — auto-wrap into 2 lines if it doesn't fit on one.
      // "SCHEDULED FRAME IMAGES" and "TURNED-FACE AWAY" are wider than
      // the cell so we use splitTextToSize to break gracefully.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      const labelLines = doc.splitTextToSize(s.short, cellW - 4);
      const lineH = 6; // ~6pt per line at fontSize 6.5
      // Anchor the block at the bottom of the cell. Multi-line labels
      // grow upward from the same baseline as single-line ones, so the
      // bottom edge stays consistent across all tiles.
      const totalLabelH = labelLines.length * lineH;
      for (let li = 0; li < labelLines.length; li++) {
        const line = labelLines[li];
        const lineW = doc.getTextWidth(line);
        doc.text(
          line,
          cx + (cellW - lineW) / 2,
          cy + cellH - 4 - (totalLabelH - lineH) + li * lineH,
        );
      }
    }

    doc.setTextColor(0, 0, 0);
    y += panelH + 14;

    // Below-panel footnote (when detector worked)
    if (!detectorOff && (ps.totalEvents || 0) === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text(
        "No anomalies were detected during this exam session.",
        margin,
        y,
      );
      y += 12;
    }
  }

  // ============================================================
  // 4) ANSWER BREAKDOWN TABLE — N cells in a 5-col grid
  // ------------------------------------------------------------
  // Cell count comes from data.mcQuestions.length (Round 2: dynamic).
  // FIX (May 23): pre-flight a checkPage() so the title + the entire
  // grid + the legend either all fit on the current page, or move
  // together to a new page. Without this, when MC count was tall
  // enough to push the table low (and we had no question-level
  // pagination logic before the grid), the bottom rows of the grid
  // were drawing INTO the page footer, with the "Page N of M" stamp
  // overlapping the "Not Answered" / "Correct" / "Wrong" labels.
  // ============================================================
  const breakdownCols = 5;
  const breakdownRows = Math.ceil(data.mcQuestions.length / breakdownCols);
  const breakdownCellH = 42;
  // Title (~20pt) + grid + legend (~30pt) — a small safety bonus
  // so the page-footer line itself isn't tight against the bottom
  // row of the grid.
  checkPage(20 + breakdownRows * breakdownCellH + 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 95);
  doc.text("Answer Breakdown  /  Javoblar Jadvali", margin, y + 10);
  y += 20;

  const cols = breakdownCols;
  const rows = breakdownRows;
  const cellW = contentW / cols;
  const cellH = breakdownCellH;

  doc.setTextColor(0, 0, 0);
  const gridTop = y;

  for (let i = 0; i < data.mcQuestions.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cx = margin + col * cellW;
    const cy = gridTop + row * cellH;

    const userAns = data.userAnswers[i];
    const q = data.mcQuestions[i];
    const isAnswered = userAns !== -1;
    const isCorrect = isAnswered && userAns === q.correct;

    // Cell background
    if (!isAnswered) {
      doc.setFillColor(240, 240, 240);
    } else if (isCorrect) {
      doc.setFillColor(232, 243, 234);
    } else {
      doc.setFillColor(251, 233, 231);
    }
    doc.rect(cx, cy, cellW, cellH, "F");

    // Cell border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(cx, cy, cellW, cellH, "S");

    // Question number (top-left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text("Q" + (i + 1), cx + 8, cy + 15);

    // Status label (bottom) — text labels, not Unicode symbols
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    let label, r, g, b;
    if (!isAnswered) {
      label = "Not Answered";
      r = 140;
      g = 140;
      b = 140;
    } else if (isCorrect) {
      label = "Correct";
      r = 45;
      g = 122;
      b = 58;
    } else {
      label = "Wrong";
      r = 179;
      g = 38;
      b = 30;
    }
    doc.setTextColor(r, g, b);
    doc.text(label, cx + cellW / 2, cy + 32, { align: "center" });
  }

  y = gridTop + rows * cellH + 16;
  doc.setTextColor(0, 0, 0);

  // Legend — FIX (May 23): values are now dynamic, sourced from
  // mcBd (the Round 2 scoring snapshot stored on the submission).
  // Previously hardcoded as "+2 / 0 / 0", which silently lied
  // whenever an instructor configured a different pointsPerCorrectMc
  // or applied a wrong-answer penalty.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const wrongLegendStr =
    mcBd.penaltyPerWrong > 0 ? "-" + mcBd.penaltyPerWrong + " pts" : "0 pts";
  doc.text(
    "Correct = +" +
      mcBd.pointsPerCorrect +
      " pts      |      Wrong = " +
      wrongLegendStr +
      "      |      Not Answered = 0 pts",
    margin,
    y + 8,
  );
  y += 20;
  doc.setTextColor(0, 0, 0);

  // ============================================================
  // 4b) DETAILED QUESTION REVIEW (FEATURE 2 — green/light-red highlights)
  // ------------------------------------------------------------
  // For each MC question, show: the question text, all four options,
  // with the CORRECT option highlighted GREEN and the STUDENT'S WRONG
  // CHOICE highlighted LIGHT RED. Lets students review what they
  // actually missed without flipping to a separate answer key.
  // ============================================================
  doc.addPage();
  y = margin;
  headerBar("TEST QUESTIONS REVIEW  /  TEST SAVOLLARI SHARHI", [30, 58, 95]);

  // Sub-intro with legend
  addText(
    "Each multiple-choice question with all four options. The correct answer is highlighted in GREEN. If you chose incorrectly, your selection is highlighted in LIGHT RED.",
    { size: 9.5, color: [0, 0, 0] },
  );
  addText(
    "Har bir test savoli to'rtta variant bilan. To'g'ri javob YASHIL bilan, agar siz noto'g'ri tanlasangiz, sizning javobingiz OCH QIZIL bilan ajratilgan.",
    { size: 9, italic: true, color: [80, 80, 80] },
  );
  y += 8;

  // Mini legend with color swatches
  (function drawReviewLegend() {
    const sw = 14,
      sh = 9,
      gap = 6,
      padR = 24;
    const labels = [
      {
        color: [216, 240, 220],
        stroke: [22, 101, 52],
        label: "Correct answer",
      },
      {
        color: [251, 233, 231],
        stroke: [179, 38, 30],
        label: "Your wrong choice",
      },
    ];
    let lx = margin;
    for (const it of labels) {
      doc.setFillColor(it.color[0], it.color[1], it.color[2]);
      doc.setDrawColor(it.stroke[0], it.stroke[1], it.stroke[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(lx, y, sw, sh, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(it.label, lx + sw + gap, y + 7);
      lx += sw + gap + doc.getTextWidth(it.label) + padR;
    }
    y += sh + 14;
    doc.setTextColor(0, 0, 0);
  })();

  for (let qi = 0; qi < data.mcQuestions.length; qi++) {
    const q = data.mcQuestions[qi];
    const userAns = data.userAnswers[qi];
    const order = data.optionOrders[qi] || [0, 1, 2, 3];
    const isAnswered =
      userAns !== -1 && userAns !== undefined && userAns !== null;
    // Indexing model (see app.js renderQuestions click handler):
    //   - optionOrders[qi] maps DISPLAYED-index -> BANK-index.
    //     i.e. order[d] is the bank-index of the option shown at slot d.
    //   - q.correct is the BANK-index of the correct option.
    //   - userAnswers[qi] stores the BANK-index of the option the
    //     student clicked (NOT the displayed slot). Scoring in app.js
    //     compares it directly against q.correct.
    // We render in DISPLAY order (the order the student saw on screen)
    // so the highlights correspond to what was on their screen, but
    // all correctness checks are done in BANK-space.

    // Render each question into a self-contained block. Plain-text
    // strip from the HTML question (PDF jsPDF doesn't handle HTML;
    // also we don't render code in monospace here — keep it simple
    // and readable; full code is in the original exam).
    const questionTextEn = stripQuestionHtml(q.en || "");
    const questionTextUz = stripQuestionHtml(q.uz || "");

    // Compute the height this block will need so we can page-break before
    // splitting a question across two pages.
    // Approx: title row (16pt) + EN text + UZ text + 4 options. We use a
    // pessimistic estimate and let checkPage handle the rest.
    const estimatedBlockHeight =
      18 + // header row
      Math.max(20, Math.ceil(questionTextEn.length / 90) * 13) +
      Math.max(20, Math.ceil(questionTextUz.length / 90) * 11) +
      4 * 22 + // options
      12; // padding
    checkPage(estimatedBlockHeight);

    // ---- Question header row (Q# + status badge) ----
    // userAns and q.correct are both BANK-indices, compare directly.
    const isCorrect = isAnswered && userAns === q.correct;
    let badgeText, badgeFill, badgeStroke, badgeTextColor;
    if (!isAnswered) {
      badgeText = "NOT ANSWERED";
      badgeFill = [240, 240, 240];
      badgeStroke = [140, 140, 140];
      badgeTextColor = [80, 80, 80];
    } else if (isCorrect) {
      badgeText = "CORRECT";
      badgeFill = [216, 240, 220];
      badgeStroke = [22, 101, 52];
      badgeTextColor = [22, 101, 52];
    } else {
      badgeText = "WRONG";
      badgeFill = [251, 233, 231];
      badgeStroke = [179, 38, 30];
      badgeTextColor = [179, 38, 30];
    }

    // Q-number on the left, badge on the right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text("Q" + (qi + 1), margin, y + 10);

    // badge
    const badgeW = doc.getTextWidth(badgeText) + 14;
    doc.setFillColor(badgeFill[0], badgeFill[1], badgeFill[2]);
    doc.setDrawColor(badgeStroke[0], badgeStroke[1], badgeStroke[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin + contentW - badgeW, y + 1, badgeW, 14, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(badgeTextColor[0], badgeTextColor[1], badgeTextColor[2]);
    doc.text(badgeText, margin + contentW - badgeW / 2, y + 10, {
      align: "center",
    });

    y += 18;

    // ---- Question text (EN) ----
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    const linesEn = doc.splitTextToSize(questionTextEn, contentW - 4);
    for (const ln of linesEn) {
      checkPage(13);
      doc.text(ln, margin + 2, y + 9);
      y += 13;
    }

    // ---- Question text (UZ) — smaller italic ----
    if (questionTextUz && questionTextUz !== questionTextEn) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      const linesUz = doc.splitTextToSize(questionTextUz, contentW - 4);
      for (const ln of linesUz) {
        checkPage(12);
        doc.text(ln, margin + 2, y + 8);
        y += 11.5;
      }
    }
    y += 4;

    // ---- Options ----
    // Render in displayed order (the order the student saw on screen).
    // For each displayed index d, the bank-index is order[d].
    const optsArr = Array.isArray(q.opts) ? q.opts : [];
    for (let d = 0; d < 4; d++) {
      const bankIdx = order[d];
      const opt = optsArr[bankIdx];
      if (!opt) continue;

      const isCorrectOpt = bankIdx === q.correct;
      // userAns is a BANK-index (see comment near line 797). Compare
      // against bankIdx of the current option, not against the
      // displayed slot d.
      const isUserChoice = isAnswered && userAns === bankIdx;
      const isUserWrongChoice = isUserChoice && !isCorrect;

      // Resolve option color
      let optFill, optStroke, optTextColor;
      if (isCorrectOpt) {
        optFill = [216, 240, 220]; // light green
        optStroke = [22, 101, 52];
        optTextColor = [22, 101, 52];
      } else if (isUserWrongChoice) {
        optFill = [251, 233, 231]; // light red
        optStroke = [179, 38, 30];
        optTextColor = [179, 38, 30];
      } else {
        optFill = [250, 250, 250]; // neutral very-light
        optStroke = [220, 220, 220];
        optTextColor = [60, 60, 60];
      }

      // Build the option text from EN + UZ
      const optEn = typeof opt === "string" ? opt : opt.en || "";
      const optUz = typeof opt === "string" ? "" : opt.uz || "";
      const optEnClean = stripQuestionHtml(optEn);
      const optUzClean = stripQuestionHtml(optUz);

      // Compute option box height
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const optEnLines = doc.splitTextToSize(optEnClean, contentW - 50);
      const optUzLines =
        optUzClean && optUzClean !== optEnClean
          ? doc.splitTextToSize(optUzClean, contentW - 50)
          : [];
      const optH = Math.max(
        20,
        optEnLines.length * 11 + optUzLines.length * 9 + 8,
      );

      checkPage(optH + 4);

      // Background + border
      doc.setFillColor(optFill[0], optFill[1], optFill[2]);
      doc.setDrawColor(optStroke[0], optStroke[1], optStroke[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, contentW, optH, 2, 2, "FD");

      // Letter (A/B/C/D)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(optTextColor[0], optTextColor[1], optTextColor[2]);
      doc.text(String.fromCharCode(65 + d) + ")", margin + 8, y + 12);

      // EN option text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
      let oy = y + 11;
      for (const ln of optEnLines) {
        doc.text(ln, margin + 30, oy);
        oy += 11;
      }
      // UZ subtitle (if different)
      if (optUzLines.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        for (const ln of optUzLines) {
          doc.text(ln, margin + 30, oy);
          oy += 9;
        }
      }

      // Marker labels on the right (✓ correct / ← your choice)
      if (isCorrectOpt || isUserWrongChoice) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(optTextColor[0], optTextColor[1], optTextColor[2]);
        const markerText = isCorrectOpt ? "Correct" : "Your choice";
        const mw = doc.getTextWidth(markerText);
        doc.text(markerText, margin + contentW - mw - 8, y + 12);
      }

      y += optH + 4;
    }

    y += 8; // gap between questions
    doc.setTextColor(0, 0, 0);
  }

  // ============================================================
  // 5) PART 2: CODING SUBMISSIONS (SIDE-BY-SIDE)
  // ============================================================
  doc.addPage();
  y = margin;
  headerBar(
    "PART 2: CODING SUBMISSIONS  /  KODLASH BO'YICHA MASALALAR",
    [198, 93, 30],
  );

  // Intro text — no longer references "reference solution" since we dropped
  // the side-by-side layout (with live question refresh, pre-baked reference
  // solutions aren't reliable). Black text per instructor request.
  addText(
    "Student's submitted code for each coding problem. The problem description appears above each code block. The instructor grades by reading the student's code against the requirements.",
    { size: 10, color: [0, 0, 0] },
  );
  addText(
    "Har bir kodlash masalasi uchun talaba yuborgan kod. Masalaning ta'rifi har bir kod bloki tepasida ko'rsatilgan. O'qituvchi talabaning kodini talablarga qarab baholaydi.",
    { size: 9.5, color: [0, 0, 0], italic: true },
  );
  y += 4;

  // Highlighting legend
  const legY = y;
  doc.setFillColor(255, 240, 140);
  doc.rect(margin, legY, 14, 10, "F");
  doc.setDrawColor(200, 180, 60);
  doc.setLineWidth(0.4);
  doc.rect(margin, legY, 14, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 50, 180);
  doc.text("Yellow highlight + blue text", margin + 20, legY + 7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(
    "= lines written by the student (the rest is unchanged starter code).",
    margin + 20 + doc.getTextWidth("Yellow highlight + blue text") + 3,
    legY + 7.5,
  );
  doc.setTextColor(0, 0, 0);
  y += 16;

  // Per-problem helper accessors.
  // Round 2 follow-up (May 23): now generalized for any N. The
  // app.js submit path still fills the legacy code1..code4 /
  // max1..max4 / starter1..starter4 / lastRun1..lastRun4 fields for
  // backward compat, but for N != 4 we need to read additional
  // slots. We fall back through three layers:
  //   1. The legacy code(i+1)/max(i+1)/... field (works for i=0..3)
  //   2. The Round 2 array fields (codingAnswers[i], codingProblems[i])
  //   3. A safe default for the missing-data case
  function getStudentCode(i) {
    const explicit = data["code" + (i + 1)];
    if (typeof explicit === "string" && explicit.length) return explicit;
    if (data.codingAnswers && data.codingAnswers[i]) {
      return data.codingAnswers[i];
    }
    return "(No code submitted)";
  }
  function getStarter(i) {
    const explicit = data["starter" + (i + 1)];
    if (typeof explicit === "string" && explicit.length) return explicit;
    if (data.codingProblems && data.codingProblems[i]) {
      return data.codingProblems[i].starter || "";
    }
    return "";
  }
  function getMaxPoints(i) {
    const explicit = data["max" + (i + 1)];
    if (typeof explicit === "number" && explicit > 0) return explicit;
    if (data.codingProblems && data.codingProblems[i]) {
      return data.codingProblems[i].maxPoints || 0;
    }
    return 0;
  }
  function getLastRun(i) {
    const explicit = data["lastRun" + (i + 1)];
    if (explicit) return explicit;
    return null;
  }
  function getRunCount(i) {
    const explicit = data["runCount" + (i + 1)];
    if (typeof explicit === "number") return explicit;
    return 0;
  }
  function getProblemTitleEn(i) {
    const p =
      data.codingProblems && data.codingProblems[i]
        ? data.codingProblems[i]
        : null;
    return p ? p.title_en : "Coding Problem " + (i + 1);
  }
  function getProblemTitleUz(i) {
    const p =
      data.codingProblems && data.codingProblems[i]
        ? data.codingProblems[i]
        : null;
    return p ? p.title_uz : i + 1 + "-Kodlash Masalasi";
  }
  function getProblemTitleRu(i) {
    const p =
      data.codingProblems && data.codingProblems[i]
        ? data.codingProblems[i]
        : null;
    return p ? p.title_ru || "" : "";
  }
  function getProblemRequirementsEn(i) {
    const p =
      data.codingProblems && data.codingProblems[i]
        ? data.codingProblems[i]
        : null;
    return p && p.en ? p.en : [];
  }
  function getProblemRequirementsUz(i) {
    const p =
      data.codingProblems && data.codingProblems[i]
        ? data.codingProblems[i]
        : null;
    return p && p.uz ? p.uz : [];
  }
  function getProblemRequirementsRu(i) {
    const p =
      data.codingProblems && data.codingProblems[i]
        ? data.codingProblems[i]
        : null;
    return p && p.ru ? p.ru : [];
  }
  // Look up sample solution by problem title. Returns null if not found.
  //
  // IMPORTANT: app.js's buildCodingForVersion prefixes each problem's
  // title_en with "Coding Problem N — " for display purposes. But
  // solutions.js is keyed by the ORIGINAL (unprefixed) bank title. So
  // we strip that prefix before the lookup. The regex matches the
  // prefix pattern with both the em-dash (—) and hyphen (-) for safety.
  function getSolution(i) {
    const p =
      data.codingProblems && data.codingProblems[i]
        ? data.codingProblems[i]
        : null;
    if (!p || !p.title_en) return null;
    if (typeof window === "undefined" || !window.SOLUTIONS) return null;
    // Strip the "Coding Problem N — " (or "- ") prefix if present
    const originalTitle = p.title_en.replace(
      /^Coding Problem \d+\s*[—–-]\s*/,
      "",
    );
    return (
      window.SOLUTIONS[originalTitle] || window.SOLUTIONS[p.title_en] || null
    );
  }

  // Each coding problem: problem-title row → requirements bullets → full-width student code → Last Run block
  // FIX (May 23): loop bound is now dynamic (codingCountForPdf, set
  // at the top of this function from the resolved coding-problem
  // array). The previous `i < 4` meant a 2-problem exam still
  // rendered phantom "Coding Problem 3" and "Coding Problem 4"
  // sections in the PDF, each with empty "(No code submitted)"
  // placeholders. For a pure-MC exam (codingCountForPdf === 0),
  // this entire section is skipped — no orphan header.
  for (let i = 0; i < codingCountForPdf; i++) {
    checkPage(80);

    // Problem title row (bilingual+Russian), right-aligned max-points pill
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text(getProblemTitleEn(i), margin, y + 10);
    // Max points pill on the right
    const pillText = "Max " + getMaxPoints(i) + " pts";
    const pillW = doc.getTextWidth(pillText) + 16;
    const pillH = 16;
    const pillX = margin + contentW - pillW;
    const pillY = y + 0;
    doc.setFillColor(251, 247, 238);
    doc.setDrawColor(198, 93, 30);
    doc.setLineWidth(0.8);
    doc.rect(pillX, pillY, pillW, pillH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(139, 58, 47);
    doc.text(pillText, pillX + 8, pillY + 11);
    // Uzbek subtitle under the English title
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(110, 110, 110);
    doc.text(getProblemTitleUz(i), margin, y + 22);
    y += 32;
    // Russian subtitle (Cyrillic font) under the Uzbek subtitle
    const titleRu = getProblemTitleRu(i);
    if (titleRu) {
      withCyr("normal", function () {
        doc.setFontSize(9.5);
        doc.setTextColor(110, 110, 110);
        doc.text(titleRu, margin, y);
      });
      y += 14;
    }

    // Problem description + requirements bullets (English, Uzbek, Russian).
    // Gives the instructor the full spec to grade against. Each bullet is
    // page-bounds-checked so trilingual text never overflows under the
    // page footer.
    const reqsEn = getProblemRequirementsEn(i);
    const reqsUz = getProblemRequirementsUz(i);
    const reqsRu = getProblemRequirementsRu(i);

    // Helper: render a sequence of bullets with the supplied font/style,
    // checking the page bottom before EACH wrapped line so we never overflow.
    function renderBullets(bullets, lineHeight, options) {
      options = options || {};
      bullets.forEach(function (r) {
        const plain = String(r).replace(/<[^>]+>/g, "");
        // First decide font based on options.cyrillic
        if (options.cyrillic) {
          withCyr(options.bold ? "bold" : "normal", function () {
            doc.setFontSize(options.size || 9);
          });
        } else {
          doc.setFont(
            "helvetica",
            options.italic ? "italic" : options.bold ? "bold" : "normal",
          );
          doc.setFontSize(options.size || 9);
        }
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize("• " + plain, contentW - 12);
        lines.forEach(function (ln) {
          // Page break protection: leave 32pt of room for the page footer
          checkPage(lineHeight + 32);
          // Re-apply font after a possible page break
          if (options.cyrillic) {
            if (hasCyrFont) {
              doc.setFont("NotoSans", options.bold ? "bold" : "normal");
            } else {
              doc.setFont("helvetica", options.bold ? "bold" : "normal");
            }
          } else {
            doc.setFont(
              "helvetica",
              options.italic ? "italic" : options.bold ? "bold" : "normal",
            );
          }
          doc.setFontSize(options.size || 9);
          doc.setTextColor(0, 0, 0);
          doc.text(ln, margin + 4, y + 8);
          y += lineHeight;
        });
      });
    }

    if (reqsEn.length > 0 || reqsUz.length > 0 || reqsRu.length > 0) {
      // Section header — split into two text() calls because the Russian
      // "Требования к задаче" needs the Cyrillic-capable NotoSans font.
      // Helvetica would render Cyrillic characters as garbled glyphs.
      checkPage(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      const headEn = "Problem Requirements / Masala Talablari";
      doc.text(headEn, margin, y + 8);
      // Compute the X offset to place the Russian portion right after the
      // EN/UZ portion. We add a separator " / " in helvetica too (Latin chars).
      const sepEn = " / ";
      const headEnW = doc.getTextWidth(headEn);
      doc.text(sepEn, margin + headEnW, y + 8);
      const sepW = doc.getTextWidth(sepEn);
      // Russian part in Cyrillic font (or graceful fallback to helvetica
      // if the Cyrillic font failed to load — at least it won't crash)
      if (hasCyrFont) {
        doc.setFont("NotoSans", "bold");
      }
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text("Требования к задаче:", margin + headEnW + sepW, y + 8);
      y += 14;

      // English bullets — normal weight, 9pt
      if (reqsEn.length > 0) {
        renderBullets(reqsEn, 11, { size: 9 });
      }

      // Uzbek bullets — italic, smaller (8.5pt)
      if (reqsUz.length > 0) {
        y += 3;
        renderBullets(reqsUz, 10, { size: 8.5, italic: true });
      }

      // Russian bullets — Cyrillic font, normal weight, 8.5pt
      if (reqsRu.length > 0) {
        y += 3;
        renderBullets(reqsRu, 10, { size: 8.5, cyrillic: true });
      }

      y += 6;
    }

    checkPage(60);

    // --- Student code + sample solution panels (side-by-side) ---
    const studentCode = getStudentCode(i);
    const starterCode = getStarter(i);
    const solutionCode =
      getSolution(i) || "// Sample solution not available for this problem.";

    const starterSet = new Set();
    starterCode.split("\n").forEach(function (ln) {
      const t = ln.trim();
      if (t) starterSet.add(t);
    });

    // Side-by-side geometry:
    //   |---- LEFT (student) ----|-gap-|---- RIGHT (solution) ----|
    const colGap = 6;
    const colW = (contentW - colGap) / 2;
    const codeInnerW = colW - 14; // accounting for left/right padding
    const lineHeight = 10.5; // slightly smaller than full-width version
    const codeFontSize = 7.5;
    doc.setFont("courier", "normal");
    doc.setFontSize(codeFontSize);

    // Tag each student line:
    //   - added: true if line content is NOT in the starter (student wrote it)
    //   - isTodo: true if line is a `// TODO` comment from the starter
    // We carry these flags into each wrapped piece so visual style stays
    // consistent even on wrapped lines.
    const studentOriginalLines = studentCode.split("\n");
    const studentEntries = []; // [{ text, added, isTodo }]
    studentOriginalLines.forEach(function (origLine) {
      const trimmed = origLine.trim();
      const isAdded = trimmed.length > 0 && !starterSet.has(trimmed);
      const isTodo = !isAdded && /^\s*\/\/\s*TODO/i.test(origLine);
      const wrap = doc.splitTextToSize(origLine || " ", codeInnerW);
      wrap.forEach(function (piece) {
        studentEntries.push({ text: piece, added: isAdded, isTodo: isTodo });
      });
    });

    // Wrap solution the same way (no diff highlighting - just plain).
    // Tag if a line is a comment line so we can render it in gray.
    const solutionLines = solutionCode.split("\n");
    const solutionEntries = []; // [{ text, isComment }]
    solutionLines.forEach(function (origLine) {
      const isComment = /^\s*\/\//.test(origLine);
      const wrap = doc.splitTextToSize(origLine || " ", codeInnerW);
      wrap.forEach(function (piece) {
        solutionEntries.push({ text: piece, isComment: isComment });
      });
    });

    // Panel height is the taller of the two so both align at the top
    const maxLines = Math.max(studentEntries.length, solutionEntries.length);
    const boxH = Math.max(60, maxLines * lineHeight + 14);

    // Header geometry
    const headerH = 22;

    // Check if the header + panel fits on the current page; otherwise wrap
    if (y + headerH + boxH > pageH - margin) {
      doc.addPage();
      y = margin;
    }

    // ----- Headers (two side-by-side dark strips) -----
    const leftX = margin;
    const rightX = margin + colW + colGap;

    // STUDENT panel: dark navy header
    doc.setFillColor(30, 58, 95);
    doc.rect(leftX, y, colW, headerH, "F");
    // SOLUTION panel: warm orange/brown header (instructor reference)
    doc.setFillColor(184, 92, 30);
    doc.rect(rightX, y, colW, headerH, "F");

    // Smaller font so the full bilingual labels fit comfortably in each
    // half-width column. 7.5pt keeps the labels readable but prevents
    // truncation/overlap at the panel boundary.
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(
      "STUDENT'S SUBMITTED CODE  /  TALABANING YUBORGAN KODI",
      leftX + 6,
      y + 14,
    );
    doc.text(
      "SAMPLE SOLUTION CODE  /  NAMUNAVIY YECHIM KODI",
      rightX + 6,
      y + 14,
    );
    doc.setTextColor(0, 0, 0);
    y += headerH;

    // ----- Panel backgrounds (side-by-side) -----
    // Left (student): cool blue-gray. Right (solution): warm cream/orange tint.
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.8);
    doc.setFillColor(246, 249, 252);
    doc.rect(leftX, y, colW, boxH, "FD");

    doc.setDrawColor(184, 92, 30);
    doc.setFillColor(253, 244, 230);
    doc.rect(rightX, y, colW, boxH, "FD");

    // Helper: detect Cyrillic in a string. If present and we have the
    // Cyrillic font loaded, switch to it for that line; otherwise fall back
    // to courier (Latin only).
    function hasCyrillic(s) {
      for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i);
        if (code >= 0x0400 && code <= 0x04ff) return true;
      }
      return false;
    }

    // ----- Left column: student code with diff highlighting -----
    // Color rules:
    //   - Lines the student wrote:      BLUE text + YELLOW highlight, BOLD
    //   - TODO comment lines (starter): GRAY text, normal
    //   - All other starter code:       BLACK text, normal
    const textStartY = y + 10;
    studentEntries.forEach(function (entry, idx) {
      const ly = textStartY + idx * lineHeight;
      if (ly > y + boxH - 6) return;

      // Draw yellow highlight ONLY behind student-written lines
      if (entry.added) {
        doc.setFillColor(255, 240, 140);
        doc.rect(leftX + 2, ly - (lineHeight - 2), colW - 4, lineHeight, "F");
      }

      // Pick font: NotoSans for Cyrillic, courier for everything else
      const useCyr = hasCyrillic(entry.text) && hasCyrFont;
      if (useCyr) {
        doc.setFont("NotoSans", entry.added ? "bold" : "normal");
      } else {
        doc.setFont("courier", entry.added ? "bold" : "normal");
      }
      doc.setFontSize(codeFontSize);

      // Color
      if (entry.added) {
        // Student-written: deep blue, bold
        doc.setTextColor(10, 30, 160);
      } else if (entry.isTodo) {
        // TODO comment: gray (less prominent than student code)
        doc.setTextColor(120, 120, 120);
      } else {
        // Other starter code: black
        doc.setTextColor(0, 0, 0);
      }
      doc.text(entry.text, leftX + 6, ly);
    });

    // ----- Right column: sample solution -----
    // Color rules:
    //   - Comment lines:    GRAY (helps distinguish guidance from code)
    //   - Real code lines:  BLACK
    doc.setFontSize(codeFontSize);
    solutionEntries.forEach(function (entry, idx) {
      const ly = textStartY + idx * lineHeight;
      if (ly > y + boxH - 6) return;
      const useCyr = hasCyrillic(entry.text) && hasCyrFont;
      if (useCyr) {
        doc.setFont("NotoSans", "normal");
      } else {
        doc.setFont("courier", "normal");
      }
      if (entry.isComment) {
        doc.setTextColor(120, 120, 120);
      } else {
        doc.setTextColor(0, 0, 0);
      }
      doc.text(entry.text, rightX + 6, ly);
    });

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += boxH + 12;

    // ---------- Last Run Result block (informational) ----------
    renderLastRunBlock(getLastRun(i), getRunCount(i));
    y += 16;
  }

  // Renders a "Last Run Result" panel at the current y position.
  // Informational only — does not affect grading.
  function renderLastRunBlock(lastRun, runCount) {
    // Estimate block height based on content
    const baseH = 50;
    let contentExtra = 0;
    if (lastRun) {
      const estLines =
        (lastRun.stdout || "").split("\n").length +
        (lastRun.stderr || "").split("\n").length;
      contentExtra = Math.min(90, estLines * 9);
    }
    const blockH = baseH + contentExtra;

    if (y + blockH > pageH - margin) {
      doc.addPage();
      y = margin;
    }

    // Pale yellow background, small left accent
    let accentColor = [120, 120, 120];
    let statusLabel = "NOT RUN — student did not test this code";
    let statusLabelUz = "ISHGA TUSHIRILMAGAN — talaba bu kodni sinab ko'rmagan";
    if (lastRun) {
      if (lastRun.status === "success") {
        // Special case: student ran the code, but the code is byte-identical
        // to the starter template — meaning they never wrote a real solution.
        // Report this as its OWN category (amber), not as a success, because
        // it misleads instructors otherwise.
        if (lastRun.starterOnly) {
          accentColor = [200, 140, 30]; // amber
          statusLabel =
            "LAST RUN: STARTER CODE ONLY — student did not write a solution";
          statusLabelUz =
            "OXIRGI ISHGA TUSHIRISH: FAQAT BOSHLANG'ICH KOD — talaba yechim yozmagan";
        } else {
          accentColor = [46, 139, 74];
          statusLabel = "LAST RUN: SUCCESS (exit 0)";
          statusLabelUz = "OXIRGI ISHGA TUSHIRISH: MUVAFFAQIYATLI (exit 0)";
        }
      } else if (lastRun.status === "compile_error") {
        accentColor = [177, 58, 58];
        statusLabel = "LAST RUN: COMPILATION ERROR";
        statusLabelUz = "OXIRGI ISHGA TUSHIRISH: KOMPILYATSIYA XATOSI";
      } else if (lastRun.status === "runtime_error") {
        accentColor = [177, 58, 58];
        statusLabel =
          "LAST RUN: RUNTIME ERROR (exit " +
          (lastRun.exitCode != null ? lastRun.exitCode : "?") +
          ")";
        statusLabelUz = "OXIRGI ISHGA TUSHIRISH: BAJARILISH XATOSI";
      } else if (lastRun.status === "unavailable") {
        accentColor = [160, 160, 160];
        statusLabel = "LAST RUN: SERVICE UNAVAILABLE";
        statusLabelUz = "OXIRGI ISHGA TUSHIRISH: XIZMAT MAVJUD EMAS";
      }
    }

    // Draw panel background
    doc.setFillColor(252, 248, 230);
    doc.rect(margin, y, contentW, blockH, "F");
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(margin, y, 4, blockH, "F");

    let innerY = y + 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text("Last Run Result (informational only)", margin + 12, innerY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 112);
    doc.text(
      "Oxirgi ishga tushirish natijasi (faqat ma'lumot uchun)",
      margin + 12,
      innerY + 10,
    );

    // "Runs used: N" on the right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 112);
    doc.text("Runs used: " + (runCount || 0), margin + contentW - 12, innerY, {
      align: "right",
    });

    innerY += 24;

    // Status row
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(statusLabel, margin + 12, innerY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(statusLabelUz, margin + 12, innerY + 10);

    innerY += 22;

    // Output body (if any)
    if (lastRun && (lastRun.stdout || lastRun.stderr || lastRun.message)) {
      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      const bodyW = contentW - 24;
      let bodyText = "";
      if (lastRun.status === "success" && lastRun.stdout) {
        bodyText = "stdout: " + lastRun.stdout;
      } else if (lastRun.status === "compile_error") {
        bodyText = "stderr: " + (lastRun.stderr || "(no details)");
      } else if (lastRun.status === "runtime_error") {
        bodyText =
          (lastRun.stdout ? "stdout: " + lastRun.stdout + "\n" : "") +
          "stderr: " +
          (lastRun.stderr || "(no details)");
      } else if (lastRun.status === "unavailable") {
        bodyText = lastRun.message || "";
      }
      const bodyLines = doc.splitTextToSize(bodyText, bodyW);
      // Cap at ~5 lines to avoid runaway
      bodyLines.slice(0, 5).forEach(function (ln, idx) {
        doc.text(ln, margin + 12, innerY + idx * 9);
      });
      if (bodyLines.length > 5) {
        doc.setFont("helvetica", "italic");
        doc.text(
          "… (output truncated — see student's submitted code for full detail)",
          margin + 12,
          innerY + 5 * 9,
        );
      }
    }

    y += blockH;
  }

  // ============================================================
  // 5.4) AI PERSONALIZED STUDENT FEEDBACK (Feature 2)
  // ------------------------------------------------------------
  // Renders only if data.aiFeedback is present (Feature 2 active).
  // One page dedicated to the trilingual recommendations so it
  // appears as a polished standalone section in the PDF.
  // ============================================================
  if (
    data.aiFeedback &&
    data.aiFeedback.en &&
    Array.isArray(data.aiFeedback.en.recommendations)
  ) {
    doc.addPage();
    y = margin;
    headerBar(
      "PERSONALIZED STUDY RECOMMENDATIONS  /  SHAXSIY O'QUV TAVSIYALARI",
      [99, 102, 241],
    );

    // Sub-intro
    addText(
      "AI-generated study recommendations based on your exam performance. These topics will help you prepare for future exams.",
      { size: 9.5, color: [0, 0, 0] },
    );
    addText(
      "Imtihon natijalaringizga asoslangan AI tomonidan yaratilgan o'quv tavsiyalari. Bu mavzular kelajakdagi imtihonlarga tayyorlanishingizga yordam beradi.",
      { size: 9, italic: true, color: [80, 80, 80] },
    );
    // Russian intro requires the Cyrillic-capable font (helvetica doesn't
    // support Cyrillic glyphs — would render as garbled mojibake).
    withCyr("normal", function () {
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const ruIntro =
        "Учебные рекомендации, сгенерированные ИИ на основе ваших результатов экзамена. Эти темы помогут подготовиться к будущим экзаменам.";
      const ruLines = doc.splitTextToSize(ruIntro, contentW);
      const lineH = 9 * 1.3;
      ruLines.forEach(function (ln) {
        checkPage(lineH + 2);
        doc.text(ln, margin, y + 9 * 0.85);
        y += lineH;
      });
      doc.setTextColor(0, 0, 0);
    });

    // If fallback mode, mention it discreetly
    if (data.aiFeedback.fallback) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(146, 64, 14);
      doc.text(
        "(Offline mode — AI service was temporarily unavailable. General study tips shown below.)",
        margin,
        y + 8,
      );
      y += 14;
      doc.setTextColor(0, 0, 0);
    }
    y += 6;

    // ---- Trilingual rendering: EN first, then UZ, then RU ----
    const languages = [
      { code: "en", label: "English", data: data.aiFeedback.en },
      { code: "uz", label: "O'zbekcha (Uzbek)", data: data.aiFeedback.uz },
      { code: "ru", label: "Русский (Russian)", data: data.aiFeedback.ru },
    ];

    // For each language: a sub-header, the headline in a colored box,
    // and the 3 recommendations as cards.
    //
    // Russian content requires the Cyrillic-capable font (NotoSans when
    // loaded). For EN/UZ we keep helvetica because it's tighter and
    // looks better. The setLangFont helper handles this switch.
    function setLangFont(langCode, weight) {
      if (langCode === "ru" && hasCyrFont) {
        // NotoSans only has "normal" and "bold" variants; italic falls
        // back to normal so we don't lose Cyrillic glyphs.
        const w = weight === "italic" ? "normal" : weight || "normal";
        doc.setFont("NotoSans", w);
      } else {
        doc.setFont("helvetica", weight || "normal");
      }
    }

    for (const lang of languages) {
      if (!lang.data) continue;
      const langData = lang.data;
      const recs = Array.isArray(langData.recommendations)
        ? langData.recommendations
        : [];

      // Estimate height for page-break decision (1 header + headline +
      // up to 4 recommendation cards). Pessimistic ~30 + 40 + 60 per rec.
      const estimatedH = 30 + 40 + recs.length * 60;
      checkPage(Math.min(estimatedH, 200));

      // Language sub-header (small colored pill).
      // Compute pill width using the correct font so Cyrillic labels
      // don't get clipped.
      setLangFont(lang.code, "bold");
      doc.setFontSize(9);
      const langPillW = doc.getTextWidth(lang.label) + 18;
      doc.setFillColor(99, 102, 241);
      doc.setDrawColor(99, 102, 241);
      doc.roundedRect(margin, y, langPillW, 16, 3, 3, "FD");
      doc.setTextColor(255, 255, 255);
      doc.text(lang.label, margin + 9, y + 11);
      y += 22;
      doc.setTextColor(0, 0, 0);

      // Headline (colored left-border block)
      if (langData.headline) {
        setLangFont(lang.code, "normal");
        doc.setFontSize(10);
        const headlineLines = doc.splitTextToSize(
          stripQuestionHtml(langData.headline),
          contentW - 20,
        );
        const headlineH = Math.max(20, headlineLines.length * 12 + 10);
        checkPage(headlineH + 6);
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.4);
        doc.rect(margin, y, contentW, headlineH, "FD");
        // Thick left accent
        doc.setFillColor(99, 102, 241);
        doc.rect(margin, y, 4, headlineH, "F");

        // Re-set font after the page break that checkPage may have triggered
        setLangFont(lang.code, "normal");
        doc.setFontSize(10);
        doc.setTextColor(30, 27, 75);
        let hy = y + 8;
        for (const ln of headlineLines) {
          doc.text(ln, margin + 14, hy + 5);
          hy += 12;
        }
        y += headlineH + 10;
        doc.setTextColor(0, 0, 0);
      }

      // Recommendation cards
      for (let ri = 0; ri < recs.length; ri++) {
        const r = recs[ri];
        const topic = stripQuestionHtml(r.topic || "");
        const advice = stripQuestionHtml(r.advice || "");
        const resources = stripQuestionHtml(r.resources || "");

        // Measure with the correct language font so wrapping is accurate
        setLangFont(lang.code, "normal");
        doc.setFontSize(10);
        const adviceLines = doc.splitTextToSize(advice, contentW - 24);
        const resourceLines = resources
          ? doc.splitTextToSize(resources, contentW - 24)
          : [];
        const cardH = Math.max(
          40,
          18 + // topic row
            adviceLines.length * 12 +
            (resourceLines.length ? 8 + resourceLines.length * 10 : 0) +
            10,
        );
        checkPage(cardH + 6);

        // Card background
        doc.setFillColor(250, 251, 253);
        doc.setDrawColor(220, 220, 230);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, contentW, cardH, 3, 3, "FD");

        // Numbered badge on the left
        const badgeSize = 22;
        doc.setFillColor(99, 102, 241);
        doc.circle(margin + 14, y + 14, badgeSize / 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(String(ri + 1), margin + 14, y + 18, { align: "center" });

        // Topic title — use language-appropriate font
        setLangFont(lang.code, "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 27, 75);
        doc.text(topic, margin + 32, y + 13);

        // Advice text — use language-appropriate font
        setLangFont(lang.code, "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(50, 50, 50);
        let ty = y + 24;
        for (const ln of adviceLines) {
          doc.text(ln, margin + 32, ty);
          ty += 12;
        }

        // Resources (if any) — dashed top border + label
        if (resourceLines.length > 0) {
          ty += 4;
          // Dashed separator
          doc.setDrawColor(200, 200, 210);
          doc.setLineWidth(0.3);
          doc.setLineDashPattern([1, 1], 0);
          doc.line(margin + 32, ty, margin + contentW - 12, ty);
          doc.setLineDashPattern([], 0);
          ty += 8;

          // Resource label is in the local language — use that lang's font
          setLangFont(lang.code, "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(99, 102, 241);
          const resourceLabel =
            lang.code === "uz"
              ? "Resurslar:"
              : lang.code === "ru"
                ? "Ресурсы:"
                : "Resources:";
          doc.text(resourceLabel, margin + 32, ty);
          const labelW = doc.getTextWidth(resourceLabel) + 4;

          setLangFont(lang.code, "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(100, 100, 110);
          // First line goes next to the label, the rest wrap below
          if (resourceLines.length > 0) {
            doc.text(resourceLines[0], margin + 32 + labelW, ty);
            ty += 10;
            for (let rli = 1; rli < resourceLines.length; rli++) {
              doc.text(resourceLines[rli], margin + 32, ty);
              ty += 10;
            }
          }
        }

        y += cardH + 6;
        doc.setTextColor(0, 0, 0);
      }

      y += 10; // gap between language blocks
    }
  }

  // ============================================================
  // 5.5) INSTRUCTOR GRADING SECTION (editable AcroForm fields)
  // ============================================================
  // Always give this section its own page to avoid overflow mishaps
  doc.addPage();
  y = margin;
  headerBar(
    "INSTRUCTOR GRADING SECTION  /  O'QITUVCHI BAHOLASH HUDUDI",
    [45, 122, 58],
  );

  // ---------- Prominent red warning banner for students ----------
  // Banner is now trilingual (EN / UZ / RU). We expand the height so
  // each language gets its own block.
  const warnH = 130;
  // Dark red solid background, thick white border
  doc.setFillColor(179, 38, 30);
  doc.rect(margin, y, contentW, warnH, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(2);
  doc.rect(margin + 3, y + 3, contentW - 6, warnH - 6, "S");

  // Circular "!" icon (white circle with red !)
  const cx = margin + 28;
  const cy = y + warnH / 2;
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(179, 38, 30);
  doc.text("!", cx, cy + 8, { align: "center" });

  // Warning text (right of circle)
  const tx = margin + 56;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("FOR INSTRUCTOR USE ONLY  /  FAQAT O'QITUVCHI UCHUN", tx, y + 16);
  // Russian header line uses Cyrillic font
  withCyr("bold", function () {
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("ТОЛЬКО ДЛЯ ПРЕПОДАВАТЕЛЯ", tx, y + 30);
  });

  // English line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "Students MUST NOT edit this section. Any student edits here will result in a total grade",
    tx,
    y + 50,
  );
  doc.text("of ZERO (0 points) for the entire exam.", tx, y + 62);

  // Uzbek line (italic)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text(
    "Talabalar bu qismni tahrirlamasligi SHART. Bu qismga talaba tomonidan kiritilgan har qanday",
    tx,
    y + 80,
  );
  doc.text(
    "o'zgarish butun imtihon uchun NOL (0 ball) bilan natijalanadi.",
    tx,
    y + 92,
  );

  // Russian line (Cyrillic font)
  withCyr("normal", function () {
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(
      "Студенты НЕ должны редактировать этот раздел. Любые правки студента здесь приведут",
      tx,
      y + 110,
    );
    doc.text("к итоговой оценке НОЛЬ (0 баллов) за весь экзамен.", tx, y + 122);
  });

  doc.setTextColor(0, 0, 0);
  y += warnH + 14;

  // Note about editability
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "Instructor: open this PDF in Preview (Mac) or Adobe Reader and type directly into the boxes below.",
    margin,
    y + 10,
  );
  doc.text("Save the PDF afterwards to preserve your grading.", margin, y + 22);
  y += 38;

  // Helper to create a labeled text field
  function addFormField(
    label,
    labelUz,
    x,
    yTop,
    w,
    h,
    fieldName,
    defaultVal,
    multiline,
  ) {
    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 95);
    doc.text(label, x, yTop + 10);
    if (labelUz) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(labelUz, x, yTop + 22);
    }
    // Field box (drawn visually so it looks nice even without Acro support)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(45, 122, 58);
    doc.setLineWidth(1);
    const boxY = yTop + (labelUz ? 28 : 18);
    doc.rect(x, boxY, w, h, "FD");

    // Actual interactive AcroForm field
    try {
      const tf = new window.jspdf.AcroFormTextField();
      tf.Rect = [x, boxY, w, h];
      tf.fieldName = fieldName;
      tf.fontSize = multiline ? 9 : 11;
      tf.value = defaultVal || "";
      if (multiline) tf.multiline = true;
      tf.maxFontSize = 14;
      doc.addField(tf);
    } catch (e) {
      // If AcroForm API is unavailable for any reason, the visible box still shows
      console.warn("AcroForm field creation failed:", e);
    }
    return boxY + h;
  }

  // Layout (dynamic — Round 2 follow-up, May 23):
  //   Rows of coding-problem score boxes in a 2-column grid, one box
  //   per problem. The number of boxes and the per-box max-points
  //   come from the exam config (codingCountForPdf,
  //   codingArrForPdf[i].maxPoints) — NOT from the historical
  //   hardcoded 4 problems at (10, 15, 15, 20).
  //
  //   N=1  → 1 box (single in left column)
  //   N=2  → 1 row, 2 boxes
  //   N=3  → 2 rows (left+right, then left only)
  //   N=4  → 2 rows of 2 (historical default)
  //   N=5+ → continues 2-up until exhausted
  //
  //   Followed by:
  //     Row: Comments (wide multiline field)
  //     Row: MC (auto, read-only) | Total coding (/codingMaxTotal) | Final grade (/totalMax)
  //     Row: Graded by | Date
  doc.setTextColor(0, 0, 0);

  // Coding-box geometry
  const halfFormW = (contentW - 14) / 2; // 2 columns with 14pt gap
  const colLeftX = margin;
  const colRightX = margin + halfFormW + 14;
  const smallH = 36;

  // Initialize bottomY at the current y in case codingCountForPdf is
  // zero (pure-MC exam) — without this, bottomY would be undefined
  // when we reference it below.
  let bottomY = y;

  // Walk problems in pairs. The outer loop covers each ROW; the inner
  // logic handles 1 or 2 boxes per row depending on whether there's
  // a right-side partner.
  for (let i = 0; i < codingCountForPdf; i += 2) {
    const leftIdx = i;
    const rightIdx = i + 1;

    // Left box — always exists when we're in the loop
    const leftMax =
      (codingArrForPdf[leftIdx] && codingArrForPdf[leftIdx].maxPoints) || 0;
    bottomY = addFormField(
      "Coding Problem " + (leftIdx + 1) + " (out of " + leftMax + ")",
      leftIdx + 1 + "-Kodlash masalasi (" + leftMax + " dan)",
      colLeftX,
      y,
      halfFormW,
      smallH,
      "coding" + (leftIdx + 1) + "_score",
      "",
      false,
    );

    // Right box — only if there's a partner. (Odd N: last row has
    // only the left box; the right side stays empty by design.)
    if (rightIdx < codingCountForPdf) {
      const rightMax =
        (codingArrForPdf[rightIdx] && codingArrForPdf[rightIdx].maxPoints) || 0;
      addFormField(
        "Coding Problem " + (rightIdx + 1) + " (out of " + rightMax + ")",
        rightIdx + 1 + "-Kodlash masalasi (" + rightMax + " dan)",
        colRightX,
        y,
        halfFormW,
        smallH,
        "coding" + (rightIdx + 1) + "_score",
        "",
        false,
      );
    }

    // Advance y after the row. Use 12 between rows, 14 after the
    // last row (slightly larger gap before the Comments block,
    // matching the historical spacing).
    const isLastRow = i + 2 >= codingCountForPdf;
    y = bottomY + (isLastRow ? 14 : 12);
  }

  // Row 2: Comments (wide)
  const commentsH = 80;
  bottomY = addFormField(
    "Comments / Feedback",
    "Izohlar / Mulohaza",
    margin,
    y,
    contentW,
    commentsH,
    "comments",
    "",
    true,
  );
  y = bottomY + 14;

  // Row 3: Summary row
  // Left — MC score (auto-filled, read-only shown as text with box)
  const col1X = margin;
  const col2X = margin + contentW / 2 + 8;
  const halfColW = contentW / 2 - 8;
  const summary3W = (contentW - 20) / 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text("MC Test Points (auto-filled)", margin, y + 10);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Test ballari (avto)", margin, y + 22);

  doc.setFillColor(240, 240, 240);
  doc.setDrawColor(180, 180, 180);
  doc.rect(margin, y + 28, summary3W, smallH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text(
    String(data.mcScore) + " / " + mcMaxForPdf,
    margin + 10,
    y + 28 + smallH / 2 + 5,
  );

  // Middle — Total coding (editable, /codingMaxTotal)
  addFormField(
    "Total coding score (out of " + codingMaxTotalForPdf + ")",
    "Jami kodlash ballari (" + codingMaxTotalForPdf + " dan)",
    margin + summary3W + 10,
    y,
    summary3W,
    smallH,
    "total_coding",
    "",
    false,
  );

  // Right — Final grade (editable, /totalMax)
  addFormField(
    "FINAL GRADE (out of " + totalMaxForPdf + ")",
    "YAKUNIY BAHO (" + totalMaxForPdf + " dan)",
    margin + 2 * summary3W + 20,
    y,
    summary3W,
    smallH,
    "final_grade",
    "",
    false,
  );

  y += smallH + 42;

  // Row 4: Graded by + Date
  addFormField(
    "Graded by",
    "Baholagan",
    col1X,
    y,
    halfColW,
    smallH,
    "graded_by",
    "",
    false,
  );
  addFormField(
    "Date",
    "Sana",
    col2X,
    y,
    halfColW,
    smallH,
    "graded_date",
    "",
    false,
  );
  y += smallH + 42;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // ============================================================
  // 6) FOOTER + PAGE NUMBERS
  // ============================================================
  y = Math.max(y, pageH - margin - 40);
  checkPage(30);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 12;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This PDF is an official submission report. Upload it via the Google Form provided by your instructor.",
    pageW / 2,
    y,
    { align: "center" },
  );
  y += 10;
  doc.text(
    "Bu PDF rasmiy topshiruv hisoboti. Uni o'qituvchi bergan Google Forma orqali yuklang.",
    pageW / 2,
    y,
    { align: "center" },
  );

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Page " + i + " of " + pages, pageW - margin, pageH - 16, {
      align: "right",
    });
  }

  // ============================================================
  // 7) FINALIZE — return Blob + deferred save, do NOT auto-download
  // ============================================================
  function sanitize(s) {
    return (s || "").replace(/[^a-zA-Z0-9]/g, "");
  }
  const fileName =
    sanitize(data.info.group) +
    "_" +
    sanitize(data.info.id) +
    "_" +
    sanitize(data.info.firstName) +
    "_" +
    sanitize(data.info.lastName) +
    ".pdf";

  const blob = doc.output("blob");
  const save = function () {
    // Triggers browser download using the same blob, no regeneration
    try {
      doc.save(fileName);
    } catch (_) {
      // Fallback: synthesize an <a> click on a blob URL if doc.save fails
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);
    }
  };
  return { blob, save, fileName };
}

// Expose. The caller decides if/when to trigger download.
window.generatePDFReport = generatePDFReport;
window.downloadPDF = function () {
  // Used by the "Re-download PDF" buttons. Reuses the last built result
  // if available; otherwise rebuilds (async).
  if (window._pdfResult && typeof window._pdfResult.save === "function") {
    window._pdfResult.save();
    return;
  }
  // Async build path
  Promise.resolve(generatePDFReport())
    .then(function (r) {
      if (r) {
        window._pdfResult = r;
        r.save();
      }
    })
    .catch(function (err) {
      console.error("PDF rebuild failed:", err);
    });
};
