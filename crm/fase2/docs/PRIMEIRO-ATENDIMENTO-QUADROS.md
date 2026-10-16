# Primeiro atendimento em quadros e Análise de Direito por benefício (F231 a F234)

Documento de projeto aprovado em 16.10.2026. Substitui `ANALISE-POR-BENEFICIO.md` (F217) e `wireframe-analise-por-beneficio.txt`. Os requisitos de cada benefício estão em `REQUISITOS-POR-BENEFICIO.md`.


## Contexto

**Primeiro atendimento hoje** (`painelPA`, app.html:22130)
- É uma grade de 8 a 12 blocos compactos com um único painel de detalhe.
- A faixa de benefícios fica no topo.
- O que vai à Análise de Direito se escolhe com uma chave por bloco, e essa escolha vive só na sessão (`_paForaBl`).

**Análise de Direito hoje** (`painelDireito`, app.html:20052)
- Mostra a exploração do dossiê e depois todos os quadros de todos os benefícios juntos (`modulosDireito`).
- Tem três seletores repetidos: a faixa, os "Trabalhos possíveis" e a nav `.ad-trab`.
- Tudo é gravado por cliente (`campos.ad_modulos`, `analisesDe(c.id)[0]`), e dois pré-casos do mesmo cliente se misturam.

**O pedido (16.10.2026)**
- O Primeiro atendimento passa a ser a primeira leitura didática do dossiê, em quadros: primeiro o CNIS (qualidade, carência, última contribuição ou benefício, indicadores), depois a RAIS (se há afastamento sem remuneração e em que período), depois os CNPJs, depois os demais documentos.
- Em cada quadro você escolhe o que levar. No fim fica o quadro dos benefícios.
- Na Análise de Direito vem primeiro o quadrado com os benefícios escolhidos. Cada clique abre, logo abaixo, os requisitos específicos daquele benefício, que eu escrevo.
- Você decidiu: a escolha é **item a item, com tudo marcado no início**, e vale **por pré-caso**.

**O levantamento (12 agentes)**
- Requisitos dos 23 benefícios do `BENEF`, conferidos no MCP normas e na IN 128 (cerca de 95 %).
- Cerca de 70 erros no cálculo atual.
- Cerca de 45 achados da revisão do plano.

O levantamento está em `REQUISITOS-POR-BENEFICIO.md`.

## Desenho

### Primeiro atendimento: a leitura do dossiê

