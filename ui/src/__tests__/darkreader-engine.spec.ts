import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

const mocks = vi.hoisted(() => ({
  enable: vi.fn(),
  disable: vi.fn(),
}))

vi.mock('darkreader', () => ({
  enable: (theme: unknown) => mocks.enable(theme),
  disable: () => mocks.disable(),
}))

describe('initDarkReaderEngine', () => {
  let isDark: ReturnType<typeof ref<boolean>>
  let engine: typeof import('../darkreader-engine')

  async function load(startDark: boolean): Promise<void> {
    vi.resetModules()
    mocks.enable.mockClear()
    mocks.disable.mockClear()
    isDark = ref(startDark)
    vi.doMock('../composables/useDarkMode', () => ({
      useDarkMode: () => ({ isDark }),
    }))
    engine = await import('../darkreader-engine')
  }

  beforeEach(async () => {
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
})
