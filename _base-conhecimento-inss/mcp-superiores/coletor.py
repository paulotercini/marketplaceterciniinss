# /// script
# requires-python = ">=3.11"
# dependencies = ["pypdf>=4"]
# ///
"""Coleta de STF e STJ para o banco local. Só fontes oficiais abertas, uma requisição por vez.

    uv run coletor.py                       # todas as fontes, só o que falta
    uv run coletor.py --fonte stj_temas stf_temas
    uv run coletor.py --fonte djen --desde 2026-01-01

Fontes.
  stj_temas     dados abertos do STJ, precedentes qualificados (Temas.csv e Processos.csv)
  stf_temas     portal do STF, todostemas.asp e a tese de cada tema em verTeseTema.asp
  stf_acordaos  PDF de 'Inteiro teor do acórdão' do leading case de cada tema previdenciário e das ADI, ADC e
                ADPF citadas nas skills do plugin
  espelhos      dados abertos do STJ, espelhos de acórdãos da 1ª Seção, 1ª e 2ª Turmas e Corte Especial
  integras      dados abertos do STJ, íntegras de 2021 a 2025 (em 2026 o STJ publica o texto de poucas)
  djen          Diário de Justiça Eletrônico Nacional do CNJ, STJ com o INSS como parte, de 2026 em diante
  jt            Jurisprudência em Teses, a partir do texto que o navegador gravou em bruto/jt/<edição>.txt
"""
import argparse, datetime, http.client, io, json, pathlib, re, sys, time, urllib.error, urllib.parse, urllib.request, zipfile

import banco, parser

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "Accept-Language": "pt-BR"}
CKAN = "https://dadosabertos.web.stj.jus.br/api/3/action/package_show?id="
STF = parser.STF
SKILLS = pathlib.Path(__file__).resolve().parent.parent / "skills"
PAUSA = 2


def log(*a):
    print(datetime.datetime.now().strftime("%H:%M:%S"), *a, flush=True)


def baixar(url, tentativas=6, dados=None, cab=None):
    """GET (ou POST com dados) com espera crescente. A API do DJEN devolve 500 em rajadas e volta sozinha."""
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, data=dados, headers={**UA, **(cab or {})})
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read()
        except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.IncompleteRead) as e:
            if isinstance(e, urllib.error.HTTPError) and e.code in (403, 404):
                raise
            if i == tentativas - 1:
                raise
            log("  repetindo", url[:90], e)
            time.sleep(10 * (i + 1))


def agora():
    return datetime.datetime.now().isoformat(timespec="seconds")


# --- tabela de assuntos do CNJ -----------------------------------------------------------------

SGT = "https://www.cnj.jus.br/sgt/sgt_ws.php"
RAIZES = (195, 12734)        # Direito Previdenciário; o ramo do Benefício Assistencial (Art. 203, V, CF)


def _filhos(cod):
    corpo = (f'<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" '
             f'xmlns:sgt="{SGT}"><soapenv:Body><sgt:getArrayFilhosItemPublicoWS><seqItem>{cod}</seqItem>'
             f'<tipoItem>A</tipoItem></sgt:getArrayFilhosItemPublicoWS></soapenv:Body></soapenv:Envelope>')
    t = baixar(SGT, dados=corpo.encode(), cab={"Content-Type": "text/xml; charset=utf-8"}).decode("utf-8", "replace")
    # folha vem com <temFilhos></temFilhos> vazio, então cada elemento é lido no seu próprio bloco
    return [(int(a), b == "1") for a, b in re.findall(
        r"<seq_elemento>(\d+)</seq_elemento>(?:(?!</ns1:ArvoreGenerica>).)*?<temFilhos>(\d?)</temFilhos>", t, re.S)]


def assuntos_previdenciarios():
    """Códigos da tabela de assuntos do CNJ sob o Direito Previdenciário e o Benefício Assistencial. Os
    metadados antigos do STJ trazem só o código-folha, e sem esta árvore o filtro perderia 2021 a 2025."""
    cache = banco.DADOS / "assuntos-previdenciarios.json"
    if cache.exists() and time.time() - cache.stat().st_mtime < 30 * 86400:
        return set(json.loads(cache.read_text()))
    vistos, fila = set(RAIZES), list(RAIZES)
    while fila:
        for c, tem in _filhos(fila.pop()):
            if c not in vistos:
                vistos.add(c)
                if tem:
                    fila.append(c)
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(sorted(vistos)))
    log(f"tabela de assuntos do CNJ, {len(vistos)} códigos previdenciários e assistenciais")
    return vistos


# --- fontes ------------------------------------------------------------------------------------

def recursos(pacote):
    return json.loads(baixar(CKAN + pacote))["result"]["resources"]