```
Passos ✓ Identificação · 2 Primeiro atendimento · 3 Análise de Direito · 4 Documentos
Dossiê de 14/10/2026 · 37 documentos · Meu INSS, Emprega Brasil, Redesim, CadÚnico
Legenda: ● em risco ● falta ● em ordem ● a conferir · ☑ vai para a Análise de Direito
Índice: 1 CNIS (6) · 2 RAIS (3) · 3 CNPJs (1) · 4 Pedidos (2) · … · Benefícios

┌ 1 · Situação no CNIS ──────────────────────────────── [☑ todos] ┐
│ O que é: o cadastro do INSS com vínculos, contribuições e benefícios. │
│ O que encontramos: segurada até 05/2027, 104 contribuições, 2 pontos a acertar. │
│ Importa para: incapacidade, aposentadorias, pensão                    │
│ [Qualidade: mantida até 05/2027] [Carência: 104] [Tempo: 12a4m]       │
│ [Última contribuição: 03/2026 · Empresa X] [Último benefício: B31 até 08/2024] │
│ [Idade e aposentadoria prevista: 58 anos · prevista 03/2030]          │
│ linha do tempo (contribuições · graça · perda · benefícios · licença) │
│ ☑ ● Vínculo lançado fora do prazo (PEXT): o INSS pede documento da época │
│ ☑ ● 5 meses abaixo do mínimo depois de 13/11/2019: não contam sem complementar │
│ ☑ ● Vínculo sem data de saída: Empresa Y, desde 02/2015      mostrar mais (3) │
│ Documentos deste quadro: ☑ CNIS completo [abrir] · ☑ CNIS resumido [abrir] │
└───────────────────────────────────────────────────────────────────────┘
┌ 2 · RAIS e CAGED: há afastamento sem remuneração? ┐  ☑ Sim: Empresa X, 01/03/2019 a 30/06/2019 (122 dias)
│                                                    │     (ou ☑ "Nenhuma licença sem remuneração na RAIS de 2011 a 2024")
┌ 3 · CNPJs no CPF ┐  ☑ 12.345.678/0001-90 · ME · ATIVA · sócio · Ribeirão Preto [Consultar]  (ou ☑ "Nenhum CNPJ no CPF")
┌ 4 Pedidos ao INSS ┐ ┌ 5 Benefícios (cartas, extratos) ┐ ┌ 6 Saúde (HC) ┐ ┌ 7 PPP e CAT ┐ ┌ 8 CadÚnico ┐   ← só com dado
┌ 9 · Outros documentos ┐  ← só o que nenhum quadro lê (CTPS, declarações, certificado PcD…), por portal
┌ 10 · Não encontrado no dossiê ┐
┌ Benefícios para a Análise de Direito ──────────────────────────────┐
│ Com sinal no dossiê: [● Incapacidade ✓] [● BPC · opção] [◌ Aposentadoria · impedido] │
│ Incapacidade ▸ (Auxílio temporário B31 ✓) (Permanente B32) (Acidentário)   │
│ Demais: [Auxílio-acidente] [Aposentadoria por idade ou tempo] …            │
└────────────────────────────────────────────────────────────────────────────┘
▁▁ barra fixa: Vão: B31 · 23 itens ▁▁▁▁▁▁▁▁▁▁▁▁ [Concluir e levar à Análise de Direito →]
```

**Como cada quadro é montado**
- Cinco partes: "O que é", "O que encontramos" (a conclusão em uma frase), "Importa para" (os benefícios), os itens e "Documentos deste quadro".
- O código do CNIS aparece sempre traduzido por `descIndicador`.
- Até 5 itens ficam à vista; o resto vai para "mostrar mais".
- O fato negativo também tem chave e também pode ser levado ("nenhuma licença", "nenhum CNPJ").
- As tabelas ficam num contêiner com rolagem horizontal, para caber em 390 px.

**Chaves e caixinhas**
- Cada item tem uma chave estável, montada a partir do dado bruto e não do texto. Exemplos: `cnis.qual`, `cnis.ult`, `cnis.ben:<nb>`, `cnis.ind:<código>`, `rais.lic:<raiz>|<de>` (é preciso acrescentar `raiz` ao retorno de `licencasDaRais`), `rais.lic:nenhuma`, `cnpj:<cnpj>`, `ped:<protocolo>`, `doc:<caminho>`.
- Só se grava o que foi desmarcado (`fora`).
- A caixinha é um botão com `role="checkbox"`, como o interruptor de hoje. Ela muda a classe e os contadores no próprio lugar, sem `repintarFicha` e sem prender o foco.

**Situações especiais**
- `quadrosDoPA` calcula sem a lente da espécie (família nula). Assim o Primeiro atendimento não muda quando o Mapa ou a Análise de Direito trocam `_mapaLente`.
- Seguro-desemprego: o "+12 meses" só aparece quando a parcela cai na graça da última competência.
- Sem dossiê e sem CNIS: aparecem só `.pa-sem-dz`, o relato da recepção e o quadro final.
- Dossiê parcial: os quadros 1, 2, 3 e 10 aparecem sempre, cada um com o motivo de estar vazio ("não consultado" é diferente de "consultado, nada encontrado").

**Quadro final**
- Junta a faixa (`faixaBeneficios`) com os sinais que hoje estão em "Trabalhos possíveis" (selo, "Falta", impedimento).
- "Impedido" fica só para a vedação absoluta, como aposentadoria com B31, B32, B42 ou B46.
- No BPC e no B94 o selo é "opção: não acumula, compare os valores".
- O botão da barra chama `concluirEtapa(cliId,'pa')` quando há pré-caso.

