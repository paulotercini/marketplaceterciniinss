---
name: base-servico-militar-obrigatorio
description: "Cômputo do tempo de serviço militar obrigatório como tempo de contribuição e contagem recíproca. Use SEMPRE que mencionar tempo militar, serviço militar obrigatório, caserna, tiro de guerra, Exército, Marinha, Aeronáutica, Lei 4.375/1964, art. 55 I Lei 8.213/91, certidão de tempo de serviço militar, cômputo militar RGPS, militar temporário, soldado, marinheiro, aprendiz de marinheiro, Colégio Militar, ESPCEX, reservista, certificado de dispensa de incorporação, certidão de reservista, prorrogação engajamento, período de graça militar, tempo militar carência, contagem recíproca militar RPPS, art. 201 §9º CF, Decreto 3.048/1999, militar desvinculado, baixa sem CTC, Portaria 990/2022, Portaria 1.316/2025. Cruza com base-cnis-acerto-indicadores, base-documentos-comprobatorios-in128, peticao-previdenciaria, base-contagem-reciproca-rgps-rpps e precedentes-previdenciarios."
---

# Tempo de Serviço Militar

Cenários e documentos em `references/FUNDAMENTOS-E-CENARIOS.md`; refutação às teses do INSS em `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Base normativa

- CF, art. 143 (serviço militar obrigatório) e art. 201, §9º (contagem recíproca).
- Lei 8.213/91, art. 55, I: conta como tempo de serviço "o tempo de serviço militar, inclusive o voluntário, e o previsto no § 1º do art. 143 da Constituição Federal, ainda que anterior à filiação ao Regime Geral de Previdência Social, desde que não tenha sido contado para inatividade remunerada nas Forças Armadas ou aposentadoria no serviço público".
- Decreto 3.048/99, art. 188-G, I: tempo militar obrigatório, voluntário ou alternativo conta até 13/11/2019, salvo se já usado para inatividade ou aposentadoria no serviço público.
- IN 128/2022, art. 217, I e parágrafo único: até 13/11/2019, o tempo militar certificado por autoridade competente conta; período inferior a 18 meses, comprovado pelo certificado de reservista, conta de data a data.
- IN 128/2022, art. 218, II (redação IN 188/2025): a partir de 14/11/2019, o tempo militar exige Certidão de Tempo de Serviço Militar, na forma da contagem recíproca.
- Lei 8.213/91, art. 15, V: qualidade de segurado até 3 meses após o licenciamento do incorporado.
- Lei 4.375/1964 (Lei do Serviço Militar) e Decreto 57.654/1966 (regulamento): Tiro de Guerra é forma de prestação do serviço militar inicial.

## Carência

- IN 128/2022, art. 194, I: o INSS não computa o tempo militar como carência, salvo o serviço obrigatório posterior a 13/11/2019 certificado por Certidão de Tempo de Serviço Militar (§1º, redação IN 188/2025).
- Tese do segurado: a TNU tem precedente pelo cômputo do serviço militar como carência (PEDILEF 0527059-78.2017.4.05.8100/CE, citado no PUIL 5000929-60.2024.4.04.7015) [NÃO CONFIRMADO: ler o inteiro teor e a data]. O TRF4 averba o serviço militar obrigatório inclusive para carência, como registra o PUIL 5002454-05.2023.4.04.7115 (TNU, 18/11/2025).

## Limites jurisprudenciais

- PUIL 5000929-60.2024.4.04.7015 (TNU, 14/08/2026), adverso: o militar temporário não se filia automaticamente ao RGPS; o período de graça do art. 15, V, pressupõe filiação anterior ao RGPS.
- PUIL 5086191-22.2022.4.02.5101 (TNU, 14/08/2026), adverso: não há conversão de tempo especial prestado como militar das Forças Armadas.
- PUIL 5002454-05.2023.4.04.7115 (TNU, 18/11/2025), favorável: o tempo militar antigo observa o tempus regit actum, com distinção da regra geral que exige CTC.

## Defesa do segurado, em ordem

1. Reunir certificado de reservista, certidão de tempo de serviço militar da Força (com datas de incorporação e licenciamento) e, no período posterior a 13/11/2019, a Certidão de Tempo de Serviço Militar.
2. Requerer o cômputo como tempo de contribuição (art. 55, I) e, em pedido próprio, como carência, com o precedente da TNU.
3. Conferir que o período não foi usado em inatividade remunerada ou aposentadoria no serviço público.
4. Servidor com tempo militar: contagem recíproca (`base-contagem-reciproca-rgps-rpps`).
5. Indeferimento: recurso ao CRPS ou ação judicial. Mandado de segurança tramita na Vara Federal, nunca no JEF (Lei 10.259/2001, art. 3º, §1º, I).

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

Peça: `peticao-previdenciaria`. Prova: `base-documentos-comprobatorios-in128`. Contagem recíproca: `base-contagem-reciproca-rgps-rpps`. Período de graça: `periodo-graca-qualidade-segurado`. Aluno-aprendiz: `base-aluno-aprendiz`. Portarias: `base-portarias-dpmf-inss-hub`.
