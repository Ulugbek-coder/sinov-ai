// =============================================================
// C++ Homework Assignment — Main Application
// - Reads version from URL (?v=A / B / C / D)
// - Shuffles MC bank deterministically per version (seeded)
// - Anti-cheating: fixed tab-switch double-count bug
// - Starter code: uses value (not placeholder) so it persists
// =============================================================

// Default exam duration in seconds — 100 minutes.
// FIX (May 23, Round 2 follow-up): made mutable. initExamPage() now
// overrides this from the per-exam config's `duration` field (minutes)
// before startTimer() runs. Without this, every exam ran for 100 min
// regardless of the instructor's configuration. The 100-min default
// is kept only as a fallback for legacy exam docs that predate the
// Round 2 `duration` field.
let EXAM_DURATION = 100 * 60;

// =============================================================
// LANGUAGE TOGGLE MODULE
// -------------------------------------------------------------
// Two bilingual modes: English+Uzbek (default) and English+Russian.
// The active mode adds a class onto <body>: "lang-uz" or "lang-ru".
// CSS rules in styles.css use these to show/hide .uz vs .ru spans.
// The choice persists across pages via localStorage.examLang.
// IIFE so it runs as early as possible (before DOMContentLoaded), to
// avoid a flash of the wrong language while the page is rendering.
// =============================================================
(function applyLanguageEarly() {
  let lang;
  try {
    lang = localStorage.getItem("examLang");
  } catch (_) {
    lang = null;
  }
  if (lang !== "uz" && lang !== "ru") lang = "uz"; // default
  // Document might not have <body> yet at this point (script in <head>);
  // setting via documentElement is fine — CSS rules also accept that.
  // We mirror onto <body> as soon as it's available.
  const setBoth = function () {
    const html = document.documentElement;
    const body = document.body;
    [html, body].forEach((el) => {
      if (!el) return;
      el.classList.remove("lang-uz", "lang-ru");
      el.classList.add("lang-" + lang);
    });
  };
  setBoth();
  document.addEventListener("DOMContentLoaded", setBoth);
})();

// Public helpers exposed for the dropdown click handler and any caller
// that needs the current language at runtime.
window.getExamLang = function () {
  try {
    const v = localStorage.getItem("examLang");
    return v === "ru" ? "ru" : "uz";
  } catch (_) {
    return "uz";
  }
};
window.setExamLang = function (lang) {
  if (lang !== "uz" && lang !== "ru") return;
  try {
    localStorage.setItem("examLang", lang);
  } catch (_) {}
  const html = document.documentElement;
  const body = document.body;
  [html, body].forEach((el) => {
    if (!el) return;
    el.classList.remove("lang-uz", "lang-ru");
    el.classList.add("lang-" + lang);
  });
  // Sync any dropdowns on the page (select elements inside .lang-switcher)
  document.querySelectorAll(".lang-switcher select").forEach(function (sel) {
    if (sel.value !== lang) sel.value = lang;
  });
  // Swap localized placeholders on any element carrying data-placeholder-*
  // attributes. Used by the stdin textareas in the coding section so the
  // placeholder text matches the chosen language.
  applyLocalizedPlaceholders(lang);
};

// Walks the DOM and updates `placeholder` on every element that has
// data-placeholder-en / -uz / -ru attributes. EN is always shown alongside
// the secondary language, so we render "<EN> / <SECONDARY>".
function applyLocalizedPlaceholders(lang) {
  document.querySelectorAll("[data-placeholder-en]").forEach(function (el) {
    const en = el.getAttribute("data-placeholder-en") || "";
    const uz = el.getAttribute("data-placeholder-uz") || "";
    const ru = el.getAttribute("data-placeholder-ru") || "";
    const secondary = lang === "ru" ? ru : uz;
    el.placeholder = secondary ? en + "  /  " + secondary : en;
  });
}

// Wire any .lang-switcher dropdown on this page to call setExamLang.
function wireLangSwitcher() {
  const initial = window.getExamLang();
  document.querySelectorAll(".lang-switcher select").forEach(function (sel) {
    sel.value = initial;
    sel.addEventListener("change", function () {
      window.setExamLang(this.value);
    });
  });
  // Apply placeholders for the initial language as well
  applyLocalizedPlaceholders(initial);
}

let studentInfo = { group: "", id: "", firstName: "", lastName: "" };
let examVersion = null;
let versionData = null;
let mcQuestions = [];
let optionOrders = [];
let userAnswers = [];
let startTime = null;
let timerInterval = null;
let tabSwitches = 0;
let examEnded = false;
let starterCodeStripped = [false, false];

// ---------- Master override + schedule state ----------
// Set from index.html query params; used to gate the Start button.
let masterOverrideActive = false;
let currentSchedule = null; // { startAt, endAt, status }

// ---------- Per-exam webcam feature flag ----------
// The instructor can turn the webcam feature OFF for a specific exam
// from the admin dashboard (Exams section → "Webcam Feature" toggle →
// per-exam selection modal). The flag lives on the exam config doc as
// `webcamEnabled: false`. When OFF for the active exam:
//   - no proctoring consent gate on the welcome page,
//   - no verification photo capture at exam start,
//   - no live webcam proctoring during the exam,
//   - the final scorecard + PDF show an avatar placeholder instead of
//     the verification photo,
//   - the submission is tagged `webcamDisabled: true` so the admin
//     dashboard shows "webcam turned off by the admin" in place of the
//     proctoring evidence.
// Absence of the field (legacy exam docs) means the webcam feature is ON.
function webcamFeatureDisabled() {
  const cfg = window._sinovActiveExamConfig;
  return !!(cfg && cfg.webcamEnabled === false);
}

// ---------------- Helpers ----------------
function $(id) {
  return document.getElementById(id);
}

