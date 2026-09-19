"""Resposta da Jurisprudência Unificada do CJF -> documentos. Regra pura, sem rede e sem banco.

Layout medido em 19/09/2026 (SONDA-2026-09-19.md): cada documento é uma
<table class="table_pesquisa_lista" id="doc_...">, com pares de rótulo (span.label_pontilhada)
e valor na linha seguinte. Lê pelo RÓTULO, nunca pela posição. Falha de forma explícita quando
o documento não traz o esperado, porque campo vazio em silêncio é o pior resultado de uma
mudança de layout.
"""
import datetime, html as _html, re

RE_CNJ = re.compile(r"\d{7}-\d{2}\.\d{4}\.4\.03\.\d{4}")
# nas Recursais o CJF entrega o nome sem os acentos ("Turma Regional de Uniformizao"), daí o prefixo
ORGAOS_PREV = re.compile(r"^(7|8|9|10)ª Turma$|^3ª Seção$|Turma Recursal|Turma Regional de Uniformiza", re.I)
RE_DOC = re.compile(r'<table class="table_pesquisa_lista" id="doc_([^"]+)"')
RE_PAR = re.compile(r'<span class="label_pontilhada">(.*?)</span>\s*</td>\s*</tr>\s*<tr>\s*<td>(.*?)</td>\s*</tr>',
                    re.S)

# linhas de qualificação: servem para achar o polo e depois saem do texto (dado pessoal de terceiro)
# ponytail: só sai a linha "RÓTULO: nome". Nome citado no corpo do relatório ou em lista sem rótulo permanece,
# e o servidor não devolve campo de partes. Anonimizar o corpo exigiria NER, fora do escopo.
POLO_ATIVO = r"APELANTE|AGRAVANTE|RECORRENTE|EMBARGANTE|IMPETRANTE|REQUERENTE|SUSCITANTE|AUTOR(?:A)?|PARTE AUTORA"
POLO_PASSIVO = r"APELADO|AGRAVADO|RECORRIDO|EMBARGADO|IMPETRADO|REQUERIDO|SUSCITADO|R[ÉE]U|PARTE R[ÉE]|INTERESSADO"
RE_ATIVO = re.compile(rf"^\s*(?:{POLO_ATIVO})(?:\(A\))?\s*:\s*(.+)$", re.M | re.I)
RE_QUALIF = re.compile(
    rf"^\s*(?:{POLO_ATIVO}|{POLO_PASSIVO}|ADVOGADOS?(?: do\(a\)[^:\n]*)?|PROCURADOR(?:A)?|REPRESENTANTE|CURADOR(?:A)?)"
    r"(?:\(A\))?\s*:.*$\n?", re.M | re.I)

SECOES = [("e_caso_exame", r"CASO EM EXAME"), ("e_questao", r"QUEST(?:ÃO|ÕES) EM DISCUSSÃO"),
          ("e_razoes", r"RAZ(?:ÕES|ÃO) DE DECIDIR"), ("e_dispositivo", r"DISPOSITIVO(?: E TESE)?")]
# o título às vezes vem colado ao fim da frase anterior ("...administrativa.III. RAZÕES DE DECIDIR")
RE_SECAO = re.compile(r"(?:^|(?<=[.;]))\s*(?:[IVX]+\s*[.\-–)]\s*)?(" + "|".join(s for _, s in SECOES) + r")\s*[:.]?\s*$",
                      re.M | re.I)


class LayoutMudou(Exception):
    pass


def _limpo(t):
    t = re.sub(r"[ \t\xa0]+", " ", t or "")
    return re.sub(r"\s*\n\s*(\n\s*)*", lambda m: "\n\n" if m.group(1) else "\n", t).strip()


def _texto(v):
    v = re.sub(r"<br\s*/?>", "\n", v)
    return _limpo(_html.unescape(re.sub(r"<[^>]+>", "", v)))


def _iso(t):
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", t or "")
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None


def polo_recorrente(texto):
    nomes = RE_ATIVO.findall(texto or "")
    if not nomes:
        return "indefinido"
    inss = [bool(re.search(r"INSS|INSTITUTO NACIONAL DO SEGURO SOCIAL", n, re.I)) for n in nomes]
    return "ambos" if any(inss) and not all(inss) else "inss" if all(inss) else "segurado"


