<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ toast: [type: 'success' | 'error' | 'info', message: string] }>()
const busy = ref(false)

async function backupDb() {
  busy.value = true
  const r = (await window.ohsocial.invoke('backup:database')) as { success: boolean; path?: string; error?: string }
  busy.value = false
  if (r.success) emit('toast', 'success', `已备份到 ${r.path}`)
  else emit('toast', 'info', r.error ?? '已取消')
}

async function exportJson() {
  busy.value = true
  const r = (await window.ohsocial.invoke('backup:exportJson')) as { success: boolean; path?: string; error?: string }
  busy.value = false
  if (r.success) emit('toast', 'success', `已导出到 ${r.path}`)
  else emit('toast', 'info', r.error ?? '已取消')
}

async function exportMd() {
  busy.value = true
  const r = (await window.ohsocial.invoke('export:all')) as { success: boolean; path?: string; error?: string }
  busy.value = false
  if (r.success) emit('toast', 'success', `Markdown 已导出到 ${r.path}`)
  else emit('toast', 'info', r.error ?? '已取消')
}

async function restoreDb() {
  if (!confirm('恢复将覆盖当前数据，是否继续？')) return
  busy.value = true
  const r = (await window.ohsocial.invoke('backup:restore')) as { success: boolean; error?: string }
  busy.value = false
  if (r.success) emit('toast', 'success', '已恢复，请重启应用')
  else emit('toast', 'error', r.error ?? '失败')
}
</script>

<template>
  <div class="space-y-4">
    <div class="mb-2">
      <h3 class="text-xl font-bold">数据备份</h3>
      <p class="text-sm text-base-content/50 mt-1">备份与恢复本地 SQLite 数据库</p>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 flex flex-wrap gap-3">
        <button type="button" class="btn btn-outline btn-sm" :disabled="busy" @click="backupDb">备份数据库</button>
        <button type="button" class="btn btn-outline btn-sm" :disabled="busy" @click="exportJson">导出 JSON</button>
        <button type="button" class="btn btn-outline btn-sm" :disabled="busy" @click="exportMd">导出 Markdown</button>
        <button type="button" class="btn btn-outline btn-sm btn-warning" :disabled="busy" @click="restoreDb">从备份恢复</button>
      </div>
    </div>
  </div>
</template>
