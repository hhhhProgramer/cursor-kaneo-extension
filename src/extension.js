"use strict";

const kaneo = require("./kaneoClient");
const { KaneoBoardProvider } = require("./boardWebview");
const { StartWorkPanelManager } = require("./startWorkPanel");

/**
 * @param {import('vscode').ExtensionContext} context
 */
function activate(context) {
  const vscode = require("vscode");

  try {
    const board = new KaneoBoardProvider(context);

    const startWorkPanels = new StartWorkPanelManager(
      context,
      () => board,
      async () => board.refresh(),
    );

    board.setOpenStartWorkHandler((taskId) => startWorkPanels.open(taskId));

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider("kaneo.board", board, {
        webviewOptions: { retainContextWhenHidden: true },
      }),
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("kaneo.focus", async () => {
        await vscode.commands.executeCommand("kaneo.board.focus");
      }),
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("kaneo.refresh", async () => {
        await board.refresh();
      }),
    );

  context.subscriptions.push(
    vscode.commands.registerCommand("kaneo.selectProject", async () => {
      await selectProjectInteractive();
      await board.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("kaneo.startWork", async () => {
      const tasks = board.board?.allTasks || [];
      if (!tasks.length) {
        vscode.window.showWarningMessage("No hay tareas. Actualiza el panel Kaneo.");
        return;
      }
      const pick = await vscode.window.showQuickPick(
        tasks.map((t) => ({
          label: `#${t.number ?? "?"} ${t.title}`,
          description: t.status,
          id: t.id,
        })),
        { title: "Kaneo: Start Work" },
      );
      if (pick) await startWorkPanels.open(pick.id);
    }),
  );

  const cfg = kaneo.getConfig();
  if (!cfg.apiKey && !context.globalState.get("kaneo.apiKeyWarned")) {
    context.globalState.update("kaneo.apiKeyWarned", true);
    vscode.window
      .showWarningMessage("Kaneo: configura kaneo.apiKey (o API_KEY).", "Ajustes")
      .then((c) => {
        if (c === "Ajustes") {
          vscode.commands.executeCommand("workbench.action.openSettings", "kaneo.apiKey");
        }
      });
  }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    vscode.window.showErrorMessage(`Kaneo extension no pudo activarse: ${msg}`);
    console.error("[kaneo-branches]", e);
  }
}

async function selectProjectInteractive() {
  const vscode = require("vscode");
  const config = kaneo.getConfig();

  try {
    const workspaces = await kaneo.listWorkspaces(config);
    if (!workspaces?.length) {
      vscode.window.showErrorMessage("No hay workspaces. ¿VPN activa?");
      return;
    }

    let workspaceId = config.workspaceId;
    if (!workspaceId || workspaces.length > 1) {
      const wsPick = await vscode.window.showQuickPick(
        workspaces.map((w) => ({ label: w.name, description: w.slug, id: w.id })),
        { title: "Kaneo: workspace" },
      );
      if (!wsPick) return;
      workspaceId = wsPick.id;
      await vscode.workspace
        .getConfiguration("kaneo")
        .update("workspaceId", workspaceId, vscode.ConfigurationTarget.Global);
    }

    const projects = await kaneo.listProjects(config, workspaceId);
    if (!projects?.length) {
      vscode.window.showErrorMessage("Sin proyectos.");
      return;
    }

    const projPick = await vscode.window.showQuickPick(
      projects.map((p) => ({ label: p.name, description: p.slug, id: p.id })),
      { title: "Kaneo: proyecto" },
    );
    if (!projPick) return;

    await vscode.workspace
      .getConfiguration("kaneo")
      .update("projectId", projPick.id, vscode.ConfigurationTarget.Global);
    await vscode.workspace
      .getConfiguration("kaneo")
      .update("workspaceId", workspaceId, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(`Proyecto «${projPick.label}» guardado.`);
  } catch (e) {
    vscode.window.showErrorMessage(
      `${e instanceof Error ? e.message : e}. VPN + API key.`,
    );
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
