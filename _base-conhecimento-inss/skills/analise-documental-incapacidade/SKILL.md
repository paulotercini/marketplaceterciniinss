---
name: analise-documental-incapacidade
description: "Skill do regime de análise documental para B31, B91 e auxílio-acidente (B94), Portarias Conjuntas MPS/INSS nº 13, 14 e 15 de 23/03/2026. Use SEMPRE que mencionar análise documental INSS, perícia documental, Portaria Conjunta 13/2026, 14/2026, 15/2026, B31 documental, B91 documental, B94 documental, limite 30 dias, limite 90 dias, trava 180 dias, trava três indeferimentos, art. 60 §11-A, parecer verossimilhança, tempo médio CID, requisitos documentais perícia, sequela auxílio-acidente, consolidação lesões, triagem documental PMF, novo requerimento após cessação ou indeferimento, prorrogação auxílio-doença, 4 campos Meu INSS, autodeclaração sintomas, padrão de autodeclaração, como preencher os campos do Meu INSS, texto dos sintomas para o INSS, descrição da atividade no requerimento, pedido de ajuda no requerimento, atividade habitual, Teleperícia, Portaria DPMF/INSS 19/2026, telemedicina perícia, videoconferência perícia, SAT Remoto, recusa Teleperícia, cerceamento Teleperícia. Use AUTOMATICAMENTE ao redigir petição ou recurso de B31, B91, B94 e ao orientar requerimento administrativo. NÃO use para B32/B92, BPC/LOAS ou aposentadoria especial."
---

# Regime de Análise Documental — Incapacidade Temporária e Auxílio-Acidente

## Dados Normativos

### Portaria Conjunta MPS/INSS nº 13, de 23/03/2026
- Publicação — DOU de 24/03/2026
- Vigência — 30/03/2026
- Objeto — Disciplina a execução do exame médico-pericial por meio de análise documental para o benefício de auxílio por incapacidade temporária (art. 60, §11-A, Lei 8.213/91)
- Processos — 35014.060869/2026-86 e 10128.005193/2026-50
- Revoga — Portarias Conjuntas MPS/INSS nº 38/2023, nº 6/2023, nº 7/2024, nº 19/2024, nº 59/2025, nº 72/2025, nº 82/2025 e nº 83/2025
- Conferência [CONFERIDO] — texto integral das Portarias 13, 14 e 15/2026 conferido em fonte oficial em 18/07/2026, assinadas por Wolney Queiroz Maciel (MPS) e Gilberto Waller Júnior (INSS). Pontos nucleares confirmados na 13/2026, art. 3º (soma de duração até 30 dias), art. 6º, V (nova análise documental só a partir de 180 dias DA CESSAÇÃO, na hipótese de indeferimento de prorrogação por parecer contrário), art. 6º, VI (nova análise documental a partir de 30 dias da decisão, quando o indeferimento anterior foi documental), art. 6º, VII e VIII (admissão no dia seguinte quando o indeferimento anterior foi por perícia presencial/telemedicina ou sem avaliação da incapacidade), art. 8º (três indeferimentos sucessivos direcionam obrigatoriamente à perícia presencial) e art. 9º (recurso em 30 dias; a literalidade diz "da data da decisão", ler conforme o art. 305 do Decreto 3.048/99, que conta da ciência, ver seção Recurso). Referência última no DOU de 24/03/2026

### Portaria Conjunta MPS/INSS nº 14, de 23/03/2026
- Publicação — DOU de 24/03/2026
- Vigência — Imediata (24/03/2026)
- Objeto — Ampliação excepcional e transitória do prazo máximo de duração do auxílio por incapacidade temporária concedido por análise documental
- Duração da excepcionalidade — 180 dias (até aproximadamente 20/09/2026)
- Processos — 35014.060869/2026-86 e 10128.003950/2026-51

### Portaria Conjunta MPS/INSS nº 15, de 23/03/2026
- Publicação — DOU de 24/03/2026
- Vigência — Imediata (24/03/2026)
- Objeto — Análise documental nos requerimentos do benefício de auxílio-acidente (art. 86, Lei 8.213/91)
- Processos — 35014.064265/2026-17 e 10128.002000/2026-17

## Fluxo de Trabalho

1. Leia `references/FLUXOS-REQUISITOS-ESTRATEGIAS.md` para os fluxos completos, requisitos documentais, regras de novos requerimentos, prazos e estratégias de defesa
2. Leia `references/VIAS-IMPUGNACAO.md` para as vias de impugnação judicial, administrativa e extrajudicial contra cada ponto das portarias
3. Aplique as regras ao caso concreto
4. Ao redigir petição ou recurso, acione as skills complementares pertinentes

## Checagem Documental Automática e Petição de Cumprimento de Exigência

### ACIONAMENTO AUTOMÁTICO

Quando o usuário anexar documentos de um requerimento de B31, B91 ou B94 e mencionar exigência, cumprimento de exigência, checagem, conferência de documentos, análise documental, requerimento administrativo, ou pedir para verificar se a documentação atende os requisitos das Portarias 13 ou 15/2026, EXECUTAR AUTOMATICAMENTE o protocolo abaixo.

### Protocolo

1. Identificar a espécie (B31, B91 ou B94)
2. Ler cada documento anexado
3. Executar a matriz de checagem da seção 14 do arquivo `references/FLUXOS-REQUISITOS-ESTRATEGIAS.md`, verificando inciso a inciso qual documento atende cada requisito
4. Apresentar ao usuário a MATRIZ COMPLETA (inciso → documento → status), os ITENS DESCOBERTOS, os ITENS FRÁGEIS e as RECOMENDAÇÕES
5. Se todos os incisos obrigatórios estiverem atendidos, gerar automaticamente a petição de cumprimento de exigência conforme seção 15 do arquivo de referência, no padrão .docx do escritório (skill peticao-previdenciaria)
6. Se houver itens descobertos, alertar o usuário e recomendar complementação antes de gerar a petição
7. Orientar o preenchimento dos QUATRO campos de autodeclaração do Meu INSS ("data de início dos sintomas", "descrição dos sintomas", "atividade/trabalho que exercia" e "descrição da atividade/trabalho") conforme o Protocolo de Autodeclaração desta skill, executando obrigatoriamente a análise retroativa do CNIS (Passo 1), a escolha da DIS mais defensável (Passo 2), a redação humanizada dos sintomas em primeira pessoa (Passo 3), a declaração e a descrição da atividade habitual (Passos 4 e 5) e a revisão de coerência (Passo 6)

