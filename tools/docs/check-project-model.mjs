#!/usr/bin/env node
/**
 * @file Project model consistency and bidirectional traceability validator.
 *
 * Validates the compact governed project model, including controlled
 * taxonomies, requirement implementation lifecycle, governed ID uniqueness, ID format patterns, requirement
 * references, SPO predicate compatibility, command/gate/tool relationships,
 * mandatory registration of governed source files, governed baseline artifact
 * change-control markers, and file-level bidirectional traceability between
 * graph.matrix.yml and source-file JSDoc comments.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - REQ-0005
 * - REQ-0006
 * - REQ-0022
 * - schema-validation:REQ-0002
 * - schema-validation:REQ-0004
 * - schema-validation:REQ-0006
 * - schema-validation:REQ-0009
 * - REQ-0036
 * - REQ-0041
 * - REQ-0042
 * - REQ-0043
 *
 * Supports capabilities:
 * - CAP-REQUIREMENTS-MANAGEMENT
 *
 * Provides graph nodes:
 * - TOOL-PROJECT-MODEL-CHECK
 *
 * Related commands:
 * - CMD-PROJECT-MODEL-CHECK
 *
 * Failure behavior:
 * - Prints all detected project-model and traceability violations.
 * - Exits with status code 1 when validation fails.
 * - Exits with status code 0 when validation passes.
 *
 * Validation level:
 * - Initial validation is file-level traceability.
 * - Code-symbol-level traceability is intentionally deferred.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parse as parseYaml } from "yaml";

const root = process.cwd();

const MODEL_FILES = {
  governance: "docs/reference/project-model/governance.registry.yml",
  requirements: "docs/reference/project-model/requirements.registry.yml",
  matrix: "docs/reference/project-model/graph.matrix.yml",
  governanceRegistrySchema: "docs/reference/project-model/schemas/governance-registry.schema.json",
  requirementsRegistrySchema: "docs/reference/project-model/schemas/requirements-registry.schema.json",
  graphMatrixSchema: "docs/reference/project-model/schemas/graph-matrix.schema.json",
  requirementsPartSchema: "docs/reference/project-model/schemas/requirements-part.schema.json",
  graphPartSchema: "docs/reference/project-model/schemas/graph-part.schema.json",
  decisionsPartSchema: "docs/reference/project-model/schemas/decisions-part.schema.json",
  packageJson: "package.json"
};

const GOVERNED_BASELINE_ARTIFACTS = [
  MODEL_FILES.governance,
  MODEL_FILES.requirements,
  MODEL_FILES.matrix,
  MODEL_FILES.governanceRegistrySchema,
  MODEL_FILES.requirementsRegistrySchema,
  MODEL_FILES.graphMatrixSchema,
  MODEL_FILES.requirementsPartSchema,
  MODEL_FILES.graphPartSchema,
  MODEL_FILES.decisionsPartSchema
];

const BASELINE_TRACEABILITY_REQUIREMENTS = new Set(["REQ-0022", "schema-validation:REQ-0002", "schema-validation:REQ-0006", "schema-validation:REQ-0009"]);

const PROJECT_MODEL_AREAS_TAXONOMY = "project_model_areas";
const PROJECT_MODEL_AREA_ID_PATTERN = /^(global|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/;
const LOCAL_REQUIREMENT_ID_PATTERN = /^REQ-\d{4}$/;
const LOCAL_MACRO_REQUIREMENT_ID_PATTERN = /^MR-\d{4}$/;
const LOCAL_DECISION_ID_PATTERN = /^DEC-\d{4}$/;
const CANONICAL_REQUIREMENT_REFERENCE_PATTERN = /(?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*:)?REQ-\d{4}/g;

const MIGRATED_SCHEMA_VALIDATION_REQUIREMENT_IDS = new Map([
  ["REQ-0023", "schema-validation:REQ-0001"],
  ["REQ-0024", "schema-validation:REQ-0002"],
  ["REQ-0025", "schema-validation:REQ-0003"],
  ["REQ-0026", "schema-validation:REQ-0004"],
  ["REQ-0027", "schema-validation:REQ-0005"],
  ["REQ-0028", "schema-validation:REQ-0006"],
  ["REQ-0029", "schema-validation:REQ-0007"],
  ["REQ-0030", "schema-validation:REQ-0008"],
  ["REQ-0031", "schema-validation:REQ-0009"],
  ["REQ-0032", "schema-validation:REQ-0010"],
  ["REQ-0033", "schema-validation:REQ-0011"]
]);

const MIGRATED_SCHEMA_VALIDATION_DECISION_IDS = new Map([
  ["DEC-0014", "schema-validation:DEC-0001"],
  ["DEC-0015", "schema-validation:DEC-0002"],
  ["DEC-0016", "schema-validation:DEC-0003"],
  ["DEC-0017", "schema-validation:DEC-0004"],
  ["DEC-0018", "schema-validation:DEC-0005"],
  ["DEC-0019", "schema-validation:DEC-0006"],
  ["DEC-0020", "schema-validation:DEC-0007"],
  ["DEC-0021", "schema-validation:DEC-0008"],
  ["DEC-0022", "schema-validation:DEC-0009"],
  ["DEC-0023", "schema-validation:DEC-0010"],
  ["DEC-0024", "schema-validation:DEC-0011"]
]);


const GOVERNED_SOURCE_ROOTS = ["tools", "src", "backend", "frontend"];
const GOVERNED_SOURCE_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const SOURCE_DISCOVERY_EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".vs",
  "artifacts",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out"
]);

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
 * Checks whether a repository-relative path exists.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {boolean} True when the path exists.
 */
function pathExists(relativePath) {
  return fs.existsSync(absolutePath(relativePath));
}

/**
 * Checks whether a repository-relative path is a file.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {boolean} True when the path exists and is a file.
 */
function isFile(relativePath) {
  try {
    return fs.statSync(absolutePath(relativePath)).isFile();
  } catch {
    return false;
  }
}

/**
 * Checks whether a repository-relative path is a directory.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {boolean} True when the path exists and is a directory.
 */
