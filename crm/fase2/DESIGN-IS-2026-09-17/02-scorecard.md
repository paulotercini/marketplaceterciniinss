# Pontuação (0–3 por princípio; empate resolve para baixo; vale a pior instância)

1. Bom design é inovador — 3/3
   Evidência: `faixaPrazos` + `prazoSaberMais` (01-evidence, Estrutural/Texto); `POPS_ANOTACAO` → texto reprocessado por `novoAndamento`.
   Justificativa: o prazo não é uma entidade paralela com formulário próprio (AdvWell, Astrea, ADVBOX, Clio): é um quadro derivado da anotação, cujo único gesto leva à anotação; e o tipo de anotação vira texto simples que o sistema lê de volta (protocolo, perícia, exigência). Padrão não visto nos pares, entregue com contenção (data + "saber mais").

2. Bom design torna um produto útil — 3/3
   Evidência: 30 interativos no painel, compositor presente em todas as abas, Caso completo por padrão, 0 ação-isca (01-evidence, Estrutural).
   Justificativa: abrir o caso, ver o que vence e registrar cabe numa tela sem rolagem; nada exige desvio.

3. Bom design é estético — 3/3
   Evidência: escala 10/11/12/13/17/20 fechada em `app.html:2207-2214`; uma placa, um vermelho, um verde, um petróleo; contrastes ≥ 4,5:1.
   Justificativa: depois da correção não há tamanho órfão na superfície auditada; as cores extras medidas são dados (avatares).

4. Bom design torna um produto compreensível — 3/3
   Evidência: lista de rótulos (01-evidence, Texto); `aria-label`/`aria-expanded` no "+"; "saber mais" e "verifiquei agora" nomeiam o que fazem.
   Justificativa: um usuário novo nomeia cada controle primário sem ajuda; o "+" é a única abreviação, e é o gesto universal de abrir.

5. Bom design é discreto — 3/3
   Evidência: capturas `v10_1_fechado.png` e `v10_4_escritorio.png`; a linha e o menu numa placa cinza, o trabalho em branco.
   Justificativa: o cromo recua; a conversa e os prazos são a figura.

6. Bom design é honesto — 3/3
   Evidência: "(sem dados)", "ninguém verificou ainda", "não informada", "a definir"; 0 padrões escuros; rótulo → comportamento conferido (01-evidence, Texto).
   Justificativa: cada selo diz exatamente o estado do dado.

7. Bom design é duradouro — 3/3
   Evidência: numerais em mono, títulos em slab, quadros planos sem gradiente, sem sombra pesada; os glifos (✎ ✓ ✔) são tipográficos e os emojis restantes são a linguagem de ícones do app desde a v1.
   Justificativa: nenhum marcador de tendência de um ano específico; a leitura em 2029 será a mesma.

8. Bom design é minucioso — 3/3
   Evidência: vazio / carregando / erro / sucesso / foco / desativado, todos citados (01-evidence, Visual › Estados).
   Justificativa: cada estado tem texto próprio e diz o que fazer (o erro nomeia o arquivo de schema).

9. Bom design é ecológico — 2/3
   Evidência: 1,39 MB crus / 412 KB gzip num arquivo só; 0 animações em repouso; `prefers-reduced-motion` honrado; sem modo escuro (01-evidence, Peso).
   Justificativa: fica abaixo de 500 KB no fio e com movimento condicionado, mas acima de 100 KB e sem modo escuro — não chega a 3.

10. Bom design é o mínimo de design possível — 3/3
    Evidência: 6 elementos na linha fechada; um gesto por quadro; ações e números atrás de dois "+" (01-evidence, Estrutural).
    Justificativa: tirar qualquer elemento da linha quebra uma tarefa (identificar, datar, localizar, vigiar, abrir).

Total: 29/30 — 96,7/100.
