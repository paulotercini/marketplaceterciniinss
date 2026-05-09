"""Constroi cache local de todas as tarefas + checklists do Microsoft To Do.

Salva em /tmp/audit_cache.json (NAO commitar - dados sensiveis: CPFs, senhas,
telefones, historicos de clientes).

Uso: python3 build_cache.py
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "graph"))
from client import list_lists, list_tasks, _req

CACHE_PATH = Path("/tmp/audit_cache.json")


def main():
    t0 = time.time()
    print("Buscando listas...")
    listas = list_lists()
    print(f"  {len(listas)} listas encontradas")

    cache = {"listas": [], "geradoEm": time.strftime("%Y-%m-%d %H:%M:%S")}
    total_tarefas = 0
    total_checklist = 0

    for i, l in enumerate(listas, 1):
        nome = l["displayName"]
        print(f"[{i}/{len(listas)}] {nome}", end="", flush=True)
        tarefas = list_tasks(l["id"])
        print(f" - {len(tarefas)} tarefas", end="", flush=True)

        tarefas_com_checklist = []
        for t in tarefas:
            checklist = []
            try:
                resp = _req(
                    "GET",
                    f"/me/todo/lists/{l['id']}/tasks/{t['id']}/checklistItems"
                )
                checklist = [
                    {"text": it.get("displayName", ""), "checked": it.get("isChecked", False)}
                    for it in resp.get("value", [])
                ]
            except Exception as e:
                checklist = []

            tarefas_com_checklist.append({
                "id": t["id"],
                "title": t.get("title", ""),
                "status": t.get("status"),
                "importance": t.get("importance"),
                "createdDateTime": t.get("createdDateTime"),
                "lastModifiedDateTime": t.get("lastModifiedDateTime"),
                "completedDateTime": t.get("completedDateTime"),
                "dueDateTime": t.get("dueDateTime"),
                "reminderDateTime": t.get("reminderDateTime"),
                "isReminderOn": t.get("isReminderOn"),
                "body": t.get("body", {}).get("content", ""),
                "checklist": checklist,
            })
            total_checklist += len(checklist)

        cache["listas"].append({
            "id": l["id"],
            "displayName": nome,
            "tarefas": tarefas_com_checklist,
        })
        total_tarefas += len(tarefas)
        print(f" + {sum(len(t['checklist']) for t in tarefas_com_checklist)} checklist items")

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False))
    elapsed = time.time() - t0
    print(f"\nCache salvo em {CACHE_PATH}")
    print(f"  {len(listas)} listas")
    print(f"  {total_tarefas} tarefas")
    print(f"  {total_checklist} itens de checklist")
    print(f"  {CACHE_PATH.stat().st_size / 1024:.1f} KB")
    print(f"  {elapsed:.1f}s")


if __name__ == "__main__":
    main()
