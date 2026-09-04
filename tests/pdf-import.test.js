import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {jsPDF} from 'jspdf';

test('extrai PDFs consecutivos e encerra a tarefa sem doc.destroy',async()=>{
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 // Exercise the production function, replacing only Vite's worker URL import.
 const source=readFileSync(new URL('../src/import.js',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('export async function pdfText'),source.indexOf('let ocrWorker')).replace('export async function','async function')
  .replace("const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');",'')
  .replace("const worker=(await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;",'const worker=workerURL;');
 const readPDF=new Function('pdfjs','workerURL',body+';return pdfText;')(pdfjs,new URL('../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',import.meta.url).href);
 for(const name of ['Fornecedor Alfa','Fornecedor Beta']){
  const doc=new jsPDF();doc.text(name+' - Produto exemplo 500 g R$ 150,00',10,20);
  const buffer=doc.output('arraybuffer');const text=await readPDF({size:buffer.byteLength,arrayBuffer:async()=>buffer});
  assert.ok(text.includes(name));assert.ok(text.includes('500 g'));
 }
 await assert.rejects(readPDF({size:4,arrayBuffer:async()=>new Uint8Array([1,2,3,4]).buffer}));
});
