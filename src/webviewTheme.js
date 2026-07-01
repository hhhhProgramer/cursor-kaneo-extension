"use strict";

/** @type {Record<string, string>} */
const ICONS = {
  branch:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M10 2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM7 4.086V5.5H5.5a1.5 1.5 0 0 0-1.5 1.5v2.086a1.5 1.5 0 1 1-1 0V7A2.5 2.5 0 0 1 5.5 4.5H7V3.914a1.5 1.5 0 1 1 1 0ZM11 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-8 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm8 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/></svg>',
  refresh:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2.5a5.5 5.5 0 0 0-4.78 2.75h1.28a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75V3.47a.75.75 0 0 1 1.5 0v1.1A7 7 0 1 1 1 8a.75.75 0 0 1 1.5 0A5.5 5.5 0 1 0 8 2.5Z"/></svg>',
  external:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 3.5A1.5 1.5 0 0 1 4.5 2h4.25a.75.75 0 0 1 0 1.5H4.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V8.75a.75.75 0 0 1 1.5 0V11.5A1.5 1.5 0 0 1 11.5 13h-7A1.5 1.5 0 0 1 3 11.5v-8ZM9.75 2.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0V4.56L7.28 9.78a.75.75 0 1 1-1.06-1.06l4.47-4.47H10.5a.75.75 0 0 1-.75-.75Z"/></svg>',
  pullRequest:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M1.5 3.25a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM2.75 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM1.5 12.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM2.75 12.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM8.5 3.25a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9.75 3.25a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM5.372 7.03a.75.75 0 0 1 1.06 0l1.72 1.72a.75.75 0 0 1-1.06 1.06l-.47-.47V12.5a.75.75 0 0 1-1.5 0V9.34l-.47.47a.75.75 0 0 1-1.06-1.06l1.72-1.72ZM11.5 8.75a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Zm.75 2.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/></svg>',
  status:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7 4.75a1 1 0 1 1 2 0v3.19l1.72 1.72a1 1 0 1 1-1.42 1.42l-2-2A1 1 0 0 1 7 7.94V4.75Z"/></svg>',
  person:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 13.25c0-2.21 2.24-4 5-4s5 1.79 5 4v.25a.75.75 0 0 1-.75.75h-8.5A.75.75 0 0 1 3 13.5v-.25Z"/></svg>',
  priority:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 2.75A.75.75 0 0 1 3.75 2h8.5a.75.75 0 0 1 .53 1.28L9.5 7l3.28 3.72a.75.75 0 0 1-.53 1.28h-8.5A.75.75 0 0 1 3 11.25V2.75Z"/></svg>',
  project:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2.5 3A1.5 1.5 0 0 1 4 1.5h8A1.5 1.5 0 0 1 13.5 3v10A1.5 1.5 0 0 1 12 14.5H4A1.5 1.5 0 0 1 2.5 13V3ZM4 3v10h8V3H4Z"/></svg>',
  comment:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6A1.5 1.5 0 0 1 12.5 11H8.62L5.2 13.7a.75.75 0 0 1-1.2-.6V11H3.5A1.5 1.5 0 0 1 2 9.5v-6Z"/></svg>',
  history:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 5.92 3.86.75.75 0 1 0-1.34-.67A5 5 0 1 1 8 3.5V6a.75.75 0 0 0 1.5 0V2.25a.75.75 0 0 0-.75-.75H4.5a.75.75 0 0 0 0 1.5h2.1A6.47 6.47 0 0 0 8 1.5Z"/></svg>',
  search:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M10.5 9.5h-.79l-.28-.27a4 4 0 1 0-.71.71l.27.28v.79l3.25 3.25a.75.75 0 1 0 1.06-1.06L10.5 9.5Zm-4 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>',
  task:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4 2.5A1.5 1.5 0 0 1 5.5 1h5A1.5 1.5 0 0 1 12 2.5V14a.75.75 0 0 1-1.16.63L8 12.2l-2.84 2.43A.75.75 0 0 1 4 14V2.5Zm1.5-.5a.5.5 0 0 0-.5.5v10.86l2.34-2a.75.75 0 0 1 .98 0l2.34 2V2.5a.5.5 0 0 0-.5-.5h-5Z"/></svg>',
  desc:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 3.75A.75.75 0 0 1 3.75 3h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 3.75Zm0 3A.75.75 0 0 1 3.75 6h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 6.75Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Z"/></svg>',
  bug:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.5 1.75a.75.75 0 0 1 1.5 0V3h1V1.75a.75.75 0 0 1 1.5 0V3h.25A2.75 2.75 0 0 1 13 5.75v.5a2.75 2.75 0 0 1-2.25 2.75H11v4.25a.75.75 0 0 1-1.5 0V9h-3v4.25a.75.75 0 0 1-1.5 0V9H5.25A2.75 2.75 0 0 1 3 6.25v-.5A2.75 2.75 0 0 1 5.75 3H6V1.75ZM4.5 6.25v-.5c0-.69.56-1.25 1.25-1.25h4.5c.69 0 1.25.56 1.25 1.25v.5a1.25 1.25 0 0 1-1.25 1.25h-4.5A1.25 1.25 0 0 1 4.5 6.25Z"/></svg>',
  story:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 2.5A1.5 1.5 0 0 1 4.5 1h5.379a1.5 1.5 0 0 1 1.06.44l2.122 2.12A1.5 1.5 0 0 1 13.5 4.622V13.5A1.5 1.5 0 0 1 12 15H4.5A1.5 1.5 0 0 1 3 13.5v-11ZM4.5 2.5v11H12V5h-2.5A1.5 1.5 0 0 1 8 3.5V1h-3.5a.5.5 0 0 0-.5.5Z"/></svg>',
  spike:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1.5a.75.75 0 0 1 .75.75v1.19l1.72 1.72a.75.75 0 1 1-1.06 1.06L7.75 4.56V13.5a.75.75 0 0 1-1.5 0V4.56L5.59 5.72a.75.75 0 1 1-1.06-1.06L6.25 3.44V2.25A.75.75 0 0 1 8 1.5Z"/></svg>',
  chore:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5.5 2A1.5 1.5 0 0 0 4 3.5V5H2.75a.75.75 0 0 0 0 1.5H4v1H2.75a.75.75 0 0 0 0 1.5H4v1.5A1.5 1.5 0 0 0 5.5 12h5a1.5 1.5 0 0 0 1.5-1.5V9h1.25a.75.75 0 0 0 0-1.5H12V6h1.25a.75.75 0 0 0 0-1.5H12V3.5A1.5 1.5 0 0 0 10.5 2h-5ZM5.5 3.5h5V11h-5V3.5Z"/></svg>',
  inbox:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2.5 3A1.5 1.5 0 0 1 4 1.5h8A1.5 1.5 0 0 1 13.5 3v3.879l1.06 1.06A1.5 1.5 0 0 1 15 8.94V13.5A1.5 1.5 0 0 1 13.5 15h-11A1.5 1.5 0 0 1 1 13.5V8.94c0-.398.158-.78.44-1.06L2.5 6.879V3Zm1.5-.5a.5.5 0 0 0-.5.5v3.25a.75.75 0 0 1-.22.53L2.5 8.56V13.5h11V8.56l-1.28-1.28a.75.75 0 0 1-.22-.53V3a.5.5 0 0 0-.5-.5H4Z"/></svg>',
  filter:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M1.5 2.75A.75.75 0 0 1 2.25 2h11.5a.75.75 0 0 1 .53 1.28L10.06 8l4.22 4.72a.75.75 0 0 1-.53 1.28H2.25a.75.75 0 0 1-.53-1.28L5.94 8 1.72 3.28A.75.75 0 0 1 1.5 2.75Zm2.55-.25 3.2 3.6a.75.75 0 0 1 0 1l-3.2 3.6h8.5l-3.2-3.6a.75.75 0 0 1 0-1l3.2-3.6h-8.5Z"/></svg>',
  plus:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2.75a.75.75 0 0 1 .75.75V7h3.5a.75.75 0 0 1 0 1.5H8.75v3.5a.75.75 0 0 1-1.5 0V8.5H4a.75.75 0 0 1 0-1.5h3.25V3.5A.75.75 0 0 1 8 2.75Z"/></svg>',
  chevron:
    '<svg class="ico ico-chevron" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4.5 6 8 9.5 11.5 6z"/></svg>',
  calendar:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M4.75 1.5a.75.75 0 0 1 .75.75V3h5V2.25a.75.75 0 0 1 1.5 0V3h.75A2.25 2.25 0 0 1 14 5.25v7A2.25 2.25 0 0 1 11.75 14.5h-7.5A2.25 2.25 0 0 1 2 12.25v-7A2.25 2.25 0 0 1 4.25 3H5V2.25a.75.75 0 0 1 .75-.75ZM3.5 6.5v5.75c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75V6.5h-9Z"/></svg>',
  label:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M2.5 3A1.5 1.5 0 0 1 4 1.5h4.379a1.5 1.5 0 0 1 1.06.44l4.621 4.62v4.94A1.5 1.5 0 0 1 12.56 13l-4.62-4.62A1.5 1.5 0 0 1 7.5 7.44V3H4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V6.56L8.44 3H4.5Z"/></svg>',
  trash:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5 3V2.25A1.25 1.25 0 0 1 6.25 1h3.5A1.25 1.25 0 0 1 11 2.25V3h2.25a.75.75 0 0 1 0 1.5h-.44l-.73 9.02A1.75 1.75 0 0 1 10.34 15H5.66a1.75 1.75 0 0 1-1.74-1.48L3.19 4.5H3a.75.75 0 0 1 0-1.5H5Zm1.5-.5a.25.25 0 0 0-.25.25V3h4V2.75a.25.25 0 0 0-.25-.25h-3.5ZM4.69 4.5l.71 8.75a.25.25 0 0 0 .25.25h4.7a.25.25 0 0 0 .25-.25l.71-8.75H4.69Z"/></svg>',
  folder:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M1.75 3.5A1.25 1.25 0 0 1 3 2.25h3.17a1.25 1.25 0 0 1 .88.36l.95.95c.23.23.55.36.88.36H13A1.25 1.25 0 0 1 14.25 5v7.25A1.25 1.25 0 0 1 13 13.5H3A1.25 1.25 0 0 1 1.75 12.25V3.5ZM3 3.75v8.5h10V5.62l-3.7-2.37H7.88L6.93 2.3A.25.25 0 0 0 6.75 2.25H3a.25.25 0 0 0-.25.25v1.25Z"/></svg>',
  folderOpen:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M1.75 3.5A1.25 1.25 0 0 1 3 2.25h3.17a1.25 1.25 0 0 1 .88.36l.95.95c.23.23.55.36.88.36H13A1.25 1.25 0 0 1 14.25 5v1.06l-9.5 5.7V3.75a.25.25 0 0 0-.25-.25H3a.25.25 0 0 0-.25.25V3.5Zm11.06 3.19L3.5 12.44V12.25c0-.69.56-1.25 1.25-1.25h8.5c.35 0 .67-.15.89-.39l.17-.2Z"/></svg>',
};