**Mapa do dossiê**
- Passa a só mostrar. O botão "Levar" dele é trocado por "Escolher no Primeiro atendimento".
- Saem `_mapaFora`, `mapaLevar` e o ramo do mapa em `adTrazido`.

### Análise de Direito: o quadrado e um benefício por vez

```
┌ Benefícios em análise ─────────────────────────────────────────────────┐
│ [B31 Auxílio temporário ● 6 de 11 · 2 a informar]  [B94 Auxílio-acidente ● em risco]  [＋ benefício] │
│ Clique num benefício para ver os requisitos.                             │
└──────────────────────────────────────────────────────────────────────────┘
┌ Requisitos · Auxílio por incapacidade temporária (B31) ← logo abaixo, só depois do clique ┐
│ Em uma frase: … · 6 de 11 em ordem · 2 a informar · 1 em risco · 1 divergente │
│ ● Era segurada no dia em que ficou incapaz?  DII 10/01/2026 (laudo SABI) · mantida até 05/2027 (CNIS) │
│     Lei 8.213, art. 15; IN 128, art. 335 · [ver a história da qualidade]          │
│ ● Tinha 12 contribuições antes da DII?  9 até 01/2026 → falta 3 · IN 128, art. 196 │
│ ◌ Ficou incapaz por mais de 15 dias?  a informar · Último dia trabalhado [__/__/____] │
│ ◐ Análise documental: lei 30 dias × Portaria 14/2026 90 dias (divergente) │
│ … (tabela de Tempos só nos benefícios que somam tempo)                     │
│ ▸ Outros itens do primeiro atendimento (fechado)                           │
└─────────────────────────────────────────────────────────────────────────────┘
Minhas considerações · Desfecho (do benefício aberto) · Registrar análise deste benefício
▸ Análises anteriores e histórico (fechado no modo atendimento)
```

**O quadrado e o painel**
- O quadrado mostra só os benefícios escolhidos. Cada botão traz a contagem e a pior bola, vindas do motor.
- "＋ benefício" abre ali mesmo o seletor de famílias e opções e repinta só aquele trecho.
- Nada abre antes do clique. O benefício aberto fica em `_adBenef`, guardado por `cliId|pcId`.
- O painel aparece logo abaixo do quadrado (é o elemento seguinte no DOM) e é repintado sozinho, como faz `adTrazidoTrocar`. Com isso nada do que foi digitado se perde.

**O que vem do Primeiro atendimento**
- Os itens levados aparecem dentro do requisito que eles medem.
- O resto vai para "Outros itens do primeiro atendimento", fechado no pé do painel.
- Os painéis de exploração de hoje abrem dentro do requisito pelo botão "ver em detalhe": `painelQualidade`, vínculos e remunerações, `painelCnpjs`, `painelPedidos` e `painelCategorias`.

**Um só lugar para digitar**
- Os campos de cada requisito alimentam `#ad-campos`.
- O `formAnalise` perde `#ad-trazido` e a `.ad-trab`, e passa a seguir `_adBenef` (`ad-esp`/`ad-sub`).
- A lateral `painelTrabalhos` sai.

**Fora do modo atendimento**
- Resumo, regras, análises anteriores e notas aparecem como hoje.
- Por isso `analise-direito.js`, `analise178.js` e `escritorio178.js` seguem valendo.

**Registrar e Desfecho**
- Cada análise registrada é de um benefício, o que estiver aberto. Ela guarda `detalhes.precaso_id`, `detalhes.beneficio` (a opção), `detalhes.modulos` (os requisitos e os campos daquele benefício) e `detalhes.levados` (`[{k, txt, fonte}]`).
- `salvarAnalise` só muda a espécie do pré-caso quando ele ainda não tem uma.
- O Desfecho segue o benefício aberto.
- Escolher benefício, desmarcar itens ou ter requisitos calculados não conta como "análise preenchida".

### Onde mora a escolha

