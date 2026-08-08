# Halo 深色模式

为 Halo 后台管理面板提供深色/浅色模式切换，内置 Dark Reader 通用暗色引擎，支持手动切换、跟随系统与偏好记忆。

## 功能特性

- **三种模式**：浅色、深色、跟随系统
- **偏好持久化**：自动记忆用户选择（localStorage），刷新不丢失
- **系统偏好跟随**：切换系统外观时自动响应
- **Dark Reader 引擎**：自动分析页面 CSS 与 DOM，覆盖 Halo 核心页面和第三方插件页面
- **侧边栏一键切换**：切换按钮自动出现在侧边栏 UserProfileBanner 上方
- **设置页面**：在「偏好设置 → 深色模式」中详细选择显示模式
- **零后端依赖**：纯前端实现，不需要额外后端 API

## 安装

1. 从 Releases 下载 `plugin-dark-mode-<version>.jar`。
2. 在 Halo 后台的「插件管理」中上传并安装。
3. 启用插件后，侧边栏底部会出现深色模式切换按钮。

## 使用

安装并启用后，可以直接点击侧边栏按钮在深色和浅色模式之间切换，也可以进入设置页面选择固定模式：

| 配置项   | 可选值    | 说明                 |
| -------- | --------- | -------------------- |
| 主题模式 | `light` | 始终使用浅色模式     |
| 主题模式 | `dark`  | 始终使用深色模式     |
| 主题模式 | `auto`  | 跟随系统外观自动切换 |

## 技术原理

- 插件通过 `useDarkMode()` 管理 `light` / `dark` / `auto` 三种状态。
- 深色模式下调用 Dark Reader 的 `enable()`，浅色模式下调用 `disable()`。
- Dark Reader 会持续监听页面 DOM 变化，因此第三方插件动态渲染的内容也能自动转换。
- 插件自身只保留切换器与设置页所需的最小 UI 变量，不再维护逐页手工 CSS 覆盖。

> 说明：Dark Reader 的样式注入是异步的，刷新瞬间仍可能存在极短闪白；插件通过同步设置 `color-scheme` 缓解，但无法完全消除。

## 第三方依赖

- [Dark Reader](https://github.com/darkreader/darkreader) `4.9.129`，[MIT License](https://github.com/darkreader/darkreader/blob/main/LICENSE)。
- 构建所需文件位于 `third-party/darkreader/`，由 `ui/package.json` 通过本地文件依赖引用。
- 升级或替换 Dark Reader 构建文件后，请校验 `third-party/darkreader/SHA256SUMS`：
  Linux / macOS 使用 `sha256sum -c SHA256SUMS`，Windows 使用 `Get-FileHash -Algorithm SHA256` 对比。

## 开发环境

- Halo `>=2.25.0`
- Java 21+（项目使用 `--release 21` 编译）
- Node.js 18+
- pnpm
- Docker（`haloServer` 开发服务器需要）

## 从源码构建

仓库使用标准 Gradle 结构，并提交了 Gradle Wrapper。

Linux / macOS：

```bash
./gradlew clean build
```

Windows：

```powershell
.\gradlew.bat clean build
```

构建产物位于 `build/libs/plugin-dark-mode-<version>.jar`。

## 前端开发

```bash
cd ui
pnpm install
pnpm dev
```

常用检查命令：

```bash
pnpm type-check   # TypeScript 类型检查
pnpm lint         # Lint（oxlint + eslint）
pnpm build        # 生产构建
```

## 项目结构

```text
├── build.gradle              # 根构建配置
├── settings.gradle           # 包含 :ui 子项目
├── gradle/wrapper/           # Gradle Wrapper
├── src/
│   └── main/
│       ├── java/run/halo/darkmode/
│       │   └── DarkModePlugin.java    # 插件主类（极简骨架）
│       └── resources/
│           └── plugin.yaml            # 插件清单
│
├── third-party/
│   └── darkreader/           # Dark Reader 构建产物（MIT）
│
└── ui/
    ├── package.json          # 前端依赖
    ├── vite.config.ts        # Vite 配置
    └── src/
        ├── index.ts                   # definePlugin 入口
        ├── darkreader-engine.ts       # Dark Reader 通用暗色引擎
        ├── injector.ts                # 侧边栏切换器注入
        ├── composables/
        │   ├── useDarkMode.ts         # 主题状态管理（模块级单例）
        │   └── useSystemPreference.ts # 系统偏好监听
        ├── components/
        │   └── ThemeToggle.vue        # 侧边栏切换按钮
        ├── views/
        │   └── SettingsView.vue       # 设置页面
        └── styles/
            ├── index.css              # 样式入口
            └── variables.css          # 插件自身 UI 变量
```

## 测试

```bash
./gradlew test
```

运行时验证脚本位于 `scripts/verify-toggle.py`，用于检查主题切换、localStorage 持久化以及 Dark Reader 注入状态。

## 更新日志

### v1.0.5

- 同步设置 `color-scheme`，缓解深色模式刷新闪烁
- 增加多标签页主题同步与 `useDarkMode` 单元测试
- 侧边栏切换按钮与设置选项支持键盘操作
- 后端日志改用 Lombok `@Slf4j`
- 裁剪 vendored `package.json`，新增 Dark Reader `SHA256SUMS` 完整性校验
- `plugin.yaml` 改为安装后由用户手动启用

### v1.0.4

- 改为纯 Dark Reader 引擎，移除手工 CSS 覆盖
- 移除 Monaco 手动主题同步，暗色转换统一交给 Dark Reader
- 整理 `third-party/darkreader` 目录，仅保留构建所需文件

### v1.0.3

- 引入 Dark Reader 通用暗色引擎
- 保留原有手工 CSS 作为兼容层，覆盖核心页面与第三方插件页面
- 增加 Monaco 日志查看器主题同步

## 许可证

[GPL-3.0](./LICENSE) © LHY
