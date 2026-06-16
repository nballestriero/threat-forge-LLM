#!/usr/bin/env node
/**
 * @file Governed YAML and Markdown file format validator.
 *
 * Validates baseline file formats for governed project-model YAML files and
 * governed Markdown documentation files. This tool is the single canonical
 * deterministic execution entrypoint for governed artifact JSON Schema
 * validation. YAML files are checked for parseability, schema-controlled local
 * shape, and required top-level sections. Markdown files are checked against
 * body profiles registered in the governance registry.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - REQ-0007
 * - REQ-0016
 * - REQ-0023
 * - REQ-0024
 * - REQ-0025
 * - REQ-0027
 * - REQ-0028
 * - REQ-0029
 * - REQ-0030
 * - REQ-0031
 * - REQ-0032
 * - REQ-0033
 * - REQ-0034
 * - REQ-0035
 * - REQ-0041
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

const CONTRACT_FILES = {
  governanceControlReportSchema: "docs/reference/contracts/governance-control-report.schema.json"
};

const PROJECT_MODEL_SCHEMA_FILES = {
  governanceRegistrySchema: "docs/reference/project-model/schemas/governance-registry.schema.json",
  requirementsRegistrySchema: "docs/reference/project-model/schemas/requirements-registry.schema.json",
  graphMatrixSchema: "docs/reference/project-model/schemas/graph-matrix.schema.json",
  requirementsPartSchema: "docs/reference/project-model/schemas/requirements-part.schema.json",
  graphPartSchema: "docs/reference/project-model/schemas/graph-part.schema.json",
  decisionsPartSchema: "docs/reference/project-model/schemas/decisions-part.schema.json"
};

const markdownDocuments = [
  { path: "docs/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/tutorials/README.md", bodyProfileId: "BODY-TUTORIAL" },
  { path: "docs/how-to/README.md", bodyProfileId: "BODY-HOW-TO" },
  { path: "docs/reference/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/governance-registry-schema-analysis.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/requirements-registry-schema-analysis.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/graph-matrix-schema-analysis.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/project-model-modularization-analysis.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/project-model-areas-taxonomy-contract.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/requirements-index-and-part-schema-contract.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/graph-index-and-part-schema-contract.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/decisions-index-and-part-schema-contract.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/project-model/schema-design/modular-project-model-loader-design.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/contracts/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/contracts/governance-control-report.contract.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/architecture/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/architecture/backend-composition-pattern.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/reference/domain-model/README.md", bodyProfileId: "BODY-REFERENCE" },
  { path: "docs/explanation/README.md", bodyProfileId: "BODY-EXPLANATION" },
  { path: "docs/explanation/product/project-charter.md", bodyProfileId: "BODY-EXPLANATION" },
  { path: "docs/explanation/governance/governance-control-page.md", bodyProfileId: "BODY-EXPLANATION" },
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
 * Parses JSON from a governed contract file.
 *
 * @param {string} relativePath - Repository-relative JSON file path.
 * @returns {unknown | null} Parsed JSON document, or null when parsing fails.
 */
