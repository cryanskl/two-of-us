const PUBLIC_KEYS = Object.freeze([
  "phase",
  "roundIndex",
  "totalRounds",
  "score",
  "drawerId",
  "secondsPerRound",
  "version",
]);

export function normalizeGuess(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function isCorrectGuess(guess, answer) {
  const normalizedGuess = normalizeGuess(guess);
  return normalizedGuess.length > 0 && normalizedGuess === normalizeGuess(answer);
}

export function startMatch({ memberIds, rounds, secondsPerRound, words, now, version = 0 }) {
  const players = uniqueIds(memberIds);
  if (players.length !== 2) throw new Error("开始比赛需要两位玩家。");
  if (!Number.isInteger(rounds) || rounds < 1) throw new Error("回合数必须是正整数。");
  if (!Number.isFinite(secondsPerRound) || secondsPerRound <= 0) {
    throw new Error("每回合秒数必须大于零。");
  }
  if (!Array.isArray(words) || words.length < rounds) throw new Error("题库数量不足。");

  const selectedWords = words.slice(0, rounds).map((word) => String(word).trim());
  if (selectedWords.some((word) => !word)) throw new Error("题目不能为空。");

  return {
    memberIds: players,
    phase: "playing",
    roundIndex: 0,
    totalRounds: rounds,
    score: 0,
    drawerId: drawerForRound(players, 0),
    answer: selectedWords[0],
    words: selectedWords,
    deadline: now + secondsPerRound * 1000,
    secondsPerRound,
    version: version + 1,
  };
}

export function completeRound(state, { reason, guess = "" } = {}) {
  if (state.phase !== "playing") return state;
  if (reason === "correct" && !isCorrectGuess(guess, state.answer)) return state;
  if (reason !== "correct" && reason !== "timeout") return state;

  return {
    ...state,
    phase: "round-result",
    score: state.score + (reason === "correct" ? 1 : 0),
    deadline: null,
    version: state.version + 1,
  };
}

export function advanceRound(state, now) {
  if (state.phase !== "round-result") return state;
  const nextRound = state.roundIndex + 1;
  if (nextRound >= state.totalRounds) {
    return {
      ...state,
      phase: "finished",
      drawerId: null,
      answer: null,
      deadline: null,
      version: state.version + 1,
    };
  }

  return {
    ...state,
    phase: "playing",
    roundIndex: nextRound,
    drawerId: drawerForRound(state.memberIds, nextRound),
    answer: state.words[nextRound],
    deadline: now + state.secondsPerRound * 1000,
    version: state.version + 1,
  };
}

export function drawerForRound(memberIds, roundIndex) {
  const players = uniqueIds(memberIds);
  if (players.length === 0 || !Number.isInteger(roundIndex) || roundIndex < 0) return null;
  return players[roundIndex % players.length];
}

export function toPublicState(state) {
  if (!state) return null;
  return Object.fromEntries(PUBLIC_KEYS.map((key) => [key, state[key]]));
}

export function acceptPublicState(current, incoming) {
  if (!incoming || !Number.isInteger(incoming.version)) return current;
  if (current && incoming.version <= current.version) return current;

  const next = {};
  for (const key of PUBLIC_KEYS) next[key] = incoming[key];
  return next;
}

export function normalizeSegment(value) {
  if (!value || typeof value !== "object") return null;
  const coordinates = [value.x1, value.y1, value.x2, value.y2].map(Number);
  if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) return null;
  const [x1, y1, x2, y2] = coordinates.map((coordinate) => Math.min(1, Math.max(0, coordinate)));
  return { x1, y1, x2, y2 };
}

function uniqueIds(memberIds) {
  return [...new Set((memberIds ?? []).map(String))];
}
