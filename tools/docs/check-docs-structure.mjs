#!/usr/bin/env node
/**
 * @file Deterministic documentation structure guard.
 *
 * Validates the governed Diátaxis folder structure and the compact
 * project-model file layout.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - REQ-0004
 * - REQ-0023
 * - REQ-0024
 * - REQ-0027
 * - REQ-0028
 * - REQ-0030
 * - REQ-0031
 * - REQ-0034
 * - REQ-0035
 *
 * Supports capabilities:
 * - CAP-DOCUMENTATION-GOVERNANCE
 *
 * Provides graph nodes:
 * - TOOL-DOCS-STRUCTURE-GUARD
 *
 * Related commands:
 * - CMD-DOCS-CHECK-STRUCTURE
 *
 * Failure behavior:
 * - Prints all detected structure violations.
 * - Exits with status code 1 when validation fails.
 * - Exits with status code 0 when validation passes.
 *
 * This tool intentionally has no project-specific runtime dependencies beyond
 * Node.js so it can guard the repository layout before deeper validation tools
 * run.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredDirectories = [
  "docs",
  "docs/tutorials",
  "docs/how-to",
  "docs/reference",
  "docs/reference/project-model",
  "docs/reference/project-model/schema-design",
  "docs/reference/project-model/schemas",
  "docs/reference/contracts",
  "docs/reference/architecture",
  "docs/reference/domain-model",
  "docs/explanation",
  "docs/explanation/product",
  "docs/explanation/governance",
  "docs/explanation/architecture",
  "docs/explanation/decisions",
  "project",
  "tools",
  "tools/docs",
  ".githooks"
];

const requiredFiles = [
  "README.md",
  ".gitignore",
  ".gitattributes",
  "package.json",
  "docs/README.md",
  "docs/tutorials/README.md",
  "docs/how-to/README.md",
  "docs/reference/README.md",
  "docs/reference/project-model/README.md",
  "docs/reference/project-model/governance.registry.yml",
  "docs/reference/project-model/requirements.registry.yml",
  "docs/reference/project-model/graph.matrix.yml",
  "docs/reference/project-model/schema-design/governance-registry-schema-analysis.md",
  "docs/reference/project-model/schema-design/requirements-registry-schema-analysis.md",
  "docs/reference/project-model/schema-design/graph-matrix-schema-analysis.md",
  "docs/reference/project-model/schema-design/project-model-modularization-analysis.md",
  "docs/reference/project-model/schema-design/project-model-areas-taxonomy-contract.md",
  "docs/reference/project-model/schemas/governance-registry.schema.json",
  "docs/reference/project-model/schemas/requirements-registry.schema.json",
  "docs/reference/project-model/schemas/graph-matrix.schema.json",
  "docs/reference/contracts/README.md",
  "docs/reference/contracts/governance-control-report.contract.md",
  "docs/reference/contracts/governance-control-report.schema.json",
  "docs/reference/architecture/README.md",
  "docs/reference/domain-model/README.md",
  "docs/explanation/README.md",
  "docs/explanation/product/project-charter.md",
  "docs/explanation/governance/governance-control-page.md",
  "docs/explanation/architecture/README.md",
  "docs/explanation/decisions/DEC-0001-clean-restart.md",
  "project/README.md",
  "project/WORKPLAN.md",
  "tools/docs/README.md",
  "tools/docs/check-docs-structure.mjs",
  "tools/docs/check-project-model.mjs",
  "tools/docs/check-docs-format.mjs",
  "tools/docs/check-validator-negative-fixtures.mjs",
  "tools/docs/generate-governance-control-report.mjs",
  "tools/docs/generate-governance-control-page.mjs",
  ".githooks/pre-commit"
];

const forbiddenPaths = [
  "docs/PROJECT_CHARTER.md",
  "docs/DECISIONS.md",
  "docs/WORKPLAN.md",
  "docs/reference/requirements",
  "docs/reference/graph-model"
];

const allowedDocsEntries = new Set([
  "README.md",
  "tutorials",
  "how-to",
  "reference",
  "explanation"
]);

const allowedReferenceEntries = new Set([
  "README.md",
  "project-model",
  "contracts",
  "architecture",
  "domain-model"
]);

const allowedProjectModelEntries = new Set([
  "README.md",
  "governance.registry.yml",
  "requirements.registry.yml",
  "graph.matrix.yml",
  "schema-design",
  "schemas"
]);

const allowedProjectModelSchemasEntries = new Set([
  "governance-registry.schema.json",
  "requirements-registry.schema.json",
  "graph-matrix.schema.json"
]);

const allowedContractsEntries = new Set([
  "README.md",
  "governance-control-report.contract.md",
  "governance-control-report.schema.json"
]);

const allowedExplanationEntries = new Set([
  "README.md",
  "product",
  "governance",
  "architecture",
  "decisions"
]);

const allowedGovernanceExplanationEntries = new Set([
  "governance-control-page.md"
]);

const allowedProjectEntries = new Set([
  "README.md",
  "WORKPLAN.md"
]);

const errors = [];

/**
 * Converts a repository-relative path into an absolute path.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {string} Absolute path inside the current repository checkout.
 */
