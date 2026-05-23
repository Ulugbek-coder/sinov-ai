// =============================================================
// Sinov AI — Analytics page logic
// =============================================================
// Loads up to 500 submissions for the selected exam, computes
// aggregate metrics, renders six SVG charts + a top-risk table.
//
// Design notes:
//   - Auth gate: same pattern as admin.js (instructor login required).
//     Redirects to login.html if no user, or to admin.html if the user
//     does not have an /instructors/{uid} doc.
//   - All charts are hand-coded SVG (no Chart.js, no CDN). This keeps
//     the page fast and lets us match the Sinov design tokens exactly.
//   - Defensive: legacy submissions may be missing finalGrade,
//     proctorSummary, timeUsed, etc. Every aggregate skips records
//     that don't have the required field, never crashes on undefined.
//   - Re-renderable: full state lives in module-local vars. Filter
//     change → re-fetch → re-compute → re-render. No partial updates.
// =============================================================

(function () {
  "use strict";

  // -----------------------------------------------------------------
  // Tiny helpers
  // -----------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // SVG element factory. We do this manually (not via innerHTML) so
  // that SVG namespace is preserved and the elements render correctly
  // in every browser.
  function svgEl(tag, attrs, text) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] != null) el.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) el.textContent = text;
    return el;
  }

  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  // Format helpers
  function fmtPct(n) {
    if (!isFinite(n)) return "—";
    return Math.round(n * 10) / 10 + "%";
  }
  function fmtNum(n, decimals) {
    if (!isFinite(n)) return "—";
    const d = decimals == null ? 1 : decimals;
    const mul = Math.pow(10, d);
    return String(Math.round(n * mul) / mul);
  }
  function fmtTime(secs) {
    if (!isFinite(secs) || secs < 0) return "—";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    if (m < 1) return s + "s";
    if (s === 0) return m + "m";
    // U+00A0 non-breaking space — keeps "55m 33s" on one line inside
    // the KPI card. Without this, the regular space could wrap on
    // narrow widths, producing an awkward two-line value.
    return m + "m\u00A0" + s + "s";
  }

  // -----------------------------------------------------------------
  // Data schema bridges — defensive readers for fields that are
  // stored in inconsistent shapes across versions of the platform.
  // -----------------------------------------------------------------
  //
  // FIX (May 23, Round 7 hotfix): the submission upload helper
  // (firebase-client.js) stores time-used as a STRING in the format
  // "Xm Ys" / "Xm" / "Ys", NOT as a numeric seconds field. Earlier
  // analytics code assumed `s.timeUsed` was already a number of
  // seconds — every test failed `typeof === "number"`, so the time
  // chart and time-KPI showed empty.
  //
  // Accepts:
  //   number          → returned as-is (assumed seconds)
  //   "Xm Ys"         → X*60 + Y
  //   "Xm"            → X*60
  //   "Ys"            → Y
  //   "Xm\u00A0Ys"    → same as "Xm Ys" (non-breaking space variant)
  //   anything else   → null
  function parseTimeUsed(v) {
    if (typeof v === "number" && isFinite(v) && v >= 0) return v;
    if (typeof v !== "string") return null;
    const txt = v.replace(/\u00A0/g, " ").trim();
    if (!txt) return null;
    let m = 0,
      s = 0,
      matched = false;
    const mMatch = txt.match(/(\d+)\s*m/i);
    if (mMatch) {
      m = parseInt(mMatch[1], 10);
      matched = true;
    }
    const sMatch = txt.match(/(\d+)\s*s/i);
    if (sMatch) {
      s = parseInt(sMatch[1], 10);
      matched = true;
    }
    if (!matched) {
      // Maybe plain digits — interpret as seconds
      const onlyDigits = txt.match(/^(\d+)$/);
      if (onlyDigits) return parseInt(onlyDigits[1], 10);
      return null;
    }
    return m * 60 + s;
  }

  // FIX (May 23, Round 7 hotfix): firebase-client.js does NOT save the
  // proctoring summary as a nested `proctorSummary` object — it
  // flattens it into top-level fields (`proctorRiskScore`,
  // `proctorRiskBand`, `proctorEventCounts`, `proctorTotalEvents`,
  // etc.). The earlier analytics code read `s.proctorSummary.riskBand`
  // which never existed → all proctoring charts showed empty.
  //
  // This helper normalizes both shapes (in case future versions of
  // the platform switch to nested storage, this still works) and
  // returns a single canonical object:
  //   { riskScore, riskBand, eventCounts, totalEvents, hasData }
  // hasData is true iff at least the risk-band field is present.
  function extractProctorData(s) {
    // Prefer flat fields (current storage layout)
    const flatHasBand = typeof s.proctorRiskBand === "string";
    const flatHasScore = typeof s.proctorRiskScore === "number";
    if (flatHasBand || flatHasScore) {
      return {
        riskScore: flatHasScore ? s.proctorRiskScore : 0,
        riskBand: flatHasBand ? s.proctorRiskBand : null,
        eventCounts:
          s.proctorEventCounts && typeof s.proctorEventCounts === "object"
            ? s.proctorEventCounts
            : {},
        totalEvents:
          typeof s.proctorTotalEvents === "number" ? s.proctorTotalEvents : 0,
        hasData: true,
      };
    }
    // Fall back to nested shape (defensive, for hypothetical future
    // schema or any legacy data that does store it nested)
    const nested = s.proctorSummary;
    if (nested && typeof nested === "object") {
      return {
        riskScore: typeof nested.riskScore === "number" ? nested.riskScore : 0,
        riskBand:
          typeof nested.riskBand === "string" ? nested.riskBand : null,
        eventCounts:
          nested.eventCounts && typeof nested.eventCounts === "object"
            ? nested.eventCounts
            : {},
        totalEvents:
          typeof nested.totalEvents === "number" ? nested.totalEvents : 0,
        hasData: true,
      };
    }
    return {
      riskScore: 0,
      riskBand: null,
      eventCounts: {},
      totalEvents: 0,
      hasData: false,
    };
  }

  // -----------------------------------------------------------------
  // Module state
  // -----------------------------------------------------------------
  // _allSubmissions: latest fetch from Firestore (already filtered by
  //                  examId on the client). Group filter is applied
  //                  on top of this for chart rendering.
  // _exams:          list of exams the instructor can analyze.
  // _allowedGroups:  groups the current instructor may view.
  //                  null = super admin (sees all groups), [] = none.
  let _allSubmissions = [];
  let _exams = [];
  let _allowedGroups = [];
  let _selectedExamId = "";
  let _selectedGroup = "";

  // -----------------------------------------------------------------
  // State view helpers
  // -----------------------------------------------------------------
  function setState(name) {
    const states = {
      loading: $("anLoadingState"),
      empty: $("anEmptyState"),
      error: $("anErrorState"),
    };
    Object.keys(states).forEach(function (k) {
      if (states[k]) states[k].style.display = k === name ? "" : "none";
    });
    // KPI + chart sections shown only when state === "data"
    const dataSections = [
      "anKpiSection",
      "anChartsRow1",
      "anChartsRow2",
      "anChartsRow3",
    ];
    dataSections.forEach(function (id) {
      const el = $(id);
      if (el) el.style.display = name === "data" ? "" : "none";
    });
  }

  function showError(msg) {
    $("anErrorMessage").textContent = msg || "Unknown error.";
    setState("error");
  }

  // -----------------------------------------------------------------
  // INSTRUCTOR PERMISSIONS — keep in sync with the identical map at
  // the top of js/admin.js. Both files need the same source of truth
  // for who can see what.
  //
  // To grant access to a new instructor:
  //   1. Create their Firebase Auth account (Console → Authentication
  //      → Users → Add user)
  //   2. Add a lowercase-email entry to BOTH this map AND the matching
  //      one in admin.js
  //   3. role: "super"      → sees every group, has the "All groups" option
  //      role: "instructor" → sees only their assigned groups
  //   4. groups: null  for super admin (means "every group")
  //      groups: [...] for restricted (must be one or more group codes)
  //
  // FUTURE: refactor to live in a single shared file (e.g. expose on
  // window.FB.PERMISSIONS via firebase-config.js) so the two maps
  // can't go out of sync. Not blocking for the hackathon.
  // -----------------------------------------------------------------
  const INSTRUCTOR_PERMISSIONS = {
    // Super admin — sees all groups
    "u.tursunaliev@npuu.uz": {
      role: "super",
      groups: null,
    },
    // Restricted instructors
    "a.ashurov@npuu.uz": {
      role: "instructor",
      groups: ["FM3", "FM6"],
    },
    "b.tulkinov@npuu.uz": {
      role: "instructor",
      groups: ["FM1", "FM2", "FIT1", "FIT2", "FIT3", "FIT4"],
    },
    "m.khaydarov@npuu.uz": {
      role: "instructor",
      groups: ["FAR3", "FIT6", "FM7"],
    },
  };

  function permissionFor(email) {
    if (!email) return { role: "instructor", groups: [] };
    const key = String(email).trim().toLowerCase();
    if (INSTRUCTOR_PERMISSIONS[key]) return INSTRUCTOR_PERMISSIONS[key];
    // Default for any signed-in instructor whose email isn't in the
    // map: treat as restricted with no group access. Safer default.
    return { role: "instructor", groups: [] };
  }

  // -----------------------------------------------------------------
  // Auth gate — mirrors admin.js exactly. Reads permissions from the
  // in-file map above; does NOT query Firestore for an /instructors
  // document (that collection doesn't exist in this project).
  // -----------------------------------------------------------------
  function initAuthGate() {
    if (!window.fbAuth || !window.fbDb) {
      showError("Firebase failed to initialize. Refresh the page.");
      return;
    }
    window.fbAuth.onAuthStateChanged(function (user) {
      // Must be a password-based instructor account. Anonymous (student)
      // sessions and unauthenticated visits bounce to login.
      const isInstructor =
        user &&
        user.providerData &&
        user.providerData.length &&
        user.providerData[0].providerId === "password";
      if (!isInstructor) {
        window.location.href = "login.html";
        return;
      }

      $("adminEmail").textContent = user.email || "(instructor)";

      // Resolve permission profile from the in-file map.
      const perm = permissionFor(user.email);
      // _allowedGroups follows the existing convention used elsewhere
      // in this file:
      //   null   → super admin, sees all groups
      //   [...]  → restricted to the named groups
      _allowedGroups = perm.role === "super" ? null : (perm.groups || []);

      populateGroupFilter();
      loadExams();
    });

    // Logout button
    $("logoutBtn").addEventListener("click", function () {
      window.fbAuth
        .signOut()
        .then(function () {
          window.location.href = "login.html";
        })
        .catch(function () {
          window.location.href = "login.html";
        });
    });
  }

  // -----------------------------------------------------------------
  // Group filter (depends on the instructor's allowedGroups)
  // -----------------------------------------------------------------
  function populateGroupFilter() {
    const sel = $("anFilterGroup");
    sel.innerHTML = "";
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "All groups";
    sel.appendChild(allOpt);

    // _allowedGroups: null  → super admin → use full EXAM_GROUPS list
    //                  []   → no groups (should be impossible if doc exists)
    //                  [a,b]→ restricted list
    const groups =
      _allowedGroups == null
        ? (window.FB && window.FB.GROUPS) || []
        : _allowedGroups;

    groups.forEach(function (g) {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      sel.appendChild(opt);
    });

    sel.addEventListener("change", function () {
      _selectedGroup = sel.value;
      renderEverything();
    });
  }

  // -----------------------------------------------------------------
  // Exam list — fetch + populate the exam dropdown
  // -----------------------------------------------------------------
  function loadExams() {
    setState("loading");
    window.fbDb
      .collection("exams")
      .orderBy("updatedAt", "desc")
      .limit(50)
      .get()
      .then(function (snap) {
        _exams = [];
        snap.forEach(function (doc) {
          _exams.push({ id: doc.id, ...doc.data() });
        });

        const sel = $("anFilterExam");
        sel.innerHTML = "";
        if (!_exams.length) {
          const opt = document.createElement("option");
          opt.value = "";
          opt.textContent = "No exams found";
          sel.appendChild(opt);
          $("anEmptyTitle").textContent = "No exams configured";
          $("anEmptyMessage").textContent =
            "Create an exam in the Dashboard first, then return here once " +
            "students have submitted.";
          setState("empty");
          return;
        }

        _exams.forEach(function (ex) {
          const opt = document.createElement("option");
          opt.value = ex.id;
          opt.textContent = examLabel(ex);
          sel.appendChild(opt);
        });

        _selectedExamId = _exams[0].id;
        sel.value = _selectedExamId;
        sel.addEventListener("change", function () {
          _selectedExamId = sel.value;
          loadSubmissions();
        });

        loadSubmissions();
      })
      .catch(function (err) {
        showError("Failed to load exams: " + (err.message || err.code));
      });
  }

  function examLabel(ex) {
    // Format: "Programming 1 — Final Exam (Spring 2025-2026)"
    const course = ex.course || "Course";
    const typeRaw = ex.examType || "";
    const typeMap = {
      midterm: "Midterm",
      final: "Final Exam",
      resit: "Resit",
      retake1: "Retake 1",
      retake2: "Retake 2",
    };
    const type = typeMap[typeRaw] || typeRaw || "Exam";
    const sem = ex.semester
      ? ex.semester.charAt(0).toUpperCase() + ex.semester.slice(1)
      : "";
    const yr = ex.academicYear || "";
    const tail = [sem, yr].filter(Boolean).join(" ");
    return course + " — " + type + (tail ? " (" + tail + ")" : "");
  }

  // -----------------------------------------------------------------
  // Submission fetch — same query shape as admin.js loadSubmissions
  // -----------------------------------------------------------------
  function loadSubmissions() {
    if (!_selectedExamId) return;
    setState("loading");

    window.fbDb
      .collection("submissions")
      .orderBy("submittedAt", "desc")
      .limit(500)
      .get()
      .then(function (snap) {
        const rows = [];
        snap.forEach(function (doc) {
          const d = doc.data();
          // Exam-scope filter
          if (d.examId !== _selectedExamId) return;
          // Auth-scope filter: super admin (null) sees all groups
          if (_allowedGroups && _allowedGroups.indexOf(d.group) === -1) return;
          rows.push({ id: doc.id, ...d });
        });
        _allSubmissions = rows;
        renderEverything();
      })
      .catch(function (err) {
        showError("Failed to load submissions: " + (err.message || err.code));
      });
  }

  // -----------------------------------------------------------------
  // Master render — applies group filter on top of _allSubmissions,
  // then dispatches to each chart's render function.
  // -----------------------------------------------------------------
  function renderEverything() {
    const subs = _selectedGroup
      ? _allSubmissions.filter(function (s) {
          return s.group === _selectedGroup;
        })
      : _allSubmissions;

    if (!subs.length) {
      $("anEmptyTitle").textContent = "No submissions yet";
      $("anEmptyMessage").textContent = _selectedGroup
        ? "No submissions in group " +
          _selectedGroup +
          " for this exam yet. Try a different group or check back later."
        : "Once students complete this exam, you'll see scores, timing, and " +
          "proctoring analytics here.";
      setState("empty");
      return;
    }

    setState("data");
    renderKpis(subs);
    renderScoreChart(subs);
    renderTimeChart(subs);
    renderProctorChart(subs);
    renderRiskDonut(subs);
    renderMethodChart(subs);
    renderRiskTable(subs);
  }

  // =================================================================
  // KPI CARDS
  // =================================================================
  function renderKpis(subs) {
    const total = subs.length;

    // Average final grade — pulls finalGrade if present, otherwise
    // synthesizes from mcScore + aiGrading.totalCoding. Either way,
    // we normalize against the per-exam total max (100 by default).
    const grades = subs
      .map(function (s) {
        return computeFinalGrade(s);
      })
      .filter(function (g) {
        return g != null && isFinite(g);
      });
    const avgGrade = grades.length
      ? grades.reduce(function (a, b) {
          return a + b;
        }, 0) / grades.length
      : NaN;
    const passCount = grades.filter(function (g) {
      return g >= 50;
    }).length;
    const passRate = grades.length ? (passCount / grades.length) * 100 : NaN;

    // Avg completion time (seconds)
    const times = subs
      .map(function (s) {
        return parseTimeUsed(s.timeUsed);
      })
      .filter(function (t) {
        return t != null && t > 0;
      });
    const avgTime = times.length
      ? times.reduce(function (a, b) {
          return a + b;
        }, 0) / times.length
      : NaN;

    // Total proctoring events
    let totalEvents = 0;
    subs.forEach(function (s) {
      const p = extractProctorData(s);
      if (p.hasData) totalEvents += p.totalEvents;
    });

    // AI grading completion
    const aiGraded = subs.filter(function (s) {
      return s.aiGrading && s.aiGrading.status === "graded";
    }).length;

    // Paint
    $("anKpiTotal").textContent = total;
    $("anKpiTotalSub").textContent =
      total === 1 ? "exam submission" : "exam submissions";

    $("anKpiAvg").textContent = isFinite(avgGrade)
      ? fmtNum(avgGrade, 1) + "/100"
      : "—";
    $("anKpiAvgSub").textContent = grades.length
      ? "across " + grades.length + " graded"
      : "no graded submissions yet";

    $("anKpiPass").textContent = isFinite(passRate) ? fmtPct(passRate) : "—";
    $("anKpiPassSub").textContent = grades.length
      ? passCount + " of " + grades.length + " ≥ 50"
      : "≥ 50% threshold";

    $("anKpiTime").textContent = isFinite(avgTime) ? fmtTime(avgTime) : "—";
    $("anKpiTimeSub").textContent = times.length
      ? "across " + times.length + " submissions"
      : "no timing data";

    $("anKpiEvents").textContent = totalEvents;
    $("anKpiEventsSub").textContent =
      totalEvents === 1
        ? "anomaly across all students"
        : "anomalies across all students";

    $("anKpiAiGraded").textContent = aiGraded;
    $("anKpiAiGradedSub").textContent =
      aiGraded + " / " + total + " AI-graded";
  }

  // Final grade computation: prefer stored finalGrade; otherwise
  // mcScore + ai or instructor coding total. Returns null if neither.
  function computeFinalGrade(s) {
    if (typeof s.finalGrade === "number") return s.finalGrade;
    const mc = typeof s.mcScore === "number" ? s.mcScore : null;
    let coding = null;
    if (s.instructorGrading && typeof s.instructorGrading.totalCoding === "number") {
      coding = s.instructorGrading.totalCoding;
    } else if (s.aiGrading && typeof s.aiGrading.totalCoding === "number") {
      coding = s.aiGrading.totalCoding;
    }
    if (mc == null && coding == null) return null;
    return (mc || 0) + (coding || 0);
  }

  // =================================================================
  // SCORE DISTRIBUTION HISTOGRAM
  // =================================================================
  function renderScoreChart(subs) {
    const svg = $("anScoreChart");
    clearSvg(svg);

    const grades = subs
      .map(computeFinalGrade)
      .filter(function (g) {
        return g != null && isFinite(g);
      });

    if (!grades.length) {
      renderChartEmpty(svg, "No graded submissions yet", 600, 280);
      $("anScoreStats").textContent = "";
      return;
    }

    // Bin into 0-9, 10-19, ... 90-100 (last bin includes 100 too)
    const bins = new Array(10).fill(0);
    grades.forEach(function (g) {
      let idx = Math.floor(g / 10);
      if (idx > 9) idx = 9;
      if (idx < 0) idx = 0;
      bins[idx]++;
    });

    const maxCount = Math.max(...bins);
    const w = 600;
    const h = 280;
    const padL = 44;
    const padR = 20;
    const padT = 20;
    const padB = 44;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const barGap = 6;
    const barW = (chartW - barGap * 9) / 10;

    // Y-axis grid + labels (4 ticks)
    const ticks = niceTicks(maxCount, 4);
    ticks.forEach(function (tval) {
      const y = padT + chartH - (tval / ticks[ticks.length - 1]) * chartH;
      svg.appendChild(
        svgEl("line", {
          x1: padL,
          y1: y,
          x2: w - padR,
          y2: y,
          stroke: "#e5e7eb",
          "stroke-width": 1,
          "stroke-dasharray": tval === 0 ? "0" : "3 3",
        }),
      );
      svg.appendChild(
        svgEl(
          "text",
          {
            x: padL - 8,
            y: y + 4,
            "text-anchor": "end",
            "font-size": 11,
            "font-family": "Inter, system-ui, sans-serif",
            fill: "#6b7280",
          },
          String(tval),
        ),
      );
    });

    // Bars + x-axis labels
    bins.forEach(function (count, i) {
      const x = padL + i * (barW + barGap);
      const barH = (count / ticks[ticks.length - 1]) * chartH;
      const y = padT + chartH - barH;

      // Color gradient: red (low scores) → amber (mid) → green (high)
      const color = scoreBinColor(i);

      svg.appendChild(
        svgEl("rect", {
          x: x,
          y: y,
          width: barW,
          height: Math.max(barH, count > 0 ? 2 : 0),
          fill: color,
          rx: 4,
          ry: 4,
        }),
      );

      // Count label above bar (only if count > 0)
      if (count > 0) {
        svg.appendChild(
          svgEl(
            "text",
            {
              x: x + barW / 2,
              y: y - 6,
              "text-anchor": "middle",
              "font-size": 11,
              "font-weight": 600,
              "font-family": "Inter, system-ui, sans-serif",
              fill: "#1f2937",
            },
            String(count),
          ),
        );
      }

      // X-axis label
      const xLabel = i * 10 + "–" + (i === 9 ? 100 : i * 10 + 9);
      svg.appendChild(
        svgEl(
          "text",
          {
            x: x + barW / 2,
            y: padT + chartH + 18,
            "text-anchor": "middle",
            "font-size": 10,
            "font-family": "Inter, system-ui, sans-serif",
            fill: "#6b7280",
          },
          xLabel,
        ),
      );
    });

    // X-axis label
    svg.appendChild(
      svgEl(
        "text",
        {
          x: padL + chartW / 2,
          y: h - 8,
          "text-anchor": "middle",
          "font-size": 11,
          "font-weight": 600,
          "font-family": "Inter, system-ui, sans-serif",
          fill: "#374151",
        },
        "Final grade (out of 100)",
      ),
    );

    // Stats line
    const mean = grades.reduce(function (a, b) {
      return a + b;
    }, 0) / grades.length;
    const sorted = grades.slice().sort(function (a, b) {
      return a - b;
    });
    const median =
      sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const variance =
      grades.reduce(function (acc, g) {
        return acc + (g - mean) * (g - mean);
      }, 0) / grades.length;
    const stddev = Math.sqrt(variance);
    $("anScoreStats").innerHTML =
      "<b>Mean:</b> " +
      fmtNum(mean, 1) +
      "  ·  <b>Median:</b> " +
      fmtNum(median, 1) +
      "  ·  <b>Std dev:</b> " +
      fmtNum(stddev, 1);
  }

  function scoreBinColor(binIdx) {
    // 0-1 → red, 2-3 → orange, 4-5 → amber, 6-7 → green, 8-9 → deep green
    const colors = [
      "#dc2626", // 0-9   red
      "#ef4444", // 10-19 red
      "#f97316", // 20-29 orange (Sinov ember)
      "#fb923c", // 30-39 light orange
      "#f59e0b", // 40-49 amber
      "#facc15", // 50-59 yellow
      "#84cc16", // 60-69 lime
      "#22c55e", // 70-79 green
      "#16a34a", // 80-89 deeper green
      "#15803d", // 90-100 deep green
    ];
    return colors[binIdx] || "#9ca3af";
  }

  // niceTicks: produce a small ascending array of Y-axis tick values
  // that ends at or just above `max`. Always includes 0.
  function niceTicks(max, targetCount) {
    if (!isFinite(max) || max <= 0) return [0, 1, 2, 3, 4];
    const raw = max / targetCount;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let step;
    if (norm < 1.5) step = 1 * mag;
    else if (norm < 3) step = 2 * mag;
    else if (norm < 7) step = 5 * mag;
    else step = 10 * mag;
    step = Math.max(step, 1);
    const ticks = [];
    for (let v = 0; v <= max + step / 2; v += step) {
      ticks.push(Math.round(v));
    }
    if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  }

  // =================================================================
  // TIME-TO-COMPLETION DISTRIBUTION
  // =================================================================
  function renderTimeChart(subs) {
    const svg = $("anTimeChart");
    clearSvg(svg);

    const times = subs
      .map(function (s) {
        const sec = parseTimeUsed(s.timeUsed);
        return sec != null ? sec / 60 : null; // in minutes
      })
      .filter(function (t) {
        return t != null && t >= 0;
      });

    if (!times.length) {
      renderChartEmpty(svg, "No timing data available", 600, 280);
      $("anTimeStats").textContent = "";
      return;
    }

    // Find exam duration to set bin range; default 100 if missing
    const exam = _exams.find(function (e) {
      return e.id === _selectedExamId;
    });
    const duration =
      exam && typeof exam.duration === "number" && exam.duration > 0
        ? exam.duration
        : 100;

    // 10 equal bins covering 0 → duration (cap times at duration for binning)
    const binCount = 10;
    const binSize = duration / binCount;
    const bins = new Array(binCount).fill(0);
    times.forEach(function (t) {
      let idx = Math.floor(t / binSize);
      if (idx >= binCount) idx = binCount - 1;
      if (idx < 0) idx = 0;
      bins[idx]++;
    });

    const maxCount = Math.max(...bins);
    const w = 600;
    const h = 280;
    const padL = 44;
    const padR = 20;
    const padT = 20;
    const padB = 44;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const barGap = 6;
    const barW = (chartW - barGap * (binCount - 1)) / binCount;

    const ticks = niceTicks(maxCount, 4);
    ticks.forEach(function (tval) {
      const y = padT + chartH - (tval / ticks[ticks.length - 1]) * chartH;
      svg.appendChild(
        svgEl("line", {
          x1: padL,
          y1: y,
          x2: w - padR,
          y2: y,
          stroke: "#e5e7eb",
          "stroke-width": 1,
          "stroke-dasharray": tval === 0 ? "0" : "3 3",
        }),
      );
      svg.appendChild(
        svgEl(
          "text",
          {
            x: padL - 8,
            y: y + 4,
            "text-anchor": "end",
            "font-size": 11,
            "font-family": "Inter, system-ui, sans-serif",
            fill: "#6b7280",
          },
          String(tval),
        ),
      );
    });

    bins.forEach(function (count, i) {
      const x = padL + i * (barW + barGap);
      const barH = (count / ticks[ticks.length - 1]) * chartH;
      const y = padT + chartH - barH;

      svg.appendChild(
        svgEl("rect", {
          x: x,
          y: y,
          width: barW,
          height: Math.max(barH, count > 0 ? 2 : 0),
          fill: "#2563EB",
          opacity: 0.75 + (i / binCount) * 0.25, // deeper as time progresses
          rx: 4,
          ry: 4,
        }),
      );

      if (count > 0) {
        svg.appendChild(
          svgEl(
            "text",
            {
              x: x + barW / 2,
              y: y - 6,
              "text-anchor": "middle",
              "font-size": 11,
              "font-weight": 600,
              "font-family": "Inter, system-ui, sans-serif",
              fill: "#1f2937",
            },
            String(count),
          ),
        );
      }

      const binStart = Math.round(i * binSize);
      const binEnd = Math.round((i + 1) * binSize);
      svg.appendChild(
        svgEl(
          "text",
          {
            x: x + barW / 2,
            y: padT + chartH + 18,
            "text-anchor": "middle",
            "font-size": 10,
            "font-family": "Inter, system-ui, sans-serif",
            fill: "#6b7280",
          },
          binStart + "–" + binEnd,
        ),
      );
    });

    svg.appendChild(
      svgEl(
        "text",
        {
          x: padL + chartW / 2,
          y: h - 8,
          "text-anchor": "middle",
          "font-size": 11,
          "font-weight": 600,
          "font-family": "Inter, system-ui, sans-serif",
          fill: "#374151",
        },
        "Minutes spent (allowed: " + duration + " min)",
      ),
    );

    const mean =
      times.reduce(function (a, b) {
        return a + b;
      }, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    $("anTimeStats").innerHTML =
      "<b>Avg:</b> " +
      fmtNum(mean, 1) +
      " min  ·  <b>Min:</b> " +
      fmtNum(min, 1) +
      " min  ·  <b>Max:</b> " +
      fmtNum(max, 1) +
      " min";
  }

  // =================================================================
  // PROCTORING ANOMALY TYPES — horizontal bar chart
  // =================================================================
  function renderProctorChart(subs) {
    const svg = $("anProctorChart");
    clearSvg(svg);

    // Aggregate counts across submissions
    const eventTypes = [
      { key: "phone_visible", label: "Phone visible" },
      { key: "no_face", label: "No face detected" },
      { key: "face_turned_away", label: "Looking away" },
      { key: "multiple_faces", label: "Multiple faces" },
      { key: "second_person", label: "Second person" },
      { key: "notes_visible", label: "Notes visible" },
      { key: "second_screen", label: "Second screen" },
      { key: "earphones_visible", label: "Earphones 🎧" },
      { key: "camera_lost", label: "Camera lost" },
    ];
    const counts = {};
    eventTypes.forEach(function (t) {
      counts[t.key] = 0;
    });
    let totalProctored = 0;
    subs.forEach(function (s) {
      const p = extractProctorData(s);
      const ec = p.eventCounts;
      let hadCount = false;
      eventTypes.forEach(function (t) {
        if (typeof ec[t.key] === "number") {
          counts[t.key] += ec[t.key];
          hadCount = true;
        }
      });
      if (p.hasData || hadCount) {
        totalProctored++;
      }
    });

    const total = eventTypes.reduce(function (acc, t) {
      return acc + counts[t.key];
    }, 0);

    if (total === 0) {
      renderChartEmpty(svg, "No proctoring anomalies detected — clean exam ✓", 720, 280);
      $("anProctorStats").textContent =
        totalProctored > 0
          ? "Proctoring ran on " + totalProctored + " submission(s), no events flagged."
          : "No submissions have proctoring data yet.";
      return;
    }

    // Sort event types by count descending for impact
    const sorted = eventTypes.slice().sort(function (a, b) {
      return counts[b.key] - counts[a.key];
    });

    const w = 720;
    const h = 280;
    const padL = 140;
    const padR = 60;
    const padT = 12;
    const padB = 12;
    const rowH = (h - padT - padB) / sorted.length;
    const maxCount = Math.max(...sorted.map((t) => counts[t.key])) || 1;
    const barAreaW = w - padL - padR;

    sorted.forEach(function (t, i) {
      const y = padT + i * rowH + rowH / 2;
      const c = counts[t.key];
      const barW = (c / maxCount) * barAreaW;
      const barH = Math.max(rowH * 0.55, 16);

      // Label (left, right-aligned)
      svg.appendChild(
        svgEl(
          "text",
          {
            x: padL - 10,
            y: y + 4,
            "text-anchor": "end",
            "font-size": 12,
            "font-family": "Inter, system-ui, sans-serif",
            fill: "#1f2937",
            "font-weight": c > 0 ? 600 : 400,
          },
          t.label,
        ),
      );

      // Track (gray background bar)
      svg.appendChild(
        svgEl("rect", {
          x: padL,
          y: y - barH / 2,
          width: barAreaW,
          height: barH,
          fill: "#f3f4f6",
          rx: 4,
          ry: 4,
        }),
      );

      // Bar (only if count > 0)
      if (c > 0) {
        svg.appendChild(
          svgEl("rect", {
            x: padL,
            y: y - barH / 2,
            width: barW,
            height: barH,
            fill: proctorEventColor(t.key),
            rx: 4,
            ry: 4,
          }),
        );
      }

      // Count label (right)
      svg.appendChild(
        svgEl(
          "text",
          {
            x: padL + Math.max(barW, 0) + 8,
            y: y + 4,
            "text-anchor": "start",
            "font-size": 12,
            "font-weight": 600,
            "font-family": "Inter, system-ui, sans-serif",
            fill: c > 0 ? "#1f2937" : "#9ca3af",
          },
          String(c),
        ),
      );
    });

    $("anProctorStats").innerHTML =
      "<b>" +
      total +
      "</b> total event" +
      (total === 1 ? "" : "s") +
      " across <b>" +
      totalProctored +
      "</b> submission" +
      (totalProctored === 1 ? "" : "s") +
      " with proctoring data";
  }

  function proctorEventColor(key) {
    // Phone & second-person are the most serious → darkest red
    const colors = {
      phone_visible: "#dc2626",
      second_person: "#dc2626",
      notes_visible: "#dc2626",
      earphones_visible: "#dc2626",
      multiple_faces: "#ef4444",
      face_turned_away: "#f97316",
      no_face: "#f59e0b",
      second_screen: "#ef4444",
      camera_lost: "#6b7280",
    };
    return colors[key] || "#6b7280";
  }

  // =================================================================
  // RISK BAND DONUT
  // =================================================================
  function renderRiskDonut(subs) {
    const svg = $("anRiskDonut");
    const legend = $("anRiskLegend");
    clearSvg(svg);
    legend.innerHTML = "";

    const bands = [
      { key: "clean", label: "Clean", color: "#16a34a" },
      { key: "minor", label: "Minor", color: "#facc15" },
      { key: "significant", label: "Significant", color: "#f97316" },
      { key: "critical", label: "Critical", color: "#dc2626" },
    ];
    const counts = { clean: 0, minor: 0, significant: 0, critical: 0 };
    let totalWithProctor = 0;
    subs.forEach(function (s) {
      const p = extractProctorData(s);
      if (p.riskBand && counts[p.riskBand] != null) {
        counts[p.riskBand]++;
        totalWithProctor++;
      }
    });

    if (totalWithProctor === 0) {
      renderChartEmpty(svg, "No proctoring data", 280, 280);
      return;
    }

    // Build donut
    const cx = 140;
    const cy = 140;
    const rOuter = 90;
    const rInner = 56;
    let start = -Math.PI / 2; // start at 12 o'clock

    bands.forEach(function (b) {
      const c = counts[b.key];
      if (c === 0) return;
      const frac = c / totalWithProctor;
      const end = start + frac * Math.PI * 2;
      const path = donutArcPath(cx, cy, rOuter, rInner, start, end);
      svg.appendChild(
        svgEl("path", {
          d: path,
          fill: b.color,
        }),
      );
      start = end;
    });

    // Center label: total
    svg.appendChild(
      svgEl(
        "text",
        {
          x: cx,
          y: cy - 4,
          "text-anchor": "middle",
          "font-size": 28,
          "font-weight": 700,
          "font-family": "Bricolage Grotesque, Inter, system-ui, sans-serif",
          fill: "#1f2937",
        },
        String(totalWithProctor),
      ),
    );
    svg.appendChild(
      svgEl(
        "text",
        {
          x: cx,
          y: cy + 18,
          "text-anchor": "middle",
          "font-size": 11,
          "font-family": "Inter, system-ui, sans-serif",
          fill: "#6b7280",
        },
        totalWithProctor === 1 ? "submission" : "submissions",
      ),
    );

    // Legend
    bands.forEach(function (b) {
      const c = counts[b.key];
      const pct = (c / totalWithProctor) * 100;
      const li = document.createElement("li");
      li.innerHTML =
        '<span class="sn-an-legend-swatch" style="background:' +
        b.color +
        '"></span>' +
        '<span class="sn-an-legend-label">' +
        b.label +
        "</span>" +
        '<span class="sn-an-legend-value">' +
        c +
        " · " +
        fmtPct(pct) +
        "</span>";
      legend.appendChild(li);
    });
  }

  function donutArcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
    // Defensive: a full-circle arc (one band has 100%) can't be drawn
    // with a single arc path because start == end. Split into two halves.
    const sweep = endAngle - startAngle;
    if (sweep >= Math.PI * 2 - 1e-6) {
      const mid = startAngle + Math.PI;
      return (
        donutArcPath(cx, cy, rOuter, rInner, startAngle, mid) +
        " " +
        donutArcPath(cx, cy, rOuter, rInner, mid, endAngle)
      );
    }

    const x1 = cx + Math.cos(startAngle) * rOuter;
    const y1 = cy + Math.sin(startAngle) * rOuter;
    const x2 = cx + Math.cos(endAngle) * rOuter;
    const y2 = cy + Math.sin(endAngle) * rOuter;
    const x3 = cx + Math.cos(endAngle) * rInner;
    const y3 = cy + Math.sin(endAngle) * rInner;
    const x4 = cx + Math.cos(startAngle) * rInner;
    const y4 = cy + Math.sin(startAngle) * rInner;
    const largeArc = sweep > Math.PI ? 1 : 0;
    return (
      "M " +
      x1 +
      " " +
      y1 +
      " A " +
      rOuter +
      " " +
      rOuter +
      " 0 " +
      largeArc +
      " 1 " +
      x2 +
      " " +
      y2 +
      " L " +
      x3 +
      " " +
      y3 +
      " A " +
      rInner +
      " " +
      rInner +
      " 0 " +
      largeArc +
      " 0 " +
      x4 +
      " " +
      y4 +
      " Z"
    );
  }

  // =================================================================
  // SUBMISSION METHOD BREAKDOWN — stacked horizontal bar
  // =================================================================
  function renderMethodChart(subs) {
    const svg = $("anMethodChart");
    clearSvg(svg);

    const segments = [
      { key: "firebase_manual", label: "Regular", color: "#16a34a" },
      { key: "firebase_auto", label: "Auto-submit", color: "#f59e0b" },
      { key: "google_form", label: "Google Form fallback", color: "#dc2626" },
      { key: "unknown", label: "Unknown", color: "#9ca3af" },
    ];
    const counts = {
      firebase_manual: 0,
      firebase_auto: 0,
      google_form: 0,
      unknown: 0,
    };
    subs.forEach(function (s) {
      let m = s.uploadMethod || "unknown";
      if (m === "firebase") m = "firebase_manual";
      if (m === "google_form_fallback") m = "google_form";
      if (counts[m] == null) m = "unknown";
      counts[m]++;
    });
    const total = subs.length;

    const w = 600;
    const h = 220;
    const padL = 30;
    const padR = 30;
    const padT = 60;
    const barH = 50;
    const barAreaW = w - padL - padR;

    // Stacked bar
    let xCursor = padL;
    segments.forEach(function (seg) {
      const c = counts[seg.key];
      if (c === 0) return;
      const segW = (c / total) * barAreaW;
      svg.appendChild(
        svgEl("rect", {
          x: xCursor,
          y: padT,
          width: segW,
          height: barH,
          fill: seg.color,
        }),
      );
      // Inline count label if segment is wide enough
      if (segW > 40) {
        svg.appendChild(
          svgEl(
            "text",
            {
              x: xCursor + segW / 2,
              y: padT + barH / 2 + 4,
              "text-anchor": "middle",
              "font-size": 13,
              "font-weight": 700,
              "font-family": "Inter, system-ui, sans-serif",
              fill: "#ffffff",
            },
            c + " · " + fmtPct((c / total) * 100),
          ),
        );
      }
      xCursor += segW;
    });

    // Legend below bar
    let legendX = padL;
    const legendY = padT + barH + 30;
    segments.forEach(function (seg) {
      const c = counts[seg.key];
      if (c === 0) return;
      svg.appendChild(
        svgEl("rect", {
          x: legendX,
          y: legendY,
          width: 12,
          height: 12,
          fill: seg.color,
          rx: 2,
          ry: 2,
        }),
      );
      const text = seg.label + " (" + c + ")";
      svg.appendChild(
        svgEl(
          "text",
          {
            x: legendX + 18,
            y: legendY + 10,
            "text-anchor": "start",
            "font-size": 12,
            "font-family": "Inter, system-ui, sans-serif",
            fill: "#374151",
          },
          text,
        ),
      );
      legendX += 18 + estimateTextWidth(text, 12) + 20;
    });

    // Title above bar
    svg.appendChild(
      svgEl(
        "text",
        {
          x: padL,
          y: padT - 14,
          "text-anchor": "start",
          "font-size": 12,
          "font-family": "Inter, system-ui, sans-serif",
          fill: "#6b7280",
        },
        total + " total submission" + (total === 1 ? "" : "s"),
      ),
    );
  }

  // Rough width estimate (we don't get text metrics in SVG without measure).
  // Used to lay out legend items horizontally without overlap.
  function estimateTextWidth(text, fontSize) {
    return text.length * fontSize * 0.55;
  }

  // =================================================================
  // TOP RISK STUDENTS TABLE
  // =================================================================
  function renderRiskTable(subs) {
    const tbody = $("anRiskTbody");
    tbody.innerHTML = "";

    // Sort by risk score descending. Records without proctoring data
    // are sorted to the end with risk 0. We then take top 10.
    const ranked = subs
      .map(function (s) {
        const p = extractProctorData(s);
        return {
          name: [s.firstName, s.lastName].filter(Boolean).join(" ") || "—",
          group: s.group || "—",
          risk: p.riskScore,
          band: p.riskBand || "—",
          tabs: typeof s.tabSwitches === "number" ? s.tabSwitches : 0,
          grade: computeFinalGrade(s),
        };
      })
      .sort(function (a, b) {
        return b.risk - a.risk;
      })
      .slice(0, 10);

    if (!ranked.length || ranked[0].risk === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="sn-an-table-empty">' +
        "No risk-flagged submissions. All clean ✓</td></tr>";
      return;
    }

    ranked.forEach(function (r, i) {
      if (r.risk === 0) return; // hide the rest of clean rows
      const tr = document.createElement("tr");
      const bandClass = r.band ? "sn-an-band sn-an-band-" + r.band : "sn-an-band";
      tr.innerHTML =
        "<td>" +
        (i + 1) +
        "</td>" +
        "<td>" +
        esc(r.name) +
        "</td>" +
        "<td>" +
        esc(r.group) +
        "</td>" +
        '<td><span class="' +
        bandClass +
        '">' +
        r.risk +
        " · " +
        esc(r.band) +
        "</span></td>" +
        "<td>" +
        r.tabs +
        "</td>" +
        "<td>" +
        (r.grade != null ? fmtNum(r.grade, 0) + "/100" : "—") +
        "</td>";
      tbody.appendChild(tr);
    });
  }

  // =================================================================
  // Chart "empty" placeholder
  // =================================================================
  function renderChartEmpty(svg, message, w, h) {
    svg.appendChild(
      svgEl("rect", {
        x: 0,
        y: 0,
        width: w,
        height: h,
        fill: "#f9fafb",
        rx: 8,
        ry: 8,
      }),
    );
    svg.appendChild(
      svgEl(
        "text",
        {
          x: w / 2,
          y: h / 2 + 4,
          "text-anchor": "middle",
          "font-size": 13,
          "font-family": "Inter, system-ui, sans-serif",
          fill: "#9ca3af",
        },
        message,
      ),
    );
  }

  // -----------------------------------------------------------------
  // Wire-up
  // -----------------------------------------------------------------
  function init() {
    $("anRefreshBtn").addEventListener("click", function () {
      if (_selectedExamId) loadSubmissions();
    });
    $("anRetryBtn").addEventListener("click", function () {
      if (_selectedExamId) loadSubmissions();
      else loadExams();
    });
    initAuthGate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
