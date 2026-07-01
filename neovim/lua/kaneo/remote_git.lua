local M = {}

local function detect_provider(host, path, override)
  if override and override ~= "" and override ~= "auto" then
    return override
  end
  host = string.lower(host or "")
  if host:match("^github%.com$") or host:match("^www%.github%.com$") then
    return "github"
  end
  if host:match("^gitlab%.com$") or host:find("gitlab", 1, true) then
    return "gitlab"
  end
  if host:match("^gitea%.com$") or host:match("^codeberg%.org$") then
    return "gitea"
  end
  if host:match("^bitbucket%.org$") then
    return "bitbucket"
  end
  if (path or ""):find("/-/", 1, true) or host:find("forgejo", 1, true) then
    return "gitlab"
  end
  return "generic"
end

local function default_web_base(host, original)
  local m = original:match("^(https?://[^/]+)")
  if m then
    return m:gsub("/+$", "")
  end
  return "https://" .. host
end

--- @param string remote_url
--- @param table|nil opts { provider?, web_base_url? }
function M.parse_remote(remote_url, opts)
  opts = opts or {}
  if not remote_url or remote_url == "" then
    return nil
  end
  local s = vim.trim(remote_url)
  local host, path

  local user, repo_path = s:match("^git@([^:]+):(.+)$")
  if user then
    host = string.lower(user)
    path = repo_path:gsub("%.git$", "")
  else
    host, path = s:match("^https?://([^/]+)/(.+)$")
    if not host then
      return nil
    end
    host = string.lower(host)
    path = path:gsub("%.git$", ""):gsub("/+$", "")
  end

  local parts = vim.split(path, "/", { plain = true })
  if #parts < 2 then
    return nil
  end
  local repo = parts[#parts]
  table.remove(parts)
  local owner_path = table.concat(parts, "/")
  local project_path = owner_path ~= "" and (owner_path .. "/" .. repo) or repo

  local provider = detect_provider(host, path, opts.provider)
  local web_base = (opts.web_base_url or ""):gsub("/+$", "")
  if web_base == "" then
    web_base = default_web_base(host, s)
  end

  return {
    host = host,
    owner_path = owner_path,
    repo = repo,
    project_path = project_path,
    provider = provider,
    web_base = web_base,
  }
end

function M.provider_label(provider)
  if provider == "github" then
    return "GitHub"
  end
  if provider == "gitlab" then
    return "GitLab"
  end
  if provider == "gitea" then
    return "Gitea"
  end
  if provider == "bitbucket" then
    return "Bitbucket"
  end
  return "Git"
end

local function encode_branch_path(branch_name)
  return branch_name:gsub("[^/]+", function(seg)
    return (seg:gsub("([^%w%-%.%_%~])", function(c)
      return string.format("%%%02X", string.byte(c))
    end))
  end)
end

function M.branch_web_url(remote, branch_name)
  if not remote or not branch_name then
    return nil
  end
  local ref = encode_branch_path(branch_name)
  local base = remote.web_base .. "/" .. remote.project_path
  if remote.provider == "github" or remote.provider == "generic" then
    return base .. "/tree/" .. ref
  end
  if remote.provider == "gitlab" then
    return base .. "/-/tree/" .. ref
  end
  if remote.provider == "gitea" then
    return base .. "/src/branch/" .. ref
  end
  if remote.provider == "bitbucket" then
    return base .. "/src/" .. ref
  end
  return base .. "/-/tree/" .. ref
end

function M.merge_request_new_url(remote, base_branch, head_branch)
  if not remote or not head_branch then
    return nil
  end
  local base = (base_branch or "main"):gsub("^origin/", ""):gsub("^upstream/", "")
  local head_path = encode_branch_path(head_branch)
  local head_q = vim.uri_encode(head_branch)
  local root = remote.web_base .. "/" .. remote.project_path

  if remote.provider == "github" then
    return root .. "/compare/" .. vim.uri_encode(base) .. "..." .. head_path .. "?expand=1"
  end
  if remote.provider == "gitlab" then
    return root
      .. "/-/merge_requests/new?merge_request[source_branch]="
      .. head_q
      .. "&merge_request[target_branch]="
      .. vim.uri_encode(base)
  end
  if remote.provider == "gitea" then
    return root .. "/compare/" .. vim.uri_encode(base) .. "..." .. head_path
  end
  if remote.provider == "bitbucket" then
    return root .. "/pull-requests/new?source=" .. head_q .. "&dest=" .. vim.uri_encode(base)
  end
  return root
    .. "/-/merge_requests/new?merge_request[source_branch]="
    .. head_q
    .. "&merge_request[target_branch]="
    .. vim.uri_encode(base)
end

return M
