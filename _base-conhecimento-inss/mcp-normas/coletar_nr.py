# /// script
# requires-python = ">=3.11"
# dependencies = ["pymupdf"]
# ///
"""Coleta as Normas Regulamentadoras do MTE, que não são articuladas e vivem em PDF.

    python coletar_nr.py --conferir
    python coletar_nr.py --nr 15 16 7

A NR não tem "Art. N", tem item numerado, 15.1, 15.1.1, e por isso entra no corpus como
trecho buscável, igual aos Anexos do Decreto 3.048. Medido em 04/10/2026, a planilha aponta
para todas a MESMA página, que é o índice das NR vigentes, com 15 KB e nenhum texto de norma.
A página de cada NR também é capa, e o texto está em PDF. Daí este coletor próprio.

Regra de escolha do arquivo, para não misturar o vigente com o histórico que a página guarda.
Entra o `nr-<N>-atualizada-<ano>.pdf` de maior ano, mais todos os `nr-<N>-anexo-*.pdf`. Fica
de fora portaria antiga, ata de reunião e texto de consulta pública.
"""
import argparse, datetime, hashlib, pathlib, re, sys, urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import banco, coletor

INDICE = "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-partitaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes"
# palavra que tem de aparecer no texto montado, senão o PDF veio errado ou vazio
GUARDA = {1: "gerenciamento de riscos", 4: "sesmt", 6: "proteção individual",
          7: "pcmso", 9: "agentes físicos", 10: "eletricidade", 15: "insalubres",
          16: "periculosidade", 32: "serviços de saúde"}
MINIMO = 8000


def links_das_nr(html):
    mapa = {}
    for h, txt in re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S):
        m = re.match(r'\s*NR[\s-]*(\d+)\b', re.sub(r'<[^>]+>|\s+', ' ', txt).strip(), re.I)
        if m:
            mapa.setdefault(int(m.group(1)), h)
    return mapa


def pdfs_da_nr(html, base, n):
    """O texto vigente e os anexos, descartando portaria antiga e ata de reunião."""
    todos = list(dict.fromkeys(re.findall(r'href="([^"]+\.pdf[^"]*)"', html, re.I)))
    todos = [urllib.parse.urljoin(base, u) for u in todos]
    def nome(u):
        return urllib.parse.unquote(u.rsplit("/", 1)[-1]).lower()
    principais = []
    for u in todos:
        m = re.match(rf'nr-?0?{n}-atualizada-(\d{{4}})', nome(u))
        if m:
            principais.append((int(m.group(1)), u))
    anexos = [u for u in todos if re.match(rf'nr-?0?{n}-anexo', nome(u))]
    escolhido = max(principais)[1] if principais else None
    return escolhido, sorted(anexos, key=nome)


def texto_do_pdf(bruto):
    import pymupdf
    with pymupdf.open(stream=bruto, filetype="pdf") as doc:
        return "\n".join(p.get_text("text") for p in doc)


def coletar(ns, conferir=False, destino=None):
    destino = pathlib.Path(destino or banco.CORPUS)
    indice, _ = coletor.baixar(INDICE)
    mapa = links_das_nr(indice.decode("utf-8", "replace"))
    ok, falhas = [], []
    for n in ns:
        if n not in mapa:
            falhas.append((f"NR-{n}", "não listada no índice do MTE")); continue
        pagina, _ = coletor.baixar(mapa[n])
        principal, anexos = pdfs_da_nr(pagina.decode("utf-8", "replace"), mapa[n], n)
        if not principal:
            falhas.append((f"NR-{n}", "sem PDF 'nr-N-atualizada-ANO' na página")); continue
        partes, bruto_total = [], b""
        for rotulo, url in [("texto", principal)] + [(f"anexo {i}", u) for i, u in enumerate(anexos, 1)]:
            try:
                b, _ = coletor.baixar(url)
            except coletor.NaoBaixou as e:
                falhas.append((f"NR-{n}", f"{rotulo}: {e}")); b = None
            if not b:
                continue
            bruto_total += b
            partes.append(f"<!-- {rotulo}: {url.rsplit('/', 1)[-1]} -->\n" + texto_do_pdf(b))
        texto = "\n\n".join(partes)
        guarda = GUARDA.get(n)
        if len(texto) < MINIMO:
            falhas.append((f"NR-{n}", f"só {len(texto)} chars, abaixo do mínimo")); continue
        if guarda and guarda not in texto.lower():
            falhas.append((f"NR-{n}", f"texto sem a palavra-guarda '{guarda}'")); continue
        fm = {"fonte_oficial": mapa[n],
              "data_download": datetime.date.today().isoformat(),
              "hash_sha256": hashlib.sha256(bruto_total).hexdigest(),
              "metodo_captura": f"coletar_nr.py, {1 + len(anexos)} PDF do portal do MTE",
              "ultima_alteracao_conhecida": re.search(r'atualizada-(\d{4})', principal).group(0),
              "total_artigos_aprox": 0}
        alvo = destino / f"08-Normas-Regulamentadoras/NR-{n}.md"
        if not conferir:
            alvo.parent.mkdir(parents=True, exist_ok=True)
            alvo.write_text("---\n" + "\n".join(f"{k}: {v}" for k, v in fm.items())
                            + f"\n---\n\n# Norma Regulamentadora NR-{n}\n\n{texto}\n", encoding="utf-8")
        ok.append((n, len(texto), 1 + len(anexos)))
        print(f"  NR-{n:<3d} {len(texto):>8,} chars  {1 + len(anexos):2d} PDF  "
              f"{principal.rsplit('/', 1)[-1][:46]}", flush=True)
    return ok, falhas


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--nr", nargs="*", type=int, default=[1, 4, 6, 7, 9, 10, 15, 16, 32])
    ap.add_argument("--conferir", action="store_true")
    ap.add_argument("--destino")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    ok, falhas = coletar(a.nr, a.conferir, a.destino)
    print(f"\ncoletadas {len(ok)}, falharam {len(falhas)}")
    for r, m in falhas:
        print(f"  FALHOU  {r:8s} {m}")


if __name__ == "__main__":
    main()
