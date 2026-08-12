# AI-Integrated Web-Based University of Kigali Final Project Coordination System

See `CLAUDE.md` for the build brief and phase plan, `docs/System_Design_Document.md` for the original pre-implementation design (ERD, planned API/AI spec), and **`docs/TECHNICAL_DOCUMENTATION.md` for the full as-built reference** (verified schema, complete API reference, AI algorithm details, demo accounts) — start there if you want the authoritative picture of what's actually implemented.

## Services

| Service | Path | Stack | Dev port |
|---|---|---|---|
| Backend API | `backend/` | Node.js + Express + MySQL | 5000 |
| AI microservice | `ai-service/` | Python + FastAPI | 8000 |
| Frontend | `frontend/` | React (Vite) + Tailwind | 5173 |

## Environment variables

Each service has its own `.env.example` — copy it to `.env` and adjust as needed.

| Service | Variable | Purpose |
|---|---|---|
| `backend/` | `PORT` | Express port (default `5000`) |
| | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| | `JWT_SECRET`, `JWT_EXPIRES_IN` | Token signing — **change `JWT_SECRET` from the placeholder** before any real deployment |
| | `AI_SERVICE_URL` | Base URL of the Python ai-service |
| | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | nodemailer SMTP — leave `MAIL_HOST`/`MAIL_USER` blank to skip email sending (it logs and continues; used throughout local dev) |
| | `CLIENT_ORIGIN` | Allowed CORS origin for the frontend |
| `ai-service/` | `DUPLICATE_THRESHOLD`, `SIMILAR_THRESHOLD` | Cosine-similarity cutoffs for duplicate/similar/none verdicts (§7.1) |
| | `PLAGIARISM_HIGH_THRESHOLD`, `PLAGIARISM_MEDIUM_THRESHOLD` | Cosine-similarity cutoffs for the plagiarism risk band (§7.3) |
| `frontend/` | `VITE_API_URL` | Backend API base URL |

## Running locally

### Database (MySQL, e.g. via XAMPP)
```
cd backend
cp .env.example .env      # adjust DB_USER / DB_PASSWORD if not using default root/no-password
npm install
npm run db:migrate        # creates the database and all 11 tables from database/migrations/*.sql
npm run db:seed           # inserts a fuller fictional demo dataset (see below) - skips if users already exist
```
The seed creates 1 coordinator, 6 supervisors, 20 students, 20 topics (5 left available to browse/select),
and 15 projects spread across every stage (3 unallocated proposals, 6 in-progress, 3 with an upcoming
scheduled defense, and 3 completed-and-archived-into-the-repository) with matching milestones, feedback,
allocations, defense schedules, and audit log entries — so a demo or viva can show every feature immediately
without manually creating data first. All accounts share the password `Passw0rd!`; the full list of emails is in
`database/seed.js`. Primary accounts: `student.demo@uok.example` / `supervisor.demo@uok.example` / `coordinator.demo@uok.example`.

### Backend
```
cd backend
npm run dev
```
Health check: `GET http://localhost:5000/api/v1/health` — reports `"db": "connected"` once migrations have run.

### AI microservice
```
cd ai-service
python -m venv venv
./venv/Scripts/activate   # or source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Health check: `GET http://localhost:8000/health`. First request after a fresh install downloads the
`all-MiniLM-L6-v2` sentence-transformer model (~80MB) into `ai-service/models/` and caches it there.
Run its test suite with `pytest tests/` (also downloads/uses the real model - not mocked).

### Frontend
```
cd frontend
cp .env.example .env
npm install
npm run dev
```
Opens at `http://localhost:5173`.

## Running tests

```
cd backend && npm test          # Jest - rule-based AI logic (allocation scoring, defense conflicts, deadline prediction)
cd ai-service && pytest tests/  # pytest - real embedding model, incl. hand-built known-similar/different topic pairs
```

## Status

Phase 1 (scaffolding), Phase 2 (database), and Phase 3 (Auth & Users) complete:
- All three services boot locally, the MySQL schema for all 11 ERD entities exists with foreign keys/indexes, and fictional demo data is seeded.
- `POST /auth/register` (student/supervisor self-registration only — coordinator accounts are promoted via `PATCH /users/:id/role`), `POST /auth/login` (JWT + bcrypt), `GET /users/me`, and coordinator-only `GET /users`, `PATCH /users/:id/role`, `PATCH /users/:id/status` are live, with RBAC middleware and audit-log entries on role/status changes.
- Frontend login page calls the real backend, redirects by role, and protects `/student`, `/supervisor`, `/coordinator` routes.

