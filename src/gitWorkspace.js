"use strict";

/**
 * @returns {import('vscode').Uri | undefined}
 */
function getGitWorkspaceFolder() {
  const vscode = require("vscode");
  const gitExt = vscode.extensions.getExtension("vscode.git");
  if (gitExt?.isActive) {
    const api = gitExt.exports.getAPI(1);
    if (api.repositories.length > 0) {
      return api.repositories[0].rootUri;
    }
  }

  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return undefined;

  if (gitExt) {
    try {
      const git = gitExt.exports;
      const api = git.getAPI(1);
      for (const folder of folders) {
        if (api.getRepository(folder.uri)) return folder.uri;
      }
      if (api.repositories.length > 0) return api.repositories[0].rootUri;
    } catch {
      // ignore
    }
  }
  return folders[0].uri;
}

module.exports = { getGitWorkspaceFolder };
