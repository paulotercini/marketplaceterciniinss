# Protocolo Anti-Alucinação Integrado de 5 Níveis

Protocolo operacional para uso na Camada 2 da Revisão Aprofundada. Detalha o fluxo de verificação de cada citação contra fontes primárias verificadas no repositório `base-legislacao-fontes-primarias` e fontes oficiais.

## FLUXO GERAL

Para CADA citação de norma ou precedente identificada na peça, executar os 5 níveis na ordem.

```
Citação identificada
        |
        v
Nível 1 - Existência?
        |
   +----+----+
   |         |
  Sim        Não → SUSPENDER + sinalizar BLOQUEANTE
   |
   v
Nível 2 - Vigência?
        |
   +----+----+
   |         |
  Sim        Não → alertar revogação + tempus regit actum
   |
   v
Nível 3 - Redação literal?
        |
   +----+----+
   |         |
  Sim        Não → corrigir transcrição
   |
   v
Nível 4 - Modulação?
        |
   +----+----+
   |         |
  Sim        Pendente → alertar
   |
   v
Nível 5 - Número de processo, relator, data?
        |
   +----+----+
   |         |
  Sim        Não → BLOQUEANTE
   |
   v
Citação APROVADA
```

## NÍVEL 1 - EXISTÊNCIA

### 1.1 Para Normas Constitucionais (CF, EC, LC)

Arquivos disponíveis em `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/01-Constituicao/` e `02-Leis-Complementares/`.

Procedimento.
1. Identificar a norma citada na peça (ex. "art. 201 §7º CF").
2. Abrir o arquivo correspondente. `CF-1988-completa.md` ou `EC-103-2019.md` ou `LC-142-2013-aposentadoria-PCD.md`.
3. Usar Grep com pattern "Art. 201" ou Read com offset adequado.
4. Confirmar que o artigo existe no arquivo.

Achado se NÃO existe.
- BLOQUEANTE. "Art. X da norma Y citado na peça não foi localizado no arquivo verificado. Suspender citação ou conferir em fonte oficial alternativa."

### 1.2 Para Leis Ordinárias

Arquivos disponíveis em `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/03-Leis-Ordinarias/`.

Cobertura. Lei 8.213/91 (Plano de Benefícios), Lei 8.212/91 (Custeio), Lei 8.742/93 (LOAS), Lei 13.146/2015 (EPCD).

Procedimento. Mesmo da 1.1.

### 1.3 Para Decretos

Arquivos disponíveis em `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/04-Decretos/`.

Cobertura. Decreto 3.048/99 (em 4 partes), Decreto 53.831/1964 (com Quadro Anexo), Decreto 62.755/1968.

Procedimento. Mesmo da 1.1. Atenção ao Decreto 3.048 dividido em 4 partes (arts. 1-100, 101-200, 201-300, 301-fim).

### 1.4 Para IN 128/2022 INSS

Arquivos disponíveis em `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/05-Instrucoes-Normativas/`.

Cobertura. IN 128/2022 em 4 partes (arts. 1-170, 171-340, 341-510, 511-674). Total 674 artigos consolidados até IN 170/2024.

Procedimento. Mesmo da 1.1. Identificar a parte correta pelo número do artigo.

### 1.5 Para Portarias DIRBEN/INSS e MPS

Arquivos disponíveis em `/sessions/fervent-bold-lovelace/mnt/INSS/base-legislacao/06-Portarias/`.

Cobertura.
- Portaria DIRBEN/INSS 991/2022 (concessão e revisão - Livro II).
- Portaria 992/2022 (manutenção - Livro III). **NÃO É CÁLCULO DE RMI.**
- Portaria 993/2022 (processo administrativo - Livro IV).
- Portaria 994/2022 (acumulação - Livro V).
- Portaria 995/2022 (acordos internacionais - Livro VI).
- Portaria 996/2022 (recursos - Livro VII).
- Portaria MPS 125/2026 (RICRPS).

ALERTA. A Portaria 990/2022 (CNIS, RAC, indicadores - Livro I) NÃO foi baixada na Onda 31. Conferir em outros lugares.

### 1.6 Para Precedentes (Tema STF/STJ/TNU, Súmula, IRDR, IAC)

