// ===============================================================
// COURSE REGISTRY  (July 2026)
// ---------------------------------------------------------------
// One source of truth for every subject the platform offers.
// Loaded on index.html, exam.html and admin.html BEFORE app.js /
// admin.js, so all three read the same list.
//
// Before this file existed, each new subject had to be added by hand
// in five places (two HTML dropdowns, admin.js EXAM_COURSES, app.js
// _localCourseLabel, analytics.js). They drifted. Now the dropdowns
// populate themselves from this list and every "what shape is this
// course?" question is answered here.
//
// ---------------------------------------------------------------
// HOW TO ADD A NEW SUBJECT
// ---------------------------------------------------------------
// 1. Add one entry to SINOV_COURSES below. That alone puts the
//    course in the student dropdown, the instructor's exam form,
//    the analytics labels and the PDF header.
//
// 2. Pick the right `structure`:
//
//    "mc_coding"  Multiple-choice questions + coding problems.
//                 Uses MC_BANK / MC_BANK_NEW / CODING_BANK.
//                 → Programming 1 with C++
//
//    "mc_only"    Multiple-choice only, no coding part. The exam form
//                 hides the coding inputs; the welcome banner shows
//                 total points where coding problems would go.
//                 → the natural fit for Calculus 1 / Calculus 2 /
//                   Mathematical Analysis 1 / Mathematical Analysis 2 /
//                   Analytical Geometry, if those are pure test exams.
//
//    "sectioned"  Questions grouped into named sections, each with its
//                 own question count and points-per-correct value.
//                 Requires a bank registered in window.ENGLISH_BANK
//                 (or an equivalent, see `bankKey`) plus a `sections`
//                 list. → General English 1 / 2
//
// 3. If the course needs its own question bank, add the bank file and
//    load it in the same three HTML pages next to english-bank.js.
//
// 4. Give the course a `feedback` profile. Without one, the AI study
//    recommendations fall back to generic wording. The profile tells
//    Gemini what subject it is tutoring, which topics are plausible,
//    and which resources are safe to name — before this existed, every
//    student got C++ advice regardless of the exam they sat.
//
// 5. Set `translateQuestions: false` only when translating the
//    questions would give away the answer (i.e. language exams).
//    Everything else should stay `true` so students keep the
//    EN / UZ / RU support they rely on.
//
// EXAMPLE — adding Calculus 1 as a pure multiple-choice subject:
//
//   {
//     id: "calc1",
//     label: "Calculus 1",
//     structure: "mc_only",
//     translateQuestions: true,
//   },
//
// ===============================================================