Phase 4 (Topics & Proposals) complete:
- `GET/POST /topics`, `POST /topics/:id/check-duplicate`, `POST /topics/suggest` — topic creation runs through a stubbed AI duplicate-check (`backend/src/ai/aiServiceClient.js`, always reports "no duplicate" until Phase 7 wires up the real embedding service); `/topics/suggest` uses a naive SQL `LIKE` keyword match as an honest interim placeholder, not a fake AI result.
- `POST /proposals`, `GET /proposals/:id` — submitting a proposal creates the initial `PROJECTS` row (stage `proposal`) tied to an approved, unclaimed topic.
- `POST/GET /projects/:id/documents` — multer-based versioned document upload, restricted to PDF/Word, capped at 20MB, scoped to the owning student.
- Frontend: `/student/topics` (browse available topics, keyword-based suggestions, propose a new topic) and `/student/proposal` (submit proposal + upload the initial document), both wired to the real API.
- Verified end-to-end via curl (RBAC, duplicate-claim rejection, file-type rejection) and via a real headless-browser run of the full browse → select → submit → upload flow, with DB/disk state checked afterward.

Phase 5 (Projects, Milestones, Feedback) complete:
- `GET /projects` (supervisor sees own, coordinator sees all, filterable by `?stage=`), `GET /projects/:id`, `PATCH /projects/:id/stage` (supervisor must be the assigned one, or coordinator; logged to `audit_log`).
- Submitting a proposal now also creates the 6 default `MILESTONES` rows (Proposal, Chapter 1, Chapter 2, Chapter 3, Final, Defense) — Proposal starts `submitted`/100%, the rest `pending`/0%.
- `GET /projects/:id/milestones`, `PATCH /projects/:id/milestones/:milestoneId` (supervisor/coordinator; auto-stamps `completed_at` when set to `approved`).
- `POST/GET /projects/:id/feedback` — supervisor (assigned) or coordinator can comment/rate; student/supervisor/coordinator can view.
- Frontend: `/student/progress/:projectId` (milestone progress bars + feedback history) and `/supervisor` (my-students list) → `/supervisor/projects/:projectId` (stage dropdown, per-milestone status control, feedback form/history).
- Note: supervisor allocation is Phase 6, so there's no UI yet to assign a supervisor to a project — verified the supervisor-side endpoints by assigning one directly in the DB for testing, then removing the test row.
- Verified end-to-end via curl (RBAC on stage/milestone/feedback updates, audit-log entries) and a real headless-browser run of both the student progress view and the supervisor update/feedback flow.

Phase 6 (Supervisor Allocation, Defense Scheduling, Notifications) complete:
- `backend/src/ai/supervisorAllocation.js` — rule-based scoring: `(supervisor tag overlap with the topic text) * (1 / (1 + active project count))`, no ML/training data involved. 7 Jest unit tests cover tag parsing, zero-overlap, overlap rewarding, and workload penalization/ranking order.
- `backend/src/ai/defenseScheduling.js` — rule-based constraint checker: tries candidate date/room slots in order, skips any that conflict on room or panel-member time overlap. 7 Jest unit tests cover room conflicts, panel conflicts, slot selection, and the all-conflicting case.
- `GET /allocations/recommendations?projectId=`, `POST /allocations` (coordinator-only; updates `PROJECTS.supervisor_id` and logs to `audit_log`).
- `POST /defense/schedule` (validates the project is in the `defense` stage and all panel member IDs exist before touching the scheduler), `GET /defense/:projectId`, `PATCH /defense/:id/result` (audit-logged).
- Notifications: Socket.io per-user rooms (`backend/src/sockets/index.js`, client joins via JWT after connecting) + DB-backed `GET/PATCH /notifications`, wired into feedback-posted, stage-change, and defense-scheduled events. Email delivery via nodemailer degrades gracefully (logs and skips) when SMTP isn't configured, which is the case in this dev environment.
- Frontend: `/coordinator/allocations` (ranked recommendations with match score + matched tags, one-click allocate) and `/coordinator/defense` (look up or schedule a defense, record results), plus a `NotificationBell` component on all three dashboards showing live + persisted notifications.
- Verified via the full Jest suite (14/14 passing), curl-based RBAC/conflict-skipping tests, and a real headless-browser run of the allocation flow end-to-end.
- Bug caught and fixed during testing: `POST /defense/schedule` didn't validate that `panel_members` referred to existing users, so a bad ID crashed with an unhandled foreign-key error partway through (after already inserting the schedule row). Added an explicit existence check that now returns a clean 400.

