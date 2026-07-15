import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createRuntimeServer } from "./server.js";

test("runtime serves health, catalog, portal, and releases its port", async (context) => {
  const runtime = await createRuntimeServer({
    rootDir: new URL("../../", import.meta.url),
    host: "127.0.0.1",
    preferredPort: 0,
  });
  context.after(() => runtime.stop());

  const details = await runtime.start();
  const healthResponse = await fetch(`${details.localUrl}api/health`);
  const health = await healthResponse.json();
  const catalogResponse = await fetch(`${details.localUrl}api/catalog`);
  const catalog = await catalogResponse.json();
  const portalResponse = await fetch(details.localUrl);

  assert.equal(healthResponse.status, 200);
  assert.equal(health.ok, true);
  assert.equal(health.port, details.port);
  assert.match(health.qrDataUrl, /^data:image\/png;base64,/);
  assert.equal(catalog.experiences[0].id, "love-tree");
  assert.equal(portalResponse.status, 200);
  assert.match(await portalResponse.text(), /Two of Us/);

  await runtime.stop();
  assert.equal(runtime.httpServer.listening, false);
});

test("runtime selects the next port when the preferred one is occupied", async (context) => {
  const blocker = createServer();
  await new Promise((resolve) => blocker.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => blocker.close(resolve)));
  const occupiedPort = blocker.address().port;

  const runtime = await createRuntimeServer({
    rootDir: new URL("../../", import.meta.url),
    host: "127.0.0.1",
    preferredPort: occupiedPort,
    maxPortAttempts: 2,
  });
  context.after(() => runtime.stop());

  const details = await runtime.start();
  assert.equal(details.port, occupiedPort + 1);
});
