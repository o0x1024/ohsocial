<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DiffLine } from '../../../../shared/text-diff'

interface Version {
  id: number
  contentId: number
  title: string
  body: string
  operation: string
  wordCount: number
  createdAt: string
}

const route = useRoute()
const router = useRouter()
const contentId = computed(() => Number(route.params.id))
const versions = ref<Version[]>([])
const selectedA = ref<number | null>(null)
const selectedB = ref<number | null>(null)
const diff = ref<DiffLine[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  versions.value = (await window.ohsocial.invoke('version:list', contentId.value)) as Version[]
  loading.value = false
}

async function showDiff() {
  if (!selectedA.value || !selectedB.value) return
  diff.value = (await window.ohsocial.invoke('version:diff', selectedA.value, selectedB.value)) as DiffLine[]
}

async function restore(versionId: number) {
  if (!confirm('恢复到此版本？当前内容会先保存为历史版本。')) return
  const r = (await window.ohsocial.invoke('version:restore', versionId)) as { success: boolean }
  if (r.success) router.push(`/contents/${contentId.value}/edit`)
}

onMounted(load)
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6">
    <header class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="router.push(`/contents/${contentId}/edit`)">← 返回编辑</button>
      <h2 class="text-xl font-bold">版本历史</h2>
    </header>

    <div v-if="loading" class="flex justify-center py-12"><span class="loading loading-spinner" /></div>

    <div v-else-if="versions.length === 0" class="text-center py-16 text-base-content/50">
      暂无历史版本，编辑保存后会自动记录
    </div>

    <template v-else>
      <ul class="space-y-2 mb-6">
        <li
          v-for="v in versions"
          :key="v.id"
          class="flex items-center gap-3 p-3 bg-base-200 rounded-box text-sm"
        >
          <input type="radio" :name="'a'" @change="selectedA = v.id" />
          <input type="radio" :name="'b'" @change="selectedB = v.id" />
          <div class="flex-1">
            <span class="font-medium">{{ v.operation }}</span>
            <span class="text-base-content/50 ml-2">{{ v.createdAt }}</span>
            <span class="text-base-content/50 ml-2">{{ v.wordCount }} 字</span>
          </div>
          <button class="btn btn-xs btn-primary" @click="restore(v.id)">恢复</button>
        </li>
      </ul>

      <div class="flex gap-2 mb-4">
        <button class="btn btn-sm btn-outline" :disabled="!selectedA || !selectedB" @click="showDiff">对比选中版本</button>
      </div>

      <div v-if="diff.length" class="font-mono text-xs space-y-0.5 bg-base-300 p-4 rounded-box max-h-96 overflow-y-auto">
        <div
          v-for="(line, i) in diff"
          :key="i"
          :class="{
            'bg-success/20': line.type === 'add',
            'bg-error/20 line-through': line.type === 'remove',
            'text-base-content/70': line.type === 'same'
          }"
        >
          {{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ' }} {{ line.text }}
        </div>
      </div>
    </template>
  </div>
</template>
