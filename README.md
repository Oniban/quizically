# Quizzically

A full-stack app for asynchronous, casual quiz practice. Authenticated users can publish quizzes, play them independently, and review their own saved results. This is not a moderated or anti-cheat competition platform.

## Implemented

- [x] Email/password signup and login, cookie-based JWT sessions, and optional Google sign-in. Logout clears the browser's HttpOnly cookie and client session; failed logout is reported rather than silently pretending to succeed. Automatic linking of Google identities to existing email/password accounts is blocked because local email ownership is not yet verified. Use the original sign-in method for an existing account.
- [x] Quiz creation and play for **MCQ**, **True-False**, and **Short Answer**. A quiz contains **1-30 questions**, all sharing one genre, difficulty (Easy, Medium, or Hard), and answer format. MCQs have 2-6 unique options; explanations are optional author-written content.
- [x] Instant publishing for **every authenticated user**. Published quizzes are immutable through the app: there is no draft persistence, approval queue, edit, or delete flow.
- [x] Server-side scoring: one point per correct answer, zero for incorrect or unanswered questions. Short answers use normalized exact matching: Unicode NFKC normalization, trimming, collapsed whitespace, and lowercase comparison. Synonyms, alternate wording, and fuzzy/AI judging are not supported.
- [x] **One persisted attempt per user per quiz**, enforced by a database unique index. Repeated submissions, including concurrent retries, return the original attempt rather than scoring again. Reopening a completed quiz leads to review, not another scored run.
- [x] Saved attempt snapshots retain question text, submitted and correct answers, explanations, metadata, score, accuracy, and completion time. Reviews are accessible only to the attempt owner, not another player or even the quiz author. Playable quiz responses do not expose answer keys or explanations.
- [x] Published quiz catalogue on Home and personal **Past Sets** history, each paginated at 12 entries per page. Home's most recent item is the signed-in user's latest saved attempt, not the latest globally published quiz.
- [x] Real personal performance totals and accuracy breakdowns by genre, difficulty, and answer format, calculated from saved attempts rather than sample statistics.
- [x] Casual leaderboard, optionally filtered by genre: total correct answers descending, then unrounded accuracy descending, with a stable user-ID tie-break. It returns up to 100 players. Attempts on a player's own authored quizzes are excluded from ranking, but still count toward personal history, performance, and streaks.
- [x] Completion streaks based on consecutive **UTC dates** with saved attempts. Multiple completions on one date count as one streak day. A streak remains active if the latest completion was today or yesterday; older activity yields zero. Signing in does not extend a streak, and no cron job is required.
- [x] Profile completion counts and streaks use persisted activity. Mobile navigation and responsive layouts, light/dark themes, a paintings carousel, figure-skater loading animation with contextual tips, and loading/error/retry/empty states are implemented.

The single-attempt rule and author exclusion prevent repeat scoring and self-scoring on the leaderboard. They do **not** prevent answer sharing, multiple accounts, collusion, or low-quality user-published content. Treat rankings as a casual practice summary.

## Not Implemented

- [ ] Imported content archive: awaiting a friend's dataset. The implemented personal **Past Sets** page is attempt history, not that archive.
- [ ] Quiz Master (QM) dataset browser: currently an explicit awaiting-data placeholder, with no fabricated profiles or statistics.
- [ ] AI Question of the Day (QOTD): daily questions, provider integration, scheduling, and AI explanations are not implemented. The page is a placeholder, not a pending AI request.
- [ ] Hot Topics/news: provider integration is not implemented; no live news feed or headlines are fetched.
- [ ] Live **Buzzer**, **Pounce and Bounce**, and **Written** rounds, rooms, and code-based joining remain deferred. The implemented asynchronous Short Answer format is not a live Written round.
- [ ] Profile editing is not available.

For the deferred live rules, **Pounce is confirmed as +5 for correct and -10 for incorrect**. Bounce scoring, team rules, timing, and judging remain unresolved. These live rules are not used by current asynchronous scoring.

There is **no automatic quiz, attempt, or QM data seeding**. A fresh database starts with empty quiz and activity views; register and publish a practice quiz to populate it. AI and news pages clearly indicate that their integrations are not configured.

## Stack

- Client: React 19, Vite 8, React Router, Tailwind CSS 4, Axios, and Recharts.
- Server: Node.js, Express 5, Mongoose, and MongoDB.
- Tests: Node's built-in test runner with `mongodb-memory-server` for API integration tests; Vitest and React Testing Library for client tests.
- Separate npm projects and lockfiles live in `server/` and `client/`; there is no root npm install step.

## Authentication Rules

Passwords require at least eight characters, including uppercase, lowercase, and a number. Registration and login enforce a maximum of **72 UTF-8 bytes**, matching bcrypt's input limit. Multibyte characters count toward that byte limit; the client and API reject overlong passwords instead of silently truncating them.

Existing bcrypt hashes cannot reveal whether an older password exceeded 72 bytes. Such credentials now require an operator-assisted password reset to a compliant password; self-service recovery is still pending. Existing compliant passwords are unchanged.

The incremental fixes, regression coverage, and compatibility notes are recorded in [the audit fix log](docs/audit-fixes.md).

## Local Setup

### Prerequisites

- **Node.js 22 LTS, version 22.22.2 or newer in the 22.x line**, is recommended. The test tooling also supports Node 24.15+ in the 24.x line and Node 26+. `.nvmrc` selects major version 22. With nvm, run `nvm install` and `nvm use` from the repository root.
- npm (included with Node).
- A running local MongoDB instance or an Atlas database. For Atlas, configure a database user and allow the connecting machine's IP in Network Access.

### Dependencies

Run from the repository root, using the committed lockfiles:

