"""Esquema e TODAS as consultas do acervo.

Tudo que o servidor responde sai daqui, para ser testavel sem o SDK do MCP.

A base mora FORA de qualquer repositorio, porque guarda producao do escritorio.
O caminho padrao e C:\\Users\\VAIO\\acervo-escritorio, sobrescrito por ACERVO_DADOS.
"""

import os
import pathlib
import re
import sqlite3

TETO_CONTAGEM = 5000
POR_PAGINA = 10

ESQUEMA = """
CREATE TABLE IF NOT EXISTS peca (
  id           TEXT PRIMARY KEY,   -- sha256 do caminho relativo, estavel entre rodadas
  caminho      TEXT NOT NULL UNIQUE,
  arquivo      TEXT NOT NULL,
  hash         TEXT NOT NULL,      -- sha256 do texto extraido, decide a reingestao
  origem       TEXT NOT NULL,      -- modelo_ouro | acervo | protocolado | vault | exportado
  tipo_peca    TEXT,
  beneficio    TEXT,
  rito         TEXT,
  data_peca    TEXT,               -- AAAA-MM-DD, tirada do nome do arquivo
  resultado    TEXT,               -- nulo na v1, preenchido a mao por resultados.csv
  trechos      INTEGER NOT NULL,
  indexado_em  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_peca_tipo ON peca(tipo_peca);
CREATE INDEX IF NOT EXISTS ix_peca_benef ON peca(beneficio);
CREATE INDEX IF NOT EXISTS ix_peca_origem ON peca(origem);

CREATE TABLE IF NOT EXISTS trecho (
  id       INTEGER PRIMARY KEY,
  peca_id  TEXT NOT NULL REFERENCES peca(id) ON DELETE CASCADE,
  ordem    INTEGER NOT NULL,
  secao    TEXT,
  texto    TEXT NOT NULL,          -- JA ANONIMIZADO pelo parser, na ingestao
  palavras INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_trecho_peca ON trecho(peca_id, ordem);

CREATE TABLE IF NOT EXISTS citacao (
  trecho_id  INTEGER NOT NULL REFERENCES trecho(id) ON DELETE CASCADE,
  peca_id    TEXT NOT NULL,
  corte      TEXT NOT NULL,        -- STJ | STF | TNU | CRPS | TRF3 | indefinido
  referencia TEXT NOT NULL         -- "Tema 694", "Sumula 9", "Enunciado 13"
);
CREATE INDEX IF NOT EXISTS ix_cit_ref ON citacao(referencia);

CREATE VIRTUAL TABLE IF NOT EXISTS trecho_fts USING fts5(
  texto, secao, content='trecho', content_rowid='id',
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TRIGGER IF NOT EXISTS trecho_ai AFTER INSERT ON trecho BEGIN
  INSERT INTO trecho_fts(rowid, texto, secao) VALUES (new.id, new.texto, new.secao);
END;
CREATE TRIGGER IF NOT EXISTS trecho_ad AFTER DELETE ON trecho BEGIN
  INSERT INTO trecho_fts(trecho_fts, rowid, texto, secao)
  VALUES ('delete', old.id, old.texto, old.secao);
END;
-- O trf3 nao tem este gatilho, e la e inocuo porque nada indexado e atualizado.
-- Peca do escritorio e revisada, e sem ele o indice mentiria.
CREATE TRIGGER IF NOT EXISTS trecho_au AFTER UPDATE ON trecho BEGIN
  INSERT INTO trecho_fts(trecho_fts, rowid, texto, secao)
  VALUES ('delete', old.id, old.texto, old.secao);
  INSERT INTO trecho_fts(rowid, texto, secao) VALUES (new.id, new.texto, new.secao);
END;
"""

VEDACAO = ("Esta base existe para o advogado LER o que ja sustentou. Reaproveitamento "
           "automatico de texto de um cliente em peca de outro e VEDADO. O trecho "
           "devolvido e ponto de partida para redacao nova, conferida contra os autos.")