- **Coluna nova `casos.ad jsonb`**, com `schema_casos_ad.sql` aplicado no Supabase pelo MCP: `{fora:[chaves], beneficios:{fam:[op]}, valores:{}, tempos:[]}`.
  - Fica fora de `precaso`, e assim não briga com `gravarPrecasos`, `concluirEtapa` ou `gerarCasoDoPre`.
  - A linha leva o `ad` quando vira caso.
- **Qual `ad` vale** (`adDaVez(c)`):
  1. No modo atendimento, o pré-caso escolhido.
  2. Fora dele, o caso selecionado ou ativo que tenha `ad`.
  3. Sem nenhum dos dois, `campos.ad_modulos`. Isso inclui o pré-caso "legado" e o pré-caso ainda sem linha (`!pc.caso_id`).
- **Gravador próprio**:
  - Muda a memória na hora e agenda um PATCH de `casos?id=eq.<linha>` só com `{ad}`, com atraso de 600 ms e um timer por linha.
  - Grava na hora o que estiver pendente antes de `escolherPreCaso`, `concluirEtapa`, `sairModoAtendimento` e `salvarAnalise`.
  - Nunca cria linha.
  - `admDe`, `admSalvar` e `benefSel` mantêm o nome e só trocam a fonte.
- **Herança**:
  - Só quando há um único pré-caso vivo, sem `ad`, e `campos.ad_modulos` existe.
  - A cópia é profunda (`structuredClone`), e `campos.ad_modulos` é apagado na primeira gravação.
  - O pré-caso aberto pelo card herda do pré-caso anterior que tem o mesmo `lembrete_id`.
  - "＋ Novo pré-caso" nasce vazio.
- **Estados da sessão** (`_paEsc`, `_paCartao`, `_paBloco`, `_paAnalise`, `_mapaLente`, `_adBenef`) passam a ser guardados por `cliId|pcId`.
- **`analisesDoPreCaso(c, pc)`**:
  - Acha as análises por `detalhes.precaso_id` ou por `etapas.analise.analise_id`. Sem pré-caso, usa as do cliente.
  - Substitui `analisesDe(c.id)[0]` em `formAnalise`, `servicoInicial` (que passa a ler o pré-caso escolhido ou o benefício aberto), no caminho reserva do `benefSel`, em `desfechoLembrete`, `desfechoCaso`, `painelDireito`, `passosDoAtendimento`, `quadroDesfecho` e `docsDaAnalise`.

### O motor de requisitos

O catálogo é `REQ_BENEF[opção] = [{id, rot, base, conf, campos:[…], mede(x) → [est, frase, fonte]}]`.

**Regras do catálogo**
- Cada opção tem sua própria lista, na ordem da conversa com o cliente. Uma opção não herda nada da outra da mesma família.
- `rot` é a pergunta em linguagem simples.
- `conf` vem do levantamento: conferido, só na skill ou divergente. O selo aparece no próprio requisito.

**Estados de um requisito**
- em ordem, falta, em risco, a informar, informativo, impedido, opção, divergente.
- Divergente mostra a posição do INSS e a da via judicial, e nunca fica "em ordem" quando só a tese favorece.

**O contexto `x`**
- É o `admCtx` estendido para um benefício: DER (campo, padrão hoje), idade fracionária, sexo, filiação (`filiacaoDe`), contagem e graça, `historiaQualidade`, dossiê, itens levados, valores, tempos, benefícios ativos e o salário mínimo do mês da DER (`salarioMinimo(comp)`, que já existe).

