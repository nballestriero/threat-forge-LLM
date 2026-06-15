# Governance control report contract

## Purpose

Define the initial contract design for the machine-readable Governance Control Report.

The report is the canonical data interface for the static governance control page, future protected admin UI, CLI tools, backend APIs, and LLM consumers.

## Schema

The canonical external contract file is:

```text
docs/reference/contracts/governance-control-report.schema.json
```

The report JSON uses this top-level structure:

```json
{
  "schema_version": "1.0",
  "generated_at": "ISO-8601 timestamp",
  "repository": {},
  "checks": [],
  "documents": [],
  "requirements": [],
  "decisions": [],
  "capabilities": [],
  "commands": [],
  "tools": [],
  "gates": [],
  "graphs": {
    "knowledge": {
      "nodes": [],
      "edges": []
    },
    "documentation": {
      "nodes": [],
      "edges": []
    },
    "file_relationships": {
      "nodes": [],
      "edges": []
    }
  },
  "diagnostics": []
}
```

Entity records expose stable governed identifiers, type, title or label, status fields where available, source path, and derived relationships.

Graph edges use normalized source, predicate, and target fields derived from governed Subject-Predicate-Object triples or deterministic document analysis.

Diagnostics use structured fields including severity, code, message, subject, evidence, and suggested action.

## Rules

The canonical external contract for the report is JSON Schema.

The static HTML page must consume a validated report instead of re-reading repository files independently.

Future protected admin APIs must expose or derive from the same report model.

LLM and non-interactive tool consumers must be able to use the report JSON without the HTML page.

Zod may be introduced for runtime validation inside implementation code, but it must be generated from, checked against, or otherwise kept aligned with the canonical JSON Schema.

The report contract must be versioned through `schema_version`.

Breaking report contract changes require an accepted decision or explicitly governed migration step.

The current JSON Schema contract defines the baseline report shape.

The report builder writes `artifacts/governance-control/report.json` and supports a check mode that validates report generation without writing generated artifacts.

The report builder executes leaf validation commands and records real check status fields:

- `status`
- `exit_code`
- `duration_ms`
- `stdout_excerpt`
- `stderr_excerpt`

The builder must not execute aggregate commands such as `docs:check`, `docs:check:control-report`, or `docs:check:control-page` from inside report generation because those commands can recursively invoke the report builder.

The static page builder renders `artifacts/governance-control/index.html` from report data and supports a check mode that renders in memory from a temporary report.

Later implementation steps may make individual entity shapes stricter as the report builder matures.
