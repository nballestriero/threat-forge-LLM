# Governance control page

## Context

The repository now has deterministic governance checks for structure, project model consistency, file format, command traceability, and negative fixtures.

Those checks are effective as terminal gates, but they are not enough for human exploration, future protected administration, or non-interactive LLM/tool consumption.

## Explanation

The governance control surface is report-first and UI-second.

A deterministic report builder should read governed repository files and produce a machine-readable Governance Control Report.

The static HTML page is a local visual consumer of that report. It should make documentation, requirements, decisions, checks, graphs, file relationships, and diagnostics easier to inspect.

The future protected admin UI should consume or expose the same report model instead of duplicating parsing logic.

The report should support these views:

- repository health and check status
- documentation explorer
- project model explorer
- knowledge graph derived from governed SPO triples
- documentation graph derived from document structure and links
- file relationship graph derived from governed relationships and later technical dependency analysis
- structured diagnostics

The page should not introduce authentication, authorization, server runtime, or database requirements in the static generation step.

## Consequences

The first implementation should generate `artifacts/governance-control/report.json` and `artifacts/governance-control/index.html`.

The generated artifacts should remain build outputs rather than governed source files.

The report contract must be stable enough for CLI tools, future backend APIs, admin UI, and LLM agents.

Future backend/admin work must treat the report contract as a source of truth and avoid separate UI-specific repository parsing.
