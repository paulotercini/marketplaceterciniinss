# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este repositório

Sistema do escritório de advocacia previdenciária Paulo R. Tercini Filho, com três partes independentes:

1. **Site institucional** — `build_site.py` lê `site_content/*.json` e gera `docs/*.html` (páginas de benefícios).
2. **Portal do cliente** — `docs/portal/` (app estático). O cliente informa CPF + data de nascimento; `app.js` deriva `PBKDF2-SHA256(cpf|dn, salt, iter)` → `SHA-256` → 16 bytes hex e busca `docs/portal/data/<hash>.json`. Não há backend: a "autenticação" é o nome do arquivo ser inderivável sem CPF+DN corretos. `salt`/`iter` vêm de `docs/portal/data/_meta.json` e têm que bater com `derivar_hash()` nos geradores Python.
3. **Base de conhecimento** — `_base-conhecimento-inss/` é um plugin Claude (134 skills jurídicas) versionado neste mesmo repo; atualizado por ondas (`.claude-plugin/plugin.json` tem a versão). Não misture mudanças do portal com ondas da base.

A fonte de dados dos geradores é o **Microsoft To Do** (Graph API, conta pessoal), onde cada tarefa é um cliente: título `Nome #CPF`, corpo com blocos datados `DD.MM.AAAA (Autor): texto` (mais novo no topo), checklist com aniversário.

## Comandos

```bash
# Autenticação Graph (tokens ficam em graph_tokens.json, fora do git)
python3 graph_devflow.py     # primeiro login (device flow) — interativo
python3 graph_refresh.py     # renova o access token (expira em ~1h) — rode antes de qualquer gerador

# Geradores do portal (regeneram docs/portal/data/*.json)
python3 build_portal_listas.py             # listas 🌻 INSS, 👪 Judicial, 🖥 Conselho de Recursos, 🗓 Tarefas com Prazo
python3 build_portal_listas.py --validate  # compara extração vs. fichas publicadas, sem gravar
python3 build_portal_escritorio.py         # lista 🙋 Escritório (status inferido, sem timeline)

# Site institucional
python3 build_site.py        # site_content/*.json -> docs/*.html

# Testes (puros, sem rede/tokens)
python3 -m pytest tests/ -q
python3 -m pytest tests/test_extracao.py -q -k pericia   # um grupo específico

# Deploy: push na main tocando docs/** dispara .github/workflows/deploy-pages.yml (GitHub Pages)
# Portal publicado: https://paulotercini.github.io/marketplaceterciniinss/portal/
```

Desenvolva na branch de feature designada e faça merge na `main` para publicar. A `main` recebe pushes de outras sessões (ondas da base de conhecimento) — sempre `git fetch origin main` e merge antes do push.

## Arquitetura da extração (build_portal_listas.py)

Pipeline por tarefa: `split_blocks(body)` quebra em blocos datados → `headline()` pega a primeira linha relevante do bloco (resolvendo rótulos como "Último andamento:" para a linha seguinte) → `is_internal()` descarta ruído e notas internas → `pericia_evento()` ou `classify()` (REGRAS, da mais específica à mais genérica, casamento por palavra inteira) → evento canônico com data.

Invariantes que NÃO podem ser quebradas:

- **Classifique só o cabeçalho do bloco**, nunca o corpo inteiro — o corpo carrega histórico colado do sistema e gera falsos eventos na data errada.
- **`is_internal()` é a barreira de privacidade**: instruções à equipe ("Amanda, faz..."), imperativos ("agendar", "manifestar"), ouvidoria, senha gov.br e ruído ("sem alteração", "em análise") jamais viram conteúdo público. Corpos de tarefa contêm CPFs, senhas e dados médicos — nenhum texto bruto do To Do pode ir para as fichas.
- **`ALTA_CONFIANCA`** filtra quais tipos de evento aparecem na timeline pública; tipos ambíguos (ex.: "Manifestação") existem em REGRAS mas são suprimidos.
- **Proveniência por processo**: cada processo numa ficha tem `origem: "curado"` (escrito à mão — NUNCA regenerar/tocar) ou `origem: "auto"` (regenerável a partir do To Do). Os geradores preservam curados e só reescrevem autos.
- **`infer_status()` (escritorio) decide pela nota MAIS RECENTE**, não pelo histórico; gatilhos de "aguardando cliente" são propositalmente específicos — termos soltos já causaram falso "falta documento" na ficha de cliente.
- **Merge não-destrutivo**: `build_portal_escritorio.main()` só atualiza a `localizacao` do processo Escritório e preserva os processos das demais listas.
- Funções compartilhadas pelos dois geradores (`digits`, `cpf_from_task`, `dn_from_items`, `derivar_hash`, `split_blocks`...) vivem em `portal_common.py` — não recopie.

`graph_client._req` já faz retry/backoff para erros transitórios de rede/SSL e 429/5xx; os crawls completos do To Do levam vários minutos.

## Scripts auxiliares

- `audit_build_cache.py` + `audit_stage1..6_*.py` + `audit_generate_excel.py`: auditoria das tarefas do To Do; cache em `/tmp/audit_cache.json` (dados sensíveis, nunca commitar).
- `dou_rotina.py`: monitor diário do DOU (roda no workflow `dou-monitor.yml`), cria tarefas no To Do.
- `triagem.py`, `inspect_tasks.py`: utilitários de inspeção/triagem das tarefas.

## Testes

`tests/test_extracao.py` é uma suíte de regressão com os bugs reais já corrigidos (falso "Ação judicial" por substring, falso indeferimento por classificar o corpo inteiro, vazamento de notas internas, falso "falta documento" por nota antiga). Ao mexer em REGRAS, `is_internal`, `headline`, `pericia_evento` ou `infer_status`, rode a suíte — e acrescente um caso-ouro para cada novo bug corrigido.
