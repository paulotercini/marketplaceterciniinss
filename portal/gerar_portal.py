"""
gerar_portal.py - Le tarefas do Microsoft To Do e gera o portal estatico
de consulta de andamentos por CPF + DN.

CONVENCAO PARA O TO DO
----------------------
- Titulo: "Nome Sobrenome #CPF"  (ja e o padrao do escritorio)
- Body: precisa ter uma linha "DN: DD/MM/AAAA" perto do topo
- Tarefas sem CPF ou sem DN sao puladas (nao entram no portal)

SAIDA
-----
- site/data/<hash>.json   um por cliente (CPF unico)
- site/data/_meta.json    metadados (data da geracao, total)

  hash = SHA256( PBKDF2_HMAC_SHA256(cpf||dn, SALT, 200000) ) hex[:32]

  (PBKDF2 deixa cada tentativa de adivinhar a DN cara o suficiente para
   desencorajar enumeracao; SHA do resultado garante que o filename nao
   revela a chave de descriptografia se algum dia adicionarmos cripto.)

USO
---
  python3 portal/gerar_portal.py
"""
import sys, re, json, hashlib, time
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
from graph_client import _req

TZ_BR = timezone(timedelta(hours=-3))
HOJE = datetime.now(TZ_BR).date()
DATA_DIR = Path(__file__).parent / "site" / "data"
SALT = b"portal-tercini-2026-v1"  # publico; serve so para impedir rainbow table
PBKDF_ITER = 200_000

# Listas que NUNCA entram no portal (internas)
LISTAS_EXCLUIR = {
    "Bancos", "DOU", "Escrita", "Escritorio", "Escritório",
    "Jurisprudência", "Leiloeiros", "Pai", "Pietra",
    "Paulo Acessos", "Petição Inicial", "Recurso Administrativo",
    "REsp, RE, TNU e TRU", "Recurso ou Contrarrazões Judiciais",
    "Tarefas", "Vídeos Explicativos", "Impugnações", "CNIS",
    "Conceitos de Direito Previdenciário", "Capital 2", "Arkad",
    "🎓 Fluxo de Trabalho", "🔧 Operacional", "🛄 Mensagens",
    "💵 Pagamentos", "💡 Vídeos Explicativos",
    "🔎 Leilões",
    "Clientes Agroambiental", "Clientes Encerrados", "Audiências",
    "Clientes em Andamento", "💫 Willian Braga Marcussi",
    "Lista sem título", "Lista sem título 1", "Lista sem título 2",
    "Lista sem título (1)", "Lista sem título 1 (1)",
    "Izildo Aparecido Machado Fumes",
}

# Indicadores de que o recurso esta na CAJ (Camara de Julgamento), nao na JR.
INDIC_CAJ = [
    r"c[aâ]mara(?:s)?\s+de\s+julgamento",
    r"\bcaj\b",
    r"\d+\s*ª?\s*caj",
    r"recurso\s+especial",
    r"embargos\s+de\s+declara[cç][aã]o",
]


def localizacao_no_escritorio(lista_nome, body):
    """Mapeia (lista do To Do, body) -> rotulo Localizacao no Escritorio.

    Para Conselho de Recursos, distingue JR x CAJ pelo conteudo do body.
    """
    n = (lista_nome or "").lower()
    body_low = (body or "").lower()

    if "tarefas com prazo" in n:
        return "Para apresentação de petição pelo advogado"

    if "judicial" in n or "marcos" in n:
        return "Aguardando Decisão Judicial"

    if "conselho de recursos" in n:
        if any(re.search(p, body_low) for p in INDIC_CAJ):
            return "Aguardando decisão da Câmara de Julgamento"
        return "Aguardando decisão da Junta de Recursos"

    if ("inss" in n or "escritório" in n or "escritorio" in n
            or "aposentadorias" in n):
        return "Aguardando decisão do INSS"

    return "Em andamento"


