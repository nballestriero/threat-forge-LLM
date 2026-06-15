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

## Next steps

### M000.006 - Project model consistency validator

Goal: introduce a deterministic tool that validates the compact project model.

Expected scope:

- governance.registry.yml can be parsed
- requirements.registry.yml can be parsed
- graph.matrix.yml can be parsed
- graph predicates used by triples are registered
- subject/object types are compatible with predicate rules
- requirements reference existing macro requirements and capabilities
- command, gate, and validation tool nodes remain represented through SPO

### M000.007 - File format validation baseline

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
