<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Material } from '../../../../shared/types/material'
import { loadImageMaterials, resolveImageSrc } from './useEditorImage'

const emit = defineEmits<{ select: [src: string]; close: [] }>()

const materials = ref<Material[]>([])
const loading = ref(true)

async function pick(m: Material) {
  const src = await resolveImageSrc(m)
  if (src) emit('select', src)
}

async function pickLocal() {
  const r = (await window.ohsocial.invoke('material:pick-image')) as {
    success: boolean
    material?: Material
  }
  if (r.success && r.material) {
    const src = await resolveImageSrc(r.material)
    if (src) emit('select', src)
  }
}

onMounted(async () => {
  materials.value = await loadImageMaterials()
  loading.value = false
})
</script>

<template>
  <dialog class="modal modal-open">
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg mb-4">插入图片</h3>
      <button type="button" class="btn btn-outline btn-sm mb-4" @click="pickLocal">从本地上传</button>
      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner" />
      </div>
      <div v-else-if="!materials.length" class="text-sm text-base-content/50 py-4">
        素材库暂无图片，请先上传
      </div>
      <div v-else class="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        <button
          v-for="m in materials"
          :key="m.id"
          type="button"
          class="p-3 rounded-box border border-base-300 hover:border-primary text-left text-sm truncate"
          :title="m.title"
          @click="pick(m)"
        >
          🖼 {{ m.title }}
        </button>
      </div>
      <div class="modal-action">
        <button type="button" class="btn btn-ghost" @click="emit('close')">取消</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="emit('close')">
      <button type="button">close</button>
    </form>
  </dialog>
</template>
