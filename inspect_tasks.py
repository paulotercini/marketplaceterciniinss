"""Amostra a estrutura de tarefas em listas-chave para entender o contexto disponivel."""
import json
from graph_client import list_lists, list_tasks

LISTAS_AMOSTRA = ["🌻 INSS", "🙋 Escritório", "🗓 Tarefas com Prazo", "☕ Marcos", "👪 Judicial", "💵 Pagamentos"]
AMOSTRAS_POR_LISTA = 2


def main():
    listas = {l["displayName"]: l for l in list_lists()}
    for nome in LISTAS_AMOSTRA:
        if nome not in listas:
            print(f"\n=== {nome} -- nao encontrada ===")
            continue
        tarefas = [t for t in list_tasks(listas[nome]["id"]) if t.get("status") != "completed"]
        print(f"\n===== {nome} ({len(tarefas)} abertas) =====")
        for t in tarefas[:AMOSTRAS_POR_LISTA]:
            print(f"\n--- TITULO: {t.get('title','')}")
            print(f"    importance: {t.get('importance')}")
            print(f"    due: {t.get('dueDateTime')}")
            print(f"    reminder: {t.get('reminderDateTime')}")
            body = t.get("body", {}).get("content", "")
            preview = body[:1200].replace("\r\n", "\n")
            print(f"    body[:1200]:\n{preview}")
            checklist_url = f"/me/todo/lists/{listas[nome]['id']}/tasks/{t['id']}/checklistItems"
            try:
                from graph_client import _req
                items = _req("GET", checklist_url).get("value", [])
                if items:
                    print(f"    checklist ({len(items)} sub-itens):")
                    for it in items:
                        check = "[x]" if it.get("isChecked") else "[ ]"
                        print(f"      {check} {it.get('displayName','')}")
            except Exception as e:
                print(f"    checklist erro: {e}")


if __name__ == "__main__":
    main()
