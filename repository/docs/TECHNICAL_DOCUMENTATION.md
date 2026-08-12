# Technical Documentation
## AI-Integrated Web-Based University of Kigali Final Project Coordination System

This document describes the system **as actually built**, verified directly against the
source code. For the original pre-implementation design (kept for reference, some details
evolved during implementation) see `System_Design_Document.md`. For the phase-by-phase
build log and how to run the project, see the root `README.md`.

---

## 1. Overview

A three-portal web system (Student / Supervisor / Coordinator) for coordinating
university final-year projects, with six AI/rule-based features:

| Feature | Technique | Where it lives |
|---|---|---|
| Duplicate topic detection | Sentence embeddings + cosine similarity | `ai-service` (Python) |
| Topic recommendation | Same embeddings, opposite direction | `ai-service` (Python) |
| Plagiarism risk scoring | Same embeddings, applied to document text | `ai-service` (Python) |
| Supervisor allocation scoring | Rule-based weighted formula | `backend` (Node.js) |
| Defense scheduling | Rule-based constraint checker | `backend` (Node.js) |
| Deadline prediction | Rule-based heuristic | `backend` (Node.js) |

The embedding-based features and the rule-based features are deliberately kept in
separate services/modules — this was a hard constraint from the start (`CLAUDE.md` §1)
so the two AI approaches are never blurred together.

---

## 2. Architecture

```
frontend/ (React + Vite + Tailwind, port 5173)
    │  REST + Socket.io, JWT in Authorization header
    ▼
backend/ (Node.js + Express, port 5000)
    │  HTTP (native fetch), JSON
    ▼
ai-service/ (Python + FastAPI, port 8000)

backend/  ──── mysql2 ────▶  MySQL (project_coordination)
backend/  ──── multer  ────▶  local disk (backend/uploads/projects/:id/)
backend/  ──── Socket.io ──▶  frontend (real-time notifications)
backend/  ──── nodemailer ─▶  SMTP (no-ops with a log line if unconfigured)
```

The backend is the only service that talks to MySQL, the file system, or the AI
microservice — the frontend never calls `ai-service` directly.

---

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 (Vite), Tailwind CSS v4, React Router v6 | `frontend/` |
| Backend | Node.js + Express 4 | `backend/` |
| Database | MySQL (InnoDB, utf8mb4) | via XAMPP in dev |
| Real-time | Socket.io v4 | per-user rooms, JWT-authenticated on connect |
| Auth | JWT (`jsonwebtoken`) + bcrypt | 7-day tokens by default |
| AI microservice | Python + FastAPI + `sentence-transformers` (`all-MiniLM-L6-v2`) | |
| Email | nodemailer v9 | |
| File uploads | multer v2 | PDF/DOC/DOCX only, 20MB cap |
| Reports | `exceljs` (Excel), `pdfkit` (PDF) | |
| Text extraction | `pdf-parse` (v1 API), `mammoth` (.docx only) | for plagiarism-check |
| Backend tests | Jest (22 tests) | rule-based AI logic only |
| AI-service tests | pytest (10 tests) | real model, not mocked |

---

## 4. Database Schema

11 tables, InnoDB, utf8mb4. Migrations live in `backend/database/migrations/001`–`011`
and are applied in order by `backend/database/migrate.js` (idempotent — safe to re-run).

### `users`
| Column | Type | Notes |
|---|---|---|
| user_id | INT UNSIGNED PK AUTO_INCREMENT | |
| full_name | VARCHAR(150) NOT NULL | |
| email | VARCHAR(190) UNIQUE NOT NULL | |
| password_hash | VARCHAR(255) NOT NULL | bcrypt, 10 salt rounds |
| role | ENUM(student, supervisor, coordinator) | |
| department | VARCHAR(120) | |
| expertise_tags | VARCHAR(500) | comma-separated; supervisors only, used by the allocation scorer |
| status | ENUM(active, inactive) DEFAULT active | inactive blocks login |
| created_at | DATETIME | |

Indexes: `role`, `status`.

