(function(root){
 const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 function buildMonth(year,month){
  const first=new Date(year,month,1),offset=(first.getDay()+6)%7;
  const count=Math.max(35,Math.ceil((offset+new Date(first.getFullYear(),first.getMonth()+1,0).getDate())/7)*7);
  const days=Array.from({length:count},(_,i)=>{const date=new Date(first.getFullYear(),first.getMonth(),1-offset+i);return {key:key(date),day:date.getDate(),year:date.getFullYear(),month:date.getMonth(),inMonth:date.getMonth()===first.getMonth()};});
  return {year:first.getFullYear(),month:first.getMonth(),weeks:count/7,days};
 }
 function matches(t,filter={}){return (!filter.category||(t.category||'other')===filter.category)&&(!filter.priority||(t.priority||'normal')===filter.priority)&&(!filter.query||(t.title+' '+(t.notes||'')).toLowerCase().includes(filter.query.toLowerCase()));}
 function groupTasks(tasks,filter={}){
  const groups=new Map(),rank={high:0,normal:1,low:2};
  for(const t of tasks){if(!t.due||!Number.isFinite(Date.parse(t.due))||(!filter.showCompleted&&t.done)||!matches(t,filter))continue;const date=key(new Date(t.due));if(!groups.has(date))groups.set(date,[]);groups.get(date).push(t);}
  for(const list of groups.values())list.sort((a,b)=>Number(!!a.done)-Number(!!b.done)||(rank[a.priority||'normal']-rank[b.priority||'normal'])||Date.parse(a.due)-Date.parse(b.due));
  return groups;
 }
 const api={key,buildMonth,matches,groupTasks};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MonthCalendar=api;
})(globalThis);
