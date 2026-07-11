# Varredura completa da base de conhecimento — jul/2026

Auditoria em 2 fases (7 revisores temáticos + aplicação): ~125 skills lidas.
**Itens de ALTA confiança: APLICADOS** (ver commits desta data).
**Itens de MÉDIA confiança: PENDENTES DE VALIDAÇÃO do Dr. Paulo** — listados abaixo
no arquivo consolidado de achados. Recomenda-se conferir em fonte primária antes
de alterar (marcados como [MÉDIA] ou [CONFERIR-MÉDIA]).

Também pendente de decisão: referências "Cruza com" que apontam para skills
inexistentes neste repositório (possivelmente skills do plugin principal do
escritório, fora deste repo) — lista na seção final.

---

# Varredura da base — achados consolidados (para aplicação em lote)

## GRUPO ESPECIAL (já aplicado, commit 7a360b7)
- [APLICADO] Súmula 9 TNU (não STF/SV9) — ruido + tolueno
- [APLICADO] Tema 555 só ruído; cancerígenos/biológicos = Tema 1090 STJ — tema383
- [CONFERIR-MÉDIA] frio: "IBUTG abaixo de 15 graus" (IBUTG é índice de calor; frio = NR-15 Anexo 9 / Dec. 53.831 cód. 1.1.2 abaixo de 12°C?)
- [CONFERIR-MÉDIA] tema383: Ofício 221/2025 "datado de 07/02/2024" (incoerência interna; outras skills: 30/10/2025)
- [CONFERIR-MÉDIA] Tema 208 TNU com objetos diferentes em calor ("Enquadramento") vs penosidade ("Enfermagem hospitalar")
- [CONFERIR-MÉDIA] tolueno: data "13/10/1995" na tese do Tema 382 (marcos reais: 28/04/1995 e 05/03/1997)

## GRUPO INCAPACIDADE — ALTA (aplicar)
1. b94-cessacao-acumulacao-vedacao: "Primeiro, B94 concedido antes de 11/11/1997 acumula." → exigir lesão E aposentadoria anteriores a 11/11/1997. "Cenário A, B94 desde 1995, aposentadoria 2005. Acumulação. Súmula 507 STJ." → NÃO acumula (aposentadoria posterior); cessa na aposentadoria; resta integração art. 31/Tema 862.
2. b94-integracao-tema862: "Terceiro, B94 concedido antes dessa data acumula." / "Primeiro, B94 anterior a 11/11/1997 acumula com aposentadoria." / "Cenário A, segurado com B94 desde 1995. Acumula com aposentadoria. Súmula 507 STJ." / "B94 anterior a 11/11/1997 não pode ser cessado pela aposentadoria." → mesmo duplo requisito.
3. b94-integracao-tema862: "### REsp 1.296.673 STJ — Cálculo RMI." → é o repetitivo dos Temas 555/556 (acumulação, marco 11/11/1997, origem da Súmula 507).
4. incapacidade-b92: "EC 103/2019, art. 26, §3º, I. RMI do B91 (B31) acidentário é de 91%..." → 91% = art. 61 da Lei 8.213/91 (não EC 103). E "art. 26, §3º, III, combinado com §2º, II ... 100%" → 100% acidentária = art. 26, §3º, II.
5. incapacidade-b31: "EC 103/2019, art. 26, §3º, I. Fixa RMI do B31 em 91%..." → art. 61 da Lei 8.213/91 (média conforme art. 26 EC 103).
6. incapacidade-b91: "art. 26, §3º, II. RMI do B91 não acidentário é de 60% mais 2%" → §2º; "art. 26, §3º, III, combinado com §2º, II ... 100%" → §3º, II.
7. incapacidade-b91: "arts. 46 a 48. Regulam a recuperação parcial..." → arts. 46 e 47 (art. 48 = aposentadoria por idade).
8. Tema 1083 STJ ≠ concausa/agravamento (é ruído variável/NEN): remover/substituir em b92 (3 ocorrências: cenário, estratégia, alerta "art. 42 §2º e Tema 1083"), e nas descriptions de b91 e b31 ("Tema 1083 STJ agravamento" / "Tema 1083 STJ").
9. checklist-ab "Item A.29. Nexo causal com o trabalho (B92 e B94)." → B94 = acidente de QUALQUER natureza (art. 86; Tema 416 STJ); nexo laboral só p/ natureza acidentária/competência estadual. modelo-relatorio-b94 seção 3.5: incluir hipótese "acidente de qualquer natureza".
10. Domínios IF-BrA oficiais = Sensorial; Comunicação; Mobilidade; Cuidados pessoais; Vida doméstica; Educação, trabalho e vida econômica; Socialização e vida comunitária → corrigir em modelo-relatorio-pcd-lc142 (§§1 e 3.4) e checklist-ab (B.17–B.23) que trazem "sensorial, cognição, mobilidade, interações, cuidados pessoais, vida doméstica, vida em sociedade".
11. Portaria IF-BrA é nº 1 de 27/01/2014 → modelo-relatorio-pcd-lc142 diz 27/01/2015 (checklist está certo).
12. Nomenclatura B91: b92 e b94-ntep usam "B91 = auxílio-doença acidentário" (código real INSS) vs b91-skill "B91 = aposentadoria permanente". Padronizar com nota de convenção em cada skill (B31/B91 auxílio urbano/acidentário; B32/B92 aposentadoria; adotar códigos reais e explicitar).

