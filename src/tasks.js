"use strict";

/**
 * @param {unknown} raw
 * @returns {{ project: object | null, columns: object[], allTasks: object[], archived: object[], planned: object[] }}
 */
function parseBoardResponse(raw) {
  const data = raw?.data ?? raw;
  if (!data) {
    return { project: null, columns: [], allTasks: [], archived: [], planned: [] };
  }

  const columns = Array.isArray(data.columns) ? data.columns : [];
  const allTasks = [];
  for (const col of columns) {
    for (const task of col.tasks || []) {
      allTasks.push({
        ...task,
        status: task.status || col.id || col.slug,
        statusName: col.name || task.status,
      });
    }
  }

  const archived = (data.archivedTasks || []).map((t) => ({ ...t, status: t.status || "archived" }));
  const planned = (data.plannedTasks || []).map((t) => ({ ...t, status: t.status || "planned" }));

  return {
    project: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      workspaceId: data.workspaceId,
    },
    columns,
    allTasks: [...allTasks, ...archived, ...planned],
    archived,
    planned,
  };
}

/**
 * @param {object} task
 * @param {string} [projectSlug]
 */
function taskKey(task, projectSlug) {
  const slug = String(projectSlug || "TASK").toUpperCase();
  const num = task.number != null ? task.number : "?";
  return `${slug}-${num}`;
}

const PRIORITY_LABELS = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  "no-priority": "None",
};

const STATUS_COLORS = {
  "to-do": "#6b7280",
  "in-progress": "#2563eb",
  "in-review": "#7c3aed",
  done: "#16a34a",
  archived: "#9ca3af",
  planned: "#d97706",
};

module.exports = {
  parseBoardResponse,
  taskKey,
  PRIORITY_LABELS,
  STATUS_COLORS,
};
