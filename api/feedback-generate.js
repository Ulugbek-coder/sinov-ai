// =============================================================
// /api/feedback-generate.js — Vercel Serverless Function
// -------------------------------------------------------------
// Generates a personalized study-recommendation report for an
// exam taker after they submit. The student's wrong + unanswered
// MC questions (text + code snippets), plus a summary of their
// score, are sent to Gemini, which returns 3-4 specific topic
// recommendations in English + Uzbek + Russian.
//
// Why server-side?
//   The GEMINI_API_KEY must not be exposed in client code.
//
// Request body (JSON):
//   {
//     studentName: "Jasurbek Mahkamov",
//     mcScore: 24,
//     mcTotal: 40,
//     correctCount: 12,
//     totalQuestions: 20,
//     wrongOrSkipped: [
//       {
//         questionEn: "What will be the output of ...",  // stripped HTML
//         options: ["3", "3.4", "4", "2"],
//         correctIndex: 0,
//         userIndex: 2,           // -1 means unanswered
//         status: "wrong" | "skipped"
//       },
//       ...
//     ],
//     codingSummary: [
//       { title: "Sum of Odd Numbers", maxPoints: 10, codeLength: 245 },
//       ...
//     ]
//   }
//
// Successful response (JSON):
//   {
//     en: { headline: "...", recommendations: [{topic, advice, resources?}, ...] },
//     uz: { ... same shape ... },
//     ru: { ... same shape ... }
//   }
//
// Error response: HTTP 4xx/5xx with { error: "..." }
//
// Environment variables required:
//   GEMINI_API_KEY  -> get from https://aistudio.google.com/apikey
// =============================================================

// Gemini 2.5 Flash — chosen over Flash-Lite for this endpoint
// specifically because feedback generation is a trilingual prose
// task (EN + UZ + RU) and Flash produces noticeably more coherent
// Uzbek output. Uzbek is a low-resource language in LLM training
// data, and Flash-Lite — while perfect for visual/binary tasks like
// glasses detection and proctoring — sometimes returned awkward or
// repetitive Uzbek phrasing on the headline + recommendations.
// Flash adds ~0.5-1s latency and ~5× the per-call token cost, but
// this endpoint fires exactly ONCE per exam submission, so the
// total impact at hackathon scale is fractions of a cent.
//
// FIX (May 23): this endpoint was missing the _load-env shim that
// every other /api/*.js file has, so under `vercel dev` on
// Windows-OneDrive paths the GEMINI_API_KEY never made it into
// process.env — the call always 500'd with "Gemini API key not
// configured". Now matches the pattern used by proctor-analyze.js,
// grade-code.js, gemini-vision.js, judge.js. No-op in production
// where Vercel injects env vars directly.
//
// MODEL CHANGE (May 23): Flash-Lite → Flash. Quality bump for
// trilingual feedback; trivial cost increase at hackathon scale.
require("./_load-env");
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  "gemini-2.5-flash:generateContent";

