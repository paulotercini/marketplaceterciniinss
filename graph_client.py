import json, urllib.parse, urllib.request, urllib.error, pathlib

GRAPH = "https://graph.microsoft.com/v1.0"
TOKENS_PATH = pathlib.Path("graph_tokens.json")

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPE = "Tasks.ReadWrite offline_access"


# ---------------------------------------------------------------------------
# Token management
# ---------------------------------------------------------------------------

def _load_tokens():
    return json.loads(TOKENS_PATH.read_text())


def _save_tokens(tok):
    TOKENS_PATH.write_text(json.dumps(tok))


def _refresh():
    """Troca o refresh_token por um novo access_token e persiste."""
    cur = _load_tokens()
    body = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "grant_type": "refresh_token",
        "refresh_token": cur["refresh_token"],
        "scope": SCOPE,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{AUTHORITY}/oauth2/v2.0/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        new = json.loads(r.read())
    _save_tokens(new)
    return new["access_token"]


def _token():
    return _load_tokens()["access_token"]


def token_ok() -> bool:
    """Retorna True se graph_tokens.json existe e tem refresh_token."""
    if not TOKENS_PATH.exists():
        return False
    try:
        d = _load_tokens()
        return bool(d.get("refresh_token"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# HTTP layer — retry automático em 401
# ---------------------------------------------------------------------------

def _req(method, path, body=None, _retried=False):
    url = path if path.startswith("http") else f"{GRAPH}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {_token()}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        if e.code == 401 and not _retried:
            # access_token expirou — renova e tenta uma vez
            _refresh()
            return _req(method, path, body, _retried=True)
        raise


# ---------------------------------------------------------------------------
# Device-code flow — autorização inicial interativa
# ---------------------------------------------------------------------------

def start_device_flow() -> dict:
    """Inicia o device-code flow e retorna o dict com user_code e verification_uri."""
    body = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "scope": SCOPE,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{AUTHORITY}/oauth2/v2.0/devicecode",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        resp = json.loads(r.read())
    pathlib.Path("graph_device.json").write_text(json.dumps(resp))
    return resp


def poll_device_flow() -> bool:
    """
    Tenta trocar o device_code por tokens.
    Retorna True se obteve tokens, False se ainda pendente/expirado.
    """
    import time
    info = json.loads(pathlib.Path("graph_device.json").read_text())
    deadline = time.time() + info.get("expires_in", 900)
    interval = info.get("interval", 5)
    while time.time() < deadline:
        try:
            tok = _http_post(f"{AUTHORITY}/oauth2/v2.0/token", {
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "client_id": CLIENT_ID,
                "device_code": info["device_code"],
            })
            _save_tokens(tok)
            return True
        except urllib.error.HTTPError as e:
            err = json.loads(e.read()).get("error", "")
            if err in ("authorization_pending", "slow_down"):
                time.sleep(interval)
                continue
            raise
    return False


def _http_post(url, data):
    body = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_lists():
    return _req("GET", "/me/todo/lists")["value"]


def list_tasks(list_id):
    out, url = [], f"/me/todo/lists/{list_id}/tasks?$top=50"
    while url:
        page = _req("GET", url)
        out.extend(page["value"])
        url = page.get("@odata.nextLink")
    return out


def get_task(list_id, task_id):
    return _req("GET", f"/me/todo/lists/{list_id}/tasks/{task_id}")


def update_task_body(list_id, task_id, content, content_type="text"):
    return _req(
        "PATCH",
        f"/me/todo/lists/{list_id}/tasks/{task_id}",
        {"body": {"content": content, "contentType": content_type}},
    )


def create_task(
    list_id,
    title,
    body_content="",
    content_type="text",
    importance="normal",
    due_date_iso=None,
    reminder_iso=None,
    time_zone="America/Sao_Paulo",
):
    payload = {
        "title": title,
        "body": {"content": body_content, "contentType": content_type},
        "importance": importance,
    }
    if due_date_iso:
        payload["dueDateTime"] = {"dateTime": due_date_iso, "timeZone": time_zone}
    if reminder_iso:
        payload["reminderDateTime"] = {"dateTime": reminder_iso, "timeZone": time_zone}
        payload["isReminderOn"] = True
    return _req("POST", f"/me/todo/lists/{list_id}/tasks", payload)


def find_task_by_title(list_id, title_substring):
    return [
        t
        for t in list_tasks(list_id)
        if title_substring.lower() in t.get("title", "").lower()
    ]
