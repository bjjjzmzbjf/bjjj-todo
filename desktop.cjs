const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,Notification,dialog,powerMonitor,screen,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {validateTask,pendingAlerts,widgetTasks}=require('./core');
const {migrateLegacyData}=require('./migrate-data.cjs');
let win,widget,overview,tray,quitting=false,store,file,boundsTimer,cloudClient;
app.setName('bjjj todo');
if(process.env.BJJJ_TODO_DATA_DIR)app.setPath('userData',process.env.BJJJ_TODO_DATA_DIR);
const webPreferences={preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true};
function secure(w){w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());}
if(!app.requestSingleInstanceLock())app.quit();
else{
app.on('second-instance',()=>show());
app.whenReady().then(()=>{
 app.setAppUserModelId('local.bjjj.todo');file=path.join(app.getPath('userData'),'tasks.json');
 store={version:1,tasks:[],settings:{pinned:false,autostart:false,widgetEnabled:false,widgetPinned:true,backgroundDim:75}};
 let migrated=false;
 try{
  // This legacy directory is read only for compatibility with installed versions.
  if(!process.env.BJJJ_TODO_DATA_DIR)migrated=migrateLegacyData(path.join(app.getPath('appData'),'bujjj todo'),app.getPath('userData'));
  if(fs.existsSync(file)){const d=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(d.tasks)||d.version!==1)throw Error('数据格式不正确');store={...d,settings:{...store.settings,...d.settings}};}
 }catch(e){dialog.showErrorBox('无法读取待办数据','为避免覆盖已有数据，软件将退出。请保留 tasks.json 与 .bak 文件。\n'+e.message);app.quit();return;}
 if(process.platform==='win32'&&app.isPackaged&&(!store.settings.desktopShortcutCreated||fs.existsSync(legacyDesktopShortcut()))){try{createDesktopShortcut();}catch(e){console.error('Desktop shortcut:',e.message);}}
 if(store.settings.autostart&&app.isPackaged){if(migrated)app.setLoginItemSettings({name:'bujjj todo',openAtLogin:false});app.setLoginItemSettings({name:'bjjj todo',openAtLogin:true,path:process.env.PORTABLE_EXECUTABLE_FILE||app.getPath('exe')});}
 win=new BrowserWindow({width:500,height:800,minWidth:400,minHeight:560,frame:false,icon:path.join(__dirname,'icon.ico'),backgroundColor:'#101923',show:false,webPreferences});secure(win);
 win.setAlwaysOnTop(!!store.settings.pinned);win.loadFile('index.html');win.once('ready-to-show',()=>win.show());
 win.on('close',e=>{if(!quitting){e.preventDefault();win.hide();}});
 tray=new Tray(path.join(__dirname,'icon.ico'));tray.setToolTip('不急及及待办 · bjjj todo');
 tray.setContextMenu(Menu.buildFromTemplate([{label:'打开待办',click:show},{label:'月历总览',click:openOverview},{label:'显示桌面浮窗',click:()=>{store.settings.widgetEnabled=true;openWidget();persist();}},{label:'退出软件',click:()=>{quitting=true;app.quit();}}]));tray.on('double-click',show);
 ipcMain.handle('bjjj-todo',async(e,name,data)=>{try{
  if(name.startsWith('cloud-')){if(!cloudClient)throw Error('同步尚未初始化');if(name==='cloud-login')return {ok:true,data:await cloudClient.login(data.email,data.password)};if(name==='cloud-signup')return {ok:true,data:await cloudClient.signup(data.email,data.password)};if(name==='cloud-logout')return {ok:true,data:await cloudClient.logout()};if(name==='cloud-sync')return {ok:true,data:await cloudClient.sync()};throw Error('同步操作无效');}
  if(name==='get')return {ok:true,data:{...store,background:background(),widgetLists:widgetTasks(store.tasks),cloudStatus:cloudClient?.info()||{}}};
  if(name==='save'){const prev=store.tasks.find(t=>t.id===data.id);if(data.id&&!prev)throw Error('事项不存在');const t=validateTask(data,prev);if(prev)store.tasks[store.tasks.indexOf(prev)]=t;else store.tasks.push(t);persist();check();}
  else if(name==='toggle'){const t=store.tasks.find(t=>t.id===data);if(t){t.done=!t.done;t.completed=t.done?new Date().toISOString():null;persist();}}
  else if(name==='delete'){store.tasks=store.tasks.filter(t=>t.id!==data);persist();}
  else if(name==='settings'){
   const settings={...store.settings};for(const key of ['pinned','autostart','widgetEnabled','widgetPinned'])if(data[key]!==undefined)settings[key]=!!data[key];
   if(data.backgroundDim!==undefined){const dim=Number(data.backgroundDim);if(!Number.isFinite(dim))throw Error('背景遮罩值无效');settings.backgroundDim=Math.max(35,Math.min(95,dim));}
   if(data.autostart!==undefined){if(!app.isPackaged)throw Error('开机启动请在打包版中设置');app.setLoginItemSettings({openAtLogin:settings.autostart,path:process.env.PORTABLE_EXECUTABLE_FILE||app.getPath('exe')});}
   store.settings=settings;win.setAlwaysOnTop(!!settings.pinned);
   if(data.widgetEnabled!==undefined){if(settings.widgetEnabled)openWidget();else widget?.hide();}
   if(widget&&!widget.isDestroyed())widget.setAlwaysOnTop(settings.widgetPinned);persist();
  }
  else if(name==='choose-background'){
   const r=await dialog.showOpenDialog(win,{title:'选择背景图片',filters:[{name:'背景图片',extensions:['png','jpg','jpeg','webp']}],properties:['openFile']});
   if(!r.canceled){const src=r.filePaths[0];if(fs.statSync(src).size>20*1024*1024)throw Error('请选择不超过 20 MB 的图片');let img=nativeImage.createFromPath(src);if(img.isEmpty())throw Error('无法读取这张图片，请选择 PNG、JPEG 或 WebP 图片');const s=img.getSize();if(s.width>1920||s.height>1920)img=img.resize(s.width>=s.height?{width:1920}:{height:1920});fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(path.join(app.getPath('userData'),'background.jpg'),img.toJPEG(88));store.settings.hasBackground=true;persist();}
  }
  else if(name==='reset-background'){store.settings.hasBackground=false;persist();}
  else if(name==='show-main')show();
  else if(name==='show-overview')openOverview();
  else if(name==='hide-overview')overview?.hide();
  else if(name==='minimize-overview')overview?.minimize();
  else if(name==='maximize-overview'){if(overview){if(overview.isMaximized())overview.unmaximize();else overview.maximize();}}
  else if(name==='overview-day'){
   if(data.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Number.isFinite(Date.parse(data.date))))throw Error('日期无效');
   show();win.webContents.send('select-day',{date:data.date||null,id:data.id||null,create:!!data.create});
  }
  else if(name==='hide-widget'){store.settings.widgetEnabled=false;widget?.hide();persist();}
  else if(name==='minimize')win.minimize();
  else if(name==='hide')win.hide();
  else if(name==='quit'){quitting=true;app.quit();}
  else if(name==='desktop-shortcut')createDesktopShortcut();
  else if(name==='test')notify('提醒测试','这是不急及及待办的测试通知。');
  else if(name==='export'){const r=await dialog.showSaveDialog(win,{defaultPath:'不急及及待办备份.json',filters:[{name:'JSON',extensions:['json']}]});if(!r.canceled)fs.writeFileSync(r.filePath,JSON.stringify(store,null,2));}
  else if(name==='import'){const r=await dialog.showOpenDialog(win,{filters:[{name:'JSON',extensions:['json']}],properties:['openFile']});if(!r.canceled){const d=JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));if(!Array.isArray(d.tasks)||d.tasks.length>10000)throw Error('备份格式不正确');const tasks=d.tasks.map(t=>({...validateTask(t),done:!!t.done,completed:t.completed||null}));store.tasks.push(...tasks);persist();check();}}
  else throw Error('不支持的操作');
  return {ok:true};
 }catch(err){return {ok:false,error:err.message};}});
 cloudClient=new (require('./cloud-client.cjs').CloudClient)({directory:app.getPath('userData'),read:()=>structuredClone(store),write:value=>{store=value;persist(false,false);},changed:()=>{for(const w of [win,widget,overview])if(w&&!w.isDestroyed())w.webContents.send('changed');check();}});
 if(store.settings.widgetEnabled)openWidget();
 setInterval(check,15000);powerMonitor.on('resume',check);setTimeout(check,2000);
});
}
function openWidget(){
 if(widget&&!widget.isDestroyed()){widget.show();return;}
 const area=screen.getPrimaryDisplay().workArea,b=store.settings.widgetBounds;
 const valid=b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&screen.getAllDisplays().some(d=>b.x<d.workArea.x+d.workArea.width&&b.x+300>d.workArea.x&&b.y<d.workArea.y+d.workArea.height&&b.y+60>d.workArea.y);
 const bounds=valid?{x:b.x,y:b.y,width:Math.max(300,Math.min(600,b.width||360)),height:Math.max(320,Math.min(area.height,b.height||640))}:{x:area.x+area.width-380,y:area.y+40,width:360,height:Math.min(640,Math.max(320,area.height-80))};
 widget=new BrowserWindow({...bounds,minWidth:300,minHeight:320,maxWidth:600,frame:false,skipTaskbar:true,alwaysOnTop:store.settings.widgetPinned,show:false,backgroundColor:'#101923',icon:path.join(__dirname,'icon.ico'),webPreferences});secure(widget);widget.loadFile('widget.html');widget.once('ready-to-show',()=>widget.show());
 widget.on('close',e=>{if(!quitting){e.preventDefault();store.settings.widgetEnabled=false;widget.hide();persist();}});
 const saveBounds=()=>{clearTimeout(boundsTimer);boundsTimer=setTimeout(()=>{if(!quitting&&widget&&!widget.isDestroyed()){store.settings.widgetBounds=widget.getBounds();persist();}},400);};widget.on('move',saveBounds);widget.on('resize',saveBounds);
}
function openOverview(){
 if(overview&&!overview.isDestroyed()){overview.show();if(overview.isMinimized())overview.restore();overview.focus();return;}
 const area=screen.getPrimaryDisplay().workArea;
 overview=new BrowserWindow({width:Math.min(1160,area.width-50),height:Math.min(840,area.height-50),minWidth:800,minHeight:560,frame:false,show:false,backgroundColor:'#101923',icon:path.join(__dirname,'icon.ico'),webPreferences});secure(overview);overview.loadFile('overview.html');overview.once('ready-to-show',()=>overview.show());
 overview.on('close',e=>{if(!quitting){e.preventDefault();overview.hide();}});
}
function show(){if(win){win.show();if(win.isMinimized())win.restore();win.focus();}}
function persist(sync=true,broadcast=true){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(store,null,2));if(fs.existsSync(file))fs.copyFileSync(file,file+'.bak');fs.renameSync(file+'.tmp',file);if(broadcast)for(const w of [win,widget,overview])if(w&&!w.isDestroyed())w.webContents.send('changed');if(sync)cloudClient?.kick();}
function background(){try{return store.settings.hasBackground?'data:image/jpeg;base64,'+fs.readFileSync(path.join(app.getPath('userData'),'background.jpg')).toString('base64'):null;}catch{return null;}}
function notify(title,body){if(Notification.isSupported()){const n=new Notification({title,body,timeoutType:'never'});n.on('click',show);n.on('failed',()=>show());n.show();}else show();}
function check(){const alerts=pendingAlerts(store.tasks);if(!alerts.length)return;const groups=new Map();for(const a of alerts){a.task.fired.push(a.offset);a.task.alerts.push(new Date().toISOString());groups.set(a.task.id,a.task);}persist();for(const t of groups.values())notify('不急及及待办 · '+t.title,'截止 '+new Date(t.due).toLocaleString('zh-CN')+' · 打开待办查看');}
app.on('before-quit',()=>{clearTimeout(boundsTimer);if(store&&widget&&!widget.isDestroyed()){store.settings.widgetBounds=widget.getBounds();persist();}quitting=true;});app.on('window-all-closed',()=>{});

