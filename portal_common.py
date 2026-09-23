"""Primitivas compartilhadas pelos geradores do portal do cliente
(build_portal_listas.py e build_portal_escritorio.py).

Aqui vive tudo que os dois geradores precisam igual: parsing de CPF/DN das
tarefas do To Do, a quebra do corpo em blocos datados e a derivação da chave
de login hash(CPF|DN) e da chave que cifra a ficha — que TÊM de bater bit a
bit com docs/portal/app.js (PBKDF2-SHA256 + SHA-256, 16 bytes hex, salt/iter
de data/_meta.json; AES-256-GCM, ver F122).
"""
import re, os, json, hmac, base64, hashlib, pathlib, datetime, urllib.request

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


def gravar_json(path, dados):
    """Grava a ficha em UTF-8 e de forma ATÔMICA.

    [BUG 19.09.2026] `path.write_text(...)` sem encoding usa o padrão do
    sistema. No Windows isso é cp1252, que não sabe escrever o 🌻 do nome da
    lista: o Python ABRE o arquivo (esvaziando-o), estoura no emoji e a ficha
    do cliente fica com ZERO byte. Duas fichas foram zeradas assim.

    Por isso, duas regras aqui: encoding SEMPRE explícito, e a escrita vai num
    temporário ao lado, que só substitui o arquivo bom quando terminou inteira.
    Falha no meio do caminho não destrói mais a ficha que já estava publicada.
    """
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def _bits(cpf, dn, salt, iters):
    return hashlib.pbkdf2_hmac("sha256", (cpf + "|" + dn).encode(), salt.encode(), iters, dklen=32)


def derivar_hash(cpf, dn, salt, iters):
    return hashlib.sha256(_bits(cpf, dn, salt, iters)).digest()[:16].hex()


# ══════════════════════════════════════════════════════════════════════════
# F122 · A FICHA PUBLICADA É CIFRADA
#
# O repositório é público. O nome do arquivo derivado de CPF|DN só impedia
# adivinhar o endereço; quem listasse docs/portal/data lia nome, CPF, DN e a
# linha do tempo de todos os clientes. Agora o CONTEÚDO também depende de
# CPF|DN: do mesmo PBKDF2 saem dois valores independentes,
#   nome do arquivo = SHA-256(bits)[:16]            (como antes)
#   chave AES-256   = HMAC-SHA256(bits, ROTULO_CHAVE)
# e a ficha vai gravada como {"v":1,"iv":...,"ct":...} em AES-GCM, com o nome
# do arquivo como dado autenticado (a ficha não serve em outro endereço).
# docs/portal/app.js refaz a mesma conta no navegador e decifra lá.
# ══════════════════════════════════════════════════════════════════════════

ROTULO_CHAVE = b"portal-tercini-chave-v1"


def derivar(cpf, dn, salt, iters):
    """(nome do arquivo, chave AES) com um PBKDF2 só."""
    bits = _bits(cpf, dn, salt, iters)
    return (hashlib.sha256(bits).digest()[:16].hex(),
            hmac.new(bits, ROTULO_CHAVE, hashlib.sha256).digest())


def _aesgcm(chave):
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError:
        raise SystemExit("Falta a biblioteca de cifra: rode  pip install cryptography")
    return AESGCM(chave)


def cifrar_ficha(ficha, chave, h):
    iv = os.urandom(12)
    ct = _aesgcm(chave).encrypt(iv, json.dumps(ficha, ensure_ascii=False).encode("utf-8"), h.encode())
    return {"v": 1, "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}


def decifrar_ficha(dados, chave, h):
    """Aceita a ficha cifrada e, por compatibilidade, a ficha em claro antiga."""
    if "ct" not in dados:
        return dados
    pt = _aesgcm(chave).decrypt(base64.b64decode(dados["iv"]), base64.b64decode(dados["ct"]), h.encode())
    return json.loads(pt.decode("utf-8"))


def ler_ficha(path, chave, h):
    """Ficha decifrada, ou None se não existe. Ficha que existe e não se lê
    levanta ValueError: regravar por cima dela apagaria os processos curados."""
    if not path.exists():
        return None
    try:
        return decifrar_ficha(json.loads(path.read_text(encoding="utf-8")), chave, h)
    except SystemExit:
        raise
    except Exception as e:
        raise ValueError(f"ficha ilegível {path.name}: {type(e).__name__}") from e


def gravar_ficha(path, ficha, chave, h):
    gravar_json(path, cifrar_ficha(ficha, chave, h))


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


def crm_do_cliente():
    """{(cpf, lista): {"etapa": …, "fila": …, "fila_em": …}} com o que o CRM sabe.

    ETAPA é o estado que o escritório DECLARA, e só sai se estiver no catálogo.
    FILA é a posição do processo na ordem de julgamento do TRF3 (F121), lida do
    painel público e gravada em casos.trf3. É número, não texto livre, e por
    isso não passa pelo catálogo — mas só vale para caso na fase judicial.

    Devolve {} quando não há banco configurado ou a leitura falha — o portal
    continua sendo gerado, só sem nada disso."""
    url = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    chave = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not url or not chave:
        return {}
    try:
        clientes = _supa_pagina(url, chave, "/rest/v1/clientes?select=id,cpf&cpf=not.is.null")
        casos = _supa_pagina(url, chave,
                             "/rest/v1/casos?select=cliente_id,etapa,fase,mover_para,origem_lista,trf3"
                             "&or=(etapa.not.is.null,trf3.not.is.null)")
    except Exception as e:
        print(f"   (dados do CRM indisponíveis: {type(e).__name__})")
        return {}
    cpf_de = {c["id"]: digits(c.get("cpf")) for c in clientes if digits(c.get("cpf")) }
    mapa = {}
    for k in casos:
        if k.get("fase") == "encerrado":
            continue
        cpf = cpf_de.get(k.get("cliente_id"))
        lista = k.get("mover_para") or k.get("origem_lista")
        if not (cpf and lista):
            continue
        fora = {}
        etapa = (k.get("etapa") or "").strip()
        if etapa in ETAPAS_PUBLICAS:          # etapa à mão não vai ao portal
            fora["etapa"] = etapa
        t = k.get("trf3") or {}
        # o painel cobre a 3ª Região inteira, vara e JEF de primeiro grau
        # inclusive, e a fila de cada um é fila de julgamento do seu órgão
        if k.get("fase") == "judicial" and isinstance(t, dict) and t.get("ordem"):
            fora["fila"] = f"{t['ordem']}º de {t['total']}" if t.get("total") else f"{t['ordem']}º"
            if t.get("consultado_em"):
                fora["fila_em"] = _br(t["consultado_em"])
        if fora:
            mapa[(cpf, lista)] = fora
    return mapa


def _br(iso):
    s = str(iso or "")[:10]
    return f"{s[8:10]}/{s[5:7]}/{s[:4]}" if len(s) == 10 else ""


def etapas_do_crm():
    """{(cpf, lista): etapa} — compatibilidade com quem só quer a etapa."""
    return {ch: v["etapa"] for ch, v in crm_do_cliente().items() if v.get("etapa")}


def frase_da_etapa(etapa):
    """A etapa como o cliente lê: a mesma palavra do escritório, com inicial
    maiúscula. Nada de reescrever — quem escolhe o que dizer é o advogado."""
    e = (etapa or "").strip()
    return (e[0].upper() + e[1:]) if e else ""
