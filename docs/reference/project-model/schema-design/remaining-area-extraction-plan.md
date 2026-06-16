# Remaining project-model area extraction plan

## Purpose

This document records the post-pilot plan for extracting the remaining project-model areas after the first `schema-validation` extraction and canonical ID review.

The pilot proved that a single area can be split into requirements, decisions, and graph parts while the tools still validate one logical model. It also showed that broad extraction should not continue as one large migration. The next work must keep extraction small, control-first, and reversible through ordinary Git commits, while still preferring clean coordinated breaking changes over compatibility aliases.

## Schema

This plan does not introduce a new JSON Schema artifact.

The relevant existing schema and validation boundaries remain:

```text
docs/reference/project-model/schemas/requirements-registry.schema.json
docs/reference/project-model/schemas/governance-registry.schema.json
docs/reference/project-model/schemas/graph-matrix.schema.json
docs/reference/project-model/schemas/requirements-part.schema.json
docs/reference/project-model/schemas/decisions-part.schema.json
docs/reference/project-model/schemas/graph-part.schema.json
```

The relevant deterministic tools remain:

```text
tools/docs/check-docs-structure.mjs
tools/docs/check-docs-format.mjs
tools/docs/check-project-model.mjs
```

`check-docs-format.mjs` remains the only JSON Schema validation entrypoint. `check-project-model.mjs` remains responsible for semantic aggregation and cross-file consistency. `check-docs-structure.mjs` remains responsible for required files, directories, and repository structure.

## Rules

Remaining project-model area extraction follows these rules:

1. Do not extract all remaining areas in one commit.
2. Keep every area extraction as a separate micropasso with its own gate run.
3. Keep local IDs inside part files and canonical `<area_id>:<local_id>` IDs in aggregate cross-file references.
4. Do not reintroduce legacy aliases for IDs migrated out of the root registries.
5. Add or strengthen deterministic controls before extracting areas that would depend on those controls.
6. Keep `global` for explicitly cross-cutting decisions or graph relationships, not as a dumping ground for unresolved ownership.
7. Keep `backend-architecture` deferred until the product boundary workstream creates runtime-facing architecture requirements.

## Pilot review result

The `schema-validation` pilot is valid as the first extraction because it exercised all three modular part types:

```text
docs/reference/project-model/requirements/schema-validation.requirements.yml
docs/reference/project-model/decisions/schema-validation.decisions.yml
docs/reference/project-model/graph/schema-validation.graph.yml
```

The pilot established these controls as present:

- declared part loading through central indexes
- project_model_areas taxonomy validation
- part path and area consistency checks
- local requirement and decision ID duplicate detection
- canonical aggregate ID derivation for modular requirements and decisions
- canonical graph references for modular entities
- rejection of removed schema-validation legacy IDs
- source-file JSDoc to graph traceability for canonical modular requirement IDs
- schema application traceability for root and part schemas
- baseline artifact change-control traceability for root and part project-model artifacts
- negative fixtures for local-only modular graph references and removed legacy references

The pilot also exposed controls that should be added before broad extraction:

- cross-area graph ownership validation
- explicit same-area local-reference policy outside graph triples
- an area coverage report for planning and review

Only the first two are blocking for the next broad extraction phase. The coverage report is useful but can remain advisory until the modular model contains more than one non-pilot area.

## Extraction order

The recommended extraction order is:

1. `documentation-structure`
2. `markdown-format`
3. `requirements-governance`
4. `graph-traceability`
5. `source-traceability`
6. `governance-control`
7. `project-handoff`

`backend-architecture` remains deferred until M001 product-boundary work clarifies the runtime and architecture scope.

### documentation-structure

Extract this first because it is a low-risk area with clear ownership around required directories, required files, Diátaxis placement, and repository documentation boundaries.

Before extracting it, add the cross-area graph ownership guard or explicitly keep all new triples in root files until that guard exists.

### markdown-format

Extract this after documentation structure because Markdown body-profile validation depends on the governed documentation corpus and format checker registration.

This extraction should keep Markdown body profiles separate from JSON Schema registry validation. `markdown-format` owns body profile behavior, while `schema-validation` owns schema contracts and schema-driven YAML or JSON validation.

### requirements-governance

Extract this after the low-risk documentation and Markdown areas because it owns macro requirements, atomic requirement shape, lifecycle rules, acceptance criteria, and requirement evidence policy.

This area should not move before same-area local-reference policy is explicit, because requirement records can contain references whose local-vs-canonical semantics differ from graph triples.

### graph-traceability

Extract this after the cross-area graph ownership guard exists. Graph traceability owns SPO predicates, predicate compatibility, graph matrix contracts, and cross-artifact traceability semantics, so misplaced triples would be costly if ownership is still only conventional.

### source-traceability

Extract this after graph traceability because source-file JSDoc validation depends on known requirement IDs, implementation triples, and canonical graph references.

### governance-control and project-handoff

Extract these after the traceability-heavy areas because they depend on commands, generated artifacts, reports, pages, and operational boundaries.

They should remain separate areas because governance-control outputs and project-handoff ZIP generation have different artifact policies and generated-file behavior.

## Required control before the next extraction

The next blocking control should be cross-area graph ownership validation.

The intended rule is:

```text
If a graph part belongs to area A, triples in that graph part should normally have both subject and object owned by area A, unless the graph part is the governed cross-area graph part or the relationship has an explicit governed exception.
```

This rule should have negative fixture coverage before the project extracts traceability-heavy areas.

## Reference policy to make explicit

The project should also document and then enforce this reference policy:

- graph triples reference modular requirements and decisions by canonical ID
- part-local IDs are accepted only inside the owning part file fields where local authoring is explicitly defined
- cross-area references use canonical IDs
- root/global records keep their existing root IDs until they are intentionally migrated
- removed migrated IDs are invalid references, not aliases

This can start as a design/control document and become a validator in a later micropasso.

## Planned next micropasses

The remaining M000.024 micropasses should proceed as follows:

```text
M000.024L - Cross-area graph ownership guard
M000.024M - Same-area local reference policy design
M000.024N - Documentation-structure area extraction
M000.024O - Markdown-format area extraction
```

Further extraction should be planned after those gates run, because requirements-governance and graph-traceability are higher-risk moves.

## Conclusion

The project should continue modularization, but not by moving all remaining records at once.

The safe path is control-first: add the missing graph ownership guard, make local-reference policy explicit, then extract the low-risk documentation-structure and markdown-format areas before attempting requirements-governance, graph-traceability, source-traceability, governance-control, or project-handoff.
