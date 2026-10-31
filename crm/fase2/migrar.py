"""Fase 2 — importação/sincronização To Do -> banco (Supabase/PostgreSQL).

Lê o espelho crm/data/crm.json (saída do crm/sync_todo.py) e faz UPSERT no
banco. É idempotente: todos os registros importados têm UUID determinístico
(UUID5 do conteúdo), então rodar de novo nunca duplica — é o caminho de ida
da "escrita dupla" (To Do -> banco); a volta é escrever_todo.py.

Modos:
    python3 crm/fase2/migrar.py                 # REST (Supabase) — exige env:
                                                #   SUPABASE_URL, SUPABASE_SERVICE_KEY
    python3 crm/fase2/migrar.py --sql saida.sql # gera SQL p/ psql (1ª carga, mais rápido)

Mapeamento (decisões de ago/2026):
  - Cada tarefa das listas do fluxo vira um CASO do cliente; a lista vira a
    fase. 💵 Pagamentos vira caso com fase='pagamento' DENTRO do cliente —
    a lista deixa de existir na tela.
  - Tarefa concluída no To Do -> fase='encerrado' (origem_lista preserva de onde veio).
  - Lista pessoal 'Tarefas' -> tarefas particulares do Paulo.
  - Outras listas: só tarefas com CPF entram (fase='outro'); o resto é contado e pulado.
  - Blocos `DD.MM.AAAA (X):` -> andamentos com autor; perícias/audiências -> eventos.
  - Anti-eco: blocos idênticos a andamentos criados no app (mesmo caso, dia e
    texto) são pulados, para a escrita dupla não duplicar.
"""
import argparse, datetime, hashlib, json, os, pathlib, re, sys, unicodedata, urllib.request, urllib.error, uuid

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "data" / "crm.json"

NS = uuid.UUID("5f0aa3f0-90a1-4a4e-9e6b-7a2b1c3d4e5f")  # namespace fixo do CRM

LISTA_FASE = {
    "🙋 Escritório": "escritorio",
    "🌻 INSS": "inss",
    "👪 Judicial": "judicial",
    "🖥 Conselho de Recursos": "conselho",
    "💵 Pagamentos": "pagamento",
    "🙏 Aposentadorias Futuras": "aposentadoria_futura",
    "💡 Petições Iniciais": "peticao_inicial",
    "🗓 Tarefas com Prazo": "outro",
    # ── apelidos sem emoji ────────────────────────────────────────────────
    # O mapa casa a lista pelo nome EXATO. Existem na conta listas com nome
    # quase igual e sem emoji; a tarefa delas entrava com fase "outro" e
    # sumia de todas as listas da barra lateral. Eram 270 casos, 194 ativos.
    # F254 (22.10.2026): as listas "Escritório", "Petição Inicial", "Recurso Administrativo", "Impugnações" e "Audiências"
    # da conta são de MODELOS e roteiros de peça ("Impugnação ao Laudo Pericial", "Análise de PPP"), sem nenhum cliente:
    # saíram do mapa. Sem fase e sem CPF, a tarefa é pulada, e o caso que já estava no banco é encerrado pela faxina.
    "INSS": "inss",
    "Judicial": "judicial",
    "Conselho de Recursos": "conselho",
    "Pagamentos": "pagamento",
    "Aposentadorias Futuras": "aposentadoria_futura",
    "Petições Iniciais": "peticao_inicial",
    "Tarefas com Prazo": "outro",
}
LISTA_PARTICULAR = "Tarefas"        # lista pessoal do To Do -> tarefas do Paulo
DONO_PARTICULAR = "P"
TZ = "-03:00"                        # America/Sao_Paulo (sem DST desde 2019)
RE_PROTOCOLO = re.compile(r"protocolo\D{0,12}(\d{6,})", re.I)

# A senha padrão do escritório NUNCA vai no código (o repositório é público):
# vem do GitHub Secret SENHA_PADRAO_MEUINSS. Item de checklist "Padrão" no
# To Do significa que o cliente usa essa senha no Meu INSS.
SENHA_PADRAO = os.environ.get("SENHA_PADRAO_MEUINSS")

# "Solicitei os documentos: RG; CPF; comprovante" num andamento vira itens
# do Checklist de Documentos Solicitados do caso (inserção única: concluir
# no app não é desfeito pela sincronização seguinte)
RE_DOCS_SOLICITADOS = re.compile(
    r"(?:document\w+\s+solicitad\w+|solicitad\w+[^:\n]{0,40}document\w+|"
    r"solicitei[^:\n]{0,40}document\w+)[^:\n]*:\s*([^\n]+)", re.I)

RE_CPF_FMT = re.compile(r"\b(\d{3})\.?(\d{3})\.?(\d{3})-(\d{2})\b")
# telefone anotado no checklist ("16-99711 2233", "(16) 99711-2233") —
# o separador depois do DDD é obrigatório para não confundir com CPF/protocolo
RE_TEL_ITEM = re.compile(r"^\(?\d{2}\)?[\s.\-]+9?\s?\d{4}[.\-\s]?\d{4}$")
RE_RELACAO = re.compile(
    r"^(espos[ao]|marido|mulher|companheir[ao]|irm[ãa]o?|m[ãa]e|pai|filh[ao]|"
    r"amig[ao]|ti[ao]|sogr[ao]|cunhad[ao]|vizinh[ao]|nor[ao]|genro|net[ao]|"
    r"indicad[ao]\s+por|indica[çc][ãa]o(?:\s+d[eo])?)\b[:\s\-]*", re.I)


def _norm(s):
    return "".join(ch for ch in unicodedata.normalize("NFD", (s or "").lower())
                   if not unicodedata.combining(ch)).strip()


# F296 · Onda E do fluxo do To Do (29.10.2026): a etapa da tarefa é a ficha do cliente. O NB vai ao caso, o parente com
# "#CPF" vira vínculo (e não o CPF do cliente), a senha do gov.br vai às credenciais, e o que não tem campo (CNPJ,
# e-mail, telefone com recado, a data provável da aposentadoria, o parente que não é cliente) vira nota da ficha
RE_NB_ITEM = re.compile(r"^(?:nb|n[º°.]?\s*(?:do\s+)?benef[ií]cio|benef[ií]cio)\b\s*[:\-nº°.]*\s*(\d[\d.\-/ ]{8,14}\d)\s*$", re.I)
RE_NB_FMT = re.compile(r"^\d{3}\.\d{3}\.\d{3}-\d$")
RE_CNPJ = re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/\d{4}-?\d{2}\b")
RE_GOV = re.compile(r"^(?:senha\s+(?:do\s+)?)?(?:gov\.?\s?br|meu\s*inss)\s*[:\-]\s*(\S+)\s*$", re.I)
RE_TEL_EM = re.compile(r"\(?\b\d{2}\)?[\s.\-]+9?\s?\d{4}[.\-\s]?\d{4}\b")
RE_EMAIL = re.compile(r"[\w.+\-]+@[\w\-]+\.[\w.\-]+")
RE_DATA_APOS = re.compile(r"aposent\w*.*?\b(\d{1,2}/\d{1,2}/\d{2,4}|\d{1,2}/\d{4})\b", re.I)


def _parece_data(dig):
    """Oito dígitos que formam uma data DDMMAAAA de 1900 a 2099 (o nascimento escrito sem barras)."""
    if len(dig) != 8:
        return False
    try:
        datetime.date(int(dig[4:]), int(dig[2:4]), int(dig[:2]))
    except ValueError:
        return False
    return 1900 <= int(dig[4:]) <= 2099


def classificar_item_checklist(txt, cpf_cliente=None):
    """O checklist do To Do é onde o escritório guarda dados soltos do cliente.
    Classifica cada item: ('senha_padrao'|'senha'|'cpf'|'telefone'|'protocolo'|
    'parceria'|'nome'|'dado'|'tarefa', valor). 'nome' é só candidato a vínculo —
    o mapear confirma contra a base de clientes; se não bater, vira tarefa."""
    t = (txt or "").strip()
    if not t:
        return ("vazio", None)
    if re.search(r"anivers|nascime", t, re.I):
        return ("dado", None)                      # data de nascimento já é tratada
    if re.fullmatch(r"padr[ãa]o\.?", t, re.I):
        return ("senha_padrao", None)              # senha padrão do escritório
    m = RE_GOV.match(t) or re.match(r"senha\b.*?[:\-\s]\s*(\S+)\s*$", t, re.I)
    if m:
        return ("senha", m.group(1))
    m = RE_NB_ITEM.match(t)
    if m and len(re.sub(r"\D", "", m.group(1))) == 10:
        return ("nb", re.sub(r"\D", "", m.group(1)))
    if RE_NB_FMT.match(t):
        return ("nb", re.sub(r"\D", "", t))
    if RE_CNPJ.search(t):
        return ("nota", ("cnpj", t))
    if RE_EMAIL.search(t):
        return ("nota", ("email", t))
    if RE_DATA_APOS.search(t):
        return ("nota", ("aposentadoria", t))
    m = RE_CPF_FMT.search(t)
    if m:
        # "Filho da Rosmeire Soares Costa #CPF": o CPF é do parente, e não do cliente
        resto = re.sub(r"\b(cpf|n[º°o]?)\b[:.\s]*", " ", (t[:m.start()] + t[m.end():]).replace("#", " "), flags=re.I).strip(" :-")
        mrel = RE_RELACAO.match(resto)
        nome = re.sub(r"^d[aoe]s?\s+", "", resto[mrel.end():].strip() if mrel else resto, flags=re.I).strip(" :-")
        if len(nome.split()) >= 2 and all(re.fullmatch(r"[A-Za-zÀ-ÿ'.]+", p) for p in nome.split()):
            return ("nome", (mrel.group(1).strip().lower() if mrel else None, nome, "".join(m.groups())))
        return ("cpf", "".join(m.groups()))
    if RE_TEL_ITEM.fullmatch(t):
        dig = re.sub(r"\D", "", t)
        if 10 <= len(dig) <= 11:
            return ("telefone", dig)
    m = RE_TEL_EM.search(t)
    if m and re.search(r"[A-Za-zÀ-ÿ]", t):
        dig = re.sub(r"\D", "", m.group(0))
        if 10 <= len(dig) <= 11:
            return ("telefone_nota", (dig, t))      # "16 99711-2233 (filha)": o número e o recado
    if re.fullmatch(r"[\d\s./\-]+", t):            # só números (com separadores)
        dig = re.sub(r"\D", "", t)
        if len(dig) < 6 or (cpf_cliente and dig == cpf_cliente):
            return ("dado", None)
        if len(dig) == 11 and not cpf_cliente:
            return ("cpf", dig)
        if _parece_data(dig):
            return ("dado", None)                  # teste 11.88, DAD-07: "30101977" é o nascimento, e não protocolo
        return ("protocolo", dig)                  # o INSS divulga só o protocolo
    m = re.fullmatch(r"#\s*([A-Za-zÀ-ÿ][\wÀ-ÿ]*)", t)
    if m:
        return ("dado", None) if re.fullmatch(r"[Bb]\d{1,3}", m.group(1)) \
            else ("parceria", m.group(1))
    m = re.match(r"parceria[:\s\-]+(.+)$", t, re.I)
    if m:
        return ("parceria", m.group(1).strip())
    if (re.fullmatch(r"\S{6,20}", t) and re.search(r"[A-Za-zÀ-ÿ]", t)
            and re.search(r"\d", t)):
        return ("senha", t)                        # token solto letra+número = senha anotada
    mrel = RE_RELACAO.match(t)
    resto = t[mrel.end():].strip() if mrel else t
    palavras = resto.split()
    if mrel:
        resto = re.sub(r"^d[aoe]s?\s+", "", resto, flags=re.I)
        palavras = resto.split()
    if 2 <= len(palavras) <= 6 and all(
            re.fullmatch(r"[A-Za-zÀ-ÿ'.]+", p) for p in palavras):
        rel = mrel.group(1).strip().lower() if mrel else None
        return ("nome", (rel, resto, None))        # candidato a parente/amigo
    return ("tarefa", t)


