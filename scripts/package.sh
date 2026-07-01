#!/usr/bin/env bash
# Empaqueta la extensión como .vsix (instalable en Cursor / VS Code).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
OUT_DIR="$ROOT/dist"
mkdir -p "$OUT_DIR"

echo "Empaquetando kaneo-branches v${VERSION}…"
npx --yes @vscode/vsce@latest package --out "$OUT_DIR"

VSIX="$(ls -t "$OUT_DIR"/*.vsix 2>/dev/null | head -1)"
if [[ -n "$VSIX" && -f "$VSIX" ]]; then
  echo "OK: $VSIX"
  ls -lh "$VSIX"
else
  echo "No se generó ningún .vsix en $OUT_DIR" >&2
  exit 1
fi
