(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FlightDeskVoiceGamepad=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  const STANDARD_BUTTONS=['A','B','X','Y','LB','RB','LT','RT','View','Menu','Left stick','Right stick','D-pad up','D-pad down','D-pad left','D-pad right','Guide'];
  function buttonLabel(mapping,index){
    if(!Number.isInteger(index)||index<0)return'';
    return mapping==='standard'&&STANDARD_BUTTONS[index]?STANDARD_BUTTONS[index]:`Button ${index+1}`;
  }
  function normalizeBinding(value){
    if(!value||!Number.isInteger(value.buttonIndex)||value.buttonIndex<0)return null;
    const id=typeof value.id==='string'?value.id.slice(0,160):'';
    const index=Number.isInteger(value.index)&&value.index>=0?value.index:-1;
    if(!id&&index<0)return null;
    return{id,index,buttonIndex:value.buttonIndex,mapping:value.mapping==='standard'?'standard':''};
  }
  function isPressed(button){return!!button?.pressed||Number(button?.value)>0.55}
  function create({
    getGamepads,
    isActive=()=>true,onBinding=()=>{},onHeld=()=>{},onState=()=>{},
    setIntervalFn=setInterval,clearIntervalFn=clearInterval,pollIntervalMs=40
  }={}){
    if(typeof getGamepads!=='function')getGamepads=typeof navigator==='object'&&typeof navigator.getGamepads==='function'?()=>navigator.getGamepads():null;
    const supported=typeof getGamepads==='function';
    let binding=null,capturing=false,captureArmed=false,holdArmed=true,held=false,timer=null,state={supported,capturing:false,captureArmed:false,holdArmed:true,held:false,binding:null,connected:false,gamepadLabel:'',buttonLabel:''};
    function pads(){try{return Array.from(getGamepads?.()||[]).filter(Boolean)}catch{return[]}}
    function matchingPad(items){if(!binding)return null;if(binding.id){const sameId=items.filter(pad=>String(pad.id||'')===binding.id);return sameId.find(pad=>Number(pad.index)===binding.index)||sameId[0]||null}return items.find(pad=>Number(pad.index)===binding.index)||null}
    function emit(items,pad=matchingPad(items)){
      state={supported,capturing,captureArmed,holdArmed,held,binding:binding?{...binding}:null,connected:!!pad,gamepadLabel:pad?(String(pad.id||'').trim()||`Gamepad ${(pad.index||0)+1}`):binding?(binding.id||`Gamepad ${binding.index+1}`):'',buttonLabel:binding?buttonLabel(binding.mapping,binding.buttonIndex):''};
      onState(state);
    }
    function setHeld(value){const next=!!value;if(next===held)return;held=next;onHeld(held)}
    function stopPolling(){if(timer!==null){clearIntervalFn(timer);timer=null}}
    function ensurePolling(){if(supported&&timer===null)timer=setIntervalFn(poll,Math.max(20,Number(pollIntervalMs)||40))}
    function poll(){
      if(!supported){emit([]);return}
      const items=pads(),pressed=[];
      for(const pad of items)for(let index=0;index<(pad.buttons?.length||0);index++)if(isPressed(pad.buttons[index]))pressed.push({pad,index});
      if(capturing){
        if(!pressed.length)captureArmed=true;
        else if(captureArmed){
          const selected=pressed[0],next=normalizeBinding({id:String(selected.pad.id||''),index:Number.isInteger(selected.pad.index)?selected.pad.index:-1,buttonIndex:selected.index,mapping:selected.pad.mapping||''});
          if(next){binding=next;capturing=false;captureArmed=false;holdArmed=false;setHeld(false);onBinding({...binding})}
        }
      }
      const pad=matchingPad(items),button=pad?.buttons?.[binding?.buttonIndex],active=(()=>{try{return isActive()!==false}catch{return false}})();
      if(binding&&!capturing&&!holdArmed&&!isPressed(button))holdArmed=true;
      setHeld(!!binding&&!capturing&&holdArmed&&active&&!!pad&&isPressed(button));
      emit(items,pad);
      if(!binding&&!capturing)stopPolling();
    }
    function beginCapture(){capturing=true;captureArmed=false;holdArmed=false;setHeld(false);ensurePolling();poll();return getState()}
    function cancelCapture(){if(!capturing)return getState();capturing=false;captureArmed=false;holdArmed=true;poll();return getState()}
    function setBinding(value){binding=normalizeBinding(value);capturing=false;captureArmed=false;holdArmed=true;if(!binding)setHeld(false);if(binding){ensurePolling();poll()}else{emit(pads(),null);stopPolling()}return getState()}
    function clearBinding(){return setBinding(null)}
    function refresh(){if(binding||capturing){ensurePolling();poll()}else emit(pads(),null);return getState()}
    function close(){capturing=false;captureArmed=false;holdArmed=true;setHeld(false);stopPolling();emit(pads(),null)}
    function getState(){return{...state,binding:state.binding?{...state.binding}:null}}
    emit([],null);
    return{beginCapture,cancelCapture,setBinding,clearBinding,refresh,close,getState,buttonLabel};
  }
  return{create,buttonLabel,normalizeBinding,isPressed};
});
