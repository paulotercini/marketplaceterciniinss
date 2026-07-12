# -*- coding: utf-8 -*-
"""Insere alerta de auditoria nas skills do plugin que citam Sumula 88/89 TNU ou Tema 201 TNU."""
import os, re

ROOT = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini\_base-conhecimento-inss\skills"
SKIP = {"base-b94-sequela-minima-tema201", "base-precedentes-catalogo-vinculantes"}
RX = re.compile(r"(S[úu]mula\s+8[89]\s*(?:/\s*|\s+d[ao]\s+|\s+)TNU|Tema\s+201\s*(?:/\s*|\s+d[ao]\s+|\s+)TNU)", re.I)

ALERTA = """
## ALERTA DE AUDITORIA (11/07/2026), CITACOES CONTAMINADAS DETECTADAS NESTA SKILL

Conferencia em fonte oficial (CJF e STJ) apurou o seguinte sobre citacoes usadas nesta skill.

1. Sumula 88/TNU e Sumula 89/TNU NAO EXISTEM. A lista oficial da TNU termina na Sumula 86, cancelada em 26/08/2021. Nao citar em nenhuma peca.
2. Tema 201/TNU tem tese real CONTRARIA ao contribuinte individual. "O contribuinte individual nao faz jus ao auxilio-acidente, diante de expressa exclusao legal." Nao usar como fundamento de sequela minima nem em favor da concessao.
3. Fundamentos corretos. Sequela minima e o Tema 416/STJ (beneficio devido ainda que minima a lesao). Dispensa de exaurimento administrativo em acidentaria e a Sumula 89/STJ.

Ate a reescrita definitiva (Etapa 2 da auditoria), IGNORAR mencoes contrarias a este alerta no corpo ou nas references desta skill. Quadro completo em base-precedentes-catalogo-vinculantes/references/ATUALIZACAO-STATUS-2026-06.md.
"""

MARK = "ALERTA DE AUDITORIA (11/07/2026)"
patched, found = [], []
for skill in sorted(os.listdir(ROOT)):
    if skill in SKIP:
        continue
    fp = os.path.join(ROOT, skill, "SKILL.md")
    if not os.path.isfile(fp):
        continue
    txt = open(fp, encoding="utf-8", errors="replace").read()
    if not RX.search(txt):
        continue
    found.append(skill)
    if MARK in txt:
        continue
    parts = txt.split("---", 2)
    if len(parts) < 3:
        print("SEM FRONTMATTER, pulei:", skill); continue
    novo = "---" + parts[1] + "---\n" + ALERTA + parts[2]
    open(fp, "w", encoding="utf-8").write(novo)
    patched.append(skill)

print("Skills com citacao contaminada:", len(found))
for s in found: print(" -", s)
print("Patch aplicado em:", len(patched))
