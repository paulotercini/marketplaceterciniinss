# -*- coding: utf-8 -*-
"""Substitui o alerta v1 (que declarava inexistencia das Sumulas 88/89 TNU) pelo alerta corrigido v2."""
import os, io

ROOT = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini\_base-conhecimento-inss\skills"
INICIO = "## ALERTA DE AUDITORIA (11/07/2026), CITACOES CONTAMINADAS DETECTADAS NESTA SKILL"
FIM = "base-precedentes-catalogo-vinculantes/references/ATUALIZACAO-STATUS-2026-06.md."

NOVO = """## NOTA DE AUDITORIA (11/07/2026, com errata da mesma data)

Conferencia em fonte oficial (CJF e STJ) sobre citacoes usadas nesta skill.

1. Sumulas 88 e 89 da TNU EXISTEM e estao VIGENTES (aprovadas na Sessao Ordinaria de 17/04/2024, DJeN 24/04/2024). Texto literal da Sumula 88/TNU. "A existencia de limitacao, ainda que leve, para o desempenho da atividade para o trabalho habitual enseja a concessao do beneficio de auxilio-acidente, em observancia a tese fixada sob o Tema 416 do Superior Tribunal de Justica." Texto literal da Sumula 89/TNU. "Nao ha direito a concessao de beneficio de auxilio-acidente quando, apos consolidacao das lesoes decorrentes de acidente de qualquer natureza, resultarem sequelas que nao reduzem a capacidade laborativa habitual nem sequer demandam dispendio de maior esforco na execucao da atividade habitual." Usar sempre estes textos, nao parafrasear.
2. Tema 201/TNU tem tese CONTRARIA ao contribuinte individual. "O contribuinte individual nao faz jus ao auxilio-acidente, diante de expressa exclusao legal." Nao usar como fundamento de sequela minima nem em favor da concessao. A tese de sequela minima e a Sumula 88/TNU c/c Tema 416/STJ.
3. Nao confundir com a Sumula 89/STJ ("A acao acidentaria prescinde do exaurimento da via administrativa"), valida no contexto acidentario estadual.

Quadro completo e errata em base-precedentes-catalogo-vinculantes/references/ATUALIZACAO-STATUS-2026-06.md."""

count = 0
for skill in sorted(os.listdir(ROOT)):
    fp = os.path.join(ROOT, skill, "SKILL.md")
    if not os.path.isfile(fp):
        continue
    t = io.open(fp, encoding="utf-8", errors="replace").read()
    if INICIO not in t:
        continue
    i = t.index(INICIO)
    j = t.index(FIM, i) + len(FIM)
    t = t[:i] + NOVO + t[j:]
    io.open(fp, "w", encoding="utf-8").write(t)
    count += 1
    print("corrigido:", skill)
print("total:", count)
