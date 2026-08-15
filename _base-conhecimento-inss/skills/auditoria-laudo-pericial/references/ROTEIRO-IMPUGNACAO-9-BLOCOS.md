# Roteiro de Impugnação em 9 Blocos

Incorporado na Onda 84 (25/07/2026) a partir do prompt operacional do escritório, para que a auditoria dirigida à impugnação rode sem colar prompt. Este roteiro é o Modo 3 da skill `auditoria-laudo-pericial` e se executa por inteiro, na ordem, sem preâmbulo na saída.

## Postura de dupla camada

Atuar em duas camadas simultâneas. Assistente técnico (médico do trabalho ou engenheiro de segurança, conforme a natureza do laudo) e advogado previdenciário do segurado com longa experiência em JEF e Justiça Federal. Nunca produzir argumento favorável ao INSS.

## Leitura obrigatória

Ler integralmente o laudo pericial anexo, os documentos médicos do autor, o CNIS e a decisão administrativa de indeferimento, se houver. Não resumir. Leitura por amostragem é proibida. Antes dos blocos, executar a Trava de Verificação da skill (contagem de contribuições até a DII, prova de agravamento se doença anterior à filiação, rito do benefício anterior antes de alegar contradição).

## Os 9 blocos, na ordem

### Bloco 1. Falhas metodológicas

As três a cinco falhas mais graves do laudo, em linguagem simples, cada uma com a página ou item exato do laudo em que aparece.

### Bloco 2. Contradições internas

Confrontar o corpo do laudo (anamnese, exame físico, exames complementares descritos) contra a conclusão. Apontar cada trecho em que o perito afirma algo que não sustenta a conclusão entregue ao juiz. Formato obrigatório, "trecho A na página X contra trecho B na página Y".

### Bloco 3. Confronto com a prova documental

Apontar todo documento médico do autor que o perito ignorou, mencionou sem enfrentar ou desqualificou sem fundamento. Identificar cada um pelo ID dos autos. Este bloco pressupõe o Modo 2 (cruzamento completo). Sem os documentos médicos na conversa, declarar a limitação e pedir os documentos antes de fechar o bloco.

### Bloco 4. Padrão técnico exigido

Indicar o protocolo, a norma ou o critério diagnóstico exigido para esse tipo de avaliação e dizer se o perito o seguiu. Regra dura, só citar norma, resolução do CFM, portaria, NHO ou critério de sociedade médica que se possa nomear com número, ano e órgão emissor. Sem certeza da vigência e da redação, escrever "não localizado, verificar em fonte primária" e não inventar substituto. Em dúvida sobre norma, cruzar com a `base-legislacao-fontes-primarias` e a `base-validacao-formal-laudo-medico-checklist-ab`.

### Bloco 5. Vícios jurídicos

Traduzir cada falha técnica em vício processual. Laudo insuficiente para julgar, ausência de resposta a quesito, omissão de exame complementar, avaliação puramente clínica de doença que exige exame de imagem, ausência de enfrentamento da atividade habitual real, desconsideração de condições pessoais e sociais (Súmula 47 da TNU). Apontar o dispositivo do CPC aplicável usando o mapa da skill `base-cpc-prova-pericial-arts464-480` (fundamentação do laudo no art. 473, esclarecimentos no art. 477, §§ 1º e 2º, não adstrição no art. 479, segunda perícia no art. 480). Sinalizar [CONFERIDO] ou [NÃO CONFIRMADO] em cada citação legal ou jurisprudencial. Lote de três ou mais citações não confirmadas vai ao agente `verificador-precedentes`.

### Bloco 6. Verificações obrigatórias

Conferir e informar carência, qualidade de segurado e se a DII fixada pelo perito cai dentro do período de manutenção. Se cair fora, destacar em alerta. Verificar DID contra DII, agravamento de doença preexistente, doença isenta de carência (art. 26, II, e art. 151 da Lei 8.213/91) e concausa. Cruzar com `periodo-graca-qualidade-segurado` e `base-carencia-por-especie-art27a`.

### Bloco 7. Quesitos suplementares

Cinco a oito quesitos cirúrgicos, cada um vinculado a uma falha já apontada nos blocos 1 a 5, formulados para resposta direta e para forçar o perito a admitir o erro ou expor a lacuna. Sem quesito genérico, sem pergunta que o perito possa responder com "mantenho o laudo". Cada quesito indica entre parênteses o bloco e o achado a que se vincula.

### Bloco 8. Estrutura da peça

Montar a estrutura da impugnação ao laudo, com os tópicos na ordem de ataque, pedido de esclarecimentos (art. 477 do CPC), pedido de complementação e, se a falha for estrutural, pedido de nova perícia com perito de especialidade compatível (art. 480 do CPC). Indicar o que pedir em cada cenário e qual a alternativa se o juiz negar (esclarecimentos negados abrem caminho para cerceamento de defesa, conforme `base-cpc-nulidades-cerceamento`). A redação final da peça segue a skill `peticao-previdenciaria`.

### Bloco 9. Risco

Apontar o ponto mais frágil da nossa impugnação, o que o INSS vai responder e como neutralizar. Quando a peça de impugnação estiver redigida, o teste completo do adversário é do agente `red-team-peticao`.

## Regras de saída

Português do Brasil, formal e jurídico, sem coloquialismo. Proibido travessão. Proibido dois-pontos para introduzir lista ou explicação. Proibida a estrutura "não é X, é Y". Parágrafos de três a quatro linhas. Sempre ligar fato à prova (por ID) e à norma. Não inventar número de processo, artigo, data, relator, precedente ou norma técnica. Sem confirmação oficial, escrever "não localizado".

Ao final da saída, uma linha de auditoria respondendo o que ainda soa como texto gerado por IA, seguida da reescrita dos trechos que sobraram. A skill `humanizador-tedson`, quando disponível no ambiente, executa essa passada final.

## Honestidade radical

Vale integralmente a regra da skill. Se o laudo for tecnicamente sólido, os blocos 1 a 5 declaram isso com clareza em vez de forçar achados, e os blocos 7 a 9 se convertem em estratégia alternativa (parecer de assistente técnico ou aproveitamento dos elementos favoráveis do próprio laudo).
