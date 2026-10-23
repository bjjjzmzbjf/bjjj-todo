const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {migrateLegacyData}=require('./migrate-data.cjs');
test('首次改名迁移保留待办、设置、背景、备份和原文件，再次运行不覆盖',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bjjj-migration-')),previous=path.join(root,'previous'),current=path.join(root,'current');fs.mkdirSync(previous);
 const data={version:1,tasks:[{id:'existing',title:'已有待办'}],settings:{hasBackground:true,widgetEnabled:true,backgroundDim:60}};
 const content=JSON.stringify(data);fs.writeFileSync(path.join(previous,'tasks.json'),content);fs.writeFileSync(path.join(previous,'tasks.json.bak'),'backup');fs.writeFileSync(path.join(previous,'background.jpg'),Buffer.from([1,2,3]));
 assert.equal(migrateLegacyData(previous,current),true);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(current,'tasks.json'),'utf8')),data);assert.equal(fs.readFileSync(path.join(previous,'tasks.json'),'utf8'),content);assert.deepEqual(fs.readFileSync(path.join(current,'background.jpg')),Buffer.from([1,2,3]));assert.equal(fs.readFileSync(path.join(current,'tasks.json.bak'),'utf8'),'backup');
 fs.writeFileSync(path.join(current,'tasks.json'),'new data');assert.equal(migrateLegacyData(previous,current),false);assert.equal(fs.readFileSync(path.join(current,'tasks.json'),'utf8'),'new data');
});
test('无旧数据时不迁移，旧数据损坏时不生成新数据',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'bjjj-migration-'));assert.equal(migrateLegacyData(path.join(root,'missing'),path.join(root,'current')),false);fs.writeFileSync(path.join(root,'tasks.json'),'bad json');assert.throws(()=>migrateLegacyData(root,path.join(root,'current')));assert.equal(fs.existsSync(path.join(root,'current','tasks.json')),false);});
