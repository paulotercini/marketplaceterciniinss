# Protocolo de Verificação Dinâmica em Fonte Primária

Protocolo automatizado para verificação literal de artigos, parágrafos, incisos, enunciados, súmulas e precedentes citados em peças previdenciárias. Substitui o protocolo passivo (que emitia achado IMPORTANTE pedindo verificação manual) por protocolo ATIVO em cascata que esgota todas as fontes disponíveis ANTES de qualquer alerta ao usuário.

Criado na Onda 36 (v1.26.0) para eliminar dependência do usuário em verificações que o próprio Claude pode realizar autonomamente.

## PRINCÍPIO OPERACIONAL

Quando a skill `base-revisao-peticao-aprofundada` encontrar uma citação que precisa ser verificada, NÃO emite mais o achado "verificação não realizada". Em vez disso, ACIONA AUTOMATICAMENTE o protocolo em cascata abaixo.

A verificação só é REPORTADA como pendente em três cenários extremos.

1. Todas as 4 fontes da cascata falharam.
2. A URL oficial está fora do ar.
3. O conteúdo retornado pela fonte é manifestamente diferente do citado (achado BLOQUEANTE).

## CASCATA DE VERIFICAÇÃO EM 4 NÍVEIS

### Nível 1 - Repositório Verificado Local

Buscar o artigo nos 19 arquivos do repositório `base-legislacao-fontes-primarias` em `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/` ou `C:\Users\VAIO\INSS\base-legislacao\`.

Para PRECEDENTES (Tema STF, Tema STJ, Tema TNU, Enunciado CRPS), buscar no catálogo da skill `base-precedentes-catalogo-vinculantes` (Onda 37) nos arquivos.
- `CATALOGO-TEMAS-STF.md` (56 Temas RG).
- `CATALOGO-TEMAS-STJ.md` (60 Temas Repetitivos).
- `CATALOGO-TEMAS-TNU.md` (156 Temas Representativos).
- `CATALOGO-ENUNCIADOS-CRPS.md` (18 Enunciados).

Procedimento.

1. Identificar a norma citada (ex. "art. 92, §§ 2º e 9º RICRPS").
2. Localizar o arquivo correspondente (no exemplo, `06-Portarias/Portaria-MPS-125-2026.md`).
3. Usar Grep ou Read para confirmar o conteúdo literal.
4. Se confirmado, registrar a verificação como APROVADA e seguir.

Tempo médio. 2 a 5 segundos.

### Nível 2 - WebFetch Direto da URL Oficial

Se o artigo NÃO estiver no repositório local (cobre apenas 19 normas), buscar via WebFetch direto da URL oficial registrada no índice de `base-legislacao-fontes-primarias`.

URLs oficiais por categoria.

- Planalto. `https://www.planalto.gov.br/ccivil_03/...`
- Imprensa Nacional. `https://www.in.gov.br/web/dou/...`
- gov.br/inss. `https://www.gov.br/inss/pt-br/centrais-de-conteudo/publicacoes/normativos/...`
- gov.br/previdencia. `https://www.gov.br/previdencia/...`
- sirc.gov.br. `https://www.sirc.gov.br/...`
- CJF (TNU). `https://www.cjf.jus.br/...`

Procedimento.

1. Identificar a URL oficial correspondente à norma.
2. Acionar `mcp__workspace__web_fetch` ou ferramenta equivalente.
3. Receber HTML/PDF processado.
4. Buscar o artigo no conteúdo retornado.
5. Confirmar literalmente e registrar APROVADO.

Tempo médio. 10 a 30 segundos.

### Nível 3 - WebSearch para Localizar Fonte Alternativa

Se a URL oficial direta falhar (404, timeout, restrição de acesso), acionar `WebSearch` para localizar fontes alternativas que reproduzam o texto consolidado.

Fontes alternativas confiáveis.

- `normaslegais.com.br` (espelho do DOU).
- `sirc.gov.br` (consolida INs INSS).
- Portais oficiais de tribunais para enunciados.
- Repositórios universitários para decretos históricos (UFSM, UFMG).

Procedimento.

1. Acionar WebSearch com termo específico (ex. "art. 92 Portaria MPS 125/2026 texto integral").
2. Identificar URL com texto literal.
3. Acionar WebFetch na URL encontrada.
4. Confirmar literalmente.

Tempo médio. 30 a 60 segundos.

### Nível 4 - Navegador Comet/Chrome via MCP

Se WebFetch e WebSearch falharem (caso extremo, normalmente por restrição de acesso direto), acionar o navegador instalado no computador do usuário via MCP.

