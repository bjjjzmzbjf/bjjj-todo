const crypto=require('node:crypto');
const fields=['id','title','due','priority','category','offsets','notes','done','created','completed'];
function payload(t){return {id:t.id,title:t.title,due:t.due||'',priority:t.priority||'normal',category:t.category||'other',offsets:[...(t.offsets||[])],notes:t.notes||'',done:!!t.done,created:t.created||'',completed:t.completed||''};}
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
function snapshot(store){const tasks=Object.fromEntries(store.tasks.map(t=>[t.id,payload(t)])),base=structuredClone(store.cloud?.base||{}),changes=[];for(const id of new Set([...Object.keys(tasks),...Object.keys(base)])){const old=base[id];if(tasks[id]){if(!old||old.deleted||!equal(tasks[id],old.data))changes.push({id,base_revision:old?.revision||0,deleted:false,data:tasks[id]});}else if(old&&!old.deleted)changes.push({id,base_revision:old.revision,deleted:true,data:{}});}return {tasks,base,changes:changes.slice(0,100)};}
function remoteTask(row,old){const t={...row.data,due:row.data.due||null,completed:row.data.completed||null};const same=old&&old.due===t.due&&equal(old.offsets,t.offsets);return {...t,fired:same?[...(old.fired||[])]:[],alerts:same?[...(old.alerts||[])]:[]};}
function apply(store,sent,response,uuid=()=>crypto.randomUUID()){
 const cloud=store.cloud||(store.cloud={base:{},conflicts:0}),base=cloud.base||(cloud.base={}),map=new Map(store.tasks.map(t=>[t.id,t])),results=new Map(response.results.map(r=>[r.id,r])),outgoing=new Set(sent.changes.map(c=>c.id));
 for(const row of response.rows){const id=row.id,local=map.get(id),now=local?payload(local):undefined,before=sent.tasks[id],result=results.get(id),unchanged=equal(now,before);
  if(result&&!result.ok){if(!unchanged)continue;if(local){const copy={...structuredClone(local),id:uuid(),title:(local.title.slice(0,185)+'（同步冲突副本）'),created:new Date().toISOString()};map.set(copy.id,copy);}cloud.conflicts=(cloud.conflicts||0)+1;}
  else if(!unchanged){if(outgoing.has(id)&&result?.ok)base[id]=structuredClone(row);continue;}
  if(row.deleted)map.delete(id);else map.set(id,remoteTask(row,local));base[id]=structuredClone(row);
 }
 store.tasks=[...map.values()];cloud.lastSync=new Date().toISOString();return store;
}
module.exports={payload,snapshot,apply,equal,fields};
