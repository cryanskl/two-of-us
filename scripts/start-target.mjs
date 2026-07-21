import { validateCatalog } from "../shared/runtime/catalog.js";

export function parseExperienceId(args) {
  const index = args.indexOf("--experience");
  if (index === -1) return null;
  const value = args[index + 1];
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error("--experience 后必须提供合法的作品 id。");
  }
  return value;
}

export function resolveExperienceUrl(catalog, localUrl, experienceId) {
  validateCatalog(catalog);
  let base;
  try {
    base = new URL(localUrl);
  } catch {
    throw new Error("本机运行时地址无效。");
  }
  if (base.protocol !== "http:" || base.pathname !== "/"
    || base.search !== "" || base.hash !== "") {
    throw new Error("本机运行时地址必须是 HTTP 根地址。");
  }
  if (experienceId === null) return base.href;
  if (typeof experienceId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(experienceId)) {
    throw new Error("作品 id 无效。");
  }
  const experience = catalog.experiences.find(({ id }) => id === experienceId);
  if (!experience || experience.installed !== true) {
    throw new Error(`找不到已安装作品：${experienceId}。`);
  }
  const target = new URL(experience.entry, base);
  if (target.origin !== base.origin || target.pathname !== `/${experience.entry}`
    || target.search !== "" || target.hash !== "") {
    throw new Error(`作品 ${experienceId} 的入口不是安全的同源地址。`);
  }
  return target.href;
}
