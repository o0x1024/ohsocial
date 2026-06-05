# OhSocial 产品需求文档（PRD）

> 版本：v1.1 | 更新日期：2026-06-04

## 一、产品概述

### 1.1 产品定位

OhSocial 是一款面向自媒体创作者的桌面端运营工具，核心解决 **"做什么内容、怎么做内容、什么时候发内容"** 三大问题。通过 AI 贯穿选题→创作→排期的全流程，帮助创作者从"灵感驱动"升级为"体系化运营"。

### 1.2 目标平台

| 平台 | 内容形态 | 特征 |
|------|---------|------|
| 微信公众号 | 长图文 | 深度文章、排版要求高、标题党 |
| 小红书 | 图文笔记 | 短文 + 封面图、标签驱动、种草风格 |
| 抖音 | 短视频脚本 | 脚本/分镜表、开头 3 秒抓人、节奏快 |
| B站 | 中长视频脚本 | 脚本/文案、知识性强、粉丝黏性高 |
| 今日头条 | 短图文 / 微头条 / 短视频 | 算法推荐、标题吸睛、时效性强、热点敏感 |

### 1.3 核心价值主张

| 痛点 | OhSocial 的解决方式 |
|------|-------------------|
| 不知道做什么内容 | AI 选题引擎：热点追踪 + 竞品分析 + 个人定位交叉推荐 |
| 写作效率低 | AI 辅助创作：大纲生成→正文撰写→润色改写，一站式完成 |
| 多平台搬运改写累 | 一次创作，AI 自动改写适配多平台风格和限制 |
| 更新没有规划 | 日/周/月排期日历，AI 建议发布时间和节奏 |
| 内容资产散落各处 | 统一内容库，全生命周期管理（草稿 → 待发布 → 已发布 → 归档） |
| AI 缺乏实时信息与操作能力 | AI 助手：联网搜索、读取本地数据、一键沉淀选题与素材 |

### 1.4 产品约束

| 约束 | 说明 |
|------|------|
| **单人本地使用** | 面向创作者本人，一台电脑一个数据目录，不涉及多用户 |
| **无账号体系** | 不实现注册、登录、用户管理 |
| **无权限控制** | 不实现角色、审批流、操作权限；所有功能对使用者完全开放 |
| **本地优先** | 数据存储在本地 SQLite，不依赖云端同步（备份由用户自行导出） |
| **手动发布** | 不对接平台发布 API；排期与提醒服务于「计划」，实际发布在各平台 App 中完成 |

**明确不做（Out of Scope）：** 团队协作、多用户、内容审批流、云端协作、自动发布、读者端/粉丝端功能。

---

## 二、目标用户

### 2.1 用户画像

**唯一目标用户：个人自媒体创作者**

| 维度 | 描述 |
|------|------|
| 身份 | 有本职工作，业余或兼职运营自媒体 |
| 平台 | 同时运营 2-5 个平台（微信、小红书、抖音、B站、今日头条等） |
| 痛点 | 选题枯竭、多平台改写耗时、更新节奏乱、资料散落 |
| 诉求 | 一个人完成「找选题 → 写内容 → 排计划 → 按时发布」闭环 |
| 技术背景 | 不要求懂 AI / 编程；能接受配置 API Key |

### 2.2 典型使用场景

1. **周日晚上**：用 AI 助手做热点调研，批量沉淀下一周选题
2. **工作日晚上**：从选题池选一条，在编辑器里写公众号长文，一键改写为小红书/头条版本
3. **发布日**：排期日历提醒，打开对应平台版本复制发布，标记「已发布」

---

## 三、功能架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                              OhSocial                                │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│  选题中心  │  内容工坊  │  排期日历  │  素材库   │  工具中心  │   设置中心    │
│          │          │          │          │          │              │
│ · 热点追踪 │ · 富文本编辑│ · 日历视图 │ · 图片管理 │ · 内置 Tools│ · AI 模型配置 │
│ · 竞品分析 │ · AI 写作  │ · 日/周/月 │ · 文案片段 │ · Skills   │ · 平台账号    │
│ · 选题池   │ · 多平台改写│ · 发布提醒 │ · 参考链接 │ · AI 助手  │ · 个人定位    │
│ · AI 推荐  │ · 视频脚本 │ · 批量排期 │ · 标签管理 │ · 工具调用链│ · 提示词管理  │
│ · 选题评分 │ · 版本管理 │ · 模板周期 │          │ · 调用日志  │ · 工具/技能配置│
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┘
```

---

## 四、功能模块详述

### 4.1 选题中心

选题是自媒体运营的起点，好的选题决定 80% 的流量。

#### 4.1.1 选题池

选题的统一管理仓库，所有灵感和选题在此汇聚。

| 字段 | 说明 |
|------|------|
| 标题 | 选题名称 |
| 所属领域 | 用户自定义标签分类（如：科技、生活、美食） |
| 目标平台 | 选中一个或多个目标发布平台 |
| 内容形态 | 图文 / 短视频 / 中长视频 |
| 选题来源 | 手动录入 / AI 推荐 / 热点追踪 / 竞品灵感 |
| 状态 | 灵感 → 待写 → 创作中 → 已发布 → 已跳过 |
| AI 评分 | 0-100 分，基于热度、竞争度、匹配度综合评估 |
| 备注 | 自由记录想法、角度、参考资料 |

**核心交互：**
- 看板视图（按状态分列）+ 列表视图（支持筛选排序）
- 从选题池一键创建内容草稿，自动关联选题
- 批量操作：批量标记状态、批量打标签

#### 4.1.2 AI 选题推荐

基于用户定位和历史数据，AI 主动推荐选题方向。

**推荐维度：**
- **热点关联**：当前热点事件 × 用户所在领域的交叉切入角度
- **内容缺口**：分析用户已发布内容，找出尚未覆盖但受众关注的方向
- **竞品启发**：分析同领域热门内容的选题规律
- **周期性话题**：节日、纪念日、行业周期性事件提醒
- **系列续写**：基于已有系列内容，推荐下一篇主题

**输入要求：**
- 用户需在设置中配置「个人定位」（领域、风格、目标受众）
- 系统根据定位 + 已有内容 + 外部热点数据生成推荐

**输出格式：**
每条推荐包含：推荐标题、切入角度描述、预估热度、推荐理由、适合平台

#### 4.1.3 热点追踪

提供热点数据的浏览和筛选能力，帮助用户发现当下可蹭的热点。

**数据源（MVP 阶段）：**
- 手动输入：用户自行记录发现的热点
- AI 分析：用户粘贴热点链接/文本，AI 分析关联度和切入角度
- **工具中心**：通过 `hotspot-research` Skill 调用 `web_search` + `fetch_url` 自动调研热点
- 后续扩展：接入各平台热搜 API（微博热搜、抖音热榜、百度热搜、今日头条热榜等）

**热点与选题的关系：**
热点 → AI 分析 → 生成关联选题建议 → 用户采纳后进入选题池

---

### 4.2 内容工坊

从选题到成稿的完整创作空间。

#### 4.2.1 图文编辑器

基于 TipTap 的富文本编辑器，针对自媒体内容做定制。

**基础能力：**
- 标题层级（H1-H3）、正文、引用、列表、分割线
- 图片插入（本地上传、剪贴板粘贴）
- 链接、加粗、斜体、高亮等行内样式
- 字数统计、阅读时间估算

**AI 辅助能力（内嵌于编辑器）：**
- **AI 续写**：基于当前上下文继续生成内容
- **AI 改写**：选中文本，按指令改写（换个说法、更口语化、更专业等）
- **AI 润色**：对全文进行语言优化
- **AI 扩写/缩写**：扩展或压缩选中段落
- **AI 标题生成**：根据正文生成多个标题选项
- **AI 摘要**：生成文章摘要/引导语

**编辑器右侧面板（可折叠）：**
- 内容大纲导航
- AI 对话窗口（针对当前内容进行提问和修改）
- 素材引用面板（从素材库拖入引用）

#### 4.2.2 视频脚本编辑器

面向短视频和中长视频的结构化脚本创作工具。

**脚本结构：**

```
视频脚本
├── 基本信息
│   ├── 标题
│   ├── 预估时长
│   ├── 视频类型（口播/vlog/教程/剧情/混剪）
│   └── 目标平台
├── 分镜列表
│   ├── 镜号
│   ├── 画面描述
│   ├── 台词/旁白
│   ├── 字幕文案
│   ├── 时长（秒）
│   ├── 拍摄备注（机位/特效/转场）
│   └── 素材引用
└── 附加信息
    ├── BGM 建议
    ├── 封面文案
    └── 发布文案（描述 + 标签）
