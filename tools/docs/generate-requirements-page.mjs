#!/usr/bin/env node
/**
 * @file Static Requirements Review Page generator.
 *
 * Renders a deterministic HTML review page from the canonical modular
 * requirements registry, governance registry, and graph parts. The page is
 * generated output under artifacts/ and is used to reason about future
 * requirement kinds, bodies, and specialization relationships without making
 * the generated page a governed source of truth.
 *
 * Canonical references:
 * - docs/reference/project-model/governance.registry.yml
 * - docs/reference/project-model/requirements.registry.yml
 * - docs/reference/project-model/graph.matrix.yml
 *
 * Related requirements:
 * - requirements-governance:REQ-0044
 *
 * Related decisions:
 * - requirements-governance:DEC-0035
 *
 * Supports capabilities:
 * - CAP-REQUIREMENTS-MANAGEMENT
 *
 * Provides graph nodes:
 * - TOOL-REQUIREMENTS-PAGE-BUILDER
 *
 * Related commands:
 * - CMD-REQUIREMENTS-PAGE-CHECK
 * - CMD-REQUIREMENTS-PAGE
 *
 * Failure behavior:
 * - Prints all requirements page generation errors.
 * - Exits with status code 1 when project-model inputs cannot be read, parsed,
 *   aggregated, or rendered.
 * - Exits with status code 0 when the static requirements page can be rendered.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { parse as parseYaml } from "yaml";

const root = process.cwd();
const checkMode = process.argv.includes("--check");
const outputArgIndex = process.argv.indexOf("--output");
const outputOverride = outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null;
const outputPath = outputOverride ?? "artifacts/requirements/index.html";
const errors = [];

const MODEL_FILES = {
  governance: "docs/reference/project-model/governance.registry.yml",
  requirements: "docs/reference/project-model/requirements.registry.yml",
  graph: "docs/reference/project-model/graph.matrix.yml"
};

const RELATIONSHIP_PROPOSALS = [
  {
    id: "REFINES",
    description: "Il requisito figlio dettaglia un requisito più generale."
  },
  {
    id: "HARDENS",
    description: "Il requisito figlio aggiunge vincoli di sicurezza/governance."
  },
  {
    id: "CONSTRAINS",
    description: "Il requisito figlio limita cosa è permesso fare."
  },
  {
    id: "MITIGATES",
    description: "Il requisito figlio mitiga un rischio/failure mode."
  },
  {
    id: "IMPLEMENTS_CONTROL_FOR",
    description: "Il requisito figlio implementa una misura di controllo per un requisito base."
  }
];

const TOP_LEVEL_REQUIREMENT_FIELDS = [
  "canonical_id",
  "id",
  "area_id",
  "source_path",
  "macro_requirement_id",
  "capability_id",
  "title",
  "statement",
  "rationale",
  "status",
  "implementation_status",
  "implementation_rationale",
  "priority",
  "type",
  "scope",
  "preconditions",
  "main_flow",
  "alternative_flows",
  "postconditions",
  "acceptance_criteria",
  "verification"
];

/**
 * Resolves a repository-relative path.
 *
 * @param {string} relativePath - Repository-relative path.
 * @returns {string} Absolute path.
 */
function absolutePath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(root, relativePath);
}

/**
 * Normalizes a path for repository display.
 *
 * @param {string} value - Path value.
 * @returns {string} POSIX-style path.
 */
function toRepositoryPath(value) {
  return value.split(path.sep).join("/");
}

/**
 * Escapes generated text before injecting it into HTML.
 *
 * @param {unknown} value - Value to escape.
 * @returns {string} HTML-escaped value.
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
 * Reads a UTF-8 text file.
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
 * Reads and parses a YAML file.
 *
 * @param {string} relativePath - Repository-relative YAML path.
 * @returns {unknown | null} Parsed YAML or null.
 */
function readYaml(relativePath) {
  const content = readText(relativePath);
  if (content === null) {
    return null;
  }

  try {
    return parseYaml(content);
  } catch (error) {
    errors.push(`Cannot parse YAML ${relativePath}: ${error.message}`);
    return null;
  }
}

/**
 * Returns a value as an array.
 *
 * @param {unknown} value - Candidate array.
 * @returns {unknown[]} Array value or empty array.
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Returns a stable unique sorted string list.
 *
 * @param {unknown[]} values - Input values.
 * @returns {string[]} Sorted unique strings.
 */
