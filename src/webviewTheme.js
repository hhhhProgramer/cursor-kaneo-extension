"use strict";

/** @type {Record<string, string>} */
const ICONS = {
  branch:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M10 2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM7 4.086V5.5H5.5a1.5 1.5 0 0 0-1.5 1.5v2.086a1.5 1.5 0 1 1-1 0V7A2.5 2.5 0 0 1 5.5 4.5H7V3.914a1.5 1.5 0 1 1 1 0ZM11 7.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-8 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm8 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/></svg>',
  refresh:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2.5a5.5 5.5 0 0 0-4.78 2.75h1.28a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75V3.47a.75.75 0 0 1 1.5 0v1.1A7 7 0 1 1 1 8a.75.75 0 0 1 1.5 0A5.5 5.5 0 1 0 8 2.5Z"/></svg>',
  external:
    '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M3 3.5A1.5 1.5 0 0 1 4.5 2h4.25a.75.75 0 0 1 0 1.5H4.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V8.75a.75.75 0 0 1 1.5 0V11.5A1.5 1.5 0 0 1 11.5 13h-7A1.5 1.5 0 0 1 3 11.5v-8ZM9.75 2.75a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0V4.56L7.28 9.78a.75.75 0 1 1-1.06-1.06l4.47-4.47H10.5a.75.75 0 0 1-.75-.75Z"/></svg>',
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
};

const CHEVRON_DOWN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23aaa' d='M4.5 6 8 9.5 11.5 6z'/%3E%3C/svg%3E";

function getSharedWebviewCss() {
  return `
  .ico { width: 14px; height: 14px; display: inline-block; vertical-align: -2px; flex-shrink: 0; opacity: .9; }
  .ico-lg { width: 16px; height: 16px; vertical-align: -3px; }
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
