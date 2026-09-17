# Mecânica do .docx no padrão do escritório

Onda 140 (16/09/2026). Este arquivo documenta o padrão visual e a implementação em docx-js que ANTES ficavam no corpo da skill. A partir da Onda 140 a peça é redigida em Markdown e convertida por `scripts/md2docx.js`, que implementa tudo isto. O modelo não escreve docx-js. Este arquivo serve à manutenção do script e à conferência do resultado.

## Padrão Visual do Escritório

Esta seção define a formatação exata extraída das peças reais do escritório. Valores em twips (1 cm = 567 twips) e EMU (914400 EMU = 1 polegada).

### Página e Margens

- Tamanho da página: **A4** (11907 × 16838 twips)
- Margem superior: **851 twips** (≈ 1,5 cm)
- Margem inferior: **1134 twips** (≈ 2 cm)
- Margem esquerda: **1560 twips** (≈ 2,75 cm)
- Margem direita: **1134 twips** (≈ 2 cm)
- Header (distância da borda): **720 twips** (≈ 1,27 cm)
- Footer (distância da borda): **720 twips** (≈ 1,27 cm)
- Largura útil de conteúdo: **9213 twips** (após margens esquerda e direita)
- `<w:titlePg/>` ativado para que primeira página tenha header/footer próprios

### Fonte e Tipografia do Corpo

- Fonte principal do corpo: **Bookman Old Style**, tamanho **12pt** (24 half-points)
- Alinhamento padrão do corpo: **Justificado** (`AlignmentType.JUSTIFIED`)
- Espaçamento entre linhas: **1,5 linhas** (line: 360, lineRule: auto)
- Espaçamento antes/depois de parágrafos: **12pt** (before: 240, after: 240)
- Recuo de primeira linha do corpo argumentativo:
  - **2 cm (1134 twips)** para petições judiciais (JEF, rito ordinário, mandado de segurança, recursos judiciais)
  - **4 cm (2268 twips)** para petições administrativas ao CRPS (recurso ordinário, recurso especial, embargos, revisão de acórdão)

### Header da Primeira Página (timbre)

A primeira página exibe cabeçalho timbrado em tabela de duas colunas, sem bordas visíveis nas células.

**Tabela do header.**
- Coluna 1: **1668 twips**, contém a logo do escritório
- Coluna 2: **7620 twips**, contém o texto de identificação centralizado
- Todas as bordas das células: `nil` (invisíveis)
- Altura da linha: 993 twips

**Logo (coluna 1).**
- Imagem JPEG, alinhada à direita
- Dimensões em EMU: **cx="791210" cy="712470"**

**Texto de identificação (coluna 2), centralizado.**
- Linha em branco (Bell MT, 8pt, espaçador superior)
- "ADVOCACIA PREVIDENCIÁRIA" — Bell MT, negrito, **24pt** (48 half-points)
- "DR. PAULO ROBERTO TERCINI FILHO" — Arial Unicode MS, espaçamento exato 240
- "OAB/SP 331.110" — Arial Unicode MS, espaçamento exato 240

**Linha horizontal separadora.** Parágrafo vazio após a tabela com borda inferior `single, sz=6, color=auto` (preto).

### Header das Demais Páginas

A partir da segunda página, o header é vazio (apenas um parágrafo em branco com espaçamento). Sem logo, sem timbre.

### Footer da Primeira Página

Apenas na primeira página, com linha horizontal acima e endereço/contatos centralizados.

- Parágrafo vazio com borda inferior `single, sz=6, color=auto` (separador superior)
- "Rua Rui Barbosa, nº. 663, Centro, Monte Alto – SP" — Arial Unicode MS, centralizado
- "Tel: 16-3242-2908 – Cel: 16-98140-9271" — Arial Unicode MS, centralizado

### Footer das Demais Páginas

Footer das páginas seguintes é vazio. **Não exibir número de página** em nenhuma página da petição.

### Endereçamento ao Juízo

- Alinhamento: **Justificado**
- **Negrito** + **CAIXA ALTA**
- Fonte: Bookman Old Style 12pt
- Sem recuo de primeira linha
- Espaçamento padrão (before: 240, after: 240, line: 360)

