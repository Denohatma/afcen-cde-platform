from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class FlagResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version_id: str
    extraction_id: Optional[str] = None
    deliverable_id: str
    check_type: str
    check_id: str
    severity: str
    title: str
    description: str
    chain: Optional[dict | list] = None
    status: str
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime


class FlagResolve(BaseModel):
    status: str
    resolved_by: str = "admin"
    resolution_note: str = ""
