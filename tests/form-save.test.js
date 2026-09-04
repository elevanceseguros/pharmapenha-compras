import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quantity,decimal,cents,normalize} from '../src/core.js';

test('salva oferta disponível mesmo com campo id oculto no formulário',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const handler=source.slice(source.indexOf("root.addEventListener('submit'"),source.indexOf("window.addEventListener('beforeunload'"));
 const state={items:[{id:'i1',name:'Produto teste',qty:1000,unit:'g'}],offers:[{id:'o1',productId:'i1',available:false}],suppliers:[]};
 let submit,changed=0,closed=0;
 const root={addEventListener:(event,fn)=>{submit=fn}};
 const document={querySelector:()=>({close:()=>closed++})};
 new Function('root','state','FormData','quantity','decimal','cents','normalize','document','changed','formError','pdfQueue','view',handler)(root,state,class{constructor(f){return f.fields}},quantity,decimal,cents,normalize,document,()=>changed++,msg=>{throw Error(msg)},[],'offers');
 const fields=new Map(Object.entries({id:'o1',productId:'i1',supplierId:'s1',packQty:'1000',unit:'g',net:'178,00',gross:'178,00',available:'on',considered:'on',reviewed:'on'}));
 // HTML forms expose named controls as properties: form.id can be an input.
 const form={id:{value:'o1'},getAttribute:name=>name==='id'?'offer-form':null,fields};
 submit({preventDefault(){},target:form});
 assert.equal(state.offers.length,1);assert.equal(state.offers[0].id,'o1');
 assert.equal(state.offers[0].available,true);assert.equal(state.offers[0].grossCents,17800);assert.equal(state.offers[0].packQty,1000);
 assert.equal(changed,1);assert.equal(closed,1);
 fields.delete('available');submit({preventDefault(){},target:form});assert.equal(state.offers[0].available,false);
 fields.delete('considered');fields.set('exclusionReason','Qualidade não aprovada anteriormente');submit({preventDefault(){},target:form});assert.equal(state.offers[0].considered,false);assert.equal(state.offers[0].exclusionReason,'Qualidade não aprovada anteriormente');
 fields.set('exclusionReason','curto');assert.throws(()=>submit({preventDefault(){},target:form}),/pelo menos 10 caracteres/);
});
