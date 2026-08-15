---
name: tempo-especial-peticoes-por-rito
description: "Skill para transposição de análise de PPP em petições de tempo especial adaptadas ao rito e posicionamento do órgão julgador. Use SEMPRE que análise de PPP estiver concluída e for necessário redigir petição perante CRPS, JEF ou rito ordinário TRF3. Use quando mencionar 'petição tempo especial', 'recurso CRPS tempo especial', 'ação JEF aposentadoria especial', 'ação rito comum tempo especial', 'recurso inominado tempo especial', 'apelação TRF3', 'posicionamento CRPS sobre EPI', 'posicionamento TRF3 ruído', 'diferença JEF rito comum especial', 'estratégia processual tempo especial', ou conversão de análise técnica de PPP em peça processual adaptada ao órgão julgador. Complementar a analise-ppp-tempo-especial, ppp-agentes-especializados e peticao-previdenciaria. NÃO use para análise isolada de PPP sem peticionamento."
---

# Skill de Transposição de Análise de PPP em Petições por Rito e Órgão Julgador

## Visão Geral

Esta skill converte o resultado da análise de PPP (produzida pelas skills `analise-ppp-tempo-especial` e `ppp-agentes-especializados`) em petições adaptadas ao rito processual e ao posicionamento específico do órgão julgador. A mesma tese de tempo especial exige argumentação, estrutura, ênfase probatória e fundamentação normativa diferentes conforme tramite perante o CRPS, o JEF ou o rito ordinário do TRF3.

O erro mais grave que um advogado pode cometer ao peticionar tempo especial é tratar todos os ritos e órgãos julgadores como se fossem idênticos. Cada instância tem sua cultura decisória, seus precedentes dominantes, seu grau de receptividade a determinados argumentos e suas limitações normativas. Esta skill mapeia essas diferenças e orienta a redação.

## Fluxo de Trabalho

1. Leia este SKILL.md completamente
2. Identifique o rito e o órgão julgador
3. Leia o arquivo de referência correspondente
   - CRPS (recurso ordinário ou especial) → `references/CRPS-TEMPO-ESPECIAL.md`
   - JEF (petição inicial ou recurso inominado) → `references/JEF-TEMPO-ESPECIAL.md`
   - Rito ordinário federal (petição inicial, apelação, TRF3) → `references/RITO-COMUM-TRF3-TEMPO-ESPECIAL.md`
4. Leia SEMPRE `references/EPI-ESTRATEGIA-POR-ORGAO.md` quando houver controvérsia sobre EPI
5. Leia SEMPRE `references/RUIDO-POR-ORGAO.md` quando o agente nocivo for ruído (Enunciados 12 e 13 do CRPS, Temas 174 e 317 da TNU, Tema 1.083/STJ, posicionamento TRF3 e TRU 3ª Região)
6. Aplique as regras de transposição ao redigir a petição
6. Acione a skill `peticao-previdenciaria` para formatação do .docx
7. Acione a skill `regras-tutela-urgencia` para verificar a política de urgência

## Princípios Fundamentais da Transposição

### Princípio 1 – Conhecer o interlocutor
Antes de redigir qualquer argumento, o advogado deve saber QUEM vai ler a petição. O conselheiro do CRPS é servidor administrativo vinculado a pareceres e enunciados. O juiz do JEF é magistrado federal com cultura de informalidade processual e contato direto com as partes. O desembargador do TRF3 é magistrado de segunda instância que analisa o processo com base no acervo probatório já produzido.

### Princípio 2 – Adaptar a linguagem normativa
O CRPS decide com base no Decreto 3.048/99, na IN 128/2022, nos enunciados do CRPS e nos pareceres vinculantes. A fundamentação primária deve ser administrativa. A jurisprudência judicial é argumento subsidiário.

O JEF e o rito ordinário decidem com base na CF, na Lei 8.213/91, no Decreto 3.048/99 e na jurisprudência do STF, STJ, TNU e TRF3. A IN 128/2022 é referência interpretativa, mas não vincula o juízo. Enunciados do CRPS não vinculam o Judiciário.

### Princípio 3 – Adequar a estratégia probatória
No CRPS, a prova é essencialmente documental. Não há perícia. O PPP e o LTCAT são praticamente as únicas provas técnicas disponíveis.

No JEF, a perícia indireta é corriqueira, a prova testemunhal é colhida em audiência e o juiz tem amplo poder instrutório. O PPP é ponto de partida, não ponto final.

No rito ordinário, a instrução é mais formal, com prazo para perícia, laudos escritos, quesitos das partes e possibilidade de assistente técnico.

### Princípio 4 – Antecipar a contestação do ente
O INSS apresenta contestações padronizadas, mas com ênfases diferentes conforme o rito. No CRPS, a contraparte é a própria estrutura administrativa do INSS. No JEF e no rito ordinário, a AGU contesta com teses específicas. Cada arquivo de referência mapeia as contestações típicas por agente nocivo e por rito.

## Regras Críticas

### Proibição Absoluta de Dois-Pontos
Mesma regra de todas as skills do escritório. NUNCA utilizar dois-pontos para introduzir explicações, listas ou conclusões.

