"""Banco da base normativa previdenciária. SQLite com FTS5, fora do repositório.

O corpus de origem fica em C:\\Users\\VAIO\\INSS\\base-legislacao e só é lido. O banco vive em
NORMAS_DADOS, como o mcp-trf3 faz com TRF3_DADOS.
"""
import datetime, json, os, pathlib, re, sqlite3

import identidade, parser

# Fora do repositório, como o mcp-trf3 faz. O padrão sai do diretório do usuário para o servidor
# rodar em qualquer máquina; nesta, dá exatamente o mesmo caminho de antes.
DADOS = pathlib.Path(os.environ.get("NORMAS_DADOS")
                     or pathlib.Path.home() / "normas-previdenciarias")
def _corpus():
    """NORMAS_CORPUS manda. Senão, a pasta `corpus` ao lado deste arquivo, que é como o corpus
    viaja dentro do plugin. Senão, o corpus de trabalho desta máquina."""
    if os.environ.get("NORMAS_CORPUS"):
        return pathlib.Path(os.environ["NORMAS_CORPUS"])
    junto = pathlib.Path(__file__).resolve().parent / "corpus"
    return junto if junto.is_dir() else pathlib.Path(r"C:\Users\VAIO\INSS\base-legislacao")


CORPUS = _corpus()
TETO_CONTAGEM = 5000
POR_PAGINA = 10

ESQUEMA = """
CREATE TABLE IF NOT EXISTS norma (
  id            TEXT PRIMARY KEY,   -- 'lei-8213-1991', 'decreto-3048-1999', 'in-128-2022'
  tipo          TEXT,               -- lei | lei-complementar | decreto | constituicao | emenda | in | portaria
  numero        TEXT, ano INTEGER,
  titulo        TEXT, ementa TEXT,
  fonte_oficial TEXT,
  data_download TEXT,               -- AAAA-MM-DD, a idade do texto
  hash_origem   TEXT, hash_chave TEXT,   -- qual das quatro chaves do frontmatter trouxe o hash
  impressao     TEXT,               -- sha256 do texto normalizado, o que a verificação compara
  ultima_alteracao_conhecida TEXT,
  compilado     INTEGER,            -- 1 = pilha de versões; 0 = fotografia consolidada
  arquivos      TEXT,               -- json
  ingerido_em   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artigo (
  id        TEXT PRIMARY KEY,       -- '{norma}:{parte}:{chave}:v{n}', determinístico e citável
  norma_id  TEXT NOT NULL, parte TEXT NOT NULL,
  chave     TEXT NOT NULL, num INTEGER, sufixo TEXT,
  versao    INTEGER, total_versoes INTEGER,
  vigente   INTEGER, revogado INTEGER,
  alteracao_tipo TEXT,              -- original | redacao | inclusao | revogacao | renumeracao
  alteracao_norma TEXT, alteracao_ano INTEGER, marcador TEXT,
  contexto  TEXT,                   -- 'TÍTULO III > Capítulo II > Seção V'
  texto     TEXT, arquivo TEXT, linha INTEGER
);
CREATE INDEX IF NOT EXISTS ix_art_chave ON artigo(norma_id, chave);
CREATE INDEX IF NOT EXISTS ix_art_num   ON artigo(norma_id, num, sufixo);
CREATE INDEX IF NOT EXISTS ix_art_ano   ON artigo(alteracao_ano);

CREATE TABLE IF NOT EXISTS dispositivo (   -- filhos por deslocamento, sem duplicar texto
  artigo_id TEXT NOT NULL, ordem INTEGER, tipo TEXT, rotulo TEXT,
  ocorrencia INTEGER,             -- o mesmo § aparece várias vezes: o compilado empilha
  ini INTEGER, fim INTEGER
);
CREATE INDEX IF NOT EXISTS ix_disp ON dispositivo(artigo_id);

CREATE TABLE IF NOT EXISTS verificacao (
  norma_id TEXT PRIMARY KEY, estado TEXT, verificado_em TEXT, detalhe TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS artigo_fts USING fts5(
  texto, contexto, content='artigo', content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2"
);
CREATE TRIGGER IF NOT EXISTS artigo_ai AFTER INSERT ON artigo BEGIN
  INSERT INTO artigo_fts(rowid, texto, contexto) VALUES (new.rowid, new.texto, new.contexto);
END;
CREATE TRIGGER IF NOT EXISTS artigo_ad AFTER DELETE ON artigo BEGIN
  INSERT INTO artigo_fts(artigo_fts, rowid, texto, contexto)
  VALUES ('delete', old.rowid, old.texto, old.contexto);
END;
CREATE TRIGGER IF NOT EXISTS artigo_au AFTER UPDATE ON artigo BEGIN
  INSERT INTO artigo_fts(artigo_fts, rowid, texto, contexto)
  VALUES ('delete', old.rowid, old.texto, old.contexto);
  INSERT INTO artigo_fts(rowid, texto, contexto) VALUES (new.rowid, new.texto, new.contexto);
END;
"""