AVISOS = [
    VEDACAO,
    "Modelo e peca tem data. A legislacao, a jurisprudencia e o entendimento do INSS podem "
    "ter mudado desde entao, e o precedente citado no trecho precisa ser reconferido.",
    "Peca com resultado favoravel nao garante repeticao, porque o resultado depende da prova "
    "do caso concreto. A coluna resultado so existe onde foi preenchida a mao.",
    "O trecho e anonimizado na ingestao. O arquivo de origem NAO e, e pode conter nome, CPF, "
    "numero de beneficio e dado medico, que devem ser conferidos antes de qualquer uso.",
]

DADOS = pathlib.Path(os.environ.get("ACERVO_DADOS", r"C:\Users\VAIO\acervo-escritorio"))


def abrir(caminho=None, leitura=False):
    """Conexao com o esquema garantido. ':memory:' serve ao teste."""
    if caminho == ":memory:":
        con = sqlite3.connect(":memory:")
    elif leitura:
        con = sqlite3.connect(f"file:{caminho or DADOS / 'acervo.db'}?mode=ro", uri=True)
        con.row_factory = sqlite3.Row
        return con
    else:
        alvo = pathlib.Path(caminho or DADOS / "acervo.db")
        alvo.parent.mkdir(parents=True, exist_ok=True)
        con = sqlite3.connect(alvo)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(ESQUEMA)
    return con


# --------------------------------------------------------------------
# Ingestao
# --------------------------------------------------------------------
def hash_gravado(con, peca_id):
    """Hash do texto ja indexado, ou None. E o que torna a reingestao barata."""
    linha = con.execute("SELECT hash FROM peca WHERE id = ?", (peca_id,)).fetchone()
    return linha["hash"] if linha else None


def gravar(con, peca, trechos):
    """Grava a peca e seus trechos, substituindo o que houver.

    Nao se usa INSERT OR IGNORE como no trf3, porque la o documento nunca muda e
    aqui muda. Trecho antigo e apagado, e o gatilho trecho_ad limpa o FTS.
    """
    con.execute("DELETE FROM trecho WHERE peca_id = ?", (peca["id"],))
    con.execute("DELETE FROM citacao WHERE peca_id = ?", (peca["id"],))
    campos = ", ".join(peca)
    con.execute(f"INSERT OR REPLACE INTO peca ({campos}) "
                f"VALUES ({', '.join('?' * len(peca))})", list(peca.values()))
    for t in trechos:
        cur = con.execute(
            "INSERT INTO trecho (peca_id, ordem, secao, texto, palavras) VALUES (?, ?, ?, ?, ?)",
            (peca["id"], t["ordem"], t["secao"], t["texto"], t["palavras"]))
        for corte, ref in t.get("citacoes", ()):
            con.execute("INSERT INTO citacao (trecho_id, peca_id, corte, referencia) "
                        "VALUES (?, ?, ?, ?)", (cur.lastrowid, peca["id"], corte, ref))
    con.commit()
    return len(trechos)


def esquecer(con, ids_vivos):
    """Apaga peca que sumiu da fonte. Devolve quantas."""
    marcas = ", ".join("?" * len(ids_vivos)) or "''"
    n = con.execute(f"DELETE FROM peca WHERE id NOT IN ({marcas})", list(ids_vivos)).rowcount
    con.execute(f"DELETE FROM trecho WHERE peca_id NOT IN ({marcas})", list(ids_vivos))
    con.commit()
    return n


def aplicar_resultados(con, pares):
    """pares = iteravel de (arquivo, resultado). Casa pelo nome do arquivo."""
    n = 0
    for arquivo, resultado in pares:
        n += con.execute("UPDATE peca SET resultado = ? WHERE arquivo = ?",
                         (resultado or None, arquivo)).rowcount
    con.commit()
    return n


