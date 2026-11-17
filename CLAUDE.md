# CLAUDE.md

## Regras de leitura (contexto)

- Nunca leia inteiros `crm/fase2/app.html` (60 mil linhas), `docs/crm/index.html` nem `crm/fase2/docs/HISTORICO.md`. Use `grep -n` e janelas de até 200 linhas.
- Toda saída longa passa por `| cut -c1-200 | head -40`.
- Histórico das funcionalidades (F1 a F631 e seguintes) e a versão antiga deste arquivo: `crm/fase2/docs/HISTORICO.md`, consultado por `grep`. Entrada nova vai lá, não aqui.

## Publicação

- **Edite em `crm/fase2/src/` e rode `python3 crm/fase2/build_app.py`** (monta `app.html` e `docs/crm/index.html`; CI roda `--conferir`). Quem editou o `app.html` direto roda `--absorver` antes. Ordem dos módulos: `src/modulos.txt`; `html/` (cabeça, corpo, fim), `css/` (base, tema-v10), `js/NN-área.js` (whatsapp, agenda, prazos, pre-caso, pericias, casos), cortados entre blocos de topo. Para achar código: `grep -rn` em `src/`.

- `crm/fase2/app.html` é o CRM inteiro; ao mudar, copie para `docs/crm/index.html` (o deploy confere com `cmp`).
- Antes do merge, `git fetch origin main` e confira na main o próximo número F/versão livre (várias threads publicam em paralelo).
- `crm/fase2/migracoes/`: SQL aplicado pelo `supabase-migracoes.yml` ao entrar na main. Edge Functions em `crm/fase2/<função>/index.ts`; ponte do WhatsApp em `crm/fase2/ponte/`; extensões em `crm/fase2/extensao/` e `crm/fase2/dossie/`.
- Testes: `crm/fase2/testes/` (tela, banco, funções) e `python3 -m pytest tests/ -q` (portal).

## Sigilo (repositório público)

- Nenhum nome, telefone ou CPF de cliente em código, migração, comentário, teste, commit ou PR. Em teste, telefone `5500000000NN` e nome "Cliente Teste".
- Fichas do portal (`docs/portal/data/`) só por `gravar_ficha()`/`ler_ficha()` em `portal_common.py`, sempre cifradas. `is_internal()` é a barreira de privacidade; classifique só o cabeçalho do bloco.
- Processo `origem: "curado"` nunca é regenerado.

## Outras partes

- Site: `python3 build_site.py`. Portal: `graph_refresh.py` e `build_portal_listas.py`. Base de conhecimento: `_base-conhecimento-inss/` (ondas próprias, não misturar com portal).
- Dossiê do cliente: extensão em `crm/fase2/dossie/` (versão **0.16.0**). Ao subir o `manifest.json`, troque aqui e no marcador. <!-- dossie-versao: 0.16.0 -->