// Recognize the earlier misspelled shortcut only for an in-place rename.
function legacyDesktopShortcut(){return path.join(process.env.BJJJ_TODO_DATA_DIR?path.join(app.getPath('userData'),'Desktop'):app.getPath('desktop'),'不急及及\u4ee3办.lnk');}
function createDesktopShortcut(){
 if(process.platform!=='win32'||!app.isPackaged)throw Error('请在 Windows 打包版中创建快捷方式');
 const target=process.env.PORTABLE_EXECUTABLE_FILE||app.getPath('exe');
 if(!path.isAbsolute(target)||!fs.existsSync(target))throw Error('无法找到程序文件，请将程序保存在固定目录后重试');
 const desktop=process.env.BJJJ_TODO_DATA_DIR?path.join(app.getPath('userData'),'Desktop'):app.getPath('desktop');
 fs.mkdirSync(desktop,{recursive:true});fs.mkdirSync(app.getPath('userData'),{recursive:true});
 const icon=path.join(app.getPath('userData'),'shortcut.ico');fs.copyFileSync(path.join(__dirname,'icon.ico'),icon);
 const shortcut=path.join(desktop,'不急及及待办.lnk');
 if(!shell.writeShortcutLink(shortcut,'create',{target,cwd:path.dirname(target),description:'不急及及待办 · bjjj todo',icon,iconIndex:0,appUserModelId:'local.bjjj.todo'}))throw Error('无法创建快捷方式，请检查桌面目录的写入权限');
 const previous=legacyDesktopShortcut();try{if(fs.existsSync(previous)&&shell.readShortcutLink(previous).appUserModelId==='local.bjjj.todo')fs.unlinkSync(previous);}catch(e){console.error('Shortcut compatibility:',e.message);}
 store.settings.desktopShortcutCreated=true;persist();
}
