<script setup lang="ts">
import { IconMoon, IconSunny } from '@halo-dev/components'
import { useDarkMode } from '../composables/useDarkMode'

const { isDark, toggle } = useDarkMode()
</script>

<template>
  <div class="theme-toggle" @click="toggle">
    <IconSunny v-if="isDark" class="theme-toggle__icon" />
    <IconMoon v-else class="theme-toggle__icon" />
    <span class="theme-toggle__label">
      {{ isDark ? '浅色模式' : '深色模式' }}
    </span>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  color: var(--halo-text-secondary);
  border-radius: 0.25rem;
  transition: background-color 0.15s, color 0.15s;
  user-select: none;
}

.theme-toggle:hover {
  background-color: var(--halo-bg-hover);
  color: var(--halo-text-primary);
}

.theme-toggle__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.theme-toggle__label {
  font-size: 0.8125rem;
  white-space: nowrap;
}
</style>
