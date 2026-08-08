import { definePlugin } from '@halo-dev/ui-shared'
import { IconPalette } from '@halo-dev/components'
import { markRaw } from 'vue'
import './styles/index.css'
import { initDarkReaderEngine } from './darkreader-engine'
import { injectThemeToggle } from './injector'
import { initMonacoThemeSync } from './monaco-theme'

// 在插件加载后将切换器注入到侧边栏，并让 Monaco 跟随主题
injectThemeToggle()
initMonacoThemeSync()
initDarkReaderEngine()

export default definePlugin({
  components: {},
  routes: [
    {
      parentName: 'Root',
      route: {
        path: '/dark-mode-settings',
        name: 'DarkModeSettings',
        component: () => import('./views/SettingsView.vue'),
        meta: {
          title: '深色模式设置',
          searchable: true,
          menu: {
            name: '深色模式',
            group: '偏好设置',
            icon: markRaw(IconPalette),
            priority: 50,
          },
        },
      },
    },
  ],
  extensionPoints: {},
})
