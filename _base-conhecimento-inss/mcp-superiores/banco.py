"""Banco local de STF e STJ — temas (repercussão geral, repetitivos, Jurisprudência em Teses) e decisões.

Tudo que o servidor responde sai daqui, para ser testável sem o SDK do MCP. A busca segue o contrato do
mcp-trf3 (aspas, -palavra, TETO_CONTAGEM e consulta_pesada), sem o dicionário de acentos, porque estas
fontes vêm com acento.
"""
import os, pathlib, re, sqlite3, time

DADOS = pathlib.Path(os.environ.get("SUPERIORES_DADOS", r"C:\Users\VAIO\superiores-jurisprudencia"))
TETO_CONTAGEM = 10000

ESQUEMA = """
CREATE TABLE IF NOT EXISTS tema (
  id              TEXT PRIMARY KEY,   -- STF-RG-1102 | STJ-TEMA-1124 | STJ-CONTROVERSIA-4 | STJ-JT-198-3
  tribunal        TEXT NOT NULL,      -- STF | STJ
  tipo            TEXT NOT NULL,      -- repercussao_geral | tema | controversia | iac | puil | sirdr | jurisprudencia_em_teses
  numero          INTEGER,
  titulo          TEXT,
  questao         TEXT,
  tese            TEXT,
  situacao        TEXT,
  leading_case    TEXT,
  orgao_julgador  TEXT,
  relator         TEXT,
  data_afetacao   TEXT,               -- AAAA-MM-DD
  data_julgamento TEXT,
  data_publicacao TEXT,
  assuntos        TEXT,
  previdenciario  INTEGER NOT NULL DEFAULT 0,
  vinculo         TEXT,               -- tema do outro tribunal ligado a este, como a fonte o informa
  link_oficial    TEXT,
  coletado_em     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_tema_trib ON tema(tribunal, tipo, numero);

CREATE VIRTUAL TABLE IF NOT EXISTS tema_fts USING fts5(
  titulo, questao, tese, content='tema', content_rowid='rowid', tokenize="unicode61 remove_diacritics 2"
);
CREATE TRIGGER IF NOT EXISTS tema_ai AFTER INSERT ON tema BEGIN
  INSERT INTO tema_fts(rowid, titulo, questao, tese) VALUES (new.rowid, new.titulo, new.questao, new.tese);
END;
CREATE TRIGGER IF NOT EXISTS tema_ad AFTER DELETE ON tema BEGIN
  INSERT INTO tema_fts(tema_fts, rowid, titulo, questao, tese) VALUES ('delete', old.rowid, old.titulo, old.questao, old.tese);
END;

CREATE TABLE IF NOT EXISTS documento (
  id              TEXT PRIMARY KEY,   -- fonte + id na fonte: reingerir o mesmo bruto não duplica
  tribunal        TEXT NOT NULL,
  fonte           TEXT NOT NULL,      -- espelho | integra | djen | stf_acordao
  tipo            TEXT,               -- acordao | decisao
  processo        TEXT,               -- classe e número, como a fonte dá (REsp 1234567, RE 1276977)
  classe          TEXT,
  orgao_julgador  TEXT,
  relator         TEXT,
  data_julgamento TEXT,
  data_publicacao TEXT,
  ementa          TEXT,
  tese_juridica   TEXT,
  temas           TEXT,               -- temas citados ou vinculados, como a fonte os dá
  referencias     TEXT,
  inteiro_teor    TEXT,
  link_oficial    TEXT,
  coletado_em     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_doc_proc  ON documento(processo);
CREATE INDEX IF NOT EXISTS ix_doc_julg  ON documento(data_julgamento);
CREATE INDEX IF NOT EXISTS ix_doc_trib  ON documento(tribunal, fonte, tipo);
CREATE INDEX IF NOT EXISTS ix_doc_orgao ON documento(orgao_julgador);
CREATE INDEX IF NOT EXISTS ix_doc_col   ON documento(coletado_em);

CREATE VIRTUAL TABLE IF NOT EXISTS documento_fts USING fts5(
  ementa, tese_juridica, inteiro_teor, content='documento', content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2"
);
CREATE TRIGGER IF NOT EXISTS documento_ai AFTER INSERT ON documento BEGIN
  INSERT INTO documento_fts(rowid, ementa, tese_juridica, inteiro_teor)
  VALUES (new.rowid, new.ementa, new.tese_juridica, new.inteiro_teor);
END;
CREATE TRIGGER IF NOT EXISTS documento_ad AFTER DELETE ON documento BEGIN
  INSERT INTO documento_fts(documento_fts, rowid, ementa, tese_juridica, inteiro_teor)
  VALUES ('delete', old.rowid, old.ementa, old.tese_juridica, old.inteiro_teor);
END;

CREATE TABLE IF NOT EXISTS progresso (   -- arquivo ou página já processado, para a coleta retomar
  fonte TEXT, chave TEXT, documentos INTEGER, concluido_em TEXT, PRIMARY KEY (fonte, chave)
);
"""

