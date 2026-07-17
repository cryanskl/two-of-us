import assert from "node:assert/strict";
import test from "node:test";
import { crossOriginIsolationHeaders, resolveStaticPath } from "./static.js";

const root = new URL("../../", import.meta.url);

test("static resolver maps the portal and keeps files inside the repository", () => {
  assert.match(resolveStaticPath(root, "/"), /two-of-us\/index\.html$/);
  assert.match(
    resolveStaticPath(root, "/experiences/surprises/love-tree/index.html"),
    /love-tree\/index\.html$/,
  );
  assert.match(
    resolveStaticPath(root, "/vendor/pannellum/2.5.7/pannellum.css"),
    /node_modules\/pannellum\/build\/pannellum\.css$/,
  );
  assert.equal(resolveStaticPath(root, "/vendor/pannellum/latest/pannellum.css"), null);
  assert.equal(resolveStaticPath(root, "/node_modules/pannellum/build/pannellum.js"), null);
  assert.equal(resolveStaticPath(root, "/../package.json"), null);
  assert.equal(resolveStaticPath(root, "/%2e%2e/package.json"), null);
  assert.equal(resolveStaticPath(root, "/.git/config"), null);
  assert.equal(resolveStaticPath(root, "/package.json"), null);
});

test("cross-origin isolation is scoped to I Heard You only", () => {
  assert.deepEqual(crossOriginIsolationHeaders("/experiences/co-op/i-heard-you/"), {
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp",
    "origin-agent-cluster": "?1",
  });
  assert.deepEqual(
    crossOriginIsolationHeaders("/experiences/co-op/i-heard-you/app.js"),
    crossOriginIsolationHeaders("/experiences/co-op/i-heard-you/"),
  );
  assert.deepEqual(crossOriginIsolationHeaders("/experiences/co-op/i-heard-you-elsewhere/"), {});
  assert.deepEqual(crossOriginIsolationHeaders("/experiences/co-op/lighthouse-passage/"), {});
  assert.deepEqual(crossOriginIsolationHeaders("/%E0%A4%A"), {});
});
