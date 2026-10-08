# Changelog

## 0.5.0-alpha.19 — Alpha 0.5

- Refresh the Windows cockpit workspace with a refined navy and blue visual system, clearer information hierarchy, consistent controls and panels, and improved compact-window navigation.
- Keep existing simulator, crew synchronization, voice, flight planning and analysis behavior intact while restyling the interface.

## 0.5.0-alpha.18 — Alpha 0.5

- Hide the aircraft-type context card on Briefing pages so the Departure and Arrival ICAO fields have a cleaner header; keep aircraft details on the Flight Board and checklist settings.

## 0.5.0-alpha.17 — Alpha 0.5

- Move Flight Timeline marker dots clear of their vertical guide and add comfortable left inset to Flight Readiness rows.
- Hide the empty aircraft badge in a new lobby so “Waiting for flight plan” no longer appears above the departure airport.
- Review every major workspace at desktop sizes for edge spacing and add regression checks for timeline, readiness, activity and lobby states.

## 0.5.0-alpha.16 — Alpha 0.5

- Add consistent horizontal inset to shared-cockpit PF/PM state cards so crew names and status text do not touch the card edges.
- Center the global route, callsign and aircraft context across the window at desktop widths, and keep it centered on compact layouts.
- Clear the global flight-context row for a new lobby until a plan is available instead of displaying “No flight plan loaded”.
- Add renderer checks for card text insets, centered flight context across window sizes, and the no-plan lobby state.

## 0.5.0-alpha.15 — Alpha 0.5

- Align the Flight Board route hero vertically: reserve the aircraft-badge row on both sides, keep progress centered between the airport codes, and line up airport, weather, ATC and ATIS rows.
- Keep long ATC lists available in equal-height scroll areas, and center the Flight Number, Block Time, distance, aircraft and registration metadata.
- Add renderer assertions for route-row alignment, the progress position, scrollable ATC rows and centered flight metadata.

## 0.5.0-alpha.14 — Alpha 0.5

- Center Flight Board departure and arrival information in separate route columns, with flight progress and its marker held in the middle column between airport and METAR content.
- Organize navigation into Flight Desk, Crew, Traffic, Analysis, Tools and System; align the global header around application identity, flight context and session controls, with the live SIM/CREW/VOICE/VATSIM strip below.
- Present Flight Board activity and Flight Timeline in chronological order, with event time and crew attribution ahead of each description.
- Group existing Voice Link controls into Connection, Audio, Transmit and Voice Profile; keep accessible Crew Tools tabs and their original controls.
- Promote current and next waypoint hierarchy, strengthen checklist phase/section/item hierarchy, and align PDF controls with the planning card.
- Replace the empty Flight Replay map with a useful no-history state and Flight History action; standardize Charts, EFB and traffic empty/loading/error states, including an EFB retry action.
- Show the installed build number under Settings → About, refine button feedback and status colors, and extend renderer coverage for route alignment, navigation, empty states, keyboard access and desktop zoom levels.

## 0.5.0-alpha.13 — Alpha 0.5

- Simplify the sidebar into three clear groups with flat navigation rows, and give page titles and key flight data a more readable hierarchy.
- Refine Flight Board and Flight Plan layouts into compact route summaries, grouped SimBrief data, clear unavailable states and less repetitive status rows.
- Group Departure and Arrival Briefing fields by workflow without changing their synchronized storage or controls.
- Turn Crew Tools into accessible tabs that show one existing voice, history, timeline, VATSIM, handover or preference panel at a time.
- Group simulator and P2P diagnostics under a live health strip, with technical connection and aircraft-system details available on demand.
- Collapse route procedure groups and size the VATSIM map to its workspace; show a centered empty state when traffic is absent and clear details when the selected aircraft leaves the feed.
- Improve empty states and flatten repeated metric cards across Flight Analysis, statistics, timers and activity rows.
- Extend UI regression coverage for panel switching, grouped briefings, empty traffic, stale traffic details and compact sidebar reachability; visually verify pages at 920×640 through 3840×2160.

## 0.5.0-alpha.12 — Alpha 0.5

