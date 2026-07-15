# AfCEN Benchmark Library (starter)

Reference data for FR-3, FR-4 and FR-13 to FR-24 of the CDE platform. It holds the values the
platform checks consultant submissions against, the cost-driver factors used to adjust them to a
given project, and the AACE accuracy classes.

**Status: starter, version 0.1.0.** Do not set Material thresholds on it yet. See "Before production" below.

## Files

| File | What it is |
|---|---|
| `library.json` | The library. Source of truth. Version controlled. |
| `schema.json` | JSON Schema. `validate` checks against it. |
| `benchmark_lib.py` | Loader, validator, normaliser, check engine, CLI. |
| `benchmark_library.csv` | Flat export for reading. Generated, never edited by hand. |

## Quick start

```bash
pip install jsonschema
python benchmark_lib.py validate          # schema plus the library rules
python benchmark_lib.py sources           # the source register, with licence status
python benchmark_lib.py list --metric line_capex_per_km
python benchmark_lib.py export --csv benchmark_library.csv
```

Check a submitted figure:

```bash
python benchmark_lib.py check \
  --metric line_capex_per_km --voltage 132 --circuits double \
  --market developing --price-year 2020 --value 0.153846 --length-km 152 \
  --exclude-source bulambuli_pfs_2020
```

Check a stated accuracy range:

```bash
python benchmark_lib.py aace --class "Class 4" --low -35 --high 35
```

## The rules the code enforces

These are not style preferences. They are the difference between a benchmark library and a
confident-sounding guess.

| Rule | Behaviour |
|---|---|
| FR-14 | An entry whose `source_id` is not in the register, or whose `locator` is empty, is **rejected**. It is not stored at low confidence. |
| FR-15 | Escalation uses a **named index**. While the index is a placeholder, every escalated result is marked provisional and cannot raise a Material flag. |
| FR-16 | Every entry carries `low`, `high` and `n`. There are no bare averages. |
| FR-17 | Driver factors are applied before comparison and the whole chain is printed with the flag. |
| FR-18 | Fewer than three independent sources means **Advisory at most**, never Material. |
| Anti-circularity | `--exclude-source` stops a project's own prior estimate being used as the benchmark for its own submission. Always exclude the project's own source when checking that project. |

## Adding data

The library is designed to grow. Two steps, in order.

**1. Register the source first.** Add to `sources` in `library.json`:

```json
"esmap_table_3_5": {
  "publisher": "ESMAP / World Bank",
  "title": "Understanding the Cost of Transmission Infrastructure",
  "year": 2026,
  "url": "https://...",
  "tier": 1,
  "primary": true,
  "licence": "CC BY 3.0 IGO",
  "licence_confirmed": true,
  "coverage": "74 WBG projects 2000-2024",
  "locator_required": true
}
```

`primary` is `false` if you read the number in something that cites the source rather than in the
source itself. Secondary entries must be `confidence: low` until someone reads the primary.

**2. Add the entry.** Write it to a file and run `add`. It will be rejected if it breaks a rule.

```bash
python benchmark_lib.py add --file new_entry.json
```

Minimum fields: `id`, `metric`, `value{low,high,unit,n}`, `basis{price_year,currency,scope,market,kind}`,
`geography{region}`, `source_id`, `locator`, `confidence`.

`basis.scope` matters more than the number. ESMAP's central finding on the literature is that cost
categories are not standardised, so a per-km figure is meaningless until you say what it includes.
Write the scope in full: "line only, supply and erection, excludes substation, land and compensation".

**Superseding rather than deleting.** To replace an entry, set `superseded_by` on the old one to the
new id. `find` skips superseded entries. History stays.

## Where to get more data

Priority order, highest value first.

1. **ESMAP Transmission Cost Database.** The report tables (3.5 unit cost, 3.7 O&M, 3.8 discount
   rates, 4.3 LCOT simulations) are the single best source for this asset class in this geography,
   and the licence permits adaptation including commercially, with attribution. Ask ESMAP whether
   the underlying Excel database is available; the report says it is Excel-based.
2. **MISO Transmission Cost Estimation Guide.** Read the primary. The two MISO entries here are
   secondary, taken from papers citing it, and are marked accordingly.
3. **ACER Unit Investment Cost indicators.** 99 European overhead-line investments, 2012 to 2022.
4. **Awarded contract prices** from World Bank, AfDB and national procurement portals. These are
   outturn, not estimate, which makes them worth more than any study.
5. **Regulator filings** (ERA, UETCL and regional equivalents) for tariff, wheeling and RAB.

## Before production

The library cannot support Material thresholds until all of these are done. `meta.status` stays
`starter` until then.

- [ ] Set a real escalation index. Replace `PLACEHOLDER_GENERIC`. Every escalated number is
      provisional until this exists, and the answer moves with it.
- [ ] Confirm the ESMAP licence and the MISO and ACER terms.
- [ ] Read ESMAP Table 3.5 and add the World Bank sample unit costs by region and voltage. This is
      the entry that would replace the developed-market conversion with direct developing-market
      data, and it is the biggest single upgrade available.
- [ ] Verify the two bands flagged with min-to-max ratios above 3 (`TL-UC-330-345-DC-LIT`,
      `TL-UC-380-400-DC-LIT`) against the source table. The 4.413 value is a probable outlier.
- [ ] Verify the per-study attribution in ESMAP Table 2.1. The column mapping was ambiguous in text
      extraction, so entries record the band across studies rather than assign values to authors.
- [ ] Get three or more independent sources per metric that matters, so FR-18 stops capping
      everything at Advisory.
- [ ] Read the primary MISO guide and upgrade those two entries.

## Known limits, stated plainly

- **Ten of the line-cost entries are developed-market literature**, converted to a developing-market
  band by dividing by ESMAP's 1.56 to 4.35 factor. That factor is wide by design, so the resulting
  band is wide. It is honest, not precise. Direct World Bank sample data from ESMAP Table 3.5 would
  replace it.
- **The project entries are n=1.** They are held for traceability, not as benchmarks. The Bulambuli
  substation figure is identical across all three route options, which makes it a placeholder rather
  than a costed design, and it is marked as such.
- **The Bulambuli per-km rate is flat across 123, 141 and 152 km.** It carries no terrain
  differentiation, so it benchmarks pre-feasibility practice rather than feasibility practice.
- **`GG-CAPEX-400SC-2026` is whole-project scope**, not line-only. It uses a different metric name
  deliberately so it can never be compared against the line-only entries by accident.
