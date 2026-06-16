# Workplan

## M000 - Repository initialization

Goal: create a clean repository with a governed documentation foundation.

Status: in progress.

## Completed

- M000.001 - Initial clean repository files.
- M000.002 - Diátaxis documentation folder structure.
- M000.003 - Compact governed project model files.
- M000.004 - Documentation structure guard.
- M000.005 - Documentation structure guard requirement traceability.
- M000.006 - Taxonomies and bidirectional traceability model.
- M000.007 - Project model consistency and bidirectional traceability validator.
- M000.008 - Package script and Command node consistency.
- M000.009 - Governed file format validation baseline.
- M000.010 - Validator negative fixtures.
- M000.011 - Architecture defaults and requirement lifecycle baseline.
- M000.012 - Governance control report and page contract requirements.
- M000.013 - Governance control report JSON Schema contract.
- M000.014 - Static governance control report builder.
- M000.015 - Static governance control page generator.
- M000.016 - Governance control check execution status.
- M000.017 - Project handoff ZIP command.
- M000.018 - Project handoff ZIP project-model registration.
- M000.019 - Mandatory governed source-file registration guard.
- M000.020 - Explicit governed registry schemas requirement.
- M000.021 - Governed baseline artifact bidirectional traceability.
- M000.022A - Governance registry schema analysis.
- M000.022B - Governance registry explicit schema contract.
- M000.022C - Governance registry schema-driven validation.
- M000.022D - Bidirectional schema application traceability.
- M000.022E - Requirements registry schema analysis.
- M000.022F - Requirements registry explicit schema contract.
- M000.022G - Requirements registry schema-driven validation.
- M000.023A - Graph matrix schema analysis.
- M000.023B - Graph matrix explicit schema contract.
- M000.023C - Graph matrix schema-driven validation.
- M000.023D - Single schema validation entrypoint governance.
- M000.024A - Project model modularization roadmap.
- M000.024B - Project model modularization analysis.
- M000.024C - Project model areas taxonomy contract.
- M000.024D - Project model areas taxonomy enforcement.
- M000.024E - Requirements index and part schema contracts.
- M000.024F - Graph index and part schema contracts.
- M000.024G - Decisions index and part schema contracts.
- M000.024H - Modular project model loader design.
- M000.024I - First schema-validation area extraction.
- M000.024J - Schema-validation canonical ID and control review.
- M000.024K - Remaining area extraction plan.
- M000.024L - Cross-area graph ownership guard.
- M000.024M - Same-area local reference policy design.
- M000.024N - Documentation-structure area extraction.
- M000.024O - Markdown-format area extraction.
- M000.024P - Remaining project-model area extraction.
- M000.024Q - Root index cleanup and no-legacy enforcement.
- M000.024R - Modularization closure review.

## Next steps

### M000.024 - Project model modularization

Goal: split the growing project-model registries by governed project-model area while preserving deterministic validation, traceability, and a single logical model.

Status: completed.

Design direction:

- Use canonical composite identifiers in the form `<area_id>:<local_id>` so local sequences can restart inside each governed area.
- Introduce `project_model_areas` as an explicit controlled taxonomy before broad modular extraction.
- Keep central index files for requirements, graph traceability, and decisions.
- Move area-specific requirements, graph triples, and decisions into area parts loaded from the indexes.
- Use a dedicated cross-area graph part for relationships whose subject and object belong to different project-model areas.
- Keep `tools/docs/check-docs-format.mjs` as the single JSON Schema validation entrypoint.
- Keep `tools/docs/check-project-model.mjs` responsible for semantic aggregation and cross-file validation.
- Keep `tools/docs/check-docs-structure.mjs` responsible for required files, directories, and repository structure.
- Prefer clean coordinated breaking changes over long-term compatibility with the current monolithic layout because the project is before first release.

Planned micropasses:

- M000.024A - Project model modularization roadmap. Completed.
  - Scope: record the planned split of requirements, graph traceability, and decisions in this workplan.
  - No schema, loader, graph, or registry migration yet.
- M000.024B - Project model modularization analysis. Completed.
  - Scope: define area IDs, composite ID rules, index/part boundaries, cross-area relationship ownership, decision ownership, taxonomy governance, and clean migration policy.
  - No file migration yet.
- M000.024C - Project model areas taxonomy contract. Completed.
  - Scope: introduce `project_model_areas` as a governed taxonomy with value descriptions and bidirectional traceability requirements.
  - Added the project-model area value contract; no modular requirements, graph, or decision extraction yet.
- M000.024D - Project model areas taxonomy enforcement. Completed.
  - Scope: add deterministic validation and negative fixture coverage for `project_model_areas` before modular parts rely on it broadly.
  - Enforced project_model_areas semantic checks in `check-project-model.mjs` and added invalid-project-model-area negative fixture coverage.
- M000.024E - Requirements index and part schema contracts. Completed.
  - Scope: design the future requirements index and requirements part schemas while preserving current validation entrypoint rules.
  - Added the requirements index and part contract document; no requirements extraction or modular loader yet.
- M000.024F - Graph index and part schema contracts. Completed.
  - Scope: design graph index and graph part schemas, including cross-area graph part policy.
  - Added the graph index and part contract document; no graph extraction or modular loader yet.
- M000.024G - Decisions index and part schema contracts. Completed.
  - Scope: design decision index and decision part schemas, distinguishing global decisions from area decisions.
  - Added the decisions index and part contract document; no decision extraction or modular loader yet.
