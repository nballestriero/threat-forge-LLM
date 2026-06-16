# Requirements Registry Schema Analysis

## Purpose

This document classifies the fields of `docs/reference/project-model/requirements.registry.yml` before creating its explicit JSON Schema contract.
It separates structural shape rules, controlled values, governed identifiers, cross-registry references, and semantic checks that must remain in deterministic validators.

The analysis exists because the project requires every governed registry to have an explicit machine-readable schema, while controlled datasets must be deliberate, documented, and motivated instead of being hidden only inside validator code.

## Schema

### Registry artifact

Target artifact:

```text
docs/reference/project-model/requirements.registry.yml
```

Planned schema artifact:

```text
docs/reference/project-model/schemas/requirements-registry.schema.json
```

The future schema will validate the parsed YAML document as a JSON-compatible object.
It should define the required top-level sections, primitive types, object and array shapes, local required fields, ID patterns, and `additionalProperties` policy.
It should not replace semantic validation across registries, graph relationships, repository files, or package scripts.


### Closed design decisions

This analysis records the following design decisions before the schema contract is created:

1. `macro_requirements[].implementation_status` is a manual governance field. It is not derived automatically in the initial schema work, but future deterministic tools may report inconsistencies between a macro requirement implementation status and the implementation statuses of its atomic requirements.
2. Every atomic requirement must belong to one macro requirement through required `requirements[].macro_requirement_id`. The JSON Schema should require the field and its base `MR-0000` pattern; the semantic validator must verify the referenced macro requirement exists and the graph records the macro-to-atomic relationship.
3. `requirements[].scope` is a high-governance controlled taxonomy. It must not grow as an ad-hoc tag list. Adding a scope value requires explicit meaning, rationale, validation impact, and graph-backed governance.
4. `main_flow[].actor` and alternative-flow step `actor` remain non-empty free text for now. They describe the human role, tool, component, or process performing the step; they are not a controlled taxonomy until a future need for actor-level traceability appears.
5. Alternative-flow step IDs must follow `^FLOW-REQ-[0-9]{4}-ALT-[0-9]{3}$`.
6. Requirements with `status: accepted` must have non-empty `acceptance_criteria[]` and a complete `verification` object with a verification method and required evidence.
7. Requirements with `implementation_status: implemented` require deterministic verification evidence. They should be `VERIFIED_BY` a gate or check. `IMPLEMENTED_BY` is required only when the requirement produces or changes an implementation artifact such as source code, configuration, schema, contract, command, or validation tool.
8. `implementation_status: not_applicable` is allowed only when the requirement does not produce a direct implementation artifact. It requires a non-empty implementation rationale, is not allowed for functional or data requirements, and important cases should also be backed by an explicit decision or equivalent graph governance.

### Top-level field classification

| Field | Classification | Purpose | Schema responsibility | Semantic validator responsibility |
| --- | --- | --- | --- | --- |
| `schema_version` | `controlled_value` | Declares the requirements registry schema version. | Require a string and constrain the currently supported version, initially `"1.0"`. | Coordinate future version migrations across schema, validator, and registry. |
| `change_control` | `structural` plus `id_reference` | Declares file-local baseline traceability. | Require `decided_by[]`, `satisfies[]`, and `rationale`. | Verify referenced decisions and requirements exist and match graph relationships. |
| `schema_control` | `structural` plus `repository_path` | Declares the canonical schema for this registry once the schema exists. | Require `schema` and `rationale` when introduced. | Verify schema-to-artifact `APPLIES_TO` traceability is bidirectional. |
| `registry` | `structural` | Describes the registry artifact. | Require metadata fields and local value shapes. | Verify status belongs to the registered dataset. |
| `macro_requirements` | `list_of_governed_entities` | Stores high-level requirements. | Require array item shape and ID pattern. | Verify IDs are unique, statuses are controlled, and graph contains required relationships. |
| `requirements` | `list_of_governed_entities` | Stores atomic verifiable requirements. | Require array item shape and nested requirement-flow shapes. | Verify macro/capability references, controlled values, graph traceability, and implementation evidence. |

### `change_control`

| Field | Classification | Purpose | Required | Value source |
| --- | --- | --- | --- | --- |
| `change_control.decided_by[]` | `id_reference` | Lists decisions governing this baseline artifact. | Yes | `governance.registry.yml / decisions[].id` |
| `change_control.satisfies[]` | `id_reference` | Lists requirements satisfied by this baseline artifact. | Yes | `requirements.registry.yml / requirements[].id` |
| `change_control.rationale` | `free_text` | Explains why local baseline traceability is present. | Yes | Free text |

