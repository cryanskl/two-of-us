"use strict";

const config = require("./config.js");
const logic = require("./logic.js");

const DEFAULT_LIMITS = Object.freeze({
  maxVisitedStates: 120000,
  maxDepth: 96,
});

function deepFreeze(value, seen = new Set()) {
  if (
    value === null
    || (typeof value !== "object" && typeof value !== "function")
    || seen.has(value)
  ) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && Object.hasOwn(descriptor, "value")) {
      deepFreeze(descriptor.value, seen);
    }
  }
  return Object.freeze(value);
}

function cloneAction(action) {
  const copy = { type: action.type };
  if (Object.hasOwn(action, "direction")) copy.direction = action.direction;
  if (Object.hasOwn(action, "candidateIndex")) {
    copy.candidateIndex = action.candidateIndex;
  }
  if (Object.hasOwn(action, "boardIndex")) copy.boardIndex = action.boardIndex;
  return copy;
}

function enumerateActions(state, level) {
  if (!logic.isState(state, level)) return Object.freeze([]);
  const actions = [];

  if (state.phase === "slide") {
    for (const direction of config.DIRECTIONS) {
      const action = { type: logic.ACTIONS.SLIDE, direction };
      if (logic.reduce(state, action, level) !== state) actions.push(action);
    }
  } else if (state.phase === "share") {
    actions.push({ type: logic.ACTIONS.CONTINUE_SHARE });
  } else if (state.phase === "choose") {
    for (let candidateIndex = 0; candidateIndex < state.candidates.length; candidateIndex += 1) {
      actions.push({
        type: logic.ACTIONS.CHOOSE_CANDIDATE,
        candidateIndex,
      });
    }
  } else if (state.phase === "place") {
    const indexes = logic.getLegalPlacements(
      state.board,
      state.incomingDirection,
    );
    for (const boardIndex of indexes) {
      actions.push({ type: logic.ACTIONS.PLACE, boardIndex });
    }
  }

  return deepFreeze(actions);
}

function replayActions(level, actions) {
  if (!Array.isArray(actions)) {
    return deepFreeze({ ok: false, failedAt: 0, state: null });
  }
  let state = logic.createInitialState(level);
  if (!state) {
    return deepFreeze({ ok: false, failedAt: 0, state: null });
  }

  for (let index = 0; index < actions.length; index += 1) {
    const next = logic.reduce(state, actions[index], level);
    if (!next || next === state) {
      return deepFreeze({ ok: false, failedAt: index, state });
    }
    state = next;
  }
  return deepFreeze({ ok: true, failedAt: null, state });
}

function normalizeLimits(options) {
  const source = options && typeof options === "object" ? options : {};
  const maxVisitedStates = Number.isSafeInteger(source.maxVisitedStates)
    && source.maxVisitedStates > 0
    ? source.maxVisitedStates
    : DEFAULT_LIMITS.maxVisitedStates;
  const maxDepth = Number.isSafeInteger(source.maxDepth) && source.maxDepth > 0
    ? source.maxDepth
    : DEFAULT_LIMITS.maxDepth;
  return { maxVisitedStates, maxDepth };
}

function solvedResult(node, visitedStates, maxFrontier, generatedStates) {
  return deepFreeze({
    status: "solved",
    path: node.path.map(cloneAction),
    finalState: node.state,
    visitedStates,
    generatedStates,
    maxFrontier,
    depth: node.path.length,
  });
}

function terminalResult(status, visitedStates, maxFrontier, generatedStates) {
  return deepFreeze({
    status,
    path: null,
    finalState: null,
    visitedStates,
    generatedStates,
    maxFrontier,
    depth: null,
  });
}

function progressScore(state) {
  const archived = new Set(state.archivedThemes);
  let score = archived.size * 100000;
  let emptyCells = 0;

  for (const tile of state.board) {
    if (tile === null) {
      emptyCells += 1;
      continue;
    }
    if (!archived.has(tile.theme)) {
      score += (2 ** tile.tier) * 1000;
      score += tile.tier * tile.tier * 100;
    }
  }
  if (state.pendingTile && !archived.has(state.pendingTile.theme)) {
    score += 900;
  }
  score += emptyCells * 5;
  if (state.phase === "share") score += 40;
  if (state.phase === "place") score += 20;
  if (state.phase === "choose") score += 10;
  return score;
}

