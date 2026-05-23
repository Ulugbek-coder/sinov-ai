// =============================================================
// /api/proctor-analyze.js — Vercel Serverless Function
// -------------------------------------------------------------
// Receives a webcam frame (base64 JPEG) from the student's browser
// when MediaPipe in-browser detection flags an anomaly. Sends the
// frame to Gemini 2.5 Flash with a structured "what's happening in
// this exam-monitoring scene?" prompt, and returns a JSON verdict.
//
// Why server-side?
//   The Gemini API key MUST NOT be exposed in client code. This proxy
//   uses GEMINI_API_KEY from Vercel environment variables and keeps
//   the key on the server.
//
// Why Gemini 2.5 Flash?
//   - Free tier covers ~500 RPD / 10 RPM per project — plenty for our
//     escalation pattern (typically 5-20 calls per student per exam).
//   - Multimodal (vision) input is included in free tier.
//   - Faster than 2.5 Pro and 2.5 Flash-Lite supports vision too.
//
// Request body (JSON):
//   { imageBase64: "<jpeg-base64>", triggerType: "no_face"|"multiple_faces"|... }
//
// Successful response (JSON):
//   {
//     description: "string scene description",
//     confidence:  0..1 (Gemini's self-rated certainty),
//     flags: {
//       phone_visible: bool,
//       second_person: bool,
//       suspicious: bool
//     }
//   }
//
// Error response: HTTP 4xx/5xx with { error: "..." }
//
// Environment variables required (set in Vercel dashboard):
//   GEMINI_API_KEY  -> get from https://aistudio.google.com/apikey
// =============================================================

// Gemini 2.5 Flash-Lite — the throughput-optimized variant.
// On Google's free tier (May 2026): 15 RPM and 1000 RPD per project,
// vs Flash's 10 RPM and 250 RPD. Flash-Lite is plenty smart for our
// task (binary checks: "is there a phone in this frame"), and the 4x
// higher RPD lets a single demo session run many more students.
require("./_load-env");
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  "gemini-2.5-flash-lite:generateContent";

// Hard limits — protect the function from runaway costs / abuse
const MAX_IMAGE_BYTES = 600 * 1024; // ~600 KB; our frames are ~30 KB
const FETCH_TIMEOUT_MS = 10000;

