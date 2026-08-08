# 问题交接单：深色模式入口去重 + 菜单分组调整（2026-08-08）

> 审查窗口产出，**交付开发窗口执行**；审查窗口不修改代码。
> 用户需求（已确认）：① 深色模式设置入口从"偏好设置"移到 Halo 官方"外观"分组；② 移除侧边栏底部注入的切换按钮（与菜单入口重复，用户判定多余）。
> 前置说明：真实环境取证于 `blog.liuhangyv.top/console`（已登录），见"问题描述"。

## 一、问题描述

### 问题 1：深色模式存在两个入口，功能重复

当前 Halo 后台对"深色模式"有两个入口：

- **入口 A（侧边栏底部切换按钮）**：插件注入的 `ThemeToggle` 按钮（显示"浅色模式 / 深色模式"，点击一键切换）。
- **入口 B（侧边栏菜单项）**：「偏好设置 → 深色模式」设置页（浅色 / 深色 / 跟随系统三选一）。

用户观察到侧边栏底部有两个"切换"类入口，底部注入的按钮闲置不用，判定没有必要，要求移除。

**真实环境取证结果**（消除歧义）：
- 侧边栏底部**只有 1 个**主题切换按钮：插件注入的 `plugin-dark-mode-toggle`（位于 `sidebar__profile` 上方），工作正常。
- 用户信息区（`user-profile__actions`）另外两个图标按钮是 Halo 官方「个人资料（跳 /uc）」和「退出登录」——已核对官方源码 `ui/src/layouts/UserProfileBanner.vue`，**不是**主题切换。
- 因此用户所说的"两个切换按钮" = 入口 A（底部注入按钮）+ 入口 B（菜单项），二者功能重复，保留其一即可。

### 问题 2：设置页入口挂在自建分组"偏好设置"下

- 现状：菜单 `group` 为字符串 `'偏好设置'`。这不是 Halo 标准分组 key，Halo 找不到对应 i18n 翻译，直接将该字符串作为分组标题显示，于是在侧边栏多出"偏好设置"分组（其中只有"深色模式"一项）。
- 期望：放入 Halo 官方**「外观」**分组（主题 / 菜单 / 插件所在）。
- 背景：Halo 2.25 官方分组 key（`halo-dev/halo` `ui/console-src/router/constant.ts`）：`dashboard`、`content`、`interface`、`system`、`tool`。其中 **`interface` 即"外观"**（实测该分组内已有主题 / 菜单 / 插件）。

## 二、问题在代码中的具体体现

| # | 文件 | 位置 | 说明 |
| --- | --- | --- | --- |
| 1 | `ui/src/index.ts` | L5 | `import { injectThemeToggle } from './injector'` |
| 2 | `ui/src/index.ts` | L7-L8 | 模块加载时执行 `injectThemeToggle()` → 注入入口 A |
| 3 | `ui/src/index.ts` | L26 | `group: '偏好设置'` → 自建字面量分组（入口 B 位置错误） |
| 4 | `ui/src/injector.ts` | 全文 | 入口 A 的注入器：`CONTAINER_CLASS = 'plugin-dark-mode-toggle'`（L4）、`TARGET_SELECTOR = '.sidebar__profile'`（L5）、`injectThemeToggle()` 用 `MutationObserver` 等待侧边栏渲染（L13-L31）、`tryMount()` 将容器插入 profile 上方并 `render(ThemeToggle)`（L33-L48） |
| 5 | `ui/src/components/ThemeToggle.vue` | 全文 | 入口 A 的按钮本体（class `theme-toggle`，文案"浅色模式 / 深色模式"） |

**连带影响（改动入口 A 时必须同步处理）：**

| # | 文件 | 位置 | 影响 |
| --- | --- | --- | --- |
| 6 | `scripts/verify-toggle.py` | L40-L43 | 依赖 `.theme-toggle` 定位点击验证，移除按钮后脚本失效 |
| 7 | `README.md` | L11 / L19 / L23 / L111 / L116 / L130 / L138 | 多处描述"侧边栏一键切换 / UserProfileBanner / 注入器" |
| 8 | `CLAUDE.md` / `AGENTS.md` | L54 / L59 / L86-L88 | 架构树与"ThemeToggle 侧边栏注入"章节（gitignored，本地维护） |

**不涉及**：`useDarkMode.ts`、`darkreader-engine.ts`、`SettingsView.vue` 均无需改动（入口 B 及其状态管理完全独立）。

## 三、修改建议（供开发窗口执行）

### 推荐方案：移分组 + 移除侧边栏注入按钮

1. **`ui/src/index.ts`**
   - L26：`group: '偏好设置'` → `group: 'interface'`（进入"外观"分组）
   - L5：删除 `import { injectThemeToggle } from './injector'`
   - L7-L8：删除调用与注释
2. **删除文件（需用户书面确认，AGENTS.md 约定）**
   - `ui/src/injector.ts`
   - `ui/src/components/ThemeToggle.vue`
3. **`scripts/verify-toggle.py`**
   - 移除 L40-L43 对 `.theme-toggle` 的点击依赖
   - 改为直接驱动状态 + 断言，例如：`localStorage.setItem('halo-dark-mode-theme', 'dark'/'light')` 后断言 `data-halo-theme`、`data-darkreader-mode`、`color-scheme` 翻转；保留现有三向 PASS 判定逻辑
4. **文档同步**
   - `README.md`：功能特性去掉"侧边栏一键切换"、使用说明改为"进入「外观 → 深色模式」"、项目结构删除 injector/ThemeToggle 两行、验证脚本描述更新
   - `CLAUDE.md` / `AGENTS.md`：删除"ThemeToggle 侧边栏注入"章节，更新架构树
5. **构建与回归**
   - `cd ui && pnpm build`、`pnpm type-check`、`pnpm prettier`、`pnpm lint`、`pnpm test:unit`
   - 根目录 `gradlew build`
   - 部署后跑 `scripts/verify-toggle.py`（改版后）

### 备选方案：仅移分组（保留侧边栏按钮）

- 只改 `ui/src/index.ts` L26 为 `'interface'`；验证脚本与文档均不用动。
- 适合希望保留"一键切换"快捷方式的场景；但无法满足用户"移除多余按钮"的诉求。

## 四、注意事项

- **删除文件必须先获得用户书面同意**（项目 AGENTS.md 明确"未经书面同意不得删除任何文件"）；用户本意是"没必要保留入口 A"，可据此向用户确认后执行。
- 移除入口 A 后，设置页（`SettingsView.vue`）成为唯一入口，属预期结果，保留即可。
- `useDarkMode` 的 localStorage 持久化、storage 跨标签同步、Dark Reader 引擎均与入口 A 无关，不受影响。
- 版本号建议随本次改动递增（如 1.0.6），并同步 `plugin.yaml`（如需）与 `@since`。