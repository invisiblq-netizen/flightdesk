# Changelog

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
