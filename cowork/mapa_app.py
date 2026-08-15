#!/usr/bin/env python3
"""Gera cowork/03-MAPA-APP.md — o índice navegável do crm/fase2/app.html.

Tudo aqui é extraído do arquivo, não escrito à mão: faixas de linha, funções,
chamadas ao Supabase, seletores consultados por string, estado global e
injeções de estilo. Rodar de novo depois de mexer no app.html refaz o mapa:

    python3 cowork/mapa_app.py

O que é heurística está dito no próprio documento gerado.
"""
import json, os, re, collections

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(RAIZ, "crm/fase2/app.html")
SAIDA = os.path.join(RAIZ, "cowork/03-MAPA-APP.md")
L = open(APP, encoding="utf8").read().splitlines()
N = len(L)


def faixa(ini, fim):
    return f"{ini}–{fim}"


def mil(n):
    return f"{n:,}".replace(",", ".")


def limpar(txt):
    """Comentário do código pode carregar número de exemplo tirado de caso real
    (protocolo, NB, CPF). Nenhum deles entra neste documento."""
    t = re.sub(r"\d{3}\.?\d{3}\.?\d{3}-?\d{2}", "[nº removido]", str(txt or ""))
    t = re.sub(r"\(?\d{2}\)?\s?\d{4,5}-?\d{4}", "[nº removido]", t)
    return re.sub(r"\d{8,}", "[nº removido]", t).replace("|", "/")


# ── 1. blocos do arquivo ──────────────────────────────────────────────────
def blocos_tag(tag):
    out, ini = [], None
    for i, ln in enumerate(L, 1):
        if re.search(rf"<{tag}[ >]", ln) and ini is None:
            ini = i
        if ini and re.search(rf"</{tag}>", ln):
            out.append((ini, i))
            ini = None
    return out


ESTILOS = blocos_tag("style")
SCRIPTS = blocos_tag("script")

# ── 2. seções, pelos comentários-faixa que o arquivo usa ──────────────────
# CSS:  /* ── TÍTULO ─────── */          JS:  // ── TÍTULO ───────
# o CSS usa dois formatos de cabeçalho: a faixa longa `/* ── TÍTULO ────` (que
# nem sempre fecha na mesma linha) e o rótulo curto `/* login */`
RE_SECAO_CSS = re.compile(r"^\s*/\*+\s*(?:──|══)\s*(.+?)\s*(?:[─═]{2,}.*)?$"
                          r"|^\s*/\*\s*([a-zà-ÿ][\wà-ÿ .,/&()-]{2,38}?)\s*\*/\s*$")
RE_SECAO_JS = re.compile(r"^\s*//\s*(?:──|══)\s*(.+?)\s*(?:──|══)+\s*$")


def secoes(ini, fim, regex):
    marcas = []
    for i in range(ini, fim + 1):
        m = regex.match(L[i - 1])
        if m:
            titulo = (m.group(1) or (m.group(2) if m.lastindex and m.lastindex > 1 else "")).strip(" ─═-*/")
            if titulo and len(titulo) < 90:
                marcas.append((i, titulo))
    out = []
    for n, (linha, titulo) in enumerate(marcas):
        prox = marcas[n + 1][0] - 1 if n + 1 < len(marcas) else fim
        out.append({"linha": linha, "ate": prox, "titulo": titulo})
    return out


# ── 3. funções ────────────────────────────────────────────────────────────
RE_FUNC = re.compile(
    r"^(?:\s*)(?:(async)\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|"
    r"^(?:\s*)(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(async)\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)")


