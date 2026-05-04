"""
Autorização interativa do Microsoft Graph via Device Code Flow.

Uso:
  python3 graph_auth.py          → exibe o código e URL, aguarda autorização
  python3 graph_auth.py --check  → apenas verifica se o token atual é válido
"""
import sys
import time
import pathlib

from graph_client import token_ok, start_device_flow, poll_device_flow, _refresh, TOKENS_PATH


def check():
    if not TOKENS_PATH.exists():
        print("STATUS: ausente — graph_tokens.json não encontrado")
        return False
    if not token_ok():
        print("STATUS: inválido — arquivo existe mas falta refresh_token")
        return False
    try:
        _refresh()
        print("STATUS: ok — token renovado com sucesso")
        return True
    except Exception as e:
        print(f"STATUS: erro ao renovar — {e}")
        return False


def authorize():
    print("Iniciando autorizacao Microsoft To Do...\n")
    info = start_device_flow()

    print("=" * 60)
    print(f"  1. Acesse: {info['verification_uri']}")
    print(f"  2. Digite o codigo: {info['user_code']}")
    print("  3. Faça login com a conta Microsoft do escritório")
    print("  4. Aguarde esta tela confirmar...\n")
    print("=" * 60)

    deadline = time.time() + info.get("expires_in", 900)
    interval = info.get("interval", 5)

    while time.time() < deadline:
        time.sleep(interval)
        from graph_client import _http_post, _save_tokens, CLIENT_ID, AUTHORITY
        import urllib.error
        try:
            tok = _http_post(f"{AUTHORITY}/oauth2/v2.0/token", {
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "client_id": CLIENT_ID,
                "device_code": info["device_code"],
            })
            _save_tokens(tok)
            print("\nAutorizacao concluida. graph_tokens.json salvo.")
            print("A rotina DOU pode ser executada normalmente.")
            return True
        except urllib.error.HTTPError as e:
            import json
            err = json.loads(e.read()).get("error", "")
            if err in ("authorization_pending", "slow_down"):
                print(".", end="", flush=True)
                continue
            print(f"\nErro inesperado: {err}")
            return False

    print("\nTempo expirado. Execute novamente: python3 graph_auth.py")
    return False


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(0 if check() else 1)
    else:
        sys.exit(0 if authorize() else 1)
