const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cockpitDesktop', {
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  fetchSimbrief: (identity) => ipcRenderer.invoke('fetch-simbrief', identity),
  fetchSimbriefPdf: (plan) => ipcRenderer.invoke('fetch-simbrief-pdf', plan),
  getAirportInfo: (icao, options) => ipcRenderer.invoke('get-airport-info', icao, options),
  getFsuipcStatus: () => ipcRenderer.invoke('get-fsuipc-status'),
  getSimPosition: () => ipcRenderer.invoke('get-sim-position'),
  copyText: (text) => ipcRenderer.invoke('clipboard-write', text)
});