def descricao(linha_def):
    """A frase que o próprio código já escreveu — acima da função, dentro dela,
    ou o próprio corpo quando cabe numa linha. Devolve (texto, de_onde)."""
    linhas = []
    i = linha_def - 1
    while i >= 1:
        t = L[i - 1].strip()
        if t.startswith("//"):
            texto = t.lstrip("/ ").strip()
            if not re.match(r"^[─═\-]+$", texto) and texto:
                linhas.insert(0, texto)
            i -= 1
            continue
        break
    if linhas:
        txt = re.sub(r"^(──|══)\s*", "", " ".join(linhas))
        corte = re.split(r"(?<=[.:;]) ", txt)
        frase = corte[0].strip()
        if len(frase) < 25 and len(corte) > 1:
            frase = (frase + " " + corte[1]).strip()
        return frase[:200], "comentário acima"
    # comentário logo dentro do corpo (o padrão do arquivo em função longa)
    for j in range(linha_def, min(linha_def + 4, N)):
        t = L[j].strip()
        if t.startswith("//"):
            return t.lstrip("/ ").strip()[:200], "comentário dentro"
        if t.startswith('"""') or t.startswith("/*"):
            return t.strip('"/* ').strip()[:200], "comentário dentro"
    # uma linha só: o corpo É a descrição
    corpo = L[linha_def - 1].split("//")[0].strip()
    if len(corpo) <= 150 and (corpo.endswith(";") or corpo.endswith("}")
                              or "=>" in corpo and corpo.count("{") == corpo.count("}")):
        return corpo, "o próprio corpo"
    # último recurso: a assinatura, que ao menos diz o que a função recebe
    ass = re.sub(r"^(async\s+)?function\s+", "", corpo)
    ass = re.sub(r"^(const|let|var)\s+", "", ass).rstrip("{ =>").strip()
    return ass[:120], "assinatura"


funcoes = {}
for i, ln in enumerate(L, 1):
    m = RE_FUNC.match(ln)
    if not m:
        continue
    nome = m.group(2) or m.group(3)
    if not nome or nome in funcoes:
        continue
    dentro_script = any(a <= i <= b for a, b in SCRIPTS)
    if not dentro_script:
        continue
    d, origem = descricao(i)
    funcoes[nome] = {"nome": nome, "linha": i, "desc": d, "desc_de": origem,
                     "async": bool(m.group(1) or m.group(4))}

defs = sorted((f["linha"], f["nome"]) for f in funcoes.values())


def dona_da_linha(linha):
    """De qual função é esta linha (a definição top-level mais próxima acima)."""
    esc = None
    for ln, nome in defs:
        if ln <= linha:
            esc = nome
        else:
            break
    return esc


# quem chama quem
chamadores = collections.defaultdict(set)
for i, ln in enumerate(L, 1):
    if not any(a <= i <= b for a, b in SCRIPTS):
        continue
    for m in re.finditer(r"\b([A-Za-z_$][\w$]*)\s*\(", ln):
        alvo = m.group(1)
        if alvo not in funcoes:
            continue
        if funcoes[alvo]["linha"] == i:
            continue
        dona = dona_da_linha(i)
        antes = ln[:m.start()]
        if re.search(r'onclick=|onchange=|oninput=|onkeydown=|onsubmit=', antes):
            chamadores[alvo].add("HTML inline")
        elif dona and dona != alvo:
            chamadores[alvo].add(dona)
        elif not dona:
            chamadores[alvo].add("topo do script")
        elif dona == alvo:
            chamadores[alvo].add("ela mesma")

# ── 4. Supabase, por tabela ───────────────────────────────────────────────
supa = collections.defaultdict(list)
for i, ln in enumerate(L, 1):
    for m in re.finditer(r"/rest/v1/([a-z_]+)", ln):
        tab = m.group(1)
        jan = " ".join(L[max(0, i - 4):i + 3])
        met = "GET"
        mm = re.search(r'method\s*:\s*"(POST|PATCH|DELETE|PUT)"', jan)
        if mm:
            met = mm.group(1)
        supa[tab].append({"linha": i, "metodo": met, "func": dona_da_linha(i)})

