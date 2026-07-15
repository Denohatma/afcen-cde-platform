from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from .. import models, schemas

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
