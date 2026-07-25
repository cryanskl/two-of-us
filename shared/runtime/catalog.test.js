import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";
import { renderMacLauncher, renderWindowsLauncher } from "../../scripts/experience-contracts.mjs";
import { loadCatalog, validateCatalog } from "./catalog.js";

function catalogFixture(overrides = {}) {
  return {
    id: "local-test",
    title: "本地测试",
    category: "surprise",
    level: "A",
    players: "1 人",
    devices: "单设备",
    entry: "experiences/surprises/local-test/index.html",
    readme: "experiences/surprises/local-test/README.md",
    description: "用于验证目录 schema。",
    installed: true,
    networkRequired: false,
    ...overrides,
  };
}

test("catalog validator freezes required metadata and boolean fields", () => {
  assert.doesNotThrow(() => validateCatalog({ schemaVersion: 1, experiences: [catalogFixture()] }));

  for (const field of [
    "id", "title", "category", "level", "players", "devices", "entry", "readme", "description",
  ]) {
    assert.throws(
      () => validateCatalog({ schemaVersion: 1, experiences: [catalogFixture({ [field]: "" })] }),
      new RegExp(field === "readme" ? "readme|字段" : `${field}|字段`, "i"),
    );
  }
  for (const field of ["installed", "networkRequired"]) {
    assert.throws(
      () => validateCatalog({ schemaVersion: 1, experiences: [catalogFixture({ [field]: "false" })] }),
      new RegExp(field),
    );
  }
});

test("catalog validator aligns category, entry, readme, and uniqueness", () => {
  assert.throws(
    () => validateCatalog({ schemaVersion: 1, experiences: [catalogFixture({ category: "unknown" })] }),
    /分类/,
  );
  assert.throws(
    () => validateCatalog({ schemaVersion: 1, experiences: [catalogFixture({ category: "co-op" })] }),
    /入口/,
  );
  assert.throws(
    () => validateCatalog({
      schemaVersion: 1,
      experiences: [catalogFixture({ readme: "experiences/surprises/other/README.md" })],
    }),
    /README/,
  );
  assert.throws(
    () => validateCatalog({ schemaVersion: 1, experiences: [catalogFixture(), catalogFixture()] }),
    /id 或入口重复/,
  );
});

test("portal gives every experience link a title-specific accessible name", async () => {
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");

  assert.match(portal, /link\.setAttribute\("aria-label", `打开《\$\{item\.title\}》`\)/);
});

test("co-op index links every cataloged co-op experience", async () => {
  const root = new URL("../../", import.meta.url);
  const [catalog, index] = await Promise.all([
    loadCatalog(root),
    readFile(new URL("experiences/co-op/README.md", root), "utf8"),
  ]);

  for (const item of catalog.experiences.filter((entry) => entry.category === "co-op")) {
    assert.ok(index.includes(`(./${item.id}/)`), `co-op README is missing ${item.id}`);
  }
});

test("catalog exposes an installed A-level Love Tree", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const loveTree = catalog.experiences.find((item) => item.id === "love-tree");

  assert.equal(catalog.schemaVersion, 1);
  assert.equal(loveTree.level, "A");
  assert.equal(loveTree.installed, true);
  assert.equal(loveTree.networkRequired, false);
});

test("catalog exposes the installed B-level panorama memory experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const panorama = catalog.experiences.find((item) => item.id === "panorama-memory");

  assert.equal(panorama.level, "B");
  assert.equal(panorama.networkRequired, false);
  assert.match(panorama.entry, /panorama-memory\/index\.html$/);
});

test("catalog exposes the installed A-level private photo puzzle", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const puzzle = catalog.experiences.find((item) => item.id === "photo-swap-puzzle");

  assert.equal(puzzle.level, "A");
  assert.equal(puzzle.networkRequired, false);
  assert.match(puzzle.entry, /photo-swap-puzzle\/index\.html$/);
});

test("catalog exposes the installed A-level future ticket", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const ticket = catalog.experiences.find((item) => item.id === "future-ticket");

  assert.equal(ticket.category, "surprise");
  assert.equal(ticket.level, "A");
  assert.equal(ticket.networkRequired, false);
  assert.match(ticket.entry, /future-ticket\/index\.html$/);
});

test("future ticket keeps its file protocol and hidden-option boundary", async () => {
  const root = new URL("../../experiences/surprises/future-ticket/", import.meta.url);
  const [html, config, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker)\b/);
  assert.doesNotMatch(html, /周五下班后|周六午后|去看晚霞|去吃一顿热汤|我负责路线|你负责选歌/);
  assert.doesNotMatch(html, /data-(?:option|secret|reveal)=/i);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
});

test("catalog exposes the installed A-level instant photo", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const instantPhoto = catalog.experiences.find((item) => item.id === "instant-photo");

  assert.equal(instantPhoto.category, "surprise");
  assert.equal(instantPhoto.level, "A");
  assert.equal(instantPhoto.installed, true);
  assert.equal(instantPhoto.networkRequired, false);
  assert.match(instantPhoto.entry, /instant-photo\/index\.html$/);
});