# ── 5. seletores consultados por string ───────────────────────────────────
ids, classes, datasets = collections.Counter(), collections.Counter(), collections.Counter()
for i, ln in enumerate(L, 1):
    for m in re.finditer(r'getElementById\(\s*["\']([\w:-]+)["\']', ln):
        ids[m.group(1)] += 1
    for m in re.finditer(r'querySelector(?:All)?\(\s*["\']([^"\']+)["\']', ln):
        alvo = m.group(1)
        for cls in re.findall(r"\.([\w-]+)", alvo):
            classes[cls] += 1
        for idd in re.findall(r"#([\w-]+)", alvo):
            ids[idd] += 1
        for d in re.findall(r"\[data-([\w-]+)", alvo):
            datasets[d] += 1
    for m in re.finditer(r'classList\.(?:contains|toggle|add|remove)\(\s*["\']([\w-]+)["\']', ln):
        classes[m.group(1)] += 1
    for m in re.finditer(r'closest\(\s*["\']([^"\']+)["\']', ln):
        for cls in re.findall(r"\.([\w-]+)", m.group(1)):
            classes[cls] += 1
    for m in re.finditer(r"dataset\.([\w$]+)", ln):
        datasets[m.group(1)] += 1

# ── 6. estado global ──────────────────────────────────────────────────────
RE_GLOBAL = re.compile(r"^(let|var)\s+(.+)$")
globais = {}
for i, ln in enumerate(L, 1):
    if not any(a <= i <= b for a, b in SCRIPTS):
        continue
    m = RE_GLOBAL.match(ln)
    if not m:
        continue
    corpo = m.group(2).split("//")[0]
    for parte in re.split(r",(?![^\[\]{}()]*[\]\)}])", corpo):
        nm = re.match(r"\s*([A-Za-z_$][\w$]*)", parte)
        if nm and nm.group(1) not in globais:
            globais[nm.group(1)] = {"linha": i, "decl": ln.strip()[:120]}

for g in globais:
    escrevem, leem = set(), set()
    pat_w = re.compile(rf"(?<![\w.]){re.escape(g)}\s*(=(?!=)|\+\+|--|\+=|-=)")
    pat_r = re.compile(rf"(?<![\w.$]){re.escape(g)}(?![\w$])")
    for i, ln in enumerate(L, 1):
        if not any(a <= i <= b for a, b in SCRIPTS) or i == globais[g]["linha"]:
            continue
        if not pat_r.search(ln):
            continue
        dona = dona_da_linha(i) or "topo do script"
        (escrevem if pat_w.search(ln) else leem).add(dona)
    globais[g]["escrevem"] = sorted(escrevem)
    globais[g]["leem"] = sorted(leem - escrevem)

# ── 7. estilo inline injetado pelo JS ─────────────────────────────────────
estilo_js = collections.defaultdict(list)
for i, ln in enumerate(L, 1):
    if not any(a <= i <= b for a, b in SCRIPTS):
        continue
    for m in re.finditer(r"\.style\.([\w]+)\s*=", ln):
        estilo_js[m.group(1)].append(i)
    for m in re.finditer(r"\.style\.(?:setProperty|cssText)", ln):
        estilo_js["setProperty/cssText"].append(i)
inline_tpl = [i for i, ln in enumerate(L, 1)
              if any(a <= i <= b for a, b in SCRIPTS) and 'style="' in ln]

DADOS = dict(total=N, estilos=ESTILOS, scripts=SCRIPTS, funcoes=funcoes,
             chamadores={k: sorted(v) for k, v in chamadores.items()},
             supa={k: v for k, v in supa.items()}, ids=ids, classes=classes,
             datasets=datasets, globais=globais,
             estilo_js={k: v for k, v in estilo_js.items()}, inline_tpl=inline_tpl)
json.dump({k: (v if not isinstance(v, collections.Counter) else dict(v))
           for k, v in DADOS.items()},
          open(os.path.join(os.path.dirname(SAIDA), "mapa_app.json"), "w", encoding="utf8"),
          ensure_ascii=False, indent=1, default=str)
print(f"{N} linhas | {len(funcoes)} funções | {len(supa)} tabelas | "
      f"{len(globais)} globais | {len(ids)} ids | {len(classes)} classes")

