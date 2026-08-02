"""Fase 1 do CRM — sincronização (espelho somente-leitura).

Lê TODAS as listas do Microsoft To Do e normaliza em crm/data/crm.json:
clientes agrupados por CPF, casos (uma tarefa por lista = um caso), andamentos
com autor/data extraídos dos blocos `DD.MM.AAAA (X): texto`, e eventos de
perícia/audiência com data estruturada.

Duas fontes de dados:
    python3 crm/sync_todo.py                          # Graph API ao vivo (rode graph_refresh.py antes)
    python3 crm/sync_todo.py --backup caminho.json    # export/backup do To Do (mesmo formato do Graph)

A saída (crm/data/crm.json) contém dados sensíveis de clientes e NUNCA pode
ser commitada — está no .gitignore, como graph_tokens.json.
"""
import argparse, datetime, json, pathlib, re, sys, unicodedata

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from portal_common import cpf_from_task, dn_from_aniversario, dn_from_items, dn_from_body, split_blocks

SAIDA = pathlib.Path(__file__).resolve().parent / "data" / "crm.json"

# Iniciais usadas há anos nos blocos datados -> colaborador. "?" = sem autor
# identificado (bloco antigo ou anotação sem inicial).
COLABORADORES = {
    "P": "Paulo", "A": "Amanda", "M": "Marcos", "D": "André",
    "AD": "André", "I": "Ingrid", "C": "Claude", "L": "L", "G": "G",
}

# Listas que aparecem primeiro na coluna esquerda, na ordem do fluxo do
# escritório; as demais vão para o grupo "Outras listas". 💵 Pagamentos fica
# de fora de propósito: pagamento é etapa do caso, visto na ficha do cliente.
LISTAS_PRINCIPAIS = [
    "🗓 Tarefas com Prazo", "🙋 Escritório", "🌻 INSS", "👪 Judicial",
    "🖥 Conselho de Recursos", "🙏 Aposentadorias Futuras",
]

BENEFICIOS = [
    (r"revis[ãa]o", "Revisão"),
    (r"incapacidade tempor|aux[íi]lio[- ]doen", "Aux. Incapacidade Temporária"),
    (r"tempo de contribui", "Apos. Tempo de Contribuição"),
    (r"acerto.{0,10}cnis|\bcnis\b", "Acerto de CNIS"),
    (r"\bbpc\b|\bloas\b", "BPC/LOAS"),
    (r"aposentadoria por idade|apos.{0,12}idade", "Apos. por Idade"),
    (r"\brural\b|segurado especial", "Rural"),
    (r"pens[ãa]o por morte", "Pensão por Morte"),
    (r"aux[íi]lio[- ]acidente", "Aux. Acidente"),
    (r"invalidez|incapacidade perman", "Apos. por Incapacidade Permanente"),
    (r"aposentadoria especial|\bespecial\b", "Apos. Especial"),
    (r"sal[áa]rio[- ]maternidade", "Salário-Maternidade"),
]

# Etiquetas #B<código da espécie INSS> usadas nos títulos (ex.: "Fulano #123... #B31")
ESPECIES = {
    "21": "Pensão por Morte", "25": "Auxílio-Reclusão",
    "31": "Aux. Incapacidade Temporária", "32": "Apos. por Incapacidade Permanente",
    "36": "Aux. Acidente", "41": "Apos. por Idade", "42": "Apos. Tempo de Contribuição",
    "46": "Apos. Especial", "80": "Salário-Maternidade",
    "87": "BPC/LOAS", "88": "BPC/LOAS",
    "91": "Aux. Incapacidade Temporária", "92": "Apos. por Incapacidade Permanente",
}
RE_ESPECIE = re.compile(r"#B(\d{2})\b", re.I)

RE_AUTOR = re.compile(r"^\s*\(?\s*([A-Za-z]{1,2})\s*\)\s*[:;,.–-]?\s*")

# aceita "12/08/2026", "12/08" (ano deduzido da data do bloco), "às 07h40",
# "às 7h" e "07:40" — o formato real dos andamentos da equipe
RE_EVENTO = re.compile(
    r"(per[íi]cia|audi[êe]ncia|avalia[çc][ãa]o social)"
    r"[^\n]{0,120}?\b(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?"
    r"(?:[^\n]{0,20}?\b(\d{1,2})[:hH](\d{2})?)?",
    re.I,
)
RE_TELEFONE = re.compile(r"\(?\b\d{2}\)?\s?9?\d{4}[- ]?\d{4}\b")
RE_PROCESSO = re.compile(r"\b\d{7}-?\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b")
RE_NB = re.compile(r"\bNB[:\s]*(\d[\d.\-/ ]{7,})", re.I)


