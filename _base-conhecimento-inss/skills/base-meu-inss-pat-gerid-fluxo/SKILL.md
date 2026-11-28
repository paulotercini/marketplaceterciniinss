---
name: base-meu-inss-pat-gerid-fluxo
description: "Fluxo operacional pró-segurado dos sistemas administrativos do INSS, incluindo Meu INSS, PAT/GERID, HISCRE, INFBEN, DataPrev, Gov.br e protocolo eletrônico de requerimentos. Use SEMPRE que mencionar Meu INSS, MEUINSS, PAT, GERID, HISCRE, INFBEN, DataPrev, Gov.br, protocolo INSS, requerimento eletrônico INSS, exigência eletrônica, INFBEN, OCAB, telegrama INSS, recurso pelo Meu INSS, recurso pelo PAT, agendamento de perícia, agendamento de PRP, atendimento INSS, login Gov.br, certificado digital INSS, gerador de senha INSS, recadastrar Meu INSS, plataforma de procuradores, gestão de procurações INSS, anexar documentos Meu INSS, comunicar autorizado, prova de vida digital, recadastramento biométrico. Cruza com base-cnis-acerto-indicadores, base-pericia-medica-federal-telepericia, base-canais-falabr-corregedoria-cgu, base-pfe-inss-anpd-dpu-conade, base-aposentadoria-futura-pipeline e base-erro-administrativo-iea-13975."
---

# Sistemas administrativos do INSS: fluxo operacional

## Escopo

Uso padronizado, pelo escritório, dos sistemas do INSS para protocolo e acompanhamento de requerimentos e benefícios: Meu INSS, PAT/GERID, HISCRE, INFBEN, CNIS e Gov.br.

Cada sistema é uma camada do mesmo dado. O Meu INSS é o canal do segurado. O PAT é o canal do advogado credenciado. O HISCRE registra os créditos pagos. O INFBEN detalha o benefício concedido.

## Sistemas e função

### Meu INSS (https://meu.inss.gov.br)

Acesso pelo login Gov.br do segurado. Permite consultar requerimentos, agendar serviços, anexar documentos em exigência, acompanhar perícias e emitir carta de concessão, declaração de beneficiário e extrato de pagamento. O segurado pode cadastrar procurador no próprio Meu INSS.

Uso no escritório: protocolar requerimentos, cumprir exigências, acompanhar perícias, emitir comprovantes e conferir o andamento.

Limitação: em regra não exibe a fundamentação completa do indeferimento. Para lê-la, baixe a cópia integral do processo administrativo ou consulte o PAT.

### PAT (Portal de Atendimento) e GERID

O PAT é o portal de atendimento do INSS aberto às entidades conveniadas. O advogado o acessa pelo acordo de cooperação técnica entre o INSS e a seccional da OAB (em SP, OAB/SP). O GERID (Gerenciador de Identidade) é o sistema de credenciamento e senha que dá acesso ao PAT; exige cadastro prévio, autenticação de múltiplo fator e, conforme a seccional, certificado digital A3.

Uso no escritório: protocolar requerimentos e recursos como procurador, acompanhar tarefas, ler despachos, exigências e a análise que fundamentou o indeferimento, e conferir se o documento enviado entrou no processo.

Restrição: sessão curta, bloqueio periódico de senha do GERID e renovação do certificado. Bloqueio é causa recorrente de tarefa parada; registre a tentativa com captura de tela.

### HISCRE (Histórico de Créditos)

Lista os créditos de cada benefício: competência, valor, data e situação do pagamento.

Uso no escritório: confirmar a implantação (crédito emitido), o valor implantado e o pagamento de atrasados, e detectar erro de RMI.

### INFBEN (Informação do Benefício)

Mostra espécie, NB, RMI, DIB, DIP, DCB e situação do benefício.

Uso no escritório: conferir a RMI após a concessão, identificar revisão cabível e verificar se a DER reafirmada foi observada.

### CNIS (Cadastro Nacional de Informações Sociais)

Vínculos, remunerações e contribuições do segurado, mantido pela Dataprev. Consulta pelo Meu INSS ou pelo PAT.

Uso no escritório: auditoria antes do protocolo (lacunas, vínculos não computados, indicadores, divergência com a CTPS). Ver `base-cnis-acerto-indicadores`.

### Gov.br

