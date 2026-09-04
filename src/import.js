import {decimal,quantity} from './core.js';
export function parseQuotation(text){
 const rows=[],unparsed=[];let detected='';
 if(/sovita/i.test(text))detected='Sovita';else if(/infinitypharma|infinity pharma/i.test(text))detected='Infinity Pharma';else if(/pnfarma|pn farmac/i.test(text))detected='PN farma';else if(/biovital/i.test(text))detected='Biovital';else if(/galena qu[ií]mica|galena digital/i.test(text))detected='Galena';else if(/purifarma/i.test(text))detected='Purifarma';else if(/exata (?:suprimentos|suprmentos|distribui)/i.test(text))detected='Exata';else if(/irial ?mag|lri[ca]l.?mag/i.test(text))detected='Irial Mag';else if(/valdequ/i.test(text))detected='Valdequimica';else if(/allpremium|embrafarma/i.test(text))detected='Embrafarma (All Premium)';else if(/fracionamento.*encargos|pre[cç]o g\/mlh|66111091[-.]979/i.test(text))detected='Caldic';
 const ref=text.match(/(?:Cotação\s*(?:N[º°o.:]|[-:])?|Número da proposta[^:]*:)\s*([^\s]+)/i)?.[1]||'';
 const dateRaw=text.match(/(?:Data da Cotação:|Data da Criação:|Data da Emissão[^:]*:)\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
 let expires='';const explicit=text.match(/Validade da proposta[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
 const iso=v=>v.split('/').reverse().join('-');
 if(explicit)expires=iso(explicit);
 else if(dateRaw&&/válida por 2 dias/i.test(text)){const d=new Date(iso(dateRaw)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+2);expires=d.toISOString().slice(0,10)}
 const rowKeys=new Set(),add=(description,amount,unit,net,gross,extra={})=>{try{const q=quantity(decimal(amount),unit),n=Math.round(decimal(net)*100),g=Math.round(decimal(gross)*100),name=description.trim().replace(/\s+-\s+DCB:.*$/i,'').replace(/^\d+\s+\d+\s+/,'').trim(),key=`${name}|${q.qty}|${q.unit}|${g}`;if(name&&n>0&&g>=n&&!rowKeys.has(key)){rowKeys.add(key);rows.push({description:name,...q,net:n,gross:g,quotedPacks:extra.quotedPacks??1,available:true,validity:extra.validity||'',source:extra.source||description})}}catch{}};
 const sourceLines=text.split(/\n/);
 if(detected==='Biovital')for(let i=1;i<sourceLines.length;i++){const product=sourceLines[i].replace(/\s+/g,' ').trim().match(/^(.*?)\s*\(([\d.,]+)\s*(KG|G|L|ML|UN)\)\s*$/i);if(!product)continue;const prior=sourceLines[i-1].replace(/\s+/g,' ').trim(),prices=[...prior.matchAll(/(?:^|\s)(\d+[.,]\d{2})(?=\s|$)/g)].map(m=>m[1]);if(prices.length)add(product[1],product[2],product[3],prices.at(-1),prices.at(-1),{source:`${prior} ${sourceLines[i]}`})}
 let pending='';const fractionNames=new Map();
 for(const raw of sourceLines){
  const line=raw.replace(/\s+/g,' ').replace(/\s+[–—-]\s+Sug\.\s+\w+/i,'').trim();if(!line)continue;
  // Modelo Embrafarma / All Premium: quantidade, unidade, unitário e total final.
  const premium=line.match(/^\d+\s+(.*?)\s+([\d.,]+)\s+(KG|GR|G|L|ML|UN)\s+([\d.,]+)\s+[\d.,]+\s+\d+(?:[.,]\d+)?%\s+([\d.,]+)\s+(\d{2}\/\d{4})/i);
  if(premium){add(premium[1],premium[2],premium[3].replace(/^GR$/i,'G'),premium[5],premium[5],{validity:premium[6],source:line});continue}
  // Texto digitado em colunas: produto | embalagem | sem impostos | final.
  const typed=line.match(/^(.*?)\s*[|;]\s*([\d.,]+)\s*(KG|G|GR|MLH|MIL|ML|L|UN)\s*[|;]\s*(?:R\$\s*)?([\d.]+(?:,\d{1,2})?)(?:\s*[|;]\s*(?:R\$\s*)?([\d.]+(?:,\d{1,2})?))?\s*$/i);
  if(typed&&!/produto|embalagem|pre[cç]o/i.test(typed[1])){add(typed[1],typed[2],typed[3].replace(/^GR$/i,'G'),typed[4],typed[5]||typed[4],{source:line});continue}
  // Purifarma: quantidade de embalagens, tamanho da embalagem, preços unitário/total e total com impostos.
  const puri=line.match(/^(.*?)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+([\d.,]+)\s*(KG|G|MLH|MIL|ML|L|UN)\s+R\$\s*[\d.,]+\s+R\$\s*([\d.,]+)\s+R\$\s*[\d.,]+.*?R\$\s*([\d.,]+)\s*$/i);
  if(puri){const packs=decimal(puri[3]);add(puri[1],puri[4],puri[5],puri[6],decimal(puri[7])/packs,{quotedPacks:packs,validity:puri[2],source:line});continue}
  // Galena e PN Farma: descrição, quantidade/embalagem em kg ou L, preço por unidade-base e total do item.
  const galena=line.match(/^\d+\s+(.*?)\s+-\s*([\d.,]+)\s*(KG|G|L|ML|UN)\s+([\d.,]+)\s+(?:KG|G|L|ML|UN)\s+([\d.,]+)\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{4})/i);
  if(galena){add(galena[1],galena[2],galena[3],galena[6],galena[6],{validity:galena[7],source:line});continue}
  const pn=line.match(/^\[?(.*?)\s+(?:CHINA|BRASIL|INDIA|ÍNDIA|USA|EUA)\s+([\d.,]+)\s*(KG|G|L|ML|UN)\s+([\d.,]+)\s+\S+\s+([\d.,]+)\s+([\d.,]+)\s*$/i);
  if(pn){add(pn[1],pn[4],pn[3],pn[6],pn[6],{source:line});continue}
  // Formularium: quantidade total e total do item; a embalagem também costuma vir no nome (50GR/100GR).
  const form=line.match(/^[│|]?\s*\d+\s*[│|]?\s*(.*?)\s*[│|]?\s*(KG|G|L|ML|UN)\s*[│|]?\s*([\d.,]+)\s*[│|]?\s*([\d.]+,\d{2})\s*[│|]?\s*([\d.]+,\d{2}).*(\d{2}\/\d{2}\/\d{2,4})/i);
  if(form){const named=form[1].match(/(\d+(?:[.,]\d+)?)\s*(GR|G|KG|ML|L|UN)\b/i),amount=named?.[1]||form[3],unit=named?.[2]?.replace(/^GR$/i,'G')||form[2];add(form[1].replace(/\s+\d+(?:[.,]\d+)?\s*(?:GR|G|KG|ML|L|UN)\s*$/i,''),amount,unit,form[5],form[5],{validity:form[6],source:line});continue}
  // Valdequímica HTML: produto, origem, validade, quantidade/unidade, valor unitário e valor do item.
  const valde=line.match(/^(.*?)\s+(?:EUA|USA|CHINA|BRASIL|INDIA|ÍNDIA)\s+(\d{2}\/\d{4})\s+([\d.,]+)\s*\/\s*(kg|g|l|ml|un)\s+([\d.,]+)\s+([\d.,]+)\s+\d+(?:[.,]\d+)?\s*$/i);
  if(valde){add(valde[1],valde[3],valde[4],valde[6],valde[6],{validity:valde[2],source:line});continue}
  // Irial Mag: quantidade, unidade, unitário, total, IPI, origem e validade.
  const irial=line.match(/^\[?I?(.*?)\s+([\d.,]+)\s+(Kg|G|L|ML|UN)\s+[\d.,]+[_ ]+([\d.,]+)(?:\s+[\d.,]+%?)?\s+(?:China|USA|EUA|Brasil|India|Índia)(?:\s+(\S+))?/i);
  if(irial){add(irial[1],irial[2],irial[3],irial[4],irial[4],{validity:irial[5]||'',source:line});continue}
  // Exata: produto, lote, validade, quantidade, grade da embalagem e valores.
  const exata=line.match(/^\d+[ .]\s*\d+\s+(.*?)\s+\S+\s+(\S+)\s+(\d+)\s+[^\d]*([\d.,]+)\s*[-_ ]\s*(KG|G|L|ML|UN)[-_ ]*([\d.,]+)/i);
  if(exata){add(exata[1],exata[4],exata[5],exata[6],exata[6],{quotedPacks:decimal(exata[3]),validity:exata[2],source:line});continue}
  // Biovital: a linha numérica é seguida pelo nome e pela embalagem entre parênteses.
  if(detected==='Biovital'&&/\d{2}\/\d{2}\/\d{4}.*\d+[,.]\d{2}/.test(line)){pending=line;unparsed.push(line);continue}
  const bio=line.match(/^(.*?)\s*\(([\d.,]+)\s*(KG|G|L|ML|UN)\)\s*$/i);
  if(bio&&pending){const prices=[...pending.matchAll(/(?:^|\s)(\d+[.,]\d{2})(?=\s|$)/g)].map(m=>m[1]);if(prices.length){add(bio[1],bio[2],bio[3],prices.at(-1),prices.at(-1),{source:`${pending} ${line}`});unparsed.pop();pending='';continue}}
  // Tabelas de fracionamento em imagem: código, descrição, tamanho e preço da embalagem.
  const fraction=line.match(/^(\d{6,}[.\-]\d+)\s+(.*?)\s+[-_=]?\s*(\d{2,4})\s+[-_=]?\s*R[S$]\b[^\d]*([\d.,]+)/i);
  if(fraction){const found=fraction[2].match(/(Ascorbato\b.*|Citrus\b.*|Lactobacillus\b.*|Rutina\b.*)/i),name=found?.[1]?.replace(/\s+(?:refrigera|RS).*$/i,'').trim()||fractionNames.get(fraction[1]);if(name){fractionNames.set(fraction[1],name);add(name,fraction[3],'g',fraction[4],fraction[4],{source:line});continue}}
  const standard=line.match(/^(.*?)\s+(Brasil|China|Índia|India)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+)\s+([\d.,]+)\s*(KG|G|MLH|MIL|ML|L|UN)\s+(.*)$/i);
  if(standard){
   // The price/kg may wrap onto a second line. Skip that column and use
   // the intact package price and final total, never the price/kg.
   const tail=standard[7].replace(/^R\$\s*[\d.,]+\s*/, '');
   const p=[...tail.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map(m=>decimal(m[1]));
   if(p.length>=2){const packs=decimal(standard[4]);const q=quantity(decimal(standard[5]),standard[6]);rows.push({description:standard[1],...q,net:Math.round(p[0]*100),gross:Math.round((packs?p.at(-1)/packs:p[0])*100),quotedPacks:packs,available:packs>0,validity:standard[3],source:line});continue}
  }
  const pnLegacy=line.match(/^(.*?)\s+(INDIA|CHINA|BRASIL)\s+([\d.,]+)\s+KG\s+([\d.,]+)\s+(\d{2}\/\d{4})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})$/i);
  if(pnLegacy){const pack=decimal(pnLegacy[4]);const n=decimal(pnLegacy[3])/pack;rows.push({description:pnLegacy[1],qty:pack*1000,unit:'g',net:Math.round(decimal(pnLegacy[6])*pack*100),gross:Math.round(decimal(pnLegacy[7])/n*100),quotedPacks:n,available:n>0,validity:pnLegacy[5],source:line});continue}
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
 if(lines.join('').trim().length<30)throw Error('PDF_DIGITALIZADO');
 return lines.join('\n');
}
let ocrWorker,ocrProgress;
async function worker(onProgress){
 ocrProgress=onProgress;
 if(!ocrWorker){const {createWorker}=await import('tesseract.js'),langPath=new URL('tessdata',document.baseURI).href.replace(/\/$/,'');ocrWorker=await createWorker('por',1,{langPath,logger:m=>{if(m.status==='recognizing text')ocrProgress?.(Math.round((m.progress||0)*100))}})}
 return ocrWorker;
}
export async function imageText(file,onProgress){
 if(file.size>20*1024*1024)throw Error('A imagem excede 20 MB. Envie uma foto menor.');
 const w=await worker(onProgress),result=await w.recognize(file);const text=result.data.text.trim();
 if(text.length<20)throw Error('Não consegui ler texto suficiente nesta imagem. Tente uma foto mais nítida, reta e bem iluminada.');
 return text;
}
async function scannedPDFText(file,onProgress){
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const workerURL=(await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;pdfjs.GlobalWorkerOptions.workerSrc=workerURL;
 const task=pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false});const texts=[];
 try{const doc=await task.promise;if(doc.numPages>20)throw Error('PDF digitalizado com mais de 20 páginas. Divida o documento para usar o reconhecimento de imagem.');
  const ocr=await worker();for(let i=1;i<=doc.numPages;i++){ocrProgress=p=>onProgress?.({page:i,pages:doc.numPages,percent:p});onProgress?.({page:i,pages:doc.numPages,percent:0});const page=await doc.getPage(i),viewport=page.getViewport({scale:2}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const result=await ocr.recognize(canvas,{}, {text:true});texts.push(result.data.text);onProgress?.({page:i,pages:doc.numPages,percent:100})}
 }finally{await task.destroy()}
 const text=texts.join('\n').trim();if(text.length<20)throw Error('Não consegui ler texto suficiente neste PDF escaneado. Tente um arquivo mais nítido.');return text;
}
export async function quotationText(file,onProgress){
 const type=String(file.type||'').toLowerCase(),name=String(file.name||'').toLowerCase();
 if(type==='text/html'||name.endsWith('.html')||name.endsWith('.htm')){if(file.size>10*1024*1024)throw Error('O HTML excede 10 MB.');const doc=new DOMParser().parseFromString(await file.text(),'text/html'),table=[...doc.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent.replace(/\s+/g,' ').trim()).join(' ')).filter(Boolean).join('\n'),body=doc.body.textContent.replace(/\s+/g,' ').trim();return `${table}\n${body}`}
 if(type.startsWith('text/')||name.endsWith('.txt'))return file.text();
 if(type.startsWith('image/')||/\.(png|jpe?g|webp|bmp|tiff?)$/.test(name))return imageText(file,p=>onProgress?.({percent:p}));
 if(type==='application/pdf'||name.endsWith('.pdf')){try{return await pdfText(file)}catch(err){if(err.message!=='PDF_DIGITALIZADO')throw err;return scannedPDFText(file,onProgress)}}
 throw Error('Formato não aceito. Envie PDF, foto, HTML ou TXT.');
}
