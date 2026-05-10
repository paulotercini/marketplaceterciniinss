---
name: base-meu-inss-pat-gerid-fluxo
description: "Fluxo operacional pró-segurado dos sistemas administrativos do INSS, incluindo Meu INSS, PAT/GERID, HISCRE, INFBEN, DataPrev, Gov.br e protocolo eletrônico de requerimentos. Use SEMPRE que mencionar Meu INSS, MEUINSS, PAT, GERID, HISCRE, INFBEN, DataPrev, Gov.br, protocolo INSS, requerimento eletrônico INSS, exigência eletrônica, INFBEN, OCAB, telegrama INSS, recurso pelo Meu INSS, recurso pelo PAT, agendamento de perícia, agendamento de PRP, atendimento INSS, login Gov.br, certificado digital INSS, gerador de senha INSS, recadastrar Meu INSS, plataforma de procuradores, gestão de procurações INSS, anexar documentos Meu INSS, comunicar autorizado, prova de vida digital, recadastramento biométrico, INSS Empresa, sistema INSS Empresa, consulta empregador benefício INSS, Portaria DTI/DIRBEN/INSS 156/2026, Art. 576-A vedação requerimento simultâneo, processo em curso mesma espécie benefício, novo requerimento bloqueado processo pendente. Cruza com base-cnis-conferencia-divergencias, base-pericia-medica-federal-telepericia, base-canais-falabr-corregedoria-cgu, base-pfe-inss-anpd-dpu-conade, base-aposentadoria-futura-pipeline e base-erro-administrativo-iea-13975."
---

# Sistemas Administrativos do INSS - Fluxo Operacional

## Escopo

Skill operacional pró-segurado do escritório Paulo Roberto Tercini Filho. Documenta o uso correto e os atalhos dos sistemas administrativos do INSS para acompanhamento de benefícios e protocolos. A auditoria identificou que o escritório acessa diariamente Meu INSS (159 menções), HISCRE (129), PAT/GERID (116), CNIS (79) e Gov.br (62), mas não há padronização única documentada. Esta skill consolida o conhecimento.

## Premissa central

Os sistemas do INSS funcionam como camadas diferentes do mesmo dado. Saber qual camada consultar para qual pergunta economiza tempo e evita erros. O Meu INSS é a vitrine do segurado. O PAT é o painel do procurador. O HISCRE é o histórico de créditos do benefício. O INFBEN é o detalhe técnico do benefício concedido. Cada um tem ciclo próprio de atualização e janela de acesso.

## Sistemas e função

### Meu INSS (https://meu.inss.gov.br)

Plataforma do segurado, acessada por login Gov.br. Permite ao segurado consultar requerimentos, agendar serviços, anexar documentos a exigências, acompanhar perícias agendadas, baixar carta de concessão, declaração de beneficiário, extrato de pagamento.

O escritório acessa via plataforma de procuradores (segurado precisa autorizar como procurador no Meu INSS). Acesso é nominal e logado. Cada protocolo do escritório fica vinculado ao login.

**Como o escritório usa.** Protocolar requerimentos administrativos, anexar documentos a exigências do INSS, acompanhar perícias, baixar comprovantes, conferir status atualizado.

**Limitação.** Não exibe motivos detalhados de indeferimento. Para isso, o PAT é melhor.

### PAT (Painel de Acompanhamento Tarifado) e GERID

Painel administrativo interno do INSS, acessível pelo procurador devidamente cadastrado com certificado digital A3. Mostra detalhe técnico de cada requerimento, inclusive análise interna do servidor, fundamento de indeferimento, observações do analista, prazos internos.

**Como o escritório usa.** Para diagnóstico fino do que aconteceu com um requerimento. Quando o Meu INSS só mostra "Indeferido" sem motivo, o PAT mostra a análise interna que permite formular recurso fundamentado.

**Restrição.** Acesso apenas com certificado digital A3 do advogado. Janela de sessão curta. Demanda atualização periódica do certificado.

### HISCRE (Histórico de Créditos)

Sistema que mostra os créditos pagos pelo INSS em determinado benefício. Permite verificar se houve pagamento, valor, competência, data de crédito.

**Como o escritório usa.** Verificar implantação efetiva de benefício concedido (crédito caiu na conta), confirmar valor implantado, verificar pagamento de atrasados, identificar erro de cálculo de RMI.

**Atualização.** Pode demorar até 30 dias entre concessão e aparição no HISCRE. Não é instantâneo.

### INFBEN (Informação do Benefício)

Sistema que mostra o detalhe técnico do benefício concedido, inclusive RMI inicial, fórmula de cálculo, espécie, DIB, DCB, DIP, número do benefício (NB).

**Como o escritório usa.** Após concessão, conferir se o RMI está correto. Identificar oportunidade de revisão. Validar reafirmação da DER.

### DataPrev

Subsidiário ao INSS para informações cadastrais e de vínculos de trabalho. Em geral consulta-se via CNIS, que é a interface do segurado para os dados DataPrev.

### Gov.br

