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

test('reconhece Embrafarma e o modelo completo de copiar e colar',()=>{
 const premium=parseQuotation('ALLPREMIUM Industria e Comércio Ltda.\n001 Calcio Citrato Malato-ccm 1kg 1 KG 82,00 0,00 0% 82,00 07/2028 Brasil - 0142606539\n002 Lactobacillus Gasseri Bsr 50gr 50 GR 1,20 0,00 0% 60,00 05/2028 Brasil - -');
 assert.equal(premium.detected,'Embrafarma (All Premium)');assert.equal(premium.reference,'');assert.equal(premium.rows.length,2);assert.equal(premium.rows[0].qty,1000);assert.equal(premium.rows[1].gross,6000);
 const typed=parseQuotation('Produto | Embalagem | Preço sem impostos | Preço final\nÁcido Lático 85% | 1 kg | 34,57 | 34,57\nCondroitina Sulfato | 500 g | 100,00 | 103,25');
 assert.equal(typed.rows.length,2);assert.equal(typed.rows[0].qty,1000);assert.equal(typed.rows[1].net,10000);assert.equal(typed.rows[1].gross,10325);
});

test('reconhece texto imperfeito de foto e mantém conferência posterior',()=>{
 const p=parseQuotation('lriclOMag\nICondroitina Sulfato De Sédio 1 Kg 276,130___276,13 3,25% USA 03/05/29\nPnfarma\nFRutina 70% BRASIL 0,250 KG 0,250 04/2023, 170,00 42,50');
 assert.equal(p.rows.length,2);assert.equal(p.rows[0].gross,27613);assert.equal(p.rows[1].qty,250);
});

test('entende mensagens livres de WhatsApp sem exigir travessões ou colunas',()=>{
 const p=parseQuotation(`Olá, segue nossa cotação:\n* Creatina monohidratada 1 kg R$ 82,00 pronta entrega\n• Licopeno 100g: 64,50 validade 09/2028\n3) Bupropiona HCl 20 gr valor final 130,00\nObrigada!`,'Purifarma');
 assert.equal(p.detected,'Purifarma');assert.equal(p.rows.length,3);assert.deepEqual(p.rows.map(r=>[r.description,r.qty,r.gross]),[['Creatina monohidratada',1000,8200],['Licopeno',100,6450],['Bupropiona HCl',20,13000]]);
});

test('remonta item quando OCR ou WhatsApp quebra nome quantidade e preço em linhas',()=>{
 const p=parseQuotation(`Nortriptilina HCl (P.344) Brasil\n100 g\nPreço: R$ 245,90\n\nCoenzima Q10\n50 g\n180,00`);
 assert.equal(p.rows.length,2);assert.equal(p.rows[0].description,'Nortriptilina HCl (P.344) Brasil');assert.equal(p.rows[0].gross,24590);assert.equal(p.rows[1].description,'Coenzima Q10');assert.equal(p.rows[1].gross,18000);
});

test('aceita vários itens em uma única linha separados por ponto e vírgula',()=>{const p=parseQuotation('Creatina 1kg R$ 80,00; Licopeno 100 g 65,50; Rutina 250g valor 42,50');assert.equal(p.rows.length,3)});
