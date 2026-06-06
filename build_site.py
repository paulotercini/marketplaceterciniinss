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
    "advogado_curto": "Paulo Tercini",
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
    "Incapacidade",
    "Assistencial",
    "Revisões e Planejamento",
]

CATEGORY_INTRO = {
    "Aposentadorias": "Regras de transição, direito adquirido e modalidades especiais após a Reforma da Previdência (EC 103/2019).",
    "Incapacidade": "Auxílios e aposentadorias para quem teve a capacidade de trabalho afetada por doença ou acidente.",
    "Assistencial": "Proteção a quem depende do amparo do Estado e aos dependentes do segurado.",
    "Revisões e Planejamento": "Revisar benefícios já concedidos e planejar a melhor aposentadoria possível.",
}

# Ícones (linha, herdam currentColor)
ICONS = {
    "clock":   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    "heart":   '<path d="M20.8 6.6a5.5 5.5 0 0 0-9-1.8L12 6l-.3-.2a5.5 5.5 0 1 0-7.7 7.9L12 21l8-7.3a5.5 5.5 0 0 0 .8-7.1z"/>',
    "family":  '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17.5" cy="9" r="2.2"/><path d="M21 19c0-2.2-1.7-3.9-4-4.2"/>',
    "refresh": '<path d="M20 11a8 8 0 1 0-1.7 5"/><path d="M20 5v6h-6"/>',
    "pin":     '<path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    "doc":     '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    "chat":    '<path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/>',
    "alert":   '<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v4"/><path d="M12 17.5v.3"/>',
    "shield":  '<path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z"/><path d="M9.5 12l1.8 1.8L15 10"/>',
}

def icon(name):
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round">{ICONS.get(name, "")}</svg>')

CATEGORY_ICON = {
    "Aposentadorias": "clock",
    "Incapacidade": "heart",
    "Assistencial": "family",
    "Revisões e Planejamento": "refresh",
}

CATEGORY_IMG = {
    "Aposentadorias": "cat-aposentadorias.jpg",
    "Incapacidade": "cat-incapacidade.jpg",
    "Assistencial": "cat-assistencial.jpg",
    "Revisões e Planejamento": "cat-revisoes.jpg",
}

