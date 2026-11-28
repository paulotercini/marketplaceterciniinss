---
name: auditoria-citacoes
description: "Auditora de veracidade das citações jurisprudenciais da base. Varre as skills (base-*, ponte-*, operacionais) e os Modelos Ouro 3.0 do Drive, extrai Tema, Súmula, Enunciado, PUIL, PEDILEF, REsp, RE, ADI, IRDR, IAC e QO afirmados, e confere se existem, se estão vigentes e se a tese citada bate com a real. Honestidade radical aplicada à própria base, corrige o sanável e sinaliza o resto. Use SEMPRE que mencionar averiguar veracidade das skills, auditar modelos ouro, conferência de jurisprudência em massa, auditoria de citações, citação inventada, homônimo de tribunal, tema cancelado citado como vigente, catálogo complementar verificado, quarentena de citação, manutenção periódica da base, auditoria_citacoes.py. Cinco etapas, script determinístico, triagem por status, verificação na fonte por subagentes, correção com nota datada, porta de qualidade com commit. Cruza com base-precedentes-catalogo-vinculantes e base-revisao-peticao-aprofundada. NÃO use para revisar petição individual."
---

# Auditoria de Veracidade das Citações da Base

## 1. Escopo e postura

Skill operacional de manutenção. Aplica à própria base de conhecimento o mesmo rigor que a `base-revisao-peticao-aprofundada` aplica às peças. Toda jurisprudência afirmada nas skills (`base-*`, `ponte-*` e operacionais) e nos Modelos Ouro 3.0 do Drive, Tema, Súmula, Enunciado, PUIL e correlatos, é tratada como suspeita até confirmação. O que dá para corrigir, corrige. O que não dá, sinaliza com destaque.

Postura pró-segurado exclusiva. Uma citação falsa ou divergente na base contamina cada peça gerada a partir dela. Auditar a base é proteger o segurado na origem.

## 2. Quando acionar

Quando o usuário pedir para averiguar a veracidade das skills ou dos Modelos Ouro. Quando pedir uma conferência de jurisprudência em massa. Como manutenção periódica da base, especialmente após lotes grandes de alterações.

## 3. As cinco etapas

### Etapa 1. Varredura mecânica

Rodar o script determinístico `scripts/auditoria_citacoes.py`. Ele varre todas as skills e, com `--modelos DIR`, também a pasta local dos Modelos Ouro baixados do Drive, e lista os achados em JSON (citação normalizada, arquivo, linha, contexto).

O script já ignora o que está em contexto de QUARENTENA (linha ou vizinhas imediatas) e os itens já registrados no `references/CATALOGO-COMPLEMENTAR-VERIFICADO.md`, para não repisar o que já foi checado. Por padrão exclui a skill `base-precedentes-catalogo-vinculantes`, que é o catálogo curado e tem rotina própria de verificação de status (usar `--incluir-catalogo` apenas quando a rotina for auditar o próprio catálogo).

O script NÃO consulta a internet e NÃO julga mérito. Citações de Lei, Decreto, IN e Portaria ficam fora desta auditoria porque são cobertas pelo protocolo literal da `base-legislacao-fontes-primarias`.

### Etapa 2. Triagem por status

Cada achado ganha um rótulo, cruzando com o catálogo interno (`base-precedentes-catalogo-vinculantes`).

ERRO_CONFIRMADO. Tema cancelado ou suspenso citado como vigente. Corrige SEMPRE. O caso histórico do plugin é o Tema 1066/STF.

NAO_CATALOGADO_NA_CORTE. O número existe no catálogo, mas em OUTRO tribunal. Levanta suspeita de homônimo trocado de corte (Tema de mesmo número existe no STF, no STJ e na TNU com teses distintas). Prioridade alta de verificação.

NAO_CATALOGADO. Não consta do catálogo interno. NÃO significa falso. O catálogo é curado e mínimo por escolha. Segue para verificação na fonte.

INFORMATIVO. O item consta do catálogo, mas o registro ainda não traz a tese literal transcrita. Verificar e completar.

### Etapa 3. Verificação na fonte oficial

A classificação CONFIRMADO_FONTE_OFICIAL exige o inteiro teor ou a página do tema aberta na base do tribunal, com a data da conferência registrada, na forma de `pesquisa-jurisprudencia-chrome`. Item visto apenas em portal jurídico recebe, no máximo, PROVAVEL_FONTE_SECUNDARIA.

A verificação roda em lotes de até doze itens, com resposta de uma linha por item, pelo agente `base-conhecimento-inss:verificador-precedentes`, invocado pela Agent tool. O agente recebe cada lote com ID normalizado, arquivo, linha e contexto, segue a ordem abaixo e devolve relatório no formato do catálogo complementar. Ele apenas verifica e reporta; a correção fica com a Etapa 4. Sem o agente na sessão, usar subagente genérico com as mesmas instruções.

