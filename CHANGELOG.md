# Changelog

## 0.4.0-alpha.13 — Alpha 0.4

- Show On ground / Preflight after stable ground data, before pushback/taxi movement, and display flight phases independently of checklist profiles.
- Keep simulator and SimBrief polling active while the app is minimized and replace vague telemetry text with specific waiting reasons.
- Keep Tools visible at the bottom of the sidebar, scroll the primary navigation separately in short windows, and let the sidebar grow past short pages when room is available.
- Save the SimBrief ID as it is typed and check for automatic import after a short pause, without requiring the user to leave the field or press Fetch plan.
- Immediately check a new ID when it changes during an automatic request, rejecting the previous ID's response.
- Verify focused-field auto import, ID changes during requests, UTC departure boundaries and preservation of existing shared plans; reuse the unchanged simulator helper.

## 0.4.0-alpha.12 — Alpha 0.4

- Replace the EFB header's multiple rows with one compact toolbar so the full-width screen starts higher and has more vertical room.
- Keep provider, connection status, Expand, Reload and Settings together; move aircraft details and the address form behind Settings, with full status available on hover.
- Validate the compact layout at four resolutions and reuse the unchanged simulator helper.

## 0.4.0-alpha.11 — Alpha 0.4

- Restore the EFB to the full available width while keeping the taller viewing area, compact controls and collapsible connection settings.
- Verify full-width layout at all supported test resolutions, including Expand mode; reuse the unchanged simulator helper.

## 0.4.0-alpha.10 — Alpha 0.4

- Keep the EFB connected and visible when switching its internal pages or loading embedded content, fixing a permanent Connecting status that previously required Save & connect.
- Give the EFB a centered 4:3 tablet layout and more vertical room, with compact provider controls and collapsible connection settings.
- Track document navigation separately from hash/history and browser loading-spinner events; hide the EFB only for actual load failures or when leaving the app's EFB page.
- Add regression coverage for hash/history, embedded-frame and full-document navigation, while retaining failed-server and Reload checks.
- Reuse the unchanged simulator helper from alpha.8.

## 0.4.0-alpha.9 — Alpha 0.4

- Add an EFB page with Automatic, Fenix, PMDG and iniBuilds selections and per-provider local addresses.
- Detect the provider from fresh FSUIPC7 aircraft titles, with manual override for unknown aircraft.
- Embed Fenix’s live web EFB inside the app with Reload and Expand controls; explain the compatible-server requirement for PMDG and iniBuilds.
- Isolate the EFB from app privileges, restrict top-level navigation to its local origin, and hide it on page/session changes.
- Test native embedding, isolation, disconnections/reload, aircraft switching and responsive renderer layout; reuse the unchanged alpha.8 simulator helper.

## 0.4.0-alpha.8 — Alpha 0.4

- Read 45 Fenix cockpit variables through the FSUIPC WASM catalogue and share cockpit telemetry with the other pilot.
- Automatically check supported, explicit switch-state items in the current unlocked phase for the assigned PF/PM role; display AUTO hints and completion attribution.
- Require external power ON rather than AVAIL, reject lamp-test indications and stale/missing data, and keep crew reviews manual.
- Separate the detected ECAM RCL press from the manual message review, including migration of saved sessions.
- Bundle the verified FSUIPC WAPI runtime with a rebuilt simulator helper and add automatic-check regression tests.

## 0.4.0-alpha.7 — Alpha 0.4

- Prevent menu telemetry and spawning on the ground from creating false cruise, landing and parked events.
- Require a stable ground baseline, sustained moving/climbing departure and confirmed ground contact before recording flight transitions.
- Reset automatic detection on stale data, disconnects, telemetry gaps, position jumps and flight changes; gate route progress on confirmed departure.
- Add telemetry regression coverage for spawn, glitches and a complete valid flight sequence.

## 0.4.0-alpha.6 — Alpha 0.4

- Keep checklist profiles only for Airbus A319/A320/A321 and rename the aircraft selection accordingly.
- Remove the Airbus A320 general flow, keeping Fenix as the only scan profile.
- Migrate old general-flow sessions to Fenix and clear checklist content for other aircraft.

## 0.4.0-alpha.5 — Alpha 0.4

- Left-align all Flight Readiness text while keeping Open checklist at the right edge.

## 0.4.0-alpha.4 — Alpha 0.4

- Align the Flight Readiness heading and details to the left, with Open checklist held at the right.

## 0.4.0-alpha.3 — Alpha 0.4

- Move the Open checklist button to the right side of Flight Readiness.

## 0.4.0-alpha.2 — Alpha 0.4

- Align the Flight Session heading and content to the left on the Flight Board.

## 0.4.0-alpha.1 — Alpha 0.4

