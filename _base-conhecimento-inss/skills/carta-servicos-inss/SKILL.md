---
name: carta-servicos-inss
description: Manutenção e publicação do gerador interativo "Carta de Serviços do INSS" do escritório Paulo Roberto Tercini Filho. Use SEMPRE que mencionar carta de documentos, gerador de carta, página de documentos para clientes, atualizar lista de documentos, novo benefício na carta, atualizar marcos normativos da carta, publicar página do escritório, Netlify Drop, novos campos PPP, atualizar versão da carta, painel de exemplos, chips de documentos, ou qualquer alteração no arquivo carta-documentos-inss.html. Acionar AUTOMATICAMENTE para adicionar benefícios, atualizar alertas, corrigir referências legais, validar JS antes de publicar e gerar nova versão. Cruza com base-conhecimento-inss para extrair marcos normativos atualizados antes de redigir alertas. NÃO use para petições, recursos ou auditorias (são outras skills).
---

# Skill da Carta de Serviços do INSS

Esta skill mantém o gerador interativo de cartas de documentos do escritório, padroniza a estrutura de cards, garante que todos os marcos normativos sejam confirmados em fonte primária antes de entrar na página e cobre o ciclo completo de atualização e publicação no Netlify Drop.

## Quando acionar esta skill

Acionar sempre que houver pedido para adicionar novo benefício, atualizar marco normativo, corrigir alerta, alterar texto de instrução ao cliente, gerar nova versão ou publicar a página. Também acionar quando outras skills (`base-conhecimento-inss:*`, `peticao-previdenciaria`, `auditoria-ppp`) gerarem entendimentos que devam refletir na carta.

## Filosofia editorial

A carta é dirigida ao cliente leigo, não ao perito ou ao juiz. Linguagem deve ser clara, objetiva, com instruções acionáveis. Não escreva como petição.

Toda afirmação jurídica entra somente após verificação em fonte primária oficial. Nunca invente Tema, Súmula, número de Lei ou Portaria. Se não confirmar, não cite.

A postura é exclusivamente pró-segurado. Nenhum alerta deve enfraquecer a posição do cliente. Quando há controvérsia jurisprudencial, escolha a redação que preserva o direito e indique a tese pró-segurado como cabível, sem prometer vitória.

Padrão de cor dos alertas segue a gravidade. Vermelho indica risco crítico ou requisito que pode causar perda do direito. Laranja indica cuidado ou atenção a regra processual ou probatória. Azul indica informação operacional. Verde indica reforço de tese pró-segurado ou benefício adicional. Roxo é reservado para assuntos da PCD.

## Arquitetura do arquivo

A página atual chama-se `carta-documentos-inss-vN.html` e fica no workspace folder do projeto em `Carta de Serviços do INSS`. Estrutura interna tem três objetos JS principais.

`GRUPOS` lista os agrupamentos de cards na tela inicial. Cada agrupamento tem `label` e `ids`.

`B` é o objeto que define cada benefício, indexado por id curto. Cada entrada tem `ico` (emoji), `t` (título), `r` (resumo curto), `c` (cor base), `intro` (parágrafo introdutório ao cliente), `s` (seções de documentos obrigatórios), `al` (alertas).

`EX` é o objeto que define os exemplos clicáveis no painel de personalização. Pode ser array simples ou objeto com `grupos`. Recomenda-se o formato com `grupos` para benefícios complexos.

A estrutura completa de uma entrada de `B` e `EX` está em `references/estrutura-card.md`.

## Ciclo de atualização

Quando receber pedido de alteração na carta, siga o fluxo abaixo.

Primeiro, identifique a versão atual do arquivo no workspace folder e copie para `/tmp/carta-documentos-inss.html`. O sandbox às vezes não permite escrita direta no workspace.

Em seguida, leia o arquivo para localizar exatamente os trechos a alterar. Use ponteiros únicos para Edit ou substituições por script Python.

Antes de redigir qualquer alerta com fundamento normativo, consulte `references/marcos-normativos.md` e cruze com a base-conhecimento-inss correspondente. Confirme em fonte primária quando o marco for novo.

Sempre incremente a versão no rodapé do cabeçalho (`v8.0 — DD/MM/AAAA`) e a data atual. A versão deve ser sequencial e a data deve ser obtida via bash com `date +%d/%m/%Y`.

Valide a sintaxe JavaScript antes de finalizar. Extraia o conteúdo do `<script>` para um arquivo `.js` e rode `node --check`. JS quebrado torna a página inutilizável.

Verifique a presença dos novos elementos com contagem de ocorrências (`grep -c`). Cada novo benefício deve aparecer pelo menos uma vez como card (`mostra('id')`), uma vez no objeto B e uma vez no objeto EX.

Salve o arquivo em três destinos. No `/sessions/.../mnt/outputs/` para visualização imediata, no workspace folder do projeto para acesso permanente do escritório, e atualize o artefato cowork via `mcp__cowork__update_artifact` quando aplicável.

Por fim, oriente o usuário a publicar no Netlify Drop seguindo `references/publicacao-netlify.md`.

## Como adicionar novo benefício

Para adicionar novo benefício, siga sequência rígida para evitar quebra do JS.

Escolha id curto, em letras minúsculas, sem acento ou hífen. Exemplos válidos `ah`, `adac`, `ainvac`, `rp`, `ind`, `rev`. Confirme que o id não colide com nenhum existente.

Adicione card estático no HTML. Localize o bloco do agrupamento correspondente em `GRUPOS` e insira o novo card como `<div class="card" onclick="mostra('id')">...</div>`. Mantenha emoji distinto dos existentes para diferenciar visualmente.

Atualize o array `ids` do agrupamento em `GRUPOS`. Se o agrupamento certo não existe, crie novo.

