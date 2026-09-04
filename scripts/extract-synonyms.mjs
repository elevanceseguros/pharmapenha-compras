import {readFileSync,writeFileSync} from 'node:fs';

const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Uso: node scripts/extract-synonyms.mjs entrada.txt saida.js');
const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const lines=readFileSync(input,'utf8').split(/\r?\n/);
const start=lines.findIndex(l=>/^Grupo Matéria-prima\s*$/.test(l));
const end=lines.findIndex((l,i)=>i>start&&/^Grupo Outros\s*$/.test(l));
if(start<0||end<0)throw Error('Grupo Matéria-prima não encontrado.');
const records=[];let current=null;
for(const line of lines.slice(start+1,end)){
 if(/^(?:\f?PHARMAPENHA|MEDDIX|Relatório de Principal|\s*C[oó]digo)/i.test(line))continue;
 const match=line.match(/^\s{2}(\d+)\s+/);
 if(match){
  const principal=line.slice(12,58).trim(),unit=line.slice(58,68).trim(),first=line.slice(68).trim();
  if(!principal||!unit){current=null;continue}
  current={code:match[1],principal,unit,synonyms:first?[first]:[]};records.push(current);continue;
 }
 const continuation=line.slice(68).trim();
 if(current&&continuation)current.synonyms.push(continuation);
}
const choices=new Map();
for(const r of records){
 const canonical=normalize(r.principal);for(const name of [r.principal,...r.synonyms]){
  const key=normalize(name);if(!key)continue;const set=choices.get(key)||new Set();set.add(canonical);choices.set(key,set);
 }
}
const entries=[],conflicts=[];
for(const [key,values] of choices){if(values.size===1)entries.push([key,[...values][0]]);else conflicts.push([key,[...values]])}
entries.sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'));conflicts.sort((a,b)=>a[0].localeCompare(b[0],'pt-BR'));
const banner=`// Generated from Pharmapenha's Principal/Sinonimos report. Do not edit manually.\n`;
writeFileSync(output,banner+`export const materialSynonyms=${JSON.stringify(Object.fromEntries(entries))};\nexport const materialSynonymConflicts=${JSON.stringify(Object.fromEntries(conflicts))};\n`);
console.log(JSON.stringify({records:records.length,keys:entries.length,conflicts:conflicts.length}));
