# Project model reference

## Purpose

This directory contains the compact, canonical project model used to govern requirements, decisions, documentation formats, traceability, and future graph import.

## Schema

Canonical files:

- `governance.registry.yml`
- `requirements.registry.yml`
- `graph.matrix.yml`

## Rules

Registries define governed entities.

The graph matrix defines governed relationships.

All governed relationships must be represented as Subject-Predicate-Object triples.

Human-friendly grouped fields may exist only as derived views or if they are deterministically validated against equivalent SPO triples.

Markdown documents must be validated against registered body profiles, not only against frontmatter.
