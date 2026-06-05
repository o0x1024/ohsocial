<script setup lang="ts">
import type { DiffLine } from '../../../../shared/text-diff'

defineProps<{
  lines: DiffLine[]
  open: boolean
}>()

const emit = defineEmits<{ 'update:open': [boolean] }>()
</script>

<template>
  <div
    v-if="open && lines.length"
    class="border-t border-base-300 bg-base-300/30 max-h-48 overflow-y-auto"
  >
    <div class="flex items-center justify-between px-4 py-2 text-xs text-base-content/60">
      <span>与上一版本对比（{{ lines.filter(l => l.type !== 'same').length }} 处变更）</span>
      <button type="button" class="btn btn-xs btn-ghost" @click="emit('update:open', false)">收起</button>
    </div>
    <div class="font-mono text-xs px-4 pb-3 space-y-0.5">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="px-2 py-0.5 rounded"
        :class="{
          'bg-success/15 text-success': line.type === 'add',
          'bg-error/15 text-error line-through': line.type === 'remove',
          'text-base-content/40': line.type === 'same'
        }"
      >
        <span v-if="line.type === 'add'">+ </span>
        <span v-else-if="line.type === 'remove'">− </span>
        <span v-else>&nbsp;&nbsp;</span>
        {{ line.text || '（空行）' }}
      </div>
    </div>
  </div>
</template>
