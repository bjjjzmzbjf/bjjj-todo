const fs=require('node:fs');
const executable=require('electron');
if(!fs.existsSync(executable))throw Error('Electron runtime was not installed successfully.');
console.log('Electron runtime is ready.');
