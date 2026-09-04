import fs from 'node:fs';
import {internalReportPDF} from '../src/pdf.js';
const lines=Array.from({length:40},(_,i)=>({itemId:`item-${i+1}`,description:`Produto de teste ${i+1} - Magnésio quelato 30% com especificação e descrição longa para verificar quebras de linha`,reference:'COT-TESTE-2026',packs:2,packQty:100,unit:'g',unitGross:10650,gross:21300}));
const o={valid:true,supplier:{name:'Fornecedor de teste',freightKnown:true,freightCents:5000},lines,net:800000,gross:852000,tax:52000,total:857000};
const audit={items:[{id:'item-1',name:'Castanha da Índia'}],suppliers:[{id:'gamma',name:'Gamma'}],offers:[{productId:'item-1',supplierId:'gamma',considered:false,exclusionReason:'A matéria-prima deste fornecedor não foi aprovada pela qualidade.',grossCents:9000,packQty:100,unit:'g'}]};
fs.mkdirSync('tmp',{recursive:true});fs.writeFileSync('tmp/relatorio-interno-teste.pdf',internalReportPDF([o],audit,'Teste de pedido multipágina',new Date('2026-09-03T12:00:00Z')));