### Diferença entre "documentação médica" e "documento médico"

O art. 2º das Portarias 13 e 15 usa "documentação médica" (conjunto), não "documento médico" (peça única). Os requisitos podem ser atendidos por documentos distintos. O relatório pode atender um inciso, a CAT outro, o exame de imagem outro. A petição de cumprimento mapeia cada inciso ao documento correspondente, demonstrando que o conjunto supre integralmente os requisitos normativos.

## Conceito Central

O exame médico-pericial para auxílio por incapacidade temporária (B31/B91) pode ser realizado por análise documental, sem exame presencial. A Perícia Médica Federal emite parecer técnico fundamentado nos documentos médicos ou odontológicos apresentados pelo requerente. Esse parecer constitui análise por verossimilhança e fundamenta tanto a concessão quanto o indeferimento.

Para o auxílio-acidente (B94), a análise documental prévia é etapa obrigatória anterior ao eventual agendamento de exame presencial. A PMF pode indeferir sem perícia presencial quando concluir pela ausência de elementos documentais essenciais.

## Árvore de Decisão Pós-Negativa — Novo Pedido, Recurso ou Ação Judicial

Diante de um Atestmed negado, a primeira tarefa do advogado é identificar o motivo real da negativa, porque a via correta decorre dele. Deficiência do laudo, mérito pericial injusto e urgência apontam para caminhos diferentes, com consequências distintas sobre a data de entrada. Escolher errado custa meses de renda ou desloca a DIB.

### Via 1 — Novo requerimento por análise documental

Cabível quando o motivo foi exclusivamente a deficiência do documento médico (falha formal, CID ausente, ausência de data de início do repouso, conteúdo insuficiente dos incisos do art. 2º) e o segurado consegue refazer o laudo com qualidade. **Regra operacional vigente, sem exceção de balcão.** Quando o indeferimento anterior foi por análise documental, o novo requerimento só é admitido a partir de 30 dias da decisão (art. 6º, VI, Portaria 13/2026). No fluxo administrativo não existe opção de o segurado escolher perícia presencial para escapar da espera, o requerimento de B31 ingressa pela via documental como regra (art. 1º) e o direcionamento ao exame presencial só ocorre nas hipóteses normativas (art. 6º, II, art. 8º). Protocolo antecipado será inadmitido. A superação da espera se dá apenas por recurso, mandado de segurança ou ação judicial, nunca por novo protocolo. A admissão no dia seguinte existe somente quando o indeferimento anterior foi por perícia presencial ou telemedicina (art. 6º, VII) ou sem avaliação da incapacidade, não comparecimento ou motivo administrativo (art. 6º, VIII). O novo pedido não preserva a data de entrada original, os efeitos financeiros correm do novo protocolo. Após três indeferimentos documentais sucessivos, o requerimento seguinte vai obrigatoriamente à perícia presencial (art. 8º). É o caminho que mais custa em data de entrada, reservar aos casos em que a incapacidade não é contínua desde o primeiro protocolo ou em que refazer o laudo é trivial.

### Via 2 — Recurso ao CRPS

Cabível quando o problema é o mérito da decisão pericial, não o laudo. Fundamentação genérica, ausência de análise dos documentos enviados ou erro material do perito abrem recurso no prazo de 30 dias da ciência (art. 9º, Portaria 13/2026, no regime geral do CRPS). O recurso preserva a data de entrada e os efeitos financeiros desde o primeiro protocolo se provido. O argumento central é o vício de motivação, decisão que não enfrenta os documentos apresentados viola o dever de fundamentação (art. 50 da Lei 9.784/99), tese aproveitável também na eventual ação judicial. Instruir com laudo complementado, exames que reforcem a incapacidade e contestação expressa da motivação da negativa.

### Via 3 — Ação judicial (JEF ou Vara Federal)

Cabível quando há urgência (segurado sem renda, incapacidade comprovada, risco de dano grave) ou quando a via documental é estruturalmente inadequada ao quadro, caso das patologias de diagnóstico predominantemente clínico. Não se exige esgotamento administrativo, basta um indeferimento, pois o Tema 350/STF exige prévio requerimento, não exaurimento das instâncias. A tutela de urgência com dossiê médico robusto pode antecipar o pagamento antes da sentença. Duas cautelas do escritório. A primeira, o Tema 1124/STJ, toda documentação relevante deve ter passado pela via administrativa, sob pena de a DIB deslocar para a citação (prova nova só em juízo empurra os efeitos financeiros para frente). A segunda, a competência da casa, morador de Monte Alto, Vista Alegre do Alto ou Pirangi litiga na Justiça Federal de Catanduva, Matão em Araraquara, Jaboticabal ou Guariba em Ribeirão Preto, e o B91 acidentário corre na Justiça Estadual (art. 109, I, parte final, CF).

### Quadro comparativo

| Via | Prazo | Preserva DIB | Melhor quando | Base conferida |
|---|---|---|---|---|
| Nova análise documental | após 30 dias do indeferimento documental (imediato só nos casos do art. 6º, VII e VIII) | Não | Deficiência exclusiva do laudo e incapacidade não contínua | Portaria 13/2026, arts. 2º e 6º, VI a VIII |
| Recurso ao CRPS | 30 dias da ciência | Sim | Mérito pericial injusto, vício de motivação | Portaria 13/2026, art. 9º |
| Ação judicial | imediato após 1 indeferimento | Sim, com ressalva | Urgência, quadro clínico, via documental inadequada | Tema 350/STF, Tema 1124/STJ |

### Cruzamento obrigatório com a trava do art. 6º

Antes de escolher entre novo requerimento e prorrogação, aplicar o ALERTA 7. Indeferimento de prorrogação (PP) por parecer contrário à incapacidade ativa a trava de 180 dias (art. 6º, V), enquanto o indeferimento de requerimento autônomo trava apenas 30 dias (art. 6º, VI). Se a documentação não estiver significativamente mais forte, o requerimento autônomo é menos arriscado que a PP.