```

**AI 辅助能力：**
- **脚本生成**：输入主题 + 风格 + 时长，AI 生成完整分镜脚本
- **脚本优化**：分析节奏、开头吸引力、信息密度并给出修改建议
- **台词改写**：调整台词风格（更口语/更正式/更幽默）
- **分镜拆分**：从一段完整文案自动拆分为分镜表

#### 4.2.3 多平台内容改写

一次创作的内容，自动改写为不同平台的适配版本。

**改写规则（内置知识 + 用户可自定义）：**

| 平台 | 改写策略 |
|------|---------|
| 微信公众号 | 保留长文格式，加强开头引导和结尾互动引导，优化标题 |
| 小红书 | 压缩至 500-1000 字，加 emoji、口语化、增加标签推荐、生成封面文案 |
| 抖音 | 提炼核心观点，转为 60s 以内口播脚本，加"开头 hook" |
| B站 | 保留知识深度，转为带字幕的视频文案，增加互动引导（一键三连） |
| 今日头条 | 提炼核心观点，800-1500 字短资讯体；标题强吸睛，开头 3 行决定推荐；段落短、信息密度高；可生成微头条版（200-300 字） |

**工作流：**
1. 用户在图文编辑器完成"源内容"
2. 选择目标平台，点击"AI 改写"
3. AI 生成各平台适配版本（保存为该内容的"平台版本"）
4. 用户可逐个预览、微调
5. 改写后的版本可直接关联到排期

#### 4.2.4 版本管理

所有内容自动保存历史版本。

- 每次手动保存或 AI 操作后生成新版本
- 版本列表展示：时间、操作类型（手动编辑/AI 改写/AI 润色等）、字数变化
- 支持版本对比（diff 视图）
- 支持回滚到任意历史版本

---

### 4.3 排期日历

将内容发布从"想起来就发"变为有节奏的计划性运营。

#### 4.3.1 日历视图

**三种视图模式：**
- **月视图**：总览本月发布计划，每天显示计划发布的内容标题和平台图标
- **周视图**：本周详细排期，按时间轴展示
- **日视图**：当天待发布内容的详细信息和检查清单

**日历条目信息：**
- 关联内容标题
- 目标平台（图标标识）
- 计划发布时间
- 状态：待创作 / 创作中 / 待发布 / 已发布 / 已逾期
- 拖拽调整日期和顺序

#### 4.3.2 排期管理

**手动排期：**
- 从日历上选择日期 + 时间段，创建发布计划条目
- 可关联已有内容或新建空选题占位
- 支持拖拽调整日期

**AI 排期建议：**
- 根据历史发布数据和平台最佳发布时间，推荐发布时间段
- 根据内容类型和平台特性，建议每周各平台的更新频率
- 节假日/热点日期自动标记提醒

**周期模板：**
用户可创建发布节奏模板，例如：
- "工作日模板"：周一公众号长文 + 周三小红书笔记 + 周五抖音短视频
- "日更模式"：每天一条小红书 + 每天一条抖音
- 模板一键应用到指定周/月

#### 4.3.3 发布提醒

- 发布前 N 分钟/小时桌面通知提醒
- 检查内容是否就绪（内容完成、封面就绪、标签填写）
- 逾期未发布的内容高亮标记

---

### 4.4 素材库

创作者的数字素材仓库。

#### 4.4.1 素材类型

| 类型 | 说明 | 用途 |
|------|------|------|
| 图片 | 本地图片管理，支持文件夹分类 | 封面、配图、截图 |
| 文案片段 | 短文本收藏（金句、开头模板、CTA 话术） | 快速引用到创作中 |
| 参考链接 | URL + 标题 + 摘要 + 标签 | 选题参考、竞品分析 |
| 音频/BGM | 音频文件引用（路径 + 描述） | 视频脚本 BGM 标记 |

#### 4.4.2 素材管理

- 标签分类体系（用户自定义标签）
- 全文搜索（标题 + 描述 + 标签）
- 收藏夹/分组
- 素材与内容的关联关系追踪
- AI 智能打标签（上传图片/文本后 AI 自动建议标签）

---

### 4.5 设置中心

#### 4.5.1 AI 模型配置

复用 anovel 的多模型架构，支持主流 AI 服务商。

| 配置项 | 说明 |
|--------|------|
| 服务商 | DeepSeek / Kimi / 通义千问 / OpenAI / Anthropic / Gemini / 自定义 |
| API Key | 加密存储，仅在主进程使用 |
| 模型选择 | 每个服务商可选具体模型 |
| 默认模型 | 设置各场景的默认 AI 模型（选题/写作/改写可分别配置） |
| 调用参数 | temperature / max_tokens 等可调 |

#### 4.5.2 个人定位配置

这是 AI 推荐和内容生成的核心上下文。

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 领域定位 | 你的内容领域（1-3 个） | 科技评测、个人成长 |
| 目标受众 | 你的读者/观众画像 | 25-35岁、一线城市、对科技感兴趣的白领 |
| 内容风格 | 你的表达风格偏好 | 轻松幽默、深度分析、干货型 |
| 人设描述 | 你作为创作者的人设 | "前大厂程序员，用人话讲科技" |
| 差异化优势 | 相比同领域创作者的独特价值 | 有行业一手经验、能做深度技术拆解 |

#### 4.5.3 平台账号管理

记录各平台账号信息（非自动登录，仅作为信息记录）。

| 字段 | 说明 |
|------|------|
| 平台名称 | 微信公众号 / 小红书 / 抖音 / B站 / 今日头条 |
| 账号名称 | 展示名 |
| 账号 ID | 平台唯一标识 |
| 粉丝数 | 手动更新 |
| 备注 | 账号定位、特殊说明 |

#### 4.5.4 提示词管理

所有 AI 场景的提示词均可用户自定义覆盖。

- 系统内置默认提示词（选题推荐、内容生成、改写润色等场景）
- 用户可查看、复制、修改每个场景的提示词
- 支持恢复默认
- 提示词中支持变量占位符（如 `{{persona}}`、`{{platform}}`、`{{content}}`）

#### 4.5.5 数据管理

- 数据库备份/恢复
- 内容导出（Markdown / JSON）
- 数据统计（总内容数、总选题数、各状态分布）

---

### 4.6 工具中心

工具中心是 AI 助手的能力扩展层。通过 **Tools（可执行工具）** 和 **Skills（技能包）** 两类抽象，让 AI 从「只会生成文本」升级为「能查资料、读本地数据、执行操作」的运营助手。

#### 4.6.1 核心概念

| 概念 | 定义 | 类比 |
|------|------|------|
| **Tool** | 原子能力，有明确的输入/输出 JSON Schema，由主进程安全执行 | 函数/API |
| **Skill** | 工作流指令包，定义场景、步骤、推荐工具组合，注入 AI 的 system prompt | Cursor Skill / Agent 剧本 |
| **AI 助手** | 支持 Tool Calling 的对话 Agent，可在全局或各模块内唤起 | 带工具的 Copilot |

**关系：**

```
用户提问 + 选择 Skill
       ↓