// Seeded pseudo-random — Mulberry32
function seededRNG(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// ---------------- Fractional points (Round 3, July 2026) ----------------
// Instructors can now award fractional points per question (2.5, 3.2,
// 0.75 …). Two helpers keep that from leaking floating-point noise
// into scores and into the UI.

// Round to 2 decimal places. Without this, accumulating 2.5 + 2.5 + 5
// style values across 30 questions can surface artifacts like
// 87.49999999999999 in the stored score.
function roundPoints(n) {
  if (typeof n !== "number" || !isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

// Format a point value for display: 40 → "40", 2.5 → "2.5",
// 87.50 → "87.5". Keeps whole numbers looking whole so existing
// integer-scored exams read exactly as they always have.
function fmtPoints(n) {
  if (typeof n !== "number" || !isFinite(n)) return String(n == null ? "" : n);
  return String(roundPoints(n));
}
// Exposed so pdf-generator.js can share the exact same formatting.
window.snFmtPoints = fmtPoints;
window.snRoundPoints = roundPoints;

// Escape option text so that bare angle brackets in C++ option strings
// (like "<string>", "<iostream>", "static_cast<int>") render as literal
// text instead of being silently eaten by the browser as unknown HTML
// tags. We still allow a small whitelist of intentionally-used markup
// tags from the question banks (<code>, <b>, <i>, <em>, <strong>) — those
// pass through unescaped after a bracket-by-bracket escape pass.
function escapeOptionText(s) {
  if (typeof s !== "string") return "";
  // First escape all < and > to entities
  let out = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Re-enable a small whitelist of safe tags.
  // (No attributes allowed — purely literal tag forms.)
  out = out
    .replace(/&lt;code&gt;/g, "<code>")
    .replace(/&lt;\/code&gt;/g, "</code>")
    .replace(/&lt;b&gt;/g, "<b>")
    .replace(/&lt;\/b&gt;/g, "</b>")
    .replace(/&lt;i&gt;/g, "<i>")
    .replace(/&lt;\/i&gt;/g, "</i>")
    .replace(/&lt;em&gt;/g, "<em>")
    .replace(/&lt;\/em&gt;/g, "</em>")
    .replace(/&lt;strong&gt;/g, "<strong>")
    .replace(/&lt;\/strong&gt;/g, "</strong>")
    // July 2026: sub/sup are required by the mathematics banks, whose
    // options carry real notation (Sigma<sub>n=1</sub><sup>inf</sup>,
    // e<sup>x</sup>, x<sup>3</sup>/3 + C). Without them the tags were
    // escaped and students saw literal "<sub>n=1</sub>" markup inside
    // every answer option.
    .replace(/&lt;sub&gt;/g, "<sub>")
    .replace(/&lt;\/sub&gt;/g, "</sub>")
    .replace(/&lt;sup&gt;/g, "<sup>")
    .replace(/&lt;\/sup&gt;/g, "</sup>");
  return out;
}

function flash(msg) {
  const el = $("flash");
  if (!el) return;
  el.innerHTML =
    '<span class="flash-icon" aria-hidden="true">!</span>' +
    '<span class="flash-text">' +
    msg +
    "</span>";
  el.style.display = "flex";
  clearTimeout(window._flashT);
  window._flashT = setTimeout(() => {
    el.style.display = "none";
  }, 4500);
}

// ---------------- Question selection ----------------
// Pick 20 questions total:
//   - 15 from the old/main bank (window.MC_BANK)
//   - 5 from the new bank (window.MC_BANK_NEW : 20 code-snippet output
//     questions + 10 pointer questions = 30 total)
// Uses seeded shuffle so each version gets a DIFFERENT selection + ordering.
//
// Distribution of correct answers is BALANCED:
//   For 20 questions and 4 options, target = [5, 5, 5, 5] spread across
//   positions 0..3. We build a balanced target sequence, reject the
//   3-consecutive rule (i.e. allow at most 2 consecutive same letter),
//   then construct each question's option order so its correct answer
//   lands at the target position.
//
// Selection layout: 15 OLD then 5 NEW, then the whole 20 is shuffled
// once more so old/new questions are interleaved (no clean partition).
function selectArrangeAndShuffle(mainBank, newBank, seed, mcCount) {
  const rng = seededRNG(seed);

  // Defensive: fall back to whatever is available if a bank is missing
  const oldArr = Array.isArray(mainBank) ? mainBank : [];
  const newArr = Array.isArray(newBank) ? newBank : [];

  // --- 1) Pick the requested number of questions, biased 75/25 between
  //        the main bank and the "new" supplementary bank (matches the
  //        historical 15-from-main + 5-from-new at N=20). For other Ns,
  //        we approximate the same ratio.
  //
  // Round 2 (May 2026): accepts a per-exam `mcCount` so an instructor
  // can configure exams of any MC length. If mcCount is omitted or
  // invalid, falls back to the historical default of 20.
  let target = parseInt(mcCount, 10);
  if (!Number.isFinite(target) || target <= 0) target = 20;
  // Hard cap at the combined bank size so we never demand more questions
  // than exist.
  target = Math.min(target, oldArr.length + newArr.length);

  // Allocation: prefer the main bank but tap the supplementary bank up
  // to its 25% share, rounding to the nearest integer.
  let nNew = Math.min(newArr.length, Math.round(target * 0.25));
  let nOld = Math.min(oldArr.length, target - nNew);
  // If the main bank is shorter than expected, top up from the new bank.
  if (nOld + nNew < target) {
    nNew = Math.min(newArr.length, target - nOld);
  }

  const shuffledOld = seededShuffle(oldArr, rng).slice(0, nOld);
  const shuffledNew = seededShuffle(newArr, rng).slice(0, nNew);

  // Combine, then shuffle once more so the supplementary questions are
  // interleaved into the main pool instead of clustered at the end.
  const combined = shuffledOld.concat(shuffledNew);
  const selected = seededShuffle(combined, rng);

  return buildBalancedOptionOrders(selected, rng, seed);
}

// ---------------- Balanced option ordering ----------------
// Shared by the C++ selector above and the General English selector
// below. Given the already-selected question list, produce an
// `optionOrders` array where optionOrders[i] lists the ORIGINAL option
// indices in the order they will be displayed, with correct answers
// spread evenly across answer positions.
//
// `rng` is passed in (rather than re-derived from `seed`) so the C++
// path keeps its exact historical RNG stream: the selection shuffles
// above advance the generator before we get here, and re-seeding would
// change every existing exam's layout.
//
// July 2026 — variable option counts:
// The balanced target pool is still built over 4 positions (unchanged
// for the 4-option C++ banks). For questions with fewer options — the
// 3-option General English reading/vocabulary items and the 2-option
// True/False items — the target is wrapped into range with a modulo.
// For a 4-option question `target % 4` is a no-op, so C++ exams are
// bit-for-bit identical to before this change.
//
// Questions flagged `fixedOrder: true` (True/False) keep their printed
// option order — shuffling a two-option True/False question gains no
// anti-cheating value and just reads as a mistake to students.
function buildBalancedOptionOrders(selected, rng, seed) {
  const N = selected.length;

  // --- 2) build balanced target positions ---
  // Counts for N=20 → [5,5,5,5]. For other N, distribute as evenly as possible.
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) counts[i % 4]++;
  // Randomize WHICH position gets the larger counts via the RNG so it
  // isn't always A/B that gets the +1.
  const posOrder = seededShuffle([0, 1, 2, 3], rng);
  const balancedCounts = [0, 0, 0, 0];
  posOrder.forEach((p, i) => (balancedCounts[p] = counts[i]));

  // Flatten into a pool of target positions, then shuffle it.
  let targetPool = [];
  for (let p = 0; p < 4; p++) {
    for (let k = 0; k < balancedCounts[p]; k++) targetPool.push(p);
  }
  targetPool = seededShuffle(targetPool, rng);

  // --- 3) enforce no 3 consecutive same (i.e. max 2 consecutive same) ---
  // Greedy: walk the array; if positions i-2, i-1, i are all equal, swap
  // the value at i with the nearest position (later OR earlier) that differs.
  // Multi-pass until stable or max iterations reached.
  for (let pass = 0; pass < 20; pass++) {
    let changed = false;
    for (let i = 2; i < N; i++) {
      if (
        targetPool[i] === targetPool[i - 1] &&
        targetPool[i] === targetPool[i - 2]
      ) {
        // Try to swap forward first
        let swapped = false;
        for (let j = i + 1; j < N; j++) {
          if (targetPool[j] !== targetPool[i]) {
            // Also check swap doesn't create a new violation at j
            const newAtJ = targetPool[i];
            const prev2 = j - 2 >= 0 ? targetPool[j - 2] : -1;
            const prev1 = j - 1 >= 0 ? targetPool[j - 1] : -1;
            const next1 = j + 1 < N ? targetPool[j + 1] : -1;
            const next2 = j + 2 < N ? targetPool[j + 2] : -1;
            if (
              !(prev2 === newAtJ && prev1 === newAtJ) &&
              !(prev1 === newAtJ && next1 === newAtJ) &&
              !(next1 === newAtJ && next2 === newAtJ)
            ) {
              const t = targetPool[i];
              targetPool[i] = targetPool[j];
              targetPool[j] = t;
              changed = true;
              swapped = true;
              break;
            }
          }
        }
        if (swapped) continue;
        // Fall back: swap backward (any earlier position that differs)
        for (let j = i - 3; j >= 0; j--) {
          if (targetPool[j] !== targetPool[i]) {
            const t = targetPool[i];
            targetPool[i] = targetPool[j];
            targetPool[j] = t;
            changed = true;
            break;
          }
        }
      }
    }
    if (!changed) break;
  }

  // --- 4) construct option orderings so each question's correct answer
  // lands at its target position. optionOrders[i] is an array of the
  // ORIGINAL option indices (0..3) in the order they will be displayed.
  const rngOpts = seededRNG(seed + "_opts");
  const optionOrders = selected.map((q, i) => {
    // How many options does THIS question actually have? The C++ banks
    // are uniformly 4; General English mixes 2, 3 and 4.
    const nOpts = Array.isArray(q.opts) && q.opts.length ? q.opts.length : 4;
    const identity = [];
    for (let p = 0; p < nOpts; p++) identity.push(p);

    // True/False and any other explicitly-pinned item keeps its
    // printed order.
    if (q.fixedOrder) return identity;

    // Wrap the balanced target into this question's range. No-op when
    // nOpts === 4, which is every C++ question.
    const target = targetPool[i] % nOpts;
    const others = identity.filter((idx) => idx !== q.correct);
    const shuffledOthers = seededShuffle(others, rngOpts);
    const order = new Array(nOpts).fill(0);
    order[target] = q.correct;
    let k = 0;
    for (let p = 0; p < nOpts; p++) {
      if (p === target) continue;
      order[p] = shuffledOthers[k++];
    }
    return order;
  });

  return { selected, optionOrders };
}

// ===============================================================
// GENERAL ENGLISH EXAMS (July 2026)
// ---------------------------------------------------------------
// General English 1 / 2 are section-structured rather than
// bank-shuffled: the instructor configures how many questions come
// from Reading, Grammar and Vocabulary, and each section carries its
// own points-per-correct-answer value (typically 5 / 2.5 / 2.5).
//
// Differences from the C++ path:
//   - questions are drawn per section, not from one pooled bank
//   - reading questions are tied to a passage, so we pick whole
//     passages and keep their questions together
//   - section order is fixed (Reading → Grammar → Vocabulary) so the
//     on-screen exam mirrors the printed paper
//   - questions are English-only (see english-bank.js)
// ===============================================================

// Fallback list, used only if courses.js failed to load.
const ENGLISH_COURSE_FALLBACK = ["geneng1", "geneng2"];

// CRASH FIX (July 2026): this helper used to be named `isEnglishCourse`
// and delegated to `window.isEnglishCourse`. app.js is not wrapped in
// an IIFE, so its own top-level declaration BECAME
// `window.isEnglishCourse` (overwriting the one english-bank.js sets,
// because app.js loads later). The guard then found itself and recursed
// until the stack blew — "Maximum call stack size exceeded" on every
// exam start. Two independent defences now:
//   1. the local name differs from the global it consults, so a
//      self-call is impossible even if the global goes missing;
//   2. courses.js owns the answer and namespaces everything `sn*`.
function examCourseIsSectioned(course) {
  if (typeof window.snCourseIsSectioned === "function") {
    return window.snCourseIsSectioned(course);
  }
  return ENGLISH_COURSE_FALLBACK.indexOf(course) !== -1;
}

// Whether this course's exams include a coding part.
function snCourseHasCodingSafe(course) {
  if (typeof window.snCourseHasCoding === "function") {
    return window.snCourseHasCoding(course);
  }
  return ENGLISH_COURSE_FALLBACK.indexOf(course) === -1;
}

// Whether this course's questions may be shown in Uzbek / Russian.
// False for language exams only.
function examCourseTranslates(course) {
  if (typeof window.snCourseTranslatesQuestions === "function") {
    return window.snCourseTranslatesQuestions(course);
  }
  return ENGLISH_COURSE_FALLBACK.indexOf(course) === -1;
}

// True when the ACTIVE exam is a General English exam. Drives
// English-only question rendering and the language-switcher lock on
// exam.html. Every other course keeps full EN/UZ/RU translation.
function examIsEnglishOnly() {
  const cfg = window._sinovActiveExamConfig;
  return !!(cfg && !examCourseTranslates(cfg.course));
}

// Default section configuration, used when an exam doc predates the
// section feature or has a malformed `sections` map. Mirrors the
// printed papers: Reading 10x5 + Grammar 10x2.5 + Vocabulary 10x2.5
// = 100 points.
function defaultEnglishSections() {
  return {
    reading: { count: 10, pointsPerCorrect: 5 },
    grammar: { count: 10, pointsPerCorrect: 2.5 },
    vocabulary: { count: 10, pointsPerCorrect: 2.5 },
  };
}

// Normalize whatever is on the exam doc into a complete, sane
// section map. Never throws; always returns all three sections.
function normalizeEnglishSections(raw) {
  const defaults = defaultEnglishSections();
  const out = {};
  ["reading", "grammar", "vocabulary"].forEach(function (key) {
    const src = (raw && raw[key]) || {};
    const count =
      typeof src.count === "number" && src.count >= 0
        ? Math.floor(src.count)
        : defaults[key].count;
    const pts =
      typeof src.pointsPerCorrect === "number" && src.pointsPerCorrect > 0
        ? src.pointsPerCorrect
        : defaults[key].pointsPerCorrect;
    out[key] = { count: count, pointsPerCorrect: pts };
  });
  return out;
}

// Build the full question list for a General English exam.
//
// Returns { selected, optionOrders } in exactly the shape
// selectArrangeAndShuffle returns, so every downstream consumer
// (renderer, scorer, PDF, feedback) works unchanged.
//
// Each returned question carries:
//   .section  — "reading" | "grammar" | "vocabulary"
//   .points   — points awarded for a correct answer
//   .passage  — passage id (reading only)
function buildEnglishExam(course, sections, seed) {
  const bank = (window.ENGLISH_BANK || {})[course];
  if (!bank) return null;

  const cfg = normalizeEnglishSections(sections);
  const rng = seededRNG(seed || "english_default");
  const selected = [];

  ["reading", "grammar", "vocabulary"].forEach(function (sectionKey) {
    const want = cfg[sectionKey].count;
    if (!want) return;
    const pool = Array.isArray(bank[sectionKey]) ? bank[sectionKey] : [];
    if (!pool.length) return;

    let picked;
    if (sectionKey === "reading") {
      // Reading questions belong to a passage. Shuffle the PASSAGES,
      // then walk them in that order taking questions until we have
      // enough — so a 10-question reading section uses one passage
      // rather than half of each, and students aren't asked to read
      // two texts to answer five questions apiece.
      const byPassage = {};
      const passageOrder = [];
      pool.forEach(function (q) {
        const pid = q.passage || "_none";
        if (!byPassage[pid]) {
          byPassage[pid] = [];
          passageOrder.push(pid);
        }
        byPassage[pid].push(q);
      });
      const shuffledPassages = seededShuffle(passageOrder, rng);
      picked = [];
      shuffledPassages.forEach(function (pid) {
        if (picked.length >= want) return;
        const remaining = want - picked.length;
        // Shuffle within the passage so two versions of the same
        // passage don't ask the questions in the same order.
        const qs = seededShuffle(byPassage[pid], rng).slice(0, remaining);
        picked = picked.concat(qs);
      });
    } else {
      picked = seededShuffle(pool, rng).slice(0, Math.min(want, pool.length));
    }

    // Stamp the per-section point value onto every question. The
    // scorer reads q.points, which is what makes fractional and
    // per-section scoring work end to end.
    picked.forEach(function (q) {
      selected.push(
        Object.assign({}, q, {
          section: sectionKey,
          points: cfg[sectionKey].pointsPerCorrect,
        }),
      );
    });
  });

  if (!selected.length) return null;
  return buildBalancedOptionOrders(selected, rng, (seed || "english") + "_en");
}

// ===============================================================
// SUBJECT BANK EXAMS (July 2026)
// ---------------------------------------------------------------
// Multiple-choice-only subjects (Calculus 1/2, Mathematical Analysis
// 1/2, Analytical Geometry) draw from a single flat bank named by the
// course registry's `bankKey`. Several courses may share one bank —
// Calculus 1 and Mathematical Analysis 1 both use `calculus1`.
//
// Selection is a seeded shuffle of the bank followed by the same
// balanced option ordering the C++ exams use, so:
//   - each exam VERSION gets a different question order (the version's
//     mcSeed differs), and a different set when the bank is larger
//     than the requested count;
//   - correct answers are spread evenly across positions A-D rather
//     than sitting at index 0 where the source paper printed them.
// ===============================================================
function buildSubjectExam(bankKey, count, seed) {
  const bank =
    typeof window.snSubjectBank === "function"
      ? window.snSubjectBank(bankKey)
      : [];
  if (!bank.length) return null;

  const rng = seededRNG(seed || "subject_default");
  const want = Math.min(count > 0 ? count : bank.length, bank.length);
  const selected = seededShuffle(bank, rng)
    .slice(0, want)
    .map(function (q) {
      // Shallow copy so per-exam fields (points) never mutate the bank.
      return Object.assign({}, q);
    });

  return buildBalancedOptionOrders(selected, rng, (seed || "subject") + "_sub");
}

// Human labels for the section dividers rendered on the exam page.
function englishSectionLabel(key) {
  switch (key) {
    case "reading":
      return "Reading";
    case "grammar":
      return "Grammar";
    case "vocabulary":
      return "Vocabulary";
    default:
      return key || "";
  }
}

// ---------------- Coding problem picker ----------------
// Build the 4 coding problems for this version:
//   Problem 1: easy_medium_starter   (10 pts) — from the new 15-problem set
//   Problem 2: control_loop_function (15 pts)
//   Problem 3: control_loop_function (15 pts, distinct from #2)
//   Problem 4: array_or_string_hard  (20 pts)
// picks = { p1, p2, p3, p4 } — global indices into CODING_BANK
//
// May 2026: each bank entry has both `starter` (EN+UZ TODO comments) and
// `starter_ru` (EN+RU TODO comments). We freeze the `starter` field used
// at build time based on the language toggle, so the editor only ever
// shows comments in the language the student picked. If the student
// changes language mid-exam the typed code is preserved (the starter
// itself is not re-loaded).
// Round 2 (May 2026): builds the resolved coding problems for a given
// version's seed picks. Replaces the old hardcoded-4-slot layout with
// a dynamic loop that handles 0-N problems with per-problem max-points.
//
// `picks` shape: either the legacy { p1, p2, p3, p4 } (4 numbers) or
// the new { p1, p2, ..., pN } (any count). Each value is an index into
// window.CODING_BANK.
//
// `maxPointsArr` (optional) is the per-problem max-points array from
// the exam config. If absent we fall back to the historical 10/15/15/20
// distribution for 4 problems, or sensible defaults for other counts.
function buildCodingForVersion(picks, maxPointsArr) {
  const bank = window.CODING_BANK || [];
  if (!picks || typeof picks !== "object") return null;

  // Pick keys are p1, p2, p3, ... in order. We honor whatever count
  // is present, in numerical order.
  const slotIndices = [];
  for (let i = 1; i <= 20; i++) {
    if (typeof picks["p" + i] === "number") {
      slotIndices.push(picks["p" + i]);
    } else {
      break; // gap → stop; we don't allow holes
    }
  }
  if (slotIndices.length === 0) return null;

  // Default max-points if instructor hasn't configured them. Matches
  // _defaultCodingMaxArray in admin.js so the two stay in sync.
  function defaultMaxArr(n) {
    if (n === 4) return [10, 15, 15, 20];
    if (n === 1) return [60];
    if (n === 2) return [25, 35];
    if (n === 3) return [15, 20, 25];
    const base = Math.floor(60 / n);
    const arr = new Array(n).fill(base);
    arr[n - 1] = 60 - base * (n - 1);
    return arr;
  }
  const maxes =
    Array.isArray(maxPointsArr) && maxPointsArr.length === slotIndices.length
      ? maxPointsArr
      : defaultMaxArr(slotIndices.length);

  // Pick the starter variant based on the student's language choice.
  // Falls back to `starter` (EN+UZ) if `starter_ru` is missing for any reason.
  const lang =
    typeof window.getExamLang === "function" ? window.getExamLang() : "uz";
  function pickStarter(p) {
    if (lang === "ru" && p.starter_ru) return p.starter_ru;
    return p.starter;
  }

  const result = [];
  for (let i = 0; i < slotIndices.length; i++) {
    const p = bank[slotIndices[i]];
    if (!p) return null; // invalid pick — bail
    result.push({
      ...p,
      starter: pickStarter(p),
      title_en: "Coding Problem " + (i + 1) + " — " + p.title_en,
      title_uz: i + 1 + "-Kodlash Masalasi — " + p.title_uz,
      title_ru:
        "Задача по программированию " +
        (i + 1) +
        " — " +
        (p.title_ru || p.title_en),
      maxPoints: maxes[i],
    });
  }
  return result;
}

// ---------------- Version selection ----------------
// On welcome page: read version from URL if set
const urlParams = new URLSearchParams(window.location.search);
const preselectedVersion = urlParams.get("v");

if (
  preselectedVersion &&
  ["A", "B"].includes(preselectedVersion.toUpperCase())
) {
  // Auto-select
  const v = preselectedVersion.toUpperCase();
  examVersion = v;
}

function selectVersion(letter) {
  examVersion = letter;
  // Update UI
  document
    .querySelectorAll(".version-card")
    .forEach((c) => c.classList.remove("selected"));
  const card = document.querySelector(
    '.version-card[data-version="' + letter + '"]',
  );
  if (card) card.classList.add("selected");
  validateForm();
}

// ---------------- Form validation ----------------
// Capitalize first letter of each word: "john smith" -> "John Smith", "MARY" -> "Mary"
function capitalizeName(s) {
  return (s || "").toLowerCase().replace(/\b([a-z'])/g, function (m) {
    return m.toUpperCase();
  });
}

function validateForm() {
  studentInfo.group = $("studentGroup") ? $("studentGroup").value : "";
  studentInfo.id = $("studentId") ? $("studentId").value.trim() : "";
  studentInfo.firstName = capitalizeName(
    $("studentFirstName") ? $("studentFirstName").value.trim() : "",
  );
  studentInfo.lastName = capitalizeName(
    $("studentLastName") ? $("studentLastName").value.trim() : "",
  );

  // Student ID must be exactly 6 digits
  const idValid = /^\d{6}$/.test(studentInfo.id);
  $("idHint").style.color =
    studentInfo.id.length > 0 && !idValid
      ? "var(--danger)"
      : "var(--ink-medium)";

  const basicValid =
    examVersion &&
    studentInfo.group &&
    idValid &&
    studentInfo.firstName &&
    studentInfo.lastName;

  // Schedule gate: must be open, unless master override is active.
  // snEffectiveScheduleStatus also enforces the per-exam allow-list.
  const scheduleOK =
    masterOverrideActive ||
    (currentSchedule && snEffectiveScheduleStatus() === "open");

  const valid = basicValid && scheduleOK;
  if ($("startBtn")) $("startBtn").disabled = !valid;
  return valid;
}

// ---------- Allow-list enforcement (Round 5, July 2026) ----------
//
// An instructor can restrict a scheduled exam to specific student IDs
// (see the bulk-schedule modal in admin.js). This is the enforcement
// side: without it the allow-list would be decoration.
//
// Returns the schedule status the student should actually be treated
// as having. It is computed rather than stored because the student
// types their ID AFTER the schedule is fetched — recomputing on every
// validate/render keeps the gate correct as they type.
function snEffectiveScheduleStatus() {
  if (!currentSchedule) return null;
  const allowed = currentSchedule.allowedStudents;
  if (!Array.isArray(allowed) || allowed.length === 0) {
    return currentSchedule.status; // unrestricted
  }
  const id = String((studentInfo && studentInfo.id) || "").trim();
  // Don't accuse a student of being unlisted before they've typed an
  // ID — that would show a scary red banner on an empty form.
  if (!id) return currentSchedule.status;
  if (allowed.indexOf(id) !== -1) return currentSchedule.status;
  return "not_allowed";
}

// ---------- Schedule panel (welcome page) ----------
function renderSchedulePanel() {
  const panel = $("schedulePanel");
  if (!panel) return;

  if (masterOverrideActive) {
    panel.style.display = "block";
    panel.className = "schedule-panel sp-master";
    $("spStatus").innerHTML =
      '<span class="sn-status-badge master">Master Override</span>';
    $("spDot").className = "sp-dot dot-master";
    $("spRange").innerHTML =
      "Schedule check bypassed." +
      "<br><span class='sp-uz uz'>Jadval tekshiruvi chetlab o'tildi.</span>" +
      "<br><span class='sp-ru ru'>Проверка расписания пропущена.</span>";
    $("spNote").innerHTML =
      "You can start the exam regardless of the scheduled window." +
      "<br><span class='sp-uz uz'>Belgilangan vaqtdan qat'i nazar imtihonni boshlashingiz mumkin.</span>" +
      "<br><span class='sp-ru ru'>Вы можете начать экзамен независимо от запланированного окна.</span>";
    return;
  }

  if (!studentInfo.group) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";

  if (!currentSchedule) {
    panel.className = "schedule-panel sp-checking";
    $("spStatus").innerHTML =
      '<span class="sn-status-badge notset">Checking…</span>';
    $("spDot").className = "sp-dot dot-checking";
    $("spRange").innerHTML =
      "Contacting exam server…" +
      "<br><span class='sp-uz uz'>Imtihon serveri bilan bog'lanish…</span>" +
      "<br><span class='sp-ru ru'>Подключение к серверу экзамена…</span>";
    $("spNote").textContent = " ";
    return;
  }

  const s = currentSchedule;
  const tz = (window.FB && window.FB.TZ_LABEL) || "";
  const range = window.FBClient.formatScheduleWindow(s);

  // Restricted exam and this student is not on the allow-list.
  if (snEffectiveScheduleStatus() === "not_allowed") {
    panel.className = "schedule-panel sp-notset";
    $("spStatus").innerHTML =
      '<span class="sn-status-badge notset">Not on the list</span>';
    $("spDot").className = "sp-dot dot-notset";
    $("spRange").innerHTML =
      "This exam has been restricted by your instructor to specific students, " +
      "and student ID <b>" +
      escapeHtmlText(String(studentInfo.id || "")) +
      "</b> is not among them." +
      "<br><span class='sp-uz uz'>Bu imtihon o'qituvchi tomonidan faqat ayrim talabalar uchun ochilgan va sizning ID raqamingiz ro'yxatda yo'q.</span>" +
      "<br><span class='sp-ru ru'>Этот экзамен открыт преподавателем только для определённых студентов, и вашего ID нет в списке.</span>";
    $("spNote").innerHTML =
      "Check that you typed your student ID correctly. If it is correct, contact your instructor." +
      "<br><span class='sp-uz uz'>ID raqamingizni to'g'ri kiritganingizni tekshiring. To'g'ri bo'lsa, o'qituvchingizga murojaat qiling.</span>" +
      "<br><span class='sp-ru ru'>Проверьте правильность ввода ID. Если он верен, обратитесь к преподавателю.</span>";
    return;
  }

  if (s.status === "not_set") {
    panel.className = "schedule-panel sp-notset";
    $("spStatus").innerHTML =
      '<span class="sn-status-badge notset">Not Set</span>';
    $("spDot").className = "sp-dot dot-notset";
    $("spRange").innerHTML =
      "Schedule for <b>" +
      studentInfo.group +
      "</b> has not been set by the instructor yet." +
      "<br><span class='sp-uz uz'><b>" +
      studentInfo.group +
      "</b> guruhi uchun jadval hali o'qituvchi tomonidan belgilanmagan.</span>" +
      "<br><span class='sp-ru ru'>Расписание для группы <b>" +
      studentInfo.group +
      "</b> ещё не установлено преподавателем.</span>";
    $("spNote").innerHTML =
      "Please wait for your instructor to publish the exam window." +
      "<br><span class='sp-uz uz'>Iltimos, o'qituvchingiz imtihon vaqtini e'lon qilishini kuting.</span>" +
      "<br><span class='sp-ru ru'>Пожалуйста, подождите, пока преподаватель опубликует окно экзамена.</span>";
  } else if (s.status === "not_started") {
    panel.className = "schedule-panel sp-pending";
    $("spStatus").innerHTML =
      '<span class="sn-status-badge upcoming">Upcoming</span>';
    $("spDot").className = "sp-dot dot-pending";
    $("spRange").textContent = range + (tz ? "   (" + tz + ")" : "");
    $("spNote").innerHTML =
      "You cannot start yet. Wait until the scheduled start time." +
      "<br><span class='sp-uz uz'>Hozir boshlay olmaysiz. Belgilangan boshlanish vaqtini kuting.</span>" +
      "<br><span class='sp-ru ru'>Вы пока не можете начать. Дождитесь запланированного времени начала.</span>";
  } else if (s.status === "open") {
    panel.className = "schedule-panel sp-open";
    $("spStatus").innerHTML =
      '<span class="sn-status-badge open">Open Now</span>';
    $("spDot").className = "sp-dot dot-open";
    $("spRange").textContent = range + (tz ? "   (" + tz + ")" : "");
    $("spNote").innerHTML =
      "You may start when all fields are filled in." +
      "<br><span class='sp-uz uz'>Barcha maydonlar to'ldirilgach boshlashingiz mumkin.</span>" +
      "<br><span class='sp-ru ru'>Вы можете начать после заполнения всех полей.</span>";
  } else if (s.status === "ended") {
    panel.className = "schedule-panel sp-ended";
    $("spStatus").innerHTML =
      '<span class="sn-status-badge ended">Ended</span>';
    $("spDot").className = "sp-dot dot-ended";
    $("spRange").textContent = range + (tz ? "   (" + tz + ")" : "");
    $("spNote").innerHTML =
      "The exam window for this group has closed. Contact your instructor." +
      "<br><span class='sp-uz uz'>Ushbu guruh uchun imtihon oynasi yopilgan. O'qituvchingiz bilan bog'laning.</span>" +
      "<br><span class='sp-ru ru'>Окно экзамена для этой группы закрыто. Свяжитесь с преподавателем.</span>";
  } else {
    panel.className = "schedule-panel sp-unknown";
    $("spStatus").innerHTML =
      '<span class="sn-status-badge notset">Unknown</span>';
    $("spDot").className = "sp-dot dot-unknown";
    $("spRange").textContent = " ";
    $("spNote").innerHTML =
      "Could not determine schedule. Check your internet connection." +
      "<br><span class='sp-uz uz'>Jadvalni aniqlab bo'lmadi. Internet aloqangizni tekshiring.</span>" +
      "<br><span class='sp-ru ru'>Не удалось определить расписание. Проверьте подключение к интернету.</span>";
  }
}

async function handleGroupChange() {
  currentSchedule = null;
  renderSchedulePanel();
  validateForm();
  const group = studentInfo.group;
  if (!group) return;
  if (!window.FBClient) return;
  // Derive the composite exam ID from the current dropdown selections.
  // If any dropdown is incomplete the helper returns null, in which
  // case fetchScheduleForGroup will fall back to the legacy collection.
  const examId = (function () {
    // Prefer the id stashed on the active config (see snActiveExamId).
    const fromCfg = snActiveExamId();
    if (fromCfg) return fromCfg;
    // Legacy fallback: the exam dropdown now carries the document id
    // directly as its option value.
    const et = document.getElementById("examTypeSelect");
    return et && et.value ? et.value : null;
  })();
  const s = await window.FBClient.fetchScheduleForGroup(group, examId);
  // Guard against rapid group switches: only apply if still the same group
  if (studentInfo.group !== group) return;
  currentSchedule = s || { status: "not_set" };
  renderSchedulePanel();
  validateForm();

  // Re-check every 15 seconds so the "not_started" → "open" transition
  // is picked up without a full page reload at the scheduled start time.
  if (window._scheduleTicker) clearInterval(window._scheduleTicker);
  window._scheduleTicker = setInterval(() => {
    // Recompute status from stored timestamps (no need to re-query)
    if (currentSchedule && currentSchedule.startAt && currentSchedule.endAt) {
      const now = new Date();
      const prev = currentSchedule.status;
      let next = prev;
      if (now < currentSchedule.startAt) next = "not_started";
      else if (now <= currentSchedule.endAt) next = "open";
      else next = "ended";
      if (next !== prev) {
        currentSchedule.status = next;
        renderSchedulePanel();
        validateForm();
      }
    }
  }, 15000);
}

// ---------------- Start exam ----------------
async function startExam() {
  if (!validateForm()) return;

  // Load version defaults
  let vData = null;
  if (examVersion === "A") vData = window.VERSION_A;
  else if (examVersion === "B") vData = window.VERSION_B;
  if (!vData) return;

  // Briefly disable the Start button while we check Firestore for fresh seeds.
  const startBtn = $("startBtn");
  const originalText = startBtn ? startBtn.textContent : null;
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = "Loading…";
  }

  // Try to fetch live seeds from Firestore. If unreachable, use defaults.
  //
  // Per-exam refresh seeds (Feature: per-exam refresh, May 2026):
  // The seeds are now scoped per-exam, derived from the student's
  // dropdown picks. fetchExamSeeds falls back to the legacy global
  // doc if no per-exam doc exists for backward compatibility.
  let liveSeeds = null;
  try {
    if (window.FBClient && window.FBClient.fetchExamSeeds) {
      const examIdForSeeds = snActiveExamId();
      liveSeeds = await window.FBClient.fetchExamSeeds(examIdForSeeds);
    }
  } catch (err) {
    console.warn("fetchExamSeeds failed, using defaults:", err);
  }

  // Resolve mcSeed + coding picks — Firestore overrides defaults.
  let mcSeed = vData.mcSeed;
  let codingPicks = vData.coding;
  if (liveSeeds && liveSeeds[examVersion]) {
    const entry = liveSeeds[examVersion];
    if (entry.mcSeed) mcSeed = entry.mcSeed;
    if (entry.coding) codingPicks = entry.coding;
  }

  // Round 2 (May 2026): pull mcCount + codingCount + per-problem max
  // points from the active exam config so this exam takes the shape
  // the instructor configured. Legacy exams without these fields get
  // sensible defaults (20 MC, 4 coding, 10/15/15/20).
  const cfg = window._sinovActiveExamConfig || {};
  const mcCount =
    typeof cfg.mcCount === "number" && cfg.mcCount > 0 ? cfg.mcCount : 20;
  // General English exams never have a coding part. Guard here as well
  // as in the admin form so a hand-edited or legacy exam doc can't
  // hand a language student four C++ problems.
  const codingCount = !snCourseHasCodingSafe(cfg.course)
    ? 0
    : typeof cfg.codingCount === "number" && cfg.codingCount >= 0
      ? cfg.codingCount
      : 4;
  const codingMaxPoints =
    Array.isArray(cfg.codingMaxPoints) &&
    cfg.codingMaxPoints.length === codingCount
      ? cfg.codingMaxPoints
      : null;

  // Build MC questions for this version (count comes from exam config).
  // If mcCount is 0, skip the MC build entirely; the exam is coding-only.
  // July 2026: General English exams are section-structured and draw
  // from their own banks. Every other course keeps the original
  // pooled-bank selection untouched.
  const isEnglishExam = examCourseIsSectioned(cfg.course);
  // Which flat question bank (if any) this course draws from.
  const subjectBankKey =
    typeof window.snCourseBankKey === "function" && !isEnglishExam
      ? window.snCourseBankKey(cfg.course)
      : null;

  if (isEnglishExam) {
    const result = buildEnglishExam(
      cfg.course,
      cfg.sections,
      mcSeed || "english_default",
    );
    if (!result || !result.selected.length) {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = originalText;
      }
      alert(
        "This English exam has no questions configured. Please contact your instructor.",
      );
      return;
    }
    mcQuestions = result.selected;
    optionOrders = result.optionOrders;
    userAnswers = new Array(mcQuestions.length).fill(-1);
  } else if (subjectBankKey && mcCount > 0) {
    // Bank-backed multiple-choice subject (Calculus, Mathematical
    // Analysis, Analytical Geometry, ...).
    const result = buildSubjectExam(subjectBankKey, mcCount, mcSeed);
    if (!result || !result.selected.length) {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = originalText;
      }
      alert(
        "This exam's question bank could not be loaded. Please contact your instructor.",
      );
      return;
    }
    mcQuestions = result.selected;
    optionOrders = result.optionOrders;
    userAnswers = new Array(mcQuestions.length).fill(-1);
    const subjPts =
      typeof cfg.pointsPerCorrectMc === "number" && cfg.pointsPerCorrectMc > 0
        ? cfg.pointsPerCorrectMc
        : 2;
    mcQuestions = mcQuestions.map(function (q) {
      return Object.assign({}, q, { points: subjPts });
    });
  } else if (mcCount === 0) {
    mcQuestions = [];
    optionOrders = [];
    userAnswers = [];
  } else {
    const result = selectArrangeAndShuffle(
      window.MC_BANK,
      window.MC_BANK_NEW,
      mcSeed,
      mcCount,
    );
    mcQuestions = result.selected;
    optionOrders = result.optionOrders;
    userAnswers = new Array(mcQuestions.length).fill(-1);
    // Round 3 (July 2026): scoring now reads a per-question `points`
    // value so fractional and per-section point rules work uniformly.
    // For non-English exams every question is worth the same amount,
    // so stamping the flat rate here keeps one code path in the scorer
    // and leaves the resulting totals identical to before.
    const flatPts =
      typeof cfg.pointsPerCorrectMc === "number" && cfg.pointsPerCorrectMc > 0
        ? cfg.pointsPerCorrectMc
        : 2;
    mcQuestions = mcQuestions.map(function (q) {
      return Object.assign({}, q, { points: flatPts });
    });
  }

  // Build coding problems for this version. The picks dict still has
  // p1, p2, p3, p4 etc from the seeds doc — buildCodingForVersion now
  // honors as many slots as the picks dict provides. For codingCount
  // less than the seed picks, we slice to the configured count.
  let trimmedPicks = codingPicks;
  if (codingPicks && codingCount < 4) {
    trimmedPicks = {};
    for (let i = 1; i <= codingCount; i++) {
      if (typeof codingPicks["p" + i] === "number") {
        trimmedPicks["p" + i] = codingPicks["p" + i];
      }
    }
  }
  // If codingCount is 0, skip coding entirely (no problems built).
  let codingProblems;
  if (codingCount === 0) {
    codingProblems = [];
  } else {
    codingProblems = buildCodingForVersion(trimmedPicks, codingMaxPoints);
    if (!codingProblems) {
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = originalText;
      }
      alert("Exam configuration is invalid. Please contact your instructor.");
      return;
    }
  }
  versionData = { id: examVersion, coding: codingProblems };

  // -------------------------------------------------------------
  // Webcam-proctoring consent gate (Feature 1)
  // -------------------------------------------------------------
  // Show the trilingual consent modal BEFORE navigating to exam.html.
  // The modal also probes navigator.mediaDevices.getUserMedia() so we
  // know permission is granted; the actual stream is opened on the
  // exam page by Proctoring.start() once the timer begins.
  // The master-override path (instructor preview) skips this gate so
  // an instructor can preview the exam without a webcam.
  // Also skipped entirely when the instructor turned the webcam feature
  // OFF for this exam (exam config `webcamEnabled: false`).
  if (!masterOverrideActive && !webcamFeatureDisabled() && window.Proctoring) {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = originalText;
    }
    const granted = await window.Proctoring.showConsentModal();
    if (!granted) {
      // Student denied or hardware unavailable. Don't proceed.
      return;
    }
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Loading…";
    }
  }

  // -------------------------------------------------------------
  // Verification photo capture (Feature 5)
  // -------------------------------------------------------------
  // After the student consents to proctoring, they go through the
  // security-photo step: webcam selfie, Gemini glasses check, then
  // confirm. The captured photo is embedded in the PDF + shown on
  // the scorecard.
  //
  // We BLOCK the exam from starting if the student cancels — security
  // photo is a required step. If the camera is unavailable they get
  // a retry option inside the modal; if they give up there, they're
  // back at the welcome page (Start button re-enabled).
  // The master-override path skips this so instructors can preview.
  // Also skipped entirely when the instructor turned the webcam feature
  // OFF for this exam (exam config `webcamEnabled: false`).
  let verificationPhoto = null;
  if (
    !masterOverrideActive &&
    !webcamFeatureDisabled() &&
    window.VerificationPhoto
  ) {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = originalText;
    }
    const photo = await window.VerificationPhoto.capture();
    if (!photo || !photo.dataUrl) {
      // Student cancelled — abort exam start.
      return;
    }
    verificationPhoto = photo;
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Loading…";
    }
  }

  // Generate a unique proctoring session id NOW so it's stable across
  // navigation (saved into sessionStorage with the exam state).
  const proctorSessionId =
    "p_" + studentInfo.group + "_" + studentInfo.id + "_" + Date.now();

  // Navigate to exam page
  const params = new URLSearchParams();
  params.set("v", examVersion);
  params.set("g", studentInfo.group);
  params.set("id", studentInfo.id);
  params.set("fn", studentInfo.firstName);
  params.set("ln", studentInfo.lastName);

  sessionStorage.setItem(
    "exam_state",
    JSON.stringify({
      info: studentInfo,
      version: examVersion,
      questions: mcQuestions,
      optionOrders: optionOrders,
      coding: codingProblems, // resolved problems, not just starters
      masterOverride: masterOverrideActive,
      proctorSessionId: proctorSessionId,
      // verification photo + glasses-check metadata (Feature 5)
      verificationPhoto: verificationPhoto,
      examConfig: window._sinovActiveExamConfig || null,
    }),
  );

  window.location.href = "exam.html?" + params.toString();
}