Schema should validate array/string shape.
The semantic validator must verify ID existence and graph consistency.

### `registry`

| Field | Classification | Purpose | Required | Value source |
| --- | --- | --- | --- | --- |
| `registry.id` | `governed_id` | Stable registry identity. | Yes | Fixed value or registry ID pattern |
| `registry.title` | `free_text` | Human-readable title. | Yes | Free text |
| `registry.status` | `controlled_value` | Registry lifecycle state. | Yes | Future `registry_status` taxonomy |
| `registry.description` | `free_text` | Human-readable registry purpose. | Yes | Free text |

`registry.status` currently uses `draft` but should not remain an implicit free string.
It should use the same future registry lifecycle dataset identified by the governance registry analysis.

### `macro_requirements[]`

| Field | Classification | Purpose | Required | Value source |
| --- | --- | --- | --- | --- |
| `id` | `governed_id` | Stable macro requirement identifier. | Yes | Pattern `^MR-\\d{4}$` |
| `title` | `free_text` | Human-readable title. | Yes | Free text |
| `statement` | `free_text` | Normative macro requirement statement. | Yes | Free text |
| `rationale` | `free_text` | Reason the macro requirement exists. | Yes | Free text |
| `status` | `controlled_value` | Requirement approval lifecycle state. | Yes | `taxonomies.requirement_status` |
| `implementation_status` | `controlled_value` | Implementation lifecycle state. | Yes | `taxonomies.requirement_implementation_status` |
| `priority` | `controlled_value` | Requirement priority. | Yes | `taxonomies.priority` |

The schema should require the shape and the ID pattern.
The semantic validator should verify controlled values against the governance registry taxonomy and verify relationships such as `MR-0001 CONTAINS REQ-*` in the graph matrix.

`implementation_status` on a macro requirement is intentionally manual in the initial model. It is a governance declaration made by maintainers, not an automatically derived field. Future deterministic checks may compare the macro-level value with child atomic requirements and report mismatches, but schema validation should not derive or mutate it.

### `requirements[]`

| Field | Classification | Purpose | Required | Value source |
| --- | --- | --- | --- | --- |
| `id` | `governed_id` | Stable atomic requirement identifier. | Yes | Pattern `^REQ-\\d{4}$` |
| `macro_requirement_id` | `id_reference` | Parent macro requirement. | Yes | `macro_requirements[].id` |
| `capability_id` | `id_reference` | Capability owning the requirement. | Yes | `governance.registry.yml / capabilities[].id` |
| `title` | `free_text` | Human-readable title. | Yes | Free text |
| `statement` | `free_text` | Normative requirement statement. | Yes | Free text |
| `rationale` | `free_text` | Reason the requirement exists. | Yes | Free text |
| `status` | `controlled_value` | Approval lifecycle state. | Yes | `taxonomies.requirement_status` |
| `implementation_status` | `controlled_value` | Implementation lifecycle state. | Yes | `taxonomies.requirement_implementation_status` |
| `priority` | `controlled_value` | Requirement priority. | Yes | `taxonomies.priority` |
| `type` | `controlled_value` | Requirement kind. | Yes | `taxonomies.requirement_type` |
| `scope` | `controlled_value` | Area of applicability. | Yes | `taxonomies.scope` |
| `preconditions[]` | `list_of_governed_entities` | Conditions that must hold before the flow. | Yes | Local nested entities |
| `main_flow[]` | `list_of_governed_entities` | Main behavior or validation flow. | Yes | Local nested entities |
| `alternative_flows[]` | `list_of_governed_entities` | Alternative or error flows. | Yes | Local nested entities |
| `postconditions[]` | `list_of_governed_entities` | Conditions that must hold after execution. | Yes | Local nested entities |
| `acceptance_criteria[]` | `list_of_governed_entities` | Observable acceptance checks. | Yes | Local nested entities |
| `verification` | `structural` | Declares verification method and required evidence. | Yes | Controlled datasets for method and evidence |

The schema should require the object shape, arrays, nested object shapes, and ID patterns.
The semantic validator should verify cross-registry references, graph relationships, and implementation traceability.

Every atomic requirement must reference an existing macro requirement. `macro_requirement_id` is therefore mandatory and controlled by the `^MR-[0-9]{4}$` pattern at schema level, while existence and graph consistency remain semantic checks.

`scope` is deliberately not a loose label. It identifies a stable governance or architectural boundary for the requirement. New values must be added only through the authoritative `scope` taxonomy with meaning, rationale, validation impact, and traceability to the decision or requirement that justifies the new scope.

