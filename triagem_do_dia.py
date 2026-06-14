"""Coleta as tarefas do Microsoft To Do atribuidas a Paulo (P) com vencimento na
data alvo (default: hoje em horario de Brasilia) e grava em triagem_hoje.json os
dados necessarios para a triagem (corpo, checklist e metadados dos anexos).

Reaproveita a logica de 'atribuida a Paulo' e parse de data de triagem.py.

Uso:
    python3 triagem_do_dia.py            # hoje (America/Sao_Paulo)
    python3 triagem_do_dia.py 13/06/2026 # data especifica
"""
import json
import sys
from datetime import datetime

from triagem import TZ_BR, parse_due, is_paulo_task, last_author
from graph_client import list_lists, list_tasks, _req

OUT = "triagem_hoje.json"


def _checklist(lid, tid):
    try:
        vals = _req("GET", f"/me/todo/lists/{lid}/tasks/{tid}/checklistItems").get("value", [])
        return [{"text": i.get("displayName"), "checked": i.get("isChecked")} for i in vals]
    except Exception:
        return []


def _anexos(lid, tid):
    try:
        vals = _req("GET", f"/me/todo/lists/{lid}/tasks/{tid}/attachments").get("value", [])
        return [
            {"name": a.get("name"), "contentType": a.get("contentType"), "size": a.get("size"), "id": a.get("id")}
            for a in vals
        ]
    except Exception:
        return []


def main():
    if len(sys.argv) > 1:
        alvo = datetime.strptime(sys.argv[1], "%d/%m/%Y").date()
    else:
        alvo = datetime.now(TZ_BR).date()

    selecionadas = []
    for l in list_lists():
        for t in list_tasks(l["id"]):
            if t.get("status") == "completed":
                continue
            if parse_due(t) != alvo:
                continue
            body = t.get("body", {}).get("content", "") or ""
            if not is_paulo_task(body):
                continue
            selecionadas.append(
                {
                    "lista": l["displayName"],
                    "list_id": l["id"],
                    "task_id": t["id"],
                    "title": t.get("title", ""),
                    "importance": t.get("importance"),
                    "due": alvo.isoformat(),
                    "ultimo_autor": last_author(body),
                    "body": body,
                    "checklist": _checklist(l["id"], t["id"]),
                    "anexos": _anexos(l["id"], t["id"]),
                }
            )

    data = {"data_alvo": alvo.strftime("%d/%m/%Y"), "total": len(selecionadas), "tarefas": selecionadas}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"TRIAGEM {alvo.strftime('%d/%m/%Y')} - {len(selecionadas)} tarefa(s) de Paulo vencendo hoje")
    for i, s in enumerate(selecionadas, 1):
        print(f"{i}. [{s['lista']}] {s['title']}  (anexos: {len(s['anexos'])})")
    print(f"\nDetalhes completos em {OUT}")


if __name__ == "__main__":
    main()
