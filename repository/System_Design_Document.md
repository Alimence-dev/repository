# System Design Document
## AI-Integrated Web-Based University of Kigali Final Project Coordination System
**University of Kigali (UOK)**

---

## 1. Introduction

This document defines the system design for the AI-Integrated Web-Based University of Kigali Final Project Coordination System, prior to implementation. It covers the architecture, database design, use cases, API specification, and the design of the AI components (duplicate topic detection, supervisor allocation, plagiarism risk identification, deadline prediction, and defense scheduling).

Three actors interact with the system:
- **Student** — registers, submits proposals, selects topics, uploads documents, views feedback/results.
- **Supervisor** — views assigned students, tracks progress, provides feedback.
- **Coordinator/Administrator** — manages accounts and roles, allocates supervisors, monitors all projects, oversees AI duplicate-detection, generates reports.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React (SPA), Tailwind/CSS |
| Backend / API | Node.js + Express.js |
| Database | MySQL |
| Real-time updates | Socket.io |
| Authentication | JWT (JSON Web Tokens), bcrypt for password hashing |
| AI / NLP module | Small internal **Python microservice** (`sentence-transformers` + cosine similarity), called by Express over HTTP — used only for the two features that genuinely need embeddings: duplicate detection and topic recommendation |
| File storage | Local disk (multer) or S3-compatible bucket for proposals/reports |
| Reporting | Server-generated PDF/Excel (e.g. `exceljs`, `pdfkit`) |

This matches the stack used in your other full-stack academic projects (Node/Express + React + MySQL + Socket.io), so tooling and patterns stay consistent across your work.

---

## 3. System Architecture

The system follows a layered architecture: client apps → API gateway → application services → AI services → data layer.

![System Architecture](diagrams/architecture.png)

**Layer responsibilities:**

- **Presentation Layer** — three React-based portals (Student, Supervisor, Coordinator), sharing a common component library and calling the same REST API with role-based views.
- **API Gateway** — a single Express entry point handling routing, JWT verification, and role-based access control (RBAC) middleware before requests reach any service.
- **Application Services** — modular Express services/controllers, each owning one domain: Auth & Users, Projects & Proposals, Supervision & Feedback, Defense Scheduling, Notifications (Socket.io), Reporting.
- **AI Services Layer** — split into two parts, kept deliberately simple:
  - A small **Python microservice** for the two features that need embeddings (duplicate topic detection, topic recommendation), called by Express over plain HTTP.
  - **Rule-based logic in Node.js** for supervisor allocation (weighted scoring) and deadline prediction (submission-interval rules) — no ML training required, so there's no chicken-and-egg problem of needing historical data before the system has any.
- **Data Layer** — MySQL for relational data, a file store for uploaded documents, and a lightweight vector/embedding store (can simply be a MySQL table storing serialized vectors, or a proper vector DB later) for topic-similarity search.

---

## 4. Use Case Diagram

![Use Case Diagram](diagrams/usecase.png)

### 4.1 Student Use Cases
| Use Case | Description |
|---|---|
| Register/Login | Create account, authenticate via JWT |
| Submit project proposal | Upload proposal document + metadata |
| Select research topic | Browse/search topics; system runs duplicate check on selection |
| Upload project document | Version-tracked chapter/document uploads |
| View feedback and evaluation result | See supervisor comments, ratings, defense outcome |
| Get topic suggestions (AI) | Enter a rough idea; system suggests related, non-duplicate topics |
| Track milestone progress | View a progress bar across proposal → chapters → final → defense |

### 4.2 Supervisor Use Cases
| Use Case | Description |
|---|---|
| Register/Login | Authenticate as supervisor |
| View assigned students | List of students allocated by coordinator |
| Track student progress | View submission history, milestones, stage |
| Provide feedback and comments | Comment/rate submitted documents |

