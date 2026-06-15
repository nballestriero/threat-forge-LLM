# Documentation tools

## Purpose

This directory contains deterministic documentation governance tools.

## Current tools

| Tool | Purpose |
| --- | --- |
| `check-docs-structure.mjs` | Checks the governed documentation folder and canonical file layout. |
| `check-project-model.mjs` | Checks project-model consistency and file-level bidirectional traceability. |

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
