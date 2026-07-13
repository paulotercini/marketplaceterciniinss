# CLAUDE-OPERACIONAL.md — Anexo operacional do escritório Paulo R. Tercini Filho

Anexo do `CLAUDE.md`. Concentra o **detalhe operacional** (orquestração do
Drive, modelos e formulários, análise de PPP, doutrina situacional, cadeia de
leitura de documentos, fluxos `/triagem` `/inicial` `/inicial-inss`, saída
padrão por cliente e scripts). O `CLAUDE.md` guarda as **regras invioláveis**, a
**personalização do Paulo**, o **mapa de skills** e as **verificações
obrigatórias**; este anexo traz o “como fazer”. **Leia este arquivo por inteiro ao
rodar qualquer fluxo ou produzir qualquer documento operacional** (procuração,
RAC, parecer, relatório, inicial, protocolo). As regras aqui têm o **mesmo peso**
das do `CLAUDE.md`.

---

## Modelos e formulários do escritório (orquestração do Drive)

Todo documento operacional (procuração, RAC, requerimento, autodeclaração,
declaração de endereço etc.) sai de um **modelo vivo** no Drive, NUNCA do zero. A
pasta-fonte é **`Processos / _Modelos Procurações`** (id `1Usk27BwaqdbFbF5ubsTp0ngWR9XBN1zX`)
e suas subpastas, o equivalente, para formulários, do que **`Modelos Ouro 2.0`**
é para as peças do `/inicial`. Preencha o modelo com os dados do
cliente (lidos de documento, jamais inventados) e **deixe o arquivo pronto na subpasta
`Claude` do cliente**. Tome a **iniciativa**, se a tarefa ou o histórico do To Do
indicam que um documento é necessário (ex.: "preciso de Declaração de Endereço",
"fazer a procuração", "fazer a RAC"), produza-o sem esperar ordem expressa. Não
existindo modelo na pasta, crie o documento do zero, mas só então.

**Procuração (pacote completo, judicial + administrativo).** Use o arquivo
**`Novo - Procuração Adm. e Judicial - D. Pobreza - Contrato - Recibo de Entrega de
Docs1.docx`** (id `1YdXTKkR4ORK_uPqIuDvd-r-eJ404YSrW`). É um pacote com Procuração
Administrativa, Procuração Judicial, Declaração de Pobreza, Contrato de Honorários,
Termo de Representação e Declaração de Não Beneficiário de Benefício em Outro Regime.
Regras de preenchimento:
- Substitua os campos marcados (`<NOMESEGURADO>`, `<DATANASCIMENTO>`, `<CPF>`, `<RG>`,
  `<ENDERECO>`, `<ESTADOCIVIL>` etc.) pelos dados do cliente.
- **Dado que você não tem, REMOVA o campo** do texto (ex.: não sabendo o estado civil,
  apague o trecho do `<ESTADOCIVIL>`), nunca deixe o marcador `<...>` no documento.
- **Só não finalize se faltar nome completo, CPF e endereço.** Com esses três, deixe
  pronto para impressão; o resto remova se não tiver.
- **Termo de Representação**, assinale o benefício pleiteado. Se houver campo próprio,
  marque-o; não havendo, escreva na parte **"Outros"** (ex.: "Acerto de Vínculos e
  Remunerações"). Marque **SEMPRE também "Atualização Cadastral"** (nunca se sabe
  quando será preciso).
- **Contrato de Honorários (ajuste por benefício, pelo realce de cor)**, o texto traz
  trechos realçados por cor para identificar a hipótese. **Mantenha apenas o trecho da
  cor do benefício pleiteado e exclua os das outras cores.** O mapa é, **azul**, para
  **concessão** de aposentadorias, pensão por morte, auxílio-acidente, auxílio-reclusão
  e BPC/LOAS; **amarelo**, para **benefícios por incapacidade**; **verde**, para
  **revisão de benefícios**. **Antes de entregar, RETIRE todo o realce** (ele só serve
  para identificar e não pode aparecer no documento final). Na dúvida sobre a cor de um
  trecho, abra o arquivo e confira pelo texto antes de cortar.
- **Paginação para impressão** (uma peça por folha), Procuração Administrativa em 1
  folha, Procuração Judicial em outra, Contrato de Honorários em 2 folhas, Termo de
  Representação em outra, Declaração de Não Recebimento de Benefício em outra.
- Salve pronto na subpasta `Claude` do cliente.

**Procuração só para auxílio-doença no INSS (extrajudicial).** Quando o pedido for
**requerer auxílio-doença / benefício por incapacidade direto no INSS** (parte
extrajudicial), use o arquivo **`Procuração Adm. e Contrato Auxílio Doença.docx`**
(id `1LneSKgZL8B3pgdWVsJfu2c06HD1yvlkW`), não o pacote completo. Quando o Paulo
indicar que vamos pedir o auxílio-doença no INSS, **já crie esse documento de
prontidão** e deixe na subpasta `Claude`.

