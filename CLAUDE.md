# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este repositório

Sistema do escritório de advocacia previdenciária Paulo R. Tercini Filho, com três partes independentes:

1. **Site institucional** — `build_site.py` lê `site_content/*.json` e gera `docs/*.html` (páginas de benefícios).
2. **Portal do cliente** — `docs/portal/` (app estático). O cliente informa CPF + data de nascimento; `app.js` deriva `PBKDF2-SHA256(cpf|dn, salt, iter)` → `SHA-256` → 16 bytes hex e busca `docs/portal/data/<hash>.json`. Não há backend. O repositório é público, por isso a ficha é **cifrada** (F122): do mesmo PBKDF2 saem o nome do arquivo e a chave AES-256-GCM (`derivar()` em `portal_common.py` e em `app.js`, vetor fixo em `tests/test_extracao.py`). Grave e leia fichas só por `gravar_ficha()`/`ler_ficha()`; nunca grave ficha em claro, nem CPF ou DN dentro dela. Ficha que não se decifra levanta `ValueError` e não é regravada (preserva os curados). `salt`/`iter` vêm de `docs/portal/data/_meta.json`. Os geradores exigem `pip install cryptography`.

   A **SITUAÇÃO ATUAL** que o cliente lê vem da **etapa declarada no CRM** (`casos.etapa`, F119),
   e não mais de dedução do último comentário. `portal_common.crm_do_cliente()` lê o Supabase por
   `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (as mesmas do `graph_refresh.py`) e devolve
   `{(cpf, lista): {"etapa", "fila", "fila_em"}}`. Três regras não podem ser quebradas: **somente
   leitura**, **só sai etapa do catálogo `ETAPAS_PUBLICAS`** (etapa escrita à mão no CRM fica no
   CRM, é a mesma barreira do `is_internal()`), e **sem banco o portal roda igual ao de antes**.
   Ao acrescentar etapa em `ETAPAS_POR_FASE` no `crm/fase2/app.html`, acrescente também em
   `ETAPAS_PUBLICAS`.

   A **fila** (F121) é a posição na ordem de julgamento do TRF3, lida do painel público por
   `crm/trf3_ordem.py` e gravada em `casos.trf3`. Não passa pelo catálogo porque é número, não
   texto livre, mas **só sai quando o caso está na fase judicial** (o dado pode ter ficado de uma
   fase anterior) e **viaja sempre com a data da consulta**, já que a posição anda.
3. **Base de conhecimento** — `_base-conhecimento-inss/` é um plugin Claude (134 skills jurídicas) versionado neste mesmo repo; atualizado por ondas (`.claude-plugin/plugin.json` tem a versão). Não misture mudanças do portal com ondas da base.

A fonte de dados dos geradores é o **Microsoft To Do** (Graph API, conta pessoal), onde cada tarefa é um cliente: título `Nome #CPF`, corpo com blocos datados `DD.MM.AAAA (Autor): texto` (mais novo no topo), checklist com aniversário.

## Dossiê do cliente (crm/fase2/dossie) — o que chega ao CRM

<!-- dossie-versao: 0.11.0 — ao mudar manifest.json da extensão, atualize esta seção e este número;
     tests em crm/fase2/dossie/testes/regras.test.js conferem que batem. -->

Extensão de navegador (versão **0.11.0**). Com o gov.br do cliente logado, um clique baixa os documentos
do portal aberto na aba; **🔁 Rodar todos os portais** percorre Meu INSS → e-Recursos → Emprega Brasil → HC →
Redesim, cada um na sua aba (abre as do gov.br que faltarem; Emprega Brasil e HC só se a aba logada já
estiver aberta), e o relato fica no popup. Não faz login, não resolve captcha e não decide nada: coleta e entrega.

**De onde coleta**
- **Meu INSS**: **dados cadastrais do CNIS** (PDF da tela "Dados Cadastrais" + `.txt`, e os campos já com o nome
  das colunas de `clientes` em `clientes.dossie.meuinss.cadastro`: `nome, cpf, dn, nome_mae, sexo, pis_nit, rg,
  rg_orgao, ctps[], titulo_eleitor, logradouro, bairro, cep, cidade, uf, naturalidade, nacionalidade, grau_instrucao,
  atualizado_no_cnis_em`. A própria extensão completa na ficha os campos **vazios** de `clientes` (dn, nome_mae,
  sexo, pis_nit, rg, rg_orgao, logradouro, bairro, cidade, uf, cep), como a F29 faz ao ler o PDF do CNIS, e nunca
  sobrescreve o digitado; telefone, e-mail e estado civil não vêm do CNIS; número/complemento vêm dentro de `logradouro`) · CNIS completo, resumido e ano civil · declaração de beneficiário · certificado da pessoa
  com deficiência · declaração de atividade · por benefício: carta de concessão, laudo médico e extrato
  de informações do benefício (dossiê) · extrato de pagamento dos últimos 12 meses · cópia integral de
  todos os pedidos administrativos (todos os anos) · PPP eletrônico por vínculo · CAT · CTC (se houver protocolo).
