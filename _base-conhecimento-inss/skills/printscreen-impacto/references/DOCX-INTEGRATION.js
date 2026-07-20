/**
 * DOCX-INTEGRATION.js — Inserção de Printscreens de Impacto no .docx
 * Componente Visual Law #5
 * Escritório Advocacia Previdenciária Dr. Paulo Roberto Tercini Filho
 * OAB/SP 331.110
 *
 * Função principal: printscreenImpacto()
 * Retorna array de elementos docx-js para inserção no contentChildren da petição.
 *
 * Compatível com TEMPLATE.js e VISUAL-LAW.js da skill peticao-previdenciaria.
 * Dependência: mesmo pacote "docx" já utilizado no template.
 *
 * USO:
 *   const elementos = printscreenImpacto(imageBuffer, "png", 560, 420,
 *     "Printscreen de Impacto — PPP Metalúrgica (Doc. ID 04, Evento 1, PROCADM4)."
 *   );
 *   // Inserir 'elementos' no array contentChildren da petição,
 *   // após o parágrafo introdutório e antes do parágrafo argumentativo.
 */

const {
  Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, BorderStyle, WidthType, ShadingType,
} = require("docx");

// ── Constantes ──

const PI = {
  FONT: "Bookman Old Style",
  FONT_SIZE_CAPTION: 18,       // 9pt para legenda
  CAPTION_COLOR: "666666",     // Cinza
  CAPTION_BG: "F5F5F5",        // Cinza claro para fundo da legenda
  IMAGE_BORDER_COLOR: "BDBDBD", // Cinza para borda da imagem
  IMAGE_BORDER_SIZE: 4,
};

// Largura da área de conteúdo (A4 com margens padrão do escritório)
// PAGE_WIDTH (11906) - MARGIN_LEFT (1418) - MARGIN_RIGHT (1418) = 9070
const CONTENT_WIDTH = 9070;
const IMAGE_COL_WIDTH = Math.round(CONTENT_WIDTH * 0.95); // 8617

// ── Helpers ──

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

const imgBorder = {
  style: BorderStyle.SINGLE,
  size: PI.IMAGE_BORDER_SIZE,
  color: PI.IMAGE_BORDER_COLOR,
};
const imgBorders = { top: imgBorder, bottom: imgBorder, left: imgBorder, right: imgBorder };

// ── Função principal ──

/**
 * Gera elementos docx-js para inserir um printscreen de impacto na petição.
 *
 * @param {Buffer} imageBuffer - Buffer da imagem processada (PNG ou JPEG)
 * @param {string} imageType - Tipo da imagem ("png" ou "jpg")
 * @param {number} widthPts - Largura da imagem em pontos (calcular com get_image_dimensions_for_docx)
 * @param {number} heightPts - Altura da imagem em pontos
 * @param {string} captionText - Texto da legenda com referência ao Doc. ID
 * @returns {Array} Array com [Table] para inserção no contentChildren
 *
 * @example
 * const fs = require("fs");
 * const imgBuf = fs.readFileSync("/tmp/ppp_printscreen.png");
 * const elementos = printscreenImpacto(imgBuf, "png", 560, 420,
 *   "Printscreen de Impacto — PPP Metalúrgica Exemplo S/A " +
 *   "(Doc. ID 04, Evento 1, PROCADM4). Destaque vermelho no campo 15.3 " +
 *   "indica intensidade acima do limite de tolerância."
 * );
 * // Inserir no array children da seção:
 * // ...parágrafos anteriores,
 * // ...elementos,  (spread operator)
 * // ...parágrafos seguintes
 */