test("instant photo keeps its file protocol and staged privacy boundary", async () => {
  const root = new URL("../../experiences/surprises/instant-photo/", import.meta.url);
  const [html, config, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(html, /那天，风刚刚好|某个慢下来的傍晚|下一张，换我们/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
});

test("catalog exposes the installed A-level nested gift", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const nestedGift = catalog.experiences.find((item) => item.id === "nested-gift");

  assert.equal(nestedGift.category, "surprise");
  assert.equal(nestedGift.level, "A");
  assert.equal(nestedGift.installed, true);
  assert.equal(nestedGift.networkRequired, false);
  assert.match(nestedGift.entry, /nested-gift\/index\.html$/);
});

test("nested gift keeps its file protocol and staged privacy boundary", async () => {
  const root = new URL("../../experiences/surprises/nested-gift/", import.meta.url);
  const [html, config, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(html, /第一层，是想把今天|普通日子里悄悄累积|原来盒心一直是你/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
});

test("catalog exposes the installed A-level paper plane mail", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const mail = catalog.experiences.find((item) => item.id === "paper-plane-mail");

  assert.equal(mail.category, "surprise");
  assert.equal(mail.level, "A");
  assert.equal(mail.installed, true);
  assert.equal(mail.networkRequired, false);
  assert.match(mail.entry, /paper-plane-mail\/index\.html$/);
});

test("paper plane mail keeps its file protocol and staged letter boundary", async () => {
  const root = new URL("../../experiences/surprises/paper-plane-mail/", import.meta.url);
  const [html, config, logic, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(css, /gradient\s*\(/i);
  assert.match(css, /assets\/night-post-desk\.png/);
  assert.doesNotMatch(`${html}\n${app}`, /这封信，终于飞到了|有些话，放在心里太久|下一段路，也想继续和你一起走/);
});

test("catalog exposes the installed A-level star code unlock", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const starCode = catalog.experiences.find((item) => item.id === "star-code-unlock");

  assert.equal(starCode.category, "surprise");
  assert.equal(starCode.level, "A");
  assert.equal(starCode.installed, true);
  assert.equal(starCode.networkRequired, false);
  assert.match(starCode.entry, /star-code-unlock\/index\.html$/);
});

test("star code unlock keeps its file protocol and staged secret boundary", async () => {
  const root = new URL("../../experiences/surprises/star-code-unlock/", import.meta.url);
  const [html, config, logic, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(css, /gradient\s*\(/i);
  assert.match(css, /assets\/observatory-desk\.png/);
  assert.doesNotMatch(html, /那次聊到很晚|第一次一起去看海|每次分别前|星图最后指向你|普通的夜晚/);
});

test("catalog exposes the installed A-level hand-crank music box", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const musicBox = catalog.experiences.find((item) => item.id === "hand-crank-music-box");

  assert.equal(musicBox.category, "surprise");
  assert.equal(musicBox.level, "A");
  assert.equal(musicBox.installed, true);
  assert.equal(musicBox.networkRequired, false);
  assert.match(musicBox.entry, /hand-crank-music-box\/index\.html$/);
});

test("hand-crank music box keeps its file protocol, audio, secret, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/hand-crank-music-box/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.match(html, /\.\.\/\.\.\/\.\.\/shared\/audio\/tone-player\.js/);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.match(css, /--night:\s*#111827/i);
  assert.match(html, /assets\/paper-diorama\.png/);
  assert.doesNotMatch(`${html}\n${app}`, /这段路，想和你慢慢走|谢谢你把这首小小的旋律转到最后/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /^# 借鉴与来源声明$/m);
});

test("catalog exposes the installed A-level moon phase secret", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const moonPhase = catalog.experiences.find((item) => item.id === "moon-phase-secret");

  assert.equal(moonPhase.category, "surprise");
  assert.equal(moonPhase.level, "A");
  assert.equal(moonPhase.installed, true);
  assert.equal(moonPhase.networkRequired, false);
  assert.match(moonPhase.entry, /moon-phase-secret\/index\.html$/);
});

test("moon phase secret keeps its file protocol, source, secret, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/moon-phase-secret/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|MediaDevices|DeviceMotionEvent)\b/);
  assert.doesNotMatch(runtimeSource, /document\.cookie|navigator\.serviceWorker/i);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(css, /gradient\s*\(/i);
  assert.match(css, /touch-action:\s*none/i);
  assert.match(html, /assets\/moon-surface\.png/);
  assert.doesNotMatch(`${html}\n${app}\n${portal}`, /原来月亮也记得|那一天之后，普通的日子也开始有了坐标/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /本机明文|不是加密/);
  assert.match(attribution, /OpenAI ImageGen/);
  assert.match(attribution, /SunCalc/);
});

test("catalog exposes the installed A-level fog window letter", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const fogWindow = catalog.experiences.find((item) => item.id === "fog-window-letter");

  assert.equal(fogWindow.category, "surprise");
  assert.equal(fogWindow.level, "A");
  assert.equal(fogWindow.players, "1 人准备，1 人体验");
  assert.equal(fogWindow.devices, "单设备");
  assert.equal(fogWindow.installed, true);
  assert.equal(fogWindow.networkRequired, false);
  assert.match(fogWindow.entry, /fog-window-letter\/index\.html$/);
});

test("fog window letter keeps its file protocol, private DOM, trace, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/fog-window-letter/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|MediaDevices|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /document\.cookie|navigator\.clipboard/i);
  assert.doesNotMatch(runtimeSource, /Math\.random|getImageData|putImageData/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|\beval\s*\(/);
  assert.match(html, /<canvas[^>]+aria-hidden=["']true["']/i);
  assert.match(html, /<div class="completion-host" id="completion-host"><\/div>/);
  assert.doesNotMatch(`${html}\n${app}\n${portal}`, /你刚才写下的每一笔，都让窗外更亮了一点/);
  assert.match(app, /document\.createElement\("article"\)/);
  assert.match(app, /completionHost\.replaceChildren\(\)/);
  assert.match(app, /setPointerCapture/);
  assert.match(app, /getCoalescedEvents/);
  assert.match(app, /pointercancel/);
  assert.match(app, /lostpointercapture/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /MAX_FRAME_GAP_MS/);
  assert.match(logic, /ANCHOR_SPACING = 32/);
  assert.match(logic, /TRACE_RADIUS = 46/);
  assert.match(logic, /TRACE_REQUIRED_NUMERATOR = 4/);
  assert.match(logic, /cross \* cross <= radiusSquared \* vv/);
  assert.match(css, /assets\/window-evening\.jpg/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /本机明文|不是加密/);
  assert.match(attribution, /b392d1d417a7a2fa21a7f659eb76fddcc2be3fdb/);
  assert.match(attribution, /f56f097e0e211fffa1601b93883e4d9f9dccf122/);
  assert.match(attribution, /723838fcbb9feaa87c8840082640de2ed82383da/);
  assert.match(attribution, /c1d88390d2c86901db152827fe778c3e39cfb073/);
  assert.match(attribution, /OpenAI ImageGen/);
  assert.match(attribution, /没有复制或移植/);
  assert.match(portal, /"id": "fog-window-letter"/);
});

test("catalog exposes the installed A-level starlight keepsake search", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const starlight = catalog.experiences.find((item) => item.id === "starlight-keepsake-search");

  assert.equal(starlight.category, "surprise");
  assert.equal(starlight.level, "A");
  assert.equal(starlight.players, "1 人准备，1 人体验");
  assert.equal(starlight.devices, "单设备");
  assert.equal(starlight.installed, true);
  assert.equal(starlight.networkRequired, false);
  assert.match(starlight.entry, /starlight-keepsake-search\/index\.html$/);
});

test("starlight search keeps its file protocol, dwell, private DOM, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/starlight-keepsake-search/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|MediaDevices|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /document\.cookie|navigator\.clipboard/i);
  assert.doesNotMatch(runtimeSource, /Math\.random|getImageData|putImageData|(?:\.\.\/)+shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|\beval\s*\(/);
  assert.match(html, /<canvas[^>]+aria-hidden=["']true["']/i);
  assert.match(html, /<div class="completion-host" id="completion-host"><\/div>/);
  assert.doesNotMatch(`${html}\n${portal}`, /那张车票|两只杯子|没拍完的照片|放在一起的钥匙|窗边那颗星|你找到的不是散落的东西/);
  assert.match(app, /setPointerCapture/);
  assert.match(app, /getCoalescedEvents/);
  assert.match(app, /pointercancel/);
  assert.match(app, /lostpointercapture/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /logic\.MAX_FRAME_GAP_MS/);
  assert.match(logic, /FOCUS_TICKS = 14/);
  assert.match(logic, /MAX_TICKS_PER_ACTION = 5/);
  assert.match(logic, /\{ id: "k5", x: 948, y: 360, radius: 52 \}/);
  assert.match(html, /src=["']assets\/keepsake-night\.jpg["']/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 离线、隐私与规则边界$/m);
  assert.match(readme, /本机明文|不是加密/);
  assert.match(attribution, /2c5818b0e75b835ba5980844136b10cbdc3982a9/);
  assert.match(attribution, /e9d1ca987864f121680bb0d7e9612c05b37748de/);
  assert.match(attribution, /ae5bbf7181d0201466045afbbab2297c8ffa7b90/);
  assert.match(attribution, /7304c64effaa4a1be5b8bf02ab13143a76108a19/);
  assert.match(attribution, /OpenAI 内置 ImageGen/);
  assert.match(attribution, /零复制/);
  assert.match(portal, /"id": "starlight-keepsake-search"/);
});

test("catalog exposes the installed A-level future cookie notes surprise", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "future-cookie-notes");

  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /future-cookie-notes\/index\.html$/);
  assert.match(portal, /"id": "future-cookie-notes"/);
});

test("future cookie notes keeps its file protocol, staged DOM, and attribution boundary", async () => {
  const root = new URL("../../experiences/surprises/future-cookie-notes/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random|Date\.now|(?:\.\.\/)+shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|\beval\s*\(/);
  assert.doesNotMatch(app, /safeConfig\.(?:title|subtitle|intro|readyTitle|finalTitle|notes|closing|signature|privacy|invitation)/);
  assert.match(app, /getFutureCookieNotesView/);
  assert.match(app, /replaceChildren/);
  assert.match(logic, /intro: state\.phase === "collecting"/);
  assert.match(css, /assets\/night-tea-table\.jpg/);
  assert.match(css, /assets\/future-cookie-atlas\.png/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /不是密码学加密/);
  assert.match(attribution, /f378d26989b929d23160efc9b9adfa282f191c39/);
  assert.match(attribution, /867fb314a3f40835c9d7d82828b91da4b3426471/);
  assert.match(attribution, /70e9f73e9132663998af66da971f06e67ad13c88/);
  assert.match(attribution, /零代码、零素材复制/);
});

test("catalog exposes the installed A-level origami heart surprise", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "origami-heart");

  assert.equal(experience.title, "沿着折痕，折到你心里");
  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /origami-heart\/index\.html$/);
  assert.match(portal, /"id": "origami-heart"/);
});

test("origami heart keeps its file protocol, staged DOM, and attribution boundary", async () => {
  const root = new URL("../../experiences/surprises/origami-heart/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, packageJson] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<script src="\.\/config\.js"><\/script>[\s\S]*<script src="\.\/logic\.js"><\/script>[\s\S]*<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(html, /有些话想慢一点说/);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random|Date\.now|(?:\.\.\/)+shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|\beval\s*\(/);
  assert.match(app, /if \(view\.phase === "complete"\) return buildComplete\(\)/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /\.textContent = value == null/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /不是密码学加密/);
  assert.match(attribution, /2b25ed2f7e7162eb3234fda1093617f4f7134c03/);
  assert.match(attribution, /f90830504d6843dfdf5b72d873c01cd716538485/);
  assert.match(attribution, /a4dcc29992c5879066e457d3bb2540a194d5334620b1882450c332fdb9602f42/);
  assert.match(attribution, /8588b3379ce3245f3753bd31e463bd334b9b7301a3e796450ac723ca42093e5e/);
  assert.match(attribution, /零第三方代码、零第三方素材、零远程资源/);
  assert.equal(packageJson, "{\"type\":\"commonjs\"}\n");
});

test("catalog exposes the installed A-level wish fireworks surprise", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "wish-fireworks");

  assert.equal(experience.title, "今晚，点三束光");
  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /wish-fireworks\/index\.html$/);
  assert.match(portal, /"id": "wish-fireworks"/);
});

test("wish fireworks keeps its file protocol and attribution boundary", async () => {
  const root = new URL("../../experiences/surprises/wish-fireworks/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<script src="\.\/config\.js"><\/script>[\s\S]*<script src="\.\/logic\.js"><\/script>[\s\S]*<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|\beval\s*\(/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /不上传、不另存/);
  assert.match(attribution, /8f01eeaef422c1f0880e94ce99040025a1b74d7e/);
  assert.match(attribution, /20eebad51dde793070c373d594099a7ed8d96e22/);
  assert.match(attribution, /不\s*安装、链接、打包或复制任何第三方/);
});

test("catalog exposes the installed A-level flower language bouquet surprise", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "flower-language-bouquet");

  assert.equal(experience.title, "把花语，系成一束");
  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /flower-language-bouquet\/index\.html$/);
  assert.match(portal, /"id": "flower-language-bouquet"/);
});

test("flower language bouquet keeps file launch, controlled SVG export, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/flower-language-bouquet/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<script src="config\.js"><\/script>\s*<script src="logic\.js"><\/script>\s*<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|clipboard|share)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /createElementNS/);
  assert.match(app, /createObjectURL/);
  assert.match(app, /revokeObjectURL/);
  assert.doesNotMatch(app, /\.click\s*\(\s*\)/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /页面不上传、不请求网络、不使用本地存储/);
  assert.match(attribution, /8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9/);
  assert.match(attribution, /cea522bc41bfadc364837293d0c4dc585a65ac46/);
  assert.match(attribution, /没有复制其源码、API、类名、算法/);
});

test("catalog exposes the installed A-level compliment reels surprise", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "compliment-reels");

  assert.equal(experience.title, "每一格，都是喜欢你的理由");
  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /compliment-reels\/index\.html$/);
  assert.match(portal, /"id": "compliment-reels"/);
});

test("compliment reels keeps file launch, staged privacy, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/compliment-reels/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, favicon] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("assets/favicon.svg", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css, favicon].join("\n");

  assert.match(html, /<script src="\.\/config\.js"><\/script>\s*<script src="\.\/logic\.js"><\/script>\s*<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|clipboard|share)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /crypto\.getRandomValues/);
  assert.match(app, /logic\.getPublicView\(state\)/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /不会发起网络\s*请求、写入本地存储/);
  assert.match(readme, /## 借鉴与来源声明/);
  assert.match(attribution, /56c9017e839583dcb8fcb5cc88b08b30ed63f66a/);
  assert.match(attribution, /20eebad51dde793070c373d594099a7ed8d96e22/);
  assert.match(attribution, /没有复制、\s*翻译、改写、链接或打包/);
});

test("catalog exposes the installed A-level snow globe message surprise", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "snow-globe-message");

  assert.equal(experience.title, "等雪停下");
  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /snow-globe-message\/index\.html$/);
  assert.match(portal, /"id": "snow-globe-message"/);
});

test("snow globe message keeps file launch, sensor exclusion, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/snow-globe-message/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<script src="config\.js"><\/script>\s*<script src="logic\.js"><\/script>\s*<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|DeviceMotionEvent|DeviceOrientationEvent|getUserMedia)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /getContext\("2d"\)/);
  assert.match(app, /no-canvas/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /不会把\s*内容写入浏览器存储，也不会上传/);
  assert.match(readme, /## 借鉴与来源声明/);
  assert.match(attribution, /627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59/);
  assert.match(attribution, /70d42d5484db7fd1646e48cc17caa5ff1c9d92cb/);
  assert.match(attribution, /NOASSERTION/);
});

