# Contracts reference

## Purpose

Hold governed data, report, and future API contract reference material.

Contracts define interfaces consumed by tools, generated pages, future backend APIs, admin surfaces, and LLM agents.

## Schema

Current contract reference files:

- `governance-control-report.contract.md`
- `governance-control-report.schema.json`

Future files may include OpenAPI contracts once their implementation step is reached.

## Rules

JSON Schema is the canonical external contract format for machine-readable reports and structured data artifacts.

OpenAPI or an equivalent governed HTTP contract is the canonical external contract format for public backend HTTP behavior.

Zod may be used as runtime validation inside JavaScript or TypeScript code, but it must not become a divergent source of truth from canonical JSON Schema or OpenAPI contracts.

Contract files must be linked to requirements and decisions through the graph matrix.

The format validator must parse and check governed contract files before generated reports or pages depend on them.
