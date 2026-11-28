# Revisão integral das skills (28/11/2026)

Leitura completa das 221 skills do plugin base-conhecimento-inss, em dez lotes temáticos, com conferência das citações nos MCPs normas, superiores, trf3 e iurisprudencia, nos catálogos da casa e em fonte oficial. Versão do plugin 1.176.0.

## Resultado geral

- Base de cerca de 940 mil para 713 mil palavras (SKILL.md e references), sem corte de fato, norma ou raciocínio necessário.
- Bloco "MCPs da casa" repetido em 216 skills reduzido de 370 para cerca de 100 palavras, com remissão ao protocolo completo de base-legislacao-fontes-primarias.
- Cerca de 4.470 travessões retirados; listas nuas de doutrinadores e notas de onda e de auditoria já incorporadas retiradas.
- Esqueletos (frases de duas palavras) substituídos por conteúdo conferido, sobretudo em tempo especial.
- Duplicações entre skills resolvidas por remissão, sem apagar skill; references integralmente duplicadas apagadas apenas quando nenhum arquivo do plugin as citava.
- Frontmatter válido nas 221 skills; remissões a skills inexistentes corrigidas; scripts de auditoria rodando.

## Sigilo (atenção)

Foram retirados dos arquivos atuais: prenome de cliente em nome de arquivo e número de protocolo (L9), iniciais de cliente (L7), resíduo de caso concreto em formacao-documentacao-did-pcd (L3) e dois casos reais com juízo, perito, data e empregador (L2). O repositório é público, e esses dados continuam no histórico do git.

## Itens [NÃO CONFIRMADO] ou "Não localizado"

Ficaram fora do corpo das peças ou marcados, para decisão do titular. A lista está ao fim de cada lote abaixo.