def _sem_acento(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()


def beneficio_de(texto):
    t = _sem_acento(texto or "").lower()
    for pat, nome in BENEFICIOS:
        if re.search(_sem_acento(pat), t):
            return nome
    return None


def autor_do_bloco(texto):
    """'(P); Petição protocolada' -> ('P', 'Petição protocolada')."""
    m = RE_AUTOR.match(texto or "")
    if m and m.group(1).upper() in COLABORADORES:
        return m.group(1).upper(), (texto[m.end():] or "").strip()
    return None, (texto or "").strip()


def eventos_de(texto, data_ref):
    """Extrai perícias/audiências com data do texto de um andamento."""
    out = []
    for m in RE_EVENTO.finditer(texto or ""):
        tipo = _sem_acento(m.group(1)).lower()
        tipo = {"pericia": "Perícia", "audiencia": "Audiência"}.get(tipo, "Avaliação social")
        try:
            if m.group(4):
                data = datetime.date(int(m.group(4)), int(m.group(3)), int(m.group(2)))
            else:
                # "12/08" sem ano: é o 12/08 seguinte à data do bloco —
                # anotado em 31.07.2026, entende-se 12.08.2026
                base = data_ref or datetime.date.today()
                data = datetime.date(base.year, int(m.group(3)), int(m.group(2)))
                if data < base:
                    data = data.replace(year=base.year + 1)
        except ValueError:
            continue
        hora = f"{int(m.group(5)):02d}:{m.group(6) or '00'}" if m.group(5) else None
        trecho = re.sub(r"\s+", " ", m.group(0)).strip()
        out.append({
            "tipo": tipo,
            "data": data.isoformat(),
            "hora": hora,
            "trecho": trecho[:160],
            "anotado_em": data_ref.isoformat() if data_ref else None,
        })
    return out


def nome_da_tarefa(titulo):
    """Remove '#CPF' e etiquetas (#B31, #DanoMoral...) do título, deixando o nome."""
    nome = re.sub(r"#\s*[\d.\-]{11,}", "", titulo or "")
    nome = re.sub(r"#\w+", "", nome).strip(" -–#")
    return re.sub(r"\s{2,}", " ", nome).strip()


def beneficio_do_titulo(titulo):
    """'Fulano #123 #B31' -> benefício da espécie 31 (prioridade sobre o texto)."""
    m = RE_ESPECIE.search(titulo or "")
    if m:
        return ESPECIES.get(m.group(1), f"Espécie {m.group(1)}")
    return None


def parceria_do_titulo(titulo):
    """'Fulana #123 #B31 #Laís #JoãoEduardo' -> 'Laís, JoãoEduardo'.
    Tags de texto no título são advogados parceiros; #B31 (espécie) e
    #CPF (dígitos) ficam de fora."""
    tags = re.findall(r"#([A-Za-zÀ-ÿ][\wÀ-ÿ]*)", titulo or "")
    parceiros = [t for t in tags if not re.fullmatch(r"[Bb]\d{1,3}", t)]
    return ", ".join(parceiros) or None


def normalizar_tarefa(lista_nome, t):
    corpo = ((t.get("body") or {}).get("content") or "")
    checklist = t.get("checklistItems") or []
    blocos = split_blocks(corpo)

    andamentos, eventos = [], []
    for data, texto in blocos:
        inicial, limpo = autor_do_bloco(texto)
        limpo = limpo.strip()
        if not limpo:
            continue
        andamentos.append({
            "data": data.isoformat(),
            "inicial": inicial or "?",
            "autor": COLABORADORES.get(inicial, "—"),
            "texto": limpo,
        })
        eventos.extend(eventos_de(limpo, data))

    preambulo = ""
    if blocos:
        primeiro = re.search(r"(?m)^\s*\d{2}[./]\d{2}[./]\d{4}\s*[\(\):;.-]", corpo.replace("\r\n", "\n"))
        if primeiro and primeiro.start() > 0:
            preambulo = corpo.replace("\r\n", "\n")[: primeiro.start()].strip()
    else:
        preambulo = corpo.strip()

    due = ((t.get("dueDateTime") or {}).get("dateTime") or "")[:10] or None
    concluida_em = ((t.get("completedDateTime") or {}).get("dateTime") or "")[:10] or None
    tel = RE_TELEFONE.search(preambulo) or RE_TELEFONE.search(corpo)
    proc = RE_PROCESSO.search(corpo)
    nb = RE_NB.search(corpo)

    return {
        "id": t.get("id"),
        "lista": lista_nome,
        "titulo": t.get("title") or "",
        "nome": nome_da_tarefa(t.get("title")),
        "cpf": cpf_from_task(t.get("title"), checklist),
        "dn": dn_from_aniversario(checklist) or dn_from_items(checklist) or dn_from_body(corpo),
        "telefone": tel.group(0) if tel else None,
        "processo": proc.group(0) if proc else None,
        "nb": nb.group(1).strip() if nb else None,
        "beneficio": beneficio_do_titulo(t.get("title"))
                     or beneficio_de(t.get("title", "") + "\n" + preambulo + "\n" + corpo[:1500]),
        "parceria": parceria_do_titulo(t.get("title")),
        "prazo": due,
        "importante": t.get("importance") == "high",
        "concluida": t.get("status") == "completed",
        "concluida_em": concluida_em,
        "criada_em": (t.get("createdDateTime") or "")[:10] or None,
        "atualizada_em": (t.get("lastModifiedDateTime") or "")[:10] or None,
        "preambulo": preambulo,
        "checklist": [
            {"texto": c.get("displayName", ""), "feito": bool(c.get("isChecked"))}
            for c in checklist
        ],
        "andamentos": andamentos,
        "eventos": eventos,
    }


def carregar_backup(caminho):
    bruto = json.loads(pathlib.Path(caminho).read_text(encoding="utf-8"))
    return [(e["list"].get("displayName", "?"), e["tasks"]) for e in bruto]


def carregar_graph():
    import graph_client
    pares = []
    for lst in graph_client.list_lists():
        nome, lid = lst.get("displayName", "?"), lst["id"]
        print(f"  baixando {nome}...", flush=True)
        # $expand traz o checklist (aniversário/CPF) junto, numa passada só
        tarefas, url = [], f"/me/todo/lists/{lid}/tasks?$top=50&$expand=checklistItems"
        while url:
            page = graph_client._req("GET", url)
            tarefas.extend(page["value"])
            url = page.get("@odata.nextLink")
        pares.append((nome, tarefas))
    return pares


def montar(pares):
    tarefas = []
    for lista_nome, brutas in pares:
        for t in brutas:
            tarefas.append(normalizar_tarefa(lista_nome, t))

    # Clientes: agrupamento por CPF (tarefa sem CPF fica só como tarefa da lista)
    clientes = {}
    for tf in tarefas:
        if not tf["cpf"]:
            continue
        c = clientes.setdefault(tf["cpf"], {
            "cpf": tf["cpf"], "nome": None, "dn": None, "telefone": None, "tarefas": [],
        })
        c["tarefas"].append(tf["id"])
        # nome/DN/telefone: primeiro valor encontrado vence; tarefas ativas têm prioridade
        if tf["nome"] and (not c["nome"] or not tf["concluida"] and len(tf["nome"]) > len(c["nome"])):
            c["nome"] = tf["nome"]
        c["dn"] = c["dn"] or tf["dn"]
        c["telefone"] = c["telefone"] or tf["telefone"]

    nomes_listas = [n for n, _ in pares]
    listas = [n for n in LISTAS_PRINCIPAIS if n in nomes_listas]
    listas += sorted(n for n in nomes_listas if n not in LISTAS_PRINCIPAIS)

    return {
        "gerado_em": datetime.datetime.now().isoformat(timespec="seconds"),
        "colaboradores": COLABORADORES,
        "listas_principais": [n for n in LISTAS_PRINCIPAIS if n in nomes_listas],
        "listas": listas,
        "tarefas": tarefas,
        "clientes": sorted(clientes.values(), key=lambda c: c["nome"] or "~"),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--backup", help="usar um export/backup JSON em vez da Graph API")
    ap.add_argument("--saida", default=str(SAIDA))
    args = ap.parse_args(argv)

    pares = carregar_backup(args.backup) if args.backup else carregar_graph()
    dados = montar(pares)
    dados["fonte"] = f"backup {args.backup}" if args.backup else "Graph API"

    destino = pathlib.Path(args.saida)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(dados, ensure_ascii=False), encoding="utf-8")

    n_and = sum(len(t["andamentos"]) for t in dados["tarefas"])
    n_ev = sum(len(t["eventos"]) for t in dados["tarefas"])
    print(f"{len(dados['listas'])} listas, {len(dados['tarefas'])} tarefas, "
          f"{len(dados['clientes'])} clientes, {n_and} andamentos, {n_ev} eventos -> {destino}")


if __name__ == "__main__":
    main()
