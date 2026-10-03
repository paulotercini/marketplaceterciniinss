"""E4 · auditoria To Do × CRM (crm/auditoria_todo.py). Dados 100% fictícios.

A régua é o migrar.mapear(): o que ele produz a partir do To Do é o que o CRM
deveria ter. Cada prova monta uma leitura do To Do e um extrato do banco e
exige a diferença certa, com o tipo certo."""
import pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm"))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm" / "fase2"))
import auditoria_todo as aud
import migrar

CPF1, CPF2 = "00000000191", "00000000272"


def t(lista, titulo, **kw):
    base = {"id": kw.pop("id", titulo), "lista": lista, "titulo": titulo,
            "nome": titulo.split("#")[0].strip(), "cpf": kw.pop("cpf", None), "dn": None,
            "telefone": None, "processo": None, "nb": None, "beneficio": None, "prazo": None,
            "importante": False, "concluida": False, "concluida_em": None,
            "andamentos": [], "eventos": [], "checklist": []}
    base.update(kw)
    return base


def bloco(dia, texto):
    return {"data": dia, "inicial": "P", "autor": "Paulo", "texto": texto}


def caso_banco(tid, fase="inss", lista="🌻 INSS", prazo=None, imp=False, cpf=CPF1, kid=None):
    return [kid or migrar.uid("caso", tid), tid, migrar.uid("cliente", "cpf", cpf), fase, lista, prazo, imp]


def extrato(**kw):
    base = {"casos": [], "anotacoes": {}, "anotacoes_app": {}, "subtarefas": {},
            "particulares": [], "parcelas": [], "lembretes": [],
            "clientes": [migrar.uid("cliente", "cpf", CPF1)], "clientes_fora": []}
    base.update(kw)
    return base


def roda(tarefas, **ext):
    linhas, resumo = aud.comparar({"gerado_em": "2026-09-29T09:00:00", "tarefas": tarefas}, extrato(**ext))
    return linhas, resumo


def tipos(linhas):
    return sorted(l["tipo"] for l in linhas)


def test_caso_igual_nos_dois_nao_gera_diferenca():
    tf = t("🌻 INSS", f"Fulana #{CPF1}", cpf=CPF1, id="k1", prazo="2026-10-05",
           andamentos=[bloco("2026-09-20", "Petição protocolada.")])
    kid = migrar.uid("caso", "k1")
    linhas, resumo = roda([tf], casos=[caso_banco("k1", prazo="2026-10-05")],
                          anotacoes={kid: [aud.marca("2026-09-20", "Petição protocolada.")]})
    assert linhas == []
    assert resumo["planejado"] == {"todo_com_data": 1, "crm_mesma_data": 1}


def test_tarefa_aberta_sem_caso_no_crm_e_ausente_e_sem_cpf_no_titulo():
    linhas, _ = roda([t("🌻 INSS", f"Beltrano #{CPF2}", cpf=CPF2, id="k2")])
    (l,) = linhas
    assert l["tipo"] == "caso_ausente" and l["lista"] == "🌻 INSS"
    assert l["titulo"] == "Beltrano", "o título do To Do foi gravado com o CPF"
    assert "cliente_id" not in l, "apontou cliente que o CRM não tem"


def test_escritorio_e_pagamentos_novos_sao_informativos():
    linhas, _ = roda([t("🙋 Escritório", f"Fulana #{CPF1}", cpf=CPF1, id="e1"),
                      t("💵 Pagamentos", f"Fulana #{CPF1}", cpf=CPF1, id="p1")])
    assert tipos(linhas) == ["sem_caso_por_regra", "sem_caso_por_regra"]
    assert all(l["cliente_id"] == migrar.uid("cliente", "cpf", CPF1) for l in linhas)


def test_concluida_no_todo_e_aberta_no_crm():
    tf = t("🌻 INSS", f"Fulana #{CPF1}", cpf=CPF1, id="k1", concluida=True, concluida_em="2026-09-28")
    linhas, _ = roda([tf], casos=[caso_banco("k1")])
    (l,) = linhas
    assert (l["tipo"], l["no_todo"], l["no_crm"]) == ("fase", "encerrado", "inss")


def test_data_importancia_e_lista_diferentes():
    tf = t("👪 Judicial", f"Fulana #{CPF1}", cpf=CPF1, id="k1", prazo="2026-10-01", importante=True)
    linhas, resumo = roda([tf], casos=[caso_banco("k1", fase="judicial", lista="🌻 INSS",
                                                  prazo="2026-08-15")])
    assert tipos(linhas) == ["importante", "lista", "retorno"]
    ret = next(l for l in linhas if l["tipo"] == "retorno")
    assert (ret["no_todo"], ret["no_crm"]) == ("2026-10-01", "2026-08-15")
    assert resumo["planejado"] == {"todo_com_data": 1, "crm_mesma_data": 0}


def test_anotacoes_faltando_a_mais_e_repetidas():
    tf = t("🌻 INSS", f"Fulana #{CPF1}", cpf=CPF1, id="k1",
           andamentos=[bloco("2026-09-20", "Petição protocolada."),
                       bloco("2026-09-25", "Exigência cumprida.")])
    kid = migrar.uid("caso", "k1")
    velho = aud.marca("2026-09-20", "Petiçao protocolada")      # texto editado no To Do
    ok = aud.marca("2026-09-25", "Exigência cumprida.")
    linhas, _ = roda([tf], casos=[caso_banco("k1")], anotacoes={kid: [ok, ok, velho]})
    (l,) = linhas
    assert l["tipo"] == "anotacoes"
    assert l["detalhe"] == "faltam 1 · a mais 1 · repetidas 1"


