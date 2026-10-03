"""E4 · Auditoria To Do × CRM (29.09.2026).

Compara a leitura do To Do desta rodada (crm/data/crm.json, saída do
sync_todo.py) com o que o CRM tem, lista por lista e cliente por cliente, e
grava cada diferença em `todo_auditoria` e o resumo em config_app
(chave auditoria_todo). Roda na rodada das 06h50 e pelo botão do CRM:

    python3 crm/auditoria_todo.py        # exige SUPABASE_URL e SUPABASE_SERVICE_KEY

A régua é o próprio migrar.py: o que o mapear() produz a partir do To Do é o
que o CRM deveria ter. O banco manda só o necessário (crm_auditoria_extrato,
em crm/fase2/schema_auditoria.sql), com marcas de 10 caracteres no lugar dos
textos. O repositório é público: o log desta auditoria tem só números.
"""
import collections, datetime, hashlib, json, os, pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ / "crm" / "fase2"))
import migrar  # noqa: E402

ENTRADA = RAIZ / "crm" / "data" / "crm.json"
SO_CRM = "(só no CRM)"
# listas cujas tarefas novas o migrar.py não transforma em caso, por regra
SEM_CASO_POR_REGRA = {"💵 Pagamentos", "🙋 Escritório"}


def marca(dia, texto):
    """A mesma marca do banco: md5 de 'AAAA-MM-DD|texto', 10 caracteres."""
    return hashlib.md5(f"{dia}|{texto}".encode()).hexdigest()[:10]


def marca_titulo(titulo):
    return hashlib.md5((titulo or "").encode()).hexdigest()[:10]