# ══════════════════════════════════════════════════════════════════════════
# O DOCUMENTO
# ══════════════════════════════════════════════════════════════════════════
# Descrições escritas à mão para as funções que desenham tela — o resto vem do
# comentário que já estava no código (a coluna "de onde" diz qual é qual).
MAO = {
 "render": "O despachante da coluna do meio: decide qual tela desenhar a partir de `visao` e da busca.",
 "montarSidebar": "Desenha a barra da esquerda inteira: listas, contadores, visões e o rodapé.",
 "pintarFicha": "Desenha a ficha do cliente inteira — cabeçalho, menu de abas e o painel da aba ativa.",
 "abrirFicha": "Abre a ficha de um cliente: busca as 6 consultas do cliente e manda pintar.",
 "repintarFicha": "Repinta a ficha SEM voltar à rede — é o que troca de aba e de sub-aba.",
 "cartaoCliente": "A linha do cliente na lista: nome, CPF, prazo com semáforo, perícia e os botões de ação.",
 "painelCadastroFicha": "Aba Cadastro: monta o sub-menu e chama a divisão escolhida.",
 "fichaIdentificacao": "Divisão Identificação: a grade de 12 colunas com os dados civis (F9.1).",
 "caixaAtendimento": "Divisão Anotações: o quadro do atendimento de quem ainda não tem caso.",
 "caixaDocumentos": "Divisão Documentos: os botões que geram procuração, contrato e declarações.",
 "catalogoNoCadastro": "Divisão Documentos: o catálogo de documentos por benefício (era a aba 8).",
 "painelConsulta": "Divisão Consulta: o site interno do escritório embutido num iframe.",
 "painelMensagensFicha": "Divisão Mensagens: modelos de mensagem prontos para o cliente.",
 "painelLembretes": "Aba Lembretes: aposentadoria provável, lembretes ativos e o formulário do lembrete novo.",
 "painelPericiasFicha": "Aba Perícias: a agenda de perícias e audiências do cliente.",
 "painelPagamentosFicha": "Aba Honorários: parcelas do cliente, com a corrente de conferência.",
 "painelEscritorio": "Sub-aba Andamentos do Escritório: a linha do tempo escrita pela equipe.",
 "painelINSS": "Sub-aba Andamentos INSS: o que o robô do PAT trouxe.",
 "painelCRPS": "Sub-aba Recurso (CRPS): sessões e decisões do Conselho, por recurso.",
 "painelCNJ": "Sub-aba Andamentos do CNJ: DataJud e coleta do PJe, por processo.",
 "painelTudo": "Sub-aba Caso completo: todas as fontes numa linha do tempo só.",
 "blocoFatos": "O cartão de fatos do processo, no topo da aba Casos.",
 "renderMeuDia": "Tela ☀️ Meu Dia.", "renderAgenda": "Tela 🩺 Agenda de perícias.",
 "renderCalendario": "Tela 📅 Calendário.", "renderPlanejado": "Tela 🗓 Planejado.",
 "renderDash": "Tela 📊 Painel de números.", "renderNovidades": "Tela 📰 Novidades dos portais.",
 "renderQuadro": "Tela 📌 Quadro (kanban por fase).", "renderVendas": "Tela 💼 Vendas.",
 "renderWhats": "Tela 💬 WhatsApp.", "renderAcervo": "Tela 📚 Acervo.",
 "renderConfig": "Tela ⚙️ Configurações.", "renderClaude": "Tela 🤖 Claude (sugestões).",
 "renderMencoes": "Tela @ Menções.", "renderParticulares": "Tela 📋 Minhas Tarefas.",
 "renderModelosDoc": "Tela 📄 Modelos de documento.", "renderNovoCliente": "Tela ＋ Novo cliente.",
 "renderImportarPat": "Tela de importação do PAT/INSS.", "renderRotinas": "Tela 🔁 Rotinas internas.",
 "renderParcerias": "Tela 🤝 Parcerias.", "renderMarketing": "Tela 📣 Marketing.",
 "api": "O único caminho até o Supabase: monta cabeçalho, trata 401 e devolve JSON.",
 "todas": "Busca paginada — é ela que evita o corte silencioso em 1000 linhas do PostgREST.",
 "carregar": "A carga inicial: traz colaboradores, clientes, casos e o resto para o D global.",
 "entrar": "Login por e-mail e senha no Supabase Auth.", "sair": "Encerra a sessão e limpa o guardado.",
 "aviso": "O toast do rodapé.", "caixa": "Abre o modal genérico com o HTML recebido.",
 "guardar": "Grava uma chave no localStorage (com try/catch: navegador em anônimo recusa).",
 "ler": "Lê uma chave do localStorage.", "esquecer": "Apaga uma chave do localStorage.",
 "guardaFunciona": "Testa se o navegador deixa gravar no localStorage.",
 "faltaConfig": "Diz se o endereço do Supabase ainda é o texto de instalação.",
 "guardarConfig": "Salva neste aparelho um endereço de banco diferente do padrão.",
 "hoje": "A data de hoje no relógio de Brasília, mesmo com o aparelho em outro fuso.",
 "agoraSP": "A hora de agora em Brasília.", "dataSP": "Timestamp do banco → data de Brasília.",
 "horaSP": "Timestamp do banco → hora de Brasília.", "fmt": "AAAA-MM-DD → DD.MM.AAAA.",
 "fmtTS": "Timestamp → DD.MM.AAAA.", "fmtCpf": "11 dígitos → 000.000.000-00.",
 "esc": "Escapa HTML — é a barreira contra script vindo de texto de cliente.",
 "escJs": "Escapa texto que vai dentro de um atributo onclick.",
 "moeda": "Número → R$ com duas casas.", "dsa": "Texto sem acento e em minúsculas, para comparar.",
 "plim": "O som curto de tarefa concluída.", "toast": "—",
 "digitando": "Reage ao que está sendo digitado na busca.",
 "pesquisar": "Procura clientes por nome, CPF, processo, protocolo ou NB.",
 "ligarCartoes": "Liga o clique, o menu do botão direito e o arraste em cada cartão da lista.",
 "irSubAba": "Troca a sub-aba da aba Casos e repinta.",
 "irSubCad": "Troca a divisão do Cadastro e repinta.",
 "iniciar": "O arranque: confere a sessão guardada e decide entre login e app.",
 "renovar": "Renova o token do Supabase antes de ele expirar.",
 "subirArquivo": "Envia um arquivo para o Storage do Supabase.",
 "abrirAnexo": "Abre um anexo do processo numa aba nova.",
 "lerRascunho": "Recupera o rascunho do andamento desta sessão do navegador.",
 "limparRascunho": "Apaga o rascunho depois que o andamento foi registrado.",
}