## Limites de Duração

### Regra geral (art. 3º, Portaria 13/2026)
A soma dos benefícios de auxílio por incapacidade temporária concedidos por análise documental não pode ultrapassar 30 dias, inclusive se não consecutivos.

### Exceção transitória (Portaria 14/2026)
Em caráter excepcional, o limite é ampliado para 90 dias, com vigência de 180 dias a partir de 24/03/2026 (até aproximadamente 20/09/2026). Após esse prazo, o teto retorna a 30 dias.

## Natureza Acidentária (B91)

A concessão de B91 por análise documental está condicionada ao reconhecimento do nexo técnico previdenciário pela PMF, conforme art. 337 do RPS (Decreto 3.048/99). Essa exigência torna a concessão de B91 por via documental substancialmente mais difícil que a de B31.

## Auxílio-Acidente — Análise Documental Prévia Obrigatória

A Portaria nº 15/2026 institui a análise documental como etapa obrigatória prévia ao agendamento de exame presencial para auxílio-acidente. A PMF pode indeferir sem exame presencial quando concluir pela ausência de elementos documentais essenciais (art. 4º, II). O art. 3º, parágrafo único, ressalva que a análise documental prévia não substitui o exame presencial quanto à aferição da sequela e da efetiva redução da capacidade laborativa.

## Trava dos Três Indeferimentos (art. 8º, Portaria 13/2026)

Após três indeferimentos sucessivos por análise documental, os requerimentos subsequentes são obrigatoriamente direcionados para exame médico-pericial presencial (ou telemedicina), até que haja eventual concessão por perícia presencial/telemedicina.

### TESE DE IMPUGNAÇÃO DO ESCRITÓRIO — Art. 8º como norma de garantia, não de restrição

Classificação. TESE a sustentar em MS ou ação judicial, NÃO é a regra operacional vigente. No balcão administrativo vale o fluxo da Portaria 13/2026, o requerimento entra pela análise documental, não há campo para o segurado exigir perícia presencial desde o início, e o novo pedido após indeferimento documental espera os 30 dias do art. 6º, VI. Feita essa distinção, a tese. O art. 8º cria uma obrigação do INSS (agendar perícia presencial após três negativas), não uma barreira de acesso do segurado ao exame clínico. O art. 60, §11-A, da Lei 8.213/91 trata a análise documental como modalidade alternativa, não como etapa obrigatória prévia ao exame presencial. A Portaria 13/2026, como ato infralegal, não pode criar restrição que a lei não previu. Enquanto a tese não for acolhida no caso concreto, orientar o cliente pela regra, não pela tese.

### ALERTA — Armadilha do "sucessivos"

O INSS interpretará "sucessivos" como exigência de continuidade ininterrupta. Uma concessão intermediária (mesmo que de poucos dias) reseta o contador para zero. O segurado com doença crônica que alterna entre concessões curtas e indeferimentos pode nunca atingir o gatilho, ficando permanentemente preso no ciclo documental.

### ESTRATÉGIA — Não esperar o terceiro indeferimento

Quando o segurado tiver o segundo indeferimento por análise documental e a patologia for de diagnóstico clínico, impetrar mandado de segurança para exigir perícia presencial. Dois indeferimentos consecutivos por método inadequado já demonstram a insuficiência da via documental. Fundamentos no arquivo de referência, seção 7.6.

## Trava dos 180 Dias (art. 6º, V, Portaria 13/2026)

A trava atinge EXCLUSIVAMENTE o segurado que teve indeferimento de prorrogação (PP) por parecer desfavorável à incapacidade. Nesse cenário, o novo requerimento por análise documental só é admitido após 180 dias da cessação. A trava NÃO se aplica a cessação normal, a indeferimento de requerimento autônomo (que tem prazo de 30 dias pelo inciso VI), nem a qualquer outra hipótese do art. 6º. ALERTA — essa restrição não tem base no art. 60 da Lei 8.213/91 e é impugnável judicialmente.

### ALERTA CRÍTICO — Prorrogação é faca de dois gumes

O indeferimento de PP ativa a trava de 180 dias (art. 6º, V). O indeferimento de novo requerimento autônomo tem prazo de apenas 30 dias (art. 6º, VI). Essa diferença de tratamento exige que o advogado avalie cuidadosamente se é mais seguro pedir PP ou fazer novo requerimento autônomo. Se a documentação médica não for significativamente mais forte que a apresentada originalmente, o risco de indeferimento da PP é alto, e a consequência (180 dias de bloqueio) é muito mais grave do que a consequência do indeferimento de requerimento autônomo (30 dias de bloqueio).

## Recurso

Contra decisão desfavorável no auxílio por incapacidade temporária por análise documental, cabe recurso no prazo de 30 dias contados da ciência da decisão, termo inicial fixado pelo art. 305 do Decreto 3.048/99 e pelo regimento do CRPS (skill admissibilidade-barreiras-crps, arts. 77-78). A literalidade do art. 9º da Portaria 13/2026 fala em "data da decisão", redação que, por ato infralegal, não pode encurtar o termo inicial regulamentar; se o INSS contar da decisão, a tempestividade se defende pela ciência. Cautela operacional do escritório, sempre que a data da ciência não for demonstrável documentalmente, contar o prazo da data da decisão, por segurança.

Contra indeferimento do auxílio-acidente pela análise documental prévia, cabe recurso administrativo no prazo e forma da legislação previdenciária vigente (art. 4º, parágrafo único, Portaria 15/2026).

## Autonomia do Perito para Divergir da Documentação

O art. 4º, §3º, da Portaria 13/2026 confere ao PMF autonomia para fixar data de início de repouso e duração do benefício de forma diversa do indicado na documentação médica, com base na literatura científica e nos tempos médios por CID (art. 4º, §4º). ALERTA — esse dispositivo será o principal instrumento de redução de benefícios concedidos por análise documental. O segurado deve obter atestados com data de início do repouso e prazo estimado em dias.

## Requisitos REAIS do art. 2º da Portaria 13/2026 (Onda 72, conferido no DOU)