def comparar(dados, ext):
    """(crm.json, extrato do banco) -> (linhas de diferença, resumo). Sem rede."""
    mapa = migrar.mapear(dados)
    linhas = []
    resumo = {"listas": {}, "tipos": collections.Counter(),
              "fora_do_crm": dict(mapa.get("pulados") or {}),
              "planejado": {"todo_com_data": 0, "crm_mesma_data": 0}}

    def lista_de(nome):
        return resumo["listas"].setdefault(nome, {"abertas": 0, "com_data": 0,
                                                  "divergencias": 0, "tipos": {}})

    def diverge(lista, tipo, no_todo=None, no_crm=None, **ids):
        l = {"lista": lista, "tipo": tipo, "no_todo": None if no_todo is None else str(no_todo),
             "no_crm": None if no_crm is None else str(no_crm)}
        l.update({k: v for k, v in ids.items() if v})
        linhas.append(l)
        resumo["tipos"][tipo] += 1
        ls = lista_de(lista)
        ls["divergencias"] += 1
        ls["tipos"][tipo] = ls["tipos"].get(tipo, 0) + 1

    # ── o que o banco tem ────────────────────────────────────────────────
    casos_banco = {}          # todo_task_id -> dict
    so_no_crm = []
    for kid, tid, cid, fase, origem, prazo, imp in ext.get("casos") or []:
        k = {"id": kid, "todo_task_id": tid, "cliente_id": cid, "fase": fase,
             "origem_lista": origem, "prazo": prazo, "importante": bool(imp)}
        if tid:
            casos_banco[tid] = k
        elif fase != "encerrado":
            so_no_crm.append(k)
    anot = {k: collections.Counter(v) for k, v in (ext.get("anotacoes") or {}).items()}
    anot_app = {k: set(v) for k, v in (ext.get("anotacoes_app") or {}).items()}
    subt = {k: v for k, v in (ext.get("subtarefas") or {}).items()}
    part = {i: (p, c) for i, p, c in ext.get("particulares") or []}
    parc = {i: (s, c) for i, s, c in ext.get("parcelas") or []}
    lemb_por_task, lemb_por_origem = {}, {}
    for lid, tid, prox, ativo, n_anot, origem, cid in ext.get("lembretes") or []:
        l = {"id": lid, "proximo_em": prox, "ativo": ativo, "n": n_anot, "cliente_id": cid}
        if tid:
            lemb_por_task[tid] = l
        if origem:
            lemb_por_origem[origem] = l
    clientes = set(ext.get("clientes") or [])
    fora = {cpf: cid for cpf, cid in ext.get("clientes_fora") or []}

    def cliente_no_crm(cpf):
        if not cpf:
            return None
        cid = fora.get(cpf) or migrar.uid("cliente", "cpf", cpf)
        return cid if cid in clientes else None

    tarefas = {t["id"]: t for t in dados.get("tarefas") or []}
    lidas = set(tarefas)

    # ── casos: uma tarefa das listas de casos = um caso ──────────────────
    blocos = collections.defaultdict(collections.Counter)   # id do mapa -> marcas
    for a in mapa.get("andamentos") or []:
        blocos[a["caso_id"]][marca(a["_dia"], a["texto"])] += 1
    subs = collections.defaultdict(dict)                     # id do mapa -> {marca: feito}
    for s in mapa.get("tarefas") or []:
        if s.get("caso_id"):
            subs[s["caso_id"]][marca_titulo(s["titulo"])] = bool(s.get("concluida"))

    for k in mapa.get("casos") or []:
        tid, lista = k["todo_task_id"], k["origem_lista"]
        tf = tarefas.get(tid) or {}
        aberta = k["fase"] != "encerrado"
        if aberta:
            lista_de(lista)["abertas"] += 1
            if tf.get("prazo"):
                lista_de(lista)["com_data"] += 1
                resumo["planejado"]["todo_com_data"] += 1
        b = casos_banco.get(tid)
        ids = {"todo_task_id": tid, "cliente_id": (b or {}).get("cliente_id") or cliente_no_crm(tf.get("cpf"))}
        if not b:
            if aberta:
                sem_nome = {} if ids["cliente_id"] else {"titulo": migrar.sem_cpf(tf.get("titulo"))}
                diverge(lista, "sem_caso_por_regra" if lista in SEM_CASO_POR_REGRA else "caso_ausente",
                        no_todo=tf.get("prazo"), **ids, **sem_nome)
            continue
        ids["caso_id"] = b["id"]
        if b["fase"] != k["fase"]:
            diverge(lista, "fase", no_todo=k["fase"], no_crm=b["fase"], **ids)
        if not aberta:
            continue                    # tarefa concluída: basta o caso encerrado
        if b["origem_lista"] != lista:
            diverge(lista, "lista", no_todo=lista, no_crm=b["origem_lista"], **ids)
        if (b["prazo"] or None) != (k["prazo"] or None):
            diverge(lista, "retorno", no_todo=k["prazo"], no_crm=b["prazo"], **ids)
        elif k["prazo"]:
            resumo["planejado"]["crm_mesma_data"] += 1
        if b["importante"] != bool(k["importante"]):
            diverge(lista, "importante", no_todo=k["importante"], no_crm=b["importante"], **ids)
        # anotações: o que o To Do tem e o CRM não, o que o CRM tem a mais e o repetido
        no_todo = blocos.get(k["id"], collections.Counter())
        no_crm = anot.get(b["id"], collections.Counter())
        app = anot_app.get(b["id"], set())
        faltam = sum(1 for m in no_todo if m not in no_crm and m not in app)
        sobram = sum(1 for m in no_crm if m not in no_todo)
        repetidas = sum(n - 1 for n in no_crm.values() if n > 1)
        if faltam or sobram or repetidas:
            diverge(lista, "anotacoes", no_todo=sum(no_todo.values()), no_crm=sum(no_crm.values()),
                    **ids, detalhe=f"faltam {faltam} · a mais {sobram} · repetidas {repetidas}")
        # subtarefas do checklist (as que o migrar.py transforma em tarefa)
        s_crm = {}
        for h, feito in subt.get(b["id"]) or []:
            s_crm[h] = bool(feito) or s_crm.get(h, False)
        s_todo = subs.get(k["id"], {})
        faltam_s = [h for h in s_todo if h not in s_crm]
        marcacao = [h for h in s_todo if h in s_crm and s_crm[h] != s_todo[h]]
        if faltam_s or marcacao:
            diverge(lista, "subtarefas", no_todo=len(s_todo),
                    no_crm=sum(1 for h in s_todo if h in s_crm), **ids,
                    detalhe=f"faltam {len(faltam_s)} · marcação diferente {len(marcacao)}")

    # ── 💵 parcelas: cada item do checklist é uma parcela ────────────────
    do_todo = set()
    concluidas_abertas = 0
    task_do_caso = {k["id"]: k["todo_task_id"] for k in mapa.get("casos") or []}
    for p in mapa.get("pagamentos") or []:
        iid = p["todo_item_id"]
        do_todo.add(iid)
        tid = task_do_caso.get(p["caso_id"])
        tf = tarefas.get(tid) or {}
        if tf.get("concluida") and p["status"] == "aberto":
            concluidas_abertas += 1
        ids = {"todo_task_id": tid, "cliente_id": cliente_no_crm(tf.get("cpf"))}
        b = parc.get(iid)
        if not b:
            diverge("💵 Pagamentos", "parcela_ausente", no_todo=p["status"], **ids)
        elif b[0] != p["status"]:
            diverge("💵 Pagamentos", "parcela_situacao", no_todo=p["status"], no_crm=b[0], **ids)
    for iid, (status, cid) in parc.items():
        if iid not in do_todo:
            diverge("💵 Pagamentos", "parcela_a_mais", no_crm=status, cliente_id=cid)
    resumo["parcelas_abertas_de_tarefa_concluida"] = concluidas_abertas

    # ── 🙏 lembretes: tarefa de Aposentadorias Futuras = lembrete ────────
    for l in mapa.get("lembretes") or []:
        tid = l["detalhes"]["todo_task_id"]
        tf = tarefas.get(tid) or {}
        lista = tf.get("lista") or "🙏 Aposentadorias Futuras"
        if l["ativo"]:
            lista_de(lista)["abertas"] += 1
            if l["proximo_em"]:
                lista_de(lista)["com_data"] += 1
                resumo["planejado"]["todo_com_data"] += 1
        ids = {"todo_task_id": tid, "cliente_id": cliente_no_crm(tf.get("cpf"))}
        b = lemb_por_task.get(tid)
        if not b:
            caso_antigo = (casos_banco.get(tid) or {}).get("id")
            if caso_antigo and caso_antigo in lemb_por_origem:
                continue                 # virou lembrete à mão no CRM: o CRM manda nele
            if l["ativo"]:
                sem_nome = {} if ids["cliente_id"] else {"titulo": migrar.sem_cpf(tf.get("titulo"))}
                diverge(lista, "lembrete_ausente", no_todo=l["proximo_em"], **ids, **sem_nome)
            continue
        ids.update(lembrete_id=b["id"], cliente_id=b["cliente_id"] or ids["cliente_id"])
        if bool(b["ativo"]) != bool(l["ativo"]):
            diverge(lista, "lembrete_ativo", no_todo=l["ativo"], no_crm=b["ativo"], **ids)
            continue                    # o resto só faz sentido com os dois ligados
        if not l["ativo"]:
            continue
        if (b["proximo_em"] or None) != (l["proximo_em"] or None):
            diverge(lista, "lembrete_data", no_todo=l["proximo_em"], no_crm=b["proximo_em"], **ids)
        elif l["proximo_em"]:
            resumo["planejado"]["crm_mesma_data"] += 1
        n_todo = len(l["detalhes"]["anotacoes"])
        if b["n"] != n_todo:
            diverge(lista, "lembrete_anotacoes", no_todo=n_todo, no_crm=b["n"], **ids)

    # ── tarefas particulares (lista "Tarefas" do To Do) ──────────────────
    for s in mapa.get("tarefas") or []:
        if not s.get("particular_de"):
            continue
        lista = migrar.LISTA_PARTICULAR
        if not s["concluida"]:
            lista_de(lista)["abertas"] += 1
            if s["prazo"]:
                lista_de(lista)["com_data"] += 1
                resumo["planejado"]["todo_com_data"] += 1
        b = part.get(s["id"])
        if not b:
            if not s["concluida"]:
                diverge(lista, "particular_ausente", no_todo=s["prazo"])
            continue
        if bool(b[1]) != bool(s["concluida"]):
            diverge(lista, "particular_concluida", no_todo=s["concluida"], no_crm=b[1])
        elif not s["concluida"]:
            if (b[0] or None) != (s["prazo"] or None):
                diverge(lista, "particular_data", no_todo=s["prazo"], no_crm=b[0])
            elif s["prazo"]:
                resumo["planejado"]["crm_mesma_data"] += 1

    # ── o que só o CRM tem ───────────────────────────────────────────────
    for k in so_no_crm:
        diverge(k["origem_lista"] or SO_CRM, "so_no_crm", no_crm=k["fase"],
                caso_id=k["id"], cliente_id=k["cliente_id"])
    for tid, k in casos_banco.items():
        if k["fase"] != "encerrado" and tid not in lidas:
            diverge(k["origem_lista"] or SO_CRM, "tarefa_sumiu", no_crm=k["fase"],
                    caso_id=k["id"], cliente_id=k["cliente_id"], todo_task_id=tid)

    resumo["tipos"] = dict(resumo["tipos"])
    resumo["total"] = len(linhas)
    return linhas, resumo


