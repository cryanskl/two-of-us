import { createHash } from "node:crypto";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const LOWER_KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORY_DIRECTORY = Object.freeze({
  surprise: "surprises",
  "co-op": "co-op",
  versus: "versus",
});
const DATA_ICON_SHA256 = new Set([
  "b2852b9e9fdae62ad0eaa5db210ab48eb69977bd16ca8f425d18dd04b2bd2756",
  "9657a78561dce8c0417ab8cb43245a130014b3e98a8131a75ee008ec7d131017",
  "bcc0c76df661ab442a2bf23d8ed33c4b942173db3bde414d69ceef31d2625332",
  "d1161e065c88729cc06549280031ad0899412f2383454286143633a71a0d4495",
  "ad125a9e9e46b6c667b6267ddf885a54228776035e34374570e78e32f4074187",
]);

const DENIED_TAGS = new Set(["base", "iframe", "frame", "embed"]);
const STATIC_URL_ATTRIBUTES = Object.freeze({
  script: ["src"],
  img: ["src"],
  audio: ["src"],
  video: ["src", "poster"],
  source: ["src"],
  track: ["src"],
  object: ["data"],
});
const SVG_URL_ATTRIBUTES = Object.freeze({
  image: ["href", "xlink:href"],
  use: ["href", "xlink:href"],
  feimage: ["href", "xlink:href"],
});
const ASCII_SPACE_PATTERN = /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
const ENCODED_FORBIDDEN_PATTERN = /%(?:0[0-9a-f]|1[0-9a-f]|2f|5c|7f)/i;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export function renderMacLauncher(experienceId) {
  assertExperienceId(experienceId);
  return `#!/bin/bash

set -u
cd "$(dirname "$0")/../../.." || exit 1

node scripts/start.mjs --experience ${experienceId}
status=$?

if [ "$status" -ne 0 ]; then
  echo
  read -r -p "启动失败。按回车键关闭窗口……"
fi

exit "$status"
`;
}

export function renderWindowsLauncher(experienceId) {
  assertExperienceId(experienceId);
  return `@echo off
setlocal
cd /d "%~dp0\\..\\..\\.."

node scripts\\start.mjs --experience ${experienceId}
if errorlevel 1 (
  echo.
  echo 启动失败，请查看上方提示。
  pause
  exit /b 1
)
`;
}

export async function validateExperienceContracts({ rootDir, catalog } = {}) {
  const rootPath = toRootPath(rootDir);
  assertValidatedCatalog(catalog);

  let realRoot;
  try {
    realRoot = await realpath(rootPath);
    const rootStat = await stat(realRoot);
    if (!rootStat.isDirectory()) throw new Error("not a directory");
  } catch {
    return Object.freeze(["仓库根目录不存在、不可读取或不是目录。"]);
  }

  const errors = new Set();
  const context = { rootPath, realRoot, errors };
  for (const experience of catalog.experiences) {
    if (experience.installed !== true) continue;
    await validateInstalledExperience(context, experience);
  }
  return Object.freeze([...errors].sort());
}

function assertExperienceId(experienceId) {
  if (typeof experienceId !== "string" || !LOWER_KEBAB_PATTERN.test(experienceId)) {
    throw new TypeError("experienceId 必须是 lower-kebab 字符串。");
  }
}

function assertValidatedCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || !Array.isArray(catalog.experiences)) {
    throw new TypeError("catalog 必须先通过共享 validateCatalog 校验。");
  }
}

function toRootPath(value) {
  if (value instanceof URL) {
    if (value.protocol !== "file:") throw new TypeError("rootDir URL 必须使用 file: 协议。");
    return fileURLToPath(value);
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("rootDir 必须是路径字符串或 file URL。");
  }
  return path.resolve(value);
}

async function validateInstalledExperience(context, experience) {
  const { errors } = context;
  const id = experience.id;
  if (experience.networkRequired !== false) {
    errors.add(`${id} 的 installed 作品必须声明 networkRequired 为 false。`);
  }

  const entry = await loadCatalogFile(context, id, experience.entry, "入口");
  const readme = await loadCatalogFile(context, id, experience.readme, "README");
  if (readme && !/^## 借鉴与来源声明[\t ]*$/mu.test(readme.content)) {
    errors.add(`${id} 的 ${safeRepositoryLabel(experience.readme)} 缺少独立标题“## 借鉴与来源声明”。`);
  }
  if (!entry) return;

  if (experience.level === "A") {
    await validateHtmlEntry(context, experience, entry);
    return;
  }
  await validateLaunchers(context, experience, entry);
}

