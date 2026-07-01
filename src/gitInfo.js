"use strict";

const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

/**
 * @returns {Promise<import('@vscode/git-extension').API | null>}
 */
async function getGitApi() {
  const vscode = require("vscode");
  const gitExt = vscode.extensions.getExtension("vscode.git");
  if (!gitExt) return null;
  const git = gitExt.isActive ? gitExt.exports : await gitExt.activate();
  return git.getAPI(1);
}

/**
 * @param {import('@vscode/git-extension').API} api
 * @param {import('vscode').Uri} [folderUri]
 */
function findRepository(api, folderUri) {
  if (folderUri) {
    const direct = api.getRepository(folderUri);
    if (direct) return direct;
    const fp = folderUri.fsPath;
    const nested = api.repositories.find(
      (r) => fp === r.rootUri.fsPath || fp.startsWith(`${r.rootUri.fsPath}/`),
    );
    if (nested) return nested;
  }
  return api.repositories[0] || null;
}

/**
 * @param {string} cwd
 */
async function gitCli(cwd, args) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd, maxBuffer: 1024 * 1024 });
    return stdout.trim();
  } catch {
    return "";
  }
}

/**
 * @param {string} cwd
 */
async function gitRemotesCli(cwd) {
  const out = await gitCli(cwd, ["remote", "-v"]);
  if (!out) return [];
  /** @type {Map<string, { fetchUrl: string, pushUrl: string }>} */
  const map = new Map();
  for (const line of out.split("\n")) {
    const m = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!m) continue;
    const [, name, url, kind] = m;
    const entry = map.get(name) || { fetchUrl: "", pushUrl: "" };
    if (kind === "fetch") entry.fetchUrl = url;
    if (kind === "push") entry.pushUrl = url;
    map.set(name, entry);
  }
  return [...map.entries()].map(([name, urls]) => ({
    name,
    fetchUrl: urls.fetchUrl || urls.pushUrl,
    pushUrl: urls.pushUrl || urls.fetchUrl,
  }));
}

/**
 * @param {string} cwd
 */
async function gitBaseBranchesCli(cwd) {
  const out = await gitCli(cwd, ["branch", "-a", "--format=%(refname:short)"]);
  if (!out) return [];
  const seen = new Set();
  const bases = [];
  for (const raw of out.split("\n")) {
    const name = raw.trim().replace(/^\* /, "");
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const isRemote = name.includes("/") && !name.startsWith("feature/") && !name.startsWith("fix/");
    // include origin/main style and local branches
    bases.push({
      value: name,
      label: name,
      kind: name.startsWith("origin/") || name.startsWith("upstream/") ? "remote" : "local",
    });
  }
  // Sort: origin/main first, then origin/*, then locals
  bases.sort((a, b) => {
    const score = (/** @type {string} */ v) => {
      if (v === "origin/main") return 0;
      if (v.startsWith("origin/")) return 1;
      if (v === "main") return 2;
      if (v === "master") return 3;
      return 10;
    };
    return score(a.value) - score(b.value) || a.value.localeCompare(b.value);
  });
  return bases;
}

/**
 * @param {import('vscode').Uri} [folderUri]
 */
async function getGitInfo(folderUri) {
  const empty = {
    hasRepo: false,
    repoPath: "",
    originUrl: "",
    originName: "origin",
    currentBranch: "",
    defaultBase: "main",
    remotes: [],
    baseBranches: [{ value: "main", label: "main", kind: "local" }],
  };

  const api = await getGitApi();
  const repo = api ? findRepository(api, folderUri) : null;

  let cwd = repo?.rootUri.fsPath || folderUri?.fsPath || "";
  if (!cwd) return empty;

  // Remotes: API state → getRemotes → git CLI
  let remotes = [];
  if (repo) {
    const fromState = repo.state.remotes || [];
    if (fromState.some((r) => r.fetchUrl || r.pushUrl)) {
      remotes = fromState.map((r) => ({
        name: r.name,
        fetchUrl: r.fetchUrl || "",
        pushUrl: r.pushUrl || "",
      }));
    } else {
      try {
        const fetched = await repo.getRemotes();
        remotes = fetched.map((r) => ({
          name: r.name,
          fetchUrl: r.fetchUrl || "",
          pushUrl: r.pushUrl || "",
        }));
      } catch {
        // fallback CLI
      }
    }
    if (!remotes.some((r) => r.fetchUrl || r.pushUrl)) {
      remotes = await gitRemotesCli(cwd);
    }
  } else {
    remotes = await gitRemotesCli(cwd);
    if (remotes.length) {
      const root = await gitCli(cwd, ["rev-parse", "--show-toplevel"]);
      if (root) cwd = root;
    }
  }

  const origin = remotes.find((r) => r.name === "origin") || remotes[0];
  const originUrl = origin?.pushUrl || origin?.fetchUrl || "";
  const originName = origin?.name || "origin";

  let currentBranch = repo?.state.HEAD?.name || "";
  if (!currentBranch) {
    currentBranch = await gitCli(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  }

  let baseBranches = [];
  if (repo) {
    try {
      const refs = await repo.getRefs();
      const seen = new Set();
      for (const ref of refs) {
        const name = ref.name;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        baseBranches.push({
          value: name,
          label: name,
          kind: name.includes("/") ? "remote" : "local",
        });
      }
    } catch {
      // CLI fallback
    }
  }
  if (baseBranches.length < 2) {
    baseBranches = await gitBaseBranchesCli(cwd);
  }
  if (!baseBranches.length) {
    baseBranches = [{ value: "main", label: "main", kind: "local" }];
  }

  const hasOriginMain = baseBranches.some((b) => b.value === "origin/main");
  const hasMain = baseBranches.some((b) => b.value === "main");
  const defaultBase = hasOriginMain
    ? "origin/main"
    : hasMain
      ? "main"
      : baseBranches[0].value;

  return {
    hasRepo: Boolean(repo || originUrl || currentBranch),
    repoPath: cwd,
    originUrl,
    originName,
    currentBranch,
    defaultBase,
    remotes: remotes.map((r) => ({
      name: r.name,
      url: r.pushUrl || r.fetchUrl || "",
    })),
    baseBranches,
  };
}

/**
 * @param {import('vscode').Uri} folderUri
 * @param {string} branchName
 * @param {string} remoteName
 */
async function pushBranch(folderUri, branchName, remoteName = "origin") {
  const api = await getGitApi();
  if (!api) throw new Error("Extensión Git no disponible.");
  const repo = findRepository(api, folderUri);
  if (!repo) throw new Error("Sin repositorio Git.");
  await repo.push(remoteName, branchName, true);
}

/**
 * @param {import('vscode').Uri} folderUri
 * @param {string} branchName
 * @param {string} [remoteName]
 */
async function branchExistsOnRemote(folderUri, branchName, remoteName = "origin") {
  const api = await getGitApi();
  const repo = findRepository(api, folderUri);
  const cwd = repo?.rootUri.fsPath || folderUri?.fsPath || "";
  if (!cwd || !branchName) return false;
  const out = await gitCli(cwd, ["ls-remote", "--heads", remoteName, `refs/heads/${branchName}`]);
  if (out) return true;
  const out2 = await gitCli(cwd, ["ls-remote", "--heads", remoteName, branchName]);
  return Boolean(out2);
}

module.exports = { getGitInfo, pushBranch, branchExistsOnRemote, findRepository, getGitApi };
