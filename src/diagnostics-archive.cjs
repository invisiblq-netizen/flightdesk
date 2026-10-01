const zlib = require('node:zlib');

const sensitiveKey = /(?:token|authorization|cookie|password|secret|credential|api.?key|session.?code)/i;
function sanitizeText(value) {
  return String(value)
    .replace(/\b([A-HJ-NP-Z2-9]{7})(?=-(?:crew|p2p|checklist|flight|simulator|voice)\b)/gi, '[REDACTED]')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:access_token|token|api_key)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/((?:password|secret|token|api[_ -]?key)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .slice(0, 12000);
}
function sanitize(value, key = '', depth = 0) {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (depth > 12) return '[TRUNCATED]';
  if (typeof value === 'string') return sanitizeText(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(-500).map(item => sanitize(item, '', depth + 1));
  if (!value || typeof value !== 'object') return String(value);
  const result = {};
  for (const [name, item] of Object.entries(value).slice(0, 500)) result[name] = sanitize(item, name, depth + 1);
  return result;
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (date.getFullYear() - 1980) << 9 | (date.getMonth() + 1) << 5 | date.getDate();
  return { time, day };
}
function createZip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  const { time, day } = dosDateTime();
  for (const [name, value] of Object.entries(entries)) {
    if (!/^[A-Za-z0-9._-]+\.json$/.test(name) && name !== 'README.txt') throw new Error('Invalid diagnostics archive entry name.');
    const filename = Buffer.from(name), contents = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value, null, 2), 'utf8'), compressed = zlib.deflateRawSync(contents), checksum = crc32(contents);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10); local.writeUInt16LE(day, 12); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(contents.length, 22); local.writeUInt16LE(filename.length, 26);
    locals.push(local, filename, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12); central.writeUInt16LE(day, 14); central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(contents.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    centrals.push(central, filename);
    offset += local.length + filename.length + compressed.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0), directory = Buffer.alloc(22);
  directory.writeUInt32LE(0x06054b50, 0); directory.writeUInt16LE(Object.keys(entries).length, 8); directory.writeUInt16LE(Object.keys(entries).length, 10); directory.writeUInt32LE(centralSize, 12); directory.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, directory]);
}
function createDiagnosticsArchive(payload = {}, system = {}) {
  const safe = sanitize(payload), app = sanitize({ ...system, ...(safe.application || {}) });
  return createZip({
    'README.txt': 'Shared Cockpit Flight Desk diagnostics. Authentication tokens and session codes are redacted. Review the package before sharing it.',
    'application.json': app,
    'simulator.json': safe.simulator || {},
    'connections.json': safe.connections || {},
    'online-services.json': safe.services || {},
    'recent-events.json': { errors: safe.errors || [], events: safe.events || [] }
  });
}
module.exports = { sanitize, crc32, createZip, createDiagnosticsArchive };
