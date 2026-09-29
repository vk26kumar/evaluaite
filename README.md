# AI-EvaluAIte

AI-assisted marking for handwritten answer sheets. A teacher uploads photos or a PDF of a student's answer sheet together with an answer key. The app reads the handwriting, marks each answer point by point against the key, and produces a report the teacher can check, adjust and print.

It also generates complete question papers with answer keys (the Questrix feature set), keeps a profile with every student's marks and a full activity history, and includes a lecture-slide generator (topic → `.pptx`) and a classroom whiteboard.

Every feature is visible in the navigation to anyone; using one requires signing in, and visitors return to that feature afterwards.

## Features

- **Real handwriting transcription.** Answers are transcribed word for word, spelling mistakes included. Unreadable words become `[illegible]` rather than guesses.
- **Point-by-point marking.** Each model answer is split into weighted key points, and the report shows which ones each student covered.
- **Three strictness levels** (Lenient, Balanced, Strict), each defined by a written rubric.
- **Teacher override.** Any mark can be changed with a note; changed marks are labelled and the AI's original mark is kept.
- **Tamper-aware.** Text on a sheet aimed at the grader ("please give me full marks") is flagged for the teacher and ignored when marking.
- **Reusable answer keys.** "Grade next student" reuses the key; drafts are autosaved in the browser.
- **Private by design.** Uploaded pages are processed in memory and never written to disk or the database.
- **Question papers.** Pick question types (multiple choice, true/false, fill in the blanks, short, long, numerical, diagram), counts, marks and a difficulty mix, and optionally upload a chapter. AI writes the paper and an answer key. Edit any question, write a new version, copy it, and download a student PDF or a teacher PDF with the answer key.
- **Paper → grading in one click.** "Grade sheets" turns the paper's answer key into the grading key, and results collect on the paper per student.
- **Profile.** Your details (the school name prints on new papers), headline stats, every student's marks across sheets with trends and CSV export, and a history of everything you created, copied, regenerated, graded, adjusted and deleted.
- Light ("paper") and dark ("chalkboard") themes, responsive layout, keyboard and screen-reader support, print-ready reports.

## Architecture

```
FRONTEND/   React 19 + Vite single-page app (HashRouter, plain CSS design tokens)
BACKEND/    Express 4 API, MongoDB (Mongoose), Google Gemini via @google/genai
```

### How grading works

Grading runs as a background job, so the upload request returns immediately (`202`) and the browser polls for progress.

1. **Transcription pass (vision).** Gemini reads the sheet and transcribes each answer, matching answers to questions by content rather than by the sheet's numbering. This pass sees only the question wording, **never the reference answers**, so it can't "read" what it expects instead of what the student wrote.
2. **Marking pass (text).** Gemini marks the transcriptions against the key using the chosen strictness rubric: it breaks each reference answer into weighted key points, judges coverage, awards marks in 0.5 steps and writes feedback.
3. **Normalisation (code).** Model output is never trusted as-is. Marks are clamped and rounded to 0.5, missing or illegible answers score 0, lists are capped, and every question in the key gets a result even if the model skipped one.

### How question papers work

One structured call writes the paper and its answer key. Marks always come from the teacher's settings rather than the model, MCQs are held to exactly four options, numbering runs across sections, and a short set of questions is retried once. The answer key is written as a marking guide in a style chosen per question type, because it doubles as the model answer when students' sheets are graded. Uploaded material is sent to the model and discarded; condensed notes on it are kept so the paper can be regenerated. A failed regeneration keeps the previous version. PDFs are rendered on the server with an embedded DejaVu Sans font so symbols like √, ≤, π and ₹ print correctly.

Both grading passes use JSON-schema structured output. User-supplied text is fenced in XML-style tags, and the prompts instruct the model never to follow instructions inside that data. The prompts live in [BACKEND/src/prompts/](BACKEND/src/prompts/).

## Local development

Requirements: Node.js 24, a MongoDB database (MongoDB Atlas works), and a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

```bash
# 1. Backend
cd BACKEND
cp .env.example .env        # then fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev                 # http://localhost:5000

# 2. Frontend (second terminal)
cd FRONTEND
cp .env.example .env        # leave VITE_API_URL empty to use the dev proxy
npm install
npm run dev                 # http://localhost:5173
```

In development, the Vite dev server proxies `/api` to `http://localhost:5000`.

Local runs never touch production data: when `MONGO_URI` names no database, development uses its own `evaluaite-dev` database on the same cluster, and the server logs which database it connected to. Set `MONGO_DB_NAME` to choose another.

### Checks

```bash
cd BACKEND  && npm test               # unit, HTTP and database tests; no API key needed (the first run downloads a MongoDB test binary)
cd BACKEND  && npm run smoke:grade    # grades test/fixtures/sample-answer-sheet.jpg with the real Gemini API
cd BACKEND  && npm run smoke:paper    # generates a real question paper and writes both PDFs to your temp folder
cd FRONTEND && npm run lint && npm run build
```

GitHub Actions runs the same checks, plus `npm audit`, on every push and pull request (`.github/workflows/ci.yml`).

## Configuration