**Regras transversais**
- **Carência até o fato**: conta até a DII, até o mês da prisão ou até a DER (`mesesContadosAte`). No art. 27-A conta 6 desde a volta e até a DII.
- **Qualidade na data do fato**: medida por `historiaQualidade`, não só pela última graça. A DII vem primeiro do laudo (`fd.laudos[].dii`) e depois do campo; sem DII, o requisito fica "a informar".
- **Pontos e idades**: vêm da fórmula da EC 103 (arts. 15, 16, 18, § 1º, 20 e 21) aplicada ao ano da DER ou do implemento. Os valores de 2026 são só exemplo.
- **Data do Desfecho e do card**: `baseDesfecho`, `idadeAtingeEm` e `idadeAlcancadaEm` passam a ler a data do requisito de idade. Assim entram a filiação, a escada da mulher de 2019 a 2022, o direito adquirido aos 60 e as transições do professor.
- **Valores sem fonte conferida** viram campo ou levam selo:
  - Limite de baixa renda do auxílio-reclusão: é o campo "limite da Portaria do ano da prisão". R$ 1.364,43 aparece só como referência de 2019.
  - Teto do RGPS: é lido da carta ou do CNIS.
  - Salário mínimo de 2026: leva o selo "não conferido".
  - Deduções do BPC: seguem a DER (Portaria Conjunta 45/2026 ou os valores antigos, com selo).

