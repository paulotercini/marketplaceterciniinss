---
name: base-protocolo-operacional-escritorio
description: "Protocolo operacional VINCULANTE do escritório Paulo Roberto Tercini Filho, aplicável a TODA sessão. Use SEMPRE ao registrar atendimento no To Do, ao fechar parecer ou relatório, ao partir de Modelo Ouro, ao ler documento recebido, ao calcular tempo, RMI ou valor da causa, e ao pesquisar na web. Gatilhos. Tarefa Nome CPF, anotação (C) no To Do, próximo passo recomendado, pendências em aberto, Modelo Ouro 2.0, Análise da Vida Completa, documento por ID no PJe, Prévius, subpasta Claude do cliente, SearXNG, crawl4ai, fonte oficial arquivada. Nove regras. To Do como registro oficial sem editar entrada existente. Fechamento com próximo passo e pendências. Peça a partir do Modelo Ouro. Parecer de uma página. Leitura integral com OCR e auditoria ponto a ponto. Cálculo é do Prévius. Skills centrais obrigatórias, com dados de cliente jamais em skill ou memória. Pesquisa em fonte oficial com inteiro teor. Rigor de fonte também fora do previdenciário. Espelho do CLAUDE.md do workspace."
---

# Protocolo Operacional do Escritório

Anexo operacional VINCULANTE do escritório Paulo Roberto Tercini Filho (OAB/SP 331.110). Aplica-se a TODA sessão. Vigente desde 05/09/2026 (Onda 123).

Esta skill é o espelho VERSIONADO do `CLAUDE.md` que fica na pasta de trabalho do escritório. O CLAUDE.md garante a aplicação automática em cada sessão. Esta skill garante o versionamento, a distribuição junto com o plugin e a consulta pelos agentes. Divergindo os dois, prevalece o mais recente, e a correção do outro é imediata.

Este anexo NÃO substitui as constraints permanentes do escritório. Atuação exclusiva pelo segurado do INSS, rigor absoluto de verificação com "Não localizado" quando não houver confirmação oficial, vedação de dois-pontos para introduzir explicação, lista ou complemento lógico, e sigilo dos dados de cliente.

---

## 1. Microsoft To Do é o registro oficial de atendimentos

Tarefa no padrão `Nome #CPF` com onze dígitos.

NUNCA editar nem apagar entrada existente. O histórico é registro, não rascunho.

A conclusão do Claude entra como `(C)` no TOPO das Notes, com duas a três linhas, texto acentuado. Gravou, releia a tarefa e confirme que gravou. Gravação não confirmada é gravação não feita.

ANTES de processar um cliente, buscar TODAS as tarefas dele em TODAS as listas. Um cliente com vários pedidos simultâneos tem tarefas em listas distintas, e isso é intencional. Não deduplicar.

`(C)` da mesma data se COMPLEMENTA, nunca se refaz.

## 2. Fechamento obrigatório de parecer e relatório

Todo parecer e todo relatório terminam com duas seções, nesta ordem.

**Próximo passo recomendado.** Um de três estados. `Pronto para /inicial`, `Pronto para /inicial-inss`, ou `Aguardando`, e neste caso nomeando exatamente o que falta.

**Pendências em aberto.** Carregada de uma rodada para a outra. Pendência que sai da lista sem ter sido resolvida é pendência perdida.

## 3. Toda peça parte do MODELO OURO

Origem no Drive, pasta Modelos Ouro 2.0. Não havendo modelo do tipo, usar o mais próximo e SINALIZAR expressamente qual foi usado e por quê.

Documento formal em .docx no padrão `base-peticao-previdenciaria-padrao-visual`.

No PJe, documento SEMPRE referenciado por ID. Nunca "conforme anexo", nunca "documento em anexo".

Procuração, RAC e formulários saem dos modelos vivos do Drive, não de reconstrução.

## 4. Parecer

Parecer em .docx de ATÉ UMA PÁGINA, salvo na subpasta Claude do cliente.

Exceção com formato próprio. Aposentadoria com PPP, caso rural e processo judicial seguem a **Análise da Vida Completa**, com conclusão no topo, vida contributiva em ordem cronológica, contagem e caminhos ranqueados em a, b e c.

## 5. Documento recebido é lido na íntegra

Leitura integral, com OCR em português quando necessário, e análise crítica. Nunca leitura por amostragem.

Em processo administrativo de incapacidade ou de auxílio-acidente, LOCALIZAR a perícia médica federal e a decisão, extraindo NB, data e o motivo EXATO.

Laudo pericial, PPP e documentos rurais passam por auditoria ponto a ponto ANTES de qualquer peça.

## 6. Cálculo é do Prévius

Cálculo de tempo, RMI e valor da causa é do Prévius. Não estimar, não improvisar.

Sem CNIS completo, NÃO calcular. Apontar o que falta.

Antes de pedir o print do Prévius, PROCURAR na pasta do cliente. Pedir o que já está lá desgasta.

## 7. Skills centrais, acionamento obrigatório

`base-precedentes-catalogo-vinculantes` antes de citar qualquer precedente.
`base-cnis-acerto-indicadores` em todo CNIS, com o agente `analista-cnis`.
`base-documentos-comprobatorios-in128` para checklist documental.
`base-revisao-peticao-aprofundada` em toda peça.
`base-peticao-previdenciaria-padrao-visual` para .docx.
`base-ms-cabimento-direito-liquido-certo` e `base-ms-competencia-autoridade-coatora-inss-crps` em mandado de segurança.
`base-validacao-formal-laudo-medico-checklist-ab` e `base-modelo-relatorio-medico-*` em laudos.
`base-calculo-rmi-ec103` em cálculo.
`ponte-workflow-*` para orquestração.
`auditoria-citacoes` para manutenção da base.

Achado que se REPETE gera sugestão de skill nova.

Dados de cliente NUNCA entram em skill nem em memória permanente.

## 8. Pesquisa na web

Pesquisar pelo navegador conectado SEM pedir permissão, abrindo a FONTE OFICIAL e arquivando o inteiro teor.

Cadeia de ferramentas, nesta ordem de preferência. SearXNG via crawl4ai (`http://host.docker.internal:8080/search?q=TERMOS&format=json`). Firecrawl como reserva. Extração de páginas, prints e PDFs pelo conector crawl4ai.

Nota de realidade. A disponibilidade dos conectores VARIA por sessão, e alguns caem no meio do trabalho. Caindo a cadeia acima, seguir pelo navegador conectado (Claude in Chrome) e registrar no relatório qual via foi usada. O que não muda é a exigência de fonte oficial e de arquivamento do inteiro teor.

Mapa de acesso já conhecido. Abrem no sandbox o CJF, o Planalto, o `portal.stf.jus.br` e o `processo.stj.jus.br/repetitivos`. O SCON do STJ, o TRF3 e o `in.gov.br` exigem o navegador. O `portalin.inss.gov.br` traz a IN 128 consolidada com carimbo de atualização.

## 9. Consultas fora do previdenciário

Consultas de saúde do Paulo recebem terminologia técnica, verificação em BULA BRASILEIRA e pesquisa aprofundada. Sem simplificação e sem generalidade.

Decisão clínica continua sendo do profissional que acompanha, e a informação técnica serve para qualificar a conversa com ele, não para substituí-la.

Temas fora do previdenciário também exigem informação VERIFICADA. O rigor de fonte não é regra do direito previdenciário, é regra da casa.
