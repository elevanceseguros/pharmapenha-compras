import test from 'node:test';
import assert from 'node:assert/strict';
import {parseQuotation} from '../src/import.js';

test('reconhece os novos modelos de cotação enviados',()=>{
 const samples=[
  ['Biovital','www.biovital.ind.br\n19.0006-1 19.0006-1263 CHINA 17/04/2028 1,0000 UN 0,0000 37,85 0,00 37,85 04/09/2026\nACIDO LACTICO 85% (1KG)',1,'ACIDO LACTICO 85%',1000,3785],
  ['Galena','Galena Quimica e Farmaceutica Ltda\n01 ORLISTAT - 0,250 KG 2.509,99 KG 0,2500 627,50 03/02/2029 CHINA 0.0 NÃO',1,'ORLISTAT',250,62750],
  ['Purifarma','Purifarma\nTricoxin 01/05/2028 1,00 250 g R$320,00 R$80,00 R$80,00 0,00 0,00 R$80,00',1,'Tricoxin',250,8000],
  ['PN farma','Pnfarma\nD-Manose CHINA 0,500 KG 0,500 01/2028 250,00 125,00',1,'D-Manose',500,12500],
  ['Irial Mag','IrialMag\nAcido Lático 85% 1 Kg 34,570 34,57 China 17/10/27',1,'Acido Lático 85%',1000,3457],
  ['Exata','EXATA SUPRIMENTOS MEDICOS LTDA\n1 0837 ASCORBATO DE MAGNESIO 25ACMG1040 19/11/2027 1 1,000-KG110,00KG 0 0,00 110,00',1,'ASCORBATO DE MAGNESIO',1000,11000],
  ['Valdequimica','VALDEQUÍMICA\nCONDROITINA SULFATO - DCB:02597 EUA 06/2028 1.000/kg 300.0000 300.00 0',1,'CONDROITINA SULFATO',1000,30000],
  ['', '1│OXANDROLONA (C5) 50GR │KG │0,050│76.900,00│3.845,00│0.00%│05/07/28',1,'OXANDROLONA (C5)',50,384500]
 ];
 for(const [supplier,text,count,name,qty,gross] of samples){const p=parseQuotation(text);assert.equal(p.detected,supplier);assert.equal(p.rows.length,count);assert.equal(p.rows[0].description,name);assert.equal(p.rows[0].qty,qty);assert.equal(p.rows[0].gross,gross)}
});

test('reconhece texto imperfeito de foto e mantém conferência posterior',()=>{
 const p=parseQuotation('lriclOMag\nICondroitina Sulfato De Sédio 1 Kg 276,130___276,13 3,25% USA 03/05/29\nPnfarma\nFRutina 70% BRASIL 0,250 KG 0,250 04/2023, 170,00 42,50');
 assert.equal(p.rows.length,2);assert.equal(p.rows[0].gross,27613);assert.equal(p.rows[1].qty,250);
});
