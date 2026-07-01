"use strict";

const vscode = require("vscode");
const kaneo = require("./kaneoClient");
const { taskKey, PRIORITY_LABELS } = require("./tasks");
const { executeStartWork } = require("./startWork");
const { getTaskDetailHtml } = require("./taskDetailHtml");

class StartWorkPanelManager {
  /**
   * @param {import('vscode').ExtensionContext} context
   * @param {() => import('./boardWebview').KaneoBoardProvider} getBoard
   * @param {() => Promise<void>} onSuccess
   */
  constructor(context, getBoard, onSuccess) {
    this.context = context;
    this.getBoard = getBoard;
    this.onSuccess = onSuccess;
    /** @type {Map<string, vscode.WebviewPanel>} */
    this.panels = new Map();
    /** @type {Map<string, string>} */
    this.taskIds = new Map();
  }

  /**
   * @param {string} taskId
   */
  async open(taskId) {
    const board = this.getBoard();
    let task = (board.board?.allTasks || []).find((t) => t.id === taskId);
    if (!task) {
      try {
        task = await kaneo.getTask(kaneo.getConfig(), taskId);
      } catch {
        vscode.window.showErrorMessage("Tarea no encontrada.");
        return;
      }
    }

    const key = taskKey(task, board.board?.project?.slug);
    const existing = this.panels.get(taskId);
    if (existing) {
      existing.reveal(vscode.ViewColumn.One);
      await this.loadTaskDetail(existing, taskId);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "kaneoTaskDetail",
      key,
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    this.panels.set(taskId, panel);
    this.taskIds.set(panel, taskId);
    panel.iconPath = new vscode.ThemeIcon("info");

    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
    panel.webview.html = getTaskDetailHtml(panel.webview);

    panel.webview.onDidReceiveMessage(async (msg) => {
      try {
        await this.handleMessage(panel, taskId, msg);
      } catch (e) {
        const text = e instanceof Error ? e.message : String(e);
        panel.webview.postMessage({ type: "error", message: text });
        vscode.window.showErrorMessage(`Kaneo: ${text}`);
      }
    });

    panel.onDidDispose(() => {
      this.panels.delete(taskId);
      this.taskIds.delete(panel);
    });
  }

  /**
   * @param {vscode.WebviewPanel} panel
   * @param {string} taskId
   * @param {object} msg
   */
  async handleMessage(panel, taskId, msg) {
    const board = this.getBoard();
    const config = kaneo.getConfig();
    const workspaceId = board.workspaceId || config.workspaceId;

    switch (msg.type) {
      case "ready":
      case "refresh":
        await this.loadTaskDetail(panel, taskId);
        break;

      case "updateField": {
        if (msg.field === "status") {
          await kaneo.updateTaskStatus(config, taskId, msg.value);
        } else if (msg.field === "priority") {
          await kaneo.updateTaskPriority(config, taskId, msg.value);
        } else if (msg.field === "assignee") {
          await kaneo.updateTaskAssignee(config, taskId, msg.value || "");
        }
        await this.loadTaskDetail(panel, taskId);
        await this.onSuccess();
        break;
      }

      case "addComment": {
        await kaneo.createComment(config, taskId, msg.content);
        await this.loadTaskDetail(panel, taskId);
        break;
      }

      case "startWork": {
        const folder = require("./gitWorkspace").getGitWorkspaceFolder();
        const git = await require("./gitInfo").getGitInfo(folder);
        const task = await kaneo.getTask(config, taskId);
        const result = await executeStartWork(
          {
            task,
            project: board.board?.project,
            git,
            workspaceId,
            context: this.context,
          },
          { ...msg, taskId },
        );
        panel.webview.postMessage({ type: "startWorkDone", ...result });
        if (result.ok) {
          await this.loadTaskDetail(panel, taskId);
          await this.onSuccess();
        }
        break;
      }

      case "openInBrowser":
        await board.openTask(taskId);
        break;

      default:
        break;
    }
  }

  /**
   * @param {vscode.WebviewPanel} panel
   * @param {string} taskId
   */
  async loadTaskDetail(panel, taskId) {
    const board = this.getBoard();
    const config = kaneo.getConfig();
    const workspaceId = board.workspaceId || config.workspaceId;
    const { getGitWorkspaceFolder } = require("./gitWorkspace");
    const { getGitInfo } = require("./gitInfo");

    const folder = getGitWorkspaceFolder();
    const git = await getGitInfo(folder);
    board.git = git;

    const [fullTask, comments, activities, members] = await Promise.all([
      kaneo.getTask(config, taskId),
      kaneo.listComments(config, taskId).catch(() => []),
      kaneo.listActivities(config, taskId).catch(() => []),
      workspaceId
        ? kaneo.getWorkspaceMembers(config, workspaceId).catch(() => [])
        : Promise.resolve([]),
    ]);

    const columns =
      board.board?.columns?.map((c) => ({ id: c.id, name: c.name })) ||
      [
        { id: "to-do", name: "To Do" },
        { id: "in-progress", name: "In Progress" },
        { id: "in-review", name: "In Review" },
        { id: "done", name: "Done" },
      ];

    const col = columns.find((c) => c.id === fullTask.status);
    const branchTypes = vscode.workspace.getConfiguration("kaneo").get("branchTypes") || [
      "feature",
      "fix",
      "hotfix",
      "chore",
      "docs",
      "refactor",
    ];

    const key = taskKey(fullTask, board.board?.project?.slug);
    panel.title = key;

    panel.webview.postMessage({
      type: "task",
      payload: {
        task: {
          ...fullTask,
          key,
          statusName: col?.name || fullTask.status,
          priorityLabel: PRIORITY_LABELS[fullTask.priority] || fullTask.priority || "",
        },
        project: board.board?.project || null,
        columns,
        members,
        comments: Array.isArray(comments) ? comments : [],
        activities: Array.isArray(activities) ? activities : [],
        git,
        branchTypes,
        priorityLabels: PRIORITY_LABELS,
        config: {
          branchPattern: config.branchPattern,
          inProgressStatus: config.inProgressStatus,
          moveToInProgress: config.moveToInProgress,
          titleSlugMaxLength: config.titleSlugMaxLength,
        },
      },
    });
  }
}

module.exports = { StartWorkPanelManager };
