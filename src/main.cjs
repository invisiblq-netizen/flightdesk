const {sanitizeCockpit}=require('./cockpit-telemetry.cjs');
const {EfbView}=require('./efb.cjs');
const { app, BrowserWindow, Menu, ipcMain, clipboard, safeStorage, shell, session, protocol, dialog } = require('electron');
const path = require('node:path');
const os = require('node:os');
const { exactVatsimFlight } = require('./vatsim-flight.cjs');
const { nearbyControllers, nearbyTraffic } = require('./vatsim-operations.cjs');
const { createDiagnosticsArchive } = require('./diagnostics-archive.cjs');
const { createAutoUpdater } = require('./auto-updater.cjs');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const { Readable } = require('node:stream');
const { randomUUID } = require('node:crypto');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const APP_TITLE = 'Shared Cockpit Flight Desk';
protocol.registerSchemesAsPrivileged([{ scheme: 'flightdesk-recording', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const APP_VERSION = app.getVersion();
const APP_DISPLAY_VERSION = APP_VERSION.includes('-alpha')
  ? `Alpha ${APP_VERSION.match(/^(\d+\.\d+)/)?.[1] || APP_VERSION.split('-')[0]}`
  : APP_VERSION;
const WINDOW_TITLE = `${APP_TITLE} — ${APP_DISPLAY_VERSION}`;
const USER_AGENT = `SharedCockpitFlightDesk/${APP_VERSION}`;
let mainWindow;
let efbView;
let startupSplash;
let appUpdater;
let vatsimCache = { expiresAt: 0, feed: null, transceivers: null };
let vatsimAtisCache = { expiresAt: 0, stations: null, available: false };
const airportCache = new Map();
let positionBridge;
let simPosition = { connected: false, updatedAt: 0 };
let chartfoxToken = '';
const cvrRecordings = new Map();
const MAX_CVR_CHUNK_BYTES = 1024 * 1024;
const MAX_CVR_RECORDING_BYTES = 1024 * 1024 * 1024;

function isMainFrame(event) { return !!mainWindow && event.sender === mainWindow.webContents && event.senderFrame === mainWindow.webContents.mainFrame; }
function recordingPath(id, extension = '.webm') {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid local recording ID.');
  return path.join(app.getPath('userData'), 'recordings', id + extension);
}
function cvrMetadata(value = {}) {
  const safe = item => String(item || '').replace(/[<>\u0000-\u001f]/g, '').slice(0, 160);
  return {
    sessionId: safe(value.sessionId), route: safe(value.route), callsign: safe(value.callsign),
    phase: safe(value.phase), startedAt: Number.isFinite(value.startedAt) ? value.startedAt : Date.now(),
    durationMs: Number.isFinite(value.durationMs) ? Math.max(0, value.durationMs) : 0,
    mimeType: ['audio/webm', 'audio/ogg', 'audio/mp4'].includes(value.mimeType) ? value.mimeType : 'audio/webm'
  };
}
async function saveCvrChunk(id, encoded) {
  const active = cvrRecordings.get(id);
  if (!active || typeof encoded !== 'string' || encoded.length > Math.ceil(MAX_CVR_CHUNK_BYTES * 4 / 3) + 8 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Error('Invalid local recording chunk.');
  const chunk = Buffer.from(encoded, 'base64');
  if (!chunk.length || chunk.length > MAX_CVR_CHUNK_BYTES || active.bytes + chunk.length > MAX_CVR_RECORDING_BYTES) throw new Error('The local recording exceeded its size limit.');
  await active.handle.write(chunk); active.bytes += chunk.length;
}

const chartfoxApi = 'https://api.chartfox.org/v2';

function chartfoxAuth() {
  if (!chartfoxToken) throw new Error('Add your ChartFox API token to search airports and charts.');
  return { authorization: `Bearer ${chartfoxToken}`, accept: 'application/json', 'user-agent': USER_AGENT };
}

async function fetchChartfox(pathname) {
  const response = await fetch(`${chartfoxApi}${pathname}`, {
    headers: chartfoxAuth(), signal: AbortSignal.timeout(15000)
  });
  if (response.status === 401) throw new Error('ChartFox rejected this API token. Check it and save it again.');
  if (response.status === 403) throw new Error('This ChartFox token does not have access to charts.');
  if (!response.ok) throw new Error(response.status === 404 ? 'ChartFox could not find that airport.' : `ChartFox request failed (${response.status}).`);
  return response.json();
}

function loadChartfoxToken() {
  try {
    const tokenPath = path.join(app.getPath('userData'), 'chartfox-token.enc');
    const encrypted = require('node:fs').readFileSync(tokenPath);
    if (safeStorage.isEncryptionAvailable()) chartfoxToken = safeStorage.decryptString(encrypted).trim();
  } catch { chartfoxToken = ''; }
}

async function saveChartfoxToken(token) {
  const value = String(token || '').trim();
  if (value.length > 4096) throw new Error('The ChartFox token is too long.');
  if (!value) {
    chartfoxToken = '';
    try { await fs.unlink(path.join(app.getPath('userData'), 'chartfox-token.enc')); } catch { }
    return { configured: false };
  }
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure credential storage is unavailable on this PC.');
  const encrypted = safeStorage.encryptString(value);
  await fs.writeFile(path.join(app.getPath('userData'), 'chartfox-token.enc'), encrypted);
  chartfoxToken = value;
  return { configured: true };
}

function openChartfox(ident, chartId) {
  const code = String(ident || '').trim().toUpperCase();
  const id = String(chartId || '').trim();
  const pathPart = /^[A-Z0-9]{3,5}$/.test(code) ? `/${code}` : '/';
  const hashPart = pathPart !== '/' && /^[A-Z0-9_-]{1,80}$/i.test(id) ? `#${code}_${id}` : '';
  return shell.openExternal(`https://chartfox.org${pathPart}${hashPart}`);
}

async function searchChartfoxAirports(query) {
  const value = String(query || '').trim().slice(0, 80);
  if (value.length < 2) throw new Error('Enter at least two letters to search for an airport.');
  return fetchChartfox(`/airports?query=${encodeURIComponent(value)}&page=1`);
}

async function getChartfoxAirportCharts(ident) {
  const code = String(ident || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,5}$/.test(code)) throw new Error('Choose a valid airport from the search results.');
  return fetchChartfox(`/airports/${encodeURIComponent(code)}/charts/grouped`);
}

async function fetchSimbrief(identity) {
  const pilot = String(identity || '').trim();
  if (!pilot || pilot.length > 80) throw new Error('Enter a SimBrief pilot ID or username.');
  const key = /^\d{1,7}$/.test(pilot) ? 'userid' : 'username';
  const url = `https://www.simbrief.com/api/xml.fetcher.php?${key}=${encodeURIComponent(pilot)}&json=v2`;
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(15000) });
  const body = await response.text();
  if (!response.ok) throw new Error('Could not fetch the flight plan. Check the ID or username and make sure a plan has been generated.');
  try { return JSON.parse(body); } catch { throw new Error('SimBrief returned an unrecognized response.'); }
}

async function fetchSimbriefPdf(plan) {
  const directory = plan?.files?.directory;
  const pdfLink = plan?.files?.pdf?.link;
  if (typeof directory !== 'string' || typeof pdfLink !== 'string' || !pdfLink) {
    throw new Error('This flight plan does not include a SimBrief PDF link.');
  }
  const base = new URL(directory.endsWith('/') ? directory : `${directory}/`, 'https://www.simbrief.com');
  const pdfUrl = new URL(pdfLink, base);
  if (pdfUrl.hostname !== 'www.simbrief.com' || !pdfUrl.pathname.startsWith('/ofp/flightplans/')) {
    throw new Error('The SimBrief PDF link is not valid.');
  }
  const response = await fetch(pdfUrl, { headers: { 'user-agent': USER_AGENT } });
  if (!response.ok || new URL(response.url).hostname !== 'www.simbrief.com') {
    throw new Error('Could not download the SimBrief PDF.');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 20 * 1024 * 1024) throw new Error('The SimBrief PDF is larger than the 20 MB limit.');
  if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('SimBrief did not return a valid PDF file.');
  }
  return { pdf: bytes.toString('base64'), fileName: path.basename(pdfUrl.pathname) };
}

