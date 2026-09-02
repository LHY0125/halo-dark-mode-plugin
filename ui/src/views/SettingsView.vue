<script setup lang="ts">
import type { EditorPolicy, ThemeMode } from '../composables/useDarkMode'
import { useDarkMode } from '../composables/useDarkMode'
import {
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

const { theme, isDark, setTheme, editorPolicy, setEditorPolicy } = useDarkMode()

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

const editorOptions: { value: EditorPolicy; label: string; description: string }[] = [
  { value: 'darkreader', label: '编辑页也使用 Dark Reader', description: '编辑页跟随全局主题（适合 Markdown 等编辑器）' },
  { value: 'disable', label: '编辑页使用浅色纸面', description: '编辑页关闭 Dark Reader，避免富文本编辑器卡死' },
]
</script>

<template>
  <div class="dm-settings-page">
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
              <span
                class="dm-radio"
                :class="{ 'is-checked': theme === option.value }"
                aria-hidden="true"
              ></span>
            </template>
            <template #start>
              <VEntityField :title="option.label" :description="option.description" />
            </template>
          </VEntity>
        </VEntityContainer>
      </VCard>

      <VCard :body-class="['!p-0']" class="mt-4">
        <div class="p-4">
          <VDescription>
            <VDescriptionItem label="编辑页 Dark Reader">
              <VTag>{{ editorPolicy === 'darkreader' ? '跟随 Dark Reader' : '编辑页白纸' }}</VTag>
            </VDescriptionItem>
          </VDescription>
        </div>

        <VEntityContainer>
          <VEntity
            v-for="option in editorOptions"
            :key="option.value"
            :is-selected="editorPolicy === option.value"
            @click="setEditorPolicy(option.value)"
          >
            <template #prepend>
              <span
                class="dm-radio"
                :class="{ 'is-checked': editorPolicy === option.value }"
                aria-hidden="true"
              ></span>
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
.dm-settings-page {
  --dm-radio-size: 1.25rem;
  /* Halo 2.25 的 --colors-primary 是空格分隔的 RGB 三元组。 */
  --dm-radio-border: rgb(var(--colors-primary, 76 203 160) / 0.5);
  --dm-radio-accent: rgb(var(--colors-primary, 76 203 160));
  --dm-radio-accent-soft: rgb(var(--colors-primary, 76 203 160) / 0.12);
  --dm-row-hover: rgb(var(--colors-primary, 76 203 160) / 0.05);
  --dm-row-selected: rgb(var(--colors-primary, 76 203 160) / 0.08);
}

:deep(.dm-radio) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--dm-radio-size);
  height: var(--dm-radio-size);
  border: 1.5px solid var(--dm-radio-border);
  border-radius: 9999px;
  background: transparent;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
  cursor: pointer;
  flex-shrink: 0;
}

:deep(.dm-radio::after) {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--dm-radio-accent);
  transform: scale(0);
  transition: transform 0.15s ease;
}

:deep(.dm-radio.is-checked) {
  border-color: var(--dm-radio-accent);
  background: var(--dm-radio-accent-soft);
}

:deep(.dm-radio.is-checked::after) {
  transform: scale(1);
}

:deep(.entity-wrapper) {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

:deep(.entity-wrapper:hover) {
  background-color: var(--dm-row-hover);
}

:deep(.entity-wrapper.entity-selected) {
  background-color: var(--dm-row-selected);
  box-shadow: inset 3px 0 0 0 var(--dm-radio-accent);
}
</style>
