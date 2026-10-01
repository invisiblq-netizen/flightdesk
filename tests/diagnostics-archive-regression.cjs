const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { sanitize, crc32, createDiagnosticsArchive } = require('../src/diagnostics-archive.cjs');

assert.equal(sanitize({ apiToken: 'do-not-export' }).apiToken, '[REDACTED]');
assert.match(sanitize({ log: 'Authorization: Bearer secret-value' }).log, /\[REDACTED\]/);
assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
const zip = createDiagnosticsArchive({
  application: { displayVersion: 'Alpha 0.6', sessionCode: 'ABC2345' },
  simulator: { simConnect: 'Connected' },
  connections: { route: 'DIRECT P2P', access_token: 'never-export' },
  services: { vatsim: 'offline' },
  errors: [{ message: 'Request?token=hidden-value' }],
  events: [{ id: 'ABC2345-checklist-preliminary-1', text: 'Flight started' }]
}, { version: '0.6.0-alpha.1', os: 'Windows' });
assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50, 'Output must be a standard ZIP archive');
const files = new Map();
let offset = 0;
while (zip.readUInt32LE(offset) === 0x04034b50) {
  const method = zip.readUInt16LE(offset + 8), checksum = zip.readUInt32LE(offset + 14), compressedBytes = zip.readUInt32LE(offset + 18), originalBytes = zip.readUInt32LE(offset + 22), nameBytes = zip.readUInt16LE(offset + 26), extraBytes = zip.readUInt16LE(offset + 28);
  const name = zip.subarray(offset + 30, offset + 30 + nameBytes).toString('utf8'), start = offset + 30 + nameBytes + extraBytes, compressed = zip.subarray(start, start + compressedBytes);
  const contents = method === 8 ? zlib.inflateRawSync(compressed) : compressed;
  assert.equal(contents.length, originalBytes);
  assert.equal(crc32(contents), checksum);
  files.set(name, contents.toString('utf8'));
  offset = start + compressedBytes;
}
for (const name of ['README.txt', 'application.json', 'simulator.json', 'connections.json', 'online-services.json', 'recent-events.json']) assert.ok(files.has(name));
const archiveText = [...files.values()].join('\n');
assert.ok(!archiveText.includes('do-not-export'));
assert.ok(!archiveText.includes('never-export'));
assert.ok(!archiveText.includes('hidden-value'));
assert.ok(!archiveText.includes('ABC2345'));
console.log('PASS: Diagnostics exports a readable ZIP containing system/service/flight data with tokens and lobby codes redacted.');
