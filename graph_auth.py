"""Auth compartilhada do Microsoft Graph com refresh automático.

O access_token vive ~1h; este módulo o renova sozinho a partir do
refresh_token (que rola a cada uso e vale ~90 dias de inatividade).
Enquanto for usado ao menos uma vez a cada 90 dias, o acesso não expira
na prática — sem novo login nem refresh manual.
"""
import json, time, urllib.parse, urllib.request, pathlib

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPE = "Tasks.ReadWrite offline_access"
TOKENS_PATH = pathlib.Path("graph_tokens.json")

# renova antes de expirar de fato (folga de seguranca)
_SKEW = 300


def _http_post(url, data):
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def _save(tok):
    # carimba o instante de expiracao absoluto para o proximo processo saber
    tok["expires_at"] = time.time() + int(tok.get("expires_in", 3600))
    TOKENS_PATH.write_text(json.dumps(tok))
    return tok


def refresh(cur=None):
    """Troca o refresh_token por um novo par de tokens e persiste."""
    cur = cur or json.loads(TOKENS_PATH.read_text())
    new = _http_post(
        f"{AUTHORITY}/oauth2/v2.0/token",
        {
            "client_id": CLIENT_ID,
            "grant_type": "refresh_token",
            "refresh_token": cur["refresh_token"],
            "scope": SCOPE,
        },
    )
    # a resposta as vezes nao reenvia o refresh_token: preserva o anterior
    new.setdefault("refresh_token", cur["refresh_token"])
    return _save(new)


def access_token(force_refresh=False):
    """Retorna um access_token valido, renovando automaticamente se preciso."""
    cur = json.loads(TOKENS_PATH.read_text())
    expira = cur.get("expires_at")
    vencido = expira is None or time.time() >= (expira - _SKEW)
    if force_refresh or vencido:
        cur = refresh(cur)
    return cur["access_token"]
