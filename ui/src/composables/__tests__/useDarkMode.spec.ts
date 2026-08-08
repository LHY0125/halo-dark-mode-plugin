import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const STORAGE_KEY = 'halo-dark-mode-theme'

function mockMatchMedia(matches: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('useDarkMode', () => {
  let useDarkMode: typeof import('../useDarkMode').useDarkMode

  async function load(systemDark = false): Promise<void> {
    vi.resetModules()
    localStorage.clear()
    mockMatchMedia(systemDark)
    const mod = await import('../useDarkMode')
    useDarkMode = mod.useDarkMode
  }

  beforeEach(async () => {
    await load(false)
  })

  it('默认 auto 且系统为深色时 isDark 为 true', async () => {
    await load(true)
    const { theme, isDark } = useDarkMode()
    expect(theme.value).toBe('auto')
    expect(isDark.value).toBe(true)
  })

  it('auto 模式下点击切换变为显式深色并持久化', async () => {
    const { theme, toggle } = useDarkMode()
    toggle()
    expect(theme.value).toBe('dark')
    await nextTick()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('auto 且系统为深色时点击切换变为显式浅色', async () => {
    await load(true)
    const { theme, toggle } = useDarkMode()
    toggle()
    expect(theme.value).toBe('light')
    await nextTick()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
  })

  it('dark 与 light 之间往返切换', async () => {
    const { theme, toggle } = useDarkMode()
    theme.value = 'dark'
    toggle()
    expect(theme.value).toBe('light')
    toggle()
    expect(theme.value).toBe('dark')
    await nextTick()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('setTheme 会持久化到 localStorage', async () => {
    const { setTheme } = useDarkMode()
    setTheme('dark')
    await nextTick()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
  })

  it('localStorage 非法值回退到 auto', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-theme')
    await load(false)
    const { theme } = useDarkMode()
    expect(theme.value).toBe('auto')
  })

  it('storage 事件会同步其他标签页的主题', () => {
    const { theme, setTheme } = useDarkMode()
    setTheme('light')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: 'dark',
      }),
    )
    expect(theme.value).toBe('dark')
  })

  it('storage 事件忽略非法值', () => {
    const { theme, setTheme } = useDarkMode()
    setTheme('light')
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: 'invalid',
      }),
    )
    expect(theme.value).toBe('light')
  })
})
