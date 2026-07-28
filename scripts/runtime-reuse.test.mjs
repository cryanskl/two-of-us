import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import {
  buildRuntimeCandidateUrls,
  DEFAULT_MAX_PORT_ATTEMPTS,
  findReusableRuntime,
  probeRuntimeCandidate,
  RUNTIME_HEADER_NAME,
  RUNTIME_HEADER_VALUE,
  RUNTIME_PROBE_TIMEOUT_MS,
  RUNTIME_PROTOCOL_VERSION,
} from "./runtime-reuse.mjs";

const expectedContentIdentity = `sha256:${"a".repeat(64)}`;

function catalogEntry(overrides = {}) {
  const value = {
    id: "panorama-memory",
    title: "全景回忆",
    category: "surprise",
    level: "B",
    players: "1 人",
    devices: "单设备",
    entry: "experiences/surprises/panorama-memory/index.html",
    readme: "experiences/surprises/panorama-memory/README.md",
    description: "测试作品",
    installed: true,
    networkRequired: false,
    ...overrides,
  };
  if (!Object.hasOwn(overrides, "readme")) {
    value.readme = value.entry.replace(/index\.html$/, "README.md");
  }
  return value;
}

function catalog(...experiences) {
  return { schemaVersion: 1, experiences };
}

function response(url, value, overrides = {}) {
  let jsonCalls = 0;
  return {
    status: overrides.status ?? 200,
    url: overrides.url ?? new URL(url).href,
    headers: {
      get(name) {
        return name === RUNTIME_HEADER_NAME
          ? (Object.hasOwn(overrides, "header") ? overrides.header : RUNTIME_HEADER_VALUE) : null;
      },
    },
    async json() {
      jsonCalls += 1;
      if (overrides.jsonError) throw overrides.jsonError;
      return value;
    },
    get jsonCalls() { return jsonCalls; },
  };
}

function successfulFetch(log = [], contentIdentity = expectedContentIdentity) {
  return async (url, options) => {
    log.push({ url, options });
    if (url.endsWith("api/health")) {
      const match = /^http:\/\/127\.0\.0\.1:(\d+)\//.exec(url);
      const port = Number(match[1]);
      return response(url, {
        ok: true,
        service: "two-of-us",
        version: 1,
        port,
        localUrl: `http://127.0.0.1:${port}/`,
        contentIdentity,
        ignored: true,
      });
    }
    return response(url, catalog(catalogEntry()));
  };
}

test("runtime protocol constants and candidate URL boundaries are frozen", () => {
  assert.equal(RUNTIME_HEADER_NAME, "x-two-of-us-runtime");
  assert.equal(RUNTIME_HEADER_VALUE, "1");
  assert.equal(RUNTIME_PROTOCOL_VERSION, 1);
  assert.equal(RUNTIME_PROBE_TIMEOUT_MS, 10_000);
  assert.equal(DEFAULT_MAX_PORT_ATTEMPTS, 20);
  assert.deepEqual(buildRuntimeCandidateUrls(0, 20), []);
  assert.deepEqual(buildRuntimeCandidateUrls(4173, 3), [
    "http://127.0.0.1:4173/", "http://127.0.0.1:4174/", "http://127.0.0.1:4175/",
  ]);
  assert.deepEqual(buildRuntimeCandidateUrls(65534, 20), [
    "http://127.0.0.1:65534/", "http://127.0.0.1:65535/",
  ]);
  for (const [port, attempts] of [
    [-1, 1], [65536, 1], [1.5, 1], [new Number(1), 1], [1, 0], [1, 21], [1, 1.5],
  ]) {
    assert.throws(() => buildRuntimeCandidateUrls(port, attempts), /端口|次数/);
  }
});

test("successful probe performs exact health/catalog GETs without browser side effects", async () => {
  const log = [];
  const result = await findReusableRuntime({
    preferredPort: 4173,
    maxPortAttempts: 1,
    experienceId: "panorama-memory",
    expectedContentIdentity,
  }, { fetchImpl: successfulFetch(log) });
  assert.deepEqual(Object.keys(result), ["localUrl", "openUrl", "catalog"]);
  assert.equal(result.localUrl, "http://127.0.0.1:4173/");
  assert.equal(result.openUrl,
    "http://127.0.0.1:4173/experiences/surprises/panorama-memory/index.html");
  assert.equal(result.catalog.experiences[0].id, "panorama-memory");
  assert.deepEqual(log.map(({ url }) => url), [
    "http://127.0.0.1:4173/api/health", "http://127.0.0.1:4173/api/catalog",
  ]);
  for (const { options } of log) {
    assert.equal(options.method, "GET");
    assert.equal(options.redirect, "error");
    assert.ok(options.signal);
  }
});

