"""Tabela de identidade do corpus, escrita à mão e conferida arquivo a arquivo em 20/09/2026.

Derivar o identificador da norma por regex sobre o nome do arquivo funciona em 57 dos 60 casos
e erra calado nos outros três, que é o pior modo de errar. Aqui cada arquivo aponta a sua norma
de forma explícita, e o teste cobra que os 60 arquivos do corpus estejam nesta tabela.

Uma norma pode ter vários arquivos: o Decreto 3.048 tem cinco e a IN 128 tem quatro.
"""

# arquivo -> (norma_id, tipo, numero, ano, titulo)
NORMAS = {
    "CF-1988-completa.md": (
        "cf-1988", "constituicao", "", 1988,
        "Constituição da República Federativa do Brasil de 1988"),
    "EC-20-1998.md": (
        "ec-20-1998", "emenda", "20", 1998,
        "Emenda Constitucional nº 20, de 15 de dezembro de 1998 — reforma da Previdência"),
    "EC-103-2019.md": (
        "ec-103-2019", "emenda", "103", 2019,
        "Emenda Constitucional nº 103, de 12 de novembro de 2019 — reforma da Previdência"),
    "EC-136-2025.md": (
        "ec-136-2025", "emenda", "136", 2025,
        "Emenda Constitucional nº 136, de 2025 — precatórios"),

    "LC-142-2013-aposentadoria-PCD.md": (
        "lc-142-2013", "lei-complementar", "142", 2013,
        "Lei Complementar nº 142, de 8 de maio de 2013 — aposentadoria da pessoa com deficiência"),

    "Lei-7713-1988-IR.md": (
        "lei-7713-1988", "lei", "7713", 1988,
        "Lei nº 7.713, de 22 de dezembro de 1988 — imposto de renda da pessoa física"),
    "Lei-8112-1990-servidores.md": (
        "lei-8112-1990", "lei", "8112", 1990,
        "Lei nº 8.112, de 11 de dezembro de 1990 — regime jurídico dos servidores federais"),
    "Lei-8212-91-custeio.md": (
        "lei-8212-1991", "lei", "8212", 1991,
        "Lei nº 8.212, de 24 de julho de 1991 — custeio da Seguridade Social"),
    "Lei-8213-91-beneficios.md": (
        "lei-8213-1991", "lei", "8213", 1991,
        "Lei nº 8.213, de 24 de julho de 1991 — Plano de Benefícios da Previdência Social"),
    "Lei-8742-93-LOAS.md": (
        "lei-8742-1993", "lei", "8742", 1993,
        "Lei nº 8.742, de 7 de dezembro de 1993 — Lei Orgânica da Assistência Social"),
    "Lei-8880-1994.md": (
        "lei-8880-1994", "lei", "8880", 1994,
        "Lei nº 8.880, de 27 de maio de 1994 — Programa de Estabilização Econômica e URV"),
    "Lei-9032-1995.md": (
        "lei-9032-1995", "lei", "9032", 1995,
        "Lei nº 9.032, de 28 de abril de 1995 — altera a legislação de benefícios"),
    "Lei-9099-1995-juizados-especiais.md": (
        "lei-9099-1995", "lei", "9099", 1995,
        "Lei nº 9.099, de 26 de setembro de 1995 — Juizados Especiais Cíveis e Criminais"),
    "Lei-9494-1997.md": (
        "lei-9494-1997", "lei", "9494", 1997,
        "Lei nº 9.494, de 10 de setembro de 1997 — tutela antecipada contra a Fazenda Pública"),
    "Lei-9784-1999-processo-administrativo.md": (
        "lei-9784-1999", "lei", "9784", 1999,
        "Lei nº 9.784, de 29 de janeiro de 1999 — processo administrativo federal"),
    "Lei-9796-1999-compensacao-previdenciaria.md": (
        "lei-9796-1999", "lei", "9796", 1999,
        "Lei nº 9.796, de 5 de maio de 1999 — compensação financeira entre regimes"),
    "Lei-9876-1999.md": (
        "lei-9876-1999", "lei", "9876", 1999,
        "Lei nº 9.876, de 26 de novembro de 1999 — fator previdenciário e salário de benefício"),
    "Lei-10259-2001-JEF.md": (
        "lei-10259-2001", "lei", "10259", 2001,
        "Lei nº 10.259, de 12 de julho de 2001 — Juizados Especiais Federais"),
    "Lei-10666-2003.md": (
        "lei-10666-2003", "lei", "10666", 2003,
        "Lei nº 10.666, de 8 de maio de 2003 — aposentadoria especial e contribuinte individual"),
    "Lei-10741-2003-estatuto-idoso.md": (
        "lei-10741-2003", "lei", "10741", 2003,
        "Lei nº 10.741, de 1º de outubro de 2003 — Estatuto da Pessoa Idosa"),
    "Lei-12016-2009-mandado-seguranca.md": (
        "lei-12016-2009", "lei", "12016", 2009,
        "Lei nº 12.016, de 7 de agosto de 2009 — mandado de segurança"),
    "Lei-13105-2015-CPC.md": (
        "lei-13105-2015", "lei", "13105", 2015,
        "Lei nº 13.105, de 16 de março de 2015 — Código de Processo Civil"),
    "Lei-13135-2015-pensao.md": (
        "lei-13135-2015", "lei", "13135", 2015,
        "Lei nº 13.135, de 17 de junho de 2015 — pensão por morte e auxílio-doença"),
    "Lei-13146-15-EPCD.md": (
        "lei-13146-2015", "lei", "13146", 2015,
        "Lei nº 13.146, de 6 de julho de 2015 — Estatuto da Pessoa com Deficiência"),
    "Lei-13460-2017-usuario-servico-publico.md": (
        "lei-13460-2017", "lei", "13460", 2017,
        "Lei nº 13.460, de 26 de junho de 2017 — direitos do usuário de serviço público"),
    "Lei-13846-2019.md": (
        "lei-13846-2019", "lei", "13846", 2019,
        "Lei nº 13.846, de 18 de junho de 2019 — Programa Especial e combate a irregularidades"),
    "Lei-14768-2023-deficiencia-auditiva.md": (
        "lei-14768-2023", "lei", "14768", 2023,
        "Lei nº 14.768, de 22 de dezembro de 2023 — deficiência auditiva unilateral"),
    "Lei-15176-2025-fibromialgia.md": (
        "lei-15176-2025", "lei", "15176", 2025,
        "Lei nº 15.176, de 2025 — fibromialgia como deficiência para todos os efeitos legais"),

    "Decreto-53831-1964-quadro-agentes-nocivos.md": (
        "decreto-53831-1964", "decreto", "53831", 1964,
        "Decreto nº 53.831, de 25 de março de 1964 — quadro de agentes nocivos"),
    "Decreto-62755-1968.md": (
        "decreto-62755-1968", "decreto", "62755", 1968,
        "Decreto nº 62.755, de 22 de maio de 1968"),
    "Decreto-83080-1979.md": (
        "decreto-83080-1979", "decreto", "83080", 1979,
        "Decreto nº 83.080, de 24 de janeiro de 1979 — Regulamento de Benefícios"),
    "Decreto-83080-1979-quadro-agentes-nocivos.PARCIAL.md": (
        "decreto-83080-1979", "decreto", "83080", 1979,
        "Decreto nº 83.080, de 24 de janeiro de 1979 — Regulamento de Benefícios"),
    "Decreto-2172-1997-RBPS.md": (
        "decreto-2172-1997", "decreto", "2172", 1997,
        "Decreto nº 2.172, de 5 de março de 1997 — Regulamento dos Benefícios"),
    "Decreto-3048-99-RPS-parte1-arts-1-100.md": (
        "decreto-3048-1999", "decreto", "3048", 1999,
        "Decreto nº 3.048, de 6 de maio de 1999 — Regulamento da Previdência Social"),
    "Decreto-3048-99-RPS-parte2-arts-101-200.md": (
        "decreto-3048-1999", "decreto", "3048", 1999,
        "Decreto nº 3.048, de 6 de maio de 1999 — Regulamento da Previdência Social"),
    "Decreto-3048-99-RPS-parte3-arts-201-300.md": (
        "decreto-3048-1999", "decreto", "3048", 1999,
        "Decreto nº 3.048, de 6 de maio de 1999 — Regulamento da Previdência Social"),
    "Decreto-3048-99-RPS-parte4-arts-301-fim.md": (
        "decreto-3048-1999", "decreto", "3048", 1999,
        "Decreto nº 3.048, de 6 de maio de 1999 — Regulamento da Previdência Social"),
    "Decreto-3048-99-anexos-II-III-IV.md": (
        "decreto-3048-1999", "decreto", "3048", 1999,
        "Decreto nº 3.048, de 6 de maio de 1999 — Regulamento da Previdência Social"),
    "Decreto-6214-2007-Regulamento-BPC.md": (
        "decreto-6214-2007", "decreto", "6214", 2007,
        "Decreto nº 6.214, de 26 de setembro de 2007 — Regulamento do BPC"),
    "Decreto-6949-2009-convencao-NY-PCD.md": (
        "decreto-6949-2009", "decreto", "6949", 2009,
        "Decreto nº 6.949, de 25 de agosto de 2009 — Convenção de Nova York sobre os Direitos "
        "das Pessoas com Deficiência"),
    "Decreto-10995-2022.md": (
        "decreto-10995-2022", "decreto", "10995", 2022,
        "Decreto nº 10.995, de 14 de março de 2022 — estrutura regimental do INSS"),

    "IN-128-2022-INSS-parte1-arts-1-170.md": (
        "in-128-2022", "in", "128", 2022,
        "Instrução Normativa PRES/INSS nº 128, de 28 de março de 2022"),
    "IN-128-2022-INSS-parte2-arts-171-340.md": (
        "in-128-2022", "in", "128", 2022,
        "Instrução Normativa PRES/INSS nº 128, de 28 de março de 2022"),
    "IN-128-2022-INSS-parte3-arts-341-510.md": (
        "in-128-2022", "in", "128", 2022,
        "Instrução Normativa PRES/INSS nº 128, de 28 de março de 2022"),
    "IN-128-2022-INSS-parte4-arts-511-674.md": (
        "in-128-2022", "in", "128", 2022,
        "Instrução Normativa PRES/INSS nº 128, de 28 de março de 2022"),

    "Portaria-Interministerial-1-2014-IF-BrA.md": (
        "portaria-interministerial-1-2014", "portaria", "1", 2014,
        "Portaria Interministerial AGU/MPS/MF/SEDH/MP nº 1, de 27 de janeiro de 2014 — IF-BrA"),
    "Portaria-Conjunta-MDS-INSS-2-2015-BPC-avaliacao.md": (
        "portaria-conjunta-2-2015", "portaria", "2", 2015,
        "Portaria Conjunta MDS/INSS nº 2, de 30 de março de 2015 — avaliação do BPC"),
    "Portaria-INSS-914-2021-PRBI.md": (
        "portaria-inss-914-2021", "portaria", "914", 2021,
        "Portaria INSS nº 914, de 6 de agosto de 2021 — Programa de Revisão de Benefícios"),
    "Portaria-DIRBEN-INSS-990-2022-CNIS.md": (
        "portaria-dirben-990-2022", "portaria", "990", 2022,
        "Portaria DIRBEN/INSS nº 990, de 28 de março de 2022 — Livro I, CNIS e cadastro"),
    "Portaria-DIRBEN-INSS-991-2022-concessao-revisao.md": (
        "portaria-dirben-991-2022", "portaria", "991", 2022,
        "Portaria DIRBEN/INSS nº 991, de 28 de março de 2022 — Livro II, reconhecimento de direito"),
    "Portaria-DIRBEN-INSS-992-2022-manutencao.md": (
        "portaria-dirben-992-2022", "portaria", "992", 2022,
        "Portaria DIRBEN/INSS nº 992, de 28 de março de 2022 — Livro III, manutenção"),
    "Portaria-DIRBEN-INSS-993-2022-processo-administrativo.md": (
        "portaria-dirben-993-2022", "portaria", "993", 2022,
        "Portaria DIRBEN/INSS nº 993, de 28 de março de 2022 — Livro IV, processo administrativo"),
    "Portaria-DIRBEN-INSS-994-2022-acumulacao.md": (
        "portaria-dirben-994-2022", "portaria", "994", 2022,
        "Portaria DIRBEN/INSS nº 994, de 28 de março de 2022 — acumulação de benefícios"),
    "Portaria-DIRBEN-INSS-995-2022-acordos-internacionais.md": (
        "portaria-dirben-995-2022", "portaria", "995", 2022,
        "Portaria DIRBEN/INSS nº 995, de 28 de março de 2022 — acordos internacionais"),
    "Portaria-DIRBEN-INSS-996-2022-recursos.md": (
        "portaria-dirben-996-2022", "portaria", "996", 2022,
        "Portaria DIRBEN/INSS nº 996, de 28 de março de 2022 — recursos"),
    "Portaria-DIRBEN-INSS-998-2022-compensacao-previdenciaria.md": (
        "portaria-dirben-998-2022", "portaria", "998", 2022,
        "Portaria DIRBEN/INSS nº 998, de 28 de março de 2022 — compensação previdenciária"),
    "Portaria-DIRBEN-INSS-1309-2025-supervisao-tecnica-revisao.md": (
        "portaria-dirben-1309-2025", "portaria", "1309", 2025,
        "Portaria DIRBEN/INSS nº 1.309, de 2025 — supervisão técnica e revisão"),
    "Portaria-DIRBEN-INSS-1318-2025.md": (
        "portaria-dirben-1318-2025", "portaria", "1318", 2025,
        "Portaria DIRBEN/INSS nº 1.318, de 2025"),
    "Portaria-PRES-INSS-1851-2025-anexo-VI-estrutura-SR.md": (
        "portaria-inss-1851-2025", "portaria", "1851", 2025,
        "Portaria PRES/INSS nº 1.851, de 2025 — Anexo VI, estrutura das Superintendências"),
    "Portaria-MPS-125-2026.md": (
        "portaria-mps-125-2026", "portaria", "125", 2026,
        "Portaria MPS nº 125, de 26 de janeiro de 2026 — Regimento Interno do CRPS"),
    "Portaria-Conjunta-MPS-INSS-43-2026.md": (
        "portaria-conjunta-43-2026", "portaria", "43", 2026,
        "Portaria Conjunta MPS/INSS nº 43, de 18 de setembro de 2026 — prorroga o limite de 90 dias do B31 documental"),
}

