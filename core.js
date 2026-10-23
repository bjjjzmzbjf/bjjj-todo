const crypto = require('node:crypto');
function validateTask(input, previous) {
  const title = String(input.title || '').trim();
  if (!title || title.length > 200) throw Error('事项名称需要为 1–200 个字');
  const due = input.due ? new Date(input.due).toISOString() : null;
  const offsets = [...new Set((input.offsets || []).map(Number))];
  if (offsets.length > 20 || offsets.some(n => !Number.isFinite(n) || n < 0 || n > 5256000)) throw Error('提前时间需在 0–3650 天以内，最多 20 个提醒');
  const same = previous && previous.due === due && JSON.stringify(previous.offsets) === JSON.stringify(offsets);
  const priority = input.priority ?? previous?.priority ?? 'normal';
  const category = input.category ?? previous?.category ?? 'other';
  if (!['high','normal','low'].includes(priority)) throw Error('请选择有效的重要性等级');
  if (!['research','work','study','life','other'].includes(category)) throw Error('请选择有效的事项类型');
  return {id:previous?.id || crypto.randomUUID(), title, due, priority, category, offsets:due ? offsets : [], notes:String(input.notes || '').slice(0,4000), done:previous?.done || false, created:previous?.created || new Date().toISOString(), completed:previous?.completed || null, fired:same ? previous.fired : [], alerts:same ? previous.alerts : []};
}
function pendingAlerts(tasks, now=Date.now()) {
  return tasks.filter(t=>!t.done && t.due).flatMap(t=>t.offsets.filter(m=>!t.fired.includes(m) && Date.parse(t.due)-m*60000<=now).map(m=>({task:t,offset:m})));
}
function widgetTasks(tasks,now=new Date()){
 const start=new Date(now);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);
 const ordered=tasks.filter(t=>!t.done).sort((a,b)=>(a.due?Date.parse(a.due):Infinity)-(b.due?Date.parse(b.due):Infinity)||Date.parse(a.created)-Date.parse(b.created));
 const today=ordered.filter(t=>t.due&&Date.parse(t.due)<end.getTime());
 const ids=new Set(today.map(t=>t.id));const next=ordered.filter(t=>!ids.has(t.id)).slice(0,3);
 return {today,next};
}
module.exports={validateTask,pendingAlerts,widgetTasks};
