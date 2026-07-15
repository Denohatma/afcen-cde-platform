from __future__ import annotations
import os
from ..engine import benchmark_lib

ENGINE_DIR = os.path.dirname(os.path.abspath(benchmark_lib.__file__))
LIB_PATH = os.path.join(ENGINE_DIR, "library.json")


class BenchmarkService:
    def __init__(self):
        self._lib = benchmark_lib.load(LIB_PATH)

    def reload(self):
        self._lib = benchmark_lib.load(LIB_PATH)

    def validate(self):
        errors, warnings = benchmark_lib.validate(self._lib, verbose=False)
        return {
            "status": "ok" if not errors else "errors",
            "benchmarks": len(self._lib["benchmarks"]),
            "sources": len(self._lib["sources"]),
            "errors": errors,
            "warnings": warnings,
        }

    def sources(self):
        return self._lib["sources"]

    def list_entries(self, metric: str | None = None):
        entries = []
        for b in self._lib["benchmarks"]:
            if metric and b["metric"] != metric:
                continue
            entries.append(b)
        return entries

    def check(self, metric, value, voltage=None, circuits=None, market="developing",
              price_year=None, length_km=None, terrain=None, exclude_sources=None):
        return benchmark_lib.check(
            self._lib, metric, value,
            voltage=voltage, circuits=circuits, market=market,
            price_year=price_year, length_km=length_km, terrain=terrain,
            exclude_sources=exclude_sources,
        )

    def aace_check(self, declared_class, low_pct, high_pct):
        return benchmark_lib.aace_check(self._lib, declared_class, low_pct, high_pct)

    def escalate(self, value, from_year, to_year):
        return benchmark_lib.escalate(value, from_year, to_year, self._lib)