## GRUPO INCAPACIDADE — MÉDIA (conferir com o cliente)
13. b94: "Súmula 44 TNU" p/ disacusia → provável Súmula 44 STJ (44 TNU = tabela art. 142).
14. b94: "Súmula 47 TNU" p/ implantação imediata → 47 TNU é incapacidade parcial/condições pessoais.
15. b94-anexo-iii e b94-ntep: "Tema 350 TNU" → provável Tema 350 STF (RE 631.240).
16. b31: rol art. 151 omite hanseníase e esclerose múltipla.
17. b31: retroação DIB empregado → 16º dia do afastamento; 30 dias contam do afastamento.
18. b91: DIB "data do laudo" não é critério legal (art. 43, §1º, a/b).
19. modelo-pcd: "2 anos (art. 2º da Lei 13.146/2015)" → prazo vem do art. 20 §10 LOAS / Dec. 3.048.
20. reabilitacao: "B26" não é espécie de benefício (serviço, arts. 89-93; mantém B31/B91).
21. checklist: Res. CFM 2.057/2013 é de psiquiatria; atestados = Res. CFM 1.658/2002.
22. checklist + modelo-b31-b91-b92: "Falta de DID crítico p/ B91 com 25%" → 25% depende de assistência permanente (art. 45); DID é crítica p/ preexistência.
23. telepericia: typo "Cuarto".

