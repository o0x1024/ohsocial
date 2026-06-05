<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Persona, PersonaUpdateInput } from '../../../../shared/types/persona'
import type { ModelConfig, ModelConfigInput } from '../../../../shared/types/model'
import { BUILTIN_PROVIDERS } from '../../../../shared/types/model'
import { PLATFORMS } from '../../../../shared/constants/platforms'
import AppearanceSettingsPanel from './AppearanceSettingsPanel.vue'

const tab = ref<'appearance' | 'persona' | 'ai' | 'assistant' | 'accounts' | 'skills' | 'data'>('appearance')
const persona = ref<Persona | null>(null)
const domainsText = ref('')
const saving = ref(false)
const saved = ref(false)

const models = ref<ModelConfig[]>([])
const aiForm = ref<ModelConfigInput>({
  provider: 'deepseek',
  name: 'DeepSeek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  modelName: 'deepseek-chat',
  isDefault: true,
  isEnabled: true
})

const serperKey = ref('')
const accounts = ref<Array<{ platform: string; accountName: string; accountId: string; followers: number; notes: string }>>([])
const accountForm = ref<Record<string, { accountName: string; accountId: string; followers: number; notes: string }>>({})

const customSkills = ref<Array<{ skillId: string; name: string; description: string; content: string }>>([])
const skillForm = ref({ skillId: '', name: '', description: '', content: '' })

const backupMsg = ref('')
const restoreMsg = ref('')

