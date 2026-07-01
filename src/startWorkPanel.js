"use strict";

const vscode = require("vscode");
const kaneo = require("./kaneoClient");
const { taskKey, PRIORITY_LABELS, toDateInputValue, formatDateShort } = require("./tasks");
const { renderMarkdownToHtml } = require("./markdownRender");
const { inferTaskType, taskTypeLabel } = require("./taskTypeIcons");
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
        } else if (msg.field === "startDate") {
          const { dateInputToIso } = require("./tasks");
          await kaneo.updateTask(config, taskId, {
            startDate: msg.value ? dateInputToIso(msg.value) : null,
          });
        } else if (msg.field === "dueDate") {
          const { dateInputToIso } = require("./tasks");
          await kaneo.updateTask(config, taskId, {
            dueDate: msg.value ? dateInputToIso(msg.value) : null,
          });
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

      case "openExternal":
        if (msg.url) {
          await vscode.env.openExternal(vscode.Uri.parse(msg.url));
        }
        break;

      case "openPullRequest":
        await this.handleOpenPullRequest(panel, taskId);
        break;

      case "pushBranch":
        await this.handlePushBranch(panel, taskId);
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

    const [fullTask, comments, activities, members, githubIntegration] = await Promise.all([
      kaneo.getTask(config, taskId),
      kaneo.listComments(config, taskId).catch(() => []),
      kaneo.listActivities(config, taskId).catch(() => []),
      workspaceId
        ? kaneo.getWorkspaceMembers(config, workspaceId).catch(() => [])
        : Promise.resolve([]),
      config.projectId
        ? kaneo.getGithubIntegration(config, config.projectId).catch(() => null)
        : Promise.resolve(null),
    ]);

    const { getBranchLink, branchMatchesTask, parseRemote, branchWebUrl, resolveMergeRequestUrl, parseBranchFromComments, getGitRemoteOpts, providerLabel } =
      require("./branchLink");
    const { branchExistsOnRemote } = require("./gitInfo");
    const storedLink = getBranchLink(this.context, taskId);
    const currentBranch = git?.currentBranch || "";
    const projectSlug = board.board?.project?.slug;
    const commentLink = parseBranchFromComments(Array.isArray(comments) ? comments : []);
    let branchLink =
      storedLink ||
      (branchMatchesTask(currentBranch, fullTask, projectSlug)
        ? {
            branchName: currentBranch,
            remoteName: git?.originName || "origin",
            remoteUrl: git?.originUrl || "",
            detected: true,
          }
        : null) ||
      commentLink;
    const gitOpts = getGitRemoteOpts(this.context);
    if (branchLink) {
      const remoteName = branchLink.remoteName || git?.originName || "origin";
      const remoteUrl = branchLink.remoteUrl || git?.originUrl || "";
      const baseRef = branchLink.baseRef || git?.defaultBase || "main";
      const onOrigin = folder
        ? await branchExistsOnRemote(folder, branchLink.branchName, remoteName)
        : Boolean(branchLink.onOrigin);
      const parsedRemote = parseRemote(remoteUrl, gitOpts);
      const webUrl =
        branchLink.branchWebUrl ||
        branchLink.githubUrl ||
        (parsedRemote ? branchWebUrl(parsedRemote, branchLink.branchName) : null);
      const pullRequestUrl = await resolveMergeRequestUrl({
        remoteUrl,
        branchName: branchLink.branchName,
        baseRef,
        onOrigin,
        ...gitOpts,
      });
      branchLink = {
        ...branchLink,
        remoteName,
        remoteUrl,
        baseRef,
        branchWebUrl: webUrl || undefined,
        githubUrl: webUrl || undefined,
        onOrigin,
        pullRequestUrl: pullRequestUrl || undefined,
        gitProvider: parsedRemote?.provider || "generic",
        providerLabel: providerLabel(parsedRemote?.provider || "generic"),
        hasRemoteWeb: Boolean(parsedRemote && webUrl),
      };
    }

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
          descriptionHtml: renderMarkdownToHtml(fullTask.description || ""),
          taskType: inferTaskType(fullTask.title),
          taskTypeLabel: taskTypeLabel(inferTaskType(fullTask.title)),
          startDateValue: toDateInputValue(fullTask.startDate),
          dueDateValue: toDateInputValue(fullTask.dueDate),
          createdLabel: formatDateShort(fullTask.createdAt),
          labels: Array.isArray(fullTask.labels) ? fullTask.labels : [],
          externalLinks: Array.isArray(fullTask.externalLinks) ? fullTask.externalLinks : [],
        },
        project: board.board?.project || null,
        columns,
        members,
        comments: Array.isArray(comments) ? comments : [],
        activities: Array.isArray(activities) ? activities : [],
        git,
        branchLink,
        githubIntegration: githubIntegration || null,
        branchTypes,
        priorityLabels: PRIORITY_LABELS,
        config: {
          branchPattern: config.branchPattern,
          inProgressStatus: config.inProgressStatus,
          moveToInProgress: config.moveToInProgress,
          commentBranchOnStartWork: config.commentBranchOnStartWork,
          titleSlugMaxLength: config.titleSlugMaxLength,
        },
      },
    });
  }

  /**
   * @param {vscode.WebviewPanel} panel
   * @param {string} taskId
   */
  async handleOpenPullRequest(panel, taskId) {
    const { getBranchLink, resolvePullRequestUrl } = require("./branchLink");
    const { getGitWorkspaceFolder } = require("./gitWorkspace");
    const { getGitInfo, pushBranch, branchExistsOnRemote } = require("./gitInfo");

    const bl = getBranchLink(this.context, taskId);
    if (!bl?.branchName) {
      vscode.window.showWarningMessage("No hay rama vinculada a esta tarea.");
      return;
    }
    const folder = getGitWorkspaceFolder();
    if (!folder) {
      vscode.window.showWarningMessage("Abre una carpeta con repositorio Git.");
      return;
    }
    const git = await getGitInfo(folder);
    const remoteName = bl.remoteName || git.originName || "origin";
    const remoteUrl = bl.remoteUrl || git.originUrl || "";
    let onOrigin = await branchExistsOnRemote(folder, bl.branchName, remoteName);

    if (!onOrigin) {
      const choice = await vscode.window.showWarningMessage(
        `La rama «${bl.branchName}» no está en ${remoteName}. Haz push para abrir el PR.`,
        "Push ahora",
        "Cancelar",
      );
      if (choice !== "Push ahora") return;
      try {
        await pushBranch(folder, bl.branchName, remoteName);
        onOrigin = true;
        vscode.window.showInformationMessage(`Push OK: ${bl.branchName} → ${remoteName}`);
      } catch (e) {
        vscode.window.showErrorMessage(`Push: ${e instanceof Error ? e.message : String(e)}`);
        return;
      }
    }

    const prUrl = await resolveMergeRequestUrl({
      remoteUrl,
      branchName: bl.branchName,
      baseRef: bl.baseRef || git.defaultBase,
      onOrigin,
      ...getGitRemoteOpts(this.context),
    });
    if (!prUrl) {
      vscode.window.showWarningMessage("No se pudo abrir el MR/PR (¿remote Git soportado?).");
      return;
    }
    await vscode.env.openExternal(vscode.Uri.parse(prUrl));
    await this.loadTaskDetail(panel, taskId);
  }

  /**
   * @param {vscode.WebviewPanel} panel
   * @param {string} taskId
   */
  async handlePushBranch(panel, taskId) {
    const { getBranchLink } = require("./branchLink");
    const { getGitWorkspaceFolder } = require("./gitWorkspace");
    const { getGitInfo, pushBranch } = require("./gitInfo");

    const bl = getBranchLink(this.context, taskId);
    if (!bl?.branchName) {
      vscode.window.showWarningMessage("No hay rama vinculada.");
      return;
    }
    const folder = getGitWorkspaceFolder();
    if (!folder) return;
    const git = await getGitInfo(folder);
    const remoteName = bl.remoteName || git.originName || "origin";
    try {
      await pushBranch(folder, bl.branchName, remoteName);
      vscode.window.showInformationMessage(`Push OK: ${bl.branchName} → ${remoteName}`);
      await this.loadTaskDetail(panel, taskId);
    } catch (e) {
      vscode.window.showErrorMessage(`Push: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

module.exports = { StartWorkPanelManager };