window.SINOV_COURSES = [
  {
    id: "cpp1",
    label: "Programming 1 with C++",
    structure: "mc_coding",
    translateQuestions: true,
    // Drives the AI study recommendations (see `feedback` note below).
    feedback: {
      subject: {
        en: "C++ programming",
        uz: "C++ dasturlash",
        ru: "программирование на C++",
      },
      tutorRole: "a supportive C++ programming tutor",
      topicHint:
        "pointers, memory, loops, operator precedence, type conversion, scope, functions, arrays",
      resourceHint: "cppreference.com, learncpp.com",
      fallbackTopic: {
        en: "C++ Fundamentals",
        uz: "C++ asoslari",
        ru: "Основы C++",
      },
      fallbackResources: {
        en: "cppreference.com, ask your instructor",
        uz: "cppreference.com, o'qituvchidan so'rang",
        ru: "cppreference.com, обратитесь к преподавателю",
      },
    },
  },
  {
    id: "geneng1",
    label: "General English 1",
    structure: "sectioned",
    translateQuestions: false, // language exam — see english-bank.js
    bankKey: "geneng1",
    feedback: {
      subject: {
        en: "English language",
        uz: "ingliz tili",
        ru: "английский язык",
      },
      tutorRole: "a supportive English language teacher",
      topicHint:
        "verb tenses, auxiliary verbs, present continuous vs present simple, reading comprehension, vocabulary in context, collocations",
      resourceHint:
        "your course book, Cambridge English grammar references, your instructor",
      fallbackTopic: {
        en: "English Grammar and Vocabulary",
        uz: "Ingliz tili grammatikasi va lug'ati",
        ru: "Грамматика и лексика английского языка",
      },
      fallbackResources: {
        en: "your course book, ask your instructor",
        uz: "darsligingiz, o'qituvchidan so'rang",
        ru: "ваш учебник, обратитесь к преподавателю",
      },
    },

    sections: [
      { key: "reading", label: "Reading" },
      { key: "grammar", label: "Grammar" },
      { key: "vocabulary", label: "Vocabulary" },
    ],
  },
  {
    id: "geneng2",
    label: "General English 2",
    structure: "sectioned",
    translateQuestions: false,
    bankKey: "geneng2",
    feedback: {
      subject: {
        en: "English language",
        uz: "ingliz tili",
        ru: "английский язык",
      },
      tutorRole: "a supportive English language teacher",
      topicHint:
        "verb tenses, auxiliary verbs, present continuous vs present simple, reading comprehension, vocabulary in context, collocations",
      resourceHint:
        "your course book, Cambridge English grammar references, your instructor",
      fallbackTopic: {
        en: "English Grammar and Vocabulary",
        uz: "Ingliz tili grammatikasi va lug'ati",
        ru: "Грамматика и лексика английского языка",
      },
      fallbackResources: {
        en: "your course book, ask your instructor",
        uz: "darsligingiz, o'qituvchidan so'rang",
        ru: "ваш учебник, обратитесь к преподавателю",
      },
    },

    sections: [
      { key: "reading", label: "Reading" },
      { key: "grammar", label: "Grammar" },
      { key: "vocabulary", label: "Vocabulary" },
    ],
  },

  // ---------------------------------------------------------------
  // Mathematics (July 2026)
  // ---------------------------------------------------------------
  // Calculus 1 and Mathematical Analysis 1 deliberately SHARE the
  // `calculus1` bank; Calculus 2 and Mathematical Analysis 2 share
  // `calculus2`. That is why banks are keyed by bank name rather than
  // by course id — see js/questions/math-bank.js.
  {
    id: "calc1",
    label: "Calculus 1",
    structure: "mc_only",
    translateQuestions: true,
    bankKey: "calculus1",
    feedback: {
      subject: { en: "calculus (limits and derivatives)", uz: "matematik analiz (limitlar va hosilalar)", ru: "математический анализ (пределы и производные)" },
      tutorRole: "a supportive university calculus tutor",
      topicHint: "sets and number systems, limits of sequences and functions, indeterminate forms and L'Hopital's rule, differentiation rules, the chain rule, higher-order derivatives",
      resourceHint: "your lecture notes, Paul's Online Math Notes, Khan Academy",
      fallbackTopic: { en: "Limits and Derivatives", uz: "Limitlar va hosilalar", ru: "Пределы и производные" },
      fallbackResources: {
        en: "your lecture notes, ask your instructor",
        uz: "ma'ruza qaydlaringiz, o'qituvchidan so'rang",
        ru: "ваши лекционные записи, обратитесь к преподавателю",
      },
    },
  },
  {
    id: "mathan1",
    label: "Mathematical Analysis 1",
    structure: "mc_only",
    translateQuestions: true,
    bankKey: "calculus1", // same bank as Calculus 1, by design
    feedback: {
      subject: { en: "calculus (limits and derivatives)", uz: "matematik analiz (limitlar va hosilalar)", ru: "математический анализ (пределы и производные)" },
      tutorRole: "a supportive university calculus tutor",
      topicHint: "sets and number systems, limits of sequences and functions, indeterminate forms and L'Hopital's rule, differentiation rules, the chain rule, higher-order derivatives",
      resourceHint: "your lecture notes, Paul's Online Math Notes, Khan Academy",
      fallbackTopic: { en: "Limits and Derivatives", uz: "Limitlar va hosilalar", ru: "Пределы и производные" },
      fallbackResources: {
        en: "your lecture notes, ask your instructor",
        uz: "ma'ruza qaydlaringiz, o'qituvchidan so'rang",
        ru: "ваши лекционные записи, обратитесь к преподавателю",
      },
    },
  },
  {
    id: "calc2",
    label: "Calculus 2",
    structure: "mc_only",
    translateQuestions: true,
    bankKey: "calculus2",
    feedback: {
      subject: { en: "calculus (integration and series)", uz: "matematik analiz (integrallar va qatorlar)", ru: "математический анализ (интегралы и ряды)" },
      tutorRole: "a supportive university calculus tutor",
      topicHint: "antiderivatives, indefinite and definite integrals, integration by parts, integrals of rational functions, convergence of series, geometric and harmonic series, the p-series test",
      resourceHint: "your lecture notes, Paul's Online Math Notes, Khan Academy",
      fallbackTopic: { en: "Integration and Series", uz: "Integrallar va qatorlar", ru: "Интегралы и ряды" },
      fallbackResources: {
        en: "your lecture notes, ask your instructor",
        uz: "ma'ruza qaydlaringiz, o'qituvchidan so'rang",
        ru: "ваши лекционные записи, обратитесь к преподавателю",
      },
    },
  },
  {
    id: "mathan2",
    label: "Mathematical Analysis 2",
    structure: "mc_only",
    translateQuestions: true,
    bankKey: "calculus2", // same bank as Calculus 2, by design
    feedback: {
      subject: { en: "calculus (integration and series)", uz: "matematik analiz (integrallar va qatorlar)", ru: "математический анализ (интегралы и ряды)" },
      tutorRole: "a supportive university calculus tutor",
      topicHint: "antiderivatives, indefinite and definite integrals, integration by parts, integrals of rational functions, convergence of series, geometric and harmonic series, the p-series test",
      resourceHint: "your lecture notes, Paul's Online Math Notes, Khan Academy",
      fallbackTopic: { en: "Integration and Series", uz: "Integrallar va qatorlar", ru: "Интегралы и ряды" },
      fallbackResources: {
        en: "your lecture notes, ask your instructor",
        uz: "ma'ruza qaydlaringiz, o'qituvchidan so'rang",
        ru: "ваши лекционные записи, обратитесь к преподавателю",
      },
    },
  },
  {
    id: "anageo",
    label: "Analytical Geometry",
    structure: "mc_only",
    translateQuestions: true,
    bankKey: "analytic_geometry",
    feedback: {
      subject: {
        en: "analytic geometry",
        uz: "analitik geometriya",
        ru: "аналитическая геометрия",
      },
      tutorRole: "a supportive university analytic geometry tutor",
      topicHint:
        "vectors and their dot and cross products, collinearity and orthogonality conditions, equations of lines and planes in space, distance from a point to a line, conic sections (ellipse, hyperbola), polar coordinates",
      resourceHint: "your lecture notes, Khan Academy, Paul's Online Math Notes",
      fallbackTopic: {
        en: "Vectors, Lines and Conic Sections",
        uz: "Vektorlar, to'g'ri chiziqlar va konus kesimlari",
        ru: "Векторы, прямые и конические сечения",
      },
      fallbackResources: {
        en: "your lecture notes, ask your instructor",
        uz: "ma'ruza qaydlaringiz, o'qituvchidan so'rang",
        ru: "ваши лекционные записи, обратитесь к преподавателю",
      },
    },
  },

  // ---------------------------------------------------------------
  // Planned subjects — uncomment and add a question bank when ready.
  // No other file needs to change.
  // ---------------------------------------------------------------
];

