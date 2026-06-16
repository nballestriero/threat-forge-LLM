# Graph index and part schema contract

## Purpose

This document defines the contract direction for splitting the current monolithic `docs/reference/project-model/graph.matrix.yml` into a central graph index and area-owned graph part files.

The goal is to reduce growth pressure on a single graph matrix while preserving one logical traceability graph, deterministic validation, predicate compatibility, schema traceability, source traceability, command traceability, and future graph import.

This step is a contract step only. It does not migrate existing nodes or triples into part files, and it does not introduce modular loaders yet.

## Schema

The future modular graph model shall use a central index and one or more governed part files.

Target paths:

```text
# central index
docs/reference/project-model/graph.matrix.yml

# area-owned graph parts
docs/reference/project-model/graph/<area_id>.graph.yml

# cross-area relationship part
docs/reference/project-model/graph/cross-area.graph.yml
```

Future schema contracts should distinguish index shape from part shape:

```text
docs/reference/project-model/schemas/graph-index.schema.json
docs/reference/project-model/schemas/graph-part.schema.json
```

The graph index schema should validate only the local index shape:

```yaml
schema_version: "1.0"
change_control: {}
schema_control: {}
matrix: {}
parts:
  - area_id: schema-validation
    path: docs/reference/project-model/graph/schema-validation.graph.yml
    description: Graph nodes and triples owned by the schema-validation project-model area.
  - area_id: cross-area
    path: docs/reference/project-model/graph/cross-area.graph.yml
    description: Graph triples that intentionally connect different project-model areas.
```

The graph part schema should validate only the local part shape:

```yaml
schema_version: "1.0"
change_control: {}
schema_control: {}
area_id: schema-validation
nodes: []
triples: []
```

The schema contracts should check required fields, local object shape, arrays, local identifier string shape, and `additionalProperties: false` boundaries. They must not duplicate cross-file semantic validation.

## Rules

The following rules govern the future graph modularization contract:

1. `graph.matrix.yml` remains the canonical graph loading entrypoint, but it evolves into an index instead of a permanent monolithic node and triple container.
2. Each graph part is owned by exactly one registered `project_model_areas` value, except the dedicated `cross-area` graph part policy described below.
3. Area-owned graph parts contain nodes and triples whose ownership is local to that project-model area.
4. Canonical graph references to modular requirements, decisions, and other local records use `<area_id>:<local_id>` once modular loaders are introduced.
5. `nodes` declarations may remain centralized temporarily during migration only inside a controlled breaking-change step; the final model should make graph ownership explicit through index and part files.
6. `tools/docs/check-docs-format.mjs` remains the only JSON Schema validation entrypoint for future graph index and part schemas.
7. `tools/docs/check-project-model.mjs` remains responsible for loading the graph index, aggregating graph parts, checking duplicate nodes and triples, validating subject/predicate/object compatibility, resolving referenced entities, validating package commands, validating schema application traceability, and validating source traceability.
8. `tools/docs/check-docs-structure.mjs` remains responsible for required paths and future directory structure.
9. The migration should prefer clean coordinated changes over long-term compatibility with the current monolithic graph matrix layout.

## Cross-area graph part

A dedicated cross-area graph part should own relationships whose subject and object belong to different project-model areas.

Target path:

```text
docs/reference/project-model/graph/cross-area.graph.yml
```

The `cross-area` part is not a normal functional project-model area. It is a governed ownership boundary for relationships that intentionally connect two or more areas.

The semantic validator should enforce the following future rules:

1. A graph part with `area_id: cross-area` may contain cross-area triples.
2. A normal area graph part should not own a triple whose subject and object resolve to different non-global areas unless an explicit future exception exists.
3. Cross-area triples must still use registered predicates and compatible subject/object node types.
4. Cross-area triples must not duplicate equivalent triples in area-owned graph parts.
5. Cross-area graph ownership must be deterministic enough for future report, graph import, and impact analysis consumers.

## Relationship to project_model_areas

Future graph parts depend on the governed `project_model_areas` taxonomy.

`area_id` values in graph part files must be semantically checked by `tools/docs/check-project-model.mjs` against `taxonomies.project_model_areas`.

The `cross-area` graph part policy may be represented either as a reserved taxonomy value or as a dedicated graph index role. The first implementation should make this explicit before extraction begins so that `cross-area` does not become an uncontrolled free-form area.

## Relationship to requirements and decisions

The graph modularization contract must align with requirements and decisions modularization.

When requirements and decisions use canonical identifiers such as:

```text
schema-validation:REQ-0001
schema-validation:DEC-0001
global:DEC-0001
```

graph triples must reference those canonical IDs, not local suffixes alone.

The graph validator must aggregate requirements parts, decision parts, and graph parts before checking graph entity existence. A graph part must not be validated as an isolated standalone graph when its triples reference entities declared in other governed parts.

## JSON Schema boundary

Future graph schemas validate local file shape only.

They may validate:

- required top-level fields
- `area_id` field presence and local string shape
- `nodes` and `triples` array shape
- subject/object object shape
- required `id`, `type`, and `predicate` fields
- `additionalProperties: false`

They must not validate:

- registered node-type membership
- registered predicate membership
- subject/predicate/object compatibility
- referenced entity existence
- package script existence
- source-file bidirectional traceability
- schema application bidirectional traceability
- cross-area ownership semantics

Those checks belong to `tools/docs/check-project-model.mjs` after it has aggregated all relevant index and part files.

## Migration strategy

The graph split must happen after the requirements and graph contracts are defined and before the first area extraction.

Recommended sequence:

1. Define the graph index and part contract.
2. Define the decisions index and part contract.
3. Define the modular loader and aggregation design across requirements, graph, and decisions.
4. Introduce future graph index and part schemas through the single format-check entrypoint.
5. Extract one small area, preferably `schema-validation`, across requirements, graph triples, and decisions together.
6. Evaluate whether cross-area relationships belong in `cross-area.graph.yml` or should remain with a clearly governed owner.

M000.024F defines the future graph index and part contract. Later micropasses must define the decisions contract and loader aggregation model before extracting graph triples into area parts.
