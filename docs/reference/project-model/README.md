# Project model reference

## Purpose

This directory contains the compact, canonical project model used to govern requirements, decisions, documentation formats, traceability, and future graph import.

The project model is intentionally concentrated in a small number of files to avoid uncontrolled registry sprawl.

## Canonical files

| File | Purpose |
| --- | --- |
| `governance.registry.yml` | Controlled governance vocabulary: capabilities, decisions, document types, body profiles, node types, and graph predicates. |
| `requirements.registry.yml` | Authoritative registry of macro requirements and atomic requirements. |
| `graph.matrix.yml` | Canonical Subject-Predicate-Object matrix for traceability, coherence, conflicts, implementation links, test links, and future graph import. |

## Rules

- Registries define governed entities.
- The graph matrix defines governed relationships.
- All governed relationships must be represented as Subject-Predicate-Object triples.
- Human-friendly grouped fields may exist only as derived views or if they are deterministically validated against equivalent SPO triples.
- Markdown documents must eventually be validated against registered body profiles, not only against frontmatter.
