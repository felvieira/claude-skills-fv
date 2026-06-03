#!/usr/bin/env bash
# install.sh — instala o pre-commit hook de salvaguarda de vault no repo do kit.
#
# Uso: bash scripts/git-hooks/install.sh
#
# Idempotente. Faz backup de um pre-commit existente antes de sobrescrever.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "✗ não é um repo git"; exit 1;
}
SRC="$REPO_ROOT/scripts/git-hooks/pre-commit"
DEST="$REPO_ROOT/.git/hooks/pre-commit"

[ -f "$SRC" ] || { echo "✗ $SRC não encontrado"; exit 1; }

if [ -f "$DEST" ] && ! grep -q "dados de VAULT de memória" "$DEST" 2>/dev/null; then
  cp "$DEST" "$DEST.bak.$(date +%s)"
  echo "· pre-commit existente salvo em $DEST.bak.*"
fi

cp "$SRC" "$DEST"
chmod +x "$DEST"
echo "✓ pre-commit instalado em .git/hooks/pre-commit"
echo "  Aborta commits com dados de vault (logs, secrets, decisões)."
echo "  Bypass intencional: git commit --no-verify"