# --------------------------------------------------------------------
# Busca
# --------------------------------------------------------------------
def para_fts(consulta):
    """Consulta do usuario -> sintaxe FTS5. Aspas = expressao exata, -palavra = exclui, resto = E."""
    pos, neg = [], []
    for menos, frase, palavra in re.findall(r'(-?)(?:"([^"]+)"|([^\s"]+))', consulta or ""):
        termo = (frase or palavra).replace('"', "").strip()
        if termo and termo.lower() not in ("e", "and"):
            (neg if menos else pos).append(f'"{termo}"')
    if not pos:
        return None
    return " AND ".join(pos) + "".join(f" NOT {n}" for n in neg)


RE_CPF_PASTA = re.compile(r"\s*#\s*\d[\d.\-]*")

_LISTAS = None


def _listas():
    """Lista negra e palavras comuns, lidas da pasta de dados e guardadas em memoria."""
    global _LISTAS
    if _LISTAS is None:
        def ler(nome):
            arq = DADOS / nome
            return set(arq.read_text(encoding="utf-8").split()) if arq.exists() else set()
        _LISTAS = (ler("nomes-clientes.txt"), ler("palavras-comuns.txt"))
    return _LISTAS


def _caminho_publico(caminho):
    """Caminho de origem sem o #CPF e sem o nome do cliente.

    O nome do cliente esta no NOME DO ARQUIVO e na pasta, no padrao
    "Parecer - Fulano de Tal - 17.06.2026.docx", entao anonimizar so o texto deixaria
    o nome sair pela porta dos fundos. Quem precisar abrir a peca pede o caminho real
    por caminho_da_peca_acervo, que e um ato deliberado.
    """
    import parser
    nomes, comuns = _listas()
    return parser.anonimizar(RE_CPF_PASTA.sub("", caminho), nomes, comuns)


def caminho_real(con, trecho_id):
    """O caminho de verdade da peca, para o advogado abrir o arquivo.

    Devolve dado de cliente de proposito, e por isso e ferramenta separada.
    """
    r = con.execute("SELECT p.caminho, p.arquivo, p.origem FROM trecho t "
                    "JOIN peca p ON p.id = t.peca_id WHERE t.id = ?", (trecho_id,)).fetchone()
    if not r:
        return {"erro": "nao_encontrado", "dica": "O id do trecho sai de buscar_tese_acervo."}
    return {"caminho": r["caminho"], "arquivo": r["arquivo"], "origem": r["origem"],
            "aviso": "Este caminho traz o nome do cliente, e o arquivo de origem NAO e "
                     "anonimizado. " + VEDACAO}


FILTROS = ("origem", "tipo_peca", "beneficio", "rito", "resultado")


def _filtros(f):
    sql, args = [], []
    for campo in FILTROS:
        if f.get(campo):
            sql.append(f"p.{campo} = ?")
            args.append(f[campo])
    if f.get("data_inicial"):
        sql.append("p.data_peca >= ?")
        args.append(f["data_inicial"])
    if f.get("data_final"):
        sql.append("p.data_peca <= ?")
        args.append(f["data_final"])
    return sql, args


def _de_onde(consulta, filtros):
    """Devolve (FROM, predicados, args, ORDER BY), reaproveitado por busca e por estatistica."""
    fts = para_fts(consulta)
    sql, args = _filtros(filtros)
    base = "trecho t JOIN peca p ON p.id = t.peca_id"
    if fts:
        return ("trecho_fts JOIN trecho t ON t.id = trecho_fts.rowid "
                "JOIN peca p ON p.id = t.peca_id",
                ["trecho_fts MATCH ?"] + sql, [fts] + args,
                "bm25(trecho_fts, 10, 2)")
    return base, sql, args, "p.data_peca DESC, t.ordem"


def _cits(con, trecho_id):
    return [r["referencia"] for r in con.execute(
        "SELECT DISTINCT referencia FROM citacao WHERE trecho_id = ? ORDER BY referencia",
        (trecho_id,))]