Acionar a skill `precedentes-previdenciarios` para conferência. Se a skill confirmar a vigência, prosseguir para Nível 2. Se não, SUSPENDER.

Para temas e súmulas NÃO catalogados na skill `precedentes-previdenciarios`, conferir via WebFetch nos sites oficiais.
- STF. https://portal.stf.jus.br
- STJ. https://www.stj.jus.br
- TNU. https://www.cjf.jus.br/cjf/jef/turma-nacional-de-uniformizacao
- TRF3. https://www.trf3.jus.br

## NÍVEL 2 - VIGÊNCIA

### 2.1 Para Artigos

Procedimento.
1. Após confirmar existência, ler o artigo INTEIRO incluindo notas de rodapé.
2. Verificar marcações de "Revogado pela Lei X.XXX" ou "Vide".
3. Se "Revogado", alertar.

```
"O artigo X da Lei Y FOI REVOGADO pela Lei Z em [ano].
Avaliar direito adquirido ou tempus regit actum se a tese se ancora em situação pré-revogação."
```

4. Se "Vide", consultar a norma que o vide aponta antes de prosseguir.

### 2.2 Para Precedentes

Verificar.
- Houve overruling posterior? (Caso clássico. Tema 503/STF superou desaposentação.)
- A súmula foi cancelada? (Caso clássico. Súmula 86/TNU cancelada em 26/08/2021.)
- O tema foi superado por novo julgamento?

Se houver overruling ou cancelamento, alertar como CRÍTICO.

### 2.3 Exemplos Vigentes em 31/05/2026

- Lei 8.213/91 - última alteração Lei 15.415/2026.
- Lei 8.212/91 - última alteração Lei 15.363/2026.
- LOAS - última alteração Lei 15.157/2025.
- Lei 13.146/2015 EPCD - última alteração Lei 15.249/2025.
- CF - últimas alterações EC 139/2026 e LC 230/2026.

### 2.4 Súmulas Canceladas a Atentar

- **Súmula 86/TNU** - CANCELADA em 26/08/2021 (PEDILEF 0521830-35.2020.4.05.8100/CE). Era. "Não cabe incidente de uniformização que tenha como objeto principal questão controvertida de natureza constitucional ainda não definida pelo STF em sua jurisprudência dominante."

## NÍVEL 3 - REDAÇÃO LITERAL

### 3.1 Para Artigos

Procedimento.
1. Após confirmar existência e vigência, transcrever EXATAMENTE a redação do arquivo.
2. Preservar marcação "Redação dada pela Lei X.XXX" entre parênteses.
3. Conferir se a peça já transcreveu literalmente. Se houver paráfrase apresentada entre aspas como literal, é IMPORTANTE.

### 3.2 Artigos com Múltiplas Redações Sucessivas

Caso clássico. Art. 103 da Lei 8.213/91 (decadência) tem 3 redações sucessivas preservadas.

Para fixar qual versão aplicar.
- DIB do benefício.
- Data do pedido de revisão.
- Tempus regit actum.

Atenção a alterações por.
- MP 871/2019 (depois convertida em Lei 13.846/2019).
- Lei 13.846/2019.
- ADI 6096/STF.

### 3.3 Para Precedentes

Transcrever a TESE LITERAL fixada no julgamento, não a ementa.

A tese vem do dispositivo final do voto-vencedor. Eventuais "Notas Importantes" no acórdão ou na publicação podem ser citadas como complemento, não como tese.

Achado se paráfrase apresentada entre aspas. IMPORTANTE.

## NÍVEL 4 - MODULAÇÃO

### 4.1 Modulação de Temas STF/STJ/TNU

Casos clássicos de modulação a atentar.

- **Tema 1102/STF** (Revisão da Vida Toda) teve modulação em 2024 que limitou efeitos.
- **Tema 1124/STJ** (prévio requerimento administrativo em concessão de benefícios), julgado em 08/10/2025, acórdão publicado em 06/11/2025, tese firmada conferida na fonte oficial pelo Paulo em 04/07/2026 (redação literal no CATALOGO-COMPLEMENTAR-VERIFICADO), modulação a confirmar na fonte.
- **Tema 942/STF** (aposentadoria especial e direito ao melhor benefício).
- **Tema 709/STF** (aposentadoria especial e vedação retorno atividade especial).

