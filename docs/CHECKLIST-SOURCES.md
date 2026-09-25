# Checklist content and source notes

The in-app flows are original simulator crew-training reminders. They are paraphrased from the aircraft systems and normal-operation concepts described in the sources below; they do not reproduce a manufacturer or airline checklist. The intent is to prompt PF/PM coordination and cross-checking, not to give operational instructions.

## Sources

- [FAA Airplane Flying Handbook](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook) — preflight, ground operations, takeoff, climb, approach, landing and pilot coordination concepts.
- [Cessna 172S Normal Procedures document in the NTSB docket](https://data.ntsb.gov/Docket/Document/docBLOB?FileExtension=.PDF&FileName=Cessna+172S+Preflight+and+Before+Takeoff+Checklists-Master.PDF&ID=40399494) — model-specific 172S preflight and normal-procedure reference. Other 172 variants and avionics fits can differ.
- [Boeing Licensed Flight Training Manuals](https://services.boeing.com/training-solutions/flight-training/licensed-manuals) — confirms the FCOM, QRH and FCTM as the proper type-specific operational references for the 737, 777 and 787 families. Their detailed checklists are licensed materials and are not reproduced here.
- [Airbus: Flight Operations standards on A350 and A380](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2021-11/Airbus-FAST60.pdf) and [A350 XWB Cockpit](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2022-04/FAST_specialA350.pdf) — electronic normal-checklist and ECAM/EFB concepts for the A350.
- [Airbus: 5 reasons pilots love flying the A350](https://www.aircraft.airbus.com/en/newsroom/case-study/2024-09-5-reasons-pilots-love-flying-the-a350) — A350 MFD checklist integration and family context.
- [De Havilland Canada Dash 8-400](https://dehavilland.com/dash-8-400/) — aircraft-family context for a turboprop-specific flow. The app does not prescribe engine-control settings or limits.

## Coverage and limits

Each supported aircraft selection has distinct PF and PM prompts for relevant phases. Airline SOPs, serial-number configuration, avionics fit, engine variant and simulator add-on behavior can change the actual workflow. For the A320, A350, 737, 777, 787 and Dash 8, users must follow the exact manuals and checklist supplied with the selected simulator aircraft. The Cessna profile is based on the 172S reference and must be checked against the specific aircraft's POH. The generic profile explicitly asks the crew to find the correct checklist.

Checklist phases unlock in order: a later phase remains unavailable until every PF and PM item in the previous phase is checked. Completing both flows opens the next phase automatically. Only the currently selected role's checklist items can be changed; switching roles changes which flow is editable.
