(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FLOWER_LANGUAGE_BOUQUET_LOGIC = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Capture every intrinsic used to inspect caller-owned values before accepting input.
  const reflectApply = Reflect.apply;
  const reflectGetPrototypeOf = Reflect.getPrototypeOf;
  const reflectOwnKeys = Reflect.ownKeys;
  const reflectGetOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
  const arrayIsArray = Array.isArray;
  const objectFreeze = Object.freeze;
  const stringTrim = String.prototype.trim;
  const numberIsSafeInteger = Number.isSafeInteger;
  const objectPrototype = Object.prototype;
  const arrayPrototype = Array.prototype;

  const VERSION = 1;
  const FLOWER_COUNT = 6;
  const REQUIRED_SELECTIONS = 3;
  const EXPORT_FILENAME = "flower-language-bouquet.svg";
  const EXPORT_MIME_TYPE = "image/svg+xml;charset=utf-8";
  const EXPORT_WIDTH = 1000;
  const EXPORT_HEIGHT = 1800;
  const EXPORT_VIEW_BOX = "0 0 1000 1800";
  const EXPORT_TEXT_X = 80;
  const EXPORT_TEXT_START_Y = 920;
  const EXPORT_TEXT_MAX_BASELINE_Y = 1720;
  const EXPORT_WRAP_CODE_POINTS = 22;
  const EXPORT_BLOCK_GAP = 24;
  const EXPORT_TITLE_FONT_SIZE = 30;
  const EXPORT_TITLE_LINE_HEIGHT = 40;
  const EXPORT_BODY_FONT_SIZE = 22;
  const EXPORT_BODY_LINE_HEIGHT = 32;
  const MAX_EXPORT_LINES = 22;
  const MAX_REVISION = 9007199254740991;

  const ROLE_IDS = deepFreeze(["main", "companion", "accent"]);
  const ROLE_LABELS = deepFreeze(["主花", "陪花", "点缀"]);
  const FLOWER_IDS = deepFreeze([
    "rose", "tulip", "daisy", "sunflower", "lisianthus", "gypsophila",
  ]);
  const ROLE_SLOTS = deepFreeze([
    {
      role: "main", roleLabel: "主花", x: 500, y: 330, scaleMilli: 1000,
      rotationDeg: 0, stemEndX: 500, stemEndY: 850,
    },
    {
      role: "companion", roleLabel: "陪花", x: 345, y: 430, scaleMilli: 820,
      rotationDeg: -12, stemEndX: 500, stemEndY: 850,
    },
    {
      role: "accent", roleLabel: "点缀", x: 655, y: 465, scaleMilli: 720,
      rotationDeg: 14, stemEndX: 500, stemEndY: 850,
    },
  ]);

  const CONFIG_KEYS = deepFreeze(["recipient", "sender", "finalTitle", "finalNote", "flowers"]);
  const FLOWER_KEYS = deepFreeze(["id", "name", "meaning"]);
  const STATE_KEYS = deepFreeze(["version", "phase", "content", "selectedIds", "revision"]);

  const DEFAULT_CONFIG_SOURCE = deepFreeze({
    recipient: "给最特别的你",
    sender: "总想把好事都留给你的人",
    finalTitle: "这束花，替我把心意放在这里",
    finalNote: "不用等某个特别的日子，我也想把认真、明亮和长久，都一枝一枝送给你。",
    flowers: [
      { id: "rose", name: "玫瑰", meaning: "偏爱这件事，我一直很认真" },
      { id: "tulip", name: "郁金香", meaning: "和你在一起，平常也值得期待" },
      { id: "daisy", name: "雏菊", meaning: "喜欢你让我放心做自己的样子" },
      { id: "sunflower", name: "向日葵", meaning: "有你在的方向，总会更明亮" },
      { id: "lisianthus", name: "洋桔梗", meaning: "温柔不是偶然，是我想给你的日常" },
      { id: "gypsophila", name: "满天星", meaning: "小小的好，都想和你慢慢攒起来" },
    ],
  });

  const DEFAULT_CONFIG = validateContent(DEFAULT_CONFIG_SOURCE);
  if (DEFAULT_CONFIG === null) throw new Error("internal contract: invalid default bouquet config");

  const FLOWER_PERMUTATIONS = createFlowerPermutations();

  function call(intrinsic, receiver, args) {
    return reflectApply(intrinsic, receiver, args);
  }

  function deepFreeze(value) {
    if (value === null || typeof value !== "object") return value;
    const keys = reflectOwnKeys(value);
    for (let index = 0; index < keys.length; index += 1) {
      deepFreeze(value[keys[index]]);
    }
    return objectFreeze(value);
  }

  function hasExactOwnKeys(actualKeys, expectedKeys) {
    if (actualKeys.length !== expectedKeys.length) return false;
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

  function snapshotObject(value, keys) {
    if (value === null || typeof value !== "object") return null;
    let prototype;
    let ownKeys;
    try {
      prototype = reflectGetPrototypeOf(value);
      ownKeys = reflectOwnKeys(value);
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype || !hasExactOwnKeys(ownKeys, keys)) return null;

    const result = {};
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, key);
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  }

  function snapshotArray(value, minimumLength, maximumLength) {
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
    if (!nativeArray || prototype !== arrayPrototype) return null;

    let lengthDescriptor;
    try {
      lengthDescriptor = reflectGetOwnPropertyDescriptor(value, "length");
    } catch (_error) {
      return null;
    }
    if (lengthDescriptor === undefined || !("value" in lengthDescriptor)
      || lengthDescriptor.enumerable !== false || lengthDescriptor.configurable !== false
      || typeof lengthDescriptor.writable !== "boolean" || !numberIsSafeInteger(lengthDescriptor.value)
      || lengthDescriptor.value < minimumLength || lengthDescriptor.value > maximumLength) return null;

    const length = lengthDescriptor.value;
    if (ownKeys.length !== length + 1) return null;
    for (let keyIndex = 0; keyIndex < ownKeys.length; keyIndex += 1) {
      const key = ownKeys[keyIndex];
      if (typeof key !== "string") return null;
      if (key === "length") continue;
      let matched = false;
      for (let index = 0; index < length; index += 1) {
        if (key === String(index)) {
          matched = true;
          break;
        }
      }
      if (!matched) return null;
    }

    const result = [];
    for (let index = 0; index < length; index += 1) {
      let descriptor;
      try {
        descriptor = reflectGetOwnPropertyDescriptor(value, String(index));
      } catch (_error) {
        return null;
      }
      if (descriptor === undefined || !("value" in descriptor)) return null;
      result[index] = descriptor.value;
    }
    return result;
  }

  function hasLoneSurrogate(raw) {
    for (let index = 0; index < raw.length; index += 1) {
      const unit = raw.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        if (index + 1 >= raw.length) return true;
        const next = raw.charCodeAt(index + 1);
        if (next < 0xdc00 || next > 0xdfff) return true;
        index += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return true;
      }
    }
    return false;
  }

  function hasForbiddenControl(raw, allowLf) {
    for (let index = 0; index < raw.length; index += 1) {
      const unit = raw.charCodeAt(index);
      if ((unit <= 0x1f && !(allowLf && unit === 0x0a))
        || (unit >= 0x7f && unit <= 0x9f) || unit === 0x2028 || unit === 0x2029) return true;
    }
    return false;
  }

  function countCodePoints(raw) {
    let count = 0;
    for (let index = 0; index < raw.length; index += 1) {
      const unit = raw.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) index += 1;
      count += 1;
    }
    return count;
  }

  function trimText(raw) {
    return call(stringTrim, raw, []);
  }

  function cleanSingleLine(raw, minimum, maximum) {
    if (typeof raw !== "string" || hasLoneSurrogate(raw) || hasForbiddenControl(raw, false)) return null;
    const value = trimText(raw);
    const length = countCodePoints(value);
    return length >= minimum && length <= maximum ? value : null;
  }

  function splitLines(raw) {
    const lines = [];
    let start = 0;
    for (let index = 0; index <= raw.length; index += 1) {
      if (index === raw.length || raw.charCodeAt(index) === 0x0a) {
        lines[lines.length] = raw.slice(start, index);
        start = index + 1;
      }
    }
    return lines;
  }

  function cleanFinalNote(raw) {
    if (typeof raw !== "string" || hasLoneSurrogate(raw) || hasForbiddenControl(raw, true)) return null;
    const outerTrimmed = trimText(raw);
    const rawLines = splitLines(outerTrimmed);
    if (rawLines.length < 1 || rawLines.length > 3) return null;
    let value = "";
    for (let index = 0; index < rawLines.length; index += 1) {
      const line = trimText(rawLines[index]);
      if (countCodePoints(line) === 0) return null;
      value += (index === 0 ? "" : "\n") + line;
    }
    const length = countCodePoints(value);
    return length >= 1 && length <= 160 ? value : null;
  }

  function validateContent(candidate) {
    const outer = snapshotObject(candidate, CONFIG_KEYS);
    if (outer === null) return null;
    const recipient = cleanSingleLine(outer.recipient, 1, 12);
    const sender = cleanSingleLine(outer.sender, 1, 12);
    const finalTitle = cleanSingleLine(outer.finalTitle, 2, 40);
    const finalNote = cleanFinalNote(outer.finalNote);
    const flowersInput = snapshotArray(outer.flowers, FLOWER_COUNT, FLOWER_COUNT);
    if (recipient === null || sender === null || recipient === sender
      || finalTitle === null || finalNote === null || flowersInput === null) return null;

    const flowers = [];
    for (let index = 0; index < FLOWER_COUNT; index += 1) {
      const flowerInput = snapshotObject(flowersInput[index], FLOWER_KEYS);
      if (flowerInput === null || typeof flowerInput.id !== "string"
        || flowerInput.id !== FLOWER_IDS[index]) return null;
      const name = cleanSingleLine(flowerInput.name, 1, 8);
      const meaning = cleanSingleLine(flowerInput.meaning, 2, 32);
      if (name === null || meaning === null) return null;
      for (let previous = 0; previous < flowers.length; previous += 1) {
        if (flowers[previous].name === name) return null;
      }
      flowers[index] = { id: flowerInput.id, name, meaning };
    }
    return deepFreeze({ recipient, sender, finalTitle, finalNote, flowers });
  }

  function sanitizeConfig(candidate) {
    const valid = validateContent(candidate);
    return valid === null ? DEFAULT_CONFIG : valid;
  }

  function createStartAction(rawConfig) {
    const sanitized = sanitizeConfig(rawConfig);
    const content = validateContent(sanitized);
    return content === null ? null : deepFreeze({ type: "START", content });
  }

  function createFlowerPermutations() {
    const permutations = [];
    for (let a = 0; a < FLOWER_IDS.length; a += 1) {
      for (let b = 0; b < FLOWER_IDS.length; b += 1) {
        for (let c = 0; c < FLOWER_IDS.length; c += 1) {
          if (a !== b && a !== c && b !== c) {
            permutations[permutations.length] = [FLOWER_IDS[a], FLOWER_IDS[b], FLOWER_IDS[c]];
          }
        }
      }
    }
    return deepFreeze(permutations);
  }

  function snapshotSelectedIds(candidate, minimum, maximum) {
    const ids = snapshotArray(candidate, minimum, maximum);
    if (ids === null) return null;
    for (let index = 0; index < ids.length; index += 1) {
      if (typeof ids[index] !== "string" || flowerIndex(ids[index]) < 0) return null;
      for (let previous = 0; previous < index; previous += 1) {
        if (ids[previous] === ids[index]) return null;
      }
    }
    return ids;
  }

  function flowerIndex(id) {
    for (let index = 0; index < FLOWER_IDS.length; index += 1) {
      if (FLOWER_IDS[index] === id) return index;
    }
    return -1;
  }

  function flowerForId(content, id) {
    const index = flowerIndex(id);
    return index < 0 ? null : content.flowers[index];
  }

  function composeBouquetMeaning(contentCandidate, selectedIdsCandidate) {
    const content = validateContent(contentCandidate);
    const selectedIds = snapshotSelectedIds(selectedIdsCandidate, 3, 3);
    if (content === null || selectedIds === null) return null;
    const first = flowerForId(content, selectedIds[0]);
    const second = flowerForId(content, selectedIds[1]);
    const third = flowerForId(content, selectedIds[2]);
    return `这束花先用「${first.name}」说“${first.meaning}”，\n`
      + `再让「${second.name}」接住“${second.meaning}”，\n`
      + `最后由「${third.name}」把“${third.meaning}”留给以后。`;
  }

  function buildBouquetScene(selectedIdsCandidate) {
    const selectedIds = snapshotSelectedIds(selectedIdsCandidate, 0, 3);
    if (selectedIds === null) return null;
    const stems = [];
    for (let index = 0; index < selectedIds.length; index += 1) {
      const slot = ROLE_SLOTS[index];
      stems[index] = {
        ordinal: index,
        role: slot.role,
        flowerId: selectedIds[index],
        shapeKey: selectedIds[index],
        x: slot.x,
        y: slot.y,
        scaleMilli: slot.scaleMilli,
        rotationDeg: slot.rotationDeg,
        stemEndX: slot.stemEndX,
        stemEndY: slot.stemEndY,
      };
    }
    return deepFreeze({
      version: VERSION,
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      tieX: 500,
      tieY: 850,
      stems,
    });
  }

  function codePointSlices(raw, maximum) {
    const result = [];
    let start = 0;
    let count = 0;
    for (let index = 0; index < raw.length; index += 1) {
      const unit = raw.charCodeAt(index);
      if (unit >= 0xd800 && unit <= 0xdbff) index += 1;
      count += 1;
      if (count === maximum) {
        result[result.length] = raw.slice(start, index + 1);
        start = index + 1;
        count = 0;
      }
    }
    if (start < raw.length) result[result.length] = raw.slice(start);
    return result;
  }

  function wrapSvgText(raw) {
    if (typeof raw !== "string" || raw.length === 0 || hasLoneSurrogate(raw)
      || hasForbiddenControl(raw, true) || countCodePoints(raw) > 192) return null;
    const logicalLines = splitLines(raw);
    if (logicalLines.length < 1 || logicalLines.length > 3) return null;
    const wrapped = [];
    for (let index = 0; index < logicalLines.length; index += 1) {
      if (logicalLines[index].length === 0) return null;
      const slices = codePointSlices(logicalLines[index], EXPORT_WRAP_CODE_POINTS);
      for (let sliceIndex = 0; sliceIndex < slices.length; sliceIndex += 1) {
        wrapped[wrapped.length] = slices[sliceIndex];
      }
    }
    return deepFreeze(wrapped);
  }

  function buildExportTextLayout(contentCandidate, selectedIdsCandidate) {
    const content = validateContent(contentCandidate);
    const selectedIds = snapshotSelectedIds(selectedIdsCandidate, 3, 3);
    if (content === null || selectedIds === null) return null;
    const composition = composeBouquetMeaning(content, selectedIds);
    const title = wrapSvgText(content.finalTitle);
    const compositionLines = wrapSvgText(composition);
    const note = wrapSvgText(content.finalNote);
    const sender = wrapSvgText(`—— ${content.sender}`);
    if (title === null || compositionLines === null || note === null || sender === null
      || title.length > 2 || compositionLines.length > 9 || note.length > 10 || sender.length > 1) return null;

    const blocks = [
      { name: "title", lines: title, fontSize: EXPORT_TITLE_FONT_SIZE, lineHeight: EXPORT_TITLE_LINE_HEIGHT },
      { name: "composition", lines: compositionLines, fontSize: EXPORT_BODY_FONT_SIZE, lineHeight: EXPORT_BODY_LINE_HEIGHT },
      { name: "note", lines: note, fontSize: EXPORT_BODY_FONT_SIZE, lineHeight: EXPORT_BODY_LINE_HEIGHT },
      { name: "sender", lines: sender, fontSize: EXPORT_BODY_FONT_SIZE, lineHeight: EXPORT_BODY_LINE_HEIGHT },
    ];
    const textLines = [];
    let y = EXPORT_TEXT_START_Y;
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const block = blocks[blockIndex];
      for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex += 1) {
        textLines[textLines.length] = {
          block: block.name,
          lineIndex,
          text: block.lines[lineIndex],
          x: EXPORT_TEXT_X,
          y,
          fontSize: block.fontSize,
        };
        y += block.lineHeight;
      }
      y += EXPORT_BLOCK_GAP;
    }
    if (textLines.length > MAX_EXPORT_LINES
      || textLines[textLines.length - 1].y > EXPORT_TEXT_MAX_BASELINE_Y) return null;
    return deepFreeze(textLines);
  }

  function createInitialState() {
    return deepFreeze({
      version: VERSION,
      phase: "intro",
      content: null,
      selectedIds: [],
      revision: 0,
    });
  }

  function maximumRevisionFor(phase, count) {
    if (phase === "intro" && count === 0) return MAX_REVISION - 5;
    if (phase === "arranging" && count >= 0 && count <= 2) return MAX_REVISION - 4 + count;
    if (phase === "preview" && count === 3) return MAX_REVISION - 1;
    if (phase === "complete" && count === 3) return MAX_REVISION;
    return -1;
  }

  function snapshotState(candidate) {
    const raw = snapshotObject(candidate, STATE_KEYS);
    if (raw === null || typeof raw.version !== "number" || raw.version !== VERSION
      || typeof raw.phase !== "string" || !numberIsSafeInteger(raw.revision) || raw.revision < 0) return null;
    const selectedIds = snapshotSelectedIds(raw.selectedIds, 0, 3);
    if (selectedIds === null) return null;
    const maximumRevision = maximumRevisionFor(raw.phase, selectedIds.length);
    if (maximumRevision < 0 || raw.revision > maximumRevision) return null;

    let content = null;
    if (raw.phase === "intro") {
      if (raw.content !== null || selectedIds.length !== 0) return null;
    } else {
      content = validateContent(raw.content);
      if (content === null) return null;
      if (raw.phase === "arranging" && selectedIds.length > 2) return null;
      if ((raw.phase === "preview" || raw.phase === "complete") && selectedIds.length !== 3) return null;
    }
    return deepFreeze({
      version: VERSION,
      phase: raw.phase,
      content,
      selectedIds,
      revision: raw.revision,
    });
  }

  function snapshotAction(candidate) {
    if (candidate === null || typeof candidate !== "object") return null;
    let prototype;
    let ownKeys;
    try {
      prototype = reflectGetPrototypeOf(candidate);
      ownKeys = reflectOwnKeys(candidate);
    } catch (_error) {
      return null;
    }
    if (prototype !== objectPrototype) return null;
    let typeDescriptor;
    try {
      typeDescriptor = reflectGetOwnPropertyDescriptor(candidate, "type");
    } catch (_error) {
      return null;
    }
    if (typeDescriptor === undefined || !("value" in typeDescriptor)
      || typeof typeDescriptor.value !== "string") return null;
    const type = typeDescriptor.value;

    if (type === "START") {
      if (!hasExactOwnKeys(ownKeys, ["type", "content"])) return null;
      let contentDescriptor;
      try {
        contentDescriptor = reflectGetOwnPropertyDescriptor(candidate, "content");
      } catch (_error) {
        return null;
      }
      if (contentDescriptor === undefined || !("value" in contentDescriptor)) return null;
      const content = validateContent(contentDescriptor.value);
      return content === null ? null : deepFreeze({ type, content });
    }
    if (type === "ADD_FLOWER") {
      if (!hasExactOwnKeys(ownKeys, ["type", "flowerId"])) return null;
      let idDescriptor;
      try {
        idDescriptor = reflectGetOwnPropertyDescriptor(candidate, "flowerId");
      } catch (_error) {
        return null;
      }
      if (idDescriptor === undefined || !("value" in idDescriptor)
        || typeof idDescriptor.value !== "string" || flowerIndex(idDescriptor.value) < 0) return null;
      return deepFreeze({ type, flowerId: idDescriptor.value });
    }
    if (type === "UNDO_LAST" || type === "TIE_BOUQUET" || type === "RESTART") {
      return hasExactOwnKeys(ownKeys, ["type"]) ? deepFreeze({ type }) : null;
    }
    return null;
  }

  function canUndoState(state) {
    const count = state.selectedIds.length;
    if (state.phase === "arranging" && count === 1) return state.revision <= MAX_REVISION - 5;
    if (state.phase === "arranging" && count === 2) return state.revision <= MAX_REVISION - 4;
    return state.phase === "preview" && count === 3 && state.revision <= MAX_REVISION - 3;
  }

  function reduce(stateCandidate, actionCandidate) {
    const state = snapshotState(stateCandidate);
    if (state === null) return createInitialState();
    const action = snapshotAction(actionCandidate);
    if (action === null) return stateCandidate;

    if (action.type === "START") {
      if (state.phase !== "intro" || state.revision > MAX_REVISION - 5) return stateCandidate;
      return makeState("arranging", action.content, [], state.revision + 1);
    }
    if (action.type === "ADD_FLOWER") {
      if (state.phase !== "arranging" || flowerIndex(action.flowerId) < 0) return stateCandidate;
      for (let index = 0; index < state.selectedIds.length; index += 1) {
        if (state.selectedIds[index] === action.flowerId) return stateCandidate;
      }
      const selectedIds = copyArray(state.selectedIds);
      selectedIds[selectedIds.length] = action.flowerId;
      return makeState(selectedIds.length === 3 ? "preview" : "arranging", state.content,
        selectedIds, state.revision + 1);
    }
    if (action.type === "UNDO_LAST") {
      if (!canUndoState(state)) return stateCandidate;
      const selectedIds = [];
      for (let index = 0; index < state.selectedIds.length - 1; index += 1) {
        selectedIds[index] = state.selectedIds[index];
      }
      return makeState("arranging", state.content, selectedIds, state.revision + 1);
    }
    if (action.type === "TIE_BOUQUET") {
      if (state.phase !== "preview") return stateCandidate;
      return makeState("complete", state.content, state.selectedIds, state.revision + 1);
    }
    if (action.type === "RESTART") {
      if (state.phase !== "complete" || state.revision > MAX_REVISION - 6) return stateCandidate;
      return makeState("intro", null, [], state.revision + 1);
    }
    return stateCandidate;
  }

  function copyArray(values) {
    const copy = [];
    for (let index = 0; index < values.length; index += 1) copy[index] = values[index];
    return copy;
  }

  function makeState(phase, content, selectedIds, revision) {
    const contentCopy = content === null ? null : validateContent(content);
    return deepFreeze({
      version: VERSION,
      phase,
      content: contentCopy,
      selectedIds: copyArray(selectedIds),
      revision,
    });
  }

  function buildCatalog(content, selectedIds, allowAdd) {
    const catalog = [];
    for (let index = 0; index < content.flowers.length; index += 1) {
      const flower = content.flowers[index];
      let isSelected = false;
      for (let selectedIndex = 0; selectedIndex < selectedIds.length; selectedIndex += 1) {
        if (selectedIds[selectedIndex] === flower.id) isSelected = true;
      }
      catalog[index] = {
        id: flower.id,
        name: flower.name,
        meaning: flower.meaning,
        isSelected,
        canAdd: allowAdd && !isSelected,
      };
    }
    return catalog;
  }

  function buildSelected(content, selectedIds) {
    const selected = [];
    for (let index = 0; index < selectedIds.length; index += 1) {
      const flower = flowerForId(content, selectedIds[index]);
      selected[index] = {
        ordinal: index,
        role: ROLE_IDS[index],
        roleLabel: ROLE_LABELS[index],
        id: flower.id,
        name: flower.name,
        meaning: flower.meaning,
      };
    }
    return selected;
  }

  function getPublicView(stateCandidate) {
    const state = snapshotState(stateCandidate) || createInitialState();
    const hasContent = state.content !== null;
    const isArranging = state.phase === "arranging";
    const isPreview = state.phase === "preview";
    const isComplete = state.phase === "complete";
    const showCatalog = isArranging || isPreview;
    const selected = hasContent ? buildSelected(state.content, state.selectedIds) : [];
    const composition = (isPreview || isComplete)
      ? composeBouquetMeaning(state.content, state.selectedIds) : null;
    const scene = hasContent ? buildBouquetScene(state.selectedIds) : null;
    return deepFreeze({
      phase: state.phase,
      selectedCount: state.selectedIds.length,
      requiredCount: REQUIRED_SELECTIONS,
      catalog: showCatalog ? buildCatalog(state.content, state.selectedIds, isArranging) : [],
      selected,
      composition,
      scene,
      canStart: state.phase === "intro" && state.revision <= MAX_REVISION - 5,
      canAdd: isArranging,
      canUndo: canUndoState(state),
      canTie: isPreview,
      canRestart: isComplete && state.revision <= MAX_REVISION - 6,
      canPrepareExport: isComplete,
      recipient: isComplete ? state.content.recipient : null,
      sender: isComplete ? state.content.sender : null,
      finalTitle: isComplete ? state.content.finalTitle : null,
      finalNote: isComplete ? state.content.finalNote : null,
      revision: state.revision,
    });
  }

  function buildExportModel(stateCandidate) {
    const state = snapshotState(stateCandidate);
    if (state === null || state.phase !== "complete") return null;
    const selected = buildSelected(state.content, state.selectedIds);
    const textLines = buildExportTextLayout(state.content, state.selectedIds);
    const scene = buildBouquetScene(state.selectedIds);
    if (textLines === null || scene === null) return null;
    const documentDescription = `一束由「${selected[0].name}」、「${selected[1].name}」和「${selected[2].name}」组成的花。`;
    return deepFreeze({
      version: VERSION,
      filename: EXPORT_FILENAME,
      mimeType: EXPORT_MIME_TYPE,
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      viewBox: EXPORT_VIEW_BOX,
      documentTitle: state.content.finalTitle,
      documentDescription,
      scene,
      textLines,
    });
  }

  const api = {
    VERSION,
    FLOWER_COUNT,
    REQUIRED_SELECTIONS,
    ROLE_IDS,
    ROLE_LABELS,
    FLOWER_IDS,
    ROLE_SLOTS,
    EXPORT_FILENAME,
    EXPORT_MIME_TYPE,
    EXPORT_WIDTH,
    EXPORT_HEIGHT,
    EXPORT_VIEW_BOX,
    EXPORT_TEXT_X,
    EXPORT_TEXT_START_Y,
    EXPORT_TEXT_MAX_BASELINE_Y,
    EXPORT_WRAP_CODE_POINTS,
    EXPORT_BLOCK_GAP,
    EXPORT_TITLE_FONT_SIZE,
    EXPORT_TITLE_LINE_HEIGHT,
    EXPORT_BODY_FONT_SIZE,
    EXPORT_BODY_LINE_HEIGHT,
    MAX_EXPORT_LINES,
    MAX_REVISION,
    DEFAULT_CONFIG,
    FLOWER_PERMUTATIONS,
    sanitizeConfig,
    createStartAction,
    createFlowerPermutations,
    composeBouquetMeaning,
    buildBouquetScene,
    wrapSvgText,
    buildExportTextLayout,
    createInitialState,
    reduce,
    getPublicView,
    buildExportModel,
  };
  return deepFreeze(api);
});
