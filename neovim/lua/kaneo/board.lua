local api = require("kaneo.api")
local kql = require("kaneo.kql")
local tasks_mod = require("kaneo.tasks")
local storage = require("kaneo.storage")
local start_work = require("kaneo.start_work")
local git = require("kaneo.git")
local ui = require("kaneo.ui")

local M = {}

local BUF_NAME = "kaneo://board"
local NS = vim.api.nvim_create_namespace("kaneo-board")

M.state = {
  board = nil,
  line_tasks = {},
  workspace_id = nil,
  global_kql = "",
}

local function resolve_user_id(cfg)
  if cfg.user_id and cfg.user_id ~= "" then
    return cfg.user_id
  end
  return storage.get_user_id()
end

function M.fetch_board()
  local cfg = api.get_config()
  if not cfg.project_id or cfg.project_id == "" then
    error("Elige un proyecto (:KaneoSelectProject)")
  end
  local workspace_id = cfg.workspace_id
  if not workspace_id or workspace_id == "" then
    local workspaces = api.list_workspaces()
    if type(workspaces) == "table" and workspaces[1] then
      workspace_id = workspaces[1].id
    end
  end
  M.state.workspace_id = workspace_id
  local raw = api.list_tasks(cfg.project_id)
  M.state.board = tasks_mod.parse_board_response(raw)
  M.state.global_kql = storage.get_global_kql()
  return M.state.board
end

local function filter_tasks(all_tasks, predicate)
  local out = {}
  for _, t in ipairs(all_tasks) do
    if predicate(t) then
      table.insert(out, t)
    end
  end
  table.sort(out, function(a, b)
    return (a.number or 0) < (b.number or 0)
  end)
  return out
end

