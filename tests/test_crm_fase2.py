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


def test_checklist_vira_subtarefas_sem_dados_pessoais():
    m = migrar.mapear(crm_json([
        t("👪 Judicial", "Fulana #00000000191", cpf="00000000191",
          checklist=[{"texto": "Pedir PPP na empresa", "feito": False},
                     {"texto": "Juntar laudo médico", "feito": True},
                     {"texto": "Aniversário 12.03.1961", "feito": False},   # dado, não tarefa
                     {"texto": "000.000.001-91", "feito": False}]),        # CPF, não tarefa
    ]))
    titulos = sorted(tf["titulo"] for tf in m["tarefas"])
    assert titulos == ["Juntar laudo médico", "Pedir PPP na empresa"]
    assert all(tf["caso_id"] for tf in m["tarefas"])
    assert any(tf["concluida"] for tf in m["tarefas"])


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


def test_protocolo_dos_andamentos_vai_para_o_caso():
    m = migrar.mapear(crm_json([
        t("🌻 INSS", "Fulana #00000000191", cpf="00000000191",
          andamentos=[{"data": "2026-07-01", "inicial": "P", "autor": "Paulo",
                       "texto": "Requerimento protocolado. Protocolo nº 210123456789."},
                      {"data": "2026-07-10", "inicial": "A", "autor": "Amanda",
                       "texto": "Sem protocolo aqui."}]),
    ]))
    (caso,) = m["casos"]
    assert caso["protocolos"] == ["210123456789"]


def test_parceria_passa_do_json_para_o_caso():
    m = migrar.mapear(crm_json([
        t("👪 Judicial", "Fulana #00000000191", cpf="00000000191", parceria="Laís"),
    ]))
    assert m["casos"][0]["parceria"] == "Laís"


def test_sql_val_lista_vira_jsonb():
    assert migrar._sql_val(["210", "211"]) == "'[\"210\", \"211\"]'::jsonb"


# ── garimpo do checklist (dados soltos -> campos estruturados) ────────────

def test_classificar_checklist_padrao_e_senhas():
    f = migrar.classificar_item_checklist
    assert f("Padrão") == ("senha_padrao", None)
    assert f("padrão.") == ("senha_padrao", None)
    assert f("Senha meu inss: Abc123*") == ("senha", "Abc123*")
    assert f("V4c3x2z1*") == ("senha", "V4c3x2z1*")          # token solto letra+número
    assert f("Pedir PPP na empresa")[0] != "senha"


def test_classificar_checklist_telefone_cpf_protocolo():
    f = migrar.classificar_item_checklist
    assert f("16-99711 2233") == ("telefone", "16997112233")
    assert f("(16) 3722-1234") == ("telefone", "1637221234")
    assert f("000.000.001-91") == ("cpf", "00000000191")
    # número do próprio CPF repetido no checklist não vira protocolo
    assert f("00000000191", cpf_cliente="00000000191") == ("dado", None)
    assert f("210123456789") == ("protocolo", "210123456789")
    assert f("#Laís") == ("parceria", "Laís")
    assert f("#B31") == ("dado", None)                        # espécie, não parceria


def test_classificar_checklist_nome_de_parente():
    tipo, (rel, nome) = migrar.classificar_item_checklist("Esposa Fulana de Tal")
    assert tipo == "nome" and rel == "esposa" and nome == "Fulana de Tal"


def test_mapear_garimpa_checklist_para_campos(monkeypatch):
    monkeypatch.setattr(migrar, "SENHA_PADRAO", "S3nh4Pdr*")
    m = migrar.mapear(crm_json([
        t("🌻 INSS", "Fulana de Tal #00000000191", cpf="00000000191", id="a",
          checklist=[{"texto": "Padrão", "feito": False},
                     {"texto": "16-99711 2233", "feito": False},
                     {"texto": "210123456789", "feito": False},
                     {"texto": "#Laís", "feito": False},
                     {"texto": "Marido Beltrano da Silva", "feito": False},
                     {"texto": "Pedir PPP na empresa", "feito": False}]),
        t("👪 Judicial", "Beltrano da Silva #00000000272", cpf="00000000272", id="b"),
    ]))
    (cred,) = m["credenciais"]
    assert cred["tipo"] == "meu_inss" and cred["valor"] == "S3nh4Pdr*"
    fulana = next(c for c in m["clientes"] if c["nome"].startswith("Fulana"))
    assert fulana["telefone"] == "16997112233"
    caso = next(k for k in m["casos"] if k["cliente_id"] == fulana["id"])
    assert "210123456789" in caso["protocolos"] and caso["parceria"] == "Laís"
    (vinc,) = m["vinculos"]
    assert vinc["relacao"] == "marido"
    assert {vinc["cliente_id"], vinc["ligado_a"]} == \
        {c["id"] for c in m["clientes"]}
    assert [tf["titulo"] for tf in m["tarefas"]] == ["Pedir PPP na empresa"]


def test_mapear_sem_secret_ignora_padrao(monkeypatch):
    monkeypatch.setattr(migrar, "SENHA_PADRAO", None)
    m = migrar.mapear(crm_json([
        t("🌻 INSS", "Fulana #00000000191", cpf="00000000191",
          checklist=[{"texto": "Padrão", "feito": False}]),
    ]))
    assert m["credenciais"] == [] and m["tarefas"] == []


def test_documentos_solicitados_no_andamento_viram_checklist():
    m = migrar.mapear(crm_json([
        t("🌻 INSS", "Fulana #00000000191", cpf="00000000191",
          andamentos=[{"data": "2026-08-01", "inicial": "P", "autor": "Paulo",
                       "texto": "Atendimento feito. Documentos solicitados ao cliente: "
                                "RG e CPF; Comprovante de residência; Carta de indeferimento."}]),
    ]))
    titulos = sorted(tf["titulo"] for tf in migrar.tarefas_docs_de(m["andamentos"]))
    assert titulos == ["📄 Carta de indeferimento", "📄 Comprovante de residência", "📄 RG e CPF"]
    assert all(not tf["concluida"] for tf in migrar.tarefas_docs_de(m["andamentos"]))


def test_andamento_sem_solicitacao_nao_gera_checklist():
    m = migrar.mapear(crm_json([
        t("🌻 INSS", "Fulana #00000000191", cpf="00000000191",
          andamentos=[{"data": "2026-08-01", "inicial": "P", "autor": "Paulo",
                       "texto": "Perícia agendada dia 13.04.2027."}]),
    ]))
    assert migrar.tarefas_docs_de(m["andamentos"]) == []