function sortedUnique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Canonicalizes a local modular ID with its owning area.
 *
 * @param {string} areaId - Project-model area ID.
 * @param {string} id - Local or canonical id.
 * @returns {string} Canonical id.
 */
function canonicalize(areaId, id) {
  if (typeof id !== "string") {
    return "";
  }

  return id.includes(":") ? id : `${areaId}:${id}`;
}

/**
 * Converts a registry taxonomy array into select options.
 *
 * @param {unknown[]} entries - Taxonomy entries.
 * @returns {{ id: string, label: string, description: string }[]} Select options.
 */
function taxonomyOptions(entries) {
  return asArray(entries)
    .filter((entry) => typeof entry?.id === "string")
    .map((entry) => ({
      id: entry.id,
      label: entry.id,
      description: entry.description ?? entry.rationale ?? ""
    }));
}

/**
 * Builds a reference option list.
 *
 * @param {unknown[]} entries - Registry entries.
 * @param {string} labelKey - Label property.
 * @returns {{ id: string, label: string, description: string }[]} Select options.
 */
function referenceOptions(entries, labelKey = "title") {
  return asArray(entries)
    .filter((entry) => typeof entry?.id === "string")
    .map((entry) => ({
      id: entry.id,
      label: `${entry.id}${entry[labelKey] ? ` — ${entry[labelKey]}` : ""}`,
      description: entry.description ?? entry.rationale ?? entry.statement ?? ""
    }));
}

/**
 * Loads all requirement records declared by the central requirements index.
 *
 * @param {object} requirementsIndex - Parsed requirements registry index.
 * @returns {{ macroRequirements: Map<string, object>, requirements: object[] }} Aggregated records.
 */
function loadRequirements(requirementsIndex) {
  const macroRequirements = new Map(
    asArray(requirementsIndex?.macro_requirements)
      .filter((macroRequirement) => typeof macroRequirement?.id === "string")
      .map((macroRequirement) => [macroRequirement.id, macroRequirement])
  );

  const requirements = [];
  for (const partDeclaration of asArray(requirementsIndex?.parts)) {
    const areaId = partDeclaration?.area_id;
    const partPath = partDeclaration?.path;

    if (typeof areaId !== "string" || typeof partPath !== "string") {
      errors.push("Requirements index contains a part without area_id or path.");
      continue;
    }

    const part = readYaml(partPath);
    if (!part) {
      continue;
    }

    for (const requirement of asArray(part.requirements)) {
      if (typeof requirement?.id !== "string") {
        errors.push(`${partPath} contains a requirement without id.`);
        continue;
      }

      requirements.push({
        ...requirement,
        area_id: areaId,
        source_path: partPath,
        canonical_id: canonicalize(areaId, requirement.id),
        macro_title: macroRequirements.get(requirement.macro_requirement_id)?.title ?? requirement.macro_requirement_id
      });
    }
  }

  return { macroRequirements, requirements: requirements.sort((left, right) => left.canonical_id.localeCompare(right.canonical_id)) };
}

/**
 * Loads graph triples declared by the central graph index.
 *
 * @param {object} graphIndex - Parsed graph matrix index.
 * @returns {object[]} Aggregated triples.
 */
function loadGraphTriples(graphIndex) {
  const triples = [];

  for (const partDeclaration of asArray(graphIndex?.parts)) {
    const partPath = partDeclaration?.path;
    if (typeof partPath !== "string") {
      errors.push("Graph index contains a part without path.");
      continue;
    }

    const part = readYaml(partPath);
    if (!part) {
      continue;
    }

    for (const triple of asArray(part.triples)) {
      triples.push({ ...triple, source_path: partPath });
    }
  }

  return triples;
}

/**
 * Builds requirement-to-requirement relationship maps from graph triples.
 *
 * @param {object[]} triples - Aggregated graph triples.
 * @returns {{ outgoing: Map<string, object[]>, incoming: Map<string, object[]> }} Relationship maps.
 */
function requirementRelationshipMaps(triples) {
  const outgoing = new Map();
  const incoming = new Map();

  for (const triple of triples) {
    if (triple?.subject?.type !== "Requirement" || triple?.object?.type !== "Requirement") {
      continue;
    }

    const relationship = {
      predicate: triple.predicate,
      source: triple.subject.id,
      target: triple.object.id,
      source_path: triple.source_path
    };

    outgoing.set(relationship.source, [...(outgoing.get(relationship.source) ?? []), relationship]);
    incoming.set(relationship.target, [...(incoming.get(relationship.target) ?? []), relationship]);
  }

  return { outgoing, incoming };
}

