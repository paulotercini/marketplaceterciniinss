# Vibração — Fundamentos Normativos e Cenários

## 1. Marco normativo

### Decreto 2.172/97 e Decreto 3.048/99

Ambos tratam da aposentadoria especial, mas não trazem limite numérico expresso para vibração. A remissão ocorre pela via do art. 58, §3º da Lei 8.213/91 e pela leitura integrada com a NR-15 e suas NHO.

### NR-15, Anexo 8

O Anexo 8 da NR-15 trata da vibração, remetendo às Normas de Higiene Ocupacional da Fundacentro. Para vibração de corpo inteiro, aplica-se a NHO-09. Para vibração mão-braço, aplica-se a NHO-10.

### NHO-09 — Vibração de Corpo Inteiro

A NHO-09 define parâmetros de aren (aceleração resultante normalizada) e VDV (Valor da Dose de Vibração) como métricas. A exposição é aferida por dosímetro ao longo da jornada. Os limites são fixados em tabela específica. A ultrapassagem do nível de ação impõe medidas e, persistente, caracteriza a nocividade para fins previdenciários.

### NHO-10 — Vibração Mão-Braço

A NHO-10 fixa o A(8), valor equivalente à exposição contínua de 8 horas, como parâmetro principal. A ultrapassagem do limite de exposição caracteriza a nocividade.

### ISO 2631 e ISO 5349

Normas técnicas internacionais que fundamentam a NHO-09 e a NHO-10. Servem de referência quando o PPP cita a metodologia ISO diretamente.

### Parecer 00212/2024 CONJUR-MTP

O Parecer consolidou a posição favorável ao enquadramento por vibração com base nas NHO-09 e NHO-10, com superação da tese administrativa que exigia limite expresso em decreto previdenciário. Foi reconhecido pela TNU em revisão de teses anteriores. Reforça a admissão das normas da Fundacentro como parâmetro técnico legítimo.

## 2. Métricas e fator de risco

### Vibração de Corpo Inteiro

Usuário recebe vibração transmitida pelo assento, piso ou apoio. Motoristas, tratoristas, operadores de máquinas pesadas, operadores de rolo compactador, caminhoneiros de longa distância.

Métricas. aren, VDV, eixos X, Y e Z.

### Vibração Mão-Braço

Usuário recebe vibração transmitida pelas ferramentas de trabalho. Britadeira, motosserra, rompedor, lixadeira, serra circular portátil, chave de impacto pneumática.

Métrica principal. A(8).

## 3. Cenários concretos para o segurado

### Cenário 1 — Motorista profissional de caminhão ou ônibus

Vibração de corpo inteiro. Enquadramento viável quando o PPP mede aren superior ao nível de ação da NHO-09. Em PPP omisso, acionar `retificacao-ppp` e invocar Tema 213 TNU para inversão do ônus.

### Cenário 2 — Tratorista rural ou de movimentação de terra

Exposição de corpo inteiro. Terreno irregular, jornada prolongada, vibração multi-eixo. Enquadramento pela NHO-09 com apoio em perícia similar quando a empresa for extinta ou omissa.

### Cenário 3 — Operador de máquina pesada em mineração e construção

Escavadeira, retroescavadeira, pá-carregadeira, rolo compactador. Vibração intensa e prolongada. Enquadramento pela NHO-09.

### Cenário 4 — Operador de britadeira ou rompedor pneumático

Vibração mão-braço severa. Enquadramento pela NHO-10 com enquadramento adicional por poeira mineral quando houver, via `base-especial-agentes-quimicos` para sílica.

### Cenário 5 — Operador de motosserra

Vibração mão-braço contínua. Enquadramento pela NHO-10. Associar com ruído via `base-especial-ruido` e com agentes químicos por óleo combustível via `base-especial-agentes-quimicos`.

### Cenário 6 — Bate-estacas e demolição

Vibração de corpo inteiro e mão-braço simultâneas. Enquadramento cumulativo pelas NHO-09 e NHO-10.

### Cenário 7 — Operador de rolo compactador

Vibração de corpo inteiro, em regra acima do nível de ação. Enquadramento direto pela NHO-09.

### Cenário 8 — Motorista de transporte urbano de passageiros

Vibração de corpo inteiro. Enquadramento viável com PPP que meça aren ou VDV. Em ausência, pedir retificação ou perícia por similaridade.

## 4. EPI e vibração

Luvas antivibração e assentos com amortecimento são EPI ou EPC de eficácia contestada, pois a atenuação real em campo é limitada. O Tema 1090 STJ permite enquadrar vibração como hipótese em que o EPI não neutraliza, combinando com `base-especial-epi`. A declaração de eficácia no campo 15.7 do PPP é insuficiente para neutralizar a exposição real.

## 5. Roteiro operacional

Primeiro, identificar se a exposição é de corpo inteiro ou mão-braço pela função e pelo equipamento.

Segundo, verificar no PPP o agente e a métrica. aren e VDV para corpo inteiro, A(8) para mão-braço.

Terceiro, se o PPP for omisso, acionar `retificacao-ppp` e invocar Tema 213 TNU.

Quarto, invocar o Parecer 00212/2024 CONJUR-MTP e as NHO-09 e NHO-10 como parâmetros técnicos.

Quinto, invocar Tema 211 TNU para afastar tese de exposição não habitual.

Sexto, redigir com `peticao-previdenciaria` e auditar com `auditoria-ppp`.

## 6. Diligência de atualização

Revalidar periodicamente a vigência das NHO-09 e NHO-10 da Fundacentro. Confirmar posição jurisprudencial atual junto à TNU e ao STJ. Acionar `precedentes-previdenciarios`.
