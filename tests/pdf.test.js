import test from 'node:test';
import assert from 'node:assert/strict';
import {orderPDF,allPDFs} from '../src/pdf.js';
import {unzipSync} from 'fflate';
test('PDF contém apenas o fornecedor escolhido e ZIP separa pedidos',()=>{
 const order={valid:true,supplier:{name:'Fornecedor A',freightCents:0,freightKnown:true},net:10000,gross:10650,tax:650,total:10650,lines:[{description:'Magnésio quelato 30%',reference:'COT-123',packs:1,packQty:100,unit:'g',unitGross:10650,gross:10650}]};
 const bytes=orderPDF(order,{name:'Farmácia Teste'},'Rodada de teste',new Date('2026-09-03T12:00:00Z'));
 const str=new TextDecoder('latin1').decode(bytes);assert.ok(str.startsWith('%PDF-'));assert.ok(str.includes('Fornecedor A'));assert.ok(!str.includes('Concorrente secreto'));assert.ok(str.includes('106,50'));
 const files=unzipSync(allPDFs([order,{...order,supplier:{...order.supplier,name:'Fornecedor B'}}],{},'Teste'));assert.equal(Object.keys(files).length,2);assert.ok(!new TextDecoder('latin1').decode(files[Object.keys(files)[0]]).includes('Fornecedor B'));
 assert.throws(()=>orderPDF({...order,valid:false},{},'Teste'));
});
