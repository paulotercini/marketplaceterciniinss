#!/usr/bin/env bash
# Script de ingestão temática — plugin base-conhecimento-inss
# Uso: ingest-tema.sh "Caminho/para/Tema.zip" nome-skill-destino
#
# Requisitos: tesseract, tesseract-ocr-por, unzip
# Saída: /tmp/ingest-<slug>/ com _ocr_bruto.txt consolidado

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Uso: $0 <caminho-zip> <slug-skill>"
  exit 1
fi

ZIP_PATH="$1"
SLUG="$2"
WORK="/tmp/ingest-${SLUG}"

rm -rf "$WORK"
mkdir -p "$WORK/ocr"

echo "[1/3] Descompactando $ZIP_PATH"
unzip -q "$ZIP_PATH" -d "$WORK"

echo "[2/3] OCR em português"
find "$WORK" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | while read -r img; do
  name=$(basename "$img" | sed 's/\.[^.]*$//')
  tesseract "$img" "$WORK/ocr/$name" -l por --psm 6 2>/dev/null || true
done

echo "[3/3] Consolidando em _ocr_bruto.txt"
cat "$WORK/ocr"/*.txt > "$WORK/_ocr_bruto.txt" 2>/dev/null || true

LINHAS=$(wc -l < "$WORK/_ocr_bruto.txt")
IMAGENS=$(ls "$WORK/ocr" | wc -l)
echo "Concluído. Imagens processadas $IMAGENS. Linhas de texto $LINHAS. Arquivo $WORK/_ocr_bruto.txt"
