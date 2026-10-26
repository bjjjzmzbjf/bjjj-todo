const $=id=>document.getElementById(id),cal=MonthCalendar;
const categories={research:'科研',work:'工作',study:'学习',life:'生活',other:'其他'},priorities={high:'重要',normal:'普通',low:'低优先级'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pOf=t=>Object.hasOwn(priorities,t.priority)?t.priority:'normal',cOf=t=>Object.hasOwn(categories,t.category)?t.category:'other';
let state,view=new Date(new Date().getFullYear(),new Date().getMonth(),1),openedDay=null,selectedTask=null;
let capacity=3;
function filters(){return {category:$('overview-category').value,priority:$('overview-priority').value,query:$('overview-search').value.trim(),showCompleted:$('overview-completed').checked};}
function lunarLabel(d){try{const solar=Solar.fromYmd(d.year,d.month+1,d.day),lunar=solar.getLunar();const special=[...solar.getFestivals(),...lunar.getFestivals(),lunar.getJieQi()].filter(Boolean)[0];return {text:special||(lunar.getDay()===1?lunar.getMonthInChinese()+'月':lunar.getDayInChinese()),special:!!special};}catch{return {text:'',special:false};}}
async function call(name,data){const r=await window.bjjjTodo.call(name,data);if(!r.ok){$('toast').textContent=r.error;$('toast').classList.add('visible');setTimeout(()=>$('toast').classList.remove('visible'),3000);throw Error(r.error);}return r.data;}
function render(){if(!state)return;applyAppearance(state);const month=cal.buildMonth(view.getFullYear(),view.getMonth()),filter=filters(),groups=cal.groupTasks(state.tasks,filter),today=cal.key(new Date());
 $('overview-month').textContent=`${month.year}年${month.month+1}月`;
 const all=state.tasks.filter(t=>t.due&&cal.matches(t,filter)&&new Date(t.due).getFullYear()===month.year&&new Date(t.due).getMonth()===month.month);
 $('overview-summary').textContent=`${all.filter(t=>!t.done).length} 项未完成 · ${all.filter(t=>t.done).length} 项已完成`;
 $('overview-undated-count').textContent=state.tasks.filter(t=>!t.due&&!t.done).length;
 $('month-grid').style.setProperty('--weeks',String(month.weeks));
 capacity=Math.max(0,Math.min(4,Math.floor(($('month-grid').clientHeight/month.weeks-60)/27)));
 updateHTML('month-grid',month.days.map(d=>{const list=groups.get(d.key)||[],lunar=lunarLabel(d),level=['high','normal','low'].find(p=>list.some(t=>!t.done&&pOf(t)===p));return `<div role="gridcell" class="month-cell ${d.inMonth?'':'outside'} ${d.key===today?'is-today':''} ${level?'has-'+level:''}" data-cell-date="${d.key}" aria-label="${d.key}，${list.length} 项事项"><button class="month-day-heading" data-day="${d.key}" title="查看 ${d.key} 的 ${list.length} 项事项"><span class="month-day-number">${d.day}</span>${list.length?`<span class="month-task-count">${list.length}</span>`:""}<span class="lunar-label ${lunar.special?'special':''}">${esc(lunar.text)}</span></button><div class="month-events">${list.slice(0,capacity).map(t=>`<button class="month-event priority-${pOf(t)} ${t.done?'event-done':''}" data-inspect="${esc(t.id)}" title="${esc(t.title)} · ${categories[cOf(t)]} · ${priorities[pOf(t)]}"><span class="event-time">${new Date(t.due).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})}</span><span class="event-title">${esc(t.title)}</span><span class="event-category">${categories[cOf(t)]}</span></button>`).join('')}${list.length>capacity?`<button class="month-more" data-day="${d.key}">另有 ${list.length-capacity} 项</button>`:''}</div></div>`;}).join(''));
 if($('overview-day-dialog').open)renderDay();
}
function renderDay(){const filter=filters();const tasks=openedDay==='undated'?state.tasks.filter(t=>!t.due&&(filter.showCompleted||!t.done)&&cal.matches(t,filter)):(cal.groupTasks(state.tasks,filter).get(openedDay)||[]);
 $('overview-day-title').textContent=openedDay==='undated'?'未设置截止时间':new Date(openedDay+'T12:00:00').toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
 $('overview-day-open').hidden=openedDay==='undated';
 updateHTML('overview-day-list',tasks.length?tasks.map(t=>`<article class="task ${t.done?'done':''} ${t.id===selectedTask?'inspected-task':''}"><input type="checkbox" data-toggle="${esc(t.id)}" ${t.done?'checked':''} aria-label="${t.done?'恢复':'完成'} ${esc(t.title)}"><div class="task-body"><div class="task-title">${esc(t.title)}</div><div class="task-badges"><span class="priority-badge priority-${pOf(t)}">${priorities[pOf(t)]}</span><span class="category-badge category-${cOf(t)}">${categories[cOf(t)]}</span></div><div class="task-meta">${t.due?new Date(t.due).toLocaleString('zh-CN')+' 截止':'未设置截止时间'}</div>${t.notes?`<div class="notes">${esc(t.notes)}</div>`:''}</div><div class="task-actions"><button data-edit="${esc(t.id)}" title="在主窗口编辑">✎</button></div></article>`).join(''):'<div class="empty">没有符合当前筛选条件的事项，可以新建一条。</div>');
}
function openDay(day,id=null){openedDay=day;selectedTask=id;renderDay();if(!$('overview-day-dialog').open)$('overview-day-dialog').showModal();}
async function refresh(){state=await call('get');render();}
$('overview-prev').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()-1,1);render();};$('overview-next').onclick=()=>{view=new Date(view.getFullYear(),view.getMonth()+1,1);render();};$('overview-today').onclick=()=>{view=new Date(new Date().getFullYear(),new Date().getMonth(),1);render();};
for(const id of ['overview-category','overview-priority','overview-completed'])$(id).onchange=render;$('overview-search').oninput=render;
$('overview-undated').onclick=()=>openDay('undated');$('overview-day-close').onclick=()=>$('overview-day-dialog').close();
$('overview-day-open').onclick=()=>call('overview-day',{date:openedDay});$('overview-day-add').onclick=()=>call('overview-day',{date:openedDay==='undated'?null:openedDay,create:true});
$('overview-main').onclick=()=>call('show-main');$('overview-minimize').onclick=()=>call('minimize-overview');$('overview-maximize').onclick=()=>call('maximize-overview');$('overview-close').onclick=()=>call('hide-overview');
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.day)openDay(b.dataset.day);if(b.dataset.inspect){const t=state.tasks.find(t=>t.id===b.dataset.inspect);if(t)openDay(cal.key(new Date(t.due)),t.id);}if(b.dataset.edit)call('overview-day',{date:openedDay==='undated'?null:openedDay,id:b.dataset.edit});});
document.addEventListener('change',async e=>{if(e.target.dataset.toggle){await call('toggle',e.target.dataset.toggle);refresh();}});
new ResizeObserver(()=>render()).observe($('month-grid'));window.bjjjTodo.onChange(refresh);setInterval(refresh,30000);refresh();
