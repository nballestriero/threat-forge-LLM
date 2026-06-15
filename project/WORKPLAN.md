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

## Next steps

### M000.007 - Project model consistency validator

Goal: introduce a deterministic tool that validates the compact project model.

Expected scope:

- governance.registry.yml can be parsed
- requirements.registry.yml can be parsed
- graph.matrix.yml can be parsed
- controlled taxonomies are enforced
- governed IDs are unique
- governed IDs follow the expected patterns
- graph predicates used by triples are registered
- subject/object types are compatible with predicate rules
- requirements reference existing macro requirements and capabilities
- command, gate, and validation tool nodes remain represented through SPO

### M000.008 - Bidirectional source traceability validator

Goal: validate matrix-to-code and code-to-matrix traceability.

Expected scope:

- IMPLEMENTED_BY SourceFile triples point to existing files
- referenced source files declare related requirements in file-level JSDoc
- source-file JSDoc claims have matching IMPLEMENTED_BY triples
- validation tool nodes claimed by source comments exist in graph.matrix.yml
- initial validation remains file-level, not code-symbol-level

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
