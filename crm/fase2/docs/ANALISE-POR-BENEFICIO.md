# Análise por benefício · ramificação do Primeiro atendimento à Análise de Direito (F217, CRM 11.40)

> **Substituído** em 16.10.2026 por `PRIMEIRO-ATENDIMENTO-QUADROS.md` (desenho) e `REQUISITOS-POR-BENEFICIO.md` (requisitos). Fica como registro da F217.

Documento de projeto. Registra a árvore de benefícios, a matriz benefício → quadros, os campos de cada quadro com a fonte na base de conhecimento, as decisões de desenho e a régua de teste. O wireframe está em `wireframe-analise-por-beneficio.txt`.

## 1. O problema e a solução

A Análise de Direito pedia os mesmos campos para qualquer espécie, e o tempo de contribuição cabia em um campo de texto. O pedido de 12.10.2026 foi um quadro com vários períodos de tempo, cada um com a natureza (rural, especial, deficiência, e as demais), e uma escolha no Primeiro atendimento que abrisse na Análise de Direito só os quadros que o benefício pede: o BPC do deficiente não trata de tempo especial nem rural, e trata de deficiência; o auxílio-acidente não trata de tempo especial.

A solução tem três peças:

1. **Faixa "Benefícios em análise"** (`faixaBeneficios`), no Primeiro atendimento e na Análise de Direito. Onze chips, um por família de `PONTOS_ESPECIE`, com o nome do benefício no chip (`BENEF_ROT`: "Pensão por morte e auxílio-reclusão", "Aposentadoria por idade ou tempo"). O chip ligado abre a ramificação da família (as opções). A família com sinal no dossiê vem primeiro e já nasce ligada, com a opção padrão escolhida pela idade e pelo dossiê (`benefPadrao`).
2. **Catálogo benefício → módulos** (`BENEF`, `MOD_AD`). Cada opção aponta a espécie e a subespécie do catálogo do escritório (`SUBESPECIES`) e a lista de módulos. A Análise de Direito monta um quadro por módulo, na ordem fixa de `MOD_ORDEM`, e cada quadro diz para que benefícios serve.
3. **Quadro "Tempos de contribuição"** (`caixaTempos`). Uma linha por período (de, até, onde, natureza, detalhe da natureza, prova), com "+ tempo", "×" e "Trazer do CNIS". Conta por natureza pelo calendário, uma só vez o período sobreposto, converte o especial anterior a 13/11/2019 e dá o total para tempo comum e o tempo em 13/11/2019, que as regras de transição usam.

A escolha e o que se digita ficam na ficha (`clientes.campos.ad_modulos`, gravado com atraso de 600 ms por `admSalvar`) e entram, em cópia, em cada análise registrada (`detalhes.modulos`, por `admSnapshot`).

## 2. A árvore de benefícios

| Família (chip) | Opção | Espécie · subespécie | Módulos que abre |
|---|---|---|---|
| Incapacidade | Auxílio temporário · B31 | B31 | qualidade, carência, incapacidade |
| | Aposentadoria permanente · B32 | B32 | qualidade, carência, incapacidade |
| | Acidentário · B91/B92 | B91 | qualidade, incapacidade, acidente e nexo |
| Auxílio-acidente | Acidentário · B94 | B94 | qualidade, acidente e nexo, incapacidade |
| | Previdenciário · B36 | B36 | qualidade, acidente e nexo, incapacidade |
| Aposentadoria por idade ou tempo | Por idade urbana · B41 | B41 | idade, carência, tempos |
| | Tempo de contribuição e transição · B42 | B42 | tempos, carência, idade, transição EC 103 |
| | Professor · B57 | B57 | tempos, carência, idade, magistério |
| | Pessoa com deficiência, LC 142 | B42 · B42.PCD | tempos, carência, deficiência |
| Aposentadoria especial | Aposentadoria especial · B46 | B46 | tempos, tempo especial, carência |
| | Conversão de tempo especial | B46 · B46.CONV | tempos, tempo especial |
| Rural e híbrida | Por idade rural · B41 | B41 · B41.RURAL | idade, rural, tempos |
| | Híbrida · B41 | B41 · B41.HIBRIDA | idade, carência, rural, tempos |
| BPC/LOAS | Pessoa com deficiência · B87 | B87 | deficiência, renda |
| | Idoso · B88 | B88 | idade, renda |
| Pensão por morte e auxílio-reclusão | Pensão por morte · B21 | B21 | qualidade, dependentes |
| | Auxílio-reclusão · B25 | B25 | qualidade, carência, dependentes |
| Salário-maternidade | Urbana · B80 | B80 | qualidade, maternidade |
| | Rural · B80 | B80 · B80.RURAL | rural, maternidade |
| Revisão | Revisão de benefício | REV | revisão |
| Acerto de CNIS | Acerto de CNIS | CNIS | acerto de CNIS |
| Recurso no CRPS | Recurso ao CRPS | — | CRPS |

