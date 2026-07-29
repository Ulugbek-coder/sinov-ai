// =============================================================
// /api/fetch-pdf.js  —  same-origin proxy for Firebase Storage PDFs
// =============================================================
// WHY THIS EXISTS
//
// The admin dashboard's "Download all PDFs" feature zips submission
// reports in the browser, which means fetching each PDF with fetch().
// Google Cloud Storage only answers cross-origin XHR/fetch when the
// BUCKET has a CORS policy allowing this site's origin. Buckets ship
// without one, so the browser blocks every request and the ZIP comes
// back empty.
//
// Configuring bucket CORS is the proper fix and is documented in the
// README — but it needs project-owner access to Google Cloud, which
// the instructor running an exam may not have to hand. This endpoint
// removes that dependency: the browser calls OUR OWN origin (no CORS
// involved at all), and this function fetches from Storage
// server-to-server, where CORS does not apply.
//
// -------------------------------------------------------------
// SECURITY MODEL
// -------------------------------------------------------------
// This endpoint is deliberately NOT a general-purpose URL fetcher.
// Two hard constraints:
//
//   1. The target host must be exactly `firebasestorage.googleapis.com`.
//   2. The target path must reference THIS project's bucket.
//
// Beyond that it relies on the same secret the browser would use
// directly: a Firebase download URL embeds an unguessable `token`
// query parameter, and Storage rejects the request without it. So the
// proxy grants no access that the caller did not already possess — an
// attacker holding a valid tokenized URL could simply fetch it
// themselves. What the proxy does NOT do is let anyone enumerate or
// reach objects they have no token for.
//
// If you later want this locked down further, the natural step is to
// require a Firebase ID token in an Authorization header and verify it
// with firebase-admin before proxying.
// =============================================================

const ALLOWED_HOST = "firebasestorage.googleapis.com";

// Bucket for this deployment. Kept in sync with js/firebase-config.js.
// Overridable by env var so staging/prod can share this file.
const ALLOWED_BUCKET =
  process.env.FIREBASE_STORAGE_BUCKET || "sinov-ai-platform.firebasestorage.app";

// Refuse anything implausibly large so a malformed request can't tie up
// the function. Exam reports are a few hundred KB at most.
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

module.exports = async function handler(req, res) {
  // Same-origin only in practice, but be explicit for preflight safety.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const raw =
    (req.query && req.query.url) || (req.body && req.body.url) || null;

  if (!raw || typeof raw !== "string") {
    res.status(400).json({
      error: "missing_url",
      message: "Provide the Firebase Storage download URL as ?url=…",
    });
    return;
  }

  let target;
  try {
    target = new URL(raw);
  } catch (e) {
    res.status(400).json({
      error: "bad_url",
      message: "The supplied url is not a valid absolute URL.",
    });
    return;
  }

  // --- Constraint 1: host allow-list ---
  if (target.hostname !== ALLOWED_HOST) {
    res.status(403).json({
      error: "host_not_allowed",
      message:
        "This proxy only serves " +
        ALLOWED_HOST +
        ". Refusing to fetch " +
        target.hostname +
        ".",
    });
    return;
  }

  // --- Constraint 2: this project's bucket only ---
  // Download URLs look like /v0/b/<bucket>/o/<encoded-path>?alt=media&token=…
  if (target.pathname.indexOf("/b/" + ALLOWED_BUCKET + "/") === -1) {
    res.status(403).json({
      error: "bucket_not_allowed",
      message: "This proxy only serves objects from " + ALLOWED_BUCKET + ".",
    });
    return;
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      // Nothing to add: the download token already travels in the URL.
      headers: { Accept: "application/pdf,*/*" },
    });

    if (!upstream.ok) {
      // Pass the real status through so the dashboard can tell a
      // permissions problem (403) from a deleted file (404).
      res.status(upstream.status).json({
        error: "upstream_error",
        status: upstream.status,
        message:
          "Firebase Storage returned " +
          upstream.status +
          " " +
          (upstream.statusText || ""),
      });
      return;
    }

    const len = Number(upstream.headers.get("content-length") || 0);
    if (len && len > MAX_BYTES) {
      res.status(413).json({
        error: "too_large",
        message: "File exceeds the " + MAX_BYTES + " byte proxy limit.",
      });
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > MAX_BYTES) {
      res.status(413).json({
        error: "too_large",
        message: "File exceeds the " + MAX_BYTES + " byte proxy limit.",
      });
      return;
    }

    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/pdf",
    );
    res.setHeader("Content-Length", String(buf.length));
    // These are per-student documents — never let a shared cache hold them.
    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).send(buf);
  } catch (err) {
    console.error("[fetch-pdf] proxy failed:", err);
    res.status(502).json({
      error: "proxy_failed",
      message: String((err && err.message) || err),
    });
  }
};