// ---------------- Exam page initialization ----------------
function initExamPage() {
  const stored = sessionStorage.getItem("exam_state");
  if (!stored) {
    alert("Exam state not found. Returning to start.");
    window.location.href = "index.html";
    return;
  }
  const state = JSON.parse(stored);
  studentInfo = state.info;
  examVersion = state.version;
  mcQuestions = state.questions;
  optionOrders = state.optionOrders;
  userAnswers = new Array(mcQuestions.length).fill(-1);
  masterOverrideActive = !!state.masterOverride;

  // versionData is reconstructed from the RESOLVED coding problems saved
  // by startExam() (which may have come from live Firestore seeds).
  versionData = { id: examVersion, coding: state.coding || [] };

  // Remember the proctor session id (passed via sessionStorage from
  // startExam) — needed at submit time to attach risk score + frame
  // paths to the submission record. Feature 1.
  window._proctorSessionId = state.proctorSessionId || null;

  // Feature 5: verification photo + active exam config. Stashed
  // before navigation; consumed by PDF generation + submission write.
  window._verificationPhoto = state.verificationPhoto || null;
  window._sinovActiveExamConfig = state.examConfig || null;

  // Populate new 2-card exam header
  $("studentName").textContent =
    studentInfo.firstName + " " + studentInfo.lastName;
  $("studentGroupLbl").textContent = studentInfo.group;
  $("studentIdLbl").textContent = studentInfo.id;
  $("versionBadge").textContent = "Exam Version " + examVersion;

  // FIX (May 23, Round 2 follow-up): apply the per-exam config to the
  // exam-structure card AND the timer duration. Before this call,
  // both were rendering hardcoded fallback values from exam.html (20
  // tests, 4 coding problems, 100 minutes) regardless of how the
  // instructor configured the exam.
  applyExamConfigToHeader(window._sinovActiveExamConfig);
  applyEnglishOnlyLanguageLock();

  renderQuestions();
  renderCoding();
  startTimer();
  $("timer").style.display = "block";
  $("tabcount").style.display = "block";

  // -------------------------------------------------------------
  // Start the webcam proctoring (Feature 1)
  // -------------------------------------------------------------
  // Aligned to exam-timer start (window opens once the 100-minute
  // countdown begins). Master-override sessions (instructor preview)
  // skip proctoring. Also skipped entirely when the instructor turned
  // the webcam feature OFF for this exam (`webcamEnabled: false` on the
  // exam config — restored above into window._sinovActiveExamConfig).
  if (
    !masterOverrideActive &&
    !webcamFeatureDisabled() &&
    window.Proctoring &&
    window._proctorSessionId
  ) {
    // Fire and forget — start() handles its own errors. If the webcam
    // is unavailable here (e.g., browser revoked permission between
    // pages), Proctoring.start() will log a 'camera_lost' event so the
    // instructor still sees the submission was un-proctored.
    window.Proctoring.start({
      // Round 6 (July 2026): tag the session with the exam it belongs
      // to. Without this, proctoring evidence is only reachable by
      // walking back from a submission's proctorSessionId — so a
      // session with no submission (abandoned exam, browser crash) is
      // unfindable, and "show all events for exam X" needs a two-step
      // query with chunked `in` clauses.
      examId: snActiveExamId(),
      course: (window._sinovActiveExamConfig || {}).course || null,
      sessionId: window._proctorSessionId,
      group: studentInfo.group,
      studentId: studentInfo.id,
    }).catch((err) => {
      console.error("[app.js] Proctoring.start() rejected:", err);
    });
  }

  // Expose for debugging / testing (not essential)
  window._exam = { mcQuestions, userAnswers, optionOrders };
}

// ---------------- Render questions ----------------
function renderQuestions() {
  const root = $("questions-root");
  root.innerHTML = "";

  // English-only mode: General English exams render questions in
  // English with no Uzbek/Russian counterparts, because translating a
  // language exam would hand over the answers. All other courses keep
  // the full trilingual treatment.
  const englishOnly = examIsEnglishOnly();
  const course = (window._sinovActiveExamConfig || {}).course;
  const passages = englishOnly
    ? (window.ENGLISH_PASSAGES || {})[course] || {}
    : {};

  // Track what we've already emitted so dividers and passage cards
  // appear exactly once, at the point the content changes.
  let lastSection = null;
  let lastPassage = null;

  mcQuestions.forEach((q, qIdx) => {
    const ord = optionOrders[qIdx] || [];

    // ---- Section divider (English exams only) ----
    if (englishOnly && q.section && q.section !== lastSection) {
      lastSection = q.section;
      lastPassage = null; // a new section always re-shows its passage
      const count = mcQuestions.filter((x) => x.section === q.section).length;
      const pts = typeof q.points === "number" ? q.points : 0;
      const divider = document.createElement("div");
      divider.className = "eng-section-divider";
      divider.innerHTML = `
        <div class="esd-title">${escapeHtmlText(englishSectionLabel(q.section))}</div>
        <div class="esd-meta">${count} question${count === 1 ? "" : "s"} &middot; ${fmtPoints(pts)} point${pts === 1 ? "" : "s"} each</div>
      `;
      root.appendChild(divider);
    }

    // ---- Reading passage card (English exams only) ----
    if (englishOnly && q.passage && q.passage !== lastPassage) {
      lastPassage = q.passage;
      const p = passages[q.passage];
      if (p) {
        const card = document.createElement("div");
        card.className = "eng-passage";
        const partsHtml = (p.parts || [])
          .map((part) => {
            const label = part.label
              ? `<span class="ep-speaker">${escapeHtmlText(part.label)}</span>`
              : "";
            return `<p class="ep-para">${label}${escapeHtmlText(part.text)}</p>`;
          })
          .join("");
        card.innerHTML = `
          <div class="ep-head">
            <span class="ep-eyebrow">Reading text</span>
            <h3 class="ep-title">${escapeHtmlText(p.title || "")}</h3>
          </div>
          <div class="ep-body">${partsHtml}</div>
          <div class="ep-foot">Read the text above, then answer the questions that follow.</div>
        `;
        root.appendChild(card);
      }
    }

    // ---- Question card ----
    const card = document.createElement("div");
    card.className = "q-card";

    // For non-English exams we render BOTH the .uz and .ru span; CSS
    // hides one depending on the body's language class (lang-uz
    // default vs lang-ru). For English exams neither is emitted.
    const translations = englishOnly
      ? ""
      : `
      <div class="q-text-uz uz">${q.uz}</div>
      <div class="q-text-ru ru">${q.ru || q.uz}</div>`;

    const badgeLabel = englishOnly
      ? "Question"
      : `Question<span class="q-badge-label-uz uz">Savol</span><span class="q-badge-label-ru ru">Вопрос</span>`;

    card.innerHTML = `
      <div class="q-badge-row">
        <div class="q-badge">
          <span class="q-badge-num">${qIdx + 1}</span>
          <span class="q-badge-divider">/</span>
          <span class="q-badge-total">${mcQuestions.length}</span>
        </div>
        <div class="q-badge-label">
          ${badgeLabel}
        </div>
      </div>
      <div class="q-text">${q.en}</div>${translations}
      <div class="opt-list">
        ${ord
          .map((origIdx, displayIdx) => {
            const letter = String.fromCharCode(65 + displayIdx);
            const opt = q.opts[origIdx];
            if (!opt) return "";
            const optTranslations = englishOnly
              ? ""
              : `
              <div class="opt-text-uz uz">${escapeOptionText(opt.uz)}</div>
              <div class="opt-text-ru ru">${escapeOptionText(opt.ru || opt.uz)}</div>`;
            return `<div class="opt" data-q="${qIdx}" data-orig="${origIdx}">
            <span class="letter">${letter})</span>
            <div class="opt-content">
              <div class="opt-text">${escapeOptionText(opt.en)}</div>${optTranslations}
            </div>
          </div>`;
          })
          .join("")}
      </div>
    `;
    root.appendChild(card);
  });

  root.querySelectorAll(".opt").forEach((el) => {
    el.addEventListener("click", () => {
      const qIdx = parseInt(el.dataset.q);
      const origIdx = parseInt(el.dataset.orig);
      userAnswers[qIdx] = origIdx;
      el.parentElement
        .querySelectorAll(".opt")
        .forEach((o) => o.classList.remove("selected"));
      el.classList.add("selected");
      updateProgress();
    });
  });
}