## GRUPO APOSENTADORIAS — ALTA (aplicar)
A1. transicao-ec103: cenário "em 2026 completa 100 pontos e tem 35 anos" → 103 pontos (h) em 2026; "segurada em 2026 completa 58 anos" → 59a6m em 2026; cenário pedágio 100% ignorando o pedágio; "A única exceção é o pedágio de 100%" → duas exceções (art. 17 = média×fator; art. 20 = 100%); professor: art. 15 §3º e art. 20 §1º (skill diz §2º/§2º).
A2. regra-permanente: parágrafo do art. 26 §6º misturado → separar: §6º = descarte facultativo; divisor 108 = art. 135-A Lei 8.213 (Lei 14.331/2022); média pós-EC103 = 100% dos salários (não há descarte dos 20% menores).
A3. especial-transicao: "art. 19, §1º, III" → art. 19, §1º, I (3 ocorrências); description "Tema 709 STJ" → Tema 709 STF (e conferir 942).
A4. pcd-lc142: "(não 70% + 1% por ano como a regra geral EC 103)" → "(não 60% + 2%...)"; "IF-BrA (Instrumento Funcional...)" + NOVE domínios → Índice de Funcionalidade Brasileiro Aplicado, SETE domínios (alinhado à if-bra-metodologia); [MÉDIA] art. 8º→7º LC142; [MÉDIA] ressalva 80% maiores só p/ DA pré-reforma.
A5. pcd-conversao: tabela toda errada "grave 25M/30H; moderada 28M/33H; leve 30M/35H" → LC 142 art. 3º: grave 25H/20M; moderada 29H/24M; leve 33H/28M; multiplicadores derivados refazer (art. 70-E Dec. 3.048: base 20/24/28 M e 25/29/33 H; 'leve=1,000' impossível).
A6. professor-direito-adquirido: BÔNUS INVERTIDO "17% mulher e 20% homem" → EC 20 art. 9º §2º: 17% HOMEM, 20% MULHER; cenários: professora 15 anos → 20% = 3 anos; professor 10 anos → 17% = 1,7 ano. ATENÇÃO: o SITE (site_content/aposentadoria-professor.json) tem o mesmo erro invertido — corrigir lá também!
A7. professor-idade-progressiva: "### Súmula 726 STF — Fator previdenciário não incide." → enunciado real (tempo fora de sala).
A8. professor-pedagio: mesma Súmula 726 errada; e "mulher com 24 anos... 25 + 2 de pedágio = 27" → pedágio 1 ano, total 26 (como o próprio Cenário A).
A9. professor-pontos: Súmula 726 errada ("Tempo de professor e fator previdenciário"); "pontos em 2020 = 81/91" → 81/91 são 2019; 2020 = 82/92; Cenário A 2026: exigidos 88 (não 85); Cenário B 2026: exigidos 98 (não 95).
A10. tempo-rural: glosa da Súmula 272 STJ invertida → enunciado real: segurado especial só tem ATC se recolher facultativas (o descrito é art. 55 §2º p/ empregado rural); "autodeclaração (Lei 11.718/2008)" → art. 38-B, Lei 13.846/2019.
A11. autodeclaracao-92-94: "Tema 532/STJ (REsp 1.348.633)" → REsp 1.348.633 = Tema 638 (Súmula 577); Tema 532 = REsp 1.321.493 (boia-fria); Súmula 73/TNU com texto da 46 TNU (§7.1) e glosa errada no §8.1 (73 = auxílio intercalado conta como carência); [MÉDIA] Súmula 149 não trata de exemplificatividade.
A12. desaposentacao: "Súmula 557 STJ" → não é desaposentação (RMI invalidez pós-B31), remover/substituir; "Tema 381 STF" → Tema 1207 STF (reaposentação).
A13. 5 skills PCD: "Portaria Interministerial ... nº 1, de 27/01/2015" → 27/01/2014 (pcd-lc142, deficiencia-auditiva-visual, did-retroativa, fibromialgia, if-bra-metodologia).
[MÉDIA] direito-adquirido: redação da 'modulação' do Tema 1102 → ADIs 2110/2111 (21/03/2024) validaram art. 3º Lei 9.876/99.
[MÉDIA] if-bra: "escala de Genebra" → CIF/OMS, pontuação 25/50/75/100, Fuzzy.
[MÉDIA] auditiva-visual: glosa truncada da Súmula 552 STJ (surdez UNIlateral não é PCD).

