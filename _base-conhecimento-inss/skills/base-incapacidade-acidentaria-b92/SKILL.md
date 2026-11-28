---
name: base-incapacidade-acidentaria-b92
description: "Aposentadoria por incapacidade permanente acidentária B92 pós EC 103/2019, ótica exclusiva do segurado. Use SEMPRE que mencionar B92, auxílio-doença acidentário B91, acidente de trabalho, doença ocupacional, doença profissional, doença do trabalho, nexo acidentário, NTEP, CAT Comunicação Acidente Trabalho, art. 19 Lei 8.213, art. 20 Lei 8.213, art. 21 Lei 8.213, art. 21-A NTEP, Anexo II Decreto 3.048, ADI 3931, Lista B, Lista C, concausa, acidente trajeto, equiparação acidente, art. 118 estabilidade, FGTS afastamento, RMI 100% acidentário, art. 26 §3º II EC 103, doença preexistente agravada, burnout QD85, transtorno mental ocupacional, PGR, NR-1 riscos psicossociais, responsabilidade empresa. Postura pró-segurado, Portaria 991/2022 (reconhecimento), Portaria 992/2022 (manutenção), TJSP. Cruza com auditoria-laudo-pericial, peticao-previdenciaria, ntep-nexo-acidentario, base-incapacidade-b31-temporaria, base-incapacidade-b32-permanente e base-auxilio-acidente-b94-pos-reforma."
---

# Incapacidade acidentária (B91 e B92) após a EC 103/2019

Convenção de espécies (códigos INSS): B31 auxílio por incapacidade temporária previdenciário; B91 auxílio por incapacidade temporária acidentário; B32 aposentadoria por incapacidade permanente previdenciária; B92 aposentadoria por incapacidade permanente acidentária; B94 auxílio-acidente.

## Escopo

Reconhecimento da natureza acidentária da incapacidade e seus efeitos (RMI, estabilidade, competência). Nexo e NTEP em profundidade em `ntep-nexo-acidentario`. Cenários em `references/FUNDAMENTOS-E-CENARIOS.md`; refutações em `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Fontes do nexo

- Acidente típico (Lei 8.213/91, art. 19).
- Doença profissional e do trabalho (art. 20, I e II); excluídas a degenerativa, a inerente a grupo etário, a que não incapacita e a endêmica sem exposição (§1º); em caso excepcional, doença fora da relação, resultante das condições especiais do trabalho e com ele diretamente relacionada, é acidente do trabalho (§2º).
- Equiparações (art. 21): concausa (I), agressão e fortuito no local e horário (II), contaminação acidental (III), acidente fora do local a serviço e de trajeto (IV, "a" a "d"; a revogação da alínea "d" pela MP 905/2019 perdeu vigência).
- NTEP (art. 21-A): correlação entre a CNAE da empresa e o intervalo de CID da Lista C do Anexo II do Decreto 3.048/99 (art. 337, §3º). A perícia apenas o afasta demonstrando a inexistência do nexo (§1º); constitucional (ADI 3.931 STF).
- Anexo II do Decreto 3.048/99: Lista A (agentes e fatores de risco), Lista B (doenças relacionadas ao trabalho por grupo da CID, base do nexo técnico profissional) e Lista C (NTEP).

## Efeitos da natureza acidentária

| Efeito | B91 | B92 |
|---|---|---|
| RMI | 91% do salário de benefício (art. 61), como o B31 | 100% da média (EC 103/2019, art. 26, §3º, II), contra 60% mais 2% por ano excedente no B32 |
| Carência | Dispensada (art. 26, II) | Dispensada |
| Estabilidade | 12 meses após a cessação do B91 (art. 118) | Não se aplica |
| FGTS | Depósito durante o afastamento (Lei 8.036/90, art. 15, §5º) | Não se aplica |
| Competência | Justiça Estadual (CF, art. 109, I; Súmula 15 STJ); isenção de custas e sucumbência (art. 129, parágrafo único) | Idem |

## Estratégia

1. Levantar a CNAE do empregador e o CID; conferir a Lista C.
2. Buscar a CAT ou emiti-la pelo segurado, sindicato, médico assistente ou autoridade pública (art. 22, §2º).
3. Obter PGR, LTCAT, PPP e documentos internos que demonstrem a exposição.
4. Doença preexistente: demonstrar o agravamento pelo trabalho (concausa, art. 21, I; arts. 42, §2º, e 59, §1º).
5. Transtorno mental: riscos psicossociais no gerenciamento de riscos da NR-1 (Portaria MTE 1.419/2024); burnout como fenômeno ocupacional na CID-11 (QD85; Z73.0 na CID-10).
6. Impugnar a classificação previdenciária por recurso ao CRPS ou ação acidentária com perícia médica e, se preciso, de engenharia do trabalho.
7. Estabilidade do art. 118: orientar ação trabalhista se houver dispensa no período.

## Fungibilidade aplicável

Acionar `base-fungibilidade-previdenciaria` (REsp 2.246.096/MG, Tema 217 TNU, Tema 1018 STJ, Tema 995 STJ, vedação à conversão prejudicial).

## Hub de portarias administrativas

Portarias DIRBEN/INSS 991/2022 e 992/2022: `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

Peça: `peticao-previdenciaria`; inicial no Núcleo 4.0 do TJSP: `base-auxilio-acidente-b94-pos-reforma`. Nexo: `ntep-nexo-acidentario`. Laudo: `auditoria-laudo-pericial`. Conversões: `base-incapacidade-b31-temporaria` e `base-incapacidade-b32-permanente`. Sequela sem incapacidade: `auxilio-acidente-b94`. RMI: `base-calculo-rmi-ec103`. Perícia: `base-pericia-medica-federal-telepericia`.

