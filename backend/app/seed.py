from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


async def seed_if_empty(session: AsyncSession):
    from .models import Project, Deliverable, Version, User

    result = await session.execute(select(Project).limit(1))
    if result.scalar_one_or_none():
        return

    admin = User(
        email="joseph@afcen.org",
        name="Joseph Ochieng",
        role="pm",
    )
    session.add(admin)

    consultant = User(
        email="daniel@consultant.com",
        name="Daniel Okello",
        role="consultant",
    )
    session.add(consultant)

    project = Project(
        name="Bulambuli-Moroto 132 kV IPT",
        description="Pre-feasibility study review for the 132 kV interconnector transmission project between Bulambuli and Moroto substations, Eastern Uganda.",
        source_id="bulambuli_moroto_pfs_2026",
    )
    session.add(project)
    await session.flush()

    deliverables = [
        Deliverable(
            project_id=project.id,
            code="D-001",
            title="Part B — Cost Estimate Tables",
            state="wip",
        ),
        Deliverable(
            project_id=project.id,
            code="D-002",
            title="Part C — Technical Route Analysis",
            state="wip",
        ),
        Deliverable(
            project_id=project.id,
            code="D-003",
            title="Part A — Executive Summary & Project Description",
            state="wip",
        ),
        Deliverable(
            project_id=project.id,
            code="D-004",
            title="Part D — Environmental & Social Impact Assessment",
            state="wip",
        ),
    ]
    for d in deliverables:
        session.add(d)

    await session.commit()
