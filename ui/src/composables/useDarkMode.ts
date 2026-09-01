import { computed, ref, watch } from 'vue'
import { useSystemPreference } from './useSystemPreference'

const STORAGE_KEY = 'halo-dark-mode-theme'
const EDITOR_KEY = 'halo-dark-mode-editor'
export type ThemeMode = 'light' | 'dark' | 'auto'

/** 编辑页的 Dark Reader 策略 */
export type EditorPolicy = 'darkreader' | 'disable'

/** 从 localStorage 读取持久化的主题偏好 */
function loadPersistedTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored
    }
  } catch {
    // localStorage 不可用时忽略
  }
  return 'auto'
}

/** 持久化主题偏好到 localStorage */
function persistTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage 不可用时忽略
  }
}

/**
 * 从 localStorage 读取编辑页策略；非法值回退到默认「编辑页禁用」。
 * 默认禁用是为了避免富文本（ProseMirror/TipTap）编辑器与 DR 动态模式互相触发导致卡死；
 * 使用 Markdown 等不受影响的编辑器的用户可切换为「编辑页也使用 Dark Reader」。
 */
function loadEditorPolicy(): EditorPolicy {
  try {
    const stored = localStorage.getItem(EDITOR_KEY)
    if (stored === 'darkreader' || stored === 'disable') {
      return stored
    }
  } catch {
    // localStorage 不可用时忽略
  }
  return 'disable'
}

/** 持久化编辑页策略到 localStorage */
function persistEditorPolicy(policy: EditorPolicy): void {
  try {
    localStorage.setItem(EDITOR_KEY, policy)
  } catch {
    // localStorage 不可用时忽略
  }
}

/**
 * 将全局主题和编辑页策略同步到 <html>。
 * data-halo-theme 表示全局主题，data-halo-editor-policy 表示编辑页策略；
 * 两个信号分开维护，编辑页白纸 CSS 可以据此精确限定作用范围。
 * color-scheme 由 darkreader-engine 统一管理，因为它需要同时知道当前路由。
 */
function applyHtmlAttributes(isDark: boolean, policy: EditorPolicy): void {
  const root = document.documentElement
  if (isDark) {
    root.setAttribute('data-halo-theme', 'dark')
  } else {
    root.removeAttribute('data-halo-theme')
  }
  root.setAttribute('data-halo-editor-policy', policy)
}

// 模块级单例 — 所有组件共享同一个状态
const theme = ref<ThemeMode>(loadPersistedTheme())
const { isSystemDark, onChange } = useSystemPreference()

const isDark = computed<boolean>(() => {
  if (theme.value === 'dark') return true
  if (theme.value === 'light') return false
  // 'auto' — 跟随系统偏好
  return isSystemDark.value
})

// 编辑页 DR 策略（模块级单例）
const editorPolicy = ref<EditorPolicy>(loadEditorPolicy())

// 监听全局主题和编辑页策略变化 → 同步到 DOM
watch([isDark, editorPolicy], ([dark, policy]) => applyHtmlAttributes(dark, policy), {
  immediate: true,
})

// 监听 theme / editorPolicy 变化 → 持久化
watch(theme, (t) => persistTheme(t))
watch(editorPolicy, (p) => persistEditorPolicy(p))

// 多标签页同步：其他标签页修改主题或编辑页策略时跟随更新
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    const value = event.newValue
    if (value === 'light' || value === 'dark' || value === 'auto') {
      theme.value = value
    }
  } else if (event.key === EDITOR_KEY) {
    const value = event.newValue
    if (value === 'darkreader' || value === 'disable') {
      editorPolicy.value = value
    }
  }
})

// 监听系统偏好变化 → 订阅 addEventListener 以保持 isSystemDark 实时更新。
// isDark 为 computed，系统偏好变化时 watch(isDark) 已触发 applyHtmlAttributes，
// 此处无需（也不应）再次手动 apply，避免重复操作。
onChange(() => {
  // isSystemDark 已在 useSystemPreference 内部更新；此回调仅为保持监听而保留。
})

/**
 * 核心 dark mode composable。
 * 模块级单例 — 所有使用者共享同一份状态。
 */
export function useDarkMode() {
  function setTheme(t: ThemeMode): void {
    theme.value = t
  }

  function toggle(): void {
    // 在 light 和 dark 之间切换，如果当前是 auto 则切换到与系统相反
    if (theme.value === 'auto') {
      theme.value = isSystemDark.value ? 'light' : 'dark'
    } else {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }
  }

  function setEditorPolicy(policy: EditorPolicy): void {
    editorPolicy.value = policy
  }

  return {
    theme,
    isDark,
    setTheme,
    toggle,
    editorPolicy,
    setEditorPolicy,
  }
}
