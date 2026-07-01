# Kaneo — Start Work

Extensión para **Cursor** y **VS Code** que conecta con [Kaneo](https://kaneo.app) self-hosted: panel de actividades estilo Jira/Atlassian, filtros KQL, detalle de tarea y **Start Work** (rama Git, push opcional, transición de estado).

Versión actual: **0.4.3**

## Requisitos

- Cursor ≥ 1.85 o VS Code ≥ 1.85
- VPN / acceso a tu instancia Kaneo
- API key Kaneo (`kaneo.apiKey`, `API_KEY` o `~/.config/kaneo/api-key`)
- Repositorio Git en el workspace (para Start Work)

## Instalación

### Opción A — VSIX (recomendada)

Descarga el `.vsix` del [último release](https://github.com/hhhhProgramer/cursor-kaneo-extension/releases) (`kaneo-branches-0.4.3.vsix`) e instálalo:

**Cursor / VS Code (CLI):**

```bash
cursor --install-extension kaneo-branches-0.4.3.vsix
# o
code --install-extension kaneo-branches-0.4.3.vsix
```

**Desde la UI:** Extensions → menú `…` → **Install from VSIX…** → elige el archivo.

Luego **Developer: Reload Window**.

### Opción B — Compilar e instalar desde el repo

```bash
git clone https://github.com/hhhhProgramer/cursor-kaneo-extension.git
cd cursor-kaneo-extension
npm run package      # genera dist/kaneo-branches-<version>.vsix
npm run install:vsix # instala el VSIX en cursor o code
```

### Opción C — Desarrollo (symlink)

Para iterar sin empaquetar en cada cambio:

```bash
./install.sh
# Developer: Reload Window
```

Enlaza el repo en `~/.cursor/extensions/hhhh.kaneo-branches-<version>`.

## Configuración

Copia `.vscode/settings.recommended.json` a tu `settings.json` o configura manualmente:

```json
{
  "kaneo.apiBaseUrl": "http://10.8.0.1:8100",
  "kaneo.apiKey": "",
  "kaneo.workspaceId": "tu-workspace-id",
  "kaneo.projectId": "tu-project-id",
  "kaneo.userEmail": "tu@email.com",
  "kaneo.branchPattern": "{slug}-{number}-{title}",
  "kaneo.branchTypes": ["feature", "fix", "hotfix", "chore"],
  "kaneo.moveToInProgressOnStartWork": true
}
```

| Setting | Descripción |
|---------|-------------|
| `kaneo.apiKey` | API key. Vacío → `API_KEY`, `KANEO_API_KEY` o `~/.config/kaneo/api-key` |
| `kaneo.userId` / `kaneo.userEmail` | Para `assignee = me` en KQL |
| `kaneo.commentBranchOnStartWork` | Comenta la rama en la tarea Kaneo |
| `kaneo.storeBranchLink` | Vincula rama ↔ tarea en el panel Desarrollo |

**No commitees la API key.** Mantén los IDs de workspace/proyecto en settings locales si el repo es público.

## Uso

1. Icono **Kaneo** en la barra lateral → **Actividades**
2. Elige proyecto (icono carpeta en la barra del panel)
3. Secciones colapsables con KQL; filtro global y chips rápidos
4. Clic en una tarea → detalle en el editor (estado, fechas, comentarios, Start Work)

### KQL (filtro en cliente)

| Ejemplo | Significado |
|---------|-------------|
| `status = to-do` | Columna To Do |
| `assignee = me` | Asignadas a ti |
| `assignee is empty` | Sin asignar |
| `text ~ sprites` | Busca en título/descripción |
| `status = in-progress AND priority = high` | Combinado |

### Start Work

- Prefix (`feature`, `fix`, …), nombre de rama, rama base, remote
- Push al remote (opcional; revisa el checkbox antes de confirmar)
- Transición a In Progress y asignación opcional

### Tipos de tarea (por prefijo en el título)

| Prefijo | Icono |
|---------|-------|
| `Bug:`, `Fix:`, `Hotfix:` | Bug |
| `PBI:`, `Story:`, `Epic:` | Story |
| `Spike:`, `Research:` | Spike |
| `Chore:`, `Docs:`, `Refactor:` | Chore |

## Desarrollo y release

```bash
npm run package    # VSIX en dist/
npm run install:dev  # symlink para desarrollo
```

### CI (GitHub Actions)

El workflow [`.github/workflows/release.yml`](.github/workflows/release.yml):

1. En cada push a `main`: empaqueta el **VSIX** y lo sube como artifact
2. Crea el tag `v<version>` según `package.json` (si no existe)
3. En push de tag `v*`: publica un **GitHub Release** con el VSIX adjunto

Para publicar una nueva versión:

1. Sube `version` en `package.json`
2. Commit y push a `main`
3. El pipeline crea el tag y el release automáticamente

Tags existentes: `v0.3.0`, `v0.3.1`, `v0.4.3` (según releases).

## Comandos

| Comando | Acción |
|---------|--------|
| `Kaneo: Mostrar panel` | Enfoca el sidebar |
| `Kaneo: Actualizar board` | Refresca tareas |
| `Kaneo: Elegir proyecto` | Selector workspace/proyecto |
| `Kaneo: Start Work` | Start Work desde paleta |

## Licencia

MIT — ver [LICENSE](LICENSE).
