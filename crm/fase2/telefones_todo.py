"""Leva ao cadastro do cliente os telefones anotados no checklist do To Do.

    python graph_refresh.py                          # token da Microsoft (a partir do banco)
    python crm/fase2/telefones_todo.py               # só mostra o que faria
    python crm/fase2/telefones_todo.py --aplicar     # grava no CRM
    python crm/fase2/telefones_todo.py --teste       # prova das regras, sem rede

Por que existe: o vínculo do WhatsApp com a ficha é pelo telefone do cadastro,
e só 590 de 2.001 clientes tinham telefone. O escritório anota os números no
checklist da tarefa do To Do, de jeitos que a migração não lia ("016 99711-2233",
"16 99711 2233 filha", "Maria (filha) 16997112233") e ela guardava só o primeiro.

Regras (pedido do Paulo): DDD 16 é quase sempre o WhatsApp do cliente; pode
haver mais de um, e o que vem com parentesco escrito ao lado é de parente. O
número principal (clientes.telefone, o que o WhatsApp usa para achar a ficha)
só é preenchido quando está vazio — nada que a equipe já cadastrou é trocado.
Os demais entram na lista de telefones da ficha, com o que estava escrito ao
lado como observação. Para rodar precisa de SUPABASE_URL e SUPABASE_SERVICE_KEY.
"""
import json, os, pathlib, re, sys, urllib.request

RAIZ = pathlib.Path(__file__).resolve().parents[2]
SAIDA = RAIZ / "crm" / "data" / "telefones_todo.csv"   # crm/data/ está no .gitignore

# Telefone dentro de um texto qualquer. Com separador vale fixo ou celular;
# só dígitos colados vale apenas celular (o 9 na frente), para não confundir
# com protocolo, NB ou CPF — que também moram no checklist.
RE_FMT = re.compile(r"(?<![\d])(?:\+?55[\s.\-]*)?\(?0?(\d{2})\)?[\s.\-]+(9?[\s.]?\d{4})[\s.\-]?(\d{4})(?![\d])")
RE_COLADO = re.compile(r"(?<![\d])(?:55)?0?(\d{2})(9\d{8})(?![\d])")
# os DDDs que existem: o resto é protocolo ou pedaço de número
DDDS = {11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,
        51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,
        93,94,95,96,97,98,99}
# rótulo que não diz de quem é o número
ROTULO = re.compile(r"^(tel(efone)?|cel(ular)?|fone|whats(app)?|zap|wpp|contato|n[ºo°]?|numero|número|e|ou)\s*\d?[\s.:]*$", re.I)
PARENTESCO = re.compile(
    r"\b(espos[ao]|marido|mulher|companheir[ao]|irm[ãa]o?|m[ãa]e|pai|filh[ao]|amig[ao]|"
    r"ti[ao]|sogr[ao]|cunhad[ao]|vizinh[ao]|nor[ao]|genro|net[ao]|sobrinh[ao]|primo|prima|"
    r"parente|recado|patr[ãa]o|vó|avó|avô|enteado|enteada)\b", re.I)


def telefones_do_texto(txt):
    """[(numero com DDD, observação)] de um item do checklist."""
    achados = []
    for rx in (RE_FMT, RE_COLADO):
        for m in rx.finditer(txt or ""):
            ddd, resto = m.group(1), re.sub(r"\D", "", "".join(m.groups()[1:]))
            if int(ddd) not in DDDS or len(resto) not in (8, 9) or (len(resto) == 9 and resto[0] != "9"):
                continue
            achados.append((m.span(), ddd + resto))
    if not achados:
        return []
    achados.sort()
    # a observação de cada número é o texto logo DEPOIS dele (até o próximo
    # número); sem nada depois, o texto logo ANTES ("Maria (filha) 1699…")
    vistos, saida = set(), []
    for i, ((a, b), n) in enumerate(achados):
        fim = achados[i + 1][0][0] if i + 1 < len(achados) else len(txt)
        ini = achados[i - 1][0][1] if i else 0
        obs = _limpar(txt[b:fim]) or _limpar(txt[ini:a])
        if n[-8:] not in vistos:
            vistos.add(n[-8:]); saida.append((n, obs))
    return saida


def _limpar(obs):
    obs = re.sub(r"\s+", " ", re.sub(r"^[\s\-–:;,./]+|[\s\-–:;,./]+$", "", obs)).strip()
    if obs.count("(") != obs.count(")"):        # sobra de "(16) 9…": parêntese órfão
        obs = obs.replace("(", "").replace(")", "").strip()
    obs = re.sub(r"^\(([^()]*)\)$", r"\1", obs).strip()
    return "" if ROTULO.match(obs) else obs


