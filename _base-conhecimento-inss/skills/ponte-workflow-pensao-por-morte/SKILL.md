---
name: ponte-workflow-pensao-por-morte
description: "Workflow pró-segurado de pensão por morte (B21/B93) costurando análise de qualidade de segurado do falecido, prova de dependência (especialmente união estável) e produção da peça processual. Use SEMPRE que mencionar workflow pensão por morte, pipeline pensão por morte, ação pensão por morte, recurso CRPS pensão, MS pensão, B21 B93 viúvo viúva companheiro companheira, união estável previdenciária, dependência presumida, art. 16 Lei 8.213, Tema 526 STF, Súmula 63 TNU, prova material companheiro, fluxo pensão dependente. Cruza com pensao-por-morte, base-documentos-comprobatorios-in128, peticao-previdenciaria e revisao-peticao. NÃO use para auxílio-reclusão (B25) nem benefício originário do falecido."
---

# Workflow Pensão por Morte

## 1. Quando acionar

Sempre que o caso envolver concessão, restabelecimento ou revisão de pensão por morte. Acionar tanto em fase administrativa quanto judicial. Inclui rateio entre dependentes, perda de qualidade do falecido, união estável questionada e concubinato impuro.

## 2. Pipeline executável

### Passo 1. Triagem documental

Solicitar ao cliente certidão de óbito, RG e CPF do dependente, comprovante de residência, CNIS do falecido, CTPS do falecido, todos os documentos da relação afetiva (certidões, escrituras, declarações de IR, contas conjuntas, plano de saúde, fotografias datadas), documentos de filhos comuns quando houver.

### Passo 2. Análise da qualidade de segurado do falecido

Acionar `base-cnis-acerto-indicadores` no CNIS do falecido. Identificar indicadores bloqueantes, vínculos não computados, pendências GFIP. Acionar `periodo-graca-qualidade-segurado` para verificar se o falecido mantinha qualidade na DOF (data do óbito).

Quando o falecido fosse contribuinte individual com gaps, acionar `contribuinte-individual-in128` e `indenizacao-contribuicoes-atraso`.

Quando o falecido fosse rurícola, acionar `segurado-especial-rural`.

### Passo 3. Análise da dependência

Filhos menores de 21 e cônjuge têm dependência presumida (art. 16, §4º, da Lei 8.213/91). O companheiro também, mas precisa provar a união estável.

Para companheiro, acionar `base-pensao-por-morte-uniao-estavel-prova` para fundamentação normativa e `base-documentos-comprobatorios-in128` para mapa de provas materiais.

Para concorrência com ex-cônjuge, acionar `base-pensao-por-morte-pos-reforma`.

Para união estável simultânea (concubinato), acionar `base-pensao-por-morte-uniao-estavel-prova`. Os Temas 526 e 529 STF são adversos e o caminho é provar a separação de fato do instituidor.

### Passo 4. Cálculo e rateio

A regra atual é EC 103/2019 com art. 23. Cota familiar 50% mais 10% por dependente. Acionar `pensao-por-morte` para teses de duração e rateio.

Quando houver direito adquirido a regime anterior, acionar `base-aposentadoria-direito-adquirido` aplicado por analogia ao falecido.

### Passo 5. Definição de rito

Alçada do JEF para valor de causa abaixo de 60 salários mínimos. Acionar `base-jef-previdenciario`. Acima, rito ordinário com `base-rito-ordinario-trf`.

Em recurso administrativo, acionar `admissibilidade-barreiras-crps` antes do mérito.

### Passo 6. Verificações obrigatórias

Tema 1124/STJ via `tema-1124-instrucao-administrativa` para confirmar prévio requerimento administrativo.

Decadência de revisão via `decadencia-revisao-previdenciaria` quando se tratar de revisão.

Perspectiva de gênero via `perspectiva-genero-previdenciario` quando a dependente for mulher rurícola, doméstica ou em situação de invisibilidade.

### Passo 7. Redação da peça

Acionar `peticao-previdenciaria`. Em caso de demora administrativa, `mandado-seguranca-previdenciario` (só na Vara Federal, nunca no JEF).

### Passo 8. Revisão automática

Acionar `revisao-peticao`.

## 3. Documentos essenciais

Certidão de óbito. CNIS do falecido. CTPS do falecido. Carteiras de filiação sindical. Documentos da relação (qualquer documento que indique convivência). Documentos de filhos comuns. Justificação administrativa quando houver lacunas documentais.

## 4. Pontos críticos pró-segurado

Recusa do INSS em aceitar prova testemunhal pura. Para óbitos até a MP 871/2019 (18/01/2019), refutar com a Súmula 63/TNU na redação de 18/09/2025 e o art. 22 do Decreto 3.048/99; para óbitos posteriores, o art. 16, §5º, da Lei 8.213/91 exige início de prova material contemporânea (vedada prova exclusivamente testemunhal, salvo força maior/caso fortuito).

Exigência de escritura pública de união estável. Refutar com o art. 1.723 do CC e, para óbito até 18/01/2019, com a Súmula 63/TNU.

Indeferimento por falta de contemporaneidade. Para óbito anterior a 18/01/2019, qualquer documento da convivência serve. Para óbito posterior, o início de prova material deve ser dos 24 meses anteriores ao óbito (art. 16, §5º; Tema 371 TNU), e com um só documento cabe Justificação Administrativa (IN 128/2022, art. 180, parágrafo único).

Concorrência com ex-cônjuge alimentando. Verificar se houve renúncia expressa aos alimentos ou prestação efetiva.

Perda de qualidade do falecido por afastamento longo. Verificar prorrogações do art. 15 §§1º e 2º da Lei 8.213/91, desemprego involuntário e limbo previdenciário.

Limbo do instituidor passa despercebido com frequência, porque o dependente desconhece a história funcional do falecido. Se o instituidor recebeu alta ou indeferimento e o empregador recusou a reassunção, a qualidade de segurado se mantém até a rescisão pelo **Tema 300 da TNU**. Foi assim que a 2ª Turma Recursal de São Paulo concedeu pensão no RI 5001689-93.2024.4.03.6317, com instituidor em limbo de 10/11/2016 até o óbito em 05/10/2022. Levantar CNIS, RAIS, CTPS Digital e eventual reclamatória trabalhista do falecido. Acionar `base-limbo-previdenciario-tema300`.

## 5. Postura

Identificar a vulnerabilidade do dependente, explorar presunção de dependência econômica, refutar barreiras infralegais e exigências documentais excessivas com base na Lei 13.460/2017.

## Fungibilidade aplicável

Fungibilidade previdenciária. Acionar `base-fungibilidade-previdenciaria` para análise da relação entre este benefício e outros eventualmente cabíveis (REsp 2.246.096/MG, Tema 217 TNU, Tema 1018 STJ, Tema 995 STJ, vedação à conversão prejudicial).

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Cadeia de cada pedido

Toda peça produzida com esta skill passa, antes da entrega, pela conferência individual de cada pedido, ligando pedido, fatos, provas por ID, cálculo ou critério e conclusão jurídica, com correção pontual e sem reescrever a peça. Protocolo em `base-revisao-peticao-aprofundada/references/CADEIA-DO-PEDIDO.md` e Fase 2-A da `peticao-previdenciaria`.