### 4.3 Coordinator/Administrator Use Cases
| Use Case | Description |
|---|---|
| Manage user accounts and roles | CRUD on users, assign roles |
| Allocate supervisor to student | Manual allocation, informed by AI match score |
| Monitor and manage all projects | Dashboard over every project's stage/status |
| Detect duplicate topic (AI) | Runs automatically on topic submission; flags matches above threshold |
| Generate reports and analytics | Export progress/defense/plagiarism-risk reports |
| Schedule defense (AI-assisted) | Auto-suggest slots based on panel and room availability |
| Archive completed project | Move a finished project into the searchable Research Repository |
| Search repository | Search past completed projects by title/keyword/department/year |

---

## 5. Database Design (ERD)

![Entity Relationship Diagram](diagrams/erd.png)

### Key entities

- **USERS** — single table for all roles (`role` enum: student/supervisor/coordinator), holding `expertise_tags` used by the supervisor-allocation recommender.
- **TOPICS** — proposed topics with an `embedding_vector` column (serialized JSON/BLOB) used for similarity comparison.
- **PROJECTS** — the core entity linking a student, supervisor, and topic; tracks `stage`, `similarity_score`, `plagiarism_score`, and `predicted_deadline`.
- **DOCUMENTS** — versioned file uploads tied to a project (proposal, chapters, final report).
- **FEEDBACK** — supervisor/coordinator comments and ratings on a project.
- **DEFENSE_SCHEDULE** — panel members (JSON array of user IDs), date, room, result.
- **SUPERVISOR_ALLOCATIONS** — records of student–supervisor matches, including the AI `match_score` and the coordinator who approved it.
- **NOTIFICATIONS** — per-user real-time alerts (fed by Socket.io).
- **AUDIT_LOG** — action trail for accountability (who changed what, when) — useful for your dissertation's "transparency and accountability" objective.
- **MILESTONES** — one row per stage of a project (Proposal, Chapter 1, Chapter 2, …, Final, Defense) with its own status and due date. This gives the progress-tracking feature real data to work with, instead of relying only on the single `PROJECTS.stage` field.
- **REPOSITORY** — one row per completed project, created when a project is archived; holds searchable metadata (title, keywords, department, year) plus the path to the final archived file. Directly implements the "centralized repository" goal from your original project description.

### Relationship summary
- One student has many projects is unlikely in practice (typically 1), but the schema allows it; one supervisor supervises many projects.
- One topic maps to one project once selected/approved.
- One project has many documents and many feedback entries.
- One project has one defense schedule record.

---

## 6. API Endpoint Specification

Base URL: `/api/v1`

### 6.1 Auth & Users
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/auth/register` | Register a new account | Public |
| POST | `/auth/login` | Login, returns JWT | Public |
| GET | `/users/me` | Get current user profile | Authenticated |
| GET | `/users` | List all users | Coordinator |
| PATCH | `/users/:id/role` | Change a user's role | Coordinator |
| PATCH | `/users/:id/status` | Activate/deactivate account | Coordinator |

### 6.2 Topics & Proposals
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/topics` | List available topics | Student, Supervisor, Coordinator |
| POST | `/topics` | Propose a new topic (triggers duplicate check) | Student, Coordinator |
| POST | `/topics/:id/check-duplicate` | Re-run AI similarity check | Coordinator |
| POST | `/topics/suggest` | Get AI topic suggestions from a rough idea | Student |
| POST | `/proposals` | Submit a project proposal | Student |
| GET | `/proposals/:id` | Get proposal details | Student, Supervisor, Coordinator |

### 6.3 Projects
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/projects` | List projects (filterable by stage/supervisor) | Supervisor (own), Coordinator (all) |
| GET | `/projects/:id` | Get project details | Student (own), Supervisor (assigned), Coordinator |
| PATCH | `/projects/:id/stage` | Update project stage | Supervisor, Coordinator |
| POST | `/projects/:id/documents` | Upload a document version | Student |
| GET | `/projects/:id/documents` | List document versions | Student, Supervisor, Coordinator |
| GET | `/projects/:id/milestones` | List milestone progress | Student, Supervisor, Coordinator |
| PATCH | `/projects/:id/milestones/:milestoneId` | Update milestone status | Supervisor, Coordinator |

### 6.4 Supervision & Feedback
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/projects/:id/feedback` | Add feedback/rating | Supervisor, Coordinator |
| GET | `/projects/:id/feedback` | View feedback history | Student, Supervisor, Coordinator |
| POST | `/allocations` | Allocate supervisor to student | Coordinator |
| GET | `/allocations/recommendations` | Get AI-suggested matches | Coordinator |

