# 官方移动端实现方案（Mobile Support Design for deepseek-harness）

> 这份文档是 `dsh-client-ui-mobile` 的姊妹产物：把插件已验证的移动端行为，
> 翻译成 deepseek-harness **内置架构**下的实现方案（官方自己写移动端时不需要
> `[class$="_xxx"]` 后缀 hack，因为官方拥有组件本身）。供官方维护者或后续
> PR-ready fork 直接使用。当前插件仓库即本方案的参考实现。

## 背景与需求来源

社区对移动端支持的需求已被多方验证（deepseek-ai/deepseek-harness discussions）：

- [#1721 RFC: Mobile & responsive viewport adaptations for Web UI](https://github.com/deepseek-ai/deepseek-harness/discussions/1721)（768px 以下抽屉模式 + composer safe-area + 轨迹面板触摸滚动）
- [#1293 Web UI has no responsive layout](https://github.com/deepseek-ai/deepseek-harness/discussions/1293)（发布 CSS 无任何宽度媒体查询）
- [#363 提议：改善移动端支持](https://github.com/deepseek-ai/deepseek-harness/discussions/363)（投票 95% 支持）
- [#665 WEBUI适配移动端](https://github.com/deepseek-ai/deepseek-harness/discussions/665)、[#229 响应式 UI 与 Tailscale 适配](https://github.com/deepseek-ai/deepseek-harness/discussions/229)

**行为基线**：`dsh-client-ui-mobile` 插件（本仓库）已在真实 dsh web 上验证以下行为，
本方案只做"官方化"翻译，不发明新交互。

## 目标

- 手机/窄窗（≤768px）下聊天区全宽可用，不挤压；
- 左侧 sidebar 折叠为抽屉（slide-over），遮罩只盖抽屉右侧；
- composer 固定在底部并适配 `env(safe-area-inset-bottom)`；
- 设置面板全屏 + 顶部横向导航；
- 工具调用行可读（更高行高、摘要换行、IN/OUT 堆叠、Inspect 常显）；
- 主要按钮触控热区 ≥44×44；
- 桌面端（>768px）行为零变化。

## 架构映射（file-level）

| 改动 | 位置（官方仓库） | 内容 |
|---|---|---|
| 断点 + 抽屉状态机 | `packages/client/ui-layout/src/`（layout store） | `LayoutState` 增加 `narrow: boolean`（matchMedia ≤768px 驱动）与 `drawerOpen: boolean`；`toggleSidebar()` 在窄屏下切换 drawerOpen。**单一事实源**取代插件的 `data-mobile-nav` 属性机 |
| 响应式布局样式 | `packages/client/ui-layout/src/AppFrame.module.css` | 窄屏媒体查询：grid 改为 `0 minmax(0,1fr) 0`，sidebarCol 变 `position: fixed` 抽屉；不依赖类名后缀，直接改组件样式 |
| 抽屉遮罩/层级 | 同上 + `packages/client/ui-theme/src/styles/` | 抽屉宽度 `min(82vw, 320px)`；遮罩 z-index 低于设置 dialog（`body:has([role="dialog"])` 时降级） |
| 浮动导航按钮 | 复用现有 `shell.overlay` slot（ui-layout SlotMap 已声明），或新增 `shell.mobileNav` | 44×44 按钮，样式用 `--dsw-alias-button-floating-*` token（10px 圆角，与 AppFrame 浮动手柄一致）；点击驱动 store 的 drawerOpen |
| 会话顶栏避让 | `packages/client/ui-conversation/src/client/skeleton/ConversationSession.tsx` | 窄屏下 titleRow 左内边距 56px（给浮动按钮让位），面包屑 `text-overflow: ellipsis` 截断；官方版可在 header 内直接布局 |
| 抽屉品牌行避让 | `packages/client/ui-sidebar/src/client/`（logo 行） | 窄屏抽屉打开时 logo 行左内边距 56px，浮动按钮不遮 logo |
| 设计 token | `packages/client/ui-theme/src/styles/` | 新增 `--dsw-*`：`--dsw-mobile-breakpoint`、`--dsw-drawer-width`、`--dsw-safe-area-bottom`（fallback `env(safe-area-inset-bottom)`） |
| composer 安全区 | `packages/client/ui-conversation/src/client/skeleton/InputBar.tsx` | `padding-bottom: env(safe-area-inset-bottom)`；输入框 min-height 40px + `font-size: 16px`（防 iOS 聚焦缩放） |
| 排队 dock（QueueDock） | `packages/client/ui-conversation/src/client/queue/QueueDock.tsx` | 窄屏下列表 `max-height: 35vh; overflow-y: auto`，长队列在 dock 内滚动，不撑爆视口 |
| 任务清单（TodoPanel） | `packages/client/ui-conversation/src/client/skeleton/TodoPanel.tsx` | 窄屏下列表 `max-height: 30vh; overflow-y: auto`，长计划同样内部滚动 |
| 轨迹面板触摸滚动 | `packages/client/ui-trajectory/src/` | `overflow-y: auto` + `-webkit-overflow-scrolling: touch` |
| 设置面板全屏 | `packages/client/ui-settings/src/` | ≤768px：`100vw × 100dvh`，左侧 188px 导航改顶部横向 tab 条 |
| 工具调用行 | `packages/client/ui-tool/src/` | 最小高度 40px、摘要换行、IN/OUT 单列堆叠、Inspect 触屏常显 |
| Markdown 表格 | ui-conversation 消息渲染 | 窄屏 `display: block; overflow-x: auto`，杜绝横向撑破视口 |
| 触控热区 | 各按钮组件 CSS（`::after` 扩展） | 主要按钮 ≥44×44，`overflow: visible` |

> **插件侧使用的稳定钩子**（本仓库实现已用，官方实现可据此映射）：
> `[data-phase] header`（会话顶栏）、`[data-composer-seat]`、`[data-composer-card]`、
> `[data-queue-dock]`、`[data-testid="todo-panel"]`、`[data-chat-flow]`、
> `[data-conversation-scroll]`。这些 data 属性随内置组件长期稳定，比 CSS-module
> 哈希类名可靠。

## 状态机设计（替代插件的 DOM 属性方案）

插件当前用 `html[data-mobile-nav]` + MutationObserver 同步。官方版本应把状态收进
ui-layout store，组件通过框架 hook 读，**删除所有 DOM 属性读写与 MutationObserver**：

```
viewport ≤768px ──> store.narrow = true
store.narrow && store.sidebarCollapsed ──> drawerOpen = false（抽屉闭合态）
toggleSidebar()（窄屏）──> drawerOpen = !drawerOpen
选择会话 / 遮罩点击 / Esc ──> drawerOpen = false
viewport >768px ──> store.narrow = false，drawer 状态归零，恢复桌面布局
```

自动关闭抽屉的触发点（session 选择、工作区选择）在 ui-layout 或对应领域内通过
store action 收敛，不再用 document 级 click capture。

## 测试策略（官方门禁对齐）

- **组件 spec**（vitest + jsdom）：drawer 开关、遮罩点击关闭、窄屏初始态、
  composer safe-area class、设置面板全屏切换——mock viewport，断言用户可见行为；
- **store spec**：narrow/drawerOpen 状态迁移；
- **快照**（`DSH_SNAPSHOT=replay pnpm run test:web`）：390px 与 1440px 各一帧组装产物；
- 纯函数（断点判断、抽屉宽度计算）单测。

## 从插件迁移的对照表

| 插件实现 | 官方实现 | 处置 |
|---|---|---|
| `html[data-mobile-nav]` 属性 + MutationObserver | layout store 字段 + hook | 删除 |
| `:global([class$="_xxx"])` 后缀选择器 | 直接改组件 module CSS + token | 删除（本方案核心收益） |
| `shell.overlay` 浮动按钮 | 同一 slot（或新 `shell.mobileNav`） | 迁移组件代码 |
| document click capture 关抽屉 | store action 收敛 | 删除 |
| matchMedia 监听 | store 内响应式订阅 | 迁移 |

## 开放问题

1. 浮动按钮放 `shell.overlay` 还是新增 `shell.mobileNav` slot？（前者零 SlotMap 改动，后者语义更清晰）
2. 抽屉宽度、断点值是否进 token 可配置？（建议 `Config` 字段，默认 768px / `min(82vw,320px)`）
3. 设置面板顶部 tab 条的滚动/激活态视觉规范需 UI 确认。
4. 官方是否同步处理"手机浏览器无图片上传入口"（discussion #625）——建议一并纳入。

## 落地路径建议

1. 本方案先在 discussion 公示（可贴 #1721 下），收集官方与社区反馈；
2. 官方有回应后，按本方案在 fork 中实现 PR-ready 分支（组件 + store + token + 测试）；
3. 合并顺序建议：token → store 状态机 → 布局/抽屉 → composer/trajectory → 设置面板 → 工具行。
