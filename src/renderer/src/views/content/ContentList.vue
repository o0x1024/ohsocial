<script lang="ts">
export default { name: 'ContentList' }
</script>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Content } from '../../../../shared/types/content'
import type { Topic } from '../../../../shared/types/topic'
import { CONTENT_STATUS_LABELS } from '../../../../shared/constants/platforms'
import { usePlatformList } from '../../composables/usePlatformList'

const route = useRoute()
const router = useRouter()
const contents = ref<Content[]>([])
const topics = ref<Topic[]>([])
const loading = ref(true)
const showCreate = ref(false)
const selectedTopicId = ref<number | ''>('')
const filterPlatform = ref('')
const creating = ref(false)

const { platforms, loadPlatforms, platformLabel } = usePlatformList()

const selectedTopic = computed(() =>
  selectedTopicId.value ? topics.value.find(t => t.id === selectedTopicId.value) : undefined
)

const filteredTopics = computed(() => {
  if (!filterPlatform.value) return topics.value
  return topics.value.filter(t => t.targetPlatforms.includes(filterPlatform.value))
})

function contentPlatformLabel(item: Content): string | null {
  if (item.platform && item.platform !== 'origin') return platformLabel(item.platform)
  const platforms = item.meta?.targetPlatforms
  if (Array.isArray(platforms) && platforms.length > 0) {
    return platforms.map(p => platformLabel(String(p))).join('、')
  }
  return null
}

async function load() {
  loading.value = true
  const filter = filterPlatform.value ? { platform: filterPlatform.value } : undefined
  contents.value = (await window.ohsocial.invoke('content:list', filter)) as Content[]
  topics.value = (await window.ohsocial.invoke('topic:list', filter)) as Topic[]
  loading.value = false
}

async function createFromTopic(topicId: number) {
  creating.value = true
  const r = (await window.ohsocial.invoke('content:create-from-topic', topicId)) as {
    success: boolean
    content?: Content
    error?: string
  }
  creating.value = false
  if (r.success && r.content) {
    showCreate.value = false
    selectedTopicId.value = ''
    router.push(`/contents/${r.content.id}/edit`)
  } else if (r.error) alert(r.error)
}

async function createContent() {
  if (selectedTopicId.value) {
    await createFromTopic(Number(selectedTopicId.value))
    return
  }
  const title = prompt('输入内容标题')
  if (!title?.trim()) return
  creating.value = true
  const created = (await window.ohsocial.invoke('content:create', { title: title.trim() })) as Content
  creating.value = false
  showCreate.value = false
  router.push(`/contents/${created.id}/edit`)
}

async function deleteContent(id: number) {
  if (!confirm('确定删除这篇内容？')) return
  await window.ohsocial.invoke('content:delete', id)
  await load()
}

watch(filterPlatform, () => load())

watch(
  () => route.query.topicId,
  async topicId => {
    if (!topicId) return
    await load()
    await createFromTopic(Number(topicId))
    router.replace({ path: '/contents' })
  },
  { immediate: true }
)

onMounted(async () => {
  await loadPlatforms()
  await load()
})
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6">
    <header class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <div>
        <h2 class="text-2xl font-bold">创作</h2>
        <p class="text-base-content/60 text-sm mt-1">按平台管理图文内容</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="showCreate = !showCreate">
        <font-awesome-icon icon="plus" />
        新建内容
      </button>
    </header>

    <div role="tablist" class="tabs tabs-boxed mb-4 w-fit h-auto gap-1">
      <button
        type="button"
        role="tab"
        class="tab tab-sm"
        :class="{ 'tab-active': !filterPlatform }"
        @click="filterPlatform = ''"
      >
        全部平台
      </button>
      <button
        v-for="p in platforms"
        :key="p.id"
        type="button"
        role="tab"
        class="tab tab-sm"
        :class="{ 'tab-active': filterPlatform === p.id }"
        @click="filterPlatform = p.id"
      >
        {{ p.name }}
      </button>
    </div>

    <div v-if="showCreate" class="card bg-base-200 mb-4">
      <div class="card-body py-4 gap-3">
        <p class="text-sm text-base-content/60">从选题创建时，标题自动使用选题标题</p>
        <select v-model="selectedTopicId" class="select select-bordered select-sm w-full max-w-md">
          <option value="">独立内容（需自填标题）</option>
          <option v-for="t in filteredTopics" :key="t.id" :value="t.id">{{ t.title }}</option>
        </select>
        <p v-if="selectedTopic" class="text-sm font-medium">标题：{{ selectedTopic.title }}</p>
        <button
          class="btn btn-primary btn-sm w-fit"
          :disabled="creating"
          @click="createContent"
        >
          {{ creating ? '创建中…' : selectedTopicId ? '从选题创建并编辑' : '创建独立内容' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><span class="loading loading-spinner" /></div>

    <div v-else-if="contents.length === 0" class="text-center py-16 text-base-content/50">
      <p class="text-lg mb-2">还没有内容</p>
      <p class="text-sm">
        {{ filterPlatform ? `${platformLabel(filterPlatform)} 暂无内容，` : '' }}从选题开始写，或直接新建内容
      </p>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="item in contents"
        :key="item.id"
        class="flex items-center gap-3 p-4 bg-base-200 rounded-box hover:bg-base-300/50 cursor-pointer"
        @click="router.push(`/contents/${item.id}/edit`)"
      >
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ item.title }}</p>
          <p class="text-xs text-base-content/50 mt-0.5">
            {{ CONTENT_STATUS_LABELS[item.status] ?? item.status }} · {{ item.wordCount }} 字
            <span v-if="contentPlatformLabel(item)"> · {{ contentPlatformLabel(item) }}</span>
          </p>
        </div>
        <div class="flex gap-1 shrink-0">
          <button class="btn btn-ghost btn-sm" @click.stop="router.push(`/contents/${item.id}/script`)">脚本</button>
          <button class="btn btn-ghost btn-sm btn-square text-error" @click.stop="deleteContent(item.id)">
            <font-awesome-icon icon="trash" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
