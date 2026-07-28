import assert from "node:assert/strict";
import test from "node:test";
import { getNetworkUrls } from "./network.js";

const entry = (address, overrides = {}) => ({
  address,
  family: "IPv4",
  internal: false,
  netmask: "255.255.255.0",
  cidr: `${address}/24`,
  mac: "00:00:00:00:00:00",
  ...overrides,
});

test("prefers a physical private LAN address over tunnel and proxy addresses", () => {
  const urls = getNetworkUrls(4173, {
    utun9: [entry("100.103.113.84")],
    en0: [entry("192.168.0.108")],
    utun7: [entry("198.18.0.1")],
  });

  assert.deepEqual(urls, [
    "http://192.168.0.108:4173/",
    "http://100.103.113.84:4173/",
    "http://198.18.0.1:4173/",
  ]);
});

test("prefers a physical LAN interface when a VPN also uses a private address", () => {
  const urls = getNetworkUrls(5000, {
    tun0: [entry("10.8.0.2")],
    wlan0: [entry("192.168.1.20")],
  });

  assert.deepEqual(urls, [
    "http://192.168.1.20:5000/",
    "http://10.8.0.2:5000/",
  ]);
});

test("filters internal and IPv6 addresses and keeps deterministic numeric order", () => {
  const urls = getNetworkUrls(4173, {
    lo0: [entry("127.0.0.1", { internal: true })],
    en0: [
      entry("192.168.1.20"),
      entry("fe80::1", { family: "IPv6" }),
      entry("192.168.1.3"),
    ],
  });

  assert.deepEqual(urls, [
    "http://192.168.1.3:4173/",
    "http://192.168.1.20:4173/",
  ]);
});
