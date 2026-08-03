"""Testes do crm/trf3_ordem.py — puros, sem rede.

O DSR de exemplo é uma resposta REAL do painel público do TRF3 (capturada em
03/08/2026), com o bitmask R de repetição e os dicionários de valores.
"""
import importlib.util
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

_spec = importlib.util.spec_from_file_location("trf3_ordem", RAIZ / "crm" / "trf3_ordem.py")
trf3 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(trf3)


# ── canonico: acha e normaliza números CNJ do TRF3 ────────────────────────
def test_canonico_pontuado():
    assert trf3.canonico("0000001-14.2015.4.03.9999") == "0000001-14.2015.4.03.9999"


def test_canonico_sem_pontuacao():
    assert trf3.canonico("00000011420154039999") == "0000001-14.2015.4.03.9999"


def test_canonico_no_meio_do_texto():
    assert (trf3.canonico("Apelação nº 0000001-09.2009.4.03.6124 distribuída")
            == "0000001-09.2009.4.03.6124")


def test_canonico_outro_tribunal_nao_casa():
    assert trf3.canonico("5001234-56.2023.8.26.0100") is None      # TJSP


def test_canonico_nao_desloca_em_sequencia_maior():
    # 22 dígitos: um nº "válido" só existiria desalinhado — não pode casar
    assert trf3.canonico("0000001141520154039999") is None


def test_canonico_vazio():
    assert trf3.canonico(None) is None
    assert trf3.canonico("sem processo") is None


# ── decode_dsr: bitmask R + dicionários (amostra real do painel) ──────────
DSR_REAL = {"dsr": {"DS": [{
    "N": "DS0",
    "PH": [{"DM0": [
        {"S": [{"N": "G0", "T": 1, "DN": "D0"}, {"N": "G1", "T": 4},
               {"N": "G2", "T": 1, "DN": "D1"}, {"N": "G3", "T": 1, "DN": "D2"},
               {"N": "G4", "T": 4}, {"N": "G5", "T": 1, "DN": "D3"},
               {"N": "G6", "T": 7}],
         "C": [0, 1021, 0, 0, 2, 0, 1747612800000]},
        {"C": [1, 60, 1, 1, 1, 1775520000000], "R": 16},
        {"C": [2, 535, 2, 2, 1783641600000], "R": 48},
    ]}],
    "ValueDicts": {
        "D0": ["0000001-09.2009.4.03.6124", "0000001-14.2015.4.03.9999",
               "0000001-26.2010.4.03.6107"],
        "D1": ["Gab. 13 Des. Fed. Mônica Nobre", "Gab. 37 Des. Fed. Nelson Porfirio",
               "Gab. 48 Des. Fed. Souza Ribeiro"],
        "D2": ["04ª Turma", "10ª Turma", "06ª Turma"],
        "D3": ["N", "S"],
    },
}]}}


def test_decode_dsr_repeticao_e_dicionarios():
    linhas = trf3.decode_dsr(DSR_REAL)
    assert len(linhas) == 3
    # linha 1: completa
    assert linhas[0] == ["0000001-09.2009.4.03.6124", 1021,
                         "Gab. 13 Des. Fed. Mônica Nobre", "04ª Turma", 2, "N",
                         1747612800000]
    # linha 2: R=16 (bit 4) repete o grau da linha anterior
    assert linhas[1] == ["0000001-14.2015.4.03.9999", 60,
                         "Gab. 37 Des. Fed. Nelson Porfirio", "10ª Turma", 2, "S",
                         1775520000000]
    # linha 3: R=48 (bits 4 e 5) repete grau e prioridade
    assert linhas[2] == ["0000001-26.2010.4.03.6107", 535,
                         "Gab. 48 Des. Fed. Souza Ribeiro", "06ª Turma", 2, "S",
                         1783641600000]


def test_data_ms():
    assert trf3._data_ms(1775520000000) == "2026-04-07"
    assert trf3._data_ms(None) is None


# ── frase_cliente: o texto que o Paulo manda ao cliente ───────────────────
def test_frase_cliente_completa():
    frase = trf3.frase_cliente({
        "processo": "0000001-14.2015.4.03.9999", "ordem": 60, "total": 944,
        "orgao": "Gab. 37 Des. Fed. Nelson Porfirio", "turma": "10ª Turma",
        "prioridade": "S", "fase_desde": "2026-04-07", "consultado_em": "2026-08-03"})
    assert frase == (
        "O processo nº 0000001-14.2015.4.03.9999 aguarda julgamento no TRF3 e "
        "hoje ocupa a posição 60 de uma fila de 944 processos na ordem de "
        "julgamento do órgão responsável — Gab. 37 Des. Fed. Nelson Porfirio "
        "(10ª Turma). Está concluso para julgamento desde 07/04/2026. "
        "O processo tramita com prioridade. Fonte: painel público de "
        "estatísticas do TRF3 (consulta de 03/08/2026).")


def test_frase_cliente_sem_extras():
    frase = trf3.frase_cliente({
        "processo": "0000001-09.2009.4.03.6124", "ordem": 1021, "total": None,
        "orgao": "Gab. 13 Des. Fed. Mônica Nobre", "turma": None,
        "prioridade": "N", "fase_desde": None, "consultado_em": "2026-08-03"})
    assert "de uma fila" not in frase
    assert "prioridade" not in frase
    assert "concluso" not in frase
    assert "posição 1021" in frase
