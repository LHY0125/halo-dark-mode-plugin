import { ref } from 'vue'

/**
 * 监听系统级 prefers-color-scheme 偏好。
 * matchMedia 查询 + 事件监听，支持运行时切换响应。
 */
export function useSystemPreference() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const isSystemDark = ref<boolean>(mediaQuery.matches)

  function onChange(callback: (isDark: boolean) => void): void {
    mediaQuery.addEventListener('change', (event: MediaQueryListEvent) => {
      isSystemDark.value = event.matches
      callback(event.matches)
    })
  }

  return { isSystemDark, onChange }
}