def _rest(metodo, caminho, corpo=None, prefer=None):
    url = os.environ["SUPABASE_URL"].strip().rstrip("/")
    chave = os.environ["SUPABASE_SERVICE_KEY"].strip()
    return migrar._rest(url, chave, metodo, caminho, corpo, prefer)


def main():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    dados = json.loads(ENTRADA.read_text(encoding="utf-8"))
    if len(dados.get("tarefas") or []) < 50:
        # leitura incompleta do To Do não pode virar "o CRM tem tudo a mais"
        sys.exit("leitura do To Do incompleta: auditoria não gravada")
    ext = _rest("POST", "/rest/v1/rpc/crm_auditoria_extrato", {})
    linhas, resumo = comparar(dados, ext)
    rodada = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    for l in linhas:
        l["rodada"] = rodada
    campos = ("rodada", "lista", "tipo", "todo_task_id", "caso_id", "cliente_id",
              "lembrete_id", "titulo", "detalhe", "no_todo", "no_crm")
    uniformes = [{c: l.get(c) for c in campos} for l in linhas]   # o PostgREST exige as mesmas chaves
    for i in range(0, len(uniformes), 500):
        _rest("POST", "/rest/v1/todo_auditoria", uniformes[i:i + 500], prefer="return=minimal")
    # só depois da nova gravada sai a anterior: o painel nunca fica vazio
    _rest("DELETE", f"/rest/v1/todo_auditoria?rodada=lt.{rodada.replace('+', '%2B')}", prefer="return=minimal")
    resumo["em"] = rodada
    _rest("POST", "/rest/v1/config_app",
          [{"chave": "auditoria_todo", "valor": json.dumps(resumo, ensure_ascii=False)}],
          prefer="resolution=merge-duplicates,return=minimal")
    # repositório público: só números no log
    print(f"auditoria gravada: {resumo['total']} diferença(s)")
    for tipo, n in sorted(resumo["tipos"].items(), key=lambda x: -x[1]):
        print(f"  {tipo}: {n}")
    p = resumo["planejado"]
    print(f"  Planejado: {p['crm_mesma_data']} de {p['todo_com_data']} tarefas com data iguais no CRM")


if __name__ == "__main__":
    main()
