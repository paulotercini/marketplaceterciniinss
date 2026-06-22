# Verificação Temporal Brasil - Rotina Obrigatória Pré-Protocolo

Reference operacional para verificação automática de data e horário do Brasil (fuso `America/Sao_Paulo`) ANTES de qualquer ato com efeito processual ou prazo previdenciário.

## TESE CENTRAL

Toda peça com prazo é uma corrida contra o calendário. Confiar na memória do prazo é o erro mais comum. A verificação da data atual é tão básica quanto inegociável.

A skill `base-revisao-peticao-aprofundada` faz a verificação temporal AUTOMATICAMENTE em 3 cenários críticos. Em caso de dúvida sobre o dia ou hora, ACIONAR comando de sistema `TZ='America/Sao_Paulo' date` para obter a data e hora exata.

## CONFIGURAÇÃO PADRÃO

Fuso horário oficial. `America/Sao_Paulo`.

Idioma de saída. Português do Brasil (pt-BR) exclusivamente.

Formato de data. dd/mm/aaaa, com dia da semana por extenso quando relevante para prazo (segunda a sexta = dias úteis; sábado, domingo e feriados não contam para prazos processuais).

## CENÁRIO 1 - PRAZO RECURSAL

### Sub-cenário 1.1 - CPC (rito ordinário e JEF)

Prazos típicos.
- Embargos de declaração. 5 dias úteis (art. 1.023 CPC; art. 1.003 §5º).
- Apelação. 15 dias úteis (art. 1.003 §5º CPC).
- Agravo de instrumento. 15 dias úteis (art. 1.003 §5º).
- Agravo interno. 15 dias úteis.
- Recurso especial. 15 dias úteis.
- Recurso extraordinário. 15 dias úteis.

ATENÇÃO. Prazos do CPC são contados em DIAS ÚTEIS (art. 219 CPC), exceto onde a lei expressamente disponha em contrário.

### Sub-cenário 1.2 - JEF (Lei 9.099/95 c/c Lei 10.259/2001)

Prazos.
- Recurso inominado. 10 dias úteis (art. 42 Lei 9.099/95 c/c art. 1º Lei 10.259/2001).
- Embargos de declaração. 5 dias úteis.
- PUIL (à TRU ou TNU). 15 dias úteis (art. 12 RITNU c/c art. 14 Lei 10.259).

ATENÇÃO. O JEF segue dias úteis também após CPC/15. Verificar Súmula 53/TNU (suspensão de prazo no JEF para recesso forense).

### Sub-cenário 1.3 - CRPS (Recursos Administrativos)

Prazos.
- Recurso ordinário à JR. 30 dias corridos da ciência (art. 305 Decreto 3.048/99 c/c art. 77 Portaria 996/2022).
- Recurso especial à CAJ. 30 dias corridos.
- Embargos de declaração. 5 dias corridos (art. 92 RICRPS Portaria MPS 125/2026).
- Agravo do art. 116 RICRPS. 15 dias corridos.

ATENÇÃO. Prazos do CRPS são em DIAS CORRIDOS, não em dias úteis. Erro frequente do advogado é aplicar a contagem do CPC.

### Sub-cenário 1.4 - TNU (Manual de Admissibilidade Recursal 10ª edição)

Prazos.
- PUIL/PEDILEF à TNU. 15 dias úteis (art. 12 RITNU).
- Embargos de declaração na TNU. 5 dias úteis (art. 16 RITNU c/c art. 1.023 CPC).
- Agravo nos próprios autos contra inadmissão. 15 dias úteis (art. 14 §2º RITNU).
- Agravo interno contra decisão monocrática. 15 dias úteis (art. 14 §3º RITNU).

### Rotina de verificação OBRIGATÓRIA antes de protocolo recursal