AI 助手（携带 Skill 指令 + 可用 Tool Schema）
       ↓
模型决策 → 调用 Tool → 主进程执行 → 结果回传 → 继续推理
       ↓
最终输出（文本 / 创建的选题 / 保存的素材等）
```

#### 4.6.2 内置 Tools

所有 Tool 在主进程注册，通过统一的 `ToolRegistry` 管理。AI 仅能看到已启用的 Tool。

| Tool ID | 名称 | 功能 | 典型场景 |
|---------|------|------|---------|
| `web_search` | 联网搜索 | 搜索互联网，返回标题、摘要、链接 | 热点调研、事实核查、竞品检索 |
| `fetch_url` | 网页抓取 | 抓取指定 URL 正文并提取结构化摘要 | 深入阅读搜索结果、分析竞品文章 |
| `search_topics` | 搜索选题 | 全文检索本地选题池 | 避免重复选题、查找关联系列 |
| `search_contents` | 搜索内容 | 全文检索本地内容库 | 内容复用、系列续写参考 |
| `search_materials` | 搜索素材 | 检索素材库中的文案片段和参考链接 | 写作时引用已有素材 |
| `get_persona` | 读取定位 | 获取用户个人定位配置 | 所有需要结合人设的 AI 任务 |
| `get_schedule` | 读取排期 | 查询指定日期范围内的发布计划 | 排期冲突检查、内容缺口分析 |
| `create_topic` | 创建选题 | 将调研结果写入选题池 | AI 调研后直接沉淀选题 |
| `save_material` | 保存素材 | 将链接/摘要/文案片段存入素材库 | 调研过程中收藏参考资料 |

**Tool Schema 示例（`web_search`）：**

```json
{
  "name": "web_search",
  "description": "搜索互联网获取最新信息、热点新闻、竞品内容",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "搜索关键词" },
      "max_results": { "type": "integer", "description": "最大结果数，默认 5" }
    },
    "required": ["query"]
  }
}
```

**写入类 Tool 的安全策略：**
- `create_topic`、`save_material` 默认需用户确认后执行（可在设置中关闭）
- 执行前在 UI 展示 Tool 调用预览（输入参数 + 预期操作）
- 所有 Tool 调用记录写入 `tool_call_log` 供回溯排查

#### 4.6.3 内置 Skills

Skill 以 Markdown 文件（`SKILL.md`）形式存储，结构与 Cursor Skills 兼容。每个 Skill 包含：适用场景、工作流步骤、推荐 Tools、输出格式。

| Skill ID | 名称 | 说明 | 推荐 Tools |
|----------|------|------|-----------|
| `hotspot-research` | 热点调研 | 搜索近期热点 → 分析与用户领域的关联 → 输出选题建议报告，可选直接创建选题 | web_search, fetch_url, get_persona, create_topic |
| `competitor-scan` | 竞品扫描 | 搜索竞品近期内容 → 归纳选题规律和标题模式 → 保存参考到素材库 | web_search, fetch_url, save_material |
| `topic-brainstorm` | 选题脑暴 | 结合个人定位 + 历史选题 + 联网资料，批量生成选题方向 | get_persona, search_topics, web_search, create_topic |
| `fact-check` | 事实核查 | 对内容中的事实陈述进行联网交叉验证 | web_search, fetch_url |
| `content-gap` | 内容缺口分析 | 分析已发布内容的覆盖范围，结合排期找出尚未覆盖的方向 | search_contents, search_topics, get_schedule, get_persona |
| `weekly-planning` | 周计划制定 | 基于选题池状态和排期空档，建议本周内容生产计划 | search_topics, get_schedule, create_topic |

**Skill 文件结构示例：**

```markdown
---
name: hotspot-research
description: 调研当前热点并生成与用户领域相关的选题建议
available_tools: [web_search, fetch_url, get_persona, create_topic]
---

# 热点调研

## 适用场景
用户需要发现可蹭的热点、或想了解某事件与自己内容领域的关联角度。

## 工作流
1. 调用 get_persona 获取用户领域和受众
2. 调用 web_search 搜索相关热点（至少 2 轮不同关键词）
3. 对高相关结果调用 fetch_url 深入阅读
4. 输出结构化报告：热点列表、关联角度、推荐选题（含评分理由）
5. 询问用户是否将推荐选题写入选题池；确认后调用 create_topic

