<script lang="ts">
export default { name: 'ContentEditor' }
</script>
<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RichTextEditor from '../../components/editor/RichTextEditor.vue'
import { useAiProgress } from '../../composables/useAiProgress'
import { removeEmDashesFromHtml, toEditorHtml } from '../../utils/editorHtml'
import type { Content } from '../../../../shared/types/content'
import { useWritingStyles } from '../../composables/useWritingStyles'
import type { EditorComment } from '../../../../shared/types/editor'
import { CONTENT_STATUS_LABELS } from '../../../../shared/constants/platforms'
import {
  DEFAULT_LAYOUT_TEMPLATE_ID,
  getLayoutTemplate,
  listLayoutTemplates,
  type ContentLayoutTemplate
} from '../../../../shared/content-layout-templates'
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
const { styles: writingStyles, loadWritingStyles } = useWritingStyles()
const writingStyleId = ref<number | ''>('')
const layoutTemplates = ref<ContentLayoutTemplate[]>(listLayoutTemplates())
const layoutTemplateId = ref<string>(DEFAULT_LAYOUT_TEMPLATE_ID)
const targetWordCount = ref<number | ''>('')
const editorComments = ref<EditorComment[]>([])
const lastVersionBody = ref('')
const platformAccounts = ref<PlatformAccount[]>([])
const linkedTopic = ref<Topic | null>(null)

const { contentText: aiContentText, thinkingText: aiThinkingText } = useAiProgress()

let saveTimer: ReturnType<typeof setTimeout> | null = null
let saveSeq = 0
let contentLoaded = false
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
  contentLoaded = false
  content.value = (await window.ohsocial.invoke('content:get', contentId.value)) as Content | undefined ?? null
  if (!content.value) {
    router.replace('/contents')
    return
  }
  title.value = content.value.title
  body.value = content.value.body
  status.value = content.value.status
  await loadWritingStyles(true)
  const boundId = content.value.meta?.writingStyleId
  writingStyleId.value = typeof boundId === 'number' ? boundId : ''
  const boundLayoutId = content.value.meta?.layoutTemplateId
  layoutTemplateId.value =
    typeof boundLayoutId === 'string' && boundLayoutId
      ? boundLayoutId
      : DEFAULT_LAYOUT_TEMPLATE_ID
  const boundWordCount = content.value.meta?.targetWordCount
  targetWordCount.value =
    typeof boundWordCount === 'number' && boundWordCount > 0 ? boundWordCount : ''
  const rawComments = content.value.meta?.comments
  editorComments.value = Array.isArray(rawComments) ? (rawComments as EditorComment[]) : []
  linkedTopic.value = content.value.topicId
    ? ((await window.ohsocial.invoke('topic:get', content.value.topicId)) as Topic | undefined) ?? null
    : null
  const originId = content.value.parentId ?? content.value.id
  versions.value = (await window.ohsocial.invoke('content:list-versions', originId)) as Content[]
  await loadVersionBaseline()
  contentLoaded = true
}

async function save() {
  if (!content.value) return
  const seq = ++saveSeq
  saving.value = true
  try {
    const meta = JSON.parse(JSON.stringify(content.value.meta ?? {})) as Record<string, unknown>
    if (writingStyleId.value) {
      meta.writingStyleId = Number(writingStyleId.value)
    } else {
      delete meta.writingStyleId
    }
    if (layoutTemplateId.value) {
      meta.layoutTemplateId = layoutTemplateId.value
    } else {
      delete meta.layoutTemplateId
    }
    const wordCount = Number(targetWordCount.value)
    if (Number.isFinite(wordCount) && wordCount > 0) {
      meta.targetWordCount = Math.round(wordCount)
    } else {
      delete meta.targetWordCount
    }
    if (editorComments.value.length) {
      meta.comments = JSON.parse(JSON.stringify(editorComments.value))
    } else {
      delete meta.comments
    }
    const updated = (await window.ohsocial.invoke('content:update', contentId.value, {
      title: title.value,
      body: body.value,
      status: status.value,
      meta
    })) as Content
    if (seq !== saveSeq) return
    content.value = updated
    await loadVersionBaseline()
  } finally {
    if (seq === saveSeq) saving.value = false
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void save()
  }, 800)
}

function saveStatusImmediately() {
  if (!contentLoaded) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  void save()
}

watch([title, body, writingStyleId, layoutTemplateId, targetWordCount], scheduleSave)
watch(status, saveStatusImmediately)
watch(editorComments, scheduleSave, { deep: true })

const boundStyleName = computed(() => {
  if (!writingStyleId.value) return ''
  return writingStyles.value.find(s => s.id === writingStyleId.value)?.name ?? ''
})

