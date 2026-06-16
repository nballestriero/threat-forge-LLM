# Graph Matrix Schema Analysis

## Purpose

This document classifies the fields of `docs/reference/project-model/graph.matrix.yml` before creating its explicit JSON Schema contract.
It separates local structural shape rules, controlled graph vocabulary, governed identifiers, repository-path checks, command checks, cross-registry references, and semantic traceability checks that must remain in deterministic validators.

The analysis exists because the graph matrix is already the central traceability surface connecting decisions, requirements, schemas, source files, commands, gates, tools, and governed documents.
Creating a schema directly from the current validator would hide which assumptions belong to the matrix shape contract and which assumptions depend on other governed artifacts.

## Schema

### Matrix artifact

Target artifact:

```text
docs/reference/project-model/graph.matrix.yml
```

Planned schema artifact:

```text
docs/reference/project-model/schemas/graph-matrix.schema.json
```

The future schema will validate the parsed YAML document as a JSON-compatible object.
It should define the required top-level sections, primitive types, object and array shapes, local required fields, ID patterns that are intrinsic to the matrix shape, and `additionalProperties` policy.
It should not replace semantic validation against the governance registry, requirements registry, package scripts, repository paths, source-file JSDoc traceability, or schema application evidence.

### Current top-level shape

`graph.matrix.yml` currently has this top-level shape:

| Field | Classification | Purpose | Schema responsibility | Semantic validator responsibility |
| --- | --- | --- | --- | --- |
| `schema_version` | `controlled_value` | Declares the graph matrix format version. | Require a string and constrain the currently supported version, initially `"1.0"`. | Coordinate future matrix migrations across validators and schema contracts. |
| `change_control` | `structural` plus `id_reference` | Declares file-local baseline traceability. | Require `decided_by[]`, `satisfies[]`, and `rationale` until schema-control migration adds the schema contract. | Verify referenced decisions and requirements exist and match graph relationships. |
| `matrix` | `structural` | Describes the matrix artifact. | Require metadata fields and local value shapes. | Verify lifecycle/status values against controlled datasets when those datasets become authoritative. |
| `nodes` | `list_of_governed_entities` | Declares graph nodes for gates, commands, tools, schemas, and selected documents. | Require array item shape, local fields, and a closed item contract. | Verify node type registration, path existence where applicable, command consistency, uniqueness with other governed IDs, and source traceability. |
| `triples` | `list_of_governed_relationships` | Declares Subject-Predicate-Object traceability relationships. | Require subject/predicate/object object shape and local string constraints. | Verify predicate existence, node-type compatibility, entity existence, duplicate SPO relationships, graph-to-artifact consistency, and file-level traceability. |

### Schema-control migration boundary

`graph.matrix.yml` does not yet declare `schema_control` because `graph-matrix.schema.json` does not yet exist as an executable schema artifact.
The future schema-contract step must update both the matrix and the validator boundary in one governed change:

1. create `docs/reference/project-model/schemas/graph-matrix.schema.json` as a `SchemaFile`;
2. add `x-applies_to` to the schema artifact;
3. add `schema_control` to `graph.matrix.yml`;
4. record `SchemaFile APPLIES_TO Document` in `graph.matrix.yml`;
5. include the graph matrix schema in the baseline artifact set read by deterministic validators.

The current matrix already contains a planned placeholder node for `docs/reference/project-model/schemas/graph-matrix.schema.json` as a future artifact.
When the schema file is created, that node should be treated as a real `SchemaFile` and should participate in bidirectional schema application traceability.

### `matrix`

| Field | Classification | Purpose | Required | Value source |
| --- | --- | --- | --- | --- |
| `matrix.id` | `governed_id` | Stable graph matrix identity. | Yes | Fixed value or registry ID pattern. |
| `matrix.title` | `free_text` | Human-readable title. | Yes | Free text. |
| `matrix.status` | `controlled_value` | Matrix lifecycle state. | Yes | Future registry lifecycle dataset, likely aligned with `registry_status`. |
| `matrix.description` | `free_text` | Human-readable matrix purpose. | Yes | Free text. |

The JSON Schema should require the metadata object and reject undeclared metadata fields.
The semantic validator should continue to decide whether `matrix.status` is accepted, draft, deprecated, or superseded by consulting the controlled lifecycle dataset once the dataset is promoted for matrix artifacts.

