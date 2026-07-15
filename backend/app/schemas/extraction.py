from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class ExtractionCreate(BaseModel):
    metric: str
    value: float
    unit: str = ""
    source_location: str = ""
    confirmed: bool = False


class ExtractionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version_id: str
    metric: str
    value: float
    unit: str
    source_location: str
    confirmed: bool
    confirmed_by: Optional[str] = None
    created_at: datetime


class ConfirmExtractions(BaseModel):
    extraction_ids: list[str]
    confirmed_by: str = "admin"
