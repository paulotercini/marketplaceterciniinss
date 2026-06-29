"""Sobe um arquivo LOCAL para uma pasta do Google Drive, lendo do disco e enviando
direto pela API (multipart), SEM trafegar base64 pelo contexto do modelo. Resolve a
fricção do create_file do MCP com .docx (parecer, procuração, RAC, relatório etc.).

Uso:
    python3 gdrive_upload.py <arquivo_local> <id_da_pasta_destino> ["Título opcional"]

Ex.: python3 gdrive_upload.py "/tmp/parecer.docx" 1eQMCn3b11UfRgZvA-6bGlTg9aLObB5EP \
        "Parecer - Fulano - 29.06.2026.docx"

Requer token com escopo de escrita (gdrive_client.SCOPE = .../auth/drive). Se o token
atual for só de leitura, reautentique uma vez com:
    python3 gdrive_authcode.py url
    python3 gdrive_authcode.py exchange "<URL colada do navegador>"
"""
import sys

from gdrive_client import upload


def main():
    if len(sys.argv) < 3:
        print('Uso: python3 gdrive_upload.py <arquivo_local> <id_pasta> ["Titulo"]')
        raise SystemExit(2)
    path = sys.argv[1]
    parent = sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else None
    try:
        info = upload(path, parent, name=name)
    except Exception as e:
        msg = str(e)
        dica = ""
        if "403" in msg or "insufficient" in msg.lower() or "scope" in msg.lower():
            dica = ("\n[dica] Token sem escopo de escrita. Reautentique, "
                    "'python3 gdrive_authcode.py url' e depois 'exchange'.")
        print(f"ERRO no upload: {msg}{dica}")
        raise SystemExit(1)
    print("OK, arquivo subido.")
    print("id:", info.get("id"))
    print("nome:", info.get("name"))
    print("pasta:", (info.get("parents") or [None])[0])
    print("link:", info.get("webViewLink"))


if __name__ == "__main__":
    main()