Regras da matriz: o quadro de tempos abre só para quem precisa somar período (aposentadorias, rural e híbrida); o especial só para a aposentadoria especial e a conversão; a deficiência serve ao BPC do deficiente (impedimento de longo prazo) e à LC 142 (grau e DID); a renda só ao BPC; o acidente e nexo só às espécies acidentárias e ao auxílio-acidente; a carência fica fora do acidentário e do auxílio-acidente (art. 26, I e II, da Lei 8.213/91), e no salário-maternidade e na pensão vira linha informativa.

## 3. Os quadros (módulos)

Cada quadro tem linhas calculadas (bola de estado e frase, a partir da ficha, do CNIS lido, do dossiê e das linhas de tempo) e campos que o advogado informa. A fonte de cada requisito é a nota de pesquisa da base de conhecimento (`research_notes/Matriz de requisitos por beneficio/*.md`, feita só com as skills `base-*`); nenhum número foi conferido na fonte oficial nesta entrega, e a tela avisa isso ao pé dos quadros.

| Módulo | Linhas calculadas | Campos | Fonte na base |
|---|---|---|---|
| Tempos de contribuição | total por natureza (união dos intervalos, sem contar duas vezes o período sobreposto), especial convertido ×1,40 H / ×1,20 F até 13/11/2019, total para tempo comum, tempo em 13/11/2019, linhas em aberto ou sem data | linhas: de, até, onde, natureza (comum, rural, especial, com deficiência, magistério, RPPS, militar, aluno-aprendiz), detalhe da natureza (regime rural; agente, PPP e EPI; grau; função; CTC; documento; escola), prova | base-tempo-especial-conversao; base-aposentadoria-especial-transicao-ec103 (art. 25, § 2º, da EC 103); síntese "campos por linha" de aposentadorias.md |
| Idade | idade hoje; por benefício, a idade exigida e a data em que se atinge | — (nascimento e sexo vêm da Identificação) | B41 65/62; rural 60/55; híbrida 65/62; BPC idoso 65; LC 142 por idade 60/55; professor 60/57 (aposentadorias.md, bpc-e-pcd.md) |
| Carência | cumprida pelo CNIS; por benefício, exigida e falta; metade no reingresso (art. 27-A) | contribuições para carência; reingresso após perda | 180 nas aposentadorias; 12 na incapacidade (6 no reingresso); 24 no auxílio-reclusão; isenta no acidentário e no auxílio-acidente; maternidade da CI 10, inexigíveis (ADI 2110, Enunciado 19 do CRPS); pensão sem carência |
| Qualidade de segurado | mantida até / perdida em (`calcularGraca`); na data do fato; desemprego comprovado | data do fato; desemprego comprovado | art. 15 da Lei 8.213/91; IN 128, art. 184 |
| Regras de transição da EC 103 | direito adquirido em 13/11/2019; pontos (art. 15, 103 H / 93 F em 2026, +1 por ano até 105/100); idade progressiva (art. 16, 64a6m / 59a6m em 2026, +6 meses por ano até 65/62); pedágio de 50 % (art. 17, só com 33/28 anos em 13/11/2019); pedágio de 100 % (art. 20, 60/57 e o dobro do que faltava); regra permanente (art. 19, 65/62 e 20/15) | — (usa as linhas de tempo e a idade) | aposentadorias.md §B42; base-aposentadoria-transicao-ec103 |
| Tempo especial | tempo de exposição contra 15/20/25 anos; pontos do art. 21 (66/76/86); ADI 6309 afastou as idades mínimas; PPP no dossiê; EPI (Tema 555); permanência na atividade (Tema 709) | tempo exigido para o agente; PPP; LTCAT; EPI declarado eficaz; continua na atividade nociva | base-aposentadoria-especial-transicao-ec103; base-especial-epi; auditoria-ppp |
| Magistério | tempo nas linhas de natureza magistério contra 30/25 (transições) e 25 (permanente); direção, coordenação e assessoramento contam | função; nível; regime | aposentadoria-professor-rgps; Lei 11.301/2006 |
| Trabalho rural | tempo rural nas linhas; 180 meses de atividade; prova material; CNPJs da Redesim como risco | regime; início de prova material; autodeclaração; imóvel e área; outra renda do grupo | segurado-especial-rural; base-segurado-especial-autodeclaracao-arts-92-93-94; Súmula 149/STJ |
| Deficiência | BPC: impedimento de 2 anos e avaliação biopsicossocial; LC 142: tempo exigido pelo grau (grave 25/20, moderada 29/24, leve 33/28) contra as linhas; DID | tipo; DID; grau; impedimento de longo prazo; CID; laudo com domínios e barreiras | bpc-e-pcd.md; base-pcd-conversao-tempo-especial-pcd |
| Incapacidade | documentação HCRP no dossiê; DII dentro da qualidade; DCB e prorrogação | DII; tipo; CID; última perícia; DCB; em tratamento | incapacidade-e-b94.md |
| Acidente e nexo | CAT no dossiê; só empregado, avulso e segurado especial têm a espécie acidentária; sequela consolidada e 50 % do salário de benefício | data; CAT; nexo (CAT, NTEP, perícia); categoria na data; sequela consolidada | incapacidade-e-b94.md; Anexo III do Decreto 3.048/99 |
| Renda do grupo familiar | renda per capita contra 1/4 do salário mínimo (R$ 405,25 em 2026), também descontados os gastos com saúde; CadÚnico; atividade remunerada | pessoas; renda bruta; gastos com saúde; CadÚnico; exerce atividade | bpc-renda-grupo-familiar; Decreto 12.534/2025; art. 21-A da LOAS |
| Dependentes | cota de 4 meses (menos de 2 anos de união ou menos de 18 contribuições); duração pela idade na data do óbito (tabelas de 2015 e de 2021); prova material da união estável (art. 16, § 5º); classes II e III provam a dependência; reclusão só em regime fechado | instituidor; data do óbito ou prisão; dependente; nascimento do dependente; união desde; contribuições do instituidor; prova; regime da prisão | pensao-maternidade-revisao.md; art. 77, § 2º, V, da Lei 8.213/91; Portaria ME 424/2020 |
| Salário-maternidade | 120 dias (14 no aborto não criminoso); carência da CI inexigível; segurada especial 10 meses; desempregada em graça | fato gerador; data; situação da segurada | base-salario-maternidade-pos-reforma |
| Revisão | decadência de 10 anos do 1º dia do mês seguinte ao primeiro pagamento (art. 103), com alerta a menos de 12 meses; prescrição quinquenal | NB; DIB; primeiro pagamento; tese (subespécies REV) | pensao-maternidade-revisao.md |
| Acerto de CNIS | indicadores do CNIS lido | vínculo a acertar; pendência; prova | analista-cnis |
| Recurso ao CRPS | 30 dias da ciência, com a data-limite | ciência da decisão; motivo; enunciado | base-recurso-crps-peca-enxuta |

