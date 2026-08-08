/**
 * 让 Monaco Editor（日志查看器）跟随 Halo 暗色模式。
 * 优先调用 Monaco 官方主题 API，CSS 兜底见 styles/overrides/editor.css。
 */

type MonacoLike = {
  editor?: {
    setTheme: (name: string) => void
  }
}

const DARK_THEME = 'vs-dark'
const LIGHT_THEME = 'vs'

function getMonaco(): MonacoLike | undefined {
  return (window as unknown as { monaco?: MonacoLike }).monaco
}

function applyMonacoTheme(): void {
  const monaco = getMonaco()
  if (!monaco?.editor?.setTheme) return
  const isDark = document.documentElement.getAttribute('data-halo-theme') === 'dark'
  monaco.editor.setTheme(isDark ? DARK_THEME : LIGHT_THEME)
}

/** 初始化 Monaco 主题同步：立即应用，并监听属性变化与实例懒加载。 */
export function initMonacoThemeSync(): void {
  applyMonacoTheme()

  const attributeObserver = new MutationObserver(() => applyMonacoTheme())
  attributeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-halo-theme'],
  })

  // 日志页面可能懒加载 Monaco，实例渲染后再补一次
  const instanceObserver = new MutationObserver(() => {
    if (document.querySelector('.monaco-editor')) {
      applyMonacoTheme()
    }
  })
  instanceObserver.observe(document.body, { childList: true, subtree: true })
}