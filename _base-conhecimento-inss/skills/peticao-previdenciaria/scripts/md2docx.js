#!/usr/bin/env node
/* Conversor determinístico Markdown -> .docx no padrão visual do escritório.
   Onda 140 (16/09/2026). O modelo redige a peça em Markdown puro e este
   script cuida de TODA a mecânica. O modelo nunca mais escreve docx-js.

   Gramática aceita (linhas):
     @endereco: TEXTO           -> endereçamento, negrito, caixa alta, sem recuo
     @processo: TEXTO           -> linha do processo, negrito, sem recuo
     ## 1. TÍTULO               -> título de seção em tabela preta
     ### 1.1. SUBTÍTULO         -> subtítulo em tabela preta
     > texto                    -> citação recuada 4 cm, itálico
     | a | b |                  -> tabela (10pt, bordas, primeira linha em negrito)
     @fecho                     -> "Nestes termos, pede deferimento." + local/data + assinatura
     texto corrido              -> parágrafo justificado, Bookman 12, 1,5, recuo 2 cm (ou 4 cm com --crps)
   Inline: **negrito**, *itálico*.

   Uso: node md2docx.js peca.md saida.docx --logo /caminho/logo.PNG [--crps]
*/
const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,AlignmentType,WidthType,BorderStyle,ShadingType,Header,Footer,VerticalAlign}=require('docx');

const [,,inFile,outFile,...rest]=process.argv;
if(!inFile||!outFile){console.error('uso: node md2docx.js peca.md saida.docx --logo LOGO [--crps]');process.exit(2);}
const logo=rest.includes('--logo')?rest[rest.indexOf('--logo')+1]:null;
const crps=rest.includes('--crps');
const RECUO=crps?2268:1134;
const F='Bookman Old Style', SZ=24, LARG=9214;
const NIL={style:BorderStyle.NIL,size:0,color:'auto'};
const noBorders={top:NIL,bottom:NIL,left:NIL,right:NIL,insideHorizontal:NIL,insideVertical:NIL};
const SP={before:240,after:240,line:360,lineRule:'auto'};

function runs(text,base={}){ // **negrito** e *itálico*
  const out=[];const rx=/(\*\*[^*]+\*\*|\*[^*]+\*)/g;let last=0,m;
  while((m=rx.exec(text))){ if(m.index>last)out.push(new TextRun({text:text.slice(last,m.index),font:F,size:SZ,...base}));
    const t=m[0]; if(t.startsWith('**'))out.push(new TextRun({text:t.slice(2,-2),font:F,size:SZ,bold:true,...base}));
    else out.push(new TextRun({text:t.slice(1,-1),font:F,size:SZ,italics:true,...base})); last=rx.lastIndex;}
  if(last<text.length)out.push(new TextRun({text:text.slice(last),font:F,size:SZ,...base}));
  return out;}
const P=(text,o={})=>new Paragraph({alignment:o.align||AlignmentType.JUSTIFIED,indent:o.noIndent?undefined:{firstLine:o.left?0:RECUO,left:o.left||0},spacing:o.spacing||SP,children:runs(text,o.base||{})});
function titulo(text){
  return new Table({width:{size:LARG,type:WidthType.DXA},columnWidths:[LARG],borders:noBorders,shading:{type:ShadingType.CLEAR,color:'auto',fill:'000000'},
    rows:[new TableRow({children:[new TableCell({width:{size:LARG,type:WidthType.DXA},shading:{type:ShadingType.CLEAR,color:'auto',fill:'000000'},margins:{top:80,bottom:80,left:120,right:120},borders:noBorders,
      children:[new Paragraph({alignment:AlignmentType.JUSTIFIED,spacing:{after:0,line:240,lineRule:'auto'},children:[new TextRun({text,font:F,size:SZ,bold:true,color:'FFFFFF'})]})]})]})]});}
function tabela(linhas){
  const cells=linhas.filter(l=>!/^\|\s*-/.test(l)).map(l=>l.replace(/^\||\|$/g,'').split('|').map(c=>c.trim()));
  const ncol=Math.max(...cells.map(r=>r.length)); const w=Math.floor(LARG/ncol);
  const B={style:BorderStyle.SINGLE,size:4,color:'000000'}; const bd={top:B,bottom:B,left:B,right:B};
  return new Table({width:{size:LARG,type:WidthType.DXA},columnWidths:Array(ncol).fill(w),
    rows:cells.map((r,i)=>new TableRow({children:Array.from({length:ncol},(_,j)=>new TableCell({width:{size:w,type:WidthType.DXA},borders:bd,margins:{top:40,bottom:40,left:80,right:80},verticalAlign:VerticalAlign.CENTER,
      children:[new Paragraph({spacing:{before:0,after:0,line:240,lineRule:'auto'},children:runs(r[j]||'',{size:20,bold:j===0})})]}))}))});}
