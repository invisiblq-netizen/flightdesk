(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FlightDeskVoiceLink=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  function create({audio,onStatus=()=>{},onQuality=()=>{},onInputLevel=()=>{},onError=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}={}){
    let peer=null,role='',connections=[],rawStream=null,txStream=null,txContext=null,txTrack=null,txDestination=null,remoteStream=null;
    let mode='ptt',muted=false,transmitting=false,releaseTimer=null,qualityTimer=null;
    const calls=new Map(),remoteReady=new Map();
    let outputDeviceId='',volume=.8,quality={level:'unavailable',rttMs:null,jitterMs:null,packetLoss:null};
    let profile='clean',strength=.5,connectionInfluence=true,profileNodes=null,squelchTimer=null;
    const say=(text,level='connecting')=>onStatus({text,level});
    const contextConstructor=()=>globalThis.AudioContext||globalThis.webkitAudioContext;
    function makeWaveCurve(amount=.12){
      const curve=new Float32Array(1024);
      for(let i=0;i<curve.length;i++){const x=i*2/curve.length-1;curve[i]=Math.tanh(x*(1+amount*5))/Math.tanh(1+amount*5)}
      return curve;
    }
    function setAudioParam(param,value,now,time=.04){if(typeof param?.setTargetAtTime==='function')param.setTargetAtTime(value,now,time);else if(param)param.value=value}
    function makeNoiseBuffer(context){
      if(!context.createBuffer)return null;
      const buffer=context.createBuffer(1,context.sampleRate,context.sampleRate),channel=buffer.getChannelData(0);
      for(let i=0;i<channel.length;i++)channel[i]=(Math.random()*2-1)*.16;
      return buffer;
    }
    function effectiveStrength(){
      if(profile==='clean'||!connectionInfluence)return strength;
      const network={excellent:0,good:.12,degraded:.38,connected:.22,unavailable:0}[quality.level]||0;
      return Math.min(1,strength+network);
    }
    function applyProfile(){
      if(!profileNodes)return;
      const amount=effectiveStrength(),settings={
        clean:{low:12000,high:65,wet:0,threshold:0,ratio:1,noise:0,distortion:0,squelch:false},
        vhf:{low:3600-1000*amount,high:240+35*amount,wet:.7+.3*amount,threshold:-22-5*amount,ratio:2.5+1.5*amount,noise:.0015+.004*amount,distortion:.035+.13*amount,squelch:true},
        slight:{low:7200-1800*amount,high:130+35*amount,wet:.45+.35*amount,threshold:-16-8*amount,ratio:1.5+1.7*amount,noise:.0006+.0025*amount,distortion:.01+.07*amount,squelch:false},
        heavy:{low:3200-900*amount,high:260+40*amount,wet:.75+.25*amount,threshold:-23-6*amount,ratio:3+2*amount,noise:.003+.006*amount,distortion:.06+.19*amount,squelch:true}
      }[profile]||null;
      if(!settings)return;
      const n=profileNodes,now=txContext.currentTime;
      setAudioParam(n.cleanGain.gain,settings.wet?Math.cos(settings.wet*Math.PI/2):1,now);
      setAudioParam(n.wetGain.gain,settings.wet?Math.sin(settings.wet*Math.PI/2):0,now);
      setAudioParam(n.high.frequency,settings.high,now);setAudioParam(n.low.frequency,settings.low,now);
      setAudioParam(n.compressor.threshold,settings.threshold,now);setAudioParam(n.compressor.ratio,settings.ratio,now);
      n.shape.curve=makeWaveCurve(settings.distortion);
      setAudioParam(n.noiseGain.gain,settings.noise,now,.08);
      n.squelch=settings.squelch;
      if(!settings.squelch)setAudioParam(n.gate.gain,1,now,.02);
    }
    function sampleSquelch(){
      if(!profileNodes?.squelch||!txContext||!transmitting||muted){if(profileNodes?.gate)setAudioParam(profileNodes.gate.gain,1,txContext?.currentTime||0,.025);return}
      const n=profileNodes;let sum=0;
      for(const sample of n.samples){const value=(sample-128)/128;sum+=value*value}
      const rms=Math.sqrt(sum/n.samples.length),active=rms>.012;
      if(active)n.lastVoiceAt=Date.now();
      const open=active||Date.now()-n.lastVoiceAt<220;
      setAudioParam(n.gate.gain,open?1:0,txContext.currentTime,.018);
    }
    async function buildTransmit(stream){
      const AudioContextClass=contextConstructor();
      if(!AudioContextClass)return stream;
      const context=new AudioContextClass();
      try{
        const source=context.createMediaStreamSource(stream),high=context.createBiquadFilter(),low=context.createBiquadFilter();
        const compressor=context.createDynamicsCompressor(),shape=context.createWaveShaper(),destination=context.createMediaStreamDestination();
        const cleanGain=context.createGain(),wetGain=context.createGain(),gate=context.createGain(),analyser=context.createAnalyser?.()||null,noiseGain=context.createGain();
        high.type='highpass';high.frequency.value=240;high.Q.value=.7;low.type='lowpass';low.frequency.value=3600;low.Q.value=.65;
        compressor.threshold.value=-27;compressor.knee.value=18;compressor.ratio.value=3;compressor.attack.value=.012;compressor.release.value=.18;
        shape.curve=makeWaveCurve();shape.oversample='2x';if(analyser)analyser.fftSize=512;noiseGain.gain.value=0;
        source.connect(cleanGain).connect(gate);source.connect(high).connect(low).connect(compressor).connect(shape).connect(wetGain).connect(gate);
        gate.connect(destination);if(analyser)source.connect(analyser);
        const noiseBuffer=makeNoiseBuffer(context);
        if(noiseBuffer&&context.createBufferSource){const noise=context.createBufferSource(),noiseFilter=context.createBiquadFilter();noise.buffer=noiseBuffer;noise.loop=true;noiseFilter.type='lowpass';noiseFilter.frequency.value=3000;noise.connect(noiseFilter).connect(noiseGain).connect(gate);noise.start();profileNodes={...profileNodes,noise}};
        profileNodes={cleanGain,wetGain,high,low,compressor,shape,gate,analyser,noiseGain,samples:new Uint8Array(analyser?.fftSize||512),lastVoiceAt:0,squelch:false};
        txContext=context;txDestination=destination;txStream=destination.stream;txTrack=txStream.getAudioTracks()[0];if(txTrack)txTrack.enabled=false;
        applyProfile();
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
    function removeCall(id,call){const current=calls.get(id);if(!current||current.call!==call)return;calls.delete(id);if(!calls.size){closeRemoteAudio();say(txStream?'Voice link ready · waiting for crew':'Voice link off',txStream?'ready':'unavailable')}onQuality({...quality,level:calls.size?quality.level:'unavailable'})}
    function closeRemoteAudio(){
      if(audio){audio.pause?.();audio.srcObject=null}
      remoteStream=null;
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
      closeRemoteAudio();remoteStream=stream;if(!audio)return;
      audio.autoplay=true;audio.playsInline=true;audio.muted=false;audio.srcObject=stream;
      audio.volume=volume;setOutputDevice();
      audio.play?.().catch(()=>say('Voice is connected. Select Enable speakers to allow playback.','ready'));
    }
    async function enablePlayback(){
      if(!audio)return{ok:false,error:'Speaker playback is unavailable.'};
      try{await audio.play();return{ok:true}}
      catch(error){return{ok:false,error:error?.message||'Could not start speaker playback.'}}
    }
    function finishCall(id,call){
      const pc=call.peerConnection,inspectRoute=()=>{if(calls.get(id)?.call!==call)return;if(pc?.connectionState==='failed'||pc?.iceConnectionState==='failed')say('Voice route failed · check firewall/NAT; this build has no TURN relay.','unavailable')};
      pc?.addEventListener?.('connectionstatechange',inspectRoute);pc?.addEventListener?.('iceconnectionstatechange',inspectRoute);inspectRoute();
      let receivedAudio=false;const streamTimer=setTimer(()=>{if(!receivedAudio&&calls.get(id)?.call===call)say('Voice is still waiting for audio · check both microphones and the firewall/NAT route.','connecting')},12000);
      call.on('stream',stream=>{receivedAudio=true;clearTimer(streamTimer);receiveStream(stream);say('Voice link connected','connected')});call.on('close',()=>{clearTimer(streamTimer);removeCall(id,call)});call.on('error',error=>{clearTimer(streamTimer);removeCall(id,call);onError('Voice connection failed: '+(error?.message||'unknown error'))});
    }
    function acceptIncoming(call){
      const id=call?.peer;if(typeof id!=='string'||!id){call?.close?.();return}
      const current=calls.get(id);
      // The host starts one bidirectional call only after both microphones are ready.
      // This avoids simultaneous PeerJS calls racing and closing each other's audio.
      if(role!=='join'||!txStream||remoteReady.get(id)!==true||current){call.close?.();return}
      calls.set(id,{call,outgoing:false,bidirectional:true});finishCall(id,call);
      try{call.answer(txStream||undefined)}catch(error){calls.delete(id);onError(error.message||'Could not answer the incoming voice link.');return}
      say('Connecting voice link','connecting');
    }
    function beginOutgoing(connection){
      if(role!=='host'||!peer||!txStream||!connection?.open||!connection.peer||remoteReady.get(connection.peer)!==true||calls.has(connection.peer))return;
      try{const call=peer.call(connection.peer,txStream,{metadata:{channel:'flightdesk-voice',version:1}});if(!call){say('Voice link could not be started','unavailable');return}calls.set(connection.peer,{call,outgoing:true});finishCall(connection.peer,call);say('Connecting voice link','connecting')}
      catch(error){onError(error.message||'Could not start the voice link.')}
    }
    function syncCalls(){
      if(!peer||!txStream||role!=='host')return;
      for(const connection of connections){
        if(!connection?.open||!connection.peer)continue;
        if(remoteReady.get(connection.peer)===true)beginOutgoing(connection);
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
        if(!squelchTimer)squelchTimer=setInterval(()=>{if(profileNodes?.analyser?.getByteTimeDomainData)profileNodes.analyser.getByteTimeDomainData(profileNodes.samples);sampleSquelch()},30);
        return{ok:true,stream:rawStream};
      }catch(error){onError(error?.name==='NotAllowedError'?'Microphone permission was not granted.':error?.message||'Could not start the microphone.');say('Microphone unavailable','unavailable');return{ok:false,error:error?.message||'Could not start the microphone.'}}
    }
    function rootNavigator(){return typeof navigator==='object'?navigator:null}
    function setMode(value){mode=value==='open'?'open':'ptt';if(mode!=='ptt'){transmitting=false;if(releaseTimer)clearTimer(releaseTimer);releaseTimer=null}updateTransmit();say(mode==='open'&&!muted?'Open mic active':mode==='ptt'?'Push to talk ready':'Microphone muted',mode==='open'&&!muted?'connected':'ready')}
    function setProfile(value,options={}){profile=['clean','vhf','slight','heavy'].includes(value)?value:'clean';if(Number.isFinite(Number(options.strength)))strength=Math.max(0,Math.min(1,Number(options.strength)));if(typeof options.connectionInfluence==='boolean')connectionInfluence=options.connectionInfluence;applyProfile();return{profile,strength,connectionInfluence}}
    function setMuted(value){muted=!!value;if(muted){transmitting=false;if(releaseTimer)clearTimer(releaseTimer);releaseTimer=null}updateTransmit();say(muted?'Microphone muted':mode==='open'?'Open mic active':'Push to talk ready',muted?'muted':'ready')}
    function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(audio)audio.volume=volume}
    function setPeer(nextPeer,nextRole){if(peer&&peer!==nextPeer)peer.off?.('call',onIncoming);peer=nextPeer||null;role=nextRole==='host'?'host':'join';if(peer)peer.on('call',onIncoming);syncCalls()}
    function setConnections(list){connections=Array.isArray(list)?list:[];syncCalls()}
    function setRemoteReady(id,ready){if(!id)return;remoteReady.set(id,!!ready);if(!ready&&role==='host'){const active=calls.get(id);if(active){calls.delete(id);try{active.call.close()}catch{}if(!calls.size)closeRemoteAudio()}}syncCalls()}
    async function sampleQuality(){
      const active=[...calls.values()][0]?.call,pc=active?.peerConnection;
      if(pc?.connectionState==='failed'||pc?.iceConnectionState==='failed'){quality={level:'unavailable',rttMs:null,jitterMs:null,packetLoss:null};onQuality(quality);return}
      if(!pc?.getStats){quality={level:calls.size?'connected':'unavailable',rttMs:null,jitterMs:null,packetLoss:null};onQuality(quality);return}
      try{
        const report=await pc.getStats(),rows=[...report.values()],pair=rows.find(item=>item.type==='candidate-pair'&&item.state==='succeeded'&&item.nominated),inbound=rows.find(item=>item.type==='inbound-rtp'&&item.kind==='audio'&&!item.isRemote);
        const rttMs=Number.isFinite(pair?.currentRoundTripTime)?Math.round(pair.currentRoundTripTime*1000):null,jitterMs=Number.isFinite(inbound?.jitter)?Math.round(inbound.jitter*1000):null,received=Number(inbound?.packetsReceived)||0,lost=Math.max(0,Number(inbound?.packetsLost)||0),packetLoss=received+lost>0?lost/(received+lost):null;
        let level='excellent';if((rttMs??0)>300||(jitterMs??0)>60||(packetLoss??0)>.05)level='degraded';else if((rttMs??0)>150||(jitterMs??0)>30||(packetLoss??0)>.015)level='good';
        quality={level:calls.size?level:'unavailable',rttMs,jitterMs,packetLoss};
        applyProfile();
        onQuality(quality);
      }catch{quality={level:'unavailable',rttMs:null,jitterMs:null,packetLoss:null};onQuality(quality)}
    }
    function close(){
      if(qualityTimer)clearInterval(qualityTimer);qualityTimer=null;if(squelchTimer)clearInterval(squelchTimer);squelchTimer=null;
      for(const {call} of calls.values())try{call.close()}catch{}calls.clear();
      if(peer)peer.off?.('call',onIncoming);peer=null;connections=[];remoteReady.clear();
      if(rawStream)for(const track of rawStream.getTracks())track.stop();rawStream=null;txStream=null;txTrack=null;txDestination=null;
      if(txContext){txContext.close().catch(()=>{});txContext=null}profileNodes=null;closeRemoteAudio();transmitting=false;muted=false;
      quality={level:'unavailable',rttMs:null,jitterMs:null,packetLoss:null};onQuality(quality);say('Voice link off','unavailable');
    }
    return{start,close,setPeer,setConnections,setRemoteReady,setMode,setMuted,setVolume,setInputDevice,setOutputDevice,setProfile,enablePlayback,testMicrophone,press,release,getAudioStreams:()=>({transmit:txStream,receive:remoteStream}),getState:()=>{const pc=[...calls.values()][0]?.call?.peerConnection;return{ready:!!txStream,muted,mode,transmitting,quality,calls:calls.size,profile,strength,connectionInfluence,connectionState:pc?.connectionState||'new',iceConnectionState:pc?.iceConnectionState||'new'}}};
  }
  return{create};
});
