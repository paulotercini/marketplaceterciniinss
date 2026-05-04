#!/bin/bash
# Hook de início de sessão — verifica autenticação Microsoft To Do
# Só roda em sessões remotas (Claude Code na web)

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
TOKEN_FILE="$PROJECT_DIR/graph_tokens.json"

echo ""
echo "=== Microsoft To Do — verificação de token ==="

if [ ! -f "$TOKEN_FILE" ]; then
  echo ""
  echo "⚠️  ATENÇÃO: graph_tokens.json não encontrado."
  echo ""
  echo "A rotina DOU não conseguirá criar tarefas no Microsoft To Do."
  echo "Para autorizar, execute no terminal:"
  echo ""
  echo "    cd $PROJECT_DIR && python3 graph_auth.py"
  echo ""
  echo "Siga as instruções na tela (acesse a URL, digite o código exibido)."
  echo "O processo leva menos de 1 minuto e não precisa ser repetido enquanto"
  echo "o refresh_token for válido (até 90 dias)."
  echo "============================================="
  exit 0
fi

# Arquivo existe — testa se o refresh_token ainda funciona
cd "$PROJECT_DIR"
if python3 graph_auth.py --check > /tmp/graph_check.log 2>&1; then
  STATUS=$(cat /tmp/graph_check.log)
  echo "✅ $STATUS"
else
  echo ""
  echo "⚠️  Token Microsoft To Do expirado ou inválido."
  cat /tmp/graph_check.log
  echo ""
  echo "Para reautorizar, execute:"
  echo "    cd $PROJECT_DIR && python3 graph_auth.py"
  echo "============================================="
fi
