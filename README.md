# Shared Cockpit Flight Desk

<img src="src/vendor/app-icon.png" width="112" alt="Shared Cockpit Flight Desk icon">

A Windows companion app for shared cockpit flying: import a SimBrief flight plan, share crew notes, work through PF/PM flows and follow your flight together.

**Alpha 0.3.1** · Build `0.3.1-alpha.4` · Windows x64

## Features

- Host a lobby and invite other pilots with a seven-character code.
- Synchronize notes, checklist progress and flight-plan data directly over WebRTC.
- Choose Pilot Flying (PF) or Pilot Monitoring (PM), and switch roles during flight.
- Import the latest generated SimBrief OFP and view its PDF inside the app.
- Expand flight phases into separate PF/PM tasks with short explanations.
- View airport names, METAR, nearby VATSIM controllers and frequencies.
- Follow route progress using an included FSUIPC7 position bridge.
- Navigate between Flight Board, Flight Plan, Checklist and crew notes.

The aircraft profiles adapt the terminology of simulator crew flows. They are not complete aircraft/operator checklists; use the selected add-on's procedures for exact actions and limits.

## Install and use

Download the Windows `.exe` installer from this repository's **Releases** section when a release has been uploaded. End users do not need Node.js or a .NET SDK.

1. Both pilots install the same alpha build.
2. The host enters a name, selects PF or PM and clicks **Create lobby**.
3. The other pilot enters their name and joins using the host's code.
4. Each flight starts with a newly generated lobby code. The app does not reconnect to a previous session when reopened.
5. Open **Flight Plan** and enter the SimBrief username or pilot ID for an already generated plan.
6. To track the aircraft, run the simulator and FSUIPC7 on a connected Windows PC. The helper is bundled with the installer.

## How connections and data work

PeerJS Cloud exchanges connection details automatically; no account or manually operated server is needed. Session content travels directly between connected PCs. Local session data is stored in the Electron app's browser storage on each PC.

The current configuration uses Google STUN and has no TURN relay configured. Some network combinations may prevent a direct connection. SimBrief, AviationWeather.gov and VATSIM are also contacted for their respective data. METAR refreshes every 15 minutes; VATSIM information refreshes every 5 minutes.

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

To skip compiling the helper, download the matching `FlightPositionBridge-0.3.1-alpha.4-win-x64.zip` Release asset and extract it into the project root. It creates `simtracker/publish/` with the executable and its companion libraries. Then use `pnpm start` or `pnpm dist`; the .NET SDK is unnecessary for this route.

The helper EXE is larger than GitHub's normal Git file limit. Its source belongs in this repo; the prebuilt archive belongs in Releases. The `publish` folder is ignored by Git.

### Build the installer

```powershell
pnpm dist
```

Output: `dist/Shared-Cockpit-Flight-Desk-Setup-0.3.1-alpha.4.exe`.

`pnpm dist` expects the helper to exist. It bundles the checked-in renderer assets and never publishes a release automatically. This project currently packages Windows only.

### Checks

```powershell
pnpm test
```

The lobby regression checks cover old saved checklists, new lobbies, joining, timeouts, retries and concurrent clicks. They use simulated connections; they do not verify a live session across two internet connections.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/main.cjs` | Electron window, native menu, external-data requests and helper process |
| `src/preload.cjs` | Narrow bridge between the window and Electron |
| `src/flightdesk.html` | English interface, crew flows, state and P2P logic |
| `src/vendor/` | Bundled PDF.js, PeerJS, icon and notices |
| `simtracker/` | C# source for the FSUIPC position helper |
| `build/icon.ico` | Windows app and installer icon |
| `tests/` | Lobby regression checks |
| `.github/workflows/windows-build.yml` | Windows build and downloadable workflow artifacts |

See [development notes](docs/DEVELOPMENT.md), [changes](CHANGELOG.md), [GitHub setup](docs/GITHUB-SETUP.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

## Credits and licensing

Uses the FSUIPC Client DLL for .NET by Paul Henty. PeerJS and PDF.js notices are included in `src/vendor/`.

No redistribution license has been selected for the original application code or artwork. Third-party components retain their own licenses.
