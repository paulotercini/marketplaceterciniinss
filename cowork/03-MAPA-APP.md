# Mapa do `crm/fase2/app.html`

Índice navegável de um arquivo de **18.702 linhas** — 916 funções, um
`<style>`, um `<script>` e o HTML no meio. Gerado por
`cowork/mapa_app.py`, que lê o arquivo e extrai tudo: faixas de linha, funções,
chamadas ao banco, seletores, estado global e injeções de estilo. **Rodar de
novo depois de mexer no app refaz o mapa** — não edite este arquivo à mão:

```
python3 cowork/mapa_app.py
```

Levantado com o app na versão **09.00**.

## As cinco faixas do arquivo

| Faixa | Linhas | O que tem |
|---|---|---|
| Cabeçalho e `<style>` | 1–1912 | tokens, reset e todo o CSS por componente |
| HTML do login | 1916–1949 | a tela de e-mail e senha |
| HTML do app | 1950–2016 | a moldura: barra, coluna do meio, ficha, modais |
| `<script>` | 2017–18700 | **16.683 linhas** — o sistema inteiro |
| `<style>` de impressão e extras | 16987–17006 · 18275–18279 · 18365–18375 | folhas menores no fim do arquivo |


## CSS, seção por seção

As faixas vêm dos comentários `/* ── título ── */` que o próprio arquivo usa.

| Linhas | Seção |
|---|---|
| 42–105 | login |
| 106–412 | MENU RECOLHIDO |
| 413–620 | a pauta |
| 621–651 | F42 · A CONVERSA DO CASO |
| 652–803 | Fatos do benefício |
| 804–864 | compositor: escrever primeiro, Registrar por último |
| 865–892 | apagar o próprio comentário |
| 893–1126 | arquivos do processo |
| 1127–1137 | importar do PAT/GERID |
| 1138–1301 | F9 · CADASTRO: grade de 12 colunas |
| 1302–1320 | F10 · TRIAGEM |
| 1321–1430 | o fecho do atendimento |
| 1431–1600 | F12 · RAIZ E RAMOS |
| 1601–1713 | CELULAR |
| 1714–1766 | F8 · FICHA EM DUAS COLUNAS (protótipo aprovado) |
| 1767–1782 | F8 · COMPOSER ENXUTO |
| 1783–1801 | F55 · a mesa que se arruma sozinha |
| 1802–1824 | F55 · o rodapé da anotação em cápsulas com pergunta |
| 1825–1835 | F56 · a data "volta em" à vista (o Concluir em do To Do) |
| 1836–1874 | F57 · o quadro de datas do caso: tudo à vista, tudo alterável |
| 1875–1912 | F58 · o cartão do caso enxuto: ➕ mais informações dobrado |

## O `<script>`, seção por seção

| Linhas | Seção |
|---|---|
| 2022–2074 | CONFIGURAÇÃO (preencher na instalação — ver COMO-INSTALAR.md) |
| 2075–2141 | Tudo neste sistema é horário de Brasília e português do Brasil |
| 2142–2218 | pesquisa |
| 2219–2266 | o rascunho do andamento (por caso, só nesta sessão do navegador) |
| 2267–2295 | API (PostgREST + GoTrue por fetch, com paginação e refresh) |
| 2296–2348 | Arquivos (Storage) |
| 2349–2713 | login |
| 2714–2925 | estrutura de navegação |
| 2926–3114 | biblioteca de ícones SVG do menu (espec. 5.3) |
| 3115–3214 | o e-Recursos (CRPS), traduzido |
| 3215–3238 | decisões (o que mais importa) |
| 3239–3251 | julgamento / pauta |
| 3252–3261 | movimentos das partes |
| 3262–3267 | perícia médica |
| 3268–3417 | tramitação interna |
| 3418–3424 | o que o PAT chama de serviço, e o que o CRM chama de benefício |
| 3425–3443 | pedido de benefício |
| 3444–3449 | recurso: lista Conselho de Recursos, não INSS |
| 3450–3454 | revisão de benefício já concedido |
| 3455–3458 | dinheiro |
| 3459–3463 | serviço administrativo: não abre caso, acontece DENTRO de um |
| 3464–3623 | APURAÇÃO DE IRREGULARIDADE |
| 3624–4340 | importar do PAT/GERID (INSS) |
| 4341–4424 | F40 · TUDO da importação passa por 📣 Novidades |
| 4425–4763 | coluna do meio |
| 4764–4851 | Meu Dia (com filtro por colaborador) |
| 4852–4899 | aplicar a coleta do e-Recursos |
| 4900–5076 | ⚖️ a coleta do PJe (acervo do TRF3) |
| 5077–5177 | a ESCOLHA À MÃO |
| 5178–5417 | ⚖️ o PROCESSO COMPLETO (coleta 'pje-processo') |
| 5418–5452 | marcar frases numa anotação |
| 5453–5522 | 📣 Novidades |
| 5523–5893 | 📌 DAR SEGUIMENTO |
| 5894–5923 | 🧹 Cuidar do acervo |
| 5924–5976 | 🗓️ Planejado (a agenda: filtros por período e por colaborador) |
| 5977–6027 | Minhas Tarefas (particulares) |
| 6028–6031 | F28: os CEPs de Monte Alto (arquivo do Paulo, 2025) |
| 6032–6261 | Novo Cliente (botão do topo) — a tela da RECEPÇÃO |
| 6262–6301 | visão 🤖 Claude (sugestões com aprovação humana) |
| 6302–6372 | 📥 Menções (caixa de entrada) |
| 6373–6413 | 📄 Modelos de documentos (gerenciar) |
| 6414–6456 | 📌 Quadro Kanban (fases) |
| 6457–6546 | 💼 Vendas (funil de prospectos) |
| 6547–6996 | 💬 WhatsApp: a caixa de entrada do escritório |
| 6997–7061 | 💰 Quando o benefício cai na conta |
| 7062–7083 | ⚙️ Configurações: o que antes só se mudava no banco |
| 7084–7110 | quem atende |
| 7111–7141 | horário e interruptores |
| 7142–7160 | avisos |
| 7161–7175 | o robô |
| 7176–7186 | a ponte |
| 7187–7318 | o robô dos recursos (CRPS) |
| 7319–7350 | 📣 Marketing (o que estamos trabalhando + público por benefício) |
| 7351–7375 | agenda e dashboard |
| 7376–7556 | 📅 Calendário (o mês inteiro numa tela, como a agenda do Google) |
| 7557–7616 | escolher o fundo da lista |
| 7617–7731 | arrastar |
| 7732–7840 | ＋ Adicionar, fixo no pé da lista |
| 7841–7897 | quem já leu o comentário ("visto" da equipe) |
| 7898–7945 | o ＋ do comentário: o mesmo assunto pode ter dois prazos |
| 7946–8131 | concluir: a baixa é sua, e o que você fez vira comentário |
| 8132–8267 | rotina do escritório |
| 8268–8320 | qual processo? |
| 8321–9306 | ficha do cliente |
| 9307–9385 | CNIS |
| 9386–9463 | a vida contributiva, como o CNIS a escreve |
| 9464–9509 | Declaração de Benefícios |
| 9510–9552 | a vida contributiva na tela |
| 9553–9601 | o botão dentro do passo da triagem |
| 9602–10388 | o que fica gravado |
| 10389–10397 | as duas telas do processo |
| 10398–10568 | a data sai do próprio texto (como o Todoist faz) |
| 10569–10622 | Datas prováveis de aposentadoria |
| 10623–10782 | Homem ou mulher pelo primeiro nome |
| 10783–10881 | LOAS idoso e o CadÚnico |
| 10882–10895 | Último toque pelo WhatsApp |
| 10896–11071 | Esteira de revisão: nenhum processo fica 90 dias sem um olhar |
| 11072–11253 | 🔔 Lembretes do cliente |
| 11254–11452 | o bloco de contas, no pé da aba de Lembretes |
| 11453–11833 | anotação do To Do (🙏 Aposentadorias Futuras) -> andamento de um caso |
| 11834–12039 | a visão global da barra lateral: Análises | Dashboard |
| 12040–12115 | alterar o cadastro |
| 12116–12173 | anexar o documento (é para isto que o celular vai à casa do cliente) |
| 12174–12459 | Fatos do benefício |
| 12460–12507 | cópia fiel de regras/marcadores.js |
| 12508–12599 | pensão por morte |
| 12600–13139 | fim da cópia |
| 13140–13371 | a linha do tempo do escritório |
| 13372–13392 | 🌻 Andamentos INSS (PAT/Meu INSS) |
| 13393–13483 | 🗄 arquivar POR PROCESSO |
| 13484–13862 | 📖 Caso completo: todas as fontes numa linha do tempo só |
| 13863–13925 | cópia fiel de robo-crps/separar.js |
| 13926–13927 | fim da cópia |
| 13928–14003 | um caso para cada recurso |
| 14004–14283 | recurso de consulta manual |
| 14284–14779 | UM CASO, VÁRIOS PROCESSOS |
| 14780–14877 | celular |
| 14878–14905 | DCB: a data em que o benefício cessa sozinho |
| 14906–15432 | a escolha obrigatória do comentário |
| 15433–15489 | 📞 O REGISTRO DO AVISO |
| 15490–15764 | 💰 A CORRENTE DE CONFERÊNCIA (regra do Paulo, 13.08) |
| 15765–15884 | ⇄ fundir dois casos |
| 15885–16131 | catálogo de documentos (espelho do site interno) |
| 16132–16179 | telefones em lista |
| 16180–16381 | a grade |
| 16382–16646 | importação em massa |
| 16647–17097 | OS DOCUMENTOS DO ESCRITÓRIO |
| 17098–17882 | O QUADRO DO ATENDIMENTO |
| 17883–18290 | 1º · a espécie do benefício/serviço (com "outros") e a natureza |
| 18291–18432 | 📄 SOLICITAR DOCUMENTOS NO MEIO DA ANOTAÇÃO (pedido do Paulo) |
| 18433–18479 | arranque |
| 18480–18592 | atalhos de teclado |
| 18593–18700 | celular: barra de baixo e busca no alto da lista |

---

## Que função desenha cada tela

O caminho é sempre o mesmo: um clique muda uma variável global, chama
`render()` (coluna do meio) ou `repintarFicha()` (ficha), e a função abaixo
devolve HTML que é jogado com `innerHTML`. **Não há framework** — quem repinta
é quem escreve a string.

| Tela | Função | Linha |
|---|---|---:|
| Barra da esquerda (listas e visões) | `montarSidebar()` | 2983 |
| Coluna do meio — despachante | `render()` | 4619 |
| Linha do cliente na lista | `cartaoCliente()` | 4439 |
| Ficha do cliente (moldura, abas) | `pintarFicha()` | 8393 |
| Aba **Cadastro** | `painelCadastroFicha()` | 8749 |
| Cadastro › Identificação | `fichaIdentificacao()` | 16545 |
| Cadastro › Anotações | `caixaAtendimento()` | 17857 |
| Cadastro › Documentos | `caixaDocumentos()` | 17074 |
| Cadastro › Documentos (catálogo por benefício) | `catalogoNoCadastro()` | 9954 |
| Cadastro › Consulta | `painelConsulta()` | 10036 |
| Cadastro › Mensagens | `painelMensagensFicha()` | 10218 |
| Aba **Lembretes** | `painelLembretes()` | 11298 |
| Aba **Casos** — cartão de fatos | `blocoFatos()` | 12783 |
| Casos › Andamentos do Escritório | `painelEscritorio()` | 13112 |
| Casos › Andamentos INSS | `painelINSS()` | 13448 |
| Casos › Recurso (CRPS) | `painelCRPS()` | 13813 |
| Casos › Andamentos do CNJ | `painelCNJ()` | 14409 |
| Casos › Caso completo | `painelTudo()` | 13563 |
| Aba **Perícias** | `painelPericiasFicha()` | 10086 |
| Aba **Honorários** | `painelPagamentosFicha()` | 10153 |

### As telas da coluna do meio (fora da ficha)

| Visão (`visao`) | Função | Linha |
|---|---|---:|
| `meudia` | `renderMeuDia()` | 4765 |
| `agenda` | `renderAgenda()` | 7352 |
| `calendario` | `renderCalendario()` | 7458 |
| `planejado` | `renderPlanejado()` | 5926 |
| `dashboard` | `renderDash()` | 7799 |
| `novidades` | `renderNovidades()` | 5834 |
| `quadro` | `renderQuadro()` | 6424 |
| `vendas` | `renderVendas()` | 6470 |
| `whatsapp` | `renderWhats()` | 6561 |
| `acervo` | `renderAcervo()` | 5902 |
| `config` | `renderConfig()` | 7070 |
| `claude` | `renderClaude()` | 6263 |
| `mencoes` | `renderMencoes()` | 6303 |
| `particulares` | `renderParticulares()` | 5998 |
| `docmodelos` | `renderModelosDoc()` | 6374 |
| `novocliente` | `renderNovoCliente()` | 6038 |
| `patinss` | `renderImportarPat()` | 4005 |
| `rotinas` | `renderRotinas()` | 8198 |
| `parcerias` | `renderParcerias()` | 7779 |
| `marketing` | `renderMarketing()` | 7320 |

As listas por fase (🗓 Tarefas com Prazo, 🙋 Escritório, 🌻 INSS, 👪 Judicial,
🖥 Conselho, 💡 Petições, 🙏 Aposentadorias Futuras) não têm função própria:
caem no fim de `render()`, que monta os cartões com `cartaoCliente()`.


---

## Onde estão as chamadas ao Supabase

Toda chamada passa por `api()`. A tabela abaixo é o índice por tabela do banco:
onde se lê, onde se escreve e de qual função.

| Tabela | Chamadas | Métodos | Funções que tocam |
|---|---:|---|---|
| `andamentos` | 54 | DELETE, GET, PATCH, POST | `anexar`, `apagarAndamento`, `aplicarPje`, `aplicarPjeProc`, `casoViraLembrete`, `concluirDeVez` +34 |
| `clientes` | 37 | GET, PATCH, POST | `addNaLista`, `apagarNotaAtendimento`, `apagarRegistroAvulso`, `converterCasoEmAtendimento`, `criarCliente`, `definirSexo` +22 |
| `casos` | 17 | DELETE, PATCH, POST | `addNaLista`, `confirmarSeparacao`, `converterCasoEmAtendimento`, `criarCasoDoRecurso`, `criarCasoPjeParaCliente`, `criarMesmoAssim` +10 |
| `eventos` | 15 | GET, PATCH, POST | `aplicarPericia`, `cancelarEvento`, `compareceuEvento`, `extrairEvento`, `ingerirDetalheNoCaso`, `manterEvento` +5 |
| `andamento_tarefas` | 14 | PATCH, POST | `concluirDeVez`, `correnteConferencia`, `criar`, `desfazerConclusao`, `elosDepoisDeConferir`, `mudarLembrar` +4 |
| `lembretes` | 14 | PATCH, POST | `adiarLembrete`, `casoViraLembrete`, `criarLembrete`, `desligarLembrete`, `gerarCasoDoPre`, `lembreteAvisado` +6 |
| `coletas` | 11 | GET, PATCH | `aplicarCrps`, `aplicarPje`, `aplicarPjeProc`, `buscarColetas`, `conferirCrps`, `conferirPje` +5 |
| `tarefas` | 11 | PATCH, POST | `alternarMarcador`, `aplicarChecklistCaso`, `gerarCasoDoPre`, `ligarChecklistFicha`, `ligarTarefas`, `novaSubtarefa` +4 |
| `atribuicoes` | 8 | DELETE, POST | `addNaLista`, `confirmarSeparacao`, `criarCasoDoRecurso`, `fecharEsc`, `leadParaCliente`, `t` |
| `andamentos_lidos` | 6 | DELETE, POST | `concluirDeVez`, `marcarLidas`, `marcarLido`, `marcarRevisado`, `novoAndamento` |
| `mencoes` | 6 | PATCH, POST | `avisarCasoNovo`, `avisarClienteNovo`, `criarMencoes`, `lerMencao`, `marcarLido` |
| `credenciais` | 6 | POST | `copiarCred`, `criarCliente`, `novaCred`, `trocarSenha`, `verCred` |
| `pagamentos` | 5 | PATCH, POST | `enviarPagamentos`, `fecharEsc`, `novoPgto`, `vincularPgto` |
| `anexos` | 5 | DELETE, PATCH, POST | `anexar`, `anexarPreCaso`, `apagarAnexo`, `converterCasoEmAtendimento`, `gerarCasoDoPre` |
| `colaboradores` | 4 | GET, PATCH | `guarda`, `iniciar` |
| `leads` | 4 | PATCH, POST | `leadParaCliente`, `novoLead`, `renderVendas`, `salvarAnotacaoRapida` |
| `zap_mensagens` | 4 | DELETE, PATCH, POST | `descartarRascunho`, `enviarZap`, `mandarArquivoZap`, `soltarRascunho` |
| `aposentadorias` | 4 | DELETE, PATCH, POST | `apagarApos`, `lembrarApos`, `salvarApos` |
| `rpc` | 3 | POST | `cfgSalva`, `gravar`, `transferirConversa` |
| `lembrar_motivos` | 3 | PATCH, POST | `lbDesativar`, `lbSalvarMotivo` |
| `config_app` | 2 | GET, POST | `guardarCfgApp`, `ssTestarChave` |
| `meu_dia` | 2 | DELETE | `alternarMeuDia` |
| `modelos_documento` | 2 | PATCH, POST | `novoModeloDoc`, `salvarModeloDoc` |
| `zap_conversas` | 2 | PATCH | `abrirConversa`, `mudarConversa` |
| `lista_pref` | 2 | POST | `reordenarListas`, `salvarFundo` |
| `rotinas_feitas` | 2 | DELETE | `marcarRotina` |
| `rotinas` | 2 | PATCH, POST | `apagarRotina`, `novaRotina` |
| `vinculos` | 2 | DELETE, POST | `novoVinculo`, `removerVinculo` |
| `analises_direito` | 2 | DELETE, POST | `apagarAnalise`, `salvarAnalise` |
| `credencial_vis` | 2 | POST | `copiarCred`, `verCred` |
| `sugestoes` | 1 | PATCH | `decidirSugestao` |
| `lembrete_avisos` | 1 | POST | `lembreteAvisado` |
| `frases_prontas` | 1 | POST | `novaFrase` |
| `modelos_mensagem` | 1 | POST | `novoModelo` |
| `documentos_beneficio` | 1 | PATCH | `salvarDocs` |

<details><summary>Cada chamada, com a linha</summary>


**`analises_direito`**

- linha 11693 · POST · em `salvarAnalise()`
- linha 11750 · DELETE · em `apagarAnalise()`

**`andamento_tarefas`**

- linha 5688 · POST · em `salvarSeguimento()`
- linha 5712 · POST · em `salvarSeguimento()`
- linha 5746 · POST · em `criar()`
- linha 5762 · POST · em `criar()`
- linha 7935 · POST · em `ntSalvar()`
- linha 7998 · PATCH · em `concluirDeVez()`
- linha 8047 · POST · em `concluirDeVez()`
- linha 8069 · PATCH · em `desfazerConclusao()`
- linha 8096 · PATCH · em `mudarLembrar()`
- linha 15061 · POST · em `novoAndamento()`
- linha 15088 · POST · em `novoAndamento()`
- linha 15478 · PATCH · em `salvarAvisado()`
- linha 15527 · POST · em `correnteConferencia()`
- linha 15542 · PATCH · em `elosDepoisDeConferir()`

**`andamentos`**

- linha 4224 · POST · em `tentar()`
- linha 4243 · POST · em `tentar()`
- linha 4255 · POST · em `tentar()`
- linha 4267 · POST · em `tentar()`
- linha 4277 · POST · em `tentar()`
- linha 4308 · POST · em `criarMesmoAssim()`
- linha 4364 · GET · em `ingerirDetalheNoCaso()`
- linha 4370 · POST · em `ingerirDetalheNoCaso()`
- linha 4380 · POST · em `ingerirDetalheNoCaso()`
- linha 4404 · POST · em `juntarUm()`
- linha 5240 · POST · em `aplicarPjeProc()`
- linha 5244 · POST · em `aplicarPjeProc()`
- linha 5280 · POST · em `aplicarPje()`
- linha 5383 · POST · em `so()`
- linha 5679 · POST · em `salvarSeguimento()`
- linha 5708 · POST · em `salvarSeguimento()`
- linha 5742 · POST · em `criar()`
- linha 5757 · POST · em `criar()`
- linha 6290 · POST · em `decidirSugestao()`
- linha 8005 · POST · em `concluirDeVez()`
- linha 8027 · GET · em `concluirDeVez()`
- linha 8071 · PATCH · em `desfazerConclusao()`
- linha 8696 · POST · em `fecharEsc()`
- linha 9709 · POST · em `lancarNoCaso()`
- linha 9888 · POST · em `rotProx()`
- linha 10920 · POST · em `marcarRevisado()`
- linha 11477 · POST · em `salvarAnotacaoNoCaso()`
- linha 11530 · POST · em `casoViraLembrete()`
- linha 11714 · POST · em `salvarAnalise()`
- linha 12137 · POST · em `anexar()`
- linha 13240 · POST · em `reagir()`
- linha 13985 · POST · em `confirmarSeparacao()`
- linha 13994 · POST · em `confirmarSeparacao()`
- linha 14117 · POST · em `salvarManualNovidade()`
- linha 14231 · POST · em `criarCasoDoRecurso()`
- linha 14273 · DELETE · em `pjeForaDoCaso()`
- linha 15014 · POST · em `janelaPrazoCumprido()`
- linha 15048 · POST · em `novoAndamento()`
- linha 15167 · PATCH · em `apagarAndamento()`
- linha 15171 · DELETE · em `apagarAndamento()`
- linha 15296 · POST · em `novaExigencia()`
- linha 15468 · POST · em `salvarAvisado()`
- linha 15522 · POST · em `correnteConferencia()`
- linha 15611 · POST · em `reabrirCaso()`
- linha 15695 · POST · em `encerrarDeVez()`
- linha 15727 · POST · em `enviarPagamentos()`
- linha 15862 · POST · em `t()`
- linha 15872 · POST · em `t()`
- linha 15941 · POST · em `solicitarDocsCatalogo()`
- linha 15953 · POST · em `cumprirExigencia()`
- linha 17069 · POST · em `registrarDocGerado()`
- linha 17416 · POST · em `gerarCasoDoPre()`
- linha 17430 · POST · em `gerarCasoDoPre()`
- linha 17830 · POST · em `salvarAnotacaoRapida()`

**`andamentos_lidos`**

- linha 5884 · POST · em `marcarLidas()`
- linha 8009 · POST · em `concluirDeVez()`
- linha 8107 · DELETE · em `marcarLido()`
- linha 8112 · POST · em `marcarLido()`
- linha 10924 · POST · em `marcarRevisado()`
- linha 15072 · POST · em `novoAndamento()`

**`anexos`**

- linha 12134 · POST · em `anexar()`
- linha 12152 · DELETE · em `apagarAnexo()`
- linha 17210 · PATCH · em `converterCasoEmAtendimento()`
- linha 17445 · PATCH · em `gerarCasoDoPre()`
- linha 17484 · POST · em `anexarPreCaso()`

**`aposentadorias`**

- linha 10741 · PATCH · em `lembrarApos()`
- linha 10745 · POST · em `lembrarApos()`
- linha 12020 · POST · em `salvarApos()`
- linha 12027 · DELETE · em `apagarApos()`

**`atribuicoes`**

- linha 6536 · POST · em `leadParaCliente()`
- linha 7769 · POST · em `addNaLista()`
- linha 8711 · POST · em `fecharEsc()`
- linha 8718 · DELETE · em `fecharEsc()`
- linha 13983 · POST · em `confirmarSeparacao()`
- linha 14229 · POST · em `criarCasoDoRecurso()`
- linha 15830 · DELETE · em `t()`
- linha 15833 · DELETE · em `t()`

**`casos`**

- linha 2445 · PATCH · em `patchCaso()`
- linha 4230 · POST · em `tentar()`
- linha 4299 · POST · em `criarMesmoAssim()`
- linha 5057 · POST · em `criarCasoPjeParaCliente()`
- linha 5060 · POST · em `criarCasoPjeParaCliente()`
- linha 6533 · POST · em `leadParaCliente()`
- linha 7767 · POST · em `addNaLista()`
- linha 12439 · PATCH · em `qdMudarPrazo()`
- linha 13977 · POST · em `confirmarSeparacao()`
- linha 14225 · POST · em `criarCasoDoRecurso()`
- linha 15355 · POST · em `novoCaso()`
- linha 15876 · DELETE · em `t()`
- linha 15921 · POST · em `solicitarDocsCatalogo()`
- linha 17215 · PATCH · em `converterCasoEmAtendimento()`
- linha 17407 · POST · em `gerarCasoDoPre()`
- linha 17583 · PATCH · em `marcado()`
- linha 17834 · PATCH · em `salvarAnotacaoRapida()`

**`clientes`**

