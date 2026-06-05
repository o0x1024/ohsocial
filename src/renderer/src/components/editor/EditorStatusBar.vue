<script setup lang="ts">
defineProps<{
  statsLabel: string
  focusMode: boolean
  showDiff: boolean
  commentCount: number
}>()

const emit = defineEmits<{
  'update:focusMode': [boolean]
  'update:showDiff': [boolean]
  'toggle-comments': []
}>()
</script>

<template>
  <footer class="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-base-300 bg-base-200/80 text-xs text-base-content/60">
    <span>{{ statsLabel }}</span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="btn btn-xs btn-ghost"
        :class="{ 'btn-active': focusMode }"
        title="专注模式：淡化非当前段落"
        @click="emit('update:focusMode', !focusMode)"
      >
        专注
      </button>
      <button
        type="button"
        class="btn btn-xs btn-ghost"
        :class="{ 'btn-active': showDiff }"
        title="与上一版本对比"
        @click="emit('update:showDiff', !showDiff)"
      >
        对比
      </button>
      <button
        type="button"
        class="btn btn-xs btn-ghost"
        :class="{ 'btn-active': commentCount > 0 }"
        @click="emit('toggle-comments')"
      >
        批注{{ commentCount ? ` (${commentCount})` : '' }}
      </button>
    </div>
  </footer>
</template>
