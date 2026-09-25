const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { webcrypto } = require('node:crypto');

const html = fs.readFileSync(require('node:path').join(__dirname, '../src/flightdesk.html'), 'utf8');
const source = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
const savedSession = { code: 'ABC2345', name: 'Alex', role: 'host', pilotRole: 'PF' };
const oldTasks = [{ text: 'Preflight and crew briefing', details: ['An existing crew reminder'], done: true, expanded: true }, { text: 'Bring the destination chart', details: ['Use the latest chart'], done: false }];

function app({saved = false, tasks = oldTasks, failStorage = false, peerFailures = [], peerPending = false} = {}) {
  const nodes = new Map([...html.slice(0, html.indexOf('<script')).matchAll(/\bid="([^"]+)"/g)].map(m => {
    const classes = new Set(['gate', 'name'].includes(m[1]) ? [] : ['hidden']);
    return [m[1], { value: '', textContent: '', innerHTML: '', disabled: false, dataset: {},
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, on) { if(on === undefined) on = !classes.has(x); on ? classes.add(x) : classes.delete(x); } },
      style: {setProperty(){}}, setAttribute(){}, focus(){}, scrollIntoView(){}, addEventListener(){}, querySelectorAll: () => [] }];
  }));
  nodes.get('gateRole').value = 'PF';
  nodes.get('name').value = 'Alex';
  const storage = new Map([['sharedCockpitName', 'Alex'], ['sharedCockpitPilotRole', 'PF']]);
  if(saved) {
    storage.set('sharedCockpitP2PSession', JSON.stringify(savedSession));
    storage.set('sharedCockpitP2PState:ABC2345', JSON.stringify({data: {notes:{brief:'Keep this briefing', enroute:'', debrief:''}, aircraft:'A320', plan:null, tasks}, versions:{tasks:{clock:4,actor:'old-client'}, 'notes.brief':{clock:3,actor:'old-client'}}, clock:4}));
  }
  const peers = [], timers = new Map();
  let nextTimer = 1, writesFail = false;
  class FakePeer extends EventEmitter {
    constructor(id) {
      super(); this.id = typeof id === 'string' ? id : 'guest'; this.open = false; this.connections = []; peers.push(this);
      queueMicrotask(() => { if(this.destroyed||peerPending)return; const failure = peerFailures.shift(); if(failure)this.emit('error', Object.assign(new Error(failure), {type:failure})); else { this.open=true; this.emit('open',this.id); } });
    }
    destroy(){this.destroyed=true;this.open=false;this.emit('close');}
    connect(id) {const connection=new EventEmitter();connection.peer=id;connection.open=false;connection.close=()=>connection.emit('close');this.connections.push(connection);return connection;}
  }
  const context = vm.createContext({ console, structuredClone, TextEncoder, TextDecoder, URL, crypto:webcrypto, Peer:FakePeer, queueMicrotask,
    setTimeout(fn, ms){const id=nextTimer++;timers.set(id,{fn,ms});return id;}, clearTimeout:id=>timers.delete(id), setInterval(){},
    localStorage: {getItem:key=>storage.get(key)||null,setItem(key,value){if(writesFail)throw new Error('Local storage write failed');storage.set(key,String(value));},removeItem:key=>storage.delete(key)},
    document:{querySelector:selector=>nodes.get(selector.slice(1))||null,querySelectorAll:()=>[],activeElement:null},
    window:{location:{href:'file:///flightdesk.html'},addEventListener(){},cockpitDesktop:{getFsuipcStatus:async()=>({running:false}),getSimPosition:async()=>({connected:false}),getAppInfo:async()=>({name:'Shared Cockpit Flight Desk',version:'0.3.1-alpha.6',displayVersion:'Alpha 0.3.1'})}}
  });
  vm.runInContext(source,context,{filename:'flightdesk.html'});
  writesFail=failStorage;
  return {nodes,peers,storage,context,timers,eval:code=>vm.runInContext(code,context),restoreStorage(){writesFail=false;}};
}

