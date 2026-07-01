local M = {}

function M.slugify(text, max_len)
  max_len = max_len or 40
  text = vim.fn.tolower(tostring(text or ""))
  text = text:gsub("[^a-z0-9]+", "-"):gsub("^-+", ""):gsub("-+$", "")
  return text:sub(1, max_len):gsub("-+$", "")
end

function M.build_branch_name(opts)
  local slug = string.lower(opts.project_slug or "task")
  local title = M.slugify(opts.task_title, opts.title_max or 40)
  local name = (opts.pattern or "{slug}-{number}-{title}")
    :gsub("{slug}", slug)
    :gsub("{number}", tostring(opts.task_number))
    :gsub("{title}", title ~= "" and title or "task")

  if opts.prefix and opts.prefix ~= "" then
    local p = opts.prefix:match("/$") and opts.prefix or (opts.prefix .. "/")
    name = p .. name
  end

  name = name
    :gsub("/+", "/")
    :gsub("[^a-zA-Z0-9/._%-]+", "-")
    :gsub("-+", "-")
    :gsub("/%-+", "/")

  if name == "" or #name > 200 then
    error("Nombre de rama inválido: " .. (name == "" and "(vacío)" or name))
  end
  return name
end

return M
