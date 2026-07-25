# Kaleidoscope Names：冻结导出函数时递归爆栈

## 复现

在纯逻辑批次首次运行：

```bash
node --test experiences/surprises/kaleidoscope-names/logic.test.js
```

模块加载 `deepFreeze(api)` 时抛出 `RangeError: Maximum call stack size
exceeded`，测试文件尚未进入第一个 case。

## 影响

`logic.js` 无法在 CommonJS 中加载；未来浏览器经典脚本也会在初始化阶段停止，
因此整个逻辑 API 不可用。

## 根因

JavaScript 函数拥有 `prototype.constructor`，它会重新指向函数本身。原实现把
函数与普通数据对象使用同一套递归遍历，形成：

```text
function → prototype → constructor → function
```

## 修复

`deepFreeze` 对函数只执行 `Object.freeze(function)`，不递归遍历函数内建属性；
配置、state、DTO、数组与 pattern model 仍按普通数据图递归冻结。

## 回归

`logic.test.js` 的“exact frozen API”用例会加载完整模块、检查 API 函数被冻结，
并继续递归检查所有数据返回值。定向测试、全仓测试和 repository verify 在本次
提交前重新运行。
