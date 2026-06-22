"""Gera/atualiza as fichas do portal do cliente para as 4 listas processuais:
🌻 INSS, 👪 Judicial, 🖥 Conselho de Recursos e 🗓 Tarefas com Prazo.

Reconstroi o gerador original (que nunca foi versionado — so o resultado JSON
entrou no repo). Politica de inclusao escolhida pelo escritorio: PUBLICAR TODOS
os clientes nao-concluidos das 4 listas que tenham CPF e data de nascimento
resolvivel (a DN e necessaria para a chave de login hash(CPF|DN)).

PRIVACIDADE: as 4 listas contem anotacoes internas sensiveis (senhas gov.br,
dados medicos, estrategia). Por isso a ficha publica NUNCA reproduz o texto
cru do corpo/checklist. A linha do tempo e montada com:
  - a DATA do marco (ja publica em qualquer consulta processual);
  - um TIPO canonico de evento (classificado por palavra-chave);
  - uma DESCRICAO canonica fixa por tipo (sem eco do texto interno).
Datas/horarios/cidade de pericia tambem sao publicos e podem aparecer no status.

MERGE: a chave do arquivo e hash(CPF|DN); um cliente que tambem esteja na lista
🙋 Escritório ja possui ficha sob o mesmo hash. Este gerador PRESERVA o processo
"🙋 Escritório" existente e apenas acrescenta os processos das 4 listas. Fichas
que so existem por causa do Escritorio nunca sao tocadas.

Uso:
  python3 build_portal_listas.py --validate   # confere extracao vs portal atual
  python3 build_portal_listas.py              # grava as fichas
Requer graph_tokens.json valido (rode graph_devflow.py / graph_refresh.py).
"""
import re, json, hashlib, pathlib, datetime, sys
from graph_client import list_lists, list_tasks, _req

DATA_DIR = pathlib.Path("docs/portal/data")
HOJE = datetime.date.today()

# DN recuperada manualmente (ex.: do CNIS no Drive) para clientes cujo checklist
# nao traz a data de nascimento. CPF (11 digitos) -> DN (DDMMAAAA).
DN_OVERRIDES = {
    "15275312873": "25071972",  # Fabio Robert (CNIS no Drive)
}

LINKS = {
    "🌻 INSS": [
        {"label": "Consultar no Meu INSS", "url": "https://meu.inss.gov.br/",
         "obs": "Use seu CPF e sua senha gov.br"},
    ],
    "👪 Judicial": [
        {"label": "PJe TRF3 — 1º grau (Justiça Federal SP/MS)", "url": "https://pje1g.trf3.jus.br/pje/login.seam"},
        {"label": "PJe TRF3 — 2º grau", "url": "https://pje2g.trf3.jus.br/pje/login.seam"},
        {"label": "ESAJ — TJSP (Justiça Estadual)", "url": "https://esaj.tjsp.jus.br/cpopg/open.do"},
    ],
    "🖥 Conselho de Recursos": [
        {"label": "Consultar no e-SISREC", "url": "https://consultaprocessos.inss.gov.br/"},
    ],
    "🗓 Tarefas com Prazo": [
        {"label": "Consultar no e-SISREC", "url": "https://consultaprocessos.inss.gov.br/"},
    ],
}
LOCALIZACAO = {
    "🌻 INSS": "Aguardando decisão do INSS",
    "👪 Judicial": "Aguardando Decisão Judicial",
    "🖥 Conselho de Recursos": "Aguardando decisão da Junta de Recursos",  # default; vira Câmara se houver REsp
    "🗓 Tarefas com Prazo": "Para apresentação de petição pelo advogado",
}
# prioridade para ordenar os processos dentro de uma ficha
PRIORIDADE = ["🌻 INSS", "👪 Judicial", "🖥 Conselho de Recursos", "🗓 Tarefas com Prazo"]
ALVO = set(PRIORIDADE)

