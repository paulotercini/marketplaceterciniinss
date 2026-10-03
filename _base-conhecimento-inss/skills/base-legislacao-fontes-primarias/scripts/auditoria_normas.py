# -*- coding: utf-8 -*-
"""Auditoria mecânica das citações normativas da base (Onda 167, 03/10/2026).

Varre skills e agentes, extrai "art. N, § Nº, inciso, da <norma>" e "<norma>, art. N", e confere
cada citação contra o banco local do MCP `normas` (normas.db), sem internet.

Classifica cada ocorrência em:
  OK                     artigo, parágrafo e inciso existem na redação vigente
  ARTIGO_INEXISTENTE     a norma está na base e não tem esse artigo
  REVOGADO               o artigo existe, mas não tem redação vigente
  PARAGRAFO_INEXISTENTE  o artigo não tem esse parágrafo em redação alguma
  PARAGRAFO_ANTERIOR     o parágrafo só existe em redação anterior (pode ser citação histórica)
  INCISO_INEXISTENTE     o parágrafo (ou o caput) não tem esse inciso
  NUMERO_DIVERGENTE      a frase atribui ao dispositivo um percentual ou prazo que o texto não traz
  NORMA_FORA_DA_BASE     norma reconhecida, mas ausente do banco (exige fonte oficial)

Achado não é erro certo. A base é fotografia de 31/05/2026, e norma posterior (por exemplo, IN
alteradora de agosto de 2026) aparece como inexistente. Todo achado se confere na fonte oficial.

Uso: python auditoria_normas.py [--saida ARQ.json] [--so-problemas] | --demo
O que NÃO faz: julgar se a paráfrase é fiel. Isso é da leitura humana ou do agente conferente.
"""
import re, sys, json, pathlib, argparse, collections

AQUI = pathlib.Path(__file__).resolve().parent
PLUGIN = AQUI.parents[2]
sys.path.insert(0, str(PLUGIN / "mcp-normas"))
import banco  # noqa: E402

