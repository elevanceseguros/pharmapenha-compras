const url=String(__SUPABASE_URL__||'').replace(/\/$/,'');
const key=String(__SUPABASE_KEY__||'');
const sessionKey='pharmapenha-cloud-session';
export const cloudConfigured=Boolean(url&&key);
let session=null;
try{session=JSON.parse(localStorage.getItem(sessionKey)||'null')}catch{}
function saveSession(next){session=next;if(next)localStorage.setItem(sessionKey,JSON.stringify(next));else localStorage.removeItem(sessionKey)}
async function authRequest(path,body){
 let response;
 try{response=await fetch(url+'/auth/v1/'+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)})}
 catch(err){throw Error('Não foi possível conectar ao Supabase. Confira se VITE_SUPABASE_URL contém o endereço https://...supabase.co. Detalhe: '+err.message)}
 const raw=await response.text();let data={};try{data=raw?JSON.parse(raw):{}}catch{}
 if(!response.ok){const detail=data.msg||data.message||data.error_description||data.error||raw.slice(0,160)||'resposta vazia';throw Error('Supabase recusou o acesso: '+detail+' (HTTP '+response.status+').')}
 return data;
}
async function activeSession(){
 if(!session)return null;
 if((session.expires_at||0)*1000>Date.now()+60000)return session;
 try{const next=await authRequest('token?grant_type=refresh_token',{refresh_token:session.refresh_token});saveSession(next);return next}catch{saveSession(null);return null}
}
async function headers(extra={}){
 const current=await activeSession();
 if(!current)throw Error('Sua sessão terminou. Entre novamente.');
 return {apikey:key,Authorization:'Bearer '+current.access_token,'Content-Type':'application/json',...extra};
}
async function rest(path,options={}){
 const response=await fetch(url+'/rest/v1/'+path,{...options,headers:await headers(options.headers)});
 const text=await response.text(),data=text?JSON.parse(text):null;
 if(!response.ok)throw Error(data?.message||data?.hint||data?.details||'Não foi possível acessar as cotações.');
 return data;
}
export async function getCloudUser(){return (await activeSession())?.user||null}
export async function getAppMember(){
 const current=await activeSession();if(!current?.user?.id)return null;
 const rows=await rest('app_members?select=id,email,name,role,active&id=eq.'+encodeURIComponent(current.user.id));
 return rows?.[0]||null;
}
export async function signIn(email,password){const next=await authRequest('token?grant_type=password',{email,password});saveSession(next);return next.user}
export async function signOut(){try{const current=await activeSession();if(current)await fetch(url+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+current.access_token}})}finally{saveSession(null)}}
export async function listCloudRounds(){return await rest('quotation_rounds?select=id,title,status,state,created_at,updated_at&order=updated_at.desc')}
export async function listProductAliases(){return await rest('product_aliases?select=id,alias,canonical,alias_key,canonical_key&order=updated_at.desc')}
export async function saveProductAlias(alias,canonical,aliasKey,canonicalKey){
 const current=await activeSession(),body={alias,canonical,alias_key:aliasKey,canonical_key:canonicalKey,created_by:current.user.id,updated_by:current.user.id,updated_at:new Date().toISOString()};
 const rows=await rest('product_aliases?on_conflict=alias_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body)});return rows[0]
}
export async function deleteProductAlias(id){await rest('product_aliases?id=eq.'+encodeURIComponent(id),{method:'DELETE'})}
export async function saveCloudRound(id,state,status='draft'){
 const current=await activeSession();
 const body={title:state.title,status,state,updated_by:current.user.id};
 if(id){const rows=await rest('quotation_rounds?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});return rows[0]}
 body.created_by=current.user.id;
 const rows=await rest('quotation_rounds',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});return rows[0];
}
export async function deleteCloudRound(id){await rest('quotation_rounds?id=eq.'+encodeURIComponent(id),{method:'DELETE'})}
export async function uploadQuotationFile(roundId,file){
 const path=roundId+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');
 const current=await activeSession();
 const response=await fetch(url+'/storage/v1/object/quotation-files/'+encodeURI(path),{method:'POST',headers:{apikey:key,Authorization:'Bearer '+current.access_token,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.message||data.error||'Não foi possível guardar o arquivo original.');
 await rest('quotation_files',{method:'POST',body:JSON.stringify({quotation_id:roundId,storage_path:path,original_name:file.name,mime_type:file.type||null,size_bytes:file.size,uploaded_by:current.user.id})});
 return path;
}