Ordem obrigatória, por item:

1. Catálogo interno, references verificadas e o próprio `CATALOGO-COMPLEMENTAR-VERIFICADO.md`.
2. MCPs da casa: `superiores` (`obter_tema`) para tema do STF e do STJ; `iurisprudencia` para TNU, CRPS e Turmas Recursais; `trf3` para acórdão do TRF3 pelo número CNJ. Achado de MCP classifica no máximo como PROVAVEL_FONTE_SECUNDARIA até a leitura no `link_oficial`.
3. Busca na web com o tribunal na expressão, para não capturar homônimo de outra corte. A cota de buscas de uma sessão é limitada, e a conferência em massa deve poupá-la.
4. Página oficial. Os portais do STF, do STJ, do CJF e do TST costumam recusar o acesso automatizado, e a conferência se faz no navegador. Portal bloqueado se registra com honestidade, sem fingir acesso.

Cada item sai com uma de quatro classificações.

CONFIRMADO_FONTE_OFICIAL. Existe, vigente, tese bate. Vai para o `CATALOGO-COMPLEMENTAR-VERIFICADO.md` com redação literal e link, o que encerra a quarentena daquele item de vez.

PROVAVEL_FONTE_SECUNDARIA. Convergência de fontes secundárias confiáveis, sem fonte oficial acessível. Não entra no catálogo complementar. Fica anotado no relatório com as fontes.

DIVERGENTE. O número existe, mas trata de OUTRO assunto ou a tese real diz outra coisa. Segue para correção (Etapa 4).

NAO_LOCALIZADO. Nenhum registro em lugar algum. Suspeita de invenção. Segue para correção (Etapa 4).

### Etapa 4. Correção do sanável

Número trocado com item certo identificável. Substituir pelo número correto.

Número sem identificação possível. Retirar o número e reancorar a afirmação na norma de regência (lei, decreto, IN), que é sempre mais segura que precedente inexistente.

Tese divergente que muda a orientação ao cliente. Corrigir para a tese REAL, reposicionar o item como tese adversa a contornar (com a estratégia de distinguishing cabível) e SINALIZAR AO USUÁRIO EM DESTAQUE no relatório, porque a decisão de mérito sobre a estratégia é dele.

Toda edição registra a data da conferência no ponto alterado e preserva o restante do arquivo.

Nos Modelos Ouro, a regra é citação `[CONFERIDO]` apenas no corpo do modelo. Vazamento de citação não conferida no corpo se corrige DIRETO no Drive (os modelos vivem lá, fora do git).

### Etapa 5. Porta de qualidade e entrega

Reconferir cada correção por grep no arquivo alterado.

Rodar a varredura da Etapa 1 novamente e demonstrar a contagem de pendências caindo.

Commit das skills alteradas no repositório do plugin, com bump de versão. Os Modelos Ouro não entram no commit porque vivem no Drive.

Entregar relatório por severidade. ERRO_CONFIRMADO corrigido, DIVERGENTE corrigido e sinalizado, NAO_LOCALIZADO tratado, PROVAVEL registrado, CONFIRMADO catalogado, portais bloqueados declarados.

## 4. Regras invioláveis

Primeira, NUNCA inventar redação de tese. Tese sem fonte é lacuna declarada, não texto plausível.

Segunda, citação divergente JAMAIS permanece na base "por precaução". Ou é corrigida para a tese real, ou é removida e reancorada em lei.

Terceira, portal bloqueado se registra com honestidade. Dizer que conferiu na fonte oficial sem ter conferido é a falha que esta skill existe para eliminar.

Quarta, tudo em português correto, no padrão de redação do escritório, sem dois-pontos introduzindo lista na prosa.

## 5. Modelos Ouro 3.0 e o Drive

A varredura dos modelos depende de baixá-los antes com o comando `modelos --baixar`, que exige token do Drive por script válido. Quando o token estiver expirado ou indisponível, a auditoria roda apenas sobre as skills, declara a limitação no relatório e deixa os modelos para a rodada seguinte, sem silêncio sobre a lacuna.

## 6. Entregáveis

JSON da varredura (`auditoria_citacoes.json`). Relatório por severidade com cada item e sua classificação. `CATALOGO-COMPLEMENTAR-VERIFICADO.md` incrementado com os confirmados. Skills corrigidas com nota datada, commit e push. Correções de modelos aplicadas direto no Drive.

## 7. Integração com outras skills

