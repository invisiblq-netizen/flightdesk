(function attachFlightDeskOperations(root, factory) {
  const operations = factory();
  if (typeof module === 'object' && module.exports) module.exports = operations;
  if (root) root.FlightDeskOperations = operations;
})(typeof window !== 'undefined' ? window : globalThis, function createFlightDeskOperations() {
  const EARTH_RADIUS_NM = 3440.065;
  const radians = value => value * Math.PI / 180;
  const degrees = value => value * 180 / Math.PI;
  const number = value => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string' || !value.trim()) return null;
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : null;
  };
  const validCoordinates = point => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
  const text = (value, max = 32) => String(value ?? '').trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, max);

  function sanitizeNavlog(navlog, maximum = 300) {
    const source = Array.isArray(navlog?.fix) ? navlog.fix : Array.isArray(navlog) ? navlog : navlog?.fix ? [navlog.fix] : [];
    return source.slice(0, maximum).map(fix => {
      const latitude = number(fix?.pos_lat ?? fix?.latitude), longitude = number(fix?.pos_long ?? fix?.longitude);
      return {
        ident: text(fix?.ident || fix?.name, 16),
        name: text(fix?.name || fix?.ident, 48),
        type: text(fix?.type, 16),
        stage: text(fix?.stage, 12),
        via_airway: text(fix?.via_airway, 16),
        is_sid_star: text(fix?.is_sid_star, 4),
        pos_lat: Number.isFinite(latitude) && Math.abs(latitude) <= 90 ? latitude : null,
        pos_long: Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? longitude : null,
        distance: text(fix?.distance, 12),
        altitude_feet: text(fix?.altitude_feet, 12),
        ind_airspeed: text(fix?.ind_airspeed, 12),
        true_airspeed: text(fix?.true_airspeed, 12),
        mach: text(fix?.mach, 12),
        time_leg: text(fix?.time_leg, 12)
      };
    }).filter(fix => fix.ident || fix.name);
  }

  function routeFixes(plan) {
    const source = Array.isArray(plan?.navlog?.fix) ? plan.navlog.fix : Array.isArray(plan?.navlog) ? plan.navlog : plan?.navlog?.fix ? [plan.navlog.fix] : [];
    return source.slice(0, 300).map((fix, index) => {
      const rawLatitude = number(fix?.pos_lat ?? fix?.latitude);
      const rawLongitude = number(fix?.pos_long ?? fix?.longitude);
      const latitude = Number.isFinite(rawLatitude) && Math.abs(rawLatitude) <= 90 ? rawLatitude : null;
      const longitude = Number.isFinite(rawLongitude) && Math.abs(rawLongitude) <= 180 ? rawLongitude : null;
      const ident = text(fix?.ident || fix?.name || `FIX ${index + 1}`, 16).toUpperCase();
      return {
        id: `fix-${index}-${ident}`,
        ident,
        name: text(fix?.name || ident, 48),
        type: text(fix?.type, 16),
        stage: text(fix?.stage, 12).toUpperCase(),
        airway: text(fix?.via_airway, 16).toUpperCase(),
        latitude,
        longitude,
        altitudeFeet: number(fix?.altitude_feet),
        indicatedAirspeed: number(fix?.ind_airspeed),
        trueAirspeed: number(fix?.true_airspeed),
        mach: number(fix?.mach),
        legDistanceNm: number(fix?.distance),
        legTime: text(fix?.time_leg, 12)
      };
    });
  }

  function haversineNm(a, b) {
    const lat1 = radians(a.latitude), lat2 = radians(b.latitude);
    const deltaLat = lat2 - lat1, deltaLon = radians(b.longitude - a.longitude);
    const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  }

  function initialBearing(a, b) {
    const lat1 = radians(a.latitude), lat2 = radians(b.latitude), deltaLon = radians(b.longitude - a.longitude);
    return Math.atan2(Math.sin(deltaLon) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2)
      - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon));
  }

  function destinationPoint(start, bearing, distanceNm) {
    const angular = distanceNm / EARTH_RADIUS_NM, lat1 = radians(start.latitude), lon1 = radians(start.longitude);
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
    const lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
    return { latitude: degrees(lat2), longitude: ((degrees(lon2) + 540) % 360) - 180 };
  }

  function routePoints({ origin, destination, fixes = [] } = {}) {
    const result = [];
    const add = point => {
      if (!validCoordinates(point)) return;
      const prior = result.at(-1);
      if (prior && haversineNm(prior, point) < 0.08) return;
      result.push({ ...point, latitude: Number(point.latitude), longitude: Number(point.longitude) });
    };
    if (validCoordinates(origin)) add({ ...origin, id: 'origin', ident: text(origin.ident || origin.icao || 'ORIGIN', 12).toUpperCase(), kind: 'airport' });
    for (const fix of fixes) if (validCoordinates(fix)) add({ ...fix, kind: 'waypoint' });
    if (validCoordinates(destination)) {
      const arrival = { ...destination, id: 'destination', ident: text(destination.ident || destination.icao || 'DESTINATION', 12).toUpperCase(), kind: 'airport' };
      const prior = result.at(-1);
      if (prior && haversineNm(prior, arrival) < 0.08) result[result.length - 1] = arrival;
      else add(arrival);
    }
    return result;
  }

  function projectPosition(points, position, started = false) {
    if (!Array.isArray(points) || points.length < 2) return { available: false, reason: 'route-coordinates-unavailable' };
    const legs = [];
    let routeDistanceNm = 0;
    for (let index = 0; index < points.length - 1; index++) {
      const distanceNm = haversineNm(points[index], points[index + 1]);
      legs.push({ index, start: points[index], end: points[index + 1], distanceNm, routeStartNm: routeDistanceNm });
      routeDistanceNm += distanceNm;
    }
    if (!Number.isFinite(routeDistanceNm) || routeDistanceNm <= 0) return { available: false, reason: 'route-coordinates-unavailable' };
    if (!started || !validCoordinates(position)) {
      return { available: true, started: false, routeDistanceNm, flownNm: 0, remainingNm: routeDistanceNm, progressPercent: 0, nearestLegIndex: null, aircraftDistanceNm: null, currentWaypoint: null, nextWaypoint: null };
    }
    let nearest = null;
    for (const leg of legs) {
      if (leg.distanceNm <= 0) continue;
      const fromStartNm = haversineNm(leg.start, position);
      const angularFromStart = fromStartNm / EARTH_RADIUS_NM;
      const angleDelta = initialBearing(leg.start, position) - initialBearing(leg.start, leg.end);
      const crossTrackNm = Math.asin(Math.max(-1, Math.min(1, Math.sin(angularFromStart) * Math.sin(angleDelta)))) * EARTH_RADIUS_NM;
      const alongNm = Math.atan2(Math.sin(angularFromStart) * Math.cos(angleDelta), Math.cos(angularFromStart)) * EARTH_RADIUS_NM;
      const boundedAlongNm = Math.max(0, Math.min(leg.distanceNm, alongNm));
      const projected = destinationPoint(leg.start, initialBearing(leg.start, leg.end), boundedAlongNm);
      const distanceToLegNm = haversineNm(position, projected);
      if (!nearest || distanceToLegNm < nearest.distanceToLegNm) nearest = { ...leg, alongNm: boundedAlongNm, distanceToLegNm, crossTrackNm };
    }
    if (!nearest) return { available: false, reason: 'route-coordinates-unavailable' };
    const flownNm = Math.max(0, Math.min(routeDistanceNm, nearest.routeStartNm + nearest.alongNm));
    const currentWaypointIndex = Math.min(points.length - 1, nearest.index + 1);
    const currentWaypoint = points[currentWaypointIndex]?.kind === 'waypoint' ? points[currentWaypointIndex] : null;
    const nextWaypoint = points[currentWaypointIndex + 1]?.kind === 'waypoint' ? points[currentWaypointIndex + 1] : null;
    return {
      available: true,
      started: true,
      routeDistanceNm,
      flownNm,
      remainingNm: Math.max(0, routeDistanceNm - flownNm),
      progressPercent: Math.min(100, Math.round(flownNm / routeDistanceNm * 100)),
      nearestLegIndex: nearest.index,
      aircraftDistanceNm: nearest.distanceToLegNm,
      currentWaypoint,
      nextWaypoint
    };
  }

  function routeText(plan) {
    const value = plan?.general?.route_ifps || plan?.general?.route || '';
    return typeof value === 'string' ? value.trim().slice(0, 1200) : '';
  }

  function procedureInfo(plan) {
    const get = (...values) => values.find(value => typeof value === 'string' && value.trim())?.trim() || '';
    return {
      sid: get(plan?.origin?.plan_sid, plan?.origin?.sid, plan?.general?.sid),
      departureRunway: get(plan?.origin?.plan_rwy, plan?.origin?.planned_runway, plan?.origin?.runway),
      star: get(plan?.destination?.plan_star, plan?.destination?.star, plan?.general?.star),
      approach: get(plan?.destination?.plan_approach, plan?.destination?.approach),
      arrivalTransition: get(plan?.destination?.plan_transition, plan?.destination?.transition),
      arrivalRunway: get(plan?.destination?.plan_rwy, plan?.destination?.planned_runway, plan?.destination?.runway)
    };
  }

  const flightCallouts = Object.freeze({
    preliminary: Object.freeze(['On-ground position is confirmed after 10 seconds of stable telemetry.', 'Taxi movement requires repeated positive ground-speed samples.']),
    'push-start': Object.freeze(['Pushback is inferred from repeated reverse ground movement relative to heading.', 'Engine state is not exposed by the current FSUIPC bridge.']),
    'taxi-out': Object.freeze(['Taxi-out is recorded after repeated forward ground-movement samples.']),
    takeoff: Object.freeze(['Takeoff requires an 8-second airborne candidate, at least 40 kt ground speed, 0.08 NM movement and 50 ft of climb.', 'Initial climb is detected when vertical speed exceeds 300 fpm.']),
    cruise: Object.freeze(['Cruise is inferred after 3 minutes of stable vertical speed during confirmed flight.']),
    'descent-inrange': Object.freeze(['Descent is detected after vertical speed below −500 fpm is sustained for 20 seconds.', 'Approach is inferred while descending below 10,000 ft.']),
    landing: Object.freeze(['Landing requires 5 seconds of confirmed ground contact after airborne flight.']),
    'taxi-in': Object.freeze(['Taxi-in is recorded from ground movement after confirmed landing.']),
    parking: Object.freeze(['Parking is confirmed after 2 minutes stopped on the ground after landing.'])
  });

  return Object.freeze({
    sanitizeNavlog,
    routeFixes,
    routePoints,
    projectPosition,
    routeText,
    procedureInfo,
    flightCallouts,
    haversineNm
  });
});
