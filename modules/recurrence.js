(function(root){
 const calendar=typeof module!=='undefined'&&module.exports?require('../data/workdays.json'):root.BjjjWorkdays;
 const labels={none:'不重复',daily:'每天',weekly:'每周',weekdays:'周一至周五',workdays:'法定工作日'};
 const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('周期日期无效');const d=new Date(s+'T12:00:00');if(!Number.isFinite(+d)||key(d)!==s)throw Error('周期日期无效');return d;}
 const rule=t=>t.repeat&&t.repeat!=='none'?t.repeat:'none';
 function workday(day){const d=date(day);if(!calendar.years.includes(d.getFullYear()))return null;return Object.hasOwn(calendar.days,day)?calendar.days[day]:d.getDay()>0&&d.getDay()<6;}
 function matches(t,day){if(rule(t)==='none'||!t.due||t.done)return false;const start=new Date(t.due),d=date(day);if(day<key(start))return false;switch(t.repeat){case 'daily':return true;case 'weekly':return d.getDay()===start.getDay();case 'weekdays':return d.getDay()>0&&d.getDay()<6;case 'workdays':return workday(day)===true;default:return false;}}
 function occurrence(t,day){if(!matches(t,day))return null;const d=date(day),start=new Date(t.due);d.setHours(start.getHours(),start.getMinutes(),start.getSeconds(),0);const done=(t.completedDates||[]).includes(day);return {...t,id:t.id+'@'+day,seriesId:t.id,occurrenceDate:day,due:d.toISOString(),done,completed:done?d.toISOString():null};}
 function onDay(tasks,day){return tasks.flatMap(t=>rule(t)==='none'?(t.due&&key(new Date(t.due))===day?[t]:[]):[occurrence(t,day)].filter(Boolean));}
 function current(tasks,now=new Date()){return tasks.flatMap(t=>rule(t)==='none'?[t]:[occurrence(t,key(now))].filter(Boolean));}
 function reminders(tasks,now=new Date()){return tasks.flatMap(t=>{if(rule(t)==='none')return [t];const days=new Set([key(now)]);for(const offset of t.offsets||[]){const base=new Date(+now+offset*60000);for(let n=-1;n<=16;n++){const d=new Date(base);d.setDate(d.getDate()+n);const day=key(d);if(day<key(now))continue;const item=occurrence(t,day);if(item&&!item.done){days.add(day);if(Date.parse(item.due)-offset*60000>+now)break;}}}return [...days].map(day=>occurrence(t,day)).filter(t=>t&&!t.done);});}
 function history(tasks){return tasks.filter(t=>rule(t)!=='none').flatMap(t=>(t.completedDates||[]).map(day=>occurrence(t,day)).filter(t=>t&&t.done));}
 function range(tasks,first,last){const out=tasks.filter(t=>rule(t)==='none');for(let d=date(first),count=0;key(d)<=last&&count<370;d.setDate(d.getDate()+1),count++)for(const t of tasks)if(rule(t)!=='none'){const item=occurrence(t,key(d));if(item)out.push(item);}return out;}
 function split(id){const parts=String(id).split('@');return {id:parts[0],day:parts[1]||null};}
 function normalize(input,previous){const repeat=input.repeat??previous?.repeat??'none';if(!Object.hasOwn(labels,repeat))throw Error('请选择有效的周期');if(repeat==='none')return {};if(!input.due)throw Error('周期事项需要起始日期与时间');const start=key(new Date(input.due));date(start);if(repeat==='workdays'&&workday(start)===null)throw Error('法定工作日数据仅覆盖2026—2027年，请选择已覆盖的起始日期');const same=previous&&rule(previous)===repeat&&new Date(previous.due).getTime()===new Date(input.due).getTime();const completedDates=same?[...(previous.completedDates||[])]:[];return {repeat,completedDates};}
 function toggle(task,day,value){if(rule(task)==='none'){task.done=value??!task.done;task.completed=task.done?new Date().toISOString():null;return;}day=day||key(new Date());if(!matches(task,day))throw Error('该日期不在此事项的周期内');const set=new Set(task.completedDates||[]),done=value??!set.has(day);if(done)set.add(day);else set.delete(day);if(set.size>10000)throw Error('周期完成记录已达上限');task.completedDates=[...set].sort();}
 const api={key,date,rule,labels,workday,matches,occurrence,onDay,current,reminders,history,range,split,normalize,toggle,years:calendar.years};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Recurrence=api;
})(globalThis);