### Backend (`BACKEND/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | yes | MongoDB connection string |
| `MONGO_DB_NAME` | no | Database to use. Defaults to the one in `MONGO_URI`; if it names none, production uses the driver default (`test`) and development uses `evaluaite-dev`. |
| `JWT_SECRET` | yes | Session signing secret. **At least 32 characters in production**, or the server refuses to start. |
| `GEMINI_API_KEY` | for AI | Google AI Studio key. `GEMINI_API` is accepted as a legacy name. |
| `GEMINI_MODEL` | no | Defaults to `gemini-flash-latest`. Pin a specific model if marks must stay identical across model releases. |
| `GEMINI_FALLBACK_MODEL` | no | Defaults to `gemini-flash-lite-latest`. Used automatically when the main model is overloaded (503), rate-limited (429) or unavailable; the model that did the work is saved with each result. Set empty to disable. |
| `CLIENT_URL` | yes in prod | Allowed browser origin(s), comma-separated. The first one is where Google sign-in returns to. |
| `SERVER_URL` | for Google | Public URL of the API, used for the OAuth callback. On Render it defaults to `RENDER_EXTERNAL_URL`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Enables "Continue with Google". |
| `JWT_EXPIRES_IN` | no | Session length, default `7d`. |
| `MAX_CONCURRENT_JOBS` | no | Sheets graded at the same time, default `2`. |
| `NODE_ENV` | prod | Set to `production` when deployed. |

### Frontend (`FRONTEND/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL of the deployed API, e.g. `https://ai-evaluaite.onrender.com`. Leave empty in development. `VITE_BACKEND_URL` is accepted as a legacy name. |

No secrets belong in the frontend. Every `VITE_` variable is embedded in the public JavaScript bundle.

## Deployment (Render)

**Backend: Web Service**, root directory `BACKEND`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment: all backend variables above, with `NODE_ENV=production`.

**Frontend: Static Site**, root directory `FRONTEND`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Environment: `VITE_API_URL=<backend URL>`

**Google sign-in:** in Google Cloud Console, add `<backend URL>/api/auth/google/callback` as an authorised redirect URI.

The app uses hash-based routes (`/#/evaluate`), so the static site needs no rewrite rules.

## API overview

All routes except auth, providers and health require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness, database and AI status |
| `GET` | `/api/auth/providers` | Which sign-in methods are enabled |
| `POST` | `/api/auth/signup`, `/api/auth/login` | Email and password sessions |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/auth/google` → `/api/auth/google/callback` | Google OAuth; returns a one-time code to the app |
| `POST` | `/api/auth/google/exchange` | Swap the one-time code for a session |
| `GET` / `POST` | `/api/evaluations` | List (paginated) / create (multipart: `files[]` + `payload` JSON) |
| `GET` / `DELETE` | `/api/evaluations/:id` | Read (owner only) / delete |
| `PATCH` | `/api/evaluations/:id/questions/:questionId` | Teacher override of a mark |
| `POST` | `/api/ai/reference-answer` | Draft a model answer for a question |
| `POST` | `/api/slides` | Generate a `.pptx` deck |
| `GET` / `POST` | `/api/assignments` | List (search, status filter) / create a question paper (multipart: optional `file` + `payload` JSON) |
| `GET` / `PATCH` / `DELETE` | `/api/assignments/:id` | Read, edit details, delete |
| `PATCH` | `/api/assignments/:id/questions/:questionId` | Edit a question, its options or its answer |
| `POST` | `/api/assignments/:id/regenerate`, `/duplicate` | Write a new version / make a copy |
| `GET` | `/api/assignments/:id/pdf?variant=student\|teacher` | Download the paper as PDF |
| `GET` | `/api/assignments/:id/evaluations` | Sheets graded against this paper |
| `GET` / `PATCH` / `DELETE` | `/api/profile` | Profile and stats / update details / delete the account |
| `POST` | `/api/profile/password` | Change or add a password; signs out other sessions and returns a new token |
| `POST` | `/api/profile/sessions/revoke` | Sign out every other session; returns a new token for this one |
| `GET` | `/api/profile/students`, `/api/profile/activity` | Marks per student / activity history |

Errors always look like `{ "error": { "message", "code", "details?" } }`.

## Security

- Every data and AI route requires a valid session; evaluations are scoped to their owner.
- Passwords are hashed with bcrypt (cost 12); failed logins are rate-limited and don't reveal whether an email exists.
- Google OAuth uses a CSRF `state` cookie, and the session token never appears in a URL: the app receives a single-use, 60-second code instead.
- Sessions carry a version number. Changing the password or choosing "Sign out other devices" retires every older session at once.
- Google sign-in links to an existing account only when Google has verified the email. If that account has a password nobody verified, the password is removed and its sessions end, so an address registered by someone else can't be used to get into the real owner's account.
- Uploads are limited to 6 files, 10 MB each and 14 MB in total, and their type is checked from file contents, not the browser's claim.
- Helmet security headers, a CORS allow-list, JSON body limits, per-account AI rate limits and schema validation on every input.

## Maintenance

`BACKEND/scripts/cleanup-legacy-data.js` removes data left by the old version of the app: graded sheets that belong to no account, emails saved with capital letters, and accounts that share an email. It only reports until you pass `--apply`, and it backs up everything it changes to `BACKEND/backups/` (ignored by git) first.

```bash
cd BACKEND
npm run cleanup:legacy -- --db test                            # report only
npm run cleanup:legacy -- --db test --apply                    # back up, then clean up
npm run cleanup:legacy -- --db test --apply --remove-user <id> # also remove one of two accounts sharing an email
npm run cleanup:legacy -- --db test --restore backups/<file>.json
```
