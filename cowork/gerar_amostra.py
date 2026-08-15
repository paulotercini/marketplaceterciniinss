#!/usr/bin/env python3
"""Gera cowork/06-amostra-ficticia.json — 20 clientes INVENTADOS no formato
exato do banco de produção.

NADA aqui vem do banco real. Nomes são combinações de listas inventadas, CPFs
são gerados pelo algoritmo oficial (dígito verificador válido) a partir de um
contador, endereços são de ruas que não existem em Monte Alto, e todo texto de
andamento foi escrito para este arquivo. O gerador tem semente fixa: rodar de
novo devolve exatamente o mesmo arquivo.

    python3 cowork/gerar_amostra.py

A lista de colunas de cada tabela sai de cowork/dossie.json, que é o retrato do
banco — assim a amostra acompanha o esquema real sem ninguém copiar dado.
"""
import datetime, json, os, random, uuid

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "cowork/06-amostra-ficticia.json")
DOSSIE = json.load(open(os.path.join(RAIZ, "cowork/dossie.json"), encoding="utf8"))

R = random.Random(20260815)          # semente fixa: saída reproduzível
NS = uuid.UUID("11111111-2222-3333-4444-555555555555")   # namespace só da amostra
HOJE = datetime.date(2026, 8, 15)


def ident(*partes):
    return str(uuid.uuid5(NS, "|".join(str(p) for p in partes)))


def cpf_valido(semente):
    """CPF com dígito verificador correto, gerado por algoritmo — não é de
    ninguém: os nove primeiros dígitos vêm de um contador."""
    base = [int(d) for d in f"{semente:09d}"]
    for _ in range(2):
        peso = len(base) + 1
        soma = sum(d * (peso - i) for i, d in enumerate(base))
        dv = (soma * 10) % 11
        base.append(0 if dv == 10 else dv)
    return "".join(str(d) for d in base)


def dia(delta):
    return (HOJE + datetime.timedelta(days=delta)).isoformat()


def ts(delta, hora="12:00:00"):
    return f"{dia(delta)}T{hora}-03:00"


# ── gente inventada ───────────────────────────────────────────────────────
PRE = ["Aurélia", "Benedito", "Custódia", "Damião", "Eufrásia", "Firmino",
       "Gertrudes", "Higino", "Ivonete", "Joaquim", "Lindaura", "Marcelino",
       "Nazaré", "Osvaldino", "Perpétua", "Quintino", "Rosalina", "Sebastião",
       "Teodora", "Valdomiro"]
MEIO = ["de Assis", "das Dores", "do Amaral", "Pires", "Vilhena", "Quaresma",
        "Fagundes", "Sampaio", "Bittencourt", "Nogueira"]
FIM = ["Zaneti", "Marcolino", "Trindade", "Barcelos", "Peçanha", "Andrade",
       "Cordovil", "Estêvão", "Rebouças", "Vasconcelos"]
RUAS = ["Rua das Cotovias", "Travessa do Vento Sul", "Avenida dos Ipês Roxos",
        "Rua Sete de Abril", "Alameda das Cigarras", "Rua do Moinho Velho"]
BAIRROS = ["Jardim Aurora", "Vila das Palmeiras", "Centro", "Parque das Andorinhas"]
PROFS = ["lavrador", "costureira", "pedreiro", "diarista", "motorista",
         "auxiliar de produção", "cozinheira", "tratorista"]
CIVIL = ["solteiro", "casado", "uniao", "viuvo", "divorciado"]

BENEF = {
    "41": "Apos. por Idade", "42": "Apos. Tempo de Contribuição",
    "31": "Aux. Incapacidade Temporária", "32": "Apos. por Incapacidade Permanente",
    "21": "Pensão por Morte", "87": "BPC/LOAS", "36": "Aux. Acidente",
    "80": "Salário-Maternidade", "REV": "Revisão", "CNIS": "Acerto de CNIS",
}
LISTA_DA_FASE = {
    "escritorio": "🙋 Escritório", "inss": "🌻 INSS", "conselho": "🖥 Conselho de Recursos",
    "judicial": "👪 Judicial", "pagamento": "💵 Pagamentos", "encerrado": "🌻 INSS",
}

COLABS = [("P", "Paula Tercini Fictícia", "#2B5FC7", "admin", "adv"),
          ("A", "Aline Exemplo Garcez", "#1E6F50", "advogada", "adv"),
          ("M", "Mauro Modelo Amorim", "#B4530A", "advogado", "adv"),
          ("I", "Iara Amostra Ribeiro", "#5C53C9", "recepcao", "adm")]