# ---- classificacao de marcos (ordem: do mais especifico ao mais geral) ----
# cada regra: (tipo_canonico, descricao_canonica, [palavras-chave em minusculo])
REGRAS = [
    ("Acórdão: deu provimento parcial ao recurso", "Acórdão: recurso parcialmente provido.",
        ["provimento parcial", "parcialmente provido", "deu parcial provimento"]),
    ("Acórdão: negou provimento ao recurso", "Acórdão: recurso não provido.",
        ["negou provimento", "negado provimento", "improvido", "não provido", "nao provido", "negaram provimento"]),
    ("Acórdão: deu provimento ao recurso", "Acórdão: recurso provido.",
        ["deu provimento", "deram provimento", "recurso provido"]),
    ("Embargos de declaração interpostos", "Embargos de declaração interpostos.",
        ["embargos de declaração", "embargos de declaracao", "embargos declaratórios"]),
    ("Recurso inominado interposto", "Recurso inominado interposto.",
        ["recurso inominado"]),
    ("Recurso Especial interposto", "Recurso Especial interposto.",
        ["recurso especial", "resp ", "interpus resp", "recesp"]),
    ("Recurso Ordinário interposto", "Recurso Ordinário interposto.",
        ["recurso ordinário", "recurso ordinario"]),
    ("Sessão de julgamento agendada", "Sessão de julgamento agendada.",
        ["sessão de julgamento", "sessao de julgamento", "incluído em pauta", "incluido em pauta",
         "pauta de julgamento", "julgamento agendado", "agendado o julgamento"]),
    ("Laudo pericial juntado", "Laudo pericial juntado aos autos.",
        ["laudo pericial", "laudo da perícia", "laudo da pericia", "laudo juntado"]),
    # NB: perícia/avaliação social NÃO viram evento de timeline — entram só no
    # status (parse_pericia), espelhando o comportamento das fichas publicadas.
    ("Manifestação no processo judicial", "Manifestação apresentada no processo.",
        ["manifestação", "manifestacao", "manifestei", "manifestamos"]),
    ("Recurso administrativo protocolado", "Recurso administrativo protocolado.",
        ["recurso administrativo", "recurso ao inss", "recurso à junta", "recurso a junta", "interpus recurso"]),
    ("Ação judicial protocolada", "Ação judicial protocolada.",
        ["ação protocolada", "acao protocolada", "ajuiz", "ação judicial", "acao judicial",
         "distribuí a ação", "distribui a acao", "entrei com a ação", "entrei com a acao", "protocolei a ação"]),
    ("Cessação programada (DCB)", "Cessação programada do benefício (DCB).",
        ["dcb", "cessação programada", "cessacao programada", "data de cessação", "benefício cessado", "beneficio cessado"]),
    ("Prorrogação", "Pedido de prorrogação do benefício.",
        ["prorrogação", "prorrogacao", "ppp do benefício", "pedido de prorrogação"]),
    # Indeferimento ANTES de deferido — senao "deferido" casa dentro de "indeferido".
    ("Indeferimento do INSS", "Pedido indeferido pelo INSS.",
        ["indeferid", "indeferimento", "negado o benefício", "negaram o benefício", "negou o benefício"]),
    ("Benefício deferido pelo INSS", "Benefício deferido pelo INSS.",
        ["deferido", "concedido", "implantado", "benefício concedido", "carta de concessão"]),
    ("Pedido protocolado no INSS", "Pedido de benefício protocolado junto ao INSS.",
        ["solicitei o benefício", "solicitado o benefício", "benefício solicitado", "solicita o benefício",
         "solicitei o beneficio", "solicitado o beneficio", "beneficio solicitado", "solicita o beneficio",
         "protocolei o pedido", "deu entrada", "requeri o benefício", "requerido o benefício",
         "solicitei a aposentadoria", "pedido protocolado no inss", "requerimento protocolado"]),
    ("Exigência cumprida", "Exigência do INSS cumprida.",
        ["exigência cumprida", "exigencia cumprida", "cumpri a exigência", "cumpri a exigencia"]),
    # --- andamentos judiciais (ação em curso) ---
    ("Petição inicial protocolada", "Petição inicial protocolada / distribuída.",
        ["petição inicial protocolada", "peticao inicial protocolada", "petição inicial distribuída",
         "peticao inicial distribuida", "inicial protocolada", "inicial distribuída", "inicial distribuida",
         "distribuí a inicial", "distribui a inicial"]),
    ("Réplica protocolada", "Réplica protocolada nos autos.",
        ["réplica protocolada", "replica protocolada", "réplica apresentada", "replica apresentada"]),
    ("Petição protocolada", "Petição protocolada nos autos.",
        ["petição protocolada", "peticao protocolada", "petição apresentada", "peticao apresentada"]),
    ("Juntada de documentos", "Juntada de documentos ao processo.",
        ["juntada de documentos", "juntada de informações", "juntada de informacoes", "juntada de petição"]),
    # --- andamentos no Conselho de Recursos (CRPS) ---
    ("Processo distribuído ao relator", "Processo distribuído ao conselheiro relator.",
        ["distribuído ao conselheiro", "distribuido ao conselheiro", "distribuído ao relator", "distribuido ao relator"]),
    # genérico: só após os recursos específicos (inominado/especial/ordinário/administrativo) acima
    ("Recurso protocolado", "Recurso protocolado.",
        ["recurso protocolado", "recurso apresentado", "recurso interposto"]),
]


