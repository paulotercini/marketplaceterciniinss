# -*- coding: utf-8 -*-
"""Etapa 2 da auditoria de citacoes. Triagem por status contra o catalogo curado."""
import os, re, json
from collections import defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
SK = os.path.join(BASE, "_base-conhecimento-inss", "skills")
CATDIR = os.path.join(SK, "base-precedentes-catalogo-vinculantes", "references")

temas = defaultdict(set)
sumulas = defaultdict(set)
enunciados = defaultdict(set)
raw_all = []

COURT_RE = re.compile(r"\b(STF|STJ|TNU|CRPS|TFR|TCU|AGU|TST|TRU)\b")
ITEM_RE = re.compile(r"\*\*(Tema|S[uú]mula|Enunciado)\s+(?:Vinculante\s+)?(\d+)")

def court_of(header, fname):
    m = COURT_RE.search(header or "")
    if m:
        return m.group(1)
    up = fname.upper()
    for c in ("STF", "STJ", "TNU", "CRPS"):
        if c in up:
            return c
    return None

for fn in sorted(os.listdir(CATDIR)):
    if not fn.endswith(".md"):
        continue
    txt = open(os.path.join(CATDIR, fn), encoding="utf-8", errors="replace").read()
    raw_all.append(txt)
    cur = court_of(None, fn)
    for ln in txt.split("\n"):
        if ln.startswith("#"):
            c = court_of(ln, fn)
            if c:
                cur = c
        for m in ITEM_RE.finditer(ln):
            kind, num = m.group(1).lower(), int(m.group(2))
            if not cur:
                continue
            if kind == "tema":
                temas[cur].add(num)
            elif kind.startswith("s"):
                sumulas[cur].add(num)
            else:
                enunciados[cur].add(num)

RAW = "\n".join(raw_all)
RAW_NODOTS = re.sub(r"(?<=\d)\.(?=\d)", "", RAW)

STATUS_KW = re.compile(r"(CANCELAD|SUSPENS|EM REVIS|SEM TESE|SUPERAD|AFETAD|M[EÉ]RITO N[AÃ]O JULGADO|REVOGAD)", re.I)
status_hits = defaultdict(list)

REF_RE = re.compile(r"(Tema|S[uú]mula|Enunciado)\s+(?:Vinculante\s+)?(\d+)\s*(?:/|\s+d[oa]\s+)?\s*(STF|STJ|TNU|TST|TRU|CRPS|TFR)?", re.I)
for src in raw_all:
    for ln in src.split("\n"):
        if not STATUS_KW.search(ln):
            continue
        for m in REF_RE.finditer(ln):
            kind = m.group(1).upper()
            base = "TEMA" if kind == "TEMA" else ("SUMULA" if kind.startswith("S") else "ENUNCIADO")
            suf = ("/" + m.group(3).upper()) if m.group(3) else ""
            kid = "%s %s%s" % (base, m.group(2), suf)
            frag = ln.strip()[:220]
            if frag not in status_hits[kid]:
                status_hits[kid].append(frag)

ach = json.load(open(os.path.join(BASE, "auditoria_citacoes.json"), encoding="utf-8"))["achados"]
out = {"ERRO_POTENCIAL_STATUS": {}, "NAO_CATALOGADO_NA_CORTE": {}, "NAO_CATALOGADO": {}, "CATALOGADO_OK": {}}

for cit, occs in ach.items():
    m = re.match(r"^(TEMA|SUMULA|ENUNCIADO)\s+(\d+)/(\w+)$", cit)
    cls, extra = None, ""
    if m:
        kind, num, corte = m.group(1), int(m.group(2)), m.group(3)
        table = temas if kind == "TEMA" else (sumulas if kind == "SUMULA" else enunciados)
        here = num in table.get(corte, set())
        elsewhere = [c for c, s in table.items() if num in s and c != corte]
        st = status_hits.get("%s %d/%s" % (kind, num, corte), []) + status_hits.get("%s %d" % (kind, num), [])
        if here:
            cls = "ERRO_POTENCIAL_STATUS" if st else "CATALOGADO_OK"
            if st:
                extra = " | ".join(st[:2])
        elif elsewhere:
            cls = "NAO_CATALOGADO_NA_CORTE"
            extra = "numero existe em " + ",".join(sorted(elsewhere))
        else:
            cls = "NAO_CATALOGADO"
    else:
        alvo = re.sub(r"^(PROC|QO)\s+", "", cit)
        alvo = re.sub(r"^[A-Z]+\s+", "", alvo)
        if alvo and (alvo in RAW_NODOTS or alvo in RAW):
            cls = "CATALOGADO_OK"
        else:
            cls = "NAO_CATALOGADO"
    out[cls][cit] = {"ocorrencias": len(occs),
                     "arquivos": sorted({o["arquivo"] for o in occs})[:8],
                     "obs": extra}

resumo = {k: len(v) for k, v in out.items()}
with open(os.path.join(BASE, "auditoria_triagem.json"), "w", encoding="utf-8") as f:
    json.dump({"resumo": resumo, "triagem": out}, f, ensure_ascii=False, indent=1)
print(json.dumps(resumo, ensure_ascii=False))
for k in ("ERRO_POTENCIAL_STATUS", "NAO_CATALOGADO_NA_CORTE"):
    print("\n== " + k)
    for cit, d in sorted(out[k].items(), key=lambda x: -x[1]["ocorrencias"]):
        print("%-28s occ=%-3d %s" % (cit, d["ocorrencias"], d["obs"][:150]))
print("\n== NAO_CATALOGADO (top 40 por ocorrencias)")
top = sorted(out["NAO_CATALOGADO"].items(), key=lambda x: -x[1]["ocorrencias"])[:40]
for cit, d in top:
    print("%-34s occ=%d" % (cit, d["ocorrencias"]))