// ---------------- Render coding problems ----------------
function renderCoding() {
  const root = $("coding-root");
  root.innerHTML = "";
  versionData.coding.forEach((cp, i) => {
    const card = document.createElement("div");
    card.className = "code-card";

    // Hints — bilingual EN/UZ/RU bullets. Some problems (the new
    // easy/medium 10-pt problem) deliberately have NO hints, so we
    // only render the panel when the array is non-empty.
    const hintsHtml = (cp.hints || [])
      .map(
        (h) => `
      <div class="hint-item">
        <div class="hint-en">${h.en}</div>
        <div class="hint-uz uz">${h.uz}</div>
        <div class="hint-ru ru">${h.ru || h.uz}</div>
      </div>
    `,
      )
      .join("");

    // Pick the right requirements arrays — fall back to UZ if RU absent
    const enReqs = cp.en || [];
    const uzReqs = cp.uz || [];
    const ruReqs = cp.ru && cp.ru.length ? cp.ru : uzReqs;

    card.innerHTML = `
      <div class="code-header-row">
        <div class="code-badge">
          <span class="code-badge-num">${i + 1}</span>
          <span class="code-badge-label">Problem ${i + 1}<span class="uz">${i + 1}-Masala</span><span class="ru">Задача ${i + 1}</span></span>
        </div>
        <div class="code-points-pill">Max ${cp.maxPoints || 20} points<span class="pill-uz uz"> · ${cp.maxPoints || 20} ball</span><span class="pill-ru ru"> · ${cp.maxPoints || 20} баллов</span></div>
      </div>
      <h3>${cp.title_en}<span class="uz">${cp.title_uz}</span><span class="ru">${cp.title_ru || cp.title_uz}</span></h3>
      <div class="lang-label">Requirements (English):</div>
      <p>Write a C++ program that:</p>
      <ol>${enReqs.map((s) => `<li>${s}</li>`).join("")}</ol>
      <div class="lang-label uz">Talablar (O'zbekcha):</div>
      <p class="uz" style="font-style:italic;color:var(--ink-medium)">Quyidagilarni bajaradigan C++ dastur yozing:</p>
      <ol class="uz">${uzReqs.map((s) => `<li>${s}</li>`).join("")}</ol>
      <div class="lang-label ru">Требования (на русском):</div>
      <p class="ru" style="font-style:italic;color:var(--ink-medium)">Напишите программу на C++, которая:</p>
      <ol class="ru">${ruReqs.map((s) => `<li>${s}</li>`).join("")}</ol>
      ${
        hintsHtml
          ? `
        <div class="hints-panel">
          <div class="hints-title">
            <span class="hints-title-en">Hints to Solve the Problem</span>
            <span class="hints-title-uz uz">Masalani Yechish uchun Maslahatlar</span>
            <span class="hints-title-ru ru">Подсказки для решения задачи</span>
          </div>
          ${hintsHtml}
        </div>
      `
          : ""
      }

      <!-- 2-column split: code editor left, run panel right -->
      <div class="coding-split">
        <div class="code-editor-wrap" data-editor-idx="${i + 1}">
          <pre class="code-editor-highlight" aria-hidden="true"></pre>
          <textarea id="code${i + 1}" class="code-editor-input" spellcheck="false"></textarea>
        </div>

        <div class="run-panel-col" data-run-idx="${i}">
          <div class="run-panel-head">
            <button type="button" class="run-btn" data-run-idx="${i}">
              <span class="run-ico">▶</span>
              <span class="run-label">Run Code<span class="uz"> · Kodni Ishga Tushirish</span><span class="ru"> · Запустить код</span></span>
            </button>
            <span class="run-meta count" id="runCount${i}">Runs used: 0 / 30</span>
          </div>
          <div class="stdin-wrap">
            <label for="stdin${i}">INPUT<span class="uz"> / QIYMAT KIRITISH</span><span class="ru"> / ВВОД</span> (Cin&gt;&gt;)</label>
            <textarea id="stdin${i}"
              data-placeholder-en="If your program reads input with cin, type it here - one value per line."
              data-placeholder-uz="Agar dasturingiz cin orqali qiymat o'qisa, bu yerga yozing - har qatorda bitta qiymat."
              data-placeholder-ru="Если ваша программа считывает данные через cin, вводите здесь - по одному значению в строке."
              placeholder="If your program reads input with cin, type it here - one value per line."></textarea>
          </div>
          <div class="run-output empty" id="runOutput${i}"><div class="empty-msg-en">Click <b>Run Code</b> to compile and execute your code. This is for your own testing — the instructor grades the code you submit, not the run result.</div><div class="empty-msg-uz uz">Natijani tekshirish uchun <b>Kodni Ishga Tushirish</b> tugmasini bosing. Bu faqat sizning sinovingiz uchun — o'qituvchi siz yuborgan kodni baholaydi, ishga tushirish natijasini emas.</div><div class="empty-msg-ru ru">Нажмите <b>Запустить код</b>, чтобы скомпилировать и выполнить ваш код. Это только для вашего тестирования — преподаватель оценивает отправленный код, а не результат запуска.</div></div>
        </div>
      </div>
    `;
    root.appendChild(card);

    // Set up the colored code editor overlay
    const ta = $(`code${i + 1}`);
    const highlight = card.querySelector(".code-editor-highlight");
    ta.value = cp.starter;
    renderHighlight(ta.value, highlight);

    ta.addEventListener("input", () => renderHighlight(ta.value, highlight));
    ta.addEventListener("scroll", () => {
      highlight.scrollTop = ta.scrollTop;
      highlight.scrollLeft = ta.scrollLeft;
    });

    // Wire the Run button
    const runBtn = card.querySelector(".run-btn");
    if (runBtn) {
      runBtn.addEventListener("click", function () {
        handleRunClick(i);
      });
    }
  });

  // After all coding cards are in the DOM, apply localized placeholders to
  // the stdin textareas (which carry data-placeholder-en/uz/ru attributes).
  if (typeof applyLocalizedPlaceholders === "function") {
    applyLocalizedPlaceholders(
      window.getExamLang ? window.getExamLang() : "uz",
    );
  }
}

