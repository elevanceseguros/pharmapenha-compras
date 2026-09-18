import test from 'node:test';
import assert from 'node:assert/strict';
import {bankingDayInfo,effectivePaymentDate,saoPauloBankHolidays} from '../src/bank-calendar.js';

test('reconhece feriados nacionais, estaduais, municipais e bancários de São Paulo',()=>{
 const holidays=saoPauloBankHolidays(2026);
 assert.equal(holidays.get('2026-01-25'),'Aniversário de São Paulo');
 assert.equal(holidays.get('2026-07-09'),'Revolução Constitucionalista');
 assert.equal(holidays.get('2026-11-20'),'Consciência Negra');
 assert.equal(holidays.get('2026-12-31'),'Sem compensação bancária');
});

test('carnaval prolongado acumula até a quarta-feira',()=>{
 assert.equal(bankingDayInfo('2026-02-16').business,false);
 assert.equal(bankingDayInfo('2026-02-17').business,false);
 assert.equal(effectivePaymentDate('2026-02-14'),'2026-02-18');
 assert.equal(effectivePaymentDate('2026-02-17'),'2026-02-18');
});

test('fim de semana acumula no próximo dia útil',()=>assert.equal(effectivePaymentDate('2026-09-19'),'2026-09-21'));

test('31 de dezembro atravessa ano-novo e fim de semana',()=>assert.equal(effectivePaymentDate('2026-12-31'),'2027-01-04'));

