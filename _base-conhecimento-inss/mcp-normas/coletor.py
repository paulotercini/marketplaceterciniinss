# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Coleta norma da fonte oficial e grava no corpus, no formato que o parser.py já lê.

    python coletor.py --fase fase1.json            baixa e grava
    python coletor.py --fase fase1.json --conferir  só relata, sem gravar
    python coletor.py --url <url> --arquivo <rel>   uma norma avulsa

MEDIDO EM 04/10/2026, e corrige a SONDA-2026-09-20.md. O Planalto e o in.gov.br NÃO exigem
navegador. O que eles recusam é o User-Agent de cliente HTTP: com o UA de navegador abaixo,
`planalto.gov.br` respondeu 200 em 0,55 s e `in.gov.br` em 0,24 s, nos mesmos endereços que em
20/09 davam timeout. Nenhuma proteção é contornada, porque é o mesmo recurso público que o
navegador busca e não há desafio, captcha nem sessão.

O HTML do Planalto vem em ISO-8859-1 sem charset declarado, com um <p> por dispositivo, com
entidades e com <del> no texto riscado. A conversão vira uma linha por <p>, que é a convenção
que o corpus de 31/05/2026 já usa.
"""
import argparse, datetime, hashlib, html, json, pathlib, re, sys, time, urllib.error, urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import banco, parser as pnorma

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/140.0.0.0 Safari/537.36")
CABECALHOS = {"User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}
PAUSA = 1.0          # entre requisições, para não martelar a fonte
PAUSA_DOU = 5.0      # o in.gov.br devolve 403 em rajada; medido em 04/10/2026
TENTATIVAS = 3


class NaoBaixou(Exception):
    pass


def baixar(url, tentativas=TENTATIVAS):
    """Bytes crus e o content-type. Repete com espera crescente antes de desistir."""
    erro = None
    for i in range(tentativas):
        try:
            req = urllib.request.Request(url, headers=CABECALHOS)
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read(), r.headers.get("Content-Type", "")
        except urllib.error.HTTPError as e:
            if e.code in (403, 429, 500, 502, 503) and i < tentativas - 1:
                time.sleep(8 * (i + 1))      # limite de taxa, não recusa definitiva
                erro = f"http {e.code}"
                continue
            raise NaoBaixou(f"http {e.code}") from None
        except Exception as e:
            erro = f"{type(e).__name__}: {e}"
            time.sleep(2 ** i)
    raise NaoBaixou(erro)


def _decodificar(bruto, content_type=""):
    m = re.search(rb'charset=["\']?([\w-]+)', bruto[:4000], re.I)
    for cod in ([m.group(1).decode("ascii", "ignore")] if m else []) + \
               (re.findall(r'charset=([\w-]+)', content_type, re.I)) + ["utf-8", "latin-1"]:
        try:
            return bruto.decode(cod)
        except (UnicodeDecodeError, LookupError):
            continue
    return bruto.decode("latin-1", "replace")


def _fatiar(t):
    """No in.gov.br o ato e uma fracao da pagina, e o resto e menu e rodape. Sem recortar,
    entram 160 linhas de "Ir para o conteudo" e "REDES SOCIAIS" no corpus.

    Dois layouts do DOU, medidos em 04/10/2026. O novo marca cada dispositivo com
    p.dou-paragraph e o antigo com p.corpo. Em ambos o identifica e a ementa ficam fora, e
    entram antes. Recortar a div.texto-dou por profundidade NAO funciona, porque a marcacao
    tem div sem fechamento e o contador leva a pagina inteira junto."""
    alvo = "dou-paragraph" if "dou-paragraph" in t else ("corpo" if re.search(r"class=['\"][^'\"]*corpo", t) else None)
    if not alvo:
        return t
    pedacos = []
    for classe in ("identifica", "ementa"):
        m = re.search(r'(?is)<[^>]*class="[^"]*' + classe + r'[^"]*"[^>]*>(.*?)</(?:p|div|span|h\d)>', t)
        if m:
            pedacos.append(m.group(1))
    pedacos += re.findall(r"(?is)<p[^>]*class=['\"][^'\"]*" + alvo + r"[^'\"]*['\"][^>]*>(.*?)</p>", t)
    m = re.search(r'(?is)<p[^>]*class="[^"]*assina[^"]*"[^>]*>(.*?)</p>', t)
    if m:
        pedacos.append(m.group(1))
    return chr(10).join("<p>" + x + "</p>" for x in pedacos) if pedacos else t

def para_texto(bruto, content_type=""):
    """HTML -> uma linha por parágrafo, que é como o corpus grava o dispositivo."""
    t = _fatiar(_decodificar(bruto, content_type))
    t = re.sub(r'(?is)<(script|style|noscript)\b.*?</\1>', " ", t)
    t = re.sub(r'(?is)<!--.*?-->', " ", t)
    t = re.sub(r'(?i)<br\s*/?>', "\n", t)
    t = re.sub(r'(?i)</(p|div|tr|li|h[1-6]|table)>', "\n", t)
    t = re.sub(r'(?i)</t[dh]>', " | ", t)
    t = re.sub(r'<[^>]+>', "", t)
    t = html.unescape(t).replace(" ", " ").replace("\r", "")
    linhas = [re.sub(r'[ \t]+', " ", l).strip() for l in t.split("\n")]
    fora, vazias = [], 0
    for l in linhas:
        if not l:
            vazias += 1
            continue
        if vazias and fora:
            fora.append("")
        vazias = 0
        fora.append(l)
    return "\n".join(fora).strip() + "\n"


def ultima_alteracao(texto):
    """Ano mais recente citado em marcador de alteração, para o frontmatter."""
    anos = [a for m in pnorma.RE_MARCADOR.finditer(texto) if (a := pnorma._ano(m.group(2)))]
    if not anos:
        return "não identificada (sem marcador de alteração no texto)"
    maior = max(anos)
    exemplo = next((pnorma._limpo(m.group(0)) for m in pnorma.RE_MARCADOR.finditer(texto)
                    if pnorma._ano(m.group(2)) == maior), "")
    return f"{maior} (ex.: {exemplo})"


def montar(norma, bruto, content_type, hoje=None):
    """Frontmatter no padrão do corpus mais o texto. Sem fonte, data e hash o arquivo fica
    fora do banco, então os três são obrigatórios aqui."""
    corpo = para_texto(bruto, content_type)
    fm = {
        "fonte_oficial": norma["url"],
        "data_download": (hoje or datetime.date.today()).isoformat(),
        "hash_sha256": hashlib.sha256(bruto).hexdigest(),
        "metodo_captura": "coletor.py, HTTP com User-Agent de navegador",
        "ultima_alteracao_conhecida": ultima_alteracao(corpo),
        "total_artigos_aprox": len(pnorma.ler_arquivo(corpo, "x.md")["artigos"]),
    }
    cab = "\n".join(f"{k}: {v}" for k, v in fm.items())
    return f"---\n{cab}\n---\n\n# {norma['norma']}\n\n{corpo}", fm


def coletar(normas, conferir=False, destino=None):
    destino = pathlib.Path(destino or banco.CORPUS)
    ok, falhas = [], []
    for n in normas:
        rotulo = n.get("id") or n["norma"]
        if not n.get("url"):
            falhas.append((rotulo, "sem URL na planilha"))
            continue
        if not n.get("arquivo"):
            falhas.append((rotulo, "sem arquivo sugerido na planilha"))
            continue
        try:
            bruto, ct = baixar(n["url"])
            texto, fm = montar(n, bruto, ct)
        except NaoBaixou as e:
            falhas.append((rotulo, str(e)))
            continue
        except Exception as e:
            falhas.append((rotulo, f"conversão: {type(e).__name__}: {e}"))
            continue
        arts = fm["total_artigos_aprox"]
        if arts == 0:
            falhas.append((rotulo, f"zero artigo extraído de {len(bruto)} bytes"))
            continue
        alvo = destino / n["arquivo"]
        if not conferir:
            alvo.parent.mkdir(parents=True, exist_ok=True)
            alvo.write_text(texto, encoding="utf-8")
        ok.append((rotulo, arts, len(bruto), n["arquivo"]))
        print(f"  {'(conferindo) ' if conferir else ''}{rotulo:34s} {arts:5d} artigos  "
              f"{len(bruto):>9,} bytes  {n['arquivo']}", flush=True)
        time.sleep(PAUSA_DOU if "in.gov.br" in n["url"] else PAUSA)
    return ok, falhas


def linhas_identidade(normas, ok):
    """Linhas prontas para colar em identidade.py, uma por arquivo coletado."""
    feito = {o[0] for o in ok}
    fora = []
    for n in normas:
        if (n.get("id") or n["norma"]) not in feito:
            continue
        nome = pathlib.Path(n["arquivo"]).name
        titulo = str(n["norma"]).replace('"', "'")
        fora.append(f'    "{nome}": (\n        "{n["id"]}", "{n["tipo"]}", '
                    f'"{(n.get("numero") or "")}", {n.get("ano") or 0},\n        "{titulo}"),')
    return fora


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--fase", help="json com norma, url, id, tipo e arquivo")
    ap.add_argument("--url"); ap.add_argument("--arquivo"); ap.add_argument("--id", default="avulsa")
    ap.add_argument("--conferir", action="store_true")
    ap.add_argument("--destino")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    if a.fase:
        normas = json.load(open(a.fase, encoding="utf-8"))
    elif a.url:
        normas = [{"norma": a.id, "url": a.url, "arquivo": a.arquivo, "id": a.id, "tipo": "outro"}]
    else:
        ap.error("informe --fase ou --url")
    print(f"corpus: {a.destino or banco.CORPUS}\n{len(normas)} normas\n")
    ok, falhas = coletar(normas, a.conferir, a.destino)
    print(f"\ncoletadas {len(ok)}, falharam {len(falhas)}")
    for r, m in falhas:
        print(f"  FALHOU  {r:34s} {m}")
    if ok and not a.conferir and a.fase:
        saida = pathlib.Path(a.fase).with_suffix(".identidade.txt")
        saida.write_text("\n".join(linhas_identidade(normas, ok)), encoding="utf-8")
        print(f"\nlinhas para identidade.py em {saida}")


if __name__ == "__main__":
    main()