TELAS = [
 ("Barra da esquerda (listas e visões)", "montarSidebar"),
 ("Coluna do meio — despachante", "render"),
 ("Linha do cliente na lista", "cartaoCliente"),
 ("Ficha do cliente (moldura, abas)", "pintarFicha"),
 ("Aba **Cadastro**", "painelCadastroFicha"),
 ("Cadastro › Identificação", "fichaIdentificacao"),
 ("Cadastro › Anotações", "caixaAtendimento"),
 ("Cadastro › Documentos", "caixaDocumentos"),
 ("Cadastro › Documentos (catálogo por benefício)", "catalogoNoCadastro"),
 ("Cadastro › Consulta", "painelConsulta"),
 ("Cadastro › Mensagens", "painelMensagensFicha"),
 ("Aba **Lembretes**", "painelLembretes"),
 ("Aba **Casos** — cartão de fatos", "blocoFatos"),
 ("Casos › Andamentos do Escritório", "painelEscritorio"),
 ("Casos › Andamentos INSS", "painelINSS"),
 ("Casos › Recurso (CRPS)", "painelCRPS"),
 ("Casos › Andamentos do CNJ", "painelCNJ"),
 ("Casos › Caso completo", "painelTudo"),
 ("Aba **Perícias**", "painelPericiasFicha"),
 ("Aba **Honorários**", "painelPagamentosFicha"),
]

