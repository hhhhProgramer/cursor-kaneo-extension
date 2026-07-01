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
  taskBoardUrl,
};
