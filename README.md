# Sinov AI

**AI-enhanced exam platform for higher education.**
Built for the [Build with AI 2026 EdTech Hackathon](https://buildwithai.uz/) by the NPUU Digital Solutions team at New Uzbekistan University (Tashkent).

> *"Sinov"* (синов) means *examination* or *test* in Uzbek.

---

## What it does

Sinov AI is a production-ready exam platform with four AI-powered features layered on top of a battle-tested C++ exam engine. The platform has been used by real student cohorts at NPUU for Spring 2026 finals; the AI layer is the hackathon contribution.

**AI features**

- **🎥 Webcam Proctoring** — MediaPipe runs locally for fast face/hand detection; suspicious frames escalate to Gemini Vision for context-aware classification (looking off-screen, holding a phone, secondary person in frame). False-positive rate under 2% on internal testing.
- **🧠 AI Code Grading** — Gemini Flash evaluates student C++ submissions against a 4-axis rubric (correctness, code quality, efficiency, style) and produces structured per-problem feedback. Instructors can override scores in one click.
- **📋 Personalized Study Feedback by Gemini** — After submission, every student receives a trilingual (English / Uzbek / Russian) study recommendation tailored to their wrong-answer pattern. Powered by Gemini Flash.
- **👓 Eyewear/Eyeglasess Verification by Gemini** — During the welcome flow, a webcam-captured photo is checked for glasses consistency with the student's profile, deterring "smart-glasses" cheating attempts.

**Foundation features** (the production C++ exam system)

- Trilingual UI (EN / UZ / RU) — every label, every error, every PDF.
- Configurable exam structure: any number of MC questions, any number of coding problems, any duration, any scoring rule.
- Real C++ execution via [Judge0](https://judge0.com/) (self-hosted) — students see actual compile + run output.
- Three-stage Firebase upload retry with Google Form fallback if all three fail.
- Tab-switch / window-blur anti-cheat with structured event logging.
- Multi-instructor admin dashboard with PDF download, live submission view, and AI-graded score override.
- Trilingual PDF reports — every submission archived with proctoring summary, AI grades, and code with edit-highlighting.

---

## Architecture

```
Browser (vanilla JS, no framework)
   ↓
Vercel Serverless API
   ├── /api/judge.js              — Judge0 proxy (HTTPS bridge)
   ├── /api/grade-code.js          — Gemini Flash code grading
   ├── /api/feedback-generate.js   — Gemini Flash personalized feedback
   ├── /api/gemini-vision.js       — Gemini Flash-Lite vision (eyewear + escalation)
   └── /api/proctor-analyze.js     — Gemini Flash-Lite proctoring analysis
   ↓
External services
   ├── Firebase Firestore  (configs, submissions, schedules)
   ├── Firebase Storage    (student PDFs, verification photos, webcam evidence)
   ├── Firebase Auth       (instructor sign-in, anonymous student sign-in)
   ├── Judge0              (self-hosted C++ execution sandbox)
   └── Google Gemini API   (Flash + Flash-Lite, paid tier)
```

No framework, no build step. The entire frontend is hand-written HTML / CSS / vanilla JS designed to be loaded on the underpowered laptops most students bring to exams.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Student welcome / per-group schedule gate / start |
| `exam.html` | The exam itself (reads state from sessionStorage) |
| `login.html` | Instructor login (email + password) |
| `admin.html` | Instructor dashboard — schedules, submissions, AI grading drawer |

## Key files

| File | Purpose |
| --- | --- |
| `js/firebase-config.js` | Firebase project keys + master override password |
| `js/firebase-client.js` | Student-side Firebase helpers (schedule + upload+retry) |
| `js/admin.js` | Instructor dashboard logic (submissions, grading, schedules) |
| `js/app.js` | Student exam flow (gating, submit, upload driver) |
| `js/ai-feedback.js` | Client-side trilingual feedback renderer + Gemini call |
| `js/proctoring.js` | MediaPipe + webcam frame capture + Gemini escalation |
| `js/pdf-generator.js` | Trilingual PDF report (returns Blob + save fn) |
| `firestore.rules` | Firestore security rules |
| `storage.rules` | Firebase Storage security rules |

## Setup

1. **Firebase**
   - Create a project. Enable Anonymous + Email/Password sign-in providers.
   - Enable Firestore (Native mode) and Storage.
   - Deploy `firestore.rules` and `storage.rules`.
   - Pre-create instructor accounts in Authentication.
   - Copy the web-app config into `js/firebase-config.js`.
   - Set `MASTER_OVERRIDE_PASSWORD` to a secret phrase only instructors know.

2. **Judge0**
   - Either self-host (recommended for cost & latency) or use the RapidAPI plan.
   - Set `JUDGE0_URL` and `JUDGE0_USE_SELF_HOSTED` env vars in Vercel.

3. **Gemini**
   - Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
   - Enable billing — Tier 1 quotas are needed for live exams with proctoring traffic.
   - Set `GEMINI_API_KEY` in Vercel environment variables.

4. **Deploy** to Vercel. That's it.

## Cost

Per student per exam (typical 90-minute session with proctoring + grading + feedback): **~$0.05**. The platform runs on Gemini's `2.5-flash-lite` for high-volume tasks (vision, proctoring) and `2.5-flash` for quality-sensitive tasks (grading, feedback). Free-tier quotas are sufficient for development; paid tier is required at exam scale.

## Team

| Member | Role |
| --- | --- |
| Ulugbek Tursunaliev | Team Lead |
| Islom Xolmuminov | Developer |
| Muqaddas Abdusaidova | UI/UX Designer |
| Sevinch Yoqubova | Researcher & Sales Manager |
| Oybek Sobirjonov | Developer |

---

## License

This project is the original work of the NPUU Digital Solutions team. Submitted to the Build with AI 2026 EdTech Hackathon (Public & Higher Education track) at New Uzbekistan University on May 23–24, 2026.
