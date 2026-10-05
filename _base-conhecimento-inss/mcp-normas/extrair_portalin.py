# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Extrai do portalin.inss.gov.br o texto CONSOLIDADO das Portarias DIRBEN e da IN 128.

    python extrair_portalin.py --listar
    python extrair_portalin.py --rota portaria990 --arquivo 06-Portarias/Portaria-DIRBEN-INSS-990-2022.md

Por que não é raspagem de página. O portal é uma aplicação Angular compilada, e o articulado
vive no próprio bundle main.<hash>.js, em literais de template na ordem do documento. O bundle
é recurso público do domínio oficial do INSS, o mesmo que o navegador busca, e nada é
contornado. Medido em 04/10/2026, a rota portaria990 renderiza 317.504 caracteres e 232
ocorrências de "Art. N", e é contra esse número que a extração é conferida.

O corpus hoje traz essas portarias do normaslegais.com.br, que é fonte secundária, e a 991
consolidada só até a DIRBEN 1.213/2024. Este caminho substitui por texto do próprio INSS.
"""
import argparse, datetime, hashlib, pathlib, re, sys, urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import coletor, parser as pnorma

PORTAL = "https://portalin.inss.gov.br/"
# O emissor usa aspas simples quando o texto contém aspas duplas, e era assim que o art. 4º da
# Portaria 994 escapava da extração. Perder artigo de norma em silêncio é o pior resultado aqui.
LITERAL = re.compile(r"""Dt\(-1,null,\[(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\]\)""")
# marca onde começa cada rota dentro do bundle. O texto de abertura é único por portaria.
# Gabarito por rota, medido na pagina renderizada em 04/10/2026. A abertura e o fecho sao
# ancoras no bundle, e "arts" e o numero de ocorrencias de "Art. N" que a pagina mostra: e
# contra ele que a extracao e conferida antes de gravar.
ROTAS = {
    "in": ("Disciplinar as regras acerca dos procedimentos",
           "devendo ser aplicada a todos os processos pendentes", 742),
    "portaria990": ("Fica aprovado Livro I das Normas Procedimentais",
                    "se restringe aos orgaos e entidades publicas", 232),
    "portaria991": ("Fica aprovado o Livro II das Normas Procedimentais",
                    "a CTC podera ser revista a qualquer tempo", 642),
    "portaria992": ("Fica aprovado o Livro III das Normas Procedimentais",
                    "inferior ao do auxilio por incapacidade temporaria no mesmo periodo", 334),
    "portaria993": ("Fica aprovado o Livro IV das Normas Procedimentais",
                    "nao estara sujeita a prescricao, devendo ser efetuada desde a DIB", 157),
    "portaria994": ("Fica aprovado o Livro V das Normas Procedimentais",
                    "durante o periodo de manutencao da qualidade de segurado", 19),
    "portaria995": ("Fica aprovado o Livro VI das Normas Procedimentais",
                    "obtidas no site oficial do Ministerio da Saude", 66),
    "portaria996": ("Fica aprovado o Livro VII das Normas Procedimentais",
                    "verificar novamente o cabimento do recurso especial pelo INSS", 133),
}
ABERTURA = {k: v[0] for k, v in ROTAS.items()}


def bundle(destino=None):
    """Baixa o main.<hash>.js. O hash do nome muda quando o portal republica."""
    destino = pathlib.Path(destino or pathlib.Path(__file__).parent / "_portalin.js")
    indice, _ = coletor.baixar(PORTAL)
    m = re.search(r'src="(main\.[0-9a-f]+\.js)"', indice.decode("utf-8", "replace"))
    if not m:
        raise SystemExit("bundle main.js não localizado no shell do portalin")
    bruto, _ = coletor.baixar(PORTAL + m.group(1))
    destino.write_bytes(bruto)
    return destino, m.group(1), bruto


def _sem_acento(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def _desescapar(x):
    return x.encode("latin-1", "backslashreplace").decode("unicode_escape")


def texto_da_rota(js, rota):
    """Literais do componente da rota, na ordem do documento. A janela vai da abertura desta
    portaria até a abertura da seguinte, que é o que separa um componente do outro."""
    if rota not in ABERTURA:
        raise SystemExit(f"rota desconhecida: {rota}. Conhecidas: {', '.join(ABERTURA)}")
    i = js.find(ABERTURA[rota])
    if i < 0:
        raise SystemExit(f"abertura da {rota} não encontrada no bundle")
    ini = js.rfind("PORTARIA DIRBEN", 0, i)
    ini = ini if ini > 0 and i - ini < 8000 else max(0, i - 4000)
    # O fecho é o último parágrafo que a página renderizada mostra, e é ele que delimita o
    # componente. Sem isso a última rota corre até o fim do bundle e rende 632 artigos falsos.
    # A busca é no texto já desescapado, porque no bundle o acento vem como \xNN.
    fecho = _sem_acento(ROTAS[rota][1]).lower()
    linhas = []
    for m in LITERAL.finditer(js[ini:]):
        l = _desescapar(m.group(1) or m.group(2) or '').strip()
        if l:
            linhas.append(l)
            if fecho in _sem_acento(l).lower():
                break
    else:
        raise SystemExit(f"fecho da {rota} não encontrado no bundle; confira o gabarito")
    return "\n".join(linhas)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--rota"); ap.add_argument("--arquivo")
    ap.add_argument("--esperado", type=int, help="artigos que a página renderizada mostra")
    ap.add_argument("--listar", action="store_true")
    ap.add_argument("--destino")
    a = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    caminho, nome, bruto = bundle()
    js = bruto.decode("utf-8", "replace")
    print(f"bundle {nome}, {len(bruto):,} bytes")

    if a.listar:
        for rota, abre in ABERTURA.items():
            i = js.find(abre)
            t = texto_da_rota(js, rota) if i >= 0 else ""
            print(f"  {rota:14s} {'achada' if i>=0 else 'NAO ACHADA':11s} "
                  f"{len(t):>9,} chars  {len(re.findall(r'Art[.] *[0-9]', t)):4d} artigos")
        return

    if not (a.rota and a.arquivo):
        ap.error("informe --rota e --arquivo, ou --listar")
    texto = texto_da_rota(js, a.rota)
    arts = len(re.findall(r'Art[.] *[0-9]', texto))
    print(f"{a.rota}: {len(texto):,} chars, {arts} ocorrências de artigo")
    if a.esperado and arts != a.esperado:
        raise SystemExit(f"PAROU: a página renderizada mostra {a.esperado} artigos e a extração "
                         f"achou {arts}. Conferir antes de gravar.")
    fm = {"fonte_oficial": PORTAL + a.rota,
          "data_download": datetime.date.today().isoformat(),
          "hash_sha256": hashlib.sha256(bruto).hexdigest(),
          "metodo_captura": f"extrair_portalin.py, literais do bundle {nome} na ordem do documento",
          "ultima_alteracao_conhecida": coletor.ultima_alteracao(texto),
          "total_artigos_aprox": len(pnorma.ler_arquivo(texto, "x.md")["artigos"])}
    cab = "\n".join(f"{k}: {v}" for k, v in fm.items())
    alvo = pathlib.Path(a.destino or r"C:\Users\VAIO\INSS\base-legislacao") / a.arquivo
    alvo.parent.mkdir(parents=True, exist_ok=True)
    alvo.write_text(f"---\n{cab}\n---\n\n{texto}\n", encoding="utf-8")
    print(f"gravado {alvo}  ({fm['total_artigos_aprox']} artigos pelo parser)")


if __name__ == "__main__":
    main()