def digits(s):
    return re.sub(r"\D", "", s or "")


def dn_from_aniversario(items):
    """Item explicitamente rotulado 'Aniversário'/'nascimento': aceita qualquer
    ano plausivel (inclui menores de idade — casos BPC)."""
    for it in items:
        name = it.get("displayName", "")
        if re.search(r"anivers|nascime", name, re.I):
            m = re.search(r"\b(\d{2})[/.](\d{2})[/.](\d{4})\b", name)
            if m and 1900 <= int(m.group(3)) <= HOJE.year:
                return m.group(1) + m.group(2) + m.group(3)
    return None


def dn_from_items(items):
    for it in items:
        m = re.search(r"\b(\d{2})[/.](\d{2})[/.](\d{4})\b", it.get("displayName", ""))
        if m and 1920 <= int(m.group(3)) <= 2012:
            return m.group(1) + m.group(2) + m.group(3)
    return None


def dn_from_body(body):
    m = re.search(r"\bDN[:\s]+(\d{2})[/.](\d{2})[/.](\d{4})\b", body or "", re.I)
    if m and 1920 <= int(m.group(3)) <= 2012:
        return m.group(1) + m.group(2) + m.group(3)
    return None


def cpf_from_task(title, items):
    for m in re.findall(r"(\d[\d.\-]{9,})", title or ""):
        if len(digits(m)) == 11:
            return digits(m)
    for it in items:
        if len(digits(it.get("displayName", ""))) == 11:
            return digits(it.get("displayName", ""))
    return None


def split_blocks(body):
    """Quebra o corpo em blocos datados. Retorna [(date, texto)] do mais novo
    ao mais antigo. Aceita DD.MM.AAAA e DD/MM/AAAA no inicio da linha."""
    body = (body or "").replace("\r\n", "\n")
    # encontra todos os inicios de bloco datados
    pat = re.compile(r"(?m)^\s*(\d{2})[./](\d{2})[./](\d{4})\s*[\(\):;.-]")
    marks = list(pat.finditer(body))
    blocks = []
    for i, m in enumerate(marks):
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            dt = datetime.date(y, mo, d)
        except ValueError:
            continue
        end = marks[i + 1].start() if i + 1 < len(marks) else len(body)
        texto = body[m.end():end]
        blocks.append((dt, texto))
    blocks.sort(key=lambda x: x[0], reverse=True)
    return blocks


