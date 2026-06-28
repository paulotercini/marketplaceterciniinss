"""Login OAuth do Google por AUTHORIZATION CODE (necessario para escopos do Drive,
que o device flow do Google nao aceita). Requer um cliente OAuth do tipo
"Aplicativo para computador" (Desktop app) em gdrive_oauth.json ou nas variaveis
GDRIVE_CLIENT_ID / GDRIVE_CLIENT_SECRET.

Fluxo (funciona pelo celular):
  1. python3 gdrive_authcode.py url           -> mostra a URL para autorizar.
  2. Abra a URL no navegador, faca login com a conta do escritorio e autorize.
     O navegador sera redirecionado para http://localhost/?code=... e vai dar
     "nao foi possivel acessar" (normal). COPIE a URL inteira da barra de endereco.
  3. python3 gdrive_authcode.py exchange "<URL_ou_code>"  -> grava gdrive_tokens.json.
"""
import json
import sys
import urllib.parse

from gdrive_client import _creds, _post, SCOPE, TOKENS_PATH

AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URI = "https://oauth2.googleapis.com/token"
REDIRECT = "http://localhost"


def url():
    cid, _ = _creds()
    q = urllib.parse.urlencode({
        "client_id": cid,
        "redirect_uri": REDIRECT,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
    })
    print(AUTH_URI + "?" + q)


def _extrai_code(arg):
    arg = arg.strip()
    if arg.startswith("http"):
        qs = urllib.parse.urlparse(arg).query
        code = urllib.parse.parse_qs(qs).get("code", [None])[0]
        if not code:
            raise SystemExit("Nao achei 'code' na URL colada.")
        return code
    return arg


def exchange(arg):
    cid, csec = _creds()
    code = _extrai_code(arg)
    tok = _post(TOKEN_URI, {
        "client_id": cid, "client_secret": csec, "code": code,
        "grant_type": "authorization_code", "redirect_uri": REDIRECT})
    TOKENS_PATH.write_text(json.dumps(tok))
    print("OK, gdrive_tokens.json gravado. refresh_token presente:", "refresh_token" in tok)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("url", "exchange"):
        print('Uso: python3 gdrive_authcode.py url | exchange "<URL ou code>"')
        sys.exit(1)
    if sys.argv[1] == "url":
        url()
    else:
        if len(sys.argv) < 3:
            print('Falta o code/URL. Uso: python3 gdrive_authcode.py exchange "<URL ou code>"')
            sys.exit(1)
        exchange(sys.argv[2])