Redação conferida no inteiro teor publicado no DOU de 24/03/2026, Edição 56, Seção 1, Página 93.

O caput exige, cumulativamente, DOIS documentos. Primeiro, DOCUMENTO OFICIAL COM FOTO. Segundo, documentação médica ou odontológica para fins previdenciários, física ou eletrônica, LEGÍVEL E SEM RASURAS.

A documentação médica deve conter, NO MÍNIMO, os cinco incisos.

Inciso I. Identificação do requerente.

Inciso II. Data de emissão do(s) documento(s) médico(s) ou odontológico(s).

Inciso III. Diagnóstico por extenso OU código da CID. São ALTERNATIVOS. A ausência do código CID não invalida se houver diagnóstico por extenso, e o art. 2º, §3º, atribui à própria PMF o registro do CID com base na descrição apresentada.

Inciso IV. Assinatura do profissional emitente, que pode ser eletrônica e passível de validação.

Inciso V. Identificação do profissional emitente, com nome E registro no Conselho de Classe (CRM ou CRO), ou no Ministério da Saúde (RMS), ou carimbo, LEGÍVEIS.

### CORREÇÃO DE LEITURA CIRCULANTE. O que NÃO é requisito obrigatório

Material de divulgação sobre Atestmed costuma listar cinco campos obrigatórios como sendo CID, data de início, prazo em dias, CRM legível e data de emissão. Essa lista NÃO corresponde ao art. 2º e induz a erro em duas direções opostas.

Apresenta como obrigatório o que é FACULTATIVO ou REMEDIÁVEL.

Prazo estimado em dias. O art. 2º, §2º, diz que "PODERÃO ser apresentados outros elementos para a formação da convicção médico-pericial, inclusive em relação ao prazo estimado necessário, preferencialmente em dias". Verbo facultativo. Sua ausência NÃO é causa normativa de indeferimento.

Data de início do repouso. Não figura entre os incisos. O art. 2º, §1º, remete ao art. 4º quando ausente, e o art. 4º, §1º, autoriza expressamente considerar a DATA DE EMISSÃO do documento. Ausência é lacuna suprida por norma, não vício.

Omite o que é genuinamente OBRIGATÓRIO. Documento oficial com foto (caput). Identificação do requerente (inciso I). Assinatura do profissional emitente (inciso IV). Legibilidade e ausência de rasuras (caput). Cobertura odontológica com CRO, e não apenas CRM.

Uso pró-segurado da correção. Indeferimento fundado exclusivamente na ausência de prazo em dias ou de data de início do repouso contraria a literalidade do art. 2º, §2º, e do art. 4º, §1º, e é atacável em recurso ao CRPS, em MS ou em juízo. Registrar o dispositivo na peça. Em sentido inverso, a falta de documento oficial com foto, de assinatura ou de identificação legível do emitente é vício real, a sanar antes do protocolo.

Ressalva de método. Obter atestado COM data de início do repouso e COM prazo em dias continua sendo a orientação prática correta, porque reduz o espaço de arbítrio do art. 4º, §3º (autonomia do PMF para fixar prazo diverso). O ponto da correção é normativo, não estratégico. Esses elementos fortalecem o pedido, mas sua ausência não o inviabiliza.

## Alertas Estratégicos

### ALERTA 1 — Documentação é tudo
No regime de análise documental, a qualidade da documentação médica apresentada no requerimento administrativo define o resultado. Relatórios genéricos serão rejeitados. Cada requisito do art. 2º das Portarias nº 13 e nº 15 deve ser individualmente atendido, observada a distinção entre requisito obrigatório e elemento facultativo da seção anterior.

### ALERTA 2 — Tema 1124/STJ
A documentação apresentada no requerimento administrativo define os efeitos financeiros em eventual ação judicial. Toda documentação relevante deve ser apresentada na via administrativa. Se omitida sem justificativa, os efeitos financeiros podem retroagir apenas à citação.

### ALERTA 3 — Patologias subjetivas em risco
Dor crônica, fibromialgia, transtornos mentais, síndromes funcionais e outras patologias de diagnóstico predominantemente clínico têm alto risco de indeferimento na triagem documental, porque a análise por verossimilhança tende a exigir evidência objetiva.

### ALERTA 4 — Auxílio-acidente exige instrução robusta
Os documentos do parágrafo único do art. 2º da Portaria nº 15 (laudos, exames de imagem, CAT, boletim de ocorrência) devem ser tratados como obrigatórios na prática, embora normativamente sejam facultativos. A diferença entre deferimento e indeferimento depende da robustez do conjunto probatório.

### ALERTA 5 — Impacto da expiração da Portaria nº 14
Após 180 dias de vigência (≈20/09/2026), o teto retorna a 30 dias. Segurados com doenças de recuperação lenta que obtiveram até 90 dias por análise documental precisarão de exame presencial para continuidade. Monitorar a eventual prorrogação ou substituição normativa.

### ALERTA 6 — Art. 8º como funil, regra vigente x tese impugnável
No fluxo administrativo vigente, a via documental é a porta de entrada do B31 e o INSS opera o art. 8º como funil, perícia presencial garantida só após três indeferimentos documentais sucessivos, e novo pedido pós-indeferimento documental só após 30 dias (art. 6º, VI). Orientar o cliente por essa regra. A leitura do art. 8º como norma de garantia (direito à perícia presencial desde o primeiro requerimento) é TESE DE IMPUGNAÇÃO, a sustentar por MS ou em juízo, ver seção própria e a seção 7.6 do arquivo de referência. Nunca apresentar a tese ao cliente como se fosse o funcionamento do sistema.

### ALERTA 7 — Prorrogação (PP) vs novo requerimento autônomo
Indeferimento de PP ativa trava de 180 dias (art. 6º, V). Indeferimento de novo requerimento autônomo tem prazo de apenas 30 dias (art. 6º, VI). Avaliar caso a caso se é mais seguro pedir PP ou fazer novo requerimento.

