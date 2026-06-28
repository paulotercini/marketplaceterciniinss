---
name: base-precedentes-catalogo-vinculantes
description: Catálogo verificado de precedentes vinculantes do direito previdenciário organizado por tribunal. Use SEMPRE ANTES de citar Tema STF (repercussão geral), Tema STJ (repetitivo), Tema TNU (representativo de controvérsia), Enunciado do CRPS, Súmula STF/STJ/TNU/CRPS ou Parecer CONJUR/AGU vinculante em qualquer petição, recurso, contestação, memorial, MS ou peça processual previdenciária. Use SEMPRE que mencionar precedente vinculante, tema repetitivo, repercussão geral, tese firmada, IRDR, IAC, súmula vinculante, enunciado CRPS, Tema 1124, Tema 995, Tema 942, Tema 1102 RVT, Tema 555 EPI, Tema 1083 ruído, Tema 1090 EPI, Tema 1031 vigilante, Tema 313 decadência, Tema 350 prévio requerimento, Tema 27 BPC inconstitucional, Tema 503 desaposentação, Tema 1124 STJ instrução administrativa, Tema 1070 atividades concomitantes, Tema 982 acréscimo 25%, Tema 995 reafirmação DER, Tema 532 segurado especial cônjuge urbano, Tema 1115 tamanho propriedade rural, Tema 1007 aposentadoria híbrida rural, Enunciado 1 CRPS melhor benefício, Enunciado 10 CRPS decadência, Enunciado 17 CRPS irrepetibilidade. Cobre 56 Temas STF, 60 Temas STJ, 156 Temas TNU (Partes 1, 2 e 3) e 18 Enunciados CRPS catalogados integralmente nos arquivos references com texto literal. A skill ATIVA o Nível 1 do PROTOCOLO DE VERIFICAÇÃO DINÂMICA (Onda 36), permitindo conferência local imediata da tese antes de citar. Postura pró-segurado exclusiva. Cruza com base-revisao-peticao-aprofundada, base-legislacao-fontes-primarias, base-tnu-admissibilidade-manual, base-recurso-crps-peca-enxuta, base-puil-pedilef-vedacao-materia-processual, peticao-previdenciaria, precedentes-previdenciarios. Atualizar conforme novos precedentes forem julgados.
---

# Catálogo Verificado de Precedentes Vinculantes em Direito Previdenciário

## OBJETIVO E POSTURA

Esta skill consolida os precedentes vinculantes e qualificados em direito previdenciário, em postura exclusivamente pró-segurado do INSS. Funciona como CATÁLOGO LITERAL VERIFICADO, ativando o Nível 1 do protocolo de verificação dinâmica (Onda 36) ANTES de qualquer citação em peça processual.

A skill foi criada na Onda 37 (v1.27.0) a partir do material consolidado pelo escritório Paulo Roberto Tercini Filho (OAB/SP 331.110) com 290 precedentes catalogados ao todo.

## TOTAIS POR TRIBUNAL

| Categoria | Total Catalogado | Arquivo |
|---|---|---|
| Temas de Repercussão Geral do STF | 56 | `references/CATALOGO-TEMAS-STF.md` |
| Temas Repetitivos do STJ | 60 | `references/CATALOGO-TEMAS-STJ.md` |
| Temas Representativos de Controvérsia da TNU | 156 | `references/CATALOGO-TEMAS-TNU.md` |
| Enunciados do CRPS | 18 | `references/CATALOGO-ENUNCIADOS-CRPS.md` |
| Súmulas da TNU (em expansão) | 1 | `references/CATALOGO-SUMULAS-TNU.md` |
| PEDILEFs Paradigmáticos TNU (não repetitivos) | 1 | `references/CATALOGO-PEDILEFS-PARADIGMATICOS-TNU.md` |
| **Total geral** | **292** | |

## PROTOCOLO DE USO OBRIGATÓRIO

ANTES de citar qualquer precedente em peça previdenciária.

