#!/usr/bin/env node
/**
 * @file Validator negative fixture runner.
 *
 * Executes controlled negative fixtures against deterministic documentation
 * governance validators. Each fixture mutates a temporary repository copy and
 * verifies that the selected validator fails with the expected diagnostic.
 * Fixtures may replace text in existing files or create controlled temporary
 * files inside the copied repository.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - REQ-0008
 *
 * Supports capabilities:
 * - CAP-REQUIREMENTS-MANAGEMENT
 *
 * Provides graph nodes:
 * - TOOL-VALIDATOR-NEGATIVE-FIXTURES
 *
 * Related commands:
 * - CMD-DOCS-TEST-NEGATIVE
 *
 * Failure behavior:
 * - Prints every negative fixture failure.
 * - Exits with status code 1 when any invalid fixture is accepted or any
 *   expected diagnostic is missing.
 * - Exits with status code 0 when all negative fixtures fail as expected.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const fixturesDirectory = path.join(root, "tools", "docs", "fixtures", "negative");
const errors = [];

/**
 * Converts a repository-relative path into an absolute path inside a root.
 *
 * @param {string} baseRoot - Absolute root path.
 * @param {string} relativePath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function absolutePath(baseRoot, relativePath) {
  return path.join(baseRoot, relativePath);
}

/**
 * Reads and parses a JSON fixture file.
 *
 * @param {string} filePath - Absolute fixture file path.
 * @returns {object | null} Parsed fixture or null when parsing fails.
 */
function readFixture(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Cannot read fixture ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Copies the working tree into a temporary directory while excluding heavy or
 * local-only directories.
 *
 * @param {string} sourceRoot - Absolute source repository root.
 * @param {string} targetRoot - Absolute temporary repository root.
 * @returns {void}
 */
function copyWorkingTree(sourceRoot, targetRoot) {
  const excludedNames = new Set([".git", "node_modules", ".vs"]);

  fs.cpSync(sourceRoot, targetRoot, {
    recursive: true,
    filter: (source) => !excludedNames.has(path.basename(source))
  });
}

/**
 * Applies string replacement mutations declared by a fixture.
 *
 * @param {string} tempRoot - Absolute temporary repository root.
 * @param {object} fixture - Parsed fixture.
 * @returns {boolean} True when all mutations were applied.
 */
function applyMutations(tempRoot, fixture) {
  let ok = true;

  for (const mutation of fixture.mutations ?? []) {
    const target = absolutePath(tempRoot, mutation.path);

    if (mutation.create === true) {
      if (fs.existsSync(target)) {
        errors.push(`${fixture.id}: create mutation target already exists: ${mutation.path}`);
        ok = false;
        continue;
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, mutation.content ?? "", "utf8");
      continue;
    }

    let content;

    try {
      content = fs.readFileSync(target, "utf8");
    } catch (error) {
      errors.push(`${fixture.id}: cannot read mutation target ${mutation.path}: ${error.message}`);
      ok = false;
      continue;
    }

    if (!content.includes(mutation.replace)) {
      errors.push(`${fixture.id}: mutation target ${mutation.path} does not contain expected text: ${mutation.replace}`);
      ok = false;
      continue;
    }

    const updated = content.replace(mutation.replace, mutation.with);
    fs.writeFileSync(target, updated, "utf8");
  }

  return ok;
}

/**
 * Returns the absolute validator script path for a fixture.
 *
 * @param {string} validator - Fixture validator key.
 * @returns {string | null} Absolute validator path or null for unknown keys.
 */
function validatorScriptPath(validator) {
  const scripts = {
    model: "tools/docs/check-project-model.mjs",
    format: "tools/docs/check-docs-format.mjs"
  };

  const script = scripts[validator];
  return script ? absolutePath(root, script) : null;
}

/**
 * Runs the selected validator against a temporary repository copy.
 *
 * @param {string} tempRoot - Absolute temporary repository root.
 * @param {object} fixture - Parsed fixture.
 * @returns {{ exitCode: number, output: string }} Validator result.
 */
function runValidator(tempRoot, fixture) {
  const scriptPath = validatorScriptPath(fixture.validator);
  if (!scriptPath) {
    return {
      exitCode: 1,
      output: `Unknown validator key: ${fixture.validator}`
    };
  }

  try {
    const output = execFileSync(process.execPath, [scriptPath], {
      cwd: tempRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    return {
      exitCode: 0,
      output
    };
  } catch (error) {
    return {
      exitCode: typeof error.status === "number" ? error.status : 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`
    };
  }
}

/**
 * Runs one negative fixture and verifies the expected failure.
 *
 * @param {object} fixture - Parsed fixture.
 * @returns {void}
 */
function runFixture(fixture) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threat-forge-llm-negative-"));

  try {
    copyWorkingTree(root, tempRoot);

    if (!applyMutations(tempRoot, fixture)) {
      return;
    }

    const result = runValidator(tempRoot, fixture);

    if (result.exitCode === 0) {
      errors.push(`${fixture.id}: validator accepted an invalid fixture.`);
      return;
    }

    if (!result.output.includes(fixture.expected_error)) {
      errors.push(`${fixture.id}: expected diagnostic not found: ${fixture.expected_error}`);
      errors.push(`${fixture.id}: actual output was:\n${result.output}`);
      return;
    }

    console.log(`Negative fixture passed: ${fixture.id}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

const fixtureFiles = fs
  .readdirSync(fixturesDirectory)
  .filter((file) => file.endsWith(".json"))
  .sort();

for (const fixtureFile of fixtureFiles) {
  const fixture = readFixture(path.join(fixturesDirectory, fixtureFile));
  if (fixture) {
    runFixture(fixture);
  }
}

if (errors.length > 0) {
  console.error("Validator negative fixture check failed.");
  console.error("");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  console.error("Fix the negative fixtures or the validators they exercise.");
  process.exit(1);
}

console.log("Validator negative fixture check passed.");