O agente `verificador-precedentes` (pasta `agents/` do plugin) é o braço executor da Etapa 3, com as mesmas regras invioláveis desta skill e saída no formato do catálogo complementar. `base-precedentes-catalogo-vinculantes` é a referência de triagem da Etapa 2 e o destino natural de promoções futuras de itens consolidados. `base-revisao-peticao-aprofundada` é a irmã desta skill no plano das peças,. `base-legislacao-fontes-primarias` cobre as citações normativas, fora do escopo desta auditoria. `ingest-tema-base-inss` deve consultar o catálogo complementar antes de registrar tema novo, para não recriar quarentena de item já verificado.

## 8. O que NÃO está nesta skill

Revisão de petição individual (é da `base-revisao-peticao-aprofundada`). Verificação de texto de lei, decreto ou portaria (é da `base-legislacao-fontes-primarias`). Atualização de status do catálogo curado (rotina própria da `base-precedentes-catalogo-vinculantes`).

## Correção completa, e não apenas da definição

**Varredura de usos.** Corrigido um item na Etapa 4, a Etapa 5 roda `grep -rn` do número em toda a base e lê o contexto de cada ocorrência. Corrigir apenas a seção que define o tema deixa o erro vivo: no caso do Tema 862/STJ, vinte ocorrências sobreviveram em seis skills entre julho e setembro de 2026.

**Nome do arquivo.** Número de tema, súmula ou enunciado no nome de diretório ou de seção também é citação. Estando errada a associação, o achado é bloqueante, o arquivo é renomeado por `git mv` e todas as referências cruzadas são atualizadas na mesma rodada. Exemplos: `base-b94-sequela-minima-tema201` passou a `base-b94-sequela-minima-sumula88-tnu`, e `base-devolucao-valores-irrepetibilidade-tema979-tema1034` passou a `base-devolucao-valores-irrepetibilidade-tema979-tema692`.

**Aspas.** Tese entre aspas é transcrição e se confere caractere a caractere. Paráfrase não vai entre aspas e se identifica como resumo.

Caso completo em `references/CORRECAO-PARCIAL-E-NOME-CONTAMINADO.md`.

## Ementa de tribunal como vetor de erro

Acórdão usado como fundamento carrega as citações do relator, que podem estar erradas. Achado na base um tema atribuído a assunto diverso do catálogo, verificar se a atribuição veio de ementa copiada. Vindo, corrige-se a citação e registra-se que o acórdão de origem a contém, para que ninguém a reintroduza ao reler o julgado.

## Padrões de erro mais frequentes

A rodada de 03/10/2026 encontrou três padrões, nesta ordem de frequência:

1. Número atribuído ao assunto de outro precedente, como a Súmula 47/TNU apresentada como regra de implantação imediata, quando trata das condições pessoais e sociais na incapacidade parcial.
2. Homônimo de outra corte, como a Súmula 632/STJ (seguro) no lugar da Súmula 632/STF (prazo do mandado de segurança), a Súmula 44/TNU no lugar da Súmula 44/STJ e o Tema 640/STJ citado como do STF.
3. Decisão real com número de processo, data ou resultado trocados.

O `scripts/triagem_catalogo.py` cruza a saída do `auditoria_citacoes.py` com o catálogo e aponta três suspeitas: número ausente do catálogo, número que existe apenas em outra corte e descrição sem palavra em comum com a tese catalogada. O extrator não conta a Súmula Vinculante como súmula comum do STF.

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

STF e STJ (MCP `superiores`). O servidor local `superiores` guarda os temas de repercussão geral do STF, os temas repetitivos, IAC, PUIL, SIRDR e controvérsias do STJ, a Jurisprudência em Teses do previdenciário e as decisões e acórdãos dos dois tribunais. Antes de citar tema do STF ou do STJ, use `obter_tema` (por `tribunal` e `numero`, como STF 1102 ou STJ 1124) e confira a tese e a situação no `link_oficial` devolvido, porque situação e tese são as da data da coleta. A Jurisprudência em Teses é a fotografia da data de cada edição e pode estar superada, como a tese da desaposentação da edição 67, afastada pelo Tema 503 do STF. Antes de usá-la, confira o tema vinculante. Para ver como o STJ aplica o tema, use `buscar_decisoes_superiores` com o filtro `tema` pelo número e leia o inteiro teor em `obter_decisao_superiores`. O MCP localiza e não confere, de modo que o achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido no `link_oficial`.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".

Entrega no chat (Onda 171). O achado chega ao titular pela corrente e pelo órgão, sem número de processo, relator ou data, em até três parágrafos e com no máximo três dados concretos. A lista completa, com a marcação de cada item, vai em planilha anexa e na peça, na forma de `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
