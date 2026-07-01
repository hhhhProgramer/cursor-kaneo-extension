local api = require("kaneo.api")
local branch = require("kaneo.branch")
local git = require("kaneo.git")
local storage = require("kaneo.storage")
local ui = require("kaneo.ui")

local M = {}

local function format_branch_comment(opts)
  local lines = { "**Start Work** (Neovim)" }
  if opts.github_url then
    table.insert(lines, "- **Branch:** [`" .. opts.branch_name .. "`](" .. opts.github_url .. ")")
  else
    table.insert(lines, "- **Branch:** `" .. opts.branch_name .. "`")
  end
  if opts.base_ref then
    table.insert(lines, "- **Base:** `" .. opts.base_ref .. "`")
  end
  return table.concat(lines, "\n")
end

function M.resolve_user_id(cfg, workspace_id)
  if cfg.user_id and cfg.user_id ~= "" then
    return cfg.user_id
  end
  local cached = storage.get_user_id()
  if cached ~= "" then
    return cached
  end
  if not workspace_id or workspace_id == "" then
    return nil
  end
  local members = api.get_workspace_members(workspace_id)
  if type(members) ~= "table" or #members == 0 then
    return nil
  end
  if cfg.user_email and cfg.user_email ~= "" then
    for _, m in ipairs(members) do
      if m.email and m.email:lower() == cfg.user_email:lower() then
        storage.set_user_id(m.id)
        return m.id
      end
    end
  end
  local pick = ui.select("Tu usuario Kaneo", vim.tbl_map(function(m)
    return { id = m.id, label = (m.name or m.email or m.id) .. (m.email and (" <" .. m.email .. ">") or "") }
  end, members))
  if pick then
    storage.set_user_id(pick.id)
    return pick.id
  end
  return nil
end

function M.run(task, opts)
  opts = opts or {}
  local cfg = api.get_config()
  local g = git.get_info()
  if not g.has_repo then
    ui.notify("Abre un directorio con repositorio Git.", vim.log.levels.ERROR)
    return false
  end

  local prefix = opts.prefix or "feature"
  prefix = prefix:gsub("/$", "")
  local branch_name
  if opts.branch_suffix and opts.branch_suffix ~= "" then
    local suffix = opts.branch_suffix:gsub("^/+", "")
    branch_name = suffix:match("^" .. prefix .. "/") and suffix or (prefix .. "/" .. suffix)
  else
    branch_name = branch.build_branch_name({
      pattern = cfg.branch_pattern,
      prefix = prefix,
      project_slug = opts.project_slug or "task",
      task_number = task.number or task.id,
      task_title = task.title,
      title_max = cfg.title_slug_max_length,
    })
  end

  branch_name = branch_name:gsub("/+", "/"):gsub("[^a-zA-Z0-9/._%-]+", "-"):gsub("-+", "-")

  local base_ref = opts.base_branch or g.default_base or "main"
  local remote_name = opts.remote_name or g.origin_name or "origin"
  local remote_url = g.origin_url or ""
  for _, r in ipairs(g.remotes or {}) do
    if r.name == remote_name then
      remote_url = r.url
      break
    end
  end

  local created_info = git.create_and_checkout(g.root, branch_name, base_ref)
  local do_push = opts.push
  if do_push == nil then
    do_push = cfg.push_on_start_work
  end
  if do_push then
    git.push(g.root, branch_name, remote_name)
  end

  local transition = opts.transition
  if transition == nil then
    transition = cfg.move_to_in_progress
  end
  if transition and task.status ~= cfg.in_progress_status then
    api.update_task_status(task.id, cfg.in_progress_status)
    if cfg.assign_to_me_on_start_work then
      local ws = opts.workspace_id or cfg.workspace_id
      local user_id = M.resolve_user_id(cfg, ws)
      if user_id then
        api.update_task_assignee(task.id, user_id)
      end
    end
  end

  local github_url = git.github_branch_url(remote_url, branch_name)
  if cfg.store_branch_link then
    storage.set_branch_link(task.id, {
      branchName = branch_name,
      remoteName = remote_name,
      remoteUrl = remote_url,
      baseRef = base_ref,
      repoPath = g.root,
      githubUrl = github_url,
      onOrigin = do_push or git.branch_exists(g.root, branch_name, remote_name),
    })
  end

  if cfg.comment_branch_on_start_work then
    pcall(api.create_comment, task.id, format_branch_comment({
      branch_name = branch_name,
      base_ref = base_ref,
      github_url = github_url,
    }))
  end

  local msg = (created_info.created and "Rama creada" or "Checkout") .. ": " .. branch_name
  if do_push then
    msg = msg .. " · push → " .. remote_name
  end
  ui.notify(msg)
  return true, branch_name
end

function M.prompt(task, project, workspace_id)
  local cfg = api.get_config()
  local g = git.get_info()
  local prefix = ui.select("Prefix", vim.tbl_map(function(p)
    return { label = p, value = p }
  end, cfg.branch_types or { "feature", "fix" }))
  if not prefix then
    return
  end

  local default_suffix = branch.build_branch_name({
    pattern = cfg.branch_pattern,
    prefix = nil,
    project_slug = project and project.slug or "task",
    task_number = task.number or task.id,
    task_title = task.title,
    title_max = cfg.title_slug_max_length,
  })

  local suffix = ui.input("Sufijo de rama (" .. prefix.value .. "/): ", default_suffix)
  if suffix == nil then
    return
  end

  local base = ui.select("Rama base", vim.tbl_map(function(b)
    return { label = b, value = b }
  end, g.base_branches or { "main" }))
  if not base then
    return
  end

  local push = ui.confirm("¿Push al remote?", cfg.push_on_start_work)
  local transition = ui.confirm("¿Cambiar estado → In Progress?", cfg.move_to_in_progress)

  M.run(task, {
    prefix = prefix.value,
    branch_suffix = prefix.value .. "/" .. suffix:gsub("^/+", ""),
    base_branch = base.value,
    push = push,
    transition = transition,
    project_slug = project and project.slug,
    workspace_id = workspace_id,
  })
end

return M
