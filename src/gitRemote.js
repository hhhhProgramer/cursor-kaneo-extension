"use strict";

/**
 * Git remotes: GitHub, GitLab (SaaS + self-hosted), Gitea/Forgejo y genérico.
 * @typedef {{ host: string, ownerPath: string, repo: string, provider: string, webBase: string, projectPath: string }} GitRemote
 */

/**
 * @param {string} remoteUrl
 * @param {{ provider?: string, webBaseUrl?: string }} [opts]
 * @returns {GitRemote | null}
 */
function parseRemote(remoteUrl, opts = {}) {
  if (!remoteUrl) return null;
  const s = String(remoteUrl).trim();
  let host = "";
  let path = "";

  let m = s.match(/^git@([^:]+):(.+?)(?:\.git)?$/i);
  if (m) {
    host = m[1].toLowerCase();
    path = m[2];
  } else {
    m = s.match(/^(?:https?:\/\/)([^/]+)\/(.+?)(?:\.git)?\/?$/i);
    if (!m) return null;
    host = m[1].toLowerCase();
    path = m[2];
  }

  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const repo = parts.pop();
  const ownerPath = parts.join("/");
  const projectPath = ownerPath ? `${ownerPath}/${repo}` : repo;

  const overrideProvider = (opts.provider || "").toLowerCase();
  const provider =
    overrideProvider && overrideProvider !== "auto"
      ? overrideProvider
      : detectProvider(host, path);

  const webBase = (opts.webBaseUrl || "").replace(/\/$/, "") || defaultWebBase(host, s);

  return { host, ownerPath, repo, provider, webBase, projectPath };
}

/**
 * @param {string} host
 * @param {string} path
 */
function detectProvider(host, path) {
  if (/^(www\.)?github\.com$/i.test(host)) return "github";
  if (/^(www\.)?gitlab\.com$/i.test(host) || host.includes("gitlab")) return "gitlab";
  if (/^(www\.)?(gitea\.com|codeberg\.org)$/i.test(host)) return "gitea";
  if (/^(www\.)?bitbucket\.org$/i.test(host)) return "bitbucket";
  if (path.includes("/-/") || host.includes("forgejo")) return "gitlab";
  return "generic";
}

/**
 * @param {string} host
 * @param {string} originalUrl
 */
function defaultWebBase(host, originalUrl) {
  if (/^https?:\/\//i.test(originalUrl)) {
    const m = originalUrl.match(/^(https?:\/\/[^/]+)/i);
    if (m) return m[1].replace(/\/$/, "");
  }
  return `https://${host}`;
}

/**
 * @param {string} branchName
 */
