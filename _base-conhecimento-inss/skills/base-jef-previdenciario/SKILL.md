---
name: base-jef-previdenciario
description: "Juizado Especial Federal previdenciário, Lei 10.259/2001, competência pelo valor da causa, teto de 60 salários-mínimos, dispensa de reexame necessário, prova técnica simplificada. Use SEMPRE que mencionar JEF, Juizado Especial Federal, Lei 10.259, competência JEF, valor da causa JEF, 60 salários-mínimos JEF, renúncia excedente, prova técnica simplificada, Enunciado FONAJEF, competência absoluta JEF, Tema 1030 STJ, art. 3º Lei 10.259, art. 17 §4º Lei 10.259, teto JEF, art. 12 Lei 10.259, art. 9º Lei 10.259 prazo simples, art. 13 Lei 10.259, Enunciado 71 FONAJEF, petição inicial JEF, citação JEF, contestação JEF, rito sumaríssimo previdenciário, competência delegada JEF, economicidade JEF, simplicidade JEF, oralidade JEF, informalidade, TRF3. Cruza com peticao-previdenciaria, revisao-peticao, precedentes-previdenciarios, base-recursos-jef, base-cumprimento-sentenca-rpv-precatorio e defesa-probatoria-especial."
---

# Juizado Especial Federal Previdenciário

## Escopo

Atuação processual no JEF: competência, rito, prova técnica e execução. Recursos em `base-recursos-jef`; manual operacional do TRF3 em `base-jef-trf3-manual-2025`. Cenários em `references/FUNDAMENTOS-E-CENARIOS.md`; precedentes e refutação em `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Marco normativo

CF/88, art. 98, §1º. Lei 10.259/2001. Lei 9.099/1995, subsidiária (art. 1º da Lei 10.259/2001).

Art. 3º. Competência para causas de até 60 salários mínimos; obrigações vincendas pela soma de doze parcelas (§2º); competência absoluta onde houver JEF instalado (§3º). Excluídas, entre outras, mandado de segurança e ações coletivas (§1º, I); admitida a anulação de ato administrativo previdenciário (§1º, III).

Art. 9º. Sem prazo diferenciado para o INSS, inclusive para recorrer.

Art. 10. Representação por advogado facultativa em primeiro grau; obrigatória no recurso (art. 41, §2º, da Lei 9.099/95).

Art. 12. Exame técnico por pessoa habilitada; nas ações previdenciárias e assistenciais, quesitos e assistentes em 10 dias (§2º).

Art. 13. Sem reexame necessário.

Art. 17. RPV em 60 dias, teto de 60 salários mínimos, renúncia ao excedente na execução (§4º). Detalhe em `execucao-cumprimento-previdenciario`.

CF/88, art. 109, §3º, e Lei 5.010/1966, art. 15, III, na redação da Lei 13.876/2019. Competência delegada à Justiça Estadual apenas quando a comarca do domicílio do segurado estiver a mais de 70 km de município sede de Vara Federal.

## Valor da causa e renúncia

Valor da causa: parcelas vencidas até o ajuizamento mais doze vincendas (art. 292, §§1º e 2º, do CPC; art. 3º, §2º, da Lei 10.259/2001). Acima de 60 salários mínimos, o autor pode renunciar expressamente ao excedente para litigar no JEF (Tema 1030 STJ). Essa renúncia não limita a condenação, porque as parcelas vencidas no curso do processo são devidas integralmente, e a renúncia para receber por RPV é colhida na execução (Enunciado 71 FONAJEF).

## Espaço pró-segurado

Primeiro, rito mais célere, sem custas em primeiro grau e sem reexame necessário.

Segundo, tutela de urgência por medida cautelar (art. 4º), recorrível de imediato (art. 5º).

Terceiro, prova técnica simplificada (art. 12) e audiência una com até três testemunhas por parte (art. 34 da Lei 9.099/95).

Quarto, prazos simples para o INSS (art. 9º).

## Estratégia

Primeiro, estimar os atrasados e o valor da causa na data do ajuizamento. Segundo, acima do teto, comparar JEF com renúncia e Vara Federal (`base-rito-ordinario-trf`). Terceiro, petição inicial enxuta com documentos por ID. Quarto, pedir tutela quando cabível. Quinto, preparar quesitos e testemunhas para a audiência.

## Alertas

Primeiro, competência absoluta. Valor acima do teto sem renúncia leva à extinção ou remessa.

Segundo, a renúncia do Tema 1030 não se aproveita para a execução por RPV; nova renúncia na execução, se conveniente.

Terceiro, não cabe ação rescisória no JEF (art. 59 da Lei 9.099/95).

Quarto, intervenção de terceiros é vedada (art. 10 da Lei 9.099/95).

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

Redação em `peticao-previdenciaria`. Recursos em `base-recursos-jef`. Manual TRF3 em `base-jef-trf3-manual-2025`. Execução em `execucao-cumprimento-previdenciario` e `base-cumprimento-sentenca-rpv-precatorio`. Prova do tempo especial em `defesa-probatoria-especial`. Vara Federal em `base-rito-ordinario-trf`.

## Juízo de Catanduva

O perfil do JEF de Catanduva, com as fórmulas de dispensa do relatório, de regularidade, de dispositivo e de fecho, está na skill `base-juizo-catanduva`, e o esqueleto completo da sentença em `base-juizo-catanduva/references/BLOCOS-ESPECIAL-PROCESSO.md`.