N = r"(?:n[º°o.]*\s*)?"
NUM = r"(?:\d{1,2}\.\d{3}|\d{1,4})"
# Compiladas com IGNORECASE; siglas ficam sensíveis à caixa por (?-i:...), para "cf." não virar CF.
NORMAS = [  # (regex, id de visao_geral_normas); id None = norma reconhecida e fora da base
    (r"(?-i:\bCPC\s*/\s*(?:19)?73\b)|C[óo]digo de Processo Civil de 1973", None),
    (r"Lei\s*" + N + r"8\.?213(?:\s*/\s*(?:19)?91)?\b|(?-i:\bLBPS\b)|Lei de Benef[ií]cios", "lei-8213-1991"),
    (r"Lei\s*" + N + r"8\.?212(?:\s*/\s*(?:19)?91)?\b|Lei de Custeio", "lei-8212-1991"),
    (r"Decreto\s*" + N + r"3\.?048(?:\s*/\s*(?:19)?99)?\b|(?-i:\bRPS\b)", "decreto-3048-1999"),
    (r"(?-i:\bIN\b)\s*(?:PRES/INSS\s*)?" + N + r"128(?:\s*/\s*2022)?\b|Instru[çc][ãa]o Normativa\s*(?:PRES/INSS\s*)?" + N + r"128\b", "in-128-2022"),
    (r"(?-i:\bLC\b)\s*" + N + r"142(?:\s*/\s*2013)?\b|Lei Complementar\s*" + N + r"142\b", "lc-142-2013"),
    (r"(?-i:\bEC\b)\s*" + N + r"103(?:\s*/\s*2019)?\b|Emenda Constitucional\s*" + N + r"103\b", "ec-103-2019"),
    (r"(?-i:\bEC\b)\s*" + N + r"20\s*/\s*(?:19)?98\b|Emenda Constitucional\s*" + N + r"20\b", "ec-20-1998"),
    (r"(?-i:\bEC\b)\s*" + N + r"136(?:\s*/\s*2025)?\b", "ec-136-2025"),
    (r"(?-i:\bADCT\b)", "cf-1988#adct"),
    (r"(?-i:\bCF\b)(?:\s*/\s*(?:19)?88)?|(?-i:\bCRFB\b)(?:\s*/\s*(?:19)?88)?|Constitui[çc][ãa]o(?: Federal| da Rep[úu]blica)?", "cf-1988"),
    (r"Lei\s*" + N + r"8\.?742(?:\s*/\s*(?:19)?93)?\b|(?-i:\bLOAS\b)", "lei-8742-1993"),
    (r"(?-i:\bCPC\b)(?:\s*/\s*2015)?|Lei\s*" + N + r"13\.?105(?:\s*/\s*2015)?\b|C[óo]digo de Processo Civil", "lei-13105-2015"),
    (r"Lei\s*" + N + r"10\.?259(?:\s*/\s*2001)?\b", "lei-10259-2001"),
    (r"Lei\s*" + N + r"9\.?099(?:\s*/\s*(?:19)?95)?\b", "lei-9099-1995"),
    (r"Lei\s*" + N + r"12\.?016(?:\s*/\s*2009)?\b", "lei-12016-2009"),
    (r"Lei\s*" + N + r"13\.?146(?:\s*/\s*2015)?\b|(?-i:\bLBI\b)|Estatuto da Pessoa com Defici[êe]ncia", "lei-13146-2015"),
    (r"Lei\s*" + N + r"9\.?784(?:\s*/\s*(?:19)?99)?\b", "lei-9784-1999"),
    (r"Lei\s*" + N + r"10\.?741(?:\s*/\s*2003)?\b|Estatuto d[ao] (?:Pessoa )?Idos[ao]", "lei-10741-2003"),
    (r"Lei\s*" + N + r"13\.?846(?:\s*/\s*2019)?\b", "lei-13846-2019"),
    (r"Lei\s*" + N + r"13\.?135(?:\s*/\s*2015)?\b", "lei-13135-2015"),
    (r"Lei\s*" + N + r"9\.?876(?:\s*/\s*(?:19)?99)?\b", "lei-9876-1999"),
    (r"Lei\s*" + N + r"9\.?032(?:\s*/\s*(?:19)?95)?\b", "lei-9032-1995"),
    (r"Lei\s*" + N + r"10\.?666(?:\s*/\s*2003)?\b", "lei-10666-2003"),
    (r"Lei\s*" + N + r"8\.?880(?:\s*/\s*(?:19)?94)?\b", "lei-8880-1994"),
    (r"Lei\s*" + N + r"9\.?494(?:\s*/\s*(?:19)?97)?\b", "lei-9494-1997"),
    (r"Lei\s*" + N + r"9\.?796(?:\s*/\s*(?:19)?99)?\b", "lei-9796-1999"),
    (r"Lei\s*" + N + r"7\.?713(?:\s*/\s*(?:19)?88)?\b", "lei-7713-1988"),
    (r"Lei\s*" + N + r"8\.?112(?:\s*/\s*(?:19)?90)?\b", "lei-8112-1990"),
    (r"Lei\s*" + N + r"13\.?460(?:\s*/\s*2017)?\b", "lei-13460-2017"),
    (r"Lei\s*" + N + r"14\.?768(?:\s*/\s*2023)?\b", "lei-14768-2023"),
    (r"Lei\s*" + N + r"15\.?176(?:\s*/\s*2025)?\b", "lei-15176-2025"),
    (r"Decreto\s*" + N + r"2\.?172(?:\s*/\s*(?:19)?97)?\b", "decreto-2172-1997"),
    (r"Decreto\s*" + N + r"53\.?831(?:\s*/\s*(?:19)?64)?\b", "decreto-53831-1964"),
    (r"Decreto\s*" + N + r"83\.?080(?:\s*/\s*(?:19)?79)?\b", "decreto-83080-1979"),
    (r"Decreto\s*" + N + r"10\.?995(?:\s*/\s*2022)?\b", "decreto-10995-2022"),
    (r"Decreto\s*" + N + r"6\.?949(?:\s*/\s*2009)?\b", "decreto-6949-2009"),
    (r"Portaria\s*(?-i:DIRBEN)(?:/INSS)?\s*" + N + r"(99[0-6])(?:\s*/\s*2022)?\b", "portaria-dirben-{0}-2022"),
    (r"Portaria\s*(?-i:DIRBEN)(?:/INSS)?\s*" + N + r"1\.?(309|318)(?:\s*/\s*2025)?\b", "portaria-dirben-1{0}-2025"),
    (r"Portaria\s*(?-i:MPS)\s*" + N + r"125(?:\s*/\s*2026)?\b", "portaria-mps-125-2026"),
    (r"Portaria Conjunta\s*(?:MDS/INSS\s*)?" + N + r"2\s*/\s*2015\b", "portaria-conjunta-2-2015"),
    (r"Portaria Interministerial\s*(?:AGU/MPS/MF/SEDH/MP\s*)?" + N + r"1\s*/\s*2014\b", "portaria-interministerial-1-2014"),
    # reconhecidas e fora da base: exigem fonte oficial e encerram a janela de busca
    (r"(?-i:\bCC\b|\bCLT\b|\bCTN\b|\bCPP?\b)|C[óo]digo Civil|Consolida[çc][ãa]o das Leis do Trabalho|C[óo]digo Penal", None),
    (r"(?-i:\bMP\b)\s*" + N + r"\d{1,4}(?:-\d+)?(?:\s*/\s*(?:19|20)?\d{2})?\b|Medida Provis[óo]ria\s*" + N + r"\d", None),
    (r"(?-i:\bRICRPS\b)|Regimento Interno|Resolu[çc][ãa]o\s*(?-i:CFM|CNJ|CJF|CNPS)?\s*" + N + r"\d", None),
    (r"Decreto-Lei\s*" + N + NUM + r"(?:\s*/\s*(?:19|20)?\d{2})?", None),
    (r"(?-i:\bLC\b)\s*" + N + r"\d{2,3}(?:\s*/\s*(?:19|20)?\d{2})?\b|Lei Complementar\s*" + N + r"\d{2,3}", None),
    (r"(?-i:\bEC\b)\s*" + N + r"\d{1,3}(?:\s*/\s*(?:19|20)?\d{2})?\b|Emenda Constitucional\s*" + N + r"\d{1,3}", None),
    (r"Lei\s*" + N + r"\d{1,2}\.\d{3}(?:\s*/\s*(?:19|20)?\d{2})?\b", None),
    (r"Decreto\s*" + N + r"\d{1,2}\.\d{3}(?:\s*/\s*(?:19|20)?\d{2})?\b", None),
    (r"Portaria(?:\s+Conjunta)?\s*(?:[A-Z][A-Za-z/]*\s*)?" + N + NUM + r"\s*/\s*20\d{2}\b", None),
    (r"(?-i:\bIN\b)\s*(?:PRES/INSS\s*)?" + N + r"\d{2,3}\s*/\s*20\d{2}\b", None),
]
NORMAS_RX = [(re.compile(rx, re.I), nid) for rx, nid in NORMAS]

