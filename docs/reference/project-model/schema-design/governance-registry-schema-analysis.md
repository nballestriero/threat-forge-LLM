# Governance registry schema analysis

## Purpose

This document records the field-level schema analysis for `docs/reference/project-model/governance.registry.yml`.

It is the design input for the future explicit machine-readable schema `docs/reference/project-model/schemas/governance-registry.schema.json`. It separates structural shape rules, free text, controlled values, governed IDs, ID references, and semantic validation rules so future validators can load canonical schemas instead of relying only on hardcoded registry-shape checks.

This document satisfies the first analysis step for `REQ-0021` and supports the later creation of explicit registry schema contracts.

## Schema

### Current governed artifact

The current governance registry contains these top-level sections:

| Field | Classification | Required | Future schema responsibility | Semantic validator responsibility |
| --- | --- | --- | --- | --- |
| `schema_version` | controlled_value | Yes | Require string and constrain to `registry_schema_version`. | Confirm supported schema version policy. |
| `change_control` | structural | Yes | Require object with `decided_by`, `satisfies`, and `rationale`. | Confirm referenced decisions and requirements exist and are mirrored by graph relationships. |
| `registry` | structural | Yes | Require registry identity, title, status, and description. | Confirm status belongs to a controlled registry status dataset. |
| `taxonomies` | structural | Yes | Require named controlled value datasets with entries. | Confirm controlled datasets are used consistently by registry fields. |
| `capabilities` | list_of_governed_entities | Yes | Require capability entry shape. | Confirm capability status values and graph references. |
| `decisions` | list_of_governed_entities | Yes | Require decision entry shape. | Confirm decision status values and graph references. |
| `document_types` | list_of_governed_entities | Yes | Require document type entry shape. | Confirm `body_profile_id` references a registered body profile. |
| `body_profiles` | list_of_governed_entities | Yes | Require body profile entry shape. | Confirm Markdown validators consume registered profiles. |
| `node_types` | list_of_governed_entities | Yes | Require node type entry shape. | Confirm graph matrix nodes and predicates use registered node types. |
| `predicates` | list_of_governed_entities | Yes | Require predicate entry shape and allowed type arrays. | Confirm graph matrix triples comply with predicate subject/object compatibility. |

### Field classification

| Field path | Classification | Controlled source or reference target | Notes |
| --- | --- | --- | --- |
| `schema_version` | controlled_value | `registry_schema_version` | Should initially allow only `1.0`; future versions require an explicit compatibility decision. |
| `change_control.decided_by[]` | id_reference | `decisions[].id` | File-local marker must match graph `DECIDES` relationships. |
| `change_control.satisfies[]` | id_reference | `requirements.registry.yml:requirements[].id` | File-local marker must match graph `SPECIFIED_BY` relationships. |
| `change_control.rationale` | free_text | None | Required explanation for why this baseline artifact carries local traceability metadata. |
| `registry.id` | governed_id | `project-governance-registry` fixed id | This registry should have a stable ID because other tools depend on the canonical file role. |
| `registry.title` | free_text | None | Human-readable title. |
| `registry.status` | controlled_value | `registry_status` | Missing today; should be introduced as a controlled dataset. |
| `registry.description` | free_text | None | Human-readable description. |
| `taxonomies.<name>` | controlled_dataset | taxonomy map key | Each taxonomy name should be declared by schema and/or a controlled taxonomy registry rule. |
| `taxonomies.<name>[].id` | controlled_value | local taxonomy value set | Value IDs are the authoritative allowed values for fields that cite the taxonomy. |
| `taxonomies.<name>[].description` | free_text | None | Existing required meaning field. |
| `taxonomies.<name>[].rationale` | free_text | None | Missing today; should become required for controlled datasets that drive validation. |
| `taxonomies.<name>[].validation_impact` | free_text | None | Missing today; should describe how validators use the value. |
| `capabilities[].id` | governed_id | Pattern `CAP-*` | Capability ID. |
| `capabilities[].title` | free_text | None | Human-readable title. |
| `capabilities[].description` | free_text | None | Human-readable description. |
| `capabilities[].status` | controlled_value | `capability_status` | Already validated by project model taxonomy checks. |
| `decisions[].id` | governed_id | Pattern `DEC-*` | Decision ID. |
| `decisions[].title` | free_text | None | Human-readable title. |
| `decisions[].status` | controlled_value | `decision_status` | Already validated by project model taxonomy checks. |
| `decisions[].statement` | free_text | None | Normative decision statement. |
| `decisions[].rationale` | free_text | None | Required rationale for accepted governance decisions. |
| `decisions[].consequences[]` | list_of_free_text | None | Human-readable consequences. |
| `document_types[].id` | governed_id | document type ID set | Used by document format and future documentation tooling. |
| `document_types[].diataxis_section` | controlled_value | `diataxis_section` | Missing today; should be introduced because only known Diátaxis sections are valid. |
| `document_types[].description` | free_text | None | Human-readable description. |
| `document_types[].body_profile_id` | id_reference | `body_profiles[].id` | Already validated by registry reference checks. |
| `body_profiles[].id` | governed_id | Pattern `BODY-*` | Body profile ID. |
| `body_profiles[].description` | free_text | None | Human-readable description. |
| `body_profiles[].required_headings[]` | list_of_free_text | None | Headings are free text but schema should require strings. |
| `body_profiles[].forbidden_headings[]` | list_of_free_text | None | Headings are free text but schema should require strings. |
| `node_types[].id` | governed_id | graph node type ID set | Used by graph matrix nodes, predicate compatibility, and future graph import. |
| `node_types[].description` | free_text | None | Human-readable description. |
| `predicates[].id` | governed_id | graph predicate ID set | Used by graph matrix triples. |
| `predicates[].description` | free_text | None | Human-readable description. |
| `predicates[].allowed_subject_types[]` | id_reference | `node_types[].id` | Already used by predicate compatibility validation. |
| `predicates[].allowed_object_types[]` | id_reference | `node_types[].id` | Already used by predicate compatibility validation. |

