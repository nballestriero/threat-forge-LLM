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
 * - documentation-structure:REQ-0004
 * - schema-validation:REQ-0001
 * - schema-validation:REQ-0002
 * - schema-validation:REQ-0005
 * - schema-validation:REQ-0006
 * - schema-validation:REQ-0008
 * - schema-validation:REQ-0009
 * - requirements-governance:REQ-0034
 * - requirements-governance:REQ-0035
 * - schema-validation:REQ-0041
 * - schema-validation:REQ-0042
 * - requirements-governance:REQ-0043
 *
 * Related decisions:
 * - source-traceability:DEC-0004
 * - source-traceability:DEC-0007
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
  "docs/reference/project-model/requirements",
  "docs/reference/project-model/graph",
  "docs/reference/project-model/decisions",
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
  "docs/reference/project-model/schema-design/requirements-index-and-part-schema-contract.md",
  "docs/reference/project-model/schema-design/graph-index-and-part-schema-contract.md",
  "docs/reference/project-model/schema-design/decisions-index-and-part-schema-contract.md",
  "docs/reference/project-model/schema-design/modular-project-model-loader-design.md",
  "docs/reference/project-model/schema-design/schema-validation-area-id-and-control-review.md",
  "docs/reference/project-model/schema-design/remaining-area-extraction-plan.md",
  "docs/reference/project-model/requirements/schema-validation.requirements.yml",
  "docs/reference/project-model/graph/schema-validation.graph.yml",
  "docs/reference/project-model/decisions/schema-validation.decisions.yml",
  "docs/reference/project-model/requirements/documentation-structure.requirements.yml",
  "docs/reference/project-model/requirements/markdown-format.requirements.yml",
  "docs/reference/project-model/requirements/requirements-governance.requirements.yml",
  "docs/reference/project-model/requirements/graph-traceability.requirements.yml",
  "docs/reference/project-model/requirements/source-traceability.requirements.yml",
  "docs/reference/project-model/requirements/governance-control.requirements.yml",
  "docs/reference/project-model/requirements/project-handoff.requirements.yml",
  "docs/reference/project-model/requirements/backend-architecture.requirements.yml",
  "docs/reference/project-model/graph/cross-area.graph.yml",
  "docs/reference/project-model/graph/documentation-structure.graph.yml",
  "docs/reference/project-model/graph/markdown-format.graph.yml",
  "docs/reference/project-model/graph/requirements-governance.graph.yml",
  "docs/reference/project-model/graph/graph-traceability.graph.yml",
  "docs/reference/project-model/graph/source-traceability.graph.yml",
  "docs/reference/project-model/graph/governance-control.graph.yml",
  "docs/reference/project-model/graph/project-handoff.graph.yml",
  "docs/reference/project-model/graph/backend-architecture.graph.yml",
  "docs/reference/project-model/decisions/global.decisions.yml",
  "docs/reference/project-model/decisions/markdown-format.decisions.yml",
  "docs/reference/project-model/decisions/requirements-governance.decisions.yml",
  "docs/reference/project-model/decisions/graph-traceability.decisions.yml",
  "docs/reference/project-model/decisions/source-traceability.decisions.yml",
  "docs/reference/project-model/decisions/governance-control.decisions.yml",
  "docs/reference/project-model/decisions/project-handoff.decisions.yml",
  "docs/reference/project-model/decisions/backend-architecture.decisions.yml",
  "docs/reference/project-model/schemas/governance-registry.schema.json",
  "docs/reference/project-model/schemas/requirements-registry.schema.json",
  "docs/reference/project-model/schemas/graph-matrix.schema.json",
  "docs/reference/project-model/schemas/requirements-part.schema.json",
  "docs/reference/project-model/schemas/graph-part.schema.json",
  "docs/reference/project-model/schemas/decisions-part.schema.json",
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
  ".githooks/pre-commit",
  ".githooks/pre-push"
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
  "schemas",
  "requirements",
  "graph",
  "decisions"
]);

const allowedProjectModelSchemasEntries = new Set([
  "governance-registry.schema.json",
  "requirements-registry.schema.json",
  "graph-matrix.schema.json",
  "requirements-part.schema.json",
  "graph-part.schema.json",
  "decisions-part.schema.json"
]);


const allowedProjectModelRequirementsEntries = new Set([
  "schema-validation.requirements.yml",
  "documentation-structure.requirements.yml",
  "markdown-format.requirements.yml",
  "requirements-governance.requirements.yml",
  "graph-traceability.requirements.yml",
  "source-traceability.requirements.yml",
  "governance-control.requirements.yml",
  "project-handoff.requirements.yml",
  "backend-architecture.requirements.yml"
]);

const allowedProjectModelGraphEntries = new Set([
  "cross-area.graph.yml",
  "schema-validation.graph.yml",
  "documentation-structure.graph.yml",
  "markdown-format.graph.yml",
  "requirements-governance.graph.yml",
  "graph-traceability.graph.yml",
  "source-traceability.graph.yml",
  "governance-control.graph.yml",
  "project-handoff.graph.yml",
  "backend-architecture.graph.yml"
]);

const allowedProjectModelDecisionsEntries = new Set([
  "global.decisions.yml",
  "schema-validation.decisions.yml",
  "markdown-format.decisions.yml",
  "requirements-governance.decisions.yml",
  "graph-traceability.decisions.yml",
  "source-traceability.decisions.yml",
  "governance-control.decisions.yml",
  "project-handoff.decisions.yml",
  "backend-architecture.decisions.yml"
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
  checkAllowedEntries("docs/reference/project-model/requirements", allowedProjectModelRequirementsEntries, "project model requirements parts");
  checkAllowedEntries("docs/reference/project-model/graph", allowedProjectModelGraphEntries, "project model graph parts");
  checkAllowedEntries("docs/reference/project-model/decisions", allowedProjectModelDecisionsEntries, "project model decision parts");
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