O = []
w = O.append
sec_css = secoes(ESTILOS[0][0], ESTILOS[0][1], RE_SECAO_CSS)
sec_js = secoes(SCRIPTS[0][0], SCRIPTS[0][1], RE_SECAO_JS)
html_ini, html_fim = ESTILOS[0][1] + 1, SCRIPTS[0][0] - 1
login = [i for i in range(html_ini, html_fim) if 'id="tela-login"' in L[i - 1]]
app = [i for i in range(html_ini, html_fim) if 'id="app"' in L[i - 1]]

w(f"""# Mapa do `crm/fase2/app.html`

Índice navegável de um arquivo de **{mil(N)} linhas** — {len(funcoes)} funções, um
`<style>`, um `<script>` e o HTML no meio. Gerado por
`cowork/mapa_app.py`, que lê o arquivo e extrai tudo: faixas de linha, funções,
chamadas ao banco, seletores, estado global e injeções de estilo. **Rodar de
novo depois de mexer no app refaz o mapa** — não edite este arquivo à mão:

```
python3 cowork/mapa_app.py
```

Levantado com o app na versão **09.00**.

## As cinco faixas do arquivo

| Faixa | Linhas | O que tem |
|---|---|---|
| Cabeçalho e `<style>` | {faixa(1, ESTILOS[0][1])} | tokens, reset e todo o CSS por componente |
| HTML do login | {faixa(login[0], app[0]-1) if login and app else '—'} | a tela de e-mail e senha |
| HTML do app | {faixa(app[0], html_fim) if app else '—'} | a moldura: barra, coluna do meio, ficha, modais |
| `<script>` | {faixa(SCRIPTS[0][0], SCRIPTS[0][1])} | **{mil(SCRIPTS[0][1]-SCRIPTS[0][0])} linhas** — o sistema inteiro |
| `<style>` de impressão e extras | {" · ".join(faixa(a,b) for a,b in ESTILOS[1:])} | folhas menores no fim do arquivo |
""")

w("\n## CSS, seção por seção\n")
w("As faixas vêm dos comentários `/* ── título ── */` que o próprio arquivo usa.\n")
w("| Linhas | Seção |")
w("|---|---|")
for s in sec_css:
    w(f"| {faixa(s['linha'], s['ate'])} | {s['titulo']} |")

w("\n## O `<script>`, seção por seção\n")
w("| Linhas | Seção |")
w("|---|---|")
for s in sec_js:
    w(f"| {faixa(s['linha'], s['ate'])} | {s['titulo']} |")

# ── que função desenha cada tela ──────────────────────────────────────────
w("""
---

## Que função desenha cada tela

O caminho é sempre o mesmo: um clique muda uma variável global, chama
`render()` (coluna do meio) ou `repintarFicha()` (ficha), e a função abaixo
devolve HTML que é jogado com `innerHTML`. **Não há framework** — quem repinta
é quem escreve a string.
""")
w("| Tela | Função | Linha |")
w("|---|---|---:|")
for rot, fn in TELAS:
    f = funcoes.get(fn)
    w(f"| {rot} | `{fn}()` | {f['linha'] if f else '—'} |")

