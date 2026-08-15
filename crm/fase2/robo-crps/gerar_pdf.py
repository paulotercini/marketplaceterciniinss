#!/usr/bin/env python3
"""Gera o passo a passo dos recursos (CRPS) em PDF, para imprimir e deixar
ao lado do computador."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, KeepTogether)

AZUL = colors.HexColor("#2B5FC7")
AZUL_ESC = colors.HexColor("#234E9E")
CINZA = colors.HexColor("#5B6069")
BORDA = colors.HexColor("#D9DCE1")
FUNDO = colors.HexColor("#F2F4F8")
LARANJA = colors.HexColor("#B4530A")
VERDE = colors.HexColor("#1E6F50")

titulo = ParagraphStyle("titulo", fontName="Helvetica-Bold", fontSize=19,
                        textColor=AZUL_ESC, leading=23, spaceAfter=2)
sub = ParagraphStyle("sub", fontName="Helvetica", fontSize=10, textColor=CINZA,
                     leading=14, spaceAfter=14)
h2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13,
                    textColor=AZUL_ESC, leading=17, spaceBefore=14, spaceAfter=6)
corpo = ParagraphStyle("corpo", fontName="Helvetica", fontSize=10.2,
                       textColor=colors.HexColor("#25272B"), leading=15,
                       alignment=TA_LEFT, spaceAfter=5)
passo = ParagraphStyle("passo", parent=corpo, leftIndent=8)
cod = ParagraphStyle("cod", fontName="Courier-Bold", fontSize=10.5,
                     textColor=AZUL_ESC, leading=15, leftIndent=10,
                     spaceBefore=4, spaceAfter=6)
saida = ParagraphStyle("saida", fontName="Courier", fontSize=8.6,
                       textColor=CINZA, leading=12, leftIndent=10,
                       spaceBefore=2, spaceAfter=6)
nota = ParagraphStyle("nota", fontName="Helvetica", fontSize=9.4,
                      textColor=CINZA, leading=13.5, spaceAfter=4)


def caixa(fluxo, cor_borda=BORDA, cor_fundo=FUNDO):
    t = Table([[fluxo]], colWidths=[168 * mm])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, cor_borda),
        ("BACKGROUND", (0, 0), (-1, -1), cor_fundo),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def numero(n, texto):
    """um passo numerado, com o número num quadradinho azul"""
    bolha = Table([[Paragraph(f'<font color="white"><b>{n}</b></font>',
                              ParagraphStyle("n", fontName="Helvetica-Bold",
                                             fontSize=12, alignment=1))]],
                  colWidths=[8 * mm], rowHeights=[8 * mm])
    bolha.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), AZUL),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    linha = Table([[bolha, Paragraph(texto, ParagraphStyle(
        "t", fontName="Helvetica-Bold", fontSize=12.5, textColor=AZUL_ESC,
        leading=16))]], colWidths=[11 * mm, 157 * mm])
    linha.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
    ]))
    return linha


def rodape(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDA)
    canvas.setLineWidth(0.5)
    canvas.line(21 * mm, 15 * mm, 189 * mm, 15 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(CINZA)
    canvas.drawString(21 * mm, 10 * mm,
                      "CRM Tercini · Recursos (CRPS) · versão 08.10")
    canvas.drawRightString(189 * mm, 10 * mm, f"página {doc.page}")
    canvas.restoreState()


def main(destino):
    doc = SimpleDocTemplate(destino, pagesize=A4,
                            leftMargin=21 * mm, rightMargin=21 * mm,
                            topMargin=18 * mm, bottomMargin=20 * mm,
                            title="Recursos (CRPS) — passo a passo",
                            author="CRM Tercini")
    s = []
    s.append(Paragraph("Recursos do INSS (CRPS)", titulo))
    s.append(Paragraph("Como atualizar os andamentos dos recursos no CRM — "
                       "e o que fazer quando entra um recurso novo.", sub))

    # ── antes de começar ────────────────────────────────────────────────
    s.append(Paragraph("Antes de começar (só na primeira vez)", h2))
    s.append(caixa([
        Paragraph("Substitua os arquivos que recebeu pelo chat:", corpo),
        Paragraph("• <b>app.html</b> — onde você abre o CRM<br/>"
                  "• Na pasta <font face='Courier'>C:\\Users\\VAIO\\robo-crps</font>: "
                  "<b>traduzir.js</b>, <b>preparar.js</b> e <b>ingerir.js</b> "
                  "(os três juntos — um depende do outro)", corpo),
    ]))
    s.append(Spacer(1, 4))

    # ── passo 1 ─────────────────────────────────────────────────────────
    s.append(numero(1, "Preparar a lista"))
    s.append(Paragraph("Abra o <b>Prompt de Comando</b> (menu Iniciar → digite "
                       "<font face='Courier'>cmd</font>) e rode:", passo))
    s.append(Paragraph("cd C:\\Users\\VAIO\\robo-crps<br/>node preparar.js", cod))
    s.append(Paragraph("Ele lê no banco os recursos cadastrados e cria o arquivo "
                       "<b>coletar.txt</b> na pasta. Deve dizer algo como "
                       "<i>“Pronto: 47 recurso(s) para coletar”</i>.", passo))

    # ── passo 2 ─────────────────────────────────────────────────────────
    s.append(numero(2, "Coletar no navegador"))
    s.append(Paragraph(
        "a) No <b>Comet</b>, abra <font face='Courier'>consultaprocessos.inss.gov.br</font> "
        "e <b>faça login</b> no gov.br.<br/>"
        "b) Aperte <b>F12</b> e clique na aba <b>Console</b>. Se pedir, digite "
        "<font face='Courier'>allow pasting</font> e Enter.<br/>"
        "c) Abra o <b>coletar.txt</b>, selecione tudo (<b>Ctrl+A</b>) e copie (<b>Ctrl+C</b>).<br/>"
        "d) Volte ao Console, cole (<b>Ctrl+V</b>) e aperte <b>Enter</b>.", passo))
    s.append(Paragraph("Agora é só esperar — leva de 5 a 8 minutos. Você vai ver "
                       "passando no Console:", passo))
    s.append(Paragraph(
        "1/47&nbsp;&nbsp;44236576247202490&nbsp;&nbsp;HTTP 200<br/>"
        "2/47&nbsp;&nbsp;44235612626202207&nbsp;&nbsp;HTTP 200<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[PDF] ACORDAO_3325-2026.pdf (77 KB)", saida))
    s.append(Paragraph("A linha com <b>[PDF]</b> é um acórdão sendo guardado. "
                       "Ao final ele avisa <i>“PRONTO!”</i> e <b>baixa sozinho</b> o "
                       "arquivo <b>crps_coletado.json</b>.", passo))

    # ── passo 3 ─────────────────────────────────────────────────────────
    s.append(numero(3, "Gravar no CRM"))
    s.append(Paragraph("a) Vá em <b>Downloads</b>, pegue o <b>crps_coletado.json</b> "
                       "e <b>mova para</b> a pasta "
                       "<font face='Courier'>C:\\Users\\VAIO\\robo-crps</font>.<br/>"
                       "b) No Prompt de Comando:", passo))
    s.append(Paragraph("node ingerir.js crps_coletado.json", cod))
    s.append(Paragraph("Deve terminar assim:", passo))
    s.append(Paragraph("[ok] 42 caso(s) atualizados, N andamento(s) novo(s), "
                       "32 decisao(oes) guardada(s) no CRM, 0 sem caso.", saida))

    # ── passo 4 ─────────────────────────────────────────────────────────
    s.append(numero(4, "Conferir"))
    s.append(Paragraph(
        "Abra o CRM e aperte <b>Ctrl+Shift+R</b>. Confira no topo se aparece "
        "<b>versão 08.10</b>. Entre num cliente com recurso e vá na aba "
        "<b>Recurso (CRPS)</b>: o histórico aparece traduzido, com <b>negrito só "
        "nos acórdãos e decisões monocráticas</b>, e ao lado deles o botão "
        "<b>“abrir acórdão”</b>.", passo))

    s.append(Spacer(1, 10))
    s.append(caixa([
        Paragraph("<b>Para atualizar depois</b> (uma vez por dia, ou quando quiser): "
                  "repita os passos 1, 2 e 3. Da segunda vez em diante é bem mais "
                  "rápido — os acórdãos já guardados não são baixados de novo, e o "
                  "CRM só escreve na ficha o que <b>mudou</b>.", corpo)],
        cor_borda=colors.HexColor("#BFDCC2"), cor_fundo=colors.HexColor("#EDF6EE")))

    # ── página 2: recurso novo ──────────────────────────────────────────
    s.append(Spacer(1, 16))
    s.append(Paragraph("E quando entra um recurso NOVO?", h2))
    s.append(caixa([
        Paragraph("<b>A leitura não é automática.</b> O sistema só consulta os "
                  "recursos cujo número está cadastrado no caso. Um recurso novo "
                  "não aparece sozinho — alguém precisa colar o número "
                  "<b>uma vez</b>. Depois disso, ele entra em todas as coletas "
                  "seguintes automaticamente.", corpo)],
        cor_borda=colors.HexColor("#E9B44C"), cor_fundo=colors.HexColor("#FFF8E7")))
    s.append(Spacer(1, 8))
    s.append(Paragraph("<b>Como cadastrar (leva 20 segundos):</b>", corpo))
    s.append(Paragraph(
        "1. No e-Recursos, abra o processo do cliente e <b>copie o número da barra "
        "de endereço</b> — é a parte final da URL:<br/>"
        "<font face='Courier' size='8.5'>consultaprocessos.inss.gov.br/e/p/"
        "<b>44233139765202537</b></font><br/>"
        "2. No CRM, abra a ficha do cliente e escolha o processo certo no menu de cima.<br/>"
        "3. Vá na aba <b>Recurso (CRPS)</b>.<br/>"
        "4. Cole o número no campo <b>“+ número do recurso”</b> e clique em "
        "<b>adicionar</b>.", passo))
    s.append(Spacer(1, 6))
    s.append(Paragraph(
        "Pronto. Na próxima coleta (passos 1 a 3) esse recurso é consultado junto "
        "com os outros, o histórico entra na ficha e o acórdão passa a ser guardado.", corpo))
    s.append(Spacer(1, 8))
    s.append(caixa([
        Paragraph("<b>Um caso pode ter mais de um recurso.</b> Embargos e recurso "
                  "especial recebem números novos. É só ir acrescentando: o campo "
                  "aceita vários, e cada um aparece com o seu próprio histórico. "
                  "Adicionar um <b>não apaga</b> os anteriores.", corpo)]))

    # ── o que pode aparecer ─────────────────────────────────────────────
    s.append(Paragraph("Se algo aparecer no meio do caminho", h2))
    linhas = [
        ["O que aparece", "O que significa"],
        ["HTTP 403", "Você não é o procurador cadastrado nesse recurso. "
                     "O coletor pula e segue — é normal."],
        ["[!] nao consegui baixar", "Aquele PDF falhou. O andamento entra igual, "
                                    "só sem a cópia; tenta de novo na próxima coleta."],
        ["Autenticacao: nenhuma deu 200", "A sessão do gov.br caiu. Recarregue a "
                                          "página logada e cole o código de novo."],
        ["“não achei o caso no CRM”", "O recurso foi coletado, mas o número não "
                                      "está vinculado a nenhum caso. Cadastre "
                                      "como explicado acima."],
    ]
    dados = [[Paragraph(f"<font face='Courier' size='8.5'>{a}</font>" if i else f"<b>{a}</b>", nota),
              Paragraph(f"<b>{b}</b>" if not i else b, nota)]
             for i, (a, b) in enumerate(linhas)]
    tab = Table(dados, colWidths=[52 * mm, 116 * mm])
    tab.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, BORDA),
        ("BACKGROUND", (0, 0), (-1, 0), FUNDO),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    s.append(tab)

    s.append(Spacer(1, 12))
    s.append(Paragraph(
        "<b>Por que não dá para o robô fazer tudo sozinho:</b> o e-Recursos bloqueia "
        "acesso automatizado de fora — trava a conexão e recusa o login. Só um "
        "navegador de verdade, com você logado, passa. Por isso a coleta roda no "
        "seu navegador e só o resultado vem para o CRM.", nota))

    doc.build(s, onFirstPage=rodape, onLaterPages=rodape)
    print("gerado:", destino)


if __name__ == "__main__":
    import sys
    main(sys.argv[1] if len(sys.argv) > 1 else "recursos_crps.pdf")
