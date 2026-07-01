#!/usr/bin/env bash
# Empaqueta el plugin Neovim como .tar.gz (carpeta kaneo.nvim/).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(tr -d '[:space:]' < neovim/VERSION)"
OUT_DIR="$ROOT/dist"
STAGE="$OUT_DIR/staging-kaneo-nvim"
PKG="kaneo-nvim-${VERSION}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$OUT_DIR" "$STAGE/kaneo.nvim"
cp -r neovim/lua neovim/plugin "$STAGE/kaneo.nvim/"
cp neovim/LICENSE neovim/VERSION neovim/README.md "$STAGE/kaneo.nvim/"

tar -czf "$OUT_DIR/$PKG" -C "$STAGE" kaneo.nvim
rm -rf "$STAGE"

echo "OK: $OUT_DIR/$PKG"
ls -lh "$OUT_DIR/$PKG"
