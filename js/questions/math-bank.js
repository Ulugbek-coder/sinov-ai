// ===============================================================
// MATHEMATICS QUESTION BANKS (July 2026)
// ---------------------------------------------------------------
// Banks keyed by BANK NAME, not by course, because several courses
// deliberately share one bank:
//
//   calculus1          → Calculus 1  AND  Mathematical Analysis 1
//   calculus2          → Calculus 2  AND  Mathematical Analysis 2
//   analytic_geometry  → Analytical Geometry
//
// The course→bank mapping lives in js/courses.js (`bankKey`).
//
// ---------------------------------------------------------------
// SOURCE AND ANSWER KEYS
// ---------------------------------------------------------------
// Calculus 1 / Calculus 2 come from the instructor-supplied PDFs, in
// which every correct answer is marked `*A.`. That was verified
// programmatically across all 50 questions — the starred letter is
// "A" in 25/25 cases for each file, with no exceptions.
//
// Every one of the 50 was then re-verified mathematically (each limit
// evaluated, each derivative and integral taken, each series test
// applied). No discrepancy was found: the printed key is correct
// throughout.
//
// ---------------------------------------------------------------
// WHY `correct: 0` EVERYWHERE
// ---------------------------------------------------------------
// The source lists the correct answer first in all cases. Storing it
// at index 0 keeps the bank verifiable against the paper at a glance.
// Students never see this order: buildBalancedOptionOrders() in
// app.js redistributes correct answers evenly across positions A–D
// per exam version, so a student cannot profit from "always pick A".
// Position balance is asserted in the bank's self-test.
//
// ---------------------------------------------------------------
// TRILINGUAL BY DESIGN
// ---------------------------------------------------------------
// These are NOT language exams, so questions are translated into
// Uzbek and Russian exactly like Programming 1 with C++. Students can
// toggle EN/UZ/RU on the exam page.
//
// To keep the file readable and reduce transcription risk, an option
// may be written as a bare STRING when it is language-neutral (a
// number, or a formula like "x^3/3 + C"). The normalizer at the
// bottom expands those to {en,uz,ru} with the same text. Only options
// containing real prose carry per-language values.
// ===============================================================

window.SUBJECT_BANKS = window.SUBJECT_BANKS || {};

// ---------------------------------------------------------------
// CALCULUS 1  (also used by Mathematical Analysis 1)
// Sets and number systems · limits · derivatives
// ---------------------------------------------------------------
window.SUBJECT_BANKS.calculus1 = [
  {
    en: "Which symbol denotes the set of integers?",
    uz: "Butun sonlar to'plami qaysi belgi bilan belgilanadi?",
    ru: "Каким символом обозначается множество целых чисел?",
    opts: ["Z", "N", "Q", "R"],
    correct: 0,
  },
  {
    en: "Find lim<sub>n→∞</sub> (3n + 1) / (n + 2).",
    uz: "lim<sub>n→∞</sub> (3n + 1) / (n + 2) limitni toping.",
    ru: "Найдите lim<sub>n→∞</sub> (3n + 1) / (n + 2).",
    opts: ["3", "1", "0", "∞"],
    correct: 0,
  },
  {
    en: "Which of the following is a real number?",
    uz: "Quyidagilardan qaysi biri haqiqiy son?",
    ru: "Какое из следующих чисел является действительным?",
    opts: ["√2", "i", "√−4", "2 + i"],
    correct: 0,
  },
  {
    en: "What does ℝ denote?",
    uz: "ℝ nimani bildiradi?",
    ru: "Что обозначает ℝ?",
    opts: [
      {
        en: "The set of real numbers",
        uz: "Haqiqiy sonlar to'plami",
        ru: "Множество действительных чисел",
      },
      {
        en: "Rational numbers",
        uz: "Ratsional sonlar",
        ru: "Рациональные числа",
      },
      {
        en: "Natural numbers",
        uz: "Natural sonlar",
        ru: "Натуральные числа",
      },
      {
        en: "Complex numbers",
        uz: "Kompleks sonlar",
        ru: "Комплексные числа",
      },
    ],
    correct: 0,
  },
  {
    en: "If A = {1, 2} and B = {2, 3}, then A ∩ B = ?",
    uz: "A = {1, 2} va B = {2, 3} bo'lsa, A ∩ B = ?",
    ru: "Если A = {1, 2} и B = {2, 3}, то A ∩ B = ?",
    opts: ["{2}", "{1, 2, 3}", "{1}", "∅"],
    correct: 0,
  },
  {
    en: "Find lim<sub>x→1</sub> (x² − 1) / (x − 1).",
    uz: "lim<sub>x→1</sub> (x² − 1) / (x − 1) limitni toping.",
    ru: "Найдите lim<sub>x→1</sub> (x² − 1) / (x − 1).",
    opts: ["2", "1", "0", "−2"],
    correct: 0,
  },
  {
    en: "The limit of 1/n as n → ∞ equals?",
    uz: "n → ∞ da 1/n ning limiti nimaga teng?",
    ru: "Чему равен предел 1/n при n → ∞?",
    opts: ["0", "1", "∞", "−1"],
    correct: 0,
  },
  {
    en: "Find lim<sub>x→2</sub> (x + 3).",
    uz: "lim<sub>x→2</sub> (x + 3) limitni toping.",
    ru: "Найдите lim<sub>x→2</sub> (x + 3).",
    opts: ["5", "2", "3", "6"],
    correct: 0,
  },
  {
    en: "Find lim<sub>x→3</sub> x².",
    uz: "lim<sub>x→3</sub> x² limitni toping.",
    ru: "Найдите lim<sub>x→3</sub> x².",
    opts: ["9", "6", "3", "12"],
    correct: 0,
  },
  {
    en: "Find lim<sub>x→4</sub> √x.",
    uz: "lim<sub>x→4</sub> √x limitni toping.",
    ru: "Найдите lim<sub>x→4</sub> √x.",
    opts: ["2", "4", "8", "1"],
    correct: 0,
  },
  {
    en: "If f(x) = x³, then f′(x) = ?",
    uz: "f(x) = x³ bo'lsa, f′(x) = ?",
    ru: "Если f(x) = x³, то f′(x) = ?",
    opts: ["3x²", "2x", "x²", "3x"],
    correct: 0,
  },
  {
    en: "Find d/dx (5x − 7).",
    uz: "d/dx (5x − 7) ni toping.",
    ru: "Найдите d/dx (5x − 7).",
    opts: ["5", "7", "5x", "1"],
    correct: 0,
  },
  {
    en: "The derivative of sin x is?",
    uz: "sin x ning hosilasi nimaga teng?",
    ru: "Чему равна производная sin x?",
    opts: ["cos x", "− cos x", "sin x", "− sin x"],
    correct: 0,
  },
  {
    en: "The derivative of e<sup>x</sup> is?",
    uz: "e<sup>x</sup> ning hosilasi nimaga teng?",
    ru: "Чему равна производная e<sup>x</sup>?",
    opts: ["e<sup>x</sup>", "xe<sup>x</sup>", "1", "ln x"],
    correct: 0,
  },
  {
    en: "If f(x) = (x² + 1)³, find f′(x) using the chain rule.",
    uz: "f(x) = (x² + 1)³ bo'lsa, zanjir qoidasiga ko'ra f′(x) = ?",
    ru: "Если f(x) = (x² + 1)³, найдите f′(x) по правилу цепочки.",
    opts: [
      "6x(x² + 1)²",
      "3(x² + 1)²",
      "2x(x² + 1)³",
      "6(x² + 1)",
    ],
    correct: 0,
  },
  {
    en: "If f(x) = x⁴, then f″(x) = ?",
    uz: "f(x) = x⁴ bo'lsa, f″(x) = ?",
    ru: "Если f(x) = x⁴, то f″(x) = ?",
    opts: ["12x²", "4x³", "8x", "24x"],
    correct: 0,
  },
  {
    en: "Find d/dx (x⁵).",
    uz: "d/dx (x⁵) ni toping.",
    ru: "Найдите d/dx (x⁵).",
    opts: ["5x⁴", "4x⁵", "5x", "x⁴"],
    correct: 0,
  },
  {
    en: "Find d/dx (cos x).",
    uz: "d/dx (cos x) ni toping.",
    ru: "Найдите d/dx (cos x).",
    opts: ["− sin x", "sin x", "cos x", "− cos x"],
    correct: 0,
  },
  {
    en: "L'Hôpital's rule is mainly used for which indeterminate form?",
    uz: "Lopital qoidasi asosan qaysi noaniq ko'rinish uchun qo'llaniladi?",
    ru: "Для какой неопределённости в основном применяется правило Лопиталя?",
    opts: ["0/0", "1/2", "3/5", "1/1"],
    correct: 0,
  },
  {
    en: "Evaluate lim<sub>x→0</sub> (sin x) / x.",
    uz: "lim<sub>x→0</sub> (sin x) / x limitni hisoblang.",
    ru: "Вычислите lim<sub>x→0</sub> (sin x) / x.",
    opts: ["1", "0", "∞", "−1"],
    correct: 0,
  },
  {
    en: "Find lim<sub>x→2</sub> (3x − 1).",
    uz: "lim<sub>x→2</sub> (3x − 1) limitni toping.",
    ru: "Найдите lim<sub>x→2</sub> (3x − 1).",
    opts: ["5", "6", "3", "2"],
    correct: 0,
  },
  {
    en: "Find lim<sub>n→∞</sub> 5/n.",
    uz: "lim<sub>n→∞</sub> 5/n limitni toping.",
    ru: "Найдите lim<sub>n→∞</sub> 5/n.",
    opts: ["0", "5", "1", "∞"],
    correct: 0,
  },
  {
    en: "Evaluate lim<sub>x→0</sub> (2x + 5).",
    uz: "lim<sub>x→0</sub> (2x + 5) limitni hisoblang.",
    ru: "Вычислите lim<sub>x→0</sub> (2x + 5).",
    opts: ["5", "2", "0", "10"],
    correct: 0,
  },
  {
    en: "If f(x) = ln x, then f′(x) = ?",
    uz: "f(x) = ln x bo'lsa, f′(x) = ?",
    ru: "Если f(x) = ln x, то f′(x) = ?",
    opts: ["1/x", "ln x", "x", "e<sup>x</sup>"],
    correct: 0,
  },
  {
    en: "If f(x) = x² + 4x + 1, find f′(2).",
    uz: "f(x) = x² + 4x + 1 bo'lsa, f′(2) ni toping.",
    ru: "Если f(x) = x² + 4x + 1, найдите f′(2).",
    opts: ["8", "9", "6", "4"],
    correct: 0,
  },
];