async function getAirportInfo(icao, options = {}) {
  const code = String(icao || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) throw new Error('Enter a four-character ICAO code.');
  const headers = { 'user-agent': USER_AGENT };
  const includeMetar = options?.metar !== false;
  const includeTaf = options?.taf !== false;
  const includeAtc = options?.atc !== false;
  async function getJson(url) {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (response.status === 204) return [];
    if (!response.ok) throw new Error(`Aviation weather request failed (${response.status}).`);
    const value = await response.json();
    return Array.isArray(value) ? value : [value];
  }
  const root = 'https://aviationweather.gov/api/data/';
  let airport = airportCache.get(code);
  if (!airport) {
    const airports = await getJson(`${root}airport?ids=${code}&format=json`).catch(() => []);
    airport = airports[0] || null;
    if (airport) airportCache.set(code, airport);
  }
  const [reports, forecasts] = await Promise.all([
    includeMetar ? getJson(`${root}metar?ids=${code}&format=json`).catch(() => []) : [],
    includeTaf ? getJson(`${root}taf?ids=${code}&format=json`).catch(() => []) : []
  ]);
  const report = reports.sort((a, b) => Date.parse(b.reportTime || 0) - Date.parse(a.reportTime || 0))[0];
  const forecast = forecasts.sort((a, b) => Date.parse(b.issueTime || b.reportTime || 0) - Date.parse(a.issueTime || a.reportTime || 0))[0];
  let controllers = [];
  let atis = [];
  let atisAvailable = false;
  if (includeAtc) {
    if (Date.now() >= vatsimAtisCache.expiresAt || !Array.isArray(vatsimAtisCache.stations)) {
      try {
        const response = await fetch('https://data.vatsim.net/v3/afv-atis-data.json', { headers, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('VATSIM ATIS feed unavailable.');
        const stations = await response.json();
        if (!Array.isArray(stations)) throw new Error('Invalid VATSIM ATIS feed.');
        vatsimAtisCache = { expiresAt: Date.now() + 15_000, stations, available: true };
      } catch {
        vatsimAtisCache = { expiresAt: Date.now() + 15_000, stations: [], available: false };
      }
    }
    atisAvailable = vatsimAtisCache.available;
    const atisCode = code;
    atis = (vatsimAtisCache.stations || [])
      .filter(item => {
        const parts = String(item.callsign || '').toUpperCase().split('_');
        return parts[0] === atisCode && parts.includes('ATIS');
      })
      .sort((a, b) => Date.parse(b.last_updated || 0) - Date.parse(a.last_updated || 0))
      .map(item => ({ callsign: String(item.callsign || '').slice(0, 24), frequency: String(item.frequency || '').slice(0, 12), identifier: String(item.atis_code || '').slice(0, 4), text: (Array.isArray(item.text_atis) ? item.text_atis : []).map(line => String(line).slice(0, 240)).slice(0, 20), updatedAt: String(item.last_updated || '').slice(0, 40) }));
    try {
      if (Date.now() >= vatsimCache.expiresAt) {
        const feedResponse = await fetch('https://data.vatsim.net/v3/vatsim-data.json', { headers, signal: AbortSignal.timeout(10000) });
        if (!feedResponse.ok) throw new Error('VATSIM feed unavailable.');
        const feed = await feedResponse.json();
        let transceivers = [];
        try {
          const transceiverResponse = await fetch('https://data.vatsim.net/v3/transceivers-data.json', { headers, signal: AbortSignal.timeout(10000) });
          if (transceiverResponse.ok) transceivers = await transceiverResponse.json();
        } catch {}
        vatsimCache = { expiresAt: Date.now() + 15_000, feed, transceivers };
      }
      const radians = value => value * Math.PI / 180;
      const airportLat = Number(airport?.lat);
      const airportLon = Number(airport?.lon);
      const distanceNm = (lat, lon) => {
        const dLat = radians(lat - airportLat);
        const dLon = radians(lon - airportLon);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(airportLat)) * Math.cos(radians(lat)) * Math.sin(dLon / 2) ** 2;
        return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      const clients = new Map([...(vatsimCache.feed.controllers || []), ...(vatsimCache.feed.atis || [])].map(client => [client.callsign, client]));
      for (const station of vatsimCache.transceivers || []) {
        const client = clients.get(station.callsign);
        if (!client || !Number.isFinite(Number(airport?.lat)) || !Number.isFinite(Number(airport?.lon))) continue;
        for (const tx of station.transceivers || []) {
          if (!Number.isFinite(tx.latDeg) || !Number.isFinite(tx.lonDeg)) continue;
          const distance = distanceNm(tx.latDeg, tx.lonDeg);
          if (distance > 100) continue;
          const frequency = (Number(tx.frequency) / 1_000_000).toFixed(3);
          const clientFrequency = Number(client.frequency).toFixed(3);
          if (frequency !== clientFrequency) continue;
          controllers.push({ callsign: station.callsign, frequency: client.frequency, distance: Math.round(distance) });
        }
      }
      const nearestByFrequency = new Map();
      for (const item of controllers) {
        const key = `${item.callsign}|${item.frequency}`;
        const current = nearestByFrequency.get(key);
        if (!current || item.distance < current.distance) nearestByFrequency.set(key, item);
      }
        controllers = [...nearestByFrequency.values()].sort((a, b) => a.distance - b.distance);
    } catch {
      controllers = [];
    }
  }
  return {
    icao: code,
    name: airport?.name || report?.name || '',
    latitude: Number.isFinite(Number(airport?.lat)) ? Number(airport.lat) : null,
    longitude: Number.isFinite(Number(airport?.lon)) ? Number(airport.lon) : null,
    ...(includeMetar ? { metar: report?.rawOb || '', reportTime: report?.reportTime || '' } : {}),
    ...(includeTaf ? { taf: forecast?.rawOb || '', tafIssueTime: forecast?.issueTime || forecast?.reportTime || '' } : {}),
    ...(includeAtc ? { controllers, atis, atisAvailable } : {})
  };
}

async function getVatsimFlight(callsign) {
  const requested = String(callsign || '').trim().toUpperCase();
  if (!requested) return { found: false, checkedAt: Date.now() };
  if (Date.now() >= vatsimCache.expiresAt || !vatsimCache.feed) {
    const response = await fetch('https://data.vatsim.net/v3/vatsim-data.json', { headers: { 'user-agent': USER_AGENT } });
    if (!response.ok) throw new Error('VATSIM live data is unavailable (' + response.status + ').');
    vatsimCache = { ...vatsimCache, expiresAt: Date.now() + 15_000, feed: await response.json() };
  }
  return exactVatsimFlight(vatsimCache.feed.pilots || [], requested, simPosition.com1FrequencyMhz);
}

async function getVatsimOperations(fallbackPosition) {
  if (Date.now() >= vatsimCache.expiresAt || !vatsimCache.feed || !vatsimCache.transceivers) {
    const headers = { 'user-agent': USER_AGENT };
    const response = await fetch('https://data.vatsim.net/v3/vatsim-data.json', { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('VATSIM live data is unavailable (' + response.status + ').');
    const feed = await response.json();
    let transceivers = [];
    try {
      const radios = await fetch('https://data.vatsim.net/v3/transceivers-data.json', { headers, signal: AbortSignal.timeout(15000) });
      if (radios.ok) transceivers = await radios.json();
    } catch {}
    vatsimCache = { expiresAt: Date.now() + 15_000, feed, transceivers };
  }
  const livePosition = simPosition.connected && Date.now() - simPosition.updatedAt < 5000 ? simPosition : null;
  const fallback = fallbackPosition && Number.isFinite(Number(fallbackPosition.latitude)) && Number.isFinite(Number(fallbackPosition.longitude)) && Math.abs(Number(fallbackPosition.latitude)) <= 90 && Math.abs(Number(fallbackPosition.longitude)) <= 180
    ? { latitude: Number(fallbackPosition.latitude), longitude: Number(fallbackPosition.longitude) } : null;
  const position = livePosition || fallback;
  return {
    checkedAt: Date.now(), positionAvailable: !!position,
    activeCom1FrequencyMhz: livePosition?.com1FrequencyMhz || null,
    nearbyControllers: nearbyControllers([...(vatsimCache.feed.controllers || []), ...(vatsimCache.feed.atis || [])], vatsimCache.transceivers || [], position, 150),
    traffic: nearbyTraffic(vatsimCache.feed.pilots || [], position, 100, 120)
  };
}

function startPositionBridge() {
  const executable = app.isPackaged
    ? path.join(process.resourcesPath, 'simtracker', 'FlightPositionBridge.exe')
    : path.join(__dirname, '..', 'simtracker', 'publish', 'FlightPositionBridge.exe');
  try {
    positionBridge = spawn(executable, [], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let buffer = '';
    positionBridge.stdout.setEncoding('utf8');
    positionBridge.stdout.on('data', chunk => {
      buffer += chunk;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        try {
          const value = JSON.parse(line);
          simPosition = {
            connected: !!value.connected && Number.isFinite(value.latitude) && Number.isFinite(value.longitude),
            latitude: Number(value.latitude),
            longitude: Number(value.longitude),
            onGround: typeof value.onGround === 'boolean' ? value.onGround : null,
            groundSpeedKnots: Number.isFinite(value.groundSpeedKnots) ? value.groundSpeedKnots : null,
            verticalSpeedFeetPerMinute: Number.isFinite(value.verticalSpeedFeetPerMinute) ? value.verticalSpeedFeetPerMinute : null,
            headingDegrees: Number.isFinite(value.headingDegrees) ? value.headingDegrees : null,
            altitudeFeet: Number.isFinite(value.altitudeFeet) ? value.altitudeFeet : null,
            com1FrequencyMhz: Number.isFinite(value.com1FrequencyMhz) ? value.com1FrequencyMhz : null,
            engine1Combustion: typeof value.engine1Combustion === 'boolean' ? value.engine1Combustion : null,
            engine1N2Percent: Number.isFinite(value.engine1N2Percent) ? value.engine1N2Percent : null,
            engine2Combustion: typeof value.engine2Combustion === 'boolean' ? value.engine2Combustion : null,
            engine2N2Percent: Number.isFinite(value.engine2N2Percent) ? value.engine2N2Percent : null,
            beaconLightOn: typeof value.beaconLightOn === 'boolean' ? value.beaconLightOn : null,
            cockpit: sanitizeCockpit(value.cockpit),
            updatedAt: Date.now()
          };
        } catch { }
      }
    });
    positionBridge.on('error', () => { simPosition = { connected: false, updatedAt: Date.now() }; });
    positionBridge.on('close', () => { simPosition = { connected: false, updatedAt: Date.now() }; });
  } catch {
    simPosition = { connected: false, updatedAt: Date.now() };
  }
}

async function getFsuipcStatus() {
  const livePosition = simPosition.connected && Date.now() - simPosition.updatedAt < 5000;
  try {
    const command = "$p=Get-CimInstance Win32_Process -Filter \"Name='FSUIPC7.exe'\" | Select-Object -First 1 -ExpandProperty ExecutablePath; if($p){[Console]::Write($p)}";
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      timeout: 3500, windowsHide: true, maxBuffer: 1024 * 1024
    });
    const executable = stdout.trim();
    if (!executable) return { running: false, connected: livePosition, detail: livePosition ? 'Live simulator position is available.' : 'FSUIPC7 is not running.' };
    const logPath = path.join(path.dirname(executable), 'FSUIPC7.log');
    const stat = await fs.stat(logPath);
    const length = Math.min(stat.size, 1024 * 1024);
    const handle = await fs.open(logPath, 'r');
    let contents;
    try {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, stat.size - length);
      contents = buffer.toString('utf8');
    } finally {
      await handle.close();
    }
    const connectedAt = contents.lastIndexOf('SimConnect_Open succeeded');
    const markers = [
      contents.lastIndexOf('Trying to connect'),
      contents.lastIndexOf('SimConnect open event not received'),
      contents.lastIndexOf('SimConnect_Close'),
      contents.lastIndexOf('SimConnect connection lost')
    ];
    const disconnectedAt = Math.max(...markers);
    const connected = livePosition;
    return {
      running: true,
      connected,
      detail: connected ? 'A live position is being read from FSUIPC7.' : 'FSUIPC7 is running but no live simulator position is available.'
    };
  } catch {
    return { running: false, connected: livePosition, detail: livePosition ? 'Live simulator position is available.' : 'FSUIPC7 could not be detected.' };
  }
}

function createStartupSplash() {
  startupSplash = new BrowserWindow({
    width: 1000,
    height: 555,
    resizable: false,
    frame: false,
    show: false,
    backgroundColor: '#070b16',
    icon: path.join(__dirname, 'vendor', 'app-icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  startupSplash.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) startupSplash?.close();
    else startupSplash?.show();
  });
  startupSplash.on('closed', () => { startupSplash = null; });
  startupSplash.webContents.once('did-fail-load', () => startupSplash?.close());
  startupSplash.loadFile(path.join(__dirname, 'splash.html'));
}

function createWindow() {
  createStartupSplash();
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 920,
    minWidth: 920,
    minHeight: 640,
    title: WINDOW_TITLE,
    backgroundColor: '#000000',
    show: false,
    icon: path.join(__dirname, 'vendor', 'app-icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      // Keep phase and SimBrief polling running while flying with the desk minimized.
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  const appUserAgent = mainWindow.webContents.getUserAgent();
  mainWindow.webContents.setUserAgent(appUserAgent + ' SharedCockpitFlightDesk/' + app.getVersion());
  // Keep the native title tied to the installed build when the HTML title loads.
  efbView=new EfbView(mainWindow);
  mainWindow.on('page-title-updated', event => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    startupSplash?.close();
    startupSplash = null;
  });
  mainWindow.loadFile(path.join(__dirname, 'flightdesk.html'));
}

ipcMain.handle('efb-update', (event,input) => {
  if(!mainWindow||event.sender!==mainWindow.webContents||event.senderFrame!==mainWindow.webContents.mainFrame)throw new Error('Invalid EFB sender');
  return efbView.update(input,simPosition);
});
ipcMain.handle('get-app-info', () => ({
  name: APP_TITLE,
  version: APP_VERSION,
  displayVersion: APP_DISPLAY_VERSION
}));
ipcMain.handle('app-update-status', event => {
  if (!isMainFrame(event)) throw new Error('Invalid update status request.');
  return appUpdater?.getStatus() || { state: 'idle', version: APP_VERSION };
});
ipcMain.handle('app-update-check', event => {
  if (!isMainFrame(event)) throw new Error('Invalid update check request.');
  return appUpdater?.checkNow() || { state: 'unavailable', version: APP_VERSION };
});
ipcMain.handle('app-update-install', event => {
  if (!isMainFrame(event)) throw new Error('Invalid update install request.');
  return appUpdater?.install() || { state: 'unavailable', version: APP_VERSION };
});
ipcMain.handle('fetch-simbrief', async (_event, identity) => {
  try { return { ok: true, data: await fetchSimbrief(identity) }; }
  catch (error) { return { ok: false, error: error.message || 'Could not reach SimBrief. Please try again.' }; }
});
ipcMain.handle('fetch-simbrief-pdf', async (_event, plan) => {
  try { return { ok: true, ...(await fetchSimbriefPdf(plan)) }; }
  catch (error) { return { ok: false, error: error.message || 'Could not download the SimBrief PDF.' }; }
});
ipcMain.handle('get-airport-info', async (_event, icao, options) => {
  try { return { ok: true, data: await getAirportInfo(icao, options) }; }
  catch (error) { return { ok: false, error: error.message || 'Could not load airport information.' }; }
});
ipcMain.handle('get-vatsim-flight', async (_event, callsign) => {
  try {
    return { ok: true, data: await getVatsimFlight(callsign) };
  } catch (error) { return { ok: false, error: error.message || 'Could not match a VATSIM pilot.' }; }
});
ipcMain.handle('get-vatsim-operations', async (_event, position) => {
  try { return { ok: true, data: await getVatsimOperations(position) }; }
  catch (error) { return { ok: false, error: error.message || 'VATSIM traffic and controller data are unavailable.' }; }
});
ipcMain.handle('get-fsuipc-status', async () => getFsuipcStatus());
ipcMain.handle('clipboard-write', (_event, value) => { clipboard.writeText(String(value || '')); return true; });
ipcMain.handle('chartfox-token-status', () => ({ configured: !!chartfoxToken, secureStorage: safeStorage.isEncryptionAvailable() }));
ipcMain.handle('save-chartfox-token', async (_event, token) => {
  try { return { ok: true, data: await saveChartfoxToken(token) }; }
  catch (error) { return { ok: false, error: error.message || 'Could not save the ChartFox token securely.' }; }
});
ipcMain.handle('search-chartfox-airports', async (_event, query) => {
  try { return { ok: true, data: await searchChartfoxAirports(query) }; }
  catch (error) { return { ok: false, error: error.message || 'Could not search ChartFox airports.' }; }
});
ipcMain.handle('get-chartfox-airport-charts', async (_event, ident) => {
  try { return { ok: true, data: await getChartfoxAirportCharts(ident) }; }
  catch (error) { return { ok: false, error: error.message || 'Could not load this airport’s charts.' }; }
});
ipcMain.handle('open-chartfox', (_event, ident, chartId) => openChartfox(ident, chartId));

ipcMain.handle('cvr-begin', async (event, input = {}) => {
  if (!isMainFrame(event)) throw new Error('Invalid recording request.');
  const id = randomUUID(), metadata = cvrMetadata(input), extension = metadata.mimeType === 'audio/ogg' ? '.ogg' : metadata.mimeType === 'audio/mp4' ? '.m4a' : '.webm';
  const directory = path.dirname(recordingPath(id, extension));
  await fs.mkdir(directory, { recursive: true });
  const file = recordingPath(id, extension), handle = await fs.open(file, 'w');
  cvrRecordings.set(id, { handle, file, extension, bytes: 0, metadata });
  return { ok: true, id, url: `flightdesk-recording://local/${id}${extension}`, mimeType: metadata.mimeType };
});
ipcMain.handle('cvr-append', async (event, input = {}) => {
  if (!isMainFrame(event)) throw new Error('Invalid recording request.');
  try { await saveCvrChunk(input.id, input.data); return { ok: true }; }
  catch (error) { return { ok: false, error: error.message }; }
});
ipcMain.handle('cvr-end', async (event, input = {}) => {
  if (!isMainFrame(event)) throw new Error('Invalid recording request.');
  const active = cvrRecordings.get(input.id);
  if (!active) return { ok: false, error: 'This local recording is no longer active.' };
  cvrRecordings.delete(input.id);
  try {
    await active.handle.close();
    const metadata = { ...active.metadata, ...cvrMetadata(input), durationMs: Number.isFinite(input.durationMs) ? Math.max(0, input.durationMs) : 0, bytes: active.bytes };
    await fs.writeFile(active.file + '.json', JSON.stringify(metadata, null, 2), 'utf8');
    return { ok: true, id: input.id };
  } catch (error) { return { ok: false, error: error.message || 'Could not finish the local recording.' }; }
});
ipcMain.handle('cvr-list', async event => {
  if (!isMainFrame(event)) throw new Error('Invalid recording request.');
  const directory = path.join(app.getPath('userData'), 'recordings');
  try {
    const names = await fs.readdir(directory), results = [];
    for (const name of names.filter(item => /^[0-9a-f-]{36}\.(?:webm|ogg|m4a)$/i.test(item))) {
      const file = path.join(directory, name), stat = await fs.stat(file), id = name.slice(0, 36), extension = path.extname(name);
      let metadata = { startedAt: stat.birthtimeMs, durationMs: 0, route: '', callsign: '', phase: '', mimeType: extension === '.ogg' ? 'audio/ogg' : extension === '.m4a' ? 'audio/mp4' : 'audio/webm', interrupted: true };
      try { metadata = { ...metadata, ...JSON.parse(await fs.readFile(file + '.json', 'utf8')), interrupted: false }; } catch {}
      results.push({ id, url: `flightdesk-recording://local/${id}${extension}`, bytes: stat.size, ...metadata });
    }
    return { ok: true, recordings: results.sort((a, b) => b.startedAt - a.startedAt).slice(0, 100) };
  } catch (error) { return error.code === 'ENOENT' ? { ok: true, recordings: [] } : { ok: false, error: 'Could not read local cockpit recordings.' }; }
});
ipcMain.handle('export-diagnostics', async (event, payload = {}) => {
  if (!isMainFrame(event)) throw new Error('Invalid diagnostics request.');
  try {
    const serialized = JSON.stringify(payload);
    if (Buffer.byteLength(serialized, 'utf8') > 2 * 1024 * 1024) throw new Error('Diagnostics data exceeds the 2 MB limit.');
    const latestPosition = simPosition.connected && Date.now() - simPosition.updatedAt < 5000
      ? { latitude: simPosition.latitude, longitude: simPosition.longitude, altitudeFeet: simPosition.altitudeFeet, groundSpeedKnots: simPosition.groundSpeedKnots, verticalSpeedFeetPerMinute: simPosition.verticalSpeedFeetPerMinute, headingDegrees: simPosition.headingDegrees, com1FrequencyMhz: simPosition.com1FrequencyMhz, updatedAt: simPosition.updatedAt }
      : { connected: false, status: 'Simulator telemetry unavailable' };
    const archive = createDiagnosticsArchive({ ...payload, simulator: { ...(payload.simulator || {}), fsuipc7: await getFsuipcStatus(), telemetry: latestPosition } }, {
      application: APP_TITLE, version: APP_VERSION, electron: process.versions.electron, node: process.versions.node,
      platform: process.platform, operatingSystem: os.type(), release: os.release(), architecture: process.arch,
      generatedAt: new Date().toISOString()
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const save = await dialog.showSaveDialog(mainWindow, { defaultPath: path.join(app.getPath('downloads'), `FlightDesk-Diagnostics-${stamp}.zip`), filters: [{ name: 'ZIP archive', extensions: ['zip'] }] });
    if (save.canceled || !save.filePath) return { ok: true, canceled: true };
    await fs.writeFile(save.filePath, archive);
    return { ok: true, path: save.filePath };
  } catch (error) { return { ok: false, error: error.message || 'Could not create the diagnostics archive.' }; }
});

app.whenReady().then(() => {
  protocol.handle('flightdesk-recording', async request => {
    try {
      const url = new URL(request.url), match = url.host === 'local' && /^\/([0-9a-f-]{36}\.(?:webm|ogg|m4a))$/i.exec(url.pathname);
      if (!match) return new Response('Not found', { status: 404 });
      const file = recordingPath(match[1].slice(0, 36), path.extname(match[1])), stat = await fs.stat(file), range = request.headers.get('range');
      let start = 0, end = stat.size - 1, status = 200;
      if (range) {
        const bytes = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!bytes) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
        start = bytes[1] ? Number(bytes[1]) : Math.max(0, stat.size - Number(bytes[2] || 0));
        end = bytes[2] && bytes[1] ? Math.min(stat.size - 1, Number(bytes[2])) : end;
        if (start > end || start >= stat.size) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
        status = 206;
      }
      const extension = path.extname(file), mime = extension === '.ogg' ? 'audio/ogg' : extension === '.m4a' ? 'audio/mp4' : 'audio/webm';
      const headers = { 'Accept-Ranges': 'bytes', 'Content-Type': mime, 'Content-Length': String(end - start + 1), 'Cache-Control': 'no-store' };
      if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
      return new Response(Readable.toWeb(fsSync.createReadStream(file, { start, end })), { status, headers });
    } catch { return new Response('Not found', { status: 404 }); }
  });
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const audioOnly = permission === 'media' && Array.isArray(details?.mediaTypes)
      && details.mediaTypes.includes('audio') && !details.mediaTypes.includes('video');
    callback(webContents === mainWindow?.webContents && audioOnly);
  });
  loadChartfoxToken();
  createWindow();
  appUpdater = createAutoUpdater({
    app,
    onStatus: status => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('app-update-status', status);
    }
  });
  startPositionBridge();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  positionBridge?.kill();
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-sim-position', async () => ({ ...simPosition, connected: simPosition.connected && Date.now() - simPosition.updatedAt < 5000 }));
app.on('before-quit', () => positionBridge?.kill());
app.on('before-quit', () => { for (const active of cvrRecordings.values()) active.handle.close().catch(() => {}); cvrRecordings.clear(); });
