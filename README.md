# Kaneo — Start Work (extensión Cursor / VS Code)

Panel **estilo Atlassian/Jira** para Kaneo self-hosted: **secciones guardadas** con KQL, iconos por convención de título, detalle de tarea con fechas/etiquetas, y **Start Work** con prefix, origin, push y transición.

## Instalación

```bash
cd ~/Documentos/Servers/cursor-kaneo-extension
./install.sh
```

**Developer: Reload Window** en Cursor.

## Uso

1. Icono **Kaneo** → pestaña **Actividades**
2. **Secciones** colapsables (por defecto: *Asignadas a mí*, *Sin asignar*); botón **+ Sección** para crear consultas KQL propias
3. Filtro **KQL** global y chips rápidos
4. Tarjetas con icono de tipo (Bug/PBI/Spike/Chore por prefijo en el título), estado, prioridad, vencimiento
5. **Clic en una actividad** → pestaña del editor con detalle completo y Start Work

### Secciones (estilo Atlassian)

Cada sección guarda una consulta KQL y un icono. Las predeterminadas son:

| Sección | KQL |
|---------|-----|
| Asignadas a mí | `assignee = me` |
| Sin asignar | `assignee is empty` |

Puedes añadir N secciones personalizadas (p. ej. `status = in-progress AND priority = high`).

### Tipos de tarea (convención en el título)

Kaneo es **kanban tipo Trello** — no tiene tipos Bug/PBI nativos. La extensión infiere el icono del prefijo:

| Prefijo en título | Icono |
|-------------------|-------|
| `Bug:`, `Fix:`, `Hotfix:` | Bug |
| `PBI:`, `Story:`, `Epic:` | PBI / Story |
| `Spike:`, `Research:` | Spike |
| `Chore:`, `Docs:`, `Refactor:` | Chore |
| (sin prefijo) | Tarea genérica |

### KQL (estilo Jira)

| Ejemplo | Significado |
|---------|-------------|
| `status = to-do` | Solo To Do |
| `status in (to-do, in-progress)` | Varias columnas |
| `priority = high` | Prioridad alta |
| `assignee = me` | Asignadas a tu usuario Kaneo |
| `assignee is empty` | Sin asignar |
| `text ~ sprites` | Busca en título/descripción |
| `key = LDS-1` | Por clave |
| `dueDate >= 2026-06-01` | Por fecha de vencimiento |
| `status = to-do AND priority = high` | Combinado |

### Detalle de tarea (pestaña del editor)

- Tipo, clave, estado, asignado, prioridad
- **Fechas** de inicio y vencimiento (editables)
- Etiquetas y enlaces externos (solo lectura desde Kaneo)
- Descripción con **Markdown**
- Panel **Desarrollo**: rama, push, PR, enlaces GitHub
- Si abres la tarea en **otro equipo** sin vínculo local, la rama se **infiere del comentario** de Start Work en Kaneo

### Start Work

- **Prefix** — `feature`, `fix`, `hotfix`, …
- **Nombre de rama** — editable
- **Base** — rama por defecto del repo
- **Origin** — remoto Git
- ☑ **Push a origin** tras crear
- ☑ **Cambiar estado → In Progress**

## Configuración

```json
{
  "kaneo.apiBaseUrl": "http://10.8.0.1:8100",
  "kaneo.workspaceId": "5DG8UBlNeHSrptkr2AzUaiefVsnkHFYv",
  "kaneo.projectId": "grk4xqmn4ubq3223renhmdbo",
  "kaneo.userId": "opcional-si-assignee-me",
  "kaneo.userEmail": "tu@email.com",
  "kaneo.branchPattern": "{slug}-{number}-{title}",
  "kaneo.branchTypes": ["feature", "fix", "hotfix", "chore"],
  "kaneo.moveToInProgressOnStartWork": true
}
```

API key: `kaneo.apiKey` o variable `API_KEY`.

## Notas

- Kaneo no tiene JQL nativo; **KQL** filtra en cliente sobre las tareas del proyecto.
- `assignee = me` usa `kaneo.userId`, caché global o selección de miembro del workspace.
- Push y transición de estado funcionan sin webhook GitHub.
