# AfCEN Project Manager - Product Requirements Document

**Version:** 1.0
**Date:** 20 July 2026
**Author:** AfCEN Development Team
**Status:** Production (Beta)
**Live URL:** https://frontend-lilac-eta-98.vercel.app

---

## 1. Overview

AfCEN Project Manager is a web-based platform for managing and reviewing pre-feasibility and feasibility study deliverables for energy infrastructure projects. It provides a structured workflow for document submission, automated quality checks, benchmark validation, and stakeholder review before investment decisions.

The platform was built for the Bulambuli-Moroto 132 kV IPT feasibility study review and is designed to scale to multiple concurrent projects.

---

## 2. Problem Statement

Feasibility study reviews for energy infrastructure projects involve multiple stakeholders (developers, consultants, lead reviewers, investors) exchanging large volumes of technical documents. Without a structured platform:

- Documents are shared via email with no version control or audit trail
- Cost estimates go unchecked against industry benchmarks
- Arithmetic and unit errors in financial tables are caught manually (or missed entirely)
- There is no single source of truth for review status
- Investors lack visibility into the review process and published deliverables

---

## 3. Users & Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **AfCEN Lead** | Project manager with full platform access | Create projects, review flags, resolve issues, publish deliverables, manage benchmarks, access admin panel, export packages |
| **Consultant** | External technical consultant | Upload deliverables, respond to review flags, transition deliverables through workflow, view extractions |
| **Developer** | Project developer | Create projects, upload feasibility studies, monitor progress, access data room |
| **Investor** | Stakeholder / financier | Read-only access to data room, published deliverables, and intelligence summaries |

Role assignment is currently handled via localStorage-based role selection (no authentication server). Each role maps to a defined set of permissions that control sidebar navigation visibility and API access.

---

## 4. Architecture

### 4.1 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js (React, App Router) | 15.5.20 |
| **Styling** | Tailwind CSS v4 | 4.x |
| **Icons** | Lucide React | 1.18.0 |
| **Backend** | Python FastAPI (async) | 0.115+ |
| **ORM** | SQLAlchemy (async) | 2.x |
| **Database** | PostgreSQL | 16 (Alpine) |
| **Containerization** | Docker Compose | PostgreSQL service |
| **Hosting (Frontend)** | Vercel | Production |
| **Backend Runtime** | Uvicorn | Port 8001 |

### 4.2 System Diagram

```
+------------------+       +------------------+       +------------------+
|                  |       |                  |       |                  |
|   Next.js App    | <---> |   FastAPI        | <---> |   PostgreSQL     |
|   (Vercel)       |  API  |   (Port 8001)    |  SQL  |   (Port 5434)    |
|   Port 3001 dev  |       |                  |       |                  |
+------------------+       +------------------+       +------------------+
                                    |
                           +--------+--------+
                           |                 |
                    +------+------+   +------+------+
                    | Benchmark   |   | Check       |
                    | Engine      |   | Service     |
                    | (library.   |   | (arithmetic,|
                    |  json)      |   |  AACE, BM)  |
                    +-------------+   +-------------+
```

### 4.3 Repository Structure

