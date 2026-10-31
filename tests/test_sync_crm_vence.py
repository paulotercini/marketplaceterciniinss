"""O CRM vence: o que a equipe marca no CRM o To Do não desfaz (17.10.2026).

A cada 10 minutos o migrar.py regravava, a partir do To Do, o prazo e a ⭐ do
caso, o nome do cliente e o status da parcela. Desde outubro a equipe registra
no CRM (1.097 anotações no CRM contra 245 no To Do): a tarefa só preenche o
vazio, e a parcela só anda de aberto para recebido, nunca o contrário.
Dados 100% fictícios; os formatos dos valores lidos errado são os do banco.
"""
import pathlib, sys, urllib.parse

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm" / "fase2"))
import migrar  # noqa: E402


def crm_json(tarefas):
    return {"gerado_em": "2026-10-17T12:00:00", "tarefas": tarefas}


def t(lista, titulo, **kw):
    base = {"id": kw.pop("id", titulo), "lista": lista, "titulo": titulo,
            "nome": kw.pop("nome", titulo.split("#")[0].strip()),
            "cpf": kw.pop("cpf", None), "dn": None, "telefone": None,
            "processo": None, "nb": None, "beneficio": None, "prazo": None,
            "importante": False, "concluida": False, "concluida_em": None,
            "andamentos": [], "eventos": [], "checklist": []}
    base.update(kw)
    return base


# ── prazo fatal e ⭐ do caso ──────────────────────────────────────────────

def test_data_que_mudou_no_todo_vence_a_do_crm():
    """31.10.2026: o "Concluir em" adiado ou apagado no To Do não chegava ao CRM."""
    mapa = {"casos": [
        {"id": "adiou", "prazo": "2026-11-20", "todo_prazo": "2026-11-20"},
        {"id": "apagou", "prazo": None, "todo_prazo": None},
        {"id": "igual", "prazo": "2026-09-01", "todo_prazo": "2026-09-01"},   # o CRM mudou, o To Do não
    ]}
    banco = [{"id": "adiou", "prazo": "2026-10-10", "todo_prazo": "2026-10-10"},
             {"id": "apagou", "prazo": "2026-10-10", "todo_prazo": "2026-10-10"},
             {"id": "igual", "prazo": "2026-10-30", "todo_prazo": "2026-09-01"}]
    migrar.manter_dados_do_banco(mapa, banco, "casos", ("prazo",))
    assert [k["prazo"] for k in mapa["casos"]] == ["2026-11-20", None, "2026-10-30"]


def test_prazo_e_estrela_do_crm_nao_voltam_ao_do_todo():
    mapa = {"casos": [
        {"id": "a", "prazo": None, "importante": False},          # tarefa sem data apagava o prazo
        {"id": "b", "prazo": "2026-09-01", "importante": False},  # data velha da tarefa
        {"id": "c", "prazo": "2026-11-05", "importante": True},   # CRM vazio: o To Do preenche
        {"id": "d", "prazo": "2026-12-01", "importante": False},  # caso novo, fora do banco
    ]}
    banco = [{"id": "a", "prazo": "2026-10-20", "importante": False},
             {"id": "b", "prazo": "2026-10-30", "importante": True},
             {"id": "c", "prazo": None, "importante": False}]
    migrar.manter_dados_do_banco(mapa, banco, "casos", ("prazo", "importante"))
    a, b, c, d = mapa["casos"]
    assert (a["prazo"], a["importante"]) == ("2026-10-20", False)
    assert (b["prazo"], b["importante"]) == ("2026-10-30", True), "o prazo ou a ⭐ do CRM voltaram ao To Do"
    assert (c["prazo"], c["importante"]) == ("2026-11-05", True), "o To Do deixou de preencher o vazio"
    assert (d["prazo"], d["importante"]) == ("2026-12-01", False)


# ── nome do cliente ───────────────────────────────────────────────────────

