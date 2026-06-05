<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { PlatformAccount } from '../../../../shared/types/platform-account'

const emit = defineEmits<{ toast: [type: 'success' | 'error' | 'info', message: string] }>()

type AccountFields = {
  displayName: string
  accountName: string
  accountId: string
  followers: number
  notes: string
  contentDomain: string
  contentKeywordsText: string
  contentBrief: string
  authorPersona: string
}

function emptyAccount(displayName = ''): AccountFields {
  return {
    displayName,
    accountName: '',
    accountId: '',
    followers: 0,
    notes: '',
    contentDomain: '',
    contentKeywordsText: '',
    contentBrief: '',
    authorPersona: ''
  }
}

const serperKey = ref('')
const platformAccounts = ref<PlatformAccount[]>([])
const accountForm = ref<Record<string, AccountFields>>({})
const ready = ref(false)
const customSkills = ref<Array<{ skillId: string; name: string }>>([])
const skillForm = ref({ skillId: '', name: '', content: '' })
const saving = ref(false)
const newPlatformName = ref('')
const addingPlatform = ref(false)

function syncFormFromAccounts(accounts: PlatformAccount[]) {
  const next: Record<string, AccountFields> = {}
  for (const acc of accounts) {
    next[acc.platform] = {
      displayName: acc.displayName || acc.platform,
      accountName: acc.accountName,
      accountId: acc.accountId,
      followers: acc.followers,
      notes: acc.notes,
      contentDomain: acc.contentDomain,
      contentKeywordsText: (acc.contentKeywords ?? []).join('、'),
      contentBrief: acc.contentBrief,
      authorPersona: acc.authorPersona ?? ''
    }
  }
  accountForm.value = next
}

async function loadAccounts() {
  platformAccounts.value = (await window.ohsocial.invoke('account:list')) as PlatformAccount[]
  syncFormFromAccounts(platformAccounts.value)
}

onMounted(async () => {
  serperKey.value = ((await window.ohsocial.invoke('preference:get', 'serper_api_key')) as string) ?? ''
  await loadAccounts()
  customSkills.value = (await window.ohsocial.invoke('skill:list')) as typeof customSkills.value
  ready.value = true
})

async function addPlatform() {
  const name = newPlatformName.value.trim()
  if (!name) return
  addingPlatform.value = true
  try {
    const r = (await window.ohsocial.invoke('account:create', name)) as {
      success: boolean
      error?: string
    }
    if (!r.success) {
      emit('toast', 'error', r.error ?? '添加失败')
      return
    }
    newPlatformName.value = ''
    await loadAccounts()
    emit('toast', 'success', '平台已添加')
  } finally {
    addingPlatform.value = false
  }
}

async function removePlatform(platform: string) {
  const acc = platformAccounts.value.find(a => a.platform === platform)
  const label = acc?.displayName || platform
  if (!confirm(`确定删除平台「${label}」？`)) return
  const r = (await window.ohsocial.invoke('account:delete', platform)) as {
    success: boolean
    error?: string
  }
  if (!r.success) {
    emit('toast', 'error', r.error ?? '删除失败')
    return
  }
  await loadAccounts()
  emit('toast', 'success', '平台已删除')
}

async function save() {
  saving.value = true
  try {
    await window.ohsocial.invoke('preference:set', 'serper_api_key', serperKey.value)
    for (const acc of platformAccounts.value) {
      const form = accountForm.value[acc.platform]
      if (!form) continue
      await window.ohsocial.invoke('account:upsert', acc.platform, {
        displayName: form.displayName.trim() || acc.platform,
        accountName: form.accountName,
        accountId: form.accountId,
        followers: form.followers,
        notes: form.notes,
        contentDomain: form.contentDomain,
        contentKeywords: form.contentKeywordsText
          .split(/[、,，]/)
          .map(s => s.trim())
          .filter(Boolean),
        contentBrief: form.contentBrief,
        authorPersona: form.authorPersona
      })
    }
    await loadAccounts()
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
      <p class="text-sm text-base-content/50 mt-1">平台账号、内容定位与助手能力</p>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 space-y-3">
        <h4 class="font-semibold text-sm">助手能力</h4>
        <input v-model="serperKey" type="password" class="input input-bordered w-full" placeholder="Serper API Key（联网搜索）" />
      </div>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 space-y-4">
        <div>
          <h4 class="font-semibold text-sm">平台账号与内容定位</h4>
          <p class="text-xs text-base-content/50 mt-1">为每个平台配置运营领域，支持自定义添加或删除平台</p>
        </div>

        <div class="flex gap-2 flex-wrap items-end">
          <div class="flex-1 min-w-[12rem]">
            <input
              v-model="newPlatformName"
              class="input input-bordered input-sm w-full"
              placeholder="新平台名称，如知乎、视频号"
              @keyup.enter="addPlatform"
            />
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline"
            :disabled="addingPlatform || !newPlatformName.trim()"
            @click="addPlatform"
          >
            {{ addingPlatform ? '添加中…' : '添加平台' }}
          </button>
        </div>

        <p v-if="platformAccounts.length === 0" class="text-sm text-base-content/50">
          暂无平台，请先添加
        </p>

        <div
          v-for="acc in platformAccounts"
          :key="acc.platform"
          class="p-4 rounded-box bg-base-200/50 space-y-2"
        >
          <div class="flex gap-2 items-center flex-wrap">
            <input
              v-model="accountForm[acc.platform].displayName"
              class="input input-bordered input-sm flex-1 min-w-[8rem]"
              placeholder="平台名称"
            />
            <input
              v-model="accountForm[acc.platform].accountName"
              class="input input-bordered input-sm flex-1 min-w-[8rem]"
              placeholder="账号名称"
            />
            <button
              type="button"
              class="btn btn-sm btn-ghost text-error shrink-0"
              @click="removePlatform(acc.platform)"
            >
              删除
            </button>
          </div>
          <input
            v-model="accountForm[acc.platform].contentDomain"
            class="input input-bordered input-sm w-full"
            placeholder="内容领域，如旅游攻略 / 网络安全"
          />
          <input
            v-model="accountForm[acc.platform].contentKeywordsText"
            class="input input-bordered input-sm w-full"
            placeholder="领域关键词，用顿号分隔"
          />
          <textarea
            v-model="accountForm[acc.platform].contentBrief"
            class="textarea textarea-bordered textarea-sm w-full"
            rows="2"
            placeholder="运营方向说明（选填）"
          />
          <textarea
            v-model="accountForm[acc.platform].authorPersona"
            class="textarea textarea-bordered textarea-sm w-full"
            rows="2"
            placeholder="创作人设（选填），如：网络安全从业者，用科普口吻向普通读者解释风险，不说教、不堆术语"
          />
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
