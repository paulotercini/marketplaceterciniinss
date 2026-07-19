"""Renova o access_token do Microsoft Graph (To Do).

Fonte do refresh_token, em ordem:
  1. graph_tokens.json (sessão que já fez login por device flow) — caminho normal.
  2. Variavel de ambiente GRAPH_REFRESH_TOKEN — usada quando o arquivo nao existe
     (sessao nova/limpa). E isso que faz o To Do sobreviver a uma sessao nova:
     cadastre GRAPH_REFRESH_TOKEN na config do ambiente, igual as GDRIVE_*.

Grava graph_tokens.json com o token novo (o access expira em ~1h). Rode antes de
qualquer gerador. Sem refresh token em lugar nenhum, sai com codigo 2 e mensagem.
"""
import json, os, pathlib, sys, urllib.parse, urllib.request

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPE = "Tasks.ReadWrite offline_access"
TOKENS_PATH = pathlib.Path("graph_tokens.json")


def _refresh_token():
    """Refresh token do arquivo (preferencial) ou da variavel de ambiente."""
    if TOKENS_PATH.exists():
        rt = json.loads(TOKENS_PATH.read_text()).get("refresh_token")
        if rt:
            return rt
    return os.environ.get("GRAPH_REFRESH_TOKEN")


def main():
    rt = _refresh_token()
    if not rt:
        print(
            "SEM_REFRESH_TOKEN: rode graph_devflow.py para login, ou cadastre "
            "GRAPH_REFRESH_TOKEN no ambiente.",
            file=sys.stderr,
        )
        sys.exit(2)
    body = urllib.parse.urlencode(
        {
            "client_id": CLIENT_ID,
            "grant_type": "refresh_token",
            "refresh_token": rt,
            "scope": SCOPE,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{AUTHORITY}/oauth2/v2.0/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        new = json.loads(r.read())
    TOKENS_PATH.write_text(json.dumps(new))
    print("REFRESHED, expires_in:", new.get("expires_in"))


if __name__ == "__main__":
    main()