// ---------------------------------------------------------------
// CALCULUS 2  (also used by Mathematical Analysis 2)
// Antiderivatives · integration techniques · series
// ---------------------------------------------------------------
window.SUBJECT_BANKS.calculus2 = [
  {
    en: "What is an antiderivative?",
    uz: "Boshlang'ich funksiya nima?",
    ru: "Что такое первообразная?",
    opts: [
      {
        en: "A function whose derivative equals the given function",
        uz: "Hosilasi berilgan funksiyaga teng bo'lgan funksiya",
        ru: "Функция, производная которой равна данной функции",
      },
      {
        en: "The limit of the function",
        uz: "Funksiyaning limiti",
        ru: "Предел функции",
      },
      {
        en: "The range of the function",
        uz: "Funksiyaning qiymatlar to'plami",
        ru: "Множество значений функции",
      },
      {
        en: "A discontinuous function",
        uz: "Uzluksiz bo'lmagan funksiya",
        ru: "Разрывная функция",
      },
    ],
    correct: 0,
  },
  {
    en: "Find ∫ x² dx.",
    uz: "∫ x² dx ni toping.",
    ru: "Найдите ∫ x² dx.",
    opts: ["x³/3 + C", "2x + C", "x² + C", "x²/2 + C"],
    correct: 0,
  },
  {
    en: "Find ∫ 1 dx.",
    uz: "∫ 1 dx ni toping.",
    ru: "Найдите ∫ 1 dx.",
    opts: ["x + C", "1 + C", "0", "x² + C"],
    correct: 0,
  },
  {
    en: "Find ∫ cos x dx.",
    uz: "∫ cos x dx ni toping.",
    ru: "Найдите ∫ cos x dx.",
    opts: ["sin x + C", "− sin x + C", "cos x + C", "x cos x + C"],
    correct: 0,
  },
  {
    en: "Find ∫ e<sup>x</sup> dx.",
    uz: "∫ e<sup>x</sup> dx ni toping.",
    ru: "Найдите ∫ e<sup>x</sup> dx.",
    opts: [
      "e<sup>x</sup> + C",
      "xe<sup>x</sup> + C",
      "ln x + C",
      "x² + C",
    ],
    correct: 0,
  },
  {
    en: "What does C represent in an indefinite integral?",
    uz: "Aniqmas integralda C nimani bildiradi?",
    ru: "Что обозначает C в неопределённом интеграле?",
    opts: [
      {
        en: "An arbitrary constant",
        uz: "Ixtiyoriy o'zgarmas son",
        ru: "Произвольную постоянную",
      },
      {
        en: "The maximum value of the function",
        uz: "Funksiyaning maksimum qiymati",
        ru: "Максимальное значение функции",
      },
      {
        en: "The limit of integration",
        uz: "Integral chegarasi",
        ru: "Предел интегрирования",
      },
      { en: "The derivative", uz: "Hosila", ru: "Производную" },
    ],
    correct: 0,
  },
  {
    en: "Find ∫ 5x⁴ dx.",
    uz: "∫ 5x⁴ dx ni toping.",
    ru: "Найдите ∫ 5x⁴ dx.",
    opts: ["x⁵ + C", "5x⁵ + C", "4x³ + C", "x⁴ + C"],
    correct: 0,
  },
  {
    en: "Which is the integration by parts formula?",
    uz: "Bo'laklab integrallash formulasi qaysi?",
    ru: "Какая формула является формулой интегрирования по частям?",
    opts: [
      "∫ u dv = uv − ∫ v du",
      "∫ u dv = u + v",
      "∫ u dv = uv",
      "∫ u dv = u/v",
    ],
    correct: 0,
  },
  {
    en: "Find ∫ (1/x) dx.",
    uz: "∫ (1/x) dx ni toping.",
    ru: "Найдите ∫ (1/x) dx.",
    opts: ["ln |x| + C", "x²/2 + C", "x + C", "e<sup>x</sup> + C"],
    correct: 0,
  },
  {
    en: "Find ∫ 2x dx.",
    uz: "∫ 2x dx ni toping.",
    ru: "Найдите ∫ 2x dx.",
    opts: ["x² + C", "2x² + C", "x + C", "2 + C"],
    correct: 0,
  },
  {
    en: "Find ∫ 1/(x + 1) dx.",
    uz: "∫ 1/(x + 1) dx ni toping.",
    ru: "Найдите ∫ 1/(x + 1) dx.",
    opts: [
      "ln |x + 1| + C",
      "x + 1 + C",
      "1/(x + 1) + C",
      "e<sup>x+1</sup> + C",
    ],
    correct: 0,
  },
  {
    en: "Find ∫ (x + 1)² dx.",
    uz: "∫ (x + 1)² dx ni toping.",
    ru: "Найдите ∫ (x + 1)² dx.",
    opts: [
      "(x + 1)³/3 + C",
      "(x + 1)² + C",
      "2(x + 1) + C",
      "x³/3 + C",
    ],
    correct: 0,
  },
  {
    en: "What is a rational function?",
    uz: "Ratsional funksiya nima?",
    ru: "Что такое рациональная функция?",
    opts: [
      {
        en: "A function formed as the ratio of two polynomials",
        uz: "Ikki ko'phadning nisbatidan tuzilgan funksiya",
        ru: "Функция, составленная как отношение двух многочленов",
      },
      {
        en: "Only a trigonometric function",
        uz: "Faqat trigonometrik funksiya",
        ru: "Только тригонометрическая функция",
      },
      {
        en: "Only an exponential function",
        uz: "Faqat eksponent funksiya",
        ru: "Только показательная функция",
      },
      {
        en: "A constant function",
        uz: "Doimiy funksiya",
        ru: "Постоянная функция",
      },
    ],
    correct: 0,
  },
  {
    en: "Find ∫ 1/x² dx.",
    uz: "∫ 1/x² dx ni toping.",
    ru: "Найдите ∫ 1/x² dx.",
    opts: ["−1/x + C", "1/x + C", "x² + C", "ln x + C"],
    correct: 0,
  },
  {
    en: "Find ∫ sin x dx.",
    uz: "∫ sin x dx ni toping.",
    ru: "Найдите ∫ sin x dx.",
    opts: ["− cos x + C", "cos x + C", "sin x + C", "x sin x + C"],
    correct: 0,
  },
  {
    en: "What does a definite integral give?",
    uz: "Aniq integralning natijasi nimani beradi?",
    ru: "Что даёт определённый интеграл?",
    opts: [
      { en: "A numerical value", uz: "Sonli qiymat", ru: "Числовое значение" },
      {
        en: "Always a function",
        uz: "Har doim funksiya",
        ru: "Всегда функцию",
      },
      { en: "A derivative", uz: "Hosila", ru: "Производную" },
      { en: "A limit", uz: "Limit", ru: "Предел" },
    ],
    correct: 0,
  },
  {
    en: "Find ∫<sub>0</sub><sup>1</sup> x dx.",
    uz: "∫<sub>0</sub><sup>1</sup> x dx ni toping.",
    ru: "Найдите ∫<sub>0</sub><sup>1</sup> x dx.",
    opts: ["1/2", "1", "0", "2"],
    correct: 0,
  },
  {
    en: "If two series converge, what about their sum?",
    uz: "Agar ikki qator yaqinlashuvchi bo'lsa, ularning yig'indisi qanday bo'ladi?",
    ru: "Если два ряда сходятся, что можно сказать об их сумме?",
    opts: [
      { en: "It converges", uz: "Yaqinlashuvchi bo'ladi", ru: "Она сходится" },
      {
        en: "It always diverges",
        uz: "Doim uzoqlashadi",
        ru: "Она всегда расходится",
      },
      {
        en: "It is always zero",
        uz: "Har doim nol bo'ladi",
        ru: "Она всегда равна нулю",
      },
      {
        en: "It cannot be determined",
        uz: "Aniqlanmaydi",
        ru: "Определить невозможно",
      },
    ],
    correct: 0,
  },
  {
    en: "What is the general form of a geometric series?",
    uz: "Geometrik progressiyaning umumiy ko'rinishi qaysi?",
    ru: "Каков общий вид геометрического ряда?",
    opts: [
      "Σ<sub>n=0</sub><sup>∞</sup> ar<sup>n</sup>",
      "Σ<sub>n=1</sub><sup>∞</sup> n",
      "Σ<sub>n=1</sub><sup>∞</sup> 1/n",
      "Σ<sub>n=1</sub><sup>∞</sup> n²",
    ],
    correct: 0,
  },
  {
    en: "When does a geometric series converge?",
    uz: "Geometrik qator qachon yaqinlashadi?",
    ru: "Когда геометрический ряд сходится?",
    opts: [
      { en: "When |r| < 1", uz: "|r| < 1 bo'lsa", ru: "Когда |r| < 1" },
      { en: "When r > 1", uz: "r > 1 bo'lsa", ru: "Когда r > 1" },
      { en: "When r = 2", uz: "r = 2 bo'lsa", ru: "Когда r = 2" },
      { en: "Always", uz: "Har doim", ru: "Всегда" },
    ],
    correct: 0,
  },
  {
    en: "What is the form of the harmonic series?",
    uz: "Garmonik qator qaysi ko'rinishda yoziladi?",
    ru: "Каков вид гармонического ряда?",
    opts: [
      "Σ<sub>n=1</sub><sup>∞</sup> 1/n",
      "Σ<sub>n=1</sub><sup>∞</sup> 1/n²",
      "Σ<sub>n=1</sub><sup>∞</sup> n",
      "Σ<sub>n=1</sub><sup>∞</sup> 2<sup>n</sup>",
    ],
    correct: 0,
  },
  {
    en: "What type of series is the harmonic series?",
    uz: "Garmonik qator qanday qator hisoblanadi?",
    ru: "Каким рядом является гармонический ряд?",
    opts: [
      {
        en: "A divergent series",
        uz: "Uzoqlashuvchi qator",
        ru: "Расходящимся рядом",
      },
      {
        en: "A convergent series",
        uz: "Yaqinlashuvchi qator",
        ru: "Сходящимся рядом",
      },
      {
        en: "A geometric series",
        uz: "Geometrik qator",
        ru: "Геометрическим рядом",
      },
      { en: "A finite series", uz: "Chekli qator", ru: "Конечным рядом" },
    ],
    correct: 0,
  },
  {
    en: "When does the series Σ<sub>n=1</sub><sup>∞</sup> 1/n<sup>p</sup> converge?",
    uz: "Σ<sub>n=1</sub><sup>∞</sup> 1/n<sup>p</sup> qatori qachon yaqinlashadi?",
    ru: "Когда сходится ряд Σ<sub>n=1</sub><sup>∞</sup> 1/n<sup>p</sup>?",
    opts: [
      { en: "When p > 1", uz: "p > 1 bo'lsa", ru: "Когда p > 1" },
      { en: "When p = 0", uz: "p = 0 bo'lsa", ru: "Когда p = 0" },
      { en: "When p < 0", uz: "p < 0 bo'lsa", ru: "Когда p < 0" },
      { en: "Always", uz: "Har doim", ru: "Всегда" },
    ],
    correct: 0,
  },
  {
    en: "What type of series is Σ<sub>n=1</sub><sup>∞</sup> 1/n²?",
    uz: "Σ<sub>n=1</sub><sup>∞</sup> 1/n² qatori qanday?",
    ru: "Каким является ряд Σ<sub>n=1</sub><sup>∞</sup> 1/n²?",
    opts: [
      { en: "Convergent", uz: "Yaqinlashuvchi", ru: "Сходящимся" },
      { en: "Divergent", uz: "Uzoqlashuvchi", ru: "Расходящимся" },
      { en: "Geometric", uz: "Geometrik", ru: "Геометрическим" },
      { en: "Telescoping", uz: "Teleskopik", ru: "Телескопическим" },
    ],
    correct: 0,
  },
  {
    en: "What is the main property of a telescoping series?",
    uz: "Teleskopik qatorning asosiy xususiyati nima?",
    ru: "Каково основное свойство телескопического ряда?",
    opts: [
      {
        en: "Most of the terms cancel out",
        uz: "Ko'p hadlar qisqarib ketadi",
        ru: "Большинство членов взаимно уничтожаются",
      },
      {
        en: "All terms are identical",
        uz: "Barcha hadlar bir xil bo'ladi",
        ru: "Все члены одинаковы",
      },
      {
        en: "The terms keep increasing",
        uz: "Hadlar o'sib boradi",
        ru: "Члены возрастают",
      },
      {
        en: "It always diverges",
        uz: "Har doim uzoqlashadi",
        ru: "Он всегда расходится",
      },
    ],
    correct: 0,
  },
];

