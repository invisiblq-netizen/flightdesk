const assert = require('node:assert/strict');
const { sanitizeSamples, aggregateFlights, replayFrame, compareFlights } = require('../src/flight-analysis.js');

const samples = sanitizeSamples([
  { at: 1000, latitude: 60, longitude: 10, altitudeFeet: 1000, groundSpeedKnots: 160, phaseId: 'climb' },
  { at: 2000, latitude: 60.1, longitude: 10.1, altitudeFeet: 5000, groundSpeedKnots: 220, phaseId: 'cruise', fuelPounds: null },
  { at: 2000, latitude: 60.2, longitude: 10.2 },
  { at: 3000, latitude: 100, longitude: 10 },
  { at: 4000, latitude: 60.3, longitude: 10.3, phaseId: 'descent' }
]);
assert.equal(samples.length, 3);
assert.equal(samples[1].fuelPounds, null);
assert.equal(replayFrame({ samples, events: [{ at: 1500, text: 'Takeoff' }] }, 1).activeEvent.text, 'Takeoff');
assert.equal(replayFrame({ samples }, 99).index, 2);
assert.equal(replayFrame({}, 0), null);

const records = [
  { id: 'a', crewKey: 'duo', departure: 'ENGM', arrival: 'EKCH', aircraft: 'Fenix A320', blockMs: 7200000, airborneMs: 7200000, taxiOutMs: 500000, taxiInMs: 400000, takeoffAt: 1000, landingAt: 7201000, crew: [{ name: 'Alex', role: 'PF' }, { name: 'Cesar', role: 'PM' }] },
  { id: 'b', crewKey: 'duo', departure: 'EKCH', arrival: 'ENGM', aircraft: 'Fenix A320', blockMs: 3600000, airborneMs: 3600000, taxiOutMs: 300000, taxiInMs: 200000, takeoffAt: 1000, landingAt: 3601000, crew: [{ name: 'Alex', role: 'PM' }, { name: 'Cesar', role: 'PF' }] }
];
const stats = aggregateFlights(records);
assert.equal(stats.airports.find(item => item.code === 'ENGM').departures, 1);
assert.equal(stats.airports.find(item => item.code === 'ENGM').arrivals, 1);
assert.equal(stats.airports.find(item => item.code === 'ENGM').visits, 2);
assert.equal(stats.aircraft[0].flights, 2);
assert.equal(stats.aircraft[0].takeoffs, 2);
assert.equal(stats.crew.find(item => item.name === 'Alex').pfTimeMs, 7200000);
assert.equal(stats.crew.find(item => item.name === 'Alex').pmTimeMs, 3600000);
const switched = aggregateFlights([{ id: 'c', departure: 'ENGM', arrival: 'EKCH', aircraft: 'Fenix A320', takeoffAt: 0, landingAt: 3600000, airborneMs: 3600000, crew: [{ name: 'Alex', role: 'PM' }, { name: 'Cesar', role: 'PF' }], events: [{ at: 1800000, type: 'crew.role-changed', text: 'Alex changed role from PF to PM.', by: 'Alex', role: 'PM' }] }]);
assert.equal(switched.crew.find(item => item.name === 'Alex').pfTimeMs, 1800000);
assert.equal(switched.crew.find(item => item.name === 'Alex').pmTimeMs, 1800000);
assert.equal(compareFlights(records[0], records[1])[0].difference, -3600000);
console.log('PASS: Local telemetry samples drive replay frames; airport, aircraft and shared-crew statistics use completed-flight records.');
