"""Regra pura do acervo do escritorio. Sem disco, sem rede e sem banco.

Recebe os blocos de texto que o extrator tirou do arquivo e devolve os trechos
argumentativos JA ANONIMIZADOS, com a secao a que pertencem e os precedentes citados.

A anonimizacao acontece aqui, na INGESTAO, para que o dado sensivel nunca chegue a
existir na base. Bloco de enderecamento e de qualificacao nao e anonimizado, e sim
DESCARTADO, porque concentra o dado pessoal e nao tem valor argumentativo.

Falha de forma explicita quando o documento nao rende nenhum trecho, porque peca
vazia em silencio e o pior resultado de uma mudanca de formato.
"""

import re
import unicodedata

MIN_PALAVRAS = 8            # abaixo disso e titulo, rodape ou linha de tabela solta
MAX_PALAVRAS_TITULO = 14


class LayoutMudou(Exception):
    """O arquivo nao rendeu trecho argumentativo nenhum."""


# --------------------------------------------------------------------
# Anonimizacao, camada 1: identificador por padrao
# --------------------------------------------------------------------
# A ordem importa. O numero CNJ vem primeiro porque contem sequencias que os outros
# padroes reconheceriam, e o CNPJ vem antes do CPF porque o CPF casa dentro dele.
# GAVETA e o espaco entre o rotulo e o numero. E preguicosa e cega a colchete, para
# que reaplicar o anonimizador sobre texto ja anonimizado nao avance por cima do
# marcador e coma o que vem depois. Medido em 20/09/2026, com a gaveta gulosa o trecho
# "NB [NB], DER 10/02/2025" virava "NB [NB]" na segunda passada e perdia a DER, o que
# quebrava a auditoria por ponto fixo. A idempotencia e cobrada em teste.py.
def _gaveta(n):
    return r"[^\d\n\[\]]{0," + str(n) + r"}?"


