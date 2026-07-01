"use strict";

const gitRemote = require("./gitRemote");

const STORAGE_KEY = "kaneo.branchLinks";

function readAll(context) {
  return context.globalState.get(STORAGE_KEY) || {};
}

function getBranchLink(context, taskId) {
  const all = readAll(context);
  return all[taskId] || null;
}

async function setBranchLink(context, taskId, link) {
  const all = { ...readAll(context), [taskId]: { ...link, linkedAt: new Date().toISOString() } };
  await context.globalState.update(STORAGE_KEY, all);
  return all[taskId];
}

function branchMatchesTask(branchName, task, projectSlug) {
  if (!branchName || !task) return false;
  const slug = String(projectSlug || "task").toLowerCase();
  const num = task.number != null ? String(task.number) : "";
  if (!num) return false;
  const b = String(branchName).toLowerCase();
  const needle = `${slug}-${num}`;
  return b === needle || b.endsWith(`/${needle}`) || b.includes(`${needle}-`) || b.includes(`/${needle}/`);
}

/**
 * @param {import('vscode').ExtensionContext} [context]
 */
function getGitRemoteOpts(context) {
  if (!context) return {};
  const vscode = require("vscode");
  const cfg = vscode.workspace.getConfiguration("kaneo");
  return {
    provider: cfg.get("gitProvider") || "auto",
    webBaseUrl: (cfg.get("gitWebBaseUrl") || "").trim(),
  };
}

function formatBranchComment({
  branchName,
  remoteName,
  remoteUrl,
  baseRef,
  repoPath,
  branchWebUrl,
  githubUrl,
  pullRequestUrl,
  gitProvider,
}) {
  const opts = { provider: gitProvider };
  const remote = gitRemote.parseRemote(remoteUrl, opts);
  const provider = remote?.provider || "generic";
  const label = gitRemote.providerLabel(provider);
  const webUrl = branchWebUrl || githubUrl || gitRemote.branchWebUrl(remote, branchName);

  const lines = ["🌿 **Rama de desarrollo** (Cursor / Kaneo)", ""];
  if (webUrl) {
    lines.push(`- **Branch:** [\`${branchName}\`](${webUrl})`);
    lines.push(`- **${label}:** [Abrir rama en ${label}](${webUrl})`);
  } else {
    lines.push(`- **Branch:** \`${branchName}\``);
  }
  if (pullRequestUrl) {
    const mrLabel = provider === "gitlab" ? "Merge Request" : "Pull Request";
    lines.push(`- **MR/PR:** [Abrir ${mrLabel}](${pullRequestUrl})`);
  }
  if (baseRef) lines.push(`- **Base:** \`${baseRef}\``);
  if (remoteName) {
    lines.push(
      remoteUrl
        ? `- **Remote:** \`${remoteName}\` → ${remoteUrl}`
        : `- **Remote:** \`${remoteName}\``,
    );
  }
  if (repoPath) lines.push(`- **Repo:** \`${repoPath}\``);
  lines.push(
    "",
    "> Con la integración Git de Kaneo, al hacer **push** de esta rama se enlaza la actividad de desarrollo y pueden aplicarse transiciones automáticas.",
  );
  return lines.join("\n");
}

const BRANCH_COMMENT_RE = /rama de desarrollo.*\(cursor\s*\/\s*kaneo\)/i;

function parseBranchFromComment(content) {
  const text = String(content || "");
  if (!BRANCH_COMMENT_RE.test(text)) return null;

  /** @type {Record<string, string>} */
  const result = {};

  const branchMd = text.match(/\*\*Branch:\*\*\s*\[`([^`]+)`\]\(([^)]+)\)/i);
  const branchPlain = text.match(/\*\*Branch:\*\*\s*`([^`]+)`/i);
  if (branchMd) {
    result.branchName = branchMd[1].trim();
    result.branchWebUrl = branchMd[2].trim();
    result.githubUrl = result.branchWebUrl;
    const fromTree = gitRemote.branchNameFromWebUrl(result.branchWebUrl);
    if (fromTree && !result.branchName.includes("/") && fromTree.includes("/")) {
      result.branchName = fromTree;
    }
    const remote = gitRemote.remoteUrlFromWebUrl(result.branchWebUrl);
    if (remote) result.remoteUrl = remote;
  } else if (branchPlain) {
    result.branchName = branchPlain[1].trim();
  }

  const pr = text.match(/\*\*MR\/PR:\*\*\s*\[[^\]]*\]\(([^)]+)\)/i) || text.match(/\*\*PR:\*\*\s*\[[^\]]*\]\(([^)]+)\)/i);
  if (pr) result.pullRequestUrl = pr[1].trim();

  const base = text.match(/\*\*Base:\*\*\s*`([^`]+)`/i);
  if (base) result.baseRef = base[1].trim();

  const remote = text.match(/\*\*Remote:\*\*\s*`([^`]+)`(?:\s*→\s*(\S+))?/i);
  if (remote) {
    result.remoteName = remote[1].trim();
    if (remote[2]) result.remoteUrl = remote[2].trim();
  }

  const repo = text.match(/\*\*Repo:\*\*\s*`([^`]+)`/i);
  if (repo) result.repoPath = repo[1].trim();

  const hostLine = text.match(/\*\*(?:GitHub|GitLab|Gitea|Bitbucket|Git):\*\*\s*\[[^\]]*\]\(([^)]+)\)/i);
  if (hostLine) {
    if (!result.branchWebUrl) result.branchWebUrl = hostLine[1].trim();
    if (!result.githubUrl) result.githubUrl = hostLine[1].trim();
    if (!result.remoteUrl) {
      const remoteFromWeb = gitRemote.remoteUrlFromWebUrl(hostLine[1]);
      if (remoteFromWeb) result.remoteUrl = remoteFromWeb;
    }
  }

  if (!result.branchName) return null;
  if (!result.branchWebUrl && result.remoteUrl) {
    const remote = gitRemote.parseRemote(result.remoteUrl);
    result.branchWebUrl = remote ? gitRemote.branchWebUrl(remote, result.branchName) : undefined;
    result.githubUrl = result.branchWebUrl;
  }

  return result;
}

function parseBranchFromComments(comments) {
  if (!Array.isArray(comments) || !comments.length) return null;

  const sorted = [...comments].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return tb - ta;
  });

  for (const c of sorted) {
    const parsed = parseBranchFromComment(c.content || "");
    if (parsed) {
      return {
        ...parsed,
        fromComment: true,
        commentId: c.id,
        linkedAt: c.createdAt || undefined,
      };
    }
  }
  return null;
}

module.exports = {
  getBranchLink,
  setBranchLink,
  branchMatchesTask,
  getGitRemoteOpts,
  formatBranchComment,
  parseBranchFromComment,
  parseBranchFromComments,
  ...gitRemote,
};
