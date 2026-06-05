# OhSocial P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付单人本地使用的 P0 最小闭环：选题 → 创作 → 排期，含 Electron 壳、SQLite、基础 UI 导航。

**Architecture:** Electron 主进程持有 SQLite 与 IPC；Vue 3 渲染进程通过 preload 调用；按 PRD 11.1 导航（今日/选题/创作/排期/设置）；P1 功能（AI 助手、多平台改写）后续迭代。

**Tech Stack:** Electron 33 + electron-vite 4 + Vue 3 + Pinia + Tailwind/DaisyUI + better-sqlite3 + TipTap（编辑器 Task 5+）

---

## Phase 1 — 项目骨架（当前会话）

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`
- Create: `src/main/index.ts`, `src/preload/index.ts`
- Create: `src/renderer/index.html`, `src/renderer/src/main.ts`, `src/renderer/src/App.vue`, `src/renderer/src/assets/main.css`

- [x] Step 1: 创建 package.json 与构建配置
- [x] Step 2: 创建 main/preload/renderer 入口
- [x] Step 3: `npm install && npm run build` 验证通过

### Task 2: 数据库层

**Files:**
- Create: `src/main/db/connection.ts`, `schema.ts`, `migrations.ts`, `index.ts`
- Create: `src/main/db/dao/base-dao.ts`, `topic-dao.ts`, `persona-dao.ts`
- Create: `src/shared/types/topic.ts`, `persona.ts`, `constants/platforms.ts`

- [x] Step 1: P0 表 schema（topics, contents, schedules, persona, model_configs, app_preferences）
- [x] Step 2: TopicDAO / PersonaDAO CRUD
- [x] Step 3: 启动时 initSchema 验证

### Task 3: IPC 层

**Files:**
- Create: `src/main/ipc/index.ts`, `app.ts`, `topic.ts`, `persona.ts`

- [x] Step 1: 注册 app:getInfo, topic:*, persona:*
- [x] Step 2: preload 暴露 window.ohsocial

### Task 4: UI 导航壳 + 选题列表

**Files:**
- Create: `src/renderer/src/router/index.ts`, `components/AppLayout.vue`
- Create: `views/today/TodayView.vue`, `topic/TopicList.vue`, `content/ContentList.vue`, `schedule/ScheduleView.vue`, `setting/SettingsView.vue`

- [x] Step 1: 侧边栏导航（今日/选题/创作/排期/设置）
- [x] Step 2: 选题列表 CRUD 基础 UI
- [x] Step 3: 联调 topic:list / topic:create

---

## Phase 2 — 创作与 AI（已完成）

### Task 5: 个人定位 + 首次引导
- [x] OnboardingModal + app:onboardingDone

### Task 6: 图文编辑器 (TipTap) + 内容 CRUD
- [x] content-dao, RichTextEditor, ContentEditor, ContentList

### Task 7: AI 模型配置 + 续写/改写
- [x] model-service (OpenAI 兼容流式), 设置页 AI 配置, 编辑器续写/改写

### Task 8: 排期日历（月视图 + 提醒）
- [x] schedule-dao, 月历 UI, Electron Notification

### Task 9: 数据备份
- [x] backup:database / restore / exportJson

---

## Phase 3 — P1 差异化（已完成）

### Task 10: 多平台改写
- [x] platform/rules + content:platform-adapt + 编辑器平台版本切换

### Task 11: AI 助手 + Tool Calling
- [x] 本地 Tools（search_topics/contents、get_persona、create_topic、save_material）
- [x] 内置 Skills + assistant 对话 + Tool 多轮循环

### Task 12: 视频脚本编辑器
- [x] video_scripts 表 + ScriptEditor + AI 生成分镜

### Task 13: 素材库
- [x] materials 表 + MaterialLibrary CRUD
