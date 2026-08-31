import { disable, enable } from 'darkreader'
import { watch } from 'vue'
import { useDarkMode } from './composables/useDarkMode'

/**
 * Dark Reader 引擎参数。
 * 纯 Dark Reader 策略下不再维护手工 CSS 覆盖；
 * 这里只调整通用观感参数，让核心与第三方插件页面转换后风格统一。
 * 注意：DR 注入为异步过程，刷新闪烁只能由 useDarkMode 的 color-scheme 同步缓解。
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
 * Dark Reader 站点修复（仅用于非编辑页兜底，编辑页会整体禁用 DR）。
 * - ignoreInlineStyle 让 DR 不再改写这些元素的内联样式，降低潜在的互相触发。
 * 注：无法使用严格类型 DynamicThemeFix 的显式标注，故补齐其全部必填字段。
 */
const DARK_READER_FIXES = {
  invert: [],
  css: `
    /* 文章/页面编辑内容区（浅色纸面，黑字可读） */
    [contenteditable="true"], .ProseMirror, .editor-content {
      background-color: #ffffff !important;
      color: #1f2328 !important;
      caret-color: #1f2328 !important;
    }
  `,
  ignoreInlineStyle: [
    '[contenteditable="true"]',
    '.ProseMirror',
    '.editor',
    '.editor-content',
    '.md-editor',
    '.cm-editor',
    '.CodeMirror',
    'pre',
    'code',
  ],
  ignoreImageAnalysis: [],
  disableStyleSheetsProxy: false,
  ignoreCSSUrl: [],
}

let initialized = false
let lastEnabled = false
let lastEditor = false
let didSyncOnce = false
let editorDomActive = false

/**
 * 判断当前是否为文章/页面编辑页。
 * Halo 编辑页路由为 /console/<model>/editor，如 /console/posts/editor、/console/pages/editor。
 * 在编辑页上会整体禁用 Dark Reader，以避免 contenteditable 与 DR 动态模式互相触发导致的卡死，
 * 同时让整页转入白天模式（用户要求）。
 */
function isEditorUrl(): boolean {
  return window.location.pathname.endsWith('/editor')
}

/** 编辑区是否已出现在 DOM。作为路由判断的补充兜底，覆盖 SPA 异步挂载等场景。 */
function hasEditorDom(): boolean {
  return !!document.querySelector(
    '.ProseMirror, .editor-content, [contenteditable="true"], .editor',
  )
}

/**
 * 初始化 Dark Reader 通用暗色引擎。
 * - 编辑页（路由命中或编辑区 DOM 出现）：强制 disable()，并把 color-scheme 置为 light，整页白天。
 * - 其余页面：跟随 isDark，深色时 enable()，浅色时 disable()。
 * 通过劫持 history.pushState/replaceState、监听 popstate，以及观察编辑区 DOM，
 * 在进入/离开编辑页时即时重应用 DR，不依赖整页刷新。
 */
export function initDarkReaderEngine(): void {
  if (initialized) return
  initialized = true

  const { isDark, editorPolicy } = useDarkMode()

  const sync = () => {
    const editor = isEditorUrl() || hasEditorDom()
    const dark = isDark.value
    // 编辑页且策略为「禁用」时强制关掉 DR；否则跟随全局主题
    const disableOnEditor = editor && editorPolicy.value === 'disable'
    const shouldEnable = !disableOnEditor && dark

    // 首次同步总是应用一次（保证初始状态正确），之后仅在 DR 启用状态或编辑页状态变化时操作，
    // 避免 SPA 路由切换造成重复注入/闪烁
    const stateChanged = shouldEnable !== lastEnabled || disableOnEditor !== lastEditor
    if (!didSyncOnce || stateChanged) {
      try {
        if (shouldEnable) {
          enable(DARK_READER_THEME, DARK_READER_FIXES)
        } else {
          disable()
        }
        lastEnabled = shouldEnable
        lastEditor = disableOnEditor
        didSyncOnce = true
      } catch (error) {
        console.error('[dark-mode] Dark Reader 引擎异常', error)
      }
    }

    // 编辑页强制白天，保证浏览器原生控件/滚动条也为浅色
    document.documentElement.style.colorScheme = disableOnEditor
      ? 'light'
      : dark
        ? 'dark'
        : 'light'
  }

  watch([isDark, editorPolicy], sync, { immediate: true })

  // SPA 路由变化感知：进入/离开编辑页时重新应用
  const originalPush = history.pushState.bind(history)
  const originalReplace = history.replaceState.bind(history)
  history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
    originalPush(data, unused, url)
    sync()
  }
  history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
    originalReplace(data, unused, url)
    sync()
  }
  window.addEventListener('popstate', sync)

  // 编辑区 DOM 兜底：一旦编辑区出现在页面中（无论路由如何），立即禁用 DR
  const editorDomObserver = new MutationObserver(() => {
    const present = hasEditorDom()
    if (present !== editorDomActive) {
      editorDomActive = present
      sync()
    }
  })
  editorDomObserver.observe(document.body, { childList: true, subtree: true })

  // 兜底轮询：当路由拦截 / DOM 观察器因框架差异未能触发时，仍能在编辑页及时禁用 DR
  window.setInterval(sync, 1000)
}
