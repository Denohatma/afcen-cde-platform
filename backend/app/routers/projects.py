from __future__ import annotations
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from .. import models, schemas


class ReminderRequest(BaseModel):
    deliverable_id: str
    recipient_email: str
    message: str

router = APIRouter(tags=["projects"])


@router.get("/projects")
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Project).order_by(models.Project.created_at.desc()))
    projects = result.scalars().all()
    return [schemas.ProjectResponse.model_validate(p) for p in projects]


@router.post("/projects", status_code=201)
async def create_project(data: schemas.ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = models.Project(**data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return schemas.ProjectResponse.model_validate(project)


@router.get("/dashboard/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    projects = (await db.execute(select(func.count()).select_from(models.Project))).scalar() or 0

    shared = (await db.execute(
        select(func.count()).select_from(models.Deliverable)
        .where(models.Deliverable.state == "shared")
    )).scalar() or 0

    open_flags = (await db.execute(
        select(func.count()).select_from(models.Flag)
        .where(models.Flag.status == "open")
    )).scalar() or 0

    published = (await db.execute(
        select(func.count()).select_from(models.Deliverable)
        .where(models.Deliverable.state == "published")
    )).scalar() or 0

    return {
        "projects": projects,
        "pending_review": shared,
        "open_flags": open_flags,
        "published": published,
    }


@router.get("/projects/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    return schemas.ProjectResponse.model_validate(project)


@router.get("/projects/{project_id}/dataroom")
async def get_dataroom(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    result = await db.execute(
        select(models.Deliverable)
        .where(models.Deliverable.project_id == project_id)
        .where(models.Deliverable.state == "published")
        .order_by(models.Deliverable.code)
    )
    published = result.scalars().all()

    documents = []
    for d in published:
        vers_result = await db.execute(
            select(models.Version)
            .where(models.Version.deliverable_id == d.id)
            .order_by(models.Version.version_number.desc())
            .limit(1)
        )
        latest = vers_result.scalar_one_or_none()
        documents.append({
            "deliverable_id": d.id,
            "code": d.code,
            "title": d.title,
            "state": d.state,
            "version": latest.version_number if latest else 0,
            "file_name": latest.file_name if latest else None,
            "file_type": latest.file_type if latest else None,
            "version_id": latest.id if latest else None,
            "published_at": d.updated_at.isoformat() if d.updated_at else None,
        })

    return {
        "project_id": project_id,
        "project_name": project.name,
        "documents": documents,
        "total": len(documents),
    }


@router.get("/projects/{project_id}/intelligence")
async def get_intelligence_summary(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    deliverables_result = await db.execute(
        select(models.Deliverable)
        .where(models.Deliverable.project_id == project_id)
        .order_by(models.Deliverable.code)
    )
    deliverables = deliverables_result.scalars().all()

    stages = []
    total_flags = {"blocking": 0, "material": 0, "advisory": 0}
    total_resolved = 0
    total_open = 0

    for d in deliverables:
        flags_result = await db.execute(
            select(models.Flag).where(models.Flag.deliverable_id == d.id)
        )
        d_flags = flags_result.scalars().all()

        open_flags = [f for f in d_flags if f.status == "open"]
        resolved_flags = [f for f in d_flags if f.status != "open"]
        blocking = len([f for f in open_flags if f.severity == "blocking"])
        material = len([f for f in open_flags if f.severity == "material"])
        advisory = len([f for f in open_flags if f.severity == "advisory"])

        total_flags["blocking"] += blocking
        total_flags["material"] += material
        total_flags["advisory"] += advisory
        total_open += len(open_flags)
        total_resolved += len(resolved_flags)

        if d.state == "published":
            pass_status = "passed"
        elif blocking > 0:
            pass_status = "blocked"
        elif material > 0:
            pass_status = "flagged"
        elif d.state == "shared" and len(open_flags) == 0:
            pass_status = "clear"
        elif d.state == "shared":
            pass_status = "review"
        else:
            pass_status = "pending"

        stages.append({
            "deliverable_id": d.id,
            "code": d.code,
            "title": d.title,
            "state": d.state,
            "pass_status": pass_status,
            "flags": {"blocking": blocking, "material": material, "advisory": advisory},
            "open_count": len(open_flags),
            "resolved_count": len(resolved_flags),
            "due_date": d.due_date.isoformat() if d.due_date else None,
        })

    all_clear = total_flags["blocking"] == 0 and total_flags["material"] == 0
    overall = "pass" if all_clear and all(s["state"] in ("published", "shared") for s in stages) else "review_required"

    return {
        "project_id": project_id,
        "project_name": project.name,
        "overall_status": overall,
        "stages": stages,
        "summary": {
            "total_deliverables": len(deliverables),
            "published": len([d for d in deliverables if d.state == "published"]),
            "under_review": len([d for d in deliverables if d.state == "shared"]),
            "in_progress": len([d for d in deliverables if d.state == "wip"]),
            "total_flags": total_flags,
            "total_open": total_open,
            "total_resolved": total_resolved,
        },
    }


@router.get("/projects/{project_id}/audit")
async def get_audit_log(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.AuditLog)
        .where(models.AuditLog.project_id == project_id)
        .order_by(models.AuditLog.created_at.desc())
        .limit(50)
    )
    logs = result.scalars().all()
    return [{
        "id": l.id,
        "entity_type": l.entity_type,
        "entity_id": l.entity_id,
        "action": l.action,
        "actor": l.actor,
        "details": l.details,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in logs]


@router.get("/audit-log")
async def get_global_audit_log(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.AuditLog)
        .order_by(models.AuditLog.created_at.desc())
        .limit(50)
    )
    logs = result.scalars().all()
    return [{
        "id": l.id,
        "entity_type": l.entity_type,
        "entity_id": l.entity_id,
        "action": l.action,
        "actor": l.actor,
        "details": l.details,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in logs]


@router.get("/projects/{project_id}/sla-status")
async def get_sla_status(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    result = await db.execute(
        select(models.Deliverable)
        .where(models.Deliverable.project_id == project_id)
        .order_by(models.Deliverable.code)
    )
    deliverables = result.scalars().all()

    today = date.today()
    items = []
    for d in deliverables:
        if d.due_date:
            days_remaining = (d.due_date - today).days
            if days_remaining < 0:
                sla_status = "overdue"
            elif days_remaining <= 3:
                sla_status = "urgent"
            elif days_remaining <= 7:
                sla_status = "warning"
            else:
                sla_status = "on_track"
        else:
            days_remaining = None
            sla_status = "no_deadline"

        needs_reminder = sla_status in ("overdue", "urgent")

        items.append({
            "deliverable_id": d.id,
            "code": d.code,
            "title": d.title,
            "state": d.state,
            "due_date": d.due_date.isoformat() if d.due_date else None,
            "days_remaining": days_remaining,
            "sla_status": sla_status,
            "needs_reminder": needs_reminder,
        })

    return {
        "project_id": project_id,
        "project_name": project.name,
        "checked_at": today.isoformat(),
        "deliverables": items,
        "summary": {
            "total": len(items),
            "overdue": len([i for i in items if i["sla_status"] == "overdue"]),
            "urgent": len([i for i in items if i["sla_status"] == "urgent"]),
            "warning": len([i for i in items if i["sla_status"] == "warning"]),
            "on_track": len([i for i in items if i["sla_status"] == "on_track"]),
            "no_deadline": len([i for i in items if i["sla_status"] == "no_deadline"]),
        },
    }


@router.post("/reminders/send")
async def send_reminder(data: ReminderRequest, db: AsyncSession = Depends(get_db)):
    deliverable = await db.get(models.Deliverable, data.deliverable_id)
    if not deliverable:
        raise HTTPException(404, "Deliverable not found")

    audit_entry = models.AuditLog(
        project_id=deliverable.project_id,
        entity_type="deliverable",
        entity_id=data.deliverable_id,
        action="reminder_sent",
        actor="system",
        details={
            "recipient_email": data.recipient_email,
            "message": data.message,
        },
    )
    db.add(audit_entry)
    await db.commit()

    return {
        "status": "sent",
        "deliverable_id": data.deliverable_id,
        "recipient": data.recipient_email,
    }