## L9 Peças e revisão (59.699 -> 57.984 palavras)
- Sigilo: prenome de cliente em nome de arquivo e número de protocolo removidos (PESQUISA-NO-MCP-ACERVO.md).
- Corrigidos: carta de exigência art. 176 §1º Dec. 3.048; CNIS art. 29-A Lei 8.213; arts. 15, 16, 17 e 20 EC 103; art. 437 caput CPC; prévio requerimento = Tema 350 STF (não 1124); campo 15.4 do PPP; CRPS recurso à Câmara de Julgamento; embargos CRPS 30 dias; RO art. 305 §1º Dec. 3.048; exemplo de overruling Tema 1102 STF; remissões quebradas.
- Regra única: extensões e alertas na base-revisao-peticao-aprofundada; títulos na MECANICA-DOCX; tutela na peticao-previdenciaria.
- Pendências: art. 92 §2º RICRPS não localizado; Tema 385 TNU e Súmula 80 TNU a confirmar; md2docx.js insere logo 83x75 (proporção real 96x75) e sem --logo não avisa; exemplo de título do titular com 14 palavras; recurso inominado 5 seções x esqueleto com 4.
## L10 Catálogos, auditoria de citações, Tema 1124 (105.393 -> 97.854)
- Grave: precedentes-previdenciarios remetia a 13 references inexistentes e trazia contagens falsas; reescrita como guia que aponta ao catálogo vinculante.
- Catálogo vinculante: totais reais (90 STF, 88 STJ, 187 TNU, 19 CRPS, 3 PEDILEF); situações conferidas em 28/11/2026 (STJ 1220 e 1328 cancelados, 982 e 999 superados, 1031 sobrestado; STF 616 e 1196 tese adversa, 1271, 1298 e 1353 pendentes; TNU 385 julgado, Tema 4 superado); Enunciado 8 CRPS transcrito na íntegra.
- Limbo = Tema 300 TNU (não 301); Tema 1209 STF julgado em 18/02/2026; placares sem fonte retirados; Tema 1360 STJ incluído.
- Tema 1124: três skills alinhadas à tese literal, sem modulação inexistente; base-efeito-translativo reescrita.
- Pendências: Tema 40 TNU idêntico ao 38; Tema 102 TNU possivelmente superado; Súmula 267 STF exceção teratológica; modulação do Tema 692 STJ; redutor do art. 24 na 1ª Turma STF; [sic] no Enunciado 8 VII.
## L7 MS, TNU, TRU, REsp (58.779 -> 42.635)
- MS: Súmula 212 STJ como histórico; art. 7º §2º e art. 22 §2º Lei 12.016 inconstitucionais (ADI 4.296); suspensão de segurança pelo art. 15 Lei 12.016; liminar obrigatória em todo MS; Tema 1066 trocado pelos prazos do acordo do RE 1.171.152; Súmula 628 STJ literal.
- REsp: "PL 3.085 aguardando sanção" -> Lei 15.484, de 04/08/2026 (art. 1.035-A CPC), conferida no Planalto e no STJ.
- TRU3: Súmula 8 (art. 3º §1º Lei 10.666), Súmula 5 (Súmula 6 TNU, não 73), Súmula 21 (art. 20 §11-A LOAS), Súmulas 14 e 22 (art. 20 §14 LOAS); argumento falso do art. 40 LBI retirado.
- Embargos no JEF interrompem pelo art. 50 Lei 9.099; Súmula 43 TNU sem os antigos temperamentos (julgados de 2026).
- Sigilo: iniciais de cliente retiradas em base-puil.
- Pendências: prorrogação do prazo de 24 meses do acordo do RE 1.171.152; tese literal do Tema 174 TNU; prequestionamento ficto na TNU; CC 177.666 STJ; Res. CJF3R 80/2022 art. 11 VI e.
## L8 Administrativo, CRPS, institucional, operacional (117.210 -> 114.958)
- RICRPS unificado: Portaria MPS 125/2026, alterada pelas 235/2026 e 462/2026; arts. 92, 93, 108, 112 e 116 conferidos.
- PAT = Portal de Atendimento; prazos art. 49 Lei 9.784, art. 41-A §5º e acordo do RE 1.171.152.
- CGU e MPF: Lei 13.608 arts. 4º-A a 4º-C; Decretos 5.480/2005 e 11.330/2023; Res. CNMP 23/2007 e 174/2017; LAI 20+10 dias.
- ANPD como Agência (LGPD art. 55-A); 0800 é da DPE/SP; Portaria SEPRT/ME 6.734/2020; Tema 376 TNU marcado adverso.
- Precedentes fabricados retirados (falsa Súmula 376, REsps e acórdãos não localizados, ADI 5.624, RE 593.443); siglas inventadas removidas.
- triagem-caso-novo apontava para arquivos e skills inexistentes; redirecionada.
- PADRAO-DE-ESCRITA: contradição sobre dois-pontos resolvida, nenhuma regra afrouxada.
- Pendências: precedentes TRF3 citados sem confirmação; Tema 369 TNU; Portarias DIRBEN 1.309 e 1.318 não relidas.
## L2 Incapacidade, B94, perícia, reabilitação (114.943 -> 99.759)
- Teleperícia: Res. CFM 2.378/2024 (assistolia fetal) retirada; Portaria Conjunta DPMF/INSS 19/2026 exige o segurado em APS; art. 60 §11-A Lei 8.213 incluído.
- Reabilitação: B26 retirado (serviço, arts. 89 a 92; mantém B31/B91); Portaria 1.333/2026: reagendamento em 7 dias, suspensão com 60 dias de defesa, preso no art. 14.
- NTEP: Lista C (art. 337 §3º Dec. 3.048); Súmula 32 TST no lugar de "Tema 226 TST"; 100% da B92 após a EC 103 (art. 26 §3º II).
- Checklist do laudo: Res. CFM 1.658/2002 e 1.851/2008; Súmula 88 TNU literal; art. 20 §10 LOAS para os 2 anos; Tema 1352 STJ = REsp 2.189.004; Tema 300 TNU.
- Pendências: Tema 1277 STF e RE 1.426.083; "Tema 46 TST"; IRR 88 TST; PUIL TRU4 5002876-10.2023.4.04.7202; vigência do art. 101 §1º I; Livro X como Portaria 991 ou 999.
## L6 Processo judicial (94.690 -> 82.568)
- Rescisória: rótulos dos arts. 968, 969 e 974 corrigidos; vedação no JEF (art. 59 Lei 9.099) com a via do art. 535 §5º CPC.
- Rito: prazo em dobro apenas para o INSS (art. 183); remessa necessária art. 496 §3º I e REsp 1.735.097/RS.
- Art. 343-A RISTJ depende de portaria da Presidência ainda sem data (notícia STJ de 02/09/2026), não "vigente desde junho/2026".
- Leis trocadas: art. 69 é da Lei 8.212; art. 129 Lei 8.213 apenas acidente; art. 129-A pela Lei 14.331/2022; RITNU art. 30; art. 468 I.
- Precedentes errados retirados (Tema 642 em dano moral, Tema 1011 em professor, Tema 1081); tese literal dos Temas 979, 692, 995, 1018 e 1007.
- Honorários contratuais: protesto vedado (art. 52 CED); art. 17 CED 2015; "deságio de 5% no JEF" inexistente retirado; Lei 14.905/2024.
- Precatório até 1º de fevereiro (EC 136); juros em três fases, sem IPCA-E para benefício previdenciário.
- Duplicações: execucao-cumprimento (operacional) x base-cumprimento (normativo); coisa-julgada-previdenciaria como hub; honorários regime x cobrança.
- Divergência resolvida: Tema 692 STJ alcança os assistenciais pela tese literal (a varredura de julho falava em exceção do BPC).
- Pendências: AgInt REsp 2.269.424 (Tema 1018); Portaria AGU 516/2025; Súmula 160 TFR; Enunciado 225 FONAJEF; REsps 400.687, 1.437.413, 1.882.117 e 1.217.377; TED OAB/SP E-4.141; IRDR 18 TRF4; faixas de dano moral não localizadas.
## L4 Aposentadorias, cálculo, revisões (75.040 -> 53.356)
- Juros: IPCA-E retirado do benefício previdenciário; três fases do Manual CJF 2026 (INPC até 11/2021; SELIC 12/2021 a 08/2025; INPC e taxa legal a partir de 09/2025).
- Tema 1070: IN 128 art. 225; janela de DIB 29/11/1999 a 17/06/2019; Temas 327, 102 e 999 retirados.
- ORTN: Plano Bresser = DL 2.335/87; Súmula 260 TFR literal. Teto: buraco verde 05/04/1991 a 31/12/1993; Tema 1005 adverso.
- Art. 24 EC 103 literal; CF art. 201 §15; exemplo numérico refeito; SV 33 retirada.
- Desaposentação com tese literal do Tema 503; DIB do BPC pelo art. 37 LOAS; reafirmação pela Portaria 996 arts. 21 e 22.
- Decadência: art. 103 I e II com ADI 6096; Tema 966; Tema 1370 STJ em julgamento.
- IR: rol de doenças graves corrigido; Lei 14.126 não trata de visão monocular.
- Tabelas de pontos e idades do professor conferidas ano a ano.
- Pendências: embargos do Tema 503; decadência na pensão derivada (Tema 1057 STJ); Tema 349 TNU sobrestado pelo Tema 1467 STF; tabela anual do IR 2026; IN 128 art. 251 §1º x exclusividade da EC 20; JSON do site podem repetir os erros antigos.
## L1 Tempo especial (65.507 -> 51.697)
- Frio: IBUTG e NHO-06 (calor) retirados; enquadramento pelo código 1.1.2 do Dec. 53.831/64 e NR-15 Anexo 9; Tema 174 TNU é ruído.
- Biológicos, eletricidade, vibração e químicos são atividades de 25 anos (15 e 20 restritos a mineração subterrânea e amianto).
- Conversão: art. 70 Dec. 3.048 revogado; vigente art. 188-P §§5º e 6º e IN 128 arts. 206 e 269.
- Teses corrigidas: Temas 205, 211, 213 e 362 TNU, Tema 1090 STJ; Tema 534 STJ incluído em eletricidade; Tema 1031 STJ superado pelo Tema 1209 STF.
- Tolueno: NHO-08 é de particulados; Portaria MTE 2.021/2025 aprova o Anexo V da NR-16; GFIP código 01 = sem exposição; Ofício Fundacentro 221/2025 de 30/10/2025.
- Esqueletos ampliados: frio, calor, radiação, vibração, eletricidade, motociclista, layout do PPP, conversão, tolueno. Remissões a 7 references e 8 skills inexistentes retiradas.
- Fora do lote: corpus normas Portaria-Interministerial-9-2014.md contém o texto da IN 128; notas do Dec. 53.831 atribuem categoria ao Tema 422 STJ.
- Pendências: Nota 00792/2025 (substitui "Comunicado CRPS 99/2025", não localizado); Parecer 00212/2024 CONJUR-MTP; REsp 2.152.968/RS; dispensa de medição pré-1998 para tolueno.
## L3 BPC, PCD, gênero (94.156 -> 59.245)
- IF-BrA: "escala de Genebra" retirada; pontuação 25/50/75/100, Fuzzy e sete domínios oficiais (Portaria Interministerial SDH/MPS/MF/MOG/AGU 1/2014); rótulos inventados dos modelos de relatório corrigidos.
- BPC: instrumento pela Portaria Conjunta 2/2015 na redação da 37/2026; BPC não gera pensão (Dec. 6.214 art. 23 p.u.); B87/B88 desinvertidos; IN 54/2026 com o texto real (anuência não condiciona o protocolo).
- Dec. 3.048 art. 70-J (não 70-I); os 2 anos de impedimento são do BPC (art. 20 §10 LOAS), não da LC 142.
- Visão monocular pela Lei 14.126/2021; fibromialgia: equiparação condicionada à avaliação biopsicossocial (Lei 15.176).
- MS na Vara Federal comum, nunca no JEF, em todas as skills do lote.
- Duplicações: conteúdo detalhado em aposentadoria-deficiencia, deficiencia-auditiva-previdenciaria e analise-bpc-loas; 24 references integralmente duplicadas apagadas (sem citação no plugin).
- Pendências: tese do art. 22 EC 103; numeração do PEDILEF 0000020-09; REsps de fibromialgia; precedentes do TRF1, TRF4 e TRF5 na skill de gênero; data do DOU do Decreto 12.534.
- L2 segunda passada: dois casos reais retirados (orientacao-cliente-pericia/references/AUXILIO-ACIDENTE.md com juízo, perito e data; exemplo com empregador e datas em analise-documental-incapacidade). Protocolo da DIS reescrito: a data dos primeiros sintomas é a verdadeira e documentada, nunca ajustada ao período de qualidade de segurado. Teleperícia em APS; reabilitação obrigatória (art. 101); IF-BrA com 7 domínios; isenção de IR sem ELA no rol.
## L5 Custeio, rural, dependentes (92.580 -> 53.421)
- CLPS = Decreto 89.312/84; sigla ABENT com expansão inventada retirada.
- Pensão: art. 24 EC 103 permite acumular com faixas; Súmula 63 TNU na redação de 18/09/2025; art. 16 §§5º e 6º; Temas 526 e 529 STF adversos; Súmula 37 TNU fora do filho inválido.
- Salário-família: aposentado por idade e demais aposentados a partir de 65/60 (art. 65 p.u.); EC 72 e LC 150.
- Salário-maternidade: duração art. 71, valor arts. 72 e 73; art. 71-B pela Lei 12.873; art. 73-A (Lei 15.415/2026).
- Rural: tese do CNPJ desinvertida (art. 112 §4º); Tema 638 com descrição certa; menor pelo Tema 219 TNU; autodeclaração art. 38-B.
- Seguro-defeso processado pelo MTE/Codefat desde a Lei 15.265/2025; auxílio-reclusão pela IN 128 arts. 381 a 392 e EC 103 art. 27 §1º; JA no art. 567 da IN 128.
- Tema 349 TNU suspenso pelo Tema 1467 STF.
- Pendências: AREsp 2.819.695/RS (divisor 12); ARE 1.500.973/RS; Súmula 5 TNU e Tema 782 STF fora do catálogo; códigos GPS 1503, 1554 e 1872; valores anuais do salário-família.
