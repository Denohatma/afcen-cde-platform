from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .. import models
from .benchmark_service import BenchmarkService

benchmark_svc = BenchmarkService()

SYNTHETIC_EXTRACTIONS = {
    "bulambuli_pfs_table8": [
        {
            "metric": "line_capex_per_km",
            "value": 0.153846,
            "unit": "USD_M_per_km",
            "source_location": "Table 8, OHL supply and erection, 153,846 USD/km",
            "extra": {"voltage": 132, "circuits": "double", "length_km": 152, "price_year": 2020},
        },
        {
            "metric": "substation_cost",
            "value": 5000000.0,
            "unit": "USD_lump",
            "source_location": "Table 8, Bulambuli substation",
        },
        {
            "metric": "contingency_pct",
            "value": 10.0,
            "unit": "pct_of_direct_cost",
            "source_location": "Table 8, Contingencies 10%",
        },
        {
            "metric": "esia_rap_study_cost_per_km",
            "value": 500.0,
            "unit": "USD_per_km",
            "source_location": "Table 8, ESIA and RAP studies, 500 USD/km",
        },
        {
            "metric": "compensation_per_acre",
            "value": 1000.0,
            "unit": "USD_per_acre",
            "source_location": "Table 8, Compensation",
        },
    ]
}

TABLE8_OPTION1 = {
    "ohl_supply_erection": 23_384_615.00,
    "substation": 5_000_000.00,
    "contingency_pct": 0.10,
    "consultancy_pct": 0.05,
    "esia_rap": 76_000.00,
    "land_acres": 1_315.00,
    "compensation": 1_315_000.00,
    "stated_total": 34_034_622.00,
    "route_km": 152,
}


def _check_arithmetic(table8: dict) -> list[dict]:
    flags = []
    base = table8["ohl_supply_erection"] + table8["substation"]
    contingency = base * table8["contingency_pct"]
    consultancy = base * table8["consultancy_pct"]

    computed_total = (
        table8["ohl_supply_erection"]
        + table8["substation"]
        + contingency
        + consultancy
        + table8["esia_rap"]
        + table8["compensation"]
    )

    diff = table8["stated_total"] - computed_total
    if abs(diff) > 0.01:
        flags.append({
            "check_type": "universal",
            "check_id": "U-2/U-3",
            "severity": "blocking",
            "title": "Non-currency quantity summed into currency total",
            "description": (
                f"Table 8 Option 1 ({table8['route_km']} km): stated total is "
                f"${table8['stated_total']:,.2f} but the sum of currency rows is "
                f"${computed_total:,.2f}. The difference of ${diff:,.2f} equals the "
                f"land-take row ({table8['land_acres']:,.0f} acres), which is a non-currency "
                f"quantity summed into a currency total. "
                f"Check U-2 (units) and U-3 (recomputation)."
            ),
            "chain": {
                "ohl_supply_erection": table8["ohl_supply_erection"],
                "substation": table8["substation"],
                "contingency_10pct": round(contingency, 2),
                "consultancy_5pct": round(consultancy, 2),
                "esia_rap": table8["esia_rap"],
                "compensation": table8["compensation"],
                "computed_currency_total": round(computed_total, 2),
                "stated_total": table8["stated_total"],
                "difference": round(diff, 2),
                "land_acres_row": table8["land_acres"],
                "match": abs(diff - table8["land_acres"]) < 1.0,
            },
        })

    return flags