// ---------------- Code execution handler ----------------
async function handleRunClick(idx) {
  if (!window.CodeRunner) return;
  const btn = document.querySelector(`.run-btn[data-run-idx="${idx}"]`);
  const outputEl = $(`runOutput${idx}`);
  const countEl = $(`runCount${idx}`);
  const code = $(`code${idx + 1}`).value;
  const stdin = $(`stdin${idx}`).value;

  // Track consecutive failures per problem
  if (!window._consecutiveFailures) {
    window._consecutiveFailures = { 0: 0, 1: 0, 2: 0, 3: 0 };
  }

  if (!window.CodeRunner.canRun(idx)) {
    outputEl.className = "run-output error";
    outputEl.innerHTML =
      '<div class="run-status-row"><span class="run-status-dot"></span>Run limit reached · Ishga tushirish chegarasiga yetdi · Лимит запусков исчерпан</div>' +
      "You've used all " +
      window.CodeRunner.RUN_CAP +
      " runs for this problem. Your code is still submitted when you finish the exam — the instructor grades the code itself, not the run result.";
    return;
  }

  // Disable button + flash "running" state
  btn.disabled = true;
  btn.querySelector(".run-label").textContent =
    "Running… · Ishlayapti… · Выполнение…";
  outputEl.className = "run-output running";
  outputEl.innerHTML =
    '<div class="run-status-row"><span class="run-status-dot"></span>COMPILING & RUNNING · KOMPILYATSIYA VA ISHGA TUSHIRISH · КОМПИЛЯЦИЯ И ЗАПУСК</div>' +
    '<span style="font-style:italic">Please wait — this usually takes 1–3 seconds.</span>';

  const result = await window.CodeRunner.runCppCode(code, stdin);

  // Handle bookkeeping
  window.CodeRunner.incrementRunCount(idx);
  countEl.textContent =
    "Runs used: " +
    window.CodeRunner.getRunCount(idx) +
    " / " +
    window.CodeRunner.RUN_CAP;
  btn.disabled = false;
  btn.querySelector(".run-label").textContent =
    "Run Code · Kodni Ishga Tushirish · Запустить код";

  // Classify the outcome as success or failure for consecutive-fail tracking.
  //   Success = kind === "success"
  //   Failure = everything else (compile/runtime error, transport error)
  let outcomeIsFailure = false;
  if (!result.ok) {
    outcomeIsFailure = true;
  } else if (
    result.kind === "compile_error" ||
    result.kind === "runtime_error"
  ) {
    outcomeIsFailure = true;
  }
  if (outcomeIsFailure) {
    window._consecutiveFailures[idx] =
      (window._consecutiveFailures[idx] || 0) + 1;
  } else {
    window._consecutiveFailures[idx] = 0;
  }

  // Transport-level failure (network / piston down / timeout / rate)
  if (!result.ok) {
    outputEl.className = "run-output error";
    outputEl.innerHTML =
      '<div class="run-status-row"><span class="run-status-dot"></span>CANNOT RUN RIGHT NOW · HOZIR ISHGA TUSHIRIB BO\'LMAYDI · СЕЙЧАС НЕЛЬЗЯ ЗАПУСТИТЬ</div>' +
      escapeHtmlText(result.message) +
      '<br><br><span style="font-style:italic;color:#5a6470">You can still continue the exam and submit normally — code execution is optional.</span>' +
      renderFailureNote(idx);
    // Store fallback result for PDF
    window.CodeRunner.setLastResult(idx, {
      status: "unavailable",
      message: result.message,
    });
    return;
  }

  // Compile error
  if (result.kind === "compile_error") {
    outputEl.className = "run-output error";
    outputEl.innerHTML =
      '<div class="run-status-row"><span class="run-status-dot"></span>COMPILATION ERROR · KOMPILYATSIYA XATOSI · ОШИБКА КОМПИЛЯЦИИ</div>' +
      '<div class="run-output-block">' +
      '<div class="run-output-label">STDERR</div>' +
      "<div>" +
      escapeHtmlText(result.stderr) +
      "</div></div>" +
      renderFailureNote(idx);
    window.CodeRunner.setLastResult(idx, {
      status: "compile_error",
      stdout: "",
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
    return;
  }

  // Runtime error
  if (result.kind === "runtime_error") {
    outputEl.className = "run-output error";
    outputEl.innerHTML =
      '<div class="run-status-row"><span class="run-status-dot"></span>RUNTIME ERROR · BAJARILISH XATOSI · ОШИБКА ВЫПОЛНЕНИЯ</div>' +
      (result.stdout
        ? '<div class="run-output-block"><div class="run-output-label">STDOUT (before error)</div><div>' +
          escapeHtmlText(result.stdout) +
          "</div></div>"
        : "") +
      '<div class="run-output-block">' +
      '<div class="run-output-label">STDERR</div>' +
      "<div>" +
      escapeHtmlText(result.stderr) +
      "</div></div>" +
      '<div class="run-output-block">' +
      '<div class="run-output-label">EXIT CODE</div>' +
      "<div>" +
      result.exitCode +
      "</div></div>" +
      renderFailureNote(idx);
    window.CodeRunner.setLastResult(idx, {
      status: "runtime_error",
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
    return;
  }

  // Success
  outputEl.className = "run-output success";

  // Detect whether the student actually wrote anything different from
  // the starter. If not, show a warning so they don't think running the
  // unchanged starter means "I'm done." This does NOT prevent submission
  // — it just warns, because the instructor grades the code itself.
  const starter =
    (versionData.coding[idx] && versionData.coding[idx].starter) || "";
  const normalize = (s) =>
    String(s || "")
      // strip line comments (any // through end of line)
      .replace(/\/\/[^\n]*/g, "")
      // strip block comments (/* ... */)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // collapse whitespace
      .replace(/\s+/g, " ")
      .trim();
  const studentNormalized = normalize(code);
  const starterNormalized = normalize(starter);
  const unchanged = studentNormalized === starterNormalized;

  const warningBanner = unchanged
    ? '<div class="run-warning-banner">' +
      "<b>⚠ Your code looks the same as the starter template.</b> " +
      "This means you have not written any solution yet. The compiler still ran it, " +
      "but running the starter does not count as solving the problem. " +
      "Write your actual solution in the editor before submitting." +
      '<div class="uz-inline uz">' +
      "<b>⚠ Kodingiz boshlang'ich shablon bilan bir xil ko'rinadi.</b> " +
      "Bu siz hali yechim yozmaganingizni anglatadi. Kompilyator uni baribir ishga tushirdi, " +
      "lekin boshlang'ich shablonni ishga tushirish masalani yechish hisoblanmaydi. " +
      "Yuborishdan oldin tahrirlovchida haqiqiy yechimingizni yozing." +
      "</div>" +
      '<div class="ru-inline ru">' +
      "<b>⚠ Ваш код выглядит так же, как стартовый шаблон.</b> " +
      "Это означает, что вы ещё не написали решение. Компилятор всё равно его выполнил, " +
      "но запуск стартового шаблона не считается решением задачи. " +
      "Напишите ваше решение в редакторе перед отправкой." +
      "</div></div>"
    : "";

  outputEl.innerHTML =
    '<div class="run-status-row"><span class="run-status-dot"></span>PROGRAM RAN SUCCESSFULLY · DASTUR MUVAFFAQIYATLI ISHLADI · ПРОГРАММА УСПЕШНО ВЫПОЛНЕНА</div>' +
    warningBanner +
    '<div class="run-output-block">' +
    '<div class="run-output-label">STDOUT</div>' +
    "<div>" +
    (result.stdout
      ? escapeHtmlText(result.stdout)
      : '<span style="font-style:italic;opacity:.7">(no output)</span>') +
    "</div></div>" +
    (result.stderr
      ? '<div class="run-output-block"><div class="run-output-label">STDERR (warnings)</div><div>' +
        escapeHtmlText(result.stderr) +
        "</div></div>"
      : "");
  window.CodeRunner.setLastResult(idx, {
    status: "success",
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: 0,
    starterOnly: unchanged, // flag for PDF generator if it wants to note it
  });
}

// Returns HTML for the reassurance note shown after 3+ consecutive failures.
// Returns empty string otherwise.
function renderFailureNote(idx) {
  const fails =
    (window._consecutiveFailures && window._consecutiveFailures[idx]) || 0;
  if (fails < 3) return "";
  return (
    '<div class="run-failure-note">' +
    "Several runs have failed. That's okay — you can still submit your exam. " +
    "The instructor grades manually the code you wrote, not the run results." +
    '<span class="rfn-uz uz">Bir nechta ishga tushirish muvaffaqiyatsiz bo\'ldi. ' +
    "Bu muammo emas — siz imtihonni baribir yubora olasiz. O'qituvchi siz " +
    "yozgan kodni qo'lda o'qib baholaydi, ishga tushirish natijasini emas.</span>" +
    '<span class="rfn-ru ru">Несколько запусков не удались. ' +
    "Это нормально — вы всё равно можете отправить экзамен. Преподаватель " +
    "вручную оценивает написанный вами код, а не результаты запуска.</span>" +
    "</div>"
  );
}

function escapeHtmlText(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Render a simple C++ syntax highlight: comments in color, rest in default
function renderHighlight(code, el) {
  // Minimal C++ tokenizer — good enough for the exam code students write,
  // not a full lexer. We preserve ALL whitespace/newlines exactly so the
  // overlay aligns byte-for-byte with the textarea above it.
  //
  // Classes (styled in CSS):
  //   .tk-keyword   — control flow / modifiers (if, else, for, return, ...)
  //   .tk-type      — built-in types (int, double, char, bool, string, ...)
  //   .tk-string    — "double-quoted" and 'single-quoted' literals
  //   .tk-number    — integer / float literals
  //   .tk-preproc   — #include / #define / other #directives
  //   .tk-operator  — << >> + - = == != && || etc.
  //   .c-en / .c-uz — English / Uzbek line comments (existing behavior)

  const KEYWORDS = new Set([
    "if",
    "else",
    "for",
    "while",
    "do",
    "switch",
    "case",
    "default",
    "break",
    "continue",
    "return",
    "true",
    "false",
    "null",
    "nullptr",
    "new",
    "delete",
    "this",
    "using",
    "namespace",
    "const",
    "static",
    "class",
    "struct",
    "public",
    "private",
    "protected",
    "virtual",
    "template",
    "typename",
    "typedef",
    "throw",
    "try",
    "catch",
    "auto",
    "sizeof",
    "extern",
    "inline",
    "friend",
    "operator",
  ]);
  const TYPES = new Set([
    "int",
    "long",
    "short",
    "double",
    "float",
    "char",
    "bool",
    "void",
    "string",
    "unsigned",
    "signed",
    "size_t",
    "vector",
    "map",
    "set",
    "pair",
    "std",
  ]);

  const htmlEscape = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const uzbekHint =
    /[a-z]'[a-z]|\b(ning|uchun|yoki|agar|har|gacha|dan|kiriting|so'rang|chaqiring|tekshiring|saqlang|hisoblang|topish|oshiring|yozing|qo'shing|eting|sikl[ia]?|massiv(ga|ni)?|sonlar?|sonni|satr|belgi|misol|raqam|qator|bo'lsa|yechim|QADAM)\b/i;

  const lines = code.split("\n");
  const htmlLines = lines.map((line) => {
    // First, carve off any // line-comment so we don't syntax-color it
    const commentIdx = findLineCommentStart(line);
    let codePart = line;
    let commentPart = "";
    if (commentIdx !== -1) {
      codePart = line.substring(0, commentIdx);
      commentPart = line.substring(commentIdx);
    }

    // Tokenize the non-comment portion
    let tokenized = "";
    let i = 0;
    while (i < codePart.length) {
      const ch = codePart[i];

      // Preprocessor directive — only at start of line (after optional whitespace)
      if (ch === "#" && /^\s*#/.test(codePart.substring(0, i + 1))) {
        // grab to end of line (or end of codePart)
        const rest = codePart.substring(i);
        tokenized += '<span class="tk-preproc">' + htmlEscape(rest) + "</span>";
        i = codePart.length;
        continue;
      }

      // String literal "..."
      if (ch === '"') {
        let end = i + 1;
        while (end < codePart.length) {
          if (codePart[end] === "\\") {
            end += 2;
            continue;
          }
          if (codePart[end] === '"') {
            end++;
            break;
          }
          end++;
        }
        tokenized +=
          '<span class="tk-string">' +
          htmlEscape(codePart.substring(i, end)) +
          "</span>";
        i = end;
        continue;
      }

      // Char literal '...'
      if (ch === "'") {
        let end = i + 1;
        while (end < codePart.length) {
          if (codePart[end] === "\\") {
            end += 2;
            continue;
          }
          if (codePart[end] === "'") {
            end++;
            break;
          }
          end++;
        }
        tokenized +=
          '<span class="tk-string">' +
          htmlEscape(codePart.substring(i, end)) +
          "</span>";
        i = end;
        continue;
      }

      // Number literal (int or float)
      if (/[0-9]/.test(ch)) {
        let end = i;
        while (end < codePart.length && /[0-9.eEfFuUlL]/.test(codePart[end]))
          end++;
        tokenized +=
          '<span class="tk-number">' +
          htmlEscape(codePart.substring(i, end)) +
          "</span>";
        i = end;
        continue;
      }

      // Identifier / keyword / type
      if (/[A-Za-z_]/.test(ch)) {
        let end = i;
        while (end < codePart.length && /[A-Za-z0-9_]/.test(codePart[end]))
          end++;
        const word = codePart.substring(i, end);
        if (KEYWORDS.has(word)) {
          tokenized +=
            '<span class="tk-keyword">' + htmlEscape(word) + "</span>";
        } else if (TYPES.has(word)) {
          tokenized += '<span class="tk-type">' + htmlEscape(word) + "</span>";
        } else {
          tokenized += htmlEscape(word);
        }
        i = end;
        continue;
      }

      // Operators / punctuation — group runs of operator chars
      if (/[<>=!+\-*/%&|^~?:;,.(){}\[\]]/.test(ch)) {
        let end = i;
        while (
          end < codePart.length &&
          /[<>=!+\-*/%&|^~?:]/.test(codePart[end])
        )
          end++;
        if (end > i) {
          tokenized +=
            '<span class="tk-operator">' +
            htmlEscape(codePart.substring(i, end)) +
            "</span>";
          i = end;
          continue;
        }
        // single punctuation char (;, . ( ) { } [ ] ,) — leave unhighlighted
        tokenized += htmlEscape(ch);
        i++;
        continue;
      }

      // Whitespace / anything else — preserve exactly
      tokenized += htmlEscape(ch);
      i++;
    }

    // Append the comment (if any), styled English or Uzbek
    if (commentPart) {
      const isUzbek = uzbekHint.test(commentPart);
      const cls = isUzbek ? "c-uz" : "c-en";
      tokenized +=
        '<span class="' + cls + '">' + htmlEscape(commentPart) + "</span>";
    }
    return tokenized;
  });

  // Render to overlay. IMPORTANT: do NOT add a trailing "\n" here — the
  // textarea's value is what the user typed, and our overlay must render
  // the SAME number of visual rows as the textarea. Adding an extra
  // newline would make the overlay one row taller than the textarea,
  // causing scrollTop mirroring to drift by one line at the bottom of
  // the editor. split()/join() are already symmetric:
  //   "abc".split("\n")       === ["abc"]       → join → "abc"
  //   "abc\n".split("\n")     === ["abc", ""]   → join → "abc\n"
  //   "abc\nxyz".split("\n")  === ["abc","xyz"] → join → "abc\nxyz"
  // So just joining preserves the exact structure and alignment.
  el.innerHTML = htmlLines.join("\n");
}

// Helper: find where a // line comment starts, skipping any // inside strings
function findLineCommentStart(line) {
  let inStr = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === "/" && line[i + 1] === "/") return i;
  }
  return -1;
}

// ---------------- Progress ----------------
function updateProgress() {
  const answered = userAnswers.filter((a) => a !== -1).length;
  const total = mcQuestions.length;
  const pct = (answered / total) * 100;
  $("progress-fill").style.width = pct + "%";
  // Build a tri-lingual progress text — show one language at a time
  // depending on which language span is visible (CSS toggles them).
  const ptEl = $("progress-text");
  if (ptEl) {
    ptEl.innerHTML =
      `<span>Answered ${answered} / ${total} test questions</span>` +
      ` <span class="uz">· ${answered} / ${total} test savoliga javob berildi</span>` +
      ` <span class="ru">· отвечено на ${answered} из ${total} вопросов теста</span>`;
  }
  if ($("answered-count")) $("answered-count").textContent = answered;
  if ($("answered-count-uz")) $("answered-count-uz").textContent = answered;
  if ($("answered-count-ru")) $("answered-count-ru").textContent = answered;
  // FIX (May 23): also sync the denominator spans, so the submit-bar
  // reads "13 of 15 test questions" on a 15-question exam — previously
  // the "20" was a hardcoded HTML text node and never got updated when
  // the per-exam mcCount differed from 20.
  if ($("mc-total-count")) $("mc-total-count").textContent = total;
  if ($("mc-total-count-uz")) $("mc-total-count-uz").textContent = total;
  if ($("mc-total-count-ru")) $("mc-total-count-ru").textContent = total;
}

// ---------------- Exam structure / duration (Round 2 follow-up) ----------------
//
// Applies the per-exam instructor configuration to the student-facing
// exam page. Before this fix, exam.html shipped with hardcoded numbers
// in the "Exam Structure" card (20 Tests × 2 pts, 4 Coding Problems
// (10 + 15 + 15 + 20), 100 points, 100-min timer) and the actual
// instructor-configured values were never read at exam time.
//
// What this populates:
//   1. The "Exam Structure" card rows — MC line, coding line, total.
//   2. The "0 / 20 test questions" progress text (count only; the
//      `updateProgress()` helper handles the live "answered" half).
//   3. The exam version badge (already populated above, untouched).
//   4. EXAM_DURATION — sourced from cfg.duration (minutes).
//
// Honors all Round 2 fields with sensible fallbacks:
//   - cfg.mcCount, cfg.codingCount      → counts
//   - cfg.pointsPerCorrectMc            → MC points-each (default 2)
//   - cfg.codingMaxPoints[]             → per-problem max (default
//                                          _defaultCodingMaxArray)
//   - cfg.duration                      → minutes; default 100 if
//                                          missing or invalid
//
// If a count is 0, that row of the card is hidden entirely (so a
// pure-MC exam doesn't show "0 Coding Problems = 0 points" awkwardness,
// and a pure-coding exam doesn't show "0 Tests × N pts = 0 points").
function applyExamConfigToHeader(cfg) {
  // Round 3 (July 2026): General English exams describe their shape
  // with a `sections` map rather than a flat MC count, and each
  // section has its own point value.
  const englishExam = !!(cfg && examCourseIsSectioned(cfg.course));
  const engSections = englishExam ? normalizeEnglishSections(cfg.sections) : null;
  const engTotals = engSections
    ? ["reading", "grammar", "vocabulary"].reduce(
        function (acc, key) {
          acc.count += engSections[key].count;
          acc.points += engSections[key].count * engSections[key].pointsPerCorrect;
          return acc;
        },
        { count: 0, points: 0 },
      )
    : null;

  // Normalize the config so the rest of this function can assume
  // sane numbers. Same defaults the Round 2 admin form uses.
  const mcCount = englishExam
    ? engTotals.count
    : cfg && typeof cfg.mcCount === "number" && cfg.mcCount >= 0
      ? cfg.mcCount
      : 20;
  const codingCount = englishExam
    ? 0
    : cfg && typeof cfg.codingCount === "number" && cfg.codingCount >= 0
      ? cfg.codingCount
      : 4;
  const pointsPerCorrectMc =
    cfg &&
    typeof cfg.pointsPerCorrectMc === "number" &&
    cfg.pointsPerCorrectMc > 0
      ? cfg.pointsPerCorrectMc
      : 2;
  let codingMaxPoints =
    cfg && Array.isArray(cfg.codingMaxPoints) ? cfg.codingMaxPoints : null;
  if (!codingMaxPoints || codingMaxPoints.length !== codingCount) {
    // Same defaults as admin.js _defaultCodingMaxArray — see Round 2
    // notes. Re-derived here so this module has no dependency on the
    // admin code (which doesn't ship to the student page).
    codingMaxPoints = _localDefaultCodingMaxArray(codingCount);
  }
  const durationMin =
    cfg && typeof cfg.duration === "number" && cfg.duration > 0
      ? cfg.duration
      : 100;

  // 1. Update EXAM_DURATION (in seconds). Sanity-cap at 10h to guard
  //    against a corrupt config that would create a runaway timer.
  const cappedMin = Math.min(durationMin, 600);
  EXAM_DURATION = cappedMin * 60;

  // 2. Build the structure-card row strings.
  const mcTotalPoints = englishExam
    ? roundPoints(engTotals.points)
    : roundPoints(mcCount * pointsPerCorrectMc);
  const codingTotalPoints = codingMaxPoints.reduce(
    (sum, n) => sum + (typeof n === "number" ? n : 0),
    0,
  );
  const grandTotal = mcTotalPoints + codingTotalPoints;

  // MC row — hide entirely if mcCount is 0.
  const mcRow = document.getElementById("examStructMcRow");
  if (mcRow) {
    if (mcCount === 0) {
      mcRow.style.display = "none";
    } else {
      mcRow.style.display = "";
      const left = document.getElementById("examStructMcLeft");
      const right = document.getElementById("examStructMcRight");
      if (left) {
        if (englishExam) {
          // e.g. "Reading 10×5 + Grammar 10×2.5 + Vocabulary 10×2.5"
          left.textContent = ["reading", "grammar", "vocabulary"]
            .filter(function (k) {
              return engSections[k].count > 0;
            })
            .map(function (k) {
              return (
                englishSectionLabel(k) +
                " " +
                engSections[k].count +
                "×" +
                fmtPoints(engSections[k].pointsPerCorrect)
              );
            })
            .join(" + ");
        } else {
          left.textContent =
            mcCount + " Tests × " + fmtPoints(pointsPerCorrectMc) + " pts";
        }
      }
      if (right) right.textContent = fmtPoints(mcTotalPoints) + " points";
    }
  }

  // Coding row — hide entirely if codingCount is 0.
  const codeRow = document.getElementById("examStructCodingRow");
  if (codeRow) {
    if (codingCount === 0) {
      codeRow.style.display = "none";
    } else {
      codeRow.style.display = "";
      const left = document.getElementById("examStructCodingLeft");
      const right = document.getElementById("examStructCodingRight");
      if (left) {
        left.textContent =
          codingCount +
          " Coding Problems (" +
          codingMaxPoints.map(fmtPoints).join(" + ") +
          ")";
      }
      if (right) right.textContent = fmtPoints(codingTotalPoints) + " points";
    }
  }

  // FIX (July 2026): a zero-coding exam previously still printed the
  // "PART 02 · Coding Problems" heading and its reassurance banner
  // above an empty container. Now the whole coding part is removed
  // from the page — which is what every General English exam needs.
  const codingHeading = document.getElementById("codingSectionHeading");
  const codingNote = document.getElementById("codingReassurance");
  [codingHeading, codingNote].forEach(function (el) {
    if (el) el.style.display = codingCount === 0 ? "none" : "";
  });
  // With no coding part, "PART 01" is the only part — drop the label
  // so students aren't left looking for a part two.
  const mcHeadingNum = document.querySelector(".section-heading.s-mc .num");
  if (mcHeadingNum) {
    mcHeadingNum.style.display = codingCount === 0 ? "none" : "";
  }

  // Total row — always visible.
  const totalRight = document.getElementById("examStructTotalRight");
  if (totalRight) totalRight.textContent = fmtPoints(grandTotal) + " points";

  // 3. Initial progress text with correct denominator. The live
  //    updater (updateProgress) re-renders this when answers change,
  //    but on first paint we want "0 / 15" not "0 / 20".
  const progressEl = document.getElementById("progress-text");
  if (progressEl) {
    progressEl.innerHTML =
      `<span>Answered 0 / ${mcCount} test questions</span>` +
      ` <span class="uz">· 0 / ${mcCount} test savoliga javob berildi</span>` +
      ` <span class="ru">· отвечено 0 / ${mcCount} тестовых вопросов</span>`;
  }
  // Also set the bottom submit-bar denominator spans now, so the
  // initial paint reads correctly. updateProgress() keeps these in
  // sync going forward.
  const mcTotalEl = document.getElementById("mc-total-count");
  if (mcTotalEl) mcTotalEl.textContent = mcCount;
  const mcTotalUzEl = document.getElementById("mc-total-count-uz");
  if (mcTotalUzEl) mcTotalUzEl.textContent = mcCount;
  const mcTotalRuEl = document.getElementById("mc-total-count-ru");
  if (mcTotalRuEl) mcTotalRuEl.textContent = mcCount;

  // 4. Course title + subtitle. Previously these were hardcoded as
  //    "Programming 1 with C++" and "Final Exam (Spring Semester,
  //    2026) · NPUU" — wrong for any exam that wasn't a 2026 spring
  //    final. Now derived from the same config fields the admin form
  //    writes (course, examType, semester, academicYear, university).
  const titleEl = document.getElementById("examCourseTitle");
  if (titleEl) {
    titleEl.textContent = _localCourseLabel((cfg && cfg.course) || "cpp1");
  }
  const subtitleEl = document.getElementById("examSubtitle");
  if (subtitleEl) {
    const examTypeLabel = _localExamTypeLabel((cfg && cfg.examType) || "final");
    const semesterLabel = _localSemesterLabel(
      (cfg && cfg.semester) || "spring",
    );
    const academicYear = (cfg && cfg.academicYear) || "";
    const university = (cfg && cfg.university) || "NPUU";
    // Format mirrors the previous hardcoded line:
    //   "Final Exam (Spring Semester, 2026) · NPUU"
    // becomes
    //   "Retake Exam 2 (Spring Semester, 2025-2026) · NPUU"
    // (we use the full academic-year string rather than a single
    // year because the underlying field is a range like "2025-2026"
    // and truncating to one year loses information.)
    subtitleEl.textContent =
      examTypeLabel +
      " (" +
      semesterLabel +
      " Semester" +
      (academicYear ? ", " + academicYear : "") +
      ") · " +
      university;
  }
}

// ---------------- Welcome-page format banner (July 2026) ----------------
//
// The blue three-stat banner used to be hardcoded to
// "Multiple Choice / Coding Problems / Duration", so a General English
// exam advertised "0 CODING PROBLEMS" — technically true, useless to
// the student, and actively confusing on a language paper.
//
// The middle stat now adapts to the exam's actual shape:
//   coding exam      → Coding Problems (unchanged)
//   no coding part   → Total Points, which is what a test-only student
//                      actually wants to know
// and the first stat is labelled "Test Questions" for section-based
// exams, where "Multiple Choice" undersells a reading comprehension.
//
// Driven entirely by the course registry, so the five planned maths
// subjects will render correctly the day they're added — no change
// needed here.
function renderExamFormatBanner(config) {
  const mcEl = $("snFormatMc");
  const codeEl = $("snFormatCode");
  const durEl = $("snFormatDur");
  const mcLabel = $("snFormatMcLabel");
  const codeLabel = $("snFormatCodeLabel");

  const sectioned = examCourseIsSectioned(config.course);
  const hasCoding = (config.codingCount || 0) > 0;

  const qCount =
    typeof window.snExamQuestionCount === "function"
      ? window.snExamQuestionCount(config)
      : config.mcCount || 0;

  if (mcEl) mcEl.textContent = String(qCount);
  if (durEl) durEl.textContent = String(config.duration || 0);

  // Rewrites a label div, keeping the trilingual secondary spans that
  // the language switcher toggles.
  function setLabel(el, en, uz, ru) {
    if (!el) return;
    el.innerHTML =
      en +
      '<span class="sn-fl-second uz">' +
      uz +
      "</span>" +
      '<span class="sn-fl-second ru">' +
      ru +
      "</span>";
  }

  if (sectioned) {
    setLabel(mcLabel, "Test Questions", "Test savollari", "Тестовые вопросы");
  } else {
    setLabel(mcLabel, "Multiple Choice", "Testlar", "Тесты");
  }

  if (hasCoding) {
    if (codeEl) codeEl.textContent = String(config.codingCount || 0);
    setLabel(codeLabel, "Coding Problems", "Kodlash masalalari", "Задачи");
  } else {
    // No coding part — show what the exam is worth instead.
    const total =
      typeof window.snExamTotalPoints === "function"
        ? window.snExamTotalPoints(config)
        : qCount;
    if (codeEl) codeEl.textContent = fmtPoints(total);
    setLabel(codeLabel, "Total Points", "Umumiy ball", "Всего баллов");
  }
}

// ---------------- English-only language lock (Round 3) ----------------
//
// General English 1 / 2 assess English itself, so showing an Uzbek or
// Russian rendering of a question would hand the student the answer.
// renderQuestions() already emits English-only markup for these exams;
// this function removes the affordance that implies otherwise.
//
// On the exam page the language switcher exists almost entirely to
// translate questions, so for an English exam we swap the dropdown for
// a static "English only" pill. Page chrome keeps whatever secondary
// language the student previously chose — only the questions are
// pinned.
//
// Every other course (Programming 1 with C++ and anything added later)
// is untouched: the switcher stays fully functional and questions keep
// their EN/UZ/RU renderings.
function applyEnglishOnlyLanguageLock() {
  if (!examIsEnglishOnly()) return;

  document.querySelectorAll(".lang-switcher").forEach(function (wrap) {
    const sel = wrap.querySelector("select");
    if (sel) sel.style.display = "none";
    const label = wrap.querySelector("label");
    if (label) label.style.display = "none";
    if (wrap.querySelector(".lang-locked-pill")) return;
    const pill = document.createElement("span");
    pill.className = "lang-locked-pill";
    pill.title =
      "This is an English language exam, so the questions are shown in English only.";
    pill.innerHTML =
      '<span aria-hidden="true">&#127760;</span> Questions in English only';
    wrap.appendChild(pill);
  });
}

// ---------------- Local label maps (Round 2 follow-up) ----------------
//
// admin.js owns the canonical EXAM_TYPES / EXAM_COURSES maps, but
// admin.js doesn't ship to the student exam page. We duplicate the
// (small, infrequently-changing) value→label mappings here so the
// student page can render human-readable subtitle text without
// pulling in the admin module. Keep these in sync if the admin list
// ever grows — search for "EXAM_TYPES" in admin.js.

// Round 5 (July 2026): the authoritative exam document id.
//
// Three places used to rebuild this id by joining six config fields.
// That was already fragile, and free-text exam types make it more so —
// any character the admin sanitises out of the document id would cause
// a silent mismatch here. The welcome page now stashes the real
// document id on the active config, so we use it whenever present and
// fall back to the historical reconstruction only for legacy flows.
function snActiveExamId() {
  const cfg = window._sinovActiveExamConfig;
  if (!cfg) return null;
  if (cfg.examId) return cfg.examId;
  if (cfg._id) return cfg._id;
  const parts = [
    cfg.university,
    cfg.faculty,
    cfg.course,
    cfg.academicYear,
    cfg.semester,
    cfg.examType,
  ];
  return parts.every(Boolean) ? parts.join("_") : null;
}

function _localExamTypeLabel(t) {
  // Mirror of EXAM_TYPES in admin.js
  switch (t) {
    case "midterm":
      return "Midterm Exam";
    case "final":
      return "Final Exam";
    case "resit":
      return "Resit Exam";
    case "retake1":
      return "Retake Exam 1";
    case "retake2":
      return "Retake Exam 2";
    default:
      return t || "Exam";
  }
}

function _localCourseLabel(c) {
  // Registry-driven (js/courses.js) — adding a subject there updates
  // this automatically.
  if (typeof window.snCourseLabel === "function") return window.snCourseLabel(c);
  return c || "Course";
}

function _localSemesterLabel(s) {
  if (!s) return "";
  // Lowercase → "Spring" / "Fall" (matches admin's _capitalize() usage)
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Same defaults as admin.js (kept in sync; intentionally duplicated
// to keep app.js dependency-free). See Round 2 notes for the table.
function _localDefaultCodingMaxArray(n) {
  if (n <= 0) return [];
  if (n === 1) return [60];
  if (n === 2) return [25, 35];
  if (n === 3) return [15, 20, 25];
  if (n === 4) return [10, 15, 15, 20];
  // n >= 5: even split, last slot gets the remainder.
  const base = Math.floor(60 / n);
  const out = new Array(n).fill(base);
  out[n - 1] = 60 - base * (n - 1);
  return out;
}

// ---------------- Timer ----------------
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
}
function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remaining = EXAM_DURATION - elapsed;
  if (remaining <= 0) {
    clearInterval(timerInterval);
    showModal({
      type: "warning",
      title: "Time's Up!",
      titleUz: "Vaqt tugadi!",
      titleRu: "Время вышло!",
      message:
        "Your time has expired. The exam is being submitted automatically." +
        " <span class='uz'>Vaqtingiz tugadi. Imtihon avtomatik yuborilmoqda.</span>" +
        " <span class='ru'>Ваше время истекло. Экзамен отправляется автоматически.</span>",
      okText: "OK",
    }).then(() => performSubmit("auto"));
    setTimeout(() => {
      if (!examEnded) performSubmit("auto");
    }, 4000);
    return;
  }
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  $("timer-val").innerHTML =
    String(mins).padStart(2, "0") +
    '<span style="font-size:0.7em;opacity:.7;font-weight:500"> min </span>' +
    String(secs).padStart(2, "0") +
    '<span style="font-size:0.7em;opacity:.7;font-weight:500"> sec</span>';
  const t = $("timer");
  t.classList.remove("warning", "danger");
  if (remaining <= 60) t.classList.add("danger");
  else if (remaining <= 5 * 60) t.classList.add("warning");
}

// ---------------- Anti-cheating ----------------
// FIX: tab-switch counter was firing TWICE per switch (one for visibilitychange,
// one for window.blur). We now use only visibilitychange + a debounce.
let _lastTabSwitchAt = 0;
function registerTabSwitch() {
  const now = Date.now();
  if (now - _lastTabSwitchAt < 500) return; // debounce duplicate events
  _lastTabSwitchAt = now;
  tabSwitches++;
  if ($("tabcount-val")) $("tabcount-val").textContent = tabSwitches;
  if ($("tabcount")) $("tabcount").classList.add("flagged");
  flash(
    `Warning: Tab switch detected! (${tabSwitches}) / Ogohlantirish: Yorliq almashtirish aniqlandi! / Внимание: обнаружена смена вкладки!`,
  );
}

function examStarted() {
  return $("test") && $("test").style.display !== "none" && !examEnded;
}

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (examStarted())
    flash(
      "Mouse Right-click is disabled! / Sichqoncha o'ng tugmasini bosish ruxsat etilmaydi! / Правый клик мышью отключён!",
    );
  return false;
});
["copy", "cut"].forEach((evt) => {
  document.addEventListener(evt, (e) => {
    const t = e.target;
    if (
      t.tagName === "TEXTAREA" ||
      (t.tagName === "INPUT" && t.type === "text")
    )
      return;
    e.preventDefault();
  });
});
document.addEventListener("paste", (e) => {
  const t = e.target;
  if (t.tagName === "TEXTAREA" && examStarted()) {
    e.preventDefault();
    flash(
      "Copy-Pasting is disabled in the code editor area! / Kod yozish xududiga nusxalar joylashtirish mumkin emas! / Вставка отключена в области редактора кода!",
    );
  }
});
// F5 / Ctrl+R / Cmd+R interception — separate, earlier-priority handler.
// Uses capture phase so we intercept BEFORE anything else can react.
// The main keydown handler also checks for these keys as a fallback,
// but this capture-phase handler is the primary defense.
document.addEventListener(
  "keydown",
  (e) => {
    if (!examStarted()) return;
    const k = (e.key || "").toLowerCase();
    if (k === "f5" || ((e.ctrlKey || e.metaKey) && k === "r")) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (typeof showReloadWarningModal === "function") {
        showReloadWarningModal();
      }
      return false;
    }
  },
  true, // capture phase — runs before bubbling handlers
);

