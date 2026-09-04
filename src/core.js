export const defaultSuppliers = [
 ['Biovital',600],['Galena',1000],['Caldic',500],['Gamma',450],['Iberoquimica',650],['Purifarma',600],['Sovita',600],['PN farma',500],['Cosmetrade',450],['Lemma',800],['Formus',500],['Irial Mag',400],['Valdequimica',450],['Embrafarma (All Premium)',500],['Fagron',600],['Florien',600],['Global Supplies',550],['Exata',700],['Infinity Pharma',600],['Sixty Pharma',500],['Nutrifarm',650]
].map(([name,min],i)=>({id:`s${i+1}`,name,minCents:min*100,freightCents:0,freightKnown:false,minimumBasis:'net'}));
export const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
export const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function productKey(name,aliases=[]){
 const raw=normalize(name).replace(/\bgingko\b/g,'ginkgo');
 const learned=aliases.find(a=>normalize(a.alias)===raw);
 if(learned&&normalize(learned.canonical)!==raw)return productKey(learned.canonical,aliases.filter(a=>a!==learned));
 const simplified=raw
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:por cento)?\b/g,' ')
  .replace(/\b\d+\s*(?:x|:)\s*\d+\b/g,' ')
  .replace(/\b(?:extrato seco|ext seco|e s|extrato|em po|po)\b/g,' ')
  .replace(/\b(?:anidro|anidra|hidratado|hidratada|monohidratado|monohidratada|dihidratado|dihidratada|trihidratado|trihidratada|tetrahidratado|tetrahidratada|tetrahidrata|tetrahidrato)\b/g,' ')
  .replace(/\s+/g,' ').trim();
 let catalog=materialSynonyms[raw];
 if(!catalog||catalog===raw)catalog=materialSynonyms[simplified];
 if(catalog&&catalog!==raw&&catalog!==simplified)return productKey(catalog,aliases);
 return simplified;
}
export const equivalentProduct=(a,b,aliases=[])=>productKey(a,aliases)===productKey(b,aliases);
export const synonymStats={materials:new Set(Object.values(materialSynonyms)).size,names:Object.keys(materialSynonyms).length,ambiguous:Object.keys(materialSynonymConflicts).length};
export function productSimilarity(a,b,aliases=[]){
 if(equivalentProduct(a,b,aliases))return 1;
 const stop=new Set(['de','da','do','das','dos','e','para','com','como']);
 const tokens=s=>new Set(productKey(s,aliases).split(' ').filter(x=>x.length>1&&!stop.has(x)));
 const x=tokens(a),y=tokens(b);if(!x.size||!y.size)return 0;
 const common=[...x].filter(t=>y.has(t)).length;
 return common/Math.max(x.size,y.size);
}
export function aggregateEquivalentItems(state){
 const next=structuredClone(state),aliases=next.productAliases||[],groups=new Map();
 for(const item of next.items){
  const key=`${item.unit}:${productKey(item.name,aliases)}`,target=groups.get(key);
  if(!target){groups.set(key,item);continue}
  target.qty=Math.max(target.qty,item.qty);target.enabled=target.enabled!==false||item.enabled!==false;target.allowExcess=Boolean(target.allowExcess||item.allowExcess);if(target.lock!==item.lock)target.lock='';
  for(const offer of next.offers)if(offer.productId===item.id)offer.productId=target.id;
  next.items=next.items.filter(x=>x.id!==item.id);
 }
 return next;
}
export function decimal(s){
 if(typeof s==='number')return s;
 const v=String(s).trim().replace(/R\$/g,'').replace(/\s/g,'');
 if(!/^-?[\d.,]+$/.test(v))return NaN;
 return Number(v.includes(',')?v.replace(/\./g,'').replace(',','.'):v);
}
export const cents=s=>Math.round(decimal(s)*100);
export function quantity(n,unit){
 const u=String(unit).trim().toLowerCase();const units={g:['g',1],kg:['g',1000],mg:['g',.001],ml:['ml',1],l:['ml',1000],un:['un',1],mlh:['un',1000],mil:['un',1000]};
 if(!units[u]||!Number.isFinite(n)||n<=0)throw Error('Quantidade ou unidade inválida.');
 return {qty:Math.round(n*units[u][1]*1e6)/1e6,unit:units[u][0]};
}
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export function candidates(item,offers,suppliers,date=today()){
 const out=[];
 if(!Number.isFinite(item.qty)||item.qty<=0)return out;
 for(const o of offers){
  if(o.productId!==item.id||o.unit!==item.unit||o.available===false||o.reviewed!==true||!suppliers.some(s=>s.id===o.supplierId))continue;
  if(item.lock&&o.supplierId!==item.lock)continue;
  if(!Number.isFinite(o.packQty)||o.packQty<=0||!Number.isSafeInteger(o.netCents)||o.netCents<=0||!Number.isSafeInteger(o.grossCents)||o.grossCents<o.netCents)continue;
  const ratio=item.qty/o.packQty;const packs=Math.ceil(ratio-1e-9);
  if(!item.allowExcess&&Math.abs(packs*o.packQty-item.qty)>1e-6)continue;
  if(o.maxPacks!=null&&packs>o.maxPacks)continue;
  const net=packs*o.netCents,gross=packs*o.grossCents;
  if(!Number.isSafeInteger(net)||!Number.isSafeInteger(gross))continue;
  out.push({itemId:item.id,offerId:o.id,supplierId:o.supplierId,packs,qty:packs*o.packQty,unit:o.unit,net,gross,excess:Math.max(0,packs*o.packQty-item.qty),pricePerUnit:o.grossCents/o.packQty,product:item.name,description:o.description||item.name,reference:o.reference||'',packQty:o.packQty,unitNet:o.netCents,unitGross:o.grossCents});
 }
 return out.sort((a,b)=>a.gross-b.gross||a.excess-b.excess);
}
export function ordersFor(lines,suppliers){
 return suppliers.flatMap(s=>{
  const rows=lines.filter(r=>r.supplierId===s.id);if(!rows.length)return[];
  const net=rows.reduce((t,r)=>t+r.net,0),gross=rows.reduce((t,r)=>t+r.gross,0);
  const basis=s.minimumBasis==='gross'?gross:net;
  return [{supplier:s,lines:rows,net,gross,tax:gross-net,total:gross+s.freightCents,basis,valid:basis>=s.minCents,shortfall:Math.max(0,s.minCents-basis)}];
 });
}
// Exact branch-and-bound within a bounded search. One supplier per requested item.
// A truncated search is explicitly not a proof of optimality or infeasibility.
export function optimize(items,offers,suppliers,{maxNodes=1500000,maxMs=2500,date=today()}={}){
 const needed=items.filter(i=>i.enabled!==false);
 const groups=needed.map(item=>({item,options:candidates(item,offers,suppliers,date)}));
 const missing=groups.filter(g=>!g.options.length).map(g=>g.item.name);
 if(!groups.length)return {status:'empty',orders:[],lines:[],missing:[],optimal:false};
 if(missing.length)return {status:'missing',orders:[],lines:[],missing,optimal:false};
 groups.sort((a,b)=>a.options.length-b.options.length);
 const mins=Object.fromEntries(suppliers.map(s=>[s.id,s.minCents]));
 const config=Object.fromEntries(suppliers.map(s=>[s.id,s]));
 const sums={},used={},chosen=[];let best=Infinity,bestLines=null,nodes=0,truncated=false;const start=Date.now();
 const lower=Array(groups.length+1).fill(0);for(let i=groups.length-1;i>=0;i--)lower[i]=lower[i+1]+groups[i].options[0].gross;
 const remaining=Array.from({length:groups.length+1},()=>({}));
 for(let i=groups.length-1;i>=0;i--){remaining[i]={...remaining[i+1]};const mx={};for(const o of groups[i].options){const v=config[o.supplierId].minimumBasis==='gross'?o.gross:o.net;mx[o.supplierId]=Math.max(mx[o.supplierId]||0,v)}for(const [s,v]of Object.entries(mx))remaining[i][s]=(remaining[i][s]||0)+v}
 function visit(i,cost){
  nodes++;if(nodes>maxNodes||(nodes%1024===0&&Date.now()-start>maxMs)){truncated=true;return}
  if(cost+lower[i]>=best)return;
  for(const s of Object.keys(used))if(used[s]&&(sums[s]||0)+(remaining[i][s]||0)<mins[s])return;
  if(i===groups.length){if(Object.keys(used).some(s=>used[s]&&sums[s]<mins[s]))return;best=cost;bestLines=chosen.map(o=>({...o}));return}
  for(const o of groups[i].options){if(truncated)return;const s=o.supplierId;const extra=used[s]?0:config[s].freightCents;const v=config[s].minimumBasis==='gross'?o.gross:o.net;used[s]=(used[s]||0)+1;sums[s]=(sums[s]||0)+v;chosen.push(o);visit(i+1,cost+o.gross+extra);chosen.pop();sums[s]-=v;used[s]--;}
 }
 visit(0,0);
 const baseline=groups.map(g=>g.options[0]);
 return {status:bestLines?'feasible':truncated?'inconclusive':'infeasible',optimal:!truncated&&!!bestLines,nodes,lines:bestLines||[],orders:bestLines?ordersFor(bestLines,suppliers):[],total:bestLines?best:null,baselineTotal:baseline.reduce((t,o)=>t+o.gross,0),baselineOrders:ordersFor(baseline,suppliers),changes:bestLines?bestLines.filter(o=>baseline.find(b=>b.itemId===o.itemId)?.offerId!==o.offerId).map(o=>({product:o.product,from:config[baseline.find(b=>b.itemId===o.itemId).supplierId].name,to:config[o.supplierId].name,difference:o.gross-baseline.find(b=>b.itemId===o.itemId).gross})):[],missing:[]};
}
export function validateState(s){
 if(!s||s.version!==1||!Array.isArray(s.suppliers)||!Array.isArray(s.items)||!Array.isArray(s.offers))throw Error('Arquivo de rodada inválido.');
 if(s.items.length>300||s.offers.length>6000||s.suppliers.length>100)throw Error('Limite: 300 itens, 6.000 ofertas e 100 fornecedores.');
 for(const list of [s.suppliers,s.items,s.offers])if(new Set(list.map(x=>x.id)).size!==list.length)throw Error('Identificadores duplicados.');
 for(const x of s.suppliers)if(typeof x.name!=='string'||!Number.isSafeInteger(x.minCents)||x.minCents<0||!Number.isSafeInteger(x.freightCents)||x.freightCents<0||!['net','gross'].includes(x.minimumBasis))throw Error('Cadastro de fornecedor inválido.');
 for(const x of s.items)if(typeof x.name!=='string'||!['g','ml','un'].includes(x.unit)||!Number.isFinite(x.qty)||x.qty<=0)throw Error('Item inválido.');
 for(const x of s.offers)if(!s.items.some(i=>i.id===x.productId)||!s.suppliers.some(a=>a.id===x.supplierId)||!['g','ml','un'].includes(x.unit)||!Number.isFinite(x.packQty)||x.packQty<=0||!Number.isSafeInteger(x.netCents)||x.netCents<0||!Number.isSafeInteger(x.grossCents)||x.grossCents<x.netCents)throw Error('Oferta inválida.');
 if(s.productAliases!=null&&(!Array.isArray(s.productAliases)||s.productAliases.length>1000||s.productAliases.some(a=>!a||typeof a.alias!=='string'||typeof a.canonical!=='string')))throw Error('Equivalências de produtos inválidas.');
 s.productAliases??=[];
 if(s.ignoredEquivalences!=null&&(!Array.isArray(s.ignoredEquivalences)||s.ignoredEquivalences.length>2000||s.ignoredEquivalences.some(x=>typeof x!=='string')))throw Error('Decisões de equivalência inválidas.');
 s.ignoredEquivalences??=[];
 return s;
}
import {materialSynonyms,materialSynonymConflicts} from './synonyms.generated.js';