async function loadCatalogFile(context, id, repositoryPath, role) {
  const label = safeRepositoryLabel(repositoryPath);
  const lexicalPath = path.resolve(context.rootPath, repositoryPath);
  if (!isContained(context.rootPath, lexicalPath)) {
    context.errors.add(`${id} 的${role}越出仓库：${label}。`);
    return null;
  }

  let lexicalStat;
  try {
    lexicalStat = await lstat(lexicalPath);
  } catch {
    context.errors.add(`${id} 的${role}不存在或不可读取：${label}。`);
    return null;
  }
  if (lexicalStat.isSymbolicLink()) {
    context.errors.add(`${id} 的${role}不得是符号链接：${label}。`);
    return null;
  }
  if (!lexicalStat.isFile()) {
    context.errors.add(`${id} 的${role}必须是普通文件：${label}。`);
    return null;
  }

  let realPath;
  try {
    realPath = await realpath(lexicalPath);
  } catch {
    context.errors.add(`${id} 的${role}不存在或不可读取：${label}。`);
    return null;
  }
  if (!isContained(context.realRoot, realPath)) {
    context.errors.add(`${id} 的${role}真实路径越出仓库：${label}。`);
    return null;
  }

  try {
    const content = await readFile(realPath, "utf8");
    return { content, lexicalPath, realPath, stat: lexicalStat, label };
  } catch {
    context.errors.add(`${id} 的${role}不存在或不可读取：${label}。`);
    return null;
  }
}

async function validateLaunchers(context, experience, entry) {
  const directory = path.dirname(entry.lexicalPath);
  const relativeDirectory = path.dirname(experience.entry);
  const launchers = [
    { name: "start.command", expected: renderMacLauncher(experience.id), executable: true },
    { name: "start.bat", expected: renderWindowsLauncher(experience.id), executable: false },
  ];

  for (const launcher of launchers) {
    const repositoryPath = path.posix.join(relativeDirectory.replaceAll(path.sep, "/"), launcher.name);
    const file = await loadCatalogFile(context, experience.id, repositoryPath, launcher.name);
    if (!file) continue;
    if (file.content !== launcher.expected) {
      context.errors.add(`${experience.id} 的 ${repositoryPath} 内容与统一启动器模板不一致。`);
    }
    if (launcher.executable && process.platform !== "win32" && (file.stat.mode & 0o777) !== 0o755) {
      context.errors.add(`${experience.id} 的 ${repositoryPath} 权限必须精确为 0755。`);
    }
  }

  void directory;
}

async function validateHtmlEntry(context, experience, entry) {
  const state = {
    ...context,
    experience,
    visitedStylesheets: new Set(),
  };
  await scanHtmlDocument(state, entry.content, entry.realPath, entry.label);
}

