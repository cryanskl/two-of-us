import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile, chmod } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadCatalog, validateCatalog } from "../shared/runtime/catalog.js";
import {
  redactResourceReference,
  renderMacLauncher,
  renderWindowsLauncher,
  validateExperienceContracts,
} from "./experience-contracts.mjs";

const sourceRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

function experience(overrides = {}) {
  const value = {
    id: "local-test",
    title: "本地测试",
    category: "surprise",
    level: "A",
    players: "1 人",
    devices: "单设备",
    entry: "experiences/surprises/local-test/index.html",
    readme: "experiences/surprises/local-test/README.md",
    description: "测试本地直达合同。",
    installed: true,
    networkRequired: false,
    ...overrides,
  };
  return value;
}

function catalog(...experiences) {
  return validateCatalog({ schemaVersion: 1, experiences });
}

async function fixture(t, {
  item = experience(),
  html = "<!doctype html><title>本地测试</title><main>可以打开</main>",
  readme = "# 本地测试\n\n## 借鉴与来源声明\n\n本 fixture 无外部来源。\n",
} = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "two-of-us-contract-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = path.join(root, path.dirname(item.entry));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(root, item.entry), html);
  await writeFile(path.join(root, item.readme), readme);
  return { root, directory, item };
}

async function validate(root, ...items) {
  return validateExperienceContracts({ rootDir: root, catalog: catalog(...items) });
}

test("launcher renderers preserve the exact shared-runtime wrappers", () => {
  assert.match(renderMacLauncher("local-test"), /node scripts\/start\.mjs --experience local-test/);
  assert.match(renderWindowsLauncher("local-test"), /node scripts\\start\.mjs --experience local-test/);
  assert.throws(() => renderMacLauncher("../escape"), TypeError);
  assert.throws(() => renderWindowsLauncher("UpperCase"), TypeError);
});

test("shared resource redactor removes secrets and escapes CLI control characters", () => {
  assert.equal(redactResourceReference("missing\nFAKE_ERROR.png?secret=PRIVATE#fragment"),
    "missing\\u000aFAKE_ERROR.png");
  assert.equal(redactResourceReference("https://user:PRIVATE@example.com/private"), "<external-url>");
  assert.equal(redactResourceReference("data:text/plain,PRIVATE"), "<data-url>");
});

test("real catalog satisfies all 62 A and 8 non-A contracts", async () => {
  const realCatalog = await loadCatalog(sourceRoot);
  const installed = realCatalog.experiences.filter((item) => item.installed === true);
  assert.equal(installed.length, 70);
  assert.equal(installed.filter(({ level }) => level === "A").length, 62);
  assert.equal(installed.filter(({ level }) => level !== "A").length, 8);
  assert.deepEqual(await validateExperienceContracts({ rootDir: sourceRoot, catalog: realCatalog }), []);
});

test("A entry follows HTML through recursive CSS and local media", async (t) => {
  const html = `<!doctype html>
    <title>本地测试</title>
    <link rel="stylesheet" href="styles.css">
    <style>.inline { background: url('inline.png') }</style>
    <main style="background-image: url('attribute.png')">
      <img src="photo.png"><audio src="tone.wav"></audio><video poster="poster.png"></video>
      <object data="shape.svg"></object><script src="app.js"></script>
    </main>`;
  const { root, directory, item } = await fixture(t, { html });
  await Promise.all([
    writeFile(path.join(directory, "styles.css"), "@import \"nested.css\"; .hero { background: url(asset.png) }"),
    writeFile(path.join(directory, "nested.css"), ".nested { color: #123 }"),
    ...["inline.png", "attribute.png", "photo.png", "tone.wav", "poster.png", "shape.svg", "asset.png", "app.js"]
      .map((name) => writeFile(path.join(directory, name), "fixture")),
  ]);
  assert.deepEqual(await validate(root, item), []);
  assert.deepEqual(await validateExperienceContracts({ rootDir: pathToFileURL(`${root}/`), catalog: catalog(item) }), []);
});

