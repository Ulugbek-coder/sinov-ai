// =============================================================
// AI Webcam Proctoring — Client-Side Module
// -------------------------------------------------------------
// Architecture:
//   - Two-layer detection:
//       Layer 1: MediaPipe Face Detection (in-browser, free, fast)
//                Runs ~every 500ms on the live video feed.
//                Detects: no_face, multiple_faces, face_turned_away.
//       Layer 2: Gemini Vision (escalation only, ~5-20 calls per exam)
//                Called via /api/proctor-analyze when Layer 1 flags.
//                Asks "what's in this scene?" → phone? second person? etc.
//   - Scheduled captures every 300s (5 minutes) for baseline evidence.
//   - Scheduled frames are also periodically analyzed by Gemini (every 2nd
//     scheduled frame, i.e. roughly every 10 minutes) so that phones,
//     notebooks, and other off-MediaPipe-radar items get detected even
//     when the student's face looks normal.
//   - All frames stored in Firebase Storage under proctoring/{submissionId}/.
//   - All events written to Firestore /proctoring_events collection.
//   - Final risk score (0-100) computed at submit time, attached to
//     the submission record by app.js → uploadSubmission().
//
// Public API (exposed on window.Proctoring):
//   showConsentModal() -> Promise<boolean>     // true if granted
//   start({ sessionId, group, studentId })     // call when timer starts
//   stop()                                     // call at submit
//   getRiskSummary() -> { score, events, ... } // for app.js → upload
//
// Failure modes (all degrade gracefully):
//   - getUserMedia denied → showConsentModal resolves false; caller blocks exam
//   - MediaPipe CDN fails → falls back to scheduled-frames-only mode
//   - Gemini /api/proctor-analyze fails → MediaPipe event still counts
//   - Storage upload fails → 3-retry exponential backoff, then queues in
//                            memory; tries flush on next successful upload
//   - Webcam tracks die mid-exam → "camera_lost" event recorded (40 pts)
// =============================================================