**RAC e formulários da IN 128.** Subpasta **`Formulários IN128`** (id
`1RtJvHImjPPpq2F10OuBWe1W2pi4nxR07`). Ao fazer uma RAC, **escolha primeiro o modelo
certo** lendo o que o caso exige:
- `AnexoI - RAC.docx` (id `11UCHnpMERsoYYmiljpwHdFepA_Xvg3CH`), RAC **completa** (quando
  envolve mais de uma qualidade, ex.: empregado e contribuinte individual).
- `AnexoI-A-2.1 - RAC Acerto de Dados - Atualização Cadastral` (id `1Tg444ATzbWXmSbrHnJuplC0_9zWFOSCE`).
- `AnexoI-B-2.2 - RAC Empregado e Empregado Doméstico` (id `17iAQAPhmnvaxnXdIvrnq9MoneOgRpKh3`).
- `AnexoI-D-2.4 - RAC Contribuinte Individual` (id `1XLTzntpAPwoNcjVwhJbnw-7_PWFBcvcX`).
- `AnexoI-E-2.5 - RAC Reconhecimento de Filiação e Atualização de Atividade` (id `1Hz4IxIb_NkESESka4KJNirr92fyXlbwD`).
- `AnexoI-F-2.6 - RAC Acerto de Contribuições` (id `1n8FBizJM-MJpc1OWJFqz0lcGA6lX0aXh`), inclui correção de código de pagamento.
- `AnexoVII - Requerimento para Atualização de Contribuições em Atraso` (id `1lrj6KBbhmIEr1V6RSyrkWAeuxKVKmqUD`), quando se pretende **pagar contribuições em atraso**.
- **Autodeclaração de segurado especial**, preencher quando for segurado especial
  (procurar o modelo nesta pasta; não havendo, usar a skill
  `base-segurado-especial-autodeclaracao-arts-92-93-94` e criar). Preencha as datas e
  os vínculos lidos da CTPS, do CAGED e da RAIS, nunca supostos.

**Cálculo, o programa é o Prévius.** O cálculo previdenciário do escritório (tempo de
contribuição, descarte, RMI, valor da causa) é feito no **Prévius**, que você não
acessa. Quando não conseguir fechar um cálculo de tempo de contribuição ou precisar do
**valor da causa**, **deixe o alerta no parecer pedindo o cálculo no Prévius** e que o
arquivo seja colocado na pasta do cliente. O Paulo costuma deixar esses cálculos (e o
print do Prévius/Prévius 2.0/3.0) na pasta para você analisar, então procure-os antes
de pedir.

**CNIS, leitura obrigatória e RAC proativa.** O CNIS costuma estar na pasta do cliente
e é de **leitura obrigatória**, para achar erro que precise de correção. Achando erro,
**já monte a RAC mesmo sem o Paulo pedir** (proatividade), escolhendo o Anexo certo
acima. Não precisa de RAC para **contribuição abaixo do salário mínimo** (trata-se por
complementação/agrupamento da EC 103 no cálculo), mas **monte** para **vínculo sem data
fim**, **vínculo extemporâneo**, vínculo ausente que a CTPS/CAGED/RAIS comprovem,
divergência de data de rescisão, indicadores como **PEXT/PVNC/IGN** etc. Para saber se
algo é necessário, **conheça o histórico do To Do** do cliente.

**Orquestração.** Mantenha a ligação entre as pastas e o Microsoft To Do. A tarefa do
To Do diz o que falta; a pasta `_Modelos Procurações` tem o modelo; a pasta do cliente
tem os dados (CNIS, CTPS, procuração anterior) e a subpasta `Claude` recebe o
documento pronto. Busque o dado na fonte certa e deixe o resultado onde o próximo passo
o encontre.

## Doutrina do assistente — o que fazer em cada situação

Você frequentemente **não pode executar o ato final** (ex.: protocolar/solicitar
benefício no Meu INSS). Nesses casos, **adiante e verifique tudo** para deixar
pronto:

1. **Solicitar benefício (não executável):** entenda qual benefício será
   pleiteado, **confira no Drive se a documentação está correta e completa**.
   Se faltar documento importante (ex.: **RG**), **avise o Paulo em destaque**.
   Aponte documentos com nome errado/incompleto na **lista de renomeações**.
2. **Análise do CNIS:** faça leitura completa e **sinalize indicadores que
   precisam ser corrigidos antes de protocolar** (ex.: PREM, PEXT, PVNC, IGN,
   vínculos sem data fim, períodos concomitantes, recolhimentos faltantes).
