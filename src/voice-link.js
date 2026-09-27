(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FlightDeskVoiceLink=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  function create({audio,onStatus=()=>{},onQuality=()=>{},onInputLevel=()=>{},onError=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}={}){
    let peer=null,role='',connections=[],rawStream=null,txStream=null,txContext=null,txTrack=null,txDestination=null;
    let mode='ptt',muted=false,transmitting=false,releaseTimer=null,qualityTimer=null;
    let remoteAudioContext=null,remoteSource=null,remoteFilter=null,remoteNoiseGain=null,remoteGain=null;
    const calls=new Map(),remoteReady=new Map(),pending=new Map();
    let outputDeviceId='',volume=.8,quality={level:'unavailable',rttMs:null,jitterMs:null,packetLoss:null};
    const say=(text,level='connecting')=>onStatus({text,level});
    const contextConstructor=()=>globalThis.AudioContext||globalThis.webkitAudioContext;
    function makeWaveCurve(amount=.12){
      const curve=new Float32Array(1024);
      for(let i=0;i<curve.length;i++){const x=i*2/curve.length-1;curve[i]=Math.tanh(x*(1+amount*5))/Math.tanh(1+amount*5)}
      return curve;
    }
    async function buildTransmit(stream){
      const AudioContextClass=contextConstructor();
      if(!AudioContextClass)return stream;
      const context=new AudioContextClass();
      try{
        const source=context.createMediaStreamSource(stream),high=context.createBiquadFilter(),low=context.createBiquadFilter();
        const compressor=context.createDynamicsCompressor(),shape=context.createWaveShaper(),destination=context.createMediaStreamDestination();
        high.type='highpass';high.frequency.value=260;high.Q.value=.7;low.type='lowpass';low.frequency.value=3600;low.Q.value=.65;
        compressor.threshold.value=-27;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.012;compressor.release.value=.18;
        shape.curve=makeWaveCurve();shape.oversample='2x';source.connect(high).connect(low).connect(compressor).connect(shape).connect(destination);
        txContext=context;txDestination=destination;txStream=destination.stream;txTrack=txStream.getAudioTracks()[0];if(txTrack)txTrack.enabled=false;
        return txStream;
      }catch(error){await context.close().catch(()=>{});throw error}
    }
    function playClick(open){
      if(!txContext||!txContext.createOscillator||!txStream)return;
      try{
        const oscillator=txContext.createOscillator(),gain=txContext.createGain(),now=txContext.currentTime;
        oscillator.type='sine';oscillator.frequency.value=open?1450:1050;
        gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.022,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+.045);
        oscillator.connect(gain).connect(txDestination||txContext.destination);oscillator.start(now);oscillator.stop(now+.05);
      }catch{}
    }
    function setTransmit(enabled){
      transmitting=!!enabled&&!muted&&(mode==='open'||mode==='ptt'&&transmitting);
      if(txTrack)txTrack.enabled=transmitting;
    }
    function press(){
      if(mode!=='ptt'||muted||!txTrack||transmitting)return false;
      if(releaseTimer){clearTimer(releaseTimer);releaseTimer=null}
      transmitting=true;txTrack.enabled=true;playClick(true);say('Transmitting','transmitting');return true;
    }
    function release(){
      if(mode!=='ptt'||!transmitting)return false;
      playClick(false);if(releaseTimer)clearTimer(releaseTimer);
      releaseTimer=setTimer(()=>{releaseTimer=null;transmitting=false;if(txTrack)txTrack.enabled=false;say(calls.size?'Voice link connected':'Voice link ready',calls.size?'connected':'ready')},90);return true;
    }
    function updateTransmit(){
      if(!txTrack)return;
      const open=mode==='open'&&!muted;
      if(open){transmitting=true;txTrack.enabled=true}
      else if(mode==='ptt'&&!transmitting)txTrack.enabled=false;
      else if(muted){transmitting=false;txTrack.enabled=false}
      else if(mode!=='ptt'){transmitting=false;txTrack.enabled=false}
    }
    function clearPending(){for(const timer of pending.values())clearTimer(timer);pending.clear()}
    function removeCall(id,call){const current=calls.get(id);if(!current||current.call!==call)return;calls.delete(id);if(!calls.size){closeRemoteAudio();say(txStream?'Voice link ready':'Voice link off',txStream?'ready':'unavailable')}onQuality({...quality,level:calls.size?quality.level:'unavailable'})}
    function closeRemoteAudio(){
      if(audio){audio.pause?.();audio.srcObject=null}
      remoteSource=null;remoteFilter=null;remoteNoiseGain=null;remoteGain=null;
      if(remoteAudioContext){remoteAudioContext.close().catch(()=>{});remoteAudioContext=null}
    }
    async function setOutputDevice(id=outputDeviceId){
      outputDeviceId=id||'';if(!audio)return;
      if(typeof audio.setSinkId==='function')try{await audio.setSinkId(outputDeviceId)}catch(error){onError('Could not select the chosen speaker: '+error.message)}
    }
    async function setInputDevice(id=''){
      if(!rawStream)return{ok:false,error:'Start the voice link before changing the microphone.'};
      const media=rootNavigator()?.mediaDevices;if(!media?.getUserMedia)return{ok:false,error:'Microphone selection is unavailable.'};
      try{
        const replacement=await media.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false,...(id?{deviceId:{exact:id}}:{})},video:false});
        const previousStream=rawStream,previousContext=txContext;rawStream=replacement;txStream=null;txTrack=null;txContext=null;txDestination=null;
        await buildTransmit(replacement);await txContext?.resume?.();updateTransmit();
        for(const track of previousStream.getTracks())track.stop();if(previousContext)previousContext.close().catch(()=>{});
        for(const [peerId,item] of [...calls]){calls.delete(peerId);try{item.call.close()}catch{}}
        syncCalls();return{ok:true};
      }catch(error){onError(error?.name==='NotAllowedError'?'Microphone permission was not granted.':error?.message||'Could not switch microphones.');return{ok:false,error:error?.message||'Could not switch microphones.'}}
    }
    async function testMicrophone({inputDeviceId='',durationMs=4000}={}){
      const media=rootNavigator()?.mediaDevices;if(!media?.getUserMedia)return{ok:false,error:'Microphone testing is unavailable.'};
      const ownsStream=!rawStream;let stream=rawStream,context=null,interval=null,timeout=null;
      try{
        if(!stream)stream=await media.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,...(inputDeviceId?{deviceId:{exact:inputDeviceId}}:{})},video:false});
        const AudioContextClass=contextConstructor();if(!AudioContextClass)throw new Error('Microphone level monitoring is unavailable.');
        context=new AudioContextClass();await context.resume?.();const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser(),samples=new Uint8Array(512);analyser.fftSize=512;source.connect(analyser);
        let peak=0;const sample=()=>{analyser.getByteTimeDomainData(samples);let sum=0;for(const value of samples){const delta=(value-128)/128;sum+=delta*delta}const level=Math.min(1,Math.sqrt(sum/samples.length)*3.5);peak=Math.max(peak,level);onInputLevel(level)};
        sample();await new Promise(resolve=>{interval=setInterval(sample,50);timeout=setTimer(resolve,Math.max(1000,Math.min(10000,durationMs)))});
        clearInterval(interval);interval=null;if(timeout){clearTimer(timeout);timeout=null}onInputLevel(0);return{ok:true,peak};
      }catch(error){return{ok:false,error:error?.name==='NotAllowedError'?'Microphone permission was not granted.':error?.message||'Microphone test failed.'}}
      finally{if(interval)clearInterval(interval);if(timeout)clearTimer(timeout);onInputLevel(0);if(ownsStream&&stream)for(const track of stream.getTracks())track.stop();if(context)await context.close().catch(()=>{})}
    }
    function receiveStream(stream){
      closeRemoteAudio();if(!audio)return;
      const AudioContextClass=contextConstructor();
      if(AudioContextClass)try{
        const context=new AudioContextClass(),source=context.createMediaStreamSource(stream),high=context.createBiquadFilter(),low=context.createBiquadFilter(),compressor=context.createDynamicsCompressor(),gain=context.createGain(),destination=context.createMediaStreamDestination();
        high.type='highpass';high.frequency.value=260;low.type='lowpass';low.frequency.value=6000;
        compressor.threshold.value=-28;compressor.knee.value=20;compressor.ratio.value=2.5;compressor.attack.value=.01;compressor.release.value=.2;
        gain.gain.value=volume;source.connect(high).connect(low).connect(compressor).connect(gain).connect(destination);
        const noiseLength=Math.max(1,Math.floor(context.sampleRate*.25)),buffer=context.createBuffer(1,noiseLength,context.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
        const noise=context.createBufferSource(),noiseGain=context.createGain();noise.buffer=buffer;noise.loop=true;noiseGain.gain.value=.00008;noise.connect(noiseGain).connect(destination);noise.start();
        audio.srcObject=destination.stream;remoteAudioContext=context;remoteSource=source;remoteFilter=low;remoteNoiseGain=noiseGain;remoteGain=gain;
      }catch{audio.srcObject=stream}
      else audio.srcObject=stream;
      audio.volume=volume;setOutputDevice();audio.play?.().catch(()=>say('Tap Enable voice to allow audio playback','ready'));
    }
    function finishCall(id,call){call.on('stream',stream=>{receiveStream(stream);say('Voice link connected','connected')});call.on('close',()=>removeCall(id,call));call.on('error',error=>{removeCall(id,call);onError('Voice connection failed: '+(error?.message||'unknown error'))});}
    function acceptIncoming(call){
      const id=call?.peer;if(typeof id!=='string'||!id){call?.close?.();return}
      const current=calls.get(id);
      if(current&&current.call!==call){
        if(role==='host'&&current.outgoing){call.close?.();return}
        current.call.close?.();calls.delete(id);
      }
      calls.set(id,{call,outgoing:false,bidirectional:!!txStream});finishCall(id,call);
      try{call.answer(txStream||undefined)}catch(error){calls.delete(id);onError(error.message||'Could not answer the incoming voice link.');return}
      say('Connecting voice link','connecting');
    }
    function beginOutgoing(connection){
      if(!peer||!txStream||!connection?.open||!connection.peer||calls.has(connection.peer))return;
      try{const call=peer.call(connection.peer,txStream,{metadata:{channel:'flightdesk-voice',version:1}});if(!call){say('Voice link could not be started','unavailable');return}calls.set(connection.peer,{call,outgoing:true});finishCall(connection.peer,call);say('Connecting voice link','connecting')}
      catch(error){onError(error.message||'Could not start the voice link.')}
    }
    function syncCalls(){
      clearPending();if(!peer||!txStream)return;
      for(const connection of connections){
        if(!connection?.open||!connection.peer)continue;
        const active=calls.get(connection.peer);
        if(active){if(active.bidirectional||!txStream)continue;active.call.close?.();calls.delete(connection.peer)}
        if(role==='host'){beginOutgoing(connection);continue}
        if(remoteReady.get(connection.peer)===true)continue;
        const timer=setTimer(()=>{pending.delete(connection.peer);const current=connections.find(item=>item.peer===connection.peer&&item.open);if(current&&remoteReady.get(connection.peer)!==true)beginOutgoing(current)},1200);
        pending.set(connection.peer,timer);
      }
    }
    function onIncoming(call){acceptIncoming(call)}
    async function start({inputDeviceId=''}={}){
      try{
        const media=rootNavigator()?.mediaDevices;
        if(!media?.getUserMedia)throw new Error('Microphone access is unavailable in this app environment.');
        const constraints={audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false,...(inputDeviceId?{deviceId:{exact:inputDeviceId}}:{})},video:false};
        rawStream=await media.getUserMedia(constraints);
        await buildTransmit(rawStream);await txContext?.resume?.();updateTransmit();
        say(mode==='open'&&!muted?'Open mic active':'Voice ready · hold PTT to transmit',mode==='open'&&!muted?'connected':'ready');syncCalls();
        if(!qualityTimer)qualityTimer=setInterval(sampleQuality,2500);
        return{ok:true,stream:rawStream};
      }catch(error){onError(error?.name==='NotAllowedError'?'Microphone permission was not granted.':error?.message||'Could not start the microphone.');say('Microphone unavailable','unavailable');return{ok:false,error:error?.message||'Could not start the microphone.'}}
    }
    function rootNavigator(){return typeof navigator==='object'?navigator:null}
    function setMode(value){mode=value==='open'?'open':'ptt';if(mode!=='ptt'){transmitting=false;if(releaseTimer)clearTimer(releaseTimer);releaseTimer=null}updateTransmit();say(mode==='open'&&!muted?'Open mic active':mode==='ptt'?'Push to talk ready':'Microphone muted',mode==='open'&&!muted?'connected':'ready')}
    function setMuted(value){muted=!!value;if(muted){transmitting=false;if(releaseTimer)clearTimer(releaseTimer);releaseTimer=null}updateTransmit();say(muted?'Microphone muted':mode==='open'?'Open mic active':'Push to talk ready',muted?'muted':'ready')}
    function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(remoteGain)remoteGain.gain.value=volume;if(audio)audio.volume=volume}
    function setPeer(nextPeer,nextRole){if(peer&&peer!==nextPeer)peer.off?.('call',onIncoming);peer=nextPeer||null;role=nextRole==='host'?'host':'join';if(peer)peer.on('call',onIncoming);syncCalls()}
    function setConnections(list){connections=Array.isArray(list)?list:[];syncCalls()}
    function setRemoteReady(id,ready){if(!id)return;remoteReady.set(id,!!ready);if(ready&&role==='join'){const timer=pending.get(id);if(timer){clearTimer(timer);pending.delete(id)}}syncCalls()}
    async function sampleQuality(){
      const active=[...calls.values()][0]?.call,pc=active?.peerConnection;
      if(!pc?.getStats){quality={level:calls.size?'connected':'unavailable',rttMs:null,jitterMs:null,packetLoss:null};onQuality(quality);return}
      try{
        const report=await pc.getStats(),rows=[...report.values()],pair=rows.find(item=>item.type==='candidate-pair'&&item.state==='succeeded'&&item.nominated),inbound=rows.find(item=>item.type==='inbound-rtp'&&item.kind==='audio'&&!item.isRemote);
        const rttMs=Number.isFinite(pair?.currentRoundTripTime)?Math.round(pair.currentRoundTripTime*1000):null,jitterMs=Number.isFinite(inbound?.jitter)?Math.round(inbound.jitter*1000):null,received=Number(inbound?.packetsReceived)||0,lost=Math.max(0,Number(inbound?.packetsLost)||0),packetLoss=received+lost>0?lost/(received+lost):null;
        let level='excellent';if((rttMs??0)>300||(jitterMs??0)>60||(packetLoss??0)>.05)level='degraded';else if((rttMs??0)>150||(jitterMs??0)>30||(packetLoss??0)>.015)level='good';
        quality={level:calls.size?level:'unavailable',rttMs,jitterMs,packetLoss};
        if(remoteFilter)remoteFilter.frequency.setTargetAtTime(level==='excellent'?6000:level==='good'?4800:3600,remoteAudioContext.currentTime,.8);
        if(remoteNoiseGain)remoteNoiseGain.gain.setTargetAtTime(level==='excellent'?.00008:level==='good'?.00022:.0005,remoteAudioContext.currentTime,1);
        onQuality(quality);
      }catch{quality={level:'unavailable',rttMs:null,jitterMs:null,packetLoss:null};onQuality(quality)}
    }
    function close(){
      clearPending();if(qualityTimer)clearInterval(qualityTimer);qualityTimer=null;
      for(const {call} of calls.values())try{call.close()}catch{}calls.clear();
      if(peer)peer.off?.('call',onIncoming);peer=null;connections=[];remoteReady.clear();
      if(rawStream)for(const track of rawStream.getTracks())track.stop();rawStream=null;txStream=null;txTrack=null;txDestination=null;
      if(txContext){txContext.close().catch(()=>{});txContext=null}closeRemoteAudio();transmitting=false;muted=false;
      quality={level:'unavailable',rttMs:null,jitterMs:null,packetLoss:null};onQuality(quality);say('Voice link off','unavailable');
    }
    return{start,close,setPeer,setConnections,setRemoteReady,setMode,setMuted,setVolume,setInputDevice,setOutputDevice,testMicrophone,press,release,getState:()=>({ready:!!txStream,muted,mode,transmitting,quality,calls:calls.size})};
  }
  return{create};
});
