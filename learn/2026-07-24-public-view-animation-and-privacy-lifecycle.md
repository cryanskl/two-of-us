# 阶段公开投影、展示幂等与热座隐私生命周期

## 适用范围

适用于同一设备轮流接管、内部状态先于界面知道秘密、并且带 Canvas、音频或动画揭晓
的本地互动，例如秘密选牌、参数投射、记忆播放、竞价证明和双份答案共同揭晓。

## 四层模型

```text
authority state
  └─ getPublicView(phase)
       └─ DOM + public animation frames
            └─ lifecycle privacy cover
```

1. **authority state** 保存完整规则事实，只有 reducer 能推进；
2. **public view** 按当前 phase 删除尚未允许公开的数据；
3. **展示层** 只消费 public view 和公开帧，失败不能改变规则结果；
4. **生命周期遮罩** 可随时卸载展示、销毁本地草稿和中断播放，但不发明新规则 phase。

## 关键结论

### 1. 可见性必须结构化，不靠 CSS 隐藏

内部已经存储第二份秘密，不代表第一段揭晓时可以把它交给渲染器再 `display:none`。
public view 应直接省略未来秘密、未来帧、占位节点和提前比分。

验证时要同时断言：

- 当前允许的数据存在；
- 下一阶段的数据不存在；
- DOM、accessible name、`data-*`、Canvas 像素和 live region 都没有占位泄露。

### 2. 动画句柄不是业务幂等闸门

`requestAnimationFrame` 句柄只管理浏览器资源，不能证明回合尚未结算。每次播放还需要
自己的身份和单调 `settled`：

```text
callback is valid
= same playback identity
  AND same generation
  AND not settled
  AND privacy cover inactive
```

正常播放结束、手动跳过、减少动态、Canvas 失败和调度异常都应进入同一个结算函数。
先原子设置 `settled`，再取消资源、画最终帧和启用下一动作。迟到回调必须无条件
退出，不能再次计分。

### 3. Canvas 是可替换投影，不是规则 Oracle

Canvas、SVG、WebGL 或音频都可能不可用或在运行中抛错。生产规则必须预先给出完整
结果与公开帧；展示异常时切换到 DOM 文字结果，不能重新模拟、估计或跳过业务动作。

降级成功的判据是：

- 正常动画、降动效、手动跳过和绘图失败得到同一结果；
- 结算只发生一次；
- 用户仍能读到角度、结果、比分和下一动作；
- 隐私遮罩仍能取消正在进行的展示。

### 4. 隐私遮罩是一组不变量

热座遮罩激活时必须同时完成：

- 销毁未锁定的本地草稿；
- 取消或结算前停止当前展示；
- 对背景设置 `inert` 并退出可访问树；
- 焦点进入遮罩标题或唯一继续动作；
- 页面从 hidden 回到 visible 时补偿丢失的焦点；
- 只有用户明确继续后才返回当前阶段标题。

只改变 `opacity`、`visibility` 或 z-index 不能证明隐私边界闭合。

### 5. 短视觉标签与长可访问名称要分别验证

窄按钮可以只显示“− / +”，但辅助技术需要“角度减一档”等完整名称。CSS 伪元素的
生成文本可能参与 accessible name；因此应显式设置稳定名称，并用真实可访问树验证，
不能仅凭 DOM 文本推断。

## 反例

- authority state 直接传给模板，再靠条件分支尽量不显示秘密；
- 第一发播放时已经构造第二发 Canvas 或空摘要；
- `cancelAnimationFrame(id)` 成功就认为不会有迟到回调；
- Canvas 绘制抛错后让按钮永久停在“跳过动画”；
- 遮罩只覆盖视觉，背景仍能 Tab 或被读屏访问；
- 用 CSS 生成“+”后假设读屏仍只读取原始按钮文本。

## 验证清单

1. 为每个 phase 固定 public view schema；
2. 用不同的两组秘密做存在/不存在断言；
3. 注入动画申请、取消和绘制异常；
4. 比较正常、跳过、降动效和失败路径的最终状态；
5. 在 `blur`、`visibilitychange`、`pagehide` 与 Escape 下检查草稿、播放和焦点；
6. 检查遮罩期间 background 的 `inert`、`aria-hidden` 和 Tab 顺序；
7. 读取真实 accessibility snapshot，核对控件角色与名称；
8. 在 320px、常见手机、桌面、强制色和减少动态下复验。

## 本次证据

“这一颗，绕回来找你”使用同一套 99 组合确定性规则矩阵和阶段 public view，Chrome
走完两份秘密、两段飞行和联合结算；第一发只出现第一份参数，第二发结束前比分不变。
Canvas/动画失败、遮罩焦点、滑块名称和生成内容名称问题均已记录在 `bugs/`，全仓
1851 项测试与 58 项目录验收通过。
