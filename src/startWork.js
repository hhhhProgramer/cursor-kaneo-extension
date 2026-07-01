"use strict";

const vscode = require("vscode");
const kaneo = require("./kaneoClient");
const { buildBranchName, createAndCheckoutBranch } = require("./branch");
const { getGitInfo, pushBranch } = require("./gitInfo");
const { getGitWorkspaceFolder } = require("./gitWorkspace");

/**
 * @param {object} opts
 * @param {object} opts.task
 * @param {object | null} opts.project
 * @param {object} [opts.git]
 * @param {string} [opts.workspaceId]
 * @param {import('vscode').ExtensionContext} [opts.context]
 * @param {object} msg
 */
async function executeStartWork({ task, project, git, workspaceId, context }, msg) {
  const config = kaneo.getConfig();
  const { resolveCurrentUserId } = require("./userContext");
  const folder = getGitWorkspaceFolder();
  if (!folder) {
    return { ok: false, message: "Abre una carpeta con repositorio Git." };
  }

  const prefix = String(msg.prefix || "feature").replace(/\/$/, "");
  let branchName;
  if (msg.branchSuffix) {
    const suffix = String(msg.branchSuffix).replace(/^\//, "").trim();
    branchName = suffix.startsWith(`${prefix}/`) ? suffix : `${prefix}/${suffix}`;
  } else {
    branchName = buildBranchName({
      pattern: config.branchPattern,
      prefix,
      projectSlug: project?.slug || "task",
      taskNumber: task.number ?? task.id,
      taskTitle: task.title,
      titleMax: config.titleSlugMaxLength,
    });
  }
  branchName = branchName
    .replace(/\/+/g, "/")
    .replace(/[^a-zA-Z0-9/._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/-/g, "/");

  try {
    const baseRef = (msg.baseBranch || git?.defaultBase || "main").trim();
    const remoteName = (msg.remoteName || git?.originName || "origin").trim();
    const { created } = await createAndCheckoutBranch(folder, branchName, baseRef);

    if (msg.push) {
      const g = git?.originUrl ? git : await getGitInfo(folder);
      await pushBranch(folder, branchName, remoteName || g.originName || "origin");
    }

    if (msg.transition && task.status !== config.inProgressStatus) {
      await kaneo.updateTaskStatus(config, task.id, config.inProgressStatus);

      if (config.assignToMeOnStartWork && context && workspaceId) {
        const userId = await resolveCurrentUserId(context, workspaceId);
        if (userId) {
          await kaneo.updateTaskAssignee(config, task.id, userId);
        }
      }
    }

    const parts = [];
    parts.push(created ? `Rama creada: ${branchName}` : `Checkout: ${branchName}`);
    if (baseRef) parts.push(`desde ${baseRef}`);
    if (msg.push) parts.push(`push → ${remoteName}`);
    if (msg.transition) {
      parts.push(`→ ${config.inProgressStatus}`);
      if (config.assignToMeOnStartWork) parts.push("asignada a ti");
    }
    vscode.window.showInformationMessage(parts.join(" · "));
    return { ok: true, message: parts.join(" · "), branchName };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    vscode.window.showErrorMessage(`Start Work: ${message}`);
    return { ok: false, message };
  }
}

module.exports = { executeStartWork };