def hora_valida(h):
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", h or "")
    return bool(m) and int(m.group(1)) <= 23 and int(m.group(2)) <= 59


def uid(*partes):
    return str(uuid.uuid5(NS, "|".join(str(p) for p in partes)))


def md5(s):
    return hashlib.md5((s or "").encode()).hexdigest()


RE_CPF_TITULO = re.compile(r"\s*#\s*\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")


def sem_cpf(titulo):
    """Tira o "#CPF" do título do caso (decisão do Paulo, 20.09.2026).

    No To Do o CPF depois do nome é o que amarra a tarefa ao cliente. No CRM
    essa amarração já foi feita, o CPF tem campo próprio na ficha, e repetir
    onze dígitos no título só atrapalha a leitura — e espalha o documento do
    cliente por telas onde ele não precisa estar. O "#B42" fica, porque diz a
    espécie e o CRM ainda lê isso.
    """
    return RE_CPF_TITULO.sub("", titulo or "").strip()


def _cliente_key(t):
    return ("cpf", t["cpf"]) if t["cpf"] else ("nome", t["nome"] or t["titulo"])


# F256 (22.10.2026) · A MESMA PESSOA EM DUAS FICHAS. A tarefa sem "#CPF" virava
# cliente pelo nome, e o nome escrito de outro jeito ("Adejair Donizete Maran" no
# 💵, "Adejair Donisete Maran #CPF" no 👪) fazia duas fichas: 38 pessoas assim.
# Agora a tarefa sem CPF vai à ficha COM CPF de nome igual ou quase igual (até
# 2 letras de diferença, mesmo primeiro nome), e só quando há UMA candidata.
def nome_chave(n):
    n = "".join(ch for ch in unicodedata.normalize("NFD", (n or "").lower())
                if unicodedata.category(ch) != "Mn")
    n = re.sub(r"[^a-z ]", " ", n)
    n = re.sub(r"\b(de|da|do|dos|das|e)\b", " ", n)
    n = re.sub(r"(.)\1", r"\1", n.replace("z", "s").replace("y", "i"))
    return " ".join(n.split())


def _distancia(a, b, teto=2):
    if abs(len(a) - len(b)) > teto:
        return teto + 1
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            q = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1]))
            p = q
    return d[len(b)]


def cpf_pelo_nome(nome, cpf_por_nome):
    """O CPF da ficha de nome igual ou quase igual; None se nenhuma ou mais de uma."""
    k = nome_chave(nome)
    if len(k.split()) < 2:
        return None
    if k in cpf_por_nome:
        cpfs = cpf_por_nome[k]
    else:
        pri = k.split()[0]
        cpfs = {c for kk, cs in cpf_por_nome.items()
                if kk.split()[:1] == [pri] and _distancia(k, kk) <= 2 for c in cs}
    return next(iter(cpfs)) if len(cpfs) == 1 else None


def mapear(dados, cpf_por_nome=None):
    """crm.json -> dicionário de linhas por tabela (ids determinísticos).
    `cpf_por_nome` ({nome_chave: {cpf}}) vem das fichas com CPF do banco (F256)."""
    cpf_por_nome = {k: set(v) for k, v in (cpf_por_nome or {}).items()}
    for t in dados["tarefas"]:
        if t.get("cpf") and t.get("nome"):
            cpf_por_nome.setdefault(nome_chave(t["nome"]), set()).add(t["cpf"])
    clientes, casos, andamentos, eventos, tarefas = {}, {}, {}, {}, {}
    pagamentos, lembretes, fora_de_pagamentos = {}, {}, []
    credenciais, vinculos, pend_vinculos = {}, {}, []
    notas, subtarefas_dado = {}, []   # F296 · nota da ficha por cliente; ids das etapas que eram dado e viraram subtarefa
    pulados, sem_senha_padrao = {}, 0

    for t in dados["tarefas"]:
        lista = t["lista"]

        if lista == LISTA_PARTICULAR:
            tid = uid("tarefa", t["id"])
            tarefas[tid] = {
                "id": tid, "caso_id": None, "titulo": t["titulo"], "prazo": t["prazo"],
                "concluida": t["concluida"],
                "concluida_em": t["concluida_em"] and t["concluida_em"] + "T12:00:00" + TZ,
                "particular_de": ("__INICIAL__", DONO_PARTICULAR),
            }
            continue

        fase = LISTA_FASE.get(lista)
        if fase is None and not t["cpf"]:
            pulados[lista] = pulados.get(lista, 0) + 1
            continue
        fase = fase or "outro"

        achado = None if t["cpf"] else cpf_pelo_nome(t["nome"] or t["titulo"], cpf_por_nome)
        tipo, chave = ("cpf", achado) if achado else _cliente_key(t)
        cid = uid("cliente", tipo, chave)
        c = clientes.setdefault(cid, {
            "id": cid, "cpf": t["cpf"], "nome": t["nome"] or t["titulo"],
            "dn": None, "telefone": None,
        })
        if achado:
            c["cpf"] = c["cpf"] or achado
        elif t["nome"] and len(t["nome"]) > len(c["nome"] or ""):
            c["nome"] = t["nome"]
        c["dn"] = c["dn"] or t["dn"]
        c["telefone"] = c["telefone"] or t["telefone"]

        # 🙏 Aposentadorias Futuras NÃO vira caso (combinado com o Paulo,
        # 08.90): é gente sem pedido ativo, e caso aberto para cada uma
        # poluía o CRM. Vira 🔔 LEMBRETE do cliente: a data de conclusão da
        # tarefa é o proximo_em, e as anotações do corpo vão em
        # detalhes.anotacoes — visíveis na aba Lembretes, onde a análise
        # manual pode transferir uma a uma para os andamentos de um caso.
        # Dados de cliente do checklist (senha, telefone, CPF) continuam
        # entrando; o resto do checklist fica no To Do.
        if fase == "aposentadoria_futura":
            # F218 · o resto do checklist vai ao card (é onde o Paulo anota a
            # data provável da aposentadoria); senha, CPF e telefone ficam fora
            checklist_card = []
            for c_it in t.get("checklist", []):
                txt = (c_it.get("texto") or "").strip()
                tipo_it, valor = classificar_item_checklist(txt, c["cpf"])
                if tipo_it in ("senha_padrao", "senha"):
                    if tipo_it == "senha_padrao" and not SENHA_PADRAO:
                        sem_senha_padrao += 1
                        continue
                    cred_id = uid("credencial", cid, "meu_inss")
                    credenciais.setdefault(cred_id, {
                        "id": cred_id, "cliente_id": cid, "tipo": "meu_inss",
                        "valor": SENHA_PADRAO if tipo_it == "senha_padrao" else valor})
                elif tipo_it == "telefone":
                    c["telefone"] = c["telefone"] or valor
                elif tipo_it == "cpf":
                    c["cpf"] = c["cpf"] or valor
                elif tipo_it != "vazio":
                    checklist_card.append({"texto": txt, "feito": bool(c_it.get("feito"))})
            lid = uid("lembrete", t["id"])
            lembretes[lid] = {
                "id": lid, "cliente_id": cid, "tipo": "aposentadoria_futura",
                "titulo": t["beneficio"] or "Aposentadoria futura",
                "detalhes": {
                    "todo_task_id": t["id"],
                    "beneficio": t["beneficio"],
                    "anotacoes": [{"data": a["data"], "inicial": a["inicial"],
                                   "texto": a["texto"]}
                                  for a in t["andamentos"]],
                    "checklist": checklist_card,
                },
                "intervalo_meses": None,
                "proximo_em": t["prazo"],
                "todo_prazo": t["prazo"],     # a data do To Do na última rodada (manter_lembrete)
                "ativo": not t["concluida"],
            }
            continue

        kid = uid("caso", t["id"])
        # protocolos do INSS citados em qualquer bloco — a busca do app acha
        # o cliente pelo número quando o INSS só divulga "concluído o protocolo X"
        protocolos = sorted({m for a in t["andamentos"]
                             for m in RE_PROTOCOLO.findall(a["texto"])})
        casos[kid] = {
            "id": kid, "cliente_id": cid, "titulo": sem_cpf(t["titulo"]),
            "beneficio": t["beneficio"],
            "parceria": t.get("parceria"),
            "protocolos": protocolos,
            "fase": "encerrado" if t["concluida"] else fase,
            "nb": t["nb"], "processo": t["processo"], "prazo": t["prazo"],
            "todo_prazo": t["prazo"],     # a data do To Do na última rodada (manter_dados_do_banco)
            "importante": t["importante"], "origem_lista": lista,
            "todo_task_id": t["id"],
            "encerrado_em": t["concluida_em"] and t["concluida_em"] + "T12:00:00" + TZ,
        }

        if lista == "💵 Pagamentos":
            for item in t.get("checklist") or []:
                # senha, CPF, telefone, protocolo... não são parcela: vão ao campo
                # certo no laço de baixo, como nas outras listas
                if not e_parcela(item.get("texto"), c["cpf"]):
                    fora_de_pagamentos.append(item.get("id"))
                    continue
                pg = pagamento_do_item(kid, item, cid)
                if pg:
                    pagamentos[pg["todo_item_id"]] = pg

        for a in t["andamentos"]:
            aid = uid("andamento", kid, a["data"], md5(a["texto"]))
            andamentos[aid] = {
                "id": aid, "caso_id": kid,
                "autor_id": ("__INICIAL__", a["inicial"]) if a["inicial"] != "?" else None,
                "criado_em": a["data"] + "T12:00:00" + TZ,
                "texto": a["texto"], "origem": "todo", "todo_sync": True,
                # usados só pelo anti-eco, removidos antes do insert:
                "_dia": a["data"], "_md5": md5(a["texto"]),
            }

        # checklist do To Do ("0 de 4") -> cada item é classificado: dados
        # (senha, CPF, telefone, protocolo, parceria, parente) vão para o
        # campo certo; só o que é tarefa de verdade vira subtarefa
        for c_it in t.get("checklist", []):
            txt = (c_it.get("texto") or "").strip()
            tipo_it, valor = classificar_item_checklist(txt, c["cpf"])
            if tipo_it in ("vazio", "dado"):
                continue
            if tipo_it not in ("tarefa", "nome"):
                subtarefas_dado.append(uid("subtarefa", kid, md5(txt)))
            if tipo_it == "nb":
                casos[kid]["nb"] = casos[kid]["nb"] or valor
                continue
            if tipo_it == "telefone_nota":
                c["telefone"] = c["telefone"] or valor[0]
                tipo_it, valor = "nota", ("telefone", valor[1])
            if tipo_it == "nota":
                _nota(notas, cid, valor[0], valor[1], kid)
                continue
            if tipo_it in ("senha_padrao", "senha"):
                if tipo_it == "senha_padrao" and not SENHA_PADRAO:
                    sem_senha_padrao += 1
                    continue
                cred_id = uid("credencial", cid, "meu_inss")
                credenciais.setdefault(cred_id, {
                    "id": cred_id, "cliente_id": cid, "tipo": "meu_inss",
                    "valor": SENHA_PADRAO if tipo_it == "senha_padrao" else valor})
                continue
            if tipo_it == "telefone":
                c["telefone"] = c["telefone"] or valor
                continue
            if tipo_it == "cpf":
                c["cpf"] = c["cpf"] or valor
                continue
            if tipo_it == "protocolo":
                if valor not in casos[kid]["protocolos"]:
                    casos[kid]["protocolos"] = sorted(casos[kid]["protocolos"] + [valor])
                continue
            if tipo_it == "parceria":
                atual = casos[kid]["parceria"]
                if not atual:
                    casos[kid]["parceria"] = valor
                elif valor not in atual:
                    casos[kid]["parceria"] = atual + ", " + valor
                continue
            if tipo_it == "nome":
                pend_vinculos.append((cid, valor[0], valor[1], kid, txt,
                                      bool(c_it.get("feito")), valor[2]))
                continue
            tid = uid("subtarefa", kid, md5(txt))
            tarefas[tid] = {
                "id": tid, "caso_id": kid, "titulo": txt,
                "prazo": None, "concluida": bool(c_it.get("feito")),
                "concluida_em": None, "particular_de": None,
            }

        for e in t["eventos"]:
            # "45:00" já chegou como hora (o leitor pegava qualquer número
            # perto da data). Hora impossível cai no padrão em vez de virar
            # um data_hora que o banco recusa.
            hora = e["hora"] if hora_valida(e["hora"]) else "09:00"
            eid = uid("evento", kid, e["tipo"], e["data"], hora)
            eventos[eid] = {
                "id": eid, "caso_id": kid, "tipo": e["tipo"],
                "data_hora": e["data"] + "T" + hora + ":00" + TZ,
                "status": "agendada" if e["data"] >= dados["gerado_em"][:10] else "realizada",
                "obs": e["trecho"],
            }

    # segunda passada: item de checklist com nome de gente vira vínculo se o
    # nome bater com OUTRO cliente da base; senão volta a ser subtarefa
    nome_idx, cpf_idx = {}, {}
    for cli in clientes.values():
        nome_idx.setdefault(_norm(cli["nome"]), cli["id"])
        if cli.get("cpf"):
            cpf_idx.setdefault(cli["cpf"], cli["id"])
    for cid, relacao, nome_txt, kid, txt, feito, cpf_rel in pend_vinculos:
        outro = (cpf_rel and cpf_idx.get(cpf_rel)) or nome_idx.get(_norm(nome_txt))
        if outro and outro != cid:
            vid = uid("vinculo", cid, outro)
            vinculos[vid] = {"id": vid, "cliente_id": cid,
                             "ligado_a": outro, "relacao": relacao}
            subtarefas_dado.append(uid("subtarefa", kid, md5(txt)))
        elif relacao or cpf_rel:
            # F296 · parente que não é cliente: nota da ficha, e não tarefa
            _nota(notas, cid, "parente", txt, kid)
            subtarefas_dado.append(uid("subtarefa", kid, md5(txt)))
        else:
            tid = uid("subtarefa", kid, md5(txt))
            tarefas[tid] = {
                "id": tid, "caso_id": kid, "titulo": txt, "prazo": None,
                "concluida": feito, "concluida_em": None, "particular_de": None,
            }

    if sem_senha_padrao:
        print(f"AVISO: {sem_senha_padrao} item(ns) 'Padrão' ignorados — defina o "
              "secret SENHA_PADRAO_MEUINSS para gravar a senha padrão do escritório.")

    return {
        "clientes": list(clientes.values()),
        "casos": list(casos.values()),
        "andamentos": list(andamentos.values()),
        "eventos": list(eventos.values()),
        "tarefas": list(tarefas.values()),
        "credenciais": list(credenciais.values()),
        "vinculos": list(vinculos.values()),
        "pagamentos": list(pagamentos.values()),
        "fora_de_pagamentos": [i for i in fora_de_pagamentos if i],
        "lembretes": list(lembretes.values()),
        "pulados": pulados,
        "notas_ficha": notas,
        "subtarefas_dado": sorted(set(subtarefas_dado)),
    }


