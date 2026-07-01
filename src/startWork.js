"use strict";

const vscode = require("vscode");
const kaneo = require("./kaneoClient");
const { buildBranchName, createAndCheckoutBranch } = require("./branch");
const { getGitInfo, pushBranch } = require("./gitInfo");
const { getGitWorkspaceFolder } = require("./gitWorkspace");
const { setBranchLink, formatBranchComment, githubBranchUrl, resolvePullRequestUrl } = require("./branchLink");
const { branchExistsOnRemote } = require("./gitInfo");

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
    const g = git?.originUrl ? git : await getGitInfo(folder);
    const remoteUrl =
      (g.remotes || []).find((r) => r.name === remoteName)?.pushUrl ||
      (g.remotes || []).find((r) => r.name === remoteName)?.fetchUrl ||
      g.originUrl ||
      "";

    const { created } = await createAndCheckoutBranch(folder, branchName, baseRef);

    if (msg.push) {
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

    const linkBranch = msg.linkBranch !== false;
    const githubUrl = githubBranchUrl(remoteUrl, branchName);
    const onOriginAfter =
      msg.push || (await branchExistsOnRemote(folder, branchName, remoteName));
    const pullRequestUrl = await resolvePullRequestUrl({
      remoteUrl,
      branchName,
      baseRef,
      onOrigin: onOriginAfter,
    });
    if (linkBranch && context) {
      if (config.storeBranchLink) {
        await setBranchLink(context, task.id, {
          branchName,
          remoteName,
          remoteUrl,
          baseRef,
          repoPath: folder.fsPath,
          githubUrl: githubUrl || undefined,
          pullRequestUrl: pullRequestUrl || undefined,
          onOrigin: onOriginAfter,
        });
      }
      if (config.commentBranchOnStartWork) {
        try {
          await kaneo.createComment(
            config,
            task.id,
            formatBranchComment({
              branchName,
              remoteName,
              remoteUrl,
              baseRef,
              repoPath: folder.fsPath,
              githubUrl: githubUrl || undefined,
              pullRequestUrl: pullRequestUrl || undefined,
            }),
          );
        } catch (e) {
          const detail = e instanceof Error ? e.message : String(e);
          vscode.window.showWarningMessage(`Rama creada, pero no se pudo comentar en Kaneo: ${detail}`);
        }
      }
    }

    const parts = [];
    parts.push(created ? `Rama creada: ${branchName}` : `Checkout: ${branchName}`);
    if (baseRef) parts.push(`desde ${baseRef}`);
    if (msg.push) parts.push(`push → ${remoteName}`);
    if (linkBranch) parts.push("vinculada en Kaneo");
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