def chave(n):
    return re.sub(r"\D", "", n or "")[-8:]


def de_parente(obs):
    return bool(PARENTESCO.search(obs or ""))


def ddd_valido(n):
    d = re.sub(r"\D", "", n or "").lstrip("0")
    d = d[2:] if d.startswith("55") and len(d) > 11 else d
    return len(d) in (10, 11) and int(d[:2]) in DDDS


def montar_lista(atual_principal, atual_lista, novos):
    """Junta o que a ficha já tem com o que veio do To Do. Devolve
    (principal, lista) — principal só muda se estava vazio ou com DDD que não
    existe (sobra da migração antiga, que vai para a lista como "conferir")."""
    lista = [dict(t) for t in (atual_lista or []) if chave(t.get("numero"))]
    if atual_principal and not ddd_valido(atual_principal):
        for t in lista:
            if chave(t["numero"]) == chave(atual_principal):
                t["obs"], t["zap"] = "conferir", False
        if chave(atual_principal) not in {chave(t["numero"]) for t in lista}:
            lista.insert(0, {"numero": atual_principal, "obs": "conferir", "zap": False})
        atual_principal = None
    if atual_principal and chave(atual_principal) not in {chave(t["numero"]) for t in lista}:
        lista.insert(0, {"numero": atual_principal, "obs": "principal", "zap": not any(t.get("zap") for t in lista)})
    tem = {chave(t["numero"]) for t in lista}
    for n, obs in novos:
        if chave(n) not in tem:
            tem.add(chave(n)); lista.append({"numero": n, "obs": obs, "zap": False})
    principal = atual_principal
    if not principal:
        # o WhatsApp do cliente: DDD 16 sem parentesco ao lado; senão DDD 16; senão o primeiro
        cand = ([t for t in lista if t["numero"].startswith("16") and not de_parente(t["obs"])]
                or [t for t in lista if t["numero"].startswith("16")] or lista)
        principal = cand[0]["numero"] if cand else None
    if principal and not any(t.get("zap") for t in lista):
        for t in lista:
            t["zap"] = chave(t["numero"]) == chave(principal)
    return principal, lista


# ── rede ──────────────────────────────────────────────────────────────────
def _sb(caminho, metodo="GET", corpo=None):
    base = os.environ["SUPABASE_URL"].rstrip("/"); k = os.environ["SUPABASE_SERVICE_KEY"]
    h = {"apikey": k, "Authorization": f"Bearer {k}", "Content-Type": "application/json", "Prefer": "return=minimal"}
    req = urllib.request.Request(base + "/rest/v1/" + caminho, method=metodo, headers=h,
                                 data=json.dumps(corpo).encode() if corpo is not None else None)
    with urllib.request.urlopen(req, timeout=60) as r:
        t = r.read()
        return json.loads(t) if t else None


def _todas(tabela, select):
    saida, ini = [], 0
    while True:
        lote = _sb(f"{tabela}?select={select}&order=id&offset={ini}&limit=1000")
        saida += lote; ini += 1000
        if len(lote) < 1000:
            return saida


