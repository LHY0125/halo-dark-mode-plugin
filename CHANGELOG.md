# 更新日志

Halo 深色模式插件（`top.liuhangyv.darkmode`）的显著变更记录。版本号遵循[语义化版本（Semantic Versioning）](https://semver.org/lang/zh-CN/)规范：`MAJOR.MINOR.PATCH`。

## 定位

本文件是 GitHub Release 发布说明与 Halo 应用市场插件介绍的**唯一日志来源**。发版链路（本地 `scripts/release.sh`、CI `.github/workflows/release.yml`）执行发版时，均从本文件提取当前版本的段落作为正式发布日志——日志撰写一次，多渠道复用，杜绝各自维护造成的差异。

## 维护约定

1. **随开发更新**：每次功能落地即新增或修订对应版本段落，不得在发版时临时补写。
2. **面向用户**：以最终用户视角描述——新增了什么、修复了什么、行为有何变化、升级需注意什么、如何验证，而非 commit 式的内部表述。
3. **历史同步**：已发布版本的记录与线上 GitHub Release 保持一致；两者不一致时以线上为准回写本文件。

## 格式规范

- 版本标题：`## vX.Y.Z（YYYY-MM-DD）`，按时间倒序排列，最新版本置顶。
- 小节分类：`### 新增 / 调整 / 修复 / 行为变化 / 验证`，无内容的小节可省略。
- 变更条目：以 `-` 列表呈现，语义明确，指向具体功能或行为。

## 历史说明

> v1.0.5 之前的版本无独立 Release 记录，历史变更见 [GitHub Releases](https://github.com/LHY0125/halo-dark-mode-plugin/releases)。

## v1.1.3（2026-08-14）

### 调整
- 移除 3 个未使用的生产依赖（`axios`、`canvas-confetti`、`@halo-dev/api-client`），缩小依赖审计面与产物体积
- 通过 `pnpm-workspace.yaml` overrides 将间接依赖 `glob`（10.4.5 → 10.5.0）与 `nanoid`（3.3.17 → 3.3.18）升级到修复版本，`pnpm audit --audit-level=high` 结果归零
- Gradle Wrapper 补充 `distributionSha256Sum`（Gradle 9.4.0 官方哈希）并开启 `validateDistributionUrl=true`，防止发行版被篡改
- CI 发版流程新增依赖安全审计步骤（官方 registry），存在 high 级漏洞时阻止发版

### 验证
- `pnpm type-check` / `lint` / `test:unit`（8 例）/ `build` 全绿
- `pnpm audit --audit-level=high --registry=https://registry.npmjs.org/` 输出 0 vulnerabilities
- `./gradlew build` 成功，JAR 内 Implementation-Version 为 1.1.3

### 说明
- 功能零变化，仅构建/依赖/供应链加固；覆盖安装即可，原主题偏好保留

## v1.1.2（2026-08-13）

### 行为变化
- 插件自有 Java 包名由 `run.halo.darkmode` 迁移至 `top.liuhangyv.darkmode`，Gradle group 同步调整，符合 Halo 应用市场对保留命名空间的要求

### 说明
- 升级不影响既有主题偏好

### 验证
- 前端 8 项单元测试全部通过，`type-check` / `lint` / `build` 全绿
- `./gradlew build` 构建成功，JAR 内主类已为 `top.liuhangyv.darkmode.DarkModePlugin`

## v1.1.1（2026-08-13）

### 调整
- 设置页主题选项改用 Halo 官方 `VEntity` 单选列表组件，行高更紧凑，与官方后台风格统一

### 行为变化
- 模式选择由大卡片改为官方列表行：选中项以高亮背景 + 填充圆圈标识，点击整行切换

### 验证
- 前端 8 项单元测试全部通过，`type-check` / `lint` / `build` 全绿
- `./gradlew build` 构建成功

## v1.1.0（2026-08-12）

### 新增
- 更新插件 Logo 为新的深色风格图标
- README 新增截图预览：插件信息、模式选择、文章写作、仪表盘、主题界面

### 功能特性
- **三种主题模式**：浅色（`light`）、深色（`dark`）、跟随系统（`auto`）
- **偏好记忆**：自动将选择持久化到 localStorage，刷新不丢失
- **跟随系统**：`auto` 模式下切换系统外观时自动响应
- **Dark Reader 通用引擎**：自动转换 Halo 核心页面与第三方插件页面，动态渲染内容也能适配
- **官方外观分组**：设置入口位于 Halo「外观」分组，与主题、菜单、插件同组
- **零后端依赖**：纯前端实现，不依赖额外后端 API，安装即用

### 验证
- 前端 8 项单元测试全部通过，`type-check` / `lint` / `build` 全绿
- `./gradlew build` 构建成功，JAR 内 `ui/main.js` 包含 Dark Reader 引擎，`logo.png` 为新图标
- 切换深浅色后在 Halo 核心页面与第三方插件页面验证通过

### 升级说明
- 直接覆盖安装即可，原主题偏好会保留

## v1.0.9（2026-08-08）

### 新增
- 插件 Logo 更新为最终自定义版本
- README 新增「截图预览」，展示插件设置界面与后台深色模式效果

### 仓库整理
- 移除仓库内内部审查/计划文档，仅保留公开素材
- 提交 gradle wrapper jar，全新克隆可直接运行 `./gradlew` 构建

### 验证
- `pnpm type-check` / `lint` / `test:unit`（8 例）/ `build` 全部通过
- `./gradlew clean build` 成功，JAR 内 Implementation-Version 为 1.0.9

## v1.0.8（2026-08-08）

### 新增
- 深色模式设置页改用 Halo 官方组件实现，与官方后台页面风格统一：
  - `VPageHeader` 顶部标题栏（含图标）
  - `VCard` 内容卡片与官方 `m-0 md:m-4` 布局
  - `VDescription` / `VDescriptionItem` 展示「当前生效」
  - `VTag` 显示当前模式值

### 调整
- 三个模式选项（浅色 / 深色 / 跟随系统）保持原生按钮实现，交互不变
- 精简 `variables.css`，仅保留设置页实际使用的 CSS 变量

### 验证
- 组件源码已对照 halo-dev/halo 官方仓库与本地 `@halo-dev/components` 2.25.2 核实
- `pnpm prettier` / `type-check` / `lint` / `test:unit`（8 例）/ `build` 全部通过
- `./gradlew build` 成功，JAR 内 Implementation-Version 为 1.0.8

## v1.0.7（2026-08-08）

### 调整
- 移除设置页的方向键切换、roving tabindex、ARIA 单选组语义与焦点环，仅保留原生按钮点击切换，交互与 Halo 后台整体习惯保持一致

### 清理
- 删除 README 中已过时的「设置选项支持键盘操作」描述

### 行为变化
- 升级后，深色模式设置页不再响应方向键切换选项，请直接点击「浅色 / 深色 / 跟随系统」按钮

### 验证
- `pnpm prettier` / `type-check` / `lint` / `test:unit`（8 例）/ `build` 全部通过
- `./gradlew build` 成功，JAR 内 Implementation-Version 为 1.0.7

## v1.0.6（2026-08-08）

### 新增
- 深色模式设置入口移至 Halo 官方「外观」分组（与主题、菜单、插件同组），更符合 Halo 后台导航习惯

### 修复与调整
- 移除侧边栏底部注入的主题切换按钮，消除与菜单入口重复的切换控件，设置页成为唯一入口
- 更新运行时验证脚本 `verify-toggle.py`：不再依赖侧边栏按钮，改为直接驱动主题状态，校验 `data-halo-theme`、localStorage、Dark Reader 注入状态与 `color-scheme` 的翻转，并确认侧边栏按钮已移除

### 行为变化
- 升级后侧边栏底部不再显示「深色/浅色模式」按钮，请通过「外观 → 深色模式」设置页切换
- 已保存的主题偏好（localStorage）继续生效，无需重新设置

### 验证
- `pnpm type-check` / `lint` / `test:unit`（8 例）/ `build` 全部通过
- `./gradlew build` 成功，JAR 内 Implementation-Version 为 1.0.6

## v1.0.5（2026-08-08）

### 新增
- 同步设置 `color-scheme`，缓解深色模式刷新闪烁
- 增加多标签页主题同步与 `useDarkMode` 单元测试
- 侧边栏切换按钮与设置选项支持键盘操作
- 后端日志改用 Lombok `@Slf4j`

### 其他
- 裁剪 vendored `package.json`，新增 Dark Reader SHA256SUMS 完整性校验
- `plugin.yaml` 改为安装后由用户手动启用

### 验证
- `pnpm type-check` / `lint` / `test:unit` / `build` 与 `./gradlew build` 全部通过