1. Apurar a data da CIÊNCIA da decisão (intimação, publicação no DJe, notificação administrativa).
2. Apurar a data DE HOJE no fuso `America/Sao_Paulo`.
3. Calcular o prazo conforme o rito (úteis ou corridos).
4. Verificar feriados nacionais, estaduais (SP) e recesso forense.
5. ALERTAR se faltar menos de 24 horas para o término.

## CENÁRIO 2 - DECADÊNCIA E PRESCRIÇÃO

### Sub-cenário 2.1 - Decadência do art. 103 Lei 8.213/91

Regra. 10 anos para revisão de ato concessório, contados do primeiro pagamento ou da ciência do indeferimento.

Verificação OBRIGATÓRIA.
1. Apurar a DIB ou DDB do benefício.
2. Apurar a data DE HOJE no fuso `America/Sao_Paulo`.
3. Calcular meses e dias restantes.
4. **ALERTA CRÍTICO se faltar menos de 12 meses para o esgotamento** (preferência do escritório).

Cruzar com `decadencia-revisao-previdenciaria` (skill com regras de interrupção, prazos autônomos, Tema 975/STJ, Tema 256/TNU, Tema 1370/STJ, IAC 11/TRF4, ADI 6096/STF).

### Sub-cenário 2.2 - Prescrição Quinquenal dos Atrasados

Regra. Atrasados anteriores a 5 anos da DER ou da propositura da ação prescrevem (Súmula 85/STJ).

Verificação OBRIGATÓRIA.
1. Apurar a DER ou data da propositura.
2. Apurar a data DE HOJE.
3. Calcular o marco prescricional para identificar parcelas perdidas.
4. ALERTAR se o ajuizamento extrapolar parcelas relevantes.

### Sub-cenário 2.3 - Decadência da Ação Rescisória

Regra. 2 anos do trânsito em julgado (art. 975 CPC).

Verificação. Apurar trânsito em julgado x data atual. ALERTA se faltar menos de 6 meses.

## CENÁRIO 3 - CESSAÇÃO IMINENTE DE BENEFÍCIO TEMPORÁRIO

### Sub-cenário 3.1 - B31 (Auxílio por Incapacidade Temporária)

DCB programada pode estar próxima. Verificar.
1. Data da DCB programada no INFBEN/SABI.
2. Data DE HOJE no fuso `America/Sao_Paulo`.
3. Janela de 60 dias antes da DCB para Pedido de Prorrogação (PP).
4. **ALERTA CRÍTICO se faltar menos de 30 dias para DCB** (janela de PP).
5. ALERTA TAMBÉM se já passou da DCB (cliente em LIMBO).

Cruzar com `analise-documental-incapacidade` (Portarias Conjuntas MPS/INSS 13, 14 e 15/2026).

### Sub-cenário 3.2 - BPC e Reavaliação Periódica

Decreto 6.214/2007 prevê reavaliação a cada 2 anos. Verificar última avaliação x hoje.

ALERTA se houver reavaliação agendada ou se a próxima reavaliação está iminente, considerando os critérios de dispensa de reavaliação para impedimentos permanentes irreversíveis irrecuperáveis (Portaria 34/2025, Portaria 37/2026 e Lei 15.157/2025).

### Sub-cenário 3.3 - Auxílio-Reclusão (cessação por progressão)

Verificar data esperada de progressão de regime ou liberdade que cessa B25.

## CENÁRIO 4 - DATAS-CHAVE EM PETIÇÃO INICIAL

Ao redigir inicial, conferir.
- DER. Data correta no comprovante de requerimento.
- DIB. Coerente com o pedido.
- DII. Compatível com a documentação médica.
- DID. Compatível com o histórico clínico.
- DCB. Confere com o comunicado de cessação.
- Data da audiência. Se houver, calendarizar.

## CENÁRIO 5 - PRAZOS ADMINISTRATIVOS COM O INSS

### Sub-cenário 5.1 - Cumprimento de Exigência

