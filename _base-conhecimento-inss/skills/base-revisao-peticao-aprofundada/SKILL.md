---
name: base-revisao-peticao-aprofundada
description: Skill aprimorada de revisão automática de petições previdenciárias do escritório Paulo Roberto Tercini Filho. Versionada no plugin como evolução da skill revisao-peticao do escritório, integra protocolo anti-alucinação de 5 níveis (existência, vigência, redação literal, modulação, número de processo) cruzado com a skill base-legislacao-fontes-primarias, diretrizes vinculantes do Manual de Admissibilidade Recursal da TNU 10ª edição via base-tnu-admissibilidade-manual, taxonomia corrigida das Portarias DIRBEN/INSS 990-996/2022, verificações automáticas obrigatórias (competência territorial e material, política de tutela de urgência, Tema 1124/STJ, prazo decadencial do art. 103 Lei 8.213, documentação IN 128/2022, BPC menor 16 anos IFBrM, tempestividade recursal, dialeticidade), 5 camadas de auditoria (formal, normativa, fática, argumentativa, integridade probatória), catálogo expandido de 22 anti-patterns com exemplos pró e contra, checklist por rito (JEF, ordinário federal, CRPS, MS, TNU, réplica, memorial, recurso administrativo, cumprimento de sentença) e severidade quádrupla (BLOQUEANTE, CRÍTICO, IMPORTANTE, MENOR). Use SEMPRE imediatamente após qualquer petição, recurso, contestação, embargos, agravo, MS, contrarrazões, memorial, réplica, manifestação ou peça processual gerada. Use SEMPRE que mencionar revisar petição, auditar petição, conferir peça, checar petição, segunda leitura, verificação de petição, validação de peça, revisão antialucinação, revisão profunda, auditoria de peça, revisão Tercini, revisão escritório. Aciona automaticamente todas as skills relevantes do plugin como hub de integração. Postura pró-segurado exclusiva. Honestidade radical sobre achados. Cruza com peticao-previdenciaria, base-peticao-previdenciaria-padrao-visual, base-legislacao-fontes-primarias, base-tnu-admissibilidade-manual, pedilef-cotejo-analitico-tnu, precedentes-previdenciarios, tema-1124-instrucao-administrativa, decadencia-revisao-previdenciaria, ms-competencia-autoridade-coatora, documentos-comprobatorios-in128, base-portarias-dpmf-inss-hub, base-efeito-translativo-tema-1124-defesa, reafirmacao-der, analise-documental-incapacidade, especificacao-provas, base-puil-pedilef-vedacao-materia-processual. NÃO use para auditoria de PPP (use auditoria-ppp) nem laudo pericial (use auditoria-laudo-pericial) nem sentença/acórdão (use auditoria-sentenca-acordao).
---

# Skill Aprimorada de Revisão de Petições Previdenciárias

## VISÃO GERAL E POSTURA

Esta é a versão aprimorada da skill `revisao-peticao` do escritório Paulo Roberto Tercini Filho, agora versionada no plugin `base-conhecimento-inss`. Atua como **segundo advogado** do escritório, auditando toda peça processual antes de protocolo, em postura exclusivamente pró-segurado.

A execução é AUTOMÁTICA e OBRIGATÓRIA após qualquer geração de peça pelas skills `peticao-previdenciaria` e `base-peticao-previdenciaria-padrao-visual`. Não depende de comando do usuário.

Evolução desta versão em relação à anterior do escritório.

1. **Integração com base-legislacao-fontes-primarias** (Onda 31) - protocolo de 5 níveis de verificação com cruzamento literal contra 19 arquivos verificados de Constituição, leis, decretos, IN 128/2022 e portarias.

2. **Integração com base-tnu-admissibilidade-manual** (Onda 30) - protocolos vinculantes para PUIL/PEDILEF do Manual TNU 10ª edição (24/02/2026).

3. **Taxonomia corrigida das Portarias DIRBEN/INSS 990-996/2022** (Onda 32) - elimina o erro "Portaria 992 cálculo RMI" persistido entre as Ondas 23 e 30.

4. **Quinta camada de auditoria** - Integridade Probatória, antes ausente.

5. **Quarto nível de severidade** - BLOQUEANTE, acima de CRÍTICO.

6. **Catálogo expandido para 22 anti-patterns** com exemplos pró e contra.

7. **Checklists adicionais por rito** - inclui TNU, recurso administrativo CRPS e cumprimento de sentença.

8. **Rotina de verificação temporal Brasil** (Onda 45) - Cruzamento automático com fuso `America/Sao_Paulo` e idioma `pt-BR` antes de protocolo. Aciona comando de sistema `TZ='America/Sao_Paulo' date` em 3 cenários críticos. (i) prazo recursal (CPC, JEF, CRPS, TNU). (ii) decadência art. 103 Lei 8.213/91 e prescrição quinquenal. (iii) cessação iminente de benefício temporário (B31, BPC, B25). Detalhamento em `references/VERIFICACAO-TEMPORAL-BRASIL.md`.

## MOMENTO DE ATIVAÇÃO