def test_nome_do_crm_vence_e_o_provisorio_conta_como_vazio():
    mapa = {"clientes": [
        {"id": "a", "nome": "Ligar para Fulana sobre a pensão", "telefone": None, "dn": None},
        {"id": "b", "nome": "Beltrano da Silva", "telefone": None, "dn": None},
        {"id": "c", "nome": "Ciclana Prado", "telefone": None, "dn": None},
        {"id": "d", "nome": "Dirceu Novo", "telefone": None, "dn": None},
    ]}
    banco = [{"id": "a", "nome": "Fulana de Tal Souza"},          # "Usar o nome do CNIS" (F198)
             {"id": "b", "nome": "Cliente 000.000.002-72"},       # Novo Cliente antes do CNIS (F201)
             {"id": "c", "nome": ""}]
    migrar.manter_dados_do_banco(mapa, banco)
    assert [c["nome"] for c in mapa["clientes"]] == [
        "Fulana de Tal Souza", "Beltrano da Silva", "Ciclana Prado", "Dirceu Novo"]


# ── valor da parcela: o que não parece dinheiro não é gravado ──────────────
# Formatos do banco em 17.10.2026, com os dígitos trocados: 17 parcelas
# passavam de R$ 500 mil (processo, protocolo, telefone, senha), 195 eram o CPF
# do cliente lido como R$ 131 a R$ 998 e ~150 o telefone lido como R$ 99 mil.

@pytest.mark.parametrize("texto", [
    "5001927-53.2026.4.03.6314",                                   # processo (era R$ 5.001.927)
    "Proc. nº 1003833-11.2019.8.26.0368 - https://esaj.tjsp.jus.br/cpopg/show.do"
    "?processo.codigo=A80001X0000&processo.foro=368",
    "https://esaj.tjsp.jus.br/cpopg/show.do?processo.foro=368&processo.numero=1002602-12.2020.8.26.0368",
    "Recurso 4285045 - Ap. INSS TC",                                # protocolo de 7 dígitos
    "Recurso: 44236.585117/2024-48",                                # NUP do CRPS
    "123.456.789-09",                                               # CPF (era R$ 789)
    "NB 123.456.789-0",
    "CNPJ 12.345.678/0001-90",
    "16-99733-1234",                                                # telefone (era R$ 99.733)
    "(16) 99733-1234",
    "16 99733-1234 - recado",
    "Es@645351",                                                    # senha anotada no checklist
    "Abc@1234",
    "Ana.241223",
    "Xy*231513",
    "30% dos atrasados",                                            # percentual
    "R$ 1.234.567,89",                                              # acima de R$ 500 mil
    "R$ 500.000,01",
])
def test_valor_que_nao_parece_dinheiro_nao_e_gravado(texto):
    assert migrar.valor_do_item(texto) is None


@pytest.mark.parametrize("texto, valor", [
    ("Entrada R$ 1.500,00 10/08/2026", 1500.0),
    ("2ª parcela 500 10/09/2026", 500.0),
    ("(P): Parcela R$500,00 em 10.08.2026. Pago", 500.0),
    ("Parcela 10/12 - R$520,00 em 10/12/2026", 520.0),
    ("1500,00 - 10/12", 1500.0),
    ("honorários 1.500,00", 1500.0),
    ("Pagou 3x de 1212,00.", 1212.0),
    ("R$ 7.357,53 em 10/10/2026", 7357.53),
    ("R$ 500.000,00", 500000.0),                                    # o teto ainda é dinheiro
    ("123.456.789-09 - 2ª parcela 500", 500.0),                     # o CPF sai, o valor fica
    ("16-99733-1234 Entrada 300", 300.0),
    ("Pago 50 em espécie, 373, falta o resto", 373.0),
])
def test_valor_de_verdade_continua_sendo_lido(texto, valor):
    assert migrar.valor_do_item(texto) == valor


# ── CPF e espécie que o CRM gravou ────────────────────────────────────────

def test_cpf_do_crm_fica_e_o_do_todo_so_preenche_o_vazio():
    mapa = {"clientes": [
        {"id": "a", "cpf": None},              # veio do To Do sem CPF; o CRM pôs o CPF
        {"id": "b", "cpf": "00000000272"},     # o CRM corrigiu o CPF digitado errado no título
        {"id": "c", "cpf": "00000000353"},     # CRM sem CPF: o To Do preenche
    ]}
    cpf_para_id = {"00000000191": "a", "00000000434": "b"}
    migrar.manter_dados_do_banco(mapa, [{"id": i, "cpf": cpf} for cpf, i in cpf_para_id.items()],
                                 campos=("cpf",))
    assert [(c["id"], c["cpf"]) for c in mapa["clientes"]] == [
        ("a", "00000000191"), ("b", "00000000434"), ("c", "00000000353")]