async function scanHtmlDocument(state, html, sourceRealPath, sourceLabel) {
  let cursor = 0;
  while (cursor < html.length) {
    const opening = html.indexOf("<", cursor);
    if (opening === -1) break;
    if (html.startsWith("<!--", opening)) {
      const closing = findHtmlCommentClosing(html, opening);
      if (!closing) {
        addHtmlError(state, sourceLabel, "HTML 注释未按 canonical --> 闭合");
        cursor = opening + 4;
      } else {
        if (closing.malformed) {
          addHtmlError(state, sourceLabel, "HTML 注释未按 canonical --> 闭合");
        }
        cursor = closing.end;
      }
      continue;
    }
    if (/^<\s*[!?/]/u.test(html.slice(opening, opening + 4))) {
      const closing = findHtmlTagEnd(html, opening + 1);
      cursor = closing === null ? html.length : closing.end + 1;
      continue;
    }

    const nameMatch = /^<\s*([a-z][a-z0-9:-]*)/iu.exec(html.slice(opening));
    if (!nameMatch) {
      cursor = opening + 1;
      continue;
    }
    const tagName = nameMatch[1].toLowerCase();
    const closing = findHtmlTagEnd(html, opening + 1);
    if (closing === null) {
      if (isProfileTag(tagName)) addHtmlError(state, sourceLabel, `资源标签 <${tagName}> 未闭合`);
      break;
    }
    if (closing.malformed) addHtmlError(state, sourceLabel, "标签语法含非法引号或 < 字符");

    const rawTag = html.slice(opening + 1, closing.end);
    const attributes = parseHtmlAttributes(rawTag, nameMatch[1].length + rawTag.indexOf(nameMatch[1]));
    await inspectHtmlTag(state, tagName, attributes, sourceRealPath, sourceLabel);

    cursor = closing.end + 1;
    if (tagName === "style" || tagName === "script") {
      const closing = findRawTextClosingTag(html, cursor, tagName);
      if (!closing) {
        if (tagName === "style") await scanCssText(state, html.slice(cursor), sourceRealPath, sourceLabel);
        addHtmlError(state, sourceLabel, `<${tagName}> 正文未按 canonical 结束标签闭合`);
        break;
      }
      if (closing.malformed) {
        addHtmlError(state, sourceLabel, `<${tagName}> 使用了非 canonical 结束标签`);
      }
      if (tagName === "style") {
        await scanCssText(state, html.slice(cursor, closing.start), sourceRealPath, sourceLabel);
      }
      cursor = closing.end;
    }
  }
}

async function inspectHtmlTag(state, tagName, attributes, sourceRealPath, sourceLabel) {
  if (DENIED_TAGS.has(tagName)) {
    addHtmlError(state, sourceLabel, `禁止使用 <${tagName}> 标签`);
  }

  if (tagName === "script") {
    const type = exactControlAttribute(state, sourceLabel, tagName, attributes, "type");
    if (type.valid && asciiTrim(type.value).toLowerCase() === "module") {
      addHtmlError(state, sourceLabel, "禁止使用 module script");
    }
  }

  if ((tagName === "img" || tagName === "source") && attributes.has("srcset")) {
    addHtmlError(state, sourceLabel, `<${tagName}> 禁止使用 srcset`);
  }
  const httpEquiv = tagName === "meta"
    ? exactControlAttribute(state, sourceLabel, tagName, attributes, "http-equiv") : null;
  if (httpEquiv?.valid && asciiTrim(httpEquiv.value).toLowerCase() === "refresh") {
    addHtmlError(state, sourceLabel, "禁止使用 meta refresh");
  }
  if (tagName === "form" && attributes.has("action")) addHtmlError(state, sourceLabel, "禁止使用 form[action]");
  if (tagName === "button" && attributes.has("formaction")) addHtmlError(state, sourceLabel, "禁止使用 button[formaction]");
  if (tagName === "input" && attributes.has("formaction")) addHtmlError(state, sourceLabel, "禁止使用 input[formaction]");
  const inputType = tagName === "input"
    ? exactControlAttribute(state, sourceLabel, tagName, attributes, "type") : null;
  if (inputType?.valid && asciiTrim(inputType.value).toLowerCase() === "image" && attributes.has("src")) {
    addHtmlError(state, sourceLabel, "禁止使用 input[type=image][src]");
  }
  if ((tagName === "a" || tagName === "area") && attributes.has("ping")) {
    addHtmlError(state, sourceLabel, `禁止使用 ${tagName}[ping]`);
  }
  for (const attributeName of SVG_URL_ATTRIBUTES[tagName] ?? []) {
    if (attributes.has(attributeName)) {
      addHtmlError(state, sourceLabel, `禁止使用 <${tagName}> 的 ${attributeName} 资源引用`);
    }
  }

  const styleAttribute = exactQuotedAttribute(state, sourceLabel, tagName, attributes, "style");
  if (styleAttribute.valid) {
    await scanCssText(state, styleAttribute.value, sourceRealPath, sourceLabel);
  }

  if (tagName === "link" && attributes.has("href")) {
    await inspectLinkTag(state, attributes, sourceRealPath, sourceLabel);
    return;
  }
  for (const attributeName of STATIC_URL_ATTRIBUTES[tagName] ?? []) {
    const reference = exactQuotedAttribute(state, sourceLabel, tagName, attributes, attributeName);
    if (reference.valid && reference.value !== "") {
      await inspectReference(state, reference.value, sourceRealPath, sourceLabel, "resource");
    }
  }
}