- Reorganize Route Viewer into a map-first 70/30 layout with a dedicated navigation panel for live route metrics, waypoints and procedures.
- Add working route-map zoom, live-aircraft centering and planned-route visibility controls, with unavailable simulator position handled explicitly.
- Add compact Crew Tools navigation across the existing voice, history, timeline, VATSIM match, handover and preference panels without replacing their state or handlers.
- Give Flight Analysis empty results the same clear, restrained state treatment and add shared semantic design-token aliases and tooltips for labeled controls.
- Align form surfaces, field labels, card headings, table headers and focus states across the existing pages; cap transient crew notices so bursts leave the active controls reachable.
- Expand renderer checks to every main page at 1440×900, 1920×1080 and 2560×1440, alongside the existing smaller and 4K window coverage.

## 0.5.0-alpha.11 — Alpha 0.5

- Polish the existing desktop interface with consistent dark-first cards, controls, tabs, spacing, focus states and page context while preserving the current integrations and operational systems.
- Replace the cramped sidebar layout with Flight Desk, Traffic, Analysis, Tools and Diagnostics sections. Keep Briefing as one entry with its five existing tabs, and make every navigation destination reachable in short windows.
- Add shared flight context and live simulator, crew, voice and VATSIM status to page headers. Use explicit unavailable states for the dedicated Charts workspace and link to the existing ChartFox tools.
- Preserve configurable joystick/game-controller hold-to-mute, toggle-mute and push-to-talk bindings from alpha.10.

## 0.5.0-alpha.10 — Alpha 0.5

- Replace the single controller mute shortcut with multiple saved gamepad bindings for hold-to-mute, toggle mute and push-to-talk. Each action is tracked independently, manual mute remains independent, and disconnects release held actions.
- Move controller mapping into Settings → Keybinds, retain the keyboard PTT shortcut there, and add a direct Keybinds button beside Voice Chat.
- Reorganize the sidebar into Flight Desk, Crew Notes and Tools; pin Tools with its own compact scroll area and place dynamically added EFB, VATSIM traffic and Flight Analysis pages in the correct group.

## 0.5.0-alpha.9 — Alpha 0.5

- Bind a joystick or game-controller button for hold-to-mute. The selected button is saved locally, captures only a fresh press after all controls are released, and releases the mute when the button is released or the controller disconnects.
- Keep controller hold-to-mute independent from manual microphone mute, so releasing the controller cannot clear a latched mute. Add the binding and status to Crew Tools and Settings.

## 0.5.0-alpha.8 — Alpha 0.5

- Accept a connected crew voice call even when WebRTC media signalling arrives before the separate lobby-channel voice-ready message.
- Report voice readiness, ICE negotiation, established transport and measured audio quality separately; do not show Excellent until a selected route and inbound audio traffic are measured.
- Show the waiting pilot and ICE/NAT failure states directly in Crew Tools and Diagnostics so a blocked route is distinguishable from a microphone that is merely ready.

## 0.5.0-alpha.7 — Alpha 0.5

- Import a SimBrief plan automatically only when its scheduled or estimated departure is in the future; manual fetch continues to allow older plans.
- Combine Departure Briefing, Arrival Briefing, Cockpit Notes, Enroute and Debrief under one Briefing sidebar button with five internal tabs. Keep the briefing forms independent from note-template setup so their fields always render.
- Route dynamically added sidebar pages through a delegated click handler so Route Viewer and Diagnostics respond reliably.


## 0.5.0-alpha.6 — Alpha 0.5

- Attach Create lobby and Join lobby before optional page setup so a secondary UI initialization error cannot leave the core session controls inactive.
- Improve update-status wording and layout so download progress and restart instructions remain readable at narrow and wide window sizes.
- Clarify that Flight History only receives a session after a flight plan is loaded and the flight is landed and parked.

## 0.5.0-alpha.5 — Alpha 0.5

- Add synchronized Departure Briefing and Arrival Briefing pages with crew-editable fields; keep Cockpit Notes, Enroute notes and Debrief separate.
- Add an OpenStreetMap basemap to Route Viewer and keep its attribution visible.
- Put EFB in the Flight Desk navigation group, and move Connection Diagnostics and Service Availability into a dedicated group below Tools.
- Improve spacing in stacked page content and the Flight Board action prompts.
- Set Charts to Work In Progress and remove the Cockpit Voice Recorder interface.
- Detect engine-start events and expose engine combustion, N2 and beacon-light telemetry when FSUIPC7 provides it.
- Fix VATSIM ATIS retrieval and keep simulator/flight-phase integration status explicit.
- Keep SimBrief auto-import polling every five seconds only until the shared plan is loaded; manual fetch remains available.
## 0.5.0-alpha.4 — Alpha 0.5

