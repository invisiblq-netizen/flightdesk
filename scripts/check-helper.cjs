const fs = require('node:fs');
const path = require('node:path');
const executable = path.join(__dirname, '../simtracker/publish/FlightPositionBridge.exe');
if (!fs.existsSync(executable)) {
  console.error('Simulator helper missing. Run pnpm build:helper, or extract the matching FlightPositionBridge Release archive into the project root. See README.md.');
  process.exitCode = 1;
}
