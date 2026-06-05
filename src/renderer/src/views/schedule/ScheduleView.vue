<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Schedule, ScheduleCreateInput } from '../../../../shared/types/schedule'
import type { Content } from '../../../../shared/types/content'
import { usePlatformList } from '../../composables/usePlatformList'

const route = useRoute()
const { platforms, loadPlatforms } = usePlatformList()
const cursor = ref(new Date())
const schedules = ref<Schedule[]>([])
const contents = ref<Content[]>([])
const loading = ref(true)
const showForm = ref(false)
const viewMode = ref<'month' | 'week'>('month')
const templates = ref<Array<{ id: number; name: string; description: string }>>([])
const aiSuggest = ref('')
const showTemplates = ref(false)

const form = ref({
  platform: '',
  scheduledAtLocal: '',
  contentId: null as number | null,
  reminderMinutes: 30
})

const monthLabel = computed(() => {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth() + 1
  return viewMode.value === 'week' ? weekLabel.value : `${y} 年 ${m} 月`
})

const weekLabel = computed(() => {
  const start = weekStart(cursor.value)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
})

function weekStart(d: Date) {
  const s = new Date(d)
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  s.setHours(0, 0, 0, 0)
  return s
}

function weekRange() {
  const start = weekStart(cursor.value)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59)
  return { from: formatLocal(start), to: formatLocal(end) }
}

const weekDays = computed(() => {
  const start = weekStart(cursor.value)
  const days: { date: Date; items: Schedule[] }[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = date.toISOString().slice(0, 10)
    days.push({ date, items: schedules.value.filter(s => s.scheduledAt.slice(0, 10) === key) })
  }
  return days
})

function monthRange() {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  const from = new Date(y, m, 1)
  const to = new Date(y, m + 1, 0, 23, 59, 59)
  return {
    from: formatLocal(from),
    to: formatLocal(to)
  }
}

function formatLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

function toInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const calendarDays = computed(() => {
  const y = cursor.value.getFullYear()
  const m = cursor.value.getMonth()
  const first = new Date(y, m, 1)
  const start = new Date(first)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  const days: { date: Date; inMonth: boolean; items: Schedule[] }[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const key = date.toISOString().slice(0, 10)
    const items = schedules.value.filter(s => s.scheduledAt.slice(0, 10) === key)
    days.push({ date, inMonth: date.getMonth() === m, items })
  }
  return days
})

async function load() {
  loading.value = true
  await window.ohsocial.invoke('schedule:mark-overdue')
  const range = viewMode.value === 'week' ? weekRange() : monthRange()
  schedules.value = (await window.ohsocial.invoke('schedule:list', range.from, range.to)) as Schedule[]
  contents.value = (await window.ohsocial.invoke('content:list')) as Content[]
  templates.value = (await window.ohsocial.invoke('template:list')) as typeof templates.value
  loading.value = false
}

function prevPeriod() {
  if (viewMode.value === 'week') {
    cursor.value = new Date(cursor.value.getTime() - 7 * 86400000)
  } else {
    cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() - 1, 1)
  }
  load()
}

function nextPeriod() {
  if (viewMode.value === 'week') {
    cursor.value = new Date(cursor.value.getTime() + 7 * 86400000)
  } else {
    cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 1)
  }
  load()
}

async function aiSuggestSchedule() {
  const r = (await window.ohsocial.invoke('schedule:suggest')) as { success: boolean; content?: string; error?: string }
  if (r.success && r.content) aiSuggest.value = r.content
  else if (r.error) alert(r.error)
}

async function applyTemplate(templateId: number) {
  const start = weekStart(cursor.value).toISOString().slice(0, 10)
  await window.ohsocial.invoke('template:apply', templateId, start)
  showTemplates.value = false
  await load()
}

async function createDefaultTemplate() {
  await window.ohsocial.invoke('template:create', '每周基础排期', {
    cycle: 'weekly',
    slots: [
      { day: 1, time: '09:00', platform: 'wechat', contentType: '文章' },
      { day: 3, time: '12:00', platform: 'xiaohongshu', contentType: '图文' },
      { day: 5, time: '18:00', platform: 'douyin', contentType: '短视频' }
    ]
  })
  await load()
}

function openCreate(date: Date) {
  form.value.scheduledAtLocal = toInputValue(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0))
  showForm.value = true
}

async function createSchedule() {
  if (!form.value.scheduledAtLocal) return
  const scheduledAt = form.value.scheduledAtLocal.replace('T', ' ') + ':00'
  const input: ScheduleCreateInput = {
    platform: form.value.platform,
    scheduledAt,
    contentId: form.value.contentId,
    reminderMinutes: form.value.reminderMinutes
  }
  await window.ohsocial.invoke('schedule:create', input)
  showForm.value = false
  await load()
}

async function markPublished(id: number) {
  await window.ohsocial.invoke('schedule:update', id, { status: 'published' })
  await load()
}

async function removeSchedule(id: number) {
  if (!confirm('删除这条排期？')) return
  await window.ohsocial.invoke('schedule:delete', id)
  await load()
}

function applyRouteContent() {
  const id = route.query.contentId
  if (!id) return
  form.value.contentId = Number(id)
  showForm.value = true
}