def test_especie_do_crm_fica_e_a_do_todo_so_preenche_o_vazio():
    mapa = {"casos": [{"id": "a", "beneficio": None},
                      {"id": "b", "beneficio": "Apos. Tempo de Contribuição"},
                      {"id": "c", "beneficio": "Aux. Acidente"}]}
    banco = [{"id": "a", "beneficio": "BPC/LOAS — idoso"},
             {"id": "b", "beneficio": "Aposentadoria por tempo de contribuição da pessoa com deficiência"},
             {"id": "c", "beneficio": None}]
    migrar.manter_dados_do_banco(mapa, banco, "casos", ("beneficio",))
    assert [k["beneficio"] for k in mapa["casos"]] == [
        "BPC/LOAS — idoso", "Aposentadoria por tempo de contribuição da pessoa com deficiência",
        "Aux. Acidente"]


# ── checklist de 💵 Pagamentos: só parcela vira parcela ────────────────────
# Em 17.10.2026, entre as parcelas vindas do To Do: 125 senhas, 33 "Padrão",
# 213 CPFs, 75 telefones, 56 aniversários, 47 protocolos e 31 parcerias.

@pytest.mark.parametrize("texto", [
    "Es@645351", "Abc@1234", "Senha: abc123", "Padrão",                 # senha
    "000.000.001-91", "16-99733-1234", "(16) 99733-1234",               # CPF e telefone
    "1234567890", "5001927-53.2026.4.03.6314",                          # protocolo, processo
    "#Laís", "Parceria: Dra. Laís",                                     # parceria
    "Aniversário 01/02/1960",                                           # dado do cliente
])
def test_dado_do_cliente_nao_e_parcela(texto):
    assert not migrar.e_parcela(texto, CPF_F)


@pytest.mark.parametrize("texto", [
    "Entrada R$ 300,00", "2ª parcela 500 10/09/2026", "R$500,00",       # "R$500,00" colado não é senha
    "500", "10/11/2026", "Pagou tudo", "Entrada paga em dinheiro", "",
])
def test_parcela_continua_parcela(texto):
    assert migrar.e_parcela(texto, CPF_F)


def test_senha_do_checklist_de_pagamentos_vai_para_a_credencial_e_nao_para_a_parcela():
    m = migrar.mapear(crm_json([
        t("💵 Pagamentos", "Fulana Souza #000.000.001-91", cpf=CPF_F, id="pg", checklist=[
            {"id": "i1", "texto": "Entrada R$ 300,00", "feito": False, "feito_em": None},
            {"id": "i2", "texto": "Es@645351", "feito": False, "feito_em": None},
            {"id": "i3", "texto": "(16) 99733-1234", "feito": False, "feito_em": None}]),
    ]))
    assert [p["todo_item_id"] for p in m["pagamentos"]] == ["i1"]
    assert m["fora_de_pagamentos"] == ["i2", "i3"]
    assert [c["valor"] for c in m["credenciais"]] == ["Es@645351"]
    assert m["clientes"][0]["telefone"] == "16997331234"


# ── a rodada inteira, num banco de mentira que corta em 1000 linhas ───────

CPF_F, CPF_B, CPF_C, CPF_D = "00000000191", "00000000272", "00000000353", "00000000434"
# Dirceu veio do To Do sem CPF (o id é o do nome); a equipe pôs o CPF no CRM
CLI_D = migrar.uid("cliente", "nome", "Dirceu Prado")


