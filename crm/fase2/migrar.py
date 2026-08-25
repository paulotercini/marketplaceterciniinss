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
    "Escritório": "escritorio",
    "Escritorio": "escritorio",
    "INSS": "inss",
    "Judicial": "judicial",
    "Conselho de Recursos": "conselho",
    "Recurso Administrativo": "conselho",
    "Recursos Administrativos": "conselho",
    "Pagamentos": "pagamento",
    "Aposentadorias Futuras": "aposentadoria_futura",
    "Petições Iniciais": "peticao_inicial",
    "Petição Inicial": "peticao_inicial",
    "Peticao Inicial": "peticao_inicial",
    "Impugnações": "judicial",
    "Impugnacoes": "judicial",
    "Audiências": "judicial",
    "Audiencias": "judicial",
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
    m = re.match(r"senha\b.*?[:\-\s]\s*(\S+)\s*$", t, re.I)
    if m:
        return ("senha", m.group(1))
    m = RE_CPF_FMT.search(t)
    if m:
        return ("cpf", "".join(m.groups()))
    if RE_TEL_ITEM.fullmatch(t):
        dig = re.sub(r"\D", "", t)
        if 10 <= len(dig) <= 11:
            return ("telefone", dig)
    if re.fullmatch(r"[\d\s./\-]+", t):            # só números (com separadores)
        dig = re.sub(r"\D", "", t)
        if len(dig) < 6 or (cpf_cliente and dig == cpf_cliente):
            return ("dado", None)
        if len(dig) == 11 and not cpf_cliente:
            return ("cpf", dig)
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
    if 2 <= len(palavras) <= 6 and all(
            re.fullmatch(r"[A-Za-zÀ-ÿ'.]+", p) for p in palavras):
        rel = mrel.group(1).strip().lower() if mrel else None
        return ("nome", (rel, resto))              # candidato a parente/amigo
    return ("tarefa", t)


def hora_valida(h):
    m = re.fullmatch(r"(\d{1,2}):(\d{2})", h or "")
    return bool(m) and int(m.group(1)) <= 23 and int(m.group(2)) <= 59


def uid(*partes):
    return str(uuid.uuid5(NS, "|".join(str(p) for p in partes)))


def md5(s):
    return hashlib.md5((s or "").encode()).hexdigest()


def _cliente_key(t):
    return ("cpf", t["cpf"]) if t["cpf"] else ("nome", t["nome"] or t["titulo"])


def mapear(dados):
    """crm.json -> dicionário de linhas por tabela (ids determinísticos)."""
    clientes, casos, andamentos, eventos, tarefas = {}, {}, {}, {}, {}
    pagamentos, lembretes = {}, {}
    credenciais, vinculos, pend_vinculos = {}, {}, []
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

        tipo, chave = _cliente_key(t)
        cid = uid("cliente", tipo, chave)
        c = clientes.setdefault(cid, {
            "id": cid, "cpf": t["cpf"], "nome": t["nome"] or t["titulo"],
            "dn": None, "telefone": None,
        })
        if t["nome"] and len(t["nome"]) > len(c["nome"] or ""):
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
                },
                "intervalo_meses": None,
                "proximo_em": t["prazo"],
                "ativo": not t["concluida"],
            }
            continue

        kid = uid("caso", t["id"])
        # protocolos do INSS citados em qualquer bloco — a busca do app acha
        # o cliente pelo número quando o INSS só divulga "concluído o protocolo X"
        protocolos = sorted({m for a in t["andamentos"]
                             for m in RE_PROTOCOLO.findall(a["texto"])})
        casos[kid] = {
            "id": kid, "cliente_id": cid, "titulo": t["titulo"],
            "beneficio": t["beneficio"],
            "parceria": t.get("parceria"),
            "protocolos": protocolos,
            "fase": "encerrado" if t["concluida"] else fase,
            "nb": t["nb"], "processo": t["processo"], "prazo": t["prazo"],
            "importante": t["importante"], "origem_lista": lista,
            "todo_task_id": t["id"],
            "encerrado_em": t["concluida_em"] and t["concluida_em"] + "T12:00:00" + TZ,
        }

        if lista == "💵 Pagamentos":
            for item in t.get("checklist") or []:
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
                                      bool(c_it.get("feito"))))
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
    nome_idx = {}
    for cli in clientes.values():
        nome_idx.setdefault(_norm(cli["nome"]), cli["id"])
    for cid, relacao, nome_txt, kid, txt, feito in pend_vinculos:
        outro = nome_idx.get(_norm(nome_txt))
        if outro and outro != cid:
            vid = uid("vinculo", cid, outro)
            vinculos[vid] = {"id": vid, "cliente_id": cid,
                             "ligado_a": outro, "relacao": relacao}
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
        "lembretes": list(lembretes.values()),
        "pulados": pulados,
    }


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
RE_VALOR_NUM = re.compile(r"\b(\d{2,7})\b")


def _num_br(s):
    try:
        v = float(s.replace(".", "").replace(",", "."))
    except ValueError:
        return None
    return v if v > 0 else None


def valor_do_item(texto):
    """O valor da parcela: R$ explícito > número com centavos > o MAIOR
    número solto (o 500 de "2ª parcela 500", nunca o 2 nem o 10/09)."""
    t = RE_DATA_BR.sub(" ", texto or "")
    m = RE_VALOR_RS.search(t)
    if m:
        return _num_br(m.group(1))
    m = RE_VALOR_DEC.search(t)
    if m:
        return _num_br(m.group(1))
    t = RE_DATA_PARCIAL.sub(" ", t)
    ns = [_num_br(x) for x in RE_VALOR_NUM.findall(t)]
    ns = [n for n in ns if n]
    return max(ns) if ns else None