### Nested requirement entities

#### `preconditions[]`

| Field | Classification | Purpose | Schema responsibility |
| --- | --- | --- | --- |
| `id` | `governed_id` | Stable precondition ID. | Pattern `^PRE-REQ-XXXX-\\d{3}$` relative to parent requirement where supported by semantic validation. |
| `statement` | `free_text` | Precondition text. | Required string. |

The exact parent-derived ID pattern may remain a semantic validator rule because JSON Schema cannot easily express dependency on the parent `requirements[].id` without advanced features.

#### `main_flow[]`

| Field | Classification | Purpose | Schema responsibility |
| --- | --- | --- | --- |
| `id` | `governed_id` | Stable flow step ID. | Base pattern string, parent-specific validation remains semantic. |
| `step` | `structural` | Numeric ordering. | Required integer >= 1. |
| `actor` | `free_text` | Human role, tool, component, or process performing the step. | Required non-empty string. |
| `action` | `free_text` | Action performed. | Required string. |
| `expected_result` | `free_text` | Expected result of the step. | Required string. |

`actor` is not a taxonomy in the initial schema. It is descriptive flow text and may name a maintainer, reviewer, validator, report builder, repository process, or future product component. If actor-level traceability becomes important, a later model can introduce a controlled actor registry or graph node reference.

#### `alternative_flows[]`

| Field | Classification | Purpose | Schema responsibility |
| --- | --- | --- | --- |
| `id` | `governed_id` | Stable alternative flow ID. | Base pattern string, parent-specific validation remains semantic. |
| `title` | `free_text` | Alternative flow title. | Required string. |
| `trigger` | `free_text` | Condition that activates the alternative flow. | Required string. |
| `steps[]` | `list_of_governed_entities` | Alternative flow steps. | Required array of step objects. |

Alternative flow step objects use the same `step`, `actor`, `action`, and `expected_result` fields as main flow steps, but their IDs must follow `^FLOW-REQ-[0-9]{4}-ALT-[0-9]{3}$`. Parent-specific matching to the enclosing requirement remains a semantic validator rule.

#### `postconditions[]`

| Field | Classification | Purpose | Schema responsibility |
| --- | --- | --- | --- |
| `id` | `governed_id` | Stable postcondition ID. | Base pattern string, parent-specific validation remains semantic. |
| `statement` | `free_text` | Postcondition text. | Required string. |

#### `acceptance_criteria[]`

| Field | Classification | Purpose | Schema responsibility |
| --- | --- | --- | --- |
| `id` | `governed_id` | Stable acceptance criterion ID. | Base pattern string, parent-specific validation remains semantic. |
| `statement` | `free_text` | Acceptance criterion text. | Required string. |

### `verification`

| Field | Classification | Purpose | Required | Value source |
| --- | --- | --- | --- | --- |
| `verification.method` | `controlled_value` | Verification approach. | Yes | `taxonomies.verification_method` |
| `verification.required_evidence[]` | `controlled_value` | Evidence types required to verify the requirement. | Yes | `taxonomies.evidence_type` |

Schema should require object/list shape.
The semantic validator should verify controlled values against the governance registry taxonomy.

### Controlled datasets used by requirements registry

| Field | Dataset | Already present | Additional design needed |
| --- | --- | --- | --- |
| `schema_version` | `registry_schema_version` | No | Add dataset or schema enum and motivate version lifecycle. |
| `registry.status` | `registry_status` | No | Add dataset for registry lifecycle. |
| `macro_requirements[].status` | `requirement_status` | Yes | Add rationale and validation impact per value. |
| `macro_requirements[].implementation_status` | `requirement_implementation_status` | Yes | Add rationale and validation impact per value. |
| `macro_requirements[].priority` | `priority` | Yes | Add rationale and validation impact per value. |
| `requirements[].status` | `requirement_status` | Yes | Add rationale and validation impact per value. |
| `requirements[].implementation_status` | `requirement_implementation_status` | Yes | Add rationale and validation impact per value. |
| `requirements[].priority` | `priority` | Yes | Add rationale and validation impact per value. |
| `requirements[].type` | `requirement_type` | Yes | Add rationale and validation impact per value. |
| `requirements[].scope` | `scope` | Yes | Add rationale and validation impact per value. |
| `requirements[].verification.method` | `verification_method` | Yes | Add rationale and validation impact per value. |
| `requirements[].verification.required_evidence[]` | `evidence_type` | Yes | Add rationale and validation impact per value. |

