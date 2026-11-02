"""F291 · o "Concluir por hoje": a ponte ao To Do e a sincronização que não reacende a ⭐."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm" / "fase2"))
import migrar  # noqa: E402
import ponte_despacho  # noqa: E402

DESP = {"despacho": {"em": "2026-10-29T18:00:00Z", "por": "p", "prazo": "2026-11-30"}}


def test_pendentes_so_os_nao_levados():
    casos = [
        {"id": "a", "todo_task_id": "t1", "ronda": DESP},
        {"id": "b", "todo_task_id": "t2", "ronda": {"despacho": {**DESP["despacho"], "todo": "2026-10-29"}}},
        {"id": "c", "todo_task_id": None, "ronda": DESP},
        {"id": "d", "todo_task_id": "t4", "ronda": {"despacho": {**DESP["despacho"], "todo_falha": "x"}}},
        {"id": "e", "todo_task_id": "t5", "ronda": {}},
    ]
    assert [k["id"] for k in ponte_despacho.pendentes(casos)] == ["a"]


def test_corpo_apaga_a_estrela_e_marca_a_volta():
    c = ponte_despacho.corpo_da_tarefa({"prazo": "2026-11-30", "importante": False, "ronda": DESP})
    assert c["importance"] == "normal"
    assert c["dueDateTime"]["dateTime"] == "2026-11-30T00:00:00"
    # a estrela acesa de novo no CRM depois do despacho vai como alta
    assert ponte_despacho.corpo_da_tarefa({"prazo": "2026-11-30", "importante": True, "ronda": DESP})["importance"] == "high"


def test_sync_mantem_a_data_do_despachado_e_a_estrela():
    mapa = {"casos": [{"id": "a", "importante": True, "prazo": None}, {"id": "z", "importante": True, "prazo": None}]}
    n = migrar.respeitar_despacho(mapa, [{"id": "a", "ronda": DESP}])
    assert n == 1
    # F373 · o despacho não apaga a ⭐
    assert mapa["casos"][0] == {"id": "a", "importante": True, "prazo": "2026-11-30"}
    assert mapa["casos"][1]["importante"] is True


def test_estrela_que_mudou_no_crm_vai_ao_todo():
    casos = [
        {"id": "1", "todo_task_id": "t1", "importante": True, "todo_importante": False},   # acesa no CRM
        {"id": "2", "todo_task_id": "t2", "importante": False, "todo_importante": True},   # apagada no CRM
        {"id": "3", "todo_task_id": "t3", "importante": True, "todo_importante": True},    # igual
        {"id": "4", "todo_task_id": "t4", "importante": True, "todo_importante": None},    # ainda não visto
        {"id": "5", "todo_task_id": "t5", "importante": False, "todo_importante": None},
        {"id": "6", "todo_task_id": "t6", "importante": True, "todo_importante": False},   # vai no despacho
    ]
    assert [k["id"] for k in ponte_despacho.estrelas_a_levar(casos, {"6"})] == ["1", "2", "4"]


def test_sync_estrela_mudou_no_todo_vence_senao_a_do_crm():
    banco = [{"id": "a", "importante": False, "todo_importante": True},    # apagada no CRM, To Do igual
             {"id": "b", "importante": True, "todo_importante": True},     # To Do apagou
             {"id": "c", "importante": True, "todo_importante": None}]     # antes da F373
    mapa = {"casos": [{"id": "a", "importante": True, "todo_importante": True},
                      {"id": "b", "importante": False, "todo_importante": False},
                      {"id": "c", "importante": False, "todo_importante": False}]}
    migrar.manter_dados_do_banco(mapa, banco, "casos", ("importante",))
    assert [k["importante"] for k in mapa["casos"]] == [False, False, True]
