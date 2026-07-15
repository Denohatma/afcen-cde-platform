from __future__ import annotations
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from ..database import Base


class Flag(Base):
    __tablename__ = "flags"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    version_id: Mapped[str] = mapped_column(ForeignKey("versions.id"))
    extraction_id: Mapped[Optional[str]] = mapped_column(ForeignKey("extractions.id"), nullable=True)
    deliverable_id: Mapped[str] = mapped_column(ForeignKey("deliverables.id"))
    check_type: Mapped[str] = mapped_column(String)
    check_id: Mapped[str] = mapped_column(String, default="")
    severity: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text, default="")
    chain: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default="open")
    resolved_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    deliverable: Mapped["Deliverable"] = relationship(back_populates="flags")


from .deliverable import Deliverable  # noqa: E402
