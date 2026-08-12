# System Audit — AI-Integrated Web-Based University of Kigali Final Project Coordination System

**Purpose:** an accurate, evidence-based record of what is actually implemented in this repository, for use in dissertation Chapters 4 and 5. Every claim below was verified directly against the live codebase and a running instance of all three services on **2026-07-21** — not copied from `CLAUDE.md` or `System_Design_Document.md`. Where the two disagree, this document says so explicitly and states which one is authoritative for a viva answer (the code always is).

Runtime versions of the auditing environment: Node.js v24.17.0, npm 11.13.0, Python 3.12.10.

---

## 1. Final Tech Stack

| Layer | Design doc said (§2) | Actually used | Verified installed version | Deviation? |
|---|---|---|---|---|
| Frontend | "React (SPA), Tailwind/CSS" | React 19 (Vite), Tailwind CSS v4 | react 19.2.7, react-dom 19.2.7, tailwindcss 4.3.2, vite 8.1.4 | Matches in kind; doc didn't name a build tool — **Vite** was the actual choice (not CRA/Next), and **Tailwind v4** specifically, which uses CSS-based `@theme` config, not the v3 `tailwind.config.js` file the ecosystem is more commonly documented for |
| Routing | not specified | `react-router-dom` v7 | 7.18.1 | Addition (implicit necessity, undocumented in design) |
| HTTP client | not specified | `axios` | 1.18.1 | Addition |
| Real-time (client) | Socket.io | `socket.io-client` | 4.8.3 | Matches |
| Linting | not specified | `oxlint` (not ESLint) | 1.71.0 | Addition/substitution — a Rust-based linter, not the more commonly expected ESLint |
| Backend / API | "Node.js + Express.js" | Node.js + Express | express 4.22.2 (package.json floor `^4.19.2`) | Matches |
| Database driver | not specified | `mysql2` (promise API) | 3.22.6 (floor `^3.10.1`) | Matches MySQL choice; driver choice is an implementation detail not in the doc |
| Auth | "JWT ... bcrypt" | `jsonwebtoken` + `bcrypt` | jsonwebtoken 9.0.3, bcrypt 5.1.1 | Matches |
| Real-time (server) | Socket.io | `socket.io` | 4.8.3 | Matches |
| File uploads | "multer" | `multer` | 2.2.0 | Matches |
| Email | not named directly (design doc §6.7 mentions "nodemailer" in prose) | `nodemailer` | 9.0.3 | Matches |
| Reporting | "e.g. exceljs, pdfkit" | `exceljs` + `pdfkit` | 4.4.0, 0.19.1 | Matches exactly |
| Document text extraction | not specified anywhere in the design doc | `pdf-parse` (PDF) + `mammoth` (.docx) | pdf-parse 1.1.4, mammoth 1.12.0 | **Addition** — required to make plagiarism-check and duplicate-detection work on real uploaded files; the design doc's §7.3 only says "extract text," it never names a library |
| CORS | not specified | `cors` | 2.8.6 | Addition (necessary for a separate-origin SPA) |
| AI microservice framework | "Python microservice" | FastAPI + Uvicorn | fastapi (see below), uvicorn (see below) | Matches in kind |
| Embedding model | "sentence-transformers" (no model named) | `sentence-transformers`, model `all-MiniLM-L6-v2` | see §4 | Matches library; model choice is an implementation decision the design doc left open |

### AI-service dependency drift — flagged explicitly

`ai-service/requirements.txt` pins **exact** versions with `==`. The versions **actually installed** in `ai-service/venv` (verified via `pip list`) do not match those pins, in some cases by a major version:

| Package | `requirements.txt` pin | Actually installed | Gap |
|---|---|---|---|
| fastapi | `==0.111.0` | `0.139.0` | 28 minor versions ahead |
| uvicorn | `==0.30.1` | `0.51.0` | 21 minor versions ahead |
| sentence-transformers | `==3.0.1` | `5.6.0` | **2 major versions ahead** |
| numpy | `==1.26.4` | `2.5.1` | **1 major version ahead** (NumPy 2.x has known breaking API changes vs 1.x) |
| pydantic | `==2.7.4` | `2.13.4` | 6 minor versions ahead |
| pytest | `==8.2.2` | `9.1.1` | 1 major version ahead |
| httpx | `==0.27.0` | `0.28.1` | 1 minor version ahead |

