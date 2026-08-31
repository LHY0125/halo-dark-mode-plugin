import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import type { EditorPolicy } from '../composables/useDarkMode'

const mocks = vi.hoisted(() => ({
  enable: vi.fn(),
  disable: vi.fn(),
}))

vi.mock('darkreader', () => ({
  enable: (theme: unknown, fixes: unknown) => mocks.enable(theme, fixes),
  disable: () => mocks.disable(),
}))

describe('initDarkReaderEngine', () => {
  let isDark: ReturnType<typeof ref<boolean>>
  let editorPolicy: ReturnType<typeof ref<EditorPolicy>>
  let engine: typeof import('../darkreader-engine')

  async function load(startDark: boolean): Promise<void> {
    vi.resetModules()
    mocks.enable.mockClear()
    mocks.disable.mockClear()
    isDark = ref(startDark)
    editorPolicy = ref<EditorPolicy>('disable')
    vi.doMock('../composables/useDarkMode', () => ({
      useDarkMode: () => ({ isDark, editorPolicy }),
    }))
    engine = await import('../darkreader-engine')
  }

  beforeEach(async () => {
    // 每个用例前把 URL 重置为非编辑页，避免编辑页用例污染后续断言
    history.replaceState({}, '', '/')
    await load(false)
  })

  it('深色时调用 enable，且不调用 disable', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    expect(mocks.enable).toHaveBeenCalledTimes(1)
    expect(mocks.disable).not.toHaveBeenCalled()
  })

  it('浅色时调用 disable，且不调用 enable', async () => {
    await load(false)
    engine.initDarkReaderEngine()
    await nextTick()
    expect(mocks.disable).toHaveBeenCalledTimes(1)
    expect(mocks.enable).not.toHaveBeenCalled()
  })

  it('状态翻转时切换 enable / disable', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    expect(mocks.enable).toHaveBeenCalledTimes(1)

    isDark.value = false
    await nextTick()
    expect(mocks.disable).toHaveBeenCalledTimes(1)
  })

  it('重复初始化只生效一次', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    engine.initDarkReaderEngine()
    await nextTick()
    expect(mocks.enable).toHaveBeenCalledTimes(1)
  })

  it('深色时向 enable 传入含 ignoreInlineStyle 的站点修复（覆盖编辑器与代码块）', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    const fixes = mocks.enable.mock.calls[0][1] as Record<string, unknown>
    expect(fixes).toBeTruthy()
    const ignore = fixes.ignoreInlineStyle as string[]
    expect(Array.isArray(ignore)).toBe(true)
    expect(ignore).toContain('pre')
    expect(ignore).toContain('code')
    expect(ignore).toContain('[contenteditable="true"]')
    expect(typeof fixes.css).toBe('string')
    expect(fixes.css).toContain('#ffffff')
  })

  it('编辑页时强制 disable，即使深色也不调用 enable，并把 color-scheme 置为 light', async () => {
    history.replaceState({}, '', '/console/posts/editor')
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    expect(mocks.disable).toHaveBeenCalled()
    expect(mocks.enable).not.toHaveBeenCalled()
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('从编辑页切回普通页（深色）时重新 enable', async () => {
    history.replaceState({}, '', '/console/posts/editor')
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    expect(mocks.enable).not.toHaveBeenCalled()

    history.replaceState({}, '', '/console/posts')
    // 手动派发 popstate 以触发引擎的路由感知
    window.dispatchEvent(new Event('popstate'))
    await nextTick()
    expect(mocks.enable).toHaveBeenCalled()
  })

  it('编辑区 DOM 出现时强制 disable（路由未命中也能生效）', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    // 初始非编辑页且深色 → enable
    expect(mocks.enable).toHaveBeenCalled()
    mocks.enable.mockClear()

    // 挂一个编辑区节点，触发 MutationObserver
    const el = document.createElement('div')
    el.className = 'editor-content'
    document.body.appendChild(el)
    await new Promise((r) => setTimeout(r, 0))

    expect(mocks.disable).toHaveBeenCalled()
    expect(mocks.enable).not.toHaveBeenCalled()
    expect(document.documentElement.style.colorScheme).toBe('light')

    // 清理，避免影响后续用例
    el.remove()
  })

  it('编辑页 + 策略=完全使用(深色) 时 enable（编辑页保持深色）', async () => {
    history.replaceState({}, '', '/console/posts/editor')
    await load(true)
    editorPolicy.value = 'darkreader'
    engine.initDarkReaderEngine()
    await nextTick()
    expect(mocks.enable).toHaveBeenCalled()
    expect(mocks.disable).not.toHaveBeenCalled()
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('编辑页策略从禁用切到完全使用（深色）时重新 enable', async () => {
    history.replaceState({}, '', '/console/posts/editor')
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    expect(mocks.disable).toHaveBeenCalled()
    expect(mocks.enable).not.toHaveBeenCalled()

    editorPolicy.value = 'darkreader'
    await nextTick()
    expect(mocks.enable).toHaveBeenCalled()
  })
})