## 4. Decisões de desenho (árvore do grilling, respondida pelo projeto)

O pedido mandou concluir sem perguntas, e as respostas ficam aqui para confirmação.

| Decisão | Alternativa descartada | Por quê |
|---|---|---|
| A ramificação é família → opção, e a opção é que abre os módulos | um chip por espécie do INSS (B31, B32, B41…) | onze famílias cabem numa linha e já existem em `PONTOS_ESPECIE`; a opção carrega espécie e subespécie, o que preenche o formulário da análise (`paAnaliseTrabalho`) |
| A natureza do tempo é propriedade da linha, não um tipo de quadro ("tempo rural", "tempo especial", "aposentadoria especial") | um quadro por natureza | o mesmo cliente tem rural, comum e especial em sequência; na linha, a natureza abre só o detalhe que ela pede e os totais saem por natureza |
| "Aposentadoria especial" não é natureza de tempo; é a família Aposentadoria especial, que abre o quadro Tempo especial | natureza "aposentadoria especial" na linha | a natureza da linha é "especial"; a aposentadoria especial é o benefício que soma essas linhas sem converter |
| O especial converte só até 13/11/2019 (×1,40 H, ×1,20 F, base de 25 anos) e depois conta 1 para 1 | converter tudo | art. 25, § 2º, da EC 103, como lê a skill base-aposentadoria-especial-transicao-ec103 |
| "Trazer do CNIS" deixa de fora o benefício que o CNIS lista como vínculo e fecha o vínculo sem saída no mês da última remuneração (salvo em curso) | importar tudo | no teste real a aposentadoria em manutenção, aberta desde 2010, somou 16 anos de tempo que não existem; o benefício não é contribuição, e o fim presumido é a mesma regra da Identificação (`vinculosSemSaida`) |
| Períodos sobrepostos contam uma vez (`uniaoDias`: união dos intervalos, por natureza e no total), e a soma usa ano de 365 dias e mês de 30 | somar cada linha; contagem por competência | o teste real de 12.10.2026 somou 47 anos em 48 vínculos sobrepostos de um CNIS que conta 29 anos e 8 meses; o tempo de contribuição é tempo de calendário, e a conta oficial segue sendo a do Prévius |
| A carência do salário-maternidade entra como linha informativa, não como requisito | exigir 10 contribuições | a base registra a inexigibilidade (ADI 2110; Enunciado 19 do CRPS) |
| A escolha vive na ficha (`campos.ad_modulos`) e a análise registrada recebe uma cópia | guardar só na sessão | o atendimento se interrompe e volta; a cópia na análise congela o que se decidiu naquele dia |
| O cartão "Levar à Análise de Direito" e o chip são a mesma escolha (`paEscolher` → `benefFam`) | dois estados | a lista de trabalhos e a faixa não podem discordar |
| Mudar um campo recalcula só as linhas do quadro (`admRecalc`), sem repintar a ficha | repintar tudo | repintar perde o foco do campo seguinte |
| Os números da base ficam marcados como não conferidos | omitir os números | o número orienta a conversa com o cliente; a nota evita que a tela vire fonte |