Adicione entrada no objeto `B`, com todos os campos obrigatórios. A introdução fala diretamente ao cliente. As seções `s` listam documentos obrigatórios. Os alertas `al` cobrem prazos, riscos, controvérsias e dicas pró-segurado.

Adicione entrada correspondente em `EX`, no formato `{grupos:[...]}` quando houver mais de uma categoria de exemplos. Use array simples só para benefícios muito enxutos.

Confirme com `grep` que o id aparece em todos os pontos certos antes de finalizar.

A documentação completa de campos e a árvore de decisão está em `references/estrutura-card.md`.

## Como atualizar marco normativo

Quando vier informação nova de Tema, Súmula, Lei, Portaria ou IN, faça o seguinte.

Confirme a vigência do marco em fonte primária oficial. Não copie de redes sociais sem cruzar com STJ, STF, TNU, Diário Oficial ou portal do INSS.

Identifique todos os benefícios afetados. Um marco como o Tema 1090 STJ pode tocar aposentadoria especial, B91 acidentário, B92 acidentário e ainda análise documental. Cruze com base-conhecimento-inss para mapear o alcance.

Atualize o alerta correspondente em cada `B[id].al`. Mantenha tom claro e indicação prática para o cliente. Cite o marco somente uma vez por alerta. Evite empilhar referências jurídicas em frase curta.

Quando o marco for muito recente (menos de 12 meses) e ainda houver pouca jurisprudência consolidada, sinalize com cor laranja e redija com cautela. Quando for marco firme e benéfico ao segurado, sinalize com verde e afirme.

Atualize `references/marcos-normativos.md` com o novo item para futuras consultas.

## Como publicar no Netlify Drop

A publicação no Netlify Drop é simples, mas exige cuidado com nome do arquivo.

Renomeie o arquivo final para `index.html` antes do upload. O Netlify só serve diretamente o `index.html` na raiz da URL. Sem essa renomeação, a URL exigirá complemento `/carta-documentos-inss-v8.html`.

Acesse `app.netlify.com/drop` e arraste o arquivo. A URL é gerada automaticamente. Se o usuário cadastrou conta, é possível reservar nome próprio do site (por exemplo `carta-tercini.netlify.app`).

Cada nova versão exige novo arrastar do arquivo atualizado, com mesmo nome `index.html`. Avise sempre o usuário a fazer o upload da versão final.

Para configurar domínio próprio do escritório, oriente o usuário a apontar CNAME do subdomínio escolhido para o Netlify. Esta etapa é opcional.

O passo a passo detalhado, incluindo controle de acesso e atualização, está em `references/publicacao-netlify.md`.

## Validação obrigatória antes de fechar o ciclo

Antes de declarar a alteração concluída, faça a checagem abaixo.

Validar JS com `node --check` em uma extração do conteúdo do `<script>`. Sintaxe quebrada torna a página inutilizável.

Confirmar contagens com `grep -c` para os ids novos e marcos normativos novos. Cada id deve aparecer no card, em B e em EX. Cada marco deve aparecer ao menos uma vez no alerta correspondente.

Verificar a versão e a data no rodapé do cabeçalho.

Conferir que nenhum alerta usa expressão hesitante como "parece que", "pode ser que", "talvez", "é possível que" em redação técnica. A skill segue a regra de honestidade radical do escritório. Se o fundamento existe, afirma. Se não existe, declara que não há base.

Conferir que nenhum dois-pontos foi usado para introduzir explicações ou listas no corpo da carta, conforme padrão editorial do escritório. A carta usa frases independentes ou conectadas por conjunções.

## Cruzamentos obrigatórios

Esta skill cruza automaticamente com as skills da `base-conhecimento-inss` correspondentes ao benefício alterado. Antes de redigir alerta, ler a skill base do tema para extrair marcos vigentes.

Cruza também com `peticao-previdenciaria` quando o ajuste tiver origem em padrão usado nas peças. A carta deve refletir os argumentos pró-segurado que o escritório usa em juízo.

Cruza com `documentos-comprobatorios-in128` para garantir que a lista de documentos siga a IN 128/2022.

Cruza com `precedentes-previdenciarios` para confirmar Temas e Súmulas antes de citá-los.

## Sugestão de novos cards a partir de pedido do cliente

Quando o usuário pedir benefício que ainda não existe na carta, primeiro confirme se há base normativa e demanda recorrente do escritório. Não criar card para situação muito específica que pode ser tratada em consulta individual.

Para cada novo card, propor primeiro a estrutura completa e só depois aplicar. Evita retrabalho e padroniza a árvore de cards.

## Quando NÃO usar esta skill

Não usar para redigir petição, recurso ao CRPS, mandado de segurança ou parecer técnico. Para isso, use `peticao-previdenciaria`.

Não usar para auditar PPP isoladamente. Use `auditoria-ppp`.

Não usar para análise de laudo pericial. Use `auditoria-laudo-pericial`.

Não usar para orientação ao cliente que não envolva atualização da página. Para orientação operacional sobre canais ou perícia, use `inss-canais-atendimento` ou `orientacao-cliente-pericia`.

## Histórico de versões

A versão 8.0 (02/05/2026) consolidou 22 benefícios, atualizou marcos normativos completos até maio/2026 e corrigiu o alerta do art. 45 da Lei 8.213/91 e a referência ao art. 18 §1º da Lei 8.213/91 no auxílio-acidente.

A versão 7.0 (02/05/2026) preencheu as listas vazias EX.rec (Auxílio-Reclusão) e EX.bpci (BPC Idoso).

A versão 6.6 (18/03/2026) era a versão inicial enviada pelo usuário, com 16 benefícios.
