(function (root, factory) {
  "use strict";

  let configApi = root && root.MemoryBidConfig;
  if (!configApi && typeof module === "object" && module.exports && typeof require === "function") {
    try {
      configApi = require("./config.js");
    } catch {
      configApi = null;
    }
  }
  const api = factory(configApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.MemoryBidLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (configApi) {
  "use strict";

  const VERSION = 1;
  const ROUND_COUNT = 4;
  const SEQUENCE_LENGTH = 8;
  const MIN_BID = 2;
  const MAX_BID = 8;
  const MAX_TEXT_POINTS = 400;
  const MAX_NAME_POINTS = 16;
  const MAX_LABEL_POINTS = 20;
  const MAX_DESCRIPTION_POINTS = 80;
  const MAX_NOTE_POINTS = 240;
  const UINT32_RANGE = 0x100000000;

  const ITEM_IDS = deepFreeze(["ticket", "camera", "shell", "key", "mug", "map"]);
  const PHASES = deepFreeze(["intro", "reveal", "bidding", "proof", "round-result", "match-result"]);
  const PLAYBACK_MODES = deepFreeze(["auto", "manual"]);
  const PAUSE_REASONS = deepFreeze(["manual", "blur", "hidden"]);
  const ACTION_FIELDS = deepFreeze({
    START_MATCH: ["seed", "playbackMode"],
    SHOW_REVEAL_ITEM: ["generation"],
    HIDE_REVEAL_ITEM: ["generation"],
    ADVANCE_MANUAL_REVEAL: [],
    PAUSE_REVEAL: ["reason"],
    RESUME_REVEAL: [],
    PLACE_BID: ["playerIndex", "amount"],
    PASS_BID: ["playerIndex"],
    ADD_PROOF: ["itemId"],
    REMOVE_PROOF_SLOT: ["index"],
    CLEAR_PROOF: [],
    SUBMIT_PROOF: [],
    FORFEIT_PROOF: [],
    ADVANCE_ROUND: [],
    RESTART_MATCH: [],
  });
  const ACTION_TYPES = deepFreeze(Object.keys(ACTION_FIELDS));
  const STATE_KEYS = deepFreeze([
    "version", "phase", "seed", "playbackMode", "roundIndex", "revealIndex", "revealVisible",
    "revealPaused", "pauseReason", "playbackGeneration", "sequences", "bids", "currentBid",
    "highBidderIndex", "activeBidderIndex", "proofDraft", "scores", "roundResults",
    "announcementSerial", "lastNotice",
  ]);
  const BID_KEYS = deepFreeze(["playerIndex", "amount"]);
  const RESULT_KEYS = deepFreeze([
    "roundIndex", "openerIndex", "bids", "bidAmount", "proverIndex", "sequence", "proof",
    "forfeited", "success", "mismatchIndex", "pointWinnerIndex", "scoreAfter",
  ]);
  const NOTICE_IDS = deepFreeze([
    null, "match-started", "reveal-shown", "reveal-hidden", "reveal-advanced", "reveal-paused",
    "reveal-resumed", "bid-placed", "bid-passed", "proof-started", "proof-updated",
    "proof-cleared", "proof-incomplete", "round-success", "round-failed", "round-forfeited",
    "round-advanced", "match-complete",
  ]);

  const FALLBACK_DEFAULT_CONFIG = deepFreeze({
    title: "这一串，我还记得",
    subtitle: "看过八件旧物，再把记得的数量报得更高。",
    intro: "四轮里，你们各先开价两次。最高报价的人按顺序证明；全对自己得分，错一件或认输则对方得分。",
    playerNames: ["你", "TA"],
    itemText: {
      ticket: { label: "旧车票", description: "去过的地方，留下一道缺口" },
      camera: { label: "小相机", description: "把一秒钟收进镜头" },
      shell: { label: "海边贝壳", description: "带回一小段潮声" },
      key: { label: "房间钥匙", description: "住过一晚的门牌记忆" },
      mug: { label: "搪瓷杯", description: "清晨一起喝过的热气" },
      map: { label: "折叠地图", description: "绕远也算旅程的一部分" },
    },
    defaultMatchNote: "四串旧物都收好了，今晚谁记得更多，也留一点给彼此慢慢想起。",
  });
  const DEFAULT_CONFIG = isUsableConfig(configApi && configApi.DEFAULT_CONFIG)
    ? configApi.DEFAULT_CONFIG
    : FALLBACK_DEFAULT_CONFIG;
  const strategyByConfig = new WeakMap();

  function createInitialState() {
    return freezeState({
      version: VERSION,
      phase: "intro",
      seed: null,
      playbackMode: null,
      roundIndex: 0,
      revealIndex: 0,
      revealVisible: false,
      revealPaused: false,
      pauseReason: null,
      playbackGeneration: 0,
      sequences: [],
      bids: [],
      currentBid: null,
      highBidderIndex: null,
      activeBidderIndex: null,
      proofDraft: [],
      scores: [0, 0],
      roundResults: [],
      announcementSerial: 0,
      lastNotice: null,
    });
  }

  function generateSequences(seed) {
    if (arguments.length !== 1 || !isUint32(seed)) throw new TypeError("seed must be a non-zero uint32");
    const random = createRandom(seed);
    const rounds = [];
    for (let round = 0; round < ROUND_COUNT; round += 1) {
      const firstDuplicate = random.int(ITEM_IDS.length);
      const secondRaw = random.int(ITEM_IDS.length - 1);
      const secondDuplicate = secondRaw >= firstDuplicate ? secondRaw + 1 : secondRaw;
      const sequence = ITEM_IDS.slice();
      sequence.push(ITEM_IDS[firstDuplicate], ITEM_IDS[secondDuplicate]);
      for (let index = sequence.length - 1; index > 0; index -= 1) {
        const target = random.int(index + 1);
        [sequence[index], sequence[target]] = [sequence[target], sequence[index]];
      }
      repairAdjacent(sequence);
      rounds.push(sequence);
    }
    return deepFreeze(rounds);
  }

  function sanitizeConfig(candidate, composeStrategy) {
    const source = isPlainObject(candidate) ? candidate : null;
    const safe = deepFreeze({
      title: cleanConfigText(source, "title", DEFAULT_CONFIG.title, MAX_TEXT_POINTS),
      subtitle: cleanConfigText(source, "subtitle", DEFAULT_CONFIG.subtitle, MAX_TEXT_POINTS),
      intro: cleanConfigText(source, "intro", DEFAULT_CONFIG.intro, MAX_TEXT_POINTS),
      playerNames: sanitizePlayerNames(safeOwnData(source, "playerNames")),
      itemText: sanitizeItemText(safeOwnData(source, "itemText")),
      defaultMatchNote: cleanConfigText(
        source,
        "defaultMatchNote",
        DEFAULT_CONFIG.defaultMatchNote,
        MAX_NOTE_POINTS,
      ),
    });
    const strategy = typeof composeStrategy === "function"
      ? composeStrategy
      : typeof configApi?.composeMatchNote === "function"
        ? configApi.composeMatchNote
        : null;
    if (strategy) strategyByConfig.set(safe, strategy);
    return safe;
  }

  function reduceMemoryBid(state, action) {
    assertState(state);
    const parsed = parseAction(action);
    if (parsed.type === "RESTART_MATCH") return state.phase === "match-result" ? createInitialState() : state;
    if (state.phase === "match-result") return state;

    switch (parsed.type) {
      case "START_MATCH":
        if (state.phase !== "intro") return state;
        return transition(state, {
          phase: "reveal",
          seed: parsed.seed,
          playbackMode: parsed.playbackMode,
          revealVisible: parsed.playbackMode === "manual",
          playbackGeneration: state.playbackGeneration + 1,
          sequences: generateSequences(parsed.seed),
          lastNotice: "match-started",
        });
      case "SHOW_REVEAL_ITEM":
        if (state.phase !== "reveal" || state.playbackMode !== "auto" || state.revealPaused
          || state.revealVisible || parsed.generation !== state.playbackGeneration) return state;
        return transition(state, {
          revealVisible: true,
          playbackGeneration: state.playbackGeneration + 1,
          lastNotice: "reveal-shown",
        });
      case "HIDE_REVEAL_ITEM":
        if (state.phase !== "reveal" || state.playbackMode !== "auto" || state.revealPaused
          || !state.revealVisible || parsed.generation !== state.playbackGeneration) return state;
        return state.revealIndex === SEQUENCE_LENGTH - 1
          ? enterBidding(state, state.playbackGeneration + 1)
          : transition(state, {
            revealIndex: state.revealIndex + 1,
            revealVisible: false,
            playbackGeneration: state.playbackGeneration + 1,
            lastNotice: "reveal-hidden",
          });
      case "ADVANCE_MANUAL_REVEAL":
        if (state.phase !== "reveal" || state.playbackMode !== "manual" || state.revealPaused
          || !state.revealVisible) return state;
        return state.revealIndex === SEQUENCE_LENGTH - 1
          ? enterBidding(state, state.playbackGeneration + 1)
          : transition(state, {
            revealIndex: state.revealIndex + 1,
            revealVisible: true,
            playbackGeneration: state.playbackGeneration + 1,
            lastNotice: "reveal-advanced",
          });
      case "PAUSE_REVEAL":
        if (state.phase !== "reveal" || state.revealPaused) return state;
        return transition(state, {
          revealVisible: false,
          revealPaused: true,
          pauseReason: parsed.reason,
          playbackGeneration: state.playbackGeneration + 1,
          lastNotice: "reveal-paused",
        });
      case "RESUME_REVEAL":
        if (state.phase !== "reveal" || !state.revealPaused) return state;
        return transition(state, {
          revealVisible: state.playbackMode === "manual",
          revealPaused: false,
          pauseReason: null,
          playbackGeneration: state.playbackGeneration + 1,
          lastNotice: "reveal-resumed",
        });
      case "PLACE_BID":
        return placeBid(state, parsed);
      case "PASS_BID":
        if (state.phase !== "bidding") return state;
        if (state.bids.length === 0) throw new TypeError("cannot pass before the opening bid");
        if (parsed.playerIndex !== state.activeBidderIndex) throw new TypeError("only the active bidder may pass");
        return transition(state, {
          phase: "proof",
          activeBidderIndex: null,
          lastNotice: "bid-passed",
        });
      case "ADD_PROOF":
        if (state.phase !== "proof" || state.proofDraft.length >= state.currentBid) return state;
        return transition(state, {
          proofDraft: [...state.proofDraft, parsed.itemId],
          lastNotice: "proof-updated",
        });
      case "REMOVE_PROOF_SLOT":
        if (state.phase !== "proof" || parsed.index >= state.proofDraft.length) return state;
        return transition(state, {
          proofDraft: removeAt(state.proofDraft, parsed.index),
          lastNotice: "proof-updated",
        });
      case "CLEAR_PROOF":
        if (state.phase !== "proof" || state.proofDraft.length === 0) return state;
        return transition(state, { proofDraft: [], lastNotice: "proof-cleared" });
      case "SUBMIT_PROOF":
        if (state.phase !== "proof") return state;
        if (state.proofDraft.length !== state.currentBid) return noticeOnly(state, "proof-incomplete");
        return settleRound(state, false);
      case "FORFEIT_PROOF":
        return state.phase === "proof" ? settleRound(state, true) : state;
      case "ADVANCE_ROUND":
        return advanceRound(state);
      default:
        return state;
    }
  }

  function assertState(state) {
    const seen = new WeakSet();
    assertExactRecord(state, STATE_KEYS, "state", seen);
    if (state.version !== VERSION || !PHASES.includes(state.phase)) failState();
    if (state.seed !== null && !isUint32(state.seed)) failState();
    if (state.playbackMode !== null && !PLAYBACK_MODES.includes(state.playbackMode)) failState();
    if (!Number.isInteger(state.roundIndex) || state.roundIndex < 0 || state.roundIndex >= ROUND_COUNT) failState();
    if (!Number.isInteger(state.revealIndex) || state.revealIndex < 0 || state.revealIndex >= SEQUENCE_LENGTH) failState();
    if (typeof state.revealVisible !== "boolean" || typeof state.revealPaused !== "boolean") failState();
    if (state.pauseReason !== null && !PAUSE_REASONS.includes(state.pauseReason)) failState();
    if (!Number.isSafeInteger(state.playbackGeneration) || state.playbackGeneration < 0) failState();
    if (!Number.isSafeInteger(state.announcementSerial) || state.announcementSerial < 0
      || state.playbackGeneration > state.announcementSerial) failState();
    if (!NOTICE_IDS.includes(state.lastNotice)) failState();
    assertUniqueArray(state.sequences, "sequences", seen);
    assertUniqueArray(state.bids, "bids", seen);
    assertUniqueArray(state.proofDraft, "proofDraft", seen);
    assertUniqueArray(state.scores, "scores", seen);
    assertUniqueArray(state.roundResults, "roundResults", seen);
    if (!isIndexOrNull(state.highBidderIndex) || !isIndexOrNull(state.activeBidderIndex)) failState();
    if (state.currentBid !== null && !isBidAmount(state.currentBid)) failState();
    if (!isItemList(state.proofDraft, 0, MAX_BID) || !isScores(state.scores)) failState();

    if (state.phase === "intro") {
      if (state.seed !== null || state.playbackMode !== null || state.roundIndex !== 0 || state.revealIndex !== 0
        || state.revealVisible || state.revealPaused || state.pauseReason !== null || state.playbackGeneration !== 0
        || state.sequences.length || state.bids.length || state.currentBid !== null || state.highBidderIndex !== null
        || state.activeBidderIndex !== null || state.proofDraft.length || state.scores[0] || state.scores[1]
        || state.roundResults.length) failState();
      return state;
    }

    if (!isUint32(state.seed) || !PLAYBACK_MODES.includes(state.playbackMode) || state.playbackGeneration < 1) failState();
    assertSequences(state.sequences, state.seed, seen);
    const expectedScores = validateResults(state.roundResults, state.sequences, seen);
    if (!sameArray(state.scores, expectedScores)) failState();
    const expectedResultCount = state.phase === "round-result" ? state.roundIndex + 1
      : state.phase === "match-result" ? ROUND_COUNT : state.roundIndex;
    if (state.roundResults.length !== expectedResultCount) failState();

    if (state.phase === "reveal") {
      if (state.bids.length || state.currentBid !== null || state.highBidderIndex !== null
        || state.activeBidderIndex !== null || state.proofDraft.length) failState();
      if (state.revealPaused !== (state.pauseReason !== null)) failState();
      if (state.revealPaused && state.revealVisible) failState();
      if (state.playbackMode === "auto" && state.revealVisible && state.revealPaused) failState();
      if (state.playbackMode === "manual" && !state.revealPaused && !state.revealVisible) failState();
      return state;
    }

    if (state.revealIndex !== 0 || state.revealVisible || state.revealPaused || state.pauseReason !== null) failState();
    if (state.phase === "bidding") {
      validateCurrentBids(state, true, seen);
      if (state.proofDraft.length) failState();
      return state;
    }
    if (state.phase === "proof") {
      validateCurrentBids(state, false, seen);
      if (state.bids.length === 0 || state.activeBidderIndex !== null || state.proofDraft.length > state.currentBid) failState();
      return state;
    }
    if (state.phase === "round-result") {
      validateCurrentBids(state, false, seen);
      const result = state.roundResults[state.roundIndex];
      if (!sameBids(state.bids, result.bids) || state.currentBid !== result.bidAmount
        || state.highBidderIndex !== result.proverIndex || state.activeBidderIndex !== null
        || !sameArray(state.proofDraft, result.proof)) failState();
      return state;
    }
    if (state.roundIndex !== ROUND_COUNT - 1 || state.bids.length || state.currentBid !== null
      || state.highBidderIndex !== null || state.activeBidderIndex !== null || state.proofDraft.length
      || state.revealIndex !== 0 || state.revealVisible || state.revealPaused || state.pauseReason !== null) failState();
    return state;
  }

  function getMemoryBidView(state, safeConfig) {
    assertState(state);
    const strategy = safeConfig && typeof safeConfig === "object" ? strategyByConfig.get(safeConfig) : null;
    const config = sanitizeConfig(safeConfig, strategy);
    const items = ITEM_IDS.map((id, index) => itemView(id, index, config));
    const itemById = Object.fromEntries(items.map((item) => [item.id, item]));
    const inReveal = state.phase === "reveal";
    const inBidding = state.phase === "bidding";
    const inProof = state.phase === "proof";
    const inRoundResult = state.phase === "round-result";
    const inMatch = state.phase === "match-result";
    const summary = inMatch ? summarizeMatch(state, config) : null;
    const note = summary ? resolveMatchNote(config, summary) : "";
    const match = summary ? { ...summary, note } : null;
    const view = {
      phase: state.phase,
      title: config.title,
      subtitle: config.subtitle,
      intro: config.intro,
      playerNames: config.playerNames.slice(),
      items,
      round: { index: state.roundIndex, number: state.roundIndex + 1, total: ROUND_COUNT },
      scores: state.scores.slice(),
      announcementSerial: state.announcementSerial,
      notice: state.lastNotice,
      reveal: inReveal ? {
        mode: state.playbackMode,
        index: state.revealIndex,
        number: state.revealIndex + 1,
        total: SEQUENCE_LENGTH,
        paused: state.revealPaused,
        pauseReason: state.pauseReason,
        generation: state.playbackGeneration,
        currentItem: state.revealVisible ? itemById[state.sequences[state.roundIndex][state.revealIndex]] : null,
      } : null,
      bidding: inBidding ? {
        openerIndex: state.roundIndex % 2,
        activeBidderIndex: state.activeBidderIndex,
        currentBid: state.currentBid,
        highBidderIndex: state.highBidderIndex,
        allowedAmounts: allowedAmounts(state.currentBid),
        bids: state.bids.map((bid) => ({
          playerIndex: bid.playerIndex,
          playerName: config.playerNames[bid.playerIndex],
          amount: bid.amount,
        })),
      } : null,
      proof: inProof ? {
        proverIndex: state.highBidderIndex,
        proverName: config.playerNames[state.highBidderIndex],
        bidAmount: state.currentBid,
        draft: state.proofDraft.map((id) => itemById[id]),
        remaining: state.currentBid - state.proofDraft.length,
        canSubmit: state.proofDraft.length === state.currentBid,
      } : null,
      roundResult: inRoundResult ? projectRoundResult(state.roundResults[state.roundIndex], config, itemById) : null,
      match,
      controls: {
        canStart: state.phase === "intro",
        canPause: inReveal && !state.revealPaused,
        canResume: inReveal && state.revealPaused,
        canAdvanceManual: inReveal && state.playbackMode === "manual" && !state.revealPaused,
        canPlaceBid: inBidding,
        canPass: inBidding && state.bids.length > 0,
        canEditProof: inProof,
        canSubmitProof: inProof && state.proofDraft.length === state.currentBid,
        canForfeitProof: inProof,
        canAdvanceRound: inRoundResult && state.roundIndex < ROUND_COUNT - 1,
        canShowMatchResult: inRoundResult && state.roundIndex === ROUND_COUNT - 1,
        canRestart: inMatch,
      },
      text: phaseText(state, config, summary),
    };
    return deepFreeze(view);
  }

  function summarizeMatch(state, safeConfig) {
    assertState(state);
    if (state.phase !== "match-result") throw new TypeError("match summary is only available after four rounds");
    const strategy = safeConfig && typeof safeConfig === "object" ? strategyByConfig.get(safeConfig) : null;
    const config = sanitizeConfig(safeConfig, strategy);
    const tie = state.scores[0] === state.scores[1];
    const winnerIndex = tie ? null : state.scores[0] > state.scores[1] ? 0 : 1;
    return deepFreeze({
      scores: state.scores.slice(),
      winnerIndex,
      tie,
      playerNames: config.playerNames.slice(),
      results: state.roundResults.map((result) => ({
        roundIndex: result.roundIndex,
        roundNumber: result.roundIndex + 1,
        openerIndex: result.openerIndex,
        proverIndex: result.proverIndex,
        proverName: config.playerNames[result.proverIndex],
        bidAmount: result.bidAmount,
        success: result.success,
        forfeited: result.forfeited,
        mismatchIndex: result.mismatchIndex,
        pointWinnerIndex: result.pointWinnerIndex,
        pointWinnerName: config.playerNames[result.pointWinnerIndex],
      })),
      defaultNote: config.defaultMatchNote,
    });
  }

  function placeBid(state, action) {
    if (state.phase !== "bidding") return state;
    if (action.playerIndex !== state.activeBidderIndex) throw new TypeError("only the active bidder may bid");
    if (action.amount <= (state.currentBid || 0)) throw new TypeError("bid must strictly increase");
    const bids = [...state.bids, { playerIndex: action.playerIndex, amount: action.amount }];
    const entersProof = action.amount === MAX_BID;
    return transition(state, {
      phase: entersProof ? "proof" : "bidding",
      bids,
      currentBid: action.amount,
      highBidderIndex: action.playerIndex,
      activeBidderIndex: entersProof ? null : 1 - action.playerIndex,
      lastNotice: entersProof ? "proof-started" : "bid-placed",
    });
  }

  function settleRound(state, forfeited) {
    const sequence = state.sequences[state.roundIndex];
    let mismatchIndex = null;
    if (!forfeited) {
      for (let index = 0; index < state.currentBid; index += 1) {
        if (state.proofDraft[index] !== sequence[index]) {
          mismatchIndex = index;
          break;
        }
      }
    }
    const success = !forfeited && mismatchIndex === null;
    const pointWinnerIndex = success ? state.highBidderIndex : 1 - state.highBidderIndex;
    const scores = state.scores.slice();
    scores[pointWinnerIndex] += 1;
    const result = {
      roundIndex: state.roundIndex,
      openerIndex: state.roundIndex % 2,
      bids: state.bids.map((bid) => ({ ...bid })),
      bidAmount: state.currentBid,
      proverIndex: state.highBidderIndex,
      sequence: sequence.slice(),
      proof: state.proofDraft.slice(),
      forfeited,
      success,
      mismatchIndex,
      pointWinnerIndex,
      scoreAfter: scores.slice(),
    };
    return transition(state, {
      phase: "round-result",
      scores,
      roundResults: [...state.roundResults, result],
      activeBidderIndex: null,
      lastNotice: forfeited ? "round-forfeited" : success ? "round-success" : "round-failed",
    });
  }

  function advanceRound(state) {
    if (state.phase !== "round-result") return state;
    if (state.roundIndex === ROUND_COUNT - 1) {
      return transition(state, {
        phase: "match-result",
        revealIndex: 0,
        bids: [],
        currentBid: null,
        highBidderIndex: null,
        activeBidderIndex: null,
        proofDraft: [],
        lastNotice: "match-complete",
      });
    }
    return transition(state, {
      phase: "reveal",
      roundIndex: state.roundIndex + 1,
      revealIndex: 0,
      revealVisible: state.playbackMode === "manual",
      revealPaused: false,
      pauseReason: null,
      playbackGeneration: state.playbackGeneration + 1,
      bids: [],
      currentBid: null,
      highBidderIndex: null,
      activeBidderIndex: null,
      proofDraft: [],
      lastNotice: "round-advanced",
    });
  }

  function enterBidding(state, generation) {
    return transition(state, {
      phase: "bidding",
      revealIndex: 0,
      revealVisible: false,
      revealPaused: false,
      pauseReason: null,
      playbackGeneration: generation,
      activeBidderIndex: state.roundIndex % 2,
      lastNotice: "reveal-hidden",
    });
  }

  function validateCurrentBids(state, bidding, seen) {
    validateBidList(state.bids, state.roundIndex % 2, seen);
    if (state.bids.length === 0) {
      if (!bidding || state.currentBid !== null || state.highBidderIndex !== null
        || state.activeBidderIndex !== state.roundIndex % 2) failState();
      return;
    }
    const last = state.bids[state.bids.length - 1];
    if (state.currentBid !== last.amount || state.highBidderIndex !== last.playerIndex) failState();
    if (bidding && (last.amount === MAX_BID || state.activeBidderIndex !== 1 - last.playerIndex)) failState();
  }

  function validateResults(results, sequences, seen) {
    const scores = [0, 0];
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      assertExactRecord(result, RESULT_KEYS, "round result", seen);
      assertUniqueArray(result.bids, "result bids", seen);
      assertUniqueArray(result.sequence, "result sequence", seen);
      assertUniqueArray(result.proof, "result proof", seen);
      assertUniqueArray(result.scoreAfter, "result scoreAfter", seen);
      if (result.roundIndex !== index || result.openerIndex !== index % 2) failState();
      validateBidList(result.bids, result.openerIndex, seen);
      if (!result.bids.length) failState();
      const lastBid = result.bids[result.bids.length - 1];
      if (result.bidAmount !== lastBid.amount || result.proverIndex !== lastBid.playerIndex) failState();
      if (!sameArray(result.sequence, sequences[index]) || !isItemList(result.proof, 0, result.bidAmount)) failState();
      if (typeof result.forfeited !== "boolean" || typeof result.success !== "boolean") failState();
      let expectedMismatch = null;
      if (!result.forfeited) {
        if (result.proof.length !== result.bidAmount) failState();
        for (let proofIndex = 0; proofIndex < result.bidAmount; proofIndex += 1) {
          if (result.proof[proofIndex] !== result.sequence[proofIndex]) {
            expectedMismatch = proofIndex;
            break;
          }
        }
      }
      const expectedSuccess = !result.forfeited && expectedMismatch === null;
      if (result.success !== expectedSuccess) failState();
      if (result.mismatchIndex !== (result.forfeited ? null : expectedMismatch)) failState();
      const expectedWinner = expectedSuccess ? result.proverIndex : 1 - result.proverIndex;
      if (result.pointWinnerIndex !== expectedWinner) failState();
      scores[expectedWinner] += 1;
      if (!isScores(result.scoreAfter) || !sameArray(result.scoreAfter, scores)) failState();
    }
    return scores;
  }

  function validateBidList(bids, openerIndex, seen) {
    let previous = null;
    for (let index = 0; index < bids.length; index += 1) {
      const bid = bids[index];
      assertExactRecord(bid, BID_KEYS, "bid", seen);
      if (bid.playerIndex !== (openerIndex + index) % 2 || !isBidAmount(bid.amount)) failState();
      if (previous !== null && bid.amount <= previous) failState();
      previous = bid.amount;
    }
  }

  function assertSequences(sequences, seed, seen) {
    if (sequences.length !== ROUND_COUNT) failState();
    const expected = generateSequences(seed);
    for (let round = 0; round < ROUND_COUNT; round += 1) {
      assertUniqueArray(sequences[round], "sequence", seen);
      if (!isValidSequence(sequences[round]) || !sameArray(sequences[round], expected[round])) failState();
    }
  }

  function isValidSequence(sequence) {
    if (!isItemList(sequence, SEQUENCE_LENGTH, SEQUENCE_LENGTH)) return false;
    const counts = new Map(ITEM_IDS.map((id) => [id, 0]));
    for (let index = 0; index < sequence.length; index += 1) {
      counts.set(sequence[index], counts.get(sequence[index]) + 1);
      if (index > 0 && sequence[index] === sequence[index - 1]) return false;
    }
    return [...counts.values()].filter((count) => count === 2).length === 2
      && [...counts.values()].filter((count) => count === 1).length === 4;
  }

  function projectRoundResult(result, config, itemById) {
    return {
      roundIndex: result.roundIndex,
      roundNumber: result.roundIndex + 1,
      openerIndex: result.openerIndex,
      bids: result.bids.map((bid) => ({
        playerIndex: bid.playerIndex,
        playerName: config.playerNames[bid.playerIndex],
        amount: bid.amount,
      })),
      bidAmount: result.bidAmount,
      proverIndex: result.proverIndex,
      proverName: config.playerNames[result.proverIndex],
      sequence: result.sequence.map((id) => itemById[id]),
      proof: result.proof.map((id) => itemById[id]),
      forfeited: result.forfeited,
      success: result.success,
      mismatchIndex: result.mismatchIndex,
      pointWinnerIndex: result.pointWinnerIndex,
      pointWinnerName: config.playerNames[result.pointWinnerIndex],
      scoreAfter: result.scoreAfter.slice(),
    };
  }

  function phaseText(state, config, summary) {
    let heading = config.title;
    let instruction = config.intro;
    let primaryLabel = "开始看第一串";
    if (state.phase === "reveal") {
      heading = `第 ${state.roundIndex + 1} 轮，先把这一串收好`;
      instruction = state.revealPaused
        ? "这一件已经盖住，准备好后从同一件继续。"
        : state.playbackMode === "manual" ? "一次只看一件，记好再翻下一件。" : "旧物会一件件经过，也可以随时暂停。";
      primaryLabel = state.revealPaused ? "继续看这一件"
        : state.playbackMode === "manual" ? "收好，下一件" : "先停一下";
    } else if (state.phase === "bidding") {
      heading = "我能记得更多";
      instruction = state.currentBid === null
        ? `${config.playerNames[state.activeBidderIndex]} 先开价，选择 2 到 8。`
        : `${config.playerNames[state.activeBidderIndex]} 可以报得更高，或就到这里。`;
      primaryLabel = "";
    } else if (state.phase === "proof") {
      heading = `轮到${config.playerNames[state.highBidderIndex]}证明`;
      instruction = `按顺序点出前 ${state.currentBid} 件。`;
      primaryLabel = "就按这一串";
    } else if (state.phase === "round-result") {
      const result = state.roundResults[state.roundIndex];
      heading = "这一分记下了";
      instruction = result.forfeited ? `${config.playerNames[result.proverIndex]} 这轮认输，分数记给对方。`
        : result.success ? `${config.playerNames[result.proverIndex]} 全部记对了。`
          : `第 ${result.mismatchIndex + 1} 件不同，分数记给对方。`;
      primaryLabel = state.roundIndex === ROUND_COUNT - 1 ? "看看四轮总分" : "换人先开价";
    } else if (state.phase === "match-result") {
      heading = "四轮都收好了";
      instruction = summary.tie ? `打成 ${summary.scores[0]} 比 ${summary.scores[1]}，今晚两个人记得一样多。`
        : `${config.playerNames[summary.winnerIndex]} 以 ${summary.scores[summary.winnerIndex]} 比 ${summary.scores[1 - summary.winnerIndex]} 记下这局。`;
      primaryLabel = "再记四轮";
    }
    return { heading, instruction, primaryLabel };
  }

  function resolveMatchNote(config, summary) {
    const strategy = strategyByConfig.get(config);
    if (!strategy) return config.defaultMatchNote;
    try {
      const value = strategy(summary);
      const cleaned = cleanText(value, MAX_NOTE_POINTS);
      return cleaned || config.defaultMatchNote;
    } catch {
      return config.defaultMatchNote;
    }
  }

  function transition(state, patch) {
    return freezeState({ ...state, ...patch, announcementSerial: state.announcementSerial + 1 });
  }

  function noticeOnly(state, notice) {
    return state.lastNotice === notice ? state : transition(state, { lastNotice: notice });
  }

  function freezeState(state) {
    return deepFreeze({
      version: state.version,
      phase: state.phase,
      seed: state.seed,
      playbackMode: state.playbackMode,
      roundIndex: state.roundIndex,
      revealIndex: state.revealIndex,
      revealVisible: state.revealVisible,
      revealPaused: state.revealPaused,
      pauseReason: state.pauseReason,
      playbackGeneration: state.playbackGeneration,
      sequences: state.sequences.map((sequence) => sequence.slice()),
      bids: state.bids.map((bid) => ({ playerIndex: bid.playerIndex, amount: bid.amount })),
      currentBid: state.currentBid,
      highBidderIndex: state.highBidderIndex,
      activeBidderIndex: state.activeBidderIndex,
      proofDraft: state.proofDraft.slice(),
      scores: state.scores.slice(),
      roundResults: state.roundResults.map((result) => ({
        roundIndex: result.roundIndex,
        openerIndex: result.openerIndex,
        bids: result.bids.map((bid) => ({ playerIndex: bid.playerIndex, amount: bid.amount })),
        bidAmount: result.bidAmount,
        proverIndex: result.proverIndex,
        sequence: result.sequence.slice(),
        proof: result.proof.slice(),
        forfeited: result.forfeited,
        success: result.success,
        mismatchIndex: result.mismatchIndex,
        pointWinnerIndex: result.pointWinnerIndex,
        scoreAfter: result.scoreAfter.slice(),
      })),
      announcementSerial: state.announcementSerial,
      lastNotice: state.lastNotice,
    });
  }

  function parseAction(action) {
    try {
      if (!isPlainObject(action)) throw new TypeError("action must be a plain object");
      const keys = Reflect.ownKeys(action);
      if (keys.some((key) => typeof key !== "string")) throw new TypeError("action symbols are not allowed");
      for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(action, key);
        if (!descriptor || !("value" in descriptor)) throw new TypeError("action accessors are not allowed");
      }
      const type = safeOwnData(action, "type");
      if (typeof type !== "string" || !Object.hasOwn(ACTION_FIELDS, type)) throw new TypeError("unknown action type");
      const expected = ["type", ...ACTION_FIELDS[type]];
      if (keys.length !== expected.length || expected.some((key) => !keys.includes(key))) throw new TypeError("invalid action fields");
      const parsed = { type };
      for (const field of ACTION_FIELDS[type]) parsed[field] = safeOwnData(action, field);
      if (Object.hasOwn(parsed, "seed") && !isUint32(parsed.seed)) throw new TypeError("invalid seed");
      if (Object.hasOwn(parsed, "playbackMode") && !PLAYBACK_MODES.includes(parsed.playbackMode)) throw new TypeError("invalid playbackMode");
      if (Object.hasOwn(parsed, "generation") && (!Number.isSafeInteger(parsed.generation) || parsed.generation < 0)) throw new TypeError("invalid generation");
      if (Object.hasOwn(parsed, "reason") && !PAUSE_REASONS.includes(parsed.reason)) throw new TypeError("invalid pause reason");
      if (Object.hasOwn(parsed, "playerIndex") && ![0, 1].includes(parsed.playerIndex)) throw new TypeError("invalid playerIndex");
      if (Object.hasOwn(parsed, "amount") && !isBidAmount(parsed.amount)) throw new TypeError("invalid bid amount");
      if (Object.hasOwn(parsed, "itemId") && !ITEM_IDS.includes(parsed.itemId)) throw new TypeError("invalid itemId");
      if (Object.hasOwn(parsed, "index") && (!Number.isInteger(parsed.index) || parsed.index < 0 || parsed.index >= MAX_BID)) throw new TypeError("invalid index");
      return parsed;
    } catch (error) {
      throw error instanceof TypeError ? error : new TypeError("invalid action");
    }
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return {
      int(bound) {
        const limit = Math.floor(UINT32_RANGE / bound) * bound;
        let value;
        do {
          state ^= state << 13;
          state ^= state >>> 17;
          state ^= state << 5;
          state >>>= 0;
          value = state;
        } while (value >= limit);
        return value % bound;
      },
    };
  }

  function repairAdjacent(sequence) {
    for (let index = 1; index < sequence.length; index += 1) {
      if (sequence[index] !== sequence[index - 1]) continue;
      const candidates = [];
      for (let target = index + 1; target < sequence.length; target += 1) candidates.push(target);
      for (let target = index - 2; target >= 0; target -= 1) candidates.push(target);
      const target = candidates.find((candidate) => swapIsLocallySafe(sequence, index, candidate));
      if (target === undefined) throw new Error("unable to repair sequence");
      [sequence[index], sequence[target]] = [sequence[target], sequence[index]];
    }
  }

  function swapIsLocallySafe(sequence, left, right) {
    const copy = sequence.slice();
    [copy[left], copy[right]] = [copy[right], copy[left]];
    const starts = new Set([left - 1, left, right - 1, right]);
    for (const index of starts) {
      if (index >= 0 && index < copy.length - 1 && copy[index] === copy[index + 1]) return false;
    }
    return true;
  }

  function sanitizePlayerNames(value) {
    if (!isDenseArray(value, 2, 2)) return DEFAULT_CONFIG.playerNames.slice();
    return [0, 1].map((index) => cleanText(safeOwnData(value, String(index)), MAX_NAME_POINTS)
      || DEFAULT_CONFIG.playerNames[index]);
  }

  function sanitizeItemText(value) {
    const source = isPlainObject(value) ? value : null;
    const output = {};
    for (const id of ITEM_IDS) {
      const item = safeOwnData(source, id);
      output[id] = {
        label: cleanConfigText(item, "label", DEFAULT_CONFIG.itemText[id].label, MAX_LABEL_POINTS),
        description: cleanConfigText(
          item,
          "description",
          DEFAULT_CONFIG.itemText[id].description,
          MAX_DESCRIPTION_POINTS,
        ),
      };
    }
    return output;
  }

  function cleanConfigText(source, key, fallback, maxPoints) {
    return cleanText(safeOwnData(source, key), maxPoints) || fallback;
  }

  function cleanText(value, maxPoints) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    const points = Array.from(trimmed);
    return points.length > 0 && points.length <= maxPoints ? trimmed : "";
  }

  function itemView(id, index, config) {
    return { id, number: index + 1, label: config.itemText[id].label, description: config.itemText[id].description };
  }

  function allowedAmounts(currentBid) {
    const start = currentBid === null ? MIN_BID : currentBid + 1;
    return Array.from({ length: Math.max(0, MAX_BID - start + 1) }, (_, index) => start + index);
  }

  function assertExactRecord(value, keys, label, seen) {
    try {
      if (!isPlainObject(value) || seen.has(value)) failState();
      seen.add(value);
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string")) failState();
      if (!keys.every((key, index) => ownKeys[index] === key)) failState();
      for (const key of ownKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !("value" in descriptor)) failState();
      }
    } catch (error) {
      if (error instanceof TypeError) throw error;
      throw new TypeError(`invalid ${label}`);
    }
  }

  function assertUniqueArray(value, label, seen) {
    if (!Array.isArray(value) || seen.has(value)) throw new TypeError(`invalid ${label}`);
    seen.add(value);
    const keys = Reflect.ownKeys(value);
    const expected = Array.from({ length: value.length }, (_, index) => String(index)).concat("length");
    if (keys.length !== expected.length || !expected.every((key, index) => keys[index] === key)) throw new TypeError(`invalid ${label}`);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) throw new TypeError(`invalid ${label}`);
    }
  }

  function isItemList(value, min, max) {
    if (!isDenseArray(value, min, max)) return false;
    for (let index = 0; index < value.length; index += 1) {
      if (!ITEM_IDS.includes(safeOwnData(value, String(index)))) return false;
    }
    return true;
  }

  function isDenseArray(value, min, max) {
    if (!Array.isArray(value) || value.length < min || value.length > max) return false;
    const keys = Reflect.ownKeys(value);
    const expected = Array.from({ length: value.length }, (_, index) => String(index)).concat("length");
    if (keys.length !== expected.length || !expected.every((key, index) => keys[index] === key)) return false;
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor)) return false;
    }
    return true;
  }

  function isScores(value) {
    return isDenseArray(value, 2, 2) && value.every((score) => Number.isInteger(score) && score >= 0 && score <= ROUND_COUNT);
  }

  function isUint32(value) {
    return Number.isSafeInteger(value) && value >= 1 && value <= 0xffffffff;
  }

  function isBidAmount(value) {
    return Number.isInteger(value) && value >= MIN_BID && value <= MAX_BID;
  }

  function isIndexOrNull(value) {
    return value === null || value === 0 || value === 1;
  }

  function isPlainObject(value) {
    try {
      return value !== null && typeof value === "object" && !Array.isArray(value)
        && Object.getPrototypeOf(value) === Object.prototype;
    } catch {
      return false;
    }
  }

  function safeOwnData(value, key) {
    try {
      if (!value || (typeof value !== "object" && typeof value !== "function")) return undefined;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && "value" in descriptor ? descriptor.value : undefined;
    } catch {
      return undefined;
    }
  }

  function isUsableConfig(value) {
    return value && typeof value === "object" && Array.isArray(value.playerNames)
      && value.playerNames.length === 2 && value.itemText && typeof value.itemText === "object";
  }

  function sameArray(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function sameBids(left, right) {
    return left.length === right.length && left.every((bid, index) => (
      bid.playerIndex === right[index].playerIndex && bid.amount === right[index].amount
    ));
  }

  function removeAt(values, index) {
    return values.slice(0, index).concat(values.slice(index + 1));
  }

  function failState() {
    throw new TypeError("invalid memory bid state");
  }

  function deepFreeze(value, seen = new WeakSet()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || Object.isFrozen(value)) return value;
    if (seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  return deepFreeze({
    VERSION,
    ROUND_COUNT,
    SEQUENCE_LENGTH,
    MIN_BID,
    MAX_BID,
    ITEM_IDS,
    PHASES,
    PLAYBACK_MODES,
    ACTION_TYPES,
    generateSequences,
    createInitialState,
    sanitizeConfig,
    reduceMemoryBid,
    assertState,
    getMemoryBidView,
    summarizeMatch,
    deepFreeze,
  });
});
