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
    "🗓 Tarefas com Prazo": "outro",
}
LISTA_PARTICULAR = "Tarefas"        # lista pessoal do To Do -> tarefas do Paulo
DONO_PARTICULAR = "P"
TZ = "-03:00"                        # America/Sao_Paulo (sem DST desde 2019)
RE_PROTOCOLO = re.compile(r"protocolo\D{0,12}(\d{6,})", re.I)

# A senha padrão do escritório NUNCA vai no código (o repositório é público):
# vem do GitHub Secret SENHA_PADRAO_MEUINSS. Item de checklist "Padrão" no
# To Do significa que o cliente usa essa senha no Meu INSS.
SENHA_PADRAO = os.environ.get("SENHA_PADRAO_MEUINSS")

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


def uid(*partes):
    return str(uuid.uuid5(NS, "|".join(str(p) for p in partes)))


def md5(s):
    return hashlib.md5((s or "").encode()).hexdigest()


def _cliente_key(t):
    return ("cpf", t["cpf"]) if t["cpf"] else ("nome", t["nome"] or t["titulo"])


def mapear(dados):
    """crm.json -> dicionário de linhas por tabela (ids determinísticos)."""
    clientes, casos, andamentos, eventos, tarefas = {}, {}, {}, {}, {}
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
            hora = e["hora"] or "09:00"
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
    return len(troca)


def anti_eco(linhas, existentes_app):
    """Remove blocos importados do To Do que são eco de andamentos criados no
    app (a escrita dupla devolve o texto ao To Do; sem isto, duplicaria).
    existentes_app: conjunto de (caso_id, dia, md5(texto))."""
    return [a for a in linhas
            if (a["caso_id"], a["_dia"], a["_md5"]) not in existentes_app]


def _limpar(a):
    return {k: v for k, v in a.items() if not k.startswith("_")}


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
        "commit;",
    ]))


# ── modo REST (Supabase) ──────────────────────────────────────────────────

def _rest(url, chave, metodo, caminho, corpo=None, prefer=None):
    req = urllib.request.Request(
        url.rstrip("/") + caminho,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={
            "apikey": chave, "Authorization": f"Bearer {chave}",
            "Content-Type": "application/json",
            **({"Prefer": prefer} if prefer else {}),
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def subir_rest(mapa):
    url = os.environ.get("SUPABASE_URL")
    chave = os.environ.get("SUPABASE_SERVICE_KEY")
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
    exist = _rest(url, chave, "GET",
                  "/rest/v1/casos?todo_task_id=not.is.null&select=id,todo_task_id") or []
    n = remapear_casos(mapa, {c["todo_task_id"]: c["id"] for c in exist})
    if n:
        print(f"  casos remapeados para ids já existentes: {n}")

    # anti-eco: o que o app já criou (poucas linhas — só origem='app')
    app_rows = _rest(url, chave, "GET",
                     "/rest/v1/andamentos?origem=eq.app&select=caso_id,criado_em,texto") or []
    existentes = {(a["caso_id"], a["criado_em"][:10], md5(a["texto"])) for a in app_rows}
    mapa["andamentos"] = anti_eco(mapa["andamentos"], existentes)

    # eventos deduplicam pela trinca caso+tipo+data (o app também cria eventos,
    # com id próprio — conflitar por id geraria violação do índice de dedupe)
    ordem = [
        ("clientes", "merge-duplicates", "id"),
        ("credenciais", "ignore-duplicates", "id"),
        ("vinculos", "ignore-duplicates", "cliente_id,ligado_a"),
        ("casos", "merge-duplicates", "id"),
        ("andamentos", "ignore-duplicates", "id"),
        ("eventos", "ignore-duplicates", "caso_id,tipo,data_hora"),
        ("tarefas", "merge-duplicates", "id"),
    ]
    for tabela, res, conflito in ordem:
        linhas = resolver(mapa[tabela])
        for i in range(0, len(linhas), 500):
            _rest(url, chave, "POST", f"/rest/v1/{tabela}?on_conflict={conflito}",
                  linhas[i:i + 500],
                  prefer=f"resolution={res},return=minimal")
        print(f"  {tabela}: {len(linhas)} linhas enviadas")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--entrada", default=str(ENTRADA))
    ap.add_argument("--sql", help="gera um arquivo .sql em vez de enviar via REST")
    args = ap.parse_args(argv)

    dados = json.loads(pathlib.Path(args.entrada).read_text(encoding="utf-8"))
    mapa = mapear(dados)
    resumo = {t: len(mapa[t]) for t in ("clientes", "casos", "andamentos", "eventos",
                                        "tarefas", "credenciais", "vinculos")}
    print("mapeado:", resumo)
    if mapa["pulados"]:
        print("pulado (listas fora do CRM, sem CPF):",
              ", ".join(f"{k}={v}" for k, v in sorted(mapa["pulados"].items())))

    if args.sql:
        # anti-eco não se aplica na 1ª carga (banco vazio)
        pathlib.Path(args.sql).write_text(gerar_sql(mapa), encoding="utf-8")
        print(f"SQL gravado em {args.sql} — rode com psql ou no SQL Editor.")
    else:
        subir_rest(mapa)
        print("importação concluída.")


if __name__ == "__main__":
    main()
