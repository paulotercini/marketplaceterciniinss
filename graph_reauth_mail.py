"""Reautoriza o Microsoft Graph (Tasks + Mail + Contacts.Read)."""
import json, sys, time, urllib.parse, urllib.request, urllib.error, pathlib

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPE = "Tasks.ReadWrite Mail.ReadWrite Mail.Send Contacts.Read offline_access"
TOKENS_PATH = pathlib.Path("graph_tokens.json")
DEVICE_PATH = pathlib.Path("graph_device_mail.json")


def http_post(url, data):
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def start():
    resp = http_post(f"{AUTHORITY}/oauth2/v2.0/devicecode",
                     {"client_id": CLIENT_ID, "scope": SCOPE})
    DEVICE_PATH.write_text(json.dumps(resp))
    print("USER_CODE:", resp["user_code"])
    print("URL:", resp["verification_uri"])
    print("MENSAGEM:", resp.get("message", ""))


def poll():
    info = json.loads(DEVICE_PATH.read_text())
    deadline = time.time() + info["expires_in"]
    while time.time() < deadline:
        try:
            tok = http_post(f"{AUTHORITY}/oauth2/v2.0/token", {
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "client_id": CLIENT_ID,
                "device_code": info["device_code"],
            })
            TOKENS_PATH.write_text(json.dumps(tok))
            print("TOKEN_OK scope:", tok.get("scope", ""))
            return
        except urllib.error.HTTPError as e:
            err = json.loads(e.read()).get("error", "")
            if err in ("authorization_pending", "slow_down"):
                time.sleep(info.get("interval", 5))
                continue
            print("ERRO:", err)
            raise
    print("TIMEOUT")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "start"
    {"start": start, "poll": poll}[cmd]()
