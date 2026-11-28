---
name: base-bpc-loas-requisitos
description: "BPC/LOAS requisitos estruturais e marco normativo, ótica pró-segurado, atualizada para o Decreto 12.534/2025 que reformou o Decreto 6.214/2007. Use SEMPRE que mencionar BPC, LOAS, benefício assistencial, idoso 65 anos, PCD assistencial, Lei 8.742/1993, art. 20 LOAS, Decreto 6.214/2007, Decreto 12.534/2025, Portaria Conjunta MDS/INSS nº 2 de 30/03/2015, Portaria 34/2025, Portaria 37/2026, Lei 15.157/2025, Lei 15.077/2024 prazos CadÚnico, critério renda igual ou inferior 1/4 SM, novas exclusões de renda art. 4º §2º (rompimento barragens VII, BPC concedido a outro idoso ou PcD da mesma família VIII, benefício previdenciário 1 SM idoso 65+/PcD IX, auxílio-inclusão X), revogação exclusões antigas I II IV V Decreto 12.534/2025, acumulação com transferências de renda Bolsa Família Renda Básica Cidadania Lei 10.835/2004 art. 203 VI CF, avaliação biopsicossocial pela perícia médica federal e serviço social INSS, registro obrigatório CID, registro biométrico requisito, art. 47-B 47-C 47-D 47-E notificação bloqueio suspensão cessação, revogação art. 19 par. único, revogação art. 16 §11, revogação art. 42 §3º §5º critérios decisão judicial em revisão, retrocesso social BPC, coisa julgada decisão judicial BPC, Tema 385 TNU incapacidade não exigida, rol taxativo grupo familiar, estrangeiro residente Tema 173 STF, impedimento longo prazo requisito, idoso 65 requisitos, inscrição CadÚnico BPC, revisão bienal BPC, cessação BPC, reativação BPC, auxílio-inclusão, irrepetibilidade valores BPC, acúmulo BPC vedação, dispensa reavaliação impedimento permanente art. 21 §5º LOAS, Teleperícia BPC, Portaria 19/2026 BPC, art. 203 V CF, prescrição quinquenal BPC. Cruza com analise-bpc-loas, bpc-renda-grupo-familiar, base-bpc-renda-per-capita-miserabilidade, base-bpc-comprometimento-renda, base-bpc-impedimento-longo-prazo, peticao-previdenciaria, base-documentos-comprobatorios-in128, mandado-seguranca-previdenciario, coisa-julgada-previdenciaria, base-devolucao-valores-irrepetibilidade-tema979-tema692 e precedentes-previdenciarios."
---

# BPC/LOAS. Requisitos Estruturais

## Escopo

Hub dos requisitos do Benefício de Prestação Continuada de 1 salário mínimo, para o idoso de 65 anos ou mais e para a pessoa com deficiência, ambos sem meios de prover a própria manutenção. Detalhes em skills próprias: grupo familiar, exclusões e deduções em `bpc-renda-grupo-familiar`; critério judicial de miserabilidade em `base-bpc-renda-per-capita-miserabilidade`; impedimento e avaliação em `base-bpc-impedimento-longo-prazo`; instrumento e TCQ em `analise-bpc-loas`.

## Marco normativo

- CF, art. 203, V.
- LOAS (Lei 8.742/1993), arts. 20, 20-B, 21, 21-A, 21-B e 26-A a 26-C.
- Decreto 6.214/2007, com a reforma do Decreto 12.534/2025.
- Portaria Conjunta MDS/INSS 2/2015 (avaliação da deficiência), alterada pela Portaria Conjunta 37/2026.
- Portaria Conjunta MDS/INSS 34/2025 (procedimentos de requerimento, concessão, manutenção e revisão).
- Lei 15.157/2025 (art. 21, §5º, da LOAS: dispensa de avaliação periódica).
- Lei 13.146/2015, art. 2º.

