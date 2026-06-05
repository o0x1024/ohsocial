<script lang="ts">
export default { name: 'ContentEditor' }
</script>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RichTextEditor from '../../components/editor/RichTextEditor.vue'
import { useAiProgress } from '../../composables/useAiProgress'
import { toEditorHtml } from '../../utils/editorHtml'
import type { Content } from '../../../../shared/types/content'
import type { WritingStyle } from '../../../../shared/types/writing-style'
import type { EditorComment } from '../../../../shared/types/editor'
import { CONTENT_STATUS_LABELS } from '../../../../shared/constants/platforms'
import { resolveContentPlatformIds } from '../../../../shared/content-platform'
import type { PlatformAccount } from '../../../../shared/types/platform-account'
import type { Topic } from '../../../../shared/types/topic'
import { usePlatformList } from '../../composables/usePlatformList'
import { diffLines, stripHtml } from '../../../../shared/text-diff'

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
const adaptPlatform = ref('')
const { platforms, loadPlatforms, platformLabel } = usePlatformList()
const writingStyles = ref<WritingStyle[]>([])
const writingStyleId = ref<number | ''>('')
const editorComments = ref<EditorComment[]>([])
const lastVersionBody = ref('')
const platformAccounts = ref<PlatformAccount[]>([])
const linkedTopic = ref<Topic | null>(null)

const { contentText: aiContentText, thinkingText: aiThinkingText } = useAiProgress()

let saveTimer: ReturnType<typeof setTimeout> | null = null
let deltaHandler: ((...args: unknown[]) => void) | null = null
let streamingToEditor = false

const isOrigin = computed(() => content.value && (content.value.platform === 'origin' || !content.value.parentId))

const diffWithLastVersion = computed(() => {
  if (!lastVersionBody.value) return []
  return diffLines(stripHtml(lastVersionBody.value), stripHtml(body.value))
})

async function loadVersionBaseline() {
  const list = (await window.ohsocial.invoke('version:list', contentId.value)) as {
    body: string
  }[]
  lastVersionBody.value = list[0]?.body ?? ''
}

async function load() {
  content.value = (await window.ohsocial.invoke('content:get', contentId.value)) as Content | undefined ?? null
  if (!content.value) {
    router.replace('/contents')
    return
  }
  title.value = content.value.title
  body.value = content.value.body
  status.value = content.value.status
  writingStyles.value = (await window.ohsocial.invoke('writing-style:list')) as WritingStyle[]
  const boundId = content.value.meta?.writingStyleId
  writingStyleId.value = typeof boundId === 'number' ? boundId : ''
  const rawComments = content.value.meta?.comments
  editorComments.value = Array.isArray(rawComments) ? (rawComments as EditorComment[]) : []
  linkedTopic.value = content.value.topicId
    ? ((await window.ohsocial.invoke('topic:get', content.value.topicId)) as Topic | undefined) ?? null
    : null
  const originId = content.value.parentId ?? content.value.id
  versions.value = (await window.ohsocial.invoke('content:list-versions', originId)) as Content[]
  await loadVersionBaseline()
}

async function save() {
  if (!content.value) return
  saving.value = true
  const meta = JSON.parse(JSON.stringify(content.value.meta ?? {})) as Record<string, unknown>
  if (writingStyleId.value) {
    meta.writingStyleId = Number(writingStyleId.value)
  } else {
    delete meta.writingStyleId
  }
  if (editorComments.value.length) {
    meta.comments = JSON.parse(JSON.stringify(editorComments.value))
  } else {
    delete meta.comments
  }
  content.value = (await window.ohsocial.invoke('content:update', contentId.value, {
    title: title.value,
    body: body.value,
    status: status.value,
    meta
  })) as Content
  saving.value = false
  await loadVersionBaseline()
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(save, 800)
}

watch([title, body, status, writingStyleId], scheduleSave)
watch(editorComments, scheduleSave, { deep: true })

const boundStyleName = computed(() => {
  if (!writingStyleId.value) return ''
  return writingStyles.value.find(s => s.id === writingStyleId.value)?.name ?? ''
})

const boundPersonaHint = computed(() => {
  if (!content.value) return ''
  const platformIds = resolveContentPlatformIds({
    platform: content.value.platform,
    meta: content.value.meta,
    topicTargetPlatforms: linkedTopic.value?.targetPlatforms
  })
  const platformId = platformIds[0]
  if (!platformId) return ''
  const persona = platformAccounts.value.find(a => a.platform === platformId)?.authorPersona?.trim()
  if (!persona) return ''
  return `${platformLabel(platformId)} · ${persona}`
})

const showMissingPersonaHint = computed(() => {
  if (!content.value || boundPersonaHint.value) return false
  return resolveContentPlatformIds({
    platform: content.value.platform,
    meta: content.value.meta,
    topicTargetPlatforms: linkedTopic.value?.targetPlatforms
  }).length > 0
})

function applyGeneratedBody(raw: string) {
  const html = toEditorHtml(raw)
  if (!html || html === '<p></p>') return false
  body.value = html
  return true
}

