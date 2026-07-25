"use strict";

const LEFT = "rotate-left";
const RIGHT = "rotate-right";
const FORWARD = "thrust-forward";
const REVERSE = "thrust-reverse";

function press(seat, control) {
  return { type: "PRESS", seat, control };
}

function release(seat, control) {
  return { type: "RELEASE", seat, control };
}

function ticks(actions, count) {
  let remaining = count;
  while (remaining > 0) {
    const chunk = Math.min(5, remaining);
    actions.push({ type: "TICK", count: chunk });
    remaining -= chunk;
  }
}

function steer(actions, total, runs) {
  let held = null;
  for (let index = 0; index < runs.length; index += 1) {
    const [start, torque] = runs[index];
    const end = index + 1 < runs.length ? runs[index + 1][0] : total;
    if (held) actions.push(release("attitude", held));
    held = torque < 0 ? LEFT : torque > 0 ? RIGHT : null;
    if (held) actions.push(press("attitude", held));
    ticks(actions, end - start);
  }
  if (held) actions.push(release("attitude", held));
}

function thrust(actions, control, count) {
  actions.push(press("thrust", control));
  ticks(actions, count);
  actions.push(release("thrust", control));
}

function coast(actions, count) {
  ticks(actions, count);
}

function legOne() {
  const actions = [];
  steer(actions, 12, [[0, -1], [8, 1], [11, 0]]);
  thrust(actions, FORWARD, 262);
  thrust(actions, REVERSE, 63);
  coast(actions, 30);
  return actions;
}

function legTwo() {
  const actions = [];
  steer(actions, 4, [[0, -1], [2, 1], [3, 0]]);
  thrust(actions, FORWARD, 59);
  steer(actions, 17, [[0, -1], [7, 1], [9, -1], [10, 1], [15, -1], [16, 0]]);
  thrust(actions, FORWARD, 33);
  steer(actions, 8, [[0, 1], [4, -1], [7, 0]]);
  thrust(actions, FORWARD, 149);
  thrust(actions, REVERSE, 65);
  coast(actions, 47);
  return actions;
}

function legThree() {
  const actions = [];
  steer(actions, 4, [[0, -1], [2, 1], [3, 0]]);
  thrust(actions, FORWARD, 29);
  steer(actions, 16, [[0, 1], [6, -1], [8, 1], [9, -1], [14, 1], [15, 0]]);
  thrust(actions, FORWARD, 43);
  steer(actions, 4, [[0, -1], [2, 1], [3, 0]]);
  thrust(actions, FORWARD, 109);
  thrust(actions, REVERSE, 35);
  coast(actions, 146);
  return actions;
}

function freezeActions(actions) {
  return Object.freeze(actions.map((action) => Object.freeze(action)));
}

module.exports = Object.freeze({
  legs: Object.freeze([
    freezeActions(legOne()),
    freezeActions(legTwo()),
    freezeActions(legThree()),
  ]),
  expected: Object.freeze([
    Object.freeze({ ticks: 367, x: 81537, y: 31000, vx: 21, vy: 0, angleIndex: 0, angularVelocity: 0 }),
    Object.freeze({ ticks: 382, x: 80851, y: 30762, vx: 0, vy: 0, angleIndex: 255, angularVelocity: 0 }),
    Object.freeze({ ticks: 386, x: 80658, y: 31114, vx: 0, vy: 0, angleIndex: 1, angularVelocity: 0 }),
  ]),
});
