<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { AssistantWorkReference } from '../../../../shared/assistant-types'
import type { Content } from '../../../../shared/types/content'
import type { Topic } from '../../../../shared/types/topic'

const props = defineProps<{
  attachedKeys: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  pick: [ref: AssistantWorkReference]
}>()

const show = ref(false)
const contents = ref<Content[]>([])
const topics = ref<Topic[]>([])

function refKey(ref: AssistantWorkReference): string {
  return `${ref.workId}:${ref.chapterId ?? 'all'}`
}

onMounted(async () => {
  contents.value = (await window.ohsocial.invoke('content:list')) as Content[]
  topics.value = (await window.ohsocial.invoke('topic:list')) as Topic[]
})

function pickContent(c: Content) {
  emit('pick', { workId: c.id, chapterId: null, title: c.title })
  show.value = false
}

function pickTopic(t: Topic) {
  emit('pick', { workId: t.id, chapterId: null, title: t.title })
  show.value = false
}
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content"
    :disabled="disabled"
    title="引用内容/选题"
    @click="show = true"
  >
    <font-awesome-icon icon="link" class="w-3.5 h-3.5" />
  </button>

  <dialog :class="['modal', { 'modal-open': show }]">
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-base mb-3">引用内容或选题</h3>
      <p class="text-xs text-base-content/50 mb-3">将本地内容/选题正文作为对话上下文</p>
      <div class="max-h-64 overflow-y-auto space-y-3">
        <div>
          <p class="text-xs font-bold text-base-content/50 mb-1">内容</p>
          <ul class="menu menu-sm bg-base-200 rounded-box">
            <li v-for="c in contents.slice(0, 30)" :key="'c' + c.id">
              <button
                type="button"
                :disabled="attachedKeys.includes(refKey({ workId: c.id, title: c.title }))"
                @click="pickContent(c)"
              >
                {{ c.title }}
              </button>
            </li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-bold text-base-content/50 mb-1">选题</p>
          <ul class="menu menu-sm bg-base-200 rounded-box">
            <li v-for="t in topics.slice(0, 20)" :key="'t' + t.id">
              <button
                type="button"
                :disabled="attachedKeys.includes(refKey({ workId: t.id, title: t.title }))"
                @click="pickTopic(t)"
              >
                {{ t.title }}
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div class="modal-action">
        <button type="button" class="btn btn-sm" @click="show = false">关闭</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="show = false"><button type="button">close</button></form>
  </dialog>
</template>
