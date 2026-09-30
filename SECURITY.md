# Security

## Reporting a vulnerability

Email **vkumar26062003@gmail.com** with the steps to reproduce. Please don't open a public issue for security problems. You'll get a reply within a few days, and a fix or a plan within two weeks. The same contact is published at `/.well-known/security.txt`.

## Production checklist

`[x]` is in place in the code. `[ ]` is a step for whoever runs the deployment.

### Transport and headers

- [x] HTTPS everywhere (Render terminates TLS and redirects HTTP).
- [x] API headers from Helmet: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, no `X-Powered-By`.
- [x] Strict API Content Security Policy: `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`.
- [x] `Referrer-Policy: no-referrer` on the API.
- [x] `Cache-Control: no-store` on every API response, and ETags off, so private data isn't cached by browsers or proxies.
- [x] CORS allow-list: only the origins in `CLIENT_URL` can call the API from a browser.
- [x] Frontend Content Security Policy, built into `index.html` at build time: scripts only from the site itself plus a hash of the one inline theme script, API calls only to `VITE_API_URL`, no plugins, no `<base>` tricks.
- [ ] Add the static-site headers below in the Render dashboard (a `<meta>` CSP can't block framing).

### Authentication and sessions

- [x] Signed JWT sessions (HS256 only, issuer and audience checked, 7-day expiry). The secret must be at least 32 characters or production refuses to start.
- [x] The account is looked up on every request, so deleted accounts lose access at once.
- [x] Session versions: changing or resetting the password, or "Sign out other devices", retires every older session.
- [x] Google sign-in uses a CSRF `state` cookie (httpOnly, Secure, SameSite=Lax, 10 minutes). The browser gets a single-use 60-second code, never the session token in a URL.
- [x] Google links to an existing account only when Google has verified the email. An unverified password on that account is removed and its sessions end, which blocks pre-registration takeover.
- [x] Deleting an account needs the password (for password accounts) and typing DELETE.
- [x] Sign-in errors don't reveal whether an email has an account, and a miss takes as long as a hit.

### Passwords and account recovery

- [x] bcrypt with cost 12.
- [x] 8 to 72 bytes (bcrypt ignores anything longer, so longer passwords are refused rather than silently cut), with a letter and a number.
- [x] Common passwords and passwords containing the email name are refused.
- [x] Forgot password: the reply is identical whether or not the account exists. Reset links are random 256-bit tokens, stored only as SHA-256 hashes, single-use, 30 minutes, and a new link cancels the old one.
- [x] A reset confirms the email, signs out every other session and emails a "password changed" notice.
- [x] Recovery codes, with no outside service: 10 random codes (50 bits each), shown once, stored only as SHA-256 hashes. Creating them needs the password; each works once; a new set replaces the old; using one signs out every other session. Wrong codes count towards the per-IP and per-account failure limits.
- [x] Linking Google to an account whose password nobody verified also deletes that account's recovery codes, so codes made by whoever registered the address first stop working.
- [x] Email confirmation: 24-hour single-use links, resendable from Profile, Account.
- [ ] Optional: set up an email provider (see "Email" in the README) to add reset links by email.

### Authorisation and data access

- [x] Every data and AI route requires a session. Sheets, papers, history and student marks are always filtered by the signed-in owner, so one teacher can never read another's data.
- [x] Ids are validated before use; a bad id is a 400, not a crash.

### Input handling

- [x] Every body and query is validated with zod before use.
- [x] JSON bodies are capped at 200 KB.
- [x] Uploads: at most 6 files, 10 MB each and 14 MB in total, kept in memory only, with the file type checked from the file's contents rather than its name.
- [x] Search text is escaped before it becomes a regular expression; Mongoose `strictQuery` is on.
- [x] React escapes all output; there is no `dangerouslySetInnerHTML`. Email templates HTML-escape names.

### Abuse protection

| What | Limit | Counted per |
|---|---|---|
| All API requests | 600 per 15 min | IP |
| Sign-ups | 20 per hour | IP |
| Failed sign-ins | 20 per 15 min, and 10 per 15 min per account | IP, account |
| Failed one-time links and recovery codes | 20 per 15 min, and 10 per 15 min per account for codes | IP, account |
| Failed password change, sign-out-all, delete | 10 per 15 min | account |
| Reset emails | 5 per 15 min, and 3 per hour per address | IP, address |
| Confirmation emails | 3 per hour | account |
| AI requests (grading, papers, slides, drafts) | 60 per hour | account |

Each row has its own counter, so mistakes in one place (for example a bad link) never lock anyone out of signing in. Many teachers can share a school's IP.

### AI safety

- [x] The handwriting pass never sees the reference answers, so it can't "read" what it expects.
- [x] Everything a user supplies is fenced as data, and the prompts tell the model never to follow instructions inside it. Text on a sheet aimed at the grader is flagged for the teacher and ignored when marking.
- [x] Model output is never trusted: marks are clamped and rounded in code, and malformed output is retried and then rejected.
- [x] Blocked or unusable responses become clear errors. Overloaded models fall back to a second model.

### Secrets and configuration

- [x] Configuration is validated at startup; the server refuses to start in production with a weak secret or with the development email mode.
- [x] `.env` files are git-ignored; only `.env.example` is committed. Nothing secret is in the frontend bundle.
- [x] Local runs use a separate `evaluaite-dev` database, never production data.
- [ ] Rotate any secret that was ever shared in a screenshot or chat.
- [ ] Remove `VITE_COHERE_API_KEY` from the Render frontend and revoke that key.
- [ ] Restrict the Gemini key to the Generative Language API in Google Cloud.

### Dependencies and CI

- [x] Lockfiles committed; `npm ci` in CI.
- [x] GitHub Actions on every push and pull request: backend lint and 75 tests (including a throwaway MongoDB), frontend lint and build, and `npm audit` failing on high-severity issues.
- [x] CI also runs every Monday, so `npm audit` catches newly published vulnerabilities without any automated pull requests. Dependencies are upgraded by hand and tested, because new versions can change behaviour.
- [x] Tests contain no hard-coded passwords or secrets: credentials are generated at run time (`BACKEND/test/credentials.js`), so secret scanners have nothing to flag.
- [ ] In GitHub settings, turn on secret scanning with push protection, and require the CI check before merging to `main`.

### Logging and monitoring

- [x] One JSON log line per request in production, with a request id (`X-Request-Id`, also returned to the browser and shown in 500 errors), method, path without the query string, status, duration and user id. Tokens, passwords and request bodies are never logged.
- [x] Security events go into each user's activity history (password changes and resets, email confirmed, Google linked, other devices signed out).
- [ ] Point an uptime monitor at `/api/health`, and add error tracking such as Sentry if you want alerts.

### Data protection and privacy

- [x] Uploaded answer sheets are processed in memory and never stored.
- [x] Users can delete their account, which removes every paper, sheet, history entry and pending link.
- [x] Privacy policy and terms at `/privacy.html` and `/terms.html`.
- [ ] Turn on MongoDB Atlas backups, and restrict the database user to this app's database.

### Reliability and system design

- [x] Stateless API: sessions are tokens, so any instance can serve any request.
- [x] Grading and paper generation run as background jobs with a concurrency limit and a queue cap. The upload returns `202` at once and the browser polls. Jobs interrupted by a restart are marked as such at startup, and a failed regeneration keeps the previous paper.
- [x] Timeouts everywhere: 120 s per AI call, 10 s per email, 5 minutes per request, and keep-alive and header timeouts suited to running behind Render's proxy.
- [x] Graceful shutdown on `SIGTERM`: stop accepting requests, finish open ones, close the database.
- [x] Health check at `/api/health` reports the database, AI and job queue.
- [x] Database indexes on every lookup path, created at start-up if missing, and TTL indexes that delete expired sign-in codes and email links automatically.
- [ ] The job queue and rate-limit counters live in the server's memory, which is right for one instance. Before running more than one instance, move both to Redis.
- [ ] Render's free plan sleeps after 15 idle minutes (the first visit then waits about a minute) and restarts interrupt running jobs. A paid instance avoids both.

## Render static-site headers

In Render, open the frontend static site, then **Settings, Headers**, and add these for the path `/*`:

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `frame-ancestors 'none'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

The fuller Content Security Policy is already in the built `index.html`; this header only adds the framing rule, which a `<meta>` tag can't set.