def buscar(con, consulta="", pagina=1, **filtros):
    """Trechos que casam com a consulta, com a peca de origem e os precedentes citados."""
    de, onde, args, ordem = _de_onde(consulta, filtros)
    clausula = (" WHERE " + " AND ".join(onde)) if onde else ""
    total = con.execute(
        f"SELECT count(*) FROM (SELECT 1 FROM {de}{clausula} LIMIT {TETO_CONTAGEM + 1})",
        args).fetchone()[0]
    campo = ("snippet(trecho_fts, 0, '\u00ab', '\u00bb', '\u2026', 40) AS trecho"
             if "trecho_fts" in de else "substr(t.texto, 1, 400) AS trecho")
    linhas = con.execute(
        f"SELECT t.id, t.ordem, t.secao, t.palavras, {campo}, p.arquivo, p.caminho, "
        f"p.origem, p.tipo_peca, p.beneficio, p.rito, p.data_peca, p.resultado "
        f"FROM {de}{clausula} ORDER BY {ordem} LIMIT {POR_PAGINA} OFFSET ?",
        args + [(max(pagina, 1) - 1) * POR_PAGINA]).fetchall()
    return {
        "total": min(total, TETO_CONTAGEM),
        "total_aproximado": total > TETO_CONTAGEM,
        "pagina": pagina,
        "vedacao": VEDACAO,
        "trechos": [dict(r, caminho=_caminho_publico(r["caminho"]),
                         arquivo=_caminho_publico(r["arquivo"]),
                         precedentes_citados=_cits(con, r["id"])) for r in linhas],
    }


def obter(con, trecho_id, contexto=2):
    """O trecho com os parágrafos vizinhos, para ler o argumento inteiro."""
    alvo = con.execute(
        "SELECT t.*, p.arquivo, p.caminho, p.origem, p.tipo_peca, p.beneficio, p.rito, "
        "p.data_peca, p.resultado FROM trecho t JOIN peca p ON p.id = t.peca_id "
        "WHERE t.id = ?", (trecho_id,)).fetchone()
    if not alvo:
        return {"erro": "nao_encontrado", "dica": "O id do trecho sai de buscar_tese_acervo."}
    volta = con.execute(
        "SELECT id, ordem, secao, texto FROM trecho WHERE peca_id = ? AND ordem BETWEEN ? AND ? "
        "ORDER BY ordem", (alvo["peca_id"], alvo["ordem"] - contexto, alvo["ordem"] + contexto))
    return {"arquivo": _caminho_publico(alvo["arquivo"]),
            "caminho": _caminho_publico(alvo["caminho"]),
            "origem": alvo["origem"], "tipo_peca": alvo["tipo_peca"],
            "beneficio": alvo["beneficio"], "rito": alvo["rito"],
            "data_peca": alvo["data_peca"], "resultado": alvo["resultado"],
            "secao": alvo["secao"], "vedacao": VEDACAO,
            "precedentes_citados": _cits(con, alvo["id"]),
            "trechos": [dict(r, alvo=(r["id"] == trecho_id)) for r in volta]}


def listar_pecas(con, **filtros):
    """As pecas do acervo pelo metadado, para achar o modelo certo."""
    sql, args = _filtros(filtros)
    clausula = (" WHERE " + " AND ".join(sql)) if sql else ""
    linhas = con.execute(
        f"SELECT arquivo, caminho, origem, tipo_peca, beneficio, rito, data_peca, "
        f"resultado, trechos FROM peca p{clausula} ORDER BY origem, beneficio, arquivo "
        f"LIMIT 200", args).fetchall()
    return {"total": len(linhas), "vedacao": VEDACAO,
            "pecas": [dict(r, caminho=_caminho_publico(r["caminho"]),
                           arquivo=_caminho_publico(r["arquivo"])) for r in linhas]}


