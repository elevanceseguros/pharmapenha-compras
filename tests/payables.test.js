import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,parsePaymentDays,splitCents,scheduleFromTerms,dedupeRoundsByTitle} from '../src/payables.js';

test('interpreta condições separadas por barra',()=>assert.deepEqual(parsePaymentDays('28/35/42'),[28,35,42]));
test('também aceita uma parcela escrita como 30 dias',()=>assert.deepEqual(parsePaymentDays('boleto 30 dias'),[30]));
test('divide centavos sem perder o total',()=>assert.deepEqual(splitCents(10001,3),[3334,3334,3333]));
test('soma dias sem erro na virada do mês',()=>assert.equal(addDays('2026-09-16',30),'2026-10-16'));
test('gera datas e mantém a soma do pedido',()=>{const rows=scheduleFromTerms(10001,'30/45/60','2026-09-16');assert.deepEqual(rows.map(x=>x.dueDate),['2026-10-16','2026-10-31','2026-11-15']);assert.equal(rows.reduce((sum,x)=>sum+x.amountCents,0),10001)});
test('cotações duplicadas pelo nome conservam somente a mais recente',()=>{const rows=dedupeRoundsByTitle([{id:'antiga',title:'Cotação Setembro',updated_at:'2026-09-16T10:00:00Z'},{id:'nova',title:' cotação setembro ',updated_at:'2026-09-16T12:00:00Z'},{id:'outra',title:'Cotação Outubro',updated_at:'2026-09-16T11:00:00Z'}]);assert.deepEqual(rows.map(x=>x.id),['nova','outra'])});