## 输出格式
- 热点概览（表格：事件 / 热度 / 时效性）
- 关联分析（每个热点 × 用户领域的 1-3 个切入角度）
- 推荐选题（标题 + 角度 + 适合平台 + AI 评分）
```

**Skill 管理：**
- 系统内置 Skills，首次启动写入数据库
- 用户可启用/禁用单个 Skill
- 用户可导入自定义 Skill（Markdown 文件）
- 用户可基于内置 Skill 复制并修改，保存为自定义版本

#### 4.6.4 AI 助手与 Tool Calling 机制

**助手入口：**
- **全局助手**：独立页面 `/assistant`，支持选择 Skill、查看对话历史和 Tool 调用链
- **嵌入式助手**：内容编辑器右侧面板、选题详情页内，自动携带当前上下文（正在编辑的内容/选题）
- **快捷指令**：在任意 AI 输入框通过 `/skill-name` 快速激活 Skill

**Tool Calling 执行流程：**

```
1. 用户发送消息（可选指定 Skill）
2. AI Service 组装上下文：
   - system prompt（基础角色 + 激活的 Skill 指令）
   - 可用 Tool 的 JSON Schema 列表
   - 对话历史 + 业务上下文（当前内容/选题/定位）
3. 调用模型（需支持 Function Calling / Tool Use）
4. 若模型返回 tool_calls：
   a. 推送 ai:tool-start 事件到 Renderer（展示调用状态）
   b. ToolExecutor 在主进程执行（写入类 Tool 等待用户确认）
   c. 将 tool result 追加到 messages，回到步骤 3
