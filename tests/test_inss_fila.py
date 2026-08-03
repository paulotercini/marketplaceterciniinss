"""Testes do crm/inss_fila.py — puros, sem rede.

As amostras seguem o formato REAL do arquivo do INSS (CSV agregado, data em
DDMMAAAA, uma linha por unidade/serviço/data com a quantidade pendente).
"""
import datetime
import importlib.util
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

_spec = importlib.util.spec_from_file_location("inss_fila", RAIZ / "crm" / "inss_fila.py")
fila = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fila)

CSV = (
    '"Código da unidade","Nome da unidade","Código do serviço","Nome do serviço",'
    '"UF da unidade da criação da tarefa","Data da criação","Quantidade de tarefas"\r\n'
    '"01001","APS FRANCA",1234,"Aposentadoria por Idade Urbana","SP",01062026,10\r\n'
    '"01001","APS FRANCA",1234,"Aposentadoria por Idade Urbana","SP",30062026,30\r\n'
    '"02001","APS MACEIÓ",1234,"Aposentadoria por Idade Urbana","AL",01052026,10\r\n'
    '"01001","APS FRANCA",1655,"Benefício por Incapacidade","SP",20062026,50\r\n'
).encode("latin-1")


def test_ler_dados_csv():
    linhas = list(fila.ler_dados(CSV))
    assert linhas[1] == ("Aposentadoria por Idade Urbana", "SP",
                         datetime.date(2026, 6, 1), "10")
    assert len(linhas) == 5          # cabeçalho + 4 registros


def test_data_ddmmaaaa_com_zero_comido():
    assert fila._data_ddmmaaaa("01062026") == datetime.date(2026, 6, 1)
    assert fila._data_ddmmaaaa("1062026") == datetime.date(2026, 6, 1)
    assert fila._data_ddmmaaaa("") is None
    assert fila._data_ddmmaaaa("32132026") is None


def test_agregar_conta_pendentes_e_usa_o_retrato_do_arquivo():
    d = fila.agregar(fila.ler_dados(CSV))
    sp = d[("Aposentadoria por Idade Urbana", "SP")]
    assert sp["pendentes"] == 40
    assert sp["referencia"] == "2026-06-30"        # pedido mais recente do arquivo


def test_agregar_mediana_ponderada_pela_quantidade():
    d = fila.agregar(fila.ler_dados(CSV))
    sp = d[("Aposentadoria por Idade Urbana", "SP")]
    # 10 pedidos com 29 dias e 30 com 0 dias -> a metade cai nos de 0 dia
    assert sp["dias_mediana"] == 0
    assert sp["dias_p90"] == 29


def test_agregar_soma_o_brasil_alem_das_ufs():
    d = fila.agregar(fila.ler_dados(CSV))
    assert d[("Aposentadoria por Idade Urbana", "BR")]["pendentes"] == 50
    assert d[("Aposentadoria por Idade Urbana", "AL")]["pendentes"] == 10


def test_agregar_ignora_cabecalho_e_quantidade_invalida():
    ruim = CSV + '"x","y",1,"Serviço Z","SP",01062026,""\r\n'.encode("latin-1")
    d = fila.agregar(fila.ler_dados(ruim))
    assert ("Nome do serviço", "SP") not in d
    assert ("Serviço Z", "SP") not in d


SERVICOS = ["Aposentadoria por Idade Rural", "Aposentadoria por Idade Urbana",
            "Aposentadoria da Pessoa com Deficiência por Idade",
            "Acordo Internacional - Aposentadoria por Idade",
            "Aposentadoria por Tempo de Contribuição",
            "Benefício por Incapacidade", "Benefício Assistencial ao Idoso",
            "Benefício Assistencial à Pessoa com Deficiência",
            "Pensão por Morte Rural", "Pensão por Morte Urbana"]


def test_casar_soma_rural_e_urbana_quando_nao_especificamos():
    assert fila.casar_servicos("Aposentadoria por Idade", SERVICOS) == [
        "Aposentadoria por Idade Rural", "Aposentadoria por Idade Urbana"]


def test_casar_nao_cai_em_acordo_internacional_nem_em_pcd():
    achados = fila.casar_servicos("Aposentadoria por Idade", SERVICOS)
    assert not any("Acordo" in s or "Deficiência" in s for s in achados)


def test_casar_auxilio_doenca_vira_beneficio_por_incapacidade():
    # o nome mudou no balcão do INSS; sem o apelido cairia no serviço errado
    for nome in ["Auxílio-Doença", "Auxílio por Incapacidade",
                 "Aposentadoria por Invalidez"]:
        assert fila.casar_servicos(nome, SERVICOS) == ["Benefício por Incapacidade"]


def test_casar_bpc_generico_traz_os_dois_balcoes():
    assert fila.casar_servicos("BPC/LOAS", SERVICOS) == [
        "Benefício Assistencial ao Idoso",
        "Benefício Assistencial à Pessoa com Deficiência"]


def test_casar_bpc_especifico_respeita_o_balcao():
    assert fila.casar_servicos("BPC/LOAS Idoso", SERVICOS) == [
        "Benefício Assistencial ao Idoso"]
    assert fila.casar_servicos("BPC Deficiente", SERVICOS) == [
        "Benefício Assistencial à Pessoa com Deficiência"]


def test_casar_sem_correspondencia_devolve_vazio():
    assert fila.casar_servicos("Revisão da Vida Toda", SERVICOS) == []
    assert fila.casar_servicos("", SERVICOS) == []
    assert fila.casar_servicos(None, SERVICOS) == []


def test_somar_junta_as_filas_e_pondera_a_espera():
    dados = {("A", "SP"): {"pendentes": 100, "dias_mediana": 10, "dias_p90": 50,
                           "referencia": "2026-06-30"},
             ("B", "SP"): {"pendentes": 100, "dias_mediana": 30, "dias_p90": 90,
                           "referencia": "2026-06-30"}}
    s = fila.somar(dados, ["A", "B"], "SP")
    assert s["pendentes"] == 200 and s["dias_mediana"] == 20 and s["dias_p90"] == 70
    assert s["servicos"] == ["A", "B"] and s["uf"] == "SP"


def test_somar_sem_dados_para_a_uf():
    assert fila.somar({}, ["A"], "SP") is None


def test_frase_cliente_nao_promete_data():
    f = {"pendentes": 101092, "dias_mediana": 15, "dias_p90": 116,
         "referencia": "2026-06-30", "servicos": ["Benefício por Incapacidade"],
         "uf": "SP"}
    frase = fila.frase_cliente(f)
    assert "101.092 pedidos" in frase and "mais de 15 dias" in frase
    assert "retrato de 30/06/2026" in frase
    assert "não uma data do seu pedido" in frase


def test_frase_cliente_vazia_sem_fila():
    assert fila.frase_cliente(None) == ""
    assert fila.frase_cliente({"pendentes": 0}) == ""


def test_recurso_mais_novo_pega_o_ultimo_publicado():
    pacote = {"resources": [
        {"format": "CSV", "url": "a", "created": "2026-05-20"},
        {"format": "CSV", "url": "b", "created": "2026-07-14"},
        {"format": "PDF", "url": "c", "created": "2026-08-01"}]}
    assert fila.recurso_mais_novo(pacote)["url"] == "b"