document.addEventListener("keydown", (e) => {
  if (!examStarted()) return;
  const k = e.key.toLowerCase();

  // Block DevTools shortcuts on Windows/Linux (Ctrl+Shift+I/J/C, F12)
  // AND on Mac Safari/Chrome (Cmd+Opt+I/J/C/U, Cmd+Opt+R)
  if (
    k === "f12" ||
    (e.ctrlKey && e.shiftKey && (k === "i" || k === "j" || k === "c")) ||
    (e.metaKey &&
      e.altKey &&
      (k === "i" || k === "j" || k === "c" || k === "u" || k === "r")) ||
    (e.ctrlKey && k === "u") || // Ctrl+U view source (Win/Linux)
    (e.metaKey && k === "u") || // Cmd+U view source (Mac)
    (e.metaKey && e.altKey && k === "a") // Cmd+Opt+A Safari responsive design mode
  ) {
    e.preventDefault();
    flash(
      "Developer tools are disabled! / Ishlab chiqaruvchi vositalari o'chirilgan! / Инструменты разработчика отключены!",
    );
  }

  // Block paste in textareas (both Ctrl+V and Cmd+V)
  if ((e.ctrlKey || e.metaKey) && k === "v") {
    const t = e.target;
    if (t.tagName === "TEXTAREA") {
      e.preventDefault();
      flash(
        "Copy-Pasting is disabled in the code editor area! / Kod yozish xududiga nusxalar joylashtirish mumkin emas! / Вставка отключена в области редактора кода!",
      );
    }
  }

  // Block Cmd+P (print) during exam — students might print answer key view
  if ((e.ctrlKey || e.metaKey) && k === "p") {
    e.preventDefault();
    flash(
      "Printing is disabled during the exam! / Imtihon paytida chop etish mumkin emas! / Печать отключена во время экзамена!",
    );
  }

  // Block Cmd+S (save page) during exam
  if ((e.ctrlKey || e.metaKey) && k === "s") {
    e.preventDefault();
    flash(
      "Saving is disabled during the exam! / Imtihon paytida saqlash mumkin emas! / Сохранение отключено во время экзамена!",
    );
  }

  // F5 or Ctrl+R / Cmd+R (plain reload) or Ctrl+Shift+R / Cmd+Shift+R
  // (hard reload). Show a custom warning modal explaining the consequences.
  // Browser's native beforeunload still fires as a second safety net.
  if (
    k === "f5" ||
    ((e.ctrlKey || e.metaKey) && k === "r") // covers Shift+R too since it's still "r"
  ) {
    e.preventDefault();
    e.stopPropagation();
    showReloadWarningModal();
  }
});

// Reload warning modal — shown when student tries to refresh the exam page
// via F5 or Ctrl/Cmd+R. Explains the consequences bilingually and asks
// for explicit confirmation before actually reloading.
let _reloadModalOpen = false;
function showReloadWarningModal() {
  if (_reloadModalOpen) return; // prevent stacking if user spams F5
  _reloadModalOpen = true;
  showModal({
    type: "warning",
    title: "Reload the exam page?",
    titleUz: "Imtihon sahifasini qayta yuklashni istaysizmi?",
    titleRu: "Перезагрузить страницу экзамена?",
    message:
      "<b>Warning:</b> If you reload this page, ALL your current answers and code will be erased. You will have to start the exam from the beginning. Your time remaining will also reset.<br><br>" +
      "<b>Only reload if you really need to.</b> If your internet briefly disconnected, the exam still works — you can keep answering and submit when you're done. There is no need to reload.<br><br>" +
      '<span class="uz">' +
      "<b>Ogohlantirish:</b> Agar siz bu sahifani qayta yuklasangiz, HAMMA joriy javoblaringiz va kodingiz o'chib ketadi. Imtihonni boshidan boshlashga majbur bo'lasiz. Qolgan vaqtingiz ham qayta tiklanadi.<br><br>" +
      "<b>Faqat haqiqatan kerak bo'lsa qayta yukalang.</b> Agar internetingiz qisqa vaqtga uzilgan bo'lsa, imtihon baribir ishlaydi — javob berishni davom ettiring va tugatganingizda topshiring. Qayta yuklash shart emas." +
      "</span>" +
      '<span class="ru">' +
      "<b>Внимание:</b> Если вы перезагрузите эту страницу, ВСЕ ваши текущие ответы и код будут удалены. Вам придётся начать экзамен сначала. Оставшееся время также обнулится.<br><br>" +
      "<b>Перезагружайте только в случае крайней необходимости.</b> Если у вас на короткое время пропал интернет, экзамен всё равно работает — продолжайте отвечать и отправьте, когда закончите. Нет необходимости перезагружать страницу." +
      "</span>",
    okText:
      "Yes, reload anyway / Ha, baribir qayta yuklash / Да, всё равно перезагрузить",
    cancelText:
      "Cancel — keep my work / Bekor qilish — ishimni saqlash / Отмена — сохранить работу",
  }).then((confirmed) => {
    _reloadModalOpen = false;
    if (confirmed) {
      // Student has acknowledged the consequences. Allow the reload to
      // proceed. We have to temporarily disable beforeunload or it will
      // block us via the browser's native dialog as a second layer.
      window.onbeforeunload = null;
      window.removeEventListener("beforeunload", _beforeUnloadHandler);
      location.reload();
    }
    // If not confirmed, nothing happens — student's work is preserved.
  });
}
// FIX: only visibilitychange, not window.blur (prevents double counting)
document.addEventListener("visibilitychange", () => {
  if (examStarted() && document.hidden) {
    registerTabSwitch();
  }
});

const _beforeUnloadHandler = (e) => {
  if (examStarted()) {
    e.preventDefault();
    e.returnValue = "";
    return "";
  }
};
window.addEventListener("beforeunload", _beforeUnloadHandler);

// ---------------- Modal ----------------
let _modalResolve = null;
function showModal({
  type = "warning",
  title,
  titleUz,
  titleRu,
  message,
  progress,
  okText = "OK",
  cancelText = null,
}) {
  return new Promise((resolve) => {
    _modalResolve = resolve;
    const box = $("modal-box");
    if (!box) {
      resolve(true);
      return;
    }
    box.className =
      "modal " +
      (type === "success" ? "success" : type === "info" ? "info" : "");
    const icons = { warning: "!", success: "✓", info: "i", error: "✗" };
    $("modal-icon").textContent = icons[type] || "!";
    const titleEl = $("modal-title");
    // Clear previous child text nodes
    titleEl.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.nodeValue = "";
    });
    // Build the language-aware title:
    //   "Title <span class='uz'>Sarlavha</span><span class='ru'>Заголовок</span>"
    // Both .uz and .ru spans are present; CSS hides one based on body class.
    const titleUzEl = $("modal-title-uz");
    const titleRuEl = $("modal-title-ru");
    titleEl.insertBefore(document.createTextNode(title + " "), titleUzEl);
    if (titleUzEl) titleUzEl.textContent = titleUz || "";
    if (titleRuEl) titleRuEl.textContent = titleRu || titleUz || "";
    $("modal-text").innerHTML = message;
    if (progress) {
      $("modal-progress").style.display = "block";
      $("modal-progress").innerHTML = progress;
    } else {
      $("modal-progress").style.display = "none";
    }
    $("modal-ok").textContent = okText;
    const cancelBtn = $("modal-cancel");
    if (cancelText) {
      cancelBtn.style.display = "inline-flex";
      cancelBtn.textContent = cancelText;
    } else {
      cancelBtn.style.display = "none";
    }
    $("modal").classList.add("show");
  });
}

// ---------------- Submit ----------------
async function trySubmit() {
  if (examEnded) return;
  const answered = userAnswers.filter((a) => a !== -1).length;
  const incomplete = answered < mcQuestions.length;
  const confirmed = await showModal({
    type: incomplete ? "warning" : "info",
    title: incomplete ? "Incomplete Submission" : "Submit Exam?",
    titleUz: incomplete ? "To'liq emas" : "Imtihonni yakunlaysizmi?",
    titleRu: incomplete ? "Неполная отправка" : "Завершить экзамен?",
    message: incomplete
      ? `You have not answered all test questions. Are you sure you want to submit?` +
        `<span class="uz">Siz hamma test savollariga javob bermadingiz. Yuborishni xohlaysizmi?</span>` +
        `<span class="ru">Вы ответили не на все вопросы теста. Вы уверены, что хотите отправить?</span>`
      : `All test questions answered. Are you sure you want to submit?` +
        `<span class="uz">Hamma test savollariga javob berildi. Yuborishni xohlaysizmi?</span>` +
        `<span class="ru">Все вопросы теста отвечены. Вы уверены, что хотите отправить?</span>`,
    progress: incomplete
      ? `<b>Answered / Javob berildi / Отвечено:</b> ${answered} / ${mcQuestions.length}`
      : null,
    okText: "Submit / Yuborish / Отправить",
    cancelText: "Cancel / Bekor qilish / Отмена",
  });
  if (!confirmed) return;
  performSubmit("manual");
}

async function performSubmit(trigger) {
  if (examEnded) return;
  examEnded = true;
  clearInterval(timerInterval);
  // Track how the submission was triggered: "manual" (student clicked
  // Submit) or "auto" (timer ran out). Default to "manual" for safety
  // since any undefined path is more likely a user action than a timeout.
  window._submitTrigger = trigger === "auto" ? "auto" : "manual";

  // -------------------------------------------------------------
  // Stop the webcam proctoring (Feature 1) and capture risk summary.
  // We do this FIRST — before the heavy PDF generation — so the
  // webcam stops as soon as the student hits Submit. The risk summary
  // is read synchronously; events are already in memory.
  // -------------------------------------------------------------
  let proctorSummary = null;
  if (window.Proctoring && !webcamFeatureDisabled()) {
    try {
      proctorSummary = window.Proctoring.getRiskSummary();
      window.Proctoring.stop();
    } catch (err) {
      console.warn("[app.js] Proctoring stop/summary failed:", err);
    }
  }

  // Round 2 (May 2026): MC scoring with configurable rules.
  // The exam config provides:
  //   - pointsPerCorrectMc (1-10, default 2)
  //   - penaltyPerWrongMc  (0-10, default 0)
  //   - pointsPerUnansweredMc (fixed 0)
  // Formula: score = max(0, correct × ptsPerCorrect − wrong × penalty)
  // Unanswered questions contribute 0 (neither credit nor penalty).
  const examCfg = window._sinovActiveExamConfig || {};
  const ptsPerCorrect =
    typeof examCfg.pointsPerCorrectMc === "number" &&
    examCfg.pointsPerCorrectMc > 0
      ? examCfg.pointsPerCorrectMc
      : 2;
  const wrongPenalty =
    typeof examCfg.penaltyPerWrongMc === "number" &&
    examCfg.penaltyPerWrongMc >= 0
      ? examCfg.penaltyPerWrongMc
      : 0;

  // Round 3 (July 2026): each question carries its own `points` value.
  // For a normal exam every question is worth pointsPerCorrectMc, so
  // this reduces exactly to the old `correct × ptsPerCorrect` formula.
  // For a General English exam the value differs per section (Reading
  // 5, Grammar 2.5, Vocabulary 2.5), and points may be fractional.
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let earned = 0;
  let maxTotal = 0;
  // Per-section tallies, used for the scorecard/PDF breakdown on
  // section-structured (English) exams.
  const sectionTally = {};

  userAnswers.forEach((ans, idx) => {
    const q = mcQuestions[idx] || {};
    const qPts =
      typeof q.points === "number" && isFinite(q.points)
        ? q.points
        : ptsPerCorrect;
    maxTotal += qPts;

    const sKey = q.section || "all";
    if (!sectionTally[sKey]) {
      sectionTally[sKey] = {
        section: sKey,
        count: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        pointsPerCorrect: qPts,
        earned: 0,
        maxPoints: 0,
      };
    }
    const t = sectionTally[sKey];
    t.count++;
    t.maxPoints += qPts;

    if (ans === -1) {
      unanswered++;
      t.unanswered++;
    } else if (ans === q.correct) {
      correct++;
      earned += qPts;
      t.correct++;
      t.earned += qPts;
    } else {
      wrong++;
      earned -= wrongPenalty;
      t.wrong++;
      t.earned -= wrongPenalty;
    }
  });

  // Round before comparing/storing so fractional point values can't
  // leave floating-point residue in the saved score.
  Object.keys(sectionTally).forEach(function (k) {
    const t = sectionTally[k];
    t.earned = Math.max(0, roundPoints(t.earned));
    t.maxPoints = roundPoints(t.maxPoints);
  });

  // Floor at 0 — never negative, even with heavy penalties.
  const rawMcScore = roundPoints(earned);
  const mcScore = Math.max(0, rawMcScore);
  const mcMaxPoints = roundPoints(maxTotal);

  // Section-structured exams score each section at a different rate,
  // so a single "points per correct" figure would misreport the exam.
  // The flag lets the scorecard and PDF switch to a per-section legend.
  const sectionKeys = Object.keys(sectionTally);
  const isSectioned = sectionKeys.length > 1 || sectionKeys[0] !== "all";
  const sectionBreakdown = isSectioned
    ? sectionKeys.map(function (k) {
        return sectionTally[k];
      })
    : null;

  // Snapshot the scoring breakdown for the PDF + scorecard display.
  // This data goes into the submission doc so any later regeneration
  // (re-render PDF, admin re-grade) can show the same numbers.
  const mcBreakdown = {
    correct: correct,
    wrong: wrong,
    unanswered: unanswered,
    pointsPerCorrect: ptsPerCorrect,
    penaltyPerWrong: wrongPenalty,
    pointsPerUnanswered: 0,
    rawScore: rawMcScore, // can be negative; floored on display
    finalScore: mcScore, // what counts toward the grade
    maxPoints: mcMaxPoints,
    // Round 3 (July 2026): per-section results for section-structured
    // exams (General English). null for single-rate exams, which keeps
    // every legacy consumer on its original code path.
    sectionBreakdown: sectionBreakdown,
    // True when questions in this exam are not all worth the same
    // amount — tells the scorecard/PDF to print a per-section legend
    // instead of a single "Correct = +N pts" line.
    mixedPoints: !!(
      sectionBreakdown &&
      sectionBreakdown.some(function (s) {
        return s.pointsPerCorrect !== sectionBreakdown[0].pointsPerCorrect;
      })
    ),
  };

  // Round 2: coding answers are now dynamic count, not fixed 4.
  // Read each editor's value by id (code1, code2, ..., codeN) where N
  // is the configured codingCount on this exam.
  const codingArr = (versionData && versionData.coding) || [];
  const codingAnswersArr = [];
  for (let i = 0; i < codingArr.length; i++) {
    const el = $("code" + (i + 1));
    codingAnswersArr.push((el && el.value) || "(No code submitted)");
  }
  // Convenience aliases (kept for backward compatibility with downstream
  // code that still references code1..code4).
  const code1 = codingAnswersArr[0] || "(No code submitted)";
  const code2 = codingAnswersArr[1] || "(No code submitted)";
  const code3 = codingAnswersArr[2] || "(No code submitted)";
  const code4 = codingAnswersArr[3] || "(No code submitted)";
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins + "m " + secs + "s";

  // Default max points for each slot (used only as a last-resort fallback;
  // real maxes come from the resolved coding problem objects).
  const defaultMax = [10, 15, 15, 20];

  window._submissionData = {
    correct,
    // Round 4 (July 2026): carry the course through to the AI feedback
    // generator. Without this, ai-feedback.js had no way to know which
    // subject the exam was for and every student received C++ advice.
    course: (window._sinovActiveExamConfig || {}).course || null,
    // Round 6 (July 2026): the Storage path is now scoped by subject
    // and exam, so the uploader needs both.
    examType: (window._sinovActiveExamConfig || {}).examType || null,
    courseLabel:
      (window._sinovActiveExamConfig || {}).courseLabel ||
      _localCourseLabel((window._sinovActiveExamConfig || {}).course),
    // Round 2 additions
    wrong,
    unanswered,
    mcScore,
    mcMaxPoints,
    mcBreakdown,
    // Dynamic coding answers (length = codingArr.length).
    // The code1..code4 + starter1..starter4 below are derived for
    // backward compat with downstream code that still references them.
    codingAnswers: codingAnswersArr,
    code1,
    code2,
    code3,
    code4,
    // Starter code for each problem — PDF gen uses these to highlight
    // lines the student actually wrote (vs. unchanged boilerplate).
    starter1: (codingArr[0] && codingArr[0].starter) || "",
    starter2: (codingArr[1] && codingArr[1].starter) || "",
    starter3: (codingArr[2] && codingArr[2].starter) || "",
    starter4: (codingArr[3] && codingArr[3].starter) || "",
    // Max points per problem (from the resolved coding problem objects
    // which honor the per-exam codingMaxPoints array from the config).
    max1: (codingArr[0] && codingArr[0].maxPoints) || defaultMax[0],
    max2: (codingArr[1] && codingArr[1].maxPoints) || defaultMax[1],
    max3: (codingArr[2] && codingArr[2].maxPoints) || defaultMax[2],
    max4: (codingArr[3] && codingArr[3].maxPoints) || defaultMax[3],
    // Round 2: total max coding points (sum of all configured slots)
    codingMaxTotal: codingArr.reduce(function (s, c) {
      return s + (c.maxPoints || 0);
    }, 0),
    // Last run result for each problem (from CodeRunner). null if the
    // student never hit Run, an object otherwise.
    lastRun1: (window._lastRunResults && window._lastRunResults[0]) || null,
    lastRun2: (window._lastRunResults && window._lastRunResults[1]) || null,
    lastRun3: (window._lastRunResults && window._lastRunResults[2]) || null,
    lastRun4: (window._lastRunResults && window._lastRunResults[3]) || null,
    runCount1: (window._runCounts && window._runCounts[0]) || 0,
    runCount2: (window._runCounts && window._runCounts[1]) || 0,
    runCount3: (window._runCounts && window._runCounts[2]) || 0,
    runCount4: (window._runCounts && window._runCounts[3]) || 0,
    // Coding problem titles for the PDF
    codingTitles: codingArr.map((c) => ({
      en: c.title_en,
      uz: c.title_uz,
      ru: c.title_ru,
      maxPoints: c.maxPoints,
    })),
    // Full problem descriptions (so PDF can print them instead of a solution)
    codingProblems: codingArr,
    timeStr,
    mcQuestions,
    userAnswers,
    optionOrders,
    info: studentInfo,
    version: examVersion,
    tabSwitches,
    // Convenience fields flattened for the upload helper
    group: studentInfo.group,
    studentId: studentInfo.id,
    firstName: studentInfo.firstName,
    lastName: studentInfo.lastName,
    // examId tag — composite key for the exam configuration the student
    // picked on the welcome page. Used by the admin Submissions filter.
    // Falls back to null for legacy exam flows where no config was picked.
    examId: snActiveExamId(),
    // Feature 5: verification photo data URL + Gemini glasses-check
    // metadata. The data URL is consumed by the PDF generator and
    // ALSO uploaded to Storage as a separate JPEG so the admin can
    // view the larger version without bloating the Firestore doc.
    verificationPhotoDataUrl:
      (window._verificationPhoto && window._verificationPhoto.dataUrl) || null,
    verificationGlassesCheck:
      (window._verificationPhoto && window._verificationPhoto.glassesCheck) ||
      null,
    // Snapshot of the exam config so the PDF header can render
    // course / faculty / semester / year without re-querying Firestore.
    examConfig: window._sinovActiveExamConfig || null,
    // Webcam feature switched OFF by the admin for this exam. Consumed
    // by the PDF generator (avatar placeholder instead of the photo)
    // and stored on the submission doc so the admin dashboard shows
    // "webcam turned off by the admin" instead of proctoring evidence.
    webcamDisabled: webcamFeatureDisabled(),
    // Proctoring summary (Feature 1) — null if proctoring wasn't run
    // (e.g., master-override preview, webcam feature turned off by the
    // admin for this exam, or stop() failed).
    proctorSummary: proctorSummary,
  };

  $("test").style.display = "none";
  $("timer").style.display = "none";
  $("tabcount").style.display = "none";
  $("report").style.display = "block";

  $("scorecard").style.display = "block";
  $("scorecard").innerHTML = renderScorecardHtml(timeStr);

  window.scrollTo({ top: 0, behavior: "smooth" });

  // -------------------------------------------------------------
  // FEATURE 2: AI Personalized Student Feedback
  // -------------------------------------------------------------
  // Kick off the feedback request in PARALLEL with PDF generation.
  // The feedback is ~5-15s (Gemini text response) and the PDF is
  // ~1-3s. By starting both before we await either, we save 5-15s
  // of wall time. Feedback is then injected into the PDF before
  // the final upload.
  //
  // AIFeedback.generate() never throws — it returns a local fallback
  // object if Gemini is unreachable. So submission flow is safe.
  let feedbackPromise = null;
  if (window.AIFeedback) {
    try {
      // Pause briefly so the scorecard renders before we lock the UI
      // thread on a possibly-slow Gemini call.
      feedbackPromise = window.AIFeedback.generate(window._submissionData);
    } catch (err) {
      console.warn("[app.js] AIFeedback.generate kickoff failed:", err);
      feedbackPromise = null;
    }
  }

  // Render an on-screen placeholder while feedback is being generated.
  // This is purely cosmetic — the PDF will get the real feedback once
  // the await resolves below.
  renderFeedbackPlaceholder();

  // Generate the PDF NOW (in memory) but do NOT auto-download.
  // We download only if all 3 Firebase upload attempts fail.
  // generatePDFReport is async (it lazy-loads a Cyrillic-capable font).
  // We need to await the feedback FIRST so the PDF can include it.
  let aiFeedback = null;
  if (feedbackPromise) {
    try {
      aiFeedback = await feedbackPromise;
      window._submissionData.aiFeedback = aiFeedback;
    } catch (err) {
      // generate() never throws but be safe
      console.warn("[app.js] AIFeedback resolved with error:", err);
      aiFeedback = null;
    }
  }

  // Now render the real feedback into the on-screen card (replacing
  // the placeholder), so the student can read it while we generate
  // and upload the PDF.
  if (aiFeedback) {
    renderFeedbackOnPage(aiFeedback);
  } else {
    // No feedback (AIFeedback module not loaded). Hide the placeholder.
    const ph = document.getElementById("ai-feedback-card");
    if (ph) ph.style.display = "none";
  }

  let pdfResult = null;
  try {
    pdfResult = await window.generatePDFReport();
    window._pdfResult = pdfResult;
  } catch (err) {
    console.error("PDF generation failed:", err);
  }

  if (!pdfResult || !pdfResult.blob) {
    // Extreme edge case: PDF couldn't be built. Go straight to fallback UI.
    showFallbackBlock("pdf_build_failed");
    return;
  }

  // Kick off the upload flow
  runUploadFlow(pdfResult);
}

