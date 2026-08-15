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


# ── histórico das posições e previsão pelo ritmo observado ───────────────
def test_novo_historico_acrescenta_amostra_do_dia():
    h = trf3.novo_historico([{"data": "2026-07-01", "ordem": 120}], "2026-08-03", 60)
    assert h == [{"data": "2026-07-01", "ordem": 120},
                 {"data": "2026-08-03", "ordem": 60}]


def test_novo_historico_nao_duplica_no_mesmo_dia():
    anterior = [{"data": "2026-08-03", "ordem": 70}]
    assert trf3.novo_historico(anterior, "2026-08-03", 60) == [
        {"data": "2026-08-03", "ordem": 60}]


def test_novo_historico_limita_o_tamanho():
    anterior = [{"data": f"2026-01-{d:02d}", "ordem": 500 - d} for d in range(1, 29)]
    h = trf3.novo_historico(anterior, "2026-08-03", 60)
    assert len(h) == trf3.MAX_HISTORICO
    assert h[-1] == {"data": "2026-08-03", "ordem": 60}


def test_novo_historico_ignora_lixo_e_processo_fora_do_painel():
    h = trf3.novo_historico([{"data": None, "ordem": 1}, {"ordem": 2},
                             {"data": "2026-07-01", "ordem": 120}], "2026-08-03", None)
    assert h == [{"data": "2026-07-01", "ordem": 120}]      # sem amostra de hoje


def test_projecao_calcula_ritmo_e_previsao():
    h = [{"data": "2026-06-04", "ordem": 120}, {"data": "2026-08-03", "ordem": 60}]
    p = trf3.projecao(h)
    assert p["base_dias"] == 60
    assert p["ritmo_mes"] == 30                 # 60 posições em 60 dias
    assert p["dias_restantes"] == 60            # faltam 60 posições no mesmo ritmo
    assert p["previsao"] == "2026-10-02"


def test_projecao_exige_base_minima_de_dias():
    h = [{"data": "2026-08-01", "ordem": 70}, {"data": "2026-08-03", "ordem": 60}]
    assert trf3.projecao(h) is None


def test_projecao_nao_estima_com_fila_parada_ou_andando_para_tras():
    parada = [{"data": "2026-06-04", "ordem": 60}, {"data": "2026-08-03", "ordem": 60}]
    tras = [{"data": "2026-06-04", "ordem": 50}, {"data": "2026-08-03", "ordem": 60}]
    assert trf3.projecao(parada) is None and trf3.projecao(tras) is None


def test_projecao_precisa_de_duas_amostras():
    assert trf3.projecao([{"data": "2026-08-03", "ordem": 60}]) is None
    assert trf3.projecao([]) is None and trf3.projecao(None) is None


def test_frase_projecao_deixa_claro_que_e_estimativa():
    h = [{"data": "2026-06-04", "ordem": 120}, {"data": "2026-08-03", "ordem": 60}]
    frase = trf3.frase_projecao({"projecao": trf3.projecao(h)})
    assert "ESTIMADA" in frase and "outubro de 2026" in frase
    assert "não de data designada pelo tribunal" in frase


def test_frase_projecao_vazia_sem_projecao():
    assert trf3.frase_projecao({}) == ""


# ── previsão pela produção do órgão (painel Justiça em Números do CNJ) ────
PROD_GAB37 = {"julgados_mes": 201.5, "julgados_ano": 2418, "dias_medios": 198,
              "orgao": "GABINETE 37 - DESEMBARGADOR FEDERAL NELSON PORFIRIO"}


def test_projecao_usa_a_producao_ja_na_primeira_consulta():
    h = [{"data": "2026-08-03", "ordem": 60}]          # uma única amostra
    p = trf3.projecao(h, PROD_GAB37)
    assert p["metodo"] == "producao"
    assert p["ritmo_mes"] == 202                        # ~201,5 julgados/mês
    assert p["dias_restantes"] == 9                     # 60 / 201,5 * 30
    assert p["previsao"] == "2026-08-12"
    assert p["dias_medios"] == 198


def test_projecao_prefere_o_ritmo_observado_quando_ha_historico():
    h = [{"data": "2026-06-04", "ordem": 120}, {"data": "2026-08-03", "ordem": 60}]
    p = trf3.projecao(h, PROD_GAB37)
    assert p["metodo"] == "ritmo" and p["ritmo_mes"] == 30


def test_projecao_cai_para_a_producao_com_fila_parada():
    parada = [{"data": "2026-06-04", "ordem": 60}, {"data": "2026-08-03", "ordem": 60}]
    assert trf3.projecao(parada, PROD_GAB37)["metodo"] == "producao"
    assert trf3.projecao(parada) is None               # sem produção, não estima


def test_projecao_sem_ordem_nao_estima():
    assert trf3.projecao([{"data": "2026-08-03", "ordem": None}], PROD_GAB37) is None
    assert trf3.projecao([], PROD_GAB37) is None


def test_projecao_ignora_producao_zerada():
    assert trf3.projecao([{"data": "2026-08-03", "ordem": 60}],
                         {"julgados_mes": 0}) is None


def test_frase_projecao_pela_producao_cita_a_fonte_e_o_tempo_medio():
    p = trf3.projecao([{"data": "2026-08-03", "ordem": 60}], PROD_GAB37)
    frase = trf3.frase_projecao({"projecao": p})
    assert "painel Justiça em Números do CNJ" in frase
    assert "2.418 processos no último ano fechado" in frase
    assert "tempo médio entre a distribuição e o julgamento nesse órgão é de 198 dias" in frase
    assert "ESTIMADA" in frase and "não de data designada pelo tribunal" in frase
