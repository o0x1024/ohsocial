<script setup lang="ts">
const emit = defineEmits<{ complete: [] }>()

async function finish() {
  await window.ohsocial.invoke('app:setOnboardingDone', true)
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
      <p class="text-sm text-base-content/60 mb-4">自媒体选题、创作与排期，一站管理</p>

      <div class="space-y-3 py-2">
        <p class="text-base-content/80">建议先在「设置 → 运营配置」中为各平台配置内容领域。</p>
        <p class="text-sm text-base-content/60">在「设置 → AI 服务」中配置 API Key 后，即可使用 AI 推荐选题与内容生成。</p>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost btn-sm" @click="skip">稍后设置</button>
        <button class="btn btn-primary btn-sm" @click="finish">开始使用</button>
      </div>
    </div>
  </dialog>
</template>
