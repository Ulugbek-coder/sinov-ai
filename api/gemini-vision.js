// =============================================================
// /api/gemini-vision.js — Vercel Serverless Function
// -------------------------------------------------------------
// Generic single-image vision proxy. Used by Feature 5
// (Verification Photo) for eyeglass detection, but designed to be
// reusable for any "look at this image and answer in JSON" task.
//
// Why a separate endpoint vs. reusing /api/proctor-analyze?
//   proctor-analyze is tightly coupled to the proctoring schema:
//   trigger types, fixed response shape (description / confidence /
//   flags). Glasses detection doesn't fit that schema and shouldn't
//   pollute the proctoring code path. Keeping them separate also
//   means rate-limit issues on one don't cascade to the other.
//
// Why server-side?
//   The Gemini API key MUST NOT be exposed in client code. This proxy
//   uses GEMINI_API_KEY from Vercel environment variables.
//
// Request body (JSON):
//   {
//     task:       "glasses_detection" | "id_match" | ...   (logging label only)
//     prompt:     "<the full text prompt to Gemini>"
//     imageBase64: "<jpeg/png base64, no data:URI prefix>"
//     mimeType:   "image/jpeg" | "image/png"   (optional, defaults to jpeg)
//   }
//
// Successful response (JSON):
//   { text: "<raw model output>" }
//
//   The caller is responsible for parsing the text (typically JSON).
//   This proxy intentionally does NOT validate the model's output
//   structure — the model is asked for JSON in the prompt itself.
//
// Error response: HTTP 4xx/5xx with { error: "..." }
//
// Environment variables required (set in Vercel dashboard):
//   GEMINI_API_KEY  -> get from https://aistudio.google.com/apikey
// =============================================================
require("./_load-env");
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  "gemini-2.5-flash-lite:generateContent";

const MAX_IMAGE_BYTES = 800 * 1024; // ~800 KB; selfies are ~30-80 KB
const FETCH_TIMEOUT_MS = 10000;
const MAX_PROMPT_LEN = 4000;

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
  // Body parsing — accept already-parsed object, or parse string body
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
  const task = String(body.task || "unspecified").slice(0, 64);
  const prompt = body.prompt;
  const imageBase64 = body.imageBase64;
  const mimeType = body.mimeType || "image/jpeg";

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Missing 'prompt' field." });
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return res.status(400).json({
      error:
        "Prompt too long (" +
        prompt.length +
        " chars, max " +
        MAX_PROMPT_LEN +
        ").",
    });
  }
  if (typeof imageBase64 !== "string" || !imageBase64) {
    return res.status(400).json({ error: "Missing 'imageBase64' field." });
  }
  // Approximate decoded size — base64 expands by 4/3
  const approxBytes = Math.floor((imageBase64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return res.status(413).json({
      error:
        "Image too large (" +
        approxBytes +
        " bytes, max " +
        MAX_IMAGE_BYTES +
        ").",
    });
  }
  if (
    mimeType !== "image/jpeg" &&
    mimeType !== "image/png" &&
    mimeType !== "image/webp"
  ) {
    return res.status(400).json({
      error: "Unsupported mimeType. Use image/jpeg, image/png, or image/webp.",
    });
  }

  // -----------------------------------------------------------------
  // API key check
  // -----------------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[gemini-vision] GEMINI_API_KEY env var is not set");
    return res.status(500).json({
      error:
        "Server is missing the Gemini API key. Set GEMINI_API_KEY in Vercel " +
        "environment variables and redeploy.",
    });
  }

  // -----------------------------------------------------------------
  // Build Gemini payload
  // -----------------------------------------------------------------
  const geminiPayload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      // Glasses detection wants determinism, not creativity.
      temperature: 0.1,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
    },
  };

  // -----------------------------------------------------------------
  // Call Gemini with a hard timeout so a slow API doesn't hang
  // the student's browser indefinitely.
  //
  // FIX (May 23): single retry on 503. Gemini's free tier returns
  // 503 "high demand" frequently during peak hours — the client
  // already had 3 retry attempts on the verification-photo modal,
  // but each of those retries was firing one Gemini call and giving
  // up on 503, which made the modal feel broken even though the
  // condition was transient. One server-side retry with a short
  // 800ms backoff catches most transient overloads without making
  // the user wait long. We deliberately do NOT retry on 429
  // (quota-exhausted) — that's not transient, and a retry would
  // just burn more daily quota.
  // -----------------------------------------------------------------
  const MAX_GEMINI_ATTEMPTS = 2; // initial + 1 retry on 503
  const controller = new AbortController();
  const t = setTimeout(function () {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  let geminiResp = null;
  let lastFetchErr = null;
  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    try {
      geminiResp = await fetch(GEMINI_API_URL + "?key=" + apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
        signal: controller.signal,
      });
      lastFetchErr = null;
    } catch (err) {
      lastFetchErr = err;
      geminiResp = null;
      // Don't retry on fetch-level errors (network / abort). The
      // upstream timeout handles them.
      break;
    }
    // Retry only on transient overload (503). Anything else
    // (400/401/403/429/200/etc.) we keep and let the normal
    // post-loop logic handle.
    if (geminiResp.status === 503 && attempt < MAX_GEMINI_ATTEMPTS) {
      console.log(
        "[gemini-vision] 503 on attempt " +
          attempt +
          ", retrying in 800ms (task=" +
          task +
          ")",
      );
      await new Promise(function (r) {
        setTimeout(r, 800);
      });
      continue;
    }
    break;
  }
  clearTimeout(t);

  if (lastFetchErr) {
    if (lastFetchErr.name === "AbortError") {
      console.warn(
        "[gemini-vision] timed out after " + FETCH_TIMEOUT_MS + "ms",
        { task: task },
      );
      return res.status(504).json({ error: "Gemini API timed out." });
    }
    console.error("[gemini-vision] fetch threw", lastFetchErr, {
      task: task,
    });
    return res.status(502).json({ error: "Gemini API request failed." });
  }

  // -----------------------------------------------------------------
  // Parse Gemini response
  // -----------------------------------------------------------------
  let geminiJson;
  try {
    geminiJson = await geminiResp.json();
  } catch (err) {
    console.error("[gemini-vision] response was not JSON", { task: task });
    return res.status(502).json({ error: "Gemini API returned non-JSON." });
  }
  if (!geminiResp.ok) {
    const code =
      (geminiJson && geminiJson.error && geminiJson.error.code) ||
      geminiResp.status;
    const msg =
      (geminiJson && geminiJson.error && geminiJson.error.message) ||
      "Gemini error";
    console.warn("[gemini-vision] Gemini returned error", {
      code: code,
      msg: msg,
      task: task,
    });
    return res.status(502).json({ error: "Gemini: " + msg });
  }

  // Extract the model text response. Defensive against shape changes.
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
  } catch (err) {
    console.warn("[gemini-vision] could not extract text", err);
  }

  if (!text) {
    return res.status(502).json({ error: "Gemini returned empty response." });
  }
  return res.status(200).json({ text: text });
};
