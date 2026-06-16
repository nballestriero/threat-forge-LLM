# Project Model Modularization Analysis

## Purpose

This document defines how the governed project model can be split by stable project-model area without losing deterministic validation, bidirectional traceability, or a single logical model.

The current project model is intentionally compact, but three baseline artifacts are growing together:

- `docs/reference/project-model/requirements.registry.yml`
- `docs/reference/project-model/graph.matrix.yml`
- `docs/reference/project-model/governance.registry.yml`, especially decisions

The target architecture is not a set of independent models.
The target is a modular project model whose central indexes load area-owned parts and whose validators aggregate those parts into one deterministic logical model.

This analysis exists before any migration because requirements, traceability triples, and decisions must be modularized together.
Splitting only one of them would move the scaling problem to another monolithic file.

## Schema

### Canonical identity

The modular project model shall use canonical composite identifiers in this form:

```text
<area_id>:<local_id>
```

Examples:

```text
schema-validation:REQ-0001
schema-validation:MR-0001
schema-validation:DEC-0001
graph-traceability:REQ-0001
governance-control:DEC-0001
global:DEC-0001
```

The local ID sequence may restart inside each governed area.
The canonical ID is the full composed value, not the local suffix alone.

This means `REQ-0001` can exist in more than one area only after the project model has a loader and semantic validator that always resolve it through its `area_id`.
Until that modular model is implemented, the current monolithic identifiers remain valid.

### Project model areas taxonomy

`area_id` shall be controlled by an explicit `project_model_areas` taxonomy.
It must not be an informal convention or a value derived automatically from `capability_id`.

The boundary is:

| Concept | Purpose |
| --- | --- |
| `area_id` | Physical and governance boundary for modular project-model files. |
| `capability_id` | Product or functional capability boundary. |

The two should be aligned where useful, but they are not the same field.
A single capability may need more than one project-model area, and a project-model area may exist to govern documentation infrastructure that is not a product capability by itself.

Before modular parts rely broadly on `area_id`, the `project_model_areas` taxonomy must have:

- a registered taxonomy identifier;
- a description for the taxonomy itself;
- a description for every allowed value;
- deterministic validation coverage;
- bidirectional implementation traceability;
- negative fixture coverage when enforcement is introduced.

The validation split remains the same:

| Concern | Owner |
| --- | --- |
| `area_id` field shape and requiredness | `tools/docs/check-docs-format.mjs` through JSON Schema. |
| `area_id` value exists in `project_model_areas` | `tools/docs/check-project-model.mjs`. |
| taxonomy value descriptions exist | `tools/docs/check-project-model.mjs`. |
| taxonomy enforcement has graph and source traceability | `tools/docs/check-project-model.mjs`. |
| invalid area values are rejected by fixture | `tools/docs/check-validator-negative-fixtures.mjs`. |

Introducing the taxonomy therefore requires its own governed contract and enforcement steps before broad extraction.

### Requirements index and parts

The current requirements registry should evolve into an index plus area parts.

Target layout:

```text
docs/reference/project-model/requirements.registry.yml
docs/reference/project-model/requirements/
  schema-validation.requirements.yml
  graph-traceability.requirements.yml
  governance-control.requirements.yml
```

The root file becomes the canonical requirements index.
Each requirements part belongs to exactly one `area_id` and contains the macro requirements and atomic requirements owned by that area.

Every atomic requirement must still belong to a macro requirement.
Parent references should resolve as follows:

| Reference form | Rule |
| --- | --- |
| `MR-0001` | Local reference inside the same area part. |
| `schema-validation:MR-0001` | Canonical reference, required for cross-area parent references. |

Cross-area parent ownership should be rare.
When required, it must use the canonical composite identifier.

### Graph index and parts

The graph matrix should evolve into an index plus graph parts.

Target layout:

```text
docs/reference/project-model/graph.matrix.yml
docs/reference/project-model/graph/
  schema-validation.graph.yml
  graph-traceability.graph.yml
  governance-control.graph.yml
  cross-area.graph.yml
```

The root file becomes the canonical graph index.
Each graph part contains nodes and triples owned by one area.
The semantic validator aggregates all graph parts into one logical graph before validating predicate existence, subject/object compatibility, duplicate SPO relationships, entity existence, schema traceability, command traceability, and source traceability.

If requirements are modularized but graph triples stay monolithic, the project only moves the scaling problem from the requirements registry to the graph matrix.
Graph traceability must therefore be modularized as part of the same project-model roadmap.

### Cross-area graph relationships

Area-internal relationships belong to the area graph part.
Relationships whose subject and object belong to different areas should be owned by a dedicated cross-area graph part unless a more specific governance rule is introduced later.

Recommended target:

```text
docs/reference/project-model/graph/cross-area.graph.yml
```

Example relationship:

```yaml
area_id: cross-area

triples:
  - subject:
      id: schema-validation:REQ-0001
      type: Requirement
    predicate: DEPENDS_ON
    object:
      id: governance-control:REQ-0003
      type: Requirement
```

This avoids duplicating cross-area relationships in both endpoint areas and creates an explicit ownership point for dependency edges.

### Decisions index and parts

Decisions should also be modularized.
Keeping decisions monolithic while requirements and graph parts become modular would leave `governance.registry.yml` as the next scaling bottleneck.

