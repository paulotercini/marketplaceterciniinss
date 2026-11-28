---
name: base-especial-epi
description: "Base de teses de defesa do segurado sobre EPI em aposentadoria especial. Use SEMPRE que mencionar EPI, equipamento de proteção individual, eficácia de EPI, neutralização de nocividade, Tema 555 STF, ARE 664.335, Tema 1090 STJ, Tema 213 TNU, Tema 383 TNU, IRDR 15 TRF4, Parecer Fundacentro 2/2025 e 3/2025, eficácia versus efetividade, hipóteses excepcionais EPI, standard probatório atenuado, ônus da prova EPI, campo 15.7 PPP, certificado CA, EPI ineficaz para ruído cancerígenos biológicos, art. 291 IN 128, Súmula 87 TNU, EPC versus EPI, primazia EPC, ficha de entrega, troca periódica, higienização, treinamento NR-6, limitação protetor auricular, eficácia real em campo, irrelevância do carimbo eficaz, Frederico Amado, Hugo Goes. Tese LITERAL do Tema 1090 conferida no SCON em 14/08/2026 com os cinco caminhos do ônus, EDcl REsp 2.116.343 cancerígenos, EDcl REsp 2.080.584 lista aberta, modulação afastada, vedação de pedir inversão do art. 373 §1º, Enunciado 18 I Jornada TRF4 contribuinte individual. Traz hipóteses excepcionais firmadas e roteiro pró-segurado. NÃO use para outros agentes isoladamente. Cruza com base-tema383-tnu-fundacentro-epi-biologicos, auditoria-ppp, peticao-previdenciaria e defesa-probatoria-especial."
---

# Base Temática. EPI em Aposentadoria Especial

## Escopo

Skill de referência exclusiva para a defesa do segurado quando o INSS ou o juízo invoca uso eficaz de EPI para afastar o reconhecimento do tempo especial. Complementa `auditoria-ppp`, `defesa-probatoria-especial` e `peticao-previdenciaria`.

## Postura

A postura é exclusivamente pró-segurado. A tese de neutralização por EPI é, em regra, posição do INSS. Esta skill apresenta apenas a contra-argumentação, nunca a defesa da autarquia.

## Fluxo de trabalho

1. Leia este SKILL.md integralmente
2. Leia `references/FUNDAMENTOS-E-CENARIOS.md` para compreender a evolução normativa do Tema 555 STF, o Tema 1090 STJ, o Tema 213 TNU e o IRDR 15 TRF4
3. Leia `references/JURISPRUDENCIA-E-REFUTACAO.md` para acessar precedentes verificados e contra-argumentação linha a linha
4. Ao redigir peça, acione `peticao-previdenciaria`
5. Ao impugnar PPP concreto, acione `auditoria-ppp`
6. Ao discutir cerceamento de defesa por ausência de perícia, acione `defesa-probatoria-especial`

## Síntese

1. **Tema 555 do STF (ARE 664.335).** Item I: o EPI apenas afasta a especialidade se for "realmente capaz de neutralizar a nocividade". Item II: para ruído acima do limite, a declaração de eficácia do EPI no PPP não descaracteriza a especialidade (regra repetida na IN 128/2022, art. 291, § 2º).
2. **Tema 1090 do STJ.** O EPI informado no PPP descaracteriza "em princípio" o tempo especial, ressalvadas hipóteses excepcionais que a tese não enumera. Os EDcl no REsp 2.116.343/RJ reconhecem os cancerígenos como uma delas; os EDcl no REsp 2.080.584/PR registram que a lista ficou aberta. Isso permite sustentar biológicos, periculosidade e situações em que o EPI não tem eficácia comprovada para o agente.
3. **Ônus (Tema 1090, item II).** O autor prova a ineficácia por um dos cinco fundamentos: inadequação ao risco, certificado inexistente ou irregular, descumprimento de manutenção, troca e higienização, falta de treinamento, ou outro motivo. É tese adversa; o caminho é a impugnação específica, com documento por ID, e o fecho pelo item III (divergência ou dúvida favorecem o autor).
4. **Tema 213 da TNU.** A informação de EPI eficaz no PPP pode ser desafiada mediante impugnação específica na causa de pedir, pelos mesmos fundamentos.
5. **Requisitos administrativos (IN 128/2022, art. 291).** O EPI apenas é considerado em demonstrações ambientais desde 03/12/1998 e exige registro, no PPP, da hierarquia de controle (EPC antes do EPI), do uso ininterrupto, da validade do CA, da periodicidade de troca e da higienização. A omissão desses registros sustenta a impugnação.
6. **Tema 383 da TNU (julgado em 24/09/2026).** Em ambiente hospitalar, nas hipóteses do item I, o EPI eficaz do PPP não obsta a especialidade. Pareceres 2/2025 e 3/2025 da Fundacentro (Ofício Eletrônico 221/2025/PRES-FUNDACENTRO, de 30/10/2025) distinguem eficácia em ensaio de efetividade em campo. Desenvolvimento em `base-tema383-tnu-fundacentro-epi-biologicos`.

## Uso por agente

| Agente | Posição |
|---|---|
| Ruído | EPI irrelevante (Tema 555, item II) |
| Cancerígeno do Grupo 1 da LINACH | EPI irrelevante (Tema 170 da TNU; EDcl no REsp 2.116.343/RJ); a IN 128/2022, art. 298, III, admite descaracterização desde 01/07/2020 |
| Biológico em ambiente hospitalar | Tema 383 da TNU, item I; fora dele, impugnação específica |
| Químico absorvível pela pele | Exigir prova de luvas e vestimentas adequadas; tolueno em `base-tolueno-tema-382-tnu-via-cutanea` |
| Eletricidade | Impugnação específica; o EPI reduz a gravidade do acidente, mas não elimina o risco |
| Demais agentes | Impugnação específica (item II) e dúvida (item III) |

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

