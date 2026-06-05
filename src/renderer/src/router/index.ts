import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'today',
      component: () => import('../views/today/TodayView.vue')
    },
    {
      path: '/topics',
      name: 'topics',
      component: () => import('../views/topic/TopicList.vue')
    },
    {
      path: '/contents',
      name: 'contents',
      component: () => import('../views/content/ContentList.vue')
    },
    {
      path: '/contents/:id/edit',
      name: 'content-edit',
      component: () => import('../views/content/ContentEditor.vue')
    },
    {
      path: '/contents/:id/script',
      name: 'content-script',
      component: () => import('../views/content/ScriptEditor.vue')
    },
    {
      path: '/contents/:id/versions',
      name: 'content-versions',
      component: () => import('../views/content/VersionHistory.vue')
    },
    {
      path: '/schedule',
      name: 'schedule',
      component: () => import('../views/schedule/ScheduleView.vue')
    },
    {
      path: '/materials',
      name: 'materials',
      component: () => import('../views/material/MaterialLibrary.vue')
    },
    {
      path: '/assistant',
      name: 'assistant',
      component: () => import('../views/assistant/AssistantHub.vue')
    },
    {
      path: '/assistant/:id',
      name: 'assistant-chat',
      component: () => import('../views/assistant/AssistantHub.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/setting/Settings.vue')
    }
  ]
})

export default router
