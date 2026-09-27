const {sanitizeCockpit}=require('./cockpit-telemetry.cjs');
const {EfbView}=require('./efb.cjs');
const { app, BrowserWindow, Menu, ipcMain, clipboard, safeStorage, shell } = require('electron');
const path = require('node:path');
const { exactVatsimFlight } = require('./vatsim-flight.cjs');
const fs = require('node:fs/promises');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const APP_TITLE = 'Shared Cockpit Flight Desk';
const APP_VERSION = app.getVersion();
const APP_DISPLAY_VERSION = APP_VERSION.includes('-alpha')
  ? `Alpha ${APP_VERSION.match(/^(\d+\.\d+)/)?.[1] || APP_VERSION.split('-')[0]}`
  : APP_VERSION;
const WINDOW_TITLE = `${APP_TITLE} — ${APP_DISPLAY_VERSION}`;
const USER_AGENT = `SharedCockpitFlightDesk/${APP_VERSION}`;
let mainWindow;
let efbView;
let startupSplash;
let vatsimCache = { expiresAt: 0, feed: null, transceivers: null };
const airportCache = new Map();
let positionBridge;
let simPosition = { connected: false, updatedAt: 0 };
let chartfoxToken = '';

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
    const response = await fetch(url, { headers });
    if (response.status === 204) return [];
    if (!response.ok) throw new Error(`Aviation weather request failed (${response.status}).`);
    const value = await response.json();
    return Array.isArray(value) ? value : [value];
  }
  const root = 'https://aviationweather.gov/api/data/';
  let airport = airportCache.get(code);
  if (!airport) {
    const airports = await getJson(`${root}airport?ids=${code}&format=json`);
    airport = airports[0] || null;
    if (airport) airportCache.set(code, airport);
  }
  const [reports, forecasts] = await Promise.all([
    includeMetar ? getJson(`${root}metar?ids=${code}&format=json`) : [],
    includeTaf ? getJson(`${root}taf?ids=${code}&format=json`).catch(() => []) : []
  ]);
  const report = reports.sort((a, b) => Date.parse(b.reportTime || 0) - Date.parse(a.reportTime || 0))[0];
  const forecast = forecasts.sort((a, b) => Date.parse(b.issueTime || b.reportTime || 0) - Date.parse(a.issueTime || a.reportTime || 0))[0];
  let controllers = [];
  if (includeAtc && Number.isFinite(Number(airport?.lat)) && Number.isFinite(Number(airport?.lon))) {
    try {
      if (Date.now() >= vatsimCache.expiresAt) {
        const [feedResponse, transceiverResponse] = await Promise.all([
          fetch('https://data.vatsim.net/v3/vatsim-data.json', { headers }),
          fetch('https://data.vatsim.net/v3/transceivers-data.json', { headers })
        ]);
        if (!feedResponse.ok || !transceiverResponse.ok) throw new Error('VATSIM feed unavailable.');
        const [feed, transceivers] = await Promise.all([feedResponse.json(), transceiverResponse.json()]);
        vatsimCache = { expiresAt: Date.now() + 15_000, feed, transceivers };
      }
      const radians = value => value * Math.PI / 180;
      const airportLat = Number(airport.lat);
      const airportLon = Number(airport.lon);
      const distanceNm = (lat, lon) => {
        const dLat = radians(lat - airportLat);
        const dLon = radians(lon - airportLon);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(airportLat)) * Math.cos(radians(lat)) * Math.sin(dLon / 2) ** 2;
        return 3440.065 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      const clients = new Map([...(vatsimCache.feed.controllers || []), ...(vatsimCache.feed.atis || [])].map(client => [client.callsign, client]));
      for (const station of vatsimCache.transceivers || []) {
        const client = clients.get(station.callsign);
        if (!client) continue;
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
    ...(includeAtc ? { controllers } : {})
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
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
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

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  loadChartfoxToken();
  createWindow();
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
