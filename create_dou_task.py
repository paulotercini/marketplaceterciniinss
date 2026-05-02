"""[SIMULACAO] Cria tarefa DOU em 'Tarefas' com prazo hoje 23:59 e lembrete 09:00.

Norma simulada: Lei 14.987/2026 - Restabelecimento da RVT por via legislativa.
"""
from graph_client import list_lists, _req

LIST_NAME = "Tarefas"
TODAY = "2026-05-02"

TITLE = "[SIMULACAO] DOU 02/05/2026 - 1 alerta urgente e 0 importantes"

BODY = """[SIMULACAO - TESTE DA ROTINA]
DOU 02/05/2026 - Edicao No [SIMULADA]
Status do diario: publicado normalmente

Resumo
1 ALERTA URGENTE
0 IMPORTANTE
0 INFORMATIVO

ALERTA URGENTE
1. Lei n. 14.987/2026 - Restabelecimento legislativo da Revisao da Vida Toda
   Orgao: Congresso Nacional, sancao presidencial
   Localizacao: Edicao [SIMULADA], Secao 1, Pagina [SIMULADA]
   Link: [SIMULACAO - sem link real]
   Sintese: A lei restabelece por via legislativa a possibilidade de inclusao das contribuicoes anteriores a julho/1994 no Periodo Basico de Calculo dos beneficios concedidos entre 28/11/1999 e 13/11/2019, contornando a modulacao das ADIs 2110 e 2111 STF de 2024. Cria hipotese especifica de relativizacao da coisa julgada para os beneficios cujo calculo desconsiderou contribuicoes pre-Plano Real. Fixa prazo decadencial proprio de 24 meses contados da vigencia (90 dias apos publicacao). Atribui ao INSS prazo de 60 dias para analise administrativa antes do ajuizamento, sob pena de extincao do feito sem resolucao do merito.
   Risco: perda do prazo decadencial de 24 meses para clientes elegiveis. Necessidade de previo requerimento administrativo com analise em 60 dias antes da via judicial. Risco de coisa julgada nao se relativizar para clientes que ja tiveram acao julgada improcedente sob o regime das ADIs 2110/2111.
   Mitigacao: ADMINISTRATIVA. Levantar imediatamente carteira de clientes com beneficios concedidos entre 28/11/1999 e 13/11/2019. Protocolar requerimento administrativo de revisao em todos os elegiveis nos primeiros 60 dias para gerar massa critica e documentar marco temporal. JUDICIAL. Acao ordinaria de revisao apos 60 dias de inercia ou indeferimento. Para clientes com coisa julgada anterior, acao rescisoria fundada na nova lei como fato superveniente nos termos do art. 535 II CPC e art. 966 CPC, ou acao de revisao com fundamento na nova hipotese legal. Documentacao do cliente. CNIS atualizado, carta de concessao, contracheques anteriores a 1994 quando disponiveis, eventual extrato CTPS.

Indicacoes de skill
- Atualizar skill base-revisao-vida-toda-rvt incorporando a Lei 14.987/2026 como nova fonte normativa, ampliando o espaco remanescente para incluir o periodo 28/11/1999 a 13/11/2019.
- Acionar em conjunto base-cpc-acao-rescisoria-previdenciaria, base-cpc-coisa-julgada-progressiva, base-cpc-fato-superveniente-art493 e base-calculo-rmi-ec103.

ATENCAO. Esta tarefa eh um TESTE DE SIMULACAO da rotina DOU para validacao do fluxo. Nenhuma norma real foi publicada. Verificar manualmente antes de tomar acao."""


def main():
    listas = list_lists()
    alvo = next((l for l in listas if l["displayName"] == LIST_NAME), None)
    if not alvo:
        raise SystemExit(f"Lista '{LIST_NAME}' nao encontrada")

    payload = {
        "title": TITLE,
        "body": {"content": BODY, "contentType": "text"},
        "importance": "high",
        "dueDateTime": {
            "dateTime": f"{TODAY}T23:59:00",
            "timeZone": "America/Sao_Paulo",
        },
        "reminderDateTime": {
            "dateTime": f"{TODAY}T09:00:00",
            "timeZone": "America/Sao_Paulo",
        },
        "isReminderOn": True,
    }
    res = _req("POST", f"/me/todo/lists/{alvo['id']}/tasks", payload)
    print("TASK_ID:", res["id"])
    print("LIST:", LIST_NAME)
    print("WEB_URL:", res.get("linkedResources") or "(nenhum)")
    print("DUE:", res.get("dueDateTime"))
    print("REMINDER:", res.get("reminderDateTime"))
    print("IMPORTANCE:", res.get("importance"))


if __name__ == "__main__":
    main()
