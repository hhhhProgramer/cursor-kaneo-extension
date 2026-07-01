#!/usr/bin/env bash
# Instala el .vsix más reciente en Cursor o VS Code.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/dist"

VSIX="$(ls -t "$OUT_DIR"/*.vsix 2>/dev/null | head -1)"
if [[ -z "$VSIX" || ! -f "$VSIX" ]]; then
  echo "No hay VSIX. Ejecuta: npm run package" >&2
  exit 1
fi

install_vsix() {
  local cmd="$1"
  echo "Instalando $VSIX con $cmd…"
  "$cmd" --install-extension "$VSIX" --force
}

if command -v cursor >/dev/null 2>&1; then
  install_vsix cursor
  echo "OK — Developer: Reload Window en Cursor."
elif command -v code >/dev/null 2>&1; then
  install_vsix code
  echo "OK — reinicia VS Code."
else
  echo "No se encontró cursor ni code." >&2
  echo "Instala manualmente: Extensions → … → Install from VSIX → $VSIX" >&2
  exit 1
fi