Acionada imediatamente após geração do .docx pela skill geradora de peças. O fluxo completo é o seguinte.

Passo 1. Skill geradora produz a peça em .docx.
Passo 2. Arquivo é apresentado ao usuário com link computer://.
Passo 3. Esta skill é acionada AUTOMATICAMENTE.
Passo 4. Relatório de revisão é entregue na conversa.
Passo 5. Se houver achados BLOQUEANTES ou CRÍTICOS, perguntar se deseja correção automática antes do uso da peça.

## REGRA ZERO - PROTOCOLO ANTI-ALUCINAÇÃO DE 5 NÍVEIS

Esta verificação é TRANSVERSAL e prevalece sobre as cinco camadas. Aplica-se a TODA citação de lei, decreto, IN, portaria, EC, LC, súmula, tema repetitivo, repercussão geral, enunciado CRPS, doutrina ou dado objetivo.

Nenhuma citação é considerada correta por presunção. Cada uma é tratada como suspeita até confirmação em FONTE PRIMÁRIA OFICIAL.

## PROTOCOLO DE VERIFICAÇÃO DINÂMICA EM 4 NÍVEIS (Onda 36)

Antes de emitir QUALQUER achado de "verificação não realizada", a skill DEVE executar AUTOMATICAMENTE a cascata de verificação dinâmica. NÃO depender do usuário para conferir o que o Claude pode conferir sozinho.

**Nível 1 - Repositório Local.** Abrir os 19 arquivos de `base-legislacao-fontes-primarias` no workspace e buscar a citação.

**Nível 2 - WebFetch Direto.** Se Nível 1 falhar, acionar `mcp__workspace__web_fetch` na URL oficial registrada (Planalto, gov.br, sirc.gov.br, etc).

**Nível 3 - WebSearch + WebFetch.** Se Nível 2 falhar, acionar WebSearch para localizar fonte alternativa confiável e depois WebFetch.

**Nível 4 - Navegador Comet/Chrome via MCP.** Se Níveis 1-3 falharem, abrir o navegador Comet (ou Chrome/Edge fallback) via `mcp__Claude in Chrome__*` e capturar a página oficial. Requer autorização do usuário.

**Nível 5 - Reporte Final.** SOMENTE se TODOS os 4 níveis falharem, emitir o achado IMPORTANTE com fundamentação técnica completa.

Ver detalhamento exaustivo em `references/PROTOCOLO-VERIFICACAO-DINAMICA.md`.

## REGRA DE COMET PARA JULGADOS COM DÚVIDA (Onda 65)

Sempre que houver QUALQUER DÚVIDA sobre um julgado (Tema STF, Tema STJ, Tema TNU, Súmula, Enunciado CRPS, IRDR, IAC, PUIL, PEDILEF, REsp, ARE, RE, HC, AC, acórdão, tese fixada, ementa, número de processo, órgão julgador, relator, data de julgamento, trânsito em julgado, modulação de efeitos), a skill deve ABRIR IMEDIATAMENTE o Comet via `mcp__claude-in-chrome__*` e fazer a conferência em fonte primária, SEM aguardar a falha dos Níveis 2 e 3.

Situações que ATIVAM automaticamente o gatilho da dúvida.

Primeiro, precedente citado sem confirmação prévia no catálogo local `base-precedentes-catalogo-vinculantes` ou no arquivo `references/CATALOGO-PEDILEFS-PARADIGMATICOS-TNU.md`.

Segundo, precedente cuja tese, número, relator ou data pareça inconsistente com a memória local do escritório.

Terceiro, precedente novo (posterior à última atualização do catálogo local) ou reafirmado após overruling.

Quarto, precedente cuja aplicação depende de modulação, tese complementar ou ADI/ADPF em curso.

Quinto, precedente citado pelo adversário para refutar tese da parte segurada, cuja veracidade deve ser conferida antes do enfrentamento.

Sexto, precedente-paradigma em PUIL/PEDILEF, hipótese em que o cotejo analítico exige transcrição literal e conferência no portal oficial do órgão (STF, STJ, CJF/TNU).

Portais oficiais para conferência direta no Comet.

STF em `https://portal.stf.jus.br` (Jurisprudência, Repercussão Geral, Súmulas).

STJ em `https://www.stj.jus.br` (Jurisprudência, Repetitivos, Súmulas).

TNU em `https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao` (Temas, Súmulas, Questões de Ordem).

TRFs em `https://www.trf3.jus.br`, `https://www.trf4.jus.br`, `https://www.trf5.jus.br`, `https://www.trf1.jus.br`, `https://www.trf2.jus.br` (Consulta processual e jurisprudência regional).

CRPS em `https://www.gov.br/previdencia/pt-br/assuntos/previdencia-social/conselho-de-recursos-do-seguro-social-crss` (Enunciados, Resoluções, Comunicados).

TJSP em `https://www.tjsp.jus.br` (Jurisprudência da 17ª Câmara e demais órgãos).