### Verificação de Posicionamento Atualizado
Os posicionamentos dos órgãos julgadores mudam. Esta skill registra os posicionamentos conhecidos até a data de sua criação. Antes de afirmar categoricamente que determinado órgão adota determinada posição, verificar se houve mudança recente via pesquisa em fontes primárias. Se não houver confirmação segura, escrever "posicionamento a ser confirmado em jurisprudência atualizada".

### Honestidade sobre Riscos Processuais
Se o PPP é frágil e a tese é difícil perante determinado órgão, dizer isso com clareza. Nunca omitir risco processual. A petição deve ser persuasiva, mas o advogado deve saber onde estão os pontos vulneráveis.

### Integração com Skills Existentes
Esta skill NÃO substitui as skills de CRPS (recurso-especial-crps, admissibilidade-relevacao-crps, embargos-revisao-incidentes-crps). Ela COMPLEMENTA essas skills com o conteúdo específico de tempo especial. Ao redigir recurso ao CRPS sobre tempo especial, acionar AMBAS as skills (esta e a de procedimento recursal).

## Mapa de Decisão Rápido

**O caso é administrativo (indeferimento ou cessação pelo INSS)?**
→ Recurso ordinário ao CRPS. Leia `references/CRPS-TEMPO-ESPECIAL.md`.
→ Acione `recurso-especial-crps` se já houver acórdão de JR para impugnar.

**O caso é judicial e o valor da causa é até 60 salários mínimos?**
→ JEF. Leia `references/JEF-TEMPO-ESPECIAL.md`.
→ Foro conforme skill `competencia-foro-escritorio` (Catanduva, 36ª Subseção).

**O caso é judicial e o valor da causa ultrapassa 60 salários mínimos?**
→ Rito ordinário. Leia `references/RITO-COMUM-TRF3-TEMPO-ESPECIAL.md`.
→ Foro conforme skill `competencia-foro-escritorio`.

**Há controvérsia sobre EPI em qualquer dos ritos?**
→ Leia SEMPRE `references/EPI-ESTRATEGIA-POR-ORGAO.md`.

**O agente nocivo é ruído?**
→ Leia SEMPRE `references/RUIDO-POR-ORGAO.md`. A divergência entre CRPS (90 dB no período intermediário) e Judiciário (85 dB, Tema 1.083/STJ) pode definir a escolha entre via administrativa e judicial.

**O PPP indica NR-15 sem NEN expresso?**
→ Via administrativa (CRPS) rejeitará o PPP pelo Comunicado 99/2025. Via judicial aceita com presunção de regularidade (PEDILEF 0001717, TNU novembro/2025). Esta divergência estrutural CRPS/Judiciário é critério de decisão estratégica entre vias, à luz do Tema 1124/STJ.

**O empregador se recusa a emitir ou retificar o PPP?**
→ A Justiça do Trabalho é alternativa com fundamento no Tema 132/TST (IRR, j. 16/05/2025), que firmou a imprescritibilidade da pretensão de retificação do PPP. Se o PPP retificado for apresentado ao INSS antes da ação previdenciária, os efeitos financeiros retroagem à DER pelo Tema 1124/STJ.

**O segurado é frentista?**
→ O CRPS tende a reconhecer mais facilmente que o Judiciário (CRPS Processo 44236.169855/2023-61). No Judiciário, especialmente no TRF2 e TRF6, há resistência ao reconhecimento pela questão da permanência. A TNU reafirmou a tese do benzeno qualitativo em fevereiro/2026 (PEDILEF 0136882). Consultar skill ppp-agentes-especializados para fundamentação.

**O caso envolve agente com presunção de ineficácia do EPI?**
→ Consultar skill epi-tema-1090-irdr15 para o rol de hipóteses excepcionais. No TRF3, invocar o IRDR 15/TRF4 como precedente persuasivo qualificado, conjugado com o Tema 1090/STJ e a ratio decidendi do Tema 555/STF.

**A sentença julgou antecipadamente sem perícia?**
→ Consultar skill cerceamento-defesa-especial. A deficiência do PPP gera perícia, não improcedência (Min. Regina Helena Costa, REsp 2.152.968/RS).

## Referências Obrigatórias

- `references/CRPS-TEMPO-ESPECIAL.md` – Posicionamento e estratégia perante o CRPS
- `references/JEF-TEMPO-ESPECIAL.md` – Posicionamento e estratégia perante o JEF e Turma Recursal
- `references/RITO-COMUM-TRF3-TEMPO-ESPECIAL.md` – Posicionamento e estratégia perante Varas Federais e TRF3
- `references/EPI-ESTRATEGIA-POR-ORGAO.md` – Tratamento da questão do EPI conforme o órgão julgador
- `references/RUIDO-POR-ORGAO.md` – Posicionamento clássico e recente de CRPS, JEF/TNU e TRF3 sobre ruído (Enunciados 12 e 13, Temas 174, 317 e 1.083, Q=3 vs. Q=5, medição pontual, dosimetria, quadros comparativos)