// ---------------------------------------------------------------
// ANALYTICAL GEOMETRY
// Vectors · lines and planes · conic sections · polar coordinates
// ---------------------------------------------------------------
// SOURCE NOTE — this bank differs from Calculus 1/2 in one important
// way: the instructor's source documents (ANALITIK_GEOMETRIYA_TEST.doc
// and its Russian counterpart) contain NO answer key. There are no
// asterisks, no highlighting and no coloured runs — that was verified
// against the raw document XML. The convention "the first option is
// correct" therefore could not be confirmed from the file.
//
// Every one of the 25 was consequently solved from scratch and keyed
// to the MATHEMATICALLY CORRECT option. In 25/25 cases that turned out
// to be the first printed option, which corroborates the convention —
// but the key below rests on the mathematics, not on the assumption.
//
// The formulas in the source are legacy Equation Editor WMF images
// rather than text, so they were transcribed from rendered pages.
// Each transcription was cross-checked by solving the problem: an
// option misread would not have produced a clean, correct solution.
//
// ---------------------------------------------------------------
// DEVIATIONS FROM THE SOURCE PAPER (5, all agreed with the instructor)
// ---------------------------------------------------------------
//   Q3  — options B/C/D printed the meaningless term "yz" where the
//         plane equation requires "4z". Normalised to "4z". They stay
//         wrong answers (their constant terms differ from the correct
//         -12), so the item is mathematically unchanged.
//   Q8  — the printed option list contained "k1*k2 = 1" TWICE. The
//         duplicate was replaced with "k1 = k2", which is the
//         PARALLELISM condition: a meaningful distractor for a
//         question about perpendicularity, rather than filler.
//   Q11 — asked for HALF the distance between A(4;-1;2) and B(5;1;4).
//         The distance is 3, so the answer is 1.5 — which was absent
//         from the printed options {3, 4, 2, 5}. Added 1.5 as the
//         correct option and dropped "5". "3" is deliberately kept as
//         a distractor: it is the answer of a student who forgets to
//         halve.
//   Q14 — the correct option's x-numerator read "x - 1" although the
//         point is M(3,4,1); its denominators (1,2,3) already matched
//         the direction vector exactly, identifying a source typo.
//         Corrected to "(x - 3)/1 = (y - 4)/2 = (z - 1)/3".
//   Q19 — option D was truncated mid-expression ("x = a sin t,").
//         Completed to "x = a sin t, y = b sin t", which is incorrect
//         (both components sinusoidal in phase), preserving its role
//         as a distractor.
// ---------------------------------------------------------------
window.SUBJECT_BANKS.analytic_geometry = [
  {
    en: "Indicate the condition for the vectors a(a<sub>x</sub>, a<sub>y</sub>, a<sub>z</sub>) and b(b<sub>x</sub>, b<sub>y</sub>, b<sub>z</sub>) to be collinear.",
    uz: "a(a<sub>x</sub>, a<sub>y</sub>, a<sub>z</sub>) va b(b<sub>x</sub>, b<sub>y</sub>, b<sub>z</sub>) vektorlarning kollinearlik shartini ko'rsating.",
    ru: "Укажите условие коллинеарности векторов a(a<sub>x</sub>, a<sub>y</sub>, a<sub>z</sub>) и b(b<sub>x</sub>, b<sub>y</sub>, b<sub>z</sub>).",
    opts: [
      "a<sub>x</sub>/b<sub>x</sub> = a<sub>y</sub>/b<sub>y</sub> = a<sub>z</sub>/b<sub>z</sub>",
      "a<sub>x</sub>/b<sub>x</sub> + a<sub>y</sub>/b<sub>y</sub> + a<sub>z</sub>/b<sub>z</sub> = 1",
      "a<sub>x</sub>b<sub>x</sub> + a<sub>y</sub>b<sub>y</sub> + a<sub>z</sub>b<sub>z</sub> = 0",
      "(a<sub>x</sub> + a<sub>y</sub> + a<sub>z</sub>) / (b<sub>x</sub> + b<sub>y</sub> + b<sub>z</sub>) = λ",
    ],
    correct: 0,
  },
  {
    en: "For which value of α are the vectors a(1, α, 2) and b(α, 2, −3) mutually perpendicular?",
    uz: "α ning qanday qiymatida a(1, α, 2) va b(α, 2, −3) vektorlar o'zaro perpendikulyar bo'ladi?",
    ru: "При каком значении α векторы a(1, α, 2) и b(α, 2, −3) взаимно перпендикулярны?",
    opts: ["α = 2", "α = −2", "α = 1", "α = −1"],
    correct: 0,
  },
  {
    en: "Which is the equation of the plane passing through M(2, −3, 1) and perpendicular to the vector n(1, −2, 4)?",
    uz: "M(2, −3, 1) nuqtadan o'tib n(1, −2, 4) vektorga perpendikulyar tekislik tenglamasi qaysi?",
    ru: "Какое уравнение плоскости, проходящей через точку M(2, −3, 1) и перпендикулярной вектору n(1, −2, 4)?",
    opts: [
      "x − 2y + 4z − 12 = 0",
      "x − 2y + 4z + 12 = 0",
      "x − 2y + 4z = 0",
      "x − 2y + 4z + 10 = 0",
    ],
    correct: 0,
  },
  {
    en: "Find the distance from the point P(2, 4) to the line 3x − 4y + 5 = 0.",
    uz: "P(2, 4) nuqtadan 3x − 4y + 5 = 0 to'g'ri chiziqqacha masofani aniqlang.",
    ru: "Определите расстояние от точки P(2, 4) до прямой 3x − 4y + 5 = 0.",
    opts: ["d = 1", "d = 4", "d = 5", "d = 3"],
    correct: 0,
  },
  {
    en: "Find the angle between the vectors a(4; 3) and b(1; 7).",
    uz: "a(4; 3), b(1; 7) vektorlar tashkil etgan burchakni aniqlang.",
    ru: "Определите угол между векторами a(4; 3) и b(1; 7).",
    opts: ["α = 45°", "α = 60°", "α = 30°", "α = 90°"],
    correct: 0,
  },
  {
    en: "Indicate the condition for the lines y = k<sub>1</sub>x + b<sub>1</sub> and y = k<sub>2</sub>x + b<sub>2</sub> to be parallel.",
    uz: "y = k<sub>1</sub>x + b<sub>1</sub>, y = k<sub>2</sub>x + b<sub>2</sub> to'g'ri chiziqlarning parallellik shartini ko'rsating.",
    ru: "Укажите условие параллельности прямых y = k<sub>1</sub>x + b<sub>1</sub> и y = k<sub>2</sub>x + b<sub>2</sub>.",
    opts: [
      "k<sub>1</sub> = k<sub>2</sub>",
      "k<sub>1</sub>k<sub>2</sub> = 1",
      "k<sub>1</sub>k<sub>2</sub> = −1",
      "k<sub>1</sub> + k<sub>2</sub> = 0",
    ],
    correct: 0,
  },
  {
    en: "Which answer correctly states the condition for the lines A<sub>1</sub>x + B<sub>1</sub>y + C<sub>1</sub> = 0 and A<sub>2</sub>x + B<sub>2</sub>y + C<sub>2</sub> = 0 to be perpendicular?",
    uz: "A<sub>1</sub>x + B<sub>1</sub>y + C<sub>1</sub> = 0, A<sub>2</sub>x + B<sub>2</sub>y + C<sub>2</sub> = 0 to'g'ri chiziqlarning perpendikulyar bo'lish sharti qaysi javobda to'g'ri?",
    ru: "В каком ответе верно указано условие перпендикулярности прямых A<sub>1</sub>x + B<sub>1</sub>y + C<sub>1</sub> = 0 и A<sub>2</sub>x + B<sub>2</sub>y + C<sub>2</sub> = 0?",
    opts: [
      "A<sub>1</sub>A<sub>2</sub> + B<sub>1</sub>B<sub>2</sub> = 0",
      "A<sub>1</sub>A<sub>2</sub> − B<sub>1</sub>B<sub>2</sub> = 0",
      "A<sub>1</sub>B<sub>1</sub> + A<sub>2</sub>B<sub>2</sub> = 0",
      "A<sub>1</sub>A<sub>2</sub> + C<sub>1</sub>C<sub>2</sub> = 0",
    ],
    correct: 0,
  },
  {
    // Q8 — third option replaced; see DEVIATIONS note above.
    en: "Indicate the condition for the lines y = k<sub>1</sub>x + b<sub>1</sub> and y = k<sub>2</sub>x + b<sub>2</sub> to be perpendicular.",
    uz: "y = k<sub>1</sub>x + b<sub>1</sub>, y = k<sub>2</sub>x + b<sub>2</sub> to'g'ri chiziqlarning perpendikulyarlik shartini ko'rsating.",
    ru: "Укажите условие перпендикулярности прямых y = k<sub>1</sub>x + b<sub>1</sub> и y = k<sub>2</sub>x + b<sub>2</sub>.",
    opts: [
      "k<sub>1</sub>k<sub>2</sub> = −1",
      "k<sub>1</sub>k<sub>2</sub> = 1",
      "k<sub>1</sub> = k<sub>2</sub>",
      "k<sub>1</sub> + k<sub>2</sub> = 0",
    ],
    correct: 0,
  },
  {
    en: "Write the parametric equation of a line.",
    uz: "To'g'ri chiziqning parametrik tenglamasini yozing.",
    ru: "Напишите параметрическое уравнение прямой.",
    opts: [
      "x = x<sub>0</sub> + a<sub>1</sub>t,  y = y<sub>0</sub> + a<sub>2</sub>t",
      "(x − x<sub>0</sub>)/a<sub>1</sub> = (y − y<sub>0</sub>)/a<sub>2</sub>",
      "Ax + By + C = 0",
      "x cos φ + y sin φ − p = 0",
    ],
    correct: 0,
  },
  {
    en: "Write the equation of the plane passing through A(−3, 1, 2) and perpendicular to the line (x − 4)/2 = y/(−4) = (z + 1)/3.",
    uz: "A(−3, 1, 2) nuqta orqali o'tuvchi va (x − 4)/2 = y/(−4) = (z + 1)/3 to'g'ri chiziqqa perpendikulyar tekislikning tenglamasini tuzing.",
    ru: "Составьте уравнение плоскости, проходящей через точку A(−3, 1, 2) и перпендикулярной прямой (x − 4)/2 = y/(−4) = (z + 1)/3.",
    opts: [
      "2x − 4y + 3z + 4 = 0",
      "2x − 4y − 3z + 16 = 0",
      "2x + 4y + 3z − 4 = 0",
      "2x + 4y − 3z + 8 = 0",
    ],
    correct: 0,
  },
  {
    // Q11 — 1.5 added as the correct option; see DEVIATIONS note above.
    en: "Find half the distance between the points A(4; −1; 2) and B(5; 1; 4).",
    uz: "A(4; −1; 2), B(5; 1; 4) nuqtalar orasidagi masofaning yarmini toping.",
    ru: "Найдите половину расстояния между точками A(4; −1; 2) и B(5; 1; 4).",
    opts: ["1,5", "3", "4", "2"],
    correct: 0,
  },
  {
    en: "Find the distance between the points A(1; 1) and B(3; 1).",
    uz: "A(1; 1), B(3; 1) nuqtalar orasidagi masofani toping.",
    ru: "Найдите расстояние между точками A(1; 1) и B(3; 1).",
    opts: ["2", "1", "4", "3"],
    correct: 0,
  },
  {
    en: "Find the equation of the line through M(4, 1, 2) parallel to the line (x + 1)/2 = (y + 1)/3 = z/4.",
    uz: "M(4, 1, 2) nuqta orqali o'tuvchi (x + 1)/2 = (y + 1)/3 = z/4 chiziqqa parallel to'g'ri chiziq tenglamasini toping.",
    ru: "Найдите уравнение прямой, проходящей через точку M(4, 1, 2) и параллельной прямой (x + 1)/2 = (y + 1)/3 = z/4.",
    opts: [
      "(x − 4)/2 = (y − 1)/3 = (z − 2)/4",
      "(x − 4)/2 = (y − 1)/8 = (z − 2)/(−5)",
      "(x − 4)/(−2) = (y − 1)/8 = (z − 2)/(−5)",
      "(x − 4)/(−2) = y/8 = (z − 2)/(−5)",
    ],
    correct: 0,
  },
  {
    // Q14 — correct option's x-numerator fixed; see DEVIATIONS note.
    en: "Write the equation of the line through M(3, 4, 1) with direction vector u(1, 2, 3).",
    uz: "M(3, 4, 1) nuqtadan o'tgan va yo'naltiruvchi vektori u(1, 2, 3) bo'lgan to'g'ri chiziq tenglamasini tuzing.",
    ru: "Составьте уравнение прямой, проходящей через точку M(3, 4, 1) и имеющей направляющий вектор u(1, 2, 3).",
    opts: [
      "(x − 3)/1 = (y − 4)/2 = (z − 1)/3",
      "(x − 1)/1 = (y − 2)/4 = (z − 3)/1",
      "(x + 1)/3 = (y + 2)/4 = (z + 3)/1",
      "(x − 1)/6 = (y − 3)/4 = z/3",
    ],
    correct: 0,
  },
  {
    en: "Find the semi-major axis of the ellipse x²/16 + y²/9 = 1.",
    uz: "x²/16 + y²/9 = 1 ellipsning katta yarim o'qini toping.",
    ru: "Найдите большую полуось эллипса x²/16 + y²/9 = 1.",
    opts: ["4", "3", "5", "6"],
    correct: 0,
  },
  {
    en: "Find the equation of the hyperbola whose directrices are x = ±4√2 and whose asymptotes meet at an angle of 90°.",
    uz: "Direktrisalari x = ±4√2 tenglamalar bilan berilgan va asimptotalari orasidagi burchak 90° bo'lgan giperbola tenglamasini toping.",
    ru: "Найдите уравнение гиперболы, директрисы которой заданы уравнениями x = ±4√2, а угол между асимптотами равен 90°.",
    opts: [
      "x² − y² = 64",
      "x² − y² = 18",
      "x² − y² = 90",
      "x² − y² = 68",
    ],
    correct: 0,
  },
  {
    en: "Write the equation of the hyperbola x²/16 − y²/9 = 1 in polar coordinates.",
    uz: "x²/16 − y²/9 = 1 giperbolaning qutb koordinatalari bo'yicha tenglamasini tuzing.",
    ru: "Составьте уравнение гиперболы x²/16 − y²/9 = 1 в полярных координатах.",
    opts: [
      "ρ = 9 / (4 − 5cos φ)",
      "ρ = 9 / (4 + 5cos φ)",
      "ρ = 9 / (3 + 5cos φ)",
      "ρ = 9 / (4 + cos φ)",
    ],
    correct: 0,
  },
  {
    en: "Find the distance between the points A(1, π/3) and B(6, π/3) given in polar coordinates.",
    uz: "A(1, π/3) va B(6, π/3) nuqtalar orasidagi masofani toping.",
    ru: "Найдите расстояние между точками A(1, π/3) и B(6, π/3).",
    opts: ["d = 5", "d = 14", "d = 7", "d = 2"],
    correct: 0,
  },
  {
    // Q19 — option D completed; see DEVIATIONS note above.
    en: "Which of the following is the parametric equation of an ellipse?",
    uz: "Quyidagilarning qaysi biri ellipsning parametrik tenglamasi?",
    ru: "Какое из следующих выражений является параметрическим уравнением эллипса?",
    opts: [
      "x = a cos t,  y = b sin t",
      "x²/a² + y²/b² = 0",
      "x = at,  y = bt",
      "x = a sin t,  y = b sin t",
    ],
    correct: 0,
  },
  {
    en: "Find the angle between the vectors a(0, 3, 4) and c(3, 2, 6).",
    uz: "a(0, 3, 4) va c(3, 2, 6) vektorlar tashkil etgan burchakni toping.",
    ru: "Найдите угол между векторами a(0, 3, 4) и c(3, 2, 6).",
    opts: [
      "φ = arccos(6/7)",
      "φ = arccos(7/6)",
      "φ = arccos(2/3)",
      "φ = arccos(3/2)",
    ],
    correct: 0,
  },
  {
    en: "Which vector is the normal vector of the plane Ax + By + Cz + D = 0?",
    uz: "Ax + By + Cz + D = 0 tekislikning normal vektori qaysi?",
    ru: "Какой вектор является нормальным вектором плоскости Ax + By + Cz + D = 0?",
    opts: ["n(A, B, C)", "n(B, C, D)", "n(A, B, O)", "n(A, B, D)"],
    correct: 0,
  },
  {
    en: "The vectors a = {5, 4, 3} and b = {−2, α, 4} are orthogonal. Find α.",
    uz: "a = {5, 4, 3} va b = {−2, α, 4} ortogonal vektorlar. α = ?",
    ru: "a = {5, 4, 3} и b = {−2, α, 4} — ортогональные векторы. α = ?",
    opts: ["−0,5", "2", "−2", "3"],
    correct: 0,
  },
  {
    en: "Find the area of the triangle built on the vectors a = 6i + 3j − 2k and b = 3i − 2j + 6k.",
    uz: "a = 6i + 3j − 2k va b = 3i − 2j + 6k vektorlardan yasalgan uchburchakning yuzini toping.",
    ru: "Найдите площадь треугольника, построенного на векторах a = 6i + 3j − 2k и b = 3i − 2j + 6k.",
    opts: ["49/2", "7", "49", "45"],
    correct: 0,
  },
  {
    en: "For which value of x are the vectors p = xa + 5b and q = 3a − b collinear?",
    uz: "p = xa + 5b va q = 3a − b vektorlar x ning qanday qiymatida kollinear bo'ladi?",
    ru: "При каком значении x векторы p = xa + 5b и q = 3a − b коллинеарны?",
    opts: ["−15", "14", "13", "12"],
    correct: 0,
  },
  {
    en: "Given A(0, 3, 2) and B(5, 8, −1), find the vector a = AB.",
    uz: "A(0, 3, 2) va B(5, 8, −1) bo'lsa, a = AB vektorni toping.",
    ru: "Если A(0, 3, 2) и B(5, 8, −1), найдите вектор a = AB.",
    opts: [
      "AB(5, 5, −3)",
      "AB(4, −5, −3)",
      "AB(−4, 5, −3)",
      "AB(4, 5, 3)",
    ],
    correct: 0,
  },
];

