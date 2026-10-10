"""Banco local da jurisprudência do TRF3 — SQLite com FTS5, e as consultas do MCP.

Tudo que o servidor responde sai daqui, para ser testável sem o SDK do MCP.
"""
import os, pathlib, re, sqlite3, statistics, time, unicodedata

DADOS = pathlib.Path(os.environ.get("TRF3_DADOS", r"C:\Users\VAIO\trf3-jurisprudencia"))
TETO_CONTAGEM = 10000

ESQUEMA = """
CREATE TABLE IF NOT EXISTS documento (
  id              TEXT PRIMARY KEY,   -- id do documento na fonte (CJF): reingerir o mesmo bruto não duplica
  acervo          TEXT NOT NULL,      -- trf3 | recursais | sumulas
  numero_cnj      TEXT NOT NULL,
  classe_sigla    TEXT,
  classe_nome     TEXT,
  orgao_julgador  TEXT,
  relator         TEXT,               -- "Relator(a)" do CJF, quem relatou (pode ser o convocado)
  relator_titular TEXT,               -- linha RELATOR do inteiro teor, o titular do gabinete
  relator_acordao TEXT,               -- "Relator para Acórdão" do CJF, quando o voto do relator vencido
  data_julgamento TEXT,               -- AAAA-MM-DD
  data_publicacao TEXT,
  polo_recorrente TEXT,               -- inss | segurado | ambos | indefinido
  resultado       TEXT,               -- INFERIDO do dispositivo, nunca dado oficial
  ementa_texto    TEXT,
  e_caso_exame    TEXT,
  e_questao       TEXT,
  e_razoes        TEXT,
  e_dispositivo   TEXT,
  inteiro_teor    TEXT,
  coletado_em     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_cnj     ON documento(numero_cnj);
CREATE INDEX IF NOT EXISTS ix_relator ON documento(relator);
CREATE INDEX IF NOT EXISTS ix_orgao   ON documento(orgao_julgador);
CREATE INDEX IF NOT EXISTS ix_julg    ON documento(data_julgamento);
CREATE INDEX IF NOT EXISTS ix_acervo  ON documento(acervo);
CREATE INDEX IF NOT EXISTS ix_coletado ON documento(coletado_em);   -- sem ele a visão geral varria 5 GB

CREATE VIRTUAL TABLE IF NOT EXISTS documento_fts USING fts5(
  ementa_texto, e_razoes, e_dispositivo, inteiro_teor,
  content='documento', content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2"
);
CREATE TRIGGER IF NOT EXISTS documento_ai AFTER INSERT ON documento BEGIN
  INSERT INTO documento_fts(rowid, ementa_texto, e_razoes, e_dispositivo, inteiro_teor)
  VALUES (new.rowid, new.ementa_texto, new.e_razoes, new.e_dispositivo, new.inteiro_teor);
END;
CREATE TRIGGER IF NOT EXISTS documento_ad AFTER DELETE ON documento BEGIN
  INSERT INTO documento_fts(documento_fts, rowid, ementa_texto, e_razoes, e_dispositivo, inteiro_teor)
  VALUES ('delete', old.rowid, old.ementa_texto, old.e_razoes, old.e_dispositivo, old.inteiro_teor);
END;

CREATE TABLE IF NOT EXISTS acento (      -- palavra sem acento -> como o CJF a entrega nas Recursais
  base TEXT PRIMARY KEY, perdida TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progresso (   -- retomada da coleta
  acervo TEXT, orgao TEXT, mes TEXT, paginas INTEGER, documentos INTEGER, concluido_em TEXT,
  PRIMARY KEY (acervo, orgao, mes)
);
"""

