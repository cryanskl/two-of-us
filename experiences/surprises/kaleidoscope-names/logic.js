"use strict";

(function exposeLogic(root, factory) {
  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.KaleidoscopeNamesLogic = api;
  }
})(typeof window === "object" ? window : null, function createLogic() {
  var CONFIG_KEYS = [
    "publicTitle",
    "publicInstructions",
    "foldHint",
    "phaseHint",
    "targetFolds",
    "targetPhase",
    "marks",
    "finalTitle",
    "finalMessage",
    "signature"
  ];
  var STATE_KEYS = ["version", "phase", "content", "selection", "revision"];
  var SELECTION_KEYS = ["folds", "phaseStep"];
  var PHASES = ["intro", "tuning", "aligned", "complete"];
  var STATUS_TEXT = {
    far: "还没贴近",
    near: "已经贴近",
    exact: "已对齐"
  };
  var FORBIDDEN_TEXT =
    /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
  var ANY_WHITESPACE = /\s/u;
  var COLLAPSIBLE_WHITESPACE = /\s+/gu;

  function deepFreeze(value) {
    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      return value;
    }

    if (typeof value === "function") {
      return Object.freeze(value);
    }

    Reflect.ownKeys(value).forEach(function freezeChild(key) {
      var descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value")) {
        deepFreeze(descriptor.value);
      }
    });

    return Object.freeze(value);
  }

  var CONSTANTS = deepFreeze({
    VERSION: 1,
    FOLD_MIN: 4,
    FOLD_MAX: 9,
    FOLD_VALUES: [4, 5, 6, 7, 8, 9],
    PHASE_MIN: 0,
    PHASE_MAX: 23,
    PHASE_COUNT: 24,
    TURN_UNITS: 2520,
    PHASE_UNITS: 105,
    NEAR_FOLD_DISTANCE: 1,
    NEAR_PHASE_DISTANCE: 2,
    INITIAL_FOLDS: 4,
    INITIAL_PHASE: 0,
    MAX_REVISION: 1000000
  });

  var DEFAULT_CONFIG = deepFreeze({
    publicTitle: "把名字折成同一束光",
    publicInstructions: "读两条线索，选折面、转相位，让两项都对齐。",
    foldHint: "示例线索：把折面调到一周里周末之前的那一天数。",
    phaseHint: "示例线索：让刻度停在钟面十一点的位置。",
    targetFolds: 5,
    targetPhase: 22,
    marks: ["光", "影"],
    finalTitle: "原来我们一直在同一束光里",
    finalMessage: "角度不同，折回来时，还是在这里遇见。",
    signature: "来自准备这枚小镜子的人"
  });

  var ACTIONS = deepFreeze({
    START: "START",
    SET_FOLDS: "SET_FOLDS",
    SET_PHASE: "SET_PHASE",
    REVEAL: "REVEAL",
    RESTART: "RESTART"
  });

  function snapshotRecord(value, expectedKeys) {
    try {
      if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype
      ) {
        return null;
      }

      var ownKeys = Reflect.ownKeys(value);
      if (ownKeys.length !== expectedKeys.length) {
        return null;
      }

      for (var index = 0; index < ownKeys.length; index += 1) {
        if (
          typeof ownKeys[index] !== "string" ||
          expectedKeys.indexOf(ownKeys[index]) === -1
        ) {
          return null;
        }
      }

      var descriptors = Object.getOwnPropertyDescriptors(value);
      var snapshot = {};

      for (var keyIndex = 0; keyIndex < expectedKeys.length; keyIndex += 1) {
        var key = expectedKeys[keyIndex];
        var descriptor = descriptors[key];
        if (
          !descriptor ||
          descriptor.enumerable !== true ||
          !Object.prototype.hasOwnProperty.call(descriptor, "value")
        ) {
          return null;
        }
        snapshot[key] = descriptor.value;
      }

      return snapshot;
    } catch (_error) {
      return null;
    }
  }

  function snapshotMarks(value) {
    try {
      if (
        !Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Array.prototype ||
        value.length !== 2
      ) {
        return null;
      }

      var ownKeys = Reflect.ownKeys(value);
      if (
        ownKeys.length !== 3 ||
        ownKeys.indexOf("0") === -1 ||
        ownKeys.indexOf("1") === -1 ||
        ownKeys.indexOf("length") === -1
      ) {
        return null;
      }

      var descriptors = Object.getOwnPropertyDescriptors(value);
      if (
        !descriptors["0"] ||
        !descriptors["1"] ||
        !descriptors.length ||
        descriptors["0"].enumerable !== true ||
        descriptors["1"].enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptors["0"], "value") ||
        !Object.prototype.hasOwnProperty.call(descriptors["1"], "value")
      ) {
        return null;
      }

      return [descriptors["0"].value, descriptors["1"].value];
    } catch (_error) {
      return null;
    }
  }

  function isWellFormedUnicode(value) {
    for (var index = 0; index < value.length; index += 1) {
      var unit = value.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index + 1 >= value.length) {
          return false;
        }
        var next = value.charCodeAt(index + 1);
        if (next < 0xdc00 || next > 0xdfff) {
          return false;
        }
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return false;
      }
    }
    return true;
  }

  function sanitizeText(value, minimum, maximum, disallowWhitespace) {
    if (
      typeof value !== "string" ||
      !isWellFormedUnicode(value) ||
      FORBIDDEN_TEXT.test(value) ||
      (disallowWhitespace && ANY_WHITESPACE.test(value))
    ) {
      return null;
    }

    var normalized;
    try {
      normalized = value.normalize("NFC");
    } catch (_error) {
      return null;
    }

    if (!disallowWhitespace) {
      normalized = normalized.replace(COLLAPSIBLE_WHITESPACE, " ").trim();
    }

    var length = Array.from(normalized).length;
    if (length < minimum || length > maximum) {
      return null;
    }

    return normalized;
  }

  function isExactInteger(value, minimum, maximum) {
    return (
      typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= minimum &&
      value <= maximum
    );
  }

  function parseConfig(candidate) {
    var snapshot = snapshotRecord(candidate, CONFIG_KEYS);
    if (!snapshot) {
      return null;
    }

    var marks = snapshotMarks(snapshot.marks);
    if (!marks) {
      return null;
    }

    var parsed = {
      publicTitle: sanitizeText(snapshot.publicTitle, 1, 40, false),
      publicInstructions: sanitizeText(snapshot.publicInstructions, 1, 120, false),
      foldHint: sanitizeText(snapshot.foldHint, 1, 120, false),
      phaseHint: sanitizeText(snapshot.phaseHint, 1, 120, false),
      targetFolds: snapshot.targetFolds,
      targetPhase: snapshot.targetPhase,
      marks: [
        sanitizeText(marks[0], 1, 2, true),
        sanitizeText(marks[1], 1, 2, true)
      ],
      finalTitle: sanitizeText(snapshot.finalTitle, 1, 60, false),
      finalMessage: sanitizeText(snapshot.finalMessage, 1, 240, false),
      signature: sanitizeText(snapshot.signature, 1, 50, false)
    };

    if (
      parsed.publicTitle === null ||
      parsed.publicInstructions === null ||
      parsed.foldHint === null ||
      parsed.phaseHint === null ||
      parsed.marks[0] === null ||
      parsed.marks[1] === null ||
      parsed.finalTitle === null ||
      parsed.finalMessage === null ||
      parsed.signature === null ||
      !isExactInteger(
        parsed.targetFolds,
        CONSTANTS.FOLD_MIN,
        CONSTANTS.FOLD_MAX
      ) ||
      !isExactInteger(
        parsed.targetPhase,
        CONSTANTS.PHASE_MIN,
        CONSTANTS.PHASE_MAX
      ) ||
      (parsed.targetFolds === CONSTANTS.INITIAL_FOLDS &&
        parsed.targetPhase === CONSTANTS.INITIAL_PHASE)
    ) {
      return null;
    }

    return deepFreeze(parsed);
  }

  function sanitizeConfig(candidate) {
    var parsed = parseConfig(candidate);
    return parsed || DEFAULT_CONFIG;
  }

  function evaluateSelection(
    selectedFolds,
    selectedPhase,
    targetFolds,
    targetPhase
  ) {
    if (
      !isExactInteger(selectedFolds, CONSTANTS.FOLD_MIN, CONSTANTS.FOLD_MAX) ||
      !isExactInteger(selectedPhase, CONSTANTS.PHASE_MIN, CONSTANTS.PHASE_MAX) ||
      !isExactInteger(targetFolds, CONSTANTS.FOLD_MIN, CONSTANTS.FOLD_MAX) ||
      !isExactInteger(targetPhase, CONSTANTS.PHASE_MIN, CONSTANTS.PHASE_MAX)
    ) {
      return null;
    }

    var foldDistance = Math.abs(selectedFolds - targetFolds);
    var rawPhaseDistance = Math.abs(selectedPhase - targetPhase);
    var phaseDistance = Math.min(
      rawPhaseDistance,
      CONSTANTS.PHASE_COUNT - rawPhaseDistance
    );
    var foldStatus =
      foldDistance === 0
        ? "exact"
        : foldDistance <= CONSTANTS.NEAR_FOLD_DISTANCE
          ? "near"
          : "far";
    var phaseStatus =
      phaseDistance === 0
        ? "exact"
        : phaseDistance <= CONSTANTS.NEAR_PHASE_DISTANCE
          ? "near"
          : "far";

    return deepFreeze({
      foldDistance: foldDistance,
      phaseDistance: phaseDistance,
      foldStatus: foldStatus,
      phaseStatus: phaseStatus,
      aligned: foldStatus === "exact" && phaseStatus === "exact"
    });
  }

  function createPatternModel(folds, phaseStep) {
    if (
      !isExactInteger(folds, CONSTANTS.FOLD_MIN, CONSTANTS.FOLD_MAX) ||
      !isExactInteger(phaseStep, CONSTANTS.PHASE_MIN, CONSTANTS.PHASE_MAX)
    ) {
      return null;
    }

    var wedgeUnits = CONSTANTS.TURN_UNITS / folds;
    var wedges = [];

    for (var index = 0; index < folds; index += 1) {
      wedges.push({
        index: index,
        rotationUnits:
          (phaseStep * CONSTANTS.PHASE_UNITS + index * wedgeUnits) %
          CONSTANTS.TURN_UNITS,
        mirrored: index % 2 === 1
      });
    }

    return deepFreeze({
      turnUnits: CONSTANTS.TURN_UNITS,
      phaseUnits: CONSTANTS.PHASE_UNITS,
      folds: folds,
      phaseStep: phaseStep,
      wedges: wedges
    });
  }

  function isCanonicalContent(value, parsedContent) {
    try {
      var snapshot = snapshotRecord(value, CONFIG_KEYS);
      if (!snapshot) {
        return false;
      }
      var marks = snapshotMarks(snapshot.marks);
      if (
        !marks ||
        !Object.isFrozen(value) ||
        !Object.isFrozen(snapshot.marks)
      ) {
        return false;
      }

      for (var index = 0; index < CONFIG_KEYS.length; index += 1) {
        var key = CONFIG_KEYS[index];
        if (key === "marks") {
          if (
            marks[0] !== parsedContent.marks[0] ||
            marks[1] !== parsedContent.marks[1]
          ) {
            return false;
          }
        } else if (snapshot[key] !== parsedContent[key]) {
          return false;
        }
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  function validateState(candidate) {
    var state = snapshotRecord(candidate, STATE_KEYS);
    if (!state || state.version !== CONSTANTS.VERSION) {
      return null;
    }

    var selection = snapshotRecord(state.selection, SELECTION_KEYS);
    var parsedContent = parseConfig(state.content);
    if (
      !selection ||
      !parsedContent ||
      PHASES.indexOf(state.phase) === -1 ||
      !isExactInteger(
        selection.folds,
        CONSTANTS.FOLD_MIN,
        CONSTANTS.FOLD_MAX
      ) ||
      !isExactInteger(
        selection.phaseStep,
        CONSTANTS.PHASE_MIN,
        CONSTANTS.PHASE_MAX
      ) ||
      !isExactInteger(state.revision, 0, CONSTANTS.MAX_REVISION)
    ) {
      return null;
    }

    var evaluation = evaluateSelection(
      selection.folds,
      selection.phaseStep,
      parsedContent.targetFolds,
      parsedContent.targetPhase
    );

    if (
      (state.phase === "tuning" && evaluation.aligned) ||
      ((state.phase === "aligned" || state.phase === "complete") &&
        !evaluation.aligned)
    ) {
      return null;
    }

    return {
      phase: state.phase,
      content: isCanonicalContent(state.content, parsedContent)
        ? state.content
        : parsedContent,
      normalizedContent: parsedContent,
      folds: selection.folds,
      phaseStep: selection.phaseStep,
      revision: state.revision
    };
  }

  function makeState(phase, content, folds, phaseStep, revision) {
    return deepFreeze({
      version: CONSTANTS.VERSION,
      phase: phase,
      content: content,
      selection: {
        folds: folds,
        phaseStep: phaseStep
      },
      revision: revision
    });
  }

  function createInitialState(candidateConfig) {
    var content =
      arguments.length === 0
        ? DEFAULT_CONFIG
        : sanitizeConfig(candidateConfig);

    return makeState(
      "intro",
      content,
      CONSTANTS.INITIAL_FOLDS,
      CONSTANTS.INITIAL_PHASE,
      0
    );
  }

  function validateAction(candidate) {
    var typeProbe = snapshotRecord(candidate, ["type", "revision"]);
    if (typeProbe) {
      if (
        typeProbe.type === ACTIONS.START ||
        typeProbe.type === ACTIONS.REVEAL ||
        typeProbe.type === ACTIONS.RESTART
      ) {
        return typeProbe;
      }
      return null;
    }

    var valueAction = snapshotRecord(candidate, ["type", "value", "revision"]);
    if (
      valueAction &&
      (valueAction.type === ACTIONS.SET_FOLDS ||
        valueAction.type === ACTIONS.SET_PHASE)
    ) {
      return valueAction;
    }

    return null;
  }

  function reduce(candidateState, candidateAction) {
    try {
      var state = validateState(candidateState);
      var action = validateAction(candidateAction);

      if (
        !state ||
        !action ||
        !isExactInteger(action.revision, 0, CONSTANTS.MAX_REVISION) ||
        action.revision !== state.revision ||
        state.revision >= CONSTANTS.MAX_REVISION
      ) {
        return candidateState;
      }

      var nextRevision = state.revision + 1;

      if (action.type === ACTIONS.START) {
        if (state.phase !== "intro") {
          return candidateState;
        }

        var startEvaluation = evaluateSelection(
          state.folds,
          state.phaseStep,
          state.normalizedContent.targetFolds,
          state.normalizedContent.targetPhase
        );
        if (startEvaluation.aligned) {
          return candidateState;
        }

        return makeState(
          "tuning",
          state.content,
          state.folds,
          state.phaseStep,
          nextRevision
        );
      }

      if (action.type === ACTIONS.SET_FOLDS) {
        if (
          state.phase !== "tuning" ||
          !isExactInteger(action.value, CONSTANTS.FOLD_MIN, CONSTANTS.FOLD_MAX) ||
          action.value === state.folds
        ) {
          return candidateState;
        }

        var foldEvaluation = evaluateSelection(
          action.value,
          state.phaseStep,
          state.normalizedContent.targetFolds,
          state.normalizedContent.targetPhase
        );
        return makeState(
          foldEvaluation.aligned ? "aligned" : "tuning",
          state.content,
          action.value,
          state.phaseStep,
          nextRevision
        );
      }

      if (action.type === ACTIONS.SET_PHASE) {
        if (
          state.phase !== "tuning" ||
          !isExactInteger(action.value, CONSTANTS.PHASE_MIN, CONSTANTS.PHASE_MAX) ||
          action.value === state.phaseStep
        ) {
          return candidateState;
        }

        var phaseEvaluation = evaluateSelection(
          state.folds,
          action.value,
          state.normalizedContent.targetFolds,
          state.normalizedContent.targetPhase
        );
        return makeState(
          phaseEvaluation.aligned ? "aligned" : "tuning",
          state.content,
          state.folds,
          action.value,
          nextRevision
        );
      }

      if (action.type === ACTIONS.REVEAL) {
        if (state.phase !== "aligned") {
          return candidateState;
        }
        return makeState(
          "complete",
          state.content,
          state.folds,
          state.phaseStep,
          nextRevision
        );
      }

      if (action.type === ACTIONS.RESTART) {
        if (state.phase !== "complete") {
          return candidateState;
        }
        return makeState(
          "intro",
          state.content,
          CONSTANTS.INITIAL_FOLDS,
          CONSTANTS.INITIAL_PHASE,
          nextRevision
        );
      }

      return candidateState;
    } catch (_error) {
      return candidateState;
    }
  }

  function phaseDisplayText(phaseStep) {
    return "第 " + phaseStep + " / 24 格";
  }

  function getPublicView(candidateState) {
    try {
      var state = validateState(candidateState);
      if (!state) {
        return null;
      }

      if (state.phase === "intro") {
        return deepFreeze({
          phase: "intro",
          revision: state.revision,
          title: state.normalizedContent.publicTitle,
          instructions: state.normalizedContent.publicInstructions,
          primaryAction: {
            id: "start",
            label: "开始折光"
          }
        });
      }

      var pattern = createPatternModel(state.folds, state.phaseStep);

      if (state.phase === "tuning") {
        var evaluation = evaluateSelection(
          state.folds,
          state.phaseStep,
          state.normalizedContent.targetFolds,
          state.normalizedContent.targetPhase
        );
        var foldStatusText = STATUS_TEXT[evaluation.foldStatus];
        var phaseStatusText = STATUS_TEXT[evaluation.phaseStatus];

        return deepFreeze({
          phase: "tuning",
          revision: state.revision,
          title: state.normalizedContent.publicTitle,
          foldControl: {
            label: "选择镜面阶数",
            hint: state.normalizedContent.foldHint,
            values: CONSTANTS.FOLD_VALUES.slice(),
            selected: state.folds,
            status: evaluation.foldStatus,
            statusText: foldStatusText
          },
          phaseControl: {
            label: "转动相位",
            hint: state.normalizedContent.phaseHint,
            min: CONSTANTS.PHASE_MIN,
            max: CONSTANTS.PHASE_MAX,
            step: 1,
            selected: state.phaseStep,
            displayText: phaseDisplayText(state.phaseStep),
            status: evaluation.phaseStatus,
            statusText: phaseStatusText
          },
          summary:
            "折面" + foldStatusText + "；相位" + phaseStatusText + "。",
          pattern: pattern
        });
      }

      if (state.phase === "aligned") {
        return deepFreeze({
          phase: "aligned",
          revision: state.revision,
          title: state.normalizedContent.publicTitle,
          summary: "这束光已经对齐。",
          selection: {
            folds: state.folds,
            phaseStep: state.phaseStep,
            phaseDisplayText: phaseDisplayText(state.phaseStep)
          },
          pattern: pattern,
          primaryAction: {
            id: "reveal",
            label: "照见我们"
          }
        });
      }

      return deepFreeze({
        phase: "complete",
        revision: state.revision,
        publicTitle: state.normalizedContent.publicTitle,
        finalTitle: state.normalizedContent.finalTitle,
        marks: [
          {
            position: "left",
            label: "左边的光",
            text: state.normalizedContent.marks[0]
          },
          {
            position: "right",
            label: "右边的光",
            text: state.normalizedContent.marks[1]
          }
        ],
        finalMessage: state.normalizedContent.finalMessage,
        signature: state.normalizedContent.signature,
        pattern: pattern,
        primaryAction: {
          id: "restart",
          label: "再折一次"
        }
      });
    } catch (_error) {
      return null;
    }
  }

  return deepFreeze({
    CONSTANTS: CONSTANTS,
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    ACTIONS: ACTIONS,
    sanitizeConfig: sanitizeConfig,
    evaluateSelection: evaluateSelection,
    createPatternModel: createPatternModel,
    createInitialState: createInitialState,
    reduce: reduce,
    getPublicView: getPublicView
  });
});
