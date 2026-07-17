import test from "node:test";
import assert from "node:assert/strict";

await import("./logic.js");
const {
  DEFAULT_CONFIG,
  sanitizeConfig,
  createInitialState,
  start,
  selectHole,
  punch,
  finishPunch,
  restart,
} = globalThis.FUTURE_TICKET_LOGIC;

function validConfig() {
  return {
    passenger: "同行人",
    issuer: "签发人",
    finalNote: "记得准时出发",
    serial: "FT 001",
    groups: [
      { id: "when", label: "时间", prompt: "第一孔", options: ["一", "二", "三"] },
      { id: "where", label: "地点", prompt: "第二孔", options: ["甲", "乙", "丙"] },
      { id: "bonus", label: "彩蛋", prompt: "第三孔", options: ["春", "夏", "秋"] },
    ],
  };
}

test("默认配置完整、递归冻结且可直接使用", () => {
  assert.equal(DEFAULT_CONFIG.groups.length, 3);
  assert.deepEqual(DEFAULT_CONFIG.groups.map((group) => group.id), ["when", "where", "bonus"]);
  assert.equal(Object.isFrozen(DEFAULT_CONFIG), true);
  assert.equal(Object.isFrozen(DEFAULT_CONFIG.groups), true);
  assert.equal(Object.isFrozen(DEFAULT_CONFIG.groups[0]), true);
  assert.equal(Object.isFrozen(DEFAULT_CONFIG.groups[0].options), true);
});

test("合法配置被修剪、复制并冻结", () => {
  const input = validConfig();
  input.passenger = "  同行人  ";
  const result = sanitizeConfig(input);
  assert.notStrictEqual(result, input);
  assert.equal(result.passenger, "同行人");
  assert.deepEqual(result.groups[1].options, ["甲", "乙", "丙"]);
  assert.equal(Object.isFrozen(result.groups[2].options), true);
});

test("任一结构、顺序、数量或长度错误都整份回退", () => {
  assert.strictEqual(sanitizeConfig(null), DEFAULT_CONFIG);
  assert.strictEqual(sanitizeConfig({}), DEFAULT_CONFIG);
  const wrongOrder = validConfig();
  wrongOrder.groups[0].id = "where";
  assert.strictEqual(sanitizeConfig(wrongOrder), DEFAULT_CONFIG);
  const wrongOptions = validConfig();
  wrongOptions.groups[1].options.pop();
  assert.strictEqual(sanitizeConfig(wrongOptions), DEFAULT_CONFIG);
  const tooLong = validConfig();
  tooLong.finalNote = "字".repeat(37);
  assert.strictEqual(sanitizeConfig(tooLong), DEFAULT_CONFIG);
});

test("初始状态冻结且只有 start 能进入 choosing", () => {
  const initial = createInitialState();
  assert.deepEqual(initial, {
    phase: "intro",
    step: 0,
    selection: null,
    reveals: [null, null, null],
    revision: 0,
  });
  assert.equal(Object.isFrozen(initial), true);
  assert.equal(Object.isFrozen(initial.reveals), true);
  assert.strictEqual(selectHole(initial, 1), initial);
  assert.equal(start(initial).phase, "choosing");
});

test("选择只接受三个孔位且重复选择不推进", () => {
  const choosing = start(createInitialState());
  assert.strictEqual(selectHole(choosing, -1), choosing);
  assert.strictEqual(selectHole(choosing, 3), choosing);
  assert.strictEqual(selectHole(choosing, 1.5), choosing);
  const selected = selectHole(choosing, 1);
  assert.equal(selected.selection, 1);
  assert.strictEqual(selectHole(selected, 1), selected);
  assert.equal(selectHole(selected, 2).selection, 2);
});

test("未选择不能打孔，打孔只揭晓当前一项并锁定", () => {
  const choosing = start(createInitialState());
  assert.strictEqual(punch(choosing, "秘密"), choosing);
  const selected = selectHole(choosing, 0);
  assert.strictEqual(punch(selected, ""), selected);
  const punching = punch(selected, "  周六午后  ");
  assert.equal(punching.phase, "punching");
  assert.deepEqual(punching.reveals, ["周六午后", null, null]);
  assert.strictEqual(punch(punching, "另一条"), punching);
  assert.strictEqual(selectHole(punching, 2), punching);
});

test("完成打孔依次推进且第三孔唯一进入 complete", () => {
  let state = start(createInitialState());
  for (let step = 0; step < 3; step += 1) {
    state = selectHole(state, step);
    state = punch(state, `结果${step + 1}`);
    assert.equal(state.phase, "punching");
    state = finishPunch(state);
    if (step < 2) {
      assert.equal(state.phase, "choosing");
      assert.equal(state.step, step + 1);
      assert.equal(state.selection, null);
    }
  }
  assert.equal(state.phase, "complete");
  assert.deepEqual(state.reveals, ["结果1", "结果2", "结果3"]);
});

test("非 punching 不能越过 FINISH_PUNCH Gate", () => {
  const intro = createInitialState();
  assert.strictEqual(finishPunch(intro), intro);
  const choosing = start(intro);
  assert.strictEqual(finishPunch(choosing), choosing);
});

test("重新组合清空揭晓内容并保持 revision 单调", () => {
  const selected = selectHole(start(createInitialState()), 2);
  const punching = punch(selected, "彩蛋");
  const restarted = restart(punching);
  assert.equal(restarted.phase, "intro");
  assert.deepEqual(restarted.reveals, [null, null, null]);
  assert.equal(restarted.revision, punching.revision + 1);
});

test("畸形状态安全回到初始状态且不修改调用方数组", () => {
  const malformed = { phase: "choosing", step: 9, selection: null, reveals: [], revision: 0 };
  assert.deepEqual(selectHole(malformed, 1), createInitialState());
  const choosing = start(createInitialState());
  const before = [...choosing.reveals];
  punch(selectHole(choosing, 0), "结果");
  assert.deepEqual(choosing.reveals, before);
});
