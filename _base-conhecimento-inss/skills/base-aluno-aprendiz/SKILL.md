---
name: base-aluno-aprendiz
description: "Cômputo do tempo de aluno-aprendiz como tempo de contribuição, com base na Súmula 96 TCU, Súmula 18 TNU, IN 128/2022 e Decreto 4.073/1942. Use SEMPRE que mencionar aluno-aprendiz, tempo de aluno-aprendiz, escola industrial, escola técnica federal, SENAI como aluno-aprendiz, CEFET aluno-aprendiz, escola agrícola federal, ESPCEX, Decreto 4.073/1942, Lei 3.552/1959, Súmula 96 TCU, Súmula 18 TNU, PEDILEF aluno-aprendiz, retribuição pecuniária, Fundo de Caixa Escolar, remuneração aprendiz, cômputo em RPPS, contagem recíproca aluno-aprendiz, certidão ensino técnico federal, prova do período aluno-aprendiz, declaração escolar, histórico escolar federal, Portaria 990/2022, Portaria 1.316/2025. Cruza com cnis-acerto-indicadores, documentos-comprobatorios-in128, peticao-previdenciaria, base-contagem-reciproca-rgps-rpps e precedentes-previdenciarios."
---

# Tempo de Aluno-Aprendiz

## Escopo

Skill temática pró-segurado. Orienta o cômputo do tempo de aluno-aprendiz em escolas industriais, técnicas federais, agrícolas federais e similares, reconhecendo esse período como tempo de contribuição para a previdência, desde que comprovada a retribuição pecuniária à conta do orçamento da União e a vinculação formal ao ensino profissionalizante.

## Marco normativo central

CF/88, art. 201, §9º. Contagem recíproca de tempo de contribuição.

Fundamentos próprios do aluno-aprendiz: Súmula 96 TCU, Súmula 18 TNU, Súmula 24 AGU e art. 201, §9º, CF (o art. 55, I, da Lei 8.213 trata de serviço militar).

Decreto 4.073/1942. Lei Orgânica do Ensino Industrial.

Lei 3.552/1959. Nova organização das escolas técnicas federais.

IN 128/2022. Regras administrativas do INSS sobre cômputo de tempo de contribuição.

Portaria DPMF/INSS 990/2022 (alterada pela Portaria 1.316/2025). Indicadores do CNIS, formulários RAC e regras operacionais.

## Marco jurisprudencial

Súmula 96 TCU. Reconhecimento do tempo de aluno-aprendiz para fins de aposentadoria, desde que haja retribuição pecuniária à conta do orçamento, mesmo que indireta, como alimentação, fardamento ou material escolar custeados pelo Poder Público, em escolas profissionais federais.

Fonte oficial em https://pesquisa.apps.tcu.gov.br

Súmula 18 TNU. "Provado que o aluno-aprendiz de escola pública profissional, no período de 1932 a 1971, recebia remuneração, mesmo que indireta, à conta do orçamento da União, o respectivo tempo de serviço pode ser computado para fins de aposentadoria previdenciária."

Fonte oficial em https://www.jf.jus.br

PEDILEFs da TNU reafirmam a tese.

## Espaço pró-segurado

Primeiro, segurado que frequentou escola técnica federal, escola industrial, escola agrícola ou estabelecimento equivalente em caráter de aluno-aprendiz, com retribuição pecuniária documentada (direta ou indireta).

Segundo, prova por declaração escolar, histórico escolar, ata de formatura, carteira de aluno-aprendiz, certificado.

Terceiro, cômputo do período para tempo de contribuição, inclusive para contagem recíproca com RPPS.

Quarto, carência. O tempo de aluno-aprendiz não compõe carência, apenas tempo de contribuição.

## Decadência e prescrição

Art. 103 da Lei 8.213/91. Decadência decenal em revisão.

Súmula 85 STJ. Prescrição quinquenal.

## Regra pró-segurado

Primeiro, obter declaração oficial da escola sobre o caráter de aluno-aprendiz, com detalhamento do período, da remuneração (direta ou indireta) e do vínculo formal.

Segundo, obter histórico escolar.

Terceiro, documentar a remuneração à conta do orçamento da União.

Quarto, requerimento administrativo.

Quinto, ação judicial em caso de indeferimento.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

## Integração com outras skills

Ao redigir peça, acionar `peticao-previdenciaria`.
Ao documentar prova, acionar `documentos-comprobatorios-in128`.
Para contagem recíproca, acionar `base-contagem-reciproca-rgps-rpps`.
Ao buscar precedentes, acionar `precedentes-previdenciarios`.

## Alertas

Primeiro, a retribuição pecuniária, mesmo indireta, deve ser demonstrada. Sem prova, pedido indefere.

Segundo, o período deve ser de aluno-aprendiz em estabelecimento federal. Aluno comum não gera tempo.

Terceiro, o INSS rotineiramente indefere administrativamente. Via judicial costuma ser necessária.

Quarto, o tempo de aluno-aprendiz não computa carência.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## Doutrina de apoio

Frederico Amado, aluno-aprendiz e Súmula 96 TCU.

Hugo Goes, cômputo do tempo.

Fábio Zambitte Ibrahim, tempo de contribuição atípico.

Wladimir Novaes Martinez, regras de transição.

Daniel Pulino, contagem recíproca.

Marco Aurélio Serau Junior, tempo especial e atípico.

IBDP, defesa do aluno-aprendiz.

## O que NÃO está nesta skill

Contagem recíproca entre regimes está em `base-contagem-reciproca-rgps-rpps`. Tempo militar obrigatório está em `base-servico-militar-obrigatorio`. Tempo rural anterior a 1991 está em `base-tempo-rural-anterior-1991`. Conversão de tempo especial está em `base-tempo-especial-conversao`.
