(function (root, factory) {
  "use strict";
  root.NUMBER_TARGET_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TOTAL_ROUNDS = 3;
  const UINT32_RANGE = 2 ** 32;
  const PLAYERS = deepFreeze([
    { id: "coral", name: "珊瑚方" },
    { id: "blue", name: "蓝方" },
  ]);
  const OPERATORS = deepFreeze([
    { id: "+", symbol: "＋" },
    { id: "-", symbol: "−" },
    { id: "*", symbol: "×" },
  ]);
  const NUMBER_POOL = Object.freeze(Array.from({ length: 12 }, (_, index) => index + 1));
  const STEP_KINDS = Object.freeze([
    "first-number",
    "first-number",
    "operator",
    "operator",
    "second-number",
    "second-number",
  ]);
  const TURN_OFFSETS = Object.freeze([0, 1, 1, 0, 0, 1]);

  function createInitialState() {
    return freezeState({
      phase: "intro",
      roundIndex: 0,
      matchStarter: null,
      starter: null,
      stepIndex: 0,
      scores: [0, 0],
      target: null,
      availableNumbers: [],
      availableOperators: [],
      hands: [emptyHand(), emptyHand()],
      roundResult: null,
    });
  }

  function mapUint32ToIndex(value, maxExclusive) {
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) return null;
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) return null;
    const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
    return value < limit ? value % maxExclusive : null;
  }

  function createRoundPlan(randomIndex) {
    if (typeof randomIndex !== "function") return null;
    const pool = [...NUMBER_POOL];
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1);
      if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) return null;
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    const numbers = pool.slice(0, 8).sort((a, b) => a - b);
    const targets = possibleTargets(numbers);
    const targetIndex = randomIndex(targets.length);
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= targets.length) return null;
    return deepFreeze({ numbers, target: targets[targetIndex] });
  }

  function isValidRoundPlan(plan) {
    if (!plan || typeof plan !== "object" || !Array.isArray(plan.numbers)) return false;
    if (plan.numbers.length !== 8 || new Set(plan.numbers).size !== 8) return false;
    if (plan.numbers.some((value) => !NUMBER_POOL.includes(value))) return false;
    if (!Number.isInteger(plan.target) || plan.target < 10 || plan.target > 81) return false;
    return possibleTargets(plan.numbers).includes(plan.target);
  }

  function startMatch(state, plan, starter) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "intro" || !isValidRoundPlan(plan) || !isPlayerIndex(starter)) return state;
    return createRoundState({
      roundIndex: 0,
      matchStarter: starter,
      scores: [0, 0],
      plan,
    });
  }

  function pickNumber(state, value) {
    if (!isGameState(state)) return createInitialState();
    const kind = kindForStep(state.stepIndex);
    if (state.phase !== "drafting" || (kind !== "first-number" && kind !== "second-number")) return state;
    if (!Number.isInteger(value) || !state.availableNumbers.includes(value)) return state;
    const player = turnForStep(state.starter, state.stepIndex);
    const hands = cloneHands(state.hands);
    const slot = kind === "first-number" ? "left" : "right";
    if (hands[player][slot] !== null) return state;
    hands[player][slot] = value;
    return advancePick(state, {
      hands,
      availableNumbers: state.availableNumbers.filter((number) => number !== value),
    });
  }

  function pickOperator(state, operatorId) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "drafting" || kindForStep(state.stepIndex) !== "operator") return state;
    if (!operatorIds().includes(operatorId) || !state.availableOperators.includes(operatorId)) return state;
    const player = turnForStep(state.starter, state.stepIndex);
    const hands = cloneHands(state.hands);
    if (hands[player].operator !== null) return state;
    hands[player].operator = operatorId;
    return advancePick(state, {
      hands,
      availableOperators: state.availableOperators.filter((value) => value !== operatorId),
    });
  }

  function nextRound(state, plan) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "round-result" || state.roundIndex >= TOTAL_ROUNDS - 1 || !isValidRoundPlan(plan)) return state;
    return createRoundState({
      roundIndex: state.roundIndex + 1,
      matchStarter: state.matchStarter,
      scores: state.scores,
      plan,
    });
  }

  function showMatchResult(state) {
    if (!isGameState(state)) return createInitialState();
    if (state.phase !== "round-result" || state.roundIndex !== TOTAL_ROUNDS - 1) return state;
    return freezeState({ ...state, phase: "match-result" });
  }

  function restartMatch(state) {
    if (!isGameState(state)) return createInitialState();
    return state.phase === "match-result" ? createInitialState() : state;
  }

  function turnForStep(starter, stepIndex) {
    if (!isPlayerIndex(starter) || !Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= TURN_OFFSETS.length) return null;
    return (starter + TURN_OFFSETS[stepIndex]) % PLAYERS.length;
  }

  function kindForStep(stepIndex) {
    return Number.isInteger(stepIndex) && stepIndex >= 0 && stepIndex < STEP_KINDS.length
      ? STEP_KINDS[stepIndex]
      : null;
  }

  function evaluateHand(hand) {
    if (!isCompleteHand(hand)) return null;
    if (hand.operator === "+") return hand.left + hand.right;
    if (hand.operator === "-") return hand.left - hand.right;
    return hand.left * hand.right;
  }

  function scoreRound(target, hands) {
    if (!Number.isInteger(target) || !Array.isArray(hands) || hands.length !== 2 || hands.some((hand) => !isCompleteHand(hand))) return null;
    const values = hands.map(evaluateHand);
    const distances = values.map((value) => Math.abs(value - target));
    const winner = distances[0] === distances[1] ? null : distances[0] < distances[1] ? 0 : 1;
    return deepFreeze({
      target,
      values,
      distances,
      exact: distances.map((distance) => distance === 0),
      winner,
    });
  }

  function possibleTargets(numbers) {
    if (!Array.isArray(numbers)) return [];
    const targets = new Set();
    for (let leftIndex = 0; leftIndex < numbers.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < numbers.length; rightIndex += 1) {
        const left = numbers[leftIndex];
        const right = numbers[rightIndex];
        for (const value of [left + right, Math.abs(left - right), left * right]) {
          if (Number.isInteger(value) && value >= 10 && value <= 81) targets.add(value);
        }
      }
    }
    return [...targets].sort((a, b) => a - b);
  }

  function advancePick(state, patch) {
    const stepIndex = state.stepIndex + 1;
    const interim = {
      ...state,
      ...patch,
      stepIndex,
    };
    if (stepIndex < STEP_KINDS.length) return freezeState(interim);
    const roundResult = scoreRound(state.target, patch.hands);
    const scores = [...state.scores];
    if (roundResult.winner !== null) scores[roundResult.winner] += 1;
    return freezeState({
      ...interim,
      phase: "round-result",
      scores,
      roundResult,
    });
  }

  function createRoundState({ roundIndex, matchStarter, scores, plan }) {
    const starter = (matchStarter + roundIndex) % PLAYERS.length;
    return freezeState({
      phase: "drafting",
      roundIndex,
      matchStarter,
      starter,
      stepIndex: 0,
      scores: [...scores],
      target: plan.target,
      availableNumbers: [...plan.numbers],
      availableOperators: operatorIds(),
      hands: [emptyHand(), emptyHand()],
      roundResult: null,
    });
  }

  function isGameState(value) {
    if (!value || typeof value !== "object") return false;
    if (!Array.isArray(value.scores) || value.scores.length !== 2
      || value.scores.some((score) => !Number.isInteger(score) || score < 0 || score > TOTAL_ROUNDS)) return false;
    if (!Array.isArray(value.hands) || value.hands.length !== 2 || value.hands.some((hand) => !isPartialHand(hand))) return false;
    if (!Array.isArray(value.availableNumbers) || !Array.isArray(value.availableOperators)) return false;
    if (value.phase === "intro") {
      return value.roundIndex === 0 && value.matchStarter === null && value.starter === null
        && value.stepIndex === 0 && value.target === null && value.roundResult === null
        && value.availableNumbers.length === 0 && value.availableOperators.length === 0
        && value.scores.every((score) => score === 0) && value.hands.every(isEmptyHand);
    }
    if (!["drafting", "round-result", "match-result"].includes(value.phase)) return false;
    if (!Number.isInteger(value.roundIndex) || value.roundIndex < 0 || value.roundIndex >= TOTAL_ROUNDS) return false;
    if (!isPlayerIndex(value.matchStarter) || !isPlayerIndex(value.starter)
      || value.starter !== (value.matchStarter + value.roundIndex) % PLAYERS.length) return false;
    if (!Number.isInteger(value.target) || value.target < 10 || value.target > 81) return false;
    if (!Number.isInteger(value.stepIndex) || value.stepIndex < 0 || value.stepIndex > STEP_KINDS.length) return false;
    if (value.availableNumbers.some((number) => !NUMBER_POOL.includes(number))) return false;
    if (new Set(value.availableNumbers).size !== value.availableNumbers.length) return false;
    if (value.availableOperators.some((operator) => !operatorIds().includes(operator))) return false;
    if (new Set(value.availableOperators).size !== value.availableOperators.length) return false;
    const usedNumbers = value.hands.flatMap((hand) => [hand.left, hand.right]).filter((number) => number !== null);
    const allNumbers = [...usedNumbers, ...value.availableNumbers];
    if (allNumbers.length !== 8 || new Set(allNumbers).size !== 8) return false;
    const usedOperators = value.hands.map((hand) => hand.operator).filter((operator) => operator !== null);
    const allOperators = [...usedOperators, ...value.availableOperators];
    if (allOperators.length !== OPERATORS.length || new Set(allOperators).size !== OPERATORS.length) return false;
    const filled = value.hands.reduce((count, hand) => count
      + Number(hand.left !== null) + Number(hand.operator !== null) + Number(hand.right !== null), 0);
    if (filled !== value.stepIndex) return false;
    if (value.phase === "drafting") return value.stepIndex < STEP_KINDS.length && value.roundResult === null;
    if (value.stepIndex !== STEP_KINDS.length || !isRoundResult(value.roundResult, value.target, value.hands)) return false;
    return value.phase !== "match-result" || value.roundIndex === TOTAL_ROUNDS - 1;
  }

  function isRoundResult(result, target, hands) {
    const expected = scoreRound(target, hands);
    return expected !== null && result && result.target === expected.target && result.winner === expected.winner
      && arraysEqual(result.values, expected.values) && arraysEqual(result.distances, expected.distances)
      && arraysEqual(result.exact, expected.exact);
  }

  function isPartialHand(hand) {
    return hand && typeof hand === "object"
      && (hand.left === null || NUMBER_POOL.includes(hand.left))
      && (hand.right === null || NUMBER_POOL.includes(hand.right))
      && (hand.operator === null || operatorIds().includes(hand.operator));
  }

  function isCompleteHand(hand) {
    return isPartialHand(hand) && hand.left !== null && hand.operator !== null && hand.right !== null;
  }

  function emptyHand() {
    return { left: null, operator: null, right: null };
  }

  function isEmptyHand(hand) {
    return hand.left === null && hand.operator === null && hand.right === null;
  }

  function cloneHands(hands) {
    return hands.map((hand) => ({ ...hand }));
  }

  function operatorIds() {
    return OPERATORS.map((operator) => operator.id);
  }

  function isPlayerIndex(value) {
    return value === 0 || value === 1;
  }

  function arraysEqual(left, right) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => value === right[index]);
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const child of Object.values(value)) deepFreeze(child);
    return Object.freeze(value);
  }

  function freezeState(value) {
    return deepFreeze(value);
  }

  return Object.freeze({
    TOTAL_ROUNDS,
    PLAYERS,
    OPERATORS,
    NUMBER_POOL,
    createInitialState,
    mapUint32ToIndex,
    createRoundPlan,
    isValidRoundPlan,
    startMatch,
    pickNumber,
    pickOperator,
    nextRound,
    showMatchResult,
    restartMatch,
    turnForStep,
    kindForStep,
    evaluateHand,
    scoreRound,
  });
});
