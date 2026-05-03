# Plugin Tercini Operacional

Plugin pró-segurado do escritório Paulo Roberto Tercini Filho focado em **automação operacional**. Complementa o plugin de conhecimento jurídico [`base-conhecimento-inss`](https://github.com/paulotercini/marketplaceterciniinss) sem duplicar conteúdo.

## O que faz

- **Slash commands** para tarefas do dia a dia (triagem, cobrança, maturação)
- **Scripts** que conversam com o Microsoft To Do via Microsoft Graph
- **Auditoria** sistemática da carteira de tarefas (~4.300 tarefas processadas)
- **Templates** de comunicação com clientes (em construção)
- **Routine DOU** integrada ao plugin (em construção)

## Slash commands disponíveis

| Comando | O que faz |
|---|---|
| `/triagem` | Lista as tarefas suas (P) e delegadas com vencimento hoje, agrupadas por categoria |
| `/triagem-data DD/MM/AAAA` | Mesma triagem para uma data específica |
| `/inspect-tarefa <CPF ou nome>` | Mostra todas as tarefas do cliente em todas as listas |
| `/maturacao` | Aposentadorias Futuras maturando nos próximos 60 dias |
| `/cobrancas` | Pagamentos pendentes na lista 💵 Pagamentos |
| `/dou` | Roda o monitor diário do Diário Oficial da União |

## Estrutura

```
tercini-operacional/
├── .claude-plugin/marketplace.json
├── commands/                  Slash commands (.md)
├── scripts/
│   ├── graph/                 Conector Microsoft Graph (To Do)
│   ├── audit/                 Auditoria em 7 etapas
│   └── (outros utilitários)
└── templates/                 Templates de mensagens (futuro)
```

## Pré-requisitos

### Microsoft Graph autorizado

Antes de qualquer comando que lê do Microsoft To Do:

```bash
cd scripts/graph
python3 devflow.py start
```

Você verá um `USER_CODE` e a URL `https://www.microsoft.com/link`. Abra no navegador, digite o código, autorize com a conta `paulotercini@hotmail.com`, escopo `Tasks.ReadWrite offline_access`. Depois:

```bash
python3 devflow.py poll
```

O token fica em `graph_tokens.json` (não commitar — já está no `.gitignore`). Validade do access_token de 1 hora; o refresh é automático via `refresh.py`.

### Dependências

- Python 3.11+
- `openpyxl` (para auditoria Excel): `pip install openpyxl`

## Uso típico

### De manhã, ver o que tem hoje

Dentro do Claude Code:
```
/triagem
```

### Atualizar o histórico de uma tarefa

```
/inspect-tarefa Sumara
```
Depois você dita: "atualiza Sumara: trouxe extrato hoje" e o Claude prepende a entrada `(P)` no body da tarefa.

### Cobrança preventiva

```
/cobrancas
```
Lista os 51 itens em 💵 Pagamentos e sugere ação para cada um.

### Início do mês — varredura de Aposentadorias Futuras

```
/maturacao
```
Lista os clientes maturando nos próximos 60 dias, prontos para acionamento D-60.

## Auditoria completa

Para varrer toda a carteira:

```bash
cd scripts/audit
python3 build_cache.py     # leva ~15 min, cria /tmp/audit_cache.json
python3 stage1_overview.py
python3 stage2_titles.py
python3 stage3_catalog.py
python3 stage4_vocab.py
python3 stage5_workflow.py
python3 stage6_issues.py
python3 generate_excel.py  # cria audit_excel/*.xlsx (não commitar)
```

Os relatórios saem em `/tmp/audit_stage*.md` (sem dados sensíveis) e os Excel em `audit_excel/` (gitignored, contém CPFs e nomes).

## Versão

`0.1.0` — primeira release pública. Roadmap em [`ROADMAP.md`](./ROADMAP.md) (a criar).

## Cross-reference com base-conhecimento-inss

Os slash commands e scripts deste plugin **referenciam** as skills jurídicas do plugin `base-conhecimento-inss` quando relevante. A separação é deliberada:

- `base-conhecimento-inss` = conhecimento jurídico (101+ skills temáticas)
- `tercini-operacional` = automação operacional (commands + scripts + templates)

Os dois funcionam melhor instalados juntos, mas operam de forma independente.

## Licença

Privado. Uso restrito ao escritório Paulo Roberto Tercini Filho.
