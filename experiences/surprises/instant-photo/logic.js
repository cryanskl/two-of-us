(function (root, factory) {
  "use strict";
  root.INSTANT_PHOTO_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SHAKES_REQUIRED = 9;
  const DIRECTIONS = Object.freeze(["left", "right"]);
  const PHASES = new Set(["intro", "ejecting", "developing", "complete"]);
  const DEFAULT_CONFIG = freezeConfig({
    photo: "./assets/demo-bicycles.png",
    title: "那天，风刚刚好",
    stamp: "海边 · 某个慢下来的傍晚",
    caption: "两辆车停在海边，像在等我们把步调放慢。",
    finalNote: "下一张，换我们一起出现在画面里。",
  });

  function sanitizeConfig(input) {
    if (!input || typeof input !== "object") return DEFAULT_CONFIG;
    const candidate = {
      photo: cleanString(input.photo),
      title: cleanString(input.title),
      stamp: cleanString(input.stamp),
      caption: cleanString(input.caption),
      finalNote: cleanString(input.finalNote),
    };
    if (!isSafePhotoPath(candidate.photo)
      || !hasLength(candidate.title, 1, 24)
      || !hasLength(candidate.stamp, 1, 32)
      || !hasLength(candidate.caption, 1, 70)
      || !hasLength(candidate.finalNote, 1, 80)) return DEFAULT_CONFIG;
    return freezeConfig(candidate);
  }

  function isSafePhotoPath(value) {
    if (!hasLength(value, 1, 160)
      || value.startsWith("/")
      || value.startsWith("//")
      || value.includes("\\")
      || value.includes("?")
      || value.includes("#")
      || /^[a-z][a-z\d+.-]*:/i.test(value)) return false;
    const normalized = value.startsWith("./") ? value.slice(2) : value;
    const segments = normalized.split("/");
    if (segments.some((segment) => !segment || segment === "." || segment === "..")) return false;
    return /\.(?:jpe?g|png|webp|avif)$/i.test(segments.at(-1));
  }

  function createInitialState(ejectToken = 0) {
    const safeToken = Number.isInteger(ejectToken) && ejectToken >= 0 ? ejectToken : 0;
    return freezeState({
      phase: "intro",
      acceptedShakes: 0,
      lastDirection: null,
      ejectToken: safeToken,
    });
  }

  function capture(state) {
    if (!isPhotoState(state)) return createInitialState();
    return state.phase === "intro"
      ? update(state, { phase: "ejecting", ejectToken: state.ejectToken + 1 })
      : state;
  }

  function finishEject(state, token) {
    if (!isPhotoState(state)) return createInitialState();
    return state.phase === "ejecting" && token === state.ejectToken
      ? update(state, { phase: "developing" })
      : state;
  }

  function shake(state, direction) {
    if (!isPhotoState(state)) return createInitialState();
    if (state.phase !== "developing" || !DIRECTIONS.includes(direction) || direction === state.lastDirection) return state;
    const acceptedShakes = state.acceptedShakes + 1;
    return update(state, {
      phase: acceptedShakes === SHAKES_REQUIRED ? "complete" : "developing",
      acceptedShakes,
      lastDirection: direction,
    });
  }

  function restart(state) {
    if (!isPhotoState(state)) return createInitialState();
    return state.phase === "complete" ? createInitialState(state.ejectToken) : state;
  }

  function getProgress(state) {
    return isPhotoState(state) ? Math.round(state.acceptedShakes / SHAKES_REQUIRED * 100) : 0;
  }

  function isPhotoState(value) {
    if (!value || typeof value !== "object" || !PHASES.has(value.phase)) return false;
    if (!Number.isInteger(value.acceptedShakes) || value.acceptedShakes < 0 || value.acceptedShakes > SHAKES_REQUIRED) return false;
    if (value.lastDirection !== null && !DIRECTIONS.includes(value.lastDirection)) return false;
    if (!Number.isInteger(value.ejectToken) || value.ejectToken < 0) return false;
    if ((value.phase === "intro" || value.phase === "ejecting")
      && (value.acceptedShakes !== 0 || value.lastDirection !== null)) return false;
    if (value.phase === "developing"
      && (value.acceptedShakes >= SHAKES_REQUIRED
        || (value.acceptedShakes === 0 ? value.lastDirection !== null : value.lastDirection === null))) return false;
    return value.phase !== "complete"
      || (value.acceptedShakes === SHAKES_REQUIRED && value.lastDirection !== null);
  }

  function cleanString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function hasLength(value, min, max) {
    return typeof value === "string" && value.length >= min && value.length <= max;
  }

  function freezeConfig(value) {
    return Object.freeze({ ...value });
  }

  function freezeState(value) {
    return Object.freeze({ ...value });
  }

  function update(state, patch) {
    return freezeState({ ...state, ...patch });
  }

  return Object.freeze({
    SHAKES_REQUIRED,
    DIRECTIONS,
    DEFAULT_CONFIG,
    sanitizeConfig,
    isSafePhotoPath,
    createInitialState,
    capture,
    finishEject,
    shake,
    restart,
    getProgress,
  });
});