watch(() => route.query.contentId, applyRouteContent)

onMounted(async () => {
  const list = await loadPlatforms()
  if (list.length && !form.value.platform) form.value.platform = list[0].id
  form.value.scheduledAtLocal = toInputValue(new Date())
  await load()
  applyRouteContent()
})
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6">
    <header class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold">排期</h2>
        <p class="text-base-content/60 text-sm mt-1">发布计划与提醒</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <div class="join">
          <button class="btn btn-sm join-item" :class="{ 'btn-active': viewMode === 'month' }" @click="viewMode = 'month'; load()">月</button>
          <button class="btn btn-sm join-item" :class="{ 'btn-active': viewMode === 'week' }" @click="viewMode = 'week'; load()">周</button>
        </div>
        <button class="btn btn-sm btn-ghost" @click="prevPeriod">←</button>
        <span class="btn btn-sm btn-ghost no-animation">{{ monthLabel }}</span>
        <button class="btn btn-sm btn-ghost" @click="nextPeriod">→</button>
        <button class="btn btn-outline btn-sm" @click="aiSuggestSchedule">AI 建议</button>
        <button class="btn btn-outline btn-sm" @click="showTemplates = !showTemplates">模板</button>
        <button class="btn btn-primary btn-sm" @click="showForm = true">添加排期</button>
      </div>
    </header>

    <div v-if="showForm" class="card bg-base-200 mb-4">
      <div class="card-body py-4 gap-3">
        <div class="flex flex-wrap gap-3">
          <select v-model="form.platform" class="select select-bordered select-sm">
            <option v-for="p in platforms" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <input v-model="form.scheduledAtLocal" type="datetime-local" class="input input-bordered input-sm" />
          <select v-model="form.contentId" class="select select-bordered select-sm max-w-xs">
            <option :value="null">不关联内容</option>
            <option v-for="c in contents" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
          <input v-model.number="form.reminderMinutes" type="number" min="5" class="input input-bordered input-sm w-24" placeholder="提醒(分)" />
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" @click="createSchedule">保存</button>
          <button class="btn btn-ghost btn-sm" @click="showForm = false">取消</button>
        </div>
      </div>
    </div>

    <div v-if="aiSuggest" class="alert mb-4 text-sm whitespace-pre-wrap">
      <div class="flex-1">{{ aiSuggest }}</div>
      <button class="btn btn-xs btn-ghost" @click="aiSuggest = ''">关闭</button>
    </div>

    <div v-if="showTemplates" class="card bg-base-200 mb-4">
      <div class="card-body py-3 gap-2">
        <p class="text-sm font-medium">排期模板</p>
        <button v-if="templates.length === 0" class="btn btn-xs btn-outline w-fit" @click="createDefaultTemplate">创建示例模板</button>
        <div v-for="t in templates" :key="t.id" class="flex gap-2 items-center">
          <span class="text-sm">{{ t.name }}</span>
          <button class="btn btn-xs btn-primary" @click="applyTemplate(t.id)">应用到本周</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><span class="loading loading-spinner" /></div>

    <div v-else-if="viewMode === 'week'" class="grid grid-cols-7 gap-2">
      <div
        v-for="(day, idx) in weekDays"
        :key="idx"
        class="min-h-32 p-2 border border-base-300 rounded-box"
        @click="openCreate(day.date)"
      >
        <div class="text-xs font-bold mb-2">{{ ['一','二','三','四','五','六','日'][idx] }} {{ day.date.getDate() }}</div>
        <div v-for="item in day.items" :key="item.id" class="text-xs p-1 mb-1 rounded bg-primary/15 truncate">
          {{ item.scheduledAt.slice(11, 16) }} {{ item.platform }}
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-7 gap-1 text-center text-xs mb-1 text-base-content/50">
      <div v-for="d in ['一','二','三','四','五','六','日']" :key="d">{{ d }}</div>
    </div>
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="(day, idx) in calendarDays"
        :key="idx"
        class="min-h-24 p-1 border border-base-300 rounded-box text-left cursor-pointer hover:bg-base-200/50"
        :class="{ 'opacity-40': !day.inMonth, 'bg-error/5': day.items.some(i => i.status === 'overdue') }"
        @click="openCreate(day.date)"
      >
        <div class="text-xs font-medium mb-1">{{ day.date.getDate() }}</div>
        <div
          v-for="item in day.items.slice(0, 3)"
          :key="item.id"
          class="text-[10px] truncate px-1 py-0.5 rounded mb-0.5"
          :class="item.status === 'overdue' ? 'bg-error/20' : item.status === 'published' ? 'bg-success/20' : 'bg-primary/15'"
          @click.stop
        >
          {{ item.contentTitle || item.topicTitle || '排期' }}
          <button class="ml-1 underline" @click.stop="markPublished(item.id)">✓</button>
          <button class="ml-1 text-error" @click.stop="removeSchedule(item.id)">×</button>
        </div>
      </div>
    </div>

    <div v-if="schedules.length === 0 && !loading" class="text-center py-8 text-base-content/50 text-sm">
      本周没有发布计划，点击日历格子添加排期
    </div>
  </div>
</template>
