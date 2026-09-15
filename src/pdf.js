import {jsPDF} from 'jspdf';
import {zipSync} from 'fflate';
import {money} from './core.js';
const clean=s=>String(s??'').replace(/[\u0000-\u001f]/g,' ').replace(/[–—]/g,'-').replace(/[^\u0020-\u00ff]/g,' ');
export const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80);
export function orderPDF(order,buyer,round,date=new Date()){
 if(!order.valid)throw Error('Pedido abaixo do mínimo. PDF bloqueado.');
 const doc=new jsPDF();const pages=[];let y=20;
 const freightKnown=order.freightKnown??order.supplier.freightKnown,freightCents=order.freightCents??order.supplier.freightCents;
 const text=(s,x,yy,opt)=>doc.text(clean(s),x,yy,opt);
 function header(){doc.setFont('helvetica','bold');doc.setFontSize(17);text('PEDIDO DE COMPRA',15,18);doc.setFontSize(11);text('Pharmapenha',15,26);doc.setFont('helvetica','normal');doc.setFontSize(9);const lines=doc.splitTextToSize(clean(`${round} | ${date.toLocaleDateString('pt-BR')}`),180);lines.forEach((l,i)=>text(l,15,33+i*4.5));y=38+lines.length*4.5;const vendor=doc.splitTextToSize(clean(`Fornecedor: ${order.supplier.name}`),180);vendor.forEach((l,i)=>text(l,15,y+i*4.5));y+=vendor.length*4.5+6}
 function page(){doc.addPage();header()}
 function para(s){const lines=doc.splitTextToSize(clean(s),179);for(const l of lines){if(y>268)page();text(l,15,y);y+=5}}
 header();para(`Comprador: ${buyer.name||'Pharmapenha'}`);if(buyer.cnpj)para(`CNPJ: ${buyer.cnpj}`);if(buyer.address)para(`Entrega: ${buyer.address}`);if(buyer.contact)para(`Contato: ${buyer.contact}`);para(`Condição de pagamento: ${order.payment||'a combinar'}`);y+=4;
 function tableHeader(){doc.setFillColor(230,239,246);doc.rect(15,y-4,180,9,'F');doc.setFont('helvetica','bold');text('Produto / referência',17,y+2);text('Embalagens',119,y+2);text('Unitário',162,y+2,{align:'right'});text('Total',193,y+2,{align:'right'});doc.setFont('helvetica','normal');y+=12}
 tableHeader();
 for(const line of order.lines){
  const description=doc.splitTextToSize(clean(line.description),92);
  const refs=line.reference?doc.splitTextToSize(`Cotação: ${clean(line.reference)}`,92):[];
  const height=Math.max(16,(description.length+refs.length)*4.5+5);
  if(y+height>267){page();tableHeader()}
  description.forEach((s,i)=>text(s,17,y+i*4.5));doc.setTextColor(90);refs.forEach((s,i)=>text(s,17,y+(description.length+i)*4.5));doc.setTextColor(0);
  text(`${line.packs} x ${line.packQty} ${line.unit}`,119,y);text(money(line.unitGross),162,y,{align:'right'});text(money(line.gross),193,y,{align:'right'});
  y+=height;doc.setDrawColor(215);doc.line(15,y-3,195,y-3);
 }
 if(y>225)page();y+=4;para(`Produtos sem impostos: ${money(order.net)}`);para(`Impostos informados: ${money(order.tax)}`);para(`Produtos com impostos: ${money(order.gross)}`);para(`Frete: ${freightKnown?money(freightCents):'a confirmar (não incluído)'}`);doc.setFont('helvetica','bold');para(`Total ${freightKnown?'do pedido':'estimado'}: ${money(order.total)}`);doc.setFont('helvetica','normal');
 if(buyer.notes){y+=4;para(`Observações: ${buyer.notes}`)}
 y+=4;para('Favor confirmar disponibilidade, validade, condições de pagamento e prazo de entrega.');
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);text(`Página ${i} de ${n}`,195,286,{align:'right'})}
 return new Uint8Array(doc.output('arraybuffer'));
}
export function download(bytes,name,type='application/pdf'){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
export function allPDFs(orders,buyer,round){const files={};orders.forEach((o,i)=>{files[`${i+1}-Pedido-${slug(o.supplier.name)}.pdf`]=orderPDF(o,buyer,round)});return zipSync(files)}
export function internalReportPDF(orders,audit,round,date=new Date()){
 const doc=new jsPDF();let y=20;const text=(s,x,yy,opt)=>doc.text(clean(s),x,yy,opt);
 function header(){doc.setFillColor(49,85,31);doc.rect(0,0,210,37,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(17);text('RELATÓRIO INTERNO DA COMPRA',15,17);doc.setFontSize(9);text('USO INTERNO - PHARMAPENHA',15,25);doc.setFont('helvetica','normal');text(`${round} | ${date.toLocaleDateString('pt-BR')}`,195,25,{align:'right'});doc.setTextColor(33,48,36);y=47}
 function page(){doc.addPage();header()}
 function ensure(h=12){if(y+h>276)page()}
 function para(s,bold=false,x=15,width=179){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(9);for(const line of doc.splitTextToSize(clean(s),width)){ensure(5);text(line,x,y);y+=5}}
 function sectionTitle(title,subtitle=''){ensure(subtitle?22:15);y+=4;doc.setFillColor(238,247,232);doc.roundedRect(15,y-5,180,subtitle?18:11,2,2,'F');doc.setTextColor(49,85,31);doc.setFont('helvetica','bold');doc.setFontSize(11);text(title,20,y+2);if(subtitle){doc.setTextColor(94,113,87);doc.setFont('helvetica','normal');doc.setFontSize(8);text(subtitle,20,y+8)}doc.setTextColor(33,48,36);y+=subtitle?22:15}
 header();para('Documento consolidado para conferência dos pedidos e das notas fiscais. Não enviar aos fornecedores.');y+=3;
 const grandTotal=orders.reduce((t,o)=>t+o.total,0);doc.setFillColor(248,250,247);doc.roundedRect(15,y,87,22,3,3,'F');doc.roundedRect(108,y,87,22,3,3,'F');doc.setFontSize(8);doc.setTextColor(106,120,108);text('Total geral previsto',20,y+7);text('Fornecedores com pedido',113,y+7);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(49,85,31);text(money(grandTotal),20,y+16);text(String(orders.length),113,y+16);doc.setTextColor(33,48,36);y+=29;
 sectionTitle('PEDIDOS QUE SERÃO REALIZADOS','Separados por fornecedor para conferência com as notas fiscais.');
 for(const order of orders){ensure(30);doc.setFillColor(49,85,31);doc.roundedRect(15,y,180,13,2,2,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(11);text(order.supplier.name,20,y+8);text(money(order.total),190,y+8,{align:'right'});doc.setTextColor(33,48,36);y+=18;para(`Pagamento: ${order.payment||'a combinar'}   |   Frete: ${order.freightKnown?money(order.freightCents):'a confirmar'}`,false,20,170);y+=2;
  doc.setFillColor(244,247,243);doc.rect(20,y-4,170,8,'F');doc.setFont('helvetica','bold');doc.setFontSize(8);text('PRODUTO',23,y+1);text('EMBALAGENS',137,y+1,{align:'right'});text('TOTAL',187,y+1,{align:'right'});y+=9;
  for(const line of order.lines){ensure(12);const name=doc.splitTextToSize(clean(line.product||line.description),98),height=Math.max(10,name.length*4+3);name.forEach((v,i)=>text(v,23,y+i*4));doc.setFont('helvetica','normal');text(`${line.packs} x ${line.packQty} ${line.unit}`,137,y,{align:'right'});doc.setFont('helvetica','bold');text(money(line.gross),187,y,{align:'right'});y+=height;doc.setDrawColor(226,232,223);doc.line(20,y-3,190,y-3)}
  y+=2;doc.setFont('helvetica','bold');para(`Produtos: ${money(order.gross)}   |   Total do pedido: ${money(order.total)}`,true,20,170);y+=8;
 }
 if(!orders.length)para('Nenhum pedido foi selecionado.',true);
 const chosen=new Map();for(const order of orders)for(const line of order.lines)chosen.set(line.itemId,{line,supplier:order.supplier});
 const unselected=(audit.items||[]).filter(i=>i.enabled!==false&&!chosen.has(i.id));if(unselected.length){sectionTitle('PRODUTOS SEM COMPRA');for(const item of unselected)para(`${item.name} - necessidade: ${item.qty} ${item.unit}`,true,20,170);y+=4}
 const excluded=(audit.offers||[]).filter(o=>o.considered===false&&chosen.has(o.productId));if(excluded.length){sectionTitle('JUSTIFICATIVAS REGISTRADAS','Ofertas retiradas da comparação pelo comprador.');for(const o of excluded){const picked=chosen.get(o.productId),item=(audit.items||[]).find(i=>i.id===o.productId),supplier=(audit.suppliers||[]).find(s=>s.id===o.supplierId);ensure(25);doc.setFillColor(255,249,232);doc.roundedRect(20,y-3,170,20,2,2,'F');para(item?.name||picked.line.product||o.description,true,24,162);para(`${supplier?.name||'Fornecedor'} - ${money(o.grossCents)} por ${o.packQty} ${o.unit}`,false,24,162);para(`Motivo: ${o.exclusionReason}`,true,24,162);y+=5}}
 sectionTitle('COMPARATIVO COMPLETO','Verde = menor desembolso. "Escolhida" = opção incluída no pedido.');
 const choices=audit.choices||[],selections=audit.selections||{},reasons=audit.choiceReasons||{};
 for(const item of (audit.items||[]).filter(i=>i.enabled!==false)){const options=choices.filter(c=>c.itemId===item.id).sort((a,b)=>a.gross-b.gross);if(!options.length)continue;ensure(18+options.length*13+(validReasonText(reasons[item.id])?14:0));doc.setFillColor(246,248,245);doc.roundedRect(15,y-4,180,11,2,2,'F');doc.setFont('helvetica','bold');doc.setFontSize(10);text(item.name,20,y+2);doc.setFontSize(8);text(`Necessidade: ${item.qty} ${item.unit}`,190,y+2,{align:'right'});y+=14;const cheapest=Math.min(...options.map(c=>c.gross));
  for(const c of options){const s=(audit.suppliers||[]).find(x=>x.id===c.supplierId),isCheapest=c.gross===cheapest,isChosen=selections[item.id]===c.offerId,label=`${s?.name||'Fornecedor'}  |  ${c.packs} x ${c.packQty} ${c.unit}  |  ${money(c.gross)}`,tags=`${isCheapest?'MENOR DESEMBOLSO':''}${isCheapest&&isChosen?' + ':''}${isChosen?'ESCOLHIDA':''}`;ensure(13);if(isCheapest){doc.setFillColor(242,249,238);doc.setDrawColor(76,151,63);doc.roundedRect(20,y-4,170,11,2,2,'FD')}doc.setFont('helvetica',isChosen?'bold':'normal');doc.setFontSize(8.5);text(label,24,y+2);if(tags){doc.setTextColor(isCheapest?55:49,115,45);doc.setFont('helvetica','bold');doc.setFontSize(7);text(tags,187,y+2,{align:'right'});doc.setTextColor(33,48,36)}y+=13}
  const optionIds=new Set(options.map(c=>c.offerId));for(const o of (audit.offers||[]).filter(o=>o.productId===item.id&&!optionIds.has(o.id))){const s=(audit.suppliers||[]).find(x=>x.id===o.supplierId),status=o.considered===false?'desconsiderada':o.available===false?'indisponível':'não comparável';para(`${s?.name||'Fornecedor'} | ${money(o.grossCents)} por ${o.packQty} ${o.unit} | ${status}`,false,24,162)}
  const chosenOption=options.find(c=>selections[item.id]===c.offerId);if(chosenOption&&chosenOption.gross>cheapest&&validReasonText(reasons[item.id])){ensure(14);doc.setFillColor(255,247,222);doc.roundedRect(20,y-3,170,11,2,2,'F');para(`Motivo da escolha: ${reasons[item.id]}`,true,24,162);y+=3}y+=5}
 const manual=orders.flatMap(o=>o.lines.map(line=>({line,supplier:o.supplier}))).filter(x=>x.line.manual);if(manual.length){sectionTitle('ITENS INCLUÍDOS MANUALMENTE');for(const {line,supplier} of manual){ensure(20);para(`${line.product||line.description} | ${supplier.name} | ${money(line.gross)}`,true,20,170);para(`Motivo: ${line.decisionReason||'Não informado'}`,false,20,170);y+=5}}
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);text(`Página ${i} de ${n}`,195,286,{align:'right'})}
 return new Uint8Array(doc.output('arraybuffer'));
}
function validReasonText(value){return String(value||'').trim().length>=10}
