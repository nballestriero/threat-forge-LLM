# Schema-validation area canonical ID enforcement and control review

## Purpose

This document records the post-extraction review for the first modular project-model area.

M000.024I proved that `schema-validation` requirements, decisions, and graph triples can be loaded from area-owned part files and validated as one logical project model. This review activates the canonical modular identity model for that extracted area, explicitly rejects legacy extracted IDs as compatibility aliases, and records the current bidirectional and cross-file controls before additional areas are extracted.

## Scope

The reviewed area is:

```text
schema-validation
```

The reviewed part files are:

```text
docs/reference/project-model/requirements/schema-validation.requirements.yml
docs/reference/project-model/decisions/schema-validation.decisions.yml
docs/reference/project-model/graph/schema-validation.graph.yml
```

This step does not extract additional areas. It only normalizes IDs and reviews controls for the already extracted pilot area.

## Schema

This review does not introduce a new JSON Schema artifact. It relies on the existing part schemas:

```text
docs/reference/project-model/schemas/requirements-part.schema.json
docs/reference/project-model/schemas/decisions-part.schema.json
docs/reference/project-model/schemas/graph-part.schema.json
```

Local file shape remains validated by `tools/docs/check-docs-format.mjs`. Canonical ID derivation, legacy-ID rejection, local-only graph-reference rejection, and cross-file consistency remain semantic validation responsibilities of `tools/docs/check-project-model.mjs`.

## Rules

The review establishes these rules for the extracted `schema-validation` area:

1. Requirements and decisions inside part files use area-local IDs.
2. The semantic aggregate derives canonical IDs as `<area_id>:<local_id>`.
3. Graph references to modular requirements and decisions use canonical IDs.
4. Local-only modular IDs are allowed only inside the owning requirements or decisions part file.
5. Removed legacy global IDs are not aliases and must not be accepted.
6. Source traceability must cite canonical modular requirement IDs.
7. Additional area extractions must not proceed until the pilot-area controls are understood.

## Canonical ID activation

The part files keep local IDs for authoring and schema validation.

Examples:

```text
REQ-0001
REQ-0002
DEC-0001
DEC-0002
```

The semantic project-model loader derives canonical aggregate IDs by combining the part `area_id` with each local ID:

```text
schema-validation:REQ-0001
schema-validation:REQ-0002
schema-validation:DEC-0001
schema-validation:DEC-0002
```

Graph references to requirements and decisions owned by the extracted area must use the canonical IDs, not the local suffixes alone.

This confirms the intended split:

```text
part file authoring ID = local ID
logical model ID      = <area_id>:<local_id>
graph reference ID    = canonical logical model ID
```

## Legacy ID policy

The project is still before first release, so this migration does not keep long-term compatibility aliases.

The following removed legacy IDs are no longer valid references for the extracted area:

```text
REQ-0023..REQ-0033
DEC-0014..DEC-0024
```

They were replaced by:

```text
schema-validation:REQ-0001..schema-validation:REQ-0011
schema-validation:DEC-0001..schema-validation:DEC-0011
```

A reference to a removed legacy ID is a model error, not an accepted fallback.

## Current bidirectional controls

The project already has these bidirectional or cross-file controls.

### Schema application traceability

Control:

```text
SchemaFile x-applies_to
artifact schema_control.schema
graph APPLIES_TO triple
```

Validator:

```text
tools/docs/check-project-model.mjs
```

Status:

```text
present
```

This applies to root project-model artifacts and modular part schemas.

### Baseline artifact change control

Control:

```text
artifact change_control.satisfies
artifact change_control.decided_by
graph SPECIFIED_BY triple
graph DECIDES triple
```

Validator:

```text
tools/docs/check-project-model.mjs
```

Status:

```text
present
```

The control covers loaded modular part files through the aggregate model.

### Source traceability

Control:

```text
graph IMPLEMENTED_BY SourceFile
source-file JSDoc Related requirements
```

Validator:

```text
tools/docs/check-project-model.mjs
```

Status:

```text
present
```

The source traceability parser accepts canonical modular requirement references such as `schema-validation:REQ-0001` and rejects removed schema-validation legacy requirement IDs.

### Project-model area taxonomy

Control:

```text
project_model_areas taxonomy
part declaration area_id
part.part.area_id
part path convention
```

Validator:

```text
tools/docs/check-project-model.mjs
```

Status:

```text
present
```

This prevents modular part files from using unregistered area identifiers or mismatched index/part ownership.

### JSON Schema validation entrypoint

Control:

```text
check-docs-format.mjs applies canonical schemas to root files and part files
```

Validator:

```text
tools/docs/check-docs-format.mjs
```

Status:

```text
present
```

The format checker remains the only deterministic JSON Schema validation entrypoint.

### Local duplicate IDs inside parts

Control:

```text
part-local requirement IDs
part-local decision IDs
canonical aggregate IDs
```

Validator:

```text
tools/docs/check-project-model.mjs
```

Status:

```text
present
```

The validator checks duplicate local IDs for modular requirements and decisions before broad extraction continues.

### Canonical graph references for modular entities

Control:

```text
graph part Requirement and Decision references
area-local modular IDs
canonical <area_id>:<local_id> IDs
```

Validator:

```text
tools/docs/check-project-model.mjs
```

Status:

```text
present
```

The validator rejects local-only graph references to requirements or decisions owned by the same modular area.

### Removed legacy ID rejection

Control:

```text
removed schema-validation REQ and DEC IDs
canonical replacement IDs
graph triples
source traceability references
```

Validator:

```text
tools/docs/check-project-model.mjs
```

Status:

```text
present
```

The validator rejects removed `schema-validation` legacy IDs instead of accepting them as aliases.

## Current cross-file controls

The aggregate semantic validator currently checks these cross-file relationships after loading root files and declared parts:

- duplicate governed IDs after canonicalization
- duplicate local modular IDs inside requirements and decisions parts
- known requirements, macro requirements, decisions, capabilities, matrix nodes, and repository-backed artifacts
- predicate existence and subject/object type compatibility
- package command existence for governed validation commands
- required command-to-package traceability
- required source-file registration for governed source roots
- schema application traceability
- baseline artifact change-control traceability
- source-file JSDoc to graph traceability
- modular part area and path consistency
- canonical graph references for modular requirements and decisions
- removed schema-validation legacy ID rejection

## Remaining controls to consider

The first area extraction shows that additional controls are desirable before broad extraction.

### Cross-area ownership checks

The graph contract defines a future `cross-area.graph.yml` owner for relationships whose subject and object belong to different areas.

A future validator should detect cross-area triples placed in an area graph part unless a governed exception exists.

### Same-area local reference policy beyond graph

Requirements parts may still contain same-area local references in internal fields, while graph references use canonical IDs.

A future validator should make this rule explicit for every cross-reference field after more areas are extracted.

### Part coverage report

A future report should show, per area:

- requirement count
- decision count
- graph triple count
- implemented requirements
- verified requirements
- schema-controlled part files
- missing or advisory controls

This should be a report or page concern, not a replacement for blocking validators.

## Conclusion

The first extracted area now uses the canonical modular identity model without retaining compatibility aliases for removed global IDs.

The project keeps local IDs inside part files, derives canonical IDs during semantic aggregation, and requires graph and cross-file references to use canonical IDs for modular entities.

The current controls are sufficient for the pilot area. Before extracting many more areas, the project should add targeted validation for cross-area graph ownership and broader same-area local-reference policy outside graph triples.