AVISOS = [
    "Recorte previdenciário e assistencial. Ausência aqui não é ausência no tribunal.",
    "STJ. Os espelhos são os acórdãos que a Secretaria de Jurisprudência tratou, não todos os julgados. As íntegras "
    "(dados abertos do STJ) cobrem 2021 a 2025, com acórdãos e decisões monocráticas terminativas. De 2026 em diante, "
    "quando o STJ passou a publicar o texto de poucas, a fonte é o Diário de Justiça Eletrônico Nacional (fonte djen), "
    "restrito aos processos em que o INSS é parte. Veja cobertura_integras.",
    "STF. Entram os temas de repercussão geral e os acórdãos dos leading cases previdenciários e das ações de "
    "controle do catálogo do escritório. A pesquisa geral de jurisprudência do STF não está aqui.",
    "A Jurisprudência em Teses traz as 7 edições do previdenciário e 63 de outros ramos que tocam o trabalho do "
    "escritório (processo civil, mandado de segurança, pessoa com deficiência e idosa, gênero, união estável, dano "
    "moral). O ramo vem em assuntos, e só as do previdenciário têm previdenciario=1. Cada tese traz em leading_case "
    "até cinco julgados que a edição indica. A edição é a fotografia da sua data (data_publicacao) e não se atualiza. Há tese "
    "superada depois, como a da desaposentação na edição 67, afastada pelo Tema 503 do STF. Confira o tema vinculante.",
    "Situação e tese são as da data da coleta. Citação em peça exige conferência no link_oficial, que é a fonte.",
]


def abrir(caminho=None, leitura=False):
    if caminho != ":memory:":
        caminho = pathlib.Path(caminho or DADOS / "superiores.db")
        if leitura:
            con = sqlite3.connect(f"file:{caminho.as_posix()}?mode=ro", uri=True, timeout=30)
            con.row_factory = sqlite3.Row
            return con
        caminho.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(caminho, timeout=30)
    con.execute("PRAGMA journal_mode=WAL")      # o MCP lê enquanto o coletor grava
    con.executescript(ESQUEMA)
    con.row_factory = sqlite3.Row
    return con


def gravar(con, tabela, linhas, substituir=False, tentativas=5):
    """Grava pelo id da fonte. Tema muda de situação e tese, e por isso é substituído; decisão não muda e
    entra com INSERT OR IGNORE. Repete em "database is locked", que aparece durante o checkpoint do WAL."""
    verbo = "INSERT OR REPLACE" if substituir else "INSERT OR IGNORE"
    for i in range(tentativas):
        try:
            n = 0
            for d in linhas:
                if substituir:              # REPLACE apaga e insere, e o gatilho de delete limpa o FTS
                    con.execute(f"DELETE FROM {tabela} WHERE id = ?", [d["id"]])
                n += con.execute(f"{verbo} INTO {tabela} ({', '.join(d)}) VALUES ({', '.join('?' * len(d))})",
                                 list(d.values())).rowcount
            con.commit()
            return n
        except sqlite3.OperationalError as e:
            if "locked" not in str(e) or i == tentativas - 1:
                raise
            con.rollback()
            time.sleep(10 * (i + 1))


