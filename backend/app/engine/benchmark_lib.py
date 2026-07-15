#!/usr/bin/env python3
"""
AfCEN benchmark library: loader, validator, normaliser and check engine.

Enforces the rules from the CDE PRD addendum:
  FR-14  an entry without a resolvable locator is rejected, not stored at low confidence
  FR-15  normalisation to a declared basis, using a NAMED escalation index
  FR-16  every benchmark is a range with a sample count, never a bare average
  FR-17  cost-driver factors are applied before comparison, and the chain is shown
  FR-18  fewer than three independent sources means Advisory at most, never Material

Usage:
  python benchmark_lib.py validate
  python benchmark_lib.py list [--metric line_capex_per_km]
  python benchmark_lib.py sources
  python benchmark_lib.py check --metric line_capex_per_km --voltage 132 --circuits double \
        --market developing --price-year 2020 --value 0.153846 [--length-km 152] [--terrain mountainous]
  python benchmark_lib.py add --file new_entry.json
  python benchmark_lib.py export --csv out.csv
"""

import argparse
import copy
import csv
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "library.json")
SCHEMA = os.path.join(HERE, "schema.json")

ADVISORY, MATERIAL, BLOCKING = "Advisory", "Material", "Blocking"
MIN_SOURCES_FOR_MATERIAL = 3


# ---------------------------------------------------------------- load / save

def load(path=LIB):
    with open(path) as f:
        return json.load(f)


def save(lib, path=LIB):
    lib["meta"]["updated"] = date.today().isoformat()
    with open(path, "w") as f:
        json.dump(lib, f, indent=2)
        f.write("\n")


# ---------------------------------------------------------------- validation

def validate(lib, verbose=True):
    """Schema check if jsonschema is available, plus the library rules that matter."""
    errors, warnings = [], []

    try:
        import jsonschema
        with open(SCHEMA) as f:
            jsonschema.validate(lib, json.load(f))
        if verbose:
            print("schema        : PASS")
    except ImportError:
        warnings.append("jsonschema not installed, schema check skipped (pip install jsonschema)")
    except Exception as e:
        errors.append(f"schema: {str(e).splitlines()[0]}")

    src = lib["sources"]
    ids = set()

    for b in lib["benchmarks"]:
        bid = b.get("id", "<no id>")

        if bid in ids:
            errors.append(f"{bid}: duplicate id")
        ids.add(bid)

        # FR-14: resolvable citation or the entry does not exist
        if b.get("source_id") not in src:
            errors.append(f"{bid}: source_id '{b.get('source_id')}' not in source register (FR-14)")
        if not (b.get("locator") or "").strip():
            errors.append(f"{bid}: empty locator, entry must be rejected (FR-14)")

        # FR-16: range with a sample count
        v = b.get("value", {})
        if "low" not in v or "high" not in v:
            errors.append(f"{bid}: value must carry low and high (FR-16)")
        elif v["low"] > v["high"]:
            errors.append(f"{bid}: value.low > value.high")
        if v.get("n", 0) < 1:
            errors.append(f"{bid}: value.n missing or < 1 (FR-16)")

        # FR-15: a normalisable entry needs a declared basis
        ba = b.get("basis", {})
        if not ba.get("scope"):
            errors.append(f"{bid}: basis.scope is required (FR-15)")
        if ba.get("kind") != "convention" and ba.get("price_year") is None \
                and "pct" not in v.get("unit", "") and "acres" not in v.get("unit", ""):
            warnings.append(f"{bid}: no price_year, cannot escalate")

        # FR-18 consistency
        if v.get("n", 0) < MIN_SOURCES_FOR_MATERIAL and b.get("confidence") == "high":
            warnings.append(f"{bid}: confidence 'high' with n={v.get('n')} (FR-18 caps this at Advisory anyway)")

        # secondary sources
        s = src.get(b.get("source_id"), {})
        if s and not s.get("primary", True) and b.get("confidence") != "low":
            warnings.append(f"{bid}: source is secondary, confidence should be 'low' until the primary is read")
        if s and not s.get("licence_confirmed", False):
            warnings.append(f"{bid}: source licence not confirmed ({b.get('source_id')})")

        # review date
        if b.get("review_by") and b["review_by"] < date.today().isoformat() and not b.get("superseded_by"):
            warnings.append(f"{bid}: past review_by date {b['review_by']}")

    for a in lib["adjustments"]:
        if a.get("source_id") not in src:
            errors.append(f"{a.get('id')}: adjustment source_id not in register (FR-14)")

    for m in lib["market_adjustments"]:
        if m.get("source_id") not in src:
            errors.append(f"{m.get('id')}: market adjustment source_id not in register (FR-14)")

    # escalation must be named, not implied
    for k, idx in lib["escalation"]["indices"].items():
        if idx["status"] == "placeholder":
            warnings.append(f"escalation index '{k}' is a PLACEHOLDER: any escalated result is provisional (FR-15)")

    if verbose:
        print(f"benchmarks    : {len(lib['benchmarks'])}")
        print(f"adjustments   : {len(lib['adjustments'])}")
        print(f"sources       : {len(src)}")
        print(f"errors        : {len(errors)}")
        print(f"warnings      : {len(warnings)}")
        for e in errors:
            print(f"  ERROR   {e}")
        for w in warnings:
            print(f"  warn    {w}")
    return errors, warnings


