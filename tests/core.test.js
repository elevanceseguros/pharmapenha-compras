import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSuppliers,optimize,quantity,candidates,ordersFor,validateState,productKey,equivalentProduct,aggregateEquivalentItems} from '../src/core.js';
import {parseQuotation} from '../src/import.js';
import {materialSynonyms} from '../src/synonyms.generated.js';
const supplier=(id,min=0,freight=0)=>({id,name:id,minCents:min,freightCents:freight,minimumBasis:'net',freightKnown:true});
const item=(id,qty=100)=>({id,name:id,qty,unit:'g',allowExcess:false});
const offer=(id,productId,supplierId,gross,packQty=100)=>({id,productId,supplierId,packQty,unit:'g',netCents:gross,grossCents:gross,reviewed:true,available:true});
const params={date:'2026-09-03',maxMs:10000};
test('21 fornecedores e valores fornecidos',()=>{assert.equal(defaultSuppliers.length,21);assert.equal(defaultSuppliers.find(s=>s.name==='Nutrifarm').minCents,65000);assert.equal(defaultSuppliers.find(s=>s.name==='Galena').minCents,100000);assert.equal(defaultSuppliers.find(s=>s.name==='Infinity Pharma').minCents,60000);assert.equal(defaultSuppliers.find(s=>s.name==='Irial Mag').minCents,40000)});
test('normalização de unidades não converte massa em volume',()=>{assert.deepEqual(quantity(.2,'kg'),{qty:200,unit:'g'});assert.deepEqual(quantity(2,'l'),{qty:2000,unit:'ml'});assert.equal(candidates(item('a'),[{...offer('1','a','X',9000),unit:'ml'}],[supplier('X')]).length,0)});
test('200g por 180 supera duas embalagens de 100g por 100',()=>{const p=optimize([item('a',200)],[offer('1','a','X',10000),offer('2','a','Y',18000,200)],[supplier('X'),supplier('Y')],params);assert.equal(p.lines[0].supplierId,'Y');assert.equal(p.total,18000);assert.equal(p.optimal,true)});
test('redistribui menores preços para respeitar mínimo',()=>{const p=optimize([item('a'),item('b')],[offer('1','a','X',20000),offer('2','a','Y',25000),offer('3','b','Y',40000)],[supplier('X',60000),supplier('Y',60000)],params);assert.equal(p.status,'feasible');assert.equal(p.total,65000);assert.equal(p.orders.length,1);assert.equal(p.changes.length,1);assert.equal(p.orders[0].supplier.id,'Y')});
test('não aumenta quantidade para completar mínimos',()=>{const p=optimize([item('a')],[offer('1','a','X',20000)],[supplier('X',60000)],params);assert.equal(p.status,'infeasible');assert.equal(p.orders.length,0)});
test('arredondamento de embalagem exige autorização',()=>{const s=[supplier('X')],o=[offer('1','a','X',10000,200)];assert.equal(optimize([item('a')],o,s,params).status,'missing');const p=optimize([{...item('a'),allowExcess:true}],o,s,params);assert.equal(p.lines[0].excess,100)});
test('mínimo exclui frete e impostos por padrão',()=>{const o={...offer('1','a','X',60000),netCents:50000};assert.equal(optimize([item('a')],[o],[supplier('X',60000,20000)],params).status,'infeasible');assert.equal(optimize([item('a')],[o],[{...supplier('X',60000),minimumBasis:'gross'}],params).status,'feasible')});
test('frete entra no custo uma única vez por fornecedor',()=>{const p=optimize([item('a'),item('b')],[offer('1','a','X',200),offer('2','b','X',200),offer('3','a','Y',300),offer('4','b','Y',300)],[supplier('X',0,500),supplier('Y')],params);assert.equal(p.total,600);assert.equal(p.orders.length,1);assert.equal(p.orders[0].supplier.id,'Y')});
test('zero, não conferidos, indisponíveis e estoque insuficiente não entram',()=>{for(const patch of [{available:false},{reviewed:false},{netCents:0},{maxPacks:0}]){assert.equal(optimize([item('a')],[{...offer('1','a','X',10000),...patch}],[supplier('X')],params).status,'missing')}});
test('fornecedor fixado é respeitado',()=>{const p=optimize([{...item('a'),lock:'Y'}],[offer('1','a','X',100),offer('2','a','Y',200)],[supplier('X'),supplier('Y')],params);assert.equal(p.total,200)});
test('busca truncada não declara inviabilidade provada',()=>{const p=optimize([item('a')],[offer('1','a','X',100)],[supplier('X')],{...params,maxNodes:0});assert.equal(p.status,'inconclusive');assert.equal(p.optimal,false)});
test('resultado exato coincide com enumeração independente em casos pequenos',()=>{let seed=17;const rnd=()=>{seed=(seed*16807)%2147483647;return seed};for(let n=0;n<30;n++){const ss=[supplier('X',rnd()%700,rnd()%50),supplier('Y',rnd()%700,rnd()%50)];const ii=[item('a'),item('b'),item('c')];const oo=ii.flatMap(i=>ss.map(s=>offer(i.id+s.id,i.id,s.id,100+rnd()%500)));let best=Infinity;for(let mask=0;mask<8;mask++){const lines=ii.map((i,k)=>candidates(i,oo,ss)[0]);for(let k=0;k<3;k++)lines[k]=candidates(ii[k],oo,ss).find(o=>o.supplierId===ss[(mask>>k)&1].id);const orders=ordersFor(lines,ss);if(orders.every(o=>o.valid))best=Math.min(best,orders.reduce((v,o)=>v+o.total,0))}const p=optimize(ii,oo,ss,params);assert.equal(p.total??Infinity,best)}});
test('parser preserva preço de embalagem e produto',()=>{const p=parseQuotation('Vitamina X 200 g — R$ 180,00\nNão reconhecido');assert.equal(p.rows.length,1);assert.equal(p.rows[0].gross,18000);assert.equal(p.rows[0].qty,200);assert.equal(p.unparsed.length,1)});
test('parser kg decimal com insumo fictício',()=>{const p=parseQuotation('Insumo Teste INDIA 0,100 KG 0,100 06/2030 150,00 15,00');assert.equal(p.rows[0].qty,100);assert.equal(p.rows[0].net,1500)});
test('parser duas embalagens divide total corretamente',()=>{const p=parseQuotation('Insumo Teste China 18/01/2030 2,00 1 KG R$24,00 R$24,00 R$48,00 0,00 0,00 R$48,00');assert.equal(p.rows[0].gross,2400);assert.equal(p.rows[0].quotedPacks,2)});
test('restauração rejeita valores inválidos e referências faltantes',()=>{assert.throws(()=>validateState({version:1,items:[],suppliers:[supplier('X',-1)],offers:[]}));assert.throws(()=>validateState({version:1,items:[],suppliers:[],offers:[offer('o','a','X',100)]}))});
test('prazo antigo da cotação não bloqueia comparação nem pedido',()=>{const p=optimize([item('a')],[{...offer('1','a','X',10000),expires:'2020-01-01'}],[supplier('X')],params);assert.equal(p.status,'feasible')});
test('kg, g e mg produzem a mesma base para comparação de preços',()=>{
 const base=quantity(.1,'kg');assert.deepEqual(base,quantity(100,'g'));assert.deepEqual(base,quantity(100000,'mg'));
 const i={...item('a'),...base};
 const options=candidates(i,[{...offer('1','a','X',7300),packQty:quantity(.1,'kg').qty},{...offer('2','a','X',8000),packQty:quantity(100,'g').qty}],[supplier('X')]);
 assert.equal(options.length,2);assert.equal(options[0].gross,7300);assert.equal(options[0].qty,100);
});
test('milheiro e unidades comparam cápsulas sem misturar volume',()=>{
 assert.deepEqual(quantity(1,'MLH'),{qty:1000,unit:'un'});assert.deepEqual(quantity(2,'mil'),{qty:2000,unit:'un'});
 const a=parseQuotation('Capsulas exemplo 1 MLH — R$ 80,00').rows[0];const b=parseQuotation('Capsulas exemplo 1000 un — R$ 90,00').rows[0];
 assert.equal(a.qty,b.qty);assert.equal(a.unit,'un');assert.equal(a.net,8000);
 assert.equal(candidates({...item('a'),qty:1000,unit:'un'},[{...offer('1','a','X',8000),packQty:1000,unit:'ml'}],[supplier('X')]).length,0);
});
test('parser aceita preço por kg quebrado sem perder preço da embalagem',()=>{
 const r=parseQuotation('Produto exemplo China 30/04/2029 1,00 5 G R$110.000, R$550,00 R$550,00 0,00 0,00 R$550,00').rows[0];assert.equal(r.net,55000);assert.equal(r.gross,55000);assert.equal(r.qty,5);
});
test('agregador reconhece insumo-base e preserva sais diferentes',()=>{
 assert.equal(equivalentProduct('Citrato de Cálcio','Citrato de Calcio Tetrahidrata'),true);
 assert.equal(equivalentProduct('Gingko biloba','Ginkgo biloba 28%'),true);
 assert.equal(equivalentProduct('Espinheira Santa Extrato','Espinheira Santa Extrato Seco'),true);
 assert.equal(equivalentProduct('Magnésio Quelato 20%','Magnesio Quelato 25%'),true);
 assert.equal(equivalentProduct('Aspartato de Magnésio','Magnésio Taurato'),false);
 assert.notEqual(productKey('Magnésio Citrato'),productKey('Magnésio Taurato'));
});
test('agregador reúne ofertas sem somar a necessidade duplicada',()=>{
 const state={version:1,productAliases:[],suppliers:[supplier('X'),supplier('Y')],items:[{...item('a'),name:'Gingko biloba',qty:100},{...item('b'),name:'Ginkgo biloba 28%',qty:200}],offers:[offer('1','a','X',10000),offer('2','b','Y',18000)]};
 const grouped=aggregateEquivalentItems(state);assert.equal(grouped.items.length,1);assert.equal(grouped.items[0].qty,200);assert.equal(new Set(grouped.offers.map(o=>o.productId)).size,1);assert.equal(grouped.offers.length,2);
});
test('equivalência aprendida relaciona nomes fora do padrão',()=>{
 const aliases=[{alias:'Nome comercial XPTO',canonical:'Espinheira Santa'}];assert.equal(equivalentProduct('Nome comercial XPTO','Espinheira Santa Extrato Seco',aliases),true);
});
test('base Pharmapenha usa somente sinônimos de matérias-primas',()=>{
 assert.equal(Object.keys(materialSynonyms).length,4685);
 assert.equal(materialSynonyms['balde bco 10lt'],undefined);
 assert.equal(materialSynonyms['tadalafila 5mg 60 capsulas'],undefined);
 assert.equal(equivalentProduct('Taraxacum officinale','Dente de Leão Extrato Seco'),true);
 assert.equal(equivalentProduct('Tongkat Ali Extrato Seco','Long Jack'),true);
 assert.equal(equivalentProduct('Maytenus ilicifolia','Espinheira Santa Extrato'),true);
 assert.equal(equivalentProduct('Quitina diacetilada','Quitosana'),true);
 assert.equal(equivalentProduct('Ginkgo Biloba Extrato Seco','Gingko Biloba 28%'),true);
 assert.equal(equivalentProduct('Cálcio','Cálcio Bisglicinato'),false);
});
test('todos os nomes da base podem ser normalizados sem ciclos',()=>{for(const name of Object.keys(materialSynonyms))assert.doesNotThrow(()=>productKey(name))});
