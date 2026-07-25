(function (root, factory) {
  "use strict";

  const constants = typeof module === "object" && module.exports
    ? require("./constants.js")
    : root.RicochetTankDuelConstants;
  const api = factory(constants);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.RicochetTankDuelFixed = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (constants) {
  "use strict";

  if (!constants) throw new Error("RicochetTankDuelConstants must load before fixed.js");

  const { deepFreeze } = constants;
  const FP_SCALE = constants.RULES.FP_SCALE;

  function assertSafeInteger(value, label = "value") {
    if (!Number.isSafeInteger(value)) throw new RangeError(`${label} must be a safe integer`);
    return value;
  }

  function safeProduct(left, right, label = "integer product") {
    assertSafeInteger(left, `${label} left`);
    assertSafeInteger(right, `${label} right`);
    const product = left * right;
    return assertSafeInteger(product, `${label} overflow`);
  }

  function toFp(logical) {
    assertSafeInteger(logical, "logical");
    return safeProduct(logical, FP_SCALE, "Q10 conversion");
  }

  function roundDiv(numerator, denominator) {
    assertSafeInteger(numerator, "numerator");
    assertSafeInteger(denominator, "denominator");
    if (denominator === 0) throw new RangeError("denominator must not be zero");
    if (numerator === 0) return 0;
    const sign = Math.sign(numerator) * Math.sign(denominator);
    const absoluteNumerator = Math.abs(numerator);
    const absoluteDenominator = Math.abs(denominator);
    const quotient = Math.floor(absoluteNumerator / absoluteDenominator);
    const remainder = absoluteNumerator % absoluteDenominator;
    const rounded = remainder >= absoluteDenominator - remainder ? quotient + 1 : quotient;
    return assertSafeInteger(sign * rounded, "rounded quotient");
  }

  function mulQ10(valueFp, directionQ10) {
    return roundDiv(safeProduct(valueFp, directionQ10, "Q10 multiply"), FP_SCALE);
  }

  function gcd(left, right) {
    let a = Math.abs(assertSafeInteger(left, "gcd left"));
    let b = Math.abs(assertSafeInteger(right, "gcd right"));
    while (b !== 0) {
      const remainder = a % b;
      a = b;
      b = remainder;
    }
    return a;
  }

  function makeRational(numerator, denominator = 1) {
    assertSafeInteger(numerator, "rational numerator");
    assertSafeInteger(denominator, "rational denominator");
    if (denominator === 0) throw new RangeError("rational denominator must not be zero");
    if (numerator === 0) return { num: 0, den: 1 };
    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(numerator, denominator);
    return {
      num: assertSafeInteger(sign * (numerator / divisor), "normalized numerator"),
      den: Math.abs(denominator / divisor),
    };
  }

  function normalizeRational(value, label = "rational") {
    if (!value || typeof value !== "object") throw new TypeError(`${label} must be an object`);
    return makeRational(value.num, value.den);
  }

  function compareRational(left, right) {
    const a = normalizeRational(left, "left rational");
    const b = normalizeRational(right, "right rational");
    const commonDivisor = gcd(a.den, b.den);
    const leftCross = safeProduct(a.num, b.den / commonDivisor, "rational cross product");
    const rightCross = safeProduct(b.num, a.den / commonDivisor, "rational cross product");
    return Math.sign(leftCross - rightCross);
  }

  function equalRational(left, right) {
    return compareRational(left, right) === 0;
  }

  function addRational(left, right) {
    const a = normalizeRational(left, "left rational");
    const b = normalizeRational(right, "right rational");
    const commonDivisor = gcd(a.den, b.den);
    const leftFactor = b.den / commonDivisor;
    const rightFactor = a.den / commonDivisor;
    const numerator = assertSafeInteger(
      safeProduct(a.num, leftFactor, "rational sum")
        + safeProduct(b.num, rightFactor, "rational sum"),
      "rational sum overflow",
    );
    return makeRational(numerator, safeProduct(a.den, leftFactor, "rational sum denominator"));
  }

  function multiplyRational(left, right) {
    const a = normalizeRational(left, "left rational");
    const b = normalizeRational(right, "right rational");
    const leftDivisor = gcd(a.num, b.den);
    const rightDivisor = gcd(b.num, a.den);
    return makeRational(
      safeProduct(a.num / leftDivisor, b.num / rightDivisor, "rational product"),
      safeProduct(a.den / rightDivisor, b.den / leftDivisor, "rational product denominator"),
    );
  }

  function oneMinusRational(value) {
    const rational = normalizeRational(value);
    return makeRational(
      assertSafeInteger(rational.den - rational.num, "one-minus numerator"),
      rational.den,
    );
  }

  function scaleByRational(value, ratio) {
    assertSafeInteger(value, "scaled value");
    const rational = normalizeRational(ratio);
    return roundDiv(safeProduct(value, rational.num, "rational scale"), rational.den);
  }

  const ZERO = deepFreeze(makeRational(0, 1));
  const ONE = deepFreeze(makeRational(1, 1));

  return deepFreeze({
    FP_SCALE,
    ZERO,
    ONE,
    assertSafeInteger,
    safeProduct,
    toFp,
    roundDiv,
    mulQ10,
    makeRational,
    normalizeRational,
    compareRational,
    equalRational,
    addRational,
    multiplyRational,
    oneMinusRational,
    scaleByRational,
  });
});
