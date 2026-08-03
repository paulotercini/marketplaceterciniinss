"""Testes do crm/datajud.py — puros, sem rede.

O registro de exemplo é uma resposta REAL da API pública do CNJ (processo do
TRF3, capturado em 03/08/2026), reduzido nos movimentos.
"""
import importlib.util
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

_spec = importlib.util.spec_from_file_location("datajud", RAIZ / "crm" / "datajud.py")
dj = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(dj)


# ── cnj(): número + tribunal deduzidos do próprio número ──────────────────
def test_cnj_trf3():
    assert dj.cnj("0000001-14.2015.4.03.9999") == (
        "00000011420154039999", "0000001-14.2015.4.03.9999", "trf3")


def test_cnj_sem_pontuacao_e_no_meio_do_texto():
    assert dj.cnj("apelação 00000010920094036124 distribuída")[2] == "trf3"


def test_cnj_justica_estadual_sao_paulo():
    assert dj.cnj("1000000-01.2023.8.26.0100")[2] == "tjsp"


def test_cnj_justica_estadual_minas():
    assert dj.cnj("5000000-01.2023.8.13.0024")[2] == "tjmg"


def test_cnj_trabalhista_fora_do_escopo():
    assert dj.cnj("0010000-01.2023.5.15.0001") is None


def test_cnj_tribunal_federal_inexistente():
    assert dj.cnj("0000001-14.2015.4.09.9999") is None


def test_cnj_sem_numero():
    assert dj.cnj("processo administrativo") is None
    assert dj.cnj(None) is None


# ── resumir(): registro do CNJ -> resumo enxuto ───────────────────────────
FONTE_REAL = {
    "id": "TRF3_G2_00000011420154039999", "tribunal": "TRF3", "grau": "G2",
    "numeroProcesso": "00000011420154039999", "dataAjuizamento": "20150105000000",
    "orgaoJulgador": {"codigo": 21706, "nome": "GAB. 37 - DES.FED. NELSON PORFIRIO"},
    "classe": {"codigo": 1728, "nome": "Apelação / Remessa Necessária"},
    "sistema": {"codigo": 1, "nome": "PJe"},
    "movimentos": [
        {"codigo": 26, "dataHora": "2015-01-05T13:14:31.000Z", "nome": "Distribuição"},
        {"codigo": 848, "dataHora": "2026-02-02T10:00:00.000Z", "nome": "Trânsito em julgado"},
        {"codigo": 123, "dataHora": "2026-04-07T09:00:00.000Z", "nome": "Remessa"},
        {"codigo": 51, "dataHora": "2026-04-07T11:00:00.000Z", "nome": "Conclusão",
         "complementosTabelados": [{"codigo": 3, "descricao": "tipo_de_conclusao",
                                    "valor": 6, "nome": "para decisão"}]},
    ],
}


def test_resumir_ultimo_movimento_com_complemento_e_traducao():
    r = dj.resumir(FONTE_REAL)
    assert r["ultimo"] == {
        "data": "2026-04-07", "nome": "Conclusão", "codigo": 51,
        "complemento": "para decisão",
        "claro": "Está concluso — aguardando decisão do julgador."}


def test_resumir_metadados_e_data_ajuizamento():
    r = dj.resumir(FONTE_REAL)
    assert r["tribunal"] == "TRF3" and r["grau"] == "G2"
    assert r["classe"] == "Apelação / Remessa Necessária"
    assert r["ajuizado_em"] == "2015-01-05"        # formato compacto do CNJ


def test_resumir_recentes_do_mais_novo_para_o_mais_velho():
    r = dj.resumir(FONTE_REAL)
    assert [m["data"] for m in r["recentes"]] == [
        "2026-04-07", "2026-04-07", "2026-02-02", "2015-01-05"]
    assert r["recentes"][0]["nome"] == "Conclusão"


def test_resumir_movimento_sem_traducao_fica_com_nome_oficial():
    fonte = dict(FONTE_REAL, movimentos=[
        {"codigo": 999999, "dataHora": "2026-05-01T10:00:00.000Z",
         "nome": "Movimento exótico"}])
    r = dj.resumir(fonte)
    assert r["ultimo"]["nome"] == "Movimento exótico"
    assert r["ultimo"]["claro"] is None


def test_resumir_processo_sem_movimentos():
    r = dj.resumir(dict(FONTE_REAL, movimentos=[]))
    assert r["ultimo"] is None and r["recentes"] == []


# ── escolha entre instâncias: vale o movimento mais recente ───────────────
def test_peso_prefere_movimento_mais_recente():
    novo = {"ultimo": {"data": "2026-04-07"}, "grau": "G2"}
    velho = {"ultimo": {"data": "2022-08-18"}, "grau": "G1"}
    assert sorted([velho, novo], key=dj._peso, reverse=True)[0] is novo


def test_peso_aceita_registro_sem_movimento():
    assert dj._peso({"grau": "G1"}) == ("", "G1")


# ── titulo(): CAIXA ALTA do CNJ -> legível na mensagem ao cliente ─────────
def test_titulo_caixa_alta():
    assert (dj.titulo("GAB. 37 - DES.FED. NELSON PORFIRIO")
            == "Gab. 37 - Des.Fed. Nelson Porfirio")


def test_titulo_preserva_preposicoes():
    assert (dj.titulo("01ª VARA FEDERAL DE JALES COM JUIZADO ESPECIAL")
            == "01ª Vara Federal de Jales com Juizado Especial")


def test_titulo_nao_mexe_no_que_ja_esta_formatado():
    assert dj.titulo("1ª Turma Recursal") == "1ª Turma Recursal"


# ── frase_cliente() ───────────────────────────────────────────────────────
def test_frase_cliente_completa():
    t = dict(dj.resumir(FONTE_REAL), processo="0000001-14.2015.4.03.9999",
             consultado_em="2026-08-03")
    assert dj.frase_cliente(t) == (
        "O processo nº 0000001-14.2015.4.03.9999 teve como último andamento "
        "oficial “Conclusão (para decisão)”, em 07/04/2026. Está concluso — "
        "aguardando decisão do julgador. O processo está em Gab. 37 - Des.Fed. "
        "Nelson Porfirio. Fonte: base pública do CNJ (DataJud), consulta de "
        "03/08/2026.")


def test_frase_cliente_vazia_sem_movimento():
    assert dj.frase_cliente({"processo": "x", "ultimo": None}) == ""
