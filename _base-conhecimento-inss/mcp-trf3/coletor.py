"""Coletor da jurisprudência do TRF3 e das Turmas Recursais da 3ª Região, pela Jurisprudência
Unificada do CJF (https://jurisprudencia.cjf.jus.br/unificada/), que responde a cliente HTTP comum
e traz o inteiro teor no campo Decisão. O portal do próprio TRF3 barra coleta automatizada
(SONDA-2026-09-19.md) e não é tocado aqui.

Um worker, serial, 3 s entre requisições. Varre do mês mais recente para o mais antigo, grava a
resposta bruta comprimida antes de parsear e retoma de onde parou. Para no primeiro documento
que o parser não reconhecer.

    python coletor.py --meses 1 --paginas 3        # primeiro teste
    python coletor.py                              # dez anos do TRF3, depois dez anos das Recursais
    python coletor.py --reprocessar                # relê o bruto já baixado, sem rede
"""
import argparse, datetime, gzip, http.cookiejar, math, os, re, ssl, sys, time
import urllib.parse, urllib.request

import banco, parser

URL = "https://jurisprudencia.cjf.jus.br/unificada/index.xhtml"
# Os campos j_idtNN do formulário JSF são gerados pelo servidor e MUDAM a cada redeploy do CJF (em 21/09/2026
# o seletor de tribunal passou de j_idt51 a j_idt77 e as datas de j_idt43/45 a j_idt69/71). Por isso são
# lidos do próprio formulário a cada sessão, e só os nomes estáveis ficam fixos aqui.
TIPO_DATA, TABELA = "formulario:combo_tipo_data_input", "formulario:tabelaDocumentos"
RECURSAIS = {"formulario:trMarcado_input": "on", "formulario:tribuna_tr": "TR3"}
PAUSA, POR_PAGINA = 8, 50   # 3 s bastavam até 22/09/2026; com o CJF instável, é ritmo mais folgado
MINIMO_MES = 500           # nenhum mês do TRF3 medido tem menos que isso; abaixo, é índice incompleto
AJAX = {"javax.faces.partial.ajax": "true", "formulario": "formulario"}


class SessaoPerdida(Exception):
    pass