# Catalogo de links externos para o cliente consultar andamentos.
LINKS_CATALOGO = {
    "e-sisrec": {
        "label": "Consultar no e-SISREC",
        "url": "https://consultaprocessos.inss.gov.br/",
        "obs": "Use seu CPF e sua senha gov.br",
    },
    "meu-inss": {
        "label": "Consultar no Meu INSS",
        "url": "https://meu.inss.gov.br/",
        "obs": "Use seu CPF e sua senha gov.br",
    },
    "pje1-trf3": {
        "label": "PJe TRF3 — 1º grau (Justiça Federal SP/MS)",
        "url": "https://pje1g.trf3.jus.br/pje/login.seam",
    },
    "pje2-trf3": {
        "label": "PJe TRF3 — 2º grau",
        "url": "https://pje2g.trf3.jus.br/pje/login.seam",
    },
    "esaj": {
        "label": "ESAJ — TJSP (Justiça Estadual)",
        "url": "https://esaj.tjsp.jus.br/cpopg/open.do",
    },
    "eproc": {
        "label": "Eproc — Justiça Federal",
        "url": "https://eproc.jfsp.jus.br/eprocV2/",
    },
    "stj": {
        "label": "STJ — Superior Tribunal de Justiça",
        "url": "https://processo.stj.jus.br/processo/pesquisa/",
    },
    "tnu": {
        "label": "TNU — Turma Nacional de Uniformização",
        "url": "https://www.cjf.jus.br/cjf/turmas-recursais/turma-nacional-de-uniformizacao",
    },
}


def links_para_processo(localizacao, body):
    """Devolve lista de links externos para o cliente consultar andamentos.

    Detecta por conteudo do body (mais especifico); se nao houver indicio,
    cai no padrao da Localizacao.
    """
    body_low = (body or "").lower()
    out = []

    # Recurso administrativo: e-SISREC sempre que body tiver indicios CRPS/JR/CAJ
    indic_rec_adm = ["e-sisrec", "esisrec", "crps", "câmara de julgamento",
                     "camara de julgamento", "junta de recursos",
                     "conselho de recursos"]
    if any(s in body_low for s in indic_rec_adm):
        out.append("e-sisrec")
        return [LINKS_CATALOGO[k] for k in out]

    # MEU INSS — quando localizacao for INSS ou body indicar
    if localizacao == "Aguardando decisão do INSS" or any(
            s in body_low for s in ["meu inss", "meuinss", "pat/gerid",
                                     "benefício solicitado",
                                     "beneficio solicitado"]):
        out.append("meu-inss")
        return [LINKS_CATALOGO[k] for k in out]

    # Judicial — detecta sistema especifico via body
    indic_judicial = ["pje", "esaj", "eproc", "tjsp", "trf3", "stj", "tnu",
                      "vara federal", "vara civel", "vara cível",
                      "distribuída", "distribuida", "processo judicial",
                      "juízo", "juizo"]
    eh_judicial = (localizacao == "Aguardando Decisão Judicial"
                   or any(s in body_low for s in indic_judicial))
    if eh_judicial:
        if "pje1" in body_low or "1º grau" in body_low or "1 grau" in body_low \
                or "primeira instância" in body_low:
            out.append("pje1-trf3")
        if "pje2" in body_low or "2º grau" in body_low or "2 grau" in body_low \
                or "segunda instância" in body_low:
            out.append("pje2-trf3")
        if "esaj" in body_low or "tjsp" in body_low or "tj sp" in body_low:
            out.append("esaj")
        if "eproc" in body_low:
            out.append("eproc")
        if "stj" in body_low:
            out.append("stj")
        if "tnu" in body_low:
            out.append("tnu")
        if not out:
            # nao deu pra detectar — mostra as opcoes mais comuns
            out = ["pje1-trf3", "pje2-trf3", "esaj"]
        # dedupe preservando ordem
        seen = set(); uniq = []
        for k in out:
            if k not in seen:
                seen.add(k); uniq.append(k)
        return [LINKS_CATALOGO[k] for k in uniq]

    # Tarefas com Prazo / Conselho de Recursos sem indicio claro -> e-SISREC
    if localizacao in ("Para apresentação de petição pelo advogado",
                       "Aguardando decisão da Junta de Recursos",
                       "Aguardando decisão da Câmara de Julgamento"):
        return [LINKS_CATALOGO["e-sisrec"]]

    return []