Target layout:

```text
docs/reference/project-model/governance.registry.yml
docs/reference/project-model/decisions/
  global.decisions.yml
  schema-validation.decisions.yml
  graph-traceability.decisions.yml
  governance-control.decisions.yml
```

Decision ownership rules:

| Decision kind | Owner |
| --- | --- |
| Global project-model decision | `global.decisions.yml` |
| Area-specific decision | Matching area decisions part |
| Cross-cutting decision | Global decision, or explicitly linked from affected areas |

Decision IDs follow the same canonical identity rule:

```text
<area_id>:<local_id>
```

Examples:

```text
global:DEC-0001
schema-validation:DEC-0001
graph-traceability:DEC-0001
```

The root governance registry should keep shared vocabularies, taxonomies, node types, predicates, and indexes.
It should not remain the permanent container for every decision.

### Central indexes

The project keeps these central index files:

```text
docs/reference/project-model/requirements.registry.yml
docs/reference/project-model/graph.matrix.yml
docs/reference/project-model/governance.registry.yml
```

Those indexes declare part files and provide the canonical loading boundary.
The logical project model is the aggregation of:

```text
requirements index + requirements parts
graph index + graph parts
governance registry + decision parts
```

### Future schema contracts

Future schema work should introduce explicit contracts for index files and part files.

Likely future contracts:

```text
requirements-index.schema.json
requirements-part.schema.json
graph-index.schema.json
graph-part.schema.json
decisions-index.schema.json
decisions-part.schema.json
```

These schemas validate local shape only.
They must not duplicate semantic graph validation, command existence validation, source-file validation, package script validation, controlled taxonomy membership, or cross-file existence checks.
Those checks remain responsibilities of `tools/docs/check-project-model.mjs`.

## Rules

### Validator responsibilities

The existing validator responsibility split remains unchanged.

| Tool | Responsibility |
| --- | --- |
| `tools/docs/check-docs-structure.mjs` | Required files, directories, and repository structure. |
| `tools/docs/check-docs-format.mjs` | JSON Schema validation, local file format validation, and Markdown body profiles. |
| `tools/docs/check-project-model.mjs` | Aggregated semantic model, cross-file traceability, controlled vocabulary membership, graph relationships, command checks, source checks, and schema application traceability. |

`tools/docs/check-docs-format.mjs` remains the single deterministic entrypoint for governed artifact JSON Schema validation.
No other tool should duplicate artifact JSON Schema validation logic.

### Clean migration policy

The project is still before first release.
The modularization may therefore introduce clean breaking changes to the project model when those changes are coordinated across schemas, tooling, documentation, graph traceability, requirements, decisions, and tests.

The migration should not preserve long-term compatibility with the previous monolithic layout.
Temporary dual support is allowed only inside a single controlled migration step when it is necessary to keep deterministic gates green, and it must be removed as soon as the new modular model is fully established.

### Area taxonomy governance rule

If a new controlled taxonomy is introduced, such as `project_model_areas`, it must be governed as a first-class project-model artifact.

That means a taxonomy contract step must define the taxonomy, its values, and its traceability before broad modular parts rely on it.
A taxonomy enforcement step must then add deterministic validation, bidirectional implementation traceability, and negative fixture evidence.

At minimum, the graph must connect:

- the requirement that introduces the taxonomy;
- the decision that separates `area_id` from `capability_id`;
- the taxonomy registry entry or governed taxonomy artifact;
- the validation tool that enforces it;
- the command and gate that execute the check;
- the negative fixture that proves invalid values fail once enforcement exists.

### Migration sequence

The modularization should proceed in small governed steps:

1. Define the project model modularization analysis.
2. Define the project-model areas taxonomy contract.
3. Enforce the project-model areas taxonomy with deterministic tooling.
4. Define requirements index and part schema contracts.
5. Define graph index and part schema contracts.
6. Define decisions index and part schema contracts.
7. Design modular project model loader aggregation.
8. Extract one small capability area.
9. Evaluate the first extraction.
10. Plan and execute remaining area extractions incrementally.

The first extracted area should be small and high-value, preferably `schema-validation`, because it already has clear requirements, decisions, graph relationships, schemas, validation commands, and negative fixture evidence.

### Risks

The main risks are:

- splitting files without a canonical aggregated model;
- allowing `area_id` values to grow without a controlled taxonomy;
- duplicating JSON Schema validation outside `tools/docs/check-docs-format.mjs`;
- losing traceability between requirements, decisions, graph triples, tools, commands, fixtures, and source files;
- creating ambiguous ownership for cross-area relationships;
- leaving decisions monolithic while requirements and graph parts become modular;
- introducing compatibility layers that become permanent accidental architecture.

### Conclusion

The project should modularize requirements, graph traceability, and decisions by governed project-model area.

The canonical identity model is `<area_id>:<local_id>`.

`area_id` must be controlled by an explicit `project_model_areas` taxonomy, aligned with functional capabilities where useful but not derived from them automatically.

The taxonomy must have deterministic validation, bidirectional traceability, and negative fixture coverage before modular parts rely on it broadly.

Central index files remain the loading and governance boundary.
The validators keep their current responsibility split:

```text
structure checker -> repository structure
format checker    -> schema and local format
project checker   -> aggregated semantic model
```