test("catalog exposes the installed A-level candle wishes surprise", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "candle-wishes");

  assert.equal(experience.title, "今晚，点亮五支蜡烛");
  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /candle-wishes\/index\.html$/);
  assert.match(portal, /"id": "candle-wishes"/);
});

test("candle wishes keeps file launch, no-script privacy, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/candle-wishes/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, favicon] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("favicon.svg", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css, favicon].join("\n");

  assert.match(html, /<script src="config\.js"><\/script>\s*<script src="logic\.js"><\/script>\s*<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(html, /class="candle-stage" hidden/);
  assert.match(html, /class="primary-action" type="button" hidden/);
  assert.match(html, /<noscript>[\s\S]*请开启 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /页面不会上传或另存内容/);
  assert.match(readme, /## 借鉴与来源声明/);
  assert.match(attribution, /d51cd5c73c3171d6b769b5da1b9072beca691ce6/);
  assert.match(attribution, /3d364f985b2d96057f30d3fc67c5ee71ec37556f/);
  assert.match(attribution, /bf6ec8cae8c756203e059940d42089504ae43ec8/);
  assert.match(attribution, /零第三方运行依赖/);
});

test("catalog exposes the installed A-level shadow sword duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "shadow-sword-duel");

  assert.equal(experience.title, "影子剑术");
  assert.equal(experience.category, "versus");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "2 人对抗");
  assert.equal(experience.devices, "单设备轮流");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /shadow-sword-duel\/index\.html$/);
  assert.match(portal, /"id": "shadow-sword-duel"/);
});

test("shadow sword duel keeps file launch, hot-seat privacy, and attribution boundaries", async () => {
  const root = new URL("../../experiences/versus/shadow-sword-duel/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<link rel="icon" href="data:,">/);
  assert.match(html, /<script src="\.\/config\.js" defer><\/script>\s*<script src="\.\/logic\.js" defer><\/script>\s*<script src="\.\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /stage\.replaceChildren/);
  assert.match(app, /getScreenView/);
  assert.match(html, /<noscript>[\s\S]*需要浏览器启用 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /未揭晓动作只留在当前页面的 JavaScript 内存/);
  assert.match(readme, /## 借鉴与来源声明/);
  assert.match(attribution, /112b77704631fc2ce7ad8e4581f6ca09798ce15a/);
  assert.match(attribution, /65ca73beb62ef2afd980bb9f569b10dabfc60075/);
  assert.match(attribution, /ea1a97a763ac78fee5b35129e2841ef31531328e/);
  assert.match(attribution, /零第三方运行依赖/);
});

test("catalog exposes the installed A-level honeycomb passage", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "honeycomb-passage");

  assert.equal(experience.title, "蜜径相逢");
  assert.equal(experience.category, "versus");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "2 人对抗");
  assert.equal(experience.devices, "单设备轮流");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /honeycomb-passage\/index\.html$/);
  assert.match(portal, /"id": "honeycomb-passage"/);
});

test("honeycomb passage keeps file launch, handoff isolation, and attribution boundaries", async () => {
  const root = new URL("../../experiences/versus/honeycomb-passage/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, favicon] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("favicon.svg", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css, favicon].join("\n");

  assert.match(html, /<script src="\.\/config\.js"><\/script>\s*<script src="\.\/logic\.js"><\/script>\s*<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /handoff/);
  assert.match(html, /<noscript>[\s\S]*请开启 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /确认“交给下一位”不会增加行动/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /6353276ef8197fbdba60d0c964f7bd4f2169064c/);
  assert.match(attribution, /c96b802232d87d58408ed653dcbe43c0a68611f6/);
  assert.match(attribution, /零代码、零素材复制/);
});

test("catalog exposes the installed A-level four symbol film duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "four-symbol-film-duel");

  assert.equal(experience.title, "四符片名擂台");
  assert.equal(experience.category, "versus");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "2 人对抗");
  assert.equal(experience.devices, "单设备轮流");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /four-symbol-film-duel\/index\.html$/);
  assert.match(portal, /"id": "four-symbol-film-duel"/);
});

test("four symbol film duel keeps file launch, hot-seat privacy, and attribution boundaries", async () => {
  const root = new URL("../../experiences/versus/four-symbol-film-duel/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("style.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<script src="config\.js"><\/script>\s*<script src="logic\.js"><\/script>\s*<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /getPublicView/);
  assert.match(app, /replaceChildren/);
  assert.match(html, /<noscript>[\s\S]*需要启用 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /没有参考或复制第三方猜电影游戏/);
  assert.match(attribution, /没有参考、复制、修改、链接或打包任何第三方猜电影游戏、开源项目/);
  assert.match(attribution, /没有第三方运行时依赖、第三方代码或第三方资产/);
});

test("catalog exposes the installed A-level word detour duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "word-detour-duel");

  assert.equal(experience.title, "绕词对决");
  assert.equal(experience.category, "versus");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "2 人对抗");
  assert.equal(experience.devices, "单设备轮流");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /word-detour-duel\/index\.html$/);
  assert.match(portal, /"id": "word-detour-duel"/);
});

test("word detour duel keeps file launch, secret lifecycle, and attribution boundaries", async () => {
  const root = new URL("../../experiences/versus/word-detour-duel/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, favicon] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("assets/favicon.svg", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css, favicon].join("\n");

  assert.match(html, /<script src="\.\/config\.js" defer><\/script>\s*<script src="\.\/logic\.js" defer><\/script>\s*<script src="\.\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /logic\.getView\(state\)/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /visibilitychange/);
  assert.match(html, /<noscript>[\s\S]*需要浏览器启用 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /零第三方代码复制、零第三方资产复制/);
  assert.match(attribution, /没有复制或改写商业品牌、规则文字、示例、题卡/);
  assert.match(attribution, /没有第三方开源代码、素材或运行依赖/);
});

test("catalog exposes the installed A-level ricochet tank duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "ricochet-tank-duel");

  assert.equal(experience.title, "这一弹，拐弯见你");
  assert.equal(experience.category, "versus");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "2 人对抗");
  assert.equal(experience.devices, "单设备同屏");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /ricochet-tank-duel\/index\.html$/);
  assert.match(portal, /"id": "ricochet-tank-duel"/);
});

test("ricochet tank duel keeps file launch, dual input, and attribution boundaries", async () => {
  const root = new URL("../../experiences/versus/ricochet-tank-duel/", import.meta.url);
  const [html, config, constants, input, app, css, readme, attribution, favicon] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("js/constants.js", root), "utf8"),
    readFile(new URL("js/input.js", root), "utf8"),
    readFile(new URL("js/app.js", root), "utf8"),
    readFile(new URL("style.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("favicon.svg", root), "utf8"),
  ]);
  const runtimeSource = [html, config, constants, input, app, css, favicon].join("\n");

  assert.match(html, /<script defer src="config\.js"><\/script>[\s\S]*<script defer src="js\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(input, /pointerId/);
  assert.match(input, /visibilitychange/);
  assert.match(html, /<noscript>[\s\S]*需要启用 JavaScript[\s\S]*不会联网，也不会保存你的数据/);
  assert.match(html, /<noscript>[\s\S]*\.duel-app\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /运行时第三方依赖：\*\*0\*\*/);
  assert.match(attribution, /外部开源游戏直接借鉴：\*\*0 个\*\*/);
  assert.match(attribution, /第三方代码、伪代码、地图、数值、测试、图片、字体、图标、音频、品牌或 UI/);
});

test("catalog exposes the installed A-level shadow duet", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "shadow-duet");

  assert.equal(experience.title, "把影子，跳成我们");
  assert.equal(experience.category, "co-op");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "2 人合作");
  assert.equal(experience.devices, "单设备同屏");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /shadow-duet\/index\.html$/);
  assert.match(portal, /"id": "shadow-duet"/);
});

test("shadow duet keeps file launch, dual-seat input, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/shadow-duet/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<link rel="icon" href="data:,"/);
  assert.match(html, /<script src="\.\/logic\.js" defer><\/script>\s*<script src="\.\/config\.js" defer><\/script>\s*<script src="\.\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(html, /data-seat="left"/);
  assert.match(html, /data-seat="right"/);
  assert.match(html, /<noscript>[\s\S]*请开启 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /5688164b1904c0cc129b832c91160704b96b3cf3/);
  assert.match(attribution, /b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d/);
  assert.match(attribution, /1d90a20c62433ba68dff78466e06ee372a5a5232/);
  assert.match(attribution, /0ad5a71bcdff3d756dc5b07f93765aaeb4152538/);
  assert.match(attribution, /没有复制、翻译、改写、链接或打包/);
});

test("catalog exposes the installed A-level capsule docking", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "capsule-docking");

  assert.equal(experience.title, "转一点，推一点，刚好回家");
  assert.equal(experience.category, "co-op");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "2 人合作");
  assert.equal(experience.devices, "单设备同屏");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /capsule-docking\/index\.html$/);
  assert.match(portal, /"id": "capsule-docking"/);
});

test("capsule docking keeps file launch, fixed-step input, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/capsule-docking/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("style.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<script src="\.\/logic\.js" defer><\/script>\s*<script src="\.\/config\.js" defer><\/script>\s*<script src="\.\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /inputEpoch/);
  assert.match(app, /rafGeneration/);
  assert.match(html, /<noscript>[\s\S]*请开启本地 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /20b453de30ef725a538e235fcdec909f30c95783/);
  assert.match(attribution, /2beb2750f42d29014e289cb803b7269d5b0edaad/);
  assert.match(attribution, /20e612681d1f9eabc9ea34dc98c4d27f985ffec6/);
  assert.match(attribution, /41be1e462bc600064e498cba370bfa8c5c055a22/);
  assert.match(attribution, /未复制/);
});

test("catalog exposes the installed A-level twin orbit", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "twin-orbit");

  assert.equal(experience.title, "这一圈，和你同时到");
  assert.equal(experience.category, "co-op");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "2 人合作");
  assert.equal(experience.devices, "单设备同屏");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /twin-orbit\/index\.html$/);
  assert.match(portal, /"id": "twin-orbit"/);
});

test("twin orbit keeps file launch, fixed-step dual input, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/twin-orbit/", import.meta.url);
  const [html, config, logic, fixtures, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("fixtures.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, fixtures, app, css].join("\n");

  assert.match(html, /<script src="\.\/config\.js"><\/script>\s*<script src="\.\/logic\.js"><\/script>\s*<script src="\.\/fixtures\.js"><\/script>\s*<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /inputEpoch/);
  assert.match(html, /data-player="left"/);
  assert.match(html, /data-player="right"/);
  assert.match(html, /<noscript>[\s\S]*请启用 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /外部开源项目直接借鉴为 0/);
  assert.match(attribution, /orbit-star-race/);
  assert.match(attribution, /没有复制、修改、翻译、链接或打包/);
});

