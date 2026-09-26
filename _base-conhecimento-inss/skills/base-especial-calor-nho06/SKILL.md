---
name: base-especial-calor-nho06
description: "Exposição ao calor para aposentadoria especial pela NHO-06 da Fundacentro, IBUTG, Anexo 3 NR-15, taxa metabólica e enquadramento qualitativo histórico até 1997. Use SEMPRE que mencionar calor aposentadoria especial, NHO-06, IBUTG, Índice de Bulbo Úmido Termômetro de Globo, Anexo 3 NR-15, taxa metabólica calor, atividade pesada calor, atividade moderada calor, atividade leve calor, siderurgia calor, fundição calor, vidraria calor, padaria calor, cozinha industrial calor, fornos calor, caldeiraria calor, enquadramento calor pré-1997, ruído e calor, calor LTCAT, calor PPP campo 15.5, exposição habitual e permanente calor, fator de risco térmico. Cruza com auditoria-ppp, tempo-especial-peticoes-por-rito, peticao-previdenciaria, base-especial-frio-camara-frigorifica, base-especial-radiacao-ionizante, base-especial-penosidade-enfermagem-petroleiro, base-especial-categoria-profissional-pre1995 e defesa-probatoria-especial."
---

# Calor e Aposentadoria Especial

## Escopo

Skill pró-segurado sobre exposição ao calor para aposentadoria especial, metodologia NHO-06, IBUTG e Anexo 3 NR-15.

## Marco normativo central

CF/88, art. 201 §1º.

Lei 8.213/91, arts. 57 e 58.

NR-15, Anexo 3.

NHO-06 Fundacentro.

Decreto 3.048/99.

IN 128/2022.

## Marco jurisprudencial

### Súmula 198 TFR

Categoria profissional.

### Tema 174 TNU

Metodologia.

Fonte oficial em https://www.cjf.jus.br

### Tema 208 TNU

Enquadramento.

### Marco da Lei 9.032/95 (fim do enquadramento por categoria em 28/04/1995)

O enquadramento por categoria vale até 28/04/1995 (Decretos 53.831/64 e 83.080/79). Retirada a Súmula 555/STJ na auditoria 25/07/2026; ela trata de decadência tributária.

## Metodologia NHO-06

Primeiro, IBUTG é o índice oficial.

Segundo, taxa metabólica define limite.

Terceiro, comparação com Anexo 3 NR-15.

Quarto, exposição habitual e permanente.

## Aplicação pró-segurado

Primeiro, atividade pesada com IBUTG acima de 25 enquadra.

Segundo, moderada acima de 26,7 enquadra.

Terceiro, leve acima de 30 enquadra.

Quarto, métodos antigos preservam direitos.

## Cenários pró-segurado

Cenário A, siderurgia. Calor intenso. Especial.

Cenário B, fundição. Calor intenso. Especial.

Cenário C, padaria com fornos. Calor moderado. Especial.

Cenário D, cozinha industrial. Calor moderado. Especial.

Cenário E, atividade pré-1995. Categoria profissional.

## Alertas

Primeiro, INSS pode exigir avaliação NHO-06 estrita. NR-15 supre quando suficiente.

Segundo, taxa metabólica precisa estar correta no PPP.

Terceiro, ausência de medição não afasta enquadramento histórico.

Quarto, perícia judicial cabível.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## Doutrina de apoio

Sebastião Geraldo de Oliveira.

Frederico Amado.

Hugo Goes.

Marco Aurélio Serau Junior.

IBDP.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

## Integração com outras skills

Para auditoria de PPP, acionar `auditoria-ppp`.
Para frio, acionar `base-especial-frio-camara-frigorifica`.
Para radiação, acionar `base-especial-radiacao-ionizante`.
Para penosidade, acionar `base-especial-penosidade-enfermagem-petroleiro`.
Para categoria pré-1995, acionar `base-especial-categoria-profissional-pre1995`.

## O que NÃO está nesta skill

Frio em `base-especial-frio-camara-frigorifica`. Radiação em `base-especial-radiacao-ionizante`. Penosidade em `base-especial-penosidade-enfermagem-petroleiro`. Categoria em `base-especial-categoria-profissional-pre1995`.
