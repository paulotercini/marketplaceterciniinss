---
name: base-especial-vibracao
description: "Base de teses pró-segurado sobre vibração em aposentadoria especial. Use SEMPRE que mencionar vibração, vibração ocupacional, vibração de corpo inteiro, VCI, vibração mão-braço, VMB, motorista de caminhão, caminhoneiro, motorista de ônibus, tratorista, operador de máquina pesada, britadeira, retroescavadeira, rompedor, motosserra, bate-estacas, Parecer 00212/2024 CONJUR-MTP, NHO-09, NHO-10, ISO 2631, ISO 5349, Fundacentro, A(8), aren, VDV, Anexo 8 NR-15, Decreto 2.172/97, Decreto 3.048/99 Anexo IV, IAC 5 TRF4, Tema 298 TNU, Tema 211 TNU, Tema 213 TNU, Tema 1090 STJ, dosimetria vibração, limites de exposição, Frederico Amado, Hugo Goes, Fábio Zambitte, Wladimir Novaes, IBDP. Traz critérios metrológicos, refutação de exigência indevida e roteiro pró-segurado. NÃO use para ruído, químicos ou biológicos. Cruza com auditoria-ppp, tempo-especial-peticoes-por-rito, peticao-previdenciaria e base-especial-epi."
---

# Base Temática. Vibração em Aposentadoria Especial

## Escopo

Skill de referência exclusiva para defesa do segurado exposto a vibração ocupacional, tanto de corpo inteiro quanto de mão-braço, em aposentadoria especial. Complementa `auditoria-ppp`, `base-especial-epi` e `peticao-previdenciaria`. Não trata de ruído, agentes químicos ou biológicos.

## Postura

Exclusivamente pró-segurado. A skill rejeita a alegação adversária de ausência de parâmetro quantitativo e opera com a inversão do ônus da prova em caso de PPP omisso.

## Fluxo de trabalho

1. Leia este SKILL.md integralmente
2. Leia `references/FUNDAMENTOS-E-CENARIOS.md` para o marco normativo, NHO-09, NHO-10, Anexo 8 da NR-15, ISO 2631 e ISO 5349, e os cenários por função
3. Leia `references/JURISPRUDENCIA-E-REFUTACAO.md` para teses verificadas e contra-argumentação ao INSS
4. Ao redigir peça, acione `peticao-previdenciaria`
5. Ao auditar o PPP concreto, acione `auditoria-ppp`
6. Ao impugnar alegação de EPI eficaz, acione `base-especial-epi`

## Síntese pró-segurado

A aferição da vibração ocupacional é normatizada pela NHO-09 (vibração de corpo inteiro) e pela NHO-10 (vibração mão-braço) da Fundacentro, com base nas normas ISO 2631 e ISO 5349. Os Decretos 2.172/97 e 3.048/99 não trazem limites numéricos expressos para vibração, o que historicamente gerou controvérsia administrativa. O Parecer 00212/2024 CONJUR-MTP consolidou a posição favorável ao uso da NHO-09 e NHO-10 como parâmetros técnicos, com acolhimento pela TNU em superação da antiga tese de ausência de limite.

O Tema 211 TNU firma que a habitualidade não exige permanência contínua. O Tema 213 TNU impõe standard probatório atenuado para o segurado. O Tema 1090 STJ afasta o efeito neutralizante do EPI em hipóteses excepcionais, aplicáveis à vibração quando houver comprovação de ineficácia real.

## Regras rígidas de redação

Primeiro, ausência absoluta de dois-pontos como separador lógico.

Segundo, nunca admitir que a ausência de limite expresso nos Decretos 2.172/97 e 3.048/99 afasta o enquadramento. A remissão à NR-15 e às NHO da Fundacentro é pacífica.

Terceiro, jurisprudência somente após verificação em fonte primária oficial.

Quarto, quando o PPP for omisso, acionar `retificacao-ppp` e Tema 213 TNU para inversão do ônus.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## Doutrina reconhecida

Frederico Amado, em Direito Previdenciário, sustenta o uso das NHO da Fundacentro como critério técnico-legal para vibração. Hugo Goes, em Manual, reforça que a ausência de limite numérico no regulamento previdenciário não pode prejudicar o segurado. Fábio Zambitte Ibrahim, em Curso, defende a integração sistemática com a NR-15. Wladimir Novaes Martinez enfrenta a dinâmica do risco em motoristas, tratoristas e operadores de máquinas. O IBDP, em teses institucionais, sustenta a superação de barreiras metrológicas indevidas, com ônus probatório invertido em favor do segurado.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

## Integração com outras skills

Ao redigir peça, acione `peticao-previdenciaria`.
Ao auditar PPP, acione `auditoria-ppp`.
Ao refutar EPI eficaz, acione `base-especial-epi`.
Ao discutir cerceamento de defesa por ausência de perícia, acione `defesa-probatoria-especial`.
Ao verificar precedentes vinculantes, acione `precedentes-previdenciarios`.
Ao pedir retificação do PPP à empresa, acione `retificacao-ppp`.

## O que NÃO está nesta skill

Não há regras sobre ruído, eletricidade, periculosidade, calor, químicos ou biológicos. Cada um tem skill específica.
