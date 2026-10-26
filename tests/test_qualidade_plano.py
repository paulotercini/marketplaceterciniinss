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


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_f283_pagar_ate_ancora_o_calendario_e_anual():
    # o primeiro vencimento em 31/01: fevereiro cai no último dia
    assert _proximos({"modalidade": "mensal", "pagar_ate": "2027-01-31", "inicio": "2026-12-01"}, "2026-10-26", 3) == ["2027-01-31", "2027-02-28", "2027-03-31"]
    assert _proximos({"modalidade": "anual", "pagar_ate": "2026-11-15", "inicio": "2026-10-01"}, "2026-10-26", 3) == ["2026-11-15", "2027-11-15", "2028-11-15"]


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_f283_aviso_no_primeiro_dia_util_do_mes():
    app = APP.read_text("utf-8")
    ini = app.index("const FERIADOS_FIXOS")
    js = "\n".join([app[ini:app.index("\n", ini)], "const _feriadosAno = new Map();", _funcao("somaDias"), _funcao("pascoa"),
                    _funcao("feriadosNacionais"), _funcao("qualidadeAviso")]) + (
        "\nconsole.log(JSON.stringify(['2026-11-15','2027-05-20','2027-01-10','2025-03-20'].map(qualidadeAviso)))")
    out = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)
    # 01/11/2026 é domingo e 02/11 é Finados; 1º/5 é feriado; 1º/1 é feriado e 2-3 fim de semana; Carnaval de 2025 em 03-04/03
    assert out == ["2026-11-03", "2027-05-03", "2027-01-04", "2025-03-05"]
