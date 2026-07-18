# 靠近一点：配置回退后仍可能执行原对象的开场策略

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：靠近一点本地 `config.js`
- 发现版本 / commit：功能提交前工作区

## 环境

- 任意支持经典脚本的浏览器；
- A 级 `file://` 入口；
- 构造名字非法、`chooseOpeningCard` 函数合法的混合配置。

## 复现步骤

1. 把 `aName` 改为空字符串；
2. 让 `chooseOpeningCard` 返回一个合法卡 ID；
3. 开始会话并观察名字与第一张卡。

## 预期结果

配置整份无效时，名字、首发、张数和开场策略都回退到同一套默认值。

## 实际结果

初版 reducer 内部会把名字等字段整份回退，但 app 开始会话时仍从未经校验的原对象读取 `chooseOpeningCard`，形成“名字已回退、私人策略仍执行”的半回退。

## 根因

配置在 reducer 与 UI 两处分别读取：状态使用 `sanitizeConfig` 结果，副作用入口却使用原始全局对象。

## 解决方案

app 启动时只做一次 `logic.sanitizeConfig(rawConfig)`；`createInitialState` 与 `startSession` 都只读取这份校验结果。目录测试固定检查这个统一入口。

## 回归验证

- [x] 非法混合配置回到完整默认配置；
- [x] 合法配置仍可使用本机开场卡策略；
- [x] 策略异常、非法 ID 与冻结上下文测试通过；
- [x] 整仓测试 390 / 390 通过。

## 相关提交

- `d33f18d feat: add closer cards conversation ritual`
