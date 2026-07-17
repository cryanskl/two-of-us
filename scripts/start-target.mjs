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
  if (!experienceId) return localUrl;
  const experience = catalog.experiences.find(({ id }) => id === experienceId);
  if (!experience || experience.installed !== true) {
    throw new Error(`找不到已安装作品：${experienceId}。`);
  }
  return new URL(experience.entry, localUrl).href;
}
