#!/usr/bin/env python3
"""Monta crm/fase2/app.html (e docs/crm/index.html) a partir de crm/fase2/src/.

    python3 crm/fase2/build_app.py             # monta app.html e a cópia publicada
    python3 crm/fase2/build_app.py --conferir  # falha se app.html difere da montagem
    python3 crm/fase2/build_app.py --absorver  # reparte em src/ um app.html editado direto

A montagem é a concatenação, byte a byte, dos arquivos de src/modulos.txt.
--absorver recorta o app.html pela primeira linha de cada módulo (âncora), na ordem.
"""
import re, sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
APP = RAIZ / "crm/fase2/app.html"
PUB = RAIZ / "docs/crm/index.html"
SRC = RAIZ / "crm/fase2/src"
LISTA = SRC / "modulos.txt"


def modulos():
    return [SRC / l for l in LISTA.read_text().split() if l]


def montar():
    return b"".join(m.read_bytes() for m in modulos())


def recortar(linhas, ancoras):
    """Índices de início de cada âncora, procurados em ordem; o primeiro é 0."""
    cortes, i = [0], 1
    for a in ancoras[1:]:
        while i < len(linhas) and linhas[i] != a:
            i += 1
        if i == len(linhas):
            sys.exit(f"âncora não encontrada no app.html: {a[:80]!r}")
        cortes.append(i)
        i += 1
    return cortes


def absorver():
    mods = modulos()
    linhas = APP.read_bytes().splitlines(keepends=True)
    ancoras = [m.read_bytes().splitlines(keepends=True)[0] for m in mods]
    cortes = recortar(linhas, ancoras) + [len(linhas)]
    for m, a, b in zip(mods, cortes, cortes[1:]):
        m.write_bytes(b"".join(linhas[a:b]))


AREAS = [("whatsapp", rb"whatsapp|\bzap"), ("pericias", rb"per[i\xc3\xad]+cia"),
         ("pre-caso", rb"pre_?caso|pr\xc3\xa9-caso|precaso"), ("agenda", rb"agenda"),
         ("prazos", rb"prazo"), ("casos", rb"\bcaso")]


def area(bloco, total):
    """Área com maior fatia das próprias ocorrências no bloco (corrige palavras onipresentes)."""
    b = bloco.lower()
    fatia = [(len(re.findall(p, b)) / max(total[n], 1), n) for n, p in AREAS]
    f, nome = max(fatia)
    return nome if f > 0 else "geral"


def dividir(alvo=1200):
    """Divisão inicial: html/css em blocos fixos, script principal cortado entre funções de topo."""
    linhas = APP.read_bytes().splitlines(keepends=True)
    marcos = [("<style>\n", "css/base.css"), ('<style id="tema-v10">\n', "css/tema-v10.css"),
              ("<body>\n", "html/corpo.html")]
    ini_script = max(i for i, l in enumerate(linhas) if l == b"<script>\n")
    fim_script = max(i for i, l in enumerate(linhas) if l.startswith(b"</script>"))
    cortes = [(0, "html/cabeca.html")]
    for txt, nome in marcos:
        cortes.append((linhas.index(txt.encode()), nome))
    # o <script> curto entre os dois styles fica com o fim do base.css
    cortes.append((ini_script, "js/00-inicio.js"))
    conta = Counter(linhas)
    i, n = ini_script + 1, 1
    ultimo = ini_script
    while i < fim_script:
        # começo de bloco de topo: comentário ou declaração na coluna 0, logo após "}" ou linha vazia
        if (i - ultimo >= alvo and re.match(rb"(// |(async )?function |const )", linhas[i])
                and linhas[i - 1].rstrip() in (b"", b"}", b"};") and conta[linhas[i]] == 1):
            cortes.append((i, None)); ultimo = i
        i += 1
    cortes.append((fim_script, "html/fim.html"))
    SRC.mkdir(exist_ok=True)
    tudo = b"".join(linhas).lower()
    total = {n: len(re.findall(p, tudo)) for n, p in AREAS}
    nomes, limites = [], [c[0] for c in cortes] + [len(linhas)]
    for k, (ini, nome) in enumerate(cortes):
        bloco = b"".join(linhas[ini:limites[k + 1]])
        if nome is None:
            nome = f"js/{n:02d}-{area(bloco, total)}.js"; n += 1
        (SRC / nome).parent.mkdir(parents=True, exist_ok=True)
        (SRC / nome).write_bytes(bloco)
        nomes.append(nome)
    ancoras = [b"".join(linhas[c[0]:c[0] + 1]) for c in cortes]
    assert len(set(ancoras[1:])) == len(ancoras) - 1, "âncora repetida"
    LISTA.write_text("\n".join(nomes) + "\n")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else ""
    if arg == "--dividir":
        dividir()
    elif arg == "--absorver":
        absorver()
    elif arg == "--conferir":
        dados = montar()
        for f in (APP, PUB):
            if f.read_bytes() != dados:
                sys.exit(f"{f.relative_to(RAIZ)} difere de crm/fase2/src/. Edite em src/ e rode: python3 crm/fase2/build_app.py")
        # nome global repetido sobrescreve o anterior sem aviso
        nomes = re.findall(rb"^(?:async )?function ([A-Za-z0-9_$]+)", dados, re.M)
        rep = sorted({n.decode() for n in nomes if nomes.count(n) > 1})
        if rep:
            sys.exit("função global duplicada: " + ", ".join(rep))
        print("ok: app.html idêntico à montagem de src/")
        sys.exit(0)
    if arg not in ("", "--dividir", "--absorver"):
        sys.exit(__doc__)
    if arg != "--dividir":
        APP.write_bytes(montar())
    PUB.write_bytes(APP.read_bytes())
