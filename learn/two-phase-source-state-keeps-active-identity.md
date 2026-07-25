# 两阶段资源状态必须区分 active 身份与候选结果

## 可复用结论

替换图片、音频或文档时，如果状态模型只有一个 `kind` 字段，它应在加载阶段继续表示
**当前仍在使用的资源**。候选只有成功原子提交后，才能改变 active 身份。

推荐状态规则：

1. `ready/error -> loading`：generation 加一，active kind 不变；
2. `loading -> ready`：generation 不变，此时才允许切换 active kind；
3. `loading -> error`：generation 不变，active kind 必须不变；
4. loading 可临时禁用依赖资源稳定性的操作；
5. error 若旧资源仍有效，不应等同于“没有可用资源”。

## 为什么重要

“图片还看得见”并不足以证明两阶段替换正确。若公开元数据提前切换，UI 会错误标记
来源；若 error 一律禁止操作，失败候选仍会破坏已有可玩状态。

## 适用边界

适用于页面内 Object URL、音频试听、主题包和本地配置导入。若产品允许加载期间同时
展示候选详情，应增加独立的 candidate 状态，而不是复用 active 字段。

## 本仓证据

`photo-slider-race` 的回归测试证明：

- loading 期间仍公开 `builtin`；
- 成功后原子变成 `local`；
- 失败后仍可用 builtin 开局；
- 失败 action 不能伪造 active kind。