# Marcos inequivocos exibidos no modo "alta confianca" (publico). Tipos vagos
# como "Manifestação no processo judicial" ficam de fora — texto livre demais.
ALTA_CONFIANCA = {
    "Acórdão: deu provimento parcial ao recurso",
    "Acórdão: negou provimento ao recurso",
    "Acórdão: deu provimento ao recurso",
    "Embargos de declaração interpostos",
    "Recurso inominado interposto",
    "Recurso Especial interposto",
    "Recurso Ordinário interposto",
    "Sessão de julgamento agendada",
    "Laudo pericial juntado",
    "Recurso administrativo protocolado",
    "Recurso protocolado",
    "Ação judicial protocolada",
    "Petição inicial protocolada",
    "Réplica protocolada",
    "Petição protocolada",
    "Juntada de documentos",
    "Processo distribuído ao relator",
    "Exigência cumprida",
    "Cessação programada (DCB)",
    "Prorrogação",
    "Indeferimento do INSS",
    "Benefício deferido pelo INSS",
    "Pedido protocolado no INSS",
    # perícia / avaliação social (agendada e realizada) — eventos de timeline
    "Perícia médica agendada",
    "Perícia médica realizada",
    "Avaliação social agendada",
    "Avaliação social realizada",
}


def _kw_match(kw, texto):
    # casamento por palavra inteira (limite \b no inicio): evita que, p.ex.,
    # "reclamação protocolada" case a regra "ação protocolada".
    return re.search(r"\b" + re.escape(kw), texto) is not None


def classify(texto):
    t = texto.lower()
    for tipo, desc, kws in REGRAS:
        if any(_kw_match(k, t) for k in kws):
            return tipo, desc
    return None, None


MESES = {1: "janeiro"}  # placeholder (nao usado)


def parse_pericia(blocks):
    """Procura por uma pericia/avaliacao FUTURA. Retorna (label, date, hora, cidade)
    ou None. Datas tipicas: 'para o dia 29/06 às 09h20 ... em Jaboticabal'."""
    for dt, texto in blocks:
        low = texto.lower()
        if "perícia" not in low and "pericia" not in low and "avaliação social" not in low and "avaliacao social" not in low:
            continue
        kind = "Perícia médica" if ("perícia" in low or "pericia" in low) else "Avaliação social"
        # data DD/MM (ano implicito) perto de 'dia'
        md = re.search(r"\bdia\s+(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?", low)
        if not md:
            continue
        dd, mm = int(md.group(1)), int(md.group(2))
        yy = md.group(3)
        if yy:
            yy = int(yy); yy = yy + 2000 if yy < 100 else yy
        else:
            yy = dt.year if (dt.month, dt.day) <= (mm, dd) else dt.year
            # se a data ja passou no ano do bloco, joga p/ ano seguinte
        try:
            pdate = datetime.date(yy, mm, dd)
        except ValueError:
            continue
        if pdate < dt:  # pericia tem que ser depois do registro
            try:
                pdate = datetime.date(yy + 1, mm, dd)
            except ValueError:
                continue
        if pdate < HOJE:
            continue  # ja passou — nao vira "marcada"
        # hora
        mh = re.search(r"(\d{1,2})\s*(?:h|:)\s*(\d{2})", low)
        hora = f"{int(mh.group(1)):02d}:{mh.group(2)}" if mh else None
        # cidade: 'em <Cidade>' (capitalizada) ou 'INSS de <Cidade>'
        cidade = None
        mc = re.search(r"inss de ([a-zà-ú][\wà-ú]+(?:\s+[a-zà-ú][\wà-ú]+)?)", texto, re.I)
        if not mc:
            mc = re.search(r"\bem ([A-ZÀ-Ú][\wà-úA-ZÀ-Ú]+(?:\s+[A-ZÀ-Ú][\wà-ú]+){0,2})", texto)
        if mc:
            cidade = mc.group(1).strip().rstrip(".")
        return (kind, pdate, hora, cidade)
    return None


