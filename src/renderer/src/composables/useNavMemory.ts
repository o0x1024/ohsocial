import { ref } from 'vue'

/** 侧边栏入口 → 该模块最近访问的路由 */
const NAV_DEFAULTS: Record<string, string> = {
  '/': '/',
  '/topics': '/topics',
  '/contents': '/contents',
  '/schedule': '/schedule',
  '/materials': '/materials',
  '/writing-styles': '/writing-styles',
  '/assistant': '/assistant',
  '/settings': '/settings'
}

const lastPaths = ref<Record<string, string>>({ ...NAV_DEFAULTS })

function navKeyForPath(path: string): string | undefined {
  if (path === '/') return '/'
  if (path.startsWith('/topics')) return '/topics'
  if (path.startsWith('/contents')) return '/contents'
  if (path.startsWith('/schedule')) return '/schedule'
  if (path.startsWith('/materials')) return '/materials'
  if (path.startsWith('/writing-styles')) return '/writing-styles'
  if (path.startsWith('/assistant')) return '/assistant'
  if (path.startsWith('/settings')) return '/settings'
  return undefined
}

export function rememberNavPath(path: string): void {
  const key = navKeyForPath(path)
  if (key) lastPaths.value[key] = path
}

export function resolveNavPath(navPath: string): string {
  return lastPaths.value[navPath] ?? NAV_DEFAULTS[navPath] ?? navPath
}

export function useNavMemory() {
  return { lastPaths, rememberNavPath, resolveNavPath }
}