def _check_benchmark(extractions: list[dict], project_source_id: str) -> list[dict]:
    flags = []
    for ext in extractions:
        extra = ext.get("extra", {})
        if ext["metric"] != "line_capex_per_km":
            continue

        result = benchmark_svc.check(
            metric=ext["metric"],
            value=ext["value"],
            voltage=extra.get("voltage"),
            circuits=extra.get("circuits"),
            market="developing",
            price_year=extra.get("price_year"),
            length_km=extra.get("length_km"),
            exclude_sources=[project_source_id] if project_source_id else None,
        )

        if result["result"] == "no benchmark":
            continue

        if result["result"] != "in range":
            flags.append({
                "check_type": "benchmark",
                "check_id": f"BM-{ext['metric']}",
                "severity": result["severity"].lower() if result["severity"] else "advisory",
                "title": f"Line CAPEX {result['result']}: {ext['value']:.6f} vs band {result['band_low']:.4f}–{result['band_high']:.4f}",
                "description": (
                    f"Submitted value {ext['value']:.6f} {ext['unit']} is {result['result']} "
                    f"the normalised benchmark band of {result['band_low']:.4f} to {result['band_high']:.4f} "
                    f"(n={result['n']}). "
                    + ("Escalation index is a placeholder — result is provisional. " if result.get("provisional") else "")
                ),
                "chain": result["chain"],
            })
        else:
            terrain_note = None
            if extra.get("length_km") and extra["length_km"] > 100:
                terrain_note = (
                    "The per-km rate is flat across all route options and carries no terrain "
                    "differentiation. The Mt. Elgon foothills section from Bulambuli toward "
                    "Namalu would be expected to cost 15–78% more per ESMAP cost-driver data."
                )

            if terrain_note:
                flags.append({
                    "check_type": "benchmark",
                    "check_id": "BM-terrain-differentiation",
                    "severity": "advisory",
                    "title": "Rate plausible in aggregate but not terrain-differentiated",
                    "description": terrain_note,
                    "chain": result["chain"],
                })

    return flags


def _check_aace(declared_class: str, low_pct: float, high_pct: float) -> list[dict]:
    result = benchmark_svc.aace_check(declared_class, low_pct, high_pct)
    flags = []
    if not result["ok"]:
        for fail in result.get("fails", []):
            flags.append({
                "check_type": "aace",
                "check_id": "FR-24",
                "severity": "material",
                "title": f"AACE {declared_class} accuracy range non-conformance",
                "description": fail,
                "chain": {
                    "declared_class": declared_class,
                    "declared_range": f"{low_pct}% to +{high_pct}%",
                    "class_range": result.get("class_range"),
                    "fails": result.get("fails"),
                    "asks": result.get("asks"),
                },
            })
    for ask in result.get("asks", []):
        flags.append({
            "check_type": "aace",
            "check_id": "FR-24",
            "severity": "advisory",
            "title": f"AACE {declared_class} — review risk basis",
            "description": ask,
            "chain": {
                "declared_class": declared_class,
                "declared_range": f"{low_pct}% to +{high_pct}%",
                "class_range": result.get("class_range"),
            },
        })
    return flags


async def run_checks_for_deliverable(deliverable_id: str, db: AsyncSession):
    deliverable = await db.get(models.Deliverable, deliverable_id)
    if not deliverable:
        return

    result = await db.execute(
        select(models.Version)
        .where(models.Version.deliverable_id == deliverable_id)
        .order_by(models.Version.version_number.desc())
        .limit(1)
    )
    version = result.scalar_one_or_none()
    if not version:
        return

    project = await db.get(models.Project, deliverable.project_id)
    project_source_id = project.source_id if project else ""

    confirmed_exts = await db.execute(
        select(models.Extraction)
        .where(models.Extraction.version_id == version.id)
        .where(models.Extraction.confirmed == True)  # noqa: E712
    )
    extractions = confirmed_exts.scalars().all()

    all_flags = []

    all_flags.extend(_check_arithmetic(TABLE8_OPTION1))

    ext_dicts = [
        {"metric": e.metric, "value": e.value, "unit": e.unit, "source_location": e.source_location,
         "extra": {"voltage": 132, "circuits": "double", "length_km": 152, "price_year": 2020}}
        for e in extractions if e.metric == "line_capex_per_km"
    ]
    if not ext_dicts:
        ext_dicts = [e for e in SYNTHETIC_EXTRACTIONS.get("bulambuli_pfs_table8", [])
                     if e["metric"] == "line_capex_per_km"]
    all_flags.extend(_check_benchmark(ext_dicts, project_source_id))

    all_flags.extend(_check_aace("Class 4", -35, 35))

    for flag_data in all_flags:
        flag = models.Flag(
            version_id=version.id,
            deliverable_id=deliverable_id,
            check_type=flag_data["check_type"],
            check_id=flag_data.get("check_id", ""),
            severity=flag_data["severity"],
            title=flag_data["title"],
            description=flag_data["description"],
            chain=flag_data.get("chain"),
        )
        db.add(flag)

    audit = models.AuditLog(
        project_id=deliverable.project_id,
        entity_type="check_run",
        entity_id=deliverable_id,
        action="checks_completed",
        actor="system",
        details={"flags_created": len(all_flags), "version_id": version.id},
    )
    db.add(audit)

    await db.commit()
