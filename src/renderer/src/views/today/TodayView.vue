<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Schedule } from '../../../../shared/types/schedule'
import type { Content } from '../../../../shared/types/content'

const router = useRouter()
const topicStats = ref<Record<string, number>>({})
const personaConfigured = ref(true)
const todaySchedules = ref<Schedule[]>([])
const draftContents = ref<Content[]>([])
const dashboard = ref<{
  ai?: { total: number; last7: number }
  metrics?: { totalViews: number; totalLikes: number }
} | null>(null)
const hotspots = ref<Array<{ id: number; title: string; heatScore?: number | null }>>([])

onMounted(async () => {
  topicStats.value = (await window.ohsocial.invoke('topic:stats')) as Record<string, number>
  personaConfigured.value = (await window.ohsocial.invoke('persona:isConfigured')) as boolean
  const today = new Date()
  const from = `${today.toISOString().slice(0, 10)} 00:00:00`
  const to = `${today.toISOString().slice(0, 10)} 23:59:59`
  todaySchedules.value = (await window.ohsocial.invoke('schedule:list', from, to)) as Schedule[]
  const allContents = (await window.ohsocial.invoke('content:list')) as Content[]
  draftContents.value = allContents.filter(c => c.status === 'draft').slice(0, 5)
  dashboard.value = (await window.ohsocial.invoke('stats:dashboard')) as typeof dashboard.value
  hotspots.value = (await window.ohsocial.invoke('hotspot:list')) as typeof hotspots.value
})

const totalTopics = () => Object.values(topicStats.value).reduce((a, b) => a + b, 0)

async function refreshHotspots() {
  hotspots.value = (await window.ohsocial.invoke('hotspot:refresh', 'all')) as typeof hotspots.value
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6">
    <header class="mb-6">
      <h2 class="text-2xl font-bold">今日</h2>
      <p class="text-base-content/60 text-sm mt-1">今天要做什么，从这里开始</p>
    </header>

    <div v-if="!personaConfigured" class="alert alert-warning mb-6">
      <span>还没有配置创作偏好，AI 推荐会更准。</span>
      <button class="btn btn-sm" @click="router.push('/settings')">去设置</button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="stat bg-base-200 rounded-box">
        <div class="stat-title">选题总数</div>
        <div class="stat-value text-primary">{{ totalTopics() }}</div>
      </div>
      <div class="stat bg-base-200 rounded-box">
        <div class="stat-title">今日排期</div>
        <div class="stat-value">{{ todaySchedules.length }}</div>
      </div>
      <div class="stat bg-base-200 rounded-box">
        <div class="stat-title">草稿内容</div>
        <div class="stat-value">{{ draftContents.length }}</div>
      </div>
      <div v-if="dashboard?.ai" class="stat bg-base-200 rounded-box">
        <div class="stat-title">近 7 日 AI 调用</div>
        <div class="stat-value text-sm">{{ dashboard.ai.last7 }}</div>
      </div>
    </div>

    <section class="mb-8">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold">热点速览</h3>
        <button class="btn btn-xs btn-outline" @click="refreshHotspots">刷新热点</button>
      </div>
      <ul v-if="hotspots.length" class="flex flex-wrap gap-2">
        <li
          v-for="h in hotspots.slice(0, 12)"
          :key="h.id"
          class="badge badge-lg badge-outline cursor-default"
        >
          {{ h.title }}
          <span v-if="h.heatScore" class="opacity-60 ml-1">{{ h.heatScore }}</span>
        </li>
      </ul>
      <p v-else class="text-sm text-base-content/50">点击刷新获取微博/百度热搜</p>
    </section>

    <section v-if="todaySchedules.length" class="mb-8">
      <h3 class="font-semibold mb-2">今日待发布</h3>
      <ul class="space-y-2">
        <li v-for="s in todaySchedules" :key="s.id" class="p-3 bg-base-200 rounded-box text-sm">
          {{ s.scheduledAt.slice(11, 16) }} · {{ s.platform }} · {{ s.contentTitle || s.topicTitle || '未关联内容' }}
        </li>
      </ul>
    </section>

    <section v-if="draftContents.length" class="mb-8">
      <h3 class="font-semibold mb-2">继续创作</h3>
      <ul class="space-y-2">
        <li
          v-for="c in draftContents"
          :key="c.id"
          class="p-3 bg-base-200 rounded-box text-sm cursor-pointer hover:bg-base-300/50"
          @click="router.push(`/contents/${c.id}/edit`)"
        >
          {{ c.title }}
        </li>
      </ul>
    </section>

    <div class="flex gap-3 flex-wrap">
      <button class="btn btn-primary" @click="router.push('/topics')">新建选题</button>
      <button class="btn btn-outline" @click="router.push('/contents')">打开创作</button>
      <button class="btn btn-outline" @click="router.push('/assistant')">AI 助手</button>
    </div>
  </div>
</template>
