"use strict";

/** @typedef {{ id: string, name: string, icon: string, query: string, builtin?: boolean }} SavedSection */

/** @type {SavedSection[]} */
const DEFAULT_SECTIONS = [
  {
    id: "assigned-me",
    name: "Asignadas a mí",
    icon: "person",
    query: "assignee = me",
    builtin: true,
  },
  {
    id: "unassigned",
    name: "Sin asignar",
    icon: "inbox",
    query: "assignee is empty",
    builtin: true,
  },
];

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} projectId
 */
function storageKey(projectId) {
  return `kaneo.sections.${projectId || "default"}`;
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} projectId
 * @returns {SavedSection[]}
 */
function getSections(context, projectId) {
  const custom = context.globalState.get(storageKey(projectId));
  if (!Array.isArray(custom) || !custom.length) {
    return DEFAULT_SECTIONS.map((s) => ({ ...s }));
  }
  const builtins = DEFAULT_SECTIONS.map((s) => ({ ...s }));
  const byId = new Map(builtins.map((s) => [s.id, s]));
  for (const s of custom) {
    if (!s?.id) continue;
    if (byId.has(s.id) && byId.get(s.id).builtin) {
      byId.set(s.id, { ...byId.get(s.id), ...s, builtin: true });
    } else {
      byId.set(s.id, { ...s, builtin: false });
    }
  }
  const ordered = custom.filter((s) => s?.id).map((s) => byId.get(s.id)).filter(Boolean);
  for (const b of builtins) {
    if (!ordered.some((s) => s.id === b.id)) ordered.unshift(b);
  }
  return ordered;
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} projectId
 * @param {SavedSection[]} sections
 */
async function saveSections(context, projectId, sections) {
  await context.globalState.update(storageKey(projectId), sections);
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} projectId
 * @param {SavedSection} section
 */
async function addSection(context, projectId, section) {
  const sections = getSections(context, projectId);
  sections.push({
    id: section.id || `sec-${Date.now()}`,
    name: section.name,
    icon: section.icon || "filter",
    query: section.query || "",
    builtin: false,
  });
  await saveSections(context, projectId, sections);
  return sections;
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} projectId
 * @param {string} sectionId
 */
async function removeSection(context, projectId, sectionId) {
  const sections = getSections(context, projectId).filter(
    (s) => s.id !== sectionId || s.builtin,
  );
  await saveSections(context, projectId, sections);
  return sections;
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} projectId
 */
function getCollapsed(context, projectId) {
  return context.globalState.get(`kaneo.sections.collapsed.${projectId}`) || {};
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} projectId
 * @param {Record<string, boolean>} collapsed
 */
async function setCollapsed(context, projectId, collapsed) {
  await context.globalState.update(`kaneo.sections.collapsed.${projectId}`, collapsed);
}

const SECTION_ICON_OPTIONS = [
  { id: "person", label: "Persona" },
  { id: "inbox", label: "Bandeja" },
  { id: "filter", label: "Filtro" },
  { id: "priority", label: "Prioridad" },
  { id: "status", label: "Estado" },
  { id: "search", label: "Búsqueda" },
  { id: "bug", label: "Bug" },
  { id: "story", label: "Historia / PBI" },
  { id: "task", label: "Tarea" },
  { id: "branch", label: "Desarrollo" },
];

module.exports = {
  DEFAULT_SECTIONS,
  getSections,
  saveSections,
  addSection,
  removeSection,
  getCollapsed,
  setCollapsed,
  SECTION_ICON_OPTIONS,
};
