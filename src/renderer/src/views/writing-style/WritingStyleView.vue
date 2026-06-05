<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { WritingStyle, WritingStyleCreateInput } from '../../../../shared/types/writing-style'

const styles = ref<WritingStyle[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)

const form = ref({
  name: '',
  description: '',
  promptTemplate: '',
  referenceText: '',
  isDefault: false
})

const formTitle = computed(() => (editingId.value ? '编辑文风' : '新建文风'))

async function load() {
  loading.value = true
  styles.value = (await window.ohsocial.invoke('writing-style:list')) as WritingStyle[]
  loading.value = false
}

function resetForm() {
  editingId.value = null
  form.value = {
    name: '',
    description: '',
    promptTemplate: '',
    referenceText: '',
    isDefault: false
  }
}

function openCreate() {
  resetForm()
  showForm.value = true
}

function openEdit(style: WritingStyle) {
  editingId.value = style.id
  form.value = {
    name: style.name,
    description: style.description,
    promptTemplate: style.promptTemplate,
    referenceText: style.referenceText,
    isDefault: style.isDefault
  }
  showForm.value = true
}

async function save() {
  const name = form.value.name.trim()
  const promptTemplate = form.value.promptTemplate.trim()
  if (!name || !promptTemplate) return
  saving.value = true
  const payload: WritingStyleCreateInput = {
    name,
    description: form.value.description.trim(),
    promptTemplate,
    referenceText: form.value.referenceText.trim(),
    isDefault: form.value.isDefault,
    source: 'manual'
  }
  if (editingId.value) {
    await window.ohsocial.invoke('writing-style:update', editingId.value, payload)
  } else {
    await window.ohsocial.invoke('writing-style:create', payload)
  }
  saving.value = false
  showForm.value = false
  resetForm()
  await load()
}

function sourceLabel(source: WritingStyle['source']) {
  if (source === 'builtin') return '内置'
  if (source === 'ai_analysis') return 'AI 分析'
  return '手动'
}

async function removeStyle(style: WritingStyle) {
  if (style.source === 'builtin') return
  if (!confirm(`确定删除文风「${style.name}」？`)) return
  const r = (await window.ohsocial.invoke('writing-style:delete', style.id)) as {
    success: boolean
    error?: string
  }
  if (!r.success && r.error) alert(r.error)
  await load()
}

async function setDefault(style: WritingStyle) {
  await window.ohsocial.invoke('writing-style:update', style.id, { isDefault: true })
  await load()
}

onMounted(load)
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6">
    <header class="flex items-center justify-between mb-6 flex-wrap gap-2">
      <div>
        <h2 class="text-2xl font-bold">文风管理</h2>
        <p class="text-base-content/60 text-sm mt-1">定义写作风格，在创作时绑定到文章，AI 生成将按文风代笔</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCreate">新建文风</button>
    </header>

    <div v-if="showForm" class="card bg-base-200 mb-4">
      <div class="card-body py-4 gap-3">
        <h3 class="font-semibold">{{ formTitle }}</h3>
        <input v-model="form.name" type="text" class="input input-bordered" placeholder="文风名称，如：口语化科普" />
        <input v-model="form.description" type="text" class="input input-bordered" placeholder="简短说明（可选）" />
        <textarea
          v-model="form.promptTemplate"
          class="textarea textarea-bordered min-h-32 font-mono text-sm"
          placeholder="文风 Prompt：描述语气、句式、用词、结构等要求…"
        />
        <textarea
          v-model="form.referenceText"
          class="textarea textarea-bordered min-h-24 text-sm"
          placeholder="参考范文（可选）：AI 将模仿其表达方式"
        />
        <label class="flex items-center gap-2 text-sm cursor-pointer w-fit">
          <input v-model="form.isDefault" type="checkbox" class="checkbox checkbox-sm" />
          设为默认文风（新建文章时自动选用）
        </label>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" :disabled="saving || !form.name.trim() || !form.promptTemplate.trim()" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
          <button class="btn btn-ghost btn-sm" @click="showForm = false">取消</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12"><span class="loading loading-spinner" /></div>

    <div v-else-if="styles.length === 0" class="text-center py-16 text-base-content/50">
      <p class="text-lg mb-2">还没有文风</p>
      <p class="text-sm">可手动创建，或在 AI 助手分析文风后保存到此</p>
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="style in styles"
        :key="style.id"
        class="card bg-base-200/80 border border-base-300/50"
      >
        <div class="card-body py-4 gap-2">
          <div class="flex flex-wrap items-start gap-2">
            <h3 class="font-semibold flex-1">{{ style.name }}</h3>
            <span v-if="style.isDefault" class="badge badge-primary badge-sm">默认</span>
            <span
              class="badge badge-sm"
              :class="style.source === 'builtin' ? 'badge-secondary' : 'badge-ghost'"
            >
              {{ sourceLabel(style.source) }}
            </span>
          </div>
          <p v-if="style.description" class="text-sm text-base-content/65">{{ style.description }}</p>
          <p class="text-xs text-base-content/45 line-clamp-2 font-mono">{{ style.promptTemplate }}</p>
          <p v-if="style.referenceText" class="text-xs text-base-content/40">
            参考范文 {{ style.referenceText.length }} 字
          </p>
          <div class="flex flex-wrap gap-2 pt-2 border-t border-base-300/40">
            <button class="btn btn-sm btn-primary btn-outline" @click="openEdit(style)">编辑</button>
            <button v-if="!style.isDefault" class="btn btn-sm btn-ghost" @click="setDefault(style)">设为默认</button>
            <button
              v-if="style.source !== 'builtin'"
              class="btn btn-sm btn-ghost text-error ml-auto"
              @click="removeStyle(style)"
            >
              删除
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