# Entrada por situação de vida (linguagem simples para o cliente leigo/idoso)
SITUATIONS = [
    ("clock",  "Quero me aposentar",            "Descubra a melhor regra e o melhor valor antes de dar entrada no pedido.",       "planejamento-previdenciario.html"),
    ("alert",  "Meu pedido foi negado",         "O INSS negou ou cortou seu benefício? Em muitos casos é possível reverter.",     "contato.html"),
    ("heart",  "Adoeci e não consigo trabalhar","Auxílio-doença ou aposentadoria por incapacidade, quando a saúde não permite.",  "auxilio-doenca.html"),
    ("family", "Perdi um familiar",             "Pensão por morte para quem dependia financeiramente da pessoa.",                 "pensao-por-morte.html"),
    ("shield", "Tenho deficiência ou baixa renda","BPC/LOAS: um salário mínimo para idosos e pessoas com deficiência.",            "bpc-loas.html"),
    ("refresh","Já recebo e quero revisar",     "Será que o seu benefício pode estar com valor menor do que deveria?",            "revisoes-de-beneficio.html"),
]

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
        <span class="brand__logo"><img src="assets/img/logo.svg" alt="Advocacia Previdenciária"></span>
        <span class="brand__name">Advocacia Previdenciária</span>
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
          <div class="footer-brand">
            <img src="assets/img/logo.svg" alt="Advocacia Previdenciária">
            <span>Advocacia Previdenciária</span>
          </div>
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
  <link rel="icon" type="image/svg+xml" href="assets/img/logo.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Inter:wght@400;500;600;700&display=swap">
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
  <section class="page-hero" style="background-image: linear-gradient(135deg, rgba(31,33,37,.93), rgba(43,45,49,.82)), url('assets/img/{CATEGORY_IMG.get(page['category'],'')}');">
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
        <p style="margin:0;">Agende uma análise do seu caso com o Dr. {esc(OFFICE['advogado_curto'])}.</p>
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
      <div class="cat-block">
        <div class="cat-banner" style="background-image:url('assets/img/{CATEGORY_IMG.get(cat,'')}')">
          <div class="cat-banner__inner">
            <span class="cat-block__ico">{icon(CATEGORY_ICON.get(cat,''))}</span>
            <div>
              <h2>{esc(cat)}</h2>
              <p>{esc(CATEGORY_INTRO.get(cat,''))}</p>
            </div>
          </div>
        </div>
        <div class="grid grid--3">{''.join(cards)}</div>
      </div>""")

    sit_cards = "".join(f'''
        <a class="card situation" href="{href}">
          <span class="feature__ico">{icon(ic)}</span>
          <h3>{esc(t)}</h3>
          <p>{esc(d)}</p>
          <span class="card__link">Ver como funciona</span>
        </a>''' for ic, t, d, href in SITUATIONS)

    body = f"""
  <section class="hero">
    <div class="container hero__inner">
      <div class="hero__text">
        <span class="hero__badge">Advocacia exclusivamente previdenciária</span>
        <h1>Seus direitos no INSS, resolvidos sem complicação.</h1>
        <p>Aposentadoria, auxílios, BPC, pensão e revisões explicados em linguagem simples — com atendimento humano em Monte Alto/SP e on-line para todo o Brasil.</p>
        <div class="hero__actions">
          <a class="btn btn--primary" href="{WA_URL}" target="_blank" rel="noopener">Quero saber se tenho direito</a>
          <a class="btn btn--ghost" href="#situacoes">Ver a minha situação</a>
        </div>
        <div class="hero__meta">
          <span>{esc(OFFICE['oab'])}</span>
          <span>Monte Alto/SP e região</span>
          <span>Atendimento presencial e on-line</span>
        </div>
      </div>
      <div class="hero__emblem">
        <div class="hero__photo"><img src="assets/img/hero.jpg" alt="Atendimento jurídico previdenciário" loading="lazy"></div>
      </div>
    </div>
  </section>

  <section class="section section--tight section--gray">
    <div class="container">
      <div class="features">
        <div class="feature"><span class="feature__ico">{icon('shield')}</span><div><h3>Só de Previdenciário</h3><p>Cuidamos exclusivamente de casos do INSS. É o que fazemos todos os dias.</p></div></div>
        <div class="feature"><span class="feature__ico">{icon('pin')}</span><div><h3>Pertinho de você</h3><p>Escritório em frente ao INSS de Monte Alto e atendimento on-line para todo o Brasil.</p></div></div>
        <div class="feature"><span class="feature__ico">{icon('chat')}</span><div><h3>Sem juridiquês</h3><p>Explicamos tudo em palavras simples e acompanhamos você em cada passo.</p></div></div>
      </div>
    </div>
  </section>

  <section class="section" id="situacoes">
    <div class="container">
      <div class="section__head">
        <div class="eyebrow">Comece por aqui</div>
        <h2>Em qual situação você está?</h2>
        <p class="lead">Escolha a opção mais parecida com o seu caso. A gente te orienta com clareza, sem compromisso.</p>
        <div class="rule"></div>
      </div>
      <div class="grid grid--3">{sit_cards}</div>
    </div>
  </section>

  <section class="section section--gray" id="servicos">
    <div class="container">
      <div class="section__head">
        <div class="eyebrow">Áreas de atuação</div>
        <h2>Todos os benefícios que cuidamos</h2>
        <p class="lead">Se preferir, veja por tipo de benefício. Toque para entender cada um em palavras simples.</p>
        <div class="rule"></div>
      </div>
      {''.join(cat_sections)}
    </div>
  </section>

  <section class="section">
    <div class="container">
      <div class="section__head">
        <div class="eyebrow">Como funciona</div>
        <h2>Do primeiro contato à solução</h2>
        <div class="rule"></div>
      </div>
      <div class="steps">
        <div class="step"><div class="step__num">1</div><h3>Conversa inicial</h3><p>Você relata sua situação pelo WhatsApp ou presencialmente. Entendemos o que você precisa.</p></div>
        <div class="step"><div class="step__num">2</div><h3>Análise do caso</h3><p>Estudamos seu CNIS e seus documentos para identificar o melhor caminho — administrativo ou judicial.</p></div>
        <div class="step"><div class="step__num">3</div><h3>Acompanhamento</h3><p>Conduzimos o pedido e mantemos você informado de cada etapa, em linguagem clara.</p></div>
      </div>
    </div>
  </section>

  <section class="section section--gray">
    <div class="container">
      <div class="section__head">
        <div class="eyebrow">Fique atento</div>
        <h2>Não desista do seu direito</h2>
        <div class="rule"></div>
      </div>
      <div class="features">
        <div class="feature"><span class="feature__ico">{icon('alert')}</span><div><h3>O INSS negou?</h3><p>Um “não” do INSS nem sempre é o fim. Muitas decisões podem ser revistas por recurso ou na Justiça.</p></div></div>
        <div class="feature"><span class="feature__ico">{icon('refresh')}</span><div><h3>Recebe só o mínimo?</h3><p>Alguns benefícios saem com valor menor do que o devido. Vale conferir se o seu pode aumentar.</p></div></div>
        <div class="feature"><span class="feature__ico">{icon('clock')}</span><div><h3>Cuidado com os prazos</h3><p>Certos direitos têm prazo para serem pedidos ou revisados. Quanto antes você analisar, melhor.</p></div></div>
      </div>
    </div>
  </section>

  <section class="cta-strip section">
    <div class="container">
      <div>
        <h2>Ainda com dúvida? A gente te ajuda.</h2>
        <p>A primeira conversa é para entender a sua situação e dizer, com sinceridade, se você tem direito.</p>
      </div>
      <a class="btn btn--primary" href="{WA_URL}" target="_blank" rel="noopener">Falar no WhatsApp agora</a>
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
  <section class="page-hero" style="background-image: linear-gradient(135deg, rgba(31,33,37,.93), rgba(43,45,49,.82)), url('assets/img/about.jpg');">
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
