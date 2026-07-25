# -*- coding: utf-8 -*-
"""Auditoria de veracidade das citacoes jurisprudenciais da base de conhecimento.

Etapa 1 da skill auditoria-citacoes. Varredura MECANICA e deterministica.
Extrai toda jurisprudencia afirmada nas skills (base-*, ponte-* e operacionais)
e, opcionalmente, nos Modelos Ouro 2.0 baixados do Drive, e lista os achados
em JSON para triagem e verificacao nas etapas seguintes.

O que este script FAZ.
- Varre .md e .txt das raizes resolvidas dinamicamente (sandbox ou Windows).
- Reconhece Tema, Sumula (inclusive Vinculante), Enunciado, PUIL/PEDILEF/PUJ,
  REsp/AREsp/EREsp, RE/ARE, ADI/ADPF/ADC, IRDR/IAC, QO da TNU e numero CNJ.
- Ignora citacao em contexto de QUARENTENA (linha ou vizinhas imediatas).
- Ignora itens ja registrados no CATALOGO-COMPLEMENTAR-VERIFICADO.md.
- Exclui por padrao a skill base-precedentes-catalogo-vinculantes (catalogo
  curado, auditado por rotina propria de status).

O que este script NAO faz.
- Nao consulta a internet. Nao julga vigencia nem tese. Isso e das etapas 2-3.
- Nao audita citacoes de LEI/Decreto/IN/Portaria (cobertas pelo protocolo da
  base-legislacao-fontes-primarias, que confere texto literal em arquivo local).

Uso.
  python3 auditoria_citacoes.py [--modelos DIR] [--incluir-catalogo] [--saida ARQ.json]
"""
import os, re, json, sys, argparse, datetime
from collections import defaultdict

# ---------------------------------------------------------------- raizes
def resolver_raizes(args):
    raizes = []
    aqui = os.path.abspath(os.path.dirname(__file__))
    # skill esta em .../_base-conhecimento-inss/skills/auditoria-citacoes/scripts
    skills_dir = os.path.abspath(os.path.join(aqui, "..", ".."))
    if os.path.isdir(skills_dir) and os.path.basename(skills_dir) == "skills":
        raizes.append((skills_dir, "plugin"))
    # fallback Windows (execucao fora do sandbox)
    win = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini\_base-conhecimento-inss\skills"
    if os.path.isdir(win):
        raizes.append((win, "plugin"))
    if args.modelos and os.path.isdir(args.modelos):
        raizes.append((args.modelos, "modelos-ouro"))
    # dedup
    vistos, out = set(), []
    for r, o in raizes:
        k = os.path.normcase(os.path.normpath(r))
        if k not in vistos:
            vistos.add(k); out.append((r, o))
    return out

# ---------------------------------------------------------------- padroes
PATTERNS = [
    ("TEMA", re.compile(r"Tema\s+(?:Repetitivo\s+)?(\d{1,4})\s*(?:/\s*|\s+d[oa]\s+|\s+)(STF|STJ|TNU|TST|TRU)", re.I)),
    ("SUMULA", re.compile(r"S[uú]mula\s+(?:Vinculante\s+)?(\d{1,3})\s*(?:/\s*|\s+d[oa]\s+|\s+)(STF|STJ|TNU|TFR|TCU|AGU|TST|CRPS|ex-TFR)", re.I)),
    ("SUMULA_VINC", re.compile(r"S[uú]mula\s+Vinculante\s+(?:n?[ºo°]?\s*)?(\d{1,2})", re.I)),
    ("ENUNCIADO", re.compile(r"Enunciado\s+(\d{1,3})\s*(?:/\s*|\s+d[oa]\s+|\s+)(CRPS|FONAJEF)", re.I)),
    ("RESP", re.compile(r"\b(AREsp|EREsp|REsp)\s*\.?\s*n?[ºo°]?\s*([\d][\d\.]{4,11})", re.I)),
    ("RE_ARE", re.compile(r"\b(ARE|RE)\s+n?[ºo°]?\s*([\d][\d\.]{4,11})")),
    ("ADI", re.compile(r"\b(ADI|ADPF|ADC)\s+n?[ºo°]?\s*(\d{3,5})", re.I)),
    ("PUIL", re.compile(r"\b(PUIL|PEDILEF|PUJ)\s+n?[ºo°]?\s*([\d][\d\.\-/]{5,30})", re.I)),
    ("PROC_CNJ", re.compile(r"\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b")),
    ("IRDR_IAC", re.compile(r"\b(IRDR|IAC)\s+n?[ºo°]?\s*(\d{1,3})\b", re.I)),
    ("QO_TNU", re.compile(r"\b(?:QO|Quest[aã]o\s+de\s+Ordem)\s+(?:n?[ºo°]?\s*)?(\d{1,3})\s*(?:/\s*|\s+d[oa]\s+|\s+)(TNU)", re.I)),
]

