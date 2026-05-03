# Integração Microsoft To Do ↔ WhatsApp

Mapeamento de **contexto da tarefa** → **template apropriado** da `padroes-v3.md`.

## Como ler esta tabela

A coluna **Lista To Do** aponta a lista do escritório. A coluna **Sinal no body/checklist** indica os termos ou padrões que disparam o template. A coluna **Template sugerido** aponta o(s) ID(s) da v3 (ex: 4.1 = Bloco IV item 4.1). A coluna **Voz** define quem assina.

## Tabela mestra

### 🌻 INSS — pedidos administrativos em curso

| Sinal no body/checklist | Template | Voz |
|---|---|---|
| `Solicitei aposentadoria` (entrada nova) | 6.1 Concessão administrativa (quando concedido) ou 8.1 Indeferimento (quando negado) | Dr. Paulo |
| `Encaminhou para análise documental` | 6.3 Encaminhamento à análise documental | Dr. Paulo |
| `Concedido sem perícia` | 6.2 Concessão por análise documental | Dr. Paulo |
| `Perícia agendada DD/MM HH:MM INSS` | 4.1 ou 4.2 (variante curta) + 4.5 (atendimento prévio) | Dr. Paulo |
| `Perícia agendada` + cliente delicado | 4.6 Lembrete D-1 + 4.7 (se reagendar) | Dr. Paulo |
| `Aguardar até DD/MM` | 6.5 Cessação iminente | Atendente |
| `Indeferido` | 8.1 + 8.2 (estratégia) ou 8.3 (paralelo) | Atendente / Dr. Paulo |
| `Sistema fora do ar` na entrada | 10.2 (curta) ou 10.3 (variante longa) | Dr. Marcos / Dr. Paulo |
| `Solicitar relatório médico` | 5.1 Pedido ao médico assistente | Dr. Paulo |
| `Doença ocupacional`, `agente nocivo` | 5.10 Reforço com fundamentação técnica | Dr. Paulo |
| `Cessação iminente` + perícia agendada futura | 4.12 Perícia agendada para data distante | Dr. Paulo |
| `Reagendar perícia` | 4.7 Reagendamento via 135 | Dr. Paulo |
| `Pagamento divulgado DD/MM` | 7.1 Aviso de valor e data (completo) | Dr. Paulo |
| `Carta INSS recebida` | 6.4 Aviso sobre carta do INSS | Dr. Marcos |

### 🖥 Conselho de Recursos — recursos administrativos

| Sinal | Template | Voz |
|---|---|---|
| `Recurso protocolado DD/MM` | 16.1 Status concluso/citação inicial | Dr. Paulo |
| `Recurso concedido` | 6.1 Concessão (variante adequada) | Dr. Paulo |
| `Recurso negado` | 8.5 DIB anterior perdida — judicial necessário ou 8.6 | Dr. Paulo |
| `Cobrar Ouvidoria` | 16.4 Cobrança Ouvidoria + Gerência regional | Dr. Paulo |
| `MS contra mora` | 16.7 Mandado de Segurança contra INSS | Dr. Paulo |

### 👪 Judicial — processos judiciais

| Sinal | Template | Voz |
|---|---|---|
| `Inicial distribuída` ou `concluso para despacho` | 16.1 Status processual + 7.8 | Dr. Paulo / Atendente |
| `Sentença desfavorável` + `embargos` | 16.2 Sentença desfavorável e embargos | Atendente |
| `EPI biológico`, `Tema 555`, `IRDR 15 TRF4` | 16.3 EPI agente biológico — TRF e teses | Dr. Paulo |
| `Aguardando STJ/STF`, `Brasília` | 16.5 Aguardando resposta de Brasília | Dr. Paulo |
| `Perícia judicial agendada` | 4.3 ou 4.4 (formato completo) | Atendente |
| `INSS implantou` ou `cumprir 30 dias` | 10.1 Aviso de prazo do INSS | Dr. Paulo |
| `Implantado, atrasados a cobrar` | 7.1 Aviso valor + 7.9 Honorários | Dr. Paulo |
| `Aguardar STJ/STF` longa | 16.5 + 16.6 (tempo médio JEF) | Dr. Paulo |
| `Liminar negada` | 16.8 Após denegação de liminar | Dr. Paulo |
| `Defesa apresentada` | 19.7 Defesa apresentada — explicação | Dr. Marcos |

### 🗓 Tarefas com Prazo

| Sinal | Template | Voz |
|---|---|---|
| `Manifestar laudo pericial` | 5.6/5.7 (avaliação laudo) ou 16.2 | Dr. Paulo |
| `Prazo XXX` (placeholder) | ⚠️ Não enviar mensagem — preencher antes | — |
| `Embargos protocolados` | 16.2 Sentença desfavorável e embargos | Atendente |
| `Réplica protocolada` | (não há template específico — usar 16.1 ajustado) | Dr. Paulo |

### 🙏 Aposentadorias Futuras

