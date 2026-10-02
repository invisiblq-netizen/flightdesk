const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { create } = require('../src/voice-link.js');

class AudioNode {
  connect(next) { return next; }
}

class AudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 48000; this.destination = new AudioNode(); }
  createMediaStreamSource(stream) { return Object.assign(new AudioNode(), { stream }); }
  createBiquadFilter() { return Object.assign(new AudioNode(), { frequency: { value: 0 }, Q: { value: 0 } }); }
  createDynamicsCompressor() { return Object.assign(new AudioNode(), { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }); }
  createWaveShaper() { return Object.assign(new AudioNode(), { curve: null, oversample: '' }); }
  createMediaStreamDestination() {
    const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
    return { stream: { getAudioTracks: () => [track] }, track };
  }
  createOscillator() { return Object.assign(new AudioNode(), { frequency: {}, start() {}, stop() {} }); }
  createGain() {
    return Object.assign(new AudioNode(), { gain: {
      value: 1,
      setValueAtTime() {},
      exponentialRampToValueAtTime() {},
      setTargetAtTime(value) { this.value = value; }
    } });
  }
  async close() {}
  async resume() {}
}

class VoiceCall extends EventEmitter {
  constructor(peer) {
    super();
    this.peer = peer;
    this.peerConnection = { connectionState: 'connecting', iceConnectionState: 'checking', getStats: async () => new Map() };
    this.closed = false;
  }
  answer(stream) { this.answeredStream = stream; }
  close() { this.closed = true; this.emit('close'); }
}

class Peer extends EventEmitter {
  call(peer, stream, options) {
    this.outgoing = { peer, stream, options, call: new VoiceCall(peer) };
    return this.outgoing.call;
  }
}

async function run() {
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const oldAudioContext = globalThis.AudioContext;
  const rawTrack = { stopped: false, stop() { this.stopped = true; } };
  const rawStream = { getTracks: () => [rawTrack] };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => rawStream } }
  });
  globalThis.AudioContext = AudioContext;

  const timers = new Map();
  const intervals = new Map();
  let timerId = 0;
  const peer = new Peer();
  const statuses = [];
  const audio = { pause() {}, play: async () => {}, srcObject: null, volume: 1 };
  const voice = create({
    audio,
    onStatus: status => statuses.push(status),
    setTimer: callback => { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimer: id => timers.delete(id),
    setIntervalFn: (callback, delay) => { const id = ++timerId; intervals.set(id, { callback, delay }); return id; },
    clearIntervalFn: id => intervals.delete(id)
  });

  try {
    const started = await voice.start();
    assert.equal(started.ok, true);
    voice.setMode('ptt');
    voice.setPeer(peer, 'host');
    voice.setRemoteReady('joining-pilot', true);
    voice.setConnections([{ open: true, peer: 'joining-pilot' }]);
    const { peer: target, stream, options, call } = peer.outgoing;
    assert.equal(target, 'joining-pilot');
    assert.equal(options.metadata.channel, 'flightdesk-voice');
    const transmitTrack = stream.getAudioTracks()[0];
    assert.equal(transmitTrack.enabled, false, 'PTT must stay silent until the pilot transmits');
    const sampleQuality = [...intervals.values()].find(interval => interval.delay === 2500).callback;
    await sampleQuality();
    assert.equal(voice.getState().quality.level, 'connecting', 'A pending ICE route must not be reported as excellent');
    call.peerConnection.connectionState = 'connected';
    call.peerConnection.iceConnectionState = 'connected';
    await sampleQuality();
    assert.equal(voice.getState().quality.level, 'connected', 'A connected transport without selected-route/audio stats is not excellent');
    call.peerConnection.getStats = async () => new Map([
      ['pair', { type: 'candidate-pair', id: 'pair', state: 'succeeded', nominated: true, currentRoundTripTime: 0.02 }]
    ]);
    await sampleQuality();
    assert.equal(voice.getState().quality.level, 'connected', 'A selected route with no received audio traffic remains merely connected');
    call.peerConnection.getStats = async () => new Map([
      ['pair', { type: 'candidate-pair', id: 'pair', state: 'succeeded', nominated: true, currentRoundTripTime: 0.02 }],
      ['in', { type: 'inbound-rtp', kind: 'audio', packetsReceived: 100, packetsLost: 0, jitter: 0.003 }]
    ]);
    await sampleQuality();
    assert.equal(voice.getState().quality.level, 'excellent', 'Excellent requires a selected route and received audio traffic');
    call.peerConnection.iceConnectionState = 'failed';
    await sampleQuality();
    assert.equal(voice.getState().quality.level, 'unavailable', 'Failed ICE must remain unavailable');
    call.peerConnection.iceConnectionState = 'connected';

    assert.equal(voice.press(), true);
    assert.equal(transmitTrack.enabled, true, 'Pressing PTT opens the processed audio track');
    assert.equal(voice.getState().transmitting, true);
    assert.equal(voice.release(), true);
    assert.equal(transmitTrack.enabled, true, 'Release keeps the closing tone in the outgoing stream');
    const release = [...timers.values()].at(-1);
    assert.equal(typeof release, 'function');
    release();
    assert.equal(transmitTrack.enabled, false, 'PTT closes after its squelch tail');

    voice.setMode('open');
    assert.equal(transmitTrack.enabled, true, 'Open mic transmits continuously after voice starts');
    voice.setMuted(true);
    assert.equal(transmitTrack.enabled, false, 'Mute closes either transmit mode');
    voice.setMuted(false);
    assert.equal(transmitTrack.enabled, true, 'Unmuting restores the selected open-mic mode');

    call.emit('stream', { getAudioTracks: () => [] });
    assert.ok(audio.srcObject, 'A received crew stream is connected to the audio output');
    assert.ok(statuses.some(status => status.text === 'Voice link connected'));
    voice.close();
    assert.equal(rawTrack.stopped, true, 'Disconnect releases microphone access');
    assert.equal(voice.getState().calls, 0);

    const joinTrack = { stopped: false, stop() { this.stopped = true; } };
    const joinStream = { getTracks: () => [joinTrack] };
    globalThis.navigator.mediaDevices.getUserMedia = async () => joinStream;
    const joinPeer = new Peer();
    const joinVoice = create({ audio, setTimer: callback => { const id = ++timerId; timers.set(id, callback); return id; }, clearTimer: id => timers.delete(id), setIntervalFn: (callback, delay) => { const id = ++timerId; intervals.set(id, { callback, delay }); return id; }, clearIntervalFn: id => intervals.delete(id) });
    await joinVoice.start();
    joinVoice.setPeer(joinPeer, 'join');
    joinVoice.setConnections([{ open: true, peer: 'host-peer' }]);
    const firstCall = new VoiceCall('host-peer');
    joinPeer.emit('call', firstCall);
    assert.ok(firstCall.answeredStream, 'The guest answers if the host media offer beats its ready message');
    assert.equal(joinVoice.getState().calls, 1);
    const strangerCall = new VoiceCall('unknown-peer');
    joinPeer.emit('call', strangerCall);
    assert.equal(strangerCall.closed, true, 'Incoming audio from outside the connected lobby is rejected');
    joinVoice.close();
    assert.equal(joinTrack.stopped, true);
    console.log('PASS: PTT/open-mic gating, peer-call ordering, ICE/audio quality states, remote audio and mic cleanup work.');
  } finally {
    voice.close();
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
    else delete globalThis.navigator;
    if (oldAudioContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = oldAudioContext;
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