Identidade unificada. O Meu INSS exige conta Gov.br; níveis prata e ouro liberam todos os serviços. O Gov.br pode exigir troca de senha ou segundo fator; nesse caso o acesso do escritório falha e o cliente precisa refazer a validação.

## Atalhos operacionais

### Ordem de consulta

1. Cliente relata protocolo ou pendência: abrir o Meu INSS e conferir o andamento.
2. Andamento sem detalhe: consultar o PAT ou a cópia integral do processo administrativo.
3. Concessão: conferir HISCRE (pagamento) e INFBEN (cálculo).
4. Divergência de tempo ou de cálculo: voltar ao CNIS.

### Senhas

O escritório guarda a senha Gov.br do cliente em item do checklist da tarefa, na lista Paulo Acessos. Trate essa lista como sigilosa: nunca a copie para peça, chat, repositório ou mensagem. A migração para gerenciador de senhas é decisão pendente do titular.

### Comunicações do INSS

O INSS comunica decisões por mensagem no Meu INSS e por correspondência postal. Confira os dois canais e o histórico de tarefas no PAT. Reclamação na Ouvidoria: `base-canais-falabr-corregedoria-cgu`.

### Anexar documentos em exigência

Envie PDF legível, um tipo de documento por arquivo, nomeado pelo tipo e pelo cliente (ex.: CTPS_[NOME].pdf). Após o envio, confira no PAT ou no Meu INSS se o documento entrou no processo e guarde o comprovante.

### Prazos de análise e de pagamento

- Lei 9.784/1999, art. 49: concluída a instrução, a Administração decide em até 30 dias, prorrogáveis por igual período mediante motivação expressa.
- Lei 8.213/1991, art. 41-A, § 5º: o primeiro pagamento ocorre em até 45 dias após a apresentação da documentação necessária.
- Acordo homologado pelo Plenário do STF no RE 1.171.152/SC (fevereiro de 2021; o processo saiu da sistemática da repercussão geral e o Tema 1066 foi cancelado): prazos de conclusão por espécie, nenhum acima de 90 dias, e prazo para realização da perícia médica. Confira a tabela por espécie no texto do acordo antes de citá-la.

Prazo vencido sem decisão: MS por omissão (`base-ms-decadencia-omissao-demora`) ou acionamento da Central Unificada de Cumprimento Emergencial de Prazos prevista no acordo.

### Sistema fora do ar

Registre cada tentativa com captura de tela no corpo da tarefa. Se a indisponibilidade comprometer prazo, a prova sustenta pedido de relevação da intempestividade (`admissibilidade-barreiras-crps`).

## Situações recorrentes

- Concedido sem pagamento: conferir o HISCRE. Ultrapassados 45 dias da concessão sem crédito, MS de cumprimento (`base-ms-cumprimento-inss`).
- Indeferimento por exigência não cumprida, com exigência cumprida: juntar o comprovante de envio e recorrer.
- DIB diversa da DER pedida, em prejuízo do segurado: recorrer pedindo a DIB na DER ou a reafirmação da DER (`reafirmacao-der`).
- RMI diversa da simulada: conferir o INFBEN. Revisão administrativa ou judicial no prazo decadencial de 10 anos (Lei 8.213/1991, art. 103).
- Bloqueio ou suspensão por suspeita de irregularidade: obter o motivo no PAT ou no processo administrativo e apresentar defesa no prazo da notificação.

## Estratégia

Esgote a via administrativa quando ela for rápida: o requerimento prévio é condição da ação (STF, RE 631.240, Tema 350). Mora ou descumprimento: MS. Divergência de cálculo, tempo especial ou retroativos: ação no JEF (até 60 salários mínimos) ou no rito comum. Erro material na concessão: `base-erro-administrativo-iea-13975`.

## Integração

- `base-cnis-acerto-indicadores`: auditoria do CNIS.
- `base-pericia-medica-federal-telepericia`: perícias agendadas.
- `base-canais-falabr-corregedoria-cgu`: Ouvidoria e Fala.BR.
- `base-pfe-inss-anpd-dpu-conade`: procuradoria federal.
- `base-erro-administrativo-iea-13975`: revisão administrativa.
- `base-ms-cumprimento-inss`: mora na implantação.
- `base-aposentadoria-futura-pipeline`: protocolo na data de maturação.

## Endereços

- Meu INSS: https://meu.inss.gov.br
- Gov.br: https://acesso.gov.br
- PAT: acesso pelo GERID, para advogado credenciado no acordo da seccional da OAB.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