Prazo de 30 dias para cumprir exigência no INSS (art. 678 IN 128/2022). Contar.
1. Data da exigência.
2. Data DE HOJE.
3. ALERTA se faltar menos de 7 dias.

### Sub-cenário 5.2 - Pedido de Prorrogação (PP) B31

Janela de 15 dias antes da DCB para PP. ALERTAR cliente com antecedência.

### Sub-cenário 5.3 - Pedido de Reconsideração (PR)

Prazo varia conforme matéria. Em regra, 30 dias.

## COMANDO DE SISTEMA

Para obter a data e hora exata do Brasil em qualquer momento.

```bash
TZ='America/Sao_Paulo' date '+%A, %d de %B de %Y - %H:%M:%S (%Z)'
```

Saída esperada (exemplo). `segunda-feira, 15 de junho de 2026 - 11:27:19 (-03)`.

Para calcular dias entre duas datas (úteis incluídos).

```bash
TZ='America/Sao_Paulo' date -d "$DATA_BASE + 15 days" '+%d/%m/%Y'
```

## QUADRO RESUMO

| Cenário | Quando verificar | Comando/Skill | Severidade |
|---------|-----------------|---------------|------------|
| Prazo recursal CPC | Antes de protocolar recurso | data + tabela prazos | BLOQUEANTE se vencido |
| Prazo JEF | Antes de protocolar inominado/PUIL | data + Lei 10.259 | BLOQUEANTE |
| Prazo CRPS | Antes de protocolar recurso ao CRPS | data + Portaria 996/2022 | BLOQUEANTE |
| Prazo TNU | Antes de PUIL/agravos | data + RITNU | BLOQUEANTE |
| Decadência art. 103 | Em revisão de benefício | `decadencia-revisao-previdenciaria` | CRÍTICO se <12 meses |
| Prescrição quinquenal | Em pedido de atrasados | data + Súmula 85/STJ | CRÍTICO se há parcelas perdidas |
| Rescisória 2 anos | Em rescisória | data + art. 975 CPC | CRÍTICO se <6 meses |
| DCB B31 | Antes de orientar cliente | data + INFBEN | CRÍTICO se <30 dias |
| Reavaliação BPC | Em manutenção BPC | data + Decreto 6.214 | IMPORTANTE |
| Cumprir exigência | Em qualquer exigência | data + art. 678 IN 128 | BLOQUEANTE |

## REGRA DE OURO

Em caso de dúvida sobre o dia, a hora ou o prazo, EXECUTAR comando de verificação ANTES de afirmar qualquer prazo. NUNCA chutar data. NUNCA dizer "ainda há tempo" sem conferir.

## ALERTA SOBRE INDEPENDÊNCIA DE FONTES TEMPORAIS

O contexto da conversa carrega a data corrente, mas a verificação por comando de sistema é a fonte primária. Em casos críticos (prazo extremo), executar comando explicitamente.

## IDIOMA OFICIAL

Toda resposta da skill `base-revisao-peticao-aprofundada` e desta reference é em PORTUGUÊS DO BRASIL exclusivamente. Vocabulário jurídico brasileiro. Sem traduções desnecessárias de termos técnicos consagrados em latim (tempus regit actum, ratio decidendi, in dubio pro misero, obiter dictum, distinguishing, overruling) ou em vernáculo (PPP, CNIS, NTEP).

## CRUZAMENTO COM OUTRAS SKILLS

- `decadencia-revisao-previdenciaria`. Decadência detalhada.
- `analise-documental-incapacidade`. DCB e prorrogação.
- `admissibilidade-barreiras-crps`. Prazos CRPS.
- `base-recurso-crps-peca-enxuta`. Recursos CRPS com prazos.
- `base-recursos-jef`. Prazos no JEF.
- `base-rito-ordinario-trf`. Prazos no rito ordinário.
- `base-tnu-admissibilidade-manual`. Prazos PUIL.
- `peticao-previdenciaria`. Conferência da peça gerada.