- linha 6211 · GET · em `criarCliente()`
- linha 6228 · POST · em `criarCliente()`
- linha 6531 · POST · em `leadParaCliente()`
- linha 7760 · GET · em `addNaLista()`
- linha 7765 · POST · em `addNaLista()`
- linha 9640 · PATCH · em `gravarCnisLido()`
- linha 9648 · PATCH · em `gravarCnisLido()`
- linha 9883 · PATCH · em `rotProx()`
- linha 9907 · PATCH · em `salvarTriagem()`
- linha 9916 · PATCH · em `salvarTriagem()`
- linha 11724 · PATCH · em `salvarAnalise()`
- linha 11995 · PATCH · em `marcarAposentado()`
- linha 12034 · PATCH · em `definirSexo()`
- linha 12086 · PATCH · em `salvarCampo()`
- linha 12431 · PATCH · em `qdMudarNota()`
- linha 15997 · PATCH · em `salvarPasta()`
- linha 16087 · PATCH · em `salvarCliCampo()`
- linha 16100 · PATCH · em `salvarCliCampo()`
- linha 16144 · PATCH · em `salvarTelefones()`
- linha 16152 · PATCH · em `salvarTelefones()`
- linha 16352 · PATCH · em `gravarEnderecoCli()`
- linha 16363 · PATCH · em `gravarEnderecoCli()`
- linha 16528 · PATCH · em `apagarRegistroAvulso()`
- linha 16540 · PATCH · em `novoRegistroAvulso()`
- linha 17126 · PATCH · em `gravarPrecasos()`
- linha 17212 · PATCH · em `converterCasoEmAtendimento()`
- linha 17453 · PATCH · em `gerarCasoDoPre()`
- linha 17576 · PATCH · em `marcado()`
- linha 17614 · PATCH · em `resolverNotaAtendimento()`
- linha 17648 · PATCH · em `apagarNotaAtendimento()`
- linha 17661 · PATCH · em `notaChecklistItem()`
- linha 17672 · PATCH · em `notaChecklistToggle()`
- linha 17791 · POST · em `salvarAnotacaoRapida()`
- linha 17799 · PATCH · em `salvarAnotacaoRapida()`
- linha 17846 · PATCH · em `salvarAnotacaoRapida()`
- linha 18235 · PATCH · em `pedirDocsAtendimento()`
- linha 18250 · PATCH · em `docEntregue()`

**`colaboradores`**

- linha 2411 · GET · em `iniciar()`
- linha 7238 · PATCH · em `guarda()`
- linha 7256 · PATCH · em `guarda()`
- linha 7263 · PATCH · em `guarda()`

**`coletas`**

- linha 3922 · GET · em `buscarColetas()`
- linha 3942 · PATCH · em `descartarColetasVelhas()`
- linha 3950 · GET · em `usarColeta()`
- linha 4284 · PATCH · em `tentar()`
- linha 4910 · GET · em `conferirPje()`
- linha 5188 · GET · em `conferirPjeProc()`
- linha 5250 · PATCH · em `aplicarPjeProc()`
- linha 5286 · PATCH · em `aplicarPje()`
- linha 5316 · GET · em `conferirCrps()`
- linha 5363 · GET · em `aplicarCrps()`
- linha 5388 · PATCH · em `so()`

**`config_app`**

- linha 2458 · POST · em `guardarCfgApp()`
- linha 2562 · GET · em `ssTestarChave()`

**`credenciais`**

- linha 6238 · POST · em `criarCliente()`
- linha 12110 · POST · em `trocarSenha()`
- linha 12112 · POST · em `trocarSenha()`
- linha 18413 · POST · em `copiarCred()`
- linha 18419 · POST · em `verCred()`
- linha 18428 · POST · em `novaCred()`

**`credencial_vis`**

- linha 18415 · POST · em `copiarCred()`
- linha 18421 · POST · em `verCred()`

**`documentos_beneficio`**

- linha 18399 · PATCH · em `salvarDocs()`

**`eventos`**

- linha 4262 · POST · em `tentar()`
- linha 4365 · GET · em `ingerirDetalheNoCaso()`
- linha 4377 · POST · em `ingerirDetalheNoCaso()`
- linha 5697 · POST · em `salvarSeguimento()`
- linha 5734 · POST · em `aplicarPericia()`
- linha 14869 · POST · em `extrairEvento()`
- linha 15384 · POST · em `novoEvento()`
- linha 15401 · PATCH · em `manterEvento()`
- linha 15414 · PATCH · em `cancelarEvento()`
- linha 15424 · PATCH · em `compareceuEvento()`
- linha 15463 · POST · em `salvarAvisado()`
- linha 15471 · POST · em `salvarAvisado()`
- linha 15822 · PATCH · em `t()`
- linha 15825 · PATCH · em `t()`
- linha 15827 · PATCH · em `t()`

**`frases_prontas`**

- linha 15369 · POST · em `novaFrase()`

**`leads`**

- linha 6513 · PATCH · em `renderVendas()`
- linha 6523 · POST · em `novoLead()`
- linha 6539 · POST · em `leadParaCliente()`
- linha 17814 · POST · em `salvarAnotacaoRapida()`

**`lembrar_motivos`**

- linha 15259 · PATCH · em `lbSalvarMotivo()`
- linha 15265 · POST · em `lbSalvarMotivo()`
- linha 15276 · PATCH · em `lbDesativar()`

**`lembrete_avisos`**

- linha 11417 · POST · em `lembreteAvisado()`

**`lembretes`**

- linha 10844 · PATCH · em `sincronizarLembreteCadunico()`
- linha 10851 · PATCH · em `sincronizarLembreteCadunico()`
- linha 10856 · POST · em `sincronizarLembreteCadunico()`
- linha 11405 · POST · em `criarLembrete()`
- linha 11420 · POST · em `lembreteAvisado()`
- linha 11438 · PATCH · em `adiarLembrete()`
- linha 11447 · PATCH · em `desligarLembrete()`
- linha 11482 · PATCH · em `salvarAnotacaoNoCaso()`
- linha 11516 · POST · em `casoViraLembrete()`
- linha 11738 · PATCH · em `salvarAnalise()`
- linha 17329 · PATCH · em `voltarLembreteParaMesa()`
- linha 17356 · POST · em `preCasoParaLembrete()`
- linha 17459 · PATCH · em `gerarCasoDoPre()`
- linha 17565 · POST · em `marcado()`

**`lista_pref`**

- linha 7590 · POST · em `salvarFundo()`
- linha 7723 · POST · em `reordenarListas()`

**`mencoes`**

- linha 6154 · POST · em `avisarClienteNovo()`
- linha 6156 · POST · em `avisarClienteNovo()`
- linha 6322 · PATCH · em `lerMencao()`
- linha 6342 · POST · em `criarMencoes()`
- linha 6369 · POST · em `avisarCasoNovo()`
- linha 8120 · PATCH · em `marcarLido()`

**`meu_dia`**

- linha 2890 · DELETE · em `alternarMeuDia()`
- linha 2893 · DELETE · em `alternarMeuDia()`

**`modelos_documento`**

- linha 6401 · PATCH · em `salvarModeloDoc()`
- linha 6408 · POST · em `novoModeloDoc()`

**`modelos_mensagem`**

- linha 15980 · POST · em `novoModelo()`

**`pagamentos`**

- linha 8729 · PATCH · em `fecharEsc()`
- linha 8738 · PATCH · em `fecharEsc()`
- linha 10143 · PATCH · em `vincularPgto()`
- linha 15565 · POST · em `novoPgto()`
- linha 15720 · POST · em `enviarPagamentos()`

**`rotinas`**

- linha 8253 · POST · em `novaRotina()`
- linha 8262 · PATCH · em `apagarRotina()`

**`rotinas_feitas`**

- linha 8183 · DELETE · em `marcarRotina()`
- linha 8186 · DELETE · em `marcarRotina()`

**`rpc`**

- linha 6950 · POST · em `transferirConversa()`
- linha 6968 · POST · em `gravar()`
- linha 7279 · POST · em `cfgSalva()`

**`sugestoes`**

- linha 6295 · PATCH · em `decidirSugestao()`

**`tarefas`**

- linha 5993 · PATCH · em `ligarTarefas()`
- linha 6021 · POST · em `novaTarefa()`
- linha 12669 · POST · em `alternarMarcador()`
- linha 14728 · POST · em `novaSubtarefa()`
- linha 14737 · PATCH · em `ligarChecklistFicha()`
- linha 15127 · POST · em `novoAndamento()`
- linha 15141 · POST · em `novoAndamento()`
- linha 15935 · POST · em `solicitarDocsCatalogo()`
- linha 16015 · POST · em `aplicarChecklistCaso()`
- linha 17438 · POST · em `gerarCasoDoPre()`
- linha 18338 · POST · em `solicitarDocsAnotacao()`

**`vinculos`**

- linha 10295 · POST · em `novoVinculo()`
- linha 10301 · DELETE · em `removerVinculo()`

**`zap_conversas`**

- linha 6685 · PATCH · em `abrirConversa()`
- linha 6928 · PATCH · em `mudarConversa()`

**`zap_mensagens`**

- linha 6780 · PATCH · em `soltarRascunho()`
- linha 6787 · DELETE · em `descartarRascunho()`
- linha 6814 · POST · em `enviarZap()`
- linha 6853 · POST · em `mandarArquivoZap()`

</details>


---

## O que NÃO pode ser renomeado

O JavaScript procura estes nomes **por string**. Renomear qualquer um deles no
HTML ou no CSS sem trocar também no script quebra a tela em silêncio — não dá
erro no console, o elemento simplesmente não é encontrado.

### `id` consultados por `getElementById` ou `#seletor`

| id | Vezes |
|---|---:|
| `conteudo-meio` | 28 |
| `sub-lista` | 22 |
| `app` | 14 |
| `modal` | 13 |
| `and-texto` | 11 |
| `zap-txt` | 9 |
| `busca` | 8 |
| `seg-data` | 7 |
| `ed-campo` | 5 |
| `tf-box` | 5 |
| `ar-achados` | 4 |
| `ar-busca` | 4 |
| `aviso` | 4 |
| `busca-x` | 4 |
| `preenche-box` | 4 |
| `titulo-lista` | 4 |
| `add-nome` | 3 |
| `and-prazo-data` | 3 |
| `ar-texto` | 3 |
| `busca-cel` | 3 |
| `busca-cel-x` | 3 |
| `cad-ed` | 3 |
| `detalhe` | 3 |
| `end-cep` | 3 |
| `hon-segue` | 3 |
| `hon-sim` | 3 |
| `hon-valor` | 3 |
| `lbm-grupo-novo` | 3 |
| `lembrar-box` | 3 |
| `login-erro` | 3 |
| `ncl-cidade` | 3 |
| `ncl-rua` | 3 |
| `ordem` | 3 |
| `ad-cens` | 2 |
| `and-caso` | 2 |
| `ap-data` | 2 |
| `apos-form` | 2 |
| `ar-imp` | 2 |
| `ar-tel` | 2 |
| `ar-urg` | 2 |
| `arq-inp` | 2 |
| `at-docs` | 2 |
| `barra-cel` | 2 |
| `btn-entrar` | 2 |
| `cred-` | 2 |
| `ct-txt` | 2 |
| `doc-ben` | 2 |
| `doc-conteudo` | 2 |
| `esc-pje-busca` | 2 |
| `ex-desc` | 2 |
| `ex-prazo` | 2 |
| `hon-enviar` | 2 |
| `imp-res` | 2 |
| `jan-hon-campos` | 2 |
| `lbm-grupo` | 2 |
| `lbm-texto` | 2 |
| `login-email` | 2 |
| `login-senha` | 2 |
| `mn-txt` | 2 |
| `ncl-cpf` | 2 |
| `ncl-dn` | 2 |
| `nk-ben` | 2 |
| `nl-nome` | 2 |
| `nt-titulo` | 2 |
| `pnc-ok` | 2 |
| `res-ed` | 2 |
| `resp-chip` | 2 |
| `rt-diames` | 2 |
| `seg-txt` | 2 |
| `sug-abrir` | 2 |
| `sug-box` | 2 |
| `tf-data` | 2 |
| `tf-ninguem` | 2 |
| `zap-arq` | 2 |
| `zap-dir` | 2 |
| `abrir-tudo` | 1 |
| `ad-novo` | 1 |
| `add-ben` | 1 |
| `add-rodape` | 1 |
| `ag-data` | 1 |
| `ag-hora` | 1 |
| `ag-tipo` | 1 |
| `agendar-tudo` | 1 |
| `and-prazo-chip` | 1 |
| `and-prazo-ck` | 1 |
| `ap-esp` | 1 |
| `ar-alvo` | 1 |
| `ar-caso` | 1 |
| `at-doc-extra` | 1 |
| `at-frase` | 1 |
| `at-lembrar` | 1 |
| `at-nota` | 1 |
| `av-data` | 1 |
| `av-hora` | 1 |
| `ben-` | 1 |
| `btn-lateral` | 1 |
| `btn-novo-cli` | 1 |
| `btn-processos` | 1 |
| `btn-som` | 1 |
| `cad-` | 1 |
| `cad-tel-novo` | 1 |
| `cad-tel-obs` | 1 |
| `cal-ano-sel` | 1 |
| `cal-mes-sel` | 1 |
| `campo-` | 1 |
| `campo-endereco` | 1 |
| `cf-crps-cracha` | 1 |
| `cf-crps-salvar` | 1 |
| `cfg-key` | 1 |
| `cfg-url` | 1 |
| `chip-exig` | 1 |
| `chip-vencidas` | 1 |
| `crps-nup-` | 1 |
| `ct-prot` | 1 |
| `doc-destino` | 1 |
| `doc-editor-` | 1 |
| `doc-obs-` | 1 |
| `doc-txt-` | 1 |
| `ed-doc-` | 1 |
| `end-logradouro` | 1 |
| `end-numero` | 1 |
| `end-recado` | 1 |
| `end-uf` | 1 |
| `esc-pje-lista` | 1 |
| `exig-box` | 1 |
| `fd-nao` | 1 |
| `fd-ok` | 1 |
| `fundo-arq` | 1 |
| `grupo-dinamicas` | 1 |
| `grupo-fases` | 1 |
| `grupo-visoes` | 1 |
| `hon-nao` | 1 |
| `hon-venc` | 1 |
| `imp-subst` | 1 |
| `imp-txt` | 1 |
| `jan-cancela` | 1 |
| `jan-hon` | 1 |
| `jan-nao` | 1 |
| `jan-novo` | 1 |
| `janela` | 1 |
| `jd-extra` | 1 |
| `jd-lista` | 1 |
| `lb-gps` | 1 |
| `lb-titulo` | 1 |
| `lbm-titulo` | 1 |
| `ler-tudo` | 1 |
| `login-config` | 1 |
| `menu-arroba` | 1 |
| `menu-mover` | 1 |
| `menu-processos` | 1 |
| `nc-tipo` | 1 |
| `nc-valor` | 1 |
| `nck-` | 1 |
| `ncl-caso` | 1 |
| `ncl-cep-recado` | 1 |
| `ncl-civil` | 1 |
| `ncl-cpf-recado` | 1 |
| `ncl-idade` | 1 |
| `ncl-nome` | 1 |
| `ncl-num` | 1 |
| `ncl-prof` | 1 |
| `ncl-relato` | 1 |
| `ncl-senha` | 1 |
| `ncl-sexo` | 1 |
| `ncl-tel` | 1 |
| `ncl-uf` | 1 |
| `nd-cat` | 1 |
| `nd-titulo` | 1 |
| `ne-caso` | 1 |
| `ne-data` | 1 |
| `ne-hora` | 1 |
| `ne-local` | 1 |
| `ne-tipo` | 1 |
| `nf-texto` | 1 |
| `nk-fase` | 1 |
| `nk-prazo` | 1 |
| `nl-ben` | 1 |
| `nl-origem` | 1 |
| `nl-tel` | 1 |
| `nm-ctx` | 1 |
| `nm-texto` | 1 |
| `nm-titulo` | 1 |
| `np-caso` | 1 |
| `np-data` | 1 |
| `np-desc` | 1 |
| `np-valor` | 1 |
| `nsub-` | 1 |
| `nt-prazo` | 1 |
| `par-caso` | 1 |
| `par-nome` | 1 |
| `pat-arq` | 1 |
| `pcf-` | 1 |
| `pcl-data-` | 1 |
| `pcl-resp-` | 1 |
| `pd-url` | 1 |
| `pdf-` | 1 |
| `proc-novo-` | 1 |
| `pz-cancela` | 1 |
| `pz-ok` | 1 |
| `pz-volta` | 1 |
| `ra-texto` | 1 |
| `rt-detalhe` | 1 |
| `rt-quando` | 1 |
| `rt-resp` | 1 |
| `rt-titulo` | 1 |
| `seg-evt` | 1 |
| `seg-frase` | 1 |
| `seg-prazo` | 1 |
| `seg-todos` | 1 |
| `selo-menc` | 1 |
| `sem-js` | 1 |
| `ss-chave` | 1 |
| `ss-chave-r` | 1 |
| `ss-corpo` | 1 |
| `sync-todo` | 1 |
| `tela-login` | 1 |
| `tf-escolher` | 1 |
| `tipo-fila` | 1 |
| `tq-nova` | 1 |
| `tri-` | 1 |
| `tri-vinc` | 1 |
| `tri-vinc-desde` | 1 |
| `tri-vinc-desde-cx` | 1 |
| `txt-doc-` | 1 |
| `u-avatar` | 1 |
| `u-nome` | 1 |
| `u-papel` | 1 |
| `ver-novidades` | 1 |
| `vin-nome` | 1 |
| `vin-rel` | 1 |
| `visto-` | 1 |
| `zap-doc` | 1 |
| `zap-msgs` | 1 |
| `zs-` | 1 |
| `zt-motivo` | 1 |

### classes consultadas por `querySelector`, `closest` ou `classList`

| classe | Vezes |
|---|---:|
| `.on` | 42 |
| `.alvo` | 7 |
| `.detalhe-aberto` | 7 |
| `.lista-item` | 6 |
| `.mt` | 6 |
| `.solta` | 6 |
| `.mini-lateral` | 5 |
| `.arrastando` | 4 |
| `.ativa` | 4 |
| `.esc-aberto` | 4 |
| `.busca-aberta` | 3 |
| `.cartao` | 3 |
| `.escrever` | 3 |
| `.modal-cx` | 3 |
| `.tf-dt` | 3 |
| `.ad-row` | 2 |
| `.anim-vista` | 2 |
| `.coluna` | 2 |
| `.det-rolagem` | 2 |
| `.kcard` | 2 |
| `.lbm-lista` | 2 |
| `.meio` | 2 |
| `.menu-aberto` | 2 |
| `.pr-campo` | 2 |
| `.qd-flash` | 2 |
| `.sec-seta` | 2 |
| `.secao` | 2 |
| `.seg-quem` | 2 |
| `.tf-eq` | 2 |
| `.zap-lado` | 2 |
| `.aberto` | 1 |
| `.ad-data` | 1 |
| `.ad-obs` | 1 |
| `.ad-regra` | 1 |
| `.ad-valor` | 1 |
| `.and-item` | 1 |
| `.at-doc` | 1 |
| `.at-eq` | 1 |
| `.avatar` | 1 |
| `.avatares` | 1 |
| `.cal-it` | 1 |
| `.cel-tudo` | 1 |
| `.celular` | 1 |
| `.cfg-link` | 1 |
| `.cfg-reg` | 1 |
| `.com-bt` | 1 |
| `.crps-res-pe` | 1 |
| `.ct-rep` | 1 |
| `.doc-it` | 1 |
| `.evento` | 1 |
| `.fchip` | 1 |
| `.feito` | 1 |
| `.ficha-tudo` | 1 |
| `.jd-doc` | 1 |
| `.logado` | 1 |
| `.mov-item` | 1 |
| `.no-cursor` | 1 |
| `.nov-cli` | 1 |
| `.off` | 1 |
| `.ordenar` | 1 |
| `.sec-clic` | 1 |
| `.sug-it` | 1 |
| `.tipo-ch` | 1 |

### atributos `data-` lidos pelo script

| atributo | Vezes |
|---|---:|
| `data-cli` | 18 |
| `data-vv` | 7 |
| `data-fase` | 5 |
| `data-dia` | 4 |
| `data-ler` | 4 |
| `data-revks` | 4 |
| `data-atende` | 3 |
| `data-estrela` | 3 |
| `data-etapa` | 3 |
| `data-mnc` | 3 |
| `data-mnq` | 3 |
| `data-res` | 3 |
| `data-v` | 3 |
| `data-arr` | 2 |
| `data-auto` | 2 |
| `data-cargo` | 2 |
| `data-caso` | 2 |
| `data-casonovo` | 2 |
| `data-cel` | 2 |
| `data-conclui` | 2 |
| `data-confere` | 2 |
| `data-eq` | 2 |
| `data-equipe` | 2 |
| `data-f` | 2 |
| `data-fcol` | 2 |
| `data-fogo` | 2 |
| `data-lead` | 2 |
| `data-mp` | 2 |
| `data-mv` | 2 |
| `data-mz` | 2 |
| `data-partes` | 2 |
| `data-pcol` | 2 |
| `data-per` | 2 |
| `data-prazo` | 2 |
| `data-recebe` | 2 |
| `data-resultado` | 2 |
| `data-setor` | 2 |
| `data-subt` | 2 |
| `data-zc` | 2 |
| `data-zf` | 2 |
| `data-zk` | 2 |
| `data-zt` | 2 |
| `data-acao` | 1 |
| `data-col` | 1 |
| `data-di` | 1 |
| `data-nt` | 1 |
| `data-t` | 1 |
| `data-tipoand` | 1 |

---

## Estado global

Não há gerenciador de estado: são variáveis soltas no topo do `<script>`. Quem
escreve numa delas muda a tela inteira na próxima pintura. A coluna "escrevem"
é a que importa quando algo aparece onde não devia.

Vale aqui o mesmo aviso da tabela de funções: a atribuição usa a definição mais
próxima acima da linha, então closure aninhada aparece com o nome do vizinho.
É pista para o grep, não verdade formal.

