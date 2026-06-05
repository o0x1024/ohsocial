<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RichTextEditor from '../../components/editor/RichTextEditor.vue'
import type { Content } from '../../../../shared/types/content'
import { CONTENT_STATUS_LABELS, PLATFORMS } from '../../../../shared/constants/platforms'

const route = useRoute()
const router = useRouter()
const contentId = computed(() => Number(route.params.id))

const content = ref<Content | null>(null)
const versions = ref<Content[]>([])
const title = ref('')
const body = ref('')
const status = ref('draft')
const saving = ref(false)
const aiLoading = ref(false)
const aiStream = ref('')
const hasModel = ref(false)
const showAdapt = ref(false)
const adaptPlatform = ref('xiaohongshu')

let saveTimer: ReturnType<typeof setTimeout> | null = null
let deltaHandler: ((...args: unknown[]) => void) | null = null

const isOrigin = computed(() => content.value && (content.value.platform === 'origin' || !content.value.parentId))

async function load() {
  content.value = (await window.ohsocial.invoke('content:get', contentId.value)) as Content | undefined ?? null
  if (!content.value) {
    router.replace('/contents')
    return
  }
  title.value = content.value.title
  body.value = content.value.body
  status.value = content.value.status
  const originId = content.value.parentId ?? content.value.id
  versions.value = (await window.ohsocial.invoke('content:list-versions', originId)) as Content[]
}

async function save() {
  if (!content.value) return
  saving.value = true
  content.value = (await window.ohsocial.invoke('content:update', contentId.value, {
    title: title.value,
    body: body.value,
    status: status.value
  })) as Content
  saving.value = false
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 800)
}

watch([title, body, status], scheduleSave)

async function aiGenerate() {
  if (!content.value || aiLoading.value) return
  const hasBody = body.value.replace(/<[^>]+>/g, '').trim().length > 0
  if (hasBody && !confirm('AI 将重新生成全文并覆盖当前正文，是否继续？')) return
  aiLoading.value = true
  aiStream.value = ''
  await save()
  const result = (await window.ohsocial.invoke('content:ai-generate', contentId.value)) as {
    success: boolean
    content?: string
    error?: string
  }
  if (result.success && result.content) {
    body.value = result.content
  } else if (result.error) {
    alert(result.error)
  }
  aiLoading.value = false
  aiStream.value = ''
}

function goSchedule() {
  router.push({ path: '/schedule', query: { contentId: String(contentId.value) } })
}

async function aiRewrite() {
  const selection = window.getSelection()?.toString().trim()
  if (!selection) {
    alert('请先选中要改写的文本')
    return
  }
  if (aiLoading.value) return
  aiLoading.value = true
  aiStream.value = ''
  await save()
  const result = (await window.ohsocial.invoke(
    'content:ai-rewrite',
    contentId.value,
    selection,
    '换个说法，更口语化'
  )) as { success: boolean; content?: string; error?: string }
  if (result.success && result.content) {
    body.value = body.value.replace(selection, result.content)
  } else if (result.error) {
    alert(result.error)
  }
  aiLoading.value = false
}

async function platformAdapt() {
  const originId = content.value?.parentId ?? contentId.value
  if (aiLoading.value) return
  aiLoading.value = true
  aiStream.value = ''
  await save()
  const result = (await window.ohsocial.invoke(
    'content:platform-adapt',
    originId,
    adaptPlatform.value
  )) as { success: boolean; versionId?: number; error?: string }
  aiLoading.value = false
  aiStream.value = ''
  if (result.success && result.versionId) {
    showAdapt.value = false
    router.push(`/contents/${result.versionId}/edit`)
  } else if (result.error) {
    alert(result.error)
  }
}

function platformLabel(id: string) {
  return PLATFORMS.find(p => p.id === id)?.name ?? id
}

async function exportMd() {
  const r = (await window.ohsocial.invoke('export:content', contentId.value)) as {
    success: boolean
    path?: string
    error?: string
  }
  if (r.success) alert(`已导出到 ${r.path}`)
  else if (r.error && r.error !== '已取消') alert(r.error)
}

onMounted(async () => {
  hasModel.value = (await window.ohsocial.invoke('model:hasEnabled')) as boolean
  deltaHandler = (payload: unknown) => {
    const p = payload as { contentId?: number; delta?: string }
    if (p.contentId === contentId.value && p.delta) {
      aiStream.value += p.delta
    }
  }
  window.ohsocial.on('ai:delta', deltaHandler)
  await load()
})

onUnmounted(() => {
  if (deltaHandler) window.ohsocial.off('ai:delta', deltaHandler)
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<template>
  <div v-if="content" class="flex-1 flex flex-col overflow-hidden">
    <header class="shrink-0 flex flex-wrap items-center gap-2 px-6 py-3 border-b border-base-300">
      <button class="btn btn-ghost btn-sm" @click="router.push('/contents')">← 返回</button>
      <input v-model="title" type="text" class="input input-ghost input-sm flex-1 min-w-[120px] text-lg font-medium" />
      <select v-model="status" class="select select-bordered select-sm w-32">
        <option v-for="(label, key) in CONTENT_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
      <button class="btn btn-ghost btn-sm" @click="router.push(`/contents/${contentId}/script`)">视频脚本</button>
      <button class="btn btn-ghost btn-sm" @click="router.push(`/contents/${contentId}/versions`)">版本历史</button>
      <button class="btn btn-ghost btn-sm" @click="exportMd">导出 MD</button>
      <button v-if="isOrigin" class="btn btn-outline btn-sm" :disabled="aiLoading || !hasModel" @click="showAdapt = !showAdapt">多平台改写</button>
      <button class="btn btn-outline btn-sm" @click="goSchedule">去排期</button>
      <button class="btn btn-primary btn-sm" :disabled="aiLoading || !hasModel" @click="aiGenerate">AI 生成</button>
      <button class="btn btn-outline btn-sm" :disabled="aiLoading || !hasModel" @click="aiRewrite">AI 改写</button>
      <span v-if="saving" class="text-xs text-base-content/50">保存中…</span>
    </header>

    <div v-if="showAdapt && isOrigin" class="px-6 py-3 bg-base-200 border-b border-base-300 flex flex-wrap gap-2 items-center">
      <span class="text-sm">改写为</span>
      <select v-model="adaptPlatform" class="select select-bordered select-sm">
        <option v-for="p in PLATFORMS" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <button class="btn btn-primary btn-sm" :disabled="aiLoading || !hasModel" @click="platformAdapt">开始改写</button>
    </div>

    <div v-if="versions.length > 1" class="px-6 py-2 border-b border-base-300 flex gap-2 overflow-x-auto text-sm">
      <button
        v-for="v in versions"
        :key="v.id"
        class="btn btn-xs"
        :class="v.id === contentId ? 'btn-primary' : 'btn-ghost'"
        @click="router.push(`/contents/${v.id}/edit`)"
      >
        {{ v.platform === 'origin' ? '源稿' : platformLabel(v.platform) }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <RichTextEditor v-model="body" />
      <p v-if="!hasModel" class="text-xs text-warning mt-2">请先在设置 → AI 服务中配置 API Key</p>
    </div>
  </div>
</template>