```bash
npm ci --prefix server
npm ci --prefix client
```

### Environment

Use `server/.env.example` as the template for `server/.env`. Do not commit real credentials.

| Server variable | Requirement |
| --- | --- |
| `MONGO_URI` | Required. Local example: `mongodb://127.0.0.1:27017/quizzically`; an Atlas connection URI also works. |
| `JWT_SECRET` | Required, randomly generated, at least 32 characters. Do not use a shared example secret. |
| `PORT` | `5000` for the supplied local Vite proxy. |
| `NODE_ENV` | `development` locally; `production` for deployment. |
| `CLIENT_URL` | `http://localhost:3000` locally; the exact frontend origin in production, where it is required. |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth web client ID. Leave empty to disable Google sign-in. |

Generate a local secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`client/.env.example` documents the optional `VITE_GOOGLE_CLIENT_ID` for `client/.env`. Email/password authentication works without it. To enable Google sign-in, set **both** `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` to the same Google OAuth web client ID and authorize the frontend origin (locally `http://localhost:3000`) in Google's configuration. Restart development processes after environment changes; rebuild the client when its build-time variables change. Never place secrets in `VITE_*` variables because they are included in the browser bundle.

### Run

Start the API in one terminal from the repository root:

```bash
npm run dev --prefix server
```

Start the frontend in a second terminal:

```bash
npm run dev --prefix client
```

Open **http://localhost:3000**. The Vite development server proxies `/api` to `http://localhost:5000`. Keep port 3000 available; Vite fails explicitly if it is occupied instead of silently choosing a port that does not match the allowed origin. Changing the API port also requires updating the development proxy target in `client/vite.config.js`.

The API connects to MongoDB and initializes the attempt uniqueness index before listening. Missing `MONGO_URI` or a `JWT_SECRET` shorter than 32 characters prevents startup.

## Tests And Build

Run from the repository root after installing dependencies:

```bash
npm test --prefix server
npm run test:unit --prefix server
npm test --prefix client
npm run build --prefix client
```

- `npm test` in `server/` runs `node --test`, including rule tests and API integration tests against a real HTTP server and an isolated temporary MongoDB created by `mongodb-memory-server`. Tests do not load `server/.env` or connect to the application's configured database. No local MongoDB or Atlas credentials are needed for tests.
- `mongodb-memory-server` downloads a MongoDB binary on its first run. Installation or the first API test run therefore needs network access to the download host, and the binary needs a compatible OS/runtime. Later runs can reuse the downloaded binary. A blocked download is an environment failure, not a reason to point tests at a real application database.
- `npm run test:unit` in `server/` runs only the pure quiz-rule tests and works offline without MongoDB or a binary download. It does not replace the API suite.
- `npm test` in `client/` runs Vitest once; `npm run test:watch --prefix client` enables watch mode.
- `npm run build` in `client/` produces `client/dist/`.

GitHub Actions in `.github/workflows/ci.yml` checks pushes and pull requests using Node 22. Separate server and client jobs use their own lockfile-keyed npm caches, install with `npm ci`, run both test suites, and build the client. The API job uses temporary MongoDB, not a provisioned database or repository secrets. CI is verification only, not deployment.

## Production Deployment

Host configuration is **not provisioned** by this repository. A working deployment needs all of the following:

- Install server dependencies with `npm ci --omit=dev --prefix server`. Configure a reachable MongoDB database, a strong `JWT_SECRET`, `NODE_ENV=production`, the API `PORT`, and `CLIENT_URL` equal to the public HTTPS frontend origin.
- Install client build dependencies with `npm ci --prefix client`, then run `npm run build --prefix client`. Serve `client/dist/` from a static host with an **SPA fallback to `index.html`** for client routes such as `/quiz/:id` and `/attempts/:id`.
- Run the API with `npm start --prefix server`. Express serves the API, not the built frontend.
- Configure a **same-origin `/api` reverse proxy** from the public frontend host to Express, preserving the `/api` path. Route these requests to the API before applying the SPA fallback. Both client services hardcode relative `/api` URLs; there is no configurable API-base environment variable. `CLIENT_URL` configures CORS, not the client's API destination. A separately hosted API URL alone will not work.
- Use **HTTPS** at the public origin. Production authentication uses an `HttpOnly`, `Secure`, `SameSite=Strict` cookie. Preserve cookie headers through the proxy; cross-site frontend/API hosting is not the supported setup.
- Configure proxy trust only for the actual, known deployment topology if needed. The app does not enable permissive `trust proxy`; do not blindly set it to `true` to accommodate forwarded headers, since client-IP rate limiting depends on those trust boundaries.
- Supply host-specific TLS, process supervision, database backups, and operational monitoring. Vite's development proxy and preview command are not a production hosting configuration.

## Bounded Next Steps

- [ ] Agree on the friend's dataset schema and provenance, then implement a validated import and a small real QM/archive browsing slice without inventing missing statistics.
- [ ] Add local-email verification, password recovery, and explicit verified account linking. JWTs are stateless: clearing a browser cookie does not revoke a previously copied token; server-side session revocation is a separate hardening task.
- [ ] Define and test one target production host's static fallback, `/api` proxy, HTTPS cookies, and trusted-proxy topology before deployment.
- [ ] Add browser-level smoke tests for signup, publishing, single-attempt play/review, logout, and mobile/dark layouts; component tests do not verify a deployed browser flow.
- [ ] Choose and integrate one QOTD or news provider with explicit failure states and source attribution before presenting it as available.
- [ ] Resolve Bounce scoring, team rules, timing, and judging before designing a bounded live-room prototype. Preserve the confirmed Pounce +5/-10 rule separately from practice scoring.