Plataforma de identidade unificada. Login nível Prata ou Ouro habilita o segurado a acessar Meu INSS. Senha do Gov.br confunde-se frequentemente com senha de banco. O escritório registra a senha do Gov.br do cliente em checklist da tarefa, em formato curto (8 a 12 caracteres).

**Atenção a recadastramento.** Periodicamente o Gov.br força o usuário a renovar senha ou cadastrar segundo fator. Quando isso ocorre, o login do escritório falha e o cliente precisa recadastrar pessoalmente. É causa frequente de tarefa parada por incapacidade de acesso.

### CNIS (Cadastro Nacional de Informações Sociais)

Histórico de vínculos de emprego, contribuições e remunerações do segurado. Acessível pelo Meu INSS ou diretamente pelo INSS Digital.

**Como o escritório usa.** Auditoria pré-protocolo. Identificar contribuições faltantes, lacunas, vínculos não computados, divergências entre CTPS e CNIS.

## Atalhos operacionais

### Ordem de consulta padrão

1. Cliente diz que protocolou ou que algo está pendente. Primeiro abrir o **Meu INSS** para confirmar status visível pelo segurado.
2. Se status indicar problema sem detalhe, abrir o **PAT** para diagnóstico fino.
3. Se for caso de concessão, conferir **HISCRE** (pagamento) e **INFBEN** (cálculo).
4. Se houver divergência de cálculo ou tempo, voltar ao **CNIS** para conferir base.

### Senhas em checklist

Padrão atual do escritório armazena senha do Gov.br do cliente como item do checklist da tarefa, em formato curto. Risco de segurança identificado pela auditoria. Recomendação de longo prazo é migrar para gerenciador de senhas externo (Bitwarden ou 1Password) com integração via lookup. Por ora, manter o padrão e tratar a lista 🔒 Paulo Acessos como sensível.

### Telegrama (OCAB) e comunicações eletrônicas

INSS comunica decisões por telegrama postal e por mensagem no Meu INSS. O escritório acompanha pelo OCAB (Ofício Comunicado Anexo Benefício) que aparece no histórico do PAT. Sempre verificar comunicações nos dois canais. A skill `base-canais-falabr-corregedoria-cgu` cobre Ouvidoria.

### Anexar documentos a exigência

Pelo Meu INSS o segurado anexa documentos para cumprir exigência. PDF de até 5 MB cada. Múltiplos arquivos podem ser anexados. Gerar PDFs do escritório com nome do cliente e tipo de documento ("CTPS_FulanoTal.pdf"). Após upload, confirmar no PAT que apareceu no protocolo.

### Tempo de processamento

Após DER, INSS tem prazo legal de 45 dias para análise (Lei 9.784/1999, art. 49). Na prática a mediana é 90 a 180 dias. Após 60 dias sem decisão, MS por mora cabível pelo Tema 1066 STF. Skill `base-ms-decadencia-omissao-demora`.

### Sistema fora do ar

Quando Meu INSS está fora do ar, comum em fim de mês. Tentativas devem ser registradas com print no body da tarefa. Se afetar prazo, é causa de força maior para reabertura.

## Hipóteses-armadilha

**Cliente "concedido" mas sem pagamento.** Verificar HISCRE. Implantação pode atrasar 30 dias. Se passar disso sem crédito, MS de cumprimento. Skill `base-ms-cumprimento-inss`.

**Indeferimento por exigência não cumprida.** Verificar PAT para identificar qual exigência. Se a exigência foi cumprida no Meu INSS mas o INSS alegou descumprimento, juntar prova do upload e formular recurso.

**DIB diferente de DER.** INSS pode arbitrar DIB diferente da DER pedida. Se prejudicial ao cliente, recorrer reclamando reafirmação ou retroação.

**RMI diferente do simulado.** Conferir INFBEN para fórmula aplicada. Se erro identificado, revisão administrativa em 10 anos (decadência) ou ação ordinária.

**Bloqueio por suspeita de fraude.** Cliente notificado de bloqueio. Verificar PAT para motivo. Pode ser causa de defesa administrativa via Ouvidoria + CGU.

## Estratégia administrativa

Sempre tentar resolver pelo PAT/Meu INSS antes de judicializar. Após DER, oferecer ao INSS oportunidade de cumprir o que deve. Insistência administrativa é mais barata e rápida quando funciona, e quando falha justifica a judicialização.

Em casos de erro material no INFBEN (RMI calculada errada), o pedido de revisão administrativa pode resolver em até 60 dias. Skill `base-erro-administrativo-iea-13975`.

## Estratégia judicial

Quando o sistema administrativo falha, MS é o remédio rápido para mora ou descumprimento. Ação ordinária para divergência de cálculo, especial não enquadrado, recálculo retroativo. JEF para causas até 60 salários mínimos. Cumprimento de sentença para implantação após decisão judicial.

## Integração com outras skills do escritório