// ---------- Upload UI helpers ----------
function setUploadStatus(titleEn, titleUz, sub, iconChar, spin, titleRu) {
  if ($("usTitle")) $("usTitle").textContent = titleEn;
  if ($("usTitleUz")) $("usTitleUz").textContent = titleUz;
  if ($("usTitleRu")) $("usTitleRu").textContent = titleRu || titleUz || "";
  if ($("usSub")) $("usSub").textContent = sub || "";
  const icon = $("usIcon");
  if (icon) {
    icon.textContent = iconChar || "⟳";
    icon.classList.toggle("spinning", !!spin);
  }
}

function hideUploadStatus() {
  const el = $("uploadStatus");
  if (el) el.style.display = "none";
}

function showSuccessBlock() {
  hideUploadStatus();
  const el = $("successBlock");
  if (el) el.style.display = "block";
}

function showFallbackBlock(reason) {
  hideUploadStatus();
  const el = $("fallbackBlock");
  if (el) el.style.display = "block";

  // Wire the Google Form button to the configured URL
  const btn = $("gformBtn");
  if (btn && window.FB && window.FB.GOOGLE_FORM_URL) {
    btn.href = window.FB.GOOGLE_FORM_URL;
  }

  // Download the PDF locally now (only path where we download)
  try {
    if (window._pdfResult && typeof window._pdfResult.save === "function") {
      window._pdfResult.save();
    } else if (typeof window.downloadPDF === "function") {
      window.downloadPDF();
    }
  } catch (err) {
    console.error("Local PDF download failed:", err);
  }

  // Pop a modal so the student cannot miss what happened
  showModal({
    type: "warning",
    title: "Automatic upload failed",
    titleUz: "Avtomatik yuklash muvaffaqiyatsiz",
    titleRu: "Автоматическая загрузка не удалась",
    message:
      "We could not reach the NPUU exam server after 3 attempts. " +
      "Your PDF is being downloaded to your computer. Please open the Google Form shown below and upload your PDF to complete your submission." +
      "<span class=\"uz\">NPUU imtihon serveri bilan 3 urinishdan so'ng bog'lanib bo'lmadi. PDF kompyuteringizga yuklanmoqda. Iltimos, quyida ko'rsatilgan Google Formani oching va topshiruvni yakunlash uchun PDF ni yuklang.</span>" +
      '<span class="ru">Не удалось связаться с сервером экзамена NPUU после 3 попыток. PDF загружается на ваш компьютер. Пожалуйста, откройте показанную ниже форму Google Form и загрузите PDF, чтобы завершить отправку.</span>',
    okText: "I understand / Tushundim / Понятно",
  });
}

async function runUploadFlow(pdfResult) {
  if (!window.FBClient || !window.fbDb) {
    // Firebase didn't load at all
    showFallbackBlock("firebase_not_loaded");
    return;
  }

  setUploadStatus(
    "Uploading your exam to the NPUU server…",
    "Imtihoningiz NPUU serveriga yuklanmoqda…",
    "Attempt 1 of 3",
    "⟳",
    true,
    "Загрузка вашего экзамена на сервер NPUU…",
  );

  const onProgress = (evt) => {
    if (evt.phase === "auth") {
      setUploadStatus(
        "Connecting to NPUU server…",
        "NPUU serveriga ulanmoqda…",
        "",
        "⟳",
        true,
        "Подключение к серверу NPUU…",
      );
    } else if (evt.phase === "uploading") {
      setUploadStatus(
        "Uploading your exam to the NPUU server…",
        "Imtihoningiz NPUU serveriga yuklanmoqda…",
        "Attempt " +
          evt.attempt +
          " of 3 · " +
          evt.attempt +
          "-urinish · попытка " +
          evt.attempt,
        "⟳",
        true,
        "Загрузка вашего экзамена на сервер NPUU…",
      );
    } else if (evt.phase === "attempt_failed") {
      if (evt.attempt < 3) {
        const wait = evt.attempt === 1 ? 2 : 4;
        setUploadStatus(
          "Attempt " + evt.attempt + " failed. Retrying in " + wait + "s…",
          evt.attempt +
            "-urinish muvaffaqiyatsiz. " +
            wait +
            " soniyadan keyin qayta urinish…",
          "",
          "⚠",
          false,
          "Попытка " +
            evt.attempt +
            " не удалась. Повтор через " +
            wait +
            " с…",
        );
      }
    } else if (evt.phase === "success") {
      setUploadStatus(
        "Upload complete.",
        "Yuklash yakunlandi.",
        "",
        "✓",
        false,
        "Загрузка завершена.",
      );
    }
  };

  // Include how the submission was triggered so firebase-client can
  // classify it as manual vs auto.
  window._submissionData.submitTrigger = window._submitTrigger || "manual";

  const result = await window.FBClient.uploadSubmission(
    window._submissionData,
    pdfResult.blob,
    onProgress,
  );

  if (
    result &&
    (result.method === "firebase_manual" || result.method === "firebase_auto")
  ) {
    showSuccessBlock();
  } else {
    showFallbackBlock((result && result.reason) || "unknown");
  }
}

// ============================================================
// FEATURE 2: AI Personalized Student Feedback — on-screen render
// ------------------------------------------------------------
// Two helpers used by performSubmit:
//   renderFeedbackPlaceholder() — shows a "generating..." card while
//                                 Gemini is still working.
//   renderFeedbackOnPage(data)  — replaces the placeholder with the
//                                 full localized recommendations.
// Both inject into a #ai-feedback-card element appended after the
// scorecard. The PDF gets the same data via window._submissionData.
// ============================================================

function renderFeedbackPlaceholder() {
  // Find or create the placeholder card
  let card = document.getElementById("ai-feedback-card");
  if (!card) {
    card = document.createElement("div");
    card.id = "ai-feedback-card";
    card.className = "ai-feedback-card";
    // Insert it after the scorecard so it appears below the score
    const scorecard = $("scorecard");
    if (scorecard && scorecard.parentNode) {
      scorecard.parentNode.insertBefore(card, scorecard.nextSibling);
    } else {
      $("report").appendChild(card);
    }
  }
  card.style.display = "block";
  card.innerHTML =
    '<div class="aif-loading">' +
    '<div class="aif-spinner" aria-hidden="true"></div>' +
    '<div class="aif-loading-text">' +
    '<div class="aif-loading-en">Generating your personalized AI feedback…</div>' +
    '<div class="aif-loading-uz uz">Shaxsiy AI fikr-mulohaza yaratilmoqda…</div>' +
    '<div class="aif-loading-ru ru">Создание персонального отзыва ИИ…</div>' +
    "</div>" +
    "</div>";
}

function renderFeedbackOnPage(aiFeedback) {
  let card = document.getElementById("ai-feedback-card");
  if (!card) return; // shouldn't happen
  const en = (aiFeedback && aiFeedback.en) || {
    headline: "",
    recommendations: [],
  };
  const uz = (aiFeedback && aiFeedback.uz) || {
    headline: "",
    recommendations: [],
  };
  const ru = (aiFeedback && aiFeedback.ru) || {
    headline: "",
    recommendations: [],
  };

  // Render up to 4 recommendations (in three languages each)
  const buildRecsHtml = (recs, lang) => {
    return recs
      .map((r) => {
        const topic = escapeHtmlBasic(r.topic || "");
        const advice = escapeHtmlBasic(r.advice || "");
        const resources = escapeHtmlBasic(r.resources || "");
        return (
          '<div class="aif-rec">' +
          '<div class="aif-rec-topic">' +
          topic +
          "</div>" +
          '<div class="aif-rec-advice">' +
          advice +
          "</div>" +
          (resources
            ? '<div class="aif-rec-resources"><span class="aif-rec-resources-label">📚 ' +
              (lang === "uz"
                ? "Resurslar:"
                : lang === "ru"
                  ? "Ресурсы:"
                  : "Resources:") +
              "</span> " +
              resources +
              "</div>"
            : "") +
          "</div>"
        );
      })
      .join("");
  };

  // FIX (May 23): the status badge is now ALWAYS present, indicating
  // whether the feedback was generated by Gemini (success) or by the
  // local offline fallback (e.g. when Gemini was unreachable or quota-
  // exhausted). Two visually distinct states with their own colors so
  // students and instructors can tell at a glance whether the AI was
  // actually used for this submission.
  const isFallback = !!(aiFeedback && aiFeedback.fallback);
  const statusBadge = isFallback
    ? '<div class="aif-status-badge aif-status-fallback" title="Gemini was unavailable — generic offline study tips shown">' +
      '<span class="aif-status-dot"></span>' +
      '<span class="aif-status-text">⚙ Offline fallback</span>' +
      "</div>"
    : '<div class="aif-status-badge aif-status-success" title="Personalized feedback generated by Gemini AI">' +
      '<span class="aif-status-dot"></span>' +
      '<span class="aif-status-text">✨ AI-generated</span>' +
      "</div>";

  // FIX (May 23): wrap the student's name in <b> within the headline.
  // Both Gemini's response and the local fallback templates produce
  // headlines like "Nice effort, Jasurbek. Here are some topics ...".
  // Visually, the name should pop out of the greeting; without bold
  // it reads as a generic sentence.
  //
  // Approach: escape the headline first (so any user-provided content
  // in it is safe), then locate the (also-escaped) name within and
  // wrap that single occurrence in <b>. We only do the first match —
  // the name might legitimately appear later in advice text and we
  // don't want to bold every instance.
  const fullName = (
    (studentInfo && (studentInfo.firstName || "")) +
    " " +
    (studentInfo && (studentInfo.lastName || ""))
  ).trim();
  const escName = escapeHtmlBasic(fullName);
  const boldNameInHeadline = function (rawHeadline) {
    const escHead = escapeHtmlBasic(rawHeadline || "");
    if (!escName) return escHead;
    const idx = escHead.indexOf(escName);
    if (idx < 0) return escHead;
    return (
      escHead.slice(0, idx) +
      "<b>" +
      escName +
      "</b>" +
      escHead.slice(idx + escName.length)
    );
  };

  card.innerHTML =
    '<div class="aif-header">' +
    '<div class="aif-icon" aria-hidden="true">🎓</div>' +
    '<div class="aif-title">' +
    '<div class="aif-title-en">Personalized Study Recommendations</div>' +
    '<div class="aif-title-uz uz">Shaxsiy O\'quv Tavsiyalari</div>' +
    '<div class="aif-title-ru ru">Персональные учебные рекомендации</div>' +
    "</div>" +
    statusBadge +
    "</div>" +
    '<div class="aif-headline aif-headline-en">' +
    boldNameInHeadline(en.headline) +
    "</div>" +
    '<div class="aif-headline aif-headline-uz uz">' +
    boldNameInHeadline(uz.headline) +
    "</div>" +
    '<div class="aif-headline aif-headline-ru ru">' +
    boldNameInHeadline(ru.headline) +
    "</div>" +
    '<div class="aif-recs aif-recs-en">' +
    buildRecsHtml(en.recommendations || [], "en") +
    "</div>" +
    '<div class="aif-recs aif-recs-uz uz">' +
    buildRecsHtml(uz.recommendations || [], "uz") +
    "</div>" +
    '<div class="aif-recs aif-recs-ru ru">' +
    buildRecsHtml(ru.recommendations || [], "ru") +
    "</div>";
}

