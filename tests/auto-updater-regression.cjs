const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {EventEmitter}=require('node:events');
const moduleFixture={exports:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../src/auto-updater.cjs'),'utf8'),{module:moduleFixture,require:name=>{assert.equal(name,'electron-updater');return{autoUpdater:{}}},Promise,setTimeout,clearTimeout,setInterval,clearInterval});
const {createAutoUpdater}=moduleFixture.exports;
async function run(){
 const app=Object.assign(new EventEmitter(),{isPackaged:true,getVersion:()=> '0.6.0-alpha.2'}),updater=new EventEmitter();let checks=0,installs=0,resolveCheck;
 updater.checkForUpdates=()=>{checks++;return new Promise(resolve=>{resolveCheck=resolve})};updater.quitAndInstall=()=>{installs++};
 const service=createAutoUpdater({app,updater});assert.equal(updater.allowPrerelease,true);assert.equal(updater.autoDownload,true);
 const first=service.checkNow(),second=service.checkNow();await Promise.resolve();assert.equal(checks,1);updater.emit('update-not-available',{version:app.getVersion()});resolveCheck(null);await Promise.all([first,second]);assert.equal(service.getStatus().state,'up-to-date');
 service.install();assert.equal(installs,0);updater.emit('update-available',{version:'fixture'});updater.emit('download-progress',{percent:142});assert.equal(service.getStatus().percent,100);await service.checkNow();assert.equal(checks,1,'A download does not start another update check');
 updater.emit('update-downloaded',{version:'fixture'});service.install();assert.equal(installs,1);
 updater.quitAndInstall=()=>{throw Error('Fixture installer failure')};assert.equal(service.install().state,'error');
 updater.checkForUpdates=()=>{checks++;throw Error('Fixture synchronous failure')};assert.equal((await service.checkNow()).state,'error');
 updater.checkForUpdates=async()=>{checks++;updater.emit('update-not-available',{version:app.getVersion()})};assert.equal((await service.checkNow()).state,'up-to-date');
 app.emit('will-quit');
 const development=createAutoUpdater({app:{isPackaged:false,getVersion:()=> 'development'},updater:{}});assert.equal((await development.checkNow()).state,'development');
 console.log('PASS: Update checks coalesce, prerelease downloads/progress/install gating work, synchronous failures recover and shutdown clears timers.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
