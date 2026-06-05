<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { TOPIC_STATUS_LABELS } from '../../../../shared/constants/platforms'
import type { Topic, TopicCreateInput } from '../../../../shared/types/topic'

const router = useRouter()
const topics = ref<Topic[]>([])
const writingTopicId = ref<number | null>(null)
const loading = ref(true)
const showForm = ref(false)
const newTitle = ref('')
const filterStatus = ref('')
const viewMode = ref<'list' | 'kanban'>('list')
const aiLoading = ref(false)

const kanbanColumns = computed(() =>
  Object.keys(TOPIC_STATUS_LABELS).map(key => ({
    key,
    label: TOPIC_STATUS_LABELS[key],
    items: topics.value.filter(t => t.status === key)
  }))
)

async function loadTopics() {
  loading.value = true
  const statusFilter = viewMode.value === 'list' && filterStatus.value ? filterStatus.value : undefined
  topics.value = (await window.ohsocial.invoke('topic:list', statusFilter)) as Topic[]
  loading.value = false
}

async function createTopic() {
  const title = newTitle.value.trim()
  if (!title) return
  const input: TopicCreateInput = { title, status: 'idea' }
  await window.ohsocial.invoke('topic:create', input)
  newTitle.value = ''
  showForm.value = false
  await loadTopics()
}

async function updateStatus(topic: Topic, status: string) {
  await window.ohsocial.invoke('topic:update', topic.id, { status })
  await loadTopics()
}

async function deleteTopic(id: number) {
  if (!confirm('确定删除这个选题？')) return
  await window.ohsocial.invoke('topic:delete', id)
  await loadTopics()
}

async function aiRecommend() {
  aiLoading.value = true
  const r = (await window.ohsocial.invoke('topic:recommend')) as { success: boolean; error?: string }
  aiLoading.value = false
  if (r.success) await loadTopics()
  else if (r.error) alert(r.error)
}

async function startWriting(topic: Topic) {
  writingTopicId.value = topic.id
  const r = (await window.ohsocial.invoke('content:create-from-topic', topic.id)) as {
    success: boolean
    content?: { id: number }
    error?: string
  }
  writingTopicId.value = null
  if (r.success && r.content) {
    router.push(`/contents/${r.content.id}/edit`)
  } else if (r.error) {
    alert(r.error)
  }
}

async function aiScore(topic: Topic) {
  aiLoading.value = true
  const r = (await window.ohsocial.invoke('topic:score', topic.id)) as {
    success: boolean
    score?: number
    reason?: string
    error?: string
  }
  aiLoading.value = false
  if (r.success) await loadTopics()
  else if (r.error) alert(r.error)
}

watch(viewMode, () => {
  if (viewMode.value === 'kanban') filterStatus.value = ''
  loadTopics()
})