| Opção | Requisitos (lista própria de cada uma, do levantamento) |
|---|---|
| `b31` | qualidade na DII; 12 contribuições antes da DII (6 desde a volta); isenção de carência (inclui gestação de alto risco; segurado especial: 12 meses rurais); mais de 15 dias; preexistência; 30 dias para a DIB; análise documental (divergente: 30 × 90 dias); prorrogação ou novo pedido; vedações; recluso em regime fechado |
| `b32` | qualidade na DII; carência; isenção; incapacidade total e permanente; sem reabilitação possível; preexistência; DIB; acréscimo de 25 %; RMI; vedações; revisão periódica |
| `acid` | categoria (doméstico desde 02/06/2015); nexo (CAT, NTEP pelo CNAE e CID da CAT, perícia); CAT; qualidade; sem carência; B91 × B92; efeitos; vedações |
| `b94` | categoria (sem CI nem facultativo); qualidade na data do acidente; nexo com o trabalho; consolidação; sequela que reduz (o Anexo III é só exemplo); sem carência; DIB; vedações (aposentadoria; outro auxílio-acidente = opção); análise documental; valor; perda auditiva só aqui |
| `b36` | categoria (sem CI nem facultativo); qualidade; acidente de qualquer natureza (desde 29/04/1995); consolidação; sequela; sem carência; DIB; vedações; análise documental |
| `idade` | filiação antes ou depois de 13/11/2019; idade (escada da mulher; direito adquirido aos 60); tempo mínimo de 15 anos (20 para o homem filiado depois); 180 contribuições (CI ou facultativo em atraso = a conferir; benefício intercalado conta); qualidade dispensada; direito adquirido; acumulação |
| `transicao` | filiado até 2019; direito adquirido integral e proporcional (art. 319) com a carência na data; pontos; idade progressiva; pedágio de 50 % (**mais de** 33/28); pedágio de 100 %; carência; alíquota reduzida sem complemento; competência abaixo do mínimo; qualidade dispensada; acumulação |
| `professor` | magistério na educação básica (especialista não conta; ensino superior fora); direito adquirido; acréscimo da EC 20; pontos; idade progressiva; pedágio de 100 % (55/52); regra permanente só para filiado depois (divergente quanto à alíquota); carência; sem conversão; acumulação |
| `pcd` | ser PcD; grau por períodos; tempo como PcD depois da DID; conversão do art. 70-E; especial pelo art. 70-F, só se melhor e sem somar; carência; deficiência na DER; qualidade dispensada; melhor benefício; acumulação |
| `pcd_idade` | 60/55 anos; 15 anos como PcD (sem tempo de PcD = a informar, nunca o tempo comum); carência (divergente); deficiência na DER; avaliação e DID; especial só na renda; rural; qualidade; renda; acumulação |
| `b46` | exposição 15/20/25; agente por período; prova por época; ruído 80/90/85 dB; EPI (não vale antes de 03/12/1998; Tema 555); categoria; carência; direito adquirido; pontos 66/76/86 com idade em dias e tempo sem o bônus; regra sem idade (ADI 6309, divergente para quem se filiou antes); comum não vira especial (Tema 998 × IN 128, art. 271 = divergente); afastamento (Tema 709 suspende, não cessa); renda |
| `conv` | só até 13/11/2019; fator por agente (2,33/2,00 · 1,75/1,50 · 1,40/1,20, selo "só na skill"); prova; só especial para comum; não conta como carência; concomitância pela atividade de menor tempo, sem dobrar; destino; incapacidade no especial (divergente) |
| `idade_rural` | 60/55 anos; categoria; 180 meses rurais (tabela do art. 142 com selo; empregado rural ×3 de 2011 a 2015 e ×2 de 2016 a 2020); período imediatamente anterior; economia familiar; 4 módulos (desde 23/06/2008); residência; descaracterização (o CNPJ sozinho não descaracteriza); autodeclaração com um documento em cada metade; acumulação |
| `hibrida` | 65/62 anos (escada, direito adquirido); 180 somando as linhas rurais; rural depois de 1991 (segurado especial pela ACP; CI rural = risco); tempo mínimo de 15/20; qualidade dispensada; prova por período; RMI (divergente); acumulação |
| `urb` | qualidade na data do fato gerador; sem carência (Enunciado 19; IN 128, art. 357); CI, MEI ou facultativa em dia; duração (120 dias, 28 dias antes, prorrogações, internação, Zika); afastamento; quem paga (`mat_categoria`); 5 anos; um por fato; acumulação |
| `rur` | **12 meses** de atividade antes do parto; sem carência; condição de segurada especial; documento anterior ao parto; valor; duração; prazo e vedações |
| `def` | impedimento de 2 anos (avaliação própria do BPC, sem IFBr nem grau da LC 142); renda (abaixo) ; exclusões; deduções; CadÚnico atualizado em 24 meses (`familia.atualizada_em`); biometria; residência; nenhum outro benefício, de qualquer regime; trabalho (o art. 21-A só suspende o já concedido) |
| `idoso` | 65 anos na DER; renda (abaixo); exclusões; deduções; CadÚnico; biometria; residência; nenhum outro benefício; trabalho entra na renda |
| `morte` | óbito; qualidade do **instituidor** (campos `ins_*`; art. 102, § 2º); sem carência; classe (pais e irmãos só sem classe 1; menos de 21 anos; ex-cônjuge com alimentos); dependência econômica; equiparados (menor sob guarda = divergente); prova da união (2 provas, uma dos 24 meses, para óbito desde 18/01/2019); duração da cota (4 meses só para óbito desde 01/03/2015; exceções do art. 77, § 2º-A, e do art. 375, §§ 3º a 5º); prazo de 90/180 dias (com corte); exclusão por crime; acumulação |
| `reclusao` | prisão (regimes do art. 382 e corte de 18/01/2019); certidão; qualidade do **recluso**; 24 contribuições só para prisão desde 18/01/2019; baixa renda (média só dos salários existentes, sem salário = baixa renda; antes de 2019 = a conferir); vedações do recluso; união anterior à prisão; DER antes da soltura; dependente; valor de até 1 SM |
| `rev` | benefício concedido; decadência (1º pagamento, depois DIP, depois DIB; Tema 313; art. 591 para menor ou incapaz; prazo de origem na pensão derivada; alertas em 6, 12 e 24 meses); pedido anterior; prescrição e efeitos (DPR × DIP); reabre a concessão; troca de espécie; teses separadas (art. 29, II ≠ melhor benefício; teto sem decadência com selo "só na skill"; RVT vencida; IRSM decaída; indébito à parte) |
| `acerto` | o CNIS como prova; quando pedir (divergente); indicador P, I ou A; extemporâneo; prova por categoria; empregado sem recolhimento; CI em atraso; abaixo do mínimo (divergente); mês sem remuneração; licença da RAIS (antes de 13/11/2019 = só na skill); guia vai à Receita; indenização; limbo (não baixar); baixa renda; recurso |
| `crps` | decisão recorrível; 30 dias da ciência, no 1º dia útil (`proxDiaUtil`); forma da ciência; motivo (lido de `lerProcessoTexto`); legitimidade; sem ação igual; revisão sem elemento novo; preclusão; alçada; relevação; abre também os requisitos da espécie negada |

