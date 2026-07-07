import json, urllib.parse, urllib.request, urllib.error, pathlib, time, ssl
import graph_auth

GRAPH = "https://graph.microsoft.com/v1.0"
TOKENS_PATH = pathlib.Path("graph_tokens.json")


def _token(force_refresh=False):
    # renova sozinho quando o access_token esta perto de expirar
    return graph_auth.access_token(force_refresh=force_refresh)


def _req(method, path, body=None, _tentativas=5):
    url = path if path.startswith("http") else f"{GRAPH}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    ultimo_erro = None
    _refresh_forcado = False
    for i in range(_tentativas):
        req = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {_token(force_refresh=_refresh_forcado)}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            # HTTPError É subclasse de URLError — tratar ANTES.
            # 401: token invalido/revogado — força um refresh e retenta uma vez.
            if e.code == 401 and not _refresh_forcado and i < _tentativas - 1:
                _refresh_forcado = True
                ultimo_erro = e
                continue
            # Só retenta 5xx/429.
            if e.code in (429, 500, 502, 503, 504) and i < _tentativas - 1:
                ultimo_erro = e
                time.sleep(2 ** i)
                continue
            raise
        except (ssl.SSLError, urllib.error.URLError, TimeoutError, ConnectionError) as e:
            # erros de rede transitórios (SSL EOF, reset, timeout) — backoff e retenta
            ultimo_erro = e
            if i < _tentativas - 1:
                time.sleep(2 ** i)
    raise ultimo_erro


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