# ---------------------------------------------------------------- normalise

def escalate(value, from_year, to_year, lib, index_key="PLACEHOLDER_GENERIC"):
    """Escalate using a NAMED index. Returns (value, factor, provisional_flag)."""
    idx = lib["escalation"]["indices"][index_key]
    f = idx["factors"]
    if from_year is None or to_year is None:
        return value, 1.0, True
    a, b = str(from_year), str(to_year)
    if a not in f or b not in f:
        years = sorted(int(y) for y in f)
        a = str(min(years, key=lambda y: abs(y - int(from_year))))
        b = str(min(years, key=lambda y: abs(y - int(to_year))))
    factor = f[b] / f[a]
    return value * factor, factor, idx["status"] == "placeholder"


def find(lib, metric, voltage=None, circuits=None, market=None):
    out = []
    for b in lib["benchmarks"]:
        if b["metric"] != metric or b.get("superseded_by"):
            continue
        a = b.get("asset", {})
        if voltage is not None and "voltage_kv_min" in a:
            if not (a["voltage_kv_min"] <= voltage <= a["voltage_kv_max"]):
                continue
        if circuits and a.get("circuits") not in (None, "n/a", circuits):
            continue
        if market and b["basis"]["market"] not in ("unspecified", market):
            continue
        out.append(b)
    return out


def check(lib, metric, value, voltage=None, circuits=None, market="developing",
          price_year=None, length_km=None, terrain=None, index_key="PLACEHOLDER_GENERIC",
          exclude_sources=None):
    """Compare a submitted value against the library. Returns a flag record with the full chain.

    exclude_sources: source_ids to leave out. Use this to stop a project's own prior
    estimate being used as the benchmark for its own submission, which would be circular.
    """
    chain = []
    provisional = False
    exclude_sources = set(exclude_sources or [])

    cands = []
    for b in find(lib, metric, voltage, circuits, market):
        if b["source_id"] in exclude_sources:
            chain.append(f"exclude {b['id']}: source '{b['source_id']}' excluded to avoid circularity")
            continue
        cands.append(copy.deepcopy(b))
    if market == "developing":
        for b in find(lib, metric, voltage, circuits, "developed"):
            if b["source_id"] in exclude_sources:
                continue
            mk = lib["market_adjustments"][0]
            nb = copy.deepcopy(b)
            lo = b["value"]["low"] / mk["divisor_high"]
            hi = b["value"]["high"] / mk["divisor_low"]
            nb["value"]["low"], nb["value"]["high"] = lo, hi
            nb["basis"]["market"] = "developing"
            cands.append(nb)
            chain.append(
                f"{b['id']}: {b['value']['low']:.3f}-{b['value']['high']:.3f} developed"
                f" -> {lo:.3f}-{hi:.3f} developing (divide by {mk['divisor_low']}-{mk['divisor_high']}, {mk['id']})"
            )

    if not cands:
        return {"result": "no benchmark", "severity": None, "chain": chain,
                "note": f"No usable entry for metric={metric} voltage={voltage} circuits={circuits}."}

    # escalate EACH candidate from its own price year, then take the envelope
    if price_year:
        for c in cands:
            by = c["basis"].get("price_year")
            if not by or by == price_year:
                continue
            c["value"]["low"], f, p = escalate(c["value"]["low"], by, price_year, lib, index_key)
            c["value"]["high"], _, _ = escalate(c["value"]["high"], by, price_year, lib, index_key)
            provisional = provisional or p
            chain.append(f"{c['id']}: escalate {by} -> {price_year} at factor {f:.3f} using '{index_key}'"
                         + (" [PLACEHOLDER: provisional]" if p else ""))

    lo = min(c["value"]["low"] for c in cands)
    hi = max(c["value"]["high"] for c in cands)

    # 4. driver factors
    applied = []
    for adj in lib["adjustments"]:
        if adj["applies_to"] not in (metric, "land_and_line_capex"):
            continue
        hit = ((length_km and length_km > 100 and adj["id"] == "ADJ-LEN-LONG")
               or (length_km and length_km < 5 and adj["id"] == "ADJ-LEN-SHORT")
               or (terrain == "mountainous" and adj["id"] == "ADJ-TERRAIN-MOUNTAIN")
               or (terrain == "high_slope" and adj["id"] == "ADJ-TERRAIN-HIGH-SLOPE"))
        if hit:
            lo *= adj["factor_low"]
            hi *= adj["factor_high"]
            applied.append(adj["id"])
            chain.append(f"apply {adj['id']} ({adj['factor_low']}-{adj['factor_high']}): band now {lo:.3f}-{hi:.3f}")

    # 5. verdict, with the FR-18 confidence floor
    n_total = sum(c["value"]["n"] for c in cands)
    inside = lo <= value <= hi
    if inside:
        severity, result = None, "in range"
    else:
        severity = MATERIAL if n_total >= MIN_SOURCES_FOR_MATERIAL else ADVISORY
        if provisional and severity == MATERIAL:
            severity = ADVISORY
            chain.append("severity capped to Advisory: escalation index is a placeholder (FR-15)")
        if n_total < MIN_SOURCES_FOR_MATERIAL:
            chain.append(f"severity capped to Advisory: only n={n_total} sources (FR-18)")
        result = "below band" if value < lo else "above band"

    return {"result": result, "severity": severity, "value": value,
            "band_low": lo, "band_high": hi, "n": n_total,
            "provisional": provisional, "chain": chain,
            "sources": [c["id"] for c in cands], "adjustments_applied": applied}


