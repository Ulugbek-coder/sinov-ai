// =============================================================
// Admin Dashboard logic
// - Gate: only authenticated instructor (email/password) may view.
// - Schedule editor: read/write /schedules/{group}.
// - Submissions list: reverse-chronological, filter by group + method.
// =============================================================

(function () {
  const $ = (id) => document.getElementById(id);

  // ---------- Reusable modal dialog ----------
  // Returns a Promise that resolves with the clicked button's "value" (or null if dismissed via backdrop/Esc).
  // opts = { title, message (HTML string allowed), kind: 'info'|'warn'|'danger'|'success',
  //          icon: string (1-2 chars), buttons: [{label, value, style: 'primary'|'secondary'|'danger'}] }
  function openModal(opts) {
    return new Promise(function (resolve) {
      const modal = $("appModal");
      const iconEl = $("appModalIcon");
      const titleEl = $("appModalTitle");
      const bodyEl = $("appModalBody");
      const actionsEl = $("appModalActions");

      // Reset kind classes
      modal.className = "app-modal";
      if (opts.kind) modal.classList.add("kind-" + opts.kind);

      iconEl.textContent = opts.icon || "?";
      titleEl.textContent = opts.title || "";
      bodyEl.innerHTML = opts.message || "";

      // Buttons
      actionsEl.innerHTML = "";
      const buttons = opts.buttons || [
        { label: "OK", value: true, style: "primary" },
      ];
      buttons.forEach(function (b) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "app-modal-btn " + (b.style || "secondary");
        btn.textContent = b.label;
        btn.addEventListener("click", function () {
          close(b.value);
        });
        actionsEl.appendChild(btn);
      });

      function close(value) {
        modal.style.display = "none";
        document.removeEventListener("keydown", onKey);
        modal
          .querySelector(".app-modal-backdrop")
          .removeEventListener("click", onBackdrop);
        resolve(value);
      }
      function onKey(e) {
        if (e.key === "Escape") close(null);
      }
      function onBackdrop() {
        close(null);
      }
      document.addEventListener("keydown", onKey);
      modal
        .querySelector(".app-modal-backdrop")
        .addEventListener("click", onBackdrop);

      modal.style.display = "flex";
      // Focus first primary/danger button if present
      const firstPrimary = actionsEl.querySelector(
        ".app-modal-btn.primary, .app-modal-btn.danger",
      );
      if (firstPrimary) setTimeout(() => firstPrimary.focus(), 50);
    });
  }

  // Convenience wrappers
  function modalConfirm(opts) {
    return openModal({
      title: opts.title || "Please confirm",
      message: opts.message,
      kind: opts.kind || "warn",
      icon: opts.icon || "!",
      buttons: [
        {
          label: opts.cancelLabel || "Cancel",
          value: false,
          style: "secondary",
        },
        {
          label: opts.confirmLabel || "Continue",
          value: true,
          style: opts.confirmStyle || "primary",
        },
      ],
    });
  }
  function modalAlert(opts) {
    return openModal({
      title: opts.title || "Notice",
      message: opts.message,
      kind: opts.kind || "info",
      icon: opts.icon || "i",
      buttons: [{ label: opts.okLabel || "OK", value: true, style: "primary" }],
    });
  }

  // ---------- Auth gate ----------
  window.fbAuth.onAuthStateChanged(function (user) {
    // Must be a password-based instructor account (not anonymous).
    const isInstructor =
      user &&
      user.providerData &&
      user.providerData.length &&
      user.providerData[0].providerId === "password";
    if (!isInstructor) {
      window.location.href = "login.html";
      return;
    }
    // Resolve this instructor's permission profile (super admin or
    // restricted to a subset of groups).
    currentPerm = permissionFor(user.email);
    $("adminEmail").textContent = user.email || "(instructor)";
    init();
  });

  $("logoutBtn").addEventListener("click", function () {
    window.fbAuth.signOut().then(function () {
      window.location.href = "login.html";
    });
  });

  // ---------- Init ----------
  const GROUPS = (window.FB && window.FB.GROUPS) || [
    "FM1",
    "FM2",
    "FM3",
    "FM4",
    "FM5",
    "FM6",
    "FM7",
    "FIT1",
    "FIT2",
    "FIT3",
    "FIT4",
    "FIT5",
    "FIT6",
    "FAR1",
    "FAR2",
    "FAR3",
  ];

  // Per-instructor group access policy.
  //   - Super admin: sees ALL groups, can pick "All groups" in the filter.
  //   - Restricted instructors: see ONLY their assigned groups in the
  //     dropdown, no "All groups" option, and the submissions query
  //     hard-filters on the client AND in the displayed UI.
  // The list is keyed by lowercase email for case-insensitive matching.
  // To add or change permissions, edit this map and re-deploy.
  // (NOTE: This is UI-level enforcement. For real defense-in-depth,
  // you should also restrict reads on the submissions collection in
  // firestore.rules. The instructor accounts as a whole still need
  // read access to their submissions — adding email-keyed rules in
  // firestore.rules is a future hardening step.)
  const INSTRUCTOR_PERMISSIONS = {
    // Super admin — sees all groups
    "u.tursunaliev@npuu.uz": {
      role: "super",
      groups: null, // null = all groups
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

  // Holds the resolved permission for the currently-signed-in instructor.
  // Set inside the auth gate; null until auth resolves.
  let currentPerm = null;

  function permissionFor(email) {
    if (!email) return { role: "instructor", groups: [] };
    const key = String(email).trim().toLowerCase();
    if (INSTRUCTOR_PERMISSIONS[key]) return INSTRUCTOR_PERMISSIONS[key];
    // Default for any signed-in instructor whose email is not in the map:
    // treat as a restricted instructor with no group access. Safer default.
    return { role: "instructor", groups: [] };
  }

  // Returns an array of group codes the current user is allowed to see.
  // For super admins this is the full GROUPS array.
  function allowedGroups() {
    if (!currentPerm) return [];
    if (currentPerm.role === "super") return GROUPS.slice();
    return Array.isArray(currentPerm.groups) ? currentPerm.groups.slice() : [];
  }

  // Returns true if the given group code is visible to the current user.
  function canSeeGroup(groupCode) {
    if (!currentPerm) return false;
    if (currentPerm.role === "super") return true;
    return (currentPerm.groups || []).indexOf(groupCode) !== -1;
  }

  // Rebuild the <select id="subFilter"> dropdown based on allowedGroups().
  // For super admin: keep the "All groups" option + every group.
  // For restricted instructor: only their groups, no "All groups" option,
  // and pre-select the first allowed group.
  function applyGroupFilterToDropdown() {
    const sel = $("subFilter");
    if (!sel) return;
    const allowed = allowedGroups();
    sel.innerHTML = "";
    if (currentPerm && currentPerm.role === "super") {
      const allOpt = document.createElement("option");
      allOpt.value = "";
      allOpt.textContent = "All groups";
      sel.appendChild(allOpt);
    }
    allowed.forEach(function (g) {
      const o = document.createElement("option");
      o.value = g;
      o.textContent = g;
      sel.appendChild(o);
    });
    // If restricted and there's at least one option, default to the first
    // group (rather than empty string which would mean "all").
    if (currentPerm && currentPerm.role !== "super" && allowed.length > 0) {
      sel.value = allowed[0];
    }
  }

  function init() {
    applyGroupFilterToDropdown();
    const isSuper = currentPerm && currentPerm.role === "super";
    // Reveal the super-admin-only sections (Refresh Questions + Schedule
    // editor) only if this user is the super admin. Restricted instructors
    // see only the Submissions section.
    const superSections = $("superAdminSections");
    if (superSections) {
      superSections.style.display = isSuper ? "" : "none";
    }
    if (isSuper) {
      renderScheduleSkeleton();
      loadAllSchedules();
      // Question-refresh
      $("refreshQuestionsBtn").addEventListener("click", onRefreshQuestions);
      loadRefreshStatus();
    }
    // Exams section — visible to everyone (read-only for non-supers,
    // full CRUD for super admin). Initialised regardless of role.
    initExamsSection(isSuper);
    loadSubmissions();
    $("refreshBtn").addEventListener("click", loadSubmissions);
    $("subFilter").addEventListener("change", loadSubmissions);
    $("subMethod").addEventListener("change", loadSubmissions);
  }

  // =============================================================
  // EXAMS — Admin Dashboard exam settings (Stage 1)
  //   Card grid of exam configurations stored at /exams/{examId}
  //   where examId = `${uni}_${course}_${year}_${semester}_${type}`.
  //   Super admin can create / edit / delete / toggle active.
  //   Other instructors see the cards read-only (no menu, no
  //   New Exam button).
  // =============================================================

  // In-memory cache of fetched exam docs, keyed by doc ID.
  let _examDocs = [];
  // In-memory cache of fetched schedule docs, nested by examId then group:
  //   _schedulesByExamGroup[examId][group] = { startAt, endAt, ... }
  // Legacy /schedules data (untagged) is intentionally NOT cached here —
  // it stays invisible to the admin dashboard. Users who need to see
  // legacy submissions/schedules can use the older deployed app.
  let _schedulesByExamGroup = {};
  let _examIsSuper = false;
  let _editingExamId = null; // null = creating new
  // The exam card currently selected by the instructor (its _id), or null.
  let _selectedExamId = null;

  // Static option sources (matches the welcome page dropdowns).
  const EXAM_UNIVERSITIES = [
    {
      value: "NPUU",
      label: "National Pedagogical University of Uzbekistan (NPUU)",
    },
  ];
  const EXAM_COURSES = [{ value: "cpp1", label: "Programming 1 with C++" }];
  const EXAM_TYPES = [
    { value: "midterm", label: "Midterm Exam" },
    { value: "final", label: "Final Exam" },
    { value: "resit", label: "Resit Exam" },
    { value: "retake1", label: "Retake Exam 1" },
    { value: "retake2", label: "Retake Exam 2" },
  ];
  const EXAM_DEGREES = [
    { value: "bachelor1", label: "Bachelor — Year 1" },
    { value: "bachelor2", label: "Bachelor — Year 2" },
    { value: "bachelor3", label: "Bachelor — Year 3" },
    { value: "bachelor4", label: "Bachelor — Year 4" },
    { value: "master1", label: "Master — Year 1" },
    { value: "master2", label: "Master — Year 2" },
  ];
  const EXAM_FACULTIES = [
    { value: "exact-sciences", label: "School of Exact Sciences" },
    { value: "natural-sciences", label: "Faculty of Natural Sciences" },
    { value: "pre-school-education", label: "Faculty of Pre-School Education" },
  ];
  // Maps field-of-study code → list of group codes.
  const FIELD_GROUPS = {
    FM: ["FM1", "FM2", "FM3", "FM4", "FM5", "FM6", "FM7"],
    FIT: ["FIT1", "FIT2", "FIT3", "FIT4", "FIT5", "FIT6"],
    FAR: ["FAR1", "FAR2", "FAR3"],
  };
  const FIELD_LABELS = {
    FM: "Mathematics",
    FIT: "Information Technologies",
    FAR: "Artificial Intelligence",
  };

  // Expand an array of FoS codes into the full list of eligible group codes.
  function expandGroupsFromFields(fieldsOfStudy) {
    if (!fieldsOfStudy || !fieldsOfStudy.length) return [];
    const out = [];
    fieldsOfStudy.forEach(function (f) {
      const gs = FIELD_GROUPS[f];
      if (gs)
        gs.forEach(function (g) {
          if (out.indexOf(g) === -1) out.push(g);
        });
    });
    return out;
  }

  function _currentAcademicYear() {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    if (m >= 7) return y + "-" + (y + 1);
    return y - 1 + "-" + y;
  }
  function _currentSemester() {
    return new Date().getMonth() >= 7 ? "fall" : "spring";
  }
  function _yearOptions() {
    const current = _currentAcademicYear();
    const parts = current.split("-").map(Number);
    const prev = parts[0] - 1 + "-" + parts[0];
    const next = parts[1] + "-" + (parts[1] + 1);
    return [prev, current, next];
  }
  function _examIdFor(d) {
    // Composite key includes faculty so the same course can run under
    // different faculties (e.g. Exact Sciences vs Natural Sciences).
    // Legacy exams without a faculty default to "exact-sciences" for
    // backward compatibility — see openEditExamModal.
    return [
      d.university,
      d.faculty || "exact-sciences",
      d.course,
      d.academicYear,
      d.semester,
      d.examType,
    ].join("_");
  }
  function _examTypeLabel(t) {
    const entry = EXAM_TYPES.find(function (e) {
      return e.value === t;
    });
    return entry ? entry.label : t;
  }
  function _degreeLabel(d) {
    const entry = EXAM_DEGREES.find(function (e) {
      return e.value === d;
    });
    return entry ? entry.label : d || "";
  }
  function _facultyLabel(f) {
    const entry = EXAM_FACULTIES.find(function (e) {
      return e.value === f;
    });
    return entry ? entry.label : f || "";
  }
  function _fieldsLabel(arr) {
    if (!arr || !arr.length) return "—";
    return arr
      .map(function (f) {
        return f;
      })
      .join(", ");
  }
  function _courseLabel(c) {
    const entry = EXAM_COURSES.find(function (e) {
      return e.value === c;
    });
    return entry ? entry.label : c;
  }
  function _capitalize(s) {
    return s ? s[0].toUpperCase() + s.slice(1) : s;
  }
  function _formatRelativeTime(date) {
    if (!date) return "—";
    const now = new Date();
    const diffMs = now - date;
    const sec = Math.round(diffMs / 1000);
    if (sec < 60) return "just now";
    const min = Math.round(sec / 60);
    if (min < 60) return min + " min ago";
    const hr = Math.round(min / 60);
    if (hr < 24) return hr + " hr ago";
    const day = Math.round(hr / 24);
    if (day < 30) return day + " day" + (day === 1 ? "" : "s") + " ago";
    const mo = Math.round(day / 30);
    return mo + " mo ago";
  }
  function _escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Compute the badge state for one exam card based on its eligible
  // groups and the schedule cache.
  //   "created"          — no eligible group has a meaningful schedule
  //                        tagged with this examId
  //   "partially_ended"  — at least one tagged schedule exists, not all ended
  //   "ended"            — at least one tagged schedule exists, AND all of
  //                        them (across the eligible groups) have ended
  // Legacy /schedules entries (untagged) are not counted — see comment on
  // _schedulesByExamGroup above.
  function computeExamStatus(exam) {
    const eligible = expandGroupsFromFields(exam.fieldsOfStudy || []);
    if (eligible.length === 0) return "created";
    const bucket = _schedulesByExamGroup[exam._id] || {};
    const relevantSchedules = [];
    eligible.forEach(function (g) {
      const s = bucket[g];
      if (s && s.startAt && s.endAt) relevantSchedules.push(s);
    });
    if (relevantSchedules.length === 0) return "created";
    const now = new Date();
    const allEnded = relevantSchedules.every(function (s) {
      return s.endAt < now;
    });
    if (allEnded) return "ended";
    return "partially_ended";
  }

  function _statusLabel(s) {
    if (s === "created") return "Created";
    if (s === "partially_ended") return "Partially Ended";
    if (s === "ended") return "Ended";
    return s || "—";
  }
  // Map status → CSS class on .sn-exam-status
  function _statusClass(s) {
    if (s === "created") return "created";
    if (s === "partially_ended") return "partially-ended";
    if (s === "ended") return "exam-ended";
    return "";
  }

  // Read schedules for a SPECIFIC exam into the cache. The cache is
  // shared with computeExamStatus, which reads _schedulesByGroup[examId]
  // for that exam's eligible groups.
  //
  // For status computation we need to look up ALL exams' schedules so
  // each card gets the right badge. So instead of keying by group, we
  // key by examId, then by group:
  //   _schedulesByExamGroup[examId][group] = { startAt, endAt, ... }
  function loadSchedulesIntoCache() {
    _schedulesByExamGroup = {};
    if (!window.fbDb) return Promise.resolve();
    // Query the full /exam_schedules collection. With small data this is
    // fine; for scale, add a where("examId" IN [...]) on the loaded exam IDs.
    return window.fbDb
      .collection("exam_schedules")
      .get()
      .then(function (snap) {
        snap.forEach(function (doc) {
          const d = doc.data();
          if (!d.examId || !d.group) return;
          if (!_schedulesByExamGroup[d.examId]) {
            _schedulesByExamGroup[d.examId] = {};
          }
          _schedulesByExamGroup[d.examId][d.group] = {
            group: d.group,
            startAt: d.startAt && d.startAt.toDate ? d.startAt.toDate() : null,
            endAt: d.endAt && d.endAt.toDate ? d.endAt.toDate() : null,
            scheduledBy: d.updatedBy || d.scheduledBy || null,
          };
        });
      })
      .catch(function (err) {
        console.warn("[exam_schedules] load failed", err);
      });
  }

  function initExamsSection(isSuper) {
    _examIsSuper = !!isSuper;

    // Wire filter dropdowns
    populateExamFilterYearDropdown();
    const filterYear = $("examFilterYear");
    const filterSem = $("examFilterSemester");
    const filterStatus = $("examFilterStatus");
    if (filterYear) filterYear.addEventListener("change", renderExamGrid);
    if (filterSem) filterSem.addEventListener("change", renderExamGrid);
    if (filterStatus) filterStatus.addEventListener("change", renderExamGrid);

    // Show "New Exam" button only for super admin
    const newBtn = $("newExamBtn");
    if (newBtn) {
      newBtn.style.display = isSuper ? "" : "none";
      if (isSuper) newBtn.addEventListener("click", openCreateExamModal);
    }

    // Webcam feature master toggle (per-exam on/off). Clicking the
    // switch opens the webcam modal listing every created exam so the
    // instructor picks exactly which exams have the webcam feature
    // turned OFF. Available to every instructor.
    const webcamBtn = $("webcamToggleBtn");
    if (webcamBtn) {
      webcamBtn.addEventListener("click", openWebcamModal);
    }
    const webcamClose = $("webcamModalClose");
    if (webcamClose) webcamClose.addEventListener("click", closeWebcamModal);
    const webcamCancel = $("webcamCancel");
    if (webcamCancel) webcamCancel.addEventListener("click", closeWebcamModal);
    const webcamSave = $("webcamSave");
    if (webcamSave) webcamSave.addEventListener("click", onSaveWebcamSettings);
    const webcamModal = $("webcamModal");
    if (webcamModal) {
      webcamModal.addEventListener("click", function (e) {
        if (e.target.classList.contains("sn-exam-modal-backdrop")) {
          closeWebcamModal();
        }
      });
    }

    // Wire modal close + cancel + save handlers (only matters for super)
    if (isSuper) {
      $("examFormClose").addEventListener("click", closeExamModal);
      $("efCancel").addEventListener("click", closeExamModal);
      $("efSave").addEventListener("click", onSaveExam);
      // Semester toggle buttons
      document
        .querySelectorAll(".sn-toggle-btn[data-sem]")
        .forEach(function (btn) {
          btn.addEventListener("click", function () {
            const sem = btn.dataset.sem;
            document
              .querySelectorAll(".sn-toggle-btn[data-sem]")
              .forEach(function (b) {
                const on = b.dataset.sem === sem;
                b.classList.toggle("active", on);
                b.setAttribute("aria-checked", on ? "true" : "false");
              });
          });
        });
      // Click backdrop to close
      $("examFormModal").addEventListener("click", function (e) {
        if (e.target.classList.contains("sn-exam-modal-backdrop")) {
          closeExamModal();
        }
      });
      // Round 2: when the user changes coding-problem COUNT, re-render
      // the per-problem max-points grid below. Preserves values for
      // slots that still exist; appends defaults for new slots.
      $("efCoding").addEventListener("input", function () {
        const newCount = parseInt($("efCoding").value, 10);
        if (!Number.isFinite(newCount) || newCount < 0) return;
        const currentValues = _readCodingMaxArray();
        const defaults = _defaultCodingMaxArray(newCount);
        const next = new Array(newCount);
        for (let i = 0; i < newCount; i++) {
          next[i] =
            currentValues[i] != null && currentValues[i] > 0
              ? currentValues[i]
              : defaults[i] || 10;
        }
        _renderCodingMaxGrid(newCount, next);
      });
    }

    // Initial load
    loadExams();
  }

  function populateExamFilterYearDropdown() {
    const sel = $("examFilterYear");
    if (!sel) return;
    // Preserve "All years" + add three years.
    const years = _yearOptions();
    years.forEach(function (y) {
      const o = document.createElement("option");
      o.value = y;
      o.textContent = y;
      sel.appendChild(o);
    });
  }

  function loadExams() {
    if (!window.fbDb) {
      _examDocs = [];
      renderExamGrid();
      return;
    }
    Promise.all([
      window.fbDb
        .collection("exams")
        .orderBy("updatedAt", "desc")
        .get()
        .then(function (snap) {
          _examDocs = [];
          snap.forEach(function (doc) {
            _examDocs.push(Object.assign({ _id: doc.id }, doc.data()));
          });
        })
        .catch(function (err) {
          console.error("[exams] load failed", err);
          throw err;
        }),
      loadSchedulesIntoCache(),
    ])
      .then(function () {
        renderExamGrid();
        updateWebcamToggleUI();
        applySelectionToLowerSections();
      })
      .catch(function (err) {
        const grid = $("examGrid");
        if (grid) {
          grid.innerHTML =
            '<div class="sn-exam-empty">Failed to load exams: ' +
            _escapeHtml(err.message || String(err)) +
            "</div>";
        }
      });
  }

  function renderExamGrid() {
    const grid = $("examGrid");
    if (!grid) return;
    const filterYear = ($("examFilterYear") || {}).value || "";
    const filterSem = ($("examFilterSemester") || {}).value || "";
    const filterStatus = ($("examFilterStatus") || {}).value || "";

    const filtered = _examDocs.filter(function (d) {
      if (filterYear && d.academicYear !== filterYear) return false;
      if (filterSem && d.semester !== filterSem) return false;
      if (filterStatus === "active" && !d.active) return false;
      if (filterStatus === "inactive" && d.active) return false;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML =
        '<div class="sn-exam-empty">' +
        (_examDocs.length === 0
          ? "No exams configured yet." +
            (_examIsSuper
              ? " Click <b>New Exam</b> to create the first one."
              : " Ask the super admin to configure exams.")
          : "No exams match the current filters.") +
        "</div>";
      return;
    }

    grid.innerHTML = "";
    filtered.forEach(function (d) {
      grid.appendChild(buildExamCard(d));
    });
  }

  function buildExamCard(d) {
    const card = document.createElement("article");
    const status = computeExamStatus(d);
    card.className =
      "sn-exam-card" +
      (d.active ? "" : " inactive") +
      (_selectedExamId === d._id ? " selected" : "");
    card.dataset.examId = d._id;

    const statusHtml =
      '<span class="sn-exam-badges">' +
      '<span class="sn-exam-status ' +
      _statusClass(status) +
      '">' +
      _statusLabel(status) +
      "</span>" +
      // Webcam feature turned off by the admin for this exam — small
      // informative chip next to the status badge.
      (d.webcamEnabled === false
        ? '<span class="sn-exam-status sn-exam-webcam-off" ' +
          'title="Webcam feature turned off by the admin: no verification photo, no live proctoring">📷 Webcam Off</span>'
        : "") +
      "</span>";

    const updatedAt =
      d.updatedAt && d.updatedAt.toDate
        ? d.updatedAt.toDate()
        : d.updatedAt instanceof Date
          ? d.updatedAt
          : null;

    const menuHtml = _examIsSuper
      ? '<div class="sn-exam-menu">' +
        '<button class="sn-exam-menu-btn" type="button" aria-label="Exam actions" title="Actions">⋮</button>' +
        '<div class="sn-exam-menu-pop">' +
        '<button class="sn-exam-menu-item" data-act="edit" type="button">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
        "<span>Edit</span></button>" +
        '<button class="sn-exam-menu-item" data-act="toggle" type="button">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="' +
        (d.active ? "16" : "8") +
        '" cy="12" r="3" fill="currentColor"/></svg>' +
        "<span>" +
        (d.active ? "Set Inactive" : "Set Active") +
        "</span></button>" +
        '<button class="sn-exam-menu-item danger" data-act="delete" type="button">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>' +
        "<span>Delete</span></button>" +
        "</div></div>"
      : "";

    // Eligible groups label
    const fields = d.fieldsOfStudy || [];
    const fieldsBadges = fields.length
      ? fields
          .map(function (f) {
            return '<span class="sn-exam-vchip">' + _escapeHtml(f) + "</span>";
          })
          .join(" ")
      : '<span style="color:var(--sn-mist)">—</span>';

    card.innerHTML =
      '<div class="sn-exam-card-head">' +
      statusHtml +
      menuHtml +
      "</div>" +
      "<div>" +
      '<h3 class="sn-exam-card-title">' +
      _escapeHtml(_examTypeLabel(d.examType)) +
      "</h3>" +
      '<div class="sn-exam-card-semester">' +
      _capitalize(d.semester || "") +
      " " +
      _escapeHtml(d.academicYear || "") +
      "</div>" +
      '<div class="sn-exam-card-course">' +
      _escapeHtml(_courseLabel(d.course)) +
      " · " +
      _escapeHtml(d.university || "") +
      "</div>" +
      (d.faculty
        ? '<div class="sn-exam-card-course" style="margin-top:2px">' +
          _escapeHtml(_facultyLabel(d.faculty)) +
          "</div>"
        : "") +
      (d.degree
        ? '<div class="sn-exam-card-course" style="margin-top:2px">' +
          _escapeHtml(_degreeLabel(d.degree)) +
          "</div>"
        : "") +
      "</div>" +
      '<div class="sn-exam-stats">' +
      '<div class="sn-exam-stat"><div class="sn-exam-stat-num">' +
      (d.mcCount || 0) +
      '</div><div class="sn-exam-stat-lbl">MC</div></div>' +
      '<div class="sn-exam-stat"><div class="sn-exam-stat-num">' +
      (d.codingCount || 0) +
      '</div><div class="sn-exam-stat-lbl">Coding</div></div>' +
      '<div class="sn-exam-stat"><div class="sn-exam-stat-num">' +
      (d.duration || 0) +
      '</div><div class="sn-exam-stat-lbl">Min</div></div>' +
      "</div>" +
      '<div class="sn-exam-card-groups">' +
      "<b>Fields:</b> " +
      fieldsBadges +
      "</div>" +
      '<div class="sn-exam-foot">' +
      '<div class="sn-exam-versions">' +
      (d.versions || [])
        .map(function (v) {
          return '<span class="sn-exam-vchip">' + _escapeHtml(v) + "</span>";
        })
        .join("") +
      "</div>" +
      '<div title="' +
      (updatedAt ? updatedAt.toLocaleString() : "") +
      '">Updated ' +
      _formatRelativeTime(updatedAt) +
      "</div>" +
      "</div>";

    // Card click selects the exam (unless click was on the menu).
    card.addEventListener("click", function (e) {
      // Ignore clicks on the menu button or its dropdown
      if (
        e.target.closest(".sn-exam-menu-btn") ||
        e.target.closest(".sn-exam-menu-pop")
      ) {
        return;
      }
      toggleSelectExam(d._id);
    });

    // Wire menu interactions (only for super admin)
    if (_examIsSuper) {
      const menuBtn = card.querySelector(".sn-exam-menu-btn");
      const menuPop = card.querySelector(".sn-exam-menu-pop");
      menuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        document
          .querySelectorAll(".sn-exam-menu-pop.show")
          .forEach(function (p) {
            if (p !== menuPop) p.classList.remove("show");
          });
        menuPop.classList.toggle("show");
      });
      card.querySelectorAll(".sn-exam-menu-item").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          menuPop.classList.remove("show");
          const act = btn.dataset.act;
          if (act === "edit") openEditExamModal(d);
          else if (act === "toggle") onToggleActive(d);
          else if (act === "delete") onDeleteExam(d);
        });
      });
    }
    return card;
  }

  // Close menus on any outside click.
  document.addEventListener("click", function () {
    document.querySelectorAll(".sn-exam-menu-pop.show").forEach(function (p) {
      p.classList.remove("show");
    });
  });

  // ----- Selection + lower-section scoping ------------------------
  function toggleSelectExam(examId) {
    if (_selectedExamId === examId) {
      _selectedExamId = null;
    } else {
      _selectedExamId = examId;
    }
    renderExamGrid();
    applySelectionToLowerSections();
    // Scroll the lower wrap into view when selecting
    if (_selectedExamId) {
      const lower = $("lowerSectionsWrap");
      if (lower) lower.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function applySelectionToLowerSections() {
    const wrap = $("lowerSectionsWrap");
    const empty = $("noExamSelectedMsg");
    if (!wrap || !empty) return;

    if (!_selectedExamId) {
      // Nothing selected → lower sections hidden, banner visible. Legacy
      // global data (untagged schedules/submissions) is intentionally NOT
      // surfaced here — viewable in the older deployed app.
      wrap.style.display = "none";
      empty.style.display = "";
      return;
    }
    const exam = _examDocs.find(function (e) {
      return e._id === _selectedExamId;
    });
    if (!exam) {
      _selectedExamId = null;
      wrap.style.display = "none";
      empty.style.display = "";
      return;
    }

    wrap.style.display = "";
    empty.style.display = "none";

    // Build the scope label used in each section's header.
    const label =
      _examTypeLabel(exam.examType) +
      " · " +
      _capitalize(exam.semester || "") +
      " " +
      (exam.academicYear || "");

    [
      "refreshScopeLabel",
      "scheduleScopeLabel",
      "submissionsScopeLabel",
    ].forEach(function (id) {
      const el = $(id);
      if (el) {
        el.textContent = label;
        el.style.display = "";
      }
    });

    // Filter schedule editor rows to only this exam's eligible groups
    // (based on fieldsOfStudy). For legacy exams without fieldsOfStudy
    // set, show all groups (treat as unconstrained).
    const eligible = expandGroupsFromFields(exam.fieldsOfStudy || []);
    document
      .querySelectorAll(".schedule-table tr[data-group]")
      .forEach(function (tr) {
        const g = tr.dataset.group;
        tr.style.display =
          eligible.length === 0 || eligible.indexOf(g) !== -1 ? "" : "none";
      });
    const subFilter = $("subFilter");
    if (subFilter) {
      Array.from(subFilter.options).forEach(function (opt) {
        if (!opt.value) return; // keep "All groups"
        opt.style.display =
          eligible.length === 0 || eligible.indexOf(opt.value) !== -1
            ? ""
            : "none";
      });
      if (
        subFilter.value &&
        eligible.length > 0 &&
        eligible.indexOf(subFilter.value) === -1
      ) {
        subFilter.value = "";
      }
    }

    // Repaint schedule editor + submissions for the newly-selected exam.
    loadAllSchedules();
    loadSubmissions();
    // Per-exam refresh status (Feature: per-exam seeds)
    loadRefreshStatus();
  }

  // ----- Modal open / close ---------------------------------------
  function _populateModalYearDropdown() {
    const sel = $("efYear");
    if (!sel) return;
    sel.innerHTML = "";
    _yearOptions().forEach(function (y) {
      const o = document.createElement("option");
      o.value = y;
      o.textContent = y + (y === _currentAcademicYear() ? " (current)" : "");
      sel.appendChild(o);
    });
  }

  function openCreateExamModal() {
    _editingExamId = null;
    $("examFormTitle").textContent = "New Exam";
    _populateModalYearDropdown();
    $("efUniversity").value = "";
    $("efCourse").value = "";
    $("efFaculty").value = "";
    $("efYear").value = _currentAcademicYear();
    _setSemesterToggle(_currentSemester());
    $("efDegree").value = "";
    // Reset field-of-study chips
    document
      .querySelectorAll(".sn-fos-chip input[type='checkbox']")
      .forEach(function (cb) {
        cb.checked = false;
      });
    $("efExamType").value = "";
    $("efMc").value = "20";
    $("efCoding").value = "4";
    $("efDuration").value = "100";
    // MC scoring defaults (Round 2)
    $("efMcCorrectPts").value = "2";
    $("efMcWrongPenalty").value = "0";
    // Per-problem max points (Round 2) — default 10/15/15/20 for 4 problems
    _renderCodingMaxGrid(4, [10, 15, 15, 20]);
    // Default versions: A + B checked, C + D unchecked
    document
      .querySelectorAll(".sn-chip input[type='checkbox']")
      .forEach(function (cb) {
        cb.checked = cb.value === "A" || cb.value === "B";
      });
    $("efActive").checked = true;
    $("efError").style.display = "none";
    $("examFormModal").style.display = "flex";
  }

  function openEditExamModal(d) {
    _editingExamId = d._id;
    $("examFormTitle").textContent = "Edit Exam";
    _populateModalYearDropdown();
    $("efUniversity").value = d.university || "";
    $("efCourse").value = d.course || "";
    // Legacy exams written before Faculty was added default to
    // School of Exact Sciences (the only faculty in use at that time).
    $("efFaculty").value = d.faculty || "exact-sciences";
    $("efYear").value = d.academicYear || _currentAcademicYear();
    _setSemesterToggle(d.semester || _currentSemester());
    $("efDegree").value = d.degree || "";
    // Pre-tick field-of-study chips
    const fos = d.fieldsOfStudy || [];
    document
      .querySelectorAll(".sn-fos-chip input[type='checkbox']")
      .forEach(function (cb) {
        cb.checked = fos.indexOf(cb.value) !== -1;
      });
    $("efExamType").value = d.examType || "";
    $("efMc").value = String(d.mcCount != null ? d.mcCount : 20);
    $("efCoding").value = String(d.codingCount != null ? d.codingCount : 4);
    $("efDuration").value = String(d.duration || 100);
    // MC scoring (Round 2) — legacy exams default to 2 pts, 0 penalty
    $("efMcCorrectPts").value = String(
      d.pointsPerCorrectMc != null ? d.pointsPerCorrectMc : 2,
    );
    $("efMcWrongPenalty").value = String(
      d.penaltyPerWrongMc != null ? d.penaltyPerWrongMc : 0,
    );
    // Per-problem max points (Round 2). Legacy exams: derive a sensible
    // default that matches what those exams were actually running with.
    const codingCount = d.codingCount != null ? d.codingCount : 4;
    let maxPoints = d.codingMaxPoints;
    if (!Array.isArray(maxPoints) || maxPoints.length !== codingCount) {
      maxPoints = _defaultCodingMaxArray(codingCount);
    }
    _renderCodingMaxGrid(codingCount, maxPoints);
    const versions = d.versions || [];
    document
      .querySelectorAll(".sn-chip input[type='checkbox']")
      .forEach(function (cb) {
        cb.checked = versions.indexOf(cb.value) !== -1;
      });
    $("efActive").checked = d.active !== false;
    $("efError").style.display = "none";
    $("examFormModal").style.display = "flex";
  }

  // ----- Per-problem max-points helpers (Round 2) ---------------
  // Returns a sensible default array of max-points for N coding problems.
  // For the historical 4-problem layout: [10, 15, 15, 20] = 60 total.
  // For other counts: distribute 60 points evenly, then bias the LAST
  // slots upward for difficulty progression. Final value clamped 1-100.
  function _defaultCodingMaxArray(n) {
    if (!Number.isFinite(n) || n <= 0) return [];
    if (n === 4) return [10, 15, 15, 20];
    if (n === 1) return [60];
    if (n === 2) return [25, 35];
    if (n === 3) return [15, 20, 25];
    // n >= 5: even split of 60, round to integers, last slot gets the remainder
    const base = Math.floor(60 / n);
    const arr = new Array(n).fill(base);
    arr[n - 1] = 60 - base * (n - 1);
    return arr;
  }

  function _renderCodingMaxGrid(count, values) {
    const row = $("efCodingMaxRow");
    const grid = $("efCodingMaxGrid");
    if (!row || !grid) return;
    if (!count || count <= 0) {
      // No coding problems → hide the whole section
      row.style.display = "none";
      grid.innerHTML = "";
      _updateCodingMaxTotal();
      return;
    }
    row.style.display = "";
    let html = "";
    for (let i = 0; i < count; i++) {
      const v = values && values[i] != null ? values[i] : 10;
      html +=
        '<div class="sn-coding-max-cell">' +
        '<label class="sn-label-xs" for="efCodingMax' +
        i +
        '">Problem ' +
        (i + 1) +
        "</label>" +
        '<div class="sn-coding-max-input-wrap">' +
        '<input type="number" id="efCodingMax' +
        i +
        '" class="sn-input sn-coding-max-input" min="1" max="100" step="1" value="' +
        v +
        '" data-idx="' +
        i +
        '" />' +
        '<span class="sn-coding-max-suffix">pts</span>' +
        "</div>" +
        "</div>";
    }
    grid.innerHTML = html;
    // Wire input listeners so the total updates live
    grid.querySelectorAll(".sn-coding-max-input").forEach(function (inp) {
      inp.addEventListener("input", _updateCodingMaxTotal);
    });
    _updateCodingMaxTotal();
  }

  function _updateCodingMaxTotal() {
    const grid = $("efCodingMaxGrid");
    const totalEl = $("efCodingMaxTotal");
    if (!grid || !totalEl) return;
    let total = 0;
    grid.querySelectorAll(".sn-coding-max-input").forEach(function (inp) {
      const v = parseInt(inp.value, 10);
      if (Number.isFinite(v) && v > 0) total += v;
    });
    totalEl.textContent = String(total);
  }

  function _readCodingMaxArray() {
    const grid = $("efCodingMaxGrid");
    if (!grid) return [];
    const inputs = grid.querySelectorAll(".sn-coding-max-input");
    const arr = [];
    inputs.forEach(function (inp) {
      const v = parseInt(inp.value, 10);
      arr.push(Number.isFinite(v) ? v : 0);
    });
    return arr;
  }

  function closeExamModal() {
    $("examFormModal").style.display = "none";
  }

  function _setSemesterToggle(sem) {
    document.querySelectorAll(".sn-toggle-btn[data-sem]").forEach(function (b) {
      const on = b.dataset.sem === sem;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
  }
  function _getSemesterToggle() {
    const active = document.querySelector(".sn-toggle-btn[data-sem].active");
    return active ? active.dataset.sem : "";
  }

  function _showFormError(msg) {
    const el = $("efError");
    el.textContent = msg;
    el.style.display = msg ? "block" : "none";
  }

  function onSaveExam() {
    _showFormError("");
    const university = $("efUniversity").value;
    const course = $("efCourse").value;
    const faculty = $("efFaculty").value;
    const academicYear = $("efYear").value;
    const semester = _getSemesterToggle();
    const degree = $("efDegree").value;
    const examType = $("efExamType").value;
    const mcCount = parseInt($("efMc").value, 10);
    const codingCount = parseInt($("efCoding").value, 10);
    const duration = parseInt($("efDuration").value, 10);
    // Round 2: MC scoring rules
    const pointsPerCorrectMc = parseInt($("efMcCorrectPts").value, 10);
    const penaltyPerWrongMc = parseInt($("efMcWrongPenalty").value, 10);
    // Round 2: per-problem coding max points
    const codingMaxPoints = _readCodingMaxArray();
    const versions = [];
    document
      .querySelectorAll(".sn-chip input[type='checkbox']:checked")
      .forEach(function (cb) {
        versions.push(cb.value);
      });
    const fieldsOfStudy = [];
    document
      .querySelectorAll(".sn-fos-chip input[type='checkbox']:checked")
      .forEach(function (cb) {
        fieldsOfStudy.push(cb.value);
      });
    const active = $("efActive").checked;

    if (!university) {
      _showFormError("Please select a university.");
      return;
    }
    if (!faculty) {
      _showFormError("Please select a faculty / department.");
      return;
    }
    if (!course) {
      _showFormError("Please select a course.");
      return;
    }
    if (!academicYear) {
      _showFormError("Please select an academic year.");
      return;
    }
    if (!semester) {
      _showFormError("Please pick a semester (Spring or Fall).");
      return;
    }
    if (!degree) {
      _showFormError("Please pick a degree.");
      return;
    }
    if (fieldsOfStudy.length === 0) {
      _showFormError(
        "Please pick at least one field of study (FM / FIT / FAR).",
      );
      return;
    }
    if (!examType) {
      _showFormError("Please pick an exam type.");
      return;
    }
    if (!Number.isFinite(mcCount) || mcCount < 0 || mcCount > 100) {
      _showFormError("MC question count must be between 0 and 100.");
      return;
    }
    if (!Number.isFinite(codingCount) || codingCount < 0 || codingCount > 20) {
      _showFormError("Coding problem count must be between 0 and 20.");
      return;
    }
    if (mcCount === 0 && codingCount === 0) {
      _showFormError(
        "An exam needs at least one question — set MC or Coding to a positive number.",
      );
      return;
    }
    if (!Number.isFinite(duration) || duration < 5 || duration > 300) {
      _showFormError("Duration must be between 5 and 300 minutes.");
      return;
    }
    if (versions.length === 0) {
      _showFormError("At least one version must be selected (A, B, C, or D).");
      return;
    }

    // Round 2: validate MC scoring rules
    if (
      !Number.isFinite(pointsPerCorrectMc) ||
      pointsPerCorrectMc < 1 ||
      pointsPerCorrectMc > 10
    ) {
      _showFormError("Points per correct MC answer must be between 1 and 10.");
      return;
    }
    if (
      !Number.isFinite(penaltyPerWrongMc) ||
      penaltyPerWrongMc < 0 ||
      penaltyPerWrongMc > 10
    ) {
      _showFormError("Penalty per wrong MC answer must be between 0 and 10.");
      return;
    }
    // Round 2: validate per-problem coding max points
    if (codingCount > 0) {
      if (codingMaxPoints.length !== codingCount) {
        _showFormError(
          "Per-problem max points configuration is out of sync — close and reopen the form.",
        );
        return;
      }
      for (let i = 0; i < codingCount; i++) {
        const v = codingMaxPoints[i];
        if (!Number.isFinite(v) || v < 1 || v > 100) {
          _showFormError(
            "Max points for Problem " +
              (i + 1) +
              " must be an integer between 1 and 100.",
          );
          return;
        }
      }
    }

    const data = {
      university: university,
      faculty: faculty,
      course: course,
      academicYear: academicYear,
      semester: semester,
      degree: degree,
      fieldsOfStudy: fieldsOfStudy,
      examType: examType,
      mcCount: mcCount,
      codingCount: codingCount,
      duration: duration,
      // Round 2: MC scoring rules
      pointsPerCorrectMc: pointsPerCorrectMc,
      penaltyPerWrongMc: penaltyPerWrongMc,
      pointsPerUnansweredMc: 0, // fixed by design; stored for future flexibility
      // Round 2: per-problem coding max points (array length = codingCount)
      codingMaxPoints: codingCount > 0 ? codingMaxPoints : [],
      versions: versions,
      active: active,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy:
        (window.fbAuth.currentUser && window.fbAuth.currentUser.email) || "",
    };

    const docId = _examIdFor(data);

    // Preserve the per-exam webcam feature setting across edits. That
    // flag is managed by the "Webcam Feature" modal, not by this form —
    // carry the existing value over so an edit (including a tuple
    // change, which deletes + recreates the doc) doesn't silently turn
    // the webcam feature back on. New exams default to webcam ON
    // (field simply absent).
    if (_editingExamId) {
      const prevDoc = _examDocs.find(function (e) {
        return e._id === _editingExamId;
      });
      if (prevDoc && prevDoc.webcamEnabled === false) {
        data.webcamEnabled = false;
      }
    }

    // For NEW exams: if a doc with this ID already exists, block with friendly error.
    // For EDITS: if the user changed the tuple such that the new ID conflicts with
    // a DIFFERENT existing exam, also block.
    const conflict = _examDocs.find(function (e) {
      return e._id === docId && e._id !== _editingExamId;
    });
    if (conflict) {
      _showFormError(
        "An exam with this combination (" +
          university +
          " · " +
          _facultyLabel(faculty) +
          " · " +
          _courseLabel(course) +
          " · " +
          _capitalize(semester) +
          " " +
          academicYear +
          " · " +
          _examTypeLabel(examType) +
          ") already exists. Edit it instead.",
      );
      return;
    }

    const saveBtn = $("efSave");
    const saveBtnText = saveBtn.querySelector(".sn-btn-text");
    saveBtn.disabled = true;
    if (saveBtnText) saveBtnText.textContent = "Saving…";

    // If editing AND the tuple changed (i.e. docId changed), we have to
    // delete the old doc and create a new one. Otherwise just set.
    function _writeNewDoc() {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.createdBy = data.updatedBy;
      return window.fbDb.collection("exams").doc(docId).set(data);
    }
    function _writeExistingDoc() {
      return window.fbDb
        .collection("exams")
        .doc(docId)
        .set(data, { merge: true });
    }

    let promise;
    if (_editingExamId && _editingExamId !== docId) {
      // Tuple changed during edit — delete old, write new
      promise = window.fbDb
        .collection("exams")
        .doc(_editingExamId)
        .delete()
        .then(_writeNewDoc);
    } else if (_editingExamId) {
      promise = _writeExistingDoc();
    } else {
      promise = _writeNewDoc();
    }

    promise
      .then(function () {
        closeExamModal();
        loadExams();
      })
      .catch(function (err) {
        console.error("[exams] save failed", err);
        _showFormError("Save failed: " + (err.message || String(err)));
      })
      .finally(function () {
        saveBtn.disabled = false;
        if (saveBtnText) saveBtnText.textContent = "Save Exam";
      });
  }

  async function onToggleActive(d) {
    const verb = d.active ? "deactivate" : "activate";
    const ok = await openModal({
      title: _capitalize(verb) + " this exam?",
      message: d.active
        ? "Deactivating <b>" +
          _examTypeLabel(d.examType) +
          " · " +
          _capitalize(d.semester) +
          " " +
          d.academicYear +
          "</b> will hide it from the student welcome page. Existing student data is unaffected."
        : "Activating <b>" +
          _examTypeLabel(d.examType) +
          " · " +
          _capitalize(d.semester) +
          " " +
          d.academicYear +
          "</b> will make it visible to students when they pick this combination on the welcome page.",
      kind: d.active ? "warn" : "info",
      icon: d.active ? "!" : "i",
      buttons: [
        { label: "Cancel", value: null, style: "secondary" },
        { label: _capitalize(verb), value: true, style: "primary" },
      ],
    });
    if (!ok) return;
    window.fbDb
      .collection("exams")
      .doc(d._id)
      .set(
        {
          active: !d.active,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy:
            (window.fbAuth.currentUser && window.fbAuth.currentUser.email) ||
            "",
        },
        { merge: true },
      )
      .then(loadExams)
      .catch(function (err) {
        console.error("[exams] toggle failed", err);
        openModal({
          title: "Toggle failed",
          message: _escapeHtml(err.message || String(err)),
          kind: "danger",
          icon: "!",
          buttons: [{ label: "OK", value: true, style: "primary" }],
        });
      });
  }

  async function onDeleteExam(d) {
    const ok = await openModal({
      title: "Delete this exam configuration?",
      message:
        "This will permanently delete <b>" +
        _examTypeLabel(d.examType) +
        " · " +
        _capitalize(d.semester) +
        " " +
        d.academicYear +
        "</b> from the configuration. Students with this combination selected on the welcome page will see <b>Not configured yet</b>." +
        "<br><br>Existing submissions and proctoring data are <b>not</b> affected. This action cannot be undone.",
      kind: "danger",
      icon: "!",
      buttons: [
        { label: "Cancel", value: null, style: "secondary" },
        { label: "Delete", value: true, style: "danger" },
      ],
    });
    if (!ok) return;
    window.fbDb
      .collection("exams")
      .doc(d._id)
      .delete()
      .then(loadExams)
      .catch(function (err) {
        console.error("[exams] delete failed", err);
        openModal({
          title: "Delete failed",
          message: _escapeHtml(err.message || String(err)),
          kind: "danger",
          icon: "!",
          buttons: [{ label: "OK", value: true, style: "primary" }],
        });
      });
  }

  // =============================================================
  // WEBCAM FEATURE (per-exam on/off)
  // -------------------------------------------------------------
  // The "Webcam Feature" switch in the Exams section header opens a
  // modal listing every created exam. The instructor checks the exams
  // for which the webcam feature must be turned OFF completely:
  //   - no verification photo at exam start,
  //   - no live AI webcam proctoring during the exam,
  //   - avatar placeholder on the final scorecard + PDF report,
  //   - "webcam turned off by the admin" in the proctoring evidence.
  // The setting is stored per exam doc as `webcamEnabled: false`.
  // Absence of the field (legacy docs) means the feature is ON.
  // The header switch reads OFF whenever at least one exam has the
  // webcam feature disabled.
  // =============================================================
  function _examWebcamOff(d) {
    return d && d.webcamEnabled === false;
  }

  function updateWebcamToggleUI() {
    const btn = $("webcamToggleBtn");
    const stateLbl = $("webcamToggleState");
    if (!btn) return;
    const anyOff = _examDocs.some(_examWebcamOff);
    btn.classList.toggle("is-off", anyOff);
    btn.setAttribute("aria-checked", anyOff ? "false" : "true");
    if (stateLbl) {
      const offCount = _examDocs.filter(_examWebcamOff).length;
      stateLbl.textContent = anyOff
        ? "Off (" + offCount + " exam" + (offCount === 1 ? "" : "s") + ")"
        : "On";
      stateLbl.classList.toggle("is-on", !anyOff);
      stateLbl.classList.toggle("is-off", anyOff);
    }
  }

  function _showWebcamModalError(msg) {
    const el = $("webcamModalError");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }

  function _webcamExamLabel(d) {
    return (
      _examTypeLabel(d.examType) +
      " · " +
      _capitalize(d.semester || "") +
      " " +
      (d.academicYear || "") +
      " · " +
      _courseLabel(d.course)
    );
  }

  function openWebcamModal() {
    const modal = $("webcamModal");
    const list = $("webcamExamList");
    const err = $("webcamModalError");
    const saveBtn = $("webcamSave");
    if (!modal || !list) return;
    if (err) err.style.display = "none";

    if (!_examDocs.length) {
      list.innerHTML =
        '<div class="sn-exam-empty">No exams have been created yet. ' +
        "Create an exam first, then choose which exams have the webcam " +
        "feature turned off.</div>";
      if (saveBtn) saveBtn.disabled = true;
    } else {
      if (saveBtn) saveBtn.disabled = false;
      list.innerHTML = "";
      _examDocs.forEach(function (d) {
        const off = _examWebcamOff(d);
        const item = document.createElement("label");
        item.className = "sn-webcam-exam-item" + (off ? " is-off" : "");
        item.innerHTML =
          '<input type="checkbox" class="sn-webcam-exam-check" data-examid="' +
          _escapeHtml(d._id) +
          '"' +
          (off ? " checked" : "") +
          " />" +
          '<span class="sn-webcam-exam-main">' +
          '<span class="sn-webcam-exam-title">' +
          _escapeHtml(_webcamExamLabel(d)) +
          "</span>" +
          '<span class="sn-webcam-exam-sub">' +
          _escapeHtml(d.university || "") +
          (d.faculty ? " · " + _escapeHtml(_facultyLabel(d.faculty)) : "") +
          (d.active ? " · Active" : " · Inactive") +
          "</span>" +
          "</span>" +
          '<span class="sn-webcam-exam-state">' +
          (off ? "📷 Webcam OFF" : "📷 Webcam ON") +
          "</span>";
        // Live visual feedback when the checkbox changes.
        const cb = item.querySelector("input");
        cb.addEventListener("change", function () {
          item.classList.toggle("is-off", cb.checked);
          item.querySelector(".sn-webcam-exam-state").textContent = cb.checked
            ? "📷 Webcam OFF"
            : "📷 Webcam ON";
        });
        list.appendChild(item);
      });
    }
    modal.style.display = "flex";
  }

  function closeWebcamModal() {
    const modal = $("webcamModal");
    if (modal) modal.style.display = "none";
  }

  function onSaveWebcamSettings() {
    const list = $("webcamExamList");
    const saveBtn = $("webcamSave");
    const err = $("webcamModalError");
    if (!list) return;
    if (err) err.style.display = "none";
    if (!window.fbDb) {
      _showWebcamModalError("Firestore is not available.");
      return;
    }

    // Desired per-exam state read from the checkboxes:
    // checked = webcam feature OFF for that exam.
    const desiredOff = {};
    list
      .querySelectorAll(".sn-webcam-exam-check")
      .forEach(function (cb) {
        desiredOff[cb.dataset.examid] = cb.checked;
      });

    // Only write exams whose state actually changed.
    const updatedBy =
      (window.fbAuth.currentUser && window.fbAuth.currentUser.email) || "";
    const batch = window.fbDb.batch();
    let changes = 0;
    _examDocs.forEach(function (d) {
      if (!(d._id in desiredOff)) return;
      const currentOff = _examWebcamOff(d);
      const nextOff = desiredOff[d._id];
      if (currentOff === nextOff) return;
      changes++;
      batch.set(
        window.fbDb.collection("exams").doc(d._id),
        {
          webcamEnabled: !nextOff,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: updatedBy,
        },
        { merge: true },
      );
    });

    if (!changes) {
      closeWebcamModal();
      return;
    }

    const saveBtnText = saveBtn ? saveBtn.querySelector(".sn-btn-text") : null;
    if (saveBtn) saveBtn.disabled = true;
    if (saveBtnText) saveBtnText.textContent = "Saving…";

    batch
      .commit()
      .then(function () {
        closeWebcamModal();
        loadExams();
      })
      .catch(function (e) {
        console.error("[webcam] save failed", e);
        _showWebcamModalError("Save failed: " + (e.message || String(e)));
      })
      .finally(function () {
        if (saveBtn) saveBtn.disabled = false;
        if (saveBtnText) saveBtnText.textContent = "Save Webcam Settings";
      });
  }

  // =============================================================
  // SCHEDULE
  // =============================================================
  function renderScheduleSkeleton() {
    const tb = $("scheduleTbody");
    tb.innerHTML = "";
    GROUPS.forEach(function (g) {
      const tr = document.createElement("tr");
      tr.dataset.group = g;
      tr.innerHTML =
        "<td><b>" +
        g +
        "</b></td>" +
        '<td><input type="datetime-local" class="sched-start" /></td>' +
        '<td><input type="datetime-local" class="sched-end" /></td>' +
        '<td class="sched-status">—</td>' +
        '<td class="sched-by"><span class="sched-by-dash">—</span></td>' +
        '<td><button class="admin-btn sched-save">Save</button></td>' +
        '<td><button class="admin-btn danger-outline sched-delete" title="Delete schedule">🗑</button></td>';
      tb.appendChild(tr);
    });

    tb.querySelectorAll(".sched-save").forEach(function (btn) {
      btn.addEventListener("click", function () {
        const tr = btn.closest("tr");
        saveSchedule(tr.dataset.group);
      });
    });

    tb.querySelectorAll(".sched-delete").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const tr = btn.closest("tr");
        const g = tr.dataset.group;
        const ok = await modalConfirm({
          title: "Delete schedule for " + g + "?",
          message:
            "This will remove the saved start/end time for <b>" +
            g +
            "</b>. " +
            'Students in this group will see <b>"schedule not set"</b> until an instructor publishes a new window.' +
            "<br><br>This action cannot be undone.",
          confirmLabel: "Delete",
          cancelLabel: "Cancel",
          confirmStyle: "danger",
          kind: "danger",
          icon: "!",
        });
        if (!ok) return;
        deleteSchedule(g);
      });
    });
  }

  // Compose the doc ID for a per-exam-per-group schedule.
  function _examScheduleId(examId, group) {
    return examId + "__" + group;
  }

  function deleteSchedule(group) {
    if (!_selectedExamId) {
      setMsg("Select an exam first.", "warn");
      return;
    }
    const tr = document.querySelector(
      '.schedule-table tr[data-group="' + group + '"]',
    );
    window.fbDb
      .collection("exam_schedules")
      .doc(_examScheduleId(_selectedExamId, group))
      .delete()
      .then(function () {
        if (tr) {
          tr.querySelector(".sched-start").value = "";
          tr.querySelector(".sched-end").value = "";
          tr.querySelector(".sched-status").innerHTML =
            '<span class="sn-status-badge notset">Not Set</span>';
          tr.querySelector(".sched-by").innerHTML =
            '<span class="sched-by-dash">—</span>';
        }
        // Update cache so the exam card status badge reflects this immediately.
        if (
          _schedulesByExamGroup[_selectedExamId] &&
          _schedulesByExamGroup[_selectedExamId][group]
        ) {
          delete _schedulesByExamGroup[_selectedExamId][group];
          renderExamGrid();
        }
        setMsg("Deleted schedule for " + group + ".", "ok");
      })
      .catch(function (err) {
        console.error(err);
        setMsg("Delete failed for " + group + ": " + err.message, "err");
      });
  }

  function loadAllSchedules() {
    // The schedule editor is only meaningful when an exam is selected;
    // applySelectionToLowerSections hides the section otherwise. When
    // an exam IS selected, we paint per-group rows from the cache that
    // was populated by loadSchedulesIntoCache during loadExams().
    if (!_selectedExamId) {
      // Reset all rows to empty
      GROUPS.forEach(function (g) {
        const tr = document.querySelector(
          '.schedule-table tr[data-group="' + g + '"]',
        );
        if (!tr) return;
        tr.querySelector(".sched-start").value = "";
        tr.querySelector(".sched-end").value = "";
        tr.querySelector(".sched-status").innerHTML =
          '<span class="sn-status-badge notset">Not Set</span>';
        tr.querySelector(".sched-by").innerHTML =
          '<span class="sched-by-dash">—</span>';
      });
      return;
    }
    const bucket = _schedulesByExamGroup[_selectedExamId] || {};
    GROUPS.forEach(function (g) {
      const tr = document.querySelector(
        '.schedule-table tr[data-group="' + g + '"]',
      );
      if (!tr) return;
      const s = bucket[g];
      if (!s) {
        tr.querySelector(".sched-start").value = "";
        tr.querySelector(".sched-end").value = "";
        tr.querySelector(".sched-status").innerHTML =
          '<span class="sn-status-badge notset">Not Set</span>';
        tr.querySelector(".sched-by").innerHTML =
          '<span class="sched-by-dash">—</span>';
        return;
      }
      if (s.startAt)
        tr.querySelector(".sched-start").value = toDatetimeLocal(s.startAt);
      if (s.endAt)
        tr.querySelector(".sched-end").value = toDatetimeLocal(s.endAt);
      tr.querySelector(".sched-status").innerHTML = statusTag(
        s.startAt,
        s.endAt,
      );
      const by = s.scheduledBy;
      tr.querySelector(".sched-by").innerHTML = by
        ? '<span class="sched-by-email" title="' +
          escapeHtml(by) +
          '">' +
          escapeHtml(by) +
          "</span>"
        : '<span class="sched-by-dash">—</span>';
    });
  }

  function saveSchedule(group) {
    if (!_selectedExamId) {
      setMsg("Select an exam first.", "warn");
      return;
    }
    const tr = document.querySelector(
      '.schedule-table tr[data-group="' + group + '"]',
    );
    const startVal = tr.querySelector(".sched-start").value;
    const endVal = tr.querySelector(".sched-end").value;
    if (!startVal || !endVal) {
      setMsg(
        "Please pick both a start and an end time for " + group + ".",
        "warn",
      );
      return;
    }
    const startDate = new Date(startVal);
    const endDate = new Date(endVal);
    if (endDate <= startDate) {
      setMsg("End time must be after start time for " + group + ".", "warn");
      return;
    }
    const me =
      (window.fbAuth.currentUser && window.fbAuth.currentUser.email) ||
      "unknown";
    window.fbDb
      .collection("exam_schedules")
      .doc(_examScheduleId(_selectedExamId, group))
      .set(
        {
          examId: _selectedExamId,
          group: group,
          startAt: firebase.firestore.Timestamp.fromDate(startDate),
          endAt: firebase.firestore.Timestamp.fromDate(endDate),
          active: true,
          updatedBy: me,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      .then(function () {
        tr.querySelector(".sched-status").innerHTML = statusTag(
          startDate,
          endDate,
        );
        tr.querySelector(".sched-by").innerHTML =
          '<span class="sched-by-email" title="' +
          escapeHtml(me) +
          '">' +
          escapeHtml(me) +
          "</span>";
        // Update cache + re-render card grid so the badge reflects this.
        if (!_schedulesByExamGroup[_selectedExamId]) {
          _schedulesByExamGroup[_selectedExamId] = {};
        }
        _schedulesByExamGroup[_selectedExamId][group] = {
          group: group,
          startAt: startDate,
          endAt: endDate,
          scheduledBy: me,
        };
        renderExamGrid();
        setMsg("Saved schedule for " + group + ".", "ok");
      })
      .catch(function (err) {
        console.error(err);
        setMsg("Save failed for " + group + ": " + err.message, "err");
      });
  }

  function statusTag(startAt, endAt) {
    if (!startAt || !endAt)
      return '<span class="sn-status-badge notset">Not Set</span>';
    const now = new Date();
    if (now < startAt)
      return '<span class="sn-status-badge upcoming">Upcoming</span>';
    if (now <= endAt)
      return '<span class="sn-status-badge open">Open Now</span>';
    return '<span class="sn-status-badge ended">Ended</span>';
  }

  function toDatetimeLocal(d) {
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const mo = pad(d.getMonth() + 1);
    const da = pad(d.getDate());
    const h = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return y + "-" + mo + "-" + da + "T" + h + ":" + mi;
  }

  function setMsg(text, kind) {
    const el = $("scheduleMsg");
    el.textContent = text;
    el.className = "admin-msg kind-" + kind;
    setTimeout(function () {
      if (el.textContent === text) el.textContent = "";
    }, 6000);
  }

  // =============================================================
  // SUBMISSIONS
  // =============================================================
  function loadSubmissions() {
    const tb = $("subsTbody");
    tb.innerHTML =
      '<tr><td colspan="12" class="admin-empty">Loading…</td></tr>';
    const subCountNum = $("subCountNum");
    if (subCountNum) subCountNum.textContent = "…";

    // No exam selected → submissions section is hidden (see
    // applySelectionToLowerSections), so this is rarely called. If it
    // does get called, render an explicit empty state.
    if (!_selectedExamId) {
      tb.innerHTML =
        '<tr><td colspan="12" class="admin-empty">Select an exam above to view its submissions.</td></tr>';
      if (subCountNum) subCountNum.textContent = "—";
      return;
    }

    const group = $("subFilter").value;
    const method = $("subMethod").value;

    // Filter by examId on the client (avoids needing composite indexes).
    // Legacy submissions (no examId field) are intentionally NOT shown —
    // they can be viewed via the older deployed app.
    window.fbDb
      .collection("submissions")
      .orderBy("submittedAt", "desc")
      .limit(500)
      .get()
      .then(function (snap) {
        const rows = [];
        snap.forEach(function (doc) {
          const d = doc.data();
          // Exam-scope filter: skip submissions not tagged with the
          // selected exam. Legacy untagged submissions are excluded here.
          if (d.examId !== _selectedExamId) return;
          // Hard cutoff: never show a submission whose group is outside
          // the current user's allowedGroups, even if the dropdown was
          // somehow tampered with.
          if (!canSeeGroup(d.group)) return;
          if (group && d.group !== group) return;
          // Method filter uses normalized names. Translate old records so
          // they match the filter dropdown options.
          if (method) {
            let m = d.uploadMethod || "";
            if (m === "firebase") m = "firebase_manual";
            if (m === "google_form_fallback") m = "google_form";
            if (m !== method) return;
          }
          rows.push({ id: doc.id, ...d });
        });
        renderSubmissions(rows);
      })
      .catch(function (err) {
        console.error(err);
        tb.innerHTML =
          '<tr><td colspan="12" class="admin-empty err">Load failed: ' +
          escapeHtml(err.message) +
          "</td></tr>";
        if (subCountNum) subCountNum.textContent = "!";
      });
  }

  function renderSubmissions(rows) {
    const tb = $("subsTbody");
    const subCountNum = $("subCountNum");
    if (!rows.length) {
      tb.innerHTML =
        '<tr><td colspan="15" class="admin-empty">No submissions match the current filters.</td></tr>';
      if (subCountNum) subCountNum.textContent = "0";
      return;
    }
    tb.innerHTML = "";
    rows.forEach(function (r) {
      const tr = document.createElement("tr");
      tr.dataset.docid = r.id;
      const when = r.submittedAt ? r.submittedAt.toDate() : null;
      const whenStr = when
        ? when.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      const name = [r.firstName, r.lastName].filter(Boolean).join(" ");

      // Normalize method. Handle backward-compat for old records:
      //   "firebase"                  (old successful upload, no trigger)  → firebase_manual
      //   "google_form_fallback"      (old fallback name)                   → google_form
      const rawMethod = r.uploadMethod || "";
      let method = rawMethod;
      if (rawMethod === "firebase") method = "firebase_manual"; // best-guess backfill
      if (rawMethod === "google_form_fallback") method = "google_form";

      // 3-way classification of how it was submitted
      //   firebase_manual → student clicked Submit, Firebase upload OK (green)
      //   firebase_auto   → 90-min timer auto-submit, Firebase upload OK (amber)
      //   google_form     → all Firebase attempts failed, student used Form (red)
      let methodTag;
      if (method === "firebase_manual") {
        methodTag =
          '<span class="tag tag-fb-manual" title="Student clicked Submit · Firebase upload OK">REGULAR</span>';
      } else if (method === "firebase_auto") {
        methodTag =
          '<span class="tag tag-fb-auto" title="Timer expired (100 min) · Firebase upload OK">AUTO</span>';
      } else if (method === "google_form") {
        methodTag =
          '<span class="tag tag-fallback" title="Firebase upload failed · student must upload via Google Form">GOOGLE FORM</span>';
      } else {
        methodTag = '<span class="tag tag-unknown">?</span>';
      }

      // PDF column: link for both firebase methods, "unavailable" for google_form
      let pdf;
      if (method === "firebase_manual" || method === "firebase_auto") {
        if (r.pdfUrl) {
          pdf =
            '<a href="' +
            r.pdfUrl +
            '" target="_blank" rel="noopener" class="pdf-link">Download</a>';
        } else if (r.pdfPath) {
          // Firestore record knows the PDF path but we don't have a URL
          // cached (happens when anonymous student uploaded the PDF but
          // couldn't call getDownloadURL() due to Storage read rules).
          // The admin has password auth, so WE can fetch the URL on demand.
          pdf =
            '<button class="pdf-load-btn" data-pdfpath="' +
            esc(r.pdfPath) +
            '" title="Fetch PDF URL from Storage">Load PDF</button>';
        } else {
          pdf =
            '<span class="muted" title="No PDF path recorded. PDF likely still exists in Storage — check manually.">path missing</span>';
        }
      } else if (method === "google_form") {
        pdf =
          '<span class="muted" title="PDF not uploaded to Firebase. Check Google Form responses.">PDF unavailable</span>';
      } else {
        pdf = '<span class="muted">—</span>';
      }

      const tabs = typeof r.tabSwitches === "number" ? r.tabSwitches : null;
      const violated = tabs !== null && tabs > 0;
      const violatedTag = violated
        ? '<span class="tag tag-violated">VIOLATED</span>'
        : '<span class="tag tag-ok">clean</span>';
      const rowFlag = violated ? ' class="row-flag"' : "";
      // Round 2: MC max points is now per-exam, stored on the submission
      // as mcMaxPoints. Legacy submissions lack this field and default to
      // 40 (the old hardcoded value of 20 questions × 2 points each).
      const mcMax = r.mcMaxPoints != null ? r.mcMaxPoints : 40;
      const mcDisplay = r.mcScore != null ? r.mcScore + "/" + mcMax : "—";

      // Feature 6: AI Code Auto-Grader cells
      // ----------------------------------------
      // AI coding column shows total AI score across 4 problems, or
      // "Not graded" if the AI hasn't run. Clicking opens the drawer.
      // Final grade column shows the instructor-confirmed total
      // (MC + instructor coding) or "—" if not finalized.
      const grading = r.aiGrading || null;
      const instructor = r.instructorGrading || null;
      const codingMax = grading
        ? grading.maxCoding
        : (r.codingProblemMeta || []).reduce(function (s, p) {
            return s + (p.maxPoints || 0);
          }, 0) || 60;
      let aiCodingCell;
      if (!r.codingAnswers || !r.codingAnswers.length) {
        aiCodingCell =
          '<span class="muted" title="This submission predates Feature 6 — coding answers were not saved.">Not gradable</span>';
      } else if (grading && grading.status === "graded") {
        aiCodingCell =
          '<button class="sn-cell-grade-btn graded" data-docid="' +
          esc(r.id) +
          '">' +
          '<span class="sn-cgb-score">' +
          grading.totalCoding +
          " / " +
          codingMax +
          "</span>" +
          '<span class="sn-cgb-label">AI graded</span>' +
          "</button>";
      } else {
        aiCodingCell =
          '<button class="sn-cell-grade-btn ungraded" data-docid="' +
          esc(r.id) +
          '">' +
          '<span class="sn-cgb-icon">⚡</span>' +
          '<span class="sn-cgb-label">Grade with AI</span>' +
          "</button>";
      }
      let finalCell;
      // Round 2: total exam points is per-exam (mcMax + sum of coding maxes).
      // Legacy fallback to 100 when neither is known.
      const codingMaxTotal = grading
        ? grading.maxCoding || 0
        : (r.codingProblemMeta || []).reduce(function (s, p) {
            return s + (p.maxPoints || 0);
          }, 0);
      const totalMaxForRow = (mcMax || 0) + (codingMaxTotal || 0) || 100;
      if (r.finalGrade != null) {
        finalCell =
          '<span class="sn-final-grade">' +
          r.finalGrade +
          " / " +
          totalMaxForRow +
          "</span>";
      } else if (instructor && instructor.totalCoding != null) {
        const fg = (r.mcScore || 0) + instructor.totalCoding;
        finalCell =
          '<span class="sn-final-grade">' +
          fg +
          " / " +
          totalMaxForRow +
          "</span>";
      } else {
        finalCell = '<span class="muted">—</span>';
      }

      // Feature 1: Proctoring risk cell. Rendered by ProctoringAdmin if loaded;
      // empty "—" otherwise.
      const proctorCell =
        window.ProctoringAdmin && window.ProctoringAdmin.renderRiskCellHtml
          ? window.ProctoringAdmin.renderRiskCellHtml(r)
          : '<span class="muted">—</span>';

      tr.innerHTML =
        "<td>" +
        whenStr +
        "</td>" +
        "<td>" +
        esc(r.group) +
        "</td>" +
        "<td>" +
        esc(r.studentId) +
        "</td>" +
        "<td" +
        rowFlag +
        ">" +
        esc(name) +
        "</td>" +
        "<td>" +
        esc(r.version) +
        "</td>" +
        "<td>" +
        mcDisplay +
        "</td>" +
        "<td>" +
        aiCodingCell +
        "</td>" +
        "<td>" +
        finalCell +
        "</td>" +
        '<td class="num' +
        (tabs ? " warn" : "") +
        '">' +
        (tabs != null ? tabs : "—") +
        "</td>" +
        "<td>" +
        violatedTag +
        "</td>" +
        "<td>" +
        proctorCell +
        "</td>" +
        "<td>" +
        esc(r.timeUsed || "—") +
        "</td>" +
        "<td>" +
        methodTag +
        "</td>" +
        "<td>" +
        pdf +
        "</td>" +
        '<td><button class="admin-btn danger-outline sub-delete" data-docid="' +
        esc(r.id) +
        '" data-pdfpath="' +
        esc(r.pdfPath || "") +
        '" ' +
        'title="Delete submission">🗑</button></td>';
      tb.appendChild(tr);
    });
    if (subCountNum) subCountNum.textContent = rows.length;

    // Feature 1: Wire Proctoring risk badge clicks → open evidence modal.
    // We need the original row data (counts, sessionId) so we look up the
    // row by docid in the `rows` array we just rendered.
    tb.querySelectorAll(".proctor-badge-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!window.ProctoringAdmin) return;
        const docId = btn.dataset.docid;
        const submission = rows.find(function (r) {
          return r.id === docId;
        });
        if (submission) {
          window.ProctoringAdmin.openProctorModal(submission);
        }
      });
    });

    // Feature 6: Wire "Grade with AI" / "AI graded" cell buttons →
    // open the grading drawer for that submission.
    tb.querySelectorAll(".sn-cell-grade-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const docId = btn.dataset.docid;
        const submission = rows.find(function (r) {
          return r.id === docId;
        });
        if (submission) openGradingDrawer(submission);
      });
    });

    // Wire delete buttons
    tb.querySelectorAll(".sub-delete").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const docId = btn.dataset.docid;
        const pdfPath = btn.dataset.pdfpath;
        const row = btn.closest("tr");
        const nameCell = row.querySelector("td:nth-child(4)");
        const studentName =
          (nameCell && nameCell.textContent) || "this submission";
        const ok = await modalConfirm({
          title: "Delete this submission?",
          message:
            "You are about to permanently delete the submission for <b>" +
            escapeHtml(studentName) +
            "</b>.<br><br>" +
            "This will remove the submission record from Firestore and the associated PDF from Firebase Storage. " +
            "<b>This action cannot be undone.</b>",
          confirmLabel: "Confirm Delete",
          cancelLabel: "Cancel",
          confirmStyle: "danger",
          kind: "danger",
          icon: "!",
        });
        if (!ok) return;
        // Before deleting, look up the full row data in case pdfPath is
        // missing from the button's data attribute (old records, edge
        // cases). If pdfPath is missing, try to reconstruct it from
        // student info so we can still delete the Storage file.
        const reconstructedPath = !pdfPath ? reconstructPdfPath(row) : null;
        deleteSubmission(docId, pdfPath || reconstructedPath, row);
      });
    });

    // Wire "Load PDF" buttons for records where pdfUrl is missing.
    // Admin has password auth, so they CAN read from Storage regardless
    // of whether the student (anonymous) could.
    tb.querySelectorAll(".pdf-load-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const path = btn.dataset.pdfpath;
        if (!path || !window.firebase || !firebase.storage) return;
        btn.disabled = true;
        btn.textContent = "Loading…";
        try {
          const url = await firebase.storage().ref(path).getDownloadURL();
          // Replace the button with a proper Download link
          const link = document.createElement("a");
          link.href = url;
          link.target = "_blank";
          link.rel = "noopener";
          link.className = "pdf-link";
          link.textContent = "Download";
          btn.replaceWith(link);
        } catch (err) {
          console.error("Load PDF URL failed:", err);
          btn.disabled = false;
          btn.textContent = "Load PDF";
          modalAlert({
            title: "Could not load PDF",
            message:
              "Failed to fetch the PDF URL from Storage.<br><br>" +
              "<b>Path:</b> <code>" +
              escapeHtml(path) +
              "</code><br><br>" +
              "<b>Reason:</b> " +
              escapeHtml((err && err.message) || String(err)),
            kind: "danger",
            icon: "!",
          });
        }
      });
    });
  }

  // Reconstruct the Storage path for a row when the Firestore record
  // doesn't have pdfPath stored (old records from the pre-fix era).
  // The filename convention is: {group}_{id}_{first}_{last}.pdf
  function reconstructPdfPath(rowEl) {
    if (!rowEl) return null;
    // Cell order: Submitted, Group, ID, Name, Version, Test Points, Tabs, Violated, Time, Method, PDF, Delete
    const cells = rowEl.querySelectorAll("td");
    if (cells.length < 4) return null;
    const group = (cells[1].textContent || "").trim();
    const id = (cells[2].textContent || "").trim();
    const name = (cells[3].textContent || "").trim();
    if (!group || !id || !name) return null;
    // Name is "First Last" — split; fallback to full name as "last" only
    const parts = name.split(/\s+/);
    let first = "",
      last = "";
    if (parts.length >= 2) {
      first = parts[0];
      last = parts.slice(1).join("");
    } else {
      last = parts[0] || "";
    }
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
    return "submissions/" + group + "/" + filename;
  }

  function deleteSubmission(docId, pdfPath, rowEl) {
    // Two-step delete: Firestore record first, then Storage PDF.
    // We do Firestore first because if Firestore fails (permission, network),
    // leaving the PDF behind is harmless — but orphaning a Firestore record
    // that points to a deleted PDF would be worse.
    window.fbDb
      .collection("submissions")
      .doc(docId)
      .delete()
      .then(function () {
        // Firestore record is now gone. Remove the row from the admin table.
        if (rowEl) rowEl.remove();
        const countEl = $("subCountNum");
        if (countEl) {
          const n = parseInt(countEl.textContent, 10);
          if (!isNaN(n)) countEl.textContent = Math.max(0, n - 1);
        }

        // Now try to delete the PDF from Storage. This runs in the
        // background — success and failure are both non-blocking, but we
        // surface a warning to the instructor if it fails so you know a
        // manual Storage cleanup might be needed.
        if (pdfPath && window.firebase && firebase.storage) {
          firebase
            .storage()
            .ref(pdfPath)
            .delete()
            .then(function () {
              console.log("✓ PDF deleted from Storage: " + pdfPath);
            })
            .catch(function (err) {
              // object-not-found means there was no PDF file to begin with
              // (probably a google_form record). That's not an error.
              if (err && err.code === "storage/object-not-found") {
                console.log(
                  "PDF delete skipped (no file at " +
                    pdfPath +
                    " — expected for Google Form submissions)",
                );
                return;
              }
              console.warn("✗ PDF delete failed:", err);
              modalAlert({
                title: "Submission deleted — PDF cleanup failed",
                message:
                  "The submission record was deleted, but the PDF file could not " +
                  "be removed from Firebase Storage automatically." +
                  "<br><br><b>Path:</b> <code>" +
                  escapeHtml(pdfPath) +
                  "</code>" +
                  "<br><br>You can delete it manually from Firebase Console → Storage.",
                kind: "warning",
                icon: "!",
              });
            });
        } else {
          // No pdfPath on this record (google_form fallback with no PDF).
          // Nothing to delete from Storage — totally fine.
          console.log("No PDF path for this record — Storage delete skipped.");
        }
      })
      .catch(function (err) {
        console.error("Firestore delete failed:", err);
        modalAlert({
          title: "Delete failed",
          message: "Could not delete submission: " + escapeHtml(err.message),
          kind: "danger",
          icon: "!",
        });
      });
  }

  function esc(s) {
    return escapeHtml(s == null ? "" : String(s));
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // =============================================================
  // QUESTION REFRESH (May 2026: now 4 coding problems per version)
  // =============================================================
  // Generates fresh seeds for both versions and writes them to
  // /config/exam_seeds. Guarantees:
  //   1. Both versions (A, B) get DIFFERENT coding problems in slot
  //      P1 (from "easy_medium_starter" — the new 10-pt slot).
  //   2. Both versions get DIFFERENT coding problems in slots P2 and
  //      P3 (from "control_loop_function").
  //   3. Both versions get DIFFERENT coding problems in slot P4
  //      (from "array_or_string_hard").
  //   4. MC seed strings are unique per version so the 20-question
  //      pick (15 from MC_BANK + 5 from MC_BANK_NEW) and balanced-
  //      distribution layout differs per version.
  // =============================================================
  function setRefreshMsg(text, kind) {
    const el = $("refreshMsg");
    el.textContent = text;
    el.className = "admin-msg kind-" + (kind || "ok");
  }

  function randomSeed(prefix) {
    // 10 random hex chars gives ~1 in 10^12 collision chance per version.
    const chars = "0123456789abcdef";
    let s = "";
    for (let i = 0; i < 10; i++) {
      s += chars[Math.floor(Math.random() * 16)];
    }
    return prefix + "_" + Date.now().toString(36) + "_" + s;
  }

  function pickNDistinct(categoryIndices, n) {
    // Fisher-Yates shuffle, take first n.
    const a = categoryIndices.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a.slice(0, n);
  }

  async function onRefreshQuestions() {
    // Sanity: coding bank must be loaded
    const idx = window.CODING_BANK_IDX;
    if (
      !idx ||
      !idx.easy_medium_starter ||
      !idx.control_loop_function ||
      !idx.array_or_string_hard
    ) {
      setRefreshMsg("Coding bank not loaded. Please reload the page.", "err");
      return;
    }
    const easyCount = idx.easy_medium_starter.length;
    const clfCount = idx.control_loop_function.length;
    const hardCount = idx.array_or_string_hard.length;
    // We need:
    //   2 distinct easy_medium_starter (1 per version × 2 versions)  ⇒ P1
    //   4 distinct control_loop_function (2 per version × 2 versions) ⇒ P2, P3
    //   2 distinct array_or_string_hard (1 per version × 2 versions)  ⇒ P4
    if (easyCount < 2 || clfCount < 4 || hardCount < 2) {
      setRefreshMsg(
        "Coding bank too small — need at least 2 easy/medium starter, 4 control/loop, and 2 hard array/string problems.",
        "err",
      );
      return;
    }

    // Confirm with instructor
    const ok = await modalConfirm({
      title: "Refresh exam questions?",
      message:
        "This will refresh the questions shown to <b>all students who start the exam from now on</b>. " +
        "Both version A and version B will receive newly-chosen coding problems and a new test-question shuffle. " +
        "<br><br>" +
        "Students who are <b>already taking</b> an exam are not affected — their questions stay the same until they submit.",
      confirmLabel: "Yes, refresh now",
      cancelLabel: "Cancel",
      confirmStyle: "primary",
      kind: "warn",
      icon: "↻",
    });
    if (!ok) return;

    const btn = $("refreshQuestionsBtn");
    const prevText = "🔄 Refresh Exam Questions";
    btn.disabled = true;
    btn.textContent = "Refreshing…";
    setRefreshMsg("Generating new seeds and writing to Firestore…", "ok");

    try {
      // Round 2 fix (May 23, 2026): seed generation is now driven by the
      // selected exam's configuration — codingCount + versions array.
      // The previous implementation hardcoded "2 easy, 4 CLF, 2 hard" for
      // 4 coding problems across versions A and B, which ignored exams
      // configured with e.g. 2 coding problems or 3 versions.
      //
      // Distribution policy across the 3 difficulty buckets, by total
      // number of problems N (per version):
      //   N=1: [hard]              — single problem = the headline challenge
      //   N=2: [easy, hard]        — gentle start + finale
      //   N=3: [easy, clf, hard]   — one of each difficulty tier
      //   N=4: [easy, clf, clf, hard]  (the historical default)
      //   N=5+: [easy, clf, clf, ..., hard]   — extras go to CLF middle
      //
      // The picker grabs DISTINCT items per bucket across all versions, so
      // version A never overlaps with version B (or C, D) for the same slot.
      const examForRefresh = _examDocs.find(function (e) {
        return e._id === _selectedExamId;
      });
      if (!examForRefresh) {
        setRefreshMsg(
          "Could not find the selected exam. Reload and try again.",
          "err",
        );
        return;
      }
      const examVersions =
        Array.isArray(examForRefresh.versions) && examForRefresh.versions.length
          ? examForRefresh.versions
          : ["A", "B"];
      const examCodingCount =
        typeof examForRefresh.codingCount === "number" &&
        examForRefresh.codingCount >= 0
          ? examForRefresh.codingCount
          : 4;
      const examMaxPoints = Array.isArray(examForRefresh.codingMaxPoints)
        ? examForRefresh.codingMaxPoints
        : null;

      // Build the per-slot bucket assignment for this codingCount.
      // Each entry says which difficulty bucket the slot draws from.
      function _bucketPlan(n) {
        if (n <= 0) return [];
        if (n === 1) return ["hard"];
        if (n === 2) return ["easy", "hard"];
        if (n === 3) return ["easy", "clf", "hard"];
        // n >= 4: easy at start, hard at end, fill middle with CLF.
        const plan = ["easy"];
        for (let i = 0; i < n - 2; i++) plan.push("clf");
        plan.push("hard");
        return plan;
      }
      const bucketPlan = _bucketPlan(examCodingCount);

      // Count how many problems we need from each bucket, total across
      // ALL versions, so picks stay distinct.
      const needsPerBucket = { easy: 0, clf: 0, hard: 0 };
      bucketPlan.forEach(function (b) {
        needsPerBucket[b] += examVersions.length;
      });

      // Pull the distinct picks for each bucket. If the bank is too small
      // for the demand, we let pickNDistinct return what it can (silently
      // saturated) and surface a friendly error if any bucket short-fell.
      const easyAll = needsPerBucket.easy
        ? pickNDistinct(idx.easy_medium_starter, needsPerBucket.easy)
        : [];
      const clfAll = needsPerBucket.clf
        ? pickNDistinct(idx.control_loop_function, needsPerBucket.clf)
        : [];
      const hardAll = needsPerBucket.hard
        ? pickNDistinct(idx.array_or_string_hard, needsPerBucket.hard)
        : [];

      // Distinctness paranoia check — caller should never give us fewer
      // banks than required, but guard anyway.
      if (
        easyAll.length !== needsPerBucket.easy ||
        clfAll.length !== needsPerBucket.clf ||
        hardAll.length !== needsPerBucket.hard
      ) {
        setRefreshMsg(
          "The question bank does not have enough distinct problems for " +
            examCodingCount +
            " coding slots × " +
            examVersions.length +
            " versions. " +
            "Reduce the number of coding problems or versions for this exam.",
          "err",
        );
        return;
      }

      const me =
        (window.fbAuth.currentUser && window.fbAuth.currentUser.email) ||
        "unknown";

      // Walk through versions × slots, drawing from the per-bucket pools.
      // Pool cursors track how many items we've consumed from each bucket.
      const cursors = { easy: 0, clf: 0, hard: 0 };
      const pools = { easy: easyAll, clf: clfAll, hard: hardAll };
      const assignments = examVersions.map(function (v) {
        const slots = {};
        bucketPlan.forEach(function (bucket, slotIdx) {
          const pickIdx = pools[bucket][cursors[bucket]];
          cursors[bucket]++;
          slots["p" + (slotIdx + 1)] = pickIdx;
        });
        return { v: v, slots: slots };
      });

      const seedsDoc = { refreshedBy: me };
      assignments.forEach(function (a) {
        seedsDoc[a.v] = {
          mcSeed: randomSeed(a.v),
          coding: a.slots,
        };
      });

      // Check FBClient is actually available
      if (!window.FBClient || !window.FBClient.saveExamSeeds) {
        setRefreshMsg(
          "Save failed: Firebase client not loaded. Reload the page and try again.",
          "err",
        );
        return;
      }

      // Refresh is now per-exam scoped. Without a selected exam, we
      // don't know WHICH exam to refresh — bail with a clear message.
      // (The button should be hidden when no exam is selected, but
      // guard here in case of UI race conditions.)
      if (!_selectedExamId) {
        setRefreshMsg(
          "Select an exam first — refresh is now scoped to the chosen exam.",
          "err",
        );
        return;
      }

      // Save to Firestore at /exams/{examId}/seeds/current
      await window.FBClient.saveExamSeeds(_selectedExamId, seedsDoc);

      // Build a clean, styled success card per version
      const bank = window.CODING_BANK;
      const msgEl = $("refreshMsg");
      // Look up the exam for the success message context.
      const exam = _examDocs.find(function (e) {
        return e._id === _selectedExamId;
      });
      const examLabel = exam
        ? _examTypeLabel(exam.examType) +
          " · " +
          _courseLabel(exam.course) +
          " · " +
          _capitalize(exam.semester || "") +
          " " +
          (exam.academicYear || "")
        : _selectedExamId;
      if (msgEl) {
        msgEl.className = "admin-msg"; // clear kind-ok/kind-err
        // Round 2 fix: build the version blocks dynamically from each
        // assignment's slot dict. Pulls per-problem max points from the
        // exam's codingMaxPoints array (with sensible fallbacks).
        const defaultMaxesForRefresh = (function (n) {
          if (n === 4) return [10, 15, 15, 20];
          if (n === 1) return [60];
          if (n === 2) return [25, 35];
          if (n === 3) return [15, 20, 25];
          const base = Math.floor(60 / n);
          const arr = new Array(n).fill(base);
          arr[n - 1] = 60 - base * (n - 1);
          return arr;
        })(examCodingCount);
        const maxesForRefresh =
          Array.isArray(examMaxPoints) &&
          examMaxPoints.length === examCodingCount
            ? examMaxPoints
            : defaultMaxesForRefresh;

        const versionBlocks = assignments
          .map(function (a) {
            const slotKeys = Object.keys(a.slots).sort(function (x, y) {
              return parseInt(x.slice(1), 10) - parseInt(y.slice(1), 10);
            });
            const problemBits = slotKeys
              .map(function (key, idx) {
                const pickIdx = a.slots[key];
                const p = bank[pickIdx];
                const max = maxesForRefresh[idx] || 0;
                return (
                  "<b>P" +
                  (idx + 1) +
                  " (" +
                  max +
                  "pt):</b> " +
                  escapeHtml(p ? p.title_en : "?")
                );
              })
              .join("  &nbsp;·&nbsp;  ");
            return (
              '<div class="rsc-version">' +
              '<span class="rsc-version-label">Version ' +
              a.v +
              "</span>" +
              '<div class="rsc-problems">' +
              problemBits +
              "</div>" +
              "</div>"
            );
          })
          .join("");
        msgEl.innerHTML =
          '<div class="refresh-success-card">' +
          '<div class="rsc-head">' +
          '<span class="rsc-check">✓</span>' +
          "Refreshed for <b>" +
          escapeHtml(examLabel) +
          "</b> — new questions are live for the next batch of students to start" +
          "</div>" +
          versionBlocks +
          "</div>";
      }
      loadRefreshStatus();
    } catch (err) {
      console.error("Refresh failed:", err);
      setRefreshMsg(
        "Save failed: " +
          (err && err.message ? err.message : String(err)) +
          (err && err.code ? " [" + err.code + "]" : ""),
        "err",
      );
    } finally {
      // ALWAYS reset the button, even if the browser is offline
      btn.disabled = false;
      btn.textContent = prevText;
    }
  }

  function loadRefreshStatus() {
    const el = $("refreshStatus");
    if (!el) return;
    const setPill = function (kind, icon, textHtml) {
      el.className = "refresh-status-pill kind-" + kind;
      el.innerHTML =
        '<span class="rsp-icon">' +
        icon +
        "</span>" +
        '<span class="rsp-text">' +
        textHtml +
        "</span>";
    };

    // No exam selected → ambiguous state. Show a neutral message.
    if (!_selectedExamId) {
      setPill("warn", "—", "Select an exam to see refresh status");
      return;
    }

    // Per-exam seed doc lives at /exams/{examId}/seeds/current.
    // If that doc doesn't exist, fall back to the legacy global doc so
    // exams created before per-exam refresh still show meaningful status.
    const examRef = window.fbDb.collection("exams").doc(_selectedExamId);
    examRef
      .collection("seeds")
      .doc("current")
      .get()
      .then(function (snap) {
        if (snap.exists) return { data: snap.data(), source: "per-exam" };
        // Fall back to global doc
        return window.fbDb
          .collection("config")
          .doc("exam_seeds")
          .get()
          .then(function (s) {
            if (!s.exists) return null;
            return { data: s.data(), source: "legacy-global" };
          });
      })
      .then(function (result) {
        if (!result) {
          setPill("warn", "—", "Never refreshed · defaults in use");
          return;
        }
        const d = result.data;
        const ts = d.refreshedAt ? d.refreshedAt.toDate() : null;
        if (!ts) {
          setPill("ok", "✓", "Refresh saved · awaiting server timestamp");
          return;
        }
        const mins = Math.floor((Date.now() - ts.getTime()) / 60000);
        let rel;
        if (mins < 1) rel = "just now";
        else if (mins < 60) rel = mins + " min ago";
        else if (mins < 1440) rel = Math.floor(mins / 60) + "h ago";
        else rel = Math.floor(mins / 1440) + "d ago";
        const by = d.refreshedBy
          ? " · by <b>" + escapeHtml(d.refreshedBy) + "</b>"
          : "";
        const legacyTag =
          result.source === "legacy-global"
            ? ' <span class="muted" title="Reading from old global doc — refresh this exam to migrate">(legacy)</span>'
            : "";
        setPill(
          "ok",
          "✓",
          "Last refreshed: <b>" + rel + "</b>" + by + legacyTag,
        );
      })
      .catch(function (err) {
        setPill(
          "err",
          "!",
          "Status unavailable (" + escapeHtml(err.code || "error") + ")",
        );
      });
  }

  // =============================================================
  // FEATURE 6: AI Code Auto-Grader — Drawer + grading flow
  // =============================================================
  // State for the currently-open drawer.
  let _gradingState = null; // { submission, problems: [{aiResult, override}] }

  function openGradingDrawer(submission) {
    const drawer = $("gradingDrawer");
    if (!drawer) return;
    // Clear any leftover status banner from a previous grading session.
    setGradingStatus(null);
    if (!submission.codingAnswers || !submission.codingAnswers.length) {
      openModal({
        title: "Cannot grade this submission",
        message:
          "This submission was made before Feature 6 was added, so the " +
          "student's coding answers were not stored on the server. New " +
          "submissions made from now on can be graded.",
        kind: "warn",
        icon: "!",
        buttons: [{ label: "OK", value: true, style: "primary" }],
      });
      return;
    }
    // Initialize state
    const meta = submission.codingProblemMeta || [];
    _gradingState = {
      submission: submission,
      problems: meta.map(function (m, idx) {
        const existingAi =
          submission.aiGrading && submission.aiGrading["problem" + (idx + 1)];
        const existingOverride =
          submission.instructorGrading &&
          submission.instructorGrading["problem" + (idx + 1)];
        return {
          meta: m,
          studentCode: (submission.codingAnswers || [])[idx] || "",
          aiResult: existingAi || null,
          override: existingOverride
            ? {
                score: existingOverride.score,
                comment: existingOverride.comment || "",
              }
            : null,
          // Per-problem grading state (idle | grading | failed)
          state: existingAi ? "graded" : "idle",
        };
      }),
    };

    // Render header
    const studentName = [submission.firstName, submission.lastName]
      .filter(Boolean)
      .join(" ");
    $("sgdTitle").textContent =
      studentName + " · Group " + (submission.group || "—");
    $("sgdSub").innerHTML =
      "Student ID <b>" +
      esc(submission.studentId) +
      "</b> · " +
      "Version <b>" +
      esc(submission.version) +
      "</b> · " +
      "Submitted " +
      (submission.submittedAt
        ? submission.submittedAt.toDate().toLocaleString()
        : "—");

    // Set max points (Round 2: all dynamic, derived from submission data
    // with fallback to legacy 40/60 totals for old submissions).
    const codingMax = _gradingState.problems.reduce(function (s, p) {
      return s + (p.meta.maxPoints || 0);
    }, 0);
    const mcMax = submission.mcMaxPoints != null ? submission.mcMaxPoints : 40;
    const totalMax = mcMax + codingMax;
    $("sgdCodingMax").textContent = String(codingMax);
    $("sgdCodingMax2").textContent = String(codingMax);
    $("sgdMcMax").textContent = String(mcMax);
    $("sgdTotalMax").textContent = String(totalMax);

    // FIX (May 23): the grade-all button label was hardcoded to "Grade
    // all 4 problems with AI", which was wrong for any exam that
    // didn't have exactly 4 coding problems. Now sourced from the
    // actual number of problems on this submission.
    //
    // Singular/plural handled so a single-problem exam reads cleanly
    // ("Grade 1 problem with AI" rather than "Grade 1 problems").
    const nProblems = _gradingState.problems.length;
    const gradeBtnLabel = $("sgdGradeAllBtnLabel");
    if (gradeBtnLabel) {
      gradeBtnLabel.textContent =
        nProblems === 1
          ? "Grade 1 problem with AI"
          : "Grade all " + nProblems + " problems with AI";
    }

    // Render problem cards + summary
    renderGradingProblems();
    updateGradingSummary();

    // Show drawer
    drawer.style.display = "flex";
    requestAnimationFrame(function () {
      drawer.classList.add("open");
    });
    document.body.classList.add("sn-drawer-open");
  }

  function closeGradingDrawer() {
    const drawer = $("gradingDrawer");
    if (!drawer) return;
    drawer.classList.remove("open");
    setTimeout(function () {
      drawer.style.display = "none";
    }, 240);
    document.body.classList.remove("sn-drawer-open");
    _gradingState = null;
  }

  // Pick the trilingual title/description based on instructor language pref.
  // For now, default to English. Future enhancement: respect a localStorage flag.
  function _problemTitle(meta) {
    return meta.title_en || meta.title_uz || meta.title_ru || "Problem";
  }
  function _problemDescriptionLines(meta) {
    const arr =
      (meta.en && meta.en.length
        ? meta.en
        : meta.uz && meta.uz.length
          ? meta.uz
          : meta.ru) || [];
    return arr.map(function (line) {
      // The bullet strings contain inline <code>...</code> markup; we
      // preserve it but escape any stray special chars elsewhere.
      return String(line);
    });
  }

  function renderGradingProblems() {
    if (!_gradingState) return;
    const container = $("sgdProblemsContainer");
    container.innerHTML = "";
    _gradingState.problems.forEach(function (p, idx) {
      container.appendChild(buildProblemCard(p, idx));
    });
  }

  function buildProblemCard(p, idx) {
    const max = p.meta.maxPoints || 10;
    const card = document.createElement("article");
    card.className = "sn-grading-card sn-grading-card-state-" + p.state;
    card.dataset.problemIdx = String(idx);

    // ----- Header
    const title = _problemTitle(p.meta);
    const desc = _problemDescriptionLines(p.meta);
    const descHtml = desc.length
      ? '<ol class="sn-grading-desc">' +
        desc
          .map(function (line) {
            return "<li>" + line + "</li>";
          })
          .join("") +
        "</ol>"
      : '<div class="sn-grading-desc-empty">No description on file.</div>';

    // ----- AI grade block
    let aiBlockHtml;
    if (p.state === "graded" && p.aiResult) {
      aiBlockHtml = renderAiBlock(p.aiResult, max);
    } else if (p.state === "grading") {
      aiBlockHtml =
        '<div class="sn-ai-block sn-ai-block-grading">' +
        '<div class="sn-ai-block-spinner"></div>' +
        '<div class="sn-ai-block-status">Gemini is grading…</div>' +
        "</div>";
    } else if (p.state === "failed") {
      aiBlockHtml =
        '<div class="sn-ai-block sn-ai-block-failed">' +
        '<div class="sn-ai-block-failed-icon">!</div>' +
        '<div class="sn-ai-block-failed-text">' +
        "<b>AI grading failed.</b> " +
        esc(p.error || "Unknown error") +
        ' <button type="button" class="sn-link sn-retry-grade-btn" data-idx="' +
        idx +
        '">Try again</button>' +
        "</div>" +
        "</div>";
    } else {
      aiBlockHtml =
        '<div class="sn-ai-block sn-ai-block-idle">' +
        '<button type="button" class="sn-btn-primary sn-grade-one-btn" data-idx="' +
        idx +
        '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L9 9l-7 .8 5.4 4.7L6 22l6-3.5 6 3.5-1.4-7.5L22 9.8 15 9z"/></svg>' +
        '<span class="sn-btn-text">Grade this problem with AI</span>' +
        "</button>" +
        "</div>";
    }

    // ----- Instructor override block
    // The override is ALWAYS editable. Even if AI grading failed for
    // this problem, the instructor must be able to set a manual score
    // (otherwise a single AI failure blocks the whole save). Defaults
    // to the AI score when graded, or 0 otherwise.
    const overrideScore = p.override
      ? p.override.score
      : p.aiResult
        ? p.aiResult.score
        : 0;
    const overrideComment = (p.override && p.override.comment) || "";
    const overrideHtml =
      '<div class="sn-override-block">' +
      '<div class="sn-override-head">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
      "<span><b>Instructor override</b></span>" +
      '<span class="sn-override-hint">' +
      (p.state === "failed"
        ? "AI failed — please grade this problem manually."
        : "Optional — leave as AI score to accept it") +
      "</span>" +
      "</div>" +
      '<div class="sn-override-controls">' +
      '<label class="sn-override-score">' +
      "<span>Final score</span>" +
      '<div class="sn-override-score-input">' +
      '<input type="number" class="sn-override-score-num" data-idx="' +
      idx +
      '" min="0" max="' +
      max +
      '" step="1" value="' +
      overrideScore +
      '"/>' +
      '<span class="sn-override-score-max">/ ' +
      max +
      "</span>" +
      "</div>" +
      "</label>" +
      '<label class="sn-override-comment">' +
      "<span>Comment (optional)</span>" +
      '<textarea class="sn-override-comment-text" data-idx="' +
      idx +
      '" rows="2" placeholder="e.g. Partial credit — solution worked for positive inputs only.">' +
      esc(overrideComment) +
      "</textarea>" +
      "</label>" +
      "</div>" +
      "</div>";

    card.innerHTML =
      '<header class="sn-grading-card-head">' +
      '<div class="sn-grading-card-num">' +
      (idx + 1) +
      "</div>" +
      '<div class="sn-grading-card-titles">' +
      '<h3 class="sn-grading-card-title">' +
      esc(title) +
      "</h3>" +
      '<div class="sn-grading-card-max"><b>' +
      max +
      "</b> max points</div>" +
      "</div>" +
      "</header>" +
      '<details class="sn-grading-collapse" open>' +
      "<summary>Problem description</summary>" +
      descHtml +
      "</details>" +
      '<details class="sn-grading-collapse">' +
      "<summary>Student's code</summary>" +
      '<pre class="sn-grading-code">' +
      esc(p.studentCode || "(empty)") +
      "</pre>" +
      "</details>" +
      aiBlockHtml +
      overrideHtml;

    // Wire interactions on this card
    setTimeout(function () {
      wireCardHandlers(card, idx);
    }, 0);
    return card;
  }

  function renderAiBlock(aiResult, maxPoints) {
    const b = aiResult.breakdown || {};
    const c = aiResult.categoryComments || {};
    const barRow = function (label, pct, comment) {
      const safePct = Math.max(0, Math.min(100, pct || 0));
      const colorClass = safePct >= 80 ? "good" : safePct >= 50 ? "mid" : "low";
      return (
        '<div class="sn-ai-bar-row">' +
        '<div class="sn-ai-bar-label">' +
        label +
        "</div>" +
        '<div class="sn-ai-bar-track">' +
        '<div class="sn-ai-bar-fill sn-ai-bar-' +
        colorClass +
        '" style="width:' +
        safePct +
        '%"></div>' +
        '<span class="sn-ai-bar-pct">' +
        safePct +
        "%</span>" +
        "</div>" +
        '<div class="sn-ai-bar-comment">' +
        esc(comment || "") +
        "</div>" +
        "</div>"
      );
    };
    return (
      '<div class="sn-ai-block sn-ai-block-graded">' +
      '<div class="sn-ai-block-head">' +
      '<div class="sn-ai-block-headline">' +
      '<span class="sn-ai-badge">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2L9 9l-7 .8 5.4 4.7L6 22l6-3.5 6 3.5-1.4-7.5L22 9.8 15 9z"/></svg>' +
      "AI Grade</span>" +
      '<span class="sn-ai-block-score"><b>' +
      aiResult.score +
      "</b><span> / " +
      maxPoints +
      "</span></span>" +
      "</div>" +
      (aiResult.summary
        ? '<div class="sn-ai-block-summary">' + esc(aiResult.summary) + "</div>"
        : "") +
      "</div>" +
      '<div class="sn-ai-bars">' +
      barRow("Correctness · 60%", b.correctness, c.correctness) +
      barRow("Code Quality · 20%", b.codeQuality, c.codeQuality) +
      barRow("Efficiency · 10%", b.efficiency, c.efficiency) +
      barRow("Edge Cases · 10%", b.edgeCases, c.edgeCases) +
      "</div>" +
      "</div>"
    );
  }

  function wireCardHandlers(card, idx) {
    const gradeBtn = card.querySelector(".sn-grade-one-btn");
    const retryBtn = card.querySelector(".sn-retry-grade-btn");
    const scoreInput = card.querySelector(".sn-override-score-num");
    const commentInput = card.querySelector(".sn-override-comment-text");

    if (gradeBtn) {
      gradeBtn.addEventListener("click", function () {
        gradeOneProblem(idx);
      });
    }
    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        gradeOneProblem(idx);
      });
    }
    // Seed override from current input value so the state is in sync
    // with whatever the DOM shows (handles the case where instructor
    // grades a card with no AI result — they need to type a score and
    // we need to capture it).
    if (scoreInput && _gradingState) {
      const p = _gradingState.problems[idx];
      if (!p.override) {
        const initialScore = parseInt(scoreInput.value, 10);
        p.override = {
          score: Number.isFinite(initialScore) ? initialScore : 0,
          comment: (commentInput && commentInput.value) || "",
        };
      }
    }
    if (scoreInput) {
      scoreInput.addEventListener("input", function () {
        const v = parseInt(scoreInput.value, 10);
        if (!_gradingState) return;
        const p = _gradingState.problems[idx];
        const max = p.meta.maxPoints || 10;
        const clamped = Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0));
        p.override = p.override || { score: clamped, comment: "" };
        p.override.score = clamped;
        updateGradingSummary();
      });
    }
    if (commentInput) {
      commentInput.addEventListener("input", function () {
        if (!_gradingState) return;
        const p = _gradingState.problems[idx];
        p.override = p.override || {
          score: p.aiResult ? p.aiResult.score : 0,
          comment: "",
        };
        p.override.comment = commentInput.value;
      });
    }
  }

  async function gradeOneProblem(idx, opts) {
    if (!_gradingState) return;
    const suppressStatus = !!(opts && opts.suppressStatus);
    const p = _gradingState.problems[idx];
    p.state = "grading";
    p.error = null;
    if (!suppressStatus) {
      // Solo grade — show our own running banner; success/failure
      // banner is set after the API call completes.
      setGradingStatus("running", "AI grading in progress…");
    }
    renderGradingProblems(); // re-render to show spinner

    // Build descriptions for Gemini — flatten the bullet array, strip HTML
    const descLines = _problemDescriptionLines(p.meta);
    const descPlain = descLines
      .map(function (l) {
        return String(l)
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
      })
      .filter(Boolean)
      .map(function (l, i) {
        return i + 1 + ". " + l;
      })
      .join("\n");

    try {
      const resp = await fetch("/api/grade-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle: _problemTitle(p.meta),
          problemDescription: descPlain,
          starterCode: p.meta.starter || "",
          studentCode: p.studentCode || "",
          maxPoints: p.meta.maxPoints || 10,
        }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(function () {
          return {};
        });
        const msg = j.error || "HTTP " + resp.status;
        // Classify common Gemini errors for a clearer message
        let friendly = msg;
        if (/quota|RESOURCE_EXHAUSTED|429/i.test(msg)) {
          friendly =
            "Gemini daily quota reached. Try again tomorrow or use the manual override below.";
        } else if (/UNAVAILABLE|503|high demand/i.test(msg)) {
          friendly =
            "Gemini is overloaded right now. Try again in a minute, or use the manual override below.";
        } else if (/not valid JSON|parse/i.test(msg)) {
          friendly =
            "Gemini returned a malformed response. Try again, or use the manual override below.";
        }
        throw new Error(friendly);
      }
      const result = await resp.json();
      p.aiResult = result;
      p.state = "graded";
      // Default override = AI score (instructor can change it)
      p.override = { score: result.score, comment: "" };
    } catch (err) {
      console.error("[grade-code] failed", err);
      p.error = (err && err.message) || "Unknown error";
      p.state = "failed";
    }
    renderGradingProblems();
    updateGradingSummary();
    if (!suppressStatus) {
      // Solo grade — post a definitive status banner now that we're done.
      if (p.state === "graded") {
        setGradingStatus(
          "success",
          "AI Grading completed successfully — problem " + (idx + 1) + " graded",
        );
      } else {
        setGradingStatus(
          "error",
          "AI Grading failed — " + (p.error || "unknown error"),
        );
      }
    }
  }

  // -----------------------------------------------------------------
  // AI Grading status banner — Issue 7
  // -----------------------------------------------------------------
  // Visible feedback for the asynchronous grading flow. Three states:
  //   running → spinner + "AI grading in progress…"
  //   success → "AI Grading completed successfully" (auto-clears after 5s)
  //   error   → "AI Grading failed — {n}/{m} problems errored"
  //             (sticky until the next action; user can click ✕)
  // The banner is also used by single-problem grade buttons so it stays
  // consistent.
  function setGradingStatus(state, message) {
    const el = $("sgdGradingStatus");
    if (!el) return;
    if (window._sgdStatusTimer) {
      clearTimeout(window._sgdStatusTimer);
      window._sgdStatusTimer = null;
    }
    el.classList.remove("is-running", "is-success", "is-error");
    if (state == null) {
      el.style.display = "none";
      return;
    }
    el.classList.add("is-" + state);
    el.style.display = "flex";
    const icon = el.querySelector(".sn-grading-status-icon");
    const text = el.querySelector(".sn-grading-status-text");
    if (icon) {
      if (state === "running") {
        icon.innerHTML = '<span class="sn-grading-spinner"></span>';
      } else if (state === "success") {
        icon.textContent = "✓";
      } else {
        icon.textContent = "✕";
      }
    }
    if (text) text.textContent = message;
    // Auto-clear success after 5s. Errors stay until user takes another
    // action — they're useful to leave visible while the instructor
    // reads the per-problem error notes.
    if (state === "success") {
      window._sgdStatusTimer = setTimeout(function () {
        el.style.display = "none";
        el.classList.remove("is-success");
      }, 5000);
    }
  }

  async function gradeAllProblems() {
    if (!_gradingState) return;
    const btn = $("sgdGradeAllBtn");
    if (btn) btn.disabled = true;
    const total = _gradingState.problems.length;
    let succeeded = 0;
    let failed = 0;
    // Initial running state
    setGradingStatus(
      "running",
      "AI grading in progress… 0 of " + total + " complete",
    );
    // Grade each problem sequentially (avoids overwhelming Gemini's
    // free-tier RPM limit; ~5-15s per problem × N = 20-60s total).
    for (let i = 0; i < _gradingState.problems.length; i++) {
      const p = _gradingState.problems[i];
      // Skip ones already graded
      if (p.state === "graded") {
        succeeded++;
        setGradingStatus(
          "running",
          "AI grading in progress… " +
            (succeeded + failed) +
            " of " +
            total +
            " complete",
        );
        continue;
      }
      await gradeOneProblem(i, { suppressStatus: true });
      if (p.state === "graded") succeeded++;
      else if (p.state === "failed") failed++;
      setGradingStatus(
        "running",
        "AI grading in progress… " +
          (succeeded + failed) +
          " of " +
          total +
          " complete",
      );
    }
    if (btn) btn.disabled = false;
    if (failed === 0) {
      setGradingStatus(
        "success",
        "AI Grading completed successfully — " +
          succeeded +
          " of " +
          total +
          " problems graded",
      );
    } else {
      setGradingStatus(
        "error",
        "AI Grading completed with errors — " +
          succeeded +
          " of " +
          total +
          " graded, " +
          failed +
          " failed. See per-problem details below.",
      );
    }
  }

  function updateGradingSummary() {
    if (!_gradingState) return;
    const sub = _gradingState.submission;
    // MC
    $("sgdMcValue").textContent = sub.mcScore != null ? sub.mcScore : "—";
    // AI coding total
    let aiTotal = 0;
    let aiHasAny = false;
    _gradingState.problems.forEach(function (p) {
      if (p.aiResult && typeof p.aiResult.score === "number") {
        aiTotal += p.aiResult.score;
        aiHasAny = true;
      }
    });
    $("sgdAiCodingValue").textContent = aiHasAny ? String(aiTotal) : "—";
    // Instructor coding total
    let instTotal = 0;
    let instHasAny = false;
    _gradingState.problems.forEach(function (p) {
      if (p.override && typeof p.override.score === "number") {
        instTotal += p.override.score;
        instHasAny = true;
      } else if (p.aiResult && typeof p.aiResult.score === "number") {
        instTotal += p.aiResult.score;
      }
    });
    $("sgdInstructorCodingValue").textContent = instHasAny
      ? String(instTotal)
      : "—";
    // Final grade
    const fg = (sub.mcScore || 0) + instTotal;
    $("sgdFinalValue").textContent = String(fg);
    // Save button: ENABLED whenever no problem is currently being graded.
    // Failed problems can still be saved (instructor types a manual score).
    // Even fully un-graded problems can be saved if the instructor wants to
    // grade purely manually without AI. The previous "all graded" gating
    // was too strict and blocked saves when AI failed on one card.
    const anyGrading = _gradingState.problems.some(function (p) {
      return p.state === "grading";
    });
    $("sgdSaveBtn").disabled = anyGrading;
  }

  async function saveGradingDecision() {
    if (!_gradingState) return;
    const saveBtn = $("sgdSaveBtn");
    saveBtn.disabled = true;
    const txt = saveBtn.querySelector(".sn-btn-text");
    const prev = txt.textContent;
    txt.textContent = "Saving…";

    const sub = _gradingState.submission;
    const me =
      (window.fbAuth.currentUser && window.fbAuth.currentUser.email) || "";
    const aiGrading = {
      status: "graded",
      gradedAt: firebase.firestore.FieldValue.serverTimestamp(),
      gradedBy: "gemini-2.5-flash",
    };
    const instructorGrading = {
      overriddenAt: firebase.firestore.FieldValue.serverTimestamp(),
      overriddenBy: me,
    };
    let aiTotal = 0;
    let instTotal = 0;
    _gradingState.problems.forEach(function (p, i) {
      if (p.aiResult) {
        aiGrading["problem" + (i + 1)] = {
          score: p.aiResult.score,
          maxPoints: p.meta.maxPoints || 10,
          breakdown: p.aiResult.breakdown || {},
          categoryComments: p.aiResult.categoryComments || {},
          summary: p.aiResult.summary || "",
        };
        aiTotal += p.aiResult.score;
      }
      const oScore = p.override
        ? p.override.score
        : p.aiResult
          ? p.aiResult.score
          : 0;
      const oComment = p.override ? p.override.comment || "" : "";
      instructorGrading["problem" + (i + 1)] = {
        score: oScore,
        maxPoints: p.meta.maxPoints || 10,
        comment: oComment,
      };
      instTotal += oScore;
    });
    aiGrading.totalCoding = aiTotal;
    aiGrading.maxCoding = _gradingState.problems.reduce(function (s, p) {
      return s + (p.meta.maxPoints || 0);
    }, 0);
    instructorGrading.totalCoding = instTotal;
    const finalGrade = (sub.mcScore || 0) + instTotal;

    try {
      await window.fbDb.collection("submissions").doc(sub.id).set(
        {
          aiGrading: aiGrading,
          instructorGrading: instructorGrading,
          finalGrade: finalGrade,
        },
        { merge: true },
      );
      // Update the local row data so the table reflects the new state
      // without a full reload.
      sub.aiGrading = aiGrading;
      sub.instructorGrading = instructorGrading;
      sub.finalGrade = finalGrade;
      txt.textContent = "Saved ✓";
      setTimeout(function () {
        closeGradingDrawer();
        loadSubmissions();
      }, 600);
    } catch (err) {
      console.error("[grading] save failed", err);
      txt.textContent = prev;
      saveBtn.disabled = false;
      openModal({
        title: "Save failed",
        message: _escapeHtml((err && err.message) || String(err)),
        kind: "danger",
        icon: "!",
        buttons: [{ label: "OK", value: true, style: "primary" }],
      });
    }
  }

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Wire drawer controls once on init
  document.addEventListener("DOMContentLoaded", function () {
    const closeBtn = document.getElementById("sgdClose");
    if (closeBtn) closeBtn.addEventListener("click", closeGradingDrawer);
    const cancelBtn = document.getElementById("sgdCancelBtn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeGradingDrawer);
    const gradeAllBtn = document.getElementById("sgdGradeAllBtn");
    if (gradeAllBtn) gradeAllBtn.addEventListener("click", gradeAllProblems);
    const saveBtn = document.getElementById("sgdSaveBtn");
    if (saveBtn) saveBtn.addEventListener("click", saveGradingDecision);
    // Backdrop click closes the drawer
    const drawer = document.getElementById("gradingDrawer");
    if (drawer) {
      const backdrop = drawer.querySelector(".sn-grading-drawer-backdrop");
      if (backdrop) backdrop.addEventListener("click", closeGradingDrawer);
    }
    // ESC closes
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && _gradingState) closeGradingDrawer();
    });
  });
})();
