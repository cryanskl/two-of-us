(function (root, factory) {
  "use strict";

  const constants = typeof module === "object" && module.exports
    ? require("./constants.js")
    : root.RicochetTankDuelConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.RicochetTankDuelInput = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants) {
  "use strict";

  if (!constants) throw new Error("RicochetTankDuelConstants must load before input.js");

  const { INPUT_BITS, deepFreeze } = constants;
  const ACTION_BITS = deepFreeze({
    forward: INPUT_BITS.FORWARD,
    reverse: INPUT_BITS.REVERSE,
    "turn-left": INPUT_BITS.TURN_LEFT,
    "turn-right": INPUT_BITS.TURN_RIGHT,
    fire: INPUT_BITS.FIRE_HELD,
  });
  const KEY_BINDINGS = deepFreeze({
    KeyW: [0, "forward"],
    KeyS: [0, "reverse"],
    KeyA: [0, "turn-left"],
    KeyD: [0, "turn-right"],
    KeyF: [0, "fire"],
    ArrowUp: [1, "forward"],
    ArrowDown: [1, "reverse"],
    ArrowLeft: [1, "turn-left"],
    ArrowRight: [1, "turn-right"],
    Enter: [1, "fire"],
  });

  function createInput(options = {}) {
    const eventRoot = options.eventRoot || window;
    const doc = options.document || document;
    const buttons = [...(options.buttons || doc.querySelectorAll("[data-seat][data-control]"))];
    const onPauseRequest = typeof options.onPauseRequest === "function"
      ? options.onPauseRequest
      : function () {};
    const sources = [new Map(), new Map()];
    const pointerBindings = new Map();
    const fireEdges = [false, false];
    const listeners = [];

    for (const seatSources of sources) {
      for (const action of Object.keys(ACTION_BITS)) seatSources.set(action, new Set());
    }

    function listen(target, type, handler, settings) {
      target.addEventListener(type, handler, settings);
      listeners.push(() => target.removeEventListener(type, handler, settings));
    }

    function updateButton(seat, action) {
      for (const button of buttons) {
        const buttonSeat = button.dataset.seat === "left" ? 0 : 1;
        if (buttonSeat !== seat || button.dataset.control !== action) continue;
        const pressed = sources[seat].get(action).size > 0;
        button.setAttribute("aria-pressed", String(pressed));
        if (pressed) button.dataset.pressed = "true";
        else delete button.dataset.pressed;
      }
    }

    function hold(seat, action, source) {
      const actionSources = sources[seat]?.get(action);
      if (!actionSources || actionSources.has(source)) return;
      const wasReleased = actionSources.size === 0;
      actionSources.add(source);
      if (action === "fire" && wasReleased) fireEdges[seat] = true;
      updateButton(seat, action);
    }

    function release(seat, action, source) {
      const actionSources = sources[seat]?.get(action);
      if (!actionSources) return;
      actionSources.delete(source);
      updateButton(seat, action);
    }

    function clearAll() {
      pointerBindings.clear();
      fireEdges[0] = false;
      fireEdges[1] = false;
      for (let seat = 0; seat < 2; seat += 1) {
        for (const [action, actionSources] of sources[seat]) {
          actionSources.clear();
          updateButton(seat, action);
        }
      }
    }

    function isTypingContext() {
      const activeElement = doc.activeElement;
      if (!activeElement) return false;
      return activeElement.matches("button, input, textarea, select, [contenteditable='true']");
    }

    function keydown(event) {
      if (event.code === "Escape") {
        if (!event.repeat) onPauseRequest("pause-only");
        return;
      }
      if (event.code === "KeyP") {
        if (!event.repeat) onPauseRequest("toggle");
        return;
      }
      const binding = KEY_BINDINGS[event.code];
      if (!binding || isTypingContext()) return;
      event.preventDefault();
      if (event.repeat) return;
      hold(binding[0], binding[1], `key:${event.code}`);
    }

    function keyup(event) {
      const binding = KEY_BINDINGS[event.code];
      if (!binding) return;
      release(binding[0], binding[1], `key:${event.code}`);
    }

    function pointerdown(event) {
      if (pointerBindings.has(event.pointerId)) return;
      const button = event.currentTarget;
      const seat = button.dataset.seat === "left" ? 0 : 1;
      const action = button.dataset.control;
      const source = `pointer:${event.pointerId}`;
      pointerBindings.set(event.pointerId, { seat, action, source, button });
      hold(seat, action, source);
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // A synthetic mouse or a browser losing contact can reject capture; release paths remain active.
      }
      event.preventDefault();
    }

    function releasePointer(event) {
      const binding = pointerBindings.get(event.pointerId);
      if (!binding) return;
      pointerBindings.delete(event.pointerId);
      release(binding.seat, binding.action, binding.source);
      if (event.type !== "lostpointercapture") {
        try {
          if (binding.button.hasPointerCapture(event.pointerId)) {
            binding.button.releasePointerCapture(event.pointerId);
          }
        } catch {
          // The pointer may already be cancelled by the user agent.
        }
      }
    }

    function consumeFrame() {
      const masks = [0, 0];
      for (let seat = 0; seat < 2; seat += 1) {
        for (const [action, actionSources] of sources[seat]) {
          if (actionSources.size > 0) masks[seat] |= ACTION_BITS[action];
        }
        if (fireEdges[seat]) masks[seat] |= INPUT_BITS.FIRE_EDGE;
        fireEdges[seat] = false;
      }
      return { leftMask: masks[0], rightMask: masks[1] };
    }

    listen(eventRoot, "keydown", keydown);
    listen(eventRoot, "keyup", keyup);
    listen(eventRoot, "blur", clearAll);
    listen(eventRoot, "pagehide", clearAll);
    listen(doc, "visibilitychange", () => {
      if (doc.visibilityState === "hidden") clearAll();
    });
    for (const button of buttons) {
      button.setAttribute("aria-pressed", "false");
      listen(button, "pointerdown", pointerdown);
      listen(button, "pointerup", releasePointer);
      listen(button, "pointercancel", releasePointer);
      listen(button, "lostpointercapture", releasePointer);
      listen(button, "contextmenu", (event) => event.preventDefault());
    }

    return Object.freeze({
      consumeFrame,
      clearAll,
      destroy() {
        clearAll();
        while (listeners.length > 0) listeners.pop()();
      },
    });
  }

  return deepFreeze({ ACTION_BITS, KEY_BINDINGS, createInput });
});
