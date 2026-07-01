# Kaneo — Start Work

Monorepo con integraciones **Kaneo** self-hosted para **Cursor/VS Code** y **Neovim**: board de actividades, KQL, detalle de tarea y **Start Work** (rama Git, push opcional, transición de estado).

| Cliente | Versión | Release |
|---------|---------|---------|
| Cursor / VS Code | **0.4.4** | tag `v0.4.4` → `.vsix` |
| Neovim | **0.1.0** | tag `nvim-v0.1.0` → `.tar.gz` |

```
cursor-kaneo-extension/
├── src/              # extensión Cursor/VS Code
├── neovim/           # plugin kaneo.nvim
├── scripts/          # empaquetado e instalación
└── .github/workflows/
    ├── release-cursor.yml
    └── release-neovim.yml
```

## Requisitos comunes

- VPN / acceso a tu instancia Kaneo
- API key: `~/.config/kaneo/api-key`, `KANEO_API_KEY` o setting del/work del cliente
- Repositorio Git en el proyecto (Start Work)

---

## Cursor / VS Code

Versión **0.4.4** · Requiere Cursor/VS Code ≥ 1.85

### Instalar (VSIX)

Descarga del [release Cursor v0.4.4](https://github.com/hhhhProgramer/cursor-kaneo-extension/releases/tag/v0.4.4):

```bash
cursor --install-extension kaneo-branches-0.4.4.vsix
# Developer: Reload Window
```

### Desde el repo

```bash
npm run package        # dist/kaneo-branches-<version>.vsix
npm run install:vsix
# o desarrollo:
./install.sh
```

Configuración en `settings.json` — ver `.vscode/settings.recommended.json`.

**Git (GitHub / GitLab / self-hosted):** `kaneo.gitProvider` (`auto` por defecto) y opcional `kaneo.gitWebBaseUrl` para GitLab/Gitea autohosted. Con `auto`, detecta por remote (`github.com`, hostnames con `gitlab`, etc.).

---

## Neovim

Versión **0.1.0** · Requiere Neovim ≥ 0.9, `curl` y `git`

Documentación detallada: [`neovim/README.md`](neovim/README.md)

### Instalar (tarball para tu amigo)

Descarga del [release Neovim v0.1.0](https://github.com/hhhhProgramer/cursor-kaneo-extension/releases/tag/nvim-v0.1.0):

```bash
curl -LO https://github.com/hhhhProgramer/cursor-kaneo-extension/releases/download/nvim-v0.1.0/kaneo-nvim-0.1.0.tar.gz
mkdir -p ~/.local/share/nvim/site/pack/kaneo/start
tar -xzf kaneo-nvim-0.1.0.tar.gz -C ~/.local/share/nvim/site/pack/kaneo/start
```

Reinicia Neovim → `:KaneoSelectProject` → `:KaneoBoard`

### Desde el repo

```bash
npm run package:neovim
npm run install:neovim
```

### lazy.nvim (monorepo)

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

Comandos: `:KaneoBoard`, `:KaneoStartWork`, `:KaneoSelectProject`, `:KaneoRefresh`

---

## KQL (ambos clientes)

| Ejemplo | Significado |
|---------|-------------|
| `assignee = me` | Asignadas a ti |
| `assignee is empty` | Sin asignar |
| `status = in-progress AND priority = high` | Combinado |
| `text ~ sprites` | Busca en título/descripción |

## CI / releases

Dos pipelines independientes:

| Workflow | Trigger | Artefacto | Tag |
|----------|---------|-----------|-----|
| `release-cursor.yml` | cambios en `src/`, `package.json` | VSIX | `v<package.json>` |
| `release-neovim.yml` | cambios en `neovim/` | tar.gz | `nvim-v<neovim/VERSION>` |

Publicar versión nueva:

1. **Cursor:** sube `version` en `package.json` → push `main`
2. **Neovim:** sube `neovim/VERSION` → push `main`

```bash
npm run package:all   # compila ambos en local
```

## Licencia

MIT — ver [LICENSE](LICENSE).
