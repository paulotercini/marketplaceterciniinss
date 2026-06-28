"""Login OAuth do Google (device flow) para o Drive somente leitura. Cria
gdrive_tokens.json, igual ao que graph_devflow.py faz para a Microsoft.

Pre-requisito, um cliente OAuth do tipo "TVs e dispositivos com entrada limitada"
no Google Cloud (client_id + client_secret), com a Google Drive API habilitada e a
conta do escritorio como usuario de teste. Coloque as credenciais em
gdrive_oauth.json {"client_id": "...", "client_secret": "..."} ou nas variaveis
GDRIVE_CLIENT_ID / GDRIVE_CLIENT_SECRET.

Uso:
    python3 gdrive_devflow.py start   # mostra o codigo e a URL para autorizar
    python3 gdrive_devflow.py poll    # depois de autorizar, grava o token
"""
import json
import pathlib
import sys
import time
import urllib.error

from gdrive_client import _creds, _post, SCOPE, TOKENS_PATH

DEVICE_URI = "https://oauth2.googleapis.com/device/code"
TOKEN_URI = "https://oauth2.googleapis.com/token"
DEVICE_PATH = pathlib.Path("gdrive_device.json")


def start():
    cid, _ = _creds()
    d = _post(DEVICE_URI, {"client_id": cid, "scope": SCOPE})
    DEVICE_PATH.write_text(json.dumps(d))
    print("1. Abra:", d.get("verification_url") or d.get("verification_uri"))
    print("2. Digite o codigo:", d["user_code"])
    print("3. Faca login com a conta Google do escritorio e autorize.")
    print("4. Depois rode: python3 gdrive_devflow.py poll")


def poll():
    cid, csec = _creds()
    d = json.loads(DEVICE_PATH.read_text())
    interval = d.get("interval", 5)
    deadline = time.time() + d.get("expires_in", 1800)
    while time.time() < deadline:
        try:
            tok = _post(TOKEN_URI, {
                "client_id": cid, "client_secret": csec,
                "device_code": d["device_code"],
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code"})
        except urllib.error.HTTPError as e:
            err = json.loads(e.read() or b"{}").get("error", "")
            if err in ("authorization_pending", "slow_down"):
                if err == "slow_down":
                    interval += 2
                time.sleep(interval)
                continue
            raise
        if "access_token" in tok:
            TOKENS_PATH.write_text(json.dumps(tok))
            print("OK, gdrive_tokens.json gravado. Drive pronto para download por ID.")
            return
    print("Tempo esgotado. Rode 'start' de novo.", file=sys.stderr)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "start"
    (start if cmd == "start" else poll)()