def marcar(con, fonte, chave, documentos):
    con.execute("INSERT OR REPLACE INTO progresso VALUES (?, ?, ?, datetime('now'))", [fonte, chave, documentos])
    con.commit()


def feito(con, fonte):
    return {r[0] for r in con.execute("SELECT chave FROM progresso WHERE fonte = ?", [fonte])}


def para_fts(consulta):
    """Consulta do usuário -> sintaxe FTS5. Aspas = expressão exata, -palavra = exclui, resto = E."""
    pos, neg = [], []
    for menos, frase, palavra in re.findall(r'(-?)(?:"([^"]+)"|([^\s"]+))', consulta or ""):
        termo = (frase or palavra).replace('"', "").strip()
        if termo and termo.lower() not in ("e", "and"):
            (neg if menos else pos).append(f'"{termo}"')
    if not pos:
        return None
    return " AND ".join(pos) + "".join(f" NOT {n}" for n in neg)


def _paginar(con, tabela, colunas, ordem_fts, ordem_data, consulta, filtros, pagina):
    """Busca comum a tema e documento. filtros é uma lista de (sql, valor)."""
    fts = para_fts(consulta)
    sql, args = [f for f, _ in filtros], [v for _, v in filtros]
    if fts:
        de = f"{tabela}_fts JOIN {tabela} d ON d.rowid = {tabela}_fts.rowid"
        sql, args, ordem = [f"{tabela}_fts MATCH ?"] + sql, [fts] + args, ordem_fts
    else:
        de, ordem = f"{tabela} d", ordem_data
    onde = " WHERE " + " AND ".join(sql) if sql else ""
    total = con.execute(f"SELECT count(*) FROM (SELECT 1 FROM {de}{onde} LIMIT {TETO_CONTAGEM + 1})", args).fetchone()[0]
    ampla = total > TETO_CONTAGEM
    if ampla and fts:                  # ranquear dezenas de milhares leva minutos; vem na ordem do índice
        ordem = f"{tabela}_fts.rowid DESC"
    linhas = con.execute(f"SELECT {colunas} FROM {de}{onde} ORDER BY {ordem} LIMIT 10 OFFSET ?",
                         args + [(max(pagina, 1) - 1) * 10]).fetchall()
    r = {"total": min(total, TETO_CONTAGEM), "total_aproximado": ampla, "pagina": pagina,
         "resultados": [dict(l) for l in linhas]}
    if ampla:
        r["consulta_pesada"] = ("Mais de 10.000 resultados, sem ordenação por relevância. Acrescente uma "
                                "expressão entre aspas, o tribunal, o órgão ou o período.")
    return r


def _f(cond, valor):
    return [(cond, valor)] if valor not in ("", None) else []


def buscar_temas(con, consulta="", tribunal="", tipo="", situacao="", numero=None, previdenciario=None, pagina=1):
    filtros = (_f("d.tribunal = ?", tribunal.upper()) + _f("d.tipo = ?", tipo) +
               _f("d.situacao LIKE ?", f"%{situacao}%" if situacao else "") + _f("d.numero = ?", numero) +
               _f("d.previdenciario = ?", None if previdenciario is None else int(previdenciario)))
    return _paginar(con, "tema", "d.id, d.tribunal, d.tipo, d.numero, d.situacao, d.leading_case, d.titulo, "
                    "substr(coalesce(d.tese, d.questao), 1, 700) AS tese_resumo, d.link_oficial",
                    "bm25(tema_fts, 2, 1, 4)", "d.tribunal, d.tipo, d.numero DESC", consulta, filtros, pagina)


