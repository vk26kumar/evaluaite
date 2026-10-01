# AI-EvaluAIte

AI-EvaluAIte is a web app for teachers. It grades handwritten answer sheets against the teacher's own answer key, writes complete question papers with answer keys, keeps every student's marks in one place, generates lecture slides, and includes a classroom whiteboard.

The AI suggests; the teacher decides. Every mark can be checked, explained and changed.

| | Address |
|---|---|
| Website | https://evaluaite.onrender.com |
| API (backend) | https://evaluaite-api.onrender.com |
| Health check | https://evaluaite-api.onrender.com/api/health |
| Code | https://github.com/vk26kumar/evaluaite (private) |

This README is the complete guide: what every feature does, how it works inside, which technologies are used and why, how to run, test and deploy it, and what to do when something breaks. Security details are in [SECURITY.md](SECURITY.md).

---

## Contents

1. [What the app does](#1-what-the-app-does)
2. [How it works inside](#2-how-it-works-inside)
3. [Technology: what, why and how](#3-technology-what-why-and-how)
4. [Project structure](#4-project-structure)
5. [Data model](#5-data-model)
6. [Security](#6-security)
7. [API reference](#7-api-reference)
8. [Configuration](#8-configuration)
9. [Running it on your computer](#9-running-it-on-your-computer)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [Operations and maintenance](#12-operations-and-maintenance)
13. [Limits and trade-offs](#13-limits-and-trade-offs)
14. [Design system](#14-design-system)
15. [Troubleshooting](#15-troubleshooting)
16. [History and key decisions](#16-history-and-key-decisions)

---

## 1. What the app does

### 1.1 Grade handwritten answer sheets (the main feature)

The teacher photographs or scans one student's answer sheet, types (or reuses) the answer key, and picks how strictly to mark. The app returns a full report in about a minute.

**What the teacher enters**
- A title (for example "DBMS unit test, Class 12B") and, optionally, the student's name or roll number.
- The answer key: for each question, the question text, a model answer and the maximum marks. Up to 60 questions. "Draft with AI" writes a model answer for a question if the teacher doesn't want to type one.
- The answer sheet: up to 6 pages as JPG, PNG, WEBP or PDF, in any order.
- The marking strictness:
  - **Lenient:** credits the core idea, even when it is phrased loosely. For quizzes and early drafts.
  - **Balanced:** credits each key point that is present and correct, judged by meaning. For class tests and homework.
  - **Strict:** needs every key point, precise terms and the full reasoning. For mock and final exams.

**What the report shows**
- The total score with a percentage and a band (for example "Fair").
- For every question: the marks, the examiner's feedback, the student's answer as the AI read it (spelling mistakes kept), which key points were covered fully, partly or not at all, what would earn more marks, and the model answer.
- A chart and a table of marks per question.
- Overall strengths and next steps.
- Warnings: answers that were hard to read, low-confidence marks, and any text on the sheet aimed at the examiner (such as "please give me full marks"), which is flagged and ignored when marking.

**What the teacher can do next**
- **Adjust** any mark with an optional note. The report labels it "Adjusted" and keeps the AI's original mark.
- **Grade next student:** the same answer key is reused, so a whole class is graded quickly.
- **Print** the report, or **delete** it.

The answer key is saved in the browser as a draft, so a page refresh never loses it.

### 1.2 Question papers ("Assignments")

The teacher describes the paper and the AI writes it, together with an answer key that is good enough to grade against.

**What the teacher chooses**
- Title, subject, class, time allowed, school name (filled in from the profile) and an optional due date.
- Sections. Each has a question type, a count and marks per question. The 7 types are multiple choice, true or false, fill in the blanks, short answer, long answer, numerical problems, and diagram or graph based.
- Presets to start from: **Quick quiz** (10 multiple choice, 20 minutes), **Class test** (multiple choice, short and long answers, 45 minutes) and **Full exam** (five sections, 63 marks, 3 hours).
- A difficulty mix: **Easier** (50% easy, 40% moderate, 10% challenging), **Balanced** (30/50/20) or **Harder** (15/45/40).
- Optional extra instructions, for example "Focus on series and parallel circuits".
- Optional reference material: a chapter or notes as a PDF, an image or a text file, up to 10 MB. Questions are then based only on that material.

**What the teacher can do with a paper**
- View it as the **student copy** or the **teacher copy** with answers.
- **Edit** any question, its options or its answer.
- **Write a new version**, with different questions on the same syllabus. If that fails, the previous version is kept.
- **Copy** it to make a variant.
- **Download PDFs** of the student paper and the teacher paper with the answer key. Maths symbols such as √, ≤, π, Ω and ² print correctly.
- **Grade sheets:** one click turns the paper's answer key into the grading answer key. Every sheet graded this way is listed on the paper, with each student's score.

### 1.3 Profile

- **Header:** name, role, school, email, member since, and whether Google is connected.
- **Overview:** sheets graded, number of students, average score, papers written, marks adjusted and slide decks made, plus recent activity.
- **Students and marks:** every student who has been graded (matched by name, ignoring case and spacing), with sheets count, average, best, latest and a trend. Each student expands to show every sheet. The list can be searched, sorted and exported as a CSV file.
- **History:** a timeline of everything done: papers created, generated, edited, copied, regenerated and deleted; sheets submitted, graded, adjusted and deleted; slides; and account events. It can be filtered by category. Deleted items stay in the history, marked as gone.
- **Account**
  - Edit name, role, school and subjects.
  - Sign-in methods: email and password, Google, and email confirmation status.
  - Sign out other devices.
  - Change or add a password.
  - Recovery codes.
  - Delete the account and all its data, which needs the password and typing DELETE.

### 1.4 Lecture slides

Type a topic, choose the audience (school, university, professional or general) and the number of content slides (3 to 12). The app downloads a PowerPoint (`.pptx`) deck with a title slide, content slides with speaker notes, and a key-takeaways slide.

### 1.5 Whiteboard

A drawing board that runs entirely in the browser:
- Tools: pen, highlighter, eraser, line, rectangle and ellipse, with keyboard shortcuts P, H, E, L, R and O.
- Colours, stroke size, undo and redo (Ctrl+Z and Ctrl+Shift+Z), and clear.
- Save as PNG.

It warns before you leave a page with unsaved drawing. Nothing is sent to the server.

### 1.6 Accounts

- **Sign up and sign in** with email and password, or with Google.
- **Forgot password:**
  - **Recovery codes (always available, no outside service):** the user creates 10 one-time codes in Profile, Account and saves them. On the sign-in page, "Forgot password?" asks for the email, one code and a new password.
  - **Email reset links (only if an email provider is configured):** a link is emailed that works once for 30 minutes.
- **Email confirmation** (only with an email provider): a link sent after sign-up, which can be resent from the profile.
- **Every feature is visible to visitors** in the navigation. Using one asks them to sign in first, then takes them straight to it.
- **Light ("paper") and dark ("chalkboard") themes.** The site works on phones, tablets and desktops, with keyboard and screen-reader support.

---

## 2. How it works inside

### 2.1 The big picture

```
 Browser (React app)                   Render static site: evaluaite.onrender.com
      |
      |  HTTPS, JSON, "Authorization: Bearer <token>"
      v
 Express API (Node.js)                 Render web service: evaluaite-api.onrender.com
      |        |              |
      |        |              +--> Google OAuth (sign in with Google)
      |        +--> Google Gemini API (read handwriting, grade, write papers, slides)
      v
 MongoDB Atlas (database "evaluaite" on cluster0)
```

- The **frontend** is a static website: HTML, CSS and JavaScript files built by Vite. It has no secrets and talks only to the API.
- The **backend** holds all secrets (database, Gemini, Google, session key) and does all the work.
- Only the backend talks to Gemini, so the AI key is never sent to a browser.

### 2.2 Grading a sheet, step by step

```
Teacher clicks "Start grading"
  1. Browser shrinks large photos (longest side 2400 px, JPEG quality 0.86) so uploads are fast.
  2. POST /api/evaluations  (multipart: files[] + payload JSON with the key and settings)
  3. Server checks: signed in? AI hourly limit? up to 6 files, 10 MB each, 14 MB total?
     real file type from the file's first bytes (not its name)? key valid?
  4. Server saves an Evaluation with status "queued" and replies 202 at once.
  5. A background job starts (at most 2 at a time, queue of 25):
       status "reading"  -> Gemini pass 1: TRANSCRIPTION (vision)
       status "grading"  -> Gemini pass 2: MARKING (text only)
       code             -> NORMALISATION
       status "completed" (or "failed" with a readable reason)
  6. The browser polls the evaluation: every 2 s, then 4 s, then 8 s, and shows progress.
```

**Pass 1: transcription.** Gemini sees the page images and only the question texts, never the model answers. It writes down what the student wrote, word for word, matching each answer to a question by content rather than trusting the numbers on the sheet. Unreadable words become `[illegible]` rather than guesses. It also notes any text addressed to the examiner.

*Why separate?* If the AI saw the model answer while reading, it could "read" what it expects instead of what the student wrote.

**Pass 2: marking.** Gemini gets the transcriptions, the answer key and the rubric for the chosen strictness. For each question it splits the model answer into weighted key points, judges each as covered fully, partly or not at all, awards marks in steps of 0.5, and writes feedback.

**Normalisation (in code, not AI).** Model output is never trusted as it is:
- Marks are clamped between 0 and the maximum and rounded to 0.5.
- Missing or illegible answers score 0.
- Every question in the key gets a result, even if the model skipped one.
- Lists are capped, and confidence is lowered for answers that were only partly legible.

**Structured output.** Both passes ask Gemini for JSON that matches a schema, so the server can rely on the shape of the reply. Bad or empty replies are retried once.

**Model fallback.** The main model is `gemini-flash-latest`. If it is overloaded (503), rate-limited (429), erroring (500) or unavailable (404), the request switches automatically to `gemini-flash-lite-latest`. The model that did the work is saved with each result.

**Prompt-injection defence.** Everything a user supplies (questions, answers, notes, reference material) is wrapped in XML-style data tags. The prompts tell the model never to follow instructions found inside them. All prompts are in `BACKEND/src/prompts/`.

**Restarts.** If the server restarts mid-job, the job is marked as interrupted at the next start-up. A job stuck for more than 10 minutes is marked failed when it is next viewed.

### 2.3 Writing a question paper

1. The teacher submits the paper settings (and optionally a reference file). The server replies `202` and queues a job.
2. One Gemini call writes all sections, questions and answers as JSON. A text reference file is read directly, up to 30,000 characters. A PDF or image is sent to Gemini as is.
3. Code tidies the result:
   - Marks come from the teacher's settings, never from the AI.
   - Multiple choice questions keep exactly 4 options, with letters removed.
   - Numbering runs across sections, and extra questions are trimmed.
   - If too few questions came back, it retries once.
4. The uploaded file is not stored. Instead, short "source notes" about it are saved, so that later regenerations still follow the same material.
5. The answer for each question is written as a marking guide, in a style chosen per question type, because it becomes the model answer when sheets are graded against the paper.
6. PDFs are drawn on the server with `pdfkit` and the embedded DejaVu Sans font, so symbols print correctly.

### 2.4 Slides

Gemini returns a JSON outline: title, slides with bullet points and speaker notes, and takeaways. Code cleans it (drops empty slides, respects the slide count), and the `pptxgenjs` library builds the `.pptx` file in memory. The file is streamed to the browser and never stored.

### 2.5 Sign-in and sessions

- **Passwords** are hashed with bcrypt (cost 12). They are never stored or logged in plain text.
- After sign-in the server returns a **JWT session token**, signed with `JWT_SECRET` and valid for 7 days. The browser keeps it in `localStorage` under `evaluaite.session` and sends it as `Authorization: Bearer <token>`.
- On every request the server checks the token and loads the user. A deleted account loses access immediately.
- **Session versions:** each account has a `tokenVersion` number that is copied into its tokens. Changing or resetting the password, or "Sign out other devices", increases the number, which retires every older token at once. The current device gets a new token and stays signed in.
- **Google sign-in** works like this:
  1. The browser opens `/api/auth/google`. The server sets a short-lived state cookie (protection against cross-site tricks) and sends the user to Google.
  2. Google sends the user back to `/api/auth/google/callback`.
  3. The server finds or creates the account and redirects the browser to `/auth/callback?code=...`, with a single-use code that is valid for 60 seconds.
  4. The website swaps that code for a session at `/api/auth/google/exchange`.

  The session token therefore never appears in a URL.
- **Linking Google to an existing email account** happens only if Google has verified the email. If that account had a password that nobody had verified, the password and any recovery codes are removed, and its sessions end. This blocks a "pre-registration" takeover, where someone signs up first with another person's email.

### 2.6 Recovery codes and email

- **Recovery codes:** 10 random codes such as `SKV7M-WJ4JL` (about 50 bits each).
  - They are shown once and stored only as SHA-256 hashes.
  - Creating them needs the password, and a new set replaces the old.
  - Each works once, and using one signs out every other session.
  - Codes are forgiving about upper and lower case and separators.
- **Email (optional):** with `EMAIL_PROVIDER` set to `brevo` or `resend`, the app sends reset links, confirmation links and "password changed" notices.
  - Links are random 256-bit tokens, stored as hashes, and single-use. A database expiry (TTL) index deletes them automatically.
  - In development, emails are printed to the console instead of being sent.

### 2.7 Background jobs

`BACKEND/src/services/jobQueue.js` is a small in-process queue shared by grading and paper generation:
- Up to `MAX_CONCURRENT_JOBS` (default 2) run at once, and at most 25 can wait. When the queue is full, the API replies "busy, try again".
- It is deliberately simple and suits one server instance. See [Limits](#13-limits-and-trade-offs).

### 2.8 Frontend behaviour

- **Routing:** React Router with normal URLs (`/evaluations`, `/assignments/<id>`). Old links in the form `/#/...` are converted automatically.
- **Session states:** checking, signed in, signed out, or server unreachable. A 401 reply anywhere signs the user out with a clear message. A free server that is waking up shows "Can't reach the server" with a retry button.
- **Polling** uses back-off and stops once a job finishes.
- **Data loading** sets state only from promise callbacks, which follows the React Hooks rules.

---

## 3. Technology: what, why and how

### Frontend (`FRONTEND/`)

| Technology | Version | What it does here | Why it was chosen |
|---|---|---|---|
| React | 19 | All screens and components | The most widely used UI library, with a huge ecosystem |
| Vite | 8 | Dev server and production build | Very fast; simple config; a small custom plugin adds the Content Security Policy |
| React Router | 7 | URLs and page navigation (`BrowserRouter`) | The standard router for React; clean URLs |
| react-dropzone | 14 | Drag-and-drop for answer sheets and reference files | Reliable, accessible file picking |
| react-icons (Lucide set) | 5 | Icons | A consistent icon set without image files |
| Plain CSS with design tokens | n/a | All styling, light and dark themes | No framework to fight or upgrade; small bundle; full control of the look |
| Google Fonts | n/a | Fraunces (headings), Instrument Sans (text), JetBrains Mono (numbers), Caveat (hand-written touches) | The "paper and red pen" look |
| ESLint | 10 | Code checks, including React Hooks rules | Catches bugs before they ship |

### Backend (`BACKEND/`)

| Technology | Version | What it does here | Why it was chosen |
|---|---|---|---|
| Node.js | 24 LTS | Runs the server | Long-term support; the same language as the frontend |
| Express | 4 | HTTP API and routing | Mature, simple and well understood |
| MongoDB Atlas + Mongoose | 8 | Database and data models | Documents fit nested data (questions inside sheets, key points inside questions); free tier |
| @google/genai (Gemini) | 2 | All AI work | Reads handwriting from images and PDFs, returns JSON in a fixed shape, and has a free tier |
| zod | 4 | Validates every request body and query | Clear error messages, one schema per input |
| helmet | 8 | Security headers | Sensible secure defaults in one line |
| cors | 2 | Allows only the website to call the API | Blocks other sites from using the API from a browser |
| express-rate-limit | 8 | Limits on sign-in, links, email and AI use | Stops password guessing and AI abuse |
| multer | 2 | Receives uploaded files into memory | Files never touch the disk |
| jsonwebtoken | 9 | Signs and checks session tokens | Stateless sessions that work with any number of servers |
| bcryptjs | 3 | Password hashing | A slow hash made for passwords; pure JavaScript, so nothing to compile |
| passport + passport-google-oauth20 | 0.7 / 2 | Google sign-in | The standard OAuth helper for Express |
| pdfkit | 0.20 | Question-paper PDFs | Precise layout; an embedded font for symbols |
| pptxgenjs | 4 | PowerPoint files | Builds real `.pptx` files in memory |
| dotenv | 16 | Loads `BACKEND/.env` in development | Keeps secrets out of the code |

### Testing and tooling

| Technology | What it does here |
|---|---|
| `node:test` | The built-in Node test runner, so no extra test framework is needed |
| mongodb-memory-server-core | Starts a throwaway MongoDB for database tests |
| nodemon | Restarts the backend when files change in development |
| ESLint 10 | Lint for both apps |
| GitHub Actions | Runs lint, tests, build and `npm audit` on every push |

### Hosting and services

| Service | Used for |
|---|---|
| Render (web service, free) | The API at `evaluaite-api.onrender.com` |
| Render (static site, free) | The website at `evaluaite.onrender.com` |
| MongoDB Atlas (free M0, cluster0) | The database `evaluaite`. The team version uses database `test` on the same cluster |
| Google AI Studio / Gemini API | AI (key from aistudio.google.com) |
| Google Cloud project `ai-evaluaite` | The OAuth client for "Continue with Google" |
| A cron job (outside the repo) | Pings `/api/health` so the free backend doesn't sleep |

---

## 4. Project structure

```
BACKEND/
  server.js                start-up: config, database, indexes, job recovery, graceful shutdown
  src/app.js               the Express app: security headers, CORS, request ids, no-store, rate limits, routes
  src/config/
    env.js                 reads and validates every environment variable (refuses to start if unsafe)
    db.js                  connects to MongoDB (retries DNS with public servers), creates indexes
    passport.js            Google sign-in and account linking rules
  src/routes/              one file per area: auth, evaluation, assignment, profile, ai, slides, health
  src/services/
    gemini.js              the only file that talks to Gemini: JSON schema, retries, model fallback, errors
    grading.service.js     the two grading passes
    grading.normalize.js   turns AI output into safe marks
    evaluation.jobs.js     background grading jobs
    questionPaper.service.js, assignment.jobs.js   question paper generation
    paperPdf.service.js    PDF rendering
    slides.service.js      slide outline and .pptx building
    profile.service.js     student marks and statistics
    token.service.js       session tokens and hashing
    recoveryCodes.service.js, accountEmail.service.js, email.service.js, emailTemplates.js
    jobQueue.js            the in-process job queue
    activity.js            writes the history timeline
  src/prompts/             every prompt sent to Gemini, with its JSON schema
  src/models/              User, Evaluation, Assignment, Activity, AuthCode, EmailToken
  src/middleware/          auth (sessions), validate (zod), upload (multer), rateLimit, error
  src/constants/           question types and difficulty mixes
  src/utils/               ApiError, logger, password rules, file-type detection, text helpers
  assets/fonts/            DejaVu Sans for PDFs (with its licence)
  scripts/                 smoke tests against the real Gemini API, and the legacy data cleanup
  test/                    75 tests: unit, HTTP and in-memory database

FRONTEND/
  index.html               page shell; the theme is applied before the first paint
  vite.config.js           build settings and the Content Security Policy plugin
  src/main.jsx             entry: providers, old-link (/#/) conversion
  src/App.jsx              all routes
  src/components/          AppShell (header, nav, footer), Logo, Field, Feedback, RouteGuards, RedPen, Stepper
  src/context/             AuthProvider (session), ThemeProvider, ToastProvider
  src/lib/                 api client, providers, password rules, formatting, hooks, polling, storage, image shrinking
  src/pages/               one folder or file per screen:
    Landing, auth/, evaluate/, report/, History, assignments/, profile/, Slides, Whiteboard, NotFound
  src/styles/              tokens.css (colours, fonts, spacing), base.css, components.css
  public/                  privacy.html, terms.html, legal.css, robots.txt, .well-known/security.txt, favicon

.github/workflows/ci.yml   continuous integration
SECURITY.md                the security checklist and how to report a vulnerability
```

---

## 5. Data model

All collections are in the MongoDB database `evaluaite`.

| Collection | Holds | Key fields |
|---|---|---|
| `users` | Accounts | name, email (lowercase, unique), password (bcrypt hash, hidden by default), googleId, emailVerified, tokenVersion, recoveryCodes (hashes, hidden), institution, designation, subjects, lastLoginAt |
| `evaluations` | Graded sheets | owner, title, studentName, difficulty, assignment (optional link), status (queued, reading, grading, completed, failed), questions (question, reference answer, max marks, awarded marks, AI marks, overridden flag and note, key points with coverage, feedback, transcription, legibility, confidence), overall summary, integrity flags, score, model |
| `assignments` | Question papers | owner, title, subject, class, school, time, due date, question types (type, count, marks), difficulty mix, status, paper (instructions, sections, questions with answers), reference notes, totals, generation count, duplicatedFrom |
| `activities` | History timeline | user, type (such as `assignment.duplicated` or `evaluation.mark_adjusted`), entity (kind, id, title snapshot), meta, createdAt |
| `authcodes` | Google sign-in one-time codes | code hash, user, optional notice, expiresAt (TTL deletes it) |
| `emailtokens` | Email reset and confirmation links | user, purpose, token hash, expiresAt (TTL deletes it) |

Uploaded answer sheets and reference files are **never stored**. Only the transcription and marks are kept.

Indexes are created automatically at start-up (production has automatic indexing switched off, so this is done explicitly and safely).

---

## 6. Security

The full checklist is in [SECURITY.md](SECURITY.md). In short:

- **Transport:** HTTPS everywhere. The API sends strict headers: a Content Security Policy that allows nothing, `no-referrer`, `nosniff` and frame blocking. The website gets its own policy plus 7 headers set in Render.
- **Caching:** private API replies send `Cache-Control: no-store`.
- **Sessions:** short-lived signed tokens (HS256 only), session versions for instant sign-out everywhere, and Google sign-in without tokens in URLs.
- **Passwords:**
  - bcrypt with cost 12.
  - 8 to 72 bytes, with a letter and a number.
  - Common passwords and passwords containing the email name are refused.
  - Recovery codes are hashed.
- **Access:** every data route checks the signed-in owner. No teacher can see another teacher's data.
- **Input:** zod validation everywhere, a 200 KB limit on request bodies, real file-type checks, escaped search text, and React escaping of all output.
- **Rate limits:** separate counters for sign-up, failed sign-ins (per network and per account), one-time links and codes, account actions, email sending and AI use. A mistake in one place never locks anyone out of another.
- **AI safety:** the answer key is hidden from the handwriting pass, user content is fenced as data, marks are fixed up in code, and attempts to influence the examiner are flagged.
- **Secrets:** they live only in Render environment variables and local `.env` files, which git ignores. The frontend has no secrets. The server refuses to start in production with a weak `JWT_SECRET`.
- **Logging:** one JSON line per request with a request id, never including tokens, passwords or bodies. The same id is returned in the `X-Request-Id` header and in error replies.

---

## 7. API reference

All routes start with `/api`. Routes marked "auth" need `Authorization: Bearer <token>`. Errors always look like `{ "error": { "message", "code", "details?", "requestId?" } }`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | | Database, AI and job-queue status |
| GET | `/auth/providers` | | Whether Google and email are enabled |
| POST | `/auth/signup`, `/auth/login` | | Email and password sessions |
| GET | `/auth/me` | auth | The signed-in user |
| GET | `/auth/google`, `/auth/google/callback` | | Google sign-in |
| POST | `/auth/google/exchange` | | Swap the one-time code for a session |
| POST | `/auth/password/forgot`, `/auth/password/reset` | | Email a reset link / use it |
| POST | `/auth/password/recover` | | New password with email and a recovery code |
| POST | `/auth/email/verify` | | Confirm an email with the emailed link |
| GET, POST | `/evaluations` | auth | List graded sheets / submit a sheet (multipart: `files[]` and `payload`) |
| GET, DELETE | `/evaluations/:id` | auth | Read or delete one sheet |
| PATCH | `/evaluations/:id/questions/:questionId` | auth | Teacher changes a mark |
| POST | `/ai/reference-answer` | auth | Draft a model answer |
| POST | `/slides` | auth | Generate a `.pptx` |
| GET, POST | `/assignments` | auth | List (search and status filter) / create a paper (multipart: optional `file` and `payload`) |
| GET, PATCH, DELETE | `/assignments/:id` | auth | Read, edit details, delete |
| PATCH | `/assignments/:id/questions/:questionId` | auth | Edit a question |
| POST | `/assignments/:id/regenerate`, `/assignments/:id/duplicate` | auth | New version / copy |
| GET | `/assignments/:id/pdf?variant=student\|teacher` | auth | Download the PDF |
| GET | `/assignments/:id/evaluations` | auth | Sheets graded against this paper |
| GET, PATCH, DELETE | `/profile` | auth | Profile and statistics / update / delete the account |
| POST | `/profile/password` | auth | Change or add a password |
| POST | `/profile/sessions/revoke` | auth | Sign out every other device |
| GET, POST | `/profile/recovery-codes` | auth | Codes left / create a new set |
| POST | `/profile/email/verification` | auth | Resend the confirmation email |
| GET | `/profile/students`, `/profile/activity` | auth | Marks per student / history |

---

## 8. Configuration

### Backend: Render environment, or `BACKEND/.env` locally

| Variable | Needed | What it is |
|---|---|---|
| `NODE_ENV` | production | `production` on Render |
| `MONGO_URI` | yes | MongoDB connection string from Atlas |
| `MONGO_DB_NAME` | yes here | `evaluaite`. Without it, production would use the database named in the URI, or `test` |
| `JWT_SECRET` | yes | The session signing key, at least 32 random characters. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | no | Session length, default `7d` |
| `CLIENT_URL` | yes | The website address, `https://evaluaite.onrender.com`. Several can be listed, separated by commas |
| `SERVER_URL` | no | The API's public address. On Render it comes from `RENDER_EXTERNAL_URL` automatically |
| `GEMINI_API_KEY` | for AI | From aistudio.google.com. `GEMINI_API` also works (older name) |
| `GEMINI_MODEL` | no | Default `gemini-flash-latest` |
| `GEMINI_FALLBACK_MODEL` | no | Default `gemini-flash-lite-latest`. Empty turns fallback off |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google sign-in | From the Google Cloud OAuth client |
| `EMAIL_PROVIDER` | no | `brevo` or `resend`. Leave unset to turn email off |
| `EMAIL_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` | with email | Provider key, sender address and sender name |
| `MAX_CONCURRENT_JOBS` | no | Jobs at once, default `2` |
| `TRUST_PROXY` | no | Proxy hops to trust, default 1 in production |

### Frontend: Render environment, or `FRONTEND/.env` locally

| Variable | What it is |
|---|---|
| `VITE_API_URL` | The API address, `https://evaluaite-api.onrender.com`. Leave empty locally to use the dev proxy |

Everything starting with `VITE_` ends up in the public JavaScript, so **never put a secret there**.

---

## 9. Running it on your computer

You need Node.js 24 and a MongoDB connection string (Atlas works).

```bash
# Backend
cd BACKEND
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY (Google is optional)
npm install
npm run dev               # http://localhost:5000

# Frontend (second terminal)
cd FRONTEND
npm install
npm run dev               # http://localhost:5173, /api is proxied to the backend
```

Notes:
- Locally, the backend uses its own database `evaluaite-dev` (unless `MONGO_DB_NAME` is set), so it never touches live data. The log line "MongoDB connected" shows which database it chose.
- Emails are printed in the backend console instead of being sent.
- On some Windows setups Node can't look up MongoDB Atlas addresses ("querySrv ECONNREFUSED"). `db.js` retries with public DNS (8.8.8.8 and 1.1.1.1) automatically.
- For Google sign-in locally, the OAuth client must list `http://localhost:5000/api/auth/google/callback`. It already does.

---

## 10. Testing

```bash
cd BACKEND  && npm run lint && npm test      # 75 tests; the first run downloads a MongoDB test binary
cd FRONTEND && npm run lint && npm run build
cd BACKEND  && npm run smoke:grade           # grades test/fixtures/sample-answer-sheet.jpg with the real Gemini
cd BACKEND  && npm run smoke:paper           # writes a real question paper and both PDFs to your temp folder
```

- **Unit tests:** grading normalisation, prompts (the transcription prompt never contains answers), question-paper tidying, slides, file types, student statistics, Gemini fallback, email providers, configuration.
- **HTTP tests:** 404s, sign-in checks on every protected route, forged and wrong-algorithm tokens, CORS, security headers, request ids, password rules.
- **Database tests** (an in-memory MongoDB): sessions and revocation, Google linking rules, the password reset flow, email confirmation, recovery codes, and account deletion.
- **Rate limits:** a real server is started with limits on, to prove the counters are separate.
- **CI:** `.github/workflows/ci.yml` runs all of this, plus `npm audit`, on every push and pull request.

**Sample test papers.** The `samples/` folder, if present, has two complete papers (Physics: Electricity; DBMS and SQL), each with answer keys and three handwritten-style student sheets (strong, average and weak). Its README lists the marks the real AI gave, which is useful for checking grading after any change.

---

## 11. Deployment

### Render, as set up now
| Service | Type | Settings |
|---|---|---|
| `evaluaite-api` | Web service, Free, Oregon | Repo `vk26kumar/evaluaite`, branch `main`, root `BACKEND`, build `npm ci`, start `npm start`, health check `/api/health`, auto-deploy on commit, environment variables as in section 8 |
| `evaluaite` | Static site | Same repo and branch, root `FRONTEND`, build `npm ci && npm run build`, publish `dist`, `VITE_API_URL=https://evaluaite-api.onrender.com` |

The static site also needs:
- **Redirects/Rewrites:** `/*` → `/index.html`, action **Rewrite**. Without it, refreshing a page like `/evaluations` shows "Not Found".
- **Headers** (path `/*`): `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `Cross-Origin-Opener-Policy: same-origin`. Render adds HSTS and `nosniff` itself.

Pushing to `main` redeploys both services automatically.

### Google sign-in
In Google Cloud (project `ai-evaluaite`), open APIs & Services → Credentials → the OAuth client:
- **Authorized JavaScript origins:** `https://evaluaite.onrender.com`
- **Authorized redirect URIs:** `https://evaluaite-api.onrender.com/api/auth/google/callback` (plus localhost for development)

### Moving to a new host or domain
1. Deploy the backend anywhere Node 24 runs (Render, Railway, Fly.io). Deploy the frontend to any static host (Render, Vercel, Netlify, Cloudflare Pages) with an "all paths to `index.html`" rewrite.
2. Update `CLIENT_URL` on the backend, `VITE_API_URL` on the frontend, and both Google OAuth lists.
3. With a custom domain, add the email provider's DNS records (SPF and DKIM) if you turn email on.

---

## 12. Operations and maintenance

- **Health:** `GET /api/health` returns the database state, whether AI is configured, and the job queue counts. It returns 503 if the database is down.
- **Logs:** Render → service → Logs. Each request is one JSON line with `id`, method, path, status, milliseconds and user. A user reporting an error can give the `requestId` from the error message, so you can find the exact log line.
- **Keeping the backend awake:** the free plan sleeps after 15 idle minutes. An external cron job pings `/api/health` to prevent that.
- **Dependencies** are upgraded by hand and tested, not automatically. To check: `npm outdated` and `npm audit` in each folder. Bigger upgrades still open: Express 5, Mongoose 9, dotenv 18 and react-dropzone 20. Each needs code changes, so do them one at a time with a full test run.
- **Data cleanup script:** `npm run cleanup:legacy -- --db <name>` reports leftover data from the old app version. `--apply` cleans it up after writing a backup to `BACKEND/backups/` (git ignores that folder), and `--restore <file>` undoes it.
- **Rotating a secret:** change it at the source (Atlas, Google Cloud, AI Studio), update it in Render's environment, and save. Rotating `JWT_SECRET` signs everyone out once.

---

## 13. Limits and trade-offs

| Limit | Why it is this way | What to do when it matters |
|---|---|---|
| Free Render backend sleeps when idle; the first visit can take ~50 s | Free plan | The cron ping, or a paid instance |
| Gemini free plan: about 20 requests a day on the main model (each sheet uses 2) | Free plan | After that the fallback model is used, which is slightly more generous. Turn on billing, restrict the key to the Generative Language API and set a budget alert |
| Job queue and rate-limit counters live in server memory | Simple and right for one instance | Move both to Redis before running more than one instance |
| A restart interrupts running jobs | The in-memory queue | The job is marked interrupted; the teacher retries. A paid instance restarts less |
| Session token in `localStorage` | The website and API are on different `onrender.com` sites, where cookies are unreliable | Protected by the Content Security Policy and short sessions |
| Users without recovery codes (and no email set up) can't reset a forgotten password | No outside email service by choice | Google sign-in, or set up Brevo or Resend |
| Student names are matched by text | There are no student accounts | Use consistent names or roll numbers |
| Only teachers have accounts | The scope is assessment, not a school ERP | Adding student and parent roles, classes and attendance would be the next big step |

---

## 14. Design system

The look is called **"Red Pen"**: exam paper and a teacher's red pen.

- **Colours, fonts and spacing** are CSS variables in `FRONTEND/src/styles/tokens.css`. The light theme is "paper"; the dark theme is "chalkboard". The theme follows the system setting unless the user picks one, and is remembered in `localStorage` (`evaluaite.theme`).
- **Fonts:** Fraunces (headings), Instrument Sans (text), JetBrains Mono (numbers and codes), and Caveat (hand-written marks such as scores and "Examiner's note").
- **Shared building blocks** (`components.css`): buttons, fields, cards, badges, tabs, dialogs and toasts. Each page adds its own CSS file next to its code.
- **Accessibility:** a "Skip to content" link, visible keyboard focus, ARIA labels, live regions for progress and toasts, a table view next to the chart, and touch targets of at least 24 px (larger on touch screens).
- **Responsive design:** tested at 360, 390, 768 and 1280 px wide with no sideways scrolling.

---

## 15. Troubleshooting

| What you see | Cause | Fix |
|---|---|---|
| Server exits: "JWT_SECRET must be at least 32 characters" | Weak secret in production | Generate a long one (section 8) |
| "Not Found" when refreshing a page or after Google sign-in | Missing rewrite rule on the static site | Add `/*` → `/index.html` Rewrite |
| Google shows `redirect_uri_mismatch` | The callback URL isn't in the OAuth client | Add `https://<api>/api/auth/google/callback` |
| Website loads, but every action fails with "Can't reach the server" | `CLIENT_URL` on the backend doesn't match the website, or the backend is asleep | Fix `CLIENT_URL`, or wait a minute and retry |
| Grading fails: "AI service is at capacity" | Gemini quota or overload | Wait; fallback runs automatically; consider billing |
| "The server's Gemini API key was rejected" | Wrong or revoked key | New key in AI Studio, then update `GEMINI_API_KEY` |
| `querySrv ECONNREFUSED` when running locally | This computer's DNS can't resolve Atlas | Retried automatically; check the internet connection if it persists |
| "Too many attempts, wait 15 minutes" | A rate limit was hit | Wait; counters reset by themselves |
| Signed out with "your account's sign-in details changed" | The password changed, or another device chose "sign out other devices" | Sign in again |

---

## 16. History and key decisions

**Timeline**
- **2025:** started as a team project by three friends. The team version used Cohere for Q&A and an early Gemini integration. It is still deployed at `ai-evaluaite-1.onrender.com` from the original repository.
- **September 2026:** rebuilt from the ground up as a production-quality app:
  - real two-pass AI grading, question papers (merged in from a separate "Questrix" project), the profile with student marks and history, and a new interface
  - security hardening and tests
- **October 2026:** moved into this private repository and deployed separately as a personal project, with its own database.

**Decisions and why**
- **Gemini instead of Cohere:** Gemini reads handwriting directly from images and PDFs and returns JSON in a fixed shape, so one provider covers everything.
- **Two AI passes instead of one:** stops the AI "seeing" the expected answer in the handwriting.
- **Code fixes the marks:** AI output varies; clamping and rounding in code keeps marks fair and consistent.
- **Background jobs plus polling:** grading takes up to a minute, longer than a normal web request should wait.
- **No files stored:** less personal data held, lower cost, simpler privacy policy.
- **Plain CSS instead of a framework:** a distinctive look and nothing heavy to upgrade.
- **Normal URLs instead of `/#/`:** cleaner links. It needs one rewrite rule on the host, and old `/#/` links are converted.
- **Recovery codes instead of email for "forgot password":** works with no outside service or domain. Email is supported but optional.
- **Separate rate-limit counters:** many teachers in one school share an IP address, so one person's mistakes must not lock everyone out.
- **No automatic dependency pull requests:** they caused too many emails. Upgrades are done by hand and tested, and CI's `npm audit` catches known vulnerabilities.
- **Indexes created at start-up:** production has automatic indexing off, so indexes are created explicitly and never dropped.
