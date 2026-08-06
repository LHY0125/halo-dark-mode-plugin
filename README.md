# dark-mode

Halo 2.25 暗色模式插件 — 为 Halo 后台管理面板提供深色/浅色模式切换，支持跟随系统、手动切换和偏好记忆。

## 功能

- ☀️/🌙 **三种模式**：浅色、深色、跟随系统
- 💾 **偏好持久化**：自动记忆用户选择（localStorage），刷新不丢失
- 🖥️ **系统偏好跟随**：切换系统外观时自动响应
- ⚡ **瞬间切换**：CSS 变量瞬时生效，无可见闪烁
- 🧩 **侧边栏注入**：切换按钮自动出现在侧边栏底部（UserProfileBanner 上方）
- ⚙️ **设置页面**：提供详细的模式选择界面（菜单 → 偏好设置 → 深色模式）
- 🎨 **OKLCH 色彩空间**：感知均匀，暗色模式天然适配，WCAG AA 对比度保证
- 📦 **零后端依赖**：纯前端实现，不需要后端 API

## 开发环境

- Java 21+
- Node.js 18+
- pnpm

## 快速开始

```bash
# 启用插件并启动 Halo 开发服务器
./gradlew haloServer

# 前端开发（watch 模式）
cd ui
pnpm install
pnpm dev
```

## 构建

```bash
# 完整构建（后端 + 前端）
./gradlew build
```

构建完成后，插件 JAR 文件位于 `build/libs/`，可直接在 Halo 后台安装。

## 前端命令

```bash
cd ui

pnpm dev           # 开发构建（watch）
pnpm build         # 生产构建
pnpm type-check    # TypeScript 类型检查
pnpm lint          # Lint（oxlint + eslint）
pnpm prettier      # 代码格式化
pnpm test:unit     # 单元测试
```

## 项目结构

```
├── build.gradle              # 根构建（BOM 2.25.0, DevTools 0.8.0）
├── settings.gradle           # 包含 :ui 子项目
├── src/
│   └── main/
│       ├── java/run/halo/darkmode/
│       │   └── DarkModePlugin.java    # 插件主类（极简骨架）
│       └── resources/
│           └── plugin.yaml            # 插件清单
│
└── ui/
    └── src/
        ├── index.ts                   # definePlugin 入口
        ├── injector.ts                # ThemeToggle 侧边栏注入器
        ├── composables/
        │   ├── useDarkMode.ts         # 核心状态管理（模块级单例）
        │   └── useSystemPreference.ts # 系统偏好监听
        ├── components/
        │   └── ThemeToggle.vue        # 侧边栏切换按钮
        ├── views/
        │   └── SettingsView.vue       # 设置页面
        └── styles/
            ├── index.css              # 样式入口
            ├── variables.css          # 40+ CSS 变量（浅色 + 深色）
            └── overrides/             # 组件覆盖样式
```

## 许可证

[GPL-3.0](./LICENSE) © LHY