Procedimento.

1. Identificar que `mcp__claude-in-chrome__*` está disponível.
2. Abrir Comet (navegador padrão do Tercini) ou Chrome.
3. Navegar para a URL oficial.
4. Capturar conteúdo via `mcp__claude-in-chrome__read_page` ou `get_page_text`.
5. Confirmar literalmente.

Tempo médio. 60 a 120 segundos.

CONFIGURAÇÃO. Conforme `mcp__claude-in-chrome__list_connected_browsers`. O Comet é navegador instalado no computador do usuário em `C:\Users\VAIO\AppData\Local\Programs\Comet\` (instalação típica da Perplexity).

## REGRA COMET PARA JULGADOS COM DÚVIDA (Onda 65)

REGRA PRIORITÁRIA. Sempre que houver qualquer dúvida sobre um julgado, a cascata NÃO precisa esgotar os Níveis 2 e 3. A skill deve saltar direto ao Nível 4 (Comet) e conferir na fonte primária do órgão julgador.

Gatilhos automáticos da dúvida.

Primeiro, o julgado citado NÃO está no catálogo local `base-precedentes-catalogo-vinculantes` nem em `references/CATALOGO-PEDILEFS-PARADIGMATICOS-TNU.md`.

Segundo, tese, número, relator ou data pareçam divergir da memória local.

Terceiro, precedente novo (posterior à última atualização dos catálogos locais em maio de 2025) ou reafirmado após overruling.

Quarto, precedente cuja aplicação depende de modulação, ADI, ADPF ou tese complementar em curso.

Quinto, precedente citado pelo adversário para refutar a tese do segurado.

Sexto, precedente-paradigma em PUIL/PEDILEF, hipótese em que o cotejo analítico exige transcrição literal e conferência direta no portal oficial.

Fluxo de conferência no Comet.

1. Acionar `mcp__claude-in-chrome__list_connected_browsers` para confirmar Comet ativo. Se ausente, pedir autorização ao usuário para abrir Comet ou Chrome fallback.

2. Acionar `mcp__claude-in-chrome__navigate` para o portal oficial correspondente.

3. Localizar o julgado por número, tema ou súmula usando `mcp__claude-in-chrome__find` ou `mcp__claude-in-chrome__read_page`.

4. Capturar o inteiro teor da tese, número, órgão, relator, data e ementa via `get_page_text`.

5. Confrontar com a citação da peça.

6. Se conforme, registrar `VERIFICADO via Nível 4 (Comet - portal oficial [órgão])` no relatório.

7. Se divergente, emitir achado BLOQUEANTE e corrigir a peça antes do protocolo.

Portais oficiais mapeados.

STF em `https://portal.stf.jus.br/jurisprudencia`, `https://portal.stf.jus.br/servicos/jurisprudencia/`, `https://portal.stf.jus.br/jurisprudenciaRepercussao` (Repercussão Geral), `https://portal.stf.jus.br/servicos/sumulasVinculantes` (Súmulas Vinculantes).

STJ em `https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias.aspx`, `https://scon.stj.jus.br/SCON` (busca jurisprudencial), `https://processo.stj.jus.br/repetitivos/temas_repetitivos/` (Repetitivos), `https://scon.stj.jus.br/SCON/sumanot/` (Súmulas).

TNU em `https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao/temas-representativos`, `https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao/sumulas-da-tnu`, `https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao/questoes-de-ordem`.

TRF3 em `https://www.trf3.jus.br/jurisprudencia/`.

TRF4 em `https://jurisprudencia.trf4.jus.br`.

TRF1, TRF2, TRF5 em seus respectivos portais de jurisprudência.

CRPS em `https://www.gov.br/previdencia/pt-br/assuntos/previdencia-social/conselho-de-recursos-do-seguro-social-crss/enunciados-do-crps`.

TJSP em `https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do` (jurisprudência) e `https://esaj.tjsp.jus.br/cposg/open.do` (consulta processual).

Postura pró-segurado. Nunca aceitar por presunção precedente citado por adversário sem conferência via Comet. Toda dúvida do próprio Claude sobre precedente que ele próprio pretenda citar em peça do segurado deve resolver-se por conferência no Comet, e não por inclusão condicional na peça.

### Nível 5 - Reporte Final ao Usuário (ÚLTIMO RECURSO)

Apenas se TODOS os 4 níveis falharem, emitir o achado.

```
[IMPORTANTE] Verificação literal falhou em fonte primária após cascata em 4 níveis (repositório local, WebFetch direto, WebSearch + WebFetch, navegador Comet/Chrome). Norma. [identificação]. Tentativas. [lista de URLs tentadas]. Recomenda-se verificação manual antes do protocolo.
```

