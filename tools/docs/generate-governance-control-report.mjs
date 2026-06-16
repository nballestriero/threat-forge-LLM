#!/usr/bin/env node
/**
 * @file Governance Control Report builder.
 *
 * Builds the machine-readable Governance Control Report from governed
 * repository state. The report is the shared data source for the future static
 * governance control page, protected admin UI, backend APIs, CLI tools, and LLM
 * consumers.
 *
 * Canonical references:
 * - docs/reference/contracts/governance-control-report.schema.json
 * - docs/reference/contracts/governance-control-report.contract.md
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - governance-control:REQ-0012
 * - governance-control:REQ-0016
 * - governance-control:REQ-0017
 * - governance-control:REQ-0019
 *
 * Related decisions:
 * - governance-control:DEC-0010
 * - source-traceability:DEC-0007
 *
 * Supports capabilities:
 * - CAP-GOVERNANCE-CONTROL
 *
 * Provides graph nodes:
 * - TOOL-GOVERNANCE-CONTROL-REPORT-BUILDER
 *
 * Related commands:
 * - CMD-GOVERNANCE-CONTROL-REPORT-CHECK
 * - CMD-GOVERNANCE-CONTROL-REPORT
 * - CMD-GOVERNANCE-CONTROL-PAGE-CHECK
 * - CMD-GOVERNANCE-CONTROL-PAGE
 *
 * Failure behavior:
 * - Prints all report generation or validation errors.
 * - Exits with status code 1 when required inputs cannot be read or the report
 *   violates the governed schema baseline.
 * - Exits with status code 0 when the report is valid.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const checkMode = process.argv.includes("--check");
const outputArgIndex = process.argv.indexOf("--output");
const outputOverride = outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null;

const MODEL_FILES = {
  governance: "docs/reference/project-model/governance.registry.yml",
  requirements: "docs/reference/project-model/requirements.registry.yml",
  matrix: "docs/reference/project-model/graph.matrix.yml"
};

const CONTRACT_FILES = {
  governanceControlReportSchema: "docs/reference/contracts/governance-control-report.schema.json"
};

const outputPath = outputOverride ?? "artifacts/governance-control/report.json";
const errors = [];
const outputExcerptLength = 1200;

/**
 * Resolves a repository-relative path.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function absolutePath(relativePath) {
  return path.join(root, relativePath);
}

/**
 * Reads a UTF-8 file.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {string | null} File content or null.
 */
