import {jsPDF} from 'jspdf';
import {zipSync} from 'fflate';
import {money} from './core.js';
const clean=s=>String(s??'').replace(/[\u0000-\u001f]/g,' ').replace(/[–—]/g,'-').replace(/[^\u0020-\u00ff]/g,' ');
export const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80);
export function orderPDF(order,buyer,round,date=new Date()){
 if(!order.valid)throw Error('Pedido abaixo do mínimo. PDF bloqueado.');
 const doc=new jsPDF();const pages=[];let y=20;
 const text=(s,x,yy,opt)=>doc.text(clean(s),x,yy,opt);
 function header(){doc.setFont('helvetica','bold');doc.setFontSize(17);text('PEDIDO DE COMPRA',15,18);doc.setFontSize(11);text('Pharmapenha',15,26);doc.setFont('helvetica','normal');doc.setFontSize(9);const lines=doc.splitTextToSize(clean(`${round} | ${date.toLocaleDateString('pt-BR')}`),180);lines.forEach((l,i)=>text(l,15,33+i*4.5));y=38+lines.length*4.5;const vendor=doc.splitTextToSize(clean(`Fornecedor: ${order.supplier.name}`),180);vendor.forEach((l,i)=>text(l,15,y+i*4.5));y+=vendor.length*4.5+6}
 function page(){doc.addPage();header()}
 function para(s){const lines=doc.splitTextToSize(clean(s),179);for(const l of lines){if(y>268)page();text(l,15,y);y+=5}}
 header();para(`Comprador: ${buyer.name||'Pharmapenha'}`);if(buyer.cnpj)para(`CNPJ: ${buyer.cnpj}`);if(buyer.address)para(`Entrega: ${buyer.address}`);if(buyer.contact)para(`Contato: ${buyer.contact}`);y+=4;
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
 if(y>225)page();y+=4;para(`Produtos sem impostos: ${money(order.net)}`);para(`Impostos informados: ${money(order.tax)}`);para(`Produtos com impostos: ${money(order.gross)}`);para(`Frete: ${order.supplier.freightKnown?money(order.supplier.freightCents):'a confirmar (não incluído)'}`);doc.setFont('helvetica','bold');para(`Total ${order.supplier.freightKnown?'do pedido':'estimado'}: ${money(order.total)}`);doc.setFont('helvetica','normal');
 if(buyer.notes){y+=4;para(`Observações: ${buyer.notes}`)}
 y+=4;para('Favor confirmar disponibilidade, validade, condições de pagamento e prazo de entrega.');
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);text(`Página ${i} de ${n}`,195,286,{align:'right'})}
 return new Uint8Array(doc.output('arraybuffer'));
}
export function download(bytes,name,type='application/pdf'){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
export function allPDFs(orders,buyer,round){const files={};orders.forEach((o,i)=>{files[`${i+1}-Pedido-${slug(o.supplier.name)}.pdf`]=orderPDF(o,buyer,round)});return zipSync(files)}
export function internalReportPDF(orders,audit,round,date=new Date()){
 const doc=new jsPDF();let y=20;const text=(s,x,yy,opt)=>doc.text(clean(s),x,yy,opt);
 function header(){doc.setFont('helvetica','bold');doc.setFontSize(17);text('RELATÓRIO INTERNO DA COMPRA',15,18);doc.setFontSize(11);text('USO INTERNO - PHARMAPENHA',15,26);doc.setFont('helvetica','normal');doc.setFontSize(9);text(`${round} | ${date.toLocaleDateString('pt-BR')}`,15,33);y=43}
 function page(){doc.addPage();header()}
 function para(s,bold=false){doc.setFont('helvetica',bold?'bold':'normal');for(const line of doc.splitTextToSize(clean(s),179)){if(y>270)page();text(line,15,y);y+=5}}
 header();para('Justificativas das ofertas desconsideradas para produtos efetivamente comprados. Este documento não deve ser enviado aos fornecedores.');y+=5;
 const chosen=new Map();for(const order of orders)for(const line of order.lines)chosen.set(line.itemId,{line,supplier:order.supplier});
 const excluded=(audit.offers||[]).filter(o=>o.considered===false&&chosen.has(o.productId));
 for(const o of excluded){const picked=chosen.get(o.productId),item=(audit.items||[]).find(i=>i.id===o.productId),supplier=(audit.suppliers||[]).find(s=>s.id===o.supplierId);if(y>235)page();doc.setFillColor(230,239,246);doc.rect(15,y-5,180,10,'F');para(item?.name||picked.line.product||o.description,true);para(`Comprado de: ${picked.supplier.name} | ${picked.line.packs} x ${picked.line.packQty} ${picked.line.unit} | ${money(picked.line.gross)}`);para(`Oferta desconsiderada: ${supplier?.name||'Fornecedor'} | ${money(o.grossCents)} por ${o.packQty} ${o.unit}`);para(`Motivo: ${o.exclusionReason}`,true);y+=5}
 if(!excluded.length)para('Nenhuma oferta desconsiderada relacionada aos produtos comprados.');
 const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);text(`Página ${i} de ${n}`,195,286,{align:'right'})}
 return new Uint8Array(doc.output('arraybuffer'));
}
