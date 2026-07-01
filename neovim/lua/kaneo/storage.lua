local M = {}

local DEFAULT_SECTIONS = {
  { id = "assigned-me", name = "Asignadas a mí", query = "assignee = me", builtin = true },
  { id = "unassigned", name = "Sin asignar", query = "assignee is empty", builtin = true },
}

local function data_path()
  return vim.fn.stdpath("data") .. "/kaneo/storage.json"
end

function M._read_all()
  local path = data_path()
  if vim.fn.filereadable(path) ~= 1 then
    return {}
  end
  local ok, data = pcall(vim.json.decode, table.concat(vim.fn.readfile(path), "\n"))
  if ok and type(data) == "table" then
    return data
  end
  return {}
end

function M._write_all(data)
  local path = data_path()
  vim.fn.mkdir(vim.fn.fnamemodify(path, ":h"), "p")
  vim.fn.writefile(vim.split(vim.json.encode(data), "\n"), path)
end

function M.get_sections(project_id)
  local all = M._read_all()
  local key = "sections:" .. (project_id or "default")
  local custom = all[key]
  if type(custom) ~= "table" or #custom == 0 then
    local copy = {}
    for _, s in ipairs(DEFAULT_SECTIONS) do
      table.insert(copy, vim.deepcopy(s))
    end
    return copy
  end
  return custom
end

function M.save_sections(project_id, sections)
  local all = M._read_all()
  all["sections:" .. (project_id or "default")] = sections
  M._write_all(all)
end

function M.get_global_kql()
  local all = M._read_all()
  return all.global_kql or ""
end

function M.set_global_kql(query)
  local all = M._read_all()
  all.global_kql = query or ""
  M._write_all(all)
end

function M.get_user_id()
  local all = M._read_all()
  return all.user_id or ""
end

function M.set_user_id(user_id)
  local all = M._read_all()
  all.user_id = user_id or ""
  M._write_all(all)
end

function M.get_branch_link(task_id)
  local all = M._read_all()
  local links = all.branch_links or {}
  return links[task_id]
end

function M.set_branch_link(task_id, link)
  local all = M._read_all()
  all.branch_links = all.branch_links or {}
  all.branch_links[task_id] = vim.tbl_extend("force", link or {}, { linkedAt = os.date("!%Y-%m-%dT%H:%M:%SZ") })
  M._write_all(all)
  return all.branch_links[task_id]
end

return M
