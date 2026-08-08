<script setup lang="ts">
import type { ThemeMode } from '../composables/useDarkMode'
import { useDarkMode } from '../composables/useDarkMode'
import {
  IconPalette,
  VCard,
  VDescription,
  VDescriptionItem,
  VPageHeader,
  VTag,
} from '@halo-dev/components'
import { computed } from 'vue'

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
</script>

<template>
  <div>
    <VPageHeader title="深色模式设置">
      <template #icon>
        <IconPalette />
      </template>
    </VPageHeader>

    <div class="m-0 md:m-4">
      <VCard :body-class="['!p-0']">
        <div class="p-4">
          <VDescription>
            <VDescriptionItem label="当前生效">
              <VTag>{{ currentEffectiveMode }}</VTag>
            </VDescriptionItem>
          </VDescription>

          <div class="dark-mode-settings__options">
            <button
              v-for="option in modeOptions"
              :key="option.value"
              type="button"
              class="dark-mode-settings__option"
              :class="{ 'is-active': theme === option.value }"
              @click="setTheme(option.value)"
            >
              <div class="dark-mode-settings__option-label">{{ option.label }}</div>
              <div class="dark-mode-settings__option-desc">{{ option.description }}</div>
            </button>
          </div>
        </div>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
.dark-mode-settings__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
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