**This is a real reproducibility gap, not a rounding error.** If an examiner or another developer runs `pip install -r requirements.txt` on a fresh machine, they will get materially older packages than what has actually been developed and tested against in this environment (this venv's `torch` — a transitive dependency of `sentence-transformers` — is 2.13.0, itself far ahead of what `sentence-transformers==3.0.1` would have pulled in originally). **Recommendation for Chapter 5:** either regenerate `requirements.txt` from the live venv (`pip freeze`) before submission, or explicitly note this as a known packaging inconsistency. The exact embedding model name (`all-MiniLM-L6-v2`, hardcoded in `ai-service/embeddings.py:7`) is unaffected by this drift — that specific claim is safe to make in the dissertation regardless.

Backend and frontend `package.json` files use caret ranges (`^`), so their installed-vs-declared drift is normal, minor-version-only, and not a concern (e.g. express `^4.19.2` → installed `4.22.2`).

---

## 2. Database Schema (Actual)

Real source: `backend/database/migrations/001_create_users.sql` through `011_create_repository.sql` (11 files, applied in order by `backend/database/migrate.js`). Full `CREATE TABLE` statements below, verbatim.

### `users` (001)
```sql
CREATE TABLE IF NOT EXISTS users (
  user_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(190) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('student', 'supervisor', 'coordinator') NOT NULL,
  department      VARCHAR(120),
  expertise_tags  VARCHAR(500),
  status          ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
vs ERD (§5): matches. `status` (active/inactive) is **not mentioned in the ERD's prose description** at all but exists in the schema and is actively used (`users.controller.js` `updateStatus`) — an addition beyond the documented entity description, though it's an obviously necessary field for the "activate/deactivate account" use case already listed in §4.3/§6.1.

### `topics` (002)
```sql
CREATE TABLE IF NOT EXISTS topics (
  topic_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proposed_by       INT UNSIGNED NOT NULL,
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  embedding_vector  JSON,
  status            ENUM('approved', 'rejected', 'duplicate', 'pending') NOT NULL DEFAULT 'pending',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_topics_proposed_by FOREIGN KEY (proposed_by) REFERENCES users (user_id) ON DELETE RESTRICT,
  INDEX idx_topics_status (status),
  INDEX idx_topics_proposed_by (proposed_by),
  FULLTEXT INDEX ft_topics_title_description (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
vs ERD: matches exactly, including the `embedding_vector` JSON column called out by name in §5. `proposed_by` FK and the `rejected` status value are additions not spelled out in the ERD prose but are consistent with it.

### `projects` (003)
```sql
CREATE TABLE IF NOT EXISTS projects (
  project_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id         INT UNSIGNED NOT NULL,
  supervisor_id      INT UNSIGNED,
  topic_id           INT UNSIGNED NOT NULL,
  title              VARCHAR(255) NOT NULL,
  stage              ENUM('proposal', 'in_progress', 'defense', 'completed') NOT NULL DEFAULT 'proposal',
  similarity_score   DECIMAL(5,4),
  plagiarism_score   DECIMAL(5,4),
  predicted_deadline DATE,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_student    FOREIGN KEY (student_id)    REFERENCES users (user_id)  ON DELETE RESTRICT,
  CONSTRAINT fk_projects_supervisor FOREIGN KEY (supervisor_id) REFERENCES users (user_id)  ON DELETE RESTRICT,
  CONSTRAINT fk_projects_topic      FOREIGN KEY (topic_id)      REFERENCES topics (topic_id) ON DELETE RESTRICT,
  INDEX idx_projects_stage (stage),
  INDEX idx_projects_student (student_id),
  INDEX idx_projects_supervisor (supervisor_id),
  UNIQUE INDEX uq_projects_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches the ERD's description ("tracks `stage`, `similarity_score`, `plagiarism_score`, and `predicted_deadline`") column-for-column.

**Important deviation, precisely located:** `similarity_score` exists in the schema exactly as the ERD describes, but grepping the entire `backend/src` tree for `similarity_score` (`rg similarity_score backend/src`) shows it appears in exactly **one** place — the `SELECT` list in `projects.controller.js:49` (`getProjectById`). **No `INSERT` or `UPDATE` statement anywhere in the codebase ever writes to this column.** It is always `NULL` in practice. This is a genuine "designed but not wired up" gap — worth stating plainly in Chapter 5 rather than letting a Chapter 4 screenshot imply it's populated. (Likely explanation: the topic-level duplicate-check score is what's actually surfaced to users, via `topics.status`/`duplicate_check.matches` in the API response from `topics.controller.js:createTopic` — the *project*-level `similarity_score` column was probably superseded by that but never removed from the schema.)

`plagiarism_score` and `predicted_deadline`, by contrast, **are** genuinely written: `documents.controller.js:461` (`UPDATE projects SET plagiarism_score = ?`) and `projects.controller.js:661` (`UPDATE projects SET predicted_deadline = ?`) respectively.

### `milestones` (004)
```sql
CREATE TABLE IF NOT EXISTS milestones (
  milestone_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id       INT UNSIGNED NOT NULL,
  name             VARCHAR(100) NOT NULL,
  status           ENUM('pending', 'submitted', 'approved', 'late') NOT NULL DEFAULT 'pending',
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  due_date         DATE,
  completed_at     DATETIME,
  CONSTRAINT fk_milestones_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
  CONSTRAINT chk_milestones_progress CHECK (progress_percent BETWEEN 0 AND 100),
  INDEX idx_milestones_project (project_id),
  INDEX idx_milestones_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches ERD exactly. Six rows per project are created automatically (`Proposal, Chapter 1, Chapter 2, Chapter 3, Final, Defense` — `milestones.controller.js:306`) whenever a proposal is submitted (`proposals.controller.js:701`).

### `documents` (005)
```sql
CREATE TABLE IF NOT EXISTS documents (
  document_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id   INT UNSIGNED NOT NULL,
  file_path    VARCHAR(500) NOT NULL,
  version      INT UNSIGNED NOT NULL DEFAULT 1,
  doc_type     ENUM('proposal', 'chapter', 'final') NOT NULL,
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documents_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
  INDEX idx_documents_project (project_id),
  INDEX idx_documents_type (doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches ERD ("versioned file uploads tied to a project"). Versioning is computed in application code, not a DB trigger (`documents.controller.js:490-494`: `SELECT COALESCE(MAX(version),0)+1`).

### `feedback` (006)
```sql
CREATE TABLE IF NOT EXISTS feedback (
  feedback_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id   INT UNSIGNED NOT NULL,
  given_by     INT UNSIGNED NOT NULL,
  comment      TEXT,
  rating       TINYINT UNSIGNED,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feedback_project  FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_given_by FOREIGN KEY (given_by)   REFERENCES users (user_id)        ON DELETE RESTRICT,
  CONSTRAINT chk_feedback_rating  CHECK (rating BETWEEN 1 AND 5),
  INDEX idx_feedback_project (project_id),
  INDEX idx_feedback_given_by (given_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches ERD exactly.

### `defense_schedule` (007)
```sql
CREATE TABLE IF NOT EXISTS defense_schedule (
  defense_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id      INT UNSIGNED NOT NULL,
  panel_members   JSON NOT NULL,
  scheduled_date  DATETIME NOT NULL,
  room            VARCHAR(100) NOT NULL,
  status          ENUM('scheduled', 'completed') NOT NULL DEFAULT 'scheduled',
  result          VARCHAR(255),
  CONSTRAINT fk_defense_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
  UNIQUE INDEX uq_defense_project (project_id),
  INDEX idx_defense_status (status),
  INDEX idx_defense_scheduled_date (scheduled_date),
  INDEX idx_defense_room (room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches ERD ("panel members (JSON array of user IDs), date, room, result"). Note: `UNIQUE INDEX uq_defense_project` means the schema enforces **at most one defense per project** — the ERD's relationship summary states this explicitly ("One project has one defense schedule record"), so this is a faithful, deliberate constraint, not an oversight.

### `supervisor_allocations` (008)
```sql
CREATE TABLE IF NOT EXISTS supervisor_allocations (
  allocation_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id     INT UNSIGNED NOT NULL,
  supervisor_id  INT UNSIGNED NOT NULL,
  match_score    DECIMAL(5,4),
  approved_by    INT UNSIGNED NOT NULL,
  allocated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_allocations_student     FOREIGN KEY (student_id)    REFERENCES users (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_allocations_supervisor  FOREIGN KEY (supervisor_id) REFERENCES users (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_allocations_approved_by FOREIGN KEY (approved_by)   REFERENCES users (user_id) ON DELETE RESTRICT,
  INDEX idx_allocations_student (student_id),
  INDEX idx_allocations_supervisor (supervisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches ERD exactly, including `match_score` and `approved_by` named specifically in §5.

### `notifications` (009)
```sql
CREATE TABLE IF NOT EXISTS notifications (
  notification_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED NOT NULL,
  message          VARCHAR(500) NOT NULL,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches ERD.

### `audit_log` (010)
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  log_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  action          VARCHAR(150) NOT NULL,
  entity_affected VARCHAR(150),
  timestamp       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
  INDEX idx_audit_log_user (user_id),
  INDEX idx_audit_log_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches ERD.

### `repository` (011)
```sql
CREATE TABLE IF NOT EXISTS repository (
  repository_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id         INT UNSIGNED NOT NULL,
  title              VARCHAR(255) NOT NULL,
  keywords           VARCHAR(500),
  department         VARCHAR(120),
  year               YEAR NOT NULL,
  archived_file_path VARCHAR(500) NOT NULL,
  CONSTRAINT fk_repository_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
  UNIQUE INDEX uq_repository_project (project_id),
  INDEX idx_repository_department (department),
  INDEX idx_repository_year (year),
  FULLTEXT INDEX ft_repository_title_keywords (title, keywords)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
Matches ERD. `UNIQUE INDEX uq_repository_project` enforces "archive a project only once" at the DB level, in addition to the application-level check in `repository.controller.js:973` (`ER_DUP_ENTRY` → 409).

### Summary: 11 tables in the ERD, 11 tables implemented, 0 added, 0 removed, 0 renamed

The table list, column set, and relationships match `System_Design_Document.md` §5 almost exactly. The only substantive finding is the dead `similarity_score` column noted above — everything else is a faithful implementation, sometimes with small additive hardening (extra indexes, `ON DELETE` rules, and CHECK constraints the ERD prose doesn't spell out but doesn't contradict either).

---

## 3. API Endpoints (Actual)

Base path for all routes below: `/api/v1` (mounted in `backend/src/app.js:26-34`).

### Auth (`auth.routes.js`, mounted at `/auth`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | `auth.controller.js:register` | Public | **Deviation from design doc**: doc's §6.1 lists this as unrestricted "Register a new account." Actual implementation restricts self-registration to `role ∈ {student, supervisor}` only (`SELF_REGISTERABLE_ROLES`, `auth.controller.js:7,26-30`) — a coordinator account cannot be created through this endpoint at all; it must be created by an existing coordinator via `PATCH /users/:id/role` on an already-registered student/supervisor account. This is a sensible security hardening beyond spec, but it is a real behavioral difference from the literal doc. |
| POST | `/auth/login` | `auth.controller.js:login` | Public | Matches spec |

### Users (`users.routes.js`, mounted at `/users`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| GET | `/users/me` | `getMe` | Any authenticated | Matches |
| GET | `/users` | `listUsers` | Coordinator | Matches; supports `?role=` filter (not in doc, addition) |
| PATCH | `/users/:id/role` | `updateRole` | Coordinator | Matches, audit-logged |
| PATCH | `/users/:id/status` | `updateStatus` | Coordinator | Matches, audit-logged |

### Topics (`topics.routes.js`, mounted at `/topics`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| GET | `/topics` | `listTopics` | Any authenticated | Matches. **Addition beyond spec**: `?status=all` returns every topic regardless of status with a computed `claimed` flag (`topics.controller.js:41-49`) — built to support a coordinator "Manage Topics" screen the design doc never specified |
| POST | `/topics` | `createTopic` | student, coordinator | Matches exactly, including access list |
| POST | `/topics/suggest` | `suggestTopics` | student | Matches |
| POST | `/topics/:id/check-duplicate` | `checkDuplicateForTopic` | coordinator | Matches |

### Proposals (`proposals.routes.js`, mounted at `/proposals`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| POST | `/proposals` | `createProposal` | student | Matches; also creates the 6 default milestones as a side effect |
| GET | `/proposals/:id` | `getProposal` | owner/assigned/coordinator | Matches; also returns attached `documents` inline |

### Projects (`projects.routes.js`, mounted at `/projects`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| GET | `/projects` | `listProjects` | **student (own), supervisor (own), coordinator (all)** | **Deviation from design doc §6.3**, which lists access as "Supervisor (own), Coordinator (all)" only — no student access. Student access was added later (visible in the route guard `requireRole('student', 'supervisor', 'coordinator')`, `projects.routes.js:12`) specifically so a logged-in student has a way to see their own project list; the design doc never anticipated this and the ERD/API spec would need updating to match reality |
| GET | `/projects/:id` | `getProjectById` | owner/assigned/coordinator | Matches |
| PATCH | `/projects/:id/stage` | `updateStage` | supervisor (assigned only), coordinator | Matches; audit-logged; triggers a student notification (in-app + email) |
| POST | `/projects/:id/predict-deadline` | `predictProjectDeadline` | supervisor (assigned), coordinator | **Not in the design doc's §6 table at all** as a REST path — the doc's §6.6 models this as an internal `/ai/predict-deadline` "endpoint" callable by Express. In reality there is no such internal HTTP call; `predictDeadline()` is a plain imported JS function (`ai/deadlinePrediction.js`) called in-process from `projects.controller.js:660`. The *capability* exists exactly as designed; the *endpoint topology* the doc implies (a separate internal service call) does not. |
| POST | `/projects/:id/documents` | `documents.controller.js:uploadDocument` | student (own project only) | Matches |
| GET | `/projects/:id/documents` | `listDocuments` | owner/assigned/coordinator | Matches |
| GET | `/projects/:id/milestones` | `milestones.controller.js:listMilestones` | owner/assigned/coordinator | Matches |
| PATCH | `/projects/:id/milestones/:milestoneId` | `updateMilestone` | supervisor (assigned), coordinator | Matches |
| POST | `/projects/:id/feedback` | `feedback.controller.js:addFeedback` | supervisor (assigned), coordinator | Matches |
| GET | `/projects/:id/feedback` | `listFeedback` | owner/assigned/coordinator | Matches |

### Allocations (`allocations.routes.js`, mounted at `/allocations`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| GET | `/allocations/recommendations?projectId=` | `getRecommendations` | coordinator | Matches (design doc names it `GET /allocations/recommendations`, same path) |
| POST | `/allocations` | `createAllocation` | coordinator | Matches; also writes `projects.supervisor_id` and an audit-log row as side effects |

### Defense (`defense.routes.js`, mounted at `/defense`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| POST | `/defense/schedule` | `scheduleDefense` | coordinator | Matches |
| GET | `/defense` | `listDefenses` | coordinator | **Not in the design doc at all.** Added during a later revision pass specifically so the coordinator's Defense Scheduling screen could default to showing real "ready to schedule" / "already scheduled" lists instead of a bare project-ID lookup form. Pure addition. |
| GET | `/defense/:projectId` | `getDefense` | owner/assigned/coordinator | Matches design doc's `GET /defense/:projectId` |
| PATCH | `/defense/:id/result` | `recordResult` | coordinator | Matches |

### Notifications (`notifications.routes.js`, mounted at `/notifications`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| GET | `/notifications` | `listNotifications` | any authenticated | Matches |
| PATCH | `/notifications/:id/read` | `markRead` | any authenticated (own only) | Matches |

### Repository (`repository.routes.js`, mounted at `/repository`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| POST | `/repository/archive/:projectId` | `archiveProject` | coordinator | Matches; enforces `stage='completed'` **and** a `final` document existing first (extra guard beyond doc's one-line description) |
| GET | `/repository/search` | `searchRepository` | any authenticated | Matches; uses MySQL `FULLTEXT ... AGAINST` (natural language mode), one of the two options the design doc's §7.6 explicitly offered ("SQL LIKE/full-text index") |

### Reports (`reports.routes.js`, mounted at `/reports`)
| Method | Path | Controller | Access | Notes |
|---|---|---|---|---|
| GET | `/reports/projects?format=excel\|pdf` | `projectsReport` | coordinator | Matches design doc's `GET /reports/projects` |
| GET | `/reports/defense?format=excel\|pdf` | `defenseReport` | coordinator | Matches design doc's `GET /reports/defense` |
| GET | `/reports/stats` | `getStats` | coordinator | **Not in the design doc at all.** Backs the Statistics dashboard (5 aggregate charts) — a pure addition beyond the original API spec. |

### The design doc's `/ai/*` "internal" endpoint table (§6.6) does not exist as a namespace on the main API at all

The design doc lists `POST /ai/duplicate-check`, `/ai/suggest-topics`, `/ai/plagiarism-check`, `/ai/predict-deadline`, `/ai/suggest-schedule` as if Express exposes (or at least internally routes through) an `/ai/` prefix. **In reality, no `/api/v1/ai/*` route exists anywhere** — `app.js` never mounts anything at that path. Instead:
- The two embedding-based features are called by `backend/src/ai/aiServiceClient.js` directly against the **separate** `ai-service` process's own root paths (`POST http://localhost:8000/duplicate-check`, `/suggest-topics`, `/plagiarism-check` — no `/ai` prefix there either, see §7 of `ai-service/main.py`).
- The two rule-based ones (deadline prediction, defense scheduling) are **plain synchronous JS function calls** within the same Node process (`predictDeadline()`, `findAvailableSlot()`) — there was never an HTTP hop to eliminate, because they never had one. They're invoked from inside `POST /projects/:id/predict-deadline` and `POST /defense/schedule` respectively (see rows above).

Functionally this matches the design intent (embeddings live in Python, rule-based logic lives in Node, per `CLAUDE.md`'s explicit separation rule) — but the literal endpoint-table structure in §6.6 does not exist as drawn, and a Chapter 4 sequence diagram that shows the browser or Express hitting `/ai/predict-deadline` as a REST call would be inaccurate.

---

## 4. AI Module Implementation Detail

### 4.1 Duplicate Topic Detection

- **Embedding model, exact name, hardcoded**: `all-MiniLM-L6-v2` — `ai-service/embeddings.py:7` (`MODEL_NAME = "all-MiniLM-L6-v2"`), loaded via `sentence_transformers.SentenceTransformer`, cached to `ai-service/models/`.
- **Exact thresholds actually enforced in code** (not just the design doc's illustrative "e.g. 0.85"/"e.g. 0.70–0.85"):
  - `DUPLICATE_THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.85"))` — `ai-service/main.py:15`
  - `SIMILAR_THRESHOLD = float(os.getenv("SIMILAR_THRESHOLD", "0.70"))` — `ai-service/main.py:16`
  - No `.env` file overrides these in the current deployment (`ai-service/.env` does not exist; only `.env.example`, which itself specifies the same 0.85/0.70 values) — **the design doc's example numbers and the actually-running numbers are identical**, verified by inspecting both the code default and the env file.
  - Decision logic, verbatim (`ai-service/main.py:56-75`, `duplicate_check`): every existing topic with similarity ≥ 0.70 is collected into `matches` (sorted descending); if the top match is ≥ 0.85 the verdict is `"duplicate"`; else if there's any match at all it's `"similar"`; else `"none"`.
- **Real sample input/output**, captured from a live call to the running `ai-service` on 2026-07-21 (not a hypothetical):

  Existing topic embedded: *"AI-Based Student Attendance Tracking System (fictional demo topic). A demo topic exploring facial-recognition-based attendance tracking for university lecture halls."*

  | New submission | Real similarity | Real verdict |
  |---|---|---|
  | "Facial Recognition Attendance System for University Classrooms. This project tracks student attendance in lecture halls automatically using facial recognition technology." | **0.8196** | `"similar"` (correctly falls in the 0.70–0.85 band — a paraphrase, not identical wording) |
  | "Blockchain-Based Land Title Registry. A demo topic exploring blockchain technology for secure and transparent land ownership records." | *(no match returned — below 0.70)* | `"none"` |

  Raw JSON for the near-duplicate case: `{"matches":[{"id":1,"similarity":0.8196}]}`. This is real model output, not a fixture value.

- **Where it's stored**: `topics.embedding_vector` (JSON column), written once per topic and reused thereafter (`topics.controller.js:14-37`, `ensureEmbeddings`) — matches design doc §7.1's "store the embedding so future comparisons don't need recomputation" exactly.

### 4.2 Topic Recommendation

- Same model, same `/suggest-topics` endpoint, same underlying `embed_texts`/`cosine_similarity` functions as duplicate detection (`ai-service/main.py:80-89`) — confirms the design doc §7.1b's claim that this is "the same technique applied in the opposite direction" is literally true in the code, not just in prose.
- Real sample: idea text *"I want to build something with cameras that recognizes people automatically"* against the same attendance-system embedding above → similarity **0.3677**, returned as the sole suggestion (ranked list of 1). Lower than the duplicate-check pair above because the idea text is vaguer/shorter than a full title+description — an honest illustration of the technique's sensitivity to input length, worth a sentence in Chapter 4's evaluation discussion.
- `limit` query param (default 5, e.g. `/suggest-topics?limit=3`) truncates the ranked list — `ai-service/main.py:78`, `frontend` never sends a custom limit currently, always uses the default.

### 4.3 Plagiarism Risk Scoring

- **Not embedding-model-agnostic** — reuses the identical `all-MiniLM-L6-v2` model and `cosine_similarity` function (`ai-service/main.py:97-114`), consistent with `CLAUDE.md`'s instruction to keep embedding-based features on one model.
- **Exact thresholds in code**: `PLAGIARISM_HIGH_THRESHOLD = 0.75`, `PLAGIARISM_MEDIUM_THRESHOLD = 0.50` (`ai-service/main.py:17-18`) — the design doc §7.3 doesn't name specific numbers at all (it only says "low/medium/high"), so these exact cutoffs are an implementation decision made during development, not something inherited from the design doc.
- Corpus is capped at the **20 most recent** other students' `chapter`/`final` documents (`documents.controller.js:449-454`, `ORDER BY uploaded_at DESC LIMIT 20`) — a scale compromise not mentioned in the design doc, worth stating as a known limitation in Ch.5 (§9 below expands on this).
- **Real sample** from a live call:
  - Input chapter text: *"This chapter presents the implementation of the facial recognition attendance module, including the camera capture pipeline, face embedding extraction, and matching against enrolled student photos."*
  - Corpus: one near-identical paraphrase + one unrelated blockchain paragraph.
  - Real result: `{"risk_score":0.9768,"risk_band":"high","matches":[{"index":0,"similarity":0.9768},{"index":1,"similarity":-0.0922}]}` — correctly flags the paraphrase as high risk and the unrelated text as effectively unrelated (negative cosine similarity).
- Text extraction actually implemented: `pdf-parse` for `.pdf`, `mammoth` for `.docx` only — legacy binary `.doc` is **not supported** and silently yields an empty string (`textExtraction.js:9-24`), meaning a `.doc` upload gets no plagiarism signal at all rather than an error. This is a real, citable limitation.
- Failure mode: if `ai-service` is unreachable or text extraction throws, the plagiarism check is silently skipped and the upload still succeeds (`documents.controller.js:463-467`, caught and logged, returns `null`) — a deliberate "best-effort, not a gate" design choice worth stating explicitly rather than letting it look like an oversight.

### 4.4 Supervisor Allocation Scoring — confirmed rule-based, no ML

Exact formula, quoted verbatim from `backend/src/ai/supervisorAllocation.js:12-23`:
```js
function scoreSupervisorMatch(topicText, supervisor) {
  const tags = parseTags(supervisor.expertise_tags);
  const normalizedTopic = (topicText || '').toLowerCase();
  if (tags.length === 0) {
    return { score: 0, matchedTags: [] };
  }
  const matchedTags = tags.filter((tag) => normalizedTopic.includes(tag));
  const overlapRatio = matchedTags.length / tags.length;
  const workloadPenalty = 1 / (1 + (supervisor.active_project_count || 0));
  const score = Number((overlapRatio * workloadPenalty).toFixed(4));
  return { score, matchedTags };
}
```
`score = (matched expertise tags / total expertise tags) × 1/(1 + active project count)`. This is a **substring match** (`normalizedTopic.includes(tag)`), not a semantic/embedding comparison — confirmed no ML/embeddings are used here anywhere in this file or its caller (`allocations.controller.js`). `active_project_count` is computed live in SQL as `COUNT(*)` of a supervisor's non-completed projects (`allocations.controller.js:26-33`). Matches design doc §7.2's formula description exactly ("overlap ... weighted by current supervisor workload").

### 4.5 Deadline Prediction — confirmed rule-based, no ML

Two-part formula, quoted from `backend/src/ai/deadlinePrediction.js`:
- **Risk band** (lines 15-24): counts milestones that are either `status='late'` or (`due_date` in the past **and** `status != 'approved'`); `flags >= 2` → `"high"`, `flags === 1` → `"medium"`, else `"low"`.
- **Predicted completion date** (lines 26-30, 33-47): `predicted_deadline = today + round(pendingMilestonesCount × avgDaysPerStage)` days, where `avgDaysPerStage` is the mean of `(milestone.completed_at − project.created_at)` in days, averaged across **every** completed milestone system-wide (not per-project or per-supervisor) — a genuinely coarse, honestly-labeled heuristic exactly as design doc §7.4 frames it ("a rule-based approach is the honest, defensible choice"). Falls back to a hardcoded `DEFAULT_DAYS_PER_STAGE = 21` when no historical data exists yet (cold-start case).
- No ML library (no scikit-learn, no XGBoost, no TensorFlow/PyTorch) appears anywhere in `backend/package.json` — confirms the "no trained model" claim is literally true, not just asserted.

### 4.6 Defense Scheduling — confirmed rule-based, no ML

Quoted from `backend/src/ai/defenseScheduling.js`:
```js
function hasRoomConflict(candidate, existingDefenses) {
  const candidateRange = getRange(candidate.scheduled_date);
  return existingDefenses.some((d) => {
    if (d.room !== candidate.room) return false;
    return rangesOverlap(candidateRange, getRange(d.scheduled_date));
  });
}
function hasPanelConflict(candidate, existingDefenses, panelMembers) {
  const candidateRange = getRange(candidate.scheduled_date);
  return existingDefenses.some((d) => {
    if (!rangesOverlap(candidateRange, getRange(d.scheduled_date))) return false;
    const existingPanel = parsePanelMembers(d.panel_members);
    return existingPanel.some((memberId) => panelMembers.includes(memberId));
  });
}
```
`DEFENSE_DURATION_MINUTES = 60` (fixed, not configurable per-defense). `findAvailableSlot` (line 40) iterates the coordinator-supplied `candidate_dates` **in the order given** and returns the first one with neither a room conflict nor a panel-member conflict — this is literally "propose the first non-conflicting slot," matching design doc §7.5's description ("not a full genetic algorithm ... proposes the first non-conflicting time slot(s)") word for word in effect.

---

## 5. Testing Evidence

### Backend (Jest) — `cd backend && npm test`, run live for this audit

```
PASS src/ai/supervisorAllocation.test.js
PASS src/ai/defenseScheduling.test.js
PASS src/ai/deadlinePrediction.test.js
Test Suites: 3 passed, 3 total
Tests:       22 passed, 22 total
```
All 22 tests are pure unit tests of the three rule-based modules above (no database, no HTTP, no mocks of the thing being tested) — e.g. `supervisorAllocation.test.js` has cases for "penalizes supervisors with a heavier current workload," `defenseScheduling.test.js` for "flags a conflict when a panel member is already booked," `deadlinePrediction.test.js` for "treats a pending milestone past its due date as overdue." **There is no Jest test for any controller, route, or database interaction** — all 22 tests are on the three files in `backend/src/ai/`.

### AI-service (pytest) — `cd ai-service && pytest tests/ -v`, run live for this audit

```
tests/test_duplicate_check.py::test_known_similar_pairs_score_above_the_similar_threshold PASSED
tests/test_duplicate_check.py::test_known_different_pairs_score_below_the_similar_threshold PASSED
tests/test_duplicate_check.py::test_duplicate_check_verdict_is_duplicate_for_near_identical_text PASSED
tests/test_duplicate_check.py::test_duplicate_check_verdict_is_none_when_nothing_existing_is_close PASSED
tests/test_plagiarism_check.py::test_plagiarism_check_flags_near_identical_text_as_high_risk PASSED
tests/test_plagiarism_check.py::test_plagiarism_check_flags_unrelated_text_as_low_risk PASSED
tests/test_plagiarism_check.py::test_plagiarism_check_with_no_corpus_is_low_risk PASSED
tests/test_suggest_topics.py::test_suggest_topics_ranks_the_closer_candidate_first PASSED
tests/test_suggest_topics.py::test_suggest_topics_respects_the_limit_query_param PASSED
tests/test_suggest_topics.py::test_suggest_topics_with_no_candidates_returns_empty_list PASSED
10 passed in 59.49s
```
These genuinely call the loaded `sentence-transformers` model (via FastAPI's `TestClient`, in-process, no mocking) — the 59-second runtime is almost entirely first-call model load, confirming it's real inference, not stubbed.

### The design doc's requested duplicate-detection evaluation set — exists, here it is in full

`ai-service/tests/test_duplicate_check.py:12-32`, verbatim:

**Known-similar pairs** (paraphrases of the same underlying idea):
1. "AI-Based Student Attendance Tracking System" / *"A system that uses facial recognition to automatically mark student attendance in lecture halls."* **vs.** "Facial Recognition Attendance System for University Lecture Halls" / *"An automated attendance system for universities using facial recognition technology."*
2. "Mobile-Based Crop Disease Detection for Smallholder Farmers" / *"A mobile app that uses image classification to flag likely crop diseases from photos of plant leaves."* **vs.** "Plant Disease Detection Mobile Application" / *"An Android application that identifies plant diseases from leaf photos using image classification."*

Assertion: both pairs must score **≥ 0.70** (the `SIMILAR_THRESHOLD`). Test passed live during this audit.

**Known-different pairs**:
1. The attendance-system pair above **vs.** "Blockchain-Based Land Title Registry" / *"A system exploring blockchain technology for secure and transparent land ownership records."*
2. The crop-disease pair above **vs.** "University Library Book Reservation System" / *"A web system that lets students reserve and renew library books online."*

Assertion: both pairs must score **< 0.70**. Test passed live during this audit. **This test file, exactly as it exists in the repo, is the evaluation-chapter evidence the design doc asked for** — cite `ai-service/tests/test_duplicate_check.py` directly.

### Frontend

**No automated frontend test suite exists.** `find frontend/src -iname "*.test.*" -o -iname "*.spec.*"` returns nothing; `frontend/package.json`'s `"lint"` script runs `oxlint` (a linter, not a test runner) — there is no `"test"` script at all in `frontend/package.json`. All frontend verification during development was manual/ad-hoc: real headless-browser (Playwright) scripts run interactively against the live dev servers at various points, not committed to the repo as a permanent suite, and not reproducible by running a single `npm test` command today. State this plainly in Chapter 5 rather than implying automated frontend coverage exists.

### Manual testing notes found in the repo

`README.md` contains a per-phase build log (Phases 1–9, plus a later "Revision pass" section) documenting what was manually verified at each stage — e.g. curl-based endpoint checks, "verified via a real headless-browser run," and one incident write-up about a MySQL crash during Phase 4 testing (unrelated to application code, resolved via `CHECK TABLE`, no data loss). No manual-testing notes exist as code comments; they're only in `README.md`'s prose log.

---

## 6. Non-Functional Implementation

- **JWT auth**: `backend/src/middleware/auth.js` — reads `Authorization: Bearer <token>`, verifies with `jwt.verify(token, process.env.JWT_SECRET)`, attaches the decoded payload to `req.user`, returns 401 on anything invalid/missing. Token issued in `auth.controller.js:9-13` (`jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })`) — **default 7-day expiry**, not specified anywhere in the design doc. Frontend stores the token in `localStorage` (`frontend/src/services/authService.js:5`, `api.js:8`) and attaches it via an axios request interceptor (`api.js:6-12`) — worth noting for Ch.5: `localStorage` is vulnerable to token theft via XSS in a way an `httpOnly` cookie would not be; not flagged as a problem anywhere in the design doc, a legitimate point for a "security considerations" discussion.
- **bcrypt**: `SALT_ROUNDS = 10` (`auth.controller.js:6`), used for both `bcrypt.hash` at registration and `bcrypt.compare` at login. 10 rounds is bcrypt's own conventional default; the design doc doesn't specify a round count.
- **RBAC middleware**: `backend/src/middleware/rbac.js`, in full:
  ```js
  function requireRole(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      next();
    };
  }
  ```
  Applied per-route (see §3 tables above) — every protected route in the codebase composes `authenticate` then `requireRole(...)`, confirmed by grepping every `*.routes.js` file. Several controllers layer a **second**, finer-grained ownership check on top of role (e.g. `feedback.controller.js:248`: a supervisor can only add feedback if they are *the specific supervisor assigned to that project*, not just any supervisor) — this per-resource ownership check is not itself part of the `rbac.js` middleware; it's written inline in each controller, so RBAC in this codebase is really two layers (route-level role gate + controller-level ownership gate), not one.
- **Input validation**: `backend/src/utils/validators.js` — `isValidEmail` (regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`), `isFiniteNumber`, `isValidDate`. Confirmed call sites: `auth.controller.js:22` (register email), `feedback.controller.js:12` (rating 1–5), `milestones.controller.js:51` (progress_percent 0–100), `defense.controller.js:13` (candidate_dates array). Validation is applied at these **specific** points only — it is not a blanket request-body schema validator (no `zod`/`joi`/`express-validator` dependency exists in `package.json`); most other endpoints rely on basic presence checks (`if (!x) return 400`) rather than type/format validation.
- **HTTPS / production config**: **not implemented anywhere.** Grepping `backend/src` for `https`, `tls`, `ssl` (case-insensitive) returns zero matches. `app.js` uses plain `http.createServer(app)`. The design doc's NFR §8 says "HTTPS in production" as an aspiration; the actual codebase has no TLS termination, no cert config, and no environment-based HTTP→HTTPS redirect logic — this is a real, complete gap between the design doc's non-functional requirement and what exists, not a partial implementation. State this directly in Ch.5 rather than implying it's handled by "production configuration" that doesn't exist in the repo.
- **Audit logging**: `backend/src/utils/auditLog.js` (`recordAudit(userId, action, entityAffected)`, one `INSERT INTO audit_log` statement). Confirmed call sites (5 distinct action strings, grepped across the whole `src` tree): `update_role` and `update_status` (`users.controller.js:47,65`), `allocate_supervisor` (`allocations.controller.js:71`), `update_stage` (`projects.controller.js:633`), `record_defense_result` (`defense.controller.js:137`). This matches the design doc §8's named examples ("role change, allocation, stage update, defense result") essentially one-for-one — `update_status` (activate/deactivate) is the one addition beyond the doc's named list. **Not audited**, for completeness: milestone updates, feedback creation, document uploads, topic creation/duplicate-check outcomes, repository archiving. If Chapter 3/4 claims "full audit trail of all state-changing actions," that would overstate what's actually covered — it's these 5 specific actions, not all mutations system-wide.
- **CORS**: `app.js:21` — `cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' })`, a single allowed origin, not a wildcard — appropriately restrictive for a known-frontend deployment, not mentioned in the design doc at all.
- **Connection pooling**: `backend/src/config/db.js` — `mysql2/promise` pool, `connectionLimit: 10`, `waitForConnections: true`, `queueLimit: 0`. Not specified in the design doc; a reasonable default for the NFR §8's "stateless API services" scalability claim, though `connectionLimit: 10` was never load-tested against any target concurrency figure — no load-testing evidence exists anywhere in the repo.

---

## 7. Screens and User Flows (for Chapter 4 Screenshots)

All routes below are confirmed live in `frontend/src/App.jsx` and every corresponding page component file exists on disk (verified via `find frontend/src/pages -name "*.jsx"` — 18 page files, 18 routes, 1:1).

### Public (no login)
| Route | Component | What it does |
|---|---|---|
| `/` | `LandingPage.jsx` | Marketing/landing page — hero (with a University of Kigali campus rendering as background image), a 6-item feature grid, a 3-portal breakdown, calls to action into Sign in / Create an account |
| `/login` | `auth/LoginPage.jsx` | Email/password sign-in, redirects to the correct portal by role on success |
| `/register` | `auth/RegisterPage.jsx` | Self-registration for student or supervisor only (role dropdown excludes coordinator) |

### Student portal (role: `student`)
| Route | Component | What it does |
|---|---|---|
| `/student` | `student/StudentDashboard.jsx` | Dashboard listing the student's own project(s) (fetched from `GET /projects`, not `localStorage`) with stage badges and a link into progress tracking |
| `/student/topics` | `student/TopicsBrowsePage.jsx` | Browse currently-available (approved, unclaimed) topics; free-text "describe an idea" AI suggestion box; a form to propose a brand-new topic (runs the live duplicate-check) |
| `/student/proposal` | `student/ProposalForm.jsx` | Submit a formal proposal against a selected topic, with an optional initial document upload |
| `/student/progress/:projectId` | `student/ProgressPage.jsx` | Milestone progress bars, predicted-deadline/plagiarism-risk summary, document upload with version history, and the feedback thread from the supervisor |

### Supervisor portal (role: `supervisor`)
| Route | Component | What it does |
|---|---|---|
| `/supervisor` | `supervisor/SupervisorDashboard.jsx` | List of the supervisor's currently-assigned students/projects with stage badges |
| `/supervisor/projects/:projectId` | `shared/ProjectDetailPage.jsx` | Shared with the coordinator portal (see below) — stage change, milestone status updates, deadline-prediction trigger, feedback form |

### Coordinator portal (role: `coordinator`)
| Route | Component | What it does |
|---|---|---|
| `/coordinator` | `coordinator/CoordinatorDashboard.jsx` | Tile-based dashboard linking to every coordinator screen below |
| `/coordinator/users` | `coordinator/UserManagementPage.jsx` | List every account, filter by role, change a user's role, activate/deactivate |
| `/coordinator/topics` | `coordinator/TopicManagementPage.jsx` | Add a topic of interest directly (coordinator-authored, goes through the same duplicate-check as a student proposal); review every topic regardless of status with a "claimed by a project" indicator |
| `/coordinator/projects` | `coordinator/ProjectMonitoringPage.jsx` | Table of every project system-wide, filterable by stage, links into detail |
| `/coordinator/projects/:projectId` | `shared/ProjectDetailPage.jsx` | Same shared detail screen as the supervisor portal — the backend RBAC already allows a coordinator through every action a supervisor can take, so one screen serves both |
| `/coordinator/allocations` | `coordinator/AllocationsPage.jsx` | Lists unallocated proposals; per-proposal "View recommendations" shows the AI-ranked supervisor list with match scores; coordinator clicks to allocate |
| `/coordinator/defense` | `coordinator/DefenseSchedulingPage.jsx` | Defaults to two real lists — "ready to schedule" (defense-stage projects with no schedule yet) and "scheduled & completed defenses" — plus a manual project-ID lookup as a secondary path |
| `/coordinator/archive` | `coordinator/ArchivePage.jsx` | Defaults to a "ready to archive" list (completed-stage projects not yet in the repository), plus manual lookup |
| `/coordinator/reports` | `coordinator/ReportsPage.jsx` | Download buttons for the Project Status and Defense Schedule/Results reports, each as Excel or PDF |
| `/coordinator/statistics` | `coordinator/StatisticsPage.jsx` | 5 bar charts: Projects by Stage, Topics by Status, Defense Status, Plagiarism Risk bands, Supervisor Workload — all computed live, no caching |

### Shared (all three roles)
| Route | Component | What it does |
|---|---|---|
| `/repository` | `shared/RepositorySearchPage.jsx` | Search archived/completed projects by keyword, department, year; browses everything by default; results grouped A–Z by department |

**Total: 18 distinct page components across 21 routes** (3 shared-component routes account for the difference: `ProjectDetailPage` serves 2 routes, `LandingPage`/`LoginPage`/`RegisterPage` are each single-use). Every route in this table is live and reachable today — none of it is "planned but not built."

---

## 8. Final Folder Structure (Actual)

Generated directly from the filesystem on 2026-07-21 (`node_modules/`, `venv/`, `__pycache__/`, `dist/`, `.pytest_cache/`, `models/` (cached ML weights), and `uploads/` (runtime file storage) excluded as build/dependency/runtime-data noise, not source):

```
repository/
├── CLAUDE.md
├── README.md
├── System_Design_Document.md                  # NOTE: see deviation below
├── SYSTEM_AUDIT.md                             # this file
├── ai-service/
│   ├── .env.example
│   ├── embeddings.py
│   ├── main.py
│   ├── requirements.txt
│   └── tests/
│       ├── conftest.py
│       ├── test_duplicate_check.py
│       ├── test_plagiarism_check.py
│       └── test_suggest_topics.py
├── backend/
│   ├── .env / .env.example
│   ├── package.json
│   ├── database/
│   │   ├── migrate.js
│   │   ├── seed.js
│   │   └── migrations/
│   │       ├── 001_create_users.sql .. 011_create_repository.sql   (11 files)
│   └── src/
│       ├── app.js
│       ├── ai/
│       │   ├── aiServiceClient.js
│       │   ├── deadlinePrediction.js (+ .test.js)
│       │   ├── defenseScheduling.js (+ .test.js)
│       │   └── supervisorAllocation.js (+ .test.js)
│       ├── config/db.js
│       ├── middleware/{auth,rbac,upload}.js
│       ├── modules/
│       │   ├── allocations/  auth/  defense/  feedback/  milestones/
│       │   ├── notifications/  projects/ (+ documents, proposals)
│       │   ├── reports/  repository/  topics/  users/
│       │   └── (each: *.controller.js + *.routes.js)
│       ├── sockets/index.js
│       └── utils/{asyncHandler,auditLog,mailer,notify,textExtraction,validators}.js
├── docs/
│   ├── System_Design_Document.md               # NOTE: see deviation below
│   └── TECHNICAL_DOCUMENTATION.md
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/{favicon.svg,icons.svg}
    └── src/
        ├── App.jsx / main.jsx / index.css
        ├── assets/campus-hero.jpg
        ├── components/
        │   ├── Layout.jsx / NotificationBell.jsx / ProtectedRoute.jsx
        │   └── ui/{Alert,Badge,BarChart,Button,Card}.jsx + input.js
        ├── context/AuthContext.jsx
        ├── pages/
        │   ├── LandingPage.jsx
        │   ├── auth/{LoginPage,RegisterPage}.jsx
        │   ├── student/{StudentDashboard,TopicsBrowsePage,ProposalForm,ProgressPage}.jsx
        │   ├── supervisor/SupervisorDashboard.jsx
        │   ├── coordinator/{CoordinatorDashboard,UserManagementPage,TopicManagementPage,
        │   │                ProjectMonitoringPage,AllocationsPage,DefenseSchedulingPage,
        │   │                ArchivePage,ReportsPage,StatisticsPage}.jsx
        │   └── shared/{ProjectDetailPage,RepositorySearchPage}.jsx
        └── services/
            ├── api.js / authService.js / socket.js
            └── {allocations,defense,notifications,projects,proposals,reports,repository,topics,users}Service.js
```

### Deviations from the design doc's §9 "Suggested Project Folder Structure"

1. **No top-level `project-coordination-system/` wrapper directory** — the design doc's tree starts with that as the repo root; the actual repo root *is* `backend/`, `frontend/`, `ai-service/`, `docs/` directly (this is a cosmetic difference, not a structural one).
2. **`backend/src/modules/` has more subfolders than the design doc listed**: the doc's §9 names `auth, users, topics, projects, milestones, feedback, defense, notifications, repository, reports` (10 modules). The actual tree has an 11th: `allocations/` — a whole module the design doc's folder sketch omitted even though the doc's own §6.4 API table clearly specifies `/allocations` endpoints. Also, `documents` and `proposals` live as sibling files *inside* `modules/projects/` (`documents.controller.js`, `documents.routes.js`, `proposals.controller.js`, `proposals.routes.js`) rather than as their own top-level module folders — a reasonable implementation choice (they're tightly coupled to projects) but a real structural difference from the doc's flat module list.
3. **`ai-service/embeddings.py` exists exactly as suggested** — one of the few places the actual structure matches the doc's suggestion verbatim.
4. **No `docs/` folder was suggested to contain anything besides `System_Design_Document.md`** in the doc's own tree — in reality `docs/` also holds `TECHNICAL_DOCUMENTATION.md`, an as-built reference document the design doc predates and couldn't have anticipated.
5. **Two copies of `System_Design_Document.md` exist and have diverged** — one at the repo root, one inside `docs/`. `diff` between them (run live for this audit) shows the root copy's title was updated to "AI-Integrated Web-Based University of Kigali Final Project Coordination System" during a later rename pass, while the `docs/` copy still reads "AI-Integrated Web-Based University **Final Project Coordination System** / **Case Study**: University of Kigali (UOK)" — the **old** title. **Action needed before submission**: reconcile these into a single canonical copy (recommend deleting the `docs/` duplicate and keeping only the root one, updating `README.md`'s reference to it if it points at `docs/System_Design_Document.md`).

---

## 9. Deviations and Known Limitations (for Chapter 5)

A consolidated list of every gap found above, so Chapters 1–3 claims can be checked against what's defensible in a viva:

1. **`similarity_score` on `projects` is dead schema** — exists exactly as the ERD describes, is never written by any code path. Only `topics`-level duplicate-check results are actually surfaced to users. (§2)
2. **AI-service `requirements.txt` is out of sync with the actually-running environment**, by up to 2 major versions on `sentence-transformers` and 1 major version on `numpy`. A fresh install from the pinned file would not reproduce today's exact dependency set. (§1)
3. **No HTTPS/TLS anywhere in the codebase**, despite the design doc's NFR listing it — this system has only ever run over plain HTTP on localhost. Do not claim production-grade transport security in Chapter 3/4 without adding this to Chapter 5's limitations. (§6)
4. **No frontend automated test suite.** All three AI/rule-based backend modules and all AI-service endpoints have real, runnable, currently-passing tests; the entire React frontend does not — verification there was manual/ad-hoc throughout development. (§5)
5. **The design doc's `/ai/*` internal endpoint namespace (§6.6) does not exist.** The AI capabilities it describes all work, but not through the HTTP topology the doc implies — two are calls to a genuinely separate microservice at its own root paths, and two are plain in-process function calls with no HTTP hop at all. A Chapter 4 architecture diagram should reflect this, not the doc's literal endpoint table. (§3)
6. **Self-registration is restricted to student/supervisor**, not "any account" as the design doc's `POST /auth/register` row implies — coordinator accounts can only be created by promoting an existing account. Reasonable, but undocumented in the design doc. (§3)
7. **Audit logging covers 5 specific action types**, not "every state-changing action" in the fully literal sense — milestone updates, feedback, document uploads, topic creation, and repository archiving are not audit-logged. If Chapter 3 frames the system as having a comprehensive audit trail, narrow that claim to the 5 actions actually covered. (§6)
8. **Plagiarism corpus is capped at 20 most-recent documents**, and legacy `.doc` files (as opposed to `.docx`) silently produce no plagiarism signal at all rather than an error. Both are real, unstated scale/format limitations. (§4.3)
9. **Two divergent copies of `System_Design_Document.md`** exist in the repo (root vs. `docs/`) with different titles — needs reconciling before submission so a reader/examiner doesn't find two different "official" titles for the same project. (§8)
10. **`GET /projects`, `GET /defense`, `GET /reports/stats`, and `GET /topics?status=all`** are all real, working endpoints that exist **beyond** the original API specification — added during later development to support screens the design doc's use-case list didn't originally call for a dedicated backing endpoint for (student's own project list, a defense-overview screen, the statistics dashboard, and coordinator topic management, respectively). These are honest improvements, not scope creep to hide — but Chapter 3's requirements list and Chapter 4's API section should be updated to include them so the dissertation's "requirements → implementation" traceability is accurate in both directions.
11. **No load testing evidence exists anywhere in the repo** for the `connectionLimit: 10` MySQL pool setting or for concurrent request handling generally — the design doc's "Scalability" NFR is asserted by architecture (stateless services, indexes) but not empirically demonstrated. Frame any scalability claim in Ch.3/4 as a design property, not a measured one, unless load testing is added before submission.
12. **JWT stored in `localStorage` on the frontend**, not an `httpOnly` cookie — a standard, defensible choice for a project at this scale, but a legitimate "security considerations / future work" point since it's a slightly different risk profile than the doc's one-line "JWT auth" NFR implies.

---

## 10. Diagrams Status

**None of the three diagram files referenced by `System_Design_Document.md` exist in the repository.** Confirmed by direct filesystem check:
- `diagrams/architecture.png` (referenced §3) — **the entire `diagrams/` directory does not exist.**
- `diagrams/usecase.png` (referenced §4) — does not exist.
- `diagrams/erd.png` (referenced §5) — does not exist.

A repo-wide search for any `.png` file (excluding third-party library test fixtures inside `ai-service/venv/`, which are unrelated) returns **zero** project-authored diagram images. These three `![...]` image references in `System_Design_Document.md` are currently broken links pointing at files that were never created.

**For Chapter 4 §4.8/4.9**: these diagrams need to be created from scratch, and should be drawn from the *actual* schema and routes in §2/§3 above, not from the design doc's original (now partially superseded) sketch — in particular:
- An ERD regenerated from the 11 real `CREATE TABLE` statements in §2 (including the dead `similarity_score` column, which you may choose to omit from a "logical" ERD even though it's physically present, with a footnote explaining why).
- An architecture diagram that shows the **real** service topology: three independently-run processes (Express on :5000, the AI microservice on :8000, MySQL on :3306) with the frontend (Vite dev server / static build) talking only to Express, and Express alone talking to both MySQL and the AI microservice — critically, showing that the "rule-based AI" box is *inside* the Express process, not a fourth external service, since §3 above confirms there's no HTTP hop for supervisor allocation, deadline prediction, or defense scheduling.
- A use-case diagram that adds the topic-management and statistics/reporting capabilities the coordinator now has (§7), which go slightly beyond the original §4.3 use-case list.
