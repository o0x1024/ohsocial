<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
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
  folded,
  cancelTask,
  dismiss,
  expandPanel
} = useAiProgress()

const panelRef = ref<HTMLElement | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const thinkingScrollRef = ref<HTMLElement | null>(null)
const panelCollapsed = ref(false)
const thinkingExpanded = ref(true)
const thinkingStickToBottom = ref(true)

const positioned = ref(false)
const pos = ref({ x: 0, y: 80 })
const dragging = ref(false)
let dragOffset = { x: 0, y: 0 }
let pendingPos = { x: 0, y: 80 }
let dragRafId: number | null = null

const hasThinking = computed(() => thinkingText.value.length > 0)
const hasContent = computed(() => contentText.value.length > 0)

const isReasoningActive = computed(
  () => phase.value === 'running' && hasThinking.value && !hasContent.value
)

const showSpinner = computed(
  () => phase.value === 'running' && !hasThinking.value && !hasContent.value && !errorMessage.value
)

const statusBadge = computed(() => {
  if (phase.value === 'success') return { text: '已完成', cls: 'ai-status-badge ai-status-badge--done' }
  if (phase.value === 'error') return { text: '失败', cls: 'ai-status-badge ai-status-badge--error' }
  return { text: '进行中', cls: 'ai-status-badge ai-status-badge--running' }
})

const panelStyle = computed(() => {
  if (dragging.value) return undefined
  if (!positioned.value) {
    return { right: '1.5rem', top: '5rem' }
  }
  return {
    left: '0',
    top: '0',
    transform: `translate3d(${pos.value.x}px, ${pos.value.y}px, 0)`
  }
})

function clampPosition(clientX: number, clientY: number) {
  const el = panelRef.value
  const w = el?.offsetWidth ?? 400
  const h = el?.offsetHeight ?? 120
  return {
    x: Math.min(Math.max(0, clientX - dragOffset.x), window.innerWidth - w),
    y: Math.min(Math.max(0, clientY - dragOffset.y), window.innerHeight - h)
  }
}