5. 达到最终文本回复或超出 max_iterations（默认 8 轮）后结束
6. 推送 ai:delta 流式输出最终回复
```

**模型兼容性：**
- OpenAI 兼容协议：`tools` + `tool_calls` 字段
- Anthropic：`tools` + `tool_use` content block
- 不支持 Tool Calling 的模型：降级为纯文本模式，Skill 指令仍生效但无法调用 Tool

**UI 展示要求：**
- Tool 调用过程可视化：显示「正在搜索…」「正在读取网页…」「已创建选题」等状态
- 可展开查看每次 Tool 的输入参数和返回结果
- 写入类操作展示确认弹窗（标题预览 + 目标位置）

#### 4.6.5 工具与技能配置

| 配置项 | 说明 |
|--------|------|
| Tool 开关 | 逐个启用/禁用内置 Tool |
| 写入确认 | 控制 create_topic / save_material 是否需要用户确认 |
| 搜索 API | web_search 的 API 提供商配置（Serper / Tavily / 自定义） |
| 搜索 API Key | 加密存储 |
| fetch_url 限制 | 可选 URL 域名白名单；默认允许 http/https |
| 最大 Tool 轮次 | 单次对话最多 Tool Calling 轮数（默认 8） |
| 默认 Skill | 全局助手打开时的默认激活 Skill（可为空） |

---

## 五、技术架构

### 5.1 技术选型

| 层级 | 技术 | 理由 |
|------|------|------|
| 桌面框架 | Electron | 与 anovel 一致，可复用经验和组件 |
| 构建工具 | electron-vite | 快速开发、HMR 支持 |
| UI 框架 | Vue 3 + TypeScript | 与 anovel 一致 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 路由 | Vue Router | Hash 模式 |
| 样式 | Tailwind CSS + DaisyUI | 快速 UI 开发 |
| 富文本 | TipTap (基于 ProseMirror) | 可扩展性强，与 anovel 一致 |
| 数据库 | better-sqlite3 | 本地优先，零配置 |
| HTTP | axios | API 调用 |
| 打包 | electron-builder | macOS + Windows 发布 |

### 5.2 架构分层

```
┌──────────────────────────────────────────────┐
│                  Renderer (Vue 3)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  Views   │ │Components│ │Composables│     │
│  │(页面视图) │ │(UI 组件) │ │(逻辑复用) │     │
│  └──────────┘ └──────────┘ └──────────┘     │
├──────────────────────────────────────────────┤
│              Preload (contextBridge)          │
│         window.ohsocial.invoke / on / off    │
├──────────────────────────────────────────────┤
│                  Main Process                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │   IPC    │ │   AI     │ │   DB     │     │
│  │ Handlers │ │ Service  │ │  Layer   │     │
│  └──────────┘ └──────────┘ └──────────┘     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │  Prompt  │ │ Platform │ │  Tools   │     │
│  │ Registry │ │ Adapters │ │ Registry │     │
│  └──────────┘ └──────────┘ │ Executor │     │
│                             └──────────┘     │
├──────────────────────────────────────────────┤
│              Shared (Types & Constants)       │
│        跨进程共享的类型定义、平台元数据          │
└──────────────────────────────────────────────┘
```

### 5.3 目录结构规划

```
ohsocial/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 应用启动、DB 初始化、IPC 注册
│   │   ├── ipc/                 # IPC 处理模块（按功能拆分）
│   │   │   ├── topic.ts         # 选题相关 IPC
│   │   │   ├── content.ts       # 内容相关 IPC
│   │   │   ├── schedule.ts      # 排期相关 IPC
│   │   │   ├── material.ts      # 素材相关 IPC
│   │   │   ├── tool.ts          # 工具与技能相关 IPC
│   │   │   ├── assistant.ts     # AI 助手对话 IPC
│   │   │   └── setting.ts       # 设置相关 IPC
│   │   ├── ai/                  # AI 服务层
│   │   │   ├── service.ts       # 统一 AI 调用入口
│   │   │   ├── adapters/        # 模型协议适配器
│   │   │   ├── prompts/         # 内置提示词
│   │   │   ├── session.ts       # 流式会话管理
│   │   │   ├── context.ts       # 上下文组装 + token 预算
│   │   │   └── agent-loop.ts    # Tool Calling 多轮循环
│   │   ├── tools/               # 工具层
│   │   │   ├── registry.ts      # Tool 注册表
│   │   │   ├── executor.ts      # Tool 执行器（含确认 gate）
│   │   │   ├── builtin/         # 内置 Tool 实现
│   │   │   │   ├── web-search.ts
│   │   │   │   ├── fetch-url.ts
│   │   │   │   ├── search-topics.ts
│   │   │   │   └── ...
│   │   │   └── skills/          # 内置 Skill 文件（SKILL.md）
│   │   ├── db/                  # 数据库层
│   │   │   ├── schema.ts        # 建表语句
│   │   │   ├── migrations.ts    # 增量迁移
│   │   │   ├── dao/             # 数据访问对象（按实体拆分）
│   │   │   └── seed.ts          # 初始数据
│   │   └── platform/            # 平台适配层
│   │       ├── rules.ts         # 各平台改写规则
│   │       └── templates.ts     # 平台内容模板
│   ├── preload/
│   │   └── index.ts             # contextBridge 暴露 API
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.ts          # Vue 入口
│   │       ├── App.vue
│   │       ├── router/          # 路由配置
│   │       ├── stores/          # Pinia stores
│   │       ├── views/           # 页面视图
│   │       │   ├── topic/       # 选题中心
│   │       │   ├── content/     # 内容工坊
│   │       │   ├── schedule/    # 排期日历
│   │       │   ├── material/    # 素材库
│   │       │   ├── assistant/   # AI 助手
│   │       │   └── setting/     # 设置中心
│   │       ├── components/      # 通用 UI 组件
│   │       │   ├── editor/      # 编辑器组件
│   │       │   ├── calendar/    # 日历组件
│   │       │   ├── ai/          # AI 交互组件（含 ToolCallTrace）
│   │       │   └── common/      # 通用基础组件
│   │       ├── composables/     # Vue 组合式函数
│   │       └── assets/          # 静态资源
│   └── shared/                  # 跨进程共享
│       ├── types/               # TypeScript 类型定义
│       ├── constants/           # 常量（平台列表、状态枚举等）
│       ├── providers.ts         # AI 服务商元数据
│       └── tool-schemas.ts      # Tool JSON Schema 定义
├── docs/                        # 项目文档
├── resources/                   # Electron 打包资源（图标等）
└── tests/                       # 测试文件
```

### 5.4 IPC 通信设计

采用 `领域:动作` 的 channel 命名规范：

| Channel | 说明 |
|---------|------|
| `topic:list` | 获取选题列表 |
| `topic:create` | 创建选题 |
| `topic:update` | 更新选题 |
| `topic:delete` | 删除选题 |
| `topic:ai-recommend` | AI 推荐选题 |
| `topic:ai-score` | AI 评分选题 |
| `content:list` | 获取内容列表 |
| `content:create` | 创建内容 |
| `content:update` | 更新内容 |
| `content:delete` | 删除内容 |
| `content:versions` | 获取内容版本历史 |
| `content:ai-generate` | AI 生成内容 |
| `content:ai-rewrite` | AI 改写内容 |
| `content:ai-polish` | AI 润色内容 |
| `content:platform-adapt` | 多平台改写 |
| `script:create` | 创建视频脚本 |
| `script:update` | 更新视频脚本 |
| `script:ai-generate` | AI 生成脚本 |
| `schedule:list` | 获取排期列表 |
| `schedule:create` | 创建排期 |
| `schedule:update` | 更新排期 |
| `schedule:delete` | 删除排期 |
| `schedule:ai-suggest` | AI 排期建议 |
| `material:*` | 素材 CRUD |
| `tool:list` | 获取可用 Tool 列表及启用状态 |
| `tool:config` | 读取/更新 Tool 配置（搜索 API 等） |
| `tool:execute` | 手动测试执行 Tool（调试用途） |
| `skill:list` | 获取 Skill 列表 |
| `skill:get` | 获取 Skill 详情（含 Markdown 内容） |
| `skill:update` | 更新 Skill（启用/禁用、自定义内容） |
| `skill:import` | 导入自定义 Skill 文件 |
| `skill:delete` | 删除自定义 Skill |
| `assistant:chat` | AI 助手对话（支持 Tool Calling + Skill） |
| `assistant:confirm-tool` | 确认/拒绝待执行的写入类 Tool |
| `assistant:history` | 获取助手对话历史 |
| `model:chat` | AI 对话（流式，无 Tool Calling） |
| `model:config` | 模型配置 |
| `ai:delta` | 流式输出事件（Main → Renderer） |
| `ai:tool-start` | Tool 开始执行事件 |
| `ai:tool-result` | Tool 执行结果事件 |
| `ai:tool-confirm` | 写入类 Tool 等待用户确认事件 |
| `ai:cancel` | 取消 AI 会话 |

---

## 六、数据模型

### 6.1 核心实体

#### topics（选题）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| title | TEXT | 选题标题 |
| description | TEXT | 选题描述/角度说明 |
| domain | TEXT | 所属领域 |
| target_platforms | TEXT (JSON) | 目标平台列表 `["wechat","xiaohongshu","toutiao"]` |
| content_type | TEXT | 图文 / 短视频 / 中长视频 |
| source | TEXT | 来源：manual / ai_recommend / hotspot / competitor |
| status | TEXT | idea / todo / writing / done / skipped |
| ai_score | INTEGER | AI 评分 0-100 |
| ai_score_reason | TEXT | 评分理由 |
| tags | TEXT (JSON) | 标签列表 |
| notes | TEXT | 自由备注 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### contents（内容）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| topic_id | INTEGER FK | 关联选题 |
| title | TEXT | 内容标题 |
| body | TEXT | 正文（HTML/TipTap JSON） |
| content_type | TEXT | article / note / script |
| platform | TEXT | 所属平台（源内容为 origin） |
| parent_id | INTEGER FK | 多平台改写时指向源内容 |
| status | TEXT | draft / ready / published / archived |
| word_count | INTEGER | 字数 |
| cover_image | TEXT | 封面图路径 |
| tags | TEXT (JSON) | 标签列表 |
| seo_title | TEXT | SEO/平台标题（可独立于内容标题） |
| summary | TEXT | 摘要/引导语 |
| meta | TEXT (JSON) | 扩展字段（平台特有配置） |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### content_versions（内容版本）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| content_id | INTEGER FK | 关联内容 |
| body | TEXT | 版本快照 |
| title | TEXT | 标题快照 |
| operation | TEXT | 操作类型：manual_edit / ai_rewrite / ai_polish / ai_generate |
| word_count | INTEGER | 字数 |
| created_at | TEXT | 创建时间 |

#### video_scripts（视频脚本）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| content_id | INTEGER FK | 关联内容 |
| video_type | TEXT | 口播 / vlog / 教程 / 剧情 / 混剪 |
| duration_seconds | INTEGER | 预估总时长 |
| scenes | TEXT (JSON) | 分镜列表（见分镜结构） |
| bgm_suggestion | TEXT | BGM 建议 |
| cover_text | TEXT | 封面文案 |
| publish_text | TEXT | 发布文案 |
| publish_tags | TEXT (JSON) | 发布标签 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

**分镜 JSON 结构：**
```json
[
  {
    "scene_no": 1,
    "visual": "镜头对准产品特写，白色背景",
    "dialogue": "大家好，今天给大家测评一款...",
    "subtitle": "今日测评：XXX",
    "duration": 5,
    "notes": "特写镜头，柔光",
    "material_refs": []
  }
]
```

#### schedules（排期）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| content_id | INTEGER FK | 关联内容（可为空，表示占位） |
| topic_id | INTEGER FK | 关联选题（content_id 为空时用） |
| platform | TEXT | 目标发布平台 |
| scheduled_at | TEXT | 计划发布时间 |
| status | TEXT | planned / content_ready / published / overdue / cancelled |
| reminder_minutes | INTEGER | 提前提醒分钟数 |
| notes | TEXT | 备注 |
| template_id | INTEGER FK | 来源模板（如果从模板创建） |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### schedule_templates（排期模板）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 模板名称 |
| description | TEXT | 模板描述 |
| pattern | TEXT (JSON) | 周期模式定义 |
| is_active | INTEGER | 是否启用 |
| created_at | TEXT | 创建时间 |

**周期模式 JSON 结构：**
```json
{
  "cycle": "weekly",
  "slots": [
    { "day": 1, "time": "08:00", "platform": "wechat", "content_type": "article" },
    { "day": 3, "time": "12:00", "platform": "xiaohongshu", "content_type": "note" },
    { "day": 5, "time": "18:00", "platform": "douyin", "content_type": "short_video" }
  ]
}
```

#### materials（素材）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| type | TEXT | image / text_snippet / link / audio |
| title | TEXT | 素材标题 |
| content | TEXT | 文本内容或文件路径 |
| url | TEXT | 链接地址（link 类型） |
| description | TEXT | 描述/摘要 |
| tags | TEXT (JSON) | 标签列表 |
| folder | TEXT | 所属文件夹 |
| created_at | TEXT | 创建时间 |

#### model_configs（AI 模型配置）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| provider | TEXT | 服务商标识 |
| name | TEXT | 显示名称 |
| api_key | TEXT | API 密钥（加密存储） |
| base_url | TEXT | API 地址 |
| model_name | TEXT | 模型名称 |
| is_default | INTEGER | 是否为默认模型 |
| params | TEXT (JSON) | 调用参数 |
| is_enabled | INTEGER | 是否启用 |
| created_at | TEXT | 创建时间 |

#### persona（个人定位）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键（通常只有一条记录） |
| domains | TEXT (JSON) | 领域定位列表 |
| audience | TEXT | 目标受众描述 |
| style | TEXT | 内容风格描述 |
| persona_desc | TEXT | 人设描述 |
| differentiator | TEXT | 差异化优势 |
| updated_at | TEXT | 更新时间 |

#### prompt_templates（提示词模板）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| key | TEXT UNIQUE | 场景标识（如 topic_recommend、content_generate） |
| name | TEXT | 显示名称 |
| category | TEXT | 分类（topic / content / rewrite / script / assistant / tool） |
| system_prompt | TEXT | 系统提示词 |
| user_prompt_template | TEXT | 用户提示词模板（含变量占位符） |
| is_builtin | INTEGER | 是否为内置 |
| is_custom | INTEGER | 是否被用户自定义覆盖 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### platform_accounts（平台账号）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| platform | TEXT | 平台标识 |
| account_name | TEXT | 账号名称 |
| account_id | TEXT | 平台 ID |
| followers | INTEGER | 粉丝数 |
| notes | TEXT | 备注 |
| updated_at | TEXT | 更新时间 |

#### generation_log（AI 调用日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| step | TEXT | 操作场景标识 |
| model_provider | TEXT | 服务商 |
| model_name | TEXT | 模型名称 |
| input_tokens | INTEGER | 输入 token 数 |
| output_tokens | INTEGER | 输出 token 数 |
| duration_ms | INTEGER | 耗时毫秒 |
| status | TEXT | success / error |
| error_message | TEXT | 错误信息 |
| created_at | TEXT | 创建时间 |

#### tool_configs（工具配置）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| tool_id | TEXT UNIQUE | Tool 标识（如 web_search） |
| is_enabled | INTEGER | 是否启用 |
| config | TEXT (JSON) | Tool 专属配置（API Key、限流参数等） |
| require_confirm | INTEGER | 写入类 Tool 是否需要用户确认 |
| updated_at | TEXT | 更新时间 |

**web_search 配置 JSON 示例：**
```json
{
  "provider": "serper",
  "api_key": "encrypted:...",
  "max_results_default": 5,
  "rate_limit_per_minute": 10
}
```

#### skills（技能包）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| skill_id | TEXT UNIQUE | Skill 标识（如 hotspot-research） |
| name | TEXT | 显示名称 |
| description | TEXT | 简短描述 |
| content | TEXT | Skill 完整 Markdown 内容 |
| available_tools | TEXT (JSON) | 关联 Tool ID 列表 |
| is_builtin | INTEGER | 是否为内置 |
| is_enabled | INTEGER | 是否启用 |
| is_custom | INTEGER | 是否为用户自定义/修改版 |
| source_skill_id | TEXT | 若从内置复制，记录来源 Skill ID |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### assistant_conversations（助手对话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| title | TEXT | 对话标题（首条消息自动生成） |
| skill_id | TEXT | 激活的 Skill ID（可为空） |
| context_type | TEXT | 上下文类型：global / topic / content |
| context_id | INTEGER | 关联的业务实体 ID |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### assistant_messages（助手消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| conversation_id | INTEGER FK | 关联对话 |
| role | TEXT | user / assistant / tool |
| content | TEXT | 消息文本内容 |
| tool_calls | TEXT (JSON) | assistant 消息中的 tool_calls |
| tool_call_id | TEXT | tool 角色消息关联的 call ID |
| tool_name | TEXT | tool 角色消息的工具名称 |
| created_at | TEXT | 创建时间 |

#### tool_call_log（工具调用日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| conversation_id | INTEGER FK | 关联对话（可为空） |
| message_id | INTEGER FK | 关联消息（可为空） |
| tool_id | TEXT | Tool 标识 |
| input | TEXT (JSON) | 输入参数 |
| output | TEXT (JSON) | 输出结果 |
| status | TEXT | success / error / pending_confirm / rejected |
| duration_ms | INTEGER | 执行耗时 |
| error_message | TEXT | 错误信息 |
| created_at | TEXT | 创建时间 |

---

## 七、AI 提示词场景矩阵

| 场景 Key | 所属模块 | 功能 | 关键输入变量 |
|----------|---------|------|-------------|
| `topic_recommend` | 选题中心 | 推荐选题方向 | `{{persona}}`, `{{domains}}`, `{{recent_topics}}` |
| `topic_score` | 选题中心 | 评估选题质量 | `{{topic}}`, `{{persona}}`, `{{platform}}` |
| `topic_from_hotspot` | 选题中心 | 从热点生成选题 | `{{hotspot}}`, `{{persona}}`, `{{domains}}` |
| `content_outline` | 内容工坊 | 生成内容大纲 | `{{topic}}`, `{{platform}}`, `{{persona}}`, `{{style}}` |
| `content_generate` | 内容工坊 | 生成完整内容 | `{{outline}}`, `{{platform}}`, `{{persona}}`, `{{style}}` |
| `content_continue` | 内容工坊 | 续写内容 | `{{context}}`, `{{platform}}` |
| `content_rewrite` | 内容工坊 | 改写选中文本 | `{{selected_text}}`, `{{instruction}}` |
| `content_polish` | 内容工坊 | 全文润色 | `{{content}}`, `{{style}}` |
| `content_expand` | 内容工坊 | 扩写段落 | `{{paragraph}}`, `{{context}}` |
| `content_compress` | 内容工坊 | 缩写段落 | `{{paragraph}}`, `{{target_length}}` |
| `title_generate` | 内容工坊 | 生成标题选项 | `{{content}}`, `{{platform}}` |
| `summary_generate` | 内容工坊 | 生成摘要 | `{{content}}`, `{{platform}}` |
| `platform_adapt` | 内容工坊 | 多平台改写 | `{{content}}`, `{{source_platform}}`, `{{target_platform}}`, `{{rules}}` |
| `script_generate` | 内容工坊 | 生成视频脚本 | `{{topic}}`, `{{video_type}}`, `{{duration}}`, `{{style}}` |
| `script_optimize` | 内容工坊 | 优化脚本节奏 | `{{script}}`, `{{platform}}` |
| `schedule_suggest` | 排期日历 | 推荐发布排期 | `{{persona}}`, `{{platforms}}`, `{{existing_schedule}}` |
| `material_tag` | 素材库 | 智能打标签 | `{{material_content}}`, `{{existing_tags}}` |
| `assistant_agent` | 工具中心 | AI 助手 Agent（Tool Calling + Skill） | `{{skill}}`, `{{persona}}`, `{{context}}`, `{{available_tools}}` |
| `chat` | 全局 | 自由对话（无 Tool Calling） | `{{context}}`, `{{question}}` |

---

## 八、页面路由规划

| 路由 | 视图 | 说明 |
|------|------|------|
| `/` | TodayDashboard | 今日首页（待办 + 排期 + 快捷入口） |
| `/topics` | TopicList | 选题池看板/列表 |
| `/topics/:id` | TopicDetail | 选题详情 |
| `/contents` | ContentList | 内容列表 |
| `/contents/:id/edit` | ContentEditor | 图文编辑器 |
| `/contents/:id/script` | ScriptEditor | 视频脚本编辑器 |
| `/contents/:id/versions` | VersionHistory | 版本历史 |
| `/schedule` | ScheduleCalendar | 排期日历 |
| `/materials` | MaterialLibrary | 素材库 |
| `/assistant` | AssistantHub | AI 助手（Skill 选择 + 对话 + Tool 调用链） |
| `/assistant/:id` | AssistantChat | 指定对话会话 |
| `/settings` | Settings | 设置中心 |
| `/settings/ai` | AIModelSettings | AI 模型配置 |
| `/settings/persona` | PersonaSettings | 个人定位配置 |
| `/settings/accounts` | AccountSettings | 平台账号管理 |
| `/settings/prompts` | PromptSettings | 提示词管理 |
| `/settings/tools` | ToolSettings | 工具开关与搜索 API 配置 |
| `/settings/skills` | SkillSettings | 技能包管理（启用/禁用/导入/编辑） |

---

## 九、MVP 范围定义

### 9.1 MVP 包含（Phase 1）

| 模块 | MVP 功能 | 排除 |
|------|---------|------|
| **选题中心** | 选题 CRUD、看板视图、AI 推荐、AI 评分 | 热点 API 自动接入 |
| **内容工坊** | 图文编辑器 + AI 辅助（续写/改写/润色/标题生成） | — |
| **视频脚本** | 基础分镜编辑器 + AI 生成脚本 | 视频预览 |
| **多平台改写** | 公众号↔小红书↔抖音↔B站↔今日头条五平台改写 | 自动发布 |
| **排期日历** | 月/周视图、手动排期、桌面通知提醒 | AI 排期建议、周期模板 |
| **素材库** | 文案片段 + 参考链接管理 | 图片管理、AI 打标签 |
| **工具中心** | 内置 Tools（web_search、fetch_url、本地搜索、create_topic 等）、6 个内置 Skills、AI 助手 Tool Calling 循环、调用链可视化 | 自定义 Skill 导入、竞品监控 Skill |
| **设置** | AI 模型配置、个人定位、提示词管理、工具/技能配置 | 数据统计面板 |
| **版本管理** | 自动保存版本、版本列表 | 版本 diff 对比 |

### 9.2 Phase 2 增强

- 排期 AI 建议 + 周期模板
- 图片素材管理 + AI 打标签
- 版本 diff 对比视图
- 热点数据 API 接入（微博热搜等）
- 自定义 Skill 导入/导出 + Skill 市场（本地分享）
- 新增 Tools：`analyze_url`（竞品文章结构分析）、`batch_create_topics`（批量创建选题）
- 数据统计仪表盘（内容产出统计、AI 使用统计、Tool 调用统计）
- 内容导出（Markdown / Word）

### 9.3 Phase 3 扩展

- 更多平台支持
- 自动发布集成（平台 API 对接，仍保持单人使用）
- 竞品内容监控
- 数据分析（阅读量、互动量追踪，手动录入或 API 拉取）

> **永久不做：** 多用户、团队协作、权限角色、审批流、云端账号体系。

---

## 十一、信息架构与体验规范

> 本章从产品经理和 UI/UX 视角，约束界面文案、导航结构和核心动线，与第四～八章的功能描述配合使用。

### 11.1 导航结构（建议）

采用 **「1 首页 + 4 核心模块 + 1 助手 + 设置」**，避免六模块平铺造成认知负担：

| 层级 | 模块 | 用户可见名称 | 说明 |
|------|------|-------------|------|
| L0 | 首页 | **今日** | 今天要做什么：待发布、进行中的创作、快捷入口 |
| L1 | 选题 | **选题** | 选题池 + 热点入口 |
| L1 | 创作 | **创作** | 内容列表 + 编辑器 + 脚本 + 多平台版本 |
| L1 | 排期 | **排期** | 日历视图 |
| L1 | 素材 | **素材** | 文案片段、链接、图片 |
| L1 | 助手 | **AI 助手** | 对话 + 技能选择（不暴露 Tool/Skill 英文 ID） |
| L2 | 设置 | **设置** | 合并为分组列表，见 11.3 |

「工具中心」作为内部模块名保留，**用户界面统一称「AI 助手」**；Tool / Skill 配置归入设置，不设独立顶级导航。

### 11.2 文案分层原则

| 层级 | 受众 | 规范 | 示例 |
|------|------|------|------|
| 界面文案 | 创作者 | 中文、动词开头、说人话 | 「改写为小红书版本」而非 `platform_adapt` |
| 设置项 | 创作者 | 短句 + 一行说明 | 「联网搜索」+「让 AI 查找最新热点和资料」 |
| 内部标识 | 开发 | 英文 snake_case / kebab-case | `web_search`、`hotspot-research` |
| 技术文档 | 开发 | 可保留 Tool / Skill / IPC 术语 | 仅限 PRD 技术章节与代码 |

**禁止直接暴露给用户的术语：** Tool Calling、JSON Schema、IPC、Agent、Registry、channel、token（界面中改为「AI 用量」）。

### 11.3 设置页分组（合并减少跳转）

| 分组 | 包含项 | 界面名称 |
|------|--------|---------|
| AI | 模型配置、提示词、助手能力（联网搜索开关、写入确认） | AI 设置 |
| 创作偏好 | 个人定位、各平台改写规则 | 创作偏好 |
| 账号 | 各平台账号信息记录 | 我的账号 |
| 数据 | 备份、导出、统计 | 数据管理 |

原 `/settings/tools`、`/settings/skills` 合并进「AI 设置 → 助手能力」子页，以卡片形式展示「联网搜索」「热点调研」等**能力名称**，而非 Skill ID。

### 11.4 核心用户动线（Golden Path）

**首次使用：**

```
启动 → 引导填写「创作偏好」（领域/风格/受众，3 步以内）
     → 配置 AI 模型（API Key）
     → 可选：配置联网搜索
     → 进入「今日」首页
