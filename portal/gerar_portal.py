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


def _links_judicial(body_low):
    """Detecta o sistema judicial pelo body; se nao detectar, devolve as
    opcoes mais comuns (PJe 1g, PJe 2g, ESAJ)."""
    out = []
    if ("pje1" in body_low or "1º grau" in body_low or "1 grau" in body_low
            or "primeira instância" in body_low):
        out.append("pje1-trf3")
    if ("pje2" in body_low or "2º grau" in body_low or "2 grau" in body_low
            or "segunda instância" in body_low):
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
        out = ["pje1-trf3", "pje2-trf3", "esaj"]
    # dedupe preservando ordem
    seen = set(); uniq = []
    for k in out:
        if k not in seen:
            seen.add(k); uniq.append(k)
    return uniq


def links_para_processo(localizacao, body):
    """Devolve lista de links externos para o cliente consultar andamentos.

    Prioriza a Localizacao Atual no Escritorio. Se a localizacao indicar
    judicial, mostra apenas links judiciais (mesmo que o body mencione
    INSS no historico). Se for INSS, mostra Meu INSS. Etc.
    """
    body_low = (body or "").lower()

    # Por localizacao (prioritario)
    if localizacao == "Aguardando Decisão Judicial":
        return [LINKS_CATALOGO[k] for k in _links_judicial(body_low)]

    if localizacao in ("Aguardando decisão da Junta de Recursos",
                       "Aguardando decisão da Câmara de Julgamento"):
        return [LINKS_CATALOGO["e-sisrec"]]

    if localizacao == "Aguardando decisão do INSS":
        return [LINKS_CATALOGO["meu-inss"]]

    if localizacao == "Para apresentação de petição pelo advogado":
        # ambivalente: petição pode ser judicial OU CRPS. Decide pelo body.
        indic_rec_adm = ["e-sisrec", "esisrec", "crps", "câmara de julgamento",
                         "camara de julgamento", "junta de recursos",
                         "conselho de recursos"]
        if any(s in body_low for s in indic_rec_adm):
            return [LINKS_CATALOGO["e-sisrec"]]
        indic_judicial = ["pje", "esaj", "eproc", "tjsp", "trf3",
                          "vara federal", "vara civel", "vara cível",
                          "distribuída", "distribuida", "processo judicial"]
        if any(s in body_low for s in indic_judicial):
            return [LINKS_CATALOGO[k] for k in _links_judicial(body_low)]
        # default: assume recurso administrativo
        return [LINKS_CATALOGO["e-sisrec"]]

    return []

# Regex
RE_CPF_TITULO = re.compile(r"#\s*(\d{11})\b")
RE_DN_BODY = re.compile(r"^\s*DN\s*[:=]\s*(\d{2})/(\d{2})/(\d{4})\s*$", re.MULTILINE | re.IGNORECASE)
RE_DATA_BR = re.compile(r"\b(\d{2})/(\d{2})/(\d{4})\b")
# Cabecalho de entrada DD.MM.AAAA (X): no MEIO da linha (sem \n antes).
# Acontece quando Paulo digita "...Verificar em 17/03.07.03.2025 (A): ..."
# (data nova colada na data anterior). Pre-processamos para inserir \n.
RE_HEADER_INLINE = re.compile(
    r"(?<!^)(?<!\n)(\d{2}\.\d{2}\.\d{4}\s*\([A-Z]+\)\s*[:;])"
)


def normalizar_body(body):
    """Insere quebra de linha antes de cabecalhos de entrada que estao
    no meio de outra linha. Evita que multiplas entradas virem uma so."""
    if not body:
        return body
    return RE_HEADER_INLINE.sub(r"\n\1", body)
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
# Detecta cidade — varios padroes, em ordem de prioridade.
RE_LOCAIS = [
    re.compile(r"INSS\s+(?:de\s+)?([A-ZÀ-Ý][A-Za-zÀ-ÿ\s]+?)(?:[.,;\n)]|$)"),
    re.compile(r"ag[eê]ncia\s+(?:de\s+)?([A-ZÀ-Ý][A-Za-zÀ-ÿ\s]+?)(?:[.,;\n)]|$)", re.I),
    re.compile(r"(?:ambas?|sera|sera[oõ])\s+em\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ]+(?:\s+[A-Z][A-Za-zÀ-ÿ]+){0,2})\b", re.I),
    re.compile(r"\bem\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ]+(?:\s+[A-Z][A-Za-zÀ-ÿ]+){0,2})(?:[.,;\n)]|$)"),
]
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
    r"inicial protocolada",
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
    # standalone no inicio da frase: "Concedido!" ou "Concedido."
    r"(?:^|[.!?;\n])\s*concedido[!.\s]",
]
PAD_INDEFERIMENTO_INSS = [
    r"benef[ií]cio indeferido",
    r"INSS (?:indeferiu|negou)\s+(?:o\s+)?(?:pedido|requerimento|benef[ií]cio)",
    r"indeferimento (?:do|no) INSS",
    r"pedido indeferido", r"requerimento indeferido",
    # standalone: "Indeferido." no inicio da frase
    r"(?:^|[.!?;\n])\s*indeferido[!.\s]",
]