# Regex
RE_CPF_TITULO = re.compile(r"#\s*(\d{11})\b")
RE_DN_BODY = re.compile(r"^\s*DN\s*[:=]\s*(\d{2})/(\d{2})/(\d{4})\s*$", re.MULTILINE | re.IGNORECASE)
RE_DATA_BR = re.compile(r"\b(\d{2})/(\d{2})/(\d{4})\b")
# Data curta DD/MM (sem ano) — usado para inferir ano corrente
RE_DATA_CURTA = re.compile(r"\b(\d{2})/(\d{2})\b(?!/)")
# Aceita ":" ou ";" no separador (typos comuns no body)
RE_ENTRADA = re.compile(
    r"^(\d{2})\.(\d{2})\.(\d{4})\s*\(([A-Z]+)\)\s*[:;]\s*(.+?)(?=\n\d{2}\.\d{2}\.\d{4}\s*\([A-Z]+\)\s*[:;]|\Z)",
    re.MULTILINE | re.DOTALL,
)
RE_PUB = re.compile(r"\(PUB\)\s*[:;]\s*(.+?)(?=\n\d{2}\.\d{2}\.\d{4}\s*\([A-Z]+\)\s*[:;]|\Z)",
                    re.MULTILINE | re.DOTALL)
RE_HORA = re.compile(r"(?:as|às)\s*(\d{1,2})[:h](\d{2})?", re.I)
RE_LOCAL = re.compile(r"(?:no\s+)?INSS\s+(?:de\s+)?([A-Z][A-Za-zÀ-ÿ\s]+?)(?:[.,;]|$)", re.I)
RE_BOT_LOG = re.compile(r"^\[BOT-LOG\].*$", re.MULTILINE)

# Detectores de eventos (timeline) - reaproveita logica do bot_avisos
# Exige indicio de evento real (agendada/marcada/data) para evitar mencoes genericas
PAD_PERICIA = [
    r"per[ií]cia\s+(?:m[eé]dica\s+)?(?:agendada|marcada|reagendada|designada|remarcada)",
    r"per[ií]cia\s+(?:m[eé]dica\s+)?(?:para\s+(?:o\s+)?dia|em|no\s+dia|para)\s*\d{1,2}/\d{1,2}",
    r"avalia[cç][aã]o\s+m[eé]dica\s+(?:agendada|marcada|designada|para)",
]
EXC_PERICIA = [r"per[ií]cia social", r"avalia[cç][aã]o social"]
PAD_SOCIAL = [
    r"per[ií]cia\s+social\s+(?:agendada|marcada|designada|para)",
    r"avalia[cç][aã]o\s+social\s+(?:agendada|marcada|designada|para)",
]
PAD_AUDIENCIA = [
    r"audi[eê]ncia\s+(?:agendada|marcada|designada|remarcada|para)",
    r"audi[eê]ncia\s+(?:em|no\s+dia|para\s+(?:o\s+)?dia)\s*\d{1,2}/\d{1,2}",
]
PAD_JUDICIAL = [
    r"inicial distribu[ií]da", r"processo distribu[ií]do",
    r"a[cç][aã]o distribu[ií]da", r"distribu[ií] a a[cç][aã]o",
    r"distribu[ií] a inicial", r"protocol(?:ei|ada) a inicial",
    r"protocolada a a[cç][aã]o", r"a[cç][aã]o protocolada",
    r"distribu[ií]da a a[cç][aã]o",
]
PAD_INSS_PROT = [
    r"protocol(?:ei|ado|ada)\s+(?:o\s+|a\s+)?benef[ií]cio",
    r"protocol(?:ei|ado|ada)\s+(?:o\s+)?requerimento\s+(?:de\s+)?(?:aux[ií]lio|aposentad|bpc|loas|pens[aã]o|sal[aá]rio|benef[ií]cio)",
    r"benef[ií]cio (?:solicitado|protocolado|requerido)",
    r"solicitei o benef[ií]cio",
    r"deu entrada (?:o|no) (?:pedido|requerimento|benef[ií]cio)",
]
# Exclui contexto de recurso administrativo (CRPS/JR/CAJ/e-SISREC) — la o
# "requerimento protocolado" se refere a tarefa do recurso, nao ao beneficio
EXC_INSS_PROT = [
    r"e-?sisrec", r"\bCRPS\b", r"\bJR\b", r"\bCAJ\b",
    r"c[aâ]mara de julgamento", r"junta de recursos",
    r"conselho de recursos", r"recurso (?:especial|ordin[aá]rio|inominado)",
]
# --- Decisao do INSS sobre o beneficio (inicial) ---
PAD_BEN_DEFERIDO = [
    r"benef[ií]cio (?:deferido|concedido|implantado)",
    r"INSS deferiu",
    r"pedido deferido", r"requerimento deferido",
]
PAD_INDEFERIMENTO_INSS = [
    r"benef[ií]cio indeferido",
    r"INSS (?:indeferiu|negou)\s+(?:o\s+)?(?:pedido|requerimento|benef[ií]cio)",
    r"indeferimento (?:do|no) INSS",
    r"pedido indeferido", r"requerimento indeferido",
]

