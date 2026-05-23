// =============================================================
// /api/grade-code.js — Vercel Serverless Function
// -------------------------------------------------------------
// Receives a single C++ coding problem + a student's submitted
// code and asks Gemini to grade it against a 4-factor rubric:
//
//   1. Correctness  (60%)  — Does the code solve the problem?
//   2. Code Quality (20%)  — Readable, well-organized, properly named?
//   3. Efficiency   (10%)  — Reasonable algorithmic choice?
//   4. Edge Cases   (10%)  — Handles boundary conditions?
//
// Returns a numeric score (out of `maxPoints`), per-category
// percentage breakdowns, per-category comments, and a 1-2 sentence
// summary. Strictly JSON.
//
// Why a separate endpoint vs reusing /api/gemini-vision?
//   gemini-vision is multimodal (image + text). This endpoint is
//   text-only and uses Gemini 2.5 Flash (smarter at code reasoning
//   than Flash-Lite). Different cost / latency / quality profile.
//
// Request body (JSON):
//   {
//     problemTitle:       string,
//     problemDescription: string,   // joined bullet points
//     starterCode:        string,   // the code the student started from
//     studentCode:        string,   // the code the student submitted
//     maxPoints:          number    // 10 | 15 | 20 typically
//   }
//
// Successful response (JSON):
//   {
//     score: 8,
//     maxPoints: 10,
//     breakdown: {
//       correctness: 80,    // 0-100 percentage
//       codeQuality: 100,
//       efficiency:  100,
//       edgeCases:   0
//     },
//     categoryComments: {
//       correctness: "Solution is correct for normal inputs but fails for n=0.",
//       codeQuality: "Variable names are clear; consistent indentation.",
//       efficiency:  "O(n) — appropriate for the problem size.",
//       edgeCases:   "Missing handling of empty input."
//     },
//     summary: "Solid attempt overall. Add a guard clause for empty input."
//   }
//
// Environment variables required:
//   GEMINI_API_KEY  -> set in Vercel project settings
// =============================================================

require("./_load-env");

// Gemini 2.5 Flash — better at code reasoning than Flash-Lite.
// Costs more quota but each grading call is ~1500 input tokens, well
// within free-tier limits for hackathon scale (~hundreds of calls/day).
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  "gemini-2.5-flash:generateContent";