module.exports = async function handler(req, res) {
  // -----------------------------------------------------------------
  // CORS (same-origin in Vercel, but be explicit)
  // -----------------------------------------------------------------
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
  // Read request body
  // -----------------------------------------------------------------
  let body = req.body;
  // Vercel auto-parses JSON if Content-Type is application/json; but if
  // the runtime passes a raw string, parse it ourselves.
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Missing JSON body" });
  }

  const imageBase64 = body.imageBase64;
  const triggerType = String(body.triggerType || "unknown");

  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    return res.status(400).json({ error: "imageBase64 missing or too short" });
  }
  // Rough byte-length estimate from base64 length: bytes ≈ b64.length * 0.75
  const approxBytes = Math.floor(imageBase64.length * 0.75);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return res.status(413).json({
      error:
        "Image too large (" +
        approxBytes +
        " bytes; limit " +
        MAX_IMAGE_BYTES +
        ")",
    });
  }

  // -----------------------------------------------------------------
  // Check API key
  // -----------------------------------------------------------------
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      "[proctor-analyze] GEMINI_API_KEY env var is not set on Vercel",
    );
    return res.status(503).json({ error: "Gemini API key not configured" });
  }

  // -----------------------------------------------------------------
  // Build Gemini request
  // -----------------------------------------------------------------
  // Prompt design notes:
  //   - For triggered escalations (multiple_faces, no_face, face_turned_away),
  //     Gemini's job is to CONFIRM and CLASSIFY, not to be conservative.
  //     If MediaPipe already detected multiple faces, Gemini should treat
  //     second_person=true as the default and only override if the second
  //     "face" is clearly an artifact (poster, photo on wall, reflection).
  //   - For scheduled (untriggered) frames — used to catch things MediaPipe
  //     can't see, like phones — Gemini IS conservative.
  //   - Always also detect a phone/notebook/secondary screen since those
  //     happen even with a single normal-looking face (the original bug:
  //     student holds a phone, face still looks at the camera).
  // Prompt design notes (REWRITTEN for v5):
  //   - The previous prompts focused on the trigger reason and let Gemini
  //     decide whether to even look at phones/notes/screens. Result:
  //     phones held visibly in frame were going undetected because
  //     Gemini focused on confirming the trigger and didn't check the
  //     rest of the scene aggressively.
  //   - New design: a UNIVERSAL CHECK that ALWAYS runs, regardless of
  //     trigger. Every Gemini call is now expected to evaluate ALL flags.
  //     The trigger-specific hint is just context, not the primary task.
  //   - Phones are treated as UNAMBIGUOUS — if Gemini can see anything
  //     that looks like a phone, smartphone, or mobile device in the
  //     frame, set phone_visible=true. No "maybe a phone".
  //   - Toys/dolls/stuffed animals are added to the artifact list for
  //     second_person checks (BlazeFace sometimes flags them as faces).
  const triggerHint = {
    no_face:
      "Context: MediaPipe could not detect the student's face for 5+ " +
      "seconds. The student may be absent, looking away, or have something " +
      "covering the camera (phone screen, notes, hand).",
    multiple_faces:
      "Context: MediaPipe detected more than one face in the frame. The " +
      "second 'face' may be a real person OR an artifact (toy, doll, " +
      "stuffed animal, photo on wall, mirror reflection, contact photo on " +
      "phone screen, painting). Distinguish carefully.",
    face_turned_away:
      "Context: MediaPipe detected the student's face turned away from " +
      "the camera. Identify what they may be looking at.",
    hand_detected:
      "Context: MediaPipe detected the student's hand sustained in the " +
      "frame for 1.5+ seconds. They may be holding something or just " +
      "gesturing naturally (scratching, chin-resting, adjusting glasses).",
    scheduled:
      "Context: This is a routine periodic check, not triggered by any " +
      "specific anomaly.",
  };
  const triggerNote =
    triggerHint[triggerType] || "Trigger type: " + triggerType + ".";

  // Universal check — applied to EVERY frame regardless of trigger.
  const universalCheck =
    "UNIVERSAL CHECK (run on every frame, regardless of why it was flagged):\n" +
    "  - phone_visible:  Set TRUE if you can see ANY phone, smartphone, " +
    "mobile device, or phone screen anywhere in the frame. Phones are " +
    "UNAMBIGUOUS — if you see something that looks like a phone, flag it. " +
    "Do not ask yourself 'maybe it's a phone, maybe it's a remote control'; " +
    "if it looks more like a phone than not, flag it.\n" +
    "  - notes_visible:  Set TRUE if you can see paper notes, an open " +
    "notebook, a textbook, or any printed material being held or near the " +
    "student.\n" +
    "  - second_screen:  Set TRUE if you can see another monitor, tablet, " +
    "laptop, or display in addition to what the student is using for the exam.\n" +
    "  - second_person:  Set TRUE only if you can see a REAL HUMAN face/body " +
    "besides the student. Set FALSE if the additional 'face' is a toy, doll, " +
    "stuffed animal, photo on a wall, painting, mirror reflection, or contact " +
    "photo on a phone screen.\n" +
    "  - suspicious:     Set TRUE if anything else looks unusual for an exam " +
    "(an earpiece, a smartwatch with notifications visible, written notes on " +
    "the hand/arm, etc.).";

  // Closing guidance — applied to every prompt
  const closingGuidance =
    "Important rules:\n" +
    "  - For phone_visible / notes_visible / second_screen: be DECISIVE. " +
    "These objects are unambiguous when present in a webcam frame.\n" +
    "  - DO NOT double-flag ONE object. If you see a single rectangular " +
    "object and you are unsure whether it's a phone or a tablet/laptop " +
    "screen, pick the MORE LIKELY one and flag only that. Setting both " +
    "phone_visible AND second_screen to true should only happen when " +
    "there are clearly TWO DISTINCT objects in the frame.\n" +
    "  - For second_person: be conservative. Real humans only, not toys, " +
    "dolls, stuffed animals, photos, or paintings.\n" +
    "  - If the frame is genuinely dark, blurry, or empty, set all flags " +
    "to false and explain in the description.";

  const promptText =
    "You are an exam proctoring assistant reviewing a single frame from a " +
    "student's webcam during an online exam.\n\n" +
    triggerNote +
    "\n\n" +
    universalCheck +
    "\n\n" +
    closingGuidance +
    "\n\n" +
    "Respond with STRICT JSON ONLY (no markdown, no code fences, no " +
    "commentary outside the JSON object). Use this exact schema:\n\n" +
    "{\n" +
    '  "description": "<one or two sentences describing what you see>",\n' +
    '  "confidence": <number between 0 and 1>,\n' +
    '  "flags": {\n' +
    '    "phone_visible":  <boolean>,\n' +
    '    "second_person":  <boolean>,\n' +
    '    "notes_visible":  <boolean>,\n' +
    '    "second_screen":  <boolean>,\n' +
    '    "suspicious":     <boolean>\n' +
    "  }\n" +
    "}";

  const geminiPayload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      // Force JSON output
      response_mime_type: "application/json",
      temperature: 0.2,
      maxOutputTokens: 300,
    },
    // Set safety to low blocking — for proctoring scenarios we WANT
    // descriptions of potentially suspicious behavior. We're not asking
    // Gemini to generate harmful content; we're asking it to describe
    // what's in an image.
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
      },
    ],
  };

  // -----------------------------------------------------------------
  // Call Gemini with timeout
  // -----------------------------------------------------------------
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let geminiJson;
  try {
    const resp = await fetch(GEMINI_API_URL + "?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(
        "[proctor-analyze] Gemini API HTTP " + resp.status + ": " + errText,
      );
      // Map common upstream errors to clearer messages
      if (resp.status === 429) {
        return res
          .status(429)
          .json({ error: "Gemini rate limit hit. Try again shortly." });
      }
      if (resp.status === 401 || resp.status === 403) {
        return res
          .status(503)
          .json({ error: "Gemini API key invalid or quota exhausted." });
      }
      return res
        .status(502)
        .json({ error: "Gemini upstream error", status: resp.status });
    }
    geminiJson = await resp.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Gemini request timed out" });
    }
    console.error("[proctor-analyze] fetch error:", err);
    return res
      .status(502)
      .json({ error: "Failed to reach Gemini API: " + (err.message || err) });
  }

  // -----------------------------------------------------------------
  // Parse Gemini response → forward to client
  // -----------------------------------------------------------------
  // Gemini response shape: candidates[0].content.parts[0].text === JSON string
  // (because we set response_mime_type: application/json).
  let parsed;
  try {
    const candidate =
      geminiJson &&
      geminiJson.candidates &&
      geminiJson.candidates[0] &&
      geminiJson.candidates[0].content;
    if (!candidate) {
      // Maybe blocked by safety. Log full response for debugging.
      console.warn(
        "[proctor-analyze] Gemini returned no candidate. Full response:",
        JSON.stringify(geminiJson),
      );
      // Return a neutral/empty verdict so the client logs the event with
      // no Gemini note (degraded gracefully).
      return res.status(200).json({
        description: "Vision analysis unavailable for this frame.",
        confidence: 0,
        flags: {
          phone_visible: false,
          second_person: false,
          notes_visible: false,
          second_screen: false,
          suspicious: false,
        },
      });
    }
    const text = candidate.parts[0].text || "{}";
    parsed = JSON.parse(text);
  } catch (err) {
    console.error("[proctor-analyze] failed to parse Gemini JSON:", err);
    return res.status(200).json({
      description: "Vision analysis returned an unparseable result.",
      confidence: 0,
      flags: {
        phone_visible: false,
        second_person: false,
        notes_visible: false,
        second_screen: false,
        suspicious: false,
      },
    });
  }

  // Final sanity check on shape — coerce anything missing into safe defaults
  const out = {
    description:
      typeof parsed.description === "string"
        ? parsed.description.slice(0, 500)
        : "",
    confidence:
      typeof parsed.confidence === "number" &&
      parsed.confidence >= 0 &&
      parsed.confidence <= 1
        ? parsed.confidence
        : 0.5,
    flags: {
      phone_visible: !!(parsed.flags && parsed.flags.phone_visible),
      second_person: !!(parsed.flags && parsed.flags.second_person),
      notes_visible: !!(parsed.flags && parsed.flags.notes_visible),
      second_screen: !!(parsed.flags && parsed.flags.second_screen),
      suspicious: !!(parsed.flags && parsed.flags.suspicious),
    },
  };

  return res.status(200).json(out);
};
