"use strict";

const { readFileSync } = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");

/**
 * @param {import('vscode').ExtensionContext} context
 */
function getConfig() {
  const vscode = require("vscode");
  const cfg = vscode.workspace.getConfiguration("kaneo");
  let apiKey = (cfg.get("apiKey") || "").trim();
  if (!apiKey) {
    apiKey = (process.env.KANEO_API_KEY || process.env.API_KEY || "").trim();
  }
  if (!apiKey) {
    try {
      apiKey = readFileSync(join(homedir(), ".config/kaneo/api-key"), "utf8").trim();
    } catch {
      // ignore
    }
  }
  const baseUrl = (cfg.get("apiBaseUrl") || "http://10.8.0.1:8100").replace(/\/$/, "");
  return {
    baseUrl,
    apiKey,
    workspaceId: (cfg.get("workspaceId") || "").trim(),
    projectId: (cfg.get("projectId") || "").trim(),
    branchPattern: cfg.get("branchPattern") || "{slug}-{number}-{title}",
    branchPrefix: (cfg.get("branchPrefix") || "").trim(),
    titleSlugMaxLength: cfg.get("titleSlugMaxLength") || 40,
    moveToInProgress: cfg.get("moveToInProgressOnStartWork") !== false,
    assignToMeOnStartWork: cfg.get("assignToMeOnStartWork") !== false,
    commentBranchOnStartWork: cfg.get("commentBranchOnStartWork") !== false,
    storeBranchLink: cfg.get("storeBranchLink") !== false,
    inProgressStatus: cfg.get("inProgressStatus") || "in-progress",
    userId: (cfg.get("userId") || "").trim(),
    userEmail: (cfg.get("userEmail") || "").trim(),
    dashboardPath:
      cfg.get("dashboardPath") ||
      "/dashboard/workspace/{workspaceId}/project/{projectId}/board",
  };
}

/**
 * @param {string} baseUrl
 * @param {string} apiKey
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function apiJson(baseUrl, apiKey, path, init = {}) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    ...(init.body != null ? { "Content-Type": "application/json" } : {}),
    ...init.headers,
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const detail =
      typeof body === "object" && body?.message
        ? body.message
        : typeof body === "string" && body
          ? body.slice(0, 300)
          : `HTTP ${res.status}`;
    throw new Error(`${path}: ${detail}`);
  }
  return body;
}

function assertConfigured(config) {
  if (!config.apiKey) {
    throw new Error(
      "Falta API key. Configura kaneo.apiKey, API_KEY en el entorno, o ~/.config/kaneo/api-key",
    );
  }
}

async function listWorkspaces(config) {
  assertConfigured(config);
  return apiJson(config.baseUrl, config.apiKey, "/api/auth/organization/list", {
    method: "GET",
  });
}

async function listProjects(config, workspaceId) {
  assertConfigured(config);
  const qs = new URLSearchParams({ workspaceId });
  return apiJson(config.baseUrl, config.apiKey, `/api/project?${qs}`, { method: "GET" });
}

async function getProject(config, projectId) {
  assertConfigured(config);
  return apiJson(config.baseUrl, config.apiKey, `/api/project/${encodeURIComponent(projectId)}`, {
    method: "GET",
  });
}

async function listTasks(config, projectId) {
  assertConfigured(config);
  return apiJson(
    config.baseUrl,
    config.apiKey,
    `/api/task/tasks/${encodeURIComponent(projectId)}`,
    { method: "GET" },
  );
}

async function getTask(config, taskId) {
  assertConfigured(config);
  return apiJson(config.baseUrl, config.apiKey, `/api/task/${encodeURIComponent(taskId)}`, {
    method: "GET",
  });
}

async function updateTaskStatus(config, taskId, status) {
  assertConfigured(config);
  return apiJson(
    config.baseUrl,
    config.apiKey,
    `/api/task/status/${encodeURIComponent(taskId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ status }),
    },
  );
}

async function updateTaskAssignee(config, taskId, userId) {
  assertConfigured(config);
  return apiJson(
    config.baseUrl,
    config.apiKey,
    `/api/task/assignee/${encodeURIComponent(taskId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ userId }),
    },
  );
}

async function getWorkspaceMembers(config, workspaceId) {
  assertConfigured(config);
  return apiJson(
    config.baseUrl,
    config.apiKey,
    `/api/workspace/${encodeURIComponent(workspaceId)}/members`,
    { method: "GET" },
  );
}

async function updateTaskPriority(config, taskId, priority) {
  assertConfigured(config);
  return apiJson(
    config.baseUrl,
    config.apiKey,
    `/api/task/priority/${encodeURIComponent(taskId)}`,
    { method: "PUT", body: JSON.stringify({ priority }) },
  );
}

async function listComments(config, taskId) {
  assertConfigured(config);
  return apiJson(config.baseUrl, config.apiKey, `/api/comment/${encodeURIComponent(taskId)}`, {
    method: "GET",
  });
}

async function createComment(config, taskId, content) {
  assertConfigured(config);
  return apiJson(config.baseUrl, config.apiKey, `/api/comment/${encodeURIComponent(taskId)}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

async function listActivities(config, taskId) {
  assertConfigured(config);
  return apiJson(config.baseUrl, config.apiKey, `/api/activity/${encodeURIComponent(taskId)}`, {
    method: "GET",
  });
}

const PRIORITIES = ["no-priority", "low", "medium", "high", "urgent"];

/**
 * @param {object} existing
 * @param {object} patch
 */