async function run() {
  const legacy=app({saved:true});
  try {
    await legacy.nodes.get('create').onclick();
    assert.equal(legacy.nodes.get('desk').classList.contains('hidden'),false,'Create must open a fresh desk despite a saved previous session');
    assert.equal(legacy.nodes.get('create').disabled,false,'Create must be available after finishing');
    assert.notEqual(legacy.nodes.get('lobbyCode').textContent,savedSession.code,'A new host session must get a new code');
    assert.equal(legacy.eval('data.notes.brief'),'','A fresh lobby must not restore the previous briefing');
    assert.doesNotMatch(legacy.nodes.get('tasks').innerHTML,/Bring the destination chart/,'A fresh lobby must not restore the previous checklist');
    console.log('PASS: Creating a lobby starts fresh and uses a new code.');
  } catch(error) {
    console.error('LEGACY CREATE FAILURE:',error.message,'create disabled:',legacy.nodes.get('create').disabled,'peer connections attempted:',legacy.peers.length);
    throw error;
  }
  const fresh=app();
  await fresh.nodes.get('create').onclick();
  assert.match(fresh.nodes.get('lobbyCode').textContent,/^[A-HJ-NP-Z2-9]{7}$/);
  assert.equal(fresh.peers.length,1);
  console.log('PASS: Fresh host creates one seven-character lobby.');

  const noAutoResume=app({saved:true});
  assert.equal(noAutoResume.nodes.get('desk').classList.contains('hidden'),true,'The app must stay on the lobby chooser at startup');
  assert.equal(noAutoResume.peers.length,0,'The app must not reconnect to the saved session');
  assert.equal(noAutoResume.storage.has('sharedCockpitP2PSession'),false,'The saved active-session pointer must be cleared');
  assert.equal(noAutoResume.storage.get('sharedCockpitLastLobbyCode'),savedSession.code,'Remember the old code only to avoid reusing it');
  console.log('PASS: Startup does not reconnect to the previous lobby.');

  const failed=app({peerFailures:['network']});
  await failed.nodes.get('create').onclick();
  assert.equal(failed.nodes.get('create').disabled,false);
  assert.ok(failed.nodes.get('gateerror').textContent);
  await failed.nodes.get('create').onclick();
  assert.equal(failed.nodes.get('desk').classList.contains('hidden'),false);
  console.log('PASS: Network failure is visible and Create can be retried.');

  const collision=app({peerFailures:['unavailable-id']});
  await collision.nodes.get('create').onclick();
  assert.equal(collision.peers.length,2);
  assert.equal(collision.nodes.get('desk').classList.contains('hidden'),false);
  console.log('PASS: A reserved lobby code retries with a new code.');

  const storage=app({failStorage:true});
  await storage.nodes.get('create').onclick();
  assert.ok(storage.nodes.get('gateerror').textContent.includes('storage'));
  assert.equal(storage.nodes.get('create').disabled,false);
  storage.restoreStorage();await storage.nodes.get('create').onclick();
  assert.equal(storage.nodes.get('desk').classList.contains('hidden'),false);
  console.log('PASS: Setup failure is caught and controls are restored.');

  const mixed=app({saved:true,tasks:[{id:'preliminary',text:'Preliminary Cockpit Prep',sections:[{id:'briefing',title:'Flight Prep Briefing',flows:{PF:[{role:'PF',text:'PF item',done:true}],PM:[{role:'PM',text:'PM item'}],CM:[]}}]},...oldTasks]});
  await mixed.eval("loadSessionState('ABC2345');applyState(data)");
  assert.match(mixed.nodes.get('tasks').innerHTML,/PF item/);
  assert.match(mixed.nodes.get('tasks').innerHTML,/Pilot Flying \(PF\)/);
  assert.match(mixed.nodes.get('tasks').innerHTML,/Pilot Monitoring \(PM\)/);
  assert.equal(mixed.eval("data.tasks[0].sections[0].flows.PF[0].role"),'PF');
  console.log('PASS: Explicitly loading an operational-flow session preserves role-tagged actions.');

  const join=app({saved:true});
  join.nodes.get('lobbyCodeInput').value=savedSession.code;
  await join.eval('joinLobby()');
  assert.equal(join.nodes.get('desk').classList.contains('hidden'),false);
  assert.equal(join.eval('session.role'),'join');
  assert.equal(join.eval('data.notes.brief'),'Keep this briefing');
  assert.match(join.nodes.get('tasks').innerHTML,/Preliminary Cockpit Prep/);
  assert.equal(join.peers.length,1);
  assert.equal(join.peers[0].connections.length,1);
  assert.equal(join.peers[0].connections[0].peer,savedSession.code);
  assert.equal(join.nodes.get('join').disabled,false);
  console.log('PASS: Joining with older saved data starts one host connection and preserves local notes.');

  const timeout=app({peerPending:true});
  const pendingCreate=timeout.nodes.get('create').onclick();
  const connectionTimeout=[...timeout.timers.values()].find(timer=>timer.ms===20000);
  assert.ok(connectionTimeout,'A pending signalling connection must have a timeout');
  connectionTimeout.fn();
  await pendingCreate;
  assert.match(timeout.nodes.get('gateerror').textContent,/Timed out/);
  assert.equal(timeout.nodes.get('gate').classList.contains('hidden'),false);
  assert.equal(timeout.nodes.get('create').disabled,false);
  assert.equal(timeout.nodes.get('join').disabled,false);
  assert.equal(timeout.peers[0].destroyed,true);
  assert.equal([...timeout.timers.values()].some(timer=>timer.ms===20000),false);
  console.log('PASS: Signalling timeout closes the failed peer and restores the lobby controls.');

  const doubleCreate=app();
  await Promise.all([doubleCreate.nodes.get('create').onclick(),doubleCreate.nodes.get('create').onclick()]);
  assert.equal(doubleCreate.peers.length,1,'Repeated Create clicks must not open competing peers');
  assert.equal(doubleCreate.nodes.get('desk').classList.contains('hidden'),false);
  console.log('PASS: Concurrent Create clicks create only one peer.');

  const newSession=app({saved:true});
  assert.equal([...newSession.timers.values()].filter(timer=>timer.ms===700).length,0,'Startup must not schedule an automatic resume');
  await newSession.nodes.get('create').onclick();
  const firstCode=newSession.nodes.get('lobbyCode').textContent;
  newSession.nodes.get('leave').onclick();
  await newSession.nodes.get('create').onclick();
  assert.notEqual(newSession.nodes.get('lobbyCode').textContent,firstCode,'Every newly created lobby must have a different code');
  assert.equal(newSession.peers.length,2);
  console.log('PASS: Each created lobby gets a new code with no scheduled resume.');

  const snapshot=JSON.parse(fresh.eval('JSON.stringify(snapshotFields())'));
  const tasksField=snapshot.find(field=>field.key==='tasks.PF');
  const aircraftField=snapshot.find(field=>field.key==='aircraft');
  assert.ok(tasksField&&aircraftField,'A fresh host must publish versioned tasks and aircraft');
  assert.ok(Number.isFinite(tasksField.version.clock)&&tasksField.version.clock>0);
  assert.equal(tasksField.version.actor,fresh.eval('deviceId'));
  assert.ok(tasksField.value.length>0);
  assert.ok(tasksField.value.every(phase=>Array.isArray(phase.sections)));
  assert.equal(aircraftField.value,'A320');
  console.log('PASS: A fresh host snapshot contains versioned PF/PM tasks and aircraft.');
}
run().catch(error=>{console.error(error.stack);process.exitCode=1;});
