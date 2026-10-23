const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('bjjjTodo',{call:(name,data)=>ipcRenderer.invoke('bjjj-todo',name,data),onChange:fn=>ipcRenderer.on('changed',()=>fn()),onSelectDay:fn=>ipcRenderer.on('select-day',(_,data)=>fn(data))});