TEXTOS = {
 "escritorio": ["Cliente compareceu para orientação inicial sobre o benefício.",
                "Ficou de trazer a certidão e o comprovante de residência.",
                "Documentação conferida; falta apenas o CNIS atualizado."],
 "inss": ["Requerimento protocolado no Meu INSS.",
          "Exigência aberta pelo INSS: pedido de documento complementar.",
          "Exigência cumprida e protocolada.",
          "Perícia médica agendada pelo INSS.",
          "Benefício concedido; aguardando carta de concessão."],
 "conselho": ["Recurso ordinário protocolado contra o indeferimento.",
              "Processo distribuído à Junta de Recursos.",
              "Incluído em pauta de julgamento.",
              "Recurso provido por unanimidade."],
 "judicial": ["Ação previdenciária distribuída.",
              "Contestação do INSS juntada aos autos.",
              "Perícia judicial designada.",
              "Sentença de procedência publicada."],
 "encerrado": ["Benefício implantado e honorários acertados com o cliente.",
               "Caso encerrado a pedido do cliente."],
}
ORIGENS = ["todo", "app", "pat", "crps", "pje"]


def colunas(tabela):
    return sorted(DOSSIE[tabela]["colunas"])


def linha(tabela, **valores):
    """Devolve a linha com TODAS as colunas da tabela real; o que não foi dado
    fica nulo (ou no padrão de lista/objeto vazio, como no banco)."""
    out = {}
    for c in colunas(tabela):
        if c in valores:
            out[c] = valores[c]
            continue
        tipo = DOSSIE[tabela]["colunas"][c]["tipo"]
        padrao = DOSSIE[tabela]["colunas"][c]["padrao"]
        if padrao == "[]":
            out[c] = []
        elif padrao == "{}":
            out[c] = {}
        elif tipo == "boolean" and padrao in ("false", "true"):
            out[c] = padrao == "true"
        else:
            out[c] = None
    return out


dados = {t: [] for t in ["colaboradores", "clientes", "casos", "andamentos",
                         "eventos", "tarefas", "pagamentos", "lembretes",
                         "credenciais", "vinculos", "atribuicoes"]}

for ini, nome, cor, papel, setor in COLABS:
    dados["colaboradores"].append(linha(
        "colaboradores", id=ident("colab", ini), inicial=ini, nome=nome, cor=cor,
        papel=papel, setor=setor, ativo=True, atende_zap=False, cargo=None, auth_id=None))

# ── o desenho da amostra: quem tem o quê ─────────────────────────────────
# 20 clientes: 3 sem caso nenhum (atendimento), 4 com dois casos, 2 com três,
# o resto com um. As fases cobrem escritório, INSS, conselho, judicial e
# encerrado; há exigência com prazo, perícia agendada, pagamentos, lembrete de
# aposentadoria futura e andamentos das cinco origens.
PLANO = [
    ["inss"], ["inss", "encerrado"], ["conselho"], ["judicial"],
    ["escritorio"], [], ["inss", "judicial"], ["encerrado"],
    ["inss", "conselho", "judicial"], [], ["judicial"], ["inss"],
    ["escritorio", "inss"], ["encerrado"], ["conselho"], [],
    ["inss", "encerrado", "judicial"], ["inss"], ["judicial"], ["inss"],
]