# --- Resultado de acordao (recurso administrativo: JR / CAJ) ---
PAD_PARCIAL = [
    r"(?:deu\s+)?provimento\s+parcial",
    r"parcial(?:mente)?\s+provido",
    r"parcial\s+provimento",
    r"deu\s+parcial",
]
PAD_DEU_PROV = [
    r"deu\s+provimento\s+(?:ao\s+recurso|integral)?",
    r"recurso\s+(?:integralmente\s+)?provido",
    r"acolheu\s+(?:o\s+)?recurso",
    r"provimento\s+integral",
]
PAD_NEGOU = [
    r"negou\s+provimento",
    r"recurso\s+negado(?:\s+provimento)?",
    r"n[aã]o\s+(?:foi\s+)?(?:dado|deu)\s+provimento",
    r"recurso\s+improvido",
    r"recurso\s+n[aã]o\s+conhecido",
]

# --- Decisao judicial ---
PAD_DECISAO_JUD = [
    r"decis[aã]o favor[aá]vel", r"sentença procedente",
    r"a[cç][aã]o julgada procedente",
]
PAD_INDEFERIMENTO_JUD = [
    r"decis[aã]o desfavor[aá]vel",
    r"sentença improcedente", r"a[cç][aã]o julgada improcedente",
]

PAD_PRORROGACAO = [r"prorrog[aá]", r"prorroga[cç][aã]o"]
PAD_DCB = [r"\bDCB\b", r"cessa[cç][aã]o.*benef[ií]cio", r"data de cessa[cç][aã]o"]

# --- Recurso administrativo (CRPS / JR / CAJ / e-SISREC) ---
PAD_RECURSO_ESP = [
    r"recurso\s+especial(?:\s+(?:protocolado|interposto|enviado))?",
    r"protocol(?:ei|ado|ada)\s+(?:o\s+)?recurso\s+especial",
    r"interpus\s+(?:o\s+)?recurso\s+especial",
    r"recurso\s+(?:para\s+)?(?:as?\s+)?c[aâ]mara(?:s)?\s+de\s+julgamento",
    r"recurso\s+(?:para\s+)?CAJ\b",
]
PAD_RECURSO_ORD = [
    r"recurso\s+ordin[aá]rio(?:\s+(?:protocolado|interposto|enviado))?",
    r"protocol(?:ei|ado|ada)\s+(?:o\s+)?recurso\s+ordin[aá]rio",
    r"interpus\s+(?:o\s+)?recurso\s+ordin[aá]rio",
    r"recurso\s+(?:para\s+)?(?:a\s+)?junta\s+de\s+recursos",
    r"recurso\s+(?:para\s+)?JR\b",
]
PAD_EMBARGOS = [
    r"embargos\s+de\s+declara[cç][aã]o",
    r"interpus\s+embargos", r"apresentei\s+embargos",
    r"protocol(?:ei|ado|ada)\s+embargos", r"opus\s+embargos",
]
# fallback generico (quando nao da pra dizer se eh RE/RO)
PAD_RECURSO_PROT = [
    r"recurso\s+(?:protocolado|interposto)",
    r"interpus\s+(?:o\s+)?recurso",
    r"requerimento protocolado.*(?:tarefa|e-?sisrec|crps|cajul|c[aâ]mara)",
]
# Sessao agendada — exige indicio positivo (numero da sessao, data, ou "agendou")
# para nao casar com "Aguardando sessao" generico.
PAD_SESSAO_JULGAMENTO = [
    r"sess[aã]o.*N[ºo°]?\s*\d+",                  # "Sessão ... Nº 0180/2026"
    r"sess[aã]o.*\d{2}/\d{2}/\d{2,4}",             # "Sessão ... 22/05/26"
    r"agendou\s+(?:o\s+)?julgamento",
    r"julgamento\s+(?:ordin[aá]ri[oa]|monocr[aá]tic[oa])",
    r"pauta\s+de\s+julgamento",
    r"inclu[ií]do\s+em\s+pauta",
    r"julgamento\s+(?:agendado|marcado)",
]

