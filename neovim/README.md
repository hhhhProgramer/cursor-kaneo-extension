# kaneo.nvim

Plugin de **Neovim** (parte del monorepo [cursor-kaneo-extension](https://github.com/hhhhProgramer/cursor-kaneo-extension)) para Kaneo self-hosted.

Versión: ver [`VERSION`](VERSION) · Release: tag `nvim-v*`

## Instalación rápida (tarball)

```bash
curl -LO https://github.com/hhhhProgramer/cursor-kaneo-extension/releases/download/nvim-v0.1.0/kaneo-nvim-0.1.0.tar.gz
mkdir -p ~/.local/share/nvim/site/pack/kaneo/start
tar -xzf kaneo-nvim-0.1.0.tar.gz -C ~/.local/share/nvim/site/pack/kaneo/start
```

Desde el monorepo:

```bash
npm run package:neovim
npm run install:neovim
```

## lazy.nvim

Apunta al subdirectorio `neovim/` del monorepo:

```lua
{
  dir = vim.fn.expand("~/Documentos/cursor-kaneo-extension/neovim"),
  name = "kaneo.nvim",
  cmd = { "KaneoBoard", "KaneoStartWork", "KaneoSelectProject", "KaneoRefresh" },
  opts = {
    api_base_url = "http://10.8.0.1:8100",
    workspace_id = "tu-workspace-id",
    project_id = "tu-project-id",
    user_email = "tu@email.com",
    push_on_start_work = false,
  },
  config = function(_, opts)
    require("kaneo").setup(opts)
  end,
}
```

## Comandos

| Comando | Acción |
|---------|--------|
| `:KaneoBoard` | Board con secciones KQL |
| `:KaneoSelectProject` | Workspace / proyecto |
| `:KaneoStartWork` | Start Work |
| `:KaneoRefresh` | Refrescar board |

### Atajos en el board

| Tecla | Acción |
|-------|--------|
| `Enter` | Detalle |
| `s` | Start Work |
| `f` | Filtro KQL |
| `r` | Refrescar |
| `p` | Proyecto |
| `q` | Cerrar |

## Configuración

```lua
require("kaneo").setup({
  api_base_url = "http://10.8.0.1:8100",
  api_key = "",  -- ~/.config/kaneo/api-key
  workspace_id = "...",
  project_id = "...",
  user_email = "tu@email.com",
  push_on_start_work = false,
})
```

Persistencia: `~/.local/share/nvim/kaneo/storage.json`

## Requisitos

- Neovim ≥ 0.9
- `curl`, `git`
- API key Kaneo

## Licencia

MIT
