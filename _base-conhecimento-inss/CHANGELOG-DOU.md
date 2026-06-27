# CHANGELOG DOU - Plugin base-conhecimento-inss

Registro automático de alterações no plugin oriundas da rotina diária de monitoramento do DOU. Entrada nova logo abaixo deste cabeçalho. Não remover entradas anteriores.

---

## 26/06/2026 — Edição 118 do DOU

Data alvo da rotina: 27/06/2026 (sábado). Edição efetivamente analisada: 26/06/2026 (sexta-feira, último dia útil anterior).

### Matérias identificadas

**ALERTA URGENTE**
Edital de Notificação — INSS (Seção 3, Pág. 157)
Norma base: art. 69, §2, inciso IV, da Lei 8.212/91 e art. 26 da Lei 9.784/99
Link: https://www.in.gov.br/web/dou/-/edital-de-notificacao-714844559
O INSS notificou 28 beneficiários para (1) apresentação de defesa/provas/documentos em revisão de autotutela administrativa ou (2) interposição de recurso. Prazo: inicia no primeiro dia útil após 15 dias da publicação (base: 11/07/2026 sábado → prazo corre a partir de 13/07/2026). Beneficiários notificados para defesa: Manoel Goncalves Pantoja (NB 5536446904), Raul Machado de Souza (NB 0973456647), Francisco Fernando Nobrega Garcia (NB 1122179500), Raimundo Pinheiro da Silva (NB 7004563600), Teresa de Jesus Sena (NB 1417413520), Tereza da Silva Ramos (NB 6160365626), Cintia Cardoso Das Neves (NB 2086344400), Ivanda da Silva Costa (NB 2067640466), Maria Lucia Goncalves Leite (NB 2314333394), Valteni Jose de Andrade (NB 1901857775), Severino Josimar de Oliveira (NB 1090856480), Cleber Borges Scheffer (NB 6173489175), Maria de Fatima Mendes (NB 0719330300), Leila Maria Fagundes Brandao (NB 0805670882), Maria Mendes Soares (NB 7023587064), Rubelita Tavares (NB 1367921934), Maurineide Correia Harmes Figueiredo (NB 7222935119), Sandra Maria Costa Pereira (NB 7167772560), Nelson Francisco Ramos Filho (NB 7154812703), Maria Cristina da Silva (NB 5477344683), Marcilei da Silva (NB 7129945274), Ana Julia da Cunha (NB 7129870347), Isael Pereira (NB 2016864995). Para recurso: Maria Alice Rodrigues Amora (NB 1300322397, rep. Maria Lucelita Rodrigues Moura), Creusa da Silva Oliveira (NB 5411169603), Maria de Lourdes da Silva (NB 1888795465), Breno Anderson Vitorio do Carmo (NB 1036354013), Ana Cristina Viana Silveira.
Skill indicada: criação de nova skill `base-autotutela-notificacao-edital` (ver PASSO 9 do relatório).

**IMPORTANTE**
Extrato do Acordo de Cooperação Técnica INSS/Município de Nova Canaã do Norte-MT — Seção 3, Pág. 158
Norma base: art. 124-A, §2, da Lei 8.213/91 e Portaria 1.538/PRES/INSS de 19/12/2022
Link: https://www.in.gov.br/web/dou/-/extrato-do-acordo-de-cooperacao-714915816
Vigência: 60 meses a partir de 26/06/2026.
Skill relacionada: nenhuma alteração necessária; informação contextual.

### Arquivos alterados nesta entrada
- `_base-conhecimento-inss/CHANGELOG-DOU.md` (criado)

### Indicação de nova skill
Nome sugerido: `base-autotutela-notificacao-edital`
Escopo: cobertura da hipótese de clientes notificados por edital DOU sobre revisão de autotutela administrativa (benefícios em revisão pelo INSS). Gatilhos: "notificação por edital", "autotutela administrativa", "art. 69 Lei 8.212", "prazo para defesa INSS", "revisão de benefício", "comparecimento INSS", "edital de notificação DOU".