function encodeBranchPath(branchName) {
  return String(branchName)
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/**
 * @param {string} branchName
 */
function encodeBranchQuery(branchName) {
  return encodeURIComponent(branchName);
}

/**
 * @param {GitRemote} remote
 * @param {string} branchName
 */
function branchWebUrl(remote, branchName) {
  if (!remote || !branchName) return null;
  const ref = encodeBranchPath(branchName);
  const base = `${remote.webBase}/${remote.projectPath}`;

  switch (remote.provider) {
    case "github":
    case "generic":
      return `${base}/tree/${ref}`;
    case "gitlab":
      return `${base}/-/tree/${ref}`;
    case "gitea":
      return `${base}/src/branch/${ref}`;
    case "bitbucket":
      return `${base}/src/${ref}`;
    default:
      return `${base}/-/tree/${ref}`;
  }
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
 * @param {GitRemote} remote
 * @param {string} baseBranch
 * @param {string} headBranch
 */
function mergeRequestNewUrl(remote, baseBranch, headBranch) {
  if (!remote || !headBranch) return null;
  const base = normalizeBaseRef(baseBranch);
  const headPath = encodeBranchPath(headBranch);
  const headQuery = encodeBranchQuery(headBranch);
  const root = `${remote.webBase}/${remote.projectPath}`;

  switch (remote.provider) {
    case "github":
      return `${root}/compare/${encodeURIComponent(base)}...${headPath}?expand=1`;
    case "gitlab":
      return `${root}/-/merge_requests/new?merge_request[source_branch]=${headQuery}&merge_request[target_branch]=${encodeURIComponent(base)}`;
    case "gitea":
      return `${root}/compare/${encodeURIComponent(base)}...${headPath}`;
    case "bitbucket":
      return `${root}/pull-requests/new?source=${headQuery}&dest=${encodeURIComponent(base)}`;
    default:
      return `${root}/-/merge_requests/new?merge_request[source_branch]=${headQuery}&merge_request[target_branch]=${encodeURIComponent(base)}`;
  }
}

/**
 * @param {string} provider
 */
function providerLabel(provider) {
  switch (provider) {
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab";
    case "gitea":
      return "Gitea";
    case "bitbucket":
      return "Bitbucket";
    default:
      return "Git";
  }
}

/**
 * @param {string} remoteUrl
 * @param {string} branchName
 * @param {{ provider?: string, webBaseUrl?: string }} [opts]
 */
async function findOpenMergeRequest(remoteUrl, branchName, opts = {}) {
  const remote = parseRemote(remoteUrl, opts);
  if (!remote || !branchName) return null;

  if (remote.provider === "github") {
    return findGithubPullRequest(remote, branchName);
  }
  if (remote.provider === "gitlab") {
    return findGitlabMergeRequest(remote, branchName);
  }
  return null;
}

/**
 * @param {GitRemote} remote
 * @param {string} branchName
 */
async function findGithubPullRequest(remote, branchName) {
  const owner = remote.ownerPath.split("/").pop() || remote.ownerPath;
  const head = `${owner}:${branchName}`;
  const apiUrl = `https://api.github.com/repos/${remote.ownerPath}/${remote.repo}/pulls?state=open&head=${encodeURIComponent(head)}`;
  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "kaneo-cursor-extension" },
    });
    if (!res.ok) return null;
    const pulls = await res.json();
    if (Array.isArray(pulls) && pulls[0]?.html_url) {
      return { number: pulls[0].number, url: pulls[0].html_url };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {GitRemote} remote
 * @param {string} branchName
 */
async function findGitlabMergeRequest(remote, branchName) {
  const projectId = encodeURIComponent(remote.projectPath);
  const apiBase = `${remote.webBase}/api/v4`;
  const apiUrl = `${apiBase}/projects/${projectId}/merge_requests?source_branch=${encodeBranchQuery(branchName)}&state=opened`;
  try {
    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "kaneo-cursor-extension" },
    });
    if (!res.ok) return null;
    const mrs = await res.json();
    if (Array.isArray(mrs) && mrs[0]?.web_url) {
      return { number: mrs[0].iid, url: mrs[0].web_url };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * @param {object} params
 * @param {string} params.remoteUrl
 * @param {string} params.branchName
 * @param {string} [params.baseRef]
 * @param {boolean} [params.onOrigin]
 * @param {string} [params.provider]
 * @param {string} [params.webBaseUrl]
 */
async function resolveMergeRequestUrl({ remoteUrl, branchName, baseRef, onOrigin, provider, webBaseUrl }) {
  if (!remoteUrl || !branchName) return null;
  const opts = { provider, webBaseUrl };
  const existing = await findOpenMergeRequest(remoteUrl, branchName, opts);
  if (existing) return existing.url;
  if (!onOrigin) return null;
  const remote = parseRemote(remoteUrl, opts);
  if (!remote) return null;
  return mergeRequestNewUrl(remote, baseRef || "main", branchName);
}

/**
 * @param {string} treeOrBranchUrl
 * @returns {string | null}
 */
function remoteUrlFromWebUrl(treeOrBranchUrl) {
  const s = String(treeOrBranchUrl || "").trim();
  let m = s.match(/^(https?:\/\/[^/]+)\/(.+?)\/(?:tree|src\/branch|-\/tree)\//i);
  if (m) return `${m[1]}/${m[2]}.git`;
  m = s.match(/^(https?:\/\/[^/]+)\/(.+?)\/src\//i);
  if (m) return `${m[1]}/${m[2]}.git`;
  return null;
}

/**
 * @param {string} webUrl
 * @returns {string | null}
 */
function branchNameFromWebUrl(webUrl) {
  const s = String(webUrl || "");
  let m = s.match(/\/(?:tree|src\/branch|-\/tree)\/([^?#]+)/i);
  if (!m) m = s.match(/\/src\/([^?#/]+)/i);
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

// --- backward-compatible aliases ---
function parseGithubRepo(remoteUrl) {
  const r = parseRemote(remoteUrl, { provider: "github" });
  if (!r || r.provider !== "github") {
    const auto = parseRemote(remoteUrl);
    if (!auto || auto.provider !== "github") return null;
    return { owner: auto.ownerPath, repo: auto.repo };
  }
  return { owner: r.ownerPath, repo: r.repo };
}

function githubBranchUrl(remoteUrl, branchName, opts) {
  const remote = parseRemote(remoteUrl, opts);
  return remote ? branchWebUrl(remote, branchName) : null;
}

function githubCompareUrl(remoteUrl, baseBranch, headBranch, opts) {
  const remote = parseRemote(remoteUrl, opts);
  return remote ? mergeRequestNewUrl(remote, baseBranch, headBranch) : null;
}

function resolvePullRequestUrl(params) {
  return resolveMergeRequestUrl(params);
}

module.exports = {
  parseRemote,
  detectProvider,
  branchWebUrl,
  mergeRequestNewUrl,
  providerLabel,
  findOpenMergeRequest,
  resolveMergeRequestUrl,
  remoteUrlFromWebUrl,
  branchNameFromWebUrl,
  normalizeBaseRef,
  parseGithubRepo,
  githubBranchUrl,
  githubCompareUrl,
  resolvePullRequestUrl,
};