Exemplos por tipo de peça.

- **JEF judicial**: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL DO EGRÉGIO JUIZADO ESPECIAL FEDERAL DE [CIDADE], ESTADO DE SÃO PAULO."
- **Rito ordinário**: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL DA ___ VARA FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE [CIDADE], SEÇÃO JUDICIÁRIA DE SÃO PAULO."
- **Mandado de segurança**: idêntico ao rito ordinário, dirigido à Vara Cível Federal ou Vara Previdenciária competente (consultar skills `mandado-seguranca-previdenciario` e `ms-competencia-autoridade-coatora`).
- **Turma Recursal**: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL PRESIDENTE DA EGRÉGIA TURMA RECURSAL DOS JUIZADOS ESPECIAIS FEDERAIS DA 3ª REGIÃO."
- **CRPS**: "ILMO. SR. PRESIDENTE E DEMAIS MEMBROS DA __ CÂMARA DE JULGAMENTO DO CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL (CRPS)" ou "ILMO. SR. PRESIDENTE E DEMAIS MEMBROS DA __ JUNTA DE RECURSOS DO CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL (CRPS)".

### Número do Processo

- **Negrito**
- Bookman Old Style 12pt
- Sem recuo
- Formato judicial: "Processo nº. XXXXXXX-XX.XXXX.X.XX.XXXX" ou "Proc. n.: XXXXXXX"
- Formato administrativo: "Processo administrativo nº XXXXXXX" e/ou "NB XXX.XXX.XXX-X"

### Qualificação das Partes

A qualificação é redigida em parágrafo único de texto corrido, com recuo de primeira linha de 2 cm (judicial) ou 4 cm (CRPS), alinhado justificado.

Elementos do parágrafo de qualificação na ordem.

1. Nome do autor em **CAIXA ALTA + NEGRITO** (inline, sem parágrafo isolado)
2. Qualificação civil (nacionalidade, estado civil, profissão, RG, CPF, endereço)
3. Conexão com a peça ("vem, respeitosamente, perante V. Exa., propor a presente")
4. **Nome da ação em CAIXA ALTA + NEGRITO**, inline, no próprio parágrafo de qualificação (não em parágrafo isolado destacado)
5. "que move em face do INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS", com **INSS em CAIXA ALTA + NEGRITO**
6. Encerramento ("pelos fatos e fundamentos a seguir expostos")

### Títulos de Seção — Tabela Preta

**Padrão visual obrigatório do escritório.** Cada título de seção é renderizado como uma **tabela de uma célula com fundo preto e texto branco em negrito**, alinhado à esquerda. Esse é o elemento visual mais identificável das peças do escritório e substitui qualquer outra formatação de cabeçalho.

**Estrutura técnica da tabela de título.**

- Largura da tabela: **9214 twips** (preferível) ou 9071 twips, casando com a largura útil de conteúdo
- Tabela de **uma única coluna e uma única linha**
- `tblPr` com `<w:shd w:val="clear" w:color="auto" w:fill="000000"/>`
- `tcPr` com mesmo `<w:shd>` aplicado à célula
- Margens da célula (`tcMar`): top=80, bottom=80, left=120, right=120 (para garantir respiro nas bordas e impedir que o texto encoste em margens dos sistemas eletrônicos)
- Sem bordas explícitas
- `tblLook w:val="04A0" w:firstRow="1"`

**Conteúdo da célula.**

- Parágrafo com `spacing after="0" line="240" lineRule="auto"` e `jc="both"`
- Fonte: **Bookman Old Style 12pt** (sz=24)
- **Negrito** ativado
- **Cor branca explícita** (`<w:color w:val="FFFFFF"/>`) para garantir contraste em todos os renderizadores
- Texto no formato "N. TÍTULO" (número arábico, ponto, espaço, título em caixa alta)
- Subtítulos seguem o formato "N.N. SUBTÍTULO" (numeração hierárquica, ex. "3.1.")

**Exemplos reais do escritório.**

