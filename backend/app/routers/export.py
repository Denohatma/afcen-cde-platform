from __future__ import annotations
import io
import json
import zipfile
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from .. import models

router = APIRouter(tags=["export"])


@router.post("/projects/{project_id}/export")
async def export_published(project_id: str, db: AsyncSession = Depends(get_db)):
    project = await db.get(models.Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")

    deliverables = await db.execute(
        select(models.Deliverable)
        .where(models.Deliverable.project_id == project_id)
        .where(models.Deliverable.state == "published")
    )
    published = deliverables.scalars().all()
    if not published:
        raise HTTPException(404, "No Published deliverables to export")

    buf = io.BytesIO()
    manifest_entries = []

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for d in published:
            versions = await db.execute(
                select(models.Version)
                .where(models.Version.deliverable_id == d.id)
                .order_by(models.Version.version_number.desc())
                .limit(1)
            )
            latest = versions.scalar_one_or_none()
            if not latest:
                continue

            from pathlib import Path
            src = Path(latest.file_path)
            if src.exists():
                arc_name = f"{d.code}_{latest.file_name}"
                zf.write(src, arc_name)
                manifest_entries.append({
                    "deliverable_code": d.code,
                    "title": d.title,
                    "file": arc_name,
                    "version": latest.version_number,
                    "approved_at": d.updated_at.isoformat() if d.updated_at else None,
                })

        flags_result = await db.execute(
            select(models.Flag)
            .join(models.Deliverable)
            .where(models.Deliverable.project_id == project_id)
        )
        all_flags = flags_result.scalars().all()
        flag_rows = []
        for f in all_flags:
            flag_rows.append({
                "flag_id": f.id,
                "check_type": f.check_type,
                "severity": f.severity,
                "title": f.title,
                "status": f.status,
                "resolved_by": f.resolved_by,
            })

        zf.writestr("manifest.json", json.dumps({
            "project": project.name,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "deliverables": manifest_entries,
        }, indent=2))

        zf.writestr("flag_summary.json", json.dumps(flag_rows, indent=2))

    buf.seek(0)
    filename = f"{project.name.replace(' ', '_')}_published_package.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