const FETCH_TIMEOUT_MS = 30000; // 30s — Gemini text responses can be slow
const MAX_QUESTIONS = 25; // safety cap on payload size

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // -----------------------------------------------------------------
  // Validate env + body
  // -----------------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[feedback-generate] GEMINI_API_KEY env var is not set");
    return res.status(500).json({ error: "Gemini API key not configured" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (_) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Empty or invalid body" });
  }

  const studentName = String(body.studentName || "the student").slice(0, 200);
  const mcScore = Number(body.mcScore) || 0;
  const mcTotal = Number(body.mcTotal) || 40;
  const correctCount = Number(body.correctCount) || 0;
  const totalQuestions = Number(body.totalQuestions) || 20;
  // Round 2 (May 2026): detailed scoring breakdown so feedback can be
  // accurate about WHY the score is what it is. Each field may be null
  // for legacy submissions; we fall back to safe defaults below.
  const mcBreakdown =
    body.mcBreakdown && typeof body.mcBreakdown === "object"
      ? body.mcBreakdown
      : null;
  let wrongOrSkipped = Array.isArray(body.wrongOrSkipped)
    ? body.wrongOrSkipped
    : [];
  // Hard cap to control payload size
  if (wrongOrSkipped.length > MAX_QUESTIONS) {
    wrongOrSkipped = wrongOrSkipped.slice(0, MAX_QUESTIONS);
  }
  const codingSummary = Array.isArray(body.codingSummary)
    ? body.codingSummary
    : [];

  // -----------------------------------------------------------------
  // Build prompt
  // -----------------------------------------------------------------
  // The prompt asks Gemini to:
  //   (a) read the student's wrong/skipped questions + code snippets
  //   (b) infer which C++ topics they're weak in (e.g. pointers,
  //       integer division, operator precedence, string indexing)
  //   (c) produce 3-4 trilingual recommendations
  //   (d) return strict JSON only
  //
  // We intentionally do NOT send the student's correct answers — Gemini
  // doesn't need them to identify weak topics. Saves tokens.
  const questionsBlock = wrongOrSkipped
    .map((q, i) => {
      const qText = (q.questionEn || "").slice(0, 600);
      const opts = Array.isArray(q.options) ? q.options.slice(0, 4) : [];
      const optsBlock = opts
        .map((o, j) => {
          const letter = String.fromCharCode(65 + j);
          const corr = j === q.correctIndex ? " ✓ correct" : "";
          const chose = j === q.userIndex ? " ← student chose" : "";
          return (
            "    " + letter + ") " + String(o).slice(0, 200) + corr + chose
          );
        })
        .join("\n");
      const statusLabel = q.status === "skipped" ? "(SKIPPED)" : "(WRONG)";
      return (
        "Q" +
        (i + 1) +
        " " +
        statusLabel +
        "\n" +
        "  " +
        qText +
        "\n" +
        optsBlock
      );
    })
    .join("\n\n");

  const codingBlock = codingSummary
    .map((c, i) => {
      return (
        "  Problem " +
        (i + 1) +
        ": " +
        (c.title || "(untitled)") +
        " — max " +
        (c.maxPoints || 0) +
        " pts" +
        ", student code length: " +
        (c.codeLength || 0) +
        " chars"
      );
    })
    .join("\n");

  // Round 2: build a narrative line about the scoring rules + breakdown
  // so Gemini can give accurate advice (e.g. "you lost X points to wrong
  // answers, not just to unanswered ones"). For legacy submissions
  // without an mcBreakdown, we omit this section.
  let scoringNarrative = "";
  if (mcBreakdown) {
    const ptsCorrect = Number(mcBreakdown.pointsPerCorrect) || 0;
    const penalty = Number(mcBreakdown.penaltyPerWrong) || 0;
    const lines = [];
    lines.push(
      "  Scoring rules: +" +
        ptsCorrect +
        " per correct, " +
        (penalty > 0 ? "-" + penalty + " per wrong" : "no penalty for wrong") +
        ", 0 per unanswered.",
    );
    lines.push(
      "  Breakdown: " +
        (mcBreakdown.correct || 0) +
        " correct (+" +
        (mcBreakdown.correct || 0) * ptsCorrect +
        "), " +
        (mcBreakdown.wrong || 0) +
        " wrong (" +
        (penalty > 0
          ? "-" + (mcBreakdown.wrong || 0) * penalty
          : "no penalty") +
        "), " +
        (mcBreakdown.unanswered || 0) +
        " unanswered (0).",
    );
    if (mcBreakdown.rawScore != null && mcBreakdown.rawScore < 0) {
      lines.push(
        "  Note: raw score was " +
          mcBreakdown.rawScore +
          " (negative), floored to 0.",
      );
    }
    scoringNarrative = "MC SCORING DETAILS:\n" + lines.join("\n") + "\n\n";
  }

  const promptText =
    "You are a supportive C++ programming tutor reviewing an exam " +
    "submission. The student is " +
    studentName +
    ", a first-year " +
    "computer-science student at New Uzbekistan University.\n\n" +
    "STUDENT'S RESULTS:\n" +
    "  • MC test points: " +
    mcScore +
    " / " +
    mcTotal +
    "\n" +
    "  • Correct MC answers: " +
    correctCount +
    " / " +
    totalQuestions +
    "\n" +
    "  • Coding problems attempted: " +
    codingSummary.length +
    "\n\n" +
    scoringNarrative +
    (codingBlock ? "CODING SUBMISSIONS:\n" + codingBlock + "\n\n" : "") +
    (questionsBlock
      ? "WRONG OR SKIPPED MULTIPLE-CHOICE QUESTIONS:\n" +
        questionsBlock +
        "\n\n"
      : "(No wrong answers — congratulate the student.)\n\n") +
    "YOUR TASK:\n" +
    "Analyze the wrong/skipped questions and identify the 3 specific " +
    "C++ topics where this student needs the most help. For each, give " +
    "a short, encouraging recommendation and 1-2 study resource suggestions.\n\n" +
    "RESOURCE RULES — these are STRICT, the system has no knowledge of the\n" +
    "student's course materials:\n" +
    "  - DO NOT reference any textbook, book, chapter, page, section, or\n" +
    "    lecture number. You have no information about which textbook this\n" +
    "    course uses; making up chapter numbers misleads the student.\n" +
    "  - DO NOT invent specific URLs, video titles, or course names.\n" +
    "  - DO use these resource shapes only:\n" +
    "      (a) Generic topic phrases the student can search for, e.g.\n" +
    "          'C++ pointer fundamentals', 'C++ operator precedence rules'.\n" +
    "      (b) Well-known reference site NAMES (no URLs), e.g.\n" +
    "          'cppreference.com', 'learncpp.com'.\n" +
    "      (c) Generic study activities, e.g. 'Hand-trace small code\n" +
    "          snippets', 'Practice problems on dynamic memory'.\n" +
    "  - The 'resources' field is a short comma-separated list (2-4 items)\n" +
    "    using only the shapes above. Examples of GOOD values:\n" +
    "      'cppreference.com on pointers, C++ pointer fundamentals tutorials, hand-trace pointer examples'\n" +
    "      'learncpp.com loops section, C++ for-loop practice problems'\n" +
    "    Examples of BAD values (do NOT produce these):\n" +
    "      'Textbook Chapter 8: Pointers'   (invented chapter)\n" +
    "      'Lecture 5 notes'                (invented lecture)\n" +
    "      'C++ Primer by Lippman'          (invented book)\n" +
    "      'https://example.com/pointers'   (invented URL)\n\n" +
    "OUTPUT FORMAT — respond with STRICT JSON ONLY (no markdown, no code " +
    "fences, no commentary outside the JSON). Use this exact schema:\n\n" +
    "{\n" +
    '  "en": {\n' +
    '    "headline": "<must start exactly with: \\"Dear ' +
    studentName +
    ', your exam results have been reviewed\\" — then continue with a one-sentence personal assessment.>",\n' +
    '    "recommendations": [\n' +
    '      { "topic": "<short topic name>", "advice": "<2-3 sentence guidance>", "resources": "<comma-separated resource names following the RESOURCE RULES above>" },\n' +
    '      { "topic": "...", "advice": "...", "resources": "..." },\n' +
    '      { "topic": "...", "advice": "...", "resources": "..." }\n' +
    "    ]\n" +
    "  },\n" +
    '  "uz": { "headline": "<must start exactly with: \\"Hurmatli ' +
    studentName +
    ", imtihon natijalaringiz ko'rib chiqildi" +
    '\\" — then continue with the same one-sentence assessment in Uzbek (Latin script).>", "recommendations": [ ... 3 items ... ] },\n' +
    '  "ru": { "headline": "<must start exactly with: \\"Уважаемый/Уважаемая ' +
    studentName +
    ', ваши результаты экзамена были рассмотрены\\" — then continue with the same one-sentence assessment in Russian.>", "recommendations": [ ... 3 items ... ] }\n' +
    "}\n\n" +
    "HEADLINE FORMAT — STRICT:\n" +
    "  - Every language's headline MUST begin with the exact opening phrase\n" +
    "    shown in the schema above (Dear / Hurmatli / Уважаемый,Уважаемая).\n" +
    "  - The student's full name follows the opening phrase, then a comma,\n" +
    "    then the assessment sentence.\n" +
    "  - No greetings like 'Hello' or 'Hi' — use the formal opening above.\n\n" +
    "Tone: warm and encouraging, never demoralizing. Be specific about C++ " +
    'concepts, not generic ("you struggled with operator precedence" not ' +
    'just "you should review C++"). If the student did very well (>=80%), ' +
    "still pick 3 topics where they could deepen understanding.\n" +
    "All three languages must contain the SAME 3 topics in the SAME order.\n" +
    "The Uzbek and Russian resource lists must follow the same RESOURCE\n" +
    "RULES — no textbook/chapter references in any language.\n" +
    "Uzbek must use Latin script (not Cyrillic).";

  // -----------------------------------------------------------------
  // Call Gemini
  // -----------------------------------------------------------------
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: promptText }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
      // FIX (May 23): 2048 → 4096. Gemini 2.5 Flash produces noticeably
      // longer trilingual output than Flash-Lite did (especially in
      // Russian, where Cyrillic characters tokenize to ~2 tokens each
      // vs ~1 for Latin script). The previous 2048 cap was sized for
      // Flash-Lite and now truncated Flash's response mid-string in
      // the recommendations array, causing JSON.parse to throw
      // "Unterminated string in JSON at position N" and falling
      // through to the offline-mode placeholder. 4096 leaves
      // comfortable headroom for ~3 langs × (headline + 3 recs); you
      // only pay for tokens actually generated, not for the cap.
      maxOutputTokens: 4096,
    },
  };

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let geminiResp;
  try {
    geminiResp = await fetch(GEMINI_API_URL + "?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[feedback-generate] fetch error:", err);
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Gemini request timed out" });
    }
    return res.status(502).json({ error: "Network error reaching Gemini" });
  }
  clearTimeout(timeoutId);

  if (!geminiResp.ok) {
    const errBody = await geminiResp.text().catch(() => "");
    console.error(
      "[feedback-generate] Gemini HTTP " + geminiResp.status + ": " + errBody,
    );
    // Map Gemini errors to our own status codes
    if (geminiResp.status === 429) {
      return res
        .status(429)
        .json({ error: "Gemini rate limit hit. Try again shortly." });
    }
    return res.status(502).json({
      error: "Gemini upstream error",
      status: geminiResp.status,
    });
  }

  let respJson;
  try {
    respJson = await geminiResp.json();
  } catch (err) {
    console.error("[feedback-generate] Gemini JSON parse failed:", err);
    return res.status(502).json({ error: "Gemini returned non-JSON" });
  }

  // Extract the text response
  const candidate = (respJson.candidates || [])[0];
  const part =
    candidate &&
    candidate.content &&
    candidate.content.parts &&
    candidate.content.parts[0];
  const text = part && typeof part.text === "string" ? part.text : "";
  if (!text) {
    console.warn("[feedback-generate] Empty Gemini response:", respJson);
    return res.status(200).json(fallbackFeedback(studentName));
  }

  // Parse the JSON — strip any code fences just in case Gemini ignores
  // the responseMimeType directive
  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (err) {
    console.error("[feedback-generate] failed to parse Gemini JSON:", err);
    console.error("[feedback-generate] raw text:", cleanText.slice(0, 500));
    return res.status(200).json(fallbackFeedback(studentName));
  }

  // Validate shape — ensure all three languages have headlines + 3 recommendations
  const out = normalizeFeedback(parsed, studentName);
  return res.status(200).json(out);
};

