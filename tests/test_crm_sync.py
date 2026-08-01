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


def test_dn_e_preambulo():
    t = tarefa("Fulano #00000000191",
               "Senha gov: xyz\n10.07.2026 (P): Protocolado.",
               checklist=["Aniversário 12.03.1961"])
    assert t["dn"] == "12031961"
    assert t["preambulo"] == "Senha gov: xyz"   # anotação antes do 1º bloco é preservada
