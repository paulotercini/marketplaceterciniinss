/* Portal Tercini - lado cliente.
 * Recebe CPF + DN, deriva uma chave via PBKDF2-SHA256, busca o JSON do
 * cliente em data/<hash>.json e renderiza os processos.
 *
 * Toda a logica eh local (no navegador). Nenhum dado eh enviado a um
 * servidor — apenas a requisicao estatica do arquivo JSON pelo nome.
 */

const META_URL = "data/_meta.json";
let META = null;

const $ = (sel) => document.querySelector(sel);
const tela = (id) => {
  ["#tela-login", "#tela-resultado", "#tela-vazio"].forEach((t) => {
    $(t).hidden = (t !== id);
  });
};

function mascararCPF(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4")
          .replace(/(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3")
          .replace(/(\d{3})(\d{3})$/, "$1.$2")
          .replace(/(\d{3})$/, "$1");
}

function mascararDN(v) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.slice(0, 2) + "/" + d.slice(2);
  return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
}

function normalizar(cpf, dn) {
  const cpfDigits = cpf.replace(/\D/g, "");
  const dnDigits = dn.replace(/\D/g, "");
  if (cpfDigits.length !== 11) return null;
  if (dnDigits.length !== 8) return null;
  return { cpf: cpfDigits, dn: dnDigits };
}

async function derivarHash(cpf, dn, salt, iter) {
  const enc = new TextEncoder();
  const senha = enc.encode(cpf + "|" + dn);
  const saltBytes = enc.encode(salt);
  const key = await crypto.subtle.importKey(
    "raw", senha, { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: iter, hash: "SHA-256" },
    key, 256
  );
  // hash final = SHA-256(derived), pega 16 bytes (32 hex)
  const hash = await crypto.subtle.digest("SHA-256", bits);
  return Array.from(new Uint8Array(hash))
              .slice(0, 16)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
}

async function carregarMeta() {
  if (META) return META;
  const r = await fetch(META_URL, { cache: "no-cache" });
  if (!r.ok) throw new Error("meta indisponivel");
  META = await r.json();
  return META;
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function renderProcesso(p) {
  const wrap = el("div", "processo");
  wrap.appendChild(el("span", "lista-origem", esc(p.lista)));
  wrap.appendChild(el("h3", null, esc(p.titulo_tarefa)));

  if (p.proximo_evento) {
    const ev = p.proximo_evento;
    const box = el("div", "proximo");
    const icone = el("div", "icone", iconePorTipo(ev.tipo));
    const dados = el("div", "dados");
    dados.appendChild(el("strong", null, esc(ev.tipo)));
    let txt = ev.data_br;
    if (ev.hora) txt += " as " + ev.hora;
    if (ev.local) txt += " - " + esc(ev.local);
    dados.appendChild(el("span", null, txt));
    box.appendChild(icone); box.appendChild(dados);
    wrap.appendChild(box);
  }

  // Localizacao no Escritorio — card grande em DESTAQUE
  if (p.localizacao) {
    const card = el("div", "loc-destaque");
    card.appendChild(el("div", "ld-label", "LOCALIZAÇÃO NO ESCRITÓRIO"));
    card.appendChild(el("div", "ld-valor", esc(p.localizacao)));
    wrap.appendChild(card);
  }

  // Ultimo andamento — caixa discreta
  if (p.timeline && p.timeline.length > 0) {
    const ult = p.timeline[0];
    const box = el("div", "ult-andamento");
    const cab = el("div", "ua-cab");
    cab.appendChild(el("span", "ua-tag", "ÚLTIMO ANDAMENTO"));
    cab.appendChild(el("span", "ua-data", ult.data_br));
    box.appendChild(cab);
    box.appendChild(el("div", "ua-tipo", esc(ult.tipo)));
    if (ult.descricao && ult.descricao.toLowerCase() !== ult.tipo.toLowerCase()) {
      box.appendChild(el("div", "ua-desc", esc(ult.descricao)));
    }
    wrap.appendChild(box);
  } else if (p.status) {
    const status = el("div", "status-box",
      "<strong>Situação:</strong> " + esc(p.status));
    wrap.appendChild(status);
  }

  if (p.notas_publicas && p.notas_publicas.length) {
    wrap.appendChild(el("div", "subt", "Comunicados"));
    const cont = el("div", "notas");
    p.notas_publicas.forEach((n) => {
      const nb = el("div", "nota");
      nb.appendChild(el("span", "data", n.data_br));
      nb.appendChild(el("div", null, esc(n.texto)));
      cont.appendChild(nb);
    });
    wrap.appendChild(cont);
  }

  if (p.timeline && p.timeline.length > 1) {
    wrap.appendChild(el("div", "subt", "Andamentos anteriores"));
    const tl = el("div", "timeline");
    p.timeline.slice(1, 9).forEach((m) => {
      const it = el("div", "item");
      it.appendChild(el("div", "data", m.data_br));
      it.appendChild(el("div", "tipo", esc(m.tipo)));
      if (m.descricao) it.appendChild(el("div", "desc", esc(m.descricao)));
      tl.appendChild(it);
    });
    wrap.appendChild(tl);
  }

  if (p.links_externos && p.links_externos.length) {
    wrap.appendChild(el("div", "subt", "Consulte todos os andamentos"));
    const cont = el("div", "links-externos");
    p.links_externos.forEach((lnk) => {
      const a = document.createElement("a");
      a.className = "link-ext";
      a.href = lnk.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const lbl = document.createElement("span");
      lbl.className = "le-label";
      lbl.textContent = lnk.label;
      a.appendChild(lbl);
      if (lnk.obs) {
        const obs = document.createElement("span");
        obs.className = "le-obs";
        obs.textContent = lnk.obs;
        a.appendChild(obs);
      }
      const seta = document.createElement("span");
      seta.className = "le-seta";
      seta.textContent = "→";
      a.appendChild(seta);
      cont.appendChild(a);
    });
    wrap.appendChild(cont);
  }

  return wrap;
}

function iconePorTipo(t) {
  const x = (t || "").toLowerCase();
  if (x.includes("pericia")) return "🩺";
  if (x.includes("audiencia")) return "⚖️";
  if (x.includes("avalia")) return "📋";
  return "📅";
}

function esc(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function consultar(cpfRaw, dnRaw) {
  const norm = normalizar(cpfRaw, dnRaw);
  if (!norm) {
    return { erro: "CPF ou data de nascimento invalido." };
  }
  let meta;
  try {
    meta = await carregarMeta();
  } catch (e) {
    return { erro: "Falha ao carregar o portal. Tente novamente em instantes." };
  }
  const h = await derivarHash(norm.cpf, norm.dn, meta.salt, meta.iter);
  const r = await fetch("data/" + h + ".json", { cache: "no-cache" });
  if (!r.ok) return { vazio: true };
  const dados = await r.json();
  return { dados, meta };
}

function init() {
  $("#cpf").addEventListener("input", (e) => {
    e.target.value = mascararCPF(e.target.value);
  });
  $("#dn").addEventListener("input", (e) => {
    e.target.value = mascararDN(e.target.value);
  });

  $("#form-login").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    $("#erro").hidden = true;
    $("#btn-consultar").disabled = true;
    $("#btn-consultar").textContent = "Consultando...";
    try {
      const res = await consultar($("#cpf").value, $("#dn").value);
      if (res.erro) {
        $("#erro").textContent = res.erro;
        $("#erro").hidden = false;
        return;
      }
      if (res.vazio) {
        tela("#tela-vazio");
        return;
      }
      const d = res.dados;
      $("#saudacao").textContent = "Ola, " + (d.nome || "cliente");
      $("#atualizacao").textContent = "Dados atualizados em " + d.atualizado_em;
      const cont = $("#processos");
      cont.innerHTML = "";
      d.processos.forEach((p) => cont.appendChild(renderProcesso(p)));
      tela("#tela-resultado");
    } catch (e) {
      $("#erro").textContent = "Erro inesperado. Tente novamente.";
      $("#erro").hidden = false;
    } finally {
      $("#btn-consultar").disabled = false;
      $("#btn-consultar").textContent = "Consultar";
    }
  });

  $("#btn-sair").addEventListener("click", () => {
    $("#form-login").reset();
    tela("#tela-login");
  });
  $("#btn-voltar").addEventListener("click", () => {
    $("#form-login").reset();
    tela("#tela-login");
  });
}

init();
