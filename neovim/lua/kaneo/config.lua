local M = {}

M.defaults = {
  api_base_url = "http://10.8.0.1:8100",
  api_key = "",
  workspace_id = "",
  project_id = "",
  user_id = "",
  user_email = "",
  branch_pattern = "{slug}-{number}-{title}",
  branch_types = { "feature", "fix", "hotfix", "chore", "docs", "refactor" },
  title_slug_max_length = 40,
  move_to_in_progress_on_start_work = true,
  assign_to_me_on_start_work = true,
  comment_branch_on_start_work = true,
  store_branch_link = true,
  in_progress_status = "in-progress",
  dashboard_path = "/dashboard/workspace/{workspaceId}/project/{projectId}/board",
  global_kql = "",
  push_on_start_work = false,
}

M.options = {}

function M.setup(opts)
  M.options = vim.tbl_deep_extend("force", M.defaults, opts or {})
end

function M.get()
  return M.options
end

function M.resolve_api_key()
  local key = (M.options.api_key or ""):gsub("^%s+", ""):gsub("%s+$", "")
  if key ~= "" then
    return key
  end
  key = (vim.env.KANEO_API_KEY or vim.env.API_KEY or ""):gsub("^%s+", ""):gsub("%s+$", "")
  if key ~= "" then
    return key
  end
  local path = vim.fn.expand("~/.config/kaneo/api-key")
  if vim.fn.filereadable(path) == 1 then
    return (vim.fn.readfile(path)[1] or ""):gsub("^%s+", ""):gsub("%s+$", "")
  end
  return ""
end

return M
