"use strict";

const vscode = require("vscode");
const kaneo = require("./kaneoClient");
const { parseBoardResponse, taskKey, PRIORITY_LABELS } = require("./tasks");
const { compileKql, KQL_EXAMPLES } = require("./kql");
const { getGitWorkspaceFolder } = require("./gitWorkspace");
const { getGitInfo } = require("./gitInfo");

class KaneoBoardProvider {
  /**
   * @param {import('vscode').ExtensionContext} context
   */
  constructor(context) {
    this.context = context;
    /** @type {vscode.WebviewView | null} */
    this.view = null;
    this.filterQuery = "";
    this.board = null;
    this.git = null;
    this.error = null;
    this.workspaceId = null;
    /** @type {((taskId: string) => Promise<void>) | null} */
    this.onOpenStartWork = null;
  }

  /**
   * @param {(taskId: string) => Promise<void>} handler
   */
  setOpenStartWorkHandler(handler) {
    this.onOpenStartWork = handler;
  }

  /**
   * @param {vscode.WebviewView} webviewView
   */
  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
    webviewView.webview.html = getSidebarHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      try {
        await this.handleMessage(msg);
      } catch (e) {
        const text = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`Kaneo: ${text}`);
      }
    });

    this.refresh();
  }

  /**
   * @param {object} msg
   */
  async handleMessage(msg) {
    switch (msg.type) {
      case "ready":
      case "refresh":
        await this.refresh(msg.query);
        break;
      case "setFilter":
        this.filterQuery = msg.query || "";
        await this.context.globalState.update("kaneo.lastKql", this.filterQuery);
        this.renderBoard();
        break;
      case "selectProject":
        await vscode.commands.executeCommand("kaneo.selectProject");
        await this.refresh();
        break;
      case "openStartWork":
        if (this.onOpenStartWork) {
          await this.onOpenStartWork(msg.taskId);
        }
        break;
      default:
        break;
    }
  }

  async refresh(query) {
    if (query !== undefined) this.filterQuery = query;
    if (!this.filterQuery) {
      this.filterQuery = this.context.globalState.get("kaneo.lastKql") || "";
    }

    const config = kaneo.getConfig();
    this.error = null;
    this.board = null;
    this.git = null;

    const folder = getGitWorkspaceFolder();
    if (folder) {
      try {
        this.git = await getGitInfo(folder);
      } catch {
        this.git = { hasRepo: false, originUrl: "", originName: "origin" };
      }
    }

    try {
      if (!config.apiKey) {
        this.error = "Configura kaneo.apiKey o API_KEY.";
        this.renderBoard();
        return;
      }
      if (!config.projectId) {
        this.error = "Elige un proyecto (icono carpeta arriba).";
        this.renderBoard();
        return;
      }

      let workspaceId = config.workspaceId;
      if (!workspaceId) {
        const workspaces = await kaneo.listWorkspaces(config);
        workspaceId = workspaces?.[0]?.id;
      }
      this.workspaceId = workspaceId || null;

      const raw = await kaneo.listTasks(config, config.projectId);
      this.board = parseBoardResponse(raw);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }

    this.renderBoard();
  }

  renderBoard() {
    let tasks = this.board?.allTasks || [];
    if (this.board?.project?.slug) {
      const pred = compileKql(this.filterQuery, { projectSlug: this.board.project.slug });
      tasks = tasks.filter(pred);
    }

    const columns = (this.board?.columns || []).map((col) => ({
      id: col.id,
      name: col.name,
      tasks: tasks
        .filter((t) => (t.status || col.id) === col.id)
        .map((t) => ({
          ...t,
          key: taskKey(t, this.board?.project?.slug),
          priorityLabel: PRIORITY_LABELS[t.priority] || t.priority || "",
          statusName: t.statusName || col.name,
        })),
    }));

    this.post({
      type: "board",
      payload: {
        error: this.error,
        project: this.board?.project || null,
        columns,
        filterQuery: this.filterQuery,
        kqlExamples: KQL_EXAMPLES,
      },
    });
  }

  async openTask(_taskId) {
    const config = kaneo.getConfig();
    const ws = this.workspaceId || config.workspaceId;
    const proj = config.projectId;
    if (!ws || !proj) return;
    const url = kaneo.taskBoardUrl(config, ws, proj);
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  /**
   * @param {object} data
   */
  post(data) {
    this.view?.webview.postMessage(data);
  }
}

/**
 * @param {vscode.Webview} webview
 */
