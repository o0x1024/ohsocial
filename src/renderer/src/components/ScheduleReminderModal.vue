<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { PLATFORMS } from '../../../shared/constants/platforms'

export interface ScheduleReminderPayload {
  scheduleId: number
  kind: 'advance' | 'due'
  label: string
  platform: string
  scheduledAt: string
  contentId: number | null
  reminderMinutes: number
}

const router = useRouter()
const queue = ref<ScheduleReminderPayload[]>([])
const current = ref<ScheduleReminderPayload | null>(null)

let handler: ((...args: unknown[]) => void) | null = null

function platformName(id: string) {
  return PLATFORMS.find(p => p.id === id)?.name ?? id
}

function showNext() {
  current.value = queue.value.shift() ?? null
}

function dismiss() {
  showNext()
}

function goSchedule() {
  const item = current.value
  dismiss()
  if (item?.contentId) {
    router.push({ path: '/schedule', query: { contentId: String(item.contentId) } })
  } else {
    router.push('/schedule')
  }
}

function goContent() {
  const item = current.value
  dismiss()
  if (item?.contentId) {
    router.push(`/contents/${item.contentId}/edit`)
  }
}

onMounted(() => {
  handler = (payload: unknown) => {
    queue.value.push(payload as ScheduleReminderPayload)
    if (!current.value) showNext()
  }
  window.ohsocial.on('schedule:reminder', handler)
})

onUnmounted(() => {
  if (handler) window.ohsocial.off('schedule:reminder', handler)
})
</script>

<template>
  <dialog v-if="current" class="modal modal-open">
    <div class="modal-box max-w-md">
      <h3 class="font-bold text-lg">
        {{ current.kind === 'due' ? '该发布了' : '发布预告' }}
      </h3>
      <p class="py-3 text-sm">
        <span class="font-medium">「{{ current.label }}」</span>
        <template v-if="current.kind === 'due'">
          已到计划发布时间（{{ platformName(current.platform) }}），请前往平台发帖。
        </template>
        <template v-else>
          约 {{ current.reminderMinutes }} 分钟后发布（{{ platformName(current.platform) }}）。
        </template>
      </p>
      <p class="text-xs text-base-content/50">计划时间：{{ current.scheduledAt }}</p>
      <div class="modal-action">
        <button type="button" class="btn btn-ghost" @click="dismiss">知道了</button>
        <button v-if="current.contentId" type="button" class="btn btn-outline" @click="goContent">查看内容</button>
        <button type="button" class="btn btn-primary" @click="goSchedule">打开排期</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @submit.prevent="dismiss">
      <button type="submit">close</button>
    </form>
  </dialog>
</template>
