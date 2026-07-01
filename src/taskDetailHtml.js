"use strict";

/**
 * @param {vscode.Webview} webview
 */
function getTaskDetailHtml(webview) {
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
    margin: 0; padding: 0;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
  }
  .header {
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--vscode-widget-border, #444);
    background: var(--vscode-editor-background);
  }
  .breadcrumb { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 6px; }
  .breadcrumb strong { color: var(--vscode-textLink-foreground); }
  .title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h1 { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.3; flex: 1; min-width: 200px; }
  .header-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
  .btn {
    padding: 6px 14px; border-radius: 4px; border: none; cursor: pointer;
    font-size: 13px; font-weight: 600;
  }
  .btn-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-widget-border, #555);
  }
  .btn-icon { padding: 6px 10px; min-width: 32px; }
  .status-pill {
    padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, #666);
    color: var(--vscode-foreground);
  }
  .layout { display: flex; align-items: stretch; min-height: calc(100vh - 100px); }
  .main { flex: 1; padding: 20px 24px; min-width: 0; }
  .sidebar {
    width: 300px; flex-shrink: 0;
    border-left: 1px solid var(--vscode-widget-border, #444);
    background: var(--vscode-sideBar-background);
    padding: 16px;
  }
  .section-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .04em; color: var(--vscode-foreground);
    margin: 0 0 12px; padding-bottom: 6px;
    border-bottom: 1px solid var(--vscode-widget-border, #444);
  }
  .field { margin-bottom: 14px; }
  .field label {
    display: block; font-size: 11px; font-weight: 600;
    color: var(--vscode-descriptionForeground); margin-bottom: 4px;
  }
  .field select, .field input, .field textarea {
    width: 100%; padding: 6px 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, #666);
    border-radius: 4px; font-size: 13px;
  }
  .meta-line { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 12px; }
  .desc-block { margin-bottom: 20px; }
  .desc-block h3 { font-size: 12px; font-weight: 700; margin: 0 0 8px; text-transform: uppercase; }
  .desc {
    font-size: 13px; line-height: 1.6; padding: 12px 14px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, #666);
    border-radius: 4px; max-height: 50vh; overflow-y: auto;
  }
  .desc h3 { font-size: 14px; margin: 14px 0 6px; text-transform: none; }
  .desc ul { margin: 6px 0 6px 18px; }
  .desc code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px; }
  .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--vscode-widget-border, #444); margin-bottom: 12px; }
  .tab {
    padding: 8px 16px; font-size: 11px; font-weight: 700; letter-spacing: .05em;
    background: none; border: none; cursor: pointer; color: var(--vscode-descriptionForeground);
    border-bottom: 2px solid transparent; margin-bottom: -1px;
  }
  .tab.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder, #0078d4); }
  .tab-panel { display: none; }
  .tab-panel.active { display: block; }
  .comment-compose { display: flex; gap: 8px; margin-bottom: 16px; }
  .comment-compose textarea { flex: 1; min-height: 56px; resize: vertical; }
  .comment {
    padding: 10px 0; border-bottom: 1px solid var(--vscode-widget-border, #333);
  }
  .comment-author { font-weight: 700; font-size: 12px; }
  .comment-date { font-size: 11px; color: var(--vscode-descriptionForeground); margin-left: 8px; }
  .comment-body { font-size: 13px; margin-top: 6px; line-height: 1.5; white-space: pre-wrap; }
  .history-item { padding: 8px 0; border-bottom: 1px solid var(--vscode-widget-border, #333); font-size: 12px; }
  .history-date { color: var(--vscode-descriptionForeground); font-size: 11px; }
  .empty { color: var(--vscode-descriptionForeground); font-size: 12px; padding: 12px 0; }
  .loading { padding: 40px; color: var(--vscode-descriptionForeground); }
  .toast { font-size: 12px; margin-top: 8px; }
  .toast.ok { color: var(--vscode-testing-iconPassed); }
  .toast.err { color: var(--vscode-errorForeground); }
  .modal-bg {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,.6);
    z-index: 200; align-items: center; justify-content: center; padding: 20px;
  }
  .modal-bg.open { display: flex; }
  .modal {
    width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border, #555);
    border-radius: 8px; padding: 20px;
  }
  .modal h2 { margin: 0 0 16px; font-size: 16px; }
  .modal .field { margin-bottom: 12px; }
  .check { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 8px; }
  .readonly {
    padding: 6px 8px; background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, #666); border-radius: 4px;
    font-family: var(--vscode-editor-font-family); font-size: 12px; word-break: break-all;
  }
</style>
</head>
<body>
<div id="app" class="loading">Cargando…</div>
<div class="modal-bg" id="sw-modal">
  <div class="modal">
    <h2 id="sw-title">Start Work</h2>
    <div class="field"><label>Prefix</label><select id="sw-prefix"></select></div>
    <div class="field"><label>Nombre de rama</label><input id="sw-suffix" type="text" /></div>
    <div class="field"><label>Rama completa</label><div class="readonly" id="sw-full"></div></div>
    <div class="field"><label>Base</label><select id="sw-base"></select></div>
    <div class="field"><label>Remote</label><select id="sw-remote"></select></div>
    <label class="check"><input type="checkbox" id="sw-push" /> Push al remote</label>
    <label class="check"><input type="checkbox" id="sw-transition" /> → In Progress + asignarme</label>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-primary" id="sw-go">Start Work</button>
      <button class="btn btn-secondary" id="sw-cancel">Cancelar</button>
    </div>
    <div id="sw-result" class="toast"></div>
  </div>
</div>
<script>
(function() {
  const vscode = acquireVsCodeApi();
  let state = null;
  let activeTab = 'comments';

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(s) { return esc(s).replace(/"/g,'&quot;'); }
  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  function renderMarkdown(md) {
    if (!md) return '<span class="empty">Sin descripción</span>';
    let html = esc(md);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    html = html.replace(/\\x60([^\\x60]+)\\x60/g, '<code>$1</code>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\\s\\S]*?<\\/li>\\n?)+/g, (m) => '<ul>' + m + '</ul>');
    html = html.replace(/\\n\\n/g, '<br><br>');
    html = html.replace(/\\n/g, '<br>');
    return html;
  }

  function activityText(a) {
    const d = a.eventData || {};
    switch (a.type) {
      case 'created': return 'Tarea creada';
      case 'status_changed': return 'Estado: ' + (d.oldStatus || '?') + ' → ' + (d.newStatus || '?');
      case 'priority_changed': return 'Prioridad: ' + (d.oldPriority || '?') + ' → ' + (d.newPriority || '?');
      case 'assignee_changed': return 'Asignado a ' + (d.newAssignee || d.newAssigneeId || '?');
      case 'assigned': return 'Asignado';
      case 'unassigned': return 'Sin asignar';
      case 'comment_created': return 'Comentario añadido';
      default: return a.type || 'Actividad';
    }
  }

  function slugify(text, maxLen) {
    return String(text || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, maxLen || 40).replace(/-+$/g, '');
  }

  function buildSuffix(t) {
    const slug = String((state.project && state.project.slug) || 'task').toLowerCase();
    const num = t.number != null ? t.number : t.id;
    const title = slugify(t.title, state.config.titleSlugMaxLength);
    const p = state.config.branchPattern || '{slug}-{number}-{title}';
    return p.replace(/\\{slug\\}/gi, slug).replace(/\\{number\\}/g, String(num)).replace(/\\{title\\}/g, title || 'task');
  }

  function updateSwFull() {
    const p = (document.getElementById('sw-prefix') || {}).value || 'feature';
    const s = (document.getElementById('sw-suffix') || {}).value || '';
    const prefix = String(p).replace(/\\/$/, '');
    const suffix = String(s).replace(/^\\/+/, '');
    const el = document.getElementById('sw-full');
    if (el) el.textContent = prefix ? prefix + '/' + suffix : suffix;
  }

  function openStartWorkModal() {
    const t = state.task;
    const git = state.git || {};
    document.getElementById('sw-title').textContent = 'Start Work — ' + (t.key || '');
    document.getElementById('sw-prefix').innerHTML = (state.branchTypes || ['feature'])
      .map(x => '<option value="' + escAttr(x) + '">' + esc(x) + '</option>').join('');
    document.getElementById('sw-suffix').value = buildSuffix(t);
    document.getElementById('sw-base').innerHTML = (git.baseBranches || [{value:'main',label:'main'}])
      .map(b => '<option value="' + escAttr(b.value) + '"' + (b.value === git.defaultBase ? ' selected' : '') + '>' + esc(b.label) + '</option>').join('');
    const remotes = git.remotes && git.remotes.length ? git.remotes : [{name:'origin',url:git.originUrl||''}];
    document.getElementById('sw-remote').innerHTML = remotes.map(r =>
      '<option value="' + escAttr(r.name) + '">' + esc(r.name + (r.url ? ' → ' + r.url : '')) + '</option>').join('');
    const canPush = git.hasRepo && (git.originUrl || remotes.some(r => r.url));
    document.getElementById('sw-push').checked = !!canPush;
    document.getElementById('sw-push').disabled = !canPush;
    document.getElementById('sw-transition').checked = state.config.moveToInProgress !== false;
    document.getElementById('sw-result').textContent = '';
    updateSwFull();
    document.getElementById('sw-modal').classList.add('open');
  }

  function render() {
    if (!state || !state.task) return;
    const t = state.task;
    const cols = state.columns || [];
    const members = state.members || [];
    const statusOpts = cols.map(c => '<option value="' + escAttr(c.id) + '"' + (c.id === t.status ? ' selected' : '') + '>' + esc(c.name || c.id) + '</option>').join('');
    const prioOpts = ['no-priority','low','medium','high','urgent'].map(p =>
      '<option value="' + p + '"' + (p === t.priority ? ' selected' : '') + '>' + esc((state.priorityLabels && state.priorityLabels[p]) || p) + '</option>').join('');
    const assigneeOpts = '<option value="">Sin asignar</option>' + members.map(m =>
      '<option value="' + escAttr(m.id) + '"' + (m.id === t.userId ? ' selected' : '') + '>' + esc(m.name || m.email || m.id) + '</option>').join('');

    const comments = state.comments || [];
    const commentsHtml = comments.length ? comments.map(c =>
      '<div class="comment"><span class="comment-author">' + esc((c.user && c.user.name) || 'Usuario') + '</span>' +
      '<span class="comment-date">' + esc(fmtDate(c.createdAt)) + '</span>' +
      '<div class="comment-body">' + esc(c.content || '') + '</div></div>').join('') : '<div class="empty">Sin comentarios</div>';

    const activities = (state.activities || []).slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const historyHtml = activities.length ? activities.map(a =>
      '<div class="history-item"><div>' + esc(activityText(a)) + '</div>' +
      '<div class="history-date">' + esc(fmtDate(a.createdAt)) + '</div></div>').join('') : '<div class="empty">Sin historial</div>';

    document.getElementById('app').innerHTML =
      '<div class="header">' +
        '<div class="breadcrumb">' + esc((state.project && state.project.name) || 'Proyecto') + ' / <strong>' + esc(t.key || '') + '</strong></div>' +
        '<div class="title-row">' +
          '<h1>' + esc(t.title || '') + '</h1>' +
          '<div class="header-actions">' +
            '<button class="btn btn-primary" id="btn-start-work">Start Work</button>' +
            '<button class="btn btn-secondary btn-icon" id="btn-refresh" title="Actualizar">↻</button>' +
            '<button class="btn btn-secondary btn-icon" id="btn-browser" title="Abrir en Kaneo">↗</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="layout">' +
        '<div class="main">' +
          '<div class="desc-block"><h3>Descripción</h3><div class="desc">' + renderMarkdown(t.description) + '</div></div>' +
          '<div class="tabs">' +
            '<button class="tab' + (activeTab === 'comments' ? ' active' : '') + '" data-tab="comments">COMENTARIOS</button>' +
            '<button class="tab' + (activeTab === 'history' ? ' active' : '') + '" data-tab="history">HISTORIAL</button>' +
          '</div>' +
          '<div class="tab-panel' + (activeTab === 'comments' ? ' active' : '') + '" id="panel-comments">' +
            '<div class="comment-compose">' +
              '<textarea id="new-comment" placeholder="Añadir un comentario…"></textarea>' +
              '<button class="btn btn-primary" id="btn-comment" style="align-self:flex-end">Comentar</button>' +
            '</div>' + commentsHtml +
          '</div>' +
          '<div class="tab-panel' + (activeTab === 'history' ? ' active' : '') + '" id="panel-history">' + historyHtml + '</div>' +
        '</div>' +
        '<div class="sidebar">' +
          '<div class="section-label">Detalles</div>' +
          '<div class="field"><label>Estado</label><select id="f-status">' + statusOpts + '</select></div>' +
          '<div class="field"><label>Asignado</label><select id="f-assignee">' + assigneeOpts + '</select></div>' +
          '<div class="field"><label>Prioridad</label><select id="f-priority">' + prioOpts + '</select></div>' +
          '<div class="field"><label>Proyecto</label><input type="text" readonly value="' + escAttr((state.project && state.project.name) || '') + '" /></div>' +
          '<div class="meta-line">Creada: ' + esc(fmtDate(t.createdAt)) + '</div>' +
          (state.git && state.git.repoPath ? '<div class="meta-line">Repo: ' + esc(state.git.repoPath) + '</div>' : '') +
        '</div>' +
      '</div>';

    document.getElementById('btn-start-work').onclick = openStartWorkModal;
    document.getElementById('btn-refresh').onclick = () => vscode.postMessage({ type: 'refresh' });
    document.getElementById('btn-browser').onclick = () => vscode.postMessage({ type: 'openInBrowser' });
    document.getElementById('f-status').onchange = (e) => vscode.postMessage({ type: 'updateField', field: 'status', value: e.target.value });
    document.getElementById('f-priority').onchange = (e) => vscode.postMessage({ type: 'updateField', field: 'priority', value: e.target.value });
    document.getElementById('f-assignee').onchange = (e) => vscode.postMessage({ type: 'updateField', field: 'assignee', value: e.target.value });
    document.getElementById('btn-comment').onclick = () => {
      const content = (document.getElementById('new-comment') || {}).value || '';
      if (!content.trim()) return;
      vscode.postMessage({ type: 'addComment', content: content.trim() });
    };
    document.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => { activeTab = tab.getAttribute('data-tab'); render(); };
    });
  }

  document.getElementById('sw-prefix').addEventListener('change', updateSwFull);
  document.getElementById('sw-suffix').addEventListener('input', updateSwFull);
  document.getElementById('sw-cancel').onclick = () => document.getElementById('sw-modal').classList.remove('open');
  document.getElementById('sw-go').onclick = () => {
    document.getElementById('sw-result').textContent = 'Ejecutando…';
    vscode.postMessage({
      type: 'startWork',
      prefix: document.getElementById('sw-prefix').value,
      branchSuffix: document.getElementById('sw-suffix').value,
      baseBranch: document.getElementById('sw-base').value,
      remoteName: document.getElementById('sw-remote').value,
      push: document.getElementById('sw-push').checked,
      transition: document.getElementById('sw-transition').checked,
    });
  };

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.type === 'task') { state = msg.payload; render(); }
    if (msg.type === 'startWorkDone') {
      const el = document.getElementById('sw-result');
      if (el) {
        el.className = 'toast ' + (msg.ok ? 'ok' : 'err');
        el.textContent = msg.message || '';
      }
      if (msg.ok) {
        setTimeout(() => document.getElementById('sw-modal').classList.remove('open'), 800);
      }
    }
    if (msg.type === 'error') {
      alert(msg.message || 'Error');
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
</script>
</body>
</html>`;
}

module.exports = { getTaskDetailHtml };
