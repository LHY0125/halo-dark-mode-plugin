import { computed, ref, watch } from 'vue'
import { useSystemPreference } from './useSystemPreference'

const STORAGE_KEY = 'halo-dark-mode-theme'
export type ThemeMode = 'light' | 'dark' | 'auto'

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
 * 将主题状态同步到 <html>。
 * data-halo-theme 为兼容性遗留标记，当前已无 CSS 消费方，保留给外部脚本与验证工具；
 * color-scheme 用于在 Dark Reader 异步注入前同步浏览器控件外观，缓解 FOUC。
 */
function applyHtmlAttribute(isDark: boolean): void {
  const root = document.documentElement
  if (isDark) {
    root.setAttribute('data-halo-theme', 'dark')
  } else {
    root.removeAttribute('data-halo-theme')
  }
  root.style.colorScheme = isDark ? 'dark' : 'light'
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

// 监听 isDark 变化 → 同步到 DOM
watch(isDark, (dark) => applyHtmlAttribute(dark), { immediate: true })

// 监听 theme 变化 → 持久化
watch(theme, (t) => persistTheme(t))

// 多标签页同步：其他标签页修改主题时跟随更新
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return
  const value = event.newValue
  if (value === 'light' || value === 'dark' || value === 'auto') {
    theme.value = value
  }
})

// 监听系统偏好变化 → 仅在 'auto' 模式下响应
onChange((systemDark) => {
  if (theme.value === 'auto') {
    applyHtmlAttribute(systemDark)
  }
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

  return {
    theme,
    isDark,
    setTheme,
    toggle,
  }
}
