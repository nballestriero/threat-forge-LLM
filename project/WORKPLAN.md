# Workplan

## M000 - Repository initialization

Goal: create a clean repository with a governed documentation foundation.

Status: in progress.

## Completed

- M000.001 - Initial clean repository files.
- M000.002 - Diátaxis documentation folder structure.
- M000.003 - Compact governed project model files.

## Next steps

### M000.004 - Documentation structure guard

Goal: introduce a deterministic tool that checks the documentation folder structure and prevents uncontrolled changes to the Diátaxis corpus layout.

Expected scope:

- allowed top-level documentation sections
- allowed reference subdirectories
- project-model directory presence
- no implementation code yet unless needed for the validation tool

### M000.005 - File format validation baseline

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
