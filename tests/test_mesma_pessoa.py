"""F256 · a mesma pessoa em duas fichas (22.10.2026).

A tarefa sem "#CPF" virava cliente pelo nome, e o nome escrito de outro jeito
("Donizete" no 💵, "Donisete #CPF" no 👪) fazia duas fichas. A tarefa sem CPF
agora vai à ficha com CPF de nome igual ou quase igual, se for uma só.
Dados 100% fictícios.
"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from test_sync_crm_vence import crm_json, t, migrar  # noqa: E402

CPF_A, CPF_B = "00000000191", "00000000272"


def test_grafia_diferente_vai_a_ficha_com_cpf_da_mesma_rodada():
    m = migrar.mapear(crm_json([
        t("👪 Judicial", f"Adair Donisete Marano #{CPF_A}", cpf=CPF_A, id="j"),
        t("💵 Pagamentos", "Adair Donizete Marano", id="p"),
    ]))
    assert len(m["clientes"]) == 1
    assert m["clientes"][0]["nome"] == "Adair Donisete Marano"
    assert {k["cliente_id"] for k in m["casos"]} == {migrar.uid("cliente", "cpf", CPF_A)}


def test_ficha_com_cpf_do_banco_tambem_vale():
    banco = {migrar.nome_chave("José Roberto Gonçalves Ficto"): {CPF_A}}
    m = migrar.mapear(crm_json([t("💵 Pagamentos", "Jose Roberto Goncalves Ficto", id="p")]), banco)
    assert m["clientes"][0]["id"] == migrar.uid("cliente", "cpf", CPF_A)
    assert m["clientes"][0]["cpf"] == CPF_A


def test_duvida_ou_nome_so_nao_junta():
    banco = {migrar.nome_chave("Maria Silva Ficta"): {CPF_A}, migrar.nome_chave("Maria Silvo Ficta"): {CPF_B}}
    assert migrar.cpf_pelo_nome("Maria Silvi Ficta", banco) is None      # duas candidatas
    assert migrar.cpf_pelo_nome("Maria", banco) is None                  # só o primeiro nome
    assert migrar.cpf_pelo_nome("Joana Silva Ficta", banco) is None      # outro primeiro nome
    assert migrar.cpf_pelo_nome("Maria Souza Pereira", banco) is None    # nome diferente


def test_ficha_de_nome_vazio_no_banco_nao_derruba():
    # a ficha cujo nome some na chave ("de", símbolo) derrubava o migrar.py (29.10.2026)
    assert migrar.cpf_pelo_nome("Ana Ficta Souza", {"": {"52998224725"}, "ana ficta sousa": {"00000000191"}}) == "00000000191"
