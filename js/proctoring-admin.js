// =============================================================
// Admin Proctoring Viewer
// -------------------------------------------------------------
// Adds to the admin dashboard:
//   - A "Proctoring Risk" column rendered into each submission row
//     (badge color = risk band; click → open modal)
//   - A modal that loads & displays all proctoring events for the
//     submission's sessionId: anomaly frames (with timestamps + Gemini
//     descriptions) and scheduled-evidence frames.
//
// Public API (window.ProctoringAdmin):
//   renderRiskCell(row, submission) -> sets cell innerHTML
//   openProctorModal(submission)    -> shows the modal
//   bandFromScore(score) -> "clean"|"minor"|"significant"|"critical"
// =============================================================

(function () {
  "use strict";

  const RISK_BANDS = {
    clean: 15,
    minor: 40,
    significant: 70,
    critical: 100,
  };

  function bandFromScore(score) {
    if (score == null) return "unknown";
    if (score > RISK_BANDS.significant) return "critical";
    if (score > RISK_BANDS.minor) return "significant";
    if (score > RISK_BANDS.clean) return "minor";
    return "clean";
  }

  function bandColor(band) {
    return (
      {
        clean: { bg: "#D1FAE5", fg: "#065F46", label: "🟢 CLEAN" },
        minor: { bg: "#FEF3C7", fg: "#92400E", label: "🟡 MINOR" },
        significant: { bg: "#FFEDD5", fg: "#9A3412", label: "🟠 REVIEW" },
        critical: { bg: "#FEE2E2", fg: "#991B1B", label: "🔴 CRITICAL" },
        detector_off: {
          bg: "#F3F4F6",
          fg: "#374151",
          label: "⚪ DETECTOR OFF",
        },
        unknown: { bg: "#F3F4F6", fg: "#6B7280", label: "—" },
      }[band] || { bg: "#F3F4F6", fg: "#6B7280", label: "—" }
    );
  }

  function renderRiskCellHtml(submission) {
    // Webcam feature was turned OFF by the admin for this exam — no
    // proctoring data exists by design. Render a distinct clickable
    // badge; the evidence modal explains the setting (see
    // openProctorModal's webcamDisabled branch).
    if (submission && submission.webcamDisabled === true) {
      return (
        '<button class="proctor-badge-btn" ' +
        'data-docid="' +
        escapeAttr(submission.id || "") +
        '" ' +
        'title="Webcam feature was turned off by the admin for this exam" ' +
        'style="background:#E0E7FF;color:#3730A3;border:none;cursor:pointer;' +
        "padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;" +
        'letter-spacing:.02em">' +
        "📷 WEBCAM OFF" +
        "</button>"
      );
    }
    if (
      !submission ||
      typeof submission.proctorRiskScore !== "number" ||
      !submission.proctorSessionId
    ) {
      // No proctoring data attached → show neutral "—"
      const c = bandColor("unknown");
      return (
        '<span class="proctor-badge" ' +
        'style="background:' +
        c.bg +
        ";color:" +
        c.fg +
        ";padding:3px 8px;border-radius:999px;font-size:11px;" +
        'font-weight:600;letter-spacing:.02em">' +
        c.label +
        "</span>"
      );
    }
    const score = submission.proctorRiskScore;
    // When the in-browser detector didn't initialize, anomaly detection
    // was off — surface that explicitly instead of letting a 0/100 read
    // as "CLEAN".
    const band = submission.proctorDetectorUnavailable
      ? "detector_off"
      : bandFromScore(score);
    const c = bandColor(band);
    const display = band === "detector_off" ? c.label : c.label + " · " + score;
    return (
      '<button class="proctor-badge-btn" ' +
      'data-sessionid="' +
      escapeAttr(submission.proctorSessionId) +
      '" ' +
      'data-score="' +
      score +
      '" ' +
      'data-docid="' +
      escapeAttr(submission.id || "") +
      '" ' +
      'title="Click to view proctoring evidence" ' +
      'style="background:' +
      c.bg +
      ";color:" +
      c.fg +
      ";border:none;cursor:pointer;padding:3px 10px;border-radius:999px;" +
      'font-size:11px;font-weight:600;letter-spacing:.02em">' +
      display +
      "</button>"
    );
  }

  // -----------------------------------------------------------------
  // Modal
  // -----------------------------------------------------------------
  function injectModalStyles() {
    if (document.getElementById("proctor-admin-modal-styles")) return;
    const css =
      "" +
      "#proctor-admin-overlay{position:fixed;inset:0;z-index:11000;" +
      "background:rgba(15,23,42,.55);display:none;align-items:flex-start;" +
      "justify-content:center;padding:24px;overflow-y:auto;" +
      "backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}" +
      "#proctor-admin-overlay.show{display:flex}" +
      "#proctor-admin-box{background:#FFFFFF;border-radius:16px;max-width:980px;" +
      "width:100%;box-shadow:0 20px 50px -12px rgba(15,23,42,.25);padding:24px 26px;" +
      "font-family:Inter,system-ui,sans-serif;color:#0F172A;position:relative;overflow:hidden}" +
      // Top accent strip — indigo→ember gradient (matches platform modal language)
      "#proctor-admin-box::before{content:'';position:absolute;top:0;left:0;right:0;" +
      "height:3px;background:linear-gradient(90deg,#2563EB 0%,#F97316 100%);z-index:1}" +
      "#proctor-admin-box .pa-head{display:flex;align-items:center;" +
      "justify-content:space-between;margin-bottom:8px}" +
      "#proctor-admin-box .pa-head h3{margin:0;font-family:'Bricolage Grotesque','Inter',system-ui,sans-serif;" +
      "color:#0F172A;font-size:22px;font-weight:700;letter-spacing:-.01em}" +
      "#proctor-admin-box .pa-close{background:#F3F4F6;border:none;width:32px;" +
      "height:32px;border-radius:8px;font-size:18px;cursor:pointer}" +
      "#proctor-admin-box .pa-close:hover{background:#E5E7EB}" +
      "#proctor-admin-box .pa-meta{margin-bottom:0}" +
      "#proctor-admin-box .pa-sumrow{margin-bottom:8px}" +
      "#proctor-admin-box .pa-stat{background:#F8FAFC;border:1px solid #E2E8F0;" +
      "padding:10px 14px;border-radius:8px;min-width:120px}" +
      "#proctor-admin-box .pa-stat .pa-stat-lbl{font-size:10px;" +
      "letter-spacing:.06em;color:#64748B;font-weight:600;text-transform:uppercase}" +
      "#proctor-admin-box .pa-stat .pa-stat-val{font-size:22px;font-weight:700;" +
      "color:#0F172A;margin-top:2px}" +
      "#proctor-admin-box .pa-section-title{font-size:13px;font-weight:600;" +
      "color:#374151;margin:18px 0 10px;padding-bottom:6px;" +
      "border-bottom:1px solid #E5E7EB}" +
      "#proctor-admin-box .pa-events{display:grid;" +
      "grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}" +
      "#proctor-admin-box .pa-evt{background:#F8FAFC;border:1px solid #E2E8F0;" +
      "border-radius:9px;overflow:hidden}" +
      "#proctor-admin-box .pa-evt img{width:100%;height:165px;object-fit:cover;" +
      "background:#0F172A;cursor:zoom-in}" +
      "#proctor-admin-box .pa-evt-meta{padding:8px 10px}" +
      "#proctor-admin-box .pa-evt-type{font-size:11px;font-weight:700;" +
      "letter-spacing:.04em;text-transform:uppercase}" +
      "#proctor-admin-box .pa-evt-time{font-size:11.5px;color:#475569;" +
      "margin-top:3px;font-weight:500;letter-spacing:.01em}" +
      "#proctor-admin-box .pa-evt-note{font-size:12px;color:#374151;" +
      "margin-top:6px;line-height:1.4}" +
      "#proctor-admin-box .pa-loading{text-align:center;padding:40px;color:#6B7280}" +
      "#proctor-admin-box .pa-empty{text-align:center;padding:30px;color:#6B7280;" +
      "background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:9px}" +
      "#proctor-admin-box .pa-tag-no_face{color:#92400E}" +
      "#proctor-admin-box .pa-tag-multiple_faces{color:#991B1B}" +
      "#proctor-admin-box .pa-tag-face_turned_away{color:#9A3412}" +
      "#proctor-admin-box .pa-tag-phone_visible{color:#991B1B}" +
      "#proctor-admin-box .pa-tag-second_person{color:#991B1B}" +
      "#proctor-admin-box .pa-tag-notes_visible{color:#92400E}" +
      "#proctor-admin-box .pa-tag-second_screen{color:#1E40AF}" +
      "#proctor-admin-box .pa-tag-earphones_visible{color:#7C2D12}" +
      "#proctor-admin-box .pa-tag-camera_lost{color:#1F2937}" +
      "#proctor-admin-box .pa-tag-scheduled{color:#1E40AF}" +
      // ---- Student Information card (Issue #10) ----
      "#proctor-admin-box .pa-info-card{background:linear-gradient(135deg,#EFF6FF 0%,#FFFFFF 100%);" +
      "border:1px solid #DBEAFE;border-left:4px solid #2563EB;border-radius:12px;" +
      "padding:14px 20px;margin-bottom:18px}" +
      "#proctor-admin-box .pa-info-row{display:flex;justify-content:space-between;" +
      "align-items:center;padding:7px 0;border-bottom:1px solid #E5EAF5}" +
      "#proctor-admin-box .pa-info-row:last-child{border-bottom:none}" +
      // Session ID row no longer fades; user wants it as visible as the rest
      "#proctor-admin-box .pa-info-row-faded{opacity:1}" +
      "#proctor-admin-box .pa-info-label{font-size:12px;font-weight:600;color:#4B5563;" +
      "letter-spacing:.02em;text-transform:uppercase}" +
      "#proctor-admin-box .pa-info-value{font-size:14px;font-weight:700;color:#0F172A;" +
      "font-family:Inter,system-ui,sans-serif}" +
      // Session ID value: bigger, indigo, monospace for readability
      "#proctor-admin-box .pa-info-mono{font-family:'JetBrains Mono','SF Mono',ui-monospace,monospace;" +
      "font-size:14px;font-weight:700;color:#1D4ED8}" +
      // ---- Risk score "headline" card (Issue #11) ----
      "#proctor-admin-box .pa-score-card{display:flex;align-items:center;gap:18px;" +
      "padding:18px 22px;border-radius:12px;color:#fff;width:100%;" +
      "box-shadow:0 6px 18px rgba(0,0,0,.08);margin-bottom:14px}" +
      "#proctor-admin-box .pa-score-emoji{font-size:38px;line-height:1}" +
      "#proctor-admin-box .pa-score-meta{flex:1}" +
      "#proctor-admin-box .pa-score-label{font-size:12px;letter-spacing:.08em;" +
      "font-weight:700;opacity:.85;text-transform:uppercase}" +
      "#proctor-admin-box .pa-score-sub{font-size:18px;font-weight:600;margin-top:2px}" +
      "#proctor-admin-box .pa-score-big{font-size:54px;font-weight:800;line-height:1;" +
      "font-family:Inter,system-ui,sans-serif;letter-spacing:-.02em}" +
      "#proctor-admin-box .pa-score-deno{font-size:22px;font-weight:500;opacity:.7;margin-left:2px}" +
      "#proctor-admin-box .pa-score-band-clean{background:linear-gradient(135deg,#10B981,#059669)}" +
      "#proctor-admin-box .pa-score-band-minor{background:linear-gradient(135deg,#F59E0B,#D97706)}" +
      "#proctor-admin-box .pa-score-band-significant{background:linear-gradient(135deg,#F97316,#EA580C)}" +
      "#proctor-admin-box .pa-score-band-critical{background:linear-gradient(135deg,#EF4444,#DC2626)}" +
      "#proctor-admin-box .pa-score-detector-off{background:linear-gradient(135deg,#9CA3AF,#6B7280)}" +
      // ---- Detection-type tiles ----
      "#proctor-admin-box .pa-tiles-grid{display:grid;" +
      "grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:11px;margin-bottom:18px}" +
      "#proctor-admin-box .pa-tile{background:#FFFFFF;border:1.5px solid #E5E7EB;" +
      "border-radius:10px;padding:14px 12px;text-align:center;transition:all .15s;" +
      "position:relative;overflow:hidden}" +
      "#proctor-admin-box .pa-tile-emoji{font-size:24px;margin-bottom:4px;opacity:.92}" +
      "#proctor-admin-box .pa-tile-count{font-size:32px;font-weight:800;color:#9CA3AF;" +
      "line-height:1;font-family:Inter,system-ui,sans-serif;margin-bottom:6px}" +
      "#proctor-admin-box .pa-tile-label{font-size:10.5px;font-weight:600;color:#6B7280;" +
      "letter-spacing:.02em;line-height:1.3}" +
      // when a tile has hits, color it dramatically
      "#proctor-admin-box .pa-tile-hit{background:linear-gradient(180deg,#FEF2F2 0%,#FECACA 100%);" +
      "border-color:#F87171;box-shadow:0 4px 12px rgba(220,38,38,.18)}" +
      "#proctor-admin-box .pa-tile-hit .pa-tile-count{color:#B91C1C}" +
      "#proctor-admin-box .pa-tile-hit .pa-tile-label{color:#7F1D1D;font-weight:700}" +
      "#proctor-admin-box .pa-tile-hit::before{content:'';position:absolute;top:0;left:0;" +
      "right:0;height:3px;background:#DC2626}" +
      // informational tile (scheduled frame count) — different look
      "#proctor-admin-box .pa-tile-info{background:linear-gradient(180deg,#EFF6FF 0%,#DBEAFE 100%);" +
      "border-color:#60A5FA}" +
      "#proctor-admin-box .pa-tile-info .pa-tile-count{color:#1E40AF}" +
      "#proctor-admin-box .pa-tile-info .pa-tile-label{color:#1E3A8A;font-weight:700}" +
      "#proctor-admin-box .pa-tile-info::before{content:'';position:absolute;top:0;left:0;" +
      "right:0;height:3px;background:#3B82F6}" +
      "#proctor-admin-zoom{position:fixed;inset:0;z-index:11500;display:none;" +
      "background:rgba(0,0,0,.85);align-items:center;justify-content:center;cursor:zoom-out}" +
      "#proctor-admin-zoom.show{display:flex}" +
      "#proctor-admin-zoom img{max-width:92vw;max-height:92vh;border-radius:6px}" +
      // ---- Webcam feature turned off by the admin (per-exam setting) ----
      "#proctor-admin-box .pa-webcam-off{display:flex;align-items:center;gap:16px;" +
      "background:linear-gradient(135deg,#EEF2FF 0%,#E0E7FF 100%);" +
      "border:1.5px solid #A5B4FC;border-radius:12px;padding:22px 24px;margin-bottom:6px}" +
      "#proctor-admin-box .pa-webcam-off-emoji{font-size:36px;line-height:1}" +
      "#proctor-admin-box .pa-webcam-off-title{font-size:16px;font-weight:700;" +
      "color:#3730A3;margin-bottom:3px}" +
      "#proctor-admin-box .pa-webcam-off-sub{font-size:12.5px;color:#4B5563;line-height:1.45}" +
      "";
    const styleEl = document.createElement("style");
    styleEl.id = "proctor-admin-modal-styles";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  function ensureModalDOM() {
    if (document.getElementById("proctor-admin-overlay")) return;
    injectModalStyles();
    const overlay = document.createElement("div");
    overlay.id = "proctor-admin-overlay";
    overlay.innerHTML =
      '<div id="proctor-admin-box" role="dialog" aria-modal="true">' +
      '<div class="pa-head">' +
      "<h3>Proctoring Evidence</h3>" +
      '<button class="pa-close" id="pa-close" type="button" aria-label="Close">×</button>' +
      "</div>" +
      '<div class="pa-meta" id="pa-meta"></div>' +
      '<div class="pa-sumrow" id="pa-sumrow"></div>' +
      '<div class="pa-section-title" id="pa-sec-anom-title">Flagged Anomaly Detected Events</div>' +
      '<div class="pa-events" id="pa-events-anom"></div>' +
      '<div class="pa-section-title" id="pa-sec-sched-title">Scheduled Evidence Frames (every 5 minutes)</div>' +
      '<div class="pa-events" id="pa-events-sched"></div>' +
      "</div>";
    document.body.appendChild(overlay);

    // Zoom overlay for clicked images
    const zoom = document.createElement("div");
    zoom.id = "proctor-admin-zoom";
    zoom.innerHTML = '<img id="pa-zoom-img" alt="">';
    document.body.appendChild(zoom);
    zoom.addEventListener("click", () => zoom.classList.remove("show"));

    // Close handler
    document.getElementById("pa-close").addEventListener("click", () => {
      overlay.classList.remove("show");
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("show");
    });

    // Delegate clicks on event images to zoom
    overlay.addEventListener("click", (e) => {
      if (
        e.target &&
        e.target.tagName === "IMG" &&
        e.target.closest(".pa-evt")
      ) {
        const zImg = document.getElementById("pa-zoom-img");
        zImg.src = e.target.src;
        zoom.classList.add("show");
      }
    });
  }

  async function openProctorModal(submission) {
    ensureModalDOM();
    const overlay = document.getElementById("proctor-admin-overlay");
    const sessionId = submission.proctorSessionId;
    const score = submission.proctorRiskScore;

    // ----------------------------------------------------------------
    // Webcam feature turned OFF by the admin for this exam.
    // No proctoring session exists by design, so instead of scores,
    // tiles and evidence frames we show the student info card plus a
    // single informative panel — then bail out before any Firestore /
    // Storage fetches. The static section titles ("Flagged Anomaly
    // Detected Events" / "Scheduled Evidence Frames") are hidden for
    // this state and restored for normal proctored sessions since the
    // modal DOM is reused across opens.
    // ----------------------------------------------------------------
    const webcamOff = submission.webcamDisabled === true;
    const anomTitleEl = document.getElementById("pa-sec-anom-title");
    const schedTitleEl = document.getElementById("pa-sec-sched-title");
    if (anomTitleEl) anomTitleEl.style.display = webcamOff ? "none" : "";
    if (schedTitleEl) schedTitleEl.style.display = webcamOff ? "none" : "";

    if (webcamOff) {
      const wName =
        [submission.firstName, submission.lastName].filter(Boolean).join(" ") ||
        "Unknown";
      document.getElementById("pa-meta").innerHTML =
        '<div class="pa-info-card">' +
        '<div class="pa-info-row">' +
        '<span class="pa-info-label">Student Full Name</span>' +
        '<span class="pa-info-value">' +
        escapeHtml(wName) +
        "</span>" +
        "</div>" +
        '<div class="pa-info-row">' +
        '<span class="pa-info-label">Student Group</span>' +
        '<span class="pa-info-value">' +
        escapeHtml(submission.group || "—") +
        "</span>" +
        "</div>" +
        '<div class="pa-info-row">' +
        '<span class="pa-info-label">Student ID</span>' +
        '<span class="pa-info-value">' +
        escapeHtml(submission.studentId || "—") +
        "</span>" +
        "</div>" +
        '<div class="pa-info-row">' +
        '<span class="pa-info-label">Exam Version</span>' +
        '<span class="pa-info-value">' +
        escapeHtml(submission.version || "—") +
        "</span>" +
        "</div>" +
        "</div>";
      document.getElementById("pa-sumrow").innerHTML =
        '<div class="pa-webcam-off">' +
        '<div class="pa-webcam-off-emoji">📷</div>' +
        "<div>" +
        '<div class="pa-webcam-off-title">The webcam feature was turned off by the admin for this exam.</div>' +
        '<div class="pa-webcam-off-sub">No verification photo was captured and no webcam proctoring was performed for this submission, so there is no proctoring evidence to review.</div>' +
        "</div>" +
        "</div>";
      document.getElementById("pa-events-anom").innerHTML = "";
      document.getElementById("pa-events-sched").innerHTML = "";
      overlay.classList.add("show");
      return;
    }

    // ----------------------------------------------------------------
    // Student information card (Issue #10) — line-by-line, colored,
    // visually structured rather than the old inline "·" string.
    // ----------------------------------------------------------------
    const name =
      [submission.firstName, submission.lastName].filter(Boolean).join(" ") ||
      "Unknown";
    const meta = document.getElementById("pa-meta");
    meta.innerHTML =
      '<div class="pa-info-card">' +
      '<div class="pa-info-row">' +
      '<span class="pa-info-label">Student Full Name</span>' +
      '<span class="pa-info-value">' +
      escapeHtml(name) +
      "</span>" +
      "</div>" +
      '<div class="pa-info-row">' +
      '<span class="pa-info-label">Student Group</span>' +
      '<span class="pa-info-value">' +
      escapeHtml(submission.group || "—") +
      "</span>" +
      "</div>" +
      '<div class="pa-info-row">' +
      '<span class="pa-info-label">Student ID</span>' +
      '<span class="pa-info-value">' +
      escapeHtml(submission.studentId || "—") +
      "</span>" +
      "</div>" +
      '<div class="pa-info-row">' +
      '<span class="pa-info-label">Exam Version</span>' +
      '<span class="pa-info-value">' +
      escapeHtml(submission.version || "—") +
      "</span>" +
      "</div>" +
      '<div class="pa-info-row pa-info-row-faded">' +
      '<span class="pa-info-label">Proctoring Session ID</span>' +
      '<span class="pa-info-value pa-info-mono">' +
      escapeHtml(sessionId) +
      "</span>" +
      "</div>" +
      "</div>";

    // ----------------------------------------------------------------
    // Detection stat tiles (Issue #11) — bold modern cards with
    // emoji + colored numeric + label. Tiles with hits get an accent
    // background so they pop visually.
    // ----------------------------------------------------------------
    const counts = submission.proctorEventCounts || {};
    const band = submission.proctorDetectorUnavailable
      ? "detector_off"
      : bandFromScore(score);
    const c = bandColor(band);

    // Big risk score "headline" card (full width strip on top)
    const detectorOff = !!submission.proctorDetectorUnavailable;
    const scoreCardHtml = detectorOff
      ? '<div class="pa-score-card pa-score-detector-off">' +
        '<div class="pa-score-emoji">⚪</div>' +
        '<div class="pa-score-meta">' +
        '<div class="pa-score-label">DETECTOR UNAVAILABLE</div>' +
        '<div class="pa-score-sub">Manual review required</div>' +
        "</div></div>"
      : '<div class="pa-score-card pa-score-band-' +
        band +
        '">' +
        '<div class="pa-score-emoji">' +
        scoreEmoji(band) +
        "</div>" +
        '<div class="pa-score-meta">' +
        '<div class="pa-score-label">' +
        c.label.replace(/^[^\s]+\s/, "") +
        "</div>" +
        '<div class="pa-score-sub">Risk Score</div>' +
        "</div>" +
        '<div class="pa-score-big">' +
        score +
        '<span class="pa-score-deno">/100</span></div>' +
        "</div>";

    // Detection-type tiles (8 tiles in a responsive grid)
    const tiles = [
      {
        key: "no_face",
        emoji: "🫥",
        label: "No Face Detection",
        count: counts.no_face || 0,
      },
      {
        key: "multiple_faces",
        emoji: "👥",
        label: "Multiple Faces Detection",
        count: counts.multiple_faces || 0,
      },
      {
        key: "face_turned_away",
        emoji: "↩️",
        label: "Face Turned Away",
        count: counts.face_turned_away || 0,
      },
      {
        key: "phone_visible",
        emoji: "📱",
        label: "Phone Detection",
        count: counts.phone_visible || 0,
      },
      {
        key: "second_person",
        emoji: "🧑‍🤝‍🧑",
        label: "Second Person Detection",
        count: counts.second_person || 0,
      },
      {
        key: "notes_visible",
        emoji: "📝",
        label: "Paper Notes Detection",
        count: counts.notes_visible || 0,
      },
      {
        key: "second_screen",
        emoji: "🖥️",
        label: "Second Screen Detection",
        count: counts.second_screen || 0,
      },
      {
        key: "earphones_visible",
        emoji: "🎧",
        label: "Earphones Detection",
        count: counts.earphones_visible || 0,
      },
      {
        key: "camera_lost",
        emoji: "📷",
        label: "Camera Connection Lost",
        count: counts.camera_lost || 0,
      },
    ];
    const schedCount = submission.proctorScheduledFrames || 0;
    const tilesHtml = tiles
      .map((t) => {
        const hasHits = t.count > 0;
        const cls = "pa-tile" + (hasHits ? " pa-tile-hit" : "");
        return (
          '<div class="' +
          cls +
          '">' +
          '<div class="pa-tile-emoji">' +
          t.emoji +
          "</div>" +
          '<div class="pa-tile-count">' +
          t.count +
          "</div>" +
          '<div class="pa-tile-label">' +
          escapeHtml(t.label) +
          "</div>" +
          "</div>"
        );
      })
      .join("");
    // The 9th tile is informational (scheduled frames captured) — different look
    const schedTileHtml =
      '<div class="pa-tile pa-tile-info">' +
      '<div class="pa-tile-emoji">📸</div>' +
      '<div class="pa-tile-count">' +
      schedCount +
      "</div>" +
      '<div class="pa-tile-label">Scheduled Frames Captured</div>' +
      "</div>";

    const sumrow = document.getElementById("pa-sumrow");
    sumrow.innerHTML =
      scoreCardHtml +
      '<div class="pa-tiles-grid">' +
      tilesHtml +
      schedTileHtml +
      "</div>";

    const anomDiv = document.getElementById("pa-events-anom");
    const schedDiv = document.getElementById("pa-events-sched");
    anomDiv.innerHTML = '<div class="pa-loading">Loading flagged events…</div>';
    schedDiv.innerHTML =
      '<div class="pa-loading">Loading scheduled frames…</div>';
    overlay.classList.add("show");

    // Fetch events from Firestore + Storage
    let events = [];
    try {
      const snap = await window.fbDb
        .collection("proctoring_events")
        .where("sessionId", "==", sessionId)
        .orderBy("clientAt", "asc")
        .get();
      events = snap.docs.map((d) => d.data());
    } catch (err) {
      // Likely a missing composite index. Fallback: query without orderBy.
      console.warn("[Proctor admin] indexed query failed, retrying:", err);
      try {
        const snap = await window.fbDb
          .collection("proctoring_events")
          .where("sessionId", "==", sessionId)
          .get();
        events = snap.docs.map((d) => d.data());
        events.sort((a, b) => (a.clientAt || 0) - (b.clientAt || 0));
      } catch (err2) {
        anomDiv.innerHTML =
          '<div class="pa-empty">Could not load events: ' +
          escapeHtml((err2 && err2.message) || String(err2)) +
          "</div>";
        schedDiv.innerHTML = "";
        return;
      }
    }

    // Render anomaly events
    if (!events.length) {
      anomDiv.innerHTML =
        '<div class="pa-empty">No flagged events. ✓ Clean session.</div>';
    } else {
      anomDiv.innerHTML = "";
      for (const evt of events) {
        const card = await renderEventCard(evt);
        anomDiv.appendChild(card);
      }
    }

    // Render scheduled frames (listed from Storage directly)
    try {
      const listRef = window.fbStorage
        .ref()
        .child("proctoring/" + sessionId + "/scheduled");
      const list = await listRef.listAll();
      if (!list.items.length) {
        schedDiv.innerHTML =
          '<div class="pa-empty">No scheduled frames captured.</div>';
      } else {
        schedDiv.innerHTML = "";
        // Sort by name (filename starts with timestamp)
        const items = list.items
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));
        for (const itemRef of items) {
          const url = await itemRef.getDownloadURL().catch(() => null);
          if (!url) continue;
          const ts = parseInt(itemRef.name.split("_")[0], 10);
          const tsStr = formatDateTimeLabel(ts);
          const card = document.createElement("div");
          card.className = "pa-evt";
          card.innerHTML =
            '<img src="' +
            escapeAttr(url) +
            '" alt="Scheduled frame">' +
            '<div class="pa-evt-meta">' +
            '<div class="pa-evt-type pa-tag-scheduled">SCHEDULED</div>' +
            '<div class="pa-evt-time">' +
            escapeHtml(tsStr) +
            "</div>" +
            "</div>";
          schedDiv.appendChild(card);
        }
      }
    } catch (err) {
      console.warn("[Proctor admin] listAll failed:", err);
      schedDiv.innerHTML =
        '<div class="pa-empty">Could not list scheduled frames: ' +
        escapeHtml((err && err.message) || String(err)) +
        "</div>";
    }
  }

  async function renderEventCard(evt) {
    const card = document.createElement("div");
    card.className = "pa-evt";
    const tStr = evt.clientAt
      ? formatDateTimeLabel(evt.clientAt)
      : evt.at && evt.at.toDate
        ? formatDateTimeLabel(evt.at.toDate().getTime())
        : "";

    // Load the evidence image from Storage (path stored on the event doc)
    let imgHtml =
      '<div style="height:165px;display:flex;align-items:center;' +
      'justify-content:center;background:#0F172A;color:#94A3B8;font-size:11px">' +
      "(no frame captured)</div>";
    if (evt.evidencePath) {
      try {
        const url = await window.fbStorage
          .ref()
          .child(evt.evidencePath)
          .getDownloadURL();
        imgHtml =
          '<img src="' +
          escapeAttr(url) +
          '" alt="' +
          escapeAttr(evt.type) +
          '">';
      } catch (err) {
        imgHtml =
          '<div style="height:165px;display:flex;align-items:center;' +
          "justify-content:center;background:#0F172A;color:#FCA5A5;" +
          'font-size:11px;padding:8px;text-align:center">' +
          "(frame unavailable)</div>";
      }
    }

    const typeLabel = (evt.type || "unknown").toUpperCase().replace(/_/g, " ");
    const noteHtml = evt.geminiNote
      ? '<div class="pa-evt-note">🤖 ' + escapeHtml(evt.geminiNote) + "</div>"
      : "";

    card.innerHTML =
      imgHtml +
      '<div class="pa-evt-meta">' +
      '<div class="pa-evt-type pa-tag-' +
      escapeAttr(evt.type || "unknown") +
      '">' +
      escapeHtml(typeLabel) +
      "</div>" +
      '<div class="pa-evt-time">' +
      escapeHtml(tStr) +
      "</div>" +
      noteHtml +
      "</div>";
    return card;
  }

  function stat(label, value, color) {
    const colorStyle = color ? "color:" + color : "";
    return (
      '<div class="pa-stat">' +
      '<div class="pa-stat-lbl">' +
      escapeHtml(label) +
      "</div>" +
      '<div class="pa-stat-val" style="' +
      colorStyle +
      '">' +
      escapeHtml(value) +
      "</div>" +
      "</div>"
    );
  }

  function scoreEmoji(band) {
    return (
      {
        clean: "🛡️",
        minor: "⚠️",
        significant: "🚨",
        critical: "🔴",
        detector_off: "⚪",
      }[band] || "❓"
    );
  }

  // Issue #3a fix: include DATE alongside time on every event label
  // (e.g. "May 20, 2026, 11:18:47 PM"). Previously labels showed only
  // the time which made the timeline ambiguous across multi-day sessions
  // or when reviewing past exams.
  function formatDateTimeLabel(ms) {
    if (!isFinite(ms)) return "";
    try {
      return new Date(ms).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch (_) {
      return new Date(ms).toLocaleString();
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  // -----------------------------------------------------------------
  // EXPORTS
  // -----------------------------------------------------------------
  window.ProctoringAdmin = {
    renderRiskCellHtml,
    openProctorModal,
    bandFromScore,
    bandColor,
  };
})();