AVISOS = [
    "Provimento não equivale a decisão favorável ao segurado, porque o recorrente frequentemente é o INSS. Confira polo_recorrente.",
    "A base tem corte temporal e recorte previdenciário (7ª a 10ª Turmas, 3ª Seção, Turmas Recursais e TRU3). Ausência aqui não é ausência no TRF3.",
    "O campo resultado é inferido por heurística sobre o dispositivo, e não é dado oficial.",
    "O CJF não tem todos os acórdãos que o portal do TRF3 tem em alguns meses. Medido em 22/09/2026, abril de "
    "2025 tem 1.519 no CJF contra 9.122 no portal, e setembro de 2024 tem 1.555 contra 8.506. Veja "
    "meses_com_cobertura_parcial_no_cjf antes de concluir que um julgado não existe.",
    "Fonte: Jurisprudência Unificada do CJF. Nas recursais o texto vem da fonte com a letra acentuada apagada (rudo, no lugar de ruído), e a busca "
    "compensa isso com um dicionário montado do texto do TRF3. Palavra que o dicionário não tem é procurada só "
    "como digitada. Registros antigos sem ementa nem decisão ficam de fora. Citação em peça exige conferência no portal do TRF3.",
]


def abrir(caminho=None, leitura=False):
    if caminho == ":memory:":
        con = sqlite3.connect(caminho, timeout=30)
        # WAL deixa o MCP ler enquanto o coletor grava; no modo padrão a leitura esperava a escrita e falhava
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript(ESQUEMA)
        con.row_factory = sqlite3.Row
        return con
    caminho = pathlib.Path(caminho or DADOS / "trf3.db")
    if leitura:
        con = sqlite3.connect(f"file:{caminho.as_posix()}?mode=ro", uri=True, timeout=30)
    else:
        caminho.parent.mkdir(parents=True, exist_ok=True)
        con = sqlite3.connect(caminho, timeout=30)
        # WAL deixa o MCP ler enquanto o coletor grava; no modo padrão a leitura esperava a escrita e falhava
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript(ESQUEMA)
        cols = {l[1] for l in con.execute("PRAGMA table_info(documento)")}
        for c in ("relator_titular", "relator_acordao"):      # base criada antes de 19/09/2026
            if c not in cols:
                con.execute(f"ALTER TABLE documento ADD COLUMN {c} TEXT")
    con.row_factory = sqlite3.Row
    return con


def gravar(con, docs, tentativas=5):
    """INSERT OR IGNORE pelo id da fonte. Devolve quantos eram novos.

    Mesmo em WAL o banco de 12 GB às vezes devolve "database is locked" durante o checkpoint,
    e perder a página coletada por isso seria desperdício. Espera e repete antes de desistir.
    """
    for i in range(tentativas):
        try:
            novos = 0                           # total_changes contaria também o gatilho do FTS
            for d in docs:
                cols = ", ".join(d)
                novos += con.execute(f"INSERT OR IGNORE INTO documento ({cols}) VALUES ({', '.join('?' * len(d))})",
                                     list(d.values())).rowcount
            con.commit()
            return novos
        except sqlite3.OperationalError as e:
            if "locked" not in str(e) or i == tentativas - 1:
                raise
            con.rollback()
            time.sleep(10 * (i + 1))


def _sem_acento(w):
    return "".join(c for c in unicodedata.normalize("NFKD", w) if not unicodedata.combining(c))


def _perdida(w):
    """Como o CJF entrega a palavra nas Turmas Recursais, que descarta a letra acentuada em vez de trocá-la."""
    return "".join(c for c in w if _sem_acento(c) == c)


def construir_acento(con, amostra=6000):
    """Monta o dicionário palavra-sem-acento -> palavra-como-vem-nas-Recursais a partir do texto do TRF3, que
    chega com acento. As Recursais não servem de fonte, porque nelas a informação já foi apagada."""
    cont = {}
    ids = [r[0] for r in con.execute(
        "SELECT rowid FROM documento WHERE acervo = 'trf3' AND rowid % 61 = 0 LIMIT ?", (amostra,))]
    for i in range(0, len(ids), 500):
        marcas = ",".join("?" * len(ids[i:i + 500]))
        for (t,) in con.execute(f"SELECT ementa_texto || ' ' || substr(inteiro_teor, 1, 4000) FROM documento "
                                f"WHERE rowid IN ({marcas})", ids[i:i + 500]):
            for w in re.findall(r"\w+", (t or "").lower()):
                base = _sem_acento(w)
                if base != w and len(base) > 3:
                    d = cont.setdefault(base, {})
                    d[_perdida(w)] = d.get(_perdida(w), 0) + 1
    con.execute("DELETE FROM acento")
    con.executemany("INSERT INTO acento VALUES (?, ?)",
                    [(b, max(v, key=v.get)) for b, v in cont.items() if max(v, key=v.get) and max(v, key=v.get) != b])
    con.commit()
    return len(cont)