test("catalog exposes the installed A-level vinyl secret", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "vinyl-secret");

  assert.equal(experience.title, "把秘密藏进这一圈");
  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /vinyl-secret\/index\.html$/);
  assert.match(portal, /"id": "vinyl-secret"/);
});

test("catalog exposes the installed A-level kaleidoscope names", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const experience = catalog.experiences.find((item) => item.id === "kaleidoscope-names");

  assert.equal(experience.title, "把名字折成同一束光");
  assert.equal(experience.category, "surprise");
  assert.equal(experience.level, "A");
  assert.equal(experience.players, "1 人准备，1 人体验");
  assert.equal(experience.devices, "单设备");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.match(experience.entry, /kaleidoscope-names\/index\.html$/);
  assert.match(portal, /"id": "kaleidoscope-names"/);
});

test("kaleidoscope names keeps file launch, staged secrets, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/kaleidoscope-names/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<script src="\.\/config\.js"><\/script>\s*<script src="\.\/logic\.js"><\/script>\s*<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /getPublicView/);
  assert.match(html, /<noscript>[\s\S]*需要启用 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /没有参考或复制第三方万花筒实现/);
  assert.match(attribution, /没有\s*参考、复制、修改、链接或打包任何第三方万花筒项目/);
  assert.match(attribution, /不包含第三方运行时依赖、第三方代码或第三方资产/);
});

test("vinyl secret keeps file launch, staged secrets, optional audio, and attribution boundaries", async () => {
  const root = new URL("../../experiences/surprises/vinyl-secret/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.match(html, /<script src="\.\/config\.js" defer><\/script>\s*<script src="\.\/logic\.js" defer><\/script>\s*<script src="\.\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']|(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|getUserMedia|AudioContext)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(/);
  assert.match(app, /replaceChildren/);
  assert.match(html, /<audio[^>]*preload="none"/);
  assert.match(html, /<noscript>[\s\S]*需要浏览器启用 JavaScript/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /默认无音频/);
  assert.match(attribution, /没有查看、选择、下载、vendoring 或复制任何第三方开源项目实现/);
  assert.match(attribution, /Library of Congress/);
  assert.match(attribution, /U\.S\. Copyright Office/);
});

test("catalog exposes the installed C-level sealed compatibility quiz", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const quiz = catalog.experiences.find((item) => item.id === "compatibility-quiz");

  assert.equal(quiz.category, "co-op");
  assert.equal(quiz.level, "C");
  assert.equal(quiz.networkRequired, false);
  assert.match(quiz.entry, /compatibility-quiz\/index\.html$/);
});

test("catalog exposes the installed A-level ribbon tug", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const ribbonTug = catalog.experiences.find((item) => item.id === "ribbon-tug");

  assert.equal(ribbonTug.category, "versus");
  assert.equal(ribbonTug.level, "A");
  assert.equal(ribbonTug.networkRequired, false);
  assert.match(ribbonTug.entry, /ribbon-tug\/index\.html$/);
});

test("catalog exposes the installed A-level twin light maze", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const maze = catalog.experiences.find((item) => item.id === "twin-light-maze");

  assert.equal(maze.category, "co-op");
  assert.equal(maze.level, "A");
  assert.equal(maze.networkRequired, false);
  assert.match(maze.entry, /twin-light-maze\/index\.html$/);
});

test("twin light maze keeps its file protocol and privacy boundary", async () => {
  const root = new URL("../../experiences/co-op/twin-light-maze/", import.meta.url);
  const [html, levels, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("levels.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, levels, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker)\b/);
});

test("catalog exposes the installed A-level tethered heart", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const tetheredHeart = catalog.experiences.find((item) => item.id === "tethered-heart");

  assert.equal(tetheredHeart.category, "co-op");
  assert.equal(tetheredHeart.level, "A");
  assert.equal(tetheredHeart.networkRequired, false);
  assert.match(tetheredHeart.entry, /tethered-heart\/index\.html$/);
});

test("tethered heart keeps its file protocol and privacy boundary", async () => {
  const root = new URL("../../experiences/co-op/tethered-heart/", import.meta.url);
  const [html, levels, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("levels.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, levels, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker)\b/);
});

test("catalog exposes the installed A-level lighthouse passage", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const passage = catalog.experiences.find((item) => item.id === "lighthouse-passage");

  assert.equal(passage.category, "co-op");
  assert.equal(passage.level, "A");
  assert.equal(passage.networkRequired, false);
  assert.match(passage.entry, /lighthouse-passage\/index\.html$/);
});

test("catalog exposes I Heard You as a local D-level capability experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const experience = catalog.experiences.find((item) => item.id === "i-heard-you");

  assert.equal(experience.category, "co-op");
  assert.equal(experience.level, "D");
  assert.equal(experience.installed, true);
  assert.equal(experience.networkRequired, false);
  assert.deepEqual(experience.capabilities, ["speech-whisper-base@1"]);
  assert.match(experience.entry, /i-heard-you\/index\.html$/);
});

test("catalog exposes the installed A-level closer cards ritual", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const closerCards = catalog.experiences.find((item) => item.id === "closer-cards");

  assert.equal(closerCards.category, "co-op");
  assert.equal(closerCards.level, "A");
  assert.equal(closerCards.installed, true);
  assert.equal(closerCards.networkRequired, false);
  assert.match(closerCards.entry, /closer-cards\/index\.html$/);
});

test("closer cards keeps its file protocol, spoken-answer, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/closer-cards/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|FileReader|getUserMedia|MediaRecorder|DeviceMotionEvent)\b/);
  assert.doesNotMatch(html, /<(?:input|textarea)\b/i);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(css, /gradient\s*\(/i);
  assert.match(css, /assets\/midnight-paper\.png/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.doesNotMatch(`${html}\n${app}`, /最近哪一件很小的事|和我相处时|下一个空闲的半天/);
  assert.match(app, /logic\.sanitizeConfig\(rawConfig\)/);
  assert.match(app, /primaryLockedUntil/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /^# 借鉴与来源声明$/m);
});

test("catalog exposes the installed A-level shared color studio", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const studio = catalog.experiences.find((item) => item.id === "shared-color-studio");

  assert.equal(studio.category, "co-op");
  assert.equal(studio.level, "A");
  assert.equal(studio.players, "2 人合作");
  assert.equal(studio.devices, "单设备同屏");
  assert.equal(studio.installed, true);
  assert.equal(studio.networkRequired, false);
  assert.match(studio.entry, /shared-color-studio\/index\.html$/);
});

test("shared color studio keeps its file protocol, deterministic rules, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/shared-color-studio/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /classifyControlCode/);
  assert.match(app, /getColorTokens/);
  assert.match(css, /assets\/pigment-table\.webp/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /9f7b45e530489bf2459f68356b79b357ee49e54c/);
  assert.match(attribution, /ad9bcebc86a8fe6388686858601a04f4a88b08ed/);
  assert.match(attribution, /c677d8cd2123bc1e24099bb81468934d5a05172f/);
  assert.match(attribution, /未复制规范示例代码/);
  assert.match(portal, /"id": "shared-color-studio"/);
});

test("catalog exposes the installed A-level signal repair manual", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const signalRepair = catalog.experiences.find((item) => item.id === "signal-repair-manual");

  assert.equal(signalRepair.category, "co-op");
  assert.equal(signalRepair.level, "A");
  assert.equal(signalRepair.players, "2 人合作");
  assert.equal(signalRepair.devices, "单设备面对面");
  assert.equal(signalRepair.installed, true);
  assert.equal(signalRepair.networkRequired, false);
  assert.match(signalRepair.entry, /signal-repair-manual\/index\.html$/);
});

test("signal repair keeps its file protocol, rule source, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/signal-repair-manual/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(logic, /createUnbiasedRandomIndex/);
  assert.match(css, /assets\/signal-dust\.webp/);
  assert.match(css, /rotate\(180deg\)/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /542c57a778bbf843eb2cb121e99d0b050d8c866e/);
  assert.match(attribution, /e379d86e12d1d6409c228b84ca9a74deffa15c99/);
  assert.match(attribution, /OpenAI ImageGen/);
  assert.match(attribution, /完整零复制声明/);
  assert.match(portal, /"id": "signal-repair-manual"/);
});

test("catalog exposes the installed A-level four hands harmony", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const harmony = catalog.experiences.find((item) => item.id === "four-hands-harmony");

  assert.equal(harmony.category, "co-op");
  assert.equal(harmony.level, "A");
  assert.equal(harmony.players, "2 人合作");
  assert.equal(harmony.devices, "单设备同屏");
  assert.equal(harmony.installed, true);
  assert.equal(harmony.networkRequired, false);
  assert.match(harmony.entry, /four-hands-harmony\/index\.html$/);
});

