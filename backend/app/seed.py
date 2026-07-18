from __future__ import annotations
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


async def seed_if_empty(session: AsyncSession):
    from .models import Project, Deliverable, User

    result = await session.execute(select(Project).limit(1))
    if result.scalar_one_or_none():
        return

    users = [
        User(email="joseph@afcen.org", name="Joseph Ochieng", role="afcen_lead"),
        User(email="daniel@consultant.com", name="Daniel Okello", role="consultant"),
        User(email="sarah@developer.ug", name="Sarah Namukasa", role="developer"),
        User(email="investor@fundco.com", name="James Mitchell", role="investor"),
    ]
    for u in users:
        session.add(u)

    project = Project(
        name="Bulambuli-Moroto 132 kV IPT",
        description="Pre-feasibility study review for the 132 kV interconnector transmission project between Bulambuli and Moroto substations, Eastern Uganda.",
        source_id="bulambuli_moroto_pfs_2026",
    )
    session.add(project)
    await session.flush()

    deliverables = [
        Deliverable(project_id=project.id, code="D-001", title="Part B — Cost Estimate Tables", state="wip", due_date=date(2026, 7, 12)),
        Deliverable(project_id=project.id, code="D-002", title="Part C — Technical Route Analysis", state="wip", due_date=date(2026, 7, 19)),
        Deliverable(project_id=project.id, code="D-003", title="Part A — Executive Summary & Project Description", state="wip", due_date=date(2026, 7, 22)),
        Deliverable(project_id=project.id, code="D-004", title="Part D — Environmental & Social Impact Assessment", state="wip", due_date=date(2026, 9, 1)),
    ]
    for d in deliverables:
        session.add(d)

    await session.commit()
