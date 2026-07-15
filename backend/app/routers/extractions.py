from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["extractions"])


@router.get("/versions/{version_id}/extractions")
async def list_extractions(version_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Extraction)
        .where(models.Extraction.version_id == version_id)
        .order_by(models.Extraction.created_at)
    )
    return [schemas.ExtractionResponse.model_validate(e) for e in result.scalars().all()]


@router.post("/versions/{version_id}/extractions", status_code=201)
async def add_extraction(
    version_id: str, data: schemas.ExtractionCreate, db: AsyncSession = Depends(get_db)
):
    version = await db.get(models.Version, version_id)
    if not version:
        raise HTTPException(404, "Version not found")
    extraction = models.Extraction(version_id=version_id, **data.model_dump())
    db.add(extraction)
    await db.commit()
    await db.refresh(extraction)
    return schemas.ExtractionResponse.model_validate(extraction)


@router.post("/versions/{version_id}/extractions/confirm")
async def confirm_extractions(version_id: str, data: schemas.ConfirmExtractions, db: AsyncSession = Depends(get_db)):
    version = await db.get(models.Version, version_id)
    if not version:
        raise HTTPException(404, "Version not found")

    result = await db.execute(
        select(models.Extraction).where(
            models.Extraction.version_id == version_id,
            models.Extraction.id.in_(data.extraction_ids),
        )
    )
    for ext in result.scalars().all():
        ext.confirmed = True
        ext.confirmed_by = data.confirmed_by or "admin"

    version.extraction_confirmed = True
    await db.commit()
    return {"confirmed": len(data.extraction_ids)}
