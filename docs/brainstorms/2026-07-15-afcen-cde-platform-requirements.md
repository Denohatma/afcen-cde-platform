---
date: 2026-07-15
topic: afcen-cde-platform
---

# AfCEN CDE Platform — Build Requirements

## Problem Frame

Feasibility studies for transmission projects are run project by project, with each consultant's data, review comments, and version history scattered across email threads and static folders. Nothing learned on one assignment carries forward. The PM team's first-pass review of every submission — checking numbers, assumptions, and formats against industry norms — is done manually, from scratch, every time.

The AfCEN CDE platform solves this by hosting consultant deliverables in a structured lifecycle (WIP → Shared → Published), running automated first-pass checks against a benchmark library on submission to Shared, and accumulating benchmarks across projects so each new review is faster and better-informed than the last.

The platform's competitive advantage is its **intelligence layer** — normalised benchmarks with cost-driver adjustments, AACE accuracy verification, and AI-assisted figure extraction — not document hosting, which any VDR provides.

## Key Constraints (carry over from PRD unchanged)

- AfCEN's checks are **advisory only**. Flags are questions for the PM team, not findings against the Consultant.
- The Consultant remains the sole signatory of its own deliverables (TOR Section 8.3).
- The PM team remains the sole approval authority.
- The platform never auto-corrects or overwrites submitted figures (FR-5).
- The learning loop (FR-11) is internal only — never visible to consultants or bidders.

## Architecture Decisions

- R1. **FastAPI + Next.js**: Python FastAPI backend (benchmark engine stays native), Next.js frontend (App Router). Clean service boundary between the intelligence layer and the UI.
- R2. **Side-by-side review UX**: Original document rendered on the left, structured review panel on the right. Flags appear as cards in the review panel with links to the relevant document section/page. The PM team accepts or dismisses each flag from the review panel.
- R3. **AI-assisted figure extraction**: On document upload, the platform uses LLM/OCR to extract tables, figures, and key parameters from PDFs and spreadsheets. Extracted figures are mapped to benchmark metrics. A human (AfCEN admin) confirms the extraction before automated checks fire. No flag is raised on unconfirmed extractions.
- R4. **PostgreSQL database**: Stores projects, deliverables, versions, flags, audit trail, users, and RBAC configuration. The benchmark library remains as version-controlled JSON (library.json) loaded by the FastAPI service — the source of truth for benchmarks stays in a file that can be diffed and reviewed.
- R5. **Local-first deployment**: Docker Compose for the Saturday demo and development. Cloud deployment (Vercel + managed services) deferred to Phase B.
- R6. **Multi-project by design (FR-12)**: Project-scoped data model from day one. Benchmark library is shared across projects. Documents, deliverables, flags, and approvals are per-project. RBAC is configurable per project.

## Phased Requirements

### Phase A — Saturday Demo (July 18, 2026)

The demo must prove the mechanics that make the value proposition real. Three demo beats, in order:

- R7. **Document lifecycle**: Upload a document, move it through WIP → Shared → Published. Show the audit trail: who submitted, who reviewed, who approved, with timestamps. (FR-1)
- R8. **Automated check on submission to Shared**: When a deliverable moves to Shared, the platform runs Part A universal checks (U-1 through U-10 from the FS Review Standard) and Part C benchmark checks. Flags appear in the side-by-side review panel with severity (Blocking/Material/Advisory) and the reference source. (FR-4, FR-5)
- R9. **Demo beat 1 — Arithmetic flag**: Show the real arithmetic error from the reference PFS Table 8: a non-currency quantity (land acres) summed into a currency total, producing a $1,314.75 discrepancy across all three route options. This is check U-2 (units) and U-3 (recomputation). (FS Review Standard Section 8)
- R10. **Demo beat 2 — Normalisation sequence**: Show a naive benchmark check raising two false Material flags (PFS rate vs. ACER Europe, PFS rate vs. NCEP US), then show normalisation clearing the figure by applying the ESMAP developing-market adjustment and raising the real flag instead: the rate is plausible in aggregate but not terrain-differentiated for the Mt. Elgon foothills section. Show the full normalisation chain with adjustment factors. (FR-15, FR-17, Benchmark Addendum Section 2)
- R11. **Demo beat 3 — AACE accuracy check**: Show the Ghanzi-Gobabis PFS's stated ±35% accuracy range flagged as symmetric — no AACE class has a symmetric band, so it was asserted rather than risk-derived. Run this against AfCEN's own work, not the consultant's, to demonstrate fairness. (FR-24, Benchmark Addendum Section 6.1)
- R12. **PM dashboard**: Open flags by severity, upcoming decision-gate dates, turnaround time on the most recent submission. Filterable by deliverable. (FR-6)
- R13. **One-click export**: Export all Published-state material into a structured package (ZIP with a manifest). (FR-8)
- R14. **Before/after moment**: Show a second submission where the benchmark library now includes a figure from the first Published deliverable (FR-11 direction of travel), and the check resolves faster or more precisely. Does not need real learning — a staged second pass is sufficient for the demo.

