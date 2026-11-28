---
name: ponte-workflow-replica-contestacao
description: "Workflow pró-segurado para responder à contestação do INSS, do diagnóstico à arquitetura da réplica, fixando o incontroverso, repelindo preliminares e desmontando o mérito defensivo ponto a ponto até a peça. Use SEMPRE que mencionar workflow réplica, pipeline réplica, arquitetura da réplica, responder contestação, impugnar contestação, réplica à contestação, preliminares do INSS, fatos incontroversos, impugnação específica, especificação de provas, próximo passo após contestação. Encadeia base-analise-contestacao-inss, os eixos do CPC e a redação da peça. Cruza com base-analise-contestacao-inss, base-cpc-onus-prova-art373, base-cpc-prova-documental-juntada, base-cpc-nulidades-cerceamento, base-cpc-prescricao-decadencia-processual, tema-1124-instrucao-administrativa, coisa-julgada-previdenciaria, especificacao-provas, base-precedentes-catalogo-vinculantes, peticao-previdenciaria e revisao-peticao. NÃO use para decisão judicial (use ponte-workflow-recurso-sentenca) nem para mandado de segurança."
---

# Workflow Réplica à Contestação

## 1. Quando acionar

Sempre que houver contestação do INSS a responder. Pressupõe o mapa de ataque já produzido pela `base-analise-contestacao-inss`. A réplica cabe quando o INSS alega fato impeditivo, modificativo ou extintivo (CPC, art. 350), argui preliminar do art. 337 (art. 351) ou junta documento (art. 437, §1º), sempre em 15 dias. Sem gatilho, avaliar se a réplica agrega.

## 2. Pipeline executável

### Passo 1. Importar o mapa de ataque

Trazer da `base-analise-contestacao-inss` os cinco blocos, preliminares, fatos incontroversos, mérito defensivo, impugnação à prova e provas a especificar.

### Passo 2. Fixar o incontroverso

Abrir a réplica fixando os fatos que a contestação não impugnou de forma específica, art. 341 do CPC, cada um por ID. Contra o INSS a presunção do art. 341 é atenuada por envolver direito indisponível (art. 341, I), mas o fato não impugnado se torna incontroverso para o art. 374, III. Isso reduz a controvérsia e blinda o núcleo do direito. Acionar `base-peticao-previdenciaria-padrao-visual` para o quadro de fatos incontroversos.

### Passo 3. Repelir as preliminares

Rebater cada preliminar do INSS. Prévio requerimento e interesse de agir, acionar `tema-1124-instrucao-administrativa` e `base-efeito-translativo-tema-1124-defesa`. Prescrição e decadência, acionar `base-cpc-prescricao-decadencia-processual`. Coisa julgada e litispendência, acionar `coisa-julgada-previdenciaria`. Cerceamento e nulidade, acionar `base-cpc-nulidades-cerceamento`.

### Passo 4. Desmontar o mérito defensivo

Para cada tese de mérito do INSS, opor a prova por ID e o precedente que a contraria. Acionar a skill base-* do benefício, `base-cpc-onus-prova-art373` para o ônus e a distribuição dinâmica, e `precedentes-previdenciarios` para o contraponto vinculante.

### Passo 5. Documento novo e prova

Havendo documento novo juntado pelo INSS, exercer o contraditório no prazo, art. 437, §1º. Acionar `base-cpc-prova-documental-juntada`. Requerer a produção da prova necessária e não aceitar o julgamento antecipado quando houver prova a produzir.

### Passo 6. Especificação de provas

Encadear com a fase de especificação de provas, fixando os pontos controvertidos e a prova de cada um, sem a resposta genérica de nada a requerer. Acionar `especificacao-provas`.

### Passo 7. Precedentes conferidos

Para cada tese oposta, confirmar o precedente na fonte, na ordem STF, STJ, TNU, Enunciado do CRPS e Súmula da TRU3. Acionar `base-precedentes-catalogo-vinculantes`. Entra apenas citação [CONFERIDO].

### Passo 8. Arquitetura da peça

Montar a estrutura na ordem, fatos incontroversos, repulsa das preliminares, impugnação do mérito ponto a ponto, contraditório dos documentos novos, especificação de provas e pedido. Incluir o parágrafo de realidade quando for pessoa física, acionar `base-peticao-paragrafo-de-realidade`.

### Passo 9. Redação e revisão

Acionar `peticao-previdenciaria` para a peça e `base-peticao-previdenciaria-padrao-visual` para o padrão visual. Acionar `revisao-peticao` e `base-revisao-peticao-aprofundada` para a auditoria pós-redação.

## Skills paralelas

A família `base-auditoria-adversarial-contestacao-inss` e `base-auditoria-adversarial-decisao-judicial` cobre o mesmo terreno que `base-analise-contestacao-inss` e esta ponte. Usar as duas de forma complementar; em conflito, prevalece a que tiver citação [CONFERIDO] em fonte primária.

## 3. Documentos essenciais

Contestação e seus anexos. Petição inicial e documentos por ID. CNIS atualizado. Documentos que provam os fatos afirmados na inicial.

## 4. Pontos críticos pró-segurado

Ônus da impugnação específica, art. 341. O que o INSS não negou de forma específica fica incontroverso (art. 374, III), com a ressalva do direito indisponível. Fixar isso primeiro.

Não reabrir o incontroverso. Réplica que rediscute o que já está a favor do segurado enfraquece a peça.

Especificar prova. Não responder de forma genérica na fase probatória, sob risco de preclusão e julgamento antecipado desfavorável.

Precedente apenas [CONFERIDO], com conferência na fonte.

## 5. Postura

Pró-segurado integral. A réplica não reitera a inicial. Ela fixa o incontroverso, repele preliminar por preliminar, desmonta o mérito defensivo com prova por ID e precedente conferido, e prepara a instrução.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis. Acionar `base-portarias-dpmf-inss-hub` quando o mérito defensivo envolver procedimento, cálculo ou ratificações regidos por portaria.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Cadeia de cada pedido

Toda peça produzida com esta skill passa, antes da entrega, pela conferência individual de cada pedido, ligando pedido, fatos, provas por ID, cálculo ou critério e conclusão jurídica, com correção pontual e sem reescrever a peça. Protocolo em `base-revisao-peticao-aprofundada/references/CADEIA-DO-PEDIDO.md` e Fase 2-A da `peticao-previdenciaria`.
