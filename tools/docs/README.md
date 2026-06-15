# Documentation tools

## Purpose

This directory contains deterministic documentation governance tools.

## Current tools

| Tool | Purpose |
| --- | --- |
| `check-docs-structure.mjs` | Checks the governed documentation folder and canonical file layout. |
| `check-project-model.mjs` | Checks project-model consistency and file-level bidirectional traceability. |
| `check-docs-format.mjs` | Checks governed YAML and Markdown file formats. |
| `check-validator-negative-fixtures.mjs` | Runs controlled negative fixtures for validators. |
| `generate-governance-control-report.mjs` | Builds and validates the machine-readable Governance Control Report. |
| `generate-governance-control-page.mjs` | Renders the static Governance Control Page from report data. |

## Usage

Install dependencies once per clone:

```bash
npm install
```

Run the structure guard:

```bash
npm run docs:check:structure
```

Run the project-model validator:

```bash
npm run docs:check:model
```

Run the file format validator:

```bash
npm run docs:check:format
```

Run the Governance Control Report check without writing artifacts:

```bash
npm run docs:check:control-report
```

Generate the Governance Control Report artifact:

```bash
npm run docs:control:report
```

Run the Governance Control Page check without writing artifacts:

```bash
npm run docs:check:control-page
```

Generate the static Governance Control Page artifact:

```bash
npm run docs:control:page
```

Run controlled negative fixtures:

```bash
npm run docs:test:negative
```

Run all documentation checks:

```bash
npm run docs:check
```

## Commit blocking

The repository provides a versioned Git hook under `.githooks/pre-commit`.

Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

After that, commits are blocked when `npm run docs:check` fails.

## Traceability comments

Governed source files under `tools/` must include file-level JSDoc traceability comments. The project-model validator checks both directions:

- `graph.matrix.yml` to source comments
- source comments to `graph.matrix.yml`
- `package.json` scripts to `Command` nodes
- `Command` nodes to `package.json` scripts
