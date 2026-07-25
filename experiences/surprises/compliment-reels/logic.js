(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module && module.exports) module.exports = api;
  if (root && typeof root === "object") root.COMPLIMENT_REELS_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const objectFreeze = Object.freeze;
  const numberIsInteger = Number.isInteger;
  const numberIsSafeInteger = Number.isSafeInteger;
  const stringTrim = String.prototype.trim;
  const stringCharCodeAt = String.prototype.charCodeAt;
  const stringCodePointAt = String.prototype.codePointAt;
  const stringFromCodePoint = String.fromCodePoint;
  const stringConstructor = String;
  const regexpTest = RegExp.prototype.test;
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;
  const unicodeMarkPattern = /\p{M}/u;
  const extendedPictographicPattern = /\p{Extended_Pictographic}/u;
  const intlSegmenter = typeof Intl === "object" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter("zh", { granularity: "grapheme" })
    : null;

  const VERSION = 1;
  const PLAN_LENGTH = 6;
  const JACKPOT_MIN_SPIN = 3;
  const JACKPOT_MAX_SPIN = 6;
  const ENTROPY_LENGTH = 64;
  const UINT32_RANGE = 4294967296;
  const MAX_REVISION = 9007199254740991;

  const COLUMN_IDS = deepFreeze(["moment", "shine", "echo"]);
  const COLUMN_LABELS = deepFreeze({
    moment: "我看见的你",
    shine: "发亮的样子",
    echo: "留给我的感觉",
  });
  const ITEM_IDS = deepFreeze({
    moment: ["m_listen", "m_remember", "m_finish", "m_slow", "m_notice", "m_care"],
    shine: ["s_gentle", "s_light", "s_safe", "s_steady", "s_lovely", "s_true"],
    echo: ["e_beside", "e_here", "e_closer", "e_strength", "e_future", "e_smile"],
  });
  const SIGNATURE_IDS = deepFreeze({
    moment: "m_slow",
    shine: "s_safe",
    echo: "e_here",
  });
  const TEXT_LIMITS = deepFreeze({
    moment: [4, 18],
    shine: [4, 18],
    echo: [4, 22],
  });
  const FALLBACK_ENTROPY = deepFreeze([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
    32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63,
  ]);
  const CONFIG_KEYS = deepFreeze([
    "recipient", "sender", "columns", "composeJackpotNote",
  ]);
  const CONTENT_KEYS = deepFreeze(["recipient", "sender", "columns"]);
  const COLUMN_KEYS = COLUMN_IDS;
  const ITEM_KEYS = deepFreeze(["id", "text"]);
  const PLAN_KEYS = deepFreeze(["jackpotSpin", "stops"]);
  const STATE_KEYS = deepFreeze([
    "version", "phase", "content", "plan", "settledCount", "randomMode",
    "jackpotNote", "spinToken", "revision",
  ]);
  const ARM_KEYS = deepFreeze([
    "type", "entropy", "randomMode", "content", "jackpotNote",
  ]);
  const PHASES = deepFreeze(["intro", "ready", "spinning", "result", "jackpot"]);

  const DEFAULT_CONTENT_SOURCE = {
    recipient: "你",
    sender: "我",
    columns: {
      moment: [
        { id: "m_listen", text: "你认真听我说话的时候" },
        { id: "m_remember", text: "你把小事放在心上的时候" },
        { id: "m_finish", text: "你耐心把事情做完的时候" },
        { id: "m_slow", text: "你愿意慢下来陪我的时候" },
        { id: "m_notice", text: "你发现我情绪变化的时候" },
        { id: "m_care", text: "你照顾身边人的时候" },
      ],
      shine: [
        { id: "s_gentle", text: "总有一种很温柔的认真" },
        { id: "s_light", text: "总能把普通一天慢慢照亮" },
        { id: "s_safe", text: "会让安心变成很具体的事" },
        { id: "s_steady", text: "总带着安静又可靠的力量" },
        { id: "s_lovely", text: "总能显出你细腻的用心" },
        { id: "s_true", text: "会把真诚留在每一个细节里" },
      ],
      echo: [
        { id: "e_beside", text: "让我更喜欢和你并肩的日子" },
        { id: "e_here", text: "让我觉得身边有你真好" },
        { id: "e_closer", text: "让我总想再靠近你一点点" },
        { id: "e_strength", text: "让我知道温柔也可以很有力量" },
        { id: "e_future", text: "让我对我们的以后多一点期待" },
        { id: "e_smile", text: "让我每次想起都会悄悄开心" },
      ],
    },
  };

  function defaultComposer(summary) {
    return `${summary.recipient}，这些不是碰巧，是我真的一直这样看见你。——${summary.sender}`;
  }

  const DEFAULT_CONFIG = deepFreeze({
    recipient: DEFAULT_CONTENT_SOURCE.recipient,
    sender: DEFAULT_CONTENT_SOURCE.sender,
    columns: cloneColumns(DEFAULT_CONTENT_SOURCE.columns),
    composeJackpotNote: defaultComposer,
  });

  function call(intrinsic, receiver, args) {
    return reflectApply(intrinsic, receiver, args);
  }

  function deepFreeze(value) {
    if (value === null || typeof value !== "object") return value;
    const keys = reflectOwnKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const descriptor = reflectGetOwnPropertyDescriptor(value, keys[index]);
      if (descriptor && "value" in descriptor) deepFreeze(descriptor.value);
    }
    return objectFreeze(value);
  }

  function cloneColumns(columns) {
    const result = {};
    for (let columnIndex = 0; columnIndex < COLUMN_IDS.length; columnIndex += 1) {
      const columnId = COLUMN_IDS[columnIndex];
      const items = [];
      for (let itemIndex = 0; itemIndex < PLAN_LENGTH; itemIndex += 1) {
        items[itemIndex] = {
          id: columns[columnId][itemIndex].id,
          text: columns[columnId][itemIndex].text,
        };
      }
      result[columnId] = items;
    }
    return result;
  }

  function hasExactOwnKeys(actualKeys, expectedKeys) {
    if (actualKeys.length !== expectedKeys.length) return false;
    for (let index = 0; index < actualKeys.length; index += 1) {
      if (typeof actualKeys[index] !== "string") return false;
    }
    for (let expectedIndex = 0; expectedIndex < expectedKeys.length; expectedIndex += 1) {
      let found = false;
      for (let actualIndex = 0; actualIndex < actualKeys.length; actualIndex += 1) {
        if (actualKeys[actualIndex] === expectedKeys[expectedIndex]) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  function snapshotObject(value, expectedKeys) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let ownKeys;
    try {
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype || !hasExactOwnKeys(ownKeys, expectedKeys)) return null;

    const snapshot = {};
    for (let index = 0; index < expectedKeys.length; index += 1) {
      const key = expectedKeys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  }

  function snapshotArray(value, exactLength) {
    if (value === null || typeof value !== "object") return null;
    let nativeArray;
    let prototype;
    let ownKeys;
    try {
      nativeArray = arrayIsArray(value);
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (!nativeArray || prototype !== arrayPrototype || ownKeys.length !== exactLength + 1) {
      return null;
    }

    let lengthDescriptor;
    try {
      lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length");
    } catch (_error) {
      return null;
    }
    if (!lengthDescriptor || !("value" in lengthDescriptor)
      || lengthDescriptor.value !== exactLength
      || lengthDescriptor.enumerable !== false
      || lengthDescriptor.configurable !== false) return null;

    for (let keyIndex = 0; keyIndex < ownKeys.length; keyIndex += 1) {
      const key = ownKeys[keyIndex];
      if (typeof key !== "string") return null;
      if (key === "length") continue;
      let validIndex = false;
      for (let index = 0; index < exactLength; index += 1) {
        if (key === stringConstructor(index)) {
          validIndex = true;
          break;
        }
      }
      if (!validIndex) return null;
    }

    const snapshot = [];
    for (let index = 0; index < exactLength; index += 1) {
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, stringConstructor(index));
      } catch (_error) {
        return null;
      }
      if (!descriptor || !("value" in descriptor)) return null;
      snapshot[index] = descriptor.value;
    }
    return snapshot;
  }

  function trim(value) {
    return call(stringTrim, value, []);
  }

  function hasLoneSurrogate(value) {
    for (let index = 0; index < value.length; index += 1) {
      const unit = call(stringCharCodeAt, value, [index]);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index + 1 >= value.length) return true;
        const next = call(stringCharCodeAt, value, [index + 1]);
        if (next < 0xdc00 || next > 0xdfff) return true;
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return true;
      }
    }
    return false;
  }

  function hasControl(value) {
    for (let index = 0; index < value.length; index += 1) {
      const unit = call(stringCharCodeAt, value, [index]);
      if (unit <= 0x1f || (unit >= 0x7f && unit <= 0x9f)) return true;
    }
    return false;
  }

  function graphemeCount(value) {
    if (intlSegmenter) {
      let count = 0;
      const iterator = intlSegmenter.segment(value)[Symbol.iterator]();
      while (!iterator.next().done) count += 1;
      return count;
    }
    let count = 0;
    let index = 0;
    while (index < value.length) {
      const first = call(stringCodePointAt, value, [index]);
      index += first > 0xffff ? 2 : 1;
      count += 1;
      if (first === 0x0d && index < value.length
        && call(stringCodePointAt, value, [index]) === 0x0a) {
        index += 1;
        continue;
      }
      if (isRegionalIndicator(first) && index < value.length) {
        const regional = call(stringCodePointAt, value, [index]);
        if (isRegionalIndicator(regional)) index += regional > 0xffff ? 2 : 1;
      }
      let hangulClass = getHangulClass(first);
      while (hangulClass !== 0 && index < value.length) {
        const next = call(stringCodePointAt, value, [index]);
        const nextClass = getHangulClass(next);
        if (!hangulJoins(hangulClass, nextClass)) break;
        index += next > 0xffff ? 2 : 1;
        hangulClass = nextClass;
      }
      index = consumeGraphemeExtenders(value, index);
      const pictographicSequence = isExtendedPictographic(first);
      while (index < value.length && call(stringCodePointAt, value, [index]) === 0x200d) {
        index += 1;
        if (!pictographicSequence || index >= value.length) break;
        const joined = call(stringCodePointAt, value, [index]);
        if (!isExtendedPictographic(joined)) break;
        index += joined > 0xffff ? 2 : 1;
        index = consumeGraphemeExtenders(value, index);
      }
    }
    return count;
  }

  function isRegionalIndicator(codePoint) {
    return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
  }

  function isExtendedPictographic(codePoint) {
    return call(regexpTest, extendedPictographicPattern, [stringFromCodePoint(codePoint)]);
  }

  function getHangulClass(codePoint) {
    if ((codePoint >= 0x1100 && codePoint <= 0x115f)
      || (codePoint >= 0xa960 && codePoint <= 0xa97c)) return 1;
    if ((codePoint >= 0x1160 && codePoint <= 0x11a7)
      || (codePoint >= 0xd7b0 && codePoint <= 0xd7c6)) return 2;
    if ((codePoint >= 0x11a8 && codePoint <= 0x11ff)
      || (codePoint >= 0xd7cb && codePoint <= 0xd7fb)) return 3;
    if (codePoint >= 0xac00 && codePoint <= 0xd7a3) {
      return (codePoint - 0xac00) % 28 === 0 ? 4 : 5;
    }
    return 0;
  }

  function hangulJoins(leftClass, rightClass) {
    return (leftClass === 1
      && (rightClass === 1 || rightClass === 2 || rightClass === 4 || rightClass === 5))
      || ((leftClass === 2 || leftClass === 4) && (rightClass === 2 || rightClass === 3))
      || ((leftClass === 3 || leftClass === 5) && rightClass === 3);
  }

  function isGraphemeExtender(codePoint) {
    return call(regexpTest, unicodeMarkPattern, [stringFromCodePoint(codePoint)])
      || (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff);
  }

  function consumeGraphemeExtenders(value, index) {
    let cursor = index;
    while (cursor < value.length) {
      const codePoint = call(stringCodePointAt, value, [cursor]);
      if (!isGraphemeExtender(codePoint)) break;
      cursor += codePoint > 0xffff ? 2 : 1;
    }
    return cursor;
  }

  function cleanText(value, minimum, maximum, forbidComposerPunctuation) {
    if (typeof value !== "string" || hasLoneSurrogate(value) || hasControl(value)) return null;
    const cleaned = trim(value);
    const count = graphemeCount(cleaned);
    if (count < minimum || count > maximum) return null;
    if (forbidComposerPunctuation && (cleaned.includes("，") || cleaned.includes("。"))) {
      return null;
    }
    return cleaned;
  }

  function parseContent(candidate) {
    const content = snapshotObject(candidate, CONTENT_KEYS);
    if (!content) return null;
    const recipient = cleanText(content.recipient, 1, 12, false);
    const sender = cleanText(content.sender, 1, 12, false);
    if (!recipient || !sender || recipient === sender) return null;

    const columnsSnapshot = snapshotObject(content.columns, COLUMN_KEYS);
    if (!columnsSnapshot) return null;
    const columns = {};
    for (let columnIndex = 0; columnIndex < COLUMN_IDS.length; columnIndex += 1) {
      const columnId = COLUMN_IDS[columnIndex];
      const inputItems = snapshotArray(columnsSnapshot[columnId], PLAN_LENGTH);
      if (!inputItems) return null;
      const outputItems = [];
      const seenTexts = [];
      for (let itemIndex = 0; itemIndex < PLAN_LENGTH; itemIndex += 1) {
        const item = snapshotObject(inputItems[itemIndex], ITEM_KEYS);
        if (!item || item.id !== ITEM_IDS[columnId][itemIndex]) return null;
        const limits = TEXT_LIMITS[columnId];
        const text = cleanText(item.text, limits[0], limits[1], true);
        if (!text) return null;
        for (let seenIndex = 0; seenIndex < seenTexts.length; seenIndex += 1) {
          if (seenTexts[seenIndex] === text) return null;
        }
        seenTexts[seenTexts.length] = text;
        outputItems[itemIndex] = { id: item.id, text };
      }
      columns[columnId] = outputItems;
    }
    return deepFreeze({ recipient, sender, columns });
  }

  function parseRawConfig(candidate) {
    const config = snapshotObject(candidate, CONFIG_KEYS);
    if (!config || typeof config.composeJackpotNote !== "function") return null;
    const content = parseContent({
      recipient: config.recipient,
      sender: config.sender,
      columns: config.columns,
    });
    if (!content) return null;
    return deepFreeze({ content, composeJackpotNote: config.composeJackpotNote });
  }

  const DEFAULT_SANITIZED = deepFreeze({
    content: parseContent(DEFAULT_CONTENT_SOURCE),
    composeJackpotNote: defaultComposer,
  });

  function sanitizeConfig(candidate) {
    return parseRawConfig(candidate) || DEFAULT_SANITIZED;
  }

  function copyEntropy(candidate) {
    const entropy = snapshotArray(candidate, ENTROPY_LENGTH);
    if (!entropy) return null;
    const copy = [];
    for (let index = 0; index < ENTROPY_LENGTH; index += 1) {
      const word = entropy[index];
      if (!numberIsInteger(word) || word < 0 || word >= UINT32_RANGE) return null;
      copy[index] = word;
    }
    return copy;
  }

  function arraysEqual(left, right) {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }

  function buildSpinPlan(candidateEntropy) {
    const entropy = copyEntropy(candidateEntropy);
    if (!entropy) return null;
    let cursor = 0;

    function bounded(maxExclusive) {
      const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
      while (cursor < entropy.length) {
        const word = entropy[cursor];
        cursor += 1;
        if (word < limit) return word % maxExclusive;
      }
      return null;
    }

    const jackpotOffset = bounded(4);
    if (jackpotOffset === null) return null;
    const jackpotSpin = JACKPOT_MIN_SPIN + jackpotOffset;
    const columnPlans = {};

    for (let columnIndex = 0; columnIndex < COLUMN_IDS.length; columnIndex += 1) {
      const columnId = COLUMN_IDS[columnIndex];
      const remaining = [];
      for (let itemIndex = 0; itemIndex < PLAN_LENGTH; itemIndex += 1) {
        const itemId = ITEM_IDS[columnId][itemIndex];
        if (itemId !== SIGNATURE_IDS[columnId]) remaining[remaining.length] = itemId;
      }
      for (let index = remaining.length - 1; index >= 1; index -= 1) {
        const swapIndex = bounded(index + 1);
        if (swapIndex === null) return null;
        const temporary = remaining[index];
        remaining[index] = remaining[swapIndex];
        remaining[swapIndex] = temporary;
      }
      const sequence = [];
      let remainingIndex = 0;
      for (let stopIndex = 0; stopIndex < PLAN_LENGTH; stopIndex += 1) {
        if (stopIndex === jackpotSpin - 1) {
          sequence[stopIndex] = SIGNATURE_IDS[columnId];
        } else {
          sequence[stopIndex] = remaining[remainingIndex];
          remainingIndex += 1;
        }
      }
      columnPlans[columnId] = sequence;
    }

    const stops = [];
    for (let stopIndex = 0; stopIndex < PLAN_LENGTH; stopIndex += 1) {
      stops[stopIndex] = [
        columnPlans.moment[stopIndex],
        columnPlans.shine[stopIndex],
        columnPlans.echo[stopIndex],
      ];
    }
    return parsePlan({ jackpotSpin, stops });
  }

  function parsePlan(candidate) {
    const plan = snapshotObject(candidate, PLAN_KEYS);
    if (!plan || !numberIsInteger(plan.jackpotSpin)
      || plan.jackpotSpin < JACKPOT_MIN_SPIN
      || plan.jackpotSpin > JACKPOT_MAX_SPIN) return null;
    const stopsInput = snapshotArray(plan.stops, PLAN_LENGTH);
    if (!stopsInput) return null;
    const stops = [];
    const projected = { moment: [], shine: [], echo: [] };
    const tripleKeys = [];

    for (let stopIndex = 0; stopIndex < PLAN_LENGTH; stopIndex += 1) {
      const triple = snapshotArray(stopsInput[stopIndex], COLUMN_IDS.length);
      if (!triple) return null;
      const copy = [];
      for (let columnIndex = 0; columnIndex < COLUMN_IDS.length; columnIndex += 1) {
        const columnId = COLUMN_IDS[columnIndex];
        const itemId = triple[columnIndex];
        let known = false;
        for (let idIndex = 0; idIndex < PLAN_LENGTH; idIndex += 1) {
          if (ITEM_IDS[columnId][idIndex] === itemId) known = true;
        }
        if (!known) return null;
        projected[columnId][stopIndex] = itemId;
        copy[columnIndex] = itemId;
      }
      const tripleKey = `${copy[0]}\u0000${copy[1]}\u0000${copy[2]}`;
      for (let keyIndex = 0; keyIndex < tripleKeys.length; keyIndex += 1) {
        if (tripleKeys[keyIndex] === tripleKey) return null;
      }
      tripleKeys[tripleKeys.length] = tripleKey;
      stops[stopIndex] = copy;
    }

    for (let columnIndex = 0; columnIndex < COLUMN_IDS.length; columnIndex += 1) {
      const columnId = COLUMN_IDS[columnIndex];
      for (let expectedIndex = 0; expectedIndex < PLAN_LENGTH; expectedIndex += 1) {
        let count = 0;
        for (let actualIndex = 0; actualIndex < PLAN_LENGTH; actualIndex += 1) {
          if (projected[columnId][actualIndex] === ITEM_IDS[columnId][expectedIndex]) count += 1;
        }
        if (count !== 1) return null;
      }
    }

    let signatureCount = 0;
    for (let stopIndex = 0; stopIndex < PLAN_LENGTH; stopIndex += 1) {
      const isSignature = isSignatureTriple(stops[stopIndex]);
      if (isSignature) {
        signatureCount += 1;
        if (stopIndex !== plan.jackpotSpin - 1) return null;
      }
      if (stopIndex < 2 && isSignature) return null;
    }
    if (signatureCount !== 1) return null;
    return deepFreeze({ jackpotSpin: plan.jackpotSpin, stops });
  }

  function isSignatureTriple(triple) {
    return triple[0] === SIGNATURE_IDS.moment
      && triple[1] === SIGNATURE_IDS.shine
      && triple[2] === SIGNATURE_IDS.echo;
  }

  function plansEqual(left, right) {
    if (left.jackpotSpin !== right.jackpotSpin) return false;
    for (let stopIndex = 0; stopIndex < PLAN_LENGTH; stopIndex += 1) {
      for (let columnIndex = 0; columnIndex < COLUMN_IDS.length; columnIndex += 1) {
        if (left.stops[stopIndex][columnIndex] !== right.stops[stopIndex][columnIndex]) {
          return false;
        }
      }
    }
    return true;
  }

  function composePraise(moment, shine, echo) {
    if (typeof moment !== "string" || typeof shine !== "string" || typeof echo !== "string") {
      return null;
    }
    return `${moment}，${shine}，${echo}。`;
  }

  function textForId(content, columnId, itemId) {
    for (let index = 0; index < PLAN_LENGTH; index += 1) {
      if (content.columns[columnId][index].id === itemId) {
        return content.columns[columnId][index].text;
      }
    }
    return null;
  }

  function phraseForStop(content, stop) {
    return composePraise(
      textForId(content, "moment", stop[0]),
      textForId(content, "shine", stop[1]),
      textForId(content, "echo", stop[2]),
    );
  }

  function guarded(value) {
    if (value === null || typeof value !== "object") return value;
    const copy = arrayIsArray(value) ? [] : {};
    const keys = reflectOwnKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      if (key === "length") continue;
      const descriptor = reflectGetOwnPropertyDescriptor(value, key);
      if (descriptor && "value" in descriptor) copy[key] = guarded(descriptor.value);
    }
    objectFreeze(copy);
    return new Proxy(copy, {
      set() {
        throw new TypeError("summary is read-only");
      },
      deleteProperty() {
        throw new TypeError("summary is read-only");
      },
      defineProperty() {
        throw new TypeError("summary is read-only");
      },
      setPrototypeOf() {
        throw new TypeError("summary is read-only");
      },
    });
  }

  function safeJackpotNote(composer, summary) {
    let result;
    try {
      result = call(composer, undefined, [guarded(summary)]);
    } catch (_error) {
      result = null;
    }
    const cleaned = cleanText(result, 1, 120, false);
    if (cleaned) return cleaned;
    return defaultComposer(summary);
  }

  function createArmAction(rawConfig, candidateEntropy, randomMode) {
    if (randomMode !== "crypto" && randomMode !== "fallback") return null;
    const entropy = copyEntropy(candidateEntropy);
    if (!entropy) return null;
    if (randomMode === "fallback" && !arraysEqual(entropy, FALLBACK_ENTROPY)) return null;
    const plan = buildSpinPlan(entropy);
    if (!plan) return null;
    const sanitized = sanitizeConfig(rawConfig);
    const revealedPraises = [];
    for (let index = 0; index < plan.jackpotSpin; index += 1) {
      revealedPraises[index] = phraseForStop(sanitized.content, plan.stops[index]);
    }
    const summary = deepFreeze({
      recipient: sanitized.content.recipient,
      sender: sanitized.content.sender,
      pullCount: plan.jackpotSpin,
      revealedPraises,
      jackpotPhrase: revealedPraises[revealedPraises.length - 1],
    });
    const jackpotNote = safeJackpotNote(sanitized.composeJackpotNote, summary);
    return deepFreeze({
      type: "ARM",
      entropy,
      randomMode,
      content: parseContent(sanitized.content),
      jackpotNote,
    });
  }

  function createInitialState(revision) {
    const safeRevision = numberIsSafeInteger(revision) && revision >= 0 && revision <= MAX_REVISION
      ? revision
      : 0;
    return deepFreeze({
      version: VERSION,
      phase: "intro",
      content: null,
      plan: null,
      settledCount: 0,
      randomMode: null,
      jackpotNote: null,
      spinToken: null,
      revision: safeRevision,
    });
  }

  function parseNote(value) {
    return cleanText(value, 1, 120, false);
  }

  function parseState(candidate) {
    const state = snapshotObject(candidate, STATE_KEYS);
    if (!state || state.version !== VERSION || !PHASES.includes(state.phase)
      || !numberIsSafeInteger(state.revision)
      || state.revision < 0 || state.revision > MAX_REVISION) return null;

    if (state.phase === "intro") {
      if (state.content !== null || state.plan !== null || state.settledCount !== 0
        || state.randomMode !== null || state.jackpotNote !== null || state.spinToken !== null) {
        return null;
      }
      return {
        version: VERSION,
        phase: "intro",
        content: null,
        plan: null,
        settledCount: 0,
        randomMode: null,
        jackpotNote: null,
        spinToken: null,
        revision: state.revision,
      };
    }

    const content = parseContent(state.content);
    const plan = parsePlan(state.plan);
    const jackpotNote = parseNote(state.jackpotNote);
    if (!content || !plan || !jackpotNote
      || (state.randomMode !== "crypto" && state.randomMode !== "fallback")
      || !numberIsInteger(state.settledCount)) return null;
    if (state.randomMode === "fallback"
      && !plansEqual(plan, buildSpinPlan(FALLBACK_ENTROPY))) return null;

    const remaining = plan.jackpotSpin - state.settledCount;
    if (state.phase === "ready") {
      if (state.settledCount !== 0 || state.spinToken !== null
        || state.revision > MAX_REVISION - 2 * remaining) return null;
    } else if (state.phase === "spinning") {
      if (state.settledCount < 0 || state.settledCount >= plan.jackpotSpin
        || !numberIsSafeInteger(state.spinToken)
        || state.spinToken !== state.revision
        || state.revision > MAX_REVISION - (2 * remaining - 1)) return null;
    } else if (state.phase === "result") {
      if (state.settledCount < 1 || state.settledCount >= plan.jackpotSpin
        || state.spinToken !== null
        || isSignatureTriple(plan.stops[state.settledCount - 1])
        || state.revision > MAX_REVISION - 2 * remaining) return null;
    } else if (state.phase === "jackpot") {
      if (state.settledCount !== plan.jackpotSpin || state.spinToken !== null
        || !isSignatureTriple(plan.stops[state.settledCount - 1])) return null;
    }

    return {
      version: VERSION,
      phase: state.phase,
      content,
      plan,
      settledCount: state.settledCount,
      randomMode: state.randomMode,
      jackpotNote,
      spinToken: state.spinToken,
      revision: state.revision,
    };
  }

  function parseArmAction(candidate) {
    const action = snapshotObject(candidate, ARM_KEYS);
    if (!action || action.type !== "ARM"
      || (action.randomMode !== "crypto" && action.randomMode !== "fallback")) return null;
    const entropy = copyEntropy(action.entropy);
    const content = parseContent(action.content);
    const jackpotNote = parseNote(action.jackpotNote);
    if (!entropy || !content || !jackpotNote) return null;
    if (action.randomMode === "fallback" && !arraysEqual(entropy, FALLBACK_ENTROPY)) return null;
    const plan = buildSpinPlan(entropy);
    if (!plan) return null;
    return { entropy, content, jackpotNote, randomMode: action.randomMode, plan };
  }

  function exactAction(candidate, expectedKeys, expectedType) {
    const action = snapshotObject(candidate, expectedKeys);
    if (!action || action.type !== expectedType) return null;
    return action;
  }

  function makeState(values) {
    return deepFreeze({
      version: VERSION,
      phase: values.phase,
      content: values.content,
      plan: values.plan,
      settledCount: values.settledCount,
      randomMode: values.randomMode,
      jackpotNote: values.jackpotNote,
      spinToken: values.spinToken,
      revision: values.revision,
    });
  }

  function settle(parsed) {
    const nextCount = parsed.settledCount + 1;
    return makeState({
      phase: nextCount === parsed.plan.jackpotSpin ? "jackpot" : "result",
      content: parsed.content,
      plan: parsed.plan,
      settledCount: nextCount,
      randomMode: parsed.randomMode,
      jackpotNote: parsed.jackpotNote,
      spinToken: null,
      revision: parsed.revision + 1,
    });
  }

  function reduce(state, action) {
    const parsed = parseState(state);
    if (!parsed) return createInitialState();

    if (parsed.phase === "intro") {
      const arm = parseArmAction(action);
      if (!arm || parsed.revision > MAX_REVISION - (1 + 2 * arm.plan.jackpotSpin)) {
        return state;
      }
      return makeState({
        phase: "ready",
        content: arm.content,
        plan: arm.plan,
        settledCount: 0,
        randomMode: arm.randomMode,
        jackpotNote: arm.jackpotNote,
        spinToken: null,
        revision: parsed.revision + 1,
      });
    }

    if (parsed.phase === "ready" || parsed.phase === "result") {
      const pull = exactAction(action, ["type"], "PULL");
      const remaining = parsed.plan.jackpotSpin - parsed.settledCount;
      if (!pull || parsed.settledCount >= parsed.plan.jackpotSpin
        || parsed.revision > MAX_REVISION - 2 * remaining) return state;
      return makeState({
        phase: "spinning",
        content: parsed.content,
        plan: parsed.plan,
        settledCount: parsed.settledCount,
        randomMode: parsed.randomMode,
        jackpotNote: parsed.jackpotNote,
        spinToken: parsed.revision + 1,
        revision: parsed.revision + 1,
      });
    }

    if (parsed.phase === "spinning") {
      const suspend = exactAction(action, ["type"], "SUSPEND");
      if (suspend) return settle(parsed);
      const finish = exactAction(action, ["type", "spinToken"], "SETTLE");
      if (!finish || !numberIsSafeInteger(finish.spinToken)
        || finish.spinToken !== parsed.spinToken) return state;
      return settle(parsed);
    }

    if (parsed.phase === "jackpot") {
      const restart = exactAction(action, ["type"], "RESTART");
      if (!restart || parsed.revision > MAX_REVISION - (2 + 2 * JACKPOT_MAX_SPIN)) {
        return state;
      }
      return createInitialState(parsed.revision + 1);
    }

    return state;
  }

  function initialPublicView(revision) {
    return deepFreeze({
      phase: "intro",
      recipient: DEFAULT_CONTENT_SOURCE.recipient,
      sender: DEFAULT_CONTENT_SOURCE.sender,
      columns: [
        { id: "moment", label: COLUMN_LABELS.moment, text: null },
        { id: "shine", label: COLUMN_LABELS.shine, text: null },
        { id: "echo", label: COLUMN_LABELS.echo, text: null },
      ],
      praise: null,
      revealedPraises: [],
      spinCount: 0,
      maxSpins: PLAN_LENGTH,
      guaranteedBy: JACKPOT_MAX_SPIN,
      isSpinning: false,
      canPull: false,
      canRestart: false,
      isJackpot: false,
      jackpotNote: null,
      animationToken: null,
      randomMode: null,
      revision,
    });
  }

  function getPublicView(state) {
    const parsed = parseState(state);
    if (!parsed) return initialPublicView(0);
    if (parsed.phase === "intro") return initialPublicView(parsed.revision);

    let visibleStop = null;
    if ((parsed.phase === "spinning" && parsed.settledCount > 0)
      || parsed.phase === "result" || parsed.phase === "jackpot") {
      visibleStop = parsed.plan.stops[parsed.settledCount - 1];
    }

    const columns = [];
    for (let columnIndex = 0; columnIndex < COLUMN_IDS.length; columnIndex += 1) {
      const columnId = COLUMN_IDS[columnIndex];
      columns[columnIndex] = {
        id: columnId,
        label: COLUMN_LABELS[columnId],
        text: visibleStop ? textForId(parsed.content, columnId, visibleStop[columnIndex]) : null,
      };
    }
    const praise = visibleStop ? phraseForStop(parsed.content, visibleStop) : null;
    const revealedPraises = [];
    for (let index = 0; index < parsed.settledCount; index += 1) {
      revealedPraises[index] = phraseForStop(parsed.content, parsed.plan.stops[index]);
    }
    const remaining = parsed.plan.jackpotSpin - parsed.settledCount;
    const canPull = (parsed.phase === "ready" || parsed.phase === "result")
      && parsed.revision <= MAX_REVISION - 2 * remaining;
    const canRestart = parsed.phase === "jackpot"
      && parsed.revision <= MAX_REVISION - (2 + 2 * JACKPOT_MAX_SPIN);

    return deepFreeze({
      phase: parsed.phase,
      recipient: parsed.content.recipient,
      sender: parsed.content.sender,
      columns,
      praise,
      revealedPraises,
      spinCount: parsed.settledCount,
      maxSpins: PLAN_LENGTH,
      guaranteedBy: JACKPOT_MAX_SPIN,
      isSpinning: parsed.phase === "spinning",
      canPull,
      canRestart,
      isJackpot: parsed.phase === "jackpot",
      jackpotNote: parsed.phase === "jackpot" ? parsed.jackpotNote : null,
      animationToken: parsed.phase === "spinning" ? parsed.spinToken : null,
      randomMode: parsed.randomMode,
      revision: parsed.revision,
    });
  }

  return deepFreeze({
    COLUMN_IDS,
    COLUMN_LABELS,
    DEFAULT_CONFIG,
    ENTROPY_LENGTH,
    FALLBACK_ENTROPY,
    ITEM_IDS,
    JACKPOT_MAX_SPIN,
    JACKPOT_MIN_SPIN,
    MAX_REVISION,
    PLAN_LENGTH,
    SIGNATURE_IDS,
    UINT32_RANGE,
    VERSION,
    buildSpinPlan,
    composePraise,
    createArmAction,
    createInitialState,
    getPublicView,
    reduce,
    sanitizeConfig,
  });
});
