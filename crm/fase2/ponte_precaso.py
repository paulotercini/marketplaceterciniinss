"""F602 · a ponte do pré-caso: CRM -> To Do.

O pré-caso espelha a lista da tarefa no To Do (🙋 Escritório = Ativo,
🙏 Aposentadorias Futuras = Futuro, concluída = Arquivo, lista de fase = caso).
O botão do CRM grava casos.mover_para; esta ponte leva a tarefa à lista nova:
cria a tarefa na lista de destino (título, corpo, ⭐, data e etapas), confere
que ela existe e só então apaga a antiga. Arquivo conclui a tarefa; voltar da
Arquivo para a mesma lista a reabre. Cada movimento vai a
config_app.todo_movimentos e menciona o Paulo, que cuida do acervo.

    python3 crm/fase2/ponte_precaso.py            # leva os movimentos pendentes
    python3 crm/fase2/ponte_precaso.py --simular  # só mostra o que faria

Desliga com PONTE_PRECASO=0. Exige SUPABASE_URL e SUPABASE_SERVICE_KEY, e o graph_tokens.json.
"""
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ponte_cards import RAIZ  # noqa: E402
from migrar import (APOS_LISTAS, LISTA_FASE, uid, _rest,  # noqa: E402
                    _cfg_ler, _cfg_gravar, _paulo_id, _mencionar)

sys.path.insert(0, str(RAIZ))
LIMITE = 30            # por rodada: um engano não se espalha pela lista inteira
ESCR = "🙋 Escritório"
MOV_MAX = 300          # movimentos guardados em config_app.todo_movimentos


def pendentes(casos):
    """O pré-caso (ou caso que nasceu dele) com mover_para que a ponte ainda não tentou."""
    return [k for k in casos or []
            if k.get("mover_para") and k.get("precaso") is not None
            and not (k.get("precaso") or {}).get("ponte_falha")]


def acao(k):
    """concluir, reabrir, mover ou nada."""
    alvo, tid = k["mover_para"], k.get("todo_task_id")
    if alvo == "concluir":
        return "concluir" if tid else "nada"
    if tid and k.get("origem_lista") == alvo:
        return "reabrir"
    return "mover"


def patch_do_caso(k, alvo, novo_tid):
    """O que muda na linha depois de mover a tarefa."""
    p = {x: y for x, y in (k.get("precaso") or {}).items() if x not in ("ponte_falha", "arquivo")}
    muda = {"todo_task_id": novo_tid, "origem_lista": alvo, "mover_para": None}
    if alvo in APOS_LISTAS:
        p.update(so_lembrete=True, lembrete_id=uid("lembrete", novo_tid))
        muda.update(fase="encerrado", pre_caso=True)
    elif alvo == ESCR:
        p.pop("so_lembrete", None)
        p.pop("lembrete_id", None)
        muda.update(fase="escritorio", pre_caso=True, encerrado_em=None)
    else:
        p.pop("so_lembrete", None)
        p.pop("lembrete_id", None)
        muda.update(fase=LISTA_FASE.get(alvo) or k.get("fase"), pre_caso=False, encerrado_em=None)
    muda["precaso"] = p
    return muda


def lembrete_do_card(k, novo_tid):
    """A linha do card das Aposentadorias futuras, com o mesmo id que a sincronização dará."""
    p = k.get("precaso") or {}
    crm = {"etapa": "monitorando"}
    if p.get("data_direito"):
        crm.update(data_direito=p["data_direito"], data_fonte="crm")
    return {"id": uid("lembrete", novo_tid), "cliente_id": k["cliente_id"],
            "tipo": "aposentadoria_futura",
            "titulo": k.get("beneficio") or "Aposentadoria futura",
            "detalhes": {"todo_task_id": novo_tid, "beneficio": k.get("beneficio")},
            "ativo": True, "crm": crm}


def _copia_tarefa(t, titulo):
    """O corpo da tarefa nova a partir da antiga (ou do nome do cliente, se não havia)."""
    corpo = {"title": (t or {}).get("title") or titulo,
             "body": (t or {}).get("body") or {"content": "", "contentType": "text"},
             "importance": (t or {}).get("importance") or "normal"}
    if (t or {}).get("dueDateTime"):
        corpo["dueDateTime"] = t["dueDateTime"]
    return corpo


def mover(gc, listas, k, titulo):
    """Cria a tarefa na lista nova, confere e apaga a antiga. Devolve o id novo."""
    alvo, tid = k["mover_para"], k.get("todo_task_id")
    lid_novo = listas.get(alvo)
    if not lid_novo:
        raise LookupError(f"lista {alvo} não encontrada")
    lid_velho = listas.get(k.get("origem_lista")) if tid else None
    velha, itens = None, []
    if lid_velho:
        velha = gc.get_task(lid_velho, tid)
        itens = (gc._req("GET", f"/me/todo/lists/{lid_velho}/tasks/{tid}/checklistItems") or {}).get("value") or []
    nova = gc._req("POST", f"/me/todo/lists/{lid_novo}/tasks", _copia_tarefa(velha, titulo))
    nid = nova["id"]
    for it in itens:
        gc._req("POST", f"/me/todo/lists/{lid_novo}/tasks/{nid}/checklistItems",
                {"displayName": it.get("displayName") or "", "isChecked": bool(it.get("isChecked"))})
    if not (gc.get_task(lid_novo, nid) or {}).get("id"):
        raise RuntimeError("tarefa nova não confirmada")
    if lid_velho:
        gc._req("DELETE", f"/me/todo/lists/{lid_velho}/tasks/{tid}")
    return nid