def aace_check(lib, declared_class, low_pct, high_pct):
    """Check a stated accuracy range against the declared AACE class.

    Conformance rules:
      FAIL  symmetric band          -> no AACE class is symmetric, cost risk skews positive
      FAIL  wider than the class    -> the estimate is really a lower class than declared
      ASK   tighter than the class  -> allowable, but only if risk analysis supports it.
            AACE is explicit that the range comes from project risk analysis and is never
            pre-determined, so a tighter band is a question, not a defect.
    """
    row = next((r for r in lib["reference_tables"]["aace"]
                if r["class"].lower() == declared_class.lower()), None)
    if not row:
        return {"ok": False, "note": f"unknown class '{declared_class}'"}
    fails, asks = [], []

    if abs(abs(low_pct) - abs(high_pct)) < 1e-9:
        fails.append("range is symmetric. No AACE class is symmetric; cost risk skews positive. "
                     "This is the signature of a range asserted rather than derived from risk analysis (FR-24).")
    if low_pct < row["accuracy_low_pct"]:
        fails.append(f"low side {low_pct}% is wider than {row['class']} ({row['accuracy_low_pct']}%), "
                     "so the estimate is really a lower class than declared")
    if high_pct > row["accuracy_high_pct"]:
        fails.append(f"high side +{high_pct}% is wider than {row['class']} (+{row['accuracy_high_pct']}%), "
                     "so the estimate is really a lower class than declared")
    if high_pct < row["accuracy_high_pct"] or low_pct > row["accuracy_low_pct"]:
        asks.append(f"band is tighter than the {row['class']} maximum. Allowable if the risk analysis "
                    "supports it. Ask for the risk basis rather than flagging the number.")

    return {"ok": not fails, "class": row["class"],
            "class_range": f"{row['accuracy_low_pct']}% to +{row['accuracy_high_pct']}%",
            "fails": fails, "asks": asks,
            "notes": fails + asks}


# ---------------------------------------------------------------- add / export

def add_entry(lib, entry):
    """Add one benchmark. Rejects rather than degrades, per FR-14."""
    if entry.get("source_id") not in lib["sources"]:
        raise ValueError(f"REJECTED: source_id '{entry.get('source_id')}' is not in the source register (FR-14). "
                         "Add the source first.")
    if not (entry.get("locator") or "").strip():
        raise ValueError("REJECTED: entry has no locator. FR-14 requires a resolvable citation.")
    v = entry.get("value", {})
    if "low" not in v or "high" not in v or v.get("n", 0) < 1:
        raise ValueError("REJECTED: value must carry low, high and n (FR-16).")
    if any(b["id"] == entry["id"] for b in lib["benchmarks"]):
        raise ValueError(f"REJECTED: id '{entry['id']}' already exists. Use superseded_by to replace.")
    entry.setdefault("added", date.today().isoformat())
    entry.setdefault("superseded_by", None)
    lib["benchmarks"].append(entry)
    return lib