### Controlled datasets to add or enrich

| Dataset | Status | Used by | Required values or source | Rationale |
| --- | --- | --- | --- | --- |
| `registry_schema_version` | New | `schema_version` | Initially `1.0` | Schema compatibility must be explicit and versioned. |
| `registry_status` | New | `registry.status`, future matrix/requirements registry status | Proposed values: `draft`, `accepted`, `deprecated`, `superseded` | Registry lifecycle should not be an unvalidated free string. |
| `capability_status` | Existing | `capabilities[].status` | Existing taxonomy | Governs capability lifecycle and reporting. |
| `decision_status` | Existing | `decisions[].status` | Existing taxonomy | Governs whether decisions are binding, rejected, or superseded. |
| `diataxis_section` | New | `document_types[].diataxis_section` | Proposed values: `tutorials`, `how-to`, `reference`, `explanation` | Document type routing should align with the governed folder model. |
| `node_type_id` | Existing as `node_types[]` | `nodes[].type`, predicate allowed types, triples | `node_types[].id` | Graph compatibility depends on a controlled node type set. |
| `predicate_id` | Existing as `predicates[]` | `triples[].predicate` | `predicates[].id` | SPO relationships must use controlled predicates. |
| `body_profile_id` | Existing as `body_profiles[]` | `document_types[].body_profile_id` | `body_profiles[].id` | Markdown body validation depends on registered profiles. |

### Current hardcoded rules to migrate

| Tool | Hardcoded rule today | Target future source |
| --- | --- | --- |
| `tools/docs/check-docs-format.mjs` | Project model YAML files and required top-level keys. | Registry JSON Schemas plus semantic validator orchestration. |
| `tools/docs/check-docs-format.mjs` | `schema_version` must be `1.0`. | `registry_schema_version` controlled dataset and schema `const`/`enum`. |
| `tools/docs/check-docs-format.mjs` | Governance registry top-level keys: `registry`, `taxonomies`, `capabilities`, `decisions`, `document_types`, `body_profiles`, `node_types`, `predicates`. | `governance-registry.schema.json`. |
| `tools/docs/check-docs-format.mjs` | Markdown body profile mapping for governed docs. | A governed document inventory or schema-backed document registry in a future step. |
| `tools/docs/check-docs-structure.mjs` | Allowed `docs/reference/project-model` entries. | Structure policy registry or explicit structure schema in a future step. |
| `tools/docs/check-project-model.mjs` | Taxonomy usage for capability, decision, requirement status, priority, type, scope, verification, and evidence. | Controlled dataset declarations plus semantic validator. |
| `tools/docs/check-project-model.mjs` | ID uniqueness and ID format patterns. | Schema pattern constraints plus semantic uniqueness validation. |
| `tools/docs/check-project-model.mjs` | Predicate subject/object compatibility. | Predicate dataset in governance registry plus semantic validation against graph triples. |
| `tools/docs/check-project-model.mjs` | Baseline artifact `change_control` marker consistency. | Schema shape plus semantic graph consistency validation. |

## Rules

### Schema boundary

The future `governance-registry.schema.json` should validate file shape, primitive types, required fields, local object structure, basic ID patterns, and controlled dataset entry shape.

It should not try to validate cross-file existence, graph relationship consistency, package script availability, source-file existence, or repository path presence. Those remain semantic validator responsibilities.

### Semantic validator boundary

The project model validator should continue to validate cross-registry and repository semantics:

- referenced decisions and requirements exist;
- `body_profile_id` values reference existing body profiles;
- predicate allowed subject and object types reference existing node types;
- graph matrix triples use known predicates and compatible subject/object node types;
- source files and package scripts exist where referenced;
- file-local change-control markers match graph relationships.

### Controlled value policy

A field becomes a `controlled_value` only when free text would create governance drift, inconsistent reporting, invalid graph relationships, or ambiguous validation behavior.

Every controlled dataset that affects validation should document:

- value `id`;
- human-readable `description`;
- why the value exists;
- how validators or reports interpret the value.

### Open design decisions

- Whether taxonomy entries should require `rationale` and `validation_impact` immediately, or whether this should be introduced in a migration step.
- Whether `registry.status` should reuse a generic `registry_status` dataset or a broader lifecycle dataset.
- Whether structure rules should remain in `check-docs-structure.mjs` temporarily or move into a governed structure policy registry.
- Whether Markdown document inventory should remain hardcoded in `check-docs-format.mjs` until a document registry is introduced.