function printscreenImpacto(imageBuffer, imageType, widthPts, heightPts, captionText) {
  const table = new Table({
    width: { size: IMAGE_COL_WIDTH, type: WidthType.DXA },
    columnWidths: [IMAGE_COL_WIDTH],
    rows: [
      // Linha 1: Imagem com borda sutil
      new TableRow({
        children: [
          new TableCell({
            borders: imgBorders,
            width: { size: IMAGE_COL_WIDTH, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    type: imageType,
                    transformation: {
                      width: widthPts,
                      height: heightPts,
                    },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Linha 2: Legenda
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: IMAGE_COL_WIDTH, type: WidthType.DXA },
            margins: { top: 40, bottom: 80, left: 120, right: 120 },
            shading: { fill: PI.CAPTION_BG, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0, line: 276 },
                children: [
                  new TextRun({
                    text: captionText,
                    italic: true,
                    size: PI.FONT_SIZE_CAPTION,
                    font: PI.FONT,
                    color: PI.CAPTION_COLOR,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return [table];
}

// ── Variante: Printscreen com tabela-resumo lateral ──

/**
 * Gera printscreen com tabela-resumo à direita (layout side-by-side).
 * Útil quando o documento é estreito e sobra espaço para dados tabulados.
 *
 * @param {Buffer} imageBuffer - Buffer da imagem processada
 * @param {string} imageType - Tipo da imagem
 * @param {number} widthPts - Largura da imagem em pontos
 * @param {number} heightPts - Altura da imagem em pontos
 * @param {string} captionText - Texto da legenda
 * @param {Array} summaryRows - Array de {label, value} para tabela-resumo
 * @returns {Array} Array com [Table] para inserção no contentChildren
 *
 * @example
 * const elementos = printscreenComResumo(imgBuf, "png", 350, 420,
 *   "PPP — Doc. ID 04",
 *   [
 *     { label: "Agente", value: "Ruído" },
 *     { label: "Intensidade", value: "92,3 dB(A)" },
 *     { label: "Limite NR-15", value: "85 dB(A)" },
 *     { label: "EPI eficaz", value: "Não comprovada" },
 *     { label: "Enquadramento", value: "Código 2.0.1" },
 *   ]
 * );
 */
function printscreenComResumo(imageBuffer, imageType, widthPts, heightPts, captionText, summaryRows) {
  const imgColWidth = Math.round(CONTENT_WIDTH * 0.60);
  const summaryColWidth = CONTENT_WIDTH - imgColWidth;

  const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: "BDBDBD" };
  const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

  // Tabela-resumo como conteúdo da célula direita
  const summaryTable = new Table({
    width: { size: summaryColWidth - 200, type: WidthType.DXA },
    columnWidths: [Math.round((summaryColWidth - 200) * 0.4), Math.round((summaryColWidth - 200) * 0.6)],
    rows: [
      // Cabeçalho
      new TableRow({
        children: [
          new TableCell({
            borders: thinBorders,
            columnSpan: 2,
            width: { size: summaryColWidth - 200, type: WidthType.DXA },
            shading: { fill: "2E4057", type: ShadingType.CLEAR },
            margins: { top: 40, bottom: 40, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: "DADOS DO DOCUMENTO", bold: true, size: 18, font: PI.FONT, color: "FFFFFF" }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Linhas de dados
      ...summaryRows.map((row, i) =>
        new TableRow({
          children: [
            new TableCell({
              borders: thinBorders,
              width: { size: Math.round((summaryColWidth - 200) * 0.4), type: WidthType.DXA },
              shading: { fill: i % 2 === 0 ? "F5F5F5" : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 30, bottom: 30, left: 80, right: 40 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: row.label, bold: true, size: 18, font: PI.FONT })],
                }),
              ],
            }),
            new TableCell({
              borders: thinBorders,
              width: { size: Math.round((summaryColWidth - 200) * 0.6), type: WidthType.DXA },
              shading: { fill: i % 2 === 0 ? "F5F5F5" : "FFFFFF", type: ShadingType.CLEAR },
              margins: { top: 30, bottom: 30, left: 80, right: 80 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: row.value, size: 18, font: PI.FONT })],
                }),
              ],
            }),
          ],
        })
      ),
    ],
  });

  const mainTable = new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [imgColWidth, summaryColWidth],
    rows: [
      new TableRow({
        children: [
          // Coluna esquerda: imagem
          new TableCell({
            borders: imgBorders,
            width: { size: imgColWidth, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    type: imageType,
                    transformation: { width: widthPts, height: heightPts },
                  }),
                ],
              }),
            ],
          }),
          // Coluna direita: tabela-resumo
          new TableCell({
            borders: noBorders,
            width: { size: summaryColWidth, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 120, right: 60 },
            children: [summaryTable],
          }),
        ],
      }),
      // Legenda (full span)
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            columnSpan: 2,
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            margins: { top: 40, bottom: 80, left: 120, right: 120 },
            shading: { fill: PI.CAPTION_BG, type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 0, after: 0, line: 276 },
                children: [
                  new TextRun({
                    text: captionText,
                    italic: true,
                    size: PI.FONT_SIZE_CAPTION,
                    font: PI.FONT,
                    color: PI.CAPTION_COLOR,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return [mainTable];
}

// ── Exportação ──
module.exports = { printscreenImpacto, printscreenComResumo };
