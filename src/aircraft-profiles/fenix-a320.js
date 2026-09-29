/*
 * Simulator companion scan profile. This is original training aid content,
 * not an FCOM, QRH, operational checklist, or substitute for the Fenix EFB.
 */
(() => {
  const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const section = (id, title, roles) => ({
    id,
    title,
    flows: Object.fromEntries(['PF', 'PM', 'CM'].map(role => [role, (roles[role] || []).map((entry, index) => {
      const [kind, itemTitle, action, description, callout = '', trigger = ''] = entry;
      return {
        id: `${id}-${role.toLowerCase()}-${slug(itemTitle)}-${index + 1}`,
        aircraftProfile: 'fenix-a320',
        phase: '',
        section: id,
        role,
        title: itemTitle,
        action,
        description,
        callout,
        notes: '',
        trigger,
        checklistReference: 'Verify the applicable item in Fenix EFB → Fenix → Pilot Brief → Documents.',
        order: index + 1,
        kind,
        text: `${itemTitle} — ${action}`,
        help: description,
        done: false
      };
    })]))
  });
  const flow = (title, action, description, callout = '', trigger = '') => ['flow', title, action, description, callout, trigger];
  const check = (title, action, description, callout = '', trigger = '') => ['checklist', title, action, description, callout, trigger];
  const phases = [
    { id: 'preliminary', text: 'Preliminary Cockpit Prep', sections: [
      section('flight-prep', 'Flight Prep Briefing', { PF: [
        flow('OFP and route', 'REVIEW', 'Brief route, alternate, weather, fuel plan, notices and known threats with the PM.'),
        flow('Crew roles', 'AGREE PF / PM AND TRANSFER WORDS', 'Confirm control-transfer wording and who handles radios, FMGS entries and checklist reading.')
      ], PM: [
        flow('OFP cross-check', 'VERIFY ROUTE, ALTERNATE AND FUEL', 'Independently compare the operational flight plan with the intended simulator flight.'),
        check('Briefing complete', 'CONFIRM SHARED PLAN', 'Confirm both pilots understand the route, threats and plan for late changes.')
      ] }),
      section('efb-fmgs', 'EFB / ACARS & FMGS Pre-Initialization', { PF: [
        flow('ACARS', 'INITIALIZE', 'Open the modeled ACARS function and start flight initialization.'),
        flow('Aircraft and engine type', 'VERIFY', 'Match the aircraft variant shown in the add-on to the planned aircraft.'),
        flow('FM database', 'VERIFY VALIDITY', 'Check the displayed navigation-data validity before relying on procedure coding.'),
        flow('Flight number', 'INSERT / VERIFY', 'Enter the planned callsign or flight number from the flight plan.'),
        flow('FROM / TO', 'INSERT / VERIFY', 'Set the departure and destination airports against the flight plan.')
      ], PM: [
        flow('Route source', 'OPEN CURRENT OFP', 'Use the current SimBrief plan and confirm its departure, destination and revision.'),
        check('Initialization cross-check', 'COMPARE WITH OFP', 'Read back the entered flight number and FROM/TO against the shared plan.')
      ] }),
      section('ecam-logbook', 'ECAM Recall / Logbook / Preliminary Performance', { PF: [
        flow('ECAM RCL pushbutton', 'PRESS', 'Press ECAM RCL; reviewing and resolving the recalled messages is a separate crew check.'),
        flow('Aircraft acceptance', 'REVIEW STATUS', 'Review the modeled aircraft status before continuing cockpit setup.'),
        check('Recalled ECAM messages', 'REVIEW / RESOLVE', 'Review recalled messages and resolve them using the add-on documentation.')
      ], PM: [
        flow('Logbook', 'REVIEW', 'Review modeled defects and deferred items; discuss discrepancies with the PF.'),
        flow('MEL / CDL', 'REVIEW IF SHOWN', 'Review any modeled dispatch item and its documentation; do not infer dispatch approval.'),
        check('Preliminary performance inputs', 'CROSS-CHECK SOURCE DATA', 'Compare runway, weather, load and fuel inputs with current flight-plan sources.')
      ] }),
      section('safe-state', 'Aircraft Safe-State Check', { PF: [
        flow('ACARS', 'INITIALIZE', 'If not already done, initialize the modeled ACARS before departure setup.'),
        flow('Weather radar / PWS', 'SET AS REQUIRED', 'Use the simulator situation and Fenix guidance for radar and predictive-windshear controls.')
      ], PM: [
        flow('ENGINE MASTER 1 + 2', 'VERIFY OFF', 'Check both engine master controls are OFF before engine start.'),
        flow('ENGINE MODE SELECTOR', 'VERIFY NORM', 'Check the selector is at NORM while the aircraft is in the parked preparation state.'),
        flow('RADAR', 'VERIFY OFF', 'Verify the radar control is OFF during the parked safe-state scan.'),
        flow('WINDSHEAR / PWS', 'VERIFY OFF', 'Check the parked-state setting against the Fenix checklist for the installed version.'),
        flow('RADAR GAIN', 'VERIFY AUTO / CAL', 'Check the modeled gain selection and indication.'),
        flow('RADAR MODE', 'SET AS REQUIRED', 'Set the mode for the current simulator situation and Fenix documentation.'),
        flow('LANDING GEAR LEVER', 'VERIFY DOWN', 'Confirm the lever and gear indication agree while parked.'),
        flow('WIPERS', 'VERIFY OFF', 'Check both wiper controls before the cockpit-preparation flow.')
      ], CM: [check('Safe-state scan', 'CONFIRM BOTH PILOTS AGREE', 'Pause and resolve any unexpected control or indication before proceeding.')] }),
      section('battery-external-power', 'Electrical Power & Ground Services', { PF: [
        flow('Electrical panel', 'SET UP FROM FENIX FLOW', 'Follow the Fenix cockpit-preparation sequence and confirm the expected electrical indications.'),
        flow('External power', 'ON IF AVAILABLE', 'Select ground power only when the modeled source is available and the Fenix flow calls for it.')
      ], PM: [check('Electrical indications', 'CROSS-CHECK ECAM', 'Confirm the displayed electrical state is consistent with the selected power source.')], CM: [flow('Ground services', 'CONFIRM REQUESTED SERVICES', 'Coordinate only the ground services used in this simulator session.')] })
    ] },
    { id: 'walkaround', text: 'Walkaround', sections: [
      section('walkaround-brief', 'Inspection Coordination', { PF: [flow('Exterior inspection', 'AGREE WHO COMPLETES IT', 'Use the modeled aircraft inspection and report any concern before dispatching the simulated flight.')], PM: [flow('Inspection reference', 'OPEN FENIX EFB DOCUMENT', 'Use the Fenix exterior-inspection reference for this aircraft version.')], CM: [check('Cabin and service status', 'REPORT IF MODELED', 'Record the reported simulator cabin or ground-service status; do not infer it.')] }),
      section('external-scan', 'Exterior Scan & Return to Flight Deck', { PF: [
        flow('Nose and forward fuselage', 'INSPECT VISUALLY', 'Review the modeled nose, probes, lights and visible condition using the Fenix reference.'),
        flow('Wings and engines', 'INSPECT VISUALLY', 'Review visible wing surfaces, control surfaces, engine inlets and nacelles in the simulator.'),
        flow('Main gear and tail', 'INSPECT VISUALLY', 'Review visible landing gear, tires, doors, tail and control surfaces in the simulator.')
      ], PM: [
        check('Exterior findings', 'DISCUSS BEFORE COCKPIT SETUP', 'Report visible simulator defects or discrepancies; do not treat this scan as an airworthiness assessment.'),
        check('Inspection complete', 'CONFIRM WITH PF', 'Confirm the modeled walkaround has been completed before cockpit setup continues.')
      ] })
    ] },
    { id: 'cockpit-prep', text: 'Cockpit Preparation', sections: [
      section('cockpit-environment', 'Overhead / Instrument Scan', { PF: [
        flow('Overhead scan', 'COMPLETE FENIX COCKPIT FLOW', 'Follow the Fenix overhead scan order and verify each resulting indication.'),
        flow('ADIRS', 'SET PER FENIX FLOW', 'Use the add-on’s current procedure and confirm alignment status on the modeled displays.'),
        flow('Lights and signs', 'SET FOR PARKED PREPARATION', 'Use the Fenix flow for current ground, cabin and simulator conditions.')
      ], PM: [
        flow('Overhead indications', 'MONITOR AND CHALLENGE', 'Follow the same scan and call out an unexpected light or ECAM indication.'),
        flow('Flight controls', 'VERIFY FREE MOVEMENT IF REQUIRED', 'Use the Fenix procedure and confirm the displayed response with the PF.')
      ] }),
      section('fmgs-performance', 'FMGS / Fuel / Load Cross-Check', { PF: [
        flow('INIT A page', 'ENTER FLIGHT PLAN DATA', 'Enter the aircraft, flight number and route data from the current plan.'),
        flow('Flight plan', 'INSERT ROUTE AND PROCEDURES', 'Enter the cleared route and selected procedures; review discontinuities before activation.'),
        flow('Fuel and load', 'ENTER FROM CURRENT OFP', 'Use the current load and fuel figures supplied for the simulator flight.'),
        flow('PERF pages', 'COMPLETE REQUIRED ENTRIES', 'Use the selected runway, aircraft configuration and approved simulator performance source.')
      ], PM: [
        check('Route', 'INDEPENDENTLY CROSS-CHECK', 'Compare origin, destination, waypoints, departure, arrival and alternate with the OFP.'),
        check('Fuel / weights', 'COMPARE WITH LOAD DATA', 'Cross-check entered fuel and weight values against the current OFP and load information.'),
        check('Performance entries', 'VERIFY SOURCE AND UNITS', 'Confirm runway and entries against the Fenix data and selected performance source.')
      ] }),
      section('ecam-preflight', 'ECAM & Cockpit Acceptance', { PF: [flow('ECAM pages', 'REVIEW DISPLAYED STATUS', 'Review the modeled system pages and resolve any message using Fenix documentation.')], PM: [check('Cockpit setup', 'CONFIRM BOTH SIDES READY', 'Confirm the route, displays and required cockpit materials are ready for the next phase.')] })
    ] },
    { id: 'gate-services', text: 'Gate Services & Clearance', sections: [
      section('clearance', 'Clearance & Departure Setup', { PF: [
        flow('ATC clearance', 'OBTAIN / REVIEW', 'Use the assigned simulator network clearance or the planned offline departure.'),
        flow('FCU targets', 'SET FROM CLEARANCE', 'Set cleared targets and read them back with the PM before departure.'),
        flow('Departure procedure', 'SELECT CLEARED RUNWAY / SID', 'Match the entered procedure with the clearance and current chart.')
      ], PM: [
        flow('Clearance', 'WRITE / CROSS-CHECK', 'Compare runway, SID, initial altitude, squawk and restrictions with the PF readback.'),
        flow('Chart and weather', 'REVIEW CURRENT INFORMATION', 'Review departure chart, current METAR/ATIS and applicable notices.'),
        check('Clearance readback', 'CONFIRM COMPLETE', 'Verify the spoken readback and FMGS entry match the clearance.')
      ], CM: [flow('Cabin report', 'CONFIRM READY IF AVAILABLE', 'Use only a cabin-ready report actually provided by the simulator or crew.')] }),
      section('departure-brief', 'Departure Briefing', { PF: [check('Departure brief', 'BRIEF RUNWAY, SID AND INITIAL PLAN', 'Agree the takeoff plan, initial guidance and response to a runway or clearance change.')], PM: [check('Brief cross-check', 'CONFIRM CHART AND FMGS MATCH', 'Call out a runway, route or restriction mismatch before pushback.')] })
    ] },
    { id: 'before-start', text: 'Before Start Flow', sections: [
      section('before-start-flow', 'PF / PM Before-Start Flow', { PF: [
        flow('Parking brake', 'SET', 'Set the modeled parking brake and confirm the aircraft remains stopped.'),
        flow('Doors and ground equipment', 'CONFIRM CLEAR FOR START', 'Check the modeled door and ground-service indications before requesting movement.'),
        flow('Beacon', 'ON WHEN STARTING IS IMMINENT', 'Use the Fenix ground flow and coordinate the warning with ground crew.')
      ], PM: [
        flow('Cabin and doors', 'VERIFY REPORTED STATUS', 'Confirm reported cabin readiness and door indications.'),
        flow('Pushback / start sequence', 'BRIEF AND AGREE', 'Agree push direction, engine start order and who monitors the start indications.'),
        flow('Engine start page', 'SELECT / REVIEW', 'Prepare the modeled engine indications for the planned start.')
      ] }),
      section('before-start-checklist', 'Before-Start Checklist', { PF: [check('Before-start checklist', 'COMPLETE APPLICABLE ITEMS', 'Use the Fenix EFB checklist and confirm each applicable response with the PM.')], PM: [
        check('Parking brake', 'SET', 'Verify the aircraft is secured before push or engine start.'),
        check('Beacon', 'ON', 'Confirm the external warning light is on before engine start or aircraft movement.'),
        check('Doors', 'CLOSED / INDICATION CHECKED', 'Verify the door indication agrees with the reported cabin status.'),
        check('Ground equipment', 'CLEAR AS REQUIRED', 'Confirm equipment and personnel are clear before movement.')
      ], CM: [check('Cabin ready', 'REPORT IF MODELED', 'Read back only a cabin report that has actually been received.')] })
    ] },
    { id: 'push-start', text: 'Pushback & Engine Start', sections: [
      section('pushback', 'Pushback Coordination', { PF: [
        flow('Pushback clearance', 'CONFIRM DIRECTION AND ROUTE', 'Check the intended push path and stop if the direction is unclear.'),
        flow('Parking brake', 'RELEASE ON AGREED SIGNAL', 'Coordinate brake release with the ground crew or simulator pushback state.'),
        flow('Aircraft movement', 'MONITOR CLEARANCE', 'Monitor movement and stop if a conflict or unexpected motion appears.')
      ], PM: [
        flow('Ground crew communication', 'MONITOR / ACKNOWLEDGE', 'Use the simulator communication and agreed stop phrase.'),
        flow('Push path', 'MONITOR WING / TAIL CLEARANCE', 'Watch the modeled push path and call out hazards or uncertainty.'),
        check('Push complete', 'CONFIRM STOPPED BEFORE START', 'Confirm the push is complete and the aircraft is stopped before continuing.')
      ] }),
      section('engine-start', 'Engine Start Monitoring', { PF: [
        flow('Engine start sequence', 'SELECT PER FENIX FLOW', 'Follow the Fenix start sequence for the installed engine option and ground state.'),
        flow('Engine master', 'SELECT WHEN CALLED FOR', 'Use the Fenix start flow; no generic timing or limits are provided here.'),
        flow('Start indications', 'MONITOR ECAM', 'Monitor the modeled start indications and pause for unexpected behavior.')
      ], PM: [
        flow('Engine parameters', 'MONITOR BOTH STARTS', 'Monitor the displayed engine indications and call out unexpected trends promptly.'),
        flow('Start sequence', 'ANNOUNCE COMPLETION', 'Confirm each engine start is stable before the next action.'),
        check('Abnormal indication', 'STOP AND USE FENIX REFERENCE', 'Do not continue a start sequence through an unexpected indication.')
      ] })
    ] },
    { id: 'after-start', text: 'After Start', sections: [
      section('after-start-flow', 'After-Start Flow', { PF: [
        flow('Engine indications', 'VERIFY STABLE', 'Confirm modeled engine indications are stable before taxi setup.'),
        flow('Anti-ice and exterior lights', 'SET FOR CONDITIONS', 'Select settings for actual simulator conditions using the Fenix guidance.'),
        flow('Flight controls', 'CHECK PER FENIX FLOW', 'Complete the modeled control check and confirm expected indication changes.')
      ], PM: [
        flow('ECAM status', 'REVIEW AFTER START', 'Review current indications and report any change since the previous scan.'),
        flow('Flight-control check', 'MONITOR DISPLAYED RESPONSE', 'Confirm the observed response agrees with the PF input and Fenix flow.'),
        check('After-start checklist', 'READ AND CONFIRM', 'Complete the applicable Fenix after-start checklist items together.')
      ] }),
      section('taxi-setup', 'Taxi Preparation', { PF: [flow('Taxi route', 'REVIEW BEFORE MOVEMENT', 'Review the clearance and intended route before releasing the aircraft to taxi.')], PM: [check('Taxi chart', 'SET FOR DEPARTURE AIRPORT', 'Display the assigned route, hotspots and hold-short points.')] })
    ] },
    { id: 'taxi-out', text: 'Taxi Out', sections: [
      section('taxi-flow', 'Taxi Flow', { PF: [
        flow('Parking brake', 'RELEASE WHEN READY TO TAXI', 'Release only after clearance and confirmation the route is clear.'),
        flow('Taxi technique', 'MOVE AT APPROPRIATE SIM SPEED', 'Taxi under control and keep attention outside during turns and intersections.'),
        flow('Flight controls', 'CHECK AS REQUIRED', 'Use the Fenix taxi flow and observe the modeled control indications.')
      ], PM: [
        flow('Taxi clearance', 'MONITOR ROUTE AND HOLD SHORTS', 'Follow the chart and clearance; call out each restriction before reaching it.'),
        flow('Brakes and steering', 'MONITOR RESPONSE', 'Call out an unexpected brake, steering or aircraft response.'),
        check('Taxi route', 'CONFIRM RUNWAY AND HOTSPOTS', 'Verify the current clearance still leads to the planned runway and departure.')
      ] }),
      section('taxi-checklist', 'Taxi Checks', { PF: [check('Taxi checks', 'COMPLETE AT LOW WORKLOAD', 'Use the Fenix taxi checklist and defer items when ground workload rises.')], PM: [
        check('Flight instruments', 'CROSS-CHECK INDICATIONS', 'Compare the modeled heading and indications with the taxi route.'),
        check('Takeoff data', 'CONFIRM SETUP PROGRESS', 'Check that performance and departure setup are available for the planned runway.')
      ] })
    ] },
    { id: 'before-takeoff', text: 'Before Takeoff', sections: [
      section('takeoff-brief', 'Runway & Takeoff Brief', { PF: [
        flow('Runway and departure', 'VERIFY AGAINST CLEARANCE', 'Confirm runway, intersection, SID and initial clearance before entering the runway.'),
        flow('Takeoff performance', 'VERIFY CURRENT RUNWAY DATA', 'Use the selected Fenix performance method and current runway conditions.'),
        flow('Takeoff plan', 'BRIEF AND CONFIRM', 'Brief directional plan, expected guidance and the agreed stop or go-around actions.')
      ], PM: [
        flow('Runway', 'INDEPENDENTLY CROSS-CHECK', 'Compare signs, chart and clearance before runway entry.'),
        flow('Takeoff configuration', 'VERIFY ECAM / FENIX DATA', 'Confirm the modeled configuration indication and performance entries agree.'),
        check('Takeoff clearance', 'CONFIRM RECEIVED OR OFFLINE PLAN', 'Do not enter the runway until the simulator clearance or agreed offline plan permits it.')
      ] }),
      section('before-takeoff-checklist', 'Before-Takeoff Checklist', { PF: [check('Before-takeoff checklist', 'COMPLETE FROM FENIX EFB', 'Use the current Fenix checklist for exact aircraft configuration and indications.')], PM: [
        check('Cabin ready', 'CONFIRM ACTUAL REPORT', 'Confirm the report from the modeled cabin or crew if one is available.'),
        check('Takeoff memo', 'VERIFY DISPLAYED STATUS', 'Confirm the takeoff memo/status is consistent with the planned departure.'),
        check('Runway and transponder', 'VERIFY CURRENT SETUP', 'Cross-check the runway, transponder and departure setup against the clearance.')
      ], CM: [check('Cabin secure', 'REPORT IF MODELED', 'Record the actual cabin status report, if available.')] })
    ] },
    { id: 'takeoff', text: 'Takeoff', sections: [
      section('takeoff-roll', 'Takeoff Roll', { PF: [
        flow('Thrust and tracking', 'APPLY PER FENIX TAKEOFF FLOW', 'Follow the aircraft technique and maintain directional control.'),
        flow('Takeoff', 'MONITOR FLIGHT PATH', 'Maintain the cleared path and respond to the PM callouts.')
      ], PM: [
        flow('Airspeed', 'MONITOR AND CALL OUT', 'Monitor the displayed speed trend and use the current Fenix/operator callout wording.'),
        flow('Thrust and indications', 'CROSS-CHECK RESPONSE', 'Monitor modeled engine indications and call out an unexpected response.'),
        check('Runway alignment', 'MONITOR UNTIL AIRBORNE', 'Call out a deviation or runway hazard promptly.')
      ] }),
      section('takeoff-transition', 'Liftoff & Initial Guidance', { PF: [flow('Guidance modes', 'VERIFY EXPECTED RESPONSE', 'Announce and verify the expected flight-mode annunciations after takeoff.')], PM: [check('Positive climb', 'CONFIRM INDICATION', 'Use the displayed flight and gear indications before the next action.')] })
    ] },
    { id: 'after-takeoff', text: 'After Takeoff & Climb', sections: [
      section('initial-climb', 'Initial Climb & Mode Awareness', { PF: [
        flow('Flight path', 'FOLLOW CLEARED SID', 'Monitor the cleared lateral and vertical path.'),
        flow('FMA', 'ANNOUNCE AND VERIFY', 'Confirm the active and armed modes match the intended guidance.')
      ], PM: [
        flow('FMA and flight path', 'MONITOR / CALLOUT', 'Call out mode changes and deviations as they occur.'),
        flow('Configuration', 'VERIFY TRANSITION PER FENIX FLOW', 'Use the current Fenix after-takeoff sequence and displayed indications.')
      ] }),
      section('after-takeoff-check', 'After-Takeoff Checklist', { PF: [check('After-takeoff flow', 'COMPLETE AT SUITABLE WORKLOAD', 'Use the Fenix reference for exact timing and control positions.')], PM: [
        check('After-takeoff checklist', 'READ / VERIFY ITEMS', 'Read the applicable items and verify the modeled indications.'),
        check('ECAM status', 'REVIEW CURRENT MESSAGES', 'Report any new status or unresolved message before transitioning to cruise tasks.')
      ], CM: [check('Cabin transition', 'CONFIRM IF MODELED', 'Record an actual cabin report if the simulator provides one.')] })
    ] },
    { id: 'cruise', text: 'Cruise', sections: [
      section('cruise-setup', 'Cruise Setup & Monitoring', { PF: [
        flow('Route and automation', 'MONITOR CLEARED FLIGHT PATH', 'Confirm the aircraft tracks the active route and cleared altitude.'),
        flow('Systems', 'REVIEW DISPLAYED STATUS', 'Review the modeled indications and address changes using Fenix guidance.')
      ], PM: [
        flow('Position and fuel', 'CROSS-CHECK AGAINST OFP', 'Compare live simulator progress and displayed fuel with the plan.'),
        flow('Weather and ATC', 'REVIEW AHEAD', 'Share route weather, frequency changes and clearance amendments with PF.'),
        check('Cruise review', 'CONFIRM NEXT CONSTRAINT', 'Agree the next route constraint and any action needed before descent.')
      ] }),
      section('enroute-coordination', 'En-Route Coordination', { PF: [flow('Clearance changes', 'AGREE BEFORE FMGS CHANGE', 'Confirm the clearance and expected response before modifying the route or guidance.')], PM: [check('Route revision', 'VERIFY ACTIVE LEGS', 'Cross-check the entered amendment and active leg against the clearance.')], CM: [flow('Cabin updates', 'PASS RELEVANT REPORTS', 'Share only reports actually received from the modeled crew.')] })
    ] },
    { id: 'descent-inrange', text: 'Descent & In-Range', sections: [
      section('descent-prep', 'Descent Preparation', { PF: [
        flow('Descent clearance', 'SET CLEARED TARGETS', 'Set the cleared target and verify the resulting guidance modes.'),
        flow('Arrival route', 'REVIEW ACTIVE FMGS LEGS', 'Confirm arrival, approach and missed approach match the current clearance.'),
        flow('ECAM status', 'REVIEW BEFORE DESCENT', 'Review current aircraft status using the add-on documentation.')
      ], PM: [
        flow('Weather and ATIS', 'OBTAIN LATEST INFORMATION', 'Review current arrival weather, runway, notices and pressure setting source.'),
        flow('Approach chart', 'PREPARE CURRENT REVISION', 'Review the selected procedure, minima source and missed-approach route.'),
        check('Fuel and landing data', 'CROSS-CHECK PLAN', 'Compare displayed fuel and landing entries with the current OFP and selected runway.')
      ] }),
      section('approach-brief', 'Approach Briefing', { PF: [
        check('Approach and go-around', 'BRIEF THREATS AND PLAN', 'Agree approach, minima source, task sharing, go-around plan and response to a late change.')
      ], PM: [
        check('Approach setup', 'VERIFY CHART / FMGS / CLEARANCE', 'Call out any mismatch before approach configuration begins.'),
        check('Cabin preparation', 'CONFIRM REPORTED STATUS', 'Record only a cabin report actually received in the simulator.')
      ], CM: [check('Cabin ready', 'REPORT IF MODELED', 'Share the actual cabin-ready report if available.')] })
    ] },
    { id: 'approach', text: 'Approach', sections: [
      section('approach-setup', 'Approach Setup & Cross-Check', { PF: [
        flow('Approach selection', 'SET CLEARED PROCEDURE', 'Use the current clearance and verify the active procedure on the modeled systems.'),
        flow('Approach guidance', 'VERIFY FMA / NAV SOURCES', 'Confirm the expected lateral and vertical modes for the selected approach.')
      ], PM: [
        flow('Approach chart', 'CROSS-CHECK SEQUENCE', 'Compare the active route, minima reference and missed approach with the current chart.'),
        flow('ECAM and approach status', 'REVIEW INDICATIONS', 'Call out any status that affects the planned simulator approach.'),
        check('Briefing refresh', 'RECONFIRM AFTER LATE CHANGE', 'Repeat the affected part of the brief after a runway or approach change.')
      ] }),
      section('approach-monitor', 'Configuration & Stable-Approach Monitoring', { PF: [
        flow('Approach configuration', 'FOLLOW FENIX NORMAL FLOW', 'Use the current Fenix sequence and maintain the cleared flight path.'),
        flow('Go-around plan', 'KEEP AVAILABLE', 'Apply the agreed go-around plan whenever required by the selected procedure or brief.')
      ], PM: [
        flow('Flight path and energy', 'MONITOR / CALL OUT', 'Monitor path, speed trend, configuration and deviations; speak up early.'),
        check('Stable approach', 'ASSESS USING AGREED CRITERIA', 'Use the criteria briefed for this simulator flight; go around if they are not met.')
      ] })
    ] },
    { id: 'landing', text: 'Landing', sections: [
      section('final-landing', 'Final Approach & Landing', { PF: [
        flow('Final approach', 'MAINTAIN CLEARED FLIGHT PATH', 'Fly the briefed approach and make a go-around decision when required.'),
        flow('Touchdown', 'USE FENIX NORMAL TECHNIQUE', 'Follow the aircraft guidance and keep the PM informed of a change in plan.')
      ], PM: [
        flow('Final approach monitoring', 'MONITOR / CALLOUT', 'Monitor flight path, speed trend, configuration and runway alignment.'),
        check('Landing configuration', 'VERIFY INDICATIONS', 'Cross-check the displayed landing configuration against the applicable Fenix checklist.')
      ], CM: [check('Cabin landing status', 'CONFIRM IF MODELED', 'Record the actual report if it is provided by the simulator crew.')] }),
      section('rollout', 'Touchdown & Runway Rollout', { PF: [flow('Runway rollout', 'MAINTAIN DIRECTIONAL CONTROL', 'Vacate only as briefed and when safe under the current clearance.')], PM: [
        flow('Deceleration', 'MONITOR AIRCRAFT RESPONSE', 'Call out a runway hazard or unexpected deceleration response.'),
        check('Runway vacated', 'CONFIRM BEFORE AFTER-LANDING FLOW', 'Confirm clear of the runway before beginning after-landing actions.')
      ] })
    ] },
    { id: 'after-landing', text: 'After Landing', sections: [
      section('runway-vacated', 'After-Landing Flow', { PF: [
        flow('Runway clearance', 'CONFIRM CLEAR OF RUNWAY', 'Verify position and clearance before changing aircraft configuration.'),
        flow('After-landing flow', 'COMPLETE PER FENIX EFB', 'Use the Fenix taxi-in flow and defer nonessential actions when workload is high.')
      ], PM: [
        flow('Taxi clearance', 'REVIEW BEFORE MOVEMENT', 'Read back and monitor hold-short restrictions, hotspots and stand routing.'),
        check('After-landing checklist', 'VERIFY APPLICABLE ITEMS', 'Use the current Fenix EFB checklist and cross-check the displayed state.')
      ], CM: [check('Arrival report', 'CONFIRM IF MODELED', 'Record the cabin report only if actually received.')] }),
      section('arrival-brief', 'Taxi-In Preparation', { PF: [check('Taxi-in route', 'AGREE STAND AND RESTRICTIONS', 'Confirm stand, route and any unresolved clearance restriction with the PM.')], PM: [flow('Airport chart', 'SET FOR TAXI-IN', 'Display taxi routing and stand guidance for the arrival airport.')] })
    ] },
    { id: 'taxi-in', text: 'Taxi In', sections: [
      section('taxi-in-route', 'Taxi Route & Stand Approach', { PF: [
        flow('Taxi route', 'FOLLOW CURRENT CLEARANCE', 'Maintain control and stop if the route, stand or clearance is unclear.'),
        flow('Stand approach', 'USE ADD-ON TAXI GUIDANCE', 'Approach the stand at a suitable simulator speed and monitor nearby traffic.')
      ], PM: [
        flow('Hotspots and traffic', 'MONITOR / CALLOUT', 'Call out hold-short points, traffic and route conflicts early.'),
        check('Stand guidance', 'CONFIRM BEFORE TURN-IN', 'Cross-check the assigned stand and guidance before entering the parking position.')
      ] }),
      section('taxi-in-config', 'Aircraft Status During Taxi-In', { PF: [flow('System actions', 'DEFER NONESSENTIAL WORK', 'Keep attention on taxi until safely parked.')], PM: [check('Taxi-in status', 'VERIFY ITEMS NOT YET COMPLETE', 'Use the Fenix checklist to identify any applicable after-landing item still open.')] })
    ] },
    { id: 'parking', text: 'Parking / Shutdown', sections: [
      section('parking', 'Parking & Shutdown', { PF: [
        flow('Parking position', 'STOP AT ASSIGNED STAND', 'Stop using the modeled stand guidance and confirm the aircraft is stationary.'),
        flow('Parking brake', 'SET WHEN PARKED', 'Set the brake after confirming the aircraft is stopped.'),
        flow('Shutdown sequence', 'FOLLOW FENIX SHUTDOWN FLOW', 'Use the Fenix procedure for engine shutdown and ground-power transition.')
      ], PM: [
        flow('Shutdown indications', 'MONITOR ECAM / ENGINE STATUS', 'Review the displayed indications and stop for an unexpected message.'),
        check('Shutdown checklist', 'READ / VERIFY APPLICABLE ITEMS', 'Complete the current Fenix parking checklist; do not rely on this aid for exact switch positions.'),
        check('Secure aircraft', 'VERIFY PARKED STATE', 'Confirm the aircraft and modeled ground-service state agree with the plan.')
      ], CM: [check('Cabin arrival', 'CONFIRM IF MODELED', 'Record the actual cabin arrival report if the simulator provides one.')] }),
      section('debrief', 'Flight Debrief & Record', { PF: [
        flow('Flight review', 'REVIEW WORKLOAD AND DEVIATIONS', 'Discuss notable events, route changes and items to revisit in the simulator.'),
        check('Debrief notes', 'CAPTURE LESSONS LEARNED', 'Record follow-up items in the existing shared Debrief notes.')
      ], PM: [
        flow('Plan comparison', 'REVIEW FUEL / TIME / ROUTE', 'Compare the simulated flight with the plan where the data is available.'),
        check('Checklist progress', 'REVIEW OPEN ITEMS', 'Review completed and outstanding simulator scan items with the PF.')
      ] })
    ] }
  ];
  for (const phase of phases) {
    let order = 0;
    for (const group of phase.sections) for (const role of ['PF', 'PM', 'CM']) {
      for (const item of group.flows[role]) {
        item.phase = phase.id;
        item.order = ++order;
      }
    }
  }
  const profile = {
    id: 'fenix-a320',
    label: 'Fenix A320',
    aircraft: 'A320',
    description: 'Detailed simulator flow with separate PF/PM FLOW and CHECKLIST items.',
    checklistReference: 'For exact current Fenix items use EFB → Fenix → Pilot Brief → Documents.',
    phases
  };
  for (const phase of phases) for (const group of phase.sections) {
    for (const role of ['PF', 'PM', 'CM']) for (const item of group.flows[role]) item.checklistReference = profile.checklistReference;
  }
  globalThis.FlightDeskAircraftProfiles = { ...(globalThis.FlightDeskAircraftProfiles || {}), fenixA320: profile };
})();
