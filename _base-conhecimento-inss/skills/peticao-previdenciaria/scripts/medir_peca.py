#!/usr/bin/env python3
"""Medidor mecânico de peça previdenciária. Onda 140 (16/09/2026).

Lê a peça em Markdown e devolve PASSA ou FALHA com a lista exata do que
está fora do padrão de escrita do escritório. A skill NÃO entrega peça
que falhe aqui. Ela reescreve e mede de novo.

Calibração empírica de 16/09/2026 no papel do escritório (Bookman Old
Style 12pt, A4, margens 1,5/2/2,75/2 cm, recuo 2 cm, espaçamento 1,5),
medida com soffice e pdftotext: UMA LINHA TEM CERCA DE DEZ PALAVRAS.
Três linhas são 30 palavras, quatro são 40.

Uso:  python3 medir_peca.py peca.md [--tipo inicial|inominado|laudo|crps|embargos|comum|memorial|ms]
Saída: relatório no stdout, código 0 se PASSA e 1 se FALHA.
"""
import re, sys, argparse

PAL_LINHA = 10                       # calibrado
PARAG_MIN, PARAG_MAX = 20, 45        # 2 a 4 linhas. 45 porque a 1a linha é recuada e o exemplo canônico do titular tem 45
FRASE_CURTA = 9                      # frase com menos de 9 palavras
SEQ_CURTAS = 3                       # 3 seguidas = truncamento
PAGINAS = {'inicial':7,'inominado':4,'laudo':3,'crps':3,'embargos':2,'comum':2,'memorial':2,'ms':6}
PAL_PAGINA = 300                     # ~30 linhas úteis x 10 palavras, descontando títulos

ADJ_VEDADOS = r'\b(manifestamente|flagrante(?:mente)?|absurd[oa]|teratol[óo]gic[oa]|basilares?|inequ[íi]voc[oa](?:mente)?|induvidos[oa](?:mente)?|escancarad[oa]|gritante|inadmiss[íi]vel|descabid[oa]|esdr[úu]xul[oa]|desesperador[a]?|abandonad[oa] à pr[óo]pria sorte|cristalin[oa]|patente(?:mente)?|not[óo]ri[oa](?:mente)?|evidentemente|obviamente|claramente)\b'
FORMULAS_VAZIAS = r'(?i)\b(é cediço|é de se ver|como se sabe|insta salientar|cumpre ressaltar|mister se faz|data venia|com o devido respeito|resta claro|resta evidente|não há que se falar|à luz dos mais comezinhos|os mais basilares|princípios de justiça)\b'
ART_RX = r'\b(art(?:igo)?s?\.?\s*\d+[º°]?(?:[-\.]?[A-Z])?)'
EXPLICA_RX = r'(?i)(porque|pois|uma vez que|na medida em que|de modo que|razão pela qual|o que significa|isto é|ou seja|aplica-se|incide|toma como referência|exige|prevê|estabelece|assegura|garante|dispõe|determina)'

def paragrafos(md):
    """Divide em blocos, ignorando títulos, tabelas, citações recuadas e linhas de estrutura."""
    out=[]; sec='(sem seção)'
    for blk in re.split(r'\n\s*\n', md):
        b=blk.strip()
        if not b: continue
        if b.startswith('#'):
            sec=re.sub(r'^#+\s*','',b.split('\n')[0]); continue
        if b.startswith('|') or b.startswith('>') or b.startswith('```') or b.startswith('---') or b.startswith('[') or b.startswith('@'): continue
        if re.match(r'^(\*\*)?[A-ZÀ-Ú][^a-z]{3,}(\*\*)?\.?$', b.split('\n')[0]) and len(b.split())<8: continue  # linha de rótulo
        out.append((sec, ' '.join(b.split())))
    return out

def frases(p):
    return [f.strip() for f in re.split(r'(?<=[\.\!\?;])\s+', p) if f.strip()]

