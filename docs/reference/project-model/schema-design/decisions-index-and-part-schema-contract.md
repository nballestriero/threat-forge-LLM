# Decisions index and part schema contract

## Purpose

This document defines the contract direction for splitting decision records currently stored in `docs/reference/project-model/governance.registry.yml` into a central governance index and area-owned decision part files.

The goal is to reduce growth pressure on the governance registry while preserving one logical governance model, controlled vocabularies, decision traceability, and deterministic validation.

This step is a contract step only. It does not migrate existing decisions into part files, and it does not introduce modular loaders yet.

## Schema

The future modular decision model shall use the governance registry as the central governance index and one or more governed decision part files.

Target paths:

```text
# central governance index and shared vocabulary registry
docs/reference/project-model/governance.registry.yml

# global decisions
docs/reference/project-model/decisions/global.decisions.yml

# area-owned decisions
docs/reference/project-model/decisions/<area_id>.decisions.yml
```

Future schema contracts should distinguish the shared governance index shape from the decision part shape:

```text
docs/reference/project-model/schemas/governance-index.schema.json
docs/reference/project-model/schemas/decisions-part.schema.json
```

The governance index schema should validate only the local index and shared vocabulary shape:

```yaml
schema_version: "1.0"
change_control: {}
schema_control: {}
registry: {}
taxonomies: {}
capabilities: []
document_types: []
body_profiles: []
node_types: []
predicates: []
decision_parts:
  - area_id: global
    path: docs/reference/project-model/decisions/global.decisions.yml
    description: Cross-cutting decisions that intentionally govern more than one project-model area.
  - area_id: schema-validation
    path: docs/reference/project-model/decisions/schema-validation.decisions.yml
    description: Decisions owned by the schema-validation project-model area.
```

The decisions part schema should validate only the local part shape:

```yaml
schema_version: "1.0"
change_control: {}
schema_control: {}
area_id: schema-validation
decisions: []
```

The schema contracts should check required fields, local object shape, arrays, decision local identifier string shape, and `additionalProperties: false` boundaries. They must not duplicate cross-file semantic validation.

## Rules

The following rules govern the future decisions modularization contract:

1. `governance.registry.yml` remains the canonical governance loading entrypoint, but it evolves away from being the permanent monolithic container for every decision.
2. Shared vocabularies, taxonomies, capabilities, document types, body profiles, graph node types, and predicates remain governed through the central governance registry or a future explicitly governed vocabulary split.
3. Each decisions part is owned by exactly one registered `project_model_areas` value.
4. The `global` decisions part owns decisions that intentionally apply to more than one project-model area or define repository-wide project-model policy.
5. Area-specific decisions belong in the matching `<area_id>.decisions.yml` part once modular loaders are introduced.
6. Canonical decision identity uses `<area_id>:<local_id>` once modular loaders are introduced.
7. Local identifiers such as `DEC-0001` may repeat across areas only after canonical composite identifiers are supported by the semantic loader.
8. Graph references to modular decisions must use canonical IDs, not local suffixes alone.
9. `tools/docs/check-docs-format.mjs` remains the only JSON Schema validation entrypoint for future governance index and decisions part schemas.
10. `tools/docs/check-project-model.mjs` remains responsible for loading the governance index, aggregating decision parts, resolving canonical decision IDs, checking duplicate canonical IDs, validating decision references, and validating graph traceability.
11. `tools/docs/check-docs-structure.mjs` remains responsible for required paths and future directory structure.
12. The migration should prefer clean coordinated changes over long-term compatibility with the current monolithic decisions layout.

## Decision ownership

Decision ownership follows the governed project-model area boundary.

A decision belongs to `global` when it defines a rule, policy, or constraint that intentionally governs multiple project-model areas.

A decision belongs to a functional project-model area when it explains, accepts, rejects, or supersedes a design choice specific to that area.

Examples:

```text
global:DEC-0001
schema-validation:DEC-0001
graph-traceability:DEC-0001
requirements-governance:DEC-0001
```

The `global` area must not become a dumping ground for decisions that merely lack an extracted part. During migration, decisions may temporarily remain in the central governance registry until the modular loader and first extraction step move them into explicit parts.

## Relationship to requirements and graph traceability

The decisions modularization contract must align with requirements and graph modularization.

When requirements and graph records use canonical identifiers such as:

```text
schema-validation:REQ-0001
schema-validation:DEC-0001
global:DEC-0001
```

The graph validator must aggregate requirements parts, decision parts, and graph parts before checking graph entity existence and relationship compatibility.

Decision references in graph triples must remain deterministic:

- decisions may `DECIDES` requirements or documents
- decisions may `DEPENDS_ON`, `SUPERSEDES`, or `CONFLICTS_WITH` other decisions when supported by the governed predicate vocabulary
- requirements may be linked to decisions through the existing graph traceability model
- cross-area decision relationships must be represented explicitly and must not be duplicated across decision parts

## JSON Schema boundary

Future decisions schemas validate local file shape only.

They may validate:

- required top-level fields
- `area_id` field presence and local string shape
- `decisions` array shape
- decision local ID shape
- decision status field shape
- required decision title, statement, rationale, and consequences fields
- `additionalProperties: false`

They must not validate:

- registered `area_id` membership
- duplicate canonical decision IDs across parts
- graph node existence
- graph predicate compatibility
- requirement references
- command existence
- schema application bidirectional traceability
- source-file bidirectional traceability

Those checks belong to `tools/docs/check-project-model.mjs` after it has aggregated all relevant index and part files.

## Migration strategy

The decisions split must happen after requirements and graph contracts are defined and before the first area extraction.

Recommended sequence:

1. Define the decisions index and part contract.
2. Define the modular loader and aggregation design across requirements, graph, and decisions.
3. Introduce future governance index and decisions part schema contracts through the single format-check entrypoint.
4. Extract one small area, preferably `schema-validation`, across requirements, graph triples, and decisions together.
5. Evaluate whether cross-area decision relationships belong in global decisions, the cross-area graph part, or a future governed exception.

M000.024G defines the future decisions index and part contract. Later micropasses must define the modular loader aggregation model before extracting decision records into area parts.