- `1. DOS FATOS`
- `2. DO CERCEAMENTO DE DEFESA PELO INDEFERIMENTO DE ESCLARECIMENTOS DA AVALIAÇÃO SOCIAL`
- `3. DO MÉRITO`
- `3.1. DA IMPUGNAÇÃO OBJETIVA DA PONTUAÇÃO ATRIBUÍDA PELO PERITO MÉDICO`
- `4. DA REAFIRMAÇÃO DA DER`
- `5. DOS PEDIDOS`

**Regra de títulos persuasivos.** O título de seção funciona como antecipação do argumento, não como rótulo burocrático. O julgador que lê apenas os títulos pretos já forma juízo da tese. Sempre que houver elementos fáticos disponíveis, o título incorpora a conclusão antecipada.

- Em vez de "2. DA INCAPACIDADE", usar "2. DA INCAPACIDADE TOTAL E PERMANENTE COMPROVADA DESDE MARÇO DE 2024"
- Em vez de "2. DO TEMPO ESPECIAL", usar "2. DA EXPOSIÇÃO HABITUAL E PERMANENTE A RUÍDO DE 89 dB(A) NO PERÍODO DE 2005 A 2023"
- Em vez de "2. DA QUALIDADE DE SEGURADO", usar "2. DA QUALIDADE DE SEGURADO MANTIDA PELO PERÍODO DE GRAÇA ATÉ A DATA DO ÓBITO"

O título genérico fica reservado para situações em que não houver elementos fáticos suficientes para antecipação (raro em peças bem instruídas).

### Fechamento e Assinatura

- "Pede deferimento." ou "Nestes Termos, Pede e Espera Deferimento."
- Local e data: "Monte Alto – SP, [data por extenso]." A unidade federativa é OBRIGATÓRIA, no mesmo padrão do rodapé timbrado e da carta de retificação de PPP, com travessão curto. Exemplo, "Monte Alto – SP, 10 de setembro de 2026."
- Assinatura centralizada, com espaçamento maior antes (line break ou parágrafo vazio):
  - **PAULO ROBERTO TERCINI FILHO** (Bookman Old Style 12pt, negrito, caixa alta, centralizado)
  - **OAB/SP 331.110** (Bookman Old Style 12pt, negrito, centralizado)

### Peças com Duas Partes (Petição de Encaminhamento + Razões)

Recurso Inominado, Pedido de Uniformização à TNU, Agravo Interno e Recurso Especial ao CRPS possuem duas partes na mesma peça.

1. **Petição de encaminhamento** dirigida ao juízo ou presidente do órgão, com identificação das partes, fundamentação do cabimento e pedido de remessa. Termina com assinatura
2. Quebra de página
3. **Razões recursais** com cabeçalho próprio centralizado em caixa alta espaçada (ex. "E G R É G I A   T U R M A   R E C U R S A L" ou "COLENDA TURMA / EMÉRITOS JULGADORES"), identificação das partes (Recorrente/Apelante/Agravante e Recorrido/Apelado/Agravado) e desenvolvimento da fundamentação com os títulos pretos numerados

---


## Implementação Técnica em docx-js

A geração do .docx usa o pacote npm `docx`. Os blocos abaixo são as referências canônicas de implementação dos elementos visuais. Use-os como base e adapte ao caso concreto.

### Setup Básico

```javascript
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, BorderStyle, WidthType,
  ShadingType, HeightRule, PageBreak, HeaderReferenceType, FooterReferenceType
} = require('docx');
```

### Estilos Default

```javascript
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Bookman Old Style", size: 24 }, // 12pt
        paragraph: {
          spacing: { before: 0, after: 0, line: 360, lineRule: "auto" },
          alignment: AlignmentType.JUSTIFIED
        }
      }
    }
  },
  sections: [/* ... */]
});
```

**Regra crítica de spacing.** O estilo default declara `before: 0, after: 0`. Cada parágrafo que precisar de respiro entre o próximo declara o `after` explicitamente. Esse padrão evita que parágrafos vazios criados para espaçamento entre tabelas e títulos acumulem 12pt antes + 12pt depois herdados, e dá controle total sobre o ritmo visual da peça.

