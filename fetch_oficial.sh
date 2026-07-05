#!/bin/bash
# Busca uma URL de fonte oficial (STF/CJF/Planalto/LexML) contornando dois
# bloqueios conhecidos: cadeia incompleta do portal.stf.jus.br (intermediário
# GlobalSign em certs/) e filtro de User-Agent. NUNCA desabilita TLS.
# Uso: ./fetch_oficial.sh <url> [arquivo_saida]
set -euo pipefail
URL="$1"; OUT="${2:-/dev/stdout}"
DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE=/tmp/ca-plus-globalsign.pem
[ -s "$BUNDLE" ] || cat /etc/ssl/certs/ca-certificates.crt "$DIR/certs/globalsign-alphassl-2025.pem" > "$BUNDLE"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
exec curl -sS --cacert "$BUNDLE" -A "$UA" \
  -H "Accept: text/html,application/xhtml+xml" -H "Accept-Language: pt-BR,pt;q=0.9" \
  --max-time 45 -L "$URL" -o "$OUT" -w "HTTP %{http_code}, %{size_download} bytes -> $OUT\n"