Essa hipótese é RARA e deve ser tratada como sinal de problema infraestrutural, não como defeito da skill.

## OPERAÇÃO NA SKILL DE REVISÃO

Durante a Camada 2 da Revisão Aprofundada, ao encontrar uma citação a verificar.

1. Acionar o Nível 1 do protocolo dinâmico.
2. Se Nível 1 confirmar, registrar APROVADO sem alerta.
3. Se Nível 1 falhar, acionar Nível 2 IMEDIATAMENTE.
4. Se Nível 2 confirmar, registrar APROVADO COM FONTE DINÂMICA (nota "verificado via WebFetch em [URL]").
5. Se Nível 2 falhar, acionar Nível 3.
6. Se Nível 3 falhar, acionar Nível 4 (com aviso ao usuário para autorizar abertura do navegador).
7. Se Nível 4 falhar, emitir o achado IMPORTANTE final.

A skill registra no relatório APENAS os achados após esgotamento da cascata.

## EXEMPLO PRÁTICO

### Caso 1 - Verificação dos parágrafos do art. 92 do RICRPS

Citação na peça. "art. 92, §§ 2º, 9º, 10 e 11 do RICRPS".

Cascata.

**Nível 1.** Abrir `06-Portarias/Portaria-MPS-125-2026.md`. Buscar "Art. 92" com Grep ou Read. Conferir os §§ 2º, 9º, 10 e 11. Se localizado e literalmente conforme, REGISTRAR APROVADO. Sem alerta.

**Nível 2.** Se o repositório não tiver o detalhamento ou estiver desatualizado, acionar WebFetch em `https://www.gov.br/previdencia/.../portaria-mps-no-125-...-consolidado.pdf`. Buscar o art. 92 no conteúdo retornado. Conferir os parágrafos.

**Nível 3.** Se a URL do gov.br/previdencia retornar erro, acionar WebSearch com "art. 92 Portaria MPS 125/2026 incisos parágrafos vícios embargos texto integral".

**Nível 4.** Se WebFetch e WebSearch falharem, abrir Comet via Claude in Chrome MCP, navegar e capturar.

**Nível 5.** Se TUDO falhar, emitir o achado IMPORTANTE com fundamentação técnica completa.

### Caso 2 - Verificação de Enunciado do CRPS

Citação. "Enunciado 12 do CRPS".

**Nível 1.** Verificar em `precedentes-previdenciarios` se há catálogo de Enunciados.

**Nível 2.** WebFetch em `https://www.gov.br/previdencia/.../enunciados-crps.pdf` ou `https://www.in.gov.br/...`.

**Nível 3.** WebSearch.

**Nível 4.** Comet via MCP.

### Caso 3 - Verificação de Súmula TNU

Citação. "Súmula 47/TNU".

**Nível 1.** Verificar em `precedentes-previdenciarios`.

**Nível 2.** WebFetch em `https://www.cjf.jus.br/.../sumulas-tnu`.

**Nível 3.** WebSearch.

**Nível 4.** Comet via MCP.

## INTEGRAÇÃO COM A SKILL DE REVISÃO

A skill `base-revisao-peticao-aprofundada` deve.

1. NA CAMADA 2 (Conformidade Normativa), para CADA citação encontrada, acionar a cascata.

2. NUNCA registrar achado de "verificação não realizada" antes de esgotar os 4 níveis.

3. REGISTRAR no relatório, ao final.

```
=== VERIFICAÇÕES DINÂMICAS EXECUTADAS ===
- art. 92, §§ 2º, 9º, 10 e 11 RICRPS. VERIFICADO via Nível 1 (repositório local). Conforme.
- Enunciado 12/CRPS. VERIFICADO via Nível 2 (WebFetch gov.br). Conforme.
- Súmula 47/TNU. VERIFICADO via Nível 1 (precedentes-previdenciarios). Conforme.
- art. 110 §2º RICRPS. VERIFICADO via Nível 2 (WebFetch). Conforme.
```

## ATIVAÇÃO AUTOMÁTICA

A skill `base-revisao-peticao-aprofundada` deve ATIVAR automaticamente este protocolo nas seguintes condições.

- Citação de artigo de norma primária na peça.
- Citação de Enunciado, Súmula ou Resolução do CRPS.
- Citação de Súmula ou Tema STF/STJ/TNU.
- Citação de Parecer CONJUR/AGU vinculante.
- Citação de PEDILEF, IRDR, IAC ou repetitivo.

