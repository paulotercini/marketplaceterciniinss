"""Lista tarefas com vencimento hoje, atrasadas e marcadas como importantes."""
from datetime import datetime, timezone, timedelta
from graph_client import list_lists, list_tasks

TZ_BR = timezone(timedelta(hours=-3))
TODAY = datetime.now(TZ_BR).date()


def parse_due(task):
    dd = task.get("dueDateTime")
    if not dd:
        return None
    try:
        s = dd["dateTime"].replace("Z", "+00:00")
        return datetime.fromisoformat(s).date()
    except Exception:
        return None


def main():
    listas = list_lists()
    print(f"## Listas fixas encontradas ({len(listas)}):")
    for l in listas:
        print(f"  - {l['displayName']} (id={l['id'][:20]}...)")
    print()

    todays = []
    overdue = []
    important_open = []

    for l in listas:
        nome = l["displayName"]
        for t in list_tasks(l["id"]):
            if t.get("status") == "completed":
                continue
            due = parse_due(t)
            entry = {
                "lista": nome,
                "title": t.get("title", ""),
                "importance": t.get("importance"),
                "due": due.isoformat() if due else None,
                "id": t["id"],
            }
            if due == TODAY:
                todays.append(entry)
            elif due and due < TODAY:
                overdue.append(entry)
            if t.get("importance") == "high":
                important_open.append(entry)

    print(f"## VENCEM HOJE ({TODAY.isoformat()}) — {len(todays)} tarefa(s)")
    for e in sorted(todays, key=lambda x: x["lista"]):
        star = " ★" if e["importance"] == "high" else ""
        print(f"  [{e['lista']}]{star} {e['title']}")
    print()

    print(f"## ATRASADAS — {len(overdue)} tarefa(s)")
    for e in sorted(overdue, key=lambda x: (x["due"], x["lista"])):
        star = " ★" if e["importance"] == "high" else ""
        print(f"  [{e['due']}] [{e['lista']}]{star} {e['title']}")
    print()

    print(f"## IMPORTANTES (★) abertas — {len(important_open)} tarefa(s)")
    for e in sorted(important_open, key=lambda x: x["lista"]):
        due = f" (prazo {e['due']})" if e["due"] else ""
        print(f"  [{e['lista']}] {e['title']}{due}")


if __name__ == "__main__":
    main()
