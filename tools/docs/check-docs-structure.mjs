#!/usr/bin/env node
/**
 * @file Deterministic documentation structure guard.
 *
 * The guard checks that the clean threat-forge-LLM documentation corpus keeps
 * the expected Diátaxis folder layout and compact canonical project model.
 *
 * This tool intentionally has no third-party dependencies so it can run before
 * the project has a full implementation stack.
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
  "docs/reference/architecture",
  "docs/reference/domain-model",
  "docs/explanation",
  "docs/explanation/product",
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
  "docs/reference/architecture/README.md",
  "docs/reference/domain-model/README.md",
  "docs/explanation/README.md",
  "docs/explanation/product/project-charter.md",
  "docs/explanation/architecture/README.md",
  "docs/explanation/decisions/DEC-0001-clean-restart.md",
  "project/README.md",
  "project/WORKPLAN.md",
  "tools/docs/README.md",
  "tools/docs/check-docs-structure.mjs",
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
  "architecture",
  "domain-model"
]);

const allowedProjectModelEntries = new Set([
  "README.md",
  "governance.registry.yml",
  "requirements.registry.yml",
  "graph.matrix.yml"
]);

const allowedExplanationEntries = new Set([
  "README.md",
  "product",
  "architecture",
  "decisions"
]);

const allowedProjectEntries = new Set([
  "README.md",
  "WORKPLAN.md"
]);

const errors = [];

function toAbsolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(toAbsolute(relativePath));
}

function isDirectory(relativePath) {
  try {
    return fs.statSync(toAbsolute(relativePath)).isDirectory();
  } catch {
    return false;
  }
}

function isFile(relativePath) {
  try {
    return fs.statSync(toAbsolute(relativePath)).isFile();
  } catch {
    return false;
  }
}

function listEntries(relativePath) {
  try {
    return fs.readdirSync(toAbsolute(relativePath), { withFileTypes: true }).map((entry) => entry.name);
  } catch {
    return [];
  }
}

function checkRequiredDirectories() {
  for (const directory of requiredDirectories) {
    if (!isDirectory(directory)) {
      errors.push(`Missing required directory: ${directory}`);
    }
  }
}

function checkRequiredFiles() {
  for (const file of requiredFiles) {
    if (!isFile(file)) {
      errors.push(`Missing required file: ${file}`);
    }
  }
}

function checkForbiddenPaths() {
  for (const forbiddenPath of forbiddenPaths) {
    if (exists(forbiddenPath)) {
      errors.push(`Forbidden legacy or uncontrolled path exists: ${forbiddenPath}`);
    }
  }
}

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

function checkDiataxisBoundaries() {
  checkAllowedEntries("docs", allowedDocsEntries, "docs root");
  checkAllowedEntries("docs/reference", allowedReferenceEntries, "reference");
  checkAllowedEntries("docs/reference/project-model", allowedProjectModelEntries, "project model");
  checkAllowedEntries("docs/explanation", allowedExplanationEntries, "explanation");
  checkAllowedEntries("project", allowedProjectEntries, "project operational area");
}

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
