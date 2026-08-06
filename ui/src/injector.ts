import { createVNode, render } from 'vue'
import ThemeToggle from './components/ThemeToggle.vue'

const CONTAINER_CLASS = 'plugin-dark-mode-toggle'
const TARGET_SELECTOR = '.sidebar__profile'

let mounted = false

/**
 * 将 ThemeToggle 注入到侧边栏中 UserProfileBanner 上方。
 * 使用 MutationObserver 等待侧边栏 DOM 渲染完成。
 */
export function injectThemeToggle(): void {
  if (mounted) return

  // 先尝试直接查找（侧边栏可能已经渲染）
  tryMount()

  // 如果还没渲染，等待 DOM 变化
  if (!mounted) {
    const observer = new MutationObserver(() => {
      tryMount()
      if (mounted) observer.disconnect()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
}

function tryMount(): void {
  // 避免重复挂载
  if (document.querySelector(`.${CONTAINER_CLASS}`)) {
    mounted = true
    return
  }

  const profileEl = document.querySelector(TARGET_SELECTOR)
  if (!profileEl?.parentNode) return

  const container = document.createElement('div')
  container.className = CONTAINER_CLASS
  profileEl.parentNode.insertBefore(container, profileEl)

  const vnode = createVNode(ThemeToggle)
  render(vnode, container)
  mounted = true
}
