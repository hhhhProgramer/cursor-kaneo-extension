local M = {}

function M.notify(msg, level)
  vim.notify(msg, level or vim.log.levels.INFO, { title = "Kaneo" })
end

function M.input(prompt, default)
  return vim.fn.input(prompt, default or "")
end

--- Synchronous picker via inputlist (works without coroutines).
function M.select(prompt, items, format)
  if #items == 0 then
    return nil
  end
  format = format or function(item)
    return item.label or tostring(item)
  end
  local labels = { prompt }
  for _, item in ipairs(items) do
    table.insert(labels, format(item))
  end
  local idx = vim.fn.inputlist(labels)
  if idx <= 0 then
    return nil
  end
  return items[idx]
end

function M.confirm(msg, default_yes)
  local r = vim.fn.input(msg .. " [y/N]: ", default_yes and "y" or "n")
  return r:lower():match("^y") ~= nil
end

return M
