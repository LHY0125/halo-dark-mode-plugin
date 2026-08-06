# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Halo 暗色模式插件 — 为 Halo 2.25 后台管理面板提供深色/浅色模式切换。不修改 Halo 核心代码，完全通过插件机制实现。

**核心技术栈**：Java（插件骨架，编译目标 21）、Vue 3 + TypeScript（前端 UI）、OKLCH 色彩空间（CSS 变量体系）、Gradle（构建）。

**⚠️ 构建环境**：本机没有 JDK 21，构建必须使用 JDK 25（路径已硬编码在 `gradle.properties` 的 `org.gradle.java.home`）。`options.release = 21` 保证字节码兼容 Halo API。不要改回 toolchain 方式——那会因找不到 JDK 21 而失败。

## 常用命令

```bash
# 后端 — 启用插件并启动 Halo 开发服务器（需要 Docker）
./gradlew haloServer

# 后端 — 构建插件 JAR（产物在 build/libs/）
./gradlew build

# 前端 — 进入 ui/ 开发
cd ui && pnpm install

# 前端 — 开发模式（watch 构建）
pnpm dev

# 前端 — 生产构建
pnpm build

# 前端 — 类型检查
pnpm type-check

# 前端 — Lint（oxlint + eslint）
pnpm lint

# 前端 — 格式化
pnpm prettier

# 前端 — 单元测试
pnpm test:unit

# 后端 — 仅运行 Java 测试
./gradlew test
```

## 架构概览

```
halo-dark-mode-plugin/
├── 后端 (Java/Gradle)              ← 插件骨架，极简
│   ├── DarkModePlugin.java         ← 继承 BasePlugin，仅 start()/stop()
│   └── plugin.yaml                 ← 插件清单（声明式元数据 + 版本约束）
│
├── 前端 (Vue 3 / TypeScript)       ← 核心实现
│   ├── index.ts                    ← definePlugin() 入口，注册路由+组件
│   ├── injector.ts                 ← ThemeToggle 侧边栏注入器（MutationObserver 方案）
│   ├── composables/
│   │   ├── useDarkMode.ts          ← 单例状态管理（light/dark/auto + localStorage 持久化）
│   │   └── useSystemPreference.ts  ← matchMedia 系统偏好监听
│   ├── components/
│   │   └── ThemeToggle.vue         ← 侧边栏切换按钮
│   ├── views/
│   │   └── SettingsView.vue        ← 设置页面（浅色/深色/跟随系统 三选一）
│   └── styles/
│       ├── index.css               ← 样式入口（@import 聚合）
│       ├── variables.css           ← 40+ CSS 变量（:root 浅色 + [data-halo-theme="dark"] 深色）
│       └── overrides/
│           ├── halo-core.css       ← ★ 核心：真实 DOM 类名覆盖（最重要）
│           ├── layout.css          ← 侧边栏/内容区/页脚
│           ├── components.css      ← 旧版组件类覆盖（部分已失效，见下）
│           ├── forms.css / editor.css / scrollbar.css / utilities.css
│
└── 构建链
    └── processUiResources          ← Gradle task: ui/dist/ → resources/main/ui/
```

## 关键设计决策

### 主题切换机制

- **触发方式**：`document.documentElement` 上设置/移除 `data-halo-theme="dark"` 属性
- **CSS 变量体系**：所有颜色通过 `--halo-*` 前缀的 CSS 自定义属性控制，一个语义变量对应一个视觉属性
- **颜色空间**：全部使用 OKLCH（感知均匀，暗色模式天然适配）
- **暗色配色策略**：用亮度层次区分背景（越"高"的层越亮），中性色含微量蓝色调，强调色略降饱和

### ⚠️ 最关键的教训：Halo 2.25 用 UnoCSS，不是 Tailwind

Halo 2.25 的 Console 实际使用 **UnoCSS**（hash 类如 `uno-*`）加 **BEM 语义类**。**不要写 `.bg-white`、`.text-gray-900`、`.v-card` 这类 Tailwind/Vuetify 原子选择器**——它们在真实 DOM 中不存在，覆盖会静默失效。