| Variável | Linha | Escrevem | Leem |
|---|---:|---|---|
| `_hojeMem` | 2089 | `hoje` | — |
| `sessao` | 2187 | `entrar`, `iniciar`, `pintarLetraAvatares`, `renovar` | `api`, `dataSessao`, `subirArquivo`, `subirFundo` |
| `eu` | 2188 | `iniciar` | `addNaLista`, `alternarArquivo`, `alternarMeuDia`, `anexar`, `anexarPreCaso`, `apagarNotaAtendimento`, `apagarRegistroAvulso`, `api` +113 |
| `D` | 2189 | `carregar` | `abrirAnexo`, `abrirDrive`, `abrirERecursos`, `abrirExplorer`, `abrirFicha`, `abrirSeguimento`, `abrirSmbot`, `acharArquivoCrps` +385 |
| `visao` | 2190 | `avisoCRPS`, `criarCliente`, `irCel`, `m`, `sinoSvg` | `abrirFundos`, `addNaLista`, `aplicarTema`, `cartaoCliente`, `ligarCartoes`, `marcarBarraCel`, `mostrarAddRodape`, `render` +2 |
| `filtroColab` | 2190 | `iniciar`, `m`, `tCol` | `blocoCrpsManual`, `doColab`, `render`, `renderMeuDia`, `rotinasDoDia`, `tfDo` |
| `filtroVencidas` | 2190 | `tCol` | — |
| `buscaTxt` | 2190 | `digitando`, `janelaAtalhos`, `limparBusca`, `novaCred` | `abrirFundos`, `aplicarTema`, `marcarBarraCel`, `mostrarAddRodape`, `render` |
| `clienteAberto` | 2190 | `abrirFicha`, `fecharFicha`, `novaCred` | `adiarLembrete`, `alternarArquivo`, `alternarMarcador`, `anexar`, `apagarAnalise`, `apagarAndamento`, `apagarAnexo`, `apagarApos` +60 |
| `abaAtiva` | 2190 | `abrirDireitoDe`, `abrirFicha`, `agendarAtendimento`, `casoViraLembrete`, `checklistCaso`, `fecharFicha`, `gerarCasoDoPre`, `irAba` +17 | `blocoDecisao`, `fecharEsc` |
| `casoSel` | 2190 | `abrirFicha`, `escolhido`, `fecharEscolha`, `gerarCasoDoPre`, `item`, `naoEhCaso`, `novoCaso`, `pintarFicha` +3 | `catalogoNoCadastro`, `especieDoCliente`, `fecharAtendimento`, `fecharEsc`, `gravarDeclaracaoLida`, `janelaDocsAnotacao`, `lancarNoCaso`, `novaExigencia` +3 |
| `secRecolhida` | 2191 | — | `aplicar` |
| `subAba` | 2192 | `abrirFicha`, `irSubAba` | `pintarFicha` |
| `instSel` | 2192 | `abrirFicha`, `painelCNJ` | — |
| `subCad` | 2193 | `abrirFicha`, `agendarAtendimento`, `criarCliente`, `gerarCasoDoPre`, `irPreencherCadastro`, `irSubCad`, `naoEhCaso`, `preCasoParaLembrete` +3 | `fecharEsc`, `painelCadastroFicha` |
| `procSel` | 2197 | `abrirFicha`, `painelCNJ` | — |
| `fonteCnj` | 2197 | `abrirFicha`, `painelCNJ` | — |
| `nupSel` | 2197 | `abrirFicha`, `manual` | — |
| `_desfazer` | 2245 | `aviso`, `avisoDesfazer`, `esconderDesfazer` | `desfazerAgora` |
| `_desfazerTimer` | 2245 | `avisoDesfazer` | `aviso`, `esconderDesfazer` |
| `syncRodando` | 2471 | `espiarSync`, `sincronizarToDoAgora` | `sinoSvg` |
| `SYNC_POLL_MS` | 2471 | — | `espiarSync` |
| `balaoMenu` | 3096 | `etiquetaMenu` | `esconderEtiqueta` |
| `balaoAlvo` | 3096 | `esconderEtiqueta`, `etiquetaMenu` | `seguirEtiqueta` |
| `planoPat` | 3903 | `ligarImportarPat`, `tentar`, `usarColeta` | `aplicarPat`, `criarMesmoAssim`, `cx`, `ignorarProtocolo`, `juntarAoCaso`, `juntarProvaveis`, `juntarUm`, `telaImportarPat` |
| `arquivoPat` | 3903 | `ligarImportarPat`, `usarColeta` | `ingerirDetalheNoCaso` |
| `coletasPendentes` | 3918 | `buscarColetas` | `coletasPorFonte`, `renderImportarPat` |
| `soExigencia` | 4564 | `render` | — |
| `vistaAnimada` | 4618 | `render` | — |
| `planoPjeAtual` | 4907 | `aplicarPje`, `conferirPje` | `criarCasoEscolhidoPje`, `criarCasoPje`, `criarCasoPjeParaCliente`, `cx`, `escolherCasoPje`, `ignorarProcessoPje`, `limparIgnoradosPje`, `vincularEscolhidoPje` +3 |
| `planoPjeProcAtual` | 5185 | `aplicarPjeProc`, `conferirPjeProc` | `cx` |
| `planoCrpsAtual` | 5300 | `conferirCrps`, `so` | `cx` |
| `segItens` | 5571 | — | `abrirSeguimento`, `periciaRapida`, `segRegistrar` |
| `segAberto` | 5582 | `abrirSeguimento`, `salvarSeguimento` | `atualizarFraseSeg` |
| `filtroPlan` | 5925 | `dataDe` | — |
| `filtroPlanColab` | 5925 | `dataDe` | — |
| `zapFiltro` | 6555 | `meu` | — |
| `zapAberta` | 6555 | `abrirConversa` | `alternarBot`, `cartaoConversa`, `descartarRascunho`, `enviarZap`, `mandarArquivoZap`, `msgDocumentos`, `mudarConversa`, `pintarConversa` +7 |
| `zapMsgs` | 6555 | `abrirConversa`, `recarregarMsgs` | `atualizarVistos`, `pintarConversa`, `verMidiaZap` |
| `zapTimer` | 6555 | `pararZapTimer`, `renderWhats` | — |
| `zapConvs` | 6555 | `recarregarZap` | `abrirConversa`, `alternarBot`, `enviarZap`, `mandarArquivoZap`, `meu`, `msgDocumentos`, `mudarConversa`, `pintarConversa` +3 |
| `zapNota` | 6557 | `alternarNota` | `enviarZap`, `pintarConversa` |
| `zapFotos` | 6632 | — | `assinarFotosZap`, `avatarZap` |
| `cfgAvisos` | 7068 | — | `renderConfig` |
| `cfgPassos` | 7068 | — | `renderConfig` |
| `calMes` | 7395 | `irMes`, `irVisaoCal` | `mesAtual` |
| `calVisao` | 7442 | `irMes`, `irVisaoCal` | `ordena`, `vizinho` |
| `calFiltro` | 7443 | `filtrarCal` | `ordena`, `renderCalendario`, `vizinho` |
| `arrastando` | 7621 | `ligarArrasteCartoes`, `ligarArrasteListas`, `soltarClienteNaLista` | — |
| `ntSel` | 7899 | `novaTarefaComentario`, `ntTodos`, `ntToggle` | `ntSalvar` |
| `ntData` | 7899 | `novaTarefaComentario`, `ntDia` | `ntSalvar` |
| `ctRep` | 7954 | `concluirDeVez`, `concluirTarefa`, `ctRepetir` | `ntSalvar` |
| `subAnot` | 8904 | — | — |
| `_pdfjs` | 9239 | `carregarPdfJs` | — |
| `prazoDetectado` | 10554 | `fecharEsc`, `novoAndamento`, `pintarPrazoDoTexto` | `composerCaso` |
| `prazoCancelado` | 10554 | `fecharEsc`, `novoAndamento`, `pintarPrazoDoTexto`, `usarSugestao` | — |
| `adPre` | 11637 | `formAnalise`, `notaViraAnalise` | `cartaoAnalise` |
| `subDireito` | 11835 | `irSubDireito` | `renderDireito` |
| `respondeA` | 13269 | `armarResposta`, `desarmarResposta`, `pintarFicha` | `novoAndamento` |
| `tudoSoMarcos` | 13500 | `abrirFicha`, `painelTudo` | — |
| `_timerFolga` | 14832 | `folgaComposer` | — |
| `tfQuem` | 14909 | `novoAndamento`, `pintarFicha`, `tfNinguem`, `tfPessoa`, `tfTodos` | `salvarProrrog`, `tfDia` |
| `tfData` | 14909 | `novoAndamento`, `pintarFicha`, `tfDia` | `salvarProrrog` |
| `lbEditando` | 15185 | `lbEditar` | — |
| `lbMotivoEdit` | 15185 | `lbCarregarForm`, `lbEditar`, `lbFormHtml`, `lbSalvarMotivo` | — |
| `_docLinhas` | 15887 | `renderDocCatalogo` | `solicitarDocsCatalogo` |
| `_impEnd` | 16392 | `conferirImportacao` | `conta`, `gravarImportacao` |
| `_docPendente` | 17015 | `conferirAntesDeGerar`, `irPreencherCadastro`, `seguirComLacunas` | — |
| `atQuem` | 17500 | `atQuemTodos`, `atQuemToggle`, `marcado`, `pintarFicha` | `atualizarFraseNota` |
| `arCliSel` | 17685 | `anotacaoRapida`, `arEscolher`, `arNaoCliente`, `arNovoCliente`, `arProcurar`, `salvarAnotacaoRapida` | `arMostrarAlvo` |
| `arLead` | 17685 | `anotacaoRapida`, `arEscolher`, `arNaoCliente`, `arNovoCliente`, `arProcurar`, `salvarAnotacaoRapida` | `arMostrarAlvo` |
| `arNovo` | 17685 | `anotacaoRapida`, `arNaoCliente`, `arNovoCliente`, `arProcurar`, `salvarAnotacaoRapida` | `arMostrarAlvo` |
| `timerBusca` | 18434 | `novaCred` | — |
| `menuFichaSessao` | 18467 | `fecharFicha`, `janelaAtalhos` | `aplicarMenu` |
| `cursorLista` | 18522 | `moverCursor` | `atalhoDeLista`, `pintarCursor` |
| `timerCel` | 18596 | `janelaAtalhos` | — |

---

## Onde o JavaScript injeta estilo

Duas formas, muito diferentes uma da outra.

**1. `elemento.style.X = …` — 103 pontos.**
É o estilo que muda depois da pintura: mostrar, esconder, medir e posicionar.
São estes os que brigam com o CSS, porque ganham dele sempre.

| Propriedade | Vezes | Linhas |
|---|---:|---|
| `style.display` | 57 | 2020, 2174, 2419, 3107, 3113, 4632, 4841, 6190, 7586, 7698, 7741, 8228 … |
| `style.height` | 11 | 6740, 6740, 6811, 8614, 8615, 10565, 10565, 13182, 13183, 15348, 15348 |
| `style.background` | 6 | 2429, 2775, 2783, 5638, 5639, 5648 |
| `style.outline` | 5 | 15651, 15745, 15746, 15753, 15754 |
| `style.color` | 4 | 2787, 3083, 6144, 18665 |
| `style.left` | 4 | 2873, 3105, 10275, 13299 |
| `style.top` | 4 | 2874, 3106, 10276, 13300 |
| `style.pointerEvents` | 3 | 2237, 2252, 2258 |
| `style.backgroundImage` | 2 | 2773, 2776 |
| `style.backgroundSize` | 1 | 2777 |
| `style.backgroundPosition` | 1 | 2778 |
| `style.backgroundAttachment` | 1 | 2779 |
| `style.setProperty/cssText` | 1 | 2788 |
| `style.overflowY` | 1 | 8616 |
| `style.paddingBottom` | 1 | 14822 |
| `style.bottom` | 1 | 14826 |

**2. `style="…"` dentro do HTML gerado — 609 linhas.**
É o estilo escrito junto do template. Não some com um `classList`, e é o que
sobra da reforma visual: cada um destes é um lugar onde o CSS por classe ainda
não chegou. Um pente fino por aqui é o caminho natural de uma fase F13.


---

## Todas as funções

Ordenadas por linha. A coluna "o que faz" vem do comentário que o próprio
código já tinha; quando não havia, vem do corpo (função de uma linha) ou da
assinatura — a coluna **de onde** diz qual é o caso, para ninguém confundir
descrição escrita com texto extraído. "Quem chama" sai da varredura de chamadas
no arquivo; `HTML inline` quer dizer que a chamada está num `onclick=` dentro de
um template.

**Um aviso sobre a coluna "quem chama".** A varredura atribui cada chamada à
definição de função mais próxima acima dela. Funcionaria perfeitamente se todo
o código fosse função top-level — e a maior parte é. Onde há closure aninhada
(um `.map(x => …)` dentro de uma função grande, um `onclick` montado em
string), a atribuição vai para a função que contém o trecho, o que costuma ser
o que se quer, mas pode apontar para a definição de uma linha que só está por
perto. Trate a coluna como **pista para o grep**, não como verdade formal.