// ---------------------------------------------------------------
// DISCRETE MATHEMATICS
// Propositional logic · sets · functions · sequences and sums ·
// modular arithmetic · counting
// ---------------------------------------------------------------
// SOURCE AND VERIFICATION
//
// Transcribed from the instructor's paired Uzbek and Russian retake
// papers, in which the correct option is shaded green (fill 92D050).
// Both documents were parsed independently and their green markings
// produced the SAME answer key for all 25 questions:
//
//     C B A A B C B D B A C A A B C C D B C B B D D B D
//
// Every answer was then also derived from first principles — truth
// tables evaluated, set cardinalities counted, compositions expanded,
// the recurrence unrolled, the sum and product evaluated, mod/div
// computed with floored semantics, and the counting arguments worked
// through. All 25 agree. So each key rests on three independent
// sources: the Uzbek paper, the Russian paper, and the mathematics.
//
// NOTE ON THE UZBEK TEXT: several stems in the Uzbek document use
// Word equation objects whose set braces and function parentheses do
// not survive text extraction ("f :a, b, c, d→1, 2, 3" for
// "f : {a, b, c, d} → {1, 2, 3}", "fa=4" for "f(a) = 4"). The Russian
// paper types the same expressions as plain text and is unambiguous,
// so the Uzbek wording below is restored to match it. Q15-Q17 carry
// display equations that live outside the paragraph text entirely;
// those were recovered from the OMML and written inline.
// ---------------------------------------------------------------
window.SUBJECT_BANKS.discrete_math = [
  {
    en: 'Which answer correctly states the negation of the following proposition: "Sardor\'s smartphone has at least 32 GB of memory"?',
    uz: "Quyidagi mulohazaning inkori qaysi javobda to'g'ri keltirilgan: “Sardorning smartfoni kamida 32 GB xotiraga ega”.",
    ru: "В каком варианте ответа правильно приведено отрицание следующего суждения: «Смартфон Сардора имеет не менее 32 ГБ памяти»?",
    opts: [
      {
        en: "Sardor's smartphone has more than 32 GB of memory",
        uz: "Sardorning smartfoni 32 GB dan ko'p xotiraga ega",
        ru: "Смартфон Сардора имеет более 32 ГБ памяти",
      },
      {
        en: "Sardor's smartphone has 32 GB of memory",
        uz: "Sardorning smartfoni 32 GB xotiraga ega",
        ru: "Смартфон Сардора имеет 32 ГБ памяти",
      },
      {
        en: "Sardor's smartphone has less than 32 GB of memory",
        uz: "Sardorning smartfoni 32 GB dan kam xotiraga ega",
        ru: "Смартфон Сардора имеет менее 32 ГБ памяти",
      },
      {
        en: "Sardor's smartphone has 64 GB of memory",
        uz: "Sardorning smartfoni 64 GB xotiraga ega",
        ru: "Смартфон Сардора имеет 64 ГБ памяти",
      },
    ],
    correct: 2,
  },
  {
    en: "Let p and q be propositions where p is True and q is False. Find the value of the conjunction p ∧ q.",
    uz: "p va q lar mulohazalar bo'lib, p ning qiymati rost, q ning qiymati esa yolg'on. p ∧ q konyunksiyaning qiymatini toping.",
    ru: "Пусть p и q — высказывания, причём значение p — Истина, а значение q — Ложь. Найдите значение конъюнкции p ∧ q.",
    opts: [
      { en: "True", uz: "Rost", ru: "Истина" },
      { en: "False", uz: "Yolg'on", ru: "Ложь" },
      {
        en: "Cannot be determined",
        uz: "Aniqlab bo'lmaydi",
        ru: "Невозможно определить",
      },
      { en: "I don't know", uz: "Bilmayman", ru: "Не знаю" },
    ],
    correct: 1,
  },
  {
    en: "Let p and q be propositions where p is False and q is True. Find the value of the disjunction p ∨ q.",
    uz: "p va q lar mulohazalar bo'lib, p ning qiymati yolg'on, q ning qiymati esa rost. p ∨ q dizyunksiyaning qiymatini toping.",
    ru: "Пусть p и q — высказывания, причём значение p — Ложь, а значение q — Истина. Найдите значение дизъюнкции p ∨ q.",
    opts: [
      { en: "True", uz: "Rost", ru: "Истина" },
      { en: "False", uz: "Yolg'on", ru: "Ложь" },
      {
        en: "Cannot be determined",
        uz: "Aniqlab bo'lmaydi",
        ru: "Невозможно определить",
      },
      { en: "I don't know", uz: "Bilmayman", ru: "Не знаю" },
    ],
    correct: 0,
  },
  {
    en: "Let p and q be propositions where p is True and q is False. Find the value of the proposition p ∨ ¬q.",
    uz: "p va q lar mulohazalar bo'lib, p ning qiymati rost, q ning qiymati esa yolg'on. p ∨ ¬q mulohazaning qiymatini toping.",
    ru: "Пусть p и q — высказывания, причём значение p — Истина, а значение q — Ложь. Найдите значение высказывания p ∨ ¬q.",
    opts: [
      { en: "True", uz: "Rost", ru: "Истина" },
      { en: "False", uz: "Yolg'on", ru: "Ложь" },
      {
        en: "Cannot be determined",
        uz: "Aniqlab bo'lmaydi",
        ru: "Невозможно определить",
      },
      { en: "I don't know", uz: "Bilmadim", ru: "Не знаю" },
    ],
    correct: 0,
  },
  {
    en: "Let p and q be propositions where p is True and q is False. Find the value of the proposition (p ∨ ¬q) → (p ∧ q).",
    uz: "p va q lar mulohazalar bo'lib, p ning qiymati rost, q ning qiymati esa yolg'on. (p ∨ ¬q) → (p ∧ q) mulohazaning qiymatini toping.",
    ru: "Пусть p и q — высказывания, причём значение p — Истина, а значение q — Ложь. Найдите значение высказывания (p ∨ ¬q) → (p ∧ q).",
    opts: [
      { en: "True", uz: "Rost", ru: "Истина" },
      { en: "False", uz: "Yolg'on", ru: "Ложь" },
      {
        en: "Cannot be determined",
        uz: "Aniqlab bo'lmaydi",
        ru: "Невозможно определить",
      },
      { en: "I don't know", uz: "Bilmadim", ru: "Не знаю" },
    ],
    correct: 1,
  },
  {
    en: "Let A be the set of odd natural numbers less than 10. Find the cardinality of A (the number of elements), that is |A|.",
    uz: "A — 10 dan kichik toq natural sonlar to'plami bo'lsin. A to'plamning quvvatini (elementlar sonini), ya'ni |A| ni toping.",
    ru: "Пусть A — множество нечётных натуральных чисел, меньших 10. Найдите мощность множества A (число элементов), то есть |A|.",
    opts: ["3", "4", "5", "6"],
    correct: 2,
  },
  {
    en: "How many elements does the power set of {0, 1, 2} contain?",
    uz: "{0, 1, 2} to'plamning qism to'plamlari to'plamida nechta element bor?",
    ru: "Сколько элементов содержит множество всех подмножеств множества {0, 1, 2}?",
    opts: ["4", "8", "16", "6"],
    correct: 1,
  },
  {
    en: "How many subsets does the set {0, 1} have?",
    uz: "{0, 1} to'plamning nechta qism to'plami mavjud?",
    ru: "Сколько подмножеств имеет множество {0, 1}?",
    opts: ["1", "2", "3", "4"],
    correct: 3,
  },
  {
    en: "For the sets A = {1, 2, 3, 4, 5} and B = {0, 3, 6}, how many elements does the union A ∪ B have?",
    uz: "A = {1, 2, 3, 4, 5} va B = {0, 3, 6} to'plamlar uchun A ∪ B ning nechta elementi bor?",
    ru: "Для множеств A = {1, 2, 3, 4, 5} и B = {0, 3, 6} найдите количество элементов объединения A ∪ B.",
    opts: ["8", "7", "6", "5"],
    correct: 1,
  },
  {
    en: "For the sets A = {1, 2, 3, 4, 5} and B = {0, 3, 6}, how many elements does the intersection A ∩ B have?",
    uz: "A = {1, 2, 3, 4, 5} va B = {0, 3, 6} to'plamlar uchun A ∩ B ning nechta elementi bor?",
    ru: "Для множеств A = {1, 2, 3, 4, 5} и B = {0, 3, 6} найдите количество элементов пересечения A ∩ B.",
    opts: ["1", "2", "3", "4"],
    correct: 0,
  },
  {
    en: "The function f : {a, b, c, d} → {1, 2, 3, 4, 5} is defined by f(a) = 4, f(b) = 5, f(c) = 1 and f(d) = 3. Which of the following statements is true for this function?",
    uz: "f : {a, b, c, d} → {1, 2, 3, 4, 5} funksiya f(a) = 4, f(b) = 5, f(c) = 1 va f(d) = 3 lar bilan aniqlangan. Bu funksiya uchun quyidagi mulohazalardan qaysi biri rost?",
    ru: "Функция f : {a, b, c, d} → {1, 2, 3, 4, 5} задана значениями f(a) = 4, f(b) = 5, f(c) = 1 и f(d) = 3. Какое из следующих утверждений верно для этой функции?",
    opts: [
      {
        en: "f is surjective",
        uz: "f funksiya suryektiv",
        ru: "Функция f сюръективна",
      },
      {
        en: "f is bijective",
        uz: "f funksiya biyektiv",
        ru: "Функция f биективна",
      },
      {
        en: "f is injective",
        uz: "f funksiya inyektiv",
        ru: "Функция f инъективна",
      },
      {
        en: "f is neither surjective nor injective",
        uz: "f funksiya suryektiv ham inyektiv ham emas",
        ru: "Функция f не является ни сюръективной, ни инъективной",
      },
    ],
    correct: 2,
  },
  {
    en: "The function f : {a, b, c, d} → {1, 2, 3} is defined by f(a) = 3, f(b) = 2, f(c) = 1 and f(d) = 3. Which of the following statements is true for this function?",
    uz: "f : {a, b, c, d} → {1, 2, 3} funksiya f(a) = 3, f(b) = 2, f(c) = 1 va f(d) = 3 lar bilan aniqlangan. Bu funksiya uchun quyidagi mulohazalardan qaysi biri rost?",
    ru: "Функция f : {a, b, c, d} → {1, 2, 3} задана значениями f(a) = 3, f(b) = 2, f(c) = 1 и f(d) = 3. Какое из следующих утверждений верно для этой функции?",
    opts: [
      {
        en: "f is surjective",
        uz: "f funksiya suryektiv",
        ru: "Функция f сюръективна",
      },
      {
        en: "f is bijective",
        uz: "f funksiya biyektiv",
        ru: "Функция f биективна",
      },
      {
        en: "f is injective",
        uz: "f funksiya inyektiv",
        ru: "Функция f инъективна",
      },
      {
        en: "f is neither surjective nor injective",
        uz: "f funksiya suryektiv ham inyektiv ham emas",
        ru: "Функция f не является ни сюръективной, ни инъективной",
      },
    ],
    correct: 0,
  },
  {
    en: "The functions f and g from the set of integers to the set of integers are given by f(x) = 2x + 3 and g(x) = 3x + 2. Find the composition f ∘ g.",
    uz: "Butun sonlar to'plamini butun sonlar to'plamiga akslantiruvchi f va g funksiyalar f(x) = 2x + 3 va g(x) = 3x + 2 lar orqali berilgan. f va g ning kompozitsiyasini, ya'ni f ∘ g ni aniqlang.",
    ru: "Функции f и g, отображающие множество целых чисел в множество целых чисел, заданы формулами f(x) = 2x + 3 и g(x) = 3x + 2. Найдите композицию функций f и g, то есть f ∘ g.",
    opts: [
      "(f ∘ g)(x) = 6x + 7",
      "(f ∘ g)(x) = 6x + 11",
      "(f ∘ g)(x) = 5x + 5",
      "(f ∘ g)(x) = −x + 1",
    ],
    correct: 0,
  },
  {
    en: "The functions f and g from the set of integers to the set of integers are given by f(x) = 2x + 3 and g(x) = 3x + 2. Find the composition g ∘ f.",
    uz: "Butun sonlar to'plamini butun sonlar to'plamiga akslantiruvchi f va g funksiyalar f(x) = 2x + 3 va g(x) = 3x + 2 lar orqali berilgan. g va f ning kompozitsiyasini, ya'ni g ∘ f ni aniqlang.",
    ru: "Функции f и g, отображающие множество целых чисел в множество целых чисел, заданы формулами f(x) = 2x + 3 и g(x) = 3x + 2. Найдите композицию функций g и f, то есть g ∘ f.",
    opts: [
      "(g ∘ f)(x) = 6x + 7",
      "(g ∘ f)(x) = 6x + 11",
      "(g ∘ f)(x) = 5x + 5",
      "(g ∘ f)(x) = −x + 1",
    ],
    correct: 1,
  },
  {
    en: "The sequence a<sub>n</sub> satisfies the recurrence relation a<sub>n</sub> = a<sub>n−1</sub> + 3 for n = 1, 2, 3, … . If a<sub>0</sub> = 2, find a<sub>3</sub>.",
    uz: "a<sub>n</sub> ketma-ketlik uchun a<sub>n</sub> = a<sub>n−1</sub> + 3 rekurrent munosabat n = 1, 2, 3, … uchun o'rinli. Agar a<sub>0</sub> = 2 bo'lsa, a<sub>3</sub> ni toping.",
    ru: "Для последовательности a<sub>n</sub> выполнено рекуррентное соотношение a<sub>n</sub> = a<sub>n−1</sub> + 3 для n = 1, 2, 3, … . Если a<sub>0</sub> = 2, найдите a<sub>3</sub>.",
    opts: ["5", "8", "11", "14"],
    correct: 2,
  },
  {
    en: "Find the value of the sum: Σ<sub>j=1</sub><sup>5</sup> j².",
    uz: "Yig'indining qiymatini toping: Σ<sub>j=1</sub><sup>5</sup> j².",
    ru: "Найдите значение суммы: Σ<sub>j=1</sub><sup>5</sup> j².",
    opts: ["45", "50", "55", "60"],
    correct: 2,
  },
  {
    en: "Find the value of the product: Π<sub>i=0</sub><sup>10</sup> i.",
    uz: "Ko'paytmaning qiymatini toping: Π<sub>i=0</sub><sup>10</sup> i.",
    ru: "Найдите значение произведения: Π<sub>i=0</sub><sup>10</sup> i.",
    opts: ["100", "10", "1", "0"],
    correct: 3,
  },
  {
    en: "Find the value of the expression: −17 mod 2.",
    uz: "Ifodaning qiymatini toping: −17 mod 2.",
    ru: "Найдите значение выражения: −17 mod 2.",
    opts: ["0", "1", "−1", "−2"],
    correct: 1,
  },
  {
    en: "Find the value of the expression: 199 mod 19.",
    uz: "Ifodaning qiymatini toping: 199 mod 19.",
    ru: "Найдите значение выражения: 199 mod 19.",
    opts: ["10", "19", "9", "199"],
    correct: 2,
  },
  {
    en: "If a = 228 and b = 119, find the value of the expression a div b.",
    uz: "Agar a = 228 va b = 119 bo'lsa, a div b ifodaning qiymatini toping.",
    ru: "Если a = 228 и b = 119, найдите значение выражения a div b.",
    opts: ["0", "1", "2", "3"],
    correct: 1,
  },
  {
    en: "If a = −111 and b = 99, find the value of the expression a div b.",
    uz: "Agar a = −111 va b = 99 bo'lsa, a div b ifodaning qiymatini toping.",
    ru: "Если a = −111 и b = 99, найдите значение выражения a div b.",
    opts: ["−1", "−2", "0", "1"],
    correct: 1,
  },
  {
    en: "A data center contains 12 computers. Each of these computers has 10 ports. How many different computer ports are there in this data center in total?",
    uz: "Ma'lumotlar markazida (data center) 12 ta kompyuter bor. Ushbu kompyuterlarning har birida 10 tadan port mavjud. Ushbu ma'lumotlar markazida jami nechta har xil kompyuter porti bor?",
    ru: "В дата-центре имеется 12 компьютеров. На каждом из этих компьютеров есть по 10 портов. Сколько всего различных компьютерных портов в этом дата-центре?",
    opts: ["10", "12", "22", "120"],
    correct: 3,
  },
  {
    en: "A student may submit a computer project by choosing one project from three lists. These three lists contain 23, 15 and 19 projects respectively. No project appears in more than one list. How many different projects are available to choose from in total?",
    uz: "Talaba uchta ro'yxatdagi loyihalardan birini tanlab, kompyuter loyihasini topshirishi mumkin. Ushbu uchta ro'yxatda mos ravishda 23, 15 va 19 ta loyiha bor. Hech bir loyiha bir vaqtning o'zida bittadan ortiq ro'yxatda takrorlanmaydi. Tanlab olish uchun jami nechta turli loyiha mavjud?",
    ru: "Студент может сдать компьютерный проект, выбрав один проект из трёх списков. В этих трёх списках содержится 23, 15 и 19 проектов соответственно. Ни один проект не повторяется более чем в одном списке. Сколько всего различных проектов доступно для выбора?",
    opts: ["38", "34", "42", "57"],
    correct: 3,
  },
  {
    en: "In how many ways can the winners of first, second and third place be chosen from among 10 people taking part in a competition?",
    uz: "Tanlovda qatnashayotgan 10 kishi orasidan birinchi, ikkinchi va uchinchi o'rin g'oliblarini tanlashning nechta usuli bor?",
    ru: "Сколькими способами из 10 человек, участвующих в конкурсе, можно выбрать победителей, занявших первое, второе и третье места?",
    opts: ["1000", "720", "7200", "10"],
    correct: 1,
  },
  {
    en: "In how many ways can 5 players be chosen from a 10-member tennis team to travel to a competition at another school?",
    uz: "Boshqa maktabdagi musobaqaga borish uchun 10 kishilik tennis jamoasidan 5 ta o'yinchini tanlab olishning nechta usuli bor?",
    ru: "Сколькими способами можно выбрать 5 игроков из теннисной команды, состоящей из 10 человек, для поездки на соревнования в другую школу?",
    opts: ["15", "50", "P(10, 5)", "C(10, 5)"],
    correct: 3,
  },
];

// ---------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------
// Expands bare-string options into {en,uz,ru} triples (a number or a
// formula reads the same in every language), and fills any missing
// uz/ru with the English text so no consumer ever sees `undefined`.
// ---------------------------------------------------------------
(function normalizeSubjectBanks() {
  const banks = window.SUBJECT_BANKS || {};
  Object.keys(banks).forEach(function (bankKey) {
    const list = banks[bankKey];
    if (!Array.isArray(list)) return;
    list.forEach(function (q) {
      q.uz = q.uz || q.en;
      q.ru = q.ru || q.en;
      q.opts = (q.opts || []).map(function (o) {
        if (typeof o === "string") return { en: o, uz: o, ru: o };
        return { en: o.en, uz: o.uz || o.en, ru: o.ru || o.en };
      });
    });
  });
})();

// Returns the bank array for a bank key, or [] if unknown.
window.snSubjectBank = function (bankKey) {
  const b = (window.SUBJECT_BANKS || {})[bankKey];
  return Array.isArray(b) ? b : [];
};
