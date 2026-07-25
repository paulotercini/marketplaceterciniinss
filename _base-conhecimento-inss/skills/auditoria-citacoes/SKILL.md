---
name: auditoria-citacoes
description: "Auditora de veracidade das citações jurisprudenciais da base. Varre as skills (base-*, ponte-*, operacionais) e os Modelos Ouro 2.0 do Drive, extrai Tema, Súmula, Enunciado, PUIL, PEDILEF, REsp, RE, ADI, IRDR, IAC e QO afirmados, e confere se existem, se estão vigentes e se a tese citada bate com a real. Honestidade radical aplicada à própria base, corrige o sanável e sinaliza o resto. Use SEMPRE que mencionar averiguar veracidade das skills, auditar modelos ouro, conferência de jurisprudência em massa, auditoria de citações, citação inventada, homônimo de tribunal, tema cancelado citado como vigente, catálogo complementar verificado, quarentena de citação, manutenção periódica da base, auditoria_citacoes.py. Cinco etapas, script determinístico, triagem por status, verificação na fonte por subagentes, correção com nota datada, porta de qualidade com commit. Cruza com base-precedentes-catalogo-vinculantes e base-revisao-peticao-aprofundada. NÃO use para revisar petição individual."
---

# Auditoria de Veracidade das Citações da Base

## 1. Escopo e postura

Skill operacional de manutenção. Aplica à própria base de conhecimento o mesmo rigor que a `base-revisao-peticao-aprofundada` aplica às peças. Toda jurisprudência afirmada nas skills (`base-*`, `ponte-*` e operacionais) e nos Modelos Ouro 2.0 do Drive, Tema, Súmula, Enunciado, PUIL e correlatos, é tratada como suspeita até confirmação. O que dá para corrigir, corrige. O que não dá, sinaliza com destaque.

Postura pró-segurado exclusiva. Uma citação falsa ou divergente na base contamina cada peça gerada a partir dela. Auditar a base é proteger o segurado na origem.

## 2. Quando acionar

Quando o usuário pedir para averiguar a veracidade das skills ou dos Modelos Ouro. Quando pedir uma conferência de jurisprudência em massa. Como manutenção periódica da base, especialmente após lotes grandes de ondas novas.

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

INFORMATIVO. O item consta do catálogo, mas o registro ainda não traz a tese literal transcrita (exemplo histórico, o registro do Tema 1124/STJ antes da transcrição da tese). Verificar e completar.

### Etapa 3. Verificação na fonte oficial

Verificação em lotes de dez a vinte itens pelo agente do plugin `base-conhecimento-inss:verificador-precedentes` (Onda 78), invocado pela Agent tool. O agente recebe cada lote com ID normalizado, arquivo, linha e contexto da afirmação, executa a ordem obrigatória e devolve relatório no formato do catálogo complementar, pronto para colagem. Ele somente verifica e reporta, sem editar arquivo algum (a correção fica com a Etapa 4, na sessão principal). Quando o agente do plugin não estiver disponível na sessão, usar subagente genérico com as mesmas instruções.

A ordem obrigatória, por item.

Primeiro, catálogo interno e references locais verificados (incluído o próprio `CATALOGO-COMPLEMENTAR-VERIFICADO.md`).

Segundo, WebSearch com o TRIBUNAL na string de busca (evita capturar homônimo de outra corte).

Terceiro, WebFetch na fonte oficial. Vale a limitação de rede conhecida do sandbox (estado conferido em 25/07/2026). Costumam ABRIR o CJF (TNU), o Planalto, às vezes o STF, o processo.stj.jus.br/repetitivos (abriu na Onda 77), as páginas de notícia do STJ, o arquivocidadao.stj.jus.br, o TST e o gov.br. Costumam BLOQUEAR o STJ SCON (403), o TRF3 e o eproc da TNU. Quando o portal bloquear, registrar com honestidade que a conferência ficou em fonte secundária, sem fingir acesso. Como reforço, a Regra Comet da Onda 65 (`base-revisao-peticao-aprofundada`) permite abrir o navegador do usuário para o portal bloqueado, quando a sessão tiver o Comet disponível.

Cada item sai com uma de quatro classificações.

CONFIRMADO_FONTE_OFICIAL. Existe, vigente, tese bate. Vai para o `CATALOGO-COMPLEMENTAR-VERIFICADO.md` com redação literal e link, o que encerra a quarentena daquele item de vez.