## Requisitos comuns

1. Brasileiro, nato ou naturalizado, ou estrangeiro residente no País (Tema 173 STF, RE 587.970).
2. Renda familiar per capita igual ou inferior a 1/4 do salário mínimo (LOAS, art. 20, §3º; Decreto 6.214/2007, arts. 8º, II, e 9º, II), sem prejuízo de outros meios de prova da miserabilidade (art. 20, §11; Tema 27 STF).
3. Inscrição no CPF e no CadÚnico (art. 20, §12) e registro biométrico (art. 20, §12-A, Lei 14.973/2024; Decreto 6.214/2007, art. 12).
4. Não receber outro benefício da seguridade social ou de outro regime, salvo assistência médica, pensão especial de natureza indenizatória e as transferências de renda do art. 6º, parágrafo único, e do art. 203, VI, da CF e da Lei 10.835/2004 (art. 20, §4º, redação da Lei 14.601/2023).

## Requisitos específicos

- **Idoso.** 65 anos completos, provados por documento oficial. Dispensa a avaliação da deficiência.
- **Pessoa com deficiência.** Impedimento de longo prazo, com efeitos por no mínimo 2 anos (art. 20, §10), avaliado nos aspectos biopsicossociais pela perícia médica federal e pelo serviço social do INSS (art. 20, §6º; Decreto 6.214/2007, art. 16, §3º). A incapacidade para o trabalho não é exigida (Tema 385 TNU, abaixo).

## Valor e natureza

Um salário mínimo, sem contribuição, sem 13º e sem pensão por morte. O benefício é pessoal e intransferível; resíduos não recebidos em vida são pagos aos herdeiros (Decreto 6.214/2007, art. 23, parágrafo único). Detalhe em `bpc-renda-grupo-familiar`.

## Revisão, suspensão e cessação

- Revisão a cada 2 anos (art. 21). A convocação de benefício judicial ou administrativo tem base no art. 21, §5º, na redação da Lei 14.176/2021, depois substituída pela Lei 15.157/2025.
- **Dispensa de reavaliação.** Impedimento permanente, irreversível ou irrecuperável dispensa a avaliação médico-pericial periódica, salvo fundada suspeita de fraude ou erro (art. 21, §5º, Lei 15.157/2025). Síndrome congênita do vírus Zika: art. 21, §6º (Lei 15.156/2025).
- **Trabalho da pessoa com deficiência.** Suspensão e reativação (art. 21-A) e auxílio-inclusão (arts. 26-A a 26-C), em `bpc-renda-grupo-familiar`.
- **Procedimento.** Notificação, bloqueio, suspensão e cessação pelos arts. 47-B a 47-E e 48 do Decreto 6.214/2007, em `references/DECRETO-6214-2007-ATUALIZACAO-2025.md`.
- **Devolução.** O art. 49 do Decreto 6.214/2007 ressalva o recebimento de boa-fé. Ver `base-devolucao-valores-irrepetibilidade-tema979-tema692`.
- **Prescrição.** Quinquenal das parcelas (Decreto 20.910/1932, art. 1º; Lei 8.213/1991, art. 103, parágrafo único, por analogia). O prazo decadencial do art. 103, caput, da Lei 8.213/1991 não se aplica ao benefício assistencial.

## Decreto 12.534/2025. Síntese

**Avanços.**
- Critério de renda "igual ou inferior" a 1/4 (arts. 8º, II, e 9º, II).
- Acumulação expressa com as transferências de renda (art. 5º).
- Exclusões do art. 4º, §2º: VII (barragens), VIII (BPC de outro idoso ou pessoa com deficiência da família), IX (benefício previdenciário de até 1 salário mínimo de idoso acima de 65 anos ou pessoa com deficiência, em linha com o art. 20, §14, da LOAS) e X (auxílio-inclusão e remuneração do seu titular, para manter o BPC de outro membro).
- Registro obrigatório do CID no instrumento, resguardado o sigilo (art. 16, §3º-A).

