"""Renova o access_token usando refresh_token salvo em graph_tokens.json."""
import json, urllib.parse, urllib.request, pathlib

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPE = "Tasks.ReadWrite Mail.ReadWrite Mail.Send offline_access"
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
    with urllib.request.urlopen(req) as r:
        new = json.loads(r.read())
    TOKENS_PATH.write_text(json.dumps(new))
    print("REFRESHED, expires_in:", new.get("expires_in"))


if __name__ == "__main__":
    main()
