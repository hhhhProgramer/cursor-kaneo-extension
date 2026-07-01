local tasks = require("kaneo.tasks")

local M = {}

local function strip_quotes(s)
  return s:gsub("^['\"]", ""):gsub("['\"]$", "")
end

local function split_top_level(input, op)
  local parts = {}
  local depth = 0
  local current = ""
  local upper = string.upper(input)
  local token = " " .. op .. " "
  local i = 1
  while i <= #input do
    local c = input:sub(i, i)
    if c == "(" then
      depth = depth + 1
    elseif c == ")" then
      depth = depth - 1
    end
    if depth == 0 and upper:sub(i, i + #token - 1) == token then
      table.insert(parts, current)
      current = ""
      i = i + #token
    else
      current = current .. c
      i = i + 1
    end
  end
  table.insert(parts, current)
  return parts
end

local function get_field(task, field, ctx)
  field = field:lower()
  if field == "status" then
    return task.status
  elseif field == "priority" then
    return task.priority
  elseif field == "number" then
    return task.number
  elseif field == "key" then
    return tasks.task_key(task, ctx.project_slug)
  elseif field == "assignee" then
    return task.assigneeName or task.userId or task.assigneeId or ""
  elseif field == "duedate" or field == "due" then
    return task.dueDate or ""
  elseif field == "startdate" or field == "start" then
    return task.startDate or ""
  elseif field == "title" then
    return task.title
  end
  return task[field]
end

local function compile_clause(clause, ctx)
  local field_in, values_str = clause:match("^(%w+)%s+in%s*%(([^)]+)%)%s*$")
  if field_in then
    local field = field_in:lower()
    local values = {}
    for part in values_str:gmatch("[^,]+") do
      table.insert(values, strip_quotes(part:gsub("^%s+", ""):gsub("%s+$", "")):lower())
    end
    return function(task)
      local actual = tostring(get_field(task, field, ctx)):lower()
      for _, v in ipairs(values) do
        if actual == v then
          return true
        end
      end
      return false
    end
  end

  local field_is, empty_kind = clause:match("^(%w+)%s+is%s+(empty|not%s+empty)%s*$")
  if field_is then
    local field = field_is:lower()
    local want_empty = empty_kind:lower() == "empty"
    return function(task)
      local val = get_field(task, field, ctx)
      local empty = val == nil or val == "" or val == "null"
      return want_empty and empty or not empty
    end
  end

  local tilde = clause:match("^text%s*~%s*(.+)$")
  if tilde then
    local needle = strip_quotes(tilde):lower()
    return function(task)
      local hay = string.lower((task.title or "") .. " " .. (task.description or ""))
      return hay:find(needle, 1, true) ~= nil
    end
  end

  local field, op, expected = clause:match("^(%w+)%s*(=|!=)%s*(.+)$")
  if field then
    expected = strip_quotes(expected):lower()
    return function(task)
      if field:lower() == "assignee" and expected == "me" and ctx.user_id and ctx.user_id ~= "" then
        local actual = tostring(task.userId or task.assigneeId or "")
        if op == "=" then
          return actual == ctx.user_id
        end
        return actual ~= ctx.user_id
      end
      local actual = tostring(get_field(task, field, ctx)):lower()
      if op == "=" then
        return actual == expected
      end
      return actual ~= expected
    end
  end

  local needle = clause:lower()
  return function(task)
    return string.find(string.lower(task.title or ""), needle, 1, true) ~= nil
  end
end

function M.compile_kql(query, ctx)
  ctx = ctx or {}
  query = vim.trim(query or "")
  if query == "" then
    return function(_)
      return true
    end
  end

  local or_groups = split_top_level(query, "OR")
  local or_predicates = {}
  for _, group in ipairs(or_groups) do
    group = vim.trim(group)
    if group ~= "" then
      local and_parts = split_top_level(group, "AND")
      local and_predicates = {}
      for _, part in ipairs(and_parts) do
        part = vim.trim(part)
        if part ~= "" then
          table.insert(and_predicates, compile_clause(part, ctx))
        end
      end
    table.insert(or_predicates, function(task)
        for _, fn in ipairs(and_predicates) do
          if not fn(task) then
            return false
          end
        end
        return true
      end)
    end
  end

  return function(task)
    for _, fn in ipairs(or_predicates) do
      if fn(task) then
        return true
      end
    end
    return false
  end
end

M.KQL_EXAMPLES = {
  { label = "Todas", query = "" },
  { label = "Asignadas a mí", query = "assignee = me" },
  { label = "Sin asignar", query = "assignee is empty" },
  { label = "To Do", query = "status = to-do" },
  { label = "In Progress", query = "status = in-progress" },
  { label = "Alta prioridad", query = "priority = high" },
}

return M