def medir(md, tipo):
    achados=[]; ps=paragrafos(md)
    total=sum(len(p.split()) for _,p in ps)
    # 1. paragrafo fora da faixa
    for sec,p in ps:
        n=len(p.split())
        qualificacao = bool(re.search(r'(?i)\bCPF\b|vem,? respeitosamente|perante V\. ?Exa', p))
        if n>PARAG_MAX and qualificacao:
            continue   # qualificação civil é parágrafo único por padrão do escritório
        if n>PARAG_MAX:
            achados.append(('IMPORTANTE', f'Parágrafo com {n} palavras (~{-(-n//PAL_LINHA)} linhas) em "{sec}". Teto 40. Dividir em dois ou cortar repetição.', p[:110]))
        elif n<PARAG_MIN and not re.match(r'(?i)^(requer|pede|nestes termos|termos em que|pelo exposto|diante do exposto|ante o exposto)', p):
            achados.append(('MENOR', f'Parágrafo com {n} palavras em "{sec}". Abaixo de 2 linhas, provável frase-decreto ou ideia não desenvolvida.', p[:110]))
    # 2. truncamento, sequencia de frases curtas
    for sec,p in ps:
        fs=frases(p); seq=0
        for f in fs:
            seq = seq+1 if len(f.split())<FRASE_CURTA else 0
            if seq>=SEQ_CURTAS:
                achados.append(('IMPORTANTE', f'Texto truncado em "{sec}", {SEQ_CURTAS} ou mais frases seguidas com menos de {FRASE_CURTA} palavras. Encadear por conectivo ou subordinação.', p[:110])); break
    # 3. adjetivos e formulas
    for sec,p in ps:
        for m in re.finditer(ADJ_VEDADOS, p, re.I):
            achados.append(('IMPORTANTE', f'Adjetivo de intensidade "{m.group(0)}" em "{sec}". Trocar pela descrição precisa do erro e da consequência.', p[:110]))
        for m in re.finditer(FORMULAS_VAZIAS, p):
            achados.append(('MENOR', f'Fórmula vazia "{m.group(0)}" em "{sec}". Cortar.', p[:110]))
    # 4. artigos sem explicacao, por secao
    por_sec={}
    for sec,p in ps:
        if re.search(r'(?i)pedido', sec): continue   # no pedido o fundamento é citado por natureza
        arts=re.findall(ART_RX, p)
        if arts and not re.search(EXPLICA_RX, p):
            por_sec.setdefault(sec,[]).extend(arts)
    for sec,arts in por_sec.items():
        sev='IMPORTANTE' if len(arts)>=5 else 'MENOR'
        achados.append((sev, f'{len(arts)} dispositivo(s) citado(s) sem frase que explique a aplicação ao caso em "{sec}". {", ".join(dict.fromkeys(arts))}', ''))
    # 5. dois-pontos logicos fora de citacao
    for sec,p in ps:
        if re.search(r'[a-zà-ú\)]:\s+[a-zà-úA-Z]', p) and not p.startswith('"'):
            achados.append(('MENOR', f'Dois-pontos introduzindo complemento em "{sec}". Trocar por conectivo ou subordinação, sem picar o período.', p[:110]))
    # 6. "conforme anexo" sem ID
    for sec,p in ps:
        if re.search(r'(?i)(conforme|documento[s]?)\s+(em\s+)?anexo', p) and not re.search(r'\bID\s*\d', p):
            achados.append(('IMPORTANTE', f'Referência a documento sem ID em "{sec}". No PJe, todo documento entra por ID.', p[:110]))
    # 7. orcamento
    teto=PAGINAS.get(tipo); pag=total/PAL_PAGINA
    if teto:
        if pag>teto*1.3: achados.append(('CRÍTICO', f'Extensão estimada de {pag:.1f} páginas contra orçamento de {teto}. Acima de 30%.', ''))
        elif pag>teto: achados.append(('IMPORTANTE', f'Extensão estimada de {pag:.1f} páginas contra orçamento de {teto}.', ''))
    return achados, ps, total, pag

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('arquivo'); ap.add_argument('--tipo',default='inicial')
    a=ap.parse_args(); md=open(a.arquivo,encoding='utf-8').read()
    achados, ps, total, pag = medir(md, a.tipo)
    ordem={'CRÍTICO':0,'IMPORTANTE':1,'MENOR':2}; achados.sort(key=lambda x: ordem[x[0]])
    grave=[x for x in achados if x[0] in ('CRÍTICO','IMPORTANTE')]
    print(f'Peça medida. {len(ps)} parágrafos, {total} palavras, {pag:.1f} páginas estimadas (tipo {a.tipo}, orçamento {PAGINAS.get(a.tipo,"?")}).')
    med=sorted(len(p.split()) for _,p in ps); 
    if med: print(f'Parágrafo mediano {med[len(med)//2]} palavras, maior {med[-1]}, menor {med[0]}.')
    print()
    if not achados: print('PASSA. Nenhum achado.'); sys.exit(0)
    for sev,msg,trecho in achados:
        print(f'[{sev}] {msg}'); 
        if trecho: print(f'    "{trecho}…"')
    print(); print(f'{"FALHA" if grave else "PASSA COM RESSALVAS"}. {len(grave)} achado(s) grave(s), {len(achados)-len(grave)} menor(es).')
    sys.exit(1 if grave else 0)

if __name__=='__main__': main()
