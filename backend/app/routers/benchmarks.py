from __future__ import annotations
from fastapi import APIRouter, Query
from ..services.benchmark_service import BenchmarkService

router = APIRouter(tags=["benchmarks"])
svc = BenchmarkService()


@router.get("/benchmarks/validate")
async def validate_library():
    return svc.validate()


@router.get("/benchmarks/sources")
async def list_sources():
    return svc.sources()


@router.get("/benchmarks/list")
async def list_benchmarks(metric: str | None = None):
    return svc.list_entries(metric)


@router.post("/benchmarks/check")
async def check_value(data: dict):
    return svc.check(
        metric=data["metric"],
        value=data["value"],
        voltage=data.get("voltage"),
        circuits=data.get("circuits"),
        market=data.get("market", "developing"),
        price_year=data.get("price_year"),
        length_km=data.get("length_km"),
        terrain=data.get("terrain"),
        exclude_sources=data.get("exclude_sources"),
    )


@router.post("/benchmarks/aace")
async def aace_check(data: dict):
    return svc.aace_check(
        declared_class=data["declared_class"],
        low_pct=data["low_pct"],
        high_pct=data["high_pct"],
    )
