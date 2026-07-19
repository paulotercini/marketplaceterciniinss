#!/bin/bash
# Hook de inicio de sessao (Claude Code na web).
# Objetivos:
#   1. Garantir que os testes rodem (instala pytest).
#   2. Renovar o token do Microsoft To Do (Graph) se houver refresh token.
#   3. Reportar o estado do upload por script do Google Drive.
# Tudo best-effort: nada aqui pode derrubar a sessao (sempre sai 0).
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

echo "== session-start hook =="

# 1) pytest (a suite tests/ e pura; so precisa do runner)
if ! python3 -c "import pytest" 2>/dev/null; then
  echo "-- instalando pytest..."
  python3 -m pip install --quiet pytest 2>/dev/null && echo "   pytest OK" || echo "   pytest FALHOU (sem rede?)"
else
  echo "-- pytest ja presente"
fi

# 2) Microsoft To Do (Graph): renova o access token.
#    Funciona se graph_tokens.json existir OU se GRAPH_REFRESH_TOKEN estiver no ambiente.
echo "-- To Do (Graph): renovando token..."
if python3 graph_refresh.py 2>/dev/null; then
  echo "   To Do OK"
else
  echo "   To Do INDISPONIVEL: faca login (graph_devflow.py) ou cadastre GRAPH_REFRESH_TOKEN no ambiente"
fi

# 3) Google Drive por script: confere as GDRIVE_* e a conta (sem escrever nada).
echo "-- Drive (script): checando credenciais..."
if [ -n "${GDRIVE_CLIENT_ID:-}" ] && [ -n "${GDRIVE_CLIENT_SECRET:-}" ] && [ -n "${GDRIVE_REFRESH_TOKEN:-}" ]; then
  conta=$(python3 gdrive_client.py whoami 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('emailAddress',''))" 2>/dev/null)
  if [ -n "$conta" ]; then
    echo "   Drive OK, conta: $conta"
  else
    echo "   Drive: variaveis presentes mas o token nao autenticou (expirado ou app 'Em teste'?)"
  fi
else
  echo "   Drive INDISPONIVEL por script: cadastre GDRIVE_CLIENT_ID/SECRET/REFRESH_TOKEN no ambiente (o conector MCP continua funcionando na sessao interativa)"
fi

echo "== fim do hook =="
exit 0
