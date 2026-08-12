# Onde paramos — 12.08.2026

Bilhete de passagem entre conversas. O contexto de uma sessão acaba; o
repositório não. Quem chegar agora lê isto primeiro, depois o `CLAUDE.md`.

## Em que pé estão as coisas

**Funcionando:**

- Sincronização To Do → CRM de hora em hora (07h–20h seg–sáb). O `migrar.py`
  agora CARIMBA cada rodada completa em `config_app.todo_sync_em`, e o rodapé
  do menu do app mostra "🔄 To Do há X min" (âmbar acima de 2h30).
- Extensão do navegador **1.5.1**, coletando em três portais. No PJe do TRF3,
  TESTADO AO VIVO (129+48 processos): o acervo entrega número, classe, partes,
  órgão julgador, "Distribuído em", último movimento e o link id+ca dos autos;
  com um processo ABERTO na frente, o mesmo botão coleta a CRONOLOGIA INTEIRA
  (fonte \'pje-processo\'). Regras puras em `pje-regras.js`, com testes.
- Importação do PJe no app: completa a ficha (classe/ajuizamento/órgão/link,
  só onde estiver vazio — o link se renova), casa por nome tolerante, ➕ cria
  caso, 🔍 ESCOLHER à mão quando o nome não casa, 🚫 ignora instrumentais de
  vez. Histórico completo grava com `criado_em` = data do movimento (não passa
  pelas Novidades); dedupe cruzada acervo×histórico pelos MOMENTOS
  (`momentosPje`, prefixos mov:/hist:).
- Ficha: chips judiciais (⚡ MS, 🏛 JEF/📜 rito comum, ⚖️ ajuizamento,
  📍 órgão, 🔗 abrir no PJe — também nas 📣 Novidades e na aba CNJ);
  ✔ compareceu fecha perícia vencida; trocar de aba REPINTA DA MEMÓRIA
  (`pintarFicha`/`repintarFicha` — zero consultas por clique, provado em
  Playwright); painéis Cadastro/Perícias/Pagamentos/Mensagens são funções.
- `app.html` na versão **08.76**. A rodada 08.74 (três revisores + verificação
  achado a achado) corrigiu 10 bugs — fuso da perícia do PAT (gravava 3h mais
  cedo), tarefa criada sem aparecer até o F5, datas UTC nas
  Novidades/Caso completo, Esc fechando a ficha por trás do modal, instSel
  vazando entre clientes — e blindou o `esc()` (aspas/apóstrofos; `escJs`
  para onclick; `urlOk` nos href de coleta; cores saneadas na carga).
  `patchCaso()` é o helper único dos PATCH de casos.
- **As colunas novas exigem rodar `schema_por_em_dia.sql`** (seção 11:
  `classe_judicial`, `ajuizado_em`, `orgao_judicial`, `pje_link`; e a origem
  \'pje\' no check de andamentos). Sem elas o app degrada sem quebrar.

**A escrita CRM → To Do está DESLIGADA de propósito.** Trava dupla
(`ESCREVER_TODO=1` no workflow e no ambiente). Decisão do Paulo. Não religue
sem ele pedir.

## O que ficou pendente

1. **Paulo rodar o `schema_por_em_dia.sql`** — o "0 gravados; 38 falharam" do
   PJe foi banco sem a origem \'pje\'; as colunas novas idem.
2. **Confirmar o rótulo da espécie B26** ("Auxílio-reclusão"?) — entrou a
   pedido, com essa legenda provisória.
3. **e-SAJ e eproc**: próximos coletores; falta o Paulo capturar os HAR
   (mesmo passo a passo do PJe). MNI exige credencial no TRF3 (ação dele).
4. **9 resumos de acórdão** (8 precisam de OCR; decisão do Paulo pendente) e
   **crédito da API** do `resumir.js` (cai no motor de regras local).
5. Propostas aprovadas em análise, não feitas: nada — os itens 1/2/3 da
   revisão saíram nas 08.75/08.76.

## Erros que já custaram caro (não repetir)

- **Reescrever bloco por cima apaga o que não veio do portal.** Merge não
  destrutivo sempre (`fundirBlocoCrps`; curados nunca regenerados).
- **Supabase corta em 1000 linhas SEM avisar.** Lista grande = `todas()` no
  app, `_rest_todas()` no Python. Já causou duplicação em série (23505).
- **Memória de dedupe vem do banco NA HORA, no conferir E no aplicar.**
  D.novid só tem 30 dias; plano que replaneja com D cru mente na tela.
- **`criado_em` decide onde o andamento aparece**: agora = 📣 Novidades;
  data do movimento = só história. Escolha consciente em cada fonte.
- **Entidade HTML não protege dentro de onclick** — o parser devolve o
  apóstrofo antes de virar JS. Lá é `escJs`, não `esc`.
- **Lote é tudo ou nada no PostgREST**; o `migrar.py` parte o lote até achar
  a linha culpada. **Erro sem a mensagem do servidor é silêncio** — repasse o
  corpo da resposta.
- **A coluna do autor em `andamentos` é `autor_id`** (teste barra a volta).
- **O navegador do Paulo é o Comet** (Chromium); manifesto com chave nova
  demais pode ser recusado inteiro, sem console.

## Como conferir se está tudo de pé

```bash
python3 -m pytest tests/ -q          # 179
node --test \'crm/fase2/extensao/testes/*.test.js\' \'crm/fase2/robo-pat/testes/*.test.js\' \
  \'crm/fase2/robo-crps/testes/*.test.js\' \'crm/fase2/regras/testes/*.test.js\' \
  \'crm/fase2/ponte/testes/*.test.js\' \'crm/fase2/djen/testes/*.test.js\'   # 278 pass
# sintaxe do app: node -e "vm.Script sobre os blocos <script> do app.html"
# fumaça no navegador: scratchpad da sessão tinha teste-menu.js/teste-abas.js
```
