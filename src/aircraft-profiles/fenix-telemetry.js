/* Explicit Fenix state predicates; never infer completion by matching user text. */
(function(root){
  const eq=(...pairs)=>values=>pairs.every(([key,value])=>Number.isFinite(values[key])&&values[key]===value);
  const rules={};
  function rule(ids,label,expected,matches){for(const id of ids)rules[id]={label,expected,matches};}
  rule(['safe-state-pm-engine-master-1-2-1'],'Engine masters','both OFF',eq(['S_ENG_MASTER_1',0],['S_ENG_MASTER_2',0]));
  rule(['safe-state-pm-engine-mode-selector-2'],'Engine mode','NORM',eq(['S_ENG_MODE',1]));
  rule(['safe-state-pm-radar-3'],'Radar','OFF',eq(['S_WR_SYS',1]));
  rule(['safe-state-pm-windshear-pws-4'],'Predictive windshear','OFF',eq(['S_WR_PRED_WS',0]));
  rule(['safe-state-pm-landing-gear-lever-7'],'Gear lever','DOWN',eq(['S_MIP_GEAR',1]));
  rule(['safe-state-pm-wipers-8'],'Wipers','both OFF',eq(['S_MISC_WIPER_CAPT',0],['S_MISC_WIPER_FO',0]));
  rule(['battery-external-power-pf-external-power-2'],'External power','ON',values=>eq(['I_OH_ELEC_EXT_PWR_L',1])(values)&&[0,1].includes(values.S_OH_IN_LT_ANN_LT));
  rule(['before-start-flow-pf-parking-brake-1','before-start-checklist-pm-parking-brake-1','parking-pf-parking-brake-2'],'Parking brake','SET',eq(['S_MIP_PARKING_BRAKE',1]));
  rule(['pushback-pf-parking-brake-2','taxi-flow-pf-parking-brake-1'],'Parking brake','RELEASED',eq(['S_MIP_PARKING_BRAKE',0]));
  rule(['before-start-flow-pf-beacon-3','before-start-checklist-pm-beacon-2'],'Beacon','ON',eq(['S_OH_EXT_LT_BEACON',1]));
  rules['ecam-logbook-pf-ecam-rcl-pushbutton-1']={label:'ECAM recall',expected:'pressed during this phase',event:true};
  function valid(cockpit,now=Date.now()){
    return cockpit?.available===true&&/Fenix\s*A?3(19|20|21)|FNX[_ -]?3(19|20|21)/i.test(cockpit.aircraft||'')&&Number.isFinite(cockpit.sampledAt)&&now-cockpit.sampledAt>=-1000&&now-cockpit.sampledAt<=4000&&cockpit.values&&typeof cockpit.values==='object';
  }
  function sanitize(value,now=Date.now()){
    const values={};if(valid(value,now))for(const [key,number] of Object.entries(value.values).slice(0,64))if(/^[A-Z][A-Z0-9_]{1,79}$/.test(key)&&Number.isFinite(number))values[key]=number;
    return {available:!!valid(value,now),aircraft:String(value?.aircraft||'').slice(0,256),status:String(value?.status||'Waiting for Fenix cockpit data').slice(0,160),sampledAt:Number.isFinite(value?.sampledAt)?value.sampledAt:0,generation:Number.isFinite(value?.generation)?value.generation:0,recallPressedAt:Number.isFinite(value?.recallPressedAt)?value.recallPressedAt:0,values};
  }
  function createTracker(){
    let scope='',enteredAt=0;const candidates=new Map(),overrides=new Set();
    return {
      reset(){scope='';enteredAt=0;candidates.clear();overrides.clear();},
      suppress(id){overrides.add(id);candidates.delete(id);},
      update({cockpit,phase,role,unlocked,sessionKey,now=Date.now()}){
        if(!valid(cockpit,now)||!phase||!unlocked||!['PF','PM'].includes(role)){candidates.clear();return [];}
        const next=[sessionKey,phase.id,role,cockpit.aircraft,cockpit.generation].join(':');
        if(scope!==next){scope=next;enteredAt=now;candidates.clear();overrides.clear();}
        const completed=[];
        for(const section of phase.sections||[])for(const item of section.flows?.[role]||[]){
          const rule=rules[item.id];if(!rule||item.custom)continue;
          const matches=rule.event?Number.isFinite(cockpit.recallPressedAt)&&cockpit.recallPressedAt>=enteredAt&&cockpit.recallPressedAt<=now&&now-cockpit.recallPressedAt<=4000:rule.matches(cockpit.values);
          if(!matches){candidates.delete(item.id);overrides.delete(item.id);continue;}
          if(item.done||overrides.has(item.id))continue;
          if(rule.event){completed.push(item);overrides.add(item.id);continue;}
          let candidate=candidates.get(item.id);
          if(!candidate||cockpit.sampledAt<candidate.last||cockpit.sampledAt-candidate.last>4000){candidate={since:cockpit.sampledAt,last:cockpit.sampledAt};candidates.set(item.id,candidate);continue;}
          if(cockpit.sampledAt===candidate.last)continue;
          candidate.last=cockpit.sampledAt;
          if(cockpit.sampledAt-candidate.since>=1500)completed.push(item);
        }
        return completed;
      }
    };
  }
  const api={rules,valid,sanitize,createTracker};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FlightDeskFenixTelemetry=api;
})(globalThis);