def _nota(notas, cid, tipo, texto, kid=None):
    lst = notas.setdefault(cid, [])
    if not any(n["texto"] == texto for n in lst):
        lst.append({"tipo": tipo, "texto": texto, "caso_id": kid})


def remapear_casos(mapa, task_para_id_existente):
    """Casos criados NO APP ganham tarefa no To Do depois (escrever_todo). Na
    importação seguinte, o mesmo todo_task_id chegaria com id determinístico
    diferente e duplicaria/violaria o unique. Aqui, remapeia o caso importado
    para o id que já existe no banco (e corrige as referências)."""
    troca = {}
    for k in mapa["casos"]:
        existente = task_para_id_existente.get(k["todo_task_id"])
        if existente and existente != k["id"]:
            troca[k["id"]] = existente
            k["id"] = existente
    if troca:
        for a in mapa["andamentos"]:
            a["caso_id"] = troca.get(a["caso_id"], a["caso_id"])
        for e in mapa["eventos"]:
            e["caso_id"] = troca.get(e["caso_id"], e["caso_id"])
        for tf in mapa["tarefas"]:
            if tf.get("caso_id"):
                tf["caso_id"] = troca.get(tf["caso_id"], tf["caso_id"])
        for pg in mapa.get("pagamentos", []):
            pg["caso_id"] = troca.get(pg["caso_id"], pg["caso_id"])
    return len(troca)


LIMITE_FAXINA = 300     # fantasmas encerrados por rodada, para a mudança ser vista
LIMITE_RECUSADAS = 25   # acima disso a rodada falha: não é caso isolado, é pane


def casos_movidos(mapa, banco, minimo_seguro=50, ja_no_banco=None):
    """Acerta o que a MUDANÇA DE LISTA no To Do quebra.

    Mover a tarefa de lista faz a Microsoft apagar e recriar a tarefa com id
    novo. Sem isto, cada mudança abria um caso a mais do mesmo cliente, e o
    caso velho ficava aberto para sempre com o prazo do dia da mudança.

    Devolve (quantos casos foram ADOTADOS, lista de (id, título) a ENCERRAR).
    Adotar é o caso novo assumir o id do caso velho do mesmo cliente com o
    mesmo título, de modo que andamentos, números e comentários continuem no
    mesmo lugar. Encerrar é o que sobrou sem dono, porque a tarefa que lhe deu
    origem não existe mais em lista nenhuma.

    A trava `minimo_seguro` existe porque um crawl incompleto do To Do faria
    esta função encerrar a carteira inteira. Abaixo disso, ela não encerra nada.

    `ja_no_banco` (tarefas que o banco já tem) vem pronto quando o banco
    mandou só os casos órfãos em `banco`, e não a carteira inteira (E2).
    """
    vivos = {k.get("todo_task_id") for k in mapa.get("casos") or []}
    if ja_no_banco is None:
        ja_no_banco = {c["todo_task_id"] for c in banco}
    # casos do banco cuja tarefa sumiu do To Do, do mais novo para o mais velho
    orfaos = [c for c in banco
              if c.get("fase") != "encerrado" and c["todo_task_id"] not in vivos]
    # o título entra pela forma SEM o #CPF nos dois lados: o banco ainda tem
    # títulos antigos com o CPF, e sem isto a mudança de lista deixaria de ser
    # reconhecida justamente na rodada em que os títulos mudam
    por_chave = {}
    for c in orfaos:
        por_chave.setdefault((c.get("cliente_id"), sem_cpf(c.get("titulo"))), []).append(c)

    troca, adotados = {}, 0
    for k in mapa.get("casos") or []:
        if k.get("todo_task_id") in ja_no_banco:
            continue                      # já existe: o remapeamento por id cuidou
        fila = por_chave.get((k.get("cliente_id"), sem_cpf(k.get("titulo"))))
        if not fila:
            continue
        velho = fila.pop()                # um caso velho serve a um caso novo só
        troca[k["id"]] = velho["id"]
        k["id"] = velho["id"]
        adotados += 1
    if troca:
        for a in mapa.get("andamentos") or []:
            a["caso_id"] = troca.get(a["caso_id"], a["caso_id"])
        for e in mapa.get("eventos") or []:
            e["caso_id"] = troca.get(e["caso_id"], e["caso_id"])
        for tf in mapa.get("tarefas") or []:
            if tf.get("caso_id"):
                tf["caso_id"] = troca.get(tf["caso_id"], tf["caso_id"])
        for pg in mapa.get("pagamentos") or []:
            pg["caso_id"] = troca.get(pg["caso_id"], pg["caso_id"])

    if len(vivos) < minimo_seguro:        # crawl incompleto: não encerra nada
        return adotados, []
    sobrou = [(c["id"], c.get("titulo"))
              for fila in por_chave.values() for c in fila]
    return adotados, sobrou


def respeitar_movidos(mapa, movidos):
    """F220 · o caso movido no CRM não volta à fase da lista antiga.

    Com a escrita no To Do desligada, a tarefa fica na lista de onde o caso
    saiu, e o upsert devolvia o caso à fase dela a cada rodada. Enquanto o To
    Do não alcança o CRM, vale a fase do mover_para; quando a tarefa chega à
    lista, ou é concluída, o mover_para sai. Devolve os ids a limpar."""
    por_id = {m["id"]: m for m in movidos or [] if m.get("mover_para")}
    limpar = []
    for k in mapa.get("casos") or []:
        m = por_id.get(k.get("id"))
        if not m:
            continue
        if k.get("fase") == "encerrado" or k.get("origem_lista") == m["mover_para"]:
            limpar.append(k["id"])
            continue
        k["fase"] = LISTA_FASE.get(m["mover_para"]) or m.get("fase") or k.get("fase")
    return limpar


def _dig(v):
    return re.sub(r"\D", "", str(v or ""))


def aplicar_marcas_do_crm(mapa, marcados):
    """F220 · as marcas que o CRM grava em casos.arquivados valem sobre o To Do.

    "fundido": o caso foi incorporado a outro e fica encerrado, mesmo com a
    tarefa aberta no To Do. "mov:nb|proc|prot:<dígitos>": o número foi levado a
    outro caso e não volta a este. "add:prot:<dígitos>": protocolo acrescentado
    no CRM, que a tarefa do To Do não cita e o upsert apagava. Devolve quantas
    marcas mudaram alguma linha."""
    por_id = {m["id"]: m.get("arquivados") or {} for m in marcados or []
              if isinstance(m.get("arquivados"), dict) and m.get("arquivados")}
    mudou = 0
    for k in mapa.get("casos") or []:
        arq = por_id.get(k.get("id"))
        if not arq:
            continue
        antes = (k.get("fase"), k.get("nb"), k.get("processo"), list(k.get("protocolos") or []))
        fus = arq.get("fundido")
        if fus and k.get("fase") != "encerrado":
            k["fase"] = "encerrado"
            k["encerrado_em"] = k.get("encerrado_em") or (fus.get("em") if isinstance(fus, dict) else None)
        for chave_m in arq:
            partes = str(chave_m).split(":")
            if len(partes) != 3 or not partes[2]:
                continue
            acao, tipo, d = partes
            if acao == "mov" and tipo == "nb" and _dig(k.get("nb")) == d:
                k["nb"] = None
            elif acao == "mov" and tipo == "proc" and _dig(k.get("processo")) == d:
                k["processo"] = None
            elif acao == "mov" and tipo == "prot":
                k["protocolos"] = [p for p in k.get("protocolos") or [] if _dig(p) != d]
            elif acao == "add" and tipo == "prot" and d not in {_dig(p) for p in k.get("protocolos") or []}:
                k["protocolos"] = sorted((k.get("protocolos") or []) + [d])
        if antes != (k.get("fase"), k.get("nb"), k.get("processo"), list(k.get("protocolos") or [])):
            mudou += 1
    return mudou


def redirecionar_fundidos(mapa, marcados):
    """F221 · a tarefa do To Do do caso fundido continua aberta: o que ela trouxer
    (anotação, perícia, tarefa, pagamento) vai ao caso de destino, seguindo a
    cadeia de fusões, e não à casca encerrada. Sem isso a perícia anotada no
    To Do entrava de novo na casca, ao lado da que a fusão levou ao destino, e a
    tarefa voltava à casca a cada rodada. Devolve quantas linhas mudaram de caso."""
    para = {}
    for m in marcados or []:
        arq = m.get("arquivados") if isinstance(m.get("arquivados"), dict) else {}
        fus = arq.get("fundido")
        if isinstance(fus, dict) and fus.get("para"):
            para[m["id"]] = fus["para"]

    def destino(k):
        vistos = set()
        while k in para and k not in vistos:
            vistos.add(k)
            k = para[k]
        return k

    n = 0
    for chave in ("andamentos", "eventos", "tarefas", "tarefas_docs", "pagamentos"):
        for linha in mapa.get(chave) or []:
            if linha.get("caso_id") in para:
                linha["caso_id"] = destino(linha["caso_id"])
                n += 1
    return n


