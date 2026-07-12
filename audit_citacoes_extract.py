# -*- coding: utf-8 -*-
"""Extrai todas as citacoes juridicas das skills (plugin + escritorio) para auditoria de veracidade."""
import os, re, json, csv, sys
from collections import defaultdict

ROOTS = [
    (r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini\_base-conhecimento-inss\skills", "plugin"),
    (r"C:\Users\VAIO\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\78cfbd6a-3102-479d-9edd-4b5fcaf81cb0\883fad24-86be-4ea3-958f-1325e89be551\skills", "escritorio"),
]

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
    ("LEI", re.compile(r"\bLei\s+(?:n?[ºo°]?\s*)?([\d]{1,2}\.?\d{3})\s*/\s*(\d{2,4})", re.I)),
    ("LC", re.compile(r"\b(?:LC|Lei\s+Complementar)\s+(?:n?[ºo°]?\s*)?(\d{2,3})\s*/?\s*(\d{4})?", re.I)),
    ("MP", re.compile(r"\bMP\s+(?:n?[ºo°]?\s*)?([\d\.]{3,6}(?:-\d{1,2})?)\s*/\s*(\d{4})", re.I)),
    ("EC", re.compile(r"\bEC\s+(?:n?[ºo°]?\s*)?(\d{1,3})\s*/\s*(\d{4})", re.I)),
    ("DECRETO", re.compile(r"\bDecreto(?:-Lei)?\s+(?:n?[ºo°]?\s*)?([\d]{1,3}\.?\d{3})\s*/?\s*(\d{4})?", re.I)),
    ("IN", re.compile(r"\bIN\s+(?:[A-Z]{2,10}[/\\]?[A-Z]{0,10}\s+)?(?:n?[ºo°]?\s*)?(\d{1,4})\s*/\s*(\d{4})", re.I)),
    ("PORTARIA", re.compile(r"Portaria\s+(?:Conjunta\s+|Interministerial\s+)?(?:[A-Z]{2,10}[/\\]?[A-Z]{0,10}(?:[/\\][A-Z]{2,10})?\s+)?(?:n?[ºo°]?\s*)?([\d]{1,2}\.?\d{0,3})\s*/\s*(\d{4})", re.I)),
    ("QO_TNU", re.compile(r"\b(?:QO|Quest[aã]o\s+de\s+Ordem)\s+(?:n?[ºo°]?\s*)?(\d{1,3})\s*(?:/\s*|\s+d[oa]\s+|\s+)?(TNU)?", re.I)),
]

def norm(tipo, m):
    g = [x for x in m.groups() if x]
    if tipo in ("TEMA", "SUMULA", "ENUNCIADO"):
        return "%s %s/%s" % (tipo, g[0], g[1].upper().replace("EX-TFR", "TFR"))
    if tipo == "SUMULA_VINC":
        return "SUMULA VINCULANTE %s" % g[0]
    if tipo in ("RESP", "RE_ARE", "ADI", "PUIL", "IRDR_IAC"):
        return "%s %s" % (g[0].upper(), g[1].replace(".", "") if tipo in ("RESP", "RE_ARE") else g[1])
    if tipo == "PROC_CNJ":
        return "PROC %s" % g[0]
    if tipo == "QO_TNU":
        return "QO %s/TNU" % g[0]
    num = g[0].replace(".", "")
    ano = g[1] if len(g) > 1 else ""
    if ano and len(ano) == 2:
        ano = ("19" + ano) if int(ano) > 30 else ("20" + ano)
    return "%s %s%s" % (tipo, num, ("/" + ano) if ano else "")

def main():
    occ = defaultdict(list)
    nfiles = 0
    for root, origem in ROOTS:
        if not os.path.isdir(root):
            print("AVISO: raiz nao encontrada:", root); continue
        for dirpath, dirs, files in os.walk(root):
            for fn in files:
                if not fn.lower().endswith((".md", ".txt")):
                    continue
                fp = os.path.join(dirpath, fn)
                rel = os.path.relpath(fp, root)
                skill = rel.split(os.sep)[0]
                nfiles += 1
                try:
                    text = open(fp, encoding="utf-8", errors="replace").read()
                except Exception as e:
                    print("ERRO lendo", fp, e); continue
                for i, line in enumerate(text.splitlines(), 1):
                    for tipo, rx in PATTERNS:
                        for m in rx.finditer(line):
                            key = norm(tipo, m)
                            occ[key].append({"origem": origem, "skill": skill, "arquivo": rel.replace(os.sep, "/"), "linha": i, "ctx": line.strip()[:240]})
    out = {"total_arquivos": nfiles, "total_citacoes_unicas": len(occ),
           "citacoes": {k: {"n": len(v), "skills": sorted(set(x["skill"] for x in v)), "amostra": v[:3]} for k, v in occ.items()}}
    base = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini"
    with open(os.path.join(base, "audit_citacoes.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    with open(os.path.join(base, "audit_citacoes.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["citacao", "ocorrencias", "qtd_skills", "skills"])
        for k in sorted(occ, key=lambda x: -len(occ[x])):
            sk = sorted(set(x["skill"] for x in occ[k]))
            w.writerow([k, len(occ[k]), len(sk), ", ".join(sk)[:800]])
    print("Arquivos lidos:", nfiles)
    print("Citacoes unicas:", len(occ))
    for t in ["TEMA", "SUMULA", "RESP", "RE_ARE", "PUIL", "PROC", "LEI", "PORTARIA", "IN ", "DECRETO", "ADI"]:
        print(t, sum(1 for k in occ if k.startswith(t)))

if __name__ == "__main__":
    main()
