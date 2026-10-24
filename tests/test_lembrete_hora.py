"""Lembrete com horário (como o To Do): quem avisa e quando."""
import json, pathlib, shutil, subprocess

import pytest

APP = pathlib.Path(__file__).resolve().parent.parent / "crm/fase2/app.html"


def _funcao(nome):
    app = APP.read_text("utf-8")
    ini = app.index(f"function {nome}(")
    return app[ini:app.index("\n}\n", ini) + 2]


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_avisa_so_a_hora_que_chegou_uma_vez_e_aberta():
    ts = [
        {"id": "a", "lembrar_em": "2026-10-24", "lembrar_hora": "09:00:00"},   # chegou
        {"id": "b", "lembrar_em": "2026-10-24", "lembrar_hora": "15:00:00"},   # ainda não
        {"id": "c", "lembrar_em": "2026-10-23", "lembrar_hora": "09:00:00"},   # outro dia
        {"id": "d", "lembrar_em": "2026-10-24", "lembrar_hora": None},         # sem hora
        {"id": "e", "lembrar_em": "2026-10-24", "lembrar_hora": "08:00:00", "concluida_em": "x"},
        {"id": "f", "lembrar_em": "2026-10-24", "lembrar_hora": "08:30:00"},   # já avisou
    ]
    js = _funcao("lembretesNaHora") + (
        f"\nconsole.log(JSON.stringify(lembretesNaHora({json.dumps(ts)}, '2026-10-24', '10:00',"
        " new Set(['f|2026-10-24|08:30'])).map(t=>t.id)))")
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout
    assert json.loads(out) == ["a"]
