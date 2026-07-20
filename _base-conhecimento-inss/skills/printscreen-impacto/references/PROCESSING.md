# PROCESSING.md — Pipeline de Processamento de Printscreens de Impacto

## Dependências

```bash
pip install Pillow --break-system-packages
```

O `pdftoppm` (Poppler) já está disponível no ambiente para conversão de PDF em imagem.

## Índice

1. Extração de página de PDF
2. Recorte de região (crop)
3. Aplicação de destaques
4. Composição final
5. Funções auxiliares
6. Exemplos de uso por tipo de documento

---

## 1. Extração de Página de PDF

```python
import subprocess
import os

def extract_pdf_page(pdf_path, page_number, output_path, dpi=200):
    """
    Extrai uma página específica de um PDF como imagem PNG.
    
    Args:
        pdf_path: Caminho do PDF de entrada
        page_number: Número da página (1-indexed)
        output_path: Caminho base de saída (sem extensão, pdftoppm adiciona)
        dpi: Resolução da imagem (mínimo 200 para legibilidade no .docx)
    
    Returns:
        Caminho completo da imagem gerada
    """
    subprocess.run([
        "pdftoppm", "-png", "-r", str(dpi),
        "-f", str(page_number), "-l", str(page_number),
        pdf_path, output_path
    ], check=True)
    
    # pdftoppm adiciona sufixo com número da página
    generated = f"{output_path}-{page_number}.png"
    if not os.path.exists(generated):
        # Tenta formato alternativo (com zeros à esquerda)
        for f in os.listdir(os.path.dirname(output_path) or "."):
            if f.startswith(os.path.basename(output_path)) and f.endswith(".png"):
                generated = os.path.join(os.path.dirname(output_path) or ".", f)
                break
    return generated
```

---

## 2. Recorte de Região (Crop)

```python
from PIL import Image

def crop_region(image_path, box, output_path, padding=20):
    """
    Recorta uma região específica da imagem com margem de segurança.
    
    Args:
        image_path: Caminho da imagem de entrada
        box: Tupla (left, upper, right, lower) em pixels
        output_path: Caminho da imagem recortada
        padding: Margem adicional em pixels ao redor do recorte
    
    Returns:
        Caminho da imagem recortada
    """
    img = Image.open(image_path)
    w, h = img.size
    
    left = max(0, box[0] - padding)
    upper = max(0, box[1] - padding)
    right = min(w, box[2] + padding)
    lower = min(h, box[3] + padding)
    
    cropped = img.crop((left, upper, right, lower))
    cropped.save(output_path, "PNG", dpi=(300, 300))
    return output_path


def crop_percentage(image_path, top_pct, bottom_pct, output_path):
    """
    Recorta uma faixa horizontal da imagem por porcentagem.
    Útil quando se sabe que a informação relevante está em determinada
    faixa vertical do documento (ex. seção 15 do PPP está nos 40-70% da página).
    
    Args:
        image_path: Caminho da imagem
        top_pct: Porcentagem do topo onde começa o recorte (0.0-1.0)
        bottom_pct: Porcentagem do topo onde termina o recorte (0.0-1.0)
        output_path: Caminho da saída
    """
    img = Image.open(image_path)
    w, h = img.size
    
    upper = int(h * top_pct)
    lower = int(h * bottom_pct)
    
    cropped = img.crop((0, upper, w, lower))
    cropped.save(output_path, "PNG", dpi=(300, 300))
    return output_path
```

---

## 3. Aplicação de Destaques

### Paleta de cores padrão

```python
# Cores RGBA para overlays semi-transparentes
COLORS = {
    "vermelho":  (255, 0, 0, 60),       # Erro, superado, acima do limite
    "verde":     (144, 238, 144, 100),   # Correto, favorável, incontroverso
    "amarelo":   (255, 255, 0, 100),     # Alerta, atenção, parcial
    "azul":      (0, 100, 255, 60),      # Informativo, processual
}

# Cores sólidas para bordas e texto de anotações
BORDER_COLORS = {
    "vermelho":  "#C62828",
    "verde":     "#2E7D32",
    "amarelo":   "#E65100",
    "azul":      "#1A3E6E",
}

# Cores de fundo para caixas de anotação
BOX_BG_COLORS = {
    "vermelho":  "#FCE4EC",
    "verde":     "#E8F5E9",
    "amarelo":   "#FFF3E0",
    "azul":      "#E3F2FD",
}

# Cores de texto para caixas de anotação
BOX_TEXT_COLORS = {
    "vermelho":  "#7B1F1F",
    "verde":     "#1B5E20",
    "amarelo":   "#5D4037",
    "azul":      "#1A3E6E",
}
```

