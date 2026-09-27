const labels=require('./aircraft-profiles/fenix-variables.json');
function sanitizeCockpit(value,now=Date.now()) {
  const values={};
  const valid=value?.available===true&&typeof value.aircraft==='string'&&/Fenix\s*A?3(19|20|21)|FNX[_ -]?3(19|20|21)/i.test(value.aircraft)&&Number.isFinite(value.sampledAt)&&now-value.sampledAt<=4000&&value.sampledAt<=now+1000;
  if(valid)for(const name of Object.keys(labels))if(Number.isFinite(value.values?.[name]))values[name]=value.values[name];
  return {available:!!valid,aircraft:String(value?.aircraft||'').slice(0,256),status:String(value?.status||'Fenix telemetry unavailable').slice(0,160),sampledAt:Number.isFinite(value?.sampledAt)?value.sampledAt:0,generation:Number.isFinite(value?.generation)?value.generation:0,recallPressedAt:valid&&Number.isFinite(value.recallPressedAt)?value.recallPressedAt:0,values};
}
module.exports={sanitizeCockpit};
