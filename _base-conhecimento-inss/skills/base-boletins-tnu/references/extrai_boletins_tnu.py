import re, json, glob, os, subprocess
BASE="/sessions/fervent-bold-lovelace/mnt/Boletins TNU"
GAT=r'(?:fixou a seguinte tese|firmou a seguinte tese|passou a ter a seguinte reda[çc][ãa]o|fixou[- ]se a seguinte tese|aprovou a seguinte s[úu]mula)'
def texto(p, ate=8):
    r=subprocess.run(['pdftotext','-f','1','-l',str(ate),p,'-'],capture_output=True,timeout=120)
    return r.stdout.decode('utf-8','ignore')
out=[]
for p in sorted(glob.glob(os.path.join(BASE,"*.pdf"))):
    nome=os.path.basename(p); t=texto(p)
    if not t.strip(): continue
    tt=re.sub(r'[ \t]+',' ',t)
    m=re.search(r'(\d+)', nome.replace('BoletimTNU','').replace('_',' ').replace('-',' ').replace('.pdf',''))
    num=m.group(1) if m else ('EdEspecial' if 'Especial' in nome else '?')
    md=re.search(r'[Ss]ess[ãa]o[^\n]{0,40}?(\d{2}/\d{2}/\d{4})', tt) or re.search(r'(\d{2}/\d{2}/\d{4})', tt)
    data=md.group(1) if md else None
    temas=[]
    for m2 in re.finditer(r'TEMA\s*N?\.?\s*(\d+)\s*[–\-—]?\s*(PUIL|PEDILEF|Processo)?\s*n?\.?\s*([\d\.\-/A-Za-z]{10,})?', tt):
        temas.append({"tema":m2.group(1),"classe":m2.group(2),"processo":m2.group(3)})
    # dedup temas mantendo ordem
    vis=set(); tl=[]
    for x in temas:
        if x['tema'] not in vis: vis.add(x['tema']); tl.append(x)
    teses=[]
    for m3 in re.finditer(GAT+r'\s*[:.]?\s*(.{40,900}?)(?=(?:Apreciando|INTEIRO TEOR|Obs\.|Tese anterior|\n\s*\d{1,2}\s*\n|Esta publica|$))', tt, re.S|re.I):
        teses.append(re.sub(r'\s+',' ',m3.group(1)).strip())
    # formato B (tese inline)
    for m4 in re.finditer(r'REPRESENTATIVO DE CONTROV[ÉE]RSIA\s*\(TEMA\s*(\d+)\)\s*[–\-—]\s*(.{40,800}?)(?:INTEIRO TEOR|\n\s*\d+\s*\n|$)', tt, re.S):
        teses.append("[TEMA "+m4.group(1)+"] "+re.sub(r'\s+',' ',m4.group(2)).strip())
    pareamento = "SEGURO" if (len(tl)==1 and len(teses)==1) else ("MULTIPLO" if teses else "SEM_TESE_CAPTURADA")
    out.append({"arquivo":nome,"boletim":num,"data_sessao":data,"temas":tl,"teses":teses,"pareamento":pareamento})
json.dump(out, open('/tmp/tnu_final.json','w'), ensure_ascii=False, indent=1)
tot_t=sum(len(b['temas']) for b in out); tot_s=sum(len(b['teses']) for b in out)
seg=sum(1 for b in out if b['pareamento']=="SEGURO")
print("boletins:",len(out),"| temas:",tot_t,"| teses capturadas:",tot_s,"| pareamento seguro:",seg)
temas=sorted({int(x['tema']) for b in out for x in b['temas'] if x['tema'].isdigit()})
print("faixa de temas:",min(temas),"a",max(temas),"| distintos:",len(temas))