### Funções de destaque

```python
from PIL import Image, ImageDraw, ImageFont
import os

def get_font(size, bold=False):
    """Obtém fonte disponível no sistema."""
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold 
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold 
        else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def apply_highlight(img, box, color_name="vermelho"):
    """
    Aplica grifo semi-transparente sobre uma região da imagem.
    
    Args:
        img: Imagem PIL em modo RGBA
        box: Tupla (x1, y1, x2, y2) da região a destacar
        color_name: Chave da paleta COLORS
    
    Returns:
        Imagem com destaque aplicado
    """
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle(box, fill=COLORS[color_name])
    return Image.alpha_composite(img, overlay)


def apply_border(img, box, color_name="vermelho", width=2):
    """
    Aplica borda colorida ao redor de uma região.
    
    Args:
        img: Imagem PIL
        box: Tupla (x1, y1, x2, y2)
        color_name: Chave da paleta BORDER_COLORS
        width: Espessura da borda em pixels
    """
    draw = ImageDraw.Draw(img)
    draw.rectangle(box, outline=BORDER_COLORS[color_name], width=width)
    return img


def apply_arrow(img, start, end, color_name="vermelho", width=3):
    """
    Desenha seta indicativa entre dois pontos.
    
    Args:
        img: Imagem PIL
        start: Tupla (x, y) da origem da seta
        end: Tupla (x, y) da ponta da seta
        color_name: Chave da paleta BORDER_COLORS
        width: Espessura da linha
    """
    draw = ImageDraw.Draw(img)
    color = BORDER_COLORS[color_name]
    
    # Linha principal
    draw.line([start, end], fill=color, width=width)
    
    # Ponta da seta (triângulo)
    import math
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    angle = math.atan2(dy, dx)
    arrow_size = 12
    
    p1 = end
    p2 = (int(end[0] - arrow_size * math.cos(angle - 0.4)),
          int(end[1] - arrow_size * math.sin(angle - 0.4)))
    p3 = (int(end[0] - arrow_size * math.cos(angle + 0.4)),
          int(end[1] - arrow_size * math.sin(angle + 0.4)))
    
    draw.polygon([p1, p2, p3], fill=color)
    return img


def apply_annotation_box(img, position, title, lines, color_name="vermelho"):
    """
    Adiciona caixa de anotação lateral com título e texto explicativo.
    
    Args:
        img: Imagem PIL
        position: Tupla (x, y) do canto superior esquerdo da caixa
        title: Texto do título (negrito, cor forte)
        lines: Lista de strings para o corpo da anotação
        color_name: Chave da paleta
    
    Returns:
        Imagem com anotação aplicada
    """
    draw = ImageDraw.Draw(img)
    
    font_title = get_font(13, bold=True)
    font_body = get_font(11)
    
    # Calcular dimensões da caixa
    line_height = 17
    box_width = 220
    box_height = 25 + (len(lines) * line_height) + 15
    
    x, y = position
    
    # Fundo e borda
    draw.rectangle(
        [x, y, x + box_width, y + box_height],
        fill=BOX_BG_COLORS[color_name],
        outline=BORDER_COLORS[color_name],
        width=2
    )
    
    # Título
    draw.text((x + 12, y + 8), title, fill=BORDER_COLORS[color_name], font=font_title)
    
    # Corpo
    text_y = y + 28
    for line in lines:
        draw.text((x + 12, text_y), line, fill=BOX_TEXT_COLORS[color_name], font=font_body)
        text_y += line_height
    
    return img


def apply_source_footer(img, source_text):
    """
    Adiciona rodapé com referência ao documento fonte.
    
    Args:
        img: Imagem PIL (RGB)
        source_text: Texto da referência (ex. "Fonte: PPP — Doc. ID 04")
    
    Returns:
        Nova imagem com rodapé adicionado
    """
    w, h = img.size
    footer_height = 35
    
    new_img = Image.new("RGB", (w, h + footer_height), "#F5F5F5")
    new_img.paste(img, (0, 0))
    
    draw = ImageDraw.Draw(new_img)
    font = get_font(11)
    draw.text((15, h + 8), source_text, fill="#666666", font=font)
    
    return new_img
```