- Add automatic update checks against the public GitHub Releases alpha channel, with background downloads and an in-app restart-to-install prompt.
- Generate a SHA-512 update manifest and include it with the NSIS installer and blockmap so future alpha releases can update existing installs.
- The existing alpha.3 installer predates the updater and must be upgraded once by running the alpha.4 installer; later releases can update from inside Flight Desk.

## 0.5.0-alpha.3 — Alpha 0.5

- Add a SimBrief Route Viewer with navlog waypoint geometry, live aircraft position, waypoint sequencing, route distance/progress, altitude, speed, ETA and available departure/arrival procedures.
- Surface shared PF/PM activity and checklist flow, flight-phase context, a clickable What’s Next prompt, contextual Flight Desk focus and a state-based Flight Readiness checklist.
- Add Clean Headset, VHF, Slight Degradation and Heavy Degradation microphone profiles with configurable effect strength, optional network-quality influence, band limiting, compression, noise, distortion, squelch and PTT clicks.
- Add an opt-in local Cockpit Voice Recorder with session metadata, playback, duration and timeline markers. Newly arriving remote audio joins an active recording; no recording is uploaded.
- Add live departure/arrival/nearby ATC, copyable frequencies, simulator COM1, and a distance/altitude-sorted VATSIM traffic map and detail panel.
- Add local flight-track replay, two-flight comparison, airport/aircraft/shared-crew statistics and links to airport statistics from reports.
- Preserve incomplete session state for explicit restart recovery, retry interrupted P2P connections, compare synchronized state versions after reconnect, and show offline service availability.
- Export a ZIP diagnostics package with application/OS, simulator, P2P/voice, online-service, recent event and renderer-error details; redact credentials and lobby codes.
- Extend regression coverage for these features. Actual fuel, runway usage, Navigraph, VAMsys and TURN relay configuration are not provided by the current integrations and remain explicitly unavailable/not configured.

## 0.5.0-alpha.2 — Alpha 0.5

- Stabilize Voice Link setup: the host starts one bidirectional call after both microphones are ready, received audio uses the direct speaker stream, and a playback-unlock button covers blocked autoplay.
- Show title-cased voice quality in diagnostics and report when a voice ICE route fails. This app still has no TURN relay, so restrictive NAT/firewall combinations can prevent voice even when lobby data is connected.
- Replace large ATIS cards with collapsed inline disclosures whose text scrolls within the Flight Board layout.
- Remove the Crew Callouts panel and remove the SimBrief-driven Approach Briefing card. Keep manual Arrival Briefing templates for crew-confirmed ATIS, clearance, approach chart, minima and missed-approach details.
- Keep completed flights on each PC and sync reports directly over P2P whenever the same crew names reconnect. Different crew combinations do not receive each other's reports. No storage account or separate cloud service is needed.
- Build the Windows installer with the current simulator helper source and verify the packaged FSUIPC runtime DLL checksum.

## 0.5.0-alpha.1 — Alpha 0.5

- Expand Flight Board into a live Flight Overview with simulator/session status, crew roles, checklist progress, recent events and block, taxi, airborne and taxi-in timers.
- Unify crew activity, checklist, simulator, connection and flight-phase events in a chronological timeline shared with local completed-flight history and reports.
- Add searchable local flight records, useful flight totals, structured flight details and JSON/CSV export with a print-ready A4 report. Keep actual fuel unavailable when simulator telemetry does not supply it.
- Show VATSIM ATIS plus matched VATSIM aircraft position and flight data when the feeds provide them.
- Add peer-to-peer cockpit voice with Push to talk and Open mic modes, device selection, mute, volume, PTT key binding, a local mic-level test and WebRTC-based voice quality feedback.
- Add Settings for crew preferences, units, time format, density, notifications, voice controls and simulator/P2P diagnostics; preserve explicit unavailable states.
- Keep the Fenix A320's role-based operational flows and automatic checklist checks, and keep all Tools buttons reachable in short pages/windows with independent navigation scrolling.
- Reuse the unchanged simulator helper. Validate with `pnpm test`, `pnpm test:ui` and Windows installer archive checks.

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