test("four hands harmony keeps its file protocol, input, audio, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/four-hands-harmony/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");
  const networkSource = runtimeSource.replaceAll("http://www.w3.org/2000/svg", "");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(networkSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.match(html, /\.\.\/\.\.\/shared\/audio\/tone-player\.js/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /pointercancel/);
  assert.match(app, /lostpointercapture/);
  assert.match(app, /classifyHarmonyKey/);
  assert.match(app, /previousView\.phase === "measure-complete" && view\.phase === "playing"/);
  assert.match(app, /setAttribute\("aria-disabled", String\(!view\.canPress\)\)/);
  assert.doesNotMatch(app, /button\.disabled = !view\.canPress/);
  assert.match(app, /const player = tonePlayer;\s*const generation = audioGeneration;/);
  assert.match(app, /generation !== audioGeneration \|\| player !== tonePlayer/);
  assert.match(app, /if \(audioPreparing\) return;/);
  assert.match(app, /createElementNS\("http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(css, /assets\/harmony-table\.webp/);
  assert.match(css, /touch-action:\s*none/);
  assert.doesNotMatch(css, /(?:back-link, \.sound-toggle|pause-action)[^{]*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /589edde7f895ee0cd2b8068133c74e7c4d521046/);
  assert.match(readme, /733def1c41939a7bb2ec4dc1be3603e3ae70af51/);
  assert.match(readme, /8b40faa043f1e7734e7f560c0c181160c85f979e/);
  assert.match(readme, /2cb08afe19bc6583e281773d283033bde60e7d51/);
  assert.match(readme, /Copyright © 2014–2025 Yotam Mann/);
  assert.match(readme, /Copyright © 2020 Yu Xuan Shao/);
  assert.match(readme, /Copyright © 2022 Drahoslav Bednář/);
  assert.match(readme, /OpenAI 内置 ImageGen/);
  assert.match(readme, /第三方输入：无/);
  assert.match(readme, /Center 70% empty/);
  assert.match(readme, /零音频文件、零采样、零远程请求/);
  assert.match(attribution, /589edde7f895ee0cd2b8068133c74e7c4d521046/);
  assert.match(attribution, /733def1c41939a7bb2ec4dc1be3603e3ae70af51/);
  assert.match(attribution, /8b40faa043f1e7734e7f560c0c181160c85f979e/);
  assert.match(attribution, /2cb08afe19bc6583e281773d283033bde60e7d51/);
  assert.match(attribution, /OpenAI ImageGen/);
  assert.match(attribution, /零复制/);
  assert.match(portal, /"id": "four-hands-harmony"/);
});

test("catalog exposes the installed A-level same pace star", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const samePace = catalog.experiences.find((item) => item.id === "same-pace-star");

  assert.equal(samePace.category, "co-op");
  assert.equal(samePace.level, "A");
  assert.equal(samePace.players, "2 人合作");
  assert.equal(samePace.devices, "单设备同屏");
  assert.equal(samePace.installed, true);
  assert.equal(samePace.networkRequired, false);
  assert.match(samePace.entry, /same-pace-star\/index\.html$/);
});

test("same pace star keeps its file protocol, four-edge input, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/same-pace-star/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");
  const networkSource = runtimeSource.replaceAll("http://www.w3.org/2000/svg", "");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(networkSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /pointercancel/);
  assert.match(app, /lostpointercapture/);
  assert.match(app, /classifySamePaceKey/);
  assert.match(app, /rawConfig\.composeSamePaceMessage/);
  assert.match(css, /assets\/quiet-sky\.webp/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /6ae2b07cead1c953ccbdcabba7a245dc6294950f/);
  assert.match(readme, /debd32208441f7ba68d34badf0aa5ab73cb66cf3/);
  assert.match(readme, /740527679c95a6b77b8d9157c8945a060d2dcdb2/);
  assert.match(readme, /f4ba61f5ea964405532fe97c4ea9a6313f150444/);
  assert.match(readme, /9377fd656f519b60524b92f09bcc9e6d937b2017/);
  assert.match(readme, /238e8273305bb2e3c76f9f0bb289fb127c3dff74/);
  assert.match(readme, /07123b871c103268375880980fd715b2b26b2ff0/);
  assert.match(readme, /OpenAI 内置 ImageGen/);
  assert.match(readme, /第三方输入：无/);
  assert.match(attribution, /完整零复制与原创声明/);
  assert.match(portal, /"id": "same-pace-star"/);
});

test("catalog exposes the installed A-level steady together experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const steady = catalog.experiences.find((item) => item.id === "steady-together");

  assert.equal(steady.category, "co-op");
  assert.equal(steady.level, "A");
  assert.equal(steady.players, "2 人合作");
  assert.equal(steady.devices, "单设备同屏");
  assert.equal(steady.installed, true);
  assert.equal(steady.networkRequired, false);
  assert.match(steady.entry, /steady-together\/index\.html$/);
});

test("steady together keeps its file protocol, exact input lifecycle, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/steady-together/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");
  const networkSource = runtimeSource.replaceAll("http://www.w3.org/2000/svg", "");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(networkSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /pointercancel/);
  assert.match(app, /lostpointercapture/);
  assert.match(app, /classifySteadyKey/);
  assert.match(app, /gap > logic\.MAX_FRAME_GAP_MS/);
  assert.match(css, /assets\/balance-journey\.webp/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /70790b1c0cc57aabddd93f58ad456e473db44d2e/);
  assert.match(readme, /8cc21a213394f0e701ca0643af3fef32562f5d91/);
  assert.match(readme, /238e8273305bb2e3c76f9f0bb289fb127c3dff74/);
  assert.match(readme, /OpenAI 内置 ImageGen/);
  assert.match(readme, /第三方图像输入：无/);
  assert.match(attribution, /完整零复制与原创声明/);
  assert.match(portal, /"id": "steady-together"/);
});

test("catalog exposes the installed A-level moving home together experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const movingHome = catalog.experiences.find((item) => item.id === "moving-home-together");

  assert.equal(movingHome.category, "co-op");
  assert.equal(movingHome.level, "A");
  assert.equal(movingHome.players, "2 人合作");
  assert.equal(movingHome.devices, "单设备同屏");
  assert.equal(movingHome.installed, true);
  assert.equal(movingHome.networkRequired, false);
  assert.match(movingHome.entry, /moving-home-together\/index\.html$/);
});

test("moving home together keeps its file protocol, kinematic, input, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/moving-home-together/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution, portal] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");
  const networkSource = runtimeSource.replaceAll("http://www.w3.org/2000/svg", "");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(networkSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(logic, /Math\.(?:sin|cos)/);
  assert.match(logic, /const ANGLE_TABLE = deepFreeze\(\[/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /pointercancel/);
  assert.match(app, /lostpointercapture/);
  assert.match(app, /classifyMovingHomeKey/);
  assert.match(app, /const generations = \{ left: 0, right: 0 \}/);
  assert.match(app, /pointerId: event\.pointerId/);
  assert.match(app, /gap > logic\.MAX_FRAME_GAP_MS/);
  assert.match(css, /assets\/moving-day-paper\.jpg/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /min-width:\s*120px/);
  assert.match(css, /min-height:\s*120px/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(readme, /20e612681d1f9eabc9ea34dc98c4d27f985ffec6/);
  assert.match(readme, /8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3/);
  assert.match(readme, /058bf6d982a0fb89b54050f929f6ea9dae53b714/);
  assert.match(readme, /d83c483f912362fd6e57c74b0634ea3f1f3e0c82/);
  assert.match(readme, /4d140761ba1af8f4448bc6bd4785b63fc8928c5c/);
  assert.match(readme, /542c57a778bbf843eb2cb121e99d0b050d8c866e/);
  assert.match(readme, /238e8273305bb2e3c76f9f0bb289fb127c3dff74/);
  assert.match(readme, /b201684d1de0af90bc403814bbdee6aa96647130/);
  assert.match(readme, /56674fb3ac40279141a202e5d19b84f30d99854d/);
  assert.match(readme, /07123b871c103268375880980fd715b2b26b2ff0/);
  assert.match(readme, /c7573530343759ace8e46438a1fa2c44515b5554/);
  assert.match(readme, /OpenAI 内置 ImageGen/);
  assert.match(readme, /第三方图片、商业游戏截图或开源项目资产输入：无/);
  assert.match(attribution, /完整原创与零复制声明/);
  assert.match(portal, /"id": "moving-home-together"/);
});

test("catalog exposes the installed A-level moon base power experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const moonPower = catalog.experiences.find((item) => item.id === "moon-base-power");

  assert.equal(moonPower.category, "co-op");
  assert.equal(moonPower.level, "A");
  assert.equal(moonPower.players, "2 人合作");
  assert.equal(moonPower.devices, "单设备同屏");
  assert.equal(moonPower.installed, true);
  assert.equal(moonPower.networkRequired, false);
  assert.match(moonPower.entry, /moon-base-power\/index\.html$/);
});

test("moon base power keeps its file protocol, deterministic, and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/moon-base-power/", import.meta.url);
  const [html, config, levels, logic, app, css, readme, attribution, portal, backlog, runtimeAsset, sourceAsset] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("levels.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
    readFile(new URL("../../docs/40-idea-backlog.md", import.meta.url), "utf8"),
    readFile(new URL("assets/control-room-background.png", root)),
    readFile(new URL("../../docs/assets/moon-base-power/control-room-background-source.png", import.meta.url)),
  ]);
  const runtimeSource = [html, config, levels, logic, app].join("\n");

  assert.match(html, /<script src="config\.js"><\/script>[\s\S]*<script src="levels\.js"><\/script>[\s\S]*<script src="logic\.js"><\/script>[\s\S]*<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /classifyPowerKey/);
  assert.match(app, /consumeFrame/);
  assert.match(app, /replaceChildren/);
  assert.match(css, /assets\/control-room-background\.png/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /72c4cfa37c48a60aebcd537061163ccb3eabc806/);
  assert.match(attribution, /a1736886d18c14f6e19520813d2b3e432179e3b9/);
  assert.match(attribution, /94d188c1233331e1136894e1d5e867684e91197c/);
  assert.match(attribution, /8d618116d7491c9a289bbbf886c340a197f38303/);
  assert.match(attribution, /OpenAI 内置 ImageGen/);
  assert.match(attribution, /零复制/);
  assert.deepEqual(runtimeAsset, sourceAsset);
  assert.match(portal, /"id": "moon-base-power"/);
  assert.match(backlog, /已有 50 项[\s\S]*单人惊喜 18 项[\s\S]*双人合作 18 项[\s\S]*双人对抗 14 项[\s\S]*其余 10 项/);
  assert.match(backlog, /\[月球基地配电（已实现为“月面，保持有光”）\]\(\.\.\/experiences\/co-op\/moon-base-power\/\)/);
});

test("catalog exposes the installed A-level fog navigation experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const fogNavigation = catalog.experiences.find((item) => item.id === "fog-navigation");

  assert.equal(fogNavigation.title, "雾里，跟着你走");
  assert.equal(fogNavigation.category, "co-op");
  assert.equal(fogNavigation.level, "A");
  assert.equal(fogNavigation.players, "2 人合作");
  assert.equal(fogNavigation.devices, "单设备轮流");
  assert.equal(fogNavigation.installed, true);
  assert.equal(fogNavigation.networkRequired, false);
  assert.match(fogNavigation.entry, /fog-navigation\/index\.html$/);
});

