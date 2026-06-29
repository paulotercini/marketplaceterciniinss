"""Cliente minimo do Google Drive para baixar arquivos por ID DIRETO PARA O DISCO,
sem passar pelo contexto do modelo. Resolve o limite de ~10 MB do conector MCP
(que devolve o conteudo em base64 pela janela de contexto e por isso trava).

Credenciais OAuth (client_id + client_secret de um cliente do tipo "TVs e
dispositivos com entrada limitada" no Google Cloud) sao lidas de:
  1. variaveis de ambiente GDRIVE_CLIENT_ID / GDRIVE_CLIENT_SECRET, ou
  2. arquivo gdrive_oauth.json -> {"client_id": "...", "client_secret": "..."}.

O token (access + refresh) fica em gdrive_tokens.json (gitignored). Gere uma vez:
  python3 gdrive_devflow.py start && python3 gdrive_devflow.py poll
Escopo: Drive somente leitura.
"""
import json
import os
import pathlib
import shutil
import urllib.error
import urllib.parse
import urllib.request

TOKENS_PATH = pathlib.Path("gdrive_tokens.json")
OAUTH_PATH = pathlib.Path("gdrive_oauth.json")
TOKEN_URI = "https://oauth2.googleapis.com/token"
DRIVE_API = "https://www.googleapis.com/drive/v3"
UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files"
# Leitura E escrita, para baixar (gdrive_download.py) e SUBIR (gdrive_upload.py) sem
# trafegar base64 pelo contexto do modelo. Trocar o escopo exige reautenticar uma vez.
SCOPE = "https://www.googleapis.com/auth/drive"

# Arquivos nativos do Google nao tem bytes "crus", exporta-se para um formato Office.
_EXPORT = {
    "application/vnd.google-apps.document": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"),
    "application/vnd.google-apps.spreadsheet": (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
    "application/vnd.google-apps.presentation": (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"),
}


def _creds():
    cid = os.environ.get("GDRIVE_CLIENT_ID")
    csec = os.environ.get("GDRIVE_CLIENT_SECRET")
    if cid and csec:
        return cid, csec
    if OAUTH_PATH.exists():
        d = json.loads(OAUTH_PATH.read_text())
        return d["client_id"], d["client_secret"]
    raise RuntimeError(
        "Sem credenciais. Defina GDRIVE_CLIENT_ID/GDRIVE_CLIENT_SECRET ou crie "
        "gdrive_oauth.json com client_id e client_secret (ver gdrive_devflow.py)."
    )


def _post(url, data):
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        url, data=body, method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def refresh():
    """Renova o access_token a partir do refresh_token salvo. Retorna o access_token."""
    if not TOKENS_PATH.exists():
        raise RuntimeError(
            "gdrive_tokens.json nao existe. Autentique com "
            "'python3 gdrive_devflow.py start' e depois 'poll'.")
    cid, csec = _creds()
    cur = json.loads(TOKENS_PATH.read_text())
    tok = _post(TOKEN_URI, {
        "client_id": cid, "client_secret": csec,
        "grant_type": "refresh_token", "refresh_token": cur["refresh_token"]})
    cur["access_token"] = tok["access_token"]
    if "refresh_token" in tok:
        cur["refresh_token"] = tok["refresh_token"]
    TOKENS_PATH.write_text(json.dumps(cur))
    return cur["access_token"]


def _meta(file_id, token):
    url = f"{DRIVE_API}/files/{file_id}?fields=name,mimeType,size&supportsAllDrives=true"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def download(file_id, dest=None):
    """Baixa o arquivo do Drive por ID, em streaming, DIRETO PARA O DISCO.
    Renova o token automaticamente. Retorna o caminho local salvo."""
    token = refresh()
    meta = _meta(file_id, token)
    name = meta.get("name", file_id)
    mime = meta.get("mimeType", "")
    if mime in _EXPORT:
        emime, ext = _EXPORT[mime]
        url = f"{DRIVE_API}/files/{file_id}/export?mimeType={urllib.parse.quote(emime)}"
        if dest is None:
            dest = f"/tmp/{name}{ext}"
    else:
        url = f"{DRIVE_API}/files/{file_id}?alt=media&supportsAllDrives=true"
        if dest is None:
            dest = f"/tmp/{name}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=600) as r, open(dest, "wb") as f:
        shutil.copyfileobj(r, f, length=256 * 1024)  # streaming, nunca pelo contexto
    return dest


def upload(path, parent_id, name=None, mime=None):
    """Sobe um arquivo LOCAL para uma pasta do Drive (multipart), lendo do disco e
    enviando direto pela API, SEM passar base64 pelo contexto do modelo. Resolve a
    friccao do create_file do MCP com .docx. Retorna o dict do arquivo criado (id etc.).
    Requer token com escopo de escrita (SCOPE = .../auth/drive)."""
    import mimetypes
    token = refresh()
    p = pathlib.Path(path)
    data = p.read_bytes()
    name = name or p.name
    if mime is None:
        mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
    meta = {"name": name, "parents": [parent_id]}
    boundary = "===============gdriveupload7e2b=="
    pre = (
        "--" + boundary + "\r\n"
        "Content-Type: application/json; charset=UTF-8\r\n\r\n"
        + json.dumps(meta) + "\r\n"
        "--" + boundary + "\r\n"
        "Content-Type: " + mime + "\r\n\r\n"
    ).encode("utf-8")
    post = ("\r\n--" + boundary + "--\r\n").encode("utf-8")
    body = pre + data + post
    url = (UPLOAD_API + "?uploadType=multipart&supportsAllDrives=true"
           "&fields=id,name,mimeType,parents,webViewLink")
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/related; boundary={boundary}",
    })
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(r.read())
