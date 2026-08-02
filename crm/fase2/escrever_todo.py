"""Fase 2 — escrita de volta no To Do (banco -> Microsoft To Do).

Pega os andamentos criados no app (origem='app', todo_sync=false) e insere
no topo do corpo da tarefa correspondente do To Do, no formato de sempre:

    DD.MM.AAAA (X): texto

Assim, quem ainda trabalha no To Do continua vendo tudo. Rodar junto com o
ciclo de importação (na máquina que tem graph_tokens.json):

    python3 graph_refresh.py
    python3 crm/fase2/escrever_todo.py     # banco -> To Do
    python3 crm/sync_todo.py               # To Do -> crm/data/crm.json
    python3 crm/fase2/migrar.py            # crm/data/crm.json -> banco

Exige env SUPABASE_URL e SUPABASE_SERVICE_KEY. O anti-eco do migrar.py
garante que o texto replicado não volte duplicado na importação seguinte.
"""
import datetime, json, os, pathlib, sys, urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(RAIZ))


# fase do caso -> lista do To Do onde a tarefa deve nascer (inverso do migrar)
FASE_LISTA = {
    "escritorio": "🙋 Escritório",
    "inss": "🌻 INSS",
    "judicial": "👪 Judicial",
    "conselho": "🖥 Conselho de Recursos",
    "pagamento": "💵 Pagamentos",
    "aposentadoria_futura": "🙏 Aposentadorias Futuras",
    "outro": "🗓 Tarefas com Prazo",
}


def fase_para_lista(fase):
    return FASE_LISTA.get(fase, "🙋 Escritório")


def formatar_bloco(data_iso, inicial, texto):
    """'2026-08-02', 'P', 'Petição protocolada.' -> '02.08.2026 (P): Petição protocolada.'"""
    d = data_iso[:10]
    data = f"{d[8:10]}.{d[5:7]}.{d[0:4]}"
    autor = f" ({inicial})" if inicial else ""
    return f"{data}{autor}: {texto.strip()}"


def prepend_corpo(corpo_atual, bloco):
    """Insere o bloco no topo, preservando o resto do corpo."""
    corpo_atual = (corpo_atual or "").strip("\n")
    return bloco + ("\n\n" + corpo_atual if corpo_atual else "")


def _rest(metodo, caminho, corpo=None, prefer=None):
    url = os.environ["SUPABASE_URL"].rstrip("/") + caminho
    chave = os.environ["SUPABASE_SERVICE_KEY"]
    req = urllib.request.Request(
        url,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={"apikey": chave, "Authorization": f"Bearer {chave}",
                 "Content-Type": "application/json",
                 **({"Prefer": prefer} if prefer else {})},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def main():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    import graph_client

    listas_map = {l.get("displayName"): l["id"] for l in graph_client.list_lists()}

    # 1) clientes/casos criados no app ainda sem tarefa no To Do -> criar
    novos = _rest("GET", "/rest/v1/casos"
                         "?todo_task_id=is.null&fase=neq.encerrado"
                         "&select=id,titulo,fase,prazo") or []
    criados = 0
    for k in novos:
        lista_nome = fase_para_lista(k["fase"])
        lista_id = listas_map.get(lista_nome)
        if not lista_id:
            continue
        t = graph_client.create_task(
            lista_id, k["titulo"],
            body_content="Criado pelo CRM.",
            due_date_iso=(k["prazo"] + "T12:00:00") if k.get("prazo") else None)
        _rest("PATCH", f"/rest/v1/casos?id=eq.{k['id']}",
              {"todo_task_id": t["id"], "origem_lista": lista_nome},
              prefer="return=minimal")
        criados += 1
    if criados:
        print(f"tarefas criadas no To Do para clientes novos: {criados}")

    # 2) andamentos escritos no app -> topo do corpo da tarefa
    fila = _rest("GET", "/rest/v1/andamentos"
                        "?origem=eq.app&todo_sync=eq.false"
                        "&select=id,texto,criado_em,autor_id,"
                        "casos(todo_task_id,origem_lista),colaboradores(inicial)"
                        "&order=criado_em.asc")
    if not fila:
        print("nada a replicar.")
        return

    listas = listas_map
    ok = erros = sem_task = 0
    for a in fila:
        caso = a.get("casos") or {}
        task_id = caso.get("todo_task_id")
        lista_id = listas.get(caso.get("origem_lista"))
        if not task_id or not lista_id:
            sem_task += 1     # caso criado fora do To Do: nada a replicar
            _rest("PATCH", f"/rest/v1/andamentos?id=eq.{a['id']}",
                  {"todo_sync": True}, prefer="return=minimal")
            continue
        try:
            atual = graph_client.get_task(lista_id, task_id)
            bloco = formatar_bloco(a["criado_em"],
                                   (a.get("colaboradores") or {}).get("inicial"),
                                   a["texto"])
            graph_client.update_task_body(
                lista_id, task_id,
                prepend_corpo((atual.get("body") or {}).get("content"), bloco))
            _rest("PATCH", f"/rest/v1/andamentos?id=eq.{a['id']}",
                  {"todo_sync": True}, prefer="return=minimal")
            ok += 1
        except Exception as e:      # não travar a fila por uma tarefa com problema
            print(f"  erro em {task_id}: {e}")
            erros += 1
    print(f"replicados={ok} sem_tarefa_todo={sem_task} erros={erros}")


if __name__ == "__main__":
    main()
