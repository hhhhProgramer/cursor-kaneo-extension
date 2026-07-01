#!/usr/bin/env bash
# Instala el tarball de Neovim en site/pack (desde dist/ o release).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(tr -d ' \t\r\n' < "$ROOT/neovim/VERSION")"
ARCHIVE="$ROOT/dist/kaneo-nvim-${VERSION}.tar.gz"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "No hay $ARCHIVE - ejecuta: npm run package:neovim" >&2
  exit 1
fi

DATA_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}"
DEST="$DATA_ROOT/nvim/site/pack/kaneo/start"
mkdir -p "$DEST"
rm -rf "$DEST/kaneo.nvim"
tar -xzf "$ARCHIVE" -C "$DEST"

echo "OK - plugin en $DEST/kaneo.nvim"
echo "Reinicia Neovim y ejecuta :KaneoBoard"
