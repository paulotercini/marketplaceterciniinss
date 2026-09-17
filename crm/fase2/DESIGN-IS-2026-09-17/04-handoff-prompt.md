````
/make-plan Refinar a tela do caso do CRM Tercini (tema v10, crm/fase2/app.html) com base numa auditoria pelos dez princípios de Rams (total 29/30).

Veredito (03-verdict.md):
> REFINAR — 29/30, nenhum princípio abaixo de 2: a estrutura está certa; o que resta é peso, não forma.

Manter (já pontuam 3, NÃO tocar neste passe):
- Princípio 1 (inovador) — o quadro de prazo derivado da anotação (`faixaPrazos`/`prazoSaberMais`) e as janelas por tipo que escrevem texto reprocessado pelo Registrar (`POPS_ANOTACAO`/`popInserir`). Regressão: `node crm/fase2/testes/cadastro/linha102.js` e `prazo85.js`.
- Princípio 2 (útil) — compositor em todas as abas, Caso completo por padrão. Regressão: `linha102.js`, `paineis.js`.
- Princípio 3 (estético) — escala 10/11/12/13/17/20 (`app.html`, bloco "F106 · uma escala só"). Regressão: `medir_v10.js`, campo `fontes` sem 11.5/12.5/13.333/18.
- Princípio 4 (compreensível) — rótulos e `aria-label` do "+". Regressão: `linha102.js`.
- Princípio 5, 6, 7, 8, 10 — linha do caso com 6 elementos, estados completos, selos honestos. Regressão: `regua81.js`, `acao84.js`, `natureza87.js`, `paralela86.js`.

Corrigir, em ordem de prioridade (movimentos do veredito, literais):
1. Princípio 9 — separar o CSS do tema e os módulos raramente usados (Configurações, Marketing, Perícias) em arquivos carregados sob demanda, para o primeiro carregamento ficar abaixo de 100 KB de JS no fio. Evidência: 01-evidence › Peso (1,39 MB / 412 KB gzip).
2. Princípio 9 — honrar `prefers-color-scheme: dark` com os mesmos tokens da v10 (`app.html:2003-2013`). Evidência: 01-evidence › Peso ("Modo escuro: não há").
3. Princípio 4/8 — `skip-link` e landmarks (`main`, `nav`) na ficha. Evidência: 01-evidence › Acessibilidade (lacuna conhecida).

Fora do escopo deste passe: linha do caso, quadros de prazo, janelas do compositor, menu dos andamentos.

Entregáveis do plano:
- Por correção: arquivos-alvo, mudança exata, passo de verificação (prova Playwright ou medição).
- Tokens/spec consolidados num lugar só (o bloco `html[data-tema="v10"]`).
- Checklist de regressão para cada item de "Manter".

Antipadrões a evitar (específicos de REFINAR):
- Criar abstração nova onde uma mudança direta basta (o app é arquivo único de propósito).
- Reestilizar o que já pontuou 3.
- Deslizar para redesenho estrutural.
- Deixar uma correção mudar princípios fora da lista.
````