function buildFullTaskUpdateBody(existing, patch) {
  const positionRaw = patch.position ?? existing.position;
  const position =
    typeof positionRaw === "number"
      ? positionRaw
      : typeof positionRaw === "string"
        ? Number(positionRaw)
        : Number.NaN;
  if (!Number.isFinite(position)) {
    throw new Error("Falta position numérica en la tarea.");
  }
  const title = patch.title ?? existing.title;
  if (!title) throw new Error("Falta título.");
  const description =
    patch.description !== undefined
      ? patch.description === null
        ? ""
        : String(patch.description)
      : existing.description == null
        ? ""
        : String(existing.description);
  const status = patch.status ?? existing.status;
  if (!status) throw new Error("Falta estado.");
  const priorityRaw = patch.priority ?? existing.priority;
  if (!priorityRaw || !PRIORITIES.includes(priorityRaw)) {
    throw new Error("Prioridad inválida.");
  }
  const projectId = patch.projectId ?? existing.projectId;
  if (!projectId) throw new Error("Falta projectId.");
  const userId =
    patch.userId !== undefined
      ? patch.userId === null
        ? ""
        : patch.userId
      : existing.userId;

  /** @type {Record<string, unknown>} */
  const body = {
    title,
    description,
    status,
    priority: priorityRaw,
    projectId,
    position,
  };

  const startDate = patch.startDate !== undefined ? patch.startDate : existing.startDate;
  const dueDate = patch.dueDate !== undefined ? patch.dueDate : existing.dueDate;
  if (startDate !== undefined && startDate !== null && startDate !== "") {
    body.startDate = startDate;
  }
  if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
    body.dueDate = dueDate;
  }
  if (userId !== undefined) body.userId = userId || "";
  return body;
}

/**
 * @param {object} config
 * @param {string} taskId
 * @param {object} patch
 */
async function updateTask(config, taskId, patch) {
  assertConfigured(config);
  const existing = await getTask(config, taskId);
  const body = buildFullTaskUpdateBody(existing, patch);
  return apiJson(config.baseUrl, config.apiKey, `/api/task/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function listWorkspaceLabels(config, workspaceId) {
  assertConfigured(config);
  return apiJson(
    config.baseUrl,
    config.apiKey,
    `/api/label/workspace/${encodeURIComponent(workspaceId)}`,
    { method: "GET" },
  );
}

async function getGithubIntegration(config, projectId) {
  assertConfigured(config);
  const id = projectId || config.projectId;
  if (!id) return null;
  try {
    return await apiJson(
      config.baseUrl,
      config.apiKey,
      `/api/github-integration/project/${encodeURIComponent(id)}`,
      { method: "GET" },
    );
  } catch {
    return null;
  }
}

function taskBoardUrl(config, workspaceId, projectId) {
  const path = config.dashboardPath
    .replace("{workspaceId}", workspaceId)
    .replace("{projectId}", projectId);
  return `${config.baseUrl}${path}`;
}

module.exports = {
  getConfig,
  listWorkspaces,
  listProjects,
  getProject,
  listTasks,
  getTask,
  updateTaskStatus,
  updateTaskAssignee,
  updateTaskPriority,
  getWorkspaceMembers,
  listComments,
  createComment,
  listActivities,
  updateTask,
  listWorkspaceLabels,
  getGithubIntegration,
  taskBoardUrl,
};
