const assert = require('node:assert/strict');
const { create, normalizeBinding, buttonLabel } = require('../src/voice-gamepad.js');

function pad({ id = 'Xbox Controller', index = 0, mapping = 'standard', buttonCount = 17 } = {}) {
  return { id, index, mapping, buttons: Array.from({ length: buttonCount }, () => ({ pressed: false, value: 0 })) };
}

function press(controller, index, value = 1) {
  controller.buttons[index] = { pressed: value >= 1, value };
}

function run() {
  let controllers = [];
  let active = true;
  let tick = null;
  let intervalStarted = 0;
  let intervalCleared = 0;
  const held = [];
  const bindings = [];
  const gamepad = create({
    getGamepads: () => controllers,
    isActive: () => active,
    onHeld: value => held.push(value),
    onBinding: value => bindings.push(value),
    setIntervalFn: callback => { tick = callback; intervalStarted++; return 7; },
    clearIntervalFn: id => { assert.equal(id, 7); tick = null; intervalCleared++; }
  });

  assert.equal(gamepad.getState().supported, true);
  assert.equal(buttonLabel('standard', 0), 'A');
  assert.equal(buttonLabel('standard', 4), 'LB');
  assert.equal(buttonLabel('', 8), 'Button 9');
  assert.equal(normalizeBinding({ id: 'pad', index: 0, buttonIndex: 0, mapping: 'standard' }).buttonIndex, 0);
  assert.equal(normalizeBinding({ id: '', index: -1, buttonIndex: 0 }), null);

  const first = pad({ index: 0 });
  const second = pad({ index: 1 });
  controllers = [first, second];
  gamepad.setBinding({ id: first.id, index: 0, buttonIndex: 0, mapping: 'standard' });
  assert.equal(gamepad.getState().connected, true);
  assert.equal(intervalStarted, 1);

  press(second, 0);
  tick();
  assert.equal(gamepad.getState().held, false, 'another controller must not affect the selected binding');
  press(second, 0, 0);
  press(first, 0);
  tick();
  assert.equal(gamepad.getState().held, true, 'the selected held button asserts hold-to-mute');
  assert.deepEqual(held, [true]);

  active = false;
  tick();
  assert.equal(gamepad.getState().held, false, 'losing app focus releases a stale held mute');
  assert.deepEqual(held, [true, false]);
  active = true;
  tick();
  assert.equal(gamepad.getState().held, true, 'a still-held button is recognized after focus returns');

  controllers = [];
  tick();
  assert.equal(gamepad.getState().connected, false);
  assert.equal(gamepad.getState().held, false, 'controller disconnect releases hold-to-mute');
  assert.equal(gamepad.getState().buttonLabel, 'A');

  controllers = [first];
  press(first, 0, 0);
  gamepad.refresh();
  gamepad.beginCapture();
  assert.equal(gamepad.getState().capturing, true);
  press(first, 2);
  tick();
  assert.equal(gamepad.getState().binding.buttonIndex, 2, 'capture binds the next pressed controller button');
  assert.equal(gamepad.getState().held, false, 'the button used for binding cannot immediately mute');
  assert.equal(bindings.at(-1).buttonIndex, 2);
  press(first, 2, 0);
  tick();
  assert.equal(gamepad.getState().holdArmed, true, 'binding arms after the bind press is released');
  press(first, 2);
  tick();
  assert.equal(gamepad.getState().held, true);

  gamepad.clearBinding();
  assert.equal(gamepad.getState().binding, null);
  assert.equal(gamepad.getState().held, false);
  assert.equal(tick, null, 'polling stops when no controller binding remains');
  assert.ok(intervalCleared >= 1);

  const unsupported = create({ getGamepads: null });
  assert.equal(unsupported.getState().supported, false);
  console.log('PASS: gamepad binding, hold/release, capture, disconnect, focus and unsupported states work.');
}

run();