function applyPanelTransform(x: number, y: number) {
  const el = panelRef.value
  if (!el) return
  el.style.right = 'auto'
  el.style.left = '0'
  el.style.top = '0'
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`
}

function ensurePosition() {
  if (positioned.value) return
  const w = panelRef.value?.offsetWidth ?? 400
  const next = {
    x: Math.max(16, window.innerWidth - w - 24),
    y: 80
  }
  pos.value = next
  pendingPos = next
  positioned.value = true
  applyPanelTransform(next.x, next.y)
}

function scheduleDragFrame(clientX: number, clientY: number) {
  pendingPos = clampPosition(clientX, clientY)
  if (dragRafId != null) return
  dragRafId = requestAnimationFrame(() => {
    dragRafId = null
    applyPanelTransform(pendingPos.x, pendingPos.y)
  })
}

function onWindowDragMove(e: PointerEvent) {
  if (!dragging.value) return
  scheduleDragFrame(e.clientX, e.clientY)
}

function stopDragging() {
  if (!dragging.value) return
  dragging.value = false
  if (dragRafId != null) {
    cancelAnimationFrame(dragRafId)
    dragRafId = null
  }
  pos.value = { ...pendingPos }
  positioned.value = true
  window.removeEventListener('pointermove', onWindowDragMove)
  window.removeEventListener('pointerup', stopDragging)
  window.removeEventListener('pointercancel', stopDragging)
}

function onDragStart(e: PointerEvent) {
  if (e.button !== 0) return
  if ((e.target as HTMLElement).closest('button')) return
  ensurePosition()
  dragging.value = true
  const rect = panelRef.value!.getBoundingClientRect()
  dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  pendingPos = { x: rect.left, y: rect.top }
  e.preventDefault()
  window.addEventListener('pointermove', onWindowDragMove, { passive: true })
  window.addEventListener('pointerup', stopDragging)
  window.addEventListener('pointercancel', stopDragging)
}

async function handleCancel() {
  if (phase.value === 'running') {
    await cancelTask()
    return
  }
  dismiss()
}

function onToggleCollapse() {
  if (panelCollapsed.value) {
    expandPanel()
    panelCollapsed.value = false
  } else {
    panelCollapsed.value = true
  }
}

function scrollElementToBottom(el: HTMLElement | null | undefined) {
  if (!el) return
  el.scrollTop = el.scrollHeight
}

async function followThinkingOutput() {
  if (!thinkingExpanded.value || !thinkingStickToBottom.value) return
  await nextTick()
  requestAnimationFrame(() => {
    scrollElementToBottom(thinkingScrollRef.value)
    scrollElementToBottom(scrollRef.value)
  })
}

async function followContentOutput() {
  await nextTick()
  requestAnimationFrame(() => {
    scrollElementToBottom(scrollRef.value)
  })
}

function onThinkingScroll() {
  const el = thinkingScrollRef.value
  if (!el || !isReasoningActive.value) return
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight
  thinkingStickToBottom.value = distance < 32
}

watch(visible, v => {
  if (v) {
    thinkingExpanded.value = true
    thinkingStickToBottom.value = true
    requestAnimationFrame(ensurePosition)
  } else {
    stopDragging()
  }
})

watch(folded, isFolded => {
  panelCollapsed.value = isFolded
})

watch(phase, (p, prev) => {
  if (p === 'running' && prev !== 'running') {
    panelCollapsed.value = false
  }
})

watch(
  thinkingText,
  () => {
    void followThinkingOutput()
  },
  { flush: 'post' }
)

watch(
  contentText,
  (val, old) => {
    if (val && !old) thinkingExpanded.value = false
    void followContentOutput()
  },
  { flush: 'post' }
)

watch(thinkingExpanded, expanded => {
  if (expanded) void followThinkingOutput()
})

onUnmounted(() => {
  stopDragging()
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
        class="ai-progress-panel pointer-events-auto w-[min(440px,calc(100vw-2rem))] rounded-2xl border border-base-300/80 bg-base-100 shadow-[0_8px_32px_rgba(15,23,42,0.12)] flex flex-col overflow-hidden"
        :class="{
          'select-none': dragging,
          'ai-progress-panel--dragging': dragging,
          'ai-progress-panel--folded': folded && phase === 'success'
        }"
        :style="panelStyle"
      >
        <!-- 标题栏 -->
        <div
          class="ai-progress-handle flex items-start gap-2.5 px-3.5 py-3 border-b border-base-300/50 bg-base-100 cursor-grab active:cursor-grabbing"
          @pointerdown="onDragStart"
        >
          <span class="text-base-content/30 text-base leading-none pt-0.5 shrink-0" title="拖动">⠿</span>
          <span
            class="ai-header-spinner shrink-0 mt-0.5"
            :class="{ 'ai-header-spinner--idle': phase !== 'running' }"
          />
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-[15px] leading-tight truncate text-base-content">{{ label }}</p>
            <p v-if="folded && phase === 'success'" class="text-[11px] text-base-content/45 truncate mt-0.5">
              生成完成 · 点击展开查看详情
            </p>
            <p v-else-if="modelName" class="text-[11px] text-base-content/45 truncate mt-0.5">
              调用模型 · {{ modelName }}
            </p>
            <p v-else class="text-[11px] text-base-content/45 truncate mt-0.5">{{ statusText }}</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0 pt-0.5">
            <span :class="statusBadge.cls">{{ statusBadge.text }}</span>
            <span class="text-base-content/35 text-[11px] inline-flex items-center gap-0.5" title="已用时">
              <font-awesome-icon icon="clock" class="w-3 h-3" />
              {{ elapsedSeconds }}s
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square text-base-content/45"
              :title="panelCollapsed ? '展开' : '收起'"
              @click.stop="onToggleCollapse"
            >
              <font-awesome-icon :icon="panelCollapsed ? 'chevron-down' : 'chevron-up'" class="text-xs" />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square text-base-content/45"
              title="关闭"
              @click.stop="handleCancel"
            >
              <font-awesome-icon icon="times" class="text-xs" />
            </button>
          </div>
        </div>

        <!-- 内容区 -->
        <div
          v-show="!panelCollapsed"
          ref="scrollRef"
          class="px-3.5 py-3 max-h-72 min-h-[5.5rem] overflow-y-auto scrollbar-thin bg-base-100"
        >
          <p v-if="showSpinner" class="text-sm text-base-content/45 py-2">等待模型响应…</p>
          <p v-else-if="errorMessage && phase === 'error'" class="text-sm text-error whitespace-pre-wrap py-2">
            {{ errorMessage }}
          </p>
          <template v-else>
            <!-- 思考过程（anovel 黄色面板） -->
            <div v-if="hasThinking" class="ai-thinking-panel">
              <button
                type="button"
                class="ai-thinking-header"
                @click="thinkingExpanded = !thinkingExpanded"
              >
                <font-awesome-icon
                  icon="chevron-down"
                  class="ai-thinking-chevron"
                  :class="{ 'ai-thinking-chevron--collapsed': !thinkingExpanded }"
                />
                <span class="ai-thinking-icon">
                  <font-awesome-icon icon="brain" class="w-3 h-3" />
                </span>
                <span class="ai-thinking-title">思考过程</span>
                <span v-if="isReasoningActive" class="ai-thinking-badge">推理中</span>
              </button>
              <div
                v-show="thinkingExpanded"
                ref="thinkingScrollRef"
                class="ai-thinking-body scrollbar-thin"
                @scroll="onThinkingScroll"
              >
                <pre class="ai-thinking-text">{{ thinkingText }}<span
                  v-if="isReasoningActive"
                  class="ai-thinking-cursor"
                /></pre>
              </div>
            </div>

            <!-- 正文输出 -->
            <div v-if="hasContent" class="ai-output-panel">
              <pre class="ai-output-text">{{ contentText }}<span
                v-if="phase === 'running'"
                class="ai-output-cursor"
              /></pre>
            </div>

            <p v-if="!hasThinking && !hasContent" class="text-sm text-base-content/45 py-2">
              生成内容将显示在这里
            </p>
          </template>
        </div>

        <!-- 底部 -->
        <div
          v-show="!panelCollapsed"
          class="flex items-center justify-between px-3.5 py-2.5 border-t border-base-300/50 bg-base-100"
        >
          <span class="text-xs text-base-content/45">已用时 {{ elapsedSeconds }}s</span>
          <button
            v-if="phase === 'running'"
            type="button"
            class="ai-cancel-btn"
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
  transition: box-shadow 0.2s ease;
}

.ai-progress-panel--dragging {
  transition: none;
  will-change: transform;
}

.ai-progress-handle {
  touch-action: none;
}

.ai-progress-panel--folded {
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.1);
}

.ai-header-spinner {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  border: 2px solid color-mix(in oklab, var(--color-primary) 20%, transparent);
  border-top-color: var(--color-primary);
  animation: ai-spin 0.8s linear infinite;
}

.ai-header-spinner--idle {
  opacity: 0;
  animation: none;
}

.ai-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
}

.ai-status-badge--running {
  background: var(--color-primary);
  color: var(--color-primary-content);
}

.ai-status-badge--done {
  background: color-mix(in oklab, var(--color-success) 15%, transparent);
  color: var(--color-success);
  border: 1px solid color-mix(in oklab, var(--color-success) 35%, transparent);
}

.ai-status-badge--error {
  background: color-mix(in oklab, var(--color-error) 12%, transparent);
  color: var(--color-error);
  border: 1px solid color-mix(in oklab, var(--color-error) 30%, transparent);
}

.ai-thinking-panel {
  border: 1px solid #f0d060;
  background: #fffbeb;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 10px;
}

.ai-thinking-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.ai-thinking-chevron {
  width: 10px;
  height: 10px;
  font-size: 10px;
  color: #ca8a04;
  transition: transform 0.2s ease;
}

.ai-thinking-chevron--collapsed {
  transform: rotate(-90deg);
}

.ai-thinking-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: #fef3c7;
  color: #ca8a04;
}

.ai-thinking-title {
  font-size: 12px;
  font-weight: 600;
  color: #b45309;
}

.ai-thinking-badge {
  margin-left: 2px;
  padding: 1px 7px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
  color: #78350f;
  background: #fde68a;
  border: 1px solid #fbbf24;
}

.ai-thinking-body {
  padding: 0 12px 10px;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: auto;
}

.ai-thinking-text {
  font-family: inherit;
  font-size: 12px;
  line-height: 1.65;
  color: #57534e;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-thinking-cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: #eab308;
  animation: ai-cursor-blink 1s step-end infinite;
}

.ai-output-panel {
  padding: 2px 0;
}

.ai-output-text {
  font-family: inherit;
  font-size: 13px;
  line-height: 1.65;
  color: color-mix(in oklab, var(--color-base-content) 88%, transparent);
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-output-cursor {
  display: inline-block;
  width: 2px;
  height: 15px;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: var(--color-primary);
  animation: ai-cursor-blink 1s step-end infinite;
}

.ai-cancel-btn {
  padding: 4px 14px;
  border-radius: 8px;
  border: 1px solid var(--color-error);
  background: var(--color-base-100);
  color: var(--color-error);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.ai-cancel-btn:hover {
  background: color-mix(in oklab, var(--color-error) 8%, var(--color-base-100));
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ai-cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