function getSidebarHtml(webview) {
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src ${webview.cspSource} 'unsafe-inline'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    margin: 0; padding: 8px;
  }
  .toolbar { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
  .chip {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-widget-border, transparent);
    border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px;
  }
  .chip.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .kql-wrap { margin-bottom: 8px; }
  .kql-wrap label { font-size: 11px; opacity: .8; display: block; margin-bottom: 2px; }
  .kql-wrap input {
    width: 100%; padding: 6px 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, #555);
    border-radius: 4px; font-size: 12px;
  }
  .kql-hint { font-size: 10px; opacity: .65; margin-top: 4px; line-height: 1.35; }
  .project { font-weight: 600; margin-bottom: 8px; font-size: 12px; }
  .col-header {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .04em; opacity: .7; margin: 10px 0 4px;
    padding-bottom: 2px; border-bottom: 1px solid var(--vscode-widget-border, #444);
  }
  .task {
    border: none; border-radius: 4px; padding: 8px 6px; margin-bottom: 2px;
    cursor: pointer; background: transparent;
  }
  .task:hover { background: var(--vscode-list-hoverBackground); }
  .task:focus { outline: 1px solid var(--vscode-focusBorder); }
  .task-row { display: flex; gap: 6px; align-items: flex-start; }
  .task-key {
    flex-shrink: 0; font-weight: 700; font-size: 11px;
    color: var(--vscode-textLink-activeForeground, var(--vscode-textLink-foreground));
    min-width: 48px;
  }
  .task-body { flex: 1; min-width: 0; }
  .task-title {
    font-size: 12px; line-height: 1.35; color: var(--vscode-foreground);
    overflow: hidden; text-overflow: ellipsis;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  }
  .badges { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
  .badge {
    font-size: 9px; padding: 1px 5px; border-radius: 8px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }
  .badge.p-high, .badge.p-urgent { background: #dc262633; }
  .empty, .error { padding: 12px 6px; opacity: .85; font-size: 12px; }
  .error { color: var(--vscode-errorForeground); }
</style>
</head>
<body>
  <div id="app"></div>
<script>
(function() {
  const vscode = acquireVsCodeApi();
  let state = { columns: [], kqlExamples: [] };

  function render() {
    const app = document.getElementById('app');
    if (state.error) {
      app.innerHTML = '<div class="error">' + esc(state.error) + '</div>';
      return;
    }
    if (!state.project) {
      app.innerHTML = '<div class="empty">Sin proyecto. Icono carpeta arriba.</div>';
      return;
    }

    const chips = (state.kqlExamples || []).map(ex => {
      const active = (state.filterQuery || '') === (ex.query || '') ? ' active' : '';
      return '<button class="chip' + active + '" data-q="' + escAttr(ex.query || '') + '">' + esc(ex.label) + '</button>';
    }).join('');

    let body = '';
    const cols = state.columns || [];
    const total = cols.reduce((n, c) => n + (c.tasks ? c.tasks.length : 0), 0);
    if (!total) {
      body = '<div class="empty">Sin tareas para este filtro.</div>';
    } else {
      for (const col of cols) {
        if (!col.tasks || !col.tasks.length) continue;
        body += '<div class="col-header">' + esc(col.name) + ' · ' + col.tasks.length + '</div>';
        for (const t of col.tasks) {
          body += '<div class="task" tabindex="0" role="button" data-id="' + escAttr(t.id) + '" title="Abrir Start Work">';
          body += '<div class="task-row">';
          body += '<span class="task-key">' + esc(t.key || '') + '</span>';
          body += '<div class="task-body">';
          body += '<div class="task-title">' + esc(t.title || '') + '</div>';
          body += '<div class="badges">';
          if (t.priorityLabel) body += '<span class="badge p-' + escAttr(t.priority || '') + '">' + esc(t.priorityLabel) + '</span>';
          if (t.assigneeName) body += '<span class="badge">' + esc(t.assigneeName) + '</span>';
          body += '</div></div></div></div>';
        }
      }
    }

    app.innerHTML =
      '<div class="project">' + esc(state.project.name || '') + '</div>' +
      '<div class="kql-wrap"><label>KQL</label>' +
      '<input id="kql" type="text" placeholder="status = to-do" value="' + escAttr(state.filterQuery || '') + '" /></div>' +
      '<div class="toolbar">' + chips + '</div>' + body;
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s) { return esc(s).replace(/"/g,'&quot;'); }

  function openTask(id) {
    if (id) vscode.postMessage({ type: 'openStartWork', taskId: id });
  }

  document.addEventListener('click', (e) => {
    const task = e.target.closest('.task');
    if (task) {
      openTask(task.getAttribute('data-id'));
      return;
    }
    const chip = e.target.closest('.chip');
    if (chip) {
      const q = chip.getAttribute('data-q') || '';
      const kql = document.getElementById('kql');
      if (kql) kql.value = q;
      vscode.postMessage({ type: 'setFilter', query: q });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const task = e.target.closest && e.target.closest('.task');
      if (task) openTask(task.getAttribute('data-id'));
    }
  });

  let kqlTimer;
  document.addEventListener('input', (e) => {
    if (e.target.id === 'kql') {
      clearTimeout(kqlTimer);
      kqlTimer = setTimeout(() => vscode.postMessage({ type: 'setFilter', query: e.target.value }), 350);
    }
  });

  window.addEventListener('message', (event) => {
    if (event.data.type === 'board') {
      state = { ...state, ...event.data.payload };
      render();
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
</script>
</body>
</html>`;
}

module.exports = { KaneoBoardProvider };