async function aiGenerate() {
  if (!content.value || aiLoading.value) return
  const hasBody = body.value.replace(/<[^>]+>/g, '').trim().length > 0
  if (hasBody && !confirm('AI 将重新生成全文并覆盖当前正文，是否继续？')) return
  aiLoading.value = true
  streamingToEditor = true
  aiStream.value = ''
  try {
    await save()
    const result = (await window.ohsocial.invoke('content:ai-generate', contentId.value)) as {
      success?: boolean
      content?: string
      error?: string
    } | undefined
    const raw = (
      result?.content ||
      aiContentText.value ||
      aiStream.value ||
      aiThinkingText.value ||
      ''
    ).trim()
    if (raw && applyGeneratedBody(raw)) {
      if (saveTimer) clearTimeout(saveTimer)
      await save()
    } else if (result?.error) {
      alert(result.error)
    } else if (result?.success === false) {
      alert('AI 生成失败')
    } else {
      alert('模型未返回正文内容')
    }
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'AI 生成失败')
  } finally {
    aiLoading.value = false
    streamingToEditor = false
    aiStream.value = ''
  }
}

function goSchedule() {
  router.push({ path: '/schedule', query: { contentId: String(contentId.value) } })
}

async function aiRewrite(selectedText?: string, instruction = '换个说法，更口语化') {
  const selection = selectedText ?? window.getSelection()?.toString().trim()
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
    instruction
  )) as { success: boolean; content?: string; error?: string }
  if (result.success && result.content) {
    const replacement = toEditorHtml(result.content)
    const plainReplacement = result.content.replace(/<[^>]+>/g, '').trim()
    if (body.value.includes(selection)) {
      body.value = body.value.replace(selection, plainReplacement.includes('<') ? replacement : result.content)
    } else {
      body.value = body.value.replace(selection, plainReplacement)
    }
  } else if (result.error) {
    alert(result.error)
  }
  aiLoading.value = false
}

function onEditorAiRewrite(payload: { text: string; instruction: string }) {
  void aiRewrite(payload.text, payload.instruction)
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
  const list = await loadPlatforms()
  if (list.length && !adaptPlatform.value) adaptPlatform.value = list[0].id
  hasModel.value = (await window.ohsocial.invoke('model:hasEnabled')) as boolean
  platformAccounts.value = (await window.ohsocial.invoke('account:list')) as PlatformAccount[]
  deltaHandler = (payload: unknown) => {
    const p = payload as { contentId?: number; delta?: string; kind?: string }
    if (p.contentId !== contentId.value || !p.delta) return
    if (p.kind === 'thinking') {
      if (streamingToEditor) {
        aiStream.value += p.delta
        body.value = toEditorHtml(aiStream.value)
      }
      return
    }
    aiStream.value += p.delta
    if (streamingToEditor) {
      body.value = toEditorHtml(aiStream.value)
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
      <select v-model="writingStyleId" class="select select-bordered select-sm max-w-[9rem]" title="绑定文风">
        <option value="">不绑定文风</option>
        <option v-for="s in writingStyles" :key="s.id" :value="s.id">
          {{ s.name }}{{ s.isDefault ? '（默认）' : '' }}
        </option>
      </select>
      <button class="btn btn-ghost btn-sm" @click="router.push(`/contents/${contentId}/script`)">视频脚本</button>
      <button class="btn btn-ghost btn-sm" @click="router.push(`/contents/${contentId}/versions`)">版本历史</button>
      <button class="btn btn-ghost btn-sm" @click="exportMd">导出 MD</button>
      <button v-if="isOrigin" class="btn btn-outline btn-sm" :disabled="aiLoading || !hasModel" @click="showAdapt = !showAdapt">多平台改写</button>
      <button class="btn btn-outline btn-sm" @click="goSchedule">去排期</button>
      <button class="btn btn-primary btn-sm" :disabled="aiLoading || !hasModel" @click="aiGenerate">AI 生成</button>
      <button class="btn btn-outline btn-sm" :disabled="aiLoading || !hasModel" @click="aiRewrite()">AI 改写</button>
      <span v-if="saving" class="text-xs text-base-content/50">保存中…</span>
    </header>

    <div v-if="showAdapt && isOrigin" class="px-6 py-3 bg-base-200 border-b border-base-300 flex flex-wrap gap-2 items-center">
      <span class="text-sm">改写为</span>
      <select v-model="adaptPlatform" class="select select-bordered select-sm">
        <option v-for="p in platforms" :key="p.id" :value="p.id">{{ p.name }}</option>
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

    <div class="flex-1 overflow-y-auto p-6 min-h-0 flex flex-col">
      <p v-if="boundStyleName" class="text-xs text-primary mb-2 shrink-0">
        当前文风：{{ boundStyleName }} · AI 生成将按此文风代笔
      </p>
      <p v-if="boundPersonaHint" class="text-xs text-secondary mb-2 shrink-0">
        创作人设：{{ boundPersonaHint }} · AI 生成将代入此人设
      </p>
      <p v-else-if="showMissingPersonaHint" class="text-xs text-base-content/45 mb-2 shrink-0">
        未配置创作人设，可在设置 → 运营配置中为对应平台填写
      </p>
      <RichTextEditor
        v-model="body"
        class="flex-1 min-h-[480px]"
        :ai-enabled="hasModel && !aiLoading"
        :diff-lines="diffWithLastVersion"
        :comments="editorComments"
        @update:comments="editorComments = $event"
        @ai-rewrite="onEditorAiRewrite"
      />
      <p v-if="!hasModel" class="text-xs text-warning mt-2">请先在设置 → AI 服务中配置 API Key</p>
    </div>
  </div>
</template>