### 6.5 Defense Scheduling
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/defense/schedule` | Create/auto-suggest defense slot | Coordinator |
| GET | `/defense/:projectId` | Get defense details | Student, Supervisor, Coordinator |
| PATCH | `/defense/:id/result` | Record defense outcome | Coordinator |

### 6.6 AI Services (internal — Express calls these, clients never call them directly)
| Method | Endpoint | Where it runs | Description |
|---|---|---|---|
| POST | `/ai/duplicate-check` | Python microservice | Returns similarity score(s) against existing topics |
| POST | `/ai/suggest-topics` | Python microservice | Returns related topic suggestions for a rough idea |
| POST | `/ai/plagiarism-check` | Python microservice | Returns a plagiarism risk score for a document |
| POST | `/ai/predict-deadline` | Node.js (rule-based) | Returns a predicted completion estimate from milestone history |
| POST | `/ai/suggest-schedule` | Node.js (rule-based) | Returns available defense slots given panel/room constraints |

### 6.7 Notifications & Reports
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/notifications` | List current user's notifications | Authenticated |
| PATCH | `/notifications/:id/read` | Mark as read | Authenticated |
| GET | `/reports/projects` | Export project status report | Coordinator |
| GET | `/reports/defense` | Export defense schedule/results report | Coordinator |

*Notifications are delivered two ways: in-app via Socket.io for real-time updates, and by email (nodemailer) for anything a user should see even when offline — e.g. feedback posted, defense scheduled.*