1. Acionar esta skill.
2. Identificar a categoria (STF, STJ, TNU ou CRPS).
3. Abrir o arquivo de catálogo correspondente em `references/`.
4. Buscar a tese pelo número do Tema ou Enunciado.
5. Conferir literalmente a tese transcrita.
6. Confirmar vigência (atentar a temas SUSPENSOS, CANCELADOS ou AGUARDANDO JULGAMENTO).
7. Aplicar a tese ao caso concreto.

NUNCA citar um Tema, Súmula ou Enunciado sem ter aberto o arquivo de catálogo. Citação não verificada é achado BLOQUEANTE conforme `base-revisao-peticao-aprofundada` (Onda 33).

## INTEGRAÇÃO COM O PROTOCOLO DINÂMICO (Onda 36)

Esta skill é a fonte do Nível 1 do `PROTOCOLO-VERIFICACAO-DINAMICA.md` para precedentes.

**Nível 1 (esta skill).** Buscar no catálogo local em `references/`.

**Nível 2.** Se não localizado nesta skill, acionar `mcp__workspace__web_fetch` na URL oficial.
- STF. https://portal.stf.jus.br
- STJ. https://www.stj.jus.br
- TNU. https://www.cjf.jus.br/cjf/jef/turma-nacional-de-uniformizacao
- CRPS. https://www.gov.br/previdencia (seção CRPS)

**Nível 3.** WebSearch + WebFetch em fonte alternativa.

**Nível 4.** Comet/Chrome via MCP com autorização.

**Nível 5.** Achado BLOQUEANTE apenas se TUDO falhar.

## DESTAQUES PRÓ-SEGURADO

Pelos precedentes catalogados, identifica-se um conjunto de teses estratégicas para uso recorrente em petições do escritório.

**Acesso ao benefício e instrução administrativa.**
- Tema 350/STF (necessidade de prévio requerimento administrativo).
- Tema 1124/STJ (efeitos financeiros de prova não submetida ao INSS - SUSPENSO).
- Tema 995/STJ (reafirmação da DER em qualquer fase).

**Decadência e revisão.**
- Tema 313/STF (decadência de 10 anos).
- Tema 544/STJ (decadência só atinge revisão, não direito ao benefício).
- Tema 966/STJ (decadência alcança direito adquirido ao melhor benefício).
- Tema 975/STJ (decadência para questão não apreciada na concessão).
- Tema 1117/STJ (termo inicial da decadência por sentença trabalhista).
- Enunciado 10/CRPS (decadência não se aplica a benefícios de revisão periódica).

**Direito ao melhor benefício.**
- Tema 334/STF (cálculo do melhor benefício).
- Tema 1018/STJ (opção pelo benefício mais vantajoso).
- Tema 1102/STF (RVT - opção pela regra definitiva mais favorável).
- Enunciado 1/CRPS (melhor benefício e opção pelo segurado).

**Aposentadoria especial.**
- Tema 555/STF (EPI eficaz para ruído).
- Tema 1090/STJ (EPI - ônus da prova).
- Tema 1083/STJ (NEN para ruído).
- Tema 694/STJ (limite 90dB de 06/03/1997 a 18/11/2003).
- Tema 422/STJ (conversão tempo especial após 1998).
- Tema 942/STF (servidor público até EC 103/2019).
- Tema 709/STF (vedação retorno atividade especial após aposentadoria).
- Tema 1031/STJ (vigilante após EC 103/2019).
- Tema 998/STJ (auxílio-doença em atividade especial).
- Tema 174/TNU (NHO-01 ou NR-15 para ruído).
- Tema 213/TNU (EPI dúvida razoável favorece segurado).

**BPC/LOAS.**
- Tema 27/STF (1/4 SM inconstitucional como único critério).
- Tema 173/STF (estrangeiros residentes).
- Tema 1096/STF (pessoa com deficiência mental e discernimento).
- Tema 185/STJ (renda per capita não exclusiva).
- Tema 640/STJ (estatuto do idoso aplicado a PCD).
- Tema 376/TNU (TEA exige avaliação biopsicossocial).
- Tema 378/TNU (visão monocular - avaliação biopsicossocial).
- Tema 173/TNU (impedimento de longo prazo 2 anos).
- Tema 122/TNU (renda 1/4 SM como presunção relativa).

