"""Lembrete com horário (como o To Do): quem avisa e quando."""
import json, pathlib, shutil, subprocess

import pytest

APP = pathlib.Path(__file__).resolve().parent.parent / "crm/fase2/app.html"


def _funcao(nome):
    app = APP.read_text("utf-8")
    ini = app.index(f"function {nome}(")
    if app[ini-6:ini] == "async ": ini -= 6
    return app[ini:app.index("\n}\n", ini) + 2]


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_avisa_so_a_hora_que_chegou_uma_vez_e_aberta():
    ts = [
        {"id": "a", "lembrar_em": "2026-10-24", "lembrar_hora": "09:00:00"},   # chegou
        {"id": "b", "lembrar_em": "2026-10-24", "lembrar_hora": "15:00:00"},   # ainda não
        {"id": "c", "lembrar_em": "2026-10-23", "lembrar_hora": "09:00:00"},   # outro dia
        {"id": "d", "lembrar_em": "2026-10-24", "lembrar_hora": None},         # sem hora
        {"id": "e", "lembrar_em": "2026-10-24", "lembrar_hora": "08:00:00", "concluida_em": "x"},
        {"id": "f", "lembrar_em": "2026-10-24", "lembrar_hora": "08:30:00"},   # já avisou
    ]
    js = _funcao("lembretesNaHora") + (
        f"\nconsole.log(JSON.stringify(lembretesNaHora({json.dumps(ts)}, '2026-10-24', '10:00',"
        " new Set(['f|2026-10-24|08:30'])).map(t=>t.id)))")
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout
    assert json.loads(out) == ["a"]


@pytest.mark.skipif(not shutil.which("node"), reason="sem node")
def test_patch_caso_recarrega_e_avisa_quando_outra_pessoa_mexeu():
    js = _funcao("patchCaso") + r"""
const chamadas = [], avisos = [];
let banco = {id:"k1", mudou_em:"2026-10-24T12:00:01+00:00", fase:"inss", nb:"9"};
async function api(url, o){ chamadas.push(url);
  const m = /mudou_em=eq\.([^&]+)/.exec(url);
  if(m && decodeURIComponent(m[1]) !== banco.mudou_em) return [];
  Object.assign(banco, JSON.parse(o.body), {mudou_em:"2026-10-24T12:00:09+00:00"});
  return [/select=\*/.test(url) ? {...banco} : {mudou_em:banco.mudou_em}]; }
const aviso = t => avisos.push(t), abrirFicha = () => {}, clienteAberto = null;
const k = {id:"k1", mudou_em:"2026-10-24T12:00:00+00:00", fase:"inss"};   // a tela viu a versão antiga
const D = {casoPorId: new Map([["k1", k]])};
(async () => {
  await patchCaso("k1", {fase:"judicial"});
  const conflito = {avisos: avisos.length, nb: k.nb, fase: banco.fase, n: chamadas.length};
  avisos.length = 0; chamadas.length = 0;
  await patchCaso("k1", {fase:"crps"});   // agora a tela está em dia: uma ida só, sem aviso
  console.log(JSON.stringify({conflito, depois: {avisos: avisos.length, n: chamadas.length, mudou: k.mudou_em === banco.mudou_em}}));
})();
"""
    out = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)
    assert out["conflito"] == {"avisos": 1, "nb": "9", "fase": "judicial", "n": 2}
    assert out["depois"] == {"avisos": 0, "n": 1, "mudou": True}