/**
 * Builds all read-only review option lists used by requirement field controls.
 *
 * @param {object} governanceRegistry - Parsed governance registry.
 * @param {Map<string, object>} macroRequirements - Macro requirements by ID.
 * @returns {Record<string, { id: string, label: string, description: string }[]>} Options by field name.
 */
function buildFieldOptions(governanceRegistry, macroRequirements) {
  const taxonomies = governanceRegistry?.taxonomies ?? {};
  return {
    area_id: taxonomyOptions(taxonomies.project_model_areas),
    macro_requirement_id: referenceOptions([...macroRequirements.values()]),
    capability_id: referenceOptions(governanceRegistry?.capabilities),
    status: taxonomyOptions(taxonomies.requirement_status),
    implementation_status: taxonomyOptions(taxonomies.requirement_implementation_status),
    priority: taxonomyOptions(taxonomies.priority),
    type: taxonomyOptions(taxonomies.requirement_type),
    scope: taxonomyOptions(taxonomies.scope),
    verification_method: taxonomyOptions(taxonomies.verification_method),
    evidence_type: taxonomyOptions(taxonomies.evidence_type)
  };
}

/**
 * Renders select options.
 *
 * @param {string[]} values - Option values.
 * @param {string} allLabel - First label for all values.
 * @returns {string} HTML options.
 */
function selectOptions(values, allLabel) {
  return [`<option value="">${escapeHtml(allLabel)}</option>`, ...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)].join("\n");
}

/**
 * Renders a small metadata pill.
 *
 * @param {string} label - Pill label.
 * @param {unknown} value - Pill value.
 * @returns {string} HTML pill.
 */
function pill(label, value) {
  return `<span class="pill"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "")}</strong></span>`;
}

/**
 * Renders a read-only text field.
 *
 * @param {string} name - Field name.
 * @param {unknown} value - Field value.
 * @returns {string} HTML field.
 */
function readonlyInput(name, value) {
  return `
    <label class="field-label">
      <span>${escapeHtml(name)}</span>
      <input type="text" value="${escapeHtml(value ?? "")}" readonly>
    </label>
  `;
}

/**
 * Renders a read-only text area.
 *
 * @param {string} name - Field name.
 * @param {unknown} value - Field value.
 * @returns {string} HTML field.
 */
function readonlyTextArea(name, value) {
  const normalized = value === undefined || value === null ? "" : String(value);
  return `
    <label class="field-label field-wide">
      <span>${escapeHtml(name)}</span>
      <textarea readonly rows="${Math.min(8, Math.max(2, normalized.split("\n").length + 1))}">${escapeHtml(normalized)}</textarea>
    </label>
  `;
}

/**
 * Renders a read-only review select that can be opened to inspect allowed values.
 *
 * The control intentionally reverts user changes in JavaScript so the artifact can
 * feel like an editable form while remaining read-only review output.
 *
 * @param {string} name - Field name.
 * @param {unknown} value - Current value.
 * @param {{ id: string, label: string, description: string }[]} options - Allowed values.
 * @returns {string} HTML field.
 */
