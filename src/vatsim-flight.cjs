function exactVatsimFlight(pilots, callsign, tunedFrequencyMhz) {
  const requested = String(callsign || '').trim().toUpperCase();
  const pilot = requested && pilots.find(item => String(item.callsign || '').trim().toUpperCase() === requested);
  const status = {found:!!pilot,checkedAt:Date.now(),tunedFrequencyMhz};
  if (!pilot) return status;
  const plan = pilot.flight_plan || {};
  return {...status, callsign:requested,
    aircraftType:String(plan.aircraft_short || plan.aircraft || '').trim(),
    registration:String(plan.remarks || '').match(/(?:^|\s)REG\/([A-Z0-9-]{2,12})(?=\s|$)/i)?.[1]?.toUpperCase() || '',
    departure:String(plan.departure || ''),arrival:String(plan.arrival || ''),
    latitude:pilot.latitude != null && Number.isFinite(Number(pilot.latitude)) && Math.abs(Number(pilot.latitude))<=90 ? Number(pilot.latitude) : null,
    longitude:pilot.longitude != null && Number.isFinite(Number(pilot.longitude)) && Math.abs(Number(pilot.longitude))<=180 ? Number(pilot.longitude) : null,
    altitudeFeet:pilot.altitude != null && Number.isFinite(Number(pilot.altitude)) ? Number(pilot.altitude) : null,
    groundSpeedKnots:pilot.groundspeed != null && Number.isFinite(Number(pilot.groundspeed)) ? Number(pilot.groundspeed) : null,
    headingDegrees:pilot.heading != null && Number.isFinite(Number(pilot.heading)) && Number(pilot.heading)>=0 && Number(pilot.heading)<360 ? Number(pilot.heading) : null,
    transponder:String(pilot.transponder || '')};
}
module.exports = {exactVatsimFlight};
