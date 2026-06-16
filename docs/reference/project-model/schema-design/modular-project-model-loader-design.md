# Modular project model loader design

## Purpose

This document defines the future loader and aggregation design for the modular project model.

The project has already defined contracts for splitting requirements, graph traceability, and decisions into area-owned parts. This document defines how validators should load those parts and construct one logical model before semantic validation runs.

This step is a design step only. It does not implement modular loading, does not migrate requirements, graph triples, or decisions, and does not extract any project-model area.

## Loading boundary

The modular project model keeps central index files as the canonical loading boundary:

```text
docs/reference/project-model/requirements.registry.yml
docs/reference/project-model/graph.matrix.yml
docs/reference/project-model/governance.registry.yml
```

The index files remain the only stable public entrypoints for the project-model validators. Future part files are not loaded by directory scan alone. They are loaded only when declared by a governed index.

The future index declarations are expected to point at part files such as:

```text
docs/reference/project-model/requirements/<area_id>.requirements.yml
docs/reference/project-model/graph/<area_id>.graph.yml
docs/reference/project-model/graph/cross-area.graph.yml
docs/reference/project-model/decisions/global.decisions.yml
docs/reference/project-model/decisions/<area_id>.decisions.yml
```

A part that exists on disk but is not declared by its index must be treated as ungoverned until a future checker explicitly reports it. A part declared by an index but missing on disk must fail deterministic validation.


## Schema

This step does not add a new JSON Schema file. It defines the loader contract that future index and part schemas must support.

Future modular schema contracts should validate local file shape for:

```text
requirements index
requirements part
graph index
graph part
decisions index
decisions part
```

Those schemas must be applied only by `tools/docs/check-docs-format.mjs`. They must not duplicate semantic aggregation checks such as canonical ID resolution, cross-area graph ownership, entity existence, command validation, or source-file traceability.

## Rules

The modular loader design is governed by these rules:

1. Index files are the canonical loading boundary.
2. Part files are loaded only when declared by a governed index.
3. Directory scanning must not become the source of truth for governed parts.
4. `project_model_areas` remains the controlled taxonomy for part ownership.
5. Canonical modular identity uses `<area_id>:<local_id>`.
6. `check-docs-format.mjs` remains the single JSON Schema validation entrypoint.
7. `check-project-model.mjs` owns aggregation and semantic validation.
8. Long-term compatibility with the monolithic model is not required before first release.

## Logical model

The validator should build one logical project model from the indexes and declared parts.

The logical model is not a separate persisted artifact. It is an in-memory aggregation used by deterministic validators.

Conceptually:

```text
logical requirements = requirements index + requirements parts
logical graph        = graph index + graph parts + cross-area graph part
logical decisions    = governance index + global decisions part + area decisions parts
logical governance   = governance registry + shared vocabularies + taxonomy definitions
```

After aggregation, downstream semantic checks should operate on the logical model, not on individual physical files.

## Canonical identifiers

Future modular records use canonical composite identifiers:

```text
<area_id>:<local_id>
```

Examples:

```text
schema-validation:REQ-0001
schema-validation:MR-0001
schema-validation:DEC-0001
graph-traceability:REQ-0001
global:DEC-0001
```

The loader is responsible for deriving canonical IDs from part-local records and their owning `area_id`.

Rules:

1. Local IDs may repeat across different areas only after canonical ID aggregation is supported.
2. Local IDs must remain unique inside the same part and area.
3. Graph triples and cross-file references must use canonical IDs once modular references are introduced.
4. Legacy monolithic IDs are not a long-term compatibility target.
5. During a controlled migration step, temporary support for legacy IDs may exist only long enough to keep gates deterministic and must be removed once the modular model is established.

## Area resolution

Every modular part must declare exactly one `area_id` unless it is an explicitly governed index file.

The loader must validate the following semantic rules after schema validation has already checked local shape:

- the part `area_id` exists in the `project_model_areas` taxonomy
- the part `area_id` matches the area declared by the central index entry
- the part path follows the expected area-owned path convention unless a governed exception exists
- the `global` area is reserved for intentionally cross-cutting decision records and other explicitly global project-model records
- the `cross-area` graph part is reserved for graph relationships whose subject and object belong to different areas

The taxonomy remains governed in `governance.registry.yml`; it must not be inferred from file names alone.

## Requirements aggregation

The future requirements loader should read the requirements index and all declared requirements parts.

For each requirements part, the loader should:

1. validate the part through `tools/docs/check-docs-format.mjs`
2. read `area_id`
3. confirm the area exists in `project_model_areas`
4. derive canonical macro requirement IDs as `<area_id>:<local_id>`
5. derive canonical atomic requirement IDs as `<area_id>:<local_id>`
6. resolve parent macro requirement references
7. aggregate macro requirements and atomic requirements into a single logical requirements collection

