"""F291 · a ponte do "Concluir por hoje": CRM -> To Do.

O despacho no CRM (casos.ronda.despacho) marca quando o cliente volta
(casos.prazo). Esta ponte leva a volta e a ⭐ à tarefa do To Do (importance e
dueDateTime) e marca ronda.despacho.todo com a data. F373: leva também a ⭐ que
mudou no CRM (importante diferente de todo_importante). Roda antes da
sincronização To Do -> banco, para o To Do já ter a estrela do CRM.
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


def estrelas_a_levar(casos, ja_vao=()):
    """F373 · a ⭐ do caso espelhada no To Do (pedido do Paulo, 02.11.2026). Vai a ⭐ que mudou no CRM
    desde a última rodada (importante diferente de todo_importante). A nula é caso que a sincronização
    ainda não viu: vai só a acesa. O caso do despacho pendente leva a ⭐ junto do despacho."""
    out = []
    for k in casos or []:
        t, v = k.get("todo_importante"), bool(k.get("importante"))
        if k.get("todo_task_id") and k["id"] not in ja_vao and (v if t is None else v != bool(t)):
            out.append(k)
    return out


def levar_estrelas(casos, listas, graph_client, simular=False):
    feitos = falhas = 0
    for k in casos:
        corpo = {"importance": "high" if k.get("importante") else "normal"}
        if simular:
            print(f"  ⭐ levaria {k['todo_task_id'][:12]}… ({k.get('origem_lista')}): {corpo}")
            continue
        lid = listas.get(k.get("origem_lista"))
        try:
            if not lid:
                raise LookupError("lista não encontrada")
            graph_client._req("PATCH", f"/me/todo/lists/{lid}/tasks/{k['todo_task_id']}", corpo)
        except Exception:                           # noqa: BLE001 — a tarefa sumiu ou mudou de lista
            falhas += 1
            continue
        _rest("PATCH", f"/rest/v1/casos?id=eq.{k['id']}", {"todo_importante": bool(k.get("importante"))},
              prefer="return=minimal")
        feitos += 1
    if casos:
        print(f"ponte da ⭐: {feitos} tarefa(s) com a estrela do CRM" + (f", {falhas} não encontrada(s)" if falhas else "")
              + (" (simulação)" if simular else ""))


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
    estrelas = estrelas_a_levar(_rest("GET", "/rest/v1/casos?todo_task_id=not.is.null&fase=neq.encerrado"
                                      "&or=(importante.is.true,todo_importante.is.true)"
                                      "&select=id,todo_task_id,origem_lista,importante,todo_importante") or [],
                                {k["id"] for k in alvo})[:LIMITE]
    if not alvo and not estrelas:
        print("ponte do despacho: nada a levar ao To Do.")
        return 0
    import graph_client
    listas = {l.get("displayName"): l["id"] for l in graph_client.list_lists()}
    levar_estrelas(estrelas, listas, graph_client, simular)
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
        muda = {"ronda": ronda}
        if desp.get("todo") == hoje:
            muda["todo_importante"] = bool(k.get("importante"))   # a ⭐ foi junto ao To Do
        _rest("PATCH", f"/rest/v1/casos?id=eq.{k['id']}", muda, prefer="return=minimal")
    print(f"ponte do despacho: {feitos} tarefa(s) atualizada(s) no To Do"
          + (f", {falhas} não encontrada(s)" if falhas else "") + ("" if not simular else " (simulação)"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
