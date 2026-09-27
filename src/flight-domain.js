(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FlightDeskDomain=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  const legacyTypes={
    crewLog:'crew.activity',
    activity:'crew.action',
    markers:'flight.milestone'
  };
  function cleanEvent(event,fallbackType='crew.action'){
    if(!event||typeof event!=='object'||typeof event.id!=='string'||typeof event.text!=='string')return null;
    const type=String(event.type||fallbackType).slice(0,60);
    return{
      id:event.id.slice(0,120),
      at:Number.isFinite(event.at)?event.at:Date.now(),
      type,
      text:event.text.slice(0,240),
      by:String(event.by||'Crew').slice(0,40),
      role:['PF','PM'].includes(event.role)?event.role:'',
      source:String(event.source||'').slice(0,60),
      phaseId:String(event.phaseId||'').slice(0,80),
      position:event.position&&Number.isFinite(event.position.latitude)&&Number.isFinite(event.position.longitude)
        ?{latitude:event.position.latitude,longitude:event.position.longitude}:null
    };
  }
  function mergeEvents(...lists){
    const merged=new Map();
    for(const event of lists.flat()){
      const cleaned=cleanEvent(event);
      if(cleaned)merged.set(cleaned.id,{...merged.get(cleaned.id),...cleaned});
    }
    return [...merged.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-500);
  }
  function eventsFromOps(ops={}){
    const legacy=[];
    for(const [key,type] of Object.entries(legacyTypes))for(const item of Array.isArray(ops[key])?ops[key]:[]){
      const inferred=key==='crewLog'&&/joined the flight/i.test(item?.text||'')?'crew.joined':
        key==='crewLog'&&/changed role/i.test(item?.text||'')?'crew.role-changed':
        key==='markers'&&/pushback/i.test(item?.text||'')?'flight.pushback':
        key==='markers'&&/taxi out/i.test(item?.text||'')?'flight.taxi-out':
        key==='markers'&&/takeoff/i.test(item?.text||'')?'flight.takeoff':
        key==='markers'&&/landing/i.test(item?.text||'')?'flight.landing':
        key==='markers'&&/parked/i.test(item?.text||'')?'flight.parked':type;
      legacy.push({...item,type:inferred});
    }
    return mergeEvents(Array.isArray(ops.events)?ops.events:[],legacy);
  }
  function timing(events,now=Date.now()){
    const ordered=mergeEvents(events),first=type=>ordered.find(event=>event.type===type),last=type=>ordered.filter(event=>event.type===type).at(-1);
    const blockStart=first('flight.pushback')||first('flight.taxi-out');
    const takeoff=first('flight.takeoff'),landing=first('flight.landing'),parked=last('flight.parked');
    const blockEnd=parked&&blockStart&&parked.at>=blockStart.at?parked:null;
    const finish=event=>event?.at??now;
    return{
      blockStartAt:blockStart?.at??null,
      takeoffAt:takeoff?.at??null,
      landingAt:landing?.at??null,
      blockEndAt:blockEnd?.at??null,
      blockMs:blockStart?Math.max(0,finish(blockEnd)-blockStart.at):null,
      taxiOutMs:blockStart?Math.max(0,finish(takeoff)-blockStart.at):null,
      airborneMs:takeoff?Math.max(0,finish(landing&&landing.at>=takeoff.at?landing:null)-takeoff.at):null,
      taxiInMs:landing?Math.max(0,finish(blockEnd)-landing.at):null,
      completed:!!blockEnd&&!!takeoff&&!!landing&&landing.at>=takeoff.at
    };
  }
  function formatDuration(milliseconds){
    if(!Number.isFinite(milliseconds)||milliseconds<0)return'—';
    const minutes=Math.floor(milliseconds/60000),hours=Math.floor(minutes/60),rest=minutes%60;
    return String(hours).padStart(2,'0')+':'+String(rest).padStart(2,'0');
  }
  return{cleanEvent,mergeEvents,eventsFromOps,timing,formatDuration};
});
