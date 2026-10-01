const assert = require('node:assert/strict');
const { nearbyControllers, nearbyTraffic, distanceNm } = require('../src/vatsim-operations.cjs');

const aircraft = { latitude: 60, longitude: 10 };
const controllers = [{ callsign: 'ENGM_TWR', frequency: '118.705' }, { callsign: 'ENGM_APP', frequency: '120.450' }];
const transceivers = [
  { callsign: 'ENGM_TWR', transceivers: [{ frequency: 118705000, latDeg: 60.2, lonDeg: 10.1 }] },
  { callsign: 'ENGM_APP', transceivers: [{ frequency: 120450000, latDeg: 62, lonDeg: 14 }] },
  { callsign: 'UNKNOWN_TWR', transceivers: [{ frequency: 118705000, latDeg: 60.01, lonDeg: 10 }] }
];
const nearby = nearbyControllers(controllers, transceivers, aircraft, 100);
assert.equal(nearby.length, 1);
assert.equal(nearby[0].callsign, 'ENGM_TWR');
assert.equal(nearby[0].type, 'Tower');
assert.equal(nearby[0].frequency, '118.705');
assert.equal(nearby[0].online, true);
assert.match(nearby[0].relativeLocation, /N|NE|E/);

const pilots = [
  { callsign: 'SAS1', latitude: 60.5, longitude: 10, altitude: 'FL120', groundspeed: '250', heading: '180', flight_plan: { aircraft_short: 'A320', departure: 'ENGM', arrival: 'EKCH', route: 'DCT TEST' } },
  { callsign: 'SAS2', latitude: 60.1, longitude: 10.1, altitude: '9000', groundspeed: '180', heading: '270', flight_plan: { aircraft: 'B738' } },
  { callsign: 'BAD', latitude: null, longitude: null }
];
const traffic = nearbyTraffic(pilots, aircraft, 40);
assert.equal(traffic.length, 2);
assert.equal(traffic[0].callsign, 'SAS2');
assert.equal(traffic[1].aircraftType, 'A320');
assert.equal(traffic[1].altitudeFeet, 12000);
assert.equal(traffic[1].departure, 'ENGM');
assert.ok(Math.abs(distanceNm(aircraft, { latitude: 60.5, longitude: 10 }) - 30) < 0.2);
assert.deepEqual(nearbyTraffic(pilots, null), []);
assert.deepEqual(nearbyControllers(controllers, transceivers, aircraft, 1).map(item => item.callsign), []);
console.log('PASS: VATSIM ATC frequencies/types/distances and nearby aircraft details are filtered, sanitized and distance-sorted.');
