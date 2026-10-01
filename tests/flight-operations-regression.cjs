const assert = require('node:assert/strict');
const operations = require('../src/flight-operations.js');

const plan = {
  general: { route: 'DCT MID DCT EAST', route_ifps: 'DCT MID DCT EAST' },
  origin: { plan_sid: 'NEMES5A', plan_rwy: '19R' },
  destination: { plan_star: 'LAM3A', plan_approach: 'ILS 27R', plan_transition: 'LAM', plan_rwy: '27R' },
  navlog: { fix: [
    { ident: 'MID', name: 'MID', pos_lat: '0', pos_long: '5', stage: 'CRZ', via_airway: 'DCT', altitude_feet: '35000', ind_airspeed: '280' },
    { ident: 'EAST', name: 'EAST', pos_lat: 0, pos_long: 8, stage: 'DSC', via_airway: 'DCT' },
    { ident: '<invalid>', pos_lat: 120, pos_long: 500 }
  ] }
};

const sanitized = operations.sanitizeNavlog(plan.navlog);
assert.equal(sanitized.length, 3, 'valid route labels survive compaction even when coordinates are unavailable');
assert.equal(sanitized[0].pos_lat, 0);
assert.equal(sanitized[0].altitude_feet, '35000');
assert.equal(sanitized[2].ident, 'invalid', 'markup characters are stripped from remote route labels');

const fixes = operations.routeFixes(plan);
const points = operations.routePoints({
  origin: { ident: 'ORIG', latitude: 0, longitude: 0 },
  destination: { ident: 'DEST', latitude: 0, longitude: 10 },
  fixes
});
assert.deepEqual(points.map(point => point.ident), ['ORIG', 'MID', 'EAST', 'DEST']);

const beforeDeparture = operations.projectPosition(points, { latitude: 0, longitude: 0 }, false);
assert.equal(beforeDeparture.progressPercent, 0);
assert.equal(beforeDeparture.currentWaypoint, null);

const underway = operations.projectPosition(points, { latitude: 0, longitude: 2.5 }, true);
assert.equal(underway.available, true);
assert.equal(underway.progressPercent, 25);
assert.equal(underway.currentWaypoint.ident, 'MID');
assert.equal(underway.nextWaypoint.ident, 'EAST');
assert.ok(underway.remainingNm > 440 && underway.remainingNm < 460);

assert.equal(operations.routeText(plan), 'DCT MID DCT EAST');
assert.deepEqual(operations.procedureInfo(plan), {
  sid: 'NEMES5A', departureRunway: '19R', star: 'LAM3A', approach: 'ILS 27R', arrivalTransition: 'LAM', arrivalRunway: '27R'
});

const crossing = operations.routePoints({
  origin: { ident: 'WEST', latitude: 10, longitude: 179 },
  destination: { ident: 'EAST', latitude: 10, longitude: -179 }
});
const crossingProgress = operations.projectPosition(crossing, { latitude: 10, longitude: 180 }, true);
assert.ok(crossingProgress.progressPercent > 45 && crossingProgress.progressPercent < 55, 'route projection handles the antimeridian');

console.log('PASS: SimBrief route compaction, geospatial route projection, waypoint sequencing and arrival procedure fields.');
