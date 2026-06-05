<script setup lang="ts">
import { ref } from 'vue'
import type { PersonaUpdateInput } from '../../../shared/types/persona'

const emit = defineEmits<{ complete: [] }>()

const step = ref(1)
const domainsText = ref('')
const audience = ref('')
const style = ref('')
const saving = ref(false)

async function finish() {
  saving.value = true
  const input: PersonaUpdateInput = {
    domains: domainsText.value.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
    audience: audience.value.trim(),
    style: style.value.trim()
  }
  await window.ohsocial.invoke('persona:update', input)
  await window.ohsocial.invoke('app:setOnboardingDone', true)
  saving.value = false
  emit('complete')
}

async function skip() {
  await window.ohsocial.invoke('app:setOnboardingDone', true)
  emit('complete')
}
</script>

<template>
  <dialog class="modal modal-open">
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg mb-1">欢迎使用 OhSocial</h3>
      <p class="text-sm text-base-content/60 mb-4">先告诉 AI 你的创作方向，推荐和写作会更准</p>

      <div v-if="step === 1" class="space-y-3">
        <div class="steps steps-horizontal w-full mb-4">
          <div class="step step-primary">创作偏好</div>
          <div class="step">完成</div>
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">内容领域</span></label>
          <input v-model="domainsText" type="text" class="input input-bordered" placeholder="科技评测、个人成长" />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">目标受众</span></label>
          <textarea v-model="audience" class="textarea textarea-bordered" rows="2" placeholder="25-35岁、对科技感兴趣的白领" />
        </div>
        <div class="form-control">
          <label class="label"><span class="label-text">内容风格</span></label>
          <input v-model="style" type="text" class="input input-bordered" placeholder="轻松幽默、深度分析" />
        </div>
      </div>

      <div v-else class="py-4">
        <p class="text-base-content/80 mb-2">创作偏好已就绪。</p>
        <p class="text-sm text-base-content/60">下一步可在「设置 → AI 设置」中配置 API Key，启用 AI 生成和改写。</p>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost btn-sm" @click="skip">稍后设置</button>
        <button v-if="step === 1" class="btn btn-primary btn-sm" @click="step = 2">下一步</button>
        <button v-else class="btn btn-primary btn-sm" :disabled="saving" @click="finish">
          {{ saving ? '保存中…' : '开始使用' }}
        </button>
      </div>
    </div>
  </dialog>
</template>