def obter_tema(con, id_=None, tribunal="", numero=None, tipo=""):
    if id_:
        l = con.execute("SELECT * FROM tema WHERE id = ?", [id_]).fetchone()
    else:
        tipo = tipo or ("repercussao_geral" if tribunal.upper() == "STF" else "tema")
        l = con.execute("SELECT * FROM tema WHERE tribunal = ? AND tipo = ? AND numero = ?",
                        [tribunal.upper(), tipo, numero]).fetchone()
    if not l:
        return {"erro": "nao_encontrado", "dica": "Informe id, ou tribunal e numero. O id sai de buscar_temas."}
    d = dict(l)
    lcs = [p.strip() for p in (d["leading_case"] or "").split(";") if p.strip()]
    marca = f"RG-{d['numero']}" if d["tribunal"] == "STF" else str(d["numero"])
    cand = con.execute(
        f"SELECT id, processo, tipo, fonte, orgao_julgador, data_julgamento, data_publicacao, temas FROM documento "
        f"WHERE tribunal = ? AND (temas LIKE ? OR processo IN ({','.join('?' * len(lcs)) or 'NULL'})) "
        f"ORDER BY coalesce(data_julgamento, data_publicacao) DESC LIMIT 200",
        [d["tribunal"], f"%{marca}%"] + lcs).fetchall()
    # LIKE '%1124%' também pega 11240; confere o número inteiro
    d["decisoes_na_base"] = [dict(r) for r in cand if r["processo"] in lcs
                             or re.search(rf"(?<![\d.]){re.escape(marca)}(?![\d])", (r["temas"] or "").replace(".", ""))][:20]
    return d


def buscar_decisoes(con, consulta="", tribunal="", fonte="", tipo="", orgao_julgador="", classe="", relator="",
                    tema="", data_inicial="", data_final="", pagina=1):
    filtros = (_f("d.tribunal = ?", tribunal.upper()) + _f("d.fonte = ?", fonte) + _f("d.tipo = ?", tipo) +
               _f("d.orgao_julgador LIKE ?", f"%{orgao_julgador}%" if orgao_julgador else "") +
               _f("d.classe = ?", classe) + _f("d.relator LIKE ?", f"%{relator}%" if relator else "") +
               _f("d.temas LIKE ?", f"%{tema}%" if tema else "") +
               # íntegras e DJEN só trazem a publicação, que serve de data quando falta a de julgamento
               _f("coalesce(d.data_julgamento, d.data_publicacao) >= ?", data_inicial) +
               _f("coalesce(d.data_julgamento, d.data_publicacao) <= ?", data_final))
    return _paginar(con, "documento", "d.id, d.tribunal, d.fonte, d.tipo, d.processo, d.orgao_julgador, d.relator, "
                    "d.data_julgamento, d.data_publicacao, d.temas, substr(coalesce(d.ementa, d.inteiro_teor), 1, 600) "
                    "AS ementa_resumo, d.link_oficial", "bm25(documento_fts, 5, 4, 1)", "d.data_julgamento DESC",
                    consulta, filtros, pagina)


def obter_decisao(con, id_, max_caracteres=40000):
    l = con.execute("SELECT * FROM documento WHERE id = ?", [id_]).fetchone()
    if not l:
        return {"erro": "nao_encontrado", "dica": "O id sai de buscar_decisoes_superiores."}
    d = dict(l)
    teor = d["inteiro_teor"] or ""
    d["truncado"] = len(teor) > max_caracteres
    d["inteiro_teor"] = teor[:max_caracteres]
    return d


def visao_geral(con):
    temas = {f"{t} {tp}": {"total": n, "previdenciarios": p} for t, tp, n, p in con.execute(
        "SELECT tribunal, tipo, count(*), sum(previdenciario) FROM tema GROUP BY 1, 2")}
    docs = {f"{t} {f} {tp}": {"total": n, "de": a, "ate": b} for t, f, tp, n, a, b in con.execute(
        "SELECT tribunal, fonte, tipo, count(*), min(data_julgamento), max(data_julgamento) FROM documento GROUP BY 1, 2, 3")}
    cob = {}
    for f, ano, n in con.execute("SELECT fonte, substr(chave, 1, 4), sum(documentos) FROM progresso "
                                 "WHERE fonte IN ('integras', 'integras_sem_texto', 'djen') GROUP BY 1, 2"):
        cob.setdefault(ano, {})[{"integras": "com_texto", "integras_sem_texto": "sem_texto_na_fonte",
                                 "djen": "djen"}[f]] = n
    coleta = con.execute("SELECT max(concluido_em) FROM progresso").fetchone()[0]
    return {"temas": temas, "decisoes": docs, "ultima_coleta": coleta,
            "cobertura_integras": dict(sorted(cob.items())), "avisos": AVISOS}