```
PFS/
  backend/
    app/
      config.py              # Environment config (DATABASE_URL, UPLOAD_DIR)
      database.py            # Async SQLAlchemy engine & session
      main.py                # FastAPI app, CORS, lifespan, router mounts
      seed.py                # Auto-seed demo data on empty DB
      models/                # SQLAlchemy ORM models
        project.py           #   Project, ProjectMember
        deliverable.py       #   Deliverable, Version
        extraction.py        #   Extraction (parsed data points)
        flag.py              #   Flag (review issues)
        audit.py             #   AuditLog
        user.py              #   User
      routers/               # API endpoints
        projects.py          #   /projects, /dashboard, /intelligence, /sla, /audit, /reminders
        deliverables.py      #   /deliverables, /versions, upload, transitions
        benchmarks.py        #   /benchmarks (library, validate, check)
        flags.py             #   /flags (list, resolve)
        extractions.py       #   /extractions (list, add, confirm)
        export.py            #   /export (ZIP package of published deliverables)
        auth.py              #   /auth/roles
      services/
        check_service.py     #   Automated checks (arithmetic, benchmark, AACE)
        benchmark_service.py #   Benchmark library wrapper
        extraction_service.py
      engine/
        benchmark_lib.py     #   Core benchmark logic (cost normalization, band checks)
        library.json         #   Benchmark data (tiered sources)
        schema.json          #   Benchmark schema definition
    uploads/                 # Uploaded deliverable files
  frontend/
    src/
      app/                   # Next.js App Router pages
        page.tsx             #   Role selection landing page
        layout.tsx           #   Root layout
        dashboard/           #   Main dashboard with stats, intelligence, SLA
        projects/            #   Project list and detail views
        deliverables/[id]/   #   Split-pane document review with flags
        benchmarks/          #   Benchmark library table
        dataroom/            #   Published document repository
        reminders/           #   SLA tracking & deadline management
        reviews/             #   Cross-project review status
        dealroom/            #   Document Q&A chatbot
        admin/               #   Admin panel & audit log
        settings/            #   Platform settings
      components/
        client-shell.tsx     #   Sidebar layout, role context, theme toggle
        chatbot.tsx          #   Navigation assistant chatbot
      lib/
        api.ts               #   Typed API client with all endpoints
  docker-compose.yml         # PostgreSQL container definition
  vercel.json                # Vercel deployment config
  run.py                     # Backend dev server launcher
```

---

## 5. Data Model

### 5.1 Core Entities

**Project**
- `id` (UUID), `name`, `description`, `source_id`, `created_at`, `updated_at`
- Has many Deliverables, ProjectMembers

**Deliverable**
- `id` (UUID), `project_id` (FK), `code` (e.g., D-001), `title`, `state` (wip/shared/published), `due_date`
- Has many Versions, Flags

**Version**
- `id` (UUID), `deliverable_id` (FK), `version_number`, `file_path`, `file_name`, `file_type`, `uploaded_by`, `extraction_confirmed`
- Has many Extractions

**Extraction**
- `id` (UUID), `version_id` (FK), `metric`, `value` (float), `unit`, `source_location`, `confirmed`, `confirmed_by`
- Represents a parsed data point from a document (e.g., CAPEX = $72.5M)

**Flag**
- `id` (UUID), `version_id` (FK), `deliverable_id` (FK), `check_type` (universal/benchmark/aace), `check_id`, `severity` (blocking/material/advisory), `title`, `description`, `chain` (JSON evidence), `status` (open/accepted/dismissed), `resolved_by`, `resolution_note`

**AuditLog**
- `id` (UUID), `project_id` (FK), `entity_type`, `entity_id`, `action`, `actor`, `details` (JSON)

### 5.2 Document Lifecycle (State Machine)

```
  WIP  --->  SHARED  --->  PUBLISHED
   ^            |               |
   |            v               v
   +-------- (withdraw)  (revoke back to SHARED)
```

- **WIP**: Draft stage. Developer/consultant uploads versions.
- **SHARED**: Under review. Transitioning to Shared triggers the intelligence layer (automated checks).
- **PUBLISHED**: Approved. Appears in the Data Room for all stakeholders.

**Transition rules:**
- WIP -> Shared: Any authorized user
- Shared -> WIP: Withdraw (return to draft)
- Shared -> Published: Only if no open Blocking flags
- Published -> Shared: Revoke (return to review)

---

## 6. Features

### 6.1 Dashboard
- Summary statistics: project count, pending reviews, open flags, published deliverables
- Intelligence review panel showing per-deliverable pass status
- SLA alerts for overdue/urgent deadlines
- Quick links to data room and document repository

### 6.2 Project Management
- Create and list projects
- View deliverables per project with status indicators
- Project detail page with deliverable cards

