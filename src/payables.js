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
 return {id:existing?.id||crypto.randomUUID(),supplierId:order.supplier.id,supplierName:order.supplier.name,orderSavedAt:savedAt,billingDate,paymentTerms,orderTotalCents:total,installments:scheduleFromTerms(total,paymentTerms,billingDate),updatedAt:new Date().toISOString()}
}
export function payableFromClosing(closing){return closing?.order?payableFromOrder(closing.order,closing.savedAt):null}
