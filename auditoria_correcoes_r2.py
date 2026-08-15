# -*- coding: utf-8 -*-
"""Rodada 2 da auditoria (25/07/2026). Data oficial do Tema 365/TNU e marco temporal da Sumula 87/TNU."""
import io, os
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_base-conhecimento-inss", "skills")
NOTA = "auditoria 25/07/2026, rodada 2, data conferida na pagina oficial do CJF"

def S(fn, old, new):
    p = os.path.join(BASE, fn.replace("/", os.sep))
    t = io.open(p, encoding="utf-8").read()
    n = t.count(old)
    if n != 1:
        print("FALHA", fn, n, old[:60])
        return
    io.open(p, "w", encoding="utf-8", newline="").write(t.replace(old, new))
    print("ok", fn)

S("base-carencia-por-especie-art27a/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "### Tema 365 TNU (tese conferida na página oficial do CJF em 11/07/2026, julgado em 13/11/2025)",
  "### Tema 365 TNU (tese e data conferidas na página oficial do CJF, julgado em 12/11/2025, acórdão publicado em 18/12/2025 — auditoria 25/07/2026, a data antes registrada, 13/11/2025, estava errada)")
S("base-precedentes-catalogo-vinculantes/references/ATUALIZACAO-STATUS-2026-06.md",
  "A tese real, julgada em 13/11/2025 (PEDILEF 0500120-68.2021.4.05.8311/PE)",
  "A tese real, julgada em 12/11/2025 (PEDILEF 0500120-68.2021.4.05.8311/PE; data corrigida na auditoria de 25/07/2026, página oficial do CJF)")
S("base-precedentes-catalogo-vinculantes/references/CATALOGO-TEMAS-TNU.md",
  "Julgado em 13/11/2025, PEDILEF 0500120-68.2021.4.05.8311/PE.",
  "Julgado em 12/11/2025 (data corrigida na auditoria de 25/07/2026, página oficial do CJF; acórdão publicado em 18/12/2025), PEDILEF 0500120-68.2021.4.05.8311/PE.")
S("contribuicoes-complementacao-ec103/SKILL.md",
  "**Tema 365/TNU** (j. 13/11/2025)", "**Tema 365/TNU** (j. 12/11/2025, %s)" % NOTA)
S("pensao-por-morte/SKILL.md",
  "Tema 365/TNU** (j. 13/11/2025)", "Tema 365/TNU** (j. 12/11/2025, %s)" % NOTA)
S("periodo-graca-qualidade-segurado/SKILL.md",
  "PUIL 0500120-68.2021.4.05.8311/PE, j. 13/11/2025",
  "PUIL 0500120-68.2021.4.05.8311/PE, j. 12/11/2025 (%s)" % NOTA)
S("base-especial-epi/references/FUNDAMENTOS-E-CENARIOS.md",
  "Súmula 87 TNU (verificar vigência em https://www.cjf.jus.br). O tempo especial não se descaracteriza pela simp",
  "Súmula 87 TNU, vigente, conferida na página oficial do CJF em 25/07/2026 e restrita a período anterior a 03/12/1998 (MP 1.729/98). Nesse período, o tempo especial não se descaracteriza pela simp")
print("fim")
