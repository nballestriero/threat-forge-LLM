# DEC-0001 - Clean restart

## Status

Accepted.

## Decision

The threat-forge-LLM project starts as a clean repository.

The previous threat-forge project is abandoned and is not considered a parent repository, upstream repository, migration source, or authoritative source of requirements.

## Consequences

- No old git history is imported.
- No old branches or tags are preserved.
- Old documentation is not copied by default.
- Old design ideas can be reconsidered later only through explicit new decisions.
