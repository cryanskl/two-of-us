# Kaleidoscope Names：冻结外部 content 绕过规范化

## 复现

调用方可以构造一个字段合法、但文本尚未完成空白折叠或 NFC 规范化的
`state.content`，再冻结 content、marks 和 state：

```js
const externalContent = validConfig({
  publicTitle: "  把\u00a0名字  折成光  ",
  marks: ["e\u0301", "光"]
});
Object.freeze(externalContent.marks);
Object.freeze(externalContent);
```

把它放入 exact `complete` state 后调用 `getPublicView()`，修复前会得到：

```text
publicTitle = "  把 名字  折成光  "
marks[0].text = "é"
```

同样，把已冻结的合法 content 包装成 Proxy，普通 `get` trap 会在 state
validation 或 public view 投影时被触发。

## 影响

这违反规格中“state content 是 sanitized config”的合同：

- 已冻结不等于已经完成 NFC、空白折叠和字段规范化；
- JSON clone、外部 replay 或 hostile state 可以产生与 `sanitizeConfig()` 不同的
  public DTO；
- descriptor-only 的 hostile 输入边界被一次普通属性读取绕过；
- complete 的公开 mark 可能与准备者通过正常 config 路径得到的文本不一致。

正常由 `createInitialState()` 创建的状态不受影响，但公开 `reduce()` 与
`getPublicView()` 明确接受结构合法的外部/JSON state，因此该路径属于真实核心
合同，而不是测试专用场景。

## 根因

旧 `isCanonicalContent()` 只检查：

```text
Object.isFrozen(content)
Object.isFrozen(content.marks)
```

随后直接复用调用方 content。它既没有比较 descriptor snapshot 与
`parseConfig()` 的规范化结果，又通过 `value.marks` 执行了一次普通属性读取。

## 修复

- 只用 own-data descriptor snapshot 重新读取 content 与 marks；
- 把原始字段逐项与 `parseConfig()` 的规范化结果比较；
- 只有值已经规范化且两层都冻结时，才保留原 content 引用；
- validator 同时保留内部 `normalizedContent`，规则判断与所有 public view 文本
  只读取这份安全快照；
- reducer 对模块自身创建的 canonical content 仍保持原引用，不改变现有
  restart/ownership 合同。

## 失败回归

新增测试
`frozen external content is canonicalized without ordinary property reads`。

修复前：

```text
25 tests
24 passed
1 failed
```

首个断言稳定观察到未折叠的 public title。修复后同一测试同时固定：

- public title 折叠为 `把 名字 折成光`；
- decomposed `e + acute` mark 规范化为 `é`；
- frozen Proxy 的普通 `get` 次数为 0；
- public view 仍能成功生成。

## 回归命令

```bash
node --check experiences/surprises/kaleidoscope-names/logic.js
node --test experiences/surprises/kaleidoscope-names/logic.test.js
npm test
npm run verify
git diff --check
```
