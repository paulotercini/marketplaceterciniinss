"""Renova o access_token usando refresh_token salvo em graph_tokens.json."""
import json, urllib.parse, urllib.request, urllib.error, pathlib

import graph_access_log as gal

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPE = "Tasks.ReadWrite offline_access"
TOKENS_PATH = pathlib.Path("graph_tokens.json")


def main():
    cur = json.loads(TOKENS_PATH.read_text())
    body = urllib.parse.urlencode(
        {
            "client_id": CLIENT_ID,
            "grant_type": "refresh_token",
            "refresh_token": cur["refresh_token"],
            "scope": SCOPE,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{AUTHORITY}/oauth2/v2.0/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            new = json.loads(r.read())
    except urllib.error.HTTPError as e:
        gal.registrar(
            "refresh", "graph_refresh.py", resultado="erro",
            detalhe=f"HTTP {e.code}",
        )
        raise
    TOKENS_PATH.write_text(json.dumps(new))
    gal.registrar(
        "refresh", "graph_refresh.py", resultado="ok",
        expires_in=new.get("expires_in"),
        scope=new.get("scope"),
        token_hash=gal.token_hash(new.get("access_token")),
    )
    print("REFRESHED, expires_in:", new.get("expires_in"))


if __name__ == "__main__":
    main()