# Recurso INOMINADO (judicial — JEF/Turma Recursal)
PAD_RECURSO_INOMINADO = [
    r"recurso\s+inominado",
    r"recurso\s+(?:para\s+(?:a\s+)?)?turma\s+recursal",
]

# Manifestacoes/quesitos no processo judicial
PAD_MANIFESTACAO = [
    r"apresent(?:ei|ada|amos)\s+(?:os\s+)?quesitos",
    r"protocol(?:ei|ada)\s+quesitos",
    r"juntad[ao]\s+de\s+quesitos",
    r"apresent(?:ei|ada|amos)\s+manifesta[cç][aã]o",
    r"manifesta[cç][aã]o\s+(?:protocolada|apresentada)",
    r"manifestei\s+sobre",
    r"alega[cç][oõ]es\s+finais\s+(?:protocoladas|apresentadas)",
    r"replica\s+(?:protocolada|apresentada)",
    r"impugna[cç][aã]o\s+(?:protocolada|apresentada)",
]

# Laudo pericial juntado / disponivel
PAD_LAUDO_PERICIAL = [
    r"laudo\s+(?:pericial|m[eé]dico)?\s*(?:dispon[ií]vel|juntado|anexado|recebido|liberado)",
    r"juntad[ao]\s+(?:de\s+)?laudo",
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


def list_checklist_items(list_id, task_id):
    """Devolve items do checklist da tarefa, ou [] em caso de erro."""
    try:
        r = _req("GET", f"/me/todo/lists/{list_id}/tasks/{task_id}/checklistItems")
        return r.get("value", [])
    except Exception:
        return []


# Data isolada no item do checklist: "10/09/1964", "DN: 10/09/1964", etc.
RE_DATA_CHECKLIST = re.compile(r"\b(\d{2})/(\d{2})/(\d{4})\b")


def extrair_dn_do_checklist(items):
    """Procura uma DN plausivel nos items do checklist.

    Aceita qualquer item cujo displayName contenha DD/MM/AAAA.
    Filtra para evitar confundir com DER/data de protocolo: a DN
    precisa ser de uma pessoa com pelo menos 16 anos.
    """
    for it in items:
        name = (it.get("displayName") or "").strip()
        m = RE_DATA_CHECKLIST.search(name)
        if not m:
            continue
        try:
            d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date()
        except Exception:
            continue
        if d > HOJE or d.year < 1900:
            continue
        # Pelo menos 16 anos atras (filtra DERs e datas de andamento)
        idade_anos = (HOJE - d).days / 365.25
        if idade_anos < 16:
            continue
        return m.group(1), m.group(2), m.group(3)
    return None


_STOP_LOCAL = {
    "analise", "análise", "andamento", "atendimento", "anexo", "casa",
    "contato", "documentos", "drive", "escritorio", "escritório",
    "exames", "envelope", "frente", "geral", "honorarios", "honorários",
    "ligacao", "ligação", "mesa", "obs", "pasta", "papeis", "papéis",
    "razao", "razão", "relatorio", "relatório", "recepcao", "recepção",
    "telefone", "verificar", "vista",
}


def detectar_local(texto):
    """Procura a cidade no texto. Devolve 'INSS de Cidade' ou ''."""
    for rx in RE_LOCAIS:
        m = rx.search(texto)
        if not m:
            continue
        nome = re.split(r"\s{2,}|[,.]", m.group(1).strip())[0].strip()
        # filtra falsos positivos: palavras comuns que nao sao cidade
        if not nome or nome.lower() in _STOP_LOCAL:
            continue
        if len(nome) < 3:
            continue
        return f"INSS de {nome}"
    return ""


def extrair_proximo_evento(titulo, body):
    """Acha o evento futuro mais proximo (pericia/audiencia/avaliacao) e
    devolve dict {tipo, data, hora, local} ou None.

    Aceita datas no formato DD/MM/AAAA OU DD/MM. Para DD/MM, usa o ano
    do cabecalho de entrada (DD.MM.AAAA (X):) que contem a data, com
    fallback para o ano corrente.
    """
    body = normalizar_body(body)
    full = (titulo or "") + "\n" + (body or "")
    candidatos = []

    # Mapa posicao -> ano da entrada anterior (para inferir DD/MM)
    offset_body = len(titulo or "") + 1
    headers = []
    for m in RE_ENTRADA.finditer(body or ""):
        headers.append((m.start() + offset_body, int(m.group(3))))

    def ano_da_entrada(pos):
        ano = HOJE.year
        for h_pos, h_ano in headers:
            if h_pos < pos:
                ano = h_ano
            else:
                break
        return ano

    # 1. DD/MM/AAAA
    encontradas = []
    for m in RE_DATA_BR.finditer(full):
        d = parse_data(m.group(1), m.group(2), m.group(3))
        if d:
            encontradas.append((d, m.start(), m.end()))

    # 2. DD/MM (sem ano) — usa ano da entrada que contem
    spans_completos = [(s, e) for (_, s, e) in encontradas]
    for m in RE_DATA_CURTA.finditer(full):
        sobreposto = any(s <= m.start() < e or s < m.end() <= e
                          for s, e in spans_completos)
        if sobreposto:
            continue
        try:
            dia, mes = int(m.group(1)), int(m.group(2))
            ano_base = ano_da_entrada(m.start())
            d = datetime(ano_base, mes, dia).date()
        except Exception:
            continue
        # so aceita se for futuro nos proximos 180 dias.
        # NAO tenta ano_base+1 — se a entrada eh de 2025 e diz "11/06",
        # entao eh 11/06/2025 (passou). Nao inventa evento futuro.
        if not (0 <= (d - HOJE).days <= 180):
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
        # Local: tenta na sentenca primeiro; se nada, tenta na entrada
        # inteira (ate ~400 chars depois do match)
        local = detectar_local(ctx)
        if not local:
            ctx_amplo = full[max(0, start - 80): min(len(full), end + 400)]
            local = detectar_local(ctx_amplo)
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


# Verbos em 1a pessoa do escritorio -> base do participio passivo
VERBO_PARTICIPIO = {
    "Apresentei": "Apresentad",
    "Solicitei": "Solicitad",
    "Protocolei": "Protocolad",
    "Enviei": "Enviad",
    "Interpus": "Interpost",
    "Opus": "Opost",
    "Juntei": "Juntad",
    "Anexei": "Anexad",
    "Manifestei": "Manifestad",
    "Recebi": "Recebid",
    "Pedi": "Pedid",
    "Agendei": "Agendad",
    "Reagendei": "Reagendad",
}
# Substantivos femininos que vem depois do verbo, para flexao
FEM_SUBSTANTIVOS = {
    "inicial", "manifestacao", "manifestação", "replica", "réplica",
    "alegacoes", "alegações", "impugnacao", "impugnação", "peticao",
    "petição", "audiencia", "audiência", "pericia", "perícia",
    "decisao", "decisão", "sentenca", "sentença", "juntada",
    "contestacao", "contestação", "execucao", "execução",
    "procuracao", "procuração", "exigencia", "exigência",
}


def _flexionar(base, proxima):
    """Devolve a forma flexionada do participio."""
    if not proxima:
        return base + "o"
    p = proxima.lower().rstrip(",.;!?:")
    artigos = {"o": "o", "a": "a", "os": "os", "as": "as",
               "um": "o", "uma": "a", "uns": "os", "umas": "as"}
    if p in artigos:
        return base + artigos[p]
    # plural se termina em 's' e tem >3 caracteres
    plural = p.endswith("s") and len(p) > 3
    base_subst = p[:-1] if plural else p
    fem = (base_subst in FEM_SUBSTANTIVOS or p in FEM_SUBSTANTIVOS
           or base_subst.endswith("a") or base_subst.endswith("ção")
           or base_subst.endswith("cao") or base_subst.endswith("agem")
           or base_subst.endswith("idade") or base_subst.endswith("ude"))
    if plural and fem: return base + "as"
    if plural:         return base + "os"
    if fem:            return base + "a"
    return base + "o"


def terceirizar_descricao(texto):
    """Converte 'Apresentei recurso' -> 'Apresentado recurso', etc.
    Aplica em qualquer ocorrencia dentro do texto."""
    if not texto:
        return texto
    for verbo, base in VERBO_PARTICIPIO.items():
        rx = re.compile(rf"\b{verbo}\b\s*(\S*)")
        def _sub(m, base=base):
            proxima = m.group(1)
            return _flexionar(base, proxima) + (" " + proxima if proxima else "")
        texto = rx.sub(_sub, texto)
    return texto


def limpar_descricao(conteudo, padroes=None):
    """Devolve uma descricao curta e limpa para mostrar ao cliente.

    Se 'padroes' for fornecido, escolhe a primeira SENTENCA que casa
    com algum padrao (em vez de pegar simplesmente a 1a frase).
    """
    txt = RE_BOT_LOG.sub("", conteudo)
    txt = RE_RESPOSTA_INTERNA.sub("", txt)
    txt = RE_LINHAS_RUIDO.sub("", txt)
    # "Último evento: Sessão X" -> "Sessão X"
    txt = RE_ULTIMO_EVENTO.sub("", txt)
    # colapsa multiplas quebras / espacos
    txt = re.sub(r"\n+", " ", txt)
    txt = re.sub(r"\s{2,}", " ", txt).strip()
    sentencas = re.split(r"(?<=[.!?])\s+", txt)
    # escolhe a sentenca relevante para a categoria, se aplicavel
    escolhida = None
    if padroes:
        for s in sentencas:
            s_low = s.lower()
            if any(re.search(p, s_low) for p in padroes):
                escolhida = s
                break
    if escolhida is None:
        escolhida = sentencas[0] if sentencas else ""
    # despessoaliza: "Apresentei recurso" -> "Apresentado recurso"
    return terceirizar_descricao(escolhida.strip())[:240]


# (categoria, padroes, exclusoes) — avaliados em ordem; o primeiro hit ganha.
# Mais especifico antes; resultados antes de interposicao.
TIMELINE_CATEGORIAS = [
    # judicial
    ("Ação judicial protocolada", PAD_JUDICIAL, None),
    ("Decisão judicial favorável", PAD_DECISAO_JUD, None),
    ("Decisão judicial desfavorável", PAD_INDEFERIMENTO_JUD, None),
    ("Recurso inominado interposto", PAD_RECURSO_INOMINADO, None),
    ("Laudo pericial juntado", PAD_LAUDO_PERICIAL, None),
    ("Manifestação no processo judicial", PAD_MANIFESTACAO, None),

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
    """Retorna (nome, padroes_que_casaram) ou None.

    Os padroes sao devolvidos para que limpar_descricao escolha a
    sentenca relevante, em vez de simplesmente pegar a primeira.
    """
    ctx_low = conteudo.lower()
    for nome, padroes, exclui in TIMELINE_CATEGORIAS:
        if hit(ctx_low, padroes, exclui):
            return nome, padroes
    return None


def extrair_timeline(body):
    """Le entradas DD.MM.AAAA (X): e categoriza marcos relevantes.

    Retorna lista ordenada por data desc: [{data, data_br, tipo, descricao}].
    """
    body = normalizar_body(body)
    timeline = []
    for m in RE_ENTRADA.finditer(body or ""):
        d = parse_data(m.group(1), m.group(2), m.group(3))
        if not d:
            continue
        conteudo = m.group(5).strip()
        conteudo = RE_BOT_LOG.sub("", conteudo).strip()
        if not conteudo:
            continue
        cat = categorizar_entrada(conteudo)
        if not cat:
            continue
        nome, padroes = cat
        timeline.append({
            "data": d.isoformat(),
            "data_br": d.strftime("%d/%m/%Y"),
            "tipo": nome,
            "descricao": limpar_descricao(conteudo, padroes=padroes),
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
    body = normalizar_body(body)
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


def processar_tarefa(t, lista_nome, dn_partes=None):
    """Monta o registro do processo para um cliente.

    dn_partes (opcional): tupla (DD, MM, AAAA) ja obtida (do checklist,
    por ex.). Se None, busca a DN no body.
    """
    titulo = t.get("title", "") or ""
    body = (t.get("body", {}) or {}).get("content", "") or ""
    m_cpf = RE_CPF_TITULO.search(titulo)
    if not m_cpf:
        return None
    cpf = m_cpf.group(1)
    if dn_partes is None:
        m_dn = RE_DN_BODY.search(body)
        if not m_dn:
            return None
        dn_partes = (m_dn.group(1), m_dn.group(2), m_dn.group(3))
    dn = normalizar_dn(*dn_partes)
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
    dn_do_checklist = 0

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
            # Tenta DN no body primeiro; se nao, no checklist
            dn_partes = None
            m_dn = RE_DN_BODY.search(body)
            if m_dn:
                dn_partes = (m_dn.group(1), m_dn.group(2), m_dn.group(3))
            else:
                items = list_checklist_items(lst["id"], t["id"])
                dn_partes = extrair_dn_do_checklist(items)
                if dn_partes:
                    dn_do_checklist += 1
            if not dn_partes:
                tarefas_sem_dn += 1
                continue
            tarefas_completas += 1
            p = processar_tarefa(t, nome_lista, dn_partes=dn_partes)
            if not p:
                continue
            chave = (p["cpf"], p["dn"])
            processos_por_cliente.setdefault(chave, []).append(p)
            nome_por_chave[chave] = p["nome"]

    print(f"[portal] {tarefas_completas} tarefas validas; "
          f"{tarefas_sem_cpf} sem CPF; {tarefas_sem_dn} sem DN")
    print(f"[portal] {dn_do_checklist} DN(s) obtidas via checklist")
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
