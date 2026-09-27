# Checklist content and source notes

The in-app flows are original simulator crew-training reminders. They are paraphrased from the aircraft systems and normal-operation concepts described in the sources below; they do not reproduce a manufacturer or airline checklist. The intent is to prompt PF/PM coordination and cross-checking, not to give operational instructions.

## Sources

- [FAA Airplane Flying Handbook](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook) — preflight, ground operations, takeoff, climb, approach, landing and pilot coordination concepts.
- [FenixSim: How To Access Fenix A32X Checklists](https://support.fenixsim.com/hc/en-us/articles/12466766944015-How-To-Access-Fenix-A32X-Checklists) — identifies the current checklist location as EFB → Fenix → Pilot Brief → Documents and says the built-in checklists are not customizable.
- [Cessna 172S Normal Procedures document in the NTSB docket](https://data.ntsb.gov/Docket/Document/docBLOB?FileExtension=.PDF&FileName=Cessna+172S+Preflight+and+Before+Takeoff+Checklists-Master.PDF&ID=40399494) — model-specific 172S preflight and normal-procedure reference. Other 172 variants and avionics fits can differ.
- [Boeing Licensed Flight Training Manuals](https://services.boeing.com/training-solutions/flight-training/licensed-manuals) — confirms the FCOM, QRH and FCTM as the proper type-specific operational references for the 737, 777 and 787 families. Their detailed checklists are licensed materials and are not reproduced here.
- [Airbus Safety First: Cockpit control confusion](https://safetyfirst.airbus.com/cockpit-control-confusion/?airbus-iframe=true&airbus-post=2066) — reinforces control callouts, visual verification and checking the result of an action.
- [Airbus Safety First: Unreliable airspeed at takeoff](https://safetyfirst.airbus.com/unreliable-airspeed-at-takeoff/?airbus-iframe=true&airbus-post=2094) — describes active PM airspeed monitoring and PF/PM cross-check responsibilities during takeoff.
- [Airbus Safety First: Communication between PF and PM](https://safetyfirst.airbus.com/app/themes/mh_newsdesk/pdf/safety_first_27.pdf) — crew communication and monitoring concepts for high-workload phases.
- [Airbus FAST 60: Initial Flight Operations standard on A320](https://aircraft.airbus.com/sites/g/files/jlcbta126/files/2021-11/Airbus-FAST60.pdf) — context on A320 FCOM/EFB documentation and the fact that checklists and non-ECAM procedures remain tied to the applicable aircraft documentation.
- [Airbus: Flight Operations standards on A350 and A380](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2021-11/Airbus-FAST60.pdf) and [A350 XWB Cockpit](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2022-04/FAST_specialA350.pdf) — electronic normal-checklist and ECAM/EFB concepts for the A350.
- [Airbus: 5 reasons pilots love flying the A350](https://www.aircraft.airbus.com/en/newsroom/case-study/2024-09-5-reasons-pilots-love-flying-the-a350) — A350 MFD checklist integration and family context.
- [De Havilland Canada Dash 8-400](https://dehavilland.com/dash-8-400/) — aircraft-family context for a turboprop-specific flow. The app does not prescribe engine-control settings or limits.

## Coverage and limits

The Fenix A320 profile uses all 18 in-app phases and contains concrete role-based prompts, separated into cockpit FLOW actions and verification CHECKLIST items. The content is original simulator-aid wording informed by public aircraft-safety concepts and the requested phase structure. It is not Fenix's built-in checklist, Airbus's published SOP, FCOM, QRH or an airline checklist. Exact sequence, switch positions, indications and challenge-response wording can vary by add-on version and aircraft configuration.

Fenix publishes its own checklist inside the aircraft EFB at **EFB → Fenix → Pilot Brief → Documents**. Flight Desk points users to that source for exact current steps and settings. The Fenix support article says these built-in checklists are not customizable. The app's detailed profile is a shared-cockpit companion scan and does not replace them.

The user can choose between the detailed **Fenix A320** profile and the retained **Airbus A320 general flow**. Other supported aircraft selections retain their own PF/PM prompts. The data model keeps profile, phase, section, role, action, description, callout, trigger, order and checklist reference separate from rendering so future profiles can be added without embedding procedure text in UI code.

Other supported aircraft selections retain their own PF/PM prompts grouped into sections. Airline SOPs, serial-number configuration, avionics fit, engine variant and simulator add-on behavior can change the actual workflow. For the A350, 737, 777, 787 and Dash 8, users must follow the exact manuals and checklist supplied with the selected simulator aircraft. The Cessna profile is based on the 172S reference and must be checked against the specific aircraft's POH. The generic profile explicitly asks the crew to find the correct checklist.

Checklist editing unlocks in order: a later phase remains read-only until every PF, PM and shared CM action in previous phases is checked. All phases remain viewable so a telemetry-detected phase can be suggested without forcing progress. FLOW and CHECKLIST counts are displayed separately. Only the currently selected role's PF or PM actions can be changed; switching roles changes which flow is editable. CM actions are shared acknowledgements because the app currently supports only two crew logins; either pilot may acknowledge one when no separate CM is represented. FSUIPC/SimConnect can add real flight-phase events and suggestions, but it never completes a procedure item.