**Parágrafos de texto corrido do corpo (endereçamento, número do processo, qualificação, fundamentação, pedidos)**: declarar `spacing: { before: 0, after: 240, line: 360, lineRule: "auto" }`. Os 12pt depois (240 twips) criam o respiro entre parágrafos sem acumular com o próximo.

**Parágrafos vazios de espaçamento visual** (entre tabela e título, entre seções): declarar `spacing: { before: 0, after: 0 }`. Use o helper abaixo.

**Parágrafos dentro de células de tabela Visual Law**: `spacing: { before: 0, after: 0, line: 240, lineRule: "auto" }`. Já forçado nos helpers `cabecalhoPreto` e `celulaCorpo`.

```javascript
function parVazio() {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: "" })]
  });
}

function parCorpo(opts) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 240, line: 360, lineRule: "auto" },
    indent: { firstLine: opts.indent || 1134 }, // 2 cm judicial, 2268 = 4 cm CRPS
    children: opts.children
  });
}
```

### Seção com Página A4 e Margens do Escritório

```javascript
{
  properties: {
    page: {
      size: { width: 11907, height: 16838 }, // A4
      margin: {
        top: 851, right: 1134, bottom: 1134, left: 1560,
        header: 720, footer: 720
      }
    },
    titlePage: true // ativa header/footer próprios na primeira página
  },
  headers: {
    first: new Header({ children: [/* header timbrado */] }),
    default: new Header({ children: [new Paragraph({})] }) // vazio
  },
  footers: {
    first: new Footer({ children: [/* footer endereço */] }),
    default: new Footer({ children: [new Paragraph({})] }) // vazio, sem número de página
  },
  children: [/* corpo da petição */]
}
```

### Header da Primeira Página (timbre)

**Importante.** Todos os parágrafos do header e do footer devem ter `spacing: { before: 0, after: 0, line: 240, lineRule: ... }` explícito. Sem isso, o estilo default do documento (com `before: 240, after: 240, line: 360`) sobrepõe e empurra o bloco do timbre para baixo, descolando "ADVOCACIA" de "PREVIDENCIÁRIA" e separando as linhas de identificação. Use `lineRule: "auto"` para os parágrafos do nome do escritório e `lineRule: "exact"` para "DR. PAULO ROBERTO TERCINI FILHO" e "OAB/SP 331.110", reproduzindo o padrão XML original.

```javascript
const logoBuffer = fs.readFileSync(path.join(__dirname, 'assets', 'logo.jpg'));

const headerFirst = new Header({
  children: [
    new Table({
      width: { size: 9288, type: WidthType.DXA },
      columnWidths: [1668, 7620],
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          height: { value: 993, rule: HeightRule.ATLEAST },
          children: [
            new TableCell({
              width: { size: 1668, type: WidthType.DXA },
              borders: noBorders(),
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new ImageRun({
                      data: logoBuffer,
                      type: "jpg",
                      transformation: { width: 83, height: 75 } // ≈ 791210x712470 EMU
                    })
                  ]
                })
              ]
            }),
            new TableCell({
              width: { size: 7620, type: WidthType.DXA },
              borders: noBorders(),
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
                  children: [new TextRun({ text: "", font: "Bell MT", size: 16 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
                  children: [new TextRun({
                    text: "ADVOCACIA PREVIDENCIÁRIA",
                    font: "Bell MT", bold: true, size: 48
                  })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 240, lineRule: "exact" },
                  children: [new TextRun({
                    text: "DR. PAULO ROBERTO TERCINI FILHO",
                    font: "Arial Unicode MS"
                  })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 240, lineRule: "exact" },
                  children: [new TextRun({
                    text: "OAB/SP 331.110",
                    font: "Arial Unicode MS"
                  })]
                })
              ]
            })
          ]
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto", space: 1 } }
    })
  ]
});

function noBorders() {
  return {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE }
  };
}
```

### Footer da Primeira Página (endereço)

```javascript
const footerFirst = new Footer({
  children: [
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto", space: 1 } }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
      children: [new TextRun({
        text: "Rua Rui Barbosa, nº. 663, Centro, Monte Alto – SP",
        font: "Arial Unicode MS"
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
      children: [new TextRun({
        text: "Tel: 16-3242-2908 – Cel: 16-98140-9271",
        font: "Arial Unicode MS"
      })]
    })
  ]
});
```