**Renda do BPC**
- Os integrantes são os membros de `dossie.cadunico.familia` filtrados pelo rol do art. 20, § 1º, da LOAS.
- O Bolsa Família entra na renda, tirado de `beneficios_pagos`.
- Saem as exclusões dos §§ 9º e 14, com um benefício de até 1 SM por integrante, e entram as deduções da DER.
- Acima de 1/4 o resultado é "em risco" (outros meios de prova), não "falta".
- A renda por pessoa do CadÚnico nunca é usada como resultado.

**Outras correções que entram no motor**
- Filtro `/acidente/` de `calcularGraca` (app.html:18607): passa a ser pela espécie.
- Benefício por incapacidade intercalado: conta como carência e tempo numa linha própria, sem mexer em `contagemCnis`.
- Art. 19 só para quem se filiou depois de 13/11/2019; para os demais, art. 18 com 15 anos.
- `mat_carencia` e `mat_rural` em `PONTOS_ESPECIE` corrigidos.
- Texto de `PA_IMPEDE_POR` corrigido.
- `painelCnpjs`: `razao`/`local`.
- `PORT`: cadunico e transparencia.
- `SUBESPECIES.REV` separadas.
- A decisão de cada divergência fica escrita em `REQUISITOS-POR-BENEFICIO.md` para você confirmar.

## Passos (nesta ordem, cada um com commit, versão e testes verdes)

**0 · Base**
- Criar a branch `claude/pa-quadros-requisitos`.
- Gravar `crm/fase2/docs/REQUISITOS-POR-BENEFICIO.md` (o levantamento inteiro, as correções e a decisão de cada divergência) e `PRIMEIRO-ATENDIMENTO-QUADROS.md` (este desenho e os wireframes).
- Marcar `ANALISE-POR-BENEFICIO.md` e o wireframe antigo como substituídos.

**A · F231 · a escolha por pré-caso** (11.58, sem mudança visível)
- `schema_casos_ad.sql` aplicado no Supabase.
- `adDaVez`, o gravador próprio, a herança e os estados por `cliId|pcId`.
- `analisesDoPreCaso` em todos os pontos listados, e `detalhes.precaso_id`.
- Ajustar `salvarAnaliseSePreenchida`.
- Teste `f231.js` no `banco-simulado.js`, com o cenário de dois pré-casos do f226:
  - desmarcar no pré-caso A, trocar para o B, recarregar e voltar;
  - digitar e concluir a etapa em menos de 600 ms;
  - o legado continua em `campos`;
  - herança sem vazamento;
  - "Gerar o caso" mantém o `ad`.
- Ajustar f217 (E1 passa a ler o PATCH de `casos`), f219, f220 e f226.

**B · F232 · o motor** (11.59)
- `REQ_BENEF` dos 23 benefícios, `filiacaoDe`, `mesesContadosAte`, qualidade na data, intercalados, fórmulas por ano e todas as correções acima.
- A AD atual passa a usar as linhas corrigidas.
- `quadrosDoPA(c, ks)` puro (dados e chaves, sem tela).
- Teste `f232.js` com funções puras e casos-ouro por benefício, entre eles:
  - pedágio de 50 % com exatamente 33 anos → não;
  - homem filiado em 2010, com 65 anos e 16 de contribuição → art. 18 em ordem;
  - DII 01/2026 com 5 contribuições antes e 8 depois → falta;
  - B91 em manutenção mantém a qualidade;
  - professora de 2000 com 25 anos e 55 de idade em 2026 → idade progressiva cumprida;
  - mulher com 61 anos em 2021 e 180 contribuições → direito desde 2021;
  - especial com 25 anos e 60a11m → 85,9 pontos, não chega;
  - família com avó e Bolsa Família;
  - acidente de trânsito, 10 contribuições, viúva de 46 → cota vitalícia;
  - instituidor sem qualidade, com 65 anos e 180 contribuições → pensão;
  - prisão em 2018, semiaberto, 3 contribuições → em ordem;
  - segurado especial com 12 meses rurais → B31 em ordem;
  - híbrida com 100 contribuições e 90 meses rurais → 180;
  - CI com sequela de acidente de trânsito no B36 → impedido;
  - CI com 3 contribuições no salário-maternidade → em ordem;
  - titular com 10 anos na concessão de 2014 → decadência não consumada;
  - as chaves de `quadrosDoPA` não mudam com `_mapaLente`.