test("experienceId null resolves the reusable root portal", async () => {
  const result = await findReusableRuntime({
    preferredPort: 4173, maxPortAttempts: 1, experienceId: null, expectedContentIdentity,
  }, { fetchImpl: successfulFetch() });
  assert.equal(result.openUrl, "http://127.0.0.1:4173/");
});

test("invalid status/header/url never reads the rejected response body", async () => {
  for (const overrides of [
    { status: 204 },
    { header: "2" },
    { header: null },
    { url: "http://127.0.0.1:4173/redirected" },
    { url: "https://example.com/api/health" },
  ]) {
    let rejectedResponse;
    const fetchImpl = async (url) => {
      rejectedResponse = response(url, {}, overrides);
      return rejectedResponse;
    };
    assert.equal(await probeRuntimeCandidate(
      "http://127.0.0.1:4173/", null, expectedContentIdentity, { fetchImpl },
    ), null);
    assert.equal(rejectedResponse.jsonCalls, 0);
  }
});

test("catalog status/header/url gates also reject before reading its body", async () => {
  for (const overrides of [
    { status: 500 },
    { header: "foreign" },
    { header: null },
    { url: "http://127.0.0.1:4173/other-catalog" },
    { url: "https://example.com/api/catalog" },
  ]) {
    let catalogResponse;
    const fetchImpl = async (url, options) => {
      if (url.endsWith("api/health")) return successfulFetch()(url, options);
      catalogResponse = response(url, {}, overrides);
      return catalogResponse;
    };
    assert.equal(await probeRuntimeCandidate(
      "http://127.0.0.1:4173/", null, expectedContentIdentity, { fetchImpl },
    ), null);
    assert.equal(catalogResponse.jsonCalls, 0);
  }
});

test("wrong health, malformed catalog, and unavailable targets fail closed", async () => {
  const badHealthValues = [
    { ok: false, service: "two-of-us", version: 1, port: 4173, localUrl: "http://127.0.0.1:4173/", contentIdentity: expectedContentIdentity },
    { ok: true, service: "other", version: 1, port: 4173, localUrl: "http://127.0.0.1:4173/", contentIdentity: expectedContentIdentity },
    { ok: true, service: "two-of-us", version: 2, port: 4173, localUrl: "http://127.0.0.1:4173/", contentIdentity: expectedContentIdentity },
    { ok: true, service: "two-of-us", version: 1, port: 4174, localUrl: "http://127.0.0.1:4173/", contentIdentity: expectedContentIdentity },
    { ok: true, service: "two-of-us", version: 1, port: 4173, localUrl: "http://127.0.0.1:4174/", contentIdentity: expectedContentIdentity },
    { ok: true, service: "two-of-us", version: 1, port: 4173, localUrl: "http://127.0.0.1:4173/" },
    { ok: true, service: "two-of-us", version: 1, port: 4173, localUrl: "http://127.0.0.1:4173/", contentIdentity: "sha256:not-a-digest" },
    { ok: true, service: "two-of-us", version: 1, port: 4173, localUrl: "http://127.0.0.1:4173/", contentIdentity: `sha256:${"b".repeat(64)}` },
  ];
  for (const health of badHealthValues) {
    let requests = 0;
    const fetchImpl = async (url) => {
      requests += 1;
      return response(url, health);
    };
    assert.equal(await probeRuntimeCandidate(
      "http://127.0.0.1:4173/", null, expectedContentIdentity, { fetchImpl },
    ), null);
    assert.equal(requests, 1);
  }

  const catalogCases = [
    { bad: true },
    catalog(),
    catalog(catalogEntry({ installed: false })),
    catalog(catalogEntry({ entry: "https://example.com/index.html" })),
    catalog(catalogEntry({ entry: "experiences/surprises/other/index.html" })),
  ];
  for (const data of catalogCases) {
    const fetchImpl = async (url) => (url.endsWith("api/health")
      ? successfulFetch()(url, {}) : response(url, data));
    const id = data.experiences?.length === 0 ? "missing" : "panorama-memory";
    assert.equal(await probeRuntimeCandidate(
      "http://127.0.0.1:4173/", id, expectedContentIdentity, { fetchImpl },
    ), null);
  }
});

