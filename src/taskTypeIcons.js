"use strict";

/**
 * Kaneo no tiene tipos de issue (es kanban/Trello). Inferimos icono por convención en el título.
 * @param {string} title
 * @returns {'bug'|'story'|'spike'|'chore'|'task'}
 */
function inferTaskType(title) {
  const t = String(title || "").trim();
  if (/^(bug|fix|hotfix|defect|regression)\s*:/i.test(t)) return "bug";
  if (/^(pbi|epic|story|feature|user story)\s*:/i.test(t)) return "story";
  if (/^(spike|research|investigation|poC)\s*:/i.test(t)) return "spike";
  if (/^(chore|task|docs|refactor|tech debt|maintenance)\s*:/i.test(t)) return "chore";
  return "task";
}

/**
 * @param {string} type
 */
function taskTypeLabel(type) {
  switch (type) {
    case "bug":
      return "Bug";
    case "story":
      return "PBI / Story";
    case "spike":
      return "Spike";
    case "chore":
      return "Chore";
    default:
      return "Tarea";
  }
}

module.exports = { inferTaskType, taskTypeLabel };
