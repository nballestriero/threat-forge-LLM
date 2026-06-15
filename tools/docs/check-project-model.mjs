#!/usr/bin/env node
/**
 * @file Project model consistency and bidirectional traceability validator.
 *
 * Validates the compact governed project model, including controlled
 * taxonomies, governed ID uniqueness, ID format patterns, requirement
 * references, SPO predicate compatibility, command/gate/tool relationships,
 * and file-level bidirectional traceability between graph.matrix.yml and
 * source-file JSDoc comments.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - REQ-0005
 * - REQ-0006
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
  packageJson: "package.json"
};

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
    requirements: new Set(jsdoc.match(/\bREQ-\d{4}\b/g) ?? []),
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
    checkTaxonomyValue(indexes.taxonomies, "priority", macroRequirement?.priority, `macro requirement ${macroRequirement?.id}`);
  }

  for (const requirement of indexes.atomicRequirements) {
    checkTaxonomyValue(indexes.taxonomies, "requirement_status", requirement?.status, `requirement ${requirement?.id}`);
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
  for (const decision of indexes.decisions) checkIdPattern(decision?.id, /^DEC-\d{4}$/, `decision ${decision?.id}`);
  for (const bodyProfile of indexes.bodyProfiles) checkIdPattern(bodyProfile?.id, /^BODY-[A-Z0-9-]+$/, `body profile ${bodyProfile?.id}`);
  for (const nodeType of indexes.nodeTypes) checkIdPattern(nodeType?.id, /^[A-Z][A-Za-z0-9]*$/, `node type ${nodeType?.id}`);
  for (const predicate of indexes.predicates) checkIdPattern(predicate?.id, /^[A-Z][A-Z0-9_]+$/, `predicate ${predicate?.id}`);
  for (const macroRequirement of indexes.macroRequirements) checkIdPattern(macroRequirement?.id, /^MR-\d{4}$/, `macro requirement ${macroRequirement?.id}`);

  for (const requirement of indexes.atomicRequirements) {
    const requirementId = requirement?.id;
    checkIdPattern(requirementId, /^REQ-\d{4}$/, `requirement ${requirementId}`);

    for (const entry of asArray(requirement?.preconditions)) {
      checkIdPattern(entry?.id, new RegExp(`^PRE-${requirementId}-\\d{3}$`), `${requirementId}.preconditions`);
    }

    for (const entry of asArray(requirement?.main_flow)) {
      checkIdPattern(entry?.id, new RegExp(`^FLOW-${requirementId}-\\d{3}$`), `${requirementId}.main_flow`);
    }

    for (const entry of asArray(requirement?.alternative_flows)) {
      checkIdPattern(entry?.id, new RegExp(`^ALT-${requirementId}-\\d{3}$`), `${requirementId}.alternative_flows`);

      for (const step of asArray(entry?.steps)) {
        checkIdPattern(step?.id, new RegExp(`^FLOW-${requirementId}-ALT-\\d{3}$`), `${requirementId}.${entry?.id}.steps`);
      }
    }

    for (const entry of asArray(requirement?.postconditions)) {
      checkIdPattern(entry?.id, new RegExp(`^POST-${requirementId}-\\d{3}$`), `${requirementId}.postconditions`);
    }

    for (const entry of asArray(requirement?.acceptance_criteria)) {
      checkIdPattern(entry?.id, new RegExp(`^AC-${requirementId}-\\d{3}$`), `${requirementId}.acceptance_criteria`);
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

  const filesToInspect = new Set([...requirementByFile.keys(), ...toolByFile.keys()]);

  for (const file of filesToInspect) {
    const jsdoc = extractFileJSDoc(readText(file));
    if (!jsdoc) {
      errors.push(`Source file ${file} is missing a file-level JSDoc block`);
      continue;
    }

    checkJSDocCompleteness(file, jsdoc);
    const refs = extractTraceabilityReferences(jsdoc);

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

const governance = readYaml(MODEL_FILES.governance);
const requirements = readYaml(MODEL_FILES.requirements);
const matrix = readYaml(MODEL_FILES.matrix);
const packageJson = readJson(MODEL_FILES.packageJson);

if (governance && requirements && matrix && packageJson) {
  const indexes = buildIndexes(governance, requirements, matrix);
  validateTaxonomies(indexes);
  validateIds(indexes);
  validateRegistryReferences(indexes);
  validateTriples(indexes);
  validatePackageScripts(indexes, packageJson);
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
