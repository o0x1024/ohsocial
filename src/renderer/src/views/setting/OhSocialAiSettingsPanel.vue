<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { ModelConfig, ModelConfigInput } from '../../../../shared/types/model'
import { BUILTIN_PROVIDERS } from '../../../../shared/types/model'

const emit = defineEmits<{ toast: [type: 'success' | 'error' | 'info', message: string] }>()

const saving = ref(false)
const aiForm = ref<ModelConfigInput>({
  provider: 'deepseek',
  name: 'DeepSeek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  modelName: 'deepseek-chat',
  isDefault: true,
  isEnabled: true
})

onMounted(async () => {
  const models = (await window.ohsocial.invoke('model:list')) as ModelConfig[]
  if (models.length > 0) {
    const m = models.find(x => x.isDefault) ?? models[0]
    aiForm.value = {
      provider: m.provider,
      name: m.name,
      apiKey: m.apiKey ?? '',
      baseUrl: m.baseUrl ?? '',
      modelName: m.modelName ?? '',
      isDefault: true,
      isEnabled: m.isEnabled
    }
  }
})

function onProviderChange() {
  const p = BUILTIN_PROVIDERS.find(x => x.id === aiForm.value.provider)
  if (p) {
    aiForm.value.name = p.name
    aiForm.value.baseUrl = p.defaultBase
    aiForm.value.modelName = p.defaultModel
  }
}

async function save() {
  saving.value = true
  try {
    await window.ohsocial.invoke('model:upsert', { ...aiForm.value, isDefault: true })
    emit('toast', 'success', 'AI 配置已保存')
  } catch (e) {
    emit('toast', 'error', e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="mb-2">
      <h3 class="text-xl font-bold">AI 服务</h3>
      <p class="text-sm text-base-content/50 mt-1">配置默认大模型，供创作与 AI 助手使用</p>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 space-y-4">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <font-awesome-icon icon="robot" class="text-base" />
          </div>
          <div>
            <h4 class="font-semibold">模型配置</h4>
            <p class="text-xs text-base-content/50">API Key 仅保存在本地</p>
          </div>
        </div>

        <div class="form-control">
          <label class="label py-1"><span class="label-text font-medium text-sm">服务商</span></label>
          <select v-model="aiForm.provider" class="select select-bordered w-full" @change="onProviderChange">
            <option v-for="p in BUILTIN_PROVIDERS" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-control">
          <label class="label py-1"><span class="label-text font-medium text-sm">API Key</span></label>
          <input v-model="aiForm.apiKey" type="password" class="input input-bordered w-full" placeholder="sk-..." />
        </div>
        <div class="form-control">
          <label class="label py-1"><span class="label-text font-medium text-sm">API 地址</span></label>
          <input v-model="aiForm.baseUrl" type="text" class="input input-bordered w-full" />
        </div>
        <div class="form-control">
          <label class="label py-1"><span class="label-text font-medium text-sm">模型名称</span></label>
          <input v-model="aiForm.modelName" type="text" class="input input-bordered w-full" />
        </div>
        <button type="button" class="btn btn-primary" :disabled="saving" @click="save">保存配置</button>
      </div>
    </div>
  </div>
</template>
