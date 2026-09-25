const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const output = path.join(root,'work/ui-checks');
fs.mkdirSync(output,{recursive:true});
const fd = fs.openSync(path.join(output,'electron.log'),'w');
let result;
try {
  result = spawnSync(require('electron'),[path.join(__dirname,'renderer-regression.cjs')],{
    cwd:root,windowsHide:true,stdio:['ignore',fd,fd],timeout:120000
  });
} finally {
  fs.closeSync(fd);
}
const log = path.join(output,'results.log');
if(fs.existsSync(log))process.stdout.write(fs.readFileSync(log,'utf8'));
if(result.error)console.error(result.error.message);
process.exitCode = result.error ? 1 : result.status ?? 1;
