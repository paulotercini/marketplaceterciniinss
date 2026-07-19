"""Cliente do Google Drive por refresh token, para sessões automáticas (cron/hook).

Credenciais vêm de variáveis de ambiente (cadastradas na config do ambiente),
NÃO de arquivo — é isso que faz o upload por script sobreviver a uma sessão nova:

    GDRIVE_CLIENT_ID
    GDRIVE_CLIENT_SECRET
    GDRIVE_REFRESH_TOKEN

Só stdlib, no mesmo estilo de graph_client.py (retry/backoff em rede e 429/5xx).
O conector MCP do Drive continua sendo o caminho da sessão interativa; este é o
caminho sem você (execução automática), onde MCP não está disponível.
"""
import json, os, ssl, time, urllib.error, urllib.parse, urllib.request

TOKEN_URL = "https://oauth2.googleapis.com/token"
API = "https://www.googleapis.com/drive/v3"
UPLOAD = "https://www.googleapis.com/upload/drive/v3"

_access = {"token": None, "exp": 0.0}


class GDriveConfigError(RuntimeError):
    """Falta alguma das GDRIVE_* no ambiente."""


def _env():
    faltando = [
        v
        for v in ("GDRIVE_CLIENT_ID", "GDRIVE_CLIENT_SECRET", "GDRIVE_REFRESH_TOKEN")
        if not os.environ.get(v)
    ]
    if faltando:
        raise GDriveConfigError(
            "Variaveis ausentes no ambiente: " + ", ".join(faltando)
        )
    return (
        os.environ["GDRIVE_CLIENT_ID"],
        os.environ["GDRIVE_CLIENT_SECRET"],
        os.environ["GDRIVE_REFRESH_TOKEN"],
    )


def _post_form(url, data, _tentativas=5):
    body = urllib.parse.urlencode(data).encode("utf-8")
    ultimo = None
    for i in range(_tentativas):
        req = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and i < _tentativas - 1:
                ultimo = e
                time.sleep(2 ** i)
                continue
            raise
        except (ssl.SSLError, urllib.error.URLError, TimeoutError, ConnectionError) as e:
            ultimo = e
            if i < _tentativas - 1:
                time.sleep(2 ** i)
    raise ultimo


def _token():
    """Troca o refresh_token por um access_token; cacheia até ~1 min antes de expirar."""
    if _access["token"] and time.time() < _access["exp"] - 60:
        return _access["token"]
    cid, secret, refresh = _env()
    tok = _post_form(
        TOKEN_URL,
        {
            "client_id": cid,
            "client_secret": secret,
            "refresh_token": refresh,
            "grant_type": "refresh_token",
        },
    )
    _access["token"] = tok["access_token"]
    _access["exp"] = time.time() + int(tok.get("expires_in", 3600))
    return _access["token"]


def _req(method, url, body=None, _tentativas=5):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    ultimo = None
    for i in range(_tentativas):
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {_token()}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and i < _tentativas - 1:
                ultimo = e
                time.sleep(2 ** i)
                continue
            raise
        except (ssl.SSLError, urllib.error.URLError, TimeoutError, ConnectionError) as e:
            ultimo = e
            if i < _tentativas - 1:
                time.sleep(2 ** i)
    raise ultimo


def about():
    """Confirma qual conta o token autenticou (e-mail do dono)."""
    return _req("GET", f"{API}/about?fields=user")["user"]


def find_folder(name, parent_id=None):
    """Procura pastas por nome exato; opcionalmente dentro de um parent. Lista de {id,name}."""
    termos = [
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
        "name = '%s'" % name.replace("'", "\\'"),
    ]
    if parent_id:
        termos.append("'%s' in parents" % parent_id)
    q = urllib.parse.quote(" and ".join(termos))
    url = f"{API}/files?q={q}&fields=files(id,name,parents)&pageSize=50"
    return _req("GET", url).get("files", [])


def upload(local_path, parent_id=None, name=None, mime="application/octet-stream"):
    """Upload multipart de um arquivo local. Retorna metadados do arquivo criado."""
    with open(local_path, "rb") as f:
        conteudo = f.read()
    meta = {"name": name or os.path.basename(local_path)}
    if parent_id:
        meta["parents"] = [parent_id]
    boundary = "-------gdrive_client_boundary_314159"
    corpo = (
        ("--%s\r\n" % boundary).encode()
        + b"Content-Type: application/json; charset=UTF-8\r\n\r\n"
        + json.dumps(meta).encode("utf-8")
        + ("\r\n--%s\r\n" % boundary).encode()
        + ("Content-Type: %s\r\n\r\n" % mime).encode()
        + conteudo
        + ("\r\n--%s--\r\n" % boundary).encode()
    )
    url = f"{UPLOAD}/files?uploadType=multipart&fields=id,name,parents,webViewLink"
    ultimo = None
    for i in range(5):
        req = urllib.request.Request(
            url,
            data=corpo,
            method="POST",
            headers={
                "Authorization": f"Bearer {_token()}",
                "Content-Type": "multipart/related; boundary=%s" % boundary,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and i < 4:
                ultimo = e
                time.sleep(2 ** i)
                continue
            raise
        except (ssl.SSLError, urllib.error.URLError, TimeoutError, ConnectionError) as e:
            ultimo = e
            if i < 4:
                time.sleep(2 ** i)
    raise ultimo


def delete(file_id):
    """Remove definitivamente um arquivo (usado no self-test para não deixar lixo)."""
    _req("DELETE", f"{API}/files/{file_id}")


def selftest():
    """Prova ponta a ponta: autentica, mostra a conta, sobe um arquivo e apaga.

    Não toca em pasta de cliente — o arquivo de teste vai para o My Drive raiz e
    é removido em seguida. Retorna o e-mail da conta autenticada.
    """
    user = about()
    print("Conta autenticada:", user.get("emailAddress"))
    import tempfile

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as tmp:
        tmp.write("gdrive_client selftest\n")
        caminho = tmp.name
    criado = upload(caminho, name="_gdrive_selftest_apagar.txt")
    os.unlink(caminho)
    print("Upload OK, id:", criado["id"])
    delete(criado["id"])
    print("Arquivo de teste removido. Upload por script FUNCIONANDO.")
    return user.get("emailAddress")


if __name__ == "__main__":
    import sys

    cmd = sys.argv[1] if len(sys.argv) > 1 else "selftest"
    if cmd == "whoami":
        print(json.dumps(about(), ensure_ascii=False))
    elif cmd == "selftest":
        selftest()
    elif cmd == "upload":
        # uso: python3 gdrive_client.py upload <arquivo_local> [parent_id] [nome]
        args = sys.argv[2:]
        print(json.dumps(upload(*args), ensure_ascii=False))
    else:
        print("comandos: whoami | selftest | upload <arquivo> [parent_id] [nome]")