function fecho(){
  const meses=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const d=new Date(); const data=`Monte Alto – SP, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}.`;
  return [P('Nestes termos, pede deferimento.',{noIndent:true}),P(data,{noIndent:true}),new Paragraph({spacing:{before:480,after:0}}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:0,line:240},children:[new TextRun({text:'PAULO ROBERTO TERCINI FILHO',font:F,size:SZ,bold:true})]}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:0,line:240},children:[new TextRun({text:'OAB/SP 331.110',font:F,size:SZ,bold:true})]})];}

// --- parse ---
const md=fs.readFileSync(inFile,'utf8').replace(/\r/g,'');
const blocos=md.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
const children=[];
for(const b of blocos){
  if(b.startsWith('@endereco:')){children.push(P(b.slice(10).trim().toUpperCase(),{noIndent:true,base:{bold:true}}));continue;}
  if(b.startsWith('@processo:')){children.push(P(b.slice(10).trim(),{noIndent:true,base:{bold:true}}));continue;}
  if(b==='@fecho'){children.push(...fecho());continue;}
  if(/^##+ /.test(b)){children.push(new Paragraph({spacing:{before:0,after:0},children:[]}),titulo(b.replace(/^#+\s*/,'').toUpperCase()));continue;}
  if(b.startsWith('|')){children.push(tabela(b.split('\n')),new Paragraph({spacing:{before:0,after:0},children:[]}));continue;}
  if(b.startsWith('>')){children.push(P(b.split('\n').map(l=>l.replace(/^>\s?/,'')).join(' '),{left:2268,base:{italics:true}}));continue;}
  if(/^#\s/.test(b)){children.push(P(b.replace(/^#\s*/,'').toUpperCase(),{noIndent:true,align:AlignmentType.CENTER,base:{bold:true}}));continue;}
  children.push(P(b.split('\n').join(' ')));
}

// --- header / footer ---
const A=(text,o={})=>new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:0,after:0,line:o.line||240,lineRule:o.exact?'exact':'auto'},children:[new TextRun({text,font:o.font||'Arial Unicode MS',size:o.size||SZ,bold:!!o.bold})]});
const logoCell=logo&&fs.existsSync(logo)?[new Paragraph({alignment:AlignmentType.RIGHT,spacing:{before:0,after:0},children:[new ImageRun({data:fs.readFileSync(logo),transformation:{width:83,height:75},type:'png'})]})]:[new Paragraph({children:[]})];
const headerTable=new Table({width:{size:9288,type:WidthType.DXA},columnWidths:[1668,7620],borders:noBorders,rows:[new TableRow({height:{value:993,rule:'atLeast'},children:[
  new TableCell({width:{size:1668,type:WidthType.DXA},borders:noBorders,children:logoCell}),
  new TableCell({width:{size:7620,type:WidthType.DXA},borders:noBorders,verticalAlign:VerticalAlign.CENTER,children:[A(' ',{font:'Bell MT',size:16}),A('ADVOCACIA PREVIDENCIÁRIA',{font:'Bell MT',size:48,bold:true}),A('DR. PAULO ROBERTO TERCINI FILHO',{exact:true}),A('OAB/SP 331.110',{exact:true})]})]})]});
const linha=()=>new Paragraph({spacing:{before:0,after:0},border:{bottom:{style:BorderStyle.SINGLE,size:6,color:'auto',space:1}},children:[]});
const firstHeader=new Header({children:[headerTable,linha()]});
const firstFooter=new Footer({children:[linha(),A('Rua Rui Barbosa, nº. 663, Centro, Monte Alto – SP'),A('Tel: 16-3242-2908 – Cel: 16-98140-9271')]});
const vazio=()=>new Paragraph({spacing:{before:0,after:0},children:[]});

const doc=new Document({sections:[{properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:851,bottom:1134,left:1560,right:1134,header:720,footer:720}}},
  headers:{first:firstHeader,default:new Header({children:[vazio()]})},footers:{first:firstFooter,default:new Footer({children:[vazio()]})},children}]});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync(outFile,b);console.log(`gerado ${outFile}, ${children.length} blocos`);});