## GRUPO PROCESSUAL — ALTA (aplicar)
P1. efeito-translativo-tema-1124: skill inteira atribui ao Tema 1124 o conteúdo do Tema 350 STF. Tema 1124 STJ real = termo inicial dos efeitos financeiros (prova nova → citação; prova já no PA → DER), como descreve corretamente a fungibilidade §4.6. Reescrever tese §3.1, modulação §8 ("DJe 30/03/2022" → julgamento real 2025), e "45 dias (art. 49 Lei 9.784)" → 30+30 dias.
P2. puil-pedilef: "Súmula 42/TNU. Cotejo analítico" → veda reexame de matéria de FATO; tabela "art. 17 Lei 10.259 + Tema 350" → art. 18 da Lei 8.213 (idem em efeito-translativo §16).
P3. fungibilidade: nomenclatura B91 contraditória (B91=auxílio-doença acidentário; aposentadoria = B32/B92) — §5.1 vs §6.1/§7.1.
P4. tutela-provisoria: "Tema 692/STF ... boa-fé afasta devolução" → Tema 692 é do STJ e diz o OPOSTO (devolução obrigatória); "art. 304 §6º" → §5º; "art. 101 Lei 8.213. Implantação" → art. 41-A §5º.
P5. dano-moral: "Súmula 387 STJ cumulação com danos materiais" → 37 STJ (387 = estético+moral).
P6. cumprimento-rpv: "Súmula 443 STJ. Honorários em execução" → é penal; usar 345 STJ / art. 85 §1º CPC.
P7. honorarios-contratuais: "art. 35 EAOAB espécies de honorários" → art. 22 caput (35 = sanções); [MÉDIA] "Súmula 47 STJ" não trata de honorários (DPVAT).
P8. crps-panorama: RICRPS ora "Portaria 462/2026" ora "125/2026" → unificar (125/2026, dominante na peça-enxuta).
P9. rescisoria: rótulos art. 974 (=julgamento) e art. 969 (=não impede cumprimento) errados; documentos/depósito = art. 968; [MÉDIA] falta alerta: não cabe rescisória em JEF (art. 59 Lei 9.099).
[MÉDIA] honorarios-sucumbencia: rótulo Tema 1076 (equidade §8º, não escalonamento); JEF: só RECORRENTE vencido paga (art. 55 Lei 9.099).
[MÉDIA] fato-superveniente: juros Tema 995 = 45 dias pós-intimação (EDcl), não citação; "Tema 33 STF" referência trocada.
[MÉDIA] rito-trf: "15 dias, duplicado" → dobro só Fazenda (art. 183); reexame: dispensa art. 496 §3º I (<1000 SM).
[MÉDIA] recurso-crps: exemplo-modelo com art. 25 II "alterado pela 13.846" (não foi) + Tema 1124 fora de contexto → trocar exemplo.
[MÉDIA] crps 3-6 vs 4-6 páginas → unificar 4-6.
[MÉDIA] tnu-admissibilidade item 18: "art. 15, IV RITNU" → art. 14, IV.

## GRUPO MS/INSTITUCIONAL+PONTES — ALTA (aplicar)
M1. ms-cabimento: "### Súmula 628 STJ / Arquivamento de PA e reabertura." → 628 = teoria da encampação (rubrica errada).
M2. ms-competencia: "Súmula 689 STF / Competência do local do ato" → enunciado real: foro do DOMICÍLIO do segurado ou capital; "Súmula 206 STJ / local do benefício" → real: vara privativa estadual não altera competência; "MS não se sujeita a alçada (Súmula 376/STJ)" → exclusão expressa art. 3º §1º I Lei 10.259 (376 = TR julga MS contra ato de juizado).
M3. notificacao-extrajudicial: "Súmula 376/STJ. Compete à JF causas do INSS" → enunciado inventado; usar art. 109 I CF.
M4. ms-liminar: "Tema 692 STF afasta devolução em boa-fé" → Tema 692 é do STJ e determina DEVOLUÇÃO (armadilha grave); seção "Vedações do art. 7º §2º" + Súmula 212 STJ → art. 7º §2º INCONSTITUCIONAL (ADI 4.296, 2021) e Súmula 212 CANCELADA (2022) — reescrever como norma não vigente.
M5. meu-inss-pat: "45 dias para análise (art. 49 Lei 9.784)" → 30+30 (art. 49) p/ decisão; 45 dias = art. 41-A §5º (pagamento); 90 dias = acordo RE 1.171.152/Tema 1066; "após 60 dias MS por mora" → uniformizar p/ 90 dias (como ms-cabimento e ms-decadencia).
M6. legislacao-fontes: "Súmula 555/STJ" p/ marco 28/04/1995 → 555 é tributária; usar Lei 9.032/95; "REVOGADO em 1979" p/ 53.831 → cadeia: revogado Dec. 62.755/68, restabelecido Lei 5.527/68, conviveu c/ 83.080/79, superado Dec. 2.172/97.
M7. ponte-crps: "relevação... (art. 112 da Lei 8.213/91)" → art. 112 = valores não recebidos em vida; citar RICRPS.
M8. RICRPS conflito: portarias-hub diz "462/2026 = novo RICRPS" vs legislacao-fontes/peça-enxuta "125/2026 RICRPS, 462/2026 = alteração (revogou art. 153)" → harmonizar: RICRPS = 125/2026, alterada por 235/2026 e 462/2026 [versão dominante].
M9. ponte-pensao: "prova testemunhal pura... Súmula 63/TNU" → condicionar a óbitos ANTERIORES à Lei 13.846/2019 (art. 16 §5º veda testemunhal pura depois).

