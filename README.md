# Kaneo — Start Work (extensión Cursor / VS Code)

Panel **estilo Atlassian/Jira** para Kaneo self-hosted: columnas, estado, prioridad, **KQL** (filtro tipo JQL) y **Start Work** con prefix, origin, push y transición.

## Instalación

```bash
cd ~/Documentos/Servers/cursor-kaneo-extension
./install.sh
```

**Developer: Reload Window** en Cursor.

## Uso

1. Icono **Kaneo** → pestaña **Actividades** (solo lista)
2. Tareas por columna con clave, título, prioridad
3. Filtro **KQL** y chips rápidos
4. **Clic en una actividad** → abre **Start Work en una pestaña del editor** (no en el panel lateral)

### KQL (estilo Jira)

| Ejemplo | Significado |
|---------|-------------|
| `status = to-do` | Solo To Do |
| `status in (to-do, in-progress)` | Varias columnas |
| `priority = high` | Prioridad alta |
| `assignee is empty` | Sin asignar |
| `text ~ sprites` | Busca en título/descripción |
| `key = LDS-1` | Por clave |
| `status = to-do AND priority = high` | Combinado |

### Start Work (pestaña del editor)

Al hacer clic en una actividad se abre una pestaña con:
   - **Prefix** — `feature`, `fix`, `hotfix`, …
   - **Nombre de rama** — editable (`lds-1-pbi-sprites-lia…`)
   - **Rama completa** — `feature/lds-1-…`
   - **Base** — rama por defecto del repo (`main`)
   - **Origin** — `origin → git@github.com:…`
   - ☑ **Push a origin** tras crear
   - ☑ **Cambiar estado → In Progress**

## Configuración

```json
{
  "kaneo.apiBaseUrl": "http://10.8.0.1:8100",
  "kaneo.workspaceId": "5DG8UBlNeHSrptkr2AzUaiefVsnkHFYv",
  "kaneo.projectId": "grk4xqmn4ubq3223renhmdbo",
  "kaneo.branchPattern": "{slug}-{number}-{title}",
  "kaneo.branchTypes": ["feature", "fix", "hotfix", "chore"],
  "kaneo.moveToInProgressOnStartWork": true
}
```

API key: `kaneo.apiKey` o variable `API_KEY`.

## Notas

- Kaneo no tiene JQL nativo; **KQL** filtra en cliente sobre las tareas del proyecto.
- Push y transición de estado funcionan sin webhook GitHub (llamadas salientes desde tu PC/servidor).
- La automatización GitHub→Kaneo al merge sigue necesitando webhook público si la configuras después.