w("\n### As telas da coluna do meio (fora da ficha)\n")
w("| Visão (`visao`) | Função | Linha |")
w("|---|---|---:|")
for v, fn in [("meudia","renderMeuDia"),("agenda","renderAgenda"),("calendario","renderCalendario"),
              ("planejado","renderPlanejado"),("dashboard","renderDash"),("novidades","renderNovidades"),
              ("quadro","renderQuadro"),("vendas","renderVendas"),("whatsapp","renderWhats"),
              ("acervo","renderAcervo"),("config","renderConfig"),("claude","renderClaude"),
              ("mencoes","renderMencoes"),("particulares","renderParticulares"),
              ("docmodelos","renderModelosDoc"),("novocliente","renderNovoCliente"),
              ("patinss","renderImportarPat"),("rotinas","renderRotinas"),
              ("parcerias","renderParcerias"),("marketing","renderMarketing")]:
    f = funcoes.get(fn)
    w(f"| `{v}` | `{fn}()` | {f['linha'] if f else '—'} |")

w("""
As listas por fase (🗓 Tarefas com Prazo, 🙋 Escritório, 🌻 INSS, 👪 Judicial,
🖥 Conselho, 💡 Petições, 🙏 Aposentadorias Futuras) não têm função própria:
caem no fim de `render()`, que monta os cartões com `cartaoCliente()`.
""")

# ── Supabase por tabela ───────────────────────────────────────────────────
w("""
---

## Onde estão as chamadas ao Supabase

Toda chamada passa por `api()`. A tabela abaixo é o índice por tabela do banco:
onde se lê, onde se escreve e de qual função.
""")
w("| Tabela | Chamadas | Métodos | Funções que tocam |")
w("|---|---:|---|---|")
for tab in sorted(supa, key=lambda t: -len(supa[t])):
    ch = supa[tab]
    metodos = sorted({c["metodo"] for c in ch})
    fs = sorted({c["func"] for c in ch if c["func"]})
    corte = ", ".join(f"`{x}`" for x in fs[:6]) + (f" +{len(fs)-6}" if len(fs) > 6 else "")
    w(f"| `{tab}` | {len(ch)} | {', '.join(metodos)} | {corte} |")

w("\n<details><summary>Cada chamada, com a linha</summary>\n")
for tab in sorted(supa):
    w(f"\n**`{tab}`**\n")
    for c in sorted(supa[tab], key=lambda x: x["linha"]):
        w(f"- linha {c['linha']} · {c['metodo']} · em `{c['func'] or 'topo do script'}()`")
w("\n</details>\n")

# ── seletores que não podem ser renomeados ────────────────────────────────
w("""
---

## O que NÃO pode ser renomeado

O JavaScript procura estes nomes **por string**. Renomear qualquer um deles no
HTML ou no CSS sem trocar também no script quebra a tela em silêncio — não dá
erro no console, o elemento simplesmente não é encontrado.

### `id` consultados por `getElementById` ou `#seletor`
""")
w("| id | Vezes |")
w("|---|---:|")
for k, n in sorted(ids.items(), key=lambda x: (-x[1], x[0])):
    w(f"| `{k}` | {n} |")

w("\n### classes consultadas por `querySelector`, `closest` ou `classList`\n")
w("| classe | Vezes |")
w("|---|---:|")
for k, n in sorted(classes.items(), key=lambda x: (-x[1], x[0])):
    w(f"| `.{k}` | {n} |")

w("\n### atributos `data-` lidos pelo script\n")
w("| atributo | Vezes |")
w("|---|---:|")
for k, n in sorted(datasets.items(), key=lambda x: (-x[1], x[0])):
    w(f"| `data-{k}` | {n} |")

# ── estado global ─────────────────────────────────────────────────────────
w("""
---

## Estado global

Não há gerenciador de estado: são variáveis soltas no topo do `<script>`. Quem
escreve numa delas muda a tela inteira na próxima pintura. A coluna "escrevem"
é a que importa quando algo aparece onde não devia.

Vale aqui o mesmo aviso da tabela de funções: a atribuição usa a definição mais
próxima acima da linha, então closure aninhada aparece com o nome do vizinho.
É pista para o grep, não verdade formal.
""")
w("| Variável | Linha | Escrevem | Leem |")
w("|---|---:|---|---|")
for g in sorted(globais, key=lambda x: globais[x]["linha"]):
    d = globais[g]
    esc = ", ".join(f"`{x}`" for x in d["escrevem"][:8]) + (f" +{len(d['escrevem'])-8}" if len(d["escrevem"]) > 8 else "")
    lem = ", ".join(f"`{x}`" for x in d["leem"][:8]) + (f" +{len(d['leem'])-8}" if len(d["leem"]) > 8 else "")
    w(f"| `{g}` | {d['linha']} | {esc or '—'} | {lem or '—'} |")