## GRUPO MS/INST — MÉDIA (conferir)
- ms-cabimento: Súmula 213 STJ glosa distorcida (MS declara direito à compensação; S.460).
- meu-inss-pat: "PAT (Painel de Acompanhamento Tarifado)" → Portal de Atendimento.
- legislacao-fontes: "109 §3º (competência delegada JEF)" → delegação à Justiça Estadual.
- canais-cgu: "art. 13 da Lei 13.608/2018" inexistente (arts. 4º-A a 4º-C, Lei 13.964/2019); Decreto 11.529/2023 = Sitai (estrutura CGU = 11.330/2023); Decreto 9.492/2018 = ouvidorias (correcional = 5.480/2005).
- mpf-pfdc: Procedimento Preparatório = Res. CNMP 23/2007 art. 2º §§4-6 (174/2017: NF art. 1º, PA art. 8º).
- portarias-hub: Portaria IF-BrA 27/01/2014 (não 2015); "Portaria MTP 6.734/2020" → SEPRT/ME.
- ms-decadencia: "Súmula 632 STJ" → provável 632 STF (constitucionalidade do prazo de 120 dias).
- ms-competencia: tensão sede da autoridade × Tema 374 STF sem advertência.
- ponte-cumprimento: "deságio de 5% (art. 17 §4º Lei 10.259)" → §4º = renúncia ao excedente do teto; deságio é prática de acordo (~10%), sem esse fundamento.
- pfe-inss: 0800 título "nacional DPU" vs "apenas DPE/SP".

## REFERÊNCIAS "Cruza com" QUEBRADAS (decisão do cliente: apontam p/ skills fora deste repo?)
Alvos inexistentes citados: mandado-seguranca-previdenciario, ms-competencia-autoridade-coatora, peticao-previdenciaria, lei-13460-usuario-servico-publico, execucao-cumprimento-previdenciario, inss-canais-atendimento, documentos-comprobatorios-in128 (existe c/ prefixo base-), cnis-acerto-indicadores (existe c/ prefixo base-), precedentes-previdenciarios, revisao-peticao, base-cnis-conferencia-divergencias (não existe; próxima: base-cnis-acerto-indicadores), auditoria-ppp, defesa-probatoria-especial, tempo-especial-peticoes-por-rito, admissibilidade-barreiras-crps, incidentes-instrucao-crps, recursos-superiores-crps, impugnacao-cumprimento-concomitantes, pensao-por-morte.

