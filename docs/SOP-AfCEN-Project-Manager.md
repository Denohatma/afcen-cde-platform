# AfCEN Project Manager - Standard Operating Procedure

**Version:** 1.0
**Date:** 20 July 2026
**Author:** AfCEN Development Team
**Audience:** IT Team, DevOps, Platform Administrators

---

## 1. Prerequisites

Ensure the following are installed on the development/deployment machine:

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| Node.js | 20.x or 24.x | Frontend build and dev server |
| Python | 3.11+ | Backend runtime |
| Docker & Docker Compose | Latest stable | PostgreSQL database container |
| Git | 2.x | Source control |
| pip | Latest | Python package management |
| npm | Bundled with Node.js | Frontend package management |

---

## 2. Initial Setup

### 2.1 Clone the Repository

```bash
git clone https://github.com/Denohatma/afcen-cde-platform.git
cd afcen-cde-platform
```

### 2.2 Start the Database

The platform uses PostgreSQL 16 via Docker Compose.

```bash
docker compose up -d
```

This starts a PostgreSQL container with:
- **Host:** localhost
- **Port:** 5434 (mapped from container's 5432)
- **Database:** cde
- **Username:** cde
- **Password:** cde_dev_2026

Verify the database is running:

```bash
docker compose ps
# Should show cde-db running and healthy

psql -h localhost -p 5434 -U cde -d cde -c "SELECT 1;"
# Should return 1
```

### 2.3 Set Up the Backend

```bash
# Create a Python virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install fastapi uvicorn sqlalchemy asyncpg greenlet python-dotenv aiosqlite

# Set the database URL
export DATABASE_URL="postgresql://cde:cde_dev_2026@localhost:5434/cde"
```

Create a `.env` file in the project root (optional, loaded automatically):

```env
DATABASE_URL=postgresql://cde:cde_dev_2026@localhost:5434/cde
UPLOAD_DIR=./backend/uploads
```

### 2.4 Set Up the Frontend

```bash
cd frontend
npm install
cd ..
```

---

## 3. Running the Platform

### 3.1 Start the Backend

From the project root:

```bash
export DATABASE_URL="postgresql://cde:cde_dev_2026@localhost:5434/cde"
python run.py
```

The backend starts on **http://localhost:8001**. On first run, it will:
1. Create all database tables automatically
2. Seed demo data (2 projects with deliverables, versions, flags, and extractions)

Verify: `curl http://localhost:8001/api/health`
Expected: `{"status":"ok","service":"AfCEN CDE"}`

### 3.2 Start the Frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

The frontend starts on **http://localhost:3001**.

### 3.3 Access the Platform

1. Open **http://localhost:3001** in a browser
2. Select a role (AfCEN Lead recommended for full access)
3. The dashboard loads with project data from the backend

---

## 4. Platform Operations

### 4.1 User Workflow

**Standard feasibility study review process:**

1. **Developer/Consultant** creates a project and uploads deliverable documents
2. **Developer/Consultant** transitions a deliverable from WIP to Shared
3. The **Intelligence Layer** automatically runs checks:
   - Arithmetic verification (unit consistency, sum recomputation)
   - Benchmark validation (cost normalization against industry data)
   - AACE accuracy class conformance check
4. **AfCEN Lead** reviews the flags on the deliverable review page:
   - **Blocking** flags (red): Must be resolved before publication
   - **Material** flags (yellow): Should be addressed but don't block
   - **Advisory** flags (blue): Informational, for awareness
5. AfCEN Lead resolves flags by Accepting, Dismissing, or Requesting Clarification
6. Once all blocking flags are resolved, AfCEN Lead **Publishes** the deliverable
7. Published deliverables appear in the **Data Room** for all stakeholders

### 4.2 Role Switching

Roles are selected from the bottom of the sidebar. Click the role name to open the role selector dropdown. To sign out, click "Sign Out" which returns to the role selection screen.

### 4.3 Theme Toggle

Click the sun/moon icon at the bottom of the sidebar to switch between dark and light mode. The preference is saved in the browser.

### 4.4 Sidebar Collapse

Click the collapse button at the bottom of the sidebar to toggle between expanded (220px) and collapsed (60px icon-only) modes. The preference is saved in the browser.

---

## 5. Database Management

### 5.1 Connection Details

```
Host:     localhost
Port:     5434
Database: cde
User:     cde
Password: cde_dev_2026
```

Connect via psql:
```bash
psql -h localhost -p 5434 -U cde -d cde
```

### 5.2 Database Tables

| Table | Description |
|-------|-------------|
| `projects` | Project records |
| `project_members` | Project-user membership |
| `deliverables` | Deliverable documents |
| `versions` | File versions per deliverable |
| `extractions` | Parsed data points from documents |
| `flags` | Review flags (automated and manual) |
| `audit_log` | All platform actions |
| `users` | User accounts (placeholder) |

### 5.3 Reset the Database

To start fresh with seed data:

```bash
# Stop the backend
# Drop and recreate the database
docker compose down -v
docker compose up -d

# Restart the backend - tables and seed data will be recreated
python run.py
```

### 5.4 Backup the Database

```bash
# Create a backup
docker exec cde-db pg_dump -U cde cde > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20260720.sql | docker exec -i cde-db psql -U cde cde
```

### 5.5 View Data Volumes

PostgreSQL data is persisted in a Docker volume called `cde_data`:

```bash
docker volume inspect afcen-cde-platform_cde_data
```

---

## 6. Deployment

### 6.1 Frontend (Vercel)

The frontend is deployed on Vercel.

**Current production URL:** https://frontend-lilac-eta-98.vercel.app

**To redeploy:**

```bash
cd frontend
npx vercel --prod
```

**To set the backend API URL for production:**

In the Vercel dashboard or via CLI:
```bash
npx vercel env add NEXT_PUBLIC_API_URL production
# Enter the backend URL, e.g.: https://your-backend-domain.com/api
```

### 6.2 Backend Deployment Options

The backend is not yet deployed to a cloud service. Recommended options:

| Service | Pros | Setup |
|---------|------|-------|
| **Railway** | Simple, supports Docker, free tier | Connect GitHub repo, set `DATABASE_URL` env var |
| **Render** | Free PostgreSQL (90 days), auto-deploy | Create Web Service + PostgreSQL, set env vars |
| **AWS (EC2 + RDS)** | Full control, production-grade | More setup, use with Nginx reverse proxy |
| **Fly.io** | Edge deployment, PostgreSQL addon | `fly launch`, `fly postgres create` |

**Required environment variables for any backend deployment:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/cde
UPLOAD_DIR=/app/uploads
```

### 6.3 Full Production Deployment Checklist

- [ ] Deploy PostgreSQL to a managed service (RDS, Neon, Supabase, or Railway)
- [ ] Deploy FastAPI backend to a cloud service with the `DATABASE_URL` set
- [ ] Update Vercel's `NEXT_PUBLIC_API_URL` to point to the deployed backend
- [ ] Restrict CORS in `backend/app/main.py` to the Vercel frontend domain only
- [ ] Set up SSL/TLS for the backend API
- [ ] Configure file storage (S3 or equivalent) instead of local disk for uploads
- [ ] Implement proper authentication (OAuth2/SSO)
- [ ] Set `typescript.ignoreBuildErrors: false` in `next.config.ts`
- [ ] Set up database backups (automated daily)
- [ ] Configure monitoring and alerting

---

## 7. Monitoring & Troubleshooting

### 7.1 Health Check

```bash
curl http://localhost:8001/api/health
# Expected: {"status":"ok","service":"AfCEN CDE"}
```

### 7.2 Common Issues

**Issue: Frontend shows "No projects" or data doesn't load**
- Verify the backend is running: `curl http://localhost:8001/api/health`
- Verify the database is running: `docker compose ps`
- Check browser console for CORS or network errors
- Ensure `NEXT_PUBLIC_API_URL` matches the backend URL

**Issue: Backend fails to start with "connection refused"**
- Ensure Docker is running: `docker compose ps`
- Verify the database port: `psql -h localhost -p 5434 -U cde -d cde -c "SELECT 1;"`
- Check `DATABASE_URL` environment variable is set correctly

**Issue: "Cannot publish with open blocking flags"**
- This is expected behavior. Resolve all Blocking flags before publishing.
- On the deliverable review page, click Accept or Dismiss on each blocking flag.

**Issue: Intelligence checks don't run when transitioning to Shared**
- Checks only run on WIP -> Shared transitions (not Shared -> WIP or other)
- Check the backend console for errors during the check run
- Verify the benchmark library loaded: `curl http://localhost:8001/api/benchmarks/validate`

**Issue: Vercel deployment fails with "Vulnerable version of Next.js"**
- Update Next.js: `cd frontend && npm install next@15.5.20 eslint-config-next@15.5.20`
- Commit and redeploy

### 7.3 Logs

**Backend logs:** Visible in the terminal where `python run.py` is running. Uvicorn logs all requests.

**Database logs:**
```bash
docker compose logs db
docker compose logs -f db  # Follow live
```

**Frontend build logs:** Visible in the Vercel dashboard under the deployment's "Building" tab.

### 7.4 Audit Trail

All significant actions are logged in the `audit_log` table:
- Document uploads
- State transitions (WIP -> Shared -> Published)
- Check runs (automated flag creation)
- Flag resolutions
- Reminder sends

View via the Admin panel (AfCEN Lead role) or query directly:
```sql
SELECT action, entity_type, actor, created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 20;
```

---

## 8. File Upload Storage

Uploaded files are stored in `backend/uploads/` with UUID-based filenames. Each file maps to a `versions` table record.

**Current storage:** Local filesystem
**Recommended production storage:** AWS S3, Google Cloud Storage, or Azure Blob Storage

To change the upload directory:
```bash
export UPLOAD_DIR=/path/to/uploads
```

---

## 9. Benchmark Library Management

The benchmark library is stored in `backend/app/engine/library.json` and loaded at startup.

**To validate the library:**
```bash
curl http://localhost:8001/api/benchmarks/validate
# Returns: {"status":"ok","benchmarks":N,"sources":N,...}
```

**To view entries:**
```bash
curl http://localhost:8001/api/benchmarks/list
```

**To update the library:**
1. Edit `backend/app/engine/library.json`
2. Restart the backend (the library reloads on startup)

---

## 10. API Testing

### Quick API Test Commands

```bash
# List projects
curl http://localhost:8001/api/projects | python3 -m json.tool

# Get dashboard stats
curl http://localhost:8001/api/dashboard/stats

# Get intelligence summary for a project
curl http://localhost:8001/api/projects/{project_id}/intelligence | python3 -m json.tool

# Get SLA status
curl http://localhost:8001/api/projects/{project_id}/sla-status | python3 -m json.tool

# List deliverables
curl http://localhost:8001/api/projects/{project_id}/deliverables | python3 -m json.tool

# List flags for a deliverable
curl http://localhost:8001/api/deliverables/{deliverable_id}/flags | python3 -m json.tool

# Check health
curl http://localhost:8001/api/health
```

---

## 11. Development Workflow

### 11.1 Making Changes

1. Start the database: `docker compose up -d`
2. Start the backend: `DATABASE_URL="postgresql://cde:cde_dev_2026@localhost:5434/cde" python run.py`
3. Start the frontend: `cd frontend && npm run dev`
4. Make code changes - both servers hot-reload automatically
5. Test changes in the browser at http://localhost:3001

### 11.2 Git Workflow

```bash
# Check status
git status

# Stage and commit
git add <files>
git commit -m "Description of changes"

# Push to GitHub
git push origin main
```

### 11.3 Frontend Build Check

Before deploying, verify the build succeeds locally:

```bash
cd frontend
npx next build
```

All routes should compile without errors.

---

## 12. Contact & Support

- **Repository:** https://github.com/Denohatma/afcen-cde-platform
- **Live Frontend:** https://frontend-lilac-eta-98.vercel.app
- **Backend API (local):** http://localhost:8001/api
- **Health Check:** http://localhost:8001/api/health
