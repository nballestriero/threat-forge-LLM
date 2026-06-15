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

## Next steps

### M000.014 - Static governance control report builder

Goal: generate a valid Governance Control Report JSON from governed repository state.

Expected scope:

- `artifacts/governance-control/report.json`
- report validates against `docs/reference/contracts/governance-control-report.schema.json`
- no HTML generator yet
- no protected admin UI yet

### M000.015 - Static governance control page generator

Goal: generate a local static governance control page from the validated report.

Expected scope:

- `artifacts/governance-control/index.html`
- documentation explorer
- requirement/project-model explorer
- graph tables
- diagnostics table
- no authentication yet
- no server runtime yet

## Future

- Define product boundary.
- Define backend runtime architecture after product boundary.
- Implement deterministic backend architecture checker when backend files exist.
