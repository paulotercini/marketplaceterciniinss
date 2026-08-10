"""Regressão do sync do CRM (Fase 1) — crm/sync_todo.py.

Todos os dados aqui são fictícios. Cobre o parsing dos blocos com autor,
a extração de perícias/audiências com data e o agrupamento cliente→casos
por CPF (um cliente com tarefas em mais de uma lista).
"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm"))
import sync_todo


def tarefa(titulo, corpo="", lista="👪 Judicial", checklist=(), **extra):
    t = {
        "id": extra.pop("id", titulo),
        "title": titulo,
        "body": {"content": corpo},
        "checklistItems": [{"displayName": c} for c in checklist],
        "status": "notStarted",
        "importance": "normal",
    }
    t.update(extra)
    return sync_todo.normalizar_tarefa(lista, t)


# ── autor do bloco ─────────────────────────────────────────────────────────

def test_autor_com_parentese_e_ponto_e_virgula():
    # split_blocks consome o "(" do marcador: o texto chega como "P); ..."
    assert sync_todo.autor_do_bloco("P); Petição protocolada.") == ("P", "Petição protocolada.")


def test_autor_com_dois_pontos():
    assert sync_todo.autor_do_bloco("(A): Ok, agendado.") == ("A", "Ok, agendado.")


def test_sem_autor_preserva_texto():
    inicial, texto = sync_todo.autor_do_bloco("Exigência cumprida no protocolo.")
    assert inicial is None
    assert texto == "Exigência cumprida no protocolo."


def test_inicial_desconhecida_nao_vira_autor():
    # "(RG)" não é colaborador — não pode ser tratado como autoria
    inicial, _ = sync_todo.autor_do_bloco("(RG): 12.345.678-9")
    assert inicial is None


def test_andamentos_com_autor_e_data():
    t = tarefa(
        "Fulano de Tal #00000000191",
        "10.07.2026 (P): Petição protocolada.\n\n01.07.2026 (A): Documentos conferidos.",
    )
    assert [(a["data"], a["autor"]) for a in t["andamentos"]] == [
        ("2026-07-10", "Paulo"),
        ("2026-07-01", "Amanda"),
    ]


# ── perícias e audiências ─────────────────────────────────────────────────

def test_pericia_com_data_e_hora():
    t = tarefa("Fulano #00000000191",
               "05.06.2026 (P): Perícia marcada para o dia 09/08/2026 as 14:30 no fórum.")
    (ev,) = t["eventos"]
    assert (ev["tipo"], ev["data"], ev["hora"]) == ("Perícia", "2026-08-09", "14:30")


def test_audiencia_sem_hora():
    t = tarefa("Fulano #00000000191",
               "05.06.2026 (A): Audiência designada para 12.08.2026, videoconferência.")
    (ev,) = t["eventos"]
    assert (ev["tipo"], ev["data"], ev["hora"]) == ("Audiência", "2026-08-12", None)


def test_pericia_sem_data_nao_vira_evento():
    t = tarefa("Fulano #00000000191", "05.06.2026 (P): Aguardando agendamento da perícia.")
    assert t["eventos"] == []


import datetime


def test_pericia_de_data_ja_passada_nao_pula_para_o_ano_seguinte():
    # bug real: "perícia 20/04" (sem ano) anotada em maio virava perícia
    # AGENDADA para 20.04 do ano seguinte — e ficava no Meu Dia como se
    # fosse futura ("Perícia 20.04", sem o ano à vista)
    evs = sync_todo.eventos_de("Perícia realizada dia 20/04, aguardando laudo.",
                               datetime.date(2026, 5, 5))
    (ev,) = evs
    assert ev["data"] == "2026-04-20"          # ficou no passado, não em 2027


def test_pericia_proxima_sem_ano_continua_indo_para_o_ano_seguinte():
    evs = sync_todo.eventos_de("Audiência marcada para 10/01 às 14h",
                               datetime.date(2026, 12, 20))
    (ev,) = evs
    assert ev["data"] == "2027-01-10"          # 21 dias à frente: salto certo


def test_numero_perto_da_data_nao_vira_hora_impossivel():
    # bug real: "sala 45" depois da data virou hora "45:00" e o evento chegou
    # ao banco como 2024-08-29T45:00:00 — o INSS não atende a essa hora
    t = tarefa("Fulano #00000000191",
               "20.08.2024 (P): Perícia dia 29/08/2024 na agência, sala 45:00.")
    (ev,) = t["eventos"]
    assert (ev["data"], ev["hora"]) == ("2024-08-29", None)


# ── cliente → casos por CPF ───────────────────────────────────────────────

def test_cliente_agrupado_por_cpf_em_listas_diferentes():
    dados = sync_todo.montar([
        ("👪 Judicial", [{"id": "1", "title": "Fulano de Tal #00000000191",
                          "body": {"content": ""}, "checklistItems": []}]),
        ("💵 Pagamentos", [{"id": "2", "title": "Fulano de Tal #000.000.001-91",
                           "body": {"content": ""}, "checklistItems": []}]),
    ])
    (cliente,) = dados["clientes"]
    assert cliente["cpf"] == "00000000191"
    assert sorted(cliente["tarefas"]) == ["1", "2"]


def test_nome_sem_cpf_no_titulo():
    assert sync_todo.nome_da_tarefa("Fulano de Tal #000.000.001-91") == "Fulano de Tal"


def test_nome_sem_etiquetas_de_especie():
    assert sync_todo.nome_da_tarefa("Fulana #00000000191 #B31") == "Fulana"
    assert sync_todo.nome_da_tarefa("Beltrano #00000000272 #DanoMoral") == "Beltrano"


def test_especie_no_titulo_define_beneficio():
    assert sync_todo.beneficio_do_titulo("Fulana #00000000191 #B31") == "Aux. Incapacidade Temporária"
    assert sync_todo.beneficio_do_titulo("Beltrano #B42") == "Apos. Tempo de Contribuição"
    assert sync_todo.beneficio_do_titulo("Sicrana #B88") == "BPC/LOAS"
    assert sync_todo.beneficio_do_titulo("Sem etiqueta") is None
    # espécie desconhecida não quebra
    assert sync_todo.beneficio_do_titulo("X #B57") == "Espécie 57"


def test_dn_e_preambulo():
    t = tarefa("Fulano #00000000191",
               "Senha gov: xyz\n10.07.2026 (P): Protocolado.",
               checklist=["Aniversário 12.03.1961"])
    assert t["dn"] == "12031961"
    assert t["preambulo"] == "Senha gov: xyz"   # anotação antes do 1º bloco é preservada


def test_parceria_do_titulo_ignora_cpf_e_especie():
    assert sync_todo.parceria_do_titulo(
        "Fulana #12345678900 #B31 #Laís #JoãoEduardo") == "Laís, JoãoEduardo"
    assert sync_todo.parceria_do_titulo("Fulano #12345678900 #B94") is None
    assert sync_todo.parceria_do_titulo("Sem etiquetas") is None


def test_evento_sem_ano_deduzido_da_data_do_bloco():
    import datetime
    bloco = ("Benefício solicitado - em análise.\n"
             "Perícia médica e avaliação social foram agendadas.\n"
             "- Perícia médica em Matão em 12/08 às 07h40.\n"
             "- Avaliação social em Jaboticabal em 21/08 às 07h00.\n"
             "Comprovantes de agendamento no drive.")
    evs = sync_todo.eventos_de(bloco, datetime.date(2026, 7, 31))
    assert [(e["tipo"], e["data"], e["hora"]) for e in evs] == [
        ("Perícia", "2026-08-12", "07:40"),
        ("Avaliação social", "2026-08-21", "07:00"),
    ]


def test_evento_sem_ano_vira_ano_seguinte_quando_ja_passou():
    import datetime
    evs = sync_todo.eventos_de("Audiência marcada para 10/01 às 14h",
                               datetime.date(2026, 12, 15))
    assert evs[0]["data"] == "2027-01-10" and evs[0]["hora"] == "14:00"


def test_evento_com_ano_completo_continua_igual():
    import datetime
    evs = sync_todo.eventos_de("Perícia agendada dia 13.04.2027 às 12:30 em Bebedouro",
                               datetime.date(2026, 8, 1))
    assert evs[0]["data"] == "2027-04-13" and evs[0]["hora"] == "12:30"
