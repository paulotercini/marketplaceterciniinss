---
name: base-modelo-relatorio-medico-aposentadoria-pcd-lc142
description: "Modelo narrativo enxuto (1 folha) de relatório médico para aposentadoria da pessoa com deficiência pela LC 142/2013, com abordagem dos 7 domínios do IF-BrA, DID retroativa, grau de deficiência e sub-modelos por especialidade. Use SEMPRE que mencionar modelo relatório médico aposentadoria PCD, modelo laudo LC 142, modelo laudo IF-BrA, relatório médico para aposentadoria PCD, relatório ortopedista PCD, relatório psiquiatra PCD, relatório reumatologista PCD, relatório clínico geral PCD, relatório oftalmologista PCD, relatório cardiologista PCD, DID retroativa LC 142, sete domínios IF-BrA, grau leve moderado grave, impedimento longo prazo, fibromialgia Lei 15.176/2025 art. 1º-C Lei 14.705/2023, visão monocular Lei 14.126/2021, autismo dupla codificação, surdez Lei 14.768/2023, carta médico aposentadoria PCD. Cruza com base-validacao-formal-laudo-medico-checklist-ab, aposentadoria-deficiencia, base-aposentadoria-pcd-lc142, base-pcd-if-bra-metodologia, base-pcd-did-retroativa, base-pcd-fibromialgia-lei15176, formacao-documentacao-did-pcd, peticao-previdenciaria."
---

# Modelo de Relatório Médico para Aposentadoria PCD (LC 142/2013)

## Quando acionar

Gerar o modelo de relatório que o escritório encaminha ao médico assistente para instruir requerimento ou ação de aposentadoria da pessoa com deficiência, por tempo de contribuição ou por idade. Modelo narrativo de uma folha, com foco em data de início da deficiência (DID), sete domínios do IF-BrA, impressão de grau e barreiras.

## Diferença em relação ao laudo de incapacidade

O objeto é a deficiência funcional, e não a incapacidade para o trabalho; o segurado pode continuar trabalhando. O relatório descreve, conforme a CIF:
- impedimentos nas funções e estruturas do corpo;
- desempenho nos sete domínios do IF-BrA (Portaria Interministerial SDH/MPS/MF/MOG/AGU nº 1, de 27/01/2014): Sensorial; Comunicação; Mobilidade; Cuidados Pessoais; Vida Doméstica; Educação, Trabalho e Vida Econômica; Socialização e Vida Comunitária;
- barreiras do art. 3º, IV, da Lei 13.146/2015;
- DID com documento pretérito;
- impressão clínica do grau (leve, moderado ou grave), sem substituir o IF-BrA.

Texto que conclui pela impossibilidade de trabalhar desloca a análise para a incapacidade e não serve a este benefício.

## Estrutura

1. **Cabeçalho.** Nome, CPF, nascimento e data de emissão.
2. **Diagnósticos.** CID-10 ou CID-11; no autismo e nos transtornos mentais, dupla codificação CID-11 e DSM-5-TR.
3. **Histórico.** Evolução, marco temporal da deficiência, tratamentos e resposta.
4. **Sete domínios.** Um parágrafo por domínio, com limitação em verbos e medida (caminhar X metros, subir X degraus, permanecer em pé X minutos, uso de bengala ou órtese).
5. **DID.** Data e documento que a sustenta (exame, prontuário, atestado, declaração do empregador); agravamentos datados.
6. **Longo prazo e grau.** Natureza do impedimento, caráter permanente ou progressivo e impressão do grau. A LC 142, art. 2º, não fixa prazo mínimo; o prazo de 2 anos é do BPC (LOAS, art. 20, §10).
7. **Barreiras.** Fatos concretos por espécie.
8. **Assinatura.** Local, data, nome, especialidade e CRM legível.

Modelo completo em `references/MODELO-BASE.md`; sub-modelos de ortopedia, psiquiatria, reumatologia, clínica geral, oftalmologia e cardiologia em `references/MODELOS-POR-ESPECIALIDADE.md`; carta ao médico em `references/CARTA-AO-MEDICO.md`. Os roteiros de `base-modelo-relatorio-medico-incapacidade-b31-b91-b92/references/ROTEIROS-PROBATORIOS-POR-ESPECIALIDADE.md` podem ser aproveitados, traduzidos para os sete domínios e para a DID.

## Particularidades por condição

