# -*- coding: utf-8 -*-
"""Bump Onda 76 v1.66.0 nos tres manifests."""
import io, os
BASE = os.path.dirname(os.path.abspath(__file__))
ONDA = ("A versao 1.66.0 entrega a Onda 76, primeira auditoria de citacoes em massa da skill auditoria-citacoes "
        "(Etapas 1 a 5): 537 arquivos varridos, 890 citacoes distintas, 85 verificadas por subagentes, 223 correcoes "
        "com nota datada de 25/07/2026 em 130 arquivos. Erros graves corrigidos: Tema 327/STF trocado por Tema 76/STF "
        "(RE 564.354, teto); Sumula 555/STJ (decadencia tributaria) retirada das skills de tempo especial; Tema 305/TNU "
        "(auxilio emergencial) retirado das skills PCD; Tema 297/TNU retirado da prova trabalhista (fundamento correto, "
        "Tema 1188/STJ); Tema 1370/STJ (decadencia de revisao, pendente) retirado da acao rescisoria; QO 48/TNU com "
        "objeto corrigido (veda paradigma do STF; a vedacao a TRF decorre do art. 14, par. 2, da Lei 10.259/2001); "
        "Sumula 63/TNU atualizada para a redacao de 18/09/2025 (fatos geradores ate a MP 871/2019, marco 18/01/2019) e "
        "retirada do uso indevido em carencia B31; Sumula 726/STF reposicionada como restritiva mitigada pela Lei "
        "11.301/2006 e ADI 3772; Tema 1066/STF substituido em 31 arquivos pelo acordo homologado no RE 1.171.152/STF "
        "(ex-tema cancelado em 22/02/2021, prazos por especie de 30 a 90 dias, clausula de 24 meses com prorrogacao nao "
        "confirmada); Temas 640/STF-TNU para Tema 640/STJ; Tema 312/TNU para RE 580.963/STF; Tema 692/STF para Tema "
        "692/STJ, que IMPOE devolucao na tutela revogada (excecoes reais, BPC, Tema 979 e Tema 1034; Tema 1009/STJ "
        "retirado); Tema 73/STJ para Tema 185/STJ; Tema 942/STJ (cheque) para art. 25, par. 2, EC 103 e Tema 942/STF "
        "(RE 1.014.286); Tema 709/STJ para Tema 709/STF (RE 791.961); Temas 1117 e 1157/STF retirados da RVT; Tema "
        "313/STJ retirado da tutela; Tema 176/STF retirado da contagem reciproca; Tema 1207/STF retirado da "
        "reaposentacao; Tema 732/STF para Tema 732/STJ com alerta do Tema 1271/STF (RE 1.442.021, suspensao nacional "
        "desde 21/01/2025); Temas 1188/STF, 33/STF e 660/STF retirados; Tema 698/STJ reposicionado como limite da "
        "Sumula 98/STJ; data do Tema 365/TNU unificada em 13/11/2025. CATALOGO-COMPLEMENTAR-VERIFICADO inaugurado com "
        "8 itens em fonte oficial (Sumulas 89, 111, 377, 552 e 203 do STJ, Tema 1030/STJ, Tema 125/TST e o acordo do "
        "RE 1.171.152). Fila de 590 pendencias registrada para as proximas rodadas; relatorio completo em "
        "RELATORIO-AUDITORIA-CITACOES-ONDA-76.md. ")
for rel in [".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", "_base-conhecimento-inss/.claude-plugin/plugin.json"]:
    p = os.path.join(BASE, rel.replace("/", os.sep))
    t = io.open(p, encoding="utf-8").read()
    n = t.count("1.65.0")
    t = t.replace("1.65.0", "1.66.0")
    marc = '"description": "'
    if rel.startswith("_base") and marc in t:
        t = t.replace(marc, marc + ONDA, 1)
    io.open(p, "w", encoding="utf-8", newline="").write(t)
    print(rel, "versoes trocadas:", n)
print("ok")
