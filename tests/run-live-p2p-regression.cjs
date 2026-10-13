const {spawnSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
const out=path.join(__dirname,'../work/live-p2p');fs.mkdirSync(out,{recursive:true});
const fd=fs.openSync(path.join(out,'electron.log'),'w');let result;
try{result=spawnSync(require('electron'),[path.join(__dirname,'live-p2p-regression.cjs')],{windowsHide:true,stdio:['ignore',fd,fd],timeout:95000})}finally{fs.closeSync(fd)}
const log=path.join(out,'results.log');if(fs.existsSync(log))process.stdout.write(fs.readFileSync(log,'utf8'));
if(result.error)console.error(result.error.message);process.exitCode=result.error?1:result.status??1;
