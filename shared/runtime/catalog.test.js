import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { loadCatalog } from "./catalog.js";

test("portal gives every experience link a title-specific accessible name", async () => {
  const portal = await readFile(new URL("../../index.html", import.meta.url), "utf8");

  assert.match(portal, /link\.setAttribute\("aria-label", `打开《\$\{item\.title\}》`\)/);
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
