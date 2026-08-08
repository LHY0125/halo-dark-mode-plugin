# 修改交接单：移除设置页键盘操作支持（2026-08-08）

> 审查窗口产出，**交付开发窗口执行**；审查窗口不修改代码。
> 本文档为**唯一交接文件**（已合并 `recheck-entry-2026-08-08.md` 的内容）。
> 用户决定：设置页的键盘操作支持"没必要"，要求移除。

## 零、背景：1.0.6 已落实项（复查结论，无需重复处理）

提交 `394613f fix: 深色模式入口移至外观分组并移除侧边栏按钮（1.0.6）` 已复查通过：

- 菜单移入「外观」分组（`ui/src/index.ts` `group: 'interface'`），线上已生效
- 侧边栏注入按钮已移除（`injector.ts`、`ThemeToggle.vue` 已删除），线上 `.theme-toggle` 数量 = 0
- `verify-toggle.py` 已改为 localStorage + `StorageEvent` 驱动 + color-scheme 断言
- 文档已同步、版本号 1.0.6
- 构建验证：vitest 8/8 · vue-tsc · prettier · vite build · `gradlew build` 全绿

唯一遗留的 R-1（README 过时描述）由本文档第四节第 4 点一并处理。

## 一、需求描述

移除 `SettingsView.vue`（深色模式设置页）中为"键盘操作"特意实现的逻辑：
方向键切换选项、roving tabindex、ARIA 单选组语义、焦点环等。保留最简交互：点击三个选项按钮切换主题模式。

## 二、决策依据（用户补充）

- Halo 后台的官方页面与第三方插件页面均**没有方向键特殊交互的惯例**：按方向键上下键只用于页面滚动/翻页，没有其他特殊功能。
- 设置页单独实现"方向键切换主题选项"（radiogroup 键盘导航）与平台整体交互习惯不一致，用户群体也不会预期方向键会改变主题选择，因此判定该键盘操作支持**不必要**，予以移除。
- 保留原生 `<button>` 即可：点击可用，浏览器内置的 Tab 聚焦 + Enter/空格 激活属基础可用性，非刻意实现，无需额外维护。

## 三、现状代码体现（`ui/src/views/SettingsView.vue`）

| 行号 | 内容 | 作用 |
| --- | --- | --- |
| L10 | `import { computed, nextTick, ref } from 'vue'` | `nextTick`/`ref` 仅键盘导航使用 |
| L27 | `const optionEls = ref<HTMLButtonElement[]>([])` | 选项按钮 DOM 引用数组 |
| L29-L35 | `activeIndex` computed | 当前选中索引 |
| L37-L39 | `setOptionRef(el, index)` | 收集按钮 ref |
| L41-L45 | `focusOption(index)` | 方向键切换选中并聚焦 |
| L47-L61 | `onKeydown(event)` | ArrowUp/Down/Left/Right/Home/End 处理 |
| L81-L84 | `role="radiogroup"` `aria-label` `@keydown="onKeydown"` | 单选组容器语义 |
| L88-L104 | button 上的 `role="radio"` / `:aria-checked` / `:tabindex`（roving）/ `:ref` / `@click` | 单选按钮语义与焦点管理 |
| L162-L165 | `.dark-mode-settings__option:focus-visible` | 键盘焦点环（可选移除） |

连带：`README.md` L141 `- 侧边栏切换按钮与设置选项支持键盘操作`（R-1，侧边栏按钮已删，"键盘操作"整体废弃）。

## 四、修改建议

### 方案 A（推荐）：移除键盘导航实现，保留简单按钮

`ui/src/views/SettingsView.vue`：
1. **script**：
   - 删除 L27 `optionEls`、L29-L35 `activeIndex`、L37-L39 `setOptionRef`、L41-L45 `focusOption`、L47-L61 `onKeydown`
   - L10 import 精简为 `import { computed } from 'vue'`（`nextTick`、`ref` 不再使用）
2. **template**：
   - L81-L84 删除 `role="radiogroup"`、`aria-label="主题模式"`、`@keydown="onKeydown"`
   - L88-L104 按钮上删除 `role="radio"`、`:aria-checked`、`:tabindex`、`:ref`，仅保留 `type="button"`、`:class="{ 'is-active': ... }"`、`@click="setTheme(option.value)"`（`v-for` 中 `index` 不再需要，可去掉）
3. **style**（可选）：删除 L162-L165 `:focus-visible` 规则；也可保留（无害，仅鼠标点击时不会触发）
4. **README.md**：删除 L141 整行（R-1 一并处理）
5. 构建回归：`cd ui && pnpm build`、`pnpm type-check`、`pnpm prettier`、`pnpm lint`、`pnpm test:unit`；根目录 `gradlew build`

### 方案 B（备选，不推荐）：彻底无键盘语义

- 三个选项改回 `<div>` + `@click`（删除 button 全部键盘/语义属性）
- 需在样式补 `cursor: pointer`；可访问性退化，仅当明确要求时使用

## 五、注意

- 删除逻辑不涉及 `useDarkMode` / `darkreader-engine`，状态管理与主题切换不受影响。
- vitest 仅覆盖 `useDarkMode`，不受本次改动影响。
- 本次为前端 UI 变更，需重新构建部署后验证。