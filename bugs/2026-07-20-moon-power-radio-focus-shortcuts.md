# 月面供电：radio 获焦后双席快捷键被全部屏蔽

- 日期：2026-07-20
- 阶段：浏览器第三班混合输入
- 影响：点击任一联络/负载 radio 后，`A/S/D/J/K/L` 暂时全部无效
- 状态：已修复，浏览器混合输入复验通过

## 复现

1. 进入第三班 operating；
2. 用鼠标选择“氧气 → R”，此时氧气 radio 保持焦点；
3. 不点击空白处，直接按 `L`；
4. “通信”仍停在 `off`。

## 根因

app 的 keydown 门控用 `target.matches("input, textarea, select")` 屏蔽全部 input。原意是遵守“焦点在文字输入时不抢快捷键”，却把 radio 也当成文本录入控件。双席混合操作时，鼠标席刚选完 radio，键盘席就被意外锁住。

## 修复

- 只屏蔽 textarea、select、contenteditable，以及 text/search/email/url/tel/password/number 等文本型 input；
- radio 和 checkbox 获焦时继续把无修饰键交给 `classifyPowerKey`；
- 浏览器以“点击氧气 R → 焦点仍在 radio → 按 L”验证通信成功切到 L；
- repeat 与 ctrl/alt/meta/shift 过滤仍由纯逻辑分类器负责。

## 可复用结论

“表单控件”和“文本录入”不是同一个键盘冲突域。全局游戏快捷键通常应避开会接收字符的编辑控件，但不能一刀切屏蔽 radio、checkbox、range 或普通按钮；否则鼠标与键盘混用会形成隐蔽的焦点依赖。