_ACENTO = {}


def _dicionario(con):
    if con is not None and id(con) not in _ACENTO:
        try:
            _ACENTO[id(con)] = dict(con.execute("SELECT base, perdida FROM acento").fetchall())
        except sqlite3.OperationalError:          # base antiga, sem o dicionário
            _ACENTO[id(con)] = {}
    return _ACENTO.get(id(con), {})


def _termo(termo, dic, acervo=""):
    """O termo como digitado OU como vem das Recursais. Sem isso, "ruido" acha 1.750 acórdãos delas e "rudo"
    acha 50.813, e a busca ignora 96% do acervo. Com o acervo já filtrado só a forma dele entra, o que
    também evita varrer o outro acervo à toa."""
    alt = " ".join(dic.get(_sem_acento(w.lower()), _perdida(w) if _sem_acento(w) != w else w)
                   for w in termo.split())
    if alt.lower() == termo.lower():
        return f'"{termo}"'
    if acervo == "recursais":
        return f'"{alt}"'
    if acervo in ("trf3", "sumulas"):
        return f'"{_sem_acento(termo)}"'
    return f'("{termo}" OR "{alt}")'


def para_fts(consulta, con=None, acervo=""):
    """Consulta do usuário -> sintaxe FTS5. Aspas = expressão exata, -palavra = exclui, resto = E."""
    dic = _dicionario(con)
    pos, neg = [], []
    for menos, frase, palavra in re.findall(r'(-?)(?:"([^"]+)"|([^\s"]+))', consulta or ""):
        termo = (frase or palavra).replace('"', "").strip()
        if termo and termo.lower() not in ("e", "and"):
            (neg if menos else pos).append(_termo(termo, dic, acervo))
    if not pos:
        return None
    return " AND ".join(pos) + "".join(f" NOT {n}" for n in neg)


def _filtros(f):
    sql, args = [], []
    for campo, op in (("acervo", "="), ("classe_sigla", "="), ("resultado", "="), ("polo_recorrente", "=")):
        if f.get(campo):
            sql.append(f"d.{campo} {op} ?"); args.append(f[campo])
    if f.get("orgao_julgador"):                      # por nome, parcial, sem caixa
        sql.append("d.orgao_julgador LIKE ?"); args.append(f"%{f['orgao_julgador']}%")
    if f.get("relator"):                             # acha o nome em qualquer dos três papéis
        sql.append("(d.relator LIKE ? OR d.relator_titular LIKE ? OR d.relator_acordao LIKE ?)")
        args += [f"%{f['relator']}%"] * 3
    if f.get("data_inicial"):
        sql.append("d.data_julgamento >= ?"); args.append(f["data_inicial"])
    if f.get("data_final"):
        sql.append("d.data_julgamento <= ?"); args.append(f["data_final"])
    return sql, args


def _de_onde(consulta, filtros, con=None):
    fts = para_fts(consulta, con, filtros.get("acervo", ""))
    sql, args = _filtros(filtros)
    if fts:
        return ("documento_fts JOIN documento d ON d.rowid = documento_fts.rowid",
                ["documento_fts MATCH ?"] + sql, [fts] + args, "bm25(documento_fts, 5, 3, 3, 1)")
    return "documento d", sql, args, "d.data_julgamento DESC"


