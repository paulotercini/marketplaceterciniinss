import json, urllib.parse, urllib.request, pathlib

GRAPH = "https://graph.microsoft.com/v1.0"
TOKENS_PATH = pathlib.Path("graph_tokens.json")


def _token():
    return json.loads(TOKENS_PATH.read_text())["access_token"]


def _req(method, path, body=None):
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
    with urllib.request.urlopen(req) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


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
    time_zone="America/Sao_Paulo",
):
    payload = {
        "title": title,
        "body": {"content": body_content, "contentType": content_type},
        "importance": importance,
    }
    if due_date_iso:
        payload["dueDateTime"] = {"dateTime": due_date_iso, "timeZone": time_zone}
    return _req("POST", f"/me/todo/lists/{list_id}/tasks", payload)


def find_task_by_title(list_id, title_substring):
    return [
        t
        for t in list_tasks(list_id)
        if title_substring.lower() in t.get("title", "").lower()
    ]