---

## 4. Composição Final

```python
def compose_printscreen(
    image_path,
    highlights,
    source_text,
    output_path,
    crop_box=None,
    crop_pct=None,
    max_width=1200
):
    """
    Pipeline completo de processamento de printscreen de impacto.
    
    Args:
        image_path: Caminho da imagem extraída do documento
        highlights: Lista de dicionários com os destaques a aplicar.
            Cada destaque tem o formato:
            {
                "type": "highlight" | "border" | "arrow" | "annotation",
                "color": "vermelho" | "verde" | "amarelo" | "azul",
                "box": (x1, y1, x2, y2),          # para highlight e border
                "start": (x, y), "end": (x, y),   # para arrow
                "position": (x, y),                # para annotation
                "title": "TEXTO",                  # para annotation
                "lines": ["linha1", "linha2"],      # para annotation
            }
        source_text: Texto de referência para o rodapé
        output_path: Caminho de saída
        crop_box: Tupla (left, upper, right, lower) para recorte opcional
        crop_pct: Tupla (top_pct, bottom_pct) para recorte por porcentagem
        max_width: Largura máxima da imagem final
    
    Returns:
        Caminho da imagem processada
    """
    img = Image.open(image_path)
    
    # Recorte se solicitado
    if crop_box:
        img = img.crop(crop_box)
    elif crop_pct:
        w, h = img.size
        img = img.crop((0, int(h * crop_pct[0]), w, int(h * crop_pct[1])))
    
    # Redimensionar se necessário
    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        img = img.resize((max_width, int(h * ratio)), Image.LANCZOS)
    
    # Converter para RGBA para overlays
    img = img.convert("RGBA")
    
    # Aplicar destaques na ordem
    for hl in highlights:
        t = hl["type"]
        c = hl.get("color", "vermelho")
        
        if t == "highlight":
            img = apply_highlight(img, hl["box"], c)
        elif t == "border":
            img = apply_border(img, hl["box"], c, hl.get("width", 2))
        elif t == "arrow":
            img = apply_arrow(img, hl["start"], hl["end"], c, hl.get("width", 3))
        elif t == "annotation":
            img = apply_annotation_box(img, hl["position"], hl["title"], hl["lines"], c)
    
    # Converter para RGB e adicionar rodapé
    img = img.convert("RGB")
    img = apply_source_footer(img, source_text)
    
    # Salvar com alta qualidade
    img.save(output_path, "PNG", dpi=(300, 300))
    return output_path
```

---

## 5. Funções Auxiliares

```python
def get_image_dimensions_for_docx(image_path, max_width_points=540):
    """
    Calcula as dimensões da imagem para inserção no .docx,
    mantendo proporção e respeitando a largura máxima da página.
    
    Args:
        image_path: Caminho da imagem
        max_width_points: Largura máxima em pontos (540 ≈ 95% de A4 com margens 2.5cm)
    
    Returns:
        Tupla (width_points, height_points) para uso no ImageRun do docx-js
    """
    img = Image.open(image_path)
    w, h = img.size
    
    # Converter pixels para pontos (assumindo 96 DPI de tela)
    w_pts = w * 72 / 96
    h_pts = h * 72 / 96
    
    if w_pts > max_width_points:
        ratio = max_width_points / w_pts
        w_pts = max_width_points
        h_pts = h_pts * ratio
    
    return (int(w_pts), int(h_pts))


def identify_highlights_from_audit(audit_results, document_type):
    """
    Converte resultados de auditoria em lista de destaques para o compose_printscreen.
    Esta função é chamada após as skills de auditoria identificarem os pontos críticos.
    
    O Claude deve adaptar as coordenadas dos destaques com base na posição visual
    dos elementos no documento real. As coordenadas dependem do layout específico
    de cada documento e devem ser estimadas visualmente após a extração da página.
    
    Args:
        audit_results: Dicionário com os achados da auditoria
        document_type: "ppp" | "cnis" | "indeferimento" | "laudo" | "medico" | "decisao"
    
    Returns:
        Lista de dicionários de destaques no formato esperado por compose_printscreen
    """
    # Esta função serve como guia conceitual.
    # Na prática, o Claude analisa a imagem do documento,
    # identifica visualmente onde estão os pontos críticos,
    # e define as coordenadas dos destaques manualmente
    # com base na posição dos elementos na imagem.
    
    highlights = []
    
    # Exemplo para PPP
    if document_type == "ppp":
        for achado in audit_results.get("campos_criticos", []):
            if achado.get("acima_limite"):
                highlights.append({
                    "type": "highlight",
                    "color": "vermelho",
                    "box": achado["coordenadas"],
                })
                highlights.append({
                    "type": "annotation",
                    "color": "vermelho",
                    "position": achado["posicao_anotacao"],
                    "title": "ACIMA DO LIMITE",
                    "lines": [achado["descricao_curta"]],
                })
    
    return highlights
```