def resultado(texto):
    """Heurística sobre o dispositivo. A ordem importa: 'parcialmente provido' contém 'provido'."""
    t = (texto or "").lower()
    for rotulo, padrao in (
            ("parcial", r"parcial(?:mente)?\s+provi|provi\w+\s+(?:em\s+parte|parcial)|parcial provimento"),
            ("nao_conhecido", r"não\s+conhec|nao\s+conhec"),
            ("negado", r"desprovi|improvi|não\s+provi|neg\w+\s+provimento|nego\s+provimento|rejeit"),
            ("provido", r"provi\w+|d(?:ar|ou|á)\s+provimento|acolh")):
        if re.search(padrao, t):
            return rotulo
    return "outro"


def segmentar_ementa(ementa):
    marcas = list(RE_SECAO.finditer(ementa))
    out = dict.fromkeys(c for c, _ in SECOES)
    for i, m in enumerate(marcas):
        fim = marcas[i + 1].start() if i + 1 < len(marcas) else len(ementa)
        corpo = ementa[m.end():fim]
        if i + 1 == len(marcas):                     # a última seção não engole o rodapé da ementa
            corpo = re.split(r"(?im)^\s*_{3,}|^\s*Dispositivos relevantes citados|^\s*Jurisprudência relevante",
                             corpo)[0]
        for coluna, padrao in SECOES:
            if re.fullmatch(padrao, m.group(1), re.I):
                out[coluna] = corpo.strip() or None
    return out


def _sem_cargo(nome):
    # formas medidas: "Desembargadora Federal", "Juiz Federal Convocado", "JUÍZA CONVOCADA" e, nas Recursais,
    # "Juza Federal", sem o acento
    return re.sub(r"^(Desembargadora?(\s+Federal)?|Ju[ií]?za?(\s+Federal)?(\s+(Convocad[oa]|Substitut[oa]))?)\s+", "",
                  nome or "", flags=re.I).strip() or None


def relator_titular(teor):
    """Linha "RELATOR: NOME" do cabeçalho do inteiro teor, que traz o titular do gabinete."""
    m = re.search(r"(?m)^\s*RELATORA?(?:\(A\))?\s*:\s*(.+)$", teor[:4000])
    if not m:
        return None
    # medido em 19/09/2026, a linha traz só o nome; o prefixo de cargo sai apenas se vier no início
    return re.sub(r"^(DES(EMBARGADORA?)?\.?\s*(FED(ERAL)?\.?)?|JU[IÍ]ZA?\s+FEDERAL(\s+CONVOCAD[OA])?)\s+", "",
                  m.group(1).strip(), flags=re.I).strip() or None


def ids(resposta):
    return RE_DOC.findall(resposta)


def extrair(resposta, acervo, so_previdenciario=True):
    partes = RE_DOC.split(resposta)                      # [antes, id1, corpo1, id2, corpo2, ...]
    agora = datetime.datetime.now().isoformat(timespec="seconds")
    docs = []
    for id_fonte, corpo in zip(partes[1::2], partes[2::2]):
        c = {re.sub(r"\s+", " ", _texto(r)): _texto(v) for r, v in RE_PAR.findall(corpo)}
        cnj = RE_CNJ.search(c.get("Número", ""))
        orgao, bruto_ementa, bruto_teor = c.get("Órgão julgador", ""), c.get("Ementa", ""), c.get("Decisão", "")
        if not cnj or not orgao or not c.get("Data"):
            raise LayoutMudou(f"doc {id_fonte}: rótulos lidos = {sorted(c)}")
        if not (bruto_ementa or bruto_teor):     # o CJF tem registro antigo só com link de inteiro teor, sem texto
            continue
        if so_previdenciario and not ORGAOS_PREV.search(orgao):
            continue
        ementa, teor = (_limpo(RE_QUALIF.sub("", x)) for x in (bruto_ementa, bruto_teor))
        nome, _, sigla = c.get("Classe", "").partition("..SIGLA_CLASSE:")
        secoes = segmentar_ementa(ementa)
        docs.append({
            "id": id_fonte, "acervo": acervo, "numero_cnj": cnj.group(),
            "classe_sigla": sigla.strip() or None, "classe_nome": nome.strip(),
            "orgao_julgador": orgao,
            "relator": _sem_cargo(c.get("Relator(a)")) or "",
            "relator_titular": relator_titular(bruto_teor), "relator_acordao": _sem_cargo(c.get("Relator para Acórdão")),
            "data_julgamento": _iso(c["Data"]), "data_publicacao": _iso(c.get("Data da publicação")),
            "polo_recorrente": polo_recorrente(bruto_teor + "\n" + bruto_ementa),
            "resultado": resultado(secoes["e_dispositivo"] or ementa[-1500:]),
            "ementa_texto": ementa, **secoes, "inteiro_teor": teor, "coletado_em": agora})
    return docs
