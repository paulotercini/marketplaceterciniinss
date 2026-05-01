# Plugin base-conhecimento-inss

Base de conhecimento previdenciário do escritório Paulo Roberto Tercini Filho (OAB/SP 331.110), organizada em skills temáticas por benefício, pressuposto de manutenção, tema processual e tese de defesa.

## Filosofia

Este plugin é uma camada de referência. Não substitui skills operacionais como `peticao-previdenciaria`, `auditoria-ppp`, `auditoria-laudo-pericial`, `revisao-peticao`, `precedentes-previdenciarios`. Ele fornece profundidade temática verificada, com enfoque exclusivo na defesa do segurado, a ser combinada com as skills de execução já existentes.

Toda afirmação normativa ou jurisprudencial foi verificada em fonte primária oficial. Insights extraídos de redes sociais serviram como insumo de pauta, nunca como fonte.

## Estrutura

```
base-conhecimento-inss/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── base-especial-ruido/
│   │   ├── SKILL.md
│   │   └── references/
│   ├── base-especial-epi/
│   ├── base-especial-agentes-quimicos/
│   └── ...
└── scripts/
    └── ingest-tema.sh
```

## Governança editorial

Cada skill observa os princípios a seguir.

Primeiro, ausência absoluta de dois-pontos como separador lógico, em conformidade com o padrão do escritório.

Segundo, hierarquia normativa rigorosa, começando pela Constituição Federal, passando por leis complementares, leis ordinárias, decretos, IN 128/2022, portarias, enunciados do CRPS e orientações internas do INSS.

Terceiro, jurisprudência apenas após checagem em fonte primária oficial com link, e apenas quando apoiar a tese do segurado.

Quarto, honestidade radical ao sinalizar controvérsia, ausência de precedente ou posição minoritária.

Quinto, teses sempre posicionadas a favor do segurado, jamais da Fazenda ou da autarquia.

## Fluxo de ingestão

O script `scripts/ingest-tema.sh` automatiza o processamento dos ZIPs temáticos.

1. Descompactação do ZIP em pasta de trabalho
2. OCR em português de todas as imagens com Tesseract
3. Consolidação em arquivo `_ocr_bruto.txt`
4. Triagem manual ou assistida das teses e referências
5. Validação em fonte primária de cada alegação relevante
6. Redação do `SKILL.md` e dos `references/*.md`
7. Destruição do material bruto após consolidação