### 6.8 Repository
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/repository/archive/:projectId` | Archive a completed project into the repository | Coordinator |
| GET | `/repository/search` | Search archived projects by title/keyword/department/year | Student, Supervisor, Coordinator |

---

## 7. AI Module Design

> **Design principle for all AI components below:** keep each one as simple as it can be while still being a genuine AI/ML technique — this is an undergraduate project, and a simple, well-explained approach you can defend in a viva is worth more than an impressive-sounding one you can't justify.

### 7.1 Duplicate Topic Detection
- On topic submission, generate a sentence embedding of the title + description (Python microservice, `sentence-transformers`).
- Compare against embeddings of all existing topics using cosine similarity.
- Flag as "duplicate/near-duplicate" if similarity ≥ a configurable threshold (e.g. 0.85); "similar" if between two thresholds (e.g. 0.70–0.85) for manual coordinator review.
- Store the embedding in the `TOPICS` table so future comparisons don't need recomputation.

### 7.1b Topic Recommendation
- Uses the *same* embedding model and the *same* topic-embedding table as duplicate detection — really the same technique applied in the opposite direction, which keeps the AI surface area small and easy to defend.
- Student enters a rough idea (e.g. "AI in education"); the system embeds it and returns the closest existing/approved topics that are **not** already taken, ranked by similarity.
- Duplicate detection flags closeness as a problem; topic recommendation surfaces closeness as a suggestion — same math, opposite use.

### 7.2 Supervisor Allocation Recommender
- Match based on overlap between a student's proposed topic keywords/tags and a supervisor's `expertise_tags`, weighted by current supervisor workload (number of active projects).
- Output a ranked list of candidate supervisors with a `match_score`; the coordinator makes the final allocation decision (AI recommends, human approves — important for your dissertation's accountability argument).

### 7.3 Plagiarism Risk Identification
- For an uploaded document, extract text and compare against a reference corpus (previously submitted UOK projects, plus optionally an external check via a plagiarism API if available).
- Produce a risk score band (low/medium/high) rather than a binary "plagiarized" verdict — keeps you on defensible ground academically, since full plagiarism detection tools (e.g. Turnitin) are a separate, licensed capability.

### 7.4 Deadline Prediction
- Rule-based rather than a trained ML model (XGBoost/Random Forest are tempting on paper, but they need historical labeled data your system won't have on day one — a rule-based approach is the honest, defensible choice for a first version).
- Uses the `MILESTONES` table: counts overdue/late milestones and current progress percentage to assign a risk band (low/medium/high) per student, and estimates a completion date from the average time-per-stage seen so far in the system.
- **Future work note (good to mention in your dissertation):** once the system has a semester or two of real usage data, this rule-based logic could be replaced with a trained model (e.g. Random Forest) — a natural, credible direction for "future enhancements."

### 7.5 Defense Scheduling
- Simple constraint-based scheduler (not a full genetic algorithm — unnecessary complexity for the number of defenses a single department schedules per semester): given panel member availability, room availability, and project readiness, it proposes the first non-conflicting time slot(s).
- Coordinator confirms the final schedule; this keeps a human in the loop for a decision that affects people's calendars.

---

### 7.6 Research Repository
- Not really "AI" — a straightforward archive-and-search feature — but included here because it's one of your stated project goals.
- When a coordinator marks a project as fully completed, its metadata and final document are copied into `REPOSITORY`.
- Simple keyword search (SQL `LIKE`/full-text index on title/keywords) is enough; no need for embeddings here — keeps this feature cheap to build and easy to explain.

## 8. Non-Functional Requirements

- **Security**: JWT-based auth, bcrypt password hashing, role-based access control on every route, input validation/sanitization, HTTPS in production.
- **Scalability**: stateless API services behind the gateway; MySQL indexing on foreign keys and frequently filtered columns (`role`, `stage`, `status`).
- **Availability**: Socket.io for real-time notifications with fallback polling if a socket connection drops.
- **Auditability**: every state-changing action (role change, allocation, stage update, defense result) recorded in `AUDIT_LOG`.
- **Maintainability**: AI logic isolated behind its own service boundary so models/algorithms can be improved independently of core CRUD logic.

---

## 9. Suggested Project Folder Structure

```
project-coordination-system/
├── backend/
│   ├── src/
│   │   ├── config/          # db connection, env config
│   │   ├── middleware/      # auth, rbac, error handling
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── topics/
│   │   │   ├── projects/
│   │   │   ├── milestones/
│   │   │   ├── feedback/
│   │   │   ├── defense/
│   │   │   ├── notifications/
│   │   │   ├── repository/
│   │   │   └── reports/
│   │   ├── ai/
│   │   │   ├── aiServiceClient.js     # calls the Python microservice
│   │   │   ├── supervisorAllocation.js  # rule-based, stays in Node
│   │   │   └── deadlinePrediction.js    # rule-based, stays in Node
│   │   ├── sockets/
│   │   └── app.js
│   └── package.json
├── ai-service/                  # Python microservice
│   ├── main.py                  # FastAPI app exposing /duplicate-check, /suggest-topics, /plagiarism-check
│   ├── embeddings.py
│   ├── requirements.txt
│   └── models/                  # cached sentence-transformer model
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── student/
│   │   │   ├── supervisor/
│   │   │   └── coordinator/
│   │   ├── components/
│   │   ├── services/        # API client
│   │   └── App.jsx
│   └── package.json
└── docs/
    └── System_Design_Document.md
```

---

## 10. Next Steps

1. Finalize the MySQL schema (create actual `CREATE TABLE` migration scripts from the ERD above).
2. Scaffold backend modules following the folder structure, starting with Auth.
3. Build the duplicate-topic-detection service first, since it's the most distinctive AI feature and easiest to validate with a small labeled test set (pairs of known-similar and known-different topics).
4. Build role-specific frontend shells (Student, Supervisor, Coordinator) against a mocked API before wiring real endpoints.