// -----------------------------------------------------------------
// Defensive normalization: ensure we always return a valid shape
// even if Gemini's response is partially malformed.
// -----------------------------------------------------------------
function normalizeFeedback(parsed, studentName) {
  const safe = (obj, lang) => {
    obj = obj || {};
    const headline =
      typeof obj.headline === "string" && obj.headline.trim()
        ? obj.headline.trim().slice(0, 400)
        : defaultHeadline(lang, studentName);
    const recs = Array.isArray(obj.recommendations) ? obj.recommendations : [];
    const cleanRecs = recs.slice(0, 4).map((r) => ({
      topic: typeof r.topic === "string" ? r.topic.trim().slice(0, 120) : "",
      advice: typeof r.advice === "string" ? r.advice.trim().slice(0, 600) : "",
      resources:
        typeof r.resources === "string" ? r.resources.trim().slice(0, 300) : "",
    }));
    // Pad to at least 1 entry so the PDF never shows an empty section
    while (cleanRecs.length < 1) {
      cleanRecs.push({
        topic: defaultTopic(lang),
        advice: defaultAdvice(lang),
        resources: "",
      });
    }
    return { headline, recommendations: cleanRecs };
  };
  return {
    en: safe(parsed.en, "en"),
    uz: safe(parsed.uz, "uz"),
    ru: safe(parsed.ru, "ru"),
  };
}

