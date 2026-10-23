const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),release=path.join(root,'release');
const files=fs.readdirSync(release).filter(f=>f.endsWith('.exe'));
if(files.length!==1)throw Error('The release directory must contain exactly one executable.');
const file=path.join(release,files[0]),hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(path.join(release,'SHA256SUMS.txt'),`${hash}  ${files[0]}\n`);
console.log(JSON.stringify({file:files[0],bytes:fs.statSync(file).size,sha256:hash}));
