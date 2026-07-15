from __future__ import annotations
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from typing import Optional


class DeliverableCreate(BaseModel):
    code: str
    title: str
    due_date: Optional[date] = None


class DeliverableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    code: str
    title: str
    state: str
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime


class VersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    deliverable_id: str
    version_number: int
    file_name: str
    file_type: str
    uploaded_by: str
    extraction_confirmed: bool
    created_at: datetime


class TransitionRequest(BaseModel):
    to_state: str
    actor: str = "admin"
    reason: str = ""
