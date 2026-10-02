const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cockpitDesktop', {
  updateEfb: (options) => ipcRenderer.invoke('efb-update', options),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getAppUpdateStatus: () => ipcRenderer.invoke('app-update-status'),
  checkForAppUpdates: () => ipcRenderer.invoke('app-update-check'),
  installAppUpdate: () => ipcRenderer.invoke('app-update-install'),
  onAppUpdateStatus: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('app-update-status', listener);
    return () => ipcRenderer.removeListener('app-update-status', listener);
  },
  fetchSimbrief: (identity) => ipcRenderer.invoke('fetch-simbrief', identity),
  fetchSimbriefPdf: (plan) => ipcRenderer.invoke('fetch-simbrief-pdf', plan),
  getAirportInfo: (icao, options) => ipcRenderer.invoke('get-airport-info', icao, options),
  getVatsimFlight: (callsign) => ipcRenderer.invoke('get-vatsim-flight', callsign),
  getVatsimOperations: (position) => ipcRenderer.invoke('get-vatsim-operations', position),
  getFsuipcStatus: () => ipcRenderer.invoke('get-fsuipc-status'),
  getChartfoxTokenStatus: () => ipcRenderer.invoke('chartfox-token-status'),
  saveChartfoxToken: (token) => ipcRenderer.invoke('save-chartfox-token', token),
  searchChartfoxAirports: (query) => ipcRenderer.invoke('search-chartfox-airports', query),
  getChartfoxAirportCharts: (ident) => ipcRenderer.invoke('get-chartfox-airport-charts', ident),
  openChartfox: (ident, chartId) => ipcRenderer.invoke('open-chartfox', ident, chartId),
  getSimPosition: () => ipcRenderer.invoke('get-sim-position'),
  beginCvrRecording: (metadata) => ipcRenderer.invoke('cvr-begin', metadata),
  appendCvrRecording: (chunk) => ipcRenderer.invoke('cvr-append', chunk),
  endCvrRecording: (metadata) => ipcRenderer.invoke('cvr-end', metadata),
  listCvrRecordings: () => ipcRenderer.invoke('cvr-list'),
  exportDiagnostics: (payload) => ipcRenderer.invoke('export-diagnostics', payload),
  copyText: (text) => ipcRenderer.invoke('clipboard-write', text)
});