### Título de Seção (tabela preta)

Função utilitária para gerar o título preto padrão do escritório.

```javascript
function tituloSecaoPreto(numero, texto) {
  return new Table({
    width: { size: 9214, type: WidthType.DXA },
    columnWidths: [9214],
    shading: { type: ShadingType.CLEAR, fill: "000000", color: "auto" },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9214, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: "000000", color: "auto" },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                spacing: { after: 0, line: 240, lineRule: "auto" },
                alignment: AlignmentType.JUSTIFIED,
                children: [
                  new TextRun({
                    text: `${numero}. `,
                    font: "Bookman Old Style", size: 24, bold: true, color: "FFFFFF"
                  }),
                  new TextRun({
                    text: texto.toUpperCase(),
                    font: "Bookman Old Style", size: 24, bold: true, color: "FFFFFF"
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// Uso: tituloSecaoPreto("3.1", "Da Impugnação Objetiva da Pontuação")
```

### Visual Law — Cabeçalho de Tabela Preto

Helper para cabeçalho preto em qualquer tabela Visual Law. Bordas e alinhamento vertical são definidos em cada célula para garantir renderização idêntica no Microsoft Word e no LibreOffice.

```javascript
function cabecalhoPreto(textos, larguras) {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  return new TableRow({
    tableHeader: true,
    children: textos.map((t, i) => new TableCell({
      width: { size: larguras[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: "000000", color: "auto" },
      borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
      verticalAlign: "center",
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
        children: [new TextRun({
          text: t, bold: true, color: "FFFFFF",
          font: "Bookman Old Style", size: 20 // 10pt
        })]
      })]
    }))
  });
}
```

### Visual Law — Célula de Corpo com Zebra

```javascript
function celulaCorpo(texto, largura, opts = {}) {
  const runs = Array.isArray(texto) ? texto : [{ text: texto, bold: opts.bold || false }];
  const hMargin = opts.tightMargin ? 40 : 80;
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  return new TableCell({
    width: { size: largura, type: WidthType.DXA },
    shading: opts.zebra
      ? { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" }
      : undefined,
    borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
    verticalAlign: "center",
    margins: { top: 40, bottom: 40, left: hMargin, right: hMargin },
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
      children: runs.map(r => new TextRun({
        text: r.text,
        font: "Bookman Old Style",
        size: opts.size || 20, // 10pt default no corpo das tabelas
        bold: r.bold || false,
        italics: r.italic || false
      }))
    })]
  });
}
```

A fonte do corpo das tabelas é 10pt (size 20), menor do que os 12pt do texto corrido da petição. Isso diferencia tabela de texto e permite mais informação por linha. Margens internas de 40 (vertical) e 80 (horizontal) twips mantêm tudo enxuto sem perda de legibilidade. O parágrafo dentro da célula força `before=0, after=0, line=240` para impedir herança do estilo default do documento, que descolaria as linhas. As bordas são declaradas em cada célula individualmente (não apenas no `tblBorders` da tabela mãe), garantindo renderização consistente entre Microsoft Word e LibreOffice em tabelas de 4 ou mais colunas. O `verticalAlign: "center"` em cada célula evita que conteúdo curto fique colado no topo quando conteúdo longo na linha empurra a altura para cima.

### Validação Final

Após gerar o buffer com `Packer.toBuffer(doc)`, salvar em `/mnt/user-data/outputs/`, validar com o script padrão de docx e entregar via `present_files`.

```bash
python /mnt/skills/public/docx/scripts/office/validate.py /mnt/user-data/outputs/peticao.docx
```

---

## Logo do Escritório

O logo do escritório deve estar disponível no ambiente de geração. Se não estiver acessível, gerar a petição sem logo e alertar o usuário ao final do output para que ele insira manualmente. Padrão de localização recomendado: `assets/logo-tercini.jpg` no diretório de trabalho.

