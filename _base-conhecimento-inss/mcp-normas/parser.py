"""Parser do corpus de legislação previdenciária em Markdown. Regra pura, sem rede e sem banco.

O corpus não é uniforme: duas convenções de artigo, cinco formas de hierarquia, marcador de
alteração ora colado ao dispositivo ora em linha própria ora partido em três blocos pelo
hyperlink da origem. Tudo o que este módulo trata foi medido em 20/09/2026 e está na
SONDA-2026-09-20.md. Campo vazio em silêncio é o pior resultado de uma mudança de layout.

    python teste.py
"""
import datetime, hashlib, re, unicodedata


class LayoutMudou(Exception):
    pass


# Artigo. Cobre "**Art. 1º**", "Art. 1º", "Art 1º -", "Art.2º", "**Art. 1 o**", "Art. 1.046",
# "Art. 21-A" e "Art. 6º-F". Exige A maiúsculo, porque "art. 5º da Constituição" em início de
# linha são 328 referências cruzadas no corpus, não artigos.
RE_ARTIGO = re.compile(
    r'^[ \t]*(?:\*\*)?[ \t]*Art\.?[ \t]*'
    r'(\d{1,3}(?:\.\d{3})?)'                     # 11 | 1.046
    r'[ \t]*[ºo°]?'                              # 1º | 1 o
    r'[ \t]*(?:-[ \t]*([A-Z])(?![a-zà-ÿ]))?'     # -A, e não "-Anexo"
    r'[ \t]*\.?')

# Marcador de alteração. O fecho é opcional porque a origem às vezes trunca o parêntese.
RE_MARCADOR = re.compile(
    r'\(\s*(Reda[çc][ãa]o dada|Inclu[íi]d[oa]|Revogad[oa]|Renumerad[oa])\b'
    r'[ \t]*(?:pel[oa]s?[ \t]+)?([^)]{0,200}?)[ \t]*(?:\)|$)', re.I)
RE_REVOGADO = re.compile(r'\(\s*Revogad[oa]\b|Vig[êe]ncia encerrada', re.I)

RE_HIERARQUIA = re.compile(
    r'^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*'
    r'(LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)'
    r'[ \t]+([IVXLC]+|[ÚU]NIC[AO]|\d+)\b[ \t]*[-–—.]?[ \t]*(.*)$', re.I)
NIVEL = {"LIVRO": 0, "TITULO": 1, "CAPITULO": 2, "SECAO": 3, "SUBSECAO": 4}

# Dispositivos internos. O § é procurado em qualquer posição porque o Decreto 3.048 achata o
# parágrafo dentro da linha do caput. Inciso e alínea só em início de linha.
RE_PARAGRAFO = re.compile(r'§[ \t]*(\d+)[ \t]*[ºo°]?')
RE_PAR_UNICO = re.compile(r'Par[áa]grafo[ \t]+[úu]nico', re.I)
RE_INCISO = re.compile(r'^[ \t]*(?:\*\*)?[ \t]*([IVXLC]{1,7})[ \t]*[-–—]', re.M)
RE_ALINEA = re.compile(r'^[ \t]*(?:\*\*)?[ \t]*([a-z])\)', re.M)
# mesmos rótulos, ancorados no começo de uma linha solta, para decidir quebra de linha
RE_ABRE = re.compile(r'^[ \t]*(?:\*\*)?[ \t]*(?:§|Par[áa]grafo[ \t]+[úu]nico|'
                     r'[IVXLC]{1,7}[ \t]*[-–—]|[a-z]\))', re.I)

# ANEXO real é caixa alta e vem sozinho na linha, às vezes com as letras espaçadas pelo PDF.
# "## Anexo desta Lei." e "## Anexo da Lei Complementar nº 87" são referência cruzada que a
# conversão promoveu a heading, e partiam a Lei 8.213 ao meio.
RE_ANEXO = re.compile(r'^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*'
                      r'A[ \t]*N[ \t]*E[ \t]*X[ \t]*O\b[ \t]*(?:[IVXLC]+|\d+)?'
                      r'[ \t]*[-–—:.]?[ \t]*(?:\*\*)?[ \t]*$')
RE_ADCT = re.compile(r'^[ \t]*(?:#{1,6}[ \t]*)?ATO DAS DISPOSI[ÇC][ÕO]ES CONSTITUCIONAIS TRANSIT[ÓO]RIAS')

