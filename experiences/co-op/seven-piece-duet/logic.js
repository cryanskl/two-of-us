(function attachSevenPieceDuetLogic(root, factory) {
  "use strict";

  const geometry = typeof module === "object" && module && module.exports
    ? require("./geometry.js")
    : root && root.SevenPieceDuetGeometry;
  const targets = typeof module === "object" && module && module.exports
    ? require("./targets.js")
    : root && root.SevenPieceDuetTargets;
  const api = factory(geometry, targets);
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  } else if (root) {
    root.SevenPieceDuetLogic = api;
  }
}(typeof window === "object" ? window : null, function createLogic(
  geometry,
  targets
) {
  "use strict";

  if (!geometry || !targets) {
    throw new Error("SevenPieceDuet geometry and targets are required");
  }

  const TRUSTED_STATES = new WeakSet();
  const SEATS = ["A", "B"];
  const ACTION_FIELDS = {
    START: [],
    SELECT: ["seat", "pieceId"],
    MOVE_DRAFT: ["seat", "dx", "dy"],
    ROTATE_DRAFT: ["seat", "direction"],
    FLIP_DRAFT: ["seat"],
    COMMIT_DRAFT: ["seat"],
    CANCEL_DRAFT: ["seat"],
    RESTART_ROUND: [],
    NEXT_ROUND: [],
    RESTART_MATCH: []
  };

  function deepFreeze(value, seen) {
    if (
      value === null
      || (typeof value !== "object" && typeof value !== "function")
    ) return value;
    const visited = seen || new Set();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.hasOwn(descriptor, "value")) {
        deepFreeze(descriptor.value, visited);
      }
    }
    return Object.freeze(value);
  }

  function snapshotRecord(value, expectedKeys) {
    try {
      if (
        value === null
        || typeof value !== "object"
        || Array.isArray(value)
        || Object.getPrototypeOf(value) !== Object.prototype
      ) return null;
      const keys = Reflect.ownKeys(value);
      if (
        keys.length !== expectedKeys.length
        || keys.some((key) => (
          typeof key !== "string" || !expectedKeys.includes(key)
        ))
      ) return null;
      const snapshot = {};
      for (const key of expectedKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
        snapshot[key] = descriptor.value;
      }
      return snapshot;
    } catch {
      return null;
    }
  }

  function snapshotArray(value) {
    try {
      if (
        !Array.isArray(value)
        || Object.getPrototypeOf(value) !== Array.prototype
      ) return null;
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value")) {
        return null;
      }
      const length = lengthDescriptor.value;
      const keys = Reflect.ownKeys(value);
      if (
        keys.length !== length + 1
        || keys.some((key) => (
          typeof key !== "string"
          || (
            key !== "length"
            && (
              !/^(?:0|[1-9]\d*)$/u.test(key)
              || Number(key) >= length
            )
          )
        ))
      ) return null;
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
        result.push(descriptor.value);
      }
      return result;
    } catch {
      return null;
    }
  }

  function clonePose(pose) {
    return {
      tx: pose.tx,
      ty: pose.ty,
      quarterTurns: pose.quarterTurns,
      flipped: pose.flipped
    };
  }

  function cloneNotice(notice) {
    return notice && {
      seat: notice.seat,
      code: notice.code,
      pieceId: notice.pieceId,
      conflictPieceId: notice.conflictPieceId
    };
  }

  function cloneDraft(draft) {
    return draft && {
      pieceId: draft.pieceId,
      pose: clonePose(draft.pose),
      origin: draft.origin
    };
  }

  function clonePieces(pieces) {
    return pieces.map((piece) => ({
      id: piece.id,
      owner: piece.owner,
      committedPose: piece.committedPose
        ? clonePose(piece.committedPose)
        : null
    }));
  }

  function ownersForRound(roundIndex) {
    const schedule = targets.getRoundSchedule()[roundIndex];
    return geometry.PIECE_IDS.map((id) => ({
      id,
      owner: geometry.PIECE_GROUPS.fine.includes(id)
        ? schedule.fineSeat
        : schedule.boldSeat,
      committedPose: null
    }));
  }

  function trust(state) {
    const frozen = deepFreeze(state);
    TRUSTED_STATES.add(frozen);
    return frozen;
  }

  function buildState({
    phase,
    roundIndex,
    revision,
    pieces,
    drafts,
    completedRounds,
    noticeSerial,
    notice
  }) {
    return trust({
      phase,
      roundIndex,
      revision,
      pieces: clonePieces(pieces),
      drafts: {
        A: cloneDraft(drafts.A),
        B: cloneDraft(drafts.B)
      },
      completedRounds: [...completedRounds],
      noticeSerial,
      notice: cloneNotice(notice)
    });
  }

  function createInitialState() {
    return buildState({
      phase: "intro",
      roundIndex: 0,
      revision: 0,
      pieces: ownersForRound(0),
      drafts: { A: null, B: null },
      completedRounds: [],
      noticeSerial: 0,
      notice: null
    });
  }

  function withChanges(state, changes) {
    if (state.revision >= Number.MAX_SAFE_INTEGER) return state;
    return buildState({
      phase: changes.phase ?? state.phase,
      roundIndex: changes.roundIndex ?? state.roundIndex,
      revision: state.revision + 1,
      pieces: changes.pieces ?? state.pieces,
      drafts: changes.drafts ?? state.drafts,
      completedRounds: changes.completedRounds ?? state.completedRounds,
      noticeSerial: changes.noticeSerial ?? state.noticeSerial,
      notice: Object.hasOwn(changes, "notice") ? changes.notice : state.notice
    });
  }

  function noticeChange(state, notice, changes = {}) {
    if (state.noticeSerial >= Number.MAX_SAFE_INTEGER) return state;
    return withChanges(state, {
      ...changes,
      noticeSerial: state.noticeSerial + 1,
      notice
    });
  }

  function isSeat(value) {
    return value === "A" || value === "B";
  }

  function normalizeAction(action) {
    let ownKeys;
    try {
      ownKeys = Reflect.ownKeys(action);
    } catch {
      return null;
    }
    const head = snapshotRecord(action, ownKeys);
    if (!head || typeof head.type !== "string") return null;
    const fields = ACTION_FIELDS[head.type];
    if (!fields) return null;
    const expectedKeys = ["type", "revision", ...fields];
    const snapshot = snapshotRecord(action, expectedKeys);
    if (!snapshot || !Number.isSafeInteger(snapshot.revision)) return null;
    if (fields.includes("seat") && !isSeat(snapshot.seat)) return null;
    if (
      fields.includes("pieceId")
      && (
        typeof snapshot.pieceId !== "string"
        || !geometry.PIECE_IDS.includes(snapshot.pieceId)
      )
    ) return null;
    if (
      head.type === "MOVE_DRAFT"
      && (
        !Number.isInteger(snapshot.dx)
        || !Number.isInteger(snapshot.dy)
        || Math.abs(snapshot.dx) > 1
        || Math.abs(snapshot.dy) > 1
        || (snapshot.dx === 0 && snapshot.dy === 0)
      )
    ) return null;
    if (
      head.type === "ROTATE_DRAFT"
      && snapshot.direction !== -1
      && snapshot.direction !== 1
    ) return null;
    return snapshot;
  }

  function createAction(state, type, fields = {}) {
    if (!TRUSTED_STATES.has(state)) throw new TypeError("state is not trusted");
    if (typeof type !== "string" || !Object.hasOwn(ACTION_FIELDS, type)) {
      throw new RangeError("unknown action type");
    }
    const fieldNames = ACTION_FIELDS[type];
    const snapshot = snapshotRecord(fields, fieldNames);
    if (!snapshot) throw new TypeError("action fields are invalid");
    const action = {
      type,
      revision: state.revision
    };
    for (const field of fieldNames) action[field] = snapshot[field];
    const normalized = normalizeAction(action);
    if (!normalized) throw new TypeError("action fields are invalid");
    return deepFreeze(action);
  }

  function targetForState(state) {
    return targets.getTargets()[state.roundIndex];
  }

  function transformedPiece(piece) {
    if (!piece.committedPose) return null;
    return geometry.transformShape(
      geometry.getPieceTemplate(piece.id),
      piece.committedPose
    );
  }

  function getCommittedCells(state) {
    const safe = TRUSTED_STATES.has(state) ? state : createInitialState();
    return deepFreeze(geometry.canonicalShape(
      safe.pieces.flatMap((piece) => transformedPiece(piece) || [])
    ));
  }

  function evaluateDraft(state, seat) {
    if (!TRUSTED_STATES.has(state) || !isSeat(seat)) {
      return { valid: false, reason: "invalid-action", conflictPieceId: null };
    }
    const draft = state.drafts[seat];
    if (!draft || state.phase !== "playing") {
      return { valid: false, reason: "invalid-action", conflictPieceId: null };
    }
    const piece = state.pieces.find(({ id }) => id === draft.pieceId);
    if (!piece || piece.owner !== seat) {
      return { valid: false, reason: "wrong-owner", conflictPieceId: null };
    }
    let candidate;
    try {
      candidate = geometry.transformShape(
        geometry.getPieceTemplate(piece.id),
        draft.pose
      );
    } catch {
      return { valid: false, reason: "invalid-action", conflictPieceId: null };
    }
    const target = targetForState(state);
    if (!geometry.isSubsetShape(candidate, target.cells)) {
      return { valid: false, reason: "out-of-bounds", conflictPieceId: null };
    }
    for (const other of state.pieces) {
      if (other.id === piece.id || !other.committedPose) continue;
      const otherCells = transformedPiece(other);
      if (geometry.intersectShape(candidate, otherCells).length > 0) {
        return {
          valid: false,
          reason: "overlap",
          conflictPieceId: other.id
        };
      }
    }
    return { valid: true, reason: null, conflictPieceId: null };
  }

  function canCommitDraft(state, seat) {
    return evaluateDraft(state, seat).valid;
  }

  function isRoundComplete(state) {
    if (!TRUSTED_STATES.has(state)) return false;
    if (state.pieces.some(({ committedPose }) => committedPose === null)) {
      return false;
    }
    const target = targetForState(state);
    const placed = state.pieces.map(transformedPiece);
    const coverage = geometry.unionShapes(placed);
    const targetCoverage = geometry.coverageShape(target.cells);
    return (
      coverage.length === geometry.CONSTANTS.TOTAL_COVERAGE_CELLS
      && coverage.every((key, index) => key === targetCoverage[index])
    );
  }

  function selectPiece(state, action) {
    if (state.phase !== "playing" || state.drafts[action.seat]) return state;
    const piece = state.pieces.find(({ id }) => id === action.pieceId);
    if (!piece) return state;
    if (piece.owner !== action.seat) {
      return noticeChange(state, {
        seat: action.seat,
        code: "wrong-owner",
        pieceId: action.pieceId,
        conflictPieceId: null
      });
    }
    const draft = {
      pieceId: piece.id,
      pose: piece.committedPose
        ? clonePose(piece.committedPose)
        : { tx: 0, ty: 0, quarterTurns: 0, flipped: false },
      origin: piece.committedPose ? "board" : "tray"
    };
    return noticeChange(
      state,
      {
        seat: action.seat,
        code: "selected",
        pieceId: piece.id,
        conflictPieceId: null
      },
      {
        drafts: { ...state.drafts, [action.seat]: draft }
      }
    );
  }

  function moveDraft(state, action) {
    if (state.phase !== "playing" || !state.drafts[action.seat]) return state;
    const draft = state.drafts[action.seat];
    const tx = draft.pose.tx + action.dx;
    const ty = draft.pose.ty + action.dy;
    if (
      !Number.isSafeInteger(tx)
      || !Number.isSafeInteger(ty)
      || Math.abs(tx) > geometry.CONSTANTS.MAX_COORDINATE
      || Math.abs(ty) > geometry.CONSTANTS.MAX_COORDINATE
    ) return state;
    return withChanges(state, {
      drafts: {
        ...state.drafts,
        [action.seat]: {
          ...draft,
          pose: { ...draft.pose, tx, ty }
        }
      }
    });
  }

  function rotateDraft(state, action) {
    if (state.phase !== "playing" || !state.drafts[action.seat]) return state;
    const draft = state.drafts[action.seat];
    const quarterTurns = (
      draft.pose.quarterTurns + action.direction + 4
    ) % 4;
    return withChanges(state, {
      drafts: {
        ...state.drafts,
        [action.seat]: {
          ...draft,
          pose: { ...draft.pose, quarterTurns }
        }
      }
    });
  }

  function flipDraft(state, action) {
    if (state.phase !== "playing" || !state.drafts[action.seat]) return state;
    const draft = state.drafts[action.seat];
    if (draft.pieceId !== "parallelogram") return state;
    return withChanges(state, {
      drafts: {
        ...state.drafts,
        [action.seat]: {
          ...draft,
          pose: { ...draft.pose, flipped: !draft.pose.flipped }
        }
      }
    });
  }

  function cancelDraft(state, action) {
    const draft = state.drafts[action.seat];
    if (state.phase !== "playing" || !draft) return state;
    return noticeChange(
      state,
      {
        seat: action.seat,
        code: "cancelled",
        pieceId: draft.pieceId,
        conflictPieceId: null
      },
      {
        drafts: { ...state.drafts, [action.seat]: null }
      }
    );
  }

  function commitDraft(state, action) {
    const draft = state.drafts[action.seat];
    if (state.phase !== "playing" || !draft) return state;
    const result = evaluateDraft(state, action.seat);
    if (!result.valid) {
      return noticeChange(
        state,
        {
          seat: action.seat,
          code: result.reason,
          pieceId: draft.pieceId,
          conflictPieceId: result.conflictPieceId
        },
        {
          drafts: { ...state.drafts, [action.seat]: null }
        }
      );
    }
    const pieces = state.pieces.map((piece) => (
      piece.id === draft.pieceId
        ? { ...piece, committedPose: clonePose(draft.pose) }
        : piece
    ));
    const provisional = buildState({
      phase: state.phase,
      roundIndex: state.roundIndex,
      revision: state.revision,
      pieces,
      drafts: { ...state.drafts, [action.seat]: null },
      completedRounds: state.completedRounds,
      noticeSerial: state.noticeSerial,
      notice: state.notice
    });
    const complete = isRoundComplete(provisional);
    const finalRound = state.roundIndex === targets.getRoundSchedule().length - 1;
    const targetId = targetForState(state).id;
    return noticeChange(
      state,
      {
        seat: action.seat,
        code: complete
          ? (finalRound ? "match-complete" : "round-complete")
          : "placed",
        pieceId: draft.pieceId,
        conflictPieceId: null
      },
      {
        phase: complete
          ? (finalRound ? "match-complete" : "round-complete")
          : state.phase,
        pieces,
        drafts: complete
          ? { A: null, B: null }
          : { ...state.drafts, [action.seat]: null },
        completedRounds: complete
          ? [...state.completedRounds, targetId]
          : state.completedRounds
      }
    );
  }

  function restartRound(state) {
    if (state.phase !== "playing" && state.phase !== "round-complete") {
      return state;
    }
    const targetId = targetForState(state).id;
    const completedRounds = state.phase === "round-complete"
      ? state.completedRounds.filter((id) => id !== targetId)
      : state.completedRounds;
    return withChanges(state, {
      phase: "playing",
      pieces: ownersForRound(state.roundIndex),
      drafts: { A: null, B: null },
      completedRounds,
      notice: null
    });
  }

  function nextRound(state) {
    if (
      state.phase !== "round-complete"
      || state.roundIndex >= targets.getRoundSchedule().length - 1
    ) return state;
    const roundIndex = state.roundIndex + 1;
    return withChanges(state, {
      phase: "playing",
      roundIndex,
      pieces: ownersForRound(roundIndex),
      drafts: { A: null, B: null },
      notice: null
    });
  }

  function restartMatch(state) {
    if (
      state.revision >= Number.MAX_SAFE_INTEGER
      || state.noticeSerial >= Number.MAX_SAFE_INTEGER
    ) return state;
    return buildState({
      phase: "intro",
      roundIndex: 0,
      revision: state.revision + 1,
      pieces: ownersForRound(0),
      drafts: { A: null, B: null },
      completedRounds: [],
      noticeSerial: state.noticeSerial + 1,
      notice: null
    });
  }

  function transition(state, action) {
    if (!TRUSTED_STATES.has(state)) return createInitialState();
    const normalized = normalizeAction(action);
    if (!normalized || normalized.revision !== state.revision) return state;
    switch (normalized.type) {
      case "START":
        return state.phase === "intro"
          ? withChanges(state, { phase: "playing" })
          : state;
      case "SELECT":
        return selectPiece(state, normalized);
      case "MOVE_DRAFT":
        return moveDraft(state, normalized);
      case "ROTATE_DRAFT":
        return rotateDraft(state, normalized);
      case "FLIP_DRAFT":
        return flipDraft(state, normalized);
      case "COMMIT_DRAFT":
        return commitDraft(state, normalized);
      case "CANCEL_DRAFT":
        return cancelDraft(state, normalized);
      case "RESTART_ROUND":
        return restartRound(state);
      case "NEXT_ROUND":
        return nextRound(state);
      case "RESTART_MATCH":
        return restartMatch(state);
      default:
        return state;
    }
  }

  function getPublicView(state) {
    const safe = TRUSTED_STATES.has(state) ? state : createInitialState();
    const target = targetForState(safe);
    return deepFreeze({
      phase: safe.phase,
      roundIndex: safe.roundIndex,
      revision: safe.revision,
      pieces: clonePieces(safe.pieces),
      drafts: {
        A: cloneDraft(safe.drafts.A),
        B: cloneDraft(safe.drafts.B)
      },
      completedRounds: [...safe.completedRounds],
      noticeSerial: safe.noticeSerial,
      notice: cloneNotice(safe.notice),
      target: {
        id: target.id,
        title: target.title,
        board: { ...target.board },
        cells: [...target.cells],
        fingerprint: target.fingerprint
      }
    });
  }

  function replaySession(actions) {
    const snapshot = snapshotArray(actions);
    if (!snapshot) throw new TypeError("action log must be a dense plain array");
    let state = createInitialState();
    for (const action of snapshot) {
      const next = transition(state, action);
      if (next === state) throw new RangeError("action log contains a no-op");
      state = next;
    }
    return state;
  }

  return deepFreeze({
    createInitialState,
    transition,
    createAction,
    getPublicView,
    getCommittedCells,
    canCommitDraft,
    isRoundComplete,
    replaySession
  });
}));
