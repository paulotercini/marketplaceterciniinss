"""Triagem inteligente das tarefas atribuidas a Paulo (P) por data alvo.

Considera 'atribuida a Paulo' a tarefa cuja entrada mais recente do body
tem '(P):' como autor, OU cujo unico autor no body eh Paulo. Filtra por
data alvo via dueDateTime.

Categoriza cada tarefa por tipo de acao para facilitar a triagem.
"""
import re
import sys
from datetime import datetime, date, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "graph"))
from client import list_lists, list_tasks

TZ_BR = timezone(timedelta(hours=-3))

PATTERN_ENTRY = re.compile(r"(\d{2})\.(\d{2})\.(\d{4})\s*\(([A-Z])\)\s*:", re.MULTILINE)


def parse_due(task):
    dd = task.get("dueDateTime")
    if not dd:
        return None
    try:
        s = dd["dateTime"].replace("Z", "+00:00")
        utc = datetime.fromisoformat(s)
        return utc.astimezone(TZ_BR).date()
    except Exception:
        return None


def last_author(body: str):
    matches = PATTERN_ENTRY.findall(body)
    if not matches:
        return None
    return matches[0][3]


def all_authors(body: str):
    return {m[3] for m in PATTERN_ENTRY.findall(body)}


def is_paulo_task(body: str):
    if not body:
        return True
    la = last_author(body)
    if la == "P":
        return True
    if la is None:
        return True
    aa = all_authors(body)
    if aa == {"P"}:
        return True
    if la in {"L", "G"} and "P" in aa:
        return True
    return False


def categorize(title: str, body: str, list_name: str):
    title_l = title.lower()
    body_l = (body or "").lower()
    first_lines = " ".join((body or "").split("\n")[:3]).lower()

    if list_name == "💵 Pagamentos" or "pagamento" in title_l or "honorar" in body_l:
        return "Cobrar pagamento"
    if any(x in body_l for x in ["audiência", "audiencia", "perícia", "pericia", "intimação", "intimacao"]):
        return "Audiência/perícia/prazo"
    if any(x in first_lines for x in ["sistema de verificação", "verificar pedido", "verificar se foi"]):
        return "Verificar sistema (PAT/GERID/MeuINSS)"
    if any(x in body_l for x in ["protocolar recurso", "fazer ms", "fazer mandado", "redigir", "minutar", "petição inicial", "peticao inicial", "inicial de", "ação ordinária", "acao ordinaria", "réplica", "replica", "contrarrazões", "contrarrazoes", "manifest"]):
        return "Redigir peça"
    if any(x in body_l for x in ["aguardar documento", "trazer documento", "enviar documento", "comprovante de endereço", "comprovante de endereco", "ctps", "extrato", "procuração", "procuracao"]):
        if "aguard" in body_l or "trazer" in body_l or "preciso" in body_l:
            return "Aguardar/cobrar documento"
    if any(x in body_l for x in ["avisar", "ligar", "mensagem", "whatsapp", "contatar", "marcar horário", "marcar horario", "retornar", "retorno"]):
        return "Contatar cliente"
    if any(x in title_l for x in ["recurso", "judicial", "ação", "acao"]):
        return "Acompanhar processo"
    return "Outros"


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 triagem.py DD/MM/AAAA [DD/MM/AAAA ...]")
        return
    alvos = []
    for arg in sys.argv[1:]:
        d = datetime.strptime(arg, "%d/%m/%Y").date()
        alvos.append(d)

    todas = []
    for l in list_lists():
        for t in list_tasks(l["id"]):
            if t.get("status") == "completed":
                continue
            todas.append((l["displayName"], t))

    for alvo in alvos:
        do_paulo = []
        outros = []
        for nome_lista, t in todas:
            due = parse_due(t)
            if due != alvo:
                continue
            body = t.get("body", {}).get("content", "") or ""
            entry = {
                "lista": nome_lista,
                "title": t.get("title", ""),
                "body": body,
                "importance": t.get("importance"),
                "due": due,
                "id": t["id"],
                "ultimo_autor": last_author(body),
            }
            if is_paulo_task(body):
                do_paulo.append(entry)
            else:
                outros.append(entry)

        print(f"\n{'='*70}")
        print(f"TRIAGEM PARA {alvo.strftime('%d/%m/%Y')} ({alvo.strftime('%A')})")
        print(f"{'='*70}")
        print(f"Tarefas atribuidas a P (Paulo): {len(do_paulo)}")
        print(f"Tarefas atribuidas a outros: {len(outros)}")

        if not do_paulo and not outros:
            print("\n  Nenhuma tarefa com vencimento nesta data.")
            continue

        if do_paulo:
            print(f"\n--- TAREFAS DE PAULO POR CATEGORIA ---")
            categorias = {}
            for e in do_paulo:
                cat = categorize(e["title"], e["body"], e["lista"])
                categorias.setdefault(cat, []).append(e)
            for cat in sorted(categorias.keys()):
                items = categorias[cat]
                print(f"\n  [{cat}] ({len(items)})")
                for e in items:
                    star = " ★" if e["importance"] == "high" else ""
                    print(f"    - [{e['lista']}]{star} {e['title']}")
                    primeira_linha = e["body"].split("\n")[0][:120] if e["body"] else "(body vazio)"
                    print(f"        > {primeira_linha}")

        if outros:
            print(f"\n--- TAREFAS DELEGADAS (atribuidas a outros, mas com prazo {alvo.strftime('%d/%m')}) ---")
            for e in outros:
                print(f"  [{e['lista']}] {e['title']} (ult.autor: {e['ultimo_autor']})")


if __name__ == "__main__":
    main()
