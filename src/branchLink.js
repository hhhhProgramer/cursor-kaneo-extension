"use strict";

const STORAGE_KEY = "kaneo.branchLinks";

/**
 * @param {import('vscode').ExtensionContext} context
 * @returns {Record<string, object>}
 */
function readAll(context) {
  return context.globalState.get(STORAGE_KEY) || {};
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} taskId
 */
function getBranchLink(context, taskId) {
  const all = readAll(context);
  return all[taskId] || null;
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} taskId
 * @param {object} link
 */
async function setBranchLink(context, taskId, link) {
  const all = { ...readAll(context), [taskId]: { ...link, linkedAt: new Date().toISOString() } };
  await context.globalState.update(STORAGE_KEY, all);
  return all[taskId];
}

/**
 * @param {string} branchName
 * @param {object} task
 * @param {string} [projectSlug]
 */
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
 * @param {string} remoteUrl
 * @returns {{ owner: string, repo: string } | null}
 */
function parseGithubRepo(remoteUrl) {
  if (!remoteUrl) return null;
  const s = String(remoteUrl).trim();
  const m = s.match(/github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?\/?$/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

/**
 * @param {string} remoteUrl
 * @param {string} branchName
 * @returns {string | null}
 */
function githubBranchUrl(remoteUrl, branchName) {
  const repo = parseGithubRepo(remoteUrl);
  if (!repo || !branchName) return null;
  const ref = String(branchName)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://github.com/${repo.owner}/${repo.repo}/tree/${ref}`;
}

/**
 * @param {string} baseRef
 */
function normalizeBaseRef(baseRef) {
  return String(baseRef || "main")
    .replace(/^origin\//, "")
    .replace(/^upstream\//, "");
}

/**
 * @param {string} remoteUrl
 * @param {string} baseBranch
 * @param {string} headBranch
 * @returns {string | null}
 */
function githubCompareUrl(remoteUrl, baseBranch, headBranch) {
  const repo = parseGithubRepo(remoteUrl);
  if (!repo || !headBranch) return null;
  const base = encodeURIComponent(normalizeBaseRef(baseBranch));
  const head = String(headBranch)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://github.com/${repo.owner}/${repo.repo}/compare/${base}...${head}?expand=1`;
}

/**
 * @param {string} remoteUrl
 * @param {string} branchName
 * @returns {Promise<{ number: number, url: string } | null>}
 */
async function findGithubPullRequest(remoteUrl, branchName) {
  const repo = parseGithubRepo(remoteUrl);
  if (!repo || !branchName) return null;
  const head = `${repo.owner}:${branchName}`;
  const apiUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/pulls?state=open&head=${encodeURIComponent(head)}`;
  try {
    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "kaneo-cursor-extension",
      },
    });
    if (!res.ok) return null;
    const pulls = await res.json();
    if (Array.isArray(pulls) && pulls[0]?.html_url) {
      return { number: pulls[0].number, url: pulls[0].html_url };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {object} opts
 * @param {string} opts.remoteUrl
 * @param {string} opts.branchName
 * @param {string} [opts.baseRef]
 * @param {boolean} [opts.onOrigin]
 */
async function resolvePullRequestUrl({ remoteUrl, branchName, baseRef, onOrigin }) {
  if (!remoteUrl || !branchName) return null;
  const existing = await findGithubPullRequest(remoteUrl, branchName);
  if (existing) return existing.url;
  if (!onOrigin) return null;
  return githubCompareUrl(remoteUrl, baseRef || "main", branchName);
}

function formatBranchComment({ branchName, remoteName, remoteUrl, baseRef, repoPath, githubUrl, pullRequestUrl }) {
  const ghUrl = githubUrl || githubBranchUrl(remoteUrl, branchName);
  const lines = ["🌿 **Rama de desarrollo** (Cursor / Kaneo)", ""];
  if (ghUrl) {
    lines.push(`- **Branch:** [\`${branchName}\`](${ghUrl})`);
    lines.push(`- **GitHub:** [Abrir rama en GitHub](${ghUrl})`);
  } else {
    lines.push(`- **Branch:** \`${branchName}\``);
  }
  if (opts.pullRequestUrl) {
    lines.push(`- **PR:** [Abrir Pull Request](${opts.pullRequestUrl})`);
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
    "> Con la integración GitHub de Kaneo, al hacer **push** de esta rama se enlaza la actividad de desarrollo y pueden aplicarse transiciones automáticas (in-progress, in-review, done).",
  );
  return lines.join("\n");
}

const BRANCH_COMMENT_RE = /rama de desarrollo.*\(cursor\s*\/\s*kaneo\)/i;

/**
 * @param {string} githubTreeUrl
 * @returns {string | null}
 */
function remoteUrlFromGithubTree(githubTreeUrl) {
  const m = String(githubTreeUrl || "").match(/https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\//i);
  if (!m) return null;
  return `https://github.com/${m[1]}/${m[2]}.git`;
}

/**
 * @param {string} githubTreeUrl
 * @returns {string | null}
 */
function branchNameFromGithubTreeUrl(githubTreeUrl) {
  const m = String(githubTreeUrl || "").match(/github\.com\/[^/]+\/[^/]+\/tree\/([^?#]+)/i);
  if (!m) return null;
  return m[1]
    .split("/")
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join("/");
}

/**
 * Extrae datos de rama del comentario publicado por Start Work.
 * @param {string} content
 * @returns {object | null}
 */
function parseBranchFromComment(content) {
  const text = String(content || "");
  if (!BRANCH_COMMENT_RE.test(text)) return null;

  /** @type {Record<string, string>} */
  const result = {};

  const branchMd = text.match(/\*\*Branch:\*\*\s*\[`([^`]+)`\]\(([^)]+)\)/i);
  const branchPlain = text.match(/\*\*Branch:\*\*\s*`([^`]+)`/i);
  if (branchMd) {
    result.branchName = branchMd[1].trim();
    result.githubUrl = branchMd[2].trim();
    const fromTree = branchNameFromGithubTreeUrl(result.githubUrl);
    if (fromTree && !result.branchName.includes("/") && fromTree.includes("/")) {
      result.branchName = fromTree;
    }
    const remote = remoteUrlFromGithubTree(result.githubUrl);
    if (remote) result.remoteUrl = remote;
  } else if (branchPlain) {
    result.branchName = branchPlain[1].trim();
  }

  const pr = text.match(/\*\*PR:\*\*\s*\[[^\]]*\]\(([^)]+)\)/i);
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

  const ghLine = text.match(/\*\*GitHub:\*\*\s*\[[^\]]*\]\(([^)]+)\)/i);
  if (ghLine) {
    if (!result.githubUrl) result.githubUrl = ghLine[1].trim();
    if (!result.remoteUrl) {
      const remoteFromGh = remoteUrlFromGithubTree(ghLine[1]);
      if (remoteFromGh) result.remoteUrl = remoteFromGh;
    }
  }

  if (!result.branchName) return null;
  if (!result.githubUrl && result.remoteUrl) {
    result.githubUrl = githubBranchUrl(result.remoteUrl, result.branchName) || undefined;
  }

  return result;
}

/**
 * Busca el comentario de rama más reciente (útil en otro equipo sin globalState local).
 * @param {object[]} comments
 * @returns {object | null}
 */
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
  parseGithubRepo,
  githubBranchUrl,
  githubCompareUrl,
  findGithubPullRequest,
  resolvePullRequestUrl,
  normalizeBaseRef,
  formatBranchComment,
  parseBranchFromComment,
  parseBranchFromComments,
  remoteUrlFromGithubTree,
};