def stj_temas(con, a):
    rs = {r["name"].lower(): r["url"] for r in recursos("precedentes-qualificados")}
    temas = baixar(rs["temas.csv"]).decode("utf-8-sig")
    procs = baixar(rs["processos.csv"]).decode("utf-8-sig")
    linhas = parser.stj_temas(temas, procs, assuntos_previdenciarios(), agora())
    banco.gravar(con, "tema", linhas, substituir=True)
    banco.marcar(con, "stj_temas", datetime.date.today().isoformat(), len(linhas))
    log(f"STJ, {len(linhas)} precedentes qualificados, {sum(l['previdenciario'] for l in linhas)} previdenciários")


def stf_temas(con, a):
    pagina = parser.decodificar(baixar(f"{STF}/jurisprudenciaRepercussao/todostemas.asp"))
    itens = parser.stf_lista_temas(pagina)
    if len(itens) < 1000:
        raise SystemExit(f"todostemas.asp trouxe {len(itens)} temas, o layout pode ter mudado")
    antes = {r["numero"]: (r["situacao"], r["tese"]) for r in con.execute(
        "SELECT numero, situacao, tese FROM tema WHERE tribunal = 'STF'")}
    novos = 0
    for i, it in enumerate(itens[: a.limite or None]):
        sit, tese = antes.get(it["numero"], (None, None))
        if sit != it["situacao"] or tese is None and it["data_julgamento"]:
            # a tese só existe depois do julgamento de mérito; tema sem mérito julgado não gasta requisição
            tese = parser.stf_tese(parser.decodificar(baixar(
                f"{STF}/jurisprudenciaRepercussao/verTeseTema.asp?numTema={it['numero']}"))) if it["data_julgamento"] else None
            time.sleep(PAUSA)
        novos += banco.gravar(con, "tema", [parser.stf_tema(it, tese, agora())], substituir=True)
        if i % 100 == 0:
            log(f"  STF tema {it['numero']}, {i}/{len(itens)}")
    banco.marcar(con, "stf_temas", datetime.date.today().isoformat(), len(itens))
    log(f"STF, {len(itens)} temas de repercussão geral")


def _acoes_das_skills():
    achados = set()
    for f in SKILLS.rglob("*.md"):
        for cl, n in re.findall(r"\b(ADI|ADC|ADPF)\s*n?º?\s*(\d[\d.]{1,6}\d)\b", f.read_text("utf-8", "replace")):
            achados.add(f"{cl} {n.replace('.', '')}")
    return sorted(achados)