function readonlySelect(name, value, options) {
  const current = String(value ?? "");
  const allOptions = options.some((option) => option.id === current)
    ? options
    : current
      ? [{ id: current, label: `${current} — value not found in current option list`, description: "" }, ...options]
      : options;

  return `
    <label class="field-label">
      <span>${escapeHtml(name)}</span>
      <select class="readonly-select" data-current="${escapeHtml(current)}" aria-readonly="true">
        ${allOptions.map((option) => `<option value="${escapeHtml(option.id)}" title="${escapeHtml(option.description)}"${option.id === current ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("\n")}
      </select>
    </label>
  `;
}

/**
 * Renders an allowed option legend.
 *
 * @param {string} title - Legend title.
 * @param {{ id: string, label: string, description: string }[]} options - Allowed values.
 * @returns {string} HTML legend.
 */
function optionLegend(title, options) {
  if (!Array.isArray(options) || options.length === 0) {
    return "";
  }

  return `
    <details class="option-legend">
      <summary>${escapeHtml(title)}</summary>
      <dl>
        ${options.map((option) => `
          <div>
            <dt><code>${escapeHtml(option.id)}</code></dt>
            <dd>${escapeHtml(option.description || option.label)}</dd>
          </div>
        `).join("\n")}
      </dl>
    </details>
  `;
}

/**
 * Renders a nested statement list with explicit fields.
 *
 * @param {string} title - Section title.
 * @param {unknown[]} items - Nested statement items.
 * @returns {string} HTML section.
 */
function nestedStatementSection(title, items) {
  const values = asArray(items);
  return `
    <section class="nested-section">
      <h4>${escapeHtml(title)}</h4>
      ${values.length === 0 ? "<p class=\"muted\">Empty list.</p>" : values.map((item, index) => `
        <fieldset class="nested-card">
          <legend>${escapeHtml(title)} #${index + 1}</legend>
          <div class="field-grid compact">
            ${readonlyInput("id", item?.id)}
            ${readonlyTextArea("statement", item?.statement)}
          </div>
        </fieldset>
      `).join("\n")}
    </section>
  `;
}

/**
 * Renders flow steps with explicit field controls.
 *
 * @param {string} title - Section title.
 * @param {object[]} steps - Flow steps.
 * @returns {string} HTML section.
 */
function flowSection(title, steps) {
  const values = asArray(steps);
  return `
    <section class="nested-section">
      <h4>${escapeHtml(title)}</h4>
      ${values.length === 0 ? "<p class=\"muted\">Empty list.</p>" : values.map((step, index) => `
        <fieldset class="nested-card">
          <legend>${escapeHtml(title)} #${index + 1}</legend>
          <div class="field-grid compact">
            ${readonlyInput("id", step?.id)}
            ${readonlyInput("step", step?.step)}
            ${readonlyInput("actor", step?.actor)}
            ${readonlyTextArea("action", step?.action)}
            ${readonlyTextArea("expected_result", step?.expected_result)}
          </div>
        </fieldset>
      `).join("\n")}
    </section>
  `;
}

/**
 * Renders alternative flows with explicit nested fields.
 *
 * @param {object[]} flows - Alternative flows.
 * @returns {string} HTML section.
 */
function alternativeFlowSection(flows) {
  const values = asArray(flows);
  return `
    <section class="nested-section">
      <h4>alternative_flows</h4>
      ${values.length === 0 ? "<p class=\"muted\">Empty list.</p>" : values.map((flow, index) => `
        <fieldset class="nested-card">
          <legend>alternative_flows #${index + 1}</legend>
          <div class="field-grid compact">
            ${readonlyInput("id", flow?.id)}
            ${readonlyInput("title", flow?.title)}
            ${readonlyTextArea("trigger", flow?.trigger)}
          </div>
          ${flowSection("steps", flow?.steps)}
        </fieldset>
      `).join("\n")}
    </section>
  `;
}

/**
 * Renders verification fields with controlled-value controls.
 *
 * @param {object} verification - Requirement verification object.
 * @param {Record<string, { id: string, label: string, description: string }[]>} fieldOptions - Options by field.
 * @returns {string} HTML section.
 */
function verificationSection(verification, fieldOptions) {
  const selectedEvidence = new Set(asArray(verification?.required_evidence).filter((value) => typeof value === "string"));
  const evidenceOptions = fieldOptions.evidence_type ?? [];

  return `
    <section class="nested-section">
      <h4>verification</h4>
      <fieldset class="nested-card">
        <legend>verification object</legend>
        <div class="field-grid compact">
          ${readonlySelect("method", verification?.method, fieldOptions.verification_method ?? [])}
          <div class="field-label field-wide">
            <span>required_evidence</span>
            <div class="checkbox-grid" aria-label="required_evidence read-only checklist">
              ${evidenceOptions.map((option) => `
                <label class="checkbox-pill" title="${escapeHtml(option.description)}">
                  <input type="checkbox"${selectedEvidence.has(option.id) ? " checked" : ""} disabled>
                  <code>${escapeHtml(option.id)}</code>
                </label>
              `).join("\n")}
            </div>
            ${[...selectedEvidence].filter((value) => !evidenceOptions.some((option) => option.id === value)).map((value) => `<p class="warning">Selected value not in option list: <code>${escapeHtml(value)}</code></p>`).join("\n")}
          </div>
        </div>
      </fieldset>
    </section>
  `;
}

/**
 * Renders the complete requirement field sheet.
 *
 * @param {object} requirement - Requirement record.
 * @param {Record<string, { id: string, label: string, description: string }[]>} fieldOptions - Options by field.
 * @returns {string} HTML field sheet.
 */
function requirementFieldSheet(requirement, fieldOptions) {
  const actualFields = Object.keys(requirement).sort((left, right) => left.localeCompare(right));
  const extraFields = actualFields.filter((field) => !TOP_LEVEL_REQUIREMENT_FIELDS.includes(field) && field !== "macro_title");

  return `
    <details class="field-sheet" open>
      <summary>Requirement field sheet</summary>
      <p class="muted">Read-only review controls. Select fields can be opened to inspect the current allowed values, but changes are immediately reverted because the HTML page is generated output.</p>
      <div class="field-grid">
        ${readonlyInput("canonical_id", requirement.canonical_id)}
        ${readonlyInput("id", requirement.id)}
        ${readonlySelect("area_id", requirement.area_id, fieldOptions.area_id ?? [])}
        ${readonlyInput("source_path", requirement.source_path)}
        ${readonlySelect("macro_requirement_id", requirement.macro_requirement_id, fieldOptions.macro_requirement_id ?? [])}
        ${readonlySelect("capability_id", requirement.capability_id, fieldOptions.capability_id ?? [])}
        ${readonlyInput("title", requirement.title)}
        ${readonlySelect("status", requirement.status, fieldOptions.status ?? [])}
        ${readonlySelect("implementation_status", requirement.implementation_status, fieldOptions.implementation_status ?? [])}
        ${readonlySelect("priority", requirement.priority, fieldOptions.priority ?? [])}
        ${readonlySelect("type", requirement.type, fieldOptions.type ?? [])}
        ${readonlySelect("scope", requirement.scope, fieldOptions.scope ?? [])}
        ${readonlyTextArea("statement", requirement.statement)}
        ${readonlyTextArea("rationale", requirement.rationale)}
        ${readonlyTextArea("implementation_rationale", requirement.implementation_rationale)}
      </div>
      <div class="body-sections">
        ${nestedStatementSection("preconditions", requirement.preconditions)}
        ${flowSection("main_flow", requirement.main_flow)}
        ${alternativeFlowSection(requirement.alternative_flows)}
        ${nestedStatementSection("postconditions", requirement.postconditions)}
        ${nestedStatementSection("acceptance_criteria", requirement.acceptance_criteria)}
        ${verificationSection(requirement.verification, fieldOptions)}
      </div>
      ${extraFields.length === 0 ? "" : `
        <section class="nested-section">
          <h4>Additional present fields</h4>
          <div class="field-grid compact">
            ${extraFields.map((field) => readonlyTextArea(field, JSON.stringify(requirement[field], null, 2))).join("\n")}
          </div>
        </section>
      `}
    </details>
  `;
}

/**
 * Renders requirement relationship rows.
 *
 * @param {object[]} relationships - Requirement graph relationships.
 * @param {"out" | "in"} direction - Relationship direction.
 * @returns {string} HTML list.
 */
function relationshipList(relationships, direction) {
  if (!Array.isArray(relationships) || relationships.length === 0) {
    return "<p class=\"muted\">No requirement relationships.</p>";
  }

  return `<ul>${relationships
    .sort((left, right) => `${left.predicate}:${left.target}`.localeCompare(`${right.predicate}:${right.target}`))
    .map((relationship) => {
      const other = direction === "out" ? relationship.target : relationship.source;
      const arrow = direction === "out" ? "→" : "←";
      return `<li><code>${escapeHtml(relationship.predicate)}</code> ${escapeHtml(arrow)} <code>${escapeHtml(other)}</code></li>`;
    })
    .join("")}</ul>`;
}

/**
 * Renders all requirement cards.
 *
 * @param {object[]} requirements - Aggregated requirements.
 * @param {Map<string, object[]>} outgoing - Outgoing requirement relationships.
 * @param {Map<string, object[]>} incoming - Incoming requirement relationships.
 * @param {Record<string, { id: string, label: string, description: string }[]>} fieldOptions - Options by field.
 * @returns {string} HTML cards.
 */
function requirementCards(requirements, outgoing, incoming, fieldOptions) {
  return requirements.map((requirement) => {
    const searchText = [
      requirement.canonical_id,
      requirement.title,
      requirement.statement,
      requirement.rationale,
      requirement.area_id,
      requirement.macro_requirement_id,
      requirement.capability_id,
      requirement.type,
      requirement.scope
    ].filter(Boolean).join(" ").toLowerCase();

    return `
      <article class="requirement-card"
        data-area="${escapeHtml(requirement.area_id)}"
        data-macro="${escapeHtml(requirement.macro_requirement_id)}"
        data-status="${escapeHtml(requirement.status)}"
        data-implementation="${escapeHtml(requirement.implementation_status)}"
        data-type="${escapeHtml(requirement.type)}"
        data-scope="${escapeHtml(requirement.scope)}"
        data-search="${escapeHtml(searchText)}">
        <header class="card-header">
          <div>
            <p class="eyebrow"><code>${escapeHtml(requirement.canonical_id)}</code></p>
            <h3>${escapeHtml(requirement.title)}</h3>
          </div>
          <div class="pill-row">
            ${pill("area", requirement.area_id)}
            ${pill("macro", requirement.macro_requirement_id)}
            ${pill("status", requirement.status)}
            ${pill("implementation", requirement.implementation_status)}
            ${pill("type", requirement.type)}
            ${pill("scope", requirement.scope)}
          </div>
        </header>

        ${requirementFieldSheet(requirement, fieldOptions)}

        <details>
          <summary>Current requirement graph relationships</summary>
          <div class="relationship-grid">
            <section>
              <h4>Outgoing</h4>
              ${relationshipList(outgoing.get(requirement.canonical_id), "out")}
            </section>
            <section>
              <h4>Incoming</h4>
              ${relationshipList(incoming.get(requirement.canonical_id), "in")}
            </section>
          </div>
        </details>
      </article>
    `;
  }).join("\n");
}

/**
 * Renders the complete static HTML page.
 *
 * @param {object[]} requirements - Aggregated requirement records.
 * @param {Map<string, object>} macroRequirements - Macro requirements by id.
 * @param {object[]} triples - Aggregated graph triples.
 * @param {object} governanceRegistry - Parsed governance registry.
 * @returns {string} HTML document.
 */
function renderHtml(requirements, macroRequirements, triples, governanceRegistry) {
  const { outgoing, incoming } = requirementRelationshipMaps(triples);
  const fieldOptions = buildFieldOptions(governanceRegistry, macroRequirements);
  const areas = sortedUnique(requirements.map((requirement) => requirement.area_id));
  const macros = sortedUnique(requirements.map((requirement) => requirement.macro_requirement_id));
  const statuses = sortedUnique(requirements.map((requirement) => requirement.status));
  const implementations = sortedUnique(requirements.map((requirement) => requirement.implementation_status));
  const types = sortedUnique(requirements.map((requirement) => requirement.type));
  const scopes = sortedUnique(requirements.map((requirement) => requirement.scope));

  const relationshipProposalHtml = RELATIONSHIP_PROPOSALS.map((relationship) => `
    <li><code>${escapeHtml(relationship.id)}</code> = ${escapeHtml(relationship.description)}</li>
  `).join("");

  const macroHtml = [...macroRequirements.values()].map((macroRequirement) => `
    <article class="macro-card">
      <h3><code>${escapeHtml(macroRequirement.id)}</code> ${escapeHtml(macroRequirement.title)}</h3>
      <div class="field-grid compact">
        ${readonlyInput("id", macroRequirement.id)}
        ${readonlyInput("title", macroRequirement.title)}
        ${readonlySelect("status", macroRequirement.status, fieldOptions.status ?? [])}
        ${readonlySelect("implementation_status", macroRequirement.implementation_status, fieldOptions.implementation_status ?? [])}
        ${readonlySelect("priority", macroRequirement.priority, fieldOptions.priority ?? [])}
        ${readonlyTextArea("statement", macroRequirement.statement)}
        ${readonlyTextArea("rationale", macroRequirement.rationale)}
      </div>
    </article>
  `).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>threat-forge-LLM Requirements Review</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      color-scheme: light dark;
      --border: #98a2b3;
      --muted: #667085;
      --soft: rgba(127, 127, 127, 0.09);
      --card: rgba(127, 127, 127, 0.045);
      --warning: #b54708;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      margin: 0;
    }

    header.page-header {
      background: var(--soft);
      border-bottom: 1px solid var(--border);
      padding: 2rem;
    }

    main {
      display: grid;
      gap: 1.5rem;
      padding: 1.5rem 2rem 3rem;
    }

    section.panel, article.requirement-card, article.macro-card, fieldset.nested-card {
      border: 1px solid var(--border);
      border-radius: 0.8rem;
      padding: 1rem;
      background: var(--card);
    }

    .summary-grid, .filter-grid, .relationship-grid, .macro-grid, .field-grid, .body-sections {
      display: grid;
      gap: 1rem;
    }

    .summary-grid {
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    }

    .filter-grid {
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      align-items: end;
    }

    .relationship-grid, .macro-grid {
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    }

    .field-grid {
      grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
      align-items: start;
    }

    .field-grid.compact {
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    }

    .body-sections {
      margin-top: 1rem;
    }

    .nested-section {
      border-top: 1px solid var(--border);
      padding-top: 1rem;
    }

    .nested-card {
      margin: 0 0 0.75rem;
    }

    .nested-card legend {
      font-weight: 700;
      padding: 0 0.35rem;
    }

    .metric {
      border: 1px solid var(--border);
      border-radius: 0.7rem;
      padding: 0.75rem;
      background: var(--soft);
    }

    .metric strong {
      display: block;
      font-size: 1.5rem;
    }

    .requirement-list {
      display: grid;
      gap: 1rem;
    }

    .card-header {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: minmax(18rem, 1fr) minmax(16rem, 2fr);
      align-items: start;
    }

    @media (max-width: 900px) {
      .card-header {
        grid-template-columns: 1fr;
      }
    }

    .eyebrow, .muted, .source-note {
      color: var(--muted);
    }

    .eyebrow {
      margin: 0;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    h1, h2, h3, h4 {
      margin-top: 0;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: flex-end;
    }

    .pill {
      border: 1px solid var(--border);
      border-radius: 999px;
      display: inline-flex;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      background: var(--soft);
      font-size: 0.85rem;
    }

    label, .field-label {
      display: grid;
      gap: 0.35rem;
      font-weight: 600;
    }

    .field-wide {
      grid-column: 1 / -1;
    }

    select, input, textarea {
      font: inherit;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      background: Canvas;
      color: CanvasText;
      width: 100%;
      box-sizing: border-box;
    }

    textarea {
      resize: vertical;
    }

    input[readonly], textarea[readonly], .readonly-select {
      background: var(--soft);
    }

    .checkbox-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.5rem;
      background: var(--soft);
    }

    .checkbox-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.2rem 0.45rem;
      font-weight: 400;
      background: Canvas;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    th, td {
      border: 1px solid var(--border);
      padding: 0.45rem;
      text-align: left;
      vertical-align: top;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      font-size: 0.92em;
    }

    details {
      border-top: 1px solid var(--border);
      margin-top: 1rem;
      padding-top: 0.75rem;
    }

    details.field-sheet {
      border: 1px solid var(--border);
      border-radius: 0.7rem;
      padding: 0.75rem;
      background: var(--soft);
    }

    summary {
      cursor: pointer;
      font-weight: 700;
    }

    .option-legend dl {
      display: grid;
      gap: 0.5rem;
    }

    .option-legend div {
      border-top: 1px solid var(--border);
      padding-top: 0.5rem;
    }

    .option-legend dt {
      font-weight: 700;
    }

    .option-legend dd {
      margin-left: 0;
      color: var(--muted);
    }

    .warning {
      color: var(--warning);
      font-weight: 700;
    }

    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <header class="page-header">
    <h1>threat-forge-LLM Requirements Review</h1>
    <p>Generated static page from canonical requirements YAML, governance taxonomies, and graph parts. This page is an artifact for review and schema discussion; it is not a source of truth.</p>
  </header>

  <main>
    <section class="panel">
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="metric"><span>Requirements</span><strong id="visibleCount">${requirements.length}</strong><span>visible of ${requirements.length}</span></div>
        <div class="metric"><span>Macro requirements</span><strong>${macroRequirements.size}</strong></div>
        <div class="metric"><span>Areas</span><strong>${areas.length}</strong></div>
        <div class="metric"><span>Requirement relations</span><strong>${[...outgoing.values()].reduce((count, rels) => count + rels.length, 0)}</strong></div>
      </div>
    </section>

    <section class="panel">
      <h2>Proposed specialization relationship vocabulary</h2>
      <p class="muted">Fixed review text for upcoming schema proposals. These relationship types are displayed here for reasoning; this generator does not enforce them yet.</p>
      <ul>${relationshipProposalHtml}</ul>
    </section>

    <section class="panel">
      <h2>Controlled value lists</h2>
      <p class="muted">These lists come from the governance registry and are displayed next to the requirement field controls so schema changes can be discussed before enforcement.</p>
      ${optionLegend("Requirement status", fieldOptions.status ?? [])}
      ${optionLegend("Implementation status", fieldOptions.implementation_status ?? [])}
      ${optionLegend("Priority", fieldOptions.priority ?? [])}
      ${optionLegend("Requirement type", fieldOptions.type ?? [])}
      ${optionLegend("Scope", fieldOptions.scope ?? [])}
      ${optionLegend("Verification method", fieldOptions.verification_method ?? [])}
      ${optionLegend("Evidence type", fieldOptions.evidence_type ?? [])}
    </section>

    <section class="panel">
      <h2>Filters</h2>
      <div class="filter-grid">
        <label>Macroarea
          <select id="areaFilter">${selectOptions(areas, "All macroareas")}</select>
        </label>
        <label>Macro requirement
          <select id="macroFilter">${selectOptions(macros, "All macro requirements")}</select>
        </label>
        <label>Status
          <select id="statusFilter">${selectOptions(statuses, "All statuses")}</select>
        </label>
        <label>Implementation
          <select id="implementationFilter">${selectOptions(implementations, "All implementation states")}</select>
        </label>
        <label>Type
          <select id="typeFilter">${selectOptions(types, "All types")}</select>
        </label>
        <label>Scope
          <select id="scopeFilter">${selectOptions(scopes, "All scopes")}</select>
        </label>
        <label>Search
          <input id="searchFilter" type="search" placeholder="ID, title, statement, rationale...">
        </label>
      </div>
    </section>

    <section class="panel">
      <h2>Macro requirements</h2>
      <div class="macro-grid">${macroHtml}</div>
    </section>

    <section class="panel">
      <h2>Requirements</h2>
      <div class="requirement-list" id="requirements">${requirementCards(requirements, outgoing, incoming, fieldOptions)}</div>
    </section>
  </main>

  <script>
    const filters = {
      area: document.querySelector("#areaFilter"),
      macro: document.querySelector("#macroFilter"),
      status: document.querySelector("#statusFilter"),
      implementation: document.querySelector("#implementationFilter"),
      type: document.querySelector("#typeFilter"),
      scope: document.querySelector("#scopeFilter"),
      search: document.querySelector("#searchFilter")
    };
    const cards = [...document.querySelectorAll(".requirement-card")];
    const visibleCount = document.querySelector("#visibleCount");

    function matches(card, key, value) {
      return !value || card.dataset[key] === value;
    }

    function applyFilters() {
      const search = filters.search.value.trim().toLowerCase();
      let visible = 0;

      for (const card of cards) {
        const shouldShow =
          matches(card, "area", filters.area.value) &&
          matches(card, "macro", filters.macro.value) &&
          matches(card, "status", filters.status.value) &&
          matches(card, "implementation", filters.implementation.value) &&
          matches(card, "type", filters.type.value) &&
          matches(card, "scope", filters.scope.value) &&
          (!search || card.dataset.search.includes(search));

        card.classList.toggle("hidden", !shouldShow);
        if (shouldShow) visible += 1;
      }

      visibleCount.textContent = String(visible);
    }

    function preserveReadOnlySelectValue(event) {
      const current = event.currentTarget.dataset.current ?? "";
      event.currentTarget.value = current;
    }

    Object.values(filters).forEach((input) => input.addEventListener("input", applyFilters));
    document.querySelectorAll(".readonly-select").forEach((select) => select.addEventListener("change", preserveReadOnlySelectValue));
  </script>
</body>
</html>
`;
}

