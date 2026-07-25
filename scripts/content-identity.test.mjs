import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { computeContentIdentity } from "../shared/runtime/content-identity.js";

const identityPattern = /^sha256:[a-f0-9]{64}$/;

test("content identity is deterministic across different absolute roots", async (context) => {
  const firstRoot = await createFixture(context, "first");
  const secondRoot = await createFixture(context, "second");

  const first = await computeContentIdentity(firstRoot);
  const repeated = await computeContentIdentity(firstRoot);
  const second = await computeContentIdentity(secondRoot);

  assert.match(first, identityPattern);
  assert.equal(first, repeated);
  assert.equal(first, second);
  assert.doesNotMatch(first, new RegExp(escapeRegex(firstRoot)));
});

test("every runtime content layer changes the identity", async (context) => {
  const mutations = [
    ["package lock", "package-lock.json", "{\"lockfileVersion\":3,\"changed\":true}\n"],
    ["catalog", "experiences/catalog.json", `${JSON.stringify(
      fixtureCatalog({ installedTitle: "已修改作品" }),
    )}\n`],
    ["shared runtime", "shared/runtime/server.js", "export const marker = 'changed';\n"],
    ["installed experience", "experiences/surprises/installed-one/app.js", "window.changed = true;\n"],
    ["capability browser asset", "capabilities/example/browser/worker.js", "self.changed = true;\n"],
    ["vendor asset", "node_modules/pannellum/build/pannellum.js", "window.vendorChanged = true;\n"],
  ];

  for (const [label, relativePath, contents] of mutations) {
    const root = await createFixture(context, label.replaceAll(" ", "-"));
    const before = await computeContentIdentity(root);
    await writeFile(path.join(root, relativePath), contents);
    const after = await computeContentIdentity(root);
    assert.notEqual(after, before, label);
  }
});

test("files belonging only to an uninstalled experience do not change the identity", async (context) => {
  const root = await createFixture(context, "uninstalled");
  const before = await computeContentIdentity(root);
  await writeFile(
    path.join(root, "experiences", "co-op", "not-installed", "index.html"),
    "<!doctype html><title>changed but not installed</title>\n",
  );
  assert.equal(await computeContentIdentity(root), before);
});

test("selected symlinks and missing files fail closed without leaking the absolute root", async (context) => {
  const symlinkRoot = await createFixture(context, "symlink");
  const linkPath = path.join(
    symlinkRoot, "experiences", "surprises", "installed-one", "linked.txt",
  );
  await symlink("../outside.txt", linkPath);
  await assert.rejects(computeContentIdentity(symlinkRoot), (error) => {
    assert.match(error.message, /experiences\/surprises\/installed-one\/linked\.txt|符号链接/);
    assert.doesNotMatch(error.message, new RegExp(escapeRegex(symlinkRoot)));
    return true;
  });

  const missingRoot = await createFixture(context, "missing");
  await rm(path.join(missingRoot, "package-lock.json"));
  await assert.rejects(computeContentIdentity(missingRoot), (error) => {
    assert.match(error.message, /package-lock\.json|缺失|读取/);
    assert.doesNotMatch(error.message, new RegExp(escapeRegex(missingRoot)));
    return true;
  });
});

async function createFixture(context, label) {
  const root = await mkdtemp(path.join(os.tmpdir(), `two-of-us-identity-${label}-`));
  context.after(() => rm(root, { recursive: true, force: true }));
  const files = new Map([
    ["package.json", "{\"name\":\"fixture\",\"type\":\"module\"}\n"],
    ["package-lock.json", "{\"lockfileVersion\":3}\n"],
    ["index.html", "<!doctype html><title>fixture</title>\n"],
    ["experiences/catalog.json", `${JSON.stringify(fixtureCatalog())}\n`],
    ["experiences/surprises/installed-one/index.html", "<!doctype html><script src=\"app.js\"></script>\n"],
    ["experiences/surprises/installed-one/app.js", "window.fixture = true;\n"],
    ["experiences/surprises/installed-one/README.md", "# Installed\n"],
    ["experiences/co-op/not-installed/index.html", "<!doctype html><title>not installed</title>\n"],
    ["experiences/co-op/not-installed/README.md", "# Not installed\n"],
    ["shared/runtime/server.js", "export const marker = 'fixture';\n"],
    ["shared/theme.css", ":root { color: #123; }\n"],
    ["capabilities/example/manifest.json", "{\"schemaVersion\":1}\n"],
    ["capabilities/example/browser/worker.js", "self.fixture = true;\n"],
    ["scripts/capabilities-lib.mjs", "export const fixture = true;\n"],
    ["node_modules/pannellum/build/pannellum.css", ".pnlm-container{}\n"],
    ["node_modules/pannellum/build/pannellum.js", "window.pannellum = {};\n"],
  ]);
  for (const [relativePath, contents] of files) {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents);
  }
  return root;
}

function fixtureCatalog({ installedTitle = "已安装作品" } = {}) {
  return {
    schemaVersion: 1,
    experiences: [
      {
        id: "installed-one",
        title: installedTitle,
        category: "surprise",
        level: "A",
        players: "1 人",
        devices: "单设备",
        entry: "experiences/surprises/installed-one/index.html",
        readme: "experiences/surprises/installed-one/README.md",
        description: "fixture",
        installed: true,
        networkRequired: false,
      },
      {
        id: "not-installed",
        title: "未安装作品",
        category: "co-op",
        level: "A",
        players: "2 人",
        devices: "单设备",
        entry: "experiences/co-op/not-installed/index.html",
        readme: "experiences/co-op/not-installed/README.md",
        description: "fixture",
        installed: false,
        networkRequired: false,
      },
    ],
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
