import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("portal keeps the same-LAN reminder beside the runtime QR code", () => {
  assert.ok(
    html.includes(
      '<p id="runtime-network-hint" hidden>扫码提醒：手机与这台电脑需要连接同一个 Wi‑Fi 或局域网。</p>',
    ),
  );
  assert.match(
    html,
    /document\.querySelector\("#runtime-network-hint"\)\.hidden = health\.networkUrls\.length === 0;/,
  );
  assert.match(
    html,
    /document\.querySelector\("#runtime-network-hint"\)\.hidden = true;/,
  );
});