class MesFalhou(Exception):
    """O CJF não entregou o mês. Não é defeito do coletor, e o mês fica para a próxima rodada."""


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
                self.ultimo, self.ultima = time.monotonic(), txt
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

    def pesquisar(self, acervo, ini, fim, tentativa=0):
        """Abre sessão nova, liga a pesquisa avançada e pesquisa o período. Devolve o total."""
        self.nova()
        inicial = self.pedir()
        trib = re.search(r'name="(formulario:[^"]+)"[^>]*value="TRF3"', inicial)
        self.estado = {"formulario:ckbAvancada_input": "on"}
        self._alternar("ckbAvancada", self.estado)
        # as duas datas são os únicos campos j_idtNN_input do formulário avançado, na ordem início e fim
        datas = list(dict.fromkeys(re.findall(r'name="(formulario:j_idt\d+_input)"', self.ultima)))
        if not trib or len(datas) != 2:
            raise SystemExit(f"formulário do CJF sem o seletor de tribunal ou sem as duas datas: {datas}")
        if acervo == "recursais":                 # o seletor de região só existe no servidor depois deste passo
            self.estado["formulario:trMarcado_input"] = "on"
            self._alternar("trMarcado", self.estado)
            self.estado.update(RECURSAIS)
        else:
            self.estado[trib.group(1)] = "TRF3"
        r = self.pedir({**AJAX, **self.estado, "formulario:textoLivre": "",
                        datas[0]: ini.strftime("%d/%m/%Y"), datas[1]: fim.strftime("%d/%m/%Y"), TIPO_DATA: "DTDP",
                        "javax.faces.source": "formulario:actPesquisar", "javax.faces.partial.execute": "@all",
                        "javax.faces.partial.render": "formulario:resultado",
                        "formulario:actPesquisar": "formulario:actPesquisar", "javax.faces.ViewState": self.vs})
        m = re.search(r"\(Exibindo[^)]*?de\s+(\d+)\s*,", r)
        if not m and "Sessão expirada" in r and tentativa < 3:
            print("    CJF devolveu sessão expirada, abrindo outra em 60 s", flush=True)
            time.sleep(60)
            return self.pesquisar(acervo, ini, fim, tentativa + 1)
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
    paginas, novos, k, instavel = math.ceil(total / POR_PAGINA), 0, 0, False
    while k < min(paginas, limite or paginas):
        k += 1
        arq = pasta / f"p{k:04}.xml.gz"
        if fechado and arq.exists():
            r = gzip.decompress(arq.read_bytes()).decode("utf-8")
        else:
            esperados = min(POR_PAGINA, total - (k - 1) * POR_PAGINA)
            for tentativa in range(6):
                try:
                    r = cjf.pagina(k, esperados)
                    break
                except SessaoPerdida as e:
                    print(f"    {e}. Refazendo a pesquisa.", flush=True)
                    novo = cjf.pesquisar(acervo, ini, fim)
                    if novo == 0:                      # o CJF às vezes devolve lista vazia por instantes
                        time.sleep(30)
                        continue
                    # o total muda no meio da coleta, no mês aberto porque ele cresce e no fechado porque o
                    # CJF oscila. Segue com o total novo, e o mês que mudou não é dado por concluído, para
                    # ser refeito na próxima rodada e cobrir o que escorregou de página
                    instavel = instavel or novo != total
                    total, paginas = novo, math.ceil(novo / POR_PAGINA)
                    esperados = min(POR_PAGINA, total - (k - 1) * POR_PAGINA)
            else:
                for arq_ in pasta.glob("p*.xml.gz"):     # páginas podem ter escorregado, não servem de cache
                    arq_.unlink()
                raise MesFalhou(f"{chave}: página {k} não veio completa em 6 tentativas")
            arq.write_bytes(gzip.compress(r.encode("utf-8")))
        novos += banco.gravar(con, parser.extrair(r, acervo))          # LayoutMudou derruba a coleta
        if k % 20 == 0:
            print(f"    {chave[2]} {acervo}: página {k}/{paginas}", flush=True)
    if instavel:                              # páginas deslocadas não servem de cache na próxima rodada
        for arq in pasta.glob("p*.xml.gz"):
            arq.unlink()
        print(f"    {chave[2]} {acervo}: o total mudou durante a coleta, o mês será refeito", flush=True)
    # o CJF já devolveu mês com 2 acórdãos que tinha 10 mil, com o índice incompleto depois de um redeploy.
    # Mês só é dado por concluído com total plausível e confirmado por uma segunda pesquisa igual
    elif fechado and not limite and total >= MINIMO_MES and cjf.pesquisar(acervo, ini, fim) == total:
        con.execute("INSERT INTO progresso VALUES (?,?,?,?,?,?)",
                    (*chave, paginas, total, datetime.datetime.now().isoformat(timespec="seconds")))
        con.commit()
    print(f"  {chave[2]} {acervo:10} {total:>6} no CJF, {novos:>6} previdenciários novos", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--acervo", choices=["trf3", "recursais"], action="append")
    ap.add_argument("--meses", type=int, default=120)
    ap.add_argument("--paginas", type=int, help="teste: só as N primeiras páginas de cada mês, sem fechar o mês")
    ap.add_argument("--reprocessar", action="store_true",
                    help="relê as páginas brutas já baixadas e atualiza os campos de relator, sem ir ao CJF")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    con = banco.abrir()
    if a.reprocessar:
        n = 0
        for arq in sorted((banco.DADOS / "bruto").glob("*/*/p*.xml.gz")):
            docs = parser.extrair(gzip.decompress(arq.read_bytes()).decode("utf-8"), arq.parts[-3])
            banco.gravar(con, docs)                    # o que o parser passou a reconhecer entra agora
            for d in docs:
                n += con.execute("UPDATE documento SET relator=?, relator_titular=?, relator_acordao=? WHERE id=?",
                                 (d["relator"], d["relator_titular"], d["relator_acordao"], d["id"])).rowcount
        con.commit()
        raise SystemExit(f"{n} documentos atualizados")
    cjf = Cjf()
    # sentinela: o CJF já devolveu, depois de um redeploy em 21/09/2026, meses de 2024 com zero ou um terço
    # dos acórdãos, enquanto 2023 e 2025 vinham inteiros. Por isso confere o maior mês fechado de CADA ano; se
    # algum vier bem abaixo do gravado, o índice está incompleto e coletar agora gravaria meses pela metade.
    # Sai com código 3, e o supervisor espera meia hora.
    amostra = con.execute("""SELECT acervo, mes, max(documentos) FROM progresso
                             GROUP BY acervo, substr(mes, 1, 4)""").fetchall()
    for acervo_s, mes_s, gravado in ([] if a.paginas else amostra):
        ini = datetime.date.fromisoformat(mes_s + "-01")
        fim = (ini.replace(day=28) + datetime.timedelta(days=4)).replace(day=1) - datetime.timedelta(days=1)
        agora = cjf.pesquisar(acervo_s, ini, fim)
        if agora < 0.95 * gravado:
            print(f"  índice do CJF incompleto: {acervo_s} {mes_s} tinha {gravado} e agora tem {agora}, esperando",
                  flush=True)
            sys.exit(3)
    # o TRF3 inteiro antes das Recursais; dentro de cada acervo, do mês mais recente para o mais antigo
    for acervo in a.acervo or ["trf3", "recursais"]:
        for ini, fim in meses(a.meses):
            try:
                coletar_mes(cjf, con, acervo, ini, fim, a.paginas)
            except MesFalhou as e:                      # o CJF falhou neste mês, segue para o próximo
                print(f"  {e}. Fica para a próxima rodada.", flush=True)
                time.sleep(120)
