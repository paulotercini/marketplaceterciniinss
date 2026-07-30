---
name: pesquisa-jurisprudencia-chrome
description: Protocolo obrigatório de pesquisa de jurisprudência com o Claude in Chrome como via primária. Use SEMPRE que for preciso localizar, conferir ou citar acórdão, ementa, Tema, Súmula, Enunciado, PEDILEF, PUIL, IRDR, IAC, REsp ou RE, e sempre que o pedido mencionar pesquisar jurisprudência, buscar precedente, achar julgado, conferir tese, verificar redação literal, base textual do TRF3, jurisprudência unificada do CJF, TNU, STJ, STF, TRF4, TRU da 3ª Região ou súmulas do TRF3. Define a hierarquia de fontes, o passo a passo por base, a ficha de registro do achado e a marcação [CONFERIDO] ou [NÃO CONFIRMADO]. NÃO use para pesquisa de legislação em texto compilado, que sai direto do Planalto, nem para consulta processual de cliente.
---

# Pesquisa de jurisprudência, protocolo do escritório

## 1. Regra primária

Toda pesquisa de jurisprudência começa no **Claude in Chrome**, operando o formulário oficial do tribunal no navegador do Paulo. Os sistemas de busca dos tribunais dependem de POST com sessão e de JavaScript, e nenhuma raspagem automatizada do escritório executa esses formulários. Quem não abre a base oficial não está pesquisando jurisprudência, está garimpando índice de terceiro.

Firecrawl e SearXNG entram como apoio, nunca como fonte final da citação.

## 2. Hierarquia de fontes

**Nível 1, Claude in Chrome.** Base oficial do tribunal, formulário preenchido, resultado lido na tela e inteiro teor aberto. É o único nível que autoriza a marca [CONFERIDO].

**Nível 2, Firecrawl local mais SearXNG.** Serve para localizar candidatos rápido (`firecrawl_search` com operador `site:`) e para converter em markdown limpo um inteiro teor cuja URL já é conhecida (`firecrawl_scrape`). O achado nasce como [NÃO CONFIRMADO] e só muda de status depois de aberto no Nível 1.

**Nível 3, catálogo do escritório.** `base-precedentes-catalogo-vinculantes` e o CATALOGO-COMPLEMENTAR-VERIFICADO valem como conferência prévia de redação literal e de status. Se o item já está lá com redação verificada e data, não há necessidade de repetir a busca, basta conferir se houve mudança de status.

Ordem de consulta por origem do precedente, vinculantes de STF, STJ e TNU antes de TRF3, e TRF3 antes de qualquer outro Regional. Julgado de outro TRF entra só como persuasivo e vai sinalizado como tal na peça.

## 3. Fluxo padrão

1. Definir a pergunta de pesquisa em uma linha, com o agente nocivo, o benefício, o dispositivo ou a tese em disputa.
2. Checar o catálogo do escritório antes de abrir o navegador.
3. Abrir a base oficial no Chrome e rodar a consulta.
4. Ler a ementa inteira, não o trecho do resultado. Ementa favorável com dispositivo contrário é armadilha frequente.
5. Abrir o inteiro teor e confirmar relator, órgão julgador, data de julgamento, data de publicação e resultado.
6. Preencher a ficha da seção 7.
7. Marcar [CONFERIDO] e só então levar para a peça.

## 4. Bases e caminhos

### 4.1 TRF3, base textual (prioritária, nossa região)

Endereço `https://web.trf3.jus.br/jurisprudencia/`, título da página "Busca Jurisprudência". Conferido.

Três acervos separados, e o padrão da página é acórdãos. Monocráticas ficam em `https://web.trf3.jus.br/jurisprudencia/home/index/2` e Turmas Recursais (JEF) em `https://web.trf3.jus.br/jurisprudencia/home/index/1`. Em matéria de JEF, consultar os três, porque a Turma Recursal decide o que o segurado vai receber na prática.

Campo de pesquisa livre `txtPesqLivre`, limite de 255 caracteres. O formulário posta em `/jurisprudencia/Home/ResultadoTotais`.

Campos da pesquisa avançada, todos conferidos no formulário, `numero` (número do processo), `data_inicial` e `data_final` (com escolha entre publicação e julgamento), `numclasse`, `ementa`, `indexacao`, `legislacao`, mais os seletores de relator, classe processual e órgão julgador. Os campos de ementa, indexação e legislação não aceitam conectores.

Operadores aceitos na pesquisa livre, conforme a própria página, `"..."` para expressão exata, `e`, `ou`, `adj`, `não`, `prox`, `mesmo`, `com` e `$` para truncamento. O operador padrão é `e`.

Resultados por página, 10, 30 ou 50. Em pesquisa ampla, subir para 50 e marcar a lista resumida para varrer ementas mais rápido.

Inteiro teor de acórdão abre no padrão `https://web.trf3.jus.br/acordaos/Acordao/BuscarDocumentoGedpro/{id}`. Esse endereço é estável e pode ser raspado depois pelo Firecrawl local, o que serve para arquivar o texto na pasta do cliente.

Consulta de partida sugerida para tempo especial, expressão exata do agente combinada com o dispositivo, por exemplo `"ruído" e "Tema 555"` ou `"agente nocivo" adj hidrocarbonetos`.

