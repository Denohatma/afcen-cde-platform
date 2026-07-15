from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .. import models


async def extract_from_pdf(version_id: str, file_path: str, db: AsyncSession) -> list[dict]:
    return []


async def get_extractions(version_id: str, db: AsyncSession):
    result = await db.execute(
        select(models.Extraction).where(models.Extraction.version_id == version_id)
    )
    return result.scalars().all()
