const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cockpitDesktop', {
  updateEfb: (options) => ipcRenderer.invoke('efb-update', options),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  fetchSimbrief: (identity) => ipcRenderer.invoke('fetch-simbrief', identity),
  fetchSimbriefPdf: (plan) => ipcRenderer.invoke('fetch-simbrief-pdf', plan),
  getAirportInfo: (icao, options) => ipcRenderer.invoke('get-airport-info', icao, options),
  getVatsimFlight: (callsign) => ipcRenderer.invoke('get-vatsim-flight', callsign),
  getFsuipcStatus: () => ipcRenderer.invoke('get-fsuipc-status'),
  getChartfoxTokenStatus: () => ipcRenderer.invoke('chartfox-token-status'),
  saveChartfoxToken: (token) => ipcRenderer.invoke('save-chartfox-token', token),
  searchChartfoxAirports: (query) => ipcRenderer.invoke('search-chartfox-airports', query),
  getChartfoxAirportCharts: (ident) => ipcRenderer.invoke('get-chartfox-airport-charts', ident),
  openChartfox: (ident, chartId) => ipcRenderer.invoke('open-chartfox', ident, chartId),
  getSimPosition: () => ipcRenderer.invoke('get-sim-position'),
  copyText: (text) => ipcRenderer.invoke('clipboard-write', text)
});
