<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useAiProgress } from '../composables/useAiProgress'

const {
  visible,
  label,
  statusText,
  contentText,
  thinkingText,
  modelName,
  phase,
  errorMessage,
  elapsedSeconds,
  cancelTask,
  dismiss
} = useAiProgress()

const panelRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const collapsed = ref(false)

const pos = ref({ x: -1, y: -1 })
const dragging = ref(false)
let dragOffset = { x: 0, y: 0 }

const displayText = computed(() => {
  if (contentText.value) return contentText.value
  if (thinkingText.value) return thinkingText.value
  return ''
})

const showThinkingSection = computed(
  () => !!thinkingText.value && !!contentText.value
)

const showSpinner = computed(
  () => phase.value === 'running' && !displayText.value && !errorMessage.value
)

const statusBadge = computed(() => {
  if (phase.value === 'success') return { text: '已完成', cls: 'badge-success' }
  if (phase.value === 'error') return { text: '失败', cls: 'badge-error' }
  return { text: '进行中', cls: 'badge-primary badge-outline' }
})

const panelStyle = computed(() => {
  if (pos.value.x < 0 || pos.value.y < 0) {
    return { right: '1.5rem', top: '5rem' }
  }
  return { left: `${pos.value.x}px`, top: `${pos.value.y}px` }
})

function ensurePosition() {
  if (pos.value.x >= 0) return
  const w = panelRef.value?.offsetWidth ?? 400
  pos.value = {
    x: Math.max(16, window.innerWidth - w - 24),
    y: 80
  }
}

function onDragStart(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('button')) return
  ensurePosition()
  dragging.value = true
  const rect = panelRef.value!.getBoundingClientRect()
  dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onDragMove(e: PointerEvent) {
  if (!dragging.value) return
  const w = panelRef.value?.offsetWidth ?? 400
  const h = panelRef.value?.offsetHeight ?? 300
  pos.value = {
    x: Math.min(Math.max(0, e.clientX - dragOffset.x), window.innerWidth - w),
    y: Math.min(Math.max(0, e.clientY - dragOffset.y), window.innerHeight - h)
  }
}

function onDragEnd(e: PointerEvent) {
  dragging.value = false
  ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
}

async function handleCancel() {
  if (phase.value === 'running') {
    await cancelTask()
    return
  }
  dismiss()
}

watch(visible, v => {
  if (v) {
    collapsed.value = false
    requestAnimationFrame(ensurePosition)
  }
})

watch(displayText, async () => {
  await Promise.resolve()
  const el = scrollRef.value
  if (el) el.scrollTop = el.scrollHeight
})

onUnmounted(() => {
  dragging.value = false
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="ai-progress-float fixed inset-0 z-[200] pointer-events-none"
    >
      <div
        ref="panelRef"
        class="ai-progress-panel pointer-events-auto w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-base-300/70 bg-base-100 shadow-2xl flex flex-col overflow-hidden"
        :class="{ 'select-none': dragging }"
        :style="panelStyle"
      >
        <!-- 可拖动标题栏 -->
        <div
          class="flex items-start gap-2 px-3 py-2.5 border-b border-base-300/60 bg-base-200/40 cursor-grab active:cursor-grabbing"
          @pointerdown="onDragStart"
          @pointermove="onDragMove"
          @pointerup="onDragEnd"
          @pointercancel="onDragEnd"
        >
          <span class="text-base-content/35 text-sm leading-none pt-1 shrink-0" title="拖动">⠿</span>
          <span
            class="loading loading-spinner loading-sm text-primary shrink-0 mt-0.5"
            :class="{ 'opacity-0': phase !== 'running' }"
          />
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-sm leading-tight truncate">{{ label }}</p>
            <p v-if="modelName" class="text-[11px] text-base-content/45 truncate mt-0.5">
              调用模型 · {{ modelName }}
            </p>
            <p v-else class="text-[11px] text-base-content/45 truncate mt-0.5">{{ statusText }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span class="badge badge-sm" :class="statusBadge.cls">{{ statusBadge.text }}</span>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square"
              :title="collapsed ? '展开' : '收起'"
              @click.stop="collapsed = !collapsed"
            >
              <font-awesome-icon :icon="collapsed ? 'chevron-down' : 'chevron-up'" class="text-xs" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square"
              title="关闭"
              @click.stop="handleCancel"
            >
              <font-awesome-icon icon="times" class="text-xs" />
            </button>
          </div>
        </div>

        <!-- 流式内容区 -->
        <div
          v-show="!collapsed"
          ref="scrollRef"
          class="px-4 py-3 max-h-64 min-h-[5.5rem] overflow-y-auto scrollbar-thin bg-base-100"
        >
          <p v-if="showSpinner" class="text-sm text-base-content/45">等待模型响应…</p>
          <p v-else-if="errorMessage && phase === 'error'" class="text-sm text-error whitespace-pre-wrap">
            {{ errorMessage }}
          </p>
          <template v-else>
            <div v-if="showThinkingSection" class="mb-3">
              <p class="text-[11px] font-medium text-base-content/40 mb-1">思考过程</p>
              <pre class="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-sans text-base-content/50">{{ thinkingText }}</pre>
            </div>
            <pre
              v-if="displayText"
              class="text-xs leading-relaxed whitespace-pre-wrap break-words font-sans text-base-content/85"
            >{{ contentText || thinkingText }}<span
              v-if="phase === 'running'"
              class="inline-block w-0.5 h-3.5 bg-primary ml-0.5 align-middle animate-pulse"
            /></pre>
            <p v-else class="text-sm text-base-content/45">生成内容将显示在这里</p>
          </template>
        </div>

        <!-- 底部操作栏 -->
        <div
          v-show="!collapsed"
          class="flex items-center justify-between px-4 py-2 border-t border-base-300/50 bg-base-200/30"
        >
          <span class="text-xs text-base-content/45">已用时 {{ elapsedSeconds }}s</span>
          <button
            v-if="phase === 'running'"
            type="button"
            class="btn btn-outline btn-error btn-xs"
            @click="handleCancel"
          >
            取消
          </button>
          <button
            v-else
            type="button"
            class="btn btn-ghost btn-xs"
            @click="dismiss"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ai-progress-panel {
  position: fixed;
}
</style>