# Remove ruido interno do final do conteudo (ex: "(P): Ok.", "(A): ok!", "(M): ok")
RE_RESPOSTA_INTERNA = re.compile(
    r"\(\s*[PADIM]\s*\)\s*:\s*\w{1,5}[.!]?\s*$", re.MULTILINE
)
# Remove andamentos automaticos do e-SISREC / PAT (verbosos e tecnicos)
RE_LINHAS_RUIDO = re.compile(
    r"^(?:"
    r"protocolo\s+\([^)]+\)\s*:.*|"
    r"cliente\s+\(senha\).*|"
    r"enviado em \d{2}/\d{2}/\d{4}.*|"
    r"\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2}.*|"
    r"atualiza[cç][aã]o e-?sisrec.*|"
    r"situa[cç][aã]o do processo\s*:.*|"
    r"[oó]rg[aã]o\s*:.*|"
    r"localiza[cç][aã]o\s*:.*|"
    r"data\s+de\s+entrada\s+do\s+requerimento.*"
    r")$",
    re.MULTILINE | re.IGNORECASE,
)
# "Ultimo evento: X" -> "X" (mantem o texto util sem o cabecalho)
RE_ULTIMO_EVENTO = re.compile(r"[uú]ltimo\s+(?:evento|andamento)\s*:\s*", re.IGNORECASE)


def normalizar_cpf(s):
    digits = re.sub(r"\D", "", s or "")
    return digits if len(digits) == 11 else None


def normalizar_dn(dia, mes, ano):
    """Recebe 3 strings (DD, MM, AAAA) e devolve 'DDMMAAAA' valido ou None."""
    try:
        d = datetime(int(ano), int(mes), int(dia)).date()
        if d.year < 1900 or d > HOJE:
            return None
        return d.strftime("%d%m%Y")
    except Exception:
        return None


def hash_chave(cpf_digits, dn_digits):
    chave = (cpf_digits + "|" + dn_digits).encode("utf-8")
    derived = hashlib.pbkdf2_hmac("sha256", chave, SALT, PBKDF_ITER)
    return hashlib.sha256(derived).hexdigest()[:32]


def nome_cliente(titulo):
    t = re.sub(r"#\s*\d+", "", titulo or "")
    t = re.sub(r"[\U0001F300-\U0001FAFF\U00002600-\U000027BF]", "", t)  # remove emojis
    return t.strip(" -")


def hit(ctx_low, padroes, exclui=None):
    if exclui and any(re.search(p, ctx_low) for p in exclui):
        return False
    return any(re.search(p, ctx_low) for p in padroes)


def parse_data(dia, mes, ano):
    try:
        return datetime(int(ano), int(mes), int(dia)).date()
    except Exception:
        return None


def list_lists():
    return _req("GET", "/me/todo/lists")["value"]


def list_all_tasks(list_id):
    out, url = [], f"/me/todo/lists/{list_id}/tasks?$top=100"
    while url:
        page = _req("GET", url)
        out.extend(page.get("value", []))
        url = page.get("@odata.nextLink")
    return out


