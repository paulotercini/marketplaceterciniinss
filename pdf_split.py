"""Fatia um PDF local em arquivos menores nomeados, por faixas de pagina.

Uso:
    python3 pdf_split.py entrada.pdf "1-2:Procuracao Judicial" "3:Declaracao de Hipossuficiencia" "4-6:Contrato" [--outdir DIR]

- Cada argumento de faixa e "PAGINAS:NOME" onde PAGINAS e uma pagina (ex.: 3),
  uma faixa (ex.: 1-2) ou uma lista (ex.: 1,3,5). Paginas em base 1, inclusivas.
- NOME vira o nome do arquivo de saida (com sufixo .pdf). Use o padrao do escritorio
  ao chamar (ex.: "01 - Procuracao Judicial - 17062026").
- Saida em --outdir (default: ./inicial_tmp). Imprime os caminhos gerados, um por linha,
  para o chamador subir via create_file e depois apagar.
"""
import sys
import os
from pypdf import PdfReader, PdfWriter


def parse_pages(spec, n):
    out = []
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    for p in out:
        if p < 1 or p > n:
            raise ValueError(f"pagina {p} fora do intervalo 1..{n}")
    return out


def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    outdir = "inicial_tmp"
    if "--outdir" in args:
        i = args.index("--outdir")
        outdir = args[i + 1]
        del args[i : i + 2]
    entrada, faixas = args[0], args[1:]
    os.makedirs(outdir, exist_ok=True)
    reader = PdfReader(entrada)
    n = len(reader.pages)
    gerados = []
    for faixa in faixas:
        if ":" not in faixa:
            raise ValueError(f"faixa invalida (use PAGINAS:NOME): {faixa}")
        pages_spec, nome = faixa.split(":", 1)
        nome = nome.strip()
        paginas = parse_pages(pages_spec, n)
        writer = PdfWriter()
        for p in paginas:
            writer.add_page(reader.pages[p - 1])
        destino = os.path.join(outdir, nome if nome.lower().endswith(".pdf") else nome + ".pdf")
        with open(destino, "wb") as f:
            writer.write(f)
        gerados.append(destino)
    for g in gerados:
        print(g)


if __name__ == "__main__":
    main()
