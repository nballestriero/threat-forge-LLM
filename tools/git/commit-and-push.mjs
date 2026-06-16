#!/usr/bin/env node
/**
 * @file Governed commit and push workflow command.
 *
 * Calculates the repository change set, rejects forbidden or ambiguous paths,
 * stages only the allowed changed paths, runs the governed documentation gate,
 * creates the requested commit, verifies post-commit repository cleanliness, and
 * pushes only after all blocking gates pass.
 *
 * The command intentionally does not use `git add -A`. Staging is computed from
 * Git status so new, modified, renamed, and deleted files are reviewed against
 * a conservative repository allowlist before they can enter the commit.
 *
 * Usage:
 *   npm run repo:commit-push -- "commit message"
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - source-traceability:REQ-0015
 *
 * Related decisions:
 * - source-traceability:DEC-0015
 *
 * Supports capabilities:
 * - CAP-REQUIREMENTS-MANAGEMENT
 *
 * Provides graph nodes:
 * - TOOL-GOVERNED-COMMIT-PUSH
 *
 * Related commands:
 * - CMD-REPO-COMMIT-PUSH
 *
 * Failure behavior:
 * - Fails closed when the change set is empty, forbidden, ambiguous, or outside
 *   governed repository paths.
 * - Fails closed when docs:check, git commit, repo:check:clean, or git push
 *   fails, leaving diagnostics from the blocking command visible to the user.
 * - Exits with status code 0 only after a successful push.
 */

import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";

const FORBIDDEN_PREFIXES = [
  "artifacts/",
  "node_modules/",
  ".vs/",
  ".git/"
];

const FORBIDDEN_EXACT_PATHS = new Set([
  "HANDOFF-ZIP-MANIFEST.json"
]);

const FORBIDDEN_EXTENSIONS = [
  ".zip",
  ".log",
  ".tmp",
  ".temp",
  ".bak"
];

const ALLOWED_PREFIXES = [
  ".githooks/",
  "docs/",
  "project/",
  "tools/"
];

const ALLOWED_EXACT_PATHS = new Set([
  ".gitattributes",
  ".gitignore",
  "README.md",
  "package.json",
  "package-lock.json"
]);

/**
 * Runs a command and returns stdout.
 *
 * @param {string} command - Executable name.
 * @param {string[]} args - Command arguments.
 * @returns {string} Command stdout.
 */
function readCommand(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

/**
 * Resolves executable names that are safe to spawn without a shell.
 *
 * @param {string} command - Portable executable name.
 * @returns {string} Platform-specific executable name.
 */
function resolveExecutable(command) {
  if (process.platform !== "win32") {
    return command;
  }

  if (command === "git") {
    return "git.exe";
  }

  return command;
}

/**
 * Resolves an npm script invocation.
 *
 * On Windows, npm is normally exposed through a .cmd shim. That shim cannot be
 * executed reliably with shell=false, while enabling shell=true for every
 * command would split commit-message arguments. Keep Git shell-free and use a
 * shell only for npm script invocations, whose arguments are controlled script
 * names without user-provided whitespace.
 *
 * @param {string} scriptName - package.json script name.
 * @returns {{ command: string, args: string[], shell: boolean }} Invocation.
 */
function resolveNpmScriptInvocation(scriptName) {
  if (process.platform === "win32") {
    return { command: "npm", args: ["run", scriptName], shell: true };
  }

  return { command: "npm", args: ["run", scriptName], shell: false };
}

/**
 * Runs a command with inherited stdio and fails closed on non-zero status.
 *
 * The default execution path avoids shell mode so arguments containing spaces,
 * such as commit messages, are passed as one argv entry. Callers may explicitly
 * enable shell mode only for controlled invocations such as npm script names.
 *
 * @param {string} command - Executable name.
 * @param {string[]} args - Command arguments.
 * @param {string} failureMessage - Message printed when the command fails.
 * @param {{ shell?: boolean }} [options] - Spawn options.
 * @returns {void}
 */
function runBlocking(command, args, failureMessage, options = {}) {
  const useShell = options.shell === true;
  const result = spawnSync(useShell ? command : resolveExecutable(command), args, {
    stdio: "inherit",
    shell: useShell
  });

  if (result.error) {
    console.error(`${failureMessage} ${result.error.message}`);
    console.error("Review is required before the governed commit/push flow can continue.");
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(failureMessage);
    console.error("Review is required before the governed commit/push flow can continue.");
    process.exit(result.status ?? 1);
  }
}

/**
 * Runs an npm package script with inherited stdio and fails closed on errors.
 *
 * @param {string} scriptName - package.json script name.
 * @param {string} failureMessage - Message printed when the script fails.
 * @returns {void}
 */
function runNpmScript(scriptName, failureMessage) {
  const invocation = resolveNpmScriptInvocation(scriptName);
  runBlocking(invocation.command, invocation.args, failureMessage, { shell: invocation.shell });
}

/**
 * Runs Git and returns stdout as a string.
 *
 * @param {string[]} args - Git arguments.
 * @returns {string} Git stdout.
 */
function git(args) {
  return readCommand("git", args).trim();
}

/**
 * Normalizes repository paths for policy checks.
 *
 * @param {string} repositoryPath - Repository-relative path from Git.
 * @returns {string} Normalized path.
 */
function normalizeRepositoryPath(repositoryPath) {
  return repositoryPath.replaceAll("\\\\", "/").replace(/^\.\//u, "");
}

/**
 * Reports whether a path is forbidden by policy.
 *
 * @param {string} repositoryPath - Normalized repository-relative path.
 * @returns {string | null} Human-readable reason, or null when not forbidden.
 */
function forbiddenReason(repositoryPath) {
  if (repositoryPath.includes("\0")) {
    return "contains a NUL byte";
  }

  if (repositoryPath === "" || repositoryPath.startsWith("/") || repositoryPath.includes("../") || repositoryPath === "..") {
    return "is not a safe repository-relative path";
  }

  if (FORBIDDEN_EXACT_PATHS.has(repositoryPath)) {
    return "is a generated handoff/archive manifest and must not be committed";
  }

  for (const prefix of FORBIDDEN_PREFIXES) {
    if (repositoryPath === prefix.slice(0, -1) || repositoryPath.startsWith(prefix)) {
      return `is under forbidden path ${prefix}`;
    }
  }

  for (const extension of FORBIDDEN_EXTENSIONS) {
    if (repositoryPath.endsWith(extension)) {
      return `uses forbidden temporary/archive extension ${extension}`;
    }
  }

  return null;
}

/**
 * Reports whether a path is inside a governed repository area that may be
 * staged automatically by this command.
 *
 * @param {string} repositoryPath - Normalized repository-relative path.
 * @returns {boolean} True when the path is allowed for automatic staging.
 */
function isAllowedRepositoryPath(repositoryPath) {
  if (ALLOWED_EXACT_PATHS.has(repositoryPath)) {
    return true;
  }

  return ALLOWED_PREFIXES.some((prefix) => repositoryPath.startsWith(prefix));
}

/**
 * Parses Git porcelain v1 -z status output into changed paths that need staging.
 *
 * @param {string} output - NUL-delimited Git status output.
 * @returns {string[]} Normalized paths to stage.
 */
function parseStatusPaths(output) {
  const entries = output.split("\0").filter(Boolean);
  const paths = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry.length < 4) {
      throw new Error(`Cannot parse git status entry: ${entry}`);
    }

    const status = entry.slice(0, 2);
    const repositoryPath = normalizeRepositoryPath(entry.slice(3));
    paths.push(repositoryPath);

    if (status.includes("R") || status.includes("C")) {
      const originalPath = entries[index + 1];
      if (!originalPath) {
        throw new Error(`Cannot parse renamed/copied git status entry for ${repositoryPath}`);
      }
      paths.push(normalizeRepositoryPath(originalPath));
      index += 1;
    }
  }

  return [...new Set(paths)].sort();
}

