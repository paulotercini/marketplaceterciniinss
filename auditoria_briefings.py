# -*- coding: utf-8 -*-
"""Gera briefings da Etapa 3 a partir de auditoria_citacoes.json e auditoria_triagem.json."""
import os, json
BASE = os.path.dirname(os.path.abspath(__file__))
ach = json.load(open(os.path.join(BASE, "auditoria_citacoes.json"), encoding="utf-8"))["achados"]
tri = json.load(open(os.path.join(BASE, "auditoria_triagem.json"), encoding="utf-8"))["triagem"]

def dump(ids, arq, max_ctx):
    with open(os.path.join(BASE, arq), "w", encoding="utf-8") as f:
        for cid in ids:
            occs = ach.get(cid, [])
            f.write("## %s (occ=%d)\n" % (cid, len(occs)))
            vistos = set()
            n = 0
            for o in occs:
                c = o["contexto"][:200]
                if c in vistos:
                    continue
                vistos.add(c)
                f.write("- %s:%d :: %s\n" % (o["arquivo"], o["linha"], c))
                n += 1
                if n >= max_ctx:
                    break
            f.write("\n")

status_ids = sorted(tri["ERRO_POTENCIAL_STATUS"], key=lambda c: -len(ach.get(c, [])))
corte_ids = sorted(tri["NAO_CATALOGADO_NA_CORTE"], key=lambda c: -len(ach.get(c, [])))
nc = sorted(tri["NAO_CATALOGADO"].items(), key=lambda x: -x[1]["ocorrencias"])
nc_ids = [c for c, _ in nc]
dump(status_ids, "brief_status.md", 40)
dump(corte_ids, "brief_corte.md", 3)
dump(nc_ids[:40], "brief_nc_top40.md", 2)
with open(os.path.join(BASE, "pendencias_nao_verificadas.md"), "w", encoding="utf-8") as f:
    f.write("# Fila de pendencias (NAO_CATALOGADO alem do top 40), por ocorrencias\n\n")
    for c, d in nc[40:]:
        f.write("%s | occ=%d\n" % (c, d["ocorrencias"]))
print("ok", len(status_ids), len(corte_ids), len(nc_ids))