# Sai em TODA resposta que devolva texto de artigo. Ninguém lê a visão geral antes de ler o
# artigo, e o que é inferido tem de viajar junto com o que foi inferido.
INFERENCIA = {
    "vigencia": "A versão vigente é INFERIDA: é a última versão não revogada da pilha do texto "
                "compilado do Planalto. Regra medida em 63 dos 66 artigos com mais de uma "
                "redação na Lei 8.213 e em 69 dos 72 do Decreto 3.048 parte 1.",
    "ano": "O ano é o da NORMA ALTERADORA indicada no marcador, não o início da vigência. "
           "Granularidade anual, porque 92,7% dos marcadores do corpus só trazem o ano.",
    "dispositivos": "Parágrafo, inciso e alínea são localizados por rótulo e deslocamento, sem "
                    "montar a árvore. Em arquivo malformado o dispositivo pode vir dentro do caput.",
    "paragrafos_empilhados": "O texto compilado empilha também as redações do parágrafo e do "
                             "inciso, então o mesmo rótulo aparece várias vezes no artigo, em "
                             "ordem cronológica, e a última é a que vale.",
    "literal": "O texto do artigo é transcrição do arquivo baixado da fonte oficial, sem reescrita.",
    "antes_de_citar": "Confira na fonte_oficial. A idade do texto está em idade_dias.",
}

AVISOS = [
    "O corpus foi baixado em 31/05/2026 do Planalto e dos portais oficiais. Toda resposta traz "
    "data_download e idade_dias, e texto com idade não conferida não substitui a fonte oficial.",
    "O histórico de redação tem granularidade de ANO, porque 92,7% dos marcadores do texto "
    "compilado trazem só o ano da norma alteradora. E o ano é o da norma que alterou, nunca o "
    "início da vigência, que difere por vacatio, por MP com vigência encerrada e por retroação.",
    "IN 128/2022 e Portarias DIRBEN 990 a 996 são fotografia consolidada e não têm histórico "
    "interno. A IN 128 está consolidada até a IN 170/2024 e seus anexos I a XXIX não estão na base.",
    "A redação vigente é a última versão não revogada da pilha do texto compilado, regra medida "
    "em 63 de 66 artigos da Lei 8.213. Artigo com muitas versões pede conferência na fonte.",
    "Enunciados do CRPS não estão aqui. Ficam no MCP de jurisprudência, com histórico de redação "
    "e com os acórdãos que os aplicam.",
]



def abrir(caminho=None, leitura=False):
    if caminho == ":memory:":
        con = sqlite3.connect(caminho)
        con.executescript(ESQUEMA)
        con.row_factory = sqlite3.Row
        return con
    caminho = pathlib.Path(caminho or DADOS / "normas.db")
    if leitura:
        con = sqlite3.connect(f"file:{caminho.as_posix()}?mode=ro", uri=True)
    else:
        caminho.parent.mkdir(parents=True, exist_ok=True)
        con = sqlite3.connect(caminho)
        con.executescript(ESQUEMA)
    con.row_factory = sqlite3.Row
    return con