### `topics`
| Column | Type | Notes |
|---|---|---|
| topic_id | PK | |
| proposed_by | FK → users, RESTRICT | |
| title | VARCHAR(255) NOT NULL | |
| description | TEXT | |
| embedding_vector | JSON | cached sentence embedding; backfilled lazily |
| status | ENUM(approved, rejected, duplicate, pending) DEFAULT pending | |
| created_at | DATETIME | |

Indexes: `status`, `proposed_by`; **FULLTEXT** on `(title, description)`.

### `projects`
| Column | Type | Notes |
|---|---|---|
| project_id | PK | |
| student_id | FK → users, RESTRICT | |
| supervisor_id | FK → users, RESTRICT, nullable | NULL until allocated |
| topic_id | FK → topics, RESTRICT | **UNIQUE** — enforces 1:1 topic:project |
| title | VARCHAR(255) | |
| stage | ENUM(proposal, in_progress, defense, completed) DEFAULT proposal | |
| similarity_score | DECIMAL(5,4) | reserved, not currently written |
| plagiarism_score | DECIMAL(5,4) | set by the plagiarism-check on chapter/final upload |
| predicted_deadline | DATE | set by the deadline-prediction endpoint |
| created_at | DATETIME | |

Indexes: `stage`, `student_id`, `supervisor_id`; unique on `topic_id`.

### `milestones`
One project always has exactly 6 rows, created automatically on proposal submission:
Proposal, Chapter 1, Chapter 2, Chapter 3, Final, Defense.

| Column | Type | Notes |
|---|---|---|
| milestone_id | PK | |
| project_id | FK → projects, **CASCADE** | |
| name | VARCHAR(100) | one of the 6 fixed names above |
| status | ENUM(pending, submitted, approved, late) DEFAULT pending | |
| progress_percent | TINYINT UNSIGNED, CHECK 0–100 | |
| due_date | DATE | optional |
| completed_at | DATETIME | auto-stamped when status is set to `approved` |

### `documents`
| Column | Type | Notes |
|---|---|---|
| document_id | PK | |
| project_id | FK → projects, CASCADE | |
| file_path | VARCHAR(500) | relative to `backend/` |
| version | INT UNSIGNED DEFAULT 1 | auto-incremented per `(project_id, doc_type)` |
| doc_type | ENUM(proposal, chapter, final) | |
| uploaded_at | DATETIME | |

### `feedback`
| Column | Type | Notes |
|---|---|---|
| feedback_id | PK | |
| project_id | FK → projects, CASCADE | |
| given_by | FK → users, RESTRICT | supervisor or coordinator |
| comment | TEXT | |
| rating | TINYINT UNSIGNED, CHECK 1–5 | |
| created_at | DATETIME | |

### `defense_schedule`
| Column | Type | Notes |
|---|---|---|
| defense_id | PK | |
| project_id | FK → projects, CASCADE | **UNIQUE** — one defense per project |
| panel_members | JSON NOT NULL | array of `user_id`s |
| scheduled_date | DATETIME | |
| room | VARCHAR(100) | |
| status | ENUM(scheduled, completed) DEFAULT scheduled | |
| result | VARCHAR(255) | free text, e.g. "Pass with minor corrections" |

Indexed on `status`, `scheduled_date`, `room` (the room+date pair is what the conflict
checker queries).

### `supervisor_allocations`
| Column | Type | Notes |
|---|---|---|
| allocation_id | PK | |
| student_id | FK → users, RESTRICT | |
| supervisor_id | FK → users, RESTRICT | |
| match_score | DECIMAL(5,4) | the AI-computed score at the time of allocation |
| approved_by | FK → users, RESTRICT | the coordinator who confirmed it |
| allocated_at | DATETIME | |

### `notifications`
| Column | Type | Notes |
|---|---|---|
| notification_id | PK | |
| user_id | FK → users, CASCADE | |
| message | VARCHAR(500) | |
| is_read | BOOLEAN DEFAULT FALSE | |
| created_at | DATETIME | |

### `audit_log`
| Column | Type | Notes |
|---|---|---|
| log_id | PK | |
| user_id | FK → users, RESTRICT | the actor |
| action | VARCHAR(150) | `update_role`, `update_status`, `update_stage`, `allocate_supervisor`, `record_defense_result` |
| entity_affected | VARCHAR(150) | e.g. `projects:5` |
| timestamp | DATETIME | |

