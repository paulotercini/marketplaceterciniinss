# -*- coding: utf-8 -*-
import os, re, io
ROOT = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini\_base-conhecimento-inss\skills"
PATS = {
    "TEMA365": re.compile(r"Tema\s+365", re.I),
    "SUM31": re.compile(r"S[úu]mula\s+31\s*(?:/|\s+d[ao]\s+|\s+)TNU|S[úu]mula\s+31/TNU", re.I),
    "TEMA385": re.compile(r"Tema\s+385", re.I),
    "TEMA382": re.compile(r"Tema\s+382", re.I),
}
for dirpath, dirs, files in os.walk(ROOT):
    for fn in files:
        if not fn.endswith(".md"):
            continue
        fp = os.path.join(dirpath, fn)
        rel = os.path.relpath(fp, ROOT)
        try:
            lines = io.open(fp, encoding="utf-8", errors="replace").read().splitlines()
        except Exception:
            continue
        for i, ln in enumerate(lines, 1):
            for tag, rx in PATS.items():
                if rx.search(ln):
                    print(tag, "|", rel.replace(os.sep, "/"), "|", i, "|", ln.strip()[:150])
