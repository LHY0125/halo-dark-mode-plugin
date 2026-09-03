import { disable, enable } from 'darkreader'
import { watch } from 'vue'
import { useDarkMode } from './composables/useDarkMode'

type EditorScope = 'none' | 'post-editor' | 'single-page-editor'

/**
 * Dark Reader 引擎参数。
 * 编辑页不切换专用 fixes；所有深色页面使用同一组参数，避免路由切换时配置残留。
 */
const DARK_READER_THEME = {
  brightness: 100,
  contrast: 90,
  grayscale: 0,
  sepia: 0,
  darkSchemeBackgroundColor: '#181b20',
  darkSchemeTextColor: '#e8e6e3',
  scrollbarColor: '#3a3f4a',
  selectionColor: '#2f6f7a',
  styleSystemControls: true,
} as const

/**
 * 代码块内联样式保护；编辑页也使用同一组参数。
 */
const DARK_READER_FIXES = {
  invert: [],
  css: '',
  ignoreInlineStyle: ['pre', 'code', '.halo-rich-text-editor', '.halo-rich-text-editor *'],
  ignoreImageAnalysis: [],
  disableStyleSheetsProxy: false,
  ignoreCSSUrl: [],
}

let initialized = false
let lastEnabled = false
let didSyncOnce = false

/**
 * 将 pathname 映射为内容编辑页范围。
 * 参数严格采用 window.location.pathname 语义，不包含查询字符串和 hash。
 */
export function getEditorScope(pathname: string): EditorScope {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/console/posts/editor') return 'post-editor'
  if (normalized === '/console/single-pages/editor') return 'single-page-editor'
  return 'none'
}

/** 将当前编辑页范围同步到 html，供局部编辑器样式使用。 */
function syncEditorScope(): EditorScope {
  const scope = getEditorScope(window.location.pathname)
  const root = document.documentElement

  if (scope === 'none') {
    root.removeAttribute('data-halo-editor-scope')
  } else {
    root.setAttribute('data-halo-editor-scope', scope)
  }

  return scope
}

/**
 * 初始化 Dark Reader 通用暗色引擎。
 * - 深色模式：所有页面统一 enable，编辑页策略只由局部 CSS 解释。
 * - 浅色模式：全局 disable。
 * - 路由变化：仅同步编辑页范围属性，不改变 Dark Reader fixes。
 */
export function initDarkReaderEngine(): void {
  if (initialized) return
  initialized = true

  const { isDark } = useDarkMode()

  const sync = () => {
    syncEditorScope()
    const shouldEnable = isDark.value

    // 首次同步总是应用一次，之后仅在全局主题翻转时操作，避免重复注入和闪烁。
    if (!didSyncOnce || shouldEnable !== lastEnabled) {
      try {
        if (shouldEnable) {
          enable(DARK_READER_THEME, DARK_READER_FIXES)
        } else {
          disable()
        }
        lastEnabled = shouldEnable
        didSyncOnce = true
      } catch (error) {
        console.error('[dark-mode] Dark Reader 引擎异常', error)
      }
    }

    // 根节点反映全局主题；编辑工作区的原生控件由局部 CSS 设置为 light。
    document.documentElement.style.colorScheme = shouldEnable ? 'dark' : 'light'
  }

  watch(isDark, sync, { immediate: true })

  // Halo 是 SPA：路由变化时更新编辑范围属性，但不因普通可编辑 DOM 触发编辑页策略。
  const handleNavigation = () => sync()
  const originalPush = history.pushState.bind(history)
  const originalReplace = history.replaceState.bind(history)
  history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
    originalPush(data, unused, url)
    handleNavigation()
  }
  history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
    originalReplace(data, unused, url)
    handleNavigation()
  }
  window.addEventListener('popstate', handleNavigation)
}