for i, fases in enumerate(PLANO):
    nome = f"{PRE[i]} {MEIO[i % len(MEIO)]} {FIM[i % len(FIM)]}"
    cid = ident("cliente", i)
    cpf = cpf_valido(100000001 + i * 7919)
    nasc = datetime.date(1948 + (i * 3) % 40, 1 + i % 12, 1 + (i * 5) % 27)
    tem_civil = i % 3 != 0                       # nem todo cadastro está completo
    fone = f"(16) 9{R.randint(1000,9999)}-{R.randint(1000,9999)}"
    dados["clientes"].append(linha(
        "clientes", id=cid, nome=nome, cpf=cpf,
        dn=nasc.strftime("%d%m%Y"), telefone=fone,
        telefones=[{"numero": fone, "obs": "principal", "zap": True}],
        criado_em=ts(-400 + i * 5),
        rg=f"{R.randint(10,49)}.{R.randint(100,999)}.{R.randint(100,999)}-{R.randint(0,9)}" if tem_civil else None,
        rg_orgao="SSP/SP" if tem_civil else None,
        sexo="F" if i % 2 == 0 else "M",
        estado_civil=CIVIL[i % len(CIVIL)] if tem_civil else None,
        profissao=PROFS[i % len(PROFS)] if tem_civil else None,
        logradouro=RUAS[i % len(RUAS)] if tem_civil else None,
        numero=str(100 + i * 13) if tem_civil else None,
        bairro=BAIRROS[i % len(BAIRROS)] if tem_civil else None,
        cidade="Monte Alto" if tem_civil else None,
        uf="SP" if tem_civil else None,
        cep=f"15910-{R.randint(100,999)}" if tem_civil else None,
        campos={}))

    if i % 5 == 0:
        dados["credenciais"].append(linha(
            "credenciais", id=ident("cred", i), cliente_id=cid, tipo="meu_inss",
            valor=f"senha-ficticia-{i:02d}", criado_em=ts(-380 + i)))

    if not fases:            # cliente em atendimento, sem caso (08.98/08.99)
        cli = dados["clientes"][-1]
        cli["campos"] = {
            "especie": "" if i == 5 else "Apos. por Idade",
            "atendimento": [
                {"em": ts(-9 + i), "quem": "I",
                 "texto": "Procurou o escritório para saber se já tem tempo de contribuição."},
                {"em": ts(-3 + i), "quem": "A",
                 "texto": "Orientada a trazer o CNIS e a certidão de casamento."}],
            "docs_pedidos": [{
                "em": ts(-3 + i), "quem": "A", "especie": "Apos. por Idade",
                "itens": [{"nome": "RG e CPF", "entregue": dia(-1)},
                          {"nome": "Comprovante de residência", "entregue": None},
                          {"nome": "CNIS atualizado", "entregue": None}]}]}
        continue

    for j, fase in enumerate(fases):
        kid = ident("caso", i, j)
        cod = list(BENEF)[(i + j) % len(BENEF)]
        ben = BENEF[cod]
        judicial = fase == "judicial"
        conselho = fase == "conselho"
        enc = fase == "encerrado"
        dados["casos"].append(linha(
            "casos", id=kid, cliente_id=cid, titulo=f"{nome} #{cpf}", beneficio=ben,
            especie=cod if cod.isdigit() else None, fase=fase,
            origem_lista=LISTA_DA_FASE[fase], todo_task_id=ident("todo", i, j),
            criado_em=ts(-300 + i * 7 + j * 30),
            nb=f"{R.randint(100,199)}.{R.randint(100,999)}.{R.randint(100,999)}-{R.randint(0,9)}"
               if fase in ("inss", "conselho", "encerrado") else None,
            der=dia(-260 + i * 5) if fase in ("inss", "conselho", "encerrado") else None,
            processo=(f"500{R.randint(1000,9999)}-{R.randint(10,99)}.2026.4.03.6136") if judicial else None,
            processos=([{"numero": f"500{R.randint(1000,9999)}-{R.randint(10,99)}.2026.4.03.6136",
                         "rotulo": "rito comum", "nosso": True, "acompanhar": True}] if judicial else []),
            classe_judicial="Procedimento Comum Cível" if judicial else None,
            ajuizado_em=dia(-120 + i) if judicial else None,
            orgao_judicial="1ª Vara Federal de Fictícia/SP" if judicial else None,
            crps_nups=[f"4433{R.randint(10000,99999)}2026{R.randint(10,99)}"] if conselho else [],
            crps=({"instancias": [{"nome": "1ª JR", "situacao": "em pauta",
                                   "pauta_em": dia(12)}]} if conselho else {}),
            protocolos=[str(R.randint(100000000, 999999999))] if fase != "escritorio" else [],
            prazo=dia(3 + i) if fase in ("escritorio", "inss") and i % 4 == 0 else None,
            exigencia_prazo=dia(11) if fase == "inss" and i % 6 == 0 else None,
            exigencia_descricao="Apresentar comprovante de atividade rural do período."
                                if fase == "inss" and i % 6 == 0 else None,
            situacao_inss="Em análise" if fase == "inss" else None,
            importante=(i % 7 == 0), urgente=(i % 11 == 0),
            resultado="deferido" if enc else None,
            encerrado_em=ts(-20 + i) if enc else None,
            encerrado_por=dados["colaboradores"][0]["id"] if enc else None,
            marcadores=[], arquivados={}, datajud=None, datajud_multi=None,
            parceria="Dra. Fictícia Parceira" if i % 9 == 0 else None))

        dados["atribuicoes"].append(linha(
            "atribuicoes", caso_id=kid,
            colaborador_id=dados["colaboradores"][(i + j) % len(COLABS)]["id"]))

        for n, txt in enumerate(TEXTOS[fase]):
            origem = "todo"
            if fase == "inss" and n >= 3:
                origem = "pat"
            elif conselho and n >= 2:
                origem = "crps"
            elif judicial and n >= 2:
                origem = "pje"
            elif n == len(TEXTOS[fase]) - 1 and i % 4 == 0:
                origem = "app"
            dados["andamentos"].append(linha(
                "andamentos", id=ident("and", i, j, n), caso_id=kid,
                autor_id=dados["colaboradores"][n % len(COLABS)]["id"] if origem in ("todo", "app") else None,
                criado_em=ts(-200 + i * 3 + j * 25 + n * 9), texto=txt,
                origem=origem, todo_sync=origem == "todo", publico=False,
                origem_id=f"exemplo:{i}-{j}-{n}" if origem in ("pat", "crps", "pje") else None))

        if fase in ("inss", "judicial") and i % 3 == 0:
            dados["eventos"].append(linha(
                "eventos", id=ident("ev", i, j), caso_id=kid,
                tipo="Perícia médica" if fase == "inss" else "Perícia judicial",
                data_hora=ts(9 + i % 20, "09:30:00"), status="agendada",
                local="APS Fictícia — Monte Alto/SP" if fase == "inss" else "Fórum Fictício",
                obs=None))

        for t, feito in [("📄 CNIS atualizado", True),
                         ("📄 Comprovante de residência", i % 2 == 0),
                         ("Preparar procuração e contrato", False)]:
            dados["tarefas"].append(linha(
                "tarefas", id=ident("tf", i, j, t), caso_id=kid, titulo=t,
                concluida=feito, concluida_em=ts(-30 + i) if feito else None,
                criado_em=ts(-100 + i), prazo=dia(5 + i % 9) if not feito and i % 5 == 0 else None))

        if enc or fase == "pagamento":
            for p in range(3):
                pago = p == 0
                dados["pagamentos"].append(linha(
                    "pagamentos", id=ident("pg", i, j, p), cliente_id=cid, caso_id=kid,
                    descricao=f"{p+1}ª parcela dos honorários",
                    valor=round(800 + i * 17.5 + p * 100, 2),
                    status="recebido" if pago else "aberto",
                    pago_em=dia(-15 + p * 30) if pago else None,
                    vencimento=None if pago else dia(15 + p * 30),
                    conferencias=[], todo_item_id=ident("item", i, j, p)))

