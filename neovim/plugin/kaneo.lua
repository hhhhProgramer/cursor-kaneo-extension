if vim.g.loaded_kaneo then
  return
end
vim.g.loaded_kaneo = true

vim.api.nvim_create_user_command("KaneoBoard", function()
  require("kaneo").board()
end, { desc = "Abrir panel de actividades Kaneo" })

vim.api.nvim_create_user_command("KaneoRefresh", function()
  require("kaneo").refresh()
end, { desc = "Actualizar board Kaneo" })

vim.api.nvim_create_user_command("KaneoSelectProject", function()
  require("kaneo").select_project()
end, { desc = "Elegir workspace/proyecto Kaneo" })

vim.api.nvim_create_user_command("KaneoStartWork", function()
  require("kaneo").start_work()
end, { desc = "Start Work en una tarea Kaneo" })