### `repository`
| Column | Type | Notes |
|---|---|---|
| repository_id | PK | |
| project_id | FK → projects, CASCADE | **UNIQUE** — one archive entry per project |
| title | VARCHAR(255) | copied from the project at archive time |
| keywords | VARCHAR(500) | supplied by the coordinator, or defaults to the topic description |
| department | VARCHAR(120) | copied from the student |
| year | YEAR NOT NULL | the year of archiving |
| archived_file_path | VARCHAR(500) | the final document's path at archive time |

Indexed on `department`, `year`; **FULLTEXT** on `(title, keywords)`.

---

## 5. Authentication & Authorization

- **Register** (`POST /auth/register`, public): only `student` or `supervisor` roles can
  self-register — a coordinator account can only be created by promoting an existing user
  via `PATCH /users/:id/role`. Validates email format, password ≥ 8 chars.
- **Login** (`POST /auth/login`, public): bcrypt-compares the password; rejects with 403
  if the account's `status` is `inactive`.
- **JWT payload**: `{ user_id, role }`, signed with `JWT_SECRET`, default expiry 7 days.
- **`authenticate` middleware** (`backend/src/middleware/auth.js`): reads the
  `Authorization: Bearer <token>` header, verifies it, attaches `req.user`.
- **`requireRole(...roles)` middleware** (`backend/src/middleware/rbac.js`): 403s if
  `req.user.role` isn't in the allowed list.
- **Audit trail**: role changes, status changes, stage changes, supervisor allocations,
  and defense results are all written to `audit_log` (this was an explicit
  non-functional requirement in the design doc, §8).

---

## 6. API Reference

Base URL: `http://localhost:5000/api/v1`. All routes except `/auth/*` and `/health`
require a Bearer token. "Access" is the role(s) allowed, or a per-row ownership rule
described inline.

### 6.1 Auth (`/auth`) — public
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/register` | `full_name, email, password, role, department?, expertise_tags?` | `role` must be `student` or `supervisor` |
| POST | `/login` | `email, password` | returns `{ token, user }` |

### 6.2 Users (`/users`) — authenticated
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/me` | any | current user's profile |
| GET | `/` | coordinator | `?role=` filter |
| PATCH | `/:id/role` | coordinator | audit-logged |
| PATCH | `/:id/status` | coordinator | audit-logged |

### 6.3 Topics (`/topics`) — authenticated
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | any | default: approved + unclaimed only; `?status=<status>` filters to one status; `?status=all` returns every topic regardless of status, with a `claimed` flag — powers the coordinator's Manage Topics page |
| POST | `/` | student, coordinator | runs the real-time duplicate-check |
| POST | `/suggest` | student | body `{ idea }`, real embedding-based ranking |
| POST | `/:id/check-duplicate` | coordinator | manually re-runs the duplicate-check |

### 6.4 Proposals (`/proposals`) — authenticated
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/` | student | body `{ topic_id, title? }` — creates the `PROJECTS` row + 6 default milestones |
| GET | `/:id` | owner student / assigned supervisor / coordinator | includes attached documents |

### 6.5 Projects (`/projects`) — authenticated
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | student (own), supervisor (own), coordinator (all) | `?stage=` filter; each role is auto-filtered server-side to what it may see |
| GET | `/:id` | owner / assigned / coordinator | |
| PATCH | `/:id/stage` | assigned supervisor, coordinator | audit-logged, notifies the student |
| POST | `/:id/predict-deadline` | assigned supervisor, coordinator | rule-based, updates `predicted_deadline` |
| POST | `/:id/documents` | owner student | multipart, `doc_type` in body; triggers plagiarism-check for chapter/final |
| GET | `/:id/documents` | owner / assigned / coordinator | |
| GET | `/:id/milestones` | owner / assigned / coordinator | |
| PATCH | `/:id/milestones/:milestoneId` | assigned supervisor, coordinator | |
| POST | `/:id/feedback` | assigned supervisor, coordinator | notifies the student |
| GET | `/:id/feedback` | owner / assigned / coordinator | |

### 6.6 Allocations (`/allocations`) — coordinator only
| Method | Path | Notes |
|---|---|---|
| GET | `/recommendations?projectId=` | ranked supervisor list with `match_score`, `matched_tags` |
| POST | `/` | body `{ student_id, supervisor_id, project_id, match_score }`; audit-logged |

### 6.7 Defense (`/defense`) — authenticated
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/` | coordinator | every scheduled/completed defense, joined with project + student, newest first — feeds the Defense Scheduling page's default list view |
| POST | `/schedule` | coordinator | body `{ project_id, panel_members[], room, candidate_dates[] }`; project must be in `defense` stage |
| GET | `/:projectId` | owner / assigned / coordinator | 404 if none scheduled yet |
| PATCH | `/:id/result` | coordinator | sets `status='completed'`, audit-logged |

