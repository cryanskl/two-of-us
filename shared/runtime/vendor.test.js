import assert from "node:assert/strict";
import test from "node:test";
import { browserVendorAssets, resolveVendorAsset } from "./vendor.js";

const root = new URL("../../", import.meta.url);

test("vendor registry exposes only exact, versioned browser assets", () => {
  assert.deepEqual(Object.keys(browserVendorAssets).sort(), [
    "/vendor/pannellum/2.5.7/pannellum.css",
    "/vendor/pannellum/2.5.7/pannellum.js",
  ]);
  assert.match(
    resolveVendorAsset(root, "/vendor/pannellum/2.5.7/pannellum.js"),
    /node_modules\/pannellum\/build\/pannellum\.js$/,
  );
  assert.equal(resolveVendorAsset(root, "/vendor/pannellum/latest/pannellum.js"), null);
  assert.equal(resolveVendorAsset(root, "/vendor/../package.json"), null);
});