### ALERTA 8 — Portaria SE/MPS nº 490/2026 — Incentivo econômico à perícia presencial
A Portaria SE/MPS nº 490/2026, publicada no mesmo DOU de 24/03/2026, altera a tabela de pontuação das atividades da Perícia Médica Federal (PGDPMF). Perícias presenciais mantêm maior peso na pontuação. Análises documentais têm menor pontuação. Isso revela que o sistema incentiva o perito a direcionar casos para perícia presencial (mais pontos) ou a indeferir por via documental (menos trabalho). Argumento utilizável em impugnações para demonstrar viés institucional contra a análise documental favorável ao segurado.

### ALERTA 9 — Os quatro campos de autodeclaração do Meu INSS são armadilha para o segurado desassistido

O sistema Meu INSS exige quatro campos de autodeclaração no requerimento de benefícios por incapacidade (Portaria Conjunta DTI/DIRBEN/INSS nº 16, de 31/03/2026), "data de início dos sintomas", "descrição dos sintomas", "atividade/trabalho que exercia" e "descrição da atividade/trabalho". Os dois primeiros alimentam a fixação de DIS/DII e o cotejo com a documentação médica. Os dois últimos fixam o parâmetro da incapacidade, porque o B31 é incapacidade para a atividade habitual, e o perito documental mede a doença contra exatamente o que estiver escrito ali. Tudo fica registrado, é confrontado com o CNIS e com a documentação médica e constitui prova pré-constituída em eventual ação judicial. O advogado DEVE orientar (ou redigir com o cliente) o preenchimento ANTES do protocolo, seguindo o Protocolo de Autodeclaração abaixo.

## Protocolo de Autodeclaração nos Campos do Meu INSS

PADRÃO DE REDAÇÃO VALIDADO (Onda 103). O texto ordinário dos campos é CURTO, direto e fecha com pedido de ajuda verdadeiro. Modelo-referência aprovado pelo escritório, sintomas em `Estou com muitas dores na região lombar com irradiação para a perna e formigamento` e atividades em `Trabalhava no cultivo de cana-de-açúcar. Estou totalmente impossibilitada de retornar ao trabalho. Peço a ajuda e compreensão, pois estou sem nenhuma renda.` Sintoma preciso sem termo médico, atividade concreta em vez do nome do cargo, impossibilidade afirmada sem rodeio e apelo humano ancorado em fato verdadeiro. Banco de exemplos por quadro (coluna, ombro, joelho, transtorno mental, cardiopatia, oncológico) e regras do padrão em `references/PADRAO-AUTODECLARACAO-MEU-INSS.md`. A extensão de 6 a 10 linhas indicada no Template operacional abaixo passa a ser TETO para casos que exijam narrativa longa, não meta.

Cobre os quatro campos exigidos no requerimento. Regra de forma universal, válida para TODOS os campos. Texto em primeira pessoa do singular, linguagem simples de segurado sem conhecimento técnico, poucas linhas, sem formalismo. PROIBIDO citar lei, artigo, portaria, jurisprudência, súmula, termo médico técnico ou expressão de advogado em qualquer campo. Formalismo denuncia preenchimento por procurador, tira a espontaneidade da declaração e arma o perito contra o segurado. Esta skill GERA os quatro textos prontos quando receber o caso (CNIS + documentação médica + relato do cliente), sempre com base na verdade dos autos, nunca inventando fato.

### Distinção conceitual obrigatória

Antes de preencher, fixar os três marcos temporais com clareza.

**DID (data do início da doença).** Data em que a doença surgiu clinicamente. Pode ser remota. Relevante apenas para caracterizar cronicidade e preexistência. NUNCA é o campo do Meu INSS.

**DIS (data do início dos sintomas).** Campo formal do Meu INSS. É declaração jurídica vinculante que o perito usará para cotejo documental e possível fixação retroativa de DII. DEVE ser posicionada dentro de período com qualidade de segurada e carência cumprida.

**DII (data do início da incapacidade).** Data em que a doença passou a impedir o trabalho. É o marco previdenciário que define DIB, carência e qualidade de segurada. NUNCA é o campo do Meu INSS diretamente, embora influencie a escolha da DIS.

**ERRO COMUM E GRAVE.** Preencher DIS com data remota (ex. ano em que a doença surgiu) sem verificar situação previdenciária. Isso entrega ao INSS o argumento para indeferir por preexistência ou ausência de carência.

**ERRO INVERSO.** Preencher DIS com a data da declaração médica de incapacidade (DII). Isso contradiz a declaração médica quando ela registra acompanhamento anterior, gera suspeita de fraude e destrói a tese do agravamento.

### Passo 1 — Análise retroativa obrigatória do CNIS

Antes de fixar DIS, executar análise reversa do CNIS identificando cada janela temporal em que houve simultaneamente:

1. Qualidade de segurada (vínculo ativo ou período de graça do art. 15 Lei 8.213/91, observado o art. 14 do Decreto 3.048/99 para cálculo do termo final)
2. Carência cumprida (12 contribuições ou 6 em caso de reingresso, art. 27-A Lei 8.213/91)

Mapear todas as janelas candidatas desde o primeiro momento em que a doença é documentalmente rastreável.

**Descartar automaticamente** janelas em que houve:

- Apenas recolhimentos facultativos com indicador PREC-FBR pendente de análise
- Períodos sem qualquer contribuição dentro do período de graça
- Primeiros meses de vínculo em que ainda não há carência
- Competências com indicador PSC-MEN-SM-EC103 sem complementação

### Passo 2 — Escolher a DIS mais defensável

Entre as janelas viáveis, escolher a data que atenda aos seguintes critérios em ordem de prioridade:

1. Coincidir com fato concreto verificável no CNIS (pedido de demissão, fim de vínculo, mudança de função, CAT emitida)
2. Corresponder ao relato espontâneo da cliente sobre agravamento recente
3. Ser coerente com a declaração médica (não anterior a ela sem justificativa clínica, não posterior a ela)
4. Ter vínculo ativo ou estar dentro dos primeiros meses do período de graça (margem de segurança)

A DIS ideal é a do **agravamento recente** que levou ao pedido do benefício, não a do **surgimento histórico** da doença.

### Passo 3 — Redigir os sintomas em primeira pessoa e de forma humanizada

NÃO reproduzir o texto técnico do relatório médico. O texto deve soar como a cliente escrevendo com as próprias palavras, mas manter fidelidade aos sintomas documentados.

