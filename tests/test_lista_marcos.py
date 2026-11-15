"""F614 · a lista Marcos do To Do vira casos do CRM (15.11.2026). Dados 100% fictícios."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from test_sync_crm_vence import crm_json, t, migrar  # noqa: E402

CPF_A = "00000000191"


def test_nome_da_lista_com_ou_sem_emoji():
    assert migrar.lista_marcos("☕ Marcos") and migrar.lista_marcos("Marcos") and migrar.lista_marcos(" 📁 marcos ")
    assert not migrar.lista_marcos("Marcos Antigo") and not migrar.lista_marcos("🌻 INSS")


def test_tarefa_com_cpf_vira_caso_da_lista():
    m = migrar.mapear(crm_json([t("☕ Marcos", f"Cliente Teste #{CPF_A}", cpf=CPF_A, id="m1")]))
    (k,) = m["casos"]
    assert k["fase"] == "outro" and k["origem_lista"] == "☕ Marcos"
    assert k["cliente_id"] == migrar.uid("cliente", "cpf", CPF_A)
    assert not m["pulados"] and not m["notas_ficha"]


def test_tarefa_so_com_nome_entra_com_falta_de_cpf():
    m = migrar.mapear(crm_json([t("Marcos", "Cliente Teste", id="m2")]))
    (k,) = m["casos"]
    (c,) = m["clientes"]
    assert k["fase"] == "outro" and k["cliente_id"] == c["id"] and not c["cpf"]
    assert [n["tipo"] for n in m["notas_ficha"][c["id"]]] == ["falta_cpf"]


def test_nome_que_casa_com_ficha_com_cpf_nao_marca():
    banco = {migrar.nome_chave("Cliente Teste Ficto"): {CPF_A}}
    m = migrar.mapear(crm_json([t("☕ Marcos", "Cliente Teste Ficto", id="m3")]), banco)
    assert m["clientes"][0]["cpf"] == CPF_A and not m["notas_ficha"]


def test_tarefa_sem_cpf_que_nao_parece_pessoa_fica_fora():
    tarefas = [t("Marcos", x, id=f"x{i}") for i, x in enumerate(["Imprimir contrato", "Pai", "Ligar 3 vezes", "Ligar banco"])]
    m = migrar.mapear(crm_json(tarefas + [t("Marcos", "Cliente Teste", id="ok")]))
    assert [c["nome"] for c in m["clientes"]] == ["Cliente Teste"] and len(m["casos"]) == 1
    assert m["pulados"] == {"Marcos (não é pessoa)": 4}


def test_tarefa_com_cpf_entra_mesmo_com_titulo_de_tarefa():
    m = migrar.mapear(crm_json([t("Marcos", f"Imprimir contrato #{CPF_A}", cpf=CPF_A, id="m5")]))
    assert len(m["casos"]) == 1 and not m["pulados"]
