#!/usr/bin/env node
/**
 * @file Static Governance Control Page generator.
 *
 * Renders a static HTML Governance Control Page from the machine-readable
 * Governance Control Report. This file is a report consumer and must not
 * duplicate repository analysis logic that belongs to the report builder.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 * - docs/reference/contracts/governance-control-report.contract.md
 * - docs/reference/contracts/governance-control-report.schema.json
 * - docs/explanation/governance/governance-control-page.md
 *
 * Related requirements:
 * - REQ-0013
 * - REQ-0018
 *
 * Supports capabilities:
 * - CAP-GOVERNANCE-CONTROL
 *
 * Provides graph nodes:
 * - TOOL-GOVERNANCE-CONTROL-PAGE-BUILDER
 *
 * Related commands:
 * - CMD-GOVERNANCE-CONTROL-PAGE-CHECK
 * - CMD-GOVERNANCE-CONTROL-PAGE
 *
 * Failure behavior:
 * - Prints all page rendering errors.
 * - Exits with status code 1 when report generation, report parsing, or HTML
 *   validation fails.
 * - Exits with status code 0 when the static page can be rendered.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const checkMode = process.argv.includes("--check");
const reportBuilderPath = path.join(root, "tools", "docs", "generate-governance-control-report.mjs");
const reportPath = path.join(root, "artifacts", "governance-control", "report.json");
const htmlPath = path.join(root, "artifacts", "governance-control", "index.html");
const errors = [];

/**
 * Escapes user-controlled or generated text before injecting it into HTML.
 *
 * @param {unknown} value - Value to escape.
 * @returns {string} HTML-escaped string.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Runs the Governance Control Report builder and returns the report path to read.
 *
 * @returns {string | null} Absolute report path or null.
 */
function buildReportForPage() {
  const output = checkMode
    ? path.join(fs.mkdtempSync(path.join(os.tmpdir(), "threat-forge-llm-control-page-")), "report.json")
    : reportPath;

  try {
    execFileSync(process.execPath, [reportBuilderPath, "--output", output], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    return output;
  } catch (error) {
    errors.push(`Cannot generate Governance Control Report: ${(error.stdout ?? "")}${(error.stderr ?? "")}`);
    return null;
  }
}

/**
 * Reads a report JSON file.
 *
 * @param {string} absolutePath - Absolute report path.
 * @returns {object | null} Parsed report or null.
 */
function readReport(absolutePath) {
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    errors.push(`Cannot read Governance Control Report ${absolutePath}: ${error.message}`);
    return null;
  }
}

/**
 * Renders a status pill.
 *
 * @param {string} status - Status text.
 * @returns {string} HTML string.
 */
function statusPill(status) {
  const safeStatus = escapeHtml(status ?? "unknown");
  return `<span class="pill pill-${safeStatus}">${safeStatus}</span>`;
}

/**
 * Renders a simple table.
 *
 * @param {string[]} headers - Header labels.
 * @param {unknown[][]} rows - Table rows.
 * @returns {string} HTML string.
 */