#### Regras redacionais

**Primeira pessoa do singular.** "Eu tenho depressão", não "A requerente apresenta quadro depressivo".

**Frases curtas e linguagem coloquial.** Evitar terminologia técnica como "anedonia", "humor disfórico", "insônia de manutenção". Traduzir para "perdi a vontade de fazer o que eu gostava", "não consigo voltar a dormir quando acordo de madrugada".

**Mencionar tratamento vigente sem fixar data antiga como marco jurídico.** Pode dizer "faço tratamento no CAPS", mas não "comecei a tratar em 2020".

**Ancorar a piora em data específica verificável no CNIS.** Exemplo bom — "A piora começou em fevereiro de 2026, quando eu estava trabalhando na HBA Hutchinson. Entrei em 13/01/2026 e pedi demissão em 24/02/2026". Exemplo ruim — "Estou piorando há algum tempo".

**Descrever o fracasso da tentativa de retorno ao trabalho** quando houver, com datas do CNIS. Serve de prova concreta do agravamento.

**Citar a medicação em uso com dose e mencionar data do ajuste medicamentoso** quando houver. É ancoragem direta à declaração médica.

**Registrar a incompatibilidade entre medicação e atividade laboral** quando houver. Exemplo — "os remédios me dão muito sono e não tem como trabalhar tomando eles".

#### Coerência clínica interna obrigatória

Revisar o texto contra contradições aparentes antes de submeter. Hipóteses comuns:

**Insônia + sono diurno por medicação.** Não é contradição. Insônia de manutenção é sintoma da doença, sonolência diurna é efeito colateral da medicação sedativa (amitriptilina, clonazepam, mirtazapina). Separar no texto com marcadores temporais ("à noite acordo várias vezes", "durante o dia os remédios me deixam com sono").

**Tratamento antigo + piora recente.** Não é contradição. Doença crônica controlada que descompensa. Redigir como "faço tratamento há um tempo, mas piorei em [data precisa]".

**Exercício atual de atividade informal + pedido de benefício.** Não é contradição se houver incompatibilidade entre trabalho e medicação. Registrar expressamente essa incompatibilidade.

**Doença ortopédica sem cirurgia + incapacidade.** Não é contradição. Registrar limitação funcional concreta (não consigo levantar peso, não consigo ficar em pé por muito tempo), não apenas a dor.

### Passo 4 — Declarar a atividade/trabalho que exercia

Este campo fixa o parâmetro contra o qual a incapacidade será medida. Regras.

1. Declarar a atividade habitual REAL, a mesma do CNIS e da CTPS. Divergência entre o campo e o CNIS gera suspeita e indeferimento.
2. Desempregado NUNCA escreve apenas "desempregado", "do lar", "encostado" ou "nenhuma". Sem atividade de referência o perito perde o parâmetro e nega. Formato correto, "trabalhava como [função] até [mês/ano], hoje estou desempregado(a)".
3. Quem faz bico leve não declara o bico como atividade principal. Declarar atividade mais leve que a habitual desloca o parâmetro a favor do INSS, que conclui capacidade para a atividade declarada.
4. Contribuinte individual declara a atividade do cadastro. Caso acidentário declara a mesma função da CAT e do PPP, coerência de nexo.
5. Poucas palavras, nome comum da função, sem código CBO e sem cargo técnico. "Pedreiro", não "oficial de construção civil".

### Passo 5 — Descrever a atividade/trabalho

É aqui que o perito documental decide. Ele cruza a rotina descrita com os sintomas e com a documentação médica, e se a descrição não contiver as exigências que a doença compromete, conclui capacidade residual e indefere. Regras.

1. Descrever o que a função exige do corpo e da mente, peso carregado, postura (em pé, agachado, movimento repetido), ritmo e meta, atenção e concentração, pressão e cobrança, atendimento ao público, altura, turno. São essas exigências que colidem com a limitação documentada.
2. Sempre a verdade. Não inventar tarefa pesada nem exagerar, documento ou descrição falsos expõem o segurado (art. 10 da Portaria 13/2026) e derrubam o benefício.
3. Não listar apenas as tarefas leves que o segurado ainda consegue fazer, isso dilui a incompatibilidade e entrega o indeferimento.
4. Fechar com uma frase ligando a rotina à limitação, no padrão "do jeito que estou, não consigo fazer isso".
5. De 3 a 6 linhas, primeira pessoa, linguagem de quem trabalha na função, observada a regra de forma universal (sem lei, sem jurisprudência, sem termo técnico).

### Passo 6 — Revisão final antes do protocolo

Antes de submeter no Meu INSS, verificar:

- [ ] A DIS está em data com qualidade de segurada e carência? Se não, reposicionar.
- [ ] O texto dos sintomas menciona data específica e verificável do agravamento? Se não, incluir.
- [ ] A atividade declarada é a mesma do CNIS/CTPS (ou a última exercida, no caso de desempregado)? Se não, corrigir.
- [ ] A descrição da atividade contém as exigências concretas que a doença compromete? Se não, reescrever.
- [ ] Sintomas, atividade descrita e documentação médica contam a mesma história (coerência tríplice)? Se não, ajustar antes do protocolo.
- [ ] Há contradição clínica aparente? Se sim, separar com marcadores temporais ou contextuais.
- [ ] Algum campo contém lei, jurisprudência, termo técnico ou frase de advogado? Se sim, reescrever em linguagem de segurado.
- [ ] O texto tem tom humanizado e soa como a cliente falando? Se não, reescrever.
- [ ] A declaração médica mais recente está citada no texto de sintomas com data? Se não, incluir.
- [ ] O CID está registrado no texto de sintomas? Se não, incluir (é informação objetiva que ancora a narrativa).

### Template operacional

**Data de início dos sintomas** — [DD/MM/AAAA escolhida pelos Passos 1 e 2]

**Atividade/trabalho que exercia** — [função real do CNIS, nome comum; se desempregado, "trabalhava como X até mês/ano, hoje estou desempregado(a)"]

**Descrição da atividade/trabalho** — [3 a 6 linhas, primeira pessoa, o que faz no dia a dia e o que a função exige (peso, postura, ritmo, atenção, pressão), fechando com a frase que liga a rotina à limitação]

