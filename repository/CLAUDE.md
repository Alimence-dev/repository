# CLAUDE.md — Build Brief: AI-Integrated Final Project Coordination System

> Give this file to Claude Code at the root of a new/empty repository. It describes the full project so you can build it phase by phase across multiple sessions without losing context. Read `System_Design_Document.md` (in the same folder) alongside this file — it has the full architecture, ERD, API spec, and AI module design this brief refers to.

## 0. What this project is

An academic (undergraduate, final-year) web system for the University of Kigali that coordinates final-year student projects between Students, Supervisors, and a Coordinator/Admin. It includes a few genuinely simple AI features (duplicate topic detection, topic recommendation, plagiarism risk scoring, rule-based deadline prediction, rule-based defense scheduling, supervisor allocation scoring). Full design detail lives in `System_Design_Document.md` — treat it as the source of truth for schema, endpoints, and AI logic. This brief is about **how to build it**, in what order, and to what standard.

## 1. Ground rules for how you (Claude Code) should work on this

- **This is an academic project.** Prioritize correctness, clarity, and something the author can explain line-by-line in a viva over cleverness or "enterprise" patterns. Prefer straightforward code over abstractions that don't earn their keep.
- **Build in the phases below, in order.** Don't jump ahead to AI features before the core CRUD backbone (auth, projects, topics) works end-to-end.
- **After each phase, stop and summarize** what was built, what to test manually, and what's next — don't silently continue into the next phase.
- **Keep the two AI approaches separate and don't blur them:**
  - Embedding-based features (duplicate detection, topic recommendation, plagiarism risk) — Python microservice (`ai-service/`, FastAPI + `sentence-transformers`).
  - Rule-based features (supervisor allocation scoring, deadline prediction, defense scheduling) — plain Node.js logic inside the Express backend. **Do not** reach for a Python ML model or a training pipeline for these — there's no historical data to train on yet, and the design doc explicitly frames this as a documented limitation/future-work item, not a gap to "fix" by fabricating training data.
- **Never fabricate data to make demos look better** — if a seed/demo dataset is needed, generate clearly-fictional sample data and say so, don't imply it's real historical UOK data.
- **Write tests as you go** for the AI logic in particular (duplicate detection thresholds, scheduling conflicts) — these are the parts most likely to get viva questions like "how do you know this works?"
- **Use environment variables** for all secrets (JWT secret, DB credentials, mail credentials) via `.env` + `.env.example`, never hardcoded.

## 2. Tech stack (fixed — do not substitute)

| Part | Technology |
|---|---|
| Frontend | React (Vite), Tailwind CSS |
| Backend | Node.js + Express |
| Database | MySQL |
| Real-time | Socket.io |
| Auth | JWT + bcrypt |
| AI microservice | Python + FastAPI + `sentence-transformers` |
| Email | nodemailer |
| File uploads | multer |

## 3. Build phases

### Phase 1 — Project scaffolding
- Initialize the folder structure exactly as in `System_Design_Document.md` §9 (`backend/`, `ai-service/`, `frontend/`, `docs/`).
- Backend: Express app skeleton, `.env.example`, DB connection config, health-check route (`GET /api/v1/health`).
- Frontend: Vite + React skeleton with three placeholder route groups (`/student`, `/supervisor`, `/coordinator`) and a shared login page.
- ai-service: FastAPI skeleton with a `/health` route, `requirements.txt`.
- Set up MySQL connection and confirm all three services can start locally.

### Phase 2 — Database
- Write MySQL migration SQL (`CREATE TABLE` statements) for every entity in the ERD: `USERS`, `TOPICS`, `PROJECTS`, `DOCUMENTS`, `FEEDBACK`, `DEFENSE_SCHEDULE`, `SUPERVISOR_ALLOCATIONS`, `NOTIFICATIONS`, `AUDIT_LOG`, `MILESTONES`, `REPOSITORY`.
- Use proper foreign keys and sensible indexes (on `role`, `stage`, `status`, and any column used in search/filter).
- Add a small seed script with clearly-fictional demo users (one of each role) and a couple of sample topics.

### Phase 3 — Auth & Users module
- Register/login (`/auth/register`, `/auth/login`), JWT issuance, bcrypt hashing.
- RBAC middleware (student / supervisor / coordinator) applied to every protected route from here on.
- `/users/me`, and coordinator-only user management endpoints.
- Frontend: login page + role-based redirect + protected routes.

### Phase 4 — Topics & Proposals (core, no AI yet)
- CRUD for topics and proposals per the API spec §6.2.
- Document upload (multer) tied to a project, versioned.
- Frontend: student proposal submission form, topic browse/select page.
- **Stub the duplicate-check call** (e.g. always return "no duplicate found") — wire the real AI in Phase 7. This lets you build and test the full flow before the AI service exists.

### Phase 5 — Projects, Milestones, Feedback
- Project CRUD, stage updates.
- Milestones table wiring: create default milestone rows when a project is created (Proposal, Chapter 1, Chapter 2, Chapter 3, Final, Defense), status/progress updates.
- Feedback endpoints + supervisor UI to comment/rate.
- Frontend: student progress-bar view, supervisor "my students" dashboard.

### Phase 6 — Supervisor Allocation, Defense Scheduling, Notifications
- Rule-based supervisor allocation scoring (keyword/tag overlap + workload) — implement as a plain scored ranking function, unit-test it with a few synthetic supervisor/student examples.
- Rule-based defense scheduler — implement as a constraint check over a list of available slots; unit-test conflict detection.
- Notifications: Socket.io events for key actions (feedback posted, stage change, defense scheduled) + matching email via nodemailer.
- Frontend: coordinator allocation screen (shows AI-suggested ranking, coordinator picks), defense scheduling screen.

### Phase 7 — AI microservice (Python) + real integration
- Build `ai-service/`: `/duplicate-check`, `/suggest-topics`, `/plagiarism-check` using `sentence-transformers` embeddings + cosine similarity, per design doc §7.1, §7.1b, §7.3.
- Wire the Node backend's stubbed calls (from Phase 4) to the real microservice via `aiServiceClient.js`.
- Test with a small hand-built set of known-similar and known-different topic pairs — keep this test set in the repo (`ai-service/tests/`), since it's good evidence for the dissertation's evaluation chapter.
- Rule-based deadline prediction (Node.js, uses `MILESTONES` data) — implement per §7.4.

### Phase 8 — Repository & Reports
- Archive-on-completion flow into `REPOSITORY`.
- Search endpoint (simple `LIKE`/full-text search).
- Coordinator reports (project status, defense results) exported as PDF/Excel.

### Phase 9 — Polish & demo readiness
- Consistent error handling and validation across all endpoints.
- Basic responsive styling pass across the three portals.
- Seed a fuller fictional demo dataset for defense/presentation purposes.
- README with setup instructions (env vars, how to run all three services, how to seed the DB).

## 4. What "done" looks like for each phase

Before moving to the next phase, confirm:
1. The relevant endpoints work via a quick manual test (curl or Postman-style check) or an automated test.
2. The relevant frontend screen renders and calls the real endpoint (not mock data), except where a phase explicitly says to stub something.
3. Nothing from an earlier phase broke.

## 5. Reference

Full architecture, ERD, use case diagrams, and complete API/AI specification: see `System_Design_Document.md` and the `diagrams/` folder in this same directory.