function M.render_buffer(buf)
  local board = M.state.board
  if not board or not board.project then
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, { "Kaneo: sin proyecto o sin datos." })
    return
  end

  local cfg = api.get_config()
  local ctx = {
    project_slug = board.project.slug,
    user_id = resolve_user_id(cfg),
  }
  local global_pred = kql.compile_kql(M.state.global_kql, ctx)
  local all_tasks = filter_tasks(board.all_tasks, global_pred)
  for _, t in ipairs(all_tasks) do
    t.key = tasks_mod.task_key(t, board.project.slug)
  end

  local sections = storage.get_sections(board.project.id)
  local lines = {}
  M.state.line_tasks = {}

  table.insert(lines, "# Kaneo — " .. (board.project.name or ""))
  table.insert(lines, "")
  table.insert(lines, "Filtro global: " .. (M.state.global_kql ~= "" and M.state.global_kql or "(ninguno)"))
  table.insert(lines, "  r=refresh  Enter=detalle  s=Start Work  f=filtro  p=proyecto  q=quit")
  table.insert(lines, "")

  for _, sec in ipairs(sections) do
    local pred = kql.compile_kql(sec.query or "", ctx)
    local sec_tasks = filter_tasks(all_tasks, pred)
    table.insert(lines, string.format("## %s (%d)", sec.name, #sec_tasks))
    if sec.query and sec.query ~= "" then
      table.insert(lines, "   KQL: " .. sec.query)
    end
    if #sec_tasks == 0 then
      table.insert(lines, "   (sin tareas)")
    else
      for _, t in ipairs(sec_tasks) do
        local meta = string.format("[%s] %s · %s", t.key, t.statusName or t.status or "?", t.priority or "-")
        table.insert(lines, "  " .. meta .. " — " .. (t.title or ""))
        M.state.line_tasks[#lines] = t
      end
    end
    table.insert(lines, "")
  end

  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.api.nvim_buf_clear_namespace(buf, NS, 0, -1)
  for ln, task in pairs(M.state.line_tasks) do
    vim.api.nvim_buf_set_extmark(buf, NS, ln - 1, 0, {
      id = ln,
      virt_text = { { "  " .. task.id, "Comment" } },
      virt_text_pos = "eol",
    })
  end
end

local function task_on_cursor()
  local buf = vim.api.nvim_get_current_buf()
  local row = vim.api.nvim_win_get_cursor(0)[1]
  return M.state.line_tasks[row]
end

function M.open_task_detail(task)
  if not task then
    return
  end
  local cfg = api.get_config()
  local full = api.get_task(task.id)
  local comments = {}
  local ok_c, listed = pcall(api.list_comments, task.id)
  if ok_c and type(listed) == "table" then
    comments = listed
  end
  local link = storage.get_branch_link(task.id)

  local lines = {
    "# " .. (full.title or task.title or ""),
    "",
    "**Clave:** " .. tasks_mod.task_key(full, M.state.board and M.state.board.project.slug),
    "**Estado:** " .. tostring(full.status or ""),
    "**Prioridad:** " .. tostring(full.priority or ""),
    "",
    "## Descripción",
    full.description or "(vacía)",
    "",
    "## Desarrollo",
  }
  if link and link.branchName then
    table.insert(lines, "- Rama: `" .. link.branchName .. "`")
    if link.githubUrl then
      table.insert(lines, "- GitHub: " .. link.githubUrl)
    end
  else
    table.insert(lines, "(sin rama vinculada — usa Start Work)")
  end
  table.insert(lines, "")
  table.insert(lines, "## Comentarios")
  if type(comments) == "table" then
    for _, c in ipairs(comments) do
      local who = (c.user and c.user.name) or "Usuario"
      table.insert(lines, string.format("- **%s:** %s", who, c.content or ""))
    end
  end

  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].filetype = "markdown"
  vim.bo[buf].bufhidden = "wipe"
  vim.cmd("split")
  vim.api.nvim_set_current_buf(buf)
  vim.bo[buf].modifiable = false

  vim.keymap.set("n", "s", function()
    start_work.prompt(full, M.state.board and M.state.board.project, M.state.workspace_id)
  end, { buffer = buf, desc = "Kaneo Start Work" })

  vim.keymap.set("n", "o", function()
    local url = api.task_board_url(M.state.workspace_id or cfg.workspace_id, cfg.project_id)
    git.open_external(url)
  end, { buffer = buf, desc = "Abrir en Kaneo" })
end

local function setup_keymaps(buf)
  vim.keymap.set("n", "r", function()
    M.refresh(buf)
  end, { buffer = buf, desc = "Kaneo refresh" })

  vim.keymap.set("n", "<CR>", function()
    M.open_task_detail(task_on_cursor())
  end, { buffer = buf, desc = "Kaneo task detail" })

  vim.keymap.set("n", "s", function()
    local task = task_on_cursor()
    if task then
      start_work.prompt(task, M.state.board and M.state.board.project, M.state.workspace_id)
      M.refresh(buf)
    end
  end, { buffer = buf, desc = "Kaneo Start Work" })

  vim.keymap.set("n", "f", function()
    local q = ui.input("KQL global: ", M.state.global_kql)
    if q ~= nil then
      M.state.global_kql = q
      storage.set_global_kql(q)
      M.render_buffer(buf)
    end
  end, { buffer = buf, desc = "Kaneo filter" })

  vim.keymap.set("n", "p", function()
    require("kaneo").select_project()
    M.refresh(buf)
  end, { buffer = buf, desc = "Kaneo project" })

  vim.keymap.set("n", "q", function()
    vim.api.nvim_buf_delete(buf, { force = true })
  end, { buffer = buf, desc = "Close board" })
end

function M.refresh(buf)
  vim.schedule(function()
    local ok, err = pcall(function()
      M.fetch_board()
      M.render_buffer(buf)
    end)
    if not ok then
      ui.notify(tostring(err), vim.log.levels.ERROR)
    end
  end)
end

function M.open()
  local existing = vim.fn.bufnr(BUF_NAME, true)
  local buf
  if existing > 0 and vim.api.nvim_buf_is_valid(existing) then
    buf = existing
  else
    buf = vim.api.nvim_create_buf(false, true)
    vim.api.nvim_buf_set_name(buf, BUF_NAME)
    vim.bo[buf].bufhidden = "hide"
    vim.bo[buf].filetype = "kaneo-board"
    vim.bo[buf].buflisted = false
    setup_keymaps(buf)
  end

  vim.api.nvim_set_current_buf(buf)
  M.refresh(buf)
end

return M
