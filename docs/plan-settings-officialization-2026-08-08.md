# 改进交接单：设置页官方化改造（2026-08-08）

> 审查窗口调研产出，**交付开发窗口执行**；审查窗口不修改代码。
> 调研来源：Halo 官方仓库 `halo-dev/halo`（commit `815292f`）+ 本地代码 + 线上 `blog.liuhangyv.top/console` 实证（已登录）。
> 本文档为**唯一交付文件**（已合并此前两份调研文档）。

## 〇、需求与结论总览

| # | 需求 | 结论 |
| --- | --- | --- |
| 1 | 侧边栏「深色模式」入口状态反馈 | **不做改动**（依据见第一节） |
| 2 | 设置页顶部缺官方风格标题栏 | **要改**：使用官方 `VPageHeader`（第二节） |
| 3 | 尽量用官方组件实现 | 组件全景与复用方案见第三、四节 |

## 一、侧边栏「深色模式」入口状态反馈（结论：保持现状，不动）

### 1.1 现象

点击「深色模式」后界面切换为深色，但侧边栏「深色模式」入口（菜单项）文案没有随之变化；用户曾疑问是否应显示"白天模式 / 深色模式 / 跟随系统模式"。

### 1.2 调研结论（证据）

1. **Halo 菜单是静态导航**：`use-route-menu-generator.ts` 一次性从 `router.getRoutes()` 按 `meta.menu` 生成菜单，无业务状态联动。
2. **菜单名是静态字符串**：`RoutesMenu.tsx` 中 `title={t(item.name, item.name)}`，官方机制不支持动态文案；所有官方/插件菜单项均为固定名称。
3. **激活高亮已生效**：`active={route.matched.includes(item.path)}`；线上实证进入 `/console/dark-mode-settings` 后，菜单项 `class="active menu-item-title"`。
4. **平台惯例**：窗口内改设置、侧边栏入口不变化，是 Halo 全站一致行为（菜单是入口，不是状态开关）。

### 1.3 结论

- 动态菜单文案不可直接实现（需 DOM hack，不推荐）。
- 保持静态「深色模式」菜单名，激活高亮现状即符合平台标准。
- 当前模式信息继续由设置页内「当前生效」展示（第四节中会优化展示形式）。

## 二、设置页顶部标题栏（需改造）

### 2.1 现象

`/console/dark-mode-settings` 顶部为自定义 `h1 + p`；官方页面（`/console/theme`、`/console/plugins`）顶部有统一白底标题栏。线上实证：设置页 `document.querySelectorAll('.page-header').length === 0`。

### 2.2 官方 `VPageHeader` 组件（`@halo-dev/components` 已导出）

结构（源码 `ui/packages/components/src/components/header/PageHeader.vue`）：

```html
<div class="page-header">
  <h2 class="page-header__title">
    <slot name="icon" />
    <span class="page-header__title-text">{{ title }}</span>
  </h2>
  <div class="page-header__actions"><slot name="actions" /></div>
</div>
```

官方用法（`PluginList.vue`）：

```html
<VPageHeader :title="…">
  <template #icon><IconPlug /></template>
  <template #actions>…按钮…</template>
</VPageHeader>
<div class="m-0 md:m-4"><VCard>…</VCard></div>
```

## 三、官方组件库全景（21 类）与插件对照

### 3.1 组件清单

| 目录 | 导出名 | 用途 | 设置页可用 |
| --- | --- | --- | --- |
| header | `VPageHeader` | 页面标题栏 | ✅ |
| card | `VCard`（title / bodyClass；slot header） | 内容卡片 | ✅ |
| description | `VDescription` / `VDescriptionItem`（label / content / verticalCenter） | 键值展示 | ✅ |
| tag | `VTag`（theme / rounded；slot leftIcon） | 标签/徽标 | ✅ |
| status | `VStatusDot`（state / text / animate） | 状态点 | ✅ |
| button | `VButton`（type / size / block / ghost / loading / route；slot icon） | 按钮 | ✅ |
| space | `VSpace` | 间距布局 | ✅ |
| alert | `VAlert` | 提示条 | 可选 |
| switch | `VSwitch` | 开关 | 未来扩展 |
| menu | `VMenu` / `VMenuItem` / `VMenuLabel` | 菜单 | — |
| entity | `VEntity` / `VEntityContainer` / `VEntityField` | 列表实体 | — |
| modal / dialog | `VModal` / `VDialog` | 模态/确认 | — |
| dropdown | `VDropdownItem` / `VDropdownDivider` | 下拉 | — |
| tabs | `VTabs` / `VTabItem` / `VTabbar` | 标签页 | — |
| pagination / empty / loading | `VPagination` / `VEmpty` / `VLoading` | 分页/空态/加载 | — |
| avatar | `VAvatar` / `VAvatarGroup` | 头像 | — |
| toast / tooltip | `toast` 函数 / `vTooltip` 指令（非 V 组件） | 提示 | 可选 |

