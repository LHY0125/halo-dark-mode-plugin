import { disable, enable } from 'darkreader'
import { watch } from 'vue'
import { useDarkMode } from './composables/useDarkMode'

/**
 * Dark Reader 引擎参数。
 * 纯 Dark Reader 策略下不再维护手工 CSS 覆盖；
 * 这里只调整通用观感参数，让核心与第三方插件页面转换后风格统一。
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

let initialized = false

/**
 * 初始化 Dark Reader 通用暗色引擎。
 * 监听 useDarkMode 的 isDark 状态，深色时启用，浅色时关闭。
 */
export function initDarkReaderEngine(): void {
  if (initialized) return
  initialized = true

  const { isDark } = useDarkMode()
  watch(
    isDark,
    (dark) => {
      try {
        if (dark) {
          enable(DARK_READER_THEME)
        } else {
          disable()
        }
      } catch (error) {
        console.error('[dark-mode] Dark Reader 引擎异常', error)
      }
    },
    { immediate: true },
  )
}