真实 DOM 里的容器类名（已被 `halo-core.css` 覆盖）：

| 语义 | 真实类名 |
|------|---------|
| 页面顶栏 | `.page-header` / `.page-header__title-text` |
| 列表卡片容器 | `.card-wrapper` |
| 文章/用户列表项标题 | `.entity-field-title` / `.entity-field-title-body` |
| 分页 | `.pagination` / `.pagination__btn` |
| 标签 | `.tag-default` / `.tag-content` |
| 模态框 | `.modal-content` / `.modal-header` / `.modal-body` / `.modal-footer` |
| 详情页描述项 | `.description-item-wrapper` / `.description-item__label` / `.description-item__content` |
| Toast | `.toast-container .toast-body` |
| 用户头像 | `.avatar-wrapper` / `.avatar-circle` |

新增覆盖时：**先到真实环境确认类名，不要凭经验写**。

### 覆盖策略（重写后）

`halo-core.css` 是主要覆盖文件，按语义类精准覆盖。它包含三类规则：
1. **BEM 语义类**（如 `.card-wrapper`）— 直接 `[data-halo-theme="dark"] .card-wrapper { background-color: var(--halo-bg-card) }`
2. **通用 UnoCSS 工具类**（如 `.bg-gray-50`、`.hover:text-gray-600`）— 批量覆盖文字/背景/边框
3. **根背景兜底** — `html, body { background-color: var(--halo-bg-body) !important }`（body 不设暗色会在溢出时露白）

`components.css` 等旧文件里的 Tailwind/Vuetify 选择器部分已失效，保留但优先维护 `halo-core.css`。

### 状态管理

- `useDarkMode()` 是**模块级单例** — 所有组件共享同一份 `theme` ref 和 `isDark` computed
- 三个主题模式：`light` / `dark` / `auto`（跟随系统）
- 持久化：`localStorage` key `halo-dark-mode-theme`，默认 `auto`
- FOUC 防护：插件 bundle 顶部同步执行脚本，DOM 渲染前设置 `data-halo-theme`

### ThemeToggle 侧边栏注入

Halo 扩展点系统**没有侧边栏插槽**。`injector.ts` 用 `MutationObserver` 监听 `.sidebar__profile` 元素出现，在其上方插入容器并挂载 `ThemeToggle.vue` 组件。这是当前 Halo 插件体系下的合理变通方案。

### 前端入口

- `definePlugin()` 从 `@halo-dev/ui-shared` 导入（非旧版 `@halo-dev/console-shared`）
- 路由使用 `() => import(...)` 懒加载
- 构建使用 `@halo-dev/ui-plugin-bundler-kit` 的 `viteConfig()` 包装器

### 后端

后端极简 — `DarkModePlugin extends BasePlugin` 仅含 `start()`/`stop()` 生命周期钩子。所有核心逻辑在前端。插件不依赖后端 Setting API。

## 验证工作流（必须）

对 CSS 覆盖的任何改动，都要在**真实 Halo 环境**验证，不能只靠 `vite build` 通过：

1. 打开官方 demo 站 `https://demo.halocms.site/console`，登录 `demo / P@ssw0rd123..`
2. 用 Playwright 的 `page.addStyleTag({ path: 'ui/build/dist/style.css' })` 注入构建产物，并 `document.documentElement.setAttribute('data-halo-theme', 'dark')`
3. 遍历页面，扫描 `main *` 中残留的白色背景（`rgb(255,255,255)` 且尺寸 >100×40）和深色文字（`rgb(17,24,39)` 等）元素，记录其真实类名
4. 新增覆盖后重新构建、重新注入、重新扫描，直到零残留
5. 最终 `./gradlew build` 打 JAR，确认 `ui/style.css` 已更新

第三方插件页面（链接/订阅/瞬间等）在 demo 站已装，可一并验证。

## 项目文档

- `设计文档.md` — 完整的技术设计（架构图、CSS 变量清单、调色板、组件覆盖策略、实现阶段划分、测试策略）
- `调查文档.md` — 技术调查（create-halo-plugin vs plugin-starter 差异、dev-skills、Halo 插件机制）
- `README.md` — 用户向 README