test("HTML profile rejects every unsupported loading family", async (t) => {
  const cases = [
    ["module", "<script type=\"module\" src=\"app.js\"></script>", /module/],
    ["module entity", "<script type=\"mod&#117;le\" src=\"app.js\"></script>", /控制属性禁止 entity/],
    ["base", "<base href=\"./\">", /base/],
    ["refresh", "<meta http-equiv=\"refresh\" content=\"0;url=next.html\">", /meta refresh/],
    ["refresh entity", "<meta http-equiv=\"refre&#115;h\" content=\"0;url=next.html\">", /控制属性禁止 entity/],
    ["iframe", "<iframe src=\"frame.html\"></iframe>", /iframe/],
    ["frame", "<frame src=\"frame.html\">", /frame/],
    ["embed", "<embed src=\"frame.html\">", /embed/],
    ["img srcset", "<img src=\"ok.png\" srcset=\"other.png 2x\">", /srcset/],
    ["source srcset", "<source src=\"ok.png\" srcset=\"other.png 2x\">", /srcset/],
    ["form", "<form action=\"send.html\"></form>", /form\[action\]/],
    ["button formaction", "<button formaction=\"send.html\">x</button>", /button\[formaction\]/],
    ["input formaction", "<input formaction=\"send.html\">", /input\[formaction\]/],
    ["input image", "<input type=\"image\" src=\"ok.png\">", /input\[type=image\]/],
    ["input image entity", "<input type=\"im&#97;ge\" src=\"https://example.com/x.png\">", /控制属性禁止 entity/],
    ["a ping", "<a href=\"#\" ping=\"track\">x</a>", /a\[ping\]/],
    ["area ping", "<area href=\"#\" ping=\"track\">", /area\[ping\]/],
    ["svg use", "<svg><use href=\"sprite.svg#x\"></use></svg>", /<use>/],
    ["svg image xlink", "<svg><image xlink:href=\"image.png\"></image></svg>", /<image>/],
    ["svg feImage", "<svg><feImage href=\"image.png\"></feImage></svg>", /<feimage>/],
    ["preload", "<link rel=\"preload\" href=\"asset.png\">", /只允许 stylesheet 或 icon/],
    ["modulepreload", "<link rel=\"modulepreload\" href=\"app.js\">", /只允许 stylesheet 或 icon/],
    ["rel entity", "<link rel=\"style&#115;heet\" href=\"styles.css\">", /控制属性禁止 entity/],
    ["unquoted", "<img src=ok.png>", /必须使用单引号或双引号/],
    ["duplicate", "<img src=\"one.png\" src=\"two.png\">", /必须恰好出现一次/],
    ["malformed comment", "<!--><img src=\"https://example.com/x.png\">", /注释未按 canonical/],
    ["malformed comment cannot borrow a later close", "<!-- --!><img src=\"https://example.com/x.png\"><!-- -->", /只允许仓库内相对资源/],
    ["unquoted quote cannot swallow a resource", "<div x=y\"><img src=\"https://example.com/x.png\">\">", /只允许仓库内相对资源/],
    ["bogus declaration cannot swallow a resource", "<!x \"?><img src=\"https://example.com/x.png\">\">", /只允许仓库内相对资源/],
    ["malformed raw close", "<script></script x><img src=\"https://example.com/x.png\"></script>", /非 canonical 结束标签/],
  ];
  for (const [name, fragment, expected] of cases) {
    await t.test(name, async (child) => {
      const { root, directory, item } = await fixture(child, { html: `<!doctype html><title>x</title>${fragment}` });
      await Promise.all(["app.js", "ok.png", "styles.css"].map(
        (file) => writeFile(path.join(directory, file), "fixture"),
      ));
      const errors = await validate(root, item);
      assert.ok(errors.some((message) => expected.test(message)), `${name}: ${errors.join("\n")}`);
      assert.ok(errors.every((message) => !message.includes("不存在或不可读取")), name);
    });
  }
});

test("resource schemes, entities, missing files, and private query text fail safely", async (t) => {
  const references = [
    "/root.png",
    "https://example.com/a.png",
    "//example.com/a.png",
    "blob:private-token",
    "data:image/png;base64,PRIVATE",
    "missing.png?secret=PRIVATE#fragment",
    "missing&amp;.png",
    "https://user:PRIVATE@example.com/private-token/a.png?secret=PRIVATE#fragment",
    "missing%5cpath.png",
    "#fragment\nPRIVATE",
  ];
  for (const reference of references) {
    await t.test(reference.split(":", 1)[0], async (child) => {
      const { root, item } = await fixture(child, {
        html: `<!doctype html><title>x</title><img src="${reference}">`,
      });
      const errors = await validate(root, item);
      assert.ok(errors.length > 0);
      assert.doesNotMatch(errors.join("\n"), /PRIVATE|fragment|private-token|user:/);
    });
  }
});

test("data favicon exception is narrow and hash-gated", async (t) => {
  const allowed = await fixture(t, {
    html: "<!doctype html><title>x</title><link rel=\"icon\" href=\"data:,\"><main>x</main>",
  });
  assert.deepEqual(await validate(allowed.root, allowed.item), []);

  const denied = await fixture(t, {
    html: "<!doctype html><title>x</title><link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg/%3E\">",
  });
  const errors = await validate(denied.root, denied.item);
  assert.ok(errors.some((message) => message.includes("data URL")));
  assert.doesNotMatch(errors.join("\n"), /%3Csvg/);
});

