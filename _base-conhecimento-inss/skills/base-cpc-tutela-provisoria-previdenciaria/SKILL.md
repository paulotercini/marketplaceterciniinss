---
name: base-cpc-tutela-provisoria-previdenciaria
description: "Tutela provisória (arts. 294 a 311 CPC) aplicada ao Direito Previdenciário, tutela de urgência antecipada e cautelar, tutela de evidência, estabilização do art. 304, requisitos pró-segurado, caráter alimentar e hipossuficiência. Use SEMPRE que mencionar tutela provisória, tutela de urgência, tutela antecipada, tutela cautelar, tutela de evidência, liminar previdenciária, implantação imediata, restabelecimento liminar, perigo de dano previdenciário, probabilidade do direito, reversibilidade, art. 294 CPC, art. 300 CPC, art. 303 CPC, art. 304 CPC, art. 311 CPC, estabilização de tutela, fumus boni iuris previdenciário, natureza alimentar, irreversibilidade benefício. Cruza com peticao-previdenciaria, revisao-peticao, precedentes-previdenciarios, base-cpc-fato-superveniente-art493 e mandado-seguranca-previdenciario."
---

# Tutela Provisória no Direito Previdenciário

## Escopo

Skill pró-segurado sobre tutela provisória (CPC/2015 arts. 294 a 311) em ações previdenciárias, com foco em concessão de benefício, restabelecimento de benefício cessado, implantação imediata e estabilização.

## Marco normativo central

CPC, art. 294. Tutela provisória é de urgência ou de evidência.

CPC, art. 300. Requisitos da tutela de urgência.

CPC, art. 303. Tutela antecipada antecedente.

CPC, art. 304. Estabilização.

CPC, art. 311. Tutela de evidência.

Lei 8.213/91, art. 41-A, §5º. Prazo de 45 dias para o primeiro pagamento (implantação).

## Espécies aplicáveis

Primeiro, tutela de urgência antecipada incidental em ação previdenciária.

Segundo, tutela de urgência cautelar para preservar pretensão (ex. prova pericial).

Terceiro, tutela antecipada antecedente (art. 303) em caso de extrema urgência.

Quarto, tutela de evidência (art. 311), especialmente inciso II (tese firmada em repetitivo).

## Requisitos pró-segurado

Primeiro, probabilidade do direito. O caráter alimentar e a urgência concreta reforçam (auditoria 25/07/2026, retirado o Tema 313/STJ, matéria tributária).

Segundo, perigo de dano. Presunção pró-segurado em benefício alimentar.

Atenção (risco): o Tema 692 do STJ determina a DEVOLUÇÃO dos valores recebidos por tutela antecipada posteriormente revogada (com desconto de até 30% do benefício). Não o invoque como escudo de boa-fé; a irrepetibilidade deve ser buscada em fundamentos próprios (ex.: benefício assistencial; Tema 979 com boa-fé objetiva), com cautela.

## Cenários pró-segurado

Cenário A, concessão de aposentadoria com DER e documentação completa. Tutela cabível.

Cenário B, restabelecimento de B31 cessado sem perícia. Tutela cabível.

Cenário C, implantação de B91 com laudo pericial judicial favorável. Tutela cabível.

Cenário D, tutela de evidência em tese firmada (Tema 1102/STF RVT, Tema 76/STF teto, Tema 1124/STJ).

## Estabilização (art. 304)

Segurado obtém tutela antecipada antecedente. INSS não recorre. Processo é extinto com estabilização. Art. 304, §5º, CPC exige ação revisional em 2 anos (o §6º trata da ausência de coisa julgada). Tema 1085/STJ em discussão.

## Alertas

Primeiro, em ação por incapacidade, aguardar laudo pericial judicial antes de tutela pode ser mais seguro.

Segundo, em RVT exigir tabela comparativa DIB atual vs DIB reajustada.

Terceiro, tutela em MS não é tutela antecipada, é liminar (Lei 12.016/2009 art. 7º III).

Quarto, suspensão de segurança pela Presidência (Lei 8.437/92) é risco concreto, preparar contrarrazões.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## Doutrina de apoio

Fredie Didier Jr, Rafael Oliveira, Paula Sarno Braga, Curso de Direito Processual Civil vol. 2.

Cássio Scarpinella Bueno, Manual de Direito Processual Civil.

Marco Aurélio Serau Junior, Processo Previdenciário.

Jane Berwanger, previdenciário.

José Antonio Savaris, Direito Processual Previdenciário.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

## Integração com outras skills

Para fato superveniente, acionar `base-cpc-fato-superveniente-art493`.
Para coisa julgada progressiva, acionar `base-cpc-coisa-julgada-progressiva`.
Para redação, acionar `peticao-previdenciaria`.
Para MS, acionar `mandado-seguranca-previdenciario`.

## O que NÃO está nesta skill

Liminar em MS em `mandado-seguranca-previdenciario`. Cumprimento de tutela em `execucao-cumprimento-previdenciario`. Estabilização com fundo em `base-cpc-coisa-julgada-progressiva`.