function defaultHeadline(lang, name) {
  if (lang === "uz")
    return "Imtihon natijalaringiz tahlil qilindi, " + name + ".";
  if (lang === "ru")
    return "Ваши результаты экзамена проанализированы, " + name + ".";
  return "Your exam results have been analyzed, " + name + ".";
}
function defaultTopic(lang) {
  if (lang === "uz") return "C++ asoslari";
  if (lang === "ru") return "Основы C++";
  return "C++ Fundamentals";
}
function defaultAdvice(lang) {
  if (lang === "uz")
    return "Asosiy C++ kontseptsiyalarini takrorlang va o'qituvchidan yordam so'rang.";
  if (lang === "ru")
    return "Повторите основные концепции C++ и обратитесь к преподавателю за помощью.";
  return "Review the core C++ concepts and ask your instructor for guidance.";
}

function fallbackFeedback(studentName) {
  return {
    en: {
      headline: defaultHeadline("en", studentName),
      recommendations: [
        {
          topic: defaultTopic("en"),
          advice:
            "AI feedback generation was unavailable for this submission. " +
            "Please review your incorrect answers with your instructor.",
          resources: "cppreference.com, ask your instructor",
        },
      ],
    },
    uz: {
      headline: defaultHeadline("uz", studentName),
      recommendations: [
        {
          topic: defaultTopic("uz"),
          advice:
            "Bu topshiriq uchun AI fikr-mulohaza yaratish mavjud emas edi. " +
            "Iltimos, noto'g'ri javoblaringizni o'qituvchi bilan ko'rib chiqing.",
          resources: "cppreference.com, o'qituvchidan so'rang",
        },
      ],
    },
    ru: {
      headline: defaultHeadline("ru", studentName),
      recommendations: [
        {
          topic: defaultTopic("ru"),
          advice:
            "Создание AI-отзыва было недоступно для этой работы. " +
            "Пожалуйста, рассмотрите неверные ответы с преподавателем.",
          resources: "cppreference.com, обратитесь к преподавателю",
        },
      ],
    },
  };
}
