"""Prepende uma conclusao datada do Claude ao corpo de uma tarefa do To Do,
preservando todo o historico existente.

O prefixo 'DD.MM.AAAA (C): ' (data de hoje em Brasilia) e adicionado
automaticamente, salvo se o texto ja comecar com a data de hoje.

Uso:
    python3 todo_conclusao.py "<list_id>" "<task_id>" "texto da conclusao"
"""
import sys
from datetime import datetime

from triagem import TZ_BR
from graph_client import get_task, _req


def prepend(list_id, task_id, texto):
    hoje = datetime.now(TZ_BR).strftime("%d.%m.%Y")
    texto = texto.strip()
    if not texto.startswith(hoje):
        texto = f"{hoje} (C): {texto}"

    t = get_task(list_id, task_id)
    body = t.get("body", {}) or {}
    old = body.get("content", "") or ""
    ctype = body.get("contentType", "text")

    if ctype == "html":
        novo = f"<div>{texto.replace(chr(10), '<br>')}</div><br>{old}"
    else:
        novo = texto + "\n\n" + old

    _req("PATCH", f"/me/todo/lists/{list_id}/tasks/{task_id}", {"body": {"content": novo, "contentType": ctype}})


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print('Uso: python3 todo_conclusao.py "<list_id>" "<task_id>" "texto"')
        sys.exit(1)
    prepend(sys.argv[1], sys.argv[2], sys.argv[3])
    print("OK")