ART = r"(\d{1,2}\.\d{3}|\d{1,4})\s*(?:[º°o](?![a-zà-ú]))?(?:\s*-\s*([A-Z])\b)?"
ROMANO = r"(?:X{0,3})(?:IX|IV|V?I{0,3})"
PAR = r"§§?\s*(\d{1,3})\s*[º°o]?(?:\s*-\s*([A-Z])\b)?"
# o que pode existir entre um 'art.' e a norma sem quebrar a citação
LIGA = (r"(?:\s|,|\d|\.(?=\d)|§|º|°|-|[IVX]+\b|\be\b|\ba\b|\bao\b|\bat[ée]\b|caput|par[áa]grafo\s+[úu]nico"
        r"|inc(?:iso)?s?\.?|al[íi]nea|[\"“”']?\b[a-z]\b[\"“”']?|c/c|combinado com|d[aoe]s?\b|n[ao]s?\b|\barts?\.)*")
QUEBRA = re.compile(r"\.[*_\])]*\s+[*_\[(]*[A-ZÁÉÍÓÚ]|[;:()]")
EMENDA_DA = re.compile(r"reda[çc][ãa]o|inclu[íi]d|alterad|acrescid|introduzid|convertid|revogad|vig[êe]ncia", re.I)


def acha_normas(linha):
    """Menções a normas, sem sobreposição; a primeira regra que casa vence."""
    achados, ocupado = [], []
    for rx, nid in NORMAS_RX:
        for m in rx.finditer(linha):
            if not m.group(0).strip() or any(a < m.end() and m.start() < b for a, b in ocupado):
                continue
            ident = nid.format(*[g for g in m.groups() if g]) if nid and "{0}" in nid else nid
            achados.append((m.start(), m.end(), ident, m.group(0)))
            ocupado.append((m.start(), m.end()))
    return sorted(achados)