### 6.8 Notifications (`/notifications`) — authenticated
| Method | Path | Notes |
|---|---|---|
| GET | `/` | own notifications only |
| PATCH | `/:id/read` | marks own notification read |

### 6.9 Repository (`/repository`) — authenticated
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/archive/:projectId` | coordinator | requires `completed` stage + an uploaded `final` doc |
| GET | `/search` | any | `?q=` (FULLTEXT), `?department=`, `?year=`; no params → returns everything |

### 6.10 Reports (`/reports`) — coordinator only
| Method | Path | Notes |
|---|---|---|
| GET | `/projects?format=excel\|pdf` | full project list, file download |
| GET | `/defense?format=excel\|pdf` | full defense list, file download |
| GET | `/stats` | JSON aggregates for the Statistics dashboard (see §9) |

### 6.11 AI microservice (internal — only `backend` calls these, never the browser)
Base URL: `http://localhost:8000` (`AI_SERVICE_URL`).

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | — | `{ status, service }` |
| POST | `/embed` | `{ texts: string[] }` | `{ embeddings: number[][] }` |
| POST | `/duplicate-check` | `{ text, existing: [{id, embedding}] }` | `{ embedding, verdict, matches: [{id, similarity}] }` |
| POST | `/suggest-topics` | `{ text, candidates: [{id, embedding}] }`, `?limit=5` | `{ suggestions: [{id, similarity}] }` |
| POST | `/plagiarism-check` | `{ text, corpus_texts: string[] }` | `{ risk_score, risk_band, matches }` |

---

## 7. AI & Rule-Based Modules

### 7.1 Duplicate Topic Detection (`ai-service/main.py`)
1. On `POST /topics`, the backend fetches every existing topic, backfilling (and
   caching to `topics.embedding_vector`) any that don't have an embedding yet.
2. Calls `ai-service` `/duplicate-check` with the new topic's text and all existing
   embeddings.
3. `ai-service` embeds the new text once (`all-MiniLM-L6-v2`, 384-dim), computes
   **cosine similarity** against every existing vector.
4. Verdict: similarity ≥ `DUPLICATE_THRESHOLD` (default **0.85**) → `duplicate`;
   ≥ `SIMILAR_THRESHOLD` (default **0.70**) → `similar`; else → `none`.
5. Backend maps verdict → topic status: `duplicate`→`duplicate` (blocked),
   `similar`→`pending` (held for coordinator review via `POST /topics/:id/check-duplicate`),
   `none`→`approved` (immediately usable).

**Runs once**, at topic-creation time, plus on-demand via the coordinator's manual
re-check endpoint. Not scheduled.

**Evaluated against** a hand-built set of known-similar and known-different topic pairs
in `ai-service/tests/test_duplicate_check.py` — this is the evidence behind the 0.85/0.70
threshold choice.

### 7.1b Topic Recommendation
Same technique, opposite use: `POST /topics/suggest` embeds the student's rough-idea
text, compares it against every approved-and-unclaimed topic's embedding, returns the
top 5 by similarity (no minimum threshold — even a weak match is shown, ranked
honestly). `limit` is configurable via query param.

