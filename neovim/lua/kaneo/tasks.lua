local M = {}

function M.task_key(task, project_slug)
  local slug = string.upper(project_slug or "TASK")
  local num = task.number ~= nil and task.number or "?"
  return slug .. "-" .. tostring(num)
end

function M.parse_board_response(raw)
  local data = raw
  if type(raw) == "table" and raw.data then
    data = raw.data
  end
  if not data then
    return { project = nil, columns = {}, all_tasks = {} }
  end

  local columns = data.columns or {}
  local all_tasks = {}
  for _, col in ipairs(columns) do
    for _, task in ipairs(col.tasks or {}) do
      table.insert(all_tasks, vim.tbl_extend("force", task, {
        status = task.status or col.id or col.slug,
        statusName = col.name or task.status,
      }))
    end
  end

  for _, t in ipairs(data.archivedTasks or {}) do
    table.insert(all_tasks, vim.tbl_extend("force", t, { status = t.status or "archived" }))
  end
  for _, t in ipairs(data.plannedTasks or {}) do
    table.insert(all_tasks, vim.tbl_extend("force", t, { status = t.status or "planned" }))
  end

  return {
    project = {
      id = data.id,
      name = data.name,
      slug = data.slug,
      workspaceId = data.workspaceId,
    },
    columns = columns,
    all_tasks = all_tasks,
  }
end

M.PRIORITY_LABELS = {
  urgent = "Urgent",
  high = "High",
  medium = "Medium",
  low = "Low",
  ["no-priority"] = "None",
}

function M.format_date_short(iso)
  if not iso or iso == "" then
    return ""
  end
  return tostring(iso):sub(1, 10)
end

return M
