// Deterministic renderer fixtures; no simulator, network or saved user session.
window.setInterval = () => 0;
window.cockpitDesktop = {
  fetchSimbrief: async () => ({ok:true,data:{times:{sched_out:String(Math.floor(Date.now()/1000)+1800)},origin:{icao_code:'ENGM'},destination:{icao_code:'EGLL'},aircraft:{icaocode:'A320'},general:{callsign:'AUTO123'}}}),
  updateEfb: async options => {window.lastEfbOptions=options;return {provider:options.provider==='auto'?'fenix':options.provider,aircraft:'FenixA320 IAE WF',status:'EFB connected'}},
  fetchSimbriefPdf: async () => ({ok:true,pdf:require('./fixture-pdf.cjs')()}),
  getAppInfo: async () => ({displayVersion:'UI regression check',version:'test'}),
  getFsuipcStatus: async () => ({running:true}),
  getSimPosition: async () => ({connected:false}),
  getAirportInfo: async code => ({ok:true,data:{name:code==='ENGM'?'Oslo Gardermoen':'London Heathrow',latitude:code==='ENGM'?60.2:51.47,longitude:code==='ENGM'?11.1:-0.46,metar:'METAR '+code+' 251200Z 18005KT CAVOK 15/08 Q1013',controllers:[{callsign:code+'_TWR',frequency:'118.100',distance:2}]}}),
  getVatsimFlight: async () => ({ok:true,data:{found:false,checkedAt:Date.now()}}),
  getVatsimOperations: async () => ({ok:true,data:{checkedAt:Date.now(),positionAvailable:true,activeCom1FrequencyMhz:118.7,nearbyControllers:[{callsign:'ENGM_TWR',frequency:'118.700',type:'Tower',online:true,distanceNm:4,bearingDegrees:15,relativeLocation:'N',latitude:60.25,longitude:11.1}],traffic:[{callsign:'SAS123',aircraftType:'A320',latitude:60.4,longitude:11.1,altitudeFeet:12000,groundSpeedKnots:240,headingDegrees:180,distanceNm:24,bearingDegrees:0,relativeLocation:'N',departure:'ENGM',arrival:'EKCH',route:'DCT TEST'}]}}),
  getChartfoxTokenStatus: async () => ({configured:false,secureStorage:true}),
  beginCvrRecording: async () => ({ok:true,id:'00000000-0000-4000-8000-000000000001',url:'flightdesk-recording://local/00000000-0000-4000-8000-000000000001.webm',mimeType:'audio/webm'}),
  appendCvrRecording: async () => ({ok:true}),
  endCvrRecording: async () => ({ok:true}),
  listCvrRecordings: async () => ({ok:true,recordings:[]}),
  exportDiagnostics: async () => ({ok:true,canceled:false,path:'C:/Temp/diagnostics.zip'})
};
