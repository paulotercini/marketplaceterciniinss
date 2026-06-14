"""Baixa um anexo de uma tarefa do To Do e imprime seu texto.

Suporta .docx (texto extraido de word/document.xml) e .txt. Para PDF, salva o
arquivo localmente e informa o caminho (o conteudo pode ser lido com a ferramenta
de leitura adequada).

Uso:
    python3 todo_anexo.py "<list_id>" "<task_id>" "trecho do nome do anexo"
"""
import io
import json
import pathlib
import re
import sys
import urllib.request
import zipfile

from graph_client import _req, GRAPH


def _token():
    return json.loads(pathlib.Path("graph_tokens.json").read_text())["access_token"]


def _docx_text(data):
    z = zipfile.ZipFile(io.BytesIO(data))
    xml = z.read("word/document.xml").decode("utf-8", "ignore").replace("</w:p>", "\n")
    text = re.sub(r"<[^>]+>", "", xml)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def main(list_id, task_id, nome_trecho):
    atts = _req("GET", f"/me/todo/lists/{list_id}/tasks/{task_id}/attachments").get("value", [])
    alvo = next((a for a in atts if nome_trecho.lower() in (a.get("name") or "").lower()), None)
    if not alvo:
        print("Anexo nao encontrado. Disponiveis:")
        for a in atts:
            print(" -", a.get("name"))
        return
    url = f"{GRAPH}/me/todo/lists/{list_id}/tasks/{task_id}/attachments/{alvo['id']}/$value"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {_token()}"})
    with urllib.request.urlopen(req) as r:
        data = r.read()
    name = alvo["name"]
    print(f"ANEXO: {name} ({len(data)} bytes)")
    low = name.lower()
    if low.endswith(".docx"):
        print("===== TEXTO =====")
        print(_docx_text(data))
    elif low.endswith(".txt"):
        print("===== TEXTO =====")
        print(data.decode("utf-8", "ignore"))
    else:
        out = pathlib.Path("/tmp") / name
        out.write_bytes(data)
        print(f"Arquivo salvo em: {out} (use a ferramenta de leitura para PDFs/imagens)")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print('Uso: python3 todo_anexo.py "<list_id>" "<task_id>" "trecho do nome"')
        sys.exit(1)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
