import { disable, enable } from 'darkreader'
import { watch } from 'vue'
import { useDarkMode } from './composables/useDarkMode'

/**
 * Dark Reader 引擎参数。
 * 编辑页的白纸规则由 editor-paper.css 按编辑页策略控制，编辑区不放入 DR 修复项，
 * 避免「编辑页也使用 Dark Reader」时仍被插件 CSS 强制改成白底黑字。
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
 * 仅用于普通页面的代码块内联样式保护。
 * 编辑页不传入该修复项，避免 Dark Reader 与编辑器自己的样式策略耦合。
 */
const DARK_READER_FIXES = {
  invert: [],
  css: '',
  ignoreInlineStyle: ['pre', 'code'],
  ignoreImageAnalysis: [],
  disableStyleSheetsProxy: false,
  ignoreCSSUrl: [],
}

let initialized = false
let lastEnabled = false
let lastDisableOnEditor = false
let didSyncOnce = false
let editorDomActive = false

const EDITOR_SELECTOR = '.ProseMirror, .editor-content, [contenteditable="true"], .editor'
const EDITOR_CLASS_HINT = /(?:^|\s)(?:ProseMirror|editor-content|editor)(?:\s|$)/

/** 判断当前是否为文章/页面编辑页路由。 */
function isEditorUrl(): boolean {
  return window.location.pathname.endsWith('/editor')
}

/** 编辑区是否已出现在 DOM，作为 SPA 异步挂载时的补充判断。 */
function hasEditorDom(): boolean {
  return !!document.querySelector(EDITOR_SELECTOR)
}

function nodeContainsEditor(node: Node): boolean {
  if (node instanceof Element) {
    return node.matches(EDITOR_SELECTOR) || !!node.querySelector(EDITOR_SELECTOR)
  }
  if (node instanceof DocumentFragment) {
    return !!node.querySelector(EDITOR_SELECTOR)
  }
  return false
}

/** 过滤与编辑器状态无关的 DOM 变化，避免普通页面频繁执行完整查询。 */
function mutationMayChangeEditor(mutation: MutationRecord): boolean {
  if (mutation.type === 'childList') {
    return (
      Array.from(mutation.addedNodes).some(nodeContainsEditor) ||
      Array.from(mutation.removedNodes).some(nodeContainsEditor)
    )
  }

  if (!(mutation.target instanceof Element)) return false
  if (mutation.target.matches(EDITOR_SELECTOR)) return true

  if (mutation.attributeName === 'class') {
    return (
      EDITOR_CLASS_HINT.test(mutation.oldValue ?? '') ||
      EDITOR_CLASS_HINT.test(mutation.target.getAttribute('class') ?? '')
    )
  }
  return (
    mutation.attributeName === 'contenteditable' &&
    (mutation.oldValue === 'true' || mutation.target.getAttribute('contenteditable') === 'true')
  )
}

/**
 * 初始化 Dark Reader 通用暗色引擎。
 * - 编辑页策略为 disable：关闭 DR，编辑区由 editor-paper.css 显示白纸。
 * - 编辑页策略为 darkreader：编辑页和普通页一样跟随全局主题。
 * - 普通页：跟随 isDark，深色时 enable()，浅色时 disable()。
 * 路由变化由 history/popstate 感知，DOM 观察只负责编辑器异步挂载兜底。
 */
export function initDarkReaderEngine(): void {
  if (initialized) return
  initialized = true

  const { isDark, editorPolicy } = useDarkMode()

  const sync = () => {
    const editor = isEditorUrl() || editorDomActive
    const dark = isDark.value
    const disableOnEditor = editor && editorPolicy.value === 'disable'
    const shouldEnable = !disableOnEditor && dark

    // 首次同步总是应用一次，之后仅在目标状态变化时操作，避免重复注入/闪烁。
    const stateChanged = shouldEnable !== lastEnabled || disableOnEditor !== lastDisableOnEditor
    if (!didSyncOnce || stateChanged) {
      try {
        if (shouldEnable) {
          enable(DARK_READER_THEME, editor ? undefined : DARK_READER_FIXES)
        } else {
          disable()
        }
        lastEnabled = shouldEnable
        lastDisableOnEditor = disableOnEditor
        didSyncOnce = true
      } catch (error) {
        console.error('[dark-mode] Dark Reader 引擎异常', error)
      }
    }

    // 编辑页禁用策略使用浅色原生控件；编辑页使用 DR 时继续跟随全局主题。
    document.documentElement.style.colorScheme = disableOnEditor ? 'light' : dark ? 'dark' : 'light'
  }

  const refreshEditorDomState = () => {
    const present = hasEditorDom()
    if (present !== editorDomActive) {
      editorDomActive = present
      sync()
      observeDomChanges()
    }
  }

  const observeDomChanges = () => {
    editorDomObserver.disconnect()
    editorDomObserver.observe(document.body, {
      attributes: !editorDomActive,
      attributeFilter: editorDomActive ? undefined : ['class', 'contenteditable'],
      attributeOldValue: !editorDomActive,
      childList: true,
      subtree: true,
    })
  }

  editorDomActive = hasEditorDom()
  watch([isDark, editorPolicy], sync, { immediate: true })

  // SPA 路由变化感知：进入/离开编辑页时重新计算 DOM 状态并应用策略。
  const handleNavigation = () => {
    editorDomActive = hasEditorDom()
    sync()
    observeDomChanges()
  }
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

  // 只对可能改变编辑器存在状态的变更重新查询；不再使用每秒一次的全局轮询。
  const editorDomObserver = new MutationObserver((mutations) => {
    if (mutations.some(mutationMayChangeEditor)) {
      refreshEditorDomState()
    }
  })
  observeDomChanges()
}