### 7.2 Plagiarism Risk Identification
1. Triggered only on `chapter` or `final` document uploads (never `proposal`).
2. `backend/src/utils/textExtraction.js` extracts plain text (`pdf-parse` for PDF,
   `mammoth` for `.docx` — old binary `.doc` isn't supported and yields empty text).
3. Corpus = up to the 20 most recently uploaded chapter/final documents belonging to
   *other* projects.
4. `ai-service` embeds the new document + every corpus document, takes the **maximum**
   cosine similarity as the risk score.
5. Band: ≥ `PLAGIARISM_HIGH_THRESHOLD` (0.75) → `high`; ≥ `PLAGIARISM_MEDIUM_THRESHOLD`
   (0.50) → `medium`; else → `low`.
6. `projects.plagiarism_score` is updated with the numeric score.

**Best-effort by design**: a failed extraction or an unreachable AI service is caught,
logged, and returns `null` — the document upload itself always still succeeds, since
this is a secondary signal, not a gate.

### 7.3 Supervisor Allocation Scoring (`backend/src/ai/supervisorAllocation.js`) — rule-based, no ML
```
score = (overlap between supervisor's expertise_tags and the topic's title+description)
        × 1 / (1 + supervisor's current active project count)
```
`expertise_tags` is a comma-separated list; overlap = fraction of the supervisor's tags
that appear (substring match) in the topic text. "Active" excludes `completed` projects.
The coordinator sees a ranked list (`GET /allocations/recommendations`) and makes the
final call — AI recommends, human decides. 7 Jest unit tests cover tag parsing,
zero-overlap, overlap reward, and workload-penalty ranking order.

### 7.4 Defense Scheduling (`backend/src/ai/defenseScheduling.js`) — rule-based, no ML
Given a list of candidate `(date, room)` slots (tried **in the order given**) and every
existing defense, returns the first slot where:
- no other defense uses the **same room** in an overlapping 60-minute window, and
- no **panel member** is already booked elsewhere in an overlapping window.

Returns `null` if every candidate conflicts (409 to the caller). Not a search/optimizer
— deliberately the simplest constraint check that satisfies the requirement. 7 Jest unit
tests cover room conflicts, panel conflicts, and the all-conflicting case.

### 7.5 Deadline Prediction (`backend/src/ai/deadlinePrediction.js`) — rule-based, no ML
- **Risk band**: counts milestones that are `late`, or `pending`/`submitted` with a
  `due_date` in the past → 0 flags = `low`, 1 = `medium`, ≥2 = `high`.
- **Predicted completion date**: `today + (pending milestone count × average days per
  stage)`, where the average is computed system-wide from every milestone that has ever
  been completed (`completed_at − project.created_at`, averaged). Falls back to a fixed
  **21-day** default when no historical data exists yet (cold start).
- Explicitly a first-version heuristic, not a trained model — there's no historical
  labeled dataset yet to train one on (see the design doc's own "future work" framing,
  §7.4). 8 Jest unit tests.

---

## 8. Real-Time Notifications

- `backend/src/sockets/index.js`: on Socket.io connection, the client emits `join` with
  its JWT; the server verifies it and puts the socket in room `user:<user_id>`.
- `backend/src/utils/notify.js` (`notifyUserWithEmail`): inserts a `notifications` row,
  emits a `notification` event to that user's room, and emails them via nodemailer.
- Wired into exactly three events: **feedback posted**, **project stage changed**,
  **defense scheduled**.
- Email delivery degrades gracefully: if `MAIL_HOST`/`MAIL_USER` aren't set, it logs
  `[mailer] SMTP not configured - skipped email...` and continues — this is the normal
  state in local dev.

---

## 9. Frontend Application

`/` is a public landing page (hero, feature highlights, the three-portal breakdown) with
calls to action into `/login` and `/register` (self-registration for student/supervisor —
coordinator accounts are provisioned by an existing coordinator via User Management, not
self-registered). These three sit outside the authenticated area. Everything else is
nested under a shared `Layout` (sticky top nav with a small brand mark, role-aware nav
links, `NotificationBell`, user/role display, logout) inside a `ProtectedRoute` per role
group.

| Role | Routes |
|---|---|
| Student | `/student` (dashboard — real "My Projects" list from `GET /projects`), `/student/topics` (browse/suggest/propose), `/student/proposal` (submit + upload), `/student/progress/:projectId` (milestones, feedback, predictions, document upload + version history) |
| Supervisor | `/supervisor` (my students), `/supervisor/projects/:projectId` → shared `ProjectDetailPage` (stage, milestones, feedback, deadline prediction) |
| Coordinator | `/coordinator` (dashboard), `/coordinator/users` (User Management — list/filter by role, change role, activate/deactivate), `/coordinator/projects` (Project Monitoring — every project, stage filter) + `/coordinator/projects/:projectId` → shared `ProjectDetailPage`, `/coordinator/topics` (Manage Topics — add topics of interest directly, and review every topic's AI duplicate-check status, including ones students proposed), `/coordinator/allocations`, `/coordinator/defense` (defaults to "ready to schedule" + "scheduled & completed" lists, not a bare ID lookup), `/coordinator/archive` (defaults to a "ready to archive" list of completed-but-unarchived projects), `/coordinator/reports`, `/coordinator/statistics` |
| Shared (all 3 roles) | `/repository` |

`ProjectDetailPage` (`src/pages/shared/`) is used by both the supervisor and coordinator
routes — the backend RBAC already allows a coordinator through every action regardless of
who the assigned supervisor is, so one screen serves both, with a role-aware "← Back"
link (`/supervisor` vs `/coordinator/projects`).

**Design system** (`src/components/ui/`): `Button` (primary/secondary/danger/link),
`Alert` (success/error/info — the standard confirmation/error mechanism used after every
state-changing action across the app), `Badge` (status-tone pills — stage, milestone,
topic, defense, risk each have a fixed tone map), `Card`, `BarChart` (hand-rolled
horizontal bar chart, no charting library), plus shared `INPUT_CLASS`/`LABEL_CLASS`
constants for consistent form styling. Every list view has an explicit loading state
(`null` initial state + "Loading…") and an explicit empty state distinct from "still
loading," and every page that can fail to load its primary data checks its error state
before its loading state, so a failed fetch surfaces a message instead of an infinite
"Loading…".

**Brand palette** (`src/index.css`): University of Kigali brand colors — Dodger Blue
`#2E7BF1`, Japonica (terracotta) `#CE7259`, and Tangerine `#F28500` — are wired in as a
Tailwind v4 `@theme` override of the built-in `indigo` scale (anchored so `indigo-600`
equals the exact brand blue) plus two new `terracotta-*`/`tangerine-*` scales for accents.
Overriding the palette this way means every existing `indigo-*` utility class across the
app (buttons, links, focus rings, active nav state) picked up the brand color with no
per-component changes.

---

## 10. Reports & Statistics

- **Downloadable reports** (`/coordinator/reports`): Project Status and Defense
  Schedule & Results, each as Excel (`exceljs`) or PDF (`pdfkit`). The frontend fetches
  these as a blob and triggers a browser download (a plain link can't carry the JWT
  auth header).
- **Statistics dashboard** (`/coordinator/statistics`, backed by `GET /reports/stats`):
  five bar charts — Projects by Stage, Topics by Status, Defense Status, Plagiarism Risk
  bands, Supervisor Workload — computed live from the database, not cached. Color choices
  reuse the same semantic tones as the `Badge` component (green=good, amber=warning,
  red=critical) so a color means the same thing on a chart as it does on a status pill
  elsewhere in the app.

---

## 11. Research Repository

Archive-on-completion: a coordinator can only archive a project that is `completed` and
has at least one `final` document uploaded (`POST /repository/archive/:projectId`).
Search (`GET /repository/search`) is a plain MySQL `FULLTEXT` match on title+keywords
plus exact department/year filters — deliberately no embeddings here, per the design
doc's explicit "keep this feature cheap to build" framing (§7.6). The frontend's
`/repository` page loads everything by default (empty search = full table) and groups
results by department (A–Z), with titles sorted A–Z within each group.

---

## 12. Testing

| Suite | Location | Count | What it covers |
|---|---|---|---|
| Jest | `backend/src/ai/*.test.js` | 22 | `supervisorAllocation`, `defenseScheduling`, `deadlinePrediction` — pure rule-based logic only |
| pytest | `ai-service/tests/*.py` | 10 | Real model inference: hand-built known-similar/known-different topic pairs, suggestion ranking, plagiarism risk bands |

Run: `cd backend && npm test` / `cd ai-service && pytest tests/`. Neither suite mocks the
thing it's testing — the AI-service tests genuinely call the loaded sentence-transformer
model.

There is no frontend automated test suite; frontend functionality was verified manually
via real headless-browser runs against the live backend throughout development (documented
per-phase in the root `README.md`).

---

## 13. Setup & Running Locally

See the root `README.md` for full step-by-step instructions (env vars, migration, seeding,
starting all three services). Summary:

```
# 1. Database
cd backend && cp .env.example .env && npm install
npm run db:migrate && npm run db:seed

# 2. Backend
npm run dev                     # http://localhost:5000

# 3. AI microservice
cd ai-service && python -m venv venv && ./venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 4. Frontend
cd frontend && cp .env.example .env && npm install && npm run dev   # http://localhost:5173
```

---

## 14. Demo Accounts

All seeded accounts share the password **`Passw0rd!`**. `database/seed.js` generates 1
coordinator, 6 supervisors, and 20 students (full lists printed to the console when the
seed runs); a representative sample:

| Role | Email | Notes |
|---|---|---|
| Coordinator | `coordinator.demo@uok.example` | Grace Ingabire |
| Supervisor | `supervisor.demo@uok.example` | Dr. Jean Mugisha — ML/databases/web dev |
| Supervisor | `supervisor.mukamana@uok.example` | Dr. Aline Mukamana — cybersecurity/networking/cloud |
| Supervisor | `supervisor.nshimiyimana@uok.example` | Dr. Eric Nshimiyimana — mobile/UI-UX/e-commerce |
| Supervisor | `supervisor.ndayisenga@uok.example` | Dr. Vincent Ndayisenga — software architecture/DevOps/testing |
| Supervisor | `supervisor.uwimana@uok.example` | Dr. Immaculee Uwimana — data science/big data/BI |
| Supervisor | `supervisor.rugamba@uok.example` | Dr. Samuel Rugamba — AI/computer vision/NLP |
| Student | `student.demo@uok.example` | Alice Uwase |
| Student | `student.habimana@uok.example` … 18 more | see `database/seed.js` `STUDENTS` array for the full list |

The seed creates 20 topics (5 left available to browse, spanning all four departments)
and 15 projects distributed across every stage — 3 unallocated proposals, 6 in-progress
(each with supervisor feedback), 3 with an upcoming scheduled defense, and 3 completed
projects already archived into the repository, leaving 5 of the 20 students with no
project yet (so the "no projects yet, browse topics" empty state is also reachable
out of the box). All seeded names, topics, and data are explicitly fictional. New
student/supervisor accounts can also be created at any time via `/register` (coordinator
accounts are provisioned only by an existing coordinator, through User Management), and a
coordinator can add topics of interest directly via `/coordinator/topics` in addition to
students proposing their own.

To reseed from a non-empty database (the script skips seeding if `users` is non-empty),
truncate the relevant tables first — see `database/seed.js`'s guard clause for the exact
table list, or drop and recreate the schema from the `database/migrations/` files.

---

## 15. Known Limitations & Future Work

- **Deadline prediction** is a rule-based heuristic, not a trained model — there's no
  historical dataset yet to train one on. Flagged in the design doc as a credible future
  upgrade once a semester or two of real usage data exists.
- **Plagiarism corpus** is capped at the 20 most recent other chapter/final documents —
  fine at this scale, would need a proper vector index (or a real vector DB) to stay
  performant at university-wide scale.
- **No frontend automated test suite** — coverage today is backend unit tests (rule-based
  logic) + pytest (real model) + extensive manual browser verification per phase.
- **Repository access is shared** across all three roles by design (not admin-only) —
  can be restricted if a future requirement calls for it.
- **No periodic re-checking**: both duplicate-check and plagiarism-check run once, at
  the triggering action (topic creation / chapter-or-final upload). Older
  topics/documents are never automatically re-scanned against newer submissions unless
  a coordinator manually re-runs the duplicate-check.
- **Full user management** (coordinator CRUD beyond role/status) and richer project
  monitoring dashboards are explicitly out of scope for this build (see the
  Coordinator Dashboard's own placeholder note).
