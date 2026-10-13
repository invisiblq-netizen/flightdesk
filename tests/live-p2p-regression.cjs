// Two isolated clients on this PC, using the real PeerJS signalling service.
// This checks data transport; it does not certify remote NAT or microphone audio.
const {app,BrowserWindow}=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const out=path.join(__dirname,'../work/live-p2p');fs.mkdirSync(out,{recursive:true});
const log=message=>fs.appendFileSync(path.join(out,'results.log'),message+'\n');
fs.writeFileSync(path.join(out,'results.log'),'');
app.setPath('userData',fs.mkdtempSync(path.join(app.getPath('temp'),'flightdesk-p2p-audit-')));
app.disableHardwareAcceleration();app.on('window-all-closed',()=>{});
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const windows=[];
const evaluate=(win,code)=>win.webContents.executeJavaScript(code);
async function waitFor(win,expression,label){const end=Date.now()+40000;while(Date.now()<end){if(await evaluate(win,expression))return;await new Promise(resolve=>setTimeout(resolve,200))}throw new Error('Timed out: '+label+' · '+await evaluate(win,"document.querySelector('#gateerror')?.textContent||''"))}
async function run(){
 await app.whenReady();
 for(const role of ['host','monitor']){
  const win=new BrowserWindow({show:false,width:1440,height:900,webPreferences:{offscreen:true,contextIsolation:false,nodeIntegration:false,sandbox:false,partition:'audit-'+role,preload:path.join(__dirname,'renderer-preload.cjs')}});
  win.webContents.on('console-message',(_event,...args)=>log('Renderer: '+args.map(value=>typeof value==='object'?JSON.stringify(value):String(value)).join(' ')));
  windows.push(win);await win.loadFile(path.join(__dirname,'../src/flightdesk.html'));
 }
 const [host,guest]=windows;
 await evaluate(host,"document.querySelector('#name').value='Audit host';document.querySelector('#gateRole').value='PF';createLobby()");
 await waitFor(host,"session?.role==='host'&&!document.querySelector('#desk').classList.contains('hidden')",'host lobby');
 const code=await evaluate(host,'session.code');
 await evaluate(guest,`document.querySelector('#name').value='Audit monitor';document.querySelector('#gateRole').value='PM';document.querySelector('#lobbyCodeInput').value=${JSON.stringify(code)};joinLobby()`);
 await waitFor(host,'peerConnected','host data channel');await waitFor(guest,'peerConnected','monitor data channel');
 log('PASS: Two isolated clients establish a real PeerJS/WebRTC data channel on this PC.');
 await evaluate(host,"data.plan={origin:{icao_code:'ENGM'},destination:{icao_code:'EGLL'},aircraft:{icaocode:'A320'},general:{callsign:'AUDIT123'}};data.aircraft='A320';data.aircraftProfile='fenix-a320';data.tasks=tasksFor('A320');applyState(data);postPatch({plan:data.plan,aircraft:'A320',aircraftProfile:'fenix-a320',tasks:true})");
 await waitFor(guest,"data.plan?.general?.callsign==='AUDIT123'",'flight-plan synchronization');
 await evaluate(guest,"data.notes.brief='Isolated audit note';postPatch({notes:{brief:data.notes.brief}})");
 await waitFor(host,"data.notes.brief==='Isolated audit note'",'monitor note synchronization');
 await evaluate(guest,"const phase=data.tasks[0];phaseActions(phase,['PM'])[0].done=true;postPatch({tasks:true,checklistRole:'PM'})");
 await waitFor(host,"phaseActions(data.tasks[0],['PM'])[0].done===true",'PM checklist synchronization');
 assert.equal(await evaluate(host,"phaseActions(data.tasks[0],['PF'])[0].done"),false,'PM update does not complete the PF item');
 log('PASS: Real data transport synchronizes a flight plan, monitor notes and PM checklist changes while preserving PF ownership.');
 for(const win of windows){
  await evaluate(win,`(async()=>{window.auditToneContext=new AudioContext();const source=auditToneContext.createOscillator(),gain=auditToneContext.createGain(),destination=auditToneContext.createMediaStreamDestination();source.frequency.value=440;gain.gain.value=.02;source.connect(gain).connect(destination);source.start();await auditToneContext.resume();navigator.mediaDevices.getUserMedia=async()=>{const replacement=auditToneContext.createMediaStreamDestination();gain.connect(replacement);return replacement.stream};document.querySelector('#voiceVolume').value='0';document.querySelector('#voiceMode').value='open';document.querySelector('#voiceMode').onchange();await toggleVoice()})()`);
  log('Audio start: '+await evaluate(win,"JSON.stringify({state:voiceLink.getState(),status:document.querySelector('#voiceStatus').textContent})"));
 }
 await waitFor(host,"voiceLink.getState().calls===1&&voiceLink.getState().connectionState==='connected'",'host synthetic Voice Link');
 await waitFor(guest,"voiceLink.getState().calls===1&&voiceLink.getState().connectionState==='connected'",'monitor synthetic Voice Link');
 for(const win of windows){
  assert.equal(await evaluate(win,"voiceLink.getAudioStreams().receive.getAudioTracks().length"),1);
  assert.equal(await evaluate(win,"document.querySelector('#voiceRemoteAudio').volume"),0);
  await waitFor(win,"(async()=>{const call=Object.values(peer.connections).flat().find(c=>c.type==='media'),stats=await call.peerConnection.getStats();return [...stats.values()].some(s=>s.type==='inbound-rtp'&&s.kind==='audio'&&s.bytesReceived>0)})()",'received audio packets');
  assert.equal((await evaluate(win,"voiceLink.setInputDevice('isolated-fixture')")).ok,true);
  assert.equal(await evaluate(win,"voiceLink.getState().connectionState"),'connected','Changing the synthetic input does not tear down the established call');
  const retained=await evaluate(win,"(async()=>{const original=navigator.mediaDevices.getUserMedia,track=voiceLink.getAudioStreams().transmit.getAudioTracks()[0];navigator.mediaDevices.getUserMedia=async()=>{throw new Error('Fixture missing microphone')};const result=await voiceLink.setInputDevice('missing-fixture');navigator.mediaDevices.getUserMedia=original;return{ok:result.ok,same:track===voiceLink.getAudioStreams().transmit.getAudioTracks()[0],alive:track.readyState}})()");
  assert.deepEqual(retained,{ok:false,same:true,alive:'live'});
  await evaluate(win,"document.querySelector('#voiceMode').value='ptt';document.querySelector('#voiceMode').onchange();voiceLink.press()");
  assert.equal(await evaluate(win,"voiceLink.getAudioStreams().transmit.getAudioTracks()[0].enabled"),true);
  await evaluate(win,"voiceLink.release()");
  await waitFor(win,"!voiceLink.getAudioStreams().transmit.getAudioTracks()[0].enabled",'PTT release');
 }
 log('PASS: Both real Voice Link clients receive synthetic audio RTP packets and PTT opens/closes their transmit tracks. Input replacement keeps calls connected; a rejected input preserves the working stream. No microphone is accessed; speaker volume is zero. Physical audio quality remains untested.');
 await evaluate(guest,"voiceLink.close();auditToneContext.close()");await evaluate(host,"voiceLink.close();auditToneContext.close()");
 await evaluate(guest,'saveSessionState()');
 await new Promise(resolve=>{guest.webContents.once('did-finish-load',resolve);guest.webContents.reload()});
 await waitFor(guest,'!!pendingSessionRecovery','saved monitor session');
 await evaluate(guest,'resumePreviousFlight()');
 await waitFor(guest,'peerConnected','monitor recovery connection');
 await waitFor(host,'peerConnected','host recovery connection');
 assert.equal(await evaluate(guest,"data.plan?.general?.callsign"),'AUDIT123');
 assert.equal(await evaluate(guest,"data.notes.brief"),'Isolated audit note');
 assert.equal(await evaluate(guest,"phaseActions(data.tasks[0],['PM'])[0].done"),true);
 log('PASS: Reloading the monitor client and explicitly resuming reconnects to the host while preserving the plan, notes and PM checklist state.');
 await evaluate(guest,'stopPeer()');
 await waitFor(host,'!peerConnected','disconnect cleanup');
 log('PASS: The other client detects disconnection and clears its connected state.');
 windows.forEach(win=>win.destroy());app.quit();
}
run().catch(async error=>{log(error.stack||String(error));for(const win of windows){if(!win.isDestroyed())log('Failure state: '+await evaluate(win,"JSON.stringify({state:voiceLink?.getState(),status:document.querySelector('#voiceStatus')?.textContent,connections:Object.values(peer?.connections||{}).flat().map(c=>({type:c.type,open:c.open,signal:c.peerConnection?.signalingState,local:c.peerConnection?.localDescription?.type,remote:c.peerConnection?.remoteDescription?.type,senders:c.peerConnection?.getSenders().map(s=>s.track?.readyState)}))})").catch(()=>''));}windows.forEach(win=>win.destroy());app.exit(1)});
