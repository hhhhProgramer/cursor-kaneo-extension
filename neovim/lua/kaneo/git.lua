local M = {}

function M.git_root()
  local root = vim.fn.getcwd()
  local out = vim.fn.system({ "git", "-C", root, "rev-parse", "--show-toplevel" })
  if vim.v.shell_error ~= 0 then
    return nil
  end
  return vim.trim(out)
end

function M.run_git(root, ...)
  local args = { "git", "-C", root }
  for _, a in ipairs({ ... }) do
    table.insert(args, a)
  end
  local out = vim.fn.system(args)
  if vim.v.shell_error ~= 0 then
    error(vim.trim(out))
  end
  return vim.trim(out)
end

function M.get_info()
  local root = M.git_root()
  if not root then
    return { has_repo = false }
  end

  local branch = M.run_git(root, "branch", "--show-current")
  local origin_url = ""
  local ok_url = pcall(function()
    origin_url = M.run_git(root, "remote", "get-url", "origin")
  end)

  local remotes = {}
  local remotes_out = M.run_git(root, "remote")
  for name in remotes_out:gmatch("[^\n]+") do
    local url = ""
    pcall(function()
      url = M.run_git(root, "remote", "get-url", name)
    end)
    table.insert(remotes, { name = name, url = url })
  end

  local default_base = "main"
  pcall(function()
    local sym = M.run_git(root, "symbolic-ref", "refs/remotes/origin/HEAD")
    default_base = sym:gsub("^refs/remotes/origin/", "")
  end)

  local bases = { "main", "master", "develop", "dev" }
  local base_branches = {}
  local seen = {}
  for _, b in ipairs(bases) do
    if not seen[b] then
      seen[b] = true
      table.insert(base_branches, b)
    end
  end
  if default_base and not seen[default_base] then
    table.insert(base_branches, 1, default_base)
  end

  return {
    has_repo = true,
    root = root,
    branch = branch,
    origin_url = ok_url and origin_url or "",
    origin_name = "origin",
    remotes = remotes,
    default_base = default_base,
    base_branches = base_branches,
  }
end

function M.branch_exists(root, branch, remote)
  remote = remote or "origin"
  local out = vim.fn.system({ "git", "-C", root, "ls-remote", "--heads", remote, branch })
  return vim.v.shell_error == 0 and vim.trim(out) ~= ""
end

function M.create_and_checkout(root, branch_name, base_ref)
  base_ref = base_ref or "main"
  local exists = false
  pcall(function()
    M.run_git(root, "rev-parse", "--verify", branch_name)
    exists = true
  end)
  if exists then
    M.run_git(root, "checkout", branch_name)
    return { created = false, branch_name = branch_name }
  end
  M.run_git(root, "checkout", "-b", branch_name, base_ref)
  return { created = true, branch_name = branch_name, base_ref = base_ref }
end

function M.push(root, branch_name, remote)
  remote = remote or "origin"
  M.run_git(root, "push", "-u", remote, branch_name)
end

-- backward-compatible wrappers
function M.parse_github_repo(remote_url)
  local remote_git = require("kaneo.remote_git")
  local config = require("kaneo.config")
  local remote = remote_git.parse_remote(remote_url, config.git_remote_opts())
  if not remote then
    return nil
  end
  return { owner = remote.owner_path, repo = remote.repo }
end

function M.github_branch_url(remote_url, branch_name)
  local remote_git = require("kaneo.remote_git")
  local config = require("kaneo.config")
  local remote = remote_git.parse_remote(remote_url, config.git_remote_opts())
  if not remote then
    return nil
  end
  return remote_git.branch_web_url(remote, branch_name)
end

function M.branch_web_url(remote_url, branch_name)
  return M.github_branch_url(remote_url, branch_name)
end

function M.merge_request_url(remote_url, branch_name, base_ref)
  local remote_git = require("kaneo.remote_git")
  local config = require("kaneo.config")
  local remote = remote_git.parse_remote(remote_url, config.git_remote_opts())
  if not remote then
    return nil
  end
  return remote_git.merge_request_new_url(remote, base_ref, branch_name)
end

function M.open_external(url)
  if not url or url == "" then
    return
  end
  if vim.ui.open then
    vim.ui.open(url)
  else
    vim.fn.jobstart({ "xdg-open", url }, { detach = true })
  end
end

return M