| Sinal | Template | Voz |
|---|---|---|
| Data alvo D-90 (90 dias antes) | **GAP — proposta 22.1** (criar) | Dr. Paulo |
| Data alvo D-60 | **GAP — proposta 22.2** (criar) | Dr. Paulo |
| Data alvo D-0 (chegou) | **GAP — proposta 22.3** (protocolar imediato) | Dr. Paulo |
| `Pagar competência` (CI) | 11.10 Lembrete proativo de contribuição | Dr. Paulo |
| Cliente parado >180 dias | **GAP — sem template** (talvez retomada) | Dr. Paulo |
| `Atinge {{IDADE}} em {{DATA}}` | 9.1 Cálculo de aposentadoria por idade — projeção | Dr. Paulo |

### 💵 Pagamentos

| Sinal | Template | Voz |
|---|---|---|
| `Implantado, falta cobrar honorários` | 7.1 + 7.9 + 7.10 (PIX) | Dr. Paulo |
| `Cliente confirmou recebimento` | 7.10 (PIX) ou 15.1 (agradecimento) | Dr. Paulo / Atendente |
| `Atrasados em ação judicial` | 7.4/7.5/7.6 (esclarecer fluxo) | Dr. Paulo |
| `Sem pagamento >30 dias` | **GAP — proposta 7.13** (cobrança amigável) | Atendente |
| `Sem pagamento >60 dias` | **GAP — proposta 7.14** (última tentativa) | Dr. Marcos |
| `Sem pagamento >90 dias` | **GAP — proposta 7.15** (notificação extrajudicial) | Dr. Paulo |
| Body vazio em Pagamentos | ⚠️ Não cobrar — preencher contexto antes | — |

### 🙋 Escritório — operacional

| Sinal | Template | Voz |
|---|---|---|
| `Senha gov.br errada/expirada` | 11.1 Pedido de senha + 11.4 Reset + 11.8 Elevar nível | Atendente |
| `2FA bloqueando` | 11.2 Solicitação desabilitar 2FA | Atendente |
| `Solicitar PPP empresa` | 12.3 Cobrança de PPP em atraso ou 12.6 Pedido para empresa | Dr. Paulo |
| `Cliente vai aposentar — exoneração órgão` | 18.1 Exoneração de servidor por aposentadoria | Dr. Paulo |
| `Sacar FGTS por aposentadoria` | 11.12 Saque do FGTS | Dr. Paulo |
| `Comprovante de endereço cortado` | 5.5 Foto da conta inteira | Atendente |

### ☕ Marcos — cíveis

Casos cíveis (indenização, despejo, busca e apreensão) NÃO têm template previdenciário direto. Usar:
- 19.7 Defesa apresentada (genérico)
- 16.2 Sentença desfavorável e embargos
- Estilo livre adaptado pelo Marcos

### Tarefas (lista pessoal Paulo)

| Sinal | Template | Voz |
|---|---|---|
| `🎂 Aniversário` (ativo) | **GAP — proposta 21.1** (criar) | Dr. Paulo |
| `🎂 Aniversário` próximo da aposentadoria | **GAP — proposta 21.2** (dual: parabéns + lembrete) | Dr. Paulo |

## Detecção automática de voz

Lógica para o slash command `/mensagem` decidir a voz:

```
SE entrada nova mais recente do body é (P)
   E template é técnico/decisão  → Dr. Paulo Tercini
   
SE lista é 🌻 INSS administrativo
   E entrada mais recente é (A)  → Dra. Amanda Garcez (manter coerência)
   
SE template é golpe sofisticado    → Dr. Marcos (curto/direto)
   OU Ingrid (formal/cordial)
   
SE template é alerta financeiro    → Dr. Marcos
SE template é triagem inicial      → Ingrid ou André
SE template é decisão judicial     → Dr. Paulo Tercini
SE template é genérico operacional → {{ATENDENTE}} (caller decide)
```

## Detecção automática de tratamento (senhor/senhora vs você)

```
SE idade do cliente >= 60 (calcular pelo CPF + ano nascimento se houver no body)
   OU primeiro contato                            → senhor/senhora
   
SE cliente já respondeu como "você"               → você (manter coerência)

SE cliente <40 e contato informal                 → você

DEFAULT (sem informação)                          → senhor/senhora (formal)
```

## Gaps identificados (templates a criar)

| ID proposto | Bloco | Conteúdo |
|---|---|---|
| 7.13 | Pagamento | D+30 cobrança amigável |
| 7.14 | Pagamento | D+60 última tentativa amigável |
| 7.15 | Pagamento | D+90 notificação extrajudicial preliminar |
| 21.1 | Aniversário (novo) | Cordial cliente ativo |
| 21.2 | Aniversário (novo) | Cordial + lembrete proximidade aposentadoria |
| 21.3 | Aniversário (novo) | Curto cliente encerrado |
| 22.1 | Maturação AF (novo) | D-90 contato preventivo |
| 22.2 | Maturação AF (novo) | D-60 solicitar documentos atualizados |
| 22.3 | Maturação AF (novo) | D-0 protocolar imediato |

Os textos sugeridos para esses 9 gaps estão para aprovação no chat antes de incorporar à v3.