def extrair_proximo_evento(titulo, body):
    """Acha o evento futuro mais proximo (pericia/audiencia/avaliacao) e
    devolve dict {tipo, data, hora, local} ou None.

    Aceita datas no formato DD/MM/AAAA OU DD/MM (infere ano corrente).
    """
    full = (titulo or "") + "\n" + (body or "")
    candidatos = []

    # 1. DD/MM/AAAA
    encontradas = []
    for m in RE_DATA_BR.finditer(full):
        d = parse_data(m.group(1), m.group(2), m.group(3))
        if d:
            encontradas.append((d, m.start(), m.end()))

    # 2. DD/MM (sem ano) — infere ano corrente ou proximo
    # Pula os matches que ja foram cobertos pelo DD/MM/AAAA acima.
    spans_completos = [(s, e) for (_, s, e) in encontradas]
    for m in RE_DATA_CURTA.finditer(full):
        # filtro: nao casa se a posicao ja esta dentro de um DD/MM/AAAA
        sobreposto = any(s <= m.start() < e or s < m.end() <= e
                          for s, e in spans_completos)
        if sobreposto:
            continue
        try:
            dia, mes = int(m.group(1)), int(m.group(2))
            d_atual = datetime(HOJE.year, mes, dia).date()
            d_proximo = datetime(HOJE.year + 1, mes, dia).date()
        except Exception:
            continue
        # Escolhe o ano que da uma data futura nos proximos 180 dias
        if 0 <= (d_atual - HOJE).days <= 180:
            d = d_atual
        elif 0 <= (d_proximo - HOJE).days <= 180:
            d = d_proximo
        else:
            continue
        encontradas.append((d, m.start(), m.end()))

    for d, start, end in encontradas:
        delta = (d - HOJE).days
        if delta < 0 or delta > 180:
            continue
        # Usa a SENTENCA que contem a data como contexto.
        # Limites: ponto final/quebra de linha antes e depois.
        ini = start
        while ini > 0 and full[ini - 1] not in ".!?\n":
            ini -= 1
        fim = end
        while fim < len(full) and full[fim] not in ".!?\n":
            fim += 1
        ctx = full[ini:fim].strip()
        ctx_low = ctx.lower()
        tipo = None
        if hit(ctx_low, PAD_PERICIA, EXC_PERICIA):
            tipo = "Pericia medica"
        elif hit(ctx_low, PAD_SOCIAL):
            tipo = "Avaliacao social"
        elif hit(ctx_low, PAD_AUDIENCIA):
            tipo = "Audiencia"
        elif hit(ctx_low, PAD_SESSAO_JULGAMENTO):
            tipo = "Sessao de julgamento"
        if not tipo:
            continue
        hora = ""
        mh = RE_HORA.search(ctx)
        if mh:
            hora = f"{int(mh.group(1)):02d}:{mh.group(2) or '00'}"
        local = ""
        ml = RE_LOCAL.search(ctx)
        if ml:
            local = "INSS de " + re.split(r"\s{2,}|[,.]", ml.group(1).strip())[0].strip()
        candidatos.append({
            "tipo": tipo,
            "data": d.isoformat(),
            "data_br": d.strftime("%d/%m/%Y"),
            "hora": hora,
            "local": local,
        })
    if not candidatos:
        return None
    return sorted(candidatos, key=lambda x: x["data"])[0]


def limpar_descricao(conteudo):
    """Devolve uma descricao curta e limpa para mostrar ao cliente."""
    txt = RE_BOT_LOG.sub("", conteudo)
    txt = RE_RESPOSTA_INTERNA.sub("", txt)
    txt = RE_LINHAS_RUIDO.sub("", txt)
    # "Último evento: Sessão X" -> "Sessão X"
    txt = RE_ULTIMO_EVENTO.sub("", txt)
    # colapsa multiplas quebras / espacos
    txt = re.sub(r"\n+", " ", txt)
    txt = re.sub(r"\s{2,}", " ", txt).strip()
    # primeira frase ate 240 chars
    primeira = re.split(r"(?<=[.!?])\s+", txt)[0][:240]
    return primeira.strip()


