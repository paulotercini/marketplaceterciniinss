"""Regressão da Fase 2 — migrar.py (mapeamento To Do -> banco) e
escrever_todo.py (formato da escrita de volta). Dados 100% fictícios."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm" / "fase2"))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm"))
import migrar, escrever_todo


def crm_json(tarefas):
    return {"gerado_em": "2026-08-01T12:00:00", "tarefas": tarefas}


def t(lista, titulo, **kw):
    base = {"id": kw.pop("id", titulo), "lista": lista, "titulo": titulo,
            "nome": kw.pop("nome", titulo.split("#")[0].strip()),
            "cpf": kw.pop("cpf", None), "dn": None, "telefone": None,
            "processo": None, "nb": None, "beneficio": None, "prazo": None,
            "importante": False, "concluida": False, "concluida_em": None,
            "andamentos": [], "eventos": []}
    base.update(kw)
    return base


# ── mapeamento de listas ──────────────────────────────────────────────────

def test_pagamentos_vira_fase_do_caso_dentro_do_cliente():
    m = migrar.mapear(crm_json([
        t("👪 Judicial", "Fulana #00000000191", cpf="00000000191", id="a"),
        t("💵 Pagamentos", "Fulana #00000000191", cpf="00000000191", id="b"),
    ]))
    assert len(m["clientes"]) == 1            # mesmo cliente
    fases = sorted(k["fase"] for k in m["casos"])
    assert fases == ["judicial", "pagamento"]  # pagamento é caso, não lista


def test_tarefa_concluida_vira_encerrado_preservando_origem():
    m = migrar.mapear(crm_json([
        t("🌻 INSS", "Beltrano #00000000272", cpf="00000000272",
          concluida=True, concluida_em="2026-05-01"),
    ]))
    (caso,) = m["casos"]
    assert caso["fase"] == "encerrado"
    assert caso["origem_lista"] == "🌻 INSS"


def test_lista_pessoal_vira_tarefa_particular():
    m = migrar.mapear(crm_json([t("Tarefas", "Renovar OAB", prazo="2026-09-01")]))
    assert m["casos"] == []
    (tf,) = m["tarefas"]
    assert tf["particular_de"] == ("__INICIAL__", "P")


def test_lista_fora_do_crm_sem_cpf_e_pulada():
    m = migrar.mapear(crm_json([t("🔎 Leilões", "Sítio em Franca")]))
    assert m["casos"] == [] and m["clientes"] == []
    assert m["pulados"] == {"🔎 Leilões": 1}


def test_idempotencia_ids_deterministicos():
    dados = crm_json([t("👪 Judicial", "Fulana #00000000191", cpf="00000000191",
                        andamentos=[{"data": "2026-07-01", "inicial": "P",
                                     "autor": "Paulo", "texto": "Protocolado."}])])
    a, b = migrar.mapear(dados), migrar.mapear(dados)
    assert a["casos"][0]["id"] == b["casos"][0]["id"]
    assert a["andamentos"][0]["id"] == b["andamentos"][0]["id"]


def test_anti_eco_remove_bloco_que_veio_do_app():
    dados = crm_json([t("👪 Judicial", "Fulana #00000000191", cpf="00000000191", id="x",
                        andamentos=[{"data": "2026-08-01", "inicial": "P",
                                     "autor": "Paulo", "texto": "Audiência confirmada."}])])
    m = migrar.mapear(dados)
    caso_id = m["casos"][0]["id"]
    ecoados = {(caso_id, "2026-08-01", migrar.md5("Audiência confirmada."))}
    assert migrar.anti_eco(m["andamentos"], ecoados) == []
    assert len(migrar.anti_eco(m["andamentos"], set())) == 1


def test_sql_escapa_aspas():
    sql = migrar._sql_val("d'Ávila")
    assert sql == "'d''Ávila'"


# ── escrita de volta no To Do ─────────────────────────────────────────────

def test_formato_do_bloco_igual_ao_manual():
    assert escrever_todo.formatar_bloco("2026-08-02T10:30:00-03:00", "A",
                                        "Cliente confirmou presença.") \
        == "02.08.2026 (A): Cliente confirmou presença."


def test_bloco_sem_autor():
    assert escrever_todo.formatar_bloco("2026-08-02", None, "Nota.") == "02.08.2026: Nota."


def test_prepend_preserva_corpo_existente():
    corpo = "01.08.2026 (P): Bloco antigo."
    novo = escrever_todo.prepend_corpo(corpo, "02.08.2026 (A): Bloco novo.")
    assert novo == "02.08.2026 (A): Bloco novo.\n\n01.08.2026 (P): Bloco antigo."
    assert escrever_todo.prepend_corpo("", "02.08.2026 (A): X.") == "02.08.2026 (A): X."
