export const PACK_SCHEMA_VERSION = 1;
export const MIN_CARDS = 4;
export const MAX_CARDS = 24;
export const ACTIVE_CARD_COUNT = 4;
export const MAX_FILE_BYTES = 65_536;

const ROOT_KEYS = Object.freeze(["schemaVersion", "title", "finalNote", "cards"]);
const CARD_KEYS = Object.freeze(["id", "title", "clue", "era", "target", "revealNote"]);
const TARGET_KEYS = Object.freeze(["longitude", "latitude"]);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;
const URL_PATTERN = /(?:https?:\/\/|www\.|data:|blob:)/iu;
const HTML_PATTERN = /[<>]/u;

export class PackValidationError extends Error {
  constructor(code, path, message) {
    super(path ? `${path}：${message}` : message);
    this.name = "PackValidationError";
    this.code = code;
    this.path = path;
  }
}

export function parsePackText(text, { byteLength } = {}) {
  if (typeof text !== "string") {
    throw new PackValidationError("INVALID_TEXT", "", "题包内容必须是 UTF-8 文本。");
  }
  const actualBytes = new TextEncoder().encode(text).byteLength;
  const declaredBytes = byteLength === undefined ? actualBytes : byteLength;
  if (!Number.isInteger(declaredBytes) || declaredBytes < 0) {
    throw new PackValidationError("INVALID_SIZE", "", "题包字节数不正确。");
  }
  if (declaredBytes === 0) {
    throw new PackValidationError("EMPTY_FILE", "", "题包文件不能为空。");
  }
  if (declaredBytes > MAX_FILE_BYTES) {
    throw new PackValidationError("FILE_TOO_LARGE", "", `题包不能超过 ${MAX_FILE_BYTES} bytes。`);
  }
  if (declaredBytes !== actualBytes) {
    throw new PackValidationError("SIZE_MISMATCH", "", "题包声明字节数与 UTF-8 内容字节数不一致。");
  }

  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new PackValidationError("INVALID_JSON", "", "题包不是合法 JSON。");
  }

  const pack = normalizePack(value);
  return deepFreeze({
    pack,
    activeCards: activeCardsFor(pack),
    warnings: packWarnings(pack),
  });
}

export function normalizePack(value) {
  const root = readExactRecord(value, {
    path: "题包",
    allowed: ROOT_KEYS,
    required: ["schemaVersion", "title", "cards"],
  });
  if (root.schemaVersion !== PACK_SCHEMA_VERSION) {
    throw new PackValidationError(
      "UNSUPPORTED_SCHEMA",
      "schemaVersion",
      `必须严格等于 ${PACK_SCHEMA_VERSION}。`,
    );
  }

  const cards = readDenseArray(root.cards, "cards");
  if (cards.length < MIN_CARDS) {
    throw new PackValidationError("TOO_FEW_CARDS", "cards", `至少需要 ${MIN_CARDS} 张卡片。`);
  }
  if (cards.length > MAX_CARDS) {
    throw new PackValidationError("TOO_MANY_CARDS", "cards", `最多只能有 ${MAX_CARDS} 张卡片。`);
  }

  const normalizedCards = cards.map((card, index) => normalizeCard(card, index));
  const ids = new Set();
  for (const card of normalizedCards) {
    if (ids.has(card.id)) {
      throw new PackValidationError("DUPLICATE_CARD_ID", "cards", `卡片 ID 不能重复：${card.id}。`);
    }
    ids.add(card.id);
  }

  return deepFreeze({
    schemaVersion: PACK_SCHEMA_VERSION,
    title: normalizeText(root.title, {
      path: "title",
      minimum: 1,
      maximum: 40,
    }),
    finalNote: normalizeText(root.finalNote ?? "", {
      path: "finalNote",
      minimum: 0,
      maximum: 120,
    }),
    cards: normalizedCards,
  });
}

export function activeCardsFor(value) {
  const pack = normalizePack(value);
  return deepFreeze(pack.cards.slice(0, ACTIVE_CARD_COUNT).map(cloneCard));
}

export function packWarnings(value) {
  const pack = normalizePack(value);
  const ignored = pack.cards.length - ACTIVE_CARD_COUNT;
  return deepFreeze(ignored > 0
    ? [`本局按顺序使用前四张，其余 ${ignored} 张忽略。`]
    : []);
}

