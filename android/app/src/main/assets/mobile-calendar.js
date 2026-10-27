/* Uses the same local-date grouping and month layout as the desktop calendar. */
(()=>{
 const cal=MonthCalendar,$=id=>document.getElementById(id),labels=['周一','周二','周三','周四','周五','周六','周日'];
 let selected=cal.key(new Date()),month=new Date(new Date().getFullYear(),new Date().getMonth(),1),mode='week',current;
 const date=key=>new Date(key+'T12:00:00');
 function monday(d){const start=new Date(d);start.setDate(start.getDate()-(start.getDay()+6)%7);return start;}
 let week=monday(new Date());
 const level=tasks=>['high','normal','low'].find(p=>tasks.some(t=>(t.priority||'normal')===p));
 function select(key){selected=key;week=monday(date(key));month=new Date(date(key).getFullYear(),date(key).getMonth(),1);render(current);}
 function render(store){
  if(!store)return;current=store;
  const groups=cal.groupTasks(store.tasks),today=cal.key(new Date()),isMonth=mode==='month';
  $('mobile-week-tab').setAttribute('aria-pressed',String(!isMonth));$('mobile-month-tab').setAttribute('aria-pressed',String(isMonth));
  $('mobile-calendar-title').textContent=(isMonth?month:date(selected)).toLocaleDateString('zh-CN',{year:'numeric',month:'long'});
  $('mobile-calendar-prev').setAttribute('aria-label',isMonth?'上个月':'上一周');$('mobile-calendar-next').setAttribute('aria-label',isMonth?'下个月':'下一周');
  $('mobile-week').hidden=isMonth;$('mobile-month').hidden=!isMonth;
  const button=(key,day,inMonth,weekday)=>{const list=groups.get(key)||[],p=level(list),chosen=key===selected;
   return `<button type="button" data-calendar-date="${key}" aria-pressed="${chosen}" aria-label="${key}，${list.length}项未完成${p?'，最高优先级'+priorities[p]:''}" class="calendar-date ${p?'priority-'+p:''} ${chosen?'selected':''} ${key===today?'is-today':''} ${inMonth?'':'outside'}">${weekday?'<span class="calendar-weekday">'+weekday+'</span>':''}<b>${day}</b>${isMonth&&list.length?'<span class="calendar-task-title">'+esc(list[0].title)+'</span>':''}<span class="calendar-day-count">${list.length?list.length+'项':'&nbsp;'}</span></button>`;};
  if(!isMonth)updateMobileHTML('mobile-week',Array.from({length:7},(_,i)=>{const d=new Date(week);d.setDate(d.getDate()+i);return button(cal.key(d),d.getDate(),true,labels[i]);}).join(''));
  else{const grid=cal.buildMonth(month.getFullYear(),month.getMonth());updateMobileHTML('mobile-month-days',grid.days.map(d=>button(d.key,d.day,d.inMonth)).join(''));}
  const tasks=groups.get(selected)||[];
  $('day-title').textContent=(selected===today?'今天':date(selected).toLocaleDateString('zh-CN',{month:'long',day:'numeric'}))+'的安排';
  $('today-count').textContent=tasks.length+'项未完成';updateMobileHTML('today',cards(tasks));
  $('mobile-month-summary').textContent='未完成事项 · 按当天最高优先级着色';
 }
 $('mobile-week-tab').onclick=()=>{mode='week';render(current);};$('mobile-month-tab').onclick=()=>{mode='month';render(current);};
 $('mobile-overview').onclick=()=>{mode=mode==='month'?'week':'month';render(current);};
 for(const [id,step] of [['mobile-calendar-prev',-1],['mobile-calendar-next',1]])$(id).onclick=()=>{if(mode==='month'){month=new Date(month.getFullYear(),month.getMonth()+step,1);selected=cal.key(month);week=monday(month);}else{week.setDate(week.getDate()+step*7);const d=date(selected);d.setDate(d.getDate()+step*7);selected=cal.key(d);month=new Date(d.getFullYear(),d.getMonth(),1);}render(current);};
 $('mobile-calendar-today').onclick=()=>select(cal.key(new Date()));
 $('mobile-calendar').addEventListener('click',event=>{const b=event.target.closest('[data-calendar-date]');if(b)select(b.dataset.calendarDate);});
 $('mobile-day-add').onclick=()=>{editTask();$('due').value=selected+'T17:00';};
 window.renderMobileCalendar=render;window.mobileCalendarSelected=()=>selected;
 refresh();
})();