function readJson(relativePath) {
  const content = readText(relativePath);
  if (content === null) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`Cannot parse JSON file ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Checks that a parsed JSON document is a non-array object.
 *
 * @param {unknown} document - Parsed JSON document.
 * @param {string} relativePath - Repository-relative JSON file path.
 * @returns {document is Record<string, unknown>} True when the document is an object.
 */
function isJsonObject(document, relativePath) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    errors.push(`JSON file ${relativePath} must contain a top-level object.`);
    return false;
  }
  return true;
}

/**
 * Checks the baseline shape of the Governance Control Report JSON Schema.
 *
 * @param {string} relativePath - Repository-relative JSON Schema file path.
 * @returns {void}
 */
function checkGovernanceControlReportSchema(relativePath) {
  const schema = readJson(relativePath);
  if (!isJsonObject(schema, relativePath)) {
    return;
  }

  const requiredTopLevelKeys = ["$schema", "$id", "title", "type", "required", "properties"];

  for (const key of requiredTopLevelKeys) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      errors.push(`JSON Schema file ${relativePath} is missing required top-level key: ${key}`);
    }
  }

  if (schema.type !== "object") {
    errors.push(`JSON Schema file ${relativePath} must declare top-level type "object".`);
  }

  if (!Array.isArray(schema.required)) {
    errors.push(`JSON Schema file ${relativePath} must declare a top-level required array.`);
    return;
  }

  const requiredReportKeys = [
    "schema_version",
    "generated_at",
    "repository",
    "checks",
    "documents",
    "requirements",
    "decisions",
    "capabilities",
    "commands",
    "tools",
    "gates",
    "graphs",
    "diagnostics"
  ];

  for (const key of requiredReportKeys) {
    if (!schema.required.includes(key)) {
      errors.push(`JSON Schema file ${relativePath} required array is missing report key: ${key}`);
    }

    if (!schema.properties || !Object.prototype.hasOwnProperty.call(schema.properties, key)) {
      errors.push(`JSON Schema file ${relativePath} properties object is missing report key: ${key}`);
    }
  }

  const graphProperties = schema.properties?.graphs?.properties ?? {};
  for (const graphKey of ["knowledge", "documentation", "file_relationships"]) {
    if (!Object.prototype.hasOwnProperty.call(graphProperties, graphKey)) {
      errors.push(`JSON Schema file ${relativePath} graphs.properties is missing graph key: ${graphKey}`);
    }
  }
}


/**
 * Checks the baseline shape of a project-model registry JSON Schema.
 *
 * This validates schema artifacts before later work migrates additional
 * registry validation from hardcoded shape checks to schema-driven validation.
 *
 * @param {string} relativePath - Repository-relative JSON Schema file path.
 * @param {string} label - Human-readable registry label for diagnostics.
 * @param {string[]} requiredRegistryKeys - Required top-level registry keys.
 * @returns {void}
 */
function checkProjectModelRegistrySchema(relativePath, label, requiredRegistryKeys) {
  const schema = readJson(relativePath);
  if (!isJsonObject(schema, relativePath)) {
    return;
  }

  const requiredTopLevelKeys = ["$schema", "$id", "title", "type", "required", "properties", "$defs", "x-change_control", "x-applies_to"];

  for (const key of requiredTopLevelKeys) {
    if (!Object.prototype.hasOwnProperty.call(schema, key)) {
      errors.push(`JSON Schema file ${relativePath} is missing required top-level key: ${key}`);
    }
  }

  if (schema.type !== "object") {
    errors.push(`JSON Schema file ${relativePath} must declare top-level type "object".`);
  }

  if (!Array.isArray(schema.required)) {
    errors.push(`JSON Schema file ${relativePath} must declare a top-level required array.`);
  } else {
    for (const key of requiredRegistryKeys) {
      if (!schema.required.includes(key)) {
        errors.push(`JSON Schema file ${relativePath} required array is missing ${label} key: ${key}`);
      }
    }
  }

  for (const key of requiredRegistryKeys) {
    if (!schema.properties || !Object.prototype.hasOwnProperty.call(schema.properties, key)) {
      errors.push(`JSON Schema file ${relativePath} properties object is missing ${label} key: ${key}`);
    }
  }

  const changeControl = schema["x-change_control"];
  if (!changeControl || typeof changeControl !== "object" || Array.isArray(changeControl)) {
    errors.push(`JSON Schema file ${relativePath} must declare x-change_control metadata.`);
  } else {
    for (const key of ["decided_by", "satisfies", "rationale"]) {
      if (!Object.prototype.hasOwnProperty.call(changeControl, key)) {
        errors.push(`JSON Schema file ${relativePath} x-change_control is missing key: ${key}`);
      }
    }
  }

  const appliesTo = schema["x-applies_to"];
  if (!Array.isArray(appliesTo) || appliesTo.length === 0 || !appliesTo.every((entry) => typeof entry === "string" && entry.length > 0)) {
    errors.push(`JSON Schema file ${relativePath} must declare a non-empty x-applies_to string array.`);
  }
}

/**
 * Checks whether a parsed value is a non-null object and not an array.
 *
 * @param {unknown} value - Parsed value.
 * @returns {value is Record<string, unknown>} True when the value is an object.
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Converts a schema path segment into a human-readable validation path.
 *
 * @param {string} basePath - Existing validation path.
 * @param {string} segment - Object key or array index segment.
 * @returns {string} Updated path.
 */
function childSchemaPath(basePath, segment) {
  if (/^[0-9]+$/.test(segment)) {
    return `${basePath}[${segment}]`;
  }

  return basePath ? `${basePath}.${segment}` : `.${segment}`;
}

/**
 * Resolves a local JSON Schema reference against the root schema.
 *
 * @param {Record<string, unknown>} rootSchema - Root JSON Schema object.
 * @param {string} ref - Local reference, for example #/$defs/name.
 * @returns {unknown | undefined} Resolved schema fragment.
 */
function resolveLocalSchemaRef(rootSchema, ref) {
  if (!ref.startsWith("#/")) {
    errors.push(`Unsupported JSON Schema reference ${ref}; only local references are supported.`);
    return undefined;
  }

  const pathSegments = ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));

  let current = rootSchema;
  for (const segment of pathSegments) {
    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      errors.push(`Cannot resolve JSON Schema reference ${ref}.`);
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

/**
 * Validates a parsed document value against the supported JSON Schema subset.
 *
 * This intentionally supports the subset used by the governed registry schemas
 * before introducing a full JSON Schema runtime dependency. The validator loads
 * the canonical schema artifact and enforces its structural rules for
 * governed project-model registries.
 *
 * @param {unknown} value - Parsed document value.
 * @param {unknown} schema - JSON Schema fragment.
 * @param {Record<string, unknown>} rootSchema - Root JSON Schema object.
 * @param {string} documentPath - Repository-relative validated document path.
 * @param {string} schemaPath - Repository-relative schema path.
 * @param {string} valuePath - Human-readable path inside the validated document.
 * @param {Set<string>} seenRefs - Active reference stack used to detect cycles.
 * @returns {void}
 */
function validateValueAgainstSchema(value, schema, rootSchema, documentPath, schemaPath, valuePath = "", seenRefs = new Set()) {
  if (schema === true || schema === undefined) {
    return;
  }

  if (schema === false) {
    errors.push(`YAML file ${documentPath}${valuePath} is not allowed by ${schemaPath}.`);
    return;
  }

  if (!isPlainObject(schema)) {
    errors.push(`JSON Schema ${schemaPath}${valuePath} must be an object or boolean schema.`);
    return;
  }

  if (typeof schema.$ref === "string") {
    if (seenRefs.has(schema.$ref)) {
      errors.push(`Circular JSON Schema reference ${schema.$ref} while validating ${documentPath}${valuePath}.`);
      return;
    }

    const resolved = resolveLocalSchemaRef(rootSchema, schema.$ref);
    if (resolved !== undefined) {
      seenRefs.add(schema.$ref);
      validateValueAgainstSchema(value, resolved, rootSchema, documentPath, schemaPath, valuePath, seenRefs);
      seenRefs.delete(schema.$ref);
    }
  }

  const label = `${documentPath}${valuePath}`;

  if (typeof schema.const !== "undefined" && value !== schema.const) {
    errors.push(`YAML file ${label} must equal ${JSON.stringify(schema.const)} according to ${schemaPath}.`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`YAML file ${label} must be one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(", ")} according to ${schemaPath}.`);
  }

  if (typeof schema.type === "string") {
    const validType =
      (schema.type === "object" && isPlainObject(value)) ||
      (schema.type === "array" && Array.isArray(value)) ||
      (schema.type === "string" && typeof value === "string") ||
      (schema.type === "number" && typeof value === "number") ||
      (schema.type === "integer" && Number.isInteger(value)) ||
      (schema.type === "boolean" && typeof value === "boolean") ||
      (schema.type === "null" && value === null);

    if (!validType) {
      errors.push(`YAML file ${label} must be ${schema.type} according to ${schemaPath}.`);
      return;
    }
  }

  if (typeof value === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push(`YAML file ${label} must have length >= ${schema.minLength} according to ${schemaPath}.`);
    }

    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) {
      errors.push(`YAML file ${label} must match pattern ${schema.pattern} according to ${schemaPath}.`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      errors.push(`YAML file ${label} must contain at least ${schema.minItems} item(s) according to ${schemaPath}.`);
    }

    if (schema.uniqueItems === true) {
      const seen = new Set();
      for (const item of value) {
        const fingerprint = JSON.stringify(item);
        if (seen.has(fingerprint)) {
          errors.push(`YAML file ${label} must contain unique items according to ${schemaPath}.`);
          break;
        }
        seen.add(fingerprint);
      }
    }

    if (typeof schema.items !== "undefined") {
      value.forEach((item, index) => {
        validateValueAgainstSchema(item, schema.items, rootSchema, documentPath, schemaPath, childSchemaPath(valuePath, String(index)), new Set(seenRefs));
      });
    }
  }

  if (isPlainObject(value)) {
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];

    if (typeof schema.minProperties === "number" && Object.keys(value).length < schema.minProperties) {
      errors.push(`YAML file ${label} must contain at least ${schema.minProperties} propertie(s) according to ${schemaPath}.`);
    }

    for (const requiredKey of required) {
      if (!Object.prototype.hasOwnProperty.call(value, requiredKey)) {
        errors.push(`YAML file ${label || documentPath} is missing required property ${requiredKey} according to ${schemaPath}.`);
      }
    }

    if (isPlainObject(schema.propertyNames)) {
      for (const key of Object.keys(value)) {
        validateValueAgainstSchema(key, schema.propertyNames, rootSchema, documentPath, schemaPath, `${valuePath} property name ${JSON.stringify(key)}`, new Set(seenRefs));
      }
    }

    for (const [key, propertyValue] of Object.entries(value)) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        validateValueAgainstSchema(propertyValue, properties[key], rootSchema, documentPath, schemaPath, childSchemaPath(valuePath, key), new Set(seenRefs));
        continue;
      }

      if (schema.additionalProperties === false) {
        errors.push(`YAML file ${label || documentPath} does not allow additional property ${key} according to ${schemaPath}.`);
        continue;
      }

      if (isPlainObject(schema.additionalProperties)) {
        validateValueAgainstSchema(propertyValue, schema.additionalProperties, rootSchema, documentPath, schemaPath, childSchemaPath(valuePath, key), new Set(seenRefs));
      }
    }
  }
}

/**
 * Validates a governed project-model YAML registry against its canonical schema.
 *
 * @param {Record<string, unknown> | null} registryDocument - Parsed registry document.
 * @param {string} registryPath - Repository-relative registry YAML path.
 * @param {string} schemaPath - Repository-relative JSON Schema path.
 * @returns {void}
 */
function checkProjectModelRegistryAgainstCanonicalSchema(registryDocument, registryPath, schemaPath) {
  if (!registryDocument) {
    return;
  }

  const schema = readJson(schemaPath);
  if (!isJsonObject(schema, schemaPath)) {
    return;
  }

  validateValueAgainstSchema(registryDocument, schema, schema, registryPath, schemaPath);
}

/**
 * Loads modular project-model part files declared by an index document.
 *
 * Format validation remains local: this function reads declared part files so
 * they can be validated by the canonical JSON Schema entrypoint without
 * performing semantic area or cross-file checks.
 *
 * @param {Record<string, unknown> | null} indexDocument - Parsed index document.
 * @param {string} indexPath - Repository-relative index path for diagnostics.
 * @param {string} propertyName - Part declaration property name.
 * @returns {{ path: string, document: Record<string, unknown> | null }[]} Loaded part documents.
 */
function loadDeclaredPartDocuments(indexDocument, indexPath, propertyName) {
  if (!indexDocument || !Array.isArray(indexDocument[propertyName])) {
    return [];
  }

  return indexDocument[propertyName].map((part, index) => {
    const partPath = part?.path;
    if (typeof partPath !== "string" || partPath.trim().length === 0) {
      errors.push(`YAML file ${indexPath}.${propertyName}[${index}] must declare a non-empty path.`);
      return { path: `<missing:${indexPath}.${propertyName}[${index}]>`, document: null };
    }

    return { path: partPath, document: readYaml(partPath) };
  });
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

const requirements = checkYamlBaseline(MODEL_FILES.requirements, [
  "registry",
  "macro_requirements",
  "requirements"
]);

const matrix = checkYamlBaseline(MODEL_FILES.matrix, [
  "matrix",
  "nodes",
  "triples"
]);

checkGovernanceControlReportSchema(CONTRACT_FILES.governanceControlReportSchema);
checkProjectModelRegistrySchema(PROJECT_MODEL_SCHEMA_FILES.governanceRegistrySchema, "governance registry", [
  "schema_version",
  "change_control",
  "schema_control",
  "registry",
  "taxonomies",
  "capabilities",
  "decisions",
  "document_types",
  "body_profiles",
  "node_types",
  "predicates"
]);
checkProjectModelRegistrySchema(PROJECT_MODEL_SCHEMA_FILES.requirementsRegistrySchema, "requirements registry", [
  "schema_version",
  "change_control",
  "schema_control",
  "registry",
  "macro_requirements",
  "requirements"
]);
checkProjectModelRegistrySchema(PROJECT_MODEL_SCHEMA_FILES.graphMatrixSchema, "graph matrix", [
  "schema_version",
  "change_control",
  "schema_control",
  "matrix",
  "nodes",
  "triples"
]);
checkProjectModelRegistrySchema(PROJECT_MODEL_SCHEMA_FILES.requirementsPartSchema, "requirements part", [
  "schema_version",
  "change_control",
  "schema_control",
  "part",
  "requirements"
]);
checkProjectModelRegistrySchema(PROJECT_MODEL_SCHEMA_FILES.graphPartSchema, "graph part", [
  "schema_version",
  "change_control",
  "schema_control",
  "part",
  "nodes",
  "triples"
]);
checkProjectModelRegistrySchema(PROJECT_MODEL_SCHEMA_FILES.decisionsPartSchema, "decisions part", [
  "schema_version",
  "change_control",
  "schema_control",
  "part",
  "decisions"
]);
checkProjectModelRegistryAgainstCanonicalSchema(governance, MODEL_FILES.governance, PROJECT_MODEL_SCHEMA_FILES.governanceRegistrySchema);
checkProjectModelRegistryAgainstCanonicalSchema(requirements, MODEL_FILES.requirements, PROJECT_MODEL_SCHEMA_FILES.requirementsRegistrySchema);
checkProjectModelRegistryAgainstCanonicalSchema(matrix, MODEL_FILES.matrix, PROJECT_MODEL_SCHEMA_FILES.graphMatrixSchema);

for (const part of loadDeclaredPartDocuments(requirements, MODEL_FILES.requirements, "parts")) {
  checkProjectModelRegistryAgainstCanonicalSchema(part.document, part.path, PROJECT_MODEL_SCHEMA_FILES.requirementsPartSchema);
}

for (const part of loadDeclaredPartDocuments(matrix, MODEL_FILES.matrix, "parts")) {
  checkProjectModelRegistryAgainstCanonicalSchema(part.document, part.path, PROJECT_MODEL_SCHEMA_FILES.graphPartSchema);
}

for (const part of loadDeclaredPartDocuments(governance, MODEL_FILES.governance, "decision_parts")) {
  checkProjectModelRegistryAgainstCanonicalSchema(part.document, part.path, PROJECT_MODEL_SCHEMA_FILES.decisionsPartSchema);
}

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
