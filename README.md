# Shared Cockpit Flight Desk

<img src="src/vendor/app-icon.png" width="112" alt="Shared Cockpit Flight Desk icon">

A Windows companion app for shared cockpit flying: import a SimBrief flight plan, share crew notes, work through PF/PM flows and follow your flight together.

**Alpha 0.5** · Build `0.5.0-alpha.17` · Windows x64

## Features

- Open **EFB** inside Flight Desk. Automatic mode uses the current local simulator aircraft title from FSUIPC7 to select Fenix, PMDG or iniBuilds; generic aircraft names remain unrecognized rather than guessing a manufacturer. Manual selection and each provider’s local address stay on this PC. Fenix defaults to `http://localhost:8083/`; use your simulator PC’s private IPv4 address when needed. PMDG and iniBuilds have no bundled web-EFB endpoint: a compatible web-EFB server/address is required. The EFB fills the available width beneath a single compact toolbar, giving the screen more height; **Settings** opens aircraft details and the address field. Internal page navigation keeps the EFB connected. **Reload** reconnects and **Expand** fills more of the same app window. The simulator helper is unchanged from alpha.8.

- Check for new alpha releases automatically at startup and every six hours. Updates download in the background; Flight Desk asks before restarting, and installs a downloaded update when the app closes. **Check for updates** can also start a check manually. Updates come from this public repository’s GitHub Releases, with no account or token required on pilot PCs. Alpha.3 and older installers do not have the updater; install alpha.4 or newer once manually. Later versions can update in-app.

