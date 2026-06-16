# Requirements index and part schema contract

## Purpose

This document defines the contract direction for splitting the current monolithic `docs/reference/project-model/requirements.registry.yml` into a central requirements index and area-owned requirements part files.

The goal is to reduce growth pressure on a single requirements registry while preserving one logical requirements model, deterministic validation, and graph traceability.

This step is a contract step only. It does not migrate existing macro requirements or atomic requirements into part files, and it does not introduce modular loaders yet.

## Schema

The future modular requirements model shall use a central index and one or more governed part files.

Target paths:

```text
# central index
docs/reference/project-model/requirements.registry.yml

# area-owned parts
docs/reference/project-model/requirements/<area_id>.requirements.yml
```

Future schema contracts should distinguish index shape from part shape:

```text
docs/reference/project-model/schemas/requirements-index.schema.json
docs/reference/project-model/schemas/requirements-part.schema.json
```

The requirements index schema should validate only the local index shape:

```yaml
schema_version: "1.0"
change_control: {}
schema_control: {}
registry: {}
parts:
  - area_id: schema-validation
    path: docs/reference/project-model/requirements/schema-validation.requirements.yml
    description: Requirements owned by the schema-validation project-model area.
```

The requirements part schema should validate only the local part shape:

```yaml
schema_version: "1.0"
change_control: {}
schema_control: {}
area_id: schema-validation
macro_requirements: []
requirements: []
```

The schema contracts should check required fields, local object shape, arrays, identifier string shape, and `additionalProperties: false` boundaries. They must not duplicate cross-file semantic validation.

## Rules

The following rules govern the future requirements modularization contract:

1. `requirements.registry.yml` remains the canonical loading entrypoint for requirements, but it evolves into an index instead of a permanent monolithic requirement container.
2. Each requirements part is owned by exactly one registered `project_model_areas` value.
3. Canonical requirement identity uses `<area_id>:<local_id>` once modular loaders are introduced.
4. Local identifiers such as `REQ-0001`, `MR-0001`, and `FLOW-REQ-0001-001` may repeat across areas only after canonical composite identifiers are supported by the semantic loader.
5. Every atomic requirement must continue to reference a parent macro requirement.
6. Same-area parent references may use local IDs; cross-area parent references must use canonical IDs and should remain rare.
7. `tools/docs/check-docs-format.mjs` remains the only JSON Schema validation entrypoint for future requirements index and part schemas.
8. `tools/docs/check-project-model.mjs` remains responsible for loading the requirements index, aggregating requirements parts, resolving canonical IDs, checking parent macro existence, validating capability references, and checking graph traceability.
9. `tools/docs/check-docs-structure.mjs` remains responsible for required paths and future directory structure.
10. The migration should prefer clean coordinated changes over long-term compatibility with the current monolithic requirements layout.

M000.024E defines the future requirements index and part contract. Later micropasses must define equivalent graph and decisions contracts before introducing a modular loader or extracting the first project-model area.