const boundLayoutTemplate = computed(() => getLayoutTemplate(layoutTemplateId.value))

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

const boundPersonaShort = computed(() => {
  const hint = boundPersonaHint.value
  if (!hint) return ''
  const persona = hint.includes(' · ') ? hint.split(' · ').slice(1).join(' · ') : hint
  return persona.length > 14 ? `${persona.slice(0, 14)}…` : persona
})

const editorContextTitle = computed(() => {
  const parts: string[] = []
  if (boundStyleName.value) parts.push(`文风：${boundStyleName.value}（AI 生成将按此文风代笔）`)
  parts.push(`排版：${boundLayoutTemplate.value.name} · ${boundLayoutTemplate.value.description}`)
  if (boundPersonaHint.value) parts.push(`人设：${boundPersonaHint.value}（AI 生成将代入此人设）`)
  else if (showMissingPersonaHint.value) parts.push('人设：未配置，可在设置 → 运营配置中为对应平台填写')
  if (targetWordCount.value) parts.push(`目标字数：约 ${targetWordCount.value} 字`)
  return parts.join('\n')
})

const showMissingPersonaHint = computed(() => {
  if (!content.value || boundPersonaHint.value) return false
  return resolveContentPlatformIds({
    platform: content.value.platform,
    meta: content.value.meta,
    topicTargetPlatforms: linkedTopic.value?.targetPlatforms
  }).length > 0
})

function removeEmDashes() {
  const { html, count } = removeEmDashesFromHtml(body.value)
  if (count === 0) {
    alert('正文中未发现破折号')
    return
  }
  body.value = html
}

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

onActivated(() => {
  void loadWritingStyles(true)
})

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

onBeforeUnmount(async () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  await save()
})

onUnmounted(() => {
  if (deltaHandler) window.ohsocial.off('ai:delta', deltaHandler)
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
      <select
        v-model="layoutTemplateId"
        class="select select-bordered select-sm max-w-[8rem]"
        title="排版模板"
      >
        <option v-for="t in layoutTemplates" :key="t.id" :value="t.id">
          {{ t.name }}
        </option>
      </select>
      <label class="flex items-center gap-1 shrink-0" title="AI 生成时的目标正文字数，留空则不限制">
        <span class="text-xs text-base-content/50">字数</span>
        <input
          v-model.number="targetWordCount"
          type="number"
          min="0"
          step="100"
          class="input input-bordered input-sm w-[5.5rem]"
          placeholder="不限"
        />
      </label>
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
      <div
        class="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2 shrink-0 text-xs text-base-content/55"
        :title="editorContextTitle"
      >
        <span v-if="boundStyleName" class="inline-flex items-center gap-0.5 max-w-[9rem] truncate">
          <span class="text-primary/60 shrink-0">文风</span>
          <span class="truncate">{{ boundStyleName }}</span>
        </span>
        <span v-if="boundStyleName" class="text-base-content/20">·</span>
        <span class="inline-flex items-center gap-0.5 max-w-[9rem] truncate">
          <span class="text-accent/60 shrink-0">排版</span>
          <span class="truncate">{{ boundLayoutTemplate.name }}</span>
        </span>
        <template v-if="boundPersonaHint">
          <span class="text-base-content/20">·</span>
          <span class="inline-flex items-center gap-0.5 max-w-[10rem] truncate">
            <span class="text-secondary/60 shrink-0">人设</span>
            <span class="truncate">{{ boundPersonaShort }}</span>
          </span>
        </template>
        <span v-else-if="showMissingPersonaHint" class="text-base-content/40">人设未配置</span>
        <template v-if="targetWordCount">
          <span class="text-base-content/20">·</span>
          <span class="inline-flex items-center gap-0.5">
            <span class="text-base-content/45 shrink-0">目标</span>
            <span>{{ targetWordCount }} 字</span>
          </span>
        </template>
      </div>
      <RichTextEditor
        v-model="body"
        class="flex-1 min-h-[480px]"
        :layout-class="boundLayoutTemplate.cssClass"
        :ai-enabled="hasModel && !aiLoading"
        :diff-lines="diffWithLastVersion"
        :comments="editorComments"
        @update:comments="editorComments = $event"
        @ai-rewrite="onEditorAiRewrite"
      >
        <template #toolbar-extra>
          <button
            type="button"
            class="btn btn-xs"
            title="移除文中所有破折号（——、—）"
            @click="removeEmDashes"
          >
            去破折号
          </button>
        </template>
      </RichTextEditor>
      <p v-if="!hasModel" class="text-xs text-warning mt-2">请先在设置 → AI 服务中配置 API Key</p>
    </div>
  </div>
</template>
