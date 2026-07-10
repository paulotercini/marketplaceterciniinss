"""Bootstrap do acesso Google Drive para ambientes efemeros.

Mantem o acesso ativo automaticamente a cada inicio de sessao, sem
reautorizacao manual (mesmo padrao do graph_bootstrap.py). Logica:

  1. Se gdrive_tokens.json ja existe, tenta apenas renovar o access_token.
  2. Senao, e se a variavel de ambiente GDRIVE_REFRESH_TOKEN estiver definida
     (com GDRIVE_CLIENT_ID e GDRIVE_CLIENT_SECRET, que o gdrive_client ja le
     do ambiente), recria gdrive_tokens.json a partir dela e renova.
  3. Senao, apenas avisa que e preciso autenticar via device-code.

Nunca falha de forma a bloquear a sessao (sempre retorna 0).
"""
import json
import os
import pathlib
import sys

TOKENS_PATH = pathlib.Path("gdrive_tokens.json")


def _refresh():
    import gdrive_client

    gdrive_client.refresh()


def main():
    if TOKENS_PATH.exists():
        try:
            _refresh()
            print("[gdrive_bootstrap] access_token renovado.")
        except Exception as e:  # token salvo invalido/expirado
            print(f"[gdrive_bootstrap] falha ao renovar token existente: {e}", file=sys.stderr)
        return 0

    refresh_token = os.environ.get("GDRIVE_REFRESH_TOKEN")
    if not refresh_token:
        print(
            "[gdrive_bootstrap] sem gdrive_tokens.json e sem GDRIVE_REFRESH_TOKEN. "
            "Autentique com: python3 gdrive_devflow.py start && python3 gdrive_devflow.py poll",
            file=sys.stderr,
        )
        return 0

    TOKENS_PATH.write_text(json.dumps({"refresh_token": refresh_token}))
    try:
        _refresh()
        print("[gdrive_bootstrap] acesso Google Drive restaurado a partir do secret.")
    except Exception as e:
        print(f"[gdrive_bootstrap] falha ao restaurar acesso a partir do secret: {e}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
