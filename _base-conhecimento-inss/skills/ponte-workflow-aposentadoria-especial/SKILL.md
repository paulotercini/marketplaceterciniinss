---
name: ponte-workflow-aposentadoria-especial
description: "Workflow pró-segurado de aposentadoria especial costurando auditoria de PPP, fundamento normativo das skills base-especial-* e produção da peça processual. Use SEMPRE que mencionar workflow aposentadoria especial, pipeline aposentadoria especial, ação aposentadoria especial, recurso CRPS aposentadoria especial, mandado de segurança aposentadoria especial, processo de aposentadoria especial, ruído frentista metalúrgico vigilante eletricista enfermagem, agente nocivo no PPP, conversão tempo especial, art. 57 Lei 8.213, EC 103/2019 especial, motociclista periculosidade, PPP com layout antigo, fluxo de tempo especial. Cruza com auditoria-ppp, defesa-probatoria-especial, tempo-especial-peticoes-por-rito, peticao-previdenciaria e revisao-peticao. NÃO use para incapacidade B31/B32 nem aposentadoria por idade comum."
---

# Workflow Aposentadoria Especial

## 1. Quando acionar

Sempre que o caso envolver aposentadoria especial, conversão de tempo especial em comum, recurso ao CRPS sobre tempo especial, mandado de segurança contra indeferimento de PPP ou ação judicial pleiteando enquadramento especial.

## 2. Pipeline executável

### Passo 1. Triagem documental

Solicitar ao cliente todos os PPP, LTCAT, PGR, laudos técnicos, CAT e CTPS. Solicitar também CNIS atualizado. Acionar `base-cnis-acerto-indicadores` para identificar indicadores bloqueantes ou pendências de vínculo.

### Passo 2. Auditoria do PPP

Acionar `auditoria-ppp` em cada PPP recebido. A auditoria gera diagnóstico técnico do agente nocivo, do enquadramento e dos vícios de preenchimento. Se houver vício, acionar `retificacao-ppp` para gerar a notificação à empresa antes do peticionamento.

### Passo 3. Fundamentação normativa pela base-*

Acionar a skill base-* correspondente ao agente nocivo identificado.

Ruído. `base-especial-ruido`.
EPI. `base-especial-epi` e `defesa-probatoria-especial`.
Agentes químicos. `base-especial-agentes-quimicos`.
Agentes biológicos. `base-especial-agentes-biologicos`.
Calor. `base-especial-calor-nho06`.
Frio. `base-especial-frio-camara-frigorifica`.
Vibração. `base-especial-vibracao`.
Eletricidade. `base-especial-eletricidade-periculosidade`.
Radiação ionizante. `base-especial-radiacao-ionizante`.
Penosidade enfermagem ou petroleiro. `base-especial-penosidade-enfermagem-petroleiro`.
Periculosidade motociclista. `base-especial-periculosidade-motociclista-nr16-anexov`.
Categoria profissional pré-1995. `base-especial-categoria-profissional-pre1995`.

Quando o PPP atravessar mudança de layout, acionar adicionalmente `base-especial-ppp-mudanca-layout-historico`.

### Passo 4. Enquadramento temporal

Identificar o regime aplicável. Requisitos reunidos até 13/11/2019: regra do art. 57 da Lei 8.213/91, com `base-aposentadoria-direito-adquirido`. Requisitos posteriores: art. 21 ou art. 19, § 1º, I, da EC 103, com `base-aposentadoria-especial-transicao-ec103`. Conversão do tempo até 13/11/2019 em `base-tempo-especial-conversao`. A caracterização de cada período segue a lei da época do trabalho.

### Passo 5. Definição de rito processual

Acionar `tempo-especial-peticoes-por-rito` para escolha entre JEF, rito ordinário TRF e CRPS. Considerar alçada e posicionamento do órgão julgador.

### Passo 6. Verificações obrigatórias

Tema 1124/STJ via `tema-1124-instrucao-administrativa` para confirmar que o PPP foi apresentado ao INSS. Se não foi, alertar risco de extinção sem mérito.

Período de graça via `periodo-graca-qualidade-segurado`.

Reafirmação da DER via `reafirmacao-der` quando houver dúvida sobre melhor DIB.

### Passo 7. Redação da peça

Acionar `peticao-previdenciaria` no padrão do escritório. Quando houver demora administrativa caracterizada, acionar `mandado-seguranca-previdenciario` em alternativa.

### Passo 8. Revisão automática

Acionar `revisao-peticao` para auditoria das quatro camadas (formal, normativa, fática, argumentativa).

## 3. Documentos essenciais a solicitar

PPP completo (todos os campos), LTCAT (mesmo extemporâneo), PGR atual, laudos técnicos, CAT, CTPS, CNIS, GFIP, contracheques quando relevante, declaração da empresa quando o PPP for parcial.

## 4. Pontos críticos pró-segurado

No ruído acima do limite da época (80 dB até 05/03/1997, 90 dB até 18/11/2003, 85 dB depois), a declaração de EPI eficaz não descaracteriza o tempo especial (Tema 555 do STF, item II). Ver `base-especial-ruido`.

PPP de ruído posterior a 18/11/2003 sem NEN ou sem técnica: na via judicial, presunção relativa de regularidade quando menciona a NHO-01 ou a NR-15 (TNU, PUIL 0001717-22.2019.4.03.6318/SP) e pico de ruído com perícia pelo Tema 1083 do STJ; Tema 317 da TNU adverso quando consta apenas "dosimetria". Ver `base-especial-ruido`.

Empresa extinta ou recusa em retificar PPP. Acionar `base-documentos-comprobatorios-in128` e `defesa-probatoria-especial` para laudo de empresa similar, perícia indireta e prova testemunhal (Súmula 198 do TFR).

Categoria profissional até 28/04/1995: a CTPS basta quando a função anotada permite o enquadramento nos Decretos 53.831/64 e 83.080/79 (IN 128/2022, art. 274, § 1º). Ver `base-especial-categoria-profissional-pre1995`.

## 5. Postura

Pró-segurado. Identificar as fragilidades probatórias da posição do INSS, usar a avaliação qualitativa onde a norma a prevê (agentes biológicos, cancerígenos do Grupo 1 da LINACH e agentes do Anexo 13 da NR-15) e levar o caso ao rito mais favorável. Registrar as teses adversas: vigilante (Tema 1209 do STF), motociclista (`base-especial-periculosidade-motociclista-nr16-anexov`) e tolueno (Tema 382 da TNU).

## Fungibilidade aplicável

Fungibilidade previdenciária. Acionar `base-fungibilidade-previdenciaria` para análise da relação entre este benefício e outros eventualmente cabíveis (REsp 2.246.096/MG, Tema 217 TNU, Tema 1018 STJ, Tema 995 STJ, vedação à conversão prejudicial).

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## Redação da peça neste tema

Ao transpor esta matéria para peça, seguir o bloco "Aposentadoria especial" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`, que traz os pares de redação genérica e precisa fixados pelo titular. A fórmula é afirmar o fato, localizar a prova por ID, explicar a relevância e formular a consequência, em parágrafos de três a quatro linhas e sem adjetivo de intensidade.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Cadeia de cada pedido

Toda peça produzida com esta skill passa, antes da entrega, pela conferência individual de cada pedido, ligando pedido, fatos, provas por ID, cálculo ou critério e conclusão jurídica, com correção pontual e sem reescrever a peça. Protocolo em `base-revisao-peticao-aprofundada/references/CADEIA-DO-PEDIDO.md` e Fase 2-A da `peticao-previdenciaria`.