test("fog navigation keeps its file protocol, private view, asset and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/fog-navigation/", import.meta.url);
  const [html, config, levels, logic, app, css, readme, attribution, portal, backlog, coOpIndex, runtimeAsset, sourceAsset] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("levels.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
    readFile(new URL("../../docs/40-idea-backlog.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", root), "utf8"),
    readFile(new URL("assets/fog-table-background.png", root)),
    readFile(new URL("../../docs/assets/fog-navigation/fog-table-background-source.png", import.meta.url)),
  ]);
  const runtimeSource = [html, config, levels, logic, app].join("\n");

  assert.match(html, /<script src="config\.js"><\/script>[\s\S]*<script src="levels\.js"><\/script>[\s\S]*<script src="logic\.js"><\/script>[\s\S]*<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(app, /FOG_NAVIGATION_LEVELS/);
  assert.match(app, /getPublicView/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /window\.addEventListener\("blur"/);
  assert.match(app, /classifyDirectionKey/);
  assert.match(css, /assets\/fog-table-background\.png/);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /55f487ca0384c9a10d19a705504c83def21654a1/);
  assert.match(attribution, /46782e248c2db9d379a5e4f13bb8323f18dff04b/);
  assert.match(attribution, /542c57a778bbf843eb2cb121e99d0b050d8c866e/);
  assert.match(attribution, /10daea21682eb3a868a03043452c8254178b8504/);
  assert.match(attribution, /1e2c17c332307b0f112895114b9dadc0db2b948f/);
  assert.match(attribution, /OpenAI ImageGen 资产/);
  assert.match(attribution, /零复制声明/);
  assert.deepEqual(runtimeAsset, sourceAsset);
  assert.match(portal, /"id": "fog-navigation"/);
  assert.match(coOpIndex, /\.\/fog-navigation\//);
  assert.match(backlog, /已有 50 项[\s\S]*单人惊喜 18 项[\s\S]*双人合作 18 项[\s\S]*双人对抗 14 项[\s\S]*其余 10 项/);
  assert.match(backlog, /\[迷雾领航（已实现为“雾里，跟着你走”）\]\(\.\.\/experiences\/co-op\/fog-navigation\/\)/);
});

test("catalog exposes the installed A-level cloud recipe experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const cloudRecipe = catalog.experiences.find((item) => item.id === "cloud-recipe");

  assert.equal(cloudRecipe.title, "这一场雨，我们一起接");
  assert.equal(cloudRecipe.category, "co-op");
  assert.equal(cloudRecipe.level, "A");
  assert.equal(cloudRecipe.players, "2 人合作");
  assert.equal(cloudRecipe.devices, "单设备同屏");
  assert.equal(cloudRecipe.installed, true);
  assert.equal(cloudRecipe.networkRequired, false);
  assert.match(cloudRecipe.entry, /cloud-recipe\/index\.html$/);
});

test("cloud recipe keeps its file protocol, rule, asset and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/cloud-recipe/", import.meta.url);
  const [
    html, config, logic, app, css, readme, attribution, portal, backlog, coOpIndex,
    runtimeBackground, sourceBackground, runtimeCloud, sourceCloud, runtimeBottles, sourceBottles,
  ] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
    readFile(new URL("../../docs/40-idea-backlog.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", root), "utf8"),
    readFile(new URL("assets/weather-kitchen-background.png", root)),
    readFile(new URL("../../docs/assets/cloud-recipe/weather-kitchen-background-source.png", import.meta.url)),
    readFile(new URL("assets/cloud-ribbon.png", root)),
    readFile(new URL("../../docs/assets/cloud-recipe/cloud-ribbon-source.png", import.meta.url)),
    readFile(new URL("assets/weather-ingredients.png", root)),
    readFile(new URL("../../docs/assets/cloud-recipe/weather-bottles-source.png", import.meta.url)),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.match(html, /<script src="config\.js"><\/script>[\s\S]*<script src="logic\.js"><\/script>[\s\S]*<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /getPublicView/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /classifyBoundaryKey/);
  assert.match(app, /\.boundary-button:not\(:disabled\)/);
  assert.match(css, /assets\/weather-kitchen-background\.png/);
  assert.match(css, /assets\/cloud-ribbon\.png/);
  assert.match(css, /@media \(max-width: 340px\)/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /65e8fa086d40233295615a2bf1d8aa255dc0eb84/);
  assert.match(attribution, /67b56217bce938baafa2c133a221c4a715e13cd5/);
  assert.match(attribution, /0b5300749c310f52e793493d50f0e4734db888b2/);
  assert.match(attribution, /OpenAI 内置 ImageGen/);
  assert.match(attribution, /零复制声明/);
  assert.deepEqual(runtimeBackground, sourceBackground);
  assert.deepEqual(runtimeCloud, sourceCloud);
  assert.deepEqual(runtimeBottles, sourceBottles);
  assert.match(portal, /"id": "cloud-recipe"/);
  assert.match(coOpIndex, /\.\/cloud-recipe\//);
  assert.match(backlog, /已有 50 项[\s\S]*单人惊喜 18 项[\s\S]*双人合作 18 项[\s\S]*双人对抗 14 项[\s\S]*其余 10 项/);
  assert.match(backlog, /\[云朵配方（已实现为“这一场雨，我们一起接”）\]\(\.\.\/experiences\/co-op\/cloud-recipe\/\)/);
});

test("catalog exposes the installed A-level together zipper experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const zipper = catalog.experiences.find((item) => item.id === "together-zipper");

  assert.equal(zipper.title, "把两边，拉成我们");
  assert.equal(zipper.category, "co-op");
  assert.equal(zipper.level, "A");
  assert.equal(zipper.players, "2 人合作");
  assert.equal(zipper.devices, "单设备同屏");
  assert.equal(zipper.installed, true);
  assert.equal(zipper.networkRequired, false);
  assert.match(zipper.entry, /together-zipper\/index\.html$/);
});

test("together zipper keeps its file protocol, timing, asset and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/together-zipper/", import.meta.url);
  const [
    html, config, logic, app, css, readme, attribution, portal, backlog, coOpIndex,
    runtimeBackground, sourceBackground, runtimePull, sourcePull, runtimeKeepsake, sourceKeepsake,
  ] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
    readFile(new URL("../../docs/40-idea-backlog.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", root), "utf8"),
    readFile(new URL("assets/tailor-table-background.png", root)),
    readFile(new URL("../../docs/assets/together-zipper/tailor-table-background-source.png", import.meta.url)),
    readFile(new URL("assets/brass-zipper-pull.png", root)),
    readFile(new URL("../../docs/assets/together-zipper/brass-zipper-pull-source.png", import.meta.url)),
    readFile(new URL("assets/completed-keepsake.png", root)),
    readFile(new URL("../../docs/assets/together-zipper/completed-keepsake-source.png", import.meta.url)),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.match(html, /<script src="\.\/config\.js" defer><\/script>[\s\S]*<script src="\.\/logic\.js" defer><\/script>[\s\S]*<script src="\.\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /getPublicView/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /classifyPullKey/);
  assert.match(app, /current\.tooth\.total/);
  assert.match(css, /assets\/tailor-table-background\.png/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media \(max-width: 340px\)/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /4995fbf1573f0dbdfac00bfe99c18523b610f24d/);
  assert.match(attribution, /a449fcdf3b1060c35a7cfd0e897e31c0a0e36a48/);
  assert.match(attribution, /40feae4081352485ea014117b22e08a14f268ee9/);
  assert.match(attribution, /b4c0ba419a6ba33d5b2e35d1d977b656befcac25/);
  assert.match(attribution, /OpenAI ImageGen 原创生产资产/);
  assert.match(attribution, /零复制声明/);
  assert.deepEqual(runtimeBackground, sourceBackground);
  assert.deepEqual(runtimePull, sourcePull);
  assert.deepEqual(runtimeKeepsake, sourceKeepsake);
  assert.match(portal, /"id": "together-zipper"/);
  assert.match(coOpIndex, /\.\/together-zipper\//);
  assert.match(backlog, /已有 50 项[\s\S]*单人惊喜 18 项[\s\S]*双人合作 18 项[\s\S]*双人对抗 14 项[\s\S]*其余 10 项/);
  assert.match(backlog, /\[同心拉链（已实现为“把两边，拉成我们”）\]\(\.\.\/experiences\/co-op\/together-zipper\/\)/);
});

test("catalog exposes the installed A-level seven day garden experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const garden = catalog.experiences.find((item) => item.id === "seven-day-garden");

  assert.equal(garden.title, "把七天，养成一朵花");
  assert.equal(garden.category, "co-op");
  assert.equal(garden.level, "A");
  assert.equal(garden.players, "2 人合作");
  assert.equal(garden.devices, "单设备轮流");
  assert.equal(garden.installed, true);
  assert.equal(garden.networkRequired, false);
  assert.match(garden.entry, /seven-day-garden\/index\.html$/);
});

test("seven day garden keeps its file protocol, rule, asset and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/seven-day-garden/", import.meta.url);
  const [
    html, config, logic, app, css, readme, attribution, portal, backlog, coOpIndex,
    runtimeBackground, sourceBackground, runtimeKeepsake, sourceKeepsake,
  ] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
    readFile(new URL("../../docs/40-idea-backlog.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", root), "utf8"),
    readFile(new URL("assets/garden-table-background.png", root)),
    readFile(new URL("../../docs/assets/seven-day-garden/garden-table-background-source.png", import.meta.url)),
    readFile(new URL("assets/completion-keepsake.png", root)),
    readFile(new URL("../../docs/assets/seven-day-garden/completion-keepsake-source.png", import.meta.url)),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.match(html, /<script src="\.\/config\.js" defer><\/script>[\s\S]*<script src="\.\/logic\.js" defer><\/script>[\s\S]*<script src="\.\/app\.js" defer><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random|\bDate\b/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /getPublicView/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /classifyResourceKey/);
  assert.match(app, /hasCommandModifier/);
  assert.match(css, /assets\/garden-table-background\.png/);
  assert.match(app, /assets\/plant-states\.png/);
  assert.match(css, /assets\/completion-keepsake\.png/);
  assert.match(css, /@media \(max-width: 380px\)/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /382cfbce3a0618a3de25ae3197cbb9b4462dffaa9273672bb725d87c02eee0c7/);
  assert.match(attribution, /75409d8bb8d9b9f2a07409e6f228ce6fec324e6d913c77a215c4309f2a9c2316/);
  assert.match(attribution, /3a0f2aa921936bcb08cd95b1e7430c568bd457382b0d133004123484ca35b146/);
  assert.match(attribution, /OpenAI 内置 ImageGen/);
  assert.match(attribution, /零复制声明/);
  assert.deepEqual(runtimeBackground, sourceBackground);
  assert.deepEqual(runtimeKeepsake, sourceKeepsake);
  assert.match(portal, /"id": "seven-day-garden"/);
  assert.match(coOpIndex, /\.\/seven-day-garden\//);
  assert.match(backlog, /已有 50 项[\s\S]*单人惊喜 18 项[\s\S]*双人合作 18 项[\s\S]*双人对抗 14 项[\s\S]*其余 10 项/);
  assert.match(backlog, /\[七日小花园（已实现为“把七天，养成一朵花”）\]\(\.\.\/experiences\/co-op\/seven-day-garden\/\)/);
});