# (categoria, padroes, exclusoes) — avaliados em ordem; o primeiro hit ganha.
# Mais especifico antes; resultados antes de interposicao.
TIMELINE_CATEGORIAS = [
    # judicial
    ("Ação judicial protocolada", PAD_JUDICIAL, None),
    ("Decisão judicial favorável", PAD_DECISAO_JUD, None),
    ("Decisão judicial desfavorável", PAD_INDEFERIMENTO_JUD, None),

    # acordao do recurso administrativo (resultado)
    # parcial antes de "deu provimento" porque "deu parcial" tambem casa o segundo
    ("Acórdão: deu provimento parcial ao recurso", PAD_PARCIAL, None),
    ("Acórdão: deu provimento ao recurso", PAD_DEU_PROV, None),
    ("Acórdão: negou provimento ao recurso", PAD_NEGOU, None),

    # decisao inicial do INSS sobre o beneficio
    ("Benefício deferido pelo INSS", PAD_BEN_DEFERIDO, None),
    ("Indeferimento do INSS", PAD_INDEFERIMENTO_INSS, None),

    # recursos — especifico antes de generico
    ("Recurso Especial interposto", PAD_RECURSO_ESP, None),
    ("Embargos de declaração interpostos", PAD_EMBARGOS, None),
    ("Recurso Ordinário interposto", PAD_RECURSO_ORD, None),
    ("Recurso administrativo protocolado", PAD_RECURSO_PROT, None),

    # agendamento
    ("Sessão de julgamento agendada", PAD_SESSAO_JULGAMENTO, None),

    # eventos previdenciarios
    ("Cessação programada (DCB)", PAD_DCB, None),
    ("Prorrogação", PAD_PRORROGACAO, None),

    # entrada inicial no INSS - antes das pericias/avaliacoes, porque a
    # entrada do protocolo costuma listar tambem as pericias agendadas
    ("Pedido protocolado no INSS", PAD_INSS_PROT, EXC_INSS_PROT),

    ("Perícia médica", PAD_PERICIA, EXC_PERICIA),
    ("Avaliação social", PAD_SOCIAL, None),
    ("Audiência", PAD_AUDIENCIA, None),
]


def categorizar_entrada(conteudo):
    """Retorna o nome da categoria ou None."""
    ctx_low = conteudo.lower()
    for nome, padroes, exclui in TIMELINE_CATEGORIAS:
        if hit(ctx_low, padroes, exclui):
            return nome
    return None


def extrair_timeline(body):
    """Le entradas DD.MM.AAAA (X): e categoriza marcos relevantes.

    Retorna lista ordenada por data desc: [{data, data_br, tipo, descricao}].
    """
    timeline = []
    for m in RE_ENTRADA.finditer(body or ""):
        d = parse_data(m.group(1), m.group(2), m.group(3))
        if not d:
            continue
        conteudo = m.group(5).strip()
        conteudo = RE_BOT_LOG.sub("", conteudo).strip()
        if not conteudo:
            continue
        tipo = categorizar_entrada(conteudo)
        if not tipo:
            continue
        timeline.append({
            "data": d.isoformat(),
            "data_br": d.strftime("%d/%m/%Y"),
            "tipo": tipo,
            "descricao": limpar_descricao(conteudo),
        })
    # dedupe por (data, tipo)
    visto = set(); out = []
    for e in sorted(timeline, key=lambda x: x["data"], reverse=True):
        k = (e["data"], e["tipo"])
        if k in visto:
            continue
        visto.add(k); out.append(e)
    return out


def extrair_notas_publicas(body):
    """Entradas marcadas (PUB): vao para o cliente, na integra."""
    notas = []
    for m in RE_ENTRADA.finditer(body or ""):
        if m.group(4) != "PUB":
            continue
        d = parse_data(m.group(1), m.group(2), m.group(3))
        if not d:
            continue
        texto = m.group(5).strip()
        texto = RE_BOT_LOG.sub("", texto).strip()
        if not texto:
            continue
        notas.append({
            "data": d.isoformat(),
            "data_br": d.strftime("%d/%m/%Y"),
            "texto": texto[:600],
        })
    return sorted(notas, key=lambda x: x["data"], reverse=True)


