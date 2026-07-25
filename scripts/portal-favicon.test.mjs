import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const rootUrl = new URL("../", import.meta.url);

test("root portal declares an existing local SVG favicon", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const iconUrl = new URL("favicon.svg", rootUrl);

  assert.match(
    html,
    /<link rel="icon" href="\.\/favicon\.svg" type="image\/svg\+xml">/,
  );
  await access(iconUrl);
});

test("root favicon is a passive inline SVG asset", async () => {
  const svg = await readFile(new URL("favicon.svg", rootUrl), "utf8");

  assert.match(svg, /<svg\b[^>]*viewBox="0 0 64 64"/);
  assert.doesNotMatch(svg, /<(?:script|image|foreignObject)\b/i);
  assert.doesNotMatch(svg, /\bhref\s*=/i);
});