def _incidente(classe, numero):
    req = urllib.request.Request(f"{STF}/processos/listarProcessos.asp?classe={classe}&numeroProcesso={numero}", headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        m = re.search(r"incidente=(\d+)", r.geturl())
    return m[1] if m else None


def stf_acordaos(con, a):
    import pypdf
    alvos = [(r["leading_case"], re.search(r"incidente=(\d+)", r["link_oficial"] or "")[1], f"RG-{r['numero']}")
             for r in con.execute("SELECT numero, leading_case, link_oficial FROM tema WHERE tribunal = 'STF' "
                                  "AND previdenciario = 1 AND tese IS NOT NULL AND leading_case IS NOT NULL")
             if re.search(r"incidente=(\d+)", r["link_oficial"] or "")]
    alvos += [(acao, None, None) for acao in _acoes_das_skills()]
    feito = banco.feito(con, "stf_acordaos")
    for proc, inc, tema in alvos[: a.limite or None]:
        if proc in feito:
            continue
        inc = inc or _incidente(*proc.split())
        if not inc:
            log("  sem incidente", proc); banco.marcar(con, "stf_acordaos", proc, 0); continue
        aba = parser.decodificar(baixar(f"{STF}/processos/abaAndamentos.asp?incidente={inc}&imprimir=",
                                        cab={"Referer": f"{STF}/processos/detalhe.asp?incidente={inc}"}))
        docs = []
        for peca in parser.stf_pecas_acordao(aba):
            time.sleep(PAUSA)
            try:
                pdf = pypdf.PdfReader(io.BytesIO(baixar(f"{STF}/processos/downloadPeca.asp?id={peca}&ext=.pdf")))
                texto = "\n".join(p.extract_text() or "" for p in pdf.pages)
            except pypdf.errors.PyPdfError as e:          # peça vazia ou corrompida no portal não para o processo
                log("  peça ilegível", proc, peca, repr(e)); continue
            if len(texto.strip()) > 200:                       # PDF de imagem não vira texto e fica de fora
                docs.append(parser.stf_acordao(proc, peca, texto, tema, agora()))
        banco.gravar(con, "documento", docs)
        banco.marcar(con, "stf_acordaos", proc, len(docs))
        log(f"  {proc}, {len(docs)} acórdãos")
        time.sleep(PAUSA)


ESPELHOS = ("primeira-secao", "primeira-turma", "segunda-turma", "corte-especial")


def espelhos(con, a):
    feito, n = banco.feito(con, "espelhos"), 0
    for org in ESPELHOS:
        for r in recursos(f"espelhos-de-acordaos-{org}"):
            chave = f"{org}/{r['name']}"
            if r["format"] not in ("ZIP", "JSON") or "dicionario" in r["name"].lower() or chave in feito:
                continue
            if a.limite and n >= a.limite:
                return
            n += 1
            b = baixar(r["url"])
            if r["format"] == "ZIP":
                z = zipfile.ZipFile(io.BytesIO(b))
                itens = [x for n in z.namelist() if n.endswith(".json") for x in json.loads(z.read(n))]
            else:
                itens = json.loads(b)
            docs = parser.stj_espelhos(itens, agora())
            banco.gravar(con, "documento", docs)
            banco.marcar(con, "espelhos", chave, len(docs))
            log(f"  espelhos {chave}, {len(docs)} previdenciários de {len(itens)}")


def integras(con, a):
    prev = assuntos_previdenciarios()
    dias = {}
    for r in recursos("integras-de-decisoes-terminativas-e-acordaos-do-diario-da-justica"):
        if m := re.search(r"(\d{8})", r["name"]):
            dias.setdefault(m[1], {})["meta" if r["format"] == "JSON" else "zip"] = r["url"]
    feito = banco.feito(con, "integras")
    desde, ate = (a.desde or "2021-01-01").replace("-", ""), (a.ate or "2025-12-31").replace("-", "")
    alvo = [d for d in sorted(dias) if desde <= d <= ate and d not in feito and len(dias[d]) == 2]
    for d in alvo[: a.limite or None]:
        meta = json.loads(baixar(dias[d]["meta"]))
        z = zipfile.ZipFile(io.BytesIO(baixar(dias[d]["zip"])))
        textos = {n.rsplit("/", 1)[-1].rsplit(".", 1)[0]: z.read(n).decode("utf-8", "replace") for n in z.namelist()}
        docs, total, sem = parser.stj_integras(meta, textos, prev, agora())
        banco.gravar(con, "documento", docs)
        banco.marcar(con, "integras", d, len(docs))
        banco.marcar(con, "integras_sem_texto", d, sem)
        log(f"  íntegras {d}, {total} previdenciárias, {sem} sem texto")


DJEN = "https://comunicaapi.pje.jus.br/api/v1/comunicacao?"


def djen(con, a):
    feito = banco.feito(con, "djen")
    dia = datetime.date.fromisoformat(a.desde or "2026-01-01")
    ultimo = datetime.date.fromisoformat(a.ate) if a.ate else datetime.date.today() - datetime.timedelta(days=1)
    n = 0
    while dia <= ultimo and (not a.limite or n < a.limite):
        if dia.weekday() < 5 and dia.isoformat() not in feito:
            itens, pagina = [], 1
            while True:
                q = urllib.parse.urlencode({"siglaTribunal": "STJ", "nomeParte": "INSTITUTO NACIONAL DO SEGURO SOCIAL",
                                            "dataDisponibilizacaoInicio": dia.isoformat(),
                                            "dataDisponibilizacaoFim": dia.isoformat(),
                                            "itensPorPagina": 100, "pagina": pagina})
                r = json.loads(baixar(DJEN + q, tentativas=8))
                itens += r["items"]
                time.sleep(PAUSA)
                if len(r["items"]) < 100:
                    break
                pagina += 1
            docs = parser.stj_djen(itens, agora())
            banco.gravar(con, "documento", docs)
            banco.marcar(con, "djen", dia.isoformat(), len(docs))
            log(f"  DJEN {dia}, {len(docs)} de {len(itens)} publicações")
            n += 1
        dia += datetime.timedelta(days=1)


def jt(con, a):
    pasta = banco.DADOS / "bruto" / "jt"
    for f in sorted(pasta.glob("*.txt")):
        edicao, _, titulo = f.stem.partition(" ")
        linhas = parser.stj_jt(edicao, titulo.strip(" -"), f.read_text("utf-8"), agora())
        banco.gravar(con, "tema", linhas, substituir=True)
        log(f"  Jurisprudência em Teses, edição {edicao}, {len(linhas)} teses")


FONTES = {"stj_temas": stj_temas, "stf_temas": stf_temas, "stf_acordaos": stf_acordaos, "espelhos": espelhos,
          "integras": integras, "djen": djen, "jt": jt}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonte", nargs="*", choices=FONTES, default=list(FONTES))
    ap.add_argument("--desde"), ap.add_argument("--ate")
    ap.add_argument("--limite", type=int, help="para teste, no máximo N itens por fonte")
    a = ap.parse_args()
    con = banco.abrir()
    for f in a.fonte:
        log("==", f)
        try:
            FONTES[f](con, a)
        except Exception as e:                 # uma fonte fora do ar não derruba as outras
            log(f"!! {f} falhou: {e!r}")
    log("fim")


if __name__ == "__main__":
    sys.exit(main())
