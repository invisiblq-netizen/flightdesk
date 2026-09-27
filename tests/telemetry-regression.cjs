const assert=require('node:assert/strict');
const {app}=require('./lobby-regression.cjs');
function simulator(){
  const flight=app();
  flight.eval("prepareSession('host','Pilot','ABC2345','PF');data.plan={origin:{icao_code:'ENGM'},destination:{icao_code:'EGLL'}};resetFlightProgress()");
  let now=100000,latitude=60;
  function sample(values={},seconds=1){now+=seconds*1000;latitude+=(values.groundSpeedKnots||0)*seconds/3600/60;flight.context.sample={connected:true,latitude,longitude:10,onGround:true,groundSpeedKnots:0,altitudeFeet:100,verticalSpeedFeetPerMinute:0,updatedAt:now,...values};flight.context.sampleTime=now;flight.eval('currentSimPosition=sample;updateAutomaticFlightPhases(sample,sampleTime)');}
  function repeat(count,values){for(let i=0;i<count;i++)sample(typeof values==='function'?values(i):values)}
  const markers=()=>JSON.parse(flight.eval('JSON.stringify(data.ops.markers.map(item=>item.id))'));
  return {flight,sample,repeat,markers};
}
const menu=simulator();
menu.repeat(240,{onGround:false,altitudeFeet:35000,groundSpeedKnots:450});
menu.repeat(300,{});
assert.deepEqual(menu.markers(),[],'Menu cruise followed by spawn and five minutes parked is not a flight');
assert.equal(menu.flight.eval('autoPhaseState.airborne'),false);
menu.sample({onGround:false,groundSpeedKnots:150,altitudeFeet:150});
menu.repeat(12,{});
assert.deepEqual(menu.markers(),[],'One airborne glitch must not arm landing');
menu.repeat(12,i=>({onGround:false,groundSpeedKnots:150,altitudeFeet:150+i*25,verticalSpeedFeetPerMinute:1500}));
assert.ok(menu.markers().some(id=>id.endsWith('-takeoff')));
assert.ok(menu.markers().some(id=>id.endsWith('-climb')));
menu.repeat(185,{onGround:false,groundSpeedKnots:200,altitudeFeet:450});
assert.ok(menu.markers().some(id=>id.endsWith('-cruise')));
menu.sample({onGround:true,groundSpeedKnots:100,altitudeFeet:450});
menu.sample({onGround:false,groundSpeedKnots:100,altitudeFeet:450});
assert.ok(!menu.markers().some(id=>id.endsWith('-landing')),'One ground glitch is not a landing');
menu.repeat(7,{onGround:true,groundSpeedKnots:80,altitudeFeet:450});
assert.ok(menu.markers().some(id=>id.endsWith('-landing')));
menu.repeat(123,{altitudeFeet:450});
assert.ok(menu.markers().some(id=>id.endsWith('-parked')));
assert.equal(menu.flight.eval('data.ops.currentFlightPhase.id'),'parking');
console.log('PASS: Menu/spawn and brief glitches cannot create flights; confirmed takeoff, cruise, landing and parking still work.');
for(const interruption of [{connected:false},{updatedAt:1},{latitude:20},{altitudeFeet:35000},{onGround:null}]){
  const sim=simulator();sim.repeat(12,{});
  sim.repeat(12,i=>({onGround:false,groundSpeedKnots:150,altitudeFeet:150+i*25,verticalSpeedFeetPerMinute:1500}));
  sim.sample(interruption);sim.repeat(130,{});
  assert.ok(!sim.markers().some(id=>id.endsWith('-landing')||id.endsWith('-parked')));
  assert.equal(sim.flight.eval('autoPhaseState.airborne'),false);
}
const gap=simulator();gap.repeat(12,{});gap.sample({onGround:false,groundSpeedKnots:200,altitudeFeet:150},30);gap.repeat(130,{});assert.deepEqual(gap.markers(),[]);
const duplicates=simulator();duplicates.repeat(20,{updatedAt:100000});assert.equal(duplicates.flight.eval('autoPhaseState.groundReady'),false);
const reset=simulator();reset.repeat(12,{});reset.flight.eval('resetFlightProgress()');assert.equal(reset.flight.eval('autoPhaseState.groundReady'),false);
console.log('PASS: Disconnects, stale/duplicate data, telemetry gaps, teleports and flight resets discard the departure baseline.');
const observer=simulator();
observer.flight.eval("data.ops.currentFlightPhase={id:'cruise',at:Date.now(),source:'Simulator telemetry'}");
observer.sample({connected:false});
assert.equal(observer.flight.eval('data.ops.currentFlightPhase.id'),'cruise','An observer without local telemetry must retain the other pilot’s phase');
const route=simulator();
route.flight.eval("airportInfoCache.set('ENGM',{data:{latitude:60,longitude:10}});airportInfoCache.set('EGLL',{data:{latitude:60,longitude:20}})");
route.repeat(200,{onGround:false,groundSpeedKnots:450,altitudeFeet:35000});
route.flight.eval('currentSimPosition.updatedAt=Date.now();routePosition=currentSimPosition;renderFlightProgress()');
assert.match(route.flight.nodes.get('routeProgress').textContent,/0% complete/,'Menu telemetry must not start route progress');
console.log('PASS: Unconfirmed airborne telemetry cannot start route progress, and remote phase data survives a disconnected observer.');