def _art(m):
    return m.group(1).replace(".", "") + ("-" + m.group(2) if m.group(2) else "")


def parse_trecho(t):
    """'arts. 19 a 21-A' | 'art. 26, §3º, II' | 'arts. 5º, X, 37, §6º' -> lista de (art, par, inc)."""
    t = t.replace("\u00a0", " ")
    corpo = re.sub(r"^\s*arts?\.?\s*", "", t, flags=re.I)
    m = re.match(r"((?:" + ART + r")(?:\s*(?:,|e|a|ao|até)\s*" + ART + r"(?!\s*,\s*(?:§|[IVX]+\b)))*)", corpo)
    if not m:
        return []
    arts = [_art(a) for a in re.finditer(ART, m.group(1))]
    if len(arts) != 1:
        return [(a, None, None) for a in arts]
    art, resto = arts[0], corpo[m.end():]
    toks = re.finditer(r"(?P<par>" + PAR + r")|(?P<pu>par[áa]grafo\s+[úu]nico)|(?P<inc>\b" + ROMANO +
                       r"\b(?=\s*(?:,|e\b|;|\)|da\b|do\b|$)))|(?P<art>(?<![§\d.])\b" + ART + r"(?=\s*,\s*(?:§|[IVX]+\b)))",
                       resto)
    par_atual, saida = None, []
    for tk in toks:
        if tk.group("par"):
            mp = re.match(PAR, tk.group("par"))
            par_atual = mp.group(1) + ("-" + mp.group(2) if mp.group(2) else "")
            saida.append((art, par_atual, None))
        elif tk.group("pu"):
            par_atual = "único"
            saida.append((art, par_atual, None))
        elif tk.group("inc"):
            saida.append((art, par_atual, tk.group("inc").upper()))
        elif tk.group("art"):
            art, par_atual = _art(re.match(ART, tk.group("art"))), None
            saida.append((art, None, None))
    if not saida:
        return [(art, None, None)]
    limpo = [it for it in saida if not (it[2] is None and any(x[0] == it[0] and x[1] == it[1] and x[2] for x in saida))]
    limpo = [it for it in limpo if not (it[1] is None and it[2] is None and any(x[0] == it[0] and (x[1] or x[2]) for x in limpo))]
    return limpo or [(art, None, None)]


def citacoes(linha):
    """Lista de (trecho, norma_id, menção, itens)."""
    out, limite_ant = [], 0
    mencoes = acha_normas(linha)
    for k_m, (ini, fim, nid, mencao) in enumerate(mencoes):
        janela = linha[limite_ant:ini]
        m_fim = re.search(r",?\s*(?:d[aoe]s?|na|no)\s*$", janela)
        pos = [m.start() for m in re.finditer(r"\barts?\.\s*\d", janela, flags=re.I)]
        pos = [p for p in pos if not QUEBRA.search(janela[p:])]
        aceitos = []
        # anda de trás para frente: cada elo, até a norma, só pode ter tokens de citação
        for k in range(len(pos) - 1, -1, -1):
            elo = janela[pos[k]:pos[k + 1] if k + 1 < len(pos) else len(janela)]
            if not re.fullmatch(LIGA, elo, flags=re.I) or EMENDA_DA.search(elo):
                break
            aceitos.insert(0, pos[k])
            if not m_fim:  # sem 'da/do' colado na norma, vale só o último artigo
                break
        for k, p in enumerate(aceitos):
            q = aceitos[k + 1] if k + 1 < len(aceitos) else len(janela)
            trecho = janela[p:q]
            out.append((trecho.strip(" ,;e"), nid, mencao, parse_trecho(trecho)))
        prox = mencoes[k_m + 1][0] if k_m + 1 < len(mencoes) else len(linha)
        depois = linha[fim:min(fim + 90, prox)]
        mb = re.match(r"\s*(?:,|\(|–|-)?\s*(arts?\.\s*\d[^;()]*?)(?=;|\)|\.\s|\s+e\s+d[ao]\s|\s+c/c|$)",
                      depois, flags=re.I)
        # padrão B só vale se o artigo não está colado na norma seguinte (aí o artigo é dela)
        if mb and not (prox < fim + 90 and re.fullmatch(LIGA, linha[fim + mb.end(1):prox], flags=re.I)):
            out.append((mb.group(1).strip(" ,"), nid, mencao, parse_trecho(mb.group(1))))
        limite_ant = fim
    return out


