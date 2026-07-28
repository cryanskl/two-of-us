((scope) => {
  function filterExperiences(experiences, filters = {}) {
    const level = filters.level ?? "all";
    const category = filters.category ?? "all";
    const featured = filters.featured ?? "all";

    return experiences.filter((experience) => {
      const matchesLevel = level === "all" || experience.level === level;
      const matchesCategory = category === "all" || experience.category === category;
      const matchesFeatured = featured === "all" || experience.featured === true;
      return matchesLevel && matchesCategory && matchesFeatured;
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