def norm(tipo, m):
    g = [x for x in m.groups() if x]
    if tipo in ("TEMA", "SUMULA", "ENUNCIADO"):
        return "%s %s/%s" % (tipo, g[0], g[1].upper().replace("EX-TFR", "TFR"))
    if tipo == "SUMULA_VINC":
        return "SUMULA VINCULANTE %s" % g[0]
    if tipo in ("RESP", "RE_ARE"):
        return "%s %s" % (g[0].upper(), g[1].replace(".", ""))
    if tipo in ("ADI", "PUIL", "IRDR_IAC"):
        return "%s %s" % (g[0].upper(), g[1])
    if tipo == "PROC_CNJ":
        return "PROC %s" % g[0]
    if tipo == "QO_TNU":
        return "QO %s/TNU" % g[0]
    return "%s %s" % (tipo, g[0])

# ------------------------------------------------------- catalogo complementar
def carregar_catalogo_complementar():
    """IDs ja verificados na fonte oficial. Formato de item, linha '### <ID>'."""
    aqui = os.path.abspath(os.path.dirname(__file__))
    cat = os.path.join(aqui, "..", "references", "CATALOGO-COMPLEMENTAR-VERIFICADO.md")
    ids = set()
    if os.path.isfile(cat):
        for ln in open(cat, encoding="utf-8", errors="replace"):
            m = re.match(r"^###\s+(.+?)\s*$", ln)
            if m:
                ids.add(m.group(1).strip().upper())
    return ids

QUARENTENA_RE = re.compile(r"quarenten", re.I)
# nomes de indicadores CNIS que contem QUARENTENA e nao sao quarentena de citacao
INDICADOR_RE = re.compile(r"\b[A-Z]{3,6}-[A-Z0-9\-]*QUARENTENA|QUARENTENA\b\s*\|", re.I)

def em_quarentena(linhas, i):
    """Citacao em contexto de quarentena textual (linha ou vizinhas imediatas)."""
    for j in (i - 1, i, i + 1):
        if 0 <= j < len(linhas):
            ln = linhas[j]
            if QUARENTENA_RE.search(ln) and not INDICADOR_RE.search(ln):
                return True
    return False

# ---------------------------------------------------------------- varredura
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--modelos", help="pasta local dos Modelos Ouro 2.0 baixados do Drive")
    ap.add_argument("--incluir-catalogo", action="store_true",
                    help="inclui base-precedentes-catalogo-vinculantes na varredura")
    ap.add_argument("--saida", default="auditoria_citacoes.json")
    args = ap.parse_args()

    excl_dirs = set() if args.incluir_catalogo else {"base-precedentes-catalogo-vinculantes"}
    ja_verificados = carregar_catalogo_complementar()

    occ = defaultdict(list)
    nfiles = 0
    for raiz, origem in resolver_raizes(args):
        for dirpath, dirs, files in os.walk(raiz):
            dirs[:] = [d for d in dirs if d not in excl_dirs and d not in {".git", "node_modules", "__pycache__"}]
            for fn in files:
                if not fn.lower().endswith((".md", ".txt")):
                    continue
                fp = os.path.join(dirpath, fn)
                try:
                    linhas = open(fp, encoding="utf-8", errors="replace").read().split("\n")
                except OSError:
                    continue
                nfiles += 1
                rel = os.path.relpath(fp, raiz)
                for i, ln in enumerate(linhas):
                    for tipo, rx in PATTERNS:
                        for m in rx.finditer(ln):
                            cit = norm(tipo, m).upper()
                            if cit in ja_verificados:
                                continue
                            if em_quarentena(linhas, i):
                                continue
                            occ[cit].append({
                                "origem": origem,
                                "arquivo": rel.replace("\\", "/"),
                                "linha": i + 1,
                                "contexto": ln.strip()[:240],
                            })

    saida = {
        "gerado_em": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "arquivos_varridos": nfiles,
        "citacoes_distintas": len(occ),
        "ocorrencias_totais": sum(len(v) for v in occ.values()),
        "ignorados_catalogo_complementar": sorted(ja_verificados),
        "achados": {k: occ[k] for k in sorted(occ)},
    }
    with open(args.saida, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)
    print("arquivos varridos.......:", nfiles)
    print("citacoes distintas......:", len(occ))
    print("ocorrencias totais......:", saida["ocorrencias_totais"])
    print("ja no catalogo compl....:", len(ja_verificados))
    print("saida...................:", args.saida)

if __name__ == "__main__":
    main()