function isDirectory(relativePath) {
  try {
    return fs.statSync(absolutePath(relativePath)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Checks whether a repository-relative path is a file or directory.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {boolean} True when the path exists as a file or directory.
 */
function isFileOrDirectory(relativePath) {
  return isFile(relativePath) || isDirectory(relativePath);
}

/**
 * Converts a path to a POSIX-style repository-relative path.
 *
 * @param {string} value - Path value using the host platform separator.
 * @returns {string} POSIX-style path.
 */
function toRepositoryPath(value) {
  return value.split(path.sep).join("/");
}

/**
 * Checks whether a file extension is treated as governed source code.
 *
 * @param {string} filePath - Repository-relative or absolute file path.
 * @returns {boolean} True when the extension is governed as source code.
 */
function isGovernedSourceExtension(filePath) {
  return GOVERNED_SOURCE_EXTENSIONS.has(path.extname(filePath));
}

/**
 * Discovers source files that must be represented in the governed graph.
 *
 * @returns {string[]} Repository-relative governed source file paths.
 */
function discoverGovernedSourceFiles() {
  const discovered = [];

  for (const sourceRoot of GOVERNED_SOURCE_ROOTS) {
    if (!isDirectory(sourceRoot)) {
      continue;
    }

    const stack = [absolutePath(sourceRoot)];

    while (stack.length > 0) {
      const currentDirectory = stack.pop();
      const entries = fs.readdirSync(currentDirectory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name));

      for (const entry of entries) {
        if (SOURCE_DISCOVERY_EXCLUDED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        const absoluteEntryPath = path.join(currentDirectory, entry.name);
        const relativeEntryPath = toRepositoryPath(path.relative(root, absoluteEntryPath));

        if (entry.isDirectory()) {
          stack.push(absoluteEntryPath);
          continue;
        }

        if (entry.isFile() && isGovernedSourceExtension(relativeEntryPath)) {
          discovered.push(relativeEntryPath);
        }
      }
    }
  }

  return discovered.sort((left, right) => left.localeCompare(right));
}

/**
 * Reads a UTF-8 text file from the repository.
 *
 * @param {string} relativePath - Repository-relative file path.
 * @returns {string} File content.
 */
function readText(relativePath) {
  return fs.readFileSync(absolutePath(relativePath), "utf8");
}

/**
 * Reads and parses a YAML file.
 *
 * @param {string} relativePath - Repository-relative YAML file path.
 * @returns {unknown | null} Parsed YAML document, or null when parsing fails.
 */
function readYaml(relativePath) {
  try {
    return parseYaml(readText(relativePath));
  } catch (error) {
    errors.push(`Cannot parse YAML file ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Reads and parses a JSON file.
 *
 * @param {string} relativePath - Repository-relative JSON file path.
 * @returns {unknown | null} Parsed JSON document, or null when parsing fails.
 */
function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    errors.push(`Cannot parse JSON file ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Ensures a value is an array.
 *
 * @param {unknown} value - Value to inspect.
 * @returns {unknown[]} The value when it is an array, otherwise an empty array.
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Builds a set from the ids of registry entries.
 *
 * @param {unknown[]} entries - Entries with an id field.
 * @returns {Set<string>} Set of entry ids.
 */
function idSet(entries) {
  return new Set(entries.map((entry) => entry?.id).filter(Boolean));
}

/**
 * Adds a governed ID to the global ID registry and reports duplicates.
 *
 * @param {Map<string, string[]>} ids - Map of governed id to locations.
 * @param {string | undefined} id - Governed id.
 * @param {string} location - Human-readable location.
 * @returns {void}
 */
function addGovernedId(ids, id, location) {
  if (!id) {
    errors.push(`Missing governed id at ${location}`);
    return;
  }

  const locations = ids.get(id) ?? [];
  locations.push(location);
  ids.set(id, locations);
}

/**
 * Checks a value against a controlled taxonomy.
 *
 * @param {Map<string, Set<string>>} taxonomies - Taxonomy id to allowed value ids.
 * @param {string} taxonomyName - Taxonomy name.
 * @param {string | undefined} value - Value to check.
 * @param {string} location - Human-readable location.
 * @returns {void}
 */
function checkTaxonomyValue(taxonomies, taxonomyName, value, location) {
  const allowed = taxonomies.get(taxonomyName);
  if (!allowed) {
    errors.push(`Missing taxonomy '${taxonomyName}' required by ${location}`);
    return;
  }

  if (!value || !allowed.has(value)) {
    errors.push(`Invalid ${taxonomyName} value '${value ?? "<missing>"}' at ${location}`);
  }
}

/**
 * Checks that an id matches an expected regular expression.
 *
 * @param {string | undefined} id - ID value.
 * @param {RegExp} pattern - Expected pattern.
 * @param {string} location - Human-readable location.
 * @returns {void}
 */
function checkIdPattern(id, pattern, location) {
  if (!id || !pattern.test(id)) {
    errors.push(`Invalid id pattern at ${location}: ${id ?? "<missing>"}`);
  }
}

/**
 * Splits a root or canonical modular ID into area and local components.
 *
 * @param {unknown} id - ID to split.
 * @returns {{ areaId: string | null, localId: string | undefined }} Split ID components.
 */
function splitProjectModelId(id) {
  if (typeof id !== "string") {
    return { areaId: null, localId: undefined };
  }

  const separatorIndex = id.indexOf(":");
  if (separatorIndex === -1) {
    return { areaId: null, localId: id };
  }

  return {
    areaId: id.slice(0, separatorIndex),
    localId: id.slice(separatorIndex + 1)
  };
}

/**
 * Returns the local component of a root or canonical modular ID.
 *
 * @param {unknown} id - ID to inspect.
 * @returns {string | undefined} Local ID component.
 */
function localProjectModelId(id) {
  return splitProjectModelId(id).localId;
}

/**
 * Builds a canonical modular ID from a governed area and part-local ID.
 *
 * @param {string | undefined} areaId - Owning project-model area.
 * @param {unknown} localId - Part-local ID.
 * @returns {unknown} Canonical ID when possible, otherwise original value.
 */
function canonicalizeProjectModelId(areaId, localId) {
  if (typeof areaId !== "string" || typeof localId !== "string") {
    return localId;
  }

  if (localId.includes(":")) {
    return localId;
  }

  return `${areaId}:${localId}`;
}

/**
 * Validates a root or canonical modular ID by checking its optional area prefix
 * and its local ID component.
 *
 * @param {unknown} id - ID to validate.
 * @param {RegExp} localPattern - Expected local ID pattern.
 * @param {string} location - Human-readable error location.
 * @returns {void}
 */
function checkRootOrCanonicalIdPattern(id, localPattern, location) {
  const { areaId, localId } = splitProjectModelId(id);

  if (areaId !== null && !PROJECT_MODEL_AREA_ID_PATTERN.test(areaId)) {
    errors.push(`Invalid area prefix at ${location}: ${id ?? "<missing>"}`);
    return;
  }

  if (typeof localId !== "string" || !localPattern.test(localId)) {
    errors.push(`Invalid id pattern at ${location}: ${id ?? "<missing>"}`);
  }
}

/**
 * Returns the canonical modular replacement for a migrated legacy ID.
 *
 * @param {unknown} id - Requirement or decision ID to inspect.
 * @param {unknown} type - Graph node type associated with the ID.
 * @returns {string | undefined} Canonical replacement when the ID is a removed legacy alias.
 */
function migratedSchemaValidationCanonicalId(id, type) {
  if (type === "Requirement") {
    return MIGRATED_SCHEMA_VALIDATION_REQUIREMENT_IDS.get(id);
  }

  if (type === "Decision") {
    return MIGRATED_SCHEMA_VALIDATION_DECISION_IDS.get(id);
  }

  return undefined;
}

/**
 * Rejects references to legacy global IDs that were removed by the first
 * schema-validation area canonicalization.
 *
 * @param {unknown} id - ID to inspect.
 * @param {unknown} type - Graph node type associated with the ID.
 * @param {string} location - Human-readable error location.
 * @returns {void}
 */
function checkNoMigratedSchemaValidationLegacyId(id, type, location) {
  const canonicalId = migratedSchemaValidationCanonicalId(id, type);
  if (canonicalId) {
    errors.push(`${location} uses legacy extracted ${String(type).toLowerCase()} id ${id}; use ${canonicalId}`);
  }
}

/**
 * Extracts the first file-level JSDoc block from source content.
 *
 * @param {string} content - Source file content.
 * @returns {string | null} First JSDoc block, or null if not present.
 */
function extractFileJSDoc(content) {
  const withoutLeadingWhitespace = content.trimStart();
  const withoutShebang = withoutLeadingWhitespace.startsWith("#!")
    ? withoutLeadingWhitespace.replace(/^#!.*(?:\r?\n|$)/, "").trimStart()
    : withoutLeadingWhitespace;
  const match = /^\/\*\*[\s\S]*?\*\//.exec(withoutShebang);
  return match ? match[0] : null;
}

/**
 * Extracts governed references from a JSDoc block.
 *
 * @param {string} jsdoc - File-level JSDoc block.
 * @returns {{ requirements: Set<string>, tools: Set<string>, commands: Set<string>, capabilities: Set<string> }} Parsed references.
 */
function extractTraceabilityReferences(jsdoc) {
  return {
    requirements: new Set(jsdoc.match(CANONICAL_REQUIREMENT_REFERENCE_PATTERN) ?? []),
    tools: new Set(jsdoc.match(/\bTOOL-[A-Z0-9-]+\b/g) ?? []),
    commands: new Set(jsdoc.match(/\bCMD-[A-Z0-9-]+\b/g) ?? []),
    capabilities: new Set(jsdoc.match(/\bCAP-[A-Z0-9-]+\b/g) ?? [])
  };
}

/**
 * Validates that a file-level JSDoc comment contains the canonical sections
 * required for governed tool files.
 *
 * @param {string} sourceFile - Repository-relative source file path.
 * @param {string} jsdoc - File-level JSDoc block.
 * @returns {void}
 */
function checkJSDocCompleteness(sourceFile, jsdoc) {
  const requiredFragments = [
    "@file",
    "Canonical references:",
    MODEL_FILES.governance,
    MODEL_FILES.requirements,
    MODEL_FILES.matrix,
    "Related requirements:",
    "Provides graph nodes:",
    "Failure behavior:"
  ];

  for (const fragment of requiredFragments) {
    if (!jsdoc.includes(fragment)) {
      errors.push(`Source file ${sourceFile} JSDoc is missing required fragment: ${fragment}`);
    }
  }
}


/**
 * Returns true when a value is a plain object.
 *
 * @param {unknown} value - Value to inspect.
 * @returns {boolean} True when the value is a non-array object.
 */
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns an array of string values.
 *
 * @param {unknown} value - Value to inspect.
 * @returns {string[]} String values when the value is an array, otherwise an empty array.
 */
function stringArray(value) {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
}

/**
 * Returns true when an id looks like a repository path rather than a registry id.
 *
 * @param {string} id - ID or path.
 * @returns {boolean} True when the id is path-like.
 */
function isPathLike(id) {
  return id.includes("/") || id.endsWith(".json") || id.endsWith(".yml") || id.endsWith(".mjs");
}

/**
 * Builds the canonical entity indexes from registry and matrix files.
 *
 * @param {object} governance - Parsed governance registry.
 * @param {object} requirements - Parsed requirements registry.
 * @param {object} matrix - Parsed graph matrix.
 * @returns {object} Entity index object.
 */
function buildIndexes(governance, requirements, matrix) {
  const capabilities = asArray(governance?.capabilities);
  const decisions = asArray(governance?.decisions);
  const documentTypes = asArray(governance?.document_types);
  const bodyProfiles = asArray(governance?.body_profiles);
  const nodeTypes = asArray(governance?.node_types);
  const predicates = asArray(governance?.predicates);
  const macroRequirements = asArray(requirements?.macro_requirements);
  const atomicRequirements = asArray(requirements?.requirements);
  const matrixNodes = asArray(matrix?.nodes);
  const triples = asArray(matrix?.triples);

  const taxonomies = new Map(
    Object.entries(governance?.taxonomies ?? {}).map(([name, entries]) => [
      name,
      idSet(asArray(entries))
    ])
  );

  const governedIds = new Map();

  for (const entry of capabilities) addGovernedId(governedIds, entry?.id, "governance.capabilities");
  for (const entry of decisions) addGovernedId(governedIds, entry?.id, "governance.decisions");
  for (const entry of documentTypes) addGovernedId(governedIds, entry?.id, "governance.document_types");
  for (const entry of bodyProfiles) addGovernedId(governedIds, entry?.id, "governance.body_profiles");
  for (const entry of nodeTypes) addGovernedId(governedIds, entry?.id, "governance.node_types");
  for (const entry of predicates) addGovernedId(governedIds, entry?.id, "governance.predicates");
  for (const entry of macroRequirements) addGovernedId(governedIds, entry?.id, "requirements.macro_requirements");

  for (const requirement of atomicRequirements) {
    addGovernedId(governedIds, requirement?.id, "requirements.requirements");

    for (const entry of asArray(requirement?.preconditions)) {
      addGovernedId(governedIds, entry?.id, `${requirement?.id}.preconditions`);
    }

    for (const entry of asArray(requirement?.main_flow)) {
      addGovernedId(governedIds, entry?.id, `${requirement?.id}.main_flow`);
    }

    for (const entry of asArray(requirement?.alternative_flows)) {
      addGovernedId(governedIds, entry?.id, `${requirement?.id}.alternative_flows`);
      for (const step of asArray(entry?.steps)) {
        addGovernedId(governedIds, step?.id, `${requirement?.id}.${entry?.id}.steps`);
      }
    }

    for (const entry of asArray(requirement?.postconditions)) {
      addGovernedId(governedIds, entry?.id, `${requirement?.id}.postconditions`);
    }

    for (const entry of asArray(requirement?.acceptance_criteria)) {
      addGovernedId(governedIds, entry?.id, `${requirement?.id}.acceptance_criteria`);
    }
  }

  for (const entry of matrixNodes) addGovernedId(governedIds, entry?.id, "matrix.nodes");

  return {
    capabilities,
    decisions,
    documentTypes,
    bodyProfiles,
    nodeTypes,
    predicates,
    macroRequirements,
    atomicRequirements,
    matrixNodes,
    triples,
    taxonomies,
    taxonomyEntries: new Map(Object.entries(governance?.taxonomies ?? {}).map(([name, entries]) => [
      name,
      asArray(entries)
    ])),
    governedIds,
    capabilityIds: idSet(capabilities),
    decisionIds: idSet(decisions),
    bodyProfileIds: idSet(bodyProfiles),
    nodeTypeIds: idSet(nodeTypes),
    predicateIds: idSet(predicates),
    macroRequirementIds: idSet(macroRequirements),
    requirementIds: idSet(atomicRequirements),
    matrixNodeIds: idSet(matrixNodes),
    predicateById: new Map(predicates.map((predicate) => [predicate.id, predicate]))
  };
}

/**
 * Validates the governed project_model_areas taxonomy contract.
 *
 * The taxonomy is the future source of truth for modular project-model area_id
 * values. This check enforces semantic membership prerequisites before modular
 * requirements, graph, or decisions parts rely on area_id broadly.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {void}
 */
function validateProjectModelAreasTaxonomy(indexes) {
  const areas = indexes.taxonomyEntries.get(PROJECT_MODEL_AREAS_TAXONOMY);

  if (!areas) {
    errors.push(`Missing taxonomy '${PROJECT_MODEL_AREAS_TAXONOMY}' required for project-model modularization`);
    return;
  }

  const seenAreaIds = new Map();

  for (const [index, area] of areas.entries()) {
    const id = area?.id;
    const location = `${PROJECT_MODEL_AREAS_TAXONOMY}[${index}]`;

    if (!id || !PROJECT_MODEL_AREA_ID_PATTERN.test(id)) {
      errors.push(`Invalid project_model_areas value '${id ?? "<missing>"}' at ${location}`);
      continue;
    }

    const locations = seenAreaIds.get(id) ?? [];
    locations.push(location);
    seenAreaIds.set(id, locations);

    for (const field of ["description", "rationale", "validation_impact"]) {
      if (typeof area?.[field] !== "string" || area[field].trim().length === 0) {
        errors.push(`project_model_areas value '${id}' must declare non-empty ${field}`);
      }
    }
  }

  for (const [id, locations] of seenAreaIds.entries()) {
    if (locations.length > 1) {
      errors.push(`Duplicate project_model_areas value '${id}' at: ${locations.join(", ")}`);
    }
  }

  if (!seenAreaIds.has("global")) {
    errors.push("project_model_areas must declare the required global area");
  }
}

/**
 * Validates controlled taxonomy usage across registries.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {void}
 */
function validateTaxonomies(indexes) {
  for (const capability of indexes.capabilities) {
    checkTaxonomyValue(indexes.taxonomies, "capability_status", capability?.status, `capability ${capability?.id}`);
  }

  for (const decision of indexes.decisions) {
    checkTaxonomyValue(indexes.taxonomies, "decision_status", decision?.status, `decision ${decision?.id}`);
  }

  for (const macroRequirement of indexes.macroRequirements) {
    checkTaxonomyValue(indexes.taxonomies, "requirement_status", macroRequirement?.status, `macro requirement ${macroRequirement?.id}`);
    checkTaxonomyValue(indexes.taxonomies, "requirement_implementation_status", macroRequirement?.implementation_status, `macro requirement ${macroRequirement?.id}`);
    checkTaxonomyValue(indexes.taxonomies, "priority", macroRequirement?.priority, `macro requirement ${macroRequirement?.id}`);
  }

  for (const requirement of indexes.atomicRequirements) {
    checkTaxonomyValue(indexes.taxonomies, "requirement_status", requirement?.status, `requirement ${requirement?.id}`);
    checkTaxonomyValue(indexes.taxonomies, "requirement_implementation_status", requirement?.implementation_status, `requirement ${requirement?.id}`);
    checkTaxonomyValue(indexes.taxonomies, "priority", requirement?.priority, `requirement ${requirement?.id}`);
    checkTaxonomyValue(indexes.taxonomies, "requirement_type", requirement?.type, `requirement ${requirement?.id}`);
    checkTaxonomyValue(indexes.taxonomies, "scope", requirement?.scope, `requirement ${requirement?.id}`);

    checkTaxonomyValue(indexes.taxonomies, "verification_method", requirement?.verification?.method, `requirement ${requirement?.id}.verification.method`);
    for (const evidence of asArray(requirement?.verification?.required_evidence)) {
      checkTaxonomyValue(indexes.taxonomies, "evidence_type", evidence, `requirement ${requirement?.id}.verification.required_evidence`);
    }
  }
}

/**
 * Validates ID uniqueness and expected ID patterns.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {void}
 */
function validateIds(indexes) {
  for (const [id, locations] of indexes.governedIds.entries()) {
    if (locations.length > 1) {
      errors.push(`Duplicate governed id '${id}' at: ${locations.join(", ")}`);
    }
  }

  for (const capability of indexes.capabilities) checkIdPattern(capability?.id, /^CAP-[A-Z0-9-]+$/, `capability ${capability?.id}`);
  for (const decision of indexes.decisions) checkRootOrCanonicalIdPattern(decision?.id, LOCAL_DECISION_ID_PATTERN, `decision ${decision?.id}`);
  for (const bodyProfile of indexes.bodyProfiles) checkIdPattern(bodyProfile?.id, /^BODY-[A-Z0-9-]+$/, `body profile ${bodyProfile?.id}`);
  for (const nodeType of indexes.nodeTypes) checkIdPattern(nodeType?.id, /^[A-Z][A-Za-z0-9]*$/, `node type ${nodeType?.id}`);
  for (const predicate of indexes.predicates) checkIdPattern(predicate?.id, /^[A-Z][A-Z0-9_]+$/, `predicate ${predicate?.id}`);
  for (const macroRequirement of indexes.macroRequirements) checkRootOrCanonicalIdPattern(macroRequirement?.id, LOCAL_MACRO_REQUIREMENT_ID_PATTERN, `macro requirement ${macroRequirement?.id}`);

  for (const requirement of indexes.atomicRequirements) {
    const requirementId = requirement?.id;
    checkRootOrCanonicalIdPattern(requirementId, LOCAL_REQUIREMENT_ID_PATTERN, `requirement ${requirementId}`);
    const localRequirementId = localProjectModelId(requirementId);

    for (const entry of asArray(requirement?.preconditions)) {
      checkRootOrCanonicalIdPattern(entry?.id, new RegExp(`^PRE-${localRequirementId}-\\d{3}$`), `${requirementId}.preconditions`);
    }

    for (const entry of asArray(requirement?.main_flow)) {
      checkRootOrCanonicalIdPattern(entry?.id, new RegExp(`^FLOW-${localRequirementId}-\\d{3}$`), `${requirementId}.main_flow`);
    }

    for (const entry of asArray(requirement?.alternative_flows)) {
      checkRootOrCanonicalIdPattern(entry?.id, new RegExp(`^ALT-${localRequirementId}-\\d{3}$`), `${requirementId}.alternative_flows`);

      for (const step of asArray(entry?.steps)) {
        checkRootOrCanonicalIdPattern(step?.id, new RegExp(`^FLOW-${localRequirementId}-ALT-\\d{3}$`), `${requirementId}.${entry?.id}.steps`);
      }
    }

    for (const entry of asArray(requirement?.postconditions)) {
      checkRootOrCanonicalIdPattern(entry?.id, new RegExp(`^POST-${localRequirementId}-\\d{3}$`), `${requirementId}.postconditions`);
    }

    for (const entry of asArray(requirement?.acceptance_criteria)) {
      checkRootOrCanonicalIdPattern(entry?.id, new RegExp(`^AC-${localRequirementId}-\\d{3}$`), `${requirementId}.acceptance_criteria`);
    }
  }

  for (const node of indexes.matrixNodes) {
    const type = node?.type;
    const id = node?.id;

    if (type === "Gate") checkIdPattern(id, /^GATE-[A-Z0-9-]+$/, `matrix node ${id}`);
    if (type === "Command") checkIdPattern(id, /^CMD-[A-Z0-9-]+$/, `matrix node ${id}`);
    if (type === "ValidationTool") checkIdPattern(id, /^TOOL-[A-Z0-9-]+$/, `matrix node ${id}`);
  }
}

/**
 * Validates references among requirements, macro requirements, capabilities,
 * document types, body profiles, node types, and predicates.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {void}
 */
function validateRegistryReferences(indexes) {
  for (const documentType of indexes.documentTypes) {
    if (!indexes.bodyProfileIds.has(documentType?.body_profile_id)) {
      errors.push(`Document type ${documentType?.id} references unknown body profile ${documentType?.body_profile_id}`);
    }
  }

  for (const predicate of indexes.predicates) {
    for (const type of asArray(predicate?.allowed_subject_types)) {
      if (!indexes.nodeTypeIds.has(type)) {
        errors.push(`Predicate ${predicate?.id} references unknown allowed subject type ${type}`);
      }
    }

    for (const type of asArray(predicate?.allowed_object_types)) {
      if (!indexes.nodeTypeIds.has(type)) {
        errors.push(`Predicate ${predicate?.id} references unknown allowed object type ${type}`);
      }
    }
  }

  for (const requirement of indexes.atomicRequirements) {
    if (!indexes.macroRequirementIds.has(requirement?.macro_requirement_id)) {
      errors.push(`Requirement ${requirement?.id} references unknown macro requirement ${requirement?.macro_requirement_id}`);
    }

    if (!indexes.capabilityIds.has(requirement?.capability_id)) {
      errors.push(`Requirement ${requirement?.id} references unknown capability ${requirement?.capability_id}`);
    }
  }

  for (const node of indexes.matrixNodes) {
    if (!indexes.nodeTypeIds.has(node?.type)) {
      errors.push(`Matrix node ${node?.id} uses unknown node type ${node?.type}`);
    }
  }
}

/**
 * Returns true when an entity is known from registries, matrix nodes, or an
 * existing path-like repository artifact.
 *
 * @param {string} id - Entity id.
 * @param {string} type - Entity node type.
 * @param {object} indexes - Entity indexes.
 * @returns {boolean} True when the entity is known or path-backed.
 */
function isKnownEntity(id, type, indexes) {
  if (type === "Capability") return indexes.capabilityIds.has(id);
  if (type === "Decision") return indexes.decisionIds.has(id);
  if (type === "MacroRequirement") return indexes.macroRequirementIds.has(id);
  if (type === "Requirement") return indexes.requirementIds.has(id);
  if (type === "Gate" || type === "Command" || type === "ValidationTool") return indexes.matrixNodeIds.has(id);

  if (type === "Document") {
    return indexes.matrixNodeIds.has(id) || isFileOrDirectory(id);
  }

  if (type === "SourceFile" || type === "ConfigFile") {
    return indexes.matrixNodeIds.has(id) || isFile(id);
  }

  return indexes.matrixNodeIds.has(id);
}

/**
 * Validates SPO triples against registered predicates and node types.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {void}
 */
function validateTriples(indexes) {
  const tripleKeys = new Set();

  for (const [index, triple] of indexes.triples.entries()) {
    const subject = triple?.subject;
    const object = triple?.object;
    const predicateId = triple?.predicate;
    const location = `triple[${index}]`;

    if (!subject?.id || !subject?.type || !object?.id || !object?.type || !predicateId) {
      errors.push(`${location} must contain subject.id, subject.type, predicate, object.id, object.type`);
      continue;
    }

    const key = `${subject.id}|${predicateId}|${object.id}`;
    if (tripleKeys.has(key)) {
      errors.push(`Duplicate SPO triple: ${key}`);
    }
    tripleKeys.add(key);

    const predicate = indexes.predicateById.get(predicateId);
    if (!predicate) {
      errors.push(`${location} uses unknown predicate ${predicateId}`);
      continue;
    }

    if (!asArray(predicate.allowed_subject_types).includes(subject.type)) {
      errors.push(`${location} predicate ${predicateId} does not allow subject type ${subject.type}`);
    }

    if (!asArray(predicate.allowed_object_types).includes(object.type)) {
      errors.push(`${location} predicate ${predicateId} does not allow object type ${object.type}`);
    }

    if (!indexes.nodeTypeIds.has(subject.type)) {
      errors.push(`${location} uses unknown subject node type ${subject.type}`);
    }

    if (!indexes.nodeTypeIds.has(object.type)) {
      errors.push(`${location} uses unknown object node type ${object.type}`);
    }

    if (!isKnownEntity(subject.id, subject.type, indexes)) {
      errors.push(`${location} subject is not known: ${subject.type} ${subject.id}`);
    }

    if (!isKnownEntity(object.id, object.type, indexes)) {
      errors.push(`${location} object is not known: ${object.type} ${object.id}`);
    }
  }
}

/**
 * Extracts npm script names from Command nodes using the "npm run <script>"
 * command format.
 *
 * @param {unknown[]} matrixNodes - Graph matrix nodes.
 * @returns {Map<string, string>} Command node id to npm script name.
 */
function npmScriptCommands(matrixNodes) {
  const commands = new Map();

  for (const node of matrixNodes) {
    if (node?.type !== "Command" || typeof node?.command !== "string") {
      continue;
    }

    const match = /^npm\s+run\s+([^\s]+)$/.exec(node.command.trim());
    if (match) {
      commands.set(node.id, match[1]);
    }
  }

  return commands;
}

/**
 * Checks consistency between graph.matrix.yml Command nodes and package.json
 * scripts for governed validation commands.
 *
 * @param {object} indexes - Entity indexes.
 * @param {object} packageJson - Parsed package.json.
 * @returns {void}
 */
function validatePackageScripts(indexes, packageJson) {
  const scripts = packageJson?.scripts ?? {};
  const npmCommands = npmScriptCommands(indexes.matrixNodes);
  const commandScripts = new Map([...npmCommands.entries()].map(([commandId, scriptName]) => [scriptName, commandId]));

  for (const [commandId, scriptName] of npmCommands.entries()) {
    if (!Object.prototype.hasOwnProperty.call(scripts, scriptName)) {
      errors.push(`Command node ${commandId} references missing package.json script '${scriptName}'`);
    }
  }

  for (const scriptName of Object.keys(scripts)) {
    const isGovernedValidationScript =
      scriptName === "check" ||
      scriptName === "precommit" ||
      scriptName.startsWith("docs:check");

    if (isGovernedValidationScript && !commandScripts.has(scriptName)) {
      errors.push(`package.json script '${scriptName}' has no matching Command node in graph.matrix.yml`);
    }
  }

  for (const [scriptName, commandId] of commandScripts.entries()) {
    const hasDeclaredInPackage = indexes.triples.some(
      (triple) =>
        triple?.subject?.id === commandId &&
        triple?.subject?.type === "Command" &&
        triple?.predicate === "DECLARED_IN" &&
        triple?.object?.id === MODEL_FILES.packageJson &&
        triple?.object?.type === "ConfigFile"
    );

    if (!hasDeclaredInPackage) {
      errors.push(`Command node ${commandId} for package script '${scriptName}' is missing DECLARED_IN package.json triple`);
    }
  }
}



/**
 * Reads baseline artifact change-control metadata from YAML or JSON Schema
 * extension fields.
 *
 * @param {object | null | undefined} document - Parsed baseline artifact.
 * @returns {object | undefined} Change-control object when present.
 */
function baselineChangeControl(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return undefined;
  }

  return document.change_control ?? document["x-change_control"];
}

/**
 * Checks that governed baseline artifacts contain file-local change-control
 * markers and that graph.matrix.yml confirms those markers.
 *
 * @param {object} indexes - Entity indexes.
 * @param {Map<string, object>} baselineDocuments - Baseline artifact path to parsed document.
 * @param {string[]} baselineArtifactPaths - Governed baseline paths that require change-control traceability.
 * @returns {void}
 */
function validateBidirectionalBaselineArtifactTraceability(indexes, baselineDocuments, baselineArtifactPaths) {
  for (const artifactPath of baselineArtifactPaths) {
    const document = baselineDocuments.get(artifactPath);
    const changeControl = baselineChangeControl(document);

    if (!isObject(changeControl)) {
      errors.push(`Governed baseline artifact ${artifactPath} is missing change_control metadata`);
      continue;
    }

    const satisfies = stringArray(changeControl.satisfies);
    const decidedBy = stringArray(changeControl.decided_by);

    if (satisfies.length === 0) {
      errors.push(`Governed baseline artifact ${artifactPath} change_control.satisfies must contain at least one requirement id`);
    }

    if (decidedBy.length === 0) {
      errors.push(`Governed baseline artifact ${artifactPath} change_control.decided_by must contain at least one decision id`);
    }

    for (const requirementId of satisfies) {
      if (!indexes.requirementIds.has(requirementId)) {
        errors.push(`Governed baseline artifact ${artifactPath} change_control.satisfies references unknown requirement ${requirementId}`);
        continue;
      }

      const hasSpecifiedBy = indexes.triples.some(
        (triple) =>
          triple?.subject?.type === "Requirement" &&
          triple?.subject?.id === requirementId &&
          triple?.predicate === "SPECIFIED_BY" &&
          triple?.object?.id === artifactPath &&
          ["Document", "SchemaFile"].includes(triple?.object?.type)
      );

      if (!hasSpecifiedBy) {
        errors.push(`Governed baseline artifact ${artifactPath} change_control.satisfies cites ${requirementId}, but graph.matrix.yml has no matching SPECIFIED_BY triple`);
      }

      for (const decisionId of decidedBy) {
        if (!indexes.decisionIds.has(decisionId)) {
          errors.push(`Governed baseline artifact ${artifactPath} change_control.decided_by references unknown decision ${decisionId}`);
          continue;
        }

        const decisionConfirmsRequirement = indexes.triples.some(
          (triple) =>
            triple?.subject?.type === "Decision" &&
            triple?.subject?.id === decisionId &&
            triple?.predicate === "DECIDES" &&
            triple?.object?.type === "Requirement" &&
            triple?.object?.id === requirementId
        );

        if (!decisionConfirmsRequirement) {
          errors.push(`Governed baseline artifact ${artifactPath} change_control.decided_by cites ${decisionId}, but graph.matrix.yml does not show ${decisionId} DECIDES ${requirementId}`);
        }
      }
    }
  }

  for (const triple of indexes.triples) {
    const requirementId = triple?.subject?.id;
    const artifactPath = triple?.object?.id;

    if (
      triple?.subject?.type !== "Requirement" ||
      triple?.predicate !== "SPECIFIED_BY" ||
      !["Document", "SchemaFile"].includes(triple?.object?.type) ||
      !BASELINE_TRACEABILITY_REQUIREMENTS.has(requirementId) ||
      !baselineArtifactPaths.includes(artifactPath)
    ) {
      continue;
    }

    const document = baselineDocuments.get(artifactPath);
    const satisfies = stringArray(baselineChangeControl(document)?.satisfies);

    if (!satisfies.includes(requirementId)) {
      errors.push(`graph.matrix.yml says ${requirementId} SPECIFIED_BY ${artifactPath}, but the artifact change_control.satisfies marker does not cite ${requirementId}`);
    }
  }
}


/**
 * Reads schema application targets declared by a schema artifact.
 *
 * @param {object | null | undefined} schemaDocument - Parsed schema document.
 * @returns {string[]} Target artifact paths declared by x-applies_to.
 */
function schemaAppliesTo(schemaDocument) {
  if (!isObject(schemaDocument)) {
    return [];
  }

  return stringArray(schemaDocument["x-applies_to"]);
}

/**
 * Reads schema-control metadata declared by a governed target artifact.
 *
 * @param {object | null | undefined} artifactDocument - Parsed target artifact document.
 * @returns {object | undefined} Schema-control object when present.
 */
function artifactSchemaControl(artifactDocument) {
  if (!isObject(artifactDocument)) {
    return undefined;
  }

  return artifactDocument.schema_control;
}

/**
 * Returns graph.matrix.yml schema application triples.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {unknown[]} APPLIES_TO triples whose subject is a SchemaFile.
 */
function schemaApplicationTriples(indexes) {
  return indexes.triples.filter(
    (triple) => triple?.predicate === "APPLIES_TO" && triple?.subject?.type === "SchemaFile"
  );
}

/**
 * Validates bidirectional traceability between schema artifacts, governed
 * target artifacts, and graph.matrix.yml schema application triples.
 *
 * @param {object} indexes - Entity indexes.
 * @param {Map<string, object>} baselineDocuments - Baseline artifact path to parsed document.
 * @returns {void}
 */
function validateBidirectionalSchemaApplicationTraceability(indexes, baselineDocuments) {
  const applicationTriples = schemaApplicationTriples(indexes);

  for (const triple of applicationTriples) {
    const schemaPath = triple?.subject?.id;
    const targetPath = triple?.object?.id;

    if (!schemaPath || !targetPath) {
      continue;
    }

    const schemaDocument = baselineDocuments.get(schemaPath);
    const targetDocument = baselineDocuments.get(targetPath);

    if (!schemaDocument) {
      errors.push(`Schema application triple references unmanaged or unread schema artifact ${schemaPath}`);
      continue;
    }

    if (!targetDocument) {
      errors.push(`Schema application triple references unmanaged or unread target artifact ${targetPath}`);
      continue;
    }

    const appliesTo = schemaAppliesTo(schemaDocument);
    if (!appliesTo.includes(targetPath)) {
      errors.push(`Schema ${schemaPath} APPLIES_TO ${targetPath} in graph.matrix.yml, but x-applies_to does not include ${targetPath}`);
    }

    const schemaControl = artifactSchemaControl(targetDocument);
    if (!isObject(schemaControl) || schemaControl.schema !== schemaPath) {
      errors.push(`Artifact ${targetPath} is targeted by schema ${schemaPath}, but schema_control.schema does not match`);
    }
  }

  for (const [schemaPath, schemaDocument] of baselineDocuments.entries()) {
    const appliesTo = schemaAppliesTo(schemaDocument);

    for (const targetPath of appliesTo) {
      const hasGraphTriple = applicationTriples.some(
        (triple) => triple?.subject?.id === schemaPath && triple?.object?.id === targetPath
      );

      if (!hasGraphTriple) {
        errors.push(`Schema ${schemaPath} x-applies_to cites ${targetPath}, but graph.matrix.yml has no matching APPLIES_TO triple`);
      }

      const targetDocument = baselineDocuments.get(targetPath);
      const schemaControl = artifactSchemaControl(targetDocument);
      if (!isObject(schemaControl) || schemaControl.schema !== schemaPath) {
        errors.push(`Schema ${schemaPath} x-applies_to cites ${targetPath}, but the target artifact schema_control.schema does not match`);
      }
    }
  }

  for (const [artifactPath, artifactDocument] of baselineDocuments.entries()) {
    const schemaControl = artifactSchemaControl(artifactDocument);

    if (!isObject(schemaControl) || typeof schemaControl.schema !== "string") {
      continue;
    }

    const schemaPath = schemaControl.schema;
    const schemaDocument = baselineDocuments.get(schemaPath);

    if (!schemaDocument) {
      errors.push(`Artifact ${artifactPath} schema_control.schema references unmanaged or unread schema artifact ${schemaPath}`);
      continue;
    }

    const appliesTo = schemaAppliesTo(schemaDocument);
    if (!appliesTo.includes(artifactPath)) {
      errors.push(`Artifact ${artifactPath} schema_control.schema cites ${schemaPath}, but the schema x-applies_to does not include the artifact`);
    }

    const hasGraphTriple = applicationTriples.some(
      (triple) => triple?.subject?.id === schemaPath && triple?.object?.id === artifactPath
    );

    if (!hasGraphTriple) {
      errors.push(`Artifact ${artifactPath} schema_control.schema cites ${schemaPath}, but graph.matrix.yml has no matching APPLIES_TO triple`);
    }
  }
}

/**
 * Gets IMPLEMENTED_BY triples that point at source files.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {unknown[]} IMPLEMENTED_BY SourceFile triples.
 */
function sourceImplementationTriples(indexes) {
  return indexes.triples.filter(
    (triple) => triple?.predicate === "IMPLEMENTED_BY" && triple?.object?.type === "SourceFile"
  );
}

/**
 * Validates matrix-to-code and code-to-matrix file-level traceability.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {void}
 */
function validateBidirectionalSourceTraceability(indexes) {
  const implementationTriples = sourceImplementationTriples(indexes);
  const requirementByFile = new Map();
  const toolByFile = new Map();

  for (const triple of implementationTriples) {
    const file = triple.object.id;
    if (!isFile(file)) {
      errors.push(`IMPLEMENTED_BY source file does not exist: ${file}`);
      continue;
    }

    if (triple.subject.type === "Requirement") {
      const ids = requirementByFile.get(file) ?? new Set();
      ids.add(triple.subject.id);
      requirementByFile.set(file, ids);
    }

    if (triple.subject.type === "ValidationTool") {
      const ids = toolByFile.get(file) ?? new Set();
      ids.add(triple.subject.id);
      toolByFile.set(file, ids);
    }
  }

  const filesDeclaredByMatrix = new Set([...requirementByFile.keys(), ...toolByFile.keys()]);
  const discoveredSourceFiles = discoverGovernedSourceFiles();

  for (const file of discoveredSourceFiles) {
    if (!filesDeclaredByMatrix.has(file)) {
      errors.push(`Governed source file ${file} has no IMPLEMENTED_BY traceability in graph.matrix.yml`);
    }
  }

  const filesToInspect = new Set([...filesDeclaredByMatrix, ...discoveredSourceFiles]);

  for (const file of filesToInspect) {
    const jsdoc = extractFileJSDoc(readText(file));
    if (!jsdoc) {
      errors.push(`Source file ${file} is missing a file-level JSDoc block`);
      continue;
    }

    checkJSDocCompleteness(file, jsdoc);
    const refs = extractTraceabilityReferences(jsdoc);

    for (const requirementId of refs.requirements) {
      checkNoMigratedSchemaValidationLegacyId(requirementId, "Requirement", `Source file ${file} JSDoc`);
    }

    for (const requirementId of requirementByFile.get(file) ?? []) {
      if (!refs.requirements.has(requirementId)) {
        errors.push(`Matrix says ${requirementId} IMPLEMENTED_BY ${file}, but file JSDoc does not cite ${requirementId}`);
      }
    }

    for (const toolId of toolByFile.get(file) ?? []) {
      if (!refs.tools.has(toolId)) {
        errors.push(`Matrix says ${toolId} IMPLEMENTED_BY ${file}, but file JSDoc does not cite ${toolId}`);
      }
    }

    for (const requirementId of refs.requirements) {
      const hasMatchingTriple = implementationTriples.some(
        (triple) =>
          triple.subject.type === "Requirement" &&
          triple.subject.id === requirementId &&
          triple.object.id === file
      );

      if (!hasMatchingTriple) {
        errors.push(`File ${file} JSDoc cites ${requirementId}, but graph.matrix.yml has no matching IMPLEMENTED_BY triple`);
      }
    }

    for (const toolId of refs.tools) {
      if (!indexes.matrixNodeIds.has(toolId)) {
        errors.push(`File ${file} JSDoc cites unknown graph node ${toolId}`);
        continue;
      }

      const hasMatchingTriple = implementationTriples.some(
        (triple) =>
          triple.subject.type === "ValidationTool" &&
          triple.subject.id === toolId &&
          triple.object.id === file
      );

      if (!hasMatchingTriple) {
        errors.push(`File ${file} JSDoc cites ${toolId}, but graph.matrix.yml has no matching IMPLEMENTED_BY triple`);
      }
    }

    for (const commandId of refs.commands) {
      if (!indexes.matrixNodeIds.has(commandId)) {
        errors.push(`File ${file} JSDoc cites unknown command node ${commandId}`);
      }
    }

    for (const capabilityId of refs.capabilities) {
      if (!indexes.capabilityIds.has(capabilityId)) {
        errors.push(`File ${file} JSDoc cites unknown capability ${capabilityId}`);
      }
    }
  }
}

/**
 * Returns declared project-model part entries from an index document.
 *
 * @param {object | null | undefined} indexDocument - Parsed index document.
 * @param {string} propertyName - Part declaration property name.
 * @returns {unknown[]} Part declarations.
 */
function declaredPartEntries(indexDocument, propertyName) {
  return asArray(indexDocument?.[propertyName]);
}

/**
 * Loads modular project-model part documents declared by an index.
 *
 * @param {object | null | undefined} indexDocument - Parsed index document.
 * @param {string} indexPath - Repository-relative index file path.
 * @param {string} propertyName - Part declaration property name.
 * @param {string} kind - Human-readable part kind.
 * @returns {{ kind: string, indexPath: string, areaId: string | undefined, path: string | undefined, document: object | null }[]} Loaded part metadata.
 */
function loadDeclaredProjectModelParts(indexDocument, indexPath, propertyName, kind) {
  return declaredPartEntries(indexDocument, propertyName).map((part, index) => {
    const areaId = part?.area_id;
    const partPath = part?.path;
    const location = `${indexPath}.${propertyName}[${index}]`;

    if (typeof partPath !== "string" || partPath.trim().length === 0) {
      errors.push(`${location} must declare a non-empty path.`);
      return { kind, indexPath, areaId, path: partPath, document: null };
    }

    return { kind, indexPath, areaId, path: partPath, document: readYaml(partPath) };
  });
}


/**
 * Returns a shallow object copy with selected nested ID fields canonicalized.
 *
 * @param {object} value - Object to copy.
 * @param {string | undefined} areaId - Owning project-model area.
 * @returns {object} Copied object with canonical ID when present.
 */
function canonicalizeOwnedId(value, areaId) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return {
    ...value,
    id: canonicalizeProjectModelId(areaId, value.id)
  };
}

/**
 * Canonicalizes an extracted requirements part for semantic aggregation.
 *
 * Part files keep local IDs for authoring and schema validation. The semantic
 * aggregate uses `<area_id>:<local_id>` so local sequences can restart across
 * project-model areas without ID collisions.
 *
 * @param {{ areaId: string | undefined, document: object | null }} part - Loaded requirements part.
 * @returns {object[]} Canonical requirement records.
 */
function canonicalRequirementsFromPart(part) {
  const areaId = part.areaId;
  const document = part.document;
  const macroLocalIds = idSet(asArray(document?.macro_requirements));

  return asArray(document?.requirements).map((requirement) => {
    const localRequirementId = requirement?.id;
    const canonicalRequirement = {
      ...requirement,
      id: canonicalizeProjectModelId(areaId, requirement?.id),
      macro_requirement_id: macroLocalIds.has(requirement?.macro_requirement_id)
        ? canonicalizeProjectModelId(areaId, requirement?.macro_requirement_id)
        : requirement?.macro_requirement_id,
      preconditions: asArray(requirement?.preconditions).map((entry) => canonicalizeOwnedId(entry, areaId)),
      main_flow: asArray(requirement?.main_flow).map((entry) => canonicalizeOwnedId(entry, areaId)),
      alternative_flows: asArray(requirement?.alternative_flows).map((entry) => ({
        ...canonicalizeOwnedId(entry, areaId),
        steps: asArray(entry?.steps).map((step) => canonicalizeOwnedId(step, areaId))
      })),
      postconditions: asArray(requirement?.postconditions).map((entry) => canonicalizeOwnedId(entry, areaId)),
      acceptance_criteria: asArray(requirement?.acceptance_criteria).map((entry) => canonicalizeOwnedId(entry, areaId))
    };

    if (!LOCAL_REQUIREMENT_ID_PATTERN.test(localRequirementId ?? "")) {
      errors.push(`Requirement part ${part.path} contains invalid local requirement id ${localRequirementId ?? "<missing>"}`);
    }

    return canonicalRequirement;
  });
}

/**
 * Canonicalizes macro requirements declared inside an extracted requirements part.
 *
 * @param {{ areaId: string | undefined, document: object | null }} part - Loaded requirements part.
 * @returns {object[]} Canonical macro requirement records.
 */
function canonicalMacroRequirementsFromPart(part) {
  return asArray(part.document?.macro_requirements).map((macroRequirement) => ({
    ...macroRequirement,
    id: canonicalizeProjectModelId(part.areaId, macroRequirement?.id)
  }));
}

/**
 * Canonicalizes decisions declared inside an extracted decisions part.
 *
 * @param {{ areaId: string | undefined, document: object | null }} part - Loaded decisions part.
 * @returns {object[]} Canonical decision records.
 */
function canonicalDecisionsFromPart(part) {
  return asArray(part.document?.decisions).map((decision) => {
    const localDecisionId = decision?.id;
    if (!LOCAL_DECISION_ID_PATTERN.test(localDecisionId ?? "")) {
      errors.push(`Decision part ${part.path} contains invalid local decision id ${localDecisionId ?? "<missing>"}`);
    }

    return {
      ...decision,
      id: canonicalizeProjectModelId(part.areaId, decision?.id)
    };
  });
}

/**
 * Adds a local modular ID to a per-area index and reports duplicates inside the
 * owning part.
 *
 * @param {Map<string, Set<string>>} idsByArea - Area to local IDs.
 * @param {Map<string, string[]>} locationsByKey - Canonical area/local key to locations.
 * @param {string | undefined} areaId - Owning area.
 * @param {unknown} localId - Part-local ID.
 * @param {string} location - Human-readable local ID location.
 * @returns {void}
 */
function addLocalModularId(idsByArea, locationsByKey, areaId, localId, location) {
  if (typeof areaId !== "string" || typeof localId !== "string") {
    return;
  }

  const ids = idsByArea.get(areaId) ?? new Set();
  ids.add(localId);
  idsByArea.set(areaId, ids);

  const key = `${areaId}:${localId}`;
  const locations = locationsByKey.get(key) ?? [];
  locations.push(location);
  locationsByKey.set(key, locations);
}

/**
 * Builds local requirement and decision ID indexes from modular part files.
 *
 * @param {object[]} parts - Loaded project-model parts.
 * @returns {{ requirementsByArea: Map<string, Set<string>>, decisionsByArea: Map<string, Set<string>>, locationsByKey: Map<string, string[]> }} Local ID indexes.
 */
function modularLocalIdIndexes(parts) {
  const requirementsByArea = new Map();
  const decisionsByArea = new Map();
  const locationsByKey = new Map();

  for (const part of parts) {
    if (part.kind === "requirements") {
      for (const requirement of asArray(part.document?.requirements)) {
        addLocalModularId(requirementsByArea, locationsByKey, part.areaId, requirement?.id, `${part.path}.requirements.${requirement?.id ?? "<missing>"}`);
      }
    }

    if (part.kind === "decisions") {
      for (const decision of asArray(part.document?.decisions)) {
        addLocalModularId(decisionsByArea, locationsByKey, part.areaId, decision?.id, `${part.path}.decisions.${decision?.id ?? "<missing>"}`);
      }
    }
  }

  return { requirementsByArea, decisionsByArea, locationsByKey };
}

/**
 * Validates local modular ID uniqueness inside the aggregate part model.
 *
 * @param {object[]} parts - Loaded project-model parts.
 * @returns {{ requirementsByArea: Map<string, Set<string>>, decisionsByArea: Map<string, Set<string>> }} Local ID indexes.
 */
function validateModularLocalIds(parts) {
  const { requirementsByArea, decisionsByArea, locationsByKey } = modularLocalIdIndexes(parts);

  for (const [key, locations] of locationsByKey.entries()) {
    if (locations.length > 1) {
      errors.push(`Duplicate local modular id ${key} at: ${locations.join(", ")}`);
    }
  }

  return { requirementsByArea, decisionsByArea };
}

/**
 * Rejects ambiguous local-only graph references for modular entities.
 *
 * Graph parts are outside the owning requirements/decisions part, so references
 * to modular requirements and decisions must use canonical `<area_id>:<local_id>`
 * IDs. Local-only references are not supported as aliases.
 *
 * @param {object[]} parts - Loaded project-model parts.
 * @param {{ requirementsByArea: Map<string, Set<string>>, decisionsByArea: Map<string, Set<string>> }} localIds - Local ID indexes.
 * @returns {void}
 */
function validateModularGraphReferences(parts, localIds) {
  for (const part of parts.filter((candidate) => candidate.kind === "graph")) {
    const areaId = part.areaId;
    const localRequirements = localIds.requirementsByArea.get(areaId) ?? new Set();
    const localDecisions = localIds.decisionsByArea.get(areaId) ?? new Set();

    for (const [index, triple] of asArray(part.document?.triples).entries()) {
      for (const side of ["subject", "object"]) {
        const entity = triple?.[side];
        const location = `${part.path}.triples[${index}].${side}`;

        checkNoMigratedSchemaValidationLegacyId(entity?.id, entity?.type, location);

        if (entity?.type === "Requirement" && localRequirements.has(entity?.id)) {
          errors.push(`${location} references local modular requirement id ${entity.id}; must use canonical modular id ${areaId}:${entity.id}`);
        }

        if (entity?.type === "Decision" && localDecisions.has(entity?.id)) {
          errors.push(`${location} references local modular decision id ${entity.id}; must use canonical modular id ${areaId}:${entity.id}`);
        }
      }
    }
  }
}

/**
 * Rejects legacy IDs removed by schema-validation canonicalization anywhere in
 * the aggregate graph. The migration intentionally does not keep aliases.
 *
 * @param {object} indexes - Entity indexes.
 * @returns {void}
 */
function validateNoMigratedSchemaValidationLegacyReferences(indexes) {
  for (const [index, triple] of indexes.triples.entries()) {
    checkNoMigratedSchemaValidationLegacyId(triple?.subject?.id, triple?.subject?.type, `triple[${index}].subject`);
    checkNoMigratedSchemaValidationLegacyId(triple?.object?.id, triple?.object?.type, `triple[${index}].object`);
  }
}

/**
 * Builds an aggregate project model from root registries and modular part files.
 *
 * Root files remain the loading boundary. Declared part files are appended to
 * the logical model before semantic validation so validators see one combined
 * requirements, decisions, and graph model.
 *
 * @param {object} governanceRoot - Parsed governance registry.
 * @param {object} requirementsRoot - Parsed requirements registry.
 * @param {object} matrixRoot - Parsed graph matrix.
 * @returns {{ governance: object, requirements: object, matrix: object, parts: object[], partDocuments: Map<string, object> }} Aggregate model and loaded part metadata.
 */
function buildAggregateProjectModel(governanceRoot, requirementsRoot, matrixRoot) {
  const requirementParts = loadDeclaredProjectModelParts(requirementsRoot, MODEL_FILES.requirements, "parts", "requirements");
  const decisionParts = loadDeclaredProjectModelParts(governanceRoot, MODEL_FILES.governance, "decision_parts", "decisions");
  const graphParts = loadDeclaredProjectModelParts(matrixRoot, MODEL_FILES.matrix, "parts", "graph");

  const partDocuments = new Map();
  for (const part of [...requirementParts, ...decisionParts, ...graphParts]) {
    if (part.path && part.document) {
      partDocuments.set(part.path, part.document);
    }
  }

  return {
    governance: {
      ...governanceRoot,
      decisions: [
        ...asArray(governanceRoot.decisions),
        ...decisionParts.flatMap((part) => canonicalDecisionsFromPart(part))
      ]
    },
    requirements: {
      ...requirementsRoot,
      macro_requirements: [
        ...asArray(requirementsRoot.macro_requirements),
        ...requirementParts.flatMap((part) => canonicalMacroRequirementsFromPart(part))
      ],
      requirements: [
        ...asArray(requirementsRoot.requirements),
        ...requirementParts.flatMap((part) => canonicalRequirementsFromPart(part))
      ]
    },
    matrix: {
      ...matrixRoot,
      nodes: [
        ...asArray(matrixRoot.nodes),
        ...graphParts.flatMap((part) => asArray(part.document?.nodes))
      ],
      triples: [
        ...asArray(matrixRoot.triples),
        ...graphParts.flatMap((part) => asArray(part.document?.triples))
      ]
    },
    parts: [...requirementParts, ...decisionParts, ...graphParts],
    partDocuments
  };
}

/**
 * Validates modular part declarations against governed area and path rules.
 *
 * @param {object} indexes - Aggregate project-model indexes.
 * @param {object[]} parts - Loaded part metadata.
 * @returns {void}
 */
function validateProjectModelParts(indexes, parts) {
  const areaEntries = indexes.taxonomyEntries.get(PROJECT_MODEL_AREAS_TAXONOMY) ?? [];
  const areaIds = idSet(areaEntries);
  const seenPaths = new Map();
  const pathRules = {
    requirements: { prefix: "docs/reference/project-model/requirements/", suffix: ".requirements.yml" },
    decisions: { prefix: "docs/reference/project-model/decisions/", suffix: ".decisions.yml" },
    graph: { prefix: "docs/reference/project-model/graph/", suffix: ".graph.yml" }
  };

  for (const part of parts) {
    const pathValue = part.path;
    const areaId = part.areaId;
    const location = `${part.indexPath} ${part.kind} part ${pathValue ?? "<missing>"}`;

    if (typeof areaId !== "string" || !PROJECT_MODEL_AREA_ID_PATTERN.test(areaId)) {
      errors.push(`${location} declares invalid area_id ${areaId ?? "<missing>"}`);
    } else if (!areaIds.has(areaId)) {
      errors.push(`${location} references unknown project_model_areas value ${areaId}`);
    }

    if (typeof pathValue !== "string" || pathValue.trim().length === 0) {
      continue;
    }

    const previousLocations = seenPaths.get(pathValue) ?? [];
    previousLocations.push(location);
    seenPaths.set(pathValue, previousLocations);

    const rule = pathRules[part.kind];
    if (rule && (!pathValue.startsWith(rule.prefix) || !pathValue.endsWith(rule.suffix))) {
      errors.push(`${location} must use path pattern ${rule.prefix}*${rule.suffix}`);
    }

    if (!isFile(pathValue)) {
      errors.push(`${location} references missing part file ${pathValue}`);
    }

    const documentAreaId = part.document?.part?.area_id;
    if (documentAreaId !== areaId) {
      errors.push(`${location} area_id ${areaId ?? "<missing>"} does not match part.part.area_id ${documentAreaId ?? "<missing>"}`);
    }
  }

  for (const [partPath, locations] of seenPaths.entries()) {
    if (locations.length > 1) {
      errors.push(`Duplicate modular part path ${partPath} declared at: ${locations.join(", ")}`);
    }
  }
}

const governance = readYaml(MODEL_FILES.governance);
const requirements = readYaml(MODEL_FILES.requirements);
const matrix = readYaml(MODEL_FILES.matrix);
const governanceRegistrySchema = readJson(MODEL_FILES.governanceRegistrySchema);
const requirementsRegistrySchema = readJson(MODEL_FILES.requirementsRegistrySchema);
const graphMatrixSchema = readJson(MODEL_FILES.graphMatrixSchema);
const requirementsPartSchema = readJson(MODEL_FILES.requirementsPartSchema);
const graphPartSchema = readJson(MODEL_FILES.graphPartSchema);
const decisionsPartSchema = readJson(MODEL_FILES.decisionsPartSchema);
const packageJson = readJson(MODEL_FILES.packageJson);

if (
  governance &&
  requirements &&
  matrix &&
  governanceRegistrySchema &&
  requirementsRegistrySchema &&
  graphMatrixSchema &&
  requirementsPartSchema &&
  graphPartSchema &&
  decisionsPartSchema &&
  packageJson
) {
  const aggregate = buildAggregateProjectModel(governance, requirements, matrix);
  const indexes = buildIndexes(aggregate.governance, aggregate.requirements, aggregate.matrix);
  validateTaxonomies(indexes);
  validateProjectModelAreasTaxonomy(indexes);
  validateProjectModelParts(indexes, aggregate.parts);
  const modularLocalIds = validateModularLocalIds(aggregate.parts);
  validateModularGraphReferences(aggregate.parts, modularLocalIds);
  validateNoMigratedSchemaValidationLegacyReferences(indexes);
  validateIds(indexes);
  validateRegistryReferences(indexes);
  validateTriples(indexes);
  validatePackageScripts(indexes, packageJson);
  const baselineDocuments = new Map([
    [MODEL_FILES.governance, governance],
    [MODEL_FILES.requirements, requirements],
    [MODEL_FILES.matrix, matrix],
    [MODEL_FILES.governanceRegistrySchema, governanceRegistrySchema],
    [MODEL_FILES.requirementsRegistrySchema, requirementsRegistrySchema],
    [MODEL_FILES.graphMatrixSchema, graphMatrixSchema],
    [MODEL_FILES.requirementsPartSchema, requirementsPartSchema],
    [MODEL_FILES.graphPartSchema, graphPartSchema],
    [MODEL_FILES.decisionsPartSchema, decisionsPartSchema],
    ...aggregate.partDocuments.entries()
  ]);
  const baselineArtifactPaths = [...GOVERNED_BASELINE_ARTIFACTS, ...aggregate.partDocuments.keys()];
  validateBidirectionalBaselineArtifactTraceability(indexes, baselineDocuments, baselineArtifactPaths);
  validateBidirectionalSchemaApplicationTraceability(indexes, baselineDocuments);
  validateBidirectionalSourceTraceability(indexes);
}

if (errors.length > 0) {
  console.error("Project model check failed.");
  console.error("");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  console.error("Fix the project model, matrix, or source traceability comments.");
  process.exit(1);
}

console.log("Project model check passed.");