| Linha | Função | O que faz | De onde | Quem chama |
|---:|---|---|---|---|
| 2038 | `guardar()` | Grava uma chave no localStorage (com try/catch: navegador em anônimo recusa). | escrito à mão | `editarFato`, `entrar`, `gerarCasoDoPre`, `guardarConfig`, `irMes` +12 |
| 2042 | `ler()` | Lê uma chave do localStorage. | escrito à mão | `aplicarMenu`, `equipeAtiva`, `faltaConfig`, `linha`, `painelCadastroFicha` +4 |
| 2046 | `esquecer()` | Apaga uma chave do localStorage. | escrito à mão | `iniciar`, `pedirConfig`, `sair` |
| 2050 | `guardaFunciona()` | Testa se o navegador deixa gravar no localStorage. | escrito à mão | `entrar` |
| 2054 | `faltaConfig()` | Diz se o endereço do Supabase ainda é o texto de instalação. | escrito à mão | `ela mesma`, `entrar`, `pintarLetraAvatares` |
| 2062 | `guardarConfig()` | Salva neste aparelho um endereço de banco diferente do padrão. | escrito à mão | `HTML inline` |
| 2090 | `hoje()` | A data de hoje no relógio de Brasília, mesmo com o aparelho em outro fuso. | escrito à mão | `HTML inline`, `abrirExigencia`, `alternarMeuDia`, `bloco`, `blocoApos` +103 |
| 2104 | `agoraSP()` | A hora de agora em Brasília. | escrito à mão | `renderMeuDia` |
| 2112 | `_dt()` | timestamp do banco -> data e hora de Brasília. | comentário acima | `dataSP`, `horaSP` |
| 2117 | `_semFuso()` | function _semFuso(ts){ return ts && !/[Zz]/[+-]\d\d:?\d\d$/.test(ts); } | o próprio corpo | `dataSP`, `horaSP` |
| 2118 | `dataSP()` | Timestamp do banco → data de Brasília. | escrito à mão | `bloco`, `blocoRecurso`, `cancelarEvento`, `cartaoCliente`, `compareceuEvento` +23 |
| 2122 | `horaSP()` | Timestamp do banco → hora de Brasília. | escrito à mão | `bloco`, `blocoMais`, `bolhaZap`, `comentario`, `cx` +14 |
| 2127 | `fmtTS()` | Timestamp → DD.MM.AAAA. | escrito à mão | `bloco`, `blocoDecisao`, `blocoMais`, `caixaArquivos`, `comentario` +15 |
| 2128 | `fmt()` | AAAA-MM-DD → DD.MM.AAAA. | escrito à mão | `abrirSeguimento`, `adiarLembrete`, `blocoApos`, `blocoCadunico`, `blocoCrpsManual` +94 |
| 2129 | `fmtCpf()` | 11 dígitos → [nº removido]. | escrito à mão | `avisoCpfRepetido`, `blocoSemEndereco`, `conferePdfComCliente`, `consultaComCpf`, `conta` +5 |
| 2130 | `digitosCpf()` | escapa TAMBÉM aspas e apóstrofos: sem isso, esc() protegia o miolo do | comentário dentro | `addNaLista`, `conferirCpfNovo`, `conferirImportacao`, `consultaComCpf`, `criarCliente` +2 |
| 2135 | `esc()` | Escapa HTML — é a barreira contra script vindo de texto de cliente. | escrito à mão | `HTML inline`, `abrirFicha`, `abrirFundos`, `abrirSeguimento`, `anotacaoViraAndamento` +163 |
| 2137 | `escJs()` | Escapa texto que vai dentro de um atributo onclick. | escrito à mão | `HTML inline` |
| 2139 | `urlOk()` | href só de verdade: link de coleta (PAT/PJe) sem https na frente não entra | comentário acima | `blocoMais`, `cx`, `linhaNovidade`, `painelCNJ` |
| 2140 | `dsa()` | Texto sem acento e em minúsculas, para comparar. | escrito à mão | `T`, `alternarFrase`, `aplicarChecklistCaso`, `aposDoCliente`, `avisoCpfRepetido` +34 |
| 2147 | `termosBusca()` | CPF, nº de processo, protocolo: vale o número inteiro, não os pedaços | comentário dentro | `pesquisar` |
| 2156 | `pesquisar()` | Procura clientes por nome, CPF, processo, protocolo ou NB. | escrito à mão | `arProcurar`, `render` |
| 2161 | `noNome()` | quem casa pelo NOME aparece primeiro; | comentário acima | `ela mesma` |
| 2170 | `limparBusca()` | F39 · navegar com a pesquisa ativa: | comentário acima | `irCel`, `sinoSvg` |
| 2177 | `moeda()` | Número → R$ com duas casas. | escrito à mão | `fecharEsc`, `novoPgto`, `painelPagamentosFicha`, `renderDash` |
| 2185 | `equipeAtiva()` | (F41) UM predicado para "quem está na equipe": | comentário acima | `abrirSeguimento`, `atQuemTodos`, `blocoDecisao`, `colAdmin`, `colPorNome` +15 |
| 2201 | `somLigado()` | som de retorno, como no To Do (gerado na hora — sem arquivo de áudio). | comentário acima | `plim`, `sinoSvg` |
| 2202 | `plim()` | O som curto de tarefa concluída. | escrito à mão | `aviso`, `avisoDesfazer`, `concluirDeVez`, `confirmarSeparacao`, `converterEscritorioEmMassa` +22 |
| 2222 | `guardarRascunho()` | o rascunho do andamento (por caso, só nesta sessão do navegador) ────── Guardar no sessionStorage e não no D: | comentário acima | `fecharEsc` |
| 2227 | `lerRascunho()` | Recupera o rascunho do andamento desta sessão do navegador. | escrito à mão | `fecharEsc` |
| 2230 | `limparRascunho()` | Apaga o rascunho depois que o andamento foi registrado. | escrito à mão | `novoAndamento` |
| 2233 | `aviso()` | O toast do rodapé. | escrito à mão | `abrirAnexo`, `abrirDecisao`, `abrirExplorer`, `abrirFicha`, `abrirTodasNovidades` +210 |
| 2246 | `avisoDesfazer()` | avisoDesfazer(msg, voltar) | assinatura | `concluirDeVez` |
| 2256 | `esconderDesfazer()` | esconderDesfazer() | assinatura | `desfazerAgora` |
| 2261 | `desfazerAgora() async` | desfazerAgora() | assinatura | `HTML inline` |
| 2268 | `api() async` | O único caminho até o Supabase: monta cabeçalho, trata 401 e devolve JSON. | escrito à mão | `abrirConversa`, `addNaLista`, `adiarLembrete`, `alternarMarcador`, `alternarMeuDia` +145 |
| 2301 | `subirArquivo() async` | Envia um arquivo para o Storage do Supabase. | escrito à mão | `anexar`, `anexarPreCaso`, `mandarArquivoZap` |
| 2311 | `linkArquivo() async` | linkArquivo(caminho, segundos=120) | assinatura | `abrirAnexo`, `abrirDecisao`, `verMidiaZap` |
| 2316 | `abrirAnexo() async` | Abre um anexo do processo numa aba nova. | escrito à mão | `HTML inline` |
| 2325 | `todas() async` | Busca paginada — é ela que evita o corte silencioso em 1000 linhas do PostgREST. | escrito à mão | `abrirConversa`, `abrirFicha`, `alternarMeuDia`, `carregar`, `conferirPje` +8 |
| 2336 | `renovar() async` | Renova o token do Supabase antes de ele expirar. | escrito à mão | `api`, `blocoCadunico`, `pintarLetraAvatares` |
| 2353 | `erroLogin()` | login ───────────────────────────────────────────────────────────────── A tela de login precisa DIZER o que houve. | comentário acima | `entrar`, `iniciar` |
| 2358 | `entrar() async` | Login por e-mail e senha no Supabase Auth. | escrito à mão | `janelaAtalhos` |
| 2400 | `pedirConfig()` | abrir a caixa de configuração a qualquer momento, não só no primeiro acesso | comentário acima | `HTML inline` |
| 2405 | `sair()` | Encerra a sessão e limpa o guardado. | escrito à mão | `api`, `caixaPje`, `pintarLetraAvatares` |
| 2410 | `iniciar() async` | O arranque: confere a sessão guardada e decide entre login e app. | escrito à mão | `entrar`, `pintarLetraAvatares` |
| 2444 | `patchCaso()` | Ajuste do ESCRITÓRIO, não do navegador de cada um: | comentário acima | `alternarArquivo`, `alternarMarcador`, `aplicarPje`, `aplicarPjeProc`, `casoViraLembrete` +44 |
| 2451 | `tarefaNaMemoria()` | TODA tarefa criada em tela entra na memória NA HORA — gravar no banco e só aparecer no Meu Dia depois do F5 fazia a tarefa recém-criada "sumir" das listas (cria | comentário acima | `concluirDeVez`, `correnteConferencia`, `criar`, `desfazerConclusao`, `novoAndamento` +2 |
| 2456 | `cfgApp()` | function cfgApp(chave){ return (D.config//new Map()).get(chave); } | o próprio corpo | `abrirSmbot`, `avisoCRPS`, `blocoRevisao`, `estadoCRPS`, `estadoPonte` +11 |
| 2457 | `guardarCfgApp() async` | guardarCfgApp(chave, valor) | assinatura | `cfgSalva`, `guarda`, `ignorarProcessoPje`, `ignorarProtocolo`, `limparIgnoradosPat` +4 |
| 2472 | `sincronizarToDoAgora() async` | sincronizarToDoAgora() | assinatura | `HTML inline` |
| 2506 | `saudeSync() async` | F72 · a SAÚDE da sincronização, sem sair do CRM: | comentário acima | `HTML inline` |
| 2512 | `el()` | const el=()=>document.getElementById("ss-corpo"); | o próprio corpo | `ela mesma` |
| 2550 | `ssTestarChave() async` | F77 · testa uma chave do Supabase SEM guardar: | comentário acima | `HTML inline` |
| 2574 | `ssPasso() async` | ssPasso(runId, bt) | assinatura | `HTML inline` |
| 2607 | `espiarSync() async` | espiarSync(base, inicio) | assinatura | `ela mesma`, `sincronizarToDoAgora` |
| 2625 | `carregar() async` | A carga inicial: traz colaboradores, clientes, casos e o resto para o D global. | escrito à mão | `addNaLista`, `aplicarPje`, `aplicarPjeProc`, `confirmarSeparacao`, `criarCasoDoRecurso` +8 |
| 2760 | `fundoDaLista()` | fundoDaLista(v) | assinatura | `abrirFundos`, `aplicarTema` |
| 2764 | `aplicarTema()` | como no Microsoft To Do: cada lista pinta o fundo da área de trabalho | comentário dentro | `render` |
| 2791 | `ativos()` | chip de prazo estilo semáforo 🚦 | comentário dentro | `blocoRevisao`, `blocoSemAcao`, `blocoSemEndereco`, `casosDaFase`, `dataDe` +9 |
| 2793 | `chipPrazo()` | chip de prazo estilo semáforo 🚦 | comentário acima | `cartaoTarefa`, `kcardCaso` |
| 2798 | `diasAte()` | function diasAte(iso){ return Math.ceil((new Date(iso+"T12:00:00")-new Date(hoje()+"T12:00:00"))/864e5); } | o próprio corpo | `blocoCadunico`, `blocoFatos`, `caixaCadunico`, `chipDcb`, `chipExig` +1 |
| 2799 | `chipExig()` | chipExig(k) | assinatura | `blocoMais`, `kcardCaso`, `ultimo` |
| 2805 | `preencher()` | preenche um modelo de mensagem com os dados do cliente/evento | comentário acima | `copiarMsgExigencia`, `lembreteDoEvento`, `mandarArquivoZap`, `painelMensagensFicha`, `reindexarCliente` |
| 2813 | `modeloPor()` | link "criar evento" do Google Agenda (sem precisar de conexão/conta Google no app) | comentário dentro | `copiarMsgExigencia`, `lembreteDoEvento` |
| 2815 | `gcal()` | link "criar evento" do Google Agenda (sem precisar de conexão/conta Google no app) | comentário acima | `agendarAtendimento`, `painelPericiasFicha` |
| 2818 | `g()` | const g=d=>d.toLocaleDateString("sv").replace(/-/g,"")+"T"+d.toTimeString().slice(0,8).replace(/:/g,""); | o próprio corpo | `ela mesma` |
| 2825 | `listaDe()` | lista "efetiva" do caso: um mover pedido no app vale na hora, mesmo antes de o To Do acompanhar (escrever_todo faz o mover físico) | comentário acima | `blocoMais`, `cartaoCliente`, `casosDaFase`, `composerCaso`, `enviarPagamentos` +9 |
| 2830 | `clientesEmAtendimento()` | 🙋 ESCRITÓRIO NÃO É LISTA DE CASOS (08.99, pedido do Paulo). | comentário acima | `render`, `soTexto` |
| 2838 | `ultimaAnotacao()` | Tarefas com Prazo é a LISTA FIXA do To Do (não "tudo que tem data") — | comentário dentro | `clientesEmAtendimento` |
| 2841 | `casosDaFase()` | Tarefas com Prazo é a LISTA FIXA do To Do (não "tudo que tem data") — | comentário dentro | `render`, `soTexto` |
| 2854 | `fecharMenuMover()` | function fecharMenuMover(){ const m=document.getElementById("menu-mover"); if(m) m.remove(); } | o próprio corpo | `HTML inline`, `fase`, `menuMover`, `moverCaso` |
| 2855 | `menuMover()` | menuMover(ev, cliId) | assinatura | `ligarCartoes` |
| 2885 | `alternarMeuDia() async` | Meu Dia: liga e desliga. | comentário acima | `HTML inline` |
| 2902 | `moverCaso() async` | moverCaso(casoId, lista) | assinatura | `menuMover` |
| 2904 | `fase()` | const fase=(LISTAS_MOVER.find(([l])=>l===lista)//[])[1]; | o próprio corpo | `botaoMais`, `janelaPrazoCumprido`, `separarRecursos` |
| 2916 | `quantosNoMeuDia()` | o número do ☀️ na barra, como o To Do mostra: | comentário acima | `montarSidebar` |
| 2919 | `tfHoje()` | const tfHoje = k => (D.tarefasPorCaso.get(k.id)//[]).some(t=>t.lembrar_em===hoje()); | o próprio corpo | `ela mesma` |
| 2968 | `svgIc()` | título da lista (espec. 6.1): sempre azul-escuro, com o ícone SVG da lista | comentário dentro | `rotu`, `sinoSvg`, `tituloLista` |
| 2975 | `tituloLista()` | título da lista (espec. 6.1): | comentário acima | `render`, `renderAcervo`, `renderAgenda`, `renderCalendario`, `renderClaude` +17 |
| 2983 | `montarSidebar()` | Desenha a barra da esquerda inteira: listas, contadores, visões e o rodapé. | escrito à mão | `addNaLista`, `adiarLembrete`, `alternarMeuDia`, `apagarAnalise`, `apagarRotina` +68 |
| 3002 | `rotu()` | rótulo = "☀️ Meu Dia" -> ícone + texto separados (o texto some no menu recolhido) ícone e texto em CÉLULAS SEPARADAS. | comentário acima | `soTexto`, `tfHoje` |
| 3008 | `soTexto()` | o nome sem o emoji: é ele que o leitor de tela anuncia e que a etiqueta do menu recolhido mostra | comentário acima | `ela mesma` |
| 3041 | `sinoSvg()` | sinoSvg = on => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" st | assinatura | `ela mesma` |
| 3097 | `etiquetaMenu()` | etiquetaMenu(el) | assinatura | `seguirEtiqueta`, `sinoSvg` |
| 3112 | `seguirEtiqueta()` | rolar o trilho com o mouse parado não pode apagar a etiqueta: | comentário acima | **ninguém** |
| 3113 | `esconderEtiqueta()` | ── o e-Recursos (CRPS), traduzido ──────────────────────────────────────── | comentário dentro | `aplicarMenu`, `sinoSvg` |
| 3124 | `CRPS()` | o e-Recursos (CRPS), traduzido ──────────────────────────────────────── Cópia de robo-crps/traduzir.js + comentarioDoEvento de ingerir.js, os dois com teste pró | comentário acima | `caixaArquivos`, `copiarCasoCompleto`, `salvarManualNovidade` |
| 3135 | `semAcento()` | alguns nomes de arquivo/eventos vêm com UTF-8 estragado (mojibake). | comentário dentro | `dataSessao`, `situacaoDe`, `traduzirEvento`, `traduzirProcesso` |
| 3141 | `limpar()` | alguns nomes de arquivo/eventos vêm com UTF-8 estragado (mojibake). | comentário acima | `sufDestino`, `traduzirEvento`, `traduzirProcesso` |
| 3157 | `orgaoJulgador()` | QUEM julgou — e, portanto, em que instância o recurso está. | comentário acima | `caixaResumo`, `comentarioDoEvento`, `orgaoCurto`, `orgaoDoAcordao` |
| 3191 | `orgaoDoAcordao()` | orgaoDoAcordao(texto) | assinatura | **ninguém** |
| 3201 | `orgaoCurto()` | a versão curta, para caber no fim da linha do andamento ("(25ª Junta)") | comentário acima | `sufDestino`, `sufOrgao` |
| 3208 | `dataSessao()` | data da sessão embutida no texto ("... | comentário acima | `ela mesma` |
| 3293 | `sufOrgao()` | "... - Acórdão: | comentário acima | `dataSessao` |
| 3295 | `sufDestino()` | "Encaminhamento - ([nº removido] para 25ª JR)" → " à 25ª Junta" | comentário acima | `dataSessao` |
| 3304 | `ehArquivoDeDecisao()` | o nome do arquivo diz se ele é o que DECIDE — é por ele que o coletor sabe o que vale a pena baixar (acórdão e decisão monocrática, não o acervo todo) | comentário acima | `traduzirEvento` |
| 3307 | `traduzirEvento()` | traduz UM evento cru {status, data, documentos} → objeto de andamento | comentário acima | `rerotular` |
| 3333 | `dataParaISO()` | converte "DD/MM/AAAA HH:MM:SS" → ISO, para ordenar/comparar | comentário acima | `chaveEvento`, `comentarioDoEvento`, `isoCrps`, `planoCrps`, `traduzirProcesso` |
| 3345 | `traduzirProcesso()` | traduz o processo INTEIRO (o JSON que a API devolve) para o bloco casos.crps | comentário acima | `planoCrps` |
| 3366 | `chaveEvento()` | dá a "impressão digital" de um evento, para o robô saber o que é NOVO entre uma varredura e outra (data + status cru bastam) | comentário acima | `marca`, `planoCrps` |
| 3372 | `rerotular()` | Corrigimos uma REGRA e o rótulo errado já está gravado na ficha. | comentário acima | **ninguém** |
| 3388 | `comentarioDoEvento()` | comentarioDoEvento(e) | assinatura | `planoCrps` |
| 3402 | `semSufixo()` | semSufixo(s) | assinatura | `comentarioDoEvento` |
| 3413 | `isoCrps()` | F74 · a data do evento do CRPS vem em dd/mm/aaaa (como a API manda) — quem consome para ORDENAR ou FORMATAR precisa do ISO. | comentário acima | `blocoRecurso`, `fatosDoCasoTodo`, `manual`, `ramoRecurso` |
| 3500 | `limpo()` | const limpo = s => String(s // '').trim().toUpperCase(); | o próprio corpo | `especieDe`, `juntar`, `resumoDoDetalhe`, `situacaoDe` |
| 3504 | `situacaoDe()` | const situacaoDe = s => SITUACOES[semAcento(limpo(s)).replace(/\s+/g, '_')] | o próprio corpo | `resumoDaLista`, `resumoDoDetalhe` |
| 3507 | `especieDe()` | a sigla diz o TIPO e os marcadores; o código do INSS, quando vem, tem a | comentário dentro | `resumoDoDetalhe` |
| 3536 | `dataIso()` | dataIso(br) | assinatura | `juntar` |
| 3543 | `eventosDe()` | eventosDe(det) | assinatura | `resumoDoDetalhe` |
| 3545 | `juntar()` | juntar = (lista, tipo) => (Array.isArray(lista) ? lista : []).map(a => ( | assinatura | `ela mesma`, `sugestoes` |
| 3557 | `comentariosDe()` | sem `id` do portal, a chave é data+texto. Descartar o comentário | comentário dentro | `resumoDoDetalhe` |
| 3574 | `resumoDaLista()` | resumoDaLista(t) | assinatura | `normalizarColeta` |
| 3588 | `resumoDoDetalhe()` | resumoDoDetalhe(d) | assinatura | `normalizarColeta` |
| 3640 | `digitos()` | const digitos = s => String(s // '').replace(/\D/g, ''); | o próprio corpo | `conferePdfComCliente`, `indexar`, `ingerirDetalheNoCaso`, `planoDeImportacao`, `protocolosDe` |
| 3642 | `protocolosDe()` | protocolosDe(k) | assinatura | `indexar` |
| 3648 | `indexar()` | indexar(D) | assinatura | `planoDeImportacao` |
| 3660 | `casosParecidos()` | casosParecidos(D, clienteId, lista, especie) | assinatura | `casoParecido`, `planoDeImportacao` |
| 3665 | `casoParecido()` | SEPARAR O ÓBVIO DO DUVIDOSO. Sessenta e cinco decisões na mão é trabalho | comentário dentro | **ninguém** |
| 3667 | `tituloDoCaso()` | SEPARAR O ÓBVIO DO DUVIDOSO. Sessenta e cinco decisões na mão é trabalho | comentário dentro | `planoDeImportacao` |
| 3680 | `palavrasDoBeneficio()` | palavrasDoBeneficio(t) | assinatura | `mesmoBeneficio` |
| 3687 | `mesmoBeneficio()` | duas palavras significativas em comum, ou tudo o que o nome mais curto tem | comentário acima | `porQueParecido` |
| 3694 | `porQueParecido()` | Recurso e revisão NÃO têm benefício próprio: o nome que veio do portal é | comentário dentro | `planoDeImportacao` |
| 3715 | `mudancasDoCaso()` | O que muda num caso que JÁ existe. | comentário acima | `planoDeImportacao` |
| 3729 | `eventosNovos()` | eventosNovos(det, jaTem, hoje) | assinatura | `ingerirDetalheNoCaso`, `planoDeImportacao` |
| 3738 | `andamentoDaMudanca()` | F44 · a primeira situação também consta em 📣 (pedido do Paulo: TODA | comentário dentro | `planoDeImportacao` |
| 3759 | `limparHtmlPat()` | limparHtmlPat(t) | assinatura | `comentariosNovos`, `fatosDoCasoTodo`, `li`, `linhaNovidade`, `painelINSS` |
| 3768 | `comentariosNovos()` | comentariosNovos(det, jaTem) | assinatura | `ingerirDetalheNoCaso`, `planoDeImportacao` |
| 3781 | `planoDeImportacao()` | planoDeImportacao(pat, D, hoje) | assinatura | `montarPlanoPat` |
| 3865 | `porTipo()` | const porTipo = l => l.reduce((m, x) => (m[x.tipo] = (m[x.tipo] // 0) + 1, m), {}); | o próprio corpo | `ela mesma` |
| 3885 | `conferirPlanoPat()` | conferirPlanoPat(pat, plano) | assinatura | `montarPlanoPat` |
| 3908 | `normalizarColeta()` | A COLETA DA EXTENSÃO CHEGA CRUA. | comentário acima | `ligarImportarPat`, `usarColeta` |
| 3919 | `buscarColetas() async` | buscarColetas() | assinatura | `aplicarPje`, `aplicarPjeProc`, `descartarColetasVelhas`, `renderImportarPat`, `so` +1 |
| 3929 | `coletasPorFonte()` | SÓ A MAIS NOVA DE CADA PORTAL INTERESSA. | comentário acima | `cx`, `descartarColetasVelhas` |
| 3939 | `descartarColetasVelhas() async` | sai da fila sem sumir do banco: fica com data de aplicação, como as usadas | comentário dentro | `HTML inline` |
| 3948 | `usarColeta() async` | usarColeta(id) | assinatura | `cx` |
| 3965 | `montarPlanoPat() async` | O "JÁ ESTÁ NA FICHA" TEM DE VIR DO BANCO NA HORA DE CONFERIR. | comentário acima | `ligarImportarPat`, `usarColeta` |
| 3980 | `patIgnorados()` | patIgnorados() | assinatura | `cx`, `ignorarProtocolo`, `montarPlanoPat` |
| 3985 | `ignorarProtocolo() async` | ignorarProtocolo(protocolo) | assinatura | `HTML inline` |
| 3999 | `limparIgnoradosPat() async` | limparIgnoradosPat() | assinatura | `HTML inline` |
| 4005 | `renderImportarPat()` | Tela de importação do PAT/INSS. | escrito à mão | `render` |
| 4029 | `telaImportarPat()` | telaImportarPat() | assinatura | `renderImportarPat` |
| 4031 | `cx()` | const cx = n => `<div class="id-card"><strong style="font-size:20px">${n[1]}</strong> | o próprio corpo | **ninguém** |
| 4188 | `ligarImportarPat()` | ligarImportarPat() | assinatura | `renderImportarPat` |
| 4199 | `aplicarPat() async` | erro FORA do laço (dado com forma inesperada, por exemplo) não pode sumir | comentário dentro | `HTML inline` |
| 4207 | `aplicarPatDeVerdade() async` | UM ERRO NÃO PODE PARAR O LOTE. A primeira versão abortava no primeiro | comentário dentro | `aplicarPat` |
| 4213 | `tentar() async` | const tentar = async (rotulo, f) => { try{ await f(); feitos++; } | o próprio corpo | `aplicarCrps`, `ela mesma`, `so` |
| 4296 | `criarMesmoAssim() async` | os possíveis duplicados só entram quando você manda, um por um | comentário acima | `HTML inline` |
| 4328 | `juntarProvaveis() async` | juntar o protocolo do PAT a um caso que já existe — o caminho certo quando o caso é o mesmo e só faltava o número anotado JUNTAR EM LOTE, SÓ OS PROVÁVEIS. | comentário acima | `HTML inline` |
| 4347 | `novidadeNaMemoria()` | F40 · TUDO da importação passa por 📣 Novidades ────────────────────── A regra (pedido do Paulo, 17.08): | comentário acima | `criarMesmoAssim`, `ingerirDetalheNoCaso`, `juntarUm` |
| 4353 | `textoEvNovidade()` | o texto da novidade de um agendamento, com concordância pelo tipo | comentário acima | `ingerirDetalheNoCaso`, `tentar` |
| 4359 | `ingerirDetalheNoCaso() async` | ingere AGORA os comentários e agendamentos que a coleta trouxe para um protocolo recém-ligado a um caso (juntado ou criado). | comentário acima | `criarMesmoAssim`, `juntarUm`, `tentar` |
| 4389 | `resumoIngestao()` | o miolo de juntar, sem aviso nem redesenho: serve ao clique e ao lote | comentário dentro | `criarMesmoAssim`, `juntarUm`, `tentar` |
| 4394 | `juntarUm() async` | o miolo de juntar, sem aviso nem redesenho: | comentário acima | `juntarAoCaso`, `juntarProvaveis` |
| 4416 | `juntarAoCaso() async` | juntarAoCaso(protocolo) | assinatura | `HTML inline` |
| 4439 | `cartaoCliente()` | A linha do cliente na lista: nome, CPF, prazo com semáforo, perícia e os botões de ação. | escrito à mão | `blocoRevisao`, `blocoSemAcao`, `dataDe`, `m`, `render` +2 |
| 4484 | `em15()` | como no To Do: o nome em cima, e embaixo — miúdo e cinza — a data. | comentário acima | **ninguém** |
| 4542 | `diaDaSemana()` | diaDaSemana(iso) | assinatura | `dia` |
| 4546 | `dataRelativa()` | maisDias() pula para o próximo dia ÚTIL — na sexta, "amanhã" viraria | comentário dentro | `cx`, `em15`, `li`, `renderNovidades`, `tlOficial` |
| 4550 | `dia()` | maisDias() pula para o próximo dia ÚTIL — na sexta, "amanhã" viraria segunda e a etiqueta mentiria. | comentário acima | `ela mesma`, `tCol` |
| 4563 | `emExigencia()` | EM EXIGÊNCIA POR DOIS CAMINHOS. | comentário acima | `render` |
| 4566 | `grupoClientes()` | grupoClientes(casosSel) | assinatura | `blocoRevisao`, `blocoSemAcao`, `dataDe`, `m`, `render` +2 |
| 4583 | `ligarCartoes()` | Liga o clique, o menu do botão direito e o arraste em cada cartão da lista. | escrito à mão | `dataDe`, `m`, `render`, `renderAcervo`, `renderParcerias` +1 |
| 4619 | `render()` | O despachante da coluna do meio: decide qual tela desenhar a partir de `visao` e da busca. | escrito à mão | `HTML inline`, `addNaLista`, `adiarLembrete`, `alternarMeuDia`, `apagarAnalise` +62 |
| 4749 | `m()` | const m=ks=>ks.map(k=>k.prazo).filter(Boolean).sort()[0]//"9999"; | o próprio corpo | `atualizarFraseNota`, `ela mesma` |
| 4765 | `renderMeuDia()` | Tela ☀️ Meu Dia. | escrito à mão | `render` |
| 4777 | `doColab()` | const doColab = k => !filtroColab // (D.atrDoCaso.get(k.id)//[]).includes(filtroColab); | o próprio corpo | `tfDo` |
| 4778 | `tfDo()` | const tfDo = (k, teste) => (D.tarefasPorCaso.get(k.id)//[]) | o próprio corpo | `ela mesma` |
| 4784 | `tCol()` | const tCol = t => !filtroColab // t.particular_de===filtroColab // !t.particular_de; | o próprio corpo | **ninguém** |
| 4824 | `chaveSecao()` | F79 — as seções do Meu Dia recolhem: | comentário acima | `ligarSecoes` |
| 4828 | `ligarSecoes()` | ligarSecoes() | assinatura | `tCol` |
| 4836 | `aplicar()` | aplicar=() | assinatura | `ela mesma` |
| 4861 | `planoCrps()` | aplicar a coleta do e-Recursos ──────────────────────────────────────── A extensão entrega o que o portal respondeu, cru. | comentário acima | `planoCrpsComMemoria` |
| 4908 | `conferirPje() async` | conferirPje(coletaId) | assinatura | `criarCasoPjeParaCliente`, `cx`, `ignorarProcessoPje`, `limparIgnoradosPje`, `vincularPjeNoCaso` +1 |
| 4993 | `nomesBatemPje()` | casamento TOLERANTE de nome: | comentário acima | `conferirPje` |
| 4994 | `T()` | const T = s => dsa(s).split(/\s+/).filter(t=>t && !["da","de","do","das","dos","e"].includes(t)); | o próprio corpo | `ela mesma` |
| 5004 | `linkPje()` | o endereço dos autos digitais que o próprio acervo carrega (id + chave ca) — é o "abrir no PJe" das Novidades e da ficha, aberto na sessão logada | comentário acima | `conferirPje`, `criarCasoPjeParaCliente`, `vincularPjeNoCaso` |
| 5010 | `clienteDasPartes()` | o lado da parte que não é órgão público = o cliente | comentário acima | `conferirPje`, `escolherCasoPje` |
| 5012 | `ehOrgao()` | const ehOrgao = s=>/INSS/INSTITUTO NACIONAL/UNI[AÃ]O/FAZENDA/CHEFE D/CAIXA ECON/GERENTE/i.test(s); | o próprio corpo | `ela mesma` |
| 5020 | `vincularPjeNoCaso() async` | o vínculo em si, usado pela sugestão automática E pela escolha à mão: | comentário acima | `vincularEscolhidoPje`, `vincularProcessoPje` |
| 5037 | `vincularProcessoPje() async` | vincularProcessoPje(numero) | assinatura | `HTML inline` |
| 5047 | `criarCasoPjeParaCliente() async` | caso Judicial novo já com o número — o caminho do SEGUNDO processo do mesmo cliente (nada de pendurar dois processos numa ficha só) e o da escolha à mão quando  | comentário acima | `criarCasoEscolhidoPje`, `criarCasoPje` |
| 5071 | `criarCasoPje() async` | criarCasoPje(numero) | assinatura | `HTML inline` |
| 5083 | `escolherCasoPje()` | a ESCOLHA À MÃO ────────────────────────────────────────────────────── O casamento automático por nome só age quando bate com UM cliente — e o print do Paulo mo | comentário acima | `HTML inline` |
| 5098 | `filtrarEscolhaPje()` | filtrarEscolhaPje(numero) | assinatura | `HTML inline`, `escolherCasoPje` |
| 5117 | `vincularEscolhidoPje() async` | vincularEscolhidoPje(numero, casoId) | assinatura | `HTML inline` |
| 5126 | `criarCasoEscolhidoPje() async` | criarCasoEscolhidoPje(numero, cliId) | assinatura | `HTML inline` |
| 5133 | `vincularTodosPje() async` | vincularTodosPje() | assinatura | `HTML inline` |
| 5149 | `pjeIgnorados()` | pjeIgnorados() | assinatura | `conferirPje`, `cx`, `ignorarProcessoPje` |
| 5154 | `ignorarProcessoPje() async` | ignorarProcessoPje(numero) | assinatura | `HTML inline` |
| 5160 | `limparIgnoradosPje() async` | limparIgnoradosPje() | assinatura | `HTML inline` |
| 5168 | `momentosPje()` | o MOMENTO de cada andamento do PJe já gravado (processo:dataThora), venha ele do acervo (mov:) ou do histórico completo (hist:) — é o que impede as duas fontes  | comentário acima | `conferirPje`, `conferirPjeProc` |
| 5176 | `hashDjb()` | ── ⚖️ o PROCESSO COMPLETO (coleta 'pje-processo') ─────────────────────── | comentário dentro | `conferirPjeProc` |
| 5186 | `conferirPjeProc() async` | conferirPjeProc(coletaId) | assinatura | `cx` |
| 5225 | `aplicarPjeProc() async` | aplicarPjeProc(coletaId) | assinatura | `HTML inline` |
| 5263 | `aplicarPje() async` | completa as fichas (classe/ajuizamento) antes dos movimentos; banco sem | comentário dentro | `HTML inline` |
| 5308 | `planoCrpsComMemoria() async` | O PLANO COM A MEMÓRIA COMPLETA — usado pelo conferir E pelo aplicar. | comentário acima | `aplicarCrps`, `conferirCrps` |
| 5314 | `conferirCrps() async` | conferirCrps(coletaId) | assinatura | `cx` |
| 5337 | `fundirBlocoCrps()` | RECOLHER NÃO PODE APAGAR O QUE FOI ACRESCENTADO. | comentário acima | `so` |
| 5339 | `marca()` | const marca = a => String(a.id // a.nome // ""); | o próprio corpo | `ela mesma` |
| 5362 | `aplicarCrps() async` | aplicarCrps(coletaId) | assinatura | `HTML inline` |
| 5374 | `so()` | const so = x => String(x//"").replace(/\D/g,""); | o próprio corpo | `acharArquivoCrps`, `blocoDe`, `ela mesma`, `formatarNup`, `nupsDoCaso` +1 |
| 5409 | `recadoDeFalhas()` | O QUE DIZER QUANDO A GRAVAÇÃO FALHA. | comentário acima | `juntarProvaveis`, `so`, `tentar` |
| 5430 | `semMarcador()` | marcar frases numa anotação ─────────────────────────────────────────── Pedir duas coisas de uma vez é o caso comum — "pede o PPP" E "avisa o cliente". | comentário acima | `pintarSugestoes` |
| 5431 | `emItens()` | emItens(linhas) | assinatura | `alternarFrase` |
| 5435 | `alternarFrase()` | alternarFrase(inp, frase, conhecidas) | assinatura | `inserirPreenchida`, `usarSugestao` |
| 5469 | `novidades()` | os links das novidades não lidas, um por destino (o mesmo cliente com três | comentário dentro | `blocoNovidadesTopo`, `linksDasNovidades`, `montarSidebar`, `periciasEmLote`, `renderNovidades` |
| 5470 | `euLi()` | os links das novidades não lidas, um por destino (o mesmo cliente com três | comentário dentro | `ehEventoSistema`, `ela mesma`, `liTudoNaFicha`, `lidosDe`, `naoLi` |
| 5475 | `linksDasNovidades()` | os links das novidades não lidas, um por destino (o mesmo cliente com três avisos abre UMA aba): | comentário acima | `abrirTodasNovidades`, `renderNovidades` |
| 5495 | `abrirERecursos()` | 💬 SMBOT AO LADO DO NOME (pedido do Paulo): | comentário acima | `HTML inline` |
| 5503 | `abrirSmbot()` | abrirSmbot(cliId) | assinatura | `HTML inline` |
| 5512 | `abrirTodasNovidades()` | o costume do Paulo: viu a atualização, abre o processo. | comentário acima | **ninguém** |
| 5529 | `eventoNoTexto()` | 📌 DAR SEGUIMENTO ───────────────────────────────────────────────────── O andamento que chega de fora (INSS, Recurso, CNJ, PJe) pede um de três destinos: | comentário acima | `abrirSeguimento`, `aplicarPericia`, `linhaNovidade`, `periciasEmLote`, `renderNovidades` |
| 5557 | `evFem()` | "a perícia agendada" mas "o julgamento agendado": | comentário acima | `abrirSeguimento`, `criar`, `salvarSeguimento`, `textoEvNovidade` |
| 5558 | `diasUteisAntes()` | diasUteisAntes(iso, n) | assinatura | `HTML inline`, `abrirSeguimento`, `criar`, `salvarSeguimento` |
| 5564 | `evJaAgendado()` | os itens registrados nos renders (o texto pode ter aspas e acento — | comentário dentro | `abrirSeguimento`, `aplicarPericia`, `renderNovidades`, `salvarSeguimento` |
| 5572 | `segRegistrar()` | segRegistrar(casoId, texto, andId, deNovidade) | assinatura | `blocoRecurso`, `caixaPje`, `linhaNovidade`, `painelCNJ`, `painelINSS` +1 |
| 5576 | `segBtnHtml()` | F51 · o responsável padrão do escritório: o admin ativo (o Paulo) — é | comentário dentro | `blocoRecurso`, `caixaPje`, `linhaNovidade`, `painelCNJ`, `painelINSS` +1 |
| 5581 | `colAdmin()` | F51 · o responsável padrão do escritório: | comentário acima | `abrirSeguimento`, `criar` |
| 5583 | `abrirSeguimento()` | abrirSeguimento(i) | assinatura | `HTML inline` |
| 5655 | `atualizarFraseSeg()` | F55 · a frase-viva do 📌: mesma linguagem do rodapé das anotações | comentário acima | `HTML inline`, `abrirSeguimento` |
| 5657 | `v()` | const v=id=>{const e=document.getElementById(id);return e?e.value:"";}; | o próprio corpo | `atualizarFraseNota`, `criarLembrete`, `ela mesma`, `marcado`, `salvarAnalise` |
| 5661 | `salvarSeguimento() async` | salvarSeguimento() | assinatura | `HTML inline` |
| 5729 | `aplicarPericia() async` | a aplicação em UM clique (e em lote, nas Novidades): | comentário acima | `periciaRapida`, `periciasEmLote` |
| 5741 | `criar() async` | DOIS lembretes por perícia (pedido do Paulo): | comentário acima | `cx`, `ela mesma` |
| 5775 | `periciaRapida() async` | periciaRapida(i) | assinatura | `HTML inline` |
| 5782 | `periciasEmLote() async` | periciasEmLote() | assinatura | **ninguém** |
| 5797 | `blocoNovidadesTopo()` | as primeiras novidades, para caber no topo de outra lista sem tomar conta | comentário acima | `render` |
| 5809 | `linhaNovidade()` | uma linha da caixa de entrada, usada na lista 📣 e no topo do ⭐ | comentário acima | `blocoNovidadesTopo` |
| 5834 | `renderNovidades()` | Tela 📰 Novidades dos portais. | escrito à mão | `render` |
| 5875 | `liNaFicha() async` | liNaFicha(id) | assinatura | `HTML inline` |
| 5881 | `marcarLidas() async` | marcarLidas(ids) | assinatura | `HTML inline`, `liNaFicha`, `liTudoNaFicha`, `m`, `renderNovidades` +1 |
| 5902 | `renderAcervo()` | Tela 📚 Acervo. | escrito à mão | `render` |
| 5914 | `quantosNoAcervo()` | quantos esperam ali — o mesmo critério dos dois blocos, sem montar a tela | comentário acima | `montarSidebar` |
| 5916 | `lim()` | const lim = (()=>{ const d=new Date(hoje()+"T12:00:00"); | o próprio corpo | **ninguém** |
| 5926 | `renderPlanejado()` | Tela 🗓 Planejado. | escrito à mão | `render` |
| 5931 | `em()` | a "data" de um caso no Planejado é a mais próxima entre o prazo do caso | comentário dentro | `dataDe`, `rot` |
| 5934 | `dataDe()` | a "data" de um caso no Planejado é a mais próxima entre o prazo do caso e as tarefas de comentário — e o filtro por pessoa olha a tarefa DELA | comentário acima | `ela mesma` |
| 5978 | `cartaoTarefa()` | Minhas Tarefas (particulares) ───────────────────────────────────────── | comentário acima | `tCol` |
| 5987 | `ligarTarefas()` | ligarTarefas() | assinatura | `renderParticulares`, `tCol` |
| 5998 | `renderParticulares()` | Tela 📋 Minhas Tarefas. | escrito à mão | `render` |
| 6015 | `novaTarefa() async` | "renovar OAB amanhã" / "ligar dia 15" -> data extraída do texto (estilo Todoist) | comentário dentro | `HTML inline` |
| 6038 | `renderNovoCliente()` | Tela ＋ Novo cliente. | escrito à mão | `render` |
| 6090 | `cpfValido()` | F32 · o CPF é a CHAVE da organização: | comentário acima | `conferirCpfNovo`, `criarCliente` |
| 6102 | `conferirCpfNovo()` | enquanto a recepção digita, a resposta aparece LOGO ABAIXO: | comentário acima | `HTML inline` |
| 6122 | `ruaNovoAchada()` | a rua digitada contra a lista de CEPs: | comentário acima | `conferirRuaNovo`, `criarCliente` |
| 6134 | `conferirRuaNovo()` | conferirRuaNovo() | assinatura | `HTML inline` |
| 6149 | `avisarClienteNovo() async` | F28: cliente novo da recepção avisa os ADVOGADOS — a triagem começa com eles. | comentário acima | `criarCliente` |
| 6163 | `avisoCpfRepetido()` | CPF que já está no sistema não vira cliente novo: | comentário acima | `addNaLista`, `criarCliente` |
| 6193 | `mostrarIdadeNovo()` | a idade aparece já no cadastro: | comentário acima | `HTML inline` |
| 6199 | `criarCliente() async` | F32 · CPF digitado errado não entra: a base se organiza pelo CPF | comentário dentro | `HTML inline` |
| 6263 | `renderClaude()` | Tela 🤖 Claude (sugestões). | escrito à mão | `render` |
| 6281 | `decidirSugestao() async` | decidirSugestao(id, status) | assinatura | `HTML inline` |
| 6303 | `renderMencoes()` | Tela @ Menções. | escrito à mão | `render` |
| 6321 | `lerMencao() async` | lerMencao(id) | assinatura | `HTML inline` |
| 6327 | `criarMencoes() async` | criarMencoes(texto, casoId, andamentoId, extras) | assinatura | `novoAndamento` |
| 6355 | `quemAvisaCasoNovo()` | F10 · CASO NOVO AVISA QUEM DECIDE Caso nasce e ninguém fica sabendo até abrir a lista. | comentário acima | `avisarCasoNovo`, `avisarClienteNovo`, `renderConfig` |
| 6361 | `avisarCasoNovo() async` | avisarCasoNovo(casoId, cliId, comoNasceu) | assinatura | `addNaLista`, `gerarCasoDoPre`, `leadParaCliente`, `novoCaso` |
| 6374 | `renderModelosDoc()` | Tela 📄 Modelos de documento. | escrito à mão | `novoModeloDoc`, `render`, `salvarModeloDoc` |
| 6392 | `editarModeloDoc()` | editarModeloDoc(id) | assinatura | `HTML inline` |
| 6398 | `salvarModeloDoc() async` | salvarModeloDoc(id) | assinatura | `HTML inline` |
| 6405 | `novoModeloDoc() async` | novoModeloDoc() | assinatura | `HTML inline` |
| 6417 | `kcardCaso()` | kcardCaso(k) | assinatura | **ninguém** |
| 6424 | `renderQuadro()` | Tela 📌 Quadro (kanban por fase). | escrito à mão | `ligarQuadro`, `render` |
| 6438 | `ligarQuadro()` | ligarQuadro() | assinatura | `renderQuadro` |
| 6463 | `quandoFalou()` | "hoje 09:12" vale mais que a data cheia num cartão de funil: | comentário acima | `cartaoConversa`, `renderVendas` |
| 6470 | `renderVendas()` | Tela 💼 Vendas. | escrito à mão | `ela mesma`, `novoLead`, `render` |
| 6520 | `novoLead() async` | novoLead() | assinatura | `HTML inline` |
| 6529 | `leadParaCliente() async` | leadParaCliente(leadId) | assinatura | `HTML inline` |
| 6559 | `pararZapTimer()` | function pararZapTimer(){ if(zapTimer){ clearInterval(zapTimer); zapTimer=null; } } | o próprio corpo | `renderWhats` |
| 6561 | `renderWhats() async` | Tela 💬 WhatsApp. | escrito à mão | `render` |
| 6577 | `recarregarZap() async` | recarregarZap(silencioso) | assinatura | `renderWhats`, `transferirConversa` |
| 6595 | `estadoPonte()` | 2 minutos sem bater ponto: a ponte morreu, e é melhor dizer isso do que | comentário dentro | `enviarZap`, `meu`, `renderConfig` |
| 6606 | `pintarListaZap()` | pintarListaZap() | assinatura | `HTML inline`, `abrirConversa`, `mudarConversa`, `recarregarZap` |
| 6607 | `meu()` | const meu = c => c.atendente_id===eu.id; | o próprio corpo | `ela mesma` |
| 6633 | `avatarZap()` | avatarZap(c) | assinatura | `cartaoConversa`, `pintarConversa` |
| 6639 | `assinarFotosZap() async` | assinarFotosZap(cs) | assinatura | `recarregarZap` |
| 6650 | `nomeDaConversa()` | nomeDaConversa(c) | assinatura | `avatarZap`, `cartaoConversa`, `msgDocumentos`, `pintarConversa` |
| 6657 | `cartaoConversa()` | cartaoConversa(c) | assinatura | `meu` |
| 6673 | `telaVaziaZap()` | const telaVaziaZap = () => | o próprio corpo | `recarregarZap` |
| 6678 | `abrirConversa() async` | abrirConversa(id) | assinatura | `HTML inline`, `descartarRascunho`, `enviarZap`, `mandarArquivoZap`, `recarregarZap` +1 |
| 6690 | `recarregarMsgs() async` | recarregarMsgs() | assinatura | `recarregarZap` |
| 6699 | `atualizarVistos()` | só os selos de entrega mudaram: | comentário acima | `recarregarMsgs` |
| 6705 | `seloZap()` | const seloZap = m => m.direcao==="saida" ? (SELO[m.status]//"") : ""; | o próprio corpo | `atualizarVistos`, `bolhaZap` |
| 6707 | `pintarConversa()` | pintarConversa() | assinatura | `abrirConversa`, `alternarNota`, `mudarConversa`, `recarregarMsgs` |
| 6746 | `bolhaZap()` | bolhaZap(m, cli) | assinatura | `pintarConversa` |
| 6779 | `soltarRascunho() async` | Rascunho é aviso automático que a regra mandou conferir antes. | comentário acima | `HTML inline` |
| 6785 | `descartarRascunho() async` | descartarRascunho(id) | assinatura | `HTML inline` |
| 6792 | `alternarNota()` | alternarNota() | assinatura | `HTML inline` |
| 6800 | `verMidiaZap() async` | verMidiaZap(id) | assinatura | `HTML inline` |
| 6808 | `enviarZap() async` | nota interna nasce com direcao E status 'interna' — o banco recusa | comentário dentro | `HTML inline`, `pintarConversa` |
| 6832 | `tipoDoArquivo()` | O tipo importa: foto tem de chegar como FOTO, não como arquivo para baixar. | comentário acima | `mandarArquivoZap` |
| 6839 | `mandarArquivoZap() async` | mandarArquivoZap() | assinatura | `HTML inline` |
| 6864 | `preencheZap()` | Preenche um modelo com quem está DO OUTRO LADO da conversa. | comentário acima | `frasesZap` |
| 6883 | `frasesZap()` | frasesZap() | assinatura | `HTML inline` |
| 6915 | `msgDocumentos()` | A lista sai numerada e sem juridiquês: | comentário acima | `frasesZap` |
| 6926 | `mudarConversa() async` | mudarConversa(campos) | assinatura | `alternarBot`, `assumirConversa`, `resolverConversa` |
| 6933 | `assumirConversa()` | const assumirConversa = () => mudarConversa({atendente_id:eu.id, bot_ativo:false}); | o próprio corpo | `HTML inline` |
| 6934 | `alternarBot()` | const alternarBot = () => { const c=zapConvs.find(x=>x.id===zapAberta); | o próprio corpo | `HTML inline` |
| 6936 | `resolverConversa()` | const resolverConversa = () => { const c=zapConvs.find(x=>x.id===zapAberta); | o próprio corpo | `HTML inline` |
| 6939 | `transferirConversa() async` | transferirConversa() | assinatura | `HTML inline` |
| 6960 | `virarAndamento() async` | A mensagem NÃO vira andamento sozinha: | comentário acima | `HTML inline` |
| 6966 | `gravar() async` | gravar = async casoId | assinatura | `HTML inline`, `ela mesma` |
| 6981 | `ajudaQR()` | O código do QR é a credencial da sessão. Mandá-lo para um gerador de | comentário dentro | `HTML inline` |
| 7005 | `finalDoNB()` | 💰 Quando o benefício cai na conta ──────────────────────────────────── O final é o último algarismo do NB ANTES do traço: | comentário acima | `blocoPagamentoINSS`, `pagamentosDoNB` |
| 7011 | `pagamentosDoNB()` | próximos N pagamentos daquele final, a partir de hoje | comentário acima | `blocoPagamentoINSS` |
| 7022 | `ultimaCompetencia()` | até onde a tabela cadastrada alcança — passou disso, ninguém chuta data. | comentário acima | `blocoPagamentoINSS` |
| 7023 | `ultimoPagamento()` | const ultimoPagamento   = () => (D.inssCal//[]).reduce((m,x)=>x.pagamento>m?x.pagamento:m,""); | o próprio corpo | `blocoPagamentoINSS` |
| 7024 | `mesPorExtenso()` | const mesPorExtenso = iso => new Date(iso+"T12:00:00") | o próprio corpo | `blocoPagamentoINSS` |
| 7027 | `blocoPagamentoINSS()` | blocoPagamentoINSS(k) | assinatura | **ninguém** |
| 7054 | `salvarFaixaRenda() async` | salvarFaixaRenda(casoId, acima) | assinatura | `HTML inline` |
| 7070 | `renderConfig() async` | Tela ⚙️ Configurações. | escrito à mão | `cfgSalva`, `render` |
| 7221 | `estadoCRPS()` | estado do robô do CRPS, lido do config (nunca o crачhá em si) | comentário acima | `manual`, `renderConfig` |
| 7233 | `ligarConfig()` | quem atende | comentário dentro | `renderConfig` |
| 7234 | `guarda()` | quem atende | comentário dentro | `cfgSalva`, `ela mesma`, `linha` |
| 7269 | `cfgSalva()` | horário e interruptores | comentário acima | `ela mesma` |
| 7300 | `linha()` | avisos e passos do robô — a chave é o id, então dá para tratar igual | comentário acima | `conta`, `ela mesma`, `grupo`, `menuMover`, `painelINSS` +2 |
| 7320 | `renderMarketing()` | Tela 📣 Marketing. | escrito à mão | `render` |
| 7352 | `renderAgenda()` | Tela 🩺 Agenda de perícias. | escrito à mão | `render` |
| 7358 | `bloco()` | bloco=e | assinatura | `novoAtendimento` |
| 7396 | `mesAtual()` | function mesAtual(){ return calMes // hoje().slice(0,7); } | o próprio corpo | `ordena` |
| 7397 | `itensDoCalendario()` | itensDoCalendario() | assinatura | `renderCalendario` |
| 7399 | `push()` | const push=(dia,tipo,texto,cliId,extra)=>{ if(dia) it.push({dia,tipo,texto,cliId,...extra}); }; | o próprio corpo | `addNaLista`, `alternarFrase`, `alternarMarcador`, `aplicarChecklistCaso`, `aplicarCrps` +98 |
| 7444 | `irVisaoCal()` | "Hoje" é a âncora: volta o mês para o corrente, senão trocar para Mês | comentário dentro | `HTML inline` |
| 7451 | `filtrarCal()` | function filtrarCal(t){ calFiltro = (calFiltro===t) ? null : t; render(); } | o próprio corpo | `HTML inline` |
| 7452 | `itemCal()` | itemCal(i) | assinatura | **ninguém** |
| 7458 | `renderCalendario()` | Tela 📅 Calendário. | escrito à mão | `render` |
| 7464 | `ordena()` | const ordena=a=>a.sort((x,y)=>(x.hora//"99")<(y.hora//"99")?-1:1); | o próprio corpo | `vizinho` |
| 7480 | `vizinho()` | const vizinho=n=>{ const d=new Date(ano, mm-1+n, 1, 12); | o próprio corpo | `HTML inline` |
| 7555 | `irMes()` | ── escolher o fundo da lista ───────────────────────────────────────────── | comentário dentro | `HTML inline` |
| 7561 | `abrirFundos()` | escolher o fundo da lista ───────────────────────────────────────────── O To Do deixa cada lista com a sua cara. | comentário acima | **ninguém** |
| 7588 | `salvarFundo() async` | salvarFundo(chave, valor) | assinatura | `HTML inline`, `subirFundo` |
| 7601 | `subirFundo() async` | subirFundo(chave) | assinatura | `HTML inline` |
| 7622 | `ligarArrasteCartoes()` | ligarArrasteCartoes() | assinatura | `ligarCartoes` |
| 7635 | `ligarArrasteListas()` | as listas do escritório podem ser reordenadas entre si | comentário dentro | `sinoSvg` |
| 7665 | `soltarClienteNaLista() async` | solta o cliente numa lista: | comentário acima | `ligarArrasteListas` |
| 7675 | `lista()` | const lista=(LISTAS_MOVER.find(([,f])=>f===fase)//[])[0]; | o próprio corpo | `conferirCpfNovo`, `criarCasoDoRecurso`, `fatosDoCasoTodo`, `menuMover`, `render` +1 |
| 7681 | `escolherProcessoParaMover()` | escolherProcessoParaMover(cliId, ks, fase) | assinatura | `soltarClienteNaLista` |
| 7700 | `moverProcessoSolto() async` | moverProcessoSolto(casoId, fase) | assinatura | `HTML inline` |
| 7710 | `ordemDasFases()` | ordem das listas do escritório: | comentário acima | `reordenarListas`, `soTexto` |
| 7711 | `pos()` | const pos = v => { const p=(D.prefPorLista//new Map()).get("fase:"+v); | o próprio corpo | `ela mesma` |
| 7715 | `reordenarListas() async` | reordenarListas(origem, destino) | assinatura | `ligarArrasteListas` |
| 7737 | `mostrarAddRodape()` | ＋ Adicionar, fixo no pé da lista ───────────────────────────────────── No To Do é assim que quase toda tarefa nasce: | comentário acima | `render` |
| 7748 | `addNaLista() async` | addNaLista() | assinatura | `janelaAtalhos` |
| 7779 | `renderParcerias()` | Tela 🤝 Parcerias. | escrito à mão | `render` |
| 7795 | `barras()` | barras(pares) | assinatura | `renderDash` |
| 7799 | `renderDash()` | Tela 📊 Painel de números. | escrito à mão | `render` |
| 7845 | `lidosDe()` | quem já leu o comentário ("visto" da equipe) ────────────────────────── Cinza = ninguém confirmou ainda. | comentário acima | `ela mesma`, `marcarLido`, `vistos` |
| 7849 | `horaLocal()` | hora sempre no fuso de Franca: | comentário acima | `vistos` |
| 7858 | `tarefasDe()` | uma marca por pessoa: quem TEM tarefa neste comentário aparece com o | comentário dentro | `ehEventoSistema`, `vistos` |
| 7859 | `vistos()` | uma marca por pessoa: quem TEM tarefa neste comentário aparece com o | comentário dentro | `comentario`, `marcarLido` |
| 7900 | `novaTarefaComentario()` | novaTarefaComentario(andId, casoId) | assinatura | `HTML inline` |
| 7917 | `ntToggle()` | function ntToggle(id){ ntSel = ntSel.includes(id) ? ntSel.filter(x=>x!==id) : [...ntSel, id]; } | o próprio corpo | `HTML inline` |
| 7918 | `ntTodos()` | ntTodos() | assinatura | `HTML inline` |
| 7924 | `ntDia()` | ntDia(d, el) | assinatura | `HTML inline` |
| 7929 | `ntSalvar() async` | ntSalvar(andId, casoId) | assinatura | `HTML inline` |
| 7955 | `ctRepetir()` | ctRepetir(d, el) | assinatura | `HTML inline` |
| 7960 | `concluirTarefa()` | concluirTarefa(id) | assinatura | `HTML inline` |
| 7983 | `fecharTarefa() async` | fecharTarefa(id) | assinatura | `HTML inline` |
| 7993 | `concluirDeVez() async` | F14 · CONCLUIR EM UM CLIQUE O miolo da conclusão, separado da janela. | comentário acima | `HTML inline`, `atalhoDeLista`, `fecharTarefa` |
| 8067 | `desfazerConclusao() async` | a volta: reabre a tarefa e apaga o comentário que a conclusão escreveu. | comentário acima | `concluirDeVez` |
| 8084 | `adiarTarefa()` | adiarTarefa(id) | assinatura | `HTML inline` |
| 8093 | `mudarLembrar() async` | mudarLembrar(id, data) | assinatura | `HTML inline` |
| 8104 | `marcarLido() async` | marcarLido(andId, jaLi) | assinatura | `HTML inline` |
| 8137 | `rotinaVenceHoje()` | rotinaVenceHoje(r, iso) | assinatura | `renderRotinas`, `rotinasDoDia` |
| 8146 | `rotinaFeitaHoje()` | rotinaFeitaHoje(r) | assinatura | `blocoRotinas` |
| 8149 | `quandoRotina()` | quandoRotina(r) | assinatura | `blocoRotinas`, `renderRotinas` |
| 8156 | `rotinasDoDia()` | rotinasDoDia() | assinatura | `blocoRotinas` |
| 8161 | `blocoRotinas()` | blocoRotinas() | assinatura | `tCol` |
| 8180 | `marcarRotina() async` | marcarRotina(id, jaFeita) | assinatura | `HTML inline` |
| 8198 | `renderRotinas()` | Tela 🔁 Rotinas internas. | escrito à mão | `render` |
| 8244 | `novaRotina() async` | novaRotina() | assinatura | `HTML inline` |
| 8260 | `apagarRotina() async` | apagarRotina(id) | assinatura | `HTML inline` |
| 8272 | `escolherProcesso()` | qual processo? ──────────────────────────────────────────────────────── Cliente com mais de um processo em aberto: | comentário acima | `pintarFicha` |
| 8274 | `ultimo()` | ultimo = k | assinatura | `ela mesma` |
| 8297 | `escolhido()` | escolhido(cliId, casoId) | assinatura | `HTML inline` |
| 8304 | `caixa()` | Abre o modal genérico com o HTML recebido. | escrito à mão | `abrirSeguimento`, `adiarTarefa`, `ajudaQR`, `anotacaoRapida`, `anotacaoViraAndamento` +19 |
| 8312 | `fecharCaixa()` | fecharCaixa() | assinatura | `HTML inline`, `confirmarSeparacao`, `criarCasoEscolhidoPje`, `digitando`, `fecharTarefa` +17 |
| 8316 | `fecharEscolha()` | fecharEscolha() | assinatura | `HTML inline`, `moverProcessoSolto` |
| 8322 | `abrirFicha() async` | Abre a ficha de um cliente: busca as 6 consultas do cliente e manda pintar. | escrito à mão | `HTML inline`, `abrirDireitoDe`, `adiarLembrete`, `alternarArquivo`, `alternarMarcador` +88 |
| 8389 | `repintarFicha()` | Repinta a ficha SEM voltar à rede — é o que troca de aba e de sub-aba. | escrito à mão | `HTML inline`, `agendarAtendimento`, `anexarPreCaso`, `apagarNotaAtendimento`, `apagarRegistroAvulso` +41 |
| 8393 | `pintarFicha()` | Desenha a ficha do cliente inteira — cabeçalho, menu de abas e o painel da aba ativa. | escrito à mão | `abrirFicha`, `fecharEsc`, `painelConsulta`, `painelPagamentosFicha`, `painelPericiasFicha` +1 |
| 8542 | `rot()` | a etiqueta da aba diz o estado sem abrir: | comentário acima | `HTML inline`, `trilhaCaso` |
| 8614 | `crescer()` | Enter registra; Shift+Enter pula linha. | comentário acima | `HTML inline`, `fecharEsc` |
| 8629 | `abrirEsc()` | no celular o composer aberto come 190px do rodapé: quem estava | comentário dentro | **ninguém** |
| 8642 | `fecharEsc()` | as caixas que a barra abriu vão junto: sozinhas na tela, sem o botão | comentário dentro | **ninguém** |
| 8749 | `painelCadastroFicha()` | Aba Cadastro: monta o sub-menu e chama a divisão escolhida. | escrito à mão | `pintarFicha` |
| 8905 | `irSubCad()` | Troca a divisão do Cadastro e repinta. | escrito à mão | `HTML inline`, `irParaData`, `irSubAnot`, `novoAtendimento`, `qdIrParaAnotacoes` |
| 8912 | `irSubAnot()` | compatibilidade: o trilho interno de Anotações acabou na F30 — Consulta, Mensagens e Documentos são botões do trilho principal agora | comentário acima | **ninguém** |
| 9077 | `familiaDaEspecie()` | a família da espécie do caso — a primeira que casar | comentário acima | `familiaDaTriagem`, `painelTriagemFicha`, `rotProx`, `topicosDoMarcador` |
| 9088 | `familiaDaTriagem()` | os passos da triagem DESTE cliente: | comentário acima | `painelTriagemFicha`, `triagemPassosDe` |
| 9102 | `perguntasDoEscritorio()` | as perguntas que o ESCRITÓRIO acrescentou, e que valem para todos os clientes: | comentário acima | `novaPerguntaEscritorio`, `tirarPerguntaEscritorio`, `triagemPassosDe` |
| 9106 | `triagemPassosDe()` | triagemPassosDe(c, ks) | assinatura | `blocoDecisao`, `fecharAtendimento`, `painelTriagemFicha`, `triagemLeitura` |
| 9117 | `responderPorta() async` | gravar e desfazer a resposta da porta | comentário acima | `HTML inline` |
| 9127 | `novaPerguntaEscritorio() async` | acrescentar e tirar pergunta do escritório | comentário acima | `HTML inline` |
| 9139 | `tirarPerguntaEscritorio() async` | tirarPerguntaEscritorio(chave) | assinatura | `HTML inline` |
| 9150 | `triagemDe()` | F29 · a triagem encerrada é o portão: antes dela o cliente novo vê só o | comentário dentro | `blocoContas`, `blocoDecisao`, `blocoVidaContributiva`, `copiarVidaContributiva`, `familiaDaTriagem` +14 |
| 9155 | `triagemFechada()` | F29 · a triagem encerrada é o portão: | comentário acima | `abrirFicha`, `painelCadastroFicha`, `painelTriagemFicha`, `pintarFicha` |
| 9157 | `triagemLeitura()` | a leitura automática de cada passo: | comentário acima | `painelTriagemFicha` |
| 9240 | `carregarPdfJs() async` | carregarPdfJs() | assinatura | `itensDoPdf` |
| 9257 | `itensDoPdf() async` | devolve cada pedaço de texto com a posição na folha. | comentário acima | `lerPdfDaTriagem` |
| 9279 | `palavrasDoPdf()` | O pdf.js devolve PEDAÇOS de texto, não palavras: | comentário acima | `lerCnisPdf`, `lerDeclaracaoPdf`, `lerVinculosCnis` |
| 9296 | `linhasDoPdf()` | agrupa em linhas de leitura: | comentário acima | `lerCnisPdf`, `lerDeclaracaoPdf`, `lerVinculosCnis` |
| 9312 | `lerCnisPdf()` | lerCnisPdf(itens) | assinatura | `lerPdfDaTriagem` |
| 9319 | `pega()` | const pega = rx => { const m = tudo.match(rx); return m ? m[1].trim() : ""; }; | o próprio corpo | `ela mesma` |
| 9410 | `lerVinculosCnis()` | lerVinculosCnis(itens) | assinatura | `pega` |
| 9448 | `chave()` | ordem cronológica: é assim que a vida contributiva se lê, e não pela sequência do INSS, que segue a ordem de cadastro | comentário acima | `bolinha`, `ela mesma` |
| 9452 | `vidaContributivaTexto()` | o texto pronto para colar no parecer, na seção de vida contributiva | comentário acima | `copiarVidaContributiva` |
| 9453 | `dt()` | const dt = d => d ? d.replace(/\ | o próprio corpo | `blocoVidaContributiva`, `ela mesma` |
| 9468 | `lerDeclaracaoPdf()` | lerDeclaracaoPdf(itens) | assinatura | `lerPdfDaTriagem` |
| 9501 | `conferePdfComCliente()` | o CPF do documento é o do cliente aberto? Trocar o PDF de pessoa é o erro mais fácil de cometer e o mais caro de descobrir depois. | comentário acima | `lerPdfDaTriagem` |
| 9514 | `blocoVidaContributiva()` | a vida contributiva na tela ───────────────────────────────────────── Trinta linhas dentro da anotação do passo enterrariam os indicadores. | comentário acima | `painelTriagemFicha` |
| 9543 | `copiarVidaContributiva() async` | copiarVidaContributiva(cliId) | assinatura | `HTML inline` |
| 9563 | `botaoPdfTriagem()` | botaoPdfTriagem(cliId, chave) | assinatura | `painelTriagemFicha` |
| 9573 | `lerPdfDaTriagem() async` | lerPdfDaTriagem(cliId, chave) | assinatura | `HTML inline` |
| 9606 | `gravarCnisLido() async` | o que fica gravado ─────────────────────────────────────────────────── A leitura escreve a NOTA do passo e assina como leitura de PDF, com a data. | comentário acima | `lerPdfDaTriagem` |
| 9662 | `gravarDeclaracaoLida() async` | gravarDeclaracaoLida(cliId, lido) | assinatura | `lerPdfDaTriagem` |
| 9699 | `juntarNota()` | a nota antiga não é apagada: | comentário acima | `gravarCnisLido`, `gravarDeclaracaoLida` |
| 9703 | `lancarNoCaso() async` | lancarNoCaso(cliId, texto) | assinatura | `gravarCnisLido`, `gravarDeclaracaoLida` |
| 9714 | `painelTriagemFicha()` | painelTriagemFicha(c, ks) | assinatura | `painelCadastroFicha` |
| 9839 | `fecharAtendimento() async` | F17 · FECHAR O ATENDIMENTO — a triagem vira uma linha no caso A triagem fica na ficha do CLIENTE; | comentário acima | `HTML inline` |
| 9853 | `rotProx()` | const rotProx = (TRIAGEM_PROXIMO.find(([v])=>v===prox)//[])[1]; | o próprio corpo | **ninguém** |
| 9904 | `salvarTriagem() async` | salvarTriagem(cliId, triagem) | assinatura | `gravarCnisLido`, `gravarDeclaracaoLida`, `marcarDesemprego`, `marcarProximo`, `marcarTriagem` +5 |
| 9923 | `marcarTriagem() async` | marcar de novo o mesmo estado desmarca: | comentário acima | `HTML inline` |
| 9932 | `salvarNotaTriagem() async` | salvarNotaTriagem(cliId, passo) | assinatura | `painelTriagemFicha` |
| 9943 | `marcarProximo() async` | marcarProximo(cliId, valor) | assinatura | `HTML inline` |
| 9954 | `catalogoNoCadastro()` | Divisão Documentos: o catálogo de documentos por benefício (era a aba 8). | escrito à mão | `painelCadastroFicha` |
| 10029 | `consultaComCpf() async` | leva o CPF desta ficha junto: | comentário acima | `HTML inline` |
| 10036 | `painelConsulta()` | Divisão Consulta: o site interno do escritório embutido num iframe. | escrito à mão | `painelCadastroFicha` |
| 10086 | `painelPericiasFicha()` | Aba Perícias: a agenda de perícias e audiências do cliente. | escrito à mão | `rot` |
| 10121 | `vinculoDaParcela()` | aba 4 da ficha — extraída da pintarFicha (era um literal de 50 linhas) DE QUE BENEFÍCIO É ESTE DINHEIRO. | comentário acima | `painelPagamentosFicha` |
| 10138 | `vincularPgto() async` | vincularPgto(pgId, casoId) | assinatura | `HTML inline` |
| 10153 | `painelPagamentosFicha()` | Aba Honorários: parcelas do cliente, com a corrente de conferência. | escrito à mão | `rot` |
| 10218 | `painelMensagensFicha()` | Divisão Mensagens: modelos de mensagem prontos para o cliente. | escrito à mão | `painelCadastroFicha` |
| 10245 | `irAba()` | muda a aba ativa da ficha por código (ex.: | comentário acima | **ninguém** |
| 10248 | `fecharMenuProcessos()` | pop-up "⚖️ Processos": escolher o processo certo sem errar o destino | comentário acima | `item`, `menuProcessos` |
| 10250 | `menuCasosDoCliente()` | o mesmo menu, aberto pelo nome/avatar do cliente no topo da ficha | comentário acima | `HTML inline` |
| 10256 | `processosDe()` | Caso em fase de PAGAMENTO não é mais um processo em andamento: | comentário acima | `menuProcessos`, `pintarFicha`, `preencheZap`, `virarAndamento` |
| 10257 | `menuProcessos()` | a linha diz EM QUE LISTA o caso está (com o emoji do To Do — "👪 | comentário dentro | `HTML inline`, `menuCasosDoCliente` |
| 10264 | `item()` | a linha diz EM QUE LISTA o caso está (com o emoji do To Do — "👪 Judicial", "🙏 Aposentadorias Futuras"): | comentário acima | `alternarMarcador`, `quadroPendencias`, `solicitarDocsCatalogo` |
| 10288 | `novoVinculo() async` | vínculos entre clientes (parentes/amigos — o antigo checklist do To Do) | comentário acima | `HTML inline` |
| 10300 | `removerVinculo() async` | removerVinculo(vid) | assinatura | `HTML inline` |
| 10306 | `nomeDaEspecie()` | identidade didática do caso: | comentário acima | `editarFato`, `tituloCaso` |
| 10316 | `beneficioGenerico()` | O benefício é só outro jeito de escrever a espécie? Três formas reais: | comentário acima | `editarFato` |
| 10325 | `tituloCaso()` | decisão do Paulo (13.08): a ESPÉCIE define o título, sempre — nome | comentário dentro | `HTML inline`, `arMostrarAlvo`, `avisarCasoNovo`, `blocoMais`, `bolinha` +27 |
| 10337 | `consultaPendente()` | trilha completa em botões — inclui 💰 Pagamentos e ✔ Encerrado; | comentário acima | `painelCNJ` |
| 10357 | `inssFilaCaso()` | Régua da fila do INSS (casos.inss_fila, do inss_fila.py mensal): | comentário acima | `painelCNJ` |
| 10370 | `copiarInssFila()` | copiarInssFila(casoId) | assinatura | `HTML inline` |
| 10372 | `dbr()` | const dbr=i=>i?`${i.slice(8,10)}/${i.slice(5,7)}/${i.slice(0,4)}`:""; | o próprio corpo | `copiarDatajud`, `copiarMarco`, `copiarTrf3`, `ela mesma` |
| 10382 | `tituloOrgao()` | Andamento oficial na base pública do CNJ (casos.datajud, do datajud.py diário) | comentário acima | `blocoMais`, `blocoRecurso`, `copiarCrps`, `copiarDatajud`, `datajudCaso` +1 |
| 10392 | `irSubAba()` | Troca a sub-aba da aba Casos e repinta. | escrito à mão | `HTML inline`, `qdIrParaAndamento` |
| 10406 | `dataDoTexto()` | dataDoTexto(txt) | assinatura | `pintarPrazoDoTexto` |
| 10416 | `iso()` | const iso = d => d.toLocaleDateString("sv"); | o próprio corpo | `ela mesma` |
| 10444 | `sugestoes()` | Sugestões de texto: as frases prontas da equipe + os motivos do Lembrar. | comentário acima | `pintarSugestoes`, `usarSugestao` |
| 10494 | `alternarSugestoes()` | alternarSugestoes(casoId) | assinatura | `HTML inline` |
| 10504 | `pintarSugestoes()` | filtradas enquanto digita (aí aparecem sozinhas, como autocompletar); | comentário acima | `alternarSugestoes`, `fecharEsc`, `usarSugestao` |
| 10535 | `tfEscolherData()` | o campo de data só aparece quando é pedido — a barra fica limpa até lá | comentário acima | `HTML inline` |
| 10543 | `pintarPrazoDoTexto()` | enquanto digita: mostra a data que o sistema entendeu, para confirmar | comentário acima | `HTML inline`, `fecharEsc`, `usarSugestao` |
| 10555 | `usarSugestao()` | usarSugestao(el, k) | assinatura | `HTML inline` |
| 10584 | `dnIso()` | dn é DDMMAAAA (formato do To Do); | comentário acima | `caixaApos`, `dataIdadeApos`, `editarCampo`, `idadeDe` |
| 10590 | `somarAnos()` | 29/02 em ano não bissexto cai no dia 1º de março; puxar para 28/02 | comentário dentro | `dataIdadeApos`, `renovaCadunico` |
| 10597 | `menosMeses()` | menosMeses(iso, meses) | assinatura | `avisoApos` |
| 10606 | `diaUtilAntes()` | lembrete em fim de semana não é lembrete: | comentário acima | `avisoApos` |
| 10614 | `avisoApos()` | a data do aviso de uma aposentadoria: | comentário acima | `avisarCenario`, `caixaApos`, `chipRevisao`, `lembretesApos`, `salvarApos` |
| 10616 | `idadeDe()` | idade completa hoje, para mostrar junto do nascimento | comentário acima | `ehLoasIdoso`, `fichaIdentificacao`, `mostrarIdadeNovo` |
| 10656 | `_limpaLista()` | const _limpaLista = st => new Set([...st].filter(n=>!n.endsWith("-nao"))); | o próprio corpo | `ela mesma` |
| 10658 | `palpiteSexo()` | palpiteSexo(nome) | assinatura | `sexoDe` |
| 10680 | `sexoDe()` | Quem é o sexo deste cliente: | comentário acima | `aposAutomatica`, `caixaApos`, `dataIdadeApos` |
| 10687 | `dataIdadeApos()` | dataIdadeApos(cli) | assinatura | `aposAutomatica`, `caixaApos`, `idadeJaPassou` |
| 10693 | `idadeJaPassou()` | true quando a idade já tinha chegado antes do corte: | comentário acima | `caixaApos` |
| 10697 | `aposAutomatica()` | quem JÁ é aposentado não tem aposentadoria "provável": a Marcia (tempo | comentário dentro | `aposDoCliente`, `lembretesApos` |
| 10707 | `aposDoCliente()` | as gravadas + a automática, salvo quando já existe uma "Idade" à mão | comentário acima | `caixaApos`, `painelLembretes` |
| 10718 | `lembretesApos()` | todos os lembretes de aposentadoria do escritório, para a agenda. | comentário acima | `blocoApos`, `push` |
| 10737 | `lembrarApos() async` | adiar o aviso. Na automática ainda não há linha no banco: | comentário acima | `HTML inline`, `avisarCenario` |
| 10758 | `blocoApos()` | no Meu Dia: o aviso que já chegou a hora. | comentário acima | `tCol` |
| 10790 | `ehLoas()` | ehLoas(k){ return /loas/bpc/assistencial/amparo social/i.test( | assinatura | `ehLoasIdoso`, `triagemLeitura` |
| 10792 | `ehLoasIdoso()` | ehLoasIdoso(k, cli) | assinatura | `blocoCadunico`, `caixaCadunico`, `push` |
| 10797 | `renovaCadunico()` | renovaCadunico(k) | assinatura | `blocoCadunico`, `caixaCadunico`, `msgCadunico`, `push`, `salvarCadunico` +2 |
| 10800 | `msgCadunico()` | msgCadunico(cli, k) | assinatura | `blocoCadunico`, `caixaCadunico`, `cat`, `copiarMsgCadunico` |
| 10810 | `caixaCadunico()` | caixaCadunico(k, cli) | assinatura | `composerCaso` |
| 10838 | `sincronizarLembreteCadunico() async` | F10 · o CadÚnico deixou de ser só uma data dentro do caso. | comentário acima | `salvarCadunico` |
| 10864 | `salvarCadunico() async` | salvarCadunico(casoId, valor) | assinatura | `HTML inline` |
| 10877 | `copiarMsgCadunico()` | copiarMsgCadunico(cliId, casoId) | assinatura | `HTML inline` |
| 10887 | `ultimoZap()` | Último toque pelo WhatsApp ──────────────────────────────────────────── O webhook do SMBot avisa QUE a pessoa falou, não o que ela disse — o conteúdo fica no pa | comentário acima | `fichaIdentificacao` |
| 10900 | `blocoRevisao()` | Esteira de revisão: nenhum processo fica 90 dias sem um olhar ───────── A mineração das fichas mostrou mediana de 114 dias sem registro. | comentário acima | `renderAcervo` |
| 10918 | `marcarRevisado() async` | marcarRevisado(ids) | assinatura | `renderAcervo`, `tCol` |
| 10938 | `avisoCRPS()` | A rede por baixo da rede: | comentário acima | `tCol` |
| 10944 | `blocoSemAcao()` | blocoSemAcao() | assinatura | `renderAcervo` |
| 10966 | `blocoSemEndereco()` | F9.3 · A FILA DO ENDEREÇO Cliente com processo em andamento e sem endereço nenhum. | comentário acima | `renderAcervo` |
| 10994 | `preencherEnderecoDe() async` | da fila direto para o campo: | comentário acima | `HTML inline` |
| 11005 | `blocoCrpsManual()` | no Meu Dia: os recursos que o robô não enxerga e alguém tem de abrir no site. | comentário acima | `tCol` |
| 11044 | `blocoCadunico()` | no Meu Dia: CadÚnico vencido ou vencendo nos próximos 90 dias, de todos os clientes — inclusive dos casos já encerrados | comentário acima | `tCol` |
| 11096 | `lembretesDo()` | F56 · o "Concluir em" do To Do, sem burocracia nova: o CRM CALCULA quando | comentário dentro | `painelLembretes`, `pintarFicha`, `proximaDataDe`, `quadroDatas` |
| 11104 | `proximaDataDe()` | F56 · o "Concluir em" do To Do, sem burocracia nova: | comentário acima | `pintarFicha` |
| 11135 | `irParaData()` | o clique da pílula leva para onde a data mora (aba pode não existir p/ este cliente — cai no Cadastro, onde vivem as anotações) | comentário acima | `HTML inline` |
| 11141 | `rotuloTipoLembrete()` | rotuloTipoLembrete(t) | assinatura | `blocoLembretes`, `painelLembretes` |
| 11144 | `msgLembrete()` | msgLembrete(l, c) | assinatura | `HTML inline`, `zapAvisoLembrete` |
| 11148 | `cat()` | const cat=(GPS_CATEGORIAS.find(([cod])=>cod===d.codigo)//[])[1]//""; | o próprio corpo | **ninguém** |
| 11192 | `competenciaMais()` | competenciaMais(comp, meses) | assinatura | `calcularGraca` |
| 11197 | `compHoje()` | a conta. `vs` é a linha do tempo do CNIS; `desempregado` é decisão de quem | comentário dentro | `calcularGraca` |
| 11198 | `compMenor()` | a conta. `vs` é a linha do tempo do CNIS; `desempregado` é decisão de quem | comentário dentro | `calcularGraca` |
| 11201 | `calcularGraca()` | a conta. `vs` é a linha do tempo do CNIS; | comentário acima | `blocoContas` |
| 11258 | `blocoContas()` | o bloco de contas, no pé da aba de Lembretes ──────────────────────── "Questões pertinentes do site interno", pedido do Paulo. | comentário acima | `painelLembretes` |
| 11290 | `marcarDesemprego() async` | marcarDesemprego(cliId, ligado) | assinatura | `HTML inline` |
| 11298 | `painelLembretes()` | Aba Lembretes: aposentadoria provável, lembretes ativos e o formulário do lembrete novo. | escrito à mão | `rot` |
| 11398 | `criarLembrete() async` | criarLembrete(cliId) | assinatura | `HTML inline` |
| 11414 | `lembreteAvisado() async` | lembreteAvisado(id, canal) | assinatura | `HTML inline`, `zapAvisoLembrete` |
| 11429 | `zapAvisoLembrete()` | zapAvisoLembrete(id) | assinatura | `HTML inline` |
| 11435 | `adiarLembrete() async` | adiarLembrete(id, data) | assinatura | `HTML inline` |
| 11444 | `desligarLembrete() async` | desligarLembrete(id) | assinatura | `HTML inline` |
| 11459 | `anotacaoViraAndamento()` | anotação do To Do (🙏 Aposentadorias Futuras) -> andamento de um caso ── A análise é MANUAL de propósito: | comentário acima | `HTML inline` |
| 11470 | `salvarAnotacaoNoCaso() async` | salvarAnotacaoNoCaso(lembId, i, casoId) | assinatura | `HTML inline`, `anotacaoViraAndamento` |
| 11490 | `blocoLembretes()` | no Meu Dia: os lembretes que venceram, prontos para despachar dali mesmo | comentário acima | `tCol` |
| 11511 | `casoViraLembrete() async` | migração combinada com o Paulo: | comentário acima | `HTML inline` |
| 11541 | `provavelRevisao()` | F23 · aposentado + caso de aposentadoria programável = provável REVISÃO, não concessão. | comentário acima | `chipRevisao` |
| 11549 | `chipRevisao()` | chipRevisao(k, c) | assinatura | `blocoMais` |
| 11570 | `analisesDe()` | function analisesDe(cliId){ return (D.analisesPorCliente&&D.analisesPorCliente.get(cliId))//[]; } | o próprio corpo | `blocoDecisao`, `painelDireito`, `pintarFicha`, `rotProx`, `statusAnalise` |
| 11571 | `moedaBR()` | function moedaBR(v){ const n=Number(v); | o próprio corpo | `cartaoCenario`, `resumoAnalise`, `salvarAnalise`, `statusAnalise`, `tile` |
| 11573 | `cenMelhor()` | quem JÁ pode aposentar segundo a análise mais recente e ainda não aposentou | comentário dentro | `blocoDecisao`, `dashDireito`, `renderDireito`, `salvarAnalise`, `statusAnalise` |
| 11575 | `mesesAte()` | quem JÁ pode aposentar segundo a análise mais recente e ainda não aposentou | comentário dentro | `cartaoCenario`, `tile` |
| 11579 | `direitoAlcancado()` | quem JÁ pode aposentar segundo a análise mais recente e ainda não aposentou — é o número da barra lateral, porque é o que exige ação | comentário acima | `dashDireito`, `soTexto` |
| 11589 | `cartaoCenario()` | cartaoCenario(cn, cliId) | assinatura | `cartaoAnalise` |
| 11604 | `resumoAnalise()` | resumoAnalise(a, c) | assinatura | `copiarAnalise` |
| 11610 | `copiarAnalise()` | copiarAnalise(id) | assinatura | `HTML inline` |
| 11615 | `cartaoAnalise()` | cartaoAnalise(a) | assinatura | **ninguém** |
| 11638 | `linhaCenario()` | linhaCenario(cn) | assinatura | `HTML inline`, `formAnalise` |
| 11648 | `formAnalise()` | formAnalise(c) | assinatura | `blocoDecisao`, `painelDireito` |
| 11672 | `salvarAnalise() async` | salvarAnalise(cliId) | assinatura | `HTML inline` |
| 11747 | `apagarAnalise() async` | apagarAnalise(id) | assinatura | `HTML inline` |
| 11758 | `notaViraAnalise()` | notaViraAnalise(lembId, i) | assinatura | `HTML inline` |
| 11767 | `avisarCenario() async` | o aviso de época reusa a máquina que já existe: | comentário acima | `HTML inline` |
| 11774 | `rotVinculo()` | F49 · a linha de estado que liga triagem, anotações e análise: | comentário acima | `salvarAnalise` |
| 11780 | `salvarVinculoTriagem() async` | salvarVinculoTriagem(cliId) | assinatura | `HTML inline` |
| 11790 | `statusAnalise()` | sem pictograma: os dois lugares desta linha (triagem e anotações) moram | comentário dentro | `blocoDecisao`, `painelTriagemFicha` |
| 11807 | `painelDireito()` | painelDireito(c) | assinatura | `rot` |
| 11836 | `irSubDireito()` | function irSubDireito(s){ subDireito=s; guardar("crm_subdireito", s); render(); } | o próprio corpo | `HTML inline` |
| 11837 | `abrirDireitoDe()` | function abrirDireitoDe(cliId){ abaAtiva=8; abrirFicha(cliId); } | o próprio corpo | `HTML inline` |
| 11838 | `renderDireito()` | renderDireito() | assinatura | `render` |
| 11874 | `dashDireito()` | dashDireito() | assinatura | `renderDireito` |
| 11888 | `tile()` | const tile=(n,rot,cor)=>`<div class="ad-tile" style="border-top:3px solid ${cor}"><b>${n}</b><span>${rot}</span></div>`; | o próprio corpo | `ela mesma` |
| 11926 | `caixaApos()` | caixaApos(cli) | assinatura | `painelLembretes` |
| 11988 | `marcarAposentado() async` | marcar à mão: 1 = já se aposentou, 0 = não, null = voltar à dúvida | comentário acima | `HTML inline` |
| 12005 | `novaApos()` | novaApos(cliId, data, especie) | assinatura | `HTML inline` |
| 12016 | `salvarApos() async` | salvarApos(cliId) | assinatura | `HTML inline` |
| 12026 | `apagarApos() async` | apagarApos(id) | assinatura | `HTML inline` |
| 12032 | `definirSexo() async` | definirSexo(cliId, sexo) | assinatura | `HTML inline` |
| 12051 | `editarCampo()` | editarCampo(campo, cliId) | assinatura | `HTML inline` |
| 12068 | `salvarCampo() async` | salvarCampo(campo, cliId) | assinatura | `HTML inline` |
| 12096 | `reindexarCliente()` | o índice da pesquisa guarda nome, CPF e telefone: | comentário acima | `converterCasoEmAtendimento`, `definirParceria`, `gerarCasoDoPre`, `salvarAnotacaoRapida`, `salvarCampo` +1 |
| 12105 | `trocarSenha() async` | guarda a senha e apaga a antiga. | comentário acima | `HTML inline` |
| 12121 | `nomeSeguro()` | nomeSeguro(n) | assinatura | `anexar`, `anexarPreCaso`, `mandarArquivoZap`, `subirFundo` |
| 12124 | `anexar() async` | anexar(casoId, cliId) | assinatura | `HTML inline` |
| 12148 | `apagarAnexo() async` | apagarAnexo(id) | assinatura | `HTML inline` |
| 12157 | `tamArq()` | const tamArq = n => n==null ? "" : n>=1048576 ? (n/1048576).toFixed(1).replace(".",",")+" MB" | o próprio corpo | `caixaArquivos` |
| 12159 | `caixaArquivos()` | caixaArquivos(k) | assinatura | `composerCaso` |
| 12227 | `ehAcidentario()` | o retrato do processo judicial: é Mandado de Segurança? corre no JEF ou | comentário dentro | `blocoMais` |
| 12233 | `dadosJudiciais()` | o retrato do processo judicial: | comentário acima | `blocoMais` |
| 12250 | `recorrerAte()` | prazo de recurso: 30 dias da decisão (o escritório adota a data em que ela foi proferida como a da ciência). | comentário acima | `blocoFatos`, `push` |
| 12261 | `quadroDatas()` | 📅 F57 · O QUADRO DE DATAS DO CASO — pedido do Paulo: | comentário acima | `blocoMais` |
| 12269 | `bolinha()` | anotações datadas não resolvidas — pulando a que já virou lembrete (salvarNotaAtendimento2 cria o gêmeo com título "Anotação: | comentário acima | `ela mesma` |
| 12356 | `grupo()` | const grupo=x=>!x.filhas//!x.filhas.length?linha(x) | o próprio corpo | **ninguém** |
| 12370 | `qdCaixaNota()` | F59 · clicou na linha, aparece a ANOTAÇÃO que criou a data — tudo sincronizado: | comentário acima | `qdVerLembrete`, `qdVerNota` |
| 12384 | `qdIrParaAnotacoes()` | F60 · o clique na tarefa leva ao PRÓPRIO andamento: aba Casos, sub-aba | comentário dentro | `HTML inline` |
| 12390 | `qdIrParaAndamento()` | F60 · o clique na tarefa leva ao PRÓPRIO andamento: | comentário acima | `HTML inline` |
| 12402 | `qdVerNota()` | qdVerNota(cliId, idx) | assinatura | `HTML inline` |
| 12407 | `qdVerLembrete()` | qdVerLembrete(id) | assinatura | `HTML inline` |
| 12426 | `qdMudarNota() async` | qdMudarNota(cliId, idx, valor) | assinatura | `HTML inline` |
| 12436 | `qdMudarPrazo() async` | qdMudarPrazo(casoId, valor) | assinatura | `HTML inline` |
| 12446 | `campoFato()` | campoFato(k, campo) | assinatura | `blocoMais`, `botaoMais` |
| 12533 | `doCatalogo()` | doCatalogo(especie) | assinatura | `linhaMarcadores` |
| 12539 | `marcadoresDe()` | a ordem é a do catálogo, não a de clique: assim "Rural + Especial" é | comentário dentro | `alternar`, `alternarMarcador`, `avisoPedidoIgual`, `docsDosMarcadores`, `linhaMarcadores` +3 |
| 12555 | `alternar()` | alternar(k, slug) | assinatura | `alternarMarcador` |
| 12562 | `rotuloDoPedido()` | rotuloDoPedido(k) | assinatura | `carregar`, `reindexarCliente` |
| 12569 | `docsDosMarcadores()` | docsDosMarcadores(k, jaTem = []) | assinatura | `alternarMarcador` |
| 12586 | `dicaDoMarcador()` | dicaDoMarcador(slug, especie) | assinatura | `linhaMarcadores` |
| 12593 | `pedidosIguais()` | pedidosIguais(a, b) | assinatura | `avisoPedidoIgual` |
| 12605 | `linhaMarcadores()` | A linha que responde "o que estou pedindo aqui?" sem abrir nada. | comentário acima | `blocoMais`, `botaoMais` |
| 12633 | `avisoPedidoIgual()` | Nem toda espécie tem o que marcar (B31, B57, B46…) — nesses casos a linha simplesmente NÃO aparece (F70: | comentário acima | `linhaMarcadores` |
| 12641 | `alternarMarcador() async` | alternarMarcador(casoId, slug) | assinatura | `HTML inline` |
| 12693 | `alternarAcompanhar()` | F12 · RAIZ E RAMOS — de onde o caso partiu e no que ele se ramificou O caso tem UM ponto de partida (o requerimento no INSS, com protocolo ou NB) e dali ramific | comentário acima | `HTML inline` |
| 12699 | `ramoRecurso()` | ramoRecurso(k, nup, i) | assinatura | `trilhaProcessual` |
| 12711 | `ramoProcesso()` | ramoProcesso(k, p) | assinatura | `trilhaProcessual` |
| 12726 | `trilhaProcessual()` | trilhaProcessual(k) | assinatura | `blocoMais` |
| 12750 | `mudarAcomp() async` | F68 · ACOMPANHAMENTO Manual ou Automático — a pergunta que separa os casos que o portal/robô vigia sozinho dos que alguém precisa abrir de tempos em tempos (INS | comentário acima | `HTML inline` |
| 12757 | `checarAcomp() async` | checarAcomp(casoId) | assinatura | `HTML inline` |
| 12766 | `linhaAcomp()` | linhaAcomp(k) | assinatura | `botaoMais` |
| 12783 | `blocoFatos()` | O cartão de fatos do processo, no topo da aba Casos. | escrito à mão | `rot` |
| 12802 | `botaoMais()` | F69 · o ➕ virou botão (o details saiu): | comentário acima | `blocoMais`, `ela mesma` |
| 12843 | `blocoMais()` | F69 · o corpo do "mais informações" (era o <details>): | comentário acima | `ela mesma` |
| 12948 | `maisDobra()` | (o 🔁 por caso da 08.55 durou um dia: cliente com dois casos não dizia em | comentário dentro | `HTML inline` |
| 12953 | `somaMeses()` | (o 🔁 por caso da 08.55 durou um dia: | comentário acima | `casoViraLembrete`, `dashDireito`, `lembreteAvisado` |
| 12959 | `editarFato()` | edição no lugar: o lápis vira campo, salva ao sair e volta a ser texto | comentário acima | `HTML inline` |
| 13003 | `novoProtocolo() async` | novoProtocolo(casoId) | assinatura | `HTML inline` |
| 13013 | `composerCaso()` | F45 · o compositor saiu do painelEscritorio para servir também ao Caso | comentário dentro | `painelEscritorio`, `painelTudo` |
| 13112 | `painelEscritorio()` | Sub-aba Andamentos do Escritório: a linha do tempo escrita pela equipe. | escrito à mão | `rot` |
| 13122 | `tlOficial()` | F45 · UMA estrutura para toda linha do tempo oficial (INSS, Recurso, CNJ, PJe, Caso completo): | comentário acima | `blocoRecurso`, `caixaPje`, `painelCNJ`, `painelINSS`, `painelTudo` |
| 13182 | `autoAltura()` | function autoAltura(t){ if(!t) return; t.style.height="auto"; | o próprio corpo | `escolherTipoAnotacao` |
| 13184 | `escolherTipoAnotacao()` | escolherTipoAnotacao(chave) | assinatura | `HTML inline` |
| 13212 | `pintarTipoFila()` | pintarTipoFila() | assinatura | `escolherTipoAnotacao` |
| 13221 | `tipoDoComentario()` | o comentário rotulado sai com o chip do tipo, não com o colchete cru | comentário acima | `comentario` |
| 13227 | `destacarMencoes()` | F42 · o texto escapado ganha as menções destacadas na cor do time — "@Marcos" deixa de ser texto morto e vira sinal de quem foi chamado | comentário acima | `comentario` |
| 13237 | `ehReacao()` | const ehReacao = a => EMOJIS_REACAO.includes(String(a.texto//"").trim()); | o próprio corpo | `li`, `linhaDoTempo` |
| 13238 | `reagir() async` | reagir(andId, casoId) | assinatura | `HTML inline` |
| 13247 | `comentario()` | comentario(a, resposta, reacoes) | assinatura | `li` |
| 13270 | `armarResposta()` | armarResposta(andId) | assinatura | `HTML inline` |
| 13283 | `desarmarResposta()` | F41 · o @ com menu: descoberta da menção sem decorar nome — o clique | comentário dentro | `HTML inline`, `novoAndamento` |
| 13289 | `fecharMenuArroba()` | F41 · o @ com menu: descoberta da menção sem decorar nome — o clique insere @Primeiro no texto e a menção nasce no Registrar (criarMencoes) | comentário acima | `menuArroba` |
| 13290 | `menuArroba()` | menuArroba(ev) | assinatura | `HTML inline` |
| 13313 | `ehEventoSistema()` | F42 · o que é registro de SISTEMA (fato, não conversa) encolhe para uma linha central — a conversa da equipe respira. | comentário acima | `li` |
| 13318 | `liTudoNaFicha() async` | liTudoNaFicha(casoId) | assinatura | `HTML inline` |
| 13327 | `linhaDoTempo()` | linhaDoTempo(ands) | assinatura | `painelEscritorio` |
| 13338 | `naoLi()` | const naoLi = a => !euLi(a) && a.autor_id!==eu.id; | o próprio corpo | `li` |
| 13341 | `li()` | li = a | assinatura | `ela mesma` |
| 13379 | `ehComentarioPat()` | 🌻 Andamentos INSS (PAT/Meu INSS) ──────────────────────────────────── Os comentários que aparecem no processo dentro do site do INSS, coletados pela extensão e  | comentário acima | `fatosDoCasoTodo`, `painelEscritorio` |
| 13382 | `comentariosPat()` | Os movimentos coletados do PJe pela extensão (origem='pje') são andamento | comentário dentro | `HTML inline`, `painelINSS` |
| 13388 | `andamentosPje()` | Os movimentos coletados do PJe pela extensão (origem='pje') são andamento OFICIAL do processo judicial: | comentário acima | `HTML inline`, `pintarFicha`, `pjeDoProcesso` |
| 13400 | `arqInfo()` | 🗄 arquivar POR PROCESSO ───────────────────────────────────────────── Arquivado não é do caso, é de cada processo: | comentário acima | `HTML inline`, `abaCnjArquivada`, `abaCrpsArquivada`, `abaPatArquivada`, `seloArquivo` |
| 13401 | `chaveCnj()` | as instâncias do CNJ como o painel mostra — helper único para o painel e | comentário dentro | `HTML inline`, `abaCnjArquivada`, `painelCNJ` |
| 13406 | `cnjInstancias()` | as instâncias do CNJ como o painel mostra — helper único para o painel e para a etiqueta da aba não divergirem | comentário acima | `abaCnjArquivada`, `fatosDoCasoTodo`, `painelCNJ` |
| 13412 | `abaPatArquivada()` | function abaPatArquivada(k){ return !!arqInfo(k,"pat"); } | o próprio corpo | `HTML inline` |
| 13413 | `abaCrpsArquivada()` | abaCrpsArquivada(k) | assinatura | `HTML inline` |
| 13417 | `abaCnjArquivada()` | abaCnjArquivada(k) | assinatura | `HTML inline` |
| 13421 | `alternarArquivo() async` | alternarArquivo(casoId, chave) | assinatura | `HTML inline` |
| 13434 | `seloArquivo()` | o selo + o botão, no canto direito do quadro do processo | comentário acima | `blocoRecurso`, `painelCNJ`, `painelINSS` |
| 13448 | `painelINSS()` | Sub-aba Andamentos INSS: o que o robô do PAT trouxe. | escrito à mão | `rot` |
| 13504 | `qSP()` | timestamp -> "AAAA-MM-DDTHH:MM" DE BRASÍLIA: | comentário acima | `caixaPje`, `fatosDoCasoTodo`, `painelINSS` |
| 13505 | `fatosDoCasoTodo()` | fatosDoCasoTodo(k, ands) | assinatura | `copiarCasoCompleto`, `painelTudo` |
| 13563 | `painelTudo()` | Sub-aba Caso completo: todas as fontes numa linha do tempo só. | escrito à mão | `rot` |
| 13599 | `copiarCasoCompleto()` | copiarCasoCompleto(casoId) | assinatura | `HTML inline` |
| 13618 | `crpsNups()` | 🖥 Recurso administrativo no CRPS (e-Recursos). | comentário acima | `abrirERecursos`, `avisoJuntos`, `criarCasoDoRecurso`, `painelCRPS`, `perguntarNovoCaso` +4 |
| 13625 | `crpsBlocos()` | crpsBlocos(k) | assinatura | `abaCrpsArquivada`, `acharArquivoCrps`, `blocoCrpsManual`, `blocoDoNup`, `copiarCrps` +8 |
| 13628 | `crpsTotalEventos()` | o que merece negrito no recurso: só o que DECIDE — acórdão e decisão | comentário dentro | `HTML inline` |
| 13637 | `decideOCaso()` | o que merece negrito no recurso: | comentário acima | `blocoRecurso`, `fatosDoCasoTodo`, `ramoRecurso` |
| 13645 | `caixaResumo()` | o quadro de UM recurso: apresentado como os andamentos do escritório — mesma zebra, mesma coluna de data à esquerda o resumo do que a decisão decidiu — o resumi | comentário acima | `blocoRecurso` |
| 13672 | `orgaoDaDecisao()` | QUEM julgou. A Junta de Recursos é a 1ª instância do CRPS: | comentário acima | `seloOrgao` |
| 13681 | `seloOrgao()` | seloOrgao(e, a) | assinatura | `blocoRecurso` |
| 13692 | `acharArquivoCrps()` | acha o arquivo dentro do bloco do recurso — os dois lados (ficha e resumidor) casam pelo mesmo par (nup, id do arquivo) | comentário acima | `conferirResumo`, `editarResumo`, `salvarResumo` |
| 13706 | `toggleImpCrps() async` | destacar a movimentação acende também o ⭐ do processo — é ele que faz o caso pular para a frente nas listas. | comentário acima | `HTML inline` |
| 13721 | `gravarCrps() async` | conferir é a diferença entre "a máquina achou" e "o escritório assinou" | comentário dentro | `conferirResumo`, `crpsAutomatico`, `crpsManual`, `manualSemNovidade`, `salvarManualAjuste` +3 |
| 13726 | `conferirResumo() async` | conferir é a diferença entre "a máquina achou" e "o escritório assinou" | comentário acima | `HTML inline` |
| 13737 | `editarResumo()` | corrigido à mão vira "curado": | comentário acima | `HTML inline` |
| 13748 | `salvarResumo() async` | salvarResumo(casoId, nup, marca) | assinatura | `HTML inline` |
| 13760 | `blocoRecurso()` | a decisão mais recente manda na Situação: é a instância em que o caso | comentário dentro | `manual` |
| 13813 | `painelCRPS()` | Sub-aba Recurso (CRPS): sessões e decisões do Conselho, por recurso. | escrito à mão | `rot` |
| 13815 | `manual()` | gerência dos números: lista com remover + campo para acrescentar | comentário dentro | `ela mesma` |
| 13872 | `nupsDoCaso()` | nupsDoCaso(k) | assinatura | `conferirPlano`, `planoCrps`, `planoDeSeparacao`, `t` |
| 13879 | `blocosDoCaso()` | blocosDoCaso(k) | assinatura | `conferirPlano`, `planoDeSeparacao`, `so`, `t` |
| 13882 | `formatarNup()` | formatarNup(d) | assinatura | `HTML inline`, `abrirERecursos`, `conferirPlano`, `confirmarSeparacao`, `criarCasoDoRecurso` +4 |
| 13887 | `tituloDoRecurso()` | tituloDoRecurso(k, nup, i) | assinatura | `blocoDe`, `criarCasoDoRecurso` |
| 13891 | `planoDeSeparacao()` | planoDeSeparacao(k) | assinatura | `confirmarSeparacao`, `separarRecursos` |
| 13895 | `blocoDe()` | const blocoDe = n => blocos.find(b => so(b.nup) === n) // null; | o próprio corpo | `ela mesma` |
| 13914 | `conferirPlano()` | conferirPlano(k, plano) | assinatura | `confirmarSeparacao`, `separarRecursos` |
| 13934 | `avisoJuntos()` | um caso para cada recurso ───────────────────────────────────────────── Cada recurso administrativo tem protocolo próprio, prazo próprio e decisão própria. | comentário acima | `manual` |
| 13945 | `separarRecursos()` | separarRecursos(casoId) | assinatura | `HTML inline` |
| 13968 | `confirmarSeparacao() async` | confirmarSeparacao(casoId) | assinatura | `HTML inline` |
| 14014 | `soDig()` | recurso de consulta manual ──────────────────────────────────────────── O e-Recursos só devolve o que está ligado ao CPF do procurador. | comentário acima | `HTML inline`, `abaCrpsArquivada`, `acrescentarProcesso`, `alternarAcompanhar`, `alternarNossoProcesso` +19 |
| 14015 | `quadroManual()` | quadroManual(b, k) | assinatura | `manual` |
| 14045 | `maisDiasISO()` | maisDiasISO(iso, dias) | assinatura | `manualSemNovidade`, `salvarManualNovidade` |
| 14049 | `blocoDoNup()` | blocoDoNup(k, nup) | assinatura | `crpsAutomatico`, `crpsManual`, `manualAjustar`, `manualSemNovidade`, `salvarManualAjuste` +1 |
| 14052 | `crpsManual() async` | crpsManual(casoId, nup) | assinatura | `HTML inline` |
| 14065 | `crpsAutomatico() async` | crpsAutomatico(casoId, nup) | assinatura | `HTML inline` |
| 14076 | `manualSemNovidade() async` | O botão que troca vinte anotações "não houve andamento" por uma linha só. | comentário acima | `HTML inline` |
| 14091 | `manualComNovidade()` | manualComNovidade(casoId, nup) | assinatura | `HTML inline` |
| 14103 | `salvarManualNovidade() async` | salvarManualNovidade(casoId, nup) | assinatura | `HTML inline` |
| 14125 | `manualAjustar()` | manualAjustar(casoId, nup) | assinatura | `HTML inline`, `crpsManual` |
| 14145 | `salvarManualAjuste() async` | salvarManualAjuste(casoId, nup) | assinatura | `HTML inline` |
| 14160 | `abrirDecisao() async` | abre a cópia do acórdão que mora no CRM (link assinado, curto) | comentário acima | `HTML inline` |
| 14169 | `copiarCrps()` | monta uma mensagem curta e clara para o cliente com a situação do(s) recurso(s) | comentário acima | `HTML inline` |
| 14184 | `salvarCrpsNup() async` | Um recurso por caso. Quando o caso já tem um número, o segundo NÃO entra junto: | comentário acima | `HTML inline` |
| 14201 | `perguntarNovoCaso()` | perguntarNovoCaso(k, nup) | assinatura | `salvarCrpsNup` |
| 14221 | `criarCasoDoRecurso() async` | criarCasoDoRecurso(k, nup) | assinatura | `salvarCrpsNup` |
| 14241 | `removerCrpsNup() async` | tira um número da lista (e o resultado dele, se já tinha sido consultado) | comentário acima | `HTML inline` |
| 14253 | `caixaPje()` | o quadro dos movimentos que a extensão colheu no painel do PJe — andamento oficial tanto quanto o DataJud, só que mais fresco (chega na hora da coleta) | comentário acima | `painelCNJ` |
| 14270 | `pjeForaDoCaso() async` | F71 · remove o movimento intruso e DIAGNOSTICA: | comentário acima | `HTML inline` |
| 14290 | `processosDoCaso()` | UM CASO, VÁRIOS PROCESSOS ──────────────────────────────────────────── O caso tem um ponto de partida (protocolo/NB) e dali ramifica: | comentário acima | `acrescentarProcesso`, `alternarAcompanhar`, `alternarNossoProcesso`, `blocoFatos`, `gerenciaProcessos` +4 |
| 14292 | `norm()` | const norm = p => (typeof p === "string" ? {numero:p} : {...p}); | o próprio corpo | **ninguém** |
| 14307 | `datajudDe()` | o andamento oficial daquele número: | comentário acima | `painelCNJ`, `ramoProcesso`, `rotuloProcesso` |
| 14313 | `rotuloProcesso()` | rotuloProcesso(k, p) | assinatura | `painelCNJ` |
| 14319 | `classeCurta()` | "MSCiv" -> "Mandado de Segurança"; | comentário acima | `ramoProcesso`, `rotuloProcesso` |
| 14328 | `fmtProc()` | fmtProc = n | assinatura | `HTML inline`, `acrescentarProcesso`, `gerenciaProcessos`, `ramoProcesso`, `removerProcesso` +2 |
| 14334 | `salvarProcessos() async` | o principal é o primeiro NOSSO que ainda está sendo acompanhado — é ele | comentário dentro | `acrescentarProcesso`, `alternarAcompanhar`, `alternarNossoProcesso`, `removerProcesso` |
| 14350 | `acrescentarProcesso() async` | acrescentarProcesso(casoId) | assinatura | `HTML inline` |
| 14361 | `alternarNossoProcesso() async` | alternarNossoProcesso(casoId, numero) | assinatura | `HTML inline` |
| 14366 | `removerProcesso() async` | removerProcesso(casoId, numero) | assinatura | `HTML inline` |
| 14372 | `gerenciaProcessos()` | o quadro de gerência, nos moldes do que a aba 🖥 Recurso já faz com os NUPs | comentário acima | `painelCNJ` |
| 14400 | `pjeDoProcesso()` | os movimentos do PJe DAQUELE processo: | comentário acima | `painelCNJ` |
| 14409 | `painelCNJ()` | Sub-aba Andamentos do CNJ: DataJud e coleta do PJe, por processo. | escrito à mão | `rot` |
| 14497 | `previsaoBox()` | A previsão é informação NOSSA, não do tribunal: | comentário acima | `painelCNJ` |
| 14524 | `marcoDoCaso()` | marcoDoCaso(k) | assinatura | `copiarMarco`, `marcoCaso` |
| 14532 | `marcoCaso()` | requisitório/alvará/pagamento em processo que ainda não está na fase de | comentário dentro | `painelCNJ` |
| 14548 | `copiarMarco()` | copiarMarco(casoId) | assinatura | `HTML inline` |
| 14562 | `datajudCaso()` | datajudCaso(k) | assinatura | **ninguém** |
| 14585 | `copiarDatajud()` | copiarDatajud(casoId) | assinatura | `HTML inline` |
| 14598 | `trf3Caso()` | Ordem de julgamento no TRF3 (casos.trf3, gravado pelo trf3_ordem.py diário) | comentário acima | **ninguém** |
| 14620 | `mesAno()` | mesAno(iso) | assinatura | `copiarPrevisao`, `previsaoBox`, `projecaoTrf3` |
| 14624 | `projecaoTrf3()` | projecaoTrf3(t) | assinatura | `trf3Caso` |
| 14634 | `copiarPrevisao()` | copiarPrevisao(casoId) | assinatura | `HTML inline` |
| 14653 | `copiarTrf3()` | copiarTrf3(casoId) | assinatura | `HTML inline` |
| 14665 | `trilhaCaso()` | trilhaCaso(k) | assinatura | **ninguém** |
| 14681 | `toggleImp() async` | toggleImp(casoId) | assinatura | `HTML inline` |
| 14688 | `toggleUrg() async` | toggleUrg(casoId) | assinatura | `HTML inline` |
| 14695 | `moverFase() async` | moverFase(casoId, fase) | assinatura | `HTML inline` |
| 14703 | `salvarBeneficio() async` | salvarBeneficio(casoId) | assinatura | `HTML inline` |
| 14711 | `subtarefasDe()` | checklist do caso (o "0 de 4" do To Do) | comentário acima | `alternarMarcador`, `blocoFatos`, `checklistCaso` |
| 14712 | `checklistCaso()` | checklistCaso(k) | assinatura | `blocoMais` |
| 14725 | `novaSubtarefa() async` | novaSubtarefa(casoId) | assinatura | `HTML inline` |
| 14732 | `ligarChecklistFicha()` | ligarChecklistFicha() | assinatura | `fecharEsc` |
| 14749 | `dataNatural()` | dataNatural(texto) | assinatura | `novaTarefa` |
| 14772 | `fecharFicha()` | fecharFicha(rerender=true) | assinatura | `HTML inline`, `digitando`, `fecharEscolha`, `irCel`, `janelaAtalhos` +1 |
| 14786 | `celular()` | function celular(){ return CEL.matches; } | o próprio corpo | `abrirEsc`, `crescer`, `faltaParaDocs`, `folgaComposer`, `honorAjusteDe` +1 |
| 14787 | `marcarCelular()` | marcarCelular() | assinatura | `iniciar` |
| 14793 | `fecharMenuCel()` | a ficha de celular abre enxuta (identidade, processo, comentários); o resto | comentário dentro | `irCel`, `marcarCelular`, `sinoSvg` |
| 14796 | `fichaTudo()` | a ficha de celular abre enxuta (identidade, processo, comentários); | comentário acima | `HTML inline` |
| 14802 | `irCel()` | irCel(destino) | assinatura | `HTML inline` |
| 14816 | `folgaComposer()` | no celular o campo de escrever fica preso no rodapé; | comentário acima | `abrirEsc`, `crescer`, `fecharEsc` |
| 14837 | `marcarBarraCel()` | marcarBarraCel() | assinatura | `irCel`, `render` |
| 14854 | `extrairEvento() async` | extrairEvento(texto, casoId) | assinatura | `novoAndamento` |
| 14879 | `ehIncapacidade()` | DCB: a data em que o benefício cessa sozinho ────────────────────────── | comentário acima | `blocoFatos` |
| 14881 | `chipDcb()` | chipDcb(k) | assinatura | `blocoMais` |
| 14889 | `salvarDCB() async` | DCB nova rearma o alarme: a prorrogação pedida era da DCB antiga | comentário dentro | **ninguém** |
| 14898 | `salvarProrrog() async` | salvarProrrog(casoId, pedida) | assinatura | `HTML inline` |
| 14910 | `proxDiaUtil()` | proxDiaUtil(iso) | assinatura | `HTML inline`, `criar`, `maisDias`, `recorrerAte` |
| 14915 | `maisDias()` | soma dias a UMA DATA qualquer (maisDias conta sempre a partir de hoje). | comentário dentro | `HTML inline`, `dataRelativa`, `tfDia` |
| 14921 | `somaDias()` | soma dias a UMA DATA qualquer (maisDias conta sempre a partir de hoje). | comentário acima | `HTML inline`, `bolinha`, `criar`, `editarFato`, `maisDias` +1 |
| 14927 | `tfPessoa()` | tfPessoa(id, btn) | assinatura | `HTML inline` |
| 14934 | `tfNinguem()` | tfNinguem(btn) | assinatura | `HTML inline` |
| 14940 | `tfTodos()` | F41 · a equipe inteira em um clique (clicar de novo desfaz) | comentário acima | `HTML inline` |
| 14947 | `tfDia()` | tarefa para alguém precisa de data: o "sem lembrete" só vale sem gente | comentário dentro | `HTML inline` |
| 14977 | `marcarTarefaComPrazo() async` | marcarTarefaComPrazo(casoId, data) | assinatura | `novoAndamento`, `salvarSeguimento` |
| 14987 | `janelaPrazoCumprido()` | janelaPrazoCumprido(casoId) | assinatura | `HTML inline` |
| 15021 | `novoAndamento() async` | novoAndamento(casoUnico) | assinatura | `HTML inline` |
| 15152 | `abrirExigencia()` | a exigência abre pela sugestão "⚠ Exigência do INSS" (não tem mais botão) | comentário acima | `usarSugestao` |
| 15164 | `apagarAndamento() async` | apagar o próprio comentário: | comentário acima | `HTML inline` |
| 15186 | `lbMotivos()` | (F41) menuLembrar e salvarPrazo saíram: ninguém os chamava — o prazo | comentário dentro | `lbCarregarForm`, `lbFormHtml`, `lbRender`, `lbSalvarMotivo`, `sugestoes` |
| 15195 | `lbRender()` | A caixa antiga do Lembrar virou o EDITOR DAS SUGESTÕES: | comentário acima | `HTML inline`, `lbDesativar`, `lbEditar`, `lbSalvarMotivo` |
| 15214 | `lbEditar()` | lbEditar(casoId) | assinatura | `HTML inline` |
| 15219 | `lbFormHtml()` | lbFormHtml(casoId) | assinatura | `lbRender` |
| 15241 | `lbCarregarForm()` | lbCarregarForm(id) | assinatura | `HTML inline` |
| 15251 | `lbSalvarMotivo() async` | lbSalvarMotivo(casoId) | assinatura | `HTML inline` |
| 15273 | `lbDesativar() async` | lbDesativar(casoId,id) | assinatura | `HTML inline` |
| 15282 | `diaSemana()` | diaSemana(iso) | assinatura | `pintarPrazoDoTexto` |
| 15285 | `novaExigencia() async` | novaExigencia() | assinatura | `HTML inline` |
| 15304 | `montarPreenchimento()` | preenchimento guiado das frases: | comentário acima | `usarSugestao` |
| 15327 | `inserirPreenchida()` | inserirPreenchida() | assinatura | `HTML inline` |
| 15350 | `novoCaso() async` | novoCaso(cliId) | assinatura | `HTML inline` |
| 15365 | `novaFrase() async` | novaFrase() | assinatura | `HTML inline` |
| 15377 | `novoEvento() async` | novoEvento() | assinatura | `HTML inline` |
| 15395 | `evSuspeitos()` | evSuspeitos() | assinatura | `vizinho` |
| 15399 | `manterEvento() async` | manterEvento(id) | assinatura | `HTML inline` |
| 15411 | `cancelarEvento() async` | cancelar não apaga: a linha fica na ficha como "cancelada" (histórico), mas sai das listas, dos contadores e do cartão do Meu Dia. | comentário acima | `HTML inline` |
| 15422 | `compareceuEvento() async` | perícia que passou e ACONTECEU: | comentário acima | `HTML inline` |
| 15431 | `nomeStatusEvento()` | como o status aparece nas listas — 'realizada' vira a palavra do Paulo | comentário acima | `bloco`, `painelPericiasFicha` |
| 15439 | `janelaAvisado()` | 📞 O REGISTRO DO AVISO ──────────────────────────────────────────────── Perícia agendada → o cliente é avisado LOGO. | comentário acima | `HTML inline` |
| 15454 | `salvarAvisado() async` | salvarAvisado(evId, comAtendimento) | assinatura | `HTML inline` |
| 15495 | `colPorNome()` | 💰 A CORRENTE DE CONFERÊNCIA (regra do Paulo, 13.08) ───────────────── André/Ingrid sinalizam um pagamento -> nasce a tarefa de HOJE para Marcos E Amanda conferi | comentário acima | `proximoElo` |
| 15496 | `proximoElo()` | proximoElo(quemId) | assinatura | `correnteConferencia` |
| 15511 | `casoDaParcela()` | O caso onde a corrente de conferência vai escrever. | comentário acima | `fecharEsc` |
| 15517 | `correnteConferencia() async` | correnteConferencia(casoId, resumo) | assinatura | `elosDepoisDeConferir`, `fecharEsc`, `novoPgto` |
| 15537 | `elosDepoisDeConferir() async` | o "✔ conferi": baixa TODAS as tarefas 💰 abertas do caso (a dupla de conferentes conta como uma etapa só) e chama o próximo elo | comentário acima | `fecharEsc` |
| 15550 | `novoPgto() async` | novoPgto() | assinatura | `HTML inline` |
| 15573 | `lembreteDoEvento()` | lembreteDoEvento(evId) | assinatura | `copiarLembrete`, `zapLembrete` |
| 15580 | `copiarLembrete() async` | copiarLembrete(evId) | assinatura | `HTML inline` |
| 15584 | `zapLembrete()` | zapLembrete(evId) | assinatura | `HTML inline` |
| 15597 | `fecharJanela()` | encerrar caso: resultado -> honorários? -> Pagamentos ou fim -> caso novo? A janela caminha em três perguntas, na ordem em que o escritório pensa: | comentário acima | `HTML inline`, `enviarPagamentos`, `janelaEncerrar`, `janelaFundir`, `janelaPrazoCumprido` +1 |
| 15602 | `reabrirCaso() async` | F35 · A REGRA DA VOLTA (decisão permanente do Paulo, 16.08.2026): | comentário acima | `HTML inline` |
| 15617 | `janelaEncerrar()` | janelaEncerrar(casoId) | assinatura | `HTML inline`, `fecharEsc` |
| 15656 | `perguntaCasoNovo()` | pergunta 3, no lugar da janela: | comentário acima | `encerrarDeVez`, `enviarPagamentos` |
| 15682 | `encerrarDeVez() async` | NÃO gerou honorários: encerra de vez, com autoria e hora | comentário acima | **ninguém** |
| 15707 | `enviarPagamentos() async` | enviarPagamentos=async() | assinatura | **ninguém** |
| 15777 | `janelaFundir()` | ⇄ fundir dois casos ────────────────────────────────────────────────── Pedido negado que virou recurso, recurso que virou ação judicial: | comentário acima | `HTML inline` |
| 15805 | `fundirCasos() async` | fundirCasos(absorvidoId, destinoId) | assinatura | `HTML inline`, `janelaFundir` |
| 15814 | `t() async` | filhos em lote (id preservado — a sincronização não duplica depois) | comentário dentro | `ela mesma` |
| 15886 | `docPorNome()` | catálogo de documentos (espelho do site interno) ────────────────────── | comentário acima | `pedirDocsAtendimento`, `renderDocCatalogo`, `solicitarDocsCatalogo` |
| 15888 | `renderDocCatalogo()` | renderDocCatalogo() | assinatura | `HTML inline`, `fecharEsc` |
| 15912 | `solicitarDocsCatalogo() async` | solicitarDocsCatalogo() | assinatura | `HTML inline` |
| 15949 | `cumprirExigencia() async` | cumprirExigencia(casoId) | assinatura | `HTML inline` |
| 15957 | `copiarMsgExigencia() async` | copiarMsgExigencia(casoId) | assinatura | `HTML inline` |
| 15963 | `agendarAtendimento()` | agendarAtendimento(cliId) | assinatura | `HTML inline` |
| 15976 | `novoModelo() async` | novoModelo() | assinatura | `HTML inline` |
| 15985 | `abrirDrive()` | pasta do cliente — Drive (navegador) e Windows Explorer (protocolo crmpasta:) | comentário acima | `HTML inline` |
| 15989 | `abrirExplorer()` | abrirExplorer(cliId) | assinatura | `HTML inline` |
| 15994 | `salvarPasta() async` | salvarPasta(cliId) | assinatura | `HTML inline` |
| 16003 | `cklDe()` | checklist-modelo por benefício -> caso novo já nasce com o passo a passo | comentário acima | `aplicarChecklistCaso`, `checklistCaso` |
| 16009 | `aplicarChecklistCaso() async` | aplicarChecklistCaso(caso, silencioso) | assinatura | `HTML inline`, `addNaLista`, `leadParaCliente` |
| 16066 | `valCli()` | valCli(c, campo) | assinatura | `cadCampo`, `cadFaltando`, `editarCad` |
| 16072 | `rotuloValor()` | rotuloValor(campo, v) | assinatura | `cadCampo` |
| 16078 | `cadFaltando()` | quais campos das peças estão em branco — o contador do título e o title | comentário acima | `fichaIdentificacao` |
| 16083 | `salvarCliCampo() async` | grava na coluna; banco sem a coluna (PGRST204/42703) cai em campos.civil | comentário acima | `guardarCad`, `salvarTelefones` |
| 16107 | `editarCad()` | editor no lugar: o campo vira input/select sem sair da grade | comentário acima | `HTML inline` |
| 16125 | `guardarCad() async` | guardarCad(campo, cliId) | assinatura | `HTML inline`, `editarCad` |
| 16135 | `telefonesDe()` | telefones em lista ──────────────────────────────────────────────────── `telefone` continua sendo o principal (é dele que o WhatsApp sai); | comentário acima | `fichaIdentificacao`, `marcarZap`, `novoTelefone`, `removerTelefone` |
| 16141 | `salvarTelefones() async` | salvarTelefones(cliId, lista) | assinatura | `marcarZap`, `novoTelefone`, `removerTelefone` |
| 16161 | `novoTelefone()` | novoTelefone(cliId) | assinatura | `HTML inline` |
| 16169 | `removerTelefone()` | removerTelefone(cliId, i) | assinatura | `HTML inline` |
| 16174 | `marcarZap()` | marcarZap(cliId, i) | assinatura | `HTML inline` |
| 16199 | `cadCampo()` | um campo da grade: cheio mostra o valor; | comentário acima | `fichaIdentificacao` |
| 16231 | `soDigitos()` | o que vai para <ENDERECO>: rua, número e complemento, na ordem da qualificação | comentário dentro | `buscarCep`, `conferirImportacao`, `criarCliente`, `fmtCep`, `val` |
| 16232 | `fmtCep()` | o que vai para <ENDERECO>: rua, número e complemento, na ordem da qualificação | comentário dentro | `cp`, `enderecoLinha`, `por`, `preencherModeloDoc` |
| 16234 | `enderecoMontado()` | o que vai para <ENDERECO>: | comentário acima | `conta`, `enderecoLinha`, `gravarEnderecoCli`, `val` |
| 16251 | `prepEndereco()` | prepEndereco(texto) | assinatura | `preencherModeloDoc` |
| 16258 | `enderecoLinha()` | a linha que aparece no campo da grade, com o resto do endereço junto | comentário acima | `blocoSemEndereco`, `cadCampoEndereco`, `conferirImportacao` |
| 16264 | `cadCampoEndereco()` | cadCampoEndereco(c) | assinatura | `fichaIdentificacao` |
| 16274 | `editarEndereco()` | sete campos no lugar, sem sair da grade — o mesmo caminho que o RG já usa | comentário acima | `HTML inline`, `preencherEnderecoDe` |
| 16278 | `cp()` | const cp = (id, val, dica, larg) => | o próprio corpo | `ela mesma` |
| 16319 | `buscarCep() async` | A consulta é por BOTÃO, não a cada tecla (decisão do Paulo): | comentário acima | `HTML inline`, `cp` |
| 16330 | `por()` | const por = (id, val) => { const e2=document.getElementById(id); if(e2 && val) e2.value = val; }; | o próprio corpo | `ela mesma` |
| 16346 | `gravarEnderecoCli() async` | uma gravação só, com os oito campos. | comentário acima | `criarCliente`, `gravarImportacao`, `val` |
| 16370 | `guardarEndereco() async` | guardarEndereco(cliId) | assinatura | `HTML inline`, `cp` |
| 16371 | `val()` | const val = id => ((document.getElementById(id)//{}).value//"").trim(); | o próprio corpo | `ela mesma` |
| 16393 | `janelaImportarEnderecos()` | janelaImportarEnderecos() | assinatura | `HTML inline` |
| 16408 | `conferirImportacao()` | conferirImportacao() | assinatura | `HTML inline` |
| 16429 | `conta()` | const conta = e => _impEnd.filter(x=>x.estado===e).length; | o próprio corpo | `ela mesma` |
| 16456 | `gravarImportacao() async` | gravarImportacao() | assinatura | `HTML inline` |
| 16479 | `cadCampoSenha()` | A senha do Meu INSS morava numa caixa amarela ao lado do cartão — e amarelo, no sistema de tokens, quer dizer PRAZO. | comentário acima | `fichaIdentificacao` |
| 16491 | `cadCampoPasta()` | a pasta do cliente fecha a grade: | comentário acima | `fichaIdentificacao` |
| 16505 | `definirParceria() async` | F23 · registro avulso: anotação de cliente que não pertence a caso nenhum. | comentário acima | `HTML inline` |
| 16520 | `apagarRegistroAvulso() async` | F35 · a regra da volta: registro avulso do próprio autor se apaga | comentário acima | `HTML inline` |
| 16532 | `novoRegistroAvulso() async` | novoRegistroAvulso(cliId) | assinatura | `HTML inline` |
| 16545 | `fichaIdentificacao()` | Divisão Identificação: a grade de 12 colunas com os dados civis (F9.1). | escrito à mão | `aplicarChecklistCaso`, `painelCadastroFicha` |
| 16625 | `civilDe()` | os documentos leem daqui: | comentário acima | `aplicarChecklistCaso`, `editarEndereco`, `enderecoLinha`, `faltaParaDocs`, `preencherModeloDoc` |
| 16635 | `faltaParaDocs()` | o que ainda falta para os documentos saírem sem lacuna. | comentário acima | `caixaDocumentos`, `conferirAntesDeGerar` |
| 16738 | `variantePorEspecie()` | qual contrato a espécie pede — a escolha do Paulo, por palavra da espécie | comentário acima | `blocoHonor`, `caixaDocumentos`, `corpoDoDoc`, `honorAjusteDe`, `mudarPreCaso` |
| 16746 | `textoContrato()` | textoContrato(chave, ajuste) | assinatura | `corpoDoDoc` |
| 16763 | `honorAjusteDe()` | o ajuste de honorários combinado no atendimento, guardado por variante de contrato no cadastro do cliente — sobrevive ao pré-caso virar caso | comentário acima | `corpoDoDoc` |
| 16933 | `preencherModeloDoc()` | troca os <MARCADORES> pelos dados do cliente — o que falta vira linha para preencher à caneta, nunca "undefined" nem espaço mudo | comentário acima | `corpoDoDoc` |
| 16955 | `especieDoCliente()` | a espécie que manda no contrato e no termo: | comentário acima | `caixaDocumentos`, `familiaDaTriagem`, `imprimirDocsEscritorio`, `painelTriagemFicha`, `rotProx` |
| 16963 | `corpoDoDoc()` | corpoDoDoc(chave, c, especie) | assinatura | `imprimirDocsEscritorio` |
| 16973 | `folhaDoc()` | folhaDoc(d, c) | assinatura | `imprimirDocsEscritorio` |
| 16983 | `janelaImpressao()` | janelaImpressao(titulo, folhas) | assinatura | `imprimirDocsEscritorio` |
| 17016 | `gerarDocEscritorio()` | function gerarDocEscritorio(chave, cliId){ conferirAntesDeGerar(cliId, [chave]); } | o próprio corpo | `HTML inline` |
| 17017 | `gerarTodosDocs()` | function gerarTodosDocs(cliId, chaves){ conferirAntesDeGerar(cliId, chaves//DOCS_PADRAO); } | o próprio corpo | `HTML inline` |
| 17018 | `conferirAntesDeGerar()` | conferirAntesDeGerar(cliId, chaves) | assinatura | `gerarDocEscritorio`, `gerarTodosDocs` |
| 17035 | `seguirComLacunas()` | a aba tem de ser escolhida DEPOIS de abrirFicha: quando o cliente ainda não | comentário dentro | `HTML inline` |
| 17042 | `irPreencherCadastro() async` | a aba tem de ser escolhida DEPOIS de abrirFicha: | comentário acima | `HTML inline` |
| 17048 | `imprimirDocsEscritorio()` | imprimirDocsEscritorio(cliId, chaves, falta) | assinatura | `conferirAntesDeGerar`, `seguirComLacunas` |
| 17062 | `registrarDocGerado() async` | fica registrado no CRM o que foi impresso para o cliente assinar o andamento passa a dizer TAMBÉM o que estava em branco na hora de gerar. | comentário acima | `imprimirDocsEscritorio` |
| 17074 | `caixaDocumentos()` | Divisão Documentos: os botões que geram procuração, contrato e declarações. | escrito à mão | `blocoDecisao`, `painelCadastroFicha` |
| 17078 | `bt()` | bt=(ch)=>`<button class="btn-mini" onclick="gerarDocEscritorio('${ch}','${c.id}')"><span class="ic-bt">${CAD_IC.doc}</sp | assinatura | `ela mesma` |
| 17112 | `precasosDe()` | O QUADRO DO ATENDIMENTO ─────────────────────────────────────────────── Cliente sem caso anotado: | comentário acima | `abrirFicha`, `caixaAtendimento`, `converterCasoEmAtendimento`, `especieDoCliente`, `familiaDaTriagem` +11 |
| 17120 | `gravarPrecasos() async` | o legado materializado substitui a espécie única | comentário dentro | `gerarCasoDoLembrete`, `mudarPreCaso`, `novoPreCaso`, `preCasoParaLembrete`, `restaurarPreCaso` +2 |
| 17131 | `novoPreCaso() async` | novoPreCaso(cliId) | assinatura | `HTML inline`, `novoAtendimento` |
| 17140 | `novoAtendimento() async` | F30 · o atendimento novo de quem já resolveu o anterior (caso gerado ou lembrete): | comentário acima | `HTML inline` |
| 17160 | `dadosParaConversao() async` | F34 · O CAMINHO DE VOLTA — caso que não é caso vira atendimento Quem está na lista Escritório está em NEGOCIAÇÃO: | comentário acima | `converterEscritorioEmMassa`, `naoEhCaso` |
| 17171 | `travaConversao()` | perícia e pagamento têm caso_id obrigatório no banco: | comentário acima | `converterEscritorioEmMassa`, `naoEhCaso` |
| 17178 | `converterCasoEmAtendimento() async` | converterCasoEmAtendimento(k, c, dados) | assinatura | `converterEscritorioEmMassa`, `naoEhCaso` |
| 17221 | `naoEhCaso() async` | naoEhCaso(casoId) | assinatura | `HTML inline` |
| 17241 | `converterEscritorioEmMassa() async` | o LOTE dos legados: todos os casos da fase Escritório de uma vez, pulando só os travados (perícia/pagamento). | comentário acima | `HTML inline` |
| 17266 | `reabrirTriagem() async` | F30 · reabrir a triagem: o marcador de encerrada sai (fica o rastro), o botão Triagem volta e as Anotações se recolhem até novo encerramento | comentário acima | `HTML inline` |
| 17277 | `mudarPreCaso() async` | F55 · mexeu no bloco, ele fica aberto até a ficha fechar — a mesa só se | comentário dentro | `HTML inline` |
| 17301 | `tirarPreCaso() async` | tirarPreCaso(cliId, pcId) | assinatura | `HTML inline` |
| 17311 | `restaurarPreCaso() async` | restaurarPreCaso(cliId) | assinatura | `HTML inline` |
| 17322 | `voltarLembreteParaMesa() async` | F35 · o "Somente gerar lembrete" também tem volta: | comentário acima | `HTML inline` |
| 17342 | `topicosDoMarcador()` | os tópicos que os marcadores abrem: | comentário acima | `card` |
| 17350 | `preCasoParaLembrete() async` | aposentadoria futura: NÃO gera caso — vira lembrete com responsável, e o pré-caso fica aberto ("acompanhando"), como o Paulo descreveu | comentário acima | `HTML inline` |
| 17378 | `gerarCasoDoLembrete() async` | GERAR O CASO deste pré-caso: | comentário acima | `HTML inline` |
| 17391 | `gerarCasoDoPre() async` | gerarCasoDoPre(cliId, pcId) | assinatura | `HTML inline`, `gerarCasoDoLembrete` |
| 17474 | `anexarPreCaso() async` | anexo do pré-caso: o arquivo do cliente que ainda não tem caso | comentário acima | `HTML inline` |
| 17505 | `mesaDobra()` | F55 · a frase-viva: o rodapé da anotação DIZ em português o que vai | comentário dentro | `dobra` |
| 17508 | `fraseAcao()` | F55 · a frase-viva: o rodapé da anotação DIZ em português o que vai acontecer ao guardar — o leigo confirma lendo, não decifrando controles | comentário acima | `atualizarFraseNota`, `v` |
| 17519 | `atualizarFraseNota()` | atualizarFraseNota() | assinatura | `HTML inline`, `atLembrarDia`, `atQuemTodos`, `atQuemToggle` |
| 17526 | `atQuemToggle()` | function atQuemToggle(id){ atQuem = atQuem.includes(id) ? atQuem.filter(x=>x!==id) : [...atQuem, id]; atualizarFraseNota(); } | o próprio corpo | `HTML inline` |
| 17527 | `atQuemTodos()` | atQuemTodos() | assinatura | `HTML inline` |
| 17534 | `atLembrarDia()` | atLembrarDia(d) | assinatura | `HTML inline` |
| 17538 | `salvarNotaAtendimento2() async` | salvarNotaAtendimento2(cliId) | assinatura | `HTML inline` |
| 17543 | `marcado()` | F55 · prazo fatal direto da anotação: com um caso em andamento, a data | comentário dentro | `ela mesma`, `travaConversao` |
| 17601 | `ehNotaPendente()` | ⏳ F54 · PENDÊNCIAS EM ABERTO — a anotação antiga que não se resolve não pode sumir na pilha (pedido do Paulo: | comentário acima | `blocoDecisao`, `quadroPendencias` |
| 17608 | `resolverNotaAtendimento() async` | resolverNotaAtendimento(cliId, idx) | assinatura | `HTML inline` |
| 17619 | `quadroPendencias()` | quadroPendencias(c) | assinatura | `blocoDecisao` |
| 17639 | `apagarNotaAtendimento() async` | F35 · a regra da volta vale para a própria anotação: | comentário acima | `HTML inline` |
| 17653 | `notaChecklistItem() async` | checklist dentro da anotação: | comentário acima | `HTML inline` |
| 17665 | `notaChecklistToggle() async` | notaChecklistToggle(cliId, idx, ci) | assinatura | `HTML inline` |
| 17686 | `anotacaoRapida()` | anotacaoRapida(pre) | assinatura | **ninguém** |
| 17706 | `arProcurar()` | arProcurar(txt) | assinatura | `HTML inline`, `anotacaoRapida` |
| 17729 | `arNovoCliente()` | F54 · cadastro exige NOME COMPLETO (pedido do Paulo) | comentário dentro | `HTML inline` |
| 17739 | `arEscolher()` | arEscolher(cliId) | assinatura | `HTML inline` |
| 17746 | `arNaoCliente()` | arNaoCliente() | assinatura | `HTML inline` |
| 17754 | `arMostrarAlvo()` | F54 · quem entra novo (cliente ou interessado) entra com nome completo E | comentário dentro | `arEscolher`, `arNaoCliente`, `arNovoCliente`, `arProcurar` |
| 17774 | `salvarAnotacaoRapida() async` | salvarAnotacaoRapida() | assinatura | `HTML inline` |
| 17857 | `caixaAtendimento()` | Divisão Anotações: o quadro do atendimento de quem ainda não tem caso. | escrito à mão | `painelCadastroFicha` |
| 17872 | `ehIncap()` | F55 · bloco resolvido recolhe numa linha verde que INFORMA a decisão | comentário dentro | `blocoDecisao`, `blocoHonor`, `card`, `pcCompleto` |
| 17877 | `dobra()` | F55 · bloco resolvido recolhe numa linha verde que INFORMA a decisão (o corpo fica no DOM; | comentário acima | `blocoDecisao`, `blocoHonor` |
| 17880 | `pcCompleto()` | ── 1º · a espécie do benefício/serviço (com "outros") e a natureza ───── | comentário dentro | **ninguém** |
| 17884 | `card()` | 1º · a espécie do benefício/serviço (com "outros") e a natureza ───── | comentário acima | **ninguém** |
| 17936 | `blocoHonor()` | 4º · honorários: o padrão do escritório (o texto do contrato) e o ajuste combinado, que entra no contrato impresso ─────────────── | comentário acima | **ninguém** |
| 17962 | `blocoDecisao()` | 5º · a decisão, por último: | comentário acima | **ninguém** |
| 18214 | `docExtraAtendimento()` | docExtraAtendimento() | assinatura | `HTML inline` |
| 18224 | `pedirDocsAtendimento() async` | imprime a lista para o cliente levar E registra no CRM o que pedimos | comentário acima | `HTML inline` |
| 18241 | `docEntregue() async` | F35 · a regra da volta: marcar de novo DESMARCA — entregue por engano | comentário dentro | `HTML inline` |
| 18257 | `preencherDoc()` | modelos de documentos ({nome},{cpf},{nb}... | comentário acima | `gerarDocumento` |
| 18268 | `gerarDocumento()` | gerarDocumento(modeloId, cliId) | assinatura | `HTML inline` |
| 18285 | `docDe()` | documentos por benefício -> carta imprimível para o cliente | comentário acima | `caixaAtendimento`, `catalogoNoCadastro`, `editarDocs`, `imprimirDocs`, `janelaDocsAnotacao` +1 |
| 18297 | `janelaDocsAnotacao()` | 📄 SOLICITAR DOCUMENTOS NO MEIO DA ANOTAÇÃO (pedido do Paulo) ──────── Atendendo um cliente ANTIGO, a solicitação de documentos nasce onde a anotação está sendo  | comentário acima | `HTML inline` |
| 18322 | `docExtraAnotacao()` | docExtraAnotacao() | assinatura | `HTML inline` |
| 18330 | `solicitarDocsAnotacao() async` | solicitarDocsAnotacao(casoId) | assinatura | `HTML inline` |
| 18355 | `imprimirDocs()` | imprimirDocs(casoId) | assinatura | **ninguém** |
| 18361 | `imprimirListaDocs()` | imprimirListaDocs(c, beneficio, itens, obs) | assinatura | `imprimirDocs`, `pedirDocsAtendimento`, `solicitarDocsCatalogo` |
| 18386 | `editarDocs()` | editarDocs(casoId) | assinatura | **ninguém** |
| 18395 | `salvarDocs() async` | salvarDocs(casoId) | assinatura | `HTML inline` |
| 18403 | `copiar() async` | copiar(texto, msg) | assinatura | `HTML inline`, `abrirERecursos`, `abrirSmbot`, `consultaComCpf`, `copiarAnalise` +12 |
| 18412 | `copiarCred() async` | copiarCred(id) | assinatura | `HTML inline` |
| 18418 | `verCred() async` | verCred(id) | assinatura | `HTML inline` |
| 18425 | `novaCred() async` | novaCred(cliId) | assinatura | **ninguém** |
| 18468 | `aplicarMenu()` | aplicarMenu() | assinatura | `abrirFicha`, `fecharFicha`, `iniciar`, `irParaPesquisa`, `janelaAtalhos` +1 |
| 18482 | `irParaPesquisa()` | atalhos de teclado ──────────────────────────────────────────────────── Ctrl+F (ou ⌘F) e "/" levam à pesquisa; | comentário acima | `digitando` |
| 18487 | `digitando()` | Reage ao que está sendo digitado na busca. | escrito à mão | `ela mesma` |
| 18523 | `cartoesDaLista()` | cartoesDaLista() | assinatura | `atalhoDeLista`, `moverCursor`, `pintarCursor` |
| 18526 | `pintarCursor()` | pintarCursor() | assinatura | `ligarCartoes`, `moverCursor` |
| 18532 | `moverCursor()` | moverCursor(passo) | assinatura | `atalhoDeLista` |
| 18542 | `minhaTarefaDoCartao()` | a tarefa daquele caso que é MINHA e está aberta. | comentário acima | `atalhoDeLista` |
| 18548 | `atalhoDeLista()` | atalhoDeLista(e) | assinatura | `digitando` |
| 18570 | `janelaAtalhos()` | janelaAtalhos() | assinatura | `digitando` |
| 18645 | `_lumHex()` | F15 · A LETRA DO AVATAR — texto claro sobre cor clara não se lê A cor do colaborador vem do banco e entra crua em `style="background:..."` em quinze pontos de r | comentário acima | `_lumCor` |
| 18649 | `f()` | o ponto de virada é a luminância em que branco e quase-preto empatam | comentário dentro | `_lumCor`, `aplicarCrps`, `desfazerAgora`, `ela mesma`, `t` +2 |
| 18653 | `_lumCor()` | o ponto de virada é a luminância em que branco e quase-preto empatam | comentário acima | `letraDoAvatar` |
| 18662 | `letraDoAvatar()` | letraDoAvatar(el) | assinatura | `pintarLetraAvatares` |
| 18667 | `pintarLetraAvatares()` | pintarLetraAvatares(raiz) | assinatura | `ela mesma` |

### Funções que ninguém chama (37)

Podem ser ganchos de `window` usados por `onclick` montado em string que a
varredura não pegou, restos de recurso desligado, ou código morto de verdade.
Conferir antes de apagar.

`seguirEtiqueta` (3112), `orgaoDoAcordao` (3191), `rerotular` (3372), `casoParecido` (3665), `cx` (4031), `em15` (4484), `tCol` (4784), `abrirTodasNovidades` (5512), `periciasEmLote` (5782), `lim` (5916), `kcardCaso` (6417), `blocoPagamentoINSS` (7027), `itemCal` (7452), `abrirFundos` (7561), `abrirEsc` (8629), `fecharEsc` (8642), `irSubAnot` (8912), `rotProx` (9853), `irAba` (10245), `cat` (11148), `cartaoAnalise` (11615), `grupo` (12356), `norm` (14292), `datajudCaso` (14562), `trf3Caso` (14598), `trilhaCaso` (14665), `salvarDCB` (14889), `encerrarDeVez` (15682), `enviarPagamentos` (15707), `anotacaoRapida` (17686), `pcCompleto` (17880), `card` (17884), `blocoHonor` (17936), `blocoDecisao` (17962), `imprimirDocs` (18355), `editarDocs` (18386), `novaCred` (18425)
