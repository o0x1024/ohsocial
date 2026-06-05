<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
interface Conversation {
  id: number
  title: string
  skillId: string | null
}

interface Message {
  id: number
  role: string
  content: string
  toolName?: string | null
}

const route = useRoute()
const router = useRouter()

const conversations = ref<Conversation[]>([])
const messages = ref<Message[]>([])
const activeId = ref<number | null>(null)
const searchQuery = ref('')
const input = ref('')
const skillId = ref('')
const loading = ref(false)
const sending = ref(false)
const hasModel = ref(false)
const streamingText = ref('')
const listRef = ref<HTMLElement | null>(null)

const skills = ref<Array<{ id: string; name: string }>>([])

let deltaHandler: ((...args: unknown[]) => void) | null = null

const activeTitle = computed(() => {
  if (!activeId.value) return 'AI 助手'
  return conversations.value.find(c => c.id === activeId.value)?.title ?? 'AI 助手'
})

const filteredConversations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter(c => c.title.toLowerCase().includes(q))
})

const displayMessages = computed(() => {
  const list = [...messages.value]
  if (streamingText.value) {
    list.push({ id: -1, role: 'assistant', content: streamingText.value })
  }
  return list
})

async function loadConversations() {
  conversations.value = (await window.ohsocial.invoke('assistant:conversations')) as Conversation[]
}

async function selectConversation(id: number) {
  activeId.value = id
  router.replace({ path: `/assistant/${id}` })
  messages.value = (await window.ohsocial.invoke('assistant:messages', id)) as Message[]
  streamingText.value = ''
  await nextTick()
  listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' })
}

async function newChat() {
  const conv = (await window.ohsocial.invoke('assistant:create', skillId.value || undefined)) as Conversation
  await loadConversations()
  await selectConversation(conv.id)
}

async function deleteConversation(id: number, event: Event) {
  event.stopPropagation()
  if (!confirm('删除此对话？')) return
  await window.ohsocial.invoke('assistant:delete', id)
  if (activeId.value === id) activeId.value = null
  await loadConversations()
}

async function send() {
  const text = input.value.trim()
  if (!text || !activeId.value || sending.value) return
  sending.value = true
  input.value = ''
  messages.value.push({ id: -2, role: 'user', content: text })
  streamingText.value = ''
  await nextTick()
  listRef.value?.scrollTo({ top: listRef.value.scrollHeight })

  const result = (await window.ohsocial.invoke(
    'assistant:chat',
    activeId.value,
    text,
    skillId.value || undefined
  )) as { success: boolean; error?: string }

  if (!result.success && result.error) {
    messages.value.push({ id: -3, role: 'assistant', content: `错误：${result.error}` })
  }
  sending.value = false
  streamingText.value = ''
  messages.value = (await window.ohsocial.invoke('assistant:messages', activeId.value)) as Message[]
  await loadConversations()
  await nextTick()
  listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' })
}

onMounted(async () => {
  hasModel.value = (await window.ohsocial.invoke('model:hasEnabled')) as boolean
  skills.value = [
    { id: '', name: '自由对话' },
    ...((await window.ohsocial.invoke('assistant:skills')) as Array<{ id: string; name: string }>)
  ]
  await loadConversations()

  deltaHandler = (payload: unknown) => {
    const p = payload as { conversationId?: number; delta?: string; mode?: string }
    if (p.mode === 'assistant' && p.conversationId === activeId.value && p.delta) {
      streamingText.value += p.delta
      nextTick(() => listRef.value?.scrollTo({ top: listRef.value.scrollHeight }))
    }
  }
  window.ohsocial.on('ai:delta', deltaHandler)

  const id = Number(route.params.id)
  if (id && conversations.value.some(c => c.id === id)) {
    await selectConversation(id)
  }
})

onUnmounted(() => {
  if (deltaHandler) window.ohsocial.off('ai:delta', deltaHandler)
})
</script>

<template>
  <div class="flex flex-col h-full min-h-0 animate-fade-in">
    <header class="h-12 border-b border-base-300 flex items-center px-4 shrink-0 gap-3">
      <h1 class="text-sm font-bold shrink-0 min-w-0 truncate max-w-[240px]">
        {{ activeTitle }}
      </h1>
      <div class="ml-auto flex items-center gap-2 shrink-0">
        <select
          v-model="skillId"
          class="select select-bordered select-sm h-8 min-h-8 text-xs max-w-[160px]"
          :disabled="sending"
        >
          <option v-for="s in skills" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <span v-if="!hasModel" class="text-xs text-warning hidden sm:inline">请配置 AI</span>
      </div>
    </header>

    <div class="flex flex-1 min-h-0">
      <aside class="w-72 border-r border-base-300 shrink-0 flex flex-col min-h-0 bg-base-200/30">
        <div class="p-4 border-b border-base-300 shrink-0 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-bold text-sm">对话</h2>
            <button type="button" class="btn btn-primary btn-sm h-8 min-h-8" @click="newChat">新建</button>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            class="input input-bordered input-sm w-full"
            placeholder="搜索对话…"
          />
        </div>
        <ul class="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
          <li
            v-for="c in filteredConversations"
            :key="c.id"
            class="group flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer text-sm transition-colors"
            :class="activeId === c.id ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-base-300/50'"
            @click="selectConversation(c.id)"
          >
            <span class="flex-1 truncate">{{ c.title }}</span>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 text-error"
              @click="deleteConversation(c.id, $event)"
            >
              ×
            </button>
          </li>
        </ul>
      </aside>

      <section class="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div
          v-if="!activeId"
          class="flex-1 flex flex-col items-center justify-center text-base-content/40 gap-2"
        >
          <font-awesome-icon icon="robot" class="text-4xl opacity-20" />
          <p class="text-sm">选择左侧对话，或新建一个开始</p>
        </div>

        <template v-else>
          <div ref="listRef" class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            <div
              v-for="(m, i) in displayMessages"
              :key="`${m.id}-${i}`"
              class="flex"
              :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap shadow-sm"
                :class="
                  m.role === 'user'
                    ? 'bg-primary text-primary-content rounded-br-md'
                    : m.role === 'tool'
                      ? 'bg-base-300 font-mono text-xs rounded-bl-md'
                      : 'bg-base-200 border border-base-300/60 rounded-bl-md'
                "
              >
                <span v-if="m.toolName" class="text-xs opacity-60 block mb-1">工具 {{ m.toolName }}</span>
                {{ m.content }}
                <span v-if="m.id === -1 && sending" class="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse" />
              </div>
            </div>
            <div v-if="sending && !streamingText" class="text-sm text-base-content/50 flex items-center gap-2">
              <span class="loading loading-spinner loading-xs" />
              思考中…
            </div>
          </div>

          <footer class="shrink-0 border-t border-base-300 p-4 bg-base-100/80">
            <div class="flex gap-2 items-end max-w-4xl mx-auto w-full">
              <textarea
                v-model="input"
                rows="1"
                class="textarea textarea-bordered flex-1 min-h-[2.5rem] max-h-32 text-sm resize-none"
                placeholder="输入问题，Enter 发送"
                :disabled="sending || !hasModel"
                @keydown.enter.exact.prevent="send"
              />
              <button
                type="button"
                class="btn btn-primary h-10 min-h-10 px-5"
                :disabled="sending || !hasModel || !input.trim()"
                @click="send"
              >
                发送
              </button>
            </div>
          </footer>
        </template>
      </section>
    </div>
  </div>
</template>
