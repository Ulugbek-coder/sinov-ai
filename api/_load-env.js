// Manually load .env.local — workaround for Vercel CLI not reading it.
// Only runs locally (no-op in production where Vercel injects env directly).
const path = require("path");
const fs = require("fs");

if (!process.env.VERCEL && !process.env.GEMINI_API_KEY) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
  }
}

module.exports = {};
