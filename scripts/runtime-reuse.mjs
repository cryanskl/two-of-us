import { validateCatalog } from "../shared/runtime/catalog.js";
import { isContentIdentity } from "../shared/runtime/content-identity.js";
import { resolveExperienceUrl } from "./start-target.mjs";

export const RUNTIME_HEADER_NAME = "x-two-of-us-runtime";
export const RUNTIME_HEADER_VALUE = "1";
export const RUNTIME_PROTOCOL_VERSION = 1;
export const RUNTIME_PROBE_TIMEOUT_MS = 250;
export const DEFAULT_MAX_PORT_ATTEMPTS = 20;

export function buildRuntimeCandidateUrls(preferredPort, maxPortAttempts) {
  if (!Number.isSafeInteger(preferredPort) || preferredPort < 0 || preferredPort > 65535) {
    throw new Error("首选端口必须是 0 到 65535 之间的安全整数。");
  }
  if (!Number.isSafeInteger(maxPortAttempts)
    || maxPortAttempts < 1 || maxPortAttempts > DEFAULT_MAX_PORT_ATTEMPTS) {
    throw new Error(`端口尝试次数必须是 1 到 ${DEFAULT_MAX_PORT_ATTEMPTS} 之间的安全整数。`);
  }
  if (preferredPort === 0) return [];

  const urls = [];
  const finalPort = Math.min(65535, preferredPort + maxPortAttempts - 1);
  for (let port = preferredPort; port <= finalPort; port += 1) {
    urls.push(`http://127.0.0.1:${port}/`);
  }
  return urls;
}

export async function probeRuntimeCandidate(
  localUrl,
  experienceId,
  expectedContentIdentity,
  dependencies = {},
) {
  if (!isContentIdentity(expectedContentIdentity)) return null;
  const match = /^http:\/\/127\.0\.0\.1:(\d{1,5})\/$/.exec(localUrl);
  if (!match) return null;
  const candidatePort = Number(match[1]);
  if (!Number.isSafeInteger(candidatePort) || candidatePort < 1 || candidatePort > 65535) return null;

  try {
    const request = createRequestHelper(dependencies);
    const health = await request(`${localUrl}api/health`);
    if (!health || health.ok !== true || health.service !== "two-of-us"
      || health.version !== RUNTIME_PROTOCOL_VERSION || health.port !== candidatePort
      || health.localUrl !== localUrl
      || !isContentIdentity(health.contentIdentity)
      || health.contentIdentity !== expectedContentIdentity) return null;

    const catalog = validateCatalog(await request(`${localUrl}api/catalog`));
    const openUrl = resolveExperienceUrl(catalog, localUrl, experienceId);
    return { localUrl, openUrl, catalog };
  } catch {
    return null;
  }
}

export async function findReusableRuntime({
  preferredPort,
  maxPortAttempts = DEFAULT_MAX_PORT_ATTEMPTS,
  experienceId = null,
  expectedContentIdentity,
} = {}, dependencies = {}) {
  const candidates = buildRuntimeCandidateUrls(preferredPort, maxPortAttempts);
  for (const localUrl of candidates) {
    const result = await probeRuntimeCandidate(
      localUrl,
      experienceId,
      expectedContentIdentity,
      dependencies,
    );
    if (result) return result;
  }
  return null;
}

function createRequestHelper(dependencies) {
  const fetchImpl = dependencies.fetchImpl ?? globalThis.fetch;
  const AbortControllerImpl = dependencies.AbortControllerImpl ?? globalThis.AbortController;
  const setTimer = dependencies.setTimeoutImpl ?? globalThis.setTimeout;
  const clearTimer = dependencies.clearTimeoutImpl ?? globalThis.clearTimeout;
  if (typeof fetchImpl !== "function" || typeof AbortControllerImpl !== "function"
    || typeof setTimer !== "function" || typeof clearTimer !== "function") {
    throw new Error("运行时探测环境缺少必要能力。");
  }

  return async function requestJson(requestUrl) {
    const controller = new AbortControllerImpl();
    const timer = setTimer(() => controller.abort(), RUNTIME_PROBE_TIMEOUT_MS);
    try {
      const response = await fetchImpl(requestUrl, {
        method: "GET",
        redirect: "error",
        signal: controller.signal,
      });
      const normalizedRequestUrl = new URL(requestUrl).href;
      if (response.status !== 200 || response.url !== normalizedRequestUrl
        || response.headers.get(RUNTIME_HEADER_NAME) !== RUNTIME_HEADER_VALUE) {
        throw new Error("运行时身份响应无效。");
      }
      return await response.json();
    } finally {
      clearTimer(timer);
    }
  };
}
