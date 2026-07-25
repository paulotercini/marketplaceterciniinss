# -*- coding: utf-8 -*-
"""Bump Onda 77 v1.67.0 nos tres manifests."""
import io, os
BASE = os.path.dirname(os.path.abspath(__file__))
ONDA = ("A versao 1.67.0 entrega a Onda 77, rodada 2 da auditoria de citacoes com os portais oficiais abertos via "
        "crawl4ai: 30 itens promovidos a CONFIRMADO_FONTE_OFICIAL e o CATALOGO-COMPLEMENTAR-VERIFICADO chega a 38 "
        "entradas com texto literal e link (Sumulas 27, 42, 43, 47, 63, 73, 86 e 87 da TNU e QOs 24 e 48 nas paginas "
        "do CJF; Temas 300, 317 e 365 da TNU nas paginas oficiais de temas representativos; Temas 76, 27, 312, 334, "
        "359, 368, 377, 555, 709, 810, 942 e 1271 do STF nas paginas tema.asp do portal do STF; Sumulas 269, 271, 359 "
        "e 726 do STF; ADI 3772 com dispositivo literal; Sumulas 85, 98, 149, 507 e 577 do STJ e Temas 640, 732 e 905 "
        "do STJ no SCON). CORRECOES NOVAS: a data real do Tema 365/TNU e 12/11/2025 conforme a pagina oficial do CJF "
        "(acordao publicado em 18/12/2025), corrigida a conferencia anterior que registrava 13/11/2025 em seis "
        "arquivos, inclusive no catalogo curado; a Sumula 87/TNU teve o marco temporal (atividade anterior a "
        "03/12/1998) explicitado no reference de EPI; o RE 1.510.285 AgR recebeu alerta de divergencia de orgao "
        "julgador e data entre as fontes (Segunda Turma 09/12/2024 versus Primeira Turma 26/05/2026), a conferir no "
        "portal antes de citar. Confirmados ainda o RE 580.963 como Tema 312/STF, a suspensao nacional do Tema "
        "1271/STF desde 21/01/2025 com parecer da PGR de 15/04/2026, o transito em julgado do Tema 317/TNU em "
        "11/02/2026 e a situacao Em Julgamento sem tese do Tema 383/TNU. ADI 3931 e Sumula 198/TFR permanecem como "
        "provaveis por fonte secundaria, sem link oficial estavel. ")
for rel in [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", "_base-conhecimento-inss/.claude-plugin/plugin.json"]:
    p = os.path.join(BASE, rel.replace("/", os.sep))
    t = io.open(p, encoding="utf-8").read()
    n = t.count("1.66.0")
    t = t.replace("1.66.0", "1.67.0")
    marc = '"description": "'
    if rel.startswith("_base") and marc in t:
        t = t.replace(marc, marc + ONDA, 1)
    io.open(p, "w", encoding="utf-8", newline="").write(t)
    print(rel, "versoes trocadas:", n)
print("ok")
