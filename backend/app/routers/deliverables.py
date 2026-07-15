import uuid
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from .. import models, schemas
from ..config import UPLOAD_DIR

router = APIRouter(tags=["deliverables"])


@router.get("/projects/{project_id}/deliverables")
async def list_deliverables(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Deliverable)
        .where(models.Deliverable.project_id == project_id)
        .order_by(models.Deliverable.code)
    )
    return [schemas.DeliverableResponse.model_validate(d) for d in result.scalars().all()]


@router.post("/projects/{project_id}/deliverables", status_code=201)
async def create_deliverable(
    project_id: str, data: schemas.DeliverableCreate, db: AsyncSession = Depends(get_db)
):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    deliverable = models.Deliverable(project_id=project_id, **data.model_dump())
    db.add(deliverable)
    await db.commit()
    await db.refresh(deliverable)
    return schemas.DeliverableResponse.model_validate(deliverable)


@router.get("/deliverables/{deliverable_id}")
async def get_deliverable(deliverable_id: str, db: AsyncSession = Depends(get_db)):
    deliverable = await db.get(models.Deliverable, deliverable_id)
    if not deliverable:
        raise HTTPException(404, "Deliverable not found")
    return schemas.DeliverableResponse.model_validate(deliverable)


@router.get("/deliverables/{deliverable_id}/versions")
async def list_versions(deliverable_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Version)
        .where(models.Version.deliverable_id == deliverable_id)
        .order_by(models.Version.version_number.desc())
    )
    return [schemas.VersionResponse.model_validate(v) for v in result.scalars().all()]


@router.get("/versions/{version_id}/file")
async def serve_version_file(version_id: str, db: AsyncSession = Depends(get_db)):
    version = await db.get(models.Version, version_id)
    if not version:
        raise HTTPException(404, "Version not found")
    file_path = Path(version.file_path)
    if not file_path.exists():
        raise HTTPException(404, "File not found on disk")
    media_type = version.file_type or "application/octet-stream"
    if version.file_name.endswith(".pdf"):
        media_type = "application/pdf"
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=version.file_name,
    )


@router.post("/deliverables/{deliverable_id}/versions", status_code=201)
async def upload_version(
    deliverable_id: str,
    file: UploadFile = File(...),
    uploaded_by: str = Form("admin"),
    db: AsyncSession = Depends(get_db),
):
    deliverable = await db.get(models.Deliverable, deliverable_id)
    if not deliverable:
        raise HTTPException(404, "Deliverable not found")

    result = await db.execute(
        select(models.Version)
        .where(models.Version.deliverable_id == deliverable_id)
        .order_by(models.Version.version_number.desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    next_num = (last.version_number + 1) if last else 1

    file_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else ""
    stored_name = f"{file_id}.{ext}" if ext else file_id
    dest = UPLOAD_DIR / stored_name
    content = await file.read()
    dest.write_bytes(content)

    version = models.Version(
        deliverable_id=deliverable_id,
        version_number=next_num,
        file_path=str(dest),
        file_name=file.filename,
        file_type=file.content_type or "",
        uploaded_by=uploaded_by,
    )
    db.add(version)
    await db.flush()

    audit = models.AuditLog(
        project_id=deliverable.project_id,
        entity_type="version",
        entity_id=version.id,
        action="uploaded",
        actor=uploaded_by,
        details={"file_name": file.filename, "version": next_num},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(version)
    return schemas.VersionResponse.model_validate(version)


VALID_TRANSITIONS = {
    ("wip", "shared"),
    ("shared", "wip"),
    ("shared", "published"),
    ("published", "shared"),
}


@router.post("/deliverables/{deliverable_id}/transition")
async def transition_deliverable(
    deliverable_id: str,
    data: schemas.TransitionRequest,
    db: AsyncSession = Depends(get_db),
):
    deliverable = await db.get(models.Deliverable, deliverable_id)
    if not deliverable:
        raise HTTPException(404, "Deliverable not found")

    pair = (deliverable.state, data.to_state)
    if pair not in VALID_TRANSITIONS:
        raise HTTPException(422, f"Cannot transition from '{deliverable.state}' to '{data.to_state}'")

    if data.to_state == "published":
        open_blocking = await db.execute(
            select(models.Flag)
            .where(models.Flag.deliverable_id == deliverable_id)
            .where(models.Flag.severity == "blocking")
            .where(models.Flag.status == "open")
        )
        blockers = open_blocking.scalars().all()
        if blockers:
            raise HTTPException(
                422,
                f"Cannot publish: {len(blockers)} unresolved Blocking flag(s)",
            )

    from_state = deliverable.state
    deliverable.state = data.to_state
    deliverable.updated_at = datetime.now(timezone.utc)

    audit = models.AuditLog(
        project_id=deliverable.project_id,
        entity_type="deliverable",
        entity_id=deliverable.id,
        action=f"transition_{from_state}_to_{data.to_state}",
        actor=data.actor or "admin",
        details={"from": from_state, "to": data.to_state, "reason": data.reason},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(deliverable)

    if data.to_state == "shared" and from_state == "wip":
        from ..services.check_service import run_checks_for_deliverable
        await run_checks_for_deliverable(deliverable_id, db)

    return schemas.DeliverableResponse.model_validate(deliverable)