function toAbsolute(relativePath) {
  return path.join(root, relativePath);
}

/**
 * Checks whether a repository-relative path exists.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {boolean} True when the path exists.
 */
function exists(relativePath) {
  return fs.existsSync(toAbsolute(relativePath));
}

/**
 * Checks whether a repository-relative path is a directory.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {boolean} True when the path exists and is a directory.
 */
function isDirectory(relativePath) {
  try {
    return fs.statSync(toAbsolute(relativePath)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Checks whether a repository-relative path is a file.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {boolean} True when the path exists and is a file.
 */
function isFile(relativePath) {
  try {
    return fs.statSync(toAbsolute(relativePath)).isFile();
  } catch {
    return false;
  }
}

/**
 * Lists entry names under a repository-relative directory.
 *
 * @param {string} relativePath - Repository-relative directory path.
 * @returns {string[]} Directory entry names, or an empty array if the directory cannot be read.
 */
function listEntries(relativePath) {
  try {
    return fs.readdirSync(toAbsolute(relativePath), { withFileTypes: true }).map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Checks that all required directories exist.
 *
 * @returns {void}
 */
function checkRequiredDirectories() {
  for (const directory of requiredDirectories) {
    if (!isDirectory(directory)) {
      errors.push(`Missing required directory: ${directory}`);
    }
  }
}

/**
 * Checks that all required files exist.
 *
 * @returns {void}
 */
function checkRequiredFiles() {
  for (const file of requiredFiles) {
    if (!isFile(file)) {
      errors.push(`Missing required file: ${file}`);
    }
  }
}

/**
 * Checks that forbidden legacy or uncontrolled paths do not exist.
 *
 * @returns {void}
 */
function checkForbiddenPaths() {
  for (const forbiddenPath of forbiddenPaths) {
    if (exists(forbiddenPath)) {
      errors.push(`Forbidden legacy or uncontrolled path exists: ${forbiddenPath}`);
    }
  }
}

/**
 * Checks that a governed directory contains only allowed direct entries.
 *
 * @param {string} directory - Repository-relative directory to inspect.
 * @param {Set<string>} allowedEntries - Allowed direct entry names.
 * @param {string} label - Human-readable directory label for diagnostics.
 * @returns {void}
 */
function checkAllowedEntries(directory, allowedEntries, label) {
  if (!isDirectory(directory)) {
    return;
  }

  for (const entry of listEntries(directory)) {
    if (!allowedEntries.has(entry)) {
      errors.push(`Unexpected entry under ${label}: ${directory}/${entry}`);
    }
  }
}

/**
 * Checks the governed Diátaxis and project operational boundaries.
 *
 * @returns {void}
 */
function checkDiataxisBoundaries() {
  checkAllowedEntries("docs", allowedDocsEntries, "docs root");
  checkAllowedEntries("docs/reference", allowedReferenceEntries, "reference");
  checkAllowedEntries("docs/reference/project-model", allowedProjectModelEntries, "project model");
  checkAllowedEntries("docs/reference/project-model/schemas", allowedProjectModelSchemasEntries, "project model schemas");
  checkAllowedEntries("docs/reference/contracts", allowedContractsEntries, "contracts");
  checkAllowedEntries("docs/explanation", allowedExplanationEntries, "explanation");
  checkAllowedEntries("docs/explanation/governance", allowedGovernanceExplanationEntries, "governance explanation");
  checkAllowedEntries("project", allowedProjectEntries, "project operational area");
}

/**
 * Checks that required canonical files are not empty.
 *
 * @returns {void}
 */
function checkNoEmptyCanonicalFiles() {
  for (const file of requiredFiles) {
    if (!isFile(file)) {
      continue;
    }

    const content = fs.readFileSync(toAbsolute(file), "utf8");
    if (content.trim().length === 0) {
      errors.push(`Required file is empty: ${file}`);
    }
  }
}

checkRequiredDirectories();
checkRequiredFiles();
checkForbiddenPaths();
checkDiataxisBoundaries();
checkNoEmptyCanonicalFiles();

if (errors.length > 0) {
  console.error("Documentation structure check failed.");
  console.error("");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  console.error("Fix the documented structure or intentionally update the structure guard.");
  process.exit(1);
}

console.log("Documentation structure check passed.");
