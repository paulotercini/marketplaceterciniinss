"""Baixa um arquivo do Google Drive por ID DIRETO PARA O DISCO, sem passar pelo
contexto do modelo (resolve o limite de ~10 MB do conector MCP). Depois do
download, o PDF/arquivo local pode ser lido com a ferramenta de leitura (que
renderiza paginas, inclusive escaneadas) ou fatiado com pdf_split.py.

Requer o token do Drive (ver gdrive_devflow.py).

Uso:
    python3 gdrive_download.py <file_id> [destino]
"""
import sys

from gdrive_client import download

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 gdrive_download.py <file_id> [destino]")
        sys.exit(1)
    dest = sys.argv[2] if len(sys.argv) > 2 else None
    print(download(sys.argv[1], dest))