function escapeHtmlBasic(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderScorecardHtml(timeStr) {
  const photoUrl =
    (window._verificationPhoto && window._verificationPhoto.dataUrl) || null;
  // When the instructor turned the webcam feature OFF for this exam,
  // no verification photo exists by design — show a generic avatar
  // image as the placeholder instead of the "No verification photo"
  // empty state (which would read like an error).
  const webcamOff = webcamFeatureDisabled();
  const avatarBlock = `<div class="sinfo-photo-wrap sinfo-photo-avatar">
         <div class="sinfo-avatar" aria-label="Avatar placeholder">
           <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
             <circle cx="12" cy="8" r="4"/>
             <path d="M4 20c0-3.9 3.6-6.5 8-6.5s8 2.6 8 6.5v1H4v-1z"/>
           </svg>
         </div>
         <div class="sinfo-photo-label">Avatar</div>
       </div>`;
  const photoBlock = webcamOff
    ? avatarBlock
    : photoUrl
      ? `<div class="sinfo-photo-wrap">
         <img class="sinfo-photo" src="${photoUrl}" alt="Verification photo" />
         <div class="sinfo-photo-label">Verification photo</div>
       </div>`
      : `<div class="sinfo-photo-wrap sinfo-photo-empty">
         <div class="sinfo-photo-placeholder">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
             <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
             <circle cx="12" cy="13" r="4"/>
           </svg>
         </div>
         <div class="sinfo-photo-label">No verification photo</div>
       </div>`;
  return `
    <div class="success-check">✓</div>
    <div class="score-eyebrow">Exam Finished<span class="uz"> · Imtihon Tugadi</span><span class="ru"> · Экзамен завершён</span></div>

    <div class="student-info-box student-info-box-2col">
      <div class="sinfo-fields">
        <div class="sinfo-row">
          <div class="sinfo-label">Student Full Name<span class="sinfo-uz uz">Talabaning To'liq Ismi</span><span class="sinfo-ru ru">ФИО студента</span></div>
          <div class="sinfo-value">${studentInfo.firstName} ${studentInfo.lastName}</div>
        </div>
        <div class="sinfo-row">
          <div class="sinfo-label">Student Group<span class="sinfo-uz uz">Talaba Guruhi</span><span class="sinfo-ru ru">Группа студента</span></div>
          <div class="sinfo-value">${studentInfo.group}</div>
        </div>
        <div class="sinfo-row">
          <div class="sinfo-label">Student ID<span class="sinfo-uz uz">Talaba ID</span><span class="sinfo-ru ru">ID студента</span></div>
          <div class="sinfo-value">${studentInfo.id}</div>
        </div>
        <div class="sinfo-row">
          <div class="sinfo-label">Exam Version<span class="sinfo-uz uz">Imtihon Versiyasi</span><span class="sinfo-ru ru">Вариант экзамена</span></div>
          <div class="sinfo-value">Version ${examVersion}</div>
        </div>
      </div>
      ${photoBlock}
    </div>

    <div class="submit-confirm">
      <p class="confirm-main">
        Thank you! You finished the exam.<br>
        <span class="uz">Rahmat! Siz imtihonni tugatdingiz.</span>
        <span class="ru">Спасибо! Вы завершили экзамен.</span>
      </p>
    </div>

    <div class="summary-stats">
      <div class="stat-item">
        <div class="stat-label">Time Used<span class="sinfo-uz uz">Sarflangan Vaqt</span><span class="sinfo-ru ru">Затраченное время</span></div>
        <div class="stat-value">${timeStr}</div>
      </div>
      <div class="stat-item ${tabSwitches > 0 ? "stat-warn" : ""}">
        <div class="stat-label">Tab Switches<span class="sinfo-uz uz">Yorliq Almashish</span><span class="sinfo-ru ru">Смена вкладок</span></div>
        <div class="stat-value">${tabSwitches}</div>
      </div>
    </div>

    <p class="grading-note">
      Your results will be shared by the instructor after grading is complete.<br>
      <span class="uz">Natijalaringiz baholash yakunlangandan so'ng o'qituvchi tomonidan taqdim etiladi.</span>
      <span class="ru">Ваши результаты будут предоставлены преподавателем после завершения проверки.</span>
    </p>
  `;
}

// ---------------- Entry points ----------------
// Wire up on DOM ready for welcome page
document.addEventListener("DOMContentLoaded", () => {
  // Language switcher (works on every page that has a .lang-switcher select)
  wireLangSwitcher();

  // Welcome page (new Sinov AI design — detect by #snCard which is unique to index.html)
  if ($("snCard")) {
    // --- Detect master override from URL ---
    const q = new URLSearchParams(window.location.search);
    const master = q.get("master");
    if (
      master &&
      window.FB &&
      window.FB.MASTER_PASSWORD &&
      master === window.FB.MASTER_PASSWORD
    ) {
      masterOverrideActive = true;
      const banner = $("masterBanner");
      if (banner) banner.style.display = "block";
    }

    // Version card clicks
    document.querySelectorAll(".version-card").forEach((card) => {
      card.addEventListener("click", () => {
        const v = card.dataset.version;
        selectVersion(v);
      });
    });

    // Pre-select from URL
    if (examVersion) selectVersion(examVersion);

    // Input listeners — group gets its own handler because it triggers
    // a Firestore schedule lookup
    const groupEl = $("studentGroup");
    if (groupEl) {
      groupEl.addEventListener("change", () => {
        studentInfo.group = groupEl.value;
        handleGroupChange();
      });
    }
    ["studentId", "studentFirstName", "studentLastName"].forEach((id) => {
      const el = $(id);
      if (el) {
        // Round 5: the allow-list verdict depends on the typed student
        // ID, so the schedule panel has to repaint as they type — not
        // just when the group changes.
        const onEdit = function () {
          validateForm();
          if (id === "studentId") renderSchedulePanel();
        };
        el.addEventListener("input", onEdit);
        el.addEventListener("change", onEdit);
      }
    });

    if ($("startBtn")) $("startBtn").addEventListener("click", startExam);

    // Instructor login button: confirmation modal before navigation
    const instructorBtn = $("instructorLoginBtn");
    if (instructorBtn) {
      instructorBtn.addEventListener("click", async function () {
        const confirmed = await showModal({
          type: "info",
          title: "Instructor Area",
          titleUz: "O'qituvchilar Bo'limi",
          titleRu: "Раздел для преподавателей",
          message:
            "This page is for authorized instructors only. " +
            "If you are an instructor, click <b>I am an Instructor</b> to continue. " +
            "If you are a student, click <b>Go Back</b> to return." +
            "<span class='uz'>Ushbu sahifa faqat vakolatli o'qituvchilar uchun. " +
            "Agar siz o'qituvchi bo'lsangiz, davom etish uchun <b>Men O'qituvchiman</b> tugmasini bosing. " +
            "Agar siz talaba bo'lsangiz, qaytish uchun <b>Ortga</b> tugmasini bosing.</span>" +
            "<span class='ru'>Эта страница только для авторизованных преподавателей. " +
            "Если вы преподаватель, нажмите <b>Я преподаватель</b>, чтобы продолжить. " +
            "Если вы студент, нажмите <b>Назад</b>, чтобы вернуться.</span>",
          okText: "I am an Instructor",
          cancelText: "Go Back",
        });
        if (confirmed) {
          window.location.href = "login.html";
        }
      });
    }

    // ================================================================
    // Sinov AI welcome flow — University → Academic Year → Semester →
    //                         Course → Exam Type selection
    // ----------------------------------------------------------------
    // The exam-format card, student-info form, schedule panel,
    // version cards and start button are all hidden inside #snReveal
    // until the student picks an exam type. If the selected exam
    // tuple is "configured" (an instructor has set it up in the admin
    // dashboard), we show the full form; otherwise we show a friendly
    // "not configured" message.
    //
    // Configuration now lives in Firestore at /exams/{examId} where
    //   examId = `${university}_${course}_${academicYear}_${semester}_${examType}`
    // (e.g. "NPUU_cpp1_2025-2026_spring_final"). The hardcoded
    // EXAM_CONFIGS map that used to live here was a pre-admin-dashboard
    // stand-in and has been removed.
    // ================================================================

    // -- Helpers: current academic year + semester ----------------
    function snCurrentAcademicYear() {
      // Academic year flips on Aug 1.
      // Jan-Jul 2026 → "2025-2026"; Aug-Dec 2026 → "2026-2027".
      const now = new Date();
      const m = now.getMonth(); // 0-indexed
      const y = now.getFullYear();
      if (m >= 7) return y + "-" + (y + 1); // Aug or later
      return y - 1 + "-" + y; // before Aug
    }
    function snCurrentSemester() {
      // Spring = Jan-Jul, Fall = Aug-Dec.
      const m = new Date().getMonth();
      return m >= 7 ? "fall" : "spring";
    }
    function snPopulateAcademicYearDropdown() {
      const sel = $("academicYearSelect");
      if (!sel) return;
      const current = snCurrentAcademicYear();
      // Show current year + previous year only. Three options would be
      // a footgun: students could pick exams that don't exist.
      const prev = (() => {
        const parts = current.split("-").map(Number);
        return parts[0] - 1 + "-" + parts[0];
      })();
      sel.innerHTML = "";
      sel.appendChild(new Option("— Select academic year —", ""));
      const oCurr = new Option(current + " (current)", current);
      sel.appendChild(oCurr);
      sel.appendChild(new Option(prev, prev));
    }
    function snPopulateSemesterDropdown() {
      const sel = $("semesterSelect");
      if (!sel) return;
      const current = snCurrentSemester();
      sel.innerHTML = "";
      sel.appendChild(new Option("— Select semester —", ""));
      sel.appendChild(
        new Option(
          "Spring" + (current === "spring" ? " (current)" : ""),
          "spring",
        ),
      );
      sel.appendChild(
        new Option("Fall" + (current === "fall" ? " (current)" : ""), "fall"),
      );
    }

    // -- Available exams (Round 5, July 2026) --------------------
    //
    // The exam dropdown used to be a hardcoded list of five types, so a
    // student saw "Midterm Exam" whether or not one existed, and any
    // custom type an instructor typed would never appear. Now the list
    // is built from the exams that actually exist and are active.
    //
    // We fetch every active exam once and filter in memory rather than
    // issuing a six-field equality query, which would need a composite
    // index for each combination. The exams collection is small (tens
    // of documents), so this is a single cheap read.
    let _availableExams = null; // array of { id, ...data } once loaded
    let _availableExamsPromise = null;

    function snLoadAvailableExams() {
      if (_availableExamsPromise) return _availableExamsPromise;
      if (!window.fbDb) {
        _availableExams = [];
        _availableExamsPromise = Promise.resolve([]);
        return _availableExamsPromise;
      }
      _availableExamsPromise = window.fbDb
        .collection("exams")
        .where("active", "==", true)
        .get()
        .then(function (snap) {
          const out = [];
          snap.forEach(function (doc) {
            out.push(Object.assign({ _id: doc.id }, doc.data()));
          });
          _availableExams = out;
          return out;
        })
        .catch(function (err) {
          console.warn("[exams] list failed", err);
          _availableExams = [];
          return [];
        });
      return _availableExamsPromise;
    }

    // Exams matching the student's current selections.
    function snMatchingExams() {
      const uni = ($("universitySelect") || {}).value || "";
      const fac = ($("facultySelect") || {}).value || "";
      const year = ($("academicYearSelect") || {}).value || "";
      const sem = ($("semesterSelect") || {}).value || "";
      const course = ($("courseSelect") || {}).value || "";
      if (!uni || !fac || !year || !sem || !course) return [];
      return (_availableExams || []).filter(function (e) {
        return (
          e.university === uni &&
          (e.faculty || "exact-sciences") === fac &&
          e.academicYear === year &&
          e.semester === sem &&
          e.course === course
        );
      });
    }

    // Repaint the exam dropdown with only the exams that exist.
    // Option VALUE is the Firestore document id, so selecting one needs
    // no key reconstruction — this also removes any chance of the
    // student page and the admin page disagreeing about how a free-text
    // exam name maps to a document id.
    function snPopulateExamDropdown() {
      const sel = $("examTypeSelect");
      if (!sel) return;
      const prev = sel.value;
      const matches = snMatchingExams();
      sel.innerHTML = "";
      if (!matches.length) {
        sel.appendChild(new Option("— No exams available —", ""));
        sel.disabled = true;
        snHandleExamTypeChange();
        return;
      }
      sel.appendChild(new Option("— Select your exam —", ""));
      matches
        .slice()
        .sort(function (a, b) {
          return String(a.examType || "").localeCompare(String(b.examType || ""));
        })
        .forEach(function (e) {
          sel.appendChild(new Option(_localExamTypeLabel(e.examType), e._id));
        });
      sel.disabled = false;
      // Preserve the student's choice if it survived the repaint.
      if (prev && matches.some(function (e) { return e._id === prev; })) {
        sel.value = prev;
      } else {
        sel.value = "";
      }
      snHandleExamTypeChange();
    }

    // Look up an already-fetched exam by document id.
    function snExamById(id) {
      if (!id) return null;
      return (
        (_availableExams || []).find(function (e) {
          return e._id === id;
        }) || null
      );
    }

    // -- Firestore lookup ----------------------------------------
    // Returns a Promise that resolves with the exam config object or null.
    // Cached in-memory so repeated dropdown picks don't refetch.
    const _examConfigCache = {};
    function snGetExamConfig(uni, faculty, year, semester, course, examType) {
      if (!uni || !faculty || !year || !semester || !course || !examType) {
        return Promise.resolve(null);
      }
      const key =
        uni +
        "_" +
        faculty +
        "_" +
        course +
        "_" +
        year +
        "_" +
        semester +
        "_" +
        examType;
      if (_examConfigCache[key] !== undefined) {
        return Promise.resolve(_examConfigCache[key]);
      }
      // No firestore? Fall through to null (treats as "not configured").
      if (!window.fbDb) {
        _examConfigCache[key] = null;
        return Promise.resolve(null);
      }
      return window.fbDb
        .collection("exams")
        .doc(key)
        .get()
        .then(function (snap) {
          if (!snap.exists) {
            _examConfigCache[key] = null;
            return null;
          }
          const data = snap.data();
          // Only honor active configs. An inactive exam reads as "not configured"
          // from the student's perspective.
          if (data.active !== true) {
            _examConfigCache[key] = null;
            return null;
          }
          _examConfigCache[key] = data;
          return data;
        })
        .catch(function (err) {
          console.warn("[exam-config] fetch failed", err);
          _examConfigCache[key] = null;
          return null;
        });
    }

    function snHideReveal() {
      const reveal = $("snReveal");
      if (reveal) reveal.hidden = true;
      const fmt = $("snFormat");
      if (fmt) fmt.hidden = true;
      const nc = $("snNotConfigured");
      if (nc) nc.hidden = true;
      const cf = $("snConfigFields");
      if (cf) cf.hidden = true;
    }

    // -- Cascade handlers ----------------------------------------
    function snHandleUniversityChange() {
      const uniSel = $("universitySelect");
      const facSel = $("facultySelect");
      if (!uniSel) return;
      if (uniSel.value) {
        facSel.disabled = false;
      } else {
        facSel.disabled = true;
        facSel.value = "";
      }
      snHandleFacultyChange();
    }

    function snHandleFacultyChange() {
      const facSel = $("facultySelect");
      const yearSel = $("academicYearSelect");
      if (!facSel) return;
      if (facSel.value) {
        yearSel.disabled = false;
      } else {
        yearSel.disabled = true;
        yearSel.value = "";
      }
      snHandleAcademicYearChange();
    }

    function snHandleAcademicYearChange() {
      const facSel = $("facultySelect");
      const yearSel = $("academicYearSelect");
      const semSel = $("semesterSelect");
      if (!yearSel) return;
      if (facSel && facSel.value && yearSel.value) {
        semSel.disabled = false;
      } else {
        semSel.disabled = true;
        semSel.value = "";
      }
      snHandleSemesterChange();
    }

    function snHandleSemesterChange() {
      const yearSel = $("academicYearSelect");
      const semSel = $("semesterSelect");
      const courseSel = $("courseSelect");
      if (!semSel) return;
      if (yearSel && yearSel.value && semSel.value) {
        courseSel.disabled = false;
      } else {
        courseSel.disabled = true;
        courseSel.value = "";
      }
      snHandleCourseChange();
    }

    function snHandleCourseChange() {
      const semSel = $("semesterSelect");
      const courseSel = $("courseSelect");
      const examSel = $("examTypeSelect");
      if (!courseSel) return;
      if (!(semSel && semSel.value && courseSel.value)) {
        examSel.disabled = true;
        examSel.innerHTML = "";
        examSel.appendChild(new Option("— Select your exam —", ""));
        examSel.value = "";
        snHandleExamTypeChange();
        return;
      }
      // Round 5: fill the dropdown from the exams that actually exist
      // for this course/semester rather than a hardcoded list.
      examSel.disabled = true;
      examSel.innerHTML = "";
      examSel.appendChild(new Option("Loading exams…", ""));
      snLoadAvailableExams().then(function () {
        // Bail if the student changed course while we were loading.
        if (courseSel.value !== ($("courseSelect") || {}).value) return;
        snPopulateExamDropdown();
      });
    }

    function snHandleExamTypeChange() {
      const uniSel = $("universitySelect");
      const facSel = $("facultySelect");
      const yearSel = $("academicYearSelect");
      const semSel = $("semesterSelect");
      const courseSel = $("courseSelect");
      const examSel = $("examTypeSelect");
      const reveal = $("snReveal");
      const format = $("snFormat");
      const notConfigured = $("snNotConfigured");
      const configFields = $("snConfigFields");
      if (!examSel || !reveal) return;

      // Round 5: the option value is the exam's Firestore document id.
      const selectedExamId = examSel.value;
      if (!selectedExamId) {
        snHideReveal();
        return;
      }

      // Force a re-trigger of the reveal animation by toggling hidden.
      reveal.hidden = false;
      reveal.style.animation = "none";
      // eslint-disable-next-line no-unused-expressions
      reveal.offsetHeight; // force reflow
      reveal.style.animation = "";

      // Show a brief loading state while we wait for Firestore.
      if (format) format.hidden = true;
      if (configFields) configFields.hidden = true;
      if (notConfigured) notConfigured.hidden = true;

      // The exam document was already fetched by snLoadAvailableExams,
      // so this resolves immediately; snGetExamConfig remains as a
      // fallback for any exam not present in the cached list.
      const _cached = snExamById(selectedExamId);
      const _configPromise = _cached
        ? Promise.resolve(_cached)
        : snGetExamConfig(
            uniSel ? uniSel.value : "",
            facSel ? facSel.value : "",
            yearSel ? yearSel.value : "",
            semSel ? semSel.value : "",
            courseSel ? courseSel.value : "",
            selectedExamId,
          );

      _configPromise.then(function (config) {
        // Make sure the user hasn't changed their selection while we were
        // waiting. If they did, bail — the new handler will paint.
        if (examSel.value !== selectedExamId) return;

        if (config) {
          if (notConfigured) notConfigured.hidden = true;
          if (format) {
            format.hidden = false;
            renderExamFormatBanner(config);
          }
          if (configFields) configFields.hidden = false;
          // Stash on window so the exam page can read it after Start Exam.
          // Add the convenience labels for the PDF header (the PDF code
          // doesn't have access to the dropdown options).
          const enriched = Object.assign({}, config);
          // Map values to display labels for the PDF
          const uniLabels = {
            NPUU: "National Pedagogical University of Uzbekistan (NPUU)",
          };
          const facLabels = {
            "exact-sciences": "School of Exact Sciences",
            "natural-sciences": "Faculty of Natural Sciences",
            "pre-school-education": "Faculty of Pre-School Education",
          };
          // Course labels come from the registry (js/courses.js).
          const courseLabels = {};
          (window.SINOV_COURSES || []).forEach(function (c) {
            courseLabels[c.id] = c.label;
          });
          enriched.universityLabel =
            uniLabels[enriched.university] || enriched.university;
          enriched.facultyLabel =
            facLabels[enriched.faculty] ||
            enriched.facultyLabel ||
            "School of Exact Sciences";
          enriched.courseLabel =
            courseLabels[enriched.course] || enriched.course;
          // Keep the real Firestore document id on the config so
          // schedules, seeds and submissions all reference the exact
          // same exam without rebuilding the composite key.
          enriched.examId = config._id || enriched.examId || null;
          window._sinovActiveExamConfig = enriched;
        } else {
          if (format) format.hidden = true;
          if (configFields) configFields.hidden = true;
          if (notConfigured) notConfigured.hidden = false;
          // Clear any pre-selected version since the form is hidden.
          examVersion = "";
          document.querySelectorAll(".version-card").forEach(function (c) {
            c.classList.remove("selected");
          });
          if ($("startBtn")) $("startBtn").disabled = true;
          window._sinovActiveExamConfig = null;
        }
      });
    }

    // -- Initial population + wiring -----------------------------
    snPopulateAcademicYearDropdown();
    snPopulateSemesterDropdown();

    // Auto-pre-select University (only NPUU for now), then leave the
    // rest as the cascade flow.
    const _autoUni = $("universitySelect");
    if (_autoUni && _autoUni.options.length === 2) {
      // Only one real option besides the placeholder — pre-select it
      // so students don't have to click through an obvious choice.
      _autoUni.value = "NPUU";
    }

    // Wire change handlers
    const _uniSel = $("universitySelect");
    const _facSel = $("facultySelect");
    const _yearSel = $("academicYearSelect");
    const _semSel = $("semesterSelect");
    const _courseSel = $("courseSelect");
    const _examSel = $("examTypeSelect");
    if (_uniSel) _uniSel.addEventListener("change", snHandleUniversityChange);
    if (_facSel) _facSel.addEventListener("change", snHandleFacultyChange);
    if (_yearSel)
      _yearSel.addEventListener("change", snHandleAcademicYearChange);
    if (_semSel) _semSel.addEventListener("change", snHandleSemesterChange);
    if (_courseSel) _courseSel.addEventListener("change", snHandleCourseChange);
    if (_examSel) _examSel.addEventListener("change", snHandleExamTypeChange);

    // Fire the cascade once so the University pre-selection enables Faculty.
    snHandleUniversityChange();

    // Paint initial schedule panel (hidden until group picked, or shows
    // master-override banner state)
    renderSchedulePanel();
  }

  // Exam page
  if ($("test")) {
    initExamPage();
    if ($("submitBtn")) $("submitBtn").addEventListener("click", trySubmit);
  }

  // Modal buttons (both pages)
  if ($("modal-ok"))
    $("modal-ok").addEventListener("click", () => {
      $("modal").classList.remove("show");
      if (_modalResolve) _modalResolve(true);
    });
  if ($("modal-cancel"))
    $("modal-cancel").addEventListener("click", () => {
      $("modal").classList.remove("show");
      if (_modalResolve) _modalResolve(false);
    });
});