**Pensão por morte.**
- Tema 21/STJ (perda qualidade mas requisitos para aposentadoria preservados).
- Tema 732/STJ (menor sob guarda).
- Tema 1057/STJ (legitimidade pensionista para revisão originária).
- Tema 526 e 529/STF (vedação concubinato impuro).
- Tema 81/TNU (menor impúbere - termo inicial óbito).
- Tema 45/TNU (ex-cônjuge sem alimentos com dependência superveniente).
- Tema 223/TNU (absolutamente incapaz desde DER).
- Tema 377/TNU (pensão temporária por todo período previsto).

**Auxílio-acidente.**
- Tema 416/STJ (lesão mínima irrelevante).
- Tema 862/STJ (termo inicial após auxílio-doença).
- Tema 22/STJ (audição abaixo da Tabela Fowler).
- Tema 213/STJ (perda audição com nexo).
- Tema 156/STJ (irreversibilidade irrelevante).
- Tema 555/STJ (acumulação com aposentadoria pré-11/11/1997).

**Tempo rural e segurado especial.**
- Tema 532/STJ (cônjuge urbano não descaracteriza).
- Tema 554/STJ (boia-fria com início de prova mitigado).
- Tema 638/STJ (tempo rural anterior ao documento mais antigo).
- Tema 1007/STJ (aposentadoria híbrida).
- Tema 1115/STJ (tamanho da propriedade).
- Tema 644/STJ (rural com CTPS para carência).
- Tema 1362/STF (tamanho propriedade rural infraconstitucional).
- Súmula 149/STJ via Tema 297 e 554/STJ.
- Tema 219/TNU (trabalho rural antes de 12 anos).
- Tema 285/TNU (atualização CadÚnico retroativa).

**Incapacidade.**
- Tema 982/STJ (acréscimo 25% para todas aposentadorias).
- Tema 1013/STJ (recebimento conjunto trabalho e benefício retroativo).
- Tema 220/TNU (gravidez de alto risco dispensa carência).
- Tema 246/TNU (termo final perícia).
- Tema 164/TNU (alta programada).
- Tema 343/TNU (DII na data da perícia excepcional).
- Tema 1083/STF (incapacidade preexistente).

**Honorários e juros.**
- Tema 1050/STJ (base honorários não alterada por pagamento administrativo após citação).
- Tema 1105/STJ (Súmula 111 mantida no CPC/2015).
- Tema 1044/STJ (honorários periciais).
- Tema 1232/STJ (honorários em MS).

**Atividades concomitantes.**
- Tema 1070/STJ (soma das contribuições).

**Reafirmação da DER e benefício mais vantajoso.**
- Tema 995/STJ.
- Tema 1018/STJ.
- Enunciado 1/CRPS, item III.

## ATENÇÃO ESPECIAL A TEMAS SUSPENSOS, CANCELADOS OU AGUARDANDO

### STATUS ATUALIZADO EM 08/06/2026 - VER ATUALIZACAO-STATUS-2026-06.md

A reference `ATUALIZACAO-STATUS-2026-06.md` consolida a verificação feita via Comet (Claude in Chrome MCP) em junho de 2026 nas fontes oficiais (STF, STJ, TNU, gov.br) e veículos de imprensa jurídica especializada.

### Temas STJ que SAÍRAM do status SUSPENSO

- **Tema 1124/STJ** - JULGADO. Acórdão publicado em 05/02/2026.
- **Tema 1157/STJ** - JULGADO. Informativo STJ 889 (19/05/2026). Tese contra segurado.
- **Tema 1162/STJ** - JULGADO em 17/11/2025. Define flexibilização do critério econômico do auxílio-reclusão.
- **Tema 1291/STJ** - JULGADO em maio de 2026. Tese pró-segurado (contribuinte individual não cooperado).
- **Tema 1307/STJ** - JULGADO em 07/05/2026. Tese pró-segurado (motoristas de ônibus/caminhão por penosidade).

### Temas STJ que CONTINUAM suspensos/afetados