def por_precedente(con, referencia):
    """Em que pecas o escritorio ja citou este precedente.

    Devolve a remissao, nunca o texto do precedente, que vive nos MCPs trf3 e
    iurisprudencia. A articulacao entre as bases e a remissao, nunca a copia.
    """
    alvo = f"%{(referencia or '').strip()}%"
    linhas = con.execute(
        "SELECT c.referencia, c.corte, t.id AS trecho_id, t.secao, substr(t.texto, 1, 400) "
        "AS trecho, p.arquivo, p.caminho, p.tipo_peca, p.beneficio, p.data_peca "
        "FROM citacao c JOIN trecho t ON t.id = c.trecho_id JOIN peca p ON p.id = c.peca_id "
        "WHERE c.referencia LIKE ? ORDER BY p.data_peca DESC LIMIT 50", (alvo,)).fetchall()
    return {"total": len(linhas), "vedacao": VEDACAO,
            "nota": "O inteiro teor do precedente esta nos MCPs trf3 e iurisprudencia, "
                    "nao aqui. Aqui esta so onde o escritorio ja o usou.",
            "ocorrencias": [dict(r, caminho=_caminho_publico(r["caminho"]),
                                 arquivo=_caminho_publico(r["arquivo"])) for r in linhas]}


def visao_geral(con):
    """O que a base cobre. Primeira chamada de qualquer sessao."""
    def conta(campo):
        return {r[0] or "indefinido": r[1] for r in con.execute(
            f"SELECT {campo}, count(*) FROM peca GROUP BY {campo} ORDER BY 2 DESC")}
    tot = con.execute("SELECT count(*) FROM peca").fetchone()[0]
    return {
        "pecas": tot,
        "trechos": con.execute("SELECT count(*) FROM trecho").fetchone()[0],
        "precedentes_citados": con.execute(
            "SELECT count(DISTINCT referencia) FROM citacao").fetchone()[0],
        "por_origem": conta("origem"),
        "por_tipo_peca": conta("tipo_peca"),
        "por_beneficio": conta("beneficio"),
        "com_resultado_anotado": con.execute(
            "SELECT count(*) FROM peca WHERE resultado IS NOT NULL").fetchone()[0],
        "periodo": dict(zip(("primeira", "ultima"), con.execute(
            "SELECT min(data_peca), max(data_peca) FROM peca").fetchone())),
        "avisos": AVISOS,
    }


# --------------------------------------------------------------------
# Auditoria de anonimizacao, que e o teste decisivo
# --------------------------------------------------------------------
SENTINELAS = [
    ("CPF", re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")),
    ("CNJ", re.compile(r"\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b")),
    ("CEP", re.compile(r"\b\d{5}-\d{3}\b")),
    ("EMAIL", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]+\b")),
    ("TELEFONE", re.compile(r"\(?\b\d{2}\)?\s?9?\d{4}[-\s]\d{4}\b")),
    ("CID", re.compile(r"\b[A-TV-Z]\d{2}\.\d{1,2}\b")),
]


def auditar(con, nomes=frozenset(), comuns=frozenset()):
    """Varre TODOS os trechos da base e devolve os vazamentos. Zero e a meta.

    Roda sobre o material real, e nao sobre amostra, que e o que faz dele prova.

    Sao duas verificacoes de naturezas diferentes. A primeira sao as SENTINELAS, que
    sao padroes de identificador e NAO dependem do anonimizador, entao pegam vazamento
    de verdade. A segunda e o ponto fixo, que reaplica o anonimizador ao texto ja
    gravado e exige que nada mude, o que pega base construida com regra antiga.

    # ponytail: nome que e palavra corrente e que aparece SOZINHO no texto escapa das
    # duas, por desenho, porque distingui-lo exigiria reconhecimento de entidade. O
    # numero desses termos ambiguos sai no relatorio para ficar a vista.
    """
    import parser
    vazou = []
    for r in con.execute("SELECT t.id, t.texto, p.arquivo FROM trecho t "
                         "JOIN peca p ON p.id = t.peca_id"):
        for rotulo, padrao in SENTINELAS:
            m = padrao.search(r["texto"])
            if m:
                vazou.append({"trecho_id": r["id"], "arquivo": r["arquivo"],
                              "tipo": rotulo, "achado": m.group(0)})
        if nomes and parser.anonimizar(r["texto"], nomes, comuns) != r["texto"]:
            vazou.append({"trecho_id": r["id"], "arquivo": r["arquivo"],
                          "tipo": "NOME", "achado": "o anonimizador ainda mudaria este trecho"})
    return vazou