# ── estilo inline ─────────────────────────────────────────────────────────
w(f"""
---

## Onde o JavaScript injeta estilo

Duas formas, muito diferentes uma da outra.

**1. `elemento.style.X = …` — {sum(len(v) for v in estilo_js.values())} pontos.**
É o estilo que muda depois da pintura: mostrar, esconder, medir e posicionar.
São estes os que brigam com o CSS, porque ganham dele sempre.
""")
w("| Propriedade | Vezes | Linhas |")
w("|---|---:|---|")
for prop in sorted(estilo_js, key=lambda p: -len(estilo_js[p])):
    ls = estilo_js[prop]
    w(f"| `style.{prop}` | {len(ls)} | {', '.join(str(x) for x in ls[:12])}{' …' if len(ls) > 12 else ''} |")

w(f"""
**2. `style="…"` dentro do HTML gerado — {len(inline_tpl)} linhas.**
É o estilo escrito junto do template. Não some com um `classList`, e é o que
sobra da reforma visual: cada um destes é um lugar onde o CSS por classe ainda
não chegou. Um pente fino por aqui é o caminho natural de uma fase F13.
""")

# ── todas as funções ──────────────────────────────────────────────────────
w("""
---

## Todas as funções

Ordenadas por linha. A coluna "o que faz" vem do comentário que o próprio
código já tinha; quando não havia, vem do corpo (função de uma linha) ou da
assinatura — a coluna **de onde** diz qual é o caso, para ninguém confundir
descrição escrita com texto extraído. "Quem chama" sai da varredura de chamadas
no arquivo; `HTML inline` quer dizer que a chamada está num `onclick=` dentro de
um template.

**Um aviso sobre a coluna "quem chama".** A varredura atribui cada chamada à
definição de função mais próxima acima dela. Funcionaria perfeitamente se todo
o código fosse função top-level — e a maior parte é. Onde há closure aninhada
(um `.map(x => …)` dentro de uma função grande, um `onclick` montado em
string), a atribuição vai para a função que contém o trecho, o que costuma ser
o que se quer, mas pode apontar para a definição de uma linha que só está por
perto. Trate a coluna como **pista para o grep**, não como verdade formal.
""")
w("| Linha | Função | O que faz | De onde | Quem chama |")
w("|---:|---|---|---|---|")
for f in sorted(funcoes.values(), key=lambda x: x["linha"]):
    d = MAO.get(f["nome"])
    de = "escrito à mão" if d else f["desc_de"]
    txt = limpar(d or f["desc"] or "—")
    ch = sorted(chamadores.get(f["nome"], []))
    quem = ", ".join(f"`{c}`" for c in ch[:5]) + (f" +{len(ch)-5}" if len(ch) > 5 else "")
    w(f"| {f['linha']} | `{f['nome']}{'()' if not f['async'] else '() async'}` | {txt[:160]} | {de} | {quem or '**ninguém**'} |")

orfas = [f for f in funcoes.values() if not chamadores.get(f["nome"])]
w(f"""
### Funções que ninguém chama ({len(orfas)})

Podem ser ganchos de `window` usados por `onclick` montado em string que a
varredura não pegou, restos de recurso desligado, ou código morto de verdade.
Conferir antes de apagar.
""")
w(", ".join(f"`{f['nome']}` ({f['linha']})" for f in sorted(orfas, key=lambda x: x["linha"])))

texto = "\n".join(O) + "\n"
open(SAIDA, "w", encoding="utf8").write(texto)
print(f"{SAIDA}: {len(texto.splitlines())} linhas, {len(texto)} caracteres")