## GRUPO ASSISTENCIAL/FAMÍLIA — ALTA (aplicar)
S0. TRANSVERSAL (6 skills: bpc-procedimentos, bpc-impedimento, bpc-requisitos, bpc-renda, salario-maternidade, seguro-defeso): "MS ... JEF se valor até 60 SM / Federal acima" → MS NUNCA no JEF (art. 3º §1º I Lei 10.259); sempre Vara Federal comum.
S1. auxilio-reclusao (base): contradição interna último SC vs média 12 → padronizar média 12 (art. 80 §4º), último SC só histórico; "EC 103 não alterou estruturalmente" → art. 27 caput/§1º (forma de pensão, teto 1 SM); [MÉDIA] art. 80 §1º glosa truncada; [MÉDIA] Tema 896 = desempregado (não flexibilização acima do teto).
S2. pensao-pos-reforma: "art. 24 veda pensão com aposentadoria" → PERMITE com faixas do §2º (alinhado à base-acumulacao); "Súmula 37 TNU" junto de filho inválido → 37 = não prorroga p/ universitário (retirar/recontextualizar).
S3. pensao-uniao-estavel: "Súmula 63/TNU admite testemunhal complementar" → enunciado real: união estável PRESCINDE de início de prova material (pré-13.846); corte temporal art. 16 §5º.
S4. bpc-pbf-in54: "§14 definição de família" → §14 = exclusão de renda (família = §1º); seção 3.4 "exclusão do PBF" vs 4/10 "inclusão" → corrigir 3.4 p/ INCLUSÃO; [MÉDIA] "LOAS antes do Decreto" reescrever.
S5. bpc-renda: "§12 exclusões medicamentos/fraldas" (2 ocorrências) → art. 20-B, I-III (Lei 14.176/2021); §12 = CPF/CadÚnico.
S6. bpc-requisitos: PEDILEF "0000020-09.3808.7.01.3419/DF" numeração CNJ impossível → marcar p/ conferência; [MÉDIA] Portaria Conjunta nº 2: 2014 vs 2015 uniformizar (usual: MDS/INSS 2, 30/03/2015).
S7. bpc-impedimento: IFBrM duas expansões erradas → Índice de Funcionalidade Brasileiro Modificado; [MÉDIA] Lei 15.157 x art. 8º Dec. 6.214 revisar remissão.
S8. salario-maternidade (base): "art. 72 duração 120 dias" → art. 71 (72 = valor); "art. 71-B ... (LC 146/2014)" → 71-B = Lei 12.873/2013; LC 146 = estabilidade estendida; "B82 adoção 8 a 12 anos" → 120 dias sem escala etária (Lei 12.873); [MÉDIA] "10 dias de guarda"/"10 códigos 18 meses" → carência art. 25 III; [MÉDIA] remover "Súmula 37 TNU" da description.
S9. salario-familia: "aposentado por idade urbana NÃO tem" → art. 65 p.ú.: aposentado por invalidez ou IDADE tem; demais aposentados a partir de 65/60; [MÉDIA] Lei 14.442/2022 → EC 72/2013 + LC 150/2015.
S10. seguro-defeso: "3 parcelas" e "120 dias = 3 parcelas" → 1 SM por MÊS de defeso (120 dias = 4); "art. 25 p.ú. carência pesca" → Lei 10.779 art. 2º (RGP 12 meses); [MÉDIA] ressalvas acumulação = art. 1º §2º (sem auxílio-suplementar).
S11. aluno-aprendiz: "art. 55, I ... anterior à Lei 3.807" → art. 55 I = serviço militar; fundar em S.96 TCU/S.18 TNU/S.24 AGU/art. 201 §9º; [MÉDIA] texto S.18 conferir; [MÉDIA] Decreto-LEI 4.073/42.
S12. servico-militar: mesma paráfrase errada do art. 55 I → corrigir; [MÉDIA] Súmula 24 AGU = aluno-aprendiz (não recíproca) — idem em contagem-reciproca.
S13. [MÉDIA] contribuinte-em-dobro: Decreto (não DL) 89.312/84; Súmula 81 TFR suspeita (estender ressalva); expansão "ABENT" inventada.
S14. [MÉDIA] acumulacao-art24: description "redutor 60 40 20 10" → esses são percentuais RECEBIDOS (redutores 40/60/80/90); corpo correto.
S15. [FORMAL] cadunico-in21: duas seções "## 5."