Dimensões do logo no header (EMU): cx=791210, cy=712470. Em pixels a 96 DPI, aproximadamente 83×75. O parâmetro `transformation: { width: 83, height: 75 }` no `ImageRun` reproduz fielmente o tamanho original.

---


## Trava do cabeçalho, logo com fundo branco (Onda 116)

ANTES de gerar qualquer .docx, verificar o arquivo `logo-tercini.PNG` na pasta de assets. Ele DEVE estar em modo RGB, sem canal alfa, com os quatro cantos em branco puro 255,255,255.

Logo com transparência é PROIBIDA no cabeçalho, porque o arquivo do escritório carrega, sob o canal alfa, o padrão xadrez do editor de imagem, que reaparece na conversão para PDF, no PJe e na impressão. Verificação e correção em `base-peticao-previdenciaria-padrao-visual/assets/README-LOGO.md`.

Falhando a verificação, NÃO gerar a peça. Refazer o achatamento sobre branco primeiro.

## Logo do Escritório

### Caminhos de Busca (Atualizado Onda 69 - v1.59.0)

REGRA DE OURO. O ambiente de execução decide o caminho. A skill geradora resolve as bases DINAMICAMENTE nesta ordem e usa o primeiro arquivo encontrado.

**Bloco 1 - Sandbox Cowork/Claude (Linux). SEMPRE testado primeiro.**

1. `<raiz da sessão derivada de process.cwd()>/mnt/INSS/assets/logo-tercini.(png|PNG|jpg|JPG|jpeg|JPEG)`. A raiz é extraída do padrão `/sessions/<nome-da-sessao>` do diretório de trabalho atual. O `<nome-da-sessao>` MUDA a cada sessão do Cowork, por isso o caminho NUNCA deve ser fixado literalmente.
2. Glob defensivo em `/sessions/*/mnt/INSS/assets/` para qualquer sessão montada.

**Bloco 2 - Windows local do escritório.**

3. `C:\Users\VAIO\INSS\assets\logo-tercini.(png|jpg|jpeg)` e `logo.(png|jpg|jpeg)`.

**Bloco 3 - Relativos.**

4. `<diretório da skill>/assets/` e `./assets/` com os mesmos nomes.

Em Python (geração via skill docx), aplicar a mesma lógica com `os.getcwd()`, `re.match(r'^(/sessions/[^/]+)', cwd)` e `glob.glob('/sessions/*/mnt/INSS/assets/logo*')`.

### Suporte a Formato

A implementação detecta automaticamente o formato pela extensão, testada em ambas as caixas (`.png`, `.PNG`, `.jpg`, `.JPG`, `.jpeg`, `.JPEG`). O arquivo real do escritório chama-se `logo-tercini.PNG` (extensão MAIÚSCULA). O parâmetro `type` do `ImageRun` é definido dinamicamente conforme o arquivo encontrado.

### Logo Ausente é ERRO BLOQUEANTE (Onda 69)

Comportamento anterior (até v1.58.0). Logo ausente gerava apenas um `console.warn` e a petição saía SEM timbre. Esse era o principal motivo de cabeçalho incorreto, porque no sandbox do Cowork os caminhos Windows nunca existem e o alerta passava despercebido.

Comportamento atual. Logo ausente INTERROMPE a geração com `throw new Error('[BLOQUEANTE] ...')`. A peça sem timbre não é entregue. O Claude deve então localizar o logo (`find /sessions -iname 'logo-tercini*' 2>/dev/null`), confirmar o mount da pasta INSS e regenerar.

### Dimensões (atualizado Onda 69)

As dimensões são calculadas DINAMICAMENTE preservando o aspect ratio do arquivo real.

Comportamento.
- PNG. A função `calcularDimensoesLogo` lê os bytes 16-23 do cabeçalho para obter width/height nativos.
- JPEG. Leitura implementada na Onda 69 pelos SOF markers (C0-CF, exceto C4, C8, CC), extraindo height/width dos bytes 5-8 do segmento.
- Fixa altura em **75 px** (padrão do layout do header).
- Calcula largura proporcional. `Math.round(75 × larguraReal / alturaReal)`.
- Fallback para **96×75** (proporção 1,278 do logo real 538×421) SOMENTE se a leitura binária falhar. O fallback antigo de 83×75 DISTORCIA o logo e foi eliminado.

