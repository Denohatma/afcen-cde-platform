from __future__ import annotations
from datetime import date, datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


async def seed_if_empty(session: AsyncSession):
    from .models import Project, Deliverable, User
    from .models.deliverable import Version
    from .models.extraction import Extraction
    from .models.flag import Flag

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

    # --- Project 1: Bulambuli-Moroto ---
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

    # --- Project 2: Test Project with sample deliverables ---
    now = datetime.now(timezone.utc)
    test_project = Project(
        name="Test Project",
        description="Sample solar PFS project with example deliverables, versions, flags, and extracted data for demonstration.",
        source_id="TEST-001",
    )
    session.add(test_project)
    await session.flush()

    t001 = Deliverable(project_id=test_project.id, code="T-001", title="Feasibility Study Report", state="published", due_date=date(2026, 7, 10))
    t002 = Deliverable(project_id=test_project.id, code="T-002", title="Financial Model & LCOE Analysis", state="shared", due_date=date(2026, 7, 25))
    t003 = Deliverable(project_id=test_project.id, code="T-003", title="Environmental & Social Impact Assessment", state="shared", due_date=date(2026, 7, 28))
    t004 = Deliverable(project_id=test_project.id, code="T-004", title="Technical Design & Equipment Specifications", state="wip", due_date=date(2026, 8, 15))
    t005 = Deliverable(project_id=test_project.id, code="T-005", title="Grid Connection & Power Evacuation Study", state="wip", due_date=date(2026, 8, 30))
    t006 = Deliverable(project_id=test_project.id, code="T-006", title="Land Acquisition & Resettlement Plan", state="published", due_date=date(2026, 7, 5))
    for d in [t001, t002, t003, t004, t005, t006]:
        session.add(d)
    await session.flush()

    # --- Versions ---
    v001_1 = Version(deliverable_id=t001.id, version_number=1, file_path="/uploads/test-project/T001_Feasibility_Report_v1.pdf", file_name="T001_Feasibility_Report_v1.pdf", file_type="application/pdf", uploaded_by="daniel", extraction_confirmed=True, created_at=now - timedelta(days=28))
    v001_2 = Version(deliverable_id=t001.id, version_number=2, file_path="/uploads/test-project/T001_Feasibility_Report_v2.pdf", file_name="T001_Feasibility_Report_v2.pdf", file_type="application/pdf", uploaded_by="daniel", extraction_confirmed=True, created_at=now - timedelta(days=15))
    v001_3 = Version(deliverable_id=t001.id, version_number=3, file_path="/uploads/test-project/T001_Feasibility_Report_v3_Final.pdf", file_name="T001_Feasibility_Report_v3_Final.pdf", file_type="application/pdf", uploaded_by="daniel", extraction_confirmed=True, created_at=now - timedelta(days=3))
    v002_1 = Version(deliverable_id=t002.id, version_number=1, file_path="/uploads/test-project/T002_Financial_Model_v1.xlsx", file_name="T002_Financial_Model_v1.xlsx", file_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", uploaded_by="daniel", extraction_confirmed=True, created_at=now - timedelta(days=18))
    v002_2 = Version(deliverable_id=t002.id, version_number=2, file_path="/uploads/test-project/T002_Financial_Model_v2.xlsx", file_name="T002_Financial_Model_v2.xlsx", file_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", uploaded_by="daniel", extraction_confirmed=False, created_at=now - timedelta(days=2))
    v003_1 = Version(deliverable_id=t003.id, version_number=1, file_path="/uploads/test-project/T003_ESIA_Report_v1.pdf", file_name="T003_ESIA_Report_v1.pdf", file_type="application/pdf", uploaded_by="daniel", extraction_confirmed=False, created_at=now - timedelta(days=12))
    v004_1 = Version(deliverable_id=t004.id, version_number=1, file_path="/uploads/test-project/T004_Technical_Specs_Draft.pdf", file_name="T004_Technical_Specs_Draft.pdf", file_type="application/pdf", uploaded_by="daniel", extraction_confirmed=False, created_at=now - timedelta(days=5))
    v006_1 = Version(deliverable_id=t006.id, version_number=1, file_path="/uploads/test-project/T006_Land_RAP_v1.pdf", file_name="T006_Land_RAP_v1.pdf", file_type="application/pdf", uploaded_by="daniel", extraction_confirmed=True, created_at=now - timedelta(days=35))
    v006_2 = Version(deliverable_id=t006.id, version_number=2, file_path="/uploads/test-project/T006_Land_RAP_v2_Final.pdf", file_name="T006_Land_RAP_v2_Final.pdf", file_type="application/pdf", uploaded_by="daniel", extraction_confirmed=True, created_at=now - timedelta(days=12))
    for v in [v001_1, v001_2, v001_3, v002_1, v002_2, v003_1, v004_1, v006_1, v006_2]:
        session.add(v)
    await session.flush()

    # --- Extractions (T-001 v3 — published feasibility report) ---
    for metric, value, unit, loc in [
        ("installed_capacity", 50.0, "MW", "Table 3.1, Page 12"),
        ("annual_generation", 131400.0, "MWh/yr", "Table 3.2, Page 14"),
        ("capacity_factor", 30.0, "%", "Section 3.3, Page 15"),
        ("total_capex", 72500000.0, "USD", "Table 5.1, Page 28"),
        ("capex_per_kw", 1450.0, "USD/kW", "Table 5.1, Page 28"),
        ("project_irr", 14.2, "%", "Table 6.3, Page 35"),
        ("equity_irr", 18.7, "%", "Table 6.3, Page 35"),
        ("npv_at_10pct", 8340000.0, "USD", "Table 6.4, Page 36"),
        ("payback_period", 6.8, "years", "Section 6.5, Page 37"),
        ("debt_service_coverage_ratio", 1.35, "x", "Table 6.6, Page 38"),
    ]:
        session.add(Extraction(version_id=v001_3.id, metric=metric, value=value, unit=unit, source_location=loc, confirmed=True, confirmed_by="joseph"))

    # T-002 v2 — financial model (under review)
    for metric, value, unit, loc in [
        ("lcoe", 0.078, "USD/kWh", "Sheet: Summary, Cell D15"),
        ("tariff_required", 0.092, "USD/kWh", "Sheet: Summary, Cell D18"),
        ("annual_opex", 1850000.0, "USD/yr", "Sheet: OpEx, Cell C45"),
        ("debt_equity_ratio", 70.0, "%", "Sheet: Assumptions, Cell B8"),
        ("loan_tenor", 15.0, "years", "Sheet: Assumptions, Cell B12"),
        ("interest_rate", 8.5, "%", "Sheet: Assumptions, Cell B14"),
    ]:
        session.add(Extraction(version_id=v002_2.id, metric=metric, value=value, unit=unit, source_location=loc, confirmed=False))

    # T-003 v1 — ESIA
    for metric, value, unit, loc in [
        ("affected_households", 145.0, "households", "Table 4.2, Page 22"),
        ("land_area_required", 85.0, "hectares", "Section 3.1, Page 16"),
        ("co2_avoided", 62500.0, "tCO2/yr", "Section 7.3, Page 48"),
        ("resettlement_cost", 2800000.0, "USD", "Table 5.1, Page 30"),
    ]:
        session.add(Extraction(version_id=v003_1.id, metric=metric, value=value, unit=unit, source_location=loc, confirmed=False))

    # --- Flags ---
    # T-001 (all resolved)
    session.add(Flag(version_id=v001_1.id, deliverable_id=t001.id, check_type="unit_consistency", check_id="U-001", severity="blocking", title="Capacity factor exceeds 100%", description="Table 3.2 shows capacity factor of 130% which is physically impossible. Likely a formula error.", status="resolved", resolved_by="joseph", resolution_note="Fixed in v2 — corrected formula in Table 3.2, capacity factor now shows 30%", resolved_at=now - timedelta(days=14)))
    session.add(Flag(version_id=v001_1.id, deliverable_id=t001.id, check_type="benchmark", check_id="FR-14", severity="material", title="CAPEX above benchmark range", description="Reported CAPEX of $1,650/kW exceeds the benchmark range of $1,200-$1,500/kW for solar PV in East Africa.", status="resolved", resolved_by="joseph", resolution_note="Revised in v2 — updated equipment quotes brought CAPEX to $1,450/kW within benchmark", resolved_at=now - timedelta(days=14)))
    session.add(Flag(version_id=v001_2.id, deliverable_id=t001.id, check_type="completeness", check_id="U-005", severity="advisory", title="Missing sensitivity analysis", description="No sensitivity analysis provided for key variables (tariff, solar irradiance, CAPEX).", status="resolved", resolved_by="joseph", resolution_note="Added in v3 — Section 6.7 now includes tornado chart and Monte Carlo results", resolved_at=now - timedelta(days=4)))

    # T-002 (open flags)
    session.add(Flag(version_id=v002_2.id, deliverable_id=t002.id, check_type="unit_consistency", check_id="U-003", severity="blocking", title="Currency mismatch in OpEx sheet", description="OpEx line items mix USD and UGX without conversion. Total appears to sum mixed currencies."))
    session.add(Flag(version_id=v002_2.id, deliverable_id=t002.id, check_type="benchmark", check_id="FR-16", severity="material", title="LCOE below plausible range", description="Reported LCOE of $0.078/kWh is below the minimum benchmark of $0.082/kWh for this technology and geography. Verify OpEx assumptions."))
    session.add(Flag(version_id=v002_2.id, deliverable_id=t002.id, check_type="aace", check_id="FR-24", severity="advisory", title="AACE Class 4 — contingency appears low", description="Contingency of 8% is below the typical 15-25% range for AACE Class 4 estimates at this project stage."))

    # T-003 (open flags)
    session.add(Flag(version_id=v003_1.id, deliverable_id=t003.id, check_type="completeness", check_id="U-008", severity="material", title="Biodiversity baseline survey incomplete", description="Section 4.5 references a biodiversity survey but only covers flora. Fauna assessment and protected species inventory are missing."))
    session.add(Flag(version_id=v003_1.id, deliverable_id=t003.id, check_type="benchmark", check_id="FR-15", severity="advisory", title="Resettlement cost per household below regional average", description="Estimated $19,310/household is below the East Africa regional average of $22,000-$28,000/household for similar projects."))

    # T-006 (resolved)
    session.add(Flag(version_id=v006_1.id, deliverable_id=t006.id, check_type="completeness", check_id="U-007", severity="material", title="Missing stakeholder consultation records", description="Section 3.2 references community consultations but appendix with meeting minutes is missing.", status="resolved", resolved_by="joseph", resolution_note="Appendix C added in v2 with full consultation records from 4 community meetings", resolved_at=now - timedelta(days=13)))

    await session.commit()