def export_csv(lib, path):
    cols = ["id", "metric", "voltage_kv_min", "voltage_kv_max", "circuits", "technology",
            "low", "high", "unit", "n", "price_year", "currency", "market", "kind",
            "scope", "region", "countries", "source_id", "locator", "confidence", "notes",
            "added", "review_by", "superseded_by"]
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for b in lib["benchmarks"]:
            a, v, ba, g = b.get("asset", {}), b["value"], b["basis"], b["geography"]
            w.writerow({
                "id": b["id"], "metric": b["metric"],
                "voltage_kv_min": a.get("voltage_kv_min"), "voltage_kv_max": a.get("voltage_kv_max"),
                "circuits": a.get("circuits"), "technology": a.get("technology"),
                "low": v["low"], "high": v["high"], "unit": v["unit"], "n": v["n"],
                "price_year": ba.get("price_year"), "currency": ba.get("currency"),
                "market": ba.get("market"), "kind": ba.get("kind"), "scope": ba.get("scope"),
                "region": g.get("region"), "countries": ";".join(g.get("countries", [])),
                "source_id": b["source_id"], "locator": b["locator"],
                "confidence": b["confidence"], "notes": b.get("notes", ""),
                "added": b.get("added"), "review_by": b.get("review_by"),
                "superseded_by": b.get("superseded_by"),
            })
    return path


# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(description="AfCEN benchmark library")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("validate")
    sub.add_parser("sources")
    pl = sub.add_parser("list"); pl.add_argument("--metric")

    pc = sub.add_parser("check")
    pc.add_argument("--metric", required=True)
    pc.add_argument("--value", type=float, required=True)
    pc.add_argument("--voltage", type=float)
    pc.add_argument("--circuits", choices=["single", "double"])
    pc.add_argument("--market", default="developing", choices=["developed", "developing"])
    pc.add_argument("--price-year", type=int)
    pc.add_argument("--length-km", type=float)
    pc.add_argument("--terrain", choices=["mountainous", "high_slope", "flat"])
    pc.add_argument("--exclude-source", action="append", default=[],
                    help="source_id to exclude, e.g. the project's own prior estimate")

    pa = sub.add_parser("aace")
    pa.add_argument("--class", dest="klass", required=True)
    pa.add_argument("--low", type=float, required=True)
    pa.add_argument("--high", type=float, required=True)

    padd = sub.add_parser("add"); padd.add_argument("--file", required=True)
    pe = sub.add_parser("export"); pe.add_argument("--csv", required=True)

    args = ap.parse_args()
    lib = load()

    if args.cmd == "validate":
        errors, _ = validate(lib)
        sys.exit(1 if errors else 0)

    if args.cmd == "sources":
        for k, s in lib["sources"].items():
            lic = s["licence"] + ("" if s.get("licence_confirmed") else "  [UNCONFIRMED]")
            print(f"[tier {s['tier']}] {k:24s} {s['publisher']} ({s['year']})")
            print(f"{'':11s}{'':24s} {'primary' if s['primary'] else 'SECONDARY'} | {lic}")

    if args.cmd == "list":
        for b in lib["benchmarks"]:
            if args.metric and b["metric"] != args.metric:
                continue
            v = b["value"]
            print(f"{b['id']:26s} {b['metric']:24s} {v['low']:>10.4f}-{v['high']:<10.4f} {v['unit']:16s} "
                  f"n={v['n']:<3d} {b['confidence']}")

    if args.cmd == "check":
        r = check(lib, args.metric, args.value, args.voltage, args.circuits,
                  args.market, args.price_year, args.length_km, args.terrain,
                  exclude_sources=args.exclude_source)
        print(f"\nsubmitted : {r.get('value')}")
        if r["result"] == "no benchmark":
            print(f"result    : {r['result']}\nnote      : {r['note']}")
            return
        print(f"band      : {r['band_low']:.4f} to {r['band_high']:.4f}  (n={r['n']})")
        print(f"result    : {r['result']}")
        print(f"severity  : {r['severity'] or 'no flag'}")
        if r["provisional"]:
            print("provisional: yes, escalation index is a placeholder")
        print("chain     :")
        for c in r["chain"]:
            print(f"  - {c}")

    if args.cmd == "aace":
        r = aace_check(lib, args.klass, args.low, args.high)
        print(f"declared  : {args.klass} at {args.low}% to +{args.high}%")
        print(f"class band: {r.get('class_range')}")
        print(f"conforms  : {r['ok']}")
        for nte in r.get("fails", []):
            print(f"  FAIL  {nte}")
        for nte in r.get("asks", []):
            print(f"  ASK   {nte}")

    if args.cmd == "add":
        with open(args.file) as f:
            entry = json.load(f)
        try:
            save(add_entry(lib, entry))
            print(f"added {entry['id']}")
        except ValueError as e:
            print(e); sys.exit(1)

    if args.cmd == "export":
        print(f"wrote {export_csv(lib, args.csv)}")


if __name__ == "__main__":
    main()