def data_do_item(texto):
    m = RE_DATA_BR.search(texto or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


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
        acao = (f"do update set " + ", ".join(f"{c} = excluded.{c}" for c in update_cols)
                if update_cols else conflito)
        out.append(f"insert into {tabela} ({', '.join(cols)}) values\n{vals}\n"
                   f"on conflict ({chave}) {acao};")
    return "\n\n".join(out)


def gerar_sql(mapa):
    return "\n\n".join(filter(None, [
        "begin;",
        _sql_insert("clientes", mapa["clientes"],
                    update_cols=("nome", "dn", "telefone")),
        # senha nova editada no app nunca é sobrescrita: conflito = do nothing
        _sql_insert("credenciais", mapa.get("credenciais", [])),
        _sql_insert("vinculos", mapa.get("vinculos", []), chave="cliente_id, ligado_a"),
        _sql_insert("casos", mapa["casos"],
                    update_cols=("fase", "prazo", "importante", "beneficio",
                                 "parceria", "protocolos",
                                 "nb", "processo", "origem_lista", "encerrado_em")),
        _sql_insert("andamentos", mapa["andamentos"]),
        _sql_insert("eventos", mapa["eventos"], chave="caso_id,tipo,data_hora"),
        _sql_insert("tarefas", mapa["tarefas"],
                    update_cols=("prazo", "concluida", "concluida_em")),
        _sql_insert("pagamentos", mapa.get("pagamentos", []), chave="todo_item_id",
                    update_cols=("descricao", "valor", "status", "pago_em", "vencimento")),
        _sql_insert("lembretes", mapa.get("lembretes", []),
                    update_cols=("detalhes", "proximo_em", "ativo")),
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

    # casos que já existem no banco (inclusive criados no app): remapear
    exist = _rest_todas(url, chave,
                        "/rest/v1/casos?todo_task_id=not.is.null"
                        "&select=id,todo_task_id,processo,nb")
    n = remapear_casos(mapa, {c["todo_task_id"]: c["id"] for c in exist})
    if n:
        print(f"  casos remapeados para ids já existentes: {n}")

    # MERGE NÃO-DESTRUTIVO do processo/NB: o upsert manda a linha INTEIRA, e
    # tarefa sem número no To Do mandava processo=null — apagando, toda hora,
    # o CNJ que o Paulo tinha acabado de vincular pela coleta do PJe (e a
    # importação voltava a perguntar pelos mesmos processos). To Do com valor
    # continua mandando; To Do vazio deixa o que o app gravou.
    guardado = {c["id"]: c for c in exist}
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
        campos_banco = {}
        try:
            for c in _rest_todas(url, chave, "/rest/v1/clientes?select=id,campos"):
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
                velhas = [n for n in (campos.get("atendimento") or [])
                          if n.get("id") not in {x["id"] for x in anot[cid]}]
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
            url, chave, "/rest/v1/lembretes?select=id,titulo,proximo_em,"
                        "intervalo_meses,ativo,responsavel_id,origem_caso")}
    except BancoRecusou:
        lemb_exist = None                    # banco sem a tabela: só avisa adiante
    if lemb_exist is not None and mapa.get("lembretes"):
        exist_por_task = {c["todo_task_id"]: c["id"] for c in exist}
        convertidos = {l["origem_caso"] for l in lemb_exist.values()
                       if l.get("origem_caso")}
        mantidos = []
        for l in mapa["lembretes"]:
            task_id = (l.get("detalhes") or {}).get("todo_task_id")
            if exist_por_task.get(task_id) in convertidos:
                continue                     # já virou lembrete à mão
            b = lemb_exist.get(l["id"])
            if b:
                # responsavel_id não é enviado — o banco já preserva sozinho
                for campo in ("titulo", "proximo_em", "intervalo_meses"):
                    if b.get(campo) is not None:
                        l[campo] = b[campo]
                if l["ativo"]:               # só a conclusão no To Do desliga
                    l["ativo"] = b.get("ativo", True)
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
        ("andamentos", "andamentos", "ignore-duplicates", "id"),
        ("eventos", "eventos", "ignore-duplicates", "caso_id,tipo,data_hora"),
        ("tarefas", "tarefas", "merge-duplicates", "id"),
        # parcelas do To Do: o item concluído atualiza a MESMA linha (o
        # unique parcial em todo_item_id é a trava); conferências do app
        # ficam intactas — o upsert só toca as colunas enviadas
        ("pagamentos", "pagamentos", "merge-duplicates", "todo_item_id"),
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
            if len(linhas) == 1:
                recusadas.append((tabela, linhas[0].get("id"), msg[:300]))
                return
            meio = len(linhas) // 2
            enviar(tabela, conflito, res, linhas[:meio])
            enviar(tabela, conflito, res, linhas[meio:])

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

    if recusadas:
        det = "\n".join(f"  {t} id={i}: {m}" for t, i, m in recusadas[:10])
        raise BancoRecusou(
            f"{len(recusadas)} linha(s) o banco recusou (o resto entrou):\n{det}")

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


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--entrada", default=str(ENTRADA))
    ap.add_argument("--sql", help="gera um arquivo .sql em vez de enviar via REST")
    args = ap.parse_args(argv)

    dados = json.loads(pathlib.Path(args.entrada).read_text(encoding="utf-8"))
    mapa = mapear(dados)
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