test("network failure and timeout abort continue to the next candidate and clear every timer", async () => {
  const timers = { set: 0, cleared: 0 };
  const setTimeoutImpl = (callback, delay) => {
    timers.set += 1;
    assert.equal(delay, RUNTIME_PROBE_TIMEOUT_MS);
    return setTimeout(callback, delay);
  };
  const clearTimeoutImpl = (timer) => {
    timers.cleared += 1;
    clearTimeout(timer);
  };
  let firstAborted = false;
  const fetchImpl = (url, options) => {
    if (url.includes(":4173/")) {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          firstAborted = true;
          reject(options.signal.reason ?? new Error("aborted"));
        }, { once: true });
      });
    }
    return successfulFetch()(url, options);
  };
  const result = await findReusableRuntime({
    preferredPort: 4173,
    maxPortAttempts: 2,
    experienceId: "panorama-memory",
    expectedContentIdentity,
  }, { fetchImpl, setTimeoutImpl, clearTimeoutImpl });
  assert.equal(firstAborted, true);
  assert.equal(result.localUrl, "http://127.0.0.1:4174/");
  assert.deepEqual(timers, { set: 3, cleared: 3 });
});

test("connection failure on one candidate does not prevent a later success", async () => {
  const visited = [];
  const fetchImpl = async (url, options) => {
    visited.push(url);
    if (url.includes(":4173/")) throw new Error("ECONNREFUSED");
    return successfulFetch()(url, options);
  };
  const result = await findReusableRuntime({
    preferredPort: 4173, maxPortAttempts: 2, experienceId: null, expectedContentIdentity,
  }, { fetchImpl });
  assert.equal(result.localUrl, "http://127.0.0.1:4174/");
  assert.equal(visited[0], "http://127.0.0.1:4173/api/health");
});

test("real fetch refuses health/catalog same-origin, cross-origin, and multi-hop redirects", async (context) => {
  const destination = createServer((request, responseValue) => {
    responseValue.writeHead(200, {
      [RUNTIME_HEADER_NAME]: RUNTIME_HEADER_VALUE,
      "content-type": "application/json",
    });
    responseValue.end(JSON.stringify({ ok: true }));
  });
  destination.listen(0, "127.0.0.1");
  await once(destination, "listening");
  context.after(() => new Promise((resolve) => destination.close(resolve)));
  const destinationPort = destination.address().port;

  const cases = [];
  for (const stage of ["health", "catalog"]) {
    cases.push(
      { stage, location: "/redirected" },
      { stage, location: `http://127.0.0.1:${destinationPort}/redirected` },
      { stage, location: "/hop-one" },
    );
  }
  for (const { stage, location } of cases) {
    const redirectServer = createServer((request, responseValue) => {
      const shouldRedirect = (stage === "health" && request.url === "/api/health")
        || (stage === "catalog" && request.url === "/api/catalog");
      if (shouldRedirect || request.url === "/hop-one") {
        const next = request.url === "/hop-one" ? "/hop-two" : location;
        responseValue.writeHead(302, { location: next });
        responseValue.end();
        return;
      }
      if (request.url === "/api/health") {
        const port = redirectServer.address().port;
        responseValue.writeHead(200, {
          [RUNTIME_HEADER_NAME]: RUNTIME_HEADER_VALUE,
          "content-type": "application/json",
        });
        responseValue.end(JSON.stringify({
          ok: true,
          service: "two-of-us",
          version: 1,
          port,
          localUrl: `http://127.0.0.1:${port}/`,
        }));
        return;
      }
      responseValue.writeHead(404);
      responseValue.end();
    });
    redirectServer.listen(0, "127.0.0.1");
    await once(redirectServer, "listening");
    const port = redirectServer.address().port;
    assert.equal(await probeRuntimeCandidate(
      `http://127.0.0.1:${port}/`, null, expectedContentIdentity,
    ), null);
    await new Promise((resolve) => redirectServer.close(resolve));
  }
});