const CHEVRON_DOWN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23aaa' d='M4.5 6 8 9.5 11.5 6z'/%3E%3C/svg%3E";

function getSharedWebviewCss() {
  return `
  .ico { width: 14px; height: 14px; display: inline-block; vertical-align: -2px; flex-shrink: 0; opacity: .9; }
  .ico-lg { width: 16px; height: 16px; vertical-align: -3px; }
  .ico-chevron { transition: transform .15s; }
  .ico-chevron.open { transform: rotate(180deg); }
  select, input[type="text"], textarea {
    appearance: none; -webkit-appearance: none;
    background-color: var(--vscode-dropdown-background, #313131);
    color: var(--vscode-dropdown-foreground, #e6e6e6);
    border: 1px solid var(--vscode-dropdown-border, var(--vscode-input-border, #555));
  }
  select {
    background-image: url("${CHEVRON_DOWN}");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 12px;
    padding-right: 30px;
    cursor: pointer;
  }
  select option, select optgroup {
    background-color: var(--vscode-dropdown-background, #313131);
    color: var(--vscode-dropdown-foreground, #e6e6e6);
  }
  input[readonly] {
    background-color: var(--vscode-input-background, #2d2d2d);
    color: var(--vscode-input-foreground, #ccc);
    opacity: .85;
  }
  .label-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
  .label-row span { font-size: 11px; font-weight: 600; color: var(--vscode-foreground); }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
  .dot-todo { background: #6b7280; }
  .dot-progress { background: #3b82f6; }
  .dot-review { background: #8b5cf6; }
  .dot-done { background: #22c55e; }
  .prio-dot { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .prio-urgent, .prio-high { background: #ef4444; }
  .prio-medium { background: #f59e0b; }
  .prio-low { background: #3b82f6; }
  .prio-no-priority { background: #6b7280; }
`;
}

/**
 * @param {string} name
 */
function icon(name) {
  return ICONS[name] || "";
}

/**
 * @param {string} status
 */
function statusDotClass(status) {
  if (status === "in-progress") return "dot-progress";
  if (status === "in-review") return "dot-review";
  if (status === "done") return "dot-done";
  return "dot-todo";
}

module.exports = { getSharedWebviewCss, icon, statusDotClass, ICONS };