### 4.2 Súmulas do TRF3

`https://www.trf3.jus.br/diretoria-geral/biblioteca/setor-de-apoio-a-jurisprudencia/sumulas-do-trf3`, respondeu 200 e é repositório oficial. Conferido. Antes de citar súmula regional, conferir aqui o texto e se está cancelada.

### 4.3 CJF, Jurisprudência Unificada e TNU

Portal de consultas do CJF em `https://jurisprudencia.cjf.jus.br/`, que reúne Jurisprudência Unificada, TNU, TRF1 e Colegiado do CJF.

Jurisprudência Unificada em `https://www2.cjf.jus.br/jurisprudencia/unificada/`, respondeu 200. Conferido.

TNU em `https://jurisprudencia.cjf.jus.br/tnu`, com aviso da própria base de que julgados a partir de julho de 2017 estão em `https://eproctnu-jur.cjf.jus.br`. Para PEDILEF e PUIL recentes, ir direto na base nova, sob pena de conclusão errada por acervo incompleto.

Página institucional da TNU em `https://www.cjf.jus.br/cjf/corregedoria-da-justica-federal/turma-nacional-de-uniformizacao/jurisprudencia-1`, útil para representativos e temas.

### 4.4 STJ

Porta de entrada em `https://www.stj.jus.br/sites/portalp/paginas/Sob-medida/Advogado/Jurisprudencia/Pesquisa-de-Jurisprudencia.aspx`, que reúne acórdãos, súmulas, decisões monocráticas, Informativo e Pesquisa Pronta.

Base de acórdãos em `https://scon.stj.jus.br/SCON/` e íntegra em `https://processo.stj.jus.br/SCON/acordaos/`.

Tema repetitivo exige a redação literal da tese e a situação do trânsito. Nunca citar tese de repetitivo por resumo de portal jurídico.

### 4.5 STF

Pesquisa de jurisprudência e pesquisa de repercussão geral são bases distintas, e a tese do tema vinculante sai da segunda. Confirmar os dois endereços no primeiro uso pelo Chrome, partindo de `portal.stf.jus.br`, e registrar aqui o link exato. Enquanto não confirmado, tratar como pendência da seção 9.

### 4.6 TRF4

`https://jurisprudencia.trf4.jus.br/pesquisa/pesquisa.php`, respondeu 200. Conferido. Usar como persuasivo, sinalizando na peça que é de outra Região, e apenas quando o TRF3 for omisso ou desfavorável.

### 4.7 TRU da 3ª Região

Endereço de consulta a confirmar no primeiro uso pelo Chrome, a partir do portal do TRF3 na área das Turmas Recursais. Não citar acórdão de TRU sem abrir a fonte, porque a numeração de incidentes se confunde com a de PEDILEF.

## 5. Quando o Chrome não é o caminho

Legislação em texto compilado sai do Planalto. Norma infralegal do INSS sai do portal do INSS ou do Diário Oficial. Consulta processual de cliente segue o fluxo do PJe e do Meu INSS, com as skills próprias. Conversão de um inteiro teor já localizado em markdown para arquivo da pasta do cliente sai pelo Firecrawl local, que faz isso melhor e sem ocupar o navegador.

## 6. Marcação obrigatória

[CONFERIDO] só depois de abrir a fonte oficial e ler a ementa e o dispositivo. Registrar data da conferência.

[NÃO CONFIRMADO] para tudo que veio de busca indireta, de portal jurídico, de resumo ou de memória. Item nesse estado não entra no corpo da peça, fica na quarentena "A CONFERIR — NÃO USAR" do Modelo Ouro.

Precedente cancelado, suspenso, superado ou sem tese firmada não se cita como vigente, e a situação vai anotada mesmo quando o julgado for citado por contexto histórico.

Não existe citação por conveniência. Sem fonte aberta, a resposta é "Não localizado".

## 7. Ficha do achado

Registrar em uma linha por precedente, para colar na peça e no catálogo.

`Tribunal | Órgão julgador | Classe e número | Relator | Julgamento DD.MM.AAAA | Publicação DD.MM.AAAA | Tese em uma frase | URL do inteiro teor | Status [CONFERIDO] em DD.MM.AAAA`

## 8. Falhas conhecidas e contorno

Formulário do TRF3 não responde a raspagem automatizada. O Firecrawl self-hosted recusa interação com página, erro `SCRAPE_ACTIONS_NOT_SUPPORTED`, porque depende do Fire Engine, componente fechado. Confirmado em teste. Por isso o Chrome é primário.

STJ e STF bloqueiam raspagem simples, retornaram erro no Firecrawl local. Confirmado em teste. No Chrome funcionam normalmente.

Busca por índice de terceiro devolve rede social e portal de escritório no topo. Confirmado em teste com o SearXNG local. Nunca citar a partir desse tipo de resultado.

Sessão do TRF3 expira. Se a lista de resultados vier vazia depois de um tempo parado, recarregar a página inicial e refazer a consulta em vez de insistir na paginação.

## 9. Pendências de validação

Confirmar no primeiro uso e atualizar esta skill, o endereço exato da pesquisa de jurisprudência e da pesquisa de repercussão geral do STF, o endereço de consulta da TRU da 3ª Região, e o comportamento da base nova da TNU em `eproctnu-jur.cjf.jus.br`.