onMounted(loadTopics)
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6">
    <header class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <div>
        <h2 class="text-2xl font-bold">选题</h2>
        <p class="text-base-content/60 text-sm mt-1">选题 → 开始创作 → 排期发布</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <div class="join">
          <button class="btn btn-sm join-item" :class="{ 'btn-active': viewMode === 'kanban' }" @click="viewMode = 'kanban'">看板</button>
          <button class="btn btn-sm join-item" :class="{ 'btn-active': viewMode === 'list' }" @click="viewMode = 'list'">列表</button>
        </div>
        <button class="btn btn-outline btn-sm" :disabled="aiLoading" @click="aiRecommend">AI 推荐选题</button>
        <button class="btn btn-primary btn-sm" @click="showForm = !showForm">
          添加选题
        </button>
      </div>
    </header>

    <div v-if="showForm" class="card bg-base-200 mb-4">
      <div class="card-body py-4">
        <div class="flex gap-2">
          <input
            v-model="newTitle"
            type="text"
            placeholder="输入选题标题…"
            class="input input-bordered flex-1"
            @keyup.enter="createTopic"
          />
          <button class="btn btn-primary" :disabled="!newTitle.trim()" @click="createTopic">创建</button>
        </div>
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="tabs tabs-boxed mb-4 w-fit">
      <button class="tab" :class="{ 'tab-active': !filterStatus }" @click="filterStatus = ''; loadTopics()">全部</button>
      <button
        v-for="(label, key) in TOPIC_STATUS_LABELS"
        :key="key"
        class="tab"
        :class="{ 'tab-active': filterStatus === key }"
        @click="filterStatus = key; loadTopics()"
      >
        {{ label }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner" />
    </div>

    <div v-else-if="topics.length === 0" class="text-center py-16 text-base-content/50">
      <p class="text-lg mb-2">选题池是空的</p>
      <p class="text-sm">点击「添加选题」或使用 AI 推荐</p>
    </div>

    <div v-else-if="viewMode === 'kanban'" class="flex gap-3 overflow-x-auto pb-4">
      <div
        v-for="col in kanbanColumns"
        :key="col.key"
        class="min-w-[220px] flex-1 bg-base-200/50 rounded-box p-3"
      >
        <h3 class="font-semibold text-sm mb-2">{{ col.label }} ({{ col.items.length }})</h3>
        <div class="space-y-2 min-h-[80px]">
          <div
            v-for="topic in col.items"
            :key="topic.id"
            class="p-3 bg-base-100 rounded-box shadow-sm text-sm"
          >
            <p class="font-medium">{{ topic.title }}</p>
            <p v-if="topic.aiScore != null" class="text-xs text-primary mt-1">评分 {{ topic.aiScore }}</p>
            <div class="flex gap-1 mt-2 flex-wrap">
              <button
                class="btn btn-xs btn-primary"
                :disabled="writingTopicId === topic.id"
                @click="startWriting(topic)"
              >
                {{ writingTopicId === topic.id ? '…' : '创作' }}
              </button>
              <select
                class="select select-bordered select-xs select-inline min-w-[5.5rem] flex-1"
                :value="topic.status"
                @change="updateStatus(topic, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="(label, key) in TOPIC_STATUS_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
              <button class="btn btn-xs btn-ghost" :disabled="aiLoading" @click="aiScore(topic)">评</button>
              <button class="btn btn-xs btn-ghost text-error" @click="deleteTopic(topic.id)">删</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="topic-list w-full space-y-3">
      <article
        v-for="topic in topics"
        :key="topic.id"
        class="card bg-base-200/80 border border-base-300/50 shadow-sm hover:border-base-300 transition-colors"
      >
        <div class="card-body py-4 gap-2">
          <div class="flex flex-wrap items-start gap-2 gap-y-1">
            <h3 class="font-semibold text-base flex-1 min-w-[12rem] leading-snug break-words">
              {{ topic.title }}
            </h3>
            <span
              v-if="topic.aiScore != null"
              class="badge badge-primary badge-outline badge-sm shrink-0"
            >
              AI {{ topic.aiScore }} 分
            </span>
            <span class="badge badge-ghost badge-sm shrink-0">
              {{ TOPIC_STATUS_LABELS[topic.status] ?? topic.status }}
            </span>
          </div>

          <p v-if="topic.description" class="text-sm text-base-content/65 leading-relaxed break-words">
            {{ topic.description }}
          </p>
          <p
            v-if="topic.aiScoreReason"
            class="text-xs text-base-content/50 leading-relaxed line-clamp-3 break-words"
          >
            {{ topic.aiScoreReason }}
          </p>

          <div class="flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-base-300/40">
            <button
              type="button"
              class="btn btn-sm btn-primary"
              :disabled="writingTopicId === topic.id"
              @click="startWriting(topic)"
            >
              {{ writingTopicId === topic.id ? '进入中…' : '开始创作' }}
            </button>
            <select
              class="select select-bordered select-sm select-inline w-32"
              :value="topic.status"
              @change="updateStatus(topic, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="(label, key) in TOPIC_STATUS_LABELS" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
            <button
              type="button"
              class="btn btn-sm btn-outline"
              :disabled="aiLoading"
              @click="aiScore(topic)"
            >
              AI 评分
            </button>
            <button
              type="button"
              class="btn btn-sm btn-ghost text-error ml-auto"
              @click="deleteTopic(topic.id)"
            >
              删除
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
