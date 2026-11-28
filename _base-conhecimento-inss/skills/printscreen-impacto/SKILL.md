---
name: printscreen-impacto
description: "Componente Visual Law de documento real. Processa documentos reais (PPP, CNIS, indeferimento, laudo, exames, decisões) gerando printscreens com destaques (grifo, borda, seta, caixa de anotação) e insere no .docx da petição junto ao argumento. Use quando a peticao-previdenciaria tiver documento real cujo trecho decide o ponto e o titular quiser o destaque, e SEMPRE que mencionar printscreen de impacto, destaque visual, grifo no PPP, grifo no indeferimento, destaque no CNIS, seta no laudo, prova visual na petição, Visual Law com documento real. Indicada quando auditoria-ppp, auditoria-laudo-pericial, analise-documental-incapacidade, analise-bpc-loas ou base-cnis-acerto-indicadores identificarem pontos críticos. NÃO use sem documento real."
---

# Printscreen de Impacto. Componente Visual Law de documento real

## Visão Geral

Esta skill insere na petição a imagem do documento real, com destaque no trecho que sustenta a tese, no ponto em que o argumento o analisa. O julgador vê a prova sem buscá-la nos autos.

Desde a Onda 174 o componente Visual Law é opcional e entra quando o titular pedir ou quando a matéria exigir, e o printscreen conta no teto de três componentes por peça de `peticao-previdenciaria/references/VISUAL-LAW.md`. A paleta preto e branco daquela referência rege as tabelas. O destaque sobre a imagem usa a paleta de cores abaixo, porque o grifo cinza não se distingue do texto digitalizado.

## Princípio Fundamental

O printscreen de impacto NÃO é um anexo. É um elemento argumentativo integrado ao texto da petição. A imagem do documento real, com destaques aplicados, aparece no corpo do .docx imediatamente antes ou depois do parágrafo que analisa aquele ponto específico.

## Pipeline de Processamento

O processamento tem quatro etapas, em sequência.

### Etapa 1. Extração

Extrair a página ou região relevante do documento original. Para PDFs, converter a página em imagem com resolução mínima de 200 DPI usando `pdftoppm`. Para imagens já enviadas pelo usuário, usar diretamente. Para documentos extensos, recortar apenas a região relevante com Pillow (crop).

Consultar `references/PROCESSING.md` para o código completo de extração.

### Etapa 2. Identificação Automática

Identificar os pontos a destacar com base na auditoria técnica já realizada pelas skills complementares. A identificação segue regras por tipo de documento.

**PPP**
- Campo 15.4 com intensidade acima do limite de tolerância do período (ruído acima de 80 dB(A) até 05/03/1997, de 90 dB(A) até 18/11/2003 e de 85 dB(A) depois, Tema 694/STJ; calor acima do IBUTG; vibração acima dos limites NHO-09/10)
- Campo 15.3 com agente do Anexo 13 da NR-15 avaliado de forma qualitativa (correto, destacar em verde)
- Campo 15.5 com técnica de medição ausente ou reduzida à menção "NR-15"
- Campo 15.7 com EPI declarado eficaz sem comprovação (Tema 1090/STJ)
- Campo 16 com responsável técnico sem habilitação ou fora do período
- Divergências entre períodos registrados e CNIS
- Omissão de agente nocivo identificado em LTCAT ou laudo técnico

**CNIS**
- Indicadores bloqueantes (PEXT, PREC-MENOR-MIN, PDIV-DADOS-GFIP, PVIN-IRREG, PREC-FBR, PADM-EMPR)
- Vínculos sem data de rescisão
- Competências com remuneração abaixo do mínimo (ICOMPL-VR-SM-EC103)
- Lacunas entre vínculos que afetam período de graça
- Períodos de contribuição como CI sem recolhimento

**Carta de Indeferimento / Despacho Decisório**
- Fundamentos juridicamente superados por tema repetitivo ou repercussão geral
- Erros técnicos na aplicação de normas (ex. exigência de avaliação quantitativa para agente qualitativo)
- Omissão de análise de documentos apresentados na DER (Tema 1124/STJ)
- Fundamentação genérica sem indicação específica do motivo

**Laudo Pericial**
- Contradições entre conclusão e dados objetivos do laudo
- Quesitos respondidos de forma evasiva ou incompleta
- Divergência entre achados do exame físico e conclusão sobre capacidade
- Omissão de análise de documentos médicos particulares

**Documentos Médicos**
- Achados clínicos relevantes em exames de imagem (lesões, fraturas, herniações)
- Conclusões de laudos particulares que contradizem a perícia do INSS
- Datas de exames que comprovam contemporaneidade com a DER

**Decisões Judiciais/Administrativas**
- Trechos que violam tese firmada em tema repetitivo
- Omissão de fundamentação sobre ponto essencial
- Erro material em dados do segurado

