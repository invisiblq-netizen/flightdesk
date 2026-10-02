const assert=require('node:assert/strict');
const api=require('../src/aircraft-profiles/fenix-telemetry.js');
const {sanitizeCockpit}=require('../src/cockpit-telemetry.cjs');
require('../src/aircraft-profiles/fenix-a320.js');
const profile=globalThis.FlightDeskAircraftProfiles.fenixA320;
const external='battery-external-power-pf-external-power-2';
const all=profile.phases.flatMap(p=>p.sections.flatMap(s=>Object.values(s.flows).flat()));
for(const id of Object.keys(api.rules))assert.ok(all.some(item=>item.id===id),'Rule must match an actual checklist item: '+id);
const sample=(values,time=10000,extra={})=>({available:true,aircraft:'FenixA320 IAE WF',sampledAt:time,generation:1,values,...extra});
const phase=structuredClone(profile.phases[0]);
const args={phase,role:'PF',unlocked:true,sessionKey:'flight'};
const tick=(tracker,cockpit,extra={})=>tracker.update({...args,cockpit,now:cockpit.sampledAt,...extra}).map(x=>x.id);
const on={I_OH_ELEC_EXT_PWR_L:1,I_OH_ELEC_EXT_PWR_U:0,S_OH_IN_LT_ANN_LT:1};
const tracker=api.createTracker();
assert.deepEqual(tick(tracker,sample({I_OH_ELEC_EXT_PWR_U:1,I_OH_ELEC_EXT_PWR_L:0,S_OH_IN_LT_ANN_LT:1})),[],'AVAIL is not ON');
assert.deepEqual(tick(tracker,sample(on,11000)),[]);
assert.deepEqual(tick(tracker,sample(on,11000)),[],'Repeated packets cannot prove stable state');
assert.deepEqual(tick(tracker,sample(on,13000)),[external]);
tracker.suppress(external);assert.deepEqual(tick(tracker,sample(on,14000)),[],'Manual uncheck is respected until the state changes');
tick(tracker,sample({...on,I_OH_ELEC_EXT_PWR_L:0},15000));tick(tracker,sample(on,16000));assert.deepEqual(tick(tracker,sample(on,18000)),[external]);
for(const bad of [{...on,S_OH_IN_LT_ANN_LT:2},{I_OH_ELEC_EXT_PWR_U:1},{...on,I_OH_ELEC_EXT_PWR_L:null},{...on,I_OH_ELEC_EXT_PWR_L:NaN}]){
 const t=api.createTracker();tick(t,sample(bad));assert.deepEqual(tick(t,sample(bad,12000)),[]);
}
for(const extra of [{unlocked:false},{role:'PM'}]){const t=api.createTracker();tick(t,sample(on),extra);assert.deepEqual(tick(t,sample(on,12000),extra),[]);}
for(const extra of [{available:false},{aircraft:'Other A320'}]){const t=api.createTracker();tick(t,sample(on,10000,extra));assert.deepEqual(tick(t,sample(on,12000,extra)),[]);}
assert.equal(api.valid(sample(on),20000),false);
const pm=api.createTracker();const safe={S_ENG_MASTER_1:0,S_ENG_MASTER_2:0,S_ENG_MODE:1,S_WR_SYS:1,S_WR_PRED_WS:0,S_MIP_GEAR:1,S_MISC_WIPER_CAPT:0,S_MISC_WIPER_FO:0};
tick(pm,sample(safe),{role:'PM'});assert.equal(tick(pm,sample(safe,12000),{role:'PM'}).length,6);
const rcl=api.createTracker();tick(rcl,sample({},10000,{recallPressedAt:9000}));assert.deepEqual(tick(rcl,sample({},11000,{recallPressedAt:10500})),['ecam-logbook-pf-ecam-rcl-pushbutton-1']);
assert.equal(Object.keys(sanitizeCockpit(sample({...on,UNKNOWN:5}),10000).values).length,3);
assert.equal(sanitizeCockpit(sample(on),20000).available,false);
console.log('PASS: Explicit rules reject AVAIL, lamp tests, missing values, stale/duplicate data, other aircraft, roles and locked phases; manual override and RCL events work.');
const {app}=require('./lobby-regression.cjs');const flight=app();
flight.eval("prepareSession('host','Pilot','ABC2345','PF');data.aircraft='A320';data.tasks=tasksFor('A320');applyState(data)");
for(const time of [10000,12000]){flight.context.position={connected:true,cockpitReady:true,cockpit:sample(on,time)};flight.context.tickTime=time;flight.eval('updateAutomaticChecklist(position,tickTime)');}
assert.equal(flight.eval("data.tasks[0].sections.find(s=>s.id==='battery-external-power').flows.PF[1].autoChecked"),true);
assert.equal(flight.eval("data.tasks[0].sections.find(s=>s.id==='ecam-logbook').flows.PF.find(a=>a.title==='Recalled ECAM messages').done"),false);
assert.equal(flight.eval('data.ops.events.filter(a=>a.type===\'checklist.item-completed\'&&a.by===\'Simulator telemetry\').length'),1);
flight.eval('applyState(data)');
assert.equal(flight.eval("data.tasks[0].sections.find(s=>s.id==='battery-external-power').flows.PF[1].autoChecked"),true);
const guest=app();guest.eval("prepareSession('join','Guest','ABC2345','PM')");guest.context.fields=JSON.parse(flight.eval('JSON.stringify(snapshotFields())'));guest.eval("stateVersions={};applyRemoteFields(fields,'PF')");
assert.equal(guest.eval("data.tasks[0].sections.find(s=>s.id==='battery-external-power').flows.PF[1].autoChecked"),true);
assert.match(guest.nodes.get('tasks').innerHTML,/Checked automatically from simulator telemetry/);
console.log('PASS: Auto-checks persist and synchronize to the peer with simulator attribution, while ECAM review stays manual.');
