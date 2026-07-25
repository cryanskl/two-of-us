import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "../shared/runtime/catalog.js";

const rootDir = path.resolve(fileURLToPath(new URL("../", import.meta.url)));

const socketIo = {
  packageName: "socket.io",
  version: "4.8.1",
  sourceUrl: "https://github.com/socketio/socket.io/tree/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io",
  licenseUrl: "https://github.com/socketio/socket.io/blob/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io/LICENSE",
  copyright: "Copyright (c) 2014-present Guillermo Rauch and Socket.IO contributors",
};

const nodeQrcode = {
  packageName: "qrcode",
  version: "1.5.4",
  sourceUrl: "https://github.com/soldair/node-qrcode/tree/3848ed2c17de5bcdead487417dbf14c5dd017f8d",
  licenseUrl: "https://github.com/soldair/node-qrcode/blob/3848ed2c17de5bcdead487417dbf14c5dd017f8d/license",
  copyright: "Copyright (c) 2012 Ryan Day",
};

const pannellum = {
  packageName: "pannellum",
  version: "2.5.7",
  sourceUrl: "https://github.com/mpetroff/pannellum/tree/a5e2f25d960270b6cdd6136d2c18c21f745bba0e",
  licenseUrl: "https://github.com/mpetroff/pannellum/blob/a5e2f25d960270b6cdd6136d2c18c21f745bba0e/COPYING",
  copyright: "Copyright (c) 2011-2026 Matthew Petroff",
};

const sharedRuntime = {
  file: "shared/runtime/README.md",
  actualUse: "建立连接和房间",
  notCopied: "没有复制或改写其示例源码、文档、视觉或素材",
};

const socketIoConsumers = new Map([
  ["experiences/co-op/together-lock/index.html", {
    file: "experiences/co-op/together-lock/README.md",
    actualUse: "room:create",
    notCopied: "没有复制或改写 Socket.IO 示例源码、文档、视觉或素材",
  }],
  ["experiences/co-op/lan-pictionary/index.html", {
    file: "experiences/co-op/lan-pictionary/README.md",
    actualUse: "房间、广播和 socket 定向投递",
    notCopied: "没有复制或改写其示例源码、文档、视觉与素材",
  }],
  ["experiences/co-op/compatibility-quiz/index.html", {
    file: "experiences/co-op/compatibility-quiz/README.md",
    actualUse: "公开房间、acknowledgment 与定向 socket API",
    notCopied: "未复制或改写其示例代码、题目、视觉、素材或构建配置",
  }],
  ["experiences/versus/lan-connect-four/index.html", {
    file: "experiences/versus/lan-connect-four/README.md",
    actualUse: "公开房间 API",
    notCopied: "没有新增依赖副本",
  }],
  ["experiences/versus/sealed-rps/index.html", {
    file: "experiences/versus/sealed-rps/README.md",
    actualUse: "连接、房间、acknowledgment 与定向 socket 投递",
    notCopied: "没有复制或改写其示例源码、文档、视觉与素材",
  }],
  ["experiences/versus/heart-sprint/index.html", {
    file: "experiences/versus/heart-sprint/README.md",
    actualUse: "本地房间、可靠有序事件与 acknowledgment",
    notCopied: "不复制示例源码",
  }],
]);

const plannedSocketIoConsumer = {
  file: "experiences/co-op/our-place-guess/ATTRIBUTION.md",
  actualUse: "后续 UI 只调用仓库已有的房间、定向消息与密封提交协议",
  notCopied: "不复制或改写 Socket.IO 示例代码",
};

test("direct dependency versions stay aligned with the attribution records", async () => {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
  for (const dependency of [socketIo, nodeQrcode, pannellum]) {
    assert.equal(packageJson.dependencies[dependency.packageName], dependency.version);
  }
});

test("every installed Socket.IO consumer has a fixed and complete dependency record", async () => {
  const catalog = await loadCatalog(rootDir);
  const discovered = [];
  for (const item of catalog.experiences.filter(({ installed }) => installed === true)) {
    const html = await readFile(path.join(rootDir, item.entry), "utf8");
    if (html.includes("/socket.io/socket.io.js")) discovered.push(item.entry);
  }
  assert.deepEqual(discovered.sort(), [...socketIoConsumers.keys()].sort());

  await assertDependencyRecord(sharedRuntime, socketIo);
  for (const record of socketIoConsumers.values()) {
    await assertDependencyRecord(record, socketIo);
  }
  await assertDependencyRecord(plannedSocketIoConsumer, socketIo);
});

test("node-qrcode and Pannellum records stay fixed and match their real consumers", async () => {
  const serverSource = await readFile(path.join(rootDir, "shared/runtime/server.js"), "utf8");
  assert.match(serverSource, /from ["']qrcode["']/);
  await assertDependencyRecord({
    ...sharedRuntime,
    actualUse: "生成 Data URL",
  }, nodeQrcode);
  await assertDependencyRecord({
    ...sharedRuntime,
    actualUse: "暴露固定白名单资源",
  }, pannellum);

  const panoramaEntry = "experiences/surprises/panorama-memory/index.html";
  const panoramaHtml = await readFile(path.join(rootDir, panoramaEntry), "utf8");
  assert.match(panoramaHtml, /\/vendor\/pannellum\/2\.5\.7\/pannellum\.js/);
  assert.match(panoramaHtml, /\/vendor\/pannellum\/2\.5\.7\/pannellum\.css/);
  await assertDependencyRecord({
    file: "experiences/surprises/panorama-memory/README.md",
    actualUse: "build/pannellum.js",
    notCopied: "没有复制或改写其源码、示例配置、文档文案、视觉和素材",
  }, pannellum);
});

async function assertDependencyRecord(record, dependency) {
  const content = await readFile(path.join(rootDir, record.file), "utf8");
  const context = `${record.file} / ${dependency.packageName}`;
  assert.ok(content.includes(dependency.version), `${context} 缺版本`);
  assert.ok(content.includes(dependency.sourceUrl), `${context} 缺固定源码 URL`);
  assert.ok(content.includes(dependency.licenseUrl), `${context} 缺固定许可证 URL`);
  assert.ok(content.includes(dependency.copyright), `${context} 缺版权主体`);
  assert.ok(content.includes(record.actualUse), `${context} 缺实际使用边界`);
  assert.ok(content.includes(record.notCopied), `${context} 缺未复制边界`);
}
