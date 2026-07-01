"use strict";

const { getGitWorkspaceFolder } = require("./gitWorkspace");

/**
 * @param {string} text
 * @param {number} maxLen
 */
function slugify(text, maxLen = 40) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen)
    .replace(/-+$/g, "");
}

/**
 * @param {object} opts
 * @param {string} opts.pattern
 * @param {string} [opts.prefix]
 * @param {string} opts.projectSlug
 * @param {number|string} opts.taskNumber
 * @param {string} opts.taskTitle
 * @param {number} opts.titleMax
 */
function buildBranchName({ pattern, prefix, projectSlug, taskNumber, taskTitle, titleMax }) {
  const slug = String(projectSlug || "task").toLowerCase();
  const title = slugify(taskTitle, titleMax);
  let name = pattern
    .replace(/\{slug\}/gi, slug)
    .replace(/\{number\}/g, String(taskNumber))
    .replace(/\{title\}/g, title || "task");

  if (prefix) {
    const p = prefix.endsWith("/") ? prefix : `${prefix}/`;
    name = `${p}${name}`;
  }

  name = name
    .replace(/\/+/g, "/")
    .replace(/[^a-zA-Z0-9/._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/-+/g, "/")
    .replace(/\/$/g, "");

  if (!name || name.length > 200) {
    throw new Error(`Nombre de rama inválido: ${name || "(vacío)"}`);
  }
  return name;
}

/**
 * @param {import('vscode').Uri} folderUri
 * @param {string} branchName
 * @param {string} [baseRef]
 */
async function createAndCheckoutBranch(folderUri, branchName, baseRef) {
  const vscode = require("vscode");
  const { findRepository, getGitApi } = require("./gitInfo");
  const api = await getGitApi();
  if (!api) throw new Error("Extensión Git de VS Code no disponible.");
  const repo = findRepository(api, folderUri);
  if (!repo) {
    throw new Error("No hay repositorio Git en el workspace.");
  }

  const refs = await repo.getRefs();
  const exists = refs.some((r) => r.name === branchName || r.name === `refs/heads/${branchName}`);
  if (exists) {
    await repo.checkout(branchName);
    return { created: false, branchName };
  }

  const base = (baseRef || "").trim() || undefined;
  await repo.createBranch(branchName, true, base);
  return { created: true, branchName, baseRef: base };
}


module.exports = {
  slugify,
  buildBranchName,
  createAndCheckoutBranch,
};
