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


def test_sync_nao_reacende_a_estrela_do_despachado():
    mapa = {"casos": [{"id": "a", "importante": True, "prazo": None}, {"id": "z", "importante": True, "prazo": None}]}
    n = migrar.respeitar_despacho(mapa, [{"id": "a", "ronda": DESP}])
    assert n == 1
    assert mapa["casos"][0] == {"id": "a", "importante": False, "prazo": "2026-11-30"}
    assert mapa["casos"][1]["importante"] is True