Reference lock (refero): o sistema de desenho do próprio CRM. Preservado: canvas bege `#F3F2EE`, cartões brancos com borda `#E7E6E1` e raio 12, verde `#0E5C58` como única cor de ação, bolas de estado (crit, warn, ok, info). Elemento assinatura: a ramificação, uma linha vertical verde-clara sob a família ligada, de onde saem as opções em pílulas. Movimento (emil-design-eng, apple-design): pílula com `transform: scale(.97)` ao pressionar, transição de 160 ms em `cubic-bezier(.23,1,.32,1)`, sem animação com `prefers-reduced-motion`. Chips são botões com `aria-pressed`; o "×" tem rótulo; cada quadro tem `h3`.

## 5. Régua de teste (`testes/cadastro/f217.js`)

A entrega exige mais de 95 pontos de 100. Resultado em 12.10.2026: **100/100**, repetido depois do teste real no navegador (CRM 11.43).

| Bloco | Peso | O que se mede |
|---|---|---|
| A · faixa no Primeiro atendimento | 26 | onze chips, sinal do dossiê primeiro; família com sinal nasce ligada com a opção padrão; ligar o BPC abre a ramificação e grava na ficha; segunda opção soma; desligar fecha; a faixa diz os quadros e o passo 3 conta benefícios |
| B · quadros seguem a escolha | 17 | BPC do deficiente: deficiência e renda, sem tempos, especial ou rural; auxílio-acidente: qualidade, incapacidade e nexo, sem tempos; cada quadro nomeia os benefícios; a faixa também vive na Análise de Direito |
| C · tempos de contribuição | 28 | nasce com uma linha e "+" acrescenta; a natureza abre o detalhe; conta pelo calendário; Trazer do CNIS; "×"; conversão do especial; períodos sobrepostos contam uma vez (caso-ouro do teste real) |
| D · cálculo | 12 | idade hoje e exigida; carência cumprida e falta; seis regras da EC 103 |
| E · persistência | 10 | PATCH único com benefícios, linhas e campos; a análise registrada leva a cópia |
| F · desenho e acessibilidade | 7 | toque e movimento reduzido no CSS; botões com `aria-pressed`, quadros com título; sem erro de página |

## 6. Não conferido nesta entrega

Os valores de 2026 (pontos 103/93, idade progressiva 64a6m/59a6m, salário mínimo R$ 1.621,00), as tabelas de duração da pensão, a inexigibilidade da carência do salário-maternidade e as idades da LC 142 vêm das skills da base e não foram abertos na fonte oficial. A decadência da revisão usa a regra do art. 103 como a base a descreve. A soma usa ano de 365 dias e mês de 30; a conversão do especial sobre período sobreposto não desconta a sobreposição entre linhas especiais. Quando a lei ou a portaria mudar, o lugar de corrigir é `IDADE_EXIG`, `CAR_EXIG`, `SM_2026` e o cálculo `transicao` em `ADM_CALC`, todos juntos no bloco F217 de `app.html`.
