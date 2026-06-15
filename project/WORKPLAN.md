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

## Next steps

### M000.008 - Harden project model validator

Goal: refine validation after the first run on the real repository.

Expected scope:

- review actual diagnostics from npm run docs:check
- decide whether any warning should become blocking
- improve diagnostics if needed
- keep validation file-level before introducing code-symbol-level traceability

### M000.009 - File format validation baseline

Goal: introduce deterministic validation for governed file formats.

Expected scope:

- YAML structure validation for project model files
- Markdown body profile validation for governed documentation files
- clear failure messages
- no Neo4j import yet

## Future

- Define product boundary.
- Define architecture baseline.
- Define first implementation slice.