test("CSS lexer preserves comments inside strings and treats token comments as whitespace", async (t) => {
  const { root, directory, item } = await fixture(t, {
    html: "<!doctype html><title>x</title><link rel=\"stylesheet\" href=\"styles.css\">",
  });
  await writeFile(path.join(directory, "styles.css"), ".a{content:'/* literal */'} u/**/rl('missing.png'){color:red}");
  assert.deepEqual(await validate(root, item), []);

  await writeFile(path.join(directory, "styles.css"), ".a { background: url('missing.png') /*");
  const errors = await validate(root, item);
  assert.ok(errors.some((message) => message.includes("注释未闭合")));
});

test("CSS imports terminate cycles and report missing nested assets", async (t) => {
  const { root, directory, item } = await fixture(t, {
    html: "<!doctype html><title>x</title><link rel=\"stylesheet\" href=\"a.css\">",
  });
  await writeFile(path.join(directory, "a.css"), "@import url('b.css');");
  await writeFile(path.join(directory, "b.css"), "@import \"a.css\"; .x{background:url(missing.png)}");
  const errors = await validate(root, item);
  assert.equal(errors.filter((message) => message.includes("missing.png")).length, 1);
});

test("CSS lexer rejects escape and every unterminated lexical state", async (t) => {
  const cases = [
    ["escape", String.raw`.a{background:u\72l('asset.png')}`, /escape/],
    ["string", ".a{content:'unterminated}", /字符串未闭合/],
    ["url", ".a{background:url('asset.png'", /url\(\) 未闭合|quoted url\(\) 未闭合/],
    ["comment", ".a{color:red} /*", /注释未闭合/],
  ];
  for (const [name, css, expected] of cases) {
    await t.test(name, async (child) => {
      const { root, directory, item } = await fixture(child, {
        html: "<!doctype html><title>x</title><link rel=\"stylesheet\" href=\"styles.css\">",
      });
      await writeFile(path.join(directory, "styles.css"), css);
      const errors = await validate(root, item);
      assert.ok(errors.some((message) => expected.test(message)), errors.join("\n"));
    });
  }
});

test("non-A launchers require exact content and 0755 mode", async (t) => {
  const item = experience({ level: "C" });
  const { root, directory } = await fixture(t, { item });
  await writeFile(path.join(directory, "start.command"), renderMacLauncher(item.id), { mode: 0o755 });
  await writeFile(path.join(directory, "start.bat"), renderWindowsLauncher(item.id));
  if (process.platform !== "win32") await chmod(path.join(directory, "start.command"), 0o755);
  assert.deepEqual(await validate(root, item), []);

  if (process.platform !== "win32") await chmod(path.join(directory, "start.command"), 0o644);
  await writeFile(path.join(directory, "start.bat"), "@echo off\nwrong\n");
  const errors = await validate(root, item);
  if (process.platform !== "win32") assert.ok(errors.some((message) => message.includes("0755")));
  assert.ok(errors.some((message) => message.includes("模板不一致")));
});

test("uninstalled entries are not required on disk", async (t) => {
  const { root } = await fixture(t);
  const absent = experience({
    id: "later-test",
    entry: "experiences/surprises/later-test/index.html",
    readme: "experiences/surprises/later-test/README.md",
    installed: false,
  });
  assert.deepEqual(await validate(root, absent), []);
});

test("missing files, directory impostors, and missing launchers are explicit", async (t) => {
  await t.test("missing entry", async (child) => {
    const data = await fixture(child);
    await rm(path.join(data.root, data.item.entry));
    assert.ok((await validate(data.root, data.item)).some((message) => message.includes("入口不存在")));
  });
  await t.test("README directory", async (child) => {
    const data = await fixture(child);
    await rm(path.join(data.root, data.item.readme));
    await mkdir(path.join(data.root, data.item.readme));
    assert.ok((await validate(data.root, data.item)).some((message) => message.includes("README必须是普通文件")));
  });
  await t.test("missing README", async (child) => {
    const data = await fixture(child);
    await rm(path.join(data.root, data.item.readme));
    assert.ok((await validate(data.root, data.item)).some((message) => message.includes("README不存在")));
  });
  await t.test("entry directory", async (child) => {
    const data = await fixture(child);
    await rm(path.join(data.root, data.item.entry));
    await mkdir(path.join(data.root, data.item.entry));
    assert.ok((await validate(data.root, data.item)).some((message) => message.includes("入口必须是普通文件")));
  });
  await t.test("missing launchers", async (child) => {
    const item = experience({ level: "D" });
    const data = await fixture(child, { item });
    const errors = await validate(data.root, item);
    assert.ok(errors.some((message) => message.includes("start.command不存在")));
    assert.ok(errors.some((message) => message.includes("start.bat不存在")));
  });
  await t.test("wrong launcher ID", async (child) => {
    const item = experience({ level: "B" });
    const data = await fixture(child, { item });
    await writeFile(path.join(data.directory, "start.command"), renderMacLauncher("other-id"), { mode: 0o755 });
    await writeFile(path.join(data.directory, "start.bat"), renderWindowsLauncher("other-id"));
    if (process.platform !== "win32") await chmod(path.join(data.directory, "start.command"), 0o755);
    const errors = await validate(data.root, item);
    assert.equal(errors.length, 2);
    assert.ok(errors.some((message) => message.includes("start.command") && message.includes("模板不一致")));
    assert.ok(errors.some((message) => message.includes("start.bat") && message.includes("模板不一致")));
  });
});

