#!/usr/bin/env node
/**
 * @file Governed YAML and Markdown file format validator.
 *
 * Validates baseline file formats for governed project-model YAML files and
 * governed Markdown documentation files. YAML files are checked for parseability
 * and required top-level sections. Markdown files are checked against body
 * profiles registered in the governance registry.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - REQ-0007
 *
 * Supports capabilities:
 * - CAP-DOCUMENTATION-GOVERNANCE
 *
 * Provides graph nodes:
 * - TOOL-DOCS-FORMAT-CHECK
 *
 * Related commands:
 * - CMD-DOCS-CHECK-FORMAT
 *
 * Failure behavior:
 * - Prints all detected file-format violations.
 * - Exits with status code 1 when validation fails.
 * - Exits with status code 0 when validation passes.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parse as parseYaml } from "yaml";

const root = process.cwd();

const MODEL_FILES = {
  governance: "docs/reference/project-model/governance.registry.yml",
  requirements: "docs/reference/project-model/requirements.registry.yml",
  matrix: "docs/reference/project-model/graph.matrix.yml"
};

const markdownDocuments = [
  { path: "docs/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/tutorials/README.md", bodyProfileId: "BODY-TUTORIAL" },
  { path: "docs/how-to/README.md", bodyProfileId: "BODY-HOW-TO" },
  { path: "docs/reference/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/architecture/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/domain-model/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/explanation/README.md", bodyProfileId: "BODY-EXPLANATION" },
  { path: "docs/explanation/product/project-charter.md", bodyProfileId: "BODY-EXPLANATION" },
  { path: "docs/explanation/architecture/README.md", bodyProfileId: "BODY-EXPLANATION" },
  { path: "docs/explanation/decisions/DEC-0001-clean-restart.md", bodyProfileId: "BODY-DECISION" }
];

const errors = [];

/**
 * Converts a repository-relative path into an absolute path.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {string} Absolute path inside the current repository checkout.
 */
function absolutePath(relativePath) {
  return path.join(root, relativePath);
}

/**
 * Reads a UTF-8 text file from the repository.
 *
 * @param {string} relativePath - Repository-relative file path.
 * @returns {string | null} File content, or null when the file cannot be read.
 */
