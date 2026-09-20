"""Unica camada que conhece formato de arquivo. Arquivo -> lista de blocos de texto.

Nao anonimiza, nao segmenta e nao decide nada. So le. Quem transforma bloco em trecho
e o parser, que e puro e testavel sem disco.

Le .docx pela ordem do corpo do documento, alternando paragrafo e tabela, porque a
peca do escritorio tem a analise periodo a periodo em tabela e perder essa ordem
quebraria a atribuicao de secao.

Le o .docx com zipfile e ElementTree da biblioteca padrao, e nao com python-docx, por
duas razoes medidas em 20/09/2026. A primeira e que dispensa dependencia externa. A
segunda e que o python-docx abre styles.xml, settings.xml e theme1.xml para montar o
documento, e 8 das 175 pecas das pastas Claude tem esses membros corrompidos no Drive
embora o word/document.xml esteja integro. Lendo so o document.xml, essas 8 entram no
indice em vez de se perderem.

Le .pdf com PyMuPDF, que e a unica dependencia externa do projeto e so o coletor usa.
O PDF entra porque a peca PROTOCOLADA vive nas pastas de cliente nesse formato, e ela
e a versao final, ao contrario do rascunho. Medido em 20/09/2026, 80% deles tem camada
de texto e dispensam OCR.

O .doc binario e o .gdoc ficam de fora. O .gdoc nao e legivel pelo disco, porque o
Drive File Stream recusa a leitura com "Funcao incorreta".
"""

import pathlib
import xml.etree.ElementTree as ET
import zipfile

EXTENSOES = {".docx", ".md", ".txt", ".pdf", ""}

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


class NaoSuportado(Exception):
    """Formato fora do escopo da primeira versao."""


def _texto_do_no(no):
    """Todo o texto corrido de um no, respeitando a quebra explicita."""
    partes = []
    for filho in no.iter():
        if filho.tag == W + "t" and filho.text:
            partes.append(filho.text)
        elif filho.tag in (W + "br", W + "tab"):
            partes.append(" ")
    return "".join(partes).strip()


def _docx(caminho):
    with zipfile.ZipFile(caminho) as z:
        corpo = ET.fromstring(z.read("word/document.xml")).find(W + "body")
    if corpo is None:
        raise NaoSuportado(f"{caminho.name}: document.xml sem corpo")
    saida = []
    for filho in corpo:
        if filho.tag == W + "p":
            saida.append(_texto_do_no(filho))
        elif filho.tag == W + "tbl":
            for linha in filho.findall(W + "tr"):
                # A linha de tabela vira um bloco so, com as celulas separadas por
                # ponto e virgula, para nao virar um enxame de fragmentos curtos.
                celulas = [t for t in (_texto_do_no(c) for c in linha.findall(W + "tc")) if t]
                if celulas:
                    saida.append("; ".join(dict.fromkeys(celulas)))
    return saida


def _pdf(caminho):
    """PDF protocolado -> blocos, pela caixa de texto que o proprio PDF declara.

    Usa os blocos do PyMuPDF em vez do texto corrido, porque a peca protocolada vem do
    PJe com carimbo de assinatura, tarja lateral e rodape de validacao, e o bloco
    preserva a fronteira do paragrafo em vez de colar tudo. Documento sem camada de
    texto devolve pouca coisa, e o parser o recusa por LayoutMudou.
    """
    import fitz

    with fitz.open(caminho) as doc:
        return [" ".join(b[4].split()) for pagina in doc
                for b in pagina.get_text("blocks") if b[6] == 0 and b[4].strip()]


def _texto(caminho):
    for codec in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            bruto = caminho.read_text(encoding=codec)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise NaoSuportado(f"{caminho.name}: nenhum codec serviu")
    return bruto.split("\n\n")


def blocos(caminho):
    """Caminho -> lista de blocos brutos, na ordem do documento."""
    caminho = pathlib.Path(caminho)
    ext = caminho.suffix.lower()
    if ext not in EXTENSOES:
        raise NaoSuportado(f"{caminho.name}: extensao {ext or '(sem)'} fora do escopo")
    return {".docx": _docx, ".pdf": _pdf}.get(ext, _texto)(caminho)