- `base-cnis-conferencia-divergencias` para auditoria CNIS pré-protocolo
- `base-pericia-medica-federal-telepericia` para perícias agendadas no Meu INSS
- `base-canais-falabr-corregedoria-cgu` para Ouvidoria
- `base-pfe-inss-anpd-dpu-conade` para procuradoria federal
- `base-erro-administrativo-iea-13975` para revisão administrativa
- `base-ms-cumprimento-inss` para mora de implantação
- `base-aposentadoria-futura-pipeline` para protocolo no momento da maturação

## Métrica de sucesso

- Tempo médio entre DER e diagnóstico no PAT (meta menos de 7 dias após disponibilidade da análise)
- Tempo médio entre concessão e implantação efetiva no HISCRE (meta menos de 45 dias)
- Quantidade de tarefas paradas por problema de acesso ao sistema (meta zero)

## Link operacional

- Meu INSS https://meu.inss.gov.br
- Gov.br https://acesso.gov.br
- Plataforma de procuradores https://www.gov.br/inss/pt-br/canais_atendimento/procuradores
- PAT (acesso restrito a advogados com certificado A3)

## Atualização DOU 06/05/2026

Norma: Portaria DTI/DIRBEN/INSS nº 156, de 28 de abril de 2026
Órgão: Diretoria de Tecnologia da Informação e Diretoria de Benefícios do INSS
Vigência: 15 de maio de 2026
Resumo da alteração: A Portaria instituiu o sistema INSS Empresa, canal oficial pelo qual empresas acessam via conta gov.br com certificado digital vinculado ao CNPJ dados de afastamentos e benefícios previdenciários de seus empregados. O sistema exibe espécie do benefício, datas de requerimento, aprovação, início e encerramento e status atual. O objetivo declarado é modernização digital e cumprimento de obrigações legais pelas empresas, com conformidade à LGPD. A vigência é 15 de maio de 2026, cinco dias a partir da data deste monitoramento.
Impacto na advocacia: Clientes que recebem benefício por incapacidade (B31, B91, B92) e mantêm vínculo empregatício ficam expostos à consulta direta do empregador a partir de 15/05/2026. O sistema é restrito ao CNPJ da empresa e ao vínculo existente entre empresa e segurado, mas a visibilidade da espécie, do status ativo e das datas do benefício é suficiente para que o empregador identifique a situação de incapacidade do trabalhador. Há risco real de dispensa discriminatória baseada em informação de benefício ativo ou de pressão para retorno prematuro ao trabalho. Clientes que não informaram ao empregador a existência do benefício podem ser confrontados com inconsistência.
Estratégia: Orientar imediatamente todo cliente com vínculo empregatício ativo e benefício por incapacidade em curso a comunicar a situação ao empregador antes de 15/05/2026, reduzindo risco de surpresa. Avaliar, caso a caso, se há risco de dispensa discriminatória e adotar tutela inibitória antes da vigência do sistema. Em caso de dispensa após 15/05/2026 com fundamento ou coincidência temporal com a consulta pelo INSS Empresa, postular reintegração por dispensa discriminatória com fundamento no art. 1º da Lei 9.029/1995 e Convenção 111 OIT. Acompanhar regulamentação da LGPD quanto ao tratamento de dados de saúde no contexto trabalhista.
Link oficial: https://www.in.gov.br/en/web/dou/-/portaria-no-156-de-28-de-abril-de-2026

## Atualização DOU 24/04/2026

Norma: Instrução Normativa PRES/INSS nº 203, de 22 de abril de 2026
Órgão: Presidência do INSS
Vigência: 24 de abril de 2026 (já em vigor)
Resumo da alteração: A norma acrescentou o artigo 576-A à Instrução Normativa PRES/INSS nº 128/2022. O novo artigo veda que o interessado apresente novo requerimento enquanto houver processo em curso referente à mesma espécie de benefício. O processo é considerado em curso enquanto não transcorrer o prazo para recurso administrativo. A exceção expressa é o pedido de revisão. A norma também revogou a Resolução nº 438/PRES/INSS, de 3 de setembro de 2014.
Impacto na advocacia: O escritório não pode protocolar novo requerimento para cliente com processo em curso da mesma espécie sem que o prazo recursal tenha expirado. Duplicidade de requerimentos passa a ser rejeitada com fundamento expresso na IN 128. O diagnóstico via PAT antes de qualquer novo protocolo torna-se obrigatório. A revogação da Resolução 438/2014 pode ter alterado outros procedimentos antes regidos por ela; verificar caso a caso.
Estratégia: Antes de todo novo protocolo de requerimento, consultar PAT e Meu INSS para confirmar inexistência de processo em curso para a mesma espécie de benefício. Se houver processo aberto e ainda no prazo recursal, aguardar o encerramento ou recorrer no processo existente. Se o processo anterior foi encerrado com prazo recursal transcorrido, o novo requerimento é permitido. Em caso de rejeição indevida pelo INSS alegando processo em curso inexistente, apresentar prova do encerramento e recorrer administrativamente.
Link oficial: https://legisjet.com.br/conteudo/instrucao-normativa-presinss-n-203-de-22-de-abril-de-2026-dou-de-24-04-2026/