/**
 * Writes or validates the requirements review page.
 *
 * @returns {void}
 */
function main() {
  const governanceRegistry = readYaml(MODEL_FILES.governance);
  const requirementsIndex = readYaml(MODEL_FILES.requirements);
  const graphIndex = readYaml(MODEL_FILES.graph);

  if (!governanceRegistry || !requirementsIndex || !graphIndex) {
    return;
  }

  const { macroRequirements, requirements } = loadRequirements(requirementsIndex);
  const triples = loadGraphTriples(graphIndex);
  const html = renderHtml(requirements, macroRequirements, triples, governanceRegistry);

  if (!html.includes("REFINES") || !html.includes("HARDENS") || !html.includes("IMPLEMENTS_CONTROL_FOR")) {
    errors.push("Generated page is missing the fixed specialization relationship proposal text.");
  }

  if (!html.includes("Requirement field sheet") || !html.includes("Controlled value lists")) {
    errors.push("Generated page is missing requirement field-sheet review sections.");
  }

  const destination = checkMode && !outputOverride
    ? path.join(fs.mkdtempSync(path.join(os.tmpdir(), "threat-forge-llm-requirements-page-")), "index.html")
    : outputPath;

  fs.mkdirSync(path.dirname(absolutePath(destination)), { recursive: true });
  fs.writeFileSync(absolutePath(destination), html, "utf8");

  if (!checkMode) {
    console.log(`Requirements review page generated: ${toRepositoryPath(destination)}`);
  }
}

main();

if (errors.length > 0) {
  console.error("Requirements review page generation failed.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (checkMode) {
  console.log("Requirements review page check passed.");
}
