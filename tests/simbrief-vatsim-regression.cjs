const assert = require('node:assert/strict');
const {app} = require('./lobby-regression.cjs');
const {exactVatsimFlight} = require('../src/vatsim-flight.cjs');
async function run() {
  const pilots=[{callsign:'SAS1234',latitude:60,longitude:11},{callsign:'SAS123',latitude:0,longitude:0,heading:305,altitude:32000,groundspeed:410,flight_plan:{aircraft_short:'A20N',remarks:'REG/LNABC',departure:'ENGM',arrival:'EGLL'}}];
  assert.equal(exactVatsimFlight(pilots,' sas123 ').callsign,'SAS123');
  assert.equal(exactVatsimFlight(pilots,'SAS12').found,false);
  assert.equal(exactVatsimFlight(pilots,'').found,false);
  assert.equal(exactVatsimFlight(pilots,'SAS 123').found,false);
  assert.equal(exactVatsimFlight(pilots,'SAS123').registration,'LNABC');
  assert.equal(exactVatsimFlight(pilots,'SAS123').latitude,0,'Equator positions must be retained');
  assert.equal(exactVatsimFlight(pilots,'SAS123').headingDegrees,305);
  assert.equal(exactVatsimFlight([{callsign:'BAD',latitude:95,longitude:-190,heading:360}],'BAD').latitude,null);
  assert.equal(exactVatsimFlight([{callsign:'BAD',latitude:95,longitude:-190,heading:360}],'BAD').headingDegrees,null);
  console.log('PASS: VATSIM matches the identical callsign only, irrespective of proximity.');

  const flight=app();
  await flight.nodes.get('create').onclick();
  flight.eval("Date.now=()=>Date.parse('2026-09-25T23:30:00Z')");
  for(const [iso,expected] of [['2026-09-25T23:29:59Z',false],['2026-09-25T23:30:00Z',true],['2026-09-26T00:15:00Z',true],['2026-09-26T00:30:00Z',true],['2026-09-26T00:30:01Z',false]]){
    flight.context.testPlan={times:{sched_out:String(Date.parse(iso)/1000)}};
    assert.equal(flight.eval('departureWithinNextHour(testPlan)'),expected,iso);
  }
  assert.equal(flight.eval('departureWithinNextHour({})'),false);
  flight.eval("renderClocks(new Date('2026-09-26T00:15:00Z'))");
  assert.equal(flight.nodes.get('zuluClock').textContent,'00:15:00 Z');
  assert.match(flight.nodes.get('zuluClockDate').textContent,/26 Sept 2026/);
  assert.ok(flight.nodes.get('localClockDate').textContent);
  console.log('PASS: UTC departure window and clocks handle midnight, date rollover and exact one-hour boundaries.');

  let calls=0;
  const plan={times:{sched_out:String(Date.parse('2026-09-26T00:15:00Z')/1000)},aircraft:{icaocode:'B738',reg:'OY-KBH'},general:{callsign:'SAS123'}};
  flight.context.window.cockpitDesktop.fetchSimbrief=async id=>{calls++;assert.equal(id,'saved-pilot');return {ok:true,data:plan}};
  flight.storage.set('sharedCockpitSimBriefId','saved-pilot');
  flight.eval('connectInviteHandlers()');
  assert.equal(flight.nodes.get('simid').value,'saved-pilot');
  await flight.eval('autoImportSimbrief()');
  assert.equal(flight.eval('data.aircraft'),'B738');
  assert.equal(flight.eval('data.plan.aircraft.reg'),'OY-KBH','SimBrief aircraft registration must survive plan compaction');
  assert.equal(flight.nodes.get('aircraftReg').textContent,'OY-KBH','Flight Board must display the SimBrief registration');
  assert.equal(flight.nodes.get('importLabel').textContent,'Automatically imported');
  await flight.eval('autoImportSimbrief()');
  assert.equal(calls,1,'Existing plan must never be automatically replaced');
  flight.eval("data.plan=null;autoSimbriefLastCheck=0;session.role='join'");
  await flight.eval('autoImportSimbrief()');
  assert.equal(calls,1,'Guests must not replace the host flight plan');
  flight.eval("session.role='host'");
  plan.times.sched_out=String(Date.parse('2026-09-26T02:00:00Z')/1000);
  await flight.eval('autoImportSimbrief()');
  assert.equal(flight.eval('data.plan'),null);
  await flight.nodes.get('simform').onsubmit({preventDefault(){}});
  assert.equal(flight.eval('data.aircraft'),'B738','Manual import ignores the automatic time window');
  assert.equal(flight.storage.get('sharedCockpitSimBriefId'),'saved-pilot');
  console.log('PASS: Saved ID is restored; automatic imports respect the window and shared plan; manual imports remain available.');

  flight.eval('data.plan=null;autoSimbriefLastCheck=0');
  let complete;
  flight.context.window.cockpitDesktop.fetchSimbrief=()=>new Promise(resolve=>complete=resolve);
  const pending=flight.eval('autoImportSimbrief()');
  flight.eval("data.plan={general:{callsign:'PEER123'}}");
  complete({ok:true,data:{...plan,times:{sched_out:String(Date.parse('2026-09-26T00:15:00Z')/1000)}}});
  await pending;
  assert.equal(flight.eval('data.plan.general.callsign'),'PEER123');
  console.log('PASS: A pending auto import cannot overwrite a newly received shared plan.');

  const focused=app();await focused.nodes.get('create').onclick();
  focused.eval("Date.now=()=>Date.parse('2026-09-25T23:30:00Z')");
  let focusedCalls=0;
  focused.context.window.cockpitDesktop.fetchSimbrief=async id=>{focusedCalls++;assert.equal(id,'focused-pilot');return {ok:true,data:plan}};
  focused.nodes.get('simid').value=' focused-pilot ';
  assert.equal(typeof focused.nodes.get('simid').oninput,'function','Typing must enable auto import without a blur/change event');
  focused.nodes.get('simid').oninput();
  assert.equal(focused.storage.get('sharedCockpitSimBriefId'),'focused-pilot');
  assert.equal(focusedCalls,0,'Do not fetch while typing');
  const inputTimer=[...focused.timers.values()].find(timer=>timer.ms===700);assert.ok(inputTimer);
  plan.times.sched_out=String(Date.parse('2026-09-26T00:15:00Z')/1000);
  await inputTimer.fn();assert.equal(focusedCalls,1);assert.equal(focused.eval('data.plan.general.callsign'),'SAS123');
  focused.eval('data.plan=null;autoSimbriefLastCheck=0');
  let finishOld;
  focused.context.window.cockpitDesktop.fetchSimbrief=id=>id==='focused-pilot'?new Promise(resolve=>finishOld=resolve):Promise.resolve({ok:true,data:{...plan,general:{callsign:'NEW123'}}});
  const oldRequest=focused.eval('autoImportSimbrief()');
  focused.nodes.get('simid').value='new-pilot';focused.nodes.get('simid').oninput();
  finishOld({ok:true,data:plan});await oldRequest;await Promise.resolve();
  assert.equal(focused.eval('data.plan.general.callsign'),'NEW123','An ID changed during a request must be checked immediately after it finishes');
  console.log('PASS: Typing a SimBrief ID imports after a short pause without blur; changing IDs during a request retries the new ID and rejects the old plan.');
}
run().catch(error=>{console.error(error.stack);process.exitCode=1});
