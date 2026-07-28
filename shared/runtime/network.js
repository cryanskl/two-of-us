import os from "node:os";

const virtualInterfacePattern = /(?:^|[\s_-])(?:awdl|bridge|docker|hamachi|ipsec|llw|ppp|tailscale|tap|tun|utun|veth|virbr|vmnet|vpn|wg|zerotier|zt)(?:\d|$|[\s_-])/i;

export function getNetworkUrls(port, networkInterfaces = os.networkInterfaces()) {
  const candidates = new Map();

  for (const [interfaceName, interfaces] of Object.entries(networkInterfaces)) {
    for (const entry of interfaces ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      const candidate = { address: entry.address, interfaceName };
      const current = candidates.get(entry.address);
      if (!current || compareNetworkCandidates(candidate, current) < 0) {
        candidates.set(entry.address, candidate);
      }
    }
  }

  return [...candidates.values()]
    .sort(compareNetworkCandidates)
    .map(({ address }) => `http://${address}:${port}/`);
}

function compareNetworkCandidates(left, right) {
  const rankDifference = getNetworkCandidateRank(left) - getNetworkCandidateRank(right);
  if (rankDifference !== 0) return rankDifference;
  return left.address.localeCompare(right.address, undefined, { numeric: true });
}

function getNetworkCandidateRank({ address, interfaceName }) {
  const isVirtual = virtualInterfacePattern.test(interfaceName);
  if (isPrivateLanAddress(address)) return isVirtual ? 1 : 0;
  if (isCarrierGradeNatAddress(address)) return 3;
  if (isBenchmarkAddress(address)) return 4;
  if (isLinkLocalAddress(address)) return 5;
  return isVirtual ? 3 : 2;
}

function isPrivateLanAddress(address) {
  const octets = parseIpv4(address);
  if (!octets) return false;
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
}

function isCarrierGradeNatAddress(address) {
  const octets = parseIpv4(address);
  return Boolean(octets && octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127);
}

function isBenchmarkAddress(address) {
  const octets = parseIpv4(address);
  return Boolean(octets && octets[0] === 198 && (octets[1] === 18 || octets[1] === 19));
}

function isLinkLocalAddress(address) {
  const octets = parseIpv4(address);
  return Boolean(octets && octets[0] === 169 && octets[1] === 254);
}

function parseIpv4(address) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}
