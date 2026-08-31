import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref, type ComputedRef, type Ref } from 'vue'

type ThemeMode = 'light' | 'dark' | 'auto'
type EditorPolicy = 'darkreader' | 'disable'

vi.mock('@halo-dev/components', async () => {
  const { defineComponent, h } = await import('vue')

  const renderSlot = (slot: unknown) => (typeof slot === 'function' ? slot() : slot)
  const simple = (name: string) =>
    defineComponent({
      name,
      setup(_props: unknown, { slots }: { slots: Record<string, unknown> }) {
        return () => h('div', { 'data-testid': name }, [renderSlot(slots.default)])
      },
    })

  return {
    VPageHeader: defineComponent({
      name: 'VPageHeader',
      props: { title: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-testid': 'v-page-header' }, [props.title, renderSlot(slots.icon)])
      },
    }),
    VCard: defineComponent({
      name: 'VCard',
      props: { bodyClass: { type: Array, default: () => [] } },
      setup(_props, { slots }) {
        return () => h('div', { 'data-testid': 'v-card' }, renderSlot(slots.default))
      },
    }),
    VDescription: simple('v-description'),
    VDescriptionItem: defineComponent({
      name: 'VDescriptionItem',
      props: { label: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-testid': 'v-description-item' }, [props.label, renderSlot(slots.default)])
      },
    }),
    VTag: simple('v-tag'),
    VEntityContainer: simple('v-entity-container'),
    VEntity: defineComponent({
      name: 'VEntity',
      props: { isSelected: Boolean },
      setup(_props, { slots }) {
        return () =>
          h('div', { 'data-testid': 'v-entity' }, [renderSlot(slots.prepend), renderSlot(slots.start)])
      },
    }),
    VEntityField: defineComponent({
      name: 'VEntityField',
      props: { title: String, description: String },
      setup(props) {
        return () => h('div', { 'data-testid': 'v-entity-field' }, [props.title, props.description])
      },
    }),
    IconCheckboxFill: simple('icon-checkbox-fill'),
    IconCheckboxCircle: simple('icon-checkbox-circle'),
    IconPalette: simple('icon-palette'),
  }
})

describe('SettingsView', () => {
  let themeRef: Ref<ThemeMode>
  let editorPolicyRef: Ref<EditorPolicy>
  let setThemeSpy: ReturnType<typeof vi.fn>
  let setEditorPolicySpy: ReturnType<typeof vi.fn>
  let wrapper: ReturnType<typeof mount>

  async function setup(initial: ThemeMode, useSystemDark = false): Promise<void> {
    vi.resetModules()
    themeRef = ref<ThemeMode>(initial)
    setThemeSpy = vi.fn((t: ThemeMode) => {
      themeRef.value = t
    })
    editorPolicyRef = ref<EditorPolicy>('disable')
    setEditorPolicySpy = vi.fn((p: EditorPolicy) => {
      editorPolicyRef.value = p
    })
    const isDark: ComputedRef<boolean> = computed(
      () => themeRef.value === 'dark' || (themeRef.value === 'auto' && useSystemDark),
    )
    vi.doMock('../../composables/useDarkMode', () => ({
      useDarkMode: () => ({
        theme: themeRef,
        isDark,
        setTheme: setThemeSpy,
        editorPolicy: editorPolicyRef,
        setEditorPolicy: setEditorPolicySpy,
      }),
    }))
    const mod = await import('../SettingsView.vue')
    wrapper = mount(mod.default)
  }

  beforeEach(async () => {
    await setup('dark')
  })

  it('渲染三个模式选项', () => {
    expect(wrapper.text()).toContain('浅色')
    expect(wrapper.text()).toContain('深色')
    expect(wrapper.text()).toContain('跟随系统')
  })

  it('深色模式下当前生效标签显示「深色」', () => {
    expect(wrapper.find('[data-testid="v-tag"]').text()).toBe('深色')
  })

  it('选中项渲染选中图标，其余为未选中图标', () => {
    // 两组卡片各有一个选中项：主题组 + 编辑页策略组
    expect(wrapper.findAll('[data-testid="icon-checkbox-fill"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="icon-checkbox-circle"]')).toHaveLength(3)
  })

  it('auto 且系统为深色时标签显示「深色（跟随系统）」', async () => {
    await setup('auto', true)
    expect(wrapper.find('[data-testid="v-tag"]').text()).toBe('深色（跟随系统）')
  })

  it('点击「浅色」调用 setTheme 并更新生效标签', async () => {
    const entity = wrapper.findAll('[data-testid="v-entity"]').find((node) => node.text().includes('浅色'))
    expect(entity).toBeDefined()
    await entity!.trigger('click')

    expect(setThemeSpy).toHaveBeenCalledWith('light')
    expect(themeRef.value).toBe('light')
    expect(wrapper.find('[data-testid="v-tag"]').text()).toBe('浅色')
  })

  it('渲染编辑页 Dark Reader 两个选项', () => {
    expect(wrapper.text()).toContain('完全使用 Dark Reader')
    expect(wrapper.text()).toContain('在文章编辑页面禁用 Dark Reader')
  })

  it('点击「完全使用 Dark Reader」调用 setEditorPolicy', async () => {
    const entity = wrapper
      .findAll('[data-testid="v-entity"]')
      .find((node) => node.text().includes('完全使用 Dark Reader'))
    expect(entity).toBeDefined()
    await entity!.trigger('click')
    expect(setEditorPolicySpy).toHaveBeenCalledWith('darkreader')
    expect(editorPolicyRef.value).toBe('darkreader')
  })
})