Parent macro rules:

- local parent references are allowed only inside the same requirements part
- cross-area parent references must use canonical IDs and should remain exceptional
- every atomic requirement must resolve to exactly one macro requirement in the logical model

The loader must report duplicate canonical IDs. Duplicate local IDs in different areas are allowed only after canonical IDs are active. Duplicate local IDs inside one area must fail.

## Graph aggregation

The future graph loader should read the graph index, all declared area graph parts, and the declared cross-area graph part.

For each graph part, the loader should:

1. validate the part through `tools/docs/check-docs-format.mjs`
2. read `area_id`
3. confirm the area exists in `project_model_areas` or is the reserved `cross-area` graph ownership boundary
4. normalize node and triple references to canonical IDs where needed
5. aggregate nodes and triples into one logical graph

Semantic graph checks continue to belong to `tools/docs/check-project-model.mjs` after aggregation:

- predicate compatibility
- node type existence
- entity existence
- duplicate SPO relationships
- command and package script consistency
- schema application traceability
- source-file bidirectional traceability

Graph parts must not be validated independently as complete graphs. A part may refer to an entity owned by another part, provided the aggregated logical graph resolves the reference.

## Cross-area graph ownership

The future cross-area graph part owns relationships whose subject and object belong to different project-model areas.

Target path:

```text
docs/reference/project-model/graph/cross-area.graph.yml
```

The cross-area graph part should not own ordinary area-internal relationships.

The validator should eventually check:

- area graph parts do not duplicate cross-area relationships
- the cross-area graph part contains only relationships that genuinely cross area boundaries, unless a governed exception exists
- cross-area relationships use canonical subject and object IDs

## Decisions aggregation

The future decisions loader should read the governance index, the global decisions part, and all declared area decision parts.

For each decision part, the loader should:

1. validate the part through `tools/docs/check-docs-format.mjs`
2. read `area_id`
3. confirm the area exists in `project_model_areas`
4. derive canonical decision IDs as `<area_id>:<local_id>`
5. aggregate decisions into a single logical decision collection

The `global` decision part owns decisions that intentionally govern more than one project-model area or define repository-wide project-model policy.

Area-specific decisions belong in the matching area part after extraction.

The validator should report duplicate canonical decision IDs and ambiguous references.

## Validation pipeline

The future validation pipeline should remain layered:

```text
check-docs-structure.mjs
  required files, required directories, and declared path existence

check-docs-format.mjs
  JSON Schema validation and local file format validation for index and part files

check-project-model.mjs
  index loading, part aggregation, canonical ID resolution, and semantic validation
```

No tool other than `check-docs-format.mjs` should duplicate JSON Schema validation of governed artifacts.

`check-project-model.mjs` may reject a file after schema validation if its relationships, references, area ownership, or canonical IDs are semantically invalid.

## Error boundaries

The loader should produce deterministic diagnostics for at least these classes of future errors:

- declared part file missing
- part exists but is not declared by the relevant index
- part `area_id` does not exist in `project_model_areas`
- part `area_id` does not match index entry area
- duplicate canonical requirement, macro requirement, decision, node, or graph relationship ID
- unresolved parent macro requirement
- unresolved graph entity reference after aggregation
- legacy local ID used where canonical modular ID is required
- cross-area relationship placed in an area graph part after cross-area ownership is enforced
- global decision used for an area-specific decision without governed rationale

The first implementation may introduce these checks incrementally, but the loader design must keep them as explicit target diagnostics.

## Migration policy

The project is before first release, so the modular loader may make clean coordinated breaking changes.

The migration should avoid permanent dual support for monolithic and modular layouts.

A temporary transitional state is allowed only inside a controlled micropass when needed to keep deterministic gates green while the same change set updates schemas, indexes, parts, graph traceability, requirements, and tests.

After the modular loader and first extraction are established, future records should use the modular canonical identity model.

## Implementation direction

The future implementation should prefer a small internal loader module used by `tools/docs/check-project-model.mjs` rather than scattering part discovery logic across multiple validators.

The loader should expose an aggregated model shape that keeps both canonical identity and source location metadata.

Source location metadata is needed so diagnostics can point to the physical index or part file that introduced an invalid record.

The first implemented extraction should remain small, preferably the `schema-validation` project-model area, because it already has requirements, decisions, graph traceability, schemas, commands, and validation tools.

## Acceptance boundary

This design step is complete when:

- the loading boundary is defined
- the logical aggregation model is defined
- canonical ID derivation is defined
- requirements, graph, and decisions aggregation rules are defined
- cross-area graph ownership is defined
- validation responsibility remains aligned with the three checker roles
- the migration policy rejects long-term compatibility with the monolithic layout

Later micropasses must implement the loader and perform the first capability area extraction.