Phase 7 (AI microservice + real integration) complete:
- `ai-service/main.py` — real endpoints backed by `sentence-transformers` (`all-MiniLM-L6-v2`) + cosine similarity: `/embed`, `/duplicate-check` (verdict `duplicate`/`similar`/`none` against configurable thresholds), `/suggest-topics` (ranked by similarity), `/plagiarism-check` (risk band `low`/`medium`/`high`). 10 pytest tests, including hand-built known-similar and known-different topic pairs (`ai-service/tests/`), all passing against the real model output — this is the evaluation evidence for the duplicate-detection thresholds.
- `backend/src/ai/aiServiceClient.js` now makes real HTTP calls (Node's native `fetch`, no new dependency) instead of the Phase 4 stub.
- `topics.controller.js` rewired: new topics get a real embedding, compared against every existing topic's embedding (backfilled and cached into `TOPICS.embedding_vector` on first use, per the design doc); verdict `duplicate`→status `duplicate`, `similar`→status `pending` (coordinator review), `none`→auto-`approved`. `/topics/suggest` now ranks by real cosine similarity instead of the old `LIKE` placeholder.
- Plagiarism-check wired into chapter/final document uploads: `backend/src/utils/textExtraction.js` (pdf-parse for `.pdf`, mammoth for `.docx`) extracts the new document's text, compares it against up to 20 other projects' chapter/final documents, and stores the resulting risk score on `PROJECTS.plagiarism_score`. Best-effort by design — a failed extraction or an unreachable AI service logs a warning and lets the upload succeed rather than blocking it, since this is a secondary signal, not a gate.
- `backend/src/ai/deadlinePrediction.js` (rule-based, Node-only, no ML) — risk band from counting late/overdue milestones, predicted completion date from the system-wide average days-per-milestone seen so far (documented as a first-version approximation, matching the design doc's own "future work" framing). 8 Jest unit tests. Exposed as `POST /projects/:id/predict-deadline`.
- Frontend: the topic-propose form now shows the real similarity score behind a duplicate/similar verdict; the student progress page and supervisor project detail page show `plagiarism_score` and `predicted_deadline`, and supervisors can trigger a fresh prediction with a button.
- Two bugs caught and fixed during testing: (1) mysql2 returns JSON columns as raw strings, not parsed values — `topics.embedding_vector` and `defense_schedule.panel_members` were being used/returned unparsed in a couple of spots; added explicit `JSON.parse` where needed. (2) `pdf-parse` v2 (auto-installed by npm as the current major version) turned out to be a much heavier, URL-fetching-capable API than this project needs — downgraded to the simpler, well-established v1 `pdf(buffer)` API.
- Verified via the full pytest suite (10/10), full Jest suite (22/22), curl-based tests against the real running ai-service (near-duplicate topic scored 0.789 → `similar`; genuinely different topic → `none`; near-identical chapter upload → plagiarism risk 100%), and a real headless-browser run confirming the UI displays the real similarity/risk numbers.

Phase 8 (Repository & Reports) complete:
- `POST /repository/archive/:projectId` (coordinator-only) — requires the project to be in the `completed` stage with at least one `final` document uploaded; copies title/department/year/keywords (defaults to the topic description if not supplied) and the final document's path into `REPOSITORY`. Re-archiving the same project is rejected with 409.
- `GET /repository/search` (all roles) — `?q=` (MySQL `FULLTEXT` search on title+keywords), `?department=`, `?year=`, any combination; no embeddings, per the design doc's explicit "keeps this feature cheap to build" call.
- `GET /reports/projects` and `GET /reports/defense` (coordinator-only) — `?format=excel` (default, via `exceljs`) or `?format=pdf` (via `pdfkit`), streamed directly as a file download.
- Frontend: `/repository` (search, linked from all three dashboards), `/coordinator/archive` (archive a completed project), `/coordinator/reports` (download buttons that fetch as a blob and trigger a real browser download, since a plain link can't carry the JWT auth header).
- While adding `exceljs`/`pdfkit`, `npm install` also surfaced several actively-relevant high-severity `nodemailer` advisories (SMTP command injection, CRLF injection, SSRF) — upgraded `nodemailer` from 6.x to 9.x (API used here — `createTransport`/`sendMail` — is unchanged). Left two low-practical-risk transitive advisories in place: `tar` via `bcrypt`'s build-only `node-pre-gyp` (unreachable at runtime, pre-existing since Phase 1), and `uuid` via `exceljs`'s pinned internal dependency (moderate severity, requires an API path this project doesn't use; fixing it would mean downgrading exceljs, which is worse).
- Verified end-to-end via curl (stage/final-document guards, duplicate-archive rejection, keyword/department search, RBAC on reports, and confirmed the downloaded `.xlsx` parses back to the expected rows) and a real headless-browser run of repository search and a triggered report download.

Phase 9 (Polish & demo readiness) complete:
- Validation audit across every controller found and fixed four real gaps: no email-format check on `/auth/register`; `progress_percent` (milestones) and `rating` (feedback) silently accepted non-numeric values because `NaN` comparisons are always `false`; `candidate_dates` (defense scheduling) accepted unparseable date strings, which would have made the conflict-checker silently treat every candidate as free. Added a small shared `backend/src/utils/validators.js` (`isValidEmail`, `isFiniteNumber`, `isValidDate`) and applied it at each of these four points.
- Error handling: the global error handler now respects an `err.statusCode` if a thrown error sets one; `aiServiceClient.js` uses this to turn ai-service connectivity failures into a clean `503 "AI service is unavailable..."` instead of an opaque `500` — important for a demo/viva where three separate services need to be running.
- `database/seed.js` rewritten into a fuller fictional dataset: 1 coordinator, 3 supervisors (with distinct expertise areas), 5 students, 8 topics (3 left available for the live demo), and 5 projects spread across every stage — including one completed project pre-archived into the repository and enough historical completed milestones that deadline prediction shows a real computed average instead of the cold-start fallback. All still clearly fictional and labeled as such.
- Responsive pass: page containers use `p-4 sm:p-8` instead of a fixed `p-8`, dashboard header rows wrap on narrow screens, and the `NotificationBell` dropdown caps at `90vw` so it can't cause horizontal overflow on small viewports. Verified at a 375px mobile viewport with no horizontal scroll and no console errors.
- Incident during this pass: a PowerShell bulk find-replace (used to apply the `p-4 sm:p-8` change across 12 files) corrupted every em-dash and ellipsis character into mojibake (a UTF-8/Windows-1252 double-encoding issue) — caught immediately by grepping for the corruption pattern afterwards, and fixed precisely via a Node script matching the exact corrupted byte sequences, since Node's `fs` handles UTF-8 correctly where that PowerShell round-trip didn't.
- README reorganized with an explicit environment-variables table and a test-running section.
- Verified via the full Jest suite, a full seed-and-login pass across the new demo accounts, and a real headless-browser check of the responsive layout.

This completes all 9 phases from the build brief (`CLAUDE.md` §3).

## Revision pass (post-Phase-9 checkpoint, `REVISION_BRIEF.md`)

A checkpoint review found that AI/reporting features had been built ahead of several
core CRUD screens from Phases 3 and 5, and that a couple of coordinator pages had no
default view besides a bare ID-lookup form. Fixed, in priority order:

- **Core CRUD backbone**: added a Coordinator User Management screen (`/coordinator/users`
  — list/filter by role, change role, activate/deactivate, backed by `GET/PATCH /users`);
  a Coordinator Project Monitoring screen (`/coordinator/projects` — every project, any
  stage, with a stage filter and drill-down); a shared `ProjectDetailPage` used by both
  `/supervisor/projects/:projectId` and `/coordinator/projects/:projectId` (stage change,
  milestones, feedback, deadline prediction); a real student "My Projects" list on
  `/student` (was previously reachable only via a `localStorage` value set at proposal
  time, so a student who logged in fresh had no way back to their own project — fixed by
  adding student access to `GET /projects`, auto-filtered server-side to the caller's own
  projects); and a document upload + version-history UI on the student progress page
  (`POST/GET /projects/:id/documents`), verified end-to-end with a real generated PDF
  upload that produced a version-incremented row and a plagiarism-check result.
- **Dead-end pages**: Defense Scheduling (`/coordinator/defense`) and Archive
  (`/coordinator/archive`) previously opened to a bare "enter a project ID" form. Both now
  default to real lists — "ready to schedule" / "scheduled & completed defenses" (backed
  by a new `GET /defense`), and "ready to archive" (completed-stage projects not yet in
  the repository) — with the manual ID lookup kept as a secondary path into the same
  underlying logic.
- **Data integrity**: verified topic_id 9, "AI-Based Loan Default Prediction System" (no
  "(fictional demo topic)" marker, unlike the 8 seeded topics), is genuine user-submitted
  data created via the live demo/testing flow rather than an accidental seeding gap — left
  unmodified rather than relabeled, per `CLAUDE.md`'s rule against fabricating or
  mislabeling data.
- **Design consistency**: added a shared `Alert` component (success/error/info) and swept
  every page — including ones from earlier phases (`LoginPage`, `TopicsBrowsePage`,
  `ProposalForm`, `StudentDashboard`, `SupervisorDashboard`, `AllocationsPage`,
  `RepositorySearchPage`, `StatisticsPage`) — to use it instead of ad-hoc red/green
  `<p>` markup, and to use the shared `Button` component instead of raw `<button>`
  elements; audited every list view for a distinct loading vs. empty state; fixed a
  real bug found during the audit where two pages (`ProjectDetailPage`,
  `ProgressPage`-adjacent) checked `!data` before checking `error`, so a failed fetch left
  the user stuck on "Loading…" forever instead of showing the error; added a small logo
  mark to the shared header and Users/Projects links to the coordinator nav; verified no
  horizontal scroll or console errors at a 1280px laptop viewport.
- **Found during the final walkthrough, not in the original brief**: the use-case list in
  `docs/System_Design_Document.md` §4 lists "Register/Login" for both Student and
  Supervisor, and the backend has always had a working `POST /auth/register`, but no
  frontend page ever called it — self-registration was a genuine dead end. Added
  `/register` (student/supervisor only; coordinator accounts remain coordinator-provisioned)
  and linked it from the login page.
- Verified via real headless-browser runs: a full three-role walkthrough that registers a
  fresh student and a fresh supervisor through `/register`, has the student browse topics
  and submit a real proposal, and confirms the coordinator can see both new accounts in
  User Management — all with zero browser console errors — followed by cleanup of every
  test account/project/document created during verification.

## Rebrand, landing page, topic management, and a fuller demo dataset

- **Renamed** to "AI-Integrated Web-Based University of Kigali Final Project Coordination
  System" across the browser tab title, README/docs titles, the design doc, and the
  app's headers (shortened to "UOK Final Project Coordination" in the persistent nav for
  space, full name on the landing page and auth screens).
- **Brand colors**: University of Kigali's Dodger Blue (`#2E7BF1`), Japonica/terracotta
  (`#CE7259`), and Tangerine (`#F28500`) are wired in via a Tailwind v4 `@theme` override
  of the built-in `indigo` scale (anchored so `indigo-600` is the exact brand blue), plus
  new `terracotta-*`/`tangerine-*` scales for accents — every existing `indigo-*` class
  across the whole app picked up the new color with zero per-component edits.
- **New public landing page** at `/` (previously an immediate redirect to `/login`):
  hero, a six-feature grid (duplicate detection, topic suggestions, plagiarism risk,
  supervisor allocation, defense scheduling, repository), and a three-portal breakdown,
  with calls to action into `/login` and `/register`.
- **New coordinator "Manage Topics" page** (`/coordinator/topics`): the backend has always
  allowed a coordinator to create topics (`POST /topics`), but there was no frontend
  screen for it — students could propose topics, but nothing let the coordinator seed
  topics of interest directly. Added the page (reusing the existing endpoint, so it goes
  through the same real-time AI duplicate-check as a student proposal) plus a
  `GET /topics?status=all` backend addition so the coordinator can review every topic
  regardless of status, with a "claimed by a project" indicator.
- **Found while verifying**: two topics sharing the title "AI-Based Loan Default
  Prediction System" with mismatched descriptions (one was actually about crime-hotspot
  prediction) — leftover debris from earlier in-session testing, not real submitted data.
  Deleted the stray project/topic before reseeding.
- **Fuller seed dataset**: `database/seed.js` rewritten data-driven (arrays + a loop
  instead of one-off per-project blocks) to generate 1 coordinator, 6 supervisors
  (up from 3, each with distinct expertise tags spanning 4 departments), 20 students (up
  from 5), 20 topics (up from 8, 5 left available), and 15 projects spread across every
  stage (3 unallocated proposals, 6 in-progress with feedback, 3 scheduled defenses, 3
  completed+archived) — leaving 5 students project-less on purpose so the "no projects
  yet" empty state stays reachable out of the box. Verified row counts and zero orphaned
  foreign keys after truncating and reseeding, and confirmed the backend Jest suite
  (22/22, uses synthetic fixtures rather than seed data) and a full headless-browser sweep
  of every page across all three roles still pass with zero console errors.