def test_anotacao_escrita_no_crm_nao_conta_como_faltando():
    tf = t("🌻 INSS", f"Fulana #{CPF1}", cpf=CPF1, id="k1",
           andamentos=[bloco("2026-09-20", "Liguei para a cliente.")])
    kid = migrar.uid("caso", "k1")
    linhas, _ = roda([tf], casos=[caso_banco("k1")],
                     anotacoes_app={kid: [aud.marca("2026-09-20", "Liguei para a cliente.")]})
    assert linhas == []


def test_subtarefa_faltando_e_marcacao_diferente():
    tf = t("🌻 INSS", f"Fulana #{CPF1}", cpf=CPF1, id="k1",
           checklist=[{"id": "c1", "texto": "Pedir CNIS atualizado", "feito": True},
                      {"id": "c2", "texto": "Agendar perícia com a cliente", "feito": False}])
    kid = migrar.uid("caso", "k1")
    linhas, _ = roda([tf], casos=[caso_banco("k1")],
                     subtarefas={kid: [[aud.marca_titulo("Pedir CNIS atualizado"), False]]})
    (l,) = linhas
    assert l["tipo"] == "subtarefas" and l["detalhe"] == "faltam 1 · marcação diferente 1"


def test_parcelas_ausente_situacao_a_mais_e_aberta_de_tarefa_concluida():
    tf = t("💵 Pagamentos", f"Fulana #{CPF1}", cpf=CPF1, id="p1", concluida=True,
           concluida_em="2026-09-01",
           checklist=[{"id": "i1", "texto": "1ª parcela 500", "feito": True, "feito_em": "2026-08-10"},
                      {"id": "i2", "texto": "2ª parcela 500", "feito": False},
                      {"id": "i3", "texto": "3ª parcela 500", "feito": False}])
    cid = migrar.uid("cliente", "cpf", CPF1)
    linhas, resumo = roda([tf], casos=[caso_banco("p1", fase="encerrado", lista="💵 Pagamentos")],
                          parcelas=[["i1", "aberto", cid], ["i2", "aberto", cid], ["i9", "aberto", cid]])
    assert tipos(linhas) == ["parcela_a_mais", "parcela_ausente", "parcela_situacao"]
    assert resumo["parcelas_abertas_de_tarefa_concluida"] == 2


def test_lembrete_com_data_congelada_desligado_e_anotacoes():
    tf = t("🙏 Aposentadorias Futuras", f"Fulana #{CPF1}", cpf=CPF1, id="a1", prazo="2027-03-01",
           andamentos=[bloco("2026-09-01", "Conferir CNIS em março.")])
    lid = migrar.uid("lembrete", "a1")
    cid = migrar.uid("cliente", "cpf", CPF1)
    linhas, _ = roda([tf], lembretes=[[lid, "a1", "2026-08-01", False, 0, None, cid]])
    assert tipos(linhas) == ["lembrete_ativo"], "tarefa aberta com lembrete desligado"
    linhas, _ = roda([tf], lembretes=[[lid, "a1", "2026-08-01", True, 0, None, cid]])
    assert tipos(linhas) == ["lembrete_anotacoes", "lembrete_data"]
    data = next(l for l in linhas if l["tipo"] == "lembrete_data")
    assert (data["no_todo"], data["no_crm"]) == ("2027-03-01", "2026-08-01")


def test_lembrete_convertido_a_mao_no_crm_nao_e_ausente():
    tf = t("🙏 Aposentadorias Futuras", f"Fulana #{CPF1}", cpf=CPF1, id="a1", prazo="2027-03-01")
    kid = migrar.uid("caso", "a1")
    cid = migrar.uid("cliente", "cpf", CPF1)
    linhas, _ = roda([tf], casos=[caso_banco("a1", fase="encerrado", lista="🙏 Aposentadorias Futuras")],
                     lembretes=[["lemb-mao", None, "2027-01-01", True, 0, kid, cid]])
    assert "lembrete_ausente" not in tipos(linhas)


def test_tarefa_particular_ausente_com_data_e_concluida():
    tfs = [t("Tarefas", "Renovar a OAB", id="p1", prazo="2026-10-10"),
           t("Tarefas", "Comprar toner", id="p2", prazo="2026-10-02"),
           t("Tarefas", "Pagar o DAS", id="p3", concluida=True)]
    linhas, _ = roda(tfs, particulares=[[migrar.uid("tarefa", "p2"), "2026-10-05", False],
                                        [migrar.uid("tarefa", "p3"), None, False]])
    assert tipos(linhas) == ["particular_ausente", "particular_concluida", "particular_data"]


def test_o_que_so_o_crm_tem():
    cid = migrar.uid("cliente", "cpf", CPF1)
    linhas, _ = roda([t("🌻 INSS", f"Outra #{CPF2}", cpf=CPF2, id="viva")],
                     casos=[["kc", None, cid, "inss", "🌻 INSS", None, False],
                            caso_banco("sumiu", fase="judicial", lista="👪 Judicial"),
                            caso_banco("viva")])
    assert tipos(linhas) == ["so_no_crm", "tarefa_sumiu"]


def test_lista_fora_do_mapa_sem_cpf_vai_so_para_o_resumo():
    linhas, resumo = roda([t("☕ Marcos", "Ligar para o contador", id="m1")])
    assert linhas == [] and resumo["fora_do_crm"] == {"☕ Marcos": 1}
