const isoDate=date=>`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
const fromIso=value=>{const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3]))):null};
const shift=(value,days)=>{const date=typeof value==='string'?fromIso(value):new Date(value);if(!date||Number.isNaN(date.getTime()))return String(value||'');date.setUTCDate(date.getUTCDate()+days);return isoDate(date)};

// Algoritmo gregoriano de Meeus/Jones/Butcher.
function easterSunday(year){
 const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
 return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

export function saoPauloBankHolidays(year){
 const easter=easterSunday(Number(year)),rows=[
  [`${year}-01-01`,'Confraternização Universal'],
  [`${year}-01-25`,'Aniversário de São Paulo'],
  [shift(easter,-48),'Segunda-feira de Carnaval'],
  [shift(easter,-47),'Terça-feira de Carnaval'],
  [shift(easter,-2),'Sexta-feira da Paixão'],
  [`${year}-04-21`,'Tiradentes'],
  [`${year}-05-01`,'Dia do Trabalho'],
  [shift(easter,60),'Corpus Christi'],
  [`${year}-07-09`,'Revolução Constitucionalista'],
  [`${year}-09-07`,'Independência do Brasil'],
  [`${year}-10-12`,'Nossa Senhora Aparecida'],
  [`${year}-11-02`,'Finados'],
  [`${year}-11-15`,'Proclamação da República'],
  [`${year}-11-20`,'Consciência Negra'],
  [`${year}-12-25`,'Natal'],
  [`${year}-12-31`,'Sem compensação bancária']
 ];
 return new Map(rows)
}

export function bankingDayInfo(value){
 const date=fromIso(value);if(!date)return {business:true,label:'',kind:''};
 const day=date.getUTCDay(),holiday=saoPauloBankHolidays(date.getUTCFullYear()).get(value);
 if(holiday)return {business:false,label:holiday,kind:'holiday'};
 if(day===0||day===6)return {business:false,label:'Fim de semana',kind:'weekend'};
 return {business:true,label:'Dia útil bancário',kind:'business'}
}

export function effectivePaymentDate(value){
 let date=String(value||'');
 for(let i=0;i<12&&!bankingDayInfo(date).business;i++)date=shift(date,1);
 return date
}