// ---------------------------------------------------------------
// Lookup helpers.
//
// NOTE ON NAMING: every helper is `sn`-prefixed. app.js is NOT wrapped
// in an IIFE, so any top-level `function foo()` it declares becomes
// `window.foo` and silently overwrites a same-named global defined
// here. That exact collision caused an infinite-recursion crash in the
// first Round 3 build (a helper's "delegate to the global if it
// exists" guard found itself). The prefix keeps these names out of
// app.js's way — do not remove it.
// ---------------------------------------------------------------

window.snCourseDef = function (id) {
  const list = window.SINOV_COURSES || [];
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
};

window.snCourseLabel = function (id) {
  const def = window.snCourseDef(id);
  return def ? def.label : id || "Course";
};

window.snCourseIds = function () {
  return (window.SINOV_COURSES || []).map(function (c) {
    return c.id;
  });
};

// True for section-structured courses (General English today).
window.snCourseIsSectioned = function (id) {
  const def = window.snCourseDef(id);
  return !!def && def.structure === "sectioned";
};

// True when this course's exams include a coding part.
window.snCourseHasCoding = function (id) {
  const def = window.snCourseDef(id);
  // Unknown courses default to the historical behaviour (coding on),
  // so a legacy exam doc with an unrecognised course code still works.
  return !def || def.structure === "mc_coding";
};

// False only for language exams, whose questions must stay in English.
window.snCourseTranslatesQuestions = function (id) {
  const def = window.snCourseDef(id);
  return !def || def.translateQuestions !== false;
};

// Which question bank a course draws from, or null. Several courses
// may return the SAME key — that is how Calculus 1 and Mathematical
// Analysis 1 share one bank.
window.snCourseBankKey = function (id) {
  const def = window.snCourseDef(id);
  return def && def.bankKey ? def.bankKey : null;
};

