---
name: base-meu-inss-pat-gerid-fluxo
description: "Fluxo operacional pró-segurado dos sistemas administrativos do INSS, incluindo Meu INSS, PAT/GERID, HISCRE, INFBEN, DataPrev, Gov.br e protocolo eletrônico de requerimentos. Use SEMPRE que mencionar Meu INSS, MEUINSS, PAT, GERID, HISCRE, INFBEN, DataPrev, Gov.br, protocolo INSS, requerimento eletrônico INSS, exigência eletrônica, INFBEN, OCAB, telegrama INSS, recurso pelo Meu INSS, recurso pelo PAT, agendamento de perícia, agendamento de PRP, atendimento INSS, login Gov.br, certificado digital INSS, gerador de senha INSS, recadastrar Meu INSS, plataforma de procuradores, gestão de procurações INSS, anexar documentos Meu INSS, comunicar autorizado, prova de vida digital, recadastramento biométrico, IN 203/2026 vedação novo requerimento, IN 208/2026 vedação reprotocolo mesmo benefício, proibição requerimento processo em curso, INSS Empresa Portaria 156/2026 consulta empresas afastamentos. Cruza com base-cnis-conferencia-divergencias, base-pericia-medica-federal-telepericia, base-canais-falabr-corregedoria-cgu, base-pfe-inss-anpd-dpu-conade, base-aposentadoria-futura-pipeline e base-erro-administrativo-iea-13975."
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

## Atualização DOU 28/05/2026 — Norma A

Norma: Instrução Normativa PRES/INSS nº 208, de 19 de maio de 2026
Órgão: Instituto Nacional do Seguro Social
Vigência: 20 de maio de 2026 (DOU nº 93, de 20/05/2026)
Resumo da alteração: A IN 208/2026 inseriu o art. 576-A na IN PRES/INSS 128/2022 com a seguinte regra: o interessado somente pode apresentar novo requerimento da mesma espécie de benefício após a decisão do requerimento anterior e o decurso do prazo de 30 dias para interposição de recurso ordinário administrativo. A vedação não se aplica a pedidos de revisão. Para benefícios por incapacidade (B31, B91, B92) há exceções previstas nos arts. 340 e 346 da IN 128/2022. A norma complementa a IN 203/2026 (de 22/04/2026, DOU de 24/04/2026), que inaugurou a regra, e revogou a Resolução nº 438/PRES/INSS de 2014.
Impacto na advocacia: Quando um requerimento é indeferido, o segurado não pode imediatamente reprotocolar. Deve aguardar a decisão definitiva ou o decurso do prazo recursal de 30 dias. A estratégia do escritório muda: (a) antes de protocolar o requerimento inicial, a documentação deve estar completa para evitar indeferimento; (b) se houver indeferimento, a opção prioritária é o recurso administrativo (art. 126 Lei 8.213/91) e não o reprotocolo; (c) apenas após decisão do recurso ou escoamento dos 30 dias é possível novo requerimento. O escritório deve monitorar datas via PAT/GERID e Meu INSS para não perder a janela de reprotocolo.
Estratégia: Revisar documentação antes do protocolo, usando os checklists de cada espécie de benefício. Em caso de indeferimento, analisar imediatamente se cabe recurso administrativo ao CRPS (acionar `base-crps-panorama-geral`) ou judicial via mandado de segurança (acionar `base-ms-cabimento-direito-liquido-certo`). Registrar no PAT a data de ciência do indeferimento para controle do prazo de 30 dias.
Link oficial: https://www.legisweb.com.br/legislacao/?id=495991

## Atualização DOU 28/05/2026 — Norma B

Norma: Portaria DTI/DIRBEN/INSS nº 156, de 28 de abril de 2026
Órgão: Diretoria de Tecnologia da Informação e Diretoria de Benefícios do INSS
Vigência: 15 de maio de 2026 (publicada no DOU de 06/05/2026)
Resumo da alteração: A Portaria 156/2026 institui o sistema INSS Empresa como canal oficial para que empresas consultem informações sobre afastamentos e benefícios de seus empregados junto ao INSS. O acesso é feito via conta gov.br com certificado digital vinculado ao CNPJ da empresa. O sistema disponibiliza espécie do benefício, datas de requerimento, concessão, início e cessação, e status atual. A medida está alinhada à LGPD e substitui canais informais anteriores.
Impacto na advocacia: O escritório pode usar o INSS Empresa para confirmar, junto às empresas-clientes ou em casos de segurado-empregado, o status de benefícios que estejam em disputa trabalhista ou previdenciária. Empresas têm acesso mais rápido para verificar se o afastamento do empregado foi concedido, o que afeta obrigações de FGTS, retorno ao trabalho e gestão de planos de saúde. Em casos de acidente de trabalho, o sistema pode confirmar a existência do B92/CAT registrado.
Estratégia: Orientar clientes empresariais (quando o escritório também atende empregadores) a cadastrar acesso ao INSS Empresa para gestão preventiva. Para segurados-empregados, avaliar se a empresa tem acesso ao sistema como instrumento de prova do status do benefício em ação trabalhista conexa.
Link oficial: https://www.rsdata.com.br/portaria-inss-156-2026-inss-empresa-consulta-beneficios-afastamentos/