**Exemplos práticos.**

| Logo real | Proporção | Width calculado | Height final |
|-----------|-----------|-----------------|--------------|
| 538×421 px (atual) | 1.278 | 96 px | 75 px |
| 512×512 px | 1.000 | 75 px | 75 px |
| 400×300 px | 1.333 | 100 px | 75 px |
| 600×450 px | 1.333 | 100 px | 75 px |

### Verificação Obrigatória do Cabeçalho Pós-Geração (Onda 69)

Antes de entregar QUALQUER petição, executar as três checagens no .docx gerado. O .docx é um ZIP.

```bash
# 1. O logo está embarcado? Deve listar ao menos um arquivo em word/media/.
unzip -l peticao.docx | grep -i "word/media" || echo "[FALHA] SEM LOGO NO DOCX"

# 2. O timbre textual está no header? Deve encontrar ADVOCACIA.
unzip -p peticao.docx word/header1.xml word/header2.xml word/header3.xml 2>/dev/null | grep -c "ADVOCACIA" || echo "[FALHA] SEM TIMBRE TEXTUAL"

# 3. A âncora do titlePage existe? Deve encontrar titlePg no sectPr.
unzip -p peticao.docx word/document.xml | grep -c "titlePg" || echo "[FALHA] SEM titlePage - header da 1a pagina nao sera diferenciado"
```

Se qualquer checagem falhar, NÃO entregar. Diagnosticar, corrigir e regenerar. Registrar no relatório de revisão da peça (`base-revisao-peticao-aprofundada`) a linha "Cabeçalho verificado. Logo embarcado, timbre presente, titlePage ativo."

Armadilha conhecida do docx-js. Sem `titlePage: true` nas properties da seção, o `headers.first` é ignorado e o Word usa o `default` (vazio) em todas as páginas. Sem `spacing` explícito zerado nos parágrafos do header, o estilo default (before/after 240, line 360) desloca o timbre. Ver seção Header da Primeira Página.

### Característica Visual do Logo

O logo do escritório consiste em duas formas triangulares em tons de cinza (claro e escuro) sobrepostas em uma curva vermelha estilizando uma balança da justiça. PNG com fundo transparente para integração com cabeçalho timbrado.

### Documentação Completa

Ver `assets/README-LOGO.md` na pasta da skill para o procedimento completo de configuração e troubleshooting do logo.

---

## Logo do Escritório

### Caminhos de Busca (Atualizado Onda 69 - v1.59.0)

REGRA DE OURO. O ambiente de execução decide o caminho. A skill geradora resolve as bases DINAMICAMENTE nesta ordem e usa o primeiro arquivo encontrado.

**Bloco 1 - Sandbox Cowork/Claude (Linux). SEMPRE testado primeiro.**

1. `<raiz da sessão derivada de process.cwd()>/mnt/INSS/assets/logo-tercini.(png|PNG|jpg|JPG|jpeg|JPEG)`. A raiz é extraída do padrão `/sessions/<nome-da-sessao>` do diretório de trabalho atual. O `<nome-da-sessao>` MUDA a cada sessão do Cowork, por isso o caminho NUNCA deve ser fixado literalmente.
2. Glob defensivo em `/sessions/*/mnt/INSS/assets/` para qualquer sessão montada.

**Bloco 2 - Windows local do escritório.**

3. `C:\Users\VAIO\INSS\assets\logo-tercini.(png|jpg|jpeg)` e `logo.(png|jpg|jpeg)`.

**Bloco 3 - Relativos.**

4. `<diretório da skill>/assets/` e `./assets/` com os mesmos nomes.

Em Python (geração via skill docx), aplicar a mesma lógica com `os.getcwd()`, `re.match(r'^(/sessions/[^/]+)', cwd)` e `glob.glob('/sessions/*/mnt/INSS/assets/logo*')`.

### Suporte a Formato

