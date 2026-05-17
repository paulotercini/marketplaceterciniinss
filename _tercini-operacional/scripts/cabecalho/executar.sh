#!/usr/bin/env bash
# Wrapper para o agendador (cron) — Linux / macOS.
# Roda o cabecalho_diario.py a partir da raiz do repositorio.
#
# Descobre a raiz do repo a partir da localizacao deste script:
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$REPO_DIR" || exit 1
# usa o python do sistema; ajuste para python3 se necessario
python3 "$SCRIPT_DIR/cabecalho_diario.py"
