(function (root, factory) {
  "use strict";
  root.DATE_WHEEL_LOGIC = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const UINT32_RANGE = 4294967296;

  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    const normalized = items.slice(0, 12).map((item) => ({
      label: String(item?.label ?? "").trim().slice(0, 40),
      detail: String(item?.detail ?? "").trim().slice(0, 180),
    })).filter((item) => item.label);
    return normalized.length >= 2 ? normalized : [];
  }

  function uint32ToUnit(value) {
    return Number.isInteger(value) && value >= 0 && value < UINT32_RANGE
      ? value / UINT32_RANGE
      : null;
  }

  function pickIndex(unitValue, itemCount) {
    if (!Number.isFinite(unitValue) || unitValue < 0 || unitValue >= 1) return null;
    if (!Number.isInteger(itemCount) || itemCount < 2 || itemCount > 12) return null;
    return Math.floor(unitValue * itemCount);
  }

  function getSegmentAngle(itemCount) {
    return Number.isInteger(itemCount) && itemCount >= 2 ? 360 / itemCount : null;
  }

  function getTargetRotation(currentRotation, selectedIndex, itemCount, fullTurns = 4) {
    const segment = getSegmentAngle(itemCount);
    if (segment === null || !Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= itemCount) return null;
    const current = Number.isFinite(currentRotation) ? currentRotation : 0;
    const turns = Math.max(0, Math.floor(Number(fullTurns) || 0));
    const currentMod = ((current % 360) + 360) % 360;
    const targetMod = (360 - ((selectedIndex + 0.5) * segment) % 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    return current + turns * 360 + delta;
  }

  return Object.freeze({ normalizeItems, uint32ToUnit, pickIndex, getSegmentAngle, getTargetRotation });
});
