---
name: auditoria-citacoes
description: Auditoria de veracidade das citações (Temas, Súmulas, Enunciados) nas skills da base e nos Modelos Ouro 2.0, cruzando com o catálogo interno e a fonte oficial, com correção do sanável e relatório por severidade. Use quando o Paulo pedir para averiguar/verificar a veracidade das skills ou dos modelos ouro, auditoria de citações, conferência de jurisprudência em massa, ou periodicamente como manutenção da base.
---

Audite a veracidade das citações da base de conhecimento e dos Modelos Ouro 2.0.
Leia ANTES o `CLAUDE.md` (honestidade radical; jurisprudência só `[CONFERIDO]`;
pesquisa na web; estilo). O princípio é o da `base-revisao-peticao-aprofundada`,
anti-alucinação com autocorreção do sanável e sinalização do resto.

## 1. Varredura mecânica (determinística, sem subagente)

- `python3 auditoria_citacoes.py skills` — varre as skills e grava
  `/tmp/auditoria/achados_skills.json`.
- `python3 auditoria_citacoes.py modelos --baixar` — baixa os Modelos Ouro 2.0
  do Drive e grava `achados_modelos.json` + `modelos_corpo.json` (só o que está
  NO CORPO, fora das seções "A CONFERIR — NÃO USAR" e "DEFESA ANTECIPADA").
- O script ignora o que já tem nota de auditoria/quarentena no próprio texto e o
  que consta do `CATALOGO-COMPLEMENTAR-VERIFICADO.md`.

## 2. Triagem dos achados (o que cada status significa)

- **CANCELADO / SUSPENSO / SEM_TESE / AGUARDANDO citados como vigentes** — erro
  confirmado, corrigir SEMPRE (expurgar ou anotar o status, reancorando o ponto
  em lei ou precedente `[CONFERIDO]`). Exemplo histórico, Tema 1066/STF.
- **NAO_CATALOGADO_NA_CORTE** — o número existe no catálogo em OUTRA corte;
  suspeita de homônimo trocado. Comparar o teor citado com o homônimo; batendo,
  é ERRO DE CORTE (corrigir a corte). Não batendo, verificar na web se existe na
  corte citada com aquele teor.
- **NAO_CATALOGADO** — não significa falso (o catálogo é curado e mínimo).
  Priorizar os mais citados e verificar na fonte oficial.
- **JULGADO_TESE_A_CONFIRMAR** — informativo (ex.: Tema 1124/STJ); só conferir
  se o texto não afirma tese literal como fixada.

## 3. Verificação na fonte oficial (subagentes por lote)

- Ordem das fontes: catálogo interno → WebSearch (tribunal na query) → WebFetch
  na fonte oficial. **Abrem**: CJF (temas e súmulas da TNU), STF às vezes,
  Planalto. **Bloqueiam** (403/503): STJ SCON, TRF3, eproc TNU, LexML.
- Vereditos por item: `CONFIRMADO_FONTE_OFICIAL` (com redação literal + link),
  `CONFIRMADO_FONTE_SECUNDARIA` (provável, conferir), `DIVERGENTE` (o número
  existe mas trata de OUTRO assunto — na prática citação errada, corrigir) e
  `NAO_LOCALIZADO` (suspeita de invenção, destacar).
- Os `CONFIRMADO_FONTE_OFICIAL` entram no
  `base-precedentes-catalogo-vinculantes/references/CATALOGO-COMPLEMENTAR-VERIFICADO.md`
  (redação literal, data e link; NUNCA incluir os prováveis com redação
  afirmada). Isso encerra a quarentena recorrente do item.

## 4. Correção (autocorrigir o sanável)

- **Número trocado** — substituir pelo número certo quando identificado (ex.:
  "Tema 327/STF" do teto é o Tema 76/STF); sem identificação, remover o número e
  marcar "precedente a confirmar na fonte", reancorando em lei.
- **Tese divergente que muda a orientação ao cliente** (ex.: Tema 692/STJ
  determina a devolução; Tema 382/TNU vedou a via qualitativa do tolueno) —
  corrigir para a tese REAL, reposicionar como tese adversa a contornar e
  SINALIZAR ao Paulo em destaque (mérito é decisão dele).
- Em toda edição, nota curta "(auditoria DD/MM/AAAA)"; preservar o resto do
  arquivo; estilo do escritório (sem travessão, sem dois-pontos lógico).
- **Modelos Ouro**: a disciplina é citação `[CONFERIDO]` só no corpo; o resto
  vive na quarentena. Vazamento real no corpo corrige-se in-place no Drive
  (`gdrive_client.update_media`), sem duplicar arquivo.

## 5. Porta de qualidade e entrega

- Reconferir por grep que os números corrigidos não sobraram com o teor errado.
- Rodar de novo o passo 1 e comparar a contagem (deve cair).
- **Commit + push** das skills alteradas (mensagem descrevendo os pares
  corrigidos). Modelos vivem no Drive, não entram no git.
- Relatório final por severidade: erros confirmados corrigidos (número trocado,
  status ignorado, vazamento no corpo), itens catalogados no complementar,
  suspeitas destacadas e o que depende de decisão do Paulo.

## Regras

- NUNCA inventar redação de tese; copiar literal da fonte ou não escrever.
- Citação divergente NUNCA se mantém "por precaução"; corrige-se ou remove-se
  com nota, reancorando em lei.
- Portais bloqueados registram-se com honestidade; item sem fonte oficial fica
  como pendente, sem redação afirmada.
- Toda saída em português do Brasil com acentuação correta.

## Dependências

`auditoria_citacoes.py` (raiz do repo), `gdrive_client.py`/`gdrive_download.py`
com token válido (para os modelos), catálogo em
`base-precedentes-catalogo-vinculantes/references/` (CATALOGO-* e
CATALOGO-COMPLEMENTAR-VERIFICADO.md), WebSearch/WebFetch para a fonte oficial.
