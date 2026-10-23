const fs=require('node:fs'),path=require('node:path');
function migrateLegacyData(previous,current){
 const source=path.join(previous,'tasks.json'),target=path.join(current,'tasks.json');
 if(fs.existsSync(target)||!fs.existsSync(source))return false;
 const content=fs.readFileSync(source,'utf8'),data=JSON.parse(content);
 if(data.version!==1||!Array.isArray(data.tasks))throw Error('旧版待办数据格式不正确，已保留原文件');
 fs.mkdirSync(current,{recursive:true});
 for(const name of ['tasks.json.bak','background.jpg']){
  const from=path.join(previous,name),to=path.join(current,name);
  if(fs.existsSync(from)&&!fs.existsSync(to))fs.copyFileSync(from,to);
 }
 fs.writeFileSync(target+'.tmp',content);fs.renameSync(target+'.tmp',target);return true;
}
module.exports={migrateLegacyData};