## GRUPO REVISÕES/CÁLCULO — ALTA (aplicar)
R1. calculo-rmi: pedágio 50% FORA do rol do art. 26 (RMI = média × fator, art. 17 p.ú.; refazer cenário "36 anos... 92%"); "§6º divisor mínimo, sem descarte" (2 ocorrências) → §6º = EXCLUSÃO FACULTATIVA de contribuições que reduzam o benefício; 13º NÃO eleva a média (fora do SB desde Lei 8.870/94) — retirar do rol l.66.
R2. tema1070: "INSS limita a pós-9.876/99. Refute... admite anteriores" → INVERTER: Tema 1070 é ancorado em APÓS a Lei 9.876/99; janela revisável DIB 29/11/1999–17/06/2019.
R3. teto-buraco-negro-verde: buraco verde = DIB 05/04/1991 a 31/12/1993 (art. 26 Lei 8.870/94) — corrigir description, l.10, l.22, l.44 e references/FUNDAMENTOS-E-CENARIOS.md; decadência NÃO se aplica à readequação ao teto (corrigir l.54 e l.81, mantendo prescrição Súmula 85; decadência segue p/ art. 144 e art. 26 como revisão de RMI).
R4. rvt: tese do Tema 1102 invertida → beneficia filiado ANTES da 9.876/99 com requisitos implementados APÓS ela (e antes da EC 103), opção pela regra definitiva; "espaço remanescente DIB anterior a nov/1999" = direito adquirido comum, não RVT.
R5. ortn-otn: Súmula 260 TFR — texto real: "No primeiro reajuste do benefício previdenciário, deve-se aplicar o índice integral do aumento verificado, independentemente do mês da concessão, considerado, nos reajustes subsequentes, o salário mínimo então atualizado."; âmbito: benefícios pré-CF/88; [MÉDIA] Plano Bresser = DL 2.335/87 (não "Lei 7.604/1987").
R6. salario-contribuicao: "13º integra o SC anual para fins de cálculo" (espaço pró-segurado) → integra CUSTEIO (art. 28 §7º 8.212) mas NÃO o salário-de-benefício pós-Lei 8.870/94; [MÉDIA] diárias: pós-Lei 13.467/2017 não integram qualquer valor.
R7. carencia-27a: "Pensão por morte é de 18 contribuições" → pensão SEM carência (art. 26 I); 18 contribuições = DURAÇÃO da cota do cônjuge (4 meses se <18 ou <2 anos); "reingresso... 90 contribuições para idade" → art. 27-A só p/ incisos I, III, IV (6/5/12); idade: 180 do art. 25 II somam-se sempre (Lei 10.666/03 art. 3º §1º).
R8. termo-inicial-dib: prazos do art. 74 INVERTIDOS → 180 dias (menores de 16) / 90 dias (demais); [MÉDIA] acrescentar art. 49 I a (empregado: DIB no desligamento se requerida em 90 dias).
R9. juros-correcao: benefícios previdenciários = INPC até 08/12/2021 (Tema 905 STJ; art. 41-A), não IPCA-E; SELIC desde 09/12/2021 (EC 113); [MÉDIA] "modulação do Tema 810" → superveniência da EC 113 (embargos de modulação rejeitados).
R10. devolucao-979-1034: Tema 979 INVERTIDO → erro administrativo é REPETÍVEL (desconto até 30%) SALVO boa-fé objetiva comprovada pelo segurado; modulação: ações após 23/04/2021; "Tema 1.034 ampliou irrepetibilidade em tutela" → Tema 1034 é PLANO DE SAÚDE; tutela revogada = Tema 692 STJ (devolução obrigatória, desconto 30%; exceção consolidada: BPC/LOAS); "Súmula Vinculante 35" → RE 594.296/Tema 138 STF (+ art. 69 Lei 8.213).
R11. [MÉDIA] revisao-peticao-aprofundada: exemplo l.341 ("Tema 1124 fabricado") contradiz l.405 — trocar exemplo por tema genuinamente inaplicável.
SITE AFETADO: revisoes-de-beneficio.json (buraco verde mar/94-fev/97 → DIB 05/04/1991-31/12/1993, corpo + FAQ); aposentadoria-professor.json (bônus 17%/20% invertidos → 17% homem / 20% mulher).
