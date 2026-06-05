<script setup lang="ts">
import { ref, onMounted } from 'vue'

type LogTab = 'app' | 'llm'

const activeTab = ref<LogTab>('app')
const logDir = ref('')
const appTodayFile = ref('')
const llmTodayFile = ref('')
const appRecentLines = ref<string[]>([])
const llmRecentLines = ref<string[]>([])
const loading = ref(false)
const message = ref('')

onMounted(load)

async function load() {
  loading.value = true
  try {
    const info = (await window.ohsocial.invoke('log:getInfo')) as {
      logDir: string
      appTodayFile: string
      llmTodayFile: string
      appRecentLines: string[]
      llmRecentLines: string[]
    }
    logDir.value = info.logDir
    appTodayFile.value = info.appTodayFile
    llmTodayFile.value = info.llmTodayFile
    appRecentLines.value = info.appRecentLines
    llmRecentLines.value = info.llmRecentLines
  } finally {
    loading.value = false
  }
}

async function openLogDir() {
  const res = (await window.ohsocial.invoke('log:openDir')) as { success: boolean; error?: string }
  if (!res.success) message.value = res.error || '无法打开日志目录'
}

async function openTodayLog(type: LogTab) {
  const res = (await window.ohsocial.invoke('log:openToday', type)) as {
    success: boolean
    error?: string
  }
  if (!res.success) message.value = res.error || '无法打开日志文件'
}

async function refresh() {
  message.value = ''
  await load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="card bg-base-100 border border-base-300/60 shadow-sm">
      <div class="card-body p-5">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 class="font-semibold">本地日志</h4>
            <p class="text-xs text-base-content/50 mt-1">
              日志保存在当前工作目录的 <code class="text-[11px]">logs/</code> 文件夹，按天滚动
            </p>
          </div>
          <button type="button" class="btn btn-ghost btn-xs" :disabled="loading" @click="refresh">
            {{ loading ? '刷新中…' : '刷新' }}
          </button>
        </div>

        <p v-if="message" class="text-xs text-error mb-2">{{ message }}</p>

        <div class="text-xs text-base-content/60 space-y-1 mb-4 font-mono break-all">
          <p>目录：{{ logDir || '—' }}</p>
          <p>应用日志：{{ appTodayFile || '—' }}</p>
          <p>LLM 日志：{{ llmTodayFile || '—' }}</p>
        </div>

        <div class="tabs tabs-boxed w-fit mb-4">
          <button
            type="button"
            class="tab"
            :class="{ 'tab-active': activeTab === 'app' }"
            @click="activeTab = 'app'"
          >
            应用日志
          </button>
          <button
            type="button"
            class="tab"
            :class="{ 'tab-active': activeTab === 'llm' }"
            @click="activeTab = 'llm'"
          >
            LLM 日志
          </button>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <button type="button" class="btn btn-outline btn-sm" @click="openTodayLog(activeTab)">
            打开今日{{ activeTab === 'app' ? '应用' : 'LLM' }}日志
          </button>
          <button type="button" class="btn btn-outline btn-sm" @click="openLogDir">打开日志目录</button>
        </div>

        <div
          v-if="activeTab === 'app' && appRecentLines.length"
          class="rounded-lg border border-base-300/60 bg-base-200/50 p-3 max-h-56 overflow-auto"
        >
          <p class="text-xs text-base-content/50 mb-2">最近应用日志</p>
          <pre class="text-[11px] leading-relaxed whitespace-pre-wrap break-all text-base-content/70">{{
            appRecentLines.join('\n')
          }}</pre>
        </div>
        <div
          v-else-if="activeTab === 'llm' && llmRecentLines.length"
          class="rounded-lg border border-base-300/60 bg-base-200/50 p-3 max-h-56 overflow-auto"
        >
          <p class="text-xs text-base-content/50 mb-2">最近 LLM 日志（JSON Lines）</p>
          <pre class="text-[11px] leading-relaxed whitespace-pre-wrap break-all text-base-content/70">{{
            llmRecentLines.join('\n')
          }}</pre>
        </div>
        <p v-else class="text-xs text-base-content/40">
          今日暂无{{ activeTab === 'app' ? '应用' : 'LLM' }}日志记录
        </p>
      </div>
    </div>

    <div class="card bg-base-100 border border-base-300/60 shadow-sm">
      <div class="card-body p-5 text-xs text-base-content/55 space-y-2">
        <p><span class="font-medium text-base-content/70">应用日志</span>：记录 INFO / WARN / ERROR / DEBUG，含启动、设置、业务异常等。</p>
        <p><span class="font-medium text-base-content/70">LLM 日志</span>：记录每次模型请求的 body、响应内容、耗时与错误（API Key 已脱敏）。</p>
      </div>
    </div>
  </div>
</template>