PROVAVEL_FONTE_SECUNDARIA. Convergência de fontes secundárias confiáveis, sem fonte oficial acessível. Não entra no catálogo complementar. Fica anotado no relatório com as fontes.

DIVERGENTE. O número existe, mas trata de OUTRO assunto ou a tese real diz outra coisa. Segue para correção (Etapa 4).

NAO_LOCALIZADO. Nenhum registro em lugar algum. Suspeita de invenção. Segue para correção (Etapa 4).

### Etapa 4. Correção do sanável

Número trocado com item certo identificável. Substituir pelo número correto.

Número sem identificação possível. Retirar o número e reancorar a afirmação na norma de regência (lei, decreto, IN), que é sempre mais segura que precedente inexistente.

Tese divergente que muda a orientação ao cliente. Corrigir para a tese REAL, reposicionar o item como tese adversa a contornar (com a estratégia de distinguishing cabível) e SINALIZAR AO USUÁRIO EM DESTAQUE no relatório, porque a decisão de mérito sobre a estratégia é dele.

Toda edição leva a nota "(auditoria DD/MM/AAAA)" no ponto alterado e preserva o restante do arquivo intacto.

Nos Modelos Ouro, a regra é citação `[CONFERIDO]` apenas no corpo do modelo. Vazamento de citação não conferida no corpo se corrige DIRETO no Drive (os modelos vivem lá, fora do git).

### Etapa 5. Porta de qualidade e entrega

Reconferir cada correção por grep no arquivo alterado.

Rodar a varredura da Etapa 1 novamente e demonstrar a contagem de pendências caindo.

Commit e push das skills alteradas no repositório do plugin, com bump de versão na rotina de Onda. Os Modelos Ouro não entram no commit porque vivem no Drive.

Entregar relatório por severidade. ERRO_CONFIRMADO corrigido, DIVERGENTE corrigido e sinalizado, NAO_LOCALIZADO tratado, PROVAVEL registrado, CONFIRMADO catalogado, portais bloqueados declarados.

## 4. Regras invioláveis

Primeira, NUNCA inventar redação de tese. Tese sem fonte é lacuna declarada, não texto plausível.

Segunda, citação divergente JAMAIS permanece na base "por precaução". Ou é corrigida para a tese real, ou é removida e reancorada em lei.

Terceira, portal bloqueado se registra com honestidade. Dizer que conferiu na fonte oficial sem ter conferido é a falha que esta skill existe para eliminar.

Quarta, tudo em português correto, no padrão de redação do escritório, sem dois-pontos introduzindo lista na prosa.

## 5. Modelos Ouro 2.0 e o Drive

A varredura dos modelos depende de baixá-los antes com o comando `modelos --baixar`, que exige token do Drive por script válido. Quando o token estiver expirado ou indisponível, a auditoria roda apenas sobre as skills, declara a limitação no relatório e deixa os modelos para a rodada seguinte, sem silêncio sobre a lacuna.

## 6. Entregáveis

JSON da varredura (`auditoria_citacoes.json`). Relatório por severidade com cada item e sua classificação. `CATALOGO-COMPLEMENTAR-VERIFICADO.md` incrementado com os confirmados. Skills corrigidas com nota datada, commit e push. Correções de modelos aplicadas direto no Drive.

## 7. Integração com outras skills

O agente `verificador-precedentes` (pasta `agents/` do plugin) é o braço executor da Etapa 3, com as mesmas regras invioláveis desta skill e saída no formato do catálogo complementar. `base-precedentes-catalogo-vinculantes` é a referência de triagem da Etapa 2 e o destino natural de promoções futuras de itens consolidados. `base-revisao-peticao-aprofundada` é a irmã desta skill no plano das peças, e sua Regra Comet (Onda 65) vale aqui como reforço da Etapa 3. `base-legislacao-fontes-primarias` cobre as citações normativas, fora do escopo desta auditoria. `ingest-tema-base-inss` deve consultar o catálogo complementar antes de registrar tema novo, para não recriar quarentena de item já verificado.

## 8. O que NÃO está nesta skill

Revisão de petição individual (é da `base-revisao-peticao-aprofundada`). Verificação de texto de lei, decreto ou portaria (é da `base-legislacao-fontes-primarias`). Atualização de status do catálogo curado (rotina própria da `base-precedentes-catalogo-vinculantes`).