def gravar_norma(con, norma, artigos):
    """Reingestão por norma: apaga e regrava numa transação. O id é determinístico, então a
    citação de ontem continua valendo hoje, e reingerir o mesmo corpus não muda nada."""
    with con:
        con.execute("DELETE FROM dispositivo WHERE artigo_id IN (SELECT id FROM artigo WHERE norma_id=?)",
                    (norma["id"],))
        con.execute("DELETE FROM artigo WHERE norma_id=?", (norma["id"],))
        con.execute("DELETE FROM norma WHERE id=?", (norma["id"],))
        cols = ", ".join(norma)
        con.execute(f"INSERT INTO norma ({cols}) VALUES ({', '.join('?' * len(norma))})",
                    list(norma.values()))
        for a in artigos:
            aid = parser.conteudo_id(norma["id"], a["parte"], a["chave"], a["versao"])
            con.execute(
                "INSERT INTO artigo (id, norma_id, parte, chave, num, sufixo, versao,"
                " total_versoes, vigente, revogado, alteracao_tipo, alteracao_norma, alteracao_ano,"
                " marcador, contexto, texto, arquivo, linha)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (aid, norma["id"], a["parte"], a["chave"], a["num"], a["sufixo"], a["versao"],
                 a["total_versoes"], a["vigente"], a["revogado"], a["alteracao_tipo"],
                 a["alteracao_norma"], a["alteracao_ano"], a["marcador"], a["contexto"],
                 a["texto"], a["arquivo"], a["linha"]))
            con.executemany(
                "INSERT INTO dispositivo (artigo_id, ordem, tipo, rotulo, ocorrencia, ini, fim)"
                " VALUES (?,?,?,?,?,?,?)",
                [(aid, d["ordem"], d["tipo"], d["rotulo"], d["ocorrencia"], d["ini"], d["fim"])
                 for d in parser.dispositivos(a["texto"])])
    return len(artigos)


def para_fts(consulta):
    """Consulta do usuário -> sintaxe FTS5. Aspas = expressão exata, -palavra = exclui, resto = E."""
    pos, neg = [], []
    for menos, frase, palavra in re.findall(r'(-?)(?:"([^"]+)"|([^\s"]+))', consulta or ""):
        termo = (frase or palavra).replace('"', "").strip()
        if termo and termo.lower() not in ("e", "de", "da", "do", "and"):
            (neg if menos else pos).append(f'"{termo}"')
    if not pos:
        return None
    return " AND ".join(pos) + "".join(f" NOT {n}" for n in neg)


def _procedencia(con, norma_id, hoje=None):
    n = con.execute("SELECT fonte_oficial, data_download FROM norma WHERE id=?", (norma_id,)).fetchone()
    if not n:
        return {}
    v = con.execute("SELECT estado, verificado_em FROM verificacao WHERE norma_id=?", (norma_id,)).fetchone()
    return {"fonte_oficial": n["fonte_oficial"], "data_download": n["data_download"],
            "idade_dias": parser.idade_dias(n["data_download"], hoje),
            "verificacao": (v["estado"] + " em " + v["verificado_em"]) if v else "ainda não verificado"}


def _filtros(f):
    onde, args = [], []
    if f.get("norma"):
        onde.append("a.norma_id = ?")
        args.append(f["norma"])
    if f.get("tipo"):
        onde.append("n.tipo = ?")
        args.append(f["tipo"])
    if f.get("parte"):
        onde.append("a.parte = ?")
        args.append(f["parte"])
    if f.get("so_vigente", True):
        onde.append("a.vigente = 1")
    return onde, args


