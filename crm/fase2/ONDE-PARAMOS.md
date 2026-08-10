# Onde paramos — 10.08.2026

Bilhete de passagem entre conversas. O contexto de uma sessão acaba; o
repositório não. Quem chegar agora lê isto primeiro, depois o `CLAUDE.md`.

## Em que pé estão as coisas

**Funcionando:**

- Sincronização To Do → CRM. Voltou depois de duas semanas parada. Última
  rodada: 2.952 casos, 17.614 andamentos, 5.941 tarefas gravados.
- Extensão do navegador 1.3.0 (`crm/fase2/extensao`), coletando nos dois
  portais: PAT/GERID e e-Recursos.
- Importação do PAT com plano antes de gravar, e o botão que junta de uma vez
  os possíveis duplicados marcados como prováveis.
- Acórdãos e resumos dos recursos, recuperados depois de uma perda (ver
  abaixo) e protegidos por `fundirBlocoCrps` em `app.html`.
- `app.html` na versão **08.43**.

**A escrita CRM → To Do está DESLIGADA de propósito.** Trava dupla: variável
de repositório `ESCREVER_TODO=1` no workflow e a mesma variável no ambiente
do `escrever_todo.py`. Foi decisão do Paulo, enquanto os dois sistemas
convivem. Não religue sem ele pedir.

## O que ficou pendente

1. **Aba "Andamentos INSS" na ficha** — pedido do Paulo. Nos moldes da aba
   🖥 Recurso (CRPS): mostrar os comentários do INSS separados dos andamentos
   do escritório, iguais ao que aparece no site. Os dados já estão gravados —
   cada comentário é um `andamento` com `origem='pat'` e `origem_id` com o id
   dele no portal. Não precisa recoletar nada; falta só a tela.

2. **Um caso duplicado na sincronização.** `todo_task_id` que já existe no
   banco com outro id de caso; a remontagem gera id novo e o banco recusa
   (23505). Três andamentos caem junto por dependerem dele. O `migrar.py` já
   remapeia alguns casos ("casos remapeados para ids já existentes"); este
   escapa. Uma ficha só.

3. **Perícia com hora impossível:** `2024-08-29T45:00:00`. O leitor de data do
   `migrar.py` aceita 45 como hora. Deve descartar ou cair no horário padrão.

4. **9 resumos de acórdão faltando** — 8 são PDFs digitalizados (sem texto,
   precisariam de OCR) e 1 tem dispositivo fora do padrão que as regras leem.
   Decisão do Paulo pendente: fazer OCR ou deixar como está.

5. **A conta da API de resumo está sem crédito.** O `resumir.js` cai sozinho
   no motor de regras local, que funciona mas é mais simples. Com crédito,
   `node resumir.js --refazer --aplicar` reescreve todos.

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
python3 -m pytest tests/ -q                                   # 173
cd crm/fase2/regras     && node --test 'testes/*.test.js'     # 89
cd crm/fase2/robo-pat   && node --test 'testes/*.test.js'     # 69
cd crm/fase2/robo-crps  && node --test 'testes/*.test.js'     # 127
cd crm/fase2/extensao   && node --test 'testes/*.test.js'     # 18
```
