const EARTH_RADIUS_NM = 3440.065;
const radians = value => value * Math.PI / 180;
const validPosition = value => value?.latitude !== null && value?.latitude !== undefined && value?.longitude !== null && value?.longitude !== undefined
  && Number.isFinite(Number(value?.latitude)) && Number.isFinite(Number(value?.longitude))
  && Math.abs(Number(value.latitude)) <= 90 && Math.abs(Number(value.longitude)) <= 180;
function distanceNm(a, b) {
  const lat1 = radians(Number(a.latitude)), lat2 = radians(Number(b.latitude));
  const deltaLat = lat2 - lat1, deltaLon = radians(Number(b.longitude) - Number(a.longitude));
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
function bearingDegrees(a, b) {
  const lat1 = radians(Number(a.latitude)), lat2 = radians(Number(b.latitude)), deltaLon = radians(Number(b.longitude) - Number(a.longitude));
  return (Math.atan2(Math.sin(deltaLon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)) * 180 / Math.PI + 360) % 360;
}
function relativeLocation(degrees) { return ['N','NE','E','SE','S','SW','W','NW'][Math.round((degrees % 360) / 45) % 8]; }
function controllerType(callsign) {
  const suffix = String(callsign || '').toUpperCase().split('_').slice(1).find(part => /^(?:DEL|GND|TWR|APP|DEP|CTR|FSS|ATIS)$/.test(part)) || 'ATC';
  return ({DEL:'Delivery',GND:'Ground',TWR:'Tower',APP:'Approach',DEP:'Departure',CTR:'Center',FSS:'Flight Service',ATIS:'ATIS'})[suffix] || 'ATC';
}
function normalizeFrequency(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 100 || number > 1000) return '';
  return number.toFixed(3);
}
function altitudeFeet(value) {
  if (typeof value === 'string') { const flightLevel = /^FL(\d{2,3})$/i.exec(value.trim()); if (flightLevel) return Number(flightLevel[1]) * 100; }
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
}
function nearbyControllers(controllers = [], transceivers = [], position, radiusNm = 150) {
  if (!validPosition(position)) return [];
  const clients = new Map((Array.isArray(controllers) ? controllers : []).map(item => [String(item.callsign || '').toUpperCase(), item]));
  const nearest = new Map();
  for (const station of Array.isArray(transceivers) ? transceivers : []) {
    const callsign = String(station?.callsign || '').toUpperCase(), client = clients.get(callsign);
    if (!client) continue;
    for (const radio of Array.isArray(station.transceivers) ? station.transceivers : []) {
      const location = { latitude: Number(radio.latDeg), longitude: Number(radio.lonDeg) };
      if (!validPosition(location)) continue;
      const distance = distanceNm(position, location);
      if (distance > radiusNm) continue;
      const frequency = normalizeFrequency(Number(radio.frequency) / 1_000_000 || client.frequency);
      if (!frequency || frequency !== normalizeFrequency(client.frequency)) continue;
      const bearing = bearingDegrees(position, location), key = `${callsign}|${frequency}`;
      const row = { callsign, frequency, type: controllerType(callsign), online: true, distanceNm: Math.round(distance * 10) / 10, bearingDegrees: Math.round(bearing), relativeLocation: relativeLocation(bearing), latitude: location.latitude, longitude: location.longitude };
      if (!nearest.has(key) || row.distanceNm < nearest.get(key).distanceNm) nearest.set(key, row);
    }
  }
  return [...nearest.values()].sort((a, b) => a.distanceNm - b.distanceNm).slice(0, 40);
}
function nearbyTraffic(pilots = [], position, radiusNm = 100, maximum = 120) {
  if (!validPosition(position)) return [];
  return (Array.isArray(pilots) ? pilots : []).filter(pilot => validPosition(pilot))
    .map(pilot => {
      const aircraft = { latitude: Number(pilot.latitude), longitude: Number(pilot.longitude) }, distance = distanceNm(position, aircraft), bearing = bearingDegrees(position, aircraft), plan = pilot.flight_plan || {};
      return {
        callsign: String(pilot.callsign || '').trim().slice(0, 24),
        aircraftType: String(plan.aircraft_short || plan.aircraft || '').trim().slice(0, 16),
        latitude: aircraft.latitude, longitude: aircraft.longitude,
        altitudeFeet: altitudeFeet(pilot.altitude),
        groundSpeedKnots: Number.isFinite(Number(pilot.groundspeed)) ? Number(pilot.groundspeed) : null,
        headingDegrees: Number.isFinite(Number(pilot.heading)) && Number(pilot.heading) >= 0 && Number(pilot.heading) < 360 ? Number(pilot.heading) : null,
        distanceNm: Math.round(distance * 10) / 10,
        bearingDegrees: Math.round(bearing), relativeLocation: relativeLocation(bearing),
        departure: String(plan.departure || '').slice(0, 4), arrival: String(plan.arrival || '').slice(0, 4),
        route: String(plan.route || '').slice(0, 320)
      };
    }).filter(item => item.callsign && item.distanceNm <= radiusNm)
    .sort((a, b) => a.distanceNm - b.distanceNm).slice(0, Math.max(1, Math.min(300, maximum)));
}
module.exports = { distanceNm, bearingDegrees, relativeLocation, controllerType, nearbyControllers, nearbyTraffic };