PADROES = [
    (re.compile(r"\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b"), "[PROCESSO]"),
    (re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/\d{4}-?\d{2}\b"), "[CNPJ]"),
    (re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b"), "[CPF]"),
    (re.compile(r"\bCPF" + _gaveta(20) + r"\d[\d.\-/]{9,}"), "CPF [CPF]"),
    (re.compile(r"\b(?:NB|N\.\s?B\.)" + _gaveta(20) + r"\d[\d.\-/]{6,}"), "NB [NB]"),
    (re.compile(r"\bbenef[iií]cio\s+n?[º°o]?\.?\s*\d[\d.\-/]{6,}", re.I), "beneficio [NB]"),
    (re.compile(r"\b(?:NIT|PIS|PASEP)" + _gaveta(20) + r"\d[\d.\-/]{8,}"), "NIT [NIT]"),
    (re.compile(r"\b(?:RG|R\.\s?G\.|c[eé]dula de identidade)" + _gaveta(30) +
                r"\d[\d.\-/]{4,}", re.I), "RG [RG]"),
    (re.compile(r"\bCEP" + _gaveta(10) + r"\d{5}-?\d{3}\b", re.I), "CEP [CEP]"),
    (re.compile(r"\b\d{5}-\d{3}\b"), "[CEP]"),
    (re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]+\b"), "[EMAIL]"),
    (re.compile(r"\(?\b\d{2}\)?\s?9?\d{4}[-\s]\d{4}\b"), "[TELEFONE]"),
    (re.compile(r"\b(nascid[oa]s?\s+em)\s+\d{1,2}[/.]\d{1,2}[/.]\d{2,4}", re.I), r"\1 [DATA-NASC]"),
    (re.compile(r"\bCID[-\s]?(?:10)?\s*[:\-]?\s*[A-Z]\d{2}(?:\.\d{1,2})?", re.I), "CID [CID]"),
    # S82.2, M54.5. A letra B fica de fora porque B31, B91 e B94 sao especie de beneficio.
    (re.compile(r"\b[A-TV-Z]\d{2}\.\d{1,2}\b"), "[CID]"),
]

# --------------------------------------------------------------------
# Anonimizacao, camada 2: nome
# --------------------------------------------------------------------
# A lista negra vem dos nomes das pastas de cliente, que sao a verdade de campo ja
# disponivel no disco. Contra ela corre esta lista branca de termos institucionais e
# juridicos que nunca se apagam. Termo pessoal ambiguo NAO entra na branca, porque
# apagar demais custa pouco num indice de pesquisa e apagar de menos viola o sigilo.
BRANCA = {
    "inss", "instituto", "nacional", "seguro", "social", "previdencia", "previdenciaria",
    "justica", "federal", "estadual", "juizado", "especial", "vara", "tribunal", "regional",
    "turma", "recursal", "superior", "supremo", "conselho", "recursos", "camara", "junta",
    "uniao", "fazenda", "publica", "ministerio", "publico", "procuradoria", "advocacia",
    "geral", "defensoria", "sumula", "tema", "enunciado", "decreto", "lei", "portaria",
    "instrucao", "normativa", "emenda", "constituicao", "codigo", "civil", "processo",
    "autor", "autora", "autores", "reu", "requerente", "requerido", "segurado", "segurada",
    "perito", "pericia", "laudo", "recurso", "peticao", "inicial", "sentenca", "acordao",
    "brasil", "republica", "estado", "municipio", "comarca", "subsecao", "secao",
    "excelencia", "doutor", "doutora", "juiz", "juiza", "desembargador", "desembargadora",
    "relator", "relatora", "conselheiro", "conselheira", "procurador", "procuradora",
}

PARTICULAS = {"de", "da", "do", "das", "dos", "e", "d"}

RE_TOKEN_NOME = re.compile(r"\b[A-ZÀ-Ü][a-zà-ü]{2,}\b")


def _sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def normalizar_nomes(brutos):
    """Nomes de pasta de cliente -> conjunto de tokens em minuscula e sem acento.

    Descarta particula, token curto e qualquer termo da lista branca.
    """
    tokens = set()
    for bruto in brutos:
        bruto = re.sub(r"#\s*\d[\d.\-]*", " ", bruto)     # tira o marcador #CPF da pasta
        for t in re.split(r"[^A-Za-zÀ-ÿ]+", bruto):
            t = _sem_acento(t).lower()
            if len(t) >= 3 and t not in PARTICULAS and t not in BRANCA:
                tokens.add(t)
    return tokens


def _chave(palavra):
    return _sem_acento(palavra).lower()


def anonimizar(texto, nomes=frozenset(), comuns=frozenset()):
    """Apaga identificador e nome. Devolve o texto pronto para gravar.

    A lista negra de nomes sozinha apaga demais, porque sobrenome brasileiro coincide
    com palavra corrente. Medido em 20/09/2026, apagava 31,5% dos trechos e comia
    verbo em quesito. Por isso a lista de palavras COMUNS, calibrada nos Modelos Ouro,
    que nao tem dado de cliente, funciona como veto absoluto. Token que e vocabulario
    do oficio nunca cai, ainda que esteja no meio de um nome, e foi assim que
    "Nivel de Exposicao Normalizado" deixou de virar "[NOME] de Exposicao Normalizado".

    # ponytail: nome que tambem e palavra do oficio sobrevive, e sao 123 termos. O
    # preco de apagar seria mutilar o vocabulario tecnico, que e o valor do acervo.
    """
    for padrao, troca in PADROES:
        texto = padrao.sub(troca, texto)
    if not nomes:
        return texto.strip()

    def _trocar(m):
        chave = _chave(m.group(0))
        return "[NOME]" if chave in nomes and chave not in comuns else m.group(0)

    texto = RE_TOKEN_NOME.sub(_trocar, texto)
    return re.sub(r"(?:\[NOME\][\s,]*){2,}", "[NOME] ", texto).strip()


# --------------------------------------------------------------------
# Segmentacao
# --------------------------------------------------------------------
RE_REGUA = re.compile(r"^[═─—_=\-·•\s]{4,}$")
# Regua dentro do bloco. No .md dos Modelos Ouro o titulo vem entre duas linhas de
# regua sem linha em branco entre elas, entao o bloco carrega a regua colada e o
# titulo deixava de ser reconhecido. Medido em 20/09/2026.
RE_REGUA_INTERNA = re.compile(r"[═─—_=·•]{4,}|-{5,}")
RE_TITULO_NUM = re.compile(r"^(?:▮\s*|#{1,6}\s+|\d{1,2}[.)]\s+|[IVXLC]{1,5}\s*[-–—.)]\s+)")
RE_DESCARTE = re.compile(
    r"EXCELENT[IÍ]SSIM|MERIT[IÍ]SSIM"
    r"|(?:nestes?|nos)\s+termos.{0,40}(?:defer|pede)|pede\s+defer|P\.\s*defer"
    r"|OAB\s*/\s*[A-Z]{2}"
    r"|residente\s+e\s+domiciliad"
    r"|brasileir[oa].{0,120}(?:portador|inscrit|C\.?P\.?F)",
    re.I | re.S)


def e_titulo(bloco):
    """Titulo de secao. Sem estilo de heading no .docx, so sobra a forma do texto."""
    palavras = bloco.split()
    if not palavras or len(palavras) > MAX_PALAVRAS_TITULO:
        return False
    if RE_TITULO_NUM.match(bloco):
        return True
    letras = [c for c in bloco if c.isalpha()]
    return bool(letras) and sum(c.isupper() for c in letras) / len(letras) > 0.8


def e_descartavel(bloco):
    """Enderecamento, qualificacao, fecho e assinatura. Concentram dado pessoal."""
    return bool(RE_DESCARTE.search(bloco))


def trechos(blocos, nomes=frozenset(), comuns=frozenset()):
    """Blocos brutos -> lista de trechos argumentativos anonimizados.

    Levanta LayoutMudou quando nenhum trecho sobrevive, que e o sinal de que a
    extracao quebrou ou de que o arquivo nao e peca.
    """
    saida, secao, ordem = [], None, 0
    for bloco in blocos:
        bloco = " ".join(RE_REGUA_INTERNA.sub(" ", bloco).split())
        if not bloco or RE_REGUA.match(bloco):
            continue
        if e_titulo(bloco):
            secao = anonimizar(bloco, nomes, comuns)
            continue
        if e_descartavel(bloco):
            continue
        texto = anonimizar(bloco, nomes, comuns)
        if len(texto.split()) < MIN_PALAVRAS:
            continue
        ordem += 1
        saida.append({"ordem": ordem, "secao": secao, "texto": texto,
                      "palavras": len(texto.split())})
    if not saida:
        raise LayoutMudou(f"nenhum trecho argumentativo em {len(blocos)} blocos")
    return saida


# --------------------------------------------------------------------
# Citacoes, que sao a ponte para os MCPs trf3 e iurisprudencia
# --------------------------------------------------------------------
RE_CITACAO = [
    (re.compile(r"\bTema\s+n?[º°o]?\.?\s*(\d{1,4})(?:\s*[/,]?\s*(?:d[oa]\s+)?"
                r"(STJ|STF|TNU|TRF\s?3))?", re.I), "Tema"),
    (re.compile(r"\bS[uú]mula\s+(?:Vinculante\s+)?n?[º°o]?\.?\s*(\d{1,3})"
                r"(?:\s*[/,]?\s*(?:d[oa]\s+)?(STJ|STF|TNU|TRF\s?3|TST))?", re.I), "Sumula"),
    (re.compile(r"\bEnunciado\s+n?[º°o]?\.?\s*(\d{1,3})"
                r"(?:\s*[/,]?\s*(?:d[oa]\s+)?(CRPS|TNU|CJF))?", re.I), "Enunciado"),
    (re.compile(r"\b(PEDILEF|PUIL|AREsp|REsp|RE|ADI|IRDR|IAC)\s+n?[º°o]?\.?\s*"
                r"([\d][\d.\-/]{3,})", re.I), None),
]


def citacoes(texto):
    """Precedentes citados no trecho. Devolve pares (corte, referencia) unicos."""
    achados = []
    for padrao, especie in RE_CITACAO:
        for m in padrao.finditer(texto):
            if especie:
                corte = (m.group(2) or "").upper().replace(" ", "")
                achados.append((corte or "indefinido", f"{especie} {m.group(1)}"))
            else:
                sigla = m.group(1).upper()
                achados.append((sigla, f"{sigla} {m.group(2)}"))
    return sorted(set(achados))


# --------------------------------------------------------------------
# Metadados, tirados do nome do arquivo e do caminho
# --------------------------------------------------------------------
# A ordem importa em toda lista abaixo, porque o primeiro que casar vence e os termos
# mais especificos precisam vir antes. "contrarrazoes" contem "razoes" e vem antes de
# "recurso", e "peticao inicial" cai em "inicial", que e o ultimo dos tipos.
TIPOS = [
    ("contrarrazoes", r"contrarraz"),
    ("embargos", r"embargo"),
    ("agravo", r"agravo"),
    ("apelacao", r"apela[çc]"),
    ("recurso_especial", r"recurso especial|resp\b|extraordin"),
    ("recurso", r"recurso|inominado|pedilef|puil"),
    ("replica", r"r[eé]plica|impugna[çc][aã]o a contesta"),
    ("manifestacao", r"manifesta[çc]"),
    ("quesitos", r"quesito|alega[çc][oõ]es finais"),
    ("cumprimento", r"cumprimento de senten|rpv|precat[oó]rio|implanta[çc][aã]o imediata"),
    ("mandado_seguranca", r"mandado de seguran|\bms\b"),
    ("parecer", r"parecer"),
    ("requerimento", r"requerimento|exig[eê]ncia|\brac\b"),
    ("procuracao", r"procura[çc]|contrato|termo de representa|declara[çc][aã]o de pobreza"),
    ("pedido_medico", r"pedido para m[eé]dico|relat[oó]rio m[eé]dico|laudo assistente"),
    ("inicial", r"inicial|peti[çc][aã]o"),
]

BENEFICIOS = [
    ("aposentadoria_especial", r"aposentadoria especial|tempo especial|agentes? nocivo|ru[ií]do|\bppp\b"),
    ("aposentadoria_pcd", r"\bpcd\b|lc ?142|if-?bra"),
    ("bpc_loas", r"\bbpc\b|loas|assistencial|b87|b88"),
    ("auxilio_acidente", r"aux[ií]lio.?acidente|b94"),
    ("auxilio_reclusao", r"reclus[aã]o|b25"),
    ("incapacidade", r"incapacidade|b31|b91|b92|aux[ií]lio.?doen|invalidez"),
    ("pensao_morte", r"pens[aã]o por morte|b21"),
    ("rural", r"rural|segurado especial|boia.?fria|h[ií]brida"),
    ("salario_maternidade", r"maternidade|b80"),
    ("professor", r"professor|magist[eé]rio"),
    ("aposentadoria_idade", r"aposentadoria por idade"),
    ("aposentadoria_tempo", r"tempo de contribui|ec ?103|transi[çc][aã]o"),
    ("revisao", r"revis[aã]o|vida toda|teto|irsm|concomitant"),
]

RITOS = [
    ("crps", r"\bcrps\b|junta de recursos|c[aâ]mara de julgamento|conselho pleno"),
    ("superior", r"\bstj\b|\bstf\b|\btnu\b|resp\b|extraordin|pedilef|puil"),
    ("tjsp", r"tjsp|acident[aá]ri"),
    ("trf3", r"trf ?3|apela[çc]|agravo"),
    ("jef", r"\bjef\b|juizado|inominado"),
    ("administrativo", r"administrativ|requerimento|exig[eê]ncia"),
]

RE_DATA = re.compile(r"(\d{2})[.\-_]?(\d{2})[.\-_]?(20\d{2})")


def _primeiro(regras, alvo):
    for nome, padrao in regras:
        if re.search(padrao, alvo, re.I):
            return nome
    return None


def metadados(caminho_rel, origem):
    """Caminho relativo e origem -> tipo de peca, beneficio, rito e data.

    Le o caminho inteiro, e nao so o nome do arquivo, porque muita peca tem nome
    generico e so a pasta identifica a materia.
    """
    alvo = _sem_acento(caminho_rel.replace("\\", " ").replace("/", " "))
    nome = caminho_rel.replace("\\", "/").rsplit("/", 1)[-1]
    data = None
    m = RE_DATA.search(nome)
    if m and 1 <= int(m.group(2)) <= 12 and 1 <= int(m.group(1)) <= 31:
        data = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return {"origem": origem,
            "tipo_peca": _primeiro(TIPOS, alvo),
            "beneficio": _primeiro(BENEFICIOS, alvo),
            "rito": _primeiro(RITOS, alvo),
            "data_peca": data}