(function () {
  "use strict";

  // -----------------------------------------------------------------
  // CONFIGURATION
  // -----------------------------------------------------------------
  const CONFIG = {
    // Frame capture
    SCHEDULED_INTERVAL_MS: 300 * 1000, // every 5 minutes (300s)
    SCHEDULED_GEMINI_CHECK_EVERY_N: 2, // run Gemini on every 2nd scheduled frame
    // so phones/notes are caught even without
    // MediaPipe trigger. 1 out of 2 scheduled
    // frames = ~10 minutes between proactive
    // Gemini checks → ~10 calls per 100min exam
    FRAME_WIDTH: 480,
    FRAME_HEIGHT: 360,
    FRAME_JPEG_QUALITY: 0.72,

    // MediaPipe analysis
    ANALYSIS_INTERVAL_MS: 500, // analyze 2x per second
    NO_FACE_THRESHOLD_MS: 5000, // 5s of no face -> event
    MULTI_FACE_THRESHOLD_MS: 2000, // 2s of >1 face -> event
    TURNED_AWAY_THRESHOLD_MS: 4000, // 4s of turned-away -> event (was 5s; tighter)
    EVENT_COOLDOWN_MS: 30000, // 30s — suppress duplicate events.
    // Bumped from 15s because each event triggers
    // a Gemini call; 15s allowed up to 12 calls/min
    // from face anomalies alone, which combined with
    // hand-trigger calls easily blew the free-tier
    // RPM cap. At 30s a single anomaly type can
    // contribute at most 2 calls/min.

    // Hand detection (Option C: real-time phone/notes detection via
    // MediaPipe HandLandmarker). When a hand stays in frame for >1.5s,
    // we trigger an immediate Gemini call to identify what's being held.
    // Gemini is the validation step — natural gestures (scratching head,
    // leaning chin on hand) return no flags and the event is silently
    // dropped. Cooldown prevents API spam from frequent gestures.
    HAND_DETECTION_EVERY_N_TICKS: 2, // run hand check every 2nd face-tick (i.e. 1Hz)
    HAND_VISIBLE_THRESHOLD_MS: 1500, // 1.5s sustained → trigger
    HAND_TRIGGER_COOLDOWN_MS: 30000, // 30s between hand-triggered Gemini calls
    HAND_DETECTION_CONFIDENCE: 0.5,

    // On-screen flash warning (matches the look/feel of the existing
    // "Right-click disabled" warnings injected by app.js). Each warning
    // is shown for 4.5 seconds.
    FLASH_DURATION_MS: 4500,

    // Risk scoring weights
    RISK_WEIGHTS: {
      no_face: 5,
      multiple_faces: 20,
      face_turned_away: 3,
      phone_visible: 25,
      second_person: 30,
      notes_visible: 15,
      second_screen: 18,
      camera_lost: 40,
    },
    RISK_MAX: 100,

    // Risk thresholds (for admin display — also used to label events)
    RISK_BANDS: {
      clean: 15, // 0–15: Clean
      minor: 40, // 16–40: Minor flags
      significant: 70, // 41–70: Significant flags
      critical: 100, // 71–100: Critical
    },

    // Storage / network
    UPLOAD_MAX_ATTEMPTS: 3,
    UPLOAD_BACKOFF_BASE_MS: 1500,
  };

  // MediaPipe Face Detection CDN URLs (Google's official short-range model)
  // Using @mediapipe/tasks-vision via the ESM bundle (.mjs). The .js path
  // serves UMD which cannot be loaded with dynamic import().
  const MEDIAPIPE_VISION_BUNDLE_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
  const MEDIAPIPE_WASM_BASE_URL =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
  const FACE_DETECTOR_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
  // Hand Landmarker model (Option C — real-time phone detection trigger)
  const HAND_LANDMARKER_MODEL_URL =
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

  // -----------------------------------------------------------------
  // INTERNAL STATE
  // -----------------------------------------------------------------
  const state = {
    sessionId: null, // unique per exam attempt
    group: null,
    studentId: null,

    videoStream: null, // MediaStream
    videoEl: null, // <video> element (pinned bottom-right)
    overlayEl: null, // wrapper for video + label
    canvasEl: null, // hidden canvas for frame capture

    mediaPipeReady: false,
    mediaPipeFailed: false, // set to true if init failed; surfaced in risk summary
    faceDetector: null,
    handDetector: null, // MediaPipe HandLandmarker (Option C)
    handDetectorReady: false,
    analysisInterval: null,
    scheduledInterval: null,

    // Per-anomaly continuous-time tracking
    noFaceSince: null,
    multiFaceSince: null,
    turnedAwaySince: null,

    // Hand-detection tracking (Option C)
    handVisibleSince: null, // ms timestamp when hand first appeared, null when no hand
    lastHandTriggerAt: 0, // last Gemini hand-check timestamp (for cooldown)
    analysisTickCount: 0, // counter to gate hand checks to 1Hz

    // Cooldowns (per type, last event timestamp)
    lastEventAt: {
      no_face: 0,
      multiple_faces: 0,
      face_turned_away: 0,
      phone_visible: 0,
      second_person: 0,
      notes_visible: 0,
      second_screen: 0,
      camera_lost: 0,
    },

    // All events for this session
    events: [], // { type, t, evidenceUrl?, geminiNote? }

    // Frames captured (scheduled, for evidence)
    scheduledFrameCount: 0,
    // Number of times the scheduled-capture interval has fired
    // (regardless of upload success). Used to gate the proactive
    // Gemini analysis (every Nth tick).
    scheduledTickCount: 0,

    // Pending uploads (in-memory queue if Storage temporarily fails)
    pendingUploads: [],

    // Whether the exam has fully ended (stop() called)
    stopped: false,

    // Whether anything is currently active
    started: false,
  };

  // -----------------------------------------------------------------
  // UTILITIES
  // -----------------------------------------------------------------
  function nowMs() {
    return Date.now();
  }

  function uuid() {
    // RFC 4122 v4-ish; not cryptographically perfect but unique enough
    // for session ids that include studentId+group+timestamp.
    return (
      "p_" +
      Math.random().toString(36).slice(2, 10) +
      "_" +
      Date.now().toString(36)
    );
  }

  function getLang() {
    if (typeof window.getExamLang === "function") return window.getExamLang();
    try {
      const v = localStorage.getItem("examLang");
      return v === "ru" ? "ru" : "uz";
    } catch (_) {
      return "uz";
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Avoid double-loading
      if (document.querySelector('script[data-src="' + src + '"]')) {
        return resolve();
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.dataset.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load: " + src));
      document.head.appendChild(s);
    });
  }

  // -----------------------------------------------------------------
  // CONSENT MODAL
  // -----------------------------------------------------------------
  // Shown on the welcome page, AFTER form validation, BEFORE we navigate
  // to exam.html. Returns a Promise<boolean>: true = granted, false = denied.
  //
  // Implementation note: we don't use the existing showModal() because:
  //   (a) That modal lives on every page but the consent flow needs custom
  //       trilingual block layout (3 paragraphs stacked, not a single line).
  //   (b) We want the camera permission prompt to fire from a user-gesture
  //       click (browser security requirement). Easiest path = own modal.
  //
  // CSS is injected once on first call so this file is fully self-contained.
  function injectConsentStyles() {
    if (document.getElementById("proctor-consent-styles")) return;
    // Modern re-skin (Round 3 design polish, May 2026):
    // Indigo + ember palette, Bricolage Grotesque title, top accent strip
    // matching the rest of the platform's modal language.
    const css =
      "" +
      "#proctor-consent-overlay{position:fixed;inset:0;z-index:10000;" +
      "background:rgba(15,23,42,.55);display:flex;align-items:center;" +
      "justify-content:center;padding:20px;backdrop-filter:blur(4px);" +
      "-webkit-backdrop-filter:blur(4px)}" +
      "#proctor-consent-box{background:#FFFFFF;border-radius:16px;" +
      "max-width:560px;width:100%;box-shadow:0 20px 50px -12px rgba(15,23,42,.25);" +
      "padding:30px 32px 26px;font-family:Inter,system-ui,sans-serif;color:#0F172A;" +
      "position:relative;overflow:hidden}" +
      // Top accent strip (indigo→ember gradient) — same as appModal + grading drawer
      "#proctor-consent-box::before{content:'';position:absolute;top:0;left:0;right:0;" +
      "height:3px;background:linear-gradient(90deg,#2563EB 0%,#F97316 100%);z-index:1}" +
      // Camera icon — indigo gradient, rounded square (matches Sinov icon pattern)
      "#proctor-consent-box .pc-icon{width:56px;height:56px;border-radius:14px;" +
      "background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%);color:#fff;" +
      "display:flex;align-items:center;justify-content:center;font-size:28px;" +
      "margin:6px auto 16px;box-shadow:0 6px 16px -4px rgba(37,99,235,.4)}" +
      // Title — Bricolage display font, dark slate
      "#proctor-consent-box h3{margin:0 0 4px;text-align:center;font-size:22px;" +
      "font-weight:700;color:#0F172A;letter-spacing:-.01em;" +
      "font-family:'Bricolage Grotesque','Inter',system-ui,sans-serif}" +
      // Sub-language pill
      "#proctor-consent-box .pc-sub{text-align:center;font-size:11px;" +
      "color:#475569;margin-bottom:20px;letter-spacing:.1em;font-weight:600;" +
      "text-transform:uppercase}" +
      // Message blocks — indigo accent for EN, ember for UZ, amber for RU
      "#proctor-consent-box .pc-msg{font-size:14px;line-height:1.55;" +
      "margin-bottom:10px;padding:14px 16px;border-radius:10px;" +
      "background:#EFF6FF;border-left:3px solid #2563EB;color:#1F2A3D}" +
      "#proctor-consent-box .pc-msg.uz{background:#FFF7ED;border-left-color:#F97316}" +
      "#proctor-consent-box .pc-msg.ru{background:#FEF3C7;border-left-color:#D97706}" +
      "#proctor-consent-box .pc-msg b{font-weight:700;color:#0F172A}" +
      // Footnote
      "#proctor-consent-box .pc-footnote{font-size:12px;color:#475569;" +
      "text-align:center;margin:16px 4px 18px;line-height:1.5;font-style:italic}" +
      // Buttons — Sinov style with gradients + shadows
      "#proctor-consent-box .pc-buttons{display:flex;gap:10px;" +
      "justify-content:center;flex-wrap:wrap}" +
      "#proctor-consent-box .pc-btn{flex:1;min-width:160px;padding:12px 18px;" +
      "border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;" +
      "border:none;transition:background .15s,transform .08s,box-shadow .18s;" +
      "font-family:Inter,system-ui,sans-serif}" +
      "#proctor-consent-box .pc-btn.primary{" +
      "background:linear-gradient(135deg,#2563EB 0%,#1D4ED8 100%);color:#fff;" +
      "box-shadow:0 4px 12px -2px rgba(37,99,235,.4)}" +
      "#proctor-consent-box .pc-btn.primary:hover{background:#1D4ED8;" +
      "transform:translateY(-1px);box-shadow:0 6px 16px -2px rgba(37,99,235,.5)}" +
      "#proctor-consent-box .pc-btn.secondary{background:#FFFFFF;color:#0F172A;" +
      "border:1.5px solid #CBD5E1}" +
      "#proctor-consent-box .pc-btn.secondary:hover{background:#F8FAFC;" +
      "border-color:#475569}" +
      "#proctor-consent-box .pc-btn:disabled{opacity:.5;cursor:not-allowed}" +
      "";
    const styleEl = document.createElement("style");
    styleEl.id = "proctor-consent-styles";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  function showConsentModal() {
    injectConsentStyles();
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.id = "proctor-consent-overlay";
      overlay.innerHTML =
        '<div id="proctor-consent-box" role="dialog" aria-modal="true">' +
        '<div class="pc-icon" aria-hidden="true">🎥</div>' +
        "<h3>Live Proctoring Required</h3>" +
        '<div class="pc-sub">EN · UZ · RU</div>' +
        '<div class="pc-msg">' +
        "<b>This is a live online exam and you will be proctored during the exam all the time.</b> " +
        "Your camera will capture brief evidence frames during the exam. " +
        "Only your instructor can view them. By clicking Allow, you grant " +
        "permission to use your webcam for proctoring." +
        "</div>" +
        '<div class="pc-msg uz">' +
        "<b>Bu jonli onlayn imtihon va imtihon davomida siz doimiy ravishda kuzatib borilasiz.</b> " +
        "Veb-kameraingiz imtihon davomida qisqa dalil tasvirlari oladi. " +
        "Faqat o'qituvchingiz ularni ko'ra oladi. " +
        "<b>Ruxsat berish</b> tugmasini bosish orqali siz veb-kamerangizdan " +
        "imtihon kuzatuvi uchun foydalanishga rozilik bildirasiz." +
        "</div>" +
        '<div class="pc-msg ru">' +
        "<b>Это живой онлайн-экзамен, и вы будете находиться под наблюдением на протяжении всего экзамена.</b> " +
        "Ваша веб-камера будет делать короткие снимки в качестве доказательств во время экзамена. " +
        "Только ваш преподаватель сможет их просмотреть. Нажимая <b>Разрешить</b>, " +
        "вы даёте согласие на использование вашей веб-камеры для прокторинга." +
        "</div>" +
        '<div class="pc-footnote">' +
        "Webcam access is required to start the exam. · " +
        "Imtihonni boshlash uchun veb-kamera kerak. · " +
        "Для начала экзамена требуется доступ к веб-камере." +
        "</div>" +
        '<div class="pc-buttons">' +
        '<button class="pc-btn secondary" id="pc-cancel" type="button">' +
        "Cancel / Bekor / Отмена</button>" +
        '<button class="pc-btn primary" id="pc-allow" type="button">' +
        "Allow camera &amp; continue →</button>" +
        "</div>" +
        "</div>";
      document.body.appendChild(overlay);

      const cleanup = (granted) => {
        try {
          document.body.removeChild(overlay);
        } catch (_) {}
        resolve(granted);
      };

      document.getElementById("pc-cancel").addEventListener("click", () => {
        cleanup(false);
      });

      document
        .getElementById("pc-allow")
        .addEventListener("click", async () => {
          const allowBtn = document.getElementById("pc-allow");
          const cancelBtn = document.getElementById("pc-cancel");
          allowBtn.disabled = true;
          cancelBtn.disabled = true;
          allowBtn.textContent = "Requesting camera…";
          try {
            // Probe permission. We immediately STOP the tracks — the real
            // stream is opened later by start() on the exam page. The probe
            // exists purely to confirm permission was granted (so the
            // student doesn't reach exam.html and discover their webcam
            // is blocked).
            const probe = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false,
            });
            probe.getTracks().forEach((t) => t.stop());
            cleanup(true);
          } catch (err) {
            // Permission denied or hardware unavailable
            allowBtn.disabled = false;
            cancelBtn.disabled = false;
            allowBtn.textContent = "Try again →";
            const errBox = document.querySelector("#proctor-consent-box");
            // Inject an inline error notice once
            if (errBox && !document.getElementById("pc-err")) {
              const errDiv = document.createElement("div");
              errDiv.id = "pc-err";
              errDiv.style.cssText =
                "background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;" +
                "padding:10px 12px;border-radius:8px;font-size:13px;" +
                "margin:10px 0;text-align:center;";
              const msg = (err && err.message) || String(err);
              errDiv.innerHTML =
                "<b>Camera access denied or unavailable.</b><br>" +
                "Please allow webcam access in your browser settings, then click " +
                "<b>Try again</b>. If your camera is in use by another app, close it first." +
                "<br><span style='opacity:.7;font-size:11px'>Details: " +
                (msg.length > 100 ? msg.slice(0, 100) + "…" : msg) +
                "</span>";
              const footnote = errBox.querySelector(".pc-footnote");
              errBox.insertBefore(errDiv, footnote);
            }
          }
        });
    });
  }

  // -----------------------------------------------------------------
  // WEBCAM PREVIEW (pinned to bottom-right of the exam page)
  // -----------------------------------------------------------------
  function injectPreviewStyles() {
    if (document.getElementById("proctor-preview-styles")) return;
    const css =
      "" +
      "#proctor-preview{position:fixed;bottom:18px;right:18px;width:180px;" +
      "z-index:900;background:#0F172A;border-radius:10px;overflow:hidden;" +
      "box-shadow:0 10px 30px rgba(0,0,0,.35);" +
      "border:2px solid rgba(239,68,68,.85);font-family:Inter,system-ui,sans-serif}" +
      "#proctor-preview video{display:block;width:100%;height:auto;" +
      "background:#000;transform:scaleX(-1)}" + // mirror for natural feel
      "#proctor-preview .pp-label{display:flex;align-items:center;gap:6px;" +
      "padding:6px 9px;font-size:11px;color:#FECACA;background:#1F2937;" +
      "font-weight:600;letter-spacing:.04em}" +
      "#proctor-preview .pp-dot{width:8px;height:8px;border-radius:50%;" +
      "background:#EF4444;animation:pp-blink 1.4s infinite}" +
      "@keyframes pp-blink{0%,100%{opacity:1}50%{opacity:.35}}" +
      "#proctor-preview .pp-status{font-size:10px;color:#9CA3AF;" +
      "padding:4px 9px 6px;background:#1F2937;border-top:1px solid #374151}" +
      "#proctor-preview.warn{border-color:#F59E0B}" +
      "#proctor-preview.warn .pp-dot{background:#F59E0B}" +
      "#proctor-preview.warn .pp-label{color:#FCD34D}" +
      "#proctor-preview.error{border-color:#DC2626}" +
      "@media (max-width:700px){#proctor-preview{width:140px;bottom:10px;right:10px}}" +
      "";
    const styleEl = document.createElement("style");
    styleEl.id = "proctor-preview-styles";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  function createPreview() {
    injectPreviewStyles();
    const wrap = document.createElement("div");
    wrap.id = "proctor-preview";
    wrap.innerHTML =
      '<div class="pp-label">' +
      '<span class="pp-dot" aria-hidden="true"></span>' +
      "PROCTORING</div>" +
      '<video id="proctor-video" autoplay playsinline muted></video>' +
      '<div class="pp-status" id="proctor-status">Initializing…</div>';
    document.body.appendChild(wrap);
    state.overlayEl = wrap;
    state.videoEl = wrap.querySelector("#proctor-video");

    // Hidden canvas for frame extraction (offscreen, not in DOM tree)
    const c = document.createElement("canvas");
    c.width = CONFIG.FRAME_WIDTH;
    c.height = CONFIG.FRAME_HEIGHT;
    state.canvasEl = c;
  }

  function setStatus(text, mode) {
    if (!state.overlayEl) return;
    const status = state.overlayEl.querySelector("#proctor-status");
    if (status) status.textContent = text;
    state.overlayEl.classList.remove("warn", "error");
    if (mode === "warn") state.overlayEl.classList.add("warn");
    if (mode === "error") state.overlayEl.classList.add("error");
  }

  // -----------------------------------------------------------------
  // MEDIAPIPE — FACE DETECTOR + HAND LANDMARKER
  // -----------------------------------------------------------------
  // Loads the tasks-vision bundle from CDN, then creates BOTH:
  //   - FaceDetector  → continuous face anomaly tracking
  //   - HandLandmarker → real-time phone/notes detection trigger (Option C)
  // The HandLandmarker is best-effort: if it fails to load, face detection
  // still runs and we fall back to the scheduled-Gemini check for phones.
  // If the entire MediaPipe load fails, we degrade to scheduled-frames-only.
  async function initMediaPipe() {
    try {
      // Load as ES module — tasks-vision is shipped as ESM
      const mod = await import(MEDIAPIPE_VISION_BUNDLE_URL);
      const { FilesetResolver, FaceDetector, HandLandmarker } = mod;
      const vision = await FilesetResolver.forVisionTasks(
        MEDIAPIPE_WASM_BASE_URL,
      );

      // Face detector (primary — required)
      state.faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_DETECTOR_MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      });
      state.mediaPipeReady = true;
      console.log("[Proctoring] MediaPipe face detector ready");

      // Hand landmarker (best-effort — for real-time phone/notes detection).
      // We load this AFTER the face detector is ready so a hand-landmarker
      // failure doesn't disable face detection. Both share the same vision
      // fileset so the WASM is already in memory.
      try {
        state.handDetector = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_LANDMARKER_MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2, // detect up to 2 hands (a phone is usually held with one)
          minHandDetectionConfidence: CONFIG.HAND_DETECTION_CONFIDENCE,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        state.handDetectorReady = true;
        console.log("[Proctoring] MediaPipe hand landmarker ready");
      } catch (handErr) {
        // Non-fatal: face anomaly detection still works; scheduled-Gemini
        // check is still the fallback path for phones/notes.
        console.warn(
          "[Proctoring] Hand landmarker init failed (face detection " +
            "still active; using scheduled-Gemini fallback for phone " +
            "detection):",
          handErr,
        );
        state.handDetectorReady = false;
      }
      return true;
    } catch (err) {
      console.warn(
        "[Proctoring] MediaPipe init failed, falling back to scheduled-frames-only:",
        err,
      );
      state.mediaPipeReady = false;
      state.mediaPipeFailed = true;
      return false;
    }
  }

  // -----------------------------------------------------------------
  // FRAME CAPTURE
  // -----------------------------------------------------------------
  // Captures the current video frame to a JPEG Blob.
  // Returns null if video isn't ready (e.g., still buffering).
  function captureFrameBlob() {
    return new Promise((resolve) => {
      const v = state.videoEl;
      const c = state.canvasEl;
      if (!v || !c || v.readyState < 2) {
        resolve(null);
        return;
      }
      const ctx = c.getContext("2d");
      try {
        // Note: we draw the video as-is (NOT mirrored). The CSS mirroring is
        // purely a viewing convenience for the student. The frame we ship
        // to admin/Gemini should be the raw orientation.
        ctx.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(
          (blob) => resolve(blob),
          "image/jpeg",
          CONFIG.FRAME_JPEG_QUALITY,
        );
      } catch (err) {
        console.warn("[Proctoring] captureFrameBlob failed:", err);
        resolve(null);
      }
    });
  }

  // -----------------------------------------------------------------
  // UPLOAD A FRAME TO STORAGE
  // -----------------------------------------------------------------
  // Path: proctoring/{sessionId}/{kind}/{timestamp}.jpg
  //   kind ∈ "scheduled" | "anomaly"
  // Returns the storage path on success, null on failure.
  // Retries up to 3 times with exponential backoff.
  async function uploadFrame(blob, kind) {
    if (!blob || !state.sessionId) return null;
    if (!window.fbStorage) {
      console.warn("[Proctoring] fbStorage not available, cannot upload");
      return null;
    }
    const ts = Date.now();
    const filename = ts + "_" + Math.random().toString(36).slice(2, 8) + ".jpg";
    const path = "proctoring/" + state.sessionId + "/" + kind + "/" + filename;
    const ref = window.fbStorage.ref().child(path);

    for (let attempt = 1; attempt <= CONFIG.UPLOAD_MAX_ATTEMPTS; attempt++) {
      try {
        await ref.put(blob, { contentType: "image/jpeg" });
        return path;
      } catch (err) {
        console.warn(
          "[Proctoring] frame upload attempt " + attempt + " failed:",
          (err && err.message) || err,
        );
        if (attempt < CONFIG.UPLOAD_MAX_ATTEMPTS) {
          const backoff =
            CONFIG.UPLOAD_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }
    return null;
  }

  // -----------------------------------------------------------------
  // SAVE EVENT TO FIRESTORE
  // -----------------------------------------------------------------
  // Best-effort. Failure here doesn't kill the exam — we already have
  // the in-memory event log which gets attached to the submission at
  // submit time as a final backup.
  async function saveEvent(evt) {
    if (!window.fbDb || !state.sessionId) return;
    try {
      await window.fbDb.collection("proctoring_events").add({
        sessionId: state.sessionId,
        group: state.group,
        studentId: state.studentId,
        type: evt.type,
        // Use server timestamp for trustworthy ordering
        at: firebase.firestore.FieldValue.serverTimestamp(),
        // Client timestamp too — useful when ordering events that all land
        // with the same server tick
        clientAt: evt.t,
        evidencePath: evt.evidencePath || null,
        geminiNote: evt.geminiNote || null,
        geminiConfidence:
          typeof evt.geminiConfidence === "number"
            ? evt.geminiConfidence
            : null,
      });
    } catch (err) {
      console.warn(
        "[Proctoring] saveEvent failed (will retain in memory):",
        err,
      );
    }
  }

  // -----------------------------------------------------------------
  // ON-SCREEN FLASH WARNING (Issue #2)
  // -----------------------------------------------------------------
  // When MediaPipe or Gemini flags an anomaly, show a red warning
  // pop-up identical in style to the existing right-click /
  // copy-paste-disabled warnings. Reuses the #flash element if present
  // (so we match the existing visual language exactly); otherwise
  // creates its own pinned banner so this module works standalone.
  //
  // Each call cancels the previous timer, so back-to-back triggers
  // show one continuous warning that auto-hides FLASH_DURATION_MS
  // after the latest trigger.
  const ANOMALY_FLASH_MESSAGES = {
    no_face:
      "No face detected on camera! / Kamerada yuz ko'rinmayapti! / Лицо не обнаружено в кадре!",
    multiple_faces:
      "Multiple faces detected on camera! / Kamerada bir nechta yuz aniqlandi! / Обнаружено несколько лиц в кадре!",
    face_turned_away:
      "Face turned away from camera! / Yuz kameradan burilgan! / Лицо отвёрнуто от камеры!",
    phone_visible:
      "Phone detected in the frame! / Kadrda telefon aniqlandi! / Телефон обнаружен в кадре!",
    second_person:
      "Second person detected next to you! / Yoningizda boshqa odam aniqlandi! / Рядом с вами обнаружен другой человек!",
    notes_visible:
      "Paper notes detected in the frame! / Kadrda qog'oz yozuvlar aniqlandi! / В кадре обнаружены бумажные записи!",
    second_screen:
      "Second screen detected in the frame! / Kadrda ikkinchi ekran aniqlandi! / В кадре обнаружен второй экран!",
    camera_lost:
      "Camera connection lost! / Kamera ulanishi yo'qoldi! / Соединение с камерой потеряно!",
  };

  function flashProctorWarning(type) {
    const msg = ANOMALY_FLASH_MESSAGES[type];
    if (!msg) return;
    const existing = document.getElementById("flash");
    if (existing) {
      // Reuse the existing #flash element from exam.html so the visual
      // styling matches the right-click / paste-disabled warnings the
      // student already knows.
      existing.innerHTML =
        '<span class="flash-icon" aria-hidden="true">!</span>' +
        '<span class="flash-text">' +
        msg +
        "</span>";
      existing.style.display = "flex";
      clearTimeout(window._flashT);
      window._flashT = setTimeout(() => {
        existing.style.display = "none";
      }, CONFIG.FLASH_DURATION_MS);
      return;
    }
    // Fallback: create our own banner if exam.html doesn't have #flash
    // (defensive — keeps this module portable).
    injectProctorFlashStyles();
    let el = document.getElementById("proctor-flash");
    if (!el) {
      el = document.createElement("div");
      el.id = "proctor-flash";
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<span class="pf-icon" aria-hidden="true">!</span>' +
      '<span class="pf-text">' +
      msg +
      "</span>";
    el.style.display = "flex";
    clearTimeout(window._proctorFlashT);
    window._proctorFlashT = setTimeout(() => {
      el.style.display = "none";
    }, CONFIG.FLASH_DURATION_MS);
  }

  function injectProctorFlashStyles() {
    if (document.getElementById("proctor-flash-styles")) return;
    const css =
      "#proctor-flash{position:fixed;top:18px;left:50%;transform:translateX(-50%);" +
      "background:#7F1D1D;color:#fff;padding:11px 18px;border-radius:9px;" +
      "z-index:9999;font-family:Inter,system-ui,sans-serif;font-size:14px;" +
      "font-weight:600;display:none;align-items:center;gap:10px;" +
      "box-shadow:0 12px 32px rgba(127,29,29,.45);max-width:90vw}" +
      "#proctor-flash .pf-icon{width:24px;height:24px;border-radius:50%;" +
      "background:#fff;color:#7F1D1D;display:flex;align-items:center;" +
      "justify-content:center;font-weight:800}" +
      "#proctor-flash .pf-text{line-height:1.4}";
    const styleEl = document.createElement("style");
    styleEl.id = "proctor-flash-styles";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // -----------------------------------------------------------------
  // RECORD ANOMALY EVENT
  // -----------------------------------------------------------------
  // Pipeline when MediaPipe flags an anomaly:
  //   1. Cooldown check — same type within EVENT_COOLDOWN_MS is suppressed
  //   2. Capture current frame
  //   3. Upload as evidence
  //   4. Show on-screen flash warning to the student
  //   5. Escalate to Gemini Vision (the prompt is now configured to confirm
  //      rather than be conservative when MediaPipe already triggered)
  //   6. Save base event + any Gemini-derived secondary events to Firestore
  //
  // Auto-promotion: if MediaPipe flagged multiple_faces AND Gemini comes
  // back without a positive second_person but a confidence ≥ 0.5 and the
  // description references another person, we still log second_person.
  // This was the bug where the woman behind the student appeared in 4
  // MediaPipe multiple_faces frames but second_person stayed at 0.
  async function recordAnomaly(type, opts) {
    opts = opts || {};
    const t = nowMs();
    if (t - state.lastEventAt[type] < CONFIG.EVENT_COOLDOWN_MS) {
      // suppressed: same anomaly type recently fired
      return;
    }
    state.lastEventAt[type] = t;

    // 1. Capture frame (unless caller already provided one — used by
    // scheduled-Gemini path to reuse the scheduled frame)
    let blob = opts.reuseBlob || null;
    if (!blob) blob = await captureFrameBlob();

    // 2. Upload as evidence (skip if the caller has already uploaded it)
    let evidencePath = opts.reuseEvidencePath || null;
    if (!evidencePath && blob) {
      evidencePath = await uploadFrame(blob, "anomaly");
    }

    // 3. Show on-screen flash IMMEDIATELY using the trigger type — the
    //    student needs instant feedback, we don't wait for Gemini.
    flashProctorWarning(type);

    // 4. Call Gemini (best-effort) BEFORE we decide what to log.
    //    By deferring the event-logging until Gemini responds, we can:
    //      - Drop a `no_face` event if Gemini sees a phone/notes obscuring
    //        the face (the phone is the more informative label).
    //      - Drop a `multiple_faces` event if Gemini sees a toy/photo
    //        (BlazeFace false positive).
    //      - Pick ONE label when Gemini's description is ambiguous
    //        ("could be a phone OR a laptop screen").
    let geminiResult = null;
    if (blob) {
      try {
        geminiResult = await callGeminiVision(blob, type);
      } catch (err) {
        console.warn("[Proctoring] Gemini escalation failed:", err);
      }
    }

    // 5. Decide the FINAL set of events to log for this frame.
    //    The result is an array of type strings (deduplicated, prioritized).
    const finalEventTypes = decideEventLabels(type, geminiResult);

    // 6. Log each final event to memory + Firestore.
    const t2 = nowMs();
    for (let i = 0; i < finalEventTypes.length; i++) {
      const evType = finalEventTypes[i];
      // Respect cooldown per type (the trigger's cooldown was already
      // recorded in step "t - state.lastEventAt[type]" above, but
      // secondary types might fire too)
      if (
        evType !== type &&
        t2 - state.lastEventAt[evType] < CONFIG.EVENT_COOLDOWN_MS
      ) {
        continue;
      }
      state.lastEventAt[evType] = t2;
      const ev = {
        type: evType,
        t: t2,
        evidencePath,
      };
      if (geminiResult) {
        ev.geminiNote = geminiResult.description;
        ev.geminiConfidence = geminiResult.confidence;
      }
      state.events.push(ev);
      saveEvent(ev);
      // Flash for secondary events too (so student knows phone/notes
      // were ALSO detected). Skip flash for the original trigger
      // because we already flashed it in step 3.
      if (evType !== type) flashProctorWarning(evType);
    }
  }

  // -----------------------------------------------------------------
  // SMART LABELING — decideEventLabels()
  // -----------------------------------------------------------------
  // Translate a (trigger, Gemini-result) pair into the CLEANEST set of
  // event labels for the admin dashboard. Rules (applied in order):
  //
  //   Rule 1 (artifact suppression): If MediaPipe fired multiple_faces
  //     but Gemini's description identifies an artifact (toy, doll,
  //     photo, mirror, reflection) — drop the multiple_faces label.
  //     Return an empty array (no event logged) so the false positive
  //     doesn't pollute the modal.
  //
  //   Rule 2 (de-duplication): If Gemini flagged BOTH phone_visible
  //     and second_screen AND the description contains hedging words
  //     ("could be", "might be", "or"), pick whichever the description
  //     mentions FIRST. This prevents one ambiguous object from being
  //     counted twice.
  //
  //   Rule 3 (trigger upgrade): If MediaPipe fired no_face or
  //     face_turned_away AND Gemini found phone_visible / notes_visible /
  //     second_screen, the GEMINI label is more informative — return
  //     ONLY the Gemini labels (drop the original trigger).
  //
  //   Rule 4 (default): Return [trigger, ...gemini_extras] with no
  //     dropping. This is the normal case where the MediaPipe trigger
  //     IS the most accurate label (e.g. real no_face when student
  //     left the room).
  function decideEventLabels(triggerType, geminiResult) {
    // No Gemini result → just log the trigger.
    if (!geminiResult) return [triggerType];
    const flags = geminiResult.flags || {};
    const desc = (geminiResult.description || "").toLowerCase();

    // --- Rule 1: artifact suppression for multiple_faces ---
    if (triggerType === "multiple_faces") {
      const isArtifact =
        desc.indexOf("toy") >= 0 ||
        desc.indexOf("doll") >= 0 ||
        desc.indexOf("stuffed") >= 0 ||
        desc.indexOf("photo") >= 0 ||
        desc.indexOf("poster") >= 0 ||
        desc.indexOf("picture on") >= 0 ||
        desc.indexOf("reflection") >= 0 ||
        desc.indexOf("mirror") >= 0 ||
        desc.indexOf("painting") >= 0;
      // If Gemini explicitly identifies an artifact AND doesn't see a
      // real second_person, suppress the multiple_faces event entirely.
      if (isArtifact && !flags.second_person) {
        return []; // no event logged — silent false-positive drop
      }
    }

    // --- Rule 2: de-dup ambiguous phone/screen flags ---
    // Detect hedging in Gemini's description: when Gemini wrote
    // "could be a phone or a laptop screen" it set BOTH flags, but
    // there's really one object. Pick whichever appears first in
    // the description (which usually reflects Gemini's stronger guess).
    let dedupedPhone = !!flags.phone_visible;
    let dedupedScreen = !!flags.second_screen;
    if (dedupedPhone && dedupedScreen) {
      const ambiguous =
        desc.indexOf("could be") >= 0 ||
        desc.indexOf("might be") >= 0 ||
        desc.indexOf("appears to be") >= 0 ||
        (desc.indexOf("phone") >= 0 && desc.indexOf(" or ") >= 0);
      if (ambiguous) {
        const phoneIdx = desc.indexOf("phone");
        const screenIdx = Math.max(
          desc.indexOf("screen"),
          desc.indexOf("laptop"),
          desc.indexOf("monitor"),
          desc.indexOf("tablet"),
        );
        if (phoneIdx >= 0 && (screenIdx < 0 || phoneIdx < screenIdx)) {
          dedupedScreen = false; // phone wins
        } else if (screenIdx >= 0) {
          dedupedPhone = false; // screen wins
        }
      }
    }

    // --- Rule 3: trigger upgrade ---
    // For no_face / face_turned_away triggers: if Gemini sees a phone
    // / notes / screen, that's the REAL story. Don't log the original
    // trigger; log only the gemini-derived label(s).
    const isUpgradeTrigger =
      triggerType === "no_face" || triggerType === "face_turned_away";
    const hasContentFlag =
      dedupedPhone ||
      flags.notes_visible ||
      dedupedScreen ||
      flags.second_person;

    if (isUpgradeTrigger && hasContentFlag) {
      // Replace trigger with content labels
      const upgraded = [];
      if (dedupedPhone) upgraded.push("phone_visible");
      if (flags.notes_visible) upgraded.push("notes_visible");
      if (dedupedScreen) upgraded.push("second_screen");
      if (flags.second_person) upgraded.push("second_person");
      return upgraded;
    }

    // --- Rule 4: default — keep trigger and add Gemini extras ---
    const out = [triggerType];
    // multiple_faces → also log second_person (real second person)
    if (triggerType === "multiple_faces" && flags.second_person) {
      out.push("second_person");
    }
    // For multi_face WITHOUT explicit second_person flag, auto-promote
    // (same as before — this catches the "Gemini was lazy" case)
    if (
      triggerType === "multiple_faces" &&
      !flags.second_person &&
      geminiResult.confidence >= 0.5
    ) {
      const isArtifact =
        desc.indexOf("toy") >= 0 ||
        desc.indexOf("doll") >= 0 ||
        desc.indexOf("stuffed") >= 0 ||
        desc.indexOf("photo") >= 0 ||
        desc.indexOf("poster") >= 0 ||
        desc.indexOf("picture on") >= 0 ||
        desc.indexOf("reflection") >= 0 ||
        desc.indexOf("mirror") >= 0 ||
        desc.indexOf("painting") >= 0;
      if (!isArtifact) out.push("second_person");
    }
    // Any trigger → also log phone / notes / screen if Gemini saw them
    if (dedupedPhone && triggerType !== "phone_visible")
      out.push("phone_visible");
    if (flags.notes_visible && triggerType !== "notes_visible")
      out.push("notes_visible");
    if (dedupedScreen && triggerType !== "second_screen")
      out.push("second_screen");
    return out;
  }

  // -----------------------------------------------------------------
  // GEMINI RATE LIMITER (sliding window)
  // -----------------------------------------------------------------
  // Background: Google's free tier for Gemini 2.5 Flash-Lite is 15 RPM
  // and 1000 RPD per project. Earlier rounds learned the hard way that
  // hitting 429 mid-exam loses real anomaly evidence — when Gemini
  // returns 429 the frame goes unanalyzed and a real phone in that
  // frame is never flagged.
  //
  // Strategy: maintain a sliding-window log of timestamps for every
  // outgoing Gemini call. Before each new call, evict timestamps older
  // than 60s and check the remaining count. If we're at the cap, SKIP
  // (don't queue — late phone detection is useless). The 8-call cap
  // gives us comfortable headroom under the 15 RPM hard limit.
  //
  // This rate limit is applied globally across ALL Gemini paths:
  //   - face-anomaly escalation (recordAnomaly)
  //   - hand-detection trigger (checkHandTrigger)
  //   - scheduled safety-net check (captureScheduled)
  // Without a global throttle, twitchy students with frequent face
  // turns + hand gestures could fire 15-30 calls/minute combined.
  const GEMINI_RATE_LIMIT = {
    maxPerMinute: 8, // safely under the 15 RPM hard cap
    windowMs: 60 * 1000,
    timestamps: [], // sliding window
    skippedCalls: 0, // counter for diagnostics
  };

  function geminiRateAvailable() {
    const now = nowMs();
    const cutoff = now - GEMINI_RATE_LIMIT.windowMs;
    // Evict timestamps older than 60s
    while (
      GEMINI_RATE_LIMIT.timestamps.length > 0 &&
      GEMINI_RATE_LIMIT.timestamps[0] < cutoff
    ) {
      GEMINI_RATE_LIMIT.timestamps.shift();
    }
    return GEMINI_RATE_LIMIT.timestamps.length < GEMINI_RATE_LIMIT.maxPerMinute;
  }

  function geminiRateRecord() {
    GEMINI_RATE_LIMIT.timestamps.push(nowMs());
  }

  // -----------------------------------------------------------------
  // CALL GEMINI VISION (via Vercel proxy)
  // -----------------------------------------------------------------
  // Sends a base64-encoded JPEG to /api/proctor-analyze.
  // Server replies with JSON:
  //   {
  //     description: "string scene description",
  //     confidence: 0..1,
  //     flags: { phone_visible: bool, second_person: bool, suspicious: bool, ... }
  //   }
  // Returns null on any failure OR if rate-limited.
  async function callGeminiVision(blob, triggerType) {
    if (!blob) return null;
    // CHECK RATE LIMIT FIRST — skip if we'd exceed the per-minute cap.
    if (!geminiRateAvailable()) {
      GEMINI_RATE_LIMIT.skippedCalls++;
      // Only log every 5th skip to avoid spamming the console
      if (GEMINI_RATE_LIMIT.skippedCalls % 5 === 1) {
        console.warn(
          "[Proctoring] Gemini rate limit reached (8/min cap). " +
            "Skipped " +
            GEMINI_RATE_LIMIT.skippedCalls +
            " call(s) so far. Trigger: " +
            triggerType,
        );
      }
      return null;
    }
    geminiRateRecord();
    // Convert blob -> base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Result is "data:image/jpeg;base64,XXXX"; strip prefix
        const s = reader.result || "";
        const comma = s.indexOf(",");
        resolve(comma >= 0 ? s.slice(comma + 1) : s);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 12000); // 12s timeout
    try {
      const resp = await fetch("/api/proctor-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          triggerType: triggerType,
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const txt = await resp.text();
        console.warn(
          "[Proctoring] /api/proctor-analyze HTTP " + resp.status + ": " + txt,
        );
        return null;
      }
      const data = await resp.json();
      // Defensive: ensure expected shape
      if (!data || typeof data.description !== "string") return null;
      return {
        description: data.description,
        confidence: typeof data.confidence === "number" ? data.confidence : 0.5,
        flags: data.flags || {},
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn("[Proctoring] /api/proctor-analyze call failed:", err);
      return null;
    }
  }

  // -----------------------------------------------------------------
  // ANALYSIS LOOP (MediaPipe → continuous anomaly tracking)
  // -----------------------------------------------------------------
  async function analyzeOnce() {
    if (!state.faceDetector || !state.videoEl || state.stopped) return;
    const v = state.videoEl;
    if (v.readyState < 2 || v.paused || v.ended) return;

    let result;
    try {
      result = state.faceDetector.detectForVideo(v, performance.now());
    } catch (err) {
      // MediaPipe occasionally throws on browser tab GPU loss; recover next tick
      return;
    }

    const detections = (result && result.detections) || [];
    const faceCount = detections.length;
    const t = nowMs();

    // ---- no_face tracking ----
    if (faceCount === 0) {
      if (state.noFaceSince === null) state.noFaceSince = t;
      if (t - state.noFaceSince >= CONFIG.NO_FACE_THRESHOLD_MS) {
        recordAnomaly("no_face");
        state.noFaceSince = t; // reset (don't keep firing every tick)
      }
    } else {
      state.noFaceSince = null;
    }

    // ---- multiple_faces tracking ----
    if (faceCount > 1) {
      if (state.multiFaceSince === null) state.multiFaceSince = t;
      if (t - state.multiFaceSince >= CONFIG.MULTI_FACE_THRESHOLD_MS) {
        recordAnomaly("multiple_faces");
        state.multiFaceSince = t;
      }
    } else {
      state.multiFaceSince = null;
    }

    // ---- face_turned_away tracking ----
    // Heuristic: the BlazeFace short-range model gives 6 landmarks:
    //   0:rightEye, 1:leftEye, 2:noseTip, 3:mouth, 4:rightEar, 5:leftEar
    // If both eyes are detected but the nose is far off-center between
    // them, OR if one ear is detected without the other, treat as turned.
    if (faceCount === 1) {
      const det = detections[0];
      const turned = isFaceTurnedAway(det);
      if (turned) {
        if (state.turnedAwaySince === null) state.turnedAwaySince = t;
        if (t - state.turnedAwaySince >= CONFIG.TURNED_AWAY_THRESHOLD_MS) {
          recordAnomaly("face_turned_away");
          state.turnedAwaySince = t;
        }
      } else {
        state.turnedAwaySince = null;
      }
    } else {
      state.turnedAwaySince = null;
    }

    // Status update for the student preview (purely cosmetic)
    if (faceCount === 0) {
      setStatus("Face not visible", "warn");
    } else if (faceCount > 1) {
      setStatus(faceCount + " people detected", "warn");
    } else if (state.turnedAwaySince !== null) {
      // Issue #2 fix: previously the status fell through to "Active ·
      // monitoring" when faceCount===1, even with the face clearly
      // turned. Now the corner status mirrors the flash warning.
      setStatus("Face turned away", "warn");
    } else {
      setStatus("Active · monitoring", null);
    }

    // ---- HAND DETECTION (Option C) ----
    // Run every Nth tick (1Hz when face is 2Hz) — cheap GPU load that way.
    // When a hand is sustained > HAND_VISIBLE_THRESHOLD_MS, fire an
    // immediate Gemini check. Gemini decides whether it's a phone, notes,
    // or just a natural gesture (latter → silent, no event logged).
    state.analysisTickCount++;
    if (
      state.handDetectorReady &&
      state.analysisTickCount % CONFIG.HAND_DETECTION_EVERY_N_TICKS === 0
    ) {
      let handResult;
      try {
        handResult = state.handDetector.detectForVideo(v, performance.now());
      } catch (handErr) {
        // GPU pressure or tab-switch — recover next tick
        return;
      }
      const handCount =
        (handResult && handResult.landmarks && handResult.landmarks.length) ||
        0;
      if (handCount > 0) {
        if (state.handVisibleSince === null) state.handVisibleSince = t;
        const sustained = t - state.handVisibleSince;
        const inCooldown =
          t - state.lastHandTriggerAt < CONFIG.HAND_TRIGGER_COOLDOWN_MS;
        if (sustained >= CONFIG.HAND_VISIBLE_THRESHOLD_MS && !inCooldown) {
          // Trigger — capture frame + send to Gemini for validation.
          // We mark the cooldown BEFORE the async work so concurrent
          // ticks don't pile up. Gemini decides if anything's flagged.
          state.lastHandTriggerAt = t;
          checkHandTrigger();
        }
      } else {
        state.handVisibleSince = null;
      }
    }
  }

  // -----------------------------------------------------------------
  // HAND-TRIGGERED GEMINI CHECK (Option C)
  // -----------------------------------------------------------------
  // When MediaPipe sees a hand sustained in frame for > 1.5s, we send
  // the current frame to Gemini for scene analysis. Gemini decides:
  //   - phone_visible → record phone_visible event (red flash)
  //   - notes_visible → record notes_visible event (red flash)
  //   - just a natural gesture (scratching, chin-resting, yawning) →
  //     return no flags → we silently move on (no false positive logged)
  // This is the "Option C" path: near-real-time phone detection, with
  // Gemini as the validation gate so natural gestures don't false-alarm.
  async function checkHandTrigger() {
    if (state.stopped) return;
    const blob = await captureFrameBlob();
    if (!blob) return;
    let result;
    try {
      result = await callGeminiVision(blob, "hand_detected");
    } catch (err) {
      console.warn("[Proctoring] Hand-trigger Gemini call failed:", err);
      return;
    }
    if (!result || !result.flags) return;
    // Use the shared smart-labeling helper so the hand-trigger path
    // applies the SAME de-dup rules as the face-anomaly path. A hand
    // holding "something ambiguous" should pick ONE label (not log
    // both phone_visible and second_screen for the same object).
    //
    // We pass "hand_detected" as the trigger but the dedup logic only
    // cares about Gemini's flags here — it won't include "hand_detected"
    // in the output since that's not a logged event type.
    const flags = result.flags;
    const desc = (result.description || "").toLowerCase();
    let phone = !!flags.phone_visible;
    let screen = !!flags.second_screen;
    if (phone && screen) {
      const ambiguous =
        desc.indexOf("could be") >= 0 ||
        desc.indexOf("might be") >= 0 ||
        desc.indexOf("appears to be") >= 0 ||
        (desc.indexOf("phone") >= 0 && desc.indexOf(" or ") >= 0);
      if (ambiguous) {
        const phoneIdx = desc.indexOf("phone");
        const screenIdx = Math.max(
          desc.indexOf("screen"),
          desc.indexOf("laptop"),
          desc.indexOf("monitor"),
          desc.indexOf("tablet"),
        );
        if (phoneIdx >= 0 && (screenIdx < 0 || phoneIdx < screenIdx)) {
          screen = false;
        } else if (screenIdx >= 0) {
          phone = false;
        }
      }
    }
    const triggered = [];
    if (phone) triggered.push("phone_visible");
    if (flags.notes_visible) triggered.push("notes_visible");
    if (screen) triggered.push("second_screen");
    // If nothing flagged, silently drop — natural gesture, not a violation.
    if (!triggered.length) return;
    // Upload the frame as anomaly evidence + log each flagged event.
    const evidencePath = await uploadFrame(blob, "anomaly");
    const t = nowMs();
    for (const evType of triggered) {
      if (t - state.lastEventAt[evType] < CONFIG.EVENT_COOLDOWN_MS) continue;
      state.lastEventAt[evType] = t;
      const ev = {
        type: evType,
        t,
        evidencePath,
        geminiNote: result.description,
        geminiConfidence: result.confidence,
      };
      state.events.push(ev);
      saveEvent(ev);
      flashProctorWarning(evType);
    }
  }

  function isFaceTurnedAway(det) {
    // det.keypoints (BlazeFace short-range) → 6 landmarks, normalized [0,1]:
    //   0:rightEye, 1:leftEye, 2:noseTip, 3:mouth, 4:rightEar, 5:leftEar
    //
    // Detection strategy (multi-signal — any one of these is enough):
    //   A) Strong horizontal turn — nose is far off the eye-midpoint line
    //   B) Strong vertical turn (looking down/up) — nose-to-mouth offset is
    //      unusually small (face foreshortening) OR nose is below mouth line
    //   C) Sideways profile — only one ear visible AND eye-span is tiny
    //   D) Single-eye visible — strong profile turn
    //
    // BlazeFace gives all 6 keypoints when a face is detected; missing
    // keypoints == 0,0. We treat 0,0 as "not detected".
    const kps = det.keypoints || [];
    if (kps.length < 6) return false;
    const rightEye = kps[0];
    const leftEye = kps[1];
    const noseTip = kps[2];
    const mouth = kps[3];
    const rightEar = kps[4];
    const leftEar = kps[5];

    // Helper: is a keypoint actually present? BlazeFace returns 0,0 for
    // landmarks the model thinks are off-frame.
    const present = (kp) =>
      kp && (kp.x !== 0 || kp.y !== 0) && kp.x >= 0 && kp.y >= 0;

    if (!present(noseTip)) return true; // no nose → face is heavily occluded

    const eyesPresent = present(rightEye) && present(leftEye);

    // ---- Signal A: horizontal turn ----
    if (eyesPresent) {
      const eyeMidX = (rightEye.x + leftEye.x) / 2;
      const eyeSpan = Math.abs(leftEye.x - rightEye.x);
      if (eyeSpan < 0.025) {
        // both eyes nearly on top of each other → strong profile
        return true;
      }
      const xOffset = Math.abs(noseTip.x - eyeMidX) / eyeSpan;
      // Tightened from 0.55 → 0.42 — catches ~22° head turn (was ~30°)
      if (xOffset > 0.42) return true;
    } else {
      // Only one eye present → strong profile turn
      return true;
    }

    // ---- Signal B: vertical (looking down at lap/desk/phone) ----
    // When the student looks down, the nose moves DOWN relative to the
    // eye line AND the mouth gets closer to the nose (face foreshortens).
    if (eyesPresent && present(mouth)) {
      const eyeMidY = (rightEye.y + leftEye.y) / 2;
      const noseToEyeY = noseTip.y - eyeMidY; // positive = nose below eyes (normal)
      const noseToMouthY = mouth.y - noseTip.y; // positive = mouth below nose (normal)

      // Normal upright face: noseToMouthY > 0 and noseToEyeY > 0,
      // with mouth-to-nose distance roughly half the eye-to-nose distance.
      // When looking sharply DOWN: noseToMouthY shrinks dramatically and
      // can flip negative (mouth at or above nose). That's our trigger.
      if (noseToMouthY < 0.02) return true; // looking down sharply
      // When looking sharply UP: noseToMouthY grows large, noseToEyeY shrinks.
      if (noseToEyeY < 0.01) return true; // looking up sharply
    }

    // ---- Signal C: only one ear visible (strong side profile) ----
    if (present(leftEar) !== present(rightEar)) {
      // Exactly one ear visible AND face is somewhat tilted → side turn
      // (Both ears visible at the same time is the "normal head-on" pose.)
      if (eyesPresent) {
        const eyeSpan = Math.abs(leftEye.x - rightEye.x);
        if (eyeSpan < 0.06) return true;
      } else {
        return true;
      }
    }

    return false;
  }

  // -----------------------------------------------------------------
  // SCHEDULED FRAME CAPTURE
  // -----------------------------------------------------------------
  // Every SCHEDULED_INTERVAL_MS we capture a baseline frame. To catch
  // things MediaPipe can't see (phones, notebooks, secondary screens),
  // every Nth scheduled frame is ALSO sent to Gemini Vision for a
  // proactive scene analysis. Issue #1 fix: a student holding a phone
  // while still looking normally at the camera was never detected
  // because MediaPipe only flags face anomalies.
  async function captureScheduled() {
    if (state.stopped) return;
    const blob = await captureFrameBlob();
    if (!blob) return;
    state.scheduledTickCount++;
    // Issue #3d fix: count attempts (not just successful uploads). The
    // previous code incremented inside the upload's .then() callback,
    // so any in-flight upload at submit time was missed by the counter
    // and the PDF showed N when Storage actually held N+1 frames.
    state.scheduledFrameCount++;
    // Storage upload is fire-and-forget for scheduled frames — they're
    // baseline evidence, not actionable alerts.
    uploadFrame(blob, "scheduled").then(async (path) => {
      // Proactive Gemini analysis on every Nth scheduled frame.
      // This is what catches a phone held in the student's hand even
      // when their face looks normal to MediaPipe.
      const shouldAnalyze =
        state.scheduledTickCount % CONFIG.SCHEDULED_GEMINI_CHECK_EVERY_N === 0;
      if (!shouldAnalyze) return;
      try {
        const result = await callGeminiVision(blob, "scheduled");
        if (!result || !result.flags) return;
        const flags = result.flags;
        // Apply the same phone-vs-screen de-dup logic so an ambiguous
        // object in a scheduled frame doesn't get logged twice.
        const desc = (result.description || "").toLowerCase();
        let phone = !!flags.phone_visible;
        let screen = !!flags.second_screen;
        if (phone && screen) {
          const ambiguous =
            desc.indexOf("could be") >= 0 ||
            desc.indexOf("might be") >= 0 ||
            desc.indexOf("appears to be") >= 0 ||
            (desc.indexOf("phone") >= 0 && desc.indexOf(" or ") >= 0);
          if (ambiguous) {
            const phoneIdx = desc.indexOf("phone");
            const screenIdx = Math.max(
              desc.indexOf("screen"),
              desc.indexOf("laptop"),
              desc.indexOf("monitor"),
              desc.indexOf("tablet"),
            );
            if (phoneIdx >= 0 && (screenIdx < 0 || phoneIdx < screenIdx)) {
              screen = false;
            } else if (screenIdx >= 0) {
              phone = false;
            }
          }
        }
        const triggered = [];
        if (phone) triggered.push("phone_visible");
        if (flags.second_person) triggered.push("second_person");
        if (flags.notes_visible) triggered.push("notes_visible");
        if (screen) triggered.push("second_screen");
        if (!triggered.length) return;
        // Promote into formal events (respecting cooldowns) — pass the
        // already-uploaded scheduled blob/path so we don't re-upload.
        for (const t of triggered) {
          await promoteScheduledToAnomaly(t, blob, path, result);
        }
      } catch (err) {
        console.warn("[Proctoring] Scheduled Gemini analysis failed:", err);
      }
    });
  }

  // Promote a Gemini-flagged scheduled frame into a real anomaly event.
  // We re-upload the same frame under anomaly/ so it appears in the
  // admin's "Flagged Events" gallery alongside MediaPipe-triggered ones.
  async function promoteScheduledToAnomaly(
    type,
    blob,
    schedPath,
    geminiResult,
  ) {
    const t = nowMs();
    if (t - state.lastEventAt[type] < CONFIG.EVENT_COOLDOWN_MS) return;
    state.lastEventAt[type] = t;

    // Re-upload the same blob under the anomaly/ folder so it surfaces
    // in the admin Flagged Events view. (Cheap — the blob is ~30KB.)
    const anomalyPath = await uploadFrame(blob, "anomaly");

    const ev = {
      type,
      t,
      evidencePath: anomalyPath || schedPath,
      geminiNote: geminiResult.description,
      geminiConfidence: geminiResult.confidence,
    };
    state.events.push(ev);
    saveEvent(ev);
    flashProctorWarning(type);
  }

  // -----------------------------------------------------------------
  // CAMERA HEALTH CHECK
  // -----------------------------------------------------------------
  // If the webcam track ends mid-exam (user yanked USB, browser revoked
  // permission, OS suspended the camera), we want to log it.
  function checkCameraHealth() {
    if (!state.videoStream) return;
    const tracks = state.videoStream.getVideoTracks();
    if (!tracks.length || tracks[0].readyState === "ended") {
      recordAnomaly("camera_lost");
      setStatus("Camera disconnected", "error");
      // Stop the analysis loop — there's nothing to analyze. We DON'T stop
      // the exam — the instructor will see the risk score and decide.
      if (state.analysisInterval) {
        clearInterval(state.analysisInterval);
        state.analysisInterval = null;
      }
    }
  }

  // -----------------------------------------------------------------
  // PUBLIC: START
  // -----------------------------------------------------------------
  // Called by app.js right after the exam timer starts.
  // ctx = { sessionId?, group, studentId }
  // If sessionId is omitted, one is generated and returned via getRiskSummary().
  async function start(ctx) {
    if (state.started) return;
    state.started = true;
    state.stopped = false;

    state.sessionId = (ctx && ctx.sessionId) || uuid();
    state.group = (ctx && ctx.group) || null;
    state.studentId = (ctx && ctx.studentId) || null;

    // 1. Create the preview UI
    createPreview();

    // 2. Open the real webcam stream
    try {
      state.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      state.videoEl.srcObject = state.videoStream;
      await new Promise((resolve) => {
        if (state.videoEl.readyState >= 2) return resolve();
        state.videoEl.addEventListener("loadedmetadata", () => resolve(), {
          once: true,
        });
      });
    } catch (err) {
      console.error("[Proctoring] getUserMedia failed at start():", err);
      setStatus("Camera unavailable", "error");
      // Record an immediate camera_lost event so the instructor sees the
      // submission was un-proctored.
      recordAnomaly("camera_lost");
      return;
    }

    setStatus("Loading detector…", null);

    // 3. Try to initialize MediaPipe (non-blocking-ish — we wait, but if
    // it fails we degrade to scheduled-frames-only)
    await initMediaPipe();

    // 4. Start the analysis loop (only if MediaPipe is up)
    if (state.mediaPipeReady) {
      state.analysisInterval = setInterval(
        analyzeOnce,
        CONFIG.ANALYSIS_INTERVAL_MS,
      );
      setStatus("Active · monitoring", null);
    } else {
      // MediaPipe failed to load. Anomaly detection is OFF — only scheduled
      // baseline frames will be captured. Make this visible to the student
      // (so the instructor knows to investigate) and surface it in the
      // risk summary that lands on the admin dashboard + PDF.
      setStatus("Limited mode · no anomaly detection", "error");
      console.warn(
        "[Proctoring] Operating in scheduled-frames-only mode. " +
          "MediaPipe failed to load — admin dashboard will show " +
          '"detector unavailable" for this submission.',
      );
    }

    // 5. Schedule periodic captures (every 3 min)
    state.scheduledInterval = setInterval(
      captureScheduled,
      CONFIG.SCHEDULED_INTERVAL_MS,
    );
    // Also take an initial frame ~30s in (baseline of student at desk)
    setTimeout(() => {
      if (!state.stopped) captureScheduled();
    }, 30 * 1000);

    // 6. Camera health watcher
    state.videoStream.getVideoTracks().forEach((tr) => {
      tr.addEventListener("ended", checkCameraHealth);
    });
    // Belt-and-suspenders: also poll every 10s in case 'ended' doesn't fire
    state._healthInterval = setInterval(checkCameraHealth, 10000);
  }

  // -----------------------------------------------------------------
  // PUBLIC: STOP
  // -----------------------------------------------------------------
  // Called by app.js at submit. Tears down camera, intervals, preview UI.
  function stop() {
    if (state.stopped) return;
    state.stopped = true;

    if (state.analysisInterval) {
      clearInterval(state.analysisInterval);
      state.analysisInterval = null;
    }
    if (state.scheduledInterval) {
      clearInterval(state.scheduledInterval);
      state.scheduledInterval = null;
    }
    if (state._healthInterval) {
      clearInterval(state._healthInterval);
      state._healthInterval = null;
    }

    if (state.videoStream) {
      state.videoStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      state.videoStream = null;
    }

    if (state.overlayEl && state.overlayEl.parentNode) {
      try {
        state.overlayEl.parentNode.removeChild(state.overlayEl);
      } catch (_) {}
    }
    state.overlayEl = null;
    state.videoEl = null;
  }

  // -----------------------------------------------------------------
  // PUBLIC: RISK SUMMARY
  // -----------------------------------------------------------------
  // Called by app.js at submit time. Returns:
  //   {
  //     sessionId,
  //     riskScore,                // 0..100
  //     riskBand,                 // "clean"|"minor"|"significant"|"critical"
  //     eventCounts: { no_face, multiple_faces, ... },
  //     totalEvents,
  //     scheduledFrameCount,
  //   }
  function getRiskSummary() {
    let score = 0;
    const counts = {
      no_face: 0,
      multiple_faces: 0,
      face_turned_away: 0,
      phone_visible: 0,
      second_person: 0,
      notes_visible: 0,
      second_screen: 0,
      camera_lost: 0,
    };
    state.events.forEach((e) => {
      if (counts[e.type] !== undefined) counts[e.type]++;
      const w = CONFIG.RISK_WEIGHTS[e.type] || 0;
      score += w;
    });
    if (score > CONFIG.RISK_MAX) score = CONFIG.RISK_MAX;

    let band = "clean";
    if (score > CONFIG.RISK_BANDS.significant) band = "critical";
    else if (score > CONFIG.RISK_BANDS.minor) band = "significant";
    else if (score > CONFIG.RISK_BANDS.clean) band = "minor";

    return {
      sessionId: state.sessionId,
      riskScore: score,
      riskBand: band,
      eventCounts: counts,
      totalEvents: state.events.length,
      scheduledFrameCount: state.scheduledFrameCount,
      // True iff MediaPipe never initialized; anomaly detection was OFF.
      // Surfaced on the admin dashboard + PDF so a "0/100 clean" result
      // doesn't mislead anyone when detection wasn't actually running.
      detectorUnavailable: !!state.mediaPipeFailed,
      // Diagnostic: how many Gemini calls were skipped by client-side
      // rate limiting. If > 0 it means the student had many anomaly
      // triggers in a short period — some phone frames may have been
      // skipped at the client. (Not displayed unless > 0.)
      geminiCallsSkipped: GEMINI_RATE_LIMIT.skippedCalls,
    };
  }

  // -----------------------------------------------------------------
  // EXPORTS
  // -----------------------------------------------------------------
  window.Proctoring = {
    showConsentModal,
    start,
    stop,
    getRiskSummary,
    // Read-only access to internal state for debugging
    _state: state,
    _config: CONFIG,
  };
})();