- **e-Recursos (CRPS)**: todos os documentos de cada recurso do cliente.
- **Emprega Brasil (MTE)**: CTPS digital e de outros vínculos, extratos RAIS e CAGED · **seguro-desemprego**
  (requerimentos, vínculo e parcelas com datas — `.txt` legível + JSON cru; a parcela **recebida dentro da graça**
  prova o desemprego e acresce 12 meses, mas o prazo continua contado da última competência, e não da última
  parcela: IN 128, art. 184, §§ 2º e 5º) · informe de rendimentos MTE por ano (PDF).
- **HC Ribeirão**: exames de imagem e de método de todo o período (sem exame de sangue), internações,
  relatórios médicos e multiprofissionais.
- **Redesim (Minhas Empresas)**: os CNPJs em que o CPF é sócio/titular/responsável, em **PDF da consulta**
  (o "Gerar PDF" do portal, montado no navegador sem captcha — a extensão o aciona) e em `.txt` (por CNPJ:
  nome empresarial, situação cadastral, matriz/filial, município/UF, vínculo do CPF, qualificação, capital
  social; sem data de abertura — ela só vem no comprovante) + JSON cru. A consulta exige hCaptcha: a extensão abre a tela e **a pessoa clica em PESQUISAR**;
  o comprovante de cada CNPJ também é protegido por captcha e fica de fora.
- **CadÚnico (Meu CadÚnico, gov.br)**: a **ficha completa** da família (PDF "exportar consulta completa"), o
  comprovante de cadastro e um `.txt` legível (estado cadastral, datas, renda total e per capita com faixa,
  integrantes com parentesco/nascimento/CPF/NIS, situação de rua, pendências) em `CadUnico\`. O resumo vai a
  `clientes.dossie.cadunico.familia` (`numero_familiar, estado_cadastral, condicao, municipio, cadastrada_em,
  atualizada_em, renda_total, renda_por_pessoa, faixa_renda_total, faixa_renda_por_pessoa, integrantes,
  pessoas_no_calculo_da_renda, situacao_de_rua, pendencias, membros[{id, nome, parentesco, nascimento, cpf, nis,
  responsavel, obito, estado}], beneficios_pagos[{tipo, especie, beneficiario, primeira_competencia, ultima_competencia,
  meses, valor_ultimo}]` (extrato do portal desde 2004: Bolsa Família, BPC, auxílios), `tarifa_social_energia,
  consignacoes, pendencias_detalhe, despesas{energia, aguaesgoto, gas, alimentacao, transporte, aluguel, medicamentos},
  renda_cnis[{nome, possui_remuneracao, competencia_referencia, beneficios_inss[{nb, especie, valor, dib}],
  total_beneficios, remuneracao_ultimo_mes, seguro_desemprego, outras_fontes, declarado{…}}]`) — é o grupo
  familiar, a renda per capita e o que cada integrante recebe (INSS, trabalho, SD) para o BPC, sem redigitar.
  Conferido ao vivo em 13.10.2026 (BPC Idoso de R$ 1.621 desde 04/2025, benefício do INSS com espécie e DIB).
- **Portal da Transparência (API de dados abertos, sem login, chave gratuita em ⚙)**: no fim do CadÚnico, para
  **cada integrante** (CPF/NIS do CadÚnico): BPC (com "concedido judicialmente" e representante legal), Bolsa
  Família novo e antigo, Auxílio Brasil, Auxílio Emergencial, Garantia-Safra, Seguro-Defeso — `.txt` em
  `Transparencia\` e `clientes.dossie.transparencia.pessoas[{nome, cpf, nis, programas[{programa, rotulo, meses,
  primeira_competencia, ultima_competencia, valor_ultimo, total, concedido_judicialmente, representante_legal,
  municipio}]}]`. Complementa o CadÚnico (histórico de pagamentos) e vale para quem ainda não tem o gov.br:
  o popup tem **🔎 Portal da Transparência (sem login)** — o colaborador digita o CPF/NIS e a extensão consulta
  a pessoa (e os integrantes que a ficha do CRM já conhecer, de `dossie.cadunico.familia.membros`).

**Onde entrega** (os três ao mesmo tempo)
1. **Drive**: `G:\Meu Drive\Processos\<Letra>\<Nome #CPF>\Dossie\<fonte>\<arquivo>.pdf`. Pasta existente
   vence (busca por `#CPF`, depois por nome sem acento); cliente novo ganha pasta capitalizada com `#CPF`.
   Fontes: `Cadastro`, `CNIS`, `Declaracao`, `Cartas de concessao`, `Laudos`, `Extrato do beneficio`,
   `Extrato de pagamento`, `Processos administrativos`, `PPP`, `CAT`, `CTC`, `Recursos\<NUP>`,
   `CTPS RAIS CAGED`, `HC Ribeirao\Exames|Internacoes|Relatorios`, `CNPJ`, `CadUnico`, `Transparencia`. Gravado pelo programa `host/dossie_host.py`
   (native messaging); sem ele, cai em `Downloads/Dossie/`.
