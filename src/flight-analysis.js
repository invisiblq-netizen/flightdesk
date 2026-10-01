(function attachFlightAnalysis(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightDeskAnalysis = api;
})(typeof window !== 'undefined' ? window : globalThis, function createFlightAnalysis() {
  const finite = value => Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : null;
  const airport = value => String(value || '').trim().toUpperCase().slice(0, 4);
  function sanitizeSamples(values, maximum = 2200) {
    if (!Array.isArray(values)) return [];
    return values.slice(-maximum).map(sample => {
      const latitude = finite(sample?.latitude), longitude = finite(sample?.longitude), at = finite(sample?.at);
      if (latitude === null || longitude === null || at === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
      return {
        at,
        latitude: Math.round(latitude * 100000) / 100000,
        longitude: Math.round(longitude * 100000) / 100000,
        altitudeFeet: finite(sample.altitudeFeet),
        groundSpeedKnots: finite(sample.groundSpeedKnots),
        verticalSpeedFeetPerMinute: finite(sample.verticalSpeedFeetPerMinute),
        fuelPounds: finite(sample.fuelPounds),
        headingDegrees: finite(sample.headingDegrees),
        phaseId: String(sample.phaseId || '').slice(0, 48)
      };
    }).filter(Boolean).filter((sample, index, all) => index === 0 || sample.at > all[index - 1].at);
  }
  function aggregateFlights(records = []) {
    const airports = new Map(), aircraft = new Map(), crew = new Map();
    const airportEntry = code => { code = airport(code); if (!code) return null; if (!airports.has(code)) airports.set(code, { code, departures: 0, arrivals: 0, visits: 0, flightHoursMs: 0, taxiTotalMs: 0, taxiSamples: 0, routes: new Map(), mostUsedRunway: null }); return airports.get(code); };
    const aircraftEntry = name => { name = String(name || 'Unknown aircraft').slice(0, 80); if (!aircraft.has(name)) aircraft.set(name, { name, flights: 0, flightHoursMs: 0, takeoffs: 0, landings: 0, fuelUsed: null, routes: new Map(), airports: new Set(), durations: [] }); return aircraft.get(name); };
    const crewEntry = name => { name = String(name || '').trim().slice(0, 30); if (!name) return null; if (!crew.has(name)) crew.set(name, { name, flights: 0, sharedFlightTimeMs: 0, pfTimeMs: 0, pmTimeMs: 0, sessions: new Set(), aircraft: new Set(), routes: new Map(), airports: new Set() }); return crew.get(name); };
    for (const record of Array.isArray(records) ? records : []) {
      const dep = airportEntry(record?.departure), arr = airportEntry(record?.arrival), route = dep && arr ? `${dep.code} → ${arr.code}` : '', airborne = Math.max(0, finite(record?.airborneMs) || 0), taxi = Math.max(0, finite(record?.taxiOutMs) || 0) + Math.max(0, finite(record?.taxiInMs) || 0), model = aircraftEntry(record?.aircraft);
      const roleTimes = crewRoleTimes(record);
      if (dep) { dep.departures++; dep.visits++; dep.flightHoursMs += airborne; dep.taxiTotalMs += taxi; dep.taxiSamples++; dep.routes.set(route, (dep.routes.get(route) || 0) + 1); }
      if (arr) { arr.arrivals++; arr.visits++; arr.flightHoursMs += airborne; arr.routes.set(route, (arr.routes.get(route) || 0) + 1); }
      model.flights++; model.flightHoursMs += airborne; model.takeoffs += record?.takeoffAt ? 1 : 0; model.landings += record?.landingAt ? 1 : 0; model.durations.push(airborne); if (route) model.routes.set(route, (model.routes.get(route) || 0) + 1); for (const code of [dep?.code, arr?.code].filter(Boolean)) model.airports.add(code);
      for (const person of Array.isArray(record?.crew) ? record.crew : []) { const member = crewEntry(person?.name); if (!member) continue; const duty = roleTimes[person.name]||{}; member.flights++; member.sharedFlightTimeMs += airborne; member.pfTimeMs += Math.max(0, finite(duty.PF) || 0); member.pmTimeMs += Math.max(0, finite(duty.PM) || 0); member.aircraft.add(model.name); if (route) member.routes.set(route, (member.routes.get(route) || 0) + 1); for (const code of [dep?.code, arr?.code].filter(Boolean)) member.airports.add(code); member.sessions.add(String(record.sessionId || record.id || record.crewKey || 'session')); }
    }
    const entries = map => [...map.values()].map(value => ({ ...value, routes: [...value.routes.entries()].sort((a,b) => b[1] - a[1]).map(([name,count]) => ({ name, count })), ...(value.airports instanceof Set ? { airports: [...value.airports].sort() } : {}), ...(value.aircraft instanceof Set ? { aircraft: [...value.aircraft].sort() } : {}), ...(value.sessions instanceof Set ? { sessions: [...value.sessions].sort() } : {}), ...(value.taxiSamples ? { averageTaxiMs: Math.round(value.taxiTotalMs / value.taxiSamples) } : {}), ...(value.durations ? { averageFlightMs: Math.round(value.durations.reduce((sum, duration) => sum + duration, 0) / Math.max(1, value.durations.length)) } : {}) }));
    return { airports: entries(airports).sort((a,b) => b.visits - a.visits), aircraft: entries(aircraft).sort((a,b) => b.flights - a.flights), crew: entries(crew).sort((a,b) => b.flights - a.flights) };
  }
  function replayFrame(record, index) {
    const samples = sanitizeSamples(record?.samples);
    if (!samples.length) return null;
    const cursor = Math.max(0, Math.min(samples.length - 1, Math.floor(Number(index) || 0))), sample = samples[cursor];
    const events = (Array.isArray(record?.events) ? record.events : []).filter(event => finite(event?.at) !== null && event.at <= sample.at);
    const activeEvent = events.at(-1) || null;
    return { index: cursor, total: samples.length, sample, phaseId: sample.phaseId || activeEvent?.phaseId || '', activeEvent, fuelPounds: sample.fuelPounds, elapsedMs: Math.max(0, sample.at - samples[0].at) };
  }
  function crewRoleTimes(record) {
    const people = (Array.isArray(record?.crew) ? record.crew : []).filter(person => String(person?.name || '').trim());
    const roles = new Map(people.map(person => [person.name, person.role === 'PF' ? 'PF' : 'PM']));
    const takeoff = finite(record?.takeoffAt), landing = finite(record?.landingAt);
    const start = takeoff ?? (landing !== null ? landing - Math.max(0, finite(record?.airborneMs) || 0) : 0);
    const end = landing ?? (start + Math.max(0, finite(record?.airborneMs) || 0));
    const changes = (Array.isArray(record?.events) ? record.events : []).filter(event => event?.type === 'crew.role-changed' && finite(event.at) !== null && event.at >= start && event.at <= end)
      .map(event => ({ at: Number(event.at), name: String(event.by || '').trim(), from: /changed role from (PF|PM) to (PF|PM)/i.exec(String(event.text || ''))?.[1]?.toUpperCase() || null, to: /changed role from (PF|PM) to (PF|PM)/i.exec(String(event.text || ''))?.[2]?.toUpperCase() || (event.role === 'PF' || event.role === 'PM' ? event.role : null) }))
      .filter(event => roles.has(event.name) && event.to).sort((a,b) => a.at-b.at);
    for (const change of [...changes].reverse()) if (change.from) roles.set(change.name, change.from);
    const result = new Map(people.map(person => [person.name, { PF: 0, PM: 0 }]));
    let cursor = start;
    const addInterval = until => { const duration = Math.max(0, until - cursor); for (const [name, role] of roles) if (result.has(name)) result.get(name)[role] += duration; cursor = until; };
    for (const change of changes) { if (change.at < cursor) continue; addInterval(change.at); roles.set(change.name, change.to); }
    addInterval(end);
    return Object.fromEntries(result);
  }
  function compareFlights(first, second) {
    const maxAltitude = record => Math.max(0, ...(sanitizeSamples(record?.samples).map(sample => sample.altitudeFeet).filter(Number.isFinite)));
    const rows = [
      ['Block time', first?.blockMs, second?.blockMs, 'duration'],
      ['Airborne time', first?.airborneMs, second?.airborneMs, 'duration'],
      ['Planned distance', first?.distanceNm, second?.distanceNm, 'distance'],
      ['Fuel used', first?.fuel?.actual, second?.fuel?.actual, 'fuel'],
      ['Maximum altitude', maxAltitude(first), maxAltitude(second), 'altitude'],
      ['Takeoff', first?.takeoffAt, second?.takeoffAt, 'timestamp'],
      ['Landing', first?.landingAt, second?.landingAt, 'timestamp'],
      ['Checklist items complete', first?.checklist?.checksDone, second?.checklist?.checksDone, 'count']
    ];
    return rows.map(([label, a, b, format]) => ({ label, first: finite(a), second: finite(b), difference: finite(a) !== null && finite(b) !== null ? finite(b) - finite(a) : null, format }));
  }
  return Object.freeze({ sanitizeSamples, aggregateFlights, replayFrame, crewRoleTimes, compareFlights });
});