# Frontmatter: quatro famílias de nomenclatura, uma chave canônica.
FONTES = ("fonte_oficial", "fonte_oficial_atualizada", "fonte_oficial_publicacao_original")
DATAS = ("data_download", "data_captura")
HASHES = ("hash_sha256", "hash_sha256_corpo", "hash_sha256_html_origem", "hash_sha256_html_planalto",
          "hash_sha256_pdf_planalto_anexo", "hash_sha256_pdf_ufsm", "hash_sha256_pdf_ufmg")


def _limpo(s):
    return re.sub(r'[ \t]+', " ", s.replace("**", "").replace(" ", " ")).strip()


def _sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def frontmatter(texto):
    """Devolve (metadados, corpo, linhas_consumidas). Arquivo sem frontmatter devolve dict vazio.
    Três arquivos do corpus não têm frontmatter nenhum e entram assim mesmo."""
    if not texto.startswith("---"):
        return {}, texto, 0
    fim = texto.find("\n---", 3)
    if fim < 0:
        return {}, texto, 0
    bruto = texto[3:fim]
    resto = texto[fim + 1:]
    corpo = resto.split("\n", 1)[1] if "\n" in resto else ""
    meta, chave = {}, None
    for l in bruto.split("\n"):
        m = re.match(r'^([a-z_0-9]+):[ \t]*(.*)$', l)
        if m:
            chave = m.group(1)
            meta[chave] = m.group(2).strip().strip("|").strip()
        elif chave and l.strip():
            meta[chave] = (meta[chave] + " " + l.strip()).strip()
    return meta, corpo, bruto.count("\n") + 2


def meta_canonica(meta):
    """Reduz as 38 chaves de frontmatter do corpus às que interessam."""
    def primeira(chaves):
        for c in chaves:
            if meta.get(c):
                return c, meta[c]
        return "", ""
    _, fonte = primeira(FONTES)
    _, data = primeira(DATAS)
    chave_hash, valor_hash = primeira(HASHES)
    return {"fonte_oficial": fonte.split(" (")[0].split(";")[0].strip(),
            "data_download": data[:10],
            "hash_origem": valor_hash, "hash_chave": chave_hash,
            "ultima_alteracao_conhecida": meta.get("ultima_alteracao_conhecida", ""),
            "ementa": meta.get("ementa", ""), "titulo": meta.get("norma", "")}


def normalizar_chave(num, sufixo):
    """'1.046' -> ('1046', 1046, ''); '21','A' -> ('21-A', 21, 'A'). O ponto do CPC é separador
    de milhar, e tratá-lo como terminador mapeia mais de mil artigos para a chave '1'."""
    n = int(num.replace(".", ""))
    s = (sufixo or "").upper()
    return (f"{n}-{s}" if s else str(n)), n, s


def _ano(ref):
    """Ano da norma alteradora. 92,7% dos marcadores do corpus trazem só o ano."""
    anos = [int(a) for a in re.findall(r'\b(1[89]\d{2}|20\d{2})\b', ref)]
    if anos:
        return anos[-1]
    m = re.search(r'\bde[ \t]*\d{1,2}[./]\d{1,2}[./](\d{2})\b', ref)
    if m:
        aa = int(m.group(1))
        return 1900 + aa if aa > 30 else 2000 + aa
    return None


def marcador_de(cabeca):
    """(tipo, norma_alteradora, ano, literal). Sem marcador devolve ('original', '', None, '')."""
    m = RE_MARCADOR.search(cabeca)
    if not m:
        return "original", "", None, ""
    bruto = _sem_acento(m.group(1)).lower()
    tipo = ("redacao" if bruto.startswith("redacao") else
            "inclusao" if bruto.startswith("inclu") else
            "revogacao" if bruto.startswith("revogad") else "renumeracao")
    ref = _limpo(m.group(2))
    return tipo, ref, _ano(ref), _limpo(m.group(0))


def reagrupar(linhas):
    """Uma linha por dispositivo. Junta a continuação à linha que ela continua, o que resolve de
    uma vez os dois extremos do corpus: o arquivo de parágrafos separados por linha em branco e
    a Portaria 991, que quebra a frase no meio com zero linha em branco. O marcador em linha
    própria, 740 na CF/88 e 682 na Lei 8.213, volta a colar no dispositivo que ele qualifica."""
    fora = []
    for l in linhas:
        t = _limpo(l)
        if not t:
            continue
        if fora and not RE_ABRE.match(t):
            fora[-1] = _limpo(fora[-1] + " " + t)
        else:
            fora.append(t)
    return fora