A implementação detecta automaticamente o formato pela extensão, testada em ambas as caixas (`.png`, `.PNG`, `.jpg`, `.JPG`, `.jpeg`, `.JPEG`). O arquivo real do escritório chama-se `logo-tercini.PNG` (extensão MAIÚSCULA). O parâmetro `type` do `ImageRun` é definido dinamicamente conforme o arquivo encontrado.

### Logo Ausente é ERRO BLOQUEANTE (Onda 69)

Comportamento anterior (até v1.58.0). Logo ausente gerava apenas um `console.warn` e a petição saía SEM timbre. Esse era o principal motivo de cabeçalho incorreto, porque no sandbox do Cowork os caminhos Windows nunca existem e o alerta passava despercebido.

Comportamento atual. Logo ausente INTERROMPE a geração com `throw new Error('[BLOQUEANTE] ...')`. A peça sem timbre não é entregue. O Claude deve então localizar o logo (`find /sessions -iname 'logo-tercini*' 2>/dev/null`), confirmar o mount da pasta INSS e regenerar.

### Dimensões (atualizado Onda 69)

As dimensões são calculadas DINAMICAMENTE preservando o aspect ratio do arquivo real.

Comportamento.
- PNG. A função `calcularDimensoesLogo` lê os bytes 16-23 do cabeçalho para obter width/height nativos.
- JPEG. Leitura implementada na Onda 69 pelos SOF markers (C0-CF, exceto C4, C8, CC), extraindo height/width dos bytes 5-8 do segmento.
- Fixa altura em **75 px** (padrão do layout do header).
- Calcula largura proporcional. `Math.round(75 × larguraReal / alturaReal)`.
- Fallback para **96×75** (proporção 1,278 do logo real 538×421) SOMENTE se a leitura binária falhar. O fallback antigo de 83×75 DISTORCIA o logo e foi eliminado.

**Exemplos práticos.**

| Logo real | Proporção | Width calculado | Height final |
|-----------|-----------|-----------------|--------------|
| 538×421 px (atual) | 1.278 | 96 px | 75 px |
| 512×512 px | 1.000 | 75 px | 75 px |
| 400×300 px | 1.333 | 100 px | 75 px |
| 600×450 px | 1.333 | 100 px | 75 px |

### Verificação Obrigatória do Cabeçalho Pós-Geração (Onda 69)

Antes de entregar QUALQUER petição, executar as três checagens no .docx gerado. O .docx é um ZIP.

```bash
# 1. O logo está embarcado? Deve listar ao menos um arquivo em word/media/.
unzip -l peticao.docx | grep -i "word/media" || echo "[FALHA] SEM LOGO NO DOCX"

# 2. O timbre textual está no header? Deve encontrar ADVOCACIA.
unzip -p peticao.docx word/header1.xml word/header2.xml word/header3.xml 2>/dev/null | grep -c "ADVOCACIA" || echo "[FALHA] SEM TIMBRE TEXTUAL"

# 3. A âncora do titlePage existe? Deve encontrar titlePg no sectPr.
unzip -p peticao.docx word/document.xml | grep -c "titlePg" || echo "[FALHA] SEM titlePage - header da 1a pagina nao sera diferenciado"
```

Se qualquer checagem falhar, NÃO entregar. Diagnosticar, corrigir e regenerar. Registrar no relatório de revisão da peça (`base-revisao-peticao-aprofundada`) a linha "Cabeçalho verificado. Logo embarcado, timbre presente, titlePage ativo."

Armadilha conhecida do docx-js. Sem `titlePage: true` nas properties da seção, o `headers.first` é ignorado e o Word usa o `default` (vazio) em todas as páginas. Sem `spacing` explícito zerado nos parágrafos do header, o estilo default (before/after 240, line 360) desloca o timbre. Ver seção Header da Primeira Página.

### Característica Visual do Logo

O logo do escritório consiste em duas formas triangulares em tons de cinza (claro e escuro) sobrepostas em uma curva vermelha estilizando uma balança da justiça. PNG com fundo transparente para integração com cabeçalho timbrado.

### Documentação Completa

Ver `assets/README-LOGO.md` na pasta da skill para o procedimento completo de configuração e troubleshooting do logo.

---

