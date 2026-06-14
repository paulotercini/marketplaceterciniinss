"""Prepende uma conclusao datada do Claude ao corpo de uma tarefa do To Do,
preservando TODO o historico existente.

SALVAGUARDAS (regra inviolavel do escritorio — nunca perder historico):
  1. Antes de qualquer escrita, faz backup do corpo original em todo_backups/.
  2. So grava por PREPEND (acrescenta no topo); nunca substitui o corpo.
  3. Aborta se a nova versao nao contiver integralmente o corpo anterior.

O prefixo 'DD.MM.AAAA (C): ' usa a data de hoje em horario de Brasilia.

Uso:
    python3 todo_conclusao.py "<list_id>" "<task_id>" "texto da conclusao"
"""
import os
import sys
from datetime import datetime

from triagem import TZ_BR
from graph_client import get_task, _req

BACKUP_DIR = "todo_backups"


def _backup(task_id, body):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now(TZ_BR).strftime("%Y%m%d-%H%M%S")
    path = os.path.join(BACKUP_DIR, f"{ts}_{task_id[:24]}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(body or "")
    return path


def prepend(list_id, task_id, texto):
    hoje = datetime.now(TZ_BR).strftime("%d.%m.%Y")
    texto = texto.strip()
    if not texto.startswith(hoje):
        texto = f"{hoje} (C): {texto}"

    t = get_task(list_id, task_id)
    body = t.get("body", {}) or {}
    old = body.get("content", "") or ""
    ctype = body.get("contentType", "text")

    # Salvaguarda 1 — backup do corpo original antes de gravar.
    bkp = _backup(task_id, old)

    if ctype == "html":
        novo = f"<div>{texto.replace(chr(10), '<br>')}</div><br>{old}"
    else:
        novo = texto + "\n\n" + old

    # Salvaguarda 3 — jamais sobrescrever/excluir o historico existente.
    if old.strip() and old not in novo:
        raise RuntimeError(
            f"Abortado: a nova versao nao preserva o corpo original. Backup em {bkp}"
        )

    _req(
        "PATCH",
        f"/me/todo/lists/{list_id}/tasks/{task_id}",
        {"body": {"content": novo, "contentType": ctype}},
    )
    return bkp


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print('Uso: python3 todo_conclusao.py "<list_id>" "<task_id>" "texto"')
        sys.exit(1)
    bkp = prepend(sys.argv[1], sys.argv[2], sys.argv[3])
    print(f"OK (backup do corpo original em {bkp})")