## QUANDO PEDIR AUTORIZAÇÃO DO USUÁRIO

A skill executa Níveis 1, 2 e 3 SEM pedir autorização (são operações de leitura passiva).

A skill PEDE AUTORIZAÇÃO antes do Nível 4 (abertura de navegador), com mensagem padrão.

```
A verificação literal do [artigo X] requer abertura do navegador
para captura direta no portal oficial. Posso abrir o navegador
Comet agora para confirmar o texto literal? (sim/não)
```

Se o usuário negar, a skill emite o achado IMPORTANTE com fundamentação.

## TEMPO DE EXECUÇÃO TOTAL

Para uma peça típica com 15 a 25 citações.

- Nível 1 apenas. 30 a 60 segundos.
- Nível 1 + Nível 2 (para citações não locais). 1 a 3 minutos.
- Nível 1 + Nível 2 + Nível 3. 3 a 5 minutos.
- Cascata completa com Nível 4. 5 a 10 minutos.

Em peças com fundamentação majoritariamente coberta pelo repositório local, a cascata raramente passa do Nível 1.

## LOG DE VERIFICAÇÕES

A skill registra ao final do relatório de revisão um log estruturado.

```
[RELATÓRIO DE VERIFICAÇÃO DINÂMICA]
Total de citações analisadas. 23.
Verificadas no Nível 1 (repositório local). 18.
Verificadas no Nível 2 (WebFetch direto). 4.
Verificadas no Nível 3 (WebSearch + WebFetch). 1.
Verificadas no Nível 4 (Comet/Chrome). 0.
Não verificadas. 0.

Detalhe das verificações no Nível 2 e além.
- art. 110 §2º RICRPS. Nível 2 (WebFetch em gov.br/previdencia).
- Enunciado 12/CRPS. Nível 2 (WebFetch em gov.br).
- art. 79 IN 128/2022. Nível 2 (WebFetch em sirc.gov.br).
- Tema 1.124/STJ. Nível 2 (WebFetch em STJ).
- art. 23 EC 103/2019. Nível 3 (WebSearch + WebFetch).
```

## FONTES CONFIÁVEIS PARA WEBFETCH

URLs prioritárias por categoria.

**Constituição e EC.** `https://www.planalto.gov.br/ccivil_03/constituicao/`

**Leis ordinárias e complementares.** `https://www.planalto.gov.br/ccivil_03/leis/`

**Decretos.** `https://www.planalto.gov.br/ccivil_03/decreto/`

**IN 128/2022.** `https://www.sirc.gov.br/instrucao-normativa-pres-inss-no-128-de-28-de-marco-de-2022/`

**Portarias DIRBEN/INSS.** `https://www.normaslegais.com.br/legislacao/` ou `https://www.gov.br/inss/`

**Portaria MPS 125/2026 (RICRPS).** `https://www.gov.br/previdencia/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/conselho-de-recursos-da-previdencia-social/`

**Enunciados, Súmulas e Resoluções CRPS.** `https://www.gov.br/previdencia/` (seção CRPS).

**Súmulas TNU.** `https://www.cjf.jus.br/cjf/jef/turma-nacional-de-uniformizacao/sumulas`

**Súmulas STJ.** `https://www.stj.jus.br/sites/portalp/Sumulas`

**Temas STF.** `https://portal.stf.jus.br/jurisprudencia/`

**Temas STJ.** `https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias-antigas/Repetitivos`

## TROUBLESHOOTING

**Erro. WebFetch retorna 404.**

Acionar Nível 3 (WebSearch + WebFetch em URL alternativa).

**Erro. Conteúdo retornado é página de listagem, não artigo específico.**

Acionar Nível 3 com termo de busca mais específico.

**Erro. Conteúdo retornado é PDF não processável.**

Acionar Nível 4 (Comet/Chrome) para capturar página renderizada.

**Erro. mcp__Claude in Chrome__* não disponível.**

Tentar com `mcp__computer-use__*` para controle direto do desktop.

**Erro. Navegador Comet não instalado.**

Fallback automático para Chrome ou Edge, conforme configuração.

## ESTRATÉGIA PRÓ-SEGURADO

Este protocolo serve ao princípio do escritório de honestidade radical e rigor de verificação. NUNCA citar artigo sem verificação literal. NUNCA depender do advogado para fazer o que a IA pode fazer.

A automação da verificação libera tempo do advogado para tarefas estratégicas (análise do caso, atendimento ao cliente, escolha de tese), enquanto a IA cuida do trabalho operacional repetitivo de conferência normativa.
