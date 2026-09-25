const { app, BrowserWindow, Menu, ipcMain, dialog, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const APP_TITLE = 'Shared Cockpit Flight Desk';
const APP_VERSION = app.getVersion();
const APP_DISPLAY_VERSION = APP_VERSION.includes('-alpha')
  ? `Alpha ${APP_VERSION.split('-')[0]}`
  : APP_VERSION;
const WINDOW_TITLE = `${APP_TITLE} — ${APP_DISPLAY_VERSION}`;
const USER_AGENT = `SharedCockpitFlightDesk/${APP_VERSION}`;
let mainWindow;
let vatsimCache = { expiresAt: 0, feed: null, transceivers: null };
const airportCache = new Map();
let positionBridge;
let simPosition = { connected: false, updatedAt: 0 };

async function fetchSimbrief(identity) {
  const pilot = String(identity || '').trim();
  if (!pilot || pilot.length > 80) throw new Error('Enter a SimBrief pilot ID or username.');
  const key = /^\d{1,7}$/.test(pilot) ? 'userid' : 'username';
  const url = `https://www.simbrief.com/api/xml.fetcher.php?${key}=${encodeURIComponent(pilot)}&json=v2`;
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
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
  const reports = includeMetar ? await getJson(`${root}metar?ids=${code}&format=json`) : [];
  const report = reports.sort((a, b) => Date.parse(b.reportTime || 0) - Date.parse(a.reportTime || 0))[0];
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
        vatsimCache = { expiresAt: Date.now() + 5 * 60_000, feed, transceivers };
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
    ...(includeAtc ? { controllers } : {})
  };
}