### Etapa 3. Aplicação de Destaques

Aplicar os destaques visuais sobre a imagem do documento usando Pillow. O sistema de destaques segue uma paleta fixa integrada ao Visual Law do escritório.

**Paleta de cores do destaque**
- Vermelho (rgba 255,0,0,60), fundamento superado, erro técnico, valor acima do limite, contradição
- Verde (rgba 144,238,144,100), ponto que favorece a tese, dado correto, fato incontroverso
- Âmbar/Amarelo (rgba 255,255,0,100), alerta, EPI sem comprovação, dado que exige atenção
- Azul (rgba 0,100,255,60), marco processual, dado informativo neutro

**Tipos de destaque**
- Grifo semi-transparente (retângulo com fill RGBA sobre o texto)
- Borda colorida ao redor do trecho (retângulo outline, width 2-3px)
- Seta indicativa (linha + polígono triangular apontando para o ponto)
- Caixa de anotação lateral (retângulo com fill claro, borda colorida, texto explicativo curto)

**Regras de aplicação**
- Máximo de 4 destaques por printscreen para não poluir visualmente
- Caixas de anotação sempre à direita ou abaixo do trecho destacado
- Texto das anotações em frases curtas e diretas (máximo 3 linhas)
- Fonte das anotações em tamanho menor que o corpo do documento

Consultar `references/PROCESSING.md` para o código completo de processamento.

### Etapa 4. Inserção no .docx

Inserir o printscreen processado no .docx da petição usando a função `printscreenImpacto()` disponível em `references/DOCX-INTEGRATION.js`.

**Posicionamento na petição**
- O printscreen aparece imediatamente após o parágrafo que introduz o ponto a ser demonstrado
- Uma legenda em itálico, 9pt, cor cinza, identifica o documento por ID no PJe
- O parágrafo seguinte ao printscreen desenvolve o argumento jurídico sobre o ponto destacado

**Formatação no .docx**
- Tabela invisível (bordas NONE) de coluna única, largura 95% da área de conteúdo
- Célula da imagem com borda sutil cinza (SINGLE, size 4, color BDBDBD)
- Célula da legenda com fundo cinza claro (F5F5F5), sem bordas
- Imagem centralizada dentro da célula
- Dimensões da imagem ajustadas para caber na largura da página sem exceder

**Regras de uso por tipo de petição**

Quando o componente for usado, o documento e o teto variam pela peça.

| Peça | Documento | Teto |
|---|---|---|
| Inicial de aposentadoria especial | PPP (campos 15.3 a 15.7) e indeferimento | 3 |
| Incapacidade (B31/B32) | laudo pericial (contradição) ou exame (achado clínico) | 3 |
| Mandado de segurança | ato impugnado | 2 |
| Recurso e impugnação | decisão recorrida, no ponto atacado | 2 |
| BPC/LOAS | avaliação IFBrM, domínios subpontuados | 2 |

No JEF, até 2 por peça. No rito ordinário e no CRPS, até 4 quando justificado, sempre dentro do teto de três componentes Visual Law.

## Integração com Skills Complementares

Estas skills indicam o printscreen quando identificam ponto crítico em documento real.

- **auditoria-ppp.** Campos com vícios, valores acima dos limites, EPI sem eficácia comprovada
- **auditoria-laudo-pericial.** Contradições, quesitos evasivos, omissões
- **analise-documental-incapacidade.** Requisitos documentais das Portarias 13/14/15-2026
- **analise-bpc-loas.** Domínios subpontuados no IFBrM, divergências funcionais
- **base-cnis-acerto-indicadores.** Indicadores bloqueantes, competências problemáticas
- **peticao-previdenciaria.** Integra os printscreens no .docx final

## Fluxo de Trabalho Completo

1. Ler `references/PROCESSING.md` para as funções Python de extração e destaque
2. Ler `references/DOCX-INTEGRATION.js` para a função de inserção no .docx
3. Receber o documento do caso (PDF ou imagem)
4. Executar a auditoria com a skill especializada (PPP, laudo, CNIS)
5. Identificar automaticamente os pontos a destacar com base na auditoria
6. Extrair a região relevante do documento
7. Aplicar os destaques visuais
8. Inserir no .docx da petição na posição correta
9. Adicionar legenda com referência ao ID do documento no PJe

## Referências

- `references/PROCESSING.md`. Código Python completo para extração, recorte e aplicação de destaques com Pillow
- `references/DOCX-INTEGRATION.js`. Função JavaScript para inserção do printscreen no .docx via docx-js, escrita para o antigo TEMPLATE.js; com o `md2docx.js` (Onda 140), a imagem se insere no .docx já convertido

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