**Descrição dos sintomas** — [Texto em primeira pessoa, 6 a 10 linhas, estruturado assim]

- Linha 1-2 — Apresentação da doença e tratamento (sem fixar data antiga).
- Linha 3-4 — Data e circunstância da piora, ancorada em fato do CNIS.
- Linha 5-6 — Sintomas principais em linguagem coloquial.
- Linha 7-8 — Medicação em uso, data de ajuste, pedido de afastamento médico.
- Linha 9-10 — Incompatibilidade entre medicação e trabalho. Conclusão de que não há condição de trabalhar.

### Exemplo aplicado — Transtorno depressivo grave

Segurada com depressão grave, tratamento crônico no CAPS, piora durante vínculo formal recente, DER prevista para abril de 2026.

**Data de início dos sintomas** — 01/04/2025

**Atividade/trabalho que exercia** — "Auxiliar de produção. Trabalhei na HBA Hutchinson até fevereiro de 2026, hoje estou desempregada."

**Descrição da atividade/trabalho** — "Eu trabalhava na linha de produção, em pé o turno inteiro, com meta para bater e barulho de máquina o tempo todo. Precisava de atenção total para não errar peça e não me machucar, e era muita cobrança e correria. Do jeito que eu estou, chorando toda hora e sem conseguir me concentrar, não tenho condição de trabalhar em linha de produção."

**Descrição dos sintomas** — "Eu tenho depressão e faço tratamento no CAPS de Monte Alto. A piora começou em fevereiro de 2026, quando eu estava trabalhando na HBA Hutchinson. Entrei na empresa em 13/01/2026, mas não aguentei. Era muita pressão, eu saía tarde e chegava em casa 23h chorando de nervoso, sem conseguir dormir. Pedi demissão em 24/02/2026 e de lá para cá só piorei. Choro toda hora sem motivo, perdi a vontade de fazer o que eu gostava, acordo várias vezes durante a noite e não consigo voltar a dormir. Moro sozinha, me isolei, não quero conversar com ninguém. Tenho pensamentos de morte. A médica ajustou a medicação em 08/04/2026 e pediu meu afastamento do trabalho por tempo indeterminado, mas não estou bem. Durante o dia os remédios me deixam com muito sono e não tenho condições de trabalhar tomando eles."

### Exemplo aplicado — Doença osteomuscular

Segurado com hérnia de disco lombar, piora após esforço no trabalho, vínculo ativo como pedreiro.

**Data de início dos sintomas** — 15/01/2026

**Atividade/trabalho que exercia** — "Pedreiro. Trabalho em obra há mais de 15 anos."

**Descrição da atividade/trabalho** — "Na obra eu levanto parede, carrego saco de cimento e lata de massa, subo em andaime e passo o dia agachando e levantando peso. Não existe serviço leve de pedreiro. Com a minha coluna do jeito que está, não consigo levantar peso nem ficar abaixado, então não consigo fazer o meu serviço."

**Descrição dos sintomas** — "Eu tenho hérnia de disco na coluna lombar (CID M51). Sinto dor forte e constante nas costas que desce pela perna direita. A piora começou em janeiro de 2026, quando levantei um saco de cimento no serviço e não consegui mais levantar da cama no dia seguinte. Trabalho como pedreiro e não tenho mais condição de levantar peso, ficar abaixado nem ficar em pé muito tempo. Tomei injeção de anti-inflamatório, mas a dor volta. Fiz ressonância em março de 2026 que mostrou a hérnia comprimindo o nervo. O ortopedista me afastou em 08/04/2026 e disse que preciso de cirurgia. Não durmo direito por causa da dor e durante o dia não consigo fazer nada."

### Exemplo aplicado — Doença cardiovascular

Segurada com insuficiência cardíaca, vínculo como auxiliar de limpeza, descompensação após internação.

**Data de início dos sintomas** — 10/02/2026

**Atividade/trabalho que exercia** — "Auxiliar de limpeza numa escola."

**Descrição da atividade/trabalho** — "Eu limpava a escola inteira, varria e passava pano nos corredores, carregava balde cheio de água e subia escada com o material de limpeza. É serviço puxado, de andar e carregar peso o dia todo. Hoje qualquer esforço me deixa sem ar e com o coração acelerado, não dou conta nem de subir um lance de escada."

**Descrição dos sintomas** — "Eu tenho insuficiência cardíaca (CID I50). Em fevereiro de 2026 fui internada por falta de ar e inchaço nas pernas. Fiquei internada por uma semana e desde que saí do hospital não consigo mais trabalhar. Trabalhava como auxiliar de limpeza, mas qualquer esforço me deixa cansada e com falta de ar. Não consigo subir escada, não consigo carregar balde de água, não consigo ficar muito tempo em pé. Tomo furosemida, carvedilol e enalapril todo dia. O cardiologista me afastou em 08/04/2026 e disse que não posso fazer esforço físico. Durante a noite durmo sentada para não afogar."

### ALERTA 10 — Teleperícia (Portaria DPMF/INSS 19/2026) a partir de 13/04/2026
A Portaria DPMF/INSS 19/2026 institui Teleperícia (videoconferência com presença física do segurado na APS) para perícia médica inicial, BPC inicial e reavaliação de BPC. Em quadros que demandem exame físico direto (ortopédicos, neurológicos, reumáticos com necessidade de palpação e mensuração), orientar o segurado a recusar o método remoto e exigir designação para perícia presencial. Em caso de imposição da Teleperícia, registrar protesto em ata da APS e instruir impugnação por cerceamento de defesa. O laudo produzido por videoconferência sem possibilidade de exame físico em quadros que o exigem tem fragilidade técnica grave e fundamenta nulidade administrativa e judicial. Cruzar com a skill `auditoria-laudo-pericial` ao analisar laudos produzidos por Teleperícia.

## Dados Normativos Complementares

### Portaria SE/MPS nº 490, de 23/03/2026
- Publicação — DOU de 24/03/2026
- Objeto — Altera a tabela de pontuação das atividades da Perícia Médica Federal (PGDPMF)
- Impacto — Perícias presenciais valem mais pontos que análises documentais. Atividades complexas mais valorizadas que atividades simples.

