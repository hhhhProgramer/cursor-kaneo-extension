local config = require("kaneo.config")

local M = {}

function M.setup(opts)
  config.setup(opts)
end

function M.board()
  require("kaneo.board").open()
end

function M.refresh()
  local board = require("kaneo.board")
  local buf = vim.fn.bufnr("kaneo://board", true)
  if buf <= 0 then
    M.board()
    return
  end
  board.refresh(buf)
end

function M.select_project()
  local api = require("kaneo.api")
  local ui = require("kaneo.ui")
  local cfg = api.get_config()

  local workspaces = api.list_workspaces()
  if type(workspaces) ~= "table" or #workspaces == 0 then
    ui.notify("No hay workspaces. ¿VPN activa?", vim.log.levels.ERROR)
    return
  end

  local workspace_id = cfg.workspace_id
  if workspace_id == "" or #workspaces > 1 then
    local ws = ui.select("Workspace Kaneo", vim.tbl_map(function(w)
      return { id = w.id, label = (w.name or w.slug or w.id) .. " (" .. (w.slug or "") .. ")" }
    end, workspaces))
    if not ws then
      return
    end
    workspace_id = ws.id
    config.options.workspace_id = workspace_id
  end

  local projects = api.list_projects(workspace_id)
  if type(projects) ~= "table" or #projects == 0 then
    ui.notify("Sin proyectos.", vim.log.levels.ERROR)
    return
  end

  local proj = ui.select("Proyecto Kaneo", vim.tbl_map(function(p)
    return { id = p.id, label = (p.name or p.slug or p.id) .. " (" .. (p.slug or "") .. ")" }
  end, projects))
  if not proj then
    return
  end

  config.options.project_id = proj.id
  config.options.workspace_id = workspace_id
  ui.notify("Proyecto «" .. proj.label .. "» seleccionado.")
end

function M.start_work()
  local api = require("kaneo.api")
  local ui = require("kaneo.ui")
  local board_mod = require("kaneo.board")
  local start_work = require("kaneo.start_work")
  local tasks_mod = require("kaneo.tasks")
  local kql = require("kaneo.kql")
  local cfg = api.get_config()

  local board = board_mod.state.board
  if not board then
    pcall(board_mod.fetch_board)
    board = board_mod.state.board
  end
  if not board or not board.all_tasks or #board.all_tasks == 0 then
    ui.notify("No hay tareas. Actualiza el board.", vim.log.levels.WARN)
    return
  end

  local ctx = { project_slug = board.project and board.project.slug, user_id = cfg.user_id }
  local pred = kql.compile_kql(board_mod.state.global_kql or "", ctx)
  local items = {}
  for _, t in ipairs(board.all_tasks) do
    if pred(t) then
      table.insert(items, {
        task = t,
        label = tasks_mod.task_key(t, board.project.slug) .. " — " .. (t.title or ""),
      })
    end
  end

  local pick = ui.select("Start Work", items)
  if pick then
    start_work.prompt(pick.task, board.project, board_mod.state.workspace_id)
  end
end

return M
