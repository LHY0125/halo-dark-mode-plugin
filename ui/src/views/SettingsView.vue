<script setup lang="ts">
import type { ThemeMode } from '../composables/useDarkMode'
import { useDarkMode } from '../composables/useDarkMode'
import {
  IconCheckboxCircle,
  IconCheckboxFill,
  IconPalette,
  VCard,
  VDescription,
  VDescriptionItem,
  VEntity,
  VEntityContainer,
  VEntityField,
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
        </div>

        <VEntityContainer>
          <VEntity
            v-for="option in modeOptions"
            :key="option.value"
            :is-selected="theme === option.value"
            @click="setTheme(option.value)"
          >
            <template #prepend>
              <component
                :is="theme === option.value ? IconCheckboxFill : IconCheckboxCircle"
                class="dark-mode-settings__radio"
                :class="{ 'is-checked': theme === option.value }"
              />
            </template>
            <template #start>
              <VEntityField :title="option.label" :description="option.description" />
            </template>
          </VEntity>
        </VEntityContainer>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
.dark-mode-settings__radio {
  width: 1.125rem;
  height: 1.125rem;
  color: var(--halo-text-tertiary);
  transition: color 0.15s;
}

.dark-mode-settings__radio.is-checked {
  color: var(--halo-accent-primary);
}
</style>
