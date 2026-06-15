# Documentation tools

## Purpose

This directory contains deterministic documentation governance tools.

## Current tools

| Tool | Purpose |
| --- | --- |
| `check-docs-structure.mjs` | Checks the governed documentation folder and canonical file layout. |

## Usage

Run the structure guard manually:

```bash
npm run docs:check:structure
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
