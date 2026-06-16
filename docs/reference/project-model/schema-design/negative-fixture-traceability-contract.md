# Negative fixture traceability contract

## Purpose

This document defines the contract for tracing negative validator fixtures before enforcement is added.

The project already uses negative fixtures to prove that deterministic validators fail for known invalid states. Those fixtures are safety controls, not incidental test data. They must eventually be represented in the project model so the repository can prove which control each fixture protects and so new controls cannot be added without corresponding negative coverage.

This micropasso intentionally does not change the fixture runner or enforce repository-wide fixture inventory. It records the model boundary first because negative fixtures are executed in isolated invalid workspaces, and applying repository-wide fixture inventory rules inside those workspaces would make fixtures fail for the wrong reason.

## Problem statement

A negative fixture has two different meanings depending on where validation runs:

```text
real repository checkout:
  fixture files are governed safety artifacts and must be inventoried and traced

fixture execution workspace:
  the workspace is intentionally incomplete or invalid and must not be required
  to contain the full real-repository fixture inventory
```

If the project enforces fixture inventory globally without this distinction, a fixture designed to test one missing relationship can fail first because the isolated workspace does not include every real fixture traceability relationship. That would give false confidence because the negative test would no longer verify the intended diagnostic class.

## Contract

Negative fixture traceability uses a dedicated graph entity type:

```text
NegativeFixture
```

A `NegativeFixture` is a repository-owned invalid input fixture that is expected to make a deterministic validator fail for a specific governed reason.

Future graph records should model negative fixture coverage with these relationships:

```text
ValidationTool or Gate VALIDATES NegativeFixture
NegativeFixture EXERCISES Requirement, Gate, ValidationTool, or Command
NegativeFixture EXPECTS_FAILURE_OF ValidationTool, Gate, or Command
Requirement VERIFIED_BY NegativeFixture
```

The exact fixture file path remains the graph entity ID unless a later schema introduces structured fixture nodes with a separate `path` field.

## Required future enforcement boundary

The future enforcement must be split into two contexts.

### Real-repository inventory enforcement

When validating the actual repository checkout, the project model validator must reject:

- a file under `tools/docs/fixtures/negative/*.json` that has no graph traceability
- a graph `NegativeFixture` endpoint whose path does not exist
- a negative fixture that is not connected to the validator, gate, command, or requirement it exercises
- a deterministic control that has no negative fixture coverage unless explicitly marked not-applicable by a governed requirement or decision

### Fixture execution isolation

When `tools/docs/check-validator-negative-fixtures.mjs` prepares an isolated invalid workspace for one fixture, repository-wide fixture inventory must not be applied to that workspace unless the fixture is explicitly testing fixture inventory itself.

The negative fixture runner should continue to verify that each fixture fails validation, but the model validator must expose a mode or input boundary that allows the runner to validate the intended invalid project model without requiring the full real-repository fixture catalog.

## Transitional policy

Existing graph references that model negative fixture files as `ConfigFile` remain transitional until the enforcement step migrates them to `NegativeFixture` or introduces structured fixture nodes.

This document only introduces the target contract. It does not require immediate migration of all existing fixture references and does not add a failing gate for unregistered negative fixtures.

## Implementation sequence

The intended sequence is:

1. Define this contract and the requirement/decision that governs it. Completed by M000.025D1.
2. Add real-repository fixture inventory enforcement only in the main project-model validation context. Completed by M000.025D2.
3. Add negative coverage that proves an unregistered real fixture is rejected. Completed by M000.025D2.
4. Add expected-diagnostic or expected-control assertions only after the inventory enforcement is stable. Deferred.

## Non-goals

This contract does not introduce runtime application functionality.

This contract does not optimize the negative fixture runner.

This contract does not require every existing negative fixture to be migrated in this micropasso.

This contract does not make generated files under `artifacts/` governed source artifacts.
