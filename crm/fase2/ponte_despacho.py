"""F291 · a ponte do "Concluir por hoje": CRM -> To Do.

O despacho no CRM (casos.ronda.despacho) apaga a ⭐ e marca quando o cliente
volta (casos.prazo). Esta ponte leva as duas coisas à tarefa do To Do
(importance e dueDateTime) e marca ronda.despacho.todo com a data. Roda antes
da sincronização To Do -> banco, que de outro modo acenderia a ⭐ de novo.
Não escreve no corpo nem conclui a tarefa.

    python3 crm/fase2/ponte_despacho.py            # leva os despachos pendentes
    python3 crm/fase2/ponte_despacho.py --simular  # só mostra o que faria

Desliga com PONTE_DESPACHO=0 (variável de repositório de mesmo nome no workflow).
Exige SUPABASE_URL e SUPABASE_SERVICE_KEY, e o graph_tokens.json.
"""
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ponte_cards import RAIZ, _rest  # noqa: E402

sys.path.insert(0, str(RAIZ))
LIMITE = 60            # por rodada: um engano não se espalha pela lista inteira


def pendentes(casos):
    """Os casos despachados no CRM cuja tarefa do To Do ainda não recebeu o despacho."""
    out = []
    for k in casos or []:
        d = (k.get("ronda") or {}).get("despacho") or {}
        if k.get("todo_task_id") and d.get("prazo") and not d.get("todo") and not d.get("todo_falha"):
            out.append(k)
    return out


def corpo_da_tarefa(k):
    """O que muda na tarefa: a estrela segue a do caso e a data é a volta."""
    prazo = k.get("prazo") or k["ronda"]["despacho"]["prazo"]
    return {"importance": "high" if k.get("importante") else "normal",
            "dueDateTime": {"dateTime": f"{prazo}T00:00:00", "timeZone": "America/Sao_Paulo"}}


def main(argv):
    if os.environ.get("PONTE_DESPACHO") == "0":
        print("ponte do despacho desligada (PONTE_DESPACHO=0). Nada foi enviado.")
        return 0
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    simular = "--simular" in argv
    casos = _rest("GET", "/rest/v1/casos?todo_task_id=not.is.null&ronda->despacho=not.is.null"
                         "&ronda->despacho->>todo=is.null"
                         "&select=id,todo_task_id,origem_lista,prazo,importante,ronda") or []
    alvo = pendentes(casos)[:LIMITE]
    if not alvo:
        print("ponte do despacho: nada a levar ao To Do.")
        return 0
    import graph_client
    listas = {l.get("displayName"): l["id"] for l in graph_client.list_lists()}
    hoje = datetime.date.today().isoformat()
    feitos = falhas = 0
    for k in alvo:
        corpo = corpo_da_tarefa(k)
        if simular:
            print(f"  levaria {k['todo_task_id'][:12]}… ({k.get('origem_lista')}): {corpo}")
            continue
        ronda = dict(k.get("ronda") or {})
        desp = dict(ronda.get("despacho") or {})
        lid = listas.get(k.get("origem_lista"))
        try:
            if not lid:
                raise LookupError("lista não encontrada")
            graph_client._req("PATCH", f"/me/todo/lists/{lid}/tasks/{k['todo_task_id']}", corpo)
            desp["todo"] = hoje
            feitos += 1
        except Exception as e:                      # noqa: BLE001 — a tarefa sumiu ou mudou de lista
            desp["todo_falha"] = f"{hoje}: {type(e).__name__}"
            falhas += 1
        ronda["despacho"] = desp
        _rest("PATCH", f"/rest/v1/casos?id=eq.{k['id']}", {"ronda": ronda}, prefer="return=minimal")
    print(f"ponte do despacho: {feitos} tarefa(s) atualizada(s) no To Do"
          + (f", {falhas} não encontrada(s)" if falhas else "") + ("" if not simular else " (simulação)"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