# o nome que o Novo Cliente grava enquanto o CNIS não chega (F201) conta como vazio
RE_NOME_PROVISORIO = re.compile(r"\s*(Cliente\s+[\d.\-]*)?\s*")


def manter_dados_do_banco(mapa, banco, tabela="clientes", campos=("telefone", "dn", "nome")):
    """O CRM vence; a tarefa do To Do só preenche o que está vazio.

    Telefone e nascimento: tarefa sem telefone no corpo mandava null e apagava
    o que o app ou a importação do checklist (telefones_todo.py) tinham
    gravado — em 04/10/2026 foram 628 cadastros em minutos. Nome: o mais longo
    das tarefas do mesmo CPF desfazia o "Usar o nome do CNIS" (F198), e uma
    tarefa pessoal com o CPF no título renomeava o cliente.

    Com tabela="casos": o prazo fatal e a ⭐ marcados no CRM voltavam ao que a
    tarefa tinha (ou a nada) a cada 10 minutos. O To Do ainda preenche o caso
    sem prazo e acende a ⭐ apagada, mas não a apaga.

    Exceção (31.10.2026): a data que MUDOU no To Do desde a rodada anterior
    (casos.todo_prazo) vence a do CRM. Sem isso, o "Concluir em" adiado ou
    apagado no To Do nunca chegava, e o CRM guardava 185 datas vencidas.

    O lote do PostgREST exige as mesmas chaves em todas as linhas, então o
    valor do banco entra na linha em vez de a coluna sair dela."""
    por_id = {b["id"]: b for b in banco or []}
    for linha in mapa.get(tabela) or []:
        b = por_id.get(linha.get("id")) or {}
        for campo in campos:
            if (campo == "prazo" and "todo_prazo" in b
                    and (linha.get("todo_prazo") or None) != (b["todo_prazo"] or None)):
                continue                  # a data mudou no To Do: o To Do vence
            v = b.get(campo)
            if v and not (campo == "nome" and RE_NOME_PROVISORIO.fullmatch(v)):
                linha[campo] = v


def manter_lembrete(l, b):
    """O card das Aposentadorias futuras: título, data e intervalo editados no CRM
    vencem (responsavel_id não é enviado, o banco já o preserva). Exceção
    (31.10.2026): a data que MUDOU no To Do desde a rodada anterior
    (lembretes.todo_prazo) vence, como no casos.prazo; sem isso o lembrete adiado
    no To Do continuava vencido no Meu Dia. Só a conclusão no To Do desliga."""
    for campo in ("titulo", "proximo_em", "intervalo_meses"):
        if (campo == "proximo_em" and "todo_prazo" in b
                and (l.get("todo_prazo") or None) != (b["todo_prazo"] or None)):
            continue
        if b.get(campo) is not None:
            l[campo] = b[campo]
    if l["ativo"]:
        l["ativo"] = b.get("ativo", True)


def respeitar_despacho(mapa, pendentes):
    """F291 · o "Concluir por hoje" do CRM apaga a ⭐ e marca a volta. Enquanto a ponte
    (ponte_despacho.py) não leva isso ao To Do, a tarefa ainda tem a estrela e a
    regra "casos.importante or excluded.importante" a acenderia de novo. O caso
    despachado e ainda não levado entra com a ⭐ apagada e a data do despacho."""
    por_id = {}
    for p in pendentes or []:
        d = (p.get("ronda") or {}).get("despacho") or {}
        if d.get("prazo") and not d.get("todo"):      # a consulta já filtra; a regra vale também sem ela
            por_id[p["id"]] = d
    n = 0
    for linha in mapa.get("casos") or []:
        d = por_id.get(linha.get("id"))
        if d is None:
            continue
        linha["importante"] = False
        if d.get("prazo"):
            linha["prazo"] = d["prazo"]
        n += 1
    return n


def remapear_clientes(mapa, cpf_para_id_existente):
    """[BUG 17.09.2026] Cliente cadastrado NO APP ganha id aleatório. Se a
    mesma pessoa também é tarefa do To Do, a importação seguinte tentava
    inserir a MESMA pessoa com o id determinístico, e o banco recusava pelo
    unique do CPF (clientes_cpf_key). O caso dela vinha logo atrás e caía na
    chave estrangeira (casos_cliente_id_fkey). Uma pessoa derrubava a rodada
    inteira, e o CRM passava dias sem sincronizar.

    Aqui o id determinístico cede ao id que JÁ está no banco, e as referências
    vão junto. Vale também para duas linhas do mesmo CPF dentro da própria
    importação (a tarefa de 🙏 Aposentadorias Futuras entra pelo NOME e pode
    receber o CPF do checklist depois): as duas viram uma só, porque mandar
    dois ids com o mesmo CPF no mesmo insert quebra do mesmo jeito.
    """
    troca, canonico = {}, {}
    fora = []
    for c in mapa.get("clientes") or []:
        cpf = (c.get("cpf") or "").strip()
        if not cpf:
            fora.append(c)
            continue
        alvo = cpf_para_id_existente.get(cpf) or uid("cliente", "cpf", cpf)
        if alvo != c["id"]:
            troca[c["id"]] = alvo
            c["id"] = alvo
        ja = canonico.get(alvo)
        if ja is None:
            canonico[alvo] = c
            fora.append(c)
            continue
        # duas linhas da mesma pessoa: fica o nome mais completo e o primeiro
        # dado preenchido de cada campo, que é a regra do resto do mapeamento
        if len(c.get("nome") or "") > len(ja.get("nome") or ""):
            ja["nome"] = c["nome"]
        for campo in ("dn", "telefone"):
            ja[campo] = ja.get(campo) or c.get(campo)
    if "clientes" in mapa:
        mapa["clientes"] = fora
    if troca:
        for k in mapa.get("casos") or []:
            k["cliente_id"] = troca.get(k["cliente_id"], k["cliente_id"])
        for tab in ("credenciais", "lembretes"):
            for l in mapa.get(tab, []):
                l["cliente_id"] = troca.get(l["cliente_id"], l["cliente_id"])
        for v in mapa.get("vinculos", []):
            for campo in ("cliente_id", "ligado_a"):
                if v.get(campo):
                    v[campo] = troca.get(v[campo], v[campo])
        notas = {}
        for cid, lst in (mapa.get("notas_ficha") or {}).items():
            dest = notas.setdefault(troca.get(cid, cid), [])
            dest += [n for n in lst if n not in dest]
        if "notas_ficha" in mapa:
            mapa["notas_ficha"] = notas
    return len(troca)


def separar_prazo_vazio(mapa):
    """P4 dos prazos (31.10.2026): a etapa do caso que o To Do manda sem data não leva a coluna prazo,
    porque o upsert apagava a data de entrega que o CRM deu ao pedido de documento. A tarefa pessoal
    (sem caso) segue como antes: nela a data é do To Do."""
    ts = mapa.get("tarefas") or []
    mapa["tarefas"] = [t for t in ts if not (t.get("caso_id") and t.get("prazo") is None)]
    mapa["tarefas_sem_prazo"] = [{c: v for c, v in t.items() if c != "prazo"}
                                 for t in ts if t.get("caso_id") and t.get("prazo") is None]


def tarefas_docs_de(andamentos):
    """Andamentos com "documentos solicitados: X; Y" viram itens 📄 do
    Checklist de Documentos Solicitados (ids determinísticos, inserção única).
    Chamar DEPOIS do anti-eco: o que o app já criou não é recriado."""
    out = {}
    for a in andamentos:
        m = RE_DOCS_SOLICITADOS.search(a["texto"])
        if not m:
            continue
        for it in [x.strip().rstrip(".") for x in re.split(r"[;,]", m.group(1))][:15]:
            if not it or len(it) > 80:
                continue
            did = uid("subtarefa", a["caso_id"], md5("📄 " + it))
            out.setdefault(did, {
                "id": did, "caso_id": a["caso_id"], "titulo": "📄 " + it,
                "prazo": None, "concluida": False,
                "concluida_em": None, "particular_de": None,
            })
    return list(out.values())


def anti_eco(linhas, existentes_app):
    """Remove blocos importados do To Do que são eco de andamentos criados no
    app (a escrita dupla devolve o texto ao To Do; sem isto, duplicaria).
    existentes_app: conjunto de (caso_id, dia, md5(texto))."""
    return [a for a in linhas
            if (a["caso_id"], a["_dia"], a["_md5"]) not in existentes_app]


def _limpar(a):
    return {k: v for k, v in a.items() if not k.startswith("_")}


# ── 💵 Pagamentos: cada item do checklist do To Do é uma parcela ─────────
RE_DATA_BR = re.compile(r"\b(\d{2})[./](\d{2})[./](\d{4})\b")
RE_DATA_PARCIAL = re.compile(r"\b\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\b")
RE_VALOR_RS = re.compile(r"R\$\s*([\d.]+(?:,\d{2})?)")
RE_VALOR_DEC = re.compile(r"\b(\d{1,3}(?:\.\d{3})*,\d{2})\b")
# número colado em letra ou símbolo ("Es@645351", "Ana.241223", "30%") é
# senha, código ou percentual, e não valor
RE_VALOR_NUM = re.compile(r"(?<![\w@*.=/#-])(\d{2,7})(?![\w@*%-])")
RE_URL = re.compile(r"\S+://\S*")
RE_FONE = re.compile(r"\(?\b\d{2}\)?[\s.-]*9?\d{4}[\s.-]?\d{4}\b")
RE_DIGITOS = re.compile(r"\d+(?:[./-]\d+)*")
VALOR_MAX = 500_000      # parcela acima disso é número lido como valor


def _num_br(s):
    try:
        v = float(s.replace(".", "").replace(",", "."))
    except ValueError:
        return None
    return v if v > 0 else None


def _sem_numeros_longos(t):
    """Telefone, e o que tem 7 dígitos ou mais com ou sem pontuação (processo,
    NB, CPF, CNPJ, protocolo), saem antes de procurar o número solto."""
    t = RE_FONE.sub(" ", t)
    return RE_DIGITOS.sub(lambda m: " " if len(re.sub(r"\D", "", m.group())) >= 7 else m.group(), t)


def valor_do_item(texto):
    """O valor da parcela: R$ explícito > número com centavos > o MAIOR
    número solto (o 500 de "2ª parcela 500", nunca o 2 nem o 10/09).

    O que não parece dinheiro não vira valor: em 17.10.2026, 17 parcelas
    passavam de R$ 500 mil (processo, protocolo, telefone, senha) e 195 eram o
    CPF do cliente lido como R$ 131 a R$ 998."""
    t = RE_URL.sub(" ", RE_DATA_BR.sub(" ", texto or ""))
    m = RE_VALOR_RS.search(t) or RE_VALOR_DEC.search(t)
    if m:
        v = _num_br(m.group(1))
    else:
        t = RE_DATA_PARCIAL.sub(" ", _sem_numeros_longos(t))
        ns = [n for n in (_num_br(x) for x in RE_VALOR_NUM.findall(t)) if n]
        v = max(ns) if ns else None
    return v if v and v <= VALOR_MAX else None


