<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Persona, PersonaUpdateInput } from '../../../../shared/types/persona'
import { PLATFORMS } from '../../../../shared/constants/platforms'

const persona = ref<Persona | null>(null)
const domainsText = ref('')
const serperKey = ref('')
const accounts = ref<Array<{ platform: string; accountName: string }>>([])
const accountForm = ref<Record<string, { accountName: string; accountId: string; followers: number; notes: string }>>({})
const saving = ref(false)
const saved = ref(false)

onMounted(async () => {
  persona.value = (await window.ohsocial.invoke('persona:get')) as Persona
  domainsText.value = persona.value.domains.join('、')
  serperKey.value = ((await window.ohsocial.invoke('preference:get', 'serper_api_key')) as string) ?? ''
  accounts.value = (await window.ohsocial.invoke('account:list')) as typeof accounts.value
  for (const p of PLATFORMS) {
    const acc = accounts.value.find(a => a.platform === p.id)
    accountForm.value[p.id] = {
      accountName: acc?.accountName ?? '',
      accountId: '',
      followers: 0,
      notes: ''
    }
  }
})

async function saveAll() {
  if (!persona.value) return
  saving.value = true
  const input: PersonaUpdateInput = {
    domains: domainsText.value.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
    audience: persona.value.audience,
    style: persona.value.style,
    personaDesc: persona.value.personaDesc,
    differentiator: persona.value.differentiator
  }
  persona.value = (await window.ohsocial.invoke('persona:update', input)) as Persona
  await window.ohsocial.invoke('preference:set', 'serper_api_key', serperKey.value)
  for (const p of PLATFORMS) {
    const acc = accountForm.value[p.id]
    await window.ohsocial.invoke('account:upsert', p.id, {
      accountName: acc.accountName,
      accountId: acc.accountId,
      followers: acc.followers,
      notes: acc.notes
    })
  }
  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}
</script>

<template>
  <div class="card bg-base-100 shadow-sm border border-base-300/60 mt-6">
    <div class="card-body p-6 space-y-4">
      <div>
        <h4 class="font-semibold">创作偏好</h4>
        <p class="text-xs text-base-content/50">影响 AI 推荐与助手回答风格</p>
      </div>
      <div v-if="persona" class="space-y-3">
        <input v-model="domainsText" class="input input-bordered w-full" placeholder="内容领域" />
        <textarea v-model="persona.audience" class="textarea textarea-bordered w-full" rows="2" placeholder="目标受众" />
        <input v-model="persona.style" class="input input-bordered w-full" placeholder="内容风格" />
      </div>
      <div class="divider text-xs">助手能力</div>
      <input v-model="serperKey" type="password" class="input input-bordered w-full" placeholder="Serper API Key（联网搜索）" />
      <div class="divider text-xs">平台账号</div>
      <div v-for="p in PLATFORMS" :key="p.id" class="flex gap-2 items-center">
        <span class="text-sm w-20 shrink-0">{{ p.name }}</span>
        <input v-model="accountForm[p.id].accountName" class="input input-bordered input-sm flex-1" placeholder="账号名" />
      </div>
      <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveAll">保存运营配置</button>
      <span v-if="saved" class="text-success text-sm">已保存</span>
    </div>
  </div>
</template>
