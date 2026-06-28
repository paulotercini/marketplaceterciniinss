"""Bootstrap do acesso Microsoft Graph para ambientes efemeros.

Mantem o acesso ativo automaticamente a cada inicio de sessao, sem
reautorizacao manual. Logica:

  1. Se graph_tokens.json ja existe, tenta apenas renovar o access_token.
  2. Senao, e se a variavel de ambiente GRAPH_REFRESH_TOKEN estiver
     definida, recria graph_tokens.json a partir dela e renova
     (mesmo padrao do workflow .github/workflows/dou-monitor.yml).
  3. Senao, apenas avisa que e preciso autenticar via device-code.

Nunca falha de forma a bloquear a sessao (sempre retorna 0).
"""
import json
import os
import pathlib
import sys

TOKENS_PATH = pathlib.Path("graph_tokens.json")


def _refresh():
    import graph_refresh

    graph_refresh.main()


def main():
    if TOKENS_PATH.exists():
        try:
            _refresh()
            print("[graph_bootstrap] access_token renovado.")
        except Exception as e:  # token salvo invalido/expirado
            print(f"[graph_bootstrap] falha ao renovar token existente: {e}", file=sys.stderr)
        return 0

    refresh_token = os.environ.get("GRAPH_REFRESH_TOKEN")
    if not refresh_token:
        print(
            "[graph_bootstrap] sem graph_tokens.json e sem GRAPH_REFRESH_TOKEN. "
            "Autentique com: python3 graph_devflow.py start && python3 graph_devflow.py poll",
            file=sys.stderr,
        )
        return 0

    TOKENS_PATH.write_text(json.dumps({"refresh_token": refresh_token}))
    try:
        _refresh()
        print("[graph_bootstrap] acesso Microsoft Graph restaurado a partir do secret.")
    except Exception as e:
        print(f"[graph_bootstrap] falha ao restaurar acesso a partir do secret: {e}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