Ao redigir peça, acione `peticao-previdenciaria`.
Ao auditar o PPP concreto, acione `auditoria-ppp`.
Ao discutir cerceamento de defesa, acione `defesa-probatoria-especial`.
Ao verificar superação ou modulação dos precedentes, acione `precedentes-previdenciarios`.
Ao pedir retificação do PPP à empresa, acione `retificacao-ppp`.
Ao confrontar EPI com agente específico, acione a skill desse agente, como `base-especial-ruido`, `base-especial-agentes-quimicos` ou `base-especial-agentes-biologicos`.

## O que NÃO está nesta skill

Não há enquadramento direto de ruído, calor, vibração, químicos ou biológicos. Cada um tem skill temática própria. Não há orientação sobre perícia por similaridade. Esse tópico está em `defesa-probatoria-especial`.

## Tema 1090/STJ, tese literal e roteiro de prova

Conferido no SCON do STJ em 14/08/2026. REsp 2.080.584/PR, 2.082.072/RS e 2.116.343/RJ, Rel. Min. Maria Thereza de Assis Moura, Primeira Seção, j. 09/04/2025, DJEN 22/04/2025, TRÂNSITO EM JULGADO. Tese literal integral, embargos, roteiro dos cinco caminhos do ônus e alertas de peça em `references/TEMA-1090-STJ-TESE-LITERAL-E-ROTEIRO.md`. Ler antes de redigir qualquer tópico de EPI.

Cinco pontos que decidem o uso.

Primeiro, a tese tem três itens. Os cinco incisos do item II são o roteiro de prova do segurado, e a divergência é fundamento autônomo ao lado da dúvida no item III.

Segundo, a tese não enumera as hipóteses excepcionais do item I. Quem enumera os cancerígenos é o próprio STJ, nos EDcl no REsp 2.116.343/RJ (j. 10/09/2025, DJEN 18/09/2025, parcialmente acolhidos com efeitos infringentes), cuja razão de decidir afirma que "uma dessas hipóteses excepcionais é relativa à exposição a agentes cancerígenos".

Terceiro, a lista é aberta por decisão deliberada. Os EDcl no REsp 2.080.584/PR, rejeitados na mesma sessão, registram que "propositadamente, o acórdão embargado não discorreu mais a fundo sobre essas hipóteses excepcionais". Sustentar biológicos, ruído ou periculosidade como hipótese excepcional não contraria o repetitivo.

Quarto, a modulação de efeitos foi afastada, e os impactos em cada caso concreto devem ser avaliados individualmente.

Quinto, não pedir inversão do ônus pelo art. 373, § 1º, do CPC. A razão de decidir n. 8 do acórdão a rejeitou expressamente por ausência de assimetria informacional, e o pedido entrega ao INSS argumento de contrariedade a repetitivo. O caminho é assumir o ônus, cumprir dois ou três dos cinco incisos com documento por ID, e fechar pelo item III.

## Enunciado 18 da I Jornada do TRF4, contribuinte individual e EPI ineficaz

Texto literal, conferido no Caderno oficial da EMAGIS/TRF4 em 14/08/2026, página 22. "Nos casos em que o equipamento de proteção individual (EPI) é reconhecidamente ineficaz, seu uso por contribuintes individuais não impede o reconhecimento da especialidade."

Justificativa oficial, que nomina as hipóteses. "As hipóteses de exposição a ruído, a agentes biológicos, a agentes cancerígenos, à periculosidade e outras em que o uso de equipamento de proteção individual (EPI) seja incapaz de eliminar ou de neutralizar os fatores de risco mostram-se fora do âmbito de exigência de responsabilidade dos próprios contribuintes individuais pelo adequado controle de seu ambiente laboral."

Identificação completa. Enunciado 18 da I Jornada Regional Intrainstitucional de Direito Previdenciário da Justiça Federal da 4ª Região, EMAGIS/TRF4, Porto Alegre, 1º e 2 de setembro de 2025, coordenação científica da Des. Fed. Taís Schilling Ferraz, trinta enunciados aprovados por no mínimo dois terços dos votantes.

Ressalva de uso. O próprio TRF4 declara que os enunciados têm "caráter meramente doutrinário e força persuasiva técnico-jurídica, não se confundindo com a posição do Tribunal Regional Federal da 4ª Região e de seus membros". Citar como reforço doutrinário, nunca como precedente do tribunal. Em peça na 3ª Região, sinalizar a origem.

## Redação da peça neste tema

Ao transpor esta matéria para peça, seguir o bloco "Aposentadoria especial" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`, que traz os pares de redação genérica e precisa fixados pelo titular. A fórmula é afirmar o fato, localizar a prova por ID, explicar a relevância e formular a consequência, em parágrafos de três a quatro linhas e sem adjetivo de intensidade.

## Juízo de Catanduva

O juízo aplica o Tema 1090 do STJ pelo ônus do autor e, no modelo do titular, não aplicou o item III (dúvida favorável ao autor) nos casos lidos. O argumento contra o EPI apresentado apenas nos embargos foi rejeitado como rediscussão. A peça ataca o EPI na inicial, por um dos itens do Tema 1090, com prova, e pede expressamente a aplicação do item III. Blocos literais em `base-juizo-catanduva/references/BLOCOS-ESPECIAL-PROCESSO.md`, seção 5.