def buscar(con, consulta="", pagina=1, **filtros):
    onde, args = _filtros(filtros)
    junta = "artigo a JOIN norma n ON n.id = a.norma_id"
    fts = para_fts(consulta)
    if fts:
        junta += " JOIN artigo_fts f ON f.rowid = a.rowid"
        onde.append("artigo_fts MATCH ?")
        args.append(fts)
    sql_onde = (" WHERE " + " AND ".join(onde)) if onde else ""
    total = con.execute(
        f"SELECT count(*) FROM (SELECT 1 FROM {junta}{sql_onde} LIMIT {TETO_CONTAGEM + 1})", args
    ).fetchone()[0]
    ordem = "bm25(artigo_fts, 5, 1)" if fts else "n.id, a.num, a.sufixo"
    linhas = con.execute(
        f"SELECT a.id, a.norma_id, n.titulo, n.tipo, a.parte, a.chave, a.versao, a.total_versoes,"
        f" a.vigente, a.revogado, a.alteracao_norma, a.alteracao_ano, a.contexto, a.texto,"
        f" n.fonte_oficial, n.data_download"
        f" FROM {junta}{sql_onde} ORDER BY {ordem} LIMIT {POR_PAGINA} OFFSET ?",
        args + [(max(1, pagina) - 1) * POR_PAGINA]).fetchall()
    return {
        "total": min(total, TETO_CONTAGEM), "total_aproximado": total > TETO_CONTAGEM,
        "pagina": max(1, pagina), "consulta_fts": fts, "inferencia": INFERENCIA,
        "resultados": [{
            "id": l["id"], "norma": l["norma_id"], "titulo": l["titulo"],
            "artigo": f"art. {l['chave']}", "parte": l["parte"], "contexto": l["contexto"],
            "versao": f"{l['versao']} de {l['total_versoes']}", "vigente": bool(l["vigente"]),
            "revogado": bool(l["revogado"]),
            "alterado_por": l["alteracao_norma"] or None, "ano_alteracao": l["alteracao_ano"],
            "trecho": l["texto"][:700] + ("…" if len(l["texto"]) > 700 else ""),
            "fonte_oficial": l["fonte_oficial"], "data_download": l["data_download"],
            "idade_dias": parser.idade_dias(l["data_download"]),
        } for l in linhas]}


def _achar(con, norma, artigo, parte=""):
    chave = re.sub(r'[^\dA-Za-z-]', "", str(artigo).replace(".", "")).upper().lstrip("ART")
    chave = chave.strip("-") if not re.match(r'^\d', chave) else chave
    args = [norma, chave]
    sql = "SELECT * FROM artigo WHERE norma_id=? AND chave=?"
    if parte:
        sql += " AND parte=?"
        args.append(parte)
    return con.execute(sql + " ORDER BY parte, versao", args).fetchall()


def _monta(con, l, com_filhos=True):
    fora = {"id": l["id"], "artigo": f"art. {l['chave']}", "parte": l["parte"],
            "versao": l["versao"], "total_versoes": l["total_versoes"],
            "vigente": bool(l["vigente"]), "revogado": bool(l["revogado"]),
            "alteracao_tipo": l["alteracao_tipo"], "alterado_por": l["alteracao_norma"] or None,
            "ano_alteracao": l["alteracao_ano"], "marcador": l["marcador"] or None,
            "contexto": l["contexto"], "texto": l["texto"],
            "arquivo": l["arquivo"], "linha": l["linha"]}
    if com_filhos:
        fora["dispositivos"] = [
            {"rotulo": d["rotulo"], "tipo": d["tipo"], "ocorrencia": d["ocorrencia"],
             "texto": l["texto"][d["ini"]:d["fim"]].strip()}
            for d in con.execute(
                "SELECT * FROM dispositivo WHERE artigo_id=? ORDER BY ordem", (l["id"],))]
    return fora


def obter(con, norma, artigo, parte="", versao=0, historico=False):
    linhas = _achar(con, norma, artigo, parte)
    if not linhas:
        return {"erro": "nao_localizado",
                "dica": f"Nenhum art. {artigo} em '{norma}'. Confira o identificador em "
                        f"visao_geral_normas e lembre que anexo e ADCT são partes separadas."}
    partes = sorted({l["parte"] for l in linhas})
    escolhidas = [l for l in linhas if l["versao"] == versao] if versao else \
                 [l for l in linhas if l["vigente"]]
    fora = {"norma": norma, "artigo": f"art. {artigo}", "partes_com_este_artigo": partes}
    if not escolhidas and not versao:
        # revogado e nunca reeditado: devolve a última redação, dizendo que ela não vale mais
        ultima = {l["parte"]: l for l in linhas}
        escolhidas = list(ultima.values())
        fora["sem_versao_vigente"] = (
            "Este artigo não tem redação vigente na base: a última versão está marcada como "
            "revogada. O texto abaixo é a última redação conhecida, já revogada.")
    fora["versoes"] = [_monta(con, l) for l in escolhidas]
    if historico:
        fora["historico"] = [_monta(con, l, com_filhos=False) for l in linhas]
        fora["aviso_historico"] = (
            "Pilha na ordem do texto compilado, da redação mais antiga para a mais nova. O ano é "
            "o da norma alteradora, não o início da vigência.")
    fora["inferencia"] = INFERENCIA
    fora.update(_procedencia(con, norma))
    return fora