- Host a lobby and invite other pilots with a seven-character code.
- Use a compact, consistent flight-desk interface with shared form, card, table and focus styling; a single-scroll sidebar grouped into Flight Desk, Crew, Traffic, Analysis, Tools and System; and briefings kept under one entry with five internal tabs. Crew notices remain transient and are capped during event bursts. The global route/callsign/aircraft context stays centered across the window, and crew-state cards keep their text inset from the card edges.
- Follow the six semantic navigation groups. The Flight Board keeps departure, flight progress and arrival in a centered three-column route hero with level airport headings, aligned weather/ATC/ATIS rows and centered flight metadata; Flight Plan and Briefing data are grouped by purpose, and unavailable values are labeled clearly.
- Synchronize notes, checklist progress and flight-plan data directly over WebRTC.
- Choose Pilot Flying (PF) or Pilot Monitoring (PM), and switch roles during flight.
- Import a SimBrief OFP and view its PDF inline, fitted to the page width, with zoom controls. Automatic import accepts a plan only when its scheduled or estimated departure is in the future; manual fetch remains available for older plans.
- Use the Fenix A320 profile with 18 phases, concrete role-based cockpit prompts, separate FLOW and CHECKLIST groups, and side-by-side PF/PM progress. The Airbus A319/A320/A321 selection offers only the Fenix profile; other aircraft have no checklist profile.
- Review the live crew/session dashboard, checklist readiness and telemetry-based phase suggestions. Fenix **AUTO** items check themselves from stable cockpit readings in the current unlocked phase and assigned PF/PM role; the beacon check can also use FSUIPC7 lighting telemetry. External power requires ON, not AVAIL. Missing data leaves items manual; briefings, reviews and condition-dependent decisions remain manual. Both pilots should use the same build; cockpit telemetry and completed items synchronize across the lobby. After 10 seconds of stable ground data the dashboard shows **On ground / Preflight**, then detects pushback or taxi movement. Flight phases display even without a checklist profile, and polling continues while the app is minimized. Automatic flight tracking requires a stable ground baseline followed by a sustained takeoff; connecting in midair does not create a flight or landing history. Disconnections and position jumps require a new ground baseline.
- See a compact live Flight Overview with crew roles, simulator/P2P status, current phase, checklist progress, last event and block, taxi, airborne and taxi-in timers. Crew, checklist, simulator, connection and flight-phase events feed one ordered timeline; its marker dots stay clear of the guide and readiness indicators remain inset from their row edges. Empty lobbies do not show an aircraft badge until a plan or aircraft profile is available.
- Open a dedicated **Route Viewer** with a map-first layout, working zoom, live-aircraft centering and route visibility controls beside a navigation panel for waypoints, progress and procedures. It uses the OpenStreetMap background and SimBrief navlog; unavailable simulator or route data is shown explicitly.
- Use **Crew Tools** tabs to show one existing Voice Link, Flight History, Timeline, VATSIM Match, Crew Handovers or Preferences panel at a time. Voice controls are organized into Connection, Audio, Transmit and Voice Profile groups; tabs preserve their current P2P, history and preference handlers.
- Open **Diagnostics** for a live simulator, P2P and voice health summary. Network-route and aircraft-system details stay available in collapsible sections. Empty Analysis replay, Charts and EFB states explain what is missing and offer a useful next action.
- See each pilot’s PF/PM role, shared flight phase, current checklist flow and current Flight Desk activity. **What’s Next?** and **Flight Desk Focus** surface a phase-aware action, while **Flight Readiness** links real missing items to the relevant page.
- Review completed flights in local Flight History, search reports, inspect flight statistics and export report data as JSON or CSV; use the print dialog to save a polished A4 PDF. Matching crew names sync their shared history directly over the P2P lobby across flights. Each PC keeps its own local archive; a different crew combination does not receive those earlier reports. No cloud-storage login or paid Flight Desk storage service is needed.
- Fill in synchronized **Departure Briefing** and **Arrival Briefing** forms for airport conditions, clearances, SID/STAR, runway, approach, minima, performance, threats and missed approach. Keep freeform shared **Cockpit Notes**, Enroute notes and Debrief on their own pages. These are crew planning aids; verify operational details against current charts, ATIS, aircraft documentation and simulator SOP.
- Use the integrated cockpit voice link over the current peer connection in **Push to talk** or **Open mic** mode. Both pilots enable their microphones; the host starts audio after both are ready. Select the microphone and speakers, bind a PTT keyboard key, or use **Keybinds** beside the voice controls to configure controller buttons for hold-to-mute, toggle mute or push-to-talk. Add multiple bindings, capture a button on the connected controller, and manage all mappings in Settings. Bindings are saved locally and continue polling with Flight Desk minimized; momentary actions release when the button or controller is released. Adjust volume and test the microphone locally. The status distinguishes waiting, ICE negotiation, connected transport and measured audio quality; **Excellent** requires received audio statistics. If ICE fails, this build has no TURN relay, so a restrictive firewall or NAT can still block the voice route. Use **Enable speakers** if playback is blocked.
- Select a **Clean Headset**, **VHF**, **Slight Degradation** or **Heavy Degradation** voice profile and adjust its strength.
- Open **ATC & Traffic** for departure, arrival and nearby VATSIM frequencies, active simulator COM1 when available, and nearby traffic sorted by distance or altitude. Select a traffic entry for its filed route and position details; copy a controller frequency with one click.
- Use **Flight Analysis** to scrub locally recorded flight tracks, compare two completed reports, and inspect airport, aircraft and crew statistics. New replay tracks require connected simulator telemetry during the flight; values the current simulator bridge cannot provide, such as actual fuel used and runway usage, remain marked unavailable.
- Resume a locally saved unfinished session after restarting Flight Desk, and let a dropped P2P link retry in the background while preserving the local flight state. Open the separate **Diagnostics** section below Tools for connection diagnostics, service availability and a sanitized diagnostics export.
- Open **Settings** from the header for crew preferences, units, timeline time format, display density, voice controls, integration/connection diagnostics and event notification preferences. Simulator and P2P diagnostics show unavailable data explicitly.
- Track crew handovers and record a shared flight timeline with checklist actions.
- **Charts** is marked Work In Progress. ChartFox and Navigraph are not shown as active chart integrations.
- In short desktop windows, the sidebar tightens its spacing so all tools remain visible when possible and otherwise scrolls the selected destination into view.
- Use local crew preferences.
- Check P2P, simulator-position, voice and service status under Diagnostics.
- View airport names, METAR, TAF, nearby VATSIM controllers and frequencies when available.
- Review parsed SimBrief route, alternate, cruise level, times, fuel and weight data alongside the original PDF.
- Show the SimBrief aircraft registration. Track route progress and infer flight phases from FSUIPC7 telemetry, including engine-start detections. Show engine combustion/N2 and beacon-light telemetry when FSUIPC7 provides it. Find a VATSIM aircraft by its exact flight-plan callsign.
- See local and Zulu clocks and dates in the header on every page; local time uses your computer's time zone.
- Open pages with Ctrl+1 through Ctrl+8 (shortcuts are ignored while entering text). The app opens in dark mode and remembers a selected light theme.

Checklist content, source notes and aircraft-specific limits are documented in [docs/CHECKLIST-SOURCES.md](docs/CHECKLIST-SOURCES.md). The Fenix A320 scan flow is an original simulator aid, not an operational checklist; use the exact current checklist in **Fenix EFB → Fenix → Pilot Brief → Documents**.

## Install and use

Download the Windows `.exe` installer from this repository's **Releases** section when a release has been uploaded. End users do not need Node.js or a .NET SDK.

1. Both pilots install the same alpha build.
2. The host enters a name, selects PF or PM and clicks **Create lobby**.
3. The other pilot enters their name and joins using the host's code.
4. Each flight starts with a newly generated lobby code. After an interrupted session, Flight Desk offers the locally saved flight for explicit recovery; it does not silently rejoin a previous lobby.
5. Open **Flight Plan** and enter the SimBrief username or pilot ID for an already generated plan.
6. To track the aircraft, run the simulator and FSUIPC7 on a connected Windows PC. The helper and its FSUIPC WAPI runtime are bundled with the installer. Fenix cockpit-variable checks also require the FSUIPC WASM module installed and enabled in the simulator; the Checklist page shows connection status.

