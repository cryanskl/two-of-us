(function (root, factory) {
  "use strict";
  root.NESTED_GIFT_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LAYER_IDS = Object.freeze(["ribbon", "paper", "drawer", "knock"]);
  const PHASES = new Set(["intro", "layer", "note", "complete"]);
  const DRAWER_OPEN_THRESHOLD = 80;
  const KNOCKS_REQUIRED = 3;
  const DEFAULT_CONFIG = freezeConfig({
    recipient: "给愿意慢慢拆开的你",
    sender: "把心意一层层装好的人",
    introNote: "每拆开一层，就离我想说的话近一点。",
    layerMessages: [
      "第一层，是想把今天留给你的认真。",
      "第二层，是那些普通日子里悄悄累积的喜欢。",
      "第三层，是以后遇到难题也愿意一起拉开的抽屉。",
      "最后一层没有机关了，只剩一句想亲口告诉你的话。",
    ],
    finalTitle: "原来盒心一直是你",
    finalMessage: "谢谢你让许多普通时刻，都变成了我舍不得匆匆经过的日子。",
    invitation: "下一份惊喜，我们一起去生活里拆开。",
    acceptText: "再慢慢拆一遍",
  });

  function sanitizeConfig(input) {
    if (!input || typeof input !== "object" || !Array.isArray(input.layerMessages) || input.layerMessages.length !== 4) {
      return DEFAULT_CONFIG;
    }
    const candidate = {
      recipient: cleanText(input.recipient, 36),
      sender: cleanText(input.sender, 36),
      introNote: cleanText(input.introNote, 48),
      layerMessages: input.layerMessages.map((message) => cleanText(message, 72)),
      finalTitle: cleanText(input.finalTitle, 28),
      finalMessage: cleanText(input.finalMessage, 120),
      invitation: cleanText(input.invitation, 80),
      acceptText: cleanText(input.acceptText, 18),
    };
    if (!candidate.recipient || !candidate.sender || !candidate.introNote
      || candidate.layerMessages.some((message) => !message)
      || !candidate.finalTitle || !candidate.finalMessage || !candidate.invitation || !candidate.acceptText) {
      return DEFAULT_CONFIG;
    }
    return freezeConfig(candidate);
  }

  function createInitialState(revision = 0) {
    const safeRevision = Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
    return freezeState({
      phase: "intro",
      layerIndex: 0,
      ribbon: { left: false, right: false },
      peeledCorners: [false, false, false, false],
      drawerProgress: 0,
      knocks: 0,
      revision: safeRevision,
    });
  }

  function start(state) {
    if (!isGiftState(state)) return createInitialState();
    return state.phase === "intro" ? update(state, { phase: "layer" }) : state;
  }

  function releaseRibbon(state, side) {
    if (!isGiftState(state)) return createInitialState();
    if (state.phase !== "layer" || state.layerIndex !== 0 || !["left", "right"].includes(side) || state.ribbon[side]) {
      return state;
    }
    const ribbon = { ...state.ribbon, [side]: true };
    return update(state, {
      ribbon,
      phase: ribbon.left && ribbon.right ? "note" : "layer",
    });
  }

  function peelCorner(state, index) {
    if (!isGiftState(state)) return createInitialState();
    if (state.phase !== "layer" || state.layerIndex !== 1
      || !Number.isInteger(index) || index < 0 || index > 3 || state.peeledCorners[index]) return state;
    const peeledCorners = [...state.peeledCorners];
    peeledCorners[index] = true;
    return update(state, {
      peeledCorners,
      phase: peeledCorners.every(Boolean) ? "note" : "layer",
    });
  }

  function setDrawerProgress(state, value) {
    if (!isGiftState(state)) return createInitialState();
    if (state.phase !== "layer" || state.layerIndex !== 2 || !Number.isInteger(value)) return state;
    const drawerProgress = Math.min(100, Math.max(0, value));
    if (drawerProgress === state.drawerProgress) return state;
    return update(state, {
      drawerProgress,
      phase: drawerProgress >= DRAWER_OPEN_THRESHOLD ? "note" : "layer",
    });
  }

  function knock(state) {
    if (!isGiftState(state)) return createInitialState();
    if (state.phase !== "layer" || state.layerIndex !== 3) return state;
    const knocks = Math.min(KNOCKS_REQUIRED, state.knocks + 1);
    return update(state, {
      knocks,
      phase: knocks === KNOCKS_REQUIRED ? "note" : "layer",
    });
  }

  function continueOpening(state) {
    if (!isGiftState(state)) return createInitialState();
    if (state.phase !== "note") return state;
    return state.layerIndex === LAYER_IDS.length - 1
      ? update(state, { phase: "complete" })
      : update(state, { phase: "layer", layerIndex: state.layerIndex + 1 });
  }

  function restart(state) {
    if (!isGiftState(state)) return createInitialState();
    return state.phase === "complete" ? createInitialState(state.revision + 1) : state;
  }

  function isGiftState(value) {
    if (!value || typeof value !== "object" || !PHASES.has(value.phase)) return false;
    if (!Number.isInteger(value.layerIndex) || value.layerIndex < 0 || value.layerIndex >= LAYER_IDS.length) return false;
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) return false;
    if (!value.ribbon || typeof value.ribbon !== "object"
      || typeof value.ribbon.left !== "boolean" || typeof value.ribbon.right !== "boolean") return false;
    if (!Array.isArray(value.peeledCorners) || value.peeledCorners.length !== 4
      || !value.peeledCorners.every((item) => typeof item === "boolean")) return false;
    if (!Number.isInteger(value.drawerProgress) || value.drawerProgress < 0 || value.drawerProgress > 100) return false;
    if (!Number.isInteger(value.knocks) || value.knocks < 0 || value.knocks > KNOCKS_REQUIRED) return false;

    const ribbonDone = value.ribbon.left && value.ribbon.right;
    const paperDone = value.peeledCorners.every(Boolean);
    const drawerDone = value.drawerProgress >= DRAWER_OPEN_THRESHOLD;
    const knockDone = value.knocks === KNOCKS_REQUIRED;

    if (value.phase === "intro") {
      return value.layerIndex === 0 && !value.ribbon.left && !value.ribbon.right
        && !value.peeledCorners.some(Boolean) && value.drawerProgress === 0 && value.knocks === 0;
    }
    if (value.layerIndex === 0) {
      return !value.peeledCorners.some(Boolean) && value.drawerProgress === 0 && value.knocks === 0
        && (value.phase === "layer" ? !ribbonDone : value.phase === "note" && ribbonDone);
    }
    if (!ribbonDone) return false;
    if (value.layerIndex === 1) {
      return value.drawerProgress === 0 && value.knocks === 0
        && (value.phase === "layer" ? !paperDone : value.phase === "note" && paperDone);
    }
    if (!paperDone) return false;
    if (value.layerIndex === 2) {
      return value.knocks === 0
        && (value.phase === "layer" ? !drawerDone : value.phase === "note" && drawerDone);
    }
    if (!drawerDone) return false;
    if (value.phase === "layer") return !knockDone;
    if (value.phase === "note") return knockDone;
    return value.phase === "complete" && knockDone;
  }

  function cleanText(value, maxLength) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    const length = Array.from(text).length;
    return length >= 1 && length <= maxLength ? text : null;
  }

  function update(state, patch) {
    return freezeState({ ...state, ...patch, revision: state.revision + 1 });
  }

  function freezeConfig(value) {
    return Object.freeze({ ...value, layerMessages: Object.freeze([...value.layerMessages]) });
  }

  function freezeState(value) {
    return Object.freeze({
      ...value,
      ribbon: Object.freeze({ ...value.ribbon }),
      peeledCorners: Object.freeze([...value.peeledCorners]),
    });
  }

  return Object.freeze({
    LAYER_IDS,
    DRAWER_OPEN_THRESHOLD,
    KNOCKS_REQUIRED,
    DEFAULT_CONFIG,
    sanitizeConfig,
    createInitialState,
    start,
    releaseRibbon,
    peelCorner,
    setDrawerProgress,
    knock,
    continueOpening,
    restart,
    isGiftState,
  });
});