# ---- proteção contra vazamento de notas internas / itens sem relevância ----
_NOISE = (
    "sem alteração", "sem alteracao", "em análise", "em analise", "segue em análise",
    "segue em analise", "ainda em análise", "ainda em analise", "continua em análise",
    "continua em analise", "não houve alteração", "nao houve alteracao", "não houve movimentação",
    "nao houve movimentacao", "sem movimentação", "sem movimentacao", "idem", "ok",
    "sem benefício ativo", "sem beneficio ativo", "sem novidade", "aguardando", "nada a fazer",
    "sem alteração no recurso", "nao houve alteracao no recurso", "não houve alteração no recurso",
    "sem alteração desde", "sem alteracao desde", "ainda sem alteração", "ainda sem alteracao",
)
# verbos no infinitivo/imperativo = instrução para a equipe (a fazer), não um fato ocorrido
_INSTRUCAO = re.compile(
    r"^(agendar|agenda|reagendar|reagenda|fazer|faz|manifestar|manifeste|manifesta|apresentar|"
    r"apresente|cumprir|ver|verificar|verifique|verifica|responder|responda|responde|solicitar|"
    r"solicite|relembrar|relembre|lembrar|lembre|arquivar|arquive|aguardar|aguarde|conferir|confira|"
    r"providenciar|providencie|enviar|envie|ligar|ligue|retornar|retorne|peticionar|protocolar|"
    r"informar|informe|informa|entrar em contato|entra em contato|necess[áa]rio|prazo para|cobrar|"
    r"cobre|analisar|analise|checar|cheque|acompanhar|acompanhe|baixar|baixe|juntar|colher|tirar)\b",
    re.I,
)


def is_internal(h):
    """True se o cabeçalho for ruído (status quo) ou nota interna do escritório —
    nesses casos o bloco NÃO deve virar evento público."""
    if not h:
        return True
    low = h.lower().strip()
    if any(low == n or low.startswith(n) for n in _NOISE):
        return True
    if "ouvidoria" in low or "senha" in low:
        return True
    if _INSTRUCAO.match(low):
        return True
    # nota endereçada a um membro da equipe: "Amanda, ...", "Marcão, ..."
    if re.match(r"^[A-ZÀ-Ú][a-zà-úA-ZÀ-Ú']+,\s", h.strip()):
        return True
    return False


def _hora_cidade(texto):
    mh = re.search(r"(\d{1,2})\s*(?:h|:)\s*(\d{2})", texto.lower())
    hora = f"{int(mh.group(1)):02d}:{mh.group(2)}" if mh else None
    cidade = None
    mc = re.search(r"\b(?:em|de)\s+([A-ZÀ-Ú][\wà-ú]+(?:\s+[A-ZÀ-Ú][\wà-ú]+){0,2})", texto)
    if mc:
        cidade = mc.group(1).strip().rstrip(".")
    return hora, cidade


def _pericia_data(texto, base):
    """Extrai a data-alvo da perícia ('para o dia 12/06/2026'). Ano implícito vira
    o do registro; se cair muito antes do registro, assume o ano seguinte."""
    md = re.search(r"\bdia\s+(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?", texto)
    if not md:
        md = re.search(r"\bpara\s+(?:o\s+dia\s+)?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?", texto)
    if not md:
        return None
    dd, mm, yy = int(md.group(1)), int(md.group(2)), md.group(3)
    if yy:
        yy = int(yy); yy = yy + 2000 if yy < 100 else yy
    else:
        yy = base.year
    try:
        d = datetime.date(yy, mm, dd)
    except ValueError:
        return None
    if not md.group(3) and (d - base).days < -15:
        try:
            d = datetime.date(yy + 1, mm, dd)
        except ValueError:
            return None
    return d


