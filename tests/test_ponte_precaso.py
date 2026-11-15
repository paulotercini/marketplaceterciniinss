"""F602 · a ponte do pré-caso (CRM -> To Do): regras puras."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm" / "fase2"))
import migrar  # noqa: E402
import ponte_precaso as pp  # noqa: E402

AF = "🙏 Aposentadorias Futuras"
ESCR = "🙋 Escritório"


def caso(**kw):
    k = {"id": "c1", "cliente_id": "cl1", "todo_task_id": "t1", "origem_lista": ESCR,
         "mover_para": AF, "precaso": {"via": "x"}, "beneficio": "B41"}
    k.update(kw)
    return k


def test_pendentes_so_precaso_com_mover_sem_falha():
    casos = [caso(), caso(id="c2", mover_para=None), caso(id="c3", precaso=None),
             caso(id="c4", precaso={"ponte_falha": "x"})]
    assert [k["id"] for k in pp.pendentes(casos)] == ["c1"]


def test_acao():
    assert pp.acao(caso(mover_para="concluir")) == "concluir"
    assert pp.acao(caso(mover_para="concluir", todo_task_id=None)) == "nada"
    assert pp.acao(caso(mover_para=ESCR)) == "reabrir"
    assert pp.acao(caso()) == "mover"
    assert pp.acao(caso(todo_task_id=None, mover_para=ESCR)) == "mover"


def test_patch_para_futuro():
    m = pp.patch_do_caso(caso(precaso={"ponte_falha": "x", "arquivo": {"em": "d"}}), AF, "t9")
    assert m["fase"] == "encerrado" and m["pre_caso"] is True and m["mover_para"] is None
    assert m["todo_task_id"] == "t9" and m["origem_lista"] == AF
    assert m["precaso"] == {"so_lembrete": True, "lembrete_id": migrar.uid("lembrete", "t9")}


def test_patch_volta_ao_escritorio_e_gerar_caso():
    k = caso(precaso={"so_lembrete": True, "lembrete_id": "L"}, origem_lista=AF, mover_para=ESCR)
    m = pp.patch_do_caso(k, ESCR, "t2")
    assert m["fase"] == "escritorio" and m["pre_caso"] is True and m["encerrado_em"] is None
    assert m["precaso"] == {}
    m = pp.patch_do_caso(caso(), "🌻 INSS", "t3")
    assert m["fase"] == "inss" and m["pre_caso"] is False


def test_lembrete_do_card():
    l = pp.lembrete_do_card(caso(precaso={"data_direito": "2027-03-01"}), "t9")
    assert l["id"] == migrar.uid("lembrete", "t9") and l["tipo"] == "aposentadoria_futura"
    assert l["crm"] == {"etapa": "monitorando", "data_direito": "2027-03-01", "data_fonte": "crm"}
    assert pp.lembrete_do_card(caso(), "t9")["crm"] == {"etapa": "monitorando"}


def test_copia_tarefa():
    assert pp._copia_tarefa(None, "Cliente Teste #000")["title"] == "Cliente Teste #000"
    t = {"title": "A", "body": {"content": "b", "contentType": "text"}, "importance": "high",
         "dueDateTime": {"dateTime": "2026-12-01T00:00:00", "timeZone": "UTC"}}
    c = pp._copia_tarefa(t, "x")
    assert c["title"] == "A" and c["importance"] == "high" and "dueDateTime" in c


class GC:
    def __init__(self):
        self.chamadas = []

    def get_task(self, lid, tid):
        return {"id": tid, "title": "Cliente Teste"}

    def _req(self, metodo, caminho, corpo=None):
        self.chamadas.append((metodo, caminho))
        if metodo == "GET":
            return {"value": [{"displayName": "etapa", "isChecked": True}]}
        if metodo == "POST" and caminho.endswith("/tasks"):
            return {"id": "novo"}
        return {}


def test_mover_cria_confere_e_apaga():
    gc = GC()
    nid = pp.mover(gc, {ESCR: "LE", AF: "LA"}, caso(), "Cliente Teste")
    assert nid == "novo"
    metodos = [m for m, _ in gc.chamadas]
    assert metodos == ["GET", "POST", "POST", "DELETE"]
    assert gc.chamadas[-1][1] == "/me/todo/lists/LE/tasks/t1"