The SimBrief ID is remembered as you type. While the host lobby has no plan, the app checks every five seconds and automatically imports the latest OFP only when its scheduled or estimated departure is in the future. Plans with a past or missing departure time are skipped and the app keeps checking. Automatic checks are serialized and stop after a plan is imported; **Fetch plan** remains available and can manually import an older plan. Frequent polling may exceed SimBrief's intended API usage or trigger service rate limits.

## How connections and data work

PeerJS Cloud exchanges connection details automatically; no account or manually operated server is needed. Session content travels directly between connected PCs. Local session data is stored in the Electron app's browser storage on each PC.

The current application configuration uses Google STUN and does not yet use the locally hosted coturn server as a TURN relay. Some restrictive network combinations may prevent voice from connecting even while the lobby data link is active. SimBrief, AviationWeather.gov and VATSIM are contacted for their respective data. METAR refreshes every 15 minutes, TAF every 30 minutes, airport ATC every 5 minutes, and the live ATC/traffic view refreshes every 15 seconds while open. Navigraph and VAMsys are not integrated; Flight Desk shows that state instead of implying those services are online.

Flight history is stored on each PC. When the same crew reconnects, the app matches the normalized pilot names and exchanges only reports tagged for that crew group. A different crew combination does not receive those reports. Both PCs must be online in the same lobby to synchronize; the P2P signaling service introduces the peers but does not store flight records. Shared reports include crew names, notes and event logs. Names are grouping labels, not verified accounts.

## Develop on Windows

Install **Node.js 24.x** and **pnpm 11.19.0**. Install the **.NET 8 SDK or a newer SDK that can target .NET 8** if you want to compile the simulator helper.

From the folder containing `package.json`:

```powershell
npm install --global pnpm@11.19.0
pnpm install --frozen-lockfile
pnpm build:helper
pnpm start
```

The repository uses `pnpm-lock.yaml`. Do not replace it with an npm-generated lockfile.

### Reuse the prebuilt helper

To skip compiling the helper, download the matching `FlightPositionBridge-0.5.0-alpha.17-win-x64.zip` Release asset and extract it into the project root. The archive creates `simtracker/publish/` with the executable and its companion libraries. Then use `pnpm start` or `pnpm dist`; the .NET SDK is unnecessary for this route.

The helper EXE is larger than GitHub's normal Git file limit. Its source belongs in this repo; the prebuilt archive belongs in Releases. The `publish` folder is ignored by Git.

### Build the installer

```powershell
pnpm dist
```

Output: `dist/Shared-Cockpit-Flight-Desk-Setup-0.5.0-alpha.17.exe`, its `.blockmap`, and the `dist/alpha.yml` update manifest. The GitHub prerelease also includes the unchanged simulator-helper ZIP and a `SHA256SUMS.txt` file for the release assets.

`pnpm dist` expects the helper to exist. It creates the installer and update metadata but does not publish a release. Attach the installer, `alpha.yml`, and matching `.blockmap` to the same published GitHub prerelease. This project currently packages Windows only.

Alpha installers are not Authenticode-signed. Windows may show an unknown-publisher warning on first install; in-app updates verify the downloaded installer against the SHA-512 value in the release manifest.

### Checks

```powershell
pnpm test
pnpm test:ui
```

The regression checks cover route projection, sample replay and statistics, VATSIM controllers/traffic, diagnostics ZIP redaction, lobby recovery invariants, voice setup, flight state, simulator telemetry and automatic checklist behavior. The Electron UI checks exercise route controls, six-group sidebar navigation, accessible Crew Tools tabs, route/readiness, crew activity, ATC/traffic, historical analysis, offline states and every main page at 1440×900, 1920×1080 and 2560×1440, with additional 4K through 920×640 and desktop zoom coverage. Connections and simulator data are simulated; these checks do not verify a live session across two internet connections or record a live microphone session.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/main.cjs` | Electron window, native menu, external-data requests and helper process |
| `src/preload.cjs` | Narrow bridge between the window and Electron |
| `src/flightdesk.html` | English interface, crew flows, state and P2P logic |
| `src/aircraft-profiles/fenix-a320.js` | Structured Fenix A320 scan-flow profile |
| `src/vendor/` | Bundled PDF.js, PeerJS, icon and notices |
| `simtracker/` | C# source for the FSUIPC position helper |
| `build/icon.ico` | Windows app and installer icon |
| `tests/` | Lobby regression checks |
| `.github/workflows/windows-build.yml` | Windows build and downloadable workflow artifacts |

See [development notes](docs/DEVELOPMENT.md), [changes](CHANGELOG.md), [GitHub setup](docs/GITHUB-SETUP.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

## Credits and licensing

Uses the FSUIPC Client DLL for .NET by Paul Henty. PeerJS and PDF.js notices are included in `src/vendor/`.

No redistribution license has been selected for the original application code or artwork. Third-party components retain their own licenses.
