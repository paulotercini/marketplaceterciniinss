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

<!-- dossie-versao: 0.8.6 — ao mudar manifest.json da extensão, atualize esta seção e este número;
     tests em crm/fase2/dossie/testes/regras.test.js conferem que batem. -->

Extensão de navegador (versão **0.8.6**). Com o gov.br do cliente logado, um clique baixa os documentos
do portal aberto na aba; **🔁 Rodar todos os portais** percorre Meu INSS → e-Recursos → Emprega Brasil → HC →
Redesim, cada um na sua aba (abre as do gov.br que faltarem; Emprega Brasil e HC só se a aba logada já
estiver aberta), e o relato fica no popup. Não faz login, não resolve captcha e não decide nada: coleta e entrega.

**De onde coleta**
- **Meu INSS**: CNIS completo, resumido e ano civil · declaração de beneficiário · certificado da pessoa
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

**Onde entrega** (os três ao mesmo tempo)
1. **Drive**: `G:\Meu Drive\Processos\<Letra>\<Nome #CPF>\Dossie\<fonte>\<arquivo>.pdf`. Pasta existente
   vence (busca por `#CPF`, depois por nome sem acento); cliente novo ganha pasta capitalizada com `#CPF`.
   Fontes: `CNIS`, `Declaracao`, `Cartas de concessao`, `Laudos`, `Extrato do beneficio`,
   `Extrato de pagamento`, `Processos administrativos`, `PPP`, `CAT`, `CTC`, `Recursos\<NUP>`,
   `CTPS RAIS CAGED`, `HC Ribeirao\Exames|Internacoes|Relatorios`, `CNPJ`. Gravado pelo programa `host/dossie_host.py`
   (native messaging); sem ele, cai em `Downloads/Dossie/`.
2. **Tabela `anexos`**, uma linha por PDF presa ao **cliente** (`cliente_id` pelo CPF; sem caso nem
   andamento): `origem='dossie'`, `nome="<fonte> · <arquivo>"`, `caminho="dossie/<cpf>/<fonte>/<arquivo>"`
   no bucket privado `anexos`, `tipo=application/pdf` (ou `text/plain` para o `.txt` do seguro-desemprego). Caminho determinístico: rodar de novo substitui
   (upsert), não duplica. `texto` fica vazio — a extensão **não extrai texto**; é o pipeline do CRM
   (`textoDoDocumento`) que lê.
3. **`clientes.dossie` (jsonb, `schema_dossie.sql`)**: resumo de cada rodada, uma chave por portal
   (`meuinss`, `mte`, `recursos`, `hc`, `redesim`), e rodar um portal substitui só a chave dele:
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
