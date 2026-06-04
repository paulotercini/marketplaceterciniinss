#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do site estático da Advocacia Previdenciária (Paulo Roberto Tercini Filho).

Lê os arquivos de conteúdo em site_content/*.json e gera as páginas HTML em docs/.
Site pensado para hospedagem no GitHub Pages (pasta /docs).

Uso:  python3 build_site.py
"""

import json
import os
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT_DIR = ROOT / "site_content"
OUT_DIR = ROOT / "docs"

# --------------------------------------------------------------------------
# Dados do escritório (mantidos do material antigo)
# --------------------------------------------------------------------------
OFFICE = {
    "advogado": "Paulo Roberto Tercini Filho",
    "marca": "Tercini Advocacia Previdenciária",
    "oab": "OAB/SP 331.110",
    "endereco": "Rua Rui Barbosa, nº 663, Centro — Monte Alto/SP",
    "endereco_obs": "Em frente ao INSS",
    "tel_fixo_label": "(16) 3242-2908",
    "tel_fixo_link": "1632422908",
    "whatsapp_label": "(16) 98140-9271",
    "whatsapp_link": "5516981409271",
    "email": "contato@advprev.com",
    "maps_q": "Rua Rui Barbosa 663 Centro Monte Alto SP",
}

WA_TEXT = "Ol%C3%A1%2C%20gostaria%20de%20tirar%20uma%20d%C3%BAvida%20previdenci%C3%A1ria."
WA_URL = f"https://wa.me/{OFFICE['whatsapp_link']}?text={WA_TEXT}"
TEL_URL = f"tel:+55{OFFICE['tel_fixo_link']}"

# Ordem fixa das categorias no menu e na home
CATEGORY_ORDER = [
    "Aposentadorias",
    "Benefícios por Incapacidade",
    "Assistencial e Família",
    "Revisões e Planejamento",
]

CATEGORY_INTRO = {
    "Aposentadorias": "Regras de transição, direito adquirido e modalidades especiais após a Reforma da Previdência (EC 103/2019).",
    "Benefícios por Incapacidade": "Auxílios e aposentadorias para quem teve a capacidade de trabalho afetada por doença ou acidente.",
    "Assistencial e Família": "Proteção a quem depende do amparo do Estado e aos dependentes do segurado.",
    "Revisões e Planejamento": "Revisar benefícios já concedidos e planejar a melhor aposentadoria possível.",
}

# --------------------------------------------------------------------------
# Helpers de render
# --------------------------------------------------------------------------
def esc(s):
    return html.escape(str(s), quote=True)

def render_blocks(blocks):
    out = []
    for b in blocks:
        t = b.get("type")
        if t == "p":
            out.append(f"<p>{esc(b['text'])}</p>")
        elif t == "ul":
            items = "".join(f"<li>{esc(i)}</li>" for i in b.get("items", []))
            out.append(f"<ul>{items}</ul>")
        elif t == "callout":
            out.append(f'<div class="callout"><p>{esc(b["text"])}</p></div>')
    return "\n".join(out)

def render_sections(sections):
    out = []
    for s in sections:
        out.append(f"<h2>{esc(s['heading'])}</h2>")
        out.append(render_blocks(s.get("blocks", [])))
    return "\n".join(out)

def render_docs(docs):
    if not docs:
        return ""
    items = "".join(f"<li>{esc(d)}</li>" for d in docs)
    return f"""
    <div class="docs-box">
      <h3>Documentos que costumam ajudar na análise</h3>
      <ul>{items}</ul>
      <p style="margin:.6rem 0 0;font-size:.9rem;color:var(--gray-600);">
        A lista varia conforme o caso. Na consulta, indicamos exatamente o que é necessário.
      </p>
    </div>"""

def render_faq(faq):
    if not faq:
        return ""
    items = []
    for f in faq:
        items.append(
            f"<details><summary>{esc(f['q'])}</summary><p>{esc(f['a'])}</p></details>"
        )
    return f"""
    <section class="section">
      <div class="container content">
        <h2>Perguntas frequentes</h2>
        <div class="faq">{''.join(items)}</div>
      </div>
    </section>"""

# --------------------------------------------------------------------------
# Componentes globais (header / footer / whatsapp)
# --------------------------------------------------------------------------
def nav_html(pages_by_cat, active=""):
    groups = []
    for cat in CATEGORY_ORDER:
        pages = pages_by_cat.get(cat, [])
        if not pages:
            continue
        links = "".join(
            f'<a href="{p["slug"]}.html">{esc(p["nav_label"])}</a>' for p in pages
        )
        groups.append(f"""
        <li>
          <button class="nav__top">{esc(cat)}</button>
          <div class="dropdown">{links}</div>
        </li>""")
    groups_html = "".join(groups)
    return f"""
  <header class="site-header">
    <nav class="nav container">
      <a class="brand" href="index.html">
        <span class="brand__logo"><img src="assets/img/logo.svg" alt="Logo {esc(OFFICE['marca'])}" onerror="this.replaceWith(document.createTextNode('m'))"></span>
        <span class="brand__name">{esc(OFFICE['marca'])}
          <span>{esc(OFFICE['advogado'])} · {esc(OFFICE['oab'])}</span>
        </span>
      </a>
      <button class="nav__toggle" aria-label="Abrir menu"><span></span><span></span><span></span></button>
      <ul class="nav__links">
        <li><a href="index.html">Início</a></li>
        {groups_html}
        <li><a href="sobre.html">O Escritório</a></li>
        <li><a href="contato.html">Contato</a></li>
      </ul>
      <div class="nav__cta">
        <a class="btn btn--primary" href="{WA_URL}" target="_blank" rel="noopener">Falar no WhatsApp</a>
      </div>
    </nav>
  </header>"""

def footer_html(pages_by_cat):
    cols = []
    for cat in CATEGORY_ORDER:
        pages = pages_by_cat.get(cat, [])
        if not pages:
            continue
        links = "".join(
            f'<a href="{p["slug"]}.html">{esc(p["nav_label"])}</a>' for p in pages
        )
        cols.append(f'<div class="footer-cols"><h4>{esc(cat)}</h4>{links}</div>')
    # mostra só as duas primeiras colunas de serviços para não poluir
    services_cols = "".join(cols[:2])
    return f"""
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>{esc(OFFICE['marca'])}</h4>
          <p>{esc(OFFICE['advogado'])}<br>{esc(OFFICE['oab'])}</p>
          <p>{esc(OFFICE['endereco'])}<br><small>{esc(OFFICE['endereco_obs'])}</small></p>
          <p>
            <a href="{TEL_URL}">{esc(OFFICE['tel_fixo_label'])}</a> ·
            <a href="{WA_URL}" target="_blank" rel="noopener">WhatsApp {esc(OFFICE['whatsapp_label'])}</a><br>
            <a href="mailto:{OFFICE['email']}">{esc(OFFICE['email'])}</a>
          </p>
        </div>
        {services_cols}
      </div>
      <div class="footer-bottom">
        <p>© 2026 {esc(OFFICE['marca'])} — Todos os direitos reservados.</p>
        <p>Conteúdo de caráter meramente informativo. Não constitui consulta jurídica, captação de clientela
        nem promessa de resultado, em conformidade com o Código de Ética e Disciplina e o Provimento nº 205/2021 do CFOAB.</p>
      </div>
    </div>
  </footer>"""

def wa_float():
    return f"""
  <a class="wa-float" href="{WA_URL}" target="_blank" rel="noopener" aria-label="Fale conosco no WhatsApp">
    <svg viewBox="0 0 32 32"><path d="M16 .4C7.4.4.4 7.4.4 16c0 2.8.7 5.4 2 7.8L.3 31.7l8.1-2.1c2.3 1.2 4.9 1.9 7.6 1.9 8.6 0 15.6-7 15.6-15.6S24.6.4 16 .4zm0 28.5c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.8 1.3 1.3-4.7-.3-.5A12.8 12.8 0 0 1 3.2 16C3.2 9 8.9 3.2 16 3.2S28.8 9 28.8 16 23 28.9 16 28.9zm7.1-9.6c-.4-.2-2.3-1.1-2.6-1.3-.3-.1-.6-.2-.9.2-.3.4-1 1.3-1.2 1.5-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.3-2.2-2.7-.2-.4 0-.6.2-.8.2-.2.4-.4.6-.7.2-.2.3-.4.4-.7.1-.3 0-.5 0-.7-.1-.2-.9-2.1-1.2-2.9-.3-.8-.6-.7-.9-.7h-.7c-.2 0-.6.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.9c.2.3 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.3.1.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5z"/></svg>
  </a>"""

# --------------------------------------------------------------------------
# Documento base
# --------------------------------------------------------------------------
def document(title, description, body, pages_by_cat, og_title=None):
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <meta property="og:title" content="{esc(og_title or title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
{nav_html(pages_by_cat)}
{body}
{footer_html(pages_by_cat)}
{wa_float()}
  <script src="assets/js/main.js"></script>
</body>
</html>"""

# --------------------------------------------------------------------------
# Páginas de serviço (benefícios)
# --------------------------------------------------------------------------
def service_page(page, pages_by_cat):
    related = ""
    rel_slugs = page.get("related", [])
    if rel_slugs:
        cards = []
        for slug in rel_slugs:
            rp = ALL_PAGES.get(slug)
            if rp:
                cards.append(f"""
        <a class="card" href="{rp['slug']}.html" style="text-decoration:none;">
          <span class="card__cat">{esc(rp['category'])}</span>
          <h3>{esc(rp['title'])}</h3>
          <span class="card__link">Ver detalhes</span>
        </a>""")
        if cards:
            related = f"""
    <section class="section section--gray">
      <div class="container">
        <h2 style="text-align:center;margin-bottom:2rem;">Assuntos relacionados</h2>
        <div class="grid grid--3">{''.join(cards)}</div>
      </div>
    </section>"""

    intro = "".join(f"<p class='lead'>{esc(p)}</p>" if i == 0 else f"<p>{esc(p)}</p>"
                    for i, p in enumerate(page.get("intro", [])))

    body = f"""
  <section class="page-hero">
    <div class="container">
      <div class="breadcrumb"><a href="index.html">Início</a> › {esc(page['category'])} › {esc(page['title'])}</div>
      <h1>{esc(page['title'])}</h1>
      <p>{esc(page.get('hero_subtitle',''))}</p>
    </div>
  </section>

  <section class="section">
    <div class="container content">
      {intro}
      {render_sections(page.get('sections', []))}
      {render_docs(page.get('documentos', []))}
    </div>
  </section>

  {render_faq(page.get('faq', []))}

  <section class="cta-strip section">
    <div class="container">
      <div>
        <h2>Ficou com dúvida sobre {esc(page['title'])}?</h2>
        <p style="margin:0;">Agende uma análise do seu caso com o Dr. {esc(OFFICE['advogado'].split()[0])} {esc(OFFICE['advogado'].split()[-1])}.</p>
      </div>
      <a class="btn btn--primary" href="{WA_URL}" target="_blank" rel="noopener">Falar no WhatsApp</a>
    </div>
  </section>
  {related}"""
    return document(f"{page['title']} — {OFFICE['marca']}", page.get("meta_description", ""),
                    body, pages_by_cat)

# --------------------------------------------------------------------------
# Home
# --------------------------------------------------------------------------
def home_page(pages_by_cat):
    cat_sections = []
    for cat in CATEGORY_ORDER:
        pages = pages_by_cat.get(cat, [])
        if not pages:
            continue
        cards = []
        for p in pages:
            cards.append(f"""
        <a class="card" href="{p['slug']}.html" style="text-decoration:none;">
          <span class="card__cat">{esc(cat)}</span>
          <h3>{esc(p['title'])}</h3>
          <p>{esc(p.get('hero_subtitle',''))}</p>
          <span class="card__link">Ver detalhes</span>
        </a>""")
        cat_sections.append(f"""
      <div style="margin-bottom:2.5rem;">
        <h2>{esc(cat)}</h2>
        <p class="lead" style="margin-bottom:1.5rem;">{esc(CATEGORY_INTRO.get(cat,''))}</p>
        <div class="grid grid--3">{''.join(cards)}</div>
      </div>""")

    body = f"""
  <section class="hero">
    <div class="container">
      <span class="hero__badge">Advocacia exclusivamente previdenciária · Monte Alto/SP e região</span>
      <h1>Seus direitos junto ao INSS, tratados com técnica e atenção.</h1>
      <p>Atuação focada em aposentadorias, benefícios por incapacidade, BPC/LOAS, pensões e revisões — na via administrativa e judicial. Análise individual de cada caso, com linguagem clara e acompanhamento próximo.</p>
      <div class="hero__actions">
        <a class="btn btn--primary" href="{WA_URL}" target="_blank" rel="noopener">Falar no WhatsApp</a>
        <a class="btn btn--ghost" href="#servicos">Ver áreas de atuação</a>
      </div>
    </div>
  </section>

  <section class="section section--gray">
    <div class="container">
      <div class="grid grid--3">
        <div class="card"><h3>Atendimento próximo</h3><p>Escritório em frente ao INSS de Monte Alto, com atendimento presencial e a distância.</p></div>
        <div class="card"><h3>Análise individual</h3><p>Cada benefício é estudado a partir do seu histórico de contribuições (CNIS) e da sua realidade.</p></div>
        <div class="card"><h3>Linguagem clara</h3><p>Explicamos cada etapa sem juridiquês, para você entender seus direitos e decidir com segurança.</p></div>
      </div>
    </div>
  </section>

  <section class="section" id="servicos">
    <div class="container">
      <div style="text-align:center;max-width:680px;margin:0 auto 3rem;">
        <div class="eyebrow">Áreas de atuação</div>
        <h2>Em que podemos ajudar você</h2>
        <p class="lead">Conteúdo organizado por tipo de benefício. Escolha o tema mais próximo da sua situação.</p>
      </div>
      {''.join(cat_sections)}
    </div>
  </section>

  <section class="cta-strip section">
    <div class="container">
      <div>
        <h2>Não encontrou o seu caso?</h2>
        <p style="margin:0;">Fale com o escritório. A primeira conversa serve para entender sua situação e indicar o caminho.</p>
      </div>
      <a class="btn btn--primary" href="{WA_URL}" target="_blank" rel="noopener">Falar no WhatsApp</a>
    </div>
  </section>"""
    return document(
        f"{OFFICE['marca']} — Advogado Previdenciário em Monte Alto/SP",
        "Advocacia previdenciária em Monte Alto/SP. Aposentadorias, auxílio-doença, BPC/LOAS, pensão por morte, auxílio-acidente e revisões de benefício junto ao INSS.",
        body, pages_by_cat,
        og_title=f"{OFFICE['marca']}")

# --------------------------------------------------------------------------
# Sobre
# --------------------------------------------------------------------------
def about_page(pages_by_cat):
    body = f"""
  <section class="page-hero">
    <div class="container">
      <div class="breadcrumb"><a href="index.html">Início</a> › O Escritório</div>
      <h1>O Escritório</h1>
      <p>Advocacia dedicada exclusivamente ao Direito Previdenciário.</p>
    </div>
  </section>
  <section class="section">
    <div class="container content">
      <p class="lead">{esc(OFFICE['marca'])} é conduzido pelo advogado <strong>{esc(OFFICE['advogado'])}</strong> ({esc(OFFICE['oab'])}), com atuação concentrada em Direito Previdenciário — o ramo que cuida da relação do cidadão com o INSS.</p>
      <p>O escritório fica em Monte Alto/SP, <strong>em frente à agência do INSS</strong>, e atende segurados da cidade e de toda a região, presencialmente e a distância.</p>

      <h2>Como trabalhamos</h2>
      <ul>
        <li><strong>Diagnóstico antes de tudo.</strong> Analisamos o seu histórico de contribuições (CNIS) e os documentos do caso antes de indicar qualquer medida.</li>
        <li><strong>Via administrativa e judicial.</strong> Sempre que possível, buscamos a solução diretamente no INSS; quando necessário, levamos o caso ao Judiciário.</li>
        <li><strong>Transparência.</strong> Você acompanha cada etapa e recebe explicações em linguagem clara.</li>
      </ul>

      <h2>Áreas de atuação</h2>
      <p>Aposentadorias (por idade, tempo de contribuição, especial, da pessoa com deficiência, do professor e rural), benefícios por incapacidade (auxílio-doença, aposentadoria por incapacidade e auxílio-acidente), benefício assistencial (BPC/LOAS), pensão por morte, salário-maternidade, auxílio-reclusão, além de revisões de benefícios já concedidos e planejamento previdenciário.</p>

      <div class="callout"><p>O primeiro contato serve para entender a sua situação. A partir daí, indicamos o melhor caminho para o seu caso.</p></div>
    </div>
  </section>
  <section class="cta-strip section">
    <div class="container">
      <div><h2>Vamos conversar sobre o seu caso?</h2><p style="margin:0;">Atendimento em Monte Alto/SP e a distância.</p></div>
      <a class="btn btn--primary" href="{WA_URL}" target="_blank" rel="noopener">Falar no WhatsApp</a>
    </div>
  </section>"""
    return document(f"O Escritório — {OFFICE['marca']}",
                    f"Conheça o escritório de {OFFICE['advogado']} ({OFFICE['oab']}), advocacia previdenciária em Monte Alto/SP.",
                    body, pages_by_cat)

# --------------------------------------------------------------------------
# Contato
# --------------------------------------------------------------------------
def contact_page(pages_by_cat):
    maps_q = OFFICE["maps_q"].replace(" ", "+")
    body = f"""
  <section class="page-hero">
    <div class="container">
      <div class="breadcrumb"><a href="index.html">Início</a> › Contato</div>
      <h1>Contato</h1>
      <p>Fale com o escritório pelos canais abaixo ou venha nos visitar.</p>
    </div>
  </section>
  <section class="section">
    <div class="container">
      <div class="contact-grid">
        <div>
          <div class="info-item"><div class="ico">📍</div><div><strong>Endereço</strong><br>{esc(OFFICE['endereco'])}<br><small>{esc(OFFICE['endereco_obs'])}</small></div></div>
          <div class="info-item"><div class="ico">📞</div><div><strong>Telefone fixo</strong><br><a href="{TEL_URL}">{esc(OFFICE['tel_fixo_label'])}</a></div></div>
          <div class="info-item"><div class="ico">💬</div><div><strong>WhatsApp</strong><br><a href="{WA_URL}" target="_blank" rel="noopener">{esc(OFFICE['whatsapp_label'])}</a></div></div>
          <div class="info-item"><div class="ico">✉️</div><div><strong>E-mail</strong><br><a href="mailto:{OFFICE['email']}">{esc(OFFICE['email'])}</a></div></div>
          <a class="btn btn--primary" href="{WA_URL}" target="_blank" rel="noopener" style="margin-top:.5rem;">Iniciar conversa no WhatsApp</a>
        </div>
        <div class="map-embed">
          <iframe loading="lazy" src="https://www.google.com/maps?q={maps_q}&output=embed" title="Mapa do escritório"></iframe>
        </div>
      </div>
    </div>
  </section>"""
    return document(f"Contato — {OFFICE['marca']}",
                    f"Telefone, WhatsApp, e-mail e endereço do escritório {OFFICE['marca']} em Monte Alto/SP.",
                    body, pages_by_cat)

# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------
ALL_PAGES = {}

def main():
    pages = []
    if CONTENT_DIR.exists():
        for f in sorted(CONTENT_DIR.glob("*.json")):
            if f.name.startswith("_"):
                continue
            data = json.loads(f.read_text(encoding="utf-8"))
            pages.append(data)
            ALL_PAGES[data["slug"]] = data

    pages_by_cat = {}
    for p in pages:
        pages_by_cat.setdefault(p["category"], []).append(p)
    for cat in pages_by_cat:
        pages_by_cat[cat].sort(key=lambda x: x.get("order", 99))

    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "assets" / "img").mkdir(parents=True, exist_ok=True)

    # Páginas fixas
    (OUT_DIR / "index.html").write_text(home_page(pages_by_cat), encoding="utf-8")
    (OUT_DIR / "sobre.html").write_text(about_page(pages_by_cat), encoding="utf-8")
    (OUT_DIR / "contato.html").write_text(contact_page(pages_by_cat), encoding="utf-8")

    # Páginas de serviço
    for p in pages:
        (OUT_DIR / f"{p['slug']}.html").write_text(service_page(p, pages_by_cat), encoding="utf-8")

    print(f"OK — {len(pages)} páginas de serviço + 3 fixas geradas em {OUT_DIR}")
    for cat in CATEGORY_ORDER:
        for p in pages_by_cat.get(cat, []):
            print(f"  [{cat}] {p['slug']}.html")


if __name__ == "__main__":
    main()
