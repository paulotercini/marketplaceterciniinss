"""Coletor da jurisprudência do TRF3 e das Turmas Recursais da 3ª Região, pela Jurisprudência
Unificada do CJF (https://jurisprudencia.cjf.jus.br/unificada/), que responde a cliente HTTP comum
e traz o inteiro teor no campo Decisão. O portal do próprio TRF3 barra coleta automatizada
(SONDA-2026-09-19.md) e não é tocado aqui.

Um worker, serial, 3 s entre requisições. Varre do mês mais recente para o mais antigo, grava a
resposta bruta comprimida antes de parsear e retoma de onde parou. Para no primeiro documento
que o parser não reconhecer.

    python coletor.py --meses 1 --paginas 3        # primeiro teste
    python coletor.py                              # dez anos, TRF3 e Recursais
"""
import argparse, datetime, gzip, http.cookiejar, math, os, re, ssl, sys, time
import urllib.parse, urllib.request

import banco, parser

URL = "https://jurisprudencia.cjf.jus.br/unificada/index.xhtml"
# campos do formulário JSF, medidos em 19/09/2026. Os j_idtNN são gerados pelo servidor e podem
# mudar num redeploy do CJF: aí a pesquisa devolve total zero e a coleta para com aviso.
DATA_INI, DATA_FIM, TIPO_DATA, TABELA = ("formulario:j_idt43_input", "formulario:j_idt45_input",
                                         "formulario:combo_tipo_data_input", "formulario:tabelaDocumentos")
ACERVOS = {"trf3": {"formulario:j_idt51": "TRF3"},
           "recursais": {"formulario:trMarcado_input": "on", "formulario:tribuna_tr": "TR3"}}
PAUSA, POR_PAGINA = 3, 50
AJAX = {"javax.faces.partial.ajax": "true", "formulario": "formulario"}


class SessaoPerdida(Exception):
    pass


