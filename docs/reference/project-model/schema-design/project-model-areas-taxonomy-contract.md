# Project model areas taxonomy contract

## Purpose

This document defines the contract for the governed `project_model_areas` taxonomy introduced before modularizing the project model by area.

The taxonomy gives requirements parts, graph parts, and decision parts a stable file-ownership boundary. It is intentionally separate from product `capability_id` values. Capabilities describe product or governance functionality, while project-model areas describe how governed project-model files are split and addressed.

## Schema

The taxonomy is declared in `docs/reference/project-model/governance.registry.yml` under `taxonomies.project_model_areas`.

Each allowed value must have:

- `id` using stable kebab-case.
- `description` explaining the area boundary.
- `rationale` explaining why the area exists separately from neighboring areas.
- `validation_impact` explaining how deterministic tools should treat the value.

The canonical identity form for future modular records is:

```text
<area_id>:<local_id>
```

Examples:

```text
schema-validation:REQ-0001
graph-traceability:DEC-0001
governance-control:MR-0001
```

The local identifier may repeat across different areas. The composed identifier is the canonical identity used by future graph, requirement, and decision references.

## Rules

`project_model_areas` is a governed taxonomy, not a free-form naming convention.

The taxonomy contract requires the following rules:

1. New project-model areas must be added through governed changes to `governance.registry.yml`.
2. Every taxonomy value must include a description, rationale, and validation impact before broad use.
3. `area_id` must not be derived automatically from `capability_id`. The two may be aligned where useful, but they have different semantics.
4. Modular requirements, graph, and decision parts must use only registered project-model areas once part schemas and loaders exist.
5. `tools/docs/check-docs-format.mjs` remains responsible for structural JSON Schema validation of the registry containing the taxonomy contract.
6. `tools/docs/check-project-model.mjs` must become responsible for semantic validation of `area_id` references when modular index and part files are introduced.
7. Enforcement must include negative fixture coverage before modular parts rely on the taxonomy broadly.
8. Graph traceability must connect the taxonomy, the deciding decision, the governing requirement, the specification document, and the validation gates/tools that protect the contract.

M000.024C introduces the taxonomy contract and traceability. It does not yet enforce modular `area_id` usage because the modular index and part files do not exist yet. Enforcement is reserved for M000.024D and later loader/schema steps.
