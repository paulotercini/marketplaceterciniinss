import importlib.util, pathlib

_p = pathlib.Path(__file__).resolve().parent.parent / "crm/fase2/lote/honorarios_lote.py"
_spec = importlib.util.spec_from_file_location("honorarios_lote", _p)
hl = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(hl)


def _pg(i, desc, **kw):
    return {"id": str(i), "cliente_id": "c", "descricao": desc, "status": "aberto", "todo_item_id": f"t{i}", **kw}


def test_so_sai_o_que_nao_e_parcela_e_o_crm_nunca_tocou():
    pgs = [_pg(1, "Pagou R$ 500,00"), _pg(2, "Senha: Abc12345"), _pg(3, "(16) 99711-2233"),
           _pg(4, "Senha: Xyz98765", conferencias=[{"por": "x"}]), _pg(5, "Senha: Qwe45678", todo_item_id="hon:k:1"),
           _pg(6, "Senha: Rty11223", status="cancelado")]
    sai = {p["id"]: t for p, t in hl.candidatos(pgs, {"c": "00000000000"})}
    assert set(sai) == {"2", "3"}
    assert sai["2"] == "senha" and sai["3"] == "telefone"