def pericia_evento(headline_low, block_text, base):
    """A partir do cabeçalho, devolve (tipo, descricao) para perícia/avaliação
    AGENDADA ou REALIZADA, ou None. Imperativos ('agendar perícia') já foram
    barrados por is_internal antes de chegar aqui."""
    if not any(k in headline_low for k in ("perí", "peri", "avaliação social", "avaliacao social")):
        return None
    kind = "Avaliação social" if ("avaliação social" in headline_low or "avaliacao social" in headline_low) else "Perícia médica"
    realizada = any(w in headline_low for w in (
        "não reconheceu", "nao reconheceu", "reconheceu a incap", "realizada", "realizou",
        "compareceu", "passou hoje por perícia", "passou por perícia", "passou pela perícia",
        "passou hoje por pericia", "foi à perícia", "compareci"))
    if realizada:
        if "não reconheceu" in headline_low or "nao reconheceu" in headline_low:
            return (f"{kind} realizada", f"{kind} realizada — incapacidade não reconhecida.")
        return (f"{kind} realizada", f"{kind} realizada.")
    agendada = any(w in headline_low for w in (
        "agendad", "marcad", "remarcad", "reagendad", "agendei", "agendou", "agendamento"))
    if agendada:
        pdate = _pericia_data(headline_low, base) or _pericia_data(block_text.lower(), base)
        hora, cidade = _hora_cidade(block_text)
        desc = f"{kind} agendada"
        if pdate:
            desc += f" para {pdate.strftime('%d/%m/%Y')}"
        if hora:
            desc += f" às {hora}"
        if cidade:
            desc += f" em {cidade}"
        return (f"{kind} agendada", desc + ".")
    return None


# rótulos cujo conteúdo real está na linha seguinte
_LABELS = {
    "último andamento", "ultimo andamento", "houve alteração no recurso",
    "houve alteracao no recurso", "alteração no recurso", "alteracao no recurso",
    "andamento", "último andamento no processo", "movimentação", "movimentacao",
}


def headline(texto):
    """Primeira linha relevante do bloco, sem o marcador de autor ('A):', 'P):').
    Quando a primeira linha é só um rótulo ('Último andamento:', 'Houve alteração
    no recurso:'), o evento real está na linha seguinte."""
    linhas = []
    for line in (texto or "").splitlines():
        s = re.sub(r"^\s*[A-Za-zÀ-ú]{0,3}\)\s*:?\s*", "", line.strip())
        if s:
            linhas.append(s)
    if not linhas:
        return ""
    if linhas[0].lower().rstrip(": ").strip() in _LABELS:
        for cand in linhas[1:]:
            if cand.lower().rstrip(": ").strip() not in _LABELS:
                return cand
    return linhas[0]


def build_timeline(body):
    """Retorna lista de eventos canonicos (mais novo primeiro)."""
    eventos = []
    vistos = set()
    for dt, texto in split_blocks(body):
        h = headline(texto)
        if is_internal(h):
            continue  # ruído / nota interna do escritório — não expõe
        pe = pericia_evento(h.lower(), texto, dt)
        if pe:
            tipo, desc = pe
        else:
            tipo, desc = classify(h)
        if not tipo:
            continue
        chave = (dt.isoformat(), tipo)
        if chave in vistos:
            continue
        vistos.add(chave)
        eventos.append({
            "data": dt.isoformat(),
            "data_br": dt.strftime("%d/%m/%Y"),
            "tipo": tipo,
            "descricao": desc,
        })
    return eventos


def status_line(timeline, pericia):
    if pericia:
        kind, pdate, hora, cidade = pericia
        dias = (pdate - HOJE).days
        quando = "hoje" if dias == 0 else ("amanhã" if dias == 1 else f"em {dias} dias")
        s = f"{kind} marcada para {pdate.strftime('%d/%m/%Y')} ({quando})"
        if hora:
            s += f" às {hora}"
        if cidade:
            s += f" — INSS de {cidade}"
        return s
    if timeline:
        ev = timeline[0]
        texto = (ev.get("descricao") or ev["tipo"]).rstrip(".")
        return f"Última atualização em {ev['data_br']}: {texto}"
    return "Em andamento"