test("catalog exposes the installed A-level constellation relay experience", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const relay = catalog.experiences.find((item) => item.id === "constellation-relay");

  assert.equal(relay.title, "把星光，一笔一笔交给你");
  assert.equal(relay.category, "co-op");
  assert.equal(relay.level, "A");
  assert.equal(relay.players, "2 人合作");
  assert.equal(relay.devices, "单设备轮流");
  assert.equal(relay.installed, true);
  assert.equal(relay.networkRequired, false);
  assert.match(relay.entry, /constellation-relay\/index\.html$/);
});

test("constellation relay keeps its file protocol, graph, asset and attribution boundaries", async () => {
  const root = new URL("../../experiences/co-op/constellation-relay/", import.meta.url);
  const [
    html, config, logic, app, css, readme, attribution, portal, backlog, coOpIndex,
    runtimeBackground, sourceBackground, runtimeKeepsake, sourceKeepsake,
  ] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("style.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
    readFile(new URL("../../docs/40-idea-backlog.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", root), "utf8"),
    readFile(new URL("assets/observatory-console-background.png", root)),
    readFile(new URL("../../docs/assets/constellation-relay/observatory-console-background-source.png", import.meta.url)),
    readFile(new URL("assets/completion-keepsake.png", root)),
    readFile(new URL("../../docs/assets/constellation-relay/completion-keepsake-source.png", import.meta.url)),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.match(html, /<script src="\.\/logic\.js"><\/script>[\s\S]*<script src="\.\/config\.js"><\/script>[\s\S]*<script src="\.\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/(?!www\.w3\.org\/2000\/svg)|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|caches|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random|\bDate\b/);
  assert.doesNotMatch(runtimeSource, /shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /normalizeConfig/);
  assert.match(app, /getPublicView/);
  assert.match(app, /replaceChildren/);
  assert.doesNotMatch(app, /requestAnimationFrame/);
  assert.match(logic, /normalizeConfig/);
  assert.match(logic, /classifySegmentIntersection/);
  assert.match(logic, /countCompletions/);
  assert.match(css, /assets\/observatory-console-background\.png/);
  assert.match(css, /@media \(max-width: 340px\)/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(readme, /^## 借鉴与来源声明$/m);
  assert.match(attribution, /077022eef9197b4ea1aa6fed89775b6aa3cb16c1943f7f83859095953a95da63/);
  assert.match(attribution, /55802680a4ab40a33e2ce52e6dba730e8c89e5e43b2d8998d30a8a189ffbb64b/);
  assert.match(attribution, /OpenAI 内置 ImageGen/);
  assert.match(attribution, /零复制/);
  assert.deepEqual(runtimeBackground, sourceBackground);
  assert.deepEqual(runtimeKeepsake, sourceKeepsake);
  assert.match(portal, /"id": "constellation-relay"/);
  assert.match(coOpIndex, /\.\/constellation-relay\//);
  assert.match(backlog, /已有 50 项[\s\S]*单人惊喜 18 项[\s\S]*双人合作 18 项[\s\S]*双人对抗 14 项[\s\S]*其余 10 项/);
  assert.match(backlog, /\[星座接线员（已实现为“把星光，一笔一笔交给你”）\]\(\.\.\/experiences\/co-op\/constellation-relay\/\)/);
});

test("catalog exposes the installed A-level rhythm relay", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const relay = catalog.experiences.find((item) => item.id === "rhythm-relay");

  assert.equal(relay.category, "co-op");
  assert.equal(relay.level, "A");
  assert.equal(relay.installed, true);
  assert.equal(relay.networkRequired, false);
  assert.match(relay.entry, /rhythm-relay\/index\.html$/);
});

test("catalog exposes the installed A-level telegraph codebook", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const telegraph = catalog.experiences.find((item) => item.id === "telegraph-codebook");

  assert.equal(telegraph.category, "co-op");
  assert.equal(telegraph.level, "A");
  assert.equal(telegraph.installed, true);
  assert.equal(telegraph.networkRequired, false);
  assert.match(telegraph.entry, /telegraph-codebook\/index\.html$/);
});

test("catalog exposes the installed A-level balloon dare", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const dare = catalog.experiences.find((item) => item.id === "balloon-dare");

  assert.equal(dare.category, "versus");
  assert.equal(dare.level, "A");
  assert.equal(dare.installed, true);
  assert.equal(dare.networkRequired, false);
  assert.match(dare.entry, /balloon-dare\/index\.html$/);
});

test("balloon dare keeps its file protocol and privacy boundary", async () => {
  const root = new URL("../../experiences/versus/balloon-dare/", import.meta.url);
  const [html, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker)\b/);
  assert.doesNotMatch(html, /(?:burstPoint|data-burst|--burst)/);
});

test("rhythm relay keeps its file protocol and privacy boundary", async () => {
  const root = new URL("../../experiences/co-op/rhythm-relay/", import.meta.url);
  const [html, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker)\b/);
});

test("catalog exposes the installed A-level number target duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const target = catalog.experiences.find((item) => item.id === "number-target");

  assert.equal(target.category, "versus");
  assert.equal(target.level, "A");
  assert.equal(target.installed, true);
  assert.equal(target.networkRequired, false);
  assert.match(target.entry, /number-target\/index\.html$/);
});