async function inspectLinkTag(state, attributes, sourceRealPath, sourceLabel) {
  const href = exactQuotedAttribute(state, sourceLabel, "link", attributes, "href");
  const rel = exactControlAttribute(state, sourceLabel, "link", attributes, "rel");
  if (!href.valid) return;
  if (!rel.present) {
    addHtmlError(state, sourceLabel, "带 href 的 <link> 必须有唯一且可归类的 rel");
    return;
  }
  if (!rel.valid) return;
  const tokens = asciiTrim(rel.value).split(/[\t\n\f\r ]+/u).filter(Boolean)
    .map((token) => token.toLowerCase());
  if (tokens.length === 0 || tokens.some((token) => token !== "stylesheet" && token !== "icon")) {
    addHtmlError(state, sourceLabel, "带 href 的 <link> 只允许 stylesheet 或 icon rel token");
    return;
  }
  if (href.value === "") return;

  const isStylesheet = tokens.includes("stylesheet");
  const isIconOnly = tokens.every((token) => token === "icon");
  if (isStylesheet) {
    await inspectReference(state, href.value, sourceRealPath, sourceLabel, "stylesheet");
  } else if (isIconOnly) {
    await inspectReference(state, href.value, sourceRealPath, sourceLabel, "icon");
  }
}

function exactQuotedAttribute(state, sourceLabel, tagName, attributes, attributeName) {
  const values = attributes.get(attributeName) ?? [];
  if (values.length === 0) return { present: false, valid: false, value: null };
  if (values.length !== 1) {
    addHtmlError(state, sourceLabel, `<${tagName}> 的 ${attributeName} 属性必须恰好出现一次`);
    return { present: true, valid: false, value: null };
  }
  const [attribute] = values;
  if (!attribute.hasEquals || !attribute.quoted || attribute.value === null) {
    addHtmlError(state, sourceLabel, `<${tagName}> 的 ${attributeName} 属性必须使用单引号或双引号`);
    return { present: true, valid: false, value: null };
  }
  return { present: true, valid: true, value: attribute.value };
}

function exactControlAttribute(state, sourceLabel, tagName, attributes, attributeName) {
  const result = exactQuotedAttribute(state, sourceLabel, tagName, attributes, attributeName);
  if (!result.present || !result.valid) return result;
  if (result.value.includes("&") || CONTROL_PATTERN.test(result.value)) {
    addHtmlError(state, sourceLabel, `<${tagName}> 的 ${attributeName} 控制属性禁止 entity 或控制字符`);
    return { present: true, valid: false, value: null };
  }
  return result;
}

async function inspectReference(state, rawReference, sourceRealPath, sourceLabel, kind) {
  const reference = rawReference;
  const display = redactResourceReference(reference);
  if (reference === "") return null;
  if (reference !== asciiTrim(reference)) {
    addReferenceError(state, sourceLabel, "资源引用含首尾空白", display);
    return null;
  }
  if (reference.includes("&")) {
    addReferenceError(state, sourceLabel, "资源引用禁止使用 HTML entity", display);
    return null;
  }
  if (reference.includes("\\") || CONTROL_PATTERN.test(reference)) {
    addReferenceError(state, sourceLabel, "资源引用含反斜杠、NUL 或控制字符", display);
    return null;
  }
  if (ENCODED_FORBIDDEN_PATTERN.test(reference)) {
    addReferenceError(state, sourceLabel, "资源引用含编码后的分隔符、NUL 或控制字符", display);
    return null;
  }
  if (reference.startsWith("#")) return null;

  if (/^data:/iu.test(reference)) {
    if (kind === "icon" && isAllowedDataIcon(reference)) return null;
    addReferenceError(state, sourceLabel, "不允许此 data URL", "<data-url>");
    return null;
  }
  if (/^blob:/iu.test(reference)) {
    addReferenceError(state, sourceLabel, "不允许 blob URL", "<blob-url>");
    return null;
  }
  if (reference.startsWith("/") || SCHEME_PATTERN.test(reference)) {
    addReferenceError(state, sourceLabel, "只允许仓库内相对资源", display);
    return null;
  }

  let targetPath;
  try {
    const targetUrl = new URL(reference, pathToFileURL(sourceRealPath));
    if (targetUrl.protocol !== "file:") throw new Error("not file");
    targetPath = fileURLToPath(targetUrl);
  } catch {
    addReferenceError(state, sourceLabel, "资源引用无法可靠解析", display);
    return null;
  }

  let targetRealPath;
  try {
    targetRealPath = await realpath(targetPath);
  } catch {
    addReferenceError(state, sourceLabel, "引用的本地资源不存在或不可读取", display);
    return null;
  }
  if (!isContained(state.realRoot, targetRealPath)) {
    addReferenceError(state, sourceLabel, "引用的真实路径越出仓库", display);
    return null;
  }
  try {
    const targetStat = await stat(targetRealPath);
    if (!targetStat.isFile()) {
      addReferenceError(state, sourceLabel, "引用目标必须是普通文件", display);
      return null;
    }
  } catch {
    addReferenceError(state, sourceLabel, "引用的本地资源不存在或不可读取", display);
    return null;
  }

  if (kind === "stylesheet") {
    await scanExternalStylesheet(state, targetRealPath);
  }
  return targetRealPath;
}