onMounted(async () => {
  persona.value = (await window.ohsocial.invoke('persona:get')) as Persona
  domainsText.value = persona.value.domains.join('、')
  models.value = (await window.ohsocial.invoke('model:list')) as ModelConfig[]
  if (models.value.length > 0) {
    const m = models.value.find(x => x.isDefault) ?? models.value[0]
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
  serperKey.value = ((await window.ohsocial.invoke('preference:get', 'serper_api_key')) as string) ?? ''
  accounts.value = (await window.ohsocial.invoke('account:list')) as typeof accounts.value
  for (const p of PLATFORMS) {
    const acc = accounts.value.find(a => a.platform === p.id)
    accountForm.value[p.id] = {
      accountName: acc?.accountName ?? '',
      accountId: acc?.accountId ?? '',
      followers: acc?.followers ?? 0,
      notes: acc?.notes ?? ''
    }
  }
  customSkills.value = (await window.ohsocial.invoke('skill:list')) as typeof customSkills.value
})

function onProviderChange() {
  const p = BUILTIN_PROVIDERS.find(x => x.id === aiForm.value.provider)
  if (p) {
    aiForm.value.name = p.name
    aiForm.value.baseUrl = p.defaultBase
    aiForm.value.modelName = p.defaultModel
  }
}

async function savePersona() {
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
  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function saveAi() {
  saving.value = true
  await window.ohsocial.invoke('model:upsert', { ...aiForm.value, isDefault: true })
  models.value = (await window.ohsocial.invoke('model:list')) as ModelConfig[]
  saving.value = false
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function saveSerper() {
  await window.ohsocial.invoke('preference:set', 'serper_api_key', serperKey.value)
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function saveAccounts() {
  for (const p of PLATFORMS) {
    const f = accountForm.value[p.id]
    await window.ohsocial.invoke('account:upsert', p.id, {
      accountName: f.accountName,
      accountId: f.accountId,
      followers: f.followers,
      notes: f.notes
    })
  }
  saved.value = true
  setTimeout(() => { saved.value = false }, 2000)
}

async function saveSkill() {
  if (!skillForm.value.skillId || !skillForm.value.name) return
  await window.ohsocial.invoke(
    'skill:upsert',
    skillForm.value.skillId,
    skillForm.value.name,
    skillForm.value.content,
    skillForm.value.description
  )
  customSkills.value = (await window.ohsocial.invoke('skill:list')) as typeof customSkills.value
  skillForm.value = { skillId: '', name: '', description: '', content: '' }
}

async function importSkills() {
  await window.ohsocial.invoke('skill:import')
  customSkills.value = (await window.ohsocial.invoke('skill:list')) as typeof customSkills.value
}

async function exportSkills() {
  await window.ohsocial.invoke('skill:export')
}

async function backupDb() {
  const r = (await window.ohsocial.invoke('backup:database')) as { success: boolean; path?: string; error?: string }
  backupMsg.value = r.success ? `已备份到 ${r.path}` : (r.error ?? '失败')
}

async function exportData() {
  const r = (await window.ohsocial.invoke('backup:exportJson')) as { success: boolean; path?: string; error?: string }
  backupMsg.value = r.success ? `已导出到 ${r.path}` : (r.error ?? '失败')
}

async function exportAllMd() {
  const r = (await window.ohsocial.invoke('export:all')) as { success: boolean; path?: string; error?: string }
  backupMsg.value = r.success ? `Markdown 已导出到 ${r.path}` : (r.error ?? '失败')
}

async function restoreDb() {
  if (!confirm('恢复将覆盖当前数据，是否继续？')) return
  const r = (await window.ohsocial.invoke('backup:restore')) as { success: boolean; error?: string }
  restoreMsg.value = r.success ? '已恢复，请重启应用' : (r.error ?? '失败')
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6 max-w-2xl">
    <header class="mb-6">
      <h2 class="text-2xl font-bold">设置</h2>
      <p class="text-base-content/60 text-sm mt-1">创作偏好、AI 与数据管理</p>
    </header>

    <div role="tablist" class="tabs tabs-boxed mb-6 flex-wrap h-auto gap-1">
      <button role="tab" class="tab tab-sm" :class="{ 'tab-active': tab === 'appearance' }" @click="tab = 'appearance'">外观</button>
      <button role="tab" class="tab tab-sm" :class="{ 'tab-active': tab === 'persona' }" @click="tab = 'persona'">创作偏好</button>
      <button role="tab" class="tab tab-sm" :class="{ 'tab-active': tab === 'ai' }" @click="tab = 'ai'">AI 设置</button>
      <button role="tab" class="tab tab-sm" :class="{ 'tab-active': tab === 'assistant' }" @click="tab = 'assistant'">助手能力</button>
      <button role="tab" class="tab tab-sm" :class="{ 'tab-active': tab === 'accounts' }" @click="tab = 'accounts'">平台账号</button>
      <button role="tab" class="tab tab-sm" :class="{ 'tab-active': tab === 'skills' }" @click="tab = 'skills'">Skill 管理</button>
      <button role="tab" class="tab tab-sm" :class="{ 'tab-active': tab === 'data' }" @click="tab = 'data'">数据管理</button>
    </div>

    <AppearanceSettingsPanel v-if="tab === 'appearance'" />

    <div v-else-if="tab === 'persona' && persona" class="space-y-4">
      <div class="form-control">
        <label class="label"><span class="label-text">内容领域</span></label>
        <input v-model="domainsText" type="text" class="input input-bordered" placeholder="科技评测、个人成长" />
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text">目标受众</span></label>
        <textarea v-model="persona.audience" class="textarea textarea-bordered" rows="2" />
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text">内容风格</span></label>
        <input v-model="persona.style" type="text" class="input input-bordered" />
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text">人设描述</span></label>
        <textarea v-model="persona.personaDesc" class="textarea textarea-bordered" rows="2" />
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text">差异化优势</span></label>
        <textarea v-model="persona.differentiator" class="textarea textarea-bordered" rows="2" />
      </div>
      <button class="btn btn-primary" :disabled="saving" @click="savePersona">保存</button>
    </div>

    <div v-else-if="tab === 'ai'" class="space-y-4">
      <div class="form-control">
        <label class="label"><span class="label-text">服务商</span></label>
        <select v-model="aiForm.provider" class="select select-bordered" @change="onProviderChange">
          <option v-for="p in BUILTIN_PROVIDERS" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text">API Key</span></label>
        <input v-model="aiForm.apiKey" type="password" class="input input-bordered" placeholder="sk-..." />
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text">API 地址</span></label>
        <input v-model="aiForm.baseUrl" type="text" class="input input-bordered" />
      </div>
      <div class="form-control">
        <label class="label"><span class="label-text">模型名称</span></label>
        <input v-model="aiForm.modelName" type="text" class="input input-bordered" />
      </div>
      <button class="btn btn-primary" :disabled="saving" @click="saveAi">保存</button>
    </div>

    <div v-else-if="tab === 'assistant'" class="space-y-4">
      <p class="text-sm text-base-content/60">配置 Serper API Key 后，AI 助手可使用联网搜索（web_search）。</p>
      <div class="form-control">
        <label class="label"><span class="label-text">Serper API Key</span></label>
        <input v-model="serperKey" type="password" class="input input-bordered" placeholder="在 serper.dev 申请" />
      </div>
      <a href="https://serper.dev" class="text-xs link" target="_blank">获取 API Key</a>
      <button class="btn btn-primary btn-sm" @click="saveSerper">保存</button>
    </div>

    <div v-else-if="tab === 'accounts'" class="space-y-4">
      <div v-for="p in PLATFORMS" :key="p.id" class="p-3 bg-base-200 rounded-box space-y-2">
        <p class="font-medium text-sm">{{ p.name }}</p>
        <input v-model="accountForm[p.id].accountName" class="input input-bordered input-sm" placeholder="账号名称" />
        <input v-model="accountForm[p.id].accountId" class="input input-bordered input-sm" placeholder="账号 ID" />
        <input v-model.number="accountForm[p.id].followers" type="number" class="input input-bordered input-sm" placeholder="粉丝数" />
      </div>
      <button class="btn btn-primary btn-sm" @click="saveAccounts">保存账号信息</button>
    </div>

    <div v-else-if="tab === 'skills'" class="space-y-4">
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" @click="importSkills">导入 JSON</button>
        <button class="btn btn-outline btn-sm" @click="exportSkills">导出 JSON</button>
      </div>
      <ul class="space-y-2 text-sm">
        <li v-for="s in customSkills" :key="s.skillId" class="p-2 bg-base-200 rounded-box">{{ s.name }} ({{ s.skillId }})</li>
      </ul>
      <div class="divider text-xs">添加自定义 Skill</div>
      <input v-model="skillForm.skillId" class="input input-bordered input-sm" placeholder="skill-id" />
      <input v-model="skillForm.name" class="input input-bordered input-sm" placeholder="名称" />
      <textarea v-model="skillForm.content" class="textarea textarea-bordered" rows="4" placeholder="System Prompt 内容" />
      <button class="btn btn-primary btn-sm" @click="saveSkill">保存 Skill</button>
    </div>

    <div v-else-if="tab === 'data'" class="space-y-4">
      <button class="btn btn-outline btn-sm" @click="backupDb">备份数据库</button>
      <button class="btn btn-outline btn-sm" @click="exportData">导出 JSON</button>
      <button class="btn btn-outline btn-sm" @click="exportAllMd">导出全部 Markdown</button>
      <button class="btn btn-outline btn-sm btn-warning" @click="restoreDb">从备份恢复</button>
      <p v-if="backupMsg" class="text-sm text-success">{{ backupMsg }}</p>
      <p v-if="restoreMsg" class="text-sm text-warning">{{ restoreMsg }}</p>
    </div>

    <span v-if="saved" class="text-success text-sm block mt-4">已保存</span>
  </div>
</template>
