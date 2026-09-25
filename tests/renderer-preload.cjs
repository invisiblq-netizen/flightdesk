// Deterministic renderer fixtures; no simulator, network or saved user session.
window.setInterval = () => 0;
window.cockpitDesktop = {
  fetchSimbriefPdf: async () => ({ok:true,pdf:require('./fixture-pdf.cjs')()}),
  getAppInfo: async () => ({displayVersion:'UI regression check',version:'test'}),
  getFsuipcStatus: async () => ({running:true}),
  getSimPosition: async () => ({connected:false}),
  getAirportInfo: async code => ({ok:true,data:{name:code==='ENGM'?'Oslo Gardermoen':'London Heathrow',latitude:code==='ENGM'?60.2:51.47,longitude:code==='ENGM'?11.1:-0.46,metar:'METAR '+code+' 251200Z 18005KT CAVOK 15/08 Q1013',controllers:[{callsign:code+'_TWR',frequency:'118.100',distance:2}]}}),
  getVatsimFlight: async () => ({ok:true,data:{found:false,checkedAt:Date.now()}})
};