async function scanExternalStylesheet(state, stylesheetRealPath) {
  if (state.visitedStylesheets.has(stylesheetRealPath)) return;
  state.visitedStylesheets.add(stylesheetRealPath);
  const sourceLabel = repositoryRelative(state.realRoot, stylesheetRealPath);
  let css;
  try {
    css = await readFile(stylesheetRealPath, "utf8");
  } catch {
    addHtmlError(state, sourceLabel, "样式表不存在或不可读取");
    return;
  }
  await scanCssText(state, css, stylesheetRealPath, sourceLabel);
}

async function scanCssText(state, css, sourceRealPath, sourceLabel) {
  let references;
  try {
    references = parseCssReferences(css);
  } catch (error) {
    addHtmlError(state, sourceLabel, `CSS 无法可靠解析：${error.message}`);
    return;
  }
  for (const reference of references) {
    if (reference.value === "") continue;
    await inspectReference(
      state,
      reference.value,
      sourceRealPath,
      sourceLabel,
      reference.kind === "import" ? "stylesheet" : "resource",
    );
  }
}

function parseCssReferences(css) {
  const references = [];
  let cursor = 0;
  while (cursor < css.length) {
    if (css.startsWith("/*", cursor)) {
      cursor = skipCssComment(css, cursor);
      continue;
    }
    const character = css[cursor];
    if (character === "\\") throw new Error("禁止反斜杠 escape");
    if (character === "\"" || character === "'") {
      cursor = consumeCssString(css, cursor).end;
      continue;
    }
    if (character === "@" && startsCssWord(css, cursor + 1, "import")) {
      cursor += 7;
      cursor = skipCssTrivia(css, cursor);
      if (css[cursor] === "\"" || css[cursor] === "'") {
        const string = consumeCssString(css, cursor);
        references.push({ kind: "import", value: string.value });
        cursor = string.end;
        continue;
      }
      if (startsCssWord(css, cursor, "url")) {
        const open = skipCssTrivia(css, cursor + 3);
        if (css[open] !== "(") throw new Error("@import 缺少可归类的 URL");
        const parsed = consumeCssUrl(css, open);
        references.push({ kind: "import", value: parsed.value });
        cursor = parsed.end;
        continue;
      }
      throw new Error("@import 缺少 quoted 字符串或 url()");
    }
    if (isCssIdentifierStart(character)) {
      const start = cursor;
      cursor += 1;
      while (cursor < css.length && isCssIdentifierCharacter(css[cursor])) cursor += 1;
      if (css.slice(start, cursor).toLowerCase() === "url") {
        const open = skipCssTrivia(css, cursor);
        if (css[open] === "(") {
          const parsed = consumeCssUrl(css, open);
          references.push({ kind: "url", value: parsed.value });
          cursor = parsed.end;
        }
      }
      continue;
    }
    cursor += 1;
  }
  return references;
}