def dispositivos(texto):
    """Rótulo e deslocamento de cada §, parágrafo único, inciso e alínea dentro do artigo.
    Não monta a árvore: em 60 arquivos de cinco convenções, a árvore erra em silêncio."""
    achados = []
    for m in RE_PARAGRAFO.finditer(texto):
        achados.append(("paragrafo", f"§ {m.group(1)}º", m.start()))
    for m in RE_PAR_UNICO.finditer(texto):
        achados.append(("paragrafo_unico", "Parágrafo único", m.start()))
    for m in RE_INCISO.finditer(texto):
        achados.append(("inciso", m.group(1).upper(), m.start(1)))
    for m in RE_ALINEA.finditer(texto):
        achados.append(("alinea", m.group(1) + ")", m.start(1)))
    achados.sort(key=lambda d: d[2])
    fora, quantas = [], {}
    for i, (tipo, rotulo, ini) in enumerate(achados):
        fim = achados[i + 1][2] if i + 1 < len(achados) else len(texto)
        # o texto compilado empilha as redações também do parágrafo e do inciso, então o mesmo
        # rótulo aparece mais de uma vez dentro do artigo, na ordem cronológica
        quantas[rotulo] = quantas.get(rotulo, 0) + 1
        fora.append({"ordem": i, "tipo": tipo, "rotulo": rotulo,
                     "ocorrencia": quantas[rotulo], "ini": ini, "fim": fim})
    return fora


def _titulo_hierarquia(linha, proximas):
    """Devolve (nivel, rotulo) ou None. Na IN 128 o nome vem na linha seguinte ao 'LIVRO I'."""
    m = RE_HIERARQUIA.match(linha)
    if not m:
        return None
    especie = _sem_acento(m.group(1)).upper()
    nome = _limpo(m.group(3))
    # "Seção III , especialmente no art. 33 desta Lei." é referência cruzada, não cabeçalho.
    # O nome de um cabeçalho começa em maiúscula ou não existe.
    if nome and not re.match(r'^[A-ZÀ-Ý0-9"]', nome):
        return None
    if not nome:
        for p in proximas:
            p = _limpo(p)
            if not p:
                continue
            if RE_ARTIGO.match(p) or RE_HIERARQUIA.match(p) or RE_ABRE.match(p) or len(p) > 120:
                break
            nome = p
            break
    return NIVEL[especie], _limpo(f"{m.group(1)} {m.group(2)} {nome}")[:160]


def sem_cabecalhos(linhas):
    """Tira do corpo do artigo o cabeçalho de estrutura que vem antes do artigo seguinte, que
    vazava para o texto ('#### Subseção XII Do Abono' colado ao § 6º do art. 86 da Lei 8.213).
    Só sai o que é estrutura: LIVRO, TÍTULO, CAPÍTULO, Seção, Subseção, ANEXO e ADCT, com o nome
    que na IN 128 vem na linha seguinte. O resto fica, só sem os '#': a conversão promoveu a
    heading pedaço de artigo, como '## parte do País;' dentro de um inciso da CF, e cortar ali
    perderia 2.319 linhas de texto no corpus."""
    fora, pular = [], set()
    for k, l in enumerate(linhas):
        if k in pular:
            continue
        m = RE_HIERARQUIA.match(l)
        if m and _titulo_hierarquia(l, linhas[k + 1:k + 4]):
            if not _limpo(m.group(3)):
                prox = next((j for j in range(k + 1, min(k + 4, len(linhas))) if linhas[j].strip()), None)
                if prox is not None:
                    pular.add(prox)
            continue
        if RE_ANEXO.match(l) or RE_ADCT.match(l):
            continue
        fora.append(re.sub(r'^[ \t]*#{1,6}[ \t]*', "", l))
    return fora


def _e_artigo(linha):
    m = RE_ARTIGO.match(linha)
    if not m:
        return None
    return m if _limpo(linha[:m.start(1)]).rstrip(".").endswith("Art") else None


def _nova_parte(base, vistas):
    nome, n = base, 1
    while nome in vistas:
        n += 1
        nome = f"{base}-{n}"
    vistas.add(nome)
    return nome


def _repartir_por_reinicio(artigos):
    """Numeração que recomeça em artigo baixo, sem marcador, é parte nova e não versão nova.
    É o Decreto 3.048 (arts. 1 a 3 do decreto, depois art. 1 do regulamento) e as Portarias
    991 a 996 (arts. 1 e 2 da portaria, depois os do Livro anexo)."""
    vistas = {a["parte"] for a in artigos}
    origem, destino, chaves, anterior = None, None, set(), 0
    for a in artigos:
        if a["parte"] != origem:
            origem, destino, chaves, anterior = a["parte"], a["parte"], set(), 0
        if (a["num"] <= 3 and a["num"] <= anterior and len(chaves) >= 3
                and a["alteracao_tipo"] == "original"):
            destino = _nova_parte(f"{origem}-cont", vistas)
            chaves = set()
        a["parte"] = destino
        chaves.add(a["chave"])
        anterior = a["num"]