def status_atual(proximo, timeline):
    """Gera frase de status curta deixando claro o que e data do evento e
    o que e data da ultima atualizacao."""
    if proximo:
        d = datetime.fromisoformat(proximo["data"]).date()
        dias = (d - HOJE).days
        if dias == 0:
            quando = "hoje"
        elif dias == 1:
            quando = "amanhã"
        else:
            quando = f"em {dias} dias"
        h = f" às {proximo['hora']}" if proximo["hora"] else ""
        l = f" — {proximo['local']}" if proximo["local"] else ""
        return f"{proximo['tipo']} marcada para {proximo['data_br']} ({quando}){h}{l}"
    if timeline:
        m = timeline[0]
        return f"Última atualização em {m['data_br']}: {m['tipo']}"
    return "Em andamento"


def processar_tarefa(t, lista_nome):
    titulo = t.get("title", "") or ""
    body = (t.get("body", {}) or {}).get("content", "") or ""
    m_cpf = RE_CPF_TITULO.search(titulo)
    if not m_cpf:
        return None
    cpf = m_cpf.group(1)
    m_dn = RE_DN_BODY.search(body)
    if not m_dn:
        return None
    dn = normalizar_dn(m_dn.group(1), m_dn.group(2), m_dn.group(3))
    if not dn:
        return None
    proximo = extrair_proximo_evento(titulo, body)
    timeline = extrair_timeline(body)
    notas_pub = extrair_notas_publicas(body)
    loc = localizacao_no_escritorio(lista_nome, body)
    return {
        "cpf": cpf,
        "dn": dn,
        "nome": nome_cliente(titulo),
        "lista": lista_nome,
        "localizacao": loc,
        "titulo_tarefa": re.sub(r"#\s*\d+", "", titulo).strip(" 🤖-"),
        "status": status_atual(proximo, timeline),
        "proximo_evento": proximo,
        "timeline": timeline,
        "notas_publicas": notas_pub,
        "links_externos": links_para_processo(loc, body),
    }


def main():
    print(f"[portal] Inicio: {datetime.now().isoformat(timespec='seconds')}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    # limpa data antiga
    for f in DATA_DIR.glob("*.json"):
        if f.name.startswith("_"):
            continue
        f.unlink()

    listas = list_lists()
    print(f"[portal] {len(listas)} listas no Microsoft To Do")

    processos_por_cliente = {}  # (cpf, dn) -> [processos]
    nome_por_chave = {}
    tarefas_sem_cpf = 0
    tarefas_sem_dn = 0
    tarefas_completas = 0

    for lst in listas:
        nome_lista = lst["displayName"]
        if nome_lista in LISTAS_EXCLUIR:
            continue
        tasks = list_all_tasks(lst["id"])
        for t in tasks:
            if t.get("status") == "completed":
                continue
            titulo = t.get("title", "") or ""
            if not RE_CPF_TITULO.search(titulo):
                tarefas_sem_cpf += 1
                continue
            body = (t.get("body", {}) or {}).get("content", "") or ""
            if not RE_DN_BODY.search(body):
                tarefas_sem_dn += 1
                continue
            tarefas_completas += 1
            p = processar_tarefa(t, nome_lista)
            if not p:
                continue
            chave = (p["cpf"], p["dn"])
            processos_por_cliente.setdefault(chave, []).append(p)
            nome_por_chave[chave] = p["nome"]

    print(f"[portal] {tarefas_completas} tarefas validas; "
          f"{tarefas_sem_cpf} sem CPF; {tarefas_sem_dn} sem DN")
    print(f"[portal] {len(processos_por_cliente)} clientes unicos com CPF+DN")

    # grava um JSON por cliente
    for (cpf, dn), processos in processos_por_cliente.items():
        h = hash_chave(cpf, dn)
        payload = {
            "nome": nome_por_chave[(cpf, dn)],
            "atualizado_em": datetime.now(TZ_BR).strftime("%d/%m/%Y as %H:%M"),
            "processos": processos,
        }
        (DATA_DIR / f"{h}.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    # metadado publico (sem CPF/DN/hash)
    meta = {
        "atualizado_em": datetime.now(TZ_BR).strftime("%d/%m/%Y %H:%M"),
        "total_clientes": len(processos_por_cliente),
        "salt": SALT.decode("utf-8"),
        "iter": PBKDF_ITER,
    }
    (DATA_DIR / "_meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[portal] OK: {len(processos_por_cliente)} arquivos gerados em {DATA_DIR}")


if __name__ == "__main__":
    main()