function higherPriority(left, right) {
  if (left.score !== right.score) return left.score > right.score;
  if (left.path.length !== right.path.length) {
    return left.path.length < right.path.length;
  }
  return left.sequence < right.sequence;
}

function pushHeap(heap, node) {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (higherPriority(heap[parent], heap[index])) break;
    [heap[parent], heap[index]] = [heap[index], heap[parent]];
    index = parent;
  }
}

function popHeap(heap) {
  if (heap.length === 1) return heap.pop();
  const first = heap[0];
  heap[0] = heap.pop();
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    let best = index;
    if (left < heap.length && higherPriority(heap[left], heap[best])) {
      best = left;
    }
    if (right < heap.length && higherPriority(heap[right], heap[best])) {
      best = right;
    }
    if (best === index) break;
    [heap[index], heap[best]] = [heap[best], heap[index]];
    index = best;
  }
  return first;
}

function solveLevel(level, options) {
  const limits = normalizeLimits(options);
  const initial = logic.createInitialState(level);
  if (!initial) {
    return terminalResult("invalid-level", 0, 0, 0);
  }

  const initialKey = logic.createCanonicalKey(initial, level);
  let sequence = 0;
  const queue = [{
    state: initial,
    path: [],
    score: progressScore(initial),
    sequence,
  }];
  const visited = new Set([initialKey]);
  let generatedStates = 1;
  let maxFrontier = 1;

  while (queue.length > 0) {
    const node = popHeap(queue);
    if (node.state.phase === "won") {
      return solvedResult(
        node,
        visited.size,
        maxFrontier,
        generatedStates,
      );
    }
    if (
      node.state.phase === "lost"
      || node.path.length >= limits.maxDepth
    ) {
      continue;
    }

    const actions = enumerateActions(node.state, level);
    for (const action of actions) {
      const next = logic.reduce(node.state, action, level);
      if (!next || next === node.state) continue;
      generatedStates += 1;
      const key = logic.createCanonicalKey(next, level);
      if (key === null || visited.has(key)) continue;
      if (visited.size >= limits.maxVisitedStates) {
        return terminalResult(
          "state-limit",
          visited.size,
          maxFrontier,
          generatedStates,
        );
      }
      visited.add(key);
      sequence += 1;
      pushHeap(queue, {
        state: next,
        path: node.path.concat(cloneAction(action)),
        score: progressScore(next),
        sequence,
      });
    }
    maxFrontier = Math.max(maxFrontier, queue.length);
  }

  return terminalResult("unsolved", visited.size, maxFrontier, generatedStates);
}

function analyzeSolution(level, actions) {
  if (!Array.isArray(actions)) return null;
  let state = logic.createInitialState(level);
  if (!state) return null;

  let meaningfulCandidateChoices = 0;
  let multiPlacementChoices = 0;
  const organizerSeats = new Set();
  const replenisherSeats = new Set();

  for (let index = 0; index < actions.length; index += 1) {
    if (state.phase === "slide") organizerSeats.add(state.organizer);
    if (state.phase === "choose") {
      replenisherSeats.add(state.organizer === "left" ? "right" : "left");
      const candidateKeys = new Set();
      for (const candidateAction of enumerateActions(state, level)) {
        const candidateState = logic.reduce(state, candidateAction, level);
        candidateKeys.add(logic.createCanonicalKey(candidateState, level));
      }
      if (candidateKeys.size >= 2) meaningfulCandidateChoices += 1;
    }
    if (
      state.phase === "place"
      && enumerateActions(state, level).length >= 2
    ) {
      multiPlacementChoices += 1;
    }

    const next = logic.reduce(state, actions[index], level);
    if (!next || next === state) return null;
    state = next;
  }

  const distinct = new Set(state.archivedThemes);
  return deepFreeze({
    solved: state.phase === "won",
    pathLength: actions.length,
    fullTurns: state.turn,
    meaningfulCandidateChoices,
    multiPlacementChoices,
    organizerSeats: [...organizerSeats].sort(),
    replenisherSeats: [...replenisherSeats].sort(),
    distinctChapters: distinct.size,
    repeatedChapters: state.archivedThemes.length - distinct.size,
    finalState: state,
  });
}

module.exports = deepFreeze({
  DEFAULT_LIMITS,
  enumerateActions,
  replayActions,
  solveLevel,
  analyzeSolution,
});