### Portaria Conjunta DTI/DIRBEN/INSS nº 16, de 31/03/2026
- Objeto (ementa conferida) — Estabelece procedimentos operacionais para a apresentação de autodeclaração no âmbito dos requerimentos de benefício por incapacidade analisados por via documental
- Efeito prático — O requerimento no Meu INSS exige quatro campos de autodeclaração, data de início dos sintomas, descrição dos sintomas, atividade/trabalho que exercia e descrição da atividade/trabalho
- Conferência — Número, órgãos emissores, data e ementa conferidos em 18/07/2026. Texto integral [NÃO CONFIRMADO], pendente de conferência no DOU. A existência e o teor dos quatro campos estão confirmados pela operação do escritório em protocolos reais de julho/2026. No próximo protocolo, capturar tela dos campos (skill printscreen-impacto) para documentar o formulário

### Portaria Conjunta DPMF/INSS nº 19, de 31/03/2026 (republicada no DOU de 09/04/2026)
- Publicação original — DOU de 08/04/2026, Seção 1, p. 70 (com incorreção); republicada em 09/04/2026, Seção 1, p. 102
- Vigência — 13/04/2026
- Objeto — Regulamenta o uso da funcionalidade de atendimento remoto do SAT Central para realização de exames médico-periciais por telemedicina (Teleperícia), no âmbito da Perícia Médica Federal
- Serviços abrangidos (art. 3º) — Avaliação Médico Pericial de Reavaliação de BPC (Teleperícia), Avaliação Médico Pericial Inicial de BPC (Teleperícia), Perícia Médica Inicial (Teleperícia), e outros serviços conforme critérios do Departamento de Perícia Médica Federal
- Características — Presença obrigatória do segurado na APS, com videoconferência conduzida por perito médico federal remoto. Termo de Consentimento Livre e Esclarecido coletado pela triagem antes da chamada. Documentação digitalizada e anexada ao requerimento via PAT antes da videoconferência

### Posição do escritório sobre a Teleperícia
A Teleperícia é via alternativa, não obrigatória. O segurado tem direito de recusar o atendimento remoto quando o quadro clínico exigir exame físico direto, e essa recusa não pode ser convertida em desistência do requerimento. A Portaria 19/2026 não revoga o direito ao exame presencial e não pode ser interpretada como funil obrigatório. O ato pericial conduzido por videoconferência é insuficiente para apreciar quadros que demandam palpação, mensuração de amplitude articular, ausculta, avaliação de força muscular, testes funcionais ou observação direta de marcha e equilíbrio.

## Interação com Outras Skills

- **peticao-previdenciaria** — Toda petição de auxílio por incapacidade ou auxílio-acidente deve considerar as regras da análise documental para fundamentar o interesse de agir e os efeitos financeiros
- **auditoria-laudo-pericial** — Quando o parecer técnico da análise documental for desfavorável, aplicar a auditoria sobre o parecer
- **ntep-nexo-acidentario** — Para B91 por análise documental, o reconhecimento do nexo depende da PMF conforme art. 337 do RPS. A skill de nexo orienta a instrução
- **documentos-comprobatorios-in128** — Fonte primária para checklist de documentos, agora integrada com os requisitos mínimos dos arts. 2º das Portarias 13 e 15
- **tema-1124-instrucao-administrativa** — Toda documentação deve ser apresentada na via administrativa para preservar efeitos financeiros retroativos à DER
- **inss-canais-atendimento** — Requerimento pelo 135 fica pendente de exigência para anexar documentação (art. 1º, §3º, Portaria 13/2026). Orientar uso do Meu INSS para anexação imediata
- **cartas-documentos-previdencia** — Atualizar as cartas de documentos para incluir os requisitos mínimos das novas portarias
- **admissibilidade-relevacao-crps** — O recurso contra indeferimento por análise documental segue o regime geral de admissibilidade
- **sustentacao-diligencias-crps** — Pedir sustentação oral no recurso ao CRPS para converter monocrática em colegiado
- **portaria-462-restricao-recursal** — Se usar revisão administrativa ao invés de recurso ao CRPS, alerta sobre armadilha do art. 112, §7º
- **riscos-psicossociais-previdenciario** — Patologias psiquiátricas têm alto risco de indeferimento na triagem documental
- **lei-13460-usuario-servico-publico** — Impugnação de exigências documentais abusivas que extrapolem os requisitos mínimos legais
- **ms-competencia-autoridade-coatora** — Para todos os mandados de segurança mapeados nesta skill

## Mapa de Vias de Impugnação (detalhes em `references/VIAS-IMPUGNACAO.md`)

### Mandado de segurança (7 hipóteses)
1. Perícia presencial sem esgotar três indeferimentos
2. Trava dos 180 dias (art. 6º, V)
3. Indeferimento de auxílio-acidente sem perícia presencial
4. Redução de prazo de afastamento por tabela CID
5. Recusa de protocolar requerimento
6. Reset abusivo do contador por concessão irrisória
7. Demora na análise documental

### Ação de concessão (JEF)
Indeferimento documental como porta de entrada judicial, com perícia judicial presencial. Especialmente forte para patologias subjetivas.

### Recurso ordinário ao CRPS
Contra qualquer indeferimento por análise documental, com pedido de diligência para exame presencial e sustentação oral.

### Revisão administrativa
Somente com documento novo concreto. ALERTA — Portaria 462/2026 pode trancar recurso subsequente.

### Reclamação na Ouvidoria
Exigências documentais abusivas e prazo de análise.

### LAI
Tabelas CID, taxas de indeferimento por CID, dados de pontuação PMF. Instrumento estratégico para instruir ações individuais e coletivas.

### ACP / Representação ao MPF
Padrão sistêmico de indeferimentos por CID. Depende de dados via LAI.

### Requerimento administrativo de B31/B91/B94
Quando o caso exigir novo requerimento administrativo de incapacidade (primeiro requerimento ou novo requerimento após cessação/indeferimento), acionar a skill `requerimento-administrativo-inss` para gerar a peça no formato adequado ao servidor do INSS, integrando os requisitos documentais das Portarias 13, 14 e 15/2026 mapeados por esta skill.