class Cjf:
    def __init__(self):
        self.ultimo = 0.0
        self.nova()

    def nova(self):
        ctx = ssl.create_default_context(cafile=os.environ.get("CA_BUNDLE") or None)
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()),
                                              urllib.request.HTTPSHandler(context=ctx))
        self.op.addheaders = [("User-Agent", "Mozilla/5.0 (coleta do escritorio Tercini, 1 req/3s)")]
        self.vs = None

    def pedir(self, dados=None):
        req = urllib.request.Request(URL, data=urllib.parse.urlencode(dados).encode() if dados else None)
        if dados:
            req.add_header("Faces-Request", "partial/ajax")
            req.add_header("X-Requested-With", "XMLHttpRequest")
        for i in range(4):
            espera = PAUSA - (time.monotonic() - self.ultimo)
            if espera > 0:
                time.sleep(espera)
            try:
                with self.op.open(req, timeout=180) as r:
                    txt = r.read().decode(r.headers.get_content_charset() or "utf-8", "replace")
                self.ultimo = time.monotonic()
                m = re.search(r'javax\.faces\.ViewState[^>]*?(?:value="|<!\[CDATA\[)([^"\]]+)', txt)
                if m:
                    self.vs = m.group(1)
                return txt
            except Exception as e:
                self.ultimo = time.monotonic()
                print(f"    tentativa {i + 1} falhou ({e!r:.160}), esperando {2 ** (i + 2)} s", flush=True)
                time.sleep(2 ** (i + 2))
        raise SystemExit("o CJF não respondeu em 4 tentativas")

    def _alternar(self, campo, estado):
        self.pedir({**AJAX, **estado, "javax.faces.source": f"formulario:{campo}",
                    "javax.faces.partial.execute": f"formulario:{campo}", "javax.faces.partial.render": "formulario",
                    "javax.faces.behavior.event": "change", "javax.faces.partial.event": "change",
                    "javax.faces.ViewState": self.vs})

    def pesquisar(self, acervo, ini, fim):
        """Abre sessão nova, liga a pesquisa avançada e pesquisa o período. Devolve o total."""
        self.nova()
        self.pedir()
        self.estado = {"formulario:ckbAvancada_input": "on"}
        self._alternar("ckbAvancada", self.estado)
        if acervo == "recursais":                 # o seletor de região só existe no servidor depois deste passo
            self.estado["formulario:trMarcado_input"] = "on"
            self._alternar("trMarcado", self.estado)
        self.estado.update(ACERVOS[acervo])
        r = self.pedir({**AJAX, **self.estado, "formulario:textoLivre": "",
                        DATA_INI: ini.strftime("%d/%m/%Y"), DATA_FIM: fim.strftime("%d/%m/%Y"), TIPO_DATA: "DTDP",
                        "javax.faces.source": "formulario:actPesquisar", "javax.faces.partial.execute": "@all",
                        "javax.faces.partial.render": "formulario:resultado",
                        "formulario:actPesquisar": "formulario:actPesquisar", "javax.faces.ViewState": self.vs})
        m = re.search(r"\(Exibindo[^)]*?de\s+(\d+)\s*,", r)
        if not m:
            raise SystemExit("pesquisa sem contador de resultados, o formulário do CJF mudou: "
                             + re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", r))[:200])
        return int(m.group(1))

    def pagina(self, k, esperados):
        r = self.pedir({**AJAX, **self.estado, "javax.faces.source": TABELA, "javax.faces.partial.execute": TABELA,
                        "javax.faces.partial.render": TABELA, TABELA: TABELA, TABELA + "_pagination": "true",
                        TABELA + "_first": str((k - 1) * POR_PAGINA), TABELA + "_rows": str(POR_PAGINA),
                        TABELA + "_encodeFeature": "true", "javax.faces.ViewState": self.vs})
        if len(parser.ids(r)) != esperados:
            raise SessaoPerdida(f"página {k}: vieram {len(parser.ids(r))} documentos, esperados {esperados}")
        return r


def meses(n):
    hoje = datetime.date.today()
    d = hoje.replace(day=1)
    for _ in range(n):
        ult = (d.replace(day=28) + datetime.timedelta(days=4)).replace(day=1) - datetime.timedelta(days=1)
        yield d, min(ult, hoje)
        d = (d - datetime.timedelta(days=1)).replace(day=1)


def coletar_mes(cjf, con, acervo, ini, fim, limite=None):
    chave = (acervo, "*", ini.strftime("%Y-%m"))
    if con.execute("SELECT 1 FROM progresso WHERE acervo=? AND orgao=? AND mes=?", chave).fetchone():
        return
    # a publicação sai com atraso: mês com menos de 60 dias ainda cresce, e por isso é refeito a cada rodada
    fechado = fim < datetime.date.today() - datetime.timedelta(days=60)
    pasta = banco.DADOS / "bruto" / acervo / chave[2]
    pasta.mkdir(parents=True, exist_ok=True)
    # ponytail: o CJF não filtra por órgão, então o mês vem inteiro e o parser descarta o que não é
    # previdenciário (cerca de dois terços no TRF3). Se o tempo de carga pesar, filtrar por texto no
    # campo Ementa/Decisão, depois de medir a perda de cobertura.
    total = cjf.pesquisar(acervo, ini, fim)
    paginas, novos = math.ceil(total / POR_PAGINA), 0
    for k in range(1, min(paginas, limite or paginas) + 1):
        arq = pasta / f"p{k:04}.xml.gz"
        if fechado and arq.exists():
            r = gzip.decompress(arq.read_bytes()).decode("utf-8")
        else:
            esperados = min(POR_PAGINA, total - (k - 1) * POR_PAGINA)
            for tentativa in range(3):
                try:
                    r = cjf.pagina(k, esperados)
                    break
                except SessaoPerdida as e:
                    print(f"    {e}. Refazendo a pesquisa.", flush=True)
                    if cjf.pesquisar(acervo, ini, fim) != total:
                        raise SystemExit(f"{chave}: o total mudou no meio da coleta, rode de novo")
            else:
                raise SystemExit(f"{chave}: página {k} não veio completa em 3 tentativas")
            arq.write_bytes(gzip.compress(r.encode("utf-8")))
        novos += banco.gravar(con, parser.extrair(r, acervo))          # LayoutMudou derruba a coleta
        if k % 20 == 0:
            print(f"    {chave[2]} {acervo}: página {k}/{paginas}", flush=True)
    if fechado and not limite and total:      # total zero pode ser índice do CJF atrasado: tenta de novo na próxima rodada
        con.execute("INSERT INTO progresso VALUES (?,?,?,?,?,?)",
                    (*chave, paginas, total, datetime.datetime.now().isoformat(timespec="seconds")))
        con.commit()
    print(f"  {chave[2]} {acervo:10} {total:>6} no CJF, {novos:>6} previdenciários novos", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--acervo", choices=list(ACERVOS), action="append")
    ap.add_argument("--meses", type=int, default=120)
    ap.add_argument("--paginas", type=int, help="teste: só as N primeiras páginas de cada mês, sem fechar o mês")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    con, cjf = banco.abrir(), Cjf()
    for ini, fim in meses(a.meses):                     # mês a mês, para a base servir desde o primeiro dia
        for acervo in a.acervo or ACERVOS:
            coletar_mes(cjf, con, acervo, ini, fim, a.paginas)