```

**日常创作：**

```
选题（添加/AI 推荐） → 创作（写源稿） → 多平台改写 → 排期（拖入日历） → 发布日复制内容 → 标记已发布
```

**热点调研：**

```
AI 助手 → 选择「热点调研」→ 对话中展示「正在搜索…」→ 输出选题建议 → 确认后写入选题池
```

### 11.5 状态体系（统一简化）

三套状态名称对齐，减少用户记忆成本：

| 模块 | 状态流转 | 界面文案 |
|------|---------|---------|
| 选题 | idea → todo → writing → done → skipped | 灵感 → 待写 → 创作中 → 已完成 → 已跳过 |
| 内容 | draft → ready → published → archived | 草稿 → 待发布 → 已发布 → 已归档 |
| 排期 | planned → ready → published → overdue | 已计划 → 内容就绪 → 已发布 → 已逾期 |

去掉「待审核 / reviewing」——单人使用无需审批环节。

### 11.6 关键页面体验要求

| 页面 | 主操作 | 空状态文案 | 次要信息处理 |
|------|--------|-----------|-------------|
| 今日 | 「新建选题」「继续创作」 | 「还没有排期，去选个题开始吧」 | 本周排期概览折叠展示 |
| 选题 | 「添加选题」「AI 推荐」 | 「选题池是空的，试试 AI 推荐」 | AI 评分 hover 展示理由 |
| 创作 | 「从选题创建」「AI 续写」 | 「还没有内容，从选题开始写」 | 版本历史收进侧边栏 |
| 排期 | 拖拽排期 | 「本周没有发布计划」 | 逾期项红色高亮 |
| AI 助手 | 输入框 + 技能快捷卡片 | 「试试：帮我调研本周科技热点」 | Tool 调用链默认折叠，可展开 |

### 11.7 MVP 优先级建议（产品视角）

当前 MVP 功能面偏宽，建议按 P0 / P1 拆分开发：

| 优先级 | 模块 | 理由 |
|--------|------|------|
| **P0** | 选题 CRUD + 个人定位 + 图文编辑器 + AI 续写/改写 + 本地排期 | 构成最小闭环 |
| **P0** | AI 模型配置 + 数据备份 | 能用、不丢数据 |
| **P1** | 多平台改写 + 视频脚本 | 差异化能力，可第二批 |
| **P1** | AI 助手 + 联网搜索 + 热点调研技能 | 依赖搜索 API 配置，可第二批 |
| **P2** | 素材库、版本 diff、周期模板、AI 排期建议 | 体验增强 |

---

## 十、非功能性需求

### 10.1 性能

- 应用启动时间 < 3 秒
- 编辑器输入无感知延迟（< 50ms）
- AI 流式输出首 token 延迟 < 2 秒（取决于模型服务商）
- 支持单库 10,000+ 内容条目

### 10.2 安全

- API Key 加密存储于本地数据库，不传输到第三方
- contextIsolation 启用，渲染进程不可直接访问 Node API
- 所有 AI API 调用和 Tool 执行在主进程完成
- 写入类 Tool（create_topic、save_material）默认需用户确认
- web_search / fetch_url 的网络请求由主进程发起，Renderer 不可直接访问外网

### 10.3 可用性

- 支持 macOS 和 Windows
- 离线可用（除 AI 功能外的所有功能）
- 自动保存（每 30 秒或失焦时）
- 数据库 WAL 模式，防止意外关闭导致数据丢失

### 10.4 可扩展性

- AI 模型通过适配器模式接入，新增服务商只需新增适配器
- 提示词模板化，用户可覆盖任意场景的提示词
- 平台改写规则可配置，新增平台只需增加规则定义
- Tool 通过 Registry 注册，新增 Tool 只需实现接口并注册
- Skill 采用 Markdown 文件格式，用户可导入自定义 Skill 扩展 AI 工作流

---

## 附录 A：与 anovel 技术复用清单

| 组件 | 复用方式 |
|------|---------|
| Electron 壳 + 安全模型 | 直接复用模式（contextIsolation, preload） |
| AI 模型适配器（OpenAI/Gemini/Anthropic 协议） | 复制并精简 |
| 流式会话管理 | 复制核心逻辑 |
| Tool Calling Agent Loop | 新增，参考 OpenAI tools 协议 |
| SQLite + DAO 模式 | 复用模式，重新定义 schema |
| TipTap 编辑器基础配置 | 复用并扩展（增加 AI 行内操作） |
| Tailwind + DaisyUI 配置 | 直接复用配置 |
| 提示词注册表机制 | 复用模式 |

## 附录 B：术语表

| 术语 | 说明 |
|------|------|
| 选题 (Topic) | 一个内容创意/想法，是创作的起点 |
| 内容 (Content) | 基于选题创作的具体文章/笔记/脚本 |
| 源内容 (Origin Content) | 多平台改写前的原始内容 |
| 平台版本 (Platform Version) | 针对特定平台改写后的内容 |
| 排期 (Schedule) | 将内容安排在特定时间发布的计划 |
| 分镜 (Scene) | 视频脚本中的单个镜头单元 |
| 个人定位 (Persona) | 创作者的领域、风格、受众等核心定义 |
| Tool | AI 可调用的原子能力，有固定输入/输出 Schema |
| Skill | 指导 AI 在特定场景下按步骤使用 Tools 的技能包 |
| Tool Calling | 模型返回工具调用请求，系统执行后将结果回传模型的多轮机制 |
| AI 助手 | 支持 Tool Calling 和 Skill 的全局/嵌入式对话 Agent |