# arquivo -> motivo de ficar fora do banco. Sai na visão geral, para o vazio ser declarado e
# não parecer ausência da norma.
FORA = {
    "Decreto-6214-2007-Regulamento-BPC.md":
        "sem frontmatter: não há fonte_oficial, data de download nem hash para citar a origem",
    "Portaria-DIRBEN-INSS-998-2022-compensacao-previdenciaria.md":
        "sem frontmatter: não há fonte_oficial, data de download nem hash para citar a origem",
    "Portaria-INSS-914-2021-PRBI.md":
        "sem frontmatter: não há fonte_oficial, data de download nem hash para citar a origem",
    "Decreto-3048-99-anexos-II-III-IV.md":
        "anexo em pseudo-tabela, sem artigo: 832 linhas com pipe e só 2 de separador, linhas de "
        "até 2.717 caracteres. CONSEQUÊNCIA PRÁTICA: o quadro de agentes nocivos dos Anexos II, "
        "III e IV não é buscável, então uma busca por ruído, agente químico ou agente biológico "
        "NÃO alcança o Decreto 3.048. Use o Decreto 53.831/1964, que está na base, e confira o "
        "Anexo IV na fonte oficial. Fica para a segunda versão, que precisa de leitor de tabela",
    "Portaria-PRES-INSS-1851-2025-anexo-VI-estrutura-SR.md":
        "anexo de estrutura organizacional, sem artigo nenhum. Fica para a segunda versão",
}