def buscar(con, consulta="", pagina=1, **filtros):
    de, sql, args, ordem = _de_onde(consulta, filtros, con)
    onde = " WHERE " + " AND ".join(sql) if sql else ""
    total = con.execute(f"SELECT count(*) FROM (SELECT 1 FROM {de}{onde} LIMIT {TETO_CONTAGEM + 1})",
                        args).fetchone()[0]
    ampla = total > TETO_CONTAGEM
    if ampla and "documento_fts" in de:
        # classificar centenas de milhares de acórdãos por relevância leva minutos e o cliente desiste antes.
        # Consulta ampla vem na ordem do índice, sem relevância, e com o aviso para refinar.
        ordem = "documento_fts.rowid DESC"
    linhas = con.execute(
        f"""SELECT d.id, d.acervo, d.numero_cnj, d.classe_sigla, d.orgao_julgador, d.relator, d.relator_titular, d.relator_acordao,
                   d.data_julgamento, d.data_publicacao, d.polo_recorrente, d.resultado,
                   substr(coalesce(d.e_dispositivo, d.ementa_texto), 1, 600) AS ementa_resumo
            FROM {de}{onde} ORDER BY {ordem} LIMIT 10 OFFSET ?""",
        args + [(max(pagina, 1) - 1) * 10]).fetchall()
    r = {"total": min(total, TETO_CONTAGEM), "total_aproximado": ampla,
         "pagina": pagina, "resultado_e_inferido": True, "resultados": [dict(l) for l in linhas]}
    if ampla:
        r["consulta_pesada"] = ("Mais de 10.000 resultados, sem ordenação por relevância. Acrescente uma "
                                "expressão entre aspas, o acervo, o órgão, o relator ou o período.")
    return r


def obter(con, id_, max_caracteres=40000):
    l = con.execute("SELECT * FROM documento WHERE id = ?", [id_]).fetchone()
    if not l:
        return {"erro": "nao_encontrado", "dica": "O id sai de buscar_acordaos_trf3."}
    d = dict(l)
    teor = d["inteiro_teor"] or ""
    d["truncado"] = len(teor) > max_caracteres
    d["inteiro_teor"] = teor[:max_caracteres]
    return d


def visao_geral(con):
    um = lambda q: con.execute(q).fetchone()
    por = lambda c: {l[0]: l[1] for l in con.execute(
        f"SELECT {c}, count(*) FROM documento GROUP BY 1 ORDER BY 2 DESC")}
    # cada agregado sai de um índice; juntar tudo numa consulta obrigava varredura da tabela inteira
    ini, fim = um("SELECT min(data_julgamento), max(data_julgamento) FROM documento")
    total = um("SELECT count(*) FROM documento")[0]
    coleta = um("SELECT max(coletado_em) FROM documento")[0]
    # o CJF tem mês com muito menos acórdão que o portal do TRF3 (abril/2025 tem 1.519 no CJF e 9.122 no
    # portal, medido em 22/09/2026). O mês fica na base, e a lacuna é declarada em vez de escondida
    meses = [tuple(l) for l in con.execute(
        "SELECT mes, documentos FROM progresso WHERE acervo = 'trf3' ORDER BY mes")]
    corte = 0.3 * (statistics.median([d for _, d in meses]) if meses else 0)
    parciais = {m: d for m, d in meses if d < corte}
    return {"total": total, "julgados_de": ini, "julgados_ate": fim, "ultima_coleta": coleta,
            "meses_com_cobertura_parcial_no_cjf": parciais,
            "por_acervo": por("acervo"), "por_orgao": por("orgao_julgador"),
            "relatores": len(por("relator")), "avisos": AVISOS}


def perfil(con, campo, nome, consulta="", **filtros):
    """Distribuição resultado x polo de um relator ou órgão. Taxa só sobre mérito (providos + negados)."""
    assert campo in ("relator", "orgao_julgador")
    de, sql, args, _ = _de_onde(consulta, {**filtros, campo: nome}, con)
    linhas = con.execute(f"""SELECT d.polo_recorrente, d.resultado, count(*) FROM {de}
                             WHERE {' AND '.join(sql)} GROUP BY 1, 2""", args).fetchall()
    tab = {}
    for polo, res, n in linhas:
        tab.setdefault(polo or "indefinido", {})[res or "outro"] = n
    for polo, r in tab.items():
        ok = r.get("provido", 0) + r.get("parcial", 0)
        merito = ok + r.get("negado", 0)
        r["taxa_provimento"] = round(ok / merito, 3) if merito else None
    return {campo: nome, "total": sum(l[2] for l in linhas), "por_polo_recorrente": tab, "avisos": AVISOS}
