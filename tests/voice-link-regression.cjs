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
    this.peerConnection = { getStats: async () => new Map() };
  }
  answer(stream) { this.answeredStream = stream; }
  close() { this.emit('close'); }
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
  let timerId = 0;
  const peer = new Peer();
  const statuses = [];
  const audio = { pause() {}, play: async () => {}, srcObject: null, volume: 1 };
  const voice = create({
    audio,
    onStatus: status => statuses.push(status),
    setTimer: callback => { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimer: id => timers.delete(id)
  });

  try {
    const started = await voice.start();
    assert.equal(started.ok, true);
    voice.setMode('ptt');
    voice.setPeer(peer, 'host');
    voice.setConnections([{ open: true, peer: 'joining-pilot' }]);
    const { peer: target, stream, options, call } = peer.outgoing;
    assert.equal(target, 'joining-pilot');
    assert.equal(options.metadata.channel, 'flightdesk-voice');
    const transmitTrack = stream.getAudioTracks()[0];
    assert.equal(transmitTrack.enabled, false, 'PTT must stay silent until the pilot transmits');

    assert.equal(voice.press(), true);
    assert.equal(transmitTrack.enabled, true, 'Pressing PTT opens the processed audio track');
    assert.equal(voice.getState().transmitting, true);
    assert.equal(voice.release(), true);
    assert.equal(transmitTrack.enabled, true, 'Release keeps the closing tone in the outgoing stream');
    const release = [...timers.values()][0];
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
    console.log('PASS: PTT/open-mic gating, real peer-call setup, processed transmit stream, remote audio and mic cleanup work.');
  } finally {
    voice.close();
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
    else delete globalThis.navigator;
    if (oldAudioContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = oldAudioContext;
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