3. **Histórico de atendimentos:** releia o log e **alerte pendências esquecidas**
   (ex.: "no 1º atendimento pediram o PPP da Cica e nunca mais foi tratado —
   ainda falta").
4. **Autodeclaração / documento a terminar:** busque no Drive o que falta para
   concluir; se o arquivo não existir, **crie-o já preenchido** com o que der para
   coletar do histórico e dos documentos do cliente, deixando pronto para revisão.
5. **"Verificar documento digitalizado":** analise o que foi digitalizado **à luz
   do histórico do cliente** e dê o parecer correto (serve? está legível? é o
   documento certo? falta algo?).
6. **Mandado de Segurança (MS):** avalie os documentos que já temos e **liste os
   que faltam** para impetrar (consulte `base-ms-*`).
7. **Cliente comunicado:** redija a mensagem pronta (ver seção acima).

Nunca invente dados que não estejam nos documentos/histórico. Se faltar, diga
claramente o que falta e onde.

## Leitura de documentos, processos e recursos (cadeia de pensamento OBRIGATÓRIA)

Antes de constar QUALQUER análise/resumo no To Do (ou parecer) a partir de
documentos, processos ou recursos, siga a cadeia de pensamento abaixo **sem pular
nenhuma etapa**. Os arquivos estão em PDF anexos à tarefa (`todo_anexo.py`) ou na
pasta do cliente no Drive.

**Regra de ouro (vale para os três casos):**
1. Obtenha o(s) arquivo(s) em PDF (anexo da tarefa ou Drive).
2. **Mapeie TODOS os documentos com leitura INTEGRAL** do conteúdo (não amostragem).
3. **Confirme com o Paulo quantas páginas existem e o que diz cada uma** antes de
   fechar o resumo.
4. Depois de mapear da **primeira para a última** página, **refaça da última para a
   primeira (conferência)**, aplicando **OCR em português** quando necessário.
5. Ao final, **confirme explicitamente se leu tudo e se a conferência foi feita**.
   **Identifique exatamente quais folhas não conseguiu ler** e tente de novo por
   **outro método** (OCR, baixar/abrir de outra forma, reabrir o anexo). Se ainda
   assim não conseguir, **avise** — e **registre no To Do (conclusão C) que tais
   folhas/documentos não puderam ser lidos**, identificando-as.
6. **CNIS, PPP, documentos rurais e documentos médicos: leitura OBRIGATÓRIA da
   INTEGRALIDADE.** Havendo **dúvida ou rasura**, peça confirmação ao Paulo.
7. **Qualquer problema, avise.** Não deixe de executar nenhuma etapa da cadeia.

**Recurso administrativo (e-SISREC/CRPS) — além da regra de ouro:**
- Mapeie os **principais atos do recurso citando as folhas ou o ID**.
- Na conferência, identifique a **ordem cronológica dos atos** distinguindo
  **recurso ordinário, embargos de declaração e recurso especial**.
- Faça o **resumo completo dos autos destacando o que é controverso** e se há
  **pedidos não analisados, contradição, obscuridade, dúvida ou erro material**.

**Processo (judicial/administrativo) — além da regra de ouro:**
- Mapeie os **principais atos do processo citando as folhas ou o ID**, em ordem
  cronológica, da primeira à última página e na conferência inversa.

**Processo administrativo de auxílio-acidente ou benefício por incapacidade — SEMPRE
localizar dois documentos:**
- **A(s) folha(s) da PERÍCIA MÉDICA FEDERAL (laudo SABI/CADMED).** Em regra fica nas
  **últimas folhas** do PA. É o **documento controverso** que a petição inicial precisa
  **desconstituir**, lendo cada ponto e **rebatendo um a um** o que for desfavorável
  (CID fixado a menos, conclusão de capacidade, DII negada, exame genérico, omissão de
  doença ou de exame, laudo padronizado, etc.). Transcreva o que o perito concluiu e
  oponha a prova documental contrária.
- **A DECISÃO/COMUNICAÇÃO DE INDEFERIMENTO** (Despacho/Carta), que **sempre está no PA**
  quando o processo foi concluído. Dela extraia o **NB, a data e o MOTIVO exato** do
  indeferimento (mérito médico, renda, carência, qualidade etc.), pois é o que define a
  causa de pedir e o prévio requerimento (Tema 350/STF). Não suponha o motivo, leia.

## Análise de PPP (padrão OBRIGATÓRIO — modelo: Israel Luis Marques, 18.06.2026)

SEMPRE que houver um PPP (no Drive ou anexo da tarefa), faça a análise técnica
**período a período** e registre-a na conclusão (C) do To Do e no parecer. Antes,
consulte a skill do agente nocivo (`base-especial-*`) e a
`ponte-workflow-aposentadoria-especial`. Para **CADA período/vínculo** do PPP,
constar nesta ordem:

1. **Período de trabalho** (`DD/MM/AAAA a DD/MM/AAAA`) e **nome da empresa**.
2. **Fatores de risco** — abordar **TODOS** os que constam. Para cada agente,
   informar: **intensidade/dose** (ex.: ruído em dB(A)), **técnica/metodologia**
   de medição (dosimetria/NHO-01, decibelímetro, NA etc.), **uso de EPI e o CA do
   EPI**, e dizer se **enquadra ou não** e por quê. Pró-segurado: ruído acima de
   85 dB **não** é neutralizado por EPI (Tema 555/STF); agentes químicos,
   biológicos e cancerígenos têm presunção qualitativa; medição pontual por
   decibelímetro e ausência de NEN após 18/11/2003 são teses do INSS
   **refutáveis** (ver `base-especial-ruido` e `base-especial-agentes-quimicos`).
3. **Responsável pelos registros ambientais** — nome e se é **médico ou
   engenheiro**, e o **período** de responsabilidade/vigência do laudo, para
   confirmar se é ou não **extemporâneo** em relação ao período trabalhado.
4. **Observações sobre extemporaneidade** — verificar no campo de observações do
   PPP se há algo (ex.: declaração de manutenção do layout/inalteração do
   ambiente, que valida o laudo extemporâneo).
5. **Resultado: ENQUADRA** ou **NÃO ENQUADRA**. Quando não enquadrar, distinguir
   se é **definitivo** ou **sanável** (PPP retificável, LTCAT/PGR a solicitar,
   perícia indireta para empresa extinta — Súmula 198/TFR), para não descartar
   período recuperável. Lembrar que períodos pré-1995 podem enquadrar por
   **categoria profissional** (Decretos 53.831/64 e 83.080/79) mesmo sem PPP, e
   que períodos posteriores a 13/11/2019 seguem a EC 103.

Ao final, **CONCLUSÃO consolidada**: quais períodos enquadram, total de tempo
especial e impacto no benefício, e o que falta (PPP/LTCAT pendente, retificações,
divergências de data PPP × CNIS a alinhar).

## Modelos de petição — Padrão Ouro (usar SEMPRE ao redigir peças)

Os modelos oficiais do escritório ("padrão ouro") ficam no Google Drive na pasta
**`Modelos Ouro 2.0`** (id `10WkDbxiBnmSSFMFzkW-rcPqTqk6614Rm`), reestruturada no
padrão 2.0 (curto, direto, foco na prova e no ponto controverso, persuasivo e legível
por IA, com **TODA citação conferida** no catálogo ou fonte oficial — citação não
confirmada é removida, jamais inventada). É organizada **por tipo de benefício**
(subpastas, ex.: `Incapacidade (B31 e B91)`, `BPC-LOAS (Idoso e Deficiente)` id
`1zOaqjRZWnISVsZxeGauHL0ExB284NHW3`), e cada uma traz um **MODELO OURO por tipo de
peça** (Petição Inicial, Recurso Inominado, Contrarrazões, Manifestação sobre Laudo,
Quesitos/Alegações Finais, Embargos de Declaração etc.), distinguindo **Federal /
Estadual / JEF** (ADENDO NÚCLEO 4.0 para peças estaduais do TJSP). Cada modelo abre
com um **GUIA DE USO** (filosofia 2.0, campos `[CAMPO]` a preencher, banco de teses
conferido, defesa antecipada e seção "A CONFERIR — NÃO USAR" das citações em
quarentena). A antiga pasta **Petições Ouro** (id `1mKNCwgZz1dcEzkkY1twbzkLpYXfyag-1`)
está sendo **substituída** e será excluída pelo Paulo, não use mais como fonte.

**Regras invioláveis ao redigir qualquer peça:**
1. Antes de redigir, **localize e LEIA o MODELO OURO** correspondente (benefício +
   tipo de peça + esfera) na pasta **Modelos Ouro 2.0** e **siga exatamente a
   estrutura, a formatação e o estilo dele**.
2. Quando a peça for **direcionada a um processo** (petição para protocolar),
   **entregue-a já no formato correto e PRONTA**, salva na subpasta **Claude** da
   pasta do cliente (não apenas um esboço).
3. Se não existir modelo ouro para aquele tipo, use o mais próximo + a skill
   `base-peticao-previdenciaria-padrao-visual`, e **sinalize a ausência** do modelo.

## Fluxo `/inicial` — montar a inicial e o jogo de provas

Comando em `.claude/commands/inicial.md`. Pega um cliente já triado e deixa a
**petição inicial e os documentos prontos para distribuir** (PJe/ESAJ/Eproc).
Gravação automática, com relatório de prontidão ao final; nunca protocola/envia.
Cadeia obrigatória:

1. **Ler tudo** — todos os documentos da pasta do cliente no Drive (leitura
   INTEGRAL, cadeia obrigatória) **e** todas as instruções do To Do; mais a inicial
   existente e o MODELO OURO do benefício.
2. **Conferir citações** — cada súmula/Tema/Enunciado/REsp/lei é verificada no
   catálogo interno (`base-precedentes-catalogo-vinculantes`) e, quando a rede
   permitir, na fonte oficial (web). Marcar `[CONFERIDO]`/`[NÃO CONFIRMADO]`.
   **Nunca** manter ou inventar citação não verificada.
3. **Leitura adversária (red-team)** — simular a contestação do INSS e blindar a
   peça contra cada defesa (prévio requerimento Tema 350/STF e Tema 1124, decadência,
   prescrição quinquenal, qualidade de segurado, PPP extemporâneo/sem NEN, EPI
   Tema 555, coabitação etc.).
4. **Coerência fato × prova × valor** — toda alegação e o valor da causa amparados
   por documento; todo documento citado; apontar fatos órfãos e provas órfãs.
5. **Curadoria** — juntar **só** prova que ajuda; **excluir** documento incorreto/
   prejudicial (ex.: PPP errado), com seção **"NÃO JUNTAR"** no parecer justificando
   cada exclusão; para prova fraca porém sanável, indicar como fortalecê-la.
6. **Ajustar a peça** sem sobrescrever — nova versão `Petição Inicial - <Cliente> -
   DDMMAAAA (revisada)` na subpasta `Claude`.
7. **Revisão aprofundada OBRIGATÓRIA** — rodar SEMPRE a skill
   `base-revisao-peticao-aprofundada` sobre a peça (5 níveis anti-alucinação + 5
   camadas, severidade BLOQUEANTE/CRÍTICO/IMPORTANTE/MENOR) e **corrigir
   automaticamente** os achados sanáveis (formatação, dois-pontos, ID, redação
   literal, precedente trocado, competência, fato incontroverso impugnado, fatos/
   provas órfãos). Citação não confirmada é **removida** (nunca inventada); achado
   BLOQUEANTE que exija decisão do Paulo é **sinalizado em destaque** no relatório.
   Registrar o **log da revisão** (achados por severidade, o que foi autocorrigido).
8. **Montar `Documentos da Petição Inicial`** na pasta do cliente — cada documento
   em PDF próprio, nomeado `NN - <Tipo> - DDMMAAAA.pdf` (NN = ordem de distribuição).
   PDFs combinados são **fatiados** com `pdf_split.py` (baixar em base64 → separar →
   subir via `create_file`; originais ficam intactos). Primeiro arquivo:
   `00 - Índice de Provas` (documento → fato → item da inicial + checklist por
   sistema/rito). Quebrar arquivos que excedam o limite do sistema.
9. **Gravar** conclusão (C) + parecer e entregar o **relatório de prontidão**
   (pronto para distribuir? sistema/rito; bloqueios). Limitação conhecida: download
   do Drive trava acima de ~10 MB — sinalizar arquivo grande não lido. Utilitário:
   `pdf_split.py "<entrada>.pdf" "1-2:Procuração Judicial" "3:Declaração de Hipossuficiência" ...`.

## Fluxo `/inicial-inss` — montar o protocolo administrativo (Meu INSS)

Comando em `.claude/commands/inicial-inss.md`. Irmão do `/inicial`, mas o destino é
o **Meu INSS** (administrativo), não o Judiciário. Deixa o **requerimento e os
documentos prontos para anexar**; nunca protocola/envia. Diferenças-chave:

1. **Subpasta `Documentos Protocolo INSS`** (na pasta do cliente).
2. **Numeração por ordem de leitura (prefixo 2 dígitos)** seguindo a **lógica do
   INSS por categoria**, e **dentro de cada categoria por ordem cronológica do que
   está escrito no documento** (não a data do arquivo): Procuração Administrativa →
   Identificação → Certidão (Nascimento/Casamento) → **PPPs na ordem dos períodos
   de trabalho** (ler o PPP) → **Relatórios médicos** (cronológico) → **Exames**
   (cronológico) → **Documentos rurais** (cronológico pelo conteúdo — NF 1999 antes
   de contrato de parceria 2008) → demais (CNIS, CadÚnico, autodeclaração etc.).
   PDFs combinados são fatiados com `pdf_split.py`; **limite de tamanho por arquivo
   do Meu INSS é 5 MB** — quebrar o que exceder em partes (`... (parte 1 de N)`).
3. **Petição administrativa de no máximo 1 folha** (`00 - Requerimento
   Administrativo - DDMMAAAA`): um **norte** para o analista bater o olho — só o que
   se requer (benefício/B, DER) + rol de anexos, **sem explicações, sem lei/decreto**;
   se indispensável citar legislação, **apenas IN do INSS ou portarias**. **Entregar
   SEMPRE em .docx editável** (o Paulo pode precisar ajustar antes de protocolar),
   gerado pelo `docx_escritorio.py` e subido à subpasta `Claude`; a conversão para PDF
   é só para o upload final no Meu INSS, depois da revisão do Paulo.
4. **Checklist de documentos obrigatórios (IN 128/2022)** do benefício, com
   faltantes em destaque (evita carta de exigência).
5. **Antecipar a carta de exigência** (red-team do analista) e já anexar/sinalizar.
6. **Seção "NÃO JUNTAR"** — curadoria, exclui documento prejudicial/incorreto.
7. **Revisão aprofundada OBRIGATÓRIA** — rodar SEMPRE a skill
   `base-revisao-peticao-aprofundada` sobre o requerimento de 1 folha e o conjunto, e
   **corrigir automaticamente** os achados sanáveis (lei/decreto indevidos, dois-
   pontos, divergência de nome/NIT/datas contra os documentos, ordem dos anexos,
   portaria com taxonomia errada, checklist IN 128/2022). Dado não lido em documento
   e citação não confirmada são **removidos/“a confirmar”** (nunca inventados);
   BLOQUEANTE que dependa do Paulo é **sinalizado em destaque**. Registrar o **log**.
8. **Ficha de Protocolo INSS** (folha de cola na subpasta `Claude`): serviço a
   selecionar, dados do segurado (NIT/NIS, DER) e ordem de upload dos anexos.

## Saída padrão por cliente (no `/triagem` e em análises avulsas)

- **Conclusão (C) no To Do** (`todo_conclusao.py`): **ultraenxuta**, no máximo 2 a 3
  linhas, só o achado e o próximo passo, leitura direta e sem enrolação, **com
  acentuação correta**. **Posicionamento**, a conclusão (C) entra no **topo do
  HISTÓRICO**, ABAIXO do cabeçalho fixo da tarefa (`[TAREFA]`/`[SISTEMA]`/`[DER]`
  etc.) e ACIMA da entrada de data mais recente. O `todo_conclusao.py` já faz isso
  automaticamente (insere antes da primeira linha com data `DD.MM.AAAA`).
- **Parecer .docx SÓ SOB DEMANDA (regra permanente do escritório).** Por padrão a
  `/triagem` entrega apenas a conclusão (C); **não gere o parecer a menos que o Paulo
  peça**. Quando pedido, sai **em .docx (Word), no máximo UMA página**, no padrão do
  escritório (`docx_escritorio.py`), **nunca em Google Doc**, subido à subpasta
  **`Claude`** da pasta do cliente (criar se não existir) com `gdrive_upload.py` (upload
  direto pela API, sem base64 pelo contexto), título `Parecer - <Cliente> - DD.MM.AAAA.docx`.
  **Todos os documentos gerados** (parecer, procuração, RAC, relatório, autodeclaração)
  ficam na subpasta `Claude`, subidos pelo mesmo `gdrive_upload.py`. Conteúdo enxuto e
  **humano**, contexto do benefício, checklist de documentos (faltantes em
  destaque), achados do CNIS, pendências do histórico, **lista de renomeações
  sugeridas** e **mensagem pronta ao cliente** quando aplicável, terminando com a
  seção **"Pendências em aberto"**. Antes de fechar, **revise nas skills** (toda
  tese ancorada em skill lida ou documento, proibido inventar).

### Parecer de "Análise da Vida Completa" (casos de aposentadoria e histórico rico)

Para **aposentadoria** (tempo de contribuição, especial, PCD/LC 142, idade, rural,
híbrida) e sempre que o cliente tiver **vida contributiva/laboral densa, PPP,
períodos rurais ou processo judicial**, o parecer segue a estrutura de **divisões**
abaixo (modelo do **Parecer de Viabilidade do Silvio Biancardi Serrano**, o padrão
ouro deste tipo de análise). Aqui a regra da **uma página é exceção**, a análise da
vida completa pode ocupar o quanto precisar para ficar clara, com títulos de seção,
datas e valores em **negrito** e a **conclusão no topo**. Divisões, nesta ordem:

1. **Cabeçalho tabelado**, cliente (nome + data de nascimento), CPF, benefício/ação
   pretendida, DER, foro/nº do processo (se houver), sistema.
2. **Conclusão em destaque, logo no topo**, o veredito direto (tem direito? a qual
   benefício? em que data se aposenta?), antes de qualquer histórico.
3. **Vida contributiva e laboral (cronológica)**, todos os vínculos e períodos em
   ordem, cada um com a natureza e o resultado:
   - **Períodos rurais**, datas, início de prova material, se reconhecido, pendente
     ou a reajuizar (ver `base-tempo-rural-anterior-1991`, `base-segurado-especial-*`).
   - **Análise de PPP período a período** (padrão OBRIGATÓRIO da seção "Análise de
     PPP", empresa, período, agente/dose, técnica, EPI/CA, responsável, enquadra ou
     não), com o subtotal de tempo especial.
   - **Períodos comuns** e as competências a acertar (abaixo do mínimo por
     complementação/agrupamento da EC 103, indicadores do CNIS).
   - **Benefícios já concedidos/indeferidos**, NB, espécie, datas e o motivo exato.
   - **Processos judiciais contra o INSS**, nº, vara, o que foi reconhecido, trânsito
     em julgado, e se há **averbação/cumprimento pendente** (destravar sempre).
4. **Contagem de tempo (a matemática)**, o total antes e depois de cada ajuste, com
   datas, e a comparação com o requisito (35 anos, 86/pontos, idade). Mostrar o
   impacto de cada período (ex.: "com o rural, 39a2m6d; sem ele, 31a4m22d, abaixo dos
   35"). O cálculo fino é do **Prévius** (alertar quando faltar).
5. **O que o cliente efetivamente tem/obteve**, separar o ganho real (ex.: averbação
   de tempo especial reconhecida em juízo) do que ainda falta para o benefício.
6. **Caminhos possíveis (ranqueados, a/b/c)**, cada via com o fundamento, o benefício
   resultante, o valor estimado e o que falta, comparando pelo **melhor benefício**
   (Tema 1018/STJ). Ex.: reajuizar o rural extinto sem mérito × nova DER com o especial
   já averbado × aposentadoria por idade.
7. **Pendências em aberto** e **Próximo passo recomendado** (Pronto para `/inicial`,
   `/inicial-inss`, ou Aguardando o quê).

**Verificação obrigatória, processos contra o INSS.** Em toda triagem/análise,
apurar se o cliente **já teve ou tem ação contra o INSS** (litispendência, coisa
julgada, averbação pendente). Fontes, o PDF do processo na pasta do Drive, o
histórico do To Do, o CNIS/PA, e a **consulta unificada do CNJ/PDPJ**
(`portaldeservicos.pdpj.jus.br/consulta`). O assistente **não loga no gov.br**, então
peça ao Paulo a lista de processos por CPF quando precisar do retrato completo, ou
trabalhe com o número do processo que ele fornecer (consulta pública do tribunal ou
API do DataJud). Um processo transitado com **tempo reconhecido mas não averbado** é
prioridade, destrava o benefício.

## Fluxo `/triagem`

Comando em `.claude/commands/triagem.md`. Processa as tarefas atribuídas ao Paulo
vencendo **hoje**, cruza com o Drive, grava conclusão (C) e parecer, e entrega
relatório consolidado. Gravação automática (sem aprovação prévia).

**Múltiplas tarefas do mesmo cliente.** O `triagem_do_dia.py` monta um índice por
CPF (e nome) cruzando todas as listas de caso. Quando o mesmo cliente tem mais de
uma tarefa (ex.: uma na lista **INSS** e outra na **Judicial**), o campo
`outras_tarefas` as liga, e o cliente é tratado **uma vez só**, com conclusão
consolidada e atenção a **litispendência** (administrativo correndo junto com o
judicial). Vale para `/triagem`, `/inicial` e `/inicial-inss`, sempre procurar
TODAS as tarefas do cliente antes de processar.

**Evitar conflito no cowork (sinal `ja_triado_hoje`, sempre COMPLEMENTAR).** Se a
tarefa já tem conclusão (C) com a data de hoje (outra execução/sessão do cowork já
tratou), NÃO refaça do zero e NÃO duplique, mas **NÃO ignore**, leia o que já foi
gravado e **complemente** apenas o que ainda falta ou o que a entrada mais nova
pede, somando ao que existe (coerente com o modo COMPLEMENTO e com a regra de
nunca destruir histórico).

## Encadeamento dos fluxos (handoff triagem → inicial/inicial-inss)

Os três fluxos se compõem. A `/triagem` **diagnostica**, a `/inicial` e a
`/inicial-inss` **montam a peça**, e a `base-revisao-peticao-aprofundada` roda
**dentro** delas (não ao lado).

**Linha obrigatória no fim de todo parecer e do relatório, "Próximo passo
recomendado".** Classifique o caso em um dos três:

- **Pronto para `/inicial`** (Judiciário), sem pendência bloqueante e via judicial
  (ação a distribuir, ou administrativo já exaurido/indeferido).
- **Pronto para `/inicial-inss`** (Meu INSS), sem pendência bloqueante e via
  administrativa (requerimento ainda não protocolado).
- **Aguardando**, falta documento ou decisão do Paulo, nomear exatamente o que falta.

**Encadeamento automático (opcional, sob pedido).** Por padrão a triagem só
diagnostica e recomenda. Quando o Paulo pedir (ex.: argumento "montar"/"seguir" ou
pedido explícito) **e** o caso estiver **Pronto** (sem pendência bloqueante),
encadeie executando o fluxo recomendado (`/inicial` ou `/inicial-inss`) para aquele
cliente, reaproveitando o parecer e as "Pendências em aberto" já gravados. **Nunca
encadeie** se houver pendência bloqueante, aponte o que falta e pare.

## Scripts utilitários

- `graph_bootstrap.py` — renova token do Microsoft Graph.
- `auditoria_citacoes.py skills|modelos [--baixar]` — varre skills/Modelos Ouro e cruza
  toda citação (Tema/Súmula/Enunciado) com o catálogo; base da skill `auditoria-citacoes`.
- `triagem_do_dia.py [DD/MM/AAAA]` — coleta tarefas do Paulo vencendo na data →
  `triagem_hoje.json`. Por padrão identifica as tarefas do Paulo pela convenção `(P)`
  no corpo; se existir o arquivo de atribuição real (ver "Atribuição real (assignee)"
  abaixo), filtra pela atribuição do app em vez do palpite.
- `todo_conclusao.py "<list_id>" "<task_id>" "texto"` — prepende conclusão (C).
- `todo_anexo.py "<list_id>" "<task_id>" "trecho do nome"` — lê anexo da tarefa.
- `gdrive_download.py <file_id> [destino]` — baixa arquivo do Drive por ID DIRETO
  para o disco, **sem o limite de ~10 MB** do conector MCP (que trava arquivos
  grandes por trafegar o conteúdo pelo contexto). Use para ler PDF de processo, CNIS
  ou laudo acima de 10 MB, depois leia/renderize o arquivo local ou fatie com
  `pdf_split.py`. Requer o token do Google (`gdrive_devflow.py`, ver `GDRIVE_SETUP.md`).
- `gdrive_upload.py "<arquivo_local>" "<id_pasta>" ["Título"]` — **sobe** um arquivo
  local (ex.: parecer/procuração/RAC em .docx) para uma pasta do Drive (a subpasta
  `Claude` do cliente) lendo do disco e enviando direto pela API, **sem trafegar
  base64 pelo contexto** (resolve a fricção do `create_file` do MCP com .docx). Requer
  token com **escopo de escrita** (`gdrive_client.SCOPE = .../auth/drive`); trocar o
  escopo exige reautenticar uma vez com `gdrive_authcode.py` (`url` e depois `exchange`).

## Atribuição real das tarefas (assignee) via Windows-MCP

O Microsoft To Do guarda **a quem cada tarefa está atribuída** (Paulo, Marcão, Amanda,
André, Ingrid) apenas no **banco local do app** (`todosqlite.db`), NÃO na API do Graph.
Confirmado por leitura do dado bruto, o `todoTask` do Graph (v1.0 e beta) não traz
nenhum campo de atribuição, e o To Do não tem etiquetas editáveis pelo usuário. Logo,
sem o banco local, a triagem só consegue **adivinhar** as tarefas do Paulo pela
convenção `(P)` no corpo (`is_paulo_task`).

**Como obter o assignee real (roda na máquina do Paulo, com o Windows-MCP conectado).**
Pela ferramenta `mcp__Windows-MCP__PowerShell` (o terminal, não o clique por
coordenada nem o Snapshot, que falharam), localizar o `todosqlite.db` em
`%LOCALAPPDATA%\Packages\Microsoft.Todos_*`, **copiá-lo** para uma pasta temporária e
rodar Python com `sqlite3` sobre a cópia. As tabelas úteis são `assignments`, `tasks`,
`task_folders` e `members`. Cruzar `assignments.assignee_id` com `members` (`online_id`
→ `display_name`) dá o mapa de responsáveis, e `tasks` guarda o **`online_id`**, que é
o **mesmo id** que o Graph usa em `task["id"]`.

**Mapa de responsáveis (confiança, id interno do banco local, não oficial da Microsoft).**
- Paulo Roberto Tercini Filho = `14C625ADBD56ECFA` (bateu 279 tarefas ativas contra os
  283 da tela "Atribuído a mim", coincidência que sustenta a identidade).
- Marcão, Amanda, André, Ingrid, a levantar pela mesma consulta em `members`.
Como é id interno, para rigor total conferir a contagem na tela "Atribuído a mim" ou
casar com o Graph após reautenticar com escopo `User.Read` (o token atual é só de Tasks,
`/me` dá 403).

**Integração com a triagem.** No lado do Windows-MCP, gerar um JSON com a lista de
`online_id` das tarefas **incompletas atribuídas ao Paulo** e salvá-lo como
`todo_assignee_paulo.json` na raiz do repo (ou apontar `TRIAGEM_ASSIGNEE_FILE`).
Havendo esse arquivo, o `triagem_do_dia.py` filtra pela **atribuição real** em vez da
convenção `(P)`; sem ele, mantém o fallback `(P)`. Se o filtro casar 0 tarefas mas
houver `(P)` no dia, o script avisa que o formato do `online_id` pode divergir do
`task id` do Graph (aí conferir a coluna certa do `tasks`).

