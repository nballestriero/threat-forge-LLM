#!/usr/bin/env node
/**
 * @file Repository post-commit/pre-push cleanliness guard.
 *
 * Verifies that the repository has no staged, unstaged, or untracked
 * non-ignored changes after a commit and before a push. The guard also rejects
 * any Git-tracked or staged file under artifacts/, which is reserved for local
 * generated outputs and handoff archives.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - source-traceability:REQ-0013
 *
 * Related decisions:
 * - source-traceability:DEC-0013
 *
 * Supports capabilities:
 * - CAP-REQUIREMENTS-MANAGEMENT
 *
 * Provides graph nodes:
 * - TOOL-REPO-CLEAN-CHECK
 *
 * Related commands:
 * - CMD-REPO-CHECK-CLEAN
 *
 * Failure behavior:
 * - Prints review-oriented diagnostics for dirty index, dirty working tree, or
 *   unsafe artifacts/ tracking.
 * - Exits with status code 1 when repository cleanliness is unsafe for push.
 * - Exits with status code 0 when the repository is clean and artifacts/ is not
 *   tracked or staged.
 */

import { execFileSync } from "node:child_process";
import process from "node:process";

/**
 * Runs a Git command and returns stdout as trimmed text.
 *
 * @param {string[]} args - Git command arguments.
 * @returns {string} Trimmed stdout.
 */
function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

/**
 * Splits Git output into non-empty lines.
 *
 * @param {string} output - Git stdout.
 * @returns {string[]} Non-empty output lines.
 */
function lines(output) {
  return output.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
}

/**
 * Adds a multi-line diagnostic section.
 *
 * @param {string[]} errors - Error accumulator.
 * @param {string} title - Diagnostic title.
 * @param {string[]} entries - Diagnostic entries.
 * @returns {void}
 */
function addSection(errors, title, entries) {
  if (entries.length === 0) {
    return;
  }

  errors.push(`${title}:`);
  for (const entry of entries) {
    errors.push(`  - ${entry}`);
  }
}

const errors = [];

try {
  if (git(["rev-parse", "--is-inside-work-tree"]) !== "true") {
    errors.push("Current directory is not inside a Git working tree.");
  }
} catch (error) {
  errors.push(`Cannot inspect Git repository state: ${error.message}`);
}

if (errors.length === 0) {
  const statusEntries = lines(git(["status", "--porcelain=v1", "--untracked-files=all"]));
  const trackedArtifacts = lines(git(["ls-files", "--", "artifacts"]));
  const stagedArtifacts = lines(git(["diff", "--cached", "--name-only", "--", "artifacts"]));

  addSection(errors, "Repository has staged, unstaged, or untracked non-ignored changes", statusEntries);
  addSection(errors, "artifacts/ contains Git-tracked files", trackedArtifacts);
  addSection(errors, "artifacts/ contains staged files", stagedArtifacts);
}

if (errors.length > 0) {
  console.error("Repository cleanliness check failed.");
  console.error("Review is required before push. Commit, unstage, revert, or remove the listed entries, then rerun npm run repo:check:clean.");
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log("Repository cleanliness check passed.");