def na_data(con, norma, artigo, data, parte=""):
    """Redação vigente num ano. Granularidade anual, e a resposta diz isso."""
    m = re.search(r'(1[89]\d{2}|20\d{2})', str(data))
    if not m:
        return {"erro": "data_invalida", "dica": "Use AAAA-MM-DD ou o ano com quatro dígitos."}
    ano = int(m.group(1))
    linhas = _achar(con, norma, artigo, parte)
    if not linhas:
        return {"erro": "nao_localizado", "dica": f"Nenhum art. {artigo} em '{norma}'."}
    por_parte, fora = {}, []
    for l in linhas:
        por_parte.setdefault(l["parte"], []).append(l)
    for p, versoes in por_parte.items():
        ate = [v for v in versoes if (v["alteracao_ano"] or 0) <= ano]
        escolhida = ate[-1] if ate else versoes[0]
        fora.append(_monta(con, escolhida))
    n = con.execute("SELECT compilado FROM norma WHERE id=?", (norma,)).fetchone()
    resposta = {
        "norma": norma, "artigo": f"art. {artigo}", "ano_consultado": ano, "versoes": fora,
        "aviso": "Granularidade ANUAL. O ano gravado é o da norma que deu a redação, não o "
                 "início da vigência, que difere por vacatio, por MP com vigência encerrada e "
                 "por efeito retroativo. Para data exata, confira a norma alteradora na fonte."}
    if n and not n["compilado"]:
        resposta["aviso_sem_historico"] = (
            "Esta norma é fotografia consolidada e não tem histórico interno. A redação devolvida "
            "é a única que a base tem, seja qual for o ano pedido.")
    resposta["inferencia"] = INFERENCIA
    resposta.update(_procedencia(con, norma))
    return resposta


def visao_geral(con, hoje=None):
    normas = [dict(r) for r in con.execute(
        "SELECT n.id, n.tipo, n.titulo, n.ementa, n.fonte_oficial, n.data_download, n.compilado,"
        " n.ultima_alteracao_conhecida,"
        " (SELECT count(*) FROM artigo a WHERE a.norma_id=n.id AND a.vigente=1) AS artigos,"
        " (SELECT count(*) FROM artigo a WHERE a.norma_id=n.id) AS versoes,"
        " (SELECT group_concat(DISTINCT a.parte) FROM artigo a WHERE a.norma_id=n.id) AS partes"
        " FROM norma n ORDER BY n.tipo, n.ano, n.id")]
    for n in normas:
        n["idade_dias"] = parser.idade_dias(n["data_download"], hoje)
        n["compilado"] = bool(n["compilado"])
        n["partes"] = (n["partes"] or "").split(",")
        n["arquivos"] = None
    verificacoes = {r["norma_id"]: r["estado"] for r in con.execute("SELECT * FROM verificacao")}
    for n in normas:
        n["verificacao"] = verificacoes.get(n["id"], "ainda não verificado")
    previstos = {k: v for k, v in identidade.CASOS_PREVISTOS.items()
                 if k in {n["id"] for n in normas}}
    return {"normas_na_base": len(normas),
            "artigos_vigentes": sum(n["artigos"] for n in normas),
            "versoes_gravadas": sum(n["versoes"] for n in normas),
            "arquivos_fora_da_base": identidade.FORA,
            "comportamento_previsto": previstos,
            "normas": normas, "inferencia": INFERENCIA, "avisos": AVISOS}


def registrar_verificacao(con, norma_id, estado, detalhe):
    with con:
        con.execute("INSERT OR REPLACE INTO verificacao (norma_id, estado, verificado_em, detalhe)"
                    " VALUES (?,?,?,?)",
                    (norma_id, estado, datetime.date.today().isoformat(), json.dumps(detalhe, ensure_ascii=False)))