def data_do_item(texto):
    m = RE_DATA_BR.search(texto or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


def e_parcela(texto, cpf_cliente=None):
    """O item do checklist de 💵 Pagamentos é parcela, ou dado do cliente?

    A classificação das outras listas vale aqui: senha, CPF, telefone,
    protocolo, parceria e aniversário não viram parcela (em 17.10.2026 havia
    125 senhas na descrição de parcelas, visíveis na aba). Texto livre continua
    parcela ("Pagou tudo"); número puro é parcela quando é valor ("500") ou
    vencimento ("10/11/2026"); e "R$500,00" colado não é senha."""
    t = (texto or "").strip()
    if re.fullmatch(r"R\$\s*[\d.]+(?:,\d{2})?", t):
        return True
    tipo, _ = classificar_item_checklist(t, cpf_cliente)
    if tipo in ("dado", "protocolo") and re.fullmatch(r"[\d\s./\-]+", t):
        return bool(valor_do_item(t) or data_do_item(t))
    return tipo in ("tarefa", "nome", "vazio")


def pagamento_do_item(kid, item, cid=None):
    """Item do checklist -> linha de `pagamentos`. Concluído no To Do =
    recebido (pago_em = quando marcou, senão a data escrita no item);
    aberto = a receber (a data escrita vira vencimento).

    O dinheiro é do CLIENTE: `cliente_id` é o vínculo que a aba Pagamentos da
    ficha usa. `caso_id` é uma cortesia — existe quando a parcela nasceu de um
    caso, e fica vazia quando o cliente só tem o acerto de honorários."""
    if not (item.get("id") and (item.get("texto") or "").strip()):
        return None
    texto = item["texto"].strip()
    feito = bool(item.get("feito"))
    data = data_do_item(texto)
    return {
        "todo_item_id": item["id"], "caso_id": kid, "cliente_id": cid,
        "descricao": texto, "valor": valor_do_item(texto),
        "status": "recebido" if feito else "aberto",
        "pago_em": (item.get("feito_em") or data) if feito else None,
        "vencimento": None if feito else data,
    }


# ── saída SQL (primeira carga via psql) ───────────────────────────────────

def _sql_val(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, tuple):  # ("__INICIAL__", "P") -> subselect
        return f"(select id from colaboradores where inicial = '{v[1]}')"
    if isinstance(v, (list, dict)):  # jsonb (ex.: protocolos)
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def _sql_insert(tabela, linhas, conflito="do nothing", update_cols=(), chave="id"):
    linhas = [_limpar(l) for l in linhas]
    if not linhas:
        return ""
    cols = list(linhas[0].keys())
    out = []
    for i in range(0, len(linhas), 500):
        vals = ",\n".join(
            "(" + ", ".join(_sql_val(l[c]) for c in cols) + ")"
            for l in linhas[i:i + 500]
        )
        # "col = expr" vai como está (o CRM vence); o nome solto, excluded.col
        acao = (f"do update set " + ", ".join(c if "=" in c else f"{c} = excluded.{c}"
                                              for c in update_cols)
                if update_cols else conflito)
        out.append(f"insert into {tabela} ({', '.join(cols)}) values\n{vals}\n"
                   f"on conflict ({chave}) {acao};")
    return "\n\n".join(out)


def gerar_sql(mapa):
    return "\n\n".join(filter(None, [
        "begin;",
        # o CRM vence, como no manter_dados_do_banco: o To Do só preenche o vazio
        _sql_insert("clientes", mapa["clientes"],
                    update_cols=("nome = case when coalesce(clientes.nome, '') ~ "
                                 r"'^\s*(Cliente\s+[0-9.-]*)?\s*$' then excluded.nome else clientes.nome end",
                                 "dn = coalesce(nullif(clientes.dn, ''), excluded.dn)",
                                 "telefone = coalesce(nullif(clientes.telefone, ''), excluded.telefone)")),
        # senha nova editada no app nunca é sobrescrita: conflito = do nothing
        _sql_insert("credenciais", mapa.get("credenciais", [])),
        _sql_insert("vinculos", mapa.get("vinculos", []), chave="cliente_id, ligado_a"),
        _sql_insert("casos", mapa["casos"],
                    update_cols=("fase", "prazo = case when excluded.todo_prazo is distinct from "
                                 "casos.todo_prazo then excluded.prazo "
                                 "else coalesce(casos.prazo, excluded.prazo) end",
                                 "todo_prazo",
                                 "importante = casos.importante or excluded.importante",
                                 "beneficio = coalesce(casos.beneficio, excluded.beneficio)",
                                 "parceria", "protocolos",
                                 "nb", "processo", "origem_lista", "encerrado_em")),
        _sql_insert("andamentos", mapa["andamentos"]),
        _sql_insert("eventos", mapa["eventos"], chave="caso_id,tipo,data_hora"),
        _sql_insert("tarefas", mapa["tarefas"],
                    update_cols=("prazo = coalesce(excluded.prazo, tarefas.prazo)", "concluida", "concluida_em")),
        # só o item marcado mexe no status: aberto -> recebido, nunca o contrário
        _sql_insert("pagamentos", mapa.get("pagamentos", []), chave="todo_item_id",
                    update_cols=("descricao", "valor",
                                 "status = case when excluded.status = 'recebido' "
                                 "then excluded.status else pagamentos.status end",
                                 "pago_em = case when excluded.status = 'recebido' "
                                 "then excluded.pago_em else pagamentos.pago_em end",
                                 "vencimento")),
        _sql_insert("lembretes", mapa.get("lembretes", []),
                    update_cols=("detalhes",
                                 "proximo_em = case when excluded.todo_prazo is distinct from "
                                 "lembretes.todo_prazo then excluded.proximo_em "
                                 "else coalesce(lembretes.proximo_em, excluded.proximo_em) end",
                                 "todo_prazo", "ativo")),
        _sql_insert("tarefas", mapa.get("tarefas_docs", [])),
        "commit;",
    ]))


# ── modo REST (Supabase) ──────────────────────────────────────────────────

class BancoRecusou(Exception):
    """O banco disse não, e disse por quê. Erro esperado, não acidente."""


def _rest(url, chave, metodo, caminho, corpo=None, prefer=None):
    req = urllib.request.Request(
        url.rstrip("/") + caminho,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={
            # A chave nova do Supabase (sb_secret_…/sb_publishable_…) NÃO é
            # JWT: mandada em Authorization, o gateway tenta ler como JWT e
            # recusa TUDO com "Invalid API key". Ela vai SÓ no apikey; apenas
            # a chave legada (eyJ…) vai também como Bearer.
            "apikey": chave,
            **({"Authorization": f"Bearer {chave}"} if chave.startswith("eyJ") else {}),
            "Content-Type": "application/json",
            **({"Prefer": prefer} if prefer else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        # O CORPO DA RESPOSTA É O DIAGNÓSTICO. O PostgREST diz qual coluna não
        # existe, qual restrição foi violada e em que linha — e `HTTP Error
        # 400: Bad Request` sozinho, que é o que o traceback mostrava, não diz
        # nada. Dezessete minutos de crawl para depois não saber o que houve.
        detalhe = e.read().decode("utf-8", "replace")[:500]
        tabela = caminho.split("?")[0].rsplit("/", 1)[-1]
        recado = f"o banco recusou {metodo} em '{tabela}' ({e.code}): {detalhe}"
        if e.code == 401:
            # diagnóstico sem expor a chave: separa chave errada, URL errada
            # e lixo colado no segredo (espaço, aspas, quebra de linha)
            fmt = ("legada (eyJ…)" if chave.startswith("eyJ")
                   else "nova (sb_…)" if chave.startswith("sb_")
                   else "IRRECONHECÍVEL (não começa com eyJ nem sb_)")
            ref = url.split("//")[-1].split(".")[0]
            recado += (f"\nchave usada: {len(chave)} caracteres, formato {fmt}; "
                       f"projeto alvo: {ref} — confira com o testador do 🩺 "
                       "e confira também o segredo SUPABASE_URL.")
        if "PGRST204" in detalhe or "does not exist" in detalhe or "schema cache" in detalhe:
            recado += ("\nFalta coluna no banco: rode crm/fase2/schema_por_em_dia.sql "
                       "no Supabase e tente de novo.")
        raise BancoRecusou(recado)


def _rest_todas(url, chave, caminho, pagina=1000):
    """GET completo: o Supabase corta qualquer resposta em 1000 linhas, sem
    avisar. Foi assim que um caso escapou do remapeamento — o todo_task_id
    dele existia no banco, só que da linha 1001 em diante, e o insert com id
    novo caía no unique (23505) toda rodada."""
    tudo, salto = [], 0
    while True:
        lote = _rest(url, chave, "GET",
                     f"{caminho}&limit={pagina}&offset={salto}") or []
        tudo.extend(lote)
        if len(lote) < pagina:
            return tudo
        salto += pagina


def existentes_no_banco(url, chave, mapa):
    """[E2 · 29.09.2026] O QUE A RODADA PRECISA SABER DO BANCO, CALCULADO LÁ.

    O plano gratuito do Supabase dá 5 GB de tráfego de saída por mês. Para
    remapear ids, reconhecer mudança de lista e preservar processo/NB, a rodada
    baixava a carteira inteira de casos e o CPF de todos os clientes (1,2 MB),
    e a sincronização a cada 10 minutos faria disso 100 MB por dia. Agora ela
    manda ao banco as tarefas que leu (entrada, que não conta) e recebe só as
    exceções (crm/fase2/schema_sync_leve.sql), algumas dezenas de KB.

    Devolve None quando o banco não tem a função ou respondeu fora do esperado:
    a rodada segue pelo caminho antigo, que continua certo, só mais caro.
    """
    casos = [k for k in mapa.get("casos") or [] if k.get("todo_task_id")]
    vivos = sorted({k["todo_task_id"] for k in casos})
    consultar = sorted({(l.get("detalhes") or {}).get("todo_task_id")
                        for l in mapa.get("lembretes") or []} - {None} - set(vivos))
    sem_numero = sorted({k["todo_task_id"] for k in casos
                         if not (k.get("processo") and k.get("nb"))})
    try:
        r = _rest(url, chave, "POST", "/rest/v1/rpc/crm_sync_existentes",
                  {"vivos": vivos, "consultar": consultar, "sem_numero": sem_numero})
    except Exception:                      # noqa: BLE001 — sem a função, o caminho antigo
        return None
    if not isinstance(r, dict) or any(c not in r for c in
                                      ("clientes", "trocas", "novas", "orfaos", "numeros")):
        return None
    r["consultar"] = consultar
    return r


def subir_rest(mapa):
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    chave = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not url or not chave:
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY (ver COMO-INSTALAR.md).")

    colab = {c["inicial"]: c["id"]
             for c in _rest(url, chave, "GET", "/rest/v1/colaboradores?select=id,inicial")}

    def resolver(linhas):
        out = []
        for l in linhas:
            l = _limpar(l)
            for campo in ("autor_id", "particular_de"):
                if isinstance(l.get(campo), tuple):
                    l[campo] = colab.get(l[campo][1])
            out.append(l)
        return out

    # E2 · o banco responde só as exceções; sem a função, o caminho antigo
    ex = existentes_no_banco(url, chave, mapa)
    print("  consulta ao banco: " + ("só as exceções (E2)" if ex is not None
                                     else "carteira inteira (sem crm_sync_existentes)"))

    # clientes que já existem no banco pelo CPF (inclusive cadastrados no app,
    # que têm id aleatório): o id determinístico cede ao que está lá, senão o
    # unique do CPF recusa a pessoa e a chave estrangeira derruba o caso dela
    if ex is not None:
        cpf_para_id = {cpf: cid for cpf, cid in ex["clientes"]}
    else:
        cli_exist = _rest_todas(url, chave,
                                "/rest/v1/clientes?cpf=not.is.null&select=id,cpf")
        cpf_para_id = {(c.get("cpf") or "").strip(): c["id"]
                       for c in cli_exist if (c.get("cpf") or "").strip()}
    nc = remapear_clientes(mapa, cpf_para_id)
    manter_dados_do_banco(mapa, _rest_todas(url, chave, "/rest/v1/clientes?select=id,telefone,dn,nome"))
    # o CPF que o CRM pôs na ficha vinda do To Do sem CPF: a tarefa mandava null
    # e o apagava. Sem leitura nova: o E2 (e o caminho antigo) já trazem todo
    # cliente cujo id não é o do próprio CPF, que são os únicos em que o CPF do
    # banco pode divergir do da linha. O id não muda: o remapeamento já correu.
    manter_dados_do_banco(mapa, [{"id": cid, "cpf": cpf} for cpf, cid in cpf_para_id.items()],
                          campos=("cpf",))
    if nc:
        print(f"  clientes remapeados para ids já existentes: {nc}")

    # casos que já existem no banco (inclusive criados no app): remapear
    if ex is not None:
        trocas = {tid: kid for tid, kid in ex["trocas"]}
        novas = set(ex["novas"])
        # só os órfãos: quem já está no banco vem de "tarefa lida e não nova"
        exist = ex["orfaos"]
        ja_no_banco = {k["todo_task_id"] for k in mapa["casos"]
                       if k.get("todo_task_id") and k["todo_task_id"] not in novas}
    else:
        exist = _rest_todas(url, chave,
                            "/rest/v1/casos?todo_task_id=not.is.null"
                            "&select=id,todo_task_id,processo,nb,cliente_id,titulo,fase")
        trocas = {c["todo_task_id"]: c["id"] for c in exist}
        ja_no_banco = None
    n = remapear_casos(mapa, trocas)
    if n:
        print(f"  casos remapeados para ids já existentes: {n}")

    # [BUG 20.09.2026] MOVER A TAREFA DE LISTA NO TO DO TROCA O ID DELA. A
    # Microsoft apaga e recria a tarefa, então o mesmo cliente, ao andar de
    # 🌻 INSS para 🖥 Conselho e depois para 👪 Judicial, virava TRÊS casos
    # abertos aqui, cada um guardando o prazo que tinha no dia da mudança. Era
    # isso que enchia o 🗓️ Planejado de datas de julho e agosto: 445 casos com
    # prazo, dos quais 203 eram fantasmas de tarefas que não existem mais.
    # A FAXINA NÃO PODE DERRUBAR A SINCRONIZAÇÃO. Ela é melhoria; o que não
    # pode faltar é o To Do chegar ao CRM. Qualquer tropeço aqui vira aviso.
    try:
        adotados, encerrar = casos_movidos(mapa, exist, ja_no_banco=ja_no_banco)
        if adotados:
            print(f"  casos que mudaram de lista no To Do (id novo, mesmo caso): {adotados}")
        if encerrar:
            print(f"  casos fantasmas a encerrar (a tarefa sumiu do To Do): {len(encerrar)}")
        feitos, falhas = 0, 0
        for cid, titulo in encerrar[:LIMITE_FAXINA]:
            try:
                _rest(url, chave, "PATCH", f"/rest/v1/casos?id=eq.{cid}",
                      {"fase": "encerrado",
                       "encerrado_em": datetime.datetime.now(datetime.timezone.utc)
                           .isoformat(timespec="seconds")},
                      prefer="return=minimal")
                feitos += 1
            except Exception as e:                      # noqa: BLE001
                falhas += 1
                if falhas <= 3:
                    print(f"  aviso: não encerrei o caso fantasma {cid}: {e}")
        if feitos or falhas:
            print(f"  fantasmas encerrados nesta rodada: {feitos}"
                  + (f", falharam {falhas}" if falhas else "")
                  + (f", faltam {len(encerrar) - LIMITE_FAXINA} para a próxima"
                     if len(encerrar) > LIMITE_FAXINA else ""))
    except Exception as e:                              # noqa: BLE001
        print(f"::warning::A faxina dos casos fantasmas falhou ({type(e).__name__}: {e}). "
              "A sincronização seguiu normalmente.")

    # MERGE NÃO-DESTRUTIVO do processo/NB: o upsert manda a linha INTEIRA, e
    # tarefa sem número no To Do mandava processo=null — apagando, toda hora,
    # o CNJ que o Paulo tinha acabado de vincular pela coleta do PJe (e a
    # importação voltava a perguntar pelos mesmos processos). To Do com valor
    # continua mandando; To Do vazio deixa o que o app gravou.
    if ex is not None:
        # o mesmo "o que o banco tem" do caminho antigo, montado das exceções:
        # tarefa já conhecida (com os números guardados, se chegou sem eles) e
        # caso órfão, que o adotado herda com processo e NB
        numeros = {tid: (proc, nb) for tid, proc, nb in ex["numeros"]}
        guardado = {}
        for k in mapa["casos"]:
            if k.get("todo_task_id") in ja_no_banco:
                proc, nb = numeros.get(k["todo_task_id"], (None, None))
                guardado[k["id"]] = {"processo": proc, "nb": nb}
        for o in exist:
            guardado[o["id"]] = o
        exist_por_task = {tid: trocas.get(tid) or uid("caso", tid)
                          for tid in ex["consultar"] if tid not in novas}
    else:
        guardado = {c["id"]: c for c in exist}
        exist_por_task = {c["todo_task_id"]: c["id"] for c in exist}
    resgatados = 0
    for k in mapa["casos"]:
        b = guardado.get(k["id"])
        if not b:
            continue
        for campo in ("processo", "nb"):
            if not k.get(campo) and b.get(campo):
                k[campo] = b[campo]
                resgatados += 1
    if resgatados:
        print(f"  processo/NB preservados do banco (To Do vazio): {resgatados}")

    # O PRAZO FATAL, A ⭐ E A ESPÉCIE MARCADOS NO CRM NÃO VOLTAM AO DA TAREFA. A
    # equipe registra no CRM desde outubro; a tarefa sem data apagava o prazo
    # posto no caso (F38), e a sem espécie reconhecível apagava a do catálogo
    # do CRM (ou a trocava pelo nome do To Do). Só os casos abertos com algum
    # deles, e não a carteira (E2); no encerrado, a espécie vazia não vai (abaixo).
    manter_dados_do_banco(mapa, _rest_todas(
        url, chave, "/rest/v1/casos?todo_task_id=not.is.null&fase=neq.encerrado"
                    "&or=(prazo.not.is.null,importante.is.true,beneficio.not.is.null)"
                    "&select=id,prazo,todo_prazo,importante,beneficio"),
        "casos", ("prazo", "importante", "beneficio"))
    n_desp = respeitar_despacho(mapa, _rest_todas(
        url, chave, "/rest/v1/casos?todo_task_id=not.is.null&ronda->despacho=not.is.null"
                    "&ronda->despacho->>todo=is.null&select=id,ronda"))
    if n_desp:
        print(f"  despachados no CRM ainda sem ponte (⭐ apagada mantida): {n_desp}")

    # A LISTA 💵 PAGAMENTOS É A ABA PAGAMENTOS DO CLIENTE, NÃO UM CASO.
    # Mesmo princípio de 🙏 Aposentadorias Futuras -> aba 🔔 Lembretes: lista do
    # To Do não vira processo. Uma tarefa criada direto na lista de pagamentos
    # nascia como um segundo "caso" do cliente, disputando a ficha com o
    # processo de verdade. Agora ela não vira caso: as parcelas chegam à aba
    # pelo cliente_id, e o que estava escrito no corpo entra na linha do tempo
    # do caso principal do cliente, quando ele tem um.
    #
    # Casos de pagamento que JÁ EXISTEM no banco ficam como estão — carregam
    # andamentos de meses, e reescrever isso seria perder história. Quem quiser
    # limpá-los usa o "Encerrar caso" da ficha, um a um, com registro.
    novos_pgto = {k["id"] for k in mapa["casos"]
                  if k.get("origem_lista") == "💵 Pagamentos" and k["id"] not in guardado}
    if novos_pgto:
        principal = {}
        for k in mapa["casos"]:
            if k["id"] in novos_pgto:
                continue
            atual = principal.get(k["cliente_id"])
            if not atual or (atual.get("fase") == "encerrado"
                             and k.get("fase") != "encerrado"):
                principal[k["cliente_id"]] = k
        destino = {k["id"]: (principal.get(k["cliente_id"]) or {}).get("id")
                   for k in mapa["casos"] if k["id"] in novos_pgto}
        # QUANTOS casos o cliente tem importa para o dinheiro: com um só, a
        # parcela se encosta nele sem dúvida; com dois ou mais, encostá-la no
        # "principal" seria um chute — e chute silencioso vira honorário
        # contabilizado no benefício errado. Nesse caso a parcela fica sem
        # caso e a aba Pagamentos pede para escolher o benefício/serviço.
        quantos = {}
        for k in mapa["casos"]:
            if k["id"] not in novos_pgto:
                quantos[k["cliente_id"]] = quantos.get(k["cliente_id"], 0) + 1
        for pg in mapa.get("pagamentos", []):
            if pg.get("caso_id") in destino:
                unico = quantos.get(pg.get("cliente_id"), 0) == 1
                pg["caso_id"] = destino[pg["caso_id"]] if unico else None
        soltos = 0
        # F78, a CAUSA RAIZ da sincronização caída desde 22/08: este loop se
        # chamava "for chave in (...)" e SOMBREAVA a variável `chave` com a
        # service key do Supabase — depois dele, chave = "tarefas" (7 letras)
        # e todo _rest seguinte tomava 401 "Invalid API key". Nunca reusar o
        # nome `chave` (nem `url`) dentro de subir_rest.
        for chave_m in ("andamentos", "eventos", "tarefas"):
            mantidos = []
            for linha in mapa.get(chave_m, []):
                if linha.get("caso_id") in destino:
                    alvo = destino[linha["caso_id"]]
                    if not alvo:            # cliente sem nenhum outro caso
                        soltos += 1
                        continue
                    linha["caso_id"] = alvo
                mantidos.append(linha)
            mapa[chave_m] = mantidos
        mapa["casos"] = [k for k in mapa["casos"] if k["id"] not in novos_pgto]
        print(f"  💵 Pagamentos: {len(novos_pgto)} tarefa(s) sem caso próprio — "
              "as parcelas vão para a aba do cliente"
              + (f"; {soltos} anotação(ões) sem caso onde entrar" if soltos else ""))

    # A LISTA 🙋 ESCRITÓRIO TAMBÉM NÃO É LISTA DE CASOS (pedido do Paulo).
    # Terceira lista a sair do modelo "tarefa = processo", junto de 💵 Pagamentos
    # e 🙏 Aposentadorias Futuras. Quem está no Escritório ainda não tem
    # processo nenhum: é cliente em atendimento, atrás de documento. Virava caso
    # com sub-abas de Andamento INSS e CRPS que nunca teriam conteúdo — e, pior,
    # inflava a conta de "casos em andamento" do escritório.
    #
    # Agora a tarefa nova dessa lista entra no CADASTRO do cliente:
    #   corpo datado  -> campos.atendimento (o quadro 🗒 Anotações da ficha)
    #   checklist     -> campos.docs_pedidos (o "já pedimos ao cliente")
    #   benefício     -> campos.especie, quando o cadastro ainda não tem uma
    # Casos de Escritório que JÁ EXISTEM no banco ficam como estão: carregam
    # andamentos de meses, e reescrever isso seria perder história.
    novos_escr = {k["id"] for k in mapa["casos"]
                  if k.get("origem_lista") == "🙋 Escritório" and k["id"] not in guardado}
    if novos_escr:
        por_caso = {k["id"]: k for k in mapa["casos"] if k["id"] in novos_escr}
        # o campos é um jsonb inteiro: sem ler o que já está lá, o PATCH
        # apagaria os dados civis e os documentos pedidos no app
        # E2 · só o cadastro de quem tem tarefa nova no Escritório, e não o
        # de todos os clientes (eram 280 KB a cada rodada)
        campos_banco = {}
        afetados = sorted({k["cliente_id"] for k in por_caso.values() if k.get("cliente_id")})
        try:
            for i in range(0, len(afetados), 100):
                for c in _rest_todas(url, chave, "/rest/v1/clientes?select=id,campos"
                                     f"&id=in.({','.join(afetados[i:i + 100])})"):
                    campos_banco[c["id"]] = c.get("campos") or {}
        except BancoRecusou:
            campos_banco = None
        if campos_banco is None:
            print("  aviso: não consegui ler clientes.campos — as tarefas de "
                  "🙋 Escritório ficaram como caso nesta rodada")
            novos_escr = set()
    if novos_escr:
        anot, pedidos = {}, {}
        for a in mapa["andamentos"]:
            k = por_caso.get(a.get("caso_id"))
            if not k:
                continue
            quem = a.get("autor_id")
            anot.setdefault(k["cliente_id"], []).append({
                "id": a["id"], "em": a["criado_em"], "texto": a["texto"],
                "quem": quem[1] if isinstance(quem, tuple) else None,
                "origem": "todo",
            })
        for tf in mapa.get("tarefas", []):
            k = por_caso.get(tf.get("caso_id"))
            if not k:
                continue
            item = {"nome": tf["titulo"],
                    "entregue": (tf.get("concluida_em") or "")[:10] or None}
            if tf.get("concluida") and not item["entregue"]:
                # item marcado no To Do sem data: entra como entregue hoje, senão
                # a ficha o mostraria de novo como pendência do cliente
                item["entregue"] = datetime.date.today().isoformat()
            p = pedidos.setdefault(k["cliente_id"], {
                "id": k["id"], "em": None, "quem": "To Do",
                "especie": k.get("beneficio"), "itens": []})
            p["itens"].append(item)
        # espécie do atendimento: só entra quando o cadastro não tem uma
        especie = {}
        for kid, k in por_caso.items():
            if k.get("beneficio"):
                especie.setdefault(k["cliente_id"], k["beneficio"])
        gravados = 0
        for cid in set(list(anot) + list(pedidos) + list(especie)):
            campos = dict(campos_banco.get(cid) or {})
            if cid in anot:
                # F173 · o bloco completado no To Do chega com outro id: a
                # versão antiga, que é o começo da nova (mesmo dia e autor),
                # sai em vez de ficar repetida na ficha
                def _n(t):
                    return " ".join(str(t or "").split())
                novas = [(str(x.get("em") or "")[:10], x.get("quem") or "", _n(x.get("texto")))
                         for x in anot[cid]]
                def _engolida(n):
                    t = _n(n.get("texto"))
                    return bool(t) and any(d == str(n.get("em") or "")[:10] and q == (n.get("quem") or "")
                                           and len(u) > len(t) and u.startswith(t) for d, q, u in novas)
                velhas = [n for n in (campos.get("atendimento") or [])
                          if n.get("id") not in {x["id"] for x in anot[cid]} and not _engolida(n)]
                campos["atendimento"] = sorted(
                    velhas + anot[cid], key=lambda n: n.get("em") or "")
            if cid in pedidos:
                outros = [p for p in (campos.get("docs_pedidos") or [])
                          if p.get("id") != pedidos[cid]["id"]]
                campos["docs_pedidos"] = outros + [pedidos[cid]]
            if cid in especie and not campos.get("especie"):
                campos["especie"] = especie[cid]
            try:
                _rest(url, chave, "PATCH", f"/rest/v1/clientes?id=eq.{cid}",
                      {"campos": campos}, "return=minimal")
                gravados += 1
            except BancoRecusou as e:
                print(f"  aviso: cadastro {cid} não recebeu as anotações ({e})")
        # o caso e o que pendurava nele saem do lote — sem caso, a FK recusaria
        for chave_t in ("andamentos", "eventos", "tarefas"):
            mapa[chave_t] = [l for l in mapa.get(chave_t, [])
                             if l.get("caso_id") not in novos_escr]
        mapa["casos"] = [k for k in mapa["casos"] if k["id"] not in novos_escr]
        print(f"  🙋 Escritório: {len(novos_escr)} tarefa(s) sem caso próprio — "
              f"viraram anotações no cadastro de {gravados} cliente(s)")

    # 🔔 lembretes de Aposentadorias Futuras — três cuidados:
    # 1. MERGE NÃO-DESTRUTIVO: adiar, mudar intervalo, trocar título ou
    #    responsável são edições do APP e o banco vence; a importação só
    #    renova as anotações (detalhes). Exceção: tarefa CONCLUÍDA no To Do
    #    desliga o lembrete (ativo=false vence o banco).
    # 2. Caso já transformado À MÃO (casoViraLembrete gravou origem_caso):
    #    não nasce um segundo lembrete para a mesma tarefa.
    # 3. Casos antigos dessa lista que ainda estão abertos no banco são
    #    ENCERRADOS (não apagados — andamentos e histórico ficam), porque o
    #    lugar deles agora é a aba 🔔 Lembretes.
    try:
        lemb_exist = {l["id"]: l for l in _rest_todas(
            url, chave, "/rest/v1/lembretes?select=id,titulo,proximo_em,todo_prazo,"
                        "intervalo_meses,ativo,responsavel_id,origem_caso")}
    except BancoRecusou:
        lemb_exist = None                    # banco sem a tabela: só avisa adiante
    if lemb_exist is not None and mapa.get("lembretes"):
        convertidos = {l["origem_caso"] for l in lemb_exist.values()
                       if l.get("origem_caso")}
        mantidos = []
        for l in mapa["lembretes"]:
            task_id = (l.get("detalhes") or {}).get("todo_task_id")
            if exist_por_task.get(task_id) in convertidos:
                continue                     # já virou lembrete à mão
            b = lemb_exist.get(l["id"])
            if b:
                manter_lembrete(l, b)
            mantidos.append(l)
        mapa["lembretes"] = mantidos
    elif lemb_exist is None and mapa.get("lembretes"):
        print(f"  aviso: banco sem a tabela 'lembretes' — "
              f"{len(mapa['lembretes'])} lembrete(s) de Aposentadorias Futuras "
              "esperando o schema_por_em_dia.sql")
        mapa["lembretes"] = []

    # anti-eco: o que o app já criou (poucas linhas — só origem='app', mas o
    # dia em que passarem de 1000 o corte silencioso duplicaria os blocos)
    app_rows = _rest_todas(url, chave,
                           "/rest/v1/andamentos?origem=eq.app&select=caso_id,criado_em,texto")
    existentes = {(a["caso_id"], a["criado_em"][:10], md5(a["texto"])) for a in app_rows}
    mapa["andamentos"] = anti_eco(mapa["andamentos"], existentes)
    mapa["tarefas_docs"] = tarefas_docs_de(mapa["andamentos"])

    # eventos deduplicam pela trinca caso+tipo+data (o app também cria eventos,
    # com id próprio — conflitar por id geraria violação do índice de dedupe)
    ordem = [
        ("clientes", "clientes", "merge-duplicates", "id"),
        ("credenciais", "credenciais", "ignore-duplicates", "id"),
        ("vinculos", "vinculos", "ignore-duplicates", "cliente_id,ligado_a"),
        ("casos", "casos", "merge-duplicates", "id"),
        # tarefa sem espécie reconhecível: o caso vai sem a coluna (ver abaixo)
        ("casos_sem_especie", "casos", "merge-duplicates", "id"),
        ("andamentos", "andamentos", "ignore-duplicates", "id"),
        ("eventos", "eventos", "ignore-duplicates", "caso_id,tipo,data_hora"),
        ("tarefas", "tarefas", "merge-duplicates", "id"),
        # P4 · a etapa do caso sem data no To Do vai sem a coluna: a data de entrega dada no CRM fica
        ("tarefas_sem_prazo", "tarefas", "merge-duplicates", "id"),
        # parcelas do To Do: o item concluído atualiza a MESMA linha (o
        # unique parcial em todo_item_id é a trava); conferências do app
        # ficam intactas — o upsert só toca as colunas enviadas
        ("pagamentos", "pagamentos", "merge-duplicates", "todo_item_id"),
        # item ainda aberto no To Do: vai sem status nem pago_em (ver abaixo)
        ("pagamentos_abertos", "pagamentos", "merge-duplicates", "todo_item_id"),
        # docs solicitados citados em andamentos: só insere — concluir no app fica
        ("tarefas_docs", "tarefas", "ignore-duplicates", "id"),
        # 🙏 Aposentadorias Futuras: id determinístico por tarefa; o merge
        # acima já devolveu as colunas que o app edita, então o upsert só
        # renova as anotações de fato
        ("lembretes", "lembretes", "merge-duplicates", "id"),
    ]
    # UMA LINHA NÃO PODE DERRUBAR A SINCRONIZAÇÃO INTEIRA.
    #
    # O PostgREST recusa o LOTE quando uma linha viola uma restrição. Com
    # lotes de 500, um único caso numa fase que o banco não conhecia barrou os
    # 2.953 casos — e, com eles, os andamentos, os eventos e as tarefas.
    # Semanas de To Do deixaram de chegar ao CRM por causa de um cliente.
    #
    # Agora o lote recusado é partido ao meio, e ao meio de novo, até sobrar a
    # linha culpada. O resto entra. No fim, as culpadas aparecem nomeadas — e
    # o processo ainda termina com erro, para ninguém achar que passou limpo.
    #
    # MAS NEM TODO "NÃO" É DE UMA LINHA. Quando falta uma coluna ou um índice,
    # o banco recusa QUALQUER linha daquela tabela — e a busca binária vira um
    # desperdício que ainda derruba a sincronização inteira:
    # 2.621 parcelas do To Do sem o índice único de `todo_item_id` (seção 12 do
    # schema_por_em_dia.sql, ainda não rodado) geraram milhares de requisições,
    # 28 minutos de passo e, no fim, exit 1 — e o CRM passou o dia dizendo que
    # não sincronizava, embora clientes, casos, andamentos e tarefas tivessem
    # entrado normalmente. Erro de ESQUEMA agora pula a tabela inteira de uma
    # vez, avisa em alto e bom som e deixa o resto da rodada terminar.
    ERROS_DE_ESQUEMA = ("42P10", "42703", "PGRST204", "PGRST205",
                        "does not exist", "schema cache")
    recusadas = []
    sem_schema = {}
    pulando = set()

    def enviar(tabela, conflito, res, linhas):
        if not linhas or tabela in pulando:
            return
        try:
            _rest(url, chave, "POST", f"/rest/v1/{tabela}?on_conflict={conflito}",
                  linhas, prefer=f"resolution={res},return=minimal")
        except BancoRecusou as e:
            msg = str(e)
            if any(x in msg for x in ERROS_DE_ESQUEMA):
                pulando.add(tabela)
                sem_schema[tabela] = msg[:300]
                return
            # o evento que o CRM remarcou ou levou a outro caso guarda o id do original:
            # a chave primária repetida é o "já existe" do ignore-duplicates, não recusa
            if len(linhas) == 1 and res == "ignore-duplicates" and "_pkey" in msg:
                return
            if len(linhas) == 1:
                recusadas.append((tabela, linhas[0].get("id"), msg[:300]))
                return
            meio = len(linhas) // 2
            enviar(tabela, conflito, res, linhas[:meio])
            enviar(tabela, conflito, res, linhas[meio:])

    # F220 · o que o CRM decidiu sobre o caso vale sobre o To Do: o caso movido
    # (mover_para) não volta à lista antiga, o fundido continua encerrado e o
    # número levado a outro caso não volta ao caso de onde saiu.
    # [BUG 17.10.2026] arquivados nunca é nulo (o padrão é '{}'): o filtro
    # antigo trazia os 3.433 casos numa página só, o Supabase cortava em 1000
    # linhas e 10 dos 11 casos marcados ficavam de fora — o caso mandado para
    # 🗓 Tarefas com Prazo voltava ao Escritório. Agora vêm só os marcados, e
    # todos; se o banco recusar o filtro de jsonb, o antigo, paginado.
    marcados = []
    for filtro in ("arquivados.neq.%7B%7D", "arquivados.not.is.null"):
        try:
            marcados = _rest_todas(url, chave, f"/rest/v1/casos?or=(mover_para.not.is.null,{filtro})"
                                               "&select=id,mover_para,fase,arquivados")
            break
        except Exception as e:                  # noqa: BLE001 — sem a leitura, o comportamento antigo
            print(f"  aviso: não li as marcas do CRM nos casos ({e})")
    limpar_mover = respeitar_movidos(mapa, marcados)
    n_marcas = aplicar_marcas_do_crm(mapa, marcados)
    if n_marcas:
        print(f"  números e fusões decididos no CRM mantidos: {n_marcas}")
    n_fus = redirecionar_fundidos(mapa, marcados)
    if n_fus:
        print(f"  anotações, eventos e tarefas de casos fundidos levados ao destino: {n_fus}")

    # 💵 ABERTO -> RECEBIDO, NUNCA O CONTRÁRIO. O item ainda aberto no To Do não
    # manda status nem pago_em: a parcela que o CRM deu por recebida (botão
    # Recebido) voltava a "aberto" a cada rodada. O item marcado continua
    # dando a parcela por recebida; a parcela nova nasce "aberto" pelo padrão.
    pgs = mapa.get("pagamentos") or []
    mapa["pagamentos"] = [p for p in pgs if p.get("status") == "recebido"]
    mapa["pagamentos_abertos"] = [{col: v for col, v in p.items() if col not in ("status", "pago_em")}
                                  for p in pgs if p.get("status") != "recebido"]
    # a espécie vazia não vai: no caso encerrado (fora da leitura acima) ela
    # apagava a do CRM; o caso novo nasce sem espécie, pelo padrão da coluna
    ks = mapa.get("casos") or []
    mapa["casos"] = [k for k in ks if k.get("beneficio")]
    mapa["casos_sem_especie"] = [{col: v for col, v in k.items() if col != "beneficio"}
                                 for k in ks if not k.get("beneficio")]

    separar_prazo_vazio(mapa)

    for chave_mapa, tabela, res, conflito in ordem:
        linhas = resolver(mapa.get(chave_mapa, []))
        antes = len(recusadas)
        for i in range(0, len(linhas), 500):
            enviar(tabela, conflito, res, linhas[i:i + 500])
        caiu = len(recusadas) - antes
        if tabela in pulando:
            print(f"  {chave_mapa}: 0 enviadas — {len(linhas)} esperando o schema")
        else:
            print(f"  {chave_mapa}: {len(linhas) - caiu} linhas enviadas"
                  + (f", {caiu} recusada(s)" if caiu else ""))

    # F296 · as etapas do To Do que não têm campo vão à ficha como nota (clientes.campos.notas_todo, a chave inteira é
    # do To Do e se regrava). Lê o campos de quem tem nota, para o PATCH não apagar o resto do jsonb.
    # shortcut: o cliente que perdeu todas as notas no To Do fica com as antigas, até a próxima nota dele
    notas = mapa.get("notas_ficha") or {}
    ids_cli = {c["id"] for c in mapa.get("clientes") or []}
    alvo = sorted(cid for cid in notas if cid in ids_cli)
    gravadas = 0
    try:
        campos_de = {}
        for i in range(0, len(alvo), 100):
            for c in _rest_todas(url, chave, "/rest/v1/clientes?select=id,campos&id=in.(" + ",".join(alvo[i:i + 100]) + ")"):
                campos_de[c["id"]] = c.get("campos") or {}
        for cid in alvo:
            if cid not in campos_de or campos_de[cid].get("notas_todo") == notas[cid]:
                continue
            _rest(url, chave, "PATCH", f"/rest/v1/clientes?id=eq.{cid}",
                  {"campos": {**campos_de[cid], "notas_todo": notas[cid]}}, "return=minimal")
            gravadas += 1
    except Exception as e:                      # noqa: BLE001 — a nota não derruba a rodada
        print(f"  aviso: notas da ficha vindas do To Do não gravadas ({e})")
    if gravadas:
        print(f"  🗒 fichas com notas do To Do atualizadas: {gravadas}")
    # a etapa que é dado (NB, senha, parente, CNPJ...) e já tinha virado subtarefa sai da lista de tarefas do caso;
    # o dado continua na ficha. Apagar é decisão do escritório: só com LIMPAR_ETAPAS_DADO=1
    if os.environ.get("LIMPAR_ETAPAS_DADO") == "1":
        sub = mapa.get("subtarefas_dado") or []
        tiradas = 0
        try:
            for i in range(0, len(sub), 100):
                tiradas += len(_rest(url, chave, "DELETE", "/rest/v1/tarefas?id=in.(" + ",".join(sub[i:i + 100]) + ")&select=id",
                                     prefer="return=representation") or [])
        except Exception as e:                  # noqa: BLE001
            print(f"  aviso: não tirei as etapas que eram dado da ficha ({e})")
        print(f"  etapas do To Do que eram dado da ficha, tiradas das tarefas: {tiradas}")

    # 💵 o item que é dado do cliente (senha, CPF, telefone...) e já tinha virado
    # parcela sai da aba. Só a linha que nasceu deste item do To Do e que o CRM
    # nunca tocou (sem conferência, nem "Recebido"); o item continua no To Do.
    # Apagar é decisão do escritório: a faxina só roda com LIMPAR_PARCELAS_FALSAS=1, e só na parcela aberta.
    fora = sorted(set(mapa.get("fora_de_pagamentos") or [])) if os.environ.get("LIMPAR_PARCELAS_FALSAS") == "1" else []
    tirados = 0
    try:
        for i in range(0, len(fora), 100):
            tirados += len(_rest(url, chave, "DELETE",
                                 "/rest/v1/pagamentos?todo_item_id=in.(" + ",".join(fora[i:i + 100])
                                 + ")&conferencias=eq.%5B%5D&status=eq.aberto&select=todo_item_id",
                                 prefer="return=representation") or [])
    except Exception as e:                      # noqa: BLE001 — a faxina não derruba a rodada
        print(f"  aviso: não tirei da aba Pagamentos os itens que não são parcela ({e})")
    if tirados:
        print(f"  💵 itens do checklist que não são parcela (senha, CPF, telefone...) tirados da aba: {tirados}")

    # o To Do alcançou o CRM (ou a tarefa foi concluída): o mover_para cumpriu o papel
    if limpar_mover:
        try:
            _rest(url, chave, "PATCH", "/rest/v1/casos?id=in.(" + ",".join(limpar_mover) + ")",
                  {"mover_para": None}, prefer="return=minimal")
            print(f"  casos movidos no CRM que o To Do alcançou: {len(limpar_mover)}")
        except Exception as e:                  # noqa: BLE001
            print(f"  aviso: não limpei o mover_para de {len(limpar_mover)} caso(s): {e}")

    # 3. os casos abertos que sobraram na fase aposentadoria_futura vindos do
    # To Do: encerra (o lembrete acima é quem carrega a obrigação agora).
    # Casos criados NO APP nessa fase (sem todo_task_id) ficam como estão.
    if lemb_exist is not None:
        abertos = _rest_todas(
            url, chave, "/rest/v1/casos?fase=eq.aposentadoria_futura"
                        "&todo_task_id=not.is.null&select=id,todo_task_id")
        agora = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
        encerrados = 0
        for k in abertos:
            try:
                _rest(url, chave, "PATCH", f"/rest/v1/casos?id=eq.{k['id']}",
                      {"fase": "encerrado", "encerrado_em": agora},
                      prefer="return=minimal")
                encerrados += 1
            except BancoRecusou as e:
                recusadas.append(("casos", k["id"], str(e)[:300]))
        if encerrados:
            print(f"  casos de 🙏 Aposentadorias Futuras encerrados "
                  f"(viraram lembrete): {encerrados}")

    # tabela inteira parada por falta de coluna/índice: é AVISO, não falha. A
    # rodada segue, o carimbo é gravado e o CRM continua em dia com o resto —
    # o que falta é uma migração no banco, e derrubar a sincronização por causa
    # dela só escondia que todo o restante tinha entrado.
    if sem_schema:
        for tabela, msg in sem_schema.items():
            print(f"::warning::A tabela '{tabela}' não recebeu nada: falta rodar "
                  f"crm/fase2/schema_por_em_dia.sql no Supabase. Resposta do banco: {msg}")

    # [BUG 20.09.2026] PUNHADO DE LINHAS RECUSADAS É AVISO, NÃO PARADA.
    # O resto da carteira já entrou, e derrubar a rodada só escondia isso: o
    # carimbo não era gravado, o CRM dizia "sem sincronizar" e o escritório
    # passava o dia achando que nada tinha chegado. Erro em massa continua
    # derrubando, porque aí é o banco ou o esquema que estão fora do ar.
    if recusadas:
        det = "\n".join(f"  {t} id={i}: {m}" for t, i, m in recusadas[:10])
        recado = f"{len(recusadas)} linha(s) o banco recusou (o resto entrou):\n{det}"
        if len(recusadas) > LIMITE_RECUSADAS:
            raise BancoRecusou(recado)
        print(f"::warning::{recado}")

    # o carimbo que o CRM mostra no rodapé do menu ("🔄 To Do há X min").
    # Só depois de TUDO entrar — sincronização pela metade não conta.
    try:
        _rest(url, chave, "POST", "/rest/v1/config_app",
              [{"chave": "todo_sync_em",
                "valor": datetime.datetime.now(datetime.timezone.utc)
                    .isoformat(timespec="seconds")}],
              prefer="resolution=merge-duplicates,return=minimal")
    except Exception as e:                      # noqa: BLE001 — carimbo é cortesia
        print(f"  aviso: não gravei o carimbo da sincronização: {e}")


def cpf_por_nome_do_banco():
    """{nome_chave: {cpf}} das fichas com CPF (F256); sem banco, vazio."""
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    chave = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not url or not chave:
        return {}
    try:
        linhas = _rest_todas(url, chave, "/rest/v1/clientes?cpf=not.is.null&select=nome,cpf")
    except Exception as e:
        print(f"::warning::sem as fichas com CPF para juntar nomes parecidos ({e})")
        return {}
    out = {}
    for l in linhas:
        cpf = re.sub(r"\D", "", l.get("cpf") or "")
        if len(cpf) == 11 and l.get("nome"):
            out.setdefault(nome_chave(l["nome"]), set()).add(cpf)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--entrada", default=str(ENTRADA))
    ap.add_argument("--sql", help="gera um arquivo .sql em vez de enviar via REST")
    args = ap.parse_args(argv)

    dados = json.loads(pathlib.Path(args.entrada).read_text(encoding="utf-8"))
    mapa = mapear(dados, None if args.sql else cpf_por_nome_do_banco())
    resumo = {t: len(mapa[t]) for t in ("clientes", "casos", "andamentos", "eventos", "pagamentos",
                                        "lembretes", "tarefas", "credenciais", "vinculos")}
    print("mapeado:", resumo)
    if mapa["pulados"]:
        print("pulado (listas fora do CRM, sem CPF):",
              ", ".join(f"{k}={v}" for k, v in sorted(mapa["pulados"].items())))

    if args.sql:
        # anti-eco não se aplica na 1ª carga (banco vazio)
        mapa["tarefas_docs"] = tarefas_docs_de(mapa["andamentos"])
        pathlib.Path(args.sql).write_text(gerar_sql(mapa), encoding="utf-8")
        print(f"SQL gravado em {args.sql} — rode com psql ou no SQL Editor.")
    else:
        try:
            subir_rest(mapa)
        except BancoRecusou as e:
            sys.exit(str(e))
        print("importação concluída.")


if __name__ == "__main__":
    main()
