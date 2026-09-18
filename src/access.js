export const isFinanceRole=role=>['finance','financeiro'].includes(String(role||'').trim().toLowerCase());
const financeActions=new Set(['payables-month','payables-day','payables-filter','payable-edit','manual-payable','close','cloud-logout']);
export const canUseAction=(role,action)=>!isFinanceRole(role)||financeActions.has(action)||(action==='tab');
export const canOpenView=(role,view)=>!isFinanceRole(role)||view==='payables';
export const initialViewForRole=role=>isFinanceRole(role)?'payables':'home';
