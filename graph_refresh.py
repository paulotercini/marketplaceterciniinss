"""Renova o access_token usando o refresh_token de graph_tokens.json.

Uso normal nao e mais necessario: o graph_client renova sozinho. Este
script continua util para forcar um refresh manual.
"""
import graph_auth


def main():
    tok = graph_auth.refresh()
    print("REFRESHED, expires_in:", tok.get("expires_in"))


if __name__ == "__main__":
    main()
