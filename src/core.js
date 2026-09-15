export const defaultSuppliers = [
 ['Biovital',600],['Galena',1000],['Caldic',500],['Gamma',450],['Iberoquimica',650],['Purifarma',600],['Sovita',600],['PN farma',500],['Cosmetrade',450],['Lemma',800],['Formus',500],['Irial Mag',400],['Valdequimica',450],['Embrafarma (All Premium)',500],['Fagron',600],['Florien',600],['Global Supplies',550],['Exata',700],['Infinity Pharma',600],['Sixty Pharma',500],['Nutrifarm',650]
].map(([name,min],i)=>({id:`s${i+1}`,name,minCents:min*100,freightCents:0,freightKnown:false,minimumBasis:'net'}));
export const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
export const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function cleanProductText(name){
 const source=String(name).replace(/\b\d+(?:[.,]\d+)?\s*%/g,' ').replace(/\b\d+\s*(?:x|:)\s*\d+\b/g,' ').replace(/\b\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?\b.*$/g,' ');
 let value=normalize(source).replace(/\b(?:lote|lot|validade|vencimento)\b.*$/g,' ').replace(/\bp\s*344\b/g,' ').replace(/\b(?:lycopene|licopene)\b/g,'licopeno').replace(/\bgingko\b/g,'ginkgo').replace(/\b(?:tricoxin|trichoxin)\b/g,'auxina tricogena');
 if(!/\b(?:vitamina|tiamina)\s+b1\b/.test(value))value=value.replace(/\b(?:b1|c1)\b/g,' ');
 value=value.replace(/\b(?:brasil|china)\b/g,' ');
 if(!/\b(?:castanha|noz)\s+da\s+india\b/.test(value))value=value.replace(/\bindia\b/g,' ');
 return value.replace(/\s+/g,' ').trim();
}
export function productKey(name,aliases=[]){
 const raw=cleanProductText(name);
 const learned=aliases.find(a=>cleanProductText(a.alias)===raw);
 if(learned&&cleanProductText(learned.canonical)!==raw)return productKey(learned.canonical,aliases.filter(a=>a!==learned));
	 let chemicalForm=/\b(?:magnesio|calcio|zinco|cobre|ferro|manganes|cromo|selenio)\b/.test(raw)?raw.replace(/\b(?:quelato|quelatado|quelatada|glicina|bisglicinato|bisglicinata)\b/g,'quelato'):raw;
	 chemicalForm=chemicalForm.replace(/\bquelato\s+(?:de\s+)?(magnesio|calcio|zinco|cobre|ferro|manganes|cromo|selenio)\b/g,'$1 quelato');
	 const simplified=chemicalForm
	  .replace(/\bp\s*\d+\b/g,' ')
	  .replace(/\b(?:hcl|hidrocloreto|cloridrato)\b/g,' ')
	  .replace(/\b(?:de|da|do|das|dos)\b/g,' ')
	  .replace(/\b(?:extrato seco|ext seco|e s|extrato|em po|po)\b/g,' ')
  .replace(/\b(?:anidro|anidra|hidratado|hidratada|monohidratado|monohidratada|dihidratado|dihidratada|trihidratado|trihidratada|tetrahidratado|tetrahidratada|tetrahidrata|tetrahidrato)\b/g,' ')
  .replace(/\s+/g,' ').trim();
 let catalog=materialSynonyms[chemicalForm];
 if(!catalog||catalog===raw)catalog=materialSynonyms[simplified];
 if(catalog&&catalog!==raw&&catalog!==simplified)return productKey(catalog,aliases);
 return simplified;
}
export const equivalentProduct=(a,b,aliases=[])=>productKey(a,aliases)===productKey(b,aliases);
export const synonymStats={materials:new Set(Object.values(materialSynonyms)).size,names:Object.keys(materialSynonyms).length,ambiguous:Object.keys(materialSynonymConflicts).length};
function plantForm(name){const value=cleanProductText(name);if(/\bextrato\s+glicolico\b/.test(value))return'glicolico';if(/\bextrato\s+fluido\b/.test(value))return'fluido';if(/\btintura\b/.test(value))return'tintura';return''}
function plantBase(name){return cleanProductText(name).replace(/\b(?:tintura|extrato\s+glicolico|extrato\s+fluido)\b/g,' ').replace(/\b(?:de|da|do|das|dos)\b/g,' ').replace(/\s+/g,' ').trim()}
function editSimilarity(a,b){const x=String(a),y=String(b),row=Array.from({length:y.length+1},(_,i)=>i);for(let i=1;i<=x.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=y.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(x[i-1]===y[j-1]?0:1));previous=old}}return 1-row[y.length]/Math.max(x.length,y.length,1)}
export function productSimilarity(a,b,aliases=[]){
 if(equivalentProduct(a,b,aliases))return 1;
 const formA=plantForm(a),formB=plantForm(b);if(plantBase(a)===plantBase(b)&&plantBase(a)){if(new Set([formA,formB]).has('glicolico')&&new Set([formA,formB]).has('fluido'))return 0;if(formA==='tintura'&&(formB==='glicolico'||formB==='fluido')||formB==='tintura'&&(formA==='glicolico'||formA==='fluido'))return .95}
 const stop=new Set(['de','da','do','das','dos','e','para','com','como']);
 const tokens=s=>new Set(productKey(s,aliases).split(' ').filter(x=>x.length>1&&!stop.has(x)));
 const x=tokens(a),y=tokens(b);if(!x.size||!y.size)return 0;
 const common=[...x].filter(t=>y.has(t)).length;
 const words=common/Math.max(x.size,y.size),left=[...x].join(' '),right=[...y].join(' '),spelling=Math.min(left.length,right.length)>=6&&Math.abs(left.length-right.length)<=3?editSimilarity(left,right):0;
 return Math.max(words,spelling>=.8?spelling:0);
}
function nameComplexity(name){
 const value=normalize(name),qualifiers=(value.match(/\b(?:hcl|hidrocloreto|cloridrato|extrato|ext|seco|anidro|hidratado|quelato|glicina|bisglicinato|p\s*\d+|\d+)\b/g)||[]).length;
 return qualifiers*100+value.split(' ').length*10+value.length;
}
export function equivalentGroups(items,offers,aliases=[],ignored=[]){
 const quoted=items.filter(item=>offers.some(offer=>offer.productId===item.id)),parent=new Map(quoted.map(item=>[item.id,item.id]));
 const root=id=>{let current=id;while(parent.get(current)!==current)current=parent.get(current);return current};
 const join=(a,b)=>{const x=root(a),y=root(b);if(x!==y)parent.set(y,x)};
 const ignoredKey=(a,b)=>[normalize(a.name),normalize(b.name)].sort().join('|'),ambiguous=[];
 for(let a=0;a<quoted.length;a++)for(let b=a+1;b<quoted.length;b++){const x=quoted[a],y=quoted[b],forms=[plantForm(x.name),plantForm(y.name)];if(x.unit!==y.unit||ignored.includes(ignoredKey(x,y))||productSimilarity(x.name,y.name,aliases)<.6)continue;if(forms.includes('tintura')&&(forms.includes('glicolico')||forms.includes('fluido')))ambiguous.push([x,y]);else join(x.id,y.id)}
 const sets=new Map();for(const item of quoted){const key=root(item.id);if(!sets.has(key))sets.set(key,[]);sets.get(key).push(item)}
 const regular=[...sets.values()].filter(group=>group.length>1&&new Set(group.flatMap(item=>offers.filter(o=>o.productId===item.id).map(o=>o.supplierId))).size>1).map(group=>{
  const ordered=[...group].sort((a,b)=>nameComplexity(a.name)-nameComplexity(b.name)||a.name.localeCompare(b.name,'pt-BR'));
  return {primary:ordered[0],alternatives:ordered.slice(1),supplierIds:[...new Set(group.flatMap(item=>offers.filter(o=>o.productId===item.id).map(o=>o.supplierId)))]};
 });
 const botanical=ambiguous.filter(group=>new Set(group.flatMap(item=>offers.filter(o=>o.productId===item.id).map(o=>o.supplierId))).size>1).map(group=>{const primary=group.find(item=>plantForm(item.name)!=='tintura'),alternative=group.find(item=>item.id!==primary.id);return{primary,alternatives:[alternative],supplierIds:[...new Set(group.flatMap(item=>offers.filter(o=>o.productId===item.id).map(o=>o.supplierId)))]}});
 return [...regular,...botanical];
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
  if(o.productId!==item.id||o.unit!==item.unit||o.available===false||o.considered===false||o.reviewed!==true||!suppliers.some(s=>s.id===o.supplierId))continue;
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
export function ordersFor(lines,suppliers,ignoreMinimum=false){
 return suppliers.flatMap(s=>{
  const rows=lines.filter(r=>r.supplierId===s.id);if(!rows.length)return[];
  const net=rows.reduce((t,r)=>t+r.net,0),gross=rows.reduce((t,r)=>t+r.gross,0);
  const basis=s.minimumBasis==='gross'?gross:net,shortfall=Math.max(0,s.minCents-basis),meetsMinimum=shortfall===0;
  return [{supplier:s,lines:rows,net,gross,tax:gross-net,total:gross+s.freightCents,basis,valid:ignoreMinimum||meetsMinimum,meetsMinimum,shortfall}];
 });
}
export function lowestSelections(choices){
 const best=new Map();for(const c of choices||[]){const old=best.get(c.itemId);if(!old||c.gross<old.gross||(c.gross===old.gross&&(c.excess||0)<(old.excess||0)))best.set(c.itemId,c)}return Object.fromEntries([...best].map(([itemId,c])=>[itemId,c.offerId]));
}
export function choiceHighlights(choices){
 const groups=new Map(),result={};
 for(const c of choices||[]){
  if(!groups.has(c.itemId))groups.set(c.itemId,[]);
  groups.get(c.itemId).push(c);
 }
 for(const rows of groups.values()){
  const unitBest=rows.reduce((a,b)=>b.pricePerUnit<a.pricePerUnit?b:a),
        outlayBest=rows.reduce((a,b)=>b.gross<a.gross?b:a),
        minUnit=unitBest.pricePerUnit,
        minOutlay=outlayBest.gross;
  for(const c of rows){
   const lowestUnit=Math.abs(c.pricePerUnit-minUnit)<1e-9,
         lowestOutlay=c.gross===minOutlay;
   result[c.offerId]={
    lowestUnit,
    lowestOutlay,
    unitPremiumPercent:lowestOutlay&&!lowestUnit?Math.round((c.pricePerUnit/minUnit-1)*1000)/10:0,
    savingsAgainstUnitBest:lowestOutlay&&!lowestUnit?Math.max(0,unitBest.gross-c.gross):0
   };
  }
 }
 return result;
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
 const baselineOrders=ordersFor(baseline,suppliers,true),baselineTotal=baseline.reduce((t,o)=>t+o.gross,0),total=baselineOrders.reduce((t,o)=>t+o.total,0);
 return {status:'feasible',optimal:true,nodes,lines:baseline,orders:baselineOrders,total,baselineTotal,baselineOrders,suggestedOrders:bestLines?ordersFor(bestLines,suppliers):[],suggestedTotal:bestLines?best:null,suggestionStatus:bestLines?'feasible':truncated?'inconclusive':'infeasible',changes:bestLines?bestLines.filter(o=>baseline.find(b=>b.itemId===o.itemId)?.offerId!==o.offerId).map(o=>({product:o.product,from:config[baseline.find(b=>b.itemId===o.itemId).supplierId].name,to:config[o.supplierId].name,difference:o.gross-baseline.find(b=>b.itemId===o.itemId).gross})):[],missing:[]};
}
export function validateState(s){
 if(!s||s.version!==1||!Array.isArray(s.suppliers)||!Array.isArray(s.items)||!Array.isArray(s.offers))throw Error('Arquivo de rodada inválido.');
 if(s.items.length>300||s.offers.length>6000||s.suppliers.length>100)throw Error('Limite: 300 itens, 6.000 ofertas e 100 fornecedores.');
 for(const list of [s.suppliers,s.items,s.offers])if(new Set(list.map(x=>x.id)).size!==list.length)throw Error('Identificadores duplicados.');
 for(const x of s.suppliers)if(typeof x.name!=='string'||!Number.isSafeInteger(x.minCents)||x.minCents<0||!Number.isSafeInteger(x.freightCents)||x.freightCents<0||!['net','gross'].includes(x.minimumBasis))throw Error('Cadastro de fornecedor inválido.');
 for(const x of s.items)if(typeof x.name!=='string'||!['g','ml','un'].includes(x.unit)||!Number.isFinite(x.qty)||x.qty<=0)throw Error('Item inválido.');
 for(const x of s.offers)if(!s.items.some(i=>i.id===x.productId)||!s.suppliers.some(a=>a.id===x.supplierId)||!['g','ml','un'].includes(x.unit)||!Number.isFinite(x.packQty)||x.packQty<=0||!Number.isSafeInteger(x.netCents)||x.netCents<0||!Number.isSafeInteger(x.grossCents)||x.grossCents<x.netCents)throw Error('Oferta inválida.');
 for(const x of s.offers)if(x.considered===false&&String(x.exclusionReason||'').trim().length<10)throw Error('Oferta desconsiderada sem motivo suficiente.');
 if(s.productAliases!=null&&(!Array.isArray(s.productAliases)||s.productAliases.length>1000||s.productAliases.some(a=>!a||typeof a.alias!=='string'||typeof a.canonical!=='string')))throw Error('Equivalências de produtos inválidas.');
 s.productAliases??=[];
 if(s.ignoredEquivalences!=null&&(!Array.isArray(s.ignoredEquivalences)||s.ignoredEquivalences.length>2000||s.ignoredEquivalences.some(x=>typeof x!=='string')))throw Error('Decisões de equivalência inválidas.');
 s.ignoredEquivalences??=[];
 return s;
}
import {materialSynonyms,materialSynonymConflicts} from './synonyms.generated.js';