function consumeCssUrl(css, openingParenthesis) {
  let cursor = skipCssTrivia(css, openingParenthesis + 1);
  if (cursor >= css.length) throw new Error("url() 未闭合");
  if (css[cursor] === "\"" || css[cursor] === "'") {
    const string = consumeCssString(css, cursor);
    cursor = skipCssTrivia(css, string.end);
    if (css[cursor] !== ")") throw new Error("quoted url() 未闭合");
    return { value: string.value, end: cursor + 1 };
  }

  let value = "";
  while (cursor < css.length && css[cursor] !== ")") {
    if (css.startsWith("/*", cursor)) {
      cursor = skipCssComment(css, cursor);
      value += " ";
      continue;
    }
    const character = css[cursor];
    if (character === "\\") throw new Error("禁止反斜杠 escape");
    if (character === "\"" || character === "'" || character === "(") {
      throw new Error("unquoted url() 含畸形 token");
    }
    value += character;
    cursor += 1;
  }
  if (cursor >= css.length) throw new Error("url() 未闭合");
  const trimmed = asciiTrim(value);
  if (/[\t\n\f\r ]/u.test(trimmed)) throw new Error("unquoted url() 含空白");
  return { value: trimmed, end: cursor + 1 };
}

function consumeCssString(css, openingQuote) {
  const quote = css[openingQuote];
  let cursor = openingQuote + 1;
  let value = "";
  while (cursor < css.length) {
    const character = css[cursor];
    if (character === quote) return { value, end: cursor + 1 };
    if (character === "\\") throw new Error("禁止反斜杠 escape");
    if (character === "\n" || character === "\r" || character === "\f") {
      throw new Error("字符串未闭合");
    }
    value += character;
    cursor += 1;
  }
  throw new Error("字符串未闭合");
}

function skipCssTrivia(css, start) {
  let cursor = start;
  while (cursor < css.length) {
    if (/[\t\n\f\r ]/u.test(css[cursor])) {
      cursor += 1;
      continue;
    }
    if (css.startsWith("/*", cursor)) {
      cursor = skipCssComment(css, cursor);
      continue;
    }
    break;
  }
  return cursor;
}

function skipCssComment(css, opening) {
  const end = css.indexOf("*/", opening + 2);
  if (end === -1) throw new Error("注释未闭合");
  return end + 2;
}

function startsCssWord(css, start, expected) {
  if (css.slice(start, start + expected.length).toLowerCase() !== expected) return false;
  return !isCssIdentifierCharacter(css[start - 1])
    && !isCssIdentifierCharacter(css[start + expected.length]);
}

function isCssIdentifierStart(character) {
  return typeof character === "string" && /[a-z_-]/iu.test(character);
}

function isCssIdentifierCharacter(character) {
  return typeof character === "string" && /[a-z0-9_-]/iu.test(character);
}

function findHtmlCommentClosing(html, opening) {
  const contentStart = opening + 4;
  if (html[contentStart] === ">") return { end: contentStart + 1, malformed: true };
  if (html.startsWith("->", contentStart)) return { end: contentStart + 2, malformed: true };

  const canonical = html.indexOf("-->", contentStart);
  const bang = html.indexOf("--!>", contentStart);
  if (canonical === -1 && bang === -1) return null;
  if (bang !== -1 && (canonical === -1 || bang < canonical)) {
    return { end: bang + 4, malformed: true };
  }
  return { end: canonical + 3, malformed: false };
}

function findHtmlTagEnd(html, start) {
  let quote = null;
  let afterEquals = false;
  let inUnquotedValue = false;
  let malformed = false;
  for (let cursor = start; cursor < html.length; cursor += 1) {
    const character = html[cursor];
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === ">") return { end: cursor, malformed };

    if (inUnquotedValue) {
      if (/[\t\n\f\r ]/u.test(character)) {
        inUnquotedValue = false;
      } else if (character === "\"" || character === "'" || character === "<") {
        malformed = true;
      }
      continue;
    }

    if (afterEquals) {
      if (/[\t\n\f\r ]/u.test(character)) continue;
      afterEquals = false;
      if (character === "\"" || character === "'") quote = character;
      else {
        inUnquotedValue = true;
        if (character === "<") malformed = true;
      }
      continue;
    }

    if (character === "=") afterEquals = true;
    else if (character === "\"" || character === "'" || character === "<") malformed = true;
  }
  return null;
}

