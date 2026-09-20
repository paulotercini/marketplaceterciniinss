"""Confronto do texto local com a fonte oficial. Sem disfarçar o cliente e sem contornar bloqueio.

Medido em 20/09/2026 desta máquina: o Planalto resolve o DNS, abre a conexão e não devolve byte
até o timeout, para `curl` e para `urllib`, em http e em https. Pelo navegador a mesma URL abre.
O `portalin.inss.gov.br` e o `normaslegais.com.br` respondem em menos de 1,5 s. Portanto a
verificação de 53 das 55 fontes depende hoje do navegador, e o estado `exige_navegador` diz
isso em vez de fingir que a norma não foi localizada.

O hash comparado é o que este módulo calcula sobre o texto normalizado da página, gravado a cada
verificação. Os hashes do frontmatter do corpus não servem para isso: são quatro esquemas
diferentes, calculados sobre entradas diferentes, e três arquivos não têm nenhum.
"""
import json, re, urllib.error, urllib.request

import parser

TEMPO_LIMITE = 20
PORTALIN = "https://portalin.inss.gov.br/"

# Espelho OFICIAL a tentar quando a fonte primária não responde a cliente HTTP. O portalin é do
# próprio INSS e traz a IN 128 e as Portarias consolidadas. Medido em 20/09/2026: a página é um
# shell Angular de 1.754 bytes, os mesmos 1.754 bytes dos seis placeholders que a captura do
# corpus já guardou em _downloads. O texto vive no bundle main.<hash>.js, 9,5 MB, com 4.864
# ocorrências de "Art. N". O hash do nome do bundle muda quando o portal republica, e é ele que
# serve de impressão digital: exato e mil vezes mais barato do que baixar o bundle.
ESPELHO_OFICIAL = {
    "in-128-2022": PORTALIN,
    "portaria-dirben-990-2022": PORTALIN, "portaria-dirben-991-2022": PORTALIN,
    "portaria-dirben-992-2022": PORTALIN, "portaria-dirben-993-2022": PORTALIN,
    "portaria-dirben-994-2022": PORTALIN, "portaria-dirben-995-2022": PORTALIN,
    "portaria-dirben-996-2022": PORTALIN,
}
AGENTE = "mcp-normas/0.1 (escritorio previdenciario; verificacao de atualizacao de norma)"

ESTADOS = {
    "igual": "a fonte respondeu e o texto continua o mesmo da última verificação",
    "mudou": "a fonte respondeu e o texto mudou desde a última verificação",
    "primeira_leitura": "a fonte respondeu e esta é a primeira impressão digital gravada",
    "exige_navegador": "a fonte não responde a cliente HTTP comum desta máquina; abra a URL no "
                       "navegador e confira à mão. Não é ausência da norma",
    "nao_localizado": "a fonte devolveu 404. Não localizado não significa inexistente",
    "sem_fonte": "a norma não tem fonte_oficial gravada e não pode ser verificada",
}


def texto_da_pagina(bruto):
    """HTML ou texto puro -> texto corrido. Suficiente para impressão digital e para achar o ano
    da norma alteradora mais recente citada."""
    try:
        html = bruto.decode("utf-8")
    except UnicodeDecodeError:
        html = bruto.decode("latin-1", errors="replace")
    html = re.sub(r'(?is)<(script|style)\b.*?</\1>', " ", html)
    return re.sub(r'\s+', " ", re.sub(r'<[^>]+>', " ", html)).strip()


def ano_mais_recente(texto):
    """Maior ano citado em marcador de alteração na página. É o sinal de que a fonte andou."""
    anos = []
    for m in parser.RE_MARCADOR.finditer(texto):
        a = parser._ano(m.group(2))
        if a:
            anos.append(a)
    return max(anos) if anos else None


def impressao_portalin(bruto):
    """O portalin serve um shell Angular. A impressão digital é o nome do bundle, que o webpack
    deriva do conteúdo, então ele muda exatamente quando o texto muda."""
    m = re.search(r'src="(main\.[0-9a-f]+\.js)"', bruto.decode("utf-8", errors="replace"))
    return m.group(1) if m else None


