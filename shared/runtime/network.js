import os from "node:os";

export function getNetworkUrls(port) {
  const addresses = new Set();

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const entry of interfaces ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      addresses.add(entry.address);
    }
  }

  return [...addresses]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((address) => `http://${address}:${port}/`);
}