# lembretes de aposentadoria futura, no formato que a 08.90 gravou
for i in (2, 7, 13, 19):
    cli = dados["clientes"][i]
    dados["lembretes"].append(linha(
        "lembretes", id=ident("lemb", i), cliente_id=cli["id"],
        tipo="aposentadoria_futura", titulo="Apos. por Idade",
        detalhes={"todo_task_id": ident("todo-lemb", i), "beneficio": "Apos. por Idade",
                  "anotacoes": [
                      {"data": dia(-120), "inicial": "A",
                       "texto": "Faltam 14 meses de contribuição para a idade mínima."},
                      {"data": dia(-40), "inicial": "P",
                       "texto": "Cliente avisada; retomar contato perto da data."}]},
        proximo_em=dia(60 + i * 10), intervalo_meses=None, ativo=True,
        criado_em=ts(-120)))

# um lembrete de contribuição com cronograma (o caminho da 08.98)
dados["lembretes"].append(linha(
    "lembretes", id=ident("lemb-gps"), cliente_id=dados["clientes"][5]["id"],
    tipo="contribuicao", titulo="Pagamento ao INSS — 12 parcela(s) a partir de 09/2026",
    detalhes={"codigo": "1163", "valor": "182,68", "dia": 15,
              "cronograma": [{"comp": f"{m:02d}/2026" if m >= 9 else f"{m:02d}/2027",
                              "vence": dia(30 * k + 20), "valor": "182,68", "codigo": "1163"}
                             for k, m in enumerate([9, 10, 11, 12, 1, 2])]},
    intervalo_meses=1, proximo_em=dia(20), ativo=True, criado_em=ts(-5)))

# vínculos entre clientes (parentes)
for a, b, rel in [(0, 1, "esposa"), (7, 8, "filho"), (12, 13, "indicação")]:
    dados["vinculos"].append(linha(
        "vinculos", id=ident("vin", a, b), cliente_id=dados["clientes"][a]["id"],
        ligado_a=dados["clientes"][b]["id"], relacao=rel))

saida = {
    "_aviso": "AMOSTRA FICTÍCIA. Nenhum dado real de cliente. CPFs gerados por "
              "algoritmo a partir de um contador; nomes, endereços e textos "
              "inventados para este arquivo. Gerado por cowork/gerar_amostra.py.",
    "_gerado_em": HOJE.isoformat(),
    "_ordem_de_carga": ["colaboradores", "clientes", "credenciais", "vinculos",
                        "casos", "atribuicoes", "andamentos", "eventos",
                        "tarefas", "pagamentos", "lembretes"],
    **dados,
}
open(SAIDA, "w", encoding="utf8").write(json.dumps(saida, ensure_ascii=False, indent=1))
print(f"{SAIDA}")
for t in saida["_ordem_de_carga"]:
    print(f"  {t}: {len(saida[t])}")