### 6.3 Deliverable Review (Split-Pane)
- Left panel: Document viewer (PDF embed or file info), version history, upload new version, submission details
- Right panel: Evaluation summary with flags grouped by category (Financial, Technical, Compliance, General)
- Each flag shows severity, evidence chain, and resolution actions (Accept, Dismiss, Request Clarification)
- State transition buttons in the header (Submit for Review, Publish, Withdraw, Revoke)

### 6.4 Intelligence Layer (Automated Checks)
Triggered automatically when a deliverable transitions from WIP to Shared:

| Check Type | ID | Description |
|-----------|-----|-------------|
| **Universal** | U-2/U-3 | Units consistency and arithmetic recomputation (catches non-currency values summed into currency totals) |
| **Benchmark** | BM-* | Cost normalization against tiered benchmark library (developing market, voltage-matched, circuit-matched) |
| **Benchmark** | BM-terrain | Terrain differentiation advisory (flags flat per-km rates across varied terrain) |
| **AACE** | FR-24 | AACE accuracy class conformance (checks declared estimate class against range bounds) |

Each check produces flags with:
- **Severity**: Blocking (red), Material (yellow), Advisory (blue)
- **Evidence chain**: JSON showing computation steps and source data
- **Blocking flags** prevent publication until resolved

### 6.5 Benchmark Library
- Table of transmission line cost benchmarks from tiered sources
- Fields: metric, central value, range, unit, source, voltage, circuits, price year, confidence level
- Validation endpoint confirms library integrity
- Used by the intelligence layer for automated cost checks

### 6.6 Data Room
- Lists all published deliverables across projects
- View and download functionality per document
- Shows version number, file type, and publication date

### 6.7 SLA Tracking & Reminders
- Monitors deliverable due dates
- Status categories: Overdue (red), Urgent (orange), Warning (yellow), On Track (green), No Deadline (grey)
- Send reminder functionality (creates audit log entry)
- Project selector for multi-project views

### 6.8 Reviews
- Cross-project view of all deliverable review statuses
- Summary cards: Blocking, Material, Advisory, Open, Resolved counts
- Per-project breakdown with deliverable pass status badges
- Click-through to individual deliverable review pages

### 6.9 Deal Room (Document Q&A Chatbot)
- Chat interface for querying project data
- Loads all project extractions, intelligence summaries, and SLA data
- Answers questions about: CAPEX, LCOE, IRR/NPV, capacity, environmental data, project status, SLA deadlines, flags/issues, benchmarks
- Shows source citations for each answer
- Suggested question chips for new users
- Role label displayed on user messages

### 6.10 Admin Panel
- Restricted to AfCEN Lead role
- Stats: Users, Audit Events, Active Roles, System Status
- Recent audit log table with time, action, entity type, actor, and details

### 6.11 Settings
- Current role display
- Notification toggles (platform notifications, email alerts)
- Theme information
- Platform info (API endpoint, database, version, environment)

### 6.12 Navigation Assistant Chatbot
- Floating chatbot widget (bottom-right corner)
- Keyword-matched responses for platform navigation help
- Quick action links to relevant pages
- Role-aware responses (e.g., benchmark access only for AfCEN Lead)

---

## 7. API Endpoints

### Projects & Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a new project |
| GET | `/api/projects/{id}` | Get project details |
| GET | `/api/dashboard/stats` | Dashboard summary statistics |
| GET | `/api/projects/{id}/intelligence` | Intelligence review summary |
| GET | `/api/projects/{id}/sla-status` | SLA tracking for project deliverables |
| GET | `/api/projects/{id}/dataroom` | Published documents for data room |
| GET | `/api/projects/{id}/audit` | Project audit log |
| GET | `/api/audit-log` | Global audit log (all projects) |
| POST | `/api/projects/{id}/export` | Export published deliverables as ZIP |