Achado se modulação não foi mencionada quando aplicável. IMPORTANTE.

### 4.2 Modulação de Alterações Legais

Para artigos alterados por lei posterior, verificar se a alteração tem efeitos retroativos ou apenas prospectivos.

Casos clássicos.
- EC 103/2019 (Reforma da Previdência) - marco temporal 13/11/2019. Direito adquirido (art. 3º EC 103) preserva regras anteriores para quem cumpriu requisitos antes.
- Lei 13.846/2019 (alterações em decadência e revisão de benefícios) - aplicação prospectiva.

Achado se peça aplica regra nova retroativamente sem justificativa. CRÍTICO.

## NÍVEL 5 - NÚMERO DE PROCESSO, RELATOR E DATA

Para CADA precedente citado, conferir.

- [ ] Número do tema/repetitivo/súmula está correto.
- [ ] Órgão julgador está correto (STF, STJ, TNU, TRF).
- [ ] Número do REsp/RE/PEDILEF/AgInt corresponde ao tema.
- [ ] Data de julgamento está correta.
- [ ] Nome do relator está correto.

Achado se número, órgão, REsp/RE, data ou relator FABRICADO.
- BLOQUEANTE automático.
- A peça NÃO pode ser protocolada.
- Suspender citação ou corrigir contra fonte oficial.

## CASOS PRÁTICOS DE ALUCINAÇÃO HISTÓRICA

Casos reais ocorridos no plugin antes da Onda 31/32 que motivaram este protocolo.

### Caso 1 - Portaria 992/2022 como cálculo de RMI

Erro repetido entre as Ondas 23 e 30 em 17 SKILL.md. A Portaria 992/2022 trata de Manutenção (Livro III), não de cálculo de RMI. Cálculo está na IN 128/2022 e Portaria 991/2022 (Livro II).

Como evitar. Antes de afirmar que uma Portaria trata de Y, abrir o arquivo da Portaria no workspace `INSS\base-legislacao\06-Portarias\` e ler o art. 1º.

### Caso 2 - Código 2.5.7 do Decreto 53.831 como telefonista

Erro potencial em rascunhos. O código 2.5.7 do Quadro Anexo do Decreto 53.831/1964 é "Extinção de fogo, guarda" (bombeiros, vigilantes). Telefonista é código 2.4.5.

Como evitar. Consultar o quadro tabular em `Decreto-53831-1964-quadro-agentes-nocivos.md`.

### Caso 3 - Múltiplas redações do art. 103 Lei 8.213/91

O art. 103 tem 3 redações sucessivas (original, MP 871/2019, Lei 13.846/2019 com ADI 6096/STF). Conferir a redação aplicável pelo tempus regit actum.

### Caso 4 - Súmula 86/TNU como vigente

Súmula CANCELADA em 26/08/2021. Não pode ser citada como vigente.

## OPERAÇÃO PRÁTICA DA REVISÃO

Durante a Camada 2 da Revisão Aprofundada, para CADA citação de norma ou precedente.

1. Identificar o tipo (norma ou precedente).
2. Localizar o arquivo correspondente em `base-legislacao-fontes-primarias` ou acionar `precedentes-previdenciarios`.
3. Aplicar os 5 níveis sequencialmente.
4. Em caso de falha em qualquer nível, registrar achado com severidade adequada.
5. Não pular níveis.

## QUANDO O WORKSPACE NÃO ESTIVER DISPONÍVEL

Se o workspace `C:\Users\VAIO\INSS\base-legislacao\` não estiver acessível na sessão, a Camada 2 declara expressamente.

"Repositório base-legislacao não disponível nesta sessão. Verificação literal de artigos NÃO REALIZADA. Recomenda-se verificação via WebFetch direto das URLs oficiais do Planalto, ou re-execução da revisão em sessão com workspace disponível."

Os achados desta camada nesta situação são marcados com sufixo "[NÃO VERIFICADO LITERALMENTE]" e a peça é considerada APROVADA SOB RESSALVA.