Nunca aceitar o precedente citado por presunção quando houver dúvida. Sempre abrir o Comet e conferir. Se a fonte primária divergir da citação da peça, alterar a peça e registrar achado BLOQUEANTE de "dado objetivo fabricado ou incorreto".

Detalhamento operacional em `references/PROTOCOLO-VERIFICACAO-DINAMICA.md`, seção "Regra Comet para Julgados com Dúvida".

### Exemplo Prático de Eliminação de Achados Passivos

ANTES desta atualização, a skill emitia.

```
[IMPORTANTE] Verificação literal dos parágrafos não realizada em fonte primária.
Os §§ 2º, 9º, 10 e 11 do art. 92 vieram da base verificada do escritório, sem
abertura do inteiro teor oficial do RICRPS nesta sessão.
```

DEPOIS desta atualização, a skill executa a cascata e, em 90% dos casos, REGISTRA APROVADO automaticamente. Apenas se TUDO falhar, emite o IMPORTANTE com detalhamento de todas as 4 fontes tentadas.

### Log Estruturado de Verificações

Toda revisão registra ao final.

```
[RELATÓRIO DE VERIFICAÇÃO DINÂMICA]
Total de citações analisadas. 23.
Verificadas no Nível 1 (repositório local). 18.
Verificadas no Nível 2 (WebFetch direto). 4.
Verificadas no Nível 3 (WebSearch + WebFetch). 1.
Verificadas no Nível 4 (Comet/Chrome). 0.
Não verificadas (após cascata). 0.
```

### Nível 1 - Existência

Antes de aceitar qualquer citação, conferir que o artigo, tema ou súmula EXISTE. Procedimento.

