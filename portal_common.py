"""Primitivas compartilhadas pelos geradores do portal do cliente
(build_portal_listas.py e build_portal_escritorio.py).

Aqui vive tudo que os dois geradores precisam igual: parsing de CPF/DN das
tarefas do To Do, a quebra do corpo em blocos datados e a derivação da chave
de login hash(CPF|DN) — que TEM de bater bit a bit com docs/portal/app.js
(PBKDF2-SHA256 + SHA-256, 16 bytes hex, salt/iter de data/_meta.json).
"""
import re, os, json, hashlib, pathlib, datetime, urllib.request

DATA_DIR = pathlib.Path("docs/portal/data")
HOJE = datetime.date.today()


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
    """Extrai uma data de nascimento plausivel (1920-2012) de um checklist."""
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


def derivar_hash(cpf, dn, salt, iters):
    bits = hashlib.pbkdf2_hmac("sha256", (cpf + "|" + dn).encode(), salt.encode(), iters, dklen=32)
    return hashlib.sha256(bits).digest()[:16].hex()


# ══════════════════════════════════════════════════════════════════════════
# F120 · A ETAPA DECLARADA NO CRM CHEGA AO PORTAL DO CLIENTE
#
# Até aqui a frase que o cliente lia era DEDUZIDA do último comentário do To
# Do. Quando o texto não era classificável sobrava "Em andamento", que não
# informa nada. O CRM passou a ter a ETAPA (casos.etapa, F119), que é o estado
# que o escritório DECLARA. É ela que responde à pergunta do cliente.
#
# REGRAS QUE ESTE BLOCO NÃO PODE QUEBRAR
# 1. SOMENTE LEITURA. Só emite GET, e só de duas colunas por tabela.
# 2. SÓ SAI O QUE ESTÁ NO CATÁLOGO. Etapa escrita à mão no CRM NÃO vai ao
#    portal, fica no CRM. Publicar texto livre sem revisão é o mesmo risco que
#    o is_internal() existe para impedir.
# 3. SEM BANCO, SEM ETAPA. Faltando SUPABASE_URL ou a chave, ou caindo a rede,
#    o gerador roda exatamente como antes. A etapa melhora o portal, não é
#    condição para ele existir.
# ══════════════════════════════════════════════════════════════════════════

# espelho do ETAPAS_POR_FASE de crm/fase2/app.html — ao acrescentar etapa lá,
# acrescente aqui, senão ela simplesmente não aparece para o cliente
ETAPAS_PUBLICAS = {
    "em atendimento", "reunindo documentos", "análise de direito", "aguardando o cliente",
    "requerimento protocolado", "aguardando perícia", "perícia realizada", "em exigência",
    "aguardando análise", "decidido",
    "recurso protocolado", "aguardando distribuição", "em diligência", "em pauta", "julgado",
    "ação distribuída", "aguardando citação", "contestação apresentada", "perícia designada",
    "aguardando sentença", "sentença publicada", "em recurso",
    "a redigir", "redigida", "a protocolar",
    "aguardando implantação", "benefício implantado", "aguardando RPV", "RPV expedida", "recebido",
    "monitorando", "documentação em dia", "pronto para protocolar",
}


def _supa_pagina(url, chave, caminho, pagina=1000):
    """GET paginado no PostgREST. Devolve a lista inteira."""
    fora, inicio = [], 0
    while True:
        alvo = f"{url}{caminho}&limit={pagina}&offset={inicio}"
        req = urllib.request.Request(alvo, headers={
            "apikey": chave, "Authorization": "Bearer " + chave})
        with urllib.request.urlopen(req, timeout=60) as r:
            lote = json.loads(r.read() or b"[]")
        fora.extend(lote)
        if len(lote) < pagina:
            return fora
        inicio += pagina


def etapas_do_crm():
    """{(cpf, lista): etapa} com as etapas que o escritório declarou no CRM.

    Devolve {} quando não há banco configurado ou a leitura falha — o portal
    continua sendo gerado, só sem a etapa."""
    url = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    chave = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not url or not chave:
        return {}
    try:
        clientes = _supa_pagina(url, chave, "/rest/v1/clientes?select=id,cpf&cpf=not.is.null")
        casos = _supa_pagina(url, chave,
                             "/rest/v1/casos?select=cliente_id,etapa,fase,mover_para,origem_lista"
                             "&etapa=not.is.null")
    except Exception as e:
        print(f"   (etapas do CRM indisponíveis: {type(e).__name__})")
        return {}
    cpf_de = {c["id"]: digits(c.get("cpf")) for c in clientes if digits(c.get("cpf")) }
    mapa = {}
    for k in casos:
        if k.get("fase") == "encerrado":
            continue
        etapa = (k.get("etapa") or "").strip()
        if etapa not in ETAPAS_PUBLICAS:      # etapa à mão não vai ao portal
            continue
        cpf = cpf_de.get(k.get("cliente_id"))
        lista = k.get("mover_para") or k.get("origem_lista")
        if cpf and lista:
            mapa[(cpf, lista)] = etapa
    return mapa


def frase_da_etapa(etapa):
    """A etapa como o cliente lê: a mesma palavra do escritório, com inicial
    maiúscula. Nada de reescrever — quem escolhe o que dizer é o advogado."""
    e = (etapa or "").strip()
    return (e[0].upper() + e[1:]) if e else ""