### `nodes[]`

Current node items use the following fields:

| Field | Classification | Purpose | Required | Value source |
| --- | --- | --- | --- | --- |
| `id` | `governed_id` or `repository_path` | Stable node identifier. | Yes | Matrix-local node ID, governed registry ID, or repository-relative path depending on `type`. |
| `type` | `controlled_value` | Node type. | Yes | `governance.registry.yml / node_types[].id`. |
| `description` | `free_text` | Human-readable node purpose. | Yes for current governed nodes. | Free text. |
| `command` | `command_string` | Executable command for `Command` nodes. | Required for command nodes. | `package.json / scripts` for `npm run ...` commands. |
| `path` | `repository_path` | Repository path for source-backed tool or artifact nodes. | Optional in current matrix. | Repository filesystem. |

The schema should require `id`, `type`, and `description` for all nodes, allow `command` only as a non-empty string, and allow `path` only as a repository-style string when present.
It should not try to prove that `type` is registered, that a command exists in `package.json`, or that a path exists on disk.
Those are semantic checks because the authoritative data lives outside the matrix item itself.

Current semantic node-type rules in `tools/docs/check-project-model.mjs` include:

- every matrix node type must exist in `governance.registry.yml / node_types`;
- `Gate` node IDs must match `^GATE-[A-Z0-9-]+$`;
- `Command` node IDs must match `^CMD-[A-Z0-9-]+$`;
- `ValidationTool` node IDs must match `^TOOL-[A-Z0-9-]+$`;
- all matrix node IDs participate in the global governed-ID uniqueness check;
- `npm run ...` command nodes must map to package scripts;
- governed validation scripts in `package.json` must have matching command nodes;
- command nodes that represent package scripts must have `DECLARED_IN package.json` triples.

The future JSON Schema may encode intrinsic ID patterns for `Gate`, `Command`, and `ValidationTool` using conditional schema clauses.
However, compatibility with registered node types and external package scripts must remain semantic validation.

### `triples[]`

Each triple item has this local shape:

| Field | Classification | Purpose | Required | Value source |
| --- | --- | --- | --- | --- |
| `subject.id` | `governed_id` or `repository_path` | Subject entity identifier. | Yes | Registry ID, matrix node ID, or repository path. |
| `subject.type` | `controlled_value` | Subject node type. | Yes | `governance.registry.yml / node_types[].id`. |
| `predicate` | `controlled_value` | Relationship type. | Yes | `governance.registry.yml / predicates[].id`. |
| `object.id` | `governed_id` or `repository_path` | Object entity identifier. | Yes | Registry ID, matrix node ID, or repository path. |
| `object.type` | `controlled_value` | Object node type. | Yes | `governance.registry.yml / node_types[].id`. |

The JSON Schema should require the subject object, predicate string, object object, and the nested `id` and `type` strings.
It should reject undeclared fields inside triple, subject, and object objects.
It should not duplicate the full controlled predicate catalog as hardcoded enum values unless the schema is generated from the governance registry or the governance model explicitly accepts schema duplication.

Current semantic triple rules include:

- `predicate` must exist in `governance.registry.yml / predicates`;
- `subject.type` and `object.type` must exist in `governance.registry.yml / node_types`;
- predicate `allowed_subject_types[]` must include the subject type;
- predicate `allowed_object_types[]` must include the object type;
- duplicate `subject.id + predicate + object.id` relationships are rejected;
- subjects and objects must be known through registries, matrix nodes, or repository-backed paths;
- baseline artifact `change_control` must be confirmed by matching `SPECIFIED_BY` and `DECIDES` triples;
- schema `x-applies_to`, artifact `schema_control`, and `APPLIES_TO` triples must agree bidirectionally;
- source-file `IMPLEMENTED_BY` triples must agree with file-level JSDoc references;
- validation command and package-script relationships must agree bidirectionally.

### Controlled node type and predicate compatibility

The graph matrix currently relies on the governance registry for node types and predicate compatibility.
This is the correct source-of-truth boundary.
A standalone graph matrix schema should validate that node and predicate fields are present and string-shaped, but the semantic validator should retain these compatibility checks:

