"use strict";

const { taskKey } = require("./tasks");

/**
 * Kaneo Query Language (KQL) — subconjunto estilo JQL para filtrar en cliente.
 * Ejemplos:
 *   status = to-do
 *   status in (to-do, in-progress) AND priority = high
 *   text ~ sprites
 *   number = 1
 *   key = LDS-1
 *   assignee is empty
 *
 * @param {string} query
 * @param {{ projectSlug?: string, userId?: string }} [ctx]
 * @returns {(task: object) => boolean}
 */
function compileKql(query, ctx = {}) {
  const q = String(query || "").trim();
  if (!q) return () => true;

  const orGroups = splitTopLevel(q, "OR").map((g) => g.trim()).filter(Boolean);
  const orPredicates = orGroups.map((group) => {
    const andParts = splitTopLevel(group, "AND").map((p) => p.trim()).filter(Boolean);
    const andPredicates = andParts.map((part) => compileClause(part, ctx));
    return (/** @type {object} */ task) => andPredicates.every((fn) => fn(task));
  });

  return (task) => orPredicates.some((fn) => fn(task));
}

/**
 * @param {string} input
 * @param {string} op
 */
function splitTopLevel(input, op) {
  const parts = [];
  let depth = 0;
  let current = "";
  const upper = input.toUpperCase();
  const token = ` ${op} `;

  for (let i = 0; i < input.length; i++) {
    if (input[i] === "(") depth++;
    if (input[i] === ")") depth--;
    if (depth === 0 && upper.startsWith(token, i)) {
      parts.push(current);
      current = "";
      i += token.length - 1;
      continue;
    }
    current += input[i];
  }
  parts.push(current);
  return parts;
}

/**
 * @param {string} clause
 * @param {{ projectSlug?: string }} ctx
 */
function compileClause(clause, ctx) {
  const inMatch = clause.match(/^(\w+)\s+in\s*\(([^)]+)\)$/i);
  if (inMatch) {
    const field = inMatch[1].toLowerCase();
    const values = inMatch[2].split(",").map((v) => stripQuotes(v.trim().toLowerCase()));
    return (task) => values.includes(String(getField(task, field, ctx)).toLowerCase());
  }

  const isMatch = clause.match(/^(\w+)\s+is\s+(empty|not\s+empty)$/i);
  if (isMatch) {
    const field = isMatch[1].toLowerCase();
    const empty = isMatch[2].toLowerCase().includes("not") ? false : true;
    return (task) => {
      const val = getField(task, field, ctx);
      const isEmpty = val == null || val === "" || val === "null";
      return empty ? isEmpty : !isEmpty;
    };
  }

  const tilde = clause.match(/^text\s*~\s*(.+)$/i);
  if (tilde) {
    const needle = stripQuotes(tilde[1]).toLowerCase();
    return (task) => {
      const hay = `${task.title || ""} ${task.description || ""}`.toLowerCase();
      return hay.includes(needle);
    };
  }

  const cmp = clause.match(/^(\w+)\s*(=|!=)\s*(.+)$/i);
  if (cmp) {
    const field = cmp[1].toLowerCase();
    const op = cmp[2];
    const expected = stripQuotes(cmp[3]).toLowerCase();
    return (task) => {
      if (field === "assignee" && expected === "me" && ctx.userId) {
        const uid = String(ctx.userId);
        const actual = task.userId || task.assigneeId || "";
        return op === "=" ? String(actual) === uid : String(actual) !== uid;
      }
      const actual = String(getField(task, field, ctx)).toLowerCase();
      return op === "=" ? actual === expected : actual !== expected;
    };
  }

  // fallback: búsqueda libre en título
  const needle = clause.toLowerCase();
  return (task) => `${task.title || ""}`.toLowerCase().includes(needle);
}

/**
 * @param {object} task
 * @param {string} field
 * @param {{ projectSlug?: string }} ctx
 */
function getField(task, field, ctx) {
  switch (field) {
    case "status":
      return task.status;
    case "priority":
      return task.priority;
    case "number":
      return task.number;
    case "key":
      return taskKey(task, ctx.projectSlug);
    case "assignee":
      return task.assigneeName || task.userId || task.assigneeId || "";
    case "duedate":
    case "due":
      return task.dueDate || "";
    case "startdate":
    case "start":
      return task.startDate || "";
    case "created":
    case "createdat":
      return task.createdAt || "";
    case "title":
      return task.title;
    default:
      return task[field];
  }
}

/**
 * @param {string} s
 */
function stripQuotes(s) {
  return s.replace(/^['"]|['"]$/g, "");
}

const KQL_EXAMPLES = [
  { label: "Todas", query: "" },
  { label: "Asignadas a mí", query: "assignee = me" },
  { label: "Sin asignar", query: "assignee is empty" },
  { label: "To Do", query: "status = to-do" },
  { label: "In Progress", query: "status = in-progress" },
  { label: "Alta prioridad", query: "priority = high" },
];

module.exports = { compileKql, KQL_EXAMPLES };
