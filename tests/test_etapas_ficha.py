"""F296 · Onda E do fluxo do To Do: as etapas da tarefa são a ficha do cliente (29.10.2026).

O parente com "#CPF" virava o CPF do cliente; NB, CNPJ, telefone com recado e a
data provável da aposentadoria viravam tarefa do caso. Dados 100% fictícios.
"""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from test_sync_crm_vence import crm_json, t, migrar  # noqa: E402

CPF_FILHO, CPF_MAE = "52998224725", "00000000191"
f = migrar.classificar_item_checklist


def test_classificacao_das_etapas():
    assert f(f"Filho da Rosmeire Ficta Costa #{CPF_MAE[:3]}.{CPF_MAE[3:6]}.{CPF_MAE[6:9]}-{CPF_MAE[9:]}") == \
        ("nome", ("filho", "Rosmeire Ficta Costa", CPF_MAE))
    assert f("NB 123.456.789-0") == ("nb", "1234567890")
    assert f("123.456.789-0") == ("nb", "1234567890")
    assert f("gov.br: Abc123") == ("senha", "Abc123")
    assert f("12.345.678/0001-90")[0] == "nota"
    assert f("16 99711-2233 (filha Ana)") == ("telefone_nota", ("16997112233", "16 99711-2233 (filha Ana)"))
    assert f("Possível aposentadoria especial em 22/10/2027") == \
        ("nota", ("aposentadoria", "Possível aposentadoria especial em 22/10/2027"))
    assert f("CPF: 529.982.247-25") == ("cpf", CPF_FILHO)        # o CPF com rótulo continua do cliente
    assert f("Pedir laudo ao médico")[0] == "nome"                 # sem relação: candidato, vira tarefa se não casar


def test_etapas_vao_ao_campo_certo():
    m = migrar.mapear(crm_json([
        t("🌻 INSS", f"Rosmeire Ficta Costa #{CPF_MAE}", cpf=CPF_MAE, id="mae"),
        t("🌻 INSS", f"Rodrigo Ficto #{CPF_FILHO}", cpf=CPF_FILHO, id="filho", checklist=[
            {"texto": "Filho da Rosmeire Ficta Costa #000.000.001-91", "feito": False},
            {"texto": "NB 123.456.789-0", "feito": False},
            {"texto": "16 99711-2233 (recado com a vizinha)", "feito": False},
            {"texto": "Possível aposentadoria especial em 22/10/2027", "feito": False},
            {"texto": "Irmã Joana Ficta", "feito": False},
            {"texto": "Pedir laudo ao médico", "feito": False},
        ]),
    ]))
    filho = migrar.uid("cliente", "cpf", CPF_FILHO)
    mae = migrar.uid("cliente", "cpf", CPF_MAE)
    assert {c["id"]: c["cpf"] for c in m["clientes"]}[filho] == CPF_FILHO      # o CPF do parente não vira o do cliente
    assert [(v["cliente_id"], v["ligado_a"], v["relacao"]) for v in m["vinculos"]] == [(filho, mae, "filho")]
    caso = next(k for k in m["casos"] if k["todo_task_id"] == "filho")
    assert caso["nb"] == "1234567890"
    assert {c["id"]: c["telefone"] for c in m["clientes"]}[filho] == "16997112233"
    assert {n["tipo"] for n in m["notas_ficha"][filho]} == {"telefone", "aposentadoria", "parente"}
    assert [x["titulo"] for x in m["tarefas"]] == ["Pedir laudo ao médico"]     # só a tarefa de verdade
    assert len(m["subtarefas_dado"]) == 5
