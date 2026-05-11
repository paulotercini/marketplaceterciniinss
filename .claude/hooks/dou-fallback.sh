#!/usr/bin/env bash
# SessionStart fallback para /dou-diario.
# Se o cron diário não rodou (máquina desligada, falha de rede, etc.), injeta
# uma nota no SessionStart pedindo ao Claude que execute a rotina.

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
STATE_FILE="$PROJECT_DIR/.claude/state/dou-last-run.txt"

TODAY=$(TZ=America/Sao_Paulo date +%Y-%m-%d)
DOW=$(TZ=America/Sao_Paulo date +%u)
HOUR=$(TZ=America/Sao_Paulo date +%H)

# Só relevante em dias úteis (1=seg ... 5=sex)
if [ "$DOW" -gt 5 ]; then
  exit 0
fi

# Antes de 06:00 BRT o cron ainda não deveria ter rodado, não cutucar
if [ "$HOUR" -lt 06 ]; then
  exit 0
fi

LAST_RUN=""
if [ -f "$STATE_FILE" ]; then
  LAST_RUN=$(tr -d '[:space:]' < "$STATE_FILE")
fi

if [ "$LAST_RUN" = "$TODAY" ]; then
  exit 0
fi

cat <<EOF
[fallback-dou-diario] A rotina diária do DOU para $TODAY ainda não foi executada nesta máquina (última execução: ${LAST_RUN:-nunca}). O cron de 06:00 BRT pode ter falhado. Considere executar /dou-diario agora.
EOF