async function getRouteAtc(originCode, destinationCode) {
  const codes = [originCode, destinationCode].map(value => String(value || '').trim().toUpperCase());
  if (codes.some(code => !/^[A-Z0-9]{4}$/.test(code))) throw new Error('Import a flight plan with valid origin and destination ICAO codes.');
  async function airport(code) {
    let value = airportCache.get(code);
    if (!value) {
      const response = await fetch(`https://aviationweather.gov/api/data/airport?ids=${code}&format=json`, { headers: { 'user-agent': USER_AGENT } });
      if (!response.ok) throw new Error(`Could not load airport coordinates (${response.status}).`);
      value = (await response.json())[0];
      if (value) airportCache.set(code, value);
    }
    if (!Number.isFinite(Number(value?.lat)) || !Number.isFinite(Number(value?.lon))) throw new Error(`Coordinates unavailable for ${code}.`);
    return { latitude: Number(value.lat), longitude: Number(value.lon) };
  }
  const [start, end] = await Promise.all(codes.map(airport));
  if (Date.now() >= vatsimCache.expiresAt || !vatsimCache.feed || !vatsimCache.transceivers) {
    const [feedResponse, transceiverResponse] = await Promise.all([
      fetch('https://data.vatsim.net/v3/vatsim-data.json', { headers: { 'user-agent': USER_AGENT } }),
      fetch('https://data.vatsim.net/v3/transceivers-data.json', { headers: { 'user-agent': USER_AGENT } })
    ]);
    if (!feedResponse.ok || !transceiverResponse.ok) throw new Error('VATSIM route data is unavailable.');
    const [feed, transceivers] = await Promise.all([feedResponse.json(), transceiverResponse.json()]);
    vatsimCache = { expiresAt: Date.now() + 5 * 60_000, feed, transceivers };
  }
  const radians = value => value * Math.PI / 180;
  const distanceNm = (a, b) => {
    const dLat = radians(b.latitude - a.latitude), dLon = radians(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
    return 3440.065 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };
  const a = { latitude: radians(start.latitude), longitude: radians(start.longitude) };
  const b = { latitude: radians(end.latitude), longitude: radians(end.longitude) };
  const omega = Math.acos(Math.max(-1, Math.min(1, Math.sin(a.latitude) * Math.sin(b.latitude) + Math.cos(a.latitude) * Math.cos(b.latitude) * Math.cos(b.longitude - a.longitude))));
  const route = Array.from({ length: 101 }, (_, index) => {
    const fraction = index / 100;
    if (omega < 1e-8) return { latitude: start.latitude, longitude: start.longitude, fraction };
    const scaleA = Math.sin((1 - fraction) * omega) / Math.sin(omega), scaleB = Math.sin(fraction * omega) / Math.sin(omega);
    const x = scaleA * Math.cos(a.latitude) * Math.cos(a.longitude) + scaleB * Math.cos(b.latitude) * Math.cos(b.longitude);
    const y = scaleA * Math.cos(a.latitude) * Math.sin(a.longitude) + scaleB * Math.cos(b.latitude) * Math.sin(b.longitude);
    const z = scaleA * Math.sin(a.latitude) + scaleB * Math.sin(b.latitude);
    return { latitude: Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI, longitude: Math.atan2(y, x) * 180 / Math.PI, fraction };
  });
  const clients = new Map([...(vatsimCache.feed.controllers || []), ...(vatsimCache.feed.atis || [])].map(client => [client.callsign, client]));
  const stations = new Map();
  for (const station of vatsimCache.transceivers || []) {
    const client = clients.get(station.callsign);
    if (!client) continue;
    for (const tx of station.transceivers || []) {
      if (!Number.isFinite(tx.latDeg) || !Number.isFinite(tx.lonDeg)) continue;
      const point = { latitude: tx.latDeg, longitude: tx.lonDeg };
      let nearest = { distance: Infinity, fraction: 0 };
      for (const sample of route) { const distance = distanceNm(point, sample); if (distance < nearest.distance) nearest = { distance, fraction: sample.fraction }; }
      if (nearest.distance > 100 || (Number(tx.frequency) / 1_000_000).toFixed(3) !== Number(client.frequency).toFixed(3)) continue;
      const section = nearest.fraction < .15 ? 'Departure' : nearest.fraction > .85 ? 'Arrival' : 'Enroute';
      const item = { callsign: station.callsign, frequency: Number(client.frequency).toFixed(3), distanceNm: Math.round(nearest.distance), routePercent: Math.round(nearest.fraction * 100), section };
      const key = `${item.callsign}|${item.frequency}`;
      if (!stations.has(key) || item.distanceNm < stations.get(key).distanceNm) stations.set(key, item);
    }
  }
  return { origin: codes[0], destination: codes[1], stations: [...stations.values()].sort((left, right) => left.routePercent - right.routePercent || left.distanceNm - right.distanceNm) };
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

function buildMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'New lobby', click: () => mainWindow?.webContents.executeJavaScript("document.querySelector('#pairAgain')?.click()") },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Ctrl+R', click: () => mainWindow?.webContents.reload() },
        { role: 'togglefullscreen', label: 'Full screen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About', click: () => dialog.showMessageBox(mainWindow, { type: 'info', title: WINDOW_TITLE, message: WINDOW_TITLE, detail: `Build ${APP_VERSION}\n\nA local Windows app that uses PeerJS Cloud to introduce lobby participants. Notes and flight-plan data travel directly between connected PCs over WebRTC. Internet access is also used for SimBrief, airport weather and VATSIM data. Uses the FSUIPC Client DLL for .NET by Paul Henty.` }) }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 920,
    minWidth: 920,
    minHeight: 640,
    title: WINDOW_TITLE,
    backgroundColor: '#0a111a',
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
  mainWindow.on('page-title-updated', event => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadFile(path.join(__dirname, 'flightdesk.html'));
}

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
ipcMain.handle('get-route-atc', async (_event, origin, destination) => {
  try { return { ok: true, data: await getRouteAtc(origin, destination) }; }
  catch (error) { return { ok: false, error: error.message || 'Could not load ATC along the route.' }; }
});
ipcMain.handle('get-fsuipc-status', async () => getFsuipcStatus());
ipcMain.handle('clipboard-write', (_event, value) => { clipboard.writeText(String(value || '')); return true; });

app.whenReady().then(() => {
  buildMenu();
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