function table(headers, rows) {
  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
          )
          .join("\n")}
      </tbody>
    </table>
  `;
}

/**
 * Renders graph edge rows.
 *
 * @param {object[]} edges - Graph edges.
 * @returns {unknown[][]} Rows.
 */
function edgeRows(edges) {
  return edges.slice(0, 250).map((edge) => [
    `<code>${escapeHtml(edge.source)}</code>`,
    `<strong>${escapeHtml(edge.predicate)}</strong>`,
    `<code>${escapeHtml(edge.target)}</code>`
  ]);
}

/**
 * Renders the complete static HTML page.
 *
 * @param {object} report - Governance Control Report.
 * @returns {string} HTML page.
 */
function renderHtml(report) {
  const documentRows = report.documents.map((document) => [
    `<code>${escapeHtml(document.path ?? document.id)}</code>`,
    escapeHtml(document.title ?? ""),
    escapeHtml(document.body_profile ?? ""),
    escapeHtml((document.headings ?? []).slice(0, 6).join(", "))
  ]);

  const requirementRows = report.requirements.map((requirement) => [
    `<code>${escapeHtml(requirement.id)}</code>`,
    escapeHtml(requirement.title ?? ""),
    statusPill(requirement.status),
    statusPill(requirement.implementation_status),
    escapeHtml(requirement.capability_id ?? "")
  ]);

  const checkRows = report.checks.map((check) => [
    `<code>${escapeHtml(check.id)}</code>`,
    escapeHtml(check.label ?? ""),
    statusPill(check.status),
    `<code>${escapeHtml(check.command ?? "")}</code>`
  ]);

  const diagnosticRows = report.diagnostics.map((diagnostic) => [
    statusPill(diagnostic.severity),
    `<code>${escapeHtml(diagnostic.code)}</code>`,
    escapeHtml(diagnostic.message),
    diagnostic.subject ? `<code>${escapeHtml(diagnostic.subject.id)}</code>` : ""
  ]);

  const commandRows = report.commands.map((command) => [
    `<code>${escapeHtml(command.id)}</code>`,
    `<code>${escapeHtml(command.command ?? "")}</code>`,
    escapeHtml(command.description ?? "")
  ]);

  const toolRows = report.tools.map((tool) => [
    `<code>${escapeHtml(tool.id)}</code>`,
    `<code>${escapeHtml(tool.path ?? "")}</code>`,
    escapeHtml(tool.description ?? "")
  ]);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>threat-forge-LLM Governance Control</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      color-scheme: light dark;
      --border: #9aa4b2;
      --muted: #667085;
      --bg-soft: rgba(127, 127, 127, 0.08);
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      line-height: 1.5;
    }

    header {
      padding: 2rem;
      border-bottom: 1px solid var(--border);
      background: var(--bg-soft);
    }

    main {
      padding: 1.5rem 2rem 3rem;
      display: grid;
      gap: 1.5rem;
    }

    section {
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1rem;
      overflow-x: auto;
    }

    h1, h2 {
      margin-top: 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: 0.75rem;
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.75rem;
      background: var(--bg-soft);
    }

    .card strong {
      display: block;
      font-size: 1.5rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }

    th, td {
      border-bottom: 1px solid var(--border);
      padding: 0.5rem;
      text-align: left;
      vertical-align: top;
    }

    th {
      white-space: nowrap;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.9em;
    }

    .pill {
      display: inline-block;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.1rem 0.5rem;
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .pill-pass,
    .pill-implemented,
    .pill-accepted {
      font-weight: 700;
    }

    .muted {
      color: var(--muted);
    }
  </style>
</head>
<body>
  <header>
    <h1>threat-forge-LLM Governance Control</h1>
    <p class="muted">
      Generated from Governance Control Report schema version ${escapeHtml(report.schema_version)}
      at ${escapeHtml(report.generated_at)}.
    </p>
  </header>

  <main>
    <section>
      <h2>Repository health</h2>
      <div class="summary-grid">
        <div class="card"><span>Repository</span><strong>${escapeHtml(report.repository.name)}</strong></div>
        <div class="card"><span>Branch</span><strong>${escapeHtml(report.repository.branch)}</strong></div>
        <div class="card"><span>HEAD</span><strong>${escapeHtml(report.repository.head)}</strong></div>
        <div class="card"><span>Working tree</span><strong>${escapeHtml(report.repository.working_tree)}</strong></div>
      </div>
      ${table(["Check", "Label", "Status", "Command"], checkRows)}
    </section>

    <section>
      <h2>Documentation explorer</h2>
      ${table(["Path", "Title", "Body profile", "Headings"], documentRows)}
    </section>

    <section>
      <h2>Requirements explorer</h2>
      ${table(["ID", "Title", "Status", "Implementation", "Capability"], requirementRows)}
    </section>

    <section>
      <h2>Commands</h2>
      ${table(["ID", "Command", "Description"], commandRows)}
    </section>

    <section>
      <h2>Tools</h2>
      ${table(["ID", "Path", "Description"], toolRows)}
    </section>

    <section>
      <h2>Knowledge graph edges</h2>
      ${table(["Source", "Predicate", "Target"], edgeRows(report.graphs.knowledge.edges))}
    </section>

    <section>
      <h2>Documentation graph edges</h2>
      ${table(["Source", "Predicate", "Target"], edgeRows(report.graphs.documentation.edges))}
    </section>

    <section>
      <h2>File relationship graph edges</h2>
      ${table(["Source", "Predicate", "Target"], edgeRows(report.graphs.file_relationships.edges))}
    </section>

    <section>
      <h2>Diagnostics</h2>
      ${diagnosticRows.length > 0 ? table(["Severity", "Code", "Message", "Subject"], diagnosticRows) : "<p>No diagnostics.</p>"}
    </section>
  </main>
</body>
</html>
`;
}

/**
 * Performs minimal page validation.
 *
 * @param {string} html - Rendered HTML.
 * @returns {void}
 */
function validateHtml(html) {
  const requiredFragments = [
    "Repository health",
    "Documentation explorer",
    "Requirements explorer",
    "Knowledge graph edges",
    "Documentation graph edges",
    "File relationship graph edges",
    "Diagnostics"
  ];

  for (const fragment of requiredFragments) {
    if (!html.includes(fragment)) {
      errors.push(`Rendered HTML is missing required section: ${fragment}`);
    }
  }
}

/**
 * Writes the page artifact.
 *
 * @param {string} html - Rendered HTML.
 * @returns {void}
 */
function writeHtml(html) {
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, html, "utf8");
}

const generatedReportPath = buildReportForPage();
const report = generatedReportPath ? readReport(generatedReportPath) : null;
const html = report ? renderHtml(report) : "";

if (html) {
  validateHtml(html);
}

if (errors.length > 0) {
  console.error("Governance Control Page generation failed.");
  console.error("");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("");
  console.error("Fix the report builder output or page renderer.");
  process.exit(1);
}

if (!checkMode) {
  writeHtml(html);
  console.log(`Governance Control Page generated: ${path.relative(root, htmlPath).replaceAll("\\", "/")}`);
} else {
  console.log("Governance Control Page check passed.");
}
