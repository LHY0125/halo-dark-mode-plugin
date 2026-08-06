# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Halo 暗色模式插件 — 为 Halo 2.25 后台管理面板提供深色/浅色模式切换。不修改 Halo 核心代码，完全通过插件机制实现。

**核心技术栈**：Java 21（后端插件骨架）、Vue 3 + TypeScript（前端 UI）、OKLCH 色彩空间（CSS 变量体系）、Gradle（构建）

## 常用命令

```bash
# 后端 — 启用插件并启动 Halo 开发服务器
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
│   ├── composables/
│   │   ├── useDarkMode.ts          ← 单例状态管理（light/dark/auto + localStorage 持久化）
│   │   └── useSystemPreference.ts  ← matchMedia 系统偏好监听
│   ├── components/
│   │   └── ThemeToggle.vue         ← 侧边栏切换按钮
│   ├── views/
│   │   └── SettingsView.vue        ← 设置页面（浅色/深色/跟随系统 三选一）
│   └── styles/
│       ├── variables.css           ← 40+ CSS 变量（:root 浅色 + [data-halo-theme="dark"] 深色）
│       └── overrides/              ← 按区域分层覆盖（layout/components/forms/editor/scrollbar/utilities）
│
└── 构建链
    └── processUiResources          ← Gradle task: ui/dist/ → resources/main/ui/
```

## 关键设计决策

### 主题切换机制

- **触发方式**：`document.documentElement` 上设置/移除 `data-halo-theme="dark"` 属性
- **CSS 变量体系**：所有颜色通过 `--halo-*` 前缀的 CSS 自定义属性控制，一个语义变量对应一个视觉属性
- **颜色空间**：全部使用 OKLCH（感知均匀，暗色模式天然适配，Chrome 111+/Firefox 113+/Safari 15.4+）
- **暗色配色策略**：用亮度层次区分背景（越"高"的层越亮），中性色含微量蓝色调，强调色略降饱和

### 状态管理

- `useDarkMode()` 是**模块级单例** — 所有组件共享同一份 `theme` ref 和 `isDark` computed
- 三个主题模式：`light` / `dark` / `auto`（跟随系统）
- 持久化：`localStorage` key `halo-dark-mode-theme`，默认 `auto`
- FOUC 防护：插件 bundle 顶部同步执行脚本，DOM 渲染前设置 `data-halo-theme`

### 前端入口

- `definePlugin()` 从 `@halo-dev/ui-shared` 导入（非 `@halo-dev/console-shared`，那是旧版 plugin-starter 的源）
- 路由使用 `() => import(...)` 懒加载
- 构建使用 `@halo-dev/ui-plugin-bundler-kit` 的 `viteConfig()` 包装器

### 覆盖策略

三级渐进覆盖：
1. **CSS 变量注入**（~80% 场景）— 通过 `--halo-*` 变量重定义 Tailwind 颜色语义
2. **选择器覆盖**（~17% 场景）— `[data-halo-theme="dark"]` 前缀高特异性选择器
3. **组件穿透**（~3% 场景）— FormKit/编辑器等第三方组件的自有 CSS 变量接口

### 后端

后端极简 — `DarkModePlugin extends BasePlugin` 仅含 `start()`/`stop()` 生命周期钩子。所有核心逻辑在前端。插件不依赖后端 Setting API。

## 项目文档

- `设计文档.md` — 完整的技术设计（架构图、CSS 变量清单、调色板、组件覆盖策略、实现阶段划分、测试策略）
- `调查文档.md` — 技术调查（create-halo-plugin vs plugin-starter 差异、dev-skills、Halo 插件机制）
- `README.md` — 用户向 README
