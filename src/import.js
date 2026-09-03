import {decimal,quantity} from './core.js';
export function parseQuotation(text){
 const rows=[],unparsed=[];let detected='';
 if(/sovita/i.test(text))detected='Sovita';else if(/infinitypharma|infinity pharma/i.test(text))detected='Infinity Pharma';else if(/pnfarma|pn farmac/i.test(text))detected='PN farma';
 const ref=text.match(/(?:Cotação Nº:|Número da proposta[^:]*:)\s*([^\s]+)/i)?.[1]||'';
 const dateRaw=text.match(/(?:Data da Cotação:|Data da Criação:|Data da Emissão[^:]*:)\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
 let expires='';const explicit=text.match(/Validade da proposta[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
 const iso=v=>v.split('/').reverse().join('-');
 if(explicit)expires=iso(explicit);
 else if(dateRaw&&/válida por 2 dias/i.test(text)){const d=new Date(iso(dateRaw)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+2);expires=d.toISOString().slice(0,10)}
 for(const raw of text.split(/\n/)){
  const line=raw.replace(/\s+/g,' ').trim();if(!line)continue;
  const standard=line.match(/^(.*?)\s+(Brasil|China|Índia|India)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+([\d.,]+)\s*(KG|G|MLH|MIL|ML|L|UN)\s+(.*)$/i);
  if(standard){
   // The price/kg may wrap onto a second line. Skip that column and use
   // the intact package price and final total, never the price/kg.
   const tail=standard[7].replace(/^R\$\s*[\d.,]+\s*/, '');
   const p=[...tail.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map(m=>decimal(m[1]));
   if(p.length>=2){const packs=decimal(standard[4]);const q=quantity(decimal(standard[5]),standard[6]);rows.push({description:standard[1],...q,net:Math.round(p[0]*100),gross:Math.round((packs?p.at(-1)/packs:p[0])*100),quotedPacks:packs,available:packs>0,validity:standard[3],source:line});continue}
  }
  const pn=line.match(/^(.*?)\s+(INDIA|CHINA|BRASIL)\s+([\d.,]+)\s+KG\s+([\d.,]+)\s+(\d{2}\/\d{4})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/i);
  if(pn){const pack=decimal(pn[4]);const n=decimal(pn[3])/pack;rows.push({description:pn[1],qty:pack*1000,unit:'g',net:Math.round(decimal(pn[6])*pack*100),gross:Math.round(decimal(pn[7])/n*100),quotedPacks:n,available:n>0,validity:pn[5],source:line});continue}
  const manual=line.match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|mlh|mil|ml|l|un)\s*[-–—:;]?\s*(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)\s*$/i);
  if(manual&&manual[1].trim()){const q=quantity(decimal(manual[2]),manual[3]);const p=Math.round(decimal(manual[4])*100);if(p>0){rows.push({description:manual[1],...q,net:p,gross:p,quotedPacks:1,available:true,source:line});continue}}
  unparsed.push(line);
 }
 return {rows,unparsed,detected,reference:ref,expires};
}
export async function pdfText(file){
 if(file.size>20*1024*1024)throw Error('O PDF excede 20 MB. Divida o documento.');
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const worker=(await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
 pdfjs.GlobalWorkerOptions.workerSrc=worker;
 const task=pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false});const lines=[];
 try{const doc=await task.promise;if(doc.numPages>100)throw Error('Limite de 100 páginas por arquivo.');
  for(let i=1;i<=doc.numPages;i++){
   const page=await doc.getPage(i);const content=await page.getTextContent();const rows=[];
   for(const item of content.items){if(!item.str?.trim())continue;const y=item.transform[5];let row=rows.find(r=>Math.abs(r.y-y)<2.2);if(!row){row={y,parts:[]};rows.push(row)}row.parts.push({x:item.transform[4],s:item.str})}
   rows.sort((a,b)=>b.y-a.y);rows.forEach(r=>lines.push(r.parts.sort((a,b)=>a.x-b.x).map(p=>p.s).join(' ')));
  }
 }finally{await task.destroy()}
 if(lines.join('').trim().length<30)throw Error('Este PDF parece digitalizado. Não há OCR nesta versão; copie ou digite os itens manualmente.');
 return lines.join('\n');
}