- **Autismo.** CID-11 6A02 e DSM-5-TR, com nível de suporte (1, 2 ou 3).
- **Fibromialgia.** CID M79.7; critérios ACR 2010, com revisões de 2011 e 2016. A Lei 14.705/2023, art. 1º-C (incluído pela Lei 15.176/2025), condiciona a equiparação à avaliação biopsicossocial; a pontuação decorre do detalhamento funcional. Aplicar o roteiro de `base-pcd-fibromialgia-lei15176/references/INDIVIDUALIZACAO-ACHADOS-RELATORIO-MEDICO.md`, com os seis eixos traduzidos para os sete domínios, FIQR ou FSQ transcritos por domínio e com data, e DID por documento pretérito (`base-pcd-did-retroativa`).
- **Surdez.** Audiometria com limiares em dB; Lei 14.768/2023 (`deficiencia-auditiva-previdenciaria`).
- **Visão monocular.** Lei 14.126/2021 (`base-pcd-deficiencia-auditiva-visual`).

## Erros a evitar

- Laudo de incapacidade em vez de descrição funcional.
- Ausência de DID, que impede a contagem retroativa e a conversão proporcional.
- Domínio omitido, que tende a ser pontuado sem limitação.
- Diagnóstico sem descrição funcional.
- Ausência de data de emissão, CPF e CRM legível. Os requisitos mínimos da análise documental do auxílio por incapacidade temporária (Portaria Conjunta MPS/INSS 13/2026, art. 2º) servem de padrão formal também aqui.
- Exames sem data ou fora de sequência; a série datada, com o grau da escala quando houver (Kellgren-Lawrence na artrose), prova a permanência e a data de início.

## Método Fuzzy

Em todo caso de aposentadoria PCD, verificar se o Fuzzy era aplicável e se foi aplicado. Gatilhos, bastando um: atividade do domínio sensível com 25 ou 50, ou todas com 75; ausência de auxílio de terceiros sempre que necessário; resposta positiva à questão emblemática do tipo de deficiência. Presente o gatilho, a menor pontuação do domínio sensível se replica para todas as atividades daquele domínio, o que pode mudar o grau. Checklist e quesitos em `base-pcd-if-bra-metodologia/references/METODO-FUZZY-APLICACAO-OBRIGATORIA.md`.

## Médicos conferentes

Antes de redigir o modelo, despachar o agente médico da área com os documentos.

| Se os documentos tratarem de | Despachar ao agente |
|---|---|
| Coluna, lombar, cervical, hérnia de disco, ciática, estenose, artrodese, CID M40 a M54 | `base-conhecimento-inss:medico-coluna` |
| Joelho, menisco, ligamento cruzado, artrose de joelho, prótese, quadril, tornozelo, fascite plantar | `base-conhecimento-inss:medico-membro-inferior` |
| Ombro, manguito rotador, supraespinhal, bursite, capsulite, CID M75 | `base-conhecimento-inss:medico-ombro` |
| Punho, mão, dedo, amputação, túnel do carpo, tenossinovite, epicondilite, LER e DORT | `base-conhecimento-inss:medico-membro-superior` |
| Depressão, ansiedade, bipolar, esquizofrenia, TEPT, burnout, CAPS, CID F20 a F48 | `base-conhecimento-inss:medico-psiquiatra` |
| Fibromialgia, artrite reumatoide, lúpus, espondilite, artrose difusa, osteoporose | `base-conhecimento-inss:medico-reumatologista` |
| Visão monocular, cegueira, glaucoma, retinopatia, surdez, audiometria, PAIR, implante coclear | `base-conhecimento-inss:medico-sensorial` |
| Câncer, infarto, insuficiência cardíaca, AVC, epilepsia, Parkinson, DPOC, insuficiência renal, HIV | `base-conhecimento-inss:medico-doencas-graves` |


Havendo mais de uma área, despachar até três agentes, os das áreas que decidem o caso. O parecer volta em uma página e orienta o conteúdo pedido ao médico assistente, sobretudo a DID. É instrumento interno: não vai aos autos nem substitui laudo de assistente técnico.

## Validação e integração

Após o preenchimento, validar com `base-validacao-formal-laudo-medico-checklist-ab` (Checklist B). Aposentadoria em `aposentadoria-deficiencia` e `base-aposentadoria-pcd-lc142`; IF-BrA em `base-pcd-if-bra-metodologia`; DID em `base-pcd-did-retroativa` e `formacao-documentacao-did-pcd`; conversão em `base-pcd-conversao-tempo-especial-pcd`; peça em `peticao-previdenciaria`. Modelos de incapacidade, B94 e BPC em `base-modelo-relatorio-medico-incapacidade-b31-b91-b92`, `base-modelo-relatorio-medico-auxilio-acidente-b94` e `base-modelo-relatorio-medico-bpc-loas-deficiente`.

## Lei Brasileira de Inclusão como fundamento obrigatório

Acionar sempre `base-lbi-inclusao-barreiras-lei13146`. Percorrer as seis barreiras do art. 3º, IV, da Lei 13.146/2015, com fato concreto e documento por ID, e cobrar no relatório os quatro incisos do art. 2º, §1º.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