function readText(relativePath) {
  try {
    return fs.readFileSync(absolutePath(relativePath), "utf8");
  } catch (error) {
    errors.push(`Cannot read ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Reads a JSON file.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {unknown | null} Parsed JSON or null.
 */
function readJson(relativePath) {
  const content = readText(relativePath);
  if (content === null) return null;

  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`Cannot parse JSON ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Reads a YAML file.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {unknown | null} Parsed YAML or null.
 */
function readYaml(relativePath) {
  const content = readText(relativePath);
  if (content === null) return null;

  try {
    return parseYaml(content);
  } catch (error) {
    errors.push(`Cannot parse YAML ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Runs a git command and returns trimmed output.
 *
 * @param {string[]} args - Git command arguments.
 * @returns {string | null} Git output or null.
 */
function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Returns repository metadata for the report.
 *
 * @param {object} packageJson - Parsed package.json.
 * @returns {object} Repository metadata.
 */
function buildRepository(packageJson) {
  const status = git(["status", "--porcelain"]);
  return {
    name: packageJson?.name ?? "threat-forge-LLM",
    branch: git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "unknown",
    head: git(["rev-parse", "--short", "HEAD"]) ?? "unknown",
    working_tree: status === null ? "unknown" : status.length === 0 ? "clean" : "dirty"
  };
}

/**
 * Extracts Markdown headings.
 *
 * @param {string} content - Markdown content.
 * @returns {string[]} Heading texts.
 */
function extractHeadings(content) {
  return content
    .split(/\r?\n/)
    .map((line) => /^(#{1,6})\s+(.+?)\s*$/.exec(line))
    .filter(Boolean)
    .map((match) => match[2].replace(/\s+#+$/, "").trim());
}

/**
 * Extracts Markdown links.
 *
 * @param {string} content - Markdown content.
 * @returns {string[]} Link targets.
 */
function extractLinks(content) {
  const links = [];
  const pattern = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    links.push(match[1]);
  }
  return links;
}

/**
 * Walks a directory recursively.
 *
 * @param {string} relativeDir - Repository-relative directory.
 * @returns {string[]} Repository-relative file paths.
 */
function walkFiles(relativeDir) {
  const start = absolutePath(relativeDir);
  if (!fs.existsSync(start)) {
    return [];
  }

  const result = [];
  const stack = [relativeDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(absolutePath(current), { withFileTypes: true });

    for (const entry of entries) {
      const child = path.join(current, entry.name).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        stack.push(child);
      } else {
        result.push(child);
      }
    }
  }

  return result.sort();
}

/**
 * Infers a body profile from a documentation path and known headings.
 *
 * @param {string} relativePath - Document path.
 * @param {string[]} headings - Heading texts.
 * @returns {string | undefined} Body profile id.
 */
function inferBodyProfile(relativePath, headings) {
  if (relativePath.includes("/tutorials/")) return "BODY-TUTORIAL";
  if (relativePath.includes("/how-to/")) return "BODY-HOW-TO";
  if (relativePath.includes("/reference/")) return "BODY-REFERENCE";
  if (relativePath.includes("/explanation/decisions/")) return "BODY-DECISION";
  if (relativePath.includes("/explanation/")) return "BODY-EXPLANATION";
  if (headings.includes("Purpose") && headings.includes("Schema") && headings.includes("Rules")) return "BODY-REFERENCE";
  return undefined;
}

/**
 * Builds document records for Markdown and governed contract/data files.
 *
 * @returns {object[]} Document records.
 */
function buildDocuments() {
  const files = walkFiles("docs").filter((file) => /\.(md|ya?ml|json)$/u.test(file));

  return files.map((file) => {
    const content = readText(file) ?? "";
    const isMarkdown = file.endsWith(".md");
    const headings = isMarkdown ? extractHeadings(content) : [];
    const title = headings[0] ?? path.basename(file);

    return {
      id: file,
      type: "Document",
      title,
      path: file,
      body_profile: isMarkdown ? inferBodyProfile(file, headings) : undefined,
      headings,
      links_out: isMarkdown ? extractLinks(content) : [],
      links_in: [],
      source: {
        path: file
      }
    };
  });
}

/**
 * Indexes graph triples by subject id and predicate.
 *
 * @param {unknown[]} triples - Graph triples.
 * @returns {Map<string, Map<string, string[]>>} Link index.
 */
function buildLinkIndex(triples) {
  const links = new Map();

  for (const triple of triples ?? []) {
    const subjectId = triple?.subject?.id;
    const predicate = triple?.predicate;
    const objectId = triple?.object?.id;

    if (!subjectId || !predicate || !objectId) continue;

    if (!links.has(subjectId)) {
      links.set(subjectId, new Map());
    }

    const subjectLinks = links.get(subjectId);
    if (!subjectLinks.has(predicate)) {
      subjectLinks.set(predicate, []);
    }

    subjectLinks.get(predicate).push(objectId);
  }

  return links;
}

/**
 * Returns relationship links for an entity id.
 *
 * @param {Map<string, Map<string, string[]>>} linkIndex - Link index.
 * @param {string} id - Entity id.
 * @returns {object} Predicate-to-target list object.
 */
function linksFor(linkIndex, id) {
  const links = {};
  const entry = linkIndex.get(id);
  if (!entry) return links;

  for (const [predicate, targets] of entry.entries()) {
    links[predicate.toLowerCase()] = targets;
  }

  return links;
}

/**
 * Builds requirement records.
 *
 * @param {object} requirementsRegistry - Parsed requirements registry.
 * @param {Map<string, Map<string, string[]>>} linkIndex - Link index.
 * @returns {object[]} Requirement records.
 */
function buildRequirements(requirementsRegistry, linkIndex) {
  return (requirementsRegistry?.requirements ?? []).map((requirement) => ({
    id: requirement.id,
    type: "Requirement",
    title: requirement.title,
    description: requirement.statement,
    status: requirement.status,
    implementation_status: requirement.implementation_status,
    macro_requirement_id: requirement.macro_requirement_id,
    capability_id: requirement.capability_id,
    priority: requirement.priority,
    verification_method: requirement.verification?.method,
    links: linksFor(linkIndex, requirement.id),
    source: {
      path: MODEL_FILES.requirements
    }
  }));
}

/**
 * Builds simple entity records.
 *
 * @param {unknown[]} entries - Registry entries.
 * @param {string} type - Entity type.
 * @param {string} sourcePath - Source path.
 * @returns {object[]} Entity records.
 */
function buildEntities(entries, type, sourcePath) {
  return (entries ?? []).map((entry) => ({
    id: entry.id,
    type,
    title: entry.title ?? entry.id,
    description: entry.description ?? entry.statement,
    status: entry.status,
    source: {
      path: sourcePath
    }
  }));
}

/**
 * Builds command records from graph nodes.
 *
 * @param {unknown[]} nodes - Graph matrix nodes.
 * @returns {object[]} Command records.
 */
function buildCommands(nodes) {
  return (nodes ?? [])
    .filter((node) => node?.type === "Command")
    .map((node) => ({
      id: node.id,
      type: "Command",
      title: node.id,
      description: node.description,
      command: node.command,
      source: {
        path: MODEL_FILES.matrix
      }
    }));
}

/**
 * Builds tool records from graph nodes.
 *
 * @param {unknown[]} nodes - Graph matrix nodes.
 * @returns {object[]} Tool records.
 */
function buildTools(nodes) {
  return (nodes ?? [])
    .filter((node) => node?.type === "ValidationTool")
    .map((node) => ({
      id: node.id,
      type: "ValidationTool",
      title: node.id,
      description: node.description,
      path: node.path,
      source: {
        path: MODEL_FILES.matrix
      }
    }));
}

/**
 * Builds gate records from graph nodes.
 *
 * @param {unknown[]} nodes - Graph matrix nodes.
 * @returns {object[]} Gate records.
 */
function buildGates(nodes) {
  return (nodes ?? [])
    .filter((node) => node?.type === "Gate")
    .map((node) => ({
      id: node.id,
      type: "Gate",
      title: node.id,
      description: node.description,
      source: {
        path: MODEL_FILES.matrix
      }
    }));
}

/**
 * Builds graph node records from graph matrix entities and report entities.
 *
 * @param {unknown[]} matrixNodes - Graph matrix nodes.
 * @param {object[]} entities - Report entities.
 * @returns {object[]} Graph nodes.
 */
function buildKnowledgeNodes(matrixNodes, entities) {
  const nodes = new Map();

  for (const entity of entities) {
    if (!entity?.id || !entity?.type) continue;
    nodes.set(entity.id, {
      id: entity.id,
      type: entity.type,
      label: entity.title ?? entity.id,
      source: entity.source
    });
  }

  for (const node of matrixNodes ?? []) {
    if (!node?.id || !node?.type) continue;
    nodes.set(node.id, {
      id: node.id,
      type: node.type,
      label: node.title ?? node.id,
      source: {
        path: MODEL_FILES.matrix
      }
    });
  }

  return [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Builds graph edge records from matrix triples.
 *
 * @param {unknown[]} triples - Graph triples.
 * @returns {object[]} Graph edges.
 */
function buildKnowledgeEdges(triples) {
  return (triples ?? []).map((triple) => ({
    source: triple.subject.id,
    source_type: triple.subject.type,
    predicate: triple.predicate,
    target: triple.object.id,
    target_type: triple.object.type,
    evidence: [
      {
        path: MODEL_FILES.matrix
      }
    ]
  }));
}

/**
 * Builds documentation graph from document records.
 *
 * @param {object[]} documents - Document records.
 * @returns {object} Documentation graph.
 */
function buildDocumentationGraph(documents) {
  const nodes = documents.map((document) => ({
    id: document.id,
    type: "Document",
    label: document.title ?? document.id,
    source: {
      path: document.path
    }
  }));

  const edges = [];

  for (const document of documents) {
    if (document.body_profile) {
      edges.push({
        source: document.id,
        predicate: "USES_BODY_PROFILE",
        target: document.body_profile,
        evidence: [{ path: document.path }]
      });
    }

    for (const link of document.links_out ?? []) {
      edges.push({
        source: document.id,
        predicate: "LINKS_TO",
        target: link,
        evidence: [{ path: document.path }]
      });
    }
  }

  return { nodes, edges };
}

/**
 * Builds a file relationship graph from SPO triples involving file-like nodes.
 *
 * @param {unknown[]} triples - Graph triples.
 * @returns {object} File relationship graph.
 */
function buildFileRelationshipGraph(triples) {
  const fileTypes = new Set(["Document", "SourceFile", "ConfigFile"]);
  const nodes = new Map();
  const edges = [];

  for (const triple of triples ?? []) {
    const subjectIsFile = fileTypes.has(triple?.subject?.type);
    const objectIsFile = fileTypes.has(triple?.object?.type);

    if (!subjectIsFile && !objectIsFile) continue;

    if (subjectIsFile) {
      nodes.set(triple.subject.id, {
        id: triple.subject.id,
        type: triple.subject.type,
        label: triple.subject.id,
        source: { path: MODEL_FILES.matrix }
      });
    }

    if (objectIsFile) {
      nodes.set(triple.object.id, {
        id: triple.object.id,
        type: triple.object.type,
        label: triple.object.id,
        source: { path: MODEL_FILES.matrix }
      });
    }

    edges.push({
      source: triple.subject.id,
      source_type: triple.subject.type,
      predicate: triple.predicate,
      target: triple.object.id,
      target_type: triple.object.type,
      evidence: [{ path: MODEL_FILES.matrix }]
    });
  }

  return {
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges
  };
}

/**
 * Truncates command output for report embedding.
 *
 * @param {unknown} output - Command output.
 * @returns {string} Output excerpt.
 */
function excerpt(output) {
  const text = String(output ?? "").trim();
  if (text.length <= outputExcerptLength) {
    return text;
  }

  return `${text.slice(0, outputExcerptLength)}…`;
}

/**
 * Executes one leaf validation tool directly with the current Node runtime.
 *
 * The report keeps the canonical npm command as the public command field, but
 * executes the underlying Node tool file directly. This avoids platform-specific
 * npm shim behavior and avoids any aggregate command recursion.
 *
 * @param {{ id: string, label: string, script: string, toolPath: string }} check - Leaf check definition.
 * @returns {object} Check record.
 */
function runLeafCheck(check) {
  const start = Date.now();

  try {
    const stdout = execFileSync(process.execPath, [absolutePath(check.toolPath)], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    return {
      id: check.id,
      label: check.label,
      status: "pass",
      command: `npm run ${check.script}`,
      exit_code: 0,
      duration_ms: Date.now() - start,
      stdout_excerpt: excerpt(stdout),
      stderr_excerpt: "",
      summary: `Leaf validation tool passed: ${check.toolPath}`
    };
  } catch (error) {
    return {
      id: check.id,
      label: check.label,
      status: "fail",
      command: `npm run ${check.script}`,
      exit_code: typeof error.status === "number" ? error.status : 1,
      duration_ms: Date.now() - start,
      stdout_excerpt: excerpt(error.stdout),
      stderr_excerpt: excerpt(error.stderr || error.message),
      summary: `Leaf validation tool failed: ${check.toolPath}`
    };
  }
}

/**
 * Builds check records by executing approved leaf validation commands.
 *
 * The report builder intentionally avoids aggregate commands such as
 * docs:check, docs:check:control-report, and docs:check:control-page because
 * those commands can recursively invoke report generation.
 *
 * @returns {object[]} Check records.
 */
function buildChecks() {
  const leafChecks = [
    {
      id: "docs:check:structure",
      label: "Documentation structure",
      script: "docs:check:structure",
      toolPath: "tools/docs/check-docs-structure.mjs"
    },
    {
      id: "docs:check:model",
      label: "Project model",
      script: "docs:check:model",
      toolPath: "tools/docs/check-project-model.mjs"
    },
    {
      id: "docs:check:format",
      label: "Documentation format",
      script: "docs:check:format",
      toolPath: "tools/docs/check-docs-format.mjs"
    },
    {
      id: "docs:test:negative",
      label: "Validator negative fixtures",
      script: "docs:test:negative",
      toolPath: "tools/docs/check-validator-negative-fixtures.mjs"
    }
  ];

  return [
    ...leafChecks.map((check) => runLeafCheck(check)),
    {
      id: "docs:check:control-report",
      label: "Governance Control Report",
      status: "pass",
      command: "npm run docs:check:control-report",
      exit_code: 0,
      duration_ms: 0,
      stdout_excerpt: "Governance Control Report was built and validated by the current command.",
      stderr_excerpt: "",
      summary: "Current report generation command passed."
    }
  ];
}

/**
 * Builds structured diagnostics.
 *
 * @param {object[]} documents - Document records.
 * @returns {object[]} Diagnostic records.
 */
function buildDiagnostics(documents) {
  return documents
    .filter((document) => document.path.endsWith(".md") && (document.headings ?? []).length === 0)
    .map((document) => ({
      severity: "warning",
      code: "DOC-NO-HEADINGS",
      message: `Markdown document ${document.path} has no headings.`,
      subject: {
        id: document.id,
        type: "Document"
      },
      evidence: [
        {
          path: document.path
        }
      ],
      suggested_action: "Add a level-1 title and body-profile headings."
    }));
}

/**
 * Builds the Governance Control Report.
 *
 * @returns {object | null} Report object or null.
 */
function buildReport() {
  const packageJson = readJson("package.json");
  const schema = readJson(CONTRACT_FILES.governanceControlReportSchema);
  const governance = readYaml(MODEL_FILES.governance);
  const requirementsRegistry = readYaml(MODEL_FILES.requirements);
  const matrix = readYaml(MODEL_FILES.matrix);

  if (!packageJson || !schema || !governance || !requirementsRegistry || !matrix) {
    return null;
  }

  const linkIndex = buildLinkIndex(matrix.triples);
  const documents = buildDocuments();
  const requirements = buildRequirements(requirementsRegistry, linkIndex);
  const decisions = buildEntities(governance.decisions, "Decision", MODEL_FILES.governance);
  const capabilities = buildEntities(governance.capabilities, "Capability", MODEL_FILES.governance);
  const commands = buildCommands(matrix.nodes);
  const tools = buildTools(matrix.nodes);
  const gates = buildGates(matrix.nodes);

  const entities = [
    ...documents,
    ...requirements,
    ...decisions,
    ...capabilities,
    ...commands,
    ...tools,
    ...gates
  ];

  return {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    repository: buildRepository(packageJson),
    checks: buildChecks(),
    documents,
    requirements,
    decisions,
    capabilities,
    commands,
    tools,
    gates,
    graphs: {
      knowledge: {
        nodes: buildKnowledgeNodes(matrix.nodes, entities),
        edges: buildKnowledgeEdges(matrix.triples)
      },
      documentation: buildDocumentationGraph(documents),
      file_relationships: buildFileRelationshipGraph(matrix.triples)
    },
    diagnostics: buildDiagnostics(documents)
  };
}

/**
 * Validates the report against the governed schema baseline.
 *
 * This intentionally avoids introducing a JSON Schema runtime dependency before
 * the project decides on runtime validation tooling. It validates the governed
 * top-level contract and key graph sections using the canonical schema file.
 *
 * @param {object} report - Generated report.
 * @param {object} schema - Parsed JSON Schema.
 * @returns {void}
 */
function validateReportAgainstSchemaBaseline(report, schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    errors.push("Governance Control Report schema must be an object.");
    return;
  }

  for (const key of schema.required ?? []) {
    if (!Object.prototype.hasOwnProperty.call(report, key)) {
      errors.push(`Report is missing required top-level key: ${key}`);
    }
  }

  const arrayKeys = [
    "checks",
    "documents",
    "requirements",
    "decisions",
    "capabilities",
    "commands",
    "tools",
    "gates",
    "diagnostics"
  ];

  for (const key of arrayKeys) {
    if (!Array.isArray(report[key])) {
      errors.push(`Report key ${key} must be an array.`);
    }
  }

  for (const check of report.checks ?? []) {
    for (const field of ["id", "status", "command", "exit_code", "duration_ms", "stdout_excerpt", "stderr_excerpt"]) {
      if (!Object.prototype.hasOwnProperty.call(check, field)) {
        errors.push(`Report check ${check.id ?? "<unknown>"} is missing field: ${field}`);
      }
    }
  }

  for (const graphKey of ["knowledge", "documentation", "file_relationships"]) {
    const graph = report.graphs?.[graphKey];
    if (!graph || typeof graph !== "object") {
      errors.push(`Report graph ${graphKey} must be an object.`);
      continue;
    }

    if (!Array.isArray(graph.nodes)) {
      errors.push(`Report graph ${graphKey}.nodes must be an array.`);
    }

    if (!Array.isArray(graph.edges)) {
      errors.push(`Report graph ${graphKey}.edges must be an array.`);
    }
  }

  if (report.schema_version !== "1.0") {
    errors.push('Report schema_version must be "1.0".');
  }
}

/**
 * Writes the report artifact.
 *
 * @param {object} report - Valid report.
 * @returns {void}
 */
function writeReport(report) {
  const target = path.isAbsolute(outputPath) ? outputPath : absolutePath(outputPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

const report = buildReport();
const schema = readJson(CONTRACT_FILES.governanceControlReportSchema);

if (report && schema) {
  validateReportAgainstSchemaBaseline(report, schema);
}

if (errors.length > 0) {
  console.error("Governance Control Report generation failed.");
  console.error("");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  console.error("Fix the governed report input or schema contract.");
  process.exit(1);
}

if (!checkMode) {
  writeReport(report);
  console.log(`Governance Control Report generated: ${outputPath}`);
} else {
  console.log("Governance Control Report check passed.");
}