class Banco:
    """Supabase de mentira para o subir_rest: responde cada leitura pelos
    filtros, devolve só as colunas do select e corta em 1000 linhas, como o de
    verdade. rpc=True responde a função do E2 como o schema_sync_leve.sql;
    sem ela, a rodada vai pelo caminho antigo."""

    def __init__(self, clientes, casos, pagamentos=(), recusa=(), rpc=False):
        self.tab = {"clientes": clientes, "casos": casos, "pagamentos": list(pagamentos)}
        self.recusa, self.rpc = recusa, rpc     # recusa: trechos de caminho que o banco recusa
        self.gets, self.posts, self.deletes = [], {}, []

    def __call__(self, url, chave, metodo, caminho, corpo=None, prefer=None):
        tabela = caminho.split("?")[0].rsplit("/", 1)[-1]
        cam = urllib.parse.unquote(caminho)
        if "/rpc/" in caminho:
            return self.e2(corpo) if self.rpc else None
        if metodo == "PATCH":
            return None
        if metodo == "POST":
            self.posts.setdefault(tabela, []).append(corpo)
            return None
        if metodo == "DELETE":
            self.deletes.append(cam)
            ids = cam.split("todo_item_id=in.(")[1].split(")")[0].split(",")
            return [{"todo_item_id": p["todo_item_id"]} for p in self.tab["pagamentos"]
                    if p["todo_item_id"] in ids and not (p["conferencias"] and "conferencias=eq.[]" in cam)]
        self.gets.append(cam)
        if any(r in cam for r in self.recusa):
            raise migrar.BancoRecusou(f"o banco recusou GET em '{tabela}' (400): PGRST100")
        q = urllib.parse.parse_qs(urllib.parse.urlparse(caminho).query)
        salto = int(q.get("offset", ["0"])[0])
        teto = min(int(q.get("limit", ["1000"])[0]), 1000)
        cols = q["select"][0].split(",")
        return [{c: l.get(c) for c in cols} for l in self.filtrar(tabela, cam)[salto:salto + teto]]

    def filtrar(self, tabela, cam):
        ls = self.tab.get(tabela) or []
        if tabela == "clientes":
            return [l for l in ls if l.get("cpf")] if "cpf=not.is.null" in cam else ls
        if tabela != "casos" or "aposentadoria_futura" in cam:
            return []
        if "mover_para.not.is.null" in cam:
            if "arquivados.not.is.null" in cam:      # arquivados nunca é nulo ('{}'): vem a carteira
                return ls
            return [l for l in ls if l.get("mover_para") or l.get("arquivados")]
        ls = [l for l in ls if l.get("todo_task_id")]
        if "importante.is.true" in cam:
            ls = [l for l in ls if l["fase"] != "encerrado"
                  and (l.get("prazo") or l.get("importante") or l.get("beneficio"))]
        return ls

    def e2(self, corpo):
        vivos, semnum = set(corpo["vivos"]), set(corpo["sem_numero"])
        pedidas = vivos | set(corpo["consultar"])
        ks = [k for k in self.tab["casos"] if k.get("todo_task_id")]
        return {
            "clientes": [[c["cpf"], c["id"]] for c in self.tab["clientes"]
                         if c.get("cpf") and c["id"] != migrar.uid("cliente", "cpf", c["cpf"])],
            "trocas": [[k["todo_task_id"], k["id"]] for k in ks if k["todo_task_id"] in pedidas
                       and k["id"] != migrar.uid("caso", k["todo_task_id"])],
            "novas": sorted(p for p in pedidas if not any(k["todo_task_id"] == p for k in ks)),
            "orfaos": [dict(k) for k in ks if k["fase"] != "encerrado" and k["todo_task_id"] not in vivos],
            "numeros": [[k["todo_task_id"], k["processo"], k["nb"]] for k in ks
                        if k["todo_task_id"] in semnum and (k["processo"] or k["nb"])],
        }


SENHA = "Es@645351"


