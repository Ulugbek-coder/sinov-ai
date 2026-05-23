// ===============================================================
// ai-feedback.js — AI Personalized Student Feedback (Feature 2)
// ---------------------------------------------------------------
// Exports a single global: window.AIFeedback.generate(submissionData)
//
// Flow at exam-submit time:
//   1. app.js calls AIFeedback.generate(submissionData) BEFORE PDF
//      generation, AFTER the MC + coding portions are scored.
//   2. We build a compact payload (only wrong/skipped questions, with
//      HTML stripped and entities decoded) and POST it to the Vercel
//      proxy at /api/feedback-generate.
//   3. The proxy hands it to Gemini 2.5 Flash-Lite, parses the JSON
//      response, and returns three localized blocks (en/uz/ru).
//   4. We attach the result to submissionData.aiFeedback, which the
//      PDF generator and the on-screen finished page both read.
//
// Failure modes are all soft: if Gemini is unavailable, rate-limited,
// or returns malformed data, we fall back to a deterministic locally-
// generated feedback summary so the student/PDF never goes empty.
// ===============================================================

(function () {
  "use strict";

  // -----------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------
  window.AIFeedback = {
    generate: generate,
  };

  /**
   * Build a feedback payload from a submission and POST it to the
   * Vercel proxy. Returns a Promise that resolves to:
   *   { en: { headline, recommendations: [...] },
   *     uz: { ... },
   *     ru: { ... },
   *     fallback: bool   // true if Gemini wasn't reached
   *   }
   * Never throws — always resolves with something useful for the UI.
   */
  async function generate(submissionData) {
    if (!submissionData) {
      return localFallback("the student", []);
    }

    const studentName =
      [submissionData.firstName, submissionData.lastName]
        .filter(Boolean)
        .join(" ") || "the student";

    // Build the list of wrong + skipped MC questions.
    // Send EN versions only — Gemini will translate to UZ/RU itself
    // (and keeps the payload size small).
    const wrongOrSkipped = buildWrongList(submissionData);
    const codingSummary = buildCodingSummary(submissionData);

    const payload = {
      studentName: studentName,
      mcScore: Number(submissionData.mcScore) || 0,
      // Round 2 (May 2026): mcTotal is now dynamic per-exam, not 40.
      // Legacy submissions without mcMaxPoints fall back to 40.
      mcTotal: Number(submissionData.mcMaxPoints) || 40,
      correctCount: Number(submissionData.correct) || 0,
      totalQuestions: (submissionData.mcQuestions || []).length || 20,
      // Round 2: pass the scoring rules so Gemini's feedback is accurate
      // about why the score is what it is (e.g., explains penalty losses).
      mcBreakdown: submissionData.mcBreakdown || null,
      wrongOrSkipped: wrongOrSkipped,
      codingSummary: codingSummary,
    };

    // Try the proxy with a generous timeout — Gemini text responses
    // can take 5-15 seconds. If it fails, fall back locally.
    try {
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 35000); // 35s
      const resp = await fetch("/api/feedback-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) {
        const errTxt = await resp.text().catch(() => "");
        console.warn(
          "[AIFeedback] HTTP " + resp.status + ": " + errTxt.slice(0, 200),
        );
        return localFallback(studentName, wrongOrSkipped);
      }
      const data = await resp.json();
      // Validate shape
      if (
        !data ||
        !data.en ||
        !data.uz ||
        !data.ru ||
        !Array.isArray(data.en.recommendations) ||
        data.en.recommendations.length === 0
      ) {
        console.warn("[AIFeedback] Malformed response, using local fallback");
        return localFallback(studentName, wrongOrSkipped);
      }
      data.fallback = false;
      return data;
    } catch (err) {
      console.warn("[AIFeedback] Request failed:", err);
      return localFallback(studentName, wrongOrSkipped);
    }
  }

  // -----------------------------------------------------------------
  // Payload builders
  // -----------------------------------------------------------------

  function buildWrongList(submissionData) {
    const questions = submissionData.mcQuestions || [];
    const userAnswers = submissionData.userAnswers || [];
    // Note: optionOrders is intentionally NOT destructured here.
    // userAnswers already holds BANK-indices, so no shuffled→bank
    // translation is needed for the AI feedback payload.
    const out = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q) continue;
      const userIdx = userAnswers[i];
      const isAnswered =
        userIdx !== -1 && userIdx !== undefined && userIdx !== null;
      const isCorrect = isAnswered && userIdx === q.correct;
      if (isCorrect) continue; // skip correct answers — saves tokens

      // The displayed options were shuffled at exam time; for AI
      // feedback we use the ORIGINAL option order from the bank,
      // because we want Gemini to reason about what's actually being
      // asked. We pass the correct + chosen indices in BANK order too.
      const opts = Array.isArray(q.opts) ? q.opts : [];
      const optionTexts = opts.map((o) => {
        if (typeof o === "string") return stripHtml(o);
        if (o && typeof o === "object")
          return stripHtml(o.en || o.uz || o.ru || "");
        return "";
      });

      // userAnswers[i] already stores the BANK-index of what the
      // student clicked (set in app.js renderQuestions click handler).
      // The earlier "translate via order[userIdx]" was based on a
      // wrong mental model and scrambled the index — use it directly.
      const userIdxInBank = isAnswered ? userIdx : -1;

      out.push({
        questionEn: stripHtml(q.en || ""),
        options: optionTexts,
        correctIndex: typeof q.correct === "number" ? q.correct : 0,
        userIndex: userIdxInBank,
        status: isAnswered ? "wrong" : "skipped",
      });
    }
    return out;
  }

  function buildCodingSummary(submissionData) {
    const titles = submissionData.codingTitles || [];
    const out = [];
    // FIX (May 23): loop bound is now dynamic. Previously hardcoded
    // `i <= 4`, which always sent 4 entries to Gemini regardless of
    // the exam's actual codingCount. That caused two visible
    // problems for a 2-problem exam:
    //   1. Gemini's feedback prose said "you attempted four coding
    //      problems" (because the prompt told it there were 4).
    //   2. The two phantom slots padded the prompt with empty data,
    //      wasting tokens.
    // We use the codingTitles array length as the source of truth —
    // it's already filled correctly by app.js from the resolved
    // coding-problem array at submission time.
    const n = titles.length;
    for (let i = 1; i <= n; i++) {
      const t = titles[i - 1] || {};
      const code = submissionData["code" + i] || "";
      const starter = submissionData["starter" + i] || "";
      // Only include problems where the student actually wrote something
      // beyond the starter code (rough heuristic for "attempted").
      const meaningfulCode = code.trim() !== starter.trim();
      out.push({
        title: t.en || "Problem " + i,
        maxPoints: t.maxPoints || 0,
        codeLength: code.length,
        attempted: meaningfulCode,
      });
    }
    return out;
  }

  // -----------------------------------------------------------------
  // HTML utilities — questions contain <pre><code>, <br>, &lt;, etc.
  // We need plain text for Gemini, with code snippets preserved.
  // -----------------------------------------------------------------

  function stripHtml(html) {
    if (typeof html !== "string") return "";
    // Replace tags that should become whitespace
    let s = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(pre|code|p|div|span)[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "");
    // Decode common entities
    s = s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
    // Collapse excessive whitespace (but keep newlines)
    s = s
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return s.slice(0, 1200); // hard cap per question
  }

  // -----------------------------------------------------------------
  // Local fallback — runs when Gemini is unavailable
  // -----------------------------------------------------------------
  // Builds a deterministic, deeply-generic feedback message based on
  // how many questions the student got wrong. Not as good as Gemini's
  // output but ensures the section always renders.

  function localFallback(studentName, wrongOrSkipped) {
    const n = wrongOrSkipped.length;
    const enHead =
      n === 0
        ? "Excellent work, " +
          studentName +
          "! You answered every multiple-choice question correctly."
        : "Nice effort, " +
          studentName +
          ". Here are some topics to review before your next exam.";
    const uzHead =
      n === 0
        ? "Ajoyib natija, " +
          studentName +
          "! Siz barcha test savollariga to'g'ri javob berdingiz."
        : "Yaxshi harakat, " +
          studentName +
          ". Keyingi imtihondan oldin ko'rib chiqishingiz kerak bo'lgan mavzular.";
    const ruHead =
      n === 0
        ? "Отличная работа, " +
          studentName +
          "! Вы правильно ответили на все вопросы с выбором ответа."
        : "Хорошая попытка, " +
          studentName +
          ". Темы для повторения перед следующим экзаменом.";

    const enRecs = [
      {
        topic: "C++ Fundamentals Review",
        advice:
          n === 0
            ? "Even with a perfect score, deepen your understanding by exploring how the C++ compiler handles type conversions, scope, and memory."
            : "Walk through each missed question with your instructor or a study partner. Identify exactly which concept tripped you up — usually it's a small detail.",
        resources: "cppreference.com, learncpp.com, ask your instructor",
      },
      {
        topic: "Practice with Code Tracing",
        advice:
          "Take small C++ snippets and trace them by hand on paper, predicting the output before running them. This builds the mental model that exam questions test.",
        resources: "C++ code-tracing exercises, online C++ practice platforms",
      },
      {
        topic: "Pointers and Memory",
        advice:
          "Pointers are the most commonly missed topic. Make sure you understand the difference between an address, a pointer, and what it points to.",
        resources:
          "cppreference.com on pointers, C++ pointer fundamentals tutorials",
      },
    ];
    const uzRecs = [
      {
        topic: "C++ asoslarini takrorlash",
        advice:
          n === 0
            ? "Mukammal natijaga erishgan bo'lsangiz ham, C++ kompilyatori tip konvertatsiyasi, qamrov va xotira bilan qanday ishlashini chuqurroq o'rganing."
            : "Har bir noto'g'ri javob bergan savolingizni o'qituvchi yoki guruhdoshingiz bilan ko'rib chiqing. Aniq qaysi tushuncha sizni qiyinlashtirgaganini aniqlang.",
        resources: "cppreference.com, learncpp.com, o'qituvchidan so'rang",
      },
      {
        topic: "Kod kuzatuvini mashq qilish",
        advice:
          "Kichik C++ kod parchalarini qog'ozda qo'l bilan kuzatib, ishga tushirishdan oldin natijani bashorat qiling. Bu imtihonda sinaladigan fikrlash modelini quradi.",
        resources:
          "C++ kod kuzatuvi mashqlari, onlayn C++ amaliyot platformalari",
      },
      {
        topic: "Ko'rsatkichlar va xotira",
        advice:
          "Ko'rsatkichlar eng ko'p xatoga uchraydigan mavzudir. Manzil, ko'rsatkich va u nimaga ishora qilishi orasidagi farqni yaxshilab tushuning.",
        resources:
          "cppreference.com ko'rsatkichlar bo'limi, C++ ko'rsatkichlari asoslari",
      },
    ];
    const ruRecs = [
      {
        topic: "Повторение основ C++",
        advice:
          n === 0
            ? "Даже с идеальным результатом углубите понимание того, как компилятор C++ обрабатывает преобразования типов, область видимости и память."
            : "Разберите каждый пропущенный вопрос с преподавателем или одногруппником. Точно определите, какая концепция вас затруднила.",
        resources: "cppreference.com, learncpp.com, обратитесь к преподавателю",
      },
      {
        topic: "Практика трассировки кода",
        advice:
          "Берите небольшие фрагменты C++ и трассируйте их вручную на бумаге, предсказывая вывод перед запуском. Это формирует мысленную модель, которую проверяют экзаменационные вопросы.",
        resources:
          "Упражнения по трассировке кода C++, онлайн-платформы по C++",
      },
      {
        topic: "Указатели и память",
        advice:
          "Указатели — самая часто пропускаемая тема. Убедитесь, что понимаете разницу между адресом, указателем и тем, на что он указывает.",
        resources: "cppreference.com раздел указателей, основы указателей C++",
      },
    ];

    return {
      en: { headline: enHead, recommendations: enRecs },
      uz: { headline: uzHead, recommendations: uzRecs },
      ru: { headline: ruHead, recommendations: ruRecs },
      fallback: true,
    };
  }
})();