const FETCH_TIMEOUT_MS = 30000; // 30 s — grading is text-heavy
const MAX_CODE_LEN = 8000; // hard cap per submitted code field
const MAX_DESCRIPTION_LEN = 3000; // hard cap per problem description

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // -----------------------------------------------------------------
  // Body parsing
  // -----------------------------------------------------------------
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_e) {
      return res.status(400).json({ error: "Body is not valid JSON." });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Missing request body." });
  }

  const problemTitle = String(body.problemTitle || "").slice(0, 200);
  const problemDescription = String(body.problemDescription || "").slice(
    0,
    MAX_DESCRIPTION_LEN,
  );
  const starterCode = String(body.starterCode || "").slice(0, MAX_CODE_LEN);
  const studentCode = String(body.studentCode || "").slice(0, MAX_CODE_LEN);
  const maxPoints = Number(body.maxPoints);

  if (!problemTitle || !problemDescription) {
    return res
      .status(400)
      .json({ error: "problemTitle and problemDescription are required." });
  }
  if (!studentCode) {
    return res.status(400).json({ error: "studentCode is required." });
  }
  if (!Number.isFinite(maxPoints) || maxPoints < 1 || maxPoints > 100) {
    return res.status(400).json({ error: "maxPoints must be 1-100." });
  }

  // -----------------------------------------------------------------
  // API key check
  // -----------------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[grade-code] GEMINI_API_KEY env var is not set");
    return res.status(500).json({
      error:
        "Server is missing the Gemini API key. Set GEMINI_API_KEY in Vercel " +
        "environment variables and redeploy.",
    });
  }

  // -----------------------------------------------------------------
  // Strict-format rubric prompt
  // -----------------------------------------------------------------
  // Prompt design notes:
  //   - We tell Gemini explicitly NOT to be lenient — the default
  //     LLM behavior is to be generous with credit.
  //   - We give weighted category percentages (60/20/10/10) so the
  //     final score reflects the rubric, not just "did it compile".
  //   - We demand STRICT JSON (no markdown fences). The responseMimeType
  //     in generationConfig also enforces this server-side.
  //   - We show the starter code so Gemini can recognize boilerplate
  //     and credit only the student's actual changes for code quality.
  const prompt =
    "You are an experienced C++ instructor grading a student's exam submission.\n\n" +
    "Grade the student's code STRICTLY against the rubric below. Be fair but rigorous — " +
    "this is a real exam, not a participation award.\n\n" +
    "----------------------------------------\n" +
    "PROBLEM TITLE: " +
    problemTitle +
    "\n" +
    "MAXIMUM POINTS: " +
    maxPoints +
    "\n\n" +
    "PROBLEM DESCRIPTION:\n" +
    problemDescription +
    "\n\n" +
    "----------------------------------------\n" +
    "STARTER CODE (the boilerplate the student began with — do NOT credit this as their work):\n" +
    "```cpp\n" +
    starterCode +
    "\n```\n\n" +
    "STUDENT'S SUBMITTED CODE:\n" +
    "```cpp\n" +
    studentCode +
    "\n```\n\n" +
    "----------------------------------------\n" +
    "GRADING RUBRIC (weighted):\n" +
    "  1. Correctness   (60% of points) — Does the code produce the expected output? Does it solve what the problem describes?\n" +
    "  2. Code Quality  (20% of points) — Clean structure, sensible variable names, proper indentation. Boilerplate from starter code is NOT credited.\n" +
    "  3. Efficiency    (10% of points) — Reasonable algorithmic choice for the problem size. (Don't penalize O(n) when O(n) is fine.)\n" +
    "  4. Edge Cases    (10% of points) — Handles boundary cases (empty input, zero, negatives, etc.) where the problem implies it should.\n\n" +
    "SCORING GUIDANCE:\n" +
    "  - If the code is empty, identical to the starter, or trivially wrong: score 0 for all categories.\n" +
    "  - If correctness is 0% (code does not solve the problem at all), the maximum overall score is " +
    Math.floor(maxPoints * 0.2) +
    " (max possible from quality/efficiency/edge alone).\n" +
    "  - Award partial credit for a partial solution that gets the right idea but fails on some inputs.\n" +
    "  - Do NOT credit a syntactically broken program for code quality.\n" +
    "  - If the student's code is essentially unchanged from the starter, the grade should reflect that — typically a low single-digit score.\n\n" +
    "Respond with STRICT JSON ONLY (no markdown, no code fences, no commentary " +
    "outside the JSON object). Use this exact schema:\n\n" +
    "{\n" +
    '  "score": <integer 0 to ' +
    maxPoints +
    ">,\n" +
    '  "breakdown": {\n' +
    '    "correctness": <integer 0-100>,\n' +
    '    "codeQuality": <integer 0-100>,\n' +
    '    "efficiency":  <integer 0-100>,\n' +
    '    "edgeCases":   <integer 0-100>\n' +
    "  },\n" +
    '  "categoryComments": {\n' +
    '    "correctness": "<one short sentence>",\n' +
    '    "codeQuality": "<one short sentence>",\n' +
    '    "efficiency":  "<one short sentence>",\n' +
    '    "edgeCases":   "<one short sentence>"\n' +
    "  },\n" +
    '  "summary": "<one or two sentences summarizing the grade>"\n' +
    "}";

  const geminiPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      // Low temperature — we want consistent grading, not creative grading.
      temperature: 0.2,
      // Was 800. Bumped to 1500 because per-category comments + summary
      // can easily exceed 800 tokens for non-trivial code, and Gemini
      // truncates mid-JSON when the limit is hit. The output is always
      // JSON-shaped so 1500 is plenty of headroom for our schema.
      maxOutputTokens: 1500,
      responseMimeType: "application/json",
    },
  };

  // -----------------------------------------------------------------
  // Call Gemini with a hard timeout
  // -----------------------------------------------------------------
  const controller = new AbortController();
  const t = setTimeout(function () {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  let geminiResp;
  try {
    geminiResp = await fetch(GEMINI_API_URL + "?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(t);
    if (err && err.name === "AbortError") {
      console.warn("[grade-code] timeout after " + FETCH_TIMEOUT_MS + "ms");
      return res.status(504).json({ error: "Grading timed out — try again." });
    }
    console.error("[grade-code] fetch threw", err);
    return res.status(502).json({ error: "Grading service unreachable." });
  }
  clearTimeout(t);

  let geminiJson;
  try {
    geminiJson = await geminiResp.json();
  } catch (_err) {
    return res
      .status(502)
      .json({ error: "Grading service returned non-JSON." });
  }
  if (!geminiResp.ok) {
    const msg =
      (geminiJson && geminiJson.error && geminiJson.error.message) ||
      "Gemini error";
    console.warn("[grade-code] Gemini returned error", msg);
    return res.status(502).json({ error: "Gemini: " + msg });
  }

  // -----------------------------------------------------------------
  // Extract + validate model output
  // -----------------------------------------------------------------
  let text = "";
  try {
    const cand = geminiJson.candidates && geminiJson.candidates[0];
    const parts = cand && cand.content && cand.content.parts;
    if (parts && parts.length) {
      text = parts
        .map(function (p) {
          return p.text || "";
        })
        .join("")
        .trim();
    }
  } catch (_err) {
    /* ignored */
  }

  if (!text) {
    return res.status(502).json({ error: "Gemini returned empty response." });
  }

  let parsed;
  try {
    // Be forgiving: strip any accidental markdown fences before parsing.
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    parsed = JSON.parse(cleaned);
  } catch (_err) {
    // Salvage attempt: Gemini sometimes truncates mid-JSON when output
    // tokens are exhausted or the connection is interrupted. Try to
    // extract whatever fields are present using regex. This is gross
    // but better than failing the whole grade — the instructor can
    // still see partial AI feedback and override if needed.
    console.warn(
      "[grade-code] could not parse JSON from model:",
      text.slice(0, 200),
    );
    const salvage = _salvagePartialJson(text);
    if (salvage) {
      parsed = salvage;
      parsed._partial = true;
    } else {
      return res
        .status(502)
        .json({ error: "Grading response was not valid JSON." });
    }
  }

  // -----------------------------------------------------------------
  // Validate schema + clamp values to safe ranges
  // -----------------------------------------------------------------
  const clamp = function (n, min, max) {
    const v = Number(n);
    if (!Number.isFinite(v)) return min;
    return Math.max(min, Math.min(max, v));
  };
  const safeStr = function (s) {
    if (typeof s !== "string") return "";
    return s.slice(0, 300);
  };
  const breakdown = (parsed && parsed.breakdown) || {};
  const comments = (parsed && parsed.categoryComments) || {};

  const result = {
    score: Math.round(clamp(parsed && parsed.score, 0, maxPoints)),
    maxPoints: maxPoints,
    breakdown: {
      correctness: Math.round(clamp(breakdown.correctness, 0, 100)),
      codeQuality: Math.round(clamp(breakdown.codeQuality, 0, 100)),
      efficiency: Math.round(clamp(breakdown.efficiency, 0, 100)),
      edgeCases: Math.round(clamp(breakdown.edgeCases, 0, 100)),
    },
    categoryComments: {
      correctness: safeStr(comments.correctness),
      codeQuality: safeStr(comments.codeQuality),
      efficiency: safeStr(comments.efficiency),
      edgeCases: safeStr(comments.edgeCases),
    },
    summary: safeStr(parsed && parsed.summary),
    gradedBy: "gemini-2.5-flash",
  };

  return res.status(200).json(result);
};

// Regex-based fallback for when Gemini truncates JSON mid-output.
// Returns a partial object with whatever numeric/string fields we
// could extract, or null if nothing usable was found.
function _salvagePartialJson(text) {
  if (!text || typeof text !== "string") return null;
  const obj = {};
  // Pull "score": <number>
  const scoreMatch = text.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/);
  if (scoreMatch) obj.score = parseFloat(scoreMatch[1]);
  // Pull breakdown percentages
  const breakdown = {};
  ["correctness", "codeQuality", "efficiency", "edgeCases"].forEach(
    function (k) {
      const re = new RegExp('"' + k + '"\\s*:\\s*(\\d+(?:\\.\\d+)?)');
      const m = text.match(re);
      if (m) breakdown[k] = parseFloat(m[1]);
    },
  );
  if (Object.keys(breakdown).length) obj.breakdown = breakdown;
  // Pull category comments — they live inside "categoryComments": { ... }
  const ccBlock = text.match(/"categoryComments"\s*:\s*\{([^}]*)\}/);
  if (ccBlock) {
    const comments = {};
    ["correctness", "codeQuality", "efficiency", "edgeCases"].forEach(
      function (k) {
        const re = new RegExp(
          '"' + k + '"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"',
        );
        const m = ccBlock[1].match(re);
        if (m) comments[k] = m[1];
      },
    );
    if (Object.keys(comments).length) obj.categoryComments = comments;
  }
  // Pull top-level "summary": "..."
  const sumMatch = text.match(/"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
  if (sumMatch) obj.summary = sumMatch[1];
  // Only return if we got at least a score OR a breakdown
  if (obj.score == null && !obj.breakdown) return null;
  return obj;
}
