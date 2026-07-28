((scope) => {
  function filterExperiences(experiences, filters = {}) {
    const level = filters.level ?? "all";
    const category = filters.category ?? "all";

    return experiences.filter((experience) => {
      const matchesLevel = level === "all" || experience.level === level;
      const matchesCategory = category === "all" || experience.category === category;
      return matchesLevel && matchesCategory;
    });
  }

  function pickRandom(experiences, random = Math.random) {
    if (experiences.length === 0) return null;
    const index = Math.min(experiences.length - 1, Math.floor(random() * experiences.length));
    return experiences[index];
  }

  scope.PortalFilters = Object.freeze({
    filterExperiences,
    pickRandom,
  });
})(typeof window === "undefined" ? globalThis : window);
