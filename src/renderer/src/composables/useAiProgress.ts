import { readonly, ref } from 'vue'

export type AiProgressPhase = 'idle' | 'running' | 'success' | 'error'

const visible = ref(false)
const label = ref('')
const statusText = ref('')
const contentText = ref('')
const thinkingText = ref('')
const modelName = ref('')
const phase = ref<AiProgressPhase>('idle')
const folded = ref(false)
const errorMessage = ref('')
const elapsedSeconds = ref(0)

let activeTaskId: string | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null
let listenersAttached = false

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
  folded.value = false
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
  folded.value = true
}

function detachListeners() {
  if (!listenersAttached) return
  listenersAttached = false
  window.ohsocial.off('ai:task-start', onTaskStart)
  window.ohsocial.off('ai:status', onStatus)
  window.ohsocial.off('ai:delta', onDelta)
  window.ohsocial.off('ai:task-end', onTaskEnd)
}

/** 全局只注册一次；先 off 再 on，避免 HMR / 多组件重复挂载导致 delta 被追加多次 */
export function initAiProgressBridge() {
  detachListeners()
  listenersAttached = true
  window.ohsocial.on('ai:task-start', onTaskStart)
  window.ohsocial.on('ai:status', onStatus)
  window.ohsocial.on('ai:delta', onDelta)
  window.ohsocial.on('ai:task-end', onTaskEnd)
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    detachListeners()
    clearHideTimer()
    clearElapsedTimer()
  })
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
  folded.value = false
  activeTaskId = null
  resetOutput()
}

function expandPanel() {
  folded.value = false
}

export function useAiProgress() {
  return {
    visible: readonly(visible),
    label: readonly(label),
    statusText: readonly(statusText),
    contentText: readonly(contentText),
    thinkingText: readonly(thinkingText),
    modelName: readonly(modelName),
    phase: readonly(phase),
    folded: readonly(folded),
    errorMessage: readonly(errorMessage),
    elapsedSeconds: readonly(elapsedSeconds),
    cancelTask,
    dismiss,
    expandPanel
  }
}