CAB_PAR = r"§\s*(\d{1,3})\s*[º°o]?(?:\s*-\s*([A-Z]))?\s*[.\-–]?\s*(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ(])"


def _rot(s):
    mp = re.match(CAB_PAR, s)
    if mp:
        return mp.group(1) + ("-" + mp.group(2) if mp.group(2) else "")
    return "único" if re.match(r"Par[áa]grafo\s+[úu]nico", s, re.I) else None


def blocos(texto):
    """Parágrafos do artigo e incisos de cada um (None = caput)."""
    pars, incs, atual = [], collections.defaultdict(list), None
    for ln in texto.split("\n"):
        s = ln.strip()
        rot = _rot(s)
        if rot:
            atual = rot; pars.append(rot); continue
        mi = re.match(r"(" + ROMANO + r")\s*[-–—]", s)
        if mi and mi.group(1):
            incs[atual].append(mi.group(1))
    return pars, incs


def bloco_par(texto, par):
    dentro, out = False, []
    for ln in texto.split("\n"):
        s = ln.strip()
        rot = _rot(s)
        if rot:
            dentro = (rot == par)
            if dentro:
                out = [s]  # a última ocorrência do parágrafo é a vigente
            continue
        if dentro:
            out.append(s)
    return "\n".join(out)


def num_tokens(s):
    out = set()
    for m in re.finditer(r"(\d{1,3}(?:,\d+)?)\s*%", s):
        out.add(("%", m.group(1)))
    for m in re.finditer(r"\b(\d{1,3})\s*(anos|meses|dias|contribui[çc][õo]es)\b", s):
        out.add((m.group(2)[:4], m.group(1)))
    return out


_cache = {}


def _obter(con, nid, art, parte, historico=False):
    if nid == "cf-1988" and not parte:
        parte = "principal"
    chave = (nid, art, parte, historico)
    if chave not in _cache:
        _cache[chave] = banco.obter(con, nid, art, parte, historico=historico)
    return _cache[chave]


