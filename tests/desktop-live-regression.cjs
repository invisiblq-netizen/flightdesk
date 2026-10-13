// Source-app integration with the real sandboxed preload and main-process IPC.
// Uses a temporary profile. No user's lobby, notes, recordings or preferences are changed.
const {app,BrowserWindow,dialog,net}=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..'),out=path.join(root,'work/desktop-live');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.log'),'');
const report=value=>fs.appendFileSync(path.join(out,'results.log'),value+'\n');
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'flightdesk-desktop-audit-')));
app.setAppPath(root);
// The test-file entry point otherwise reports Electron's package version.
app.getVersion=()=>require('../package.json').version;
app.disableHardwareAcceleration();
const originalSaveDialog=dialog.showSaveDialog;
// Deterministic save/cancel selections; the actual archive and IPC are used.
dialog.showSaveDialog=async()=>({canceled:false,filePath:path.join(out,'diagnostics.zip')});
require('../src/main.cjs');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check,label){const end=Date.now()+45000;while(Date.now()<end){if(await check())return;await delay(100)}throw Error('Timed out: '+label)}
let win;
const evaluate=code=>win.webContents.executeJavaScript(code).catch(error=>{throw Error(code.slice(0,160)+' · '+error.message)});
async function run(){
 await app.whenReady();
 await waitFor(()=>{win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/flightdesk.html'));return win&&!win.webContents.isLoading()},'main renderer');
 const prefs=win.webContents.getLastWebPreferences();
 assert.equal(prefs.contextIsolation,true);assert.equal(prefs.sandbox,true);assert.equal(prefs.nodeIntegration,false);
 assert.equal(await evaluate("typeof require"),'undefined');
 const info=await evaluate('window.cockpitDesktop.getAppInfo()');
 report('PASS: Source app launches with the real context-isolated, sandboxed preload; renderer has no Node require. Build '+info.version+'.');
 assert.equal((await evaluate('window.cockpitDesktop.checkForAppUpdates()')).state,'development');
 await evaluate("document.querySelector('#name').value='Desktop audit';document.querySelector('#gateRole').value='PF';createLobby()");
 await waitFor(()=>evaluate("session?.role==='host'&&!document.querySelector('#desk').classList.contains('hidden')"),'real lobby');
 report('PASS: Real main-process app creates a lobby through PeerJS.');
 const identity=process.env.FLIGHTDESK_AUDIT_SIMBRIEF;
 if(identity){
  await evaluate(`document.querySelector('#simid').value=${JSON.stringify(identity)};document.querySelector('#simform').requestSubmit()`);
  await waitFor(()=>evaluate("!!data.plan&&!manualSimbriefBusy"),'actual SimBrief import');
  await evaluate("activatePage('flight-plan');showFlightPlan()");
  await waitFor(()=>evaluate("!!currentPdf&&document.querySelector('#pdfCanvas').width>0"),'actual PDF');
  report('PASS: Actual SimBrief plan imports through secure IPC; '+await evaluate("getPlanAirport(data.plan,'origin')+' → '+getPlanAirport(data.plan,'destination')+' · '+currentPdf.numPages+' PDF pages'"));
  await evaluate("document.querySelector('#pdfNext').click()");
  await waitFor(()=>evaluate('currentPdfPage===2&&!document.querySelector("#pdfNext").disabled'),'PDF page 2');
  const width=await evaluate("document.querySelector('#pdfCanvas').getBoundingClientRect().width");
  await evaluate("document.querySelector('#pdfZoomIn').click()");
  await waitFor(()=>evaluate(`!document.querySelector("#pdfNext").disabled&&document.querySelector('#pdfCanvas').getBoundingClientRect().width>${width}*1.1`),'actual PDF zoom');
  await evaluate("document.querySelector('#pdfFitWidth').click();document.querySelector('#pdfPrev').click();renderPdfPage()");
  report('PASS: Actual multi-page PDF supports next/previous, zoom and fit-width.');
 }
 await waitFor(()=>evaluate('airportRequests.size===0'),'weather requests settle');
 await evaluate("activatePage('overview');renderFlightProgress()");await delay(400);
 if(identity)assert.equal(await evaluate("document.querySelector('#boardRouteMap svg.route-map')!==null"),true,'Preview exists before opening Route Viewer');
 report('Weather/ATC availability: '+await evaluate("document.querySelector('#origName').textContent+' · '+document.querySelector('#origMetar').textContent+' · '+document.querySelector('#destMetar').textContent"));
 for(const [width,height]of [[1440,900],[1920,1080]]){
  win.setContentSize(width,height);
  for(const page of ['overview','flight-plan','route','checklist','notes','traffic','analysis','efb','charts','crew-tools','diagnostics']){
   await evaluate(`activatePage(${JSON.stringify(page)})`);await delay(150);
   assert.equal(await evaluate(`document.querySelector('#page-${page}').classList.contains('active')`),true);
   assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
   fs.writeFileSync(path.join(out,`${page}-${width}.png`),(await win.webContents.capturePage()).toPNG());
  }
 }
 report('PASS: All 11 workspaces open in the secure source app at 1440×900 and 1920×1080; screenshots captured.');
 await evaluate("activatePage('notes','notes')");await delay(150);
 fs.writeFileSync(path.join(out,'note-templates.png'),(await win.webContents.capturePage()).toPNG());
 await evaluate("document.querySelector('#themeToggle').click();activatePage('overview')");await delay(300);
 assert.equal(await evaluate('document.documentElement.dataset.theme'),'light');
 fs.writeFileSync(path.join(out,'overview-light.png'),(await win.webContents.capturePage()).toPNG());
 await evaluate("document.querySelector('#themeToggle').click()");
 const archive=await evaluate('window.cockpitDesktop.exportDiagnostics({errors:[],events:[],connections:{p2p:"audit"}})');
 assert.equal(archive.ok,true);assert.equal(fs.readFileSync(archive.path).subarray(0,2).toString(),'PK');
 dialog.showSaveDialog=async()=>({canceled:true});
 assert.equal((await evaluate('window.cockpitDesktop.exportDiagnostics({})')).canceled,true);
 dialog.showSaveDialog=originalSaveDialog;
 const recording=await evaluate('window.cockpitDesktop.beginCvrRecording({route:"isolated storage audit"})');
 assert.equal(recording.ok,true);
 const encoded=Buffer.from('fixture bytes for storage integrity; no captured microphone audio').toString('base64');
 assert.equal((await evaluate(`window.cockpitDesktop.appendCvrRecording({id:${JSON.stringify(recording.id)},data:${JSON.stringify(encoded)}})`)).ok,true);
 assert.equal((await evaluate(`window.cockpitDesktop.endCvrRecording({id:${JSON.stringify(recording.id)},durationMs:100})`)).ok,true);
 const recordings=await evaluate('window.cockpitDesktop.listCvrRecordings()');assert.equal(recordings.recordings.length,1);
 const response=await net.fetch(recording.url,{headers:{Range:'bytes=0-6'}});const play={status:response.status,bytes:Array.from(new Uint8Array(await response.arrayBuffer()))};
 assert.equal(play.status,206);assert.deepEqual(play.bytes,Array.from(Buffer.from(encoded,'base64').subarray(0,7)));
 report('PASS: Diagnostics ZIP save/cancel, recording storage and ranged local playback use the real IPC/filesystem/protocol in a temporary profile. No microphone audio recorded.');
 const unauthorized=new BrowserWindow({show:false,webPreferences:{preload:path.join(root,'src/preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
 await unauthorized.loadURL('data:text/html,<h1>Unauthorized sender test</h1>');
 assert.match(await unauthorized.webContents.executeJavaScript("window.cockpitDesktop.windowControls.getState().then(()=>'',e=>e.message)"),/Invalid window-control sender/);
 unauthorized.destroy();
 await evaluate('window.cockpitDesktop.windowControls.toggleMaximize()');await waitFor(()=>win.isMaximized(),'maximize');
 assert.equal(await evaluate('document.documentElement.dataset.windowMaximized'),'true');
 await evaluate('window.cockpitDesktop.windowControls.toggleMaximize()');await waitFor(()=>!win.isMaximized(),'restore');
 await evaluate('window.cockpitDesktop.windowControls.minimize()');await waitFor(()=>win.isMinimized(),'minimize');win.restore();
 report('PASS: Light Mode, maximize/restore/minimize and rejection of another renderer’s window-control IPC.');
 const errors=await evaluate('recentRendererErrors');assert.deepEqual(errors,[],'Secure renderer reports no uncaught errors');
 report('PASS: No uncaught renderer errors during the source-app integration audit. Closing the test app.');
 await evaluate('stopPeer();window.cockpitDesktop.windowControls.close()').catch(()=>{});
 await waitFor(()=>win.isDestroyed(),'close');app.quit();
}
run().catch(error=>{report(error.stack||String(error));app.exit(1)});