Para normas (CF, EC, LC, Lei, Decreto, IN, Portaria) catalogadas em `base-legislacao-fontes-primarias`, abrir o arquivo correspondente em `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/` (caminho Linux mount) ou `C:\Users\VAIO\INSS\base-legislacao\` (Windows). Buscar o artigo com Grep ou Read.

Para precedentes (Tema STF/STJ/TNU, súmula, enunciado CRPS, IRDR, IAC), acionar a skill `precedentes-previdenciarios` para verificação dinâmica.

Para doutrina, exigir referência completa (autor, obra, edição, página) e marcar como NÃO VERIFICADA se não for da lista de doutrinadores reconhecidos do escritório.

### Nível 2 - Vigência

Confirmar que o artigo, tema ou súmula está VIGENTE na data do caso concreto. Procedimento.

Para artigos, ler INTEIRO incluindo notas de rodapé. Verificar marcações de "Revogado pela Lei X.XXX" ou "Vide". Se revogado, alertar expressamente "O artigo X da Lei Y FOI REVOGADO pela Lei Z em ano W. Avaliar direito adquirido ou tempus regit actum se aplicável".

Para precedentes, verificar se houve OVERRULING (Tema 503/STF que superou desaposentação, Súmula 86/TNU cancelada em 26/08/2021, etc).

### Nível 3 - Redação Literal

A citação deve corresponder à redação ATUAL do artigo ou à tese fixada do precedente. Procedimento.

Copiar a redação EXATA do arquivo, sem paráfrase. Preservar marcação "Redação dada pela Lei X.XXX" entre parênteses.

Atenção a artigos com múltiplas redações sucessivas (cf. art. 103 da Lei 8.213/91 que tem 3 redações). Conferir qual versão é aplicável pelo tempus regit actum.

Para precedentes, transcrever a TESE LITERAL fixada no julgamento (não a ementa). Tese vem do dispositivo final do voto-vencedor.

### Nível 4 - Modulação

Verificar se há modulação temporal de efeitos. Procedimento.

Para artigos alterados por lei posterior, verificar se a alteração tem efeitos retroativos ou apenas prospectivos.

Para Temas STF/STJ/TNU, verificar se há ADI ou ADPF que modulou aplicação. Caso clássico. Tema 1102 STF (Revisão da Vida Toda) teve modulação em 2024.

Para artigos da EC 103/2019, atentar à data de promulgação (13/11/2019) como marco temporal.

### Nível 5 - Número de Processo e Precedente

Quando o artigo for citado em conjunto com precedente, verificar.

O número do tema/repetitivo/súmula está correto.
O órgão julgador está correto (STF, STJ, TNU, TRF).
A data de julgamento está correta.
O nome do relator está correto.
A tese fixada está corretamente parafraseada ou transcrita.
O número do REsp/RE/PEDILEF/AgInt corresponde ao tema.

Se QUALQUER destes elementos gerar dúvida, aplicar a REGRA DE COMET PARA JULGADOS COM DÚVIDA (Onda 65) e abrir o Comet via MCP para conferência direta no portal oficial do órgão. Nunca protocolar peça com precedente cuja veracidade não tenha sido confirmada em fonte primária.

Dado objetivo fabricado (número de processo, relator ou data sem origem verificável) é achado **BLOQUEANTE** automático e impede o protocolo da peça.

### Saída Antialucinação

A peça que cite norma ou precedente NÃO VERIFICÁVEL em fonte primária deve ser SUSPENSA até verificação. Não há tolerância para "achismo" jurídico no escritório Tercini.

## AGENTES DO PLUGIN NA REVISÃO (Onda 81)

A revisão aprofundada despacha duas frentes aos agentes do plugin, quando disponíveis na sessão.

Primeiro, a leitura adversária. Antes de fechar o relatório, despachar a peça, o inventário de provas com IDs, o CNIS e o histórico administrativo ao agente `base-conhecimento-inss:red-team-peticao`. Ele simula a contestação do INSS, a Procuradoria e o voto contrário, devolve fragilidades por severidade (FATAL, GRAVE, MEDIA, MENOR) com blindagem recomendada e veredito de protocolo. Os achados do agente entram no relatório desta skill com a severidade mapeada (FATAL vira BLOQUEANTE, GRAVE vira CRÍTICO, MEDIA vira IMPORTANTE, MENOR vira MENOR).

Segundo, a verificação de citações em lote. Quando a peça tiver três ou mais citações não confirmadas no catálogo local, despachar o lote ao agente `base-conhecimento-inss:verificador-precedentes`, que confere existência, vigência e tese literal em fonte oficial e devolve classificação por item. Dúvida isolada (uma ou duas citações) segue o fluxo normal dos Níveis 1 a 5 com a Regra de Comet.

Os agentes somente verificam e reportam, nunca editam a peça. Toda correção decorrente dos relatórios deles é aplicada pela sessão principal, com nota datada. Sem os agentes disponíveis na sessão, executar as duas frentes inline, com as mesmas regras.

## 5 CAMADAS DE REVISÃO

A profundidade da revisão se adapta ao tipo de peça (ver seção "Checklist por Rito" abaixo). Antes de iniciar, ler o arquivo `references/CHECKLIST-POR-CAMADA.md` para o detalhamento exaustivo.

### Camada 1 - Conformidade Formal

Verifica se a petição atende ao padrão visual e estrutural do escritório, conforme `peticao-previdenciaria` e `base-peticao-previdenciaria-padrao-visual` (Onda 29).

Itens auditados:
- Formato A4, margens 851/1134/1560/1134 twips.
- Bookman Old Style 12pt, espaçamento 1,5.
- Cabeçalho timbrado com logo (Bell MT 24pt, Arial Unicode MS).
- Títulos de seção em tabelas pretas com texto branco em negrito.
- Recuo de 2 cm (rito judicial) ou 4 cm (CRPS).
- Rodapé do escritório.
- **Proibição absoluta de dois-pontos lógicos** (não usar para introduzir explicações, listas, fundamentos, conclusões).
- Documentos referenciados por ID, não por "documento em anexo".
- Estrutura mínima da peça compatível com o rito.

### Camada 2 - Conformidade Normativa

Verifica fundamentação jurídica. Aciona automaticamente as skills relevantes como hub de integração.

Skills acionadas conforme tipo de peça.

- `base-legislacao-fontes-primarias` - verificação literal de artigos contra repositório verificado.
- `precedentes-previdenciarios` - vigência e tese literal de temas/súmulas.
- `base-tnu-admissibilidade-manual` - para PUIL/PEDILEF.
- `pedilef-cotejo-analitico-tnu` - cotejo analítico em duas etapas.
- `base-puil-pedilef-vedacao-materia-processual` - filtro Súmula 43/TNU.
- `tema-1124-instrucao-administrativa` - prévio requerimento administrativo.
- `base-efeito-translativo-tema-1124-defesa` - aplicação de ofício.
- `decadencia-revisao-previdenciaria` - art. 103 Lei 8.213/91.
- `ms-competencia-autoridade-coatora` e `base-ms-competencia-autoridade-coatora-inss-crps` - MS.
- `base-ms-cabimento-direito-liquido-certo` - cabimento MS.
- `documentos-comprobatorios-in128` - matriz probatória.
- `auditoria-ppp` - aposentadoria especial com PPP.
- `admissibilidade-barreiras-crps` - recurso CRPS.
- `recursos-superiores-crps` - recurso especial CRPS.
- `incidentes-instrucao-crps` - embargos CRPS.
- `lei-13460-usuario-servico-publico` - lei do usuário do serviço público.
- `reafirmacao-der` - DER reafirmada Tema 995/STJ.
- `analise-documental-incapacidade` - B31/B91/B94 Portarias 13, 14, 15/2026.
- `base-portarias-dpmf-inss-hub` - taxonomia das Portarias 990-996/2022 corrigida pela Onda 32.
- `base-cpc-honorarios-sucumbencia-previdenciaria` - Súmula 111/STJ e Tema 1050/STJ.
- `base-juros-correcao-monetaria` - Tema 810/STF e Tema 905/STJ.
- `tributacao-beneficios-previdenciarios` - IR sobre atrasados.
- `especificacao-provas` - réplicas e fase probatória.

A skill aciona APENAS as verificações pertinentes ao tipo de peça e ao caso concreto. Petição inicial JEF não aciona admissibilidade CRPS. Recurso ao CRPS não aciona tutela de urgência. PUIL aciona OBRIGATORIAMENTE base-tnu-admissibilidade-manual.

### Camada 3 - Coerência Fática

Cruza o conteúdo da petição com documentos anexados na conversa, CNIS quando disponível, processos administrativos e judiciais anteriores citados.

Verificações.

- Cada afirmação fática da petição tem suporte documental por ID.
- Datas, vínculos, valores e períodos consistentes.
- Documentos relevantes ignorados pela petição.
- Contradições entre afirmação da petição e documento.

**Validação rigorosa da classificação de fatos incontroversos.** Quando a petição contiver tabela de fatos (Componente Visual Law 3), verificar se cada fato classificado como "incontroverso" atende ao critério processual estrito.

Incontroverso é o fato que (a) não foi impugnado pela parte contrária, ou (b) decorre de documento objetivo irrefutável (CNIS, certidão oficial). Se o INSS NEGOU expressamente o fato em decisão administrativa, contestação ou manifestação processual, o fato NÃO é incontroverso.

Achado BLOQUEANTE para qualquer fato classificado como "incontroverso" que tenha sido impugnado pelo INSS. A correção é reclassificar como "controvertido" e indicar a impugnação do INSS.

### Camada 4 - Qualidade Argumentativa

Avalia força persuasiva e técnica argumentativa. Catálogo de 22 anti-patterns no arquivo `references/CATALOGO-ANTI-PATTERNS.md`.

Critérios principais (ver detalhamento exaustivo no catálogo):

1. Fundamentação principiológica sem ancoragem fática.
2. Pedidos sem correspondência com fatos narrados.
3. Argumentação repetitiva.
4. Ausência de confronto direto entre prova e tese.
5. Argumentação genérica (Regra Tipografia Jurídica).
6. Excesso de jurisprudência (Regra do limite de uma página).
7. Urgência sinalizada por formatação (Regra mostre-não-diga).
8. Títulos burocráticos genéricos.
9. Réplica como contestação da contestação.
10. Memorial com mais de duas páginas.
11. Excesso de destaques por página (Regra Von Restorff).
12. Latim desnecessário (Regra da Clareza).
13. Teste do leigo na parte fática.
14. **Cotejo analítico ausente em PUIL** (novo, derivado da Onda 30).
15. **Paradigma de TRF ou de STF em PUIL** (art. 14, §2º, Lei 10.259/2001; QO 48/TNU veda o paradigma do STF — auditoria 25/07/2026).
16. **Citação de Portaria 992/2022 como cálculo de RMI** (novo, derivado da Onda 32).
17. **Citação de Súmula 86/TNU como vigente** (novo, foi cancelada em 26/08/2021).
18. **Citação de tese de Revisão da Vida Toda sem mencionar a modulação** (novo).
19. **Pedido genérico de tutela sem demonstração concreta de urgência**.
20. **Petição sem seção de Efeitos Financeiros** (Tema 1124/STJ).
21. **Discussão de matéria processual em PUIL** (novo, derivado da Onda 30 - Súmula 43/TNU).
22. **Citação de norma sem leitura do arquivo verificado** (novo, anti-pattern anti-alucinação).

### Camada 5 - Integridade Probatória (NOVA)

Verifica se as provas no processo são adequadamente exploradas na peça.

Verificações.

- Cada documento juntado tem referência por ID na peça.
- Cada documento que sustenta uma tese é citado no momento da tese, não apenas listado.
- Documentos que enfraquecem a tese estão SENDO confrontados (não escondidos).
- Documentos pendentes de juntada estão sendo pleiteados.
- Pedidos de prova (perícia, testemunhas, ofícios) estão direcionados a fatos específicos.
- Em réplicas, a especificação de provas segue a técnica da skill `especificacao-provas`.
- CNIS cruzado com documentação comprobatória conforme `documentos-comprobatorios-in128`.

Esta camada é especialmente crítica em.

- Aposentadoria especial (cruzamento de PPP com LTCAT).
- BPC/LOAS (cruzamento de IFBrM/TCQ com prontuários).
- Reconhecimento de tempo rural (início de prova material + testemunhas).
- Reconhecimento de união estável (prova material + temporalidade).
- Incapacidade B31/B91/B94 (laudos médicos + análise documental Portarias 13-15/2026).

## CLASSIFICAÇÃO DE SEVERIDADE QUÁDRUPLA

**BLOQUEANTE** (novo nível, acima de CRÍTICO).

A peça NÃO PODE SER PROTOCOLADA. Risco de invalidade absoluta, denúncia em sede recursal pelo INSS, perda de objeto ou prejuízo irreversível ao segurado.

Exemplos.

- Citação de número de processo, súmula ou tema FABRICADO sem origem verificável.
- Contradição frontal entre afirmação da petição e CNIS ou documento juntado.
- Fato impugnado pelo INSS classificado como "incontroverso".
- Pedido principal incompatível com o rito processual (ex. MS pedindo concessão direta sem prévia análise administrativa quando o caso exige Tema 1124).
- Ação rescisória contra benefício do próprio segurado (caso paradoxal).

**CRÍTICO**.

Compromete a validade ou o resultado da peça se não corrigido.

Exemplos.

- Erro de competência territorial ou material.
- Precedente inexistente ou tese incorreta.
- Violação da política de tutela de urgência.
- Ausência de verificação do Tema 1124 quando aplicável.
- Autoridade coatora errada em MS.
- Pedido incompatível com o rito.
- PUIL com paradigma de TRF (art. 14, §2º, Lei 10.259/2001) ou do STF (QO 48/TNU).
- PUIL com tese inovadora não suscitada (QO 10/TNU).
- Memorial extraprocessual com mais de duas páginas (regra absoluta do escritório).
- Reafirmação da DER sem concordância formal do segurado.

**IMPORTANTE**.

Enfraquece a peça ou gera risco processual, mas não a invalida.

Exemplos.

- Tema aplicável não citado.
- Documento relevante não referenciado por ID.
- Prazo decadencial próximo do esgotamento sem alerta.
- Ausência de confronto entre prova e tese.
- Fundamentação principiológica sem ancoragem fática.
- Réplica respondendo ponto a ponto sem delimitação prévia.
- Argumentação genérica com superlativos sem fato concreto.
- Latim pedante.
- Linguagem técnica excessiva na seção fática.

**MENOR**.

Estilo ou forma. Não afeta o resultado, mas compromete o padrão do escritório.

Exemplos.

- Uso de dois-pontos fora de citação literal.
- Desvio de formatação.
- Referência genérica a "documentos em anexo".
- Repetição argumentativa.
- Excesso de destaques por página (Von Restorff).
- Títulos burocráticos genéricos.
- Excesso de jurisprudência transcrita por extenso.

## FORMATO DO RELATÓRIO

Estrutura padrão entregue após apresentação do .docx.

**Título.** "RELATÓRIO DE REVISÃO AUTOMÁTICA DA PETIÇÃO - V2 APROFUNDADA"

**Cabeçalho.** Tipo de peça, rito, data, link computer:// do arquivo.

**Resumo executivo.** Duas a três frases indicando o resultado geral, com contagem de achados por severidade. Se houver BLOQUEANTES, destacar no topo com selo "PEÇA NÃO DEVE SER PROTOCOLADA".

**Achados por camada.** Ordem (Formal → Normativa → Fática → Argumentativa → Integridade Probatória). Dentro de cada camada, ordenados por severidade decrescente (Bloqueante → Crítico → Importante → Menor).

**Modelo de achado individual.**

```
[BLOQUEANTE] Camada 2 - Conformidade Normativa
Citação fabricada. Tema 1.124/STJ atribuído a precedente sobre "prévio requerimento administrativo em aposentadoria especial". Verificação no repositório base-legislacao-fontes-primarias e em fonte primária mostra que o Tema 1124/STJ trata de outro tema. A citação não pode ser mantida.
Localização. Seção "DO DIREITO", terceiro parágrafo, página 4.
Correção sugerida. Verificar o tema correto que sustenta a tese pretendida ou suspender a citação.