2. **Tabela `anexos`**, uma linha por PDF presa ao **cliente** (`cliente_id` pelo CPF; sem caso nem
   andamento): `origem='dossie'`, `nome="<fonte> · <arquivo>"`, `caminho="dossie/<cpf>/<fonte>/<arquivo>"`
   no bucket privado `anexos`, `tipo=application/pdf` (ou `text/plain` para o `.txt` do seguro-desemprego). Caminho determinístico: rodar de novo substitui
   (upsert), não duplica. `texto` fica vazio — a extensão **não extrai texto**; é o pipeline do CRM
   (`textoDoDocumento`) que lê.
3. **`clientes.dossie` (jsonb, `schema_dossie.sql`)**: resumo de cada rodada, uma chave por portal
   (`meuinss`, `mte`, `recursos`, `hc`, `redesim`, `cadunico`, `transparencia`), e rodar um portal substitui só a chave dele:
   `{"em": ISO, "baixados": [...], "inexistentes": [...], "falhas": [...]}`.
   `inexistentes` é o que o portal **disse que não existe** (sem CTC, sem CAT, sem PPP, benefício sem laudo,
   "não possui deficiência") — fato negativo para a triagem; `falhas` é erro técnico, pede rodada nova.
   A ficha mostra isso na caixa "📂 Dossiê — o que os portais têm" (`caixaDossie` em `app.html`).

