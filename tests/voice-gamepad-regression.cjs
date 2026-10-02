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
  let tick = null;
  let intervalStarted = 0;
  let intervalCleared = 0;
  const actions = [];
  const savedBindings = [];
  const gamepad = create({
    getGamepads: () => controllers,
    onAction: (binding, active) => actions.push([binding.id, binding.action, active]),
    onBinding: bindings => savedBindings.push(bindings),
    setIntervalFn: (callback, delay) => { assert.ok(delay >= 16); tick = callback; intervalStarted++; return 7; },
    clearIntervalFn: id => { assert.equal(id, 7); tick = null; intervalCleared++; }
  });

  assert.equal(gamepad.getState().supported, true);
  assert.equal(buttonLabel('standard', 0), 'A');
  assert.equal(buttonLabel('standard', 4), 'LB');
  assert.equal(buttonLabel('', 8), 'Button 9');
  assert.equal(normalizeBinding({ id: 'hold', action: 'hold-to-mute', buttonIndex: -1 }).action, 'hold-to-mute');
  assert.equal(normalizeBinding({ id: 'bad', action: 'unknown', buttonIndex: 0, padId: 'pad' }), null);
  assert.equal(normalizeBinding({ id: 'bad', action: 'toggle-mute', buttonIndex: 0 }), null);

  const controller = pad();
  controllers = [controller];
  gamepad.setBindings([
    { id: 'mute-hold', action: 'hold-to-mute', padId: controller.id, padIndex: 0, buttonIndex: 0, mapping: 'standard' },
    { id: 'mute-toggle', action: 'toggle-mute', padId: controller.id, padIndex: 0, buttonIndex: 1, mapping: 'standard' },
    { id: 'ptt', action: 'push-to-talk', padId: controller.id, padIndex: 0, buttonIndex: 2, mapping: 'standard' },
    { id: 'unbound', action: 'hold-to-mute', padId: '', padIndex: -1, buttonIndex: -1, mapping: '' }
  ]);
  assert.equal(gamepad.getState().connectedCount, 1);
  assert.equal(intervalStarted, 1);

  press(controller, 0);
  tick();
  assert.deepEqual(actions.at(-1), ['mute-hold', 'hold-to-mute', true]);
  press(controller, 0, 0);
  tick();
  assert.deepEqual(actions.at(-1), ['mute-hold', 'hold-to-mute', false]);

  press(controller, 1);
  tick();
  assert.deepEqual(actions.at(-1), ['mute-toggle', 'toggle-mute', true]);
  tick();
  assert.equal(actions.filter(([id, action, active]) => id === 'mute-toggle' && action === 'toggle-mute' && active).length, 1, 'toggle mute fires once per press, not continuously while held');
  press(controller, 1, 0);
  tick();
  assert.deepEqual(actions.at(-1), ['mute-toggle', 'toggle-mute', false]);

  press(controller, 2);
  tick();
  assert.deepEqual(actions.at(-1), ['ptt', 'push-to-talk', true]);
  controllers = [];
  tick();
  assert.equal(gamepad.getState().connectedCount, 0);
  assert.deepEqual(actions.at(-1), ['ptt', 'push-to-talk', false], 'controller disconnect always releases momentary actions');

  controllers = [controller];
  press(controller, 2, 0);
  gamepad.beginCapture('mute-hold');
  assert.equal(gamepad.getState().capturingId, 'mute-hold');
  press(controller, 3);
  tick();
  assert.equal(gamepad.getState().bindings.find(item => item.id === 'mute-hold').buttonIndex, 3);
  assert.equal(gamepad.getState().bindings.find(item => item.id === 'mute-hold').held, false, 'the bind press cannot immediately trigger an action');
  assert.equal(savedBindings.at(-1).find(item => item.id === 'mute-hold').buttonIndex, 3);
  press(controller, 3, 0);
  tick();
  press(controller, 3);
  tick();
  assert.deepEqual(actions.at(-1), ['mute-hold', 'hold-to-mute', true]);

  gamepad.removeBinding('mute-hold');
  assert.equal(gamepad.getState().bindings.some(item => item.id === 'mute-hold'), false);
  assert.equal(intervalCleared, 0, 'Polling stays active while other controller actions remain bound');
  gamepad.removeBinding('mute-toggle');
  gamepad.removeBinding('ptt');
  assert.ok(intervalCleared >= 1, 'Polling stops after the last bound action is removed');

  const unsupported = create({ getGamepads: null });
  assert.equal(unsupported.getState().supported, false);
  unsupported.setBindings([{ id: 'waiting', action: 'toggle-mute', buttonIndex: -1 }]);
  unsupported.beginCapture('waiting');
  assert.equal(unsupported.getState().capturingId, '', 'unsupported controller input must fail visibly instead of starting a phantom capture');
  console.log('PASS: controller actions, repeated toggle presses, capture, reconnect, disconnect cleanup and unavailable state work.');
}

run();
