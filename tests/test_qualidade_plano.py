"""F282 · Manutenção da Qualidade de Segurado: os meses de pagamento de cada modalidade."""
import json, pathlib, shutil, subprocess

import pytest

APP = pathlib.Path(__file__).resolve().parent.parent / "crm/fase2/app.html"


def _funcao(nome):
    app = APP.read_text("utf-8")
    ini = app.index(f"function {nome}(")
    return app[ini:app.index("\n}\n", ini) + 2]


def _proximos(plano, desde, k=8):
    js = _funcao("qualidadePagaNoMes") + _funcao("qualidadeProximos") + (
        f"\nconsole.log(JSON.stringify(qualidadeProximos({json.dumps(plano)}, {k}, '{desde}')))")
    return json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_mensal_todo_mes_a_partir_do_inicio():
    assert _proximos({"modalidade": "mensal", "dia": 15, "inicio": "2026-11-01"}, "2026-10-26", 3) == ["2026-11-15", "2026-12-15", "2027-01-15"]


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_semestral_a_cada_seis_meses():
    assert _proximos({"modalidade": "semestral", "dia": 10, "inicio": "2026-11-01"}, "2026-10-26", 3) == ["2026-11-10", "2027-05-10", "2027-11-10"]


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_seis_primeiros_e_depois_semestral():
    d = _proximos({"modalidade": "seis_semestral", "dia": 5, "inicio": "2026-11-01"}, "2026-10-26", 8)
    assert d == ["2026-11-05", "2026-12-05", "2027-01-05", "2027-02-05", "2027-03-05", "2027-04-05", "2027-10-05", "2028-04-05"]


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_caso_a_caso_e_o_fim():
    assert _proximos({"modalidade": "caso_a_caso", "dia": 20, "inicio": "2026-10-01", "meses": ["2026-10", "2027-03", "2027-09"]}, "2026-10-26", 5) == ["2027-03-20", "2027-09-20"]
    assert _proximos({"modalidade": "mensal", "dia": 1, "inicio": "2026-11-01", "fim": "2027-01-28"}, "2026-10-26", 5) == ["2026-11-01", "2026-12-01", "2027-01-01"]
