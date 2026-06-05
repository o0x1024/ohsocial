<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Material, MaterialCreateInput } from '../../../../shared/types/material'

const materials = ref<Material[]>([])
const loading = ref(true)
const showForm = ref(false)
const form = ref<MaterialCreateInput>({ type: 'text_snippet', title: '', content: '', url: '' })

async function load() {
  loading.value = true
  materials.value = (await window.ohsocial.invoke('material:list')) as Material[]
  loading.value = false
}

async function create() {
  if (!form.value.title.trim()) return
  await window.ohsocial.invoke('material:create', { ...form.value })
  form.value = { type: 'text_snippet', title: '', content: '', url: '' }
  showForm.value = false
  await load()
}

async function pickImage() {
  const r = (await window.ohsocial.invoke('material:pick-image')) as { success: boolean }
  if (r.success) await load()
}

async function aiTags(id: number) {
  await window.ohsocial.invoke('material:ai-tags', id)
  await load()
}

async function remove(id: number) {
  if (!confirm('删除这条素材？')) return
  await window.ohsocial.invoke('material:delete', id)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6">
    <header class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <div>
        <h2 class="text-2xl font-bold">素材</h2>
        <p class="text-base-content/60 text-sm mt-1">文案片段、参考链接与图片</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" @click="pickImage">添加图片</button>
        <button class="btn btn-primary btn-sm" @click="showForm = !showForm">添加素材</button>
      </div>
    </header>

    <div v-if="showForm" class="card bg-base-200 mb-4">
      <div class="card-body py-4 gap-2">
        <select v-model="form.type" class="select select-bordered select-sm w-40">
          <option value="text_snippet">文案片段</option>
          <option value="link">参考链接</option>
        </select>
        <input v-model="form.title" class="input input-bordered" placeholder="标题" />
        <textarea v-if="form.type === 'text_snippet'" v-model="form.content" class="textarea textarea-bordered" rows="3" placeholder="内容" />
        <input v-if="form.type === 'link'" v-model="form.url" class="input input-bordered" placeholder="https://..." />
        <button class="btn btn-primary btn-sm w-fit" @click="create">保存</button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><span class="loading loading-spinner" /></div>
    <div v-else-if="materials.length === 0" class="text-center py-16 text-base-content/50">还没有素材</div>
    <ul v-else class="space-y-2">
      <li v-for="m in materials" :key="m.id" class="p-4 bg-base-200 rounded-box">
        <div class="flex justify-between gap-2">
          <div class="flex-1 min-w-0">
            <span class="badge badge-sm mr-2">{{ m.type }}</span>
            <span class="font-medium">{{ m.title }}</span>
            <p v-if="m.type === 'image'" class="text-xs text-base-content/50 mt-1 truncate">{{ m.content }}</p>
            <p v-else-if="m.content" class="text-sm text-base-content/60 mt-1 line-clamp-2">{{ m.content }}</p>
            <p v-if="m.url" class="text-xs link mt-1 truncate">{{ m.url }}</p>
            <div v-if="m.tags?.length" class="flex gap-1 mt-2 flex-wrap">
              <span v-for="t in m.tags" :key="t" class="badge badge-xs">{{ t }}</span>
            </div>
          </div>
          <div class="flex gap-1 shrink-0">
            <button class="btn btn-xs btn-outline" @click="aiTags(m.id)">AI 标签</button>
            <button class="btn btn-ghost btn-sm text-error" @click="remove(m.id)">删</button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