function readText(relativePath) {
  try {
    return fs.readFileSync(absolutePath(relativePath), "utf8");
  } catch (error) {
    errors.push(`Cannot read file ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Parses YAML from a governed file.
 *
 * @param {string} relativePath - Repository-relative YAML file path.
 * @returns {unknown | null} Parsed YAML document, or null when parsing fails.
 */
function readYaml(relativePath) {
  const content = readText(relativePath);
  if (content === null) {
    return null;
  }

  try {
    return parseYaml(content);
  } catch (error) {
    errors.push(`Cannot parse YAML file ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Checks that a parsed YAML document is a non-array object.
 *
 * @param {unknown} document - Parsed YAML document.
 * @param {string} relativePath - Repository-relative YAML file path.
 * @returns {document is Record<string, unknown>} True when the document is an object.
 */
function isYamlObject(document, relativePath) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    errors.push(`YAML file ${relativePath} must contain a top-level object.`);
    return false;
  }
  return true;
}

/**
 * Checks common YAML project-model baseline format.
 *
 * @param {string} relativePath - Repository-relative YAML file path.
 * @param {string[]} requiredTopLevelKeys - Required top-level keys.
 * @returns {unknown | null} Parsed YAML document, or null when it is not an object.
 */
function checkYamlBaseline(relativePath, requiredTopLevelKeys) {
  const document = readYaml(relativePath);
  if (!isYamlObject(document, relativePath)) {
    return null;
  }

  if (document.schema_version !== "1.0") {
    errors.push(`YAML file ${relativePath} must set schema_version to "1.0".`);
  }

  for (const key of requiredTopLevelKeys) {
    if (!Object.prototype.hasOwnProperty.call(document, key)) {
      errors.push(`YAML file ${relativePath} is missing required top-level key: ${key}`);
    }
  }

  return document;
}

/**
 * Builds a body profile index from the governance registry.
 *
 * @param {Record<string, unknown>} governance - Parsed governance registry.
 * @returns {Map<string, { required_headings: string[], forbidden_headings: string[] }>} Body profile index.
 */
function buildBodyProfileIndex(governance) {
  const profiles = Array.isArray(governance.body_profiles) ? governance.body_profiles : [];
  const index = new Map();

  for (const profile of profiles) {
    if (!profile?.id) {
      errors.push("Body profile entry is missing id.");
      continue;
    }

    index.set(profile.id, {
      required_headings: Array.isArray(profile.required_headings) ? profile.required_headings : [],
      forbidden_headings: Array.isArray(profile.forbidden_headings) ? profile.forbidden_headings : []
    });
  }

  return index;
}

/**
 * Extracts Markdown headings from a Markdown document.
 *
 * @param {string} content - Markdown content.
 * @returns {{ level: number, text: string }[]} Extracted headings.
 */
function extractMarkdownHeadings(content) {
  return content
    .split(/\r?\n/)
    .map((line) => /^(#{1,6})\s+(.+?)\s*$/.exec(line))
    .filter(Boolean)
    .map((match) => ({
      level: match[1].length,
      text: match[2].replace(/\s+#+$/, "").trim()
    }));
}

/**
 * Checks a Markdown document against a registered body profile.
 *
 * @param {string} relativePath - Repository-relative Markdown file path.
 * @param {string} bodyProfileId - Body profile id.
 * @param {Map<string, { required_headings: string[], forbidden_headings: string[] }>} bodyProfiles - Body profile index.
 * @returns {void}
 */
function checkMarkdownBodyProfile(relativePath, bodyProfileId, bodyProfiles) {
  const profile = bodyProfiles.get(bodyProfileId);
  if (!profile) {
    errors.push(`Markdown file ${relativePath} references unknown body profile ${bodyProfileId}.`);
    return;
  }

  const content = readText(relativePath);
  if (content === null) {
    return;
  }

  const headings = extractMarkdownHeadings(content);
  const headingTexts = new Set(headings.map((heading) => heading.text));

  if (!headings.some((heading) => heading.level === 1)) {
    errors.push(`Markdown file ${relativePath} must contain a level-1 title.`);
  }

  for (const requiredHeading of profile.required_headings) {
    if (!headingTexts.has(requiredHeading)) {
      errors.push(`Markdown file ${relativePath} is missing required heading '${requiredHeading}' for ${bodyProfileId}.`);
    }
  }

  for (const forbiddenHeading of profile.forbidden_headings) {
    if (headingTexts.has(forbiddenHeading)) {
      errors.push(`Markdown file ${relativePath} contains forbidden heading '${forbiddenHeading}' for ${bodyProfileId}.`);
    }
  }
}

const governance = checkYamlBaseline(MODEL_FILES.governance, [
  "registry",
  "taxonomies",
  "capabilities",
  "decisions",
  "document_types",
  "body_profiles",
  "node_types",
  "predicates"
]);

checkYamlBaseline(MODEL_FILES.requirements, [
  "registry",
  "macro_requirements",
  "requirements"
]);

checkYamlBaseline(MODEL_FILES.matrix, [
  "matrix",
  "nodes",
  "triples"
]);

if (governance) {
  const bodyProfiles = buildBodyProfileIndex(governance);
  for (const document of markdownDocuments) {
    checkMarkdownBodyProfile(document.path, document.bodyProfileId, bodyProfiles);
  }
}

if (errors.length > 0) {
  console.error("Documentation format check failed.");
  console.error("");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  console.error("Fix the governed YAML or Markdown file format.");
  process.exit(1);
}

console.log("Documentation format check passed.");
