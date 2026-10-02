'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(packageInfo.version || '');
const prerelease = /-(alpha|beta)(?:[.-]|$)/i.exec(version);
const channel = prerelease ? prerelease[1].toLowerCase() : 'latest';
const fileName = `Shared-Cockpit-Flight-Desk-Setup-${version}.exe`;
const dist = path.join(root, 'dist');
const installerPath = path.join(dist, fileName);
const blockmapPath = `${installerPath}.blockmap`;

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`Invalid app version: ${version}`);
if (!fs.existsSync(installerPath)) throw new Error(`Installer not found: ${installerPath}. Run pnpm dist first.`);
if (!fs.existsSync(blockmapPath)) throw new Error(`Installer blockmap not found: ${blockmapPath}. Auto-update releases need both files.`);

async function main() {
  const sha512 = await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(installerPath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('base64')));
  });
  const quotedName = JSON.stringify(fileName);
  const manifest = [
    `version: ${version}`,
    'files:',
    `  - url: ${quotedName}`,
    `    sha512: ${JSON.stringify(sha512)}`,
    `    size: ${fs.statSync(installerPath).size}`,
    `path: ${quotedName}`,
    `sha512: ${JSON.stringify(sha512)}`,
    `releaseDate: '${new Date().toISOString()}'`,
    ''
  ].join('\n');

  const manifestPath = path.join(dist, `${channel}.yml`);
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log(`Created ${path.relative(root, manifestPath)} for ${version}.`);
  console.log(`Release uploads must include ${fileName}, ${path.basename(blockmapPath)}, and ${path.basename(manifestPath)}.`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
