"use strict";

const kaneo = require("./kaneoClient");

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {string} workspaceId
 */
async function resolveCurrentUserId(context, workspaceId) {
  const vscode = require("vscode");
  const cfg = vscode.workspace.getConfiguration("kaneo");

  const fromSettings = (cfg.get("userId") || "").trim();
  if (fromSettings) return fromSettings;

  const cached = context.globalState.get("kaneo.userId");
  if (cached) return cached;

  const email = (cfg.get("userEmail") || "").trim();
  let members = [];
  try {
    members = await kaneo.getWorkspaceMembers(kaneo.getConfig(), workspaceId);
  } catch {
    return null;
  }

  if (email) {
    const match = members.find((m) => (m.email || "").toLowerCase() === email.toLowerCase());
    if (match?.id) return match.id;
  }

  if (members.length === 1 && members[0].id) {
    await cacheUserId(context, cfg, members[0].id);
    return members[0].id;
  }

  if (!members.length) return null;

  const pick = await vscode.window.showQuickPick(
    members.map((m) => ({
      label: m.name || m.email || m.id,
      description: m.email || m.role || "",
      id: m.id,
    })),
    {
      title: "Kaneo: asignarte tareas al Start Work",
      placeHolder: "Elige tu usuario en el workspace",
    },
  );
  if (!pick?.id) return null;

  await cacheUserId(context, cfg, pick.id);
  return pick.id;
}

/**
 * @param {import('vscode').ExtensionContext} context
 * @param {import('vscode').WorkspaceConfiguration} cfg
 * @param {string} userId
 */
async function cacheUserId(context, cfg, userId) {
  const vscode = require("vscode");
  await context.globalState.update("kaneo.userId", userId);
  await cfg.update("userId", userId, vscode.ConfigurationTarget.Global);
}

module.exports = { resolveCurrentUserId };
