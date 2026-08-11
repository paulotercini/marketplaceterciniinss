# Onde paramos — 10.08.2026

Bilhete de passagem entre conversas. O contexto de uma sessão acaba; o
repositório não. Quem chegar agora lê isto primeiro, depois o `CLAUDE.md`.

## Em que pé estão as coisas

**Funcionando:**

- Sincronização To Do → CRM. Voltou depois de duas semanas parada. Última
  rodada: 2.952 casos, 17.614 andamentos, 5.941 tarefas gravados.
- Extensão do navegador 1.4.0 (`crm/fase2/extensao`), coletando em TRÊS
  portais: PAT/GERID, e-Recursos e — novo — o PJe do TRF3 (aba Acervo do
  painel do advogado, 1º e 2º graus: todos os processos com o último
  movimento de cada um, lidos do DOM porque o PJe é JSF com estado; as
  regras puras estão em `pje-regras.js`, com teste). A coleta entra na fila
  📥, vira andamento origem='pje' (dedupe por numero+data+hora no
  `origem_id`) e aparece em 📣 Novidades. Formato mapeado de HAR real de
  11.08.2026. **Ainda não testado ao vivo pelo Paulo** — o coletor opera a
  árvore de jurisdições e o datascroller; se o portal divergir do HAR, é aí
  que vai quebrar primeiro.
- Importação do PAT com plano antes de gravar, e o botão que junta de uma vez
  os possíveis duplicados marcados como prováveis.
- Acórdãos e resumos dos recursos, recuperados depois de uma perda (ver
  abaixo) e protegidos por `fundirBlocoCrps` em `app.html`.
- Aba **🌻 Andamentos INSS** na ficha (pedido do Paulo): os comentários do
  portal (`origem='pat'` com `origem_id` do PAT) em quadro próprio, nos moldes
  da aba 🖥 Recurso (CRPS), e fora da linha do tempo do escritório. As
  mudanças de situação (`origem_id` "situacao:...") continuam na linha do
  tempo, porque marcam fase, não conversa.
- `app.html` na versão **08.47**. Da 08.45 em diante: lista de clientes no
  compasso do To Do (cartão de 52px, sinais maiores); botão ✔ Encerrar caso no
  quadro de fatos, com autoria (`casos.encerrado_por`); 🗄 arquivar POR
  PROCESSO nas abas INSS/Recurso/CNJ (`casos.arquivados`, mapa chave→{por,em}
  — a aba só se marca quando TODOS os processos dela estão arquivados);
  "🗓 Lembrar em" nas Aposentadorias a tratar (`aposentadorias.lembrar_em`);
  e a aba 📖 Caso completo (todas as fontes numa linha do tempo, com "copiar
  em texto"). Na 08.57, a aba **🔔 Lembretes** (tabelas `lembretes` +
  `lembrete_avisos`): o "avisar de tempos em tempos" — contribuição do INSS
  com código GPS/valor/mensagem de WhatsApp pronta — vive no CLIENTE, com
  histórico de quem avisou; os casos de 🙏 Aposentadorias Futuras migram por
  um botão na ficha (cria o lembrete e encerra o caso); o selo do cliente
  ganhou o estado 🟡 "sem processo, com lembretes". O 🔁 por caso da 08.55
  foi removido no dia seguinte (coluna `lembrete_meses` ficou órfã, sem uso).
  **As colunas e tabelas novas exigem rodar `schema_por_em_dia.sql`** — sem
  elas o app avisa e degrada sem quebrar.

**A escrita CRM → To Do está DESLIGADA de propósito.** Trava dupla: variável
de repositório `ESCREVER_TODO=1` no workflow e a mesma variável no ambiente
do `escrever_todo.py`. Foi decisão do Paulo, enquanto os dois sistemas
convivem. Não religue sem ele pedir.

## O que ficou pendente

1. **9 resumos de acórdão faltando** — 8 são PDFs digitalizados (sem texto,
   precisariam de OCR) e 1 tem dispositivo fora do padrão que as regras leem.
   Decisão do Paulo pendente: fazer OCR ou deixar como está.

2. **A conta da API de resumo está sem crédito.** O `resumir.js` cai sozinho
   no motor de regras local, que funciona mas é mais simples. Com crédito,
   `node resumir.js --refazer --aplicar` reescreve todos.

**O CNJ ficava dias sem atualizar** e a causa era silenciosa: a API do DataJud
tem manhãs em que pendura, cada lote esperava até 8 minutos e o job
`consultas-publicas` morria no teto de 30 min como "cancelled" (04, 06 e
10.08). Agora o `datajud.py` usa timeout de 25s com teto próprio de 20 min
(grava o que consultou e nomeia o que ficou), o passo tem teto de 24 min no
workflow, e há uma segunda rodada às 14h30 BRT — se a manhã falhar, a tarde
cobre o mesmo dia.

Resolvidos nesta rodada (conferir na próxima sincronização real): o caso que
duplicava toda rodada (23505) era o **corte silencioso de 1000 linhas do
Supabase** — o remapeamento de `todo_task_id` lia uma página só e, com 2.952
casos, quem estava da linha 1001 em diante escapava; agora `_rest_todas()`
pagina até o fim. E a perícia com hora impossível (`45:00`) parou nos dois
lados: o `sync_todo.py` não captura mais hora > 23, e o `migrar.py` derruba
hora inválida para o padrão 09:00. Testes-ouro nos dois.

## Erros que já custaram caro (não repetir)

- **Reescrever bloco por cima apaga o que não veio do portal.** `aplicarCrps`
  trocava o bloco inteiro do recurso e levava junto o acórdão guardado e o
  resumo — 47 recursos ficaram só com a linha do tempo. Recuperados com
  `robo-crps/recolar_acordaos.js`. A regra vale para tudo: merge não
  destrutivo, o que foi acrescentado por fora permanece.
- **A coluna do autor em `andamentos` é `autor_id`**, não `colaborador_id`
  (esse é de `andamentos_lidos` e `meu_dia`). Há teste que barra a volta.
- **Lote é tudo ou nada no PostgREST.** Uma linha ruim derrubava 2.953 casos.
  `migrar.py` agora parte o lote até achar a culpada.
- **Erro sem a mensagem do servidor não é erro, é silêncio.** PostgREST e
  Microsoft dizem no corpo da resposta o que houve; repassar isso foi o que
  destravou três problemas seguidos.
- **O navegador do Paulo é o Comet** (Perplexity), não o Chrome. Chave nova de
  manifesto pode ser recusada e derrubar a extensão inteira, sem console.

## Como conferir se está tudo de pé

```bash
python3 -m pytest tests/ -q                                   # 177
cd crm/fase2/regras     && node --test 'testes/*.test.js'     # 89
cd crm/fase2/robo-pat   && node --test 'testes/*.test.js'     # 69
cd crm/fase2/robo-crps  && node --test 'testes/*.test.js'     # 127
cd crm/fase2/extensao   && node --test 'testes/*.test.js'     # 18
```
