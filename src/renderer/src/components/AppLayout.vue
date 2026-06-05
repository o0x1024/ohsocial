<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { resolveNavPath } from '../composables/useNavMemory'

const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/', icon: 'house', label: '今日' },
  { path: '/topics', icon: 'lightbulb', label: '选题' },
  { path: '/contents', icon: 'pen-to-square', label: '创作' },
  { path: '/schedule', icon: 'calendar-days', label: '排期' },
  { path: '/materials', icon: 'folder', label: '素材' },
  { path: '/writing-styles', icon: 'font', label: '文风' },
  { path: '/assistant', icon: 'robot', label: 'AI 助手' },
  { path: '/settings', icon: 'cog', label: '设置' }
]

const activePath = computed(() => {
  if (route.path.startsWith('/assistant')) return '/assistant'
  if (route.path.startsWith('/contents')) return '/contents'
  return route.path
})

function navigate(path: string) {
  const target = resolveNavPath(path)
  if (route.path !== target) router.push(target)
}
</script>

<template>
  <div class="flex h-screen bg-base-100 text-base-content font-sans">
    <aside class="w-56 shrink-0 border-r border-base-300 bg-base-200 flex flex-col">
      <div class="px-5 py-4 border-b border-base-300">
        <h1 class="text-lg font-bold text-primary">OhSocial</h1>
        <p class="text-xs text-base-content/50 mt-0.5">自媒体运营助手</p>
      </div>

      <nav class="flex-1 p-3">
        <ul class="menu menu-sm rounded-box w-full gap-0.5">
          <li v-for="item in navItems" :key="item.path">
            <button
              type="button"
              :class="{ 'menu-active': activePath === item.path }"
              @click="navigate(item.path)"
            >
              <font-awesome-icon :icon="item.icon" class="w-4 opacity-70" />
              {{ item.label }}
            </button>
          </li>
        </ul>
      </nav>
    </aside>

    <main class="flex-1 min-w-0 overflow-hidden flex flex-col">
      <slot />
    </main>
  </div>
</template>
