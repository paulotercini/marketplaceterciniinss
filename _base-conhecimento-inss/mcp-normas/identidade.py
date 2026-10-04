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

    # --- Onda de 04/10/2026, fase 1 das normas ausentes (prioridade A) ---
    "Portaria-Conjunta-MPS-INSS-13-2026.md": (
        "portaria-conjunta-13-2026", "portaria", "13", 2026,
        "Portaria Conjunta MPS/INSS nº 13, de 23/03/2026"),
    "Lei-10406-2002.md": (
        "lei-10406-2002", "lei", "10406", 2002,
        "Lei nº 10.406, de 10/01/2002 (Código Civil)"),
    "Decreto-6214-2007.md": (
        "decreto-6214-2007", "decreto", "6214", 2007,
        "Decreto nº 6.214, de 26/09/2007"),
    "Portaria-Conjunta-DPMF-INSS-19-2026.md": (
        "portaria-conjunta-19-2026", "portaria", "19", 2026,
        "Portaria Conjunta DPMF/INSS nº 19, de 31/03/2026"),
    "Decreto-Lei-5452-1943.md": (
        "decreto-lei-5452-1943", "decreto-lei", "5452", 1943,
        "Decreto-Lei nº 5.452, de 01/05/1943 (CLT)"),
    "Portaria-DIRBEN-INSS-1316-2025.md": (
        "portaria-dirben-1316-2025", "portaria", "1316", 2025,
        "Portaria DIRBEN/INSS nº 1.316, de 24/11/2025"),
    "MP-871-2019.md": (
        "mp-871-2019", "medida-provisoria", "871", 2019,
        "Medida Provisória nº 871, de 18/01/2019"),
    "Portaria-Conjunta-MDS-INSS-34-2025.md": (
        "portaria-conjunta-34-2025", "portaria", "34", 2025,
        "Portaria Conjunta MDS/INSS nº 34, de 09/10/2025"),
    "Portaria-Conjunta-MDS-MPS-INSS-37-2026.md": (
        "portaria-conjunta-37-2026", "portaria", "37", 2026,
        "Portaria Conjunta MDS/MPS/INSS nº 37, de 01/04/2026"),
    "Decreto-12534-2025.md": (
        "decreto-12534-2025", "decreto", "12534", 2025,
        "Decreto nº 12.534, de 25/06/2025"),
    "Lei-11301-2006.md": (
        "lei-11301-2006", "lei", "11301", 2006,
        "Lei nº 11.301, de 10/05/2006"),
    "Lei-15326-2026.md": (
        "lei-15326-2026", "lei", "15326", 2026,
        "Lei nº 15.326, de 06/01/2026"),
    "Decreto-Lei-2848-1940.md": (
        "decreto-lei-2848-1940", "decreto-lei", "2848", 1940,
        "Decreto-Lei nº 2.848, de 07/12/1940 (Código Penal)"),
    "EC-113-2021.md": (
        "ec-113-2021", "emenda", "113", 2021,
        "Emenda Constitucional nº 113, de 08/12/2021"),
    "Lei-13709-2018.md": (
        "lei-13709-2018", "lei", "13709", 2018,
        "Lei nº 13.709, de 14/08/2018 (LGPD)"),
    "Portaria-Conjunta-MPS-INSS-15-2026.md": (
        "portaria-conjunta-15-2026", "portaria", "15", 2026,
        "Portaria Conjunta MPS/INSS nº 15, de 23/03/2026"),
    "Decreto-5296-2004.md": (
        "decreto-5296-2004", "decreto", "5296", 2004,
        "Decreto nº 5.296, de 02/12/2004"),
    "Lei-8078-1990.md": (
        "lei-8078-1990", "lei", "8078", 1990,
        "Lei nº 8.078, de 11/09/1990 (CDC)"),
    "Lei-12527-2011.md": (
        "lei-12527-2011", "lei", "12527", 2011,
        "Lei nº 12.527, de 18/11/2011"),
    "Decreto-Lei-4657-1942.md": (
        "decreto-lei-4657-1942", "decreto-lei", "4657", 1942,
        "Decreto-Lei nº 4.657, de 04/09/1942 (LINDB)"),
    "Lei-11718-2008.md": (
        "lei-11718-2008", "lei", "11718", 2008,
        "Lei nº 11.718, de 20/06/2008"),
    "EC-41-2003.md": (
        "ec-41-2003", "emenda", "41", 2003,
        "Emenda Constitucional nº 41, de 19/12/2003"),
    "Portaria-Conjunta-MPS-INSS-14-2026.md": (
        "portaria-conjunta-14-2026", "portaria", "14", 2026,
        "Portaria Conjunta MPS/INSS nº 14, de 23/03/2026"),
    "IN-INSS-PRES-77-2015.md": (
        "in-77-2015", "in", "77", 2015,
        "Instrução Normativa INSS/PRES nº 77, de 21/01/2015"),
    "Portaria-Conjunta-MPS-INSS-43-2026.md": (
        "portaria-conjunta-43-2026", "portaria", "43", 2026,
        "Portaria Conjunta MPS/INSS nº 43, de 18/09/2026"),
    "IN-54-SENARC-MDS-2026.md": (
        "in-senarc-mds-54-2026", "in", "54", 2026,
        "Instrução Normativa nº 54/SENARC/MDS, de 30/04/2026"),
    "Lei-14128-2021.md": (
        "lei-14128-2021", "lei", "14128", 2021,
        "Lei nº 14.128, de 26/03/2021"),
    "Lei-11960-2009.md": (
        "lei-11960-2009", "lei", "11960", 2009,
        "Lei nº 11.960, de 29/06/2009"),
    "Portaria-DIRBEN-INSS-1310-2025.md": (
        "portaria-dirben-1310-2025", "portaria", "1310", 2025,
        "Portaria DIRBEN/INSS nº 1.310, de 29/10/2025"),
    "Decreto-89312-1984.md": (
        "decreto-89312-1984", "decreto", "89312", 1984,
        "Decreto nº 89.312, de 23/01/1984 (CLPS de 1984)"),
    "LC-150-2015.md": (
        "lc-150-2015", "lei-complementar", "150", 2015,
        "Lei Complementar nº 150, de 01/06/2015"),
    "Lei-9394-1996.md": (
        "lei-9394-1996", "lei", "9394", 1996,
        "Lei nº 9.394, de 20/12/1996 (LDB)"),
    "Portaria-DIRBEN-INSS-998-2022.md": (
        "portaria-dirben-998-2022", "portaria", "998", 2022,
        "Portaria DIRBEN/INSS nº 998, de 28/03/2022"),
    "Portaria-PRES-INSS-1851-2025.md": (
        "portaria-inss-1851-2025", "portaria", "1851", 2025,
        "Portaria PRES/INSS nº 1.851, de 23/07/2025"),

    # --- fase B das normas ausentes (prioridade B), 04/10/2026 ---
    "Decreto-10410-2020.md": (
        "decreto-10410-2020", "decreto", "10410", 2020,
        "Decreto nº 10.410, de 30/06/2020"),
    "Portaria-MPS-462-2026.md": (
        "portaria-mps-462-2026", "portaria", "462", 2026,
        "Portaria MPS nº 462, de 19/03/2026"),
    "Lei-15157-2025.md": (
        "lei-15157-2025", "lei", "15157", 2025,
        "Lei nº 15.157, de 01/07/2025"),
    "Lei-13183-2015.md": (
        "lei-13183-2015", "lei", "13183", 2015,
        "Lei nº 13.183, de 04/11/2015"),
    "Lei-9528-1997.md": (
        "lei-9528-1997", "lei", "9528", 1997,
        "Lei nº 9.528, de 10/12/1997"),
    "Lei-8870-1994.md": (
        "lei-8870-1994", "lei", "8870", 1994,
        "Lei nº 8.870, de 15/04/1994"),
    "Portaria-MPS-235-2026.md": (
        "portaria-mps-235-2026", "portaria", "235", 2026,
        "Portaria MPS nº 235, de 03/02/2026"),
    "MP-1596-14-1997.md": (
        "mp-1596-14-1997", "medida-provisoria", "1596", 1997,
        "Medida Provisória nº 1.596-14, de 10/11/1997"),
    "IN-PRES-INSS-170-2024.md": (
        "in-170-2024", "in", "170", 2024,
        "Instrução Normativa PRES/INSS nº 170, de 04/07/2024"),
    "Decreto-8145-2013.md": (
        "decreto-8145-2013", "decreto", "8145", 2013,
        "Decreto nº 8.145, de 03/12/2013"),
    "MP-1523-1996.md": (
        "mp-1523-1996", "medida-provisoria", "1523", 1996,
        "Medida Provisória nº 1.523, de 11/10/1996"),
    "Lei-15108-2025.md": (
        "lei-15108-2025", "lei", "15108", 2025,
        "Lei nº 15.108, de 13/03/2025"),
    "IN-PRES-INSS-164-2024.md": (
        "in-164-2024", "in", "164", 2024,
        "Instrução Normativa PRES/INSS nº 164, de 29/04/2024"),
    "Lei-14331-2022.md": (
        "lei-14331-2022", "lei", "14331", 2022,
        "Lei nº 14.331, de 04/05/2022"),
    "Lei-15415-2026.md": (
        "lei-15415-2026", "lei", "15415", 2026,
        "Lei nº 15.415, de 25/05/2026"),
    "LC-75-1993.md": (
        "lc-75-1993", "lei-complementar", "75", 1993,
        "Lei Complementar nº 75, de 20/05/1993"),
    "Lei-10999-2004.md": (
        "lei-10999-2004", "lei", "10999", 2004,
        "Lei nº 10.999, de 15/12/2004"),
    "LC-73-1993.md": (
        "lc-73-1993", "lei-complementar", "73", 1993,
        "Lei Complementar nº 73, de 10/02/1993"),
    "Lei-14601-2023.md": (
        "lei-14601-2023", "lei", "14601", 2023,
        "Lei nº 14.601, de 19/06/2023"),
    "Lei-5869-1973.md": (
        "lei-5869-1973", "lei", "5869", 1973,
        "Lei nº 5.869, de 11/01/1973 (CPC/1973)"),
    "Portaria-MTP-1467-2022.md": (
        "portaria-mtp-1467-2022", "portaria", "1467", 2022,
        "Portaria MTP nº 1.467, de 02/06/2022"),
    "Lei-12873-2013.md": (
        "lei-12873-2013", "lei", "12873", 2013,
        "Lei nº 12.873, de 24/10/2013"),
    "Lei-8906-1994.md": (
        "lei-8906-1994", "lei", "8906", 1994,
        "Lei nº 8.906, de 04/07/1994"),
    "EC-47-2005.md": (
        "ec-47-2005", "emenda", "47", 2005,
        "Emenda Constitucional nº 47, de 05/07/2005"),
    "Lei-5172-1966.md": (
        "lei-5172-1966", "lei", "5172", 1966,
        "Lei nº 5.172, de 25/10/1966 (CTN)"),
    "Portaria-Conjunta-DIRBEN-PFE-INSS-4-2025.md": (
        "portaria-conjunta-4-2025", "portaria", "4", 2025,
        "Portaria Conjunta DIRBEN/PFE/INSS nº 4, de 21/01/2025"),
    "Portaria-DIRBEN-INSS-1240-2024.md": (
        "portaria-dirben-1240-2024", "portaria", "1240", 2024,
        "Portaria DIRBEN/INSS nº 1.240, de 26/11/2024"),
    "Portaria-DIRBEN-INSS-1056-2022.md": (
        "portaria-dirben-1056-2022", "portaria", "1056", 2022,
        "Portaria DIRBEN/INSS nº 1.056, de 20/09/2022"),
    "Portaria-DIRBEN-INSS-1231-2024.md": (
        "portaria-dirben-1231-2024", "portaria", "1231", 2024,
        "Portaria DIRBEN/INSS nº 1.231, de 15/10/2024"),
    "Portaria-MTE-1419-2024.md": (
        "portaria-mte-1419-2024", "portaria", "1419", 2024,
        "Portaria MTE nº 1.419, de 27/08/2024"),
    "Portaria-MTE-2021-2025.md": (
        "portaria-mte-2021-2025", "portaria", "2021", 2025,
        "Portaria MTE nº 2.021, de 03/12/2025"),
    "Portaria-MTP-672-2021.md": (
        "portaria-mtp-672-2021", "portaria", "672", 2021,
        "Portaria MTP nº 672, de 08/11/2021"),
    "Lei-8437-1992.md": (
        "lei-8437-1992", "lei", "8437", 1992,
        "Lei nº 8.437, de 30/06/1992"),
    "MP-905-2019.md": (
        "mp-905-2019", "medida-provisoria", "905", 2019,
        "Medida Provisória nº 905, de 11/11/2019"),
    "Decreto-11016-2022.md": (
        "decreto-11016-2022", "decreto", "11016", 2022,
        "Decreto nº 11.016, de 29/03/2022"),
    "Lei-12764-2012.md": (
        "lei-12764-2012", "lei", "12764", 2012,
        "Lei nº 12.764, de 27/12/2012 (Lei Berenice Piana)"),
    "Lei-7573-1986.md": (
        "lei-7573-1986", "lei", "7573", 1986,
        "Lei nº 7.573, de 23/12/1986"),
    "Portaria-DIRBEN-INSS-1301-2025.md": (
        "portaria-dirben-1301-2025", "portaria", "1301", 2025,
        "Portaria DIRBEN/INSS nº 1.301, de 13/08/2025"),
    "Portaria-Interministerial-MTP-MS-22-2022.md": (
        "portaria-interministerial-22-2022", "portaria", "22", 2022,
        "Portaria Interministerial MTP/MS nº 22, de 31/08/2022"),
    "Lei-7853-1989.md": (
        "lei-7853-1989", "lei", "7853", 1989,
        "Lei nº 7.853, de 24/10/1989"),
    "Lei-8036-1990.md": (
        "lei-8036-1990", "lei", "8036", 1990,
        "Lei nº 8.036, de 11/05/1990 (FGTS)"),
    "Portaria-DIRBEN-INSS-1005-2022.md": (
        "portaria-dirben-1005-2022", "portaria", "1005", 2022,
        "Portaria DIRBEN/INSS nº 1.005, de 11/04/2022"),
    "Lei-9711-1998.md": (
        "lei-9711-1998", "lei", "9711", 1998,
        "Lei nº 9.711, de 20/11/1998"),
    "Portaria-Interministerial-MPS-MS-15-2026.md": (
        "portaria-interministerial-15-2026", "portaria", "15", 2026,
        "Portaria Interministerial MPS/MS nº 15, de 03/07/2026"),
    "Lei-8069-1990.md": (
        "lei-8069-1990", "lei", "8069", 1990,
        "Lei nº 8.069, de 13/07/1990 (ECA)"),
    "Portaria-AGU-516-2025.md": (
        "portaria-agu-516-2025", "portaria", "516", 2025,
        "Portaria AGU nº 516, de 19/09/2025"),
    "Portaria-DIRBEN-INSS-1251-2025.md": (
        "portaria-dirben-1251-2025", "portaria", "1251", 2025,
        "Portaria DIRBEN/INSS nº 1.251, de 02/01/2025"),
    "Lei-3807-1960.md": (
        "lei-3807-1960", "lei", "3807", 1960,
        "Lei nº 3.807, de 26/08/1960 (LOPS)"),
    "Lei-10779-2003.md": (
        "lei-10779-2003", "lei", "10779", 2003,
        "Lei nº 10.779, de 25/11/2003"),
    "Lei-6423-1977.md": (
        "lei-6423-1977", "lei", "6423", 1977,
        "Lei nº 6.423, de 17/06/1977"),
    "Lei-12997-2014.md": (
        "lei-12997-2014", "lei", "12997", 2014,
        "Lei nº 12.997, de 18/06/2014"),
    "LC-146-2014.md": (
        "lc-146-2014", "lei-complementar", "146", 2014,
        "Lei Complementar nº 146, de 25/06/2014"),
    "Portaria-DIRBEN-INSS-1079-2022.md": (
        "portaria-dirben-1079-2022", "portaria", "1079", 2022,
        "Portaria DIRBEN/INSS nº 1.079, de 06/12/2022"),
    "IN-SAGICAD-MDS-20-2026.md": (
        "in-sagicad-mds-20-2026", "in", "20", 2026,
        "Instrução Normativa SAGICAD/MDS nº 20, de 21/01/2026"),
    "Portaria-DIRBEN-INSS-1209-2024.md": (
        "portaria-dirben-1209-2024", "portaria", "1209", 2024,
        "Portaria DIRBEN/INSS nº 1.209, de 10/06/2024"),
    "Lei-14126-2021.md": (
        "lei-14126-2021", "lei", "14126", 2021,
        "Lei nº 14.126, de 22/03/2021"),
    "LC-123-2006.md": (
        "lc-123-2006", "lei-complementar", "123", 2006,
        "Lei Complementar nº 123, de 14/12/2006"),
    "Lei-10835-2004.md": (
        "lei-10835-2004", "lei", "10835", 2004,
        "Lei nº 10.835, de 08/01/2004"),
    "Portaria-Conjunta-3-2018.md": (
        "portaria-conjunta-3-2018", "portaria", "3", 2018,
        "Portaria Conjunta nº 3, de 21/09/2018"),
    "Decreto-20910-1932.md": (
        "decreto-20910-1932", "decreto", "20910", 1932,
        "Decreto nº 20.910, de 06/01/1932"),
    "IN-RFB-2110-2022.md": (
        "in-rfb-2110-2022", "in", "2110", 2022,
        "Instrução Normativa RFB nº 2.110, de 17/10/2022"),
    "LC-155-2016.md": (
        "lc-155-2016", "lei-complementar", "155", 2016,
        "Lei Complementar nº 155, de 27/10/2016"),
    "Lei-15270-2025.md": (
        "lei-15270-2025", "lei", "15270", 2025,
        "Lei nº 15.270, de 26/11/2025"),
    "Lei-4375-1964.md": (
        "lei-4375-1964", "lei", "4375", 1964,
        "Lei nº 4.375, de 17/08/1964"),
    "Portaria-DIRBEN-INSS-1333-2026.md": (
        "portaria-dirben-1333-2026", "portaria", "1333", 2026,
        "Portaria DIRBEN/INSS nº 1.333, de 09/02/2026"),
    "Decreto-8424-2015.md": (
        "decreto-8424-2015", "decreto", "8424", 2015,
        "Decreto nº 8.424, de 31/03/2015"),
    "Lei-13977-2020.md": (
        "lei-13977-2020", "lei", "13977", 2020,
        "Lei nº 13.977, de 08/01/2020"),
    "Decreto-Lei-1569-1977.md": (
        "decreto-lei-1569-1977", "decreto-lei", "1569", 1977,
        "Decreto-Lei nº 1.569, de 08/08/1977"),
    "EC-139-2026.md": (
        "ec-139-2026", "emenda", "139", 2026,
        "Emenda Constitucional nº 139, de 05/05/2026"),
    "Lei-11419-2006.md": (
        "lei-11419-2006", "lei", "11419", 2006,
        "Lei nº 11.419, de 19/12/2006"),
    "Lei-14191-2021.md": (
        "lei-14191-2021", "lei", "14191", 2021,
        "Lei nº 14.191, de 03/08/2021"),
    "Lei-8899-1994.md": (
        "lei-8899-1994", "lei", "8899", 1994,
        "Lei nº 8.899, de 29/06/1994"),
    "Lei-8989-1995.md": (
        "lei-8989-1995", "lei", "8989", 1995,
        "Lei nº 8.989, de 24/02/1995"),
    "MP-2200-2-2001.md": (
        "mp-2200-2-2001", "medida-provisoria", "2200", 2001,
        "Medida Provisória nº 2.200-2, de 24/08/2001"),
    "MP-201-2004.md": (
        "mp-201-2004", "medida-provisoria", "201", 2004,
        "Medida Provisória nº 201, de 23/07/2004"),
    "Portaria-DPMF-SRGPS-MPS-587-2026.md": (
        "portaria-dpmf-srgps-mps-587-2026", "portaria", "587", 2026,
        "Portaria DPMF/SRGPS/MPS nº 587, de 06/04/2026"),
    "Portaria-SEPRT-ME-6734-2020.md": (
        "portaria-mtp-6734-2020", "portaria", "6734", 2020,
        "Portaria SEPRT/ME nº 6.734, de 09/03/2020"),
    "Portaria-450-PRES-INSS-2020.md": (
        "portaria-inss-450-2020", "portaria", "450", 2020,
        "Portaria nº 450/PRES/INSS, de 03/04/2020"),
    "Decreto-3691-2000.md": (
        "decreto-3691-2000", "decreto", "3691", 2000,
        "Decreto nº 3.691, de 19/12/2000"),
    "Decreto-7583-2011.md": (
        "decreto-7583-2011", "decreto", "7583", 2011,
        "Decreto nº 7.583, de 13/10/2011"),
    "Decreto-8537-2015.md": (
        "decreto-8537-2015", "decreto", "8537", 2015,
        "Decreto nº 8.537, de 05/10/2015"),
    "LC-230-2026.md": (
        "lc-230-2026", "lei-complementar", "230", 2026,
        "Lei Complementar nº 230, de 15/04/2026"),
    "Lei-10048-2000.md": (
        "lei-10048-2000", "lei", "10048", 2000,
        "Lei nº 10.048, de 08/11/2000"),
    "Lei-11770-2008.md": (
        "lei-11770-2008", "lei", "11770", 2008,
        "Lei nº 11.770, de 09/09/2008"),
    "Lei-11977-2009.md": (
        "lei-11977-2009", "lei", "11977", 2009,
        "Lei nº 11.977, de 07/07/2009"),
    "Lei-12212-2010.md": (
        "lei-12212-2010", "lei", "12212", 2010,
        "Lei nº 12.212, de 20/01/2010"),
    "Lei-12933-2013.md": (
        "lei-12933-2013", "lei", "12933", 2013,
        "Lei nº 12.933, de 26/12/2013"),
    "Lei-13149-2015.md": (
        "lei-13149-2015", "lei", "13149", 2015,
        "Lei nº 13.149, de 21/07/2015"),
    "Lei-15265-2025.md": (
        "lei-15265-2025", "lei", "15265", 2025,
        "Lei nº 15.265, de 21/11/2025"),
    "Lei-5859-1972.md": (
        "lei-5859-1972", "lei", "5859", 1972,
        "Lei nº 5.859, de 11/12/1972"),
    "MP-954-2020.md": (
        "mp-954-2020", "medida-provisoria", "954", 2020,
        "Medida Provisória nº 954, de 17/04/2020"),
    "Portaria-DIRBEN-INSS-997-2022.md": (
        "portaria-dirben-997-2022", "portaria", "997", 2022,
        "Portaria DIRBEN/INSS nº 997, de 28/03/2022"),
    "Portaria-ME-424-2020.md": (
        "portaria-me-424-2020", "portaria", "424", 2020,
        "Portaria ME nº 424, de 29/12/2020"),
    "Portaria-MTP-4061-2022.md": (
        "portaria-mtp-4061-2022", "portaria", "4061", 2022,
        "Portaria MTP nº 4.061, de 12/12/2022"),

    # --- fase C das normas ausentes (prioridade C), 04/10/2026 ---
    "Decreto-4882-2003.md": (
        "decreto-4882-2003", "decreto", "4882", 2003,
        "Decreto nº 4.882, de 18/11/2003"),
    "Lei-11430-2006.md": (
        "lei-11430-2006", "lei", "11430", 2006,
        "Lei nº 11.430, de 26/12/2006"),
    "Lei-15077-2024.md": (
        "lei-15077-2024", "lei", "15077", 2024,
        "Lei nº 15.077, de 27/12/2024"),
    "Lei-10839-2004.md": (
        "lei-10839-2004", "lei", "10839", 2004,
        "Lei nº 10.839, de 05/02/2004"),
    "MP-1729-1998.md": (
        "mp-1729-1998", "medida-provisoria", "1729", 1998,
        "Medida Provisória nº 1.729, de 02/12/1998"),
    "MP-739-2016.md": (
        "mp-739-2016", "medida-provisoria", "739", 2016,
        "Medida Provisória nº 739, de 07/07/2016"),
    "Portaria-DIRBEN-INSS-1299-2025.md": (
        "portaria-dirben-1299-2025", "portaria", "1299", 2025,
        "Portaria DIRBEN/INSS nº 1.299, de 25/07/2025"),
    "Lei-12435-2011.md": (
        "lei-12435-2011", "lei", "12435", 2011,
        "Lei nº 12.435, de 06/07/2011"),
    "Lei-15249-2025.md": (
        "lei-15249-2025", "lei", "15249", 2025,
        "Lei nº 15.249, de 03/11/2025"),
    "Lei-9732-1998.md": (
        "lei-9732-1998", "lei", "9732", 1998,
        "Lei nº 9.732, de 11/12/1998"),
    "Lei-15363-2026.md": (
        "lei-15363-2026", "lei", "15363", 2026,
        "Lei nº 15.363, de 26/03/2026"),
    "MP-767-2017.md": (
        "mp-767-2017", "medida-provisoria", "767", 2017,
        "Medida Provisória nº 767, de 06/01/2017"),
    "Lei-14176-2021.md": (
        "lei-14176-2021", "lei", "14176", 2021,
        "Lei nº 14.176, de 22/06/2021"),
    "Lei-12470-2011.md": (
        "lei-12470-2011", "lei", "12470", 2011,
        "Lei nº 12.470, de 31/08/2011"),
    "Lei-13457-2017.md": (
        "lei-13457-2017", "lei", "13457", 2017,
        "Lei nº 13.457, de 26/06/2017"),
    "Decreto-8123-2013.md": (
        "decreto-8123-2013", "decreto", "8123", 2013,
        "Decreto nº 8.123, de 16/10/2013"),
    "Lei-13981-2020.md": (
        "lei-13981-2020", "lei", "13981", 2020,
        "Lei nº 13.981, de 23/03/2020"),
    "Lei-13982-2020.md": (
        "lei-13982-2020", "lei", "13982", 2020,
        "Lei nº 13.982, de 02/04/2020"),
    "EC-125-2022.md": (
        "ec-125-2022", "emenda", "125", 2022,
        "Emenda Constitucional nº 125, de 14/07/2022"),
    "Decreto-10153-2019.md": (
        "decreto-10153-2019", "decreto", "10153", 2019,
        "Decreto nº 10.153, de 03/12/2019"),
    "Lei-13608-2018.md": (
        "lei-13608-2018", "lei", "13608", 2018,
        "Lei nº 13.608, de 10/01/2018"),
    "Decreto-11529-2023.md": (
        "decreto-11529-2023", "decreto", "11529", 2023,
        "Decreto nº 11.529, de 16/05/2023"),
    "Decreto-9492-2018.md": (
        "decreto-9492-2018", "decreto", "9492", 2018,
        "Decreto nº 9.492, de 05/09/2018"),
    "Lei-9658-1998.md": (
        "lei-9658-1998", "lei", "9658", 1998,
        "Lei nº 9.658, de 05/06/1998"),
    "Decreto-11341-2023.md": (
        "decreto-11341-2023", "decreto", "11341", 2023,
        "Decreto nº 11.341, de 01/01/2023"),
    "Decreto-4032-2001.md": (
        "decreto-4032-2001", "decreto", "4032", 2001,
        "Decreto nº 4.032, de 26/11/2001"),
    "Decreto-Lei-4073-1942.md": (
        "decreto-lei-4073-1942", "decreto-lei", "4073", 1942,
        "Decreto-Lei nº 4.073, de 30/01/1942"),
    "Lei-3765-1960.md": (
        "lei-3765-1960", "lei", "3765", 1960,
        "Lei nº 3.765, de 04/05/1960"),
    "Lei-7347-1985.md": (
        "lei-7347-1985", "lei", "7347", 1985,
        "Lei nº 7.347, de 24/07/1985"),
    "Decreto-9723-2019.md": (
        "decreto-9723-2019", "decreto", "9723", 2019,
        "Decreto nº 9.723, de 11/03/2019"),
    "Decreto-93412-1986.md": (
        "decreto-93412-1986", "decreto", "93412", 1986,
        "Decreto nº 93.412, de 14/10/1986"),
    "Lei-15497-2026.md": (
        "lei-15497-2026", "lei", "15497", 2026,
        "Lei nº 15.497, de 04/09/2026"),
    "Lei-3552-1959.md": (
        "lei-3552-1959", "lei", "3552", 1959,
        "Lei nº 3.552, de 16/02/1959"),
    "Lei-7369-1985.md": (
        "lei-7369-1985", "lei", "7369", 1985,
        "Lei nº 7.369, de 20/09/1985"),
    "Lei-7394-1985.md": (
        "lei-7394-1985", "lei", "7394", 1985,
        "Lei nº 7.394, de 29/10/1985"),
    "Portaria-MC-810-2022.md": (
        "portaria-mc-810-2022", "portaria", "810", 2022,
        "Portaria MC nº 810, de 14/09/2022"),
    "Decreto-10188-2019.md": (
        "decreto-10188-2019", "decreto", "10188", 2019,
        "Decreto nº 10.188, de 20/12/2019"),
    "Decreto-7617-2011.md": (
        "decreto-7617-2011", "decreto", "7617", 2011,
        "Decreto nº 7.617, de 17/11/2011"),
    "Decreto-9462-2018.md": (
        "decreto-9462-2018", "decreto", "9462", 2018,
        "Decreto nº 9.462, de 08/08/2018"),
    "LC-128-2008.md": (
        "lc-128-2008", "lei-complementar", "128", 2008,
        "Lei Complementar nº 128, de 19/12/2008"),
    "Lei-10101-2000.md": (
        "lei-10101-2000", "lei", "10101", 2000,
        "Lei nº 10.101, de 19/12/2000"),
    "Lei-12190-2010.md": (
        "lei-12190-2010", "lei", "12190", 2010,
        "Lei nº 12.190, de 13/01/2010"),
    "Lei-12740-2012.md": (
        "lei-12740-2012", "lei", "12740", 2012,
        "Lei nº 12.740, de 08/12/2012"),
    "Lei-14600-2023.md": (
        "lei-14600-2023", "lei", "14600", 2023,
        "Lei nº 14.600, de 19/06/2023"),
    "Lei-9507-1997.md": (
        "lei-9507-1997", "lei", "9507", 1997,
        "Lei nº 9.507, de 12/11/1997"),
    "Portaria-Conjunta-INSS-PFE-7-2020.md": (
        "portaria-conjunta-7-2020", "portaria", "7", 2020,
        "Portaria Conjunta INSS/PFE nº 7/2020"),
    "Decreto-57654-1966.md": (
        "decreto-57654-1966", "decreto", "57654", 1966,
        "Decreto nº 57.654, de 20/01/1966"),
    "EC-19-1998.md": (
        "ec-19-1998", "emenda", "19", 1998,
        "Emenda Constitucional nº 19, de 04/06/1998"),
    "LC-80-1994.md": (
        "lc-80-1994", "lei-complementar", "80", 1994,
        "Lei Complementar nº 80, de 12/01/1994"),
    "Lei-11350-2006.md": (
        "lei-11350-2006", "lei", "11350", 2006,
        "Lei nº 11.350, de 05/10/2006"),
    "Lei-12842-2013.md": (
        "lei-12842-2013", "lei", "12842", 2013,
        "Lei nº 12.842, de 10/07/2013"),
    "Lei-13134-2015.md": (
        "lei-13134-2015", "lei", "13134", 2015,
        "Lei nº 13.134, de 16/06/2015"),
    "Lei-14020-2020.md": (
        "lei-14020-2020", "lei", "14020", 2020,
        "Lei nº 14.020, de 06/07/2020"),
    "Lei-14457-2022.md": (
        "lei-14457-2022", "lei", "14457", 2022,
        "Lei nº 14.457, de 21/09/2022"),
    "Lei-7604-1987.md": (
        "lei-7604-1987", "lei", "7604", 1987,
        "Lei nº 7.604, de 26/05/1987"),
    "Lei-7730-1989.md": (
        "lei-7730-1989", "lei", "7730", 1989,
        "Lei nº 7.730, de 31/01/1989"),
    "Lei-8935-1994.md": (
        "lei-8935-1994", "lei", "8935", 1994,
        "Lei nº 8.935, de 18/11/1994"),
    "MP-1369-2026.md": (
        "mp-1369-2026", "medida-provisoria", "1369", 2026,
        "Medida Provisória nº 1.369, de 18/06/2026"),
    "MP-316-2006.md": (
        "mp-316-2006", "medida-provisoria", "316", 2006,
        "Medida Provisória nº 316, de 11/08/2006"),
    "MP-875-2019.md": (
        "mp-875-2019", "medida-provisoria", "875", 2019,
        "Medida Provisória nº 875, de 12/03/2019"),
    "Portaria-SE-MPS-490-2026.md": (
        "portaria-se-mps-490-2026", "portaria", "490", 2026,
        "Portaria SE/MPS nº 490, de 23/03/2026"),
    "Decreto-11348-2023.md": (
        "decreto-11348-2023", "decreto", "11348", 2023,
        "Decreto nº 11.348, de 01/01/2023"),
    "Decreto-11392-2023.md": (
        "decreto-11392-2023", "decreto", "11392", 2023,
        "Decreto nº 11.392, de 20/01/2023"),
    "Decreto-12773-2025.md": (
        "decreto-12773-2025", "decreto", "12773", 2025,
        "Decreto nº 12.773, de 08/12/2025"),
    "Decreto-5626-2005.md": (
        "decreto-5626-2005", "decreto", "5626", 2005,
        "Decreto nº 5.626, de 22/12/2005"),
    "Decreto-6957-2009.md": (
        "decreto-6957-2009", "decreto", "6957", 2009,
        "Decreto nº 6.957, de 09/09/2009"),
    "LC-51-1985.md": (
        "lc-51-1985", "lei-complementar", "51", 1985,
        "Lei Complementar nº 51, de 20/12/1985"),
    "Lei-10192-2001.md": (
        "lei-10192-2001", "lei", "10192", 2001,
        "Lei nº 10.192, de 14/02/2001"),
    "Lei-10436-2002.md": (
        "lei-10436-2002", "lei", "10436", 2002,
        "Lei nº 10.436, de 24/04/2002"),
    "Lei-11941-2009.md": (
        "lei-11941-2009", "lei", "11941", 2009,
        "Lei nº 11.941, de 27/05/2009"),
    "Lei-12009-2009.md": (
        "lei-12009-2009", "lei", "12009", 2009,
        "Lei nº 12.009, de 29/07/2009"),
    "Lei-13638-2018.md": (
        "lei-13638-2018", "lei", "13638", 2018,
        "Lei nº 13.638, de 22/03/2018"),
    "Lei-13787-2018.md": (
        "lei-13787-2018", "lei", "13787", 2018,
        "Lei nº 13.787, de 27/12/2018"),
    "Lei-13853-2019.md": (
        "lei-13853-2019", "lei", "13853", 2019,
        "Lei nº 13.853, de 08/07/2019"),
    "Lei-13869-2019.md": (
        "lei-13869-2019", "lei", "13869", 2019,
        "Lei nº 13.869, de 05/09/2019"),
    "Lei-14010-2020.md": (
        "lei-14010-2020", "lei", "14010", 2020,
        "Lei nº 14.010, de 10/06/2020"),
    "Lei-14442-2022.md": (
        "lei-14442-2022", "lei", "14442", 2022,
        "Lei nº 14.442, de 02/09/2022"),
    "Lei-7418-1985.md": (
        "lei-7418-1985", "lei", "7418", 1985,
        "Lei nº 7.418, de 16/12/1985"),
    "Lei-8177-1991.md": (
        "lei-8177-1991", "lei", "8177", 1991,
        "Lei nº 8.177, de 01/03/1991"),
    "Lei-9250-1995.md": (
        "lei-9250-1995", "lei", "9250", 1995,
        "Lei nº 9.250, de 26/12/1995"),
    "MP-449-2008.md": (
        "mp-449-2008", "medida-provisoria", "449", 2008,
        "Medida Provisória nº 449, de 03/12/2008"),
    "Portaria-CNJ-27-2021.md": (
        "portaria-cnj-27-2021", "portaria", "27", 2021,
        "Portaria CNJ nº 27, de 02/02/2021"),
    "Portaria-DIRBEN-INSS-1121-2023.md": (
        "portaria-dirben-1121-2023", "portaria", "1121", 2023,
        "Portaria DIRBEN/INSS nº 1.121, de 23/03/2023"),
    "Portaria-DIRBEN-INSS-1250-2024.md": (
        "portaria-dirben-1250-2024", "portaria", "1250", 2024,
        "Portaria DIRBEN/INSS nº 1.250, de 27/12/2024"),
    "Portaria-GM-MS-188-2020.md": (
        "portaria-gm-ms-188-2020", "portaria", "188", 2020,
        "Portaria GM/MS nº 188, de 03/02/2020"),
    "Portaria-GM-MS-913-2022.md": (
        "portaria-gm-ms-913-2022", "portaria", "913", 2022,
        "Portaria GM/MS nº 913, de 22/04/2022"),
    "Portaria-MTE-765-2025.md": (
        "portaria-mte-765-2025", "portaria", "765", 2025,
        "Portaria MTE nº 765, de 15/05/2025"),
    "Portaria-PRES-INSS-1553-2023.md": (
        "portaria-inss-1553-2023", "portaria", "1553", 2023,
        "Portaria PRES/INSS nº 1.553, de 01/02/2023"),
    "Decreto-10554-2020.md": (
        "decreto-10554-2020", "decreto", "10554", 2020,
        "Decreto nº 10.554, de 26/11/2020"),
    "Decreto-11328-2023.md": (
        "decreto-11328-2023", "decreto", "11328", 2023,
        "Decreto nº 11.328, de 01/01/2023"),
    "Decreto-12686-2025.md": (
        "decreto-12686-2025", "decreto", "12686", 2025,
        "Decreto nº 12.686, de 20/10/2025"),
    "Decreto-12764-2025.md": (
        "decreto-12764-2025", "decreto", "12764", 2025,
        "Decreto nº 12.764, de 28/11/2025"),
    "Decreto-6042-2007.md": (
        "decreto-6042-2007", "decreto", "6042", 2007,
        "Decreto nº 6.042, de 12/02/2007"),
    "Decreto-6564-2008.md": (
        "decreto-6564-2008", "decreto", "6564", 2008,
        "Decreto nº 6.564, de 12/09/2008"),
    "Decreto-71885-1973.md": (
        "decreto-71885-1973", "decreto", "71885", 1973,
        "Decreto nº 71.885, de 09/03/1973"),
    "Decreto-77077-1976.md": (
        "decreto-77077-1976", "decreto", "77077", 1976,
        "Decreto nº 77.077, de 24/01/1976 (CLPS de 1976)"),
    "Decreto-8368-2014.md": (
        "decreto-8368-2014", "decreto", "8368", 2014,
        "Decreto nº 8.368, de 02/12/2014"),
    "Decreto-8539-2015.md": (
        "decreto-8539-2015", "decreto", "8539", 2015,
        "Decreto nº 8.539, de 08/10/2015"),
    "Decreto-8805-2016.md": (
        "decreto-8805-2016", "decreto", "8805", 2016,
        "Decreto nº 8.805, de 07/07/2016"),
    "Decreto-9094-2017.md": (
        "decreto-9094-2017", "decreto", "9094", 2017,
        "Decreto nº 9.094, de 17/07/2017"),
    "Decreto-9508-2018.md": (
        "decreto-9508-2018", "decreto", "9508", 2018,
        "Decreto nº 9.508, de 24/09/2018"),
    "Decreto-9765-2019.md": (
        "decreto-9765-2019", "decreto", "9765", 2019,
        "Decreto nº 9.765, de 11/04/2019"),
    "Decreto-9830-2019.md": (
        "decreto-9830-2019", "decreto", "9830", 2019,
        "Decreto nº 9.830, de 10/06/2019"),
    "Decreto-99710-1990.md": (
        "decreto-99710-1990", "decreto", "99710", 1990,
        "Decreto nº 99.710, de 21/11/1990"),
    "Decreto-Lei-2322-1987.md": (
        "decreto-lei-2322-1987", "decreto-lei", "2322", 1987,
        "Decreto-Lei nº 2.322, de 26/02/1987"),
    "Decreto-Lei-2351-1987.md": (
        "decreto-lei-2351-1987", "decreto-lei", "2351", 1987,
        "Decreto-Lei nº 2.351, de 07/08/1987"),
    "EC-106-2020.md": (
        "ec-106-2020", "emenda", "106", 2020,
        "Emenda Constitucional nº 106, de 07/05/2020"),
    "EC-18-1998.md": (
        "ec-18-1998", "emenda", "18", 1998,
        "Emenda Constitucional nº 18, de 05/02/1998"),
    "EC-80-2014.md": (
        "ec-80-2014", "emenda", "80", 2014,
        "Emenda Constitucional nº 80, de 04/06/2014"),
    "IN-PRES-INSS-141-2022.md": (
        "in-141-2022", "in", "141", 2022,
        "Instrução Normativa PRES/INSS nº 141, de 06/12/2022"),
    "IN-RFB-2081-2022.md": (
        "in-rfb-2081-2022", "in", "2081", 2022,
        "Instrução Normativa RFB nº 2.081, de 10/05/2022"),
    "IN-SAGICAD-MDS-18-2026.md": (
        "in-sagicad-mds-18-2026", "in", "18", 2026,
        "Instrução Normativa SAGICAD/MDS nº 18, de 16/01/2026"),
    "IN-SAGICAD-MDS-19-2026.md": (
        "in-sagicad-mds-19-2026", "in", "19", 2026,
        "Instrução Normativa SAGICAD/MDS nº 19, de 19/01/2026"),
    "LC-101-2000.md": (
        "lc-101-2000", "lei-complementar", "101", 2000,
        "Lei Complementar nº 101, de 04/05/2000 (LRF)"),
    "LC-11-1971.md": (
        "lc-11-1971", "lei-complementar", "11", 1971,
        "Lei Complementar nº 11, de 25/05/1971 (Prorural)"),
    "Lei-1079-1950.md": (
        "lei-1079-1950", "lei", "1079", 1950,
        "Lei nº 1.079, de 10/04/1950"),
    "Lei-10421-2002.md": (
        "lei-10421-2002", "lei", "10421", 2002,
        "Lei nº 10.421, de 15/04/2002"),
    "Lei-10480-2002.md": (
        "lei-10480-2002", "lei", "10480", 2002,
        "Lei nº 10.480, de 02/07/2002"),
    "Lei-10833-2003.md": (
        "lei-10833-2003", "lei", "10833", 2003,
        "Lei nº 10.833, de 29/12/2003"),
    "Lei-10836-2004.md": (
        "lei-10836-2004", "lei", "10836", 2004,
        "Lei nº 10.836, de 09/01/2004"),
    "Lei-11738-2008.md": (
        "lei-11738-2008", "lei", "11738", 2008,
        "Lei nº 11.738, de 16/07/2008"),
    "Lei-11959-2009.md": (
        "lei-11959-2009", "lei", "11959", 2009,
        "Lei nº 11.959, de 29/06/2009"),
    "Lei-12153-2009.md": (
        "lei-12153-2009", "lei", "12153", 2009,
        "Lei nº 12.153, de 22/12/2009"),
    "Lei-12350-2010.md": (
        "lei-12350-2010", "lei", "12350", 2010,
        "Lei nº 12.350, de 20/12/2010"),
    "Lei-12513-2011.md": (
        "lei-12513-2011", "lei", "12513", 2011,
        "Lei nº 12.513, de 26/10/2011"),
    "Lei-12529-2011.md": (
        "lei-12529-2011", "lei", "12529", 2011,
        "Lei nº 12.529, de 30/11/2011"),
    "Lei-12703-2012.md": (
        "lei-12703-2012", "lei", "12703", 2012,
        "Lei nº 12.703, de 07/08/2012"),
    "Lei-13300-2016.md": (
        "lei-13300-2016", "lei", "13300", 2016,
        "Lei nº 13.300, de 23/06/2016"),
    "Lei-13463-2017.md": (
        "lei-13463-2017", "lei", "13463", 2017,
        "Lei nº 13.463, de 06/07/2017"),
    "Lei-13844-2019.md": (
        "lei-13844-2019", "lei", "13844", 2019,
        "Lei nº 13.844, de 18/06/2019"),
    "Lei-13847-2019.md": (
        "lei-13847-2019", "lei", "13847", 2019,
        "Lei nº 13.847, de 19/06/2019"),
    "Lei-13876-2019.md": (
        "lei-13876-2019", "lei", "13876", 2019,
        "Lei nº 13.876, de 20/09/2019"),
    "Lei-14181-2021.md": (
        "lei-14181-2021", "lei", "14181", 2021,
        "Lei nº 14.181, de 01/07/2021"),
    "Lei-14183-2021.md": (
        "lei-14183-2021", "lei", "14183", 2021,
        "Lei nº 14.183, de 14/07/2021"),
    "Lei-14210-2021.md": (
        "lei-14210-2021", "lei", "14210", 2021,
        "Lei nº 14.210, de 30/09/2021"),
    "Lei-14509-2022.md": (
        "lei-14509-2022", "lei", "14509", 2022,
        "Lei nº 14.509, de 27/12/2022"),
    "Lei-14534-2023.md": (
        "lei-14534-2023", "lei", "14534", 2023,
        "Lei nº 14.534, de 11/01/2023"),
    "Lei-14624-2023.md": (
        "lei-14624-2023", "lei", "14624", 2023,
        "Lei nº 14.624, de 17/07/2023"),
    "Lei-14626-2023.md": (
        "lei-14626-2023", "lei", "14626", 2023,
        "Lei nº 14.626, de 19/07/2023"),
    "Lei-14724-2023.md": (
        "lei-14724-2023", "lei", "14724", 2023,
        "Lei nº 14.724, de 14/11/2023"),
    "Lei-14973-2024.md": (
        "lei-14973-2024", "lei", "14973", 2024,
        "Lei nº 14.973, de 16/09/2024"),
    "Lei-14976-2024.md": (
        "lei-14976-2024", "lei", "14976", 2024,
        "Lei nº 14.976, de 18/09/2024"),
    "Lei-15327-2026.md": (
        "lei-15327-2026", "lei", "15327", 2026,
        "Lei nº 15.327, de 06/01/2026"),
    "Lei-15371-2026.md": (
        "lei-15371-2026", "lei", "15371", 2026,
        "Lei nº 15.371, de 31/03/2026"),
    "Lei-5868-1972.md": (
        "lei-5868-1972", "lei", "5868", 1972,
        "Lei nº 5.868, de 12/12/1972"),
    "Lei-6367-1976.md": (
        "lei-6367-1976", "lei", "6367", 1976,
        "Lei nº 6.367, de 19/10/1976"),
    "Lei-6514-1977.md": (
        "lei-6514-1977", "lei", "6514", 1977,
        "Lei nº 6.514, de 22/12/1977"),
    "Lei-6683-1979.md": (
        "lei-6683-1979", "lei", "6683", 1979,
        "Lei nº 6.683, de 28/08/1979"),
    "Lei-6938-1981.md": (
        "lei-6938-1981", "lei", "6938", 1981,
        "Lei nº 6.938, de 31/08/1981"),
    "Lei-6950-1981.md": (
        "lei-6950-1981", "lei", "6950", 1981,
        "Lei nº 6.950, de 04/11/1981"),
    "Lei-7789-1989.md": (
        "lei-7789-1989", "lei", "7789", 1989,
        "Lei nº 7.789, de 03/07/1989"),
    "Lei-8080-1990.md": (
        "lei-8080-1990", "lei", "8080", 1990,
        "Lei nº 8.080, de 19/09/1990"),
    "Lei-8542-1992.md": (
        "lei-8542-1992", "lei", "8542", 1992,
        "Lei nº 8.542, de 23/12/1992"),
    "Lei-8620-1993.md": (
        "lei-8620-1993", "lei", "8620", 1993,
        "Lei nº 8.620, de 05/01/1993"),
    "Lei-8625-1993.md": (
        "lei-8625-1993", "lei", "8625", 1993,
        "Lei nº 8.625, de 12/02/1993"),
    "Lei-8878-1994.md": (
        "lei-8878-1994", "lei", "8878", 1994,
        "Lei nº 8.878, de 11/05/1994"),
    "Lei-9430-1996.md": (
        "lei-9430-1996", "lei", "9430", 1996,
        "Lei nº 9.430, de 27/12/1996"),
    "Lei-9605-1998.md": (
        "lei-9605-1998", "lei", "9605", 1998,
        "Lei nº 9.605, de 12/02/1998"),
    "MP-1053-1995.md": (
        "mp-1053-1995", "medida-provisoria", "1053", 1995,
        "Medida Provisória nº 1.053, de 30/06/1995"),
    "MP-1296-2025.md": (
        "mp-1296-2025", "medida-provisoria", "1296", 2025,
        "Medida Provisória nº 1.296, de 15/04/2025"),
    "MP-1663-1998.md": (
        "mp-1663-1998", "medida-provisoria", "1663", 1998,
        "Medida Provisória nº 1.663, de 22/10/1998"),
    "MP-138-2003.md": (
        "mp-138-2003", "medida-provisoria", "138", 2003,
        "Medida Provisória nº 138, de 19/11/2003"),
    "MP-2215-10-2001.md": (
        "mp-2215-10-2001", "medida-provisoria", "2215", 2001,
        "Medida Provisória nº 2.215-10, de 31/08/2001"),
    "MP-242-2005.md": (
        "mp-242-2005", "medida-provisoria", "242", 2005,
        "Medida Provisória nº 242, de 24/03/2005"),
    "MP-567-2012.md": (
        "mp-567-2012", "medida-provisoria", "567", 2012,
        "Medida Provisória nº 567, de 03/05/2012"),
    "MP-936-2020.md": (
        "mp-936-2020", "medida-provisoria", "936", 2020,
        "Medida Provisória nº 936, de 01/04/2020"),
    "Portaria-CNJ-329-2023.md": (
        "portaria-cnj-329-2023", "portaria", "329", 2023,
        "Portaria CNJ nº 329, de 16/11/2023"),
    "Portaria-DIRBEN-INSS-1054-2022.md": (
        "portaria-dirben-1054-2022", "portaria", "1054", 2022,
        "Portaria DIRBEN/INSS nº 1.054, de 13/09/2022"),
    "Portaria-DIRBEN-INSS-1080-2022.md": (
        "portaria-dirben-1080-2022", "portaria", "1080", 2022,
        "Portaria DIRBEN/INSS nº 1.080, de 06/12/2022"),
    "Portaria-DIRBEN-INSS-1183-2023.md": (
        "portaria-dirben-1183-2023", "portaria", "1183", 2023,
        "Portaria DIRBEN/INSS nº 1.183, de 11/12/2023"),
    "Portaria-Interministerial-MTP-ME-3-2021.md": (
        "portaria-interministerial-3-2021", "portaria", "3", 2021,
        "Portaria Interministerial MTP/ME nº 3, de 15/10/2021"),
    "Portaria-Interministerial-9-2014.md": (
        "portaria-interministerial-9-2014", "portaria", "9", 2014,
        "Portaria Interministerial nº 9, de 07/10/2014"),
    "Portaria-MDS-1145-2025.md": (
        "portaria-mds-1145-2025", "portaria", "1145", 2025,
        "Portaria MDS nº 1.145, de 29/12/2025"),
    "Portaria-MPS-1400-2024.md": (
        "portaria-mps-1400-2024", "portaria", "1400", 2024,
        "Portaria MPS nº 1.400, de 27/05/2024"),
    "Portaria-MTb-1109-2016.md": (
        "portaria-mtb-1109-2016", "portaria", "1109", 2016,
        "Portaria MTb nº 1.109, de 21/09/2016"),
    "Portaria-PRES-INSS-1372-2021.md": (
        "portaria-inss-1372-2021", "portaria", "1372", 2021,
        "Portaria PRES/INSS nº 1.372, de 28/10/2021"),
    "Portaria-PRES-INSS-1382-2021.md": (
        "portaria-inss-1382-2021", "portaria", "1382", 2021,
        "Portaria PRES/INSS nº 1.382, de 19/11/2021"),
    "IN-PRES-INSS-212-2026.md": (
        "in-212-2026", "in", "212", 2026,
        "Instrução Normativa PRES/INSS nº 212, de 06/08/2026"),
    "IN-PRES-INSS-188-2025.md": (
        "in-188-2025", "in", "188", 2025,
        "Instrução Normativa PRES/INSS nº 188, de 08/07/2025"),
    "Portaria-Conjunta-DIRBEN-PFE-INSS-94-2024.md": (
        "portaria-conjunta-94-2024", "portaria", "94", 2024,
        "Portaria Conjunta DIRBEN/PFE/INSS nº 94, de 03/06/2024"),

    # --- fase propria, NR e resolucoes, 04/10/2026 ---
    "Resolucao-CJF-586-2019.md": (
        "resolucao-cjf-586-2019", "resolucao", "586", 2019,
        "Resolução CJF nº 586, de 30/09/2019"),
    "Resolucao-CNJ-492-2023.md": (
        "resolucao-cnj-492-2023", "resolucao", "492", 2023,
        "Resolução CNJ nº 492, de 17/03/2023"),
    "Resolucao-CJF-990-2026.md": (
        "resolucao-cjf-990-2026", "resolucao", "990", 2026,
        "Resolução CJF nº 990, de 03/07/2026"),
    "Resolucao-CNJ-630-2025.md": (
        "resolucao-cnj-630-2025", "resolucao", "630", 2025,
        "Resolução CNJ nº 630, de 29/07/2025"),
    "Resolucao-CFM-2314-2022.md": (
        "resolucao-cfm-2314-2022", "resolucao", "2314", 2022,
        "Resolução CFM nº 2.314, de 20/04/2022"),
    "Resolucao-ANAC-280-2013.md": (
        "resolucao-anac-280-2013", "resolucao", "280", 2013,
        "Resolução ANAC nº 280, de 11/07/2013"),
    "Resolucao-CFOAB-2-2015.md": (
        "resolucao-cfoab-02-2015", "resolucao", "2", 2015,
        "Resolução CFOAB nº 2, de 19/10/2015"),
    "Resolucao-CD-ANPD-15-2024.md": (
        "resolucao-anpd-15-2024", "resolucao", "15", 2024,
        "Resolução CD/ANPD nº 15, de 24/04/2024"),
    "Resolucao-CMN-5171-2024.md": (
        "resolucao-cmn-5171-2024", "resolucao", "5171", 2024,
        "Resolução CMN nº 5.171, de 29/08/2024"),
    "Resolucao-CFM-2217-2018.md": (
        "resolucao-cfm-2217-2018", "resolucao", "2217", 2018,
        "Resolução CFM nº 2.217, de 27/09/2018"),
    "Resolucao-CJF-393-2016.md": (
        "resolucao-cjf-393-2016", "resolucao", "393", 2016,
        "Resolução CJF nº 393, de 19/04/2016"),
    "Resolucao-CNJ-303-2019.md": (
        "resolucao-cnj-303-2019", "resolucao", "303", 2019,
        "Resolução CNJ nº 303, de 18/12/2019"),
    "Resolucao-CNJ-385-2021.md": (
        "resolucao-cnj-385-2021", "resolucao", "385", 2021,
        "Resolução CNJ nº 385, de 06/04/2021"),
    "Resolucao-CNJ-448-2022.md": (
        "resolucao-cnj-448-2022", "resolucao", "448", 2022,
        "Resolução CNJ nº 448, de 25/03/2022"),
    "Resolucao-CFM-2378-2024.md": (
        "resolucao-cfm-2378-2024", "resolucao", "2378", 2024,
        "Resolução CFM nº 2.378, de 21/03/2024"),
    "Resolucao-CJF-790-2022.md": (
        "resolucao-cjf-790-2022", "resolucao", "790", 2022,
        "Resolução CJF nº 790, de 19/09/2022"),
    "Resolucao-CJF-923-2024.md": (
        "resolucao-cjf-923-2024", "resolucao", "923", 2024,
        "Resolução CJF nº 923, de 25/11/2024"),
    "Resolucao-CJF-938-2025.md": (
        "resolucao-cjf-938-2025", "resolucao", "938", 2025,
        "Resolução CJF nº 938, de 10/03/2025"),
    "Resolucao-CNJ-230-2016.md": (
        "resolucao-cnj-230-2016", "resolucao", "230", 2016,
        "Resolução CNJ nº 230, de 22/06/2016"),
    "Resolucao-CNJ-345-2020.md": (
        "resolucao-cnj-345-2020", "resolucao", "345", 2020,
        "Resolução CNJ nº 345, de 09/10/2020"),
    "Resolucao-CNJ-398-2021.md": (
        "resolucao-cnj-398-2021", "resolucao", "398", 2021,
        "Resolução CNJ nº 398, de 09/06/2021"),
    "Resolucao-CNJ-401-2021.md": (
        "resolucao-cnj-401-2021", "resolucao", "401", 2021,
        "Resolução CNJ nº 401, de 16/06/2021"),
    "Resolucao-CNJ-520-2023.md": (
        "resolucao-cnj-520-2023", "resolucao", "520", 2023,
        "Resolução CNJ nº 520, de 18/09/2023"),
    "Resolucao-CNJ-595-2024.md": (
        "resolucao-cnj-595-2024", "resolucao", "595", 2024,
        "Resolução CNJ nº 595, de 21/11/2024"),
    "Resolucao-PRES-INSS-691-2019.md": (
        "resolucao-inss-691-2019", "resolucao", "691", 2019,
        "Resolução PRES/INSS nº 691, de 25/07/2019"),

    # consolidada do portal do INSS, em 04/10/2026, no lugar das 4 partes do sirc
    "IN-128-2022-INSS-consolidada-portalin.md": (
        "in-128-2022", "in", "128", 2022,
        "Instrução Normativa PRES/INSS nº 128, de 28 de março de 2022"),
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
}

# Comportamento conhecido que NÃO derruba a carga e também não passa em silêncio: entra no
# relatório da ingestão, na visão geral e tem assertiva no teste.
CASOS_PREVISTOS = {
    "decreto-2172-1997":
        "258 artigos e zero marcador de alteração. É a redação de 1997 como publicada, revogada "
        "pelo Decreto 3.048/1999, e serve de texto histórico. Não é falha de extração",
    "in-128-2022":
        "741 artigos num arquivo só, da rota /in do portalin.inss.gov.br, recoletada em "
        "04/10/2026 no lugar das quatro partes do sirc.gov.br, que paravam na IN 170/2024 e não "
        "tinham marcador. Agora traz 414 marcadores de consolidação. Os anexos I a XXIX "
        "continuam fora do corpus",
    "portaria-dirben-991-2022":
        "584 artigos, recoletados em 04/10/2026 do portalin.inss.gov.br, que é o portal do "
        "próprio INSS, no lugar do espelho normaslegais.com.br que a captura de maio usou. "
        "Agora traz os marcadores de consolidação, 23 deles, que a fotografia anterior não "
        "tinha. O mesmo vale para as Portarias 990, 992 a 996",
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
