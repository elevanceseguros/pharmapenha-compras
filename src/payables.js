export function dateOnly(value=new Date()){
 if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function addDays(date,days){const [y,m,d]=dateOnly(date).split('-').map(Number),next=new Date(Date.UTC(y,m-1,d));next.setUTCDate(next.getUTCDate()+Number(days||0));return next.toISOString().slice(0,10)}
export function parsePaymentDays(value){return String(value||'').split('/').map(part=>Number((part.match(/\d+/)||[])[0])).filter(n=>Number.isInteger(n)&&n>=0&&n<=3650)}
export function splitCents(total,count){if(!count)return[];const base=Math.floor(Number(total||0)/count),remainder=Number(total||0)-base*count;return Array.from({length:count},(_,i)=>base+(i<remainder?1:0))}
export function scheduleFromTerms(total,terms,billingDate){const days=parsePaymentDays(terms),amounts=splitCents(total,days.length);return days.map((day,i)=>({id:crypto.randomUUID(),sequence:i+1,days:day,dueDate:addDays(billingDate,day),amountCents:amounts[i],paid:false,note:''}))}
export function payableFromOrder(order,savedAt=new Date().toISOString(),existing=null){
 const billingDate=dateOnly(existing?.billingDate||savedAt),paymentTerms=order.payment||existing?.paymentTerms||'',total=Number(order.total||0);
 return {id:existing?.id||crypto.randomUUID(),supplierId:order.supplier.id,supplierName:order.supplier.name,orderSavedAt:savedAt,billingDate,paymentTerms,orderTotalCents:total,installments:scheduleFromTerms(total,paymentTerms,billingDate),verified:false,verifiedAt:null,updatedAt:new Date().toISOString()}
}
export function payableFromClosing(closing){return closing?.order?payableFromOrder(closing.order,closing.savedAt):null}
export function paymentLoadLevel(totalCents){const total=Number(totalCents||0);return total<=0?'empty':total<=150000?'light':total<=250000?'medium':'busy'}
export function projectedPaymentLoads(payables,order,savedAt=new Date().toISOString(),effectiveDate=value=>value){
 const projected=payableFromOrder(order,savedAt),existing=(payables||[]).flatMap(p=>(p.installments||[]).map(i=>({date:effectiveDate(i.dueDate),amountCents:Number(i.amountCents||0)}))),fresh=(projected.installments||[]).map(i=>({date:effectiveDate(i.dueDate),amountCents:Number(i.amountCents||0)})),totals={};
 for(const row of [...existing,...fresh])totals[row.date]=(totals[row.date]||0)+row.amountCents;
 return [...new Set(fresh.map(row=>row.date))].sort().map(date=>({date,totalCents:totals[date]||0,level:paymentLoadLevel(totals[date]||0)}))
}
export function roundTitleKey(value){return String(value||'').trim().toLocaleLowerCase('pt-BR')}
export function dedupeRoundsByTitle(rows){
 const sorted=[...rows].sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0)),seen=new Set();
 return sorted.filter(row=>{const key=roundTitleKey(row.title||row.state?.title);if(!key||seen.has(key))return false;seen.add(key);return true})
}