---

## 6. Exemplos de Uso por Tipo de Documento

### PPP — Aposentadoria Especial

```python
# Após auditoria do PPP identificar ruído de 92,3 dB(A) no campo 15.3

page_img = extract_pdf_page("ppp_metalurgica.pdf", 2, "/tmp/ppp_page")

printscreen = compose_printscreen(
    image_path=page_img,
    highlights=[
        {"type": "highlight", "color": "vermelho", "box": (480, 230, 610, 252)},
        {"type": "border", "color": "vermelho", "box": (478, 228, 612, 254)},
        {"type": "arrow", "color": "vermelho", "start": (620, 241), "end": (680, 241)},
        {"type": "annotation", "color": "vermelho", "position": (690, 220),
         "title": "ACIMA DO LIMITE", "lines": ["92,3 dB(A) > 85 dB", "(NR-15, Anexo 1)"]},
    ],
    source_text="Fonte: PPP emitido em 20/09/2023 — Doc. ID 04 (Evento 1, PROCADM4)",
    output_path="/tmp/ppp_printscreen.png",
    crop_pct=(0.35, 0.70),
)
```

### Carta de Indeferimento — Fundamento Superado

```python
page_img = extract_pdf_page("despacho_inss.pdf", 1, "/tmp/indef_page")

printscreen = compose_printscreen(
    image_path=page_img,
    highlights=[
        {"type": "highlight", "color": "vermelho", "box": (35, 280, 750, 320)},
        {"type": "annotation", "color": "vermelho", "position": (770, 270),
         "title": "FUNDAMENTO SUPERADO", "lines": ["Tema 1090/STJ afasta", "neutralização por EPI"]},
    ],
    source_text="Fonte: Despacho decisório INSS — Doc. ID 02 (Evento 1, PROCADM2)",
    output_path="/tmp/indeferimento_printscreen.png",
)
```

### CNIS — Indicador Bloqueante

```python
page_img = extract_pdf_page("cnis.pdf", 1, "/tmp/cnis_page")

printscreen = compose_printscreen(
    image_path=page_img,
    highlights=[
        {"type": "highlight", "color": "vermelho", "box": (600, 180, 780, 200)},
        {"type": "border", "color": "vermelho", "box": (598, 178, 782, 202)},
        {"type": "annotation", "color": "vermelho", "position": (790, 165),
         "title": "INDICADOR BLOQUEANTE", "lines": ["PEXT impede cômputo", "Exige acerto de CNIS"]},
        {"type": "highlight", "color": "amarelo", "box": (100, 250, 780, 270)},
        {"type": "annotation", "color": "amarelo", "position": (790, 240),
         "title": "LACUNA", "lines": ["6 meses sem vínculo", "Risco à qualidade"]},
    ],
    source_text="Fonte: CNIS emitido em 15/03/2024 — Doc. ID 01 (Evento 1, PROCADM1)",
    output_path="/tmp/cnis_printscreen.png",
)
```

### Laudo Pericial — Contradição Interna

```python
page_img = extract_pdf_page("laudo_pericial.pdf", 3, "/tmp/laudo_page")

printscreen = compose_printscreen(
    image_path=page_img,
    highlights=[
        {"type": "highlight", "color": "verde", "box": (50, 120, 700, 160)},
        {"type": "annotation", "color": "verde", "position": (710, 110),
         "title": "ACHADO POSITIVO", "lines": ["Perito reconhece", "limitação funcional"]},
        {"type": "highlight", "color": "vermelho", "box": (50, 350, 700, 380)},
        {"type": "annotation", "color": "vermelho", "position": (710, 340),
         "title": "CONTRADIÇÃO", "lines": ["Conclusão nega", "incapacidade apesar", "do achado acima"]},
    ],
    source_text="Fonte: Laudo pericial judicial — Doc. ID 12 (Evento 28, LAUDO1)",
    output_path="/tmp/laudo_printscreen.png",
)
```