### Phase B — Consultant Mobilisation

All Phase A requirements plus:

- R15. **Role-based access control**: Four personas with enforced boundaries per the PRD persona table. Consultant: submit, cannot approve or publish. AfCEN admin: run checks, maintain library, cannot approve. PM team: review, accept/dismiss flags, approve to Published. Developer/sponsors: read-only access to Published material only. Configurable per project. (FR-2)
- R16. **Deliverable tracking (D1–D11)**: Track each deliverable against the TOR Section 8.1 timeline. Flag any deliverable at risk of missing its gate date. (FR-7)
- R17. **File format support**: Accept and preview GIS (Shapefile/GeoPackage), CAD (DWG/DXF), power system model (PowerFactory/PSS/E), PLS-CADD, and spreadsheet files. Preview in the side-by-side document panel, native download always available. (FR-9)
- R18. **Specialist tool connectors**: API connection points for third-party validation tools (hydrology, wind resource, power system studies). Their outputs are captured in the same review and flag layer. (FR-10)
- R19. **Benchmark library management UI**: AfCEN admin can add sources, add entries, escalate prices, manage confidence levels, and supersede entries — all through the platform UI, not just the CLI. Validation rules (FR-14 through FR-18) enforced on every operation. (FR-3, FR-13)
- R20. **Learning loop**: When a deliverable reaches Published, its key figures are extracted and proposed as new benchmark entries. AfCEN admin reviews and confirms before they enter the library. Anti-circularity enforced: a project's own entries are excluded when checking that project's submissions. (FR-11)
- R21. **Methodology conformance checks (FR-20)**: Check whether required studies were performed (load flow, N-1, stability) against the applicable grid code and the FS Review Standard, separately from result conformance.
- R22. **AACE class verification (FR-23)**: Check that the declared estimate class matches the deliverable maturity actually evidenced. Flag a class claimed but not supported.
- R23. **Cloud deployment**: Move from Docker Compose to cloud hosting (Vercel for Next.js, managed service for FastAPI, managed PostgreSQL, S3-compatible object storage for files). Encryption in transit and at rest, full audit log. (NFR 6.1)

### Phase C — Reusability and Replication

All Phase B requirements plus:

- R24. **Methodology replication (FR-19)**: Re-run analysis using the same class of tool as the Consultant: MAED-class demand modelling, OSeMOSYS-class capacity expansion, PSS/E or PowerFactory network studies, PLS-CADD line design. Only where the platform holds the required inputs — where inputs are absent, report that the check could not be run, never substitute a public proxy. (FR-19, FR-21, FR-22)
- R25. **Multi-project provisioning**: Provision a new project instance through the admin UI without modifying the core codebase. Shared benchmark library, independent document spaces, project-specific RBAC. (FR-12)
- R26. **Source register lifecycle (FR-13)**: Automated re-check of each source for newer editions on a defined cycle. Tier management. Licence tracking.
- R27. **LCOT computation**: Compute Levelised Cost of Transmission as a reference for wheeling charges where a regulated tariff is missing, per the ESMAP framework. (Benchmark Addendum Section 7, GG-WHEELING-2026 entry)

## Success Criteria

- SC1. First-pass review turnaround on a deliverable goes from fully manual to hours-to-days.
- SC2. Flag-accepted versus flag-dismissed rate is useful, not noisy. Target: the PM team accepts more flags than they dismiss, meaning the threshold is conservative enough.
- SC3. A measurable share of the benchmark library carries into the next IPT project without rebuilding.
- SC4. Zero incidents of the platform being perceived as replacing the PM team's or the Consultant's judgement.
- SC5. The Saturday demo answers Arnold's objection concretely: the platform takes the arithmetic hygiene so the PM team's time goes to the engineering.

