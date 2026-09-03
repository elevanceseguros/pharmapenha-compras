import fs from 'node:fs';
import {orderPDF} from '../src/pdf.js';
const lines=Array.from({length:40},(_,i)=>({description:`Produto de teste ${i+1} - Magnésio quelato 30% com especificação e descrição longa para verificar quebras de linha`,reference:'COT-TESTE-2026',packs:2,packQty:100,unit:'g',unitGross:10650,gross:21300}));
const o={valid:true,supplier:{name:'Fornecedor de teste',freightKnown:true,freightCents:5000},lines,net:800000,gross:852000,tax:52000,total:857000};
fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/pedido-teste.pdf',orderPDF(o,{name:'Farmácia Teste',cnpj:'00.000.000/0001-00',address:'Endereço fictício para teste de renderização',contact:'Contato de teste',notes:'Confirmar validade e entrega.'},'Teste de pedido multipágina',new Date('2026-09-03T12:00:00Z')));
