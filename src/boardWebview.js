"use strict";

const vscode = require("vscode");
const kaneo = require("./kaneoClient");
const { parseBoardResponse, taskKey, PRIORITY_LABELS, formatDateShort } = require("./tasks");
const { compileKql, KQL_EXAMPLES } = require("./kql");
const { getGitWorkspaceFolder } = require("./gitWorkspace");
const { getGitInfo } = require("./gitInfo");
const { getSharedWebviewCss, ICONS, statusDotClass } = require("./webviewTheme");
const {
  getSections,
  saveSections,
  addSection,
  removeSection,
  getCollapsed,
  setCollapsed,
  SECTION_ICON_OPTIONS,
} = require("./savedSections");
const { inferTaskType } = require("./taskTypeIcons");

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
      case "toggleSection": {
        const pid = kaneo.getConfig().projectId;
        if (!pid) break;
        const collapsed = { ...getCollapsed(this.context, pid) };
        collapsed[msg.sectionId] = !collapsed[msg.sectionId];
        await setCollapsed(this.context, pid, collapsed);
        this.renderBoard();
        break;
      }
      case "addSection":
        await this.promptAddSection();
        break;
      case "deleteSection": {
        const pid = kaneo.getConfig().projectId;
        if (!pid || !msg.sectionId) break;
        await removeSection(this.context, pid, msg.sectionId);
        await this.refresh();
        break;
      }
      case "saveSection": {
        const pid = kaneo.getConfig().projectId;
        if (!pid || !msg.section) break;
        const sections = getSections(this.context, pid);
        const idx = sections.findIndex((s) => s.id === msg.section.id);
        if (idx >= 0) sections[idx] = { ...sections[idx], ...msg.section };
        else sections.push(msg.section);
        await saveSections(this.context, pid, sections);
        await this.refresh();
        break;
      }
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

      const { resolveCurrentUserId } = require("./userContext");
      let userId = (config.userId || "").trim();
      if (!userId) userId = this.context.globalState.get("kaneo.userId") || "";
      if (!userId && workspaceId) {
        try {
          const resolved = await resolveCurrentUserId(this.context, workspaceId);
          if (resolved) userId = resolved;
        } catch {
          /* sin usuario: assignee = me no filtra */
        }
      }
      this.resolvedUserId = userId || "";

      const raw = await kaneo.listTasks(config, config.projectId);
      this.board = parseBoardResponse(raw);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }

    this.renderBoard();
  }

  async promptAddSection() {
    const vscode = require("vscode");
    const pid = kaneo.getConfig().projectId;
    if (!pid) return;

    const name = await vscode.window.showInputBox({
      title: "Kaneo: nueva carpeta",
      prompt: "Nombre de la carpeta de consulta",
      placeHolder: "Alta prioridad en progreso",
    });
    if (!name?.trim()) return;

    const query = await vscode.window.showInputBox({
      title: "Kaneo: consulta KQL",
      prompt: "Filtro KQL para esta sección",
      placeHolder: "status = in-progress AND priority = high",
      value: "",
    });
    if (query === undefined) return;

    const iconPick = await vscode.window.showQuickPick(
      SECTION_ICON_OPTIONS.map((o) => ({ label: o.label, id: o.id })),
      { title: "Icono de la sección", placeHolder: "Filtro" },
    );

    await addSection(this.context, pid, {
      id: `sec-${Date.now()}`,
      name: name.trim(),
      query: (query || "").trim(),
      icon: iconPick?.id || "filter",
    });
    await this.refresh();
  }

  renderBoard() {
    const config = kaneo.getConfig();
    const projectId = config.projectId || "";
    const sections = getSections(this.context, projectId);
    const collapsedMap = getCollapsed(this.context, projectId);

    let userId = (this.resolvedUserId || "").trim();
    if (!userId) userId = (config.userId || "").trim();
    if (!userId) userId = this.context.globalState.get("kaneo.userId") || "";

    const ctx = {
      projectSlug: this.board?.project?.slug,
      userId: userId || undefined,
    };

    const globalPred = compileKql(this.filterQuery, ctx);
    const allTasks = (this.board?.allTasks || [])
      .filter(globalPred)
      .map((t) => ({
        ...t,
        key: taskKey(t, this.board?.project?.slug),
        priorityLabel: PRIORITY_LABELS[t.priority] || t.priority || "",
        statusName: t.statusName || t.status,
        taskType: inferTaskType(t.title),
        dueLabel: formatDateShort(t.dueDate),
        startLabel: formatDateShort(t.startDate),
        createdLabel: formatDateShort(t.createdAt),
      }));

    const sectionsPayload = sections.map((sec) => {
      const pred = compileKql(sec.query, ctx);
      const tasks = allTasks
        .filter(pred)
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
      return {
        ...sec,
        collapsed: !!collapsedMap[sec.id],
        count: tasks.length,
        tasks,
      };
    });

    this.post({
      type: "board",
      payload: {
        error: this.error,
        project: this.board?.project || null,
        sections: sectionsPayload,
        filterQuery: this.filterQuery,
        kqlExamples: KQL_EXAMPLES,
        kqlHelp:
          "KQL: status, priority, assignee (= me), key, text ~, AND/OR. Kaneo es kanban (sin tipos Bug/PBI); los iconos se infieren del título.",
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
  const iconsJson = JSON.stringify(ICONS);
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
  ${getSharedWebviewCss()}
  * { box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family);
    font-size: 13px;
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    margin: 0; padding: 0;
  }
  .header {
    padding: 10px 10px 8px;
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, transparent));
  }
  .project-row {
    display: flex; align-items: center; gap: 7px;
    font-weight: 600; font-size: 12px;
    text-transform: uppercase; letter-spacing: .04em;
    color: var(--vscode-sideBarTitle-foreground, var(--vscode-foreground));
    opacity: .9; margin-bottom: 8px;
  }
  .filter-block { margin-bottom: 8px; }
  .filter-label {
    display: flex; align-items: center; gap: 5px;
    font-size: 11px; font-weight: 600; opacity: .75; margin-bottom: 5px;
  }
  .filter-block input {
    width: 100%; padding: 6px 10px; border-radius: 4px; font-size: 13px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent);
  }
  .chips { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 7px; }
  .chip {
    display: inline-flex; align-items: center; gap: 4px;
    background: transparent; color: var(--vscode-foreground);
    border: none; border-radius: 4px; padding: 3px 8px;
    cursor: pointer; font-size: 12px; opacity: .8;
  }
  .chip:hover { background: var(--vscode-list-hoverBackground); opacity: 1; }
  .chip.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); opacity: 1; }
  .kql-hint { font-size: 11px; opacity: .55; margin-top: 5px; line-height: 1.4; padding: 0 10px; }
  .tree-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 10px 4px; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .04em; opacity: .7;
  }
  .tree-toolbar button {
    display: inline-flex; align-items: center; gap: 4px;
    border: none; background: transparent; cursor: pointer;
    color: var(--vscode-textLink-foreground); font-size: 12px; font-weight: 600; padding: 3px 6px;
    border-radius: 4px;
  }
  .tree-toolbar button:hover { background: var(--vscode-list-hoverBackground); }
  .tree { padding: 0 0 14px; user-select: none; }
  .tree-node { margin: 0; }
  .tree-row {
    display: flex; align-items: center; gap: 6px;
    min-height: 26px; padding: 1px 10px 1px 6px;
    cursor: pointer; line-height: 26px; font-size: 14px;
    white-space: nowrap; overflow: hidden;
  }
  .tree-row:hover { background: var(--vscode-list-hoverBackground); }
  .tree-row:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
  .tree-row.folder-row { font-weight: 600; font-size: 13px; }
  .tree-row.folder-row .tree-label { opacity: .95; }
  .twistie {
    width: 18px; height: 18px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    opacity: .75;
  }
  .twistie.spacer { visibility: hidden; }
  .tree-icon {
    width: 18px; height: 18px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .tree-icon .ico { width: 17px; height: 17px; opacity: 1; }
  .tree-icon.type-bug { color: #f87171; }
  .tree-icon.type-story { color: #60a5fa; }
  .tree-icon.type-spike { color: #c084fc; }
  .tree-icon.type-chore { color: #94a3b8; }
  .tree-icon.type-task { color: #d4a72c; }
  .tree-icon.folder-icon { color: var(--vscode-symbolIcon-folderForeground, #c5a332); }
  .tree-key {
    flex-shrink: 0; font-size: 12px; font-weight: 600;
    color: var(--vscode-descriptionForeground); min-width: 0;
  }
  .tree-label {
    flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
    font-size: 14px;
  }
  .tree-meta {
    flex-shrink: 0; font-size: 11px; opacity: .6;
    display: inline-flex; align-items: center; gap: 6px; margin-left: 6px;
  }
  .tree-meta .count {
    font-variant-numeric: tabular-nums;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; line-height: 16px;
  }
  .tree-children { padding-left: 0; }
  .tree-children .tree-row { padding-left: 24px; min-height: 28px; line-height: 28px; }
  .tree-children .tree-row .tree-label { font-weight: 400; font-size: 13px; }
  .tree-empty {
    padding: 4px 10px 4px 40px; font-size: 12px; opacity: .55; font-style: italic; line-height: 26px;
  }
  .tree-kql {
    padding: 2px 10px 6px 40px; font-size: 10px; opacity: .5; line-height: 1.35;
  }
  .tree-kql code { font-family: var(--vscode-editor-font-family); }
  .folder-actions { margin-left: 6px; opacity: 0; }
  .tree-row.folder-row:hover .folder-actions { opacity: .75; }
  .folder-actions button {
    border: none; background: transparent; cursor: pointer; padding: 2px 4px;
    color: var(--vscode-descriptionForeground); display: flex; align-items: center;
  }
  .folder-actions button:hover { color: var(--vscode-errorForeground); }
  .empty, .error {
    padding: 14px 10px; opacity: .85; font-size: 13px;
    display: flex; align-items: center; gap: 6px;
  }
  .error { color: var(--vscode-errorForeground); }
</style>
</head>
<body>
  <div id="app"></div>
<script>
(function() {
  const vscode = acquireVsCodeApi();
  const ICONS = ${iconsJson};
  function ico(n) { return ICONS[n] || ''; }
  function statusDotClass(status) {
    if (status === 'in-progress') return 'dot-progress';
    if (status === 'in-review') return 'dot-review';
    if (status === 'done') return 'dot-done';
    return 'dot-todo';
  }
  function twistie(open) {
    const chev = ico('chevron').replace('ico-chevron', 'ico ico-chevron' + (open ? ' open' : ''));
    return '<span class="twistie">' + chev + '</span>';
  }

  function renderTreeItem(t) {
    const type = t.taskType || 'task';
    const typeIcon = type === 'story' ? 'story' : type;
    const title = String(t.title || '').trim();
    let meta = '';
    if (t.dueLabel) meta += '<span title="Vence">' + esc(t.dueLabel) + '</span>';
    if (t.priority === 'high' || t.priority === 'urgent') {
      meta += '<span class="prio-dot prio-' + escAttr(t.priority) + '" title="' + esc(t.priorityLabel || '') + '"></span>';
    } else if (t.status) {
      meta += '<span class="status-dot ' + statusDotClass(t.status) + '" title="' + esc(t.statusName || t.status) + '"></span>';
    }
    return '<div class="tree-row task" tabindex="0" role="treeitem" data-id="' + escAttr(t.id) + '">' +
      '<span class="twistie spacer"></span>' +
      '<span class="tree-icon type-' + escAttr(type) + '">' + ico(typeIcon) + '</span>' +
      '<span class="tree-key">' + esc(t.key || '') + '</span>' +
      '<span class="tree-label" title="' + escAttr(title) + '">' + esc(title) + '</span>' +
      (meta ? '<span class="tree-meta">' + meta + '</span>' : '') +
      '</div>';
  }

  function renderFolder(sec) {
    const open = !sec.collapsed;
    const folderIco = open ? 'folderOpen' : 'folder';
    let html = '<div class="tree-node" role="treeitem" aria-expanded="' + (open ? 'true' : 'false') + '" data-section="' + escAttr(sec.id) + '">';
    html += '<div class="tree-row folder-row" data-toggle="' + escAttr(sec.id) + '">';
    html += twistie(open);
    html += '<span class="tree-icon folder-icon">' + ico(folderIco) + '</span>';
    html += '<span class="tree-label">' + esc(sec.name) + '</span>';
    html += '<span class="tree-meta"><span class="count">' + (sec.count || 0) + '</span></span>';
    if (!sec.builtin) {
      html += '<span class="folder-actions"><button type="button" data-del="' + escAttr(sec.id) + '" title="Eliminar sección">' + ico('trash') + '</button></span>';
    }
    html += '</div>';
    if (open) {
      html += '<div class="tree-children" role="group">';
      if (!sec.tasks || !sec.tasks.length) {
        html += '<div class="tree-empty">Sin tareas</div>';
      } else {
        for (const t of sec.tasks) html += renderTreeItem(t);
      }
      if (sec.query) {
        html += '<div class="tree-kql">KQL: <code>' + esc(sec.query) + '</code></div>';
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  let state = { sections: [], kqlExamples: [] };

  function render() {
    const app = document.getElementById('app');
    if (state.error) {
      app.innerHTML = '<div class="error">' + ico('task') + ' ' + esc(state.error) + '</div>';
      return;
    }
    if (!state.project) {
      app.innerHTML = '<div class="empty">' + ico('project') + ' Sin proyecto. Icono carpeta arriba.</div>';
      return;
    }

    const chips = (state.kqlExamples || []).map(ex => {
      const active = (state.filterQuery || '') === (ex.query || '') ? ' active' : '';
      return '<button class="chip' + active + '" data-q="' + escAttr(ex.query || '') + '">' + ico('search') + ' ' + esc(ex.label) + '</button>';
    }).join('');

    let treeHtml = '';
    const sections = state.sections || [];
    if (!sections.length) {
      treeHtml = '<div class="empty">' + ico('filter') + ' Sin secciones configuradas.</div>';
    } else {
      treeHtml = '<div class="tree" role="tree">';
      for (const sec of sections) treeHtml += renderFolder(sec);
      treeHtml += '</div>';
    }

    app.innerHTML =
      '<div class="header">' +
        '<div class="project-row">' + ico('project') + ' ' + esc(state.project.name || '') + '</div>' +
        '<div class="filter-block">' +
          '<div class="filter-label">' + ico('search') + ' Filtro global</div>' +
          '<input id="kql" type="text" placeholder="text ~ sprites" value="' + escAttr(state.filterQuery || '') + '" />' +
          '<div class="chips">' + chips + '</div>' +
        '</div>' +
        (state.kqlHelp ? '<div class="kql-hint">' + esc(state.kqlHelp) + '</div>' : '') +
      '</div>' +
      '<div class="tree-toolbar">' +
        '<span>Consultas</span>' +
        '<button type="button" id="btn-add-section">' + ico('plus') + ' Nueva carpeta</button>' +
      '</div>' +
      treeHtml;
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s) { return esc(s).replace(/"/g,'&quot;'); }

  function openTask(id) {
    if (id) vscode.postMessage({ type: 'openStartWork', taskId: id });
  }

  document.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const id = del.getAttribute('data-del');
      if (id && confirm('¿Eliminar esta sección?')) {
        vscode.postMessage({ type: 'deleteSection', sectionId: id });
      }
      return;
    }
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const id = toggle.getAttribute('data-toggle');
      if (id) vscode.postMessage({ type: 'toggleSection', sectionId: id });
      return;
    }
    if (e.target.id === 'btn-add-section' || e.target.closest('#btn-add-section')) {
      vscode.postMessage({ type: 'addSection' });
      return;
    }
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
