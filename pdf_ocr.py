"""Torna LEGIVEL um PDF/imagem escaneado (sem camada de texto), renderizando as
paginas em PNG para a ferramenta Read do assistente ler visualmente.

Nao existe tesseract/poppler no container. A leitura de documento escaneado se faz
assim, o script converte cada pagina em PNG de alta resolucao e o ASSISTENTE le o
PNG com a ferramenta Read (o modelo enxerga a imagem, e esse o "OCR").

Uso:
  python3 pdf_ocr.py "<arquivo.pdf>" [destino_dir] [--paginas 1-5] [--dpi 200]
  python3 pdf_ocr.py "<imagem.jpg>" [destino_dir]     # normaliza imagem para PNG

Saida, os caminhos dos PNGs gerados (um por pagina), em ordem. Depois, use Read em
cada PNG. Para PDF com camada de texto, o script avisa que da para ler direto.
"""
import os
import sys

import fitz  # PyMuPDF


def _paginas(spec, total):
    if not spec:
        return range(total)
    out = []
    for parte in str(spec).split(","):
        parte = parte.strip()
        if "-" in parte:
            a, b = parte.split("-", 1)
            out.extend(range(int(a) - 1, min(int(b), total)))
        elif parte:
            out.append(int(parte) - 1)
    return [p for p in out if 0 <= p < total]


def render(caminho, destino=None, spec=None, dpi=200):
    base = os.path.splitext(os.path.basename(caminho))[0]
    destino = destino or os.path.join("/tmp", "ocr_" + base)
    os.makedirs(destino, exist_ok=True)

    doc = fitz.open(caminho)
    total = doc.page_count
    # Se ja tem camada de texto util, avisa (evita trabalho desnecessario).
    texto = "".join(doc[p].get_text() for p in range(min(total, 3))).strip()
    if len(texto) > 200:
        print(f"[aviso] este arquivo JA tem camada de texto ({len(texto)} chars nas "
              f"primeiras paginas). Da para ler direto, sem renderizar.")

    saidas = []
    for i in _paginas(spec, total):
        pix = doc[i].get_pixmap(dpi=dpi)
        # PNG muito grande atrapalha a leitura; reduz o dpi se passar de ~1.6 MB.
        if len(pix.tobytes("png")) > 1_600_000 and dpi > 120:
            pix = doc[i].get_pixmap(dpi=120)
        f = os.path.join(destino, f"{base}_p{i + 1:03d}.png")
        pix.save(f)
        saidas.append(f)
    doc.close()
    return total, saidas


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Uso: python3 pdf_ocr.py "<arquivo.pdf|imagem>" [destino] '
              '[--paginas 1-5] [--dpi 200]')
        sys.exit(1)
    arq = sys.argv[1]
    dest = None
    spec = None
    dpi = 200
    resto = sys.argv[2:]
    i = 0
    while i < len(resto):
        if resto[i] == "--paginas":
            spec = resto[i + 1]; i += 2
        elif resto[i] == "--dpi":
            dpi = int(resto[i + 1]); i += 2
        else:
            dest = resto[i]; i += 1
    total, saidas = render(arq, dest, spec, dpi)
    print(f"paginas no documento: {total} | PNGs gerados: {len(saidas)}")
    for s in saidas:
        print(s)
    print("\nAgora LEIA cada PNG acima com a ferramenta Read (o modelo enxerga a "
          "imagem). Registre no parecer quais folhas leu e quais nao conseguiu.")
