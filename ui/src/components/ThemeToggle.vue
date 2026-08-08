<script setup lang="ts">
import IconSunLine from '~icons/ri/sun-line'
import IconMoonLine from '~icons/ri/moon-line'
import { useDarkMode } from '../composables/useDarkMode'

const { isDark, toggle } = useDarkMode()
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-pressed="isDark"
    :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
    @click="toggle"
  >
    <IconSunLine v-if="isDark" class="theme-toggle__icon" />
    <IconMoonLine v-else class="theme-toggle__icon" />
    <span class="theme-toggle__label">
      {{ isDark ? '浅色模式' : '深色模式' }}
    </span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 0;
  background: transparent;
  color: var(--halo-text-secondary);
  font: inherit;
  cursor: pointer;
  border-radius: 0.25rem;
  transition:
    background-color 0.15s,
    color 0.15s;
  user-select: none;
}

.theme-toggle:hover {
  background-color: var(--halo-bg-hover);
  color: var(--halo-text-primary);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--halo-accent-primary);
  outline-offset: 2px;
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
