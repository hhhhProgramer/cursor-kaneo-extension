#!/usr/bin/env bash
set -euo pipefail
EXT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLISHER="hhhh"
NAME="kaneo-branches"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo 0.0.0)"
EXT_ID="${PUBLISHER}.${NAME}-${VERSION}"

install_symlink() {
  local base="$1"
  mkdir -p "$base"
  # Quitar versiones antiguas (duplicados rompen la carga en Cursor)
  rm -f "$base"/hhhh.kaneo-branches-* 2>/dev/null || true
  local dest="$base/$EXT_ID"
  ln -sf "$EXT_DIR" "$dest"
  echo "Enlazado: $dest -> $EXT_DIR"
}

if command -v cursor >/dev/null 2>&1; then
  install_symlink "$HOME/.cursor/extensions"
  echo "OK — reinicia Cursor (Developer: Reload Window) y abre Kaneo en la barra lateral."
elif command -v code >/dev/null 2>&1; then
  install_symlink "$HOME/.vscode/extensions"
  echo "OK — reinicia VS Code."
else
  echo "No se encontró cursor ni code. Enlaza manualmente:"
  echo "  ln -sf \"$EXT_DIR\" ~/.cursor/extensions/$EXT_ID"
  exit 1
fi
