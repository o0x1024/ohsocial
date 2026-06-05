<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Persona, PersonaUpdateInput } from '../../../../shared/types/persona'
import { PLATFORMS } from '../../../../shared/constants/platforms'

const emit = defineEmits<{ toast: [type: 'success' | 'error' | 'info', message: string] }>()

type AccountFields = { accountName: string; accountId: string; followers: number; notes: string }

function emptyAccount(): AccountFields {
  return { accountName: '', accountId: '', followers: 0, notes: '' }
}

function createEmptyAccountForm(): Record<string, AccountFields> {
  return Object.fromEntries(PLATFORMS.map(p => [p.id, emptyAccount()]))
}

const persona = ref<Persona | null>(null)
const domainsText = ref('')
const serperKey = ref('')
const accountForm = ref<Record<string, AccountFields>>(createEmptyAccountForm())
const ready = ref(false)
const customSkills = ref<Array<{ skillId: string; name: string }>>([])
const skillForm = ref({ skillId: '', name: '', content: '' })
const saving = ref(false)

onMounted(async () => {
  persona.value = (await window.ohsocial.invoke('persona:get')) as Persona
  domainsText.value = persona.value.domains.join('、')
  serperKey.value = ((await window.ohsocial.invoke('preference:get', 'serper_api_key')) as string) ?? ''
  const accounts = (await window.ohsocial.invoke('account:list')) as Array<{ platform: string; accountName: string }>
  for (const p of PLATFORMS) {
    const acc = accounts.find(a => a.platform === p.id)
    accountForm.value[p.id] = { accountName: acc?.accountName ?? '', accountId: '', followers: 0, notes: '' }
  }
  customSkills.value = (await window.ohsocial.invoke('skill:list')) as typeof customSkills.value
  ready.value = true
})

async function save() {
  if (!persona.value) return
  saving.value = true
  try {
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
    emit('toast', 'success', '运营配置已保存')
  } catch (e) {
    emit('toast', 'error', e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function saveSkill() {
  if (!skillForm.value.skillId || !skillForm.value.name) return
  await window.ohsocial.invoke('skill:upsert', skillForm.value.skillId, skillForm.value.name, skillForm.value.content)
  customSkills.value = (await window.ohsocial.invoke('skill:list')) as typeof customSkills.value
  skillForm.value = { skillId: '', name: '', content: '' }
  emit('toast', 'success', 'Skill 已保存')
}
</script>

<template>
  <div v-if="!ready" class="flex justify-center py-12">
    <span class="loading loading-spinner loading-md text-base-content/40" />
  </div>
  <div v-else class="space-y-4">
    <div class="mb-2">
      <h3 class="text-xl font-bold">运营配置</h3>
      <p class="text-sm text-base-content/50 mt-1">创作偏好、平台账号与助手能力</p>
    </div>

    <div v-if="persona" class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 space-y-4">
        <h4 class="font-semibold text-sm">创作偏好</h4>
        <input v-model="domainsText" class="input input-bordered w-full" placeholder="内容领域" />
        <textarea v-model="persona.audience" class="textarea textarea-bordered w-full" rows="2" placeholder="目标受众" />
        <input v-model="persona.style" class="input input-bordered w-full" placeholder="内容风格" />
        <textarea v-model="persona.personaDesc" class="textarea textarea-bordered w-full" rows="2" placeholder="人设描述" />
      </div>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 space-y-3">
        <h4 class="font-semibold text-sm">助手能力</h4>
        <input v-model="serperKey" type="password" class="input input-bordered w-full" placeholder="Serper API Key（联网搜索）" />
      </div>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 space-y-3">
        <h4 class="font-semibold text-sm">平台账号</h4>
        <div v-for="p in PLATFORMS" :key="p.id" class="flex gap-2 items-center">
          <span class="text-sm w-20 shrink-0">{{ p.name }}</span>
          <input v-model="accountForm[p.id].accountName" class="input input-bordered input-sm flex-1" />
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 space-y-3">
        <h4 class="font-semibold text-sm">自定义 Skill</h4>
        <ul v-if="customSkills.length" class="text-sm space-y-1">
          <li v-for="s in customSkills" :key="s.skillId">{{ s.name }}</li>
        </ul>
        <div class="flex flex-wrap gap-2">
          <input v-model="skillForm.skillId" class="input input-bordered input-sm w-32" placeholder="id" />
          <input v-model="skillForm.name" class="input input-bordered input-sm flex-1" placeholder="名称" />
          <button type="button" class="btn btn-sm btn-outline" @click="saveSkill">添加</button>
        </div>
      </div>
    </div>

    <button type="button" class="btn btn-primary" :disabled="saving" @click="save">保存全部</button>
  </div>
</template>
