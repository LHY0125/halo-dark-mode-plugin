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

describe('darkreader-engine', () => {
  let isDark: ReturnType<typeof ref<boolean>>
  let editorPolicy: ReturnType<typeof ref<EditorPolicy>>
  let engine: typeof import('../darkreader-engine')

  async function load(startDark: boolean): Promise<void> {
    vi.resetModules()
    mocks.enable.mockClear()
    mocks.disable.mockClear()
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-halo-theme')
    document.documentElement.removeAttribute('data-halo-editor-policy')
    document.documentElement.removeAttribute('data-halo-editor-scope')
    document.documentElement.style.colorScheme = ''
    isDark = ref(startDark)
    editorPolicy = ref<EditorPolicy>('disable')
    vi.doMock('../composables/useDarkMode', () => ({
      useDarkMode: () => ({ isDark, editorPolicy }),
    }))
    engine = await import('../darkreader-engine')
  }

  beforeEach(async () => {
    history.replaceState({}, '', '/')
    await load(false)
  })

  it('严格按 pathname 识别文章和页面编辑路由', async () => {
    await load(false)

    expect(engine.getEditorScope('/console/posts/editor')).toBe('post-editor')
    expect(engine.getEditorScope('/console/posts/editor/')).toBe('post-editor')
    expect(engine.getEditorScope('/console/single-pages/editor')).toBe('single-page-editor')
    expect(engine.getEditorScope('/console/links')).toBe('none')
    expect(engine.getEditorScope('/console/tools/editor')).toBe('none')
    expect(engine.getEditorScope('/console/posts/editorial')).toBe('none')
    expect(engine.getEditorScope('/console/single-pages/editor-preview')).toBe('none')
  })

  it('深色普通页面启用 Dark Reader 并传入统一 fixes', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()

    expect(mocks.enable).toHaveBeenCalledTimes(1)
    expect(mocks.disable).not.toHaveBeenCalled()
    expect(mocks.enable.mock.calls[0][1]).toMatchObject({
      css: '',
      ignoreInlineStyle: ['pre', 'code', '.halo-rich-text-editor', '.halo-rich-text-editor *'],
    })
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.documentElement.hasAttribute('data-halo-editor-scope')).toBe(false)
  })

  it('浅色模式关闭 Dark Reader，根节点 color-scheme 为 light', async () => {
    await load(false)
    engine.initDarkReaderEngine()
    await nextTick()

    expect(mocks.disable).toHaveBeenCalledTimes(1)
    expect(mocks.enable).not.toHaveBeenCalled()
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('主题翻转时切换 enable 和 disable', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()

    isDark.value = false
    await nextTick()
    expect(mocks.enable).toHaveBeenCalledTimes(1)
    expect(mocks.disable).toHaveBeenCalledTimes(1)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('重复初始化只生效一次', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    engine.initDarkReaderEngine()
    await nextTick()

    expect(mocks.enable).toHaveBeenCalledTimes(1)
  })

  it('深色文章编辑页继续启用 Dark Reader，并设置文章编辑范围', async () => {
    history.replaceState({}, '', '/console/posts/editor?name=post-1')
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()

    expect(mocks.enable).toHaveBeenCalledTimes(1)
    expect(mocks.disable).not.toHaveBeenCalled()
    expect(document.documentElement.getAttribute('data-halo-editor-scope')).toBe('post-editor')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('深色自定义页面编辑页继续启用 Dark Reader，并设置页面编辑范围', async () => {
    history.replaceState({}, '', '/console/single-pages/editor?name=page-1')
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()

    expect(mocks.enable).toHaveBeenCalledTimes(1)
    expect(mocks.disable).not.toHaveBeenCalled()
    expect(document.documentElement.getAttribute('data-halo-editor-scope')).toBe('single-page-editor')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('编辑页策略切换只影响局部 CSS，不重复启停 Dark Reader', async () => {
    history.replaceState({}, '', '/console/posts/editor')
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()

    editorPolicy.value = 'darkreader'
    await nextTick()

    expect(mocks.enable).toHaveBeenCalledTimes(1)
    expect(mocks.disable).not.toHaveBeenCalled()
    expect(document.documentElement.getAttribute('data-halo-editor-scope')).toBe('post-editor')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('普通页面中的可编辑控件不会触发编辑页策略', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    mocks.enable.mockClear()
    mocks.disable.mockClear()

    document.body.innerHTML = `
      <div class="editor"><div class="editor-content"><div class="ProseMirror" contenteditable="true"></div></div></div>
      <textarea>链接编辑</textarea>
    `
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mocks.disable).not.toHaveBeenCalled()
    expect(mocks.enable).not.toHaveBeenCalled()
    expect(document.documentElement.hasAttribute('data-halo-editor-scope')).toBe(false)
  })

  it('链接页和代码注入页不设置编辑页范围', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()

    for (const path of ['/console/links', '/console/settings?tab=codeInjection']) {
      history.pushState({}, '', path)
      await nextTick()
      expect(document.documentElement.hasAttribute('data-halo-editor-scope')).toBe(false)
      expect(document.documentElement.style.colorScheme).toBe('dark')
    }
    expect(mocks.disable).not.toHaveBeenCalled()
  })

  it('离开内容编辑页时清理范围属性但不重复启停 Dark Reader', async () => {
    history.replaceState({}, '', '/console/posts/editor?name=post-1')
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    mocks.enable.mockClear()
    mocks.disable.mockClear()

    history.pushState({}, '', '/console/posts')
    await nextTick()

    expect(document.documentElement.hasAttribute('data-halo-editor-scope')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(mocks.enable).not.toHaveBeenCalled()
    expect(mocks.disable).not.toHaveBeenCalled()
  })

  it('跨路由切换时所有深色页面使用同一组 fixes', async () => {
    await load(true)
    engine.initDarkReaderEngine()
    await nextTick()
    const firstFixes = mocks.enable.mock.calls[0][1]

    history.pushState({}, '', '/console/posts/editor')
    await nextTick()
    history.pushState({}, '', '/console/links')
    await nextTick()
    history.pushState({}, '', '/console/single-pages/editor')
    await nextTick()

    expect(mocks.enable).toHaveBeenCalledTimes(1)
    expect(mocks.enable.mock.calls[0][1]).toBe(firstFixes)
    expect(document.documentElement.getAttribute('data-halo-editor-scope')).toBe('single-page-editor')
  })
})
