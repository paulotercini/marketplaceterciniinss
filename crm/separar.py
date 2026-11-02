#!/usr/bin/env python3
"""F381 · Na publicação, tira o programa do CRM de dentro da página.

O docs/crm/index.html (cópia idêntica do app.html testado) leva o script
principal, cerca de 4 MB, dentro da própria página. Assim o celular compila
o programa inteiro a cada abertura. Este passo, que só roda no deploy, sobre
o artefato, grava o mesmo texto em app.<hash>.js e deixa na página apenas
<script src="app.<hash>.js">: o navegador guarda o programa já compilado e o
reaproveita até a próxima versão (o hash muda com o conteúdo).

O texto do programa não muda um byte: juntar(página, programa) devolve o
original, e a prova está em tests/test_separar.py.
"""
import hashlib
import re
import sys
from pathlib import Path

ABRE = "<script>\n"
FECHA = "\n</script>"


def separar(html: str):
    """Devolve (página, nome do arquivo, programa) do maior <script> sem atributos."""
    blocos = []
    for m in re.finditer(re.escape(ABRE), html):
        fim = html.find(FECHA, m.end())
        if fim > 0:
            blocos.append((fim - m.end(), m.end(), fim))
    if not blocos:
        raise SystemExit("ERRO: nenhum <script> para separar")
    _, ini, fim = max(blocos)
    js = html[ini:fim]
    nome = f"app.{hashlib.sha256(js.encode('utf-8')).hexdigest()[:12]}.js"
    pagina = html[:ini - len(ABRE)] + f'<script src="{nome}"></script>' + html[fim + len(FECHA):]
    return pagina, nome, js


def juntar(pagina: str, nome: str, js: str) -> str:
    return pagina.replace(f'<script src="{nome}"></script>', ABRE + js + FECHA, 1)


if __name__ == "__main__":
    pasta = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/crm")
    html = (pasta / "index.html").read_text(encoding="utf-8")
    pagina, nome, js = separar(html)
    assert juntar(pagina, nome, js) == html
    (pasta / nome).write_text(js, encoding="utf-8")
    (pasta / "index.html").write_text(pagina, encoding="utf-8")
    print(f"página {len(pagina.encode())//1024} KB + {nome} {len(js.encode())//1024} KB")