**O que o CRM faz com isso**: lê o `texto` uma vez (onda 0), **em partes** (F203): abrir a ficha lê só o que a Identificação usa (`dossieDaIdentificacao`: Cadastro, CNIS completo, declaração de beneficiário, RAIS e, enquanto faltar o estado civil, laudo e pedido); o resto só ao abrir Primeiro atendimento, Mapa ou Análise de Direito (`SUB_DOSSIE_TUDO`, `lerDossieTodo`), do menor para o maior, e passa por leitores puros (`lerCnisPdf`,
`lerCagedTexto`, `lerRaisTexto`, `lerLaudosTexto`, `lerCartaTexto`, `lerExtratoPagTexto`, `lerProcessoTexto`,
`lerResumoInssTexto`, `lerCatTexto`, `lerPppTexto`, `itemClinico`, `lerSeguroDesempregoTexto`, `lerCnpjsTexto`),
agrupados por `fontesDoDossie()`. O seguro-desemprego entra em `calcularGraca` (6º parâmetro) e aparece junto da
qualidade de segurado, no mapa e na conta dos Lembretes (`fatoSeguro`). Os CNPJs da Redesim viram o grupo `cnpj`
do mapa; a abertura, o MEI e o CNAE vêm da base pública `publica.cnpj.ws` (a mesma do site interno), só no clique
de "Consultar", só com o número do CNPJ no caminho, e a resposta fica na memória da sessão (`_cnpjWs`).
Da RAIS, `lerRaisTexto` lê também os afastamentos numerados sob "De Até Motivo"; a licença sem remuneração
(motivo 70) vira fato do grupo `contrib` (`licencasDaRais`), porque o CNIS conta o mês e o INSS tem descontado
o período, e a passagem do mapa à Análise de Direito leva a nota junto do tempo e da carência. A Análise de Direito
pede, por espécie, só os campos de `AD_CAMPOS_ESPECIE`; os demais ficam em "mostrar os outros campos".
Cada ponto do mapa vai à Análise de Direito salvo se tirado (`_mapaFora`, `mapaLevar`, só na sessão); o formulário
mostra os pontos levados em "Do primeiro atendimento" (`adTrazido`), marca cada campo como falta, do dossiê ou
informado (`adEstados`, `data-pre`) e diz para onde vai (`AD_VAI`); Documentos mostra o que falta na última
análise para a espécie (`docsDaAnalise`) com o botão de volta ao formulário.
A aba **Primeiro atendimento** (`painelPA`, F196) é o painel do protótipo aprovado: passos, trabalhos possíveis
(espécies com fato próprio no dossiê, `PA_GATILHO`), seis blocos da situação (`paDados`) com detalhe, fonte e linha do
tempo (`paLinhaDoTempo`), e o botão que leva os trabalhos marcados e os blocos levados à Análise de Direito
(`paIrAnalise`, `_paAnalise`, nav `.ad-trab`). Só lê; a escolha vale na sessão.
O **Novo Cliente** tem duas etapas (F197, `_ncl`): a 1 pede só CPF (único obrigatório), senha e telefone (F201: o nome vem do CNIS na etapa 2, ou do PAT em `_ncl.nomePat`) e abre os
portais do dossiê (`NCL_PORTAIS`); abrir um portal, o botão "Abrir as quatro guias" (`nclTodosPortais`) ou seguir cria a ficha (`nclEtapa1`), porque a extensão só prende o
dossiê a cliente que já existe pelo CPF. A 2 confere o que o dossiê trouxe (`nclPreencher`) e completa o cadastro;
concluir (`criarCliente`) leva à lista Escritório e avisa Amanda e Paulo (`quemAvisaClienteNovo`).
O Primeiro atendimento avisa quando o nome do CRM difere do nome do CNIS (`nomeDoCnis`, `nomeIgual`, F198), com o botão "Usar o nome do CNIS", que grava só no clique; `gravarCnisLido` passou a guardar `cnis.nome`, e a ficha antiga lê o nome do texto do CNIS do dossiê. No Novo Cliente, o telefone já vem com o DDD 16, o celular que começa com 9 sem nove dígitos gera aviso (`telRecado`), e o botão "Senha padrão" (`nclSenhaPadrao`) preenche a senha guardada no navegador, porque o CRM é página pública e a senha não entra no código.
A etapa 2 se preenche pelo dossiê (`cadastroDoDossie`, F199): nome e nascimento do CNIS, estado civil da qualificação do pedido ou do laudo, profissão pela ocupação (CBO) da RAIS mais recente; documento ainda sem texto é lido na hora. Estado civil e profissão não têm campo na etapa 2 (F200): só o dossiê os preenche (`_ncl.dz`), e sem ele a ficha fica como estava. A etapa 2 lê primeiro, e só, o `Cadastro · Dados cadastrais (CNIS).txt` da extensão (`lerCadastroTexto`, F202: nome, nascimento, sexo, endereço, bairro e CEP, sem abrir PDF); estado civil e profissão de pedido, laudo e RAIS ficam para a Identificação (`civilDoDossieCaixa`, grava no clique). Rua e cidade em caixa alta passam a caixa normal e o número colado na rua vai ao campo do número (`enderecoArrumado`); `dnIso` aceita também a data gravada em AAAA-MM-DD.
O leitor do seguro-desemprego aceita as parcelas nos dois formatos da extensão ("liberação · pagamento · valor" e
"programada · paga em · R$").
Da cópia do processo administrativo, `lerProcessoTexto` lê **só** a folha de interposição (pedido, data de
entrada, situação, NB, última atualização) e a comunicação de decisão (decisão, motivo, cessação). Despachos e
páginas em imagem não se leem, porque geram fato falso. A "Data:" da comunicação é a da **emissão da cópia**, e
não a da decisão: o prazo do recurso conta da última atualização do pedido concluído.
A aba **Mapa do dossiê** (`painelMapa`) afunila os fatos por espécie (`MAPA_FUNIL`, `MAPA_PONTOS`): cada
ramo é um ponto da triagem, a nota do ramo é a nota da triagem e vai à Análise de Direito. Fato mostra a
fonte e o botão "ver"; o que muda o caso (DCB, prazo, perícia, desemprego) só com clique e gera andamento
com a fonte. `clientes.dossie.<portal>.inexistentes` é fato negativo; `.em`, a idade do dossiê.

A ficha **adota o dossiê do seu CPF** (`adotarDossie`, F204): ao abrir a ficha ou a etapa 2, os anexos `dossie/<cpf>/…` presos a outra ficha (refeita ou sem CPF) passam a ela, e o resumo `clientes.dossie` da ficha anterior vem junto quando ela não tem o seu, porque a extensão, rodada de novo, não troca o dono da linha.

