<script setup lang="ts">
import type { ThemeMode } from '../composables/useDarkMode'
import { useDarkMode } from '../composables/useDarkMode'
import { computed, nextTick, ref } from 'vue'

const { theme, isDark, setTheme } = useDarkMode()

const currentEffectiveMode = computed(() => {
  if (theme.value === 'auto') {
    return isDark.value ? '深色（跟随系统）' : '浅色（跟随系统）'
  }
  return theme.value === 'dark' ? '深色' : '浅色'
})

const modeOptions: { value: ThemeMode; label: string; description: string }[] = [
  { value: 'light', label: '浅色', description: '始终使用浅色模式' },
  { value: 'dark', label: '深色', description: '始终使用深色模式' },
  { value: 'auto', label: '跟随系统', description: '根据系统设置自动切换' },
]

const optionEls = ref<HTMLButtonElement[]>([])
const activeIndex = computed(() =>
  Math.max(
    0,
    modeOptions.findIndex((option) => option.value === theme.value),
  ),
)

function setOptionRef(el: unknown, index: number): void {
  if (el) {
    optionEls.value[index] = el as HTMLButtonElement
  }
}

function focusOption(index: number): void {
  const next = (index + modeOptions.length) % modeOptions.length
  setTheme(modeOptions[next].value)
  void nextTick(() => optionEls.value[next]?.focus())
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    focusOption(activeIndex.value + 1)
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    focusOption(activeIndex.value - 1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    focusOption(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    focusOption(modeOptions.length - 1)
  }
}
</script>

<template>
  <div class="dark-mode-settings">
    <div class="dark-mode-settings__header">
      <h1 class="dark-mode-settings__title">深色模式设置</h1>
      <p class="dark-mode-settings__desc">选择后台管理面板的显示模式</p>
    </div>

    <div class="dark-mode-settings__card">
      <div class="dark-mode-settings__current">
        当前生效：<strong>{{ currentEffectiveMode }}</strong>
      </div>

      <div
        class="dark-mode-settings__options"
        role="radiogroup"
        aria-label="主题模式"
        @keydown="onKeydown"
      >
        <button
          v-for="(option, index) in modeOptions"
          :key="option.value"
          type="button"
          role="radio"
          class="dark-mode-settings__option"
          :class="{ 'is-active': theme === option.value }"
          :aria-checked="theme === option.value"
          :tabindex="theme === option.value ? 0 : -1"
          :ref="
            (el: unknown) => {
              setOptionRef(el, index)
            }
          "
          @click="setTheme(option.value)"
        >
          <div class="dark-mode-settings__option-label">{{ option.label }}</div>
          <div class="dark-mode-settings__option-desc">{{ option.description }}</div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dark-mode-settings {
  max-width: 640px;
  padding: 1.5rem;
}

.dark-mode-settings__header {
  margin-bottom: 1.5rem;
}

.dark-mode-settings__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--halo-text-primary);
  margin-bottom: 0.25rem;
}

.dark-mode-settings__desc {
  font-size: 0.875rem;
  color: var(--halo-text-secondary);
}

.dark-mode-settings__card {
  padding: 1.25rem;
  background-color: var(--halo-bg-card);
  border: 1px solid var(--halo-border-base);
  border-radius: 0.25rem;
}

.dark-mode-settings__current {
  font-size: 0.875rem;
  color: var(--halo-text-secondary);
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--halo-border-light);
}

.dark-mode-settings__current strong {
  color: var(--halo-accent-primary);
}

.dark-mode-settings__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dark-mode-settings__option {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--halo-border-base);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  border-radius: 0.375rem;
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s;
}

.dark-mode-settings__option:hover {
  background-color: var(--halo-bg-hover);
}

.dark-mode-settings__option:focus-visible {
  outline: 2px solid var(--halo-accent-primary);
  outline-offset: 2px;
}

.dark-mode-settings__option.is-active {
  background-color: var(--halo-menu-item-active);
  border-color: var(--halo-accent-primary);
}

.dark-mode-settings__option-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--halo-text-primary);
  margin-bottom: 0.125rem;
}

.dark-mode-settings__option-desc {
  font-size: 0.8125rem;
  color: var(--halo-text-tertiary);
}
</style>