function parseHtmlAttributes(rawTag, tagNameEnd) {
  const attributes = new Map();
  let cursor = tagNameEnd;
  while (cursor < rawTag.length) {
    while (cursor < rawTag.length && /[\t\n\f\r ]/u.test(rawTag[cursor])) cursor += 1;
    if (cursor >= rawTag.length || rawTag[cursor] === "/") break;
    const nameStart = cursor;
    while (cursor < rawTag.length && !/[\t\n\f\r =>/]/u.test(rawTag[cursor])) cursor += 1;
    if (cursor === nameStart) {
      cursor += 1;
      continue;
    }
    const name = rawTag.slice(nameStart, cursor).toLowerCase();
    while (cursor < rawTag.length && /[\t\n\f\r ]/u.test(rawTag[cursor])) cursor += 1;

    let hasEquals = false;
    let quoted = false;
    let value = null;
    if (rawTag[cursor] === "=") {
      hasEquals = true;
      cursor += 1;
      while (cursor < rawTag.length && /[\t\n\f\r ]/u.test(rawTag[cursor])) cursor += 1;
      if (rawTag[cursor] === "\"" || rawTag[cursor] === "'") {
        quoted = true;
        const quote = rawTag[cursor];
        const valueStart = ++cursor;
        while (cursor < rawTag.length && rawTag[cursor] !== quote) cursor += 1;
        value = rawTag.slice(valueStart, cursor);
        if (cursor < rawTag.length) cursor += 1;
      } else {
        const valueStart = cursor;
        while (cursor < rawTag.length && !/[\t\n\f\r >]/u.test(rawTag[cursor])) cursor += 1;
        value = rawTag.slice(valueStart, cursor);
      }
    }
    const entries = attributes.get(name) ?? [];
    entries.push({ hasEquals, quoted, value });
    attributes.set(name, entries);
  }
  return attributes;
}

function findRawTextClosingTag(html, start, tagName) {
  const expression = new RegExp(`<\\/${tagName}`, "igu");
  expression.lastIndex = start;
  const match = expression.exec(html);
  if (!match) return null;
  const closing = findHtmlTagEnd(html, expression.lastIndex);
  if (closing === null) return null;
  const raw = html.slice(match.index, closing.end + 1);
  const canonical = new RegExp(`^<\\/${tagName}[\\t\\n\\f\\r ]*>$`, "iu").test(raw);
  return { start: match.index, end: closing.end + 1, malformed: closing.malformed || !canonical };
}

function isProfileTag(tagName) {
  return DENIED_TAGS.has(tagName)
    || tagName === "link"
    || tagName === "style"
    || Object.hasOwn(STATIC_URL_ATTRIBUTES, tagName)
    || Object.hasOwn(SVG_URL_ATTRIBUTES, tagName);
}

function isAllowedDataIcon(reference) {
  if (reference === "data:,") return true;
  return DATA_ICON_SHA256.has(createHash("sha256").update(reference).digest("hex"));
}

function isContained(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function repositoryRelative(realRoot, realPath) {
  return safeRepositoryLabel(path.relative(realRoot, realPath).split(path.sep).join("/"));
}

function safeRepositoryLabel(value) {
  if (typeof value !== "string") return "<invalid-path>";
  return escapeControls(value.replaceAll("\\", "/"));
}

export function redactResourceReference(reference) {
  if (typeof reference !== "string") return "<invalid-reference>";
  const trimmed = asciiTrim(reference);
  if (/^data:/iu.test(trimmed)) return "<data-url>";
  if (/^blob:/iu.test(trimmed)) return "<blob-url>";
  if (trimmed.startsWith("//") || SCHEME_PATTERN.test(trimmed)) return "<external-url>";
  return escapeControls(trimmed.split(/[?#]/u, 1)[0]);
}

function escapeControls(value) {
  return value.replace(/[\u0000-\u001f\u007f]/gu, (character) => {
    const code = character.codePointAt(0).toString(16).padStart(4, "0");
    return `\\u${code}`;
  });
}

function asciiTrim(value) {
  return value.replace(ASCII_SPACE_PATTERN, "");
}

function addHtmlError(state, sourceLabel, message) {
  state.errors.add(`${state.experience.id} 的 ${safeRepositoryLabel(sourceLabel)}：${message}。`);
}

function addReferenceError(state, sourceLabel, message, display) {
  state.errors.add(`${state.experience.id} 的 ${safeRepositoryLabel(sourceLabel)}：${message}：${display}。`);
}
