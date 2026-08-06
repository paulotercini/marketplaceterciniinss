"""Detecção de aposentadoria nos andamentos — casos que dão errado em silêncio."""
import sys
import pathlib
from datetime import date

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm" / "fase2"))
from detectar_aposentado import analisar, idade_em, ja_passou_da_idade


# ── o que É prova de que já se aposentou ──────────────────────────────────
def test_frases_de_concessao():
    for texto in [
        "Benefício concedido. Verificar HISCRE",
        "Saiu a carta de concessão hoje",
        "Aposentadoria concedida com DIB em 12/03/2024",
        "Cliente já está aposentado desde o ano passado",
        "Foi deferido o pedido, benefício implantado",
        "Ela se aposentou em janeiro",
        "Já recebe o benefício, valor de um salário",
    ]:
        assert analisar(texto), f"deveria detectar: {texto}"


# ── o que NÃO é ───────────────────────────────────────────────────────────
def test_indeferido_nao_conta():
    assert analisar("Benefício indeferido pelo INSS") is None
    assert analisar("Pedido negado, vamos recorrer") is None


def test_pedido_ainda_nao_e_concessao():
    assert analisar("Solicitei o benefício hoje") is None
    assert analisar("Vamos pedir a concessão na semana que vem") is None
    assert analisar("Se for concedido, avisar a cliente") is None
    assert analisar("Aguardando concessão do benefício") is None


def test_beneficio_cessado_ou_suspenso_nao_conta():
    assert analisar("Benefício concedido foi cessado em 2023") is None
    assert analisar("Benefício suspenso pelo INSS") is None


def test_loas_nao_encerra_a_aposentadoria_por_idade():
    # quem recebe BPC pode se aposentar depois — não é a mesma coisa
    assert analisar("BPC/LOAS concedido em 2022") is None
    assert analisar("Benefício assistencial deferido") is None


def test_negacao_de_uma_frase_nao_apaga_a_outra():
    # o histórico costuma trazer as duas coisas no mesmo bloco
    prova = analisar("Pedido indeferido em 2023. Recorremos e a aposentadoria "
                     "foi concedida em 2024.")
    assert prova and "concedida" in prova.lower()
    assert "indeferido" not in prova.lower()


def test_prova_e_o_trecho_curto_nao_o_texto_inteiro():
    prova = analisar("x" * 400 + ". Benefício concedido.")
    assert prova == "Benefício concedido"
    assert len(prova) <= 300


# ── quem entra na análise ─────────────────────────────────────────────────
def test_idade_no_formato_do_todo():
    assert idade_em("15031968", date(2026, 8, 6)) == 58
    assert idade_em("15031968", date(2026, 3, 14)) == 57   # véspera do aniversário
    assert idade_em("15031968", date(2026, 3, 15)) == 58   # no dia
    assert idade_em("", date(2026, 8, 6)) is None
    assert idade_em("bagunça", date(2026, 8, 6)) is None


def test_so_analisa_quem_ja_passou_da_idade():
    ref = date(2026, 8, 6)
    mulher_62 = {"sexo": "F", "dn": "01011964"}      # 62 anos
    mulher_61 = {"sexo": "F", "dn": "01011965"}      # 61
    homem_65 = {"sexo": "M", "dn": "01011961"}       # 65
    homem_64 = {"sexo": "M", "dn": "01011962"}       # 64
    assert ja_passou_da_idade(mulher_62, ref)
    assert not ja_passou_da_idade(mulher_61, ref)
    assert ja_passou_da_idade(homem_65, ref)
    assert not ja_passou_da_idade(homem_64, ref)


def test_sem_sexo_ou_sem_nascimento_fica_de_fora():
    ref = date(2026, 8, 6)
    assert not ja_passou_da_idade({"sexo": None, "dn": "01011950"}, ref)
    assert not ja_passou_da_idade({"sexo": "F", "dn": None}, ref)
