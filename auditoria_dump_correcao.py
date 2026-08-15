# -*- coding: utf-8 -*-
"""Dump completo de ocorrencias dos itens marcados para correcao (Etapa 4)."""
import os, json
BASE = os.path.dirname(os.path.abspath(__file__))
ach = json.load(open(os.path.join(BASE, "auditoria_citacoes.json"), encoding="utf-8"))["achados"]
IDS = ["TEMA 1066/STF", "SUMULA 63/TNU", "SUMULA 555/STJ", "SUMULA 726/STF",
       "TEMA 305/TNU", "TEMA 327/STF", "QO 48/TNU", "TEMA 297/TNU",
       "TEMA 640/STF", "TEMA 640/TNU", "TEMA 312/TNU", "TEMA 692/STF",
       "TEMA 1370/STJ", "TEMA 73/STJ", "TEMA 942/STJ", "TEMA 709/STJ",
       "TEMA 1117/STF", "TEMA 1157/STF", "TEMA 313/STJ", "TEMA 176/STF",
       "TEMA 627/STF", "TEMA 1207/STF", "TEMA 732/STF", "TEMA 1188/STF",
       "TEMA 33/STF", "TEMA 698/STJ", "TEMA 365/TNU", "TEMA 660/STF"]
with open(os.path.join(BASE, "dump_correcao.md"), "w", encoding="utf-8") as f:
    for cid in IDS:
        occs = ach.get(cid, [])
        f.write("## %s (%d)\n" % (cid, len(occs)))
        for o in occs:
            f.write("%s:%d :: %s\n" % (o["arquivo"], o["linha"], o["contexto"]))
        f.write("\n")
print("ok")
