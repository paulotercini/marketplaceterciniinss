---
name: base-ms-decadencia-omissao-demora
description: "Decadência em mandado de segurança previdenciário (art. 23 Lei 12.016/2009), prazo de 120 dias, termo inicial em ato comissivo e omissivo, renovação em omissão, Súmula 632 STJ, demora INSS e duração razoável do processo administrativo pelo Tema 1066 STF. Use SEMPRE que mencionar decadência em MS, prazo 120 dias, art. 23 Lei 12.016, termo inicial MS, ato comissivo, ato omissivo, renovação em omissão, Súmula 632 STJ, demora INSS MS, Tema 1066 STF, duração razoável PA, art. 49 Lei 9.784/1999, Lei 13.460/2017, paralisação administrativa. Cruza com mandado-seguranca-previdenciario, ms-competencia-autoridade-coatora, base-ms-cabimento-direito-liquido-certo, base-ms-competencia-autoridade-coatora-inss-crps e lei-13460-usuario-servico-publico."
---

# Decadência e Omissão em MS Previdenciário

## Escopo

Skill pró-segurado sobre decadência (art. 23 Lei 12.016/2009), termo inicial em ato comissivo e omissivo, renovação em casos de omissão e demora do INSS.

## Marco normativo central

Lei 12.016/2009, art. 23. Decadência 120 dias.

Lei 9.784/1999, art. 49. Prazo de decisão administrativa.

Lei 13.460/2017, art. 7º. Usuário.

Lei 8.213/91, art. 52.

## Marco jurisprudencial

### Súmula 632 STJ

Decadência e suspensão.

Fonte oficial em https://www.stj.jus.br

### Tema 1066 STF

Duração razoável do PA.

Fonte oficial em https://portal.stf.jus.br

### Tema 374 STF

Foro.

## Regra geral

Primeiro, 120 dias da ciência do ato impugnado.

Segundo, prazo decadencial, não suspende nem interrompe.

Terceiro, para ato omissivo renova enquanto persiste.

## Termo inicial

Em ato comissivo, da ciência do ato.

Em ato omissivo, o prazo renova enquanto não houver ato.

Em pedido administrativo sem resposta, a omissão é permanente. A decadência não fulmina o MS.

## Cenários pró-segurado

Cenário A, negativa formal em PA. 120 dias da intimação.

Cenário B, demora em PA sem negativa formal. Sem decadência.

Cenário C, arquivamento sem fundamentação. 120 dias da ciência.

Cenário D, acórdão CRPS não cumprido. Ato omissivo. Sem decadência.

Cenário E, exigência abusiva persistente. Ato continuado.

## Prazos administrativos

Primeiro, Lei 9.784/99, art. 49. 30 dias, prorrogáveis por mais 30.

Segundo, Lei 13.460/2017. Prazo de resposta.

Terceiro, na ausência de resposta, caracteriza omissão.

## Alertas

Primeiro, cuidado com a contagem da decadência em ato comissivo. Preservar prazo.

Segundo, em ato de trato continuado, o MS é cabível enquanto persistir.

Terceiro, MS preventivo não tem decadência, mas exige iminência.

Quarto, em pedido administrativo pendente há mais de 90 dias, impetrar é estratégico antes de perder janela.

## Doutrina de apoio

Hely Lopes Meirelles, Arnoldo Wald, Gilmar Ferreira Mendes.

Cassio Scarpinella Bueno.

Marco Aurélio Serau Junior.

José Antonio Savaris.

IBDP.

## Integração com outras skills

Para cabimento, acionar `base-ms-cabimento-direito-liquido-certo`.
Para autoridade coatora, acionar `base-ms-competencia-autoridade-coatora-inss-crps`.
Para detalhes processuais, acionar `mandado-seguranca-previdenciario`.
Para Lei 13.460, acionar `lei-13460-usuario-servico-publico`.
Para diagnóstico da mora via sistemas administrativos (PAT, Meu INSS, INFBEN) antes de impetrar, acionar `base-meu-inss-pat-gerid-fluxo`.
Para identificar mora em pedido de aposentadoria pendente em carteira potencial, acionar `base-aposentadoria-futura-pipeline`.
Para fluxo de delegação do monitoramento de prazos administrativos a Amanda, acionar `processos-amanda-administrativo`.
Para erro material com pedido de revisão administrativa anterior ao MS, acionar `base-erro-administrativo-iea-13975`.

## Volume operacional no escritório

A auditoria de carteira de tarefas no Microsoft To Do identificou 50 mandados de segurança em tarefas abertas, distribuídos em 🌻 INSS (6), 🖥 Conselho de Recursos (20), 👪 Judicial (14) e demais. O MS por mora é instrumento processual recorrente no escritório, sendo a forma mais frequente de pressionar o INSS quando o protocolo passa de 60 dias sem decisão.

Critério prático para impetração:

Primeiro, requerimento administrativo protocolado há mais de 45 dias sem decisão e sem exigência pendente, configurando inércia administrativa. Skill `base-meu-inss-pat-gerid-fluxo` orienta a verificação no PAT.

Segundo, pedido com exigência cumprida e o INSS continua sem decidir após 30 dias da resposta. Caracteriza nova rodada de mora.

Terceiro, acórdão CRPS favorável ao segurado mas o INSS não cumpre a decisão. Mora absoluta. MS de cumprimento via `base-ms-cumprimento-inss`.

Quarto, exigência abusiva e persistente, em que o INSS pede documentação impossível ou já apresentada, caracterizando ato comissivo continuado.

Antes de impetrar, sempre tentar provocação administrativa pela Ouvidoria/CGU/FALA.BR (skill `base-canais-falabr-corregedoria-cgu`), gerando registro de tentativa amigável que reforça a mora caracterizada quando o MS for ajuizado.

Após decisão favorável no MS, o cumprimento da ordem é monitorado pela `base-meu-inss-pat-gerid-fluxo` (HISCRE para implantação, PAT para confirmação administrativa).

## O que NÃO está nesta skill

Cabimento geral em `base-ms-cabimento-direito-liquido-certo`. Liminar em `base-ms-liminar-art7-iii`. Cumprimento em `base-ms-cumprimento-inss`.
