(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FlightDeskVoiceGamepad = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const ACTIONS = new Set(['hold-to-mute', 'toggle-mute', 'push-to-talk']);
  const STANDARD_BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'Left stick', 'Right stick', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Guide'];

  function buttonLabel(mapping, index) {
    if (!Number.isInteger(index) || index < 0) return '';
    return mapping === 'standard' && STANDARD_BUTTONS[index] ? STANDARD_BUTTONS[index] : `Button ${index + 1}`;
  }

  function normalizeBinding(value) {
    if (!value || typeof value.id !== 'string' || !value.id || !ACTIONS.has(value.action)) return null;
    const padId = typeof value.padId === 'string' ? value.padId.slice(0, 160) : '';
    const padIndex = Number.isInteger(value.padIndex) && value.padIndex >= 0 ? value.padIndex : -1;
    const buttonIndex = Number.isInteger(value.buttonIndex) && value.buttonIndex >= 0 ? value.buttonIndex : -1;
    if (buttonIndex >= 0 && !padId && padIndex < 0) return null;
    return { id: value.id.slice(0, 80), action: value.action, padId, padIndex, buttonIndex, mapping: value.mapping === 'standard' ? 'standard' : '' };
  }

  function isPressed(button) {
    return !!button?.pressed || Number(button?.value) > 0.55;
  }

  function create({
    getGamepads,
    onAction = () => {},
    onBinding = () => {},
    onState = () => {},
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
    eventTarget = typeof window === 'object' ? window : null,
    pollIntervalMs = 25
  } = {}) {
    if (typeof getGamepads !== 'function') {
      getGamepads = typeof navigator === 'object' && typeof navigator.getGamepads === 'function'
        ? () => navigator.getGamepads()
        : null;
    }
    const supported = typeof getGamepads === 'function';
    let bindings = [];
    let captureId = '';
    let captureArmed = false;
    let timer = null;
    let state = { supported, connectedCount: 0, capturingId: '', captureArmed: false, bindings: [] };
    const runtime = new Map();

    function pads() {
      try { return Array.from(getGamepads?.() || []).filter(Boolean); }
      catch { return []; }
    }

    function isBound(binding) {
      return binding.buttonIndex >= 0 && (!!binding.padId || binding.padIndex >= 0);
    }

    function matchingPad(items, binding) {
      if (binding.padId) {
        const sameId = items.filter(pad => String(pad.id || '') === binding.padId);
        return sameId.find(pad => Number(pad.index) === binding.padIndex) || sameId[0] || null;
      }
      return items.find(pad => Number(pad.index) === binding.padIndex) || null;
    }

    function emit(items = pads()) {
      state = {
        supported,
        connectedCount: items.length,
        capturingId: captureId,
        captureArmed,
        bindings: bindings.map(binding => {
          const pad = isBound(binding) ? matchingPad(items, binding) : null;
          return {
            ...binding,
            connected: !!pad,
            held: !!runtime.get(binding.id)?.pressed,
            buttonLabel: buttonLabel(binding.mapping, binding.buttonIndex),
            controllerLabel: pad ? `Controller ${(Number(pad.index) || 0) + 1}` : ''
          };
        })
      };
      onState(state);
    }

    function changeAction(binding, pressed) {
      const item = runtime.get(binding.id);
      if (!item || item.pressed === pressed) return;
      item.pressed = pressed;
      onAction({ ...binding }, pressed);
    }

    function stopPolling() {
      if (timer !== null) {
        clearIntervalFn(timer);
        timer = null;
      }
    }

    function ensurePolling() {
      if (supported && timer === null) timer = setIntervalFn(poll, Math.max(16, Number(pollIntervalMs) || 25));
    }

    function poll() {
      const items = pads();
      const pressed = [];
      for (const pad of items) {
        for (let index = 0; index < (pad.buttons?.length || 0); index++) {
          if (isPressed(pad.buttons[index])) pressed.push({ pad, index });
        }
      }

      if (captureId) {
        if (!pressed.length) captureArmed = true;
        else if (captureArmed) {
          const selected = pressed[0];
          const existingIndex = bindings.findIndex(binding => binding.id === captureId);
          if (existingIndex >= 0) {
            const old = bindings[existingIndex];
            const next = normalizeBinding({
              ...old,
              padId: String(selected.pad.id || '').slice(0, 160),
              padIndex: Number.isInteger(selected.pad.index) ? selected.pad.index : -1,
              buttonIndex: selected.index,
              mapping: selected.pad.mapping || ''
            });
            if (next) {
              bindings[existingIndex] = next;
              runtime.set(next.id, { pressed: false, armed: false });
              captureId = '';
              captureArmed = false;
              onBinding(bindings.map(binding => ({ ...binding })));
            }
          }
        }
      }

      for (const binding of bindings) {
        if (!isBound(binding)) continue;
        const item = runtime.get(binding.id);
        if (!item) continue;
        const pad = matchingPad(items, binding);
        const button = pad?.buttons?.[binding.buttonIndex];
        const down = !!pad && isPressed(button);
        if (!item.armed) {
          if (!down) item.armed = true;
          continue;
        }
        changeAction(binding, down);
      }

      emit(items);
      if (!bindings.some(isBound) && !captureId) stopPolling();
    }

    function setBindings(values) {
      for (const binding of bindings) changeAction(binding, false);
      const unique = new Map();
      for (const value of Array.isArray(values) ? values : []) {
        const binding = normalizeBinding(value);
        if (binding && !unique.has(binding.id)) unique.set(binding.id, binding);
      }
      bindings = [...unique.values()];
      runtime.clear();
      for (const binding of bindings) runtime.set(binding.id, { pressed: false, armed: true });
      if (bindings.some(isBound) || captureId) {
        ensurePolling();
        poll();
      } else {
        emit();
        stopPolling();
      }
      return getState();
    }

    function beginCapture(id) {
      if (!supported || !bindings.some(binding => binding.id === id)) return getState();
      captureId = id;
      captureArmed = false;
      ensurePolling();
      poll();
      return getState();
    }

    function cancelCapture() {
      captureId = '';
      captureArmed = false;
      poll();
      return getState();
    }

    function removeBinding(id) {
      if (captureId === id) cancelCapture();
      return setBindings(bindings.filter(binding => binding.id !== id));
    }

    function refresh() {
      if (bindings.some(isBound) || captureId) {
        ensurePolling();
        poll();
      } else emit();
      return getState();
    }

    function getState() {
      return { ...state, bindings: state.bindings.map(binding => ({ ...binding })) };
    }

    function handleGamepadChange() { poll(); }
    eventTarget?.addEventListener?.('gamepadconnected', handleGamepadChange);
    eventTarget?.addEventListener?.('gamepaddisconnected', handleGamepadChange);
    emit();

    return {
      setBindings,
      beginCapture,
      cancelCapture,
      removeBinding,
      refresh,
      getState,
      buttonLabel,
      close() {
        cancelCapture();
        for (const binding of bindings) changeAction(binding, false);
        stopPolling();
        eventTarget?.removeEventListener?.('gamepadconnected', handleGamepadChange);
        eventTarget?.removeEventListener?.('gamepaddisconnected', handleGamepadChange);
        emit();
      }
    };
  }

  return { ACTIONS: [...ACTIONS], create, buttonLabel, normalizeBinding, isPressed };
});
