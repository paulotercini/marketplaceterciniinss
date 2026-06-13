#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do site (novo formato) — Advocacia Previdenciária / Paulo R. Tercini Filho.
Lê site_content/*.json e gera docs/*.html. Hospedagem: GitHub Pages (pasta /docs).
Uso: python3 build_site.py
"""
import json, os, html, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT_DIR = ROOT / "site_content"
OUT_DIR = ROOT / "docs"
ASSET_V = "11"

OFFICE = {
    "advogado": "Paulo Roberto Tercini Filho",
    "oab": "OAB/SP 331.110",
    "endereco": "Rua Rui Barbosa, nº 663, Centro — Monte Alto/SP",
    "endereco_obs": "Em frente ao INSS",
    "tel_label": "(16) 3242-2908",
    "tel_link": "551632422908",
    "wa_label": "(16) 98140-9271",
    "wa_link": "5516981409271",
    "email": "contato@advprev.com",
    "maps_q": "Rua Rui Barbosa 663 Centro Monte Alto SP",
}
GOOGLE_URL = ("https://www.google.com.br/search?sca_esv=c297d454acf6f541&kgmid=/g/11f57hvp23"
              "&q=Advocacia+Previdenci%C3%A1ria+-+Paulo+Roberto+Tercini+Filho")

TEL_URL = f"tel:+{OFFICE['tel_link']}"

def wa(text="Olá, gostaria de tirar uma dúvida previdenciária."):
    return f"https://wa.me/{OFFICE['wa_link']}?text=" + urllib.parse.quote(text)

CATEGORY_ORDER = ["Aposentadorias", "Incapacidade", "Outros benefícios", "Assistencial", "Revisões e Planejamento"]
CATEGORY_INTRO = {
    "Aposentadorias": "Regras de transição, direito adquirido e modalidades especiais após a Reforma da Previdência (EC 103/2019).",
    "Incapacidade": "Auxílios e aposentadorias para quem teve a capacidade de trabalho afetada por doença ou acidente.",
    "Outros benefícios": "Benefícios pagos aos dependentes do segurado e à maternidade.",
    "Assistencial": "Amparo assistencial (BPC/LOAS) ao idoso e à pessoa com deficiência em situação de miserabilidade — sem exigir contribuições.",
    "Revisões e Planejamento": "Revisar benefícios já concedidos e planejar a melhor aposentadoria possível.",
}
CAT_TAB = {"Aposentadorias": "apo", "Incapacidade": "inc", "Outros benefícios": "out", "Assistencial": "ass", "Revisões e Planejamento": "rev"}

SITUATIONS = [
    ("Quero me aposentar", "Descubra a melhor regra e o melhor valor antes de dar entrada no pedido.", "planejamento-previdenciario.html"),
    ("Meu pedido foi negado", "O INSS negou ou cortou seu benefício? Em muitos casos é possível reverter.", "contato.html"),
    ("Adoeci e não consigo trabalhar", "Auxílio-doença ou aposentadoria por incapacidade, quando a saúde não permite.", "auxilio-doenca.html"),
    ("Perdi um familiar", "Pensão por morte para quem dependia financeiramente da pessoa.", "pensao-por-morte.html"),
    ("Tenho deficiência ou baixa renda", "BPC/LOAS: um salário mínimo para idosos e pessoas com deficiência.", "bpc-deficiente.html"),
    ("Já recebo e quero revisar", "Será que o seu benefício pode estar com valor menor do que deveria?", "revisoes-de-beneficio.html"),
]

# Avaliações reais (Google) selecionadas
TESTIMONIALS = [
    ("Paulo Eduardo Correia", "Local Guide · Google", "Excelente atendimento, acompanhamento real e exclusivo. Mais que recomendo."),
    ("Carla Barroso", "Atendimento on-line", "Recomendo! Dr. Paulo é um advogado que entende do assunto, prestativo e com excelente atendimento. Mesmo morando fora do Brasil, pude esclarecer minhas dúvidas."),
    ("Rosemary A. P. Beltrame", "Avaliação no Google", "Muito gratificante. Ótimos profissionais e todas as dúvidas foram sanadas. Pontualidade no atendimento. Recomendo."),
    ("Cleibi Barroso", "Atendimento on-line", "Quero expressar minha sincera gratidão ao Dr. Paulo Tercini Filho por esclarecer o meu caso, daqui do Japão."),
    ("Sérgio Lindo", "Avaliação no Google", "Vim a uma consulta com o Dr. Paulo Tercini Filho. Previdenciário, um excelente profissional. Recomendo."),
    ("Cristiana Rodrigues", "Avaliação no Google", "Excelente atendimento, desde a recepção até os advogados."),
]

# ---------------- SVGs ----------------
WA_SVG = ('<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.929-1.616z"/></svg>')
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>'
CARET = '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>'
INFO_SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="19"/><path d="M24 16v10"/><circle cx="24" cy="32" r="1.4" fill="currentColor" stroke="none"/></svg>'
STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/></svg>'
def peaks(cls):
    return (f'<svg class="{cls}" viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="3" '
            f'stroke-linejoin="round"><polyline points="8,114 68,16 128,114"/><polyline points="72,114 132,28 192,114"/></svg>')
SCALE_SVG = ('<svg class="scale" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
             '<line x1="50" y1="20" x2="50" y2="80"/><line x1="36" y1="84" x2="64" y2="84"/><line x1="44" y1="80" x2="56" y2="80"/>'
             '<line x1="14" y1="30" x2="86" y2="30"/><circle cx="50" cy="23" r="3" fill="currentColor" stroke="none"/>'
             '<path d="M14 30 L7 46 M14 30 L21 46"/><path d="M5 46 Q14 60 23 46"/>'
             '<path d="M86 30 L79 46 M86 30 L93 46"/><path d="M77 46 Q86 60 95 46"/></svg>')

def esc(s):
    return html.escape(str(s), quote=True)

# ---------------- Components ----------------
def head(title, desc, extra_css):
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}" />
<meta property="og:title" content="{esc(title)}" />
<meta property="og:description" content="{esc(desc)}" />
<meta property="og:type" content="website" />
<link rel="icon" type="image/svg+xml" href="assets/logo.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,400;0,600;0,700;1,500;1,600&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/styles.css?v={ASSET_V}" />
<link rel="stylesheet" href="assets/{extra_css}?v={ASSET_V}" />
</head>
<body>"""

def header(pages_by_cat):
    cols = ""
    for cat in CATEGORY_ORDER:
        links = "".join(f'<a href="{p["slug"]}.html">{esc(p["nav_label"])}</a>' for p in pages_by_cat.get(cat, []))
        cols += f'<div class="mcol"><h6>{esc(cat)}</h6>{links}</div>'
    return f"""
<header class="site-head" id="head">
  <div class="wrap head-row">
    <a class="brand" href="index.html" aria-label="Início">
      <img src="assets/logo.png" alt="Advocacia Previdenciária" onerror="this.onerror=null;this.src='assets/logo.svg'" />
      <span class="bk"><b>Advocacia Previdenciária</b><span>Paulo Roberto Tercini Filho</span></span>
    </a>
    <nav class="nav" aria-label="Principal">
      <div class="nav-item"><a href="index.html">Início</a></div>
      <div class="nav-item">
        <button type="button">Escritório {CARET}</button>
        <div class="mega">
          <a href="sobre.html#sec1"><b>Quem somos</b></a>
          <a href="sobre.html#sec2"><b>Como trabalhamos</b></a>
          <a href="sobre.html#sec3"><b>Áreas de atuação</b></a>
          <a href="contato.html"><b>Localização</b></a>
        </div>
      </div>
      <div class="nav-item">
        <button type="button">Benefícios {CARET}</button>
        <div class="mega mega-wide">{cols}</div>
      </div>
      <div class="nav-item"><a href="contato.html">Contato</a></div>
    </nav>
    <div class="head-cta">
      <a class="btn btn-primary" href="{wa()}" target="_blank" rel="noopener">{WA_SVG} WhatsApp</a>
    </div>
    <button class="burger" id="burger" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
  </div>
</header>"""

def footer(pages_by_cat):
    apo = "".join(f'<a href="{p["slug"]}.html">{esc(p["nav_label"])}</a>' for p in pages_by_cat.get("Aposentadorias", []))
    mais = (
        '<a href="auxilio-doenca.html">Auxílio-Doença</a>'
        '<a href="auxilio-acidente.html">Auxílio-Acidente</a>'
        '<a href="bpc-idoso.html">BPC ao Idoso</a>'
        '<a href="bpc-deficiente.html">BPC ao Deficiente</a>'
        '<a href="pensao-por-morte.html">Pensão por Morte</a>'
        '<a href="revisoes-de-beneficio.html">Revisões</a>'
        '<a href="sobre.html">O Escritório</a>'
        '<a href="contato.html">Contato</a>'
    )
    return f"""
<footer class="site-foot">
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <img src="assets/logo.png" alt="Advocacia Previdenciária" onerror="this.onerror=null;this.src='assets/logo-white.svg'" />
        <div class="bk"><b>Advocacia Previdenciária</b><span>{esc(OFFICE['advogado'])} · {esc(OFFICE['oab'])}</span></div>
        <p class="foot-addr">
          {esc(OFFICE['endereco'])}<br/>{esc(OFFICE['endereco_obs'])}<br/><br/>
          <a href="{TEL_URL}">{esc(OFFICE['tel_label'])}</a> · <a href="{wa()}" target="_blank" rel="noopener">WhatsApp {esc(OFFICE['wa_label'])}</a><br/>
          <a href="mailto:{OFFICE['email']}">{esc(OFFICE['email'])}</a>
        </p>
      </div>
      <div class="foot-col"><h5>Aposentadorias</h5>{apo}</div>
      <div class="foot-col"><h5>Benefícios &amp; Mais</h5>{mais}</div>
    </div>
    <div class="foot-bottom">
      <span>© 2026 Advocacia Previdenciária — Todos os direitos reservados.</span>
      <span class="foot-disc">Conteúdo de caráter meramente informativo. Não constitui consulta jurídica, captação de clientela nem promessa de resultado, em conformidade com o Código de Ética e Disciplina e o Provimento nº 205/2021 do CFOAB.</span>
    </div>
  </div>
</footer>
<a class="wa-float" href="{wa()}" target="_blank" rel="noopener" aria-label="WhatsApp">{WA_SVG}</a>
<script src="assets/app.js?v={ASSET_V}"></script>
</body>
</html>"""

# ---------------- Service page ----------------
def render_blocks(blocks):
    out = []
    for b in blocks:
        t = b.get("type")
        if t == "p":
            out.append(f"<p>{esc(b['text'])}</p>")
        elif t == "ul":
            out.append("<ul>" + "".join(f"<li>{esc(i)}</li>" for i in b.get("items", [])) + "</ul>")
        elif t == "callout":
            out.append(f'<div class="callout">{INFO_SVG}<p><b>Importante</b> {esc(b["text"])}</p></div>')
    return "\n".join(out)

def service_page(page, pages_by_cat):
    cat = page["category"]
    # monta itens numerados (seções + documentos + faq)
    items = []  # (id, label, inner_html)
    for i, s in enumerate(page.get("sections", [])):
        items.append((f"sec{i+1}", s["heading"], render_blocks(s.get("blocks", []))))
    if page.get("documentos"):
        docs = "".join(f"<li>{esc(d)}</li>" for d in page["documentos"])
        items.append(("documentos", "Documentos que ajudam",
                      f"<p>Quanto mais organizada a documentação, mais forte fica o pedido. Em geral, reunimos:</p><ul>{docs}</ul>"))
    if page.get("faq"):
        dets = "".join(
            f'<details{" open" if k==0 else ""}><summary>{esc(f["q"])}<span class="pm"></span></summary><p>{esc(f["a"])}</p></details>'
            for k, f in enumerate(page["faq"]))
        items.append(("faq", "Perguntas frequentes", f'<div class="faq">{dets}</div>'))

    toc = "".join(
        f'<a href="#{i_id}"{" class=active" if n==0 else ""}>{esc(label)}</a>'
        for n, (i_id, label, _) in enumerate(items))
    secs = "".join(
        f'<section id="{i_id}"><h2><span class="n">{n+1:02d}</span> {esc(label)}</h2>{inner}</section>'
        for n, (i_id, label, inner) in enumerate(items))

    intro = "".join(f"<p>{esc(p)}</p>" for p in page.get("intro", []))
    fc = [("Área", cat)] + [tuple(x) for x in page.get("facts", [])] + [("Atendimento", "Presencial e on-line")]
    facts = "".join(f'<div class="fact-row"><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in fc)

    body = f"""
<section class="page-hero">
  {peaks("page-hero-peaks")}
  <div class="wrap">
    <nav class="crumb" aria-label="Trilha">
      <a href="index.html">Início</a>{CHEV}<a href="index.html#servicos">{esc(cat)}</a>{CHEV}<span class="here">{esc(page['title'])}</span>
    </nav>
    <div class="page-hero-grid">
      <div>
        <span class="cat">{esc(cat)}</span>
        <h1>{esc(page['title'])}</h1>
        <p class="lede">{esc(page.get('hero_subtitle',''))}</p>
      </div>
      <dl class="fact-card">
        <h4>Resumo</h4>
        {facts}
      </dl>
    </div>
  </div>
</section>

<div class="article">
  <div class="wrap article-grid">
    <aside class="toc"><h5>Nesta página</h5>{toc}</aside>
    <article class="prose">
      {intro}
      {secs}
      <div class="page-cta">
        {peaks("cp")}
        <h3>Precisa de orientação sobre {esc(page['title'])}?</h3>
        <p>Conte a sua situação para a gente. A primeira conversa é para entender o seu caso e dizer, com sinceridade, se você tem direito.</p>
        <a class="btn btn-primary" href="{wa('Olá, gostaria de tirar uma dúvida sobre ' + page['title'] + '.')}" target="_blank" rel="noopener">{WA_SVG} Falar no WhatsApp</a>
      </div>
    </article>
  </div>
</div>"""
    return head(f"{page['title']} — Advocacia Previdenciária", page.get("meta_description", ""), "page.css") \
        + header(pages_by_cat) + body + footer(pages_by_cat)

# ---------------- Home ----------------
def home_page(pages_by_cat):
    # situações
    sit = ""
    for n, (t, d, href) in enumerate(SITUATIONS, 1):
        sit += f"""
      <a class="sit-card" href="{href}" data-reveal>
        <span class="sit-num">{n:02d}</span><h3>{esc(t)}</h3>
        <p>{esc(d)}</p>
        <span class="tlink">Ver como funciona {ARROW}</span>
      </a>"""
    # tabs + painéis
    tabs, panels = "", ""
    for k, cat in enumerate(CATEGORY_ORDER):
        pages = pages_by_cat.get(cat, [])
        tabs += f'<button class="tab{" active" if k==0 else ""}" data-tab="{CAT_TAB[cat]}">{esc(cat)} <span class="c">{len(pages):02d}</span></button>'
        cards = "".join(
            f'<a class="ben-card" href="{p["slug"]}.html"><h4>{esc(p["title"])}</h4><p>{esc(p.get("hero_subtitle",""))}</p><span class="tlink">Ver detalhes {ARROW}</span></a>'
            for p in pages)
        panels += f'<div class="panel{" show" if k==0 else ""}" id="{CAT_TAB[cat]}"><p class="panel-intro">{esc(CATEGORY_INTRO[cat])}</p><div class="ben-grid">{cards}</div></div>'

    quotes_html = "".join(f'''
      <div class="quote-card" data-reveal>
        <div class="qm">“</div>
        <div class="stars">{STAR*5}</div>
        <p>{esc(t)}</p>
        <div class="who"><span class="av">{esc("".join(w[0] for w in n.split()[:2]).upper())}</span><div><b>{esc(n)}</b><span>{esc(s)}</span></div></div>
      </div>''' for n, s, t in TESTIMONIALS)

    body = f"""
<section class="hero">
  {peaks("hero-bg-peaks")}
  <div class="wrap hero-grid">
    <div class="hero-copy" data-reveal>
      <span class="eyebrow">Advocacia exclusivamente previdenciária</span>
      <h1>Seus direitos no INSS, resolvidos <em>sem complicação.</em></h1>
      <p class="lede">Aposentadoria, auxílios, BPC, pensão e revisões explicados em linguagem simples — com atendimento humano em Monte Alto/SP e on-line para todo o Brasil.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="{wa()}" target="_blank" rel="noopener">Quero saber se tenho direito {ARROW}</a>
        <a class="btn btn-ghost" href="#situacoes">Ver a minha situação</a>
      </div>
    </div>
    <div class="hero-visual" data-reveal>
      <div class="ph hero-photo"><img src="assets/hero.jpg" alt="Pessoa idosa — público da advocacia previdenciária" loading="lazy"></div>
      <div class="hero-badge">{SCALE_SVG}<p><b>13 anos exclusivos</b>Atuação só em Direito Previdenciário — todos os dias.</p></div>
    </div>
  </div>
</section>

<section class="stats">
  <div class="wrap stats-grid">
    <div class="stat" data-reveal><b>13<span class="u">+</span></b><span>anos atuando exclusivamente com Direito Previdenciário</span></div>
    <div class="stat" data-reveal><b>100<span class="u">%</span></b><span>foco no INSS — nenhuma outra área de atuação</span></div>
    <div class="stat" data-reveal><b>Brasil</b><span>atendimento presencial em Monte Alto e on-line para todo o país</span></div>
    <div class="stat" data-reveal><b>OAB/SP</b><span>331.110 — inscrição regular e atuação ética</span></div>
  </div>
</section>

<section class="diff">
  <div class="wrap diff-grid">
    <div class="diff-cell" data-reveal>
      <svg class="diff-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="17"/><path d="M16 24l5.5 5.5L33 18"/></svg>
      <h3>Só de Previdenciário</h3><p>Cuidamos exclusivamente de casos do INSS. É o que fazemos todos os dias.</p>
    </div>
    <div class="diff-cell" data-reveal>
      <svg class="diff-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 43s14-11.5 14-23A14 14 0 0010 20c0 11.5 14 23 14 23z"/><circle cx="24" cy="20" r="5"/></svg>
      <h3>Pertinho de você</h3><p>Escritório em frente ao INSS de Monte Alto e atendimento on-line para todo o Brasil.</p>
    </div>
    <div class="diff-cell" data-reveal>
      <svg class="diff-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M41 28a4 4 0 01-4 4H17l-9 8V12a4 4 0 014-4h25a4 4 0 014 4z"/><path d="M16 18h16M16 24h10"/></svg>
      <h3>Sem juridiquês</h3><p>Explicamos tudo em palavras simples e acompanhamos você em cada passo.</p>
    </div>
  </div>
</section>

<section class="section" id="situacoes">
  <div class="wrap">
    <div class="sec-head" data-reveal>
      <span class="eyebrow">Comece por aqui</span>
      <h2>Em qual situação você está?</h2>
      <p>Escolha a opção mais parecida com o seu caso. A gente te orienta com clareza, sem compromisso.</p>
    </div>
    <div class="sit-grid">{sit}</div>
  </div>
</section>

<section class="section areas" id="servicos">
  <div class="wrap">
    <div class="sec-head" data-reveal>
      <span class="eyebrow">Áreas de atuação</span>
      <h2>Todos os benefícios que cuidamos</h2>
      <p>Veja por tipo de benefício. Toque numa categoria para entender cada um em palavras simples.</p>
    </div>
    <div class="tabs" data-reveal role="tablist">{tabs}</div>
    {panels}
  </div>
</section>

<section class="section equi">
  {peaks("equi-peaks")}
  <div class="wrap equi-grid">
    <div data-reveal>
      <svg class="equi-scale" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="50" y1="20" x2="50" y2="80"/><line x1="34" y1="84" x2="66" y2="84"/><line x1="44" y1="80" x2="56" y2="80"/>
        <line x1="12" y1="30" x2="88" y2="30"/><circle cx="50" cy="23" r="3" fill="currentColor" stroke="none"/>
        <path d="M12 30 L5 46 M12 30 L19 46"/><path d="M3 46 Q12 61 21 46"/>
        <path d="M88 30 L81 46 M88 30 L95 46"/><path d="M79 46 Q88 61 97 46"/></svg>
      <span class="eyebrow on-dark">Como funciona</span>
      <h2>Do primeiro contato à solução</h2>
      <p class="lede">Equilíbrio entre técnica e cuidado: conduzimos cada caso com método claro e atenção a quem mais importa — você.</p>
    </div>
    <div class="steps">
      <div class="step active" data-reveal><span class="step-n">1</span><div><h3>Conversa inicial</h3><p>Você relata sua situação pelo WhatsApp ou presencialmente. Entendemos o que você precisa.</p></div></div>
      <div class="step" data-reveal><span class="step-n">2</span><div><h3>Análise do caso</h3><p>Estudamos seu CNIS e seus documentos para identificar o melhor caminho — administrativo ou judicial.</p></div></div>
      <div class="step" data-reveal><span class="step-n">3</span><div><h3>Acompanhamento</h3><p>Conduzimos o pedido e mantemos você informado de cada etapa, em linguagem clara.</p></div></div>
    </div>
  </div>
</section>

<section class="section about">
  <div class="wrap about-grid">
    <div class="about-photo ph" data-reveal><img src="assets/about.jpg" alt="Atendimento jurídico previdenciário" loading="lazy"></div>
    <div data-reveal>
      <span class="eyebrow">O escritório</span>
      <h2>Atendimento humano, foco total no seu benefício</h2>
      <p class="lede">Há 13 anos dedicados exclusivamente ao Direito Previdenciário, ajudando quem precisa do INSS a conquistar — e manter — o benefício a que tem direito.</p>
      <p class="body">O escritório fica em frente ao INSS de Monte Alto/SP, o que aproxima o atendimento de quem mais precisa. Para o restante do Brasil, o acompanhamento é feito on-line, com a mesma proximidade e em linguagem simples, do primeiro contato à solução.</p>
      <div class="sig">{SCALE_SVG.replace('class="scale"','class="seal"')}<div class="nm"><b>{esc(OFFICE['advogado'])}</b><span>Advogado · {esc(OFFICE['oab'])}</span></div></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="quotes-head">
      <div class="sec-head" data-reveal>
        <span class="eyebrow">Quem confiou</span>
        <h2>Avaliações de quem foi atendido</h2>
      </div>
      <a class="gbadge" href="{GOOGLE_URL}" target="_blank" rel="noopener" data-reveal>
        <div><span class="gmark">★ Google</span><div class="stars">{STAR*5}</div></div>
        <div class="gtxt"><b>Ver avaliações</b>no nosso perfil do Google</div>
      </a>
    </div>
    <div class="quote-grid">{quotes_html}
    </div>
    <div style="margin-top:26px"><a class="btn btn-ghost" href="{GOOGLE_URL}" target="_blank" rel="noopener">Ver todas as avaliações no Google {ARROW}</a></div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head" data-reveal>
      <span class="eyebrow">Fique atento</span>
      <h2>Não desista do seu direito</h2>
    </div>
    <div class="alert-grid">
      <div class="alert-card" data-reveal><span class="bar"></span>
        <svg class="alert-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M38 16a16 16 0 10-3 18"/><path d="M38 8v8h-8"/></svg>
        <h3>O INSS negou?</h3><p>Um “não” do INSS nem sempre é o fim. Muitas decisões podem ser revistas por recurso ou na Justiça.</p>
      </div>
      <div class="alert-card" data-reveal><span class="bar"></span>
        <svg class="alert-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 34l11-11 7 7 14-14"/><path d="M30 16h10v10"/></svg>
        <h3>Recebe só o mínimo?</h3><p>Alguns benefícios saem com valor menor do que o devido. Vale conferir se o seu pode aumentar.</p>
      </div>
      <div class="alert-card" data-reveal><span class="bar"></span>
        <svg class="alert-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="26" r="16"/><path d="M24 17v9l6 4M18 4h12"/></svg>
        <h3>Cuidado com os prazos</h3><p>Certos direitos têm prazo para serem pedidos ou revisados. Quanto antes você analisar, melhor.</p>
      </div>
    </div>
  </div>
</section>

<section class="section cta-final">
  <div class="wrap">
    <div class="cta-box" data-reveal>
      {peaks("cta-peaks")}
      <div><h2>Ainda com dúvida? A gente te ajuda.</h2><p>A primeira conversa é para entender a sua situação e dizer, com sinceridade, se você tem direito.</p></div>
      <div class="btns">
        <a class="btn btn-primary" href="{wa()}" target="_blank" rel="noopener">{WA_SVG} Falar no WhatsApp agora</a>
        <span class="note">Sem compromisso · resposta no mesmo dia</span>
      </div>
    </div>
  </div>
</section>"""
    return head("Advocacia Previdenciária — Advogado Previdenciário em Monte Alto/SP",
                "Advocacia previdenciária em Monte Alto/SP. Aposentadorias, auxílio-doença, BPC/LOAS, pensão por morte, auxílio-acidente e revisões de benefício junto ao INSS.",
                "home.css") + header(pages_by_cat) + body + footer(pages_by_cat)

# ---------------- Sobre ----------------
def about_page(pages_by_cat):
    body = f"""
<section class="page-hero">
  {peaks("page-hero-peaks")}
  <div class="wrap">
    <nav class="crumb"><a href="index.html">Início</a>{CHEV}<span class="here">O Escritório</span></nav>
    <div class="page-hero-grid">
      <div>
        <span class="cat">O Escritório</span>
        <h1>Atendimento humano, foco total no seu benefício</h1>
        <p class="lede">Advocacia dedicada exclusivamente ao Direito Previdenciário, conduzida por {esc(OFFICE['advogado'])} ({esc(OFFICE['oab'])}).</p>
      </div>
      <dl class="fact-card">
        <h4>O escritório</h4>
        <div class="fact-row"><dt>Advogado</dt><dd>Paulo R. Tercini Filho</dd></div>
        <div class="fact-row"><dt>Inscrição</dt><dd>{esc(OFFICE['oab'])}</dd></div>
        <div class="fact-row"><dt>Atuação</dt><dd>Só Previdenciário</dd></div>
        <div class="fact-row"><dt>Atendimento</dt><dd>Presencial / on-line</dd></div>
      </dl>
    </div>
  </div>
</section>
<div class="article">
  <div class="wrap article-grid">
    <aside class="toc"><h5>Nesta página</h5><a href="#sec1" class="active">Quem somos</a><a href="#sec2">Como trabalhamos</a><a href="#sec3">Áreas de atuação</a></aside>
    <article class="prose">
      <section id="sec1"><h2><span class="n">01</span> Quem somos</h2>
        <p>O escritório atua <strong>exclusivamente em Direito Previdenciário</strong> — o ramo que cuida da relação do cidadão com o INSS — sob a responsabilidade do advogado {esc(OFFICE['advogado'])} ({esc(OFFICE['oab'])}).</p>
        <p>Ficamos em Monte Alto/SP, <strong>em frente à agência do INSS</strong>, e atendemos segurados da cidade e de toda a região, presencialmente e a distância, com a mesma proximidade e em linguagem simples.</p>
      </section>
      <section id="sec2"><h2><span class="n">02</span> Como trabalhamos</h2>
        <ul>
          <li><strong>Diagnóstico antes de tudo.</strong> Analisamos o seu histórico de contribuições (CNIS) e os documentos do caso antes de indicar qualquer medida.</li>
          <li><strong>Via administrativa e judicial.</strong> Sempre que possível, buscamos a solução diretamente no INSS; quando necessário, levamos o caso ao Judiciário.</li>
          <li><strong>Transparência.</strong> Você acompanha cada etapa e recebe explicações claras, sem juridiquês.</li>
        </ul>
        <div class="callout">{INFO_SVG}<p><b>A primeira conversa é sem compromisso</b> Serve para entender a sua situação e indicar, com sinceridade, o melhor caminho para o seu caso.</p></div>
      </section>
      <section id="sec3"><h2><span class="n">03</span> Áreas de atuação</h2>
        <p>Aposentadorias (por tempo de contribuição, idade, especial, da pessoa com deficiência, do professor e rural), benefícios por incapacidade (auxílio-doença, aposentadoria por incapacidade e auxílio-acidente), benefício assistencial (BPC/LOAS), pensão por morte, salário-maternidade, auxílio-reclusão, além de revisões de benefícios já concedidos e planejamento previdenciário.</p>
        <div class="page-cta">{peaks("cp")}<h3>Vamos conversar sobre o seu caso?</h3><p>Atendimento em Monte Alto/SP e on-line para todo o Brasil.</p><a class="btn btn-primary" href="{wa()}" target="_blank" rel="noopener">{WA_SVG} Falar no WhatsApp</a></div>
      </section>
    </article>
  </div>
</div>"""
    return head("O Escritório — Advocacia Previdenciária", f"Conheça o escritório de {OFFICE['advogado']} ({OFFICE['oab']}), advocacia previdenciária em Monte Alto/SP.", "page.css") \
        + header(pages_by_cat) + body + footer(pages_by_cat)

# ---------------- Contato ----------------
def contact_page(pages_by_cat):
    maps_q = urllib.parse.quote(OFFICE["maps_q"])
    PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
    PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>'
    MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'
    body = f"""
<section class="page-hero">
  {peaks("page-hero-peaks")}
  <div class="wrap">
    <nav class="crumb"><a href="index.html">Início</a>{CHEV}<span class="here">Contato</span></nav>
    <div class="page-hero-grid">
      <div>
        <span class="cat">Contato</span>
        <h1>Fale com o escritório</h1>
        <p class="lede">Tire suas dúvidas pelo WhatsApp, telefone ou e-mail — ou venha nos visitar, em frente ao INSS de Monte Alto.</p>
      </div>
    </div>
  </div>
</section>
<div class="article">
  <div class="wrap">
    <div class="contact-grid">
      <div>
        <ul class="contact-list">
          <li><span class="contact-ic">{PIN}</span><div><b>Endereço</b>{esc(OFFICE['endereco'])}<br/><span style="color:var(--muted)">{esc(OFFICE['endereco_obs'])}</span></div></li>
          <li><span class="contact-ic">{PHONE}</span><div><b>Telefone</b><a href="{TEL_URL}">{esc(OFFICE['tel_label'])}</a></div></li>
          <li><span class="contact-ic">{WA_SVG}</span><div><b>WhatsApp</b><a href="{wa()}" target="_blank" rel="noopener">{esc(OFFICE['wa_label'])}</a></div></li>
          <li><span class="contact-ic">{MAIL}</span><div><b>E-mail</b><a href="mailto:{OFFICE['email']}">{esc(OFFICE['email'])}</a></div></li>
        </ul>
        <div style="margin-top:24px"><a class="btn btn-primary" href="{wa()}" target="_blank" rel="noopener">{WA_SVG} Iniciar conversa no WhatsApp</a></div>
      </div>
      <div class="mapwrap"><iframe loading="lazy" title="Mapa" src="https://www.google.com/maps?q={maps_q}&output=embed"></iframe></div>
    </div>
  </div>
</div>"""
    return head("Contato — Advocacia Previdenciária", f"Telefone, WhatsApp, e-mail e endereço do escritório em Monte Alto/SP.", "page.css") \
        + header(pages_by_cat) + body + footer(pages_by_cat)

# ---------------- Build ----------------
def main():
    pages = []
    for f in sorted(CONTENT_DIR.glob("*.json")):
        if f.name.startswith("_"):
            continue
        pages.append(json.loads(f.read_text(encoding="utf-8")))
    by_cat = {}
    for p in pages:
        by_cat.setdefault(p["category"], []).append(p)
    for c in by_cat:
        by_cat[c].sort(key=lambda x: x.get("order", 99))

    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "index.html").write_text(home_page(by_cat), encoding="utf-8")
    (OUT_DIR / "sobre.html").write_text(about_page(by_cat), encoding="utf-8")
    (OUT_DIR / "contato.html").write_text(contact_page(by_cat), encoding="utf-8")
    for p in pages:
        (OUT_DIR / f"{p['slug']}.html").write_text(service_page(p, by_cat), encoding="utf-8")
    print(f"OK — {len(pages)} páginas de serviço + 3 fixas (novo formato).")

if __name__ == "__main__":
    main()
