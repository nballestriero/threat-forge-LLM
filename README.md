# threat-forge-LLM

Clean restart project.

This repository is the new source of truth for the threat-forge-LLM project.

The previous threat-forge project is abandoned and is not treated as a parent, dependency, or authoritative source.
Ideas may be reintroduced later only through explicit review and fresh design decisions.

## Documentation structure

The documentation corpus follows the Diátaxis model:

- `docs/tutorials/` for learning-oriented guided paths
- `docs/how-to/` for task-oriented procedures
- `docs/reference/` for technical facts, registries, contracts, matrices, and models
- `docs/explanation/` for concepts, reasoning, decisions, and product/architecture explanations

Operational project state lives outside the documentation corpus in `project/`.

## Requirements and traceability

The requirements source of truth starts in:

- `docs/reference/requirements/macro-requirements.registry.yml`
- `docs/reference/requirements/requirements.registry.yml`
- `docs/reference/requirements/requirements-traceability.matrix.yml`

These files are intentionally structured so they can later feed deterministic checks and graph import pipelines, including a future Neo4j documentation and traceability graph.