**Pontos desfavoráveis.**
- Revogação das exclusões dos antigos incisos I (benefícios eventuais), II (transferências de renda), IV (pensão indenizatória e assistência médica) e V (rendas eventuais ou sazonais) do art. 4º, §2º.
- Revogação do art. 42, §§3º e 5º, que mandavam observar os critérios da decisão judicial ou da ação civil pública na revisão.
- Prazos dos arts. 47-B a 47-E: 30 dias para defesa, 30 dias para agendar reavaliação, 45 ou 90 dias para o CadÚnico e 90 dias para a biometria.
- A revogação do art. 16, §11, não afasta a dispensa legal do art. 21, §5º, da LOAS.

**Estratégia.**
- Reavaliação que aplica critério jurídico diverso da sentença, sem alteração fática: sustentar a coisa julgada (CF, art. 5º, XXXVI; CPC, arts. 502 e 503), cruzando com `coisa-julgada-previdenciaria`.
- Cessação por falta de biometria: pedir o registro pelo responsável legal (art. 20, §12-B) ou a dispensa por impossibilidade física.
- Cessação por CadÚnico: conferir o prazo do art. 47-D, III, e a ciência da notificação.
- Exclusões revogadas: sustentar no caso concreto a análise global da miserabilidade (Tema 27 STF) e a vedação ao retrocesso social.

Mapa completo em `references/DECRETO-6214-2007-ATUALIZACAO-2025.md`.

## Tema 385 TNU. Incapacidade para o trabalho não é exigida

PEDILEF 1005655-57.2022.4.01.3602/MT, julgado em 24/06/2026, por maioria, Rel. Juiz Federal Fábio de Souza Silva.

**Tese.** "Para fins de concessão do BPC/LOAS, a caracterização da deficiência não exige a demonstração de incapacidade para o trabalho." O requisito é o impedimento de longo prazo que, em interação com barreiras, obstrua a participação plena e efetiva, aferido por avaliação biopsicossocial.

**Parâmetros de economia processual.**
1. Perícia judicial que constata inexistência de impedimento, impedimento leve ou passível de resolução em menos de 2 anos dispensa a avaliação biopsicossocial.
2. Incapacidade total de longo prazo para qualquer atividade gera presunção relativa de deficiência e dispensa a avaliação social, salvo elementos concretos de ausência de barreiras relevantes.
3. Impedimento moderado ou grave sem incapacidade total exige a avaliação biopsicossocial, com análise do assistente social sobre fatores ambientais, limitações de atividade e restrições de participação.

A avaliação biopsicossocial não se confunde com a análise da miserabilidade. Exigir incapacidade laborativa configura capacitismo (item 3 da ementa). O art. 21-A da LOAS pressupõe que a pessoa com deficiência pode trabalhar. Fundamentação integral em `base-precedentes-catalogo-vinculantes/references/TEMA-385-TNU-FUNDAMENTACAO-COMPLETA.md`.

## Rol taxativo do grupo familiar

PEDILEF 5001885-13.2023.4.04.7209/SC (TNU, 10/12/2025, unânime): o rol do art. 20, §1º, da LOAS é taxativo, e a renda de parente fora do rol não entra no cálculo per capita, podendo apenas ser ponderada na análise global. PEDILEF 0003636-52.2018.4.01.3306/BA (TNU, 23/09/2025) no mesmo sentido. Um terceiro PEDILEF (TNU, 19/06/2020) consta com numeração inconsistente (0000020-09.3808.7.01.3419/DF) e deve ser conferido na fonte antes de qualquer citação: [NÃO CONFIRMADO]. Catálogo em `base-precedentes-catalogo-vinculantes/references/CATALOGO-PEDILEFS-PARADIGMATICOS-TNU.md`.

## Cenários

