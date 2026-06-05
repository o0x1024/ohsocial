<script setup lang="ts">
import {
  ALL_THEMES,
  getThemeLabel,
  useAppearanceSettings
} from '../../services/appearanceSettings'

const { appearance, update, reset } = useAppearanceSettings()

function formatSize(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
</script>

<template>
  <div class="space-y-4">
    <div class="mb-2">
      <h3 class="text-xl font-bold">外观</h3>
      <p class="text-sm text-base-content/50 mt-1">调整界面主题、字体、组件尺寸与布局间距</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div class="stat bg-base-100 border border-base-300/60 rounded-xl shadow-sm">
        <div class="stat-title text-xs uppercase tracking-wider opacity-60">当前主题</div>
        <div class="stat-value text-base">{{ getThemeLabel(appearance.theme) }}</div>
      </div>
      <div class="stat bg-base-100 border border-base-300/60 rounded-xl shadow-sm">
        <div class="stat-title text-xs uppercase tracking-wider opacity-60">字体大小</div>
        <div class="stat-value text-base">{{ formatSize(appearance.fontSize) }}px</div>
      </div>
      <div class="stat bg-base-100 border border-base-300/60 rounded-xl shadow-sm">
        <div class="stat-title text-xs uppercase tracking-wider opacity-60">布局间隔</div>
        <div class="stat-value text-base">{{ formatSize(appearance.spacing) }}%</div>
      </div>
    </div>

    <div class="card bg-base-100 shadow-sm border border-base-300/60">
      <div class="card-body p-6 space-y-4">
        <div class="form-control">
          <label class="label py-1"><span class="label-text font-medium text-sm">主题方案</span></label>
          <select
            :value="appearance.theme"
            class="select select-bordered w-full"
            @change="(e: Event) => update({ theme: (e.target as HTMLSelectElement).value })"
          >
            <option v-for="theme in ALL_THEMES" :key="theme" :value="theme">
              {{ getThemeLabel(theme) }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-sm">字体大小</span>
            <span class="label-text-alt font-mono text-sm">{{ formatSize(appearance.fontSize) }}px</span>
          </label>
          <input
            :value="appearance.fontSize"
            type="range"
            min="12"
            max="20"
            step="0.1"
            class="range range-primary range-sm"
            @input="(e: Event) => update({ fontSize: Number((e.target as HTMLInputElement).value) })"
          />
        </div>

        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-sm">组件大小</span>
            <span class="label-text-alt font-mono text-sm">{{ formatSize(appearance.uiScale) }}%</span>
          </label>
          <input
            :value="appearance.uiScale"
            type="range"
            min="80"
            max="120"
            step="0.1"
            class="range range-secondary range-sm"
            @input="(e: Event) => update({ uiScale: Number((e.target as HTMLInputElement).value) })"
          />
        </div>

        <div class="form-control">
          <label class="label py-1">
            <span class="label-text font-medium text-sm">布局间隔</span>
            <span class="label-text-alt font-mono text-sm">{{ formatSize(appearance.spacing) }}%</span>
          </label>
          <input
            :value="appearance.spacing"
            type="range"
            min="75"
            max="125"
            step="0.1"
            class="range range-accent range-sm"
            @input="(e: Event) => update({ spacing: Number((e.target as HTMLInputElement).value) })"
          />
        </div>

        <div class="rounded-xl border border-base-300/60 bg-base-200/40 p-4">
          <p class="text-xs text-base-content/40 mb-2">预览</p>
          <p class="text-sm mb-2">示例文字与按钮样式</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary btn-sm">主要按钮</button>
            <button type="button" class="btn btn-outline btn-sm">次要按钮</button>
            <input type="text" class="input input-bordered input-sm w-36" placeholder="输入框" />
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-end">
      <button type="button" class="btn btn-ghost btn-sm" @click="reset">恢复默认外观</button>
    </div>
  </div>
</template>