# Comportamento conhecido que NÃO derruba a carga e também não passa em silêncio: entra no
# relatório da ingestão, na visão geral e tem assertiva no teste.
CASOS_PREVISTOS = {
    "decreto-2172-1997":
        "258 artigos e zero marcador de alteração. É a redação de 1997 como publicada, revogada "
        "pelo Decreto 3.048/1999, e serve de texto histórico. Não é falha de extração",
    "in-128-2022":
        "674 artigos e zero marcador. Fotografia consolidada até a IN 170/2024, sem histórico "
        "interno. Os anexos I a XXIX não estão no corpus",
    "portaria-dirben-991-2022":
        "569 artigos e zero marcador, sendo 2 da portaria e 567 do Livro II anexo. Fotografia "
        "consolidada, e o texto vem com quebra de linha dura no meio da frase",
    "cf-1988":
        "um arquivo com duas partes, corpo permanente e ADCT. 139 números de artigo existem nas "
        "duas, então a chave é sempre escopada por parte",
    "decreto-3048-1999":
        "quatro arquivos de faixas disjuntas mais o dos anexos. Os arts. 1 a 3 do decreto e os "
        "arts. 1 em diante do regulamento convivem em partes separadas",
    "decreto-83080-1979":
        "dois arquivos, o principal e um .PARCIAL com o mesmo conjunto de 4 artigos. A duplicata "
        "vira versão da mesma chave e está declarada aqui",
}


def identidade(nome_arquivo):
    """(norma_id, tipo, numero, ano, titulo). Arquivo fora da tabela levanta erro, porque
    adivinhar o identificador de uma norma nova é pior do que parar."""
    try:
        return NORMAS[nome_arquivo]
    except KeyError:
        raise KeyError(
            f"{nome_arquivo} não está na tabela de identidade. Acrescente a linha em "
            f"identidade.py antes de ingerir, com norma_id, tipo, número, ano e título.") from None
