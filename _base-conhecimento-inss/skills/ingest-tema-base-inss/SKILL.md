---
name: ingest-tema-base-inss
description: "Automação de ingestão de novo tema na base-conhecimento-inss. Use SEMPRE que mencionar ingerir tema INSS, processar ZIP de prints, gerar nova skill temática, novo lote de redes sociais, sanitizar prints, OCR prints INSS, converter prints em skill, tema novo do acervo, registrar novo tema, expansão da base. Fluxo de 8 etapas. Descompacta ZIP no diretório de trabalho. OCR por Tesseract em português. Consolida texto em _ocr_bruto.txt. Extrai candidatos por regex de Tema, Súmula, Enunciado, Decreto, NHO, NR, TNU, STJ, STF, PEDILEF, Comunicado, Parecer, IRDR. Verificação obrigatória em fonte primária oficial. Redação no padrão do escritório Paulo Tercini sem dois-pontos. Validação de 1024 caracteres no description. Gera SKILL.md e references com FUNDAMENTOS-E-CENARIOS.md e JURISPRUDENCIA-E-REFUTACAO.md. Postura pró-segurado exclusiva. Doutrina reconhecida incorporada. Integra com peticao-previdenciaria, auditoria-ppp, base-especial-epi, precedentes-previdenciarios."
---

# Ingestão de Tema na Base de Conhecimento INSS

## Escopo

Skill de automação da pipeline que transforma um ZIP de prints do acervo temático do escritório Paulo Roberto Tercini Filho em nova skill temática da `base-conhecimento-inss`. Não redige peça processual nem parecer técnico. É ferramenta de backend editorial.

## Pré-requisitos

Primeiro, ZIP recebido em `/sessions/fervent-bold-lovelace/plugin/base-conhecimento-inss/_ingest/<slug>.zip`. O slug deve seguir o padrão kebab-case, por exemplo `base-especial-calor`.

Segundo, Tesseract 4.x instalado com pacote `por` em `/sessions/fervent-bold-lovelace/tessdata/` e variável `TESSDATA_PREFIX` configurada.

Terceiro, diretório de trabalho `/sessions/fervent-bold-lovelace/onda<N>/<slug>/` para artefatos intermediários.

## Fluxo obrigatório em 8 etapas

### Etapa 1. Descompactação

Descompacte o ZIP para `/sessions/fervent-bold-lovelace/onda<N>/<slug>/raw/`. Rejeite arquivos executáveis e mantenha apenas imagens (png, jpg, jpeg, webp, bmp) e PDFs.

### Etapa 2. OCR em português

Aplique `tesseract` com idioma `por` em cada imagem. Gere um arquivo de texto por imagem e consolide em `_ocr_bruto.txt`. Para PDFs, extraia por `pdftoppm` e aplique OCR em cada página.

### Etapa 3. Extração de candidatos de teses

Aplique regex de triagem sobre `_ocr_bruto.txt` com padrões para Tema, Súmula, Enunciado, Decreto, NHO, NR, TNU, STJ, STF, PEDILEF, Comunicado, Parecer, REsp, ADI, ADPF e IRDR. Gere lista bruta de menções.

### Etapa 4. Verificação em fonte primária oficial

Obrigatório. Antes de citar qualquer tese, acesse fonte oficial e confirme número, tese, vigência e fonte. Fontes primárias aceitas incluem https://www.cjf.jus.br, https://www.stj.jus.br, https://portal.stf.jus.br, https://www.trf3.jus.br, https://www.trf4.jus.br, https://www.gov.br/inss, https://www.gov.br/trabalho-e-emprego. Em caso de impossibilidade de confirmação, marque como "Não localizado" e não inclua na skill.

### Etapa 5. Arquitetura dos arquivos

Crie `skills/<slug>/SKILL.md` com YAML frontmatter (name, description) seguido de corpo markdown. Crie subpasta `skills/<slug>/references/` com `FUNDAMENTOS-E-CENARIOS.md` e `JURISPRUDENCIA-E-REFUTACAO.md`.

### Etapa 6. Redação no padrão do escritório

Aplique as regras rígidas. Ausência absoluta de dois-pontos como separador lógico. Postura exclusivamente pró-segurado. Português do Brasil. Parágrafos curtos, diretos e persuasivos. Doutrina reconhecida incorporada em cláusula final (Frederico Amado, Hugo Goes, Fábio Zambitte Ibrahim, Wladimir Novaes Martinez, IBDP).

### Etapa 7. Validação técnica

Valide que o campo description tem até 1024 caracteres. Valide que não há dois-pontos no corpo do arquivo, salvo em frontmatter YAML. Valide que toda jurisprudência citada tem fonte oficial verificada. Valide a integração com outras skills pelas seções padrão.

### Etapa 8. Publicação no workspace

Copie o conteúdo para `/sessions/fervent-bold-lovelace/mnt/INSS/_base-conhecimento-inss/skills/<slug>/` para inspeção do usuário. Gere nota resumida com links `computer://`.

## Script auxiliar

O script `scripts/ingest-tema.sh` implementa as etapas 1 a 3. Uso `ingest-tema.sh <caminho-zip> <slug>`. Resultado em `/sessions/fervent-bold-lovelace/onda<N>/<slug>/_ocr_bruto.txt`.

As etapas 4 a 8 são manuais e dependem da triagem editorial pelo advogado responsável.

## Regras inegociáveis

Primeiro, nenhuma tese entra na skill sem verificação em fonte primária oficial.

Segundo, nenhuma skill é publicada com description acima de 1024 caracteres.

Terceiro, nenhuma skill é publicada com dois-pontos como separador lógico no corpo.

Quarto, postura exclusivamente pró-segurado do INSS. Argumento favorável ao INSS, à Fazenda Pública ou à autarquia jamais consta da skill.

Quinto, doutrina reconhecida é incorporada em cláusula própria, sempre ao final do SKILL.md e do JURISPRUDENCIA-E-REFUTACAO.md.

Sexto, cada skill nova passa por revisão editorial antes da publicação definitiva. Dúvida de vigência resulta em "Não localizado" e exclusão do item da redação.

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".

## Integração com outras skills

Ao redigir peça, acione `peticao-previdenciaria`.
Ao auditar PPP, acione `auditoria-ppp`.
Ao refutar EPI eficaz, acione `base-especial-epi`.
Ao verificar precedentes vinculantes, acione `precedentes-previdenciarios`.

## O que NÃO está nesta skill

Não há redação substantiva de teses. Não há enquadramento de agentes específicos. Cada tema terá skill temática própria. Esta skill é meramente o pipeline de produção editorial.