def localizacao_for(lista, timeline, body):
    if lista == "🖥 Conselho de Recursos":
        low = (body or "").lower()
        if "recurso especial" in low or "câmara" in low or "camara" in low or "cajr" in low:
            return "Aguardando decisão da Câmara de Julgamento"
        return "Aguardando decisão da Junta de Recursos"
    return LOCALIZACAO[lista]


def derivar_hash(cpf, dn, salt, iters):
    bits = hashlib.pbkdf2_hmac("sha256", (cpf + "|" + dn).encode(), salt.encode(), iters, dklen=32)
    return hashlib.sha256(bits).digest()[:16].hex()


def coletar():
    """Retorna (cpf2dn, tarefas_por_cpf). tarefas_por_cpf[cpf] = [proc,...]"""
    lists = list_lists()
    id2nome = {l["id"]: l["displayName"] for l in lists}
    cpf2dn = dict(DN_OVERRIDES)
    by_cpf = {}
    nomes = {}
    for l in lists:
        nome_lista = id2nome[l["id"]]
        for t in list_tasks(l["id"]):
            if t.get("status") == "completed":
                continue
            items = _req("GET", f"/me/todo/lists/{l['id']}/tasks/{t['id']}/checklistItems").get("value", [])
            cpf = cpf_from_task(t.get("title", ""), items)
            if not cpf:
                continue
            body = t.get("body", {}).get("content", "") or ""
            dn = dn_from_aniversario(items) or dn_from_items(items) or dn_from_body(body)
            if dn and cpf not in cpf2dn:
                cpf2dn[cpf] = dn
            if nome_lista in ALVO:
                nome = re.sub(r"\s*#.*$", "", t.get("title", "")).strip()
                nomes.setdefault(cpf, nome)
                by_cpf.setdefault(cpf, []).append({"lista": nome_lista, "nome": nome, "body": body})
    return cpf2dn, by_cpf, nomes


def montar_processo(cpf, dn, item):
    """Processo COMPLETO com timeline auto-extraida (usado so na --validate)."""
    lista, body = item["lista"], item["body"]
    timeline = build_timeline(body)
    pericia = parse_pericia(split_blocks(body))
    return {
        "cpf": cpf,
        "dn": dn,
        "nome": item["nome"],
        "lista": lista,
        "localizacao": localizacao_for(lista, timeline, body),
        "titulo_tarefa": item["nome"],
        "status": status_line(timeline, pericia),
        "proximo_evento": None,
        "timeline": timeline,
        "notas_publicas": [],
        "links_externos": LINKS[lista],
    }


def montar_processo_safe(cpf, dn, item):
    """Processo gerado automaticamente em modo ALTA CONFIANCA: timeline apenas
    com marcos inequivocos (ALTA_CONFIANCA), descartando o ambiguo. Localizacao
    fixa e status derivado do ultimo marco confiavel ou da pericia futura."""
    lista, body = item["lista"], item["body"]
    timeline = [e for e in build_timeline(body) if e["tipo"] in ALTA_CONFIANCA]
    pericia = parse_pericia(split_blocks(body))
    if timeline or pericia:
        status = status_line(timeline, pericia)
    else:
        status = "Em acompanhamento pelo escritório"
    return {
        "cpf": cpf,
        "dn": dn,
        "nome": item["nome"],
        "lista": lista,
        "localizacao": localizacao_for(lista, timeline, body),
        "titulo_tarefa": item["nome"],
        "status": status,
        "proximo_evento": None,
        "timeline": timeline,
        "notas_publicas": [],
        "links_externos": LINKS[lista],
        "origem": "auto",
    }