test("contract errors are sorted, unique, frozen, and never expose absolute paths", async (t) => {
  const { root, item } = await fixture(t, {
    item: experience({ networkRequired: true }),
    html: "<!doctype html><title>x</title><img src=\"missing.png\"><img src=\"missing.png\">",
    readme: "# missing attribution\n",
  });
  const errors = await validate(root, item);
  assert.equal(Object.isFrozen(errors), true);
  assert.deepEqual(errors, [...new Set(errors)].sort());
  assert.doesNotMatch(errors.join("\n"), new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("entry and dependency symlinks cannot escape the repository", {
  skip: process.platform === "win32" ? "Windows symlink privileges vary" : false,
}, async (t) => {
  const outside = await mkdtemp(path.join(os.tmpdir(), "two-of-us-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, "outside.png"), "outside");

  const dependency = await fixture(t, {
    html: "<!doctype html><title>x</title><img src=\"outside.png\">",
  });
  await symlink(path.join(outside, "outside.png"), path.join(dependency.directory, "outside.png"));
  assert.ok((await validate(dependency.root, dependency.item)).some((message) => message.includes("越出仓库")));

  await mkdir(path.join(outside, "assets"));
  await writeFile(path.join(outside, "assets", "nested.png"), "outside");
  await symlink(path.join(outside, "assets"), path.join(dependency.directory, "linked"));
  await writeFile(path.join(dependency.root, dependency.item.entry),
    "<!doctype html><title>x</title><img src=\"linked/nested.png\">");
  assert.ok((await validate(dependency.root, dependency.item)).some((message) => message.includes("越出仓库")));

  const outsideFile = path.join(outside, "sibling.png");
  await writeFile(outsideFile, "outside");
  const siblingReference = path.relative(dependency.directory, outsideFile).split(path.sep).join("/");
  await writeFile(path.join(dependency.root, dependency.item.entry),
    `<!doctype html><title>x</title><img src="${siblingReference}">`);
  assert.ok((await validate(dependency.root, dependency.item)).some((message) => message.includes("越出仓库")));
  const encodedReference = siblingReference.split("/")
    .map((segment) => segment === ".." ? "%2e%2e" : segment).join("/");
  await writeFile(path.join(dependency.root, dependency.item.entry),
    `<!doctype html><title>x</title><img src="${encodedReference}">`);
  assert.ok((await validate(dependency.root, dependency.item)).some((message) => message.includes("越出仓库")));

  const entryLink = await fixture(t);
  await rm(path.join(entryLink.root, entryLink.item.entry));
  await symlink(path.join(outside, "outside.png"), path.join(entryLink.root, entryLink.item.entry));
  assert.ok((await validate(entryLink.root, entryLink.item)).some((message) => message.includes("符号链接")));

  const readmeLink = await fixture(t);
  await rm(path.join(readmeLink.root, readmeLink.item.readme));
  await symlink(path.join(outside, "outside.png"), path.join(readmeLink.root, readmeLink.item.readme));
  assert.ok((await validate(readmeLink.root, readmeLink.item)).some(
    (message) => message.includes("README不得是符号链接"),
  ));

  const rootLink = `${dependency.root}-link`;
  await symlink(dependency.root, rootLink);
  t.after(() => rm(rootLink, { force: true }));
  await writeFile(path.join(dependency.root, dependency.item.entry), "<!doctype html><title>x</title><main>x</main>");
  assert.deepEqual(await validate(rootLink, dependency.item), []);
});

test("renderer output matches every committed non-A launcher", async () => {
  const realCatalog = await loadCatalog(sourceRoot);
  for (const item of realCatalog.experiences.filter(
    ({ installed, level }) => installed === true && level !== "A",
  )) {
    const directory = path.join(sourceRoot, path.dirname(item.entry));
    assert.equal(await readFile(path.join(directory, "start.command"), "utf8"), renderMacLauncher(item.id));
    assert.equal(await readFile(path.join(directory, "start.bat"), "utf8"), renderWindowsLauncher(item.id));
  }
});
