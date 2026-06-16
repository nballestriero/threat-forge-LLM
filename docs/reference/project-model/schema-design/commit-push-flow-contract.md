# Commit and push flow contract

## Purpose

This document defines the governed commit and push flow for pre-commit checks, post-commit/pre-push cleanliness validation, Git hooks, and the future governed commit/push helper.

The project has deterministic gates for documentation structure, project model semantics, JSON Schema validation, control report generation, control page generation, and negative fixtures. Those gates protect the content being committed, but they do not by themselves guarantee that a developer uses the same sequence every time or that generated changes are not left outside the commit before a push.

This contract records the future flow boundary first so the implementation can add scripts and hooks without accidentally breaking pre-commit behavior.

## Problem statement

A single repository cleanliness rule cannot be applied in every phase.

```text
pre-commit / docs:check:
  files are staged by design, so the repository is not fully clean

post-commit / pre-push:
  the commit has already been created, so the index and working tree should be clean
```

If a full `git status --porcelain` cleanliness check is placed directly inside `docs:check`, it will reject legitimate commits because staged files exist during the pre-commit gate. If no cleanliness check exists after the commit, generated outputs or accidental edits can remain outside the commit and still be pushed later by mistake.

## Contract

The governed flow has three separate layers.

### Commit-time gate

The existing `docs:check` gate remains pre-commit safe. It validates the project model and generated governance outputs, but it must not require a fully clean working tree while files are staged for the commit being checked.

Blocking failures at this layer indicate that the commit content is invalid and requires revision before the commit can complete.

### Post-commit / pre-push cleanliness gate

The `repo:check:clean` command must run after a successful commit and before push. It shall reject:

- staged files left in the index
- unstaged tracked-file modifications
- untracked files that are not intentionally ignored or explicitly allowed
- tracked files under `artifacts/`
- staged files under `artifacts/`

Blocking failures at this layer indicate that a commit was incomplete or that generated/unintended changes require review before push.

### Governed commit/push command

The governed command provides the standard operator path for repository changes. The command must own staging rather than requiring a manual `git add` step. It shall:

1. read Git status and compute the changed, new, renamed, and deleted path set
2. reject forbidden paths, generated artifacts, temporary archives, handoff manifests, and paths outside the governed automatic-staging allowlist
3. stage only the computed allowed paths
4. run `docs:check`
5. create the requested commit when the gate passes
6. run `repo:check:clean`
7. push only if the post-commit cleanliness gate passes

The command must fail closed: a blocking gate must stop the commit or push and report that human review is required. It must not use `git add -A`, silently bypass hooks, or automatically include `artifacts/`.

The automatic-staging allowlist is intentionally conservative. Normal governed project changes may be staged from `.githooks/`, `docs/`, `project/`, `tools/`, and selected root metadata files such as `package.json`, `package-lock.json`, `.gitignore`, `.gitattributes`, and `README.md`. A new path outside that boundary requires an intentional change to the allowlist and its traceability.

## Hook policy

The versioned Git `pre-push` hook executes the same post-commit cleanliness gate so manual `git push` commands cannot bypass the official flow.

The hook is deterministic and local to the repository. It uses `npm run repo:check:clean` rather than duplicating policy in shell-only hook logic.

## Artifact policy

`artifacts/` remains an output location for generated handoff archives and other transient data. It is not a governed source root. Future enforcement must ensure that artifacts are not committed or staged and are not treated as canonical source material by the project model.

## Implementation sequence

The intended sequence is:

1. Define this contract and the requirement/decision that governs it. Completed by M000.025E1.
2. Add `repo:check:clean` as a governed script. Completed by M000.025E2.
3. Add a Git `pre-push` hook that invokes the same clean check. Completed by M000.025E3.
4. Add a governed commit/push helper command that computes staging, runs checks, commits, verifies cleanliness, and pushes. Completed by M000.025E4.