The controlled datasets already exist in `governance.registry.yml`, but most values currently have only `description`.
Future schema and registry work should add `rationale` and `validation_impact` to controlled values that influence validation or reporting.

The `scope` dataset is especially sensitive. It must not become an uncontrolled feature-label vocabulary. Adding a scope changes how requirements are grouped, filtered, reported, and validated, so every new value needs explicit justification and deterministic governance.

### Current hardcoded rule inventory

The current deterministic tools encode requirements-registry shape and semantic rules in code:

- `tools/docs/check-docs-format.mjs` hardcodes that `requirements.registry.yml` must contain top-level `registry`, `macro_requirements`, and `requirements` sections.
- `tools/docs/check-docs-format.mjs` hardcodes `schema_version` validation as `"1.0"` for governed YAML files.
- `tools/docs/check-project-model.mjs` hardcodes taxonomy checks for macro requirement status, implementation status, and priority.
- `tools/docs/check-project-model.mjs` hardcodes taxonomy checks for atomic requirement status, implementation status, priority, type, scope, verification method, and evidence types.
- `tools/docs/check-project-model.mjs` hardcodes ID patterns for `MR-*`, `REQ-*`, `PRE-*`, `FLOW-*`, `ALT-*`, `POST-*`, and `AC-*` IDs.
- `tools/docs/check-project-model.mjs` hardcodes uniqueness across governed IDs including nested requirement entities.
- `tools/docs/check-project-model.mjs` hardcodes cross-registry checks for `macro_requirement_id` and `capability_id`.
- `tools/docs/check-project-model.mjs` hardcodes graph consistency checks that require known entities and compatible SPO triples.

### Schema boundary

The future `requirements-registry.schema.json` should validate:

- required top-level fields;
- top-level object shapes;
- required fields for `registry`, macro requirements, atomic requirements, nested flows, acceptance criteria, and verification;
- primitive types;
- base ID string patterns;
- arrays and non-empty arrays where required;
- `additionalProperties: false` where the field set is controlled;
- `schema_control` once the requirements registry schema exists and applies to this artifact;
- non-empty `acceptance_criteria[]` and complete `verification` shape for accepted requirements where expressible cleanly in JSON Schema;
- `implementation_rationale` shape if the registry introduces it for `not_applicable` requirements.

### Semantic validator boundary

The semantic validator should continue to validate:

- IDs are globally unique across registries, graph nodes, and nested requirement entities;
- parent-derived nested ID patterns match the current requirement ID;
- controlled values exist in the authoritative taxonomy datasets;
- `macro_requirement_id` points to an existing macro requirement;
- `capability_id` points to an existing capability;
- accepted requirements have non-empty acceptance criteria and verification evidence;
- implemented requirements are `VERIFIED_BY` deterministic checks and use `IMPLEMENTED_BY` when they produce or change implementation artifacts;
- `not_applicable` implementation status is rationale-gated and disallowed for functional/data requirements;
- graph relationships contain required `CONTAINS`, `BELONGS_TO_CAPABILITY`, `DECIDES`, `SPECIFIED_BY`, `IMPLEMENTED_BY`, and `VERIFIED_BY` triples;
- source, config, schema, and document paths exist where required;
- schema application traceability remains bidirectional once the schema exists.

## Rules

1. `requirements.registry.yml` must receive an explicit schema before validator logic is considered complete for this registry.
2. The schema must define field shape and local structural constraints without pretending to replace cross-file semantic validation.
3. Fields that use controlled values must name the authoritative taxonomy dataset.
4. Controlled taxonomy values that influence validation should include a meaning, rationale, and validation impact before becoming long-term binding vocabulary.
5. Parent-derived nested requirement IDs may remain semantic-validator checks until the project adopts a schema mechanism capable of expressing those constraints cleanly.
6. `schema_control` for `requirements.registry.yml` should be introduced together with the actual requirements registry schema and bidirectional `APPLIES_TO` graph relationship.
7. Macro requirement implementation status is manual, but every atomic requirement must reference an existing macro requirement.
8. Requirement scope values are high-governance controlled taxonomy values and require explicit rationale, validation impact, and graph-backed governance before expansion.
9. Alternative-flow step IDs must use `FLOW-REQ-0000-ALT-000` form.
10. Accepted requirements require acceptance criteria and verification.
11. Implemented requirements require deterministic `VERIFIED_BY` evidence, and `IMPLEMENTED_BY` when an implementation artifact is applicable.
12. `not_applicable` implementation status requires rationale, is not allowed for functional/data requirements, and should be decision-backed for important cases.