// AI-feedback profile for a course, or null. Consumed by
// js/ai-feedback.js (which forwards it to the serverless function) and
// by api/feedback-generate.js (which builds the Gemini prompt from it).
window.snCourseFeedbackProfile = function (id) {
  const def = window.snCourseDef(id);
  return def && def.feedback ? def.feedback : null;
};

// Section definitions for a sectioned course; [] for anything else.
window.snCourseSections = function (id) {
  const def = window.snCourseDef(id);
  return def && Array.isArray(def.sections) ? def.sections : [];
};

// ---------------------------------------------------------------
// Point arithmetic shared by the student welcome banner, the exam
// header and the instructor dashboard, so all three always agree on
// what an exam is worth.
// ---------------------------------------------------------------

function _snRound2(n) {
  if (typeof n !== "number" || !isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

// Total MC/test points for an exam config.
window.snExamMcPoints = function (cfg) {
  if (!cfg) return 0;
  if (window.snCourseIsSectioned(cfg.course) && cfg.sections) {
    let sum = 0;
    window.snCourseSections(cfg.course).forEach(function (sec) {
      const conf = cfg.sections[sec.key];
      if (conf && conf.count > 0) sum += conf.count * (conf.pointsPerCorrect || 0);
    });
    return _snRound2(sum);
  }
  const per =
    typeof cfg.pointsPerCorrectMc === "number" && cfg.pointsPerCorrectMc > 0
      ? cfg.pointsPerCorrectMc
      : 2;
  return _snRound2((cfg.mcCount || 0) * per);
};

// Total coding points for an exam config.
window.snExamCodingPoints = function (cfg) {
  if (!cfg || !Array.isArray(cfg.codingMaxPoints)) return 0;
  return _snRound2(
    cfg.codingMaxPoints.reduce(function (s, n) {
      return s + (typeof n === "number" ? n : 0);
    }, 0),
  );
};

// Grand total an exam is worth.
window.snExamTotalPoints = function (cfg) {
  return _snRound2(window.snExamMcPoints(cfg) + window.snExamCodingPoints(cfg));
};

// How many test questions an exam asks. For a sectioned exam this is
// the sum of the section counts rather than the stored mcCount, so a
// hand-edited or half-migrated doc still reports honestly.
window.snExamQuestionCount = function (cfg) {
  if (!cfg) return 0;
  if (window.snCourseIsSectioned(cfg.course) && cfg.sections) {
    let n = 0;
    window.snCourseSections(cfg.course).forEach(function (sec) {
      const conf = cfg.sections[sec.key];
      if (conf && conf.count > 0) n += conf.count;
    });
    return n;
  }
  return cfg.mcCount || 0;
};

// A short human description of an exam's composition, e.g.
//   "Reading 10, Grammar 10, Vocabulary 10"
//   "30 test questions and 4 coding problems"
// Used in the instructor's refresh-questions confirmation.
window.snExamCompositionText = function (cfg) {
  if (!cfg) return "the exam questions";
  if (window.snCourseIsSectioned(cfg.course) && cfg.sections) {
    const parts = [];
    window.snCourseSections(cfg.course).forEach(function (sec) {
      const conf = cfg.sections[sec.key];
      if (conf && conf.count > 0) parts.push(sec.label + " " + conf.count);
    });
    if (parts.length) return parts.join(", ");
  }
  const q = window.snExamQuestionCount(cfg);
  const c = cfg.codingCount || 0;
  const qTxt = q + " test question" + (q === 1 ? "" : "s");
  if (c > 0) return qTxt + " and " + c + " coding problem" + (c === 1 ? "" : "s");
  return qTxt;
};

// ---------------------------------------------------------------
// Dropdown population.
// Any <select data-sn-course-select> is filled from the registry on
// DOM ready. Adding a subject above therefore updates the student
// welcome page and the instructor exam form at once, with no HTML
// edit. A placeholder <option value=""> already in the markup is
// preserved as the first entry.
// ---------------------------------------------------------------
window.snPopulateCourseSelects = function (root) {
  const scope = root || document;
  const selects = scope.querySelectorAll("select[data-sn-course-select]");
  selects.forEach(function (sel) {
    const previous = sel.value;
    const placeholder = sel.querySelector('option[value=""]');
    sel.innerHTML = "";
    if (placeholder) sel.appendChild(placeholder);
    (window.SINOV_COURSES || []).forEach(function (c) {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.label;
      sel.appendChild(o);
    });
    // Restore the previous selection when it still exists.
    if (previous && window.snCourseDef(previous)) sel.value = previous;
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    window.snPopulateCourseSelects();
  });
} else {
  window.snPopulateCourseSelects();
}