def versionar(artigos):
    """Agrupa por (parte, chave) na ordem do arquivo. A última que não estiver revogada é a
    vigente: medido em 63 de 66 chaves da Lei 8.213 e 69 de 72 do Decreto 3.048 parte 1."""
    grupos = {}
    for a in artigos:
        grupos.setdefault((a["parte"], a["chave"]), []).append(a)
    for versoes in grupos.values():
        vivos = [v for v in versoes if not v["revogado"]]
        # artigo cuja última redação foi revogada e nunca reeditada NÃO tem versão vigente.
        # Eleger a revogada como vigente faria a base afirmar que um dispositivo morto vale.
        eleito = vivos[-1] if vivos else None
        for n, v in enumerate(versoes, 1):
            v["versao"], v["total_versoes"] = n, len(versoes)
            v["vigente"] = 1 if v is eleito else 0


def ler_arquivo(texto, arquivo, contexto_inicial=None, parte_inicial="principal"):
    """Lê um .md do corpus e devolve metadados, artigos versionados e o contexto que sobra para
    a parte seguinte, porque LIVRO e CAPÍTULO são cortados na fronteira dos arquivos partidos."""
    meta, corpo, salto = frontmatter(texto)
    linhas = corpo.split("\n")
    pilha = list(contexto_inicial or [""] * 5)
    parte, vistas = parte_inicial, {parte_inicial}
    cabecalhos, preambulo = [], []

    for i, linha in enumerate(linhas):
        crua = linha.rstrip()
        m = _e_artigo(crua)
        if m:
            cabecalhos.append((i, m, list(pilha), parte))
            continue
        if not cabecalhos:
            preambulo.append(crua)
        h = _titulo_hierarquia(crua, linhas[i + 1:i + 4])
        if h:
            nivel, rotulo = h
            pilha[nivel] = rotulo
            for n in range(nivel + 1, 5):
                pilha[n] = ""
            continue
        if RE_ADCT.match(crua):
            parte, pilha = _nova_parte("adct", vistas), [""] * 5
        elif RE_ANEXO.match(crua):
            parte, pilha = _nova_parte("anexo", vistas), [""] * 5

    artigos = []
    for j, (i, m, contexto, parte_marcada) in enumerate(cabecalhos):
        fim = cabecalhos[j + 1][0] if j + 1 < len(cabecalhos) else len(linhas)
        primeira = _limpo(linhas[i][m.end():])
        linhas_art = reagrupar([primeira] + sem_cabecalhos(linhas[i + 1:fim]))
        texto_art = "\n".join(linhas_art)
        cabeca = linhas_art[0] if linhas_art else ""
        chave, num, sufixo = normalizar_chave(m.group(1), m.group(2))
        tipo, ref, ano, literal = marcador_de(cabeca)
        artigos.append({
            "chave": chave, "num": num, "sufixo": sufixo, "parte": parte_marcada,
            "contexto": " > ".join(c for c in contexto if c),
            "alteracao_tipo": tipo, "alteracao_norma": ref, "alteracao_ano": ano,
            "marcador": literal, "revogado": 1 if RE_REVOGADO.search(cabeca) else 0,
            "texto": texto_art, "arquivo": arquivo, "linha": i + salto + 1})

    _repartir_por_reinicio(artigos)
    versionar(artigos)
    canonica = meta_canonica(meta)
    canonica["compilado"] = 1 if any(a["alteracao_tipo"] != "original" for a in artigos) else 0
    return {"meta": canonica, "artigos": artigos, "contexto_final": pilha, "arquivo": arquivo,
            "parte_final": artigos[-1]["parte"] if artigos else parte_inicial,
            "preambulo": "\n".join(reagrupar(preambulo))[:20000]}


def conteudo_id(norma_id, parte, chave, versao):
    """Determinístico, para a citação de ontem continuar valendo hoje."""
    return f"{norma_id}:{parte}:{chave}:v{versao}"


def impressao(texto):
    """Impressão digital do texto normalizado, para comparar local com fonte sem depender dos
    quatro esquemas de hash que o frontmatter do corpus usa."""
    return hashlib.sha256(_sem_acento(_limpo(texto)).lower().encode()).hexdigest()


def idade_dias(data_download, hoje=None):
    try:
        d = datetime.date.fromisoformat(data_download)
    except (TypeError, ValueError):
        return None
    return ((hoje or datetime.date.today()) - d).days