### Deliverables & Versions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects/{id}/deliverables` | List deliverables for a project |
| POST | `/api/projects/{id}/deliverables` | Create a new deliverable |
| GET | `/api/deliverables/{id}` | Get deliverable details |
| GET | `/api/deliverables/{id}/versions` | List versions for a deliverable |
| POST | `/api/deliverables/{id}/versions` | Upload a new version (multipart form) |
| POST | `/api/deliverables/{id}/transition` | Transition deliverable state |
| GET | `/api/versions/{id}/file` | Download/view a version file |

### Flags
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/deliverables/{id}/flags` | List flags (optional `?version_id=`) |
| PATCH | `/api/flags/{id}` | Resolve a flag (accept/dismiss/clarification) |

### Extractions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/versions/{id}/extractions` | List extracted data points |
| POST | `/api/versions/{id}/extractions` | Add a new extraction |
| POST | `/api/versions/{id}/extractions/confirm` | Confirm extractions |

### Benchmarks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/benchmarks/list` | List benchmark entries (optional `?metric=`) |
| GET | `/api/benchmarks/validate` | Validate benchmark library integrity |
| GET | `/api/benchmarks/sources` | List benchmark data sources |
| POST | `/api/benchmarks/check` | Check a value against benchmarks |

### Auth & Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/roles` | List available roles and permissions |
| GET | `/api/auth/roles/{key}` | Get role details |
| GET | `/api/health` | Health check |
| POST | `/api/reminders/send` | Send SLA reminder |

---

## 8. UI/UX Design

- **Theme**: Glass morphism dark theme (default) with light mode toggle
- **CSS classes**: `.glass`, `.glass-card`, `.glass-elevated`, `.glass-subtle`
- **Primary color**: `#ff8c00` (AfCEN orange)
- **Severity colors**: Blocking `#ef4444`, Material `#fbbf24`, Advisory `#38bdf8`
- **Status colors**: Published `#22c55e`, Under Review `#ff8c00`, WIP `#64748b`
- **Sidebar**: Collapsible (220px expanded, 60px collapsed), state persisted in localStorage
- **Typography**: Inter font, tabular-nums for metrics, monospace for codes/IDs
- **Responsive**: CSS Grid and Flexbox layouts, mobile-friendly sidebar

---

## 9. Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `sqlite+aiosqlite:///./cde.db` |
| `ANTHROPIC_API_KEY` | API key for AI features (future) | Empty |
| `UPLOAD_DIR` | File upload storage directory | `./backend/uploads` |
| `NEXT_PUBLIC_API_URL` | Backend API URL for frontend | `http://localhost:8001/api` |

---

## 10. Current Limitations & Future Work

### Current Limitations
- **No authentication**: Role selection is client-side via localStorage. No login, password, or session management.
- **No real-time updates**: Clients poll on page load; no WebSocket or SSE for live flag/status updates.
- **Single-region deployment**: Backend must run separately from Vercel-hosted frontend.
- **Extraction is manual**: Data points are entered manually or via seed data. No OCR/PDF parsing yet.
- **Deal Room chatbot**: Uses keyword matching, not LLM-based. Limited to predefined question patterns.

### Planned Enhancements
- SSO/OAuth authentication with proper user management
- Real-time collaboration via WebSockets
- AI-powered document extraction (PDF/Excel parsing with LLM)
- LLM-based Deal Room chatbot with Anthropic Claude integration
- Multi-region backend deployment (Railway, Render, or AWS)
- Email notification delivery (currently creates audit entries only)
- Advanced benchmark analytics and cost trend visualization
- Multi-project portfolio dashboards

---

## 11. Security Considerations

- CORS is currently set to allow all origins (`*`) for development. Must be restricted for production.
- File uploads are stored on local disk with UUID-based names (no path traversal risk).
- No sensitive data in URL parameters.
- All API responses use standard JSON serialization with no sensitive field exposure.
- TypeScript `ignoreBuildErrors: true` is set in Next.js config for development velocity; should be disabled for production hardening.