- Add a structured Fenix A320 profile with concrete actions across 18 phases and separate PF/PM FLOW and CHECKLIST groups.
- Keep checklist progress synchronized while allowing each pilot to edit only their assigned role. Telemetry suggests a matching phase without marking checklist items complete.
- Add a Flight Session dashboard with crew assignments, P2P/simulator status, current detected phase, recent timeline and latest crew action.
- Record completed checklist actions and manual callouts in the shared timeline; include profile, progress and open items in the flight report.
- Show expanded SimBrief route, alternate, time, fuel and weight details while retaining the PDF, and add available TAF data beside METAR.
- Make dark mode the default, organize Crew Notes and Tools in the sidebar, and add Ctrl+1 through Ctrl+8 navigation shortcuts.
- Keep the generic Airbus A320 flow available and document the Fenix EFB checklist as the exact aircraft reference.

## 0.3.1-alpha.23 — Alpha 0.3.1

- Add a subtle aviation-inspired gradient and grid to the app background in both light and dark themes.

## 0.3.1-alpha.22 — Alpha 0.3.1

- Remove the fixed splash delay. The loading screen closes as soon as the main window is ready.

## 0.3.1-alpha.21 — Alpha 0.3.1

- Keep the startup splash visible for at least three seconds before showing the main window.
- Remove the aircraft photo panel and its background lookup.

## 0.3.1-alpha.20 — Alpha 0.3.1

- Add a startup splash screen using the supplied airport background, with a spinning loading indicator.

## 0.3.1-alpha.19 — Alpha 0.3.1

- Preserve the SimBrief aircraft registration when compacting imported flight plans so it appears on the Flight Board.
- Extend the Flight Board to match the Flight readiness panel width.
- Stretch the desktop side panel to the bottom of the page area.

## 0.3.1-alpha.18 — Alpha 0.3.1

- Remove the bottom-left PeerJS Cloud footer from the lobby screen.
- Fix PDF reload cleanup by destroying the PDF.js loading task rather than the document proxy.
- Give the aircraft registration its own stat, beside the aircraft type.


## 0.3.1-alpha.17 — Alpha 0.3.1

- Add vertical spacing between the Crew Tools status cards and Local preferences.
- Keep the full SimBrief PDF page reachable by scrolling the Flight Plan page.
- Show the SimBrief aircraft registration beside Aircraft and place its credited photo in a separate panel.


## 0.3.1-alpha.16 — Alpha 0.3.1

- Show the SimBrief aircraft registration beside the Aircraft label on the flight board.
- Add a separate aircraft photo area when a registration-matched image is available, with photographer credit and a link to the original.


## 0.3.1-alpha.15 — Alpha 0.3.1

- Add SimBrief PDF zoom controls with a live zoom percentage and a wider zoom range.
- Add a ChartFox Charts page with airport search, grouped chart categories, and direct links to selected charts. ChartFox API tokens are encrypted in Windows secure storage on this PC.
- Remove the manual flight-event/debrief card from Crew Tools and checklist phase lock emojis.


## 0.3.1-alpha.14 — Alpha 0.3.1

- Shorten the sidebar, keep the theme toggle in the top-right header, and remove the native File/View/Help menu.
- Show local and Zulu clocks with dates on every page, and remove the flight-progress label background.
- Fix diagnostic status dots and remove the Crew Tools route snapshot and briefing-template cards.
- Match VATSIM aircraft by the exact flight-plan callsign, with no nearby-aircraft fallback.
- Remember the SimBrief ID and check once a minute for a departure within the next hour in UTC when the host lobby has no plan. Preserve manual imports at any time.
- Open the flight-plan PDF inline, fit it to the available width, and resize it with the app.

## 0.3.1-alpha.13 — Alpha 0.3.1

- Prevent UI regression tests from showing broken-pipe error dialogs when their output closes.
- Fill the available desktop window and start maximized; scroll long pages inside the app.
- Use a black and charcoal dark theme, yellow simulator-waiting status, and green online ATC indicators.
- Preserve checklist scroll and focus when checking actions or receiving updates; completing a phase unlocks the next without switching away.
- Keep route progress at zero before departure, reject stale positions, and reset the flight board between lobbies and plans.
- Select the checklist profile from the imported flight plan and show its actual aircraft type, with no default A320 selection.

## 0.3.1-alpha.12 — Alpha 0.3.1

- Fix joining lobbies with lowercase or mixed-case codes and codes pasted with surrounding spaces.
- Show the app validation message for invalid lobby codes instead of the browser format warning.
- Add regression coverage for accepted and invalid lobby-code inputs.

## 0.3.1-alpha.11 — Alpha 0.3.1

- Refresh the Flight Desk with the Prismatic Pay inspired design, including light and dark themes with a saved theme toggle.
- Refine the header and lobby layout and add the creator credit.

## 0.3.1-alpha.10 — Alpha 0.3.1

- Restyle the interface using the supplied QuestUI palette, typography, angular controls, gold active states and layered card surfaces.
- Keep flight operations, checklist behavior and P2P synchronization unchanged.

## 0.3.1-alpha.9 — Alpha 0.3.1

- Detect flight timeline milestones automatically from FSUIPC telemetry: pushback, taxi, takeoff, climb, cruise, descent, approach, landing and parking.
- Add a VATSIM live-flight match using simulator position and the filed route, including callsign, aircraft type, filed registration, altitude, groundspeed and locally tuned COM1 frequency.
- Refresh public VATSIM live data on its 15-second feed interval.

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
