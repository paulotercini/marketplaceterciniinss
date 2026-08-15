"""Testes do crm/cnj_producao.py — puros, sem rede.

Os nomes de órgão e os números são os REAIS do painel Justiça em Números
(consulta de 03/08/2026, TRF3, 2º grau).
"""
import importlib.util
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

_spec = importlib.util.spec_from_file_location("cnj_producao",
                                               RAIZ / "crm" / "cnj_producao.py")
cp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cp)

PRODUCOES = [
    {"orgao": "GABINETE 13 - DESEMBARGADORA FEDERAL MÔNICA NOBRE - TRF 3ª REGIÃO",
     "julgados_ano_anterior": 4663, "julgados_ano_atual": 2890,
     "conclusos_julgamento": 1548, "dias_medios_julgamento": 510},
    {"orgao": "GABINETE 37 - DESEMBARGADOR FEDERAL NELSON PORFIRIO  - TRF 3ª REGIÃO",
     "julgados_ano_anterior": 2418, "julgados_ano_atual": 1255,
     "conclusos_julgamento": 520, "dias_medios_julgamento": 198},
    {"orgao": "GAB. A DA TURMA REGIONAL DE MATO GROSSO DO SUL",
     "julgados_ano_anterior": 419, "julgados_ano_atual": 1211,
     "conclusos_julgamento": 1033, "dias_medios_julgamento": 838},
    {"orgao": "2ª TURMA", "julgados_ano_anterior": 0, "julgados_ano_atual": 0,
     "conclusos_julgamento": 0, "dias_medios_julgamento": None},
]


# ── casamento entre o nome do painel do TRF3 e o do painel do CNJ ─────────
def test_casa_gabinete_pelo_numero():
    p = cp.casar_orgao("Gab. 37 Des. Fed. Nelson Porfirio", PRODUCOES)
    assert p["julgados_ano_anterior"] == 2418


def test_casa_gabinete_com_letra():
    p = cp.casar_orgao("Gab. A da Turma Regional de Mato Grosso do Sul", PRODUCOES)
    assert p["orgao"].startswith("GAB. A DA TURMA")


def test_casa_numero_com_zero_a_esquerda():
    producoes = [{"orgao": "GABINETE 01 - DESEMBARGADOR FEDERAL DAVID DANTAS",
                  "julgados_ano_anterior": 3104}]
    assert cp.casar_orgao("Gab. 1 Des. Fed. David Dantas", producoes) is not None


def test_nao_casa_orgao_desconhecido():
    assert cp.casar_orgao("Vara do Trabalho de Franca", PRODUCOES) is None
    assert cp.casar_orgao(None, PRODUCOES) is None


def test_gabinete_extrai_o_numero():
    assert cp._gabinete("Gab. 37 Des. Fed. Nelson Porfirio") == "37"
    assert cp._gabinete("GABINETE 01 - DESEMBARGADOR") == "1"
    assert cp._gabinete("2ª TURMA") is None


# ── ritmo mensal ─────────────────────────────────────────────────────────
def test_julgados_por_mes_usa_o_ano_fechado():
    assert cp.julgados_por_mes(PRODUCOES[1]) == 201.5       # 2418 / 12


def test_julgados_por_mes_cai_para_o_ano_corrente_sem_ano_anterior():
    p = {"julgados_ano_anterior": None, "julgados_ano_atual": 1200,
         "meses_decorridos": 6}
    assert cp.julgados_por_mes(p) == 200.0


def test_julgados_por_mes_sem_producao():
    assert cp.julgados_por_mes(PRODUCOES[3]) is None        # órgão zerado
    assert cp.julgados_por_mes(None) is None


# ── decode_dsr: mesmo formato comprimido do outro painel ─────────────────
def test_decode_dsr_com_repeticao():
    data = {"dsr": {"DS": [{"PH": [{"DM0": [
        {"S": [{"N": "G0", "T": 1}, {"N": "M0", "T": 3}, {"N": "M1", "T": 3}],
         "C": ["GABINETE 01", 3104, 1685]},
        {"C": ["GABINETE 02", 2418], "R": 4},
    ]}]}]}}
    linhas = cp.decode_dsr(data)
    assert linhas[0] == ["GABINETE 01", 3104, 1685]
    assert linhas[1] == ["GABINETE 02", 2418, 1685]      # R=4 repete a 3ª coluna