function normalizeCard(value, index) {
  const path = `cards[${index}]`;
  const card = readExactRecord(value, {
    path,
    allowed: CARD_KEYS,
    required: ["id", "title", "clue", "target"],
  });
  const id = normalizeText(card.id, {
    path: `${path}.id`,
    minimum: 1,
    maximum: 48,
    allowMarkupLikeText: true,
  });
  if (!ID_PATTERN.test(id)) {
    throw new PackValidationError(
      "INVALID_CARD_ID",
      `${path}.id`,
      "id 格式必须是 1–48 位 lower-kebab 字符串。",
    );
  }

  const target = readExactRecord(card.target, {
    path: `${path}.target`,
    allowed: TARGET_KEYS,
    required: TARGET_KEYS,
  });

  return {
    id,
    title: normalizeText(card.title, {
      path: `${path}.title`,
      minimum: 1,
      maximum: 40,
    }),
    clue: normalizeText(card.clue, {
      path: `${path}.clue`,
      minimum: 1,
      maximum: 160,
    }),
    era: normalizeText(card.era ?? "", {
      path: `${path}.era`,
      minimum: 0,
      maximum: 24,
    }),
    target: {
      longitude: normalizeCoordinate(
        target.longitude,
        `${path}.target.longitude`,
        -180,
        180,
      ),
      latitude: normalizeCoordinate(
        target.latitude,
        `${path}.target.latitude`,
        -80,
        80,
      ),
    },
    revealNote: normalizeText(card.revealNote ?? "", {
      path: `${path}.revealNote`,
      minimum: 0,
      maximum: 120,
    }),
  };
}

function normalizeText(value, {
  path,
  minimum,
  maximum,
  allowMarkupLikeText = false,
}) {
  if (typeof value !== "string") {
    throw new PackValidationError("INVALID_TEXT", path, "必须是字符串。");
  }
  const normalized = value.replace(/\r\n?/gu, "\n").trim();
  const length = [...normalized].length;
  if (length < minimum) {
    throw new PackValidationError("TEXT_TOO_SHORT", path, `至少需要 ${minimum} 个字符。`);
  }
  if (length > maximum) {
    throw new PackValidationError("TEXT_TOO_LONG", path, `最多 ${maximum} 个字符。`);
  }
  if (!allowMarkupLikeText && HTML_PATTERN.test(normalized)) {
    throw new PackValidationError("HTML_NOT_ALLOWED", path, "不能包含 HTML 标记字符。");
  }
  if (!allowMarkupLikeText && URL_PATTERN.test(normalized)) {
    throw new PackValidationError("URL_NOT_ALLOWED", path, "不能包含 URL。");
  }
  return normalized;
}

function normalizeCoordinate(value, path, minimum, maximum) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new PackValidationError(
      "INVALID_COORDINATE",
      path,
      `必须是 ${minimum} 到 ${maximum} 之间的有限数字。`,
    );
  }
  const rounded = Number(value.toFixed(6));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function readExactRecord(value, { path, allowed, required }) {
  if (!isPlainObject(value)) {
    throw new PackValidationError("INVALID_OBJECT", path, "必须是普通对象。");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const symbolKeys = Object.getOwnPropertySymbols(value);
  if (symbolKeys.length > 0) {
    throw new PackValidationError("SYMBOL_NOT_ALLOWED", path, "不能包含 Symbol 字段。");
  }

  const result = Object.create(null);
  for (const key of Object.keys(descriptors)) {
    if (!allowed.includes(key)) {
      throw new PackValidationError("UNKNOWN_FIELD", path, `不支持字段 ${key}。`);
    }
    const descriptor = descriptors[key];
    if (!Object.hasOwn(descriptor, "value")) {
      throw new PackValidationError("ACCESSOR_NOT_ALLOWED", `${path}.${key}`, "字段必须是数据属性。");
    }
    result[key] = descriptor.value;
  }
  for (const key of required) {
    if (!Object.hasOwn(result, key)) {
      throw new PackValidationError("MISSING_FIELD", path, `缺少字段 ${key}。`);
    }
  }
  return result;
}

function readDenseArray(value, path) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new PackValidationError("INVALID_ARRAY", path, "必须是普通连续数组。");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const expectedKeys = new Set(["length", ...Array.from({ length: value.length }, (_, index) => String(index))]);
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || !expectedKeys.has(key)) {
      throw new PackValidationError("INVALID_ARRAY", path, "必须是普通连续数组。");
    }
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[index];
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      throw new PackValidationError("SPARSE_ARRAY", path, "必须是普通连续数组。");
    }
    result.push(descriptor.value);
  }
  return result;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneCard(card) {
  return {
    id: card.id,
    title: card.title,
    clue: card.clue,
    era: card.era,
    target: {
      longitude: card.target.longitude,
      latitude: card.target.latitude,
    },
    revealNote: card.revealNote,
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}