test("number target keeps its file protocol and local-only boundary", async () => {
  const root = new URL("../../experiences/versus/number-target/", import.meta.url);
  const [html, logic, copy, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("copy.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, logic, copy, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
});

test("catalog exposes the installed A-level paper soccer duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const paperSoccer = catalog.experiences.find((item) => item.id === "paper-soccer");

  assert.equal(paperSoccer.category, "versus");
  assert.equal(paperSoccer.level, "A");
  assert.equal(paperSoccer.installed, true);
  assert.equal(paperSoccer.networkRequired, false);
  assert.match(paperSoccer.entry, /paper-soccer\/index\.html$/);
});

test("paper soccer keeps its file protocol and local graph boundary", async () => {
  const root = new URL("../../experiences/versus/paper-soccer/", import.meta.url);
  const [html, config, logic, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(css, /gradient\s*\(/i);
  assert.match(css, /assets\/tactics-desk\.png/);
});

test("catalog exposes the installed A-level echo arena duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const echoArena = catalog.experiences.find((item) => item.id === "echo-arena");

  assert.equal(echoArena.category, "versus");
  assert.equal(echoArena.level, "A");
  assert.equal(echoArena.installed, true);
  assert.equal(echoArena.networkRequired, false);
  assert.match(echoArena.entry, /echo-arena\/index\.html$/);
});

test("echo arena keeps its file protocol, audio, and local privacy boundary", async () => {
  const root = new URL("../../experiences/versus/echo-arena/", import.meta.url);
  const [html, config, logic, app, css, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.match(html, /\.\.\/\.\.\/\.\.\/shared\/audio\/tone-player\.js/);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(css, /gradient\s*\(/i);
  assert.match(css, /assets\/rehearsal-desk\.png/);
  assert.match(attribution, /零代码、零素材借用边界|零代码、零素材借用/);
});

test("catalog exposes the installed A-level dots and boxes duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const game = catalog.experiences.find((item) => item.id === "dots-and-boxes");

  assert.equal(game.category, "versus");
  assert.equal(game.level, "A");
  assert.equal(game.installed, true);
  assert.equal(game.networkRequired, false);
  assert.match(game.entry, /dots-and-boxes\/index\.html$/);
});

test("dots and boxes keeps its file protocol and canonical local board boundary", async () => {
  const root = new URL("../../experiences/versus/dots-and-boxes/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /(?:\.\.\/)+shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /logic\.getAllEdgeIds\(\)/);
  assert.match(css, /assets\/paper-texture\.png/);
  assert.doesNotMatch(html, /concept-(?:desktop|mobile)/);
  assert.match(readme, /## 借鉴与来源声明/);
  assert.match(attribution, /^# 借鉴与来源声明/m);
});

test("catalog exposes the installed A-level light trail hunt duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const game = catalog.experiences.find((item) => item.id === "light-trail-hunt");

  assert.equal(game.category, "versus");
  assert.equal(game.level, "A");
  assert.equal(game.devices, "单设备同屏");
  assert.equal(game.installed, true);
  assert.equal(game.networkRequired, false);
  assert.match(game.entry, /light-trail-hunt\/index\.html$/);
});

test("light trail hunt keeps its atomic file-protocol duel boundary", async () => {
  const root = new URL("../../experiences/versus/light-trail-hunt/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /(?:https?|wss?):\/\/|\b(?:data|blob):/i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /function queueTurn\(player, turn\)/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(logic, /same-destination/);
  assert.match(logic, /head-swap/);
  assert.match(css, /assets\/board-texture\.webp/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(readme, /## 借鉴与来源声明/);
  assert.match(attribution, /b19dc25bb78f9ac7299f83193774978089ff0cc2/);
  assert.match(attribution, /1d35ea0306766bbc5f4a52244ef820db431776fc/);
  assert.match(attribution, /7d4faa2cfa7152186924484d5bd191778babdff0/);
  assert.match(attribution, /68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05/);
  assert.match(attribution, /未复制|未使用/);
});

test("catalog exposes the installed A-level orbital star race duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const game = catalog.experiences.find((item) => item.id === "orbit-star-race");

  assert.equal(game.category, "versus");
  assert.equal(game.level, "A");
  assert.equal(game.devices, "单设备同屏");
  assert.equal(game.installed, true);
  assert.equal(game.networkRequired, false);
  assert.match(game.entry, /orbit-star-race\/index\.html$/);
});

test("orbital star race keeps its deterministic file-protocol boundary", async () => {
  const root = new URL("../../experiences/versus/orbit-star-race/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("assets/ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(runtimeSource, /(?:\.\.\/)+shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /crypto\.getRandomValues/);
  assert.match(app, /MAX_STEPS_PER_FRAME\s*=\s*12/);
  assert.match(app, /visibilitychange/);
  assert.match(logic, /FIXED_DT\s*=\s*1\s*\/\s*120/);
  assert.match(logic, /SHARED_EPSILON\s*=\s*1e-5/);
  assert.match(css, /assets\/star-chart\.png/);
  assert.match(css, /assets\/orbit-sprites\.png/);
  assert.match(css, /sprite-missing/);
  assert.match(css, /background-missing/);
  assert.doesNotMatch(html, /concept-(?:desktop|mobile)/);
  assert.match(config, /composeResult/);
  assert.match(readme, /## 借鉴与来源声明/);
  assert.match(attribution, /^# 借鉴与来源声明/m);
  assert.match(attribution, /81b92ff6df930644fae28cf5c14035dd055bc84e/);
  assert.match(attribution, /零代码、零素材/);
});

test("catalog exposes the installed A-level secret recipe code duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const game = catalog.experiences.find((item) => item.id === "secret-recipe-code");

  assert.equal(game.category, "versus");
  assert.equal(game.level, "A");
  assert.equal(game.devices, "单设备轮流");
  assert.equal(game.installed, true);
  assert.equal(game.networkRequired, false);
  assert.match(game.entry, /secret-recipe-code\/index\.html$/);
  assert.match(portal, /"id": "secret-recipe-code"/);
});

test("secret recipe code keeps its file protocol, hot-seat privacy, and attribution boundary", async () => {
  const root = new URL("../../experiences/versus/secret-recipe-code/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /(?:\.\.\/)+shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /visibilitychange/);
  assert.match(logic, /getRecipeView/);
  assert.match(css, /assets\/apothecary-table\.jpg/);
  assert.match(readme, /秘密只保存在当前页面的 JavaScript 内存/);
  assert.match(attribution, /688006ae2280b721e4a8289b710351dd3fd7e5ed/);
  assert.match(attribution, /a06fb28a3fa6072a089ca664c66a7bf08c0a3e99/);
  assert.match(attribution, /没有复制、改写、翻译、移植/);
});

test("catalog exposes the installed A-level memory bid duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const game = catalog.experiences.find((item) => item.id === "memory-bid");

  assert.equal(game.category, "versus");
  assert.equal(game.level, "A");
  assert.equal(game.devices, "单设备轮流");
  assert.equal(game.installed, true);
  assert.equal(game.networkRequired, false);
  assert.match(game.entry, /memory-bid\/index\.html$/);
  assert.match(portal, /"id": "memory-bid"/);
});

test("memory bid keeps its file protocol, private sequence, and attribution boundary", async () => {
  const root = new URL("../../experiences/versus/memory-bid/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /(?:\.\.\/)+shared\//);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /八件旧物已经收好，开始竞价/);
  assert.match(logic, /getMemoryBidView/);
  assert.match(logic, /generation/);
  assert.match(css, /assets\/auction-table\.jpg/);
  assert.match(css, /assets\/keepsake-atlas\.png/);
  assert.match(readme, /序列只存在当前页面的本机内存中/);
  assert.match(attribution, /c617a162eef46b5817b7e7ed59f50ae7aefe4fab/);
  assert.match(attribution, /326c7565d40f43917243c2c54ea6b826470e2472/);
  assert.match(attribution, /92b41bcc9b043362afcd5ed3f4196ca4d633abce/);
  assert.match(attribution, /d15bc7d93f3219db18e465afdd88cc99b04ed5d8/);
  assert.match(attribution, /零代码、零素材复制/);
});

test("catalog exposes the installed A-level garden resource duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const game = catalog.experiences.find((item) => item.id === "garden-resource-duel");

  assert.equal(game.category, "versus");
  assert.equal(game.level, "A");
  assert.equal(game.devices, "单设备轮流");
  assert.equal(game.installed, true);
  assert.equal(game.networkRequired, false);
  assert.match(game.entry, /garden-resource-duel\/index\.html$/);
  assert.match(portal, /"id": "garden-resource-duel"/);
});

test("garden resource duel keeps its file protocol, hot-seat privacy, and attribution boundary", async () => {
  const root = new URL("../../experiences/versus/garden-resource-duel/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /(?:\.\.\/)+shared\//);
  assert.doesNotMatch(runtimeSource, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /replaceChildren/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /pagehide/);
  assert.match(app, /addEventListener\("blur"/);
  assert.match(logic, /getPublicView/);
  assert.match(logic, /getPlayerView/);
  assert.match(readme, /双击 `index\.html`/);
  assert.match(readme, /第一位确认后不会提前扣减公开手牌/);
  assert.match(attribution, /aeccb2a889eade57dec7a8ba542e1bd4307a526e/);
  assert.match(attribution, /65ca73beb62ef2afd980bb9f569b10dabfc60075/);
  assert.match(attribution, /零代码、零素材复制/);
});

test("catalog exposes the installed A-level heart catapult duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const game = catalog.experiences.find((item) => item.id === "heart-catapult");

  assert.equal(game.category, "versus");
  assert.equal(game.level, "A");
  assert.equal(game.devices, "单设备轮流");
  assert.equal(game.installed, true);
  assert.equal(game.networkRequired, false);
  assert.match(game.entry, /heart-catapult\/index\.html$/);
  assert.match(portal, /"id": "heart-catapult"/);
});

test("heart catapult keeps its deterministic file-protocol and attribution boundaries", async () => {
  const root = new URL("../../experiences/versus/heart-catapult/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /(?:\.\.\/)+shared\//);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /pagehide/);
  assert.match(logic, /getPublicView/);
  assert.match(logic, /simulateShot/);
  assert.match(readme, /双击 `index\.html`/);
  assert.match(readme, /本轮比分只在\s*两颗都完成后一起更新/);
  assert.match(attribution, /c96b802232d87d58408ed653dcbe43c0a68611f6/);
  assert.match(attribution, /acb99b6f8784c809b940f1d2cf745427e088e088/);
  assert.match(attribution, /零代码、零素材复制/);
});

test("catalog exposes the installed A-level soft sumo duel", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const game = catalog.experiences.find((item) => item.id === "soft-sumo");

  assert.equal(game.category, "versus");
  assert.equal(game.level, "A");
  assert.equal(game.devices, "单设备同屏");
  assert.equal(game.installed, true);
  assert.equal(game.networkRequired, false);
  assert.match(game.entry, /soft-sumo\/index\.html$/);
  assert.match(portal, /"id": "soft-sumo"/);
});

test("soft sumo keeps its deterministic file-protocol and attribution boundaries", async () => {
  const root = new URL("../../experiences/versus/soft-sumo/", import.meta.url);
  const [html, config, logic, app, css, readme, attribution] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("config.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("ATTRIBUTION.md", root), "utf8"),
  ]);
  const runtimeSource = [html, config, logic, app, css].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|Worker|FileReader|getUserMedia|DeviceMotionEvent|AudioContext)\b/);
  assert.doesNotMatch(runtimeSource, /(?:\.\.\/)+shared\//);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /pointercancel/);
  assert.match(app, /lostpointercapture/);
  assert.match(app, /visibilitychange/);
  assert.match(logic, /cancel-charge/);
  assert.match(logic, /replayRound/);
  assert.match(logic, /replaySession/);
  assert.match(css, /assets\/arena-background\.webp/);
  assert.match(css, /assets\/token-atlas\.webp/);
  assert.match(readme, /双击 `index\.html`/);
  assert.match(attribution, /b10f099c613501bf11bf0d4c9e7ca238ac8e0e58/);
  assert.match(attribution, /8a67787735585f02c4b46eabf7b9fcc1c7c321da/);
  assert.match(attribution, /227b71b6974ea57ab7e96d40f6374287bd6a0e77/);
  assert.match(attribution, /没有复制或引入/);
});

test("catalog exposes the installed A-level kitchen relay", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const kitchen = catalog.experiences.find((item) => item.id === "kitchen-relay");

  assert.equal(kitchen.category, "co-op");
  assert.equal(kitchen.level, "A");
  assert.equal(kitchen.installed, true);
  assert.equal(kitchen.networkRequired, false);
  assert.match(kitchen.entry, /kitchen-relay\/index\.html$/);
});

test("kitchen relay keeps its file protocol and local-only boundary", async () => {
  const root = new URL("../../experiences/co-op/kitchen-relay/", import.meta.url);
  const [html, logic, copy, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("copy.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, logic, copy, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker|FileReader|getUserMedia|DeviceMotionEvent)\b/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.doesNotMatch(runtimeSource, /Math\.random/);
});

test("telegraph codebook keeps its file protocol and privacy boundary", async () => {
  const root = new URL("../../experiences/co-op/telegraph-codebook/", import.meta.url);
  const [html, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker)\b/);
  assert.doesNotMatch(html, /月亮|星星|云朵|热茶|电影|散步/);
});

test("lighthouse passage keeps its file protocol and privacy boundary", async () => {
  const root = new URL("../../experiences/co-op/lighthouse-passage/", import.meta.url);
  const [html, levels, logic, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("levels.js", root), "utf8"),
    readFile(new URL("logic.js", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const runtimeSource = [html, levels, logic, app].join("\n");

  assert.doesNotMatch(html, /type=["']module["']/i);
  assert.doesNotMatch(html, /(?:src|href)=["'](?:https?:)?\/\//i);
  assert.doesNotMatch(runtimeSource, /\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker)\b/);
});

test("catalog exposes the installed C-level heart sprint", async () => {
  const catalog = await loadCatalog(new URL("../../", import.meta.url));
  const heartSprint = catalog.experiences.find((item) => item.id === "heart-sprint");

  assert.equal(heartSprint.category, "versus");
  assert.equal(heartSprint.level, "C");
  assert.equal(heartSprint.networkRequired, false);
  assert.match(heartSprint.entry, /heart-sprint\/index\.html$/);
});

test("every installed catalog entry points to a local file", async () => {
  const root = new URL("../../", import.meta.url);
  const catalog = await loadCatalog(root);

  await Promise.all(
    catalog.experiences
      .filter((item) => item.installed)
      .map((item) => access(new URL(item.entry, root))),
  );
});

test("every installed non-A experience has exact shared-runtime launchers", async () => {
  const root = new URL("../../", import.meta.url);
  const catalog = await loadCatalog(root);
  const experiences = catalog.experiences.filter(
    (item) => item.installed === true && item.level !== "A",
  );

  assert.ok(experiences.length > 0);
  await Promise.all(experiences.map(async (experience) => {
    const directory = new URL("./", new URL(experience.entry, root));
    const commandUrl = new URL("start.command", directory);
    const batchUrl = new URL("start.bat", directory);
    const [command, batch, commandStat] = await Promise.all([
      readFile(commandUrl, "utf8"),
      readFile(batchUrl, "utf8"),
      stat(commandUrl),
    ]);

    assert.equal(command, renderMacLauncher(experience.id), `${experience.id} has a divergent macOS launcher`);
    assert.equal(batch, renderWindowsLauncher(experience.id), `${experience.id} has a divergent Windows launcher`);
    if (process.platform !== "win32") {
      assert.equal(commandStat.mode & 0o777, 0o755, `${experience.id} macOS launcher is not executable`);
    }
  }));
});