Sem atendimento aberto, a ficha não mostra Primeiro atendimento nem Mapa (F205); o "+ atendimento", à direita, abre o atendimento já no Primeiro atendimento. Com atendimento aberto, Primeiro atendimento, Mapa, Análise de Direito e Documentos abrem em **tela cheia** (`ATEND_SUBS`, `#detalhe.atend-tela`, F206), sem o topo da ficha e com o cabeçalho do protótipo (`cabecalhoAtendimento`, F208: nome, CPF, nascimento e idade, telefone, senha do Meu INSS, WhatsApp e os quatro passos, inclusive a Identificação), e "Sair do modo atendimento" (`sairModoAtendimento`), que registra na Análise de Direito o que foi preenchido. Com mais de uma análise, as datas aparecem em quadrados (`_adSel`). O painel do Primeiro atendimento tem fundo bege (#F3F2EE) com os quadros em branco. A situação fica à esquerda e os trabalhos à direita (F207); cada bloco tem um interruptor "Análise de Direito"; os blocos fixos são Qualidade, Carência, CNIS, RAIS e CAGED (tabela dos vínculos com saída em aberto e licença, `vinculosRaisCaged`), CNPJs, Pedidos, Planejamento e Não encontrado no dossiê (`paFaltas`, F213); os trabalhos possíveis saíram do Primeiro atendimento e ficam no topo da Análise de Direito (`painelTrabalhos`); além deles, nascem Benefícios, Saúde, PPP e CAT e CadÚnico quando o dossiê traz fato deles (`PA_BLOCOS_EXTRA`, `blocosDoPA`); com aposentadoria em manutenção (`aposentadoriaAtiva`), incapacidade, aposentadorias, B94 e BPC aparecem como Impedido (`PA_IMPEDE`, art. 124 e art. 86, § 2º, da Lei 8.213/91).

A **Análise de Direito explora o que o Primeiro atendimento levou** (`exploracaoDireito`, F214): a qualidade de segurado em painel com perdas e reingressos (`historiaQualidade`: o último trecho é o de `calcularGraca`, os anteriores estimados pelo art. 15); CNIS, RAIS e CAGED em Vínculos (`vinculosComparados`, licença em vermelho) e Remunerações (`remuneracoesComparadas`: o maior em verde, abaixo do mínimo em vermelho, sem remuneração apontado), cada aba com a chave "Só o divergente"; as competências e os indicadores por competência vêm do PDF do CNIS, lido na sessão (`carregarCnisComps`, `competenciasDaLinha` guarda `ind`); os CNPJs com Consultar e Inteiro teor. F215: a chave "Só o divergente" abre ligada; remunerações desde 07/1994; quadros de facultativo de baixa renda (5 %), MEI e facultativo ou individual a 11 % (`CAT_CONTRIB`, pela alíquota que `competenciasDaLinha` tira da razão contribuição/salário), com os meses e a chave da tabela; a qualidade abre no resumo (última competência e até quando se mantém) e o histórico no botão; repintar na mesma tela preserva a rolagem e os `<details>` abertos (`repintarFicha`). F216: "Pedidos ao INSS" junta protocolo, NB e laudo médico pericial (`pedidosAoInss`), com DER e resultado em bolinha, e a chave "Só os indeferidos"; Saúde virou Documentação HCRP e PPP virou PPP eletrônico. Embaixo, "Minhas considerações" (gravadas em `clientes.campos.consideracoes`), que aparecem no quadro fixo da direita junto dos trabalhos possíveis.

A **análise por benefício** (F217, `crm/fase2/docs/ANALISE-POR-BENEFICIO.md`): a faixa "Benefícios em análise" (`faixaBeneficios`), no Primeiro atendimento e na Análise de Direito, tem um chip por família de `PONTOS_ESPECIE`; o chip ligado abre as opções da família (`BENEF`: opção, rótulo, espécie, subespécie, módulos), e cada opção abre na Análise de Direito só os quadros que o benefício pede (`MOD_AD`, na ordem de `MOD_ORDEM`, montados por `modulosDireito`): o BPC do deficiente abre deficiência e renda, sem tempos nem especial; o auxílio-acidente abre qualidade, incapacidade e nexo. O quadro **Tempos de contribuição** (`caixaTempos`) tem uma linha por período com natureza (comum, rural, especial, com deficiência, magistério, RPPS, militar, aluno-aprendiz) e o detalhe que a natureza pede; conta pelo calendário, uma só vez o período sobreposto (`durCal`, `uniaoDias`, `admTotais`), converte o especial anterior a 13/11/2019 (×1,40 H, ×1,20 F) e dá o total comum; "Trazer do CNIS" (`admTemposDoCnis`) deixa o benefício de fora e fecha o vínculo sem saída no mês da última remuneração e o tempo em 13/11/2019 que as regras de transição usam. A escolha e os campos vivem em `clientes.campos.ad_modulos` (`admSalvar`, PATCH com atraso) e entram em cópia em `analises_direito.detalhes.modulos` (`admSnapshot`). O cartão "Levar à Análise de Direito" e o chip são a mesma escolha (`paEscolher` → `benefFam`). Os requisitos numéricos (`IDADE_EXIG`, `CAR_EXIG`, `SM_2026`, `ADM_CALC`) vêm das skills da base e não foram conferidos em fonte oficial; a tela avisa. Teste com pontuação: `testes/cadastro/f217.js` (exige mais de 95/100).

O **card da aposentadoria futura** (F218, onda 1 de `crm/fase2/docs/INTEGRACAO-ATENDIMENTO.md`): o acervo é a tabela `lembretes` (tipo `aposentadoria_futura`), que a sincronização `crm-sync.yml` cria a partir da lista 🙏 Aposentadorias Futuras do To Do e **substitui `detalhes` inteiro a cada rodada**; por isso o que o CRM grava no card vive na coluna `lembretes.crm` (`schema_lembretes_crm.sql`: etapa, `data_direito` e `data_fonte`, `precaso_id`, `caso_id`, motivo), por `cardGravar`, e nunca em `detalhes`. O `migrar.py` passou a levar o checklist da tarefa a `detalhes.checklist` (sem senha, CPF e telefone), porque é lá que o Paulo anota a data provável da aposentadoria; `dataDireitoDoCard` lê, nesta ordem, `crm.data_direito`, o checklist e a anotação mais recente que fala em aposentar numa data (`dataFuturaNoTexto`: dd/mm/aaaa ou mm/aaaa, de 2013 em diante). A etapa (`etapaDoCard`: monitorando, em atendimento, analisado, pronto para protocolar, virou caso, arquivado) vem de `crm.etapa` ou do lembrete vencido. Na aba Lembretes o card ganha o cabeçalho `cabCard` (etapa, data provável com a fonte e correção, "Abrir atendimento", que cria o pré-caso com `lembrete_id` e abre a Identificação em tela cheia, "Gerar o caso", que escolhe a espécie no catálogo e passa por `gerarCasoDoPre` desligando o card, e "Arquivar…" com motivo). A lista lateral "Aposentadorias futuras" lê os cards (`renderCardsApos`, horizontes vencidos, 90 dias, um ano, depois), e não os casos da fase, que estão todos encerrados. Teste: `testes/cadastro/f218.js`.

A **integração do atendimento** (F219, ondas 2 a 5 de `crm/fase2/docs/INTEGRACAO-ATENDIMENTO.md`): o pré-caso guarda `etapas.<identificacao|pa|analise|documentos> = {em, quem}` e `desfecho`; "Concluir esta etapa" (`concluirEtapa`, no cabeçalho do modo atendimento) grava, avisa pelo `avisarClienteNovo` e abre o passo seguinte; `preCasoAberto(c)` é o último pré-caso vivo. `salvarAnalise` devolve ao pré-caso a espécie da análise e `etapas.analise`, e ao card ligado (`cardDaAnalise`) a etapa analisado, `crm.data_direito`, `proximo_em` em D-60 (`avisoDocs`) e o aviso D-90 em `aposentadorias`. `etapaDoCard` deriva Documentação (lembrete vencido) e Pronto (direito alcançado). O quadro **Desfecho** (`quadroDesfecho`, `baseDesfecho`, `DESF_IMEDIATO`) está na Análise de Direito e em Documentos: criar ou atualizar o card, gerar o caso, arquivar com motivo (`campos.pc_arquivados`). **Documentos** abre em seis quadros (`painelDocumentosAtend`): assinar, para o cliente providenciar (catálogo `DOC_CAT` × dossiê por `DOC_FONTE`/`docsContraDossie`), já temos no dossiê, guias por espécie (`GUIAS_ESPECIE`, só o que a base sustenta), gerados e assinados (`guardarDocGerado`, `anexarAssinado`, bucket `gerados/` e `assinados/`) e desfecho. Com etapa concluída no modo atendimento, a mesa antiga das Anotações recolhe documentos, análise e decisão. `crm/docs_catalogo.py` compara o catálogo com `site_content` (`--aplicar` grava; aplicado na F220, com `lista_do_site` = itens-base mais os primeiros extras, até oito). Teste com pontuação: `testes/cadastro/f219.js`.

A **F220** (teste por persona e organização dos casos): **organizar os casos do cliente** (`organizarCasos`, aberto pelo Casos ▾, pela escolha do processo, pelos números da linha do caso e pela fila "Clientes com mais de um caso aberto" do 🧹 Cuidar do acervo, `blocoVariosCasos`): cada caso mostra NB, protocolo, recurso (NUP) e processo (`numerosDoCaso`); `moverNumero(tipo, dígitos, de, para)` leva o número com os andamentos dele (PJe pelo CNJ, CRPS pelo `origem_id` `<nup>|`, PAT pelo protocolo), os documentos e as tarefas desses andamentos, o bloco do e-Recursos, o `datajud_multi` e os `prazos_tribunal`; as sugestões (`sugestoesOrganizar`) saem do número repetido e do NB citado nos textos (`nbsCitados`, `textosDoCliente`); juntar = `fundirCasos`. As decisões do CRM ficam em `casos.arquivados` e o `migrar.py` as respeita (`aplicar_marcas_do_crm`): `mov:<nb|proc|prot>:<dígitos>` tira o número do caso de origem, `add:prot:<dígitos>` mantém o protocolo acrescentado no CRM (o upsert apagava; `corpoProtocolos` grava a marca em todo escritor de protocolo) e `fundido` mantém a casca encerrada; `respeitar_movidos` mantém a fase do `mover_para` até o To Do alcançar. **Prazos**: `recorrerAte` só nas fases INSS e Conselho, some com RO/RE/ED protocolado depois da decisão ou com decisão favorável (`resultado = deferido`); a decisão encerra a exigência; `prazoMora` mostra o prazo de análise do acordo do RE 1.171.152 (`MORA_DIAS`). O Protocolo leva o caso do Escritório ao INSS. **Atendimento**: Primeiro atendimento sempre aberto no modo atendimento (sem dossiê, `.pa-sem-dz` com o relato), `benefSel` cai no benefício do pré-caso ou da análise (`opcaoDe`), "Conversa da equipe" (`conversaAtendimento`, `notaDoAtendimento`, @nome vira menção), Desfecho pergunta antes de gerar o caso sem procuração e contrato (`docsGeradosDo`) e pede a via da incapacidade (`viaDoDesfecho`); Documentos fica visível com caso em andamento; a menção leva ao caso ou ao atendimento (`abrirCasoDaMencao`, `abrirAtendimentoDe`). **Barra por cargo** (`LISTAS_POR_CARGO`, `listasDoColab`; cargo `recepcao` aceito no banco). **Matérias**: PcD por idade (`pcd_idade`, art. 311 da IN 128), isenções de carência (art. 196), baixa renda do auxílio-reclusão (art. 383, campos só da opção, 5º elemento do campo), regras da aposentadoria especial (arts. 260 a 262) com a ADI 6309, CTC do RPPS pelo art. 70, anexos da IN 128 com o artigo (`ANEXOS_IN128[2]`). `section.ben` (o `.ben` solto deformava todo `.chip.ben`). **Ponte estreita** CRM → To Do: `crm/fase2/ponte_cards.py` conclui no To Do a tarefa do card arquivado ou que virou caso (passo do `crm-sync.yml`, desliga com `PONTE_CARDS=0`). Teste com pontuação: `testes/cadastro/f220.js` (banco simulado de estado `banco-simulado.js`).

A **F221** (os casos do mesmo benefício organizados pelos documentos, o repasse em um clique e a incapacidade): cada número (protocolo, NUP, processo) ganha o NB de que trata pela **evidência dos documentos** (`evidenciaNbs`, `nbDoNumero`): a petição inicial pesa 5, o "SUB - NB:" do histórico juntado no e-Recursos pesa 5, sentença, acórdão e comunicação de decisão pesam 3, e o documento que lista todos os NBs (dossiê, CNIS, HISCRE, Plenus) não conta (`pesoDoDoc`, `RX_DOC_LISTA`); o documento do e-SAJ e do PAT, que não tem andamento, chega ao número pelo caminho do arquivo (`numDoAnexo`). Com a evidência, `planoOrganizar` monta o plano do cliente: os números do mesmo NB vão ao caso mais adiantado (Judicial, Conselho, INSS, Escritório, `ORDEM_FASE_ORG`), o NB vai junto, o caso do To Do que ficou sem número se junta ao destino, e o NB sem caso é anotado; dois NBs sem folga, o NB contrário ao do caso e o mesmo NB em dois casos viram "Precisa de você", com um botão por NB (`resolverDuvida`). `aplicarPlano` grava o registro em `clientes.campos.org_auto` (os três últimos) e `desfazerOrganizacao` volta do último ao primeiro passo; a fusão guarda o que pôs no destino (`registro.volta`) e `desfazerFusao` o tira. Em lote, "Organizar todos pelos documentos…" no 🧹 Cuidar do acervo (`organizarTodos`, `dadosDoCliente`, `pintarLoteOrg`, `aplicarLoteOrg`) lê cada cliente de vários casos, mostra os prontos, os que precisam de você e os sem pista, e só aplica nos marcados. O **repasse**: no topo das abas INSS, Recurso e Judicial, o número cujo NB é de outro caso avisa e leva (`avisoNumeroFora`, `nbForaDoCaso`); cada NUP e processo tem o chip do NB e o seletor "levar a outro caso…" (`chipNbNumero`, `selLevarNumero`, `levarNumero`); toda anotação tem "Levar a outro caso…" no ⋯ (`itemLevarAndamento`, `moverAndamento`, `levarAndamento`, com respostas, documentos e tarefas). `moverNumero` leva também os documentos do e-SAJ e do PAT pelo caminho. A **linha da incapacidade** (`faixaIncapacidade`, `linhaIncapacidade`, `proximosDoCaso`), na visão do caso e na janela de organizar, põe em ordem de data um item por NB (casos, benefícios do CNIS, cartas e laudos do dossiê; o caso sem NB entra pelo NB dos documentos), com período, situação, casos, números e o próximo passo; o resumo nunca anuncia passo que já passou, e a DCB vencida só avisa no pedido ao INSS. O quadro de prazos não dá o pedido de prorrogação por vencido com a janela aberta: a linha da DCB diz que se pede até ela. O **prazo de análise** (`prazoMora`) segue o acordo do RE 1.171.152 por espécie (`MORA_DIAS`): incapacidade temporária e permanente 45 dias e auxílio-acidente 60, contados da perícia feita (`MORA_PERICIA`, sem perícia o prazo não corre), e a exigência suspende a contagem, que recomeça na entrega com o restante, nunca menos de 30 dias (`suspensoesDoCaso`). Teste com pontuação: `testes/cadastro/f221.js`.

**Limites**: cliente sem ficha → PDF só no Drive. Nada do dossiê vai ao portal público do cliente.
Instalação e teste em `crm/fase2/dossie/COMO-INSTALAR.md`.

## Comandos

```bash
# Autenticação Graph (tokens ficam em graph_tokens.json, fora do git)
python3 graph_devflow.py     # primeiro login (device flow) — interativo
python3 graph_refresh.py     # renova o access token (expira em ~1h) — rode antes de qualquer gerador

# Geradores do portal (regeneram docs/portal/data/*.json)
python3 build_portal_listas.py             # listas 🌻 INSS, 👪 Judicial, 🖥 Conselho de Recursos, 🗓 Tarefas com Prazo
python3 build_portal_listas.py --validate  # compara extração vs. fichas publicadas, sem gravar
python3 build_portal_escritorio.py         # lista 🙋 Escritório (status inferido, sem timeline)

# Site institucional
python3 build_site.py        # site_content/*.json -> docs/*.html

# Testes (puros, sem rede/tokens)
python3 -m pytest tests/ -q
python3 -m pytest tests/test_extracao.py -q -k pericia   # um grupo específico

# Deploy: push na main tocando docs/** dispara .github/workflows/deploy-pages.yml (GitHub Pages)
# Portal publicado: https://paulotercini.github.io/marketplaceterciniinss/portal/
```

Desenvolva na branch de feature designada e faça merge na `main` para publicar. A `main` recebe pushes de outras sessões (ondas da base de conhecimento) — sempre `git fetch origin main` e merge antes do push.

## Arquitetura da extração (build_portal_listas.py)

Pipeline por tarefa: `split_blocks(body)` quebra em blocos datados → `headline()` pega a primeira linha relevante do bloco (resolvendo rótulos como "Último andamento:" para a linha seguinte) → `is_internal()` descarta ruído e notas internas → `pericia_evento()` ou `classify()` (REGRAS, da mais específica à mais genérica, casamento por palavra inteira) → evento canônico com data.

Invariantes que NÃO podem ser quebradas:

- **Classifique só o cabeçalho do bloco**, nunca o corpo inteiro — o corpo carrega histórico colado do sistema e gera falsos eventos na data errada.
- **`is_internal()` é a barreira de privacidade**: instruções à equipe ("Amanda, faz..."), imperativos ("agendar", "manifestar"), ouvidoria, senha gov.br e ruído ("sem alteração", "em análise") jamais viram conteúdo público. Corpos de tarefa contêm CPFs, senhas e dados médicos — nenhum texto bruto do To Do pode ir para as fichas.
- **`ALTA_CONFIANCA`** filtra quais tipos de evento aparecem na timeline pública; tipos ambíguos (ex.: "Manifestação") existem em REGRAS mas são suprimidos.
- **Proveniência por processo**: cada processo numa ficha tem `origem: "curado"` (escrito à mão — NUNCA regenerar/tocar) ou `origem: "auto"` (regenerável a partir do To Do). Os geradores preservam curados e só reescrevem autos.
- **`infer_status()` (escritorio) decide pela nota MAIS RECENTE**, não pelo histórico; gatilhos de "aguardando cliente" são propositalmente específicos — termos soltos já causaram falso "falta documento" na ficha de cliente.
- **Merge não-destrutivo**: `build_portal_escritorio.main()` só atualiza a `localizacao` do processo Escritório e preserva os processos das demais listas.
- Funções compartilhadas pelos dois geradores (`digits`, `cpf_from_task`, `dn_from_items`, `derivar_hash`, `split_blocks`...) vivem em `portal_common.py` — não recopie.

`graph_client._req` já faz retry/backoff para erros transitórios de rede/SSL e 429/5xx; os crawls completos do To Do levam vários minutos.

## Scripts auxiliares

- `audit_build_cache.py` + `audit_stage1..6_*.py` + `audit_generate_excel.py`: auditoria das tarefas do To Do; cache em `/tmp/audit_cache.json` (dados sensíveis, nunca commitar).
- `dou_rotina.py`: monitor diário do DOU (roda no workflow `dou-monitor.yml`), cria tarefas no To Do.
- `triagem.py`, `inspect_tasks.py`: utilitários de inspeção/triagem das tarefas.

## Testes

`tests/test_extracao.py` é uma suíte de regressão com os bugs reais já corrigidos (falso "Ação judicial" por substring, falso indeferimento por classificar o corpo inteiro, vazamento de notas internas, falso "falta documento" por nota antiga). Ao mexer em REGRAS, `is_internal`, `headline`, `pericia_evento` ou `infer_status`, rode a suíte — e acrescente um caso-ouro para cada novo bug corrigido.
