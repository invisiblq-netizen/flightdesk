const assert = require('node:assert/strict');
const {app} = require('./lobby-regression.cjs');

async function run() {
  const flight = app();
  await flight.nodes.get('create').onclick();
  flight.nodes.get('simid').value='test-pilot';
  assert.equal(flight.eval('data.aircraft'), 'GENERIC');
  assert.equal(flight.nodes.get('aircraftBadge').textContent, 'Waiting for flight plan');
  for (const [code, profile] of [['A21N','A320'], ['B738','B738'], ['B789','B789'], ['A359','A359'], ['AT76','GENERIC'], ['E190','GENERIC']]) {
    flight.context.window.cockpitDesktop.fetchSimbrief = async () => ({ok:true, data:{general:{aircraft:code}}});
    await flight.nodes.get('simform').onsubmit({preventDefault(){}});
    assert.equal(flight.eval('data.aircraft'), profile);
    assert.equal(flight.nodes.get('aircraftShort').textContent, code);
    assert.equal(flight.nodes.get('aircraftSelect').value, profile==='A320'?'A320':'GENERIC');
    const guest = app();
    guest.eval("prepareSession('join','Guest','ABC2345','PM')");
    guest.context.fields = JSON.parse(flight.eval('JSON.stringify(snapshotFields())'));
    guest.eval("stateVersions={};applyRemoteFields(fields,'PF')");
    assert.equal(guest.nodes.get('aircraftShort').textContent, code);
    assert.equal(guest.nodes.get('aircraftSelect').value, profile==='A320'?'A320':'GENERIC');
  }
  assert.equal(flight.eval("tasksFor('A320','airbus-a320')[0].sections[0].flows.PF[0].aircraftProfile"),'fenix-a320');
  for(const type of ['B738','B789','B77W','A359','DH8D','C172','GENERIC']) {
    assert.equal(flight.eval("tasksFor('"+type+"').length"),0);
    assert.equal(flight.eval("normalizeChecklistTasks(tasksFor('A320'),'"+type+"').length"),0);
  }
  flight.eval("data.aircraft='A320';data.aircraftProfile='airbus-a320';data.tasks=[{id:'preliminary',text:'Old general flow',sections:[]}];applyState(data)");
  assert.equal(flight.eval('data.aircraftProfile'),'fenix-a320');
  assert.equal(flight.eval('data.tasks.length'),18);
  flight.eval("data.tasks[0].sections[0].flows.PF[0].done=true;applyState(data)");
  assert.equal(flight.eval('data.tasks[0].sections[0].flows.PF[0].done'),true);
  console.log('PASS: Removed profiles stay empty, legacy A320 migrates to Fenix, and Fenix progress survives rendering.');
  console.log('PASS: Plan imports and peer snapshots select a profile and preserve the actual aircraft type.');

  flight.eval("data.plan={origin:{icao_code:'ORIG'},destination:{icao_code:'DEST'}};airportInfoCache.set('ORIG',{data:{latitude:0,longitude:0}});airportInfoCache.set('DEST',{data:{latitude:0,longitude:10}});resetFlightProgress()");
  flight.eval("routePosition={connected:true,latitude:0,longitude:10,onGround:true,groundSpeedKnots:0};renderFlightProgress()");
  assert.match(flight.nodes.get('routeProgress').textContent,/0% complete/);
  flight.eval("routePosition={connected:true,latitude:0,longitude:5,onGround:false,groundSpeedKnots:250};currentSimPosition=routePosition;autoPhaseState.airborne=true;renderFlightProgress()");
  assert.match(flight.nodes.get('routeProgress').textContent,/Progress 50%/);
  flight.eval("routePosition.longitude=15;renderFlightProgress()");
  assert.match(flight.nodes.get('routeProgress').textContent,/Progress 99%/);
  flight.eval("routePosition.longitude=10;routePosition.onGround=true;renderFlightProgress()");
  assert.equal(flight.nodes.get('routeProgress').textContent,'Arrived · 100% complete');
  flight.eval("routePosition.updatedAt=Date.now()-6000;renderFlightProgress()");
  assert.match(flight.nodes.get('routeProgress').textContent,/waiting for live simulator/);
  flight.eval("resetFlightProgress();currentSimPosition=null;handleChannelText({type:'position',position:{latitude:0,longitude:5,onGround:false,groundSpeedKnots:250,flightStarted:true,route:currentRouteKey()}},null)");
  assert.match(flight.nodes.get('routeProgress').textContent,/Progress 50%/);
  flight.eval("remoteFlightPosition.receivedAt=Date.now()-11000;renderFlightProgress()");
  assert.match(flight.nodes.get('routeProgress').textContent,/waiting for live simulator/);
  flight.eval("resetFlightProgress();handleChannelText({type:'position',position:{latitude:0,longitude:5,route:'another-flight'}},null)");
  assert.equal(flight.eval('remoteFlightPosition'),null);
  flight.eval("data.plan=null;renderPlan()");
  assert.match(flight.nodes.get('routeProgress').textContent,/waiting for flight plan/);
  assert.equal(flight.nodes.get('orig').textContent,'—');
  assert.equal(flight.nodes.get('showofp').disabled,true);
  console.log('PASS: Progress waits for departure, handles arrival, rejects stale positions and resets between flights.');

  for (const [running, connected, expected] of [[true,false,'waiting'],[true,true,'online'],[false,false,'offline']]) {
    flight.context.window.cockpitDesktop.getFsuipcStatus=async()=>({running});
    flight.context.window.cockpitDesktop.getSimPosition=async()=>({connected});
    await flight.eval('fetchFsuipcStatus()');
    for(const state of ['waiting','online','offline'])assert.equal(flight.nodes.get('fsuipcDot').classList.contains(state),state===expected);
    assert.equal(flight.nodes.get('fsuipcBadge').classList.contains('waiting'),expected==='waiting');
  }
  console.log('PASS: Simulator status distinguishes waiting, connected and disconnected.');

  flight.eval("data.plan={origin:{icao_code:'ORIG'}};displayAirportInfo('ORIG','orig',{controllers:[{callsign:'TEST_TWR',frequency:'118.100',distance:2}]})");
  assert.match(flight.nodes.get('origAtc').innerHTML,/atc-online/);
  assert.match(flight.nodes.get('origAtc').innerHTML,/aria-label="Online"/);
  flight.eval("displayAirportInfo('ORIG','orig',{controllers:[]})");
  assert.doesNotMatch(flight.nodes.get('origAtc').innerHTML,/atc-online/);
  console.log('PASS: Only available ATC stations display an online indicator.');
}
run().catch(error=>{console.error(error.stack);process.exitCode=1;});
