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
- **Multi-course**: Programming 1 with C++, General English 1, and General English 2. Each course brings its own question banks and its own exam shape.
- Configurable exam structure: any number of MC questions, any number of coding problems, any duration, any scoring rule.
- **Section-structured exams** for General English — the instructor sets how many questions come from Reading, Grammar and Vocabulary, and what each section is worth.
- **Fractional points** — points per correct answer, penalties and coding maxima all accept decimals (2.5, 3.2, 0.75 …), so a paper marked "2.5 points each" digitises exactly.
- Real C++ execution via [Judge0](https://judge0.com/) (self-hosted) — students see actual compile + run output.
- Three-stage Firebase upload retry with Google Form fallback if all three fail.
- Tab-switch / window-blur anti-cheat with structured event logging.
- Multi-instructor admin dashboard with PDF download, live submission view, and AI-graded score override.
- **Submission filtering** by group, upload method, student ID, exam taker's full name, exam version, and final grade (greater/less than, or equal to a threshold).
- **Bulk scheduling** — apply one exam window to many groups at once, optionally restricting the exam to an allow-list of student IDs (enforced on the student side, not just recorded).
- **Bulk PDF export** — download every listed submission's report as a single named ZIP. The submission filters double as the selection: filter to one group, download that group. Falls back to the `/api/fetch-pdf` same-origin proxy when the Storage bucket has no CORS policy.
- **Excel export** — the same filtered set as an `.xlsx` with a custom file name. Scores are written as real numbers and timestamps as real dates, so the sheet can be sorted and averaged without cleaning.
- **Free-text exam types** — type any exam name ("Make-up Exam", "Retake Exam 2"); students see only the exam types that actually exist for their course.
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
| `js/questions/question-bank.js` | C++ MC bank (trilingual) |
| `js/questions/coding-bank.js` | C++ coding-problem bank (trilingual) |
| `js/questions/english-bank.js` | General English 1 & 2 banks + reading passages (English-only) |
| `js/questions/math-bank.js` | Calculus 1/2, Analytical Geometry and Discrete Mathematics banks (trilingual) |
| `js/courses.js` | **Course registry** — single source of truth for every subject |
| `firestore.rules` | Firestore security rules |
| `storage.rules` | Firebase Storage security rules |


## Courses

Every subject is declared in **`js/courses.js`**. That one file drives the
student course dropdown, the instructor's exam form, the analytics
labels, the PDF header, the welcome-page format banner and the
refresh-questions confirmation. Adding a subject is a single entry:

```js
{ id: "calc1", label: "Calculus 1", structure: "mc_only", translateQuestions: true },
```

Three structures are supported:

| `structure` | Meaning | Exam form shows |
| --- | --- | --- |
| `mc_coding` | Multiple choice + coding problems | MC count, coding count, per-problem max points |
| `mc_only` | Multiple choice only | MC count only — coding inputs hidden |
| `sectioned` | Named sections, each with its own count and points | Per-section composition grid |

Entries for Calculus 1, Calculus 2, Mathematical Analysis 1 & 2 and
Analytical Geometry are pre-written and commented out in `courses.js` —
uncomment one and add its question bank to enable it.

| Course | Code | Structure | Question source |
| --- | --- | --- | --- |
| Programming 1 with C++ | `cpp1` | Multiple choice, optionally + coding problems | `question-bank.js`, `question-bank-new.js`, `coding-bank.js` |
| General English 1 | `geneng1` | Reading + Grammar + Vocabulary sections | `english-bank.js` |
| General English 2 | `geneng2` | Reading + Grammar + Vocabulary sections | `english-bank.js` |
| Calculus 1 | `calc1` | Multiple choice only | `math-bank.js` → `calculus1` |
| Mathematical Analysis 1 | `mathan1` | Multiple choice only | `math-bank.js` → `calculus1` *(shared)* |
| Calculus 2 | `calc2` | Multiple choice only | `math-bank.js` → `calculus2` |
| Mathematical Analysis 2 | `mathan2` | Multiple choice only | `math-bank.js` → `calculus2` *(shared)* |
| Analytical Geometry | `anageo` | Multiple choice only | `math-bank.js` → `analytic_geometry` |
| Discrete Mathematics | `discmath` | Multiple choice only | `math-bank.js` → `discrete_math` |

Programming 1 accepts **0 coding problems**, making it a multiple-choice-only
exam, or any number up to 20 alongside the test questions.

### Mathematics courses

Banks are keyed by **bank name, not course**, because courses share them:
Calculus 1 and Mathematical Analysis 1 both draw from `calculus1`; Calculus 2
and Mathematical Analysis 2 both draw from `calculus2`. Each bank holds 25
questions, fully translated into Uzbek and Russian.

All three maths banks print their correct answer first in the source. The
engine redistributes correct answers evenly across positions A–D per exam
version, so a student who always picks A scores about 25%, not 100%. Each
version also receives a different question order on refresh.

Answer keys were verified twice: the Calculus source marks every correct
answer `*A.` (confirmed programmatically across all 50), and every question in
all three banks was then re-solved independently. Analytical Geometry carries
no answer key in its source at all, so all 25 were keyed purely from the
mathematics; five documented deviations from the printed paper are recorded in
the header of `math-bank.js`.

### General English exams

Both English courses hold **60 questions each** — 20 Reading (across two
passages), 20 Grammar, 20 Vocabulary — transcribed from the printed
Version A / Version B papers together with their answer keys.

When creating an English exam the instructor configures **each section
separately**: how many questions to draw, and how many points a correct
answer is worth. The form caps each count at what the bank actually
contains, so an exam can never demand more questions than exist. The
defaults reproduce the printed paper exactly:

| Section | Questions | Points each | Subtotal |
| --- | --- | --- | --- |
| Reading | 10 | 5 | 50 |
| Grammar | 10 | 2.5 | 25 |
| Vocabulary | 10 | 2.5 | 25 |
| **Total** | **30** | | **100** |

Reading questions are bound to their passage. The selector shuffles
whole passages and draws from them in order, so a 10-question reading
section uses **one** text rather than scattering questions across two —
students read one passage and answer its questions, exactly as on paper.

Question formats vary by section and are rendered accordingly:
4-option grammar items, 3-option reading and vocabulary items, and
2-option True/False items. True/False options keep their printed
`True, False` order; everything else is shuffled with the same balanced
answer-position algorithm the C++ exams use.

One item was repaired during transcription: General English 2 ·
Version A · Vocabulary Q29 was unanswerable as printed (no option fitted
the sentence), so its stem was rewritten to match the word its answer
key identifies. Options and answer letter are unchanged. The deviation
is documented in the header of `english-bank.js`; everything else
matches the source papers exactly.

**Questions are English-only.** Translating a language exam would hand
the student the answer, so General English questions render in English
with no Uzbek or Russian counterpart, and the exam-page language
switcher is replaced by an "English only" indicator. This applies *only*
to the two English courses — Programming 1 with C++ keeps its full
EN / UZ / RU translation of every question, option, hint and PDF line.

### Fractional points

Points per correct answer, wrong-answer penalties and per-problem coding
maxima all accept decimal values. Scores are rounded to two decimal
places at every aggregation step so accumulating values like 2.5 across
thirty questions can't surface floating-point artefacts, and whole
numbers still display as whole numbers (`40`, not `40.00`).

## Submission storage layout

PDF reports are stored in Firebase Storage scoped by subject, exam,
group and date:

```
submissions/{course}/{examType}/{group}/{YYYY-MM-DD}/
    {GROUP}_{ID}_{First}_{Last}_v{Version}_{HHmmss}.pdf
```

Every level is load-bearing. A student sits several subjects, several
exams per subject (Midterm, Final, Resit, Retake 1, Retake 2), and may
resubmit. The pre-July-2026 layout was `submissions/{group}/{file}`,
which contained no subject, exam or date — so every exam a student ever
sat resolved to the same object and only one report survived. The
timestamp in the filename guarantees a resubmission never replaces an
earlier attempt.

`storage.rules` keeps a rule for the legacy flat layout so reports
uploaded before the change stay readable and deletable; their
`pdfPath` is recorded in Firestore and still resolves.

### Proctoring evidence

Webcam frames are stored at:

```
proctoring/{sessionId}/{scheduled|anomaly}/{timestamp}_{random}.jpg
```

where `sessionId` is `p_{group}_{studentId}_{epochMs}`. The millisecond
stamp makes every exam sitting a distinct folder, and the per-frame
timestamp plus random suffix makes every frame distinct — so unlike the
old submission layout, proctoring has never overwritten anything.

Events in `/proctoring_events` are stamped with `examId` and `course`
(July 2026) so evidence can be located per exam without walking back
from a submission's `proctorSessionId`. Sessions that never produced a
submission — abandoned exams, browser crashes — were previously
unreachable for this reason.

Deleting a submission cascades: its Firestore record, its PDF, and the
webcam frames and proctoring events for its session are all removed.

Sessions that never produced a submission are found and removed with
**Clean up orphaned recordings** in the Submissions toolbar. It only
offers sessions older than a chosen threshold (default 7 days), because
a session with no submission may simply be an exam still in progress —
session ids embed their start time, so age is read from the folder name.
Sessions whose id cannot be parsed are listed as skipped and never
auto-deleted.

### Rendering maths in questions

Question banks may use `<sub>`, `<sup>` and `<b>` plus Unicode maths
symbols. Two separate paths handle them:

- **Exam page** — option text is HTML-escaped, then a whitelist of
  formatting tags is restored, so `Σ<sub>n=1</sub>` renders as real
  notation while C++ code (`cout << a`) and any injected markup stay
  escaped.
- **PDF report** — the question review embeds **DejaVu Sans** and draws
  real notation: ∫ Σ Π ∞ √ ∧ ∨ ∪ ∩ ∅ ℝ → ∘ ≤ ≥ ≠ − and Greek letters,
  with `<sup>`/`<sub>` rendered as genuine raised and lowered runs at
  70% size rather than `^` and `_`.

  DejaVu was chosen after checking glyph coverage: the Cyrillic face
  already loaded here (Noto Sans) is **missing 17** of the symbols the
  banks use, so reusing it would have produced blank boxes. DejaVu
  contains all of them plus Cyrillic and Greek.

  jsPDF has no rich text — one `doc.text()` call is one font at one size
  on one baseline — so `mathParseRuns` / `mathWrapRuns` /
  `mathDrawLines` split each string into runs, word-wrap across them and
  draw each with its own size and baseline offset. The same wrapper does
  sizing and drawing, so an option's box height can't desynchronise from
  its contents.

  The font is **self-hosted** at `assets/fonts/`, subset to the ranges
  the platform uses (Latin, Latin Extended-A/B, spacing modifiers,
  Greek, Cyrillic, punctuation, super/subscripts, letterlike, arrows,
  mathematical operators, geometric shapes). That takes the pair from
  1.43 MB to **284 KB**. Being same-origin it reuses the connection
  already open to the app, so it is faster than a CDN — and modern
  browsers partition the HTTP cache by site, so the old "already cached
  from another site" argument for a CDN no longer applies. jsDelivr
  remains only as a backstop if the local files are missing. Bump the
  `?v=` query in `MATH_FONT_SOURCES` when regenerating the files.

  If the font fetch fails from every source, the report falls back to ASCII
  transliteration (`∫`→`Integral`, `x⁴`→`x^4`) rather than breaking:
  jsPDF's built-in Helvetica only encodes Latin-1, and one character
  above U+00FF makes it emit the whole string as UTF-16, which renders
  as garbled, letter-spaced text.

HTML stripping in the PDF uses a tag whitelist rather than removing
everything angle-bracketed — otherwise options that are legitimately
`<iostream>` or `<string>` disappear.

## Security notes

`firestore.rules` enforces the per-schedule student allow-list at write
time, so restricting an exam to specific student IDs is binding rather
than advisory. It fails open at every step (missing `examId`, missing
schedule document, absent or empty `allowedStudents`), so it can only
ever block the case it is meant to.

Two known limitations, both pre-existing and both requiring
architectural changes rather than rule edits:

- `/exam_schedules` is world-readable, because the welcome page needs
  the exam window before a student authenticates. That makes
  `allowedStudents` readable too. Student IDs are low-sensitivity, but
  the lists can be harvested.
- Question banks ship to the browser as JavaScript, including the
  `correct` index for every question. Any student who opens developer
  tools can read the answer key. Server-side question delivery and
  scoring would be required to close this.

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

## Roadmap - Future Plans for Sinov AI.

From MVP to platform — what's next for Sinov AI, organized by time horizon:

**Next semester**

- Student accounts with all taken exams history.
- AI-generated mock exams for pre-exam practice.
- After a failed exam, Gemini composes a personalized study plan to students.

**Mid-term**

- Real-time GPA grades across all courses.
- Instructor-uploaded exam guides surfaced in each student's dashboard.
- Adaptive question difficulty — AI calibrates hardness based on students' prior exam performances.

**Long-term**

- Multi-subject expansion — Discrete Math, Calculus 2, Analytic Geometry, Mathematical Analysis 1 & 2, and Academic English. (General English 1 & 2 shipped in July 2026.)
- Deep LMS integration with Moodle and Canvas, the systems Uzbek and regional universities already use.

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
