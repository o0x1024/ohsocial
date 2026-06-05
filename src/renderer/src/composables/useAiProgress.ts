import { onMounted, onUnmounted, readonly, ref } from 'vue'

export type AiProgressPhase = 'idle' | 'running' | 'success' | 'error'

const visible = ref(false)
const label = ref('')
const statusText = ref('')
const contentText = ref('')
const thinkingText = ref('')
const modelName = ref('')
const phase = ref<AiProgressPhase>('idle')
const errorMessage = ref('')
const elapsedSeconds = ref(0)

let activeTaskId: string | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function clearElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}

function resetOutput() {
  statusText.value = ''
  contentText.value = ''
  thinkingText.value = ''
  modelName.value = ''
  errorMessage.value = ''
  elapsedSeconds.value = 0
}

function scheduleHide(ms = 1600) {
  clearHideTimer()
  hideTimer = setTimeout(() => {
    visible.value = false
    phase.value = 'idle'
    activeTaskId = null
    resetOutput()
  }, ms)
}

function onTaskStart(payload: unknown) {
  const p = payload as { taskId?: string; label?: string; modelName?: string }
  if (!p.taskId) return
  clearHideTimer()
  clearElapsedTimer()
  activeTaskId = p.taskId
  phase.value = 'running'
  visible.value = true
  resetOutput()
  label.value = p.label ?? 'AI 处理中'
  modelName.value = p.modelName ?? ''
  statusText.value = '正在连接模型…'
  elapsedSeconds.value = 0
  elapsedTimer = setInterval(() => {
    elapsedSeconds.value += 1
  }, 1000)
}

function onStatus(payload: unknown) {
  const p = payload as { taskId?: string; status?: string }
  if (!p.taskId || p.taskId !== activeTaskId || !p.status) return
  statusText.value = p.status
}

function onDelta(payload: unknown) {
  const p = payload as { taskId?: string; delta?: string; kind?: string }
  if (!p.taskId || p.taskId !== activeTaskId || !p.delta) return
  if (p.kind === 'thinking') {
    thinkingText.value += p.delta
  } else {
    contentText.value += p.delta
  }
}

function onTaskEnd(payload: unknown) {
  const p = payload as { taskId?: string; success?: boolean; error?: string }
  if (!p.taskId || p.taskId !== activeTaskId) return
  clearElapsedTimer()
  if (p.success === false) {
    phase.value = 'error'
    errorMessage.value = p.error ?? '调用失败'
    statusText.value = p.error === '已取消' ? '已取消' : '已完成（失败）'
    scheduleHide(p.error === '已取消' ? 1200 : 2800)
    return
  }
  phase.value = 'success'
  statusText.value = '已完成'
  scheduleHide()
}

async function cancelTask() {
  if (!activeTaskId || phase.value !== 'running') return
  await window.ohsocial.invoke('ai:cancel', activeTaskId)
}

function dismiss() {
  clearHideTimer()
  clearElapsedTimer()
  visible.value = false
  phase.value = 'idle'
  activeTaskId = null
  resetOutput()
}

let started = false

export function useAiProgress() {
  function bindListeners() {
    if (started) return
    started = true
    window.ohsocial.on('ai:task-start', onTaskStart)
    window.ohsocial.on('ai:status', onStatus)
    window.ohsocial.on('ai:delta', onDelta)
    window.ohsocial.on('ai:task-end', onTaskEnd)
  }

  function unbindListeners() {
    if (!started) return
    started = false
    window.ohsocial.off('ai:task-start', onTaskStart)
    window.ohsocial.off('ai:status', onStatus)
    window.ohsocial.off('ai:delta', onDelta)
    window.ohsocial.off('ai:task-end', onTaskEnd)
    clearHideTimer()
    clearElapsedTimer()
  }

  onMounted(bindListeners)
  onUnmounted(unbindListeners)

  return {
    visible: readonly(visible),
    label: readonly(label),
    statusText: readonly(statusText),
    contentText: readonly(contentText),
    thinkingText: readonly(thinkingText),
    modelName: readonly(modelName),
    phase: readonly(phase),
    errorMessage: readonly(errorMessage),
    elapsedSeconds: readonly(elapsedSeconds),
    cancelTask,
    dismiss,
    bindListeners,
    unbindListeners
  }
}