def _roda(monkeypatch, recusa=(), rpc=False):
    fulana = "Fulana Souza #000.000.001-91"
    tarefas = [
        # o pré-caso do Escritório que a equipe mandou para 🗓 Tarefas com Prazo (F38)
        t("🙋 Escritório", fulana, cpf=CPF_F, id="esc"),
        t("👪 Judicial", fulana, cpf=CPF_F, id="jud", prazo="2026-09-01",
          beneficio="Apos. Tempo de Contribuição"),
        # tarefa pessoal com o CPF no título: o nome dela é o mais longo
        t("📌 Pessoal", "Ligar para Fulana sobre a pensão #000.000.001-91", cpf=CPF_F, id="pes"),
        # caso encerrado, tarefa concluída sem espécie reconhecível
        t("👪 Judicial", fulana, cpf=CPF_F, id="enc", concluida=True, concluida_em="2026-10-01"),
        t("🌻 INSS", "Beltrano da Silva #000.000.002-72", cpf=CPF_B, id="inss",
          prazo="2026-11-05", importante=True, beneficio="Aux. Incapacidade Temporária"),
        t("🌻 INSS", "Ciclano Novo #000.000.003-53", cpf=CPF_C, id="novo"),
        # Dirceu: a tarefa antiga sem CPF e uma nova, já com o CPF no título
        t("🌻 INSS", "Dirceu Prado", id="dir"),
        t("👪 Judicial", "Dirceu Prado #000.000.004-34", cpf=CPF_D, id="dir2"),
        t("💵 Pagamentos", fulana, cpf=CPF_F, id="pg", checklist=[
            # recebida no CRM (botão Recebido) e ainda aberta no To Do
            {"id": "i1", "texto": "2ª parcela R$ 500,00 10/11/2026", "feito": False, "feito_em": None},
            {"id": "i2", "texto": "Entrada R$ 300,00", "feito": True, "feito_em": "2026-10-01"},
            {"id": "i3", "texto": "5001927-53.2026.4.03.6314", "feito": False, "feito_em": None},
            {"id": "i4", "texto": "000.000.001-91", "feito": False, "feito_em": None},
            {"id": "i5", "texto": SENHA, "feito": False, "feito_em": None},
            {"id": "i6", "texto": "Padrão", "feito": False, "feito_em": None},
            {"id": "i7", "texto": "R$500,00", "feito": False, "feito_em": None},
            {"id": "i8", "texto": "Pagou tudo", "feito": True, "feito_em": "2026-10-02"},
        ]),
    ]
    mapa = migrar.mapear(crm_json(tarefas))
    clientes = [{"id": "cli-f", "cpf": CPF_F, "nome": "Fulana de Tal Souza", "dn": None, "telefone": None},
                {"id": "cli-b", "cpf": CPF_B, "nome": "Cliente 000.000.002-72", "dn": None, "telefone": None},
                {"id": CLI_D, "cpf": CPF_D, "nome": "Dirceu Prado", "dn": None, "telefone": None}]
    caso = lambda **kw: {"cliente_id": "cli-f", "titulo": "Fulana Souza", "mover_para": None,
                         "arquivados": {}, "prazo": None, "importante": False, "beneficio": None,
                         "processo": None, "nb": None, **kw}
    marcados = [
        caso(id="caso-esc", todo_task_id="esc", fase="outro", mover_para="🗓 Tarefas com Prazo",
             prazo="2026-10-20", beneficio="BPC/LOAS — idoso"),
        caso(id="caso-jud", todo_task_id="jud", fase="judicial", prazo="2026-10-30", todo_prazo="2026-09-01", importante=True,
             arquivados={"add:prot:888888888": {"de": "app"}},
             beneficio="Aposentadoria por tempo de contribuição da pessoa com deficiência"),
    ]
    outros = [caso(id="caso-inss", todo_task_id="inss", cliente_id="cli-b", fase="inss",
                   titulo="Beltrano da Silva"),
              caso(id="caso-enc", todo_task_id="enc", fase="encerrado", beneficio="Auxílio-acidente"),
              caso(id="caso-dir", todo_task_id="dir", cliente_id=CLI_D, fase="inss", titulo="Dirceu Prado")]
    sem_marca = [caso(id=f"crm-{i}", todo_task_id=None, cliente_id="cli-x", fase="inss",
                      titulo=f"Caso {i}") for i in range(1300)]
    pagamentos = [{"todo_item_id": "i1", "conferencias": [{"c": "amanda"}]},     # recebida no CRM
                  {"todo_item_id": "i3", "conferencias": []}, {"todo_item_id": "i4", "conferencias": []},
                  {"todo_item_id": "i5", "conferencias": []},
                  {"todo_item_id": "i6", "conferencias": [{"c": "paulo"}]}]      # conferida no CRM
    # os casos marcados ficam além da linha 1000, onde a leitura antiga não chegava
    banco = Banco(clientes, sem_marca[:1100] + marcados + outros + sem_marca[1100:], pagamentos,
                  recusa, rpc)
    monkeypatch.setattr(migrar, "_rest", banco)
    monkeypatch.setenv("SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "chave")
    migrar.subir_rest(mapa)
    return banco, lambda tab: [l for lote in banco.posts.get(tab, []) for l in lote]


@pytest.mark.parametrize("rpc", [False, True], ids=["caminho-antigo", "E2"])
def test_rodada_nao_desfaz_o_que_o_crm_marcou(monkeypatch, rpc):
    banco, enviado = _roda(monkeypatch, rpc=rpc)
    casos = {k["todo_task_id"]: k for k in enviado("casos")}
    # o pré-caso mandado para 🗓 Tarefas com Prazo: a fase e o prazo do CRM ficam
    assert casos["esc"]["fase"] == "outro", "o caso movido no CRM voltou para a lista antiga"
    assert casos["esc"]["prazo"] == "2026-10-20", "a tarefa sem data apagou o prazo fatal do CRM"
    # o prazo e a ⭐ do CRM vencem a data velha da tarefa; o protocolo do CRM fica
    assert (casos["jud"]["prazo"], casos["jud"]["importante"]) == ("2026-10-30", True)
    assert "888888888" in casos["jud"]["protocolos"], "o protocolo acrescentado no CRM sumiu"
    # CRM vazio: o To Do preenche o prazo e acende a ⭐
    assert (casos["inss"]["prazo"], casos["inss"]["importante"]) == ("2026-11-05", True)

    nomes = {c["cpf"]: c["nome"] for c in enviado("clientes")}
    assert nomes[CPF_F] == "Fulana de Tal Souza", "a tarefa pessoal renomeou o cliente"
    assert nomes[CPF_B] == "Beltrano da Silva", "o nome provisório do Novo Cliente não foi preenchido"
    assert nomes[CPF_C] == "Ciclano Novo"

    # espécie: a do CRM vence a vazia e a do To Do; o vazio do CRM o To Do preenche;
    # no caso encerrado (fora da leitura) a espécie vazia nem vai
    assert casos["esc"]["beneficio"] == "BPC/LOAS — idoso", "a tarefa sem espécie apagou a do CRM"
    assert casos["jud"]["beneficio"] == "Aposentadoria por tempo de contribuição da pessoa com deficiência"
    assert casos["inss"]["beneficio"] == "Aux. Incapacidade Temporária"
    assert "beneficio" not in casos["enc"], "a tarefa concluída sem espécie apagaria a do caso encerrado"

    # CPF posto no CRM na ficha que veio do To Do sem CPF: fica, no mesmo id, sem ficha nova
    ds = [c for c in enviado("clientes") if c["id"] == CLI_D]
    assert ds and all(c["cpf"] == CPF_D for c in ds), "a tarefa sem CPF apagou o CPF do CRM"
    assert not [c for c in enviado("clientes") if c["cpf"] == CPF_D and c["id"] != CLI_D], \
        "nasceu outra ficha para o mesmo CPF"
    assert casos["dir"]["cliente_id"] == casos["dir2"]["cliente_id"] == CLI_D

    pgs = {p["todo_item_id"]: p for p in enviado("pagamentos")}
    assert "status" not in pgs["i1"] and "pago_em" not in pgs["i1"], \
        "o item aberto no To Do devolveria a 'aberto' a parcela recebida no CRM"
    assert (pgs["i2"]["status"], pgs["i2"]["pago_em"]) == ("recebido", "2026-10-01"), \
        "o item marcado no To Do deixou de dar a parcela por recebida"
    assert pgs["i1"]["valor"] == 500.0 and pgs["i7"]["valor"] == 500.0
    # processo, CPF, senha e "Padrão" não são parcela; texto livre e "R$500,00" são
    assert set(pgs) == {"i1", "i2", "i7", "i8"}
    assert not any(SENHA in p["descricao"] for p in pgs.values()), "a senha virou descrição de parcela"
    for lote in banco.posts["pagamentos"]:   # o PostgREST exige as mesmas chaves no lote
        assert len({tuple(sorted(l)) for l in lote}) == 1
    # a senha vai para onde ia nas outras listas: a credencial do cliente
    assert any(c["valor"] == SENHA and c["cliente_id"] == "cli-f" for c in enviado("credenciais"))
    # apagar o que já tinha virado parcela é decisão do escritório: sem LIMPAR_PARCELAS_FALSAS=1, nada sai
    assert banco.deletes == [], "a rodada apagou parcelas sem o escritório ligar a faxina"


@pytest.mark.parametrize("rpc", [False, True], ids=["caminho-antigo", "E2"])
def test_faxina_das_parcelas_falsas_so_quando_ligada(monkeypatch, rpc):
    monkeypatch.setenv("LIMPAR_PARCELAS_FALSAS", "1")
    banco, _ = _roda(monkeypatch, rpc=rpc)
    (apaga,) = banco.deletes
    assert set(apaga.split("in.(")[1].split(")")[0].split(",")) == {"i3", "i4", "i5", "i6"}
    assert "conferencias=eq.[]" in apaga and "status=eq.aberto" in apaga, "apagaria parcela que o CRM conferiu ou recebeu"


def test_marcas_leem_so_os_casos_marcados(monkeypatch):
    banco, _ = _roda(monkeypatch)
    (g,) = [g for g in banco.gets if "mover_para.not.is.null" in g]
    assert "arquivados.neq.{}" in g, "a leitura das marcas voltou a trazer a carteira inteira"


def test_banco_que_recusa_o_filtro_curto_ainda_entrega_todas_as_marcas(monkeypatch):
    # sem o filtro de jsonb, a leitura volta ao filtro antigo, agora paginada:
    # mais tráfego, mas nenhuma marca fica de fora
    banco, enviado = _roda(monkeypatch, recusa=("arquivados.neq",))
    assert {k["todo_task_id"]: k for k in enviado("casos")}["esc"]["fase"] == "outro"
    assert any("arquivados.not.is.null" in g and "offset=1000" in g for g in banco.gets)


def test_carga_por_sql_tambem_deixa_o_crm_vencer():
    m = migrar.mapear(crm_json([
        t("💵 Pagamentos", "Fulana Souza #000.000.001-91", cpf=CPF_F, id="pg", checklist=[
            {"id": "i1", "texto": "Entrada R$ 300,00", "feito": False, "feito_em": None}]),
    ]))
    m["tarefas_docs"] = []
    sql = {s.split(" (")[0].removeprefix("insert into "): s
           for s in migrar.gerar_sql(m).split(";\n\n") if s.startswith("insert into")}
    assert "else coalesce(casos.prazo, excluded.prazo) end" in sql["casos"]
    assert "excluded.todo_prazo is distinct from casos.todo_prazo" in sql["casos"]
    assert "importante = casos.importante or excluded.importante" in sql["casos"]
    assert "beneficio = coalesce(casos.beneficio, excluded.beneficio)" in sql["casos"]
    assert "then excluded.nome else clientes.nome end" in sql["clientes"]
    assert "dn = coalesce(nullif(clientes.dn, ''), excluded.dn)" in sql["clientes"]
    assert "status = case when excluded.status = 'recebido'" in sql["pagamentos"]
    for tab, velho in (("casos", "prazo = excluded.prazo"), ("casos", "importante = excluded.importante"),
                       ("casos", "beneficio = excluded.beneficio"),
                       ("clientes", "nome = excluded.nome"), ("pagamentos", "status = excluded.status"),
                       ("pagamentos", "pago_em = excluded.pago_em")):
        assert velho not in sql[tab], velho


def test_etapa_do_caso_sem_data_nao_apaga_a_data_do_crm():
    """P4 dos prazos: a etapa do caso sem data vai sem a coluna prazo; a tarefa pessoal e a etapa com data vão com ela."""
    mapa = {"tarefas": [
        {"id": "a", "caso_id": "k1", "titulo": "📄 CTPS", "prazo": None},
        {"id": "b", "caso_id": "k1", "titulo": "📄 Laudo", "prazo": "2026-11-20"},
        {"id": "c", "caso_id": None, "titulo": "Pagar conta", "prazo": None},
    ]}
    migrar.separar_prazo_vazio(mapa)
    assert [t["id"] for t in mapa["tarefas"]] == ["b", "c"]
    assert mapa["tarefas_sem_prazo"] == [{"id": "a", "caso_id": "k1", "titulo": "📄 CTPS"}]
