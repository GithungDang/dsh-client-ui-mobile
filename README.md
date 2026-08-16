# dsh-client-ui-mobile

移动端布局增强插件，用于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 `dsh web` 界面。这是一个**增量插件**：不替换内置布局，只在窄屏（≤768px）下做移动端适配。

## 功能

- 手机宽度隐藏左侧 56px sidebar rail，聊天区全宽；
- 左上角 44×44 浮动导航按钮，点击把内置 sidebar 展开为抽屉（fixed overlay）；
- 遮罩只覆盖抽屉右侧，抽屉内按钮可正常点击；
- 设置面板手机端全屏 + 顶部横向导航；
- 工具调用行手机端可读性优化（更高行高、摘要换行、IN/OUT 堆叠、Inspect 常显）；
- 触控热区扩展（主要按钮 ≥44×44 可点区域）；
- 桌面宽度完全不受影响。

## 要求

- `dsh web`（Harness 0.1 系列）
- 运行时依赖内置 `@deepseek-ai/dsh-client-runtime` 与 `@deepseek-ai/dsh-client-ui-layout` 提供的 `ctx.layout` 服务和 `shell.overlay` slot（随 `dsh web` 自带，无需单独安装）

## 安装

### 方式一：`dsh plugin add`（推荐）

本包声明了 `dsh.bundle`，安装后会自动挂载为 profile 配置层：

```sh
# 从 npm
dsh plugin --profile web add dsh-client-ui-mobile

# 或从 git（需要作者侧 prepare 脚本 + 首次 add 需在 profile 的 pnpm-workspace.yaml 里 allowBuilds）
dsh plugin --profile web add github:you/dsh-client-ui-mobile#<commit>

# 或本地目录 / tarball
dsh plugin --profile web add ./dsh-client-ui-mobile
dsh plugin --profile web add ./dsh-client-ui-mobile-0.1.0.tgz
```

重启 `dsh web` 后生效，打开 `http://127.0.0.1:13080` 即可看到浮动导航按钮。

### 方式二：手动 patch

把 `cordis.patch.yml` 的内容追加到 profile 的 `cordis.patch.yml`（或 `dsh web --patch ./cordis.patch.yml`），并确保包可被 loader 解析（`dsh plugin add` 之外，也可软链到 `$DSH_HOME/profiles/node_modules/`）。

## 开发

```sh
pnpm install      # 首次（prepare 会自动构建）
pnpm build        # tsdown → lib/index.js + lib/client.js
pnpm typecheck    # tsc --noEmit
```

开发循环：改 `src/` → `pnpm build` → 刷新浏览器页面（dsh web 开发态有 HMR，bundle 变化自动推送）。改完重新 build 后刷新即可，无需重启服务。

## 如何工作

- **浏览器半身**（`src/client/index.ts`）在 `shell.overlay` slot 注册一个浮动导航按钮（`ctx.slots.register`），通过 `ctx.layout.toggleSidebar()` 复用内置侧边栏；
- **样式**（`src/client/MobileNavButton.module.css`）以 `data-mobile-nav` 属性驱动：手机端把内置 sidebar 变成 fixed 抽屉、隐藏 rail、适配设置面板和工具行；
- **节点半身**（`src/index.ts`）为空，仅让插件进入 loader；
- 所有副作用（slot 注册、事件监听、MutationObserver、matchMedia）都挂在 `ctx.effect()` 的 disposer 上，卸载即清理。

构建产物遵循 dsh web 的 client 插件契约：`lib/client.js` 是 CJS closure-factory（`window.__ModuleLoader__.load({ id, factory })`），CSS Modules 由 lightningcss 内联并注入 `<style data-plugin>` 标签。

## 已知限制

- 样式依赖内置组件的 CSS Modules 类名后缀（如 `[class$="_frame"]`、`[class$="_sidebarCol"]`）。上游若修改类名生成策略，本插件需要同步适配；
- 抽屉打开时不锁定背景滚动；
- 不提供过渡动画（有意为之）。

## License

MIT
