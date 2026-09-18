import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,parsePaymentDays,splitCents,scheduleFromTerms,paymentLoadLevel,projectedPaymentLoads,dedupeRoundsByTitle} from '../src/payables.js';

test('interpreta condições separadas por barra',()=>assert.deepEqual(parsePaymentDays('28/35/42'),[28,35,42]));
test('também aceita uma parcela escrita como 30 dias',()=>assert.deepEqual(parsePaymentDays('boleto 30 dias'),[30]));
test('divide centavos sem perder o total',()=>assert.deepEqual(splitCents(10001,3),[3334,3334,3333]));
test('soma dias sem erro na virada do mês',()=>assert.equal(addDays('2026-09-16',30),'2026-10-16'));
test('gera datas e mantém a soma do pedido',()=>{const rows=scheduleFromTerms(10001,'30/45/60','2026-09-16');assert.deepEqual(rows.map(x=>x.dueDate),['2026-10-16','2026-10-31','2026-11-15']);assert.equal(rows.reduce((sum,x)=>sum+x.amountCents,0),10001)});
test('classifica a agenda pelo valor total do dia',()=>{assert.equal(paymentLoadLevel(150000),'light');assert.equal(paymentLoadLevel(150001),'medium');assert.equal(paymentLoadLevel(250000),'medium');assert.equal(paymentLoadLevel(250001),'busy')});
test('projeção soma o pedido novo aos boletos já existentes no dia útil',()=>{const existing=[{supplierId:'outro',installments:[{dueDate:'2026-10-16',amountCents:220000}]}],order={supplier:{id:'novo',name:'Novo'},payment:'30',total:40000};const loads=projectedPaymentLoads(existing,order,'2026-09-16T12:00:00Z');assert.deepEqual(loads,[{date:'2026-10-16',totalCents:260000,level:'busy'}])});
test('cotações duplicadas pelo nome conservam somente a mais recente',()=>{const rows=dedupeRoundsByTitle([{id:'antiga',title:'Cotação Setembro',updated_at:'2026-09-16T10:00:00Z'},{id:'nova',title:' cotação setembro ',updated_at:'2026-09-16T12:00:00Z'},{id:'outra',title:'Cotação Outubro',updated_at:'2026-09-16T11:00:00Z'}]);assert.deepEqual(rows.map(x=>x.id),['nova','outra'])});
