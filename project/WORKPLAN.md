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

## Next steps

### M000.022E - Requirements registry schema analysis

Goal: classify requirements.registry.yml fields before creating explicit schema artifacts.

Expected scope:

- requirements registry field inventory
- free text vs controlled value classification
- requirement lifecycle and verification dataset mapping
- current hardcoded validator rule inventory
- schema boundary vs semantic validator boundary

### M000.022F - Graph matrix schema analysis

Goal: classify graph.matrix.yml fields before creating explicit schema artifacts.

Expected scope:

- graph matrix node and triple field inventory
- controlled node type and predicate mapping
- repository path and command field policy
- current hardcoded graph validator rule inventory
- schema boundary vs semantic validator boundary

### M000.022G - Remaining registry schema contracts

Goal: create explicit machine-readable schema files for governed registries and the graph matrix.

Expected scope:

- requirements registry schema
- requirements registry schema
- graph matrix schema
- controlled field to dataset/taxonomy mapping
- controlled value meaning, rationale, and validation impact
- validator updated to read canonical registry schemas

### M000.023 - Protected baseline artifact roots

Goal: define protected roots for contracts, registry schemas, project-model registries, and future API contracts.

Expected scope:

- protected artifact root registry/policy
- deterministic detection of protected artifact changes
- traceability requirements for protected contract/schema changes
- no manual bypass when protected artifact checks fail

### M000.024 - Governance control report and page negative fixtures

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
