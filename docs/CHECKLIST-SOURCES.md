# Checklist content and source notes

The in-app flows are original simulator crew-training reminders. They are paraphrased from the aircraft systems and normal-operation concepts described in the sources below; they do not reproduce a manufacturer or airline checklist. The intent is to prompt PF/PM coordination and cross-checking, not to give operational instructions.

## Sources

- [FAA Airplane Flying Handbook](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook) — preflight, ground operations, takeoff, climb, approach, landing and pilot coordination concepts.
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

The A320 profile uses the 18 in-app scan phases and several sections per phase, with discrete PF/PM actions and shared CM acknowledgements. This is an original simulator workflow informed by public Airbus safety material and the phase names requested for this app. It is not Airbus's published SOP, FCOM, QRH or an airline checklist. Exact Airbus normal procedures and challenge-response items are configuration-, operator- and add-on-specific; users must use the documentation supplied with their simulator aircraft.

Other supported aircraft selections retain their own PF/PM prompts grouped into sections. Airline SOPs, serial-number configuration, avionics fit, engine variant and simulator add-on behavior can change the actual workflow. For the A350, 737, 777, 787 and Dash 8, users must follow the exact manuals and checklist supplied with the selected simulator aircraft. The Cessna profile is based on the 172S reference and must be checked against the specific aircraft's POH. The generic profile explicitly asks the crew to find the correct checklist.

Checklist phases unlock in order: a later phase remains unavailable until every PF, PM and shared CM item in the previous phase is checked. Completing all action boxes opens the next phase automatically. Only the currently selected role's PF or PM actions can be changed; switching roles changes which flow is editable. CM actions are shared acknowledgements because the app currently supports only two crew logins; either pilot may acknowledge one when no separate CM is represented.