def buscar(url):
    """(bruto, erro). Nunca levanta: quem chama precisa do estado, não da exceção."""
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
    try:
        with urllib.request.urlopen(req, timeout=TEMPO_LIMITE) as r:
            return r.read(), None
    except urllib.error.HTTPError as e:
        return None, f"http {e.code}"
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"


def conferir(norma, anterior=None):
    """norma: linha da tabela norma. anterior: detalhe json da última verificação, se houver.
    Devolve (estado, detalhe)."""
    url = norma["fonte_oficial"]
    if not url:
        return "sem_fonte", {"motivo": ESTADOS["sem_fonte"]}
    bruto, erro = buscar(url)
    fonte_usada, espelho = url, ESPELHO_OFICIAL.get(norma["id"])
    if bruto is None and espelho:
        # a fonte primária não respondeu; tenta o espelho oficial do próprio INSS
        bruto, erro_espelho = buscar(espelho)
        if bruto is not None:
            fonte_usada, erro = espelho, None
        else:
            erro = f"{erro}; espelho {espelho}: {erro_espelho}"
    if erro == "http 404":
        return "nao_localizado", {"url": url, "motivo": ESTADOS["nao_localizado"]}
    if bruto is None:
        return "exige_navegador", {
            "url": url, "erro_do_cliente": erro, "motivo": ESTADOS["exige_navegador"],
            "o_que_conferir": f"Abra {url} no navegador e compare a norma alteradora mais "
                              f"recente com '{norma['ultima_alteracao_conhecida'] or 'não registrada'}', "
                              f"que é o que o arquivo baixado em {norma['data_download']} registra."}
    if fonte_usada == PORTALIN:
        bundle = impressao_portalin(bruto)
        if not bundle:
            return "exige_navegador", {
                "url": fonte_usada, "erro_do_cliente": "bundle main.js não localizado no shell",
                "motivo": ESTADOS["exige_navegador"],
                "o_que_conferir": f"Abra {fonte_usada} no navegador e confira a norma à mão."}
        texto, impressao = "", parser.impressao(bundle)
    else:
        texto = texto_da_pagina(bruto)
        impressao = parser.impressao(texto)
    detalhe = {"url": fonte_usada, "fonte_primaria": url, "bytes": len(bruto),
               "impressao_remota": impressao,
               "ano_mais_recente_na_fonte": ano_mais_recente(texto) if texto else None,
               "ultima_alteracao_no_arquivo": norma["ultima_alteracao_conhecida"],
               "data_download_do_arquivo": norma["data_download"]}
    antes = (anterior or {}).get("impressao_remota")
    if not antes:
        detalhe["motivo"] = ESTADOS["primeira_leitura"]
        return "primeira_leitura", detalhe
    if antes == impressao:
        detalhe["motivo"] = ESTADOS["igual"]
        return "igual", detalhe
    detalhe["impressao_remota_anterior"] = antes
    detalhe["motivo"] = ESTADOS["mudou"]
    return "mudou", detalhe


def conferir_todas(con, norma_id=""):
    import banco
    sql = "SELECT * FROM norma" + (" WHERE id=?" if norma_id else "") + " ORDER BY id"
    linhas = con.execute(sql, (norma_id,) if norma_id else ()).fetchall()
    if not linhas:
        return {"erro": "nao_localizado", "dica": "Confira o identificador em visao_geral_normas."}
    fora = []
    for n in linhas:
        v = con.execute("SELECT detalhe FROM verificacao WHERE norma_id=?", (n["id"],)).fetchone()
        anterior = json.loads(v["detalhe"]) if v and v["detalhe"] else None
        estado, detalhe = conferir(n, anterior)
        banco.registrar_verificacao(con, n["id"], estado, detalhe)
        fora.append({"norma": n["id"], "estado": estado, **detalhe})
    return {"verificadas": len(fora), "estados": ESTADOS, "resultado": fora}