def main(argv):
    if os.environ.get("PONTE_PRECASO") == "0":
        print("ponte do pré-caso desligada (PONTE_PRECASO=0). Nada foi enviado.")
        return 0
    url, chave = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not chave:
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    simular = "--simular" in argv
    casos = _rest(url, chave, "GET", "/rest/v1/casos?mover_para=not.is.null&precaso=not.is.null"
                  "&select=id,cliente_id,todo_task_id,origem_lista,mover_para,precaso,beneficio,"
                  "titulo,fase,pre_caso") or []
    alvo = pendentes(casos)[:LIMITE]
    if not alvo:
        print("ponte do pré-caso: nada a levar ao To Do.")
        return 0
    import graph_client as gc
    listas = {l.get("displayName"): l["id"] for l in gc.list_lists()}
    clis = {c["id"]: c for c in _rest(url, chave, "GET", "/rest/v1/clientes?id=in.("
                                      + ",".join(sorted({k["cliente_id"] for k in alvo})) + ")&select=id,nome,cpf") or []}
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    movs, paulo, ok = [], (None if simular else _paulo_id(url, chave)), 0
    for k in alvo:
        a, para, de = acao(k), k["mover_para"], k.get("origem_lista") or "(sem tarefa)"
        c = clis.get(k["cliente_id"]) or {}
        titulo = (c.get("nome") or "Cliente") + (f" #{c['cpf']}" if c.get("cpf") else "")
        if simular:
            print(f"  {a} {k['id'][:8]}…: {de} -> {para}")
            continue
        try:
            if a == "nada":
                muda = {"mover_para": None}
            elif a in ("concluir", "reabrir"):
                lid = listas.get(k["origem_lista"])
                if not lid:
                    raise LookupError("lista não encontrada")
                gc._req("PATCH", f"/me/todo/lists/{lid}/tasks/{k['todo_task_id']}",
                        {"status": "completed" if a == "concluir" else "notStarted"})
                muda = {"mover_para": None}
                if a == "concluir" and k.get("origem_lista") in APOS_LISTAS and (k.get("precaso") or {}).get("lembrete_id"):
                    _rest(url, chave, "PATCH", f"/rest/v1/lembretes?id=eq.{k['precaso']['lembrete_id']}",
                          {"ativo": False}, prefer="return=minimal")
            else:
                nid = mover(gc, listas, k, titulo)
                muda = patch_do_caso(k, para, nid)
                if para in APOS_LISTAS:
                    _rest(url, chave, "POST", "/rest/v1/lembretes", [lembrete_do_card(k, nid)],
                          prefer="resolution=merge-duplicates,return=minimal")
                velho = (k.get("precaso") or {}).get("lembrete_id")
                if velho and k.get("origem_lista") in APOS_LISTAS:
                    _rest(url, chave, "PATCH", f"/rest/v1/lembretes?id=eq.{velho}", {"ativo": False},
                          prefer="return=minimal")
            _rest(url, chave, "PATCH", f"/rest/v1/casos?id=eq.{k['id']}", muda, prefer="return=minimal")
            movs.append({"em": agora, "caso_id": k["id"], "cliente_id": k["cliente_id"], "de": de, "para": para, "ok": True})
            _mencionar(url, chave, paulo, f"To Do: {titulo.split(' #')[0]} passou de {de} para "
                       f"{'Arquivo (concluída)' if para == 'concluir' else para}.", k["id"])
            ok += 1
        except Exception as e:                      # noqa: BLE001 — falha fica marcada, sem repetir a cada rodada
            p = dict(k.get("precaso") or {})
            p["ponte_falha"] = f"{agora}: {type(e).__name__}"
            _rest(url, chave, "PATCH", f"/rest/v1/casos?id=eq.{k['id']}", {"precaso": p}, prefer="return=minimal")
            movs.append({"em": agora, "caso_id": k["id"], "cliente_id": k["cliente_id"], "de": de, "para": para,
                         "ok": False, "erro": type(e).__name__})
    if movs:
        _cfg_gravar(url, chave, "todo_movimentos", (movs + (_cfg_ler(url, chave, "todo_movimentos") or []))[:MOV_MAX])
    print(f"ponte do pré-caso: {ok} de {len(alvo)} movimento(s) levado(s) ao To Do"
          + (" (simulação)" if simular else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