[CRÍTICO] Camada 1 - Conformidade Formal
Competência territorial incorreta. A petição é dirigida à Subseção Judiciária de Catanduva, mas a qualificação do autor indica domicílio em Ribeirão Preto, que pertence à Subseção de Ribeirão Preto.
Localização. Endereçamento, página 1.
Correção sugerida. Redirecionar a peça à Subseção Judiciária de Ribeirão Preto.

[IMPORTANTE] Camada 5 - Integridade Probatória
Documento relevante não referenciado por ID. O CNIS (ID 13476890) confirma o vínculo em 03/2018 que sustenta a tese, mas a petição apenas menciona "conforme CNIS em anexo" sem ID.
Localização. Seção "DOS FATOS", quinto parágrafo.
Correção sugerida. Substituir por "conforme CNIS (ID 13476890)".

[MENOR] Camada 4 - Qualidade Argumentativa
Excesso de destaques. A página 6 contém 7 trechos em negrito fora de títulos e citações. Faixa ideal entre 2 e 3 negritos por página.
Localização. Página 6.
Correção sugerida. Manter negrito apenas em fatos-chave e elementos de prova.
```

**Quando não houver achados.** "Nenhum achado identificado. A petição está em conformidade com os padrões do escritório, com a legislação verificada no repositório base-legislacao-fontes-primarias, com os precedentes vigentes e com a coerência fático-probatória dos documentos disponíveis."

## Porta de qualidade das citações (Onda 96)

Nenhuma peça sai com precedente sem a marca [CONFERIDO] e a data da conferência. A revisão confere, item a item, se o precedente foi aberto na base oficial pelo Chrome conforme a skill `pesquisa-jurisprudencia-chrome`, se a tese citada corresponde à redação literal e se o status continua vigente. Divergência entre o que a peça afirma e o que a fonte diz é erro fatal, e a peça volta para correção antes do protocolo.

## RECEPÇÃO DOS ACHADOS COM RIGOR TÉCNICO (Onda 99)

Disciplina aplicada a TODO relatório crítico recebido, do agente `red-team-peticao`, do agente `verificador-precedentes`, desta própria revisão ou de terceiro (parecer, despacho de emenda, crítica do usuário). Importada do conceito de recepção de code review, e traduzida ao processo.

Primeira regra, nem concordância performática, nem implementação cega. Cada achado é VERIFICADO tecnicamente antes de aplicado. Achado de citação se confere na fonte, achado de fato se confere no documento por ID, achado de direito se confere na norma ou no catálogo. Acatar sem conferir apenas troca o erro de lugar.

Segunda regra, achado incorreto se refuta por escrito, com a evidência. O relatório de revisão registra o achado, a verificação feita e a razão da recusa. Recusa sem evidência não existe, e acatamento sem verificação também não.

Terceira regra, achado correto se aplica na CAUSA RAIZ, não no sintoma. Se o red-team apontou citação divergente em um parágrafo, a correção varre a peça inteira atrás da mesma citação, e o catálogo atrás da mesma divergência. Corrigir só o ponto apontado deixa os irmãos do erro vivos.

Quarta regra, conflito entre achados se resolve pela hierarquia de fontes, fonte primária vence catálogo, catálogo vence memória, e nada vence o documento dos autos quanto aos fatos do caso.

Quinta regra, a decisão estratégica é do advogado. Achado que recomenda abandonar tese defensável ou alterar o mérito do pedido vai ao usuário em destaque, nunca se executa em silêncio.

## FLUXO PÓS-REVISÃO

Se houver achados BLOQUEANTES, alertar.

"A peça contém [N] achados BLOQUEANTES que IMPEDEM o protocolo. Antes de qualquer correção automática, é necessário discutir a estratégia de cada item, pois pode haver impacto material no resultado pretendido. Posso detalhar cada bloqueio?"

Se houver achados CRÍTICOS, IMPORTANTES ou MENORES sem BLOQUEANTES, perguntar.

"Foram identificados [N] achados ([X] críticos, [Y] importantes, [Z] menores). Deseja que eu gere uma versão corrigida automaticamente? Posso também tratar apenas dos críticos."

Aguardar resposta. Se autorizado, gerar nova versão do .docx aplicando as correções e apresentar o arquivo corrigido. Se autorizado tratar apenas críticos, perguntar se também deseja sugestões para os demais.

## CHECKLIST POR RITO

Ver detalhamento completo em `references/CHECKLIST-POR-RITO.md`. Resumo abaixo.

**JEF.** Revisão enxuta. Tolerar peças curtas. Flagrar excesso de fundamentação como MENOR. Verificar valor da causa (limite 60 SM).

**Rito ordinário federal.** Revisão completa. Esgotamento dos fundamentos normativos. Verificar reexame necessário (Súmula 490/STJ).

**CRPS.** Revisão completa. Verificações específicas de admissibilidade e processo administrativo. Recuo de 4 cm.

**Mandado de segurança.** Verificação obrigatória de cabimento, direito líquido e certo, autoridade coatora, competência territorial, prazo decadencial de 120 dias (art. 23 Lei 12.016/2009), pedido liminar e fundamentos no acordo do RE 1.171.152/STF (ex-Tema 1066, cancelado em 22/02/2021) se houver demora administrativa.

**PUIL/PEDILEF (TNU).** Verificação obrigatória das 4 hipóteses de cabimento (art. 12 §1º RITNU), paradigma válido (não TRF/STF/TST/TSE - QO 48), cotejo analítico em duas etapas, prequestionamento (QO 10/35/36 + Súmulas 282/356 STF + art. 1.025 CPC), não incidência das Súmulas 42/TNU (reexame fato) e 43/TNU (matéria processual), dialeticidade. Acionar OBRIGATORIAMENTE `base-tnu-admissibilidade-manual` e `pedilef-cotejo-analitico-tnu`.

**Réplica.** Estrutura de delimitação de pontos controvertidos/incontroversos (seção 1) + réplica compartimentalizada (seção 2) + reconsideração de tutela quando aplicável (seção 3) + pedidos de prova direcionados (seção 4). Tabela de fatos com colunas "Fato alegado", "Impugnação pelo INSS", "Situação processual".

**Memorial.** Limite de duas páginas (CRÍTICO se exceder). Framework EVO. Apenas elementos essenciais (questão central, fundamento para reforma, provas e resultados, pedido final).

**Petição administrativa de cumprimento de exigência (B31/B91/B94).** Mapeamento de cada inciso do art. 2º das Portarias 13 ou 15/2026 ao documento correspondente. Distinção "documentação médica" vs "documento médico". Conclusão pede prosseguimento da análise (B31/B91) ou agendamento de perícia presencial (B94).

**Cumprimento de sentença.** Verificação de cálculos, juros e correção (Tema 810/STF, Tema 905/STJ, EC 113/2021 SELIC), honorários (Súmula 111/STJ, Tema 1050/STJ, art. 85 §11 CPC), IR sobre atrasados (Tema 368/STF, RRA art. 12-A Lei 7.713), destaque de honorários (art. 22 §4º EAOAB), dialeticidade recursal.

## VERIFICAÇÕES AUTOMÁTICAS OBRIGATÓRIAS (PREFERÊNCIAS DO ESCRITÓRIO)

Toda revisão DEVE executar as verificações abaixo, conforme política consolidada do escritório.

1. **Competência territorial e material em toda petição inicial e MS.** Cruzar com domicílio do autor e foro pessoal. Acionar `ms-competencia-autoridade-coatora` para MS.

2. **Política de tutela de urgência em toda petição inicial.** Verificar conformidade com a política do escritório sem necessidade de instrução expressa.

3. **Tema 1124/STJ em toda petição de concessão ou revisão.** Verificar prévio requerimento administrativo. Alertar para risco de extinção sem mérito.

4. **Prazo decadencial em toda análise de revisão de benefício já concedido.** Art. 103 Lei 8.213/91. Acionar `decadencia-revisao-previdenciaria`. Alertar quando a menos de 12 meses do esgotamento.

5. **Documentação comprobatória conforme IN 128/2022.** Acionar `documentos-comprobatorios-in128` como fonte primária.

6. **BPC para menores de 16 anos.** Aplicar critérios diferenciados de avaliação funcional e IFBrM.

7. **Tempestividade em toda análise de fase recursal.** Verificar prazo e alertar se houver risco de intempestividade ou dados insuficientes.

8. **Cruzamento de CNIS com documentação.** Quando CNIS for apresentado com outros documentos, cruzar automaticamente identificando divergências, vínculos ausentes, indicadores de pendência e períodos sem cobertura.

9. **Referência por ID em PJe.** Toda afirmação fática deve remeter ao ID. Vedado "conforme documentos em anexo".

10. **Cálculos previdenciários.** NÃO realizar cálculo de RMI ou renda mensal sem dados completos do CNIS. Indicar exatamente quais informações faltam.

## INTEGRAÇÃO COM OUTRAS SKILLS DO PLUGIN

Esta skill é HUB de integração e DEVE acionar.

- Agente `red-team-peticao` para a leitura adversária da peça (Onda 81).
- Agente `verificador-precedentes` para lotes de três ou mais citações não confirmadas (Onda 81).
- `base-legislacao-fontes-primarias` antes de validar qualquer citação de norma.
- `base-tnu-admissibilidade-manual` em qualquer peça destinada à TNU.
- `pedilef-cotejo-analitico-tnu` em PUIL/PEDILEF.
- `base-puil-pedilef-vedacao-materia-processual` para o filtro Súmula 43/TNU.
- `precedentes-previdenciarios` antes de validar qualquer precedente.
- `tema-1124-instrucao-administrativa` em concessão ou revisão.
- `decadencia-revisao-previdenciaria` em revisão de benefício concedido.
- `ms-competencia-autoridade-coatora` em MS.
- `documentos-comprobatorios-in128` para matriz probatória.
- `base-portarias-dpmf-inss-hub` para validar referências a Portarias 990-996/2022.
- `reafirmacao-der` em concessão com requisitos completados após DER.
- `analise-documental-incapacidade` em B31/B91/B94.
- `auditoria-ppp` em aposentadoria especial.
- `base-cpc-honorarios-sucumbencia-previdenciaria` para honorários.
- `base-juros-correcao-monetaria` para juros e correção.
- `tributacao-beneficios-previdenciarios` para IR sobre atrasados.

A revisão NÃO substitui a análise individual de cada skill. Funciona como VERIFICAÇÃO de que as skills relevantes foram corretamente aplicadas durante a geração da peça. Se identificar que skill relevante não foi consultada, o achado deve indicar EXPRESSAMENTE qual skill deveria ter sido acionada.

A revisão NÃO REALIZA cálculos previdenciários. Apenas verifica consistência com dados do CNIS e documentos.

## EVOLUÇÃO COM O TEMPO

Esta skill deve evoluir conforme novos achados sistêmicos forem identificados. Sempre que uma nova falha for descoberta em peça já protocolada, esta skill deve ser atualizada para incluir o novo anti-pattern, e a Onda Corretiva correspondente deve ser executada para varrer o plugin inteiro.

Histórico de evolução.

- **V1 (escritório).** 4 camadas, 3 severidades, 13 anti-patterns.
- **V2 (plugin Onda 33).** 5 camadas (adiciona Integridade Probatória), 4 severidades (adiciona BLOQUEANTE), 22 anti-patterns, integração com Manual TNU, fontes primárias verificadas e taxonomia das Portarias.

## LIMITAÇÃO CONHECIDA

Esta skill depende da disponibilidade do workspace `INSS\base-legislacao\` para a verificação literal de artigos. Em sessões sem o workspace, a skill ainda funciona mas marca a verificação literal como NÃO REALIZADA, recomendando WebFetch direto das URLs oficiais do Planalto registradas no índice da skill `base-legislacao-fontes-primarias`.

Em casos de divergência entre a interpretação desta skill e a skill `revisao-peticao` do escritório, esta versão APROFUNDADA prevalece, pois incorpora as Ondas 30, 31 e 32 do plugin.
