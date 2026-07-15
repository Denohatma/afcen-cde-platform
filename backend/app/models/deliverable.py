from __future__ import annotations
import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional
from ..database import Base


class Deliverable(Base):
    __tablename__ = "deliverables"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"))
    code: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String, default="wip")
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project: Mapped["Project"] = relationship(back_populates="deliverables")
    versions: Mapped[list["Version"]] = relationship(back_populates="deliverable", lazy="selectin")
    flags: Mapped[list["Flag"]] = relationship(back_populates="deliverable", lazy="selectin")


class Version(Base):
    __tablename__ = "versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deliverable_id: Mapped[str] = mapped_column(ForeignKey("deliverables.id"))
    version_number: Mapped[int] = mapped_column(default=1)
    file_path: Mapped[str] = mapped_column(String)
    file_name: Mapped[str] = mapped_column(String)
    file_type: Mapped[str] = mapped_column(String, default="")
    uploaded_by: Mapped[str] = mapped_column(String, default="admin")
    extraction_confirmed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    deliverable: Mapped["Deliverable"] = relationship(back_populates="versions")
    extractions: Mapped[list["Extraction"]] = relationship(back_populates="version", lazy="selectin")


from .project import Project  # noqa: E402
from .extraction import Extraction  # noqa: E402
from .flag import Flag  # noqa: E402
