# Changelog

## 0.3.1-alpha.8 — Alpha 0.3.1

- Move note templates below the text editor and provide separate templates for Briefing, Enroute and Debrief.

## 0.3.1-alpha.7 — Alpha 0.3.1

- Add a synchronized crew handover and flight-event log with a flight timeline and route-progress milestones.
- Add phase-based crew callout prompts, briefing templates and local crew preferences.
- Add a VATSIM ATC snapshot grouped by departure, enroute and arrival route segments.
- Add connection diagnostics and flight report export as text or print-to-PDF.

## 0.3.1-alpha.6 — Alpha 0.3.1

- Replace the A320 flat checklist with an 18-phase operational scan-flow.
- Add multiple sectioned PF/PM action lists per phase and shared CM acknowledgements.
- Add an operational phase navigator with sequential locks and automatic advancement.

## 0.3.1-alpha.5 — Alpha 0.3.1

- Add separate aircraft-specific PF and PM simulator checklist flows.
- Make the other pilot's flow read-only unless the crew role is changed.
- Lock checklist phases in sequence and open the next phase when both flows are complete.
- Document the research sources and aircraft-specific limits.

## 0.3.1-alpha.4 — Alpha 0.3.1

- Stop automatically reconnecting to the previous lobby when the app opens.
- Generate a fresh seven-character lobby code for every host session, avoiding the previous code.

## 0.3.1-alpha.3 — Alpha 0.3.1

- Capitalize the Flight Board, Flight Plan and sidebar labels consistently; write **Enroute** as one word in navigation and cockpit notes.

## 0.3.1-alpha.2 — Alpha 0.3.1

- Avoid installing a separate uninstaller icon file that could fail with “Error opening file for writing: uninstallericon.ico” in restricted install folders. The app and setup icons remain unchanged.

## 0.3.1-alpha.1 — Alpha 0.3.1

- Fixed Create lobby becoming unresponsive when an older saved checklist was loaded.
- Preserve older checklist entries during migration to PF/PM flows.
- Restore lobby controls after setup or signalling failures, and prevent duplicate connection attempts.
- Display alpha version information in the app, title and About dialog.
- Include lobby regression checks and a portable Windows build configuration.

## 1.3.0 — Previous alpha build, before version renumbering

- Added separate expandable PF and PM flow items with explanations.
- Added sidebar navigation and the Flight Readiness overview.
- Removed the duplicate METAR label.
- Kept the in-app SimBrief PDF viewer, notes, role selection and P2P session sharing.
