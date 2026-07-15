from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["flags"])


@router.get("/deliverables/{deliverable_id}/flags")
async def list_flags(
    deliverable_id: str,
    version_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(models.Flag).where(models.Flag.deliverable_id == deliverable_id)
    if version_id:
        q = q.where(models.Flag.version_id == version_id)
    q = q.order_by(models.Flag.created_at)
    result = await db.execute(q)
    return [schemas.FlagResponse.model_validate(f) for f in result.scalars().all()]


@router.patch("/flags/{flag_id}")
async def resolve_flag(flag_id: str, data: schemas.FlagResolve, db: AsyncSession = Depends(get_db)):
    flag = await db.get(models.Flag, flag_id)
    if not flag:
        raise HTTPException(404, "Flag not found")
    if data.status not in ("accepted", "dismissed", "clarification_requested"):
        raise HTTPException(422, "Invalid status")

    flag.status = data.status
    flag.resolved_by = data.resolved_by or "admin"
    flag.resolution_note = data.resolution_note
    flag.resolved_at = datetime.now(timezone.utc)

    deliverable = await db.get(models.Deliverable, flag.deliverable_id)
    audit = models.AuditLog(
        project_id=deliverable.project_id,
        entity_type="flag",
        entity_id=flag.id,
        action=f"flag_{data.status}",
        actor=flag.resolved_by,
        details={"flag_title": flag.title, "note": data.resolution_note},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(flag)
    return schemas.FlagResponse.model_validate(flag)
