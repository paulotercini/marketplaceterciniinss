# CRM do escritório — estrutura proposta

Documento de desenho do sistema que substituirá gradualmente o Microsoft To Do,
mantendo o layout de três colunas que a equipe já conhece. Baseado na análise do
backup de 11.07.2026 (4.114 tarefas em 38 listas) e na conversa de definição.

O protótipo navegável está em `crm/prototipo.html` (abrir no navegador; todos os
dados são fictícios).

## O que a análise do backup mostrou

| Achado | Número | Consequência no desenho |
|---|---|---|
| Andamentos anotados à mão com `DD.MM.AAAA (inicial):` | 15.248 (P 7.943, A 2.813, M 2.527, D 1.456, C 289, I 191) | Autoria e data automáticas pelo login — a convenção manual deixa de existir |
| Clientes (CPFs distintos nos títulos) | 1.502 | Cliente vira entidade própria, não uma tarefa |
| Clientes presentes em 2+ listas ao mesmo tempo | 400 | Modelo cliente → N casos, cada caso com sua fase (a "lista" vira a fase do caso) |
| Tarefas que mencionam perícia | 426 (269 com a data solta no meio do texto) | Módulo estruturado de Perícias & Audiências, com data/hora/local e visão-agenda própria |
| Tarefas que mencionam audiência | 42 | idem |
| Tarefas com senha em texto livre no corpo | 350 | Campos nomeados de credencial (Meu INSS, gov.br), criptografados, com registro de quem visualizou |
| Tarefas com telefone/WhatsApp no corpo | 316 | Campo nomeado de telefone com clique-para-WhatsApp |
| Tarefas com exigência do INSS | 209 | Tipo de andamento "Exigência" com prazo acoplado |
| Tarefas com checklist | 2.357 (1.047 guardam a data de nascimento) | DN vira campo do cliente (continua alimentando o hash do portal) |
| Lista pessoal "Tarefas" | 641 itens, 559 com prazo | Lista particular por usuário (invisível aos demais, aparece no Meu Dia do dono) |

Benefícios mais citados (para o dashboard): Revisão 302, Incapacidade Temporária
264, Apos. TC 252, CNIS 226, BPC/LOAS 192, Apos. Idade 187, Rural 104, Pensão
por Morte 98, Aux. Acidente 93, Invalidez 91, Apos. Especial 58.

## Layout (mantido do To Do)

- **Coluna esquerda**: pesquisa no topo; listas dinâmicas (Meu Dia, Planejado,
  Atribuídas a mim, Importante, Tarefas-particular); listas fixas do escritório
  (Tarefas com Prazo, Escritório, INSS, Judicial, Conselho de Recursos,
  Pagamentos); novas visões (Perícias & Audiências, Dashboard).
- **Coluna do meio**: clientes da lista selecionada, com ordenação (alfabética,
  prazo, última atualização, concluindo primeiro) e cartões mostrando benefício,
  fase, prazo, responsáveis e estrela.
- **Painel direito largo** (~metade da tela, não a faixa estreita do To Do),
  com abas: **Dados** (campos nomeados e personalizáveis: CPF, DN,
  telefone/WhatsApp, senhas protegidas, endereço), **Casos** (N pedidos por
  cliente, cada um com trilha de fases Escritório → INSS → Conselho → Judicial →
  Pagamento), **Andamentos** (timeline com autor/data automáticos e caixa "só
  escrever"), **Perícias & Audiências**, **Arquivos** (vínculo com Google Drive).

## Modelo de dados (resumo)

```
usuarios       (id, nome, inicial, cor, papel)
clientes       (id, nome, cpf, data_nascimento, telefone, endereco, campos_extras jsonb)
credenciais    (cliente_id, tipo[meu_inss|gov_br|...], valor criptografado, log de visualizacao)
casos          (id, cliente_id, titulo, beneficio, fase[escritorio|inss|conselho|judicial|pagamento],
                nb, num_processo, resultado[deferido|indeferido|...])
andamentos     (id, caso_id, autor_id, criado_em, texto, tipo[nota|exigencia|decisao|...],
                publico bool  -- controla o que vai para o portal do cliente)
eventos        (id, caso_id, tipo[pericia|audiencia|avaliacao_social|...], data_hora, local, status)
tarefas        (id, caso_id?, cliente_id?, titulo, prazo, concluida, particular_de usuario_id?)
atribuicoes    (tarefa_id|caso_id, usuario_id)   -- N responsáveis
arquivos       (caso_id, nome, drive_file_id)
```

Regras herdadas do pipeline atual que continuam valendo: o que é interno nunca
vai ao portal (`publico=false` por padrão — substitui o `is_internal()` por uma
decisão explícita); processos `origem: curado` do portal não são tocados; o hash
do portal continua derivado de CPF+DN.

## Fases de implantação (sem desligar o To Do)

1. **Espelho**: importar via Graph API (o repo já autentica), sistema só-leitura
   com pesquisa e dashboard. Equipe continua no To Do.
2. **Escrita dupla**: andamentos criados no sistema replicam no To Do (formato
   `DD.MM.AAAA (X): texto`), e o sync importa o que for escrito no To Do.
3. **Virada**: To Do vira backup; portal do cliente passa a ler do banco;
   entram DataJud (andamentos judiciais automáticos), Drive e aviso WhatsApp.

Banco sugerido: Supabase (PostgreSQL gerenciado, tempo real, login por usuário,
row-level security para a lista particular e para as credenciais).

## Fora do protótipo, decidir depois

- Nível de integração WhatsApp (link direto grátis × API oficial paga).
- Migração da lista 💵 Pagamentos: contém dados financeiros — definir permissão
  por papel antes de importar.
- Listas de estudo/pessoais (Arkad, Pai, Capital 2 etc.): ficam fora do CRM ou
  viram listas particulares.
