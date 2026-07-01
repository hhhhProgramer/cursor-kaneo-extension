local config = require("kaneo.config")

local M = {}

local function encodeURIComponent(s)
  return (s:gsub("([^%w%-%.%_%~])", function(c)
    return string.format("%%%02X", string.byte(c))
  end))
end

local function read_api_key_file()
  local path = vim.fn.expand("~/.config/kaneo/api-key")
  if vim.fn.filereadable(path) ~= 1 then
    return nil
  end
  return (vim.fn.readfile(path)[1] or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

function M.get_config()
  local opts = config.get()
  local api_key = config.resolve_api_key()
  local base_url = (opts.api_base_url or "http://10.8.0.1:8100"):gsub("/+$", "")
  return {
    base_url = base_url,
    api_key = api_key,
    workspace_id = (opts.workspace_id or ""):gsub("^%s+", ""):gsub("%s+$", ""),
    project_id = (opts.project_id or ""):gsub("^%s+", ""):gsub("%s+$", ""),
    branch_pattern = opts.branch_pattern or "{slug}-{number}-{title}",
    title_slug_max_length = opts.title_slug_max_length or 40,
    move_to_in_progress = opts.move_to_in_progress_on_start_work ~= false,
    assign_to_me_on_start_work = opts.assign_to_me_on_start_work ~= false,
    comment_branch_on_start_work = opts.comment_branch_on_start_work ~= false,
    store_branch_link = opts.store_branch_link ~= false,
    in_progress_status = opts.in_progress_status or "in-progress",
    user_id = (opts.user_id or ""):gsub("^%s+", ""):gsub("%s+$", ""),
    user_email = (opts.user_email or ""):gsub("^%s+", ""):gsub("%s+$", ""),
    dashboard_path = opts.dashboard_path
      or "/dashboard/workspace/{workspaceId}/project/{projectId}/board",
    branch_types = opts.branch_types or { "feature", "fix", "hotfix", "chore" },
    push_on_start_work = opts.push_on_start_work == true,
  }
end

function M.assert_configured(cfg)
  if not cfg.api_key or cfg.api_key == "" then
    error("Falta API key. Configura api_key, KANEO_API_KEY o ~/.config/kaneo/api-key")
  end
end

local function parse_json(text)
  if not text or text == "" then
    return nil
  end
  local ok, body = pcall(vim.json.decode, text)
  if ok then
    return body
  end
  return text
end

function M.request(path, init)
  init = init or {}
  local cfg = M.get_config()
  M.assert_configured(cfg)
  local method = init.method or "GET"
  local url = cfg.base_url .. (path:match("^/") and path or ("/" .. path))
  local headers = {
    "Authorization: Bearer " .. cfg.api_key,
    "Accept: application/json",
  }
  if init.body then
    table.insert(headers, "Content-Type: application/json")
  end
  local args = { "curl", "-sS", "-X", method, url }
  for _, h in ipairs(headers) do
    table.insert(args, "-H")
    table.insert(args, h)
  end
  if init.body then
    table.insert(args, "-d")
    table.insert(args, init.body)
  end
  table.insert(args, "-w")
  table.insert(args, "\n__HTTP_CODE__:%{http_code}")

  local out = vim.fn.system(args)
  if vim.v.shell_error ~= 0 then
    error("curl falló: " .. (out:match("^(.-)\n") or out))
  end
  local code = out:match("__HTTP_CODE__:(%d%d%d)$")
  local body = out:gsub("\n__HTTP_CODE__:%d%d%d$", "")
  local parsed = parse_json(body)
  if tonumber(code) >= 400 then
    local detail = "HTTP " .. code
    if type(parsed) == "table" and parsed.message then
      detail = parsed.message
    elseif type(parsed) == "string" and parsed ~= "" then
      detail = parsed:sub(1, 300)
    end
    error(path .. ": " .. detail)
  end
  return parsed
end

function M.list_workspaces()
  return M.request("/api/auth/organization/list", { method = "GET" })
end

function M.list_projects(workspace_id)
  return M.request("/api/project?workspaceId=" .. encodeURIComponent(workspace_id), { method = "GET" })
end

function M.list_tasks(project_id)
  return M.request("/api/task/tasks/" .. encodeURIComponent(project_id), { method = "GET" })
end

function M.get_task(task_id)
  return M.request("/api/task/" .. encodeURIComponent(task_id), { method = "GET" })
end

function M.update_task_status(task_id, status)
  return M.request("/api/task/status/" .. encodeURIComponent(task_id), {
    method = "PUT",
    body = vim.json.encode({ status = status }),
  })
end

function M.update_task_assignee(task_id, user_id)
  return M.request("/api/task/assignee/" .. encodeURIComponent(task_id), {
    method = "PUT",
    body = vim.json.encode({ userId = user_id or "" }),
  })
end

function M.update_task_priority(task_id, priority)
  return M.request("/api/task/priority/" .. encodeURIComponent(task_id), {
    method = "PUT",
    body = vim.json.encode({ priority = priority }),
  })
end

function M.get_workspace_members(workspace_id)
  return M.request("/api/workspace/" .. encodeURIComponent(workspace_id) .. "/members", { method = "GET" })
end

function M.list_comments(task_id)
  return M.request("/api/comment/" .. encodeURIComponent(task_id), { method = "GET" })
end

function M.create_comment(task_id, content)
  return M.request("/api/comment/" .. encodeURIComponent(task_id), {
    method = "POST",
    body = vim.json.encode({ content = content }),
  })
end

function M.list_activities(task_id)
  return M.request("/api/activity/" .. encodeURIComponent(task_id), { method = "GET" })
end

function M.task_board_url(workspace_id, project_id)
  local cfg = M.get_config()
  local path = cfg.dashboard_path
    :gsub("{workspaceId}", workspace_id)
    :gsub("{projectId}", project_id)
  return cfg.base_url .. path
end

M.encodeURIComponent = encodeURIComponent
M.read_api_key_file = read_api_key_file

return M