def confere(con, nid, art, par, inc):
    parte = ""
    if nid.endswith("#adct"):
        nid, parte = nid.split("#")[0], "adct"
    r = _obter(con, nid, art, parte)
    if r.get("erro"):
        return "ARTIGO_INEXISTENTE", ""
    vig = [v for v in r["versoes"] if v["vigente"]]
    if not vig:
        return "REVOGADO", ""
    texto_vig = vig[-1]["texto"]
    pars_vig, incs_vig = blocos(texto_vig)
    if par:
        if par not in pars_vig:
            antigos = set()
            for v in _obter(con, nid, art, parte, historico=True).get("historico", []):
                antigos.update(blocos(v["texto"])[0])
            return ("PARAGRAFO_ANTERIOR" if par in antigos else "PARAGRAFO_INEXISTENTE"), texto_vig
        if inc and inc not in incs_vig.get(par, []):
            return "INCISO_INEXISTENTE", texto_vig
        return "OK", bloco_par(texto_vig, par)
    if inc and inc not in incs_vig.get(None, []) and not any(inc in v for v in incs_vig.values()):
        return "INCISO_INEXISTENTE", texto_vig
    return "OK", texto_vig


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default="auditoria_normas.json")
    ap.add_argument("--so-problemas", action="store_true")
    a = ap.parse_args()
    con = banco.abrir(leitura=True)
    res, cont, fora = [], collections.Counter(), collections.Counter()
    alvos = sorted((PLUGIN / "skills").rglob("*.md")) + sorted((PLUGIN / "agents").glob("*.md"))
    for f in alvos:
        rel = f.relative_to(PLUGIN).as_posix()
        for i, ln in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if "art" not in ln.lower() or ln.lstrip().startswith("description:"):
                continue  # a description é lista de palavras-chave, não afirmação
            for trecho, nid, mencao, itens in citacoes(ln):
                if nid is None:
                    fora[re.sub(r"\s+", " ", mencao.strip())] += 1
                    cont["NORMA_FORA_DA_BASE"] += 1
                    continue
                for art, par, inc in itens:
                    st, texto = confere(con, nid, art, par, inc)
                    if st == "OK" and texto:
                        pos = ln.find(trecho)
                        viz = ln[max(0, pos - 120): pos + len(trecho) + 60]
                        tt = num_tokens(texto)
                        if any(n not in tt and any(t[0] == n[0] for t in tt) for n in num_tokens(viz)):
                            st = "NUMERO_DIVERGENTE"
                    cont[st] += 1
                    if st != "OK" or not a.so_problemas:
                        res.append({"status": st, "arquivo": rel, "linha": i, "norma": nid, "art": art,
                                    "par": par, "inc": inc, "citacao": trecho[:120],
                                    "contexto": ln.strip()[:300]})
    json.dump({"contagem": cont, "normas_fora_da_base": fora.most_common(), "achados": res},
              open(a.saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sys.stdout.reconfigure(encoding="utf-8")
    for k, v in cont.most_common():
        print(f"{k:24} {v}")
    print("saida:", a.saida)


def _demo():
    assert parse_trecho("art. 26, §3º, III,") == [("26", "3", "III")], parse_trecho("art. 26, §3º, III,")
    assert parse_trecho("arts. 19 a 21-A") == [("19", None, None), ("21-A", None, None)]
    assert parse_trecho("art. 42, § 2º, e") == [("42", "2", None)]
    assert parse_trecho("art. 124, parágrafo único,") == [("124", "único", None)]
    assert parse_trecho("art. 1.013, §3º") == [("1013", "3", None)], parse_trecho("art. 1.013, §3º")
    assert parse_trecho("art. 60, §11-A, I") == [("60", "11-A", "I")], parse_trecho("art. 60, §11-A, I")
    assert parse_trecho("arts. 5º, X, 37, §6º") == [("5", None, "X"), ("37", "6", None)], parse_trecho("arts. 5º, X, 37, §6º")
    c = citacoes("nos termos do art. 42, §2º, e do art. 59, §1º, da Lei 8.213/91.")
    assert [x[3] for x in c] == [[("42", "2", None)], [("59", "1", None)]], c
    c = citacoes("Lei 8.213/91, art. 86, § 1º; e mais")
    assert c and c[0][3] == [("86", "1", None)], c
    assert not citacoes("A tabela do art. 70-F, §1º, é o mecanismo autorizado na aposentadoria da LC 142/2013.")
    assert not citacoes("art. 201, §7º, com redação da EC 103/2019")
    c = citacoes("art. 337 §3º Decreto 3.048/99")
    assert c and c[0][1] == "decreto-3048-1999", c
    con = banco.abrir(leitura=True)
    assert confere(con, "ec-103-2019", "26", "3", "III")[0] == "INCISO_INEXISTENTE"
    assert confere(con, "ec-103-2019", "26", "2", "III")[0] == "OK"
    assert confere(con, "lei-8213-1991", "86", "1", None)[0] == "OK"
    assert confere(con, "lei-8213-1991", "9999", None, None)[0] == "ARTIGO_INEXISTENTE"
    print("demo ok")


if __name__ == "__main__":
    _demo() if "--demo" in sys.argv else main()