/**
 * Validates the computed change set and returns review-blocking errors.
 *
 * @param {string[]} changedPaths - Normalized changed paths.
 * @returns {string[]} Error messages.
 */
function validateChangedPaths(changedPaths) {
  const errors = [];

  if (changedPaths.length === 0) {
    errors.push("No Git changes were found to stage, commit, and push.");
    return errors;
  }

  for (const changedPath of changedPaths) {
    const forbidden = forbiddenReason(changedPath);
    if (forbidden) {
      errors.push(`${changedPath}: ${forbidden}`);
      continue;
    }

    if (!isAllowedRepositoryPath(changedPath)) {
      errors.push(`${changedPath}: is outside governed automatic-staging paths; review and extend the allowlist intentionally if this file is legitimate`);
    }
  }

  return errors;
}

const commitMessage = process.argv.slice(2).join(" ").trim();

if (!commitMessage) {
  console.error("Usage: npm run repo:commit-push -- \"commit message\"");
  console.error("A non-empty commit message is required.");
  process.exit(1);
}

let repositoryRoot;
try {
  if (git(["rev-parse", "--is-inside-work-tree"]) !== "true") {
    throw new Error("current directory is not inside a Git working tree");
  }
  repositoryRoot = git(["rev-parse", "--show-toplevel"]);
} catch (error) {
  console.error(`Cannot inspect Git repository: ${error.message}`);
  process.exit(1);
}

process.chdir(repositoryRoot);

let changedPaths;
try {
  changedPaths = parseStatusPaths(readCommand("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]));
} catch (error) {
  console.error(`Cannot parse Git status: ${error.message}`);
  process.exit(1);
}

const pathErrors = validateChangedPaths(changedPaths);
if (pathErrors.length > 0) {
  console.error("Governed commit/push change-set review failed.");
  console.error("The command stages only known governed repository paths and fails closed for unsafe or ambiguous entries.");
  for (const error of pathErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Governed commit/push change set:");
for (const changedPath of changedPaths) {
  console.log(`- ${changedPath}`);
}

runBlocking("git", ["add", "--", ...changedPaths], "git add failed for the governed change set.");
runNpmScript("docs:check", "docs:check failed; commit was not created.");
runBlocking("git", ["commit", "-m", commitMessage], "git commit failed.");
runNpmScript("repo:check:clean", "repo:check:clean failed after commit.");
runBlocking("git", ["push"], "git push failed.");

console.log("Governed commit/push flow completed successfully.");