> **注意：官方组件库没有 radio / radio group 单选组件** —— 三个模式选项保持语义化 `<button>` 是合理方案。

### 3.2 插件现状 vs 官方组件

| 插件现状 | 建议 |
| --- | --- |
| 标题：自定义 `.dark-mode-settings__header`（h1+p） | **`VPageHeader`** |
| 卡片：`.dark-mode-settings__card` | **`VCard`** |
| 「当前生效」：自定义 div + strong | **`VDescription` + `VDescriptionItem`**，模式值用 **`VTag`** / `VStatusDot` |
| 三个模式选项：自定义 `<button>` + `is-active` | 保持 `<button>`（无官方单选组件） |
| 图标：`IconPalette` / ri 图标 | 已是官方体系 ✅ |

## 四、设置页改造方案（用官方组件实现）

`ui/src/views/SettingsView.vue` 重构骨架：

```html
<script setup lang="ts">
import {
  IconPalette,
  VCard,
  VDescription,
  VDescriptionItem,
  VPageHeader,
  VTag,
} from '@halo-dev/components'
// …现有 useDarkMode / currentEffectiveMode / modeOptions 逻辑保留…
</script>

<template>
  <div>
    <VPageHeader title="深色模式设置">
      <template #icon><IconPalette /></template>
      <!-- 可选：<template #actions><VButton size="sm" @click="…">…</VButton></template> -->
    </VPageHeader>

    <div class="m-0 md:m-4">
      <VCard :body-class="['!p-0']">
        <div class="p-4">
          <VDescription>
            <VDescriptionItem label="当前生效">
              <VTag>{{ currentEffectiveMode }}</VTag>
            </VDescriptionItem>
          </VDescription>

          <div class="dark-mode-settings__options">
            <!-- 三个模式按钮保持现有实现（含 is-active 高亮） -->
          </div>
        </div>
      </VCard>
    </div>
  </div>
</template>
```

要点：
- 外层 `m-0 md:m-4` + `VCard` 是官方列表页通行布局（同 `PluginList.vue`）。
- 顶部标题栏白底在深色模式下由 Dark Reader 自动转换，无需额外适配。
- 三个模式选项维持 `<button>`（官方无单选组件），保留 `is-active` 选中态。
- 样式清理：移除 `.dark-mode-settings__header` / `__title` / `__desc` 相关 CSS；卡片/选项样式按需精简。

## 五、涉及文件与验证

| 文件 | 改动 |
| --- | --- |
| `ui/src/views/SettingsView.vue` | 用 `VPageHeader` / `VCard` / `VDescription` / `VTag` 重构 |
| `ui/src/styles/variables.css` | 可精简（自定义 header/card 样式移除后） |
| `README.md` / `CLAUDE.md` / `AGENTS.md` | 可选：同步设置页结构描述 |

验证：

```bash
cd ui
pnpm build && pnpm type-check && pnpm prettier && pnpm lint && pnpm test:unit
cd .. && gradlew build
```

部署后线上确认：
- `/console/dark-mode-settings` 顶部出现与官方一致的 `.page-header` 标题栏
- 侧边栏「深色模式」菜单项进入页面后保持高亮（现状回归确认，未改动）
- 深色模式下标题栏/卡片与整体协调

## 六、注意事项

- 问题 1（侧边栏入口）**明确不做改动**。
- 官方组件无单选组件，三选项保持 `<button>`，勿强行套用不存在的组件。
- 官方组件样式依赖 Halo Console 的 UnoCSS/主题变量，插件内直接使用即可。
- i18n（可选）：插件文案目前硬编码中文，未来可接入 Halo `locales` 国际化，非本次必做。