- M000.024H - Modular project model loader design. Completed.
  - Scope: define how format and semantic validators will load index files and aggregate parts into one logical model.
  - Added the modular project model loader design document; no loader implementation or area extraction yet.
- M000.024I - First schema-validation area extraction. Completed.
  - Scope: extract the schema-validation area across requirements, graph triples, and decisions.
  - Added first governed modular part files, part schemas, index declarations, and aggregate loader support for semantic validation.
- M000.024J - Schema-validation canonical ID and control review. Completed.
  - Scope: normalize the first extracted area to area-local IDs, derive canonical `<area_id>:<local_id>` IDs in the semantic aggregate, and document bidirectional/cross-file controls.
  - Added the schema-validation area ID and control review; no additional areas extracted.
- M000.024K - Remaining area extraction plan. Completed.
  - Scope: use the first extraction and canonical ID review results to plan the remaining area splits and required follow-up gates.
  - Added the remaining project-model area extraction plan; no additional areas extracted.
- M000.024L - Cross-area graph ownership guard. Completed.
  - Scope: add deterministic validation and negative fixture coverage for triples placed in the wrong area graph part.
  - Added graph part ownership validation before broad extraction.
- M000.024M - Same-area local reference policy design. Completed.
  - Scope: define where part-local references are allowed outside graph triples and where canonical references are required.
  - Kept graph triples canonical and part-local IDs confined to owned requirement/decision records.
- M000.024N - Documentation-structure area extraction. Completed.
  - Scope: extract documentation layout, required-file, and structure-guard requirements, decisions, and graph relationships into documentation-structure parts.
- M000.024O - Markdown-format area extraction. Completed.
  - Scope: extract Markdown body profile and Markdown format validation requirements, decisions, and graph relationships into markdown-format parts.
- M000.024P - Remaining project-model area extraction. Completed.
  - Scope: extract requirements-governance, graph-traceability, source-traceability, governance-control, project-handoff, backend-architecture, global decisions, and cross-area graph parts.
- M000.024Q - Root index cleanup and no-legacy enforcement. Completed.
  - Scope: leave root registries as indexes/vocabulary roots, remove root atomic requirements, decisions, graph nodes, and graph triples, and keep canonical modular references.
- M000.024R - Modularization closure review. Completed.
  - Scope: align schemas, structure guard, format guard, project-model validator, source JSDoc references, and workplan state after complete modular extraction.

### M000.025 - Requirement/source/decision traceability hardening

Goal: prevent new governed functionality from entering the repository unless every governed source file is cross-checked against requirements, graph relationships, validation tools, and accepted decisions.

Status: started.

Micropasses:

- M000.025A - Decision-backed source traceability. Completed.
  - Scope: require every governed source file to include graph-backed decision traceability in file-level JSDoc, require accepted decisions to have outgoing graph traceability, and add negative fixtures for missing source decision traceability and untraced accepted decisions.
- M000.025B - Implemented requirement evidence closure. Completed.
  - Scope: reject accepted implemented requirements unless the graph records implementation/specification evidence, VERIFIED_BY evidence, and accepted decision backing for each requirement.
  - Added negative fixtures for missing implemented requirement evidence, missing implemented requirement verification, and unbacked implemented requirement decisions.
- M000.025C - Graph target existence and command/source hardening. Completed.
  - Scope: reject graph SourceFile, SchemaFile, TestFile, and ConfigFile targets that do not exist; require ValidationTool nodes to declare existing implementation paths with matching IMPLEMENTED_BY relationships; require every package.json script to have a graph Command node and every Command node to run a ValidationTool.
  - Added negative fixtures for missing graph source targets, missing validation-tool paths, and untraced package scripts.
- M000.025D1 - Negative fixture traceability contract. Completed.
  - Scope: define NegativeFixture as the target model entity, record fixture-to-control traceability semantics, and explicitly separate real-repository fixture inventory from isolated negative fixture execution workspaces.
  - No enforcement added in this micropasso; D2 will implement the real-repository inventory gate after this boundary is stable.
- M000.025D2 - Real-repository negative fixture traceability enforcement. Completed.
  - Scope: discover real files under tools/docs/fixtures/negative, require each one to be represented as a NegativeFixture graph node, require VALIDATES, EXERCISES, and EXPECTS_FAILURE_OF traceability for each fixture, and add a negative fixture for an unregistered real fixture file.
  - The enforcement is intentionally scoped to the real repository inventory and does not require isolated invalid fixture workspaces to synthesize unrelated fixture catalogue data.

Expected follow-up scope:

- add repository cleanliness and ignored-artifact guards before new runtime functionality
- add expected diagnostic or expected-control assertions after fixture inventory enforcement is stable
- keep protected artifact root detection as a later M000.025 micropass, not as a separate milestone

### M000.026 - Governance control report and page negative fixtures

Goal: add controlled negative coverage for report and page generation.

Expected scope:

- invalid report schema fixture
- invalid report builder input fixture
- invalid page rendering fixture
- no runtime product code yet

### M001.001 - Product boundary

Goal: define the clean product boundary before architecture or runtime implementation.

Expected scope:

- product purpose
- users and actors
- core capabilities
- explicit non-goals
- first vertical slice candidates

## Future

- Define backend runtime architecture after product boundary.
- Implement deterministic backend architecture checker when backend files exist.
