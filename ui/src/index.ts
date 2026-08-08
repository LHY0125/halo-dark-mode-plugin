import { definePlugin } from '@halo-dev/ui-shared'
import { IconPalette } from '@halo-dev/components'
import { markRaw } from 'vue'
import './styles/index.css'
import { initDarkReaderEngine } from './darkreader-engine'

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
            // Halo 官方「外观」分组
            group: 'interface',
            icon: markRaw(IconPalette),
            priority: 50,
          },
        },
      },
    },
  ],
  extensionPoints: {},
})