def validate(cpf2dn, by_cpf):
    """Compara a extracao (tipos+datas da timeline) com as fichas ja publicadas."""
    pub = {}
    for f in DATA_DIR.glob("*.json"):
        if f.name == "_meta.json":
            continue
        d = json.loads(f.read_text())
        for p in d.get("processos", []):
            if p.get("lista") in ALVO and p.get("cpf"):
                pub.setdefault(p["cpf"], {})[p["lista"]] = p
    tot = ok = parcial = 0
    difs = []
    for cpf, procs in by_cpf.items():
        if cpf not in pub:
            continue
        for item in procs:
            if item["lista"] not in pub[cpf]:
                continue
            tot += 1
            ref = pub[cpf][item["lista"]]
            mine = montar_processo(cpf, cpf2dn.get(cpf, "00000000"), item)
            ref_ev = {(e["data"], e["tipo"]) for e in ref.get("timeline", [])}
            my_ev = {(e["data"], e["tipo"]) for e in mine["timeline"]}
            if ref_ev == my_ev:
                ok += 1
            else:
                parcial += 1
                if len(difs) < 12:
                    difs.append((ref["nome"], item["lista"],
                                 sorted(ref_ev - my_ev), sorted(my_ev - ref_ev)))
    print(f"VALIDACAO timeline (tipos+datas): {ok}/{tot} identicos, {parcial} divergentes")
    for nome, L, falta, sobra in difs:
        print(f"\n  [{L}] {nome}")
        if falta: print("    no portal e nao extrai:", falta)
        if sobra: print("    extrai a mais:", sobra)


def main():
    meta = json.loads((DATA_DIR / "_meta.json").read_text())
    salt, iters = meta["salt"], meta["iter"]
    cpf2dn, by_cpf, nomes = coletar()

    if "--validate" in sys.argv:
        validate(cpf2dn, by_cpf)
        return

    novas_fichas = 0      # arquivos criados do zero
    regeneradas = 0       # fichas com processos auto (re)gerados
    intactas = 0          # clientes 100% curados (nada a (re)gerar)
    sem_dn = []
    agora = HOJE.strftime("%d/%m/%Y") + " às " + datetime.datetime.now().strftime("%H:%M")

    def ordem(p):
        L = p.get("lista")
        return PRIORIDADE.index(L) if L in PRIORIDADE else 99

    for cpf, procs in by_cpf.items():
        dn = cpf2dn.get(cpf)
        if not dn:
            sem_dn.append((nomes.get(cpf, "?"), cpf))
            continue
        # um processo por lista (primeira tarefa encontrada na lista)
        por_lista = {}
        for item in procs:
            por_lista.setdefault(item["lista"], item)

        h = derivar_hash(cpf, dn, salt, iters)
        path = DATA_DIR / f"{h}.json"
        existentes = []
        if path.exists():
            try:
                existentes = json.loads(path.read_text()).get("processos", [])
            except Exception:
                existentes = []

        # preserva o que e curado a mao; o resto (auto) e regerado do To Do
        curados = [p for p in existentes if p.get("origem") == "curado"]
        curado_listas = {p.get("lista") for p in curados}
        autos = [montar_processo_safe(cpf, dn, por_lista[L])
                 for L in PRIORIDADE if L in por_lista and L not in curado_listas]

        if not autos:
            intactas += 1
            continue  # nada auto a gerar (cliente totalmente curado)

        processos = sorted(curados + autos, key=ordem)
        ficha = {
            "nome": nomes.get(cpf, processos[0]["nome"]),
            "atualizado_em": agora,
            "processos": processos,
        }
        path.write_text(json.dumps(ficha, ensure_ascii=False, indent=2))
        if existentes:
            regeneradas += 1
        else:
            novas_fichas += 1

    total = len([p for p in DATA_DIR.glob("*.json") if p.name != "_meta.json"])
    meta["total_clientes"] = total
    meta["atualizado_em"] = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    (DATA_DIR / "_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    print(f"Fichas novas criadas: {novas_fichas}")
    print(f"Fichas regeneradas (auto): {regeneradas}")
    print(f"Clientes 100% curados (intactos): {intactas}")
    print(f"Total de fichas no portal: {total}")
    print(f"Sem DN resolvivel (NAO publicados): {len(sem_dn)}")
    for nome, cpf in sem_dn:
        print(f"   - {nome}  (CPF {cpf})")


if __name__ == "__main__":
    main()
