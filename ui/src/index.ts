import { definePlugin } from '@halo-dev/ui-shared'
import { IconMoon } from '@halo-dev/components'
import { markRaw } from 'vue'
import './styles/index.css'

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
            icon: markRaw(IconMoon),
            priority: 50,
          },
        },
      },
    },
  ],
  extensionPoints: {},
})
