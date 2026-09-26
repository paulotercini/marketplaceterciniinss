---
name: base-jef-previdenciario
description: "Juizado Especial Federal previdenciário, Lei 10.259/2001, competência pelo valor da causa, teto de 60 salários-mínimos, dispensa de reexame necessário, prova técnica simplificada. Use SEMPRE que mencionar JEF, Juizado Especial Federal, Lei 10.259, competência JEF, valor da causa JEF, 60 salários-mínimos JEF, renúncia excedente, prova técnica simplificada, Enunciado FONAJEF, competência absoluta JEF, Tema 1030 STJ, art. 3º Lei 10.259, art. 17 §4º Lei 10.259, teto JEF, art. 12 Lei 10.259, petição inicial JEF, citação JEF, contestação JEF, rito sumaríssimo previdenciário, competência delegada JEF, Tema 1086 STJ, economicidade JEF, simplicidade JEF, oralidade JEF, informalidade, TRF3. Cruza com peticao-previdenciaria, revisao-peticao, precedentes-previdenciarios, base-recursos-jef, base-cumprimento-sentenca-rpv-precatorio e defesa-probatoria-especial."
---

# Juizado Especial Federal Previdenciário

## Escopo

Skill pró-segurado que orienta a atuação processual no JEF, competência pelo valor da causa (até 60 salários-mínimos), renúncia ao excedente, dispensa de reexame necessário, princípios (oralidade, simplicidade, informalidade, economia processual e celeridade) e prova técnica simplificada. Fonte operacional do escritório para demandas previdenciárias de médio valor.

## Marco normativo central

CF/88, art. 98, §1º. Autorização para criação dos Juizados Especiais Federais.

Lei 10.259/2001. Estatui os Juizados Especiais Federais Cíveis e Criminais.

Lei 9.099/1995. Aplicação subsidiária.

Regimentos dos Juizados Especiais Federais (RI-JEF) de cada Região Federal.

TRF3, jurisprudência consolidada da Terceira Região, em especial pela 7ª, 8ª, 9ª e 10ª Turmas.

## Regras de competência

Art. 3º, Lei 10.259/2001. Competência absoluta do JEF para causas de valor até 60 salários-mínimos no momento da distribuição.

Art. 3º, §3º, Lei 10.259/2001. Competência absoluta, no foro onde há JEF instalado.

Art. 17, §4º, Lei 10.259/2001. Execução no próprio JEF, RPV até o teto.

Art. 109, §3º, CF/88, combinado com Súmulas. Competência delegada à Justiça Estadual onde não houver JEF.

Tema 1030 STJ. Renúncia ao excedente valor da causa.

Tema 1086 STJ. Alçada JEF e desmembramento.

## Princípios processuais

Oralidade. Audiência como momento central.

Simplicidade. Peças enxutas, foco na tese e nos documentos.

Informalidade. Rigidez formal mitigada.

Economia processual. Menor número de atos.

Celeridade. Duração razoável.

Gratuidade da primeira instância.

## Espaço pró-segurado

Primeiro, o JEF é o rito mais célere e econômico para segurados. Demandas de até 60 salários-mínimos devem, em regra, ser propostas no JEF.

Segundo, renúncia ao excedente é estratégia para enquadramento no rito, quando vantajoso.

Terceiro, dispensa de reexame necessário. Decisão de 1º grau contra o INSS produz efeitos imediatos, exceto se houver recurso.

Quarto, tutela de urgência é amplamente admitida.

Quinto, prova técnica simplificada (perícia médica, social, contábil) é ágil.

Sexto, execução da RPV no mesmo juízo, com prazo de 60 dias para pagamento após requisição.

## Estratégia processual

Primeiro, análise do valor da causa e estimativa dos atrasados.

Segundo, se couber no teto, JEF. Se ultrapassar, avaliar renúncia ao excedente.

Terceiro, petição inicial enxuta, com foco nos fatos, na tese e nos documentos.

Quarto, requerimento de tutela de urgência quando cabível.

Quinto, lista de documentos por ID.

Sexto, audiência una preparada (testemunhas e perícia).

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

## Integração com outras skills

Ao redigir petição, acionar `peticao-previdenciaria`.
Ao manejar recursos no JEF, acionar `base-recursos-jef`.
Ao cumprir sentença, acionar `base-cumprimento-sentenca-rpv-precatorio`.
Em pedidos especiais, acionar `defesa-probatoria-especial`.
Em casos com tutela, acionar a política do escritório de tutela de urgência.

## Alertas

Primeiro, competência é absoluta. Erro de rito gera deslocamento.

Segundo, renúncia ao excedente é irretratável e vincula a execução.

Terceiro, o JEF não admite intervenção de terceiros, salvo assistência simples em regra restrita.

Quarto, FAZENDA pública recorre no JEF somente por recurso inominado, embargos de declaração, IUJEF e pedidos de uniformização.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## Doutrina de apoio

Frederico Amado, processo previdenciário.

Hugo Goes, JEF.

Marco Aurélio Serau Junior, processo previdenciário.

Daniel Pulino, procedimento.

Jane Berwanger, processo previdenciário.

IBDP, advocacia previdenciária.

## O que NÃO está nesta skill

Rito ordinário em Vara Federal está em `base-rito-ordinario-trf`. Recursos no JEF estão em `base-recursos-jef`. CRPS está em `base-crps-panorama-geral`. Cumprimento de sentença está em `base-cumprimento-sentenca-rpv-precatorio`.
