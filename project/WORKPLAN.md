# Workplan

## M000 - Repository initialization

Goal: create a clean repository with a governed documentation foundation.

Status: in progress.

## Completed

- M000.001 - Initial clean repository files.
- M000.002 - Diátaxis documentation folder structure.
- M000.003 - Compact governed project model files.
- M000.004 - Documentation structure guard.
- M000.005 - Documentation structure guard requirement traceability.
- M000.006 - Taxonomies and bidirectional traceability model.
- M000.007 - Project model consistency and bidirectional traceability validator.
- M000.008 - Package script and Command node consistency.
- M000.009 - Governed file format validation baseline.
- M000.010 - Validator negative fixtures.
- M000.011 - Architecture defaults and requirement lifecycle baseline.
- M000.012 - Governance control report and page contract requirements.
- M000.013 - Governance control report JSON Schema contract.
- M000.014 - Static governance control report builder.
- M000.015 - Static governance control page generator.
- M000.016 - Governance control check execution status.
- M000.017 - Project handoff ZIP command.
- M000.018 - Project handoff ZIP project-model registration.
- M000.019 - Mandatory governed source-file registration guard.
- M000.020 - Explicit governed registry schemas requirement.
- M000.021 - Governed baseline artifact bidirectional traceability.
- M000.022A - Governance registry schema analysis.
- M000.022B - Governance registry explicit schema contract.
- M000.022C - Governance registry schema-driven validation.
- M000.022D - Bidirectional schema application traceability.
- M000.022E - Requirements registry schema analysis.
- M000.022F - Requirements registry explicit schema contract.
- M000.022G - Requirements registry schema-driven validation.
- M000.023A - Graph matrix schema analysis.
- M000.023B - Graph matrix explicit schema contract.
- M000.023C - Graph matrix schema-driven validation.
- M000.023D - Single schema validation entrypoint governance.

## Next steps

### M000.024 - Project model modularization

Goal: split the growing project-model registries by governed capability area while preserving deterministic validation, traceability, and a single logical model.

Status: planned.

Design direction:

- Use canonical composite identifiers in the form `<area_id>:<local_id>` so local sequences can restart inside each governed area.
- Keep central index files for requirements, graph traceability, and decisions.
- Move area-specific requirements, graph triples, and decisions into area parts loaded from the indexes.
- Keep `tools/docs/check-docs-format.mjs` as the single JSON Schema validation entrypoint.
- Keep `tools/docs/check-project-model.mjs` responsible for semantic aggregation and cross-file validation.
- Keep `tools/docs/check-docs-structure.mjs` responsible for required files, directories, and repository structure.

Planned micropasses:

- M000.024A - Project model modularization roadmap.
  - Scope: record the planned split of requirements, graph traceability, and decisions in this workplan.
  - No schema, loader, graph, or registry migration yet.
- M000.024B - Project model modularization analysis.
  - Scope: define area IDs, composite ID rules, index/part boundaries, cross-area relationship ownership, and decision ownership.
  - No file migration yet.
- M000.024C - Requirements index and part schema contracts.
  - Scope: design the future requirements index and requirements part schemas while preserving current validation entrypoint rules.
  - No full requirements extraction yet.
- M000.024D - Graph index and part schema contracts.
  - Scope: design graph index and graph part schemas, including cross-area graph part policy.
  - No full graph extraction yet.
- M000.024E - Decisions index and part schema contracts.
  - Scope: design decision index and decision part schemas, distinguishing global decisions from area decisions.
  - No full decision extraction yet.
- M000.024F - Modular project model loader design.
  - Scope: define how format and semantic validators will load index files and aggregate parts into one logical model.
  - No broad migration yet.
- M000.024G - First capability area extraction.
  - Scope: extract one small capability area, preferably schema validation governance, across requirements, graph triples, and decisions.
  - Keep compatibility with existing checks.
- M000.024H - Remaining capability area extraction plan.
  - Scope: use the first extraction results to plan the remaining area splits and required follow-up gates.
  - Avoid a single large migration commit.

### M000.025 - Protected baseline artifact roots

Goal: define protected roots for contracts, registry schemas, project-model registries, and future API contracts.

Expected scope:

- protected artifact root registry/policy
- deterministic detection of protected artifact changes
- traceability requirements for protected contract/schema changes
- no manual bypass when protected artifact checks fail

### M000.026 - Governance control report and page negative fixtures

Goal: add controlled negative coverage for report and page generation.

Expected scope:

- invalid report schema fixture
- invalid report builder input fixture
- invalid page rendering fixture
- no runtime product code yet

### M001.001 - Product boundary

Goal: define the clean product boundary before architecture or runtime implementation.

Expected scope:

- product purpose
- users and actors
- core capabilities
- explicit non-goals
- first vertical slice candidates

## Future

- Define backend runtime architecture after product boundary.
- Implement deterministic backend architecture checker when backend files exist.
