import test from 'node:test';
import assert from 'node:assert/strict';
import {orderPDF,allPDFs,internalReportPDF} from '../src/pdf.js';
import {unzipSync} from 'fflate';
test('PDF contém apenas o fornecedor escolhido e ZIP separa pedidos',()=>{
 const order={valid:true,supplier:{name:'Fornecedor A',freightCents:0,freightKnown:true},payment:'Boleto 28 dias',freightKnown:true,freightCents:1500,net:10000,gross:10650,tax:650,total:12150,lines:[{itemId:'item-a',description:'Castanha da Índia',reference:'COT-123',packs:1,packQty:100,unit:'g',unitGross:10650,gross:10650}]};
 const audit={items:[{id:'item-a',name:'Castanha da Índia'},{id:'item-b',name:'Outro produto'}],suppliers:[{id:'gamma',name:'Gamma'},{id:'secret',name:'Concorrente secreto'}],offers:[{productId:'item-a',supplierId:'gamma',considered:false,exclusionReason:'Matéria-prima não aprovada pela qualidade.',grossCents:9000,packQty:100,unit:'g'},{productId:'item-b',supplierId:'secret',considered:false,exclusionReason:'Outro produto não relacionado.',grossCents:100,packQty:1,unit:'g'}]};
 const bytes=orderPDF(order,{name:'Farmácia Teste'},'Rodada de teste',new Date('2026-09-03T12:00:00Z'));
 const str=new TextDecoder('latin1').decode(bytes);assert.ok(str.startsWith('%PDF-'));assert.ok(str.includes('Fornecedor A'));assert.ok(!str.includes('USO INTERNO'));assert.ok(!str.includes('Gamma'));assert.ok(!str.includes('qualidade'));assert.ok(str.includes('106,50'));assert.ok(str.includes('Boleto 28 dias'));assert.ok(str.includes('15,00'));assert.ok(str.includes('121,50'));
 const files=unzipSync(allPDFs([order,{...order,supplier:{...order.supplier,name:'Fornecedor B'}}],{},'Teste'));assert.equal(Object.keys(files).length,2);assert.ok(!new TextDecoder('latin1').decode(files[Object.keys(files)[0]]).includes('Fornecedor B'));assert.ok(!new TextDecoder('latin1').decode(files[Object.keys(files)[0]]).includes('Gamma'));
 const internal=new TextDecoder('latin1').decode(internalReportPDF([order],audit,'Teste',new Date('2026-09-03T12:00:00Z')));assert.ok(internal.includes('USO INTERNO'));assert.ok(internal.includes('Fornecedor A'));assert.ok(internal.includes('Boleto 28 dias'));assert.ok(internal.includes('Total geral previsto'));assert.ok(internal.includes('121,50'));assert.ok(internal.includes('Gamma'));assert.ok(internal.includes('qualidade'));assert.ok(!internal.includes('Concorrente secreto'));
 assert.throws(()=>orderPDF({...order,valid:false},{},'Teste'));
});