| Relationship concern | JSON Schema | Semantic validator |
| --- | --- | --- |
| `subject.type` and `object.type` are strings. | Yes. | Yes, for registered type existence. |
| `predicate` is a string. | Yes. | Yes, for registered predicate existence. |
| Predicate allows the subject type. | No. | Yes, using governance registry predicate metadata. |
| Predicate allows the object type. | No. | Yes, using governance registry predicate metadata. |
| Entity IDs point to existing requirements, decisions, capabilities, paths, tools, commands, gates, or schemas. | No. | Yes, using registries, package scripts, and repository filesystem. |
| Duplicate SPO relationships are rejected. | Limited. | Yes, because diagnostics need stable relationship context. |

The schema should avoid becoming a second hidden predicate registry.
If future tooling wants schema-level enum checks for predicates or node types, those enums should be generated from the governance registry or validated for consistency against it.

## Rules

### What belongs in `graph-matrix.schema.json`

The graph matrix JSON Schema should own local, artifact-internal shape rules:

- top-level object with `schema_version`, `change_control`, future `schema_control`, `matrix`, `nodes`, and `triples`;
- `additionalProperties: false` at the top level and for nested objects;
- required fields for metadata, nodes, triples, subjects, and objects;
- non-empty string constraints for descriptions, IDs, types, predicates, commands, and paths;
- array constraints for `nodes` and `triples`;
- optional conditional local ID patterns for `Gate`, `Command`, and `ValidationTool` nodes;
- local shape of `change_control` and future `schema_control`.

### What must remain in semantic validation

The semantic validator must continue to own checks that depend on another governed source or the repository state:

- registry existence of capabilities, decisions, macro requirements, atomic requirements, node types, predicates, body profiles, and taxonomies;
- predicate subject/object compatibility from the governance registry;
- global governed-ID uniqueness across registries, nested requirement IDs, and matrix nodes;
- package script existence and `DECLARED_IN package.json` consistency;
- repository path existence for documents, source files, config files, schema files, and validation tools;
- baseline artifact `change_control` consistency with `DECIDES` and `SPECIFIED_BY` triples;
- schema application consistency across `x-applies_to`, artifact `schema_control`, and `APPLIES_TO` triples;
- source-file JSDoc to `IMPLEMENTED_BY` bidirectional traceability;
- implemented requirement evidence and gate verification semantics;
- future graph import normalization, graph profile generation, visualization, and storage-specific constraints.

### Hardcoded tool inventory to remove gradually

The current implementation still hardcodes graph matrix knowledge in deterministic tools.
The schema rollout should remove only the hardcoded shape rules that become schema-owned, not the semantic rules that require cross-file context.

| Tool | Current graph-matrix responsibility | Migration direction |
| --- | --- | --- |
| `tools/docs/check-docs-structure.mjs` | Requires the graph matrix file and governs the project-model directory boundary. | Keep as structure guard; add schema files only when they become governed required files. |
| `tools/docs/check-docs-format.mjs` | Checks graph matrix YAML parseability and required top-level keys. | Replace local graph matrix shape checks with `graph-matrix.schema.json` once the schema exists. |
| `tools/docs/check-project-model.mjs` | Validates graph vocabulary, SPO compatibility, command/package consistency, baseline traceability, schema application traceability, and source traceability. | Keep semantic checks; only delegate pure matrix shape validation to the schema. |
| `tools/docs/generate-governance-control-report.mjs` | Consumes graph-model validation results indirectly through governed registries and checks. | Continue consuming validated data; do not become a schema authority. |
| `tools/docs/generate-governance-control-page.mjs` | Renders report data and must not infer graph validity. | Continue treating the report as the authoritative input. |

### Future schema creation checklist

The next schema-contract micropasso should not implement graph storage or graph visualization.
It should only turn this analysis into an executable local shape contract.
The minimum checklist is:

1. create `docs/reference/project-model/schemas/graph-matrix.schema.json`;
2. give the schema `x-change_control` and `x-applies_to` metadata;
3. add `schema_control` to `graph.matrix.yml`;
4. update `tools/docs/check-docs-format.mjs` to load and apply the graph matrix schema;
5. update `tools/docs/check-project-model.mjs` to include the schema in managed baseline artifacts;
6. add a negative fixture proving schema-rejected graph matrix properties fail validation;
7. keep predicate compatibility, entity existence, path checks, command checks, and traceability checks in semantic validation.