- Tema 1140/STJ. Forma de cálculo da readequação aos tetos das EC 20/98 e 41/2003.
- Tema 1220/STJ. Memorando-Circular 21 como marco interruptivo do prazo prescricional.
- Tema 1321/STJ. Prescrição contra pessoa com deficiência mental.
- Tema 1328/STJ. Dano moral in re ipsa em RMC.
- Tema 1341/STJ. Em julgamento. Filho maior inválido com benefício próprio recebendo pensão por morte.

### Temas STF que SAÍRAM do status AGUARDANDO

- **Tema 1209/STF** - JULGADO em 18/02/2026. Tese CONTRA vigilante (não é especial).
- **Tema 1300/STF** - JULGADO. Acórdão publicado em 10/04/2026. Tese pró-INSS (cálculo aposentadoria por incapacidade EC 103).
- **Tema 1370/STF** - JULGADO em 17/12/2025. Tese pró-segurada (violência doméstica).

### Temas STF que CONTINUAM aguardando

- Tema 1271/STF. Exclusão criança/adolescente sob guarda EC 103.
- Tema 1298/STF. Pensão a mulher transexual.
- Tema 1353/STF. Auxílio-doença a gestante de alto risco sem carência.

### Temas CANCELADOS confirmados em fontes oficiais

- Tema 30/TNU (cancelado em favor do Tema 692/STJ).
- Tema 66/TNU (revisado pelo Tema 355).
- Tema 338/TNU (cancelado em favor do Tema 255).
- Tema 375/TNU (cancelado em favor do Tema 130).
- Tema 1066/STF (cancelado em 22/02/2021).

### Súmula CANCELADA com data corrigida

- **Súmula 86/TNU** - Cancelada em **26/08/2021** (Sexta Sessão Ordinária por videoconferência), DOU nº 166 de 01/09/2021. Precedente PEDILEF 0521830-35.2020.4.05.8100, Relatora Juíza Federal Suzana Galia. **Correção da data** anteriormente registrada como 26/08/2021.

### Tema SUPERADO

- Tema 58/TNU (superado por Tema 694/STJ e Tema 174/TNU).

Para CADA citação destes temas, aplicar protocolo de verificação dinâmica em até Nível 2 para confirmar status atual. Esta atualização foi feita pela Onda Corretiva 38 (v1.28.0).

## ATUALIZAÇÃO DO CATÁLOGO

O catálogo deve ser revisado periodicamente conforme.

- Novos temas afetados.
- Julgamentos de temas suspensos.
- Cancelamentos ou revisões.
- Novos enunciados do CRPS.
- Novas súmulas do STF, STJ ou TNU.

A atualização é feita em onda corretiva específica no plugin, com bump de versão.

## CRUZAMENTO COM OUTRAS SKILLS DO PLUGIN

Esta skill DEVE ser acionada em conjunto com.

- `base-revisao-peticao-aprofundada` para o protocolo de verificação dinâmica de 5 níveis.
- `base-legislacao-fontes-primarias` para verificar normativos cruzados.
- `base-tnu-admissibilidade-manual` para PUIL/PEDILEF (paradigmas válidos).
- `base-recurso-crps-peca-enxuta` para usar Enunciados CRPS como fundamento principal.
- `base-puil-pedilef-vedacao-materia-processual` para filtro Súmula 43/TNU.
- `peticao-previdenciaria` e `base-peticao-previdenciaria-padrao-visual` para geração da peça.
- `precedentes-previdenciarios` (skill local) para análise estratégica do caso.

## REGRA OPERACIONAL FINAL

Em TODA peça que citar precedente, o Claude DEVE.

1. Acionar esta skill.
2. Abrir o arquivo de catálogo correspondente.
3. Buscar o número do tema.
4. Transcrever LITERALMENTE a tese.
5. Conferir vigência (suspenso, cancelado, aguardando).
6. Aplicar ao caso concreto.

NUNCA inventar tese. NUNCA presumir vigência. NUNCA confundir números (cf. caso prático da Onda 33 com Súmula 86/TNU que foi cancelada em 26/08/2021).

Honestidade radical não admite exceções.
