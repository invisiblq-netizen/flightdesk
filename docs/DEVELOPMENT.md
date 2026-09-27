# Development notes

## Current state

The Windows app is in alpha testing. Version `0.4.0-alpha.5` displays as **Alpha 0.4**. Keep `package.json` as the version source. Preserve the package name, app ID and product name when updating so installation and local storage continue using the existing identity.

The earlier installer used version 1.3.0 before alpha numbering was introduced. The current NSIS installer is configured to preserve application data.

## Data and lobby regression

`Create lobby` previously disabled itself and called `stopPeer()` before entering its error handler. That cleanup rendered a checklist that could still contain the old `details`/`done` format; accessing `phase.flows.PF` then threw before any network connection was attempted.

The alpha fix normalizes saved state before rendering, retains old items in a saved checklist section, separates connection cleanup from checklist rendering and restores controls in `finally`. Create and join share a busy guard. Previous sessions are not resumed at startup; every host lobby gets a freshly generated code. Tests in `tests/lobby-regression.cjs` exercise lobby setup and connection failures with simulated peers.

Session patches carry per-field logical clocks. Large messages are chunked before transmission. SimBrief state is compacted so the full raw response is not sent to the other PC. The PDF is downloaded through Electron and rendered using the bundled PDF.js assets.

Checklist source references and their aircraft-variant limits are documented in [CHECKLIST-SOURCES.md](CHECKLIST-SOURCES.md). The Fenix A320 profile lives in `src/aircraft-profiles/fenix-a320.js`; it supplies normalized phase, section, role and action data to the renderer. Checklist synchronization is split into PF, PM and shared CM fields and also syncs the selected aircraft profile. Each peer can update only its selected PF/PM flow; either pilot may acknowledge a shared CM item. Stable item IDs and metadata are preserved over P2P patches so both pilots see the same FLOW/CHECKLIST state.

## Build tools

- Node.js 24.x and pnpm 11.19.0.
- Electron 44.4.5 and electron-builder 26.15.3, pinned in the manifest and lockfile.
- .NET helper targets `net8.0-windows7.0` and FSUIPCClientDLL 3.3.16. The target framework suffix is not a claim that the Electron app supports Windows 7.
- `pnpm build:helper` publishes for Windows x64, includes the .NET runtime and embeds native libraries for extraction.
- `pnpm dist` packages into `dist/`. Copying the repository elsewhere must not require editing absolute paths.

Renderer bundles are committed so the app can run without fetching frontend scripts. Update them deliberately together with their dependency versions and license notices. Do not edit minified bundles manually.

## GitHub Actions

The Windows workflow installs locked dependencies, runs the lobby checks, builds the helper and creates an installer artifact. It has read-only repository permissions and does not publish a GitHub Release. After a successful run, download its artifact from the Actions run page.

The FSUIPC bridge reads position, on-ground state, groundspeed, vertical speed, heading, altitude and COM1 frequency. Timeline phase events are inferred from these telemetry values and synchronized through the lobby. VATSIM pilot matching uses the public VATSIM Data API; registration is shown only when supplied in the flight-plan remarks.

## Scope

All interface text is English. Windows is the current packaging target. No Cloudflare account, Node.js installation or manually started signalling server is needed by end users. The app depends on PeerJS Cloud for introductions; direct connectivity depends on the two networks.