## Scope Boundaries

- The platform does NOT replace the PM team's review or the Consultant's sign-off.
- The platform does NOT auto-correct submitted figures.
- The benchmark library's normalised values, driver factors, and confidence fields are AfCEN's internal asset — never visible to consultants or bidders.
- FR-11 (learning loop) is never described externally as anything beyond "version tracking and quality assurance."
- Part A and Part B of the FS Review Standard (what a deliverable must contain) may be shared with bidders if the Developer chooses. Part C (benchmark values and provenance) stays internal.
- The platform does NOT substitute public proxies for absent inputs in methodology replication (FR-19). If the input isn't available, the check reports it could not run.

## Key Decisions

- **FastAPI + Next.js over a monolith**: The benchmark engine is already Python; keeping it native avoids a port and preserves the CLI for standalone use. The frontend gets React's component model for the side-by-side review UX.
- **Side-by-side over inline annotations or standalone reports**: Avoids PDF overlay complexity while keeping flags in visual context with the source document. The review panel is the PM team's workspace.
- **AI-assisted extraction over structured templates**: Lets the consultant submit in their existing format (PDF, spreadsheet) rather than forcing a template. Reduces friction at the cost of an extraction-confirmation step. The confirmation step is a feature, not a workaround — it keeps a human in the loop before any flag fires.
- **Benchmark library stays as JSON, not in PostgreSQL**: The library is version-controlled, diffable, and reviewable. The Python engine loads it directly. Database-backed would add an ORM layer with no clear benefit for a dataset this size.
- **Local-first for the demo**: Fastest path to Saturday. Docker Compose avoids cloud-provider setup overhead. Cloud deployment is a Phase B task.
- **Working demo over prototype**: The briefing note warns that the demo "needs to hold up if anyone asks a direct technical question about current state." Real data flowing through real checks is the only way to do that.

## Dependencies / Assumptions

- A synthetic reference PFS with Table 8 data will be created from the documented figures in the FS Review Standard and benchmark library.
- The benchmark library (library.json v0.1.0) and the check engine (benchmark_lib.py) are functional and validated.
- LLM API access (Claude API) is available for the AI extraction pipeline.
- Docker and Docker Compose are available on the development machine.
- The escalation index remains a placeholder for the demo. Material thresholds are not set until the index is confirmed (FR-15).
- TOR Section 8.1 (deliverable timing D1–D11) is needed for R16 but not required for the demo.

## Outstanding Questions

### Resolve Before Planning

None — all blocking questions resolved.

### Resolved

- ~~Do we have the reference PFS as a PDF?~~ **Decision**: Create a synthetic reference PFS with Table 8 data from the FS Review Standard Section 8 and the benchmark library. All figures are documented: 153,846 USD/km OHL, three route options (123/141/152 km), $5M substation, 10% contingency, 5% consultancy, 500 USD/km ESIA/RAP, ~8.65 acres/km land take, 1,000 USD/acre compensation. Include the arithmetic error (acres summed into the currency total) as documented.

### Deferred to Planning

- [Affects R3][Technical] Which LLM model and prompting strategy should drive the table extraction pipeline? Needs experimentation with the reference PFS to determine extraction accuracy.
- [Affects R15][Technical] What auth provider for Phase B? (NextAuth, Clerk, custom JWT — depends on deployment target.)
- [Affects R17][Needs research] What libraries or services handle in-browser preview of Shapefiles, DWG/DXF, and PowerFactory files? This is the hardest part of FR-9.
- [Affects R19][Technical] How do the benchmark library management UI operations (add, supersede, escalate) handle concurrency if multiple admins are working?
- [Affects R24][Needs research] What open-source or licensable tools can run PSS/E-class and PLS-CADD-class analysis programmatically for the replication capability?
- [Affects R4][Technical] Database schema design — how do projects, deliverables, versions, flags, and the audit trail relate? Planning should design this before coding.
- [Affects R8][Technical] Which Part A checks (U-1 through U-10) can be automated for the demo, and which need the full AI extraction pipeline to work first?

## Next Steps

→ `/ce:plan` for structured implementation planning.
