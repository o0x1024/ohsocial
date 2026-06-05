<script lang="ts">
export default { name: 'ScriptEditor' }
</script>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { VideoScript, ScriptScene } from '../../../../shared/types/script'
import type { Content } from '../../../../shared/types/content'

const route = useRoute()
const router = useRouter()
const contentId = computed(() => Number(route.params.id))

const content = ref<Content | null>(null)
const script = ref<VideoScript | null>(null)
const videoType = ref('口播')
const duration = ref(60)
const aiLoading = ref(false)
const hasModel = ref(false)

const scenes = ref<ScriptScene[]>([
  { sceneNo: 1, visual: '', dialogue: '', subtitle: '', duration: 5, notes: '' }
])

function defaultScenes(): ScriptScene[] {
  return [{ sceneNo: 1, visual: '', dialogue: '', subtitle: '', duration: 5, notes: '' }]
}

async function load() {
  content.value = (await window.ohsocial.invoke('content:get', contentId.value)) as Content | null
  if (!content.value) {
    router.replace('/contents')
    return
  }
  script.value = (await window.ohsocial.invoke('script:get', contentId.value)) as VideoScript | null
  if (script.value) {
    videoType.value = script.value.videoType
    duration.value = script.value.durationSeconds
    scenes.value = script.value.scenes.length ? script.value.scenes.map(s => ({ ...s })) : defaultScenes()
  }
}

async function save() {
  script.value = (await window.ohsocial.invoke('script:save', {
    contentId: contentId.value,
    videoType: videoType.value,
    durationSeconds: duration.value,
    scenes: scenes.value
  })) as VideoScript
}

function addScene() {
  scenes.value.push({
    sceneNo: scenes.value.length + 1,
    visual: '',
    dialogue: '',
    subtitle: '',
    duration: 5,
    notes: ''
  })
}

function removeScene(i: number) {
  scenes.value.splice(i, 1)
  scenes.value.forEach((s, idx) => { s.sceneNo = idx + 1 })
}

async function aiGenerate() {
  if (aiLoading.value) return
  aiLoading.value = true
  await save()
  const result = (await window.ohsocial.invoke(
    'script:ai-generate',
    contentId.value,
    videoType.value,
    duration.value
  )) as { success: boolean; script?: VideoScript; error?: string }
  aiLoading.value = false
  if (result.success && result.script) {
    script.value = result.script
    scenes.value = result.script.scenes.length ? result.script.scenes.map(s => ({ ...s })) : defaultScenes()
  } else if (result.error) {
    alert(result.error)
  }
}

onMounted(async () => {
  hasModel.value = (await window.ohsocial.invoke('model:hasEnabled')) as boolean
  await load()
})
</script>

<template>
  <div v-if="content" class="flex-1 flex flex-col overflow-hidden">
    <header class="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-base-300">
      <button class="btn btn-ghost btn-sm" @click="router.push(`/contents/${contentId}/edit`)">← 图文</button>
      <span class="font-medium truncate flex-1">{{ content.title }} · 视频脚本</span>
      <select v-model="videoType" class="select select-bordered select-sm">
        <option>口播</option>
        <option>教程</option>
        <option>vlog</option>
        <option>剧情</option>
      </select>
      <input v-model.number="duration" type="number" class="input input-bordered input-sm w-20" title="秒" />
      <button class="btn btn-outline btn-sm" @click="save">保存</button>
      <button class="btn btn-primary btn-sm" :disabled="aiLoading || !hasModel" @click="aiGenerate">AI 生成脚本</button>
    </header>

    <div class="flex-1 overflow-y-auto p-6 space-y-4">
      <div v-for="(scene, i) in scenes" :key="i" class="card bg-base-200">
        <div class="card-body py-4 gap-2">
          <div class="flex justify-between items-center">
            <span class="font-semibold">镜号 {{ scene.sceneNo }}</span>
            <button class="btn btn-ghost btn-xs text-error" @click="removeScene(i)">删除</button>
          </div>
          <input v-model="scene.visual" class="input input-bordered input-sm" placeholder="画面描述" />
          <textarea v-model="scene.dialogue" class="textarea textarea-bordered textarea-sm" rows="2" placeholder="台词/旁白" />
          <input v-model="scene.subtitle" class="input input-bordered input-sm" placeholder="字幕" />
          <input v-model.number="scene.duration" type="number" class="input input-bordered input-sm w-24" placeholder="秒" />
        </div>
      </div>
      <button class="btn btn-outline btn-sm" @click="addScene">+ 添加分镜</button>
    </div>
  </div>
</template>