def principal(aplicar):
    sys.path.insert(0, str(RAIZ)); sys.path.insert(0, str(RAIZ / "crm"))
    os.chdir(RAIZ)                       # graph_client lê graph_tokens.json da raiz
    from sync_todo import carregar_graph
    tarefas = [t for _, ts in carregar_graph() for t in ts]
    caso_cli = {k["todo_task_id"]: k["cliente_id"] for k in _todas("casos", "id,todo_task_id,cliente_id") if k.get("todo_task_id")}
    clientes = {c["id"]: c for c in _todas("clientes", "id,nome,telefone,telefones")}

    novos = {}                           # cliente_id -> [(numero, obs)]
    sem_cliente = 0
    for t in tarefas:
        itens = [i.get("displayName", "") for i in (t.get("checklistItems") or [])]
        achados = [x for i in itens for x in telefones_do_texto(i)]
        if not achados:
            continue
        cid = caso_cli.get(t.get("id"))
        if not cid or cid not in clientes:
            sem_cliente += 1; continue
        novos.setdefault(cid, []).extend(achados)

    mudancas = []
    for cid, ach in novos.items():
        c = clientes[cid]
        lista_atual = c.get("telefones") if isinstance(c.get("telefones"), list) else []
        p, lista = montar_lista(c.get("telefone"), lista_atual, ach)
        if p != c.get("telefone") or lista != lista_atual:
            mudancas.append((c, p, lista))

    ganhou_principal = sum(1 for c, p, _ in mudancas if p and not c.get("telefone"))
    extras = sum(max(0, len(l) - len(c.get("telefones") or []) - (0 if c.get("telefone") else 0)) for c, _, l in mudancas)
    print(f"tarefas lidas: {len(tarefas)} · com telefone no checklist: {sum(len(v) for v in novos.values()) and len(novos)} cliente(s)"
          f" · tarefas com telefone sem cliente no CRM: {sem_cliente}")
    print(f"clientes que mudam: {len(mudancas)} · ganham telefone principal: {ganhou_principal}"
          f" · telefones novos na lista: {extras}")
    antes = sum(1 for c in clientes.values() if chave(c.get("telefone")))
    print(f"clientes com telefone principal: {antes} → {antes + ganhou_principal} de {len(clientes)}")

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    with SAIDA.open("w", encoding="utf-8") as f:
        f.write("cliente;principal_antes;principal_depois;lista_depois\n")
        for c, p, l in mudancas:
            f.write(f"{c['nome']};{c.get('telefone') or ''};{p or ''};"
                    + " | ".join(f"{t['numero']}{' ('+t['obs']+')' if t['obs'] else ''}{' [zap]' if t.get('zap') else ''}" for t in l) + "\n")
    print(f"detalhe por cliente: {SAIDA.relative_to(RAIZ)}")

    if not aplicar:
        print("nada foi gravado (rode com --aplicar para gravar)")
        return
    # o antes de cada cliente, para desfazer se for preciso
    bkp = SAIDA.with_name("telefones_todo_antes.json")
    bkp.write_text(json.dumps([{"id": c["id"], "telefone": c.get("telefone"), "telefones": c.get("telefones")}
                               for c, _, _ in mudancas], ensure_ascii=False), encoding="utf-8")
    print(f"cópia do antes: {bkp.relative_to(RAIZ)}")
    for i, (c, p, l) in enumerate(mudancas, 1):
        _sb(f"clientes?id=eq.{c['id']}", "PATCH", {"telefone": p, "telefones": l})
        if i % 100 == 0:
            print(f"  {i}/{len(mudancas)} gravados", flush=True)
    print(f"gravado: {len(mudancas)} cliente(s)")


def teste():
    assert telefones_do_texto("16 99711-2233") == [("16997112233", "")]
    assert telefones_do_texto("016 99711 2233 filha") == [("16997112233", "filha")]
    assert telefones_do_texto("Maria (filha) 16997112233") == [("16997112233", "Maria (filha)")]
    assert telefones_do_texto("(11) 3456-7890 recado") == [("1134567890", "recado")]
    assert telefones_do_texto("016997112233") == [("16997112233", "")]
    assert telefones_do_texto("+55 16 99711-2233") == [("16997112233", "")]
    assert telefones_do_texto("Protocolo 1234567890") == []          # colado sem 9: não é telefone
    assert telefones_do_texto("123.456.789-09") == []                # CPF
    # dois números no mesmo item: o parentesco fica com o número a que se refere
    assert telefones_do_texto("16 99711-2233 / 16 98888-7777 esposa") == [("16997112233", ""), ("16988887777", "esposa")]    # vazio: o DDD 16 sem parentesco vira o principal e o WhatsApp
    p, l = montar_lista(None, [], [("16988887777", "filha"), ("16997112233", "")])
    assert p == "16997112233" and [t["zap"] for t in l] == [False, True]
    # já tinha principal: não troca, só acrescenta
    p, l = montar_lista("(16) 99999-0000", [], [("16997112233", "")])
    assert p == "(16) 99999-0000" and len(l) == 2 and l[0]["zap"] and not l[1]["zap"]
    # repetido não entra de novo
    p, l = montar_lista("16997112233", [{"numero": "16997112233", "obs": "principal", "zap": True}], [("016 99711-2233", "")])
    assert len(l) == 1
    assert telefones_do_texto("Tel: 16 99711-2233") == [("16997112233", "")]
    assert telefones_do_texto("20 3456-7890") == []                   # DDD 20 não existe
    # principal antigo com DDD inexistente: sai, fica na lista para conferir
    p, l = montar_lista("1012345689", [], [("16997112233", "")])
    assert p == "16997112233" and l[0]["obs"] == "conferir" and not l[0]["zap"] and l[1]["zap"]
    print("telefones_todo.py: regras ok")


if __name__ == "__main__":
    if "--teste" in sys.argv:
        teste()
    else:
        principal("--aplicar" in sys.argv)