- **Idoso com cônjuge que recebe aposentadoria de 1 salário mínimo.** Renda excluída (art. 20, §14).
- **Renda pouco acima de 1/4.** Análise concreta da miserabilidade e deduções de saúde (`base-bpc-comprometimento-renda`).
- **Criança com TEA.** Avaliação pelos anexos da Portaria Conjunta 2/2015 para menores de 16 anos.
- **Cessação em revisão.** Contraditório prévio, recurso ao CRPS e art. 21, §5º, quando o impedimento for permanente.
- **CadÚnico desatualizado.** Condição regularizável; atualizar e reapresentar o pedido.
- **Pensão especial indenizatória.** Acumulável (art. 20, §4º).
- **Estrangeiro residente.** Tema 173 STF.
- **Idade sem documento suficiente.** Justificação administrativa e documentos antigos (batismo, registros escolares, CNIS).

## Refutação a argumentos típicos do INSS

- **Renda acima de 1/4 por pequena diferença.** Tema 27 STF, art. 20, §11, e deduções.
- **Grupo familiar com todos os moradores.** Rol taxativo do art. 20, §1º.
- **Bolsa de estágio ou aprendizagem do filho.** Excluídas (art. 20, §9º).
- **Benefício de outro idoso ou pessoa com deficiência na renda.** Excluído até 1 salário mínimo (art. 20, §14; Tema 640 STJ).
- **Doença recente.** O prazo de 2 anos é prognóstico, e não exige decurso efetivo.
- **Exigência de incapacidade laboral.** Tema 385 TNU.

## Roteiro pró-segurado

1. Idoso: comprovar idade, composição do grupo e renda, aplicando as exclusões.
2. Pessoa com deficiência: reunir documentação médica e preparar a avaliação (`orientacao-cliente-pericia`).
3. Cessação: conferir notificação, prazos, art. 21, §5º, e restabelecimento.
4. Acumulação apontada pelo INSS: verificar a natureza do outro benefício.
5. Mandado de segurança por mora: Vara Federal comum; o JEF não processa MS (Lei 10.259/2001, art. 3º, §1º, I).

## Documentos

Identidade e CPF do requerente; certidões dos membros do grupo; comprovante de residência; CadÚnico atualizado; comprovantes de renda; laudos, exames e receituários (pessoa com deficiência); comprovantes de gastos com saúde. Ver `base-documentos-comprobatorios-in128`.

## Integração

Grupo familiar e renda em `bpc-renda-grupo-familiar`; impedimento em `base-bpc-impedimento-longo-prazo`; instrumento em `analise-bpc-loas`; procedimentos em `base-bpc-aposentadoria-pcd-procedimentos`; anuência ao desligamento do PBF em `base-bpc-pbf-anuencia-in54-2026`; Cadastro Domiciliar em `base-cadastro-domiciliar-cadunico-in21-2026` (a integração CadÚnico-CNIS não autoriza excluir membro do grupo, IN 21/2026, Anexo I, item 5.5); validação do laudo em `base-validacao-formal-laudo-medico-checklist-ab`; segurado especial em `base-segurado-especial-autodeclaracao-arts-92-93-94`; fungibilidade em `base-fungibilidade-previdenciaria`; portarias em `base-portarias-dpmf-inss-hub`; peça em `peticao-previdenciaria`.

## Lei Brasileira de Inclusão como fundamento obrigatório

Acionar sempre `base-lbi-inclusao-barreiras-lei13146`. Percorrer as seis barreiras do art. 3º, IV, da Lei 13.146/2015 (urbanística, arquitetônica, nos transportes, nas comunicações e na informação, atitudinal e tecnológica), com fato concreto e documento por ID, e cobrar os quatro incisos do art. 2º, §1º, na avaliação e no relatório. O conceito convencional tem estatura de emenda constitucional (Decreto Legislativo 186/2008 e Decreto 6.949/2009) e não pode ser restringido por ato infralegal.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
