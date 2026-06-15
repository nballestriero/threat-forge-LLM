# Requirements reference

This directory contains the requirements and traceability source of truth.

## Files

- `macro-requirements.registry.yml` defines macro requirements.
- `requirements.registry.yml` defines requirements belonging to macro requirements.
- `requirements-traceability.matrix.yml` links requirements to documents, decisions, implementation artifacts, tests, and future graph nodes.

## Future graph import direction

The files are structured so future tooling can derive graph nodes and relationships such as:

- `MacroRequirement`
- `Requirement`
- `Document`
- `Decision`
- `Component`
- `Test`

Candidate relationships include:

- `CONTAINS`
- `SATISFIES`
- `TRACES_TO`
- `IMPLEMENTS`
- `VERIFIES`
- `EXPLAINED_BY`
- `DECIDED_BY`