- Ajustar f220 6.x, `lembretes.js`, `segurocnpj.js` e `dossie1.js`.

**C · F233 · Primeiro atendimento em quadros** (11.60)
- `painelPA` reescrito sobre `quadrosDoPA`: índice, legenda, barra fixa e o quadro final.
- O Mapa passa a só mostrar.
- Fica um adaptador `paVai(bloco)` ("algum item do bloco levado") enquanto a AD antiga existir.
- Cache de `paDados` por versão dos dados.
- Teste `f233.js`:
  - ordem e modelo dos quadros, fato negativo, caixinha sem repintura, "mostrar mais" com 40 anexos do HC;
  - 390 px sem estouro;
  - sem dossiê e com dossiê parcial;
  - prova de tempo em `desempenho.js`.
- Reescrever `f196.js` (ficam só as provas que não dependem do layout); ajustar f230, f195 e f220 (2.3 e 8.3).

**D · F234 · Análise de Direito por benefício** (11.61)
- `painelDireito` no modo atendimento: o quadrado, o painel do benefício (`painelBeneficio`), considerações, Desfecho e Registrar.
- O histórico vai para `<details>`.
- `formAnalise` sem `#ad-trazido` e sem `.ad-trab`.
- Uma análise registrada por benefício, com `detalhes.levados`.
- Sai `painelTrabalhos`.
- Teste `f234.js`, que substitui o f217:
  - nada abre antes do clique, e o painel é o irmão seguinte do quadrado;
  - contagem e bolas;
  - troca de pré-caso;
  - tempos (`#adm-tempos`, `.adm-mais`, `.adm-x`, `.adm-tot`);
  - nada digitado se perde ao trocar de benefício;
  - nenhum id repetido.
- Apagar o `f217.js`; ajustar f196 (parte da AD), f219 e f226.

**Em cada passo**
- Subir a versão (app.html:4386).
- Rodar `python3 crm/publicar.py` e `cmp crm/fase2/app.html docs/crm/index.html`.
- Escrever o parágrafo da F no CLAUDE.md.
- Os testes novos imprimem também "N/N passaram", que o placar do `rodar.js` reconhece.
- Rodar a suíte inteira e só então fazer o commit `CRM 11.xx · F23x · …`.
- **Merge e push na `main` só com o seu ok.**
- A migração do passo A é feita no Supabase pelo MCP e entra no plano que você aprova aqui.

## Verificação

- `cd crm/fase2/testes/cadastro && node rodar.js`: a suíte inteira, em cada passo. Durante o trabalho, `node rodar.js f231 f232 f233 f234 f196 f195 f219 f220 f226 f230 lembretes segurocnpj dossie1 desempenho`.
- `python3 -m pytest tests/ -q`, que é o portão do deploy.
- No navegador, com o preview do `app.html` e o banco simulado:
  - um cliente com dossiê: conferir a ordem dos quadros, desmarcar itens, recarregar e ver a escolha voltar;
  - levar à AD e abrir cada benefício;
  - dois pré-casos com escolhas diferentes;
  - largura de 390 px.

**Fora do escopo**
- A extensão Dossiê.
- Leitor novo para certidões, CTC ou rural (os grupos `rural`, `certidoes` e `ctc` continuam sem fato).
- Mudar `contagemCnis`.
- A correção da skill da PcD por idade, que vai numa onda da base